# OPENAPI-11: Improve Edge Management Examples

**Epic:** [OpenAPI Specification Quality & Agentic Readiness](./EPIC.md)
**Priority:** P3 Low
**Type:** Quality
**Review sections:** 25

## Problem

Data Hub endpoints have excellent examples (multiple named examples per endpoint with realistic data). Edge management endpoints have poor or absent examples — some are empty objects, some are invalid JSON, and some show data from the wrong resource type.

## Scope

### 6 items

1. **`GET /api/v1/management/events`** — replace `{}` example with a realistic `EventList` containing 2–3 events with different severity levels.

2. **`get-capabilities`** — fix the example: currently a JSON string literal with missing commas (invalid JSON). Replace with a properly structured `CapabilityList`.

3. **Northbound/Southbound mappings** — add examples showing realistic mapping configurations with `tagName`, `topicFilter`, `maxQoS`, etc.

4. **Domain tags by ID** — add an example showing a `DomainTag` with a protocol-specific `definition` payload.

5. **Combiners** — add examples for `GET /combiners`, `GET /combiners/{combinerId}`, and the nested mapping/instruction endpoints.

6. **Bridge examples** — replace `password: password` in the `getBridgeByName` example with `password: "********"` or remove the field entirely (it should be `writeOnly` per OPENAPI-01).
