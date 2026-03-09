import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useInternalNode,
  type EdgeProps,
} from "@xyflow/react";
import { Text } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";

import type { GraphEdgeData } from "@/graph/types";
import { EDGE_STYLES, DEFAULT_EDGE_STYLE } from "@/graph/constants";
import { getFloatingEdgeParams } from "./floating-edge-utils";
import { useZoomDetail } from "@/graph/hooks/use-zoom-level";

export function RelationshipEdge({
  id,
  source,
  target,
  data,
  selected,
}: EdgeProps & { data?: GraphEdgeData }) {
  const { t } = useTranslation();
  const zoomDetail = useZoomDetail();
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) return null;

  const { sx, sy, tx, ty, sourcePos, targetPos } = getFloatingEdgeParams(
    sourceNode,
    targetNode,
  );

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
    sourcePosition: sourcePos,
    targetPosition: targetPos,
  });

  const style = data?.relationship
    ? (EDGE_STYLES[data.relationship] ?? DEFAULT_EDGE_STYLE)
    : DEFAULT_EDGE_STYLE;

  const label = data?.relationship
    ? t(`graph.relationship.${data.relationship}`, {
        defaultValue: data.relationship,
      })
    : undefined;

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
      {label && zoomDetail === "full" && (
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
            {label}
          </Text>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
