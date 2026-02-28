## Data Hub Deep Dive

### Function Catalog

Pipeline functions available in policy operations (onSuccess, onFailure, onTransitions):

| Function                  | Arguments                                                       | Terminal | Data-only | Notes                                                                     |
| ------------------------- | --------------------------------------------------------------- | -------- | --------- | ------------------------------------------------------------------------- |
| System.log                | level (DEBUG/INFO/WARN/ERROR), message (supports interpolation) | No       | No        | Logging, usable in any pipeline position                                  |
| Metrics.Counter.increment | metricName, incrementBy (default 1)                             | No       | No        | Custom metric counter                                                     |
| Mqtt.UserProperties.add   | name, value                                                     | No       | Yes       | Add MQTT5 user property to message                                        |
| Serdes.deserialize        | schemaId, schemaVersion                                         | No       | Yes       | Deserialize payload using schema; must precede schema-dependent functions |
| Serdes.serialize          | schemaId, schemaVersion                                         | No       | Yes       | Serialize payload using schema                                            |
| Delivery.redirectTo       | topic (supports interpolation), applyPolicies (boolean)         | Yes      | Yes       | Redirect message to different topic                                       |
| Mqtt.drop                 | reasonString (interpolation)                                    | Yes      | No        | Drop message, MQTT5 only                                                  |
| Mqtt.disconnect           | (no args)                                                       | Yes      | No        | Disconnect client                                                         |

**Rules:**

- Terminal functions (Delivery.redirectTo, Mqtt.drop, Mqtt.disconnect) must be last in the pipeline
- Data-only functions cannot be used in behavior policy transitions (they require a publish message)
- Pipeline ordering: non-terminal functions first, at most one terminal function last
- schemaVersion can be a number or the string "latest"

### Behavior Models & FSMs

Three finite state machine models for behavior policies:

**Mqtt.events** (basic MQTT lifecycle):

```
Initial → Connected → Disconnected
Events: Connect, Publish, Subscribe, Disconnect
```

**Publish.duplicate** (duplicate detection):

```
Initial → Connected → NotDuplicated ↔ Duplicated → Violated | Disconnected
```

**Publish.quota** (publish rate limiting):

```
Initial → Connected → Publishing → Violated | Disconnected
Arguments: minPublishes (int), maxPublishes (int)
```

**Transition events:**

- Event.OnAny — matches any event
- Connection.OnDisconnect — client disconnects
- Mqtt.OnInboundConnect — CONNECT packet
- Mqtt.OnInboundDisconnect — DISCONNECT packet
- Mqtt.OnInboundPublish — PUBLISH packet
- Mqtt.OnInboundSubscribe — SUBSCRIBE packet

**Wildcard patterns:** Any.\* (any state), Any.Success (any success state), Any.Failed (any failure state)

### Validation Strategies

Data policies validate payloads using validators:

- **ALL_OF** — all referenced schemas must pass validation
- **ANY_OF** — at least one referenced schema must pass

Each validator has: type (SCHEMA), strategy (ALL_OF|ANY_OF), schemas (array of SchemaReference).
SchemaReference: { schemaId: string, version: number | "latest" }

### Transformation Scripts

Runtime contract for custom transformation functions:

```javascript
function transform(publish, context) {
  // publish: { topic, qos, retain, userProperties, payload }
  // context: { arguments, policyId, clientId, branches, clientConnectionStates }
  return publish; // must return modified or original publish object
}
```

Constraints:

- Synchronous execution only (no async/await, no Promises)
- ECMAScript 2024 syntax supported
- No browser APIs (no DOM, fetch, setTimeout)
- No Node.js APIs (no require, fs, process)
- Must return the publish object (or a modified copy)

### String Interpolation

Template variables usable in function arguments (e.g. System.log message, Delivery.redirectTo topic):

- Variables use `${variable}` syntax in string arguments
- Each variable has a type (string or long) and applicable policy type (DATA_POLICY, BEHAVIOR_POLICY, or both)
- Query available variables via the listVariables tool

### System Limits

| Resource                  | Limit            |
| ------------------------- | ---------------- |
| Data policies             | 5,000 max        |
| Behavior policies         | 5,000 max        |
| Schemas                   | 5,000 max        |
| Scripts                   | 5,000 max        |
| Schema definition size    | 100 KB           |
| Script source size        | 100 KB           |
| Delivery.redirectTo depth | 20 redirects max |

### Policy Evaluation Flow

When a message matches a data policy's topicFilter:

1. **Validation phase**: payload checked against all validators (ALL_OF or ANY_OF strategy)
2. **On success**: execute onSuccess pipeline (e.g. serialize, log, redirect)
3. **On failure**: execute onFailure pipeline (e.g. log error, drop message, disconnect client)

If no policy matches a topic, the message passes through unmodified.
Multiple policies can match the same topic — they are evaluated independently.
