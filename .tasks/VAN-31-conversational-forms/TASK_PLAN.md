# VAN-31: Conversational Data Gathering — Investigation Plan

> Reference: [TASK_BRIEF.md](TASK_BRIEF.md) for full requirements

## Investigation Phases

### Phase 1: Current State Analysis ✅

- [x] Map all schemas currently used in form-request flows (from `form-schemas.ts`)
- [x] Categorize field types across schemas (string, number, boolean, enum, object, array)
- [x] Identify the most complex schemas (deepest nesting, largest arrays, most conditionals)
- [x] Document the current `requestFormInput` → `FormSplitView` data flow in detail
- [x] Audit pain points: which schemas cause the worst UX friction today?

### Phase 2: UX Pattern Research ✅

- [x] Survey conversational form patterns (Typeform, Landbot, WET-BOEW, Tripetto)
- [x] Study agentic UI prior art (Vercel AI SDK, CopilotKit, A2UI, Thesys)
- [x] Analyze hybrid approaches: when conversational, when traditional form
- [x] Identify inline chat widget patterns (CometChat FormBubble, Google Chat Cards)
- [x] Research JSON Schema → conversational flow prior art (none mature — must build custom)

### Phase 3: Schema Decomposition Strategy ✅

- [x] Define algorithm for splitting a JSONSchema into ordered single-field steps
- [x] Handle `required` vs optional field ordering (required first, agent-guided optional)
- [x] Handle `dependencies` and `if/then/else` conditional fields (deferred until dependency met)
- [x] Handle nested `object` properties (flatten shallow ≤3 props, mini-form for deep)
- [x] Handle `array` fields (iterative "add another?" loop with escape hatch at 3+)
- [x] Handle `enum` fields (button group ≤5 options, dropdown >5)
- [x] Handle `oneOf`/`anyOf` discriminated unions (discriminator select → branch)
- [x] Evaluate which field types map cleanly to single inline widgets vs need a form fallback

### Phase 4: Architecture Proposal ✅

- [x] Design the conversational form state machine (IDLE → COLLECTING → VALIDATING → REVIEWING → CONFIRMED)
- [x] Define the data accumulation model (partial formData merged per step, same shape as RJSF output)
- [x] Design the inline widget component taxonomy (7 components: TextField, NumberField, SelectField, ToggleField, PasswordField, ReviewCard, ArrayPrompt)
- [x] Define how the agent orchestrates field ordering (Hybrid: engine baseline + LLM adaptation)
- [x] Design the fallback mechanism (escape to full RJSF form with accumulated data at any point)
- [x] Define how validation errors surface (inline per-field + full-schema at ReviewCard)
- [x] Design the "review and confirm" step (ReviewCard with per-field edit buttons)
- [x] Evaluate impact on the existing tool-context / chat-context pipeline (same Promise contract — tools unchanged)

### Phase 5: Edge Cases and Trade-offs ✅

- [x] Document edge cases: deeply nested objects, large arrays, unbounded objects, base64 payloads
- [x] Consider undo/back navigation (ReviewCard allows editing any field; agent can re-ask)
- [x] Consider prefilled data (edit mode defaults to form view; conversation for targeted edits)
- [x] Document trade-offs: development effort vs UX improvement via phased rollout

## Deliverables

- [x] Investigation report → [`INVESTIGATION.md`](INVESTIGATION.md)
- [x] Architecture proposal with layered approach, state machine, and component taxonomy → §4 of report
- [x] Edge case catalog → §5 of report
- [x] Phased rollout recommendation (4 phases: simple → medium → complex → polish) → §6 of report
