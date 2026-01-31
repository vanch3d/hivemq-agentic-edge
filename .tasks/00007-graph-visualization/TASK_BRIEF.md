# Task Brief: Domain Graph Visualization

## Context

The HiveMQ Edge domain is fundamentally a data flow graph. Devices connect to adapters, adapters expose tags, tags map to MQTT topics via northbound/southbound mappings, topics are filtered by topic filters, validated by data hub policies, bridged to remote brokers, and combined into Pulse assets. These relationships form an explicit graph-based ontology.

Task 00006 (Edge Agentic) introduces a conversational AI agent with query tools that return structured results. The tool result schema includes a `display` discriminant (`'text' | 'table' | 'graph'`), with `'graph'` designed as a forward-compatible placeholder. This task implements the graph renderer and the `queryGraph` tool.

## Requirements

1. Build a reusable `ChatGraph` component using **React Flow** (`@xyflow/react`) that renders inline in the chat drawer (400px wide, ~300px tall).
2. Use **WebCola** (`webcola`) for constraint-based automatic layout — better than pure force-directed for directed data flows with hierarchical structure.
3. Define **custom node types** per domain entity (adapter, tag, topic, bridge, policy, combiner, etc.) with color coding and status indicators.
4. Implement a `queryGraph` client tool with scoped graph queries (adapter topology, data flow, policy impact, etc.) that assembles cross-domain data from multiple SDK calls.
5. The graph must be interactive: pan, zoom, click-to-inspect, and optionally feed selected entities back into the conversation.
6. Graph rendering integrates with the existing chat message rendering pipeline (`display: 'graph'` in tool results).

## Dependencies

- **Task 00006** (Edge Agentic): Provides the chat infrastructure, tool framework, message rendering pipeline, and the `display` discriminant in tool results. The `ChatGraph` component plugs into `message-bubble.tsx` alongside `ChatTable`.
- **Task 00005** (Domain Ontology): Provides the domain model reference used to define node types, edge relationships, and graph scopes.

## User Decisions

- **Layout engine**: WebCola (constraint-based, good for directed hierarchical graphs)
- **Placement**: Inline in chat drawer, same pattern as ChatTable
- **Scope**: Can be executed as a parallel task to 00006 Phase 3+, but requires Phase 2 (basic chat UI) to be complete for integration testing
