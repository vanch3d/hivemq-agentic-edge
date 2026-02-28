# OPENAPI-03: Fix Incorrect and Copy-Pasted Descriptions

**Epic:** [OpenAPI Specification Quality & Agentic Readiness](./EPIC.md)
**Priority:** P1 High
**Type:** Correctness
**Review sections:** 2, 3.2

## Problem

18+ descriptions are provably wrong — copied from a different endpoint, resource, or field. These are not style issues; they actively mislead anyone (human or LLM) reading the spec.

## Scope

### 18 items — Direct text corrections

| Location | Current (wrong) | Suggested fix |
| --- | --- | --- |
| `POST /api/v1/auth/refresh-token` description | "Authorize the presented user to obtain a secure token" | "Refresh an existing JWT token to obtain a new one with an extended expiration" |
| `POST /api/v1/auth/validate-token` summary + description | Copied from `authenticate` | Summary: "Validate a token". Description: "Check whether the presented JWT token is still valid and not expired" |
| `GET /api/v1/management/events` description | "Get all bridges configured in the system" | "Get all events recorded by the system" |
| `GET /api/v1/management/events` `limit` param description | "Obtain all events since the specified epoch" | "Maximum number of events to return" |
| `PUT .../behavior-validation/policies/{policyId}` 400 response | "Behavior policy creation failed" | "Behavior policy update failed" |
| `PUT .../data-validation/policies/{policyId}` 400 response | "Data policy creation failed" | "Data policy update failed" |
| `GET .../adapters/{adapterId}/status` example | `type: bridge` | `type: adapter` |
| `GET .../writing-schema/{adapterId}/{tagName}` example | Shows domain tag data | Should show a writing schema (JSON Schema for PLC write payload) |
| `POST .../pulse/asset-mappers` request body description | "The combiner to add" | "The asset mapper to add" |
| `BehaviorPolicyNotFoundError.id` description | "The data policy id" | "The behavior policy id" |
| `SchemaInsufficientStorageError.id` description | "The policy id" | "The schema id" |
| `ScriptInsufficientStorageError.id` description | "The policy id" | "The script id" |
| `get-adapters-status` example | `type: bridge` | `type: adapter` |
| `get-bridges-status` description | "Obtain the details." | "Get the runtime status of all bridges configured in the system" |
| `get-adapters-status` description | "Obtain the details." | "Get the runtime status of all protocol adapters configured in the system" |
| `Listener.description` | "The extension description" | "A human-readable description for this listener" |
| `Listener.hostName` | "A mandatory ID hostName with the Listener" | "The hostname or IP address the listener binds to" |
| `TopicFilter.description` | "The name for this topic filter" | "A human-readable description for this topic filter" |

Additionally, 15 schemas have the placeholder description `"List of result items that are returned by this endpoint"` as their entity-level description. Each should be replaced with a description of the entity itself:

| Schema | Suggested description |
| --- | --- |
| `Capability` | "A feature capability supported by this HiveMQ Edge instance" |
| `Extension` | "A HiveMQ extension installed on this broker instance" |
| `Module` | "A loadable module providing additional protocol adapter types" |
| `Notification` | "A system notification surfaced to the user interface" |
| `Listener` | "A network listener accepting MQTT client connections" |
| `Event` | "A system event recording a state change or notable occurrence" |
| `NorthboundMapping` | "A mapping rule that publishes adapter data to an MQTT topic" |
| `SouthboundMapping` | "A mapping rule that subscribes to an MQTT topic and writes to an adapter" |
| `DomainTag` | "A named data point address within a protocol adapter's address space" |
| `ObjectNode` | "A node in the hierarchical object tree representing the adapter's tag namespace" |
| `ProtocolAdapter` | "A protocol adapter type available for creating adapter instances" |
| `PayloadSample` | "A captured sample of an MQTT message payload for inspection" |
| `TopicFilter` | "A topic filter pattern used to match MQTT topic names" |
| `Metric` | "A runtime metric exposed by the broker for monitoring" |
| `FsmStateInformationItem` | "Runtime state information for a client tracked by a behavior policy FSM" |
