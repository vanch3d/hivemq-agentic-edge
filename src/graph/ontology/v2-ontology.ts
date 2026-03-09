/**
 * HiveMQ Edge Domain Ontology — Version 2
 *
 * 18 entity types organized by taxonomy role:
 *   Orchestrators (3): Edge Broker, DataHub, Pulse
 *   Connectors (2):    Adapter, Bridge
 *   Integration Points (4): OT Device, Tag, Topic, TopicFilter
 *   Mappers (5):       NorthboundMapper, SouthboundMapper, Combiner, AssetMapper, BridgeSubscription
 *   Policies (2):      DataPolicy, BehaviorPolicy
 *   Resources (2):     Schema, Script
 *
 * See: .tasks/00103-domain-ontology-redux/ENTITY_ANALYSIS.md
 */
import type { DomainOntology, EntityClass } from "./types";

// ─── Orchestrators ──────────────────────────────────────────────────────

const edgeBroker: EntityClass = {
  key: "edgeBroker",
  label: "Edge Broker",
  description:
    "The local HiveMQ Edge MQTT broker. Singleton. Owns locally-published topics and topic filters. The central hub where OT and IT traffic meets.",
  role: "orchestrator",
  derivedFrom: {
    sourceEntity: "system",
    extractionRule: "Always present as a singleton — one per Edge instance.",
  },
  properties: [],
  relationships: [
    {
      name: "owns",
      target: "topic",
      cardinality: "1:N",
      description: "Topics published to the local broker.",
      edgeStyle: "owns",
    },
    {
      name: "owns",
      target: "topicFilter",
      cardinality: "1:N",
      description: "Topic filters registered on the local broker.",
      edgeStyle: "owns",
    },
  ],
  visual: { icon: "LuServer", color: "cyan.600", rank: 3 },
};

const dataHub: EntityClass = {
  key: "dataHub",
  label: "DataHub",
  description:
    "Policy engine singleton. Owns data policies, behavior policies, schemas, and scripts. Validates and transforms OT-to-IT traffic.",
  role: "orchestrator",
  derivedFrom: {
    sourceEntity: "system",
    extractionRule: "Always present as a singleton.",
  },
  properties: [],
  relationships: [
    {
      name: "owns",
      target: "dataPolicy",
      cardinality: "1:N",
      description: "Data policies owned by DataHub.",
      edgeStyle: "owns",
    },
    {
      name: "owns",
      target: "behaviorPolicy",
      cardinality: "1:N",
      description: "Behavior policies owned by DataHub.",
      edgeStyle: "owns",
    },
    {
      name: "owns",
      target: "schema",
      cardinality: "1:N",
      description: "Schemas owned by DataHub.",
      edgeStyle: "owns",
    },
    {
      name: "owns",
      target: "script",
      cardinality: "1:N",
      description: "Scripts owned by DataHub.",
      edgeStyle: "owns",
    },
  ],
  visual: { icon: "LuShieldCheck", color: "purple.600", rank: 3 },
};

const pulse: EntityClass = {
  key: "pulse",
  label: "Pulse",
  description:
    "HiveMQ cloud platform integration singleton. Owns managed assets.",
  role: "orchestrator",
  derivedFrom: {
    sourceEntity: "system",
    extractionRule:
      "Present when Pulse is activated (PulseStatus.activation = ACTIVATED).",
  },
  properties: [
    {
      name: "activation",
      type: "enum",
      description: "Pulse activation status.",
      enumValues: ["ACTIVATED", "DEACTIVATED", "ERROR"],
    },
  ],
  relationships: [],
  visual: { icon: "LuCloud", color: "sky.500", rank: 3 },
};

// ─── Connectors ─────────────────────────────────────────────────────────

const adapter: EntityClass = {
  key: "adapter",
  label: "Adapter",
  description:
    "Protocol adapter connecting to an OT device. Speaks an industrial protocol (Modbus, OPC-UA, S7, etc.). Owns a device and its northbound/southbound mappers.",
  role: "connector",
  apiType: "Adapter",
  properties: [
    {
      name: "id",
      type: "string",
      description: "Unique adapter identifier.",
      required: true,
    },
    {
      name: "type",
      type: "string",
      description: "Protocol type (e.g. opc-ua, modbus).",
    },
    {
      name: "connectionStatus",
      type: "enum",
      description: "Connection state.",
      enumValues: [
        "CONNECTED",
        "DISCONNECTED",
        "STATELESS",
        "UNKNOWN",
        "ERROR",
      ],
    },
    {
      name: "runtimeStatus",
      type: "enum",
      description: "Runtime state.",
      enumValues: ["STARTED", "STOPPED"],
    },
  ],
  relationships: [
    {
      name: "manages",
      target: "otDevice",
      cardinality: "1:1",
      description: "The OT device this adapter connects to.",
      inverse: "managedBy",
      edgeStyle: "manages",
    },
    {
      name: "owns",
      target: "northboundMapper",
      cardinality: "1:N",
      description: "Northbound mappers owned by this adapter.",
      edgeStyle: "owns",
    },
    {
      name: "owns",
      target: "southboundMapper",
      cardinality: "1:N",
      description: "Southbound mappers owned by this adapter.",
      edgeStyle: "owns",
    },
  ],
  visual: { icon: "LuPlug2", color: "blue.500", rank: 1 },
};

const bridge: EntityClass = {
  key: "bridge",
  label: "Bridge",
  description:
    "MQTT bridge connecting the local Edge broker to a remote MQTT broker. Forwards messages in one or both directions via subscriptions.",
  role: "connector",
  apiType: "Bridge",
  properties: [
    {
      name: "id",
      type: "string",
      description: "Unique bridge identifier.",
      required: true,
    },
    { name: "host", type: "string", description: "Remote broker hostname." },
    { name: "port", type: "number", description: "Remote broker port." },
    {
      name: "connectionStatus",
      type: "enum",
      description: "Connection state.",
      enumValues: [
        "CONNECTED",
        "DISCONNECTED",
        "STATELESS",
        "UNKNOWN",
        "ERROR",
      ],
    },
    {
      name: "runtimeStatus",
      type: "enum",
      description: "Runtime state.",
      enumValues: ["STARTED", "STOPPED"],
    },
  ],
  relationships: [
    {
      name: "connectsTo",
      target: "remoteBroker",
      cardinality: "1:1",
      description: "The remote broker this bridge connects to.",
      edgeStyle: "connectsTo",
    },
    {
      name: "owns",
      target: "bridgeSubscription",
      cardinality: "1:N",
      description: "Forwarding rules within this bridge.",
      edgeStyle: "owns",
    },
  ],
  visual: { icon: "LuLink", color: "orange.500", rank: 1 },
};

// ─── Integration Points ─────────────────────────────────────────────────

const otDevice: EntityClass = {
  key: "otDevice",
  label: "OT Device",
  description:
    "Physical or virtual OT device (boiler, PLC, sensor) connected via a protocol adapter. Owns tags. Derived 1:1 from adapter — OT engineers say 'boiler', IT engineers say 'adapter'.",
  role: "integrationPoint",
  derivedFrom: {
    sourceEntity: "adapter",
    extractionRule:
      "One OT Device per Adapter. Identity derived from adapter ID.",
  },
  identityScope: "adapter",
  properties: [],
  relationships: [
    {
      name: "exposes",
      target: "tag",
      cardinality: "1:N",
      description: "Tags (data points) exposed by this device.",
      inverse: "exposedBy",
      edgeStyle: "exposes",
    },
  ],
  visual: { icon: "LuCpu", color: "blue.300", rank: 2 },
};

const tag: EntityClass = {
  key: "tag",
  label: "Tag",
  description:
    "Named data point on an OT device. Protocol-specific identifier (e.g. ns=3;s=Temperature, holding-register-0). Not unique across adapters — identity is (adapter, tagName).",
  role: "integrationPoint",
  apiType: "DomainTag",
  identityScope: "adapter",
  properties: [
    {
      name: "name",
      type: "string",
      description: "Tag name (protocol-specific).",
      required: true,
    },
    {
      name: "description",
      type: "string",
      description: "Human-readable description.",
    },
  ],
  relationships: [],
  visual: { icon: "LuTag", color: "teal.400", rank: 3 },
};

const topic: EntityClass = {
  key: "topic",
  label: "Topic",
  description:
    "Exact MQTT topic string on a broker. No wildcards. Derived from northbound mapper destinations, combiner outputs, and bridge subscription destinations. Not unique — identity is (broker, topicPath).",
  role: "integrationPoint",
  derivedFrom: {
    sourceEntity: "northboundMapper",
    extractionRule:
      "Collect unique topic strings from northbound mapper destinations, combiner destinations, and bridge subscription destinations.",
  },
  identityScope: "edgeBroker",
  properties: [
    {
      name: "topicPath",
      type: "string",
      description: "The exact MQTT topic string.",
      required: true,
    },
  ],
  relationships: [],
  visual: { icon: "LuMessageSquare", color: "green.500", rank: 5 },
};

const topicFilter: EntityClass = {
  key: "topicFilter",
  label: "Topic Filter",
  description:
    "MQTT wildcard pattern matching one or more topics. Uses + (single level) and # (multi-level) wildcards.",
  role: "integrationPoint",
  apiType: "TopicFilter",
  identityScope: "edgeBroker",
  properties: [
    {
      name: "topicFilter",
      type: "string",
      description: "The wildcard pattern (e.g. factory/+/temperature).",
      required: true,
    },
    {
      name: "description",
      type: "string",
      description: "Human-readable description.",
    },
  ],
  relationships: [
    {
      name: "matches",
      target: "topic",
      cardinality: "N:M",
      description:
        "Topics matched by this filter via MQTT wildcard semantics. Computed at runtime, not by OWL reasoning.",
      edgeStyle: "matches",
    },
  ],
  visual: { icon: "LuFilter", color: "green.400", rank: 4 },
};

// ─── Mappers ────────────────────────────────────────────────────────────

const northboundMapper: EntityClass = {
  key: "northboundMapper",
  label: "Northbound Mapper",
  description:
    "Publishes an OT device tag value to an MQTT topic on the broker. Simplest mapper: 1 tag → 1 topic, owned by 1 adapter. The OT→IT data path.",
  role: "mapper",
  apiType: "NorthboundMapping",
  identityScope: "adapter",
  properties: [
    {
      name: "maxQoS",
      type: "enum",
      description: "Maximum MQTT QoS level.",
      enumValues: ["AT_MOST_ONCE", "AT_LEAST_ONCE", "EXACTLY_ONCE"],
    },
    {
      name: "includeTimestamp",
      type: "boolean",
      description: "Include timestamp in payload.",
    },
    {
      name: "includeTagNames",
      type: "boolean",
      description: "Include tag names in payload.",
    },
  ],
  relationships: [
    {
      name: "feeds",
      target: "tag",
      cardinality: "N:1",
      description: "The tag read by this mapper.",
      edgeStyle: "feeds",
    },
    {
      name: "publishes",
      target: "topic",
      cardinality: "N:1",
      description: "The topic published to by this mapper.",
      edgeStyle: "publishes",
    },
  ],
  visual: { icon: "LuArrowUpRight", color: "green.600", rank: 4 },
};

const southboundMapper: EntityClass = {
  key: "southboundMapper",
  label: "Southbound Mapper",
  description:
    "Subscribes to an MQTT topic filter and writes incoming messages to an OT device tag. The IT→OT data path.",
  role: "mapper",
  apiType: "SouthboundMapping",
  identityScope: "adapter",
  properties: [],
  relationships: [
    {
      name: "feeds",
      target: "topicFilter",
      cardinality: "N:1",
      description: "The topic filter this mapper subscribes to.",
      edgeStyle: "feeds",
    },
    {
      name: "writes",
      target: "tag",
      cardinality: "N:1",
      description: "The tag written to by this mapper.",
      edgeStyle: "writes",
    },
  ],
  visual: { icon: "LuArrowDownLeft", color: "green.600", rank: 4 },
};

const combiner: EntityClass = {
  key: "combiner",
  label: "Combiner",
  description:
    "Generalized mapper: N sources (from multiple adapters/bridges) → 1 topic. A flexible NorthboundMapper — when N=1, it's equivalent. Owned by the system, not a single adapter.",
  role: "mapper",
  apiType: "Combiner",
  properties: [
    {
      name: "id",
      type: "string",
      description: "Unique combiner identifier.",
      required: true,
    },
  ],
  relationships: [
    {
      name: "sources",
      target: "adapter",
      cardinality: "N:M",
      description: "Adapters and bridges that contribute data.",
      edgeStyle: "sources",
    },
    {
      name: "publishes",
      target: "topic",
      cardinality: "N:1",
      description: "The output topic where combined data is published.",
      edgeStyle: "publishes",
    },
  ],
  visual: { icon: "LuMerge", color: "yellow.500", rank: 4 },
};

const assetMapper: EntityClass = {
  key: "assetMapper",
  label: "Asset Mapper",
  description:
    "Specialized Combiner where the destination is a Pulse-managed asset. Maps Edge data to cloud asset definitions.",
  role: "mapper",
  apiType: "Combiner",
  superClass: "combiner",
  properties: [
    {
      name: "id",
      type: "string",
      description: "Unique asset mapper identifier.",
      required: true,
    },
  ],
  relationships: [
    {
      name: "sources",
      target: "adapter",
      cardinality: "N:M",
      description: "Adapters and bridges that contribute data.",
      edgeStyle: "sources",
    },
    {
      name: "publishes",
      target: "topic",
      cardinality: "N:1",
      description: "The output topic.",
      edgeStyle: "publishes",
    },
  ],
  visual: { icon: "LuMerge", color: "sky.500", rank: 4 },
};

const bridgeSubscription: EntityClass = {
  key: "bridgeSubscription",
  label: "Bridge Subscription",
  description:
    "Forwarding rule within a bridge. Routes messages between local and remote brokers via a topic filter → topic mapping.",
  role: "mapper",
  apiType: "BridgeSubscription",
  identityScope: "bridge",
  properties: [],
  relationships: [
    {
      name: "filters",
      target: "topicFilter",
      cardinality: "N:1",
      description: "Topic filter selecting messages to forward.",
      edgeStyle: "filters",
    },
    {
      name: "delivers",
      target: "topic",
      cardinality: "N:1",
      description: "Topic on the receiving broker.",
      edgeStyle: "delivers",
    },
  ],
  visual: { icon: "LuArrowLeftRight", color: "orange.400", rank: 4 },
};

// ─── Remote Broker (derived from Bridge) ────────────────────────────────

const remoteBroker: EntityClass = {
  key: "remoteBroker",
  label: "Remote Broker",
  description:
    "A remote MQTT broker reached via a Bridge. Derived 1:1 from Bridge. Owns the remote-side topics and topic filters.",
  role: "orchestrator",
  derivedFrom: {
    sourceEntity: "bridge",
    extractionRule: "One Remote Broker per Bridge connection.",
  },
  properties: [
    { name: "host", type: "string", description: "Remote broker hostname." },
    { name: "port", type: "number", description: "Remote broker port." },
  ],
  relationships: [
    {
      name: "owns",
      target: "topic",
      cardinality: "1:N",
      description: "Topics on the remote broker.",
      edgeStyle: "owns",
    },
    {
      name: "owns",
      target: "topicFilter",
      cardinality: "1:N",
      description: "Topic filters on the remote broker.",
      edgeStyle: "owns",
    },
  ],
  visual: { icon: "LuServer", color: "orange.300", rank: 6 },
};

// ─── Policies ───────────────────────────────────────────────────────────

const dataPolicy: EntityClass = {
  key: "dataPolicy",
  label: "Data Policy",
  description:
    "Validates message payloads on a topic filter. Can redirect messages to new topics via Delivery.redirectTo (the only DataHub feedback path). Owned by DataHub.",
  role: "policy",
  apiType: "DataPolicy",
  properties: [
    {
      name: "id",
      type: "string",
      description: "Unique policy identifier.",
      required: true,
    },
  ],
  relationships: [
    {
      name: "attachedTo",
      target: "topicFilter",
      cardinality: "N:1",
      description: "Topic filter that triggers this policy.",
      edgeStyle: "validates",
    },
    {
      name: "validatesWith",
      target: "validator",
      cardinality: "1:N",
      description: "Validation steps with strategy and schema references.",
      edgeStyle: "validatesWith",
    },
    {
      name: "chains",
      target: "pipelineOperation",
      cardinality: "1:N",
      description:
        "Pipeline operations in onSuccess/onFailure (sequential chain).",
      edgeStyle: "chains",
    },
  ],
  visual: { icon: "LuShield", color: "purple.500", rank: 5 },
};

const behaviorPolicy: EntityClass = {
  key: "behaviorPolicy",
  label: "Behavior Policy",
  description:
    "Monitors MQTT client behavior via FSM state transitions. Matches clients by clientIdRegex. Cannot create new topics (no Delivery.redirectTo). Owned by DataHub.",
  role: "policy",
  apiType: "BehaviorPolicy",
  properties: [
    {
      name: "id",
      type: "string",
      description: "Unique policy identifier.",
      required: true,
    },
    {
      name: "clientIdRegex",
      type: "string",
      description:
        "Regex pattern matching MQTT client IDs (IT device identifier).",
    },
    {
      name: "behaviorId",
      type: "enum",
      description: "FSM behavior model reference.",
      enumValues: ["Mqtt.events", "Publish.duplicate", "Publish.quota"],
    },
  ],
  relationships: [
    {
      name: "deserializes",
      target: "schema",
      cardinality: "N:M",
      description: "Schemas for publish/will payload deserialization.",
      edgeStyle: "deserializes",
    },
    {
      name: "transitionsVia",
      target: "fsmTransition",
      cardinality: "1:N",
      description: "FSM state transitions with event-triggered pipelines.",
      edgeStyle: "transitionsVia",
    },
  ],
  visual: { icon: "LuShield", color: "purple.500", rank: 5 },
};

// ─── Policy Internals ───────────────────────────────────────────────────

const validator: EntityClass = {
  key: "validator",
  label: "Validator",
  description:
    "A validation step within a data policy. References one or more schemas with a strategy (ALL_OF or ANY_OF). Derived from DataPolicy.validation.validators[].",
  role: "resource",
  derivedFrom: {
    sourceEntity: "dataPolicy",
    extractionRule:
      "One Validator per entry in DataPolicy.validation.validators[]. Identity is (policyId, validatorIndex).",
  },
  identityScope: "dataPolicy",
  properties: [
    {
      name: "strategy",
      type: "enum",
      description: "Validation strategy.",
      enumValues: ["ALL_OF", "ANY_OF"],
    },
  ],
  relationships: [
    {
      name: "validates",
      target: "schema",
      cardinality: "N:M",
      description: "Schemas used for payload validation.",
      edgeStyle: "validates",
    },
  ],
  visual: { icon: "LuCheck", color: "purple.300", rank: 6 },
};

const fsmTransition: EntityClass = {
  key: "fsmTransition",
  label: "FSM Transition",
  description:
    "A state transition within a behavior policy FSM. Represents a fromState → toState pair with event-triggered pipelines. Derived from BehaviorPolicy.onTransitions[].",
  role: "resource",
  derivedFrom: {
    sourceEntity: "behaviorPolicy",
    extractionRule:
      "One FsmTransition per entry in BehaviorPolicy.onTransitions[]. Identity is (policyId, fromState, toState).",
  },
  identityScope: "behaviorPolicy",
  properties: [
    {
      name: "fromState",
      type: "string",
      description: "Source FSM state.",
      required: true,
    },
    {
      name: "toState",
      type: "string",
      description: "Target FSM state.",
      required: true,
    },
  ],
  relationships: [
    {
      name: "chains",
      target: "pipelineOperation",
      cardinality: "1:N",
      description:
        "Pipeline operations executed on this transition (sequential chain).",
      edgeStyle: "chains",
    },
  ],
  visual: { icon: "LuGitBranch", color: "purple.400", rank: 6 },
};

const pipelineOperation: EntityClass = {
  key: "pipelineOperation",
  label: "Pipeline Operation",
  description:
    "A single step in a policy pipeline. References a built-in function or user script, with arguments that may reference schemas or topics. Derived from PolicyOperation entries in policy pipelines.",
  role: "resource",
  derivedFrom: {
    sourceEntity: "dataPolicy",
    extractionRule:
      "One PipelineOperation per PolicyOperation in onSuccess/onFailure pipelines (data policies) or onTransitions event pipelines (behavior policies).",
  },
  properties: [
    {
      name: "functionId",
      type: "string",
      description: "Built-in function ID or fn:<scriptId>.",
      required: true,
    },
    {
      name: "pipelinePhase",
      type: "enum",
      description: "Which pipeline this operation belongs to.",
      enumValues: ["onSuccess", "onFailure", "onEvent"],
    },
    {
      name: "order",
      type: "number",
      description: "Position in the pipeline (0-based).",
    },
    {
      name: "isBuiltIn",
      type: "boolean",
      description:
        "True if functionId is a built-in function (not a user script).",
    },
    {
      name: "isTerminal",
      type: "boolean",
      description: "True if this operation terminates the pipeline.",
    },
  ],
  relationships: [
    {
      name: "invokes",
      target: "script",
      cardinality: "N:1",
      description:
        "User script invoked by this operation (when functionId = fn:<scriptId>).",
      edgeStyle: "invokes",
    },
    {
      name: "serializes",
      target: "schema",
      cardinality: "N:M",
      description:
        "Schema referenced by this operation (Serdes.deserialize/serialize).",
      edgeStyle: "serializes",
    },
    {
      name: "redirectsTo",
      target: "topic",
      cardinality: "0..N",
      description: "Topic redirected to by Delivery.redirectTo.",
      edgeStyle: "redirectsTo",
    },
  ],
  visual: { icon: "LuPlay", color: "purple.300", rank: 6 },
};

// ─── Resources ──────────────────────────────────────────────────────────

const policySchema: EntityClass = {
  key: "schema",
  label: "Schema",
  description:
    "Payload structure definition (JSON Schema or Protobuf). Used by policies for validation and deserialization.",
  role: "resource",
  apiType: "PolicySchema",
  properties: [
    {
      name: "id",
      type: "string",
      description: "Unique schema identifier.",
      required: true,
    },
    {
      name: "type",
      type: "enum",
      description: "Schema format.",
      enumValues: ["JSON", "PROTOBUF"],
    },
    {
      name: "version",
      type: "number",
      description: "Auto-incremented version.",
    },
  ],
  relationships: [],
  visual: { icon: "LuFileText", color: "purple.300", rank: 6 },
};

const script: EntityClass = {
  key: "script",
  label: "Script",
  description:
    "Custom transformation logic (ECMAScript 2024). Used by policy pipelines.",
  role: "resource",
  apiType: "Script",
  properties: [
    {
      name: "id",
      type: "string",
      description: "Unique script identifier.",
      required: true,
    },
    {
      name: "version",
      type: "number",
      description: "Auto-incremented version.",
    },
  ],
  relationships: [],
  visual: { icon: "LuFileCode2", color: "purple.300", rank: 6 },
};

// ─── Assemble ───────────────────────────────────────────────────────────

export const v2Ontology: DomainOntology = {
  version: "2.0",
  entities: {
    // Orchestrators
    edgeBroker,
    dataHub,
    pulse,
    remoteBroker,
    // Connectors
    adapter,
    bridge,
    // Integration Points
    otDevice,
    tag,
    topic,
    topicFilter,
    // Mappers
    northboundMapper,
    southboundMapper,
    combiner,
    assetMapper,
    bridgeSubscription,
    // Policies
    dataPolicy,
    behaviorPolicy,
    // Policy internals
    validator,
    fsmTransition,
    pipelineOperation,
    // Resources
    schema: policySchema,
    script,
  },
};
