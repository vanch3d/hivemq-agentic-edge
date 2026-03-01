import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@chakra-ui/react";
import { LuLogOut, LuNetwork, LuSearch, LuX } from "react-icons/lu";
import { useSnapshotStore } from "@/stores/snapshot-store";
import { formatRelativeTime } from "@/utils/format-relative-time";

export function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const snapshots = useSnapshotStore((s) => s.snapshots);
  const clearAll = useSnapshotStore((s) => s.clearAll);

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  const isGraphActive =
    currentPath === "/workspace/graph" || currentPath === "/workspace";

  return (
    <Flex
      as="aside"
      direction="column"
      w="240px"
      borderRightWidth="1px"
      flexShrink={0}
      h="full"
    >
      <Stack gap="1" p="2" flex="1" overflow="hidden">
        <Button
          asChild
          variant={isGraphActive ? "subtle" : "ghost"}
          justifyContent="flex-start"
          size="sm"
        >
          <Link to="/workspace/graph">
            <LuNetwork />
            <Text>{t("nav.graph")}</Text>
          </Link>
        </Button>

        {snapshots.length > 0 && (
          <Box mt="3" overflow="hidden" display="flex" flexDirection="column">
            <Flex
              align="center"
              justify="space-between"
              px="2"
              mb="1"
              flexShrink={0}
            >
              <Text fontSize="xs" fontWeight="medium" color="fg.muted">
                {t("snapshot.recentQueries")}
              </Text>
              <Button
                variant="ghost"
                size="xs"
                onClick={clearAll}
                aria-label={t("snapshot.clearAll")}
                px="1"
                h="auto"
                minW="auto"
              >
                <LuX />
              </Button>
            </Flex>
            <Stack gap="0.5" overflow="auto" flex="1">
              {snapshots.map((snap) => {
                const isActive =
                  currentPath === `/workspace/snapshot/${snap.id}`;
                return (
                  <Button
                    key={snap.id}
                    asChild
                    variant={isActive ? "subtle" : "ghost"}
                    justifyContent="flex-start"
                    size="xs"
                    w="full"
                  >
                    <Link to="/workspace/snapshot/$id" params={{ id: snap.id }}>
                      <LuSearch />
                      <Box
                        flex="1"
                        overflow="hidden"
                        display="flex"
                        flexDirection="column"
                        alignItems="flex-start"
                      >
                        <Text fontSize="xs" truncate lineHeight="short">
                          {snap.label}
                        </Text>
                        <Text
                          fontSize="2xs"
                          color="fg.muted"
                          lineHeight="short"
                        >
                          {formatRelativeTime(snap.timestamp)}
                        </Text>
                      </Box>
                    </Link>
                  </Button>
                );
              })}
            </Stack>
          </Box>
        )}
      </Stack>

      <Box p="2" borderTopWidth="1px">
        <Button
          variant="ghost"
          w="full"
          justifyContent="flex-start"
          size="sm"
          onClick={handleLogout}
        >
          <LuLogOut />
          <Text>{t("nav.logout")}</Text>
        </Button>
      </Box>
    </Flex>
  );
}
