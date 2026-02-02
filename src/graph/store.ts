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
import { computeLayout } from "./layout";

// --- Scope filter ---

/** Entity types visible for each scope */
const SCOPE_ENTITY_TYPES: Record<ViewScope, string[] | null> = {
  full: null, // show everything
  dataFlow: [
    "adapter",
    "domainTag",
    "topicFilter",
    "dataPolicy",
    "schema",
    "script",
  ],
  adapterTopology: ["adapter", "domainTag", "topicFilter"],
  policyImpact: [
    "dataPolicy",
    "behaviorPolicy",
    "schema",
    "script",
    "topicFilter",
  ],
  bridgeTopology: ["bridge", "topicFilter"],
  combinerSources: ["combiner", "adapter", "bridge"],
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

  // Selection
  selectedNodeId: string | null;

  // Viewport
  viewport: Viewport;

  // React Flow change handlers
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;

  // Actions
  setFullGraph: (nodes: GraphNode[], edges: GraphEdge[]) => void;
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
  viewScope: "full" as ViewScope,
  focusEntityId: null as string | null,
  highlightedNodeIds: new Set<string>(),
  hiddenEntityTypes: new Set<DomainEntityType>(),
  nodes: [] as GraphNode[],
  edges: [] as GraphEdge[],
  layoutDirection: DEFAULT_LAYOUT_DIRECTION as LayoutDirection,
  selectedNodeId: null as string | null,
  viewport: { x: 0, y: 0, zoom: 1 } as Viewport,
};

/**
 * Run layout, but preserve positions for nodes that already have them
 * (e.g. user-dragged positions). Only compute positions for new nodes.
 */
function layoutWithPreservedPositions(
  filtered: GraphNode[],
  edges: GraphEdge[],
  direction: LayoutDirection,
  existingNodes: GraphNode[],
): GraphNode[] {
  const existingPositions = new Map(
    existingNodes
      .filter((n) => n.position.x !== 0 || n.position.y !== 0)
      .map((n) => [n.id, n.position]),
  );

  // If all nodes already have positions, just reuse them
  const allHavePositions = filtered.every((n) => existingPositions.has(n.id));
  if (allHavePositions && filtered.length > 0) {
    return filtered.map((n) => ({
      ...n,
      position: existingPositions.get(n.id) ?? n.position,
    }));
  }

  // Some new nodes — run full layout
  const laid = computeLayout(filtered, edges, direction);
  // Restore user-moved positions for existing nodes
  return laid.map((n) => {
    const existing = existingPositions.get(n.id);
    return existing ? { ...n, position: existing } : n;
  });
}

/**
 * Full layout (no position preservation). Used for scope/direction changes.
 */
function fullLayout(
  fullNodes: GraphNode[],
  fullEdges: GraphEdge[],
  scope: ViewScope,
  focusEntityId: string | null,
  direction: LayoutDirection,
) {
  const { nodes: filtered, edges } = filterByScope(
    fullNodes,
    fullEdges,
    scope,
    focusEntityId,
  );
  const nodes = computeLayout(filtered, edges, direction);
  return { nodes, edges };
}

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

  setFullGraph: (fullNodes, fullEdges) => {
    const {
      viewScope,
      focusEntityId,
      layoutDirection,
      isAssembled,
      nodes,
      hiddenEntityTypes,
    } = get();
    const { nodes: filtered, edges } = filterByScope(
      fullNodes,
      fullEdges,
      viewScope,
      focusEntityId,
    );

    // First assembly: full layout. Subsequent: preserve positions.
    const positioned = isAssembled
      ? layoutWithPreservedPositions(filtered, edges, layoutDirection, nodes)
      : computeLayout(filtered, edges, layoutDirection);

    set({
      fullNodes,
      fullEdges,
      isAssembled: true,
      nodes: applyHidden(positioned, hiddenEntityTypes),
      edges,
    });
  },

  setViewScope: (viewScope, focusEntityId = null) => {
    const { fullNodes, fullEdges, layoutDirection, hiddenEntityTypes } = get();
    const { nodes, edges } = fullLayout(
      fullNodes,
      fullEdges,
      viewScope,
      focusEntityId,
      layoutDirection,
    );
    set({
      viewScope,
      focusEntityId,
      nodes: applyHidden(nodes, hiddenEntityTypes),
      edges,
      selectedNodeId: null,
    });
  },

  setLayoutDirection: (layoutDirection) => {
    const {
      fullNodes,
      fullEdges,
      viewScope,
      focusEntityId,
      hiddenEntityTypes,
    } = get();
    const { nodes, edges } = fullLayout(
      fullNodes,
      fullEdges,
      viewScope,
      focusEntityId,
      layoutDirection,
    );
    set({
      layoutDirection,
      nodes: applyHidden(nodes, hiddenEntityTypes),
      edges,
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
