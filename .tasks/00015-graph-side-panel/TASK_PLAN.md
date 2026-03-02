# Task Plan: Graph Side Panel → Floating Overlay

> See [TASK_BRIEF.md](./TASK_BRIEF.md) for requirements.

## Approach: React Flow `<Panel>` overlay

Use React Flow's built-in `<Panel position="top-right">` inside `GraphCanvas`. It positions a div absolutely within the React Flow viewport. The panel only renders when `selectedNodeId` is non-null (transient), and includes a close button.

### Layout after change

```
GraphPage (Flex, h="full", w="full")
└── Canvas Area (Flex, direction="column", flex="1")  ← full width, no side panel
    ├── Box (flex="1", position="relative")
    │   └── GraphCanvas (ReactFlow)
    │       ├── Background
    │       ├── MiniMap (bottom-right)
    │       └── Panel (top-right) ← conditional on selectedNodeId
    │           └── floating card with GraphDetailPanel content
    ├── GraphControls
    └── GraphLegend
```

## Implementation Steps

- [x] **1. Move detail panel into `GraphCanvas` as a floating `Panel`**
  - File: `src/graph/components/graph-canvas.tsx`
  - Import `Panel` from `@xyflow/react`, import `GraphDetailPanel`
  - Read `selectedNodeId` from store
  - Inside `<ReactFlow>`, conditionally render `<Panel position="top-right">` with card-styled wrapper (`w="280px"`, `maxH="calc(100% - 160px)"`, `overflow="auto"`, border/shadow/bg) and a close button

- [x] **2. Update `GraphDetailPanel` — remove empty-state prompt**
  - File: `src/graph/components/graph-detail-panel.tsx`
  - Remove the `if (!selectedNode)` early return with "select a node" text
  - Return `null` if no selected node (shouldn't happen since parent guards)

- [x] **3. Remove side panel from `GraphPage`**
  - File: `src/graph/components/graph-page.tsx`
  - Remove `<Box w="280px" ...><GraphDetailPanel /></Box>`
  - Remove `GraphDetailPanel` import
  - Canvas Flex becomes the only child, taking full width

- [x] **4. Verify build and lint pass**

## Files Changed

| File | Action |
|------|--------|
| `src/graph/components/graph-canvas.tsx` | Add `Panel` overlay with `GraphDetailPanel` |
| `src/graph/components/graph-detail-panel.tsx` | Remove empty-state prompt |
| `src/graph/components/graph-page.tsx` | Remove side panel wrapper |

## Key Details

- **Minimap collision avoidance**: MiniMap is bottom-right (~120px tall). Detail panel uses `maxH="calc(100% - 160px)"` from top-right so they can't overlap.
- **Close behavior**: Close button calls `selectNode(null)`. Canvas pane click already calls `selectNode(null)` via `onPaneClick`.
- **Styling**: Card appearance — `bg="bg.panel"`, `borderWidth="1px"`, `borderRadius="md"`, `shadow="md"`, `w="280px"`.
