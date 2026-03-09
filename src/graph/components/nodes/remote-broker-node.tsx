import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { GraphNodeData } from "@/graph/types";
import { BaseNode } from "./base-node";

export const RemoteBrokerNode = memo(function RemoteBrokerNode(
  props: NodeProps & { data: GraphNodeData },
) {
  return <BaseNode {...props} />;
});
