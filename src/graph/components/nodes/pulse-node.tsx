import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { GraphNodeData } from "@/graph/types";
import { BaseNode } from "./base-node";

export const PulseNode = memo(function PulseNode(
  props: NodeProps & { data: GraphNodeData },
) {
  return <BaseNode {...props} />;
});
