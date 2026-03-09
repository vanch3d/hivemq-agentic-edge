/**
 * Graph clustering — public API.
 *
 * Combines analysis (which nodes cluster together) with aggregation
 * (replacing clusters with representative nodes and rewiring edges).
 */
import type { GraphNode, GraphEdge } from "../types";
import type { ClusterConfig } from "./types";
import { DEFAULT_CLUSTER_CONFIG } from "./config";
import { analyzeClusters } from "./analyze";
import { aggregateGraph } from "./aggregate";

export { DEFAULT_CLUSTER_CONFIG } from "./config";
export type { ClusterConfig, ClusterSet, Cluster, AggregateRaw } from "./types";

/**
 * Run the full clustering pipeline: analyze → aggregate.
 *
 * @param expandedClusters — cluster IDs the user has expanded (skip aggregation for these)
 */
export function clusterGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  config: ClusterConfig = DEFAULT_CLUSTER_CONFIG,
  expandedClusters: Set<string> = new Set(),
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const allClusters = analyzeClusters(nodes, edges, config);

  // Remove clusters the user has expanded — they stay as individual nodes
  for (const expandedId of expandedClusters) {
    allClusters.delete(expandedId);
  }

  if (allClusters.size === 0) return { nodes, edges };

  return aggregateGraph(nodes, edges, allClusters);
}
