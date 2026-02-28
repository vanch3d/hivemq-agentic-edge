# OPENAPI-06: Model Cross-Resource Relationships

**Epic:** [OpenAPI Specification Quality & Agentic Readiness](./EPIC.md)
**Priority:** P1 High
**Type:** Modeling
**Review sections:** 20

## Problem

The spec does not model relationships between resources. An LLM or ontology extractor cannot discover ownership, containment, or reference links between entities — they must be inferred from URL path patterns or opaque string IDs.

## Scope

### 8 relationships to document

For each relationship, either add `x-relationship` vendor extensions or enrich the property/endpoint descriptions to explicitly state the link.

| Relationship | Current state | Suggested remediation |
| --- | --- | --- |
| **Adapter → Tags** | Only discoverable from `GET .../adapters/{adapterId}/tags` URL | Add to `Adapter` schema description: "An adapter owns zero or more domain tags. See `GET /adapters/{adapterId}/tags`." Add `x-parent: Adapter` to `DomainTag`. |
| **Adapter → Northbound Mappings** | Only from URL pattern | Same pattern. Add description to `NorthboundMapping`: "Belongs to a specific adapter instance." |
| **Adapter → Southbound Mappings** | Only from URL pattern | Same. |
| **Tag → Adapter (reverse)** | Via `DomainTagOwner.adapterId` (only on global endpoint) | Add description to `DomainTagOwner.adapterId`: "The ID of the adapter that owns this tag." |
| **Bridge → Status** | Embedded `status` property + separate endpoint | Add description: "Runtime status is embedded in the bridge object and also available via `GET /bridges/{bridgeId}/status`." |
| **Combiner → Mappings → Instructions** | Only from URL hierarchy | Document the three-level nesting in `Combiner` description: "A combiner contains data combining mappings, each with merge instructions." |
| **DataPolicy → Schema** | Opaque `schemaId` string | Add to `DataPolicyValidator.arguments` description (once typed per OPENAPI-02): "The `schemaId` references a schema registered via `POST /data-hub/schemas`." |
| **ManagedAsset → DataCombiningMapping** | Via `mappingId` UUID | Add description: "References a data combining mapping by its UUID. See `GET /combiners/{combinerId}/mappings`." |

**Alternative approach:** If vendor extensions (`x-relationship`, `x-parent`, `x-references`) are available in the spec toolchain, use structured metadata instead of prose descriptions. This is more machine-parseable for ontology extraction.
