/**
 * Rule 6: Policy chain clustering.
 *
 * Groups a policy's internals (validators, transitions, pipeline operations)
 * and their referenced schemas/scripts into a single cluster. Policies are
 * low-cardinality but their resource edges create visual noise.
 */
import type { ClusterRule, Cluster, ClusterConfig } from "../types";
import type { GraphIndex } from "../graph-index";
import { REL } from "../../relationships";

const POLICY_INTERNAL_TYPES = new Set([
  "validator",
  "fsmTransition",
  "pipelineOperation",
]);

export function policyChainRule(idx: GraphIndex): ClusterRule {
  return {
    id: "policy-chain",
    analyze: (_nodes, _edges, config: ClusterConfig, claimed) => {
      const clusters: Cluster[] = [];

      const policyTypes = ["dataPolicy", "behaviorPolicy"] as const;

      for (const policyType of policyTypes) {
        const policyIds = idx.byType.get(policyType) ?? [];

        for (const policyId of policyIds) {
          if (claimed.has(policyId)) continue;

          const members = new Set<string>();
          const breakdown: Record<string, number> = {};

          function collect(nodeId: string) {
            if (claimed.has(nodeId) || members.has(nodeId)) return;
            const node = idx.nodeById.get(nodeId);
            if (!node) return;
            members.add(nodeId);
            const t = node.data.entityType;
            breakdown[t] = (breakdown[t] ?? 0) + 1;
          }

          // Walk all outgoing edges recursively for policy internal types
          const queue = [policyId];
          const visited = new Set<string>();

          while (queue.length > 0) {
            const current = queue.pop()!;
            if (visited.has(current)) continue;
            visited.add(current);

            for (const e of idx.outgoing.get(current) ?? []) {
              const rel = e.data?.relationship;
              const targetNode = idx.nodeById.get(e.target);
              if (!targetNode) continue;

              const targetType = targetNode.data.entityType;

              // Collect policy internals
              if (POLICY_INTERNAL_TYPES.has(targetType)) {
                collect(e.target);
                queue.push(e.target); // continue walking from internals
              }

              // Collect schemas/scripts referenced by policy internals
              if (
                (targetType === "schema" || targetType === "script") &&
                (rel === REL.validates ||
                  rel === REL.serializes ||
                  rel === REL.invokes ||
                  rel === REL.deserializes)
              ) {
                collect(e.target);
              }
            }
          }

          const totalOps =
            (breakdown["pipelineOperation"] ?? 0) +
            (breakdown["validator"] ?? 0) +
            (breakdown["fsmTransition"] ?? 0);

          if (totalOps < config.policyChain.minOperations) continue;

          // Include the policy itself
          members.add(policyId);

          const policyNode = idx.nodeById.get(policyId);
          const policyLabel = policyNode?.data.label ?? policyId;

          const parts: string[] = [];
          if (breakdown["validator"])
            parts.push(`${breakdown["validator"]} validators`);
          if (breakdown["fsmTransition"])
            parts.push(`${breakdown["fsmTransition"]} transitions`);
          if (breakdown["pipelineOperation"])
            parts.push(`${breakdown["pipelineOperation"]} operations`);
          if (breakdown["schema"]) parts.push(`${breakdown["schema"]} schemas`);
          if (breakdown["script"]) parts.push(`${breakdown["script"]} scripts`);

          clusters.push({
            id: `policy-chain:${policyId}`,
            ruleId: "policy-chain",
            label: `${policyLabel} (${parts.join(", ")})`,
            memberNodeIds: members,
            anchorNodeId: policyId,
            metadata: { breakdown, totalOps },
          });
        }
      }

      return clusters;
    },
  };
}
