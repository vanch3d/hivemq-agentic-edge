import { Hono } from "hono";
import { Agent } from "undici";
import { chat, toServerSentEventsResponse } from "@tanstack/ai";
import { createAnthropicChat } from "@tanstack/ai-anthropic";
import { OllamaTextAdapter } from "@tanstack/ai-ollama";
import { Ollama } from "ollama";
import { SYSTEM_PROMPT } from "../system-prompt.js";
import { patchOllamaAdapter } from "../ollama-agui-adapter.js";
import { allToolDefinitions } from "@/agent/tool-definitions";

// --- Anthropic model resolution ---

const ANTHROPIC_MODELS = [
  "claude-opus-4-5",
  "claude-sonnet-4-5",
  "claude-haiku-4-5",
  "claude-opus-4-1",
  "claude-sonnet-4",
  "claude-3-7-sonnet",
  "claude-opus-4",
  "claude-3-5-haiku",
  "claude-3-haiku",
] as const;

type AnthropicModel = (typeof ANTHROPIC_MODELS)[number];

const DEFAULT_ANTHROPIC_MODEL: AnthropicModel = "claude-sonnet-4-5";

function resolveAnthropicModel(): AnthropicModel {
  const env = process.env["ANTHROPIC_MODEL"];
  if (!env) return DEFAULT_ANTHROPIC_MODEL;
  if ((ANTHROPIC_MODELS as readonly string[]).includes(env)) {
    return env as AnthropicModel;
  }
  return DEFAULT_ANTHROPIC_MODEL;
}

// --- Provider-agnostic adapter resolution ---

function resolveAdapter() {
  const provider = process.env["AI_PROVIDER"] ?? "anthropic";

  if (provider === "ollama") {
    const model = process.env["OLLAMA_MODEL"] ?? "llama3";
    const host = process.env["OLLAMA_HOST"] ?? "http://localhost:11434";
    console.log(`[chat] Using Ollama provider: model=${model}, host=${host}`);

    // Create a custom Ollama client with extended timeout.
    // Node's built-in fetch (undici) has a default headersTimeout that
    // fires before slow local models can emit the first token (especially
    // with CPU-heavy inference). We use a custom undici Agent with generous
    // timeouts and pass it via the non-standard `dispatcher` option.
    const OLLAMA_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
    const ollamaDispatcher = new Agent({
      headersTimeout: OLLAMA_TIMEOUT_MS,
      bodyTimeout: OLLAMA_TIMEOUT_MS,
      connectTimeout: 30_000,
    });
    const ollamaClient = new Ollama({
      host,
      fetch: ((url: Parameters<typeof fetch>[0], init?: RequestInit) =>
        fetch(url, {
          ...init,
          dispatcher: ollamaDispatcher,
        } as unknown as RequestInit)) as typeof fetch,
    });

    const adapter = new OllamaTextAdapter(ollamaClient, model);
    return patchOllamaAdapter(adapter);
  }

  // Default: Anthropic
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured on the server.");
  }
  const model = resolveAnthropicModel();
  console.log(`[chat] Using Anthropic provider: model=${model}`);
  return createAnthropicChat(model, apiKey);
}

// --- Route ---

const chatRoute = new Hono();

chatRoute.post("/", async (c) => {
  try {
    const adapter = resolveAdapter();
    const body = await c.req.json();

    const stream = chat({
      adapter,
      messages: body.messages,
      conversationId: body.conversationId,
      systemPrompts: [SYSTEM_PROMPT],
      tools: allToolDefinitions,
    });

    return toServerSentEventsResponse(stream);
  } catch (e) {
    console.error("[chat] Error:", e);
    const status =
      e instanceof Error && e.message.includes("not configured") ? 500 : 502;
    return c.json({ error: String(e) }, status);
  }
});

export default chatRoute;
