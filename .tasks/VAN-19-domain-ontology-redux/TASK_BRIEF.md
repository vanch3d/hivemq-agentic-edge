# Task Brief — Domain Ontology v2

## Background

The v1 domain ontology was extracted from a partial understanding of the HiveMQ Edge API, refined through iterative discussion, and shipped quickly. It consists of three markdown files (`server/ontology/core.md`, `datahub.md`, `adapters.md`) injected into the LLM system prompt, plus a graph assembler (`src/graph/assembler.ts`) that converts API data into a React Flow visualization.

The result works but is unsatisfactory in several areas:

- **Incomplete entity coverage**: v1 tracks 10 entity types in the graph; the formal OWL ontology from the Edge frontend team defines 13 classes with richer relationships.
- **Missing intermediary entities**: Devices, NorthboundMappings, SouthboundMappings, BridgeSubscriptions, DataCombinings, and AssetMappers are not first-class graph nodes — their relationships are flattened or inferred.
- **MQTT Topic is implicit**: Topics are not explicit entities in v1 — the assembler creates topic filter nodes but topics (exact publish destinations) exist only as string properties on mappings.
- **Relationship fidelity**: The assembler hard-codes relationships procedurally; there is no declarative ontology that tools and the graph can both consume.
- **No class/instance distinction**: The graph shows only instances (live API data). There is no "schema view" showing the ontology structure itself — what entity types exist, what properties they have, how they relate.

## Objectives

1. **Feature flag for v1/v2**: Users must be able to switch between v1 and v2 ontology. Move feature flags to their own configuration section (separate from AI provider settings).

2. **OpenAPI as primary source of truth**: Use the OpenAPI specification as the starting point for entity analysis. Every entity in the ontology should trace back to an API schema type.

3. **Incorporate the formal OWL ontology**: The Edge frontend team maintains a formal OWL 2 ontology in Turtle syntax at `docs/ontology/DOMAIN_ONTOLOGY.ttl` (in the main Edge frontend repo). This represents the "target state" for entity definitions and relationships. Use it as a reference — not necessarily the runtime format — for v2.

4. **New ontology document**: Create a new ontology definition in a machine-readable format that both the LLM agent and the graph visualization can consume. It should define:
   - Entity classes with properties and cardinality
   - Relationships between classes (domain → range)
   - Relationship semantics (one-to-many, many-to-many, containment, reference)
   - Visual metadata (icons, colors, rank/layer)

5. **Graph transformation algorithm**: Design a clear algorithm that transforms the ontology definition + API instance data into a React Flow graph. Both "classes" (ontology schema) and "instances" (live API data) should be identifiable and visually distinguishable.

6. **Stepwise approach**: This is a large task. Break it into reviewable phases so we can focus on different aspects one at a time.

## Reference Materials

| Source | Location | What it provides |
|--------|----------|------------------|
| v1 ontology (markdown) | `server/ontology/core.md`, `datahub.md`, `adapters.md` | Current entity descriptions, relationship graph, enums |
| v1 graph assembler | `src/graph/assembler.ts` | Current procedural transformation logic (383 lines) |
| v1 graph types | `src/graph/types.ts`, `constants.ts` | Entity types, icons, colors, edge styles, rank ordering |
| v1 graph store | `src/graph/store.ts` | Zustand state, view scopes, filtering logic |
| Formal OWL ontology | External: `docs/ontology/DOMAIN_ONTOLOGY.ttl` | 13 OWL classes, object/data properties, cardinality axioms |
| OWL ontology README | External: `docs/ontology/README.md` | Loading, querying, extending the TTL file |
| Domain model (prose) | External: `docs/architecture/DOMAIN_MODEL.md` | Prose entity definitions, Mermaid diagrams, transformation flows |
| Domain ontology reference | `.tasks/DOMAIN_ONTOLOGY.md` | Entity catalog from OpenAPI spec review |
| OpenAPI spec | `.docs/openapi-bundle.yaml` | 180+ schema types, 105 API operations |
| Settings system | `src/hooks/use-settings.ts`, `src/settings.tsx` | Current RJSF-based settings with localStorage persistence |
