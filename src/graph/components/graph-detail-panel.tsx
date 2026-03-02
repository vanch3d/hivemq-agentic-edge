import { Box, Badge, Text, Stack } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";

import { useGraphStore } from "@/graph/store";
import { ENTITY_COLORS, ENTITY_LABELS } from "@/graph/constants";

export function GraphDetailPanel() {
  const { t } = useTranslation();
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const nodes = useGraphStore((s) => s.nodes);

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId)
    : null;

  if (!selectedNode) {
    return null;
  }

  const { data } = selectedNode;

  return (
    <Stack p="4" gap="3" overflow="auto">
      <Badge
        bg={ENTITY_COLORS[data.entityType]}
        color="white"
        alignSelf="flex-start"
      >
        {ENTITY_LABELS[data.entityType]}
      </Badge>

      <Text fontWeight="semibold">{data.label}</Text>

      {data.sublabel && (
        <Text fontSize="sm" color="fg.muted">
          {data.sublabel}
        </Text>
      )}

      {data.status && (
        <Box>
          <Text fontSize="xs" fontWeight="medium" mb="1">
            {t("graph.status")}
          </Text>
          {data.status.connection && (
            <Text fontSize="xs" color="fg.muted">
              {t("graph.connection", { value: data.status.connection })}
            </Text>
          )}
          {data.status.runtime && (
            <Text fontSize="xs" color="fg.muted">
              {t("graph.runtime", { value: data.status.runtime })}
            </Text>
          )}
        </Box>
      )}

      {/* Raw entity data */}
      <Box>
        <Text fontSize="xs" fontWeight="medium" mb="1">
          {t("graph.properties")}
        </Text>
        <Box
          fontSize="2xs"
          fontFamily="mono"
          bg="bg.subtle"
          p="2"
          borderRadius="md"
          whiteSpace="pre-wrap"
          wordBreak="break-all"
        >
          {JSON.stringify(data.raw, null, 2)}
        </Box>
      </Box>
    </Stack>
  );
}
