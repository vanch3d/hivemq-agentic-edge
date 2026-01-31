import { Flex } from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import type { UIMessage } from "@tanstack/ai";
import { MessageBubble } from "./message-bubble";

export function MessageList({ messages }: { messages: UIMessage[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Flex direction="column" gap="3" flex="1" overflow="auto" px="3" py="2">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={endRef} />
    </Flex>
  );
}
