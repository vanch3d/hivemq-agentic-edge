# Task Brief — Supplementary Domain Ontology

## Objective

Replace the 49-line inline domain ontology in `server/system-prompt.ts` with a modular, comprehensive ontology system that gives the LLM agent enough domain knowledge to construct valid API requests without hallucinating.

## Requirements

1. Create modular ontology files in `server/ontology/` with three modules:
   - **core.ts** — system overview, entity catalog, relationships, data flow, status model, auth, enums
   - **datahub.ts** — function catalog, FSMs, validation strategies, scripts, interpolation, limits
   - **adapters.ts** — JsonNode disambiguation, adapter types, tag semantics, form generation

2. Create an assembler (`index.ts`) that composes modules for system prompt injection

3. Update `system-prompt.ts` to import from the ontology modules instead of using inline text

4. Stay within ~3,500 token budget for the combined ontology

5. Address all gaps identified in the OpenAPI spec review (sections 11-19 of SPEC_REVIEW.md)
