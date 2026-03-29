import { memo, useCallback } from "react";
import { Box, HStack, Text, Icon, Badge, IconButton } from "@chakra-ui/react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { LuGroup, LuUnfoldVertical } from "react-icons/lu";

import type { GraphNodeData } from "@/graph/types";
import type { AggregateRaw } from "@/graph/clustering/types";
import { ENTITY_LABELS, ENTITY_COLOR_PALETTE } from "@/graph/constants";
import { useZoomDetail } from "@/graph/hooks/use-zoom-level";
import { useGraphStore } from "@/graph/store";

/** Format entity breakdown as compact pills, e.g. "12 tags · 3 mappers" */
function formatBreakdown(
  breakdown: Record<string, number>,
): Array<{ label: string; count: number; palette: string }> {
  return Object.entries(breakdown)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => ({
      label: ENTITY_LABELS[type as keyof typeof ENTITY_LABELS] ?? type,
      count,
      palette:
        ENTITY_COLOR_PALETTE[type as keyof typeof ENTITY_COLOR_PALETTE] ??
        "gray",
    }));
}

export const AggregateNode = memo(function AggregateNode(
  props: NodeProps & { data: GraphNodeData },
) {
  const raw = props.data.raw as unknown as AggregateRaw;
  const detail = useZoomDetail();
  const clusterUx = useGraphStore((s) => s.clusterUx);
  const toggleCluster = useGraphStore((s) => s.toggleCluster);

  const canExpand = clusterUx !== "none" && raw?.clusterId;
  const handleExpand = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (raw?.clusterId) toggleCluster(raw.clusterId);
    },
    [raw, toggleCluster],
  );

  // ── Dot level ──
  if (detail === "dot") {
    return (
      <Box
        w="40px"
        h="28px"
        bg="yellow.500"
        borderRadius="md"
        opacity={0.9}
        border="2px dashed"
        borderColor="yellow.700"
      >
        <Handle type="target" position={Position.Left} />
        <Handle type="source" position={Position.Right} />
      </Box>
    );
  }

  const breakdown = raw ? formatBreakdown(raw.entityBreakdown) : [];

  // ── Compact level ──
  if (detail === "compact") {
    return (
      <Box
        px={3}
        py={1.5}
        bg="yellow.500"
        borderRadius="md"
        border="2px dashed"
        borderColor="yellow.700"
        maxW="200px"
        cursor={canExpand ? "pointer" : undefined}
        onClick={canExpand ? handleExpand : undefined}
      >
        <Handle type="target" position={Position.Left} />
        <Handle type="source" position={Position.Right} />
        <HStack gap={1}>
          <Icon as={LuGroup} boxSize={3} color="white" />
          <Text fontSize="xs" color="white" fontWeight="semibold" truncate>
            {raw?.memberCount ?? "?"}
            {" entities"}
          </Text>
        </HStack>
      </Box>
    );
  }

  // ── Full level ──
  return (
    <Box
      px={3}
      py={2}
      bg="bg.panel"
      borderRadius="lg"
      border="2px dashed"
      borderColor="yellow.500"
      maxW="220px"
      minW="140px"
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <HStack gap={1.5} mb={1}>
        <Icon as={LuGroup} boxSize={3.5} color="yellow.500" />
        <Text fontSize="xs" fontWeight="bold" truncate flex="1">
          {raw?.anchorLabel ?? props.data.label}
        </Text>
        {canExpand && (
          <IconButton
            aria-label="Expand cluster"
            size="2xs"
            variant="ghost"
            onClick={handleExpand}
            color="yellow.600"
          >
            <LuUnfoldVertical />
          </IconButton>
        )}
      </HStack>

      <HStack gap={1} flexWrap="wrap">
        {breakdown.map((b) => (
          <Badge
            key={b.label}
            size="sm"
            colorPalette={b.palette}
            variant="solid"
            fontSize="2xs"
          >
            {b.count} {b.label}
          </Badge>
        ))}
      </HStack>
    </Box>
  );
});
