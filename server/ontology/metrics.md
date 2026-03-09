## Metrics

### Naming Convention

All metrics follow a hierarchical dot-separated namespace. Parse the name to extract entity context:

| Pattern                                              | Entity           | Example                                                                         |
| ---------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------- |
| `com.hivemq.edge.protocol-adapters.{type}.{id}.{…}`  | Adapter metric   | `com.hivemq.edge.protocol-adapters.opcua.my-adapter.read.publish.success.count` |
| `com.hivemq.edge.bridge.{bridgeId}.{direction}.{…}`  | Bridge metric    | `com.hivemq.edge.bridge.cloud.local.publish.count`                              |
| `com.hivemq.messages.{direction}.{type}.{unit}`      | Broker messaging | `com.hivemq.messages.incoming.publish.count`                                    |
| `com.hivemq.networking.{resource}.{unit}`            | Networking       | `com.hivemq.networking.connections.current`                                     |
| `com.hivemq.system.os.{subsystem}.{resource}.{unit}` | System/OS        | `com.hivemq.system.os.global.memory.total`                                      |

### Metric Suffixes and Types

The last segment(s) indicate the metric type and unit:

| Suffix           | Type        | Behavior                                     | Example                    |
| ---------------- | ----------- | -------------------------------------------- | -------------------------- |
| `.count`         | Counter     | Monotonically increasing; value only goes up | `publish.success.count`    |
| `.current`       | Gauge       | Point-in-time value; can go up or down       | `connections.current`      |
| `.total`         | Accumulator | Cumulative total (e.g. bytes)                | `memory.total`             |
| `.failed.count`  | Counter     | Error/failure counter                        | `connection.failed.count`  |
| `.success.count` | Counter     | Success counter                              | `connection.success.count` |

### Common Adapter Metrics

For an adapter of type `{type}` with id `{id}`, expect these patterns:

- `…{type}.{id}.connection.success.count` — successful connections
- `…{type}.{id}.connection.failed.count` — failed connection attempts
- `…{type}.{id}.read.publish.success.count` — successful read-publish cycles (northbound)
- `…{type}.{id}.read.publish.failed.count` — failed read-publish cycles
- `…{type}.{id}.write.success.count` — successful writes (southbound, if supported)
- `…{type}.{id}.write.failed.count` — failed writes

### Common Bridge Metrics

For a bridge with id `{bridgeId}`:

- `…bridge.{bridgeId}.local.publish.count` — messages published to local broker
- `…bridge.{bridgeId}.remote.publish.count` — messages published to remote broker

### Querying Metrics

1. **List all names**: `querySystem({ operation: "metrics" })` — returns metric names only (no values)
2. **Search by pattern**: `queryMetrics({ operation: "search", pattern: "opcua" })` — filters names by substring
3. **Read one value**: `queryMetrics({ operation: "getValue", metricName: "…" })` — returns `{ sampleTime, value }`
4. **Live monitor**: `queryMetrics({ operation: "monitor", metricNames: ["…", "…"], pollInterval: 2000 })` — displays live-updating sparkline(s)

### Resolving User Intent to Metric Names

When a user asks about metrics in natural language (e.g. "how many publishes for the test adapter?"):

1. Identify the entity: adapter type + id, bridge id, or system scope
2. Identify the metric category: connection, publish, write, etc.
3. Construct or search for the matching name using the patterns above
4. Use `search` if unsure — it filters the full metric list by substring
