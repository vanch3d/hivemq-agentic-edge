# OPENAPI-04: Add Missing Schema Descriptions and Required Fields

**Epic:** [OpenAPI Specification Quality & Agentic Readiness](./EPIC.md)
**Priority:** P1 High
**Type:** Completeness
**Review sections:** 3.1, 3.3, 3.4, 4

## Problem

35 of ~120 schemas have no description at all. 16+ schemas with clearly mandatory fields have no `required` array. This affects form validation (RJSF), SDK type safety (nullable vs. non-nullable), and LLM reasoning about what data is mandatory when constructing API requests.

## Scope

### Part A — Add schema-level descriptions (20 schemas)

Core entities missing descriptions entirely (not covered by OPENAPI-03):

| Schema | Suggested description |
| --- | --- |
| `UsernamePasswordCredentials` | "Username and password pair used to authenticate with the HiveMQ Edge REST API" |
| `ApiBearerToken` | "A JWT bearer token returned after successful authentication" |
| `Bridge` | "An MQTT bridge that forwards messages between HiveMQ Edge and a remote MQTT broker" |
| `Adapter` | "A configured protocol adapter instance that connects to an industrial device or data source" |
| `HealthStatus` | "The health status of the HiveMQ Edge broker instance" |
| `GatewayConfiguration` | "The runtime configuration of the HiveMQ Edge gateway" |
| `StatusTransitionCommand` | "A command to change the runtime status of a bridge or adapter" |
| `StatusTransitionResult` | "The result of executing a status transition command" |
| `ISA95ApiBean` | "ISA-95 hierarchy metadata describing the physical location of this edge node" |
| `AdapterConfig` | "The configuration payload for a specific protocol adapter instance" |
| `TagSchema` | "The JSON Schema describing how to define tags for a specific protocol adapter type" |
| `DataPoint` | "A single data value read from or written to a protocol adapter tag" |
| `PolicySchema` | "A data schema (JSON Schema or Protobuf) registered in the Data Hub for message validation" |
| `Script` | "A transformation script registered in the Data Hub for message processing" |
| `PulseActivationToken` | "A JWT token used to activate and authenticate the Pulse agent connection" |

List wrapper schemas (15) — add descriptions following the pattern `"Paginated list of <Entity> items"` or `"List of <Entity> items"`:

`BridgeList`, `EventList`, `StatusList`, `AdaptersList`, `NotificationList`, `ListenerList`, `CapabilityList`, `MetricList`, `TopicFilterList`, `PayloadSampleList`, `ProtocolAdaptersList`, `ValuesTree`, `EntityReferenceList`, `DataCombiningList`, `FsmStatesInformationListItem`.

### Part B — Add `required` arrays (16 schemas)

| Schema | Fields to mark required |
| --- | --- |
| `UsernamePasswordCredentials` | `userName`, `password` |
| `ApiBearerToken` | `token` |
| `StatusTransitionCommand` | `command` |
| `Status` | `id` |
| `Notification` | `title`, `level` |
| `Listener` | `name`, `hostName`, `port` |
| `HealthStatus` | `status` |
| `Capability` | `id` |
| `ProtocolAdapter` | `id`, `name` |
| `Adapter` | `id`, `type` |
| `Metric` | `name` |
| `DataPoint` | `value` |
| `ObjectNode` | `name`, `nodeType` |
| `FsmStateInformationItem` | `stateName`, `policyId` |
| `ISA95ApiBean` | `enabled` |
| `TagSchema` | `protocolId`, `configSchema` |

### Part C — Fix parameter descriptions (2 items)

1. `X-Original-URI` header on `getAdapterTypes` — add description: "The original request URI before proxy rewriting, used for adapter type filtering"
2. `TopicFilterId` parameter — change description from "should be deleted" to "The unique identifier of the topic filter"

### Part D — Root endpoint (1 item)

`GET /` — add a summary ("Get API root"), description, tag, and response schema (or mark as `deprecated` if it serves no purpose).
