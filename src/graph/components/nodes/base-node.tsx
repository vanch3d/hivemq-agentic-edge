import { Box, Badge, HStack, Text, Circle, Icon } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { GraphNodeData, DomainEntityType } from "@/graph/types";
import {
  ENTITY_COLORS,
  ENTITY_ICONS,
  ENTITY_LABELS,
  STATUS_COLORS,
} from "@/graph/constants";

const pulseKeyframes = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

/** Entity types rendered as pills (rounded ends) */
const PILL_TYPES: DomainEntityType[] = ["topicFilter"];

/** Entity types rendered with dashed borders */
const DASHED_BORDER_TYPES: DomainEntityType[] = ["topicFilter"];

function getStatusColor(status?: GraphNodeData["status"]): string | undefined {
  if (!status) return undefined;
  const conn = status.connection;
  const rt = status.runtime;
  // UNKNOWN / STATELESS → no accent dot
  if (conn === "UNKNOWN" || conn === "STATELESS") return undefined;
  if (conn && STATUS_COLORS[conn] && STATUS_COLORS[conn] !== "transparent")
    return STATUS_COLORS[conn];
  if (rt && STATUS_COLORS[rt] && STATUS_COLORS[rt] !== "transparent")
    return STATUS_COLORS[rt];
  return undefined;
}

function getStatusOpacity(status?: GraphNodeData["status"]): number {
  if (!status) return 1;
  if (status.connection === "DISCONNECTED" || status.runtime === "STOPPED")
    return 0.5;
  return 1;
}

function isError(status?: GraphNodeData["status"]): boolean {
  return status?.connection === "ERROR";
}

export function BaseNode({
  data,
  selected,
  children,
}: NodeProps & { data: GraphNodeData; children?: React.ReactNode }) {
  const color = ENTITY_COLORS[data.entityType];
  const EntityIcon = ENTITY_ICONS[data.entityType];
  const statusColor = getStatusColor(data.status);
  const isPill = PILL_TYPES.includes(data.entityType);
  const isDashed = DASHED_BORDER_TYPES.includes(data.entityType);
  const hasError = isError(data.status);

  return (
    <Box
      borderWidth="2px"
      borderColor={hasError ? "red.500" : selected ? "blue.500" : color}
      borderStyle={isDashed ? "dashed" : "solid"}
      borderRadius={isPill ? "full" : "md"}
      bg="bg.panel"
      px={isPill ? "4" : "2"}
      py="1.5"
      minW="120px"
      maxW="200px"
      position="relative"
      opacity={getStatusOpacity(data.status)}
      boxShadow={selected ? "0 0 0 2px var(--chakra-colors-blue-300)" : "sm"}
      _hover={{ boxShadow: "md" }}
      transition="box-shadow 0.15s, opacity 0.15s"
      animation={
        hasError ? `${pulseKeyframes} 2s ease-in-out infinite` : undefined
      }
    >
      {/* Status indicator dot */}
      {statusColor && (
        <Circle
          size="8px"
          bg={statusColor}
          position="absolute"
          top="2"
          right="2"
        />
      )}

      {/* Entity type badge */}
      <Badge size="xs" bg={color} color="white" mb="0.5" fontSize="2xs">
        <HStack gap="0.5">
          <Icon asChild boxSize="2.5">
            <EntityIcon />
          </Icon>
          {ENTITY_LABELS[data.entityType]}
        </HStack>
      </Badge>

      {/* Label */}
      <Text fontSize="xs" fontWeight="semibold" truncate>
        {data.label}
      </Text>

      {/* Sublabel */}
      {data.sublabel && (
        <Text fontSize="2xs" color="fg.muted" truncate>
          {data.sublabel}
        </Text>
      )}

      {/* Type-specific content */}
      {children}

      {/* Handles */}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </Box>
  );
}
