import type { Node, Edge, Viewport } from "@xyflow/react";

// --- Domain entity types ---

export const ENTITY_TYPES = [
  // v1 entity types
  "adapter",
  "bridge",
  "domainTag",
  "topicFilter",
  "dataPolicy",
  "behaviorPolicy",
  "schema",
  "script",
  "combiner",
  "listener",
  // v2-only entity types (ontology v2)
  "edgeBroker",
  "dataHub",
  "pulse",
  "remoteBroker",
  "otDevice",
  "tag",
  "topic",
  "northboundMapper",
  "southboundMapper",
  "assetMapper",
  "bridgeSubscription",
  // v2 policy internals
  "pipelineOperation",
  "fsmTransition",
  "validator",
  // clustering
  "aggregate",
] as const;

export type DomainEntityType = (typeof ENTITY_TYPES)[number];

// --- Status ---

export type ConnectionStatus =
  | "CONNECTED"
  | "DISCONNECTED"
  | "STATELESS"
  | "UNKNOWN"
  | "ERROR";

export type RuntimeStatus = "STARTED" | "STOPPED";

export type StatusOverlay = {
  connection?: ConnectionStatus;
  runtime?: RuntimeStatus;
};

// --- Graph node/edge data ---

export type GraphNodeData = {
  entityType: DomainEntityType;
  label: string;
  sublabel?: string;
  status?: StatusOverlay;
  raw: Record<string, unknown>;
  /** Per-node rank override for layout. When set, takes precedence over ENTITY_RANK[entityType]. */
  layoutRank?: number;
};

export type GraphEdgeData = {
  relationship: string;
  animated?: boolean;
};

// --- React Flow typed aliases ---

export type GraphNode = Node<GraphNodeData>;
export type GraphEdge = Edge<GraphEdgeData>;

// --- View scopes ---

export const VIEW_SCOPES = [
  "full",
  "dataFlow",
  "adapterTopology",
  "policyImpact",
  "bridgeTopology",
  "combinerSources",
] as const;

export type ViewScope = (typeof VIEW_SCOPES)[number];

// --- Layout ---

export type LayoutDirection = "TB" | "LR";

// --- Store state shape (for reference) ---

export type { Viewport };
