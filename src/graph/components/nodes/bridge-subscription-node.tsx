import { memo } from "react";
import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";
import type { GraphNodeData } from "@/graph/types";
import { BaseNode } from "./base-node";

export const BridgeSubscriptionNode = memo(function BridgeSubscriptionNode(
  props: NodeProps & { data: GraphNodeData },
) {
  const direction = props.data.raw?.direction as string | undefined;
  return (
    <BaseNode {...props}>
      {direction && (
        <Text fontSize="2xs" color="fg.muted">
          {direction}
        </Text>
      )}
    </BaseNode>
  );
});
