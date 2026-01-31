import { Hono } from "hono";
import { chat, toServerSentEventsResponse } from "@tanstack/ai";
import { createAnthropicChat } from "@tanstack/ai-anthropic";
import { SYSTEM_PROMPT } from "../system-prompt.js";

const SUPPORTED_MODELS = [
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

type SupportedModel = (typeof SUPPORTED_MODELS)[number];

const DEFAULT_MODEL: SupportedModel = "claude-sonnet-4-5";

function resolveModel(): SupportedModel {
  const env = process.env["ANTHROPIC_MODEL"];
  if (!env) return DEFAULT_MODEL;
  if ((SUPPORTED_MODELS as readonly string[]).includes(env)) {
    return env as SupportedModel;
  }
  return DEFAULT_MODEL;
}

const chatRoute = new Hono();

chatRoute.post("/", async (c) => {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  console.log("xxxxxx [chat] ANTHROPIC_API_KEY");

  if (!apiKey) {
    console.error("[chat] ANTHROPIC_API_KEY not found in process.env");
    return c.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      500,
    );
  }

  try {
    const body = await c.req.json();

    const adapter = createAnthropicChat(resolveModel(), apiKey);

    const stream = chat({
      adapter,
      messages: body.messages,
      conversationId: body.conversationId,
      systemPrompts: [SYSTEM_PROMPT],
    });

    return toServerSentEventsResponse(stream);
  } catch (e) {
    console.error("[chat] Error:", e);
    return c.json({ error: String(e) }, 500);
  }
});

export default chatRoute;
