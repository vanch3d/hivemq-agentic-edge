# VAN-26 — Task Plan

## Problem Statement

When the agent tries to create an adapter (e.g. "create an OPCUA adapter"), three things go wrong:

### Issue 1: Wrong form schema for adapter create/update

The `mutateAdapter.create` form uses the **static** `AdapterSchema` from the OpenAPI spec (`src/api/schemas.gen.ts`). This schema only defines:
- `id` (string)
- `type` (string)
- `config` (opaque `JsonNode` — renders as a generic JSON editor)
- `status` (ref)

But each adapter **type** has its own `configSchema` and `uiSchema` that define the real fields (e.g. for OPC-UA: `uri`, `publishInterval`, `securityPolicy`; for Modbus: `host`, `port`, `pollingIntervalMillis`). These live in the adapter type definition returned by `GET /api/v1/management/protocol-adapters/types`.

**Result**: The form shows "config" as a raw JSON object field (or worse, RJSF resolves `$ref: JsonNode` to something unrelated like a behavior policy schema). Screenshot shows "The arguments of the fsm derived from the behavior policy" — that's RJSF resolving a `$ref` chain incorrectly.

**Root cause**: `form-schemas.ts` uses a static registry. Adapter forms need **dynamic** schema resolution — fetch the adapter type first, then use its `configSchema` as the form schema.

### Issue 2: Mock data missing `configSchema` and `uiSchema`

The mock fixture `adapterTypesList` in `src/mocks/fixtures/adapters.ts` only has `id`, `protocol`, `name`, `description`, `version`, `installed`, `capabilities`. No `configSchema`, no `uiSchema`, no `category`, no `tags`.

The real API returns rich type definitions with full JSON Schemas (see `dist/types.json`).

### Issue 3: Error display shows `[object Object]`

When the agent queries a non-existent adapter type (e.g. `opc-ua` instead of `opcua`), the API returns a 404. The error object doesn't match any of the extraction patterns in `extractApiError()`, so it falls through to `String(error)` which produces `[object Object]`.

### Issue 4 (minor): Agent uses wrong adapter type ID

The LLM guesses `opc-ua` as the adapter type ID when the user says "OPCUA". The actual ID from the types list is `opcua`. This is an LLM inference issue — it recovers by listing types and finding the correct ID. Not a code bug, but better mock data (with more realistic IDs matching the real system) would help.

---

## Root Cause Analysis

The fundamental gap is that **adapter types are dynamic entities with their own schemas**, but the current code treats adapter creation as a static-schema operation. The form schema registry (`form-schemas.ts`) has no concept of fetching a schema at runtime.

### Current flow (broken):
```
User: "create OPCUA adapter"
→ LLM calls mutateAdapter({ operation: "create", adapterType: "opcua" })
→ getFormSchema("mutateAdapter", "create") → returns static AdapterSchema
→ Form renders: id, type, config (opaque JSON)
→ User sees wrong/useless form
```

### Desired flow:
```
User: "create OPCUA adapter"
→ LLM calls mutateAdapter({ operation: "create", adapterType: "opcua" })
→ Look up adapter type from cache (fetched once at app startup)
→ Extract configSchema + uiSchema from the type
→ Form renders: id + all type-specific fields (uri, polling interval, security, etc.)
→ User fills in real configuration
→ Submit structures payload as { id, type, config: { ...typeFields } }
```

---

## Resolved Questions

### Q1: Payload structure
The API `POST /api/v1/management/protocol-adapters/adapters/{adapterType}` expects:
```json
{
  "id": "my-opcua-01",
  "type": "opcua",
  "config": {
    "uri": "opc.tcp://192.168.1.50:4840",
    "publishInterval": 1000,
    "securityPolicy": "None"
  }
}
```
The `config` field is a **nested object** whose shape matches the adapter type's `configSchema`. The `configSchema` itself includes `id` at the top level (e.g. mtconnect in `dist/types.json` has `id` in `configSchema.properties`). So the form should use `configSchema` as-is — RJSF collects all fields including `id`, then on submit we split: `id` goes to the top level, everything else goes into `config`.

### Q2: uiSchema passthrough
**`SchemaForm` already supports `uiSchema`** as a prop. But the chain is broken:
- `FormRequest` type (tool-context.ts) — does NOT include `uiSchema`
- `ActiveForm` type (chat-context.tsx) — extends `FormRequest`, so also missing
- `ChatFormFields` component — does NOT accept or pass `uiSchema`
- `FormSplitView` — does NOT pass it through

**Fix needed**: Add `uiSchema` to `FormRequest`, thread it through `ChatFormFields` → `SchemaForm`.

### Q3: Adapter type caching
Adapter types are deployment-time entities — they don't change within a session. **Cache them once at app startup.** This:
- Avoids redundant API calls on every create/update
- Makes the available types known to the agent via the system prompt (the agent can reference type IDs directly)
- Serves as the single source of truth for adapter type schemas

---

## Implementation Plan

### Part 1: Fix error display — `[object Object]`

**File**: `src/agent/tools/api-error.ts`

The `String(error)` fallback on line 43 produces `[object Object]` for complex error objects. Add a `JSON.stringify` fallback before `String()`:

```ts
// Replace final return String(error) with:
try {
  return JSON.stringify(error);
} catch {
  return String(error);
}
```

### Part 2: Enrich mock adapter types with `configSchema` and `uiSchema`

**File**: `src/mocks/fixtures/adapters.ts`

Update `adapterTypesList` to include realistic `configSchema` and `uiSchema` for each adapter type. Use the real API payload from `dist/types.json` as reference. Changes:
- Rename `opc-ua` → `opcua` to match real system IDs
- Add `configSchema` with proper JSON Schema (properties, required, types)
- Add `uiSchema` with `ui:tabs` and `ui:order`
- Add `category`, `tags`, `author` to match real shape
- Update adapter instance fixtures (`adaptersList`) to match renamed type IDs (`type: "opc-ua"` → `type: "opcua"`)

### Part 3: Adapter type cache via TanStack Query

Use TanStack Query with `staleTime: Infinity` instead of a separate store. This reuses the existing query infrastructure and avoids an extra state management layer.

**File**: `src/agent/tool-context.ts`
- Add a `setQueryClient(qc)` registrar (or reuse the existing invalidator pattern to expose the full `queryClient`)
- Add a helper: `getAdapterType(typeId: string)` that calls `queryClient.ensureQueryData()` with the adapter types query key and `staleTime: Infinity`. Returns the cached type definition or fetches if not yet loaded.

**File**: `src/context/chat-context.tsx` (or root layout)
- On mount, call `queryClient.prefetchQuery({ queryKey: ["adapterTypes"], queryFn: () => getAdapterTypes(), staleTime: Infinity })` to eagerly populate the cache at app startup.
- Register the queryClient with `setQueryClient()` so tools can access it.

**How it works**:
- `staleTime: Infinity` means TanStack Query never considers the data stale → no background refetches
- `ensureQueryData()` returns cached data instantly if available, or fetches once if the cache is cold
- Mutation tools (which run outside React) access the cache via the registered `queryClient`
- The data persists for the entire session, matching the deployment-time nature of adapter types

This cache is used by `mutateAdapter` for schema resolution and could later be injected into the system prompt so the LLM knows available types.

### Part 4: Thread `uiSchema` through the form pipeline

These changes thread `uiSchema` from the tool all the way to RJSF:

**File**: `src/agent/tool-context.ts`
- Add `uiSchema?: UiSchema` to `FormRequest` type

**File**: `src/context/chat-context.tsx`
- `ActiveForm` extends `FormRequest`, so it picks up `uiSchema` automatically

**File**: `src/components/chat/chat-panel.tsx`
- Pass `activeForm.uiSchema` to `ChatFormFields`

**File**: `src/components/chat/chat-form-fields.tsx`
- Accept `uiSchema` prop, pass to `SchemaForm`

**File**: `src/components/schema-form.tsx`
- Already supports `uiSchema` — no changes needed

### Part 5: Dynamic schema resolution for adapter create/update

**File**: `src/agent/tools/mutate-adapter.ts`

For the `create` operation:
1. Look up the adapter type from the cache by `input.adapterType`
2. If not found, return error `"Unknown adapter type: ${input.adapterType}"`
3. Extract `configSchema` and `uiSchema` from the type definition
4. Call `requestFormInput({ schema: configSchema, uiSchema, title, formData })`
5. On submit, split the form data: `id` → top level, rest → `config`
6. Call `addAdapter({ path: { adapterType }, body: { id, type, config } })`

For `update`: similar, but pre-fill with existing adapter's config.

**File**: `src/agent/form-schemas.ts`
- Remove static `mutateAdapter.create` and `mutateAdapter.update` entries (no longer needed — schema comes from adapter type cache)
- Keep `mutateAdapter.transitionStatus` (static, not type-dependent)

### Part 6: Update domain ontology documentation

**File**: `.tasks/DOMAIN_ONTOLOGY.md`

Document that:
- Adapter types are dynamic entities that own their `configSchema` and `uiSchema`
- Adapter creation requires type-specific schema resolution
- The config payload is nested: `{ id, type, config: { ...typeSpecificFields } }`

---

## File Changes Summary

| File | Part | Change |
|------|------|--------|
| `src/agent/tools/api-error.ts` | 1 | JSON.stringify fallback for unknown error shapes |
| `src/mocks/fixtures/adapters.ts` | 2 | Add configSchema, uiSchema to mock types; fix type IDs |
| `src/agent/tool-context.ts` | 3+4 | Expose queryClient for adapter type cache; add `uiSchema` to `FormRequest` |
| `src/context/chat-context.tsx` | 3 | Prefetch adapter types at startup; register queryClient |
| `src/components/chat/chat-panel.tsx` | 4 | Pass `uiSchema` to `ChatFormFields` |
| `src/components/chat/chat-form-fields.tsx` | 4 | Accept + forward `uiSchema` to `SchemaForm` |
| `src/agent/tools/mutate-adapter.ts` | 5 | Dynamic schema from type cache; split id/config on submit |
| `src/agent/form-schemas.ts` | 5 | Remove static adapter create/update entries |
| `.tasks/DOMAIN_ONTOLOGY.md` | 6 | Document adapter type schema ownership |

---

## Issues Discovered During Implementation

### Issue A: SDK import in tool-context.ts breaks all tools

**Symptom**: After adding `import { getAdapterTypes } from "@/api/sdk.gen"` to `tool-context.ts`, bridge creation (and all other mutations) started returning "Cancelled" — the form never appeared.

**Root cause**: `tool-context.ts` is a shared module imported by every tool. Importing `sdk.gen` there pulled the entire Axios client initialization into the module's dependency chain. This interfered with module loading order, preventing `setFormRequester` from being registered.

**Fix**: Removed all SDK imports from `tool-context.ts`. Instead, the fetcher function is injected from `chat-context.tsx` via a `setAdapterTypesFetcher()` registrar — the same pattern used for all other context functions (navigate, form, approval, etc.).

**Lesson**: `tool-context.ts` must remain free of SDK/API imports. It's a pure coordination module with module-level refs populated at runtime by React components.

### Issue B: LLM guesses wrong adapter type ID

**Symptom**: When asked "create an OPCUA adapter", the LLM guessed `opc-ua` as the type ID. The real ID is `opcua`.

**Behavior**: The tool returned an error ("Unknown adapter type"), the LLM recovered by querying `listTypes`, found the correct ID, and retried successfully. This self-correction is good behavior.

**Future improvement**: Inject available adapter type IDs into the system prompt from the cached types, so the LLM doesn't have to guess.

### Issue C: `id` field disabled in create mode

**Symptom**: The create adapter form showed the `id` field as disabled — user couldn't type an ID.

**Root cause**: The adapter type's `uiSchema` has `id: { "ui:disabled": true }` because it's designed for update mode (where the ID is immutable). But the same uiSchema was used for both create and update.

**Fix**: `resolveAdapterTypeSchema()` now takes a `"create" | "update"` mode parameter. For create, it forces `id: { "ui:disabled": false }`. For update, it forces `true`. This overrides whatever the type's uiSchema says.

**Ontology gap**: The distinction between create-mode and update-mode schemas is NOT described in the OpenAPI spec or our ontology. The adapter type provides a single `configSchema` + `uiSchema` pair, but the `id` field has different editability depending on the operation. This is implicit domain knowledge.

### Issue D: RJSF validation error from JSON Schema 2020-12

**Symptom**: Form rendered but showed validation error: `no schema with key or ref "https://json-schema.org/draft/2020-12/schema"`.

**Root cause**: Adapter type `configSchema` objects include `$schema: "https://json-schema.org/draft/2020-12/schema"`. RJSF uses AJV configured for draft-07. AJV treats the `$schema` keyword as a reference and tries to resolve it, failing because it doesn't have the 2020-12 meta-schema loaded.

**Fix**: `stripDollarSchema()` helper removes the `$schema` property from configSchema before passing to RJSF. This is safe because the schemas are structurally compatible — they don't use 2020-12-specific features.

**Note**: This could affect any external JSON Schema source, not just adapter types. If other dynamic schemas arrive with `$schema`, the same stripping would be needed. A more robust solution would be to strip `$schema` in the `SchemaForm` component itself, but for now the fix is scoped to the adapter tool.

### Issue E: `requiredOnly` causes API validation failure

**Symptom**: Creating an OPC-UA adapter submitted only `id` and `uri` to the API. The API returned 400: `{"type":"http://nowhere/AdapterFailedValidation","title":"Adapter failed validation","detail":"The provided adapter was invalid","status":400,"errors":[{"detail":"Invalid user supplied data","parameter":"$.required"}]}`.

**Root cause**: The create flow used `requiredOnly: true` in `requestFormInput()`. This triggers progressive disclosure in `ChatFormFields` — only fields listed in `schema.required` are shown initially. For OPC-UA, `required: ["id", "uri"]` means only 2 fields appear. But the API needs object-type fields like `security` and `opcuaToMqtt` even when using defaults. RJSF doesn't submit values for hidden fields, and has a known limitation with boolean fields — it cannot distinguish between `false` and "not set", so default boolean values (`overrideUri: false`) are also lost.

**Why this differs from bridges**: For bridges, we manually curated the `required` array in `form-schemas.ts` to include fields with defaults (`cleanStart`, `keepAlive`, `sessionExpiry`). But adapter schemas are dynamic — they come from the adapter type definition at runtime, so we can't manually curate each one.

**Fix**: Removed `requiredOnly: true` from the adapter create flow. Adapter configSchemas are already well-structured with a reasonable number of fields — showing all fields is fine. The `requiredOnly` pattern is only appropriate for large static schemas where we explicitly curate the visible set.

**Note**: The recovery behavior is good — the LLM receives the validation error and reopens the form. But the user shouldn't need to deal with this retry.

### Issue F: API error messages lost field-level detail needed for self-correction

**Symptom**: When the API returned a `ProblemDetails` error (e.g. adapter type not found, validation failure), the error shown in the chat bubble was the raw JSON payload. The LLM received either just the `title` string (e.g. "Adapter type not found") or a full JSON blob — both losing the actionable field-level detail from the `errors[]` array.

**Root cause**: `extractApiError()` only extracted `title` or `detail` from the top-level ProblemDetails object. It completely ignored the `errors` array, which is where the API communicates *which* parameter failed and *why*. For example:
- `errors[0].detail`: `"Adapter of type not found: opc-ua"` — tells the LLM exactly which type ID was wrong
- `errors[0].parameter`: `"$.required"` — tells the LLM which field caused validation failure

**Fix**: Rewrote `extractApiError()` with a `formatProblemDetails()` helper that understands the full `ProblemDetails` schema (defined in the OpenAPI spec). It now builds a structured string: `title: detail: error.detail (parameter: error.parameter)`. Example output: `"Adapter type not found: Adapter of type not found: opc-ua"`.

**Ontology insight**: This is a strong argument for the importance of a high-quality OpenAPI spec in building the agent's ontology. The `ProblemDetails` schema — with its `title`, `detail`, `errors[].detail`, and `errors[].parameter` structure — is a formal contract for how the API communicates errors. By understanding this contract (rather than treating errors as opaque blobs), the agent can:
1. Present errors to users as readable text instead of raw JSON
2. Give the LLM precise field-level feedback for self-correction (e.g. retry with the right adapter type ID)
3. Potentially map `parameter` paths back to form fields in the future

This reinforces a broader principle: the OpenAPI spec is not just documentation — it's the foundation of the agent's understanding of the domain. Every well-defined schema (ProblemDetails, configSchema, uiSchema) directly translates into better agent behavior.

---

## Verification

1. `pnpm build` — no errors
2. "Create an OPCUA adapter" → form shows real OPC-UA fields (URI, security, polling, etc.)
3. "Create a Modbus adapter" → form shows Modbus-specific fields (host, port, etc.)
4. API errors display as readable text, not `[object Object]`
5. Mock handlers return adapter types with configSchema
6. Adapter type cache is populated at startup, no redundant fetches
