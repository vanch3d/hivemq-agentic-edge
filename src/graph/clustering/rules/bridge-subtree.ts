/**
 * Rule 5: Bridge subtree clustering.
 *
 * Groups bridge subscriptions + their referenced topic filters and topics
 * under the parent bridge when subscription count exceeds threshold.
 */
import type { ClusterRule, Cluster, ClusterConfig } from "../types";
import type { GraphIndex } from "../graph-index";
import { REL } from "../../relationships";

export function bridgeSubtreeRule(idx: GraphIndex): ClusterRule {
  return {
    id: "bridge-subtree",
    analyze: (_nodes, _edges, config: ClusterConfig, claimed) => {
      const clusters: Cluster[] = [];
      const bridgeIds = idx.byType.get("bridge") ?? [];

      for (const bridgeId of bridgeIds) {
        if (claimed.has(bridgeId)) continue;

        const members = new Set<string>();
        let subCount = 0;

        // bridge → owns → bridgeSubscription
        const ownsEdges = (idx.outgoing.get(bridgeId) ?? []).filter(
          (e) => e.data?.relationship === REL.owns,
        );

        for (const e of ownsEdges) {
          const targetNode = idx.nodeById.get(e.target);
          if (targetNode?.data.entityType !== "bridgeSubscription") continue;
          if (claimed.has(e.target)) continue;

          members.add(e.target);
          subCount++;

          // bridgeSubscription → filters → topicFilter
          const filterEdges = (idx.outgoing.get(e.target) ?? []).filter(
            (e2) => e2.data?.relationship === REL.filters,
          );
          for (const fe of filterEdges) {
            if (!claimed.has(fe.target)) members.add(fe.target);
          }

          // bridgeSubscription → delivers → topic
          const deliverEdges = (idx.outgoing.get(e.target) ?? []).filter(
            (e2) => e2.data?.relationship === REL.delivers,
          );
          for (const de of deliverEdges) {
            if (!claimed.has(de.target)) members.add(de.target);
          }
        }

        if (subCount < config.bridgeSubtree.minSubscriptions) continue;

        // Include bridge + remoteBroker in cluster
        members.add(bridgeId);
        const connectsEdges = (idx.outgoing.get(bridgeId) ?? []).filter(
          (e) => e.data?.relationship === REL.connectsTo,
        );
        for (const e of connectsEdges) {
          if (!claimed.has(e.target)) members.add(e.target);
        }

        const bridgeNode = idx.nodeById.get(bridgeId);
        const bridgeLabel = bridgeNode?.data.label ?? bridgeId;

        clusters.push({
          id: `bridge-subtree:${bridgeId}`,
          ruleId: "bridge-subtree",
          label: `${bridgeLabel} (${subCount} subscriptions)`,
          memberNodeIds: members,
          anchorNodeId: bridgeId,
          metadata: { subscriptionCount: subCount },
        });
      }

      return clusters;
    },
  };
}
