# Phase 6c — Layout Worker

## Context

`computeLayout` (two-phase: rank grid + WebCola refinement) runs synchronously on the main thread and blocks the UI for ~1s on real-world graphs (~80 nodes/edges). This affects initial assembly, direction changes, scope switching, and view mode toggles. The function is pure with 100% JSON-serializable inputs/outputs, and WebCola has no DOM dependencies — a perfect Web Worker candidate.

## Design

### Worker Architecture

```
Main Thread (store.ts)                    Worker (layout.worker.ts)
─────────────────────                     ────────────────────────
store action triggered
  → filterByScope (fast, stays here)
  → check position preservation
  → if layout needed:
      set isLayoutPending = true
      postMessage({ id, nodes, edges,   →  receives message
        direction, spacingScale })          runs computeLayout()
                                           postMessage({ id, nodes })
      onmessage ←──────────────────────  ← sends result
      if id matches latest:
        set({ nodes, isLayoutPending: false })
```

**Stale result handling**: Monotonic counter (`layoutRequestId`). Each request increments it; worker response includes the id. If the response id doesn't match the latest, it's silently dropped. This handles rapid scope/direction toggling and StrictMode double-fires.

**UX during computation**: Keep current nodes visible (don't clear the canvas). When the worker finishes, positions update. For initial assembly (no nodes yet), show a loading spinner overlay on the ReactFlow container.

### Worker file

Vite supports `new Worker(new URL('./file.worker.ts', import.meta.url), { type: 'module' })` natively — no config changes needed. The `@/*` path alias works inside workers via `vite-tsconfig-paths`.

The worker imports `computeLayout` from `./layout.ts` and runs it in response to messages. The existing `layout.ts` stays **unchanged** — the worker is just a thin message envelope around it.

---

## Implementation Steps

### Step 1 — Create worker file

**Create** `src/graph/layout.worker.ts`

Thin message handler:
- Receives `{ id, nodes, edges, direction, spacingScale }`
- Calls `computeLayout(nodes, edges, direction, spacingScale)`
- Posts back `{ id, nodes: result }`

Type definitions for the message protocol live here (exported for the bridge).

### Step 2 — Create layout bridge

**Create** `src/graph/layout-bridge.ts`

Main-thread API wrapping the worker lifecycle:
- `requestLayout(opts): void` — sends request to worker, increments counter
- `onResult(callback): void` — registers the result handler (called when worker posts back)
- `cancel(): void` — bumps the counter so any in-flight result is ignored
- Lazily creates the worker on first use (avoid loading it if graph is never viewed)
- Singleton module (one worker for the whole app)
- Exports message types for type safety

### Step 3 — Add pending state and async layout to store

**Modify** `src/graph/store.ts`

Add to state interface:
- `isLayoutPending: boolean` (initial: `false`)

Register the worker result callback at module level (outside the store creator). The callback calls `set()` to apply positioned nodes and clear `isLayoutPending`, gated by the request counter.

Refactor the 4 layout call sites:

1. **`setFullGraph`** (initial assembly):
   - `layoutWithPreservedPositions` still checks if all nodes have positions (fast, no worker needed — returns immediately if nothing changed)
   - Only when new nodes exist and layout is needed: request async layout via the bridge
   - Set `isLayoutPending = true`

2. **`setViewMode("schema")`**:
   - Immediately set `viewMode`, edges, clear selection
   - Request async layout with `spacingScale=2`

3. **`setViewScope`**:
   - Immediately update `viewScope`, `focusEntityId`
   - Run `filterByScope` (fast, stays on main thread)
   - Set filtered edges immediately
   - Request async layout for the filtered set

4. **`setLayoutDirection`**:
   - Immediately update `layoutDirection`
   - Run `filterByScope` (fast)
   - Request async layout

Each action: set `isLayoutPending = true` before posting to worker. The worker result callback sets `isLayoutPending = false` and applies the positioned nodes.

Helper functions `fullLayout` and `layoutWithPreservedPositions` become async-aware — they call the bridge instead of `computeLayout` directly. `filterByScope` and `applyHidden` stay synchronous (they're fast).

### Step 4 — Loading overlay

**Modify** `src/graph/components/graph-canvas.tsx`

Read `isLayoutPending` from the store. Two states:
- **Initial load** (`isLayoutPending && nodes.length === 0`): Show centered spinner with "Computing layout..." text over the ReactFlow container
- **Re-layout** (`isLayoutPending && nodes.length > 0`): Keep existing nodes visible and interactive; optionally show a small spinner badge in the controls area

Use Chakra's `Spinner` component inside a positioned overlay `Box`.

### Step 5 — i18n

**Modify** `src/locales/en-US.json`

Add key: `"graph.layoutPending": "Computing layout…"`

---

## Files Summary

| Action | File | Purpose |
|--------|------|---------|
| CREATE | `src/graph/layout.worker.ts` | Worker entry: receives message, runs computeLayout, posts result |
| CREATE | `src/graph/layout-bridge.ts` | Main-thread API: create worker, send/receive, stale handling |
| MODIFY | `src/graph/store.ts` | Add `isLayoutPending`, refactor 4 call sites to async |
| MODIFY | `src/graph/components/graph-canvas.tsx` | Loading overlay when pending |
| MODIFY | `src/locales/en-US.json` | Add loading text key |

`src/graph/layout.ts` stays **unchanged** — imported by the worker as-is.

---

## Key Design Decisions

1. **Monotonic counter over AbortController** — Simpler, no async cancellation needed. Worker keeps computing (can't cancel WebCola mid-iteration anyway), but stale results are dropped on receipt.

2. **Lazy worker instantiation** — Worker is only created on first `requestLayout()` call, not on module import. If a user never visits the graph page, zero overhead.

3. **filterByScope stays on main thread** — It's O(V+E) with tiny constant factors (~1ms). Moving it to the worker would add message serialization overhead for no gain.

4. **Position preservation fast path** — `setFullGraph` checks synchronously whether all nodes already have positions. If yes, skips the worker entirely. This is the common case for polling updates where the graph structure hasn't changed.

5. **No clearing nodes on re-layout** — During direction/scope changes, existing nodes stay visible while the worker computes. Only initial load (empty canvas) shows a spinner overlay. This avoids a flash of empty canvas.

---

## Verification

1. `pnpm lint` + `npx tsc -b --noEmit` — no errors
2. Open graph page with real API → graph renders after brief pending state, no main-thread freeze
3. Toggle LR/TB direction → old layout stays visible, then updates smoothly
4. Switch scope → same behavior, no freeze
5. Switch to schema view → loads with spinner, then renders
6. Rapidly toggle direction 5x → only final layout applies (stale results dropped)
7. Console: `[layout]` timings now appear in worker thread, not main thread
8. DevTools Performance tab: no long tasks during layout computation
