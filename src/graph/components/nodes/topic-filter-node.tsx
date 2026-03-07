import { Box } from "@chakra-ui/react";
import type { NodeProps } from "@xyflow/react";
import type { GraphNodeData } from "@/graph/types";
import { ENTITY_COLORS } from "@/graph/constants";
import { BaseNode } from "./base-node";

/**
 * Semi-circle inside the left edge — visually suggests "filtering/matching"
 * and differentiates topicFilter from the plain topic pill.
 * Positioned fully inside the node border so it doesn't clip or overflow.
 * Follows selection state — turns blue when node is selected.
 */
function FilterNotch({ selected }: { selected: boolean }) {
  return (
    <Box
      position="absolute"
      left="0"
      top="50%"
      transform="translateY(-50%)"
      width="6px"
      height="14px"
      bg={selected ? "blue.500" : ENTITY_COLORS.topicFilter}
      borderRightRadius="full"
      pointerEvents="none"
      opacity={0.8}
      transition="background 0.15s"
    />
  );
}

export function TopicFilterNode(props: NodeProps & { data: GraphNodeData }) {
  return (
    <BaseNode
      {...props}
      leftDecorator={<FilterNotch selected={!!props.selected} />}
    />
  );
}
