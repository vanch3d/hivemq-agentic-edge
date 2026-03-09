import { Box, Badge, HStack, Text, Circle, Icon } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { GraphNodeData } from "@/graph/types";
import {
  ENTITY_COLORS,
  ENTITY_COLOR_PALETTE,
  ENTITY_ICONS,
  ENTITY_LABELS,
  VISUAL_ROLE,
  STATUS_COLORS,
  type VisualRole,
} from "@/graph/constants";
import { useZoomDetail } from "@/graph/hooks/use-zoom-level";

const pulseKeyframes = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

function getStatusColor(status?: GraphNodeData["status"]): string | undefined {
  if (!status) return undefined;
  const conn = status.connection;
  const rt = status.runtime;
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

// --- Role-based visual properties (full detail level) ---

interface RoleStyle {
  borderRadius: string;
  borderWidth: string;
  borderStyle: string;
  px: string;
  py: string;
  minW: string;
  maxW: string;
  badgeSize: "xs" | "sm";
  labelSize: "xs" | "sm";
  showBadge: boolean;
  showSublabel: boolean;
}

const ROLE_STYLES: Record<VisualRole, RoleStyle> = {
  orchestrator: {
    borderRadius: "lg",
    borderWidth: "3px",
    borderStyle: "double",
    px: "3",
    py: "2",
    minW: "150px",
    maxW: "220px",
    badgeSize: "sm",
    labelSize: "sm",
    showBadge: true,
    showSublabel: true,
  },
  connector: {
    borderRadius: "md",
    borderWidth: "2px",
    borderStyle: "solid",
    px: "2",
    py: "1.5",
    minW: "140px",
    maxW: "200px",
    badgeSize: "xs",
    labelSize: "sm",
    showBadge: true,
    showSublabel: true,
  },
  endpoint: {
    borderRadius: "md",
    borderWidth: "2px",
    borderStyle: "solid",
    px: "2",
    py: "1.5",
    minW: "120px",
    maxW: "200px",
    badgeSize: "xs",
    labelSize: "xs",
    showBadge: true,
    showSublabel: true,
  },
  resource: {
    borderRadius: "full",
    borderWidth: "1.5px",
    borderStyle: "solid",
    px: "3",
    py: "1",
    minW: "80px",
    maxW: "160px",
    badgeSize: "xs",
    labelSize: "xs",
    showBadge: false,
    showSublabel: false,
  },
  mapper: {
    borderRadius: "xl",
    borderWidth: "1.5px",
    borderStyle: "solid",
    px: "2",
    py: "1",
    minW: "110px",
    maxW: "180px",
    badgeSize: "xs",
    labelSize: "xs",
    showBadge: true,
    showSublabel: false,
  },
  policy: {
    borderRadius: "md",
    borderWidth: "2px",
    borderStyle: "dashed",
    px: "2",
    py: "1.5",
    minW: "120px",
    maxW: "200px",
    badgeSize: "xs",
    labelSize: "xs",
    showBadge: true,
    showSublabel: true,
  },
  artifact: {
    borderRadius: "sm",
    borderWidth: "1.5px",
    borderStyle: "dotted",
    px: "2",
    py: "1",
    minW: "90px",
    maxW: "160px",
    badgeSize: "xs",
    labelSize: "xs",
    showBadge: true,
    showSublabel: false,
  },
};

// --- Dot-level shapes per role (colored shape, no text) ---
// Sized to be clearly visible at < 0.4 zoom — bigger than you'd think at 1x

const DOT_SHAPES: Record<VisualRole, { w: string; h: string; radius: string }> = {
  orchestrator: { w: "40px", h: "40px", radius: "lg" },
  connector:    { w: "32px", h: "32px", radius: "md" },
  endpoint:     { w: "28px", h: "28px", radius: "md" },
  resource:     { w: "24px", h: "24px", radius: "full" },
  mapper:       { w: "28px", h: "20px", radius: "full" },  // wider = directional
  policy:       { w: "28px", h: "28px", radius: "sm" },
  artifact:     { w: "24px", h: "24px", radius: "sm" },
};

// --- Handles (shared across compact and full) ---

function NodeHandles() {
  return (
    <>
      <Handle type="source" position={Position.Top} />
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Right} />
      <Handle type="source" position={Position.Bottom} />
      <Handle type="target" position={Position.Bottom} />
      <Handle type="source" position={Position.Left} />
      <Handle type="target" position={Position.Left} />
    </>
  );
}

// ─── Dot detail level ─────────────────────────────────────────────────────────

function DotNode({
  data,
  selected,
}: {
  data: GraphNodeData;
  selected?: boolean;
}) {
  const color = ENTITY_COLORS[data.entityType];
  const role = VISUAL_ROLE[data.entityType];
  const dot = DOT_SHAPES[role];
  const hasError = isError(data.status);

  return (
    <Box
      w={dot.w}
      h={dot.h}
      borderRadius={dot.radius}
      bg={hasError ? "red.500" : color}
      borderWidth={selected ? "2px" : "0"}
      borderColor="blue.500"
      opacity={getStatusOpacity(data.status)}
      animation={
        hasError ? `${pulseKeyframes} 2s ease-in-out infinite` : undefined
      }
    >
      {/* Minimal handles — only left+right for dot level */}
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
    </Box>
  );
}

// ─── Compact detail level ─────────────────────────────────────────────────────
// Color-filled shape with white label — visually distinct from edges (no border).
// "prominent" roles (orchestrator, connector, endpoint) get a two-line compact
// (type + label) so they don't shrink smaller than their dot representation.

interface CompactStyle {
  radius: string;
  showType: boolean;  // two-line: type label + name
  px: string;
  py: string;
  minW?: string;
}

const COMPACT_STYLES: Record<VisualRole, CompactStyle> = {
  orchestrator: { radius: "lg", showType: true,  px: "2.5", py: "1",   minW: "60px" },
  connector:    { radius: "md", showType: true,  px: "2",   py: "1",   minW: "50px" },
  endpoint:     { radius: "md", showType: true,  px: "2",   py: "0.5", minW: "40px" },
  resource:     { radius: "full", showType: false, px: "2", py: "0.5" },
  mapper:       { radius: "xl", showType: false, px: "2",   py: "0.5" },
  policy:       { radius: "md", showType: true,  px: "2",   py: "0.5" },
  artifact:     { radius: "sm", showType: false, px: "1.5", py: "0.5" },
};

function CompactNode({
  data,
  selected,
}: {
  data: GraphNodeData;
  selected?: boolean;
}) {
  const color = ENTITY_COLORS[data.entityType];
  const role = VISUAL_ROLE[data.entityType];
  const hasError = isError(data.status);
  const style = COMPACT_STYLES[role];

  return (
    <Box
      bg={hasError ? "red.500" : color}
      borderWidth={selected ? "2px" : "0"}
      borderColor="blue.500"
      borderRadius={style.radius}
      px={style.px}
      py={style.py}
      minW={style.minW}
      opacity={getStatusOpacity(data.status)}
      textAlign="center"
      animation={
        hasError ? `${pulseKeyframes} 2s ease-in-out infinite` : undefined
      }
    >
      {style.showType && (
        <Text fontSize="3xs" color="whiteAlpha.800" lineHeight="1" truncate>
          {ENTITY_LABELS[data.entityType]}
        </Text>
      )}
      <Text fontSize="2xs" fontWeight="semibold" color="white" lineHeight="1.2" truncate>
        {data.label}
      </Text>

      <NodeHandles />
    </Box>
  );
}

// ─── Full detail level ────────────────────────────────────────────────────────

export function BaseNode({
  data,
  selected,
  children,
  leftDecorator,
}: NodeProps & {
  data: GraphNodeData;
  children?: React.ReactNode;
  /** Optional element rendered flush against the left edge (e.g. semi-circle for topicFilter) */
  leftDecorator?: React.ReactNode;
}) {
  const zoomDetail = useZoomDetail();

  // --- Dot level: colored shape only ---
  if (zoomDetail === "dot") {
    return <DotNode data={data} selected={selected} />;
  }

  // --- Compact level: color-filled shape with label ---
  if (zoomDetail === "compact") {
    return <CompactNode data={data} selected={selected} />;
  }

  // --- Full level: complete rendering ---
  const color = ENTITY_COLORS[data.entityType];
  const palette = ENTITY_COLOR_PALETTE[data.entityType];
  const EntityIcon = ENTITY_ICONS[data.entityType];
  const statusColor = getStatusColor(data.status);
  const hasError = isError(data.status);
  const role = VISUAL_ROLE[data.entityType];
  const style = ROLE_STYLES[role];

  return (
    <Box
      borderWidth={style.borderWidth}
      borderColor={hasError ? "red.500" : selected ? "blue.500" : color}
      borderStyle={hasError ? "solid" : style.borderStyle}
      borderRadius={style.borderRadius}
      bg="bg.panel"
      px={style.px}
      py={style.py}
      minW={style.minW}
      maxW={style.maxW}
      position="relative"
      opacity={getStatusOpacity(data.status)}
      animation={
        hasError ? `${pulseKeyframes} 2s ease-in-out infinite` : undefined
      }
    >
      {/* Optional left-edge decorator */}
      {leftDecorator}

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

      {/* Entity type badge — hidden for resources (compact) */}
      {style.showBadge && (
        <Badge
          size={style.badgeSize}
          colorPalette={palette}
          variant="solid"
          mb="0.5"
          fontSize="2xs"
        >
          <HStack gap="0.5">
            <Icon asChild boxSize="2.5">
              <EntityIcon />
            </Icon>
            {ENTITY_LABELS[data.entityType]}
          </HStack>
        </Badge>
      )}

      {/* Label */}
      <Text fontSize={style.labelSize} fontWeight="semibold" truncate>
        {data.label}
      </Text>

      {/* Sublabel — hidden for compact roles */}
      {style.showSublabel && data.sublabel && (
        <Text fontSize="2xs" color="fg.muted" truncate>
          {data.sublabel}
        </Text>
      )}

      {/* Type-specific content */}
      {children}

      <NodeHandles />
    </Box>
  );
}
