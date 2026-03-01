import { Box, Spinner, Text } from "@chakra-ui/react";
import type { ToolCallPart, ToolResultPart } from "@tanstack/ai";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ChatTable } from "./chat-table";
import { ChatGraph } from "@/graph/components/chat-graph";

interface ToolCallStatusProps {
  part: ToolCallPart;
}

export function ToolCallStatus({ part }: ToolCallStatusProps) {
  const isRunning =
    part.state === "awaiting-input" || part.state === "input-streaming";

  return (
    <Box display="flex" alignItems="center" gap="1" py="0.5">
      {isRunning && <Spinner size="xs" />}
      <Text fontSize="xs" color="fg.muted" fontStyle="italic">
        {part.name}
        {isRunning ? "\u2026" : ""}
      </Text>
    </Box>
  );
}

interface ToolResultStatusProps {
  part: ToolResultPart;
}

export function ToolResultStatus({ part }: ToolResultStatusProps) {
  const { t } = useTranslation();

  if (part.error) {
    return (
      <Text fontSize="xs" color="fg.error">
        {part.error}
      </Text>
    );
  }

  if (!part.content) {
    return (
      <Text fontSize="xs" color="fg.muted">
        {"\u2713"} {part.toolCallId}
      </Text>
    );
  }

  // Parse the JSON string content
  let parsed: unknown;
  try {
    parsed = JSON.parse(part.content);
  } catch {
    return (
      <Text fontSize="xs" color="fg.muted" whiteSpace="pre-wrap">
        {part.content}
      </Text>
    );
  }

  // Tools return { data, error?, display?, snapshotId? }
  const result = parsed as {
    data?: unknown;
    error?: string;
    display?: string;
    snapshotId?: string;
  };

  if (result.error) {
    return (
      <Text fontSize="xs" color="fg.error">
        {result.error}
      </Text>
    );
  }

  const snapshotLink = result.snapshotId ? (
    <Box pt="1">
      <Link to="/workspace/snapshot/$id" params={{ id: result.snapshotId }}>
        <Text fontSize="xs" color="blue.500" cursor="pointer">
          {t("snapshot.openFullView")}
        </Text>
      </Link>
    </Box>
  ) : null;

  // Graph display type
  if (result.display === "graph") {
    return (
      <>
        <ChatGraph />
        {snapshotLink}
      </>
    );
  }

  // Render arrays as tables if items are objects
  if (Array.isArray(result.data) && result.data.length > 0) {
    const first = result.data[0];
    if (typeof first === "object" && first !== null) {
      return (
        <>
          <ChatTable data={result.data as Record<string, unknown>[]} />
          {snapshotLink}
        </>
      );
    }
  }

  // Fallback: JSON summary
  return (
    <>
      <Text fontSize="xs" color="fg.muted" whiteSpace="pre-wrap">
        {JSON.stringify(result.data ?? parsed, null, 2)}
      </Text>
      {snapshotLink}
    </>
  );
}
