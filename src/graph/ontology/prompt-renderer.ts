/**
 * Renders a DomainOntology into compact LLM-friendly text.
 *
 * Output format: structured markdown with entity catalog, relationship
 * graph, and data flow — optimized for token efficiency (~3,500 tokens).
 *
 * Pure function — no side effects.
 */

import type { DomainOntology, EntityClass, EntityRole } from "./types";

const ROLE_ORDER: EntityRole[] = [
  "orchestrator",
  "connector",
  "integrationPoint",
  "mapper",
  "policy",
  "resource",
];

const ROLE_LABELS: Record<EntityRole, string> = {
  orchestrator: "Orchestrators",
  connector: "Connectors",
  integrationPoint: "Integration Points",
  mapper: "Mappers",
  policy: "Policies",
  resource: "Resources",
};

function renderEntity(entity: EntityClass): string {
  const lines: string[] = [];

  // Header
  const source = entity.apiType
    ? `API: ${entity.apiType}`
    : entity.derivedFrom
      ? `derived from ${entity.derivedFrom.sourceEntity}`
      : "singleton";
  lines.push(`### ${entity.label} (\`${entity.key}\`) — ${source}`);

  // Description
  lines.push(entity.description);

  // Identity scope
  if (entity.identityScope) {
    lines.push(`Identity: scoped by \`${entity.identityScope}\`.`);
  }

  // Properties (only if non-empty)
  if (entity.properties.length > 0) {
    const props = entity.properties
      .map((p) => {
        let s = `\`${p.name}\` (${p.type})`;
        if (p.enumValues) s += `: ${p.enumValues.join(" | ")}`;
        return s;
      })
      .join(", ");
    lines.push(`Properties: ${props}`);
  }

  // Relationships
  if (entity.relationships.length > 0) {
    const rels = entity.relationships
      .map((r) => `${r.name} → \`${r.target}\` [${r.cardinality}]`)
      .join("; ");
    lines.push(`Relationships: ${rels}`);
  }

  return lines.join("\n");
}

/**
 * Render the full ontology as compact markdown for LLM system prompt injection.
 */
export function renderOntologyPrompt(ontology: DomainOntology): string {
  const sections: string[] = [];

  sections.push(`## Domain Ontology v${ontology.version}`);
  sections.push("");

  // Group entities by role
  for (const role of ROLE_ORDER) {
    const entities = Object.values(ontology.entities).filter(
      (e) => e.role === role,
    );
    if (entities.length === 0) continue;

    sections.push(`## ${ROLE_LABELS[role]}`);
    sections.push("");

    for (const entity of entities) {
      sections.push(renderEntity(entity));
      sections.push("");
    }
  }

  // Relationship summary (ASCII graph)
  sections.push("## Data Flow");
  sections.push("");
  sections.push(
    "OT Device → Tag → NorthboundMapper → Topic → Edge Broker → Bridge → Remote Broker",
  );
  sections.push(
    "Remote Broker → BridgeSubscription → TopicFilter → SouthboundMapper → Tag → OT Device",
  );
  sections.push(
    "Topic → DataPolicy → Schema/Script (validation & transformation)",
  );
  sections.push("Combiner: N adapters/bridges → 1 Topic");
  sections.push(
    "DataPolicy.Delivery.redirectTo → new Topic (only DataHub feedback path, must stay DAG)",
  );
  sections.push("");

  // Key concepts
  sections.push("## Key Concepts");
  sections.push("");
  sections.push(
    "- **Northbound** = OT→IT (device tag → MQTT topic). **Southbound** = IT→OT (topic filter → device tag).",
  );
  sections.push(
    "- **Edge Broker** is the local MQTT broker (singleton). Owns locally-published topics and topic filters.",
  );
  sections.push(
    "- **Remote Broker** is reached via a Bridge (1 per bridge). Owns remote-side topics.",
  );
  sections.push(
    "- **OT Device** is derived 1:1 from Adapter. Same thing, different vocabulary (boiler vs adapter).",
  );
  sections.push(
    "- **Topic** is an exact MQTT string (no wildcards). **TopicFilter** may contain + and # wildcards.",
  );
  sections.push(
    "- **Tag** identity = (adapter, tagName). **Topic** identity = (broker, topicPath). Not globally unique.",
  );
  sections.push(
    "- **Combiner** is a generalized NorthboundMapper (N sources → 1 topic). **AssetMapper** is a Combiner targeting a Pulse asset.",
  );
  sections.push(
    "- **BehaviorPolicy** monitors MQTT clients by clientIdRegex. Cannot create new topics.",
  );

  return sections.join("\n");
}
