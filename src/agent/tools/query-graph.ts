import { queryGraphDef } from "@/agent/tool-definitions";
import { useGraphStore } from "@/graph/store";
import type { ViewScope } from "@/graph/types";

export const queryGraph = queryGraphDef.client(async (input) => {
  const store = useGraphStore.getState();
  store.setViewScope(input.scope as ViewScope, input.focusEntityId);

  const { nodes, edges } = useGraphStore.getState();

  return {
    display: "graph" as const,
    scope: input.scope,
    nodeCount: nodes.length,
    edgeCount: edges.length,
  };
});
