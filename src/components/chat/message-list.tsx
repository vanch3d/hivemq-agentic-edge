import { Box, Flex, Spinner, Text } from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { UIMessage } from "@tanstack/ai";
import { MessageBubble } from "./message-bubble";

interface MessageListProps {
  messages: UIMessage[];
  isLoading?: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Show the loading indicator when the assistant hasn't started streaming yet.
  // useChat may insert a placeholder assistant message before any content arrives,
  // so we also check whether the last assistant message has any non-empty parts.
  const lastMessage = messages[messages.length - 1];
  const assistantHasContent =
    lastMessage?.role === "assistant" &&
    lastMessage.parts?.some(
      (p) =>
        (p.type === "text" && p.content.length > 0) || p.type === "tool-call",
    );
  const showLoading = isLoading && !assistantHasContent;

  return (
    <Flex direction="column" gap="3" flex="1" overflow="auto" px="3" py="2">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {showLoading && (
        <Box
          alignSelf="flex-start"
          display="flex"
          alignItems="center"
          gap="2"
          px="3"
          py="2"
        >
          <Spinner size="xs" />
          <Text fontSize="xs" color="fg.muted" fontStyle="italic">
            {t("chat.loading")}
          </Text>
        </Box>
      )}
      <div ref={endRef} />
    </Flex>
  );
}
