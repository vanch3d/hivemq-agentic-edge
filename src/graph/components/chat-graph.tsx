import { Box, Spinner, Text } from "@chakra-ui/react";
import { ReactFlowProvider } from "@xyflow/react";
import { useTranslation } from "react-i18next";

import { useGraphStore } from "@/graph/store";
import { GraphCanvas } from "./graph-canvas";

/**
 * Compact graph renderer for inline chat tool results.
 * Reads from the same Zustand store as the full page.
 */
export function ChatGraph() {
  const { t } = useTranslation();
  const isAssembled = useGraphStore((s) => s.isAssembled);
  const nodeCount = useGraphStore((s) => s.nodes.length);

  if (!isAssembled) {
    return (
      <Box display="flex" alignItems="center" gap="2" py="2" color="fg.muted">
        <Spinner size="xs" />
        <Text fontSize="xs">{t("graph.loadingCompact")}</Text>
      </Box>
    );
  }

  if (nodeCount === 0) {
    return (
      <Text fontSize="xs" color="fg.muted">
        {t("graph.empty")}
      </Text>
    );
  }

  return (
    <ReactFlowProvider>
      <Box
        w="100%"
        h="300px"
        borderWidth="1px"
        borderRadius="md"
        overflow="hidden"
      >
        <GraphCanvas compact />
      </Box>
    </ReactFlowProvider>
  );
}
