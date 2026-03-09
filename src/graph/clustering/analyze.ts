/**
 * Clustering analysis phase.
 *
 * Runs all rules in priority order, accumulating claimed node IDs
 * so higher-priority rules take precedence for overlapping nodes.
 */
import createDebug from "debug";
import type { GraphNode, GraphEdge } from "../types";
import type { ClusterConfig, ClusterSet } from "./types";
import { buildGraphIndex } from "./graph-index";
import {
  orphanTagsRule,
  orphanResourcesRule,
  adapterSubtreeRule,
  topicFilterFanInRule,
  topicConvergenceRule,
  bridgeSubtreeRule,
  policyChainRule,
} from "./rules";

const log = createDebug("edge:graph:clustering");

/**
 * Analyze the graph and produce a set of clusters.
 * Rules run in fixed priority order; first-claim wins.
 */
export function analyzeClusters(
  nodes: GraphNode[],
  edges: GraphEdge[],
  config: ClusterConfig,
): ClusterSet {
  const idx = buildGraphIndex(nodes, edges);
  const claimed = new Set<string>();
  const clusters: ClusterSet = new Map();

  // Rules in priority order (first wins for overlapping nodes)
  const rules = [
    orphanTagsRule(idx),
    orphanResourcesRule(idx),
    adapterSubtreeRule(idx),
    topicFilterFanInRule(idx),
    topicConvergenceRule(idx),
    bridgeSubtreeRule(idx),
    policyChainRule(idx),
  ];

  for (const rule of rules) {
    const found = rule.analyze(nodes, edges, config, claimed);
    for (const cluster of found) {
      clusters.set(cluster.id, cluster);
      // Mark all members as claimed
      for (const nodeId of cluster.memberNodeIds) {
        claimed.add(nodeId);
      }
    }
    if (found.length > 0) {
      log("rule %s: %d clusters", rule.id, found.length);
    }
  }

  log("total: %d clusters, %d claimed nodes", clusters.size, claimed.size);
  return clusters;
}
