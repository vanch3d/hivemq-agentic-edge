/**
 * Domain ontology type system.
 *
 * Defines the shape of entity classes, their properties, relationships,
 * and visual metadata. The v2 ontology definition in `v2-ontology.ts`
 * is a concrete instance of these types.
 */

/** Taxonomy role — what function an entity plays in the system. */
export type EntityRole =
  | "orchestrator" // Singletons that own resources (Edge Broker, DataHub, Pulse)
  | "connector" // Gateways to external systems (Adapter, Bridge)
  | "integrationPoint" // Data endpoints (OT Device, Tag, Topic, TopicFilter)
  | "mapper" // Route data between integration points
  | "policy" // Validate/transform traffic (owned by DataHub)
  | "resource"; // Used by policies (Schema, Script)

export type PropertyType = "string" | "number" | "boolean" | "enum" | "object";

export type Cardinality = "1:1" | "1:N" | "N:1" | "N:M" | "0..N";

/** A data property on an entity (scalar value). */
export type PropertyDef = {
  name: string;
  type: PropertyType;
  description: string;
  required?: boolean;
  enumValues?: string[];
};

/** A relationship (edge) between two entity types. */
export type RelationshipDef = {
  /** Relationship name — used as edge label (e.g. "manages", "sourceTag"). */
  name: string;
  /** Target entity type key (e.g. "device", "topic"). */
  target: string;
  cardinality: Cardinality;
  description: string;
  /** Inverse relationship name, if named (e.g. "managedBy"). */
  inverse?: string;
  /** Edge style key — maps to visual constants. */
  edgeStyle?: string;
};

/** How a derived entity is extracted from API data. */
export type DerivedFrom = {
  /** API entity type that serves as input (e.g. "adapter", "northboundMapping"). */
  sourceEntity: string;
  /** Human-readable extraction rule. */
  extractionRule: string;
};

/** An entity class in the domain ontology. */
export type EntityClass = {
  /** Unique key used as graph node type prefix (e.g. "adapter", "otDevice"). */
  key: string;
  /** Human-readable display name (e.g. "Adapter", "OT Device"). */
  label: string;
  /** Ontological description — what this entity represents. */
  description: string;
  /** Taxonomy role. */
  role: EntityRole;
  /** OpenAPI schema name, if this entity maps to an API type (e.g. "Adapter", "DomainTag"). */
  apiType?: string;
  /** For entities not directly from the API — how to derive them. */
  derivedFrom?: DerivedFrom;
  /** Parent entity key for subclass relationships (e.g. AssetMapper → Combiner). */
  superClass?: string;
  /**
   * Parent entity key that scopes identity.
   * Tag identity = (adapter, tagName), Topic identity = (broker, topicPath).
   * Entities with the same name but different scopes are distinct instances.
   */
  identityScope?: string;
  /** Data properties (scalar fields on this entity). */
  properties: PropertyDef[];
  /** Outgoing relationships to other entity types. */
  relationships: RelationshipDef[];
  /** Visual presentation metadata. */
  visual: {
    /** react-icons identifier (e.g. "LuPlug2"). */
    icon: string;
    /** Chakra UI color token (e.g. "blue.500"). */
    color: string;
    /** Layout rank — lower = upstream in the data flow. */
    rank: number;
  };
};

/** The complete domain ontology definition. */
export type DomainOntology = {
  version: string;
  entities: Record<string, EntityClass>;
};
