/**
 * Ontology module registry.
 *
 * Each constant reads its adjacent `.md` file at startup.
 * The markdown is injected into the LLM system prompt and
 * served via GET /api/ontology for the configuration UI.
 *
 * Phase 1 strategy: always inject core + datahub.
 * Selective injection based on conversation topic is a future optimization.
 */

import { readFileSync } from "node:fs";

const read = (file: string) =>
  readFileSync(new URL(file, import.meta.url), "utf-8");

export const CORE_ONTOLOGY = read("./core.md");
export const DATAHUB_ONTOLOGY = read("./datahub.md");
export const ADAPTERS_ONTOLOGY = read("./adapters.md");

/**
 * Assemble the full domain ontology for system prompt injection.
 *
 * Currently injects all modules. A future version could accept
 * conversation context to select relevant modules.
 */
export function assembleDomainOntology(): string {
  return [CORE_ONTOLOGY, DATAHUB_ONTOLOGY, ADAPTERS_ONTOLOGY].join("\n");
}
