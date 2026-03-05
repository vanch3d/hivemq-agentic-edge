# VAN-21 — Task Brief

## Problem

The AI conversation is the core interaction of the agentic edge app, yet it is hidden behind a slide-out drawer panel. The current layout treats it as secondary to the graph/content area. The sidebar navigation occupies permanent screen space for only two items (graph link + snapshot history).

## Objectives

1. **Splitter-based main page** — Replace the sidebar + drawer layout with a horizontal splitter. The conversation is always visible, not toggled.
2. **Left panel = conversation** — Same paradigm as the current drawer: header with model info, message list with bubbles, footer with prompt input.
3. **Right panel = navigation outlet** — Renders the route content (domain ontology graph by default).
4. **Responsive minimum width** — The left (conversation) panel has a minimum width that scales with media breakpoints.
5. **Drop left-hand sidebar** — Remove the 240px sidebar entirely.
6. **Toolbar user menu consolidation** — Move logout, configuration, and navigation commands into the user menu dropdown. Add a visual dropdown caret to make the menu affordance clear.
7. **Snapshots as a page** — The "Recent Queries" list moves from the sidebar to a dedicated navigable page. Integration details to be decided after the new structure is in place.
