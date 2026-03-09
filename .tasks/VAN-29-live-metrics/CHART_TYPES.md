# Chart Type Strategy (Deferred)

## Metric suffix to chart type mapping

| Suffix / pattern         | Metric behavior                            | Best visualization                                    |
| ------------------------ | ------------------------------------------ | ----------------------------------------------------- |
| `.count`                 | Monotonically increasing counter           | **Line** (raw) or **bar** (rate: delta between polls) |
| `.current`               | Point-in-time gauge (connections, threads) | **Line** sparkline + prominent current value          |
| `.total`                 | Cumulative total (bytes, memory)           | **Area** chart                                        |
| `.rate` / derived        | Throughput per second                      | **Line** or **bar**                                   |
| Multiple related metrics | Comparison (in vs out, success vs fail)    | **Stacked area** or **grouped bar**                   |
| Single snapshot value    | One-time read                              | **Stat card** (just the number, no chart)             |

## Approach: Hybrid (C)

- Component has sensible defaults based on naming convention
- Agent can override with explicit `chartType` field on `monitor` input
- Tool description documents conventions so agent makes informed choices

## Implementation (future)

1. Add optional `chartType` field to `queryMetricsDef` input schema
2. `ChatMetricLive` infers default chart type from metric name suffix via `parseMetricName()`
3. Agent `chartType` overrides the default when specified
4. Install additional Nivo packages as needed (`@nivo/bar`, etc.)
5. `ChartRenderer` component dispatches on chart type to the correct Nivo component
