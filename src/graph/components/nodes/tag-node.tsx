import { memo } from "react";
import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";
import type { GraphNodeData } from "@/graph/types";
import { BaseNode } from "./base-node";

export const TagNode = memo(function TagNode(
  props: NodeProps & { data: GraphNodeData },
) {
  const def = props.data.raw?.definition as Record<string, unknown> | undefined;
  const dataType = def?.dataType as string | undefined;
  return (
    <BaseNode {...props}>
      {dataType && (
        <Text fontSize="2xs" color="fg.muted" fontFamily="mono">
          {dataType}
        </Text>
      )}
    </BaseNode>
  );
});
