import { Flex, Textarea, IconButton } from "@chakra-ui/react";
import { useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { LuSend } from "react-icons/lu";
import { useChatContext } from "@/context/chat-context";

export function ChatInput() {
  const { sendMessage, isLoading } = useChatContext();
  const [input, setInput] = useState("");
  const { t } = useTranslation();

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      sendMessage(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Flex gap="2" p="3" borderTopWidth="1px">
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("chat.inputPlaceholder")}
        size="sm"
        resize="none"
        rows={2}
        flex="1"
      />
      <IconButton
        aria-label={t("chat.send")}
        onClick={handleSend}
        disabled={!input.trim() || isLoading}
        size="sm"
        alignSelf="flex-end"
      >
        <LuSend />
      </IconButton>
    </Flex>
  );
}
