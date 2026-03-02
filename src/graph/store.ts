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
import { DEFAULT_LAYOUT_DIRECTION } from "./constants";
import {
  requestLayout,
  onResult,
  getLatestRequestId,
} from "./layout-bridge";
import { v2Ontology } from "./ontology";
import { buildSchemaGraph } from "./schema-graph";

export type ViewMode = "instance" | "schema";

export const ANIM_DURATION = 500;

// --- Scope filter ---

/** Entity types visible for each scope (includes both v1 and v2 type keys) */
const SCOPE_ENTITY_TYPES: Record<ViewScope, string[] | null> = {
  full: null, // show everything
  dataFlow: [
    // v1
    "adapter", "domainTag", "topicFilter", "dataPolicy", "schema", "script",
    // v2
    "otDevice", "tag", "topic", "northboundMapper", "southboundMapper",
    "edgeBroker", "dataHub",
  ],
  adapterTopology: [
    // v1
    "adapter", "domainTag", "topicFilter",
    // v2
    "otDevice", "tag", "topic", "northboundMapper", "southboundMapper",
  ],
  policyImpact: [
    // v1
    "dataPolicy", "behaviorPolicy", "schema", "script", "topicFilter",
    // v2
    "topic", "dataHub",
  ],
  bridgeTopology: [
    // v1
    "bridge", "topicFilter",
    // v2
    "remoteBroker", "bridgeSubscription", "topic",
  ],
  combinerSources: [
    // v1
    "combiner", "adapter", "bridge",
    // v2
    "assetMapper", "topic",
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

  // Selection
  selectedNodeId: string | null;

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
  selectNode: (nodeId: string | null) => void;
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
  nodes: [] as GraphNode[],
  edges: [] as GraphEdge[],
  layoutDirection: DEFAULT_LAYOUT_DIRECTION as LayoutDirection,
  isLayoutPending: false,
  animationPhase: "idle" as "idle" | "enter" | "enter-settle" | "reposition",
  selectedNodeId: null as string | null,
  viewport: { x: 0, y: 0, zoom: 1 } as Viewport,
};

/** Set `hidden` on nodes whose entity type is in the hidden set. */
function applyHidden(
  nodes: GraphNode[],
  hidden: Set<DomainEntityType>,
): GraphNode[] {
  if (hidden.size === 0) return nodes;
  return nodes.map((n) =>
    hidden.has(n.data.entityType)
      ? { ...n, hidden: true }
      : { ...n, hidden: false },
  );
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
      } = get();
      const { nodes: filtered, edges } = filterByScope(
        fullNodes,
        fullEdges,
        viewScope,
        focusEntityId,
      );
      set({
        viewMode,
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
    console.time("[store] setFullGraph");
    console.log(
      `[store] setFullGraph called: ${fullNodes.length} nodes, ${fullEdges.length} edges`,
    );
    const {
      viewMode,
      viewScope,
      focusEntityId,
      layoutDirection,
      isAssembled,
      isLayoutPending,
      nodes: existingNodes,
      hiddenEntityTypes,
    } = get();

    // Always store the full graph data
    const base = { fullNodes, fullEdges, isAssembled: true };

    // If in schema view, only update stored data — don't change visible nodes
    if (viewMode === "schema") {
      set(base);
      console.timeEnd("[store] setFullGraph");
      return;
    }

    console.time("[store] filterByScope");
    const { nodes: filtered, edges } = filterByScope(
      fullNodes,
      fullEdges,
      viewScope,
      focusEntityId,
    );
    console.timeEnd("[store] filterByScope");
    console.log(
      `[store] after filter: ${filtered.length} nodes, ${edges.length} edges (scope=${viewScope}, isAssembled=${isAssembled})`,
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
          nodes: applyHidden(positioned, hiddenEntityTypes),
          edges,
        });
        console.timeEnd("[store] setFullGraph");
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
        console.log("[store] skipping duplicate layout (same nodes, already pending)");
        console.timeEnd("[store] setFullGraph");
        return;
      }
    }

    // Need layout — dispatch to worker
    set({
      ...base,
      edges,
      isLayoutPending: true,
    });
    requestLayout({
      nodes: filtered,
      edges,
      direction: layoutDirection,
    });
    console.timeEnd("[store] setFullGraph");
  },

  setViewScope: (viewScope, focusEntityId = null) => {
    console.time("[store] setViewScope");
    console.log("[store] setViewScope: %s (focus=%s)", viewScope, focusEntityId);
    const { fullNodes, fullEdges, layoutDirection } = get();
    const { nodes: filtered, edges } = filterByScope(
      fullNodes,
      fullEdges,
      viewScope,
      focusEntityId,
    );
    set({
      viewScope,
      focusEntityId,
      edges,
      selectedNodeId: null,
      isLayoutPending: true,
    });
    requestLayout({
      nodes: filtered,
      edges,
      direction: layoutDirection,
    });
    console.timeEnd("[store] setViewScope");
  },

  setLayoutDirection: (layoutDirection) => {
    const { fullNodes, fullEdges, viewScope, focusEntityId } = get();
    const { nodes: filtered, edges } = filterByScope(
      fullNodes,
      fullEdges,
      viewScope,
      focusEntityId,
    );
    set({
      layoutDirection,
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
