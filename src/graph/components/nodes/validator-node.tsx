import { memo } from "react";
import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";
import type { GraphNodeData } from "@/graph/types";
import { BaseNode } from "./base-node";

export const ValidatorNode = memo(function ValidatorNode(
  props: NodeProps & { data: GraphNodeData },
) {
  const raw = props.data.raw;
  const strategy = raw?.strategy as string | undefined;
  const schemaCount = raw?.schemaCount as number | undefined;

  return (
    <BaseNode {...props}>
      {strategy && (
        <Text fontSize="2xs" color="fg.muted" truncate>
          {strategy}
          {schemaCount != null ? ` (${schemaCount} schemas)` : ""}
        </Text>
      )}
    </BaseNode>
  );
});
