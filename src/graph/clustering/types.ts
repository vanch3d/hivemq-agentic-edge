import type { GraphNode, GraphEdge } from "../types";

// ── Rule identifiers ─────────────────────────────────────────────────────

export type ClusterRuleId =
  | "adapter-subtree"
  | "orphan-tags"
  | "orphan-resources"
  | "topic-filter-fan-in"
  | "topic-convergence"
  | "bridge-subtree"
  | "policy-chain";

// ── Cluster (analysis output) ────────────────────────────────────────────

export interface Cluster {
  /** Unique ID, e.g. "adapter-subtree:adapter:my-opc-ua" */
  id: string;
  /** Which rule produced this cluster */
  ruleId: ClusterRuleId;
  /** Human-readable summary, e.g. "opcua-adapter-01 (12 tags, 12 mappers)" */
  label: string;
  /** Node IDs absorbed into the aggregate (removed from graph) */
  memberNodeIds: Set<string>;
  /** The "root" node that anchors the cluster (adapter, bridge, policy).
   *  Null for orphan-tag clusters. Included in memberNodeIds. */
  anchorNodeId: string | null;
  /** Rule-specific metadata (counts, entity breakdown, etc.) */
  metadata: Record<string, unknown>;
}

export type ClusterSet = Map<string, Cluster>;

// ── Rule interface ───────────────────────────────────────────────────────

export interface ClusterRule {
  id: ClusterRuleId;
  /** Produce candidate clusters from the graph.
   *  `claimed` contains node IDs already assigned to a higher-priority cluster. */
  analyze: (
    nodes: GraphNode[],
    edges: GraphEdge[],
    config: ClusterConfig,
    claimed: Set<string>,
  ) => Cluster[];
}

// ── Configuration ────────────────────────────────────────────────────────

export interface ClusterConfig {
  adapterSubtree: { minTags: number };
  orphanTags: { enabled: boolean };
  orphanResources: { enabled: boolean };
  topicFilterFanIn: { minSources: number };
  topicConvergence: { minPublishers: number };
  bridgeSubtree: { minSubscriptions: number };
  policyChain: { minOperations: number };
}

// ── Aggregate node raw data ──────────────────────────────────────────────

export interface AggregateRaw {
  clusterId: string;
  ruleId: ClusterRuleId;
  memberCount: number;
  /** Original node IDs, for expand/collapse */
  memberNodeIds: string[];
  /** Breakdown by entity type, e.g. { tag: 12, northboundMapper: 12 } */
  entityBreakdown: Record<string, number>;
  /** Anchor node label (adapter name, policy id, etc.) */
  anchorLabel: string | null;
}
