/**
 * Rule 3: Topic filter fan-in clustering.
 *
 * When many topics match a single topic filter (via MQTT wildcard),
 * group the matched topics and their source mappers into a cluster.
 */
import type { ClusterRule, Cluster, ClusterConfig } from "../types";
import type { GraphIndex } from "../graph-index";
import { REL } from "../../relationships";

export function topicFilterFanInRule(idx: GraphIndex): ClusterRule {
  return {
    id: "topic-filter-fan-in",
    analyze: (_nodes, _edges, config: ClusterConfig, claimed) => {
      const clusters: Cluster[] = [];
      const filterIds = idx.byType.get("topicFilter") ?? [];

      for (const filterId of filterIds) {
        if (claimed.has(filterId)) continue;

        // topicFilter ← matches ← topic (incoming edges with rel=matches)
        const matchEdges = (idx.incoming.get(filterId) ?? []).filter(
          (e) => e.data?.relationship === REL.matches,
        );

        const matchedTopics = matchEdges
          .map((e) => e.source)
          .filter((id) => !claimed.has(id));

        if (matchedTopics.length < config.topicFilterFanIn.minSources) continue;

        // For each matched topic, find source mappers (← publishes ← mapper)
        const members = new Set<string>();
        for (const topicId of matchedTopics) {
          members.add(topicId);
          const publishEdges = (idx.incoming.get(topicId) ?? []).filter(
            (e) => e.data?.relationship === REL.publishes,
          );
          for (const pe of publishEdges) {
            if (!claimed.has(pe.source)) members.add(pe.source);
          }
        }

        const filterNode = idx.nodeById.get(filterId);
        const filterLabel = filterNode?.data.label ?? filterId;

        clusters.push({
          id: `topic-filter-fan-in:${filterId}`,
          ruleId: "topic-filter-fan-in",
          label: `${filterLabel} matches ${matchedTopics.length} topics`,
          memberNodeIds: members,
          anchorNodeId: filterId,
          metadata: { topicCount: matchedTopics.length },
        });
      }

      return clusters;
    },
  };
}
