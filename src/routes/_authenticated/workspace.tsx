import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Flex, Box } from "@chakra-ui/react";
import { Toolbar } from "@/components/workspace/toolbar";
import { Sidebar } from "@/components/workspace/sidebar";
import { ChatProvider } from "@/context/chat-context";
import { ChatDrawer } from "@/components/chat/chat-drawer";
import { ChatErrorBoundary } from "@/components/chat/chat-error-boundary";
import { useGraphData } from "@/graph/use-graph-data";

export const Route = createFileRoute("/_authenticated/workspace")({
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  // Warm up graph data in the background so it's ready when user navigates to /workspace/graph
  useGraphData();

  return (
    <ChatErrorBoundary>
      <ChatProvider>
        <Flex direction="column" h="100vh">
          <Toolbar />
          <Flex flex="1" overflow="hidden">
            <Sidebar />
            <Box as="main" flex="1" overflow="auto" p="6">
              <Outlet />
            </Box>
            <ChatDrawer />
          </Flex>
        </Flex>
      </ChatProvider>
    </ChatErrorBoundary>
  );
}
