import { IconButton } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { LuMessageSquare } from "react-icons/lu";
import { useChatContext } from "@/context/chat-context";

export function ChatToggleButton() {
  const { onToggle } = useChatContext();
  const { t } = useTranslation();

  return (
    <IconButton
      aria-label={t("chat.toggle")}
      variant="ghost"
      size="sm"
      onClick={onToggle}
    >
      <LuMessageSquare />
    </IconButton>
  );
}
