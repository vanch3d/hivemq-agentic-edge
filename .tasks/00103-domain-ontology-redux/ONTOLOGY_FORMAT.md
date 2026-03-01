# Ontology Format — Design Decision

How should the v2 ontology be represented at runtime? This document evaluates the options.

---

## Requirements

The v2 ontology definition must serve three consumers:

1. **LLM system prompt** — The agent needs entity descriptions, relationship semantics, and property definitions to construct valid API queries and interpret results.

2. **Graph assembler** — The code that transforms API data into React Flow nodes/edges needs to know which entities exist, how they relate, what visual properties to apply, and how to derive entities from API responses.

3. **Schema/class view** — A new visualization mode showing the ontology structure itself (not instances), with classes as nodes and relationships as edges.

---

## Options Evaluated

### Option A: OWL/Turtle (TTL)

Use the same format as the formal ontology from the Edge frontend team.

| Pros | Cons |
|------|------|
| Standards-based (W3C) | Requires a Turtle parser at runtime (n3.js: ~50KB gzipped) |
| Can be validated by OWL reasoners | OWL 2 DL cannot express MQTT wildcard matching |
| Can be queried with SPARQL | Over-engineered for a React app — we don't need reasoning or SPARQL |
| Direct compatibility with `DOMAIN_ONTOLOGY.ttl` | Visual metadata (icons, colors, ranks) are not part of OWL — would need custom annotations |
| | LLM agents parse Turtle poorly compared to JSON or TypeScript |

**Verdict**: Too heavy. The formal ontology is a reference, not our runtime format.

### Option B: JSON-LD

RDF serialized as JSON. Theoretically the "best of both worlds" — JSON for machines, RDF semantics for ontologists.

| Pros | Cons |
|------|------|
| JSON — easy to parse in JS/TS | JSON-LD context resolution adds complexity |
| Can reference OWL URIs via `@context` | Still requires understanding RDF triples conceptually |
| Standard format | Visual metadata still needs custom vocabulary |
| | LLM agents find JSON-LD's `@type`/`@id` conventions confusing |

**Verdict**: Conceptually appealing but adds accidental complexity. We're not building a linked data platform.

### Option C: TypeScript Object Literal (Recommended)

Define the ontology as a typed TypeScript data structure. Classes, properties, relationships, and visual metadata are all expressed in a single schema that TypeScript validates at compile time.

| Pros | Cons |
|------|------|
| Zero runtime dependencies | Not a standard ontology format — can't load in Protege |
| Full type safety — TypeScript validates the ontology definition | Must be manually kept in sync with the OWL file (but the OWL file is in a different repo and rarely changes) |
| Visual metadata (icons, colors, ranks) are first-class | |
| Trivially consumable by the graph assembler (it's just TS) | |
| LLM-friendly — can be serialized as JSON for system prompt | |
| Easy to extend — add a property to the type, TS tells you what to update | |
| Supports derived entity definitions (Device from adapter, Broker from bridges, Topic from mappings) | |

**Verdict**: Best fit for our actual constraints. The OWL ontology is the formal reference; our TS definition is the operational translation.

### Option D: JSON Schema

Define entities and relationships as JSON Schema documents.

| Pros | Cons |
|------|------|
| Already used in the project (RJSF, OpenAPI) | JSON Schema describes data shapes, not ontological relationships |
| Validation built in | No native concept of "class A relates to class B via property P" |
| | Would need a custom vocabulary for relationships, visual metadata |

**Verdict**: Wrong tool. JSON Schema validates instances; it doesn't define ontological relationships.

---

## Recommended Format: TypeScript Ontology Definition

### Shape

```typescript
// src/graph/ontology/schema.ts

type EntityRole =
  | "orchestrator"       // Edge Broker, DataHub, Pulse (singletons that own resources)
  | "connector"          // Adapter, Bridge (gateways to external systems)
  | "integrationPoint"   // OT Device, Tag, Topic, TopicFilter (data endpoints)
  | "mapper"             // NorthboundMapper, SouthboundMapper, Combiner, AssetMapper, BridgeSubscription
  | "policy"             // DataPolicy, BehaviorPolicy (owned by DataHub)
  | "resource";          // Schema, Script (used by policies)

type PropertyDef = {
  name: string;
  type: "string" | "number" | "boolean" | "enum" | "object";
  description: string;
  required?: boolean;
  enumValues?: string[];
};

type RelationshipDef = {
  name: string;            // e.g. "manages", "exposes", "sourceTag"
  target: string;          // target entity type key
  cardinality: "1:1" | "1:N" | "N:1" | "N:M";
  description: string;
  inverse?: string;        // inverse relationship name
  edgeStyle?: EdgeStyleKey;
};

type DerivedFrom = {
  sourceEntity: string;    // API entity type to derive from
  extractionRule: string;  // human-readable description
};

type EntityClass = {
  key: string;             // unique identifier (e.g. "adapter", "device")
  label: string;           // human-readable name
  description: string;     // ontological description
  role: EntityRole;
  apiType?: string;        // OpenAPI schema name (e.g. "Adapter", "DomainTag")
  derivedFrom?: DerivedFrom; // for entities not directly from API
  superClass?: string;     // for subclass relationships (e.g. AssetMapper → Combiner)
  identityScope?: string;  // parent entity that scopes identity (e.g. Tag is scoped to Adapter, Topic to Broker)
  properties: PropertyDef[];
  relationships: RelationshipDef[];
  visual: {
    icon: string;          // react-icons identifier
    color: string;         // Chakra color token
    rank: number;          // layout ordering (lower = upstream)
  };
};

type DomainOntology = {
  version: "2.0";
  namespaces: Record<string, string>;  // prefix → URI
  entities: Record<string, EntityClass>;
};
```

### How Each Consumer Uses It

**LLM system prompt**: `JSON.stringify(ontology, null, 2)` — or a markdown renderer that walks the entity definitions and produces a compact text representation (like v1 but auto-generated from the ontology).

**Graph assembler**: Reads `ontology.entities` to know which entities to create, which relationships to wire, and what visual properties to apply. Derived entities use `derivedFrom` to know how to extract them from API data.

**Schema/class view**: Renders each `EntityClass` where `schemaView: true` as a node, and each `relationship` as an edge. This is purely ontological — no API data needed.

---

## Migration Path from V1

1. **Phase 1**: Define the v2 ontology in TypeScript alongside the v1 system. Feature flag controls which one is active.
2. **Phase 2**: New graph assembler reads the ontology definition instead of hard-coding relationships.
3. **Phase 3**: System prompt generation reads the ontology definition instead of the markdown files.
4. **Phase 4**: Once stable, remove v1 code paths.

The v1 markdown files (`server/ontology/*.md`) remain as human documentation even after v2 is live — they serve a different purpose (LLM system prompt text) than the structured ontology definition.
