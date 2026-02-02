import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";
import type { GraphNodeData } from "@/graph/types";
import { BaseNode } from "./base-node";

export function DataPolicyNode(props: NodeProps & { data: GraphNodeData }) {
  const raw = props.data.raw;
  const topicFilter = (raw?.matching as Record<string, unknown>)
    ?.topicFilter as string | undefined;
  return (
    <BaseNode {...props}>
      {topicFilter && (
        <Text fontSize="2xs" color="fg.muted" truncate fontFamily="mono">
          {topicFilter}
        </Text>
      )}
    </BaseNode>
  );
}
