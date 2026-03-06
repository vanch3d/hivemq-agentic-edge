import { createFileRoute, Link } from "@tanstack/react-router";
import { Box, Button, Flex, Heading, Stack, Text } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { LuSearch, LuX } from "react-icons/lu";
import { useSnapshotStore } from "@/stores/snapshot-store";
import { formatRelativeTime } from "@/utils/format-relative-time";

export const Route = createFileRoute("/_authenticated/workspace/snapshots")({
  component: SnapshotsPage,
});

function SnapshotsPage() {
  const { t } = useTranslation();
  const snapshots = useSnapshotStore((s) => s.snapshots);
  const clearAll = useSnapshotStore((s) => s.clearAll);

  return (
    <Box>
      <Flex align="center" justify="space-between" mb="6">
        <Heading size="xl">{t("snapshot.recentQueries")}</Heading>
        {snapshots.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <LuX />
            {t("snapshot.clearAll")}
          </Button>
        )}
      </Flex>

      {snapshots.length === 0 ? (
        <Text color="fg.muted">{t("snapshot.noData")}</Text>
      ) : (
        <Stack gap="2">
          {snapshots.map((snap) => (
            <Button
              key={snap.id}
              asChild
              variant="outline"
              justifyContent="flex-start"
              size="sm"
              w="full"
            >
              <Link to="/workspace/snapshot/$id" params={{ id: snap.id }}>
                <LuSearch />
                <Text flex="1" truncate textAlign="start">
                  {snap.label}
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  {formatRelativeTime(snap.timestamp)}
                </Text>
              </Link>
            </Button>
          ))}
        </Stack>
      )}
    </Box>
  );
}
