# Charting Library Research for Agent-Driven Visualization

## Requirements

The charting solution must mirror the project's approach with other UI primitives:
- **RJSF** for forms: JSON Schema -> fully rendered form
- **TanStack Table** for tabular data: column defs + data -> fully rendered table

We need: **config/spec + data -> fully rendered chart**, where the agent (LLM) can control chart configuration through tool results.

### Key criteria

1. **Declarative / config-driven** -- charts defined by a JSON-like spec, not imperative code
2. **React-native** -- first-class React components, not a wrapper around a DOM library
3. **Themable** -- deep integration with Chakra UI v3 theming (tokens, dark mode, CSS variables)
4. **Composable** -- can build custom chart types from primitives (line, area, axis, tooltip)
5. **Responsive** -- auto-sizes to container, works in chat bubbles (300px) and full snapshots
6. **Chart type range** -- enough variety for future agent use cases (line, bar, pie, heatmap, etc.)
7. **Maintained** -- active project, not abandoned

### Nice-to-haves

- Streaming/real-time friendly (efficient re-renders on data append)
- Animation support for live updates
- Small bundle size

---

## Chakra UI v3 Theming Context

Understanding how our app handles theming is essential for evaluating integration depth.

**Current setup**: The project uses `defaultSystem` from Chakra v3 (no custom `createSystem()`). Color mode is handled by `next-themes` adding a `.dark` class to `<html>`.

**Three token access patterns in the project**:

| Pattern | When used | Example |
| --- | --- | --- |
| Chakra token strings | Chakra component props | `bg="blue.500"` |
| CSS custom properties | External libraries (React Flow) | `var(--graph-edge-teal)` with `.dark` overrides in CSS |
| Chakra CSS variables | Raw DOM/JS access | `var(--chakra-colors-blue-300)` |

**Established precedent**: The graph visualization (`@xyflow/react`) uses a dedicated `graph-tokens.css` file with CSS custom properties that adapt to dark mode via `.dark` selector. This is the proven pattern for bridging external libraries to Chakra theming.

**Ideal chart library integration**: A library that accepts a theme object we can populate from Chakra tokens, OR one that renders SVG/HTML elements we can style via CSS variables. Canvas-based libraries are harder to theme because they don't participate in CSS cascading.

---

## Candidates

### 1. Nivo

- **Approach**: Declarative React components built on D3, with a dedicated `@nivo/theming` package
- **API style**: `<ResponsiveLine data={data} theme={myTheme} colors={['#e8c1a0']} />`
- **Bundle**: Tree-shakeable scoped packages (`@nivo/line`, `@nivo/bar`, etc.). Core + line ~60-80KB
- **Chart types**: Extremely comprehensive -- Line, Bar, Pie, Heatmap, Radar, Sankey, Chord, Treemap, Sunburst, Waffle, Calendar, Scatterplot, BoxPlot, Network, Funnel, Bullet, and more (30+ types). SVG and Canvas variants for most.
- **Theming**:
  - Dedicated `@nivo/theming` package with `ThemeProvider`, `useTheme()` hook
  - `Theme` type covers: `background`, `text` (fontFamily, fontSize, fill), `axis` (domain, ticks, legend), `grid`, `crosshair`, `legends`, `labels`, `markers`, `dots`, `tooltip`, `annotations`
  - `PartialTheme` allows partial overrides deep-merged with defaults
  - Text properties inherit from root `text` style (cascade pattern)
  - Renders SVG by default -- elements are styleable via CSS
  - Default theme uses neutral palette (white bg, #333 text) -- easy to override for dark mode
- **Real-time**: No built-in streaming support. SVG re-renders on data change. Canvas variants exist for performance-critical charts.
- **Config-driven fit**: Excellent -- every chart is a single React component with declarative props. Data + theme + config = chart. No imperative API.
- **React**: First-class React library. Components, hooks, context -- fully idiomatic.

### 2. Recharts

- **Approach**: Declarative React components built on D3
- **API style**: `<LineChart data={data}><Line dataKey="value" /><XAxis /><YAxis /></LineChart>`
- **Bundle**: ~170KB minified
- **Chart types**: Line, Area, Bar, Pie, Radar, Scatter, Treemap, Funnel, Sankey. ~12 types.
- **Theming**: No theme system. Colors passed as individual props per component. Dark mode requires manually setting every `stroke`, `fill`, `tick` color prop.
- **Real-time**: Fair -- SVG re-renders can lag with frequent updates.
- **Config-driven fit**: Good -- component props map to config, but the composable JSX pattern (children-based API) is harder to drive from a single config object.

### 3. Visx (Airbnb)

- **Approach**: Low-level D3 primitives as React components
- **API style**: `<LinePath data={data} x={d => xScale(d.time)} y={d => yScale(d.value)} />`
- **Bundle**: Tree-shakeable, ~30-50KB for a sparkline
- **Chart types**: Primitives (line, area, bar, axis, grid, tooltip, etc.) -- you compose them yourself. No pre-built "chart" components.
- **Theming**: No theme system. You control every SVG attribute directly. Maximum flexibility but maximum effort.
- **Real-time**: Good -- efficient SVG, you control render granularity.
- **Config-driven fit**: Low -- requires significant mapping code from config to composed primitives.

### 4. uPlot

- **Approach**: Canvas-based, imperative API with React wrapper
- **API style**: `new uPlot(opts, data, container)` -- options object is the spec
- **Bundle**: ~30KB minified
- **Chart types**: Line, area, bar, scatter, sparkline. ~5 types. Time-series focused.
- **Theming**: No theme object. Colors set per-series in options. Canvas-based -- **cannot use CSS variables or participate in CSS cascading**. Theme changes require destroying and recreating the chart instance or imperatively updating options.
- **Real-time**: Excellent -- canvas + optimized for streaming/appending data.
- **Config-driven fit**: Excellent -- the entire chart IS a config object.

### 5. ECharts (Apache)

- **Approach**: Canvas/SVG, fully declarative option object
- **API style**: `<ReactECharts option={{ xAxis: {...}, series: [{type: 'line', data}] }} />`
- **Bundle**: ~350KB+ (even tree-shaken ~200KB)
- **Chart types**: 20+ types including exotic ones (gauge, radar, tree, graph, parallel, etc.)
- **Theming**: Built-in theme system with `registerTheme()`. Has dark theme out of the box. Theme object covers colors, background, text, axis, tooltip, etc. But the theme registration is global/imperative, not React context-based.
- **Real-time**: Good -- canvas-based, handles frequent updates well.
- **Config-driven fit**: Excellent -- single `option` JSON object defines everything.

### 6. Observable Plot

- **Approach**: Grammar of graphics, declarative marks
- **API style**: `Plot.plot({ marks: [Plot.line(data, {x: "time", y: "value"})] })`
- **Bundle**: ~90KB
- **Chart types**: Very flexible mark system (line, bar, dot, area, rule, text, etc.) composable into any chart.
- **Theming**: CSS-based. Renders SVG with class names. Theme via CSS custom properties. Dark mode support via `color-scheme`. Very compatible with CSS variable approach.
- **Real-time**: Fair -- re-renders entire SVG on data change.
- **Config-driven fit**: Excellent -- mark-based spec is pure JSON.

---

## Deep Theming Comparison

### How Chakra integration would work with each library

| Library | Integration approach | Dark mode | Effort | Quality |
| --- | --- | --- | --- | --- |
| **Nivo** | Build a `PartialTheme` from Chakra CSS vars. Nivo's `ThemeProvider` wraps chart area. Text, axis, grid, tooltip all themed from one object. | Rebuild theme on color mode change via `useColorMode()` or use CSS vars in theme values | Low | Excellent -- native theme object matches Chakra's token granularity |
| **Recharts** | Set individual color props on every component | Manual per-prop, no cascading | High | Poor -- no centralized theme, scattered color props |
| **Visx** | Direct SVG attribute control, use CSS vars | CSS vars on SVG elements | Medium | Good but manual -- you own every pixel |
| **uPlot** | Build options object with resolved color values | Must re-create chart on mode change (canvas) | Medium | Fair -- canvas can't use CSS vars, no cascading |
| **ECharts** | Register theme with resolved tokens | Re-register theme on mode change | Medium | Good but global/imperative |
| **Observable Plot** | CSS custom properties on rendered SVG | Native CSS `.dark` selector | Low | Good -- pure CSS theming |

### Nivo theme <-> Chakra bridge (concrete example)

```typescript
import type { PartialTheme } from "@nivo/theming";

function useNivoTheme(): PartialTheme {
  const { colorMode } = useColorMode();
  const isDark = colorMode === "dark";

  return useMemo((): PartialTheme => ({
    background: isDark ? "var(--chakra-colors-gray-900)" : "var(--chakra-colors-white)",
    text: {
      fontSize: 11,
      fill: isDark ? "var(--chakra-colors-gray-300)" : "var(--chakra-colors-gray-700)",
      fontFamily: "var(--chakra-fonts-body)",
    },
    axis: {
      domain: { line: { stroke: isDark ? "#525252" : "#d4d4d4" } },
      ticks: {
        line: { stroke: isDark ? "#525252" : "#d4d4d4" },
        text: { fill: isDark ? "#a3a3a3" : "#737373" },
      },
    },
    grid: {
      line: { stroke: isDark ? "#2d2d2d" : "#ededed" },
    },
    tooltip: {
      container: {
        background: isDark ? "#1a1a2e" : "#ffffff",
        color: isDark ? "#e5e5e5" : "#333333",
        fontSize: 12,
      },
    },
    crosshair: {
      line: { stroke: isDark ? "#a3a3a3" : "#666666" },
    },
  }), [isDark]);
}
```

This hook produces a theme object that Nivo deep-merges with its defaults. Every chart wrapped in Nivo's `ThemeProvider` (or receiving `theme` prop) automatically picks up Chakra-aligned colors. Dark mode changes trigger a re-render with updated values.

### uPlot theme bridge (for comparison)

```typescript
function useUPlotTheme() {
  const { colorMode } = useColorMode();
  const isDark = colorMode === "dark";

  // Must return resolved color strings -- canvas can't use CSS vars
  return useMemo(() => ({
    axes: {
      stroke: isDark ? "#525252" : "#d4d4d4",
      font: `11px ${getComputedStyle(document.documentElement).getPropertyValue("--chakra-fonts-body")}`,
      ticks: { stroke: isDark ? "#525252" : "#d4d4d4" },
      grid: { stroke: isDark ? "#2d2d2d" : "#ededed" },
    },
    series: {
      stroke: isDark ? "#60a5fa" : "#3b82f6",
      fill: isDark ? "rgba(96,165,250,0.1)" : "rgba(59,130,246,0.1)",
    },
  }), [isDark]);
}
// Caveat: changing color mode requires destroying and recreating the uPlot instance
```

---

## Revised Evaluation Matrix

| Library | Config-driven | React-native | Theming | Chart range | Bundle | Real-time | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Nivo** | Excellent | Excellent | Excellent | Excellent (30+) | Medium (60-80KB) | Fair | **A** |
| Recharts | Good | Excellent | Poor | Good (12) | Large (170KB) | Fair | B |
| Visx | Low | Excellent | Manual | DIY | Small (30-50KB) | Good | B- |
| uPlot | Excellent | Wrapper | Fair | Limited (5) | Tiny (30KB) | Excellent | B+ |
| ECharts | Excellent | Wrapper | Good | Excellent (20+) | Huge (350KB) | Good | B |
| Observable Plot | Excellent | None | Good (CSS) | Flexible | Medium (90KB) | Fair | B |

---

## Revised Recommendation

### Primary: **Nivo** for the charting layer

**Rationale**:

1. **Theming is first-class**: Dedicated `@nivo/theming` package with `ThemeProvider`, `PartialTheme` deep-merge, text inheritance cascade. Maps cleanly to Chakra UI tokens. This is the only library with a theming architecture comparable in sophistication to Chakra itself.

2. **Truly React-native**: Components, hooks, context -- not an imperative library with a React wrapper. Same mental model as the rest of the app.

3. **Config-driven by design**: Every chart is `<ResponsiveLine data={...} theme={...} {...config} />`. The agent can control everything through a props/config object. No JSX composition needed (unlike Recharts).

4. **Chart type range**: 30+ chart types means the agent can eventually produce bar charts, heatmaps, pie charts, radar, etc. -- not just sparklines. This matches the RJSF analogy: one library, many form types.

5. **Tree-shakeable packages**: Only import `@nivo/line` for the metrics use case. Add `@nivo/bar`, `@nivo/pie` later without upfront cost. Core + line is ~60-80KB -- reasonable.

6. **SVG by default**: Elements participate in CSS cascading. Can use CSS variables. Canvas variants available for performance-critical cases.

7. **Responsive built-in**: Every chart has a `Responsive*` variant that auto-sizes to container.

**Trade-off**: SVG re-rendering on every data append is less performant than uPlot's canvas for high-frequency updates. Mitigation: for the 2s polling interval with 150 data points, SVG performance is more than adequate. If we later need sub-second updates with thousands of points, we can use Nivo's Canvas variant (`@nivo/line` exports both `Line` and `LineCanvas`).

### For VAN-29 specifically

Use `@nivo/line` with `ResponsiveLine` for the sparkline. The `LineCanvas` variant is available if performance becomes an issue. The Nivo theme bridge hook (`useNivoTheme`) provides Chakra-aligned colors to all charts.

### Future extensibility

The `ChartSpec` abstraction from the tool layer maps naturally to Nivo components:

```typescript
type ChartSpec = {
  type: "line" | "bar" | "pie" | "heatmap" | "radar";
  data: unknown;  // Nivo-specific data shape per chart type
  config?: Record<string, unknown>;  // Nivo props passthrough
};
```

A `ChartRenderer` component dispatches on `type` to the corresponding Nivo component, passing `data`, `config`, and the shared Nivo theme. This is the charting equivalent of RJSF's `SchemaForm` -- one component, many chart types, config-driven.
