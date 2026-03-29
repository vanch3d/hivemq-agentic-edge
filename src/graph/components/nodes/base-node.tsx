import { useCallback, useMemo } from "react";
import {
  Box,
  Badge,
  HStack,
  Text,
  Circle,
  Icon,
  IconButton,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { LuFoldVertical, LuUnfoldVertical } from "react-icons/lu";

import type { GraphNodeData } from "@/graph/types";
import type { AnchorClusterInfo } from "@/graph/clustering/types";
import {
  ENTITY_COLORS,
  ENTITY_COLOR_PALETTE,
  ENTITY_ICONS,
  ENTITY_LABELS,
  VISUAL_ROLE,
  STATUS_COLORS,
  type VisualRole,
} from "@/graph/constants";
import { getClosestSide } from "@/graph/components/edges/floating-edge-utils";
import { useZoomDetail } from "@/graph/hooks/use-zoom-level";
import { useGraphStore } from "@/graph/store";

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

const DOT_SHAPES: Record<VisualRole, { w: string; h: string; radius: string }> =
  {
    orchestrator: { w: "40px", h: "40px", radius: "lg" },
    connector: { w: "32px", h: "32px", radius: "md" },
    endpoint: { w: "28px", h: "28px", radius: "md" },
    resource: { w: "24px", h: "24px", radius: "full" },
    mapper: { w: "28px", h: "20px", radius: "full" }, // wider = directional
    policy: { w: "28px", h: "28px", radius: "sm" },
    artifact: { w: "24px", h: "24px", radius: "sm" },
  };

// --- Handles (shared across compact and full) ---

/** Style overrides for handles that act as cluster expand/collapse controls. */
const CLUSTER_HANDLE_STYLE: React.CSSProperties = {
  width: 14,
  height: 14,
  background: "var(--chakra-colors-yellow-500)",
  border: "2px solid var(--chakra-colors-yellow-700)",
  borderRadius: "50%",
  cursor: "pointer",
  zIndex: 10,
};

/**
 * Compute which handle positions face cluster-related neighbors.
 *
 * For collapsed clusters: detects edges to aggregate nodes.
 * For expanded clusters: detects edges to nodes that are members of an expanded cluster.
 *
 * Returns a map from Position → Set<clusterId>.
 */
function useHandleClusterPositions(nodeId: string): Map<Position, Set<string>> {
  const rf = useReactFlow();
  const edges = useGraphStore((s) => s.edges);
  const latestClusters = useGraphStore((s) => s.latestClusters);
  const expandedClusters = useGraphStore((s) => s.expandedClusters);
  // Subscribe to nodes so we recompute after layout positions change
  const nodes = useGraphStore((s) => s.nodes);

  return useMemo(() => {
    const result = new Map<Position, Set<string>>();

    const thisNode = rf.getInternalNode(nodeId);
    if (!thisNode) return result;

    // Build cluster membership: nodeId → clusterId (for expanded clusters)
    const memberToCluster = new Map<string, string>();
    for (const [clusterId, cluster] of latestClusters) {
      if (!expandedClusters.has(clusterId)) continue; // only expanded
      for (const memberId of cluster.memberNodeIds) {
        memberToCluster.set(memberId, clusterId);
      }
    }

    // Find edges connected to this node
    for (const edge of edges) {
      const neighborId =
        edge.source === nodeId
          ? edge.target
          : edge.target === nodeId
            ? edge.source
            : null;
      if (!neighborId) continue;

      let clusterId: string | null = null;

      // Collapsed cluster: neighbor is an aggregate node
      if (neighborId.startsWith("aggregate:")) {
        clusterId = neighborId.slice("aggregate:".length);
      } else {
        // Expanded cluster: neighbor is a member of an expanded cluster
        const membership = memberToCluster.get(neighborId);
        if (membership) clusterId = membership;
      }

      if (!clusterId) continue;

      // Compute which handle position faces this neighbor
      const neighborNode = rf.getInternalNode(neighborId);
      if (!neighborNode) continue;

      const position = getClosestSide(thisNode, neighborNode);
      if (!result.has(position)) result.set(position, new Set());
      result.get(position)!.add(clusterId);
    }

    return result;
    // nodes is used as a dep to recompute after layout
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId, edges, latestClusters, expandedClusters, nodes, rf]);
}

const ALL_POSITIONS = [
  Position.Top,
  Position.Right,
  Position.Bottom,
  Position.Left,
] as const;

function NodeHandles({ nodeId }: { nodeId?: string }) {
  const clusterUx = useGraphStore((s) => s.clusterUx);
  const toggleCluster = useGraphStore((s) => s.toggleCluster);
  const positionClusters = useHandleClusterPositions(nodeId ?? "");

  const isHandleMode = clusterUx === "handle";

  return (
    <>
      {ALL_POSITIONS.map((pos) => {
        const clusterIds = isHandleMode ? positionClusters.get(pos) : undefined;
        const isCluster = clusterIds && clusterIds.size > 0;

        const handleClick = isCluster
          ? (e: React.MouseEvent) => {
              e.stopPropagation();
              for (const id of clusterIds) toggleCluster(id);
            }
          : undefined;

        return (
          <Handle
            key={`s-${pos}`}
            type="source"
            position={pos}
            style={isCluster ? CLUSTER_HANDLE_STYLE : undefined}
            onClick={handleClick}
          />
        );
      })}
      {ALL_POSITIONS.map((pos) => {
        const clusterIds = isHandleMode ? positionClusters.get(pos) : undefined;
        const isCluster = clusterIds && clusterIds.size > 0;

        const handleClick = isCluster
          ? (e: React.MouseEvent) => {
              e.stopPropagation();
              for (const id of clusterIds) toggleCluster(id);
            }
          : undefined;

        return (
          <Handle
            key={`t-${pos}`}
            type="target"
            position={pos}
            style={isCluster ? CLUSTER_HANDLE_STYLE : undefined}
            onClick={handleClick}
          />
        );
      })}
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
  showType: boolean; // two-line: type label + name
  px: string;
  py: string;
  minW?: string;
}

const COMPACT_STYLES: Record<VisualRole, CompactStyle> = {
  orchestrator: {
    radius: "lg",
    showType: true,
    px: "2.5",
    py: "1",
    minW: "60px",
  },
  connector: { radius: "md", showType: true, px: "2", py: "1", minW: "50px" },
  endpoint: { radius: "md", showType: true, px: "2", py: "0.5", minW: "40px" },
  resource: { radius: "full", showType: false, px: "2", py: "0.5" },
  mapper: { radius: "xl", showType: false, px: "2", py: "0.5" },
  policy: { radius: "md", showType: true, px: "2", py: "0.5" },
  artifact: { radius: "sm", showType: false, px: "1.5", py: "0.5" },
};

function CompactNode({
  data,
  selected,
  nodeId,
}: {
  data: GraphNodeData;
  selected?: boolean;
  nodeId?: string;
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
      <Text
        fontSize="2xs"
        fontWeight="semibold"
        color="white"
        lineHeight="1.2"
        truncate
      >
        {data.label}
      </Text>

      <NodeHandles nodeId={nodeId} />
    </Box>
  );
}

// ─── Full detail level ────────────────────────────────────────────────────────

export function BaseNode({
  id: nodeId,
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
  const clusterUx = useGraphStore((s) => s.clusterUx);
  const expandedClusters = useGraphStore((s) => s.expandedClusters);
  const toggleCluster = useGraphStore((s) => s.toggleCluster);

  // A+C: detect anchor cluster metadata
  const anchorCluster = (data.raw as Record<string, unknown> | undefined)
    ?._anchorCluster as AnchorClusterInfo | undefined;

  const isAnchor = clusterUx === "anchor" && !!anchorCluster;
  const isAnchorExpanded =
    isAnchor && expandedClusters.has(anchorCluster!.anchorClusterId);

  const handleToggleAnchorCluster = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (anchorCluster?.anchorClusterId) {
        toggleCluster(anchorCluster.anchorClusterId);
      }
    },
    [anchorCluster, toggleCluster],
  );

  // --- Dot level: colored shape only ---
  if (zoomDetail === "dot") {
    return <DotNode data={data} selected={selected} />;
  }

  // --- Compact level: color-filled shape with label ---
  if (zoomDetail === "compact") {
    return <CompactNode data={data} selected={selected} nodeId={nodeId} />;
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

      {/* A+C: Anchor cluster toggle — shows collapse/expand button */}
      {isAnchor && (
        <IconButton
          aria-label={isAnchorExpanded ? "Collapse cluster" : "Expand cluster"}
          size="2xs"
          variant="surface"
          colorPalette="yellow"
          position="absolute"
          bottom="-3"
          right="-3"
          rounded="full"
          onClick={handleToggleAnchorCluster}
        >
          {isAnchorExpanded ? <LuFoldVertical /> : <LuUnfoldVertical />}
        </IconButton>
      )}

      <NodeHandles nodeId={nodeId} />
    </Box>
  );
}
