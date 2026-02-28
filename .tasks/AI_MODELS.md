# AI Models Reference

Quick reference for models used (or considered) by the Edge Agentic chat agent. Provider configured via `AI_PROVIDER` in `.env`.

---

## Our Constraints & Cost Profile

### Hard requirements

- **Tool calling**: The agent uses 11 tools (query/mutate adapters, bridges, data hub, system, sampling, navigation, graph). The model must support **native structured tool calls** — text-based tool simulation doesn't work reliably.
- **Streaming**: Responses are streamed via SSE. The provider must support streaming with tool-call events interleaved.
- **System prompt adherence**: The agent carries a detailed domain ontology (~3,500 tokens) + behavioral instructions. Models that drift from system prompts will produce poor results.

### Token budget per request

Every request sent to the LLM includes:

| Component | Tokens (approx) | Nature |
|-----------|-----------------|--------|
| System prompt + ontology | ~3,500 | **Static** — identical every request |
| Tool definitions (11 tools) | ~2,500 | **Static** — identical every request |
| Conversation history | Variable | **Dynamic** — grows with each turn |
| **Static overhead per request** | **~6,000** | |

A typical 5-turn conversation sends ~15,000 input tokens per request. Of that, **~40% is static/repeated content** (system prompt + tools), and this ratio improves with shorter conversations.

### What this means for model selection

1. **Prompt caching is high-value**: ~6,000 tokens of identical content every request. Anthropic prompt caching (reads at 0.1x) and Gemini context caching (75% off) would cut the static portion by 75–90%. This is our single biggest cost lever.

2. **The domain is bounded**: HiveMQ Edge has 105 API operations across a known ontology. The model doesn't need broad world knowledge — it needs to follow structured instructions and call the right tool with the right parameters. This favors smaller/cheaper models that are good at instruction-following over large general-purpose ones.

3. **Most queries are simple**: "List bridges", "Show adapter status", "Create a bridge" — these are single-tool-call interactions. Complex multi-step reasoning is rare. A cheaper model that handles 1–2 tool calls well may cover 90% of use cases.

4. **Conversation history is the cost wildcard**: Long debugging sessions can push input tokens to 30K+. Future optimizations (history summarization, selective context) would help, but model choice has the most immediate impact.

### Future optimization opportunities

- **Conditional ontology injection**: Only send DataHub ontology (~1,200 tokens) when the conversation involves policies/schemas. Currently all 3 modules are always injected (noted as Phase 1 strategy in `server/ontology/index.ts`).
- **Selective tool injection**: Only send relevant tools based on conversation topic (e.g., skip mutation tools for read-only queries).
- **History summarization**: Compress older turns to reduce the growing message history.

---

## TanStack AI — Available Adapters

We use `@tanstack/ai` as our provider-agnostic AI layer. These are the official adapters:

| Adapter | Package | Status in our app |
|---------|---------|-------------------|
| Anthropic | `@tanstack/ai-anthropic` | Installed, primary provider |
| Ollama | `@tanstack/ai-ollama` | Installed, experimental (has upstream bugs, see `00006-edge-agentic/OLLAMA_SUPPORT.md`) |
| OpenAI | `@tanstack/ai-openai` | Not installed — drop-in option |
| Google Gemini | `@tanstack/ai-gemini` | Not installed — drop-in option |
| OpenRouter | `@tanstack/ai-openrouter` | Not installed — gateway to 400+ models |
| Cloudflare Workers AI | Community adapter | Not installed |

Adding a new provider = `pnpm add @tanstack/ai-<provider>` + a new branch in `resolveAdapter()` in `server/api/chat.ts`.

---

## Anthropic Models

> Model IDs from [platform.claude.com/docs/en/about-claude/models/overview](https://platform.claude.com/docs/en/about-claude/models/overview). Prices as of Feb 2026.

### Current models

| Model | API ID | API Alias | Input $/MTok | Output $/MTok | Tool Use | Notes |
|-------|--------|-----------|-------------|--------------|----------|-------|
| Opus 4.6 | `claude-opus-4-6` | `claude-opus-4-6` | $5.00 | $25.00 | Excellent | Latest generation, top-tier reasoning |
| Sonnet 4.6 | `claude-sonnet-4-6` | `claude-sonnet-4-6` | $3.00 | $15.00 | Excellent | Latest balanced model, improved agentic search |
| Haiku 4.5 | `claude-haiku-4-5-20251001` | `claude-haiku-4-5` | $1.00 | $5.00 | Good | Fastest model, ~3x cheaper — good for simpler queries |

### Legacy models (still available)

| Model | API ID | API Alias | Input $/MTok | Output $/MTok | Tool Use | Notes |
|-------|--------|-----------|-------------|--------------|----------|-------|
| Opus 4.5 | `claude-opus-4-5-20251101` | `claude-opus-4-5` | $5.00 | $25.00 | Excellent | Previous gen top-tier |
| **Sonnet 4.5** | `claude-sonnet-4-5-20250929` | **`claude-sonnet-4-5`** | **$3.00** | **$15.00** | **Excellent** | **Current default** — best balance of cost and capability |
| Opus 4.1 | `claude-opus-4-1-20250805` | `claude-opus-4-1` | $15.00 | $75.00 | Excellent | Expensive, superseded by Opus 4.5+ |
| Sonnet 4 | `claude-sonnet-4-20250514` | `claude-sonnet-4-0` | $3.00 | $15.00 | Excellent | Same price tier as 4.5, slightly less capable |
| Opus 4 | `claude-opus-4-20250514` | `claude-opus-4-0` | $15.00 | $75.00 | Excellent | Expensive, superseded |
| Haiku 3 | `claude-3-haiku-20240307` | — | $0.25 | $1.25 | Fair | **Deprecated** — retiring April 19, 2026. Migrate to Haiku 4.5 |

> **Naming history**: Claude 3.5 Haiku was rebranded to **Haiku 4.5** (`claude-haiku-4-5`). Claude 3.7 Sonnet was rebranded to **Sonnet 4** (`claude-sonnet-4`). The old IDs (`claude-3-5-haiku`, `claude-3-7-sonnet`) do not work in the API.

### Cost-saving features

- **Prompt caching**: cache reads are 0.1x input price (system prompt + ontology are good candidates)
- **Batch API**: 50% discount for async processing (not applicable to real-time chat)

---

## Ollama (Local)

Free, runs locally. Configured via `AI_PROVIDER=ollama` + `OLLAMA_MODEL` + `OLLAMA_HOST`.

> Ollama support is experimental (Task 00006 Phase 8). See `00006-edge-agentic/OLLAMA_SUPPORT.md` for bug workarounds, GPU tuning, and KV cache optimization.

### Model recommendations for macOS M2 (32 GB unified memory)

The M2's unified memory is shared between CPU, GPU, and system — a 32 GB machine has ~24–26 GB usable for model inference after OS overhead. The key constraint is fitting **model weights + KV cache** in the Metal GPU allocation to get `100% GPU` in `ollama ps`.

| Model | Size (Q4) | VRAM ~4K ctx | Tool Calling | Speed (M2) | Verdict |
|-------|-----------|-------------|--------------|------------|---------|
| `qwen3:8b` | ~5 GB | ~6 GB | Good | ~25 tok/s | **Best pick for 16 GB** — Qwen3-8B matches Qwen2.5-14B on benchmarks, native tool support |
| `qwen3:4b` | ~2.5 GB | ~3.5 GB | Fair | ~40 tok/s | Best pick for 8 GB — fits comfortably, decent tool use |
| `llama3.1:8b` | ~4.7 GB | ~5.5 GB | Inconsistent | ~20 tok/s | Current default — sometimes calls tools, sometimes hallucinates results in text |
| `qwen2.5:7b` | ~4.4 GB | ~5.2 GB | Poor | ~22 tok/s | Tested — does not reliably emit native tool calls |
| `qwen3:1.7b` | ~1.1 GB | ~1.8 GB | Poor | ~60 tok/s | Ultra-light — fast but too small for reliable agentic use |
| `llama3.1:70b` | ~40 GB | ~45 GB | Expected good | N/A | Does not fit M2 — needs 64+ GB machine |

**Key takeaway**: Qwen3 models are the most parameter-efficient option in 2026. Qwen3-8B outperforms Qwen2.5-14B while being half the size, and has the best tool-calling support among small open models.

### Recommended Ollama setup for M2

```bash
# Enable Flash Attention + KV cache quantization (saves ~50% KV VRAM)
export OLLAMA_FLASH_ATTENTION=1
export OLLAMA_KV_CACHE_TYPE=q8_0

ollama pull qwen3:8b      # 16 GB machines
# or
ollama pull qwen3:4b      # 8 GB machines
```

```env
# .env
AI_PROVIDER=ollama
OLLAMA_MODEL=qwen3:8b
OLLAMA_HOST=http://localhost:11434
```

Verify GPU offload: `ollama ps` should show `100% GPU`. If you see a CPU/GPU split, reduce context (`num_ctx`) or drop to the 4B model.

---

## Google Gemini (Not yet integrated)

Package: `@tanstack/ai-gemini`. Requires `GOOGLE_API_KEY`.

| Model | Input $/MTok | Output $/MTok | Tool Use | Notes |
|-------|-------------|--------------|----------|-------|
| Gemini 2.5 Pro | $1.25 | $10.00 | Excellent | Strong reasoning + tool use, competitive with Sonnet 4.5 |
| Gemini 2.5 Flash | $0.30 | $2.50 | Good | Great value — 10x cheaper than Sonnet 4.5, solid tool support |
| Gemini 2.5 Flash-Lite | $0.10 | $0.40 | Fair | Ultra-cheap, good for simple queries |
| Gemini 2.0 Flash | $0.10 | $0.40 | Good | Previous gen, still very capable for the price |

**Why consider**: Gemini Flash is dramatically cheaper than Anthropic while maintaining decent tool-calling. The free tier (15 RPM) is useful for development. Context caching gives 75% savings on repeated prompts (our system prompt + ontology would benefit).

---

## OpenAI (Not yet integrated)

Package: `@tanstack/ai-openai`. Requires `OPENAI_API_KEY`.

| Model | Input $/MTok | Output $/MTok | Tool Use | Notes |
|-------|-------------|--------------|----------|-------|
| GPT-4o | $2.50 | $10.00 | Excellent | Mature tool-calling, widely tested |
| GPT-4o-mini | $0.15 | $0.60 | Good | Very cheap, good for simple agentic tasks |
| o4-mini | $1.10 | $4.40 | Excellent | Reasoning model, strong at multi-step tool use |

**Why consider**: GPT-4o-mini at $0.15/$0.60 is one of the cheapest options with reliable tool calling. Good fallback if Anthropic has outages.

---

## OpenRouter (Not yet integrated)

Package: `@tanstack/ai-openrouter`. Requires `OPENROUTER_API_KEY`.

Gateway to 400+ models from all providers through a single API. No markup on provider pricing. Interesting models accessible via OpenRouter:

| Model | Input $/MTok | Output $/MTok | Tool Use | Notes |
|-------|-------------|--------------|----------|-------|
| DeepSeek V3 | $0.27 | $1.10 | Good | ~90% of GPT-4o quality at a fraction of the cost |
| Mistral Large | $2.00 | $6.00 | Excellent | Strong tool calling, EU-hosted option |
| Llama 3.1 405B | $0.80 | $0.80 | Good | Open-weight, hosted — avoids local GPU constraints |

**Why consider**: Single integration gives access to every provider. Useful for A/B testing models without code changes. Free tier available (rate-limited).

---

## Recommendation

| Use Case | Model | Cost |
|----------|-------|------|
| Development / testing | `claude-haiku-4-5` or Gemini 2.5 Flash | $0.30–1.00 / MTok in |
| Demo / production | `claude-sonnet-4-5` (or `claude-sonnet-4-6`) | $3.00 / MTok in |
| Budget production | Gemini 2.5 Flash | $0.30 / MTok in |
| Offline / air-gapped | Ollama `qwen3:8b` | Free |
| Multi-provider resilience | OpenRouter | Varies |

**Cheapest path to reliable tool calling**: Gemini 2.5 Flash ($0.30/$2.50) or GPT-4o-mini ($0.15/$0.60) — both are 10–20x cheaper than Sonnet 4.5 with decent agentic capability.
