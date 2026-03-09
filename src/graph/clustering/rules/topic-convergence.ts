/**
 * Rule 4: Topic convergence clustering.
 *
 * When multiple mappers publish to the same topic, group them
 * into a "N sources → topic" cluster.
 */
import type { ClusterRule, Cluster, ClusterConfig } from "../types";
import type { GraphIndex } from "../graph-index";
import { REL } from "../../relationships";

export function topicConvergenceRule(idx: GraphIndex): ClusterRule {
  return {
    id: "topic-convergence",
    analyze: (_nodes, _edges, config: ClusterConfig, claimed) => {
      const clusters: Cluster[] = [];
      const topicIds = idx.byType.get("topic") ?? [];

      for (const topicId of topicIds) {
        if (claimed.has(topicId)) continue;

        // topic ← publishes ← mapper
        const publishEdges = (idx.incoming.get(topicId) ?? []).filter(
          (e) => e.data?.relationship === REL.publishes,
        );

        const publishers = publishEdges
          .map((e) => e.source)
          .filter((id) => !claimed.has(id));

        if (publishers.length < config.topicConvergence.minPublishers) continue;

        const members = new Set(publishers);
        // Include source tags for each mapper (mapper ← feeds ← tag)
        for (const mapperId of publishers) {
          const feedEdges = (idx.incoming.get(mapperId) ?? []).filter(
            (e) => e.data?.relationship === REL.feeds,
          );
          for (const fe of feedEdges) {
            if (!claimed.has(fe.source)) members.add(fe.source);
          }
        }

        const topicNode = idx.nodeById.get(topicId);
        const topicLabel = topicNode?.data.label ?? topicId;

        clusters.push({
          id: `topic-convergence:${topicId}`,
          ruleId: "topic-convergence",
          label: `${publishers.length} sources → ${topicLabel}`,
          memberNodeIds: members,
          anchorNodeId: topicId,
          metadata: { publisherCount: publishers.length },
        });
      }

      return clusters;
    },
  };
}
