import { Box, Spinner, Text } from "@chakra-ui/react";
import type { ToolCallPart, ToolResultPart } from "@tanstack/ai";
import { ChatTable } from "./chat-table";

interface ToolCallStatusProps {
  part: ToolCallPart;
}

export function ToolCallStatus({ part }: ToolCallStatusProps) {
  const isRunning = part.state === "pending" || part.state === "streaming";

  return (
    <Box display="flex" alignItems="center" gap="1" py="0.5">
      {isRunning && <Spinner size="xs" />}
      <Text fontSize="xs" color="fg.muted" fontStyle="italic">
        {part.name}
        {isRunning ? "…" : ""}
      </Text>
    </Box>
  );
}

interface ToolResultStatusProps {
  part: ToolResultPart;
}

export function ToolResultStatus({ part }: ToolResultStatusProps) {
  const result = part.result as { data: unknown; error?: string } | undefined;

  if (!result) {
    return (
      <Text fontSize="xs" color="fg.muted">
        {"\u2713"} {part.toolCallId}
      </Text>
    );
  }

  if (result.error) {
    return (
      <Text fontSize="xs" color="fg.error">
        {result.error}
      </Text>
    );
  }

  // Render arrays as tables if items are objects
  if (Array.isArray(result.data) && result.data.length > 0) {
    const first = result.data[0];
    if (typeof first === "object" && first !== null) {
      return <ChatTable data={result.data as Record<string, unknown>[]} />;
    }
  }

  // Fallback: JSON summary
  return (
    <Text fontSize="xs" color="fg.muted" whiteSpace="pre-wrap">
      {JSON.stringify(result.data, null, 2)}
    </Text>
  );
}
