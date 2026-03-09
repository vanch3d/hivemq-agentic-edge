# Task Plan — Domain Ontology v2

> See [TASK_BRIEF.md](./TASK_BRIEF.md) for requirements.
> See [ENTITY_ANALYSIS.md](./ENTITY_ANALYSIS.md) for the full gap analysis.
> See [ONTOLOGY_FORMAT.md](./ONTOLOGY_FORMAT.md) for the format decision.

---

## Architecture Decisions

1. **Format**: TypeScript object literal (see ONTOLOGY_FORMAT.md for rationale).
2. **Location**: New directory `src/graph/ontology/` containing the schema types and entity definitions.
3. **Feature flag**: A new `ontologyVersion` setting (`"v1" | "v2"`) in the settings schema, under a dedicated "Feature Flags" section separate from AI settings.
4. **Backward compatibility**: v1 and v2 coexist. The graph assembler, store, and components check the flag and dispatch to the appropriate code path.
5. **Listener dropped**: Not included in v2. Listeners are infrastructure, not domain entities.
6. **All mappers as first-class nodes**: NorthboundMapper, SouthboundMapper, Combiner, AssetMapper, BridgeSubscription are all concrete graph nodes (not enriched edges). Mapper unification is clearest when visible.
7. **Broker as concrete node**: Edge Broker (singleton) + Remote Broker (1 per Bridge). Owns Topics and TopicFilters. The broker is the OT/IT meeting point.
8. **OT Device 1:1 with Adapter**: Device exists because OT engineers talk about "the boiler" while IT engineers talk about "the adapter." Same thing, different vocabulary. Adapter owns mappings; Device owns tags.
9. **IT Device not modeled**: The broker is the boundary of our knowledge. No phantom nodes. BehaviorPolicy `clientIdRegex` is a node property, not an edge.
10. **Tag/Topic/TopicFilter identity is `(source, name)`**: Not unique across topology. Same topic string from different sources = different instances.
11. **DataHub feedback**: DataPolicy `Delivery.redirectTo` creates `redirectsTo → Topic` edges (static = concrete, interpolated = pattern + runtime matching). Chains must stay DAG — cycles are detected and back-edges dropped.
12. **Excluded**: Listener (infrastructure), ProtocolAdapter (just a type), DataCombining (folded into Combiner).

---

## Phases

### Phase 1 — Feature Flags Infrastructure

Extract feature flags from the AI settings section into their own configuration group. Add `ontologyVersion` flag.

**Files**:

| Action | File                                     | Purpose                                               |
| ------ | ---------------------------------------- | ----------------------------------------------------- |
| MODIFY | `server/api/settings.ts` (or equivalent) | Add `featureFlags` section to settings schema         |
| MODIFY | `src/settings.tsx`                       | Render feature flags section in settings UI           |
| CREATE | `src/hooks/use-feature-flags.ts`         | Convenience hook: `useFeatureFlag("ontologyVersion")` |
| MODIFY | `src/locales/en-US.json`                 | i18n keys for feature flag labels                     |

**Acceptance criteria**:

- Settings page shows a "Feature Flags" section with an "Ontology Version" dropdown (v1/v2)
- Default is v1 (no behavioral change)
- `useFeatureFlag("ontologyVersion")` returns the current value

**Progress**:

- [x] Add feature flags schema section to settings API
- [x] Add `useFeatureFlags` hook
- [x] Update settings UI (auto-renders from schema — no manual UI changes needed)
- [x] Add i18n keys
- [x] Verify lint + typecheck pass

---

### Phase 2 — Ontology Schema Definition

Define the TypeScript types for the ontology schema and populate the v2 entity definitions.

**Files**:

| Action | File                                | Purpose                                                            |
| ------ | ----------------------------------- | ------------------------------------------------------------------ |
| CREATE | `src/graph/ontology/types.ts`       | `EntityClass`, `RelationshipDef`, `DomainOntology`, etc.           |
| CREATE | `src/graph/ontology/v2-ontology.ts` | The actual v2 ontology definition (16 entities, all relationships) |
| CREATE | `src/graph/ontology/index.ts`       | Barrel export                                                      |

**Acceptance criteria**:

- All 18 entity types defined with properties, relationships, visual metadata
- TypeScript validates the ontology definition at compile time
- Relationships match the OWL ontology (where applicable) + v1 extensions
- Each entity has `apiType` or `derivedFrom` so the assembler knows where data comes from

**Progress**:

- [x] Define ontology types (`types.ts`)
- [x] Define Orchestrators (Edge Broker, DataHub, Pulse, Remote Broker)
- [x] Define Connectors (Adapter, Bridge)
- [x] Define Integration Points (OT Device, Tag, Topic, TopicFilter)
- [x] Define Mappers (NorthboundMapper, SouthboundMapper, Combiner, AssetMapper, BridgeSubscription) — all first-class nodes
- [x] Define Policies & Resources (DataPolicy, BehaviorPolicy, Schema, Script)
- [x] Define all relationships with correct cardinalities
- [x] Verify lint + typecheck pass

---

### Phase 3 — V2 Graph Assembler

New assembler that reads the ontology definition and API data to produce the graph. Replaces the procedural v1 assembler.

**Files**:

| Action | File                             | Purpose                                                                                    |
| ------ | -------------------------------- | ------------------------------------------------------------------------------------------ |
| CREATE | `src/graph/assembler-v2.ts`      | New declarative assembler driven by ontology definition                                    |
| CREATE | `src/graph/entity-derivation.ts` | Logic for derived entities (Device from adapter, Broker from bridges, Topic from mappings) |
| MODIFY | `src/graph/use-graph-data.ts`    | Branch on ontologyVersion flag to call v1 or v2 assembler                                  |
| MODIFY | `src/graph/types.ts`             | Add new entity types to `ENTITY_TYPES`, update `DomainEntityType`                          |

**Key design**:

- The v2 assembler iterates `ontology.entities` instead of hard-coding entity-specific logic
- Derived entities (Device, Broker, Topic) are computed via `entity-derivation.ts` functions
- MQTT wildcard matching is computed using the `mqtt-match` package (new dependency)
- Relationship edges are created by iterating `entity.relationships` and resolving references in the API data
- DataPolicy pipelines are scanned for `Delivery.redirectTo` to extract implicit `redirectsTo → Topic` edges

**Acceptance criteria**:

- V2 assembler produces a valid graph from the same API data as v1
- New entities (Device, Broker, Topic) appear as nodes
- Wildcard matching creates `TopicFilter → Topic` edges
- DataPolicy redirect targets create `DataPolicy → redirectsTo → Topic` edges (static + interpolated)
- Redirect chains are detected and cycle-broken to maintain DAG constraint
- Feature flag switches between v1 and v2 assembler

**Progress**:

- [x] ~~Add `mqtt-match` dependency~~ (implemented inline in entity-derivation.ts)
- [x] Implement entity derivation functions (Device, Broker, Topic)
- [x] Implement DataPolicy redirect extraction (static + interpolated targets)
- [x] Implement DAG cycle detection and back-edge dropping
- [x] Implement v2 assembler core loop
- [x] Wire v2 assembler into `use-graph-data.ts` behind feature flag
- [x] Update `types.ts` with new entity types
- [x] Verify lint + typecheck pass

---

### Phase 4 — Visual Updates

Add visual definitions (icons, colors, node components) for new entity types.

**Files**:

| Action | File                                          | Purpose                                                  |
| ------ | --------------------------------------------- | -------------------------------------------------------- |
| MODIFY | `src/graph/constants.ts`                      | Add icons, colors, edge styles, ranks for new entities   |
| CREATE | `src/graph/components/nodes/device-node.tsx`  | Device node component                                    |
| CREATE | `src/graph/components/nodes/broker-node.tsx`  | Broker node component (Edge + Remote)                    |
| CREATE | `src/graph/components/nodes/topic-node.tsx`   | Topic node component                                     |
| CREATE | `src/graph/components/nodes/mapping-node.tsx` | NorthboundMapping / SouthboundMapping node (schema view) |
| MODIFY | `src/graph/components/nodes/index.ts`         | Register new node types                                  |
| MODIFY | `src/graph/store.ts`                          | Add new view scopes for v2, update filtering logic       |

**Acceptance criteria**:

- All new entity types have distinct icons and colors
- New nodes render correctly in React Flow
- View scopes work with the expanded entity set
- v1 visual constants remain untouched (feature flag isolation)

**Progress**:

- [x] Define visual constants for new entities
- [x] Create node components for new entity types
- [x] Register new node types
- [x] Update view scopes and store filtering
- [x] Verify lint + typecheck pass

---

### Phase 5 — Schema/Class View

New visualization mode showing the ontology structure itself — entity classes as nodes, relationships as labeled edges.

**Files**:

| Action | File                        | Purpose                                                              |
| ------ | --------------------------- | -------------------------------------------------------------------- |
| CREATE | `src/graph/schema-graph.ts` | Transforms ontology definition into a React Flow graph (no API data) |
| MODIFY | `src/graph/store.ts`        | Add `viewMode: "instance" \| "schema"` state                         |
| MODIFY | Graph toolbar/controls      | Toggle between instance and schema view                              |
| MODIFY | `src/locales/en-US.json`    | i18n keys for schema view labels                                     |

**Acceptance criteria**:

- Schema view shows all entity classes as nodes (organized by taxonomy role)
- Relationships rendered as labeled directed edges
- Visual distinction between schema nodes and instance nodes
- Toggle between instance and schema view in the UI
- Schema view requires no API data (renders from ontology definition alone)

**Progress**:

- [x] Implement schema graph generator
- [x] Add viewMode state to store
- [x] Add UI toggle for instance/schema view
- [x] Style schema nodes distinctly from instance nodes
- [x] Add i18n keys
- [x] Verify lint + typecheck pass

---

### Phase 6 — LLM Ontology Prompt Generation

Auto-generate the LLM system prompt ontology text from the v2 ontology definition, replacing the hand-written markdown files.

**Files**:

| Action | File                                    | Purpose                                                  |
| ------ | --------------------------------------- | -------------------------------------------------------- |
| CREATE | `src/graph/ontology/prompt-renderer.ts` | Renders ontology definition as compact LLM-friendly text |
| MODIFY | `server/ontology/index.ts`              | Optionally use v2 prompt renderer when flag is set       |
| MODIFY | Server system prompt assembly           | Branch on feature flag                                   |

**Acceptance criteria**:

- V2 ontology prompt is auto-generated from the TypeScript definition
- LLM can answer domain questions using v2 prompt as effectively as v1
- Token budget stays within ~3,500 tokens (same as v1 target)

**Progress**:

- [x] Implement prompt renderer
- [x] Wire into system prompt assembly behind feature flag
- [x] Compare v1 vs v2 prompt for completeness (v2-core: 980w ≈ 1,300 tokens; v1 core: 854w ≈ 1,140 tokens)
- [x] Verify token budget (v2 total ~2,780 tokens, well within 3,500 target)
- [x] Verify lint + typecheck pass

---

### Phase 6b — Graph Performance & Layout Improvements

Post-implementation fixes after testing with a real HiveMQ Edge API.

**Performance**:

- WebCola `avoidOverlaps(true)` was causing 4.5s freezes (O(n²) per iteration)
- Replaced with two-phase layout: rank-grid seed (O(V+E)) + short Cola refinement without `avoidOverlaps`
- Freeze reduced from 4.5s → ~500ms

**Floating edges**:

- Implemented React Flow floating edge pattern (dynamic handle selection based on node positions)
- Nodes now have source + target handles on all 4 sides
- Edges connect to closest side, producing cleaner routing

**Rank ordering** (OT→IT data flow):

- Adapter/Bridge at rank 0 (symmetric connectors)
- OT Device/Remote Broker at rank 1 (what connectors reach)
- Tag(2) → Mappers(3) → Topic/Broker(4) → DataHub(5) → Policies(6) → Resources(7)

**Edge direction fixes** for NB/SB mappers:

- `Tag → feedsInto → NB Mapper → publishesTo → Topic` (was: mapper pointed back to tag)
- `TopicFilter → feedsInto → SB Mapper → writesTo → Tag` (was: mapper pointed back to filter)

**Files modified**: `layout.ts`, `constants.ts`, `entity-derivation.ts`, `base-node.tsx`, `schema-class-node.tsx`, `relationship-edge.tsx`
**Files created**: `floating-edge-utils.ts`
**Analysis**: `LAYOUT_ANALYSIS.md`

**Progress**:

- [x] Diagnose layout freeze (WebCola avoidOverlaps)
- [x] Two-phase layout: rank grid + Cola refinement
- [x] Reduce Cola iterations (100 → 11)
- [x] Fix ENTITY_RANK ordering (OT→IT data flow)
- [x] Implement floating edges (4-sided handles)
- [x] Fix NB/SB mapper edge directions (data flow alignment)
- [x] Verify lint + typecheck pass

---

### Phase 6c — Layout Worker (deferred)

Move the Cola refinement phase off the main thread via Web Worker or React Suspense pattern. This affects:

- Initial graph assembly (current ~500ms freeze)
- Direction changes (re-layout on toggle)
- Scope/flag switching (re-layout on scope change)
- Should show a loading indicator while computing

**This phase is deferred** — plan as a separate step.

---

### Phase 6d — i18n & Relationship Terminology Normalisation ✅

Hardcoded relationship strings appear in `entity-derivation.ts`, `assembler-v2.ts`, `v2-ontology.ts`, and `constants.ts` (edge styles). These need to be:

1. Extracted to a single relationship registry (source of truth)
2. Made i18n-ready via `en-US.json`
3. Normalised to follow ontology naming best practices

**Naming conventions** (from OWL/Schema.org/Neo4j research):

- Use **active-voice verb phrases**: `manages`, `exposes`, `validates`
- **Short specific verbs** over compound nouns: `owns` not `ownsPolicy`
- **No entity type in the relationship name** — the endpoints define the types
- One canonical direction, let the arrow handle the inverse
- lowerCamelCase for multi-word: `connectsTo`, `publishesTo`

**Current → Proposed relationship names**:

| Current                   | Source → Target                  | Proposed       | Rationale                                                 |
| ------------------------- | -------------------------------- | -------------- | --------------------------------------------------------- |
| `manages`                 | Adapter → OT Device              | `manages`      | Already good                                              |
| `exposes`                 | OT Device → Tag                  | `exposes`      | Already good                                              |
| `connectsTo`              | Bridge → Remote Broker           | `connectsTo`   | Already good                                              |
| `hasNorthboundMapper`     | Adapter → NB Mapper              | `owns`         | Structural ownership, no need to encode direction in name |
| `hasSouthboundMapper`     | Adapter → SB Mapper              | `owns`         | Same                                                      |
| `hasSubscription`         | Bridge → BridgeSub               | `owns`         | Same                                                      |
| `feedsInto`               | Tag → NB Mapper / TF → SB Mapper | `feeds`        | Shorter, still clear                                      |
| `publishesTo`             | NB Mapper → Topic                | `publishes`    | Drop preposition                                          |
| `writesTo`                | SB Mapper → Tag                  | `writes`       | Drop preposition                                          |
| `subscriptionFilter`      | BridgeSub → TopicFilter          | `filters`      | Verb, not noun                                            |
| `subscriptionDestination` | BridgeSub → Topic                | `delivers`     | Verb, specific                                            |
| `sourceEntities`          | Adapter/Bridge → Combiner        | `sources`      | Verb form                                                 |
| `destinationTopic`        | Combiner/Mapper → Topic          | `publishes`    | Same as NB mapper                                         |
| `ownsTopic`               | EdgeBroker → Topic               | `owns`         | Drop entity type                                          |
| `ownsFilter`              | EdgeBroker → TopicFilter         | `owns`         | Drop entity type                                          |
| `ownsPolicy`              | DataHub → DataPolicy             | `owns`         | Drop entity type                                          |
| `ownsBehaviorPolicy`      | DataHub → BehaviorPolicy         | `owns`         | Drop entity type                                          |
| `ownsSchema`              | DataHub → Schema                 | `owns`         | Drop entity type                                          |
| `ownsScript`              | DataHub → Script                 | `owns`         | Drop entity type                                          |
| `attachedTo`              | DataPolicy → TopicFilter         | `attachedTo`   | Already good                                              |
| `validates`               | DataPolicy → Schema              | `validates`    | Already good                                              |
| `executes`                | Policy → Script                  | `executes`     | Already good                                              |
| `redirectsTo`             | DataPolicy → Topic               | `redirects`    | Drop preposition                                          |
| `deserializes`            | BehaviorPolicy → Schema          | `deserializes` | Already good                                              |
| `matches`                 | TopicFilter → Topic              | `matches`      | Already good                                              |

**Files**:

| Action | File                                | Purpose                                                    |
| ------ | ----------------------------------- | ---------------------------------------------------------- |
| CREATE | `src/graph/relationships.ts`        | Single registry of all relationship keys + i18n label keys |
| MODIFY | `src/graph/entity-derivation.ts`    | Use relationship constants instead of string literals      |
| MODIFY | `src/graph/assembler-v2.ts`         | Use relationship constants instead of string literals      |
| MODIFY | `src/graph/ontology/v2-ontology.ts` | Update relationship names to match                         |
| MODIFY | `src/graph/constants.ts`            | Update EDGE_STYLES keys to match                           |
| MODIFY | `src/locales/en-US.json`            | Add `graph.relationship.*` i18n keys                       |

**Acceptance criteria**:

- All relationship strings come from a single `RELATIONSHIPS` constant
- Edge labels on the graph are i18n-ready (rendered via `t()`)
- No compound names like `ownsPolicy` — just `owns`
- `relationship-edge.tsx` uses i18n for label display

**Progress**:

- [x] Create relationship registry (`src/graph/relationships.ts`)
- [x] Normalise relationship names in assembler + derivation
- [x] Update ontology definition
- [x] Update edge styles (16 normalized keys, removed 11 old keys)
- [x] Add i18n keys (`graph.relationship.*`)
- [x] Update edge label rendering to use `t()`
- [x] Verify lint + typecheck pass

---

### Phase 6e — Schema Graph Spacing & Dark Mode ✅

Two fixes:

**a) Schema graph too compact**: The schema graph has few nodes with limited connectivity, so the default spacing makes it cramped. Added `spacingScale` parameter to `computeLayout` — applied to both `NODE_SPACING` and `RANK_SPACING` throughout the layout pipeline. Schema view passes `spacingScale=2` for wider distribution.

**b) Dark mode not implemented on graph**: Edge styles, arrow markers, Background, and MiniMap used hardcoded hex colors that didn't adapt to dark mode.

Solution: CSS custom properties in `src/graph/graph-tokens.css` with `:root` (light) and `.dark` (dark) variants. `next-themes` toggles the `.dark` class on `<html>`, so variables switch automatically. React Flow's `colorMode` prop synced with Chakra's `useColorMode()` for built-in component theming (controls, panes, handles).

**Files**:

| Action | File                                    | Purpose                                                                          |
| ------ | --------------------------------------- | -------------------------------------------------------------------------------- |
| CREATE | `src/graph/graph-tokens.css`            | CSS custom properties for edge colors, background, minimap (light/dark)          |
| MODIFY | `src/graph/layout.ts`                   | Apply `spacingScale` to nodeSpacing/rankSpacing throughout                       |
| MODIFY | `src/graph/store.ts`                    | Pass `spacingScale=2` for schema view; thread parameter through helpers          |
| MODIFY | `src/graph/constants.ts`                | EDGE_STYLES + DEFAULT_EDGE_STYLE use `var(--graph-*)` references                 |
| MODIFY | `src/graph/components/graph-canvas.tsx` | Import tokens CSS, sync `colorMode`, theme-aware Background/MiniMap/arrow marker |

**Progress**:

- [x] Add `spacingScale` parameter to `computeLayout`, apply to all spacing
- [x] Wire `spacingScale=2` for schema view in store
- [x] Create `graph-tokens.css` with light/dark CSS custom properties
- [x] Convert `EDGE_STYLES` from hardcoded hex to `var(--graph-*)` references
- [x] Convert arrow marker `fill` to CSS variable
- [x] Add `colorMode` prop to ReactFlow from `useColorMode()`
- [x] Theme-aware Background dots, MiniMap background/mask
- [x] Verify lint + typecheck pass

---

### Phase 7 — Query Tool Updates

Update the agent's query tools to leverage v2 ontology knowledge — richer labels, awareness of derived entities, proper topic references.

**Files**: Query tools in `src/agent/tools/query-*.ts` + snapshot helper.

**Result**: Audit found all query tools are already v2-compatible. No code changes needed.

- All 6 query tools use correct v2 entity type strings
- Graph store scope filtering covers both v1 and v2 types
- Snapshot helper is entity-type agnostic
- Labels are consistent with the v2 assembler
- Non-ontology entities (listeners, FSMs, metrics) correctly handled as data, not graph nodes

**Progress**:

- [x] Audit query tools for v2 compatibility — all clean
- [x] Update snapshot labels for new entities — already correct
- [x] Verify lint + typecheck pass

---

## Dependency Graph

```
Phase 1 (Feature Flags)
    ↓
Phase 2 (Ontology Schema)
    ↓
Phase 3 (V2 Assembler) ← requires Phase 2 types + Phase 1 flag
    ↓
Phase 4 (Visual Updates) ← requires Phase 3 entities
    ↓
Phase 5 (Schema View) ← requires Phase 2 definition + Phase 4 visuals
    ↓
Phase 6 (LLM Prompt) ← requires Phase 2 definition
    ↓
Phase 6b (Layout Fixes) ← requires real API testing
    ↓
Phase 6c (Layout Worker) ← deferred
    ↓
Phase 6d (i18n & Terminology) ✅ COMPLETE
    ↓
Phase 6e (Schema Spacing + Dark Mode) ✅ COMPLETE
    ↓
Phase 7 (Tool Updates) ← requires all above
```

Phases 5 and 6 are independent of each other and can be done in parallel once Phase 4 is complete.
