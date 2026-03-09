/**
 * Rule 1: Adapter subtree clustering.
 *
 * Groups tags + NB/SB mappers + OT device under their parent adapter
 * when tag count exceeds threshold. The entire subtree collapses into
 * one aggregate node.
 */
import type { ClusterRule, Cluster, ClusterConfig } from "../types";
import type { GraphIndex } from "../graph-index";
import { REL } from "../../relationships";

export function adapterSubtreeRule(idx: GraphIndex): ClusterRule {
  return {
    id: "adapter-subtree",
    analyze: (_nodes, _edges, config: ClusterConfig, claimed) => {
      const clusters: Cluster[] = [];
      const adapterIds = idx.byType.get("adapter") ?? [];

      for (const adapterId of adapterIds) {
        if (claimed.has(adapterId)) continue;

        const members = new Set<string>();
        const breakdown: Record<string, number> = {};

        function collect(nodeId: string, type: string) {
          if (claimed.has(nodeId)) return;
          members.add(nodeId);
          breakdown[type] = (breakdown[type] ?? 0) + 1;
        }

        // adapter → manages → otDevice
        const managesEdges = (idx.outgoing.get(adapterId) ?? []).filter(
          (e) => e.data?.relationship === REL.manages,
        );
        for (const e of managesEdges) {
          collect(e.target, "otDevice");

          // otDevice → exposes → tag
          const exposesEdges = (idx.outgoing.get(e.target) ?? []).filter(
            (e2) => e2.data?.relationship === REL.exposes,
          );
          for (const e2 of exposesEdges) {
            collect(e2.target, "tag");
          }
        }

        // adapter → owns → mapper (NB/SB)
        const ownsEdges = (idx.outgoing.get(adapterId) ?? []).filter(
          (e) => e.data?.relationship === REL.owns,
        );
        for (const e of ownsEdges) {
          const targetNode = idx.nodeById.get(e.target);
          if (!targetNode) continue;
          const t = targetNode.data.entityType;
          if (
            t === "northboundMapper" ||
            t === "southboundMapper" ||
            t === "assetMapper"
          ) {
            collect(e.target, t);
          }
        }

        const tagCount = breakdown["tag"] ?? 0;
        if (tagCount < config.adapterSubtree.minTags) continue;

        // Include the adapter itself in the cluster
        members.add(adapterId);

        const adapterNode = idx.nodeById.get(adapterId);
        const adapterLabel = adapterNode?.data.label ?? adapterId;

        const parts: string[] = [];
        if (breakdown["tag"]) parts.push(`${breakdown["tag"]} tags`);
        if (breakdown["northboundMapper"])
          parts.push(`${breakdown["northboundMapper"]} NB mappers`);
        if (breakdown["southboundMapper"])
          parts.push(`${breakdown["southboundMapper"]} SB mappers`);

        clusters.push({
          id: `adapter-subtree:${adapterId}`,
          ruleId: "adapter-subtree",
          label: `${adapterLabel} (${parts.join(", ")})`,
          memberNodeIds: members,
          anchorNodeId: adapterId,
          metadata: { breakdown, tagCount },
        });
      }

      return clusters;
    },
  };
}
