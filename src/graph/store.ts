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
import { v2Ontology } from "./ontology";
import { buildSchemaGraph } from "./schema-graph";

export type ViewMode = "instance" | "schema";

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
  spacingScale = 1,
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
  const laid = computeLayout(filtered, edges, direction, spacingScale);
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
  spacingScale = 1,
) {
  const { nodes: filtered, edges } = filterByScope(
    fullNodes,
    fullEdges,
    scope,
    focusEntityId,
  );
  const nodes = computeLayout(filtered, edges, direction, spacingScale);
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

  setViewMode: (viewMode) => {
    if (viewMode === "schema") {
      // Build schema graph from ontology (no API data)
      const { nodes: schemaNodes, edges: schemaEdges } =
        buildSchemaGraph(v2Ontology);
      const positioned = computeLayout(
        schemaNodes,
        schemaEdges,
        get().layoutDirection,
        2, // wider spacing for the schema graph (few nodes, low connectivity)
      );
      set({
        viewMode,
        nodes: positioned,
        edges: schemaEdges,
        selectedNodeId: null,
      });
    } else {
      // Restore instance view from full graph
      const {
        fullNodes,
        fullEdges,
        viewScope,
        focusEntityId,
        layoutDirection,
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
        viewMode,
        nodes: applyHidden(nodes, hiddenEntityTypes),
        edges,
        selectedNodeId: null,
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
      nodes,
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

    // First assembly: full layout. Subsequent: preserve positions.
    console.time("[store] layout");
    const positioned = isAssembled
      ? layoutWithPreservedPositions(filtered, edges, layoutDirection, nodes)
      : computeLayout(filtered, edges, layoutDirection);
    console.timeEnd("[store] layout");

    set({
      ...base,
      nodes: applyHidden(positioned, hiddenEntityTypes),
      edges,
    });
    console.timeEnd("[store] setFullGraph");
  },

  setViewScope: (viewScope, focusEntityId = null) => {
    console.time("[store] setViewScope");
    console.log("[store] setViewScope: %s (focus=%s)", viewScope, focusEntityId);
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
    console.timeEnd("[store] setViewScope");
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
