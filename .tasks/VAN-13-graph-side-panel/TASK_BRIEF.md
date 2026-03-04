# Task Brief: Graph Side Panel → Floating Overlay

## Problem

The graph page has a permanent 280px side panel on the right showing "select a node to see details". This consumes horizontal space with no value until a node is clicked.

## Requirements

1. Replace the permanent side panel with a transient, space-efficient overlay for contextual node information.
2. The overlay must be within the page / canvas area — not a drawer or modal.
3. Consider React Flow's `<Panel>` component, positioned top-right, above the minimap.
4. Control the panel height so it doesn't clash with the minimap.
5. The overlay must be non-blocking (no modal).
6. Use a single panel for all secondary content (not node-specific panels).
