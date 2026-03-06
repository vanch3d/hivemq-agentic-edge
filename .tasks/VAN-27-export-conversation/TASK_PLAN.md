# VAN-27 — Task Plan

## Problem Statement

There's no way to save or share a chat conversation. Long sessions require excessive scrolling to take meaningful screenshots for documentation. We need an export facility that produces a Markdown document capturing the full conversation.

---

## Data Model

The conversation is `UIMessage[]` from `@tanstack/ai`. Each message has:

- `id: string`
- `role: "user" | "assistant" | "system"`
- `parts: MessagePart[]` — union of `TextPart`, `ToolCallPart`, `ToolResultPart`, `ThinkingPart`
- `createdAt?: Date`

### Part types and their export treatment

| Part type | Content | Export strategy |
|-----------|---------|----------------|
| `text` (user) | Plain text | Render as-is under a `**User:**` heading |
| `text` (assistant) | Already Markdown | Render as-is under a `**Assistant:**` heading |
| `tool-call` | `name`, `arguments` (JSON string) | Render as a compact line: tool name + summary of arguments |
| `tool-result` | `content` (JSON string with `{ data, error, display, snapshotId }`) | For errors: show error text. For data: show summary + snapshot link if available |
| `thinking` | Internal reasoning | Include in a `<details>` collapsible block (optional, can be toggled) |

### Snapshot references

Tool results may contain a `snapshotId` linking to the snapshot store. Since snapshots are session-local (sessionStorage), the export should note them as references rather than try to inline the full data. Format: `> Full result: [Snapshot #snapshotId](/workspace/snapshot/snapshotId)`

---

## Implementation Plan

### Part 1: Conversion function — `messagesToMarkdown()`

**New file**: `src/utils/export-conversation.ts`

A pure function that takes `UIMessage[]` and returns a Markdown string. No React dependencies — testable in isolation.

**Structure of the output:**

```markdown
# Conversation Export

- **Date**: 2026-03-06T15:20:00Z
- **Model**: claude-sonnet-4-5

---

## User

What bridges are configured?

---

## Assistant

Let me check the bridges for you.

> **Tool**: `queryBridges` — list
>
> 3 bridges found. [View snapshot](#snapshot-abc123)

| id | name | status |
|----|------|--------|
| ... | ... | ... |

Here are the 3 bridges currently configured...

---
```

**Rules:**
- Each message becomes a `## User` or `## Assistant` section separated by `---`
- `text` parts: rendered directly (already markdown for assistant, plain text for user)
- `tool-call` parts: rendered as a blockquote line with tool name
- `tool-result` parts:
  - If error: render as `> **Error**: message`
  - If tabular data (array of objects): render as a Markdown table
  - If graph display: render as `> Graph visualization (see snapshot)`
  - If simple data: render as fenced JSON block
  - If `snapshotId`: add snapshot reference link
- `thinking` parts: wrapped in `<details><summary>Thinking</summary>...</details>`
- System messages: skip

### Part 2: Download trigger

**New file**: `src/utils/download-file.ts`

A utility to trigger a browser file download from a string:

```ts
export function downloadAsFile(content: string, filename: string, mimeType = "text/markdown") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

The filename format: `conversation-YYYY-MM-DD-HHmm.md`

### Part 3: Export button in chat header

**File**: `src/components/chat/chat-panel.tsx`

Add an export icon button next to the existing "new conversation" button. Uses `LuDownload` from `lucide-react`.

- Disabled when `messages.length === 0`
- On click: calls `messagesToMarkdown(messages, { model })` then `downloadAsFile()`
- Tooltip: "Export conversation"

### Part 4: i18n keys

**File**: `src/i18n/en.json` (or equivalent)

Add:
- `chat.exportConversation`: "Export conversation"

---

## File Changes Summary

| File | Part | Change |
|------|------|--------|
| `src/utils/export-conversation.ts` | 1 | New — `messagesToMarkdown()` pure function |
| `src/utils/download-file.ts` | 2 | New — `downloadAsFile()` browser utility |
| `src/components/chat/chat-panel.tsx` | 3 | Add export button in chat header |
| i18n resource | 4 | Add `chat.exportConversation` key |

---

## Design Decisions

**Why Markdown and not HTML/PDF?** The user explicitly asked for Markdown. The agent responses are already in MD, so the conversion is mostly pass-through. Markdown is also easy to share, version, and convert later.

**Why not inline snapshot data?** Snapshots can be large (full query results). The export should be a readable conversation record, not a data dump. Snapshot links provide a reference for when the session is still active.

**Why include tool calls?** They show the agent's reasoning chain — "I called queryBridges, got 3 results, then explained them." This is valuable for documentation and debugging. But they should be compact (blockquote lines), not dominating the export.

**Thinking parts as collapsible?** The `<details>` HTML tag works in GitHub-flavored Markdown and most renderers. It keeps the export clean while preserving the reasoning chain for those who want it.

---

## Verification

1. `pnpm build` — no errors
2. Have a conversation with multiple tool calls, then click export
3. Open the `.md` file — readable conversation with proper structure
4. Tool results show as tables or references, not raw JSON blobs
5. Button is disabled when no messages exist
