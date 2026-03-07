# VAN-30: Scalability of Domain Ontology Graph Visualization

## Problem

Two scalability challenges:

1. **High-cardinality entities**: Adapters can have 1000+ tags, each producing NB mappers and topics. Current approach renders everything at once.
2. **Layout algorithm**: WebCola constraint solver degrades beyond ~300 nodes. `avoidOverlaps` already disabled (was O(n^2)).

Realistic scenario: 5 adapters x 200 tags = 1000 tags + 1000 NB mappers + 1000 topics + edges = 3000+ nodes. Layout multi-second, rendering stutters, visual result is unreadable.

## Objectives

1. Investigate limitations of React Flow and layout algo (webcola and alternatives)
2. Investigate graph-based solutions for virtualizing data loading/rendering on request
3. Investigate bespoke solutions leveraging APIs, domain ontology, and React Flow
4. Investigate React Flow tools: contextual zoom (adaptive node rendering by zoom level), sub-flows (collapsible groups combined with dynamic grouping/hiding)
5. Investigate different visual and interactive paradigms for ontology visualization
6. Find a balance between "full picture" and on-demand content exploration

## Scope

- Solutions are primarily for the **instance graph** (grows with deployment)
- The **schema graph** is bounded by entity type count and is manageable without changes
