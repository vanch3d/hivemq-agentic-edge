/**
 * Aggregation phase — replaces cluster members with aggregate nodes
 * and rewires edges.
 */
import createDebug from "debug";
import type { GraphNode, GraphEdge } from "../types";
import type { ClusterSet, AggregateRaw } from "./types";
import { ENTITY_RANK } from "../constants";

const log = createDebug("edge:graph:clustering");

/**
 * Replace clustered nodes with aggregate representatives.
 *
 * 1. Remove all member nodes (including anchors).
 * 2. Create one aggregate node per cluster.
 * 3. Rewire edges: remap endpoints that point to cluster members
 *    to the aggregate node. Drop internal edges. Deduplicate.
 */
export function aggregateGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  clusters: ClusterSet,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  if (clusters.size === 0) return { nodes, edges };

  // Build nodeId → clusterId lookup
  const nodeToCluster = new Map<string, string>();
  for (const [clusterId, cluster] of clusters) {
    for (const nodeId of cluster.memberNodeIds) {
      nodeToCluster.set(nodeId, clusterId);
    }
  }

  // 1. Filter out member nodes
  const survivingNodes = nodes.filter((n) => !nodeToCluster.has(n.id));

  // 2. Create aggregate nodes
  const aggregateNodes: GraphNode[] = [];
  for (const [clusterId, cluster] of clusters) {
    // Compute entity breakdown from member node types
    const breakdown: Record<string, number> = {};
    for (const nodeId of cluster.memberNodeIds) {
      const memberNode = nodes.find((n) => n.id === nodeId);
      if (memberNode) {
        const t = memberNode.data.entityType;
        breakdown[t] = (breakdown[t] ?? 0) + 1;
      }
    }

    // Compute layoutRank as median of member ranks
    const memberRanks: number[] = [];
    for (const nodeId of cluster.memberNodeIds) {
      const memberNode = nodes.find((n) => n.id === nodeId);
      if (memberNode) {
        memberRanks.push(
          memberNode.data.layoutRank ??
            ENTITY_RANK[memberNode.data.entityType] ??
            3,
        );
      }
    }
    memberRanks.sort((a, b) => a - b);
    const medianRank = memberRanks[Math.floor(memberRanks.length / 2)] ?? 3;

    const anchorNode = cluster.anchorNodeId
      ? nodes.find((n) => n.id === cluster.anchorNodeId)
      : null;

    const raw: AggregateRaw = {
      clusterId,
      ruleId: cluster.ruleId,
      memberCount: cluster.memberNodeIds.size,
      memberNodeIds: Array.from(cluster.memberNodeIds),
      entityBreakdown: breakdown,
      anchorLabel: anchorNode?.data.label ?? null,
    };

    aggregateNodes.push({
      id: `aggregate:${clusterId}`,
      type: "aggregate",
      position: { x: 0, y: 0 },
      data: {
        entityType: "aggregate",
        label: cluster.label,
        sublabel: undefined,
        status: undefined,
        raw: raw as unknown as Record<string, unknown>,
        layoutRank: medianRank,
      },
    });
  }

  // 3. Rewire edges
  const rewiredEdges: GraphEdge[] = [];
  const edgeDedup = new Set<string>();

  for (const e of edges) {
    const sourceCluster = nodeToCluster.get(e.source);
    const targetCluster = nodeToCluster.get(e.target);

    // Internal edge: both endpoints in the same cluster → drop
    if (sourceCluster && targetCluster && sourceCluster === targetCluster) {
      continue;
    }

    // Remap endpoints
    const newSource = sourceCluster ? `aggregate:${sourceCluster}` : e.source;
    const newTarget = targetCluster ? `aggregate:${targetCluster}` : e.target;

    // Skip self-loops created by remapping
    if (newSource === newTarget) continue;

    // Deduplicate by (source, relationship, target)
    const rel = e.data?.relationship ?? "unknown";
    const dedupKey = `${newSource}|${rel}|${newTarget}`;
    if (edgeDedup.has(dedupKey)) continue;
    edgeDedup.add(dedupKey);

    rewiredEdges.push({
      ...e,
      id: `${newSource}-${rel}-${newTarget}`,
      source: newSource,
      target: newTarget,
    });
  }

  const allNodes = [...survivingNodes, ...aggregateNodes];
  log(
    "aggregated: %d clusters → %d nodes (was %d), %d edges (was %d)",
    clusters.size,
    allNodes.length,
    nodes.length,
    rewiredEdges.length,
    edges.length,
  );

  return { nodes: allNodes, edges: rewiredEdges };
}
