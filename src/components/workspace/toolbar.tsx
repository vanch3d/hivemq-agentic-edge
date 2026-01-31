import { Flex, Heading, Text } from "@chakra-ui/react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/auth-context";
import { ColorModeButton } from "@/components/ui/color-mode";
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuTrigger,
} from "@/components/ui/menu";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@chakra-ui/react";
import { LuLogOut } from "react-icons/lu";
import { ChatToggleButton } from "@/components/chat/chat-toggle-button";

export function Toolbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

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
      <Heading size="md">{t("app.title")}</Heading>

      <Flex align="center" gap="2">
        <ChatToggleButton />
        <ColorModeButton />
        <MenuRoot>
          <MenuTrigger asChild>
            <Button variant="ghost" size="sm" p="1">
              <Avatar name={user?.username} size="xs" />
              <Text fontSize="sm" display={{ base: "none", md: "block" }}>
                {user?.username}
              </Text>
            </Button>
          </MenuTrigger>
          <MenuContent>
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
