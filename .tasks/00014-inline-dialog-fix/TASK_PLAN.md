# Task Plan: Inline Dialog Fix

## Issue 1 — Dialogs never close

### Root cause

In `chat-drawer.tsx` (lines 133-158), the `onSubmit`/`onCancel`/`onApprove`/`onReject` callbacks call `activeForm.resolve(...)` and `activeApproval.resolve(...)` to settle the tool's promise, but **never clear the state**. The `activeForm` and `activeApproval` state in `chat-context.tsx` remains non-null forever after the first interaction.

The promise-based pattern works correctly: tools `await requestFormInput(...)` and receive the resolved value. But React has no reason to un-render the form because `activeForm` still points to the old request object.

### Fix

In `chat-drawer.tsx`, after calling `resolve()`, also clear the corresponding state. The cleanest approach: the ChatProvider should expose `clearForm` and `clearApproval` actions, or simpler — the drawer callbacks should set state to null directly.

**Option A (minimal)**: Clear state inline in the drawer callbacks.

The drawer already imports `useChatContext()`. We need to add `setActiveForm(null)` / `setActiveApproval(null)` to the context, or wrap the resolve+clear in the context's requester logic.

**Option B (cleaner, preferred)**: Make the promise requesters auto-clear state on resolve. In `chat-context.tsx`, wrap the `resolve` function so it clears state after resolving:

```
setFormRequester((request: FormRequest) => {
  return new Promise((resolve) => {
    setActiveForm({
      ...request,
      resolve: (result) => {
        resolve(result);
        setActiveForm(null);  // <-- auto-clear
      },
    });
  });
});
```

Same pattern for the approval requester.

This keeps the drawer callbacks unchanged (they just call `resolve(...)` as before) and guarantees cleanup regardless of how/where resolve is called.

### Files to change

- `src/context/chat-context.tsx` — wrap resolve callbacks to auto-clear state

### Progress

- [x] Wrap form resolve to auto-clear `activeForm`
- [x] Wrap approval resolve to auto-clear `activeApproval`
- [ ] Verify: submit form → form disappears, tool receives data
- [ ] Verify: cancel form → form disappears, tool receives cancellation
- [ ] Verify: approve → card disappears
- [ ] Verify: reject → card disappears
- [ ] Verify: second form request works after first is dismissed

---

## Issue 2 — JSON Schema `$ref` resolution

### Root cause

Generated schemas in `src/api/schemas.gen.ts` contain `$ref` pointers in OpenAPI format:

```json
{ "$ref": "#/components/schemas/LocalBridgeSubscription" }
```

RJSF resolves `$ref` by looking in the schema root's `definitions` (or `$defs`) key. Since the generated schemas are flat objects with no `definitions` block, RJSF cannot resolve any cross-schema references.

This affects schemas like `BridgeSchema` which references:

- `LocalBridgeSubscription` (via `localSubscriptions.items`)
- `BridgeSubscription` (via `remoteSubscriptions.items`)
- `TlsConfiguration` (via `tlsConfiguration`)
- `Status` (via `status`)
- `WebsocketConfiguration` (via `websocketConfiguration`)
- `BridgeCustomUserProperty` (nested in subscriptions)

### Fix

Build a `definitions` block by scanning the schema for `$ref` pointers, mapping them to the corresponding exported schema constants, and injecting them into the schema root before passing to RJSF.

**Approach**: Create a utility function `resolveSchemaRefs(schema: RJSFSchema): RJSFSchema` that:

1. Walks the schema tree recursively looking for `$ref` strings matching `#/components/schemas/<Name>`
2. For each ref found, imports the corresponding `<Name>Schema` from the schema registry
3. Rewrites refs from `#/components/schemas/<Name>` to `#/definitions/<Name>` (RJSF convention)
4. Attaches all collected schemas under a `definitions` key at the root
5. Recursively resolves refs within the collected definitions too (e.g. `LocalBridgeSubscription` → `BridgeCustomUserProperty`)

**Schema registry**: Build a lookup map from the generated `schemas.gen.ts`. All schemas follow the naming convention `export const <Name>Schema = ...`, so we can create a map:

```ts
import * as allSchemas from "@/api/schemas.gen";

const schemaMap: Record<string, RJSFSchema> = {};
for (const [key, value] of Object.entries(allSchemas)) {
  if (key.endsWith("Schema") && typeof value === "object") {
    // "BridgeSchema" → "Bridge"
    schemaMap[key.slice(0, -6)] = value as RJSFSchema;
  }
}
```

**Where to apply**: In `form-schemas.ts` when building registry entries, or better — in `ChatForm` / `SchemaForm` as a pre-processing step so all schema-driven forms benefit.

### Files to change

- New utility: `src/utils/resolve-schema-refs.ts` — walks schema, collects refs, builds definitions
- `src/components/chat/chat-form.tsx` or `src/components/schema-form.tsx` — apply the resolver before passing to RJSF

### Progress

- [x] Create `resolveSchemaRefs` utility
- [x] Integrate into form rendering pipeline (in `SchemaForm` — benefits all forms)
- [ ] Verify: BridgeSchema "Show All" renders LocalBridgeSubscription fields
- [ ] Verify: nested refs resolve (BridgeCustomUserProperty inside LocalBridgeSubscription)
- [ ] Verify: schemas without $ref are unaffected
