# VAN-31: Conversational Data Gathering — Brief

**Type**: Investigation
**Linear**: [VAN-31](https://linear.app/vanch3d/issue/VAN-31/conversational-data-gathering-progressive-field-by-field-form-flow)

## Context

The application uses a conversation-based agent UX. When the agent needs structured data from the user (e.g., to create a bridge or adapter), it triggers an RJSF form rendered in a vertical split below the chat panel. Forms are generated from JSONSchema definitions and support a "required-only" progressive disclosure mode.

### Current Flow

1. User requests an action (e.g., "create a new MQTT bridge")
2. Agent tool call triggers `requestFormInput()` with the relevant schema
3. Chat panel switches to `FormSplitView` — conversation on top, form on bottom
4. User fills in the form (optionally expanding to "show all fields")
5. User submits → data flows back to the tool → API call executes
6. Agent confirms result in conversation

### Key Files

| File                                       | Role                                        |
| ------------------------------------------ | ------------------------------------------- |
| `src/components/chat/chat-panel.tsx`       | Split view orchestration                    |
| `src/components/chat/chat-form-fields.tsx` | RJSF rendering with required-only filtering |
| `src/components/chat/chat-form-footer.tsx` | Submit/Cancel/Show-all controls             |
| `src/components/schema-form.tsx`           | Core RJSF wrapper                           |
| `src/agent/form-schemas.ts`                | Schema registry (tool → schema mapping)     |
| `src/agent/tool-context.ts`                | `requestFormInput()` mechanism              |
| `src/utils/resolve-schema-refs.ts`         | OpenAPI $ref → RJSF definitions             |

## Problem Statement

1. **Flow disruption**: The split-screen form breaks the conversational rhythm. The user shifts from chatting to filling a form, then back to chatting.
2. **Complexity cliff**: Complex schemas (especially with nested objects and arrays) overwhelm the form view, even with required-only mode.
3. **No gradual array building**: Array-of-objects fields require the user to build the entire array in one form session, preventing an iterative "add one item, review, add another" flow.
4. **Binary UX**: The current design offers only two modes — unstructured conversation OR structured form. There is no middle ground.

## Objective

Investigate how to create a **conversational data gathering flow** that:

- Is more structured than free-text conversation (validated, typed inputs)
- Is more conversational than a traditional form (one field at a time, agent-guided)
- Leverages the existing JSONSchema definitions (no duplicate schema authoring)
- Renders inline within the chat as message bubbles with embedded input widgets
- Supports progressive accumulation of form data across multiple conversational turns

## Proposed Direction

Since all forms are already driven by JSONSchema and we manage required-only reduction, explore going further:

1. **Schema decomposition**: Split a JSONSchema into individual property steps, each focusing on one field
2. **Inline field widgets**: Render each step as a chat bubble with a single input widget (text, select, toggle, number) and confirm/skip actions
3. **Agent-controlled progression**: The LLM decides field ordering and can skip/defer optional fields based on context
4. **Partial data accumulation**: Build up the form data object incrementally, with per-field validation
5. **Array iteration**: For array fields, use an "add another?" conversational loop
6. **Hybrid fallback**: Allow switching to traditional form view for power users or complex edge cases

## Research Areas

- Conversational form UX patterns (Typeform, chatbot form builders, guided wizards)
- JSONSchema property decomposition strategies (ordering, dependencies, conditionals)
- Inline widget rendering within chat message bubbles
- Per-field vs end-of-form validation strategies
- How this interacts with the existing tool-call → form-request → approval pipeline
- Prior art in agentic UIs (Vercel AI SDK UI patterns, LangChain chat widgets)
- Accessibility considerations for inline form widgets in chat

## Non-Goals

- Writing implementation code (this is investigation only)
- Changing the underlying JSONSchema definitions or API contracts
- Replacing the existing form system (it should remain available as a fallback)
