import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Flex, Box } from "@chakra-ui/react";
import { Toolbar } from "@/components/workspace/toolbar";
import { ChatProvider } from "@/context/chat-context";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ChatErrorBoundary } from "@/components/chat/chat-error-boundary";
import { useGraphData } from "@/graph/use-graph-data";
import {
  Splitter,
  SplitterPanel,
  SplitterResizeTrigger,
} from "@/components/ui/splitter";

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
          <Splitter
            orientation="horizontal"
            defaultSize={[35, 65]}
            panels={[
              { id: "chat", minSize: 25, maxSize: 50 },
              { id: "content", minSize: 30 },
            ]}
            flex="1"
            overflow="hidden"
          >
            <SplitterPanel id="chat" overflow="hidden" display="flex">
              <ChatPanel />
            </SplitterPanel>
            <SplitterResizeTrigger
              id="chat:content"
              cursor="col-resize"
              display="flex"
              alignItems="center"
              justifyContent="center"
              px="0"
              w="6px"
              _hover={{ bg: "bg.subtle" }}
            >
              <Box
                h="40px"
                w="3px"
                borderRadius="full"
                bg="border.emphasized"
              />
            </SplitterResizeTrigger>
            <SplitterPanel id="content" overflow="hidden" display="flex">
              <Box as="main" flex="1" overflow="auto" p="6">
                <Outlet />
              </Box>
            </SplitterPanel>
          </Splitter>
        </Flex>
      </ChatProvider>
    </ChatErrorBoundary>
  );
}
