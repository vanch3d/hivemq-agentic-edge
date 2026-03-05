/**
 * Wraps the @tanstack/ai-ollama adapter to fix two bugs in v0.3.0:
 *
 * 1. **Wrong event types** — The adapter emits non-standard event types
 *    ("content", "done", "tool_call", "thinking") instead of the AG-UI protocol
 *    types expected by the TanStack AI chat engine (TEXT_MESSAGE_START,
 *    TEXT_MESSAGE_CONTENT, RUN_FINISHED, etc.).
 *
 * 2. **System prompts dropped** — The adapter's `mapCommonOptionsToOllama()`
 *    ignores `options.systemPrompts`, so the model never receives system
 *    instructions. We inject them as a `{ role: "system" }` message at the
 *    start of the messages array before calling the underlying adapter.
 */

let idCounter = 0;
function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${++idCounter}`;
}

/**
 * Raw chunk shapes emitted by the Ollama adapter (non-standard).
 */
interface OllamaContentChunk {
  type: "content";
  id: string;
  model: string;
  timestamp: number;
  delta: string;
  content: string;
  role: string;
}

interface OllamaDoneChunk {
  type: "done";
  id: string;
  model: string;
  timestamp: number;
  finishReason: string;
}

interface OllamaToolCallChunk {
  type: "tool_call";
  id: string;
  model: string;
  timestamp: number;
  toolCall: {
    type: string;
    id: string;
    function: {
      name: string;
      arguments: string;
    };
  };
  index: number;
}

interface OllamaThinkingChunk {
  type: "thinking";
  id: string;
  model: string;
  timestamp: number;
  content: string;
  delta: string;
}

type OllamaChunk =
  | OllamaContentChunk
  | OllamaDoneChunk
  | OllamaToolCallChunk
  | OllamaThinkingChunk;

/**
 * The options shape that the TanStack AI engine passes to `chatStream()`.
 * We only type the fields we need to intercept.
 */
interface ChatStreamOptions {
  messages: Array<{ role: string; content: unknown }>;
  systemPrompts?: string[];
  [key: string]: unknown;
}

/**
 * Wraps an Ollama adapter so its chatStream yields proper AG-UI events
 * and correctly injects system prompts into the messages array.
 * All other adapter properties (kind, name, model, structuredOutput) are
 * passed through unchanged.
 */
export function patchOllamaAdapter<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends { chatStream: (...args: any[]) => AsyncIterable<any> },
>(adapter: T): T {
  return {
    ...adapter,
    chatStream(...args: Parameters<T["chatStream"]>): AsyncIterable<unknown> {
      // Inject systemPrompts as a system message (bug #2 workaround)
      const options = args[0] as ChatStreamOptions;
      if (options?.systemPrompts?.length) {
        const systemContent = options.systemPrompts.join("\n");
        options.messages = [
          { role: "system", content: systemContent },
          ...options.messages,
        ];
      }

      console.log(
        "[ollama-patch] chatStream called, messages:",
        options.messages.length,
        "tools:",
        options.tools ? (options.tools as unknown[]).length : 0,
      );

      const baseStream = adapter.chatStream(...args);
      return transformStream(baseStream);
    },
  };
}

async function* transformStream(
  source: AsyncIterable<unknown>,
): AsyncGenerator<unknown> {
  const runId = uid("run");
  let messageStarted = false;
  let messageId = "";
  let stepStarted = false;
  let stepId = "";

  // RUN_STARTED — must be the first event
  yield {
    type: "RUN_STARTED",
    runId,
    timestamp: Date.now(),
  };

  try {
    for await (const raw of source) {
      const chunk = raw as OllamaChunk;
      console.log("[ollama-patch] chunk type:", chunk.type);

      switch (chunk.type) {
        case "content": {
          if (!messageStarted) {
            messageId = chunk.id;
            messageStarted = true;
            yield {
              type: "TEXT_MESSAGE_START",
              messageId,
              role: "assistant",
              timestamp: chunk.timestamp,
              model: chunk.model,
            };
          }
          yield {
            type: "TEXT_MESSAGE_CONTENT",
            messageId,
            delta: chunk.delta,
            content: chunk.content,
            timestamp: chunk.timestamp,
            model: chunk.model,
          };
          break;
        }

        case "tool_call": {
          // Close any open text message before tool calls
          if (messageStarted) {
            yield {
              type: "TEXT_MESSAGE_END",
              messageId,
              timestamp: chunk.timestamp,
              model: chunk.model,
            };
            messageStarted = false;
          }

          const tc = chunk.toolCall;
          yield {
            type: "TOOL_CALL_START",
            toolCallId: tc.id,
            toolName: tc.function.name,
            index: chunk.index,
            timestamp: chunk.timestamp,
            model: chunk.model,
          };
          yield {
            type: "TOOL_CALL_ARGS",
            toolCallId: tc.id,
            delta: tc.function.arguments,
            args: tc.function.arguments,
            timestamp: chunk.timestamp,
            model: chunk.model,
          };
          yield {
            type: "TOOL_CALL_END",
            toolCallId: tc.id,
            toolName: tc.function.name,
            input: JSON.parse(tc.function.arguments),
            timestamp: chunk.timestamp,
            model: chunk.model,
          };
          break;
        }

        case "thinking": {
          if (!stepStarted) {
            stepId = uid("step");
            stepStarted = true;
            yield {
              type: "STEP_STARTED",
              stepId,
              stepType: "thinking",
              timestamp: chunk.timestamp,
              model: chunk.model,
            };
          }
          yield {
            type: "STEP_FINISHED",
            stepId,
            delta: chunk.delta,
            content: chunk.content,
            timestamp: chunk.timestamp,
            model: chunk.model,
          };
          break;
        }

        case "done": {
          // Close any open text message
          if (messageStarted) {
            yield {
              type: "TEXT_MESSAGE_END",
              messageId,
              timestamp: chunk.timestamp,
              model: chunk.model,
            };
            messageStarted = false;
          }

          yield {
            type: "RUN_FINISHED",
            runId,
            finishReason: chunk.finishReason,
            timestamp: chunk.timestamp,
            model: chunk.model,
          };
          break;
        }

        default:
          // Pass through any events that already use AG-UI types (future-proof)
          yield raw;
          break;
      }
    }
  } catch (err) {
    console.error("[ollama-patch] Stream error:", err);
    const raw = err instanceof Error ? err.message : String(err);
    const message =
      raw.includes("fetch failed") || raw.includes("ECONNREFUSED")
        ? "Could not connect to Ollama. Is it running? Start it with: ollama serve"
        : raw;
    yield {
      type: "RUN_ERROR",
      runId,
      error: { message },
      timestamp: Date.now(),
    };
  }
}
