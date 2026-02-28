/**
 * Ontology module registry.
 *
 * Each module exports a string constant containing domain knowledge
 * formatted for LLM system prompt injection.
 *
 * Phase 1 strategy: always inject core + datahub.
 * Selective injection based on conversation topic is a future optimization.
 */

import { CORE_ONTOLOGY } from "./core.js";
import { DATAHUB_ONTOLOGY } from "./datahub.js";
import { ADAPTERS_ONTOLOGY } from "./adapters.js";

export { CORE_ONTOLOGY } from "./core.js";
export { DATAHUB_ONTOLOGY } from "./datahub.js";
export { ADAPTERS_ONTOLOGY } from "./adapters.js";

/**
 * Assemble the full domain ontology for system prompt injection.
 *
 * Currently injects all modules. A future version could accept
 * conversation context to select relevant modules.
 */
export function assembleDomainOntology(): string {
  return [CORE_ONTOLOGY, DATAHUB_ONTOLOGY, ADAPTERS_ONTOLOGY].join("\n");
}
