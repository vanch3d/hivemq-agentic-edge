import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { GraphNodeData } from "@/graph/types";
import { BaseNode } from "./base-node";

/** Shared node component for NorthboundMapper, SouthboundMapper, and AssetMapper. */
export const MapperNode = memo(function MapperNode(
  props: NodeProps & { data: GraphNodeData },
) {
  return <BaseNode {...props} />;
});
