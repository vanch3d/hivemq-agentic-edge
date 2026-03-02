import { Box, Flex, Spinner, Text } from "@chakra-ui/react";
import { ReactFlowProvider } from "@xyflow/react";
import { useTranslation } from "react-i18next";

import { useGraphStore } from "@/graph/store";
import { useGraphData } from "@/graph/use-graph-data";
import { GraphCanvas } from "./graph-canvas";
import { GraphControls } from "./graph-controls";
import { GraphLegend } from "./graph-legend";

export function GraphPage() {
  const { t } = useTranslation();
  const { isLoading, hasError } = useGraphData();
  const isAssembled = useGraphStore((s) => s.isAssembled);
  const viewMode = useGraphStore((s) => s.viewMode);
  const nodeCount = useGraphStore((s) => s.nodes.length);
  const isLayoutPending = useGraphStore((s) => s.isLayoutPending);

  // Schema view doesn't depend on API data
  const showLoading = viewMode !== "schema" && isLoading && !isAssembled;

  if (showLoading) {
    return (
      <Flex align="center" justify="center" h="full" gap="2">
        <Spinner size="sm" />
        <Text color="fg.muted">{t("graph.loading")}</Text>
      </Flex>
    );
  }

  if (viewMode !== "schema" && hasError && !isAssembled) {
    return (
      <Flex align="center" justify="center" h="full">
        <Text color="fg.error">{t("graph.error")}</Text>
      </Flex>
    );
  }

  // Show "empty" only when layout is done and there are truly no nodes
  if (nodeCount === 0 && !isLayoutPending) {
    return (
      <Flex align="center" justify="center" h="full">
        <Text color="fg.muted">{t("graph.empty")}</Text>
      </Flex>
    );
  }

  // Render full UI shell — canvas handles the layout-pending spinner overlay
  return (
    <ReactFlowProvider>
      <Flex h="full" w="full">
        {/* Main canvas area */}
        <Flex direction="column" flex="1" minW="0">
          <Box flex="1" position="relative">
            <GraphCanvas />
          </Box>
          <GraphControls />
          {viewMode !== "schema" && <GraphLegend />}
        </Flex>
      </Flex>
    </ReactFlowProvider>
  );
}
