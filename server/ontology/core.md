## System Overview

HiveMQ Edge is an IoT gateway bridging industrial protocols (OPC-UA, Modbus, S7, etc.) to MQTT.
It sits between field devices (PLCs, sensors) and an MQTT broker, translating protocol-specific
data into MQTT messages. It integrates with HiveMQ's cloud platform ("Pulse") and provides a
"Data Hub" for policy-based message validation and transformation.

## Entity Catalog

| Entity            | What it is                                               | Key properties                                                                       | Owned by        |
| ----------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------- |
| ProtocolAdapter   | Plugin implementation for a protocol (e.g. "opc-ua")     | id, name, configSchema, uiSchema, capabilities (READ/WRITE/DISCOVER/COMBINE)         | System          |
| Adapter           | Configured connection to a specific device               | id, type (→ProtocolAdapter), config (JsonNode matching type's configSchema)          | ProtocolAdapter |
| DomainTag         | Named data point on a device (e.g. "ns=3;s=Temperature") | name, definition (JsonNode matching type's tag schema)                               | Adapter         |
| NorthboundMapping | Tag → MQTT topic (device-to-cloud)                       | tag reference, topic, maxQoS, includeTimestamp, userProperties                       | Adapter         |
| SouthboundMapping | MQTT topic → tag (cloud-to-device)                       | topicFilter, tag reference, fieldMapping                                             | Adapter         |
| Bridge            | MQTT-to-MQTT connection to another broker                | id, host, port, clientId, TLS, localSubscriptions, remoteSubscriptions               | System          |
| TopicFilter       | Named MQTT topic filter pattern                          | description, topicFilter, schema (optional, data-url encoded)                        | System          |
| Combiner          | Merges data from multiple sources into one output        | id, sources (EntityReferenceList), mappings (DataCombiningList)                      | System          |
| DataCombining     | Single mapping within a Combiner                         | source, additionalSources, destination (topic + schema + assetId), instructions      | Combiner        |
| Event             | System event log entry                                   | identifier (TypeIdentifier), severity (INFO/WARN/ERROR/CRITICAL), message, timestamp | System          |
| BehaviorPolicy    | Validates MQTT client behavior via FSM                   | id, matching (clientIdRegex), behavior (FSM ref), deserialization, onTransitions     | Data Hub        |
| DataPolicy        | Validates message payloads against schemas               | id, matching (topicFilter), validation, onSuccess/onFailure pipelines                | Data Hub        |
| PolicySchema      | Data structure definition (JSON Schema or Protobuf)      | id, type, version (auto-incremented), schemaDefinition                               | Data Hub        |
| Script            | Custom transformation logic                              | id, functionType (TRANSFORMATION), version, source                                   | Data Hub        |
| ManagedAsset      | Cloud-defined asset from Pulse                           | id, name, topic, schema, mapping status                                              | Pulse           |

## Relationship Graph

```
ProtocolAdapter 1──* Adapter 1──* DomainTag
                                  DomainTag *──* NorthboundMapping ──> MQTT Topic
                                  DomainTag *──* SouthboundMapping <── MQTT TopicFilter
TopicFilter *──* Bridge (via local/remote subscriptions)
TopicFilter *──* DataPolicy (via matching.topicFilter)
DataPolicy *──* PolicySchema (via validators)
DataPolicy *──* Script (via onSuccess/onFailure pipelines)
BehaviorPolicy *──* PolicySchema (via deserialization)
BehaviorPolicy *──* Script (via onTransitions pipelines)
Combiner *──* Adapter|Bridge (via sources)
DataCombining *──1 Combiner (via mappings)
ManagedAsset *──1 DataCombining (via mapping)
```

## Data Flow (End-to-End)

```
Device (PLC/sensor)
  → Protocol Adapter (polls/subscribes via industrial protocol)
    → DomainTag (raw data point)
      → NorthboundMapping (transforms + publishes)
        → MQTT Topic (on local broker)
          → DataPolicy (validates payload against schemas)
            → onSuccess: transform, log, redirect, serialize
            → onFailure: log, drop, disconnect
          → Bridge (forwards to remote broker)
            → Remote MQTT Broker / Cloud
```

Reverse (cloud-to-device): Remote Broker → Bridge → MQTT Topic → SouthboundMapping → DomainTag → Device

## Status Model

Shared by Adapters and Bridges:

- **connection**: CONNECTED | DISCONNECTED | STATELESS | UNKNOWN | ERROR
- **runtime**: STARTED | STOPPED
- **Commands**: START | STOP | RESTART → StatusTransitionResult (PENDING | COMPLETE)

Side effects:

- Starting an adapter begins polling/subscribing to device data points
- Stopping an adapter halts all data flow from that device
- Deleting an adapter removes all its tags, northbound/southbound mappings
- Deleting a bridge removes all its subscriptions and stops forwarding

## Authentication

JWT-based. Public endpoints (no token): auth, health, frontend, root.
All other endpoints require `Authorization: Bearer <token>`.
Token lifecycle: login → use → refresh (before expiry) → validate (optional).

## Collection Patterns

- **Simple lists**: `{ items: T[] }` — no pagination. Most Edge resources.
- **Paginated lists** (Data Hub only): `{ items: T[], _links?: { next } }` — cursor-based.
  Query params: limit (10-500, default 50), cursor (opaque token), fields (sparse fieldset).

## Error Model

RFC 7807 Problem Details. Three layers:

1. **ProblemDetails** — base: title, type (URI), status, detail, code
2. **ApiProblemDetails** — discriminator on `type` with 38 concrete error types
3. **Concrete errors** — domain-specific (e.g. BridgeNotFound, PolicyAlreadyPresent)

Validation errors: composite `*InvalidErrors` with `childErrors` array of typed subtypes
(MissingField, InvalidFieldValue, EmptyField, etc.)

## Key Enums

| Enum                  | Values                                                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Connection status     | CONNECTED, DISCONNECTED, STATELESS, UNKNOWN, ERROR                                                                                 |
| Runtime status        | STARTED, STOPPED                                                                                                                   |
| Status command        | START, STOP, RESTART                                                                                                               |
| Event severity        | INFO, WARN, ERROR, CRITICAL                                                                                                        |
| Entity type           | BRIDGE, ADAPTER, ADAPTER_TYPE, EVENT, USER, DATA_COMBINING, COMBINER, EDGE                                                         |
| QoS                   | AT_MOST_ONCE (0), AT_LEAST_ONCE (1), EXACTLY_ONCE (2)                                                                              |
| Adapter capability    | READ, DISCOVER, WRITE, COMBINE                                                                                                     |
| Data identifier type  | TAG, TOPIC_FILTER, PULSE_ASSET                                                                                                     |
| Entity reference type | ADAPTER, DEVICE, BRIDGE, EDGE_BROKER, PULSE_AGENT                                                                                  |
| Notification level    | NOTICE, WARNING, ERROR                                                                                                             |
| Pulse activation      | ACTIVATED, DEACTIVATED, ERROR                                                                                                      |
| Asset mapping status  | UNMAPPED, DRAFT, STREAMING, REQUIRES_REMAPPING, MISSING                                                                            |
| Capability ID         | config-writeable, bi-directional protocol adapters, control-plane-connectivity, data-hub, mqtt-persistence, pulse-asset-management |
