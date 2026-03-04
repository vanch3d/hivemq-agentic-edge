# OPENAPI-12: Resolve Structural Oddities

**Epic:** [OpenAPI Specification Quality & Agentic Readiness](./EPIC.md)
**Priority:** P3 Low
**Type:** Cleanup
**Review sections:** 10, 22, 26

## Problem

A collection of structural issues that individually are minor but collectively add friction for API consumers and generated SDKs.

## Scope

### 8 items

1. **Pulse asset-mappers duplicate Combiners** — the `/api/v1/management/pulse/asset-mappers/*` endpoints are an exact mirror of `/api/v1/management/combiners/*`, reusing the same schemas and even the same `combinerId` path parameter. Either:
   - Document this intentional aliasing (add a description: "Alias for the Combiners API")
   - Or deprecate one set in favor of the other

2. **`getMappingInstructions` returns bare array** — returns `type: array` directly instead of wrapping in `{ items: [...] }` like every other list endpoint. Wrap in a list schema for consistency.

3. **`NorthboundMapping.messageExpiryInterval` default value** — `9007199254740991L` has a Java `L` suffix that is not valid JSON. Remove the `L`.

4. **`createSchema` has `If-Match` header** — unusual for a POST/create. Either:
   - Document why (e.g., conditional create-if-not-exists)
   - Or remove if it's a copy-paste artifact from the update endpoint

5. **`set-isa95` uses POST** — this is an idempotent set/replace operation. Change to PUT, or document why POST is intentional.

6. **`GET /api/v1/data-hub/functions` deprecated** — add an `x-sunset` date or deprecation timeline in the description so consumers know when it will be removed.

7. **Missing `ETag` response headers** — Data Hub endpoints accept `If-Match` request headers for conditional updates but never document `ETag` in response headers. Add `ETag` to GET response headers on schemas, scripts, and policies.

8. **Missing enums on dynamic-only values** — `Adapter.type` and `ISA95ApiBean` level fields have no enum constraints. For adapter types this is inherently dynamic (loaded from modules), so add a description: "Valid values are determined at runtime by installed protocol adapter modules. Use `GET /protocol-adapters` to discover available types." For ISA-95, document the hierarchy levels.
