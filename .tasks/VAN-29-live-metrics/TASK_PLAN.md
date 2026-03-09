# VAN-29: Implementation Plan

> See [TASK_BRIEF.md](./TASK_BRIEF.md) for requirements.
> See [CHARTING_RESEARCH.md](./CHARTING_RESEARCH.md) for charting library evaluation.

## Architecture Decisions

### AD-1: Add a dedicated `queryMetrics` tool (separate from `querySystem`)

A dedicated tool for metrics because:

- The output schema differs (includes `display: "metric-live"`, `metricName`, `pollInterval`)
- The agent needs a clear semantic signal: "this result should be rendered as a live chart"
- Keeps `querySystem` focused on its existing 14 operations
- The existing `metrics` operation on `querySystem` (list names) stays as-is

**Operations**:

- `getValue` -- single point-in-time read of one metric (returns `DataPoint`)
- `monitor` -- returns config for live polling visualization (sparkline)
- `search` -- search metric names by pattern (helpful for LLM to resolve user intent)

### AD-2: New display type `"metric-live"` in tool-status routing

Following the existing pattern (`"graph"` -> ChatGraph, array -> ChatTable), add `"metric-live"` -> ChatMetricLive. The component handles its own polling via TanStack Query `refetchInterval`.

### AD-3: Use **Nivo** (`@nivo/line`) for chart rendering

See [CHARTING_RESEARCH.md](./CHARTING_RESEARCH.md) for full evaluation.

**Why Nivo over uPlot**:

- **Theming**: Dedicated `@nivo/theming` with `ThemeProvider`, `PartialTheme` deep-merge -- maps cleanly to Chakra UI tokens via a `useNivoTheme()` bridge hook
- **React-native**: First-class components, hooks, context -- same mental model as the rest of the app
- **Chart type range**: 30+ types available as tree-shakeable packages. Only `@nivo/line` needed now, but `@nivo/bar`, `@nivo/pie`, etc. available for future agent capabilities
- **Config-driven**: Every chart is a single component with declarative props. Agent controls everything through config.
- **SVG default**: Participates in CSS cascading. Canvas variant (`LineCanvas`) available if perf becomes an issue.

**Trade-off**: SVG re-rendering is less performant than canvas for high-frequency updates. At 2s polling with 150 points, this is a non-issue. `LineCanvas` is the escape hatch.

### AD-4: Chakra-Nivo theme bridge via `useNivoTheme()` hook

A custom hook that produces a `PartialTheme` from Chakra's color mode and CSS variables. All Nivo charts in the app receive consistent styling that adapts to dark/light mode automatically. This follows the same pattern as `graph-tokens.css` for React Flow, but at a higher level (theme object vs CSS variables).

### AD-5: Sparkline accumulates data client-side

The `getSample` endpoint returns a single `{ sampleTime, value }` point. The component accumulates points in a `useRef` array on each poll, building a time-series locally. No server-side storage needed.

### AD-6: Mock handler returns dynamic metric values

The MSW mock for `getSample` generates pseudo-random values that simulate realistic metric behavior (incrementing counters, fluctuating gauges) to make the live visualization meaningful during development.

## File Changes

### New files

| File                                          | Purpose                                              |
| --------------------------------------------- | ---------------------------------------------------- |
| `src/agent/tools/query-metrics.ts`            | Tool implementation for metric queries               |
| `src/components/chat/chat-metric-live.tsx`    | Live metric visualization (polling + Nivo sparkline) |
| `src/components/snapshot/snapshot-metric.tsx` | Full-page metric view for snapshots                  |
| `src/hooks/use-nivo-theme.ts`                 | Chakra-to-Nivo theme bridge hook                     |

### Modified files

| File                                  | Changes                                                 |
| ------------------------------------- | ------------------------------------------------------- |
| `src/agent/tool-definitions.ts`       | Add `queryMetricsDef`; register in `allToolDefinitions` |
| `src/components/chat/tool-status.tsx` | Add `"metric-live"` display type routing                |
| `src/mocks/fixtures/system.ts`        | Expand `metricList` with adapter-specific metric names  |
| `src/mocks/handlers/system.ts`        | Add `GET /api/v1/metrics/:metricName/latest` handler    |
| `src/locales/en-US.json`              | Add i18n keys for metric visualization                  |
| `package.json`                        | Add `@nivo/line`, `@nivo/core` dependencies             |

### Files NOT changed

- `src/agent/tools/query-system.ts` -- keep `metrics` operation as-is (list names)
- `src/api/` -- already generated, `getSample` exists in `sdk.gen.ts`

## Implementation Steps

### Phase 1: Tool wiring (Capability 1 -- read metric values)

- [x] **1.1** Add `queryMetricsDef` to `src/agent/tool-definitions.ts`
  - Operations: `getValue`, `monitor`, `search`
  - Input: `operation`, `metricName` (string), `metricNames` (string[], for multi-metric monitor), `pattern` (string, optional for search), `pollInterval` (number, optional, default 2000ms)
  - Output for `getValue`: `{ data: DataPoint, error? }`
  - Output for `monitor`: `{ display: "metric-live", metricNames, pollInterval, data: DataPoint[] }`
  - Output for `search`: `{ data: Metric[], error? }` (filtered list)

- [x] **1.2** Create `src/agent/tools/query-metrics.ts`
  - Import `getSample`, `getMetrics` from `@/api/sdk.gen`
  - `getValue`: calls `getSample({ path: { metricName } })`, returns `DataPoint` + snapshot
  - `search`: calls `getMetrics()`, filters `items` by substring match on `pattern`, returns list + snapshot
  - `monitor`: calls `getSample` for initial value, returns with `display: "metric-live"`

- [x] **1.3** Register in `allToolDefinitions` and wire client

- [x] **1.4** Expand mock fixtures in `src/mocks/fixtures/system.ts`
  - Add adapter-specific metric names matching the naming convention:
    - `com.hivemq.edge.protocol-adapters.opcua.opcua-adapter-01.connection.success.count`
    - `com.hivemq.edge.protocol-adapters.modbus.modbus-adapter-01.publish.success.count`
    - `com.hivemq.edge.bridge.cloud-bridge.local.publish.count`
    - etc.

- [x] **1.5** Add `getSample` mock handler in `src/mocks/handlers/system.ts`
  - `GET /api/v1/metrics/:metricName/latest`
  - Return dynamic `DataPoint` with `sampleTime: new Date().toISOString()` and pseudo-random `value`
  - Counter metrics: incrementing values; gauge metrics: fluctuating around a baseline

### Phase 2: Nivo setup + Chakra theme bridge

- [x] **2.1** Install Nivo: `pnpm add @nivo/core @nivo/line @nivo/theming`

- [x] **2.2** Create `src/hooks/use-nivo-theme.ts`
  - `useNivoTheme()` hook returning `PartialTheme`
  - Maps Chakra color mode to Nivo theme properties (background, text, axis, grid, tooltip, crosshair)
  - Uses Chakra CSS variable references where SVG supports them, resolved values where needed
  - Memoized on `colorMode`

### Phase 3: Live visualization (Capability 2 -- sparkline)

- [x] **3.1** Create `src/components/chat/chat-metric-live.tsx`
  - Props: `metricName: string`, `initialData?: DataPoint`
  - Uses TanStack Query with `refetchInterval: 2000` to poll `getSample`
  - Accumulates `{ sampleTime, value }` points in a `useRef` array (max 150 points)
  - Renders:
    - Header: metric name (truncated, with tooltip for full name)
    - Current value: large number with subtle animation on change
    - Sparkline: Nivo `ResponsiveLine` mini chart (height ~100px, minimal axes, area fill)
    - Footer: "polling every 2s" indicator + data point count
  - Applies Nivo theme from `useNivoTheme()`
  - Sizing: fits within chat bubble width (~400px max)

- [x] **3.2** Update `src/components/chat/tool-status.tsx`
  - Add case: `if (result.display === "metric-live")` -> render `<ChatMetricLive />`
  - Pass `metricName` and initial `data` from tool result

- [x] **3.3** Add i18n keys to `src/locales/en-US.json`
  - `metrics.live.polling` -- "Polling every {{interval}}s"
  - `metrics.live.dataPoints` -- "{{count}} data points"
  - `metrics.live.currentValue` -- "Current value"
  - `metrics.live.noData` -- "Waiting for data..."

### Phase 4: Snapshot support

- [ ] **4.1** Create `src/components/snapshot/snapshot-metric.tsx`
  - Full-page version of the live metric view
  - Larger chart with axes, grid, tooltip on hover
  - Shows accumulated data as both chart and table

- [ ] **4.2** Update snapshot display type routing
  - Add `"metric-live"` to `SnapshotRequest["displayType"]` union in `tool-context.ts`
  - Route in snapshot page component

### Phase 5: Polish

- [x] **5.1** Lint and format: `pnpm lint:all`
- [ ] **5.2** Manual testing with dev server
  - Test: "what metrics are available?" (existing `querySystem metrics`)
  - Test: "what is the current value of com.hivemq.messages.incoming.total.count?"
  - Test: "search for metrics related to opcua"
  - Test: "show me a live update of incoming message count"
- [ ] **5.3** Verify MSW mocks produce realistic-looking sparklines
- [ ] **5.4** Verify dark/light mode theme switching on live chart

## Tool Result Schema (for LLM)

### `getValue` response

```json
{
  "data": { "sampleTime": "2026-03-06T16:00:00.000Z", "value": 42 },
  "snapshotId": "snap-abc123"
}
```

### `monitor` response (single metric)

```json
{
  "display": "metric-live",
  "metricNames": ["com.hivemq.messages.incoming.total.count"],
  "pollInterval": 2000,
  "data": [{ "sampleTime": "2026-03-06T16:00:00.000Z", "value": 42 }]
}
```

### `monitor` response (multi-metric)

```json
{
  "display": "metric-live",
  "metricNames": [
    "com.hivemq.messages.incoming.total.count",
    "com.hivemq.messages.outgoing.total.count"
  ],
  "pollInterval": 5000,
  "data": [
    { "sampleTime": "2026-03-06T16:00:00.000Z", "value": 42 },
    { "sampleTime": "2026-03-06T16:00:00.000Z", "value": 38 }
  ]
}
```

### `search` response

```json
{
  "data": [
    {
      "name": "com.hivemq.edge.protocol-adapters.opcua.opcua-adapter-01.connection.success.count"
    },
    {
      "name": "com.hivemq.edge.protocol-adapters.opcua.opcua-adapter-01.publish.success.count"
    }
  ],
  "snapshotId": "snap-def456"
}
```

## Resolved Questions

1. **Multi-metric monitoring**: Yes -- `monitor` accepts an array of metric names. The component renders a grid of sparklines. Great for proof of concept.
2. **Polling interval**: Agent-configurable via `pollInterval` input parameter (default 2000ms). Some metrics make more sense on longer intervals.
3. **Data retention**: 150 points with oldest-first eviction. Configurable via component props (part of the config surface).
