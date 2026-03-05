import { Flex, Text } from "@chakra-ui/react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/auth-context";
import { ColorModeButton } from "@/components/ui/color-mode";
import { AppLogo } from "@/components/app-logo";
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuTrigger,
} from "@/components/ui/menu";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@chakra-ui/react";
import {
  LuChevronDown,
  LuHistory,
  LuLogOut,
  LuNetwork,
  LuSettings,
} from "react-icons/lu";

export function Toolbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const currentPath = useRouterState({
    select: (s) => s.location.pathname,
  });

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  const isGraphActive =
    currentPath === "/workspace/graph" || currentPath === "/workspace";
  const isSnapshotsActive = currentPath === "/workspace/snapshots";

  return (
    <Flex
      as="header"
      align="center"
      justify="space-between"
      h="14"
      px="4"
      borderBottomWidth="1px"
      flexShrink={0}
    >
      <Flex align="center" gap="1">
        <AppLogo
          h="12"
          w="auto"
          aria-label={t("app.title")}
          color="fg"
        />
        <Button
          asChild
          variant={isGraphActive ? "subtle" : "ghost"}
          size="sm"
        >
          <Link to="/workspace/graph">
            <LuNetwork />
            <Text display={{ base: "none", md: "block" }}>
              {t("nav.graph")}
            </Text>
          </Link>
        </Button>
        <Button
          asChild
          variant={isSnapshotsActive ? "subtle" : "ghost"}
          size="sm"
        >
          <Link to="/workspace/snapshots">
            <LuHistory />
            <Text display={{ base: "none", md: "block" }}>
              {t("nav.snapshots")}
            </Text>
          </Link>
        </Button>
      </Flex>

      <Flex align="center" gap="2">
        <ColorModeButton />
        <MenuRoot>
          <MenuTrigger asChild>
            <Button variant="ghost" size="sm" p="1">
              <Avatar name={user?.username} size="xs" />
              <Text fontSize="sm" display={{ base: "none", md: "block" }}>
                {user?.username}
              </Text>
              <LuChevronDown />
            </Button>
          </MenuTrigger>
          <MenuContent>
            <MenuItem
              value="configuration"
              onClick={() => navigate({ to: "/workspace/configuration" })}
            >
              <LuSettings />
              {t("nav.configuration")}
            </MenuItem>
            <MenuItem value="logout" onClick={handleLogout}>
              <LuLogOut />
              {t("nav.logout")}
            </MenuItem>
          </MenuContent>
        </MenuRoot>
      </Flex>
    </Flex>
  );
}
