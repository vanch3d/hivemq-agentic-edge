import { Box, Flex, Heading, Text, IconButton, Badge } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { useLocalStorage } from "@uidotdev/usehooks";
import { LuX } from "react-icons/lu";
import {
  DrawerRoot,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseTrigger,
} from "@/components/ui/drawer";
import { useChatContext } from "@/context/chat-context";
import { useSettings } from "@/hooks/use-settings";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { ChatForm } from "./chat-form";
import { ApprovalCard } from "./approval-card";

/** Extract a human-readable message from the error object / nested JSON. */
function formatError(error: Error): string {
  const raw = error.message;
  // The SSE RUN_ERROR often embeds a JSON string like '400 {"type":"error","error":{"message":"..."}}'
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      // Anthropic shape: { error: { message: "..." } }
      if (
        parsed["error"] &&
        typeof parsed["error"] === "object" &&
        parsed["error"] !== null &&
        "message" in parsed["error"]
      ) {
        return (parsed["error"] as { message: string }).message;
      }
      // Generic shape: { message: "..." }
      if (typeof parsed["message"] === "string") {
        return parsed["message"];
      }
    } catch {
      // fall through
    }
  }
  return raw;
}

function useProviderLabel(): string {
  const { data } = useSettings();
  const [stored] = useLocalStorage<Record<string, unknown>>("app-settings", {});
  const ai = {
    ...(data?.formData?.ai as Record<string, unknown> | undefined),
    ...(stored?.ai as Record<string, unknown> | undefined),
  };
  return (ai?.provider as string) ?? "anthropic";
}

export function ChatDrawer() {
  const {
    isOpen,
    onClose,
    messages,
    activeForm,
    activeApproval,
    error,
    dismissError,
    model,
    isLoading,
  } = useChatContext();
  const { t } = useTranslation();
  const provider = useProviderLabel();

  return (
    <DrawerRoot
      open={isOpen}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      placement="end"
      size="sm"
    >
      <DrawerContent
        portalled={false}
        w="400px"
        maxW="400px"
        h="100%"
        borderLeftWidth="1px"
        shadow="none"
      >
        <DrawerHeader borderBottomWidth="1px" py="2" px="3">
          <Flex align="center" gap="2">
            <Heading size="sm">{t("chat.title")}</Heading>
            <Badge
              size="xs"
              variant="outline"
              fontWeight="normal"
              colorPalette={error ? "red" : model ? "green" : "blue"}
            >
              {model ?? provider}
            </Badge>
          </Flex>
        </DrawerHeader>
        <DrawerCloseTrigger />
        <DrawerBody p="0" display="flex" flexDirection="column">
          <Flex direction="column" flex="1" overflow="hidden">
            <MessageList messages={messages} isLoading={isLoading} />
            {error && (
              <Box
                px="3"
                py="2"
                bg="bg.error"
                color="fg.error"
                borderTopWidth="1px"
                borderColor="border.error"
              >
                <Flex justify="space-between" align="start" gap="2">
                  <Box>
                    <Text fontSize="xs" fontWeight="semibold">
                      {t("chat.error")}
                    </Text>
                    <Text fontSize="xs">{formatError(error)}</Text>
                  </Box>
                  <IconButton
                    aria-label={t("chat.dismissError")}
                    size="2xs"
                    variant="ghost"
                    onClick={dismissError}
                  >
                    <LuX />
                  </IconButton>
                </Flex>
              </Box>
            )}
            {activeForm && (
              <Box px="3" py="2" borderTopWidth="1px">
                <ChatForm
                  schema={activeForm.schema}
                  title={activeForm.title}
                  formData={activeForm.formData}
                  requiredOnly={activeForm.requiredOnly}
                  onSubmit={(data) => {
                    activeForm.resolve({ submitted: true, data });
                  }}
                  onCancel={() => {
                    activeForm.resolve({ submitted: false });
                  }}
                />
              </Box>
            )}
            {activeApproval && (
              <Box px="3" py="2" borderTopWidth="1px">
                <ApprovalCard
                  title={activeApproval.title}
                  description={activeApproval.description}
                  onApprove={() => activeApproval.resolve(true)}
                  onReject={() => activeApproval.resolve(false)}
                />
              </Box>
            )}
            <ChatInput />
          </Flex>
        </DrawerBody>
      </DrawerContent>
    </DrawerRoot>
  );
}
