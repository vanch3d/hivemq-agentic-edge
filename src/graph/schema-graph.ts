/**
 * Schema/class view graph generator.
 *
 * Transforms the ontology definition into a React Flow graph where:
 *   - Each entity class → one node (type: "schemaClass")
 *   - Each relationship → one labeled directed edge
 *
 * No API data required — renders from the ontology definition alone.
 */

import type { DomainOntology } from "./ontology";
import type { GraphNode, GraphEdge, DomainEntityType } from "./types";

/**
 * Build a React Flow graph representing the ontology schema.
 * Nodes represent entity classes; edges represent relationships.
 */
export function buildSchemaGraph(ontology: DomainOntology): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (const entity of Object.values(ontology.entities)) {
    // Node for this entity class
    nodes.push({
      id: entity.key,
      type: "schemaClass",
      position: { x: 0, y: 0 },
      data: {
        entityType: entity.key as DomainEntityType,
        label: entity.label,
        sublabel: entity.role,
        raw: {
          description: entity.description,
          role: entity.role,
          properties: entity.properties,
          relationships: entity.relationships,
          apiType: entity.apiType,
          derivedFrom: entity.derivedFrom,
          superClass: entity.superClass,
          identityScope: entity.identityScope,
        },
      },
    });

    // Edges for each relationship
    entity.relationships.forEach((rel) => {
      // Only create edge if target entity exists in the ontology
      if (ontology.entities[rel.target]) {
        edges.push({
          id: `schema-${entity.key}-${rel.name}-${rel.target}`,
          source: entity.key,
          target: rel.target,
          type: "relationship",
          label: rel.name,
          data: { relationship: rel.name },
        });
      }
    });
  }

  return { nodes, edges };
}
