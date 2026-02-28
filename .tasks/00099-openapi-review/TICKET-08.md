# OPENAPI-08: Align HTTP Semantics and Response Patterns

**Epic:** [OpenAPI Specification Quality & Agentic Readiness](./EPIC.md)
**Priority:** P2 Medium
**Type:** Consistency
**Review sections:** 6, 23, 24

## Problem

The Data Hub and Edge management subsystems use different HTTP conventions for the same operations, and pagination patterns are inconsistent. This forces clients and agentic systems to handle each subsystem differently.

## Scope

### Part A — Standardize status codes (Edge management endpoints)

Align Edge management endpoints with the Data Hub convention:

| Operation | Current (Edge) | Target | Change |
| --- | --- | --- | --- |
| Create (POST) | `200 OK` empty body | `201 Created` with resource body | Return the created resource |
| Delete (DELETE) | `200 OK` empty body | `204 No Content` | Change status code |
| Update (PUT) | `200 OK` empty body | `200 OK` with resource body | Return the updated resource |

Affected endpoint groups: bridges, adapters, topic filters, combiners, pulse, UNS.

### Part B — Fix incorrect error status codes (3 items)

| Endpoint | Current | Correct |
| --- | --- | --- |
| `add-topicFilters` "Already Present" | `403 Forbidden` | `409 Conflict` |
| `delete-topicFilter` "Already Present" | `403 Forbidden` | Remove (or `404 Not Found`) |
| `update-adapter-domainTag` "Adapter not found" | `403 Forbidden` | `404 Not Found` |

### Part C — Document pagination patterns

Add a description or `x-pagination` extension to each list endpoint indicating:
- Whether pagination is supported
- The mechanism (cursor-based, offset-based, or none)
- Default and max page sizes

At minimum, add this information to the endpoint descriptions so an LLM can reason about it.

### Part D — Standardize error content types

Edge management endpoints should use `application/problem+json` (RFC 7807) for error responses, matching the Data Hub pattern. Currently they use `application/json`.
