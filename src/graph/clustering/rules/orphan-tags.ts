/**
 * Rule 2: Orphan tags clustering.
 *
 * Tags with no outgoing `feeds` edge are unmapped — they expose data
 * but nothing consumes it. Group them per adapter into a dimmed aggregate.
 */
import type { ClusterRule, Cluster, ClusterConfig } from "../types";
import type { GraphIndex } from "../graph-index";
import { REL } from "../../relationships";

export function orphanTagsRule(idx: GraphIndex): ClusterRule {
  return {
    id: "orphan-tags",
    analyze: (_nodes, _edges, config: ClusterConfig, claimed) => {
      if (!config.orphanTags.enabled) return [];

      const clusters: Cluster[] = [];
      const tagIds = idx.byType.get("tag") ?? [];

      // Group orphan tags by their parent adapter (via otDevice → adapter chain)
      const orphansByAdapter = new Map<string, string[]>();

      for (const tagId of tagIds) {
        if (claimed.has(tagId)) continue;

        // Check if this tag has any outgoing `feeds` edge
        const hasFeed = (idx.outgoing.get(tagId) ?? []).some(
          (e) => e.data?.relationship === REL.feeds,
        );
        if (hasFeed) continue;

        // Find parent adapter via incoming exposes edge (otDevice → tag)
        // then incoming manages edge (adapter → otDevice)
        const exposedBy = (idx.incoming.get(tagId) ?? []).find(
          (e) => e.data?.relationship === REL.exposes,
        );
        const deviceId = exposedBy?.source;
        let adapterId = "unknown";
        if (deviceId) {
          const managedBy = (idx.incoming.get(deviceId) ?? []).find(
            (e) => e.data?.relationship === REL.manages,
          );
          if (managedBy) adapterId = managedBy.source;
        }

        const list = orphansByAdapter.get(adapterId);
        if (list) list.push(tagId);
        else orphansByAdapter.set(adapterId, [tagId]);
      }

      for (const [adapterId, tagIds] of orphansByAdapter) {
        if (tagIds.length === 0) continue;

        const members = new Set(tagIds);
        const adapterNode = idx.nodeById.get(adapterId);
        const adapterLabel = adapterNode?.data.label ?? adapterId;

        clusters.push({
          id: `orphan-tags:${adapterId}`,
          ruleId: "orphan-tags",
          label: `${tagIds.length} unmapped tags (${adapterLabel})`,
          memberNodeIds: members,
          anchorNodeId: null, // no anchor — orphans are free-floating
          metadata: { adapterId, count: tagIds.length },
        });
      }

      return clusters;
    },
  };
}
