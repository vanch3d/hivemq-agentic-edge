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

// Valid API model IDs from https://platform.claude.com/docs/en/about-claude/models/overview
export const ANTHROPIC_MODELS = [
  "claude-opus-4-6",
  "claude-sonnet-4-6",
  "claude-opus-4-5",
  "claude-sonnet-4-5",
  "claude-opus-4-1",
  "claude-sonnet-4",
  "claude-opus-4",
  "claude-haiku-4-5",
  "claude-3-haiku-20240307",
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

// --- Settings: env-var defaults in formData shape ---

export function resolveEnvDefaults(): Record<string, unknown> {
  return {
    ai: {
      provider: process.env["AI_PROVIDER"] ?? "anthropic",
      anthropic: {
        model: resolveAnthropicModel(),
      },
      ollama: {
        model: process.env["OLLAMA_MODEL"] ?? "llama3",
        host: process.env["OLLAMA_HOST"] ?? "http://localhost:11434",
        think: process.env["OLLAMA_THINK"] !== "false",
      },
    },
    featureFlags: {
      ontologyVersion: process.env["ONTOLOGY_VERSION"] ?? "v1",
    },
  };
}

// --- Provider-agnostic adapter resolution ---

function resolveAdapterFromSettings(settings: Record<string, unknown>) {
  const ai = settings.ai as Record<string, unknown> | undefined;
  const provider = (ai?.provider as string) ?? "anthropic";

  if (provider === "ollama") {
    const ollama = ai?.ollama as Record<string, unknown> | undefined;
    const model = (ollama?.model as string) ?? "llama3";
    const host = (ollama?.host as string) ?? "http://localhost:11434";
    const think = ollama?.think !== false;
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

    // The TanStack adapter doesn't pass `think` to the Ollama API.
    // Wrap the client's chat method to inject it.
    const originalChat = ollamaClient.chat.bind(ollamaClient);
    (ollamaClient as unknown as Record<string, unknown>).chat = (
      req: Record<string, unknown>,
    ) => originalChat({ ...req, think } as Parameters<typeof originalChat>[0]);

    console.log(`[chat] Ollama thinking mode: ${think}`);
    const adapter = new OllamaTextAdapter(ollamaClient, model);
    return patchOllamaAdapter(adapter);
  }

  // Default: Anthropic
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured on the server.");
  }
  const anthropic = ai?.anthropic as Record<string, unknown> | undefined;
  const model = (anthropic?.model as string) ?? DEFAULT_ANTHROPIC_MODEL;
  // Validate the model is in the allowed list
  const validModel = (ANTHROPIC_MODELS as readonly string[]).includes(model)
    ? (model as AnthropicModel)
    : DEFAULT_ANTHROPIC_MODEL;
  console.log(`[chat] Using Anthropic provider: model=${validModel}`);
  return createAnthropicChat(
    validModel as Parameters<typeof createAnthropicChat>[0],
    apiKey,
  );
}

// --- Route ---

const chatRoute = new Hono();

function isConnectionError(msg: string): boolean {
  return msg.includes("fetch failed") || msg.includes("ECONNREFUSED");
}

function friendlyError(provider: string, msg: string): { error: string; status: 500 | 502 } {
  if (msg.includes("not configured")) {
    return { error: msg, status: 500 };
  }

  if (isConnectionError(msg)) {
    if (provider === "ollama") {
      return {
        error: "Could not connect to Ollama. Is it running? Start it with: ollama serve",
        status: 502,
      };
    }
    return {
      error: "Could not reach the Anthropic API. Check your network connection.",
      status: 502,
    };
  }

  return { error: msg, status: 502 };
}

chatRoute.post("/", async (c) => {
  let provider = "anthropic";
  try {
    const body = await c.req.json();

    // Merge env-var defaults with any client-side overrides
    const envDefaults = resolveEnvDefaults();
    const aiDefaults = envDefaults.ai as Record<string, unknown>;
    const settings = body.settings
      ? { ...envDefaults, ai: { ...aiDefaults, ...body.settings.ai } }
      : envDefaults;

    provider = ((settings.ai as Record<string, unknown>)?.provider as string) ?? "anthropic";
    const adapter = resolveAdapterFromSettings(settings);

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
    const msg = e instanceof Error ? e.message : String(e);
    const { error, status } = friendlyError(provider, msg);
    return c.json({ error }, status);
  }
});

export default chatRoute;
