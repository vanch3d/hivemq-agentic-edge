import { queryGraphDef } from "@/agent/tool-definitions";
import { useGraphStore } from "@/graph/store";
import type { ViewScope } from "@/graph/types";
import { getToolNavigate } from "@/agent/tool-context";
import { snapshotQueryResult } from "./snapshot-helper";

export const queryGraph = queryGraphDef.client(async (input) => {
  const store = useGraphStore.getState();

  // Apply scope/focus directly — works regardless of current page
  store.setViewScope(input.scope as ViewScope, input.focusEntityId);

  // Set pending focus for the canvas to pick up after layout settles
  if (input.selectNodeId) {
    store.setPendingFocus(input.selectNodeId);
  }

  // Navigate to the graph page (no-op if already there)
  const navigate = getToolNavigate();
  if (navigate) {
    navigate("/workspace/graph");
  }

  const { nodes, edges } = useGraphStore.getState();

  const result = {
    display: "graph" as const,
    scope: input.scope,
    nodeCount: nodes.length,
    edgeCount: edges.length,
  };

  const label = input.focusEntityId
    ? `Graph — ${input.scope} (${input.focusEntityId})`
    : `Graph — ${input.scope}`;

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
