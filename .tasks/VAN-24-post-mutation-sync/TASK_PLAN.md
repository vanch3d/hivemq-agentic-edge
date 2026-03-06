# VAN-24 — Task Plan

## Root Cause Analysis

### Problem 1: Stale graph after mutation

The `useGraphData` hook fetches data via `useQuery` on mount. No mutation tool calls `queryClient.invalidateQueries()` after a successful API call. The graph data is never refreshed.

The callback infrastructure exists in `tool-context.ts` (`setQueryInvalidator`/`invalidateQueries`) but is **never wired up**.

### Problem 2: LLM response out of sync

The LLM streams text alongside tool calls (a "prediction" of the outcome) before the tool result is available. The continuation turn after the tool result should produce the accurate acknowledgment. TanStack AI handles this automatically via `maxIterations(5)`. Needs investigation to confirm continuation fires correctly.

---

## Architecture

### Separation of concerns

```
Mutation tools    → invalidate queries (always, silently)
queryGraph tool   → navigate + scope + select + zoom (agent-controlled)
Graph page        → read route search params, handle async focus lifecycle
Agent (LLM)       → decides whether to show the graph based on user intent
```

- "Create a bridge" → `mutateBridge` → invalidate → done
- "Create a bridge and show it on the graph" → `mutateBridge` → invalidate → LLM continuation calls `queryGraph({ scope: "bridgeTopology", selectNodeId: "bridge:test4567" })`

### Two scenarios for graph focus

**Scenario A — User already on graph, existing node (update/transitionStatus)**:
Node is already in the canvas. `queryGraph` can immediately call `selectNode()` + `rf.fitView()`. No need to wait for refetch — the data updates in the background, the visual focus is instant and smooth.

**Scenario B — User on different page, new node (create)**:
`queryGraph` navigates to `/workspace/graph?focus=bridge:test4567&scope=bridgeTopology`. The graph page mounts, reads search params, waits for the node to appear (after refetch settles and layout completes), then selects + zooms. Route params solve the timing problem naturally.

---

## Implementation Plan

### Part 1: Query invalidation after mutations

Wire up the existing `setQueryInvalidator`/`invalidateQueries` in tool-context.

- [x] **`src/context/chat-context.tsx`** — Import `useQueryClient`, register `setQueryInvalidator` in a `useEffect` (same pattern as existing registrations). The callback calls `queryClient.invalidateQueries()`.
- [x] **`src/agent/tools/mutate-bridge.ts`** — Import `invalidateQueries`, call it after each successful API call (`!error`).
- [x] **`src/agent/tools/mutate-adapter.ts`** — Same.
- [x] **`src/agent/tools/mutate-data-hub.ts`** — Same.
- [x] **`src/agent/tools/mutate-system.ts`** — Same.

### Part 2: Enhance `queryGraph` with navigation + node selection

Extend the `queryGraph` tool definition and implementation.

#### Tool definition changes (`src/agent/tool-definitions.ts`)

Add `selectNodeId` parameter to `queryGraphDef.inputSchema`:
```
selectNodeId: z.string().optional()
  .describe("Node ID to select and zoom to (format: entityType:entityId, e.g. 'bridge:my-bridge')")
```

Update the `description` to mention the new capability:
- "Use selectNodeId to focus on a specific node (select + zoom). Use focusEntityId to filter the scope to show only neighbors of that entity. Both can be combined."

#### Tool implementation changes (`src/agent/tools/query-graph.ts`)

Two paths:
1. **User already on graph page**: call `useGraphStore.getState().selectNode(selectNodeId)` directly. For fitView, we need the React Flow instance which isn't available from outside the component — store a `setPendingFocus` in the graph store so `graph-canvas.tsx` can pick it up and zoom.
2. **User on different page**: navigate to `/workspace/graph` with search params `?selectNodeId=xxx&scope=yyy&focusEntityId=zzz`. The graph page reads these on mount.

The tool can detect the current route via `getToolNavigate()` / checking if a "current route" is available, or always navigate (if already on graph, TanStack Router is a no-op for same-route navigation but the search params trigger the focus).

**Simplest approach**: Always navigate with search params. TanStack Router handles the "already on this route" case gracefully. The graph page reads params and acts.

#### Route changes (`src/routes/_authenticated/workspace/graph.tsx`)

Add `validateSearch` to define typed search params:
```ts
{
  selectNodeId: z.string().optional(),
  scope: z.enum([...]).optional(),
  focusEntityId: z.string().optional(),
}
```

#### Graph page changes (`src/graph/components/graph-page.tsx`)

Read search params. When `selectNodeId` is present:
- If graph is assembled and node exists → set scope/focus, select node, pass to canvas for zoom
- If graph is not ready (loading/refetching) → store the target, wait for assembly, then focus
- After focusing, clear the search params (replace URL without params)

#### Graph store changes (`src/graph/store.ts`)

Add `pendingFocusNodeId: string | null` and actions:
- `setPendingFocus(nodeId: string)` — sets the pending target
- `clearPendingFocus()` — clears it after focus is consumed

#### Graph canvas changes (`src/graph/components/graph-canvas.tsx`)

Add `useEffect` watching `pendingFocusNodeId` + `animationPhase`:
- When `pendingFocusNodeId` is set and `animationPhase === "idle"`:
  - `selectNode(pendingFocusNodeId)`
  - `rf.fitView({ nodes: [{ id: pendingFocusNodeId }], padding: 0.5, duration: 500 })`
  - `clearPendingFocus()`
- Modify existing `animationPhase` effect to skip general `fitView` when a pending focus is active

### Part 3: LLM response investigation (diagnostic only)

- [ ] **`src/context/chat-context.tsx`** — Add `console.log` in `onChunk` to trace chunk types and confirm continuation fires after tool results. *(deferred — not critical for this implementation)*

### Part 4: Future — Feature flag for text suppression (design only, not implemented)

A settings toggle ("Clean tool responses") to suppress text that streams alongside tool calls:
- `message-bubble.tsx` checks if a message has both text and tool-call parts → if flag ON, hide text parts
- Useful as a demo tool showing before/after behavior
- Not implemented in this task — depends on diagnostic findings from Part 3

---

## File Changes

| File | Part | Change |
|------|------|--------|
| `src/agent/tool-definitions.ts` | 2 | Add `selectNodeId` param to `queryGraphDef` |
| `src/agent/tools/query-graph.ts` | 2 | Navigate with search params, handle selectNodeId |
| `src/routes/_authenticated/workspace/graph.tsx` | 2 | Add `validateSearch` for typed search params |
| `src/graph/components/graph-page.tsx` | 2 | Read search params, orchestrate focus lifecycle |
| `src/graph/store.ts` | 2 | Add `pendingFocusNodeId` + actions |
| `src/graph/components/graph-canvas.tsx` | 2 | Focus effect on pending + idle, adjust existing fitView |
| `src/context/chat-context.tsx` | 1+3 | Register `setQueryInvalidator`, add diagnostic logging |
| `src/agent/tools/mutate-bridge.ts` | 1 | Call `invalidateQueries()` after success |
| `src/agent/tools/mutate-adapter.ts` | 1 | Same |
| `src/agent/tools/mutate-data-hub.ts` | 1 | Same |
| `src/agent/tools/mutate-system.ts` | 1 | Same |

## Future Extension: Query → Graph sync

The `queryGraph` + `selectNodeId` pattern built here for mutations applies equally to query tools. For example, "What are the active bridges?" could:
1. Return the summary table in the chat bubble (current behavior)
2. Then call `queryGraph({ scope: "bridgeTopology", selectNodeId: "bridge:my-bridge" })` to highlight the result on the graph

This creates an integrated split-view experience: conversation + data table on the left, synchronized graph visualization on the right. The query tools (`queryBridges`, `queryAdapters`, etc.) would chain `queryGraph` the same way mutation tools do — guided by the system prompt and user intent.

**Not in scope for this task** — mutations first. But the infrastructure we're building (route params, pending focus, canvas zoom effect) is reusable as-is for queries.

---

## Verification

1. `pnpm build` — no errors
2. **Mutation only**: "Create a bridge" → graph data refreshes silently, no navigation forced
3. **Mutation + graph**: "Create a bridge and show it on the graph" → agent chains mutation + queryGraph, graph navigates and zooms to new node
4. **Update existing**: on graph page, update a bridge → smooth animated zoom to the updated node (no full refetch needed for the zoom)
5. **queryGraph standalone**: "Show me the bridge topology for bridge X" → navigates to graph, scopes to bridgeTopology, selects + zooms to the bridge
6. Console logs confirm continuation turn fires after tool results
7. Delete operation: graph refreshes, no focus attempt
