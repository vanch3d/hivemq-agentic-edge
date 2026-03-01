# OPENAPI-07: Standardize Naming Conventions

**Epic:** [OpenAPI Specification Quality & Agentic Readiness](./EPIC.md)
**Priority:** P2 Medium
**Type:** Consistency
**Review sections:** 5, 7, 27

## Problem

Three issues compound to make the API surface inconsistent:

1. **operationId** mixes camelCase (~40), kebab-case (~50), and broken mixed (~5)
2. **Tags** are used but not defined in 4 cases, and naming is inconsistent (some have "Endpoint" suffix, some don't, some use unexpanded acronyms)
3. **List schema names** inconsistently pluralize: `AdaptersList` vs. `BridgeList`

## Scope

### Part A — Standardize operationId to camelCase (all ~105 operations)

Convert all kebab-case operationIds to camelCase. The Data Hub endpoints already use camelCase consistently — extend this to Edge management and Frontend.

Examples:

- `refresh-token` → `refreshToken`
- `get-capabilities` → `getCapabilities`
- `get-bridges-status` → `getBridgesStatus`
- `add-topicFilters` → `addTopicFilter`
- `delete-adapter-domainTags` → `deleteAdapterDomainTag`

Fix mixed/misleading IDs:

- `getCombinersById` → `getCombinerById` (singular)
- `getBridgeByName` → `getBridgeById` (path param is `{bridgeId}`, not a name)

### Part B — Define and standardize tags (16 tags)

1. Define all used tags in the top-level `tags:` section with descriptions.
2. Remove "Endpoint" suffix from tag names:
   - `Authentication Endpoint` → `Authentication`
   - `Gateway Endpoint` → `Gateway`
   - `Metrics Endpoint` → `Metrics`
3. Expand acronyms:
   - `UNS` → `Unified Namespace`
   - `Data Hub - FSM` → `Data Hub - Finite State Machines`
4. Clarify ambiguous tags:
   - `Data Hub - State` → `Data Hub - Client State`
   - `Domain` → merge into `Protocol Adapters` or rename to `Domain Tags`
5. Add missing tag definitions: `Combiners`, `Health Check Endpoint` → `Health`

### Part C — Normalize list schema names (15 schemas)

Pick one convention (`*List` without plural entity) and rename:

- `AdaptersList` → `AdapterList`

Or document the convention and apply consistently.
