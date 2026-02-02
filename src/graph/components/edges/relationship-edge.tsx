import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { Text } from "@chakra-ui/react";

import type { GraphEdgeData } from "@/graph/types";
import { EDGE_STYLES, DEFAULT_EDGE_STYLE } from "@/graph/constants";

export function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps & { data?: GraphEdgeData }) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const style = data?.relationship
    ? (EDGE_STYLES[data.relationship] ?? DEFAULT_EDGE_STYLE)
    : DEFAULT_EDGE_STYLE;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? "var(--chakra-colors-blue-400)" : style.stroke,
          strokeWidth: selected ? style.strokeWidth + 0.5 : style.strokeWidth,
          strokeDasharray: style.strokeDasharray,
        }}
        markerEnd="url(#arrow)"
      />
      {data?.relationship && (
        <EdgeLabelRenderer>
          <Text
            fontSize="2xs"
            color="fg.muted"
            bg="bg.panel"
            px="1"
            borderRadius="sm"
            position="absolute"
            transform={`translate(-50%, -50%) translate(${labelX}px,${labelY}px)`}
            pointerEvents="none"
            opacity={0.85}
          >
            {data.relationship}
          </Text>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
