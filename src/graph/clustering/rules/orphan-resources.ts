/**
 * Rule 7: Orphan resources clustering.
 *
 * Schemas and scripts that are only connected to the DataHub orchestrator
 * (via `owns`) and have no incoming policy edges (validates, serializes,
 * invokes, deserializes) are unused resources. Group them into a single
 * aggregate to reduce visual noise.
 */
import type { ClusterRule, Cluster, ClusterConfig } from "../types";
import type { GraphIndex } from "../graph-index";
import { REL } from "../../relationships";

/** Relationships that indicate a resource is actively used by a policy chain. */
const ACTIVE_RELS: Set<string> = new Set([
  REL.validates,
  REL.serializes,
  REL.invokes,
  REL.deserializes,
]);

export function orphanResourcesRule(idx: GraphIndex): ClusterRule {
  return {
    id: "orphan-resources",
    analyze: (_nodes, _edges, _config: ClusterConfig, claimed) => {
      const orphanSchemas: string[] = [];
      const orphanScripts: string[] = [];

      for (const type of ["schema", "script"] as const) {
        const ids = idx.byType.get(type) ?? [];
        for (const id of ids) {
          if (claimed.has(id)) continue;

          // Check if any incoming edge is an active policy relationship
          const hasActiveRef = (idx.incoming.get(id) ?? []).some((e) => {
            const rel = e.data?.relationship;
            return rel !== undefined && ACTIVE_RELS.has(rel);
          });

          if (!hasActiveRef) {
            if (type === "schema") orphanSchemas.push(id);
            else orphanScripts.push(id);
          }
        }
      }

      const clusters: Cluster[] = [];

      if (orphanSchemas.length > 1) {
        clusters.push({
          id: "orphan-resources:schema",
          ruleId: "orphan-resources",
          label: `${orphanSchemas.length} unused schemas`,
          memberNodeIds: new Set(orphanSchemas),
          anchorNodeId: null,
          metadata: { resourceType: "schema", count: orphanSchemas.length },
        });
      }

      if (orphanScripts.length > 1) {
        clusters.push({
          id: "orphan-resources:script",
          ruleId: "orphan-resources",
          label: `${orphanScripts.length} unused scripts`,
          memberNodeIds: new Set(orphanScripts),
          anchorNodeId: null,
          metadata: { resourceType: "script", count: orphanScripts.length },
        });
      }

      return clusters;
    },
  };
}
