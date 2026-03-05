# VAN-20 — Conversation Flow: Plan

## Approach

Two changes to the chat message rendering:

### 1. Render assistant text as markdown

Create `src/components/chat/chat-markdown.tsx` — lightweight wrapper around `react-markdown` + `remark-gfm` (both already dependencies). Reuses the existing `Prose` component (`src/components/ui/prose.tsx`) with compact CSS overrides for the 400px chat drawer:

- Remove `maxW: 65ch` constraint (drawer already constrains width)
- Tighter margins on headings, lists, pre, tables
- Cap heading font sizes to `sm` (a `### Key Observations` should look like a bold label, not a page heading)
- First/last paragraph margin removal (no extra whitespace at bubble edges)
- Code blocks get monospace rendering via Prose's existing styles — satisfies the "ascii-art" requirement

No mermaid, no anchor link handling (unlike the heavier `markdown-viewer.tsx`).

### 2. Make text after tool results collapsible

When a text part follows a tool-result in the same message, wrap it in a `CollapsibleTextPart`:

- Chevron toggle (same UX pattern as existing `ThinkingPart`)
- Labeled "Analysis" (new i18n key: `chat.analysis`)
- Starts **collapsed** so the rich tool UI is the primary content
- Expanding shows the full markdown-rendered commentary
- Subtle `borderTop` separator between tool result and analysis toggle

This avoids the duplication feeling without trying to parse/strip LLM output.

**Non-collapsible text** (no preceding tool result) renders as full markdown directly.

**User messages** stay as plain `<Text>` — avoids interpreting `*` or `#` in user input as markdown.

## Files

| File | Action | Description |
|------|--------|-------------|
| `src/components/chat/chat-markdown.tsx` | **Create** | `ChatMarkdown` + `CollapsibleTextPart` components |
| `src/components/chat/message-bubble.tsx` | **Modify** | Use `ChatMarkdown` for assistant text, `CollapsibleTextPart` after tool results |
| `src/locales/en-US.json` | **Modify** | Add `chat.analysis` translation key |

## Key references

- `src/components/chat/thinking-part.tsx` — pattern for collapsible toggle
- `src/components/ui/prose.tsx` — base Prose styled component
- `src/components/configuration/markdown-viewer.tsx` — heavier markdown renderer (not reused, but reference for pattern)

## Implementation steps

- [ ] Create `src/components/chat/chat-markdown.tsx` with `ChatMarkdown` and `CollapsibleTextPart`
- [ ] Modify `src/components/chat/message-bubble.tsx` to dispatch assistant text to the right component
- [ ] Add `chat.analysis` key to `src/locales/en-US.json`
- [ ] Build check (`pnpm build`)
- [ ] Manual verification (see below)

## Verification

1. `pnpm build` — no errors
2. Open chat, ask "What are my active bridges?"
3. Tool result table renders as before
4. Text after tool result is collapsed behind "Analysis" toggle
5. Expanding shows properly rendered markdown (bold, headers, lists, code blocks)
6. Ask a question with no tool call — text renders as markdown, not collapsible
7. Toggle dark mode — both states render correctly
