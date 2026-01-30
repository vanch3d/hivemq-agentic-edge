import { createFileRoute } from "@tanstack/react-router";
import { Heading, Text, Box } from "@chakra-ui/react";

export const Route = createFileRoute("/_authenticated/workspace/")({
  component: WorkspaceIndex,
});

function WorkspaceIndex() {
  return (
    <Box>
      <Heading size="xl" mb="2">
        Workspace
      </Heading>
      <Text color="fg.muted">
        Select an item from the sidebar to get started.
      </Text>
    </Box>
  );
}
