# VAN-25 — Embedded graph: state isolation and restricted UI

## Problem

The `queryGraph` tool renders an embedded React Flow graph inside the conversation bubble. This works exceptionally well — it mirrors the main graph canvas and the snapshot links function correctly.

However, all embedded graphs and the main canvas share the same Zustand store (`useGraphStore`). This causes two issues:

### 1. Shared mutable state

Dragging a node in the embedded graph updates the main canvas (and vice versa). While this could be a valuable behavior for the _current_ graph, it becomes a problem when the conversation contains multiple `queryGraph` results: a new queryGraph call changes the scope/focus, and all previous embedded graphs update to show the new content. They don't persist their own state.

### 2. Embedded graphs have full interactivity

The embedded graph currently supports drag, zoom, scroll, node selection, and the detail panel — all within a small conversation bubble. This is excessive for the available space.

## Requirements

### Restricted UI for embedded graphs

The embedded graph should be read-only and minimal:

- No node dragging
- No zoom / scroll (or very constrained)
- No node selection or detail panel (the snapshot link covers this)
- Essentially a static preview that reflects the state at the time the tool was called

### State isolation (investigation needed)

Each embedded graph should reflect the scope/focus at the time `queryGraph` was called, not the current live state.

**Open question**: What is the cost of maintaining multiple React Flow instances with their own state? Given that conversations are limited lifespan in the agentic workflow, the number of concurrent graphs should be bounded. Options to investigate:

- Separate Zustand store per embedded graph (snapshot of state at call time)
- Render embedded graphs as static SVG/image snapshots instead of live React Flow
- Keep a single live React Flow but render past results as frozen previews (captured viewport screenshot or serialized node positions)
