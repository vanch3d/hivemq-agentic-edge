# EPIC: OpenAPI Specification Quality & Agentic Readiness

**ID:** OPENAPI-EPIC
**Source:** [Full Spec Review](./SPEC_REVIEW.md)
**Spec file:** `.docs/openapi-bundle.yaml` (OpenAPI 3.0.1 — HiveMQ Edge REST API 2025.19-SNAPSHOT)

## Objective

Bring the HiveMQ Edge OpenAPI specification to a quality level where it can serve as the primary context backbone for agentic conversation and domain ontology extraction. The spec currently has 105 operations across 49 paths and ~120 component schemas but suffers from missing security declarations, opaque domain types, copy-paste errors, inconsistent conventions, and absent relationship modeling.

## Tickets

| ID | Priority | Type | Title |
| --- | --- | --- | --- |
| [OPENAPI-01](./TICKET-01.md) | P0 Critical | Security | Add API security declarations |
| [OPENAPI-02](./TICKET-02.md) | P0 Critical | Type Safety | Type Data Hub policy domain objects |
| [OPENAPI-03](./TICKET-03.md) | P1 High | Correctness | Fix incorrect and copy-pasted descriptions |
| [OPENAPI-04](./TICKET-04.md) | P1 High | Completeness | Add missing schema descriptions and required fields |
| [OPENAPI-05](./TICKET-05.md) | P1 High | Type Safety | Replace JsonNode catch-all with contextual types |
| [OPENAPI-06](./TICKET-06.md) | P1 High | Modeling | Model cross-resource relationships |
| [OPENAPI-07](./TICKET-07.md) | P2 Medium | Consistency | Standardize naming conventions |
| [OPENAPI-08](./TICKET-08.md) | P2 Medium | Consistency | Align HTTP semantics and response patterns |
| [OPENAPI-09](./TICKET-09.md) | P2 Medium | Correctness | Fix grammar, typos, and en-US style issues |
| [OPENAPI-10](./TICKET-10.md) | P2 Medium | Completeness | Document Data Hub runtime contracts |
| [OPENAPI-11](./TICKET-11.md) | P3 Low | Quality | Improve Edge management examples |
| [OPENAPI-12](./TICKET-12.md) | P3 Low | Cleanup | Resolve structural oddities |

## Priority Definitions

| Priority | Meaning |
| --- | --- |
| P0 Critical | Blocks agentic use or creates security/correctness failures |
| P1 High | Significantly degrades agentic reasoning or developer experience |
| P2 Medium | Inconsistencies that accumulate into confusion |
| P3 Low | Polish items, minor cleanup |
