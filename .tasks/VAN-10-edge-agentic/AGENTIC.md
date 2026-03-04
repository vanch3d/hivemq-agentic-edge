# Edge Agentic — Developer Guide

Conversational AI agent for the HiveMQ Edge management UI. Users chat
with an assistant that can query resources, navigate the app, and
create/update/delete entities — all within a 400px side drawer.

---

## Quick Start

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env — set ANTHROPIC_API_KEY or switch to Ollama

# 2. Install and run
pnpm install
pnpm dev
```

Open the app, click the chat icon in the toolbar (or press `Ctrl+K` /
`Cmd+K`) to open the drawer.

---

## Environment Variables

```env
# Provider: "anthropic" (default) or "ollama"
AI_PROVIDER=anthropic

# Anthropic (required when AI_PROVIDER=anthropic)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-5

# Ollama (required when AI_PROVIDER=ollama)
OLLAMA_MODEL=llama3.1
OLLAMA_HOST=http://localhost:11434

# MSW mock toggles (dev only)
VITE_MOCK_EDGE_API=true    # Mock HiveMQ Edge REST API (default: on)
VITE_MOCK_AGENT_CHAT=false # Mock /api/chat SSE (default: off)
```

### Running without any API key

Set `VITE_MOCK_AGENT_CHAT=true` in `.env`. This enables an MSW handler
that returns canned SSE responses for `/api/chat`, so the chat UI works
without Anthropic or Ollama. The mock recognizes keywords in user
messages ("bridge", "adapter", "navigate", "create") and returns
matching tool calls that exercise the full agent loop against the
MSW-mocked Edge API.

### Running with Ollama

```bash
ollama pull llama3.1
# Set AI_PROVIDER=ollama, OLLAMA_MODEL=llama3.1 in .env
pnpm dev
```

See [OLLAMA_SUPPORT.md](./OLLAMA_SUPPORT.md) for known bugs,
workarounds, and model-specific tool calling limitations.

---

## Architecture

```
Browser (SPA)                          Hono (inside Vite dev server)
┌─────────────────────┐               ┌──────────────────────────────┐
│ useChat()           │── SSE ──────→ │ POST /api/chat               │
│   messages          │               │                              │
│   tools (client)    │               │  resolveAdapter()            │
│                     │               │    ├─ anthropic → as-is      │
│                     │               │    └─ ollama → patchOllama() │
│                     │←── AG-UI ────│                              │
│                     │   events      │  chat({                      │
│ Client Tools:       │               │    adapter,                  │
│   queryBridges()    │               │    tools: allToolDefinitions,│
│   mutateBridge()    │               │    systemPrompts,            │
│   navigateTo()      │               │  })                          │
│         │           │               └──────────┬───────────────────┘
│         ▼           │                          │
│ Generated SDK       │                ┌─────────┴─────────┐
│ (HiveMQ Edge API)   │               │ Ollama or Anthropic │
└─────────────────────┘                └───────────────────┘
```

### Key points

- **Single process**: Hono runs inside Vite via `@hono/vite-dev-server`.
  No separate backend to start.
- **Client-side tools**: All tool execution happens in the browser using
  the generated SDK. The server only proxies messages to the AI provider.
- **Tool definitions are shared**: `src/agent/tool-definitions.ts`
  exports metadata (name, description, schemas) used by both the server
  (`chat({ tools })`) and the client (`.client()` executors). This file
  must stay free of browser-only imports.
- **AG-UI protocol**: Communication between server and client uses
  TanStack AI's SSE-based AG-UI event protocol (`RUN_STARTED`,
  `TEXT_MESSAGE_CONTENT`, `TOOL_CALL_START`, etc.).

---

## File Map

### Server (`server/`)

| File                     | Purpose                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `index.ts`               | Hono app entry — CORS + route mounting                                                                                                                       |
| `api/chat.ts`            | `POST /api/chat` — provider selection (`resolveAdapter()`), passes `tools` + `systemPrompts` to `chat()`                                                     |
| `system-prompt.ts`       | System prompt (~170 lines) with full domain ontology, tool usage guidelines, response style rules                                                            |
| `ollama-agui-adapter.ts` | `patchOllamaAdapter()` — wraps Ollama adapter to fix AG-UI event type mismatch and system prompt injection (workaround for `@tanstack/ai-ollama@0.3.0` bugs) |

### Agent (`src/agent/`)

| File                   | Purpose                                                                                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tool-definitions.ts`  | Shared tool metadata (10 definitions). Imported by server for `chat({ tools })` and by each tool file for `.client()`. No browser deps.                           |
| `tool-context.ts`      | Module-level refs for navigation, form requests, and approval requests. Tools execute outside React's component tree, so `ChatProvider` populates these on mount. |
| `form-schemas.ts`      | Maps `"toolName.operation"` → JSON schema for inline mutation forms. Uses generated OpenAPI schemas.                                                              |
| `tools/index.ts`       | Re-exports all 10 tool client executors                                                                                                                           |
| `tools/query-*.ts`     | Query tools — call SDK read endpoints, return `{ data, error }`                                                                                                   |
| `tools/mutate-*.ts`    | Mutation tools — show inline form → approval card → SDK write call                                                                                                |
| `tools/navigate-to.ts` | Navigation tool — calls `router.navigate()` via tool-context ref                                                                                                  |

### Chat UI (`src/components/chat/`)

| File                      | Purpose                                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `chat-drawer.tsx`         | Main Drawer shell (400px right). Model badge in header, error banner, message list, input area, form/approval overlays. |
| `message-list.tsx`        | Scrollable message container. Auto-scroll. Loading indicator ("Thinking...") while waiting for response.                |
| `message-bubble.tsx`      | User/assistant message styling. Renders tool results as tables (via `ChatTable`).                                       |
| `chat-input.tsx`          | Textarea + send button. Enter sends, Shift+Enter newline.                                                               |
| `chat-table.tsx`          | Generic TanStack Table for collection query results. Search, sort, pagination.                                          |
| `chat-form.tsx`           | Inline RJSF form for mutations. Progressive disclosure: required fields first, expandable to full schema.               |
| `approval-card.tsx`       | Confirmation UI for mutations. User must approve before SDK call executes.                                              |
| `tool-status.tsx`         | Tool call/result indicator badges in message bubbles.                                                                   |
| `thinking-part.tsx`       | Collapsible display for model thinking/reasoning steps.                                                                 |
| `chat-toggle-button.tsx`  | Toolbar icon button to open/close the drawer.                                                                           |
| `chat-error-boundary.tsx` | Error boundary wrapping `ChatProvider`.                                                                                 |

### Context (`src/context/`)

| File               | Purpose                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chat-context.tsx` | `ChatProvider` + `useChatContext()`. Wraps `useChat`, manages drawer state, form/approval coordination, model tracking (via `onChunk`), keyboard shortcut (Ctrl+K). |

### Mocks (`src/mocks/`)

| File                       | Purpose                                                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `handlers.ts`              | Conditional handler aggregation. `VITE_MOCK_EDGE_API` toggles Edge API mocks, `VITE_MOCK_AGENT_CHAT` toggles chat SSE mock. |
| `handlers/chat.ts`         | MSW handler for `POST /api/chat`. Returns canned SSE streams with tool calls based on keyword matching in user messages.    |
| `handlers/bridges.ts` etc. | MSW handlers for HiveMQ Edge REST API endpoints.                                                                            |

---

## Tools

### Design

Tools are grouped by domain (bridges, adapters, data hub, system) and
use discriminated unions on the `operation` field. This keeps the tool
count at 10 instead of 40+ individual endpoints.

Each tool has two parts:

1. **Definition** (`tool-definitions.ts`) — name, description, input/output
   Zod schemas. Pure metadata, no side effects.
2. **Client executor** (`tools/*.ts`) — `.client()` callback that calls
   the generated SDK. May import browser-only code.

### Tool inventory

| Tool            | Type     | Operations                                                                                                                                                                     |
| --------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `queryBridges`  | query    | list, get, listStatus, getStatus                                                                                                                                               |
| `queryAdapters` | query    | list, get, listTypes, getType, listTags, listNorthbound, listSouthbound, getStatus, listAllStatus                                                                              |
| `queryDataHub`  | query    | listBehaviorPolicies, getBehaviorPolicy, listDataPolicies, getDataPolicy, listSchemas, getSchema, listScripts, getScript, listFsms, listFunctionSpecs, listVariables           |
| `querySystem`   | query    | events, metrics, notifications, capabilities, liveness, readiness, listeners, isa95, pulseStatus, listCombiners, getCombiner, listTopicFilters, getTopicFilter, configuration  |
| `querySampling` | query    | samples, schema                                                                                                                                                                |
| `navigateTo`    | action   | navigate to any route in the app                                                                                                                                               |
| `mutateBridge`  | mutation | create, update, delete, transitionStatus                                                                                                                                       |
| `mutateAdapter` | mutation | create, update, delete, transitionStatus                                                                                                                                       |
| `mutateDataHub` | mutation | createBehaviorPolicy, updateBehaviorPolicy, deleteBehaviorPolicy, createDataPolicy, updateDataPolicy, deleteDataPolicy, createSchema, deleteSchema, createScript, deleteScript |
| `mutateSystem`  | mutation | addTopicFilter, updateTopicFilter, deleteTopicFilter, addCombiner, updateCombiner, deleteCombiner, setIsa95                                                                    |

### Adding a new tool

1. Add the definition in `src/agent/tool-definitions.ts`:
   ```typescript
   export const myToolDef = toolDefinition({
     name: "myTool",
     description: "...",
     inputSchema: z.object({ ... }),
     outputSchema: z.object({ data: z.unknown(), error: z.string().optional() }),
   });
   ```
2. Add it to the `allToolDefinitions` array in the same file.
3. Create `src/agent/tools/my-tool.ts`:
   ```typescript
   import { myToolDef } from "@/agent/tool-definitions";
   export const myTool = myToolDef.client(async (input) => { ... });
   ```
4. Re-export from `src/agent/tools/index.ts`.
5. Register in `src/context/chat-context.tsx` — add to `clientTools()`.
6. Update the system prompt in `server/system-prompt.ts` if the model
   needs guidance on when to use it.

### Mutation flow

```
User: "Create a bridge"
  → Model emits TOOL_CALL: mutateBridge({ operation: "create" })
    → Client executor runs:
      1. getFormSchema("mutateBridge", "create") → JSON schema
      2. requestFormInput({ schema, title }) → renders inline form
      3. User fills form → clicks Submit
      4. requestApproval({ title, description }) → renders confirmation card
      5. User clicks Approve
      6. addBridge({ body: formData }) → SDK call
      7. Return { data, error } to model
  → Model: "Bridge created successfully."
```

All mutations require explicit user approval. The form → approval flow
uses Promise-based coordination: `requestFormInput()` and
`requestApproval()` in `tool-context.ts` return Promises that resolve
when the user interacts with the UI.

---

## System Prompt

`server/system-prompt.ts` contains the full system prompt (~170 lines)
with four sections:

1. **Identity** — "You are an AI assistant for HiveMQ Edge..."
2. **Domain ontology** — Complete domain map (adapters, bridges, tags,
   mappings, policies, etc.) derived from task 00005
3. **Tool usage guidelines** — When to query vs mutate, confirmation
   rules, how to present results
4. **Response style** — Concise, bullet points, tables for collections

The ontology gives the model deep understanding of HiveMQ Edge's domain
without needing to call tools first. This is critical for interpreting
user requests correctly (e.g. "bridge" means MQTT bridge, not a network
bridge).

---

## Mock Layers

Two independent mock layers can be toggled via env vars:

### Edge API mocks (`VITE_MOCK_EDGE_API=true`, default ON)

MSW handlers that mock the HiveMQ Edge REST API. Tools call the
generated SDK which hits these mocks. Provides realistic fixture data
for bridges, adapters, data hub resources, etc.

### Agent chat mock (`VITE_MOCK_AGENT_CHAT=true`, default OFF)

MSW handler for `POST /api/chat` that returns canned SSE streams.
Keyword matching on the last user message determines the response:

| User says (contains) | Mock response                                         |
| -------------------- | ----------------------------------------------------- |
| "bridge"             | `TOOL_CALL` → `queryBridges({ operation: "list" })`   |
| "adapter"            | `TOOL_CALL` → `queryAdapters({ operation: "list" })`  |
| "navigate" / "go to" | `TOOL_CALL` → `navigateTo({ path: "/workspace" })`    |
| "create" / "add"     | `TOOL_CALL` → `mutateBridge({ operation: "create" })` |
| anything else        | Simple streaming text reply                           |

When both mocks are on, the full agent loop works end-to-end: chat mock
returns tool calls → client executes tools → SDK hits Edge API mock →
tool results feed back to chat mock.

---

## Provider Configuration

### Anthropic (default)

Set `ANTHROPIC_API_KEY` in `.env`. Optionally set `ANTHROPIC_MODEL`
(defaults to `claude-sonnet-4-5`). Supported models:

- `claude-opus-4-5`
- `claude-sonnet-4-5`
- `claude-haiku-4-5`
- `claude-opus-4-1`
- `claude-sonnet-4`
- `claude-3-7-sonnet`
- `claude-opus-4`
- `claude-3-5-haiku`
- `claude-3-haiku`

### Ollama

Set `AI_PROVIDER=ollama` in `.env`. The Ollama adapter has two known
bugs in `@tanstack/ai-ollama@0.3.0` that are worked around by
`patchOllamaAdapter()` in `server/ollama-agui-adapter.ts`:

1. **Wrong SSE event types** — Emits `"content"` instead of
   `"TEXT_MESSAGE_CONTENT"`, etc.
2. **System prompts dropped** — `systemPrompts` option is silently
   ignored.

Both workarounds can be removed once the upstream package is fixed.

Tool calling quality varies by model size. Smaller models (7B/8B) tend
to describe tool calls in text rather than emitting native tool call
events. See [OLLAMA_SUPPORT.md](./OLLAMA_SUPPORT.md) for details.

---

## Debugging

### Server-side logs

The server logs the active provider and model on each request:

```
[chat] Using Anthropic provider: model=claude-sonnet-4-5
```

With Ollama, the patched adapter logs each stream event:

```
[ollama-patch] chatStream called, messages: 4 tools: 10
[ollama-patch] chunk type: content
[ollama-patch] chunk type: content
[ollama-patch] chunk type: done
```

`tools: 0` in the log means tool definitions are not reaching the
server — check that `allToolDefinitions` is imported correctly in
`server/api/chat.ts`.

### Ollama GPU check

```bash
ollama ps
# PROCESSOR column shows "100% GPU", "100% CPU", or a split
```

CPU-only or split inference with the full system prompt is slow (10–60+
seconds for first token). If you see anything other than `100% GPU`,
follow the step-by-step optimization guide in
[OLLAMA_SUPPORT.md — GPU Performance & VRAM Optimization](./OLLAMA_SUPPORT.md#gpu-performance--vram-optimization).

**Quick fixes:** Enable Flash Attention (`OLLAMA_FLASH_ATTENTION=1`),
enable KV cache quantization (`OLLAMA_KV_CACHE_TYPE=q8_0`), and ensure
`num_ctx` is 4096 or lower.

### Common issues

| Symptom                                    | Likely cause                                                                           |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| Chat shows nothing despite SSE stream      | AG-UI event type mismatch — check Ollama adapter patch                                 |
| Model ignores HiveMQ context               | System prompts not injected — check `patchOllamaAdapter`                               |
| `tools: 0` in server log                   | `allToolDefinitions` not passed to `chat()` in `server/api/chat.ts`                    |
| Model describes tools in text              | Model too small for native tool calling — try larger model or use Anthropic            |
| Form doesn't appear after tool call        | `requestFormInput` not registered — check `ChatProvider` effects                       |
| "ANTHROPIC_API_KEY is not configured"      | Missing `.env` or `AI_PROVIDER` not set to `ollama`                                    |
| `UND_ERR_HEADERS_TIMEOUT` / "fetch failed" | Ollama too slow — model not fully on GPU. See OLLAMA_SUPPORT.md GPU optimization       |
| Ollama hangs after `RUN_STARTED`           | Model processing prompt on CPU — wait longer, or optimize GPU loading (see above)      |
| `ollama ps` shows CPU/GPU split            | Model doesn't fit in VRAM — reduce `num_ctx`, enable Flash Attention + KV quantization |

---

## Security Notes

- `ANTHROPIC_API_KEY` stays server-side, never sent to the browser.
- The model can only execute the 10 registered tools — no arbitrary code
  execution, no filesystem access.
- All mutations require explicit user approval before the SDK call fires.
- `/api/chat` has no authentication. In production, forward and validate
  the user's JWT server-side.

---

## Related Docs

| File                                         | Description                                 |
| -------------------------------------------- | ------------------------------------------- |
| [TASK_BRIEF.md](./TASK_BRIEF.md)             | Original user requirements                  |
| [TASK_PLAN.md](./TASK_PLAN.md)               | Architecture, phases, status                |
| [OLLAMA_SUPPORT.md](./OLLAMA_SUPPORT.md)     | Ollama bugs, workarounds, model limitations |
| [AGENT_CHAT_MOCKS.md](./AGENT_CHAT_MOCKS.md) | MSW chat mock design                        |
