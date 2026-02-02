import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";
import type { GraphNodeData } from "@/graph/types";
import { BaseNode } from "./base-node";

export function BehaviorPolicyNode(props: NodeProps & { data: GraphNodeData }) {
  const raw = props.data.raw;
  const regex = (raw?.matching as Record<string, unknown>)?.clientIdRegex as
    | string
    | undefined;
  return (
    <BaseNode {...props}>
      {regex && (
        <Text fontSize="2xs" color="fg.muted" truncate fontFamily="mono">
          {regex}
        </Text>
      )}
    </BaseNode>
  );
}
