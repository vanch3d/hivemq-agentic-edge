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
import { useQueryClient } from "@tanstack/react-query";
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
  querySnapshots,
} from "@/agent/tools";
import createDebug from "debug";
import {
  setToolNavigate,
  setFormRequester,
  setApprovalRequester,
  setSnapshotCreator,
  setQueryInvalidator,
  setQueryClient,
  setAdapterTypesFetcher,
  prefetchAdapterTypes,
  type FormRequest,
  type ApprovalRequest,
} from "@/agent/tool-context";
import { getAdapterTypes } from "@/api/sdk.gen";
import { useSnapshotStore } from "@/stores/snapshot-store";

const log = createDebug("edge:chat");

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
  querySnapshots,
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
  const [activeForm, setActiveForm] = useState<ActiveForm | null>(null);
  const [activeApproval, setActiveApproval] = useState<ActiveApproval | null>(
    null,
  );
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Register query client and invalidator — tools call these for cache access and mutation cleanup
  useEffect(() => {
    setQueryClient(queryClient);
    setQueryInvalidator(() => {
      queryClient.invalidateQueries();
    });
    setAdapterTypesFetcher(async () => {
      const { data } = await getAdapterTypes();
      return data?.items ?? [];
    });
    prefetchAdapterTypes();
  }, [queryClient]);

  // Register router navigate for use by agent tools
  useEffect(() => {
    setToolNavigate((path: string) => navigate({ to: path }));
  }, [navigate]);

  // Register form requester — tools call this to show an inline form
  useEffect(() => {
    setFormRequester((request: FormRequest) => {
      return new Promise((resolve) => {
        setActiveForm({
          ...request,
          resolve: (result) => {
            resolve(result);
            setActiveForm(null);
          },
        });
      });
    });
  }, []);

  // Register approval requester — tools call this to show a confirmation card
  useEffect(() => {
    setApprovalRequester((request: ApprovalRequest) => {
      return new Promise((resolve) => {
        setActiveApproval({
          ...request,
          resolve: (approved) => {
            resolve(approved);
            setActiveApproval(null);
          },
        });
      });
    });
  }, []);

  // Register snapshot creator — tools call this to persist query results
  useEffect(() => {
    setSnapshotCreator((request) =>
      useSnapshotStore.getState().addSnapshot(request),
    );
  }, []);

  const [model, setModel] = useState<string | null>(null);

  const onChunk = useCallback((chunk: StreamChunk) => {
    if ("model" in chunk && typeof chunk.model === "string" && chunk.model) {
      setModel(chunk.model);
    }
    log("chunk: %s %O", chunk.type, chunk);
  }, []);

  const chatState = useChat({
    connection: fetchServerSentEvents("/api/chat", () => {
      const settings = getSettingsOverrides();
      return Object.keys(settings).length > 0 ? { body: { settings } } : {};
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
        activeForm,
        activeApproval,
        model,
      }}
    >
      {children}
    </ChatContext>
  );
}
