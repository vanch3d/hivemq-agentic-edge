# Ollama Support for Edge Agentic Chat

Add Ollama as an alternative AI provider alongside Anthropic, allowing
zero-cost local development and privacy-first deployments.

---

## Status

**Partially working.** Text streaming works. Tool calling depends on model
quality — smaller models (7B/8B) tend to hallucinate tool responses in text
rather than emitting native tool calls. Two upstream bugs in
`@tanstack/ai-ollama@0.3.0` required server-side workarounds.

---

## Architecture

```
Browser                                Hono (Vite dev server)
┌─────────────────────┐                ┌──────────────────────────────┐
│ useChat()           │── SSE ───────→ │ POST /api/chat               │
│   messages          │                │                              │
│   tools (client)    │                │  resolveAdapter()            │
│                     │                │    ├─ anthropic → as-is      │
│                     │                │    └─ ollama → patchOllama() │
│                     │                │                              │
│                     │←── AG-UI ─────│  chat({                      │
│                     │   events       │    adapter,                  │
│                     │                │    tools: allToolDefinitions,│
│                     │                │    systemPrompts,            │
│                     │                │  })                          │
└─────────────────────┘                └──────────────────────────────┘
                                              │
                                       ┌──────┴──────┐
                                       │  Ollama     │ (localhost:11434)
                                       │  or         │
                                       │  Anthropic  │ (api.anthropic.com)
                                       └─────────────┘
```

Key difference from Anthropic flow: the Ollama adapter is wrapped with
`patchOllamaAdapter()` which fixes two upstream bugs before the stream
reaches the TanStack AI engine.

---

## Environment Configuration

```env
# .env

# Provider: "anthropic" (default) or "ollama"
AI_PROVIDER=ollama

# Anthropic settings (required when AI_PROVIDER=anthropic)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-5

# Ollama settings (required when AI_PROVIDER=ollama)
OLLAMA_MODEL=llama3.1:8b
OLLAMA_HOST=http://localhost:11434
```

When `AI_PROVIDER` is unset or `anthropic`, behavior is unchanged. When
`ollama`, the server uses the patched Ollama adapter with no API key required.

---

## What Was Implemented

### 1. Package installation

```
pnpm add @tanstack/ai-ollama
```

### 2. Provider routing — `server/api/chat.ts`

`resolveAdapter()` function selects the adapter based on `AI_PROVIDER`:

```typescript
function resolveAdapter() {
  const provider = process.env["AI_PROVIDER"] ?? "anthropic";

  if (provider === "ollama") {
    const model = process.env["OLLAMA_MODEL"] ?? "llama3";
    const host = process.env["OLLAMA_HOST"] ?? "http://localhost:11434";
    return patchOllamaAdapter(createOllamaChat(model, host));
  }

  // Default: Anthropic (no patch needed)
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");
  return createAnthropicChat(resolveAnthropicModel(), apiKey);
}
```

### 3. Shared tool definitions — `src/agent/tool-definitions.ts`

**Deviation from original plan.** The original plan assumed tools would
"just work" because the system prompt describes them. In reality, the
TanStack AI engine needs tool schemas passed to `chat()` so it can:

- Send tool JSON schemas to the model (Ollama/Anthropic)
- Recognize `TOOL_CALL_*` events in the stream and drive the agent loop

Previously, tool definitions were inlined in each tool file alongside
their `.client()` executor. The `.client()` imports browser-only code
(`@/api/sdk.gen`, React Router, DOM APIs) that can't run server-side.

**Solution:** Extracted all 10 tool definitions (name, description,
inputSchema, outputSchema) into `src/agent/tool-definitions.ts` — a pure
metadata module with no browser dependencies. Each tool file now imports
its definition from here:

```typescript
// src/agent/tool-definitions.ts (shared, importable by server)
export const queryBridgesDef = toolDefinition({ name: "queryBridges", ... });
export const allToolDefinitions = [ queryBridgesDef, ... ];

// src/agent/tools/query-bridges.ts (client-only)
import { queryBridgesDef } from "@/agent/tool-definitions";
export const queryBridges = queryBridgesDef.client(async (input) => { ... });

// server/api/chat.ts (server-only)
import { allToolDefinitions } from "@/agent/tool-definitions";
chat({ adapter, tools: allToolDefinitions, ... });
```

### 4. Ollama AG-UI adapter patch — `server/ollama-agui-adapter.ts`

Wraps the Ollama adapter to fix two upstream bugs (see "Known Bugs" below).
The wrapper:

1. **Injects system prompts** — Prepends `{ role: "system" }` message
2. **Transforms event types** — Maps non-standard chunk types to AG-UI protocol
3. **Adds error handling** — Catches stream errors and emits `RUN_ERROR`
4. **Logs diagnostics** — `[ollama-patch]` console output for debugging

### 5. Chat UI enhancements

Two UX improvements added during Ollama testing (slow model responses
made these essential):

- **Model badge in header** — Shows the active model name (e.g.
  `llama3.1:8b`, `claude-sonnet-4-5`) next to "AI Assistant". Captured
  from the `model` field on SSE chunks via `onChunk` callback.
- **Loading indicator** — Spinner + "Thinking..." below the last user
  message while waiting for the assistant to start streaming.

---

## Files Changed

| File                                   | Change                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `server/api/chat.ts`                   | `resolveAdapter()` with Ollama/Anthropic routing; passes `tools: allToolDefinitions` to `chat()` |
| `server/ollama-agui-adapter.ts`        | **New.** `patchOllamaAdapter()` — stream transform + system prompt injection                     |
| `src/agent/tool-definitions.ts`        | **New.** Shared tool metadata (10 definitions)                                                   |
| `src/agent/tools/query-bridges.ts`     | Imports definition from shared module                                                            |
| `src/agent/tools/query-adapters.ts`    | Imports definition from shared module                                                            |
| `src/agent/tools/query-data-hub.ts`    | Imports definition from shared module                                                            |
| `src/agent/tools/query-system.ts`      | Imports definition from shared module                                                            |
| `src/agent/tools/query-sampling.ts`    | Imports definition from shared module                                                            |
| `src/agent/tools/navigate-to.ts`       | Imports definition from shared module                                                            |
| `src/agent/tools/mutate-bridge.ts`     | Imports definition from shared module                                                            |
| `src/agent/tools/mutate-adapter.ts`    | Imports definition from shared module                                                            |
| `src/agent/tools/mutate-data-hub.ts`   | Imports definition from shared module                                                            |
| `src/agent/tools/mutate-system.ts`     | Imports definition from shared module                                                            |
| `src/context/chat-context.tsx`         | Added `model` state, `onChunk` callback                                                          |
| `src/components/chat/chat-drawer.tsx`  | Model badge in header, passes `isLoading` to message list                                        |
| `src/components/chat/message-list.tsx` | Loading indicator (spinner + text)                                                               |
| `src/locales/en-US.json`               | Added `chat.loading` key                                                                         |
| `.env`                                 | Added `AI_PROVIDER`, `OLLAMA_MODEL`, `OLLAMA_HOST`                                               |
| `.env.example`                         | Documented all Ollama vars                                                                       |

---

## Known Bugs in `@tanstack/ai-ollama@0.3.0`

**Status:** Both worked around locally via `patchOllamaAdapter()`. No
upstream fix or issue filed as of 2026-02-01.

### Bug 1: AG-UI Protocol Mismatch

The Ollama adapter's `processOllamaStreamChunks()` emits non-standard
event types that don't match the AG-UI protocol:

| Ollama adapter emits | AG-UI protocol expects                                             |
| -------------------- | ------------------------------------------------------------------ |
| `"content"`          | `TEXT_MESSAGE_START` + `TEXT_MESSAGE_CONTENT` + `TEXT_MESSAGE_END` |
| `"done"`             | `RUN_FINISHED`                                                     |
| `"tool_call"`        | `TOOL_CALL_START` + `TOOL_CALL_ARGS` + `TOOL_CALL_END`             |
| `"thinking"`         | `STEP_STARTED` + `STEP_FINISHED`                                   |
| _(missing)_          | `RUN_STARTED` (must be the first event)                            |

The engine's `handleStreamChunk()` switches on AG-UI type names, so none
of the Ollama events match — nothing is processed or rendered.

**Root cause:** `node_modules/@tanstack/ai-ollama/dist/esm/adapters/text.js`,
lines 56–134 — `processOllamaStreamChunks()`.

### Bug 2: System Prompts Silently Dropped

`mapCommonOptionsToOllama()` (same file, lines 204–219) does not forward
`options.systemPrompts`. The Anthropic adapter does:
`system: options.systemPrompts?.join('\n')`. The Ollama adapter silently
ignores the field, so the model receives no system instructions.

**Root cause:** `node_modules/@tanstack/ai-ollama/dist/esm/adapters/text.js`,
lines 204–219.

### Workaround

`patchOllamaAdapter()` in `server/ollama-agui-adapter.ts`:

1. **System prompt injection** — Prepends `{ role: "system" }` to messages
2. **Event type mapping** — Transforms stream chunks to AG-UI protocol
3. **Error handling** — Catches stream errors, emits `RUN_ERROR`

### Upstream status

- No matching issue on [TanStack/ai GitHub](https://github.com/TanStack/ai/issues)
  as of 2026-02-01
- [Issue #257](https://github.com/TanStack/ai/issues/257) ("UIMessage
  contains no parts after upgrade to 0.3.0") may be related
- Both workarounds can be removed once the upstream adapter is fixed

---

## Tool Calling Limitations

Even with bugs fixed, smaller Ollama models have unreliable native tool
calling. Observed behavior:

| Model          | Tool Calling          | Notes                                           |
| -------------- | --------------------- | ----------------------------------------------- |
| `qwen2.5:7b`   | Does not call tools   | Describes tools in text, hallucmates results    |
| `llama3.1:8b`  | Sometimes calls tools | Inconsistent — sometimes text, sometimes native |
| `qwen2.5:14b`  | Untested              | Expected to be better                           |
| `llama3.1:70b` | Untested              | Expected to be reliable                         |

For production-quality agentic behavior with tool calling, Anthropic
Claude remains the recommended provider. Ollama is best suited for:

- Testing the UI flow without API costs
- Basic conversation (no tools)
- Development when no internet / API key is available

### Checking GPU vs CPU

```bash
ollama ps
# Shows PROCESSOR column: "100% GPU", "100% CPU", or split
```

CPU-only inference with our large system prompt (~170 lines) will be
noticeably slow (10–30+ seconds for first token).

---

## GPU Performance & VRAM Optimization

Ollama automatically offloads model layers to GPU when VRAM is available.
When a model doesn't fit entirely in VRAM, Ollama splits layers between
GPU (fast) and system RAM (slow). The split is visible in `ollama ps`:

```
NAME              ID            SIZE     PROCESSOR      UNTIL
llama3.1:8b       46e0c10c039e  11 GB    79%/21% CPU/GPU  5 minutes from now
```

A CPU/GPU split like `79%/21%` means most layers run on CPU, which is
**5–30x slower** than full GPU. The bottleneck is PCIe bandwidth — each
token's activations must cross the bus twice. The goal is `100% GPU`.

### Why the model exceeds VRAM

VRAM is consumed by three things:

1. **Model weights** — The core parameters. An 8B Q4_K_M model is ~4.7GB.
2. **KV cache** — Grows linearly with context length (`num_ctx`). An 8B
   model at 32K context needs ~4.5GB of KV cache alone (FP16).
3. **Overhead** — Intermediate computation buffers (~10–20% of model size).

Our system prompt (~170 lines) + 10 tool definitions + conversation
history can easily push context usage to several thousand tokens per
request. If Ollama is configured with a large default context window,
the KV cache allocation alone can overflow VRAM.

### Step 1: Check your GPU

**NVIDIA:**

```bash
nvidia-smi
# Look at "MiB Used / MiB Total" per GPU
```

**Other GPU info:**

```bash
ollama ps          # Shows current model VRAM and processor split
ollama list        # Shows model sizes on disk
```

### Step 2: Enable Flash Attention (free performance boost)

Flash Attention reduces VRAM usage and increases inference speed with
**zero quality degradation**. It is a prerequisite for KV cache
quantization (Step 4).

**Windows** — Set system environment variable or run before starting
Ollama:

```powershell
$env:OLLAMA_FLASH_ATTENTION = "1"
ollama serve
```

To make it permanent, add `OLLAMA_FLASH_ATTENTION=1` to your system
environment variables (System → Advanced → Environment Variables).

**Linux / macOS:**

```bash
OLLAMA_FLASH_ATTENTION=1 ollama serve
```

Or add to `~/.bashrc` / `~/.zshrc`:

```bash
export OLLAMA_FLASH_ATTENTION=1
```

> **Reference:** [Ollama FAQ — Flash Attention](https://docs.ollama.com/faq)

### Step 3: Reduce context window (`num_ctx`)

Ollama defaults to a **4096-token** context window. Our system prompt
and tool definitions consume ~2000 tokens, leaving ~2000 for
conversation. This is adequate for most interactions and is the
recommended starting point.

If you previously increased `num_ctx` or are using a Modelfile with a
larger context, reducing it is the single biggest VRAM saving:

| Context length | KV cache (8B, FP16) | KV cache (8B, Q8_0) |
| -------------- | ------------------- | ------------------- |
| 2048           | ~0.3 GB             | ~0.15 GB            |
| 4096 (default) | ~0.6 GB             | ~0.3 GB             |
| 8192           | ~1.1 GB             | ~0.6 GB             |
| 32768          | ~4.5 GB             | ~2.3 GB             |

**Option A: Create a custom Modelfile** (recommended for this project)

Create a file called `Modelfile` anywhere:

```dockerfile
FROM llama3.1:8b
PARAMETER num_ctx 4096
```

```bash
ollama create edge-llama -f Modelfile
```

Then set in `.env`:

```env
OLLAMA_MODEL=edge-llama
```

**Option B: Set context globally via environment variable**

```bash
# Default context for all models
OLLAMA_CONTEXT_LENGTH=4096 ollama serve
```

**Option C: Set at runtime (interactive only)**

```bash
ollama run llama3.1:8b
/set parameter num_ctx 4096
```

> **Reference:** [Ollama FAQ — Context window size](https://docs.ollama.com/faq)

### Step 4: Enable KV cache quantization (requires Flash Attention)

KV cache quantization reduces the precision of the attention cache,
dramatically cutting its VRAM footprint:

| KV cache type | Memory savings | Quality impact                    |
| ------------- | -------------- | --------------------------------- |
| `f16`         | Baseline       | None (default)                    |
| `q8_0`        | ~50%           | Minimal — **recommended**         |
| `q4_0`        | ~75%           | Noticeable degradation at 8K+ ctx |

**Set the environment variable before starting Ollama:**

```powershell
# Windows PowerShell
$env:OLLAMA_FLASH_ATTENTION = "1"
$env:OLLAMA_KV_CACHE_TYPE = "q8_0"
ollama serve
```

```bash
# Linux / macOS
OLLAMA_FLASH_ATTENTION=1 OLLAMA_KV_CACHE_TYPE=q8_0 ollama serve
```

`q8_0` is the sweet spot — halves KV cache memory with negligible
quality loss for chat. Avoid `q4_0` unless you're severely
VRAM-constrained.

> **Reference:** [Ollama FAQ — KV cache quantization](https://docs.ollama.com/faq),
> [Optimizing Ollama VRAM with KV Cache](https://blog.peddals.com/en/ollama-vram-fine-tune-with-kv-cache/)

### Step 5: Choose the right model size and quantization

If the model still doesn't fit after Steps 2–4, use a smaller model or
a more aggressive quantization:

| Model              | Disk   | VRAM (approx)    | Tool calling  |
| ------------------ | ------ | ---------------- | ------------- |
| `llama3.1:8b`      | 4.7 GB | ~5.5 GB (Q4_K_M) | Inconsistent  |
| `qwen2.5:7b`       | 4.4 GB | ~5.2 GB (Q4_K_M) | Poor          |
| `llama3.1:8b-q4_0` | 4.3 GB | ~5.0 GB (Q4_0)   | Inconsistent  |
| `phi3:3.8b`        | 2.2 GB | ~2.8 GB          | Untested      |
| `qwen2.5:3b`       | 1.9 GB | ~2.5 GB          | Untested      |
| `llama3.1:70b`     | 40 GB  | ~45 GB           | Expected good |

To pull a specific quantization:

```bash
ollama pull llama3.1:8b-instruct-q4_0
```

> **Reference:** [Ollama model library](https://ollama.com/library)

### Step 6: Free VRAM from other processes

Common VRAM consumers besides Ollama:

- **Other Ollama models** — Ollama keeps models loaded for 5 minutes by
  default. Unload explicitly:
  ```bash
  ollama stop llama3.1:8b
  ```
- **Browser** (especially with hardware acceleration)
- **IDE** (WebStorm, VS Code with GPU rendering)
- **Display compositor** (Windows DWM, Wayland)
- **Other AI tools** (Copilot, etc.)

Check what's using your GPU:

```bash
nvidia-smi    # Shows all GPU processes
```

### Step 7: Verify the result

After applying changes, restart Ollama and reload the model:

```bash
ollama stop llama3.1:8b     # Unload current model
ollama run llama3.1:8b ""   # Preload with new settings (empty prompt)
ollama ps                   # Verify: should show "100% GPU"
```

If `ollama ps` shows `100% GPU`, you're done. First-token latency
should drop from 10–30+ seconds (CPU) to 1–3 seconds (GPU).

### Quick reference: all Ollama environment variables

| Variable                   | Purpose                                          | Recommended              |
| -------------------------- | ------------------------------------------------ | ------------------------ |
| `OLLAMA_FLASH_ATTENTION`   | Enable Flash Attention                           | `1`                      |
| `OLLAMA_KV_CACHE_TYPE`     | KV cache quantization (`f16`, `q8_0`, `q4_0`)    | `q8_0`                   |
| `OLLAMA_CONTEXT_LENGTH`    | Default context window for all models            | `4096`                   |
| `OLLAMA_GPU_OVERHEAD`      | Reserved VRAM per GPU (bytes)                    | Default is fine          |
| `OLLAMA_MAX_LOADED_MODELS` | Max concurrent models in memory                  | `1` (saves VRAM)         |
| `OLLAMA_NUM_PARALLEL`      | Max parallel requests per model                  | `1` (saves VRAM)         |
| `OLLAMA_KEEP_ALIVE`        | How long to keep model loaded after last request | `5m` (default)           |
| `OLLAMA_HOST`              | Bind address                                     | `http://localhost:11434` |

> **References:**
>
> - [Ollama FAQ](https://docs.ollama.com/faq)
> - [Ollama GPU docs](https://docs.ollama.com/gpu)
> - [Ollama Performance Tuning](https://collabnix.com/ollama-performance-tuning-gpu-optimization-techniques-for-production/)
> - [Context Kills VRAM](https://medium.com/@lyx_62906/context-kills-vram-how-to-run-llms-on-consumer-gpus-a785e8035632)
> - [Understanding VRAM Usage in Ollama](https://geekbacon.com/2025/05/03/understanding-vram-usage-in-ollama-with-large-models/)

---

## Deviations from Original Plan

| Original plan said                          | What actually happened                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| "The change is small — 3 files"             | 18 files changed due to bug workarounds and tool definition refactor                       |
| Tools work automatically from system prompt | Tools must be passed to `chat()` as structured definitions; model needs native tool format |
| No adapter patches needed                   | Two bugs required `patchOllamaAdapter()` (stream transform + system prompt injection)      |
| Tool definitions stay in individual files   | Extracted to shared `tool-definitions.ts` so server can import without browser deps        |
| No UI changes                               | Added model badge + loading indicator (needed for slow Ollama responses)                   |

---

## References

- [TanStack AI Ollama Adapter Docs](https://tanstack.com/ai/latest/docs/adapters/ollama)
- [TanStack AI GitHub](https://github.com/TanStack/ai)
- [TanStack AI Issue #257](https://github.com/TanStack/ai/issues/257)
- [Ollama](https://ollama.com)
