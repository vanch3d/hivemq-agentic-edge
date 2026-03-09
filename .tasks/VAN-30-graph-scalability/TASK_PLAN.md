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

### Phase 2: Aggregate nodes (medium architecture change)

- [ ] **2.1** Define `AggregateNode` type — represents a collapsed group of entities
  - Properties: `entityType`, `count`, `parentEntityId`, `expandable: true`
  - Renders as: icon + count badge (e.g., "247 tags")
- [ ] **2.2** Modify assembler to produce aggregate nodes when cardinality exceeds threshold
  - Per-adapter: if tags > N, emit one aggregate tag node instead of N individual tags
  - Same for NB mappers, SB mappers, topics derived from that adapter
  - Threshold configurable (default: 10)
- [ ] **2.3** Implement expand/collapse interaction
  - Click aggregate → store dispatches expansion, assembler re-runs for that scope
  - Collapse → remove children, restore aggregate node
  - Layout re-runs on expand/collapse (scoped to affected subgraph if possible)
- [ ] **2.4** Defer per-adapter API queries until expansion
  - `useQueries()` for tags/mappings enabled only for expanded adapters
  - Reduces initial data fetch for large deployments

**Expected impact**: Initial graph stays at ~50-100 nodes regardless of deployment size. User can drill into specific adapters on demand.

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

| #    | Question                              | Options                                       | Leaning                                                       |
| ---- | ------------------------------------- | --------------------------------------------- | ------------------------------------------------------------- |
| AD-1 | Where does aggregation happen?        | Assembler (data layer) vs. store (view layer) | Assembler — keeps store simple, aggregation is a data concern |
| AD-2 | How to handle expand/collapse layout? | Full re-layout vs. incremental insert         | Full re-layout initially; incremental is complex              |
| AD-3 | Replace WebCola?                      | Keep + optimize vs. switch to ELK vs. Dagre   | Keep for now, evaluate ELK in Phase 4                         |
| AD-4 | Semantic zoom scope                   | Node rendering only vs. node visibility       | Both — rendering at all zooms, visibility for extreme cases   |

## Files Likely Affected

| File                                            | Phase | Changes                                                                       |
| ----------------------------------------------- | ----- | ----------------------------------------------------------------------------- |
| `src/graph/components/graph-canvas.tsx`         | 1     | `onlyRenderVisibleElements`, zoom subscription                                |
| `src/graph/components/nodes/base-node.tsx`      | 1     | Contextual zoom detail levels, role-based shape/size                          |
| `src/graph/components/nodes/*.tsx`              | 1     | `React.memo` wrapping, shape/size adjustments                                 |
| `src/graph/constants.ts`                        | 1     | Revised color palette (role-based), node dimensions per role, zoom thresholds |
| `src/graph/graph-tokens.css`                    | 1     | New/revised color tokens for role-based palette                               |
| `src/graph/layout.ts`                           | 1     | Grid-only fallback, role-aware node dimensions                                |
| `src/graph/assembler-v2.ts`                     | 2     | Aggregate node generation                                                     |
| `src/graph/entity-derivation.ts`                | 2     | Aggregate node helpers                                                        |
| `src/graph/types.ts`                            | 2     | `AggregateNode` type                                                          |
| `src/graph/store.ts`                            | 2-3   | Expand/collapse actions, zoom-driven visibility                               |
| `src/graph/components/nodes/aggregate-node.tsx` | 2     | New component                                                                 |
| `src/graph/use-graph-data.ts`                   | 2     | Deferred per-adapter queries                                                  |
| `src/graph/constants.ts`                        | 2     | Aggregation thresholds                                                        |

---

## Future: Synthetic Stress Test

Build a mock fixture that generates a large graph (e.g., 5 adapters x 200 tags each = 3000+ nodes) to stress-test rendering, layout, and interaction performance. Useful for:

- Verifying viewport culling (`onlyRenderVisibleElements`) reduces DOM node count (quick check: `document.querySelectorAll('.react-flow__node').length` at different zoom levels)
- Benchmarking layout time (grid-only vs WebCola) at scale
- Validating contextual zoom rendering cost savings
- Testing aggregate node thresholds (Phase 2)
- Regression testing after layout engine changes (Phase 4)

Implementation: add a `stress` scope or toggle in mock handlers that multiplies tag/mapper/topic counts per adapter. Can be a dev-only feature flag.
