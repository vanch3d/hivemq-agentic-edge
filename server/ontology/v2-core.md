## Domain Ontology v2.0

## Orchestrators

### Edge Broker (`edgeBroker`) — derived from system
The local HiveMQ Edge MQTT broker. Singleton. Owns locally-published topics and topic filters. The central hub where OT and IT traffic meets.
Relationships: ownsTopic → `topic` [1:N]; ownsFilter → `topicFilter` [1:N]

### DataHub (`dataHub`) — derived from system
Policy engine singleton. Owns data policies, behavior policies, schemas, and scripts. Validates and transforms OT-to-IT traffic.
Relationships: ownsPolicy → `dataPolicy` [1:N]; ownsBehaviorPolicy → `behaviorPolicy` [1:N]; ownsSchema → `schema` [1:N]; ownsScript → `script` [1:N]

### Pulse (`pulse`) — derived from system
HiveMQ cloud platform integration singleton. Owns managed assets.
Properties: `activation` (enum): ACTIVATED | DEACTIVATED | ERROR

### Remote Broker (`remoteBroker`) — derived from bridge
A remote MQTT broker reached via a Bridge. Derived 1:1 from Bridge. Owns the remote-side topics and topic filters.
Properties: `host` (string), `port` (number)
Relationships: ownsTopic → `topic` [1:N]; ownsFilter → `topicFilter` [1:N]

## Connectors

### Adapter (`adapter`) — API: Adapter
Protocol adapter connecting to an OT device. Speaks an industrial protocol (Modbus, OPC-UA, S7, etc.). Owns a device and its northbound/southbound mappers.
Properties: `id` (string), `type` (string), `connectionStatus` (enum): CONNECTED | DISCONNECTED | STATELESS | UNKNOWN | ERROR, `runtimeStatus` (enum): STARTED | STOPPED
Relationships: manages → `otDevice` [1:1]; hasNorthboundMapper → `northboundMapper` [1:N]; hasSouthboundMapper → `southboundMapper` [1:N]

### Bridge (`bridge`) — API: Bridge
MQTT bridge connecting the local Edge broker to a remote MQTT broker. Forwards messages in one or both directions via subscriptions.
Properties: `id` (string), `host` (string), `port` (number), `connectionStatus` (enum): CONNECTED | DISCONNECTED | STATELESS | UNKNOWN | ERROR, `runtimeStatus` (enum): STARTED | STOPPED
Relationships: connectsTo → `remoteBroker` [1:1]; hasSubscription → `bridgeSubscription` [1:N]

## Integration Points

### OT Device (`otDevice`) — derived from adapter
Physical or virtual OT device (boiler, PLC, sensor) connected via a protocol adapter. Owns tags. Derived 1:1 from adapter — OT engineers say 'boiler', IT engineers say 'adapter'.
Identity: scoped by `adapter`.
Relationships: exposes → `tag` [1:N]

### Tag (`tag`) — API: DomainTag
Named data point on an OT device. Protocol-specific identifier (e.g. ns=3;s=Temperature, holding-register-0). Not unique across adapters — identity is (adapter, tagName).
Identity: scoped by `adapter`.
Properties: `name` (string), `description` (string)

### Topic (`topic`) — derived from northboundMapper
Exact MQTT topic string on a broker. No wildcards. Derived from northbound mapper destinations, combiner outputs, and bridge subscription destinations. Not unique — identity is (broker, topicPath).
Identity: scoped by `edgeBroker`.
Properties: `topicPath` (string)

### Topic Filter (`topicFilter`) — API: TopicFilter
MQTT wildcard pattern matching one or more topics. Uses + (single level) and # (multi-level) wildcards.
Identity: scoped by `edgeBroker`.
Properties: `topicFilter` (string), `description` (string)
Relationships: matches → `topic` [N:M]

## Mappers

### Northbound Mapper (`northboundMapper`) — API: NorthboundMapping
Publishes an OT device tag value to an MQTT topic on the broker. Simplest mapper: 1 tag → 1 topic, owned by 1 adapter. The OT→IT data path.
Identity: scoped by `adapter`.
Properties: `maxQoS` (enum): AT_MOST_ONCE | AT_LEAST_ONCE | EXACTLY_ONCE, `includeTimestamp` (boolean), `includeTagNames` (boolean)
Relationships: sourceTag → `tag` [N:1]; destinationTopic → `topic` [N:1]

### Southbound Mapper (`southboundMapper`) — API: SouthboundMapping
Subscribes to an MQTT topic filter and writes incoming messages to an OT device tag. The IT→OT data path.
Identity: scoped by `adapter`.
Relationships: sourceFilter → `topicFilter` [N:1]; destinationTag → `tag` [N:1]

### Combiner (`combiner`) — API: Combiner
Generalized mapper: N sources (from multiple adapters/bridges) → 1 topic. A flexible NorthboundMapper — when N=1, it's equivalent. Owned by the system, not a single adapter.
Properties: `id` (string)
Relationships: sourceEntities → `adapter` [N:M]; destinationTopic → `topic` [N:1]

### Asset Mapper (`assetMapper`) — API: Combiner
Specialized Combiner where the destination is a Pulse-managed asset. Maps Edge data to cloud asset definitions.
Properties: `id` (string)
Relationships: sourceEntities → `adapter` [N:M]; destinationTopic → `topic` [N:1]

### Bridge Subscription (`bridgeSubscription`) — API: BridgeSubscription
Forwarding rule within a bridge. Routes messages between local and remote brokers via a topic filter → topic mapping.
Identity: scoped by `bridge`.
Relationships: subscriptionFilter → `topicFilter` [N:1]; subscriptionDestination → `topic` [N:1]

## Policies

### Data Policy (`dataPolicy`) — API: DataPolicy
Validates message payloads on a topic filter. Can redirect messages to new topics via Delivery.redirectTo (the only DataHub feedback path). Owned by DataHub.
Properties: `id` (string)
Relationships: attachedTo → `topicFilter` [N:1]; validates → `schema` [N:M]; executes → `script` [N:M]; redirectsTo → `topic` [0..N]

### Behavior Policy (`behaviorPolicy`) — API: BehaviorPolicy
Monitors MQTT client behavior via FSM state transitions. Matches clients by clientIdRegex. Cannot create new topics (no Delivery.redirectTo). Owned by DataHub.
Properties: `id` (string), `clientIdRegex` (string)
Relationships: deserializes → `schema` [N:M]; executes → `script` [N:M]

## Resources

### Schema (`schema`) — API: PolicySchema
Payload structure definition (JSON Schema or Protobuf). Used by policies for validation and deserialization.
Properties: `id` (string), `type` (enum): JSON | PROTOBUF, `version` (number)

### Script (`script`) — API: Script
Custom transformation logic (ECMAScript 2024). Used by policy pipelines.
Properties: `id` (string), `version` (number)

## Data Flow

OT Device → Tag → NorthboundMapper → Topic → Edge Broker → Bridge → Remote Broker
Remote Broker → BridgeSubscription → TopicFilter → SouthboundMapper → Tag → OT Device
Topic → DataPolicy → Schema/Script (validation & transformation)
Combiner: N adapters/bridges → 1 Topic
DataPolicy.Delivery.redirectTo → new Topic (only DataHub feedback path, must stay DAG)

## Key Concepts

- **Northbound** = OT→IT (device tag → MQTT topic). **Southbound** = IT→OT (topic filter → device tag).
- **Edge Broker** is the local MQTT broker (singleton). Owns locally-published topics and topic filters.
- **Remote Broker** is reached via a Bridge (1 per bridge). Owns remote-side topics.
- **OT Device** is derived 1:1 from Adapter. Same thing, different vocabulary (boiler vs adapter).
- **Topic** is an exact MQTT string (no wildcards). **TopicFilter** may contain + and # wildcards.
- **Tag** identity = (adapter, tagName). **Topic** identity = (broker, topicPath). Not globally unique.
- **Combiner** is a generalized NorthboundMapper (N sources → 1 topic). **AssetMapper** is a Combiner targeting a Pulse asset.
- **BehaviorPolicy** monitors MQTT clients by clientIdRegex. Cannot create new topics.