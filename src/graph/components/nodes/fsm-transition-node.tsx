import { memo } from "react";
import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";
import type { GraphNodeData } from "@/graph/types";
import { BaseNode } from "./base-node";

export const FsmTransitionNode = memo(function FsmTransitionNode(
  props: NodeProps & { data: GraphNodeData },
) {
  const raw = props.data.raw;
  const fromState = raw?.fromState as string | undefined;
  const toState = raw?.toState as string | undefined;

  return (
    <BaseNode {...props}>
      {fromState && toState && (
        <Text fontSize="2xs" color="fg.muted" truncate>
          {fromState} → {toState}
        </Text>
      )}
    </BaseNode>
  );
});
