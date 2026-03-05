import { Box, Text } from "@chakra-ui/react";
import type { UIMessage } from "@tanstack/ai";
import { ToolCallStatus, ToolResultStatus } from "./tool-status";
import { ThinkingPart } from "./thinking-part";
import { ChatMarkdown } from "./chat-markdown";

export function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  const hasVisibleContent = message.parts.some(
    (p) =>
      (p.type === "text" && p.content) ||
      p.type === "thinking" ||
      p.type === "tool-call" ||
      p.type === "tool-result",
  );

  if (!hasVisibleContent) return null;

  return (
    <Box
      alignSelf={isUser ? "flex-end" : "flex-start"}
      maxW="85%"
      px="3"
      py="2"
      borderRadius="lg"
      bg={isUser ? "colorPalette.subtle" : "bg.muted"}
      colorPalette={isUser ? "blue" : undefined}
    >
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          if (!part.content) return null;

          if (isUser) {
            return (
              <Text key={i} fontSize="sm" whiteSpace="pre-wrap">
                {part.content}
              </Text>
            );
          }

          return <ChatMarkdown key={i} content={part.content} />;
        }
        if (part.type === "thinking") {
          return <ThinkingPart key={i} content={part.content} />;
        }
        if (part.type === "tool-call") {
          return <ToolCallStatus key={i} part={part} />;
        }
        if (part.type === "tool-result") {
          return <ToolResultStatus key={i} part={part} />;
        }
        return null;
      })}
    </Box>
  );
}
