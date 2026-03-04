# OPENAPI-10: Document Data Hub Runtime Contracts

**Epic:** [OpenAPI Specification Quality & Agentic Readiness](./EPIC.md)
**Priority:** P2 Medium
**Type:** Completeness
**Review sections:** 16, 17, 18

## Problem

Three aspects of the Data Hub are well-defined in the product but absent from the spec: string interpolation variables in function arguments, the transformation script runtime API, and system-enforced resource limits. These are not schema-level gaps (covered in OPENAPI-02) but documentation gaps that affect anyone building on the API.

## Scope

### Part A — Document string interpolation (2 items)

1. Add to `PolicyOperation.arguments` description (or to a shared description on string-type arguments): "String arguments support `${variable}` interpolation. Available variables: `clientId`, `topic`, `policyId`, `validationResult` (data policies), `fromState`, `toState`, `triggerEvent` (behavior policies), `timestamp`."

2. Mark which specific function arguments accept interpolation:
   - `System.log.message` — yes
   - `Delivery.redirectTo.topic` — yes
   - `Metrics.Counter.increment.metricName` — no (documented as not supporting interpolation)

### Part B — Document transformation script contract (1 item)

Add a description to the `Script` schema (or to the `functionType: TRANSFORMATION` enum value) explaining the runtime contract:

- Required entry point: `function transform(publish, context) { return publish; }`
- Optional init: `function init(initContext) { }`
- `publish` shape: `{ topic, qos, retain, userProperties, payload }`
- `context` shape: `{ arguments, policyId, clientId, branches, clientConnectionStates }`
- Runtime: synchronous ECMAScript 2024, no browser/Node APIs

This is supplementary documentation — it cannot be expressed as a schema type. An `x-runtime-contract` extension or a detailed description are both acceptable.

### Part C — Document system limits (1 item)

Add `maxItems`, `maxLength`, or descriptions documenting hard limits:

| Property/Endpoint              | Limit                | How to express                                      |
| ------------------------------ | -------------------- | --------------------------------------------------- |
| Data policies                  | 5,000 max            | `x-max-items: 5000` or description on POST endpoint |
| Behavior policies              | 5,000 max            | Same                                                |
| Schemas                        | 5,000 max            | Same                                                |
| Scripts                        | 5,000 max            | Same                                                |
| `PolicySchema` definition body | 100KB                | `maxLength` or description                          |
| `Script.source`                | 100KB                | `maxLength` or description                          |
| `Delivery.redirectTo`          | 20 policy eval depth | Description on `applyPolicies` argument             |
| Client connection state value  | 10KB                 | Description                                         |
| Client connection state total  | 50MB                 | Description                                         |
