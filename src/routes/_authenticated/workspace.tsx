import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Flex, Box } from "@chakra-ui/react";
import { Toolbar } from "@/components/workspace/toolbar";
import { Sidebar } from "@/components/workspace/sidebar";

export const Route = createFileRoute("/_authenticated/workspace")({
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  return (
    <Flex direction="column" h="100vh">
      <Toolbar />
      <Flex flex="1" overflow="hidden">
        <Sidebar />
        <Box as="main" flex="1" overflow="auto" p="6">
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  );
}
