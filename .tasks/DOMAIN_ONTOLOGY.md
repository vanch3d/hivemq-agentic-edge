# HiveMQ Edge — Domain Ontology

> Agent-ready reference document. This summarizes the domain model of the HiveMQ Edge REST API so that agents and humans can understand the system without reading the 8400-line OpenAPI spec.

---

## What is HiveMQ Edge?

HiveMQ Edge is an **IoT gateway** that bridges industrial protocols (OPC-UA, Modbus, S7, etc.) to MQTT. It sits between field devices (PLCs, sensors) and an MQTT broker, translating protocol-specific data into MQTT messages. It also integrates with HiveMQ's cloud platform ("Pulse") and provides a "Data Hub" for policy-based message validation and transformation.

---

## Domain Map

```
HiveMQ Edge
├── Authentication        — JWT-based auth (login, refresh, validate)
├── Gateway               — Core gateway config and listeners
├── Health                 — Liveness and readiness probes
├── Frontend               — UI capabilities, configuration, notifications
├── Protocol Adapters      — Connect to industrial protocols (OPC-UA, Modbus, etc.)
│   ├── Adapter Types      — Available protocol adapter implementations
│   ├── Adapter Instances  — Configured adapter connections
│   ├── Domain Tags        — Named data points on a device (e.g. "temperature")
│   ├── Northbound Mappings — Tag → MQTT topic (device-to-cloud)
│   ├── Southbound Mappings — MQTT topic → Tag (cloud-to-device)
│   └── Tag Schemas        — JSON Schema per tag per protocol
├── Bridges                — MQTT-to-MQTT bridge connections
├── Topic Filters          — Named MQTT topic filter patterns
├── Combiners              — Combine data from multiple sources into one output
├── Events                  — System event log
├── Metrics                 — System performance metrics
├── Payload Sampling        — Capture sample payloads for schema inference
├── UNS (Unified Namespace) — ISA-95 hierarchy configuration
├── Pulse                   — Cloud platform integration
│   ├── Activation          — Token-based activation
│   ├── Managed Assets      — Cloud-defined asset schemas
│   └── Asset Mappers       — Map Edge data to cloud assets (reuses Combiner model)
└── Data Hub                — Policy engine for message validation/transformation
    ├── Behavior Policies   — Validate MQTT client behavior (connect, publish, subscribe)
    ├── Data Policies       — Validate message payloads against schemas
    ├── Schemas             — JSON Schema / Protobuf definitions
    ├── Scripts             — Custom transformation logic
    ├── FSMs                — Finite state machines for behavior models
    ├── Functions           — Available pipeline functions
    └── Interpolation       — Template variable definitions
```

---

## Core Concepts

### Protocol Adapter

A protocol adapter connects HiveMQ Edge to a non-MQTT industrial protocol. Each adapter has:

- **Type** (`ProtocolAdapter`) — A plugin implementation (e.g. "opc-ua", "modbus"). Defines `configSchema` (JSON Schema) and `uiSchema` for the UI. Has `capabilities`: `READ`, `WRITE`, `DISCOVER`, `COMBINE`.
- **Instance** (`Adapter`) — A configured connection to a specific device, created from a type. Has an `id`, `type` reference, `config` (freeform JSON matching the type's configSchema), and a runtime `Status`.
- **Domain Tags** (`DomainTag`) — Named data points exposed by the adapter (e.g. `ns=3;s=Temperature`). Each tag has a `name` and a `definition` (freeform JSON matching the type's tag schema).

### Data Flow: Northbound and Southbound

- **Northbound** (device → cloud): A `NorthboundMapping` reads from a `DomainTag` and publishes to an MQTT `topic` with configurable QoS, timestamps, and user properties.
- **Southbound** (cloud → device): A `SouthboundMapping` subscribes to an MQTT `topicFilter` and writes to a `DomainTag`, optionally applying a `FieldMapping` to transform the payload.

### Bridge

An MQTT bridge (`Bridge`) connects HiveMQ Edge to another MQTT broker. It has:

- Connection settings: `host`, `port`, `clientId`, TLS, WebSocket
- **Local subscriptions** (`LocalBridgeSubscription`): Topics on the local broker forwarded to the remote broker
- **Remote subscriptions** (`BridgeSubscription`): Topics on the remote broker forwarded to the local broker
- Runtime `Status` with `connection` state and `runtime` state
- Status transitions via `StatusTransitionCommand` (`START`/`STOP`/`RESTART`)

### Status Model

Both adapters and bridges share a `Status` schema with:

- `connection`: `CONNECTED` | `DISCONNECTED` | `STATELESS` | `UNKNOWN` | `ERROR`
- `runtime`: `STARTED` | `STOPPED`
- `StatusTransitionCommand`: `START` | `STOP` | `RESTART`
- `StatusTransitionResult`: async result with `PENDING` | `COMPLETE`

### Combiner

A `Combiner` merges data from multiple sources into a single output. It has:

- `sources` — an `EntityReferenceList` (entities of type `ADAPTER`, `DEVICE`, `BRIDGE`, `EDGE_BROKER`, `PULSE_AGENT`)
- `mappings` — a `DataCombiningList`, where each `DataCombining` defines:
  - A primary `source` (a `DataIdentifierReference` of type `TAG`, `TOPIC_FILTER`, or `PULSE_ASSET`)
  - Additional source tags and topic filters
  - A `destination` with `topic`, `schema`, and optional `assetId`
  - `instructions` — field-level mapping rules (`source` field → `destination` field)

### Topic Filter

A `TopicFilter` is a named MQTT topic filter pattern (e.g. `devices/+/temperature`). It can have an associated `schema` (data-url encoded) describing the expected payload format.

### Event

The event system (`Event`) provides a system log. Each event has:

- `identifier` — a `TypeIdentifier` with `type` enum: `BRIDGE`, `ADAPTER`, `ADAPTER_TYPE`, `EVENT`, `USER`, `DATA_COMBINING`, `COMBINER`, `EDGE`
- `severity`: `INFO` | `WARN` | `ERROR` | `CRITICAL`
- `message`, `created` (ISO datetime), `timestamp` (epoch ms)
- Optional `source`, `associatedObject` (both `TypeIdentifier`), and `payload` (with `contentType`: `JSON`, `PLAIN_TEXT`, `XML`, `CSV`)

### UNS (Unified Namespace)

ISA-95 hierarchy configuration (`ISA95ApiBean`). Defines the levels: `enterprise` > `site` > `area` > `productionLine` > `workCell`. When `enabled`, can `prefixAllTopics` with the ISA-95 path.

---

## Data Hub

The Data Hub is HiveMQ's policy engine, operating at a higher level of abstraction than Edge-specific resources.

### Behavior Policies

A `BehaviorPolicy` validates MQTT client behavior. It has:

- `matching` — `clientIdRegex` pattern to match clients
- `behavior` — references an FSM (e.g. `Mqtt.events`) with arguments
- `deserialization` — optional schema references for publish/will payloads
- `onTransitions` — actions triggered when clients transition between FSM states

Transitions reference events: `Event.OnAny`, `Connection.OnDisconnect`, `Mqtt.OnInboundConnect`, `Mqtt.OnInboundDisconnect`, `Mqtt.OnInboundPublish`, `Mqtt.OnInboundSubscribe`.

Each transition can trigger a `pipeline` of `PolicyOperation`s (function calls like `System.log`).

### Data Policies

A `DataPolicy` validates message payloads. It has:

- `matching` — `topicFilter` pattern
- `validation` — list of validators (currently only `type: SCHEMA`)
- `onSuccess` / `onFailure` — pipelines of `PolicyOperation`s

### Schemas

A `PolicySchema` defines expected data structure. Supports `JSON Schema` and `Protobuf`. Has versioning (auto-incremented `version`, `createdAt`).

### Scripts

A `Script` contains custom transformation logic (currently only `functionType: TRANSFORMATION`). Has versioning.

### Functions

Pipeline functions available for use in policy operations. Each `FunctionSpecs` has:

- `functionId` (e.g. `System.log`, `Serdes.deserialize`)
- `metadata` — `isTerminal`, `isDataOnly`, `hasArguments`, `supportedEvents`
- `schema` / `uiSchema` — JSON Schema for the function's arguments

### Interpolation Variables

Template variables usable in policy operations. Each has a `variable` name, `type` (`string`/`long`), `description`, and applicable `policyType` (`DATA_POLICY`/`BEHAVIOR_POLICY`).

---

## Pulse (Cloud Platform)

Pulse connects HiveMQ Edge to the HiveMQ cloud platform.

- **Activation** — Token-based (`PulseActivationToken`, JWT format)
- **Status** — `activation` (`ACTIVATED`/`DEACTIVATED`/`ERROR`) + `runtime` (`CONNECTED`/`DISCONNECTED`/`ERROR`)
- **Managed Assets** — Cloud-defined assets (`ManagedAsset` extends `Asset`) with `id`, `name`, `topic`, `schema`, and a `mapping` status (`UNMAPPED`/`DRAFT`/`STREAMING`/`REQUIRES_REMAPPING`/`MISSING`)
- **Asset Mappers** — Reuses the `Combiner` model to map Edge data to cloud assets. Same endpoints/schemas as Combiners with a different URL prefix.

---

## Frontend & Gateway

### Frontend

Public endpoints providing UI metadata:

- **Capabilities** (`CapabilityList`) — Feature flags: `config-writeable`, `bi-directional protocol adapters`, `control-plane-connectivity`, `data-hub`, `mqtt-persistence`, `pulse-asset-management`
- **Configuration** (`GatewayConfiguration`) — Rich config including extensions, modules, links, environment properties, first-use information, pre-login notice
- **Notifications** (`NotificationList`) — System notices at levels `NOTICE`/`WARNING`/`ERROR`

### Gateway

- **Configuration** — Returns raw XML gateway configuration
- **Listeners** (`ListenerList`) — Configured network listeners with `hostName`, `port`, `protocol`, `transport` (TCP/UDP/QUIC/etc.)

### Health

- **Liveness** / **Readiness** — Standard health check probes returning `HealthStatus`

---

## Authentication

JWT-based authentication with three operations:

| Operation | Endpoint                           | Input                                                  | Output                       |
| --------- | ---------------------------------- | ------------------------------------------------------ | ---------------------------- |
| Login     | `POST /api/v1/auth/authenticate`   | `UsernamePasswordCredentials` (`userName`, `password`) | `ApiBearerToken` (`token`)   |
| Refresh   | `POST /api/v1/auth/refresh-token`  | Existing token in header                               | `ApiBearerToken`             |
| Validate  | `POST /api/v1/auth/validate-token` | `ApiBearerToken`                                       | 200 (valid) or 401 (invalid) |

**Public endpoints** (no token): auth, health, frontend, root.
**All other endpoints** require `Authorization: Bearer <token>` header.

---

## Error Model

Three-layer hierarchy based on RFC 7807 Problem Details:

1. **`ProblemDetails`** — Base type with `title`, `type` (URI), `status`, `detail`, `code`
2. **`ApiProblemDetails`** — Extends ProblemDetails, adds discriminator on `type` field with 38 concrete error types
3. **Concrete errors** — Domain-specific (e.g. `BridgeNotFound`, `PolicyAlreadyPresent`, `SchemaInvalidErrors`)

Validation errors have their own parallel hierarchy:

1. **`ValidationError`** — Base with `detail`, `type`, discriminator
2. **Composite validators** — `BehaviorPolicyValidationError`, `DataPolicyValidationError`, `SchemaValidationError`, `ScriptValidationError` — each a oneOf over specific subtypes
3. **Specific subtypes** — `MissingFieldValidationError`, `InvalidFieldValueValidationError`, `EmptyFieldValidationError`, etc.

Errors are composed: an `*InvalidErrors` response (e.g. `BehaviorPolicyInvalidErrors`) contains a `childErrors` array of specific validation errors.

---

## Collection Patterns

### Simple lists

Most Edge-native resources use: `{ items: T[] }` with `required: ["items"]`. No pagination.

Examples: `BridgeList`, `AdaptersList`, `EventList`, `NotificationList`, `StatusList`, `TopicFilterList`, `CombinerList`, `ManagedAssetList`, `MetricList`

### Paginated lists (Data Hub only)

Data Hub resources use: `{ items: T[], _links?: PaginationCursor }` where `PaginationCursor` has a `next` URL. Items is NOT marked required in these schemas.

Examples: `BehaviorPolicyList`, `DataPolicyList`, `SchemaList`, `ScriptList`

Query parameters: `limit` (page size, 10-500, default 50), `cursor` (opaque pagination token), `fields` (sparse fieldset)

---

## Entity Relationship Summary

```
ProtocolAdapter (type)
  └──* Adapter (instance)
       ├──* DomainTag (data point)
       ├──* NorthboundMapping (tag → MQTT topic)
       └──* SouthboundMapping (MQTT topic → tag)

Bridge
  ├──* LocalBridgeSubscription (local → remote)
  └──* BridgeSubscription (remote → local)

Combiner
  ├── sources: EntityReference[] (adapters, bridges, etc.)
  └──* DataCombining (mapping)
       └──* Instruction (field-level rule)

TopicFilter ─── schema (optional payload schema)

BehaviorPolicy
  ├── matching (clientIdRegex)
  ├── behavior (FSM reference)
  ├── deserialization (schema references)
  └──* onTransitions
       └──* PolicyOperation (pipeline functions)

DataPolicy
  ├── matching (topicFilter)
  ├── validation (schema validators)
  ├── onSuccess pipeline
  └── onFailure pipeline

PolicySchema ─── schemaDefinition (JSON Schema or Protobuf)
Script ─── source code (transformation functions)

ManagedAsset (Pulse)
  └── AssetMapping (status + optional combiner mapping)
```

---

## Endpoint Inventory by Domain

| Domain                       | Endpoints | Base Path                                       | Auth Required |
| ---------------------------- | --------- | ----------------------------------------------- | ------------- |
| Authentication               | 3         | `/api/v1/auth/`                                 | No            |
| Health                       | 2         | `/api/v1/health/`                               | No            |
| Frontend                     | 3         | `/api/v1/frontend/`                             | No            |
| Gateway                      | 2         | `/api/v1/gateway/`                              | Yes           |
| Bridges                      | 8         | `/api/v1/management/bridges/`                   | Yes           |
| Protocol Adapters            | 27        | `/api/v1/management/protocol-adapters/`         | Yes           |
| Events                       | 1         | `/api/v1/management/events`                     | Yes           |
| Topic Filters                | 7         | `/api/v1/management/topic-filters/`             | Yes           |
| Combiners                    | 7         | `/api/v1/management/combiners/`                 | Yes           |
| Payload Sampling             | 3         | `/api/v1/management/sampling/`                  | Yes           |
| UNS                          | 2         | `/api/v1/management/uns/`                       | Yes           |
| Metrics                      | 2         | `/api/v1/metrics/`                              | Yes           |
| Pulse                        | 14        | `/api/v1/management/pulse/`                     | Yes           |
| Data Hub — Behavior Policies | 5         | `/api/v1/data-hub/behavior-validation/`         | Yes           |
| Data Hub — Data Policies     | 5         | `/api/v1/data-hub/data-validation/`             | Yes           |
| Data Hub — Schemas           | 4         | `/api/v1/data-hub/schemas/`                     | Yes           |
| Data Hub — Scripts           | 4         | `/api/v1/data-hub/scripts/`                     | Yes           |
| Data Hub — State             | 1         | `/api/v1/data-hub/behavior-validation/states/`  | Yes           |
| Data Hub — FSM               | 1         | `/api/v1/data-hub/fsm`                          | Yes           |
| Data Hub — Functions         | 2         | `/api/v1/data-hub/functions`, `/function-specs` | Yes           |
| Data Hub — Interpolation     | 1         | `/api/v1/data-hub/interpolation-variables`      | Yes           |
| Root                         | 1         | `/`                                             | No            |

**Total: 105 operations**

---

## Key Enums Reference

| Enum                  | Values                                                                                                                                         | Used In                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Connection status     | `CONNECTED`, `DISCONNECTED`, `STATELESS`, `UNKNOWN`, `ERROR`                                                                                   | `Status.connection`            |
| Runtime status        | `STARTED`, `STOPPED`                                                                                                                           | `Status.runtime`               |
| Status command        | `START`, `STOP`, `RESTART`                                                                                                                     | `StatusTransitionCommand`      |
| Event severity        | `INFO`, `WARN`, `ERROR`, `CRITICAL`                                                                                                            | `Event.severity`               |
| Entity type           | `BRIDGE`, `ADAPTER`, `ADAPTER_TYPE`, `EVENT`, `USER`, `DATA_COMBINING`, `COMBINER`, `EDGE`                                                     | `TypeIdentifier.type`          |
| Notification level    | `NOTICE`, `WARNING`, `ERROR`                                                                                                                   | `Notification.level`           |
| QoS                   | `AT_MOST_ONCE`, `AT_LEAST_ONCE`, `EXACTLY_ONCE`                                                                                                | `NorthboundMapping.maxQoS`     |
| QoS (numeric)         | `0`, `1`, `2`                                                                                                                                  | `BridgeSubscription.maxQoS`    |
| Payload content type  | `JSON`, `PLAIN_TEXT`, `XML`, `CSV`                                                                                                             | `Payload.contentType`          |
| Transport             | `TCP`, `UDP`, `DCCP`, `SCTP`, `RSVP`, `QUIC`                                                                                                   | `Listener.transport`           |
| Adapter capability    | `READ`, `DISCOVER`, `WRITE`, `COMBINE`                                                                                                         | `ProtocolAdapter.capabilities` |
| Data identifier type  | `TAG`, `TOPIC_FILTER`, `PULSE_ASSET`                                                                                                           | `DataIdentifierReference.type` |
| Entity reference type | `ADAPTER`, `DEVICE`, `BRIDGE`, `EDGE_BROKER`, `PULSE_AGENT`                                                                                    | `EntityType`                   |
| Pulse activation      | `ACTIVATED`, `DEACTIVATED`, `ERROR`                                                                                                            | `PulseStatus.activation`       |
| Pulse runtime         | `CONNECTED`, `DISCONNECTED`, `ERROR`                                                                                                           | `PulseStatus.runtime`          |
| Asset mapping status  | `UNMAPPED`, `DRAFT`, `STREAMING`, `REQUIRES_REMAPPING`, `MISSING`                                                                              | `AssetMapping.status`          |
| Script function type  | `TRANSFORMATION`                                                                                                                               | `Script.functionType`          |
| Validator type        | `SCHEMA`                                                                                                                                       | `DataPolicyValidator.type`     |
| Policy type           | `DATA_POLICY`, `BEHAVIOR_POLICY`                                                                                                               | `PolicyType`                   |
| Capability ID         | `config-writeable`, `bi-directional protocol adapters`, `control-plane-connectivity`, `data-hub`, `mqtt-persistence`, `pulse-asset-management` | `Capability.id`                |
