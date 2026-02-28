# Task Brief — Settings System

## Objective

Create a persistent settings/feature-flags system exposed via the `/workspace/configuration` UI. The first use case is AI provider and model configuration, replacing the current `.env`-only workflow.

## Requirements

1. **Proper data structure** — typed, sectioned (AI config first, expandable for future sections), easy to read and extend.
2. **Persistence** — settings survive page reloads (localStorage).
3. **Server defaults** — the UI shows what's currently configured server-side (from `.env`), and lets the user override per-browser.
4. **Runtime override** — changed settings take effect immediately on the next chat message, no server restart needed.
5. **First settings section: AI Configuration**
   - Provider selector: Anthropic or Ollama
   - Model selector: Anthropic shows a dropdown of known models; Ollama shows a text input (models are dynamic)
   - Ollama-specific: Host URL, Thinking Mode toggle (`OLLAMA_THINK`)
6. **API key stays server-side** — never exposed to the frontend.
7. **Reset to defaults** — button to clear all overrides and revert to server defaults.

## Context

- AI provider/model is currently configured via env vars: `AI_PROVIDER`, `ANTHROPIC_MODEL`, `OLLAMA_MODEL`, `OLLAMA_HOST`, `OLLAMA_THINK`.
- The configuration route (`/workspace/configuration`) already exists with an ontology viewer.
- The `OLLAMA_THINK` flag was just added to control qwen3's thinking mode.
