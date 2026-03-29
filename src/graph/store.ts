import createDebug from "debug";
import { create } from "zustand";
import {
  applyNodeChanges,
  applyEdgeChanges,
  type OnNodesChange,
  type OnEdgesChange,
  type Viewport,
} from "@xyflow/react";

import type {
  GraphNode,
  GraphEdge,
  ViewScope,
  LayoutDirection,
  DomainEntityType,
} from "./types";
import type { ClusterUx } from "@/hooks/use-feature-flags";
import { DEFAULT_LAYOUT_DIRECTION } from "./constants";
import { requestLayout, onResult, getLatestRequestId } from "./layout-bridge";
import { v2Ontology } from "./ontology";
import { buildSchemaGraph } from "./schema-graph";
import {
  DEFAULT_CLUSTER_CONFIG,
  analyzeClusters,
  aggregateGraph,
} from "./clustering";
import type { ClusterSet } from "./clustering";

const log = createDebug("edge:graph:store");

export type ViewMode = "instance" | "schema";

export const ANIM_DURATION = 500;

// --- Scope filter ---

/** Entity types visible for each scope (includes both v1 and v2 type keys) */
/** Entity types visible for each scope. "aggregate" is always included
 *  so clustered nodes remain visible regardless of scope. */
const SCOPE_ENTITY_TYPES: Record<ViewScope, string[] | null> = {
  full: null, // show everything
  dataFlow: [
    "adapter",
    "domainTag",
    "topicFilter",
    "dataPolicy",
    "schema",
    "script",
    "otDevice",
    "tag",
    "topic",
    "northboundMapper",
    "southboundMapper",
    "edgeBroker",
    "dataHub",
    "aggregate",
  ],
  adapterTopology: [
    "adapter",
    "domainTag",
    "topicFilter",
    "otDevice",
    "tag",
    "topic",
    "northboundMapper",
    "southboundMapper",
    "aggregate",
  ],
  policyImpact: [
    "dataPolicy",
    "behaviorPolicy",
    "schema",
    "script",
    "topicFilter",
    "topic",
    "dataHub",
    "validator",
    "fsmTransition",
    "pipelineOperation",
    "aggregate",
  ],
  bridgeTopology: [
    "bridge",
    "topicFilter",
    "remoteBroker",
    "bridgeSubscription",
    "topic",
    "aggregate",
  ],
  combinerSources: [
    "combiner",
    "adapter",
    "bridge",
    "assetMapper",
    "topic",
    "aggregate",
  ],
};

function filterByScope(
  fullNodes: GraphNode[],
  fullEdges: GraphEdge[],
  scope: ViewScope,
  focusEntityId: string | null,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const allowedTypes = SCOPE_ENTITY_TYPES[scope];

  let nodes = allowedTypes
    ? fullNodes.filter((n) => allowedTypes.includes(n.data.entityType))
    : [...fullNodes];

  // If focusing on a specific entity, keep only neighbors
  if (focusEntityId) {
    const focusNode = nodes.find((n) => n.id === focusEntityId);
    if (focusNode) {
      const neighborIds = new Set<string>([focusEntityId]);
      fullEdges.forEach((e) => {
        if (e.source === focusEntityId) neighborIds.add(e.target);
        if (e.target === focusEntityId) neighborIds.add(e.source);
      });
      // 2-hop: also include neighbors of neighbors
      const hop1 = new Set(neighborIds);
      fullEdges.forEach((e) => {
        if (hop1.has(e.source)) neighborIds.add(e.target);
        if (hop1.has(e.target)) neighborIds.add(e.source);
      });
      nodes = nodes.filter((n) => neighborIds.has(n.id));
    }
  }

  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = fullEdges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
  );

  return { nodes, edges };
}

// --- Store ---

interface GraphState {
  // Full domain graph (all entities)
  fullNodes: GraphNode[];
  fullEdges: GraphEdge[];
  isAssembled: boolean;

  // View mode
  viewMode: ViewMode;

  // Active view
  viewScope: ViewScope;
  focusEntityId: string | null;
  highlightedNodeIds: Set<string>;
  hiddenEntityTypes: Set<DomainEntityType>;

  // Derived visible graph (positioned, filtered)
  nodes: GraphNode[];
  edges: GraphEdge[];

  // Layout
  layoutDirection: LayoutDirection;
  isLayoutPending: boolean;
  animationPhase: "idle" | "enter" | "enter-settle" | "reposition";

  // Clustering
  clusteringEnabled: boolean;
  clusterUx: ClusterUx;
  expandedClusters: Set<string>;
  /** Full cluster analysis — all clusters from latest analysis, including expanded ones.
   *  Used by handle-mode UX to determine which nodes belong to which clusters. */
  latestClusters: ClusterSet;

  // Selection
  selectedNodeId: string | null;
  pendingFocusNodeId: string | null;

  // Viewport
  viewport: Viewport;

  // React Flow change handlers
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;

  // Actions
  setFullGraph: (nodes: GraphNode[], edges: GraphEdge[]) => void;
  setViewMode: (mode: ViewMode) => void;
  setViewScope: (scope: ViewScope, focusEntityId?: string | null) => void;
  setLayoutDirection: (direction: LayoutDirection) => void;
  toggleEntityType: (type: DomainEntityType) => void;
  setClusteringEnabled: (enabled: boolean) => void;
  setClusterUx: (ux: ClusterUx) => void;
  toggleCluster: (clusterId: string) => void;
  selectNode: (nodeId: string | null) => void;
  setPendingFocus: (nodeId: string) => void;
  clearPendingFocus: () => void;
  setHighlight: (nodeIds: Set<string>) => void;
  setViewport: (viewport: Viewport) => void;
  reset: () => void;
}

const initialState = {
  fullNodes: [] as GraphNode[],
  fullEdges: [] as GraphEdge[],
  isAssembled: false,
  viewMode: "instance" as ViewMode,
  viewScope: "full" as ViewScope,
  focusEntityId: null as string | null,
  highlightedNodeIds: new Set<string>(),
  hiddenEntityTypes: new Set<DomainEntityType>(),
  clusteringEnabled: false,
  clusterUx: "none" as ClusterUx,
  expandedClusters: new Set<string>(),
  latestClusters: new Map() as ClusterSet,
  nodes: [] as GraphNode[],
  edges: [] as GraphEdge[],
  layoutDirection: DEFAULT_LAYOUT_DIRECTION as LayoutDirection,
  isLayoutPending: false,
  animationPhase: "idle" as "idle" | "enter" | "enter-settle" | "reposition",
  selectedNodeId: null as string | null,
  pendingFocusNodeId: null as string | null,
  viewport: { x: 0, y: 0, zoom: 1 } as Viewport,
};

/** Apply clustering if enabled, otherwise pass through.
 *  Returns the full cluster analysis alongside the aggregated graph
 *  so that handle-mode UX can determine cluster membership at render time. */
function maybeCluster(
  nodes: GraphNode[],
  edges: GraphEdge[],
  enabled: boolean,
  expanded: Set<string>,
  ux: ClusterUx = "none",
): { nodes: GraphNode[]; edges: GraphEdge[]; latestClusters: ClusterSet } {
  const empty: ClusterSet = new Map();
  if (!enabled) return { nodes, edges, latestClusters: empty };

  // Phase 1: analyze all clusters
  const allClusters = analyzeClusters(nodes, edges, DEFAULT_CLUSTER_CONFIG);

  // Phase 2: remove expanded clusters from aggregation (they stay as individual nodes)
  const forAggregation: ClusterSet = new Map(allClusters);
  for (const id of expanded) forAggregation.delete(id);

  if (forAggregation.size === 0) {
    return { nodes, edges, latestClusters: allClusters };
  }

  const result = aggregateGraph(nodes, edges, forAggregation, ux);
  return { ...result, latestClusters: allClusters };
}

/** Set `hidden` on nodes whose entity type is in the hidden set. */
function applyHidden(
  nodes: GraphNode[],
  hidden: Set<DomainEntityType>,
): GraphNode[] {
  return nodes.map((n) => {
    const shouldHide = hidden.has(n.data.entityType);
    return n.hidden !== shouldHide ? { ...n, hidden: shouldHide } : n;
  });
}

export const useGraphStore = create<GraphState>((set, get) => ({
  ...initialState,

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) as GraphNode[] });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) as GraphEdge[] });
  },

  setViewMode: (viewMode) => {
    if (viewMode === "schema") {
      // Build schema graph from ontology (no API data)
      const { nodes: schemaNodes, edges: schemaEdges } =
        buildSchemaGraph(v2Ontology);
      set({
        viewMode,
        nodes: [],
        edges: schemaEdges,
        selectedNodeId: null,
        isLayoutPending: true,
      });
      requestLayout({
        nodes: schemaNodes,
        edges: schemaEdges,
        direction: get().layoutDirection,
        spacingScale: 2,
      });
    } else {
      // Restore instance view from full graph
      const {
        fullNodes,
        fullEdges,
        viewScope,
        focusEntityId,
        layoutDirection,
        clusteringEnabled,
        clusterUx,
        expandedClusters,
      } = get();
      const scoped = filterByScope(
        fullNodes,
        fullEdges,
        viewScope,
        focusEntityId,
      );
      const {
        nodes: filtered,
        edges,
        latestClusters,
      } = maybeCluster(
        scoped.nodes,
        scoped.edges,
        clusteringEnabled,
        expandedClusters,
        clusterUx,
      );
      set({
        viewMode,
        latestClusters,
        nodes: [],
        edges,
        selectedNodeId: null,
        isLayoutPending: true,
      });
      requestLayout({
        nodes: filtered,
        edges,
        direction: layoutDirection,
      });
    }
  },

  setFullGraph: (fullNodes, fullEdges) => {
    log("setFullGraph: %d nodes, %d edges", fullNodes.length, fullEdges.length);
    const {
      viewMode,
      viewScope,
      focusEntityId,
      layoutDirection,
      isAssembled,
      isLayoutPending,
      nodes: existingNodes,
      hiddenEntityTypes,
      clusteringEnabled,
      clusterUx,
      expandedClusters,
    } = get();

    // Always store the full graph data
    const base = { fullNodes, fullEdges, isAssembled: true };

    // If in schema view, only update stored data — don't change visible nodes
    if (viewMode === "schema") {
      set(base);
      return;
    }
    const scoped = filterByScope(
      fullNodes,
      fullEdges,
      viewScope,
      focusEntityId,
    );
    const {
      nodes: filtered,
      edges,
      latestClusters,
    } = maybeCluster(
      scoped.nodes,
      scoped.edges,
      clusteringEnabled,
      expandedClusters,
      clusterUx,
    );
    log(
      "filterByScope: %d nodes, %d edges (scope=%s, isAssembled=%s)",
      filtered.length,
      edges.length,
      viewScope,
      isAssembled,
    );

    // Subsequent assemblies: check if we can preserve all positions (fast path)
    if (isAssembled) {
      const existingPositions = new Map(
        existingNodes
          .filter((n) => n.position.x !== 0 || n.position.y !== 0)
          .map((n) => [n.id, n.position]),
      );
      const allHavePositions =
        filtered.length > 0 &&
        filtered.every((n) => existingPositions.has(n.id));

      if (allHavePositions) {
        // Fast path — no layout needed, reuse positions
        const positioned = filtered.map((n) => ({
          ...n,
          position: existingPositions.get(n.id) ?? n.position,
        }));
        set({
          ...base,
          latestClusters,
          nodes: applyHidden(positioned, hiddenEntityTypes),
          edges,
        });
        log("fast path: reused existing positions");
        return;
      }
    }

    // Skip if layout is already pending for the same node set
    if (isLayoutPending) {
      const existingIds = new Set(existingNodes.map((n) => n.id));
      if (
        filtered.length === existingIds.size &&
        filtered.every((n) => existingIds.has(n.id))
      ) {
        set(base);
        log("skipping duplicate layout (same nodes, already pending)");
        return;
      }
    }

    // Need layout — dispatch to worker
    set({
      ...base,
      latestClusters,
      edges,
      isLayoutPending: true,
    });
    requestLayout({
      nodes: filtered,
      edges,
      direction: layoutDirection,
    });
  },

  setViewScope: (viewScope, focusEntityId = null) => {
    log("setViewScope: %s (focus=%s)", viewScope, focusEntityId);
    const {
      fullNodes,
      fullEdges,
      layoutDirection,
      clusteringEnabled,
      clusterUx,
      expandedClusters,
    } = get();
    const scoped = filterByScope(
      fullNodes,
      fullEdges,
      viewScope,
      focusEntityId,
    );
    const {
      nodes: filtered,
      edges,
      latestClusters,
    } = maybeCluster(
      scoped.nodes,
      scoped.edges,
      clusteringEnabled,
      expandedClusters,
      clusterUx,
    );
    set({
      viewScope,
      focusEntityId,
      latestClusters,
      edges,
      selectedNodeId: null,
      isLayoutPending: true,
    });
    requestLayout({
      nodes: filtered,
      edges,
      direction: layoutDirection,
    });
  },

  setLayoutDirection: (layoutDirection) => {
    const {
      fullNodes,
      fullEdges,
      viewScope,
      focusEntityId,
      clusteringEnabled,
      clusterUx,
      expandedClusters,
    } = get();
    const scoped = filterByScope(
      fullNodes,
      fullEdges,
      viewScope,
      focusEntityId,
    );
    const {
      nodes: filtered,
      edges,
      latestClusters,
    } = maybeCluster(
      scoped.nodes,
      scoped.edges,
      clusteringEnabled,
      expandedClusters,
      clusterUx,
    );
    set({
      layoutDirection,
      latestClusters,
      edges,
      isLayoutPending: true,
    });
    requestLayout({
      nodes: filtered,
      edges,
      direction: layoutDirection,
    });
  },

  setClusterUx: (ux) => {
    const {
      fullNodes,
      fullEdges,
      viewScope,
      focusEntityId,
      layoutDirection,
      clusteringEnabled,
      expandedClusters,
    } = get();
    const scoped = filterByScope(
      fullNodes,
      fullEdges,
      viewScope,
      focusEntityId,
    );
    const {
      nodes: filtered,
      edges,
      latestClusters,
    } = maybeCluster(
      scoped.nodes,
      scoped.edges,
      clusteringEnabled,
      expandedClusters,
      ux,
    );
    set({
      clusterUx: ux,
      latestClusters,
      edges,
      isLayoutPending: true,
    });
    requestLayout({
      nodes: filtered,
      edges,
      direction: layoutDirection,
    });
  },

  setClusteringEnabled: (enabled) => {
    const {
      fullNodes,
      fullEdges,
      viewScope,
      focusEntityId,
      layoutDirection,
      clusterUx,
      expandedClusters,
    } = get();
    const scoped = filterByScope(
      fullNodes,
      fullEdges,
      viewScope,
      focusEntityId,
    );
    const {
      nodes: filtered,
      edges,
      latestClusters,
    } = maybeCluster(
      scoped.nodes,
      scoped.edges,
      enabled,
      expandedClusters,
      clusterUx,
    );
    set({
      clusteringEnabled: enabled,
      latestClusters,
      edges,
      isLayoutPending: true,
    });
    requestLayout({
      nodes: filtered,
      edges,
      direction: layoutDirection,
    });
  },

  toggleCluster: (clusterId) => {
    const {
      fullNodes,
      fullEdges,
      viewScope,
      focusEntityId,
      layoutDirection,
      clusteringEnabled,
      clusterUx,
      expandedClusters,
    } = get();
    const next = new Set(expandedClusters);
    if (next.has(clusterId)) next.delete(clusterId);
    else next.add(clusterId);

    const scoped = filterByScope(
      fullNodes,
      fullEdges,
      viewScope,
      focusEntityId,
    );
    const {
      nodes: filtered,
      edges,
      latestClusters,
    } = maybeCluster(
      scoped.nodes,
      scoped.edges,
      clusteringEnabled,
      next,
      clusterUx,
    );
    set({
      expandedClusters: next,
      latestClusters,
      edges,
      isLayoutPending: true,
    });
    requestLayout({
      nodes: filtered,
      edges,
      direction: layoutDirection,
    });
  },

  toggleEntityType: (type) => {
    const { hiddenEntityTypes, nodes } = get();
    const next = new Set(hiddenEntityTypes);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    set({
      hiddenEntityTypes: next,
      nodes: applyHidden(nodes, next),
    });
  },

  selectNode: (selectedNodeId) => set({ selectedNodeId }),

  setPendingFocus: (nodeId) => set({ pendingFocusNodeId: nodeId }),

  clearPendingFocus: () => set({ pendingFocusNodeId: null }),

  setHighlight: (highlightedNodeIds) => set({ highlightedNodeIds }),

  setViewport: (viewport) => set({ viewport }),

  reset: () => set(initialState),
}));

// --- Worker result callback (module-level, outside store creator) ---

onResult((result) => {
  // Drop stale results — only apply if this is the latest request
  if (result.id !== getLatestRequestId()) return;

  const { hiddenEntityTypes, nodes: currentNodes } = useGraphStore.getState();
  const finalNodes = applyHidden(result.nodes, hiddenEntityTypes);

  if (currentNodes.length === 0) {
    // Enter path: seed at origin, paint one frame, then apply final positions
    const originNodes = finalNodes.map((n) => ({
      ...n,
      position: { x: 0, y: 0 },
    }));
    useGraphStore.setState({
      nodes: originNodes,
      isLayoutPending: false,
      animationPhase: "enter",
    });
    // Double rAF ensures the browser paints the origin frame before we apply finals
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Re-check staleness after async gap
        if (result.id !== getLatestRequestId()) return;
        useGraphStore.setState({ nodes: finalNodes });
        // After nodes spread, transition to settle phase (edges fade in)
        setTimeout(() => {
          useGraphStore.setState({ animationPhase: "enter-settle" });
          setTimeout(() => {
            useGraphStore.setState({ animationPhase: "idle" });
          }, 400);
        }, ANIM_DURATION);
      });
    });
  } else {
    // Reposition path: apply final positions directly, CSS transition handles the rest
    useGraphStore.setState({
      nodes: finalNodes,
      isLayoutPending: false,
      animationPhase: "reposition",
    });
    setTimeout(() => {
      useGraphStore.setState({ animationPhase: "idle" });
    }, ANIM_DURATION + 100);
  }
});
