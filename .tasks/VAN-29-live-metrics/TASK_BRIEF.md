# VAN-29: Live Metrics Querying and Visualization

## Problem

The agent can list available metric names (`querySystem("metrics")` -> `GET /api/v1/metrics`) but cannot read a metric's actual value. The `getSample` endpoint (`GET /api/v1/metrics/{metricName}/latest`) is generated in the SDK but never wired into any tool.

When a user asks "what's the current count of successful publishes for adapter X?", the agent has no way to answer.

Beyond point-in-time reads, a natural follow-up is "show me a live update of that metric" -- which requires a custom visualization with polling.

## Two capabilities to build

### Capability 1: Read a metric value (tool gap)

- Add a `metricValue` operation to `querySystem` (or a dedicated tool)
- Input: `metricName` (string) -- the full metric name
- Output: `{ sampleTime, value }` from the `DataPoint` schema
- The LLM needs to resolve user intent to the correct metric name via search or convention

### Capability 2: Live metric visualization (custom view)

- New display type: `"metric-live"` (alongside `"table"`, `"graph"`, `"json"`)
- Tool result includes `{ display: "metric-live", metricName, data: { sampleTime, value } }`
- New `ChatMetricLive` component that polls `getSample` and displays real-time data
- Rendering options: live counter, sparkline, multi-metric dashboard

## API endpoints involved

| Endpoint                                  | Operation    | Status                                      |
| ----------------------------------------- | ------------ | ------------------------------------------- |
| `GET /api/v1/metrics`                     | `getMetrics` | Wired (lists names only)                    |
| `GET /api/v1/metrics/{metricName}/latest` | `getSample`  | Not wired -- SDK generated, no tool uses it |

## Metric naming convention

```
com.hivemq.edge.protocol-adapters.{type}.{id}.connection.success.count
com.hivemq.edge.bridge.{bridgeName}.local.publish.count
com.hivemq.edge.messages.incoming.publish.count
```

## Side objective: Charting library investigation

Investigate a data visualization library that offers significant configuration power to allow full control by the agent (and tools). Similar to the approach with RJSF for forms and TanStack Table for tabular data -- a declarative, schema/config-driven charting solution.
