import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";
import type { GraphNodeData } from "@/graph/types";
import { BaseNode } from "./base-node";

export function AdapterNode(props: NodeProps & { data: GraphNodeData }) {
  const config = props.data.raw?.config as Record<string, unknown> | undefined;
  const uri =
    (config?.uri as string) ??
    (config?.host ? `${config.host}:${config.port}` : undefined);
  return (
    <BaseNode {...props}>
      {uri && (
        <Text fontSize="2xs" color="fg.muted" truncate fontFamily="mono">
          {uri}
        </Text>
      )}
    </BaseNode>
  );
}
