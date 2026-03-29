/**
 * Aggregation phase — replaces cluster members with aggregate nodes
 * and rewires edges.
 */
import createDebug from "debug";
import type { GraphNode, GraphEdge } from "../types";
import type { ClusterSet, AggregateRaw, AnchorClusterInfo } from "./types";
import type { ClusterUx } from "@/hooks/use-feature-flags";
import { ENTITY_RANK } from "../constants";

const log = createDebug("edge:graph:clustering");

/**
 * Replace clustered nodes with aggregate representatives.
 *
 * 1. Remove all member nodes (including anchors, unless UX mode preserves them).
 * 2. Create one aggregate node per cluster.
 * 3. Rewire edges: remap endpoints that point to cluster members
 *    to the aggregate node. Drop internal edges. Deduplicate.
 * 4. (anchor mode) Preserve anchor nodes and inject cluster metadata.
 * 5. (handle mode) Inject cluster connection info into neighboring nodes.
 */
export function aggregateGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  clusters: ClusterSet,
  ux: ClusterUx = "none",
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  if (clusters.size === 0) return { nodes, edges };

  // Build nodeId → clusterId lookup
  const nodeToCluster = new Map<string, string>();
  // In "anchor" mode, anchor nodes are NOT consumed — track them separately
  const preservedAnchors = new Set<string>();

  for (const [clusterId, cluster] of clusters) {
    for (const nodeId of cluster.memberNodeIds) {
      if (ux === "anchor" && nodeId === cluster.anchorNodeId) {
        preservedAnchors.add(nodeId);
        continue; // don't mark anchor as consumed
      }
      nodeToCluster.set(nodeId, clusterId);
    }
  }

  // 1. Filter out member nodes (anchors survive in "anchor" mode)
  const survivingNodes = nodes.filter((n) => !nodeToCluster.has(n.id));

  // 2. Create aggregate nodes
  const aggregateNodes: GraphNode[] = [];
  for (const [clusterId, cluster] of clusters) {
    // Compute entity breakdown from member node types
    const breakdown: Record<string, number> = {};
    for (const nodeId of cluster.memberNodeIds) {
      // In anchor mode, skip the anchor itself from breakdown
      if (ux === "anchor" && nodeId === cluster.anchorNodeId) continue;
      const memberNode = nodes.find((n) => n.id === nodeId);
      if (memberNode) {
        const t = memberNode.data.entityType;
        breakdown[t] = (breakdown[t] ?? 0) + 1;
      }
    }

    // Compute layoutRank as median of member ranks
    const memberRanks: number[] = [];
    for (const nodeId of cluster.memberNodeIds) {
      if (ux === "anchor" && nodeId === cluster.anchorNodeId) continue;
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

    const memberCount =
      ux === "anchor" && cluster.anchorNodeId
        ? cluster.memberNodeIds.size - 1
        : cluster.memberNodeIds.size;

    const raw: AggregateRaw = {
      clusterId,
      ruleId: cluster.ruleId,
      memberCount,
      memberNodeIds: Array.from(cluster.memberNodeIds).filter(
        (id) => !(ux === "anchor" && id === cluster.anchorNodeId),
      ),
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

    // (anchor mode) Inject cluster metadata into preserved anchor node
    if (ux === "anchor" && anchorNode) {
      const anchorInfo: AnchorClusterInfo = {
        anchorClusterId: clusterId,
        memberCount,
        entityBreakdown: breakdown,
      };
      const idx = survivingNodes.findIndex(
        (n) => n.id === cluster.anchorNodeId,
      );
      if (idx !== -1) {
        survivingNodes[idx] = {
          ...survivingNodes[idx],
          data: {
            ...survivingNodes[idx].data,
            raw: {
              ...survivingNodes[idx].data.raw,
              _anchorCluster: anchorInfo as unknown as Record<string, unknown>,
            },
          },
        };
      }
    }
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

  // (anchor mode) Create edges from preserved anchors to their aggregate nodes
  if (ux === "anchor") {
    for (const [clusterId, cluster] of clusters) {
      if (cluster.anchorNodeId && preservedAnchors.has(cluster.anchorNodeId)) {
        const edgeId = `${cluster.anchorNodeId}-clusters-aggregate:${clusterId}`;
        rewiredEdges.push({
          id: edgeId,
          source: cluster.anchorNodeId,
          target: `aggregate:${clusterId}`,
          data: { relationship: "clusters" },
        });
      }
    }
  }

  const allNodes = [...survivingNodes, ...aggregateNodes];

  log(
    "aggregated (%s): %d clusters → %d nodes (was %d), %d edges (was %d)",
    ux,
    clusters.size,
    allNodes.length,
    nodes.length,
    rewiredEdges.length,
    edges.length,
  );

  return { nodes: allNodes, edges: rewiredEdges };
}
