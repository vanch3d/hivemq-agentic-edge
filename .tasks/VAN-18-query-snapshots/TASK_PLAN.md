# Task Plan — Query Snapshots & Permalinks

> See `TASK_BRIEF.md` for requirements.

## Architecture

Query tools create **snapshots** — timestamped captures of tool results stored in a Zustand store backed by `sessionStorage`. Each snapshot gets a UUID and a corresponding route at `/workspace/snapshot/$id`. The sidebar dynamically renders links to these snapshots below the permanent nav items.

```
Tool executes query
  → Result returned to chat (inline rendering unchanged)
  → Snapshot created in Zustand store (sessionStorage)
  → Sidebar reactively shows new entry
  → User clicks sidebar link → navigates to /workspace/snapshot/$id
  → Snapshot page renders full-width view (table / JSON / graph)
```

No auto-navigation: the tool creates the snapshot silently; the user navigates when ready.

---

## Data Model

```typescript
// src/stores/snapshot-store.ts

type SnapshotDisplayType = "table" | "json" | "graph";

type QuerySnapshot = {
  id: string; // crypto.randomUUID()
  toolName: string; // "queryAdapters"
  operation: string; // "list"
  displayType: SnapshotDisplayType;
  timestamp: number; // Date.now()
  data: unknown; // raw result data
  label: string; // "Adapters — list"
  graphScope?: string; // queryGraph only
  graphFocusEntityId?: string; // queryGraph only
};
```

Store: Zustand + `persist` middleware → `sessionStorage` (key: `"query-snapshots"`). FIFO eviction at 50 entries. Reactive subscribers drive sidebar updates.

---

## Files

| Action | File                                                   | Purpose                                                              |
| ------ | ------------------------------------------------------ | -------------------------------------------------------------------- |
| CREATE | `src/stores/snapshot-store.ts`                         | Zustand store with sessionStorage persistence                        |
| CREATE | `src/utils/format-relative-time.ts`                    | `Intl.RelativeTimeFormat` utility (no deps)                          |
| CREATE | `src/agent/tools/snapshot-helper.ts`                   | Shared helper: determines displayType, calls store                   |
| CREATE | `src/components/snapshot/snapshot-page.tsx`            | Route component: reads param, looks up snapshot, delegates rendering |
| CREATE | `src/components/snapshot/snapshot-table.tsx`           | Full-width table (reuses ChatTable column logic, larger page size)   |
| CREATE | `src/components/snapshot/snapshot-json.tsx`            | Pretty-printed JSON viewer                                           |
| CREATE | `src/components/snapshot/snapshot-graph.tsx`           | Graph scope viewer (wraps existing graph canvas)                     |
| CREATE | `src/routes/_authenticated/workspace/snapshot.$id.tsx` | TanStack Router dynamic segment route                                |
| MODIFY | `src/agent/tool-context.ts`                            | Add `setSnapshotCreator` / `createToolSnapshot` bridge               |
| MODIFY | `src/context/chat-context.tsx`                         | Register snapshot creator on mount                                   |
| MODIFY | `src/components/workspace/sidebar.tsx`                 | Add transient snapshot links section                                 |
| MODIFY | `src/agent/tools/query-bridges.ts`                     | Call `snapshotQueryResult` after success                             |
| MODIFY | `src/agent/tools/query-adapters.ts`                    | Call `snapshotQueryResult` after success                             |
| MODIFY | `src/agent/tools/query-data-hub.ts`                    | Call `snapshotQueryResult` after success                             |
| MODIFY | `src/agent/tools/query-system.ts`                      | Call `snapshotQueryResult` after success                             |
| MODIFY | `src/agent/tools/query-sampling.ts`                    | Call `snapshotQueryResult` after success                             |
| MODIFY | `src/agent/tools/query-graph.ts`                       | Call `snapshotQueryResult` after success                             |
| MODIFY | `src/locales/en-US.json`                               | Add `snapshot.*` i18n keys                                           |

---

## Implementation Details

### 1. Snapshot store — `src/stores/snapshot-store.ts`

Zustand store with `persist` middleware to `sessionStorage`:

- `snapshots: QuerySnapshot[]` — newest first
- `addSnapshot(partial)` → generates `id` via `crypto.randomUUID()`, sets `timestamp` to `Date.now()`, prepends to array, caps at 50, returns `id`
- `removeSnapshot(id)` → filter out by id
- `getSnapshot(id)` → find by id
- `clearAll()` → empty array

### 2. Relative time formatter — `src/utils/format-relative-time.ts`

Uses `Intl.RelativeTimeFormat` (built-in, no dependency). Buckets: seconds → minutes → hours → days. Returns strings like "2 minutes ago", "just now".

### 3. Tool context bridge — `src/agent/tool-context.ts`

Following the existing module-level ref pattern (`setToolNavigate`, `setFormRequester`, `setApprovalRequester`):

```typescript
type SnapshotCreatorFn = (opts: {
  toolName: string;
  operation: string;
  displayType: SnapshotDisplayType;
  data: unknown;
  label: string;
  graphScope?: string;
  graphFocusEntityId?: string;
}) => string; // returns snapshot id

let _createSnapshot: SnapshotCreatorFn | null = null;

export function setSnapshotCreator(fn: SnapshotCreatorFn): void { ... }
export function createToolSnapshot(...): string | null { ... }
```

### 4. Snapshot helper — `src/agent/tools/snapshot-helper.ts`

Small utility called by each query tool after success:

```typescript
export function snapshotQueryResult(opts: {
  toolName: string;
  operation: string;
  data: unknown;
  label: string;
  graphScope?: string;
  graphFocusEntityId?: string;
}): void {
  const displayType = opts.graphScope
    ? "graph"
    : Array.isArray(opts.data)
      ? "table"
      : "json";
  createToolSnapshot({ ...opts, displayType });
}
```

No navigation — just creates the snapshot.

### 5. ChatProvider registration — `src/context/chat-context.tsx`

```typescript
useEffect(() => {
  setSnapshotCreator((opts) => useSnapshotStore.getState().addSnapshot(opts));
}, []);
```

Same pattern as the existing `setToolNavigate`, `setFormRequester`, `setApprovalRequester`.

### 6. Snapshot viewer — `src/components/snapshot/`

**`snapshot-page.tsx`**: Reads `id` from `useParams`, looks up snapshot from store. Header with label + timestamp badge. Delegates to sub-component by `displayType`. Not-found state for expired/cleared snapshots.

**`snapshot-table.tsx`**: Full-width TanStack Table. Reuses the auto-column-generation pattern from `ChatTable` but with main-content sizing: 25 rows/page, full search/sort/pagination.

**`snapshot-json.tsx`**: `JSON.stringify(data, null, 2)` in a `Code` block with `whiteSpace: "pre-wrap"`.

**`snapshot-graph.tsx`**: Wraps the existing graph system. On mount: saves current view scope, calls `useGraphStore.setViewScope(snapshot.graphScope, snapshot.graphFocusEntityId)`. On unmount: restores previous scope.

### 7. Route — `src/routes/_authenticated/workspace/snapshot.$id.tsx`

```typescript
export const Route = createFileRoute("/_authenticated/workspace/snapshot/$id")({
  component: SnapshotPage,
});
```

TanStack Router auto-generates the route tree entry. The `$id` filename convention creates a dynamic segment.

### 8. Sidebar — `src/components/workspace/sidebar.tsx`

Below permanent nav items, add a "Recent Queries" section (only when `snapshots.length > 0`):

- Section header: "Recent Queries" label + "Clear all" icon button
- Snapshot entries: each is a `Link` to `/workspace/snapshot/$id` with:
  - Small icon (LuHistory)
  - Label text (truncated)
  - Relative timestamp below ("2 min ago")
  - Active state when current route matches
- Scrollable container for the snapshot list

### 9. Query tool modifications

Each of the 6 query tools (`query-bridges.ts`, `query-adapters.ts`, `query-data-hub.ts`, `query-system.ts`, `query-sampling.ts`, `query-graph.ts`) gets a single addition after the successful result path:

```typescript
if (result.data && !result.error) {
  snapshotQueryResult({
    toolName: "queryBridges",
    operation: input.operation,
    data: result.data,
    label: "Bridges — " + input.operation,
  });
}
return result;
```

For `queryGraph`, also pass `graphScope` and `graphFocusEntityId`.

### 10. i18n — `src/locales/en-US.json`

```json
"snapshot": {
  "recentQueries": "Recent Queries",
  "clearAll": "Clear all",
  "notFound": "This snapshot has expired or been cleared.",
  "noData": "No data to display."
}
```

---

## Implementation Order

- [ ] 1. `src/stores/snapshot-store.ts` — Zustand store
- [ ] 2. `src/utils/format-relative-time.ts` — time formatter
- [ ] 3. `src/agent/tool-context.ts` — snapshot creator bridge
- [ ] 4. `src/agent/tools/snapshot-helper.ts` — shared helper
- [ ] 5. `src/context/chat-context.tsx` — register snapshot creator
- [ ] 6. `src/components/snapshot/` — viewer components (page, table, json, graph)
- [ ] 7. `src/routes/_authenticated/workspace/snapshot.$id.tsx` — route file
- [ ] 8. `src/components/workspace/sidebar.tsx` — dynamic snapshot links
- [ ] 9. `src/agent/tools/query-*.ts` — wire 6 query tools
- [ ] 10. `src/locales/en-US.json` — i18n keys

---

## Verification

- [ ] `pnpm lint` + `npx tsc -b --noEmit` — no errors
- [ ] Chat "list all bridges" → inline table in chat + sidebar entry appears with "Bridges — list" and timestamp
- [ ] Click sidebar entry → main area shows full-width table with sort/search/pagination
- [ ] Navigate to Graph → press Back → snapshot page still renders (sessionStorage)
- [ ] Multiple queries → sidebar shows entries newest-first
- [ ] "Clear all" → sidebar section disappears, snapshot routes show "not found"
- [ ] Close tab, reopen → snapshots gone (sessionStorage)
- [ ] Snapshot for queryGraph → renders graph with correct scope
