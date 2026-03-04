# Agent Chat MSW Mocks + Conditional Mock Toggles

## Goal

1. Add a new MSW handler that mocks `/api/chat` SSE responses, exercising all agent flows (text, query tool calls, navigation, mutations)
2. Make mock handler groups toggleable via `VITE_` env vars so Edge API mocks and Agent mocks can be enabled independently

---

## Environment Variables

```env
# .env / .env.example

# MSW mock toggles (only apply in dev mode)
VITE_MOCK_EDGE_API=true    # Mock HiveMQ Edge REST API (bridges, adapters, etc.)
VITE_MOCK_AGENT_CHAT=false # Mock /api/chat SSE endpoint (for testing without AI provider)
```

Default: Edge API mocks ON, Agent chat mocks OFF (so Ollama/Anthropic is used by default when available).

---

## Files to Change

### 1. `src/mocks/handlers/chat.ts` — New file

MSW handler for `POST /api/chat`. Parses the last user message and returns canned SSE responses based on keyword matching:

| User says (contains)      | Mock response                                                          |
| ------------------------- | ---------------------------------------------------------------------- |
| `"bridge"`                | `TOOL_CALL` → `queryBridges({ operation: "list" })` + follow-up text   |
| `"adapter"`               | `TOOL_CALL` → `queryAdapters({ operation: "list" })` + follow-up text  |
| `"navigate"` or `"go to"` | `TOOL_CALL` → `navigateTo({ path: "/workspace" })` + follow-up text    |
| `"create"` or `"add"`     | `TOOL_CALL` → `mutateBridge({ operation: "create" })` + follow-up text |
| anything else             | Simple streaming text reply                                            |

Each response is a `ReadableStream` that emits SSE events with realistic delays (~50ms between chunks).

SSE format per TanStack AI protocol:

```
data: {"type":"TEXT_MESSAGE_START","messageId":"...","role":"assistant",...}\n\n
data: {"type":"TEXT_MESSAGE_CONTENT","messageId":"...","delta":"Hello",...}\n\n
data: {"type":"TOOL_CALL_START","messageId":"...","toolCallId":"...","toolName":"queryBridges",...}\n\n
data: {"type":"TOOL_CALL_ARGS","messageId":"...","toolCallId":"...","delta":"{\"operation\":\"list\"}",...}\n\n
data: {"type":"RUN_FINISHED","finishReason":"tool_calls",...}\n\n
data: [DONE]\n\n
```

### 2. `src/mocks/handlers.ts` — Conditional aggregation

```typescript
import { chatHandlers } from "./handlers/chat";

const edgeApiHandlers = [
  ...authHandlers,
  ...notificationHandlers,
  ...eventHandlers,
  ...bridgeHandlers,
  ...adapterHandlers,
  ...dataHubHandlers,
  ...systemHandlers,
  ...samplingHandlers,
];

export const handlers = [
  ...(import.meta.env.VITE_MOCK_EDGE_API !== "false" ? edgeApiHandlers : []),
  ...(import.meta.env.VITE_MOCK_AGENT_CHAT === "true" ? chatHandlers : []),
];
```

Edge API mocks default to ON (unless explicitly `"false"`). Agent chat mocks default to OFF (only ON when explicitly `"true"`).

### 3. `.env` and `.env.example` — Add new vars

### 4. `.tasks/00006-edge-agentic/INDEX.md` — Update index

---

## How Tool Calls Work in Mocks

Important: tools are **client-side**. The mock SSE response only tells the client _which tool to call with what arguments_. The client (`useChat`) then executes the tool locally using the SDK, which hits the MSW-mocked Edge API.

Flow for "list my bridges":

1. User sends message → `POST /api/chat` (intercepted by MSW chat mock in browser)
2. Mock returns SSE: `TOOL_CALL_START` + `TOOL_CALL_ARGS({"operation":"list"})` + `RUN_FINISHED(tool_calls)`
3. Client executes `queryBridges({ operation: "list" })` → SDK calls `GET /api/v1/management/bridges` (intercepted by MSW Edge API mock)
4. Tool returns bridge data to `useChat`
5. `useChat` sends follow-up `POST /api/chat` with tool result in messages
6. Mock returns SSE: text summary like "Here are your 2 bridges..."

Both mock layers work together: chat mock drives tool calls, Edge API mock provides the data.

---

## Verification

1. Set `VITE_MOCK_AGENT_CHAT=true` in `.env`
2. `pnpm dev` — no Ollama or Anthropic needed
3. Open chat, type "list my bridges" → tool call fires → table renders
4. Type "go to workspace" → navigation tool fires
5. Type "hello" → simple text response streams in
6. Set `VITE_MOCK_AGENT_CHAT=false` → chat uses real provider again
7. Set `VITE_MOCK_EDGE_API=false` → Edge API calls go to real backend
8. `pnpm build` passes
