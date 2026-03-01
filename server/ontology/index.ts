/**
 * Ontology module registry.
 *
 * Each constant reads its adjacent `.md` file at startup.
 * The markdown is injected into the LLM system prompt and
 * served via GET /api/ontology for the configuration UI.
 *
 * v1: core.md + datahub.md + adapters.md (hand-written)
 * v2: v2-core.md + datahub.md + adapters.md (v2-core auto-generated from ontology definition)
 */

import { readFileSync } from "node:fs";

const read = (file: string) =>
  readFileSync(new URL(file, import.meta.url), "utf-8");

export const CORE_ONTOLOGY = read("./core.md");
export const V2_CORE_ONTOLOGY = read("./v2-core.md");
export const DATAHUB_ONTOLOGY = read("./datahub.md");
export const ADAPTERS_ONTOLOGY = read("./adapters.md");

/**
 * Assemble the full domain ontology for system prompt injection.
 *
 * @param version - "v1" uses the hand-written core.md; "v2" uses the
 *   auto-generated v2-core.md (from the TypeScript ontology definition).
 *   DataHub and Adapters modules are shared by both versions.
 */
export function assembleDomainOntology(version: "v1" | "v2" = "v1"): string {
  const core = version === "v2" ? V2_CORE_ONTOLOGY : CORE_ONTOLOGY;
  return [core, DATAHUB_ONTOLOGY, ADAPTERS_ONTOLOGY].join("\n");
}
