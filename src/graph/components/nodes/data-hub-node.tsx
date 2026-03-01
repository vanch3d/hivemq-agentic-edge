import type { NodeProps } from "@xyflow/react";
import type { GraphNodeData } from "@/graph/types";
import { BaseNode } from "./base-node";

export function DataHubNode(props: NodeProps & { data: GraphNodeData }) {
  return <BaseNode {...props} />;
}
