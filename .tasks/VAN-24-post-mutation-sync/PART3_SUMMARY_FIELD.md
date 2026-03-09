# VAN-24 Part 3: Mutation Summary for LLM Continuation

## Problem

When the LLM executes a mutation tool (e.g. "create a bridge"), the tool result sent back to the LLM is raw JSON — `{ data: {...}, error: undefined }`. The LLM (especially smaller models like Haiku) doesn't reliably generate a clear success acknowledgment from this raw data. The user sees the form, submits it, and then the LLM continuation either:

- Describes the form fields back ("The bridge was configured with host X, port Y...")
- Says nothing useful about whether it actually succeeded

## Solution: `summary` field in tool results

Add a `summary` string field to all mutation tool output schemas. Each mutation operation populates it with a human-readable outcome like `Bridge "my-bridge" created successfully.` The schema `.describe()` instructs the LLM to use this field in its continuation text.

This is a **structured hint** — the LLM sees both the summary and raw data, but the schema tells it to acknowledge using the summary rather than parsing raw JSON.

## Files changed

### 1. Tool definitions — `src/agent/tool-definitions.ts`

Added `summary` to the `outputSchema` of all 4 mutation tools (`mutateBridge`, `mutateAdapter`, `mutateDataHub`, `mutateSystem`):

```ts
summary: z.string()
  .optional()
  .describe(
    "Human-readable outcome of the mutation (e.g. 'Bridge test-bridge created successfully'). Use this to acknowledge the result to the user.",
  );
```

### 2. Tool implementations

Each mutation operation now returns `summary` on success, `undefined` on error:

- **`src/agent/tools/mutate-bridge.ts`** (4 ops): create, update, delete, transitionStatus
- **`src/agent/tools/mutate-adapter.ts`** (4 ops): create, update, delete, transitionStatus
- **`src/agent/tools/mutate-data-hub.ts`** (10 ops): create/update/delete for behavior policies, data policies, schemas, scripts
- **`src/agent/tools/mutate-system.ts`** (7 ops): add/update/delete for topic filters and combiners, setIsa95

Example return value:

```ts
return {
  summary: error ? undefined : `Bridge "${id}" created successfully.`,
  data,
  error: extractApiError(error),
};
```

## What it does NOT change

- No UI changes — the summary is only in the tool result sent to the LLM
- No behavior change for the user — the LLM should now produce better continuation text
- The `suppressPredictionText` feature flag (dimming) remains as-is

## Status

Implemented. `pnpm build` passes.
