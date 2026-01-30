import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/context/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@chakra-ui/react";
import { LuHouse, LuLogOut } from "react-icons/lu";

const navItems = [{ to: "/workspace", label: "Home", icon: LuHouse }] as const;

export function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  return (
    <Flex
      as="aside"
      direction="column"
      w="240px"
      borderRightWidth="1px"
      flexShrink={0}
      h="full"
    >
      <Stack gap="1" p="2" flex="1">
        {navItems.map((item) => (
          <Button
            key={item.to}
            asChild
            variant={currentPath === item.to ? "subtle" : "ghost"}
            justifyContent="flex-start"
            size="sm"
          >
            <Link to={item.to}>
              <item.icon />
              <Text>{item.label}</Text>
            </Link>
          </Button>
        ))}
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
          <Text>Logout</Text>
        </Button>
      </Box>
    </Flex>
  );
}
