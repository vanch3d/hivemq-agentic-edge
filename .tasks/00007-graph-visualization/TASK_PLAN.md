# Task Plan: Domain Graph Visualization

## Goal

Add an interactive graph visualization of the HiveMQ Edge domain ontology.
The graph is a **persistent, full-domain view** loaded from the existing API
endpoints and cached in Zustand. It has its own full-page route
(`/workspace/graph`) as the primary experience, and can also render inline
in chat when the AI invokes `queryGraph`. Chat interactions control the
**view** (scope, filter, highlight, layout) — not the data.

## Domain Graph Model

### Node Types

Each domain entity maps to a custom React Flow node type with distinct visual styling.

| Node Type      | Domain Entity                      | Color        | Icon           | Shape                 |
| -------------- | ---------------------------------- | ------------ | -------------- | --------------------- |
| `adapter`      | Protocol Adapter instance          | Blue         | Plug/connector | Rounded rect          |
| `adapterType`  | Protocol Adapter type              | Light blue   | Blueprint      | Rounded rect (dashed) |
| `tag`          | Domain Tag                         | Teal         | Tag            | Small rect            |
| `topic`        | MQTT Topic                         | Green        | Message/arrow  | Pill/rounded          |
| `topicFilter`  | Topic Filter pattern               | Light green  | Filter         | Pill (dashed)         |
| `bridge`       | MQTT Bridge                        | Orange       | Link/chain     | Rounded rect          |
| `remoteBroker` | Remote MQTT broker (bridge target) | Dark orange  | Server         | Rounded rect          |
| `policy`       | Data/Behavior Policy               | Purple       | Shield         | Hexagon               |
| `schema`       | Policy Schema                      | Light purple | File/doc       | Small rect            |
| `combiner`     | Combiner                           | Yellow       | Merge          | Diamond               |
| `pulseAsset`   | Pulse Managed Asset                | Pink         | Cloud          | Rounded rect          |
| `device`       | Physical device (inferred)         | Gray         | Microchip      | Rounded rect          |
| `listener`     | MQTT Listener                      | Dark green   | Antenna        | Small rect            |

### Edge Types

| Edge Label   | From → To                     | Style                      |
| ------------ | ----------------------------- | -------------------------- |
| `exposes`    | adapter → tag                 | Solid, teal                |
| `northbound` | tag → topic                   | Solid, green, arrow        |
| `southbound` | topic → tag                   | Dashed, green, arrow       |
| `publishes`  | adapter → topic (via mapping) | Solid, blue→green gradient |
| `subscribes` | topic → bridge                | Solid, orange              |
| `forwards`   | bridge → remoteBroker         | Solid, orange, arrow       |
| `matches`    | topicFilter → topic           | Dotted, light green        |
| `validates`  | policy → topic                | Dotted, purple             |
| `uses`       | policy → schema               | Dotted, light purple       |
| `combines`   | topic/tag → combiner          | Solid, yellow              |
| `outputs`    | combiner → topic/pulseAsset   | Solid, yellow, arrow       |
| `instanceOf` | adapter → adapterType         | Dashed, light blue         |

### Status Overlay

Node border and background opacity reflect runtime status:

| Status                     | Visual                                             |
| -------------------------- | -------------------------------------------------- |
| `CONNECTED` / `STARTED`    | Solid border, full opacity, green accent dot       |
| `DISCONNECTED` / `STOPPED` | Dimmed (50% opacity), gray accent dot              |
| `ERROR`                    | Red border, red accent dot, subtle pulse animation |
| `UNKNOWN` / `STATELESS`    | Default styling, no accent dot                     |

---

## Data Architecture (Hybrid Model)

```
TanStack Query (API cache)        ← source of truth for raw API data
       ↓ derive
Graph Assembler                   ← transforms cached responses into nodes + edges
       ↓ write
Zustand Store                     ← full domain graph + active view/scope
       ↓ read
React Flow Canvas                 ← renders visible subgraph
       ↑ control
Chat tool (queryGraph)            ← sets scope/filter/highlight on the store
```

- **TanStack Query** manages freshness of API data (adapters, bridges, policies, etc.)
- **Assembler** is a pure function: `(apiData) → { nodes, edges }` — runs when
  query data changes (via a `useEffect` or query `select`)
- **Zustand store** holds the full assembled graph plus the active view state
  (which scope is shown, which nodes are highlighted, layout direction)
- **queryGraph tool** is lightweight — it just calls `store.setScope(...)`,
  no network requests
- **Refresh**: invalidate TanStack Query keys → data refetches → assembler
  re-derives → store updates → React Flow re-renders

## New Dependencies

```
pnpm add zustand @xyflow/react webcola
pnpm add -D @types/webcola
```

## New Files

```
src/graph/
  types.ts                — DomainEntityType, GraphNodeData, GraphEdgeData, ViewScope
  constants.ts            — Color map, node dimensions, status colors, edge styles
  store.ts                — Zustand store (full graph + view state)
  assembler.ts            — Pure fn: API data → { nodes, edges }
  layout.ts               — WebCola wrapper: (nodes, edges, dir) → positioned nodes
  use-graph-data.ts       — Hook: TanStack Query → assembler → store.setFullGraph()
  components/
    graph-page.tsx         — Full-page layout (canvas + sidebar panel + legend)
    graph-canvas.tsx       — ReactFlow wrapper consuming Zustand store
    graph-controls.tsx     — MiniMap, zoom, fit-view, layout direction toggle
    graph-legend.tsx       — Color-coded entity type legend
    graph-detail-panel.tsx — Right panel showing selected node details
    chat-graph.tsx         — Compact graph for inline chat rendering
    nodes/
      base-node.tsx        — Shared node shell (border, status dot, handles)
      adapter-node.tsx
      bridge-node.tsx
      domain-tag-node.tsx
      topic-filter-node.tsx
      data-policy-node.tsx
      behavior-policy-node.tsx
      schema-node.tsx
      script-node.tsx
      combiner-node.tsx
      listener-node.tsx
      index.ts             — nodeTypes record
    edges/
      relationship-edge.tsx
      index.ts             — edgeTypes record

src/routes/_authenticated/workspace/
  graph.tsx                — Route file for /workspace/graph

src/agent/tools/
  query-graph.ts           — Client tool: sets view scope on Zustand store

src/mocks/fixtures/
  graph.ts                 — Pre-assembled mock graph data (for MSW)
```

## Modified Files

| File                                   | Change                                          |
| -------------------------------------- | ----------------------------------------------- |
| `src/agent/tool-definitions.ts`        | Add `queryGraphDef`                             |
| `src/agent/tools/index.ts`             | Export `queryGraph`                             |
| `src/context/chat-context.tsx`         | Register `queryGraph` in `clientTools()`        |
| `src/components/chat/tool-status.tsx`  | Detect `display: 'graph'`, render `<ChatGraph>` |
| `src/components/workspace/sidebar.tsx` | Add "Graph" nav item → `/workspace/graph`       |
| `src/mocks/handlers/chat.ts`           | Add graph/visualize/topology scenario           |

## Zustand Store Design

```typescript
// src/graph/store.ts
interface GraphState {
  // --- Full domain graph (all entities) ---
  fullNodes: GraphNode[];
  fullEdges: GraphEdge[];
  isAssembled: boolean;        // true once first assembly completes

  // --- Active view ---
  viewScope: ViewScope;        // 'full' | 'dataFlow' | 'adapterTopology' | ...
  focusEntityId: string | null;
  highlightedNodeIds: Set<string>;

  // --- Derived visible graph (computed from full + scope) ---
  nodes: GraphNode[];          // positioned, filtered subset
  edges: GraphEdge[];

  // --- Layout ---
  layoutDirection: 'TB' | 'LR';

  // --- Selection ---
  selectedNodeId: string | null;

  // --- Viewport ---
  viewport: Viewport;

  // --- React Flow handlers ---
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;

  // --- Actions ---
  setFullGraph: (nodes, edges) => void;  // called by assembler hook
  setViewScope: (scope, focusId?) => void;  // called by tool or UI
  setLayoutDirection: (dir) => void;
  selectNode: (id | null) => void;
  setHighlight: (ids) => void;
  reset: () => void;
}
```

`setViewScope` filters `fullNodes`/`fullEdges` by scope, runs `computeLayout`,
and writes the result to `nodes`/`edges`. This is the key action that both the
chat tool and the full-page UI controls invoke.

## Graph Assembly — View Scopes

| Scope             | Which Entities Are Visible                                      |
| ----------------- | --------------------------------------------------------------- |
| `full`            | Everything                                                      |
| `dataFlow`        | Adapter → DomainTag → TopicFilter → DataPolicy → Schema, Script |
| `adapterTopology` | Adapter + its DomainTags + NB/SB mappings (TopicFilters)        |
| `policyImpact`    | DataPolicy, BehaviorPolicy → Schema, Script, TopicFilter        |
| `bridgeTopology`  | Bridge → TopicFilter (local + remote subscriptions)             |
| `combinerSources` | Combiner → referenced Adapters/Bridges                          |

With `focusEntityId`, the scope centers on a specific entity and its neighbors
(1-hop or 2-hop depending on scope).

## Assembler — API Data → Graph

The `use-graph-data.ts` hook uses TanStack Query options from the generated SDK:

```typescript
function useGraphData() {
  const adapters = useQuery(getAdaptersOptions());
  const bridges = useQuery(getBridgesOptions());
  const dataPolicies = useQuery(getAllDataPoliciesOptions());
  const behaviorPolicies = useQuery(getAllBehaviorPoliciesOptions());
  const schemas = useQuery(getAllSchemasOptions());
  const scripts = useQuery(getAllScriptsOptions());
  const combiners = useQuery(getCombinersOptions());
  const topicFilters = useQuery(getTopicFiltersOptions());
  const listeners = useQuery(getListenersOptions());

  useEffect(() => {
    if (allSettled) {
      const { nodes, edges } = assembleFullGraph({ ... });
      useGraphStore.getState().setFullGraph(nodes, edges);
    }
  }, [adapters.data, bridges.data, ...]);
}
```

This hook is mounted in the workspace layout so the graph is always warming
up in the background, even before the user navigates to `/workspace/graph`.

## Full-Page Route (`/workspace/graph`)

```
┌──────────────────────────────────────────────┐
│ Toolbar                              [Chat]  │
├──────┬───────────────────────────┬───────────┤
│      │                           │           │
│ Side │   React Flow Canvas       │  Detail   │
│ bar  │   (pan, zoom, drag)       │  Panel    │
│      │                           │ (selected │
│      │                           │  node)    │
│      │                           │           │
│      ├───────────────────────────┤           │
│      │ Controls + Legend         │           │
└──────┴───────────────────────────┴───────────┘
```

- Scope selector (dropdown or tabs) in the toolbar area of the graph page
- Detail panel shows raw entity data when a node is selected
- Controls: fit-view, zoom, layout direction toggle, refresh button

## Chat Integration

### Tool Definition

```typescript
export const queryGraphDef = toolDefinition({
  name: "queryGraph",
  description:
    "Show a graph visualization of the domain. " +
    "Scopes: full, dataFlow, adapterTopology, policyImpact, " +
    "bridgeTopology, combinerSources.",
  inputSchema: z.object({
    scope: z.enum([
      "full",
      "dataFlow",
      "adapterTopology",
      "policyImpact",
      "bridgeTopology",
      "combinerSources",
    ]),
    focusEntityId: z.string().optional(),
  }),
  outputSchema: z.object({
    display: z.literal("graph"),
    scope: z.string(),
    nodeCount: z.number(),
    edgeCount: z.number(),
  }),
});
```

### Tool Implementation

```typescript
export const queryGraph = queryGraphDef.client(async (input) => {
  const store = useGraphStore.getState();
  store.setViewScope(input.scope, input.focusEntityId);
  const { nodes, edges } = store;
  return {
    display: "graph" as const,
    scope: input.scope,
    nodeCount: nodes.length,
    edgeCount: edges.length,
  };
});
```

No API calls — just sets the view on the already-loaded graph.

### Chat Rendering

In `tool-status.tsx`:

```typescript
if (result.display === 'graph') {
  return <ChatGraph />;  // compact 400×300 canvas, no detail panel
}
```

`ChatGraph` reads from the same Zustand store as the full page.

## Implementation Phases

### Phase 1: Foundation

- `pnpm add zustand @xyflow/react webcola @types/webcola`
- `src/graph/types.ts` — all TypeScript types
- `src/graph/constants.ts` — colors, dimensions
- `src/graph/store.ts` — Zustand store

### Phase 2: Assembler + Layout

- `src/graph/assembler.ts` — pure function: API data → nodes + edges
- `src/graph/layout.ts` — WebCola wrapper
- `src/graph/use-graph-data.ts` — TanStack Query hook → assembler → store

### Phase 3: Node & Edge Components

- `src/graph/components/nodes/base-node.tsx` + 10 entity nodes + `index.ts`
- `src/graph/components/edges/relationship-edge.tsx` + `index.ts`

### Phase 4: Canvas & Full Page

- `src/graph/components/graph-canvas.tsx` — ReactFlow + Zustand
- `src/graph/components/graph-controls.tsx`
- `src/graph/components/graph-legend.tsx`
- `src/graph/components/graph-detail-panel.tsx`
- `src/graph/components/graph-page.tsx` — full-page layout
- `src/routes/_authenticated/workspace/graph.tsx` — route
- `src/components/workspace/sidebar.tsx` — add nav item

### Phase 5: Chat Tool & Integration

- `src/agent/tool-definitions.ts` — add `queryGraphDef`
- `src/agent/tools/query-graph.ts` — client tool
- `src/agent/tools/index.ts` — export
- `src/context/chat-context.tsx` — register in `clientTools()`
- `src/components/chat/tool-status.tsx` — render `<ChatGraph>`
- `src/graph/components/chat-graph.tsx` — compact chat version

### Phase 6: MSW Mocks

- `src/mocks/fixtures/graph.ts`
- `src/mocks/handlers/chat.ts` — add graph/topology scenario

## Verification

1. `pnpm build` passes
2. `pnpm lint:all` passes
3. Navigate to `/workspace/graph` — full graph renders with all entity types
4. Scope selector changes visible subgraph
5. Click a node → detail panel shows entity data
6. Drag nodes → positions persist in Zustand
7. Layout toggle (TB/LR) → graph re-layouts
8. Chat: "show data flow" → compact graph in chat bubble
9. Chat: "show adapter topology" → scoped graph
10. Works in both light and dark mode
