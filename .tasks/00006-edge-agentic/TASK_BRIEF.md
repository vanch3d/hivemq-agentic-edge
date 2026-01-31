# Task Brief: Edge Agentic — Conversational AI Agent

## Requirements

1. Integrate **TanStack AI** (`@tanstack/ai`, `@tanstack/ai-react`) as the AI tooling layer.
2. Use **Claude** (Anthropic) as the LLM provider. User has credentials; secrets handled via `.env`.
3. Implement a **side panel** (Drawer) with a conversation UX, activatable from anywhere in the authenticated app. The panel can navigate through pages and create dynamic content.
4. The conversation agent must understand the **full extent of the HiveMQ Edge API** (105 operations across 22 domains).
5. Two sets of operations:
   - **Questions** — executing GET requests, presenting results
   - **Actions** — executing other CRUD operations, using the API and RJSF to generate required configuration forms
6. A first working configuration must be implemented end-to-end.

## User Decisions

- **Server setup**: `@hono/vite-dev-server` — Hono integrated into Vite's dev server (single process).
- **Form placement**: Inline in chat panel (400px drawer).
- **Mutation confirmation**: All mutations require explicit user approval.
- **Model**: Configurable via `ANTHROPIC_MODEL` env var, defaults to Claude Sonnet 4.
