# Anatomy of a Chat Message

This document describes how messages flow through the agentic chat system — from user input to streamed LLM response, through tool execution, and into the rendered conversation UI.

## TanStack AI Framework

The chat system is built on [TanStack AI](https://tanstack.com/ai), a framework for building streaming AI applications. It provides:

- **Server**: `chat()` function that runs an agent loop, calling the LLM and executing tools iteratively
- **Transport**: AG-UI protocol over Server-Sent Events (SSE) for real-time streaming
- **Client**: `useChat()` React hook that manages conversation state, tool execution, and automatic continuation

The framework abstracts the multi-turn tool-use loop: the LLM generates text and tool calls, the client executes tools locally, feeds results back, and the LLM continues — all within a single user interaction.

## The UIMessage Object

Every message in the conversation is a `UIMessage`:

```typescript
interface UIMessage {
  id: string;
  role: "system" | "user" | "assistant";
  parts: MessagePart[];
  createdAt?: Date;
}
```

A message is **not** a single block of text. It's an ordered array of **parts**, each with a distinct type. A single assistant message can contain text, thinking blocks, tool calls, tool results, and more text — all interleaved.

### Message Parts

```typescript
type MessagePart = TextPart | ThinkingPart | ToolCallPart | ToolResultPart;
```

#### TextPart

```typescript
interface TextPart {
  type: "text";
  content: string;
}
```

Streamed token-by-token from the LLM. A single message can have multiple text parts (e.g., text before a tool call and text after the tool result).

#### ThinkingPart

```typescript
interface ThinkingPart {
  type: "thinking";
  content: string;
}
```

Extended reasoning content from models that support it (e.g., Claude with thinking enabled, Ollama with `think: true`). Rendered as a collapsible section in the UI.

#### ToolCallPart

```typescript
interface ToolCallPart {
  type: "tool-call";
  id: string;
  name: string;           // e.g., "mutateBridge", "queryGraph"
  arguments: string;      // JSON string of parsed arguments
  state: ToolCallState;
}

type ToolCallState =
  | "awaiting-input"      // Waiting for arguments to stream
  | "input-streaming"     // Arguments streaming from LLM
  | "input-complete"      // Arguments received, ready to execute
  | "approval-requested"  // Waiting for user approval
  | "approval-responded"; // User approved/rejected
```

Represents a tool invocation by the LLM. The `state` field tracks the tool's lifecycle in real time.

#### ToolResultPart

```typescript
interface ToolResultPart {
  type: "tool-result";
  toolCallId: string;     // Links back to the ToolCallPart
  content: string;        // JSON string of the result
  state: ToolResultState;
  error?: string;
}

type ToolResultState = "streaming" | "complete" | "error";
```

The output of a tool execution. The `content` is a JSON string following this convention:

```typescript
{
  data?: unknown;          // The actual result payload
  error?: string;          // Error message if the tool failed
  display?: "graph" | "table" | "json";  // Rendering hint
  snapshotId?: string;     // Link to a persisted snapshot
}
```

## Lifecycle of a Mutation Message

Here's a concrete example: the user says **"Create a bridge called test-bridge"**.

### Phase 1: LLM Response (streaming)

The server calls the LLM, which streams back:

```
Parts in the assistant message (as they arrive):
┌─────────────────────────────────────────────────────────┐
│ [text]       "I'll help you create a bridge. Let me..." │  ← prediction text
│ [tool-call]  mutateBridge({ operation: "create", ... }) │  ← tool invocation
└─────────────────────────────────────────────────────────┘
```

The text part streams **before** the tool call. This is the LLM's prediction — it describes what it's about to do before knowing the outcome. The SSE stream ends with `finishReason: "tool_calls"`.

### Phase 2: Client-Side Tool Execution

`useChat` detects `finishReason: "tool_calls"` and executes the client-side tool:

1. The `mutateBridge` tool runs
2. It calls `requestFormInput()` — the UI shows an inline form
3. The user fills in the form and submits
4. The tool calls the HiveMQ Edge API (`addBridge`)
5. On success, it calls `invalidateQueries()` to refresh cached data
6. The tool returns `{ data: { id: "test-bridge", ... }, error: null }`

The tool result is appended to the message:

```
┌─────────────────────────────────────────────────────────┐
│ [text]        "I'll help you create a bridge. Let me.." │
│ [tool-call]   mutateBridge (completed)                  │
│ [tool-result]  { data: { id: "test-bridge" }, ... }     │  ← tool output
└─────────────────────────────────────────────────────────┘
```

### Phase 3: Continuation Turn (automatic)

`useChat` automatically sends a follow-up request to the server, including the tool results. The LLM now generates a **continuation** — an accurate response based on the actual outcome:

```
┌─────────────────────────────────────────────────────────┐
│ [text]        "I'll help you create a bridge. Let me.." │  ← prediction
│ [tool-call]   mutateBridge (completed)                  │
│ [tool-result]  { data: { id: "test-bridge" }, ... }     │
│ [text]        "The bridge 'test-bridge' has been..."    │  ← continuation
└─────────────────────────────────────────────────────────┘
```

This is all **one UIMessage** with multiple parts. The continuation text is the LLM's accurate summary. The prediction text remains visible above it.

### Phase 4: Chained Tool Calls

If the user said **"Create a bridge and show it on the graph"**, the continuation turn may include another tool call:

```
┌─────────────────────────────────────────────────────────┐
│ [text]        "I'll create the bridge and show it..."   │  ← prediction
│ [tool-call]   mutateBridge (completed)                  │
│ [tool-result]  { data: { id: "test-bridge" }, ... }     │
│ [text]        "Bridge created! Now showing on graph..." │  ← continuation
│ [tool-call]   queryGraph({ scope: "bridgeTopology" })   │  ← chained call
│ [tool-result]  { display: "graph", nodeCount: 5, ... }  │
│ [text]        "Here's the bridge topology showing..."   │  ← final summary
└─────────────────────────────────────────────────────────┘
```

The agent loop continues until the LLM returns `finishReason: "stop"` (no more tool calls needed).

## The Streaming Protocol (AG-UI over SSE)

Each LLM turn streams as a sequence of typed events:

| Event | Purpose |
|-------|---------|
| `RUN_STARTED` | New agent loop iteration begins |
| `TEXT_MESSAGE_START` | Assistant text generation begins |
| `TEXT_MESSAGE_CONTENT` | Incremental text token (`delta`) |
| `TEXT_MESSAGE_END` | Text block complete |
| `TOOL_CALL_START` | Tool invocation begins (`toolName`, `toolCallId`) |
| `TOOL_CALL_ARGS` | Incremental JSON arguments |
| `TOOL_CALL_END` | Tool call arguments complete |
| `STEP_FINISHED` | Thinking/reasoning content (extended thinking models) |
| `RUN_FINISHED` | Turn ends. `finishReason` determines next action |
| `RUN_ERROR` | Error during generation |

### Finish Reasons

| Value | Meaning | Next Action |
|-------|---------|-------------|
| `stop` | LLM finished naturally | Conversation halts, wait for user |
| `tool_calls` | LLM wants to use tools | Execute tools, send results, continue |
| `length` | Max tokens reached | Conversation halts (truncated) |
| `content_filter` | Content policy violation | Error shown |

## UI Rendering Pipeline

The message parts are rendered top-to-bottom in a single bubble:

```
MessageBubble
├── TextPart          →  ChatMarkdown (rich markdown with GFM)
├── ThinkingPart      →  Collapsible section (chevron toggle)
├── ToolCallPart      →  Tool name + spinner (while running)
├── ToolResultPart    →  Display-type dispatch:
│   ├── display: "graph"  →  ChatGraph (embedded React Flow)
│   ├── display: "table"  →  ChatTable (sortable, searchable)
│   └── fallback          →  JSON viewer
│   └── snapshotId?       →  "Open full view →" link
└── TextPart          →  ChatMarkdown (continuation text)
```

### Interactive Tool UI

Some tools pause the stream to collect user input:

- **Form tools** (create/update operations): Split the chat panel — messages on the left, JSON Schema form on the right. The stream resumes when the user submits or cancels.
- **Approval tools** (delete/destructive operations): Show an approval card below the messages. The stream resumes when the user approves or rejects.

These are **blocking** — the tool's `execute()` function awaits a Promise that resolves when the user responds.

## The Prediction Problem

Because the LLM streams text alongside tool calls in a single response, the **prediction text** (written before the tool executes) and the **continuation text** (written after seeing the result) both appear in the same message.

Example of what the user sees:

> *"I'll create the bridge for you..."*        ← prediction (possibly inaccurate)
> `mutateBridge`
> Bridge created: test-bridge
> *"The bridge 'test-bridge' has been created successfully with..."*  ← accurate

The prediction text can't be removed server-side because it streams before the tool call. Options for managing this:

1. **System prompt guidance** — instruct the model to be terse before tool calls
2. **Client-side suppression** — hide text parts that precede a tool-call in the same message
3. **Accept it** — the prediction provides conversational flow and context

## Agent Loop Control

The server uses TanStack AI's `chat()` function which runs an iterative agent loop:

```
do {
  response = callLLM(messages)
  if (response.finishReason === "tool_calls") {
    results = executeTools(response.toolCalls)
    messages.push(assistantMessage, ...toolResults)
  }
} while (shouldContinue(state))
```

The loop is controlled by an `AgentLoopStrategy`:

```typescript
// Available strategies
maxIterations(n)        // Stop after n iterations
untilFinishReason([...]) // Stop on specific finish reasons
combineStrategies([...]) // Compose strategies
```

The current configuration uses the **default strategy** (no explicit limit), so the loop runs until the model naturally stops (`finishReason: "stop"`). For production, `maxIterations(5)` is recommended as a safety guardrail.

## Architecture Summary

```
User types message
       │
       ▼
  ┌─────────┐     POST /api/chat        ┌──────────┐
  │  useChat │ ──────────────────────── │  Server   │
  │  (React) │     SSE stream back      │  chat()   │
  │          │ ◄─────────────────────── │           │
  └─────────┘                           └──────────┘
       │                                      │
       │  finishReason: "tool_calls"          │  Calls LLM adapter
       │                                      │  (Anthropic / Ollama)
       ▼                                      │
  ┌──────────────┐                            │  Streams AG-UI events
  │ Client Tools │                            │
  │  execute()   │                            │
  │              │                            │
  │ • API calls  │                            │
  │ • Forms/UI   │                            │
  │ • Navigation │                            │
  │ • Invalidate │                            │
  └──────────────┘                            │
       │                                      │
       │  Tool results                        │
       ▼                                      │
  ┌─────────┐     POST /api/chat (again)      │
  │  useChat │ ──────────────────────────────►│
  │          │     (with tool results)        │
  │          │ ◄──────────────────────────────│
  └─────────┘     SSE continuation stream     │
       │                                      │
       ▼
  UIMessage with all parts rendered
```

All tools in this system are **client-side** — the server only knows the tool definitions (names, schemas), not the implementations. The client executes tools locally, with access to the React component tree (forms, approvals, navigation, query cache).
