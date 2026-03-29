/**
 * Graph clustering — public API.
 *
 * Combines analysis (which nodes cluster together) with aggregation
 * (replacing clusters with representative nodes and rewiring edges).
 */
export { DEFAULT_CLUSTER_CONFIG } from "./config";
export { analyzeClusters } from "./analyze";
export { aggregateGraph } from "./aggregate";
export type {
  ClusterConfig,
  ClusterSet,
  Cluster,
  AggregateRaw,
  AnchorClusterInfo,
} from "./types";
