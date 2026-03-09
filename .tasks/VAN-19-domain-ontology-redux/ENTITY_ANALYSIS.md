# Entity Analysis — V1 vs V2

This document compares the current v1 ontology with the formal OWL ontology and OpenAPI spec to identify gaps and define the v2 entity set.

---

## V1 Entity Types (10)

These are the entity types currently represented as graph nodes in `src/graph/types.ts`:

| Entity         | Graph Node | API Source       | Notes                                |
| -------------- | ---------- | ---------------- | ------------------------------------ |
| adapter        | Yes        | `Adapter`        | Configured protocol adapter instance |
| bridge         | Yes        | `Bridge`         | MQTT-to-MQTT connection              |
| domainTag      | Yes        | `DomainTag`      | Named data point on device           |
| topicFilter    | Yes        | `TopicFilter`    | MQTT wildcard pattern                |
| dataPolicy     | Yes        | `DataPolicy`     | Payload validation policy            |
| behaviorPolicy | Yes        | `BehaviorPolicy` | Client behavior policy               |
| schema         | Yes        | `PolicySchema`   | JSON Schema / Protobuf definition    |
| script         | Yes        | `Script`         | Transformation logic                 |
| combiner       | Yes        | `Combiner`       | Data aggregation entity              |
| listener       | Yes        | `Listener`       | Network listener (MQTT endpoint)     |

## OWL Ontology Classes (13)

From `DOMAIN_ONTOLOGY.ttl` — the formal model maintained by the Edge frontend team:

| OWL Class                 | Namespace | Layer        | V1 Equivalent | Gap?        |
| ------------------------- | --------- | ------------ | ------------- | ----------- |
| `edge:Adapter`            | edge:     | Physical     | adapter       | -           |
| `edge:Device`             | edge:     | Physical     | _(none)_      | **Missing** |
| `edge:Tag`                | edge:     | Physical     | domainTag     | Rename only |
| `mqtt:Topic`              | mqtt:     | Broker       | _(none)_      | **Missing** |
| `mqtt:TopicFilter`        | mqtt:     | Broker       | topicFilter   | -           |
| `edge:NorthboundMapping`  | edge:     | Mapping      | _(flattened)_ | **Missing** |
| `edge:SouthboundMapping`  | edge:     | Mapping      | _(flattened)_ | **Missing** |
| `edge:Combiner`           | edge:     | Aggregation  | combiner      | -           |
| `edge:DataCombining`      | edge:     | Aggregation  | _(flattened)_ | **Missing** |
| `edge:AssetMapper`        | edge:     | Aggregation  | _(none)_      | **Missing** |
| `edge:Bridge`             | edge:     | Connectivity | bridge        | -           |
| `edge:BridgeSubscription` | edge:     | Connectivity | _(flattened)_ | **Missing** |
| `datahub:DataPolicy`      | datahub:  | DataHub      | dataPolicy    | -           |

### Classes NOT in OWL but in V1

| V1 Entity      | Why it exists in V1                     | In OWL? | Decision for V2                                |
| -------------- | --------------------------------------- | ------- | ---------------------------------------------- |
| behaviorPolicy | Graph visualization of DataHub policies | No      | **Keep** — valuable for policy impact analysis |
| schema         | Referenced by data/behavior policies    | No      | **Keep** — essential for validation chain      |
| script         | Referenced by policy pipelines          | No      | **Keep** — essential for transformation chain  |
| listener       | Network entry point visualization       | No      | **Keep** — useful for connectivity overview    |

### Classes NOT in V1 and NOT in OWL

| Entity          | API Type          | Why consider for V2?                                                                                                                                                                             |
| --------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Broker          | _(no API type)_   | Central entity that owns Topics and TopicFilters. Edge Broker is a singleton; remote brokers exist per Bridge. Conceptualizes the message bus that everything flows through. **Included in V2.** |
| ProtocolAdapter | `ProtocolAdapter` | Type/instance distinction — adapter types define capabilities, instances are configured connections                                                                                              |
| Event           | `Event`           | Not a graph entity — ephemeral log entries                                                                                                                                                       |
| ManagedAsset    | `ManagedAsset`    | Pulse cloud assets; AssetMapper already covers the mapping                                                                                                                                       |

---

## Conceptual Framework: The OT-to-IT Loop

Before diving into individual entity gaps, it's important to understand the system's fundamental purpose. HiveMQ Edge is an **OT-to-IT bridge through MQTT**.

### Two Worlds of Devices

**OT Devices** (Operational Technology) — physical industrial systems: boilers, PLCs, sensors, motors. Connected to Edge via **protocol adapters**. We know things about them: their protocol (Modbus, OPC-UA, S7), their data points (tags), their connection parameters.

**IT Devices** (Information Technology) — cloud applications, enterprise systems, dashboards, data lakes. Connected to brokers via MQTT. We know **nothing** about them — the broker abstracts them completely. They are identified only by their MQTT client ID (if at all).

### The Data Flow Loop

```
                    NORTHBOUND (OT → IT)
                    =====================

  OT Device ──adapter──→ Tag ──northbound mapping──→ Topic ──broker──→ IT Device
  (boiler)    (Modbus)   (temp)   (publish)          (factory/temp)    (cloud app)
                                                          │
                                                          ├──→ DataPolicy (validates/transforms)
                                                          │      └──→ Delivery.redirectTo(new topic) ──→ feedback!
                                                          │
                                                          └──→ Bridge ──→ Remote Broker ──→ IT Device
                                                                                            (enterprise)

                    SOUTHBOUND (IT → OT)
                    ====================

  IT Device ──broker──→ TopicFilter ──southbound mapping──→ Tag ──adapter──→ OT Device
  (cloud)               (factory/+/cmd)   (write)          (cmd)  (Modbus)   (boiler)
```

### Domain Taxonomy

The entities in the system fall into four distinct **roles**, not layers:

#### Orchestrators (singletons that own and manage resources)

| Orchestrator | What it owns                                     | Role                                             |
| ------------ | ------------------------------------------------ | ------------------------------------------------ |
| Edge Broker  | Topics, TopicFilters                             | Local MQTT message bus — the OT/IT meeting point |
| DataHub      | DataPolicies, BehaviorPolicies, Schemas, Scripts | Validates and transforms OT-to-IT traffic        |
| Pulse        | ManagedAssets                                    | Cloud platform integration, asset management     |

Orchestrators are system-level singletons. They don't flow data themselves — they own the resources that participate in data flow.

#### Connectors (data sources — the "entities" that bridge worlds)

| Connector | World | What it connects to                         | What it owns                              |
| --------- | ----- | ------------------------------------------- | ----------------------------------------- |
| Adapter   | OT    | OT Device via protocol (Modbus, OPC-UA, S7) | Device, Mappers (northbound + southbound) |
| Bridge    | IT    | Remote Broker via MQTT                      | BridgeSubscriptions                       |

Connectors are the gateways between the HiveMQ Edge system and the outside world. Adapters reach into the OT world; Bridges reach into the IT world.

#### Integration Points (data points — where data lives)

| Integration Point | Where     | Description                                               |
| ----------------- | --------- | --------------------------------------------------------- |
| Tag               | OT Device | Protocol-specific data point (e.g., `ns=3;s=Temperature`) |
| Topic             | Broker    | Exact MQTT topic string (e.g., `factory/floor1/temp`)     |
| TopicFilter       | Broker    | Wildcard pattern matching topics (e.g., `factory/+/temp`) |
| Device (OT)       | Adapter   | Physical system whose tags are exposed via adapter        |
| Device (IT)       | Broker    | Cloud/enterprise system, abstracted by broker (implicit)  |

Integration points are the data endpoints. Tags are where OT data originates; Topics are where it lands on the broker. TopicFilters are the subscription patterns that catch topics.

#### Mappers (route data between integration points)

| Mapper             | Sources                                       | Destination               | Owned by |
| ------------------ | --------------------------------------------- | ------------------------- | -------- |
| NorthboundMapper   | 1 Tag (from 1 Adapter)                        | 1 Topic                   | Adapter  |
| SouthboundMapper   | 1 TopicFilter                                 | 1 Tag (on 1 Adapter)      | Adapter  |
| Combiner           | N Tags/TopicFilters (from N Adapters/Bridges) | 1 Topic                   | System   |
| AssetMapper        | N sources (like Combiner)                     | 1 Pulse Asset             | Pulse    |
| BridgeSubscription | 1 TopicFilter                                 | 1 Topic (on other broker) | Bridge   |

**Key insight**: These are all the same concept at different levels of flexibility:

- **NorthboundMapper** = simplest case: 1 source → 1 destination, owned by 1 adapter
- **Combiner** = generalized mapper: N sources → 1 destination, owned by multiple entities. Since N could be 1, a Combiner is a more flexible NorthboundMapper.
- **AssetMapper** = specialized Combiner where the destination is a Pulse-managed asset
- **BridgeSubscription** = mapper between two brokers (local ↔ remote)

The "Aggregation Layer" in v1 was a misnomer — it's just the flexible case of mapping.

### The DataHub Feedback Loop

DataHub policies are **not leaf nodes** — they are active participants in the data flow that can create **implicit connectivity** back into the topic/filter graph.

**Data Policies** listen on a TopicFilter. When a matching Topic is published, the policy triggers and runs its `onSuccess` or `onFailure` pipeline. The key action is:

- **`Delivery.redirectTo(topic, applyPolicies?)`** — publishes the message to a NEW topic. This creates an implicit edge from the DataHub layer back into the broker/topic layer. If `applyPolicies: true`, the new topic is re-evaluated against all DataPolicies, enabling **cascading redirects** (up to 20 hops).

No other pipeline action creates topics. `System.log`, `Metrics.Counter.increment`, `Mqtt.UserProperties.add`, `Serdes.serialize/deserialize` all modify or observe — they don't publish.

**Behavior Policies** monitor IT devices (identified by `clientIdRegex`) and trigger on MQTT state transitions (`OnInboundConnect`, `OnInboundPublish`, `OnInboundSubscribe`, `OnDisconnect`). Their pipeline actions **cannot** use `Delivery.redirectTo` (it's `isDataOnly: true` — requires a message payload context). So behavior policies observe but don't create new topics.

**Implication for the ontology**: DataPolicy `onSuccess`/`onFailure` pipelines that contain `Delivery.redirectTo` create implicit edges: `DataPolicy → redirectsTo → Topic`. These must be extracted from policy definitions and represented in the graph. This is the only DataHub-to-broker feedback path.

```
DataPolicy
  ├── attachedTo → TopicFilter (input — what triggers it)
  ├── validates → Schema
  ├── executes → Script
  └── redirectsTo → Topic (output — only if Delivery.redirectTo in pipeline)
                      │
                      └──→ may trigger another DataPolicy (cascade)
```

---

## Gap Analysis

### 1. Device — Missing Intermediary

**Current**: Tags are directly associated with adapters. Tag names are simple protocol-specific identifiers (`ns=3;s=Temperature`, `holding-register-0`) — they do NOT embed device or adapter IDs in their path. Tags are scoped to adapters via the API path (`GET /adapters/{adapterId}/tags`).

**OWL model**: `Adapter → manages → Device → exposes → Tag`. Device is an explicit intermediary.

**API reality**: Devices have **no API representation**. The OpenAPI spec has no `/devices` endpoint and no `Device` schema. The adapter `config` contains connection parameters (host, port, URI) that point to the physical device, but there is no explicit device model.

**Conceptual model**: Despite having no API endpoint, Device is a real domain concept:

- A **Device** is the physical or virtual system that an adapter connects to.
- A **Device owns Tags** — the data points exposed by that device.
- An **Adapter owns NorthboundMappings and SouthboundMappings** — the data routing rules.
- The adapter connects to the device, reads its tags, and routes data via mappings.

The ownership chain is:

```
Adapter → manages → Device → exposes → Tag
Adapter → hasMapping → NorthboundMapping (reads from Tag, publishes to Topic)
Adapter → hasMapping → SouthboundMapping (subscribes to TopicFilter, writes to Tag)
```

**V2 decision**: Include Device as a **conceptual entity**. In the current API, there is a 1:1 relationship between adapter and device (one adapter connects to one device). The device can be represented as a derived node whose identity comes from the adapter it belongs to. Future API versions may introduce explicit device support — the ontology should be ready for that.

**Open question**: How to derive device identity. Options:

- **Option A**: 1:1 with adapter — every adapter implicitly has one device. Simple but may not reflect reality (an adapter could connect to a gateway with multiple sub-devices).
- **Option B**: Protocol-specific heuristics — e.g., OPC-UA tag paths may encode device structure in namespace/node hierarchy.
- **Recommendation**: Start with Option A (1:1). It's correct for the current API and can be refined later.

### 2. Broker — Missing Central Entity

**Current**: The Edge broker is completely implicit. There is no broker node in the v1 graph — topics and topic filters float as independent entities.

**OWL model**: The OWL ontology does not define a Broker class either. But the Edge architecture doc (`DOMAIN_MODEL.md`) describes the broker as the central message bus.

**Conceptual model**: The broker is the entity that **owns Topics and TopicFilters**:

- A NorthboundMapping publishes a Tag's value to a **Topic on the broker**.
- A SouthboundMapping subscribes to a **TopicFilter on the broker** and writes incoming messages to a Tag.
- DataPolicies attach to **TopicFilters on the broker**.
- BridgeSubscriptions forward messages between the local broker and a remote broker.

There are **two kinds of broker** in the system:

- **Edge Broker** — the local HiveMQ Edge MQTT broker. It owns all locally-published topics and topic filters.
- **Remote Broker** (via Bridge) — a remote MQTT broker that a Bridge connects to. It also owns topics and topic filters (the remote subscriptions).

Both can be conceptualized as a **"gateway to broker"** — they own some of the topic/topic filter entities. A Bridge is effectively a conduit between two broker instances.

**V2 decision**: Include **Broker** as a first-class entity with two instances:

- One **Edge Broker** node (always present, singleton)
- One **Remote Broker** node per Bridge connection

Ownership:

```
Edge Broker → owns → Topic (locally published topics)
Edge Broker → owns → TopicFilter (local subscriptions)
Remote Broker → owns → Topic (remote topics)
Remote Broker → owns → TopicFilter (remote subscriptions)
Bridge → connects → Edge Broker ↔ Remote Broker
```

**Open question**: Should Broker be a concrete entity in the ontology, or a visual grouping/container? A concrete entity adds a node to the graph (useful for showing the central hub). A container groups its owned topics visually but isn't a node itself.

### 3. MQTT Topic — Missing First-Class Entity

**Current**: Topics exist only as string properties on NorthboundMappings (`topic` field) and Combiners (`destination.topic`). They are not graph nodes.

**OWL model**: `mqtt:Topic` is a first-class class with `mqtt:topicPath` data property. It is the range of `edge:destinationTopic` (northbound) and `edge:combiningDestination`.

**API reality**: The API does not have a `/topics` endpoint. Topics are extracted from mappings, combiners, and bridge subscriptions.

**V2 decision**: Include Topic as a **derived entity** — collect all unique topic strings from northbound mappings, combiner destinations, and bridge subscription destinations. Topics are **owned by a Broker** (Edge or Remote). This is the critical node that connects the physical layer (tags) to the broker layer (policies, bridges).

### 4. NorthboundMapping / SouthboundMapping — Flattened Relationships

**Current**: The assembler creates direct edges `DomainTag → TopicFilter` (publishesTo) and `TopicFilter → DomainTag` (writesTo). The mapping entity itself is not a node.

**OWL model**: `NorthboundMapping` has exactly one `sourceTag` and one `destinationTopic`. It's a first-class entity mediating between Tag and Topic.

**Ownership**: Mappings are **owned by the Adapter**, not the Tag or the Device. The adapter defines which of its device's tags get published where (northbound) and which broker messages get written to which tags (southbound).

```
Adapter → hasNorthboundMapping → NorthboundMapping
  NorthboundMapping → sourceTag → Tag (read from device)
  NorthboundMapping → destinationTopic → Topic (publish to broker)

Adapter → hasSouthboundMapping → SouthboundMapping
  SouthboundMapping → sourceFilter → TopicFilter (subscribe on broker)
  SouthboundMapping → destinationTag → Tag (write to device)
```

**V2 decision**: **Two options** to evaluate:

- **Option A**: Promote mappings to first-class nodes. More faithful to the ontology but adds visual clutter — every tag-to-topic connection becomes three nodes instead of an edge.
- **Option B**: Keep mappings as edge metadata (current approach) but enrich the edge data with mapping properties (QoS, timestamp inclusion, user properties). Mappings appear in the class/schema view but not in the instance view.

**Recommendation**: Option B for the instance graph, Option A available in the schema/class view. The user can toggle.

### 5. BridgeSubscription — Flattened Relationships

**Current**: Bridge subscriptions are flattened into direct edges between TopicFilter and Bridge nodes.

**OWL model**: `BridgeSubscription` is a first-class entity with `subscriptionFilter` (→ TopicFilter) and `subscriptionDestination` (→ Topic).

**V2 decision**: Same approach as mappings — edge metadata in instance view, first-class in schema view.

### 6. DataCombining — Flattened Relationships

**Current**: Combiner sources are represented as direct edges `Adapter/Bridge → Combiner` (combines).

**OWL model**: `DataCombining` is a first-class entity within a Combiner, with its own source and destination properties.

**V2 decision**: Same approach as mappings.

### 7. AssetMapper — Missing Specialization

**Current**: Not represented. The API reuses the Combiner model for asset mappers.

**OWL model**: `AssetMapper rdfs:subClassOf Combiner` — a formal subclass.

**V2 decision**: Include as a subtype of Combiner. Visually distinguish with a different icon/badge. Detect via the Pulse asset mapper API endpoints.

---

## MQTT Wildcard Matching — Critical Cross-Cutting Concern

The OWL ontology explicitly documents this as a limitation:

> `mqtt:matches` (TopicFilter → Topic) cannot be derived by an OWL reasoner. It requires MQTT wildcard evaluation code.

**V1 handling**: The assembler infers `TopicFilter → DataPolicy` connections via `matching.topicFilter` string comparison. But it does not compute which exact Topics a TopicFilter matches.

**V2 requirement**: With Topic as a first-class entity, we need a runtime wildcard matcher. The `mqtt-match` npm package (referenced in the OWL README) can evaluate `+` (single level) and `#` (multi-level) wildcards.

**Algorithm**: After collecting all Topics and TopicFilters, compute matches:

```
for each topicFilter:
  for each topic:
    if mqttMatch(topicFilter.pattern, topic.path):
      add edge: topicFilter → topic (matches)
```

---

## Proposed V2 Entity Set (17 types)

Organized by taxonomy role rather than arbitrary layers:

### Orchestrators (3)

| #   | Entity      | Source                            | New?                     |
| --- | ----------- | --------------------------------- | ------------------------ |
| 1   | Edge Broker | Derived (singleton)               | **New**                  |
| 2   | DataHub     | Derived (singleton)               | **New** (implicit in v1) |
| 3   | Pulse       | Derived (singleton, if activated) | **New**                  |

**Note**: These are system-level singletons, not API entities. They exist to express ownership: Edge Broker owns topics/filters, DataHub owns policies/schemas/scripts, Pulse owns managed assets.

### Connectors (2)

| #   | Entity  | Source        | New? |
| --- | ------- | ------------- | ---- |
| 4   | Adapter | API `Adapter` | -    |
| 5   | Bridge  | API `Bridge`  | -    |

### Integration Points (4)

| #   | Entity      | Source                                 | New?    |
| --- | ----------- | -------------------------------------- | ------- |
| 6   | OT Device   | Derived (1:1 with adapter)             | **New** |
| 7   | Tag         | API `DomainTag`                        | Rename  |
| 8   | Topic       | Derived from mappers/combiners/bridges | **New** |
| 9   | TopicFilter | API `TopicFilter`                      | -       |

**Note**: Tag names are simple protocol-specific identifiers (e.g., `ns=3;s=Temperature`, `holding-register-0`) — they do NOT embed device or adapter IDs.

**Note**: IT Devices are NOT modeled — the broker is the boundary of our knowledge. Topics and TopicFilters are NOT unique across the topology — identity is `(source, name)`, not just `name`.

### Mappers (5)

| #   | Entity             | Source                   | New?    |
| --- | ------------------ | ------------------------ | ------- |
| 10  | NorthboundMapper   | API `NorthboundMapping`  | **New** |
| 11  | SouthboundMapper   | API `SouthboundMapping`  | **New** |
| 12  | Combiner           | API `Combiner`           | -       |
| 13  | AssetMapper        | API (Pulse asset mapper) | **New** |
| 14  | BridgeSubscription | API `BridgeSubscription` | **New** |

All mappers are **first-class nodes** in both schema and instance views. Combiner is the generalized case of NorthboundMapper (N sources → 1 topic instead of 1 → 1). AssetMapper is a specialized Combiner where the destination is a Pulse asset. The mapper unification is clearest when all are visible as concrete nodes of the same taxonomic role.

### Policies & Resources (4, owned by DataHub)

| #   | Entity         | Source               | New? |
| --- | -------------- | -------------------- | ---- |
| 15  | DataPolicy     | API `DataPolicy`     | -    |
| 16  | BehaviorPolicy | API `BehaviorPolicy` | -    |
| 17  | Schema         | API `PolicySchema`   | -    |
| 18  | Script         | API `Script`         | -    |

**Note**: DataPolicy has implicit `redirectsTo → Topic` edges extracted from `Delivery.redirectTo` in pipelines (static targets = concrete edges; interpolated targets = pattern edges with runtime matching).

**Note**: BehaviorPolicy `monitors` is a **property** (`clientIdRegex: string`), not an edge — there are no IT Device nodes to connect to.

**Total: 18 entity types** (3 orchestrators + 2 connectors + 4 integration points + 5 mappers + 4 policies/resources).

**Dropped from v1**: Listener — infrastructure, not a domain entity. DataCombining — folded into the Combiner/mapper concept rather than being a separate entity type.

---

## Proposed V2 Relationships

### Orchestrator Ownership

| From        | Relationship | To             | Cardinality | Notes                         |
| ----------- | ------------ | -------------- | ----------- | ----------------------------- |
| Edge Broker | owns         | Topic          | 1:N         | Locally-published topics      |
| Edge Broker | owns         | TopicFilter    | 1:N         | Local subscriptions           |
| DataHub     | owns         | DataPolicy     | 1:N         | Policy management             |
| DataHub     | owns         | BehaviorPolicy | 1:N         | Client behavior monitoring    |
| DataHub     | owns         | Schema         | 1:N         | Payload structure definitions |
| DataHub     | owns         | Script         | 1:N         | Transformation logic          |
| Pulse       | owns         | ManagedAsset   | 1:N         | Cloud-defined assets          |

### Connector → Integration Point

| From      | Relationship | To            | Cardinality | V1 Equiv              |
| --------- | ------------ | ------------- | ----------- | --------------------- |
| Adapter   | manages      | OT Device     | 1:1 (\*)    | _(new)_               |
| OT Device | exposes      | Tag           | 1:N         | hasTags (adapter→tag) |
| Bridge    | connectsTo   | Remote Broker | 1:1         | _(new)_               |

(\*) 1:1 for now — one adapter connects to one OT device. May become 1:N if the API evolves.

### Mapper Relationships

| From               | Relationship        | To                 | Cardinality | V1 Equiv                 |
| ------------------ | ------------------- | ------------------ | ----------- | ------------------------ |
| Adapter            | hasNorthboundMapper | NorthboundMapper   | 1:N         | _(flattened)_            |
| NorthboundMapper   | sourceTag           | Tag                | N:1         | _(flattened)_            |
| NorthboundMapper   | destinationTopic    | Topic              | N:1         | publishesTo (tag→filter) |
| Adapter            | hasSouthboundMapper | SouthboundMapper   | 1:N         | _(flattened)_            |
| SouthboundMapper   | sourceFilter        | TopicFilter        | N:1         | _(flattened)_            |
| SouthboundMapper   | destinationTag      | Tag                | N:1         | writesTo (filter→tag)    |
| Combiner           | sourceEntities      | Adapter/Bridge     | N:M         | combines                 |
| Combiner           | destinationTopic    | Topic              | N:1         | outputs                  |
| AssetMapper        | destinationAsset    | ManagedAsset       | N:1         | _(new)_                  |
| Bridge             | hasSubscription     | BridgeSubscription | 1:N         | _(flattened)_            |
| BridgeSubscription | subscriptionFilter  | TopicFilter        | N:1         | subscribes               |
| BridgeSubscription | subscriptionDest    | Topic              | N:1         | forwards                 |

### Broker Matching

| From        | Relationship | To    | Cardinality | V1 Equiv         |
| ----------- | ------------ | ----- | ----------- | ---------------- |
| TopicFilter | matches      | Topic | N:M         | _(not computed)_ |

Computed at runtime using MQTT wildcard evaluation (`mqtt-match`).

### Policy Relationships

| From           | Relationship | To          | Cardinality | V1 Equiv     |
| -------------- | ------------ | ----------- | ----------- | ------------ |
| DataPolicy     | attachedTo   | TopicFilter | N:1         | matches      |
| DataPolicy     | validates    | Schema      | N:M         | validates    |
| DataPolicy     | executes     | Script      | N:M         | executes     |
| DataPolicy     | redirectsTo  | Topic       | 0..N        | _(new)_      |
| BehaviorPolicy | deserializes | Schema      | N:M         | deserializes |
| BehaviorPolicy | executes     | Script      | N:M         | executes     |

**Note on `redirectsTo`**: Extracted by scanning `onSuccess`/`onFailure` pipeline operations for `Delivery.redirectTo` actions. Static targets create concrete edges. Interpolated targets (e.g., `factory/${clientId}/alerts`) create edges to a "pattern topic" node; the assembler then checks if existing TopicFilters or Tags match the interpolation and creates dynamic `matchesPattern` edges.

**Note on `monitors`**: BehaviorPolicy `clientIdRegex` is a **node property**, not an edge. No IT Device nodes exist — the broker is the boundary of our knowledge.

---

## Resolved Decisions

### Entity Design

1. **Broker → Concrete node.** Brokers are concrete graph nodes, not visual containers. They sit at the centre of the OT→IT flow and make ownership of topics/filters explicit.

2. **IT Device → Not modeled.** IT devices are implicit — the broker is the boundary of our knowledge. Even with BehaviorPolicy `clientIdRegex`, there is no certainty any policy will ever be triggered by a matching client. No phantom nodes.

3. **OT Device → 1:1 with Adapter.** Works in practice. The reason Device exists as a separate concept is audience: OT engineers talk about the "boiler," IT/MQTT engineers talk about the "protocol adapter." Same physical thing, different perspective. The ontology bridges both vocabularies.

4. **ProtocolAdapter → Excluded.** It's just a type/template, not a domain entity. No value in adding graph complexity for metadata.

5. **Listener → Excluded.** Infrastructure, not a domain entity. Can be revisited in a future "infrastructure view" if needed.

### Relationship Design

6. **Mappers → First-class nodes.** All mappers (NorthboundMapper, SouthboundMapper, Combiner, AssetMapper, BridgeSubscription) should be concrete nodes, not enriched edges. Reasons:
   - The mapper unification (NorthboundMapper ⊂ Combiner ⊃ AssetMapper) is clearer when they're all visible as the same kind of entity.
   - React Flow supports custom edge components (mid-edge labels/widgets), but multi-source edges are not native — a mapper node with multiple incoming edges is a cleaner model for Combiners.
   - Start with nodes; refactor to edge components if the layout proves too cluttered. Keep the option open.

7. **Topics/TopicFilters → NOT unique across the topology.** Same topic string from different sources = different Topic instances. Same tag name on different adapters = different Tag instances. Each instance is scoped to its source (broker, adapter). Identity = `(source, name)`, not just `name`. This affects node IDs and deduplication logic in the assembler.

### DataHub Feedback Loop

8. **Redirect targets → Both static and dynamic.** Static redirect targets create concrete `DataPolicy → redirectsTo → Topic` edges. Interpolated targets (e.g., `factory/${clientId}/alerts`) create a redirect edge to a "pattern topic" node. At runtime, the assembler can check if any existing TopicFilters or Tags match the interpolation pattern and create dynamic `matchesPattern` edges. Two-pass approach: first extract all redirects, then resolve what we can.

9. **Cascade chains → Must stay a DAG.** React Flow requires a directed acyclic graph. Policy redirect chains must be detected and cycle-broken during assembly. If `Policy A → redirects to Topic X → triggers Policy B → redirects to Topic Y → triggers Policy A`, the cycle must be detected and the back-edge dropped (with a visual indicator that a cycle was truncated). The 20-hop depth limit from the API provides a natural ceiling.

10. **BehaviorPolicy → No IT Device target.** `monitors` becomes a property (`clientIdRegex: string`) on the BehaviorPolicy node, not an edge to another entity. The behavior trigger remains "vague" — it describes a pattern, not a concrete connection. Broker discoverability is a future feature, not yet implemented.

---

## Remaining Open Questions

1. **Mapper node visual weight**: With all mappers as nodes, a simple adapter with 5 tags and 5 northbound mappings produces 15 nodes (1 adapter + 1 device + 5 tags + 5 mappers + some topics). Is this acceptable, or do we need a collapse/expand mechanism for mapper nodes? The schema view will always show the full picture, but the instance view might need density controls.

2. **Topic instance scoping**: We decided topics are not unique — `(source, name)` is the identity. But what exactly is "source" for a Topic? The broker it lives on? The mapper that created it? For NorthboundMapper destinations, the source is the Edge Broker. For BridgeSubscription destinations, the source is the remote broker. What about Combiner destinations? They publish to the Edge Broker too. Need a clear rule for topic provenance.

3. **Remote Broker identity**: Remote brokers are derived 1:1 from Bridges. But a Bridge has connection details (host, port, clientId). Should the Remote Broker node display these, or just the bridge name? The Remote Broker is conceptually separate from the Bridge (the broker is the remote system; the bridge is the local connection to it), but they share the same API entity.
