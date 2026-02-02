# Task Plan: Edge Agentic — Conversational AI Agent

## Architecture

```
Browser (SPA)                         Hono (inside Vite dev server)
┌───────────────────────┐             ┌──────────────────────┐
│ useChat() hook        │── SSE ────→ │ POST /api/chat       │
│   sendMessage()       │             │   chat({             │
│   messages ←──────────│←────────────│     adapter: claude   │
│                       │             │     tools: [defs]    │
│ Client Tools:         │             │     systemPrompt     │
│   queryBridges()      │             │   })                 │
│   mutateAdapter()     │             └──────────┬───────────┘
│   navigateTo()        │                        │
│         │             │                   Anthropic API
│         ▼             │                        ▼
│ Generated SDK (Axios) │                   Claude (Sonnet 4)
│ HiveMQ Edge API       │
└───────────────────────┘
```

- **Server**: `@hono/vite-dev-server` — Hono runs inside Vite's dev server (single process). Only handles Claude API proxy. No HiveMQ Edge API calls server-side.
- **Client tools**: Execute HiveMQ Edge API calls using the existing generated SDK + Axios interceptor (auth token already attached).
- **Model**: Configurable via `ANTHROPIC_MODEL` env var, defaults to `claude-sonnet-4-5-20250514`.
- **Forms**: Inline in chat panel (400px drawer). All mutations require user approval.

---

## Packages to Install

**Production:**

- `@tanstack/ai` — Core (chat, toolDefinition, toServerSentEventsResponse)
- `@tanstack/ai-react` — React hooks (useChat, fetchServerSentEvents)
- `@tanstack/ai-anthropic` — Claude adapter
- `@tanstack/react-table` — Headless table for inline query result rendering

**Dev:**

- `hono` — HTTP framework for /api/chat endpoint
- `@hono/vite-dev-server` — Integrates Hono into Vite dev server

`zod` already installed (v4.3.6). `concurrently` NOT needed (single process).

---

## Tool Design: Domain-Grouped with Discriminated Unions

~11 tools total (5 query + 4 mutation + navigate + showForm). Each uses a discriminated union on `operation` to keep the tool count manageable for Claude's context while giving enough structure.

```typescript
// Example: query-bridges.ts
const queryBridgesDef = toolDefinition({
  name: "queryBridges",
  description: "Query bridge resources.",
  inputSchema: z.object({
    operation: z.enum(["list", "get", "listStatus", "getStatus"]),
    bridgeId: z.string().optional(),
  }),
  outputSchema: z.object({
    data: z.unknown(),
    error: z.string().optional(),
  }),
}).client(async (input) => {
  switch (input.operation) {
    case "list": {
      const { data, error } = await getBridges();
      return { data: data?.items, error: error?.title };
    }
    // ...
  }
});
```

### Tool Inventory

| Tool Name       | Type   | Operations                                                                             |
| --------------- | ------ | -------------------------------------------------------------------------------------- |
| `queryBridges`  | client | list, get, listStatus, getStatus                                                       |
| `queryAdapters` | client | list, get, listTypes, getType, listTags, listMappings, status                          |
| `queryDataHub`  | client | behavior/data policies, schemas, scripts, FSMs, functions                              |
| `querySystem`   | client | events, metrics, notifications, health, listeners, UNS, Pulse                          |
| `querySampling` | client | samples for topic, schema for topic                                                    |
| `mutateBridge`  | client | create, update, delete, transitionStatus                                               |
| `mutateAdapter` | client | create, update, delete, transitionStatus, tags, mappings                               |
| `mutateDataHub` | client | create/update/delete policies, schemas, scripts                                        |
| `mutateSystem`  | client | topic filters, combiners, UNS, Pulse activation                                        |
| `navigateTo`    | client | navigate to any known route in the app                                                 |
| `queryGraph`    | client | dataFlow, adapterTopology, policyImpact, bridgeTopology, combinerSources (future task) |

**Key design decision**: All tools execute client-side. The server only proxies chat messages to Anthropic. HiveMQ Edge API calls use the existing generated SDK with the JWT interceptor already in place.

---

## System Prompt Strategy

File: `server/system-prompt.ts`

Sections:

1. **Identity** — "You are an AI assistant for HiveMQ Edge, an IoT gateway..."
2. **Domain knowledge** — Full text of `DOMAIN_ONTOLOGY.md` (~8K tokens, from task 00005)
3. **Tool usage guidelines** — When to query vs mutate, how to present results, confirmation rules
4. **Response style** — Concise, bullet points, tables for data, domain terminology

Use Anthropic's prompt caching to reduce cost after the first message in a session.

---

## Query Result Rendering

Query results need context-appropriate rendering. Three tiers:

### 1. Inline text (default for single items or small results)

Claude summarizes the result as formatted text in a chat bubble. Suitable for single-entity lookups ("get bridge X"), status checks, health probes, scalar metrics.

### 2. Inline table (for collections)

When a query returns a list (bridges, adapters, events, policies, etc.), render an interactive table inline in the chat using **TanStack Table** + Chakra UI.

The agent returns a **column spec + data** from the tool result, and a generic `ChatTable` component renders it:

```typescript
// Tool result shape for collection responses
{
  display: 'table',
  table: {
    columns: [
      { id: 'id', header: 'ID', accessorKey: 'id' },
      { id: 'status', header: 'Status', accessorKey: 'status.connection' },
      { id: 'host', header: 'Host', accessorKey: 'host' },
    ],
    data: [ ... ],        // row objects
  }
}
```

`ChatTable` features:

- **Search**: global text filter across all columns
- **Column sorting**: click headers to sort
- **Pagination**: client-side, sensible page size for the 400px drawer (e.g. 10 rows)
- **Column visibility**: toggle columns if the table is too wide
- **Row click**: optional action (e.g. navigate to detail page, or feed entity back to conversation)

Implementation: a single reusable `src/components/chat/chat-table.tsx` component that accepts TanStack Table `ColumnDef[]` and `data[]`. Each query tool decides which columns to surface based on the operation.

### 3. Inline graph (for relationships — future, integrated from onset)

The HiveMQ Edge domain is fundamentally a **data flow graph**:

```
PLC/Sensor ──→ Adapter ──→ DomainTag ──→ NorthboundMapping ──→ MQTT Topic
                                                                    │
                                              TopicFilter ←─────────┤
                                              DataPolicy  ←─────────┤
                                              Bridge ──→ Remote Broker
                                              Combiner ──→ Pulse Asset
                                                    ↑
                              SouthboundMapping ←───┘
```

Many useful queries cross entity boundaries:

- "Show me the data path from the OPC-UA adapter to the cloud"
- "Which policies apply to topics published by adapter X?"
- "What's connected to the Modbus device?"
- "Show me all tags that are mapped to MQTT topics"

**React Flow** renders these as interactive node-edge diagrams inline in the chat, following the same pattern as `ChatTable`.

```typescript
// Tool result shape for graph responses
{
  display: 'graph',
  graph: {
    nodes: [
      { id: 'adapter-1', type: 'adapter', label: 'OPC-UA #1', data: { status: 'CONNECTED' } },
      { id: 'tag-temp', type: 'tag', label: 'Temperature', data: { ... } },
      { id: 'topic-1', type: 'topic', label: 'devices/plc1/temp', data: { ... } },
    ],
    edges: [
      { source: 'adapter-1', target: 'tag-temp', label: 'exposes' },
      { source: 'tag-temp', target: 'topic-1', label: 'northbound' },
    ],
  }
}
```

`ChatGraph` component:

- Renders a React Flow canvas inline in the chat (fixed height, e.g. 300px within the 400px drawer)
- **Node types** styled per domain entity: adapter, tag, topic, bridge, policy, combiner (color-coded, with icons)
- **Auto-layout**: Uses dagre or elkjs for automatic graph layout (left-to-right data flow)
- **Interactive**: Pan, zoom, click node to inspect details or feed back to conversation
- **Status overlay**: Node color/border reflects runtime status (green=connected, red=error, gray=stopped)

#### Graph query tool

A dedicated tool assembles cross-domain graph data:

```typescript
const queryGraphDef = toolDefinition({
  name: "queryGraph",
  description:
    "Query relationships between domain entities. Returns nodes and edges for visualization.",
  inputSchema: z.object({
    scope: z.enum([
      "dataFlow", // full adapter → tag → topic → bridge/policy path
      "adapterTopology", // single adapter's tags, mappings, topics
      "policyImpact", // topics matched by a policy and their sources
      "bridgeTopology", // bridge subscriptions and connected topics
      "combinerSources", // combiner's source entities and destination
    ]),
    entityId: z.string().optional(), // focus entity
  }),
  outputSchema: z.object({
    display: z.literal("graph"),
    graph: z.object({
      nodes: z.array(
        z.object({
          id: z.string(),
          type: z.string(),
          label: z.string(),
          data: z.unknown(),
        }),
      ),
      edges: z.array(
        z.object({
          source: z.string(),
          target: z.string(),
          label: z.string().optional(),
        }),
      ),
    }),
  }),
});
```

The tool's `.client()` implementation calls multiple SDK queries and **assembles the graph client-side** — e.g. for `adapterTopology`, it fetches the adapter, its tags, its northbound/southbound mappings, and resolves the connected topics into a node-edge structure.

#### Integration plan

This is a **separate task** (00007 or later) but the architecture is designed to support it from the start:

1. **Phase 3 (this task)**: Tool result `display` discriminant (`'text' | 'table' | 'graph'`) built into the result schema from day one. `message-bubble.tsx` dispatches to the right renderer. Graph results fall back to text summary until `ChatGraph` exists.
2. **Future task**: Install `reactflow`, create `ChatGraph` component, implement `queryGraph` tool, define node types and auto-layout, add graph-specific MSW fixtures.

This ensures the conversation protocol is graph-aware even before the renderer ships.

### 4. In-app navigation (for detailed views)

For deep inspection, Claude uses `navigateTo` to send the user to a dedicated page. These pages are yet to be developed but the routing is already in place. The agent can say "Here's a summary — I've also opened the detail page for you."

### Column definition strategy

Each query tool defines column specs per operation. For example, `queryBridges` with `operation: 'list'` returns columns `[id, host, port, connection status, runtime status]`. This keeps domain knowledge in the tools rather than in a separate mapping layer.

### Display discriminant

All tool results use a `display` field to signal rendering intent:

| `display` value    | Renderer                        | Status                           |
| ------------------ | ------------------------------- | -------------------------------- |
| `'text'` (default) | `message-bubble.tsx` (markdown) | Phase 3                          |
| `'table'`          | `ChatTable` (TanStack Table)    | Phase 3                          |
| `'graph'`          | `ChatGraph` (React Flow)        | Future task — falls back to text |

The system prompt instructs Claude to prefer table display for collections, graph for relationship queries, and text for single entities.

---

## Form Coordination (Mutation Flow)

```
Claude: "I'll create a bridge. Please fill in the details."
  → tool call: mutateBridge({ operation: 'create' })
    → client tool renders inline SchemaForm (required fields only)
      → user fills form
        → [optional] user clicks "Show all fields" or asks Claude to expand
          → form re-renders with full schema
      → user clicks Submit
        → approval card: "Create bridge mqtt-bridge-01?"
          → user clicks Approve
            → SDK call: addBridge({ body: formData })
              → result returned to Claude
Claude: "Bridge mqtt-bridge-01 created successfully."
```

Implementation: Promise-based in ChatContext. Tool `.client()` calls `context.requestFormInput(schema)` which sets React state → renders the form → returns a Promise that resolves when the user submits.

### Progressive Form Strategy

Forms render in a 400px drawer, so complex schemas (e.g. adapter configs with 20+ fields) need a progressive approach:

1. **Default: required fields only** — The form initially renders with a filtered schema containing only properties listed in `required`. This keeps the form compact and focused on what's mandatory.
2. **Expand trigger** — Two ways to show the full schema:
   - **UI**: A "Show all fields" toggle/button below the form
   - **Conversational**: User asks Claude e.g. "I need to configure TLS too" → Claude re-issues the form with `expanded: true`
3. **Implementation**: `chat-form.tsx` receives the full schema but derives a `requiredOnlySchema` by filtering `properties` to those in `required`. A local state boolean (`expanded`) switches between the two. When expanding, existing field values are preserved.
4. **Claude can pre-fill**: The mutation tool accepts an optional `prefill` object. Claude can populate known values from conversation context (e.g. user said "create a bridge to broker.example.com on port 1883"), reducing what the user needs to fill manually.

---

## File Structure

```
server/
  index.ts                     — Hono app entry
  api/chat.ts                  — POST /api/chat handler (provider routing, tool registration)
  system-prompt.ts             — System prompt with ontology
  ollama-agui-adapter.ts       — Ollama bug workaround (stream transform + system prompt injection)
  tsconfig.json                — Node target config

src/
  context/
    chat-context.tsx            — Chat state + drawer + form coordination + model tracking
  components/
    chat/
      chat-drawer.tsx           — Main Drawer shell (model badge, error banner)
      chat-toggle-button.tsx    — Toolbar icon button
      message-list.tsx          — Scrollable message container (loading indicator)
      message-bubble.tsx        — User/assistant message styling
      chat-input.tsx            — Input area
      chat-form.tsx             — Inline RJSF form for mutations (progressive: required-only → full)
      chat-table.tsx            — Generic TanStack Table for collection results (search, sort, paginate)
      tool-status.tsx           — Tool call/result indicators
      thinking-part.tsx         — Collapsible thinking display
      approval-card.tsx         — Mutation confirmation card
      chat-error-boundary.tsx   — Error boundary around ChatProvider
    rjsf-templates/
      field-template.tsx        — Custom RJSF FieldTemplate (descriptions as helper text below input)
  agent/
    tool-definitions.ts         — Shared tool metadata (10 definitions, server-importable)
    tools/
      index.ts                  — Re-exports all tools
      query-bridges.ts          — Client executor (imports def from tool-definitions.ts)
      query-adapters.ts
      query-data-hub.ts
      query-system.ts
      query-sampling.ts
      mutate-bridge.ts
      mutate-adapter.ts
      mutate-data-hub.ts
      mutate-system.ts
      navigate-to.ts
    tool-context.ts             — Shared context (router ref, form request, approval request)
    form-schemas.ts             — Operation → JSON schema mapping
  components/
    schema-form.tsx             — SchemaForm with custom RJSF templates
  mocks/
    handlers/
      chat.ts                   — MSW mock for /api/chat SSE (conditional via VITE_MOCK_AGENT_CHAT)
    handlers.ts                 — Conditional handler aggregation (Edge API vs Agent mocks)
  auth-token.ts                 — Token persistence via sessionStorage (survives HMR)
```

**Modified files:**

- `vite.config.ts` — add `@hono/vite-dev-server` plugin
- `src/routes/_authenticated/workspace.tsx` — ChatProvider + ChatDrawer
- `src/components/workspace/toolbar.tsx` — chat toggle button
- `src/locales/en-US.json` — `chat.*` keys
- `src/context/auth-context.tsx` — Initialize from persisted token (HMR fix)
- `package.json` — new deps
- `.env` / `.env.example` — AI provider config, mock toggles
- `.gitignore` — `.env`

---

## Implementation Phases

### Phase 1: Infrastructure ✅

- [x] Install packages
- [x] Create `server/index.ts` — Hono app entry
- [x] Create `server/api/chat.ts` — POST /api/chat handler
- [x] Configure `@hono/vite-dev-server` in `vite.config.ts`
- [x] Create `server/tsconfig.json`
- [x] Add `.env` with `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL`, update `.gitignore`, add `.env.example`
- [x] Create `AGENTIC.md` — developer README

### Phase 2: Basic Chat UI ✅

- [x] Create `src/context/chat-context.tsx` — wraps `useChat`, manages drawer state
- [x] Create `src/components/chat/chat-drawer.tsx` — Chakra Drawer (right, 400px)
- [x] Create `src/components/chat/message-list.tsx` — scrollable, auto-scroll
- [x] Create `src/components/chat/message-bubble.tsx` — user vs assistant styling
- [x] Create `src/components/chat/chat-input.tsx` — textarea + send, Enter/Shift+Enter
- [x] Create `src/components/chat/chat-toggle-button.tsx` — toolbar icon button
- [x] Modify `src/components/workspace/toolbar.tsx` — add toggle button
- [x] Modify `src/routes/_authenticated/workspace.tsx` — ChatProvider + ChatDrawer
- [x] Create `server/system-prompt.ts` — system prompt with full domain ontology
- [x] Add i18n keys to `src/locales/en-US.json` — `chat.*` namespace

### Phase 3: Query Tools & Result Rendering ✅

- [x] Create `src/agent/tool-context.ts` — shared context (router ref, form/approval requests)
- [x] Create query tool definitions + client implementations (5 files)
- [x] Create `src/agent/tools/index.ts` — re-exports
- [x] Create `src/components/chat/chat-table.tsx` — generic TanStack Table (search, sort, paginate)
- [x] Create `src/components/chat/tool-status.tsx` — call/result UI
- [x] Update `message-bubble.tsx` to render tool results as tables
- [x] Wire tools into `useChat` in chat context
- [x] Update system prompt with tool descriptions
- [x] Create MSW fixtures and handlers for all Edge API resources
- [x] Register new handlers in `src/mocks/handlers.ts`

### Phase 4: Navigation Tool ✅

- [x] Create `src/agent/tools/navigate-to.ts`
- [x] Wire router reference into tool context
- [x] Update system prompt

### Phase 5: Mutation Tools with Forms ✅

- [x] Create `src/agent/form-schemas.ts` — operation → JSON schema mapping
- [x] Add form request/response coordination to `chat-context.tsx`
- [x] Create `src/components/chat/chat-form.tsx` — inline SchemaForm (progressive fields)
- [x] Create `src/components/chat/approval-card.tsx` — confirmation UI
- [x] Create mutation tool definitions + client implementations (4 files)
- [x] Add mutation MSW handlers
- [x] Wire mutation tools into useChat, update system prompt

### Phase 6: Polish ✅

- [x] Create `src/components/chat/thinking-part.tsx`
- [x] Keyboard shortcut (Ctrl+K / Cmd+K) to toggle drawer
- [x] Error boundary around ChatProvider (`chat-error-boundary.tsx`)
- [x] Chat error banner with dismiss + nested JSON parsing (Anthropic errors)
- [x] Custom RJSF FieldTemplate (descriptions as helper text below inputs)
- [x] Auth token persistence via sessionStorage (fixes HMR navigation loop)
- [x] Run build + lint — all passing

### Phase 7: Agent Chat Mocks ✅

- [x] Create `src/mocks/handlers/chat.ts` — MSW mock for `/api/chat` SSE
- [x] Conditional mock toggles (`VITE_MOCK_EDGE_API`, `VITE_MOCK_AGENT_CHAT`)
- [x] Fix tool execution in mocks (add `CUSTOM` event with `tool-input-available`)
- [x] Fix `ToolResultStatus` to parse `part.content` (JSON string, not `part.result`)
- [x] Fix `ToolCallStatus` state values (`awaiting-input`/`input-streaming`)

### Phase 8: Ollama Support — In Progress

- [x] Install `@tanstack/ai-ollama`
- [x] Provider routing in `server/api/chat.ts` (`resolveAdapter()`)
- [x] Bug workaround: AG-UI event type mismatch (`patchOllamaAdapter`)
- [x] Bug workaround: System prompts dropped (inject `{ role: "system" }`)
- [x] Extract shared tool definitions (`src/agent/tool-definitions.ts`)
- [x] Pass `tools: allToolDefinitions` to server-side `chat()` call
- [x] Model badge in chat header (via `onChunk` callback)
- [x] Loading indicator ("Thinking...") while waiting for response
- [ ] Verify native tool calling works with a capable model
- [ ] Test with Anthropic to confirm no regressions
- [ ] Document in AGENTIC.md developer README

---

## Security Model

**In scope for this POC:**

- `ANTHROPIC_API_KEY` stays server-side in `.env`, never sent to the browser.
- Claude can **only** execute the tools we register — no web search, no arbitrary code execution, no filesystem access.
- All mutation tools require explicit user approval before executing the SDK call.
- Tool results are structured (data + error) — Claude cannot invoke arbitrary SDK functions.

**Open issues (deferred, not needed for POC):**

- [ ] **No auth on `/api/chat`**: The endpoint has no JWT validation. Anyone on the local network can call it. For production, forward the user's JWT and validate server-side.
- [ ] **No rate limiting or token budget**: Long conversations can accumulate cost with no guardrail. Consider a max message count or token cap.
- [ ] **Prompt injection via tool results**: Malicious data in API responses could theoretically influence Claude's behavior. Mitigate with system prompt instructions to treat tool results as untrusted data.
- [ ] **No conversation isolation**: All conversations share the same system prompt and tools. No multi-tenancy concerns for single-user local dev, but relevant if deployed.

---

## MSW Handlers

All query and mutation tools need corresponding MSW handlers so development works without a live HiveMQ Edge instance or Anthropic API key.

**Pattern** (follows existing `src/mocks/` conventions):

```
src/mocks/
  fixtures/
    bridges.ts              — BridgeList, Bridge, StatusList mock data
    adapters.ts             — AdaptersList, ProtocolAdapterList, tags, mappings
    data-hub.ts             — Policies, schemas, scripts, FSMs, functions
    system.ts               — Metrics, listeners, UNS config, capabilities
    sampling.ts             — Sample payloads
  handlers/
    bridges.ts              — bridgeHandlers[]
    adapters.ts             — adapterHandlers[]
    data-hub.ts             — dataHubHandlers[]
    system.ts               — systemHandlers[]
    sampling.ts             — samplingHandlers[]
    chat.ts                 — chatHandlers[] (mock /api/chat SSE for dev without API key)
  handlers.ts               — spread all new handlers into existing array
```

Each handler file:

- Exports a named `*Handlers` array (e.g. `export const bridgeHandlers = [...]`)
- Uses typed fixtures from `@/api/types.gen`
- Includes auth header validation where the real API requires it
- Reuses `unauthorizedError` from `fixtures/errors.ts`
- Mutations update in-memory state via `@msw/data` collections in `db.ts`

The `/api/chat` MSW handler returns a canned SSE stream so the chat UI can be tested without an Anthropic API key.

---

## Key Risks

| Risk                                      | Mitigation                                                     |
| ----------------------------------------- | -------------------------------------------------------------- |
| TanStack AI is alpha (v0.x)               | Pin versions; abstract behind ChatContext so we can swap       |
| System prompt token cost (~8K)            | Anthropic prompt caching                                       |
| 400px drawer too narrow for complex forms | Test with largest schemas; add "expand to dialog" button later |
| Tool call failures                        | Each tool wraps SDK calls in try/catch, returns structured err |
| Long conversations grow token count       | Cap agent loop at 10 iterations; message truncation if needed  |

---

## Verification Checklist

1. `pnpm dev` starts Vite + Hono in single process
2. Chat drawer opens/closes from toolbar button and Ctrl+K
3. Text conversation works with streaming
4. "List my bridges" → returns mock bridge data from MSW
5. "Create a new bridge" → shows inline form → submit → confirmation → executes
6. "Go to workspace" → navigates
7. All MSW handlers return realistic typed data
8. `pnpm build` passes
9. `pnpm lint:all` passes
