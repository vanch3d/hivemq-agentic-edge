import {
  ReactFlow,
  MiniMap,
  Background,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "@/graph/graph-tokens.css";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Box, Spinner, Text } from "@chakra-ui/react";

import { useColorMode } from "@/components/ui/color-mode";
import { useGraphStore } from "@/graph/store";
import { nodeTypes } from "./nodes";
import { edgeTypes } from "./edges";

interface GraphCanvasProps {
  /** If true, shows MiniMap and allows more space */
  compact?: boolean;
}

export function GraphCanvas({ compact = false }: GraphCanvasProps) {
  const { t } = useTranslation();
  const { colorMode } = useColorMode();
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const isLayoutPending = useGraphStore((s) => s.isLayoutPending);
  const onNodesChange = useGraphStore((s) => s.onNodesChange);
  const onEdgesChange = useGraphStore((s) => s.onEdgesChange);
  const selectNode = useGraphStore((s) => s.selectNode);

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
    <Box position="relative" width="100%" height="100%">
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
        fitView
        fitViewOptions={{ padding: 0.2 }}
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
