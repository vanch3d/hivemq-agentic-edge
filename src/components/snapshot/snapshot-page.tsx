import { Box, Badge, Flex, Heading, Text } from "@chakra-ui/react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { useSnapshotStore } from "@/stores/snapshot-store";
import { formatRelativeTime } from "@/utils/format-relative-time";
import { SnapshotTable } from "./snapshot-table";
import { SnapshotJson } from "./snapshot-json";
import { SnapshotGraph } from "./snapshot-graph";

interface SnapshotPageProps {
  id: string;
}

export function SnapshotPage({ id }: SnapshotPageProps) {
  const { t } = useTranslation();
  const snapshot = useSnapshotStore((s) => s.getSnapshot(id));

  if (!snapshot) {
    return (
      <Flex align="center" justify="center" h="full" direction="column" gap="2">
        <Text color="fg.muted">{t("snapshot.notFound")}</Text>
        <Link to="/workspace">
          <Text color="blue.500" fontSize="sm">
            {t("nav.home")}
          </Text>
        </Link>
      </Flex>
    );
  }

  return (
    <Flex direction="column" h="full" overflow="hidden">
      <Flex
        align="center"
        gap="3"
        px="4"
        py="3"
        borderBottomWidth="1px"
        flexShrink={0}
      >
        <Heading size="md">{snapshot.label}</Heading>
        <Badge variant="subtle" size="sm">
          {formatRelativeTime(snapshot.timestamp)}
        </Badge>
      </Flex>

      <Box flex="1" overflow="auto" p="4">
        {snapshot.displayType === "table" && (
          <SnapshotTable data={snapshot.data as Record<string, unknown>[]} />
        )}
        {snapshot.displayType === "json" && (
          <SnapshotJson data={snapshot.data} />
        )}
        {snapshot.displayType === "graph" && snapshot.graphScope && (
          <SnapshotGraph
            scope={snapshot.graphScope}
            focusEntityId={snapshot.graphFocusEntityId}
          />
        )}
      </Box>
    </Flex>
  );
}
