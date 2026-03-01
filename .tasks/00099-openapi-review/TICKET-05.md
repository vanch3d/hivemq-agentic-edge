# OPENAPI-05: Replace JsonNode Catch-All with Contextual Types

**Epic:** [OpenAPI Specification Quality & Agentic Readiness](./EPIC.md)
**Priority:** P1 High
**Type:** Type Safety
**Review sections:** 10 (partial), 21

## Problem

`JsonNode` is a single `type: object` schema used in 9 semantically distinct contexts. Its description ("The arguments of the fsm derived from the behavior policy") applies to only one of those contexts. An LLM or SDK consumer cannot distinguish an adapter config from a UI schema from a tag definition.

## Scope

### 9 items — Create distinct wrapper types or add per-property descriptions

Replace each `JsonNode` usage with a contextually named type, or at minimum add a specific `description` at the property level where `$ref: JsonNode` is used.

| Current usage                  | Suggested replacement type   | Description                                                                                                        |
| ------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `Adapter.config`               | `AdapterConfigPayload`       | "Protocol-specific configuration for this adapter instance. Structure defined by the adapter type's configSchema." |
| `ProtocolAdapter.configSchema` | `JsonSchemaDocument`         | "JSON Schema defining the configuration structure for this adapter type"                                           |
| `ProtocolAdapter.uiSchema`     | `RjsfUiSchema`               | "RJSF UI schema controlling form rendering for this adapter type's configuration"                                  |
| `FunctionSpecs.schema`         | `JsonSchemaDocument` (reuse) | "JSON Schema defining the arguments accepted by this Data Hub function"                                            |
| `FunctionSpecs.uiSchema`       | `RjsfUiSchema` (reuse)       | "RJSF UI schema for rendering this function's argument form"                                                       |
| `DomainTag.definition`         | `TagDefinitionPayload`       | "Protocol-specific tag address definition. Structure defined by the adapter type's tag schema."                    |
| `TagSchema.configSchema`       | `JsonSchemaDocument` (reuse) | "JSON Schema defining the tag address structure for this adapter type"                                             |
| `getFsms` response             | `JsonSchemaDocument` (reuse) | "JSON Schema describing the available behavior model FSMs and their states"                                        |
| `get-writing-schema` response  | `JsonSchemaDocument` (reuse) | "JSON Schema defining the payload structure accepted when writing to this tag"                                     |

This consolidates 9 usages into 4 distinct types: `AdapterConfigPayload`, `TagDefinitionPayload`, `JsonSchemaDocument`, and `RjsfUiSchema`.

**Minimum viable fix:** If creating new types is not feasible, add per-property `description` overrides at every point where `JsonNode` is referenced, so the semantic context is at least human- and LLM-readable.
