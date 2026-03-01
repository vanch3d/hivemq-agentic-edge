# Task Brief — Query Snapshots & Permalinks

## Objective

Promote query tool results from the chat drawer into the main content area as timestamped, routable, read-only snapshots. Query history persists in the sidebar for the duration of the browser session, independent of conversation state.

## Requirements

1. **Main content view** — When a query tool executes, show the result in the main content area (full-width table, JSON viewer, or graph). Keep the inline chat rendering too for conversational context.
2. **Router-compatible** — Each snapshot is a real TanStack Router route (`/workspace/snapshot/$id`). Back/forward navigation works naturally.
3. **Transient sidebar links** — Snapshot entries appear in the sidebar below the permanent nav items (Home, Graph, Configuration). They persist for the browser session (sessionStorage).
4. **No auto-navigation** — Tool execution creates the snapshot and sidebar entry, but does not navigate away from the current page. The user clicks the sidebar link when ready.
5. **Timestamps** — Each snapshot records when the query was executed. The sidebar shows relative time ("2 minutes ago"). This matters because a "list adapters" result changes before and after a mutation.
6. **Session lifecycle** — Snapshots survive page reloads but not new tabs/sessions. FIFO eviction at 50 entries. "Clear all" button in sidebar.
7. **Conversation independence** — The chat conversation can be cleared, but the query snapshot history remains.

## Context

- Query tools currently return `{ data, error }` and results render inline in the chat drawer via `ToolResultStatus` → `ChatTable` (arrays) or JSON text (objects).
- The graph tool (`queryGraph`) is special — it returns `{ display: "graph" }` and manipulates the graph Zustand store.
- The sidebar is currently static: Home, Graph, Configuration.
- No dynamic or parameterized routes exist yet.
