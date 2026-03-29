import { Box, Button, Group, HStack, Text } from "@chakra-ui/react";
import {
  LuMaximize,
  LuArrowRightFromLine,
  LuArrowDownFromLine,
  LuNetwork,
  LuDatabase,
  LuSearch,
  LuUnfoldVertical,
  LuFoldVertical,
} from "react-icons/lu";
import { useReactFlow, useStore } from "@xyflow/react";
import { useTranslation } from "react-i18next";
import { useCallback, useMemo } from "react";

import { useGraphStore } from "@/graph/store";
import type { ViewScope } from "@/graph/types";
import { VIEW_SCOPES } from "@/graph/types";
import type { AggregateRaw } from "@/graph/clustering/types";
import { Slider } from "@/components/ui/slider";

const SCOPE_LABELS: Record<ViewScope, string> = {
  full: "Full",
  dataFlow: "Data Flow",
  adapterTopology: "Adapters",
  policyImpact: "Policies",
  bridgeTopology: "Bridges",
  combinerSources: "Combiners",
};

/** Round to 2 decimal places to avoid slider jitter */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.05;

const ZOOM_MARKS = [
  { value: 0.4, label: "0.4" },
  { value: 0.8, label: "0.8" },
  { value: 1, label: "1:1" },
];

export function GraphControls() {
  const { t } = useTranslation();
  const layoutDirection = useGraphStore((s) => s.layoutDirection);
  const setLayoutDirection = useGraphStore((s) => s.setLayoutDirection);
  const viewScope = useGraphStore((s) => s.viewScope);
  const setViewScope = useGraphStore((s) => s.setViewScope);
  const viewMode = useGraphStore((s) => s.viewMode);
  const setViewMode = useGraphStore((s) => s.setViewMode);
  const isLayoutPending = useGraphStore((s) => s.isLayoutPending);
  const clusterUx = useGraphStore((s) => s.clusterUx);
  const clusteringEnabled = useGraphStore((s) => s.clusteringEnabled);
  const expandedClusters = useGraphStore((s) => s.expandedClusters);
  const toggleCluster = useGraphStore((s) => s.toggleCluster);
  const nodes = useGraphStore((s) => s.nodes);
  const rf = useReactFlow();

  // Collect aggregate nodes for the cluster panel (A+C mode)
  const aggregateNodes = useMemo(() => {
    if (clusterUx !== "anchor" || !clusteringEnabled) return [];
    return nodes
      .filter((n) => n.data.entityType === "aggregate")
      .map((n) => {
        const raw = n.data.raw as unknown as AggregateRaw;
        return { id: raw.clusterId, label: n.data.label, raw };
      });
  }, [nodes, clusterUx, clusteringEnabled]);

  // Live zoom value from React Flow store (rounded to avoid noise)
  const zoom = useStore((s) => round2(s.transform[2]));

  const onZoomChange = useCallback(
    (details: { value: number[] }) => {
      const z = details.value[0];
      if (z != null) rf.zoomTo(z);
    },
    [rf],
  );

  const isSchema = viewMode === "schema";

  return (
    <Box
      p="2"
      borderTopWidth="1px"
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      flexWrap="wrap"
      gap="2"
    >
      {/* Left: View mode toggle + scope selector */}
      <HStack gap="2" flexWrap="wrap">
        {/* View mode toggle */}
        <Group attached>
          <Button
            size="xs"
            variant={isSchema ? "outline" : "solid"}
            onClick={() => setViewMode("instance")}
            title={t("graph.instanceView")}
            disabled={isLayoutPending}
          >
            <LuDatabase />
            {t("graph.instance")}
          </Button>
          <Button
            size="xs"
            variant={isSchema ? "solid" : "outline"}
            onClick={() => setViewMode("schema")}
            title={t("graph.schemaView")}
            disabled={isLayoutPending}
          >
            <LuNetwork />
            {t("graph.schema")}
          </Button>
        </Group>

        {/* Scope selector (only in instance mode) */}
        {!isSchema && (
          <Group attached>
            {VIEW_SCOPES.map((scope) => (
              <Button
                key={scope}
                size="xs"
                variant={viewScope === scope ? "solid" : "outline"}
                onClick={() => setViewScope(scope)}
                disabled={isLayoutPending}
              >
                {SCOPE_LABELS[scope]}
              </Button>
            ))}
          </Group>
        )}
      </HStack>

      {/* Center: Cluster panel (A+C mode) */}
      {clusterUx === "anchor" && aggregateNodes.length > 0 && (
        <HStack gap="1" flexWrap="wrap">
          {aggregateNodes.map((cluster) => {
            const isExpanded = expandedClusters.has(cluster.id);
            return (
              <Button
                key={cluster.id}
                size="2xs"
                variant={isExpanded ? "solid" : "outline"}
                colorPalette="yellow"
                onClick={() => toggleCluster(cluster.id)}
                disabled={isLayoutPending}
              >
                {isExpanded ? <LuFoldVertical /> : <LuUnfoldVertical />}
                {cluster.raw.memberCount}
              </Button>
            );
          })}
        </HStack>
      )}

      {/* Right: Zoom slider + layout controls */}
      <HStack gap="2">
        {/* Zoom slider with threshold markers */}
        <HStack gap="2" w="300px" flexShrink={0}>
          <Text
            fontSize="2xs"
            color="fg.muted"
            whiteSpace="nowrap"
            w="40px"
            textAlign="right"
          >
            {zoom.toFixed(2)}
          </Text>
          <Box flex="1" px="2" py="3">
            <Slider
              size="sm"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={ZOOM_STEP}
              value={[zoom]}
              onValueChange={onZoomChange}
              marks={ZOOM_MARKS}
            />
          </Box>
        </HStack>

        <Button
          size="xs"
          variant="ghost"
          onClick={() =>
            setLayoutDirection(layoutDirection === "LR" ? "TB" : "LR")
          }
          title={
            layoutDirection === "LR"
              ? "Switch to top-down layout"
              : "Switch to left-right layout"
          }
          disabled={isLayoutPending}
        >
          {layoutDirection === "LR" ? (
            <LuArrowDownFromLine />
          ) : (
            <LuArrowRightFromLine />
          )}
        </Button>
        <Button
          size="xs"
          variant="ghost"
          onClick={() => rf.zoomTo(1, { duration: 300 })}
          title="Zoom to 1:1"
        >
          <LuSearch />
          1:1
        </Button>
        <Button
          size="xs"
          variant="ghost"
          onClick={() => rf.fitView({ padding: 0.2 })}
          title="Fit view"
        >
          <LuMaximize />
        </Button>
      </HStack>
    </Box>
  );
}
