import { Box, Flex, Spinner, Text } from "@chakra-ui/react";
import { ReactFlowProvider } from "@xyflow/react";
import { useTranslation } from "react-i18next";

import { useGraphStore } from "@/graph/store";
import { useGraphData } from "@/graph/use-graph-data";
import { GraphCanvas } from "./graph-canvas";
import { GraphControls } from "./graph-controls";
import { GraphLegend } from "./graph-legend";
import { GraphDetailPanel } from "./graph-detail-panel";

export function GraphPage() {
  const { t } = useTranslation();
  const { isLoading, hasError } = useGraphData();
  const isAssembled = useGraphStore((s) => s.isAssembled);
  const nodeCount = useGraphStore((s) => s.nodes.length);

  if (isLoading && !isAssembled) {
    return (
      <Flex align="center" justify="center" h="full" gap="2">
        <Spinner size="sm" />
        <Text color="fg.muted">{t("graph.loading")}</Text>
      </Flex>
    );
  }

  if (hasError && !isAssembled) {
    return (
      <Flex align="center" justify="center" h="full">
        <Text color="fg.error">{t("graph.error")}</Text>
      </Flex>
    );
  }

  if (nodeCount === 0) {
    return (
      <Flex align="center" justify="center" h="full">
        <Text color="fg.muted">{t("graph.empty")}</Text>
      </Flex>
    );
  }

  return (
    <ReactFlowProvider>
      <Flex h="full" w="full">
        {/* Main canvas area */}
        <Flex direction="column" flex="1" minW="0">
          <Box flex="1" position="relative">
            <GraphCanvas />
          </Box>
          <GraphControls />
          <GraphLegend />
        </Flex>

        {/* Detail panel (right side) */}
        <Box
          w="280px"
          borderLeftWidth="1px"
          overflow="auto"
          display={{ base: "none", lg: "block" }}
        >
          <GraphDetailPanel />
        </Box>
      </Flex>
    </ReactFlowProvider>
  );
}
