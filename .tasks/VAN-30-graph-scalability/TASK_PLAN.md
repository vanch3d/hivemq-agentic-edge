# VAN-30: Investigation and Plan

> See [TASK_BRIEF.md](./TASK_BRIEF.md) for objectives.

## Current System Analysis

### What we have

| Component     | Implementation                                                   | Scaling limit                                                    |
| ------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Rendering** | React Flow v12, all nodes/edges rendered at once                 | ~500 nodes before stutter                                        |
| **Layout**    | Two-phase: rank grid (O(V+E)) + WebCola (3 iterations in worker) | ~300 nodes before multi-second layout                            |
| **Data**      | TanStack Query, full graph assembled in one shot                 | API calls scale linearly with adapter count                      |
| **Filtering** | 6 scope views + entity type toggle + 2-hop focus                 | Reduces visible set but doesn't address within-scope cardinality |
| **Animation** | CSS transitions + rAF-based enter/settle phases                  | Fine at any scale (GPU-accelerated)                              |

### Where the bottleneck is

The **entity fan-out** is the core problem. The relationship structure creates multiplicative growth:

```
1 Adapter → 1 OT Device → N Tags → N NB Mappers → N Topics
                                  → N SB Mappers (if bidirectional)
```

For 5 adapters with 200 tags each:

- Rank 0-1: 5 adapters + 5 OT devices = 10 nodes
- Rank 2: 1000 tags
- Rank 3: 1000 NB mappers (+ possible SB mappers)
- Rank 4: ~1000 topics + broker + filters
- Edges: ~4000+ (feeds, publishes, exposes, manages)

The graph is **wide** at ranks 2-3 (tags, mappers) and **dense** in edges between them.

---

## Investigation Areas

### 1. React Flow Capabilities

#### 1a. `onlyRenderVisibleElements` (viewport culling)

**What**: React Flow skips rendering nodes/edges outside the viewport.
**Impact**: Reduces DOM element count from N to viewport-visible count. Significant for rendering perf.
**Limitation**: Does NOT reduce layout computation or memory. All nodes still exist in state.
**Verdict**: **Easy win.** Should enable this regardless of other strategies. One prop change.

#### 1b. Contextual Zoom (adaptive node rendering)

**What**: `useStore(s => s.transform[2])` gives current zoom level. Nodes can render differently at different zoom levels.
**Application**:

- **Zoomed out** (< 0.5): Render nodes as colored dots (no text, no handles, no sublabel). Massive render savings.
- **Medium** (0.5-1.0): Render compact nodes (label only, no sublabel, smaller).
- **Zoomed in** (> 1.0): Full node rendering (current behavior).

**Impact**: Dramatically reduces per-node render cost at overview level. The user sees the structure/shape of the graph without rendering every label.
**Limitation**: Doesn't reduce node COUNT — just render complexity per node.
**Verdict**: **High value.** Natural fit for "full picture at a glance, details on zoom."

#### 1c. Sub-Flows (collapsible groups)

**What**: Nodes with `parentId` are rendered inside a parent container. Children can be hidden/shown.
**Application**: Group tags under their adapter. The adapter node becomes an expandable container:

- **Collapsed**: Adapter node shows "opcua-adapter-01 (247 tags)" as a single node.
- **Expanded**: Click to expand → tags appear as child nodes inside the adapter's bounding box.

**Impact**: Reduces initial node count from thousands to tens (just adapters, bridges, policies, etc.). Tags/mappers/topics load on demand.
**Limitation**:

- React Flow sub-flows are rendered inside parent SVG group — layout of children is separate from parent layout.
- Expanding a group needs to re-layout the group's children AND adjust surrounding nodes.
- Not natively collapsible — we'd build the expand/collapse behavior ourselves.
  **Verdict**: **High value but high complexity.** The most architecturally significant change. Requires rethinking layout.

#### 1d. Node `hidden` property

**What**: Already used for entity type toggle. Setting `hidden: true` removes from render without removing from state.
**Application**: Can be used for progressive disclosure — initially hide high-cardinality entity types, show on demand.
**Limitation**: Hidden nodes still participate in layout unless filtered before layout.
**Verdict**: **Already in use.** Extend the pattern rather than reinvent.

### 2. Layout Algorithm Alternatives

#### 2a. Keep WebCola, optimize parameters

- Reduce iterations further (currently 3, could try 1-2 with better seeds)
- Remove rank separation constraints for large graphs (rely entirely on grid seed)
- Skip WebCola phase entirely beyond a node threshold (e.g., >500 nodes → grid-only layout)
  **Verdict**: Quick win. Grid-only layout is O(V+E) and produces acceptable results.

#### 2b. ELK (Eclipse Layout Kernel)

- **What**: Industry-standard hierarchical layout engine (used by VS Code, Theia, etc.). Available as WASM via `elkjs`.
- **Pros**: Handles thousands of nodes. Layered algorithm (Sugiyama) is ideal for DAGs. Native group/compound node support.
- **Cons**: ~200KB WASM bundle. Different API — would replace WebCola entirely.
- **Verdict**: **Strong alternative** if we need compound/group layouts. ELK natively supports parent-child node groups, which aligns perfectly with the sub-flow strategy.

#### 2c. Dagre

- **What**: Lightweight DAG layout (Sugiyama). ~30KB. Already popular with React Flow.
- **Pros**: Fast, simple API, good for hierarchical graphs.
- **Cons**: No compound node support. Less configurable than ELK. No constraint solver.
- **Verdict**: Simpler than ELK but lacks group layout. Fine for flat graphs.

#### 2d. D3-force with quadtree

- **What**: Force simulation with spatial indexing for collision detection.
- **Pros**: Already in the ecosystem (D3 is a dependency of Nivo). Good for organic layouts.
- **Cons**: Not hierarchical. Results are unpredictable for DAGs. We'd lose the rank structure.
- **Verdict**: Not suitable for our hierarchical ontology.

### 3. Domain-Aware Solutions (Bespoke)

These leverage our specific knowledge of the HiveMQ Edge domain.

#### 3a. Hierarchical collapse by entity type

The ontology has a natural hierarchy. Collapse at boundaries:

```
Level 0 (always visible): Adapters, Bridges, Edge Broker, DataHub
Level 1 (expand adapter):  + OT Device, Tags (grouped), Mappers (grouped)
Level 2 (expand tag group): + Individual tags, individual mappers
Level 3 (expand mapper):    + Topics, Topic Filters
```

Implementation: The assembler produces a **summary graph** by default (Level 0). User clicks an adapter → assembler derives that adapter's children and adds them to the graph. This is **lazy assembly** rather than lazy rendering.

**Key insight**: We already fetch per-adapter tags/mappings via `useQueries()`. We can defer these fetches until the adapter is expanded.

#### 3b. Aggregate nodes (cluster representatives)

Instead of showing 200 individual tags, show a single "Tags (200)" aggregate node connected to the adapter. The aggregate node:

- Shows count + entity type icon
- On click: navigates to a focused sub-graph of just that adapter's tags
- On double-click: expands inline (if sub-flow approach is used)

This is semantically richer than just hiding — the user sees the cardinality without the clutter.

#### 3c. Scope-aware cardinality thresholds

Configure per-scope thresholds:

- If an adapter has ≤ 10 tags: show all tags inline
- If > 10 tags: show aggregate node with count
- Focus view (2-hop from a specific entity): always expand fully

This provides automatic level-of-detail based on data size.

#### 3d. Agent-driven graph exploration

The agent already has `queryGraph` with scope/focus. Extend this:

- Agent can "expand" an aggregate node by switching to a focused scope
- Agent can suggest "this adapter has 247 tags — would you like me to show a focused view?"
- The chat graph (compact view) always uses summary graph; full page supports expansion

### 4. Alternative Visual Paradigms

#### 4a. Treemap / Icicle for cardinality overview

Use Nivo's `@nivo/treemap` or `@nivo/icicle` alongside the graph to show entity distribution:

- Rectangles sized by cardinality (adapter with 200 tags gets a big rectangle)
- Click a rectangle → focus the graph on that entity
- This gives the "full picture" without rendering 3000 nodes

#### 4b. Adjacency matrix for dense connections

When edges become unreadable (many-to-many between tags and topics), switch to a matrix view:

- Rows: source entities, Columns: target entities, Cells: relationship presence
- Nivo `@nivo/heatmap` could render this

#### 4c. Fisheye distortion

Magnify the area around the cursor, compress distant areas. React Flow supports custom transforms but this would be complex to implement. Lower priority.

#### 4d. Semantic zoom with multiple detail levels

Combine contextual zoom with domain semantics:

- **Zoom 0.1-0.3**: System overview — only orchestrators + connectors visible (5-10 nodes)
- **Zoom 0.3-0.7**: Entity groups visible — adapters, bridges, aggregate nodes for tags/mappers
- **Zoom 0.7+**: Full detail — individual tags, mappers, topics, policies

This is the most ambitious approach but delivers the best UX: zoom = level of detail.

---

## Proposed Strategy

A layered approach, combining multiple techniques. Ordered by impact/effort ratio.

### Phase 1: Quick wins (no architecture change)

- [x] **1.1** Enable `onlyRenderVisibleElements` on ReactFlow component
- [x] **1.2** Redefine entity visual vocabulary (shapes, sizes, colors by ontology role)
  - **Orchestrators** (Edge Broker, DataHub, Pulse): singletons — distinctive shape (e.g., rounded rectangle with double border or hexagon), larger, muted/neutral color. They anchor the graph but don't need to compete for attention.
  - **Connectors** (Adapter, Bridge): primary actors — robust/prominent shape, larger than average, strong saturated color. These are significant data transformation points.
  - **Integration points** (Tag, Topic, Topic Filter): high-cardinality, low-information — small shapes (small circle, pill, or dot). Tag especially has no content beyond its name, so minimal footprint. Name itself is a candidate for progressive rendering (show on hover/zoom only).
  - **Mappers** (NB, SB, Combiner, Bridge Sub): routing nodes — medium size, directional shape (arrow-like or diamond). Visually distinct from both connectors and integration points.
  - **Policies** (Data Policy, Behavior Policy): governance — distinct color family (purples already), standard rectangle.
  - **Resources** (Schema, Script): supporting — small, subtle, secondary color.
  - **Color is critical**: when nodes are rendered as dots at low zoom, color becomes the single most discriminating factor. The color palette must have maximum perceptual distance between entity roles (not just types). Consider grouping by role:
    - Connectors: blues
    - Integration points: greens/teals
    - Mappers: yellows/ambers
    - Policies: purples
    - Resources: grays
    - Orchestrators: distinct accent (cyan, slate)
- [x] **1.3** Implement contextual zoom on node components (3 detail levels)
  - **Dot** (zoom < 0.4): Colored filled shape only — shape encodes role (square, circle, pill), color encodes entity type. No text, no border, minimal handles (left+right). Sizes: orchestrator 40px, connector 32px, endpoint 28px, resource 20px, mapper 28x20px, policy 28px, artifact 20px.
  - **Compact** (zoom 0.4–0.8): Color-filled shape with white label text. No border (avoids confusion with edges), no badge/sublabel/children. Role-specific border-radius preserved.
  - **Full** (zoom > 0.8): Full rendering (current behavior with badge, status, sublabel, handles, children).
  - Thresholds defined in `src/graph/hooks/use-zoom-level.ts` (`ZOOM_COMPACT=0.4`, `ZOOM_FULL=0.8`).
  - Edge labels hidden at dot/compact levels.
  - `useZoomDetail()` hook uses `useStore` with custom equality — only re-renders when detail bucket changes, not on every zoom tick.
  - Added 1:1 zoom button in graph toolbar for testing.
- [x] **1.4** Add grid-only layout fallback when node count > threshold (`GRID_ONLY_THRESHOLD=300` in `layout.ts`)
- [x] **1.5** Memo-wrap all custom node components with `React.memo` (19 files)

**Expected impact**: Handles ~1000 nodes with acceptable performance. Visual vocabulary makes the graph legible even at overview zoom — you can see the _shape_ of the deployment (which adapters are heavy, where the data flows) without reading labels.

### Phase 1.5: Policy model ontology expansion (pre-Phase 2)

Expanded the ontology with 3 new entity types for the DataHub policy chain, which were under-represented (flat policy→resource edges instead of structured subgraphs). See `POLICY_MODEL_GAPS.md` for full analysis.

- [x] **1.5.1** Add `validator` entity — DataPolicy.validation.validators[] with strategy + schema references
- [x] **1.5.2** Add `fsmTransition` entity — BehaviorPolicy.onTransitions[] with fromState/toState and event pipelines
- [x] **1.5.3** Add `pipelineOperation` entity — PolicyOperation in onSuccess/onFailure/onEvent pipelines, wired to scripts/schemas/topics
- [x] **1.5.4** Add 6 new relationship types: `hasValidator`, `transition`, `pipelineStep`, `invokes`, `usesSchema`, `redirectsTo`
- [x] **1.5.5** Update ontology definitions (DataPolicy, BehaviorPolicy relationships now route through intermediates)
- [x] **1.5.6** Refactor assembler into separate domain-area functions for readability
- [x] **1.5.7** Register 3 new node components (PipelineOperationNode, FsmTransitionNode, ValidatorNode)

**Expected impact**: Policy subgraphs now have structured intermediate nodes, enabling meaningful progressive expand/collapse in Phase 2. Assembler is readable per-domain-area.

### Phase 2: Automatic clustering & aggregate nodes (medium architecture change)

Phase 2 combines two complementary ideas:

- **Clustering**: domain-aware rules that identify which nodes naturally group together
- **Aggregation**: replacing a cluster with a single representative node (expandable on demand)

Clustering is the _analysis_ step; aggregation is the _visual_ step. The assembler runs clustering rules first, then decides whether to emit individual nodes or aggregate representatives.

#### 2A. Clustering Rules

The ontology has natural clustering patterns. Each rule produces a **cluster**: a set of nodes that share a structural relationship and can be represented as a group.

##### Rule 1: Adapter subtree (scope-based)

The strongest cluster. Tags, NB mappers, and SB mappers are identity-scoped to their adapter. The full subtree for one adapter is:

```
Adapter → OT Device → Tag[1..N] → NB Mapper[1..N] → Topic[1..N]
                     ↑ SB Mapper[1..N] ← TopicFilter[1..N]
```

**Cluster**: All entities scoped to a single adapter form one cluster.
**Trigger**: tag count > threshold (e.g., 10).
**Aggregate node**: "opcua-adapter-01 (247 tags, 247 NB mappers)" — one node replacing the entire subtree below OT Device.
**Note**: The adapter and OT Device nodes remain visible (they're low-cardinality). Only ranks 2-3 (tags + mappers) collapse.

##### Rule 2: Orphan tags (connectivity-based)

Tags with no outgoing mapper edges are "orphan" — they expose data but nothing consumes it. This is common for adapters with many tags where only a subset is mapped. Orphans are structurally uninteresting in the data flow view.

**Cluster**: Tags of a given adapter that have zero outgoing `feeds` edges.
**Trigger**: orphan count > 0 (always cluster orphans separately from mapped tags).
**Aggregate node**: "5 unmapped tags" — visually distinct (dimmed/dashed) to signal incomplete configuration.
**Insight**: This separates the "active data path" (mapped tags) from the "available but unused" tags, which is a meaningful domain distinction.

##### Rule 3: Topic filter fan-in (match-based)

Multiple tags may feed NB mappers that publish to topics matching the same topic filter. From the topic filter's perspective, this is a fan-in cluster: N tags → N mappers → N topics → 1 filter.

**Cluster**: All tags whose NB mapper's destination topic matches a given topic filter (via MQTT wildcard).
**Trigger**: matched tag count > threshold.
**Aggregate node**: "factory/# matches 42 topics" — attached to the topic filter node.
**Note**: This is a cross-adapter cluster — tags from different adapters may match the same filter. It's particularly useful in the policy impact scope, where you want to see "which data does this policy affect?"

##### Rule 4: Topic convergence (destination-based)

Multiple mappers may publish to the same topic (e.g., multiple adapters mapping different tags to `factory/line1/combined`). From the topic's perspective, this is a fan-in.

**Cluster**: All mappers (NB, combiner, bridge sub) that publish to the same topic.
**Trigger**: publisher count > threshold.
**Aggregate node**: "3 sources → factory/line1/combined" — replaces the individual mapper→topic edges with a single aggregate→topic edge.

##### Rule 5: Bridge subtree (scope-based)

Mirrors Rule 1 for bridges. Each bridge owns subscriptions (local + remote), each subscription references a topic filter and a destination topic.

**Cluster**: All bridge subscriptions + their referenced filters/topics for a single bridge.
**Trigger**: subscription count > threshold.
**Aggregate node**: "mqtt-bridge-01 (4 local, 2 remote subs)".

##### Rule 6: Policy chain (attachment-based)

A data policy attaches to a topic filter and references schemas + scripts. The entire policy→filter→schemas→scripts subgraph is a natural cluster.

**Cluster**: DataPolicy + its attached TopicFilter + validated Schemas + executed Scripts.
**Trigger**: Always cluster (policies are few but their resource edges create visual noise).
**Aggregate node**: Not aggregated by default (policies are low-cardinality), but the cluster membership is used for focus/highlight interactions.

##### Rule 7: Orphan resources (connectivity-based)

Schemas and scripts that are only connected to the DataHub orchestrator (via `owns`) and have no incoming policy edges (`validates`, `serializes`, `invokes`, `deserializes`) are unused. Common in live systems with many pre-loaded schemas.

**Cluster**: Schemas (or scripts) with zero active policy references, grouped by type.
**Trigger**: >1 orphan of the same type (always cluster).
**Aggregate node**: "N unused schemas" / "N unused scripts" — visually distinct, dashed border.

##### Rule priority and overlap

Clusters can overlap (a tag may be orphan AND part of an adapter subtree). Resolution:

1. **Orphan tags wins first** — orphan tags are separated into their own cluster.
2. **Orphan resources next** — unused schemas/scripts clustered before policy chains claim them.
3. **Adapter subtree applies to remaining (mapped) tags** — the "active" tags cluster.
4. **Topic filter fan-in is orthogonal** — it groups across adapters, used primarily in policy/filter-focused views.
5. **Policy chain runs last** — only claims resources with active policy references.
6. **First-claim wins** — rules run in fixed priority order; once a node is claimed, subsequent rules skip it.

#### 2B. Aggregate Node Implementation

- [x] **2.1** Define clustering rule engine (`src/graph/clustering/`)
  - `analyze.ts`: runs 7 rules in priority order, first-claim wins
  - `graph-index.ts`: lightweight adjacency index shared by all rules
  - `aggregate.ts`: replaces cluster members with aggregate nodes, rewires + deduplicates edges
  - `index.ts`: public `clusterGraph()` API combining analyze + aggregate
  - 7 rules in `rules/`: orphan-tags, orphan-resources, adapter-subtree, topic-filter-fan-in, topic-convergence, bridge-subtree, policy-chain
- [x] **2.2** Define `AggregateNode` type and component
  - `"aggregate"` entity type registered in all constant maps (icons, colors, dimensions, ranks)
  - `AggregateNode` component with 3 zoom levels (dot/compact/full), dashed yellow border, entity breakdown badges
  - `AggregateRaw` data shape: clusterId, ruleId, memberCount, memberNodeIds, entityBreakdown, anchorLabel
- [x] **2.3** Integrate clustering into store pipeline
  - `maybeCluster()` injected between `filterByScope` and `requestLayout` in all store paths
  - `clusteringEnabled` + `expandedClusters` state in store
  - `setClusteringEnabled()` and `toggleCluster()` actions
  - Feature flag `graphClustering` (default: false) in settings UI + `use-feature-flags.ts`
  - Flag synced from hook → store via `useGraphData`
- [x] **2.4** Implement expand/collapse interaction (two UX approaches behind feature flag)
  - Feature flag `clusterUx: "none" | "anchor" | "handle"` in settings + `use-feature-flags.ts`
  - **A+C (anchor mode)**: Anchor nodes preserved alongside aggregate, anchor gets `_anchorCluster` metadata with expand/collapse button, controls panel in toolbar shows all active clusters
  - **D (handle mode)**: Neighboring nodes get `_handleClusters` metadata with connected cluster IDs, collapse icon on nodes connected to aggregates
  - Both modes: Aggregate node has expand button at full zoom level
  - `aggregate.ts` supports all three modes: "none" (original behavior), "anchor" (preserves anchors, creates anchor→aggregate edges), "handle" (injects neighbor metadata)
  - `clusterUx` state synced through store → clustering pipeline → aggregate function
- [ ] **2.5** Defer per-adapter API queries until expansion
  - `useQueries()` for tags/mappings enabled only for expanded adapters
  - Reduces initial data fetch for large deployments
- [ ] **2.6** Scope-aware clustering
  - `dataFlow` scope: Rules 1-4, 7 active (adapter subtrees, orphans, topic convergence, orphan resources)
  - `adapterTopology` scope: Rule 1-2 only (adapter-centric)
  - `policyImpact` scope: Rules 3, 6-7 active (topic filter fan-in, policy chains, orphan resources)
  - `bridgeTopology` scope: Rule 5 active
  - `full` scope: All rules

**Expected impact**: Initial graph stays at ~50-100 nodes regardless of deployment size. Clustering rules make aggregation semantically meaningful — not just "too many nodes" but "these nodes form a coherent group." User can drill into specific clusters on demand.

### Phase 3: Semantic zoom (larger architecture change)

- [ ] **3.1** Define zoom-level-to-visibility mapping
  - Zoom < 0.3: only orchestrators + connectors
  - Zoom 0.3-0.7: + aggregate nodes
  - Zoom > 0.7: + expanded entities (if expanded)
- [ ] **3.2** Wire zoom level to node visibility in store
  - `useStore(zoomSelector)` in graph canvas
  - Update `hidden` flags based on zoom + expansion state
- [ ] **3.3** Adjust layout to respect visibility groups
  - Only layout visible nodes
  - Reserve space for collapsed groups

**Expected impact**: Smooth zoom-driven exploration from overview to detail. The "full picture" is the zoomed-out view; details emerge as you zoom in.

### Phase 4: Layout engine upgrade (optional, if WebCola remains a bottleneck)

- [ ] **4.1** Evaluate ELK (elkjs) with compound node support
- [ ] **4.2** Prototype ELK layout with same graph data
- [ ] **4.3** If viable: replace WebCola with ELK, leveraging native group layout for aggregate nodes

### Phase 5: Alternative visualizations (optional, exploratory)

- [ ] **5.1** Prototype treemap overview using `@nivo/treemap` for cardinality visualization
- [ ] **5.2** Prototype matrix view for dense many-to-many relationships

---

## Key Architectural Decisions (pending)

| #    | Question                              | Options                                          | Leaning                                                                 |
| ---- | ------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| AD-1 | Where does aggregation happen?        | Assembler (data layer) vs. store (view layer)    | Assembler — clustering is a data concern, post-assembly pass            |
| AD-2 | How to handle expand/collapse layout? | Full re-layout vs. incremental insert            | Full re-layout initially; incremental is complex                        |
| AD-3 | Replace WebCola?                      | Keep + optimize vs. switch to ELK vs. Dagre      | Keep for now, evaluate ELK in Phase 4                                   |
| AD-4 | Semantic zoom scope                   | Node rendering only vs. node visibility          | Both — rendering at all zooms, visibility for extreme cases             |
| AD-5 | Cluster overlap resolution            | Exclusive partition vs. multi-membership         | Multi-membership — clusters serve different purposes per scope          |
| AD-6 | Clustering scope                      | Global rules vs. scope-aware rules               | Scope-aware — different view scopes activate different clustering rules |
| AD-7 | Aggregate implementation              | Replacement nodes vs. React Flow groups/subflows | **Replacement nodes** — see rationale below                             |

### AD-7: Replacement nodes vs. React Flow groups/subflows

React Flow natively supports compound nodes via `parentId` + `type: "group"`. Children render inside the parent, positions are relative, and expand/collapse becomes show/hide + resize. This is architecturally cleaner for progressive disclosure.

However, **our layout engine (rank grid + WebCola) has no compound node support**. Groups require:

1. Sub-layout of children within parent bounds
2. Parent auto-sizing to contain children
3. Surrounding node adjustment on expand/collapse

Neither the rank grid nor WebCola handles these. ELK does (native compound node support), Dagre does not.

**Current decision**: Use replacement nodes (cluster members removed, single aggregate node inserted, edges rewired). This works with the existing layout and delivers the clustering UX behind a feature flag.

**Revisit trigger**: If/when we switch to ELK (Phase 4) or another layout engine with compound node support, migrate aggregates to React Flow groups/subflows. The clustering analysis (`src/graph/clustering/analyze.ts`) and rules are layout-agnostic — only the aggregation step (`aggregate.ts`) and the store integration would change.

## Files Likely Affected

| File                                            | Phase | Changes                                                                       |
| ----------------------------------------------- | ----- | ----------------------------------------------------------------------------- |
| `src/graph/components/graph-canvas.tsx`         | 1     | `onlyRenderVisibleElements`, zoom subscription                                |
| `src/graph/components/nodes/base-node.tsx`      | 1     | Contextual zoom detail levels, role-based shape/size                          |
| `src/graph/components/nodes/*.tsx`              | 1     | `React.memo` wrapping, shape/size adjustments                                 |
| `src/graph/constants.ts`                        | 1     | Revised color palette (role-based), node dimensions per role, zoom thresholds |
| `src/graph/graph-tokens.css`                    | 1     | New/revised color tokens for role-based palette                               |
| `src/graph/layout.ts`                           | 1     | Grid-only fallback, role-aware node dimensions                                |
| `src/graph/clustering.ts`                       | 2     | New: clustering rule engine (post-assembly pass)                              |
| `src/graph/assembler-v2.ts`                     | 2     | Invoke clustering, emit aggregate nodes, rewire edges                         |
| `src/graph/entity-derivation.ts`                | 2     | Aggregate node helpers                                                        |
| `src/graph/types.ts`                            | 2     | `ClusterSet`, `AggregateNode` types                                           |
| `src/graph/store.ts`                            | 2-3   | Expand/collapse actions, zoom-driven visibility                               |
| `src/graph/components/nodes/aggregate-node.tsx` | 2     | New component (role-colored, rule-styled)                                     |
| `src/graph/use-graph-data.ts`                   | 2     | Deferred per-adapter queries                                                  |
| `src/graph/constants.ts`                        | 2     | Clustering thresholds, per-scope rule activation                              |

---

## Future: Synthetic Stress Test

Build a mock fixture that generates a large graph (e.g., 5 adapters x 200 tags each = 3000+ nodes) to stress-test rendering, layout, and interaction performance. Useful for:

- Verifying viewport culling (`onlyRenderVisibleElements`) reduces DOM node count (quick check: `document.querySelectorAll('.react-flow__node').length` at different zoom levels)
- Benchmarking layout time (grid-only vs WebCola) at scale
- Validating contextual zoom rendering cost savings
- Testing aggregate node thresholds (Phase 2)
- Regression testing after layout engine changes (Phase 4)

Implementation: add a `stress` scope or toggle in mock handlers that multiplies tag/mapper/topic counts per adapter. Can be a dev-only feature flag.
