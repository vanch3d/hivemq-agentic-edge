/**
 * Relationship registry — single source of truth for all edge relationship keys.
 *
 * Naming conventions (OWL / Schema.org / Neo4j):
 *   - Active-voice verb phrases: manages, exposes, validates
 *   - Short verbs over compound nouns: owns (not ownsPolicy)
 *   - No entity type in the name — endpoints define types
 *   - lowerCamelCase for multi-word: connectsTo, attachedTo
 */

/** Canonical relationship keys used in edge data and EDGE_STYLES lookup. */
export const REL = {
  /** Adapter → OT Device */
  manages: "manages",
  /** OT Device → Tag */
  exposes: "exposes",
  /** Structural ownership (EdgeBroker→Topic, DataHub→Policy, Adapter→Mapper, etc.) */
  owns: "owns",
  /** Bridge → Remote Broker */
  connectsTo: "connectsTo",
  /** Tag → Mapper, TopicFilter → Mapper (data input) */
  feeds: "feeds",
  /** Mapper → Topic, Combiner → Topic (data output) */
  publishes: "publishes",
  /** SB Mapper → Tag (southbound write) */
  writes: "writes",
  /** BridgeSubscription → TopicFilter */
  filters: "filters",
  /** BridgeSubscription → Topic */
  delivers: "delivers",
  /** Adapter/Bridge → Combiner (source contribution) */
  sources: "sources",
  /** DataPolicy → TopicFilter (policy attachment) */
  attachedTo: "attachedTo",
  /** Validator → Schema (payload validation) */
  validates: "validates",
  /** Policy → Script (pipeline execution — legacy flat edge, kept for backward compat) */
  executes: "executes",
  /** DataPolicy → Topic (Delivery.redirectTo — legacy flat edge) */
  redirects: "redirects",
  /** BehaviorPolicy → Schema (deserialization) */
  deserializes: "deserializes",
  /** TopicFilter → Topic (MQTT wildcard match) */
  matches: "matches",
  // --- Policy internals ---
  /** DataPolicy → Validator (policy validates with this validator) */
  validatesWith: "validatesWith",
  /** BehaviorPolicy → FsmTransition (policy transitions via this state change) */
  transitionsVia: "transitionsVia",
  /** Policy/FsmTransition → first PipelineOperation; PipelineOperation → next PipelineOperation (sequential chain) */
  chains: "chains",
  /** PipelineOperation → Script (user-defined transformation) */
  invokes: "invokes",
  /** PipelineOperation → Schema (Serdes.deserialize/serialize) */
  serializes: "serializes",
  /** PipelineOperation → Topic (Delivery.redirectTo) */
  redirectsTo: "redirectsTo",
} as const;

export type RelationshipKey = (typeof REL)[keyof typeof REL];
