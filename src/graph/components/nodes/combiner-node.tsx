import { memo } from "react";
import { Text } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";
import type { GraphNodeData } from "@/graph/types";
import { BaseNode } from "./base-node";

export const CombinerNode = memo(function CombinerNode(
  props: NodeProps & { data: GraphNodeData },
) {
  const sources = (props.data.raw?.sources as { items?: unknown[] })?.items;
  const count = sources?.length ?? 0;
  return (
    <BaseNode {...props}>
      {count > 0 && (
        <Text fontSize="2xs" color="fg.muted">
          {count} {count === 1 ? "source" : "sources"}
        </Text>
      )}
    </BaseNode>
  );
});
