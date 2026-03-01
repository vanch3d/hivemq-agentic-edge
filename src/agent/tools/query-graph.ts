import { queryGraphDef } from "@/agent/tool-definitions";
import { useGraphStore } from "@/graph/store";
import type { ViewScope } from "@/graph/types";
import { snapshotQueryResult } from "./snapshot-helper";

export const queryGraph = queryGraphDef.client(async (input) => {
  const store = useGraphStore.getState();
  store.setViewScope(input.scope as ViewScope, input.focusEntityId);

  const { nodes, edges } = useGraphStore.getState();

  const result = {
    display: "graph" as const,
    scope: input.scope,
    nodeCount: nodes.length,
    edgeCount: edges.length,
  };

  const label = input.focusEntityId
    ? `Graph \u2014 ${input.scope} (${input.focusEntityId})`
    : `Graph \u2014 ${input.scope}`;

  const snapshotId = snapshotQueryResult({
    toolName: "queryGraph",
    operation: input.scope,
    data: result,
    label,
    graphScope: input.scope,
    graphFocusEntityId: input.focusEntityId,
  });

  return { ...result, snapshotId };
});
