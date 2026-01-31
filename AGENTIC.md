# Edge Agentic — AI Chat Agent

Conversational AI agent for HiveMQ Edge. Provides natural-language interaction with the full HiveMQ Edge REST API through a side-panel chat interface.

## Architecture

```
Browser (SPA)                         Hono (inside Vite dev server)
┌───────────────────────┐             ┌──────────────────────┐
│ useChat() hook        │── SSE ────→ │ POST /api/chat       │
│   sendMessage()       │             │   chat({             │
│   messages ←──────────│←────────────│     adapter: claude   │
│                       │             │     systemPrompt     │
│ Client Tools:         │             │   })                 │
│   queryBridges()      │             └──────────┬───────────┘
│   mutateAdapter()     │                        │
│   navigateTo()        │                   Anthropic API
│         │             │                        ▼
│         ▼             │                   Claude (Sonnet 4)
│ Generated SDK (Axios) │
│ HiveMQ Edge API       │
└───────────────────────┘
```

**Server** (`server/`): A Hono app running inside Vite's dev server via `@hono/vite-dev-server`. Handles a single endpoint — `POST /api/chat` — that proxies messages to the Anthropic API and streams responses back as SSE. No HiveMQ Edge API calls happen server-side.

**Client tools** (`src/agent/tools/`): Execute HiveMQ Edge API calls in the browser using the generated SDK (`src/api/sdk.gen.ts`). The Axios interceptor attaches the JWT auth token automatically.

**Chat UI** (`src/components/chat/`): A 400px right-side drawer with streaming chat, inline tables (TanStack Table), RJSF forms for mutations, and (future) React Flow graphs.

## Setup

### Prerequisites

- Node.js 20+
- pnpm 10+
- An Anthropic API key

### 1. Get an Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign in or create an account
3. Navigate to **Settings → API Keys** ([direct link](https://console.anthropic.com/settings/keys))
4. Click **Create Key**, give it a name, and copy the key (`sk-ant-...`)

### 2. Configure environment

Copy the example env file and add your key:

```bash
cp .env.example .env
```

Edit `.env`:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
ANTHROPIC_MODEL=claude-sonnet-4-5-20250514
```

The `ANTHROPIC_MODEL` variable is optional. Defaults to `claude-sonnet-4-5-20250514`. Other options:

| Model            | ID                           | Notes                                      |
| ---------------- | ---------------------------- | ------------------------------------------ |
| Claude Sonnet 4  | `claude-sonnet-4-5-20250514` | Default, best balance of quality and speed |
| Claude Haiku 3.5 | `claude-haiku-3-5-20241022`  | Faster, cheaper, less capable              |
| Claude Opus 4    | `claude-opus-4-0-20250514`   | Most capable, slower and more expensive    |

### 3. Start development

```bash
pnpm dev
```

This starts a single Vite dev server process that serves both the React SPA and the Hono API. The chat endpoint is available at `POST http://localhost:5173/api/chat`.

## How it works

### Message flow

1. User types a message in the chat drawer
2. `useChat()` (TanStack AI React) sends it to `POST /api/chat` and opens an SSE stream
3. Hono handler forwards the message to Claude with the system prompt and tool definitions
4. Claude responds with text and/or tool calls
5. **Client tools** execute in the browser (query the HiveMQ Edge API via the generated SDK)
6. Tool results are sent back to Claude for summarization
7. The streamed response renders in the chat drawer

### Tool categories

| Category           | Examples                                       | Execution                           |
| ------------------ | ---------------------------------------------- | ----------------------------------- |
| **Query tools**    | List bridges, get adapter status, fetch events | Client-side, read-only              |
| **Mutation tools** | Create bridge, update adapter, delete policy   | Client-side, requires user approval |
| **Navigation**     | Go to workspace, open adapter details          | Client-side, uses TanStack Router   |

### Query result rendering

- **Text**: Single entities and scalar values render as markdown in chat bubbles
- **Table**: Collections render as interactive TanStack Table (search, sort, paginate)
- **Graph**: Relationship queries render as React Flow diagrams (future)

### Mutation flow

1. Claude identifies a mutation is needed
2. An RJSF form renders inline in the chat (required fields only by default)
3. User can expand to show all fields via "Show all fields" toggle
4. User submits the form
5. An approval card appears: "Create bridge mqtt-01?"
6. User approves → SDK call executes → result returned to Claude

## File structure

```
server/
  index.ts                     — Hono app entry (CORS + routing)
  api/chat.ts                  — POST /api/chat handler (Anthropic proxy)
  system-prompt.ts             — System prompt with domain ontology
  tsconfig.json                — Node-target TypeScript config

src/
  agent/
    tools/                     — Tool definitions + client implementations
    tool-context.ts            — Shared context (router ref, form coordination)
    form-schemas.ts            — Operation → JSON schema mapping
  context/
    chat-context.tsx           — Chat state, drawer state, form coordination
  components/
    chat/
      chat-drawer.tsx          — Main drawer shell (400px, right side)
      chat-toggle-button.tsx   — Toolbar icon button
      message-list.tsx         — Scrollable message container
      message-bubble.tsx       — User/assistant message styling + result rendering
      chat-input.tsx           — Textarea + send button
      chat-table.tsx           — TanStack Table for collection results
      chat-form.tsx            — Inline RJSF form for mutations
      approval-card.tsx        — Mutation confirmation UI
      tool-status.tsx          — Tool call/result indicators
```

## Configuration reference

| Variable            | Required | Default                      | Description            |
| ------------------- | -------- | ---------------------------- | ---------------------- |
| `ANTHROPIC_API_KEY` | Yes      | —                            | Your Anthropic API key |
| `ANTHROPIC_MODEL`   | No       | `claude-sonnet-4-5-20250514` | Claude model ID to use |

## Security notes

- The `ANTHROPIC_API_KEY` stays server-side and is never sent to the browser.
- Claude can only execute the tools registered in the app — no web search, no arbitrary code.
- All mutations require explicit user approval before executing.
- The `/api/chat` endpoint has no authentication in this POC. See the task plan for hardening notes.

## Packages

| Package                  | Version | Purpose                                      |
| ------------------------ | ------- | -------------------------------------------- |
| `@tanstack/ai`           | 0.3.0   | Core chat, tool definitions, SSE streaming   |
| `@tanstack/ai-react`     | 0.3.0   | `useChat()` hook, `fetchServerSentEvents`    |
| `@tanstack/ai-client`    | 0.3.0   | `clientTools()`, `createChatClientOptions()` |
| `@tanstack/ai-anthropic` | 0.3.0   | Claude adapter                               |
| `@tanstack/react-table`  | 8.21.3  | Headless table for query result rendering    |
| `hono`                   | 4.11.7  | HTTP framework for `/api/chat`               |
| `@hono/vite-dev-server`  | 0.24.1  | Embeds Hono into Vite's dev server           |
