# Task Brief: Inline Dialog Fix

## Issue 1 — Dialogs never close

When a mutation tool shows an inline form (ChatForm) or confirmation dialog (ApprovalCard) at the bottom of the chat drawer sidebar:

- Submitting the form resolves the promise but the form stays rendered permanently
- Cancelling the form resolves the promise but the form stays rendered permanently
- Same for the approval card (approve/reject resolves the promise but the card stays)
- This blocks any future form or approval from being displayed (the slot is permanently occupied)

## Issue 2 — JSON Schema `$ref` resolution in forms

Schemas from the generated `schemas.gen.ts` contain `$ref` pointers like `$ref: '#/components/schemas/LocalBridgeSubscription'`. When these schemas are passed to RJSF:

- RJSF/AJV cannot resolve the refs because there is no `definitions` (or `$defs`) block in the schema root
- Error: `Could not find a definition for #/components/schemas/LocalBridgeSubscription`
- This affects any schema with nested object references (e.g. BridgeSchema referencing LocalBridgeSubscription, BridgeSubscription, TlsConfiguration, etc.)
- Particularly visible in "Show All" mode for dynamic forms where optional fields with `$ref` become visible
