import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";
import type { GraphNodeData } from "@/graph/types";
import { BaseNode } from "./base-node";

export function SchemaNode(props: NodeProps & { data: GraphNodeData }) {
  const schemaType = props.data.raw?.type as string | undefined;
  return (
    <BaseNode {...props}>
      {schemaType && (
        <Text fontSize="2xs" color="fg.muted">
          {schemaType}
        </Text>
      )}
    </BaseNode>
  );
}
