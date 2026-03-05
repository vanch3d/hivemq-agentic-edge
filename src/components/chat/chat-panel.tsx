import { Box, Button, Flex, Heading, Text, IconButton, Badge } from "@chakra-ui/react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocalStorage } from "@uidotdev/usehooks";
import { LuMessageSquarePlus, LuX } from "react-icons/lu";
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
} from "@/components/ui/dialog";
import type { UIMessage } from "@tanstack/ai";
import type FormCore from "@rjsf/core";
import {
  Splitter,
  SplitterPanel,
  SplitterResizeTrigger,
} from "@/components/ui/splitter";
import { Tooltip } from "@/components/ui/tooltip";
import { useChatContext, type ActiveForm } from "@/context/chat-context";
import { useSettings } from "@/hooks/use-settings";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { ChatFormFields } from "./chat-form-fields";
import { ChatFormFooter } from "./chat-form-footer";
import { ApprovalCard } from "./approval-card";

/** Extract a human-readable message from the error object / nested JSON. */
function formatError(error: Error): string {
  const raw = error.message;
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      if (
        parsed["error"] &&
        typeof parsed["error"] === "object" &&
        parsed["error"] !== null &&
        "message" in parsed["error"]
      ) {
        return (parsed["error"] as { message: string }).message;
      }
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

function ErrorBox({
  error,
  onDismiss,
}: {
  error: Error;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  return (
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
          onClick={onDismiss}
        >
          <LuX />
        </IconButton>
      </Flex>
    </Box>
  );
}

/** Split view shown when an inline form is active. */
function FormSplitView({
  activeForm,
  messages,
  isLoading,
  error,
  dismissError,
}: {
  activeForm: ActiveForm;
  messages: UIMessage[];
  isLoading: boolean;
  error: Error | null;
  dismissError: () => void;
}) {
  const formRef = useRef<FormCore | null>(null);
  const [showAll, setShowAll] = useState(!activeForm.requiredOnly);

  return (
    <>
      <Splitter
        orientation="vertical"
        defaultSize={[50, 50]}
        panels={[
          { id: "messages", minSize: 20 },
          { id: "form", minSize: 20 },
        ]}
        flex="1"
        overflow="hidden"
      >
        <SplitterPanel id="messages" overflow="hidden" display="flex">
          <MessageList messages={messages} isLoading={isLoading} />
        </SplitterPanel>
        <SplitterResizeTrigger
          id="messages:form"
          cursor="row-resize"
          display="flex"
          alignItems="center"
          justifyContent="center"
          py="1"
          borderTopWidth="1px"
          borderBottomWidth="1px"
          _hover={{ bg: "bg.subtle" }}
        >
          <Box
            w="40px"
            h="3px"
            borderRadius="full"
            bg="border.emphasized"
          />
        </SplitterResizeTrigger>
        <SplitterPanel
          id="form"
          overflow="hidden"
          display="flex"
          flexDirection="column"
          minH="0"
        >
          <ChatFormFields
            schema={activeForm.schema}
            uiSchema={activeForm.uiSchema}
            title={activeForm.title}
            formData={activeForm.formData}
            showAll={showAll}
            formRef={formRef}
            onSubmit={(data) => {
              activeForm.resolve({ submitted: true, data });
            }}
          />
        </SplitterPanel>
      </Splitter>
      {error && <ErrorBox error={error} onDismiss={dismissError} />}
      <ChatFormFooter
        formRef={formRef}
        requiredOnly={activeForm.requiredOnly ?? false}
        showAll={showAll}
        onCancel={() => activeForm.resolve({ submitted: false })}
        onToggleShowAll={() => setShowAll(true)}
      />
    </>
  );
}

export function ChatPanel() {
  const {
    messages,
    activeForm,
    activeApproval,
    error,
    dismissError,
    model,
    isLoading,
    clear,
  } = useChatContext();
  const { t } = useTranslation();
  const provider = useProviderLabel();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const hasMessages = messages.length > 0;

  return (
    <Flex direction="column" h="full" w="full" borderRightWidth="1px">
      {/* Header */}
      <Flex
        align="center"
        justify="space-between"
        borderBottomWidth="1px"
        py="2"
        px="3"
        flexShrink={0}
      >
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
        <Tooltip content={t("chat.newConversation")}>
          <IconButton
            aria-label={t("chat.newConversation")}
            variant="ghost"
            size="xs"
            disabled={!hasMessages}
            onClick={() => setConfirmOpen(true)}
          >
            <LuMessageSquarePlus />
          </IconButton>
        </Tooltip>
      </Flex>

      {/* New conversation confirmation */}
      <DialogRoot
        open={confirmOpen}
        onOpenChange={(e) => setConfirmOpen(e.open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("chat.newConversationTitle")}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <DialogDescription>
              {t("chat.newConversationDescription")}
            </DialogDescription>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {t("chat.newConversationCancel")}
            </Button>
            <Button
              colorPalette="red"
              onClick={() => {
                clear();
                setConfirmOpen(false);
              }}
            >
              {t("chat.newConversationConfirm")}
            </Button>
          </DialogFooter>
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>

      {/* Body */}
      <Flex direction="column" flex="1" overflow="hidden">
        {activeForm ? (
          <FormSplitView
            activeForm={activeForm}
            messages={messages}
            isLoading={isLoading}
            error={error}
            dismissError={dismissError}
          />
        ) : activeApproval ? (
          <>
            <MessageList messages={messages} isLoading={isLoading} />
            {error && <ErrorBox error={error} onDismiss={dismissError} />}
            <Box px="3" py="2" borderTopWidth="1px">
              <ApprovalCard
                title={activeApproval.title}
                description={activeApproval.description}
                onApprove={() => activeApproval.resolve(true)}
                onReject={() => activeApproval.resolve(false)}
              />
            </Box>
          </>
        ) : (
          <>
            <MessageList messages={messages} isLoading={isLoading} />
            {error && <ErrorBox error={error} onDismiss={dismissError} />}
            <ChatInput />
          </>
        )}
      </Flex>
    </Flex>
  );
}
