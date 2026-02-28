# HiveMQ Edge — Domain Ontology

> The source of truth is the `.md` files — each `.ts` module reads its corresponding
> markdown file at startup via `readFileSync` and re-exports it as a named string constant.

---

## Module Structure

| Module   | Markdown      | TypeScript    | Purpose                                                                              | Injected         |
| -------- | ------------- | ------------- | ------------------------------------------------------------------------------------ | ---------------- |
| Core     | `core.md`     | `core.ts`     | System overview, entity catalog, relationships, data flow, status model, auth, enums | Always           |
| Data Hub | `datahub.md`  | `datahub.ts`  | Function catalog, FSMs, validation, scripts, interpolation, limits                   | Always (phase 1) |
| Adapters | `adapters.md` | `adapters.ts` | JsonNode disambiguation, adapter types, tag semantics, form generation               | Always (phase 1) |

## How It Works

Each `.ts` module reads its adjacent `.md` file and exports a named string constant
(e.g. `CORE_ONTOLOGY`). The `index.ts` assembler composes them into a single string
for system prompt injection via `assembleDomainOntology()`.

The `.md` files are also served directly via `GET /api/ontology/:module` so the frontend
configuration page can display them.

`server/system-prompt.ts` imports and calls the assembler, injecting the result into the
`${DOMAIN_ONTOLOGY}` placeholder within the system prompt template.

## Core Module (`core.md`)

Covers the foundational domain knowledge:

- **System Overview**: What HiveMQ Edge is and its role
- **Entity Catalog**: 15 entities with properties and ownership
- **Relationship Graph**: Directed links with cardinality
- **Data Flow**: End-to-end path from device to cloud and back
- **Status Model**: States, transitions, side effects
- **Authentication**: JWT lifecycle, public vs. authenticated endpoints
- **Collection Patterns**: Simple lists vs. cursor-based pagination
- **Error Model**: RFC 7807 three-layer hierarchy
- **Key Enums**: All enum values needed for valid API requests

## Data Hub Module (`datahub.md`)

Deep dive into the policy engine:

- **Function Catalog**: 8 pipeline functions with arguments, terminal/data-only flags
- **Behavior Models & FSMs**: 3 models (Mqtt.events, Publish.duplicate, Publish.quota) with state diagrams
- **Validation Strategies**: ALL_OF and ANY_OF with SchemaReference structure
- **Transformation Scripts**: Runtime contract (`transform(publish, context)`) and constraints
- **String Interpolation**: Variable syntax and availability per policy type
- **System Limits**: Max counts (5,000), sizes (100KB), redirect depth (20)
- **Policy Evaluation Flow**: Validators → onSuccess/onFailure pipeline

## Adapters Module (`adapters.md`)

Adapter-specific context:

- **JsonNode Disambiguation**: 9 different uses of the opaque JsonNode type
- **Adapter Type Ecosystem**: Common protocol types and capabilities
- **Tag Semantics**: Protocol-specific addressing (OPC-UA nodeIds, Modbus registers, S7 DBs)
- **Form Generation**: How configSchema/uiSchema drive dynamic RJSF forms

## Token Budget

| Module      | Target     | Actual     |
| ----------- | ---------- | ---------- |
| core.md     | ~1,500     | ~1,500     |
| datahub.md  | ~1,200     | ~1,200     |
| adapters.md | ~500       | ~500       |
| **Total**   | **~3,200** | **~3,200** |

Well within context budget alongside the ~1,200 token tool description section.
