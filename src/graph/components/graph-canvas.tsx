import {
  ReactFlow,
  MiniMap,
  Panel,
  Background,
  BackgroundVariant,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "@/graph/graph-tokens.css";
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Box, IconButton, Spinner, Text } from "@chakra-ui/react";
import { LuX } from "react-icons/lu";

import { useColorMode } from "@/components/ui/color-mode";
import { useGraphStore, ANIM_DURATION } from "@/graph/store";
import { nodeTypes } from "./nodes";
import { edgeTypes } from "./edges";
import { GraphDetailPanel } from "./graph-detail-panel";

interface GraphCanvasProps {
  /** If true, shows MiniMap and allows more space */
  compact?: boolean;
}

export function GraphCanvas({ compact = false }: GraphCanvasProps) {
  const { t } = useTranslation();
  const { colorMode } = useColorMode();
  const rf = useReactFlow();
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const isLayoutPending = useGraphStore((s) => s.isLayoutPending);
  const animationPhase = useGraphStore((s) => s.animationPhase);
  const onNodesChange = useGraphStore((s) => s.onNodesChange);
  const onEdgesChange = useGraphStore((s) => s.onEdgesChange);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const selectNode = useGraphStore((s) => s.selectNode);

  // Animated fitView driven by store animation phase
  useEffect(() => {
    if (animationPhase === "enter") {
      // Nodes spread from origin — fitView after they settle
      const id = setTimeout(() => {
        rf.fitView({ padding: 0.2, duration: 300 });
      }, ANIM_DURATION);
      return () => clearTimeout(id);
    }
    if (animationPhase === "reposition") {
      // Nodes already have final positions — animate viewport in parallel with CSS transition
      rf.fitView({ padding: 0.2, duration: ANIM_DURATION });
    }
  }, [animationPhase, rf]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      selectNode(node.id);
    },
    [selectNode],
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const isInitialLoad = isLayoutPending && nodes.length === 0;

  return (
    <Box
      position="relative"
      width="100%"
      height="100%"
      className={[
        animationPhase !== "idle" && "layout-animating",
        (animationPhase === "enter" || animationPhase === "enter-settle") &&
          `layout-${animationPhase}`,
      ]
        .filter(Boolean)
        .join(" ") || undefined}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        colorMode={colorMode}
        minZoom={0.2}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color="var(--graph-bg-dots)"
        />
        {!compact && (
          <MiniMap
            nodeStrokeWidth={3}
            zoomable
            pannable
            style={{
              backgroundColor: "var(--graph-minimap-bg)",
            }}
            maskColor="var(--graph-minimap-mask)"
          />
        )}
        {selectedNodeId && (
          <Panel
            position="top-right"
            style={{
              margin: 8,
              /* Leave space for the minimap (~150px) + 15px gap to match minimap margin */
              maxHeight: "calc(100% - 16px - 175px)",
              display: "flex",
            }}
          >
            <Box
              w="280px"
              overflow="auto"
              bg="bg.panel"
              borderWidth="1px"
              borderRadius="md"
              shadow="md"
              position="relative"
            >
              <IconButton
                aria-label={t("graph.closePanel")}
                size="2xs"
                variant="ghost"
                position="absolute"
                top="2"
                right="2"
                onClick={() => selectNode(null)}
              >
                <LuX />
              </IconButton>
              <GraphDetailPanel />
            </Box>
          </Panel>
        )}
        {/* Arrow marker for edges — uses CSS custom property for dark mode */}
        <svg>
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 0 L 10 5 L 0 10 z"
                fill="var(--graph-edge-default)"
              />
            </marker>
          </defs>
        </svg>
      </ReactFlow>
      {isInitialLoad && (
        <Box
          position="absolute"
          inset="0"
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          bg="bg/80"
          zIndex={10}
          gap={3}
        >
          <Spinner size="lg" />
          <Text fontSize="sm" color="fg.muted">
            {t("graph.layoutPending")}
          </Text>
        </Box>
      )}
    </Box>
  );
}
