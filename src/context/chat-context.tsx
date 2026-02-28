import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { useChat, fetchServerSentEvents } from "@tanstack/ai-react";
import { clientTools } from "@tanstack/ai-client";
import type { UIMessage, StreamChunk } from "@tanstack/ai";
import {
  queryBridges,
  queryAdapters,
  queryDataHub,
  querySystem,
  querySampling,
  navigateTo,
  mutateBridge,
  mutateAdapter,
  mutateDataHub,
  mutateSystem,
  queryGraph,
} from "@/agent/tools";
import {
  setToolNavigate,
  setFormRequester,
  setApprovalRequester,
  type FormRequest,
  type ApprovalRequest,
} from "@/agent/tool-context";

function getSettingsOverrides(): Record<string, unknown> {
  try {
    return JSON.parse(localStorage.getItem("app-settings") ?? "{}");
  } catch {
    return {};
  }
}

const tools = clientTools(
  queryBridges,
  queryAdapters,
  queryDataHub,
  querySystem,
  querySampling,
  navigateTo,
  mutateBridge,
  mutateAdapter,
  mutateDataHub,
  mutateSystem,
  queryGraph,
);

// --- Active form/approval state ---

export type ActiveForm = FormRequest & {
  resolve: (
    result: { submitted: true; data: unknown } | { submitted: false },
  ) => void;
};

export type ActiveApproval = ApprovalRequest & {
  resolve: (approved: boolean) => void;
};

type ChatContextValue = {
  messages: UIMessage[];
  sendMessage: (text: string) => void;
  isLoading: boolean;
  error: Error | null;
  dismissError: () => void;
  stop: () => void;
  clear: () => void;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onToggle: () => void;
  activeForm: ActiveForm | null;
  activeApproval: ActiveApproval | null;
  /** Model identifier reported by the AI provider (e.g. "claude-sonnet-4-5", "qwen2.5:7b") */
  model: string | null;
};

const ChatContext = createContext<ChatContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeForm, setActiveForm] = useState<ActiveForm | null>(null);
  const [activeApproval, setActiveApproval] = useState<ActiveApproval | null>(
    null,
  );
  const navigate = useNavigate();

  // Register router navigate for use by agent tools
  useEffect(() => {
    setToolNavigate((path: string) => navigate({ to: path }));
  }, [navigate]);

  // Register form requester — tools call this to show an inline form
  useEffect(() => {
    setFormRequester((request: FormRequest) => {
      return new Promise((resolve) => {
        setActiveForm({ ...request, resolve });
      });
    });
  }, []);

  // Register approval requester — tools call this to show a confirmation card
  useEffect(() => {
    setApprovalRequester((request: ApprovalRequest) => {
      return new Promise((resolve) => {
        setActiveApproval({ ...request, resolve });
      });
    });
  }, []);

  // Ctrl+K / Cmd+K keyboard shortcut to toggle drawer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const [model, setModel] = useState<string | null>(null);

  const onChunk = useCallback((chunk: StreamChunk) => {
    if ("model" in chunk && typeof chunk.model === "string" && chunk.model) {
      setModel(chunk.model);
    }
  }, []);

  const chatState = useChat({
    connection: fetchServerSentEvents("/api/chat", () => {
      const settings = getSettingsOverrides();
      return Object.keys(settings).length > 0
        ? { body: { settings } }
        : {};
    }),
    tools,
    onChunk,
  });

  // Track dismissed errors so the same error can be hidden by the user
  const [dismissedError, setDismissedError] = useState<Error | null>(null);
  const lastError = chatState.error ?? null;
  const prevErrorRef = useRef<Error | null>(null);

  // Reset dismissed state when a new (different) error arrives
  if (lastError !== prevErrorRef.current) {
    prevErrorRef.current = lastError;
    if (lastError !== dismissedError) {
      setDismissedError(null);
    }
  }

  const visibleError =
    lastError && lastError !== dismissedError ? lastError : null;
  const dismissError = useCallback(() => {
    setDismissedError(lastError);
  }, [lastError]);

  const sendMessage = useCallback(
    (text: string) => {
      if (text.trim() && !chatState.isLoading) {
        chatState.sendMessage(text);
      }
    },
    [chatState],
  );

  const clear = useCallback(() => {
    chatState.clear();
    setModel(null);
  }, [chatState]);

  const onOpen = useCallback(() => setIsOpen(true), []);
  const onClose = useCallback(() => setIsOpen(false), []);
  const onToggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <ChatContext
      value={{
        messages: chatState.messages,
        sendMessage,
        isLoading: chatState.isLoading,
        error: visibleError,
        dismissError,
        stop: chatState.stop,
        clear,
        isOpen,
        onOpen,
        onClose,
        onToggle,
        activeForm,
        activeApproval,
        model,
      }}
    >
      {children}
    </ChatContext>
  );
}
