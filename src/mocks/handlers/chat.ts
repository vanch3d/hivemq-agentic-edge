import { http, HttpResponse } from "msw";

// --- SSE helpers ---

type SSEEvent = Record<string, unknown>;

function sseLine(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

let idCounter = 0;
function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${++idCounter}`;
}

function makeStream(events: SSEEvent[], delayMs = 50) {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(sseLine(event)));
        await new Promise((r) => setTimeout(r, delayMs));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

// --- Response builders ---

function textResponse(text: string): SSEEvent[] {
  const msgId = uid("msg");
  const ts = Date.now();
  const words = text.split(" ");

  return [
    {
      type: "TEXT_MESSAGE_START",
      timestamp: ts,
      messageId: msgId,
      role: "assistant",
    },
    ...words.map((word, i) => ({
      type: "TEXT_MESSAGE_CONTENT",
      timestamp: ts + i + 1,
      messageId: msgId,
      delta: (i === 0 ? "" : " ") + word,
    })),
    {
      type: "TEXT_MESSAGE_END",
      timestamp: ts + words.length + 1,
      messageId: msgId,
    },
    {
      type: "RUN_FINISHED",
      timestamp: ts + words.length + 2,
      finishReason: "stop",
    },
  ];
}

function toolCallResponse(
  toolName: string,
  args: Record<string, unknown>,
): SSEEvent[] {
  const toolCallId = uid("tc");
  const ts = Date.now();
  const argsJson = JSON.stringify(args);

  return [
    {
      type: "TOOL_CALL_START",
      timestamp: ts,
      toolCallId,
      toolName,
      index: 0,
    },
    {
      type: "TOOL_CALL_ARGS",
      timestamp: ts + 1,
      toolCallId,
      delta: argsJson,
    },
    { type: "RUN_FINISHED", timestamp: ts + 2, finishReason: "tool_calls" },
    {
      type: "CUSTOM",
      timestamp: ts + 3,
      name: "tool-input-available",
      data: { toolCallId, toolName, input: args },
    },
  ];
}

// --- Scenario matching ---

type Scenario = {
  match: (text: string) => boolean;
  events: () => SSEEvent[];
  followUp: string;
};

// Order matters: more specific patterns MUST come before generic ones.
const scenarios: Scenario[] = [
  // --- Specific mutation scenarios (before generic "create"/"add") ---
  {
    match: (t) => /(?:create|add)\s+adapter/i.test(t),
    events: () => toolCallResponse("mutateAdapter", { operation: "create" }),
    followUp:
      "Please fill in the adapter configuration form to create a new protocol adapter.",
  },
  {
    match: (t) => /(?:create|add)\s+(?:behavior\s+)?polic/i.test(t),
    events: () =>
      toolCallResponse("mutateDataHub", {
        operation: "createBehaviorPolicy",
      }),
    followUp: "Please fill in the behavior policy form to create a new policy.",
  },
  {
    match: (t) => /(?:create|add)\s+(?:data\s+)?polic/i.test(t),
    events: () =>
      toolCallResponse("mutateDataHub", { operation: "createDataPolicy" }),
    followUp: "Please fill in the data policy form to create a new policy.",
  },
  {
    match: (t) => /(?:create|add)\s+schema/i.test(t),
    events: () =>
      toolCallResponse("mutateDataHub", { operation: "createSchema" }),
    followUp: "Please fill in the schema form to register a new schema.",
  },
  {
    match: (t) => /(?:create|add)\s+script/i.test(t),
    events: () =>
      toolCallResponse("mutateDataHub", { operation: "createScript" }),
    followUp:
      "Please fill in the script form to create a new transformation script.",
  },
  {
    match: (t) => /(?:create|add)\s+(?:topic\s+)?filter/i.test(t),
    events: () =>
      toolCallResponse("mutateSystem", { operation: "addTopicFilter" }),
    followUp: "Please fill in the form to add a new topic filter.",
  },
  {
    match: (t) => /(?:create|add)\s+bridge/i.test(t),
    events: () => toolCallResponse("mutateBridge", { operation: "create" }),
    followUp:
      "Please fill in the bridge configuration form to create a new MQTT bridge.",
  },
  {
    match: (t) => /(?:create|add)\s+combiner/i.test(t),
    events: () =>
      toolCallResponse("mutateSystem", { operation: "addCombiner" }),
    followUp: "Please fill in the form to add a new combiner.",
  },
  {
    match: (t) => /delete\s+bridge/i.test(t),
    events: () =>
      toolCallResponse("mutateBridge", {
        operation: "delete",
        bridgeId: "mqtt-bridge-01",
      }),
    followUp: "Bridge deletion has been requested.",
  },

  // --- Query scenarios ---
  {
    match: (t) => /bridge/i.test(t),
    events: () => toolCallResponse("queryBridges", { operation: "list" }),
    followUp:
      "Here are your bridges. Each entry shows the bridge ID, host, and current connection status.",
  },
  {
    match: (t) => /adapter/i.test(t),
    events: () => toolCallResponse("queryAdapters", { operation: "list" }),
    followUp:
      "Here are your protocol adapters with their type and connection status.",
  },
  {
    match: (t) => /topic.?filter/i.test(t),
    events: () =>
      toolCallResponse("querySystem", { operation: "listTopicFilters" }),
    followUp: "Here are the topic filters currently configured on your broker.",
  },
  {
    match: (t) => /combiner/i.test(t),
    events: () =>
      toolCallResponse("querySystem", { operation: "listCombiners" }),
    followUp: "Here are the combiners configured in your system.",
  },
  {
    match: (t) => /data.?polic/i.test(t),
    events: () =>
      toolCallResponse("queryDataHub", { operation: "listDataPolicies" }),
    followUp: "Here are the data policies configured in your Data Hub.",
  },
  {
    match: (t) => /schema/i.test(t),
    events: () =>
      toolCallResponse("queryDataHub", { operation: "listSchemas" }),
    followUp: "Here are the schemas registered in your Data Hub.",
  },
  {
    match: (t) => /script/i.test(t),
    events: () =>
      toolCallResponse("queryDataHub", { operation: "listScripts" }),
    followUp: "Here are the transformation scripts in your Data Hub.",
  },
  {
    match: (t) => /polic/i.test(t),
    events: () =>
      toolCallResponse("queryDataHub", { operation: "listBehaviorPolicies" }),
    followUp: "Here are the behavior policies configured in your Data Hub.",
  },
  {
    match: (t) => /metric/i.test(t),
    events: () => toolCallResponse("querySystem", { operation: "metrics" }),
    followUp: "Here are the current system metrics.",
  },
  {
    match: (t) => /listener/i.test(t),
    events: () => toolCallResponse("querySystem", { operation: "listeners" }),
    followUp: "Here are the listeners configured on your broker.",
  },
  {
    match: (t) => /event/i.test(t),
    events: () => toolCallResponse("querySystem", { operation: "events" }),
    followUp: "Here are the recent system events.",
  },
  {
    match: (t) => /notification/i.test(t),
    events: () =>
      toolCallResponse("querySystem", { operation: "notifications" }),
    followUp: "Here are the current system notifications.",
  },

  // --- Graph visualization ---
  {
    match: (t) => /graph|visuali[sz]e|topology|ontology|data.?flow/i.test(t),
    events: () => toolCallResponse("queryGraph", { scope: "dataFlow" }),
    followUp:
      "Here is the data flow graph showing adapters, tags, topics, and policies.",
  },

  // --- Navigation ---
  {
    match: (t) => /navigate|go to|take me/i.test(t),
    events: () => toolCallResponse("navigateTo", { path: "/workspace" }),
    followUp: "I've navigated you to the workspace.",
  },

  // --- Generic create/add (fallback — must be LAST among mutations) ---
  {
    match: (t) => /create|add new/i.test(t),
    events: () => toolCallResponse("mutateBridge", { operation: "create" }),
    followUp:
      "Please fill in the bridge configuration form to create a new bridge.",
  },
];

/**
 * Check if the request contains a tool result (follow-up after client tool execution).
 * If so, return a text summary instead of another tool call.
 */
function hasToolResult(messages: Array<{ role: string }>): boolean {
  return messages.some((m) => m.role === "tool");
}

function getLastUserText(
  messages: Array<{ role: string; content?: unknown }>,
): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "user") {
      if (typeof m.content === "string") return m.content;
      if (Array.isArray(m.content)) {
        const textPart = m.content.find(
          (p: { type?: string }) => p.type === "text",
        ) as { text?: string } | undefined;
        return textPart?.text ?? "";
      }
    }
  }
  return "";
}

// --- MSW Handler ---

export const chatHandlers = [
  http.post("/api/chat", async ({ request }) => {
    const body = (await request.json()) as {
      messages: Array<{ role: string; content?: unknown }>;
    };
    const messages = body.messages ?? [];

    let events: SSEEvent[];

    // If this is a follow-up after tool execution, return text summary
    if (hasToolResult(messages)) {
      const userText = getLastUserText(messages);
      const scenario = scenarios.find((s) => s.match(userText));
      events = textResponse(
        scenario?.followUp ?? "Done. Let me know if you need anything else.",
      );
    } else {
      // First request — match scenario
      const userText = getLastUserText(messages);
      const scenario = scenarios.find((s) => s.match(userText));

      if (scenario) {
        events = scenario.events();
      } else {
        events = textResponse(
          "I'm your HiveMQ Edge assistant. I can help you query bridges, adapters, topic filters, schemas, scripts, and policies. I can also navigate the app or create new resources. What would you like to do?",
        );
      }
    }

    const stream = makeStream(events);

    return new HttpResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }),
];
