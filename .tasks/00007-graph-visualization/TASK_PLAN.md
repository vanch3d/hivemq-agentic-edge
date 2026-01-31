# Task Plan: Domain Graph Visualization

## Architecture

```
queryGraph tool (client-side)
  │
  ├─ Calls multiple SDK queries (adapters, tags, mappings, bridges, policies...)
  ├─ Assembles { nodes, edges } graph structure
  └─ Returns { display: 'graph', graph: { nodes, edges } }
        │
        ▼
message-bubble.tsx
  │
  ├─ display === 'text'  → markdown render
  ├─ display === 'table' → ChatTable (TanStack Table)
  └─ display === 'graph' → ChatGraph (React Flow + WebCola)
                              │
                              ├─ WebCola computes node positions (constraint-based)
                              ├─ React Flow renders interactive diagram
                              └─ Custom node types per domain entity
```

---

## Packages to Install

| Package          | Purpose                                     | Version |
| ---------------- | ------------------------------------------- | ------- |
| `@xyflow/react`  | React Flow — interactive node-edge diagrams | ^12.4.4 |
| `webcola`        | Constraint-based graph layout engine        | ^3.4.0  |
| `@types/webcola` | TypeScript definitions for webcola          | latest  |

---

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

## Graph Query Scopes

The `queryGraph` tool accepts a `scope` parameter that determines which entities to fetch and how to assemble the graph.

### 1. `dataFlow` — Full system data flow

**Query**: "Show me the overall data flow" / "How does data move through the system?"

Fetches all adapters, their tags, all northbound/southbound mappings, all bridges, and connects them into a left-to-right data flow graph.

```
[Device] → [Adapter] → [Tag] → [Topic] → [Bridge] → [Remote Broker]
                                   ↑            ↓
                          [TopicFilter]    [DataPolicy]
```

**SDK calls**:

- `getAdapters()` → adapter nodes
- For each adapter: `getTagsForAdapter()` → tag nodes + `exposes` edges
- `getNorthboundMappings()` / `getSouthboundMappings()` → topic nodes + mapping edges
- `getBridges()` → bridge nodes + subscription edges
- `getTopicFilters()` → topicFilter nodes + `matches` edges (by topic pattern matching)

**Layout**: Left-to-right flow constraint. WebCola `flowLayout` with alignment constraints grouping nodes by column (devices → adapters → tags → topics → bridges).

### 2. `adapterTopology` — Single adapter deep-dive

**Query**: "Show me the topology of the OPC-UA adapter" / "What's connected to adapter X?"

**Parameters**: `entityId` = adapter ID

Fetches one adapter, its type, all its tags, all northbound and southbound mappings for those tags, and the resulting MQTT topics.

```
[AdapterType] ← [Adapter] → [Tag₁] → [Topic₁]
                            → [Tag₂] → [Topic₂]
                                     ← [Topic₃] (southbound)
```

**SDK calls**:

- `getAdapter({ adapterId })` → adapter node
- `getAdapterType({ adapterTypeId })` → type node + `instanceOf` edge
- `getTagsForAdapter({ adapterId })` → tag nodes + `exposes` edges
- `getNorthboundMappingsForAdapter({ adapterId })` → mapping edges + topic nodes
- `getSouthboundMappingsForAdapter({ adapterId })` → mapping edges + topic nodes

**Layout**: Radial or tree from adapter as root. WebCola with `alignment` constraint: adapter centered, type to the left, tags radiating right, topics further right.

### 3. `policyImpact` — What a policy affects

**Query**: "Which topics does policy X validate?" / "Show me the impact of this data policy"

**Parameters**: `entityId` = policy ID

Fetches the policy, its topic filter pattern, all matching topics, and traces upstream to the adapters/tags that publish to those topics.

```
[Policy] → [Schema]
    ↓
[Topic₁] ← [Tag] ← [Adapter]
[Topic₂] ← [Tag] ← [Adapter]
```

**SDK calls**:

- `getDataPolicy({ policyId })` or `getBehaviorPolicy({ policyId })` → policy node
- Extract `topicFilter` pattern → resolve matching topics
- For matching topics: reverse-lookup northbound mappings → tag → adapter
- If policy references schemas: `getSchema({ schemaId })` → schema nodes

**Layout**: Policy as root on left, topics in center column, upstream adapters/tags on right. WebCola flow layout with grouping constraints.

### 4. `bridgeTopology` — Bridge connections

**Query**: "Show me what bridge X forwards" / "What topics are bridged?"

**Parameters**: `entityId` = bridge ID (optional — shows all bridges if omitted)

```
[Local Topics] → [Bridge] → [Remote Broker]
                            → [Remote Topics]
```

**SDK calls**:

- `getBridge({ bridgeId })` or `getBridges()` → bridge nodes
- Extract `localSubscriptions` → local topic nodes + edges
- Extract `remoteSubscriptions` → remote topic nodes + edges
- Construct remote broker node from bridge connection settings

**Layout**: Three-column: local topics → bridge → remote broker/topics. WebCola alignment constraints.

### 5. `combinerSources` — Combiner data aggregation

**Query**: "Show me how combiner X combines data" / "What feeds into this combiner?"

**Parameters**: `entityId` = combiner ID

```
[Adapter₁] → [Tag₁] ──┐
[Adapter₂] → [Tag₂] ──┤→ [Combiner] → [Output Topic]
[TopicFilter₁] ────────┘              → [Pulse Asset]
```

**SDK calls**:

- `getCombiner({ combinerId })` → combiner node
- Extract `sources` → adapter/bridge/device nodes
- Extract `mappings` → source tag/topicFilter/pulseAsset nodes + edges
- Extract destinations → output topic/asset nodes + edges

**Layout**: Fan-in pattern. Sources on left, combiner center, outputs right. WebCola with non-overlap constraints.

---

## WebCola Layout Strategy

### Why WebCola over dagre/elkjs

- **Constraint-based**: Can enforce alignment (e.g. "all adapters in the same column"), minimum spacing, flow direction, and grouping — all critical for readable domain graphs.
- **Non-overlap**: Built-in constraint to prevent node overlap, important in the constrained 400px drawer.
- **Incremental**: Can animate layout transitions when the graph updates (e.g. user expands a node to show details).
- **Stable and lightweight**: 3.4.0 is mature and stable. No active maintenance needed for a well-defined algorithm.

### Layout Configuration

```typescript
import { Layout, InputNode, InputEdge, Link } from "webcola";

interface GraphLayout {
  computeLayout(
    nodes: FlowNode[],
    edges: FlowEdge[],
    options: LayoutOptions,
  ): { nodes: PositionedNode[]; edges: FlowEdge[] };
}

interface LayoutOptions {
  direction: "LR" | "TB"; // left-to-right or top-to-bottom
  nodeSpacing: number; // minimum gap between nodes (default: 40)
  rankSpacing: number; // gap between columns/ranks (default: 100)
  containerWidth: number; // available width (drawer width minus padding)
  containerHeight: number; // available height (fixed, e.g. 300px)
  alignmentGroups?: string[][]; // groups of node IDs to align on same rank
}
```

### Layout Implementation

```typescript
// src/agent/graph/layout.ts

import { Layout } from "webcola";

export function computeGraphLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: LayoutOptions,
): PositionedGraph {
  const colaNodes: InputNode[] = nodes.map((n, i) => ({
    index: i,
    width: getNodeWidth(n.type), // varies by node type
    height: getNodeHeight(n.type),
    x: 0,
    y: 0,
  }));

  const colaEdges: Link<InputNode>[] = edges.map((e) => ({
    source: nodeIndex(e.source),
    target: nodeIndex(e.target),
    length: options.rankSpacing,
  }));

  const layout = new Layout()
    .nodes(colaNodes)
    .links(colaEdges)
    .avoidOverlaps(true)
    .flowLayout(options.direction === "LR" ? "x" : "y", options.rankSpacing)
    .jaccardLinkLengths(options.rankSpacing, 0.7)
    .start(30, 20, 10); // unconstrained, structural, all-constraints

  // Extract computed positions
  return {
    nodes: nodes.map((n, i) => ({
      ...n,
      position: { x: colaNodes[i].x, y: colaNodes[i].y },
    })),
    edges,
  };
}
```

### Alignment Constraints

For directed data flows, enforce column alignment:

```typescript
// All adapters in column 1, all tags in column 2, all topics in column 3
const constraints = [
  // Vertical alignment: all adapters share same x
  {
    type: "alignment",
    axis: "x",
    offsets: adapterIndices.map((i) => ({ node: i, offset: 0 })),
  },
  // Ordering: adapters left of tags
  ...adapterIndices.flatMap((ai) =>
    connectedTagIndices(ai).map((ti) => ({
      axis: "x",
      left: ai,
      right: ti,
      gap: rankSpacing,
    })),
  ),
];

layout.constraints(constraints);
```

---

## Component Design

### `ChatGraph` (`src/components/chat/chat-graph.tsx`)

The main graph renderer, embedded inline in chat messages.

```typescript
interface ChatGraphProps {
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  onNodeClick?: (nodeId: string, nodeType: string) => void;
}

// GraphNode as returned by queryGraph tool
interface GraphNode {
  id: string;
  type: string; // 'adapter' | 'tag' | 'topic' | 'bridge' | ...
  label: string;
  data: Record<string, unknown>;
  status?: {
    connection?: string; // 'CONNECTED' | 'DISCONNECTED' | ...
    runtime?: string; // 'STARTED' | 'STOPPED'
  };
}

interface GraphEdge {
  source: string;
  target: string;
  label?: string;
  type?: string; // 'exposes' | 'northbound' | 'southbound' | ...
}
```

**Rendering flow**:

1. Receive `{ nodes, edges }` from tool result
2. Run `computeGraphLayout()` via WebCola → get positioned nodes
3. Map to React Flow `Node[]` and `Edge[]` with custom types
4. Render `<ReactFlow>` with `fitView`, `panOnDrag`, `zoomOnScroll`
5. On node click: show tooltip or feed entity ID back to chat context

**Container**:

```tsx
<Box
  width="100%"
  height="300px"
  borderWidth="1px"
  borderRadius="md"
  overflow="hidden"
>
  <ReactFlow
    nodes={flowNodes}
    edges={flowEdges}
    nodeTypes={domainNodeTypes}
    edgeTypes={domainEdgeTypes}
    fitView
    fitViewOptions={{ padding: 0.2 }}
    panOnDrag
    zoomOnScroll
    minZoom={0.3}
    maxZoom={2}
    proOptions={{ hideAttribution: true }}
  >
    <Controls showInteractive={false} />
    <MiniMap nodeStrokeWidth={3} />
  </ReactFlow>
</Box>
```

### Custom Node Components

Each domain node type is a React component rendering inside React Flow:

```typescript
// src/components/chat/graph-nodes/adapter-node.tsx

import { Handle, Position, type NodeProps } from '@xyflow/react';

export function AdapterNode({ data }: NodeProps) {
  return (
    <Box
      bg="blue.50"
      borderWidth="2px"
      borderColor={statusColor(data.status)}
      borderRadius="md"
      px={3}
      py={2}
      minW="120px"
    >
      <HStack spacing={2}>
        <Icon as={LuPlug} color="blue.500" />
        <Text fontSize="xs" fontWeight="bold" noOfLines={1}>{data.label}</Text>
      </HStack>
      {data.status && (
        <Badge size="sm" colorScheme={statusColorScheme(data.status)}>
          {data.status.connection}
        </Badge>
      )}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </Box>
  );
}
```

Node type registry:

```typescript
// src/components/chat/graph-nodes/index.ts

export const domainNodeTypes = {
  adapter: AdapterNode,
  adapterType: AdapterTypeNode,
  tag: TagNode,
  topic: TopicNode,
  topicFilter: TopicFilterNode,
  bridge: BridgeNode,
  remoteBroker: RemoteBrokerNode,
  policy: PolicyNode,
  schema: SchemaNode,
  combiner: CombinerNode,
  pulseAsset: PulseAssetNode,
  device: DeviceNode,
  listener: ListenerNode,
};
```

---

## File Structure

```
src/
  components/
    chat/
      chat-graph.tsx                — Main React Flow container, layout orchestration
      graph-nodes/
        index.ts                    — Node type registry (domainNodeTypes)
        adapter-node.tsx
        tag-node.tsx
        topic-node.tsx
        bridge-node.tsx
        policy-node.tsx
        combiner-node.tsx
        pulse-asset-node.tsx
        device-node.tsx
        generic-node.tsx            — Fallback for unknown types
      graph-edges/
        index.ts                    — Edge type registry (domainEdgeTypes)
        data-flow-edge.tsx          — Styled edge with directional arrow + label
  agent/
    graph/
      layout.ts                     — WebCola layout computation
      layout-constraints.ts         — Scope-specific alignment/flow constraints
      graph-assembler.ts            — Builds { nodes, edges } from SDK responses
      node-dimensions.ts            — Width/height per node type (for WebCola)
    tools/
      query-graph.ts                — queryGraph tool definition + client implementation
  hooks/
    use-graph-layout.ts             — React hook wrapping WebCola computation
```

**Modified files** (from task 00006):

- `src/components/chat/message-bubble.tsx` — add `display === 'graph'` case → render `<ChatGraph>`
- `src/agent/tools/index.ts` — re-export `queryGraph`
- `server/system-prompt.ts` — add graph tool descriptions, when to use graph vs table
- `src/mocks/handlers.ts` — register graph-related fixture handlers (if additional endpoints needed)

---

## Implementation Phases

### Phase 1: Core Infrastructure

- [ ] Install `@xyflow/react`, `webcola`, `@types/webcola`
- [ ] Create `src/agent/graph/layout.ts` — WebCola wrapper with `computeGraphLayout()`
- [ ] Create `src/agent/graph/layout-constraints.ts` — scope-specific constraint builders
- [ ] Create `src/agent/graph/node-dimensions.ts` — width/height mapping per node type
- [ ] Create `src/hooks/use-graph-layout.ts` — React hook that memoizes layout computation
- [ ] Create `src/components/chat/chat-graph.tsx` — ReactFlow container with fitView, pan/zoom
- [ ] Verify: hardcoded test graph renders in a standalone page with WebCola layout

### Phase 2: Custom Node Types

- [ ] Create `src/components/chat/graph-nodes/generic-node.tsx` — fallback node
- [ ] Create domain-specific node components (adapter, tag, topic, bridge, policy, combiner, pulseAsset, device)
- [ ] Create `src/components/chat/graph-nodes/index.ts` — node type registry
- [ ] Implement status overlay (border color, accent dot, opacity)
- [ ] Create `src/components/chat/graph-edges/data-flow-edge.tsx` — styled directional edge
- [ ] Create `src/components/chat/graph-edges/index.ts` — edge type registry
- [ ] Verify: all node types render with correct styling and status indicators

### Phase 3: Graph Assembler & Query Tool

- [ ] Create `src/agent/graph/graph-assembler.ts` — functions to build graph from SDK responses
  - `assembleDataFlow()` — full system flow
  - `assembleAdapterTopology(adapterId)` — single adapter deep-dive
  - `assemblePolicyImpact(policyId)` — policy → topics → sources
  - `assembleBridgeTopology(bridgeId?)` — bridge connections
  - `assembleCombinerSources(combinerId)` — combiner fan-in
- [ ] Create `src/agent/tools/query-graph.ts` — tool definition with scope/entityId input
- [ ] Wire into tool index and chat context
- [ ] Update system prompt with graph tool guidance (when to use graph vs table)
- [ ] Verify: "Show me the data flow" → queryGraph tool → ChatGraph renders inline

### Phase 4: Interaction & Chat Integration

- [ ] Implement node click → show detail tooltip (entity summary)
- [ ] Implement node click → feed entity back to conversation ("Tell me more about adapter X")
- [ ] Add "Expand in dialog" button for full-screen graph view (escape 400px constraint)
- [ ] Add `display === 'graph'` renderer in `message-bubble.tsx` (replaces text fallback from 00006)
- [ ] Verify: click node → tooltip appears; click "inspect" → message sent to chat

### Phase 5: MSW Fixtures & Polish

- [ ] Create realistic graph fixtures for each scope (test with 5-20 nodes)
- [ ] Test layout in 400px drawer — adjust node dimensions and spacing if needed
- [ ] Test with large graphs (50+ nodes) — verify WebCola performance and readability
- [ ] Add MiniMap toggle (useful for large graphs, can be hidden for small ones)
- [ ] Run build + lint, fix all issues
- [ ] Add i18n keys for graph UI elements

---

## Interaction Design

### Node Click

```
User clicks [Adapter: OPC-UA #1] node
  → Tooltip appears: "OPC-UA #1 — CONNECTED, 5 tags, 3 northbound mappings"
  → Actions: [Inspect] [Navigate] [Close]
    → Inspect: sends "Tell me more about adapter opc-ua-1" to chat
    → Navigate: calls navigateTo('/workspace/adapters/opc-ua-1')
```

### Graph ↔ Conversation Loop

The graph is not just a static visualization — it's a conversation input:

1. User asks "Show me the data flow"
2. Agent calls `queryGraph({ scope: 'dataFlow' })` → graph renders
3. User clicks a node → message sent to chat referencing that entity
4. Agent can follow up with table details, mutations, or a narrower graph scope

This creates a **drill-down loop**: overview graph → click entity → detailed query → deeper graph → ...

### Graph ↔ Mutation

When the agent detects a graph-visible issue (e.g. adapter in ERROR state, unmapped tag):

1. Graph shows the problem node with red status
2. Agent proactively says "Adapter X is in ERROR state. Would you like me to restart it?"
3. User approves → mutation tool executes `transitionStatus({ command: 'RESTART' })`
4. Graph updates node status (re-query and re-render)

---

## Layout Tuning Parameters

| Parameter         | Default | Notes                                                      |
| ----------------- | ------- | ---------------------------------------------------------- |
| `containerWidth`  | 368px   | 400px drawer - 32px padding                                |
| `containerHeight` | 300px   | Fixed, leaves room for chat text above/below               |
| `nodeSpacing`     | 30px    | Minimum gap, reduced from typical 40 for drawer fit        |
| `rankSpacing`     | 80px    | Gap between columns (LR) or rows (TB)                      |
| `direction`       | `'LR'`  | Left-to-right for data flow; `'TB'` for hierarchical views |
| `fitView padding` | 0.15    | Slight margin so edge nodes aren't clipped                 |
| `minZoom`         | 0.3     | Allow zooming out for large graphs                         |
| `maxZoom`         | 2.0     | Prevent excessive zoom-in                                  |

### Node Dimensions (for WebCola)

| Node Type  | Width | Height | Notes                                          |
| ---------- | ----- | ------ | ---------------------------------------------- |
| `adapter`  | 140px | 50px   | Shows name + status badge                      |
| `tag`      | 100px | 36px   | Compact, just name                             |
| `topic`    | 130px | 36px   | Topic path can be long — truncate with tooltip |
| `bridge`   | 140px | 50px   | Like adapter                                   |
| `policy`   | 120px | 44px   | Hexagonal styling adds visual weight           |
| `combiner` | 100px | 44px   | Diamond shape                                  |
| `device`   | 120px | 44px   | Inferred entity                                |
| default    | 120px | 40px   | Generic fallback                               |

---

## Key Risks

| Risk                                              | Mitigation                                                                                                                                          |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| WebCola unmaintained (last release 2019)          | Stable algorithm, 44k weekly downloads, no known vulnerabilities. Pin v3.4.0. If issues arise, swap to elkjs (constraint support via layoutOptions) |
| Large graphs slow or unreadable in 400px          | Cap node count per scope (e.g. max 50). Offer "Expand in dialog" for full-screen. Use MiniMap for orientation                                       |
| Graph assembly requires many SDK calls            | Parallelize calls with `Promise.all()`. Cache graph data in chat context for re-renders without re-fetching                                         |
| Topic pattern matching (topicFilter → topics)     | Implement MQTT topic filter matching client-side (simple wildcard: `+` = single level, `#` = multi level)                                           |
| React Flow CSS conflicts with Chakra UI           | React Flow styles are scoped. Import `@xyflow/react/dist/style.css` once. Custom nodes use Chakra components                                        |
| Node types evolve as domain understanding deepens | `generic-node.tsx` fallback handles unknown types. Node registry is a simple object — easy to extend                                                |

---

## Parallelization with Task 00006

This task can run in parallel with 00006 after Phase 2 (Basic Chat UI) is complete:

| 00006 Phase             | 00007 Phase                             | Dependency                                                       |
| ----------------------- | --------------------------------------- | ---------------------------------------------------------------- |
| Phase 1: Infrastructure | —                                       | 00007 waits                                                      |
| Phase 2: Basic Chat UI  | —                                       | 00007 waits                                                      |
| Phase 3: Query Tools    | Phase 1: Core Infrastructure            | Independent — 00007 uses its own test harness                    |
| Phase 3: Query Tools    | Phase 2: Custom Node Types              | Independent                                                      |
| Phase 4: Navigation     | Phase 3: Graph Assembler & Query Tool   | Independent — tool wiring is additive                            |
| Phase 5: Mutation Tools | Phase 4: Interaction & Chat Integration | Needs `message-bubble.tsx` display dispatcher from 00006 Phase 3 |
| Phase 6: Polish         | Phase 5: MSW & Polish                   | Merge and verify together                                        |

**Integration point**: When both tasks are ready, wire `queryGraph` into the tool index and add the `display === 'graph'` case to `message-bubble.tsx`. This is a small merge step.

---

## Verification Checklist

1. `@xyflow/react` and `webcola` install without conflicts
2. WebCola produces valid node positions for a 10-node test graph
3. `ChatGraph` renders inline in chat drawer with correct dimensions
4. All 8+ custom node types render with domain-appropriate styling
5. Status overlay reflects CONNECTED/ERROR/STOPPED states
6. `queryGraph({ scope: 'adapterTopology', entityId: '...' })` returns valid graph
7. Node click shows tooltip and "Inspect" action feeds back to conversation
8. Layout is readable in 400px drawer for graphs up to 20 nodes
9. "Expand in dialog" shows full-screen graph for larger topologies
10. `pnpm build` passes
11. `pnpm lint:all` passes
