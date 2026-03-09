import { memo } from "react";
import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";
import type { GraphNodeData } from "@/graph/types";
import { BaseNode } from "./base-node";

export const ScriptNode = memo(function ScriptNode(
  props: NodeProps & { data: GraphNodeData },
) {
  const funcType = props.data.raw?.functionType as string | undefined;
  return (
    <BaseNode {...props}>
      {funcType && (
        <Text fontSize="2xs" color="fg.muted">
          {funcType.toLowerCase()}
        </Text>
      )}
    </BaseNode>
  );
});
