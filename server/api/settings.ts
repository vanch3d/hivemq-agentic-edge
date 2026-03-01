import { Hono } from "hono";
import { Ollama } from "ollama";
import { ANTHROPIC_MODELS, resolveEnvDefaults } from "./chat.js";

async function fetchOllamaModels(host: string): Promise<string[]> {
  try {
    const client = new Ollama({ host });
    const response = await client.list();
    return response.models.map((m) => m.name);
  } catch {
    return [];
  }
}

function buildSettingsSchema(ollamaModels: string[]): Record<string, unknown> {
  const ollamaModelField: Record<string, unknown> = {
    type: "string",
    title: "Model",
    description: "Ollama model name (e.g. qwen3:8b, llama3).",
    default: "llama3",
  };
  if (ollamaModels.length > 0) {
    ollamaModelField.enum = ollamaModels;
  }

  return {
    $defs: {
      anthropic: {
        type: "object",
        title: "Anthropic",
        properties: {
          model: {
            type: "string",
            title: "Model",
            enum: [...ANTHROPIC_MODELS],
            default: "claude-sonnet-4-5",
          },
        },
      },
      ollama: {
        type: "object",
        title: "Ollama",
        properties: {
          model: ollamaModelField,
          host: {
            type: "string",
            title: "Host",
            description: "URL of the Ollama server.",
            default: "http://localhost:11434",
          },
          think: {
            type: "boolean",
            title: "Thinking Mode",
            description:
              "Enable extended thinking for models that support it (e.g. qwen3).",
            default: true,
          },
        },
      },
    },
    type: "object",
    properties: {
      ai: {
        type: "object",
        title: "AI Assistant",
        description: "Provider and model configuration for the chat agent.",
        properties: {
          provider: {
            type: "string",
            title: "Provider",
            enum: ["anthropic", "ollama"],
            default: "anthropic",
          },
          anthropic: { $ref: "#/$defs/anthropic" },
          ollama: { $ref: "#/$defs/ollama" },
        },
      },
      featureFlags: {
        type: "object",
        title: "Feature Flags",
        description: "Experimental features and version toggles.",
        properties: {
          ontologyVersion: {
            type: "string",
            title: "Ontology Version",
            description:
              "Select which domain ontology drives the graph and agent.",
            enum: ["v1", "v2"],
            default: "v1",
          },
        },
      },
    },
  };
}

const settingsUiSchema: Record<string, unknown> = {
  ai: {
    provider: { "ui:widget": "radio" },
  },
  featureFlags: {
    ontologyVersion: { "ui:widget": "radio" },
  },
};

const settingsRoute = new Hono();

settingsRoute.get("/", async (c) => {
  const envDefaults = resolveEnvDefaults();
  const ai = envDefaults.ai as Record<string, unknown>;
  const ollama = ai.ollama as Record<string, unknown>;
  const host = ollama.host as string;

  const ollamaModels = await fetchOllamaModels(host);
  const schema = buildSettingsSchema(ollamaModels);

  return c.json({
    schema,
    uiSchema: settingsUiSchema,
    formData: envDefaults,
  });
});

export default settingsRoute;
