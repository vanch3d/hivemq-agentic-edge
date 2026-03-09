# DataHub Policy Model: Ontology Gap Analysis

> Pre-Phase 2 investigation. The current ontology under-represents the DataHub policy model.
> The API itself is under-specified — the full shape lives in the DataHub extension of the
> main HiveMQ Edge product. This document captures what we know and what's missing.
>
> Sources: local `server/ontology/datahub.md`, API types, assembler code, and the
> `hivemq/hivemq-edge` repo (`feat/EDG-40/technical-documentation` branch — frontend
> DataHub extension, OpenAPI specs, FSM definitions, function specs).

---

## 1. Current Ontology Model (flat)

```
DataHub → owns → DataPolicy → attachedTo → TopicFilter
                             → validates  → Schema
                             → executes   → Script
                             → redirects  → Topic

DataHub → owns → BehaviorPolicy → deserializes → Schema
                                → executes     → Script
```

Policies are modeled as mostly flat nodes with direct edges to resources.
No intermediate entities. No pipeline structure. No FSM transitions.

---

## 2. Full DataHub Domain Model (from research)

### 2.1 Data Policy — full structure

```
DataPolicy
  ├─ matching
  │   └─ topicFilter: string (MQTT wildcard)         ← modeled as attachedTo → TopicFilter
  │
  ├─ validation
  │   └─ validators[]                                 ← NOT modeled as entity
  │       ├─ type: "SCHEMA"
  │       ├─ strategy: ALL_OF | ANY_OF                ← NOT modeled (missing from API too)
  │       └─ schemas: SchemaReference[]
  │           └─ { schemaId, version }                ← version NOT captured
  │
  ├─ onSuccess: DataPolicyAction
  │   └─ pipeline: PolicyOperation[]                  ← NOT modeled
  │
  └─ onFailure: DataPolicyAction
      └─ pipeline: PolicyOperation[]                  ← NOT modeled
```

### 2.2 Behavior Policy — full structure

```
BehaviorPolicy
  ├─ matching
  │   └─ clientIdRegex: string                        ← property only
  │
  ├─ behavior                                         ← NOT modeled
  │   ├─ id: "Mqtt.events" | "Publish.duplicate" | "Publish.quota"
  │   └─ arguments: { minPublishes?, maxPublishes? }  (Publish.quota only)
  │
  ├─ deserialization                                  ← partially modeled
  │   ├─ publish: { schema: SchemaReference }
  │   └─ will: { schema: SchemaReference }
  │
  └─ onTransitions[]                                  ← NOT modeled
      └─ BehaviorPolicyOnTransition
          ├─ fromState: string
          ├─ toState: string
          └─ [EventType]: BehaviorPolicyOnEvent
              └─ pipeline: PolicyOperation[]
```

### 2.3 PolicyOperation — the missing junction entity

```
PolicyOperation
  ├─ id: string              (unique within pipeline)
  ├─ functionId: string      (built-in function OR fn:<scriptId>)
  └─ arguments: object       (may reference schemaId, topic, etc.)
```

Every pipeline step is a PolicyOperation. The `functionId` determines what it does
and what its arguments reference:

| functionId                | Terminal | Data-only | References | Arguments                               |
| ------------------------- | -------- | --------- | ---------- | --------------------------------------- |
| System.log                | No       | No        | —          | level, message (interpolation)          |
| Metrics.Counter.increment | No       | No        | —          | metricName, incrementBy                 |
| Mqtt.UserProperties.add   | No       | No        | —          | name, value                             |
| Serdes.deserialize        | No       | Yes       | Schema     | schemaId, schemaVersion                 |
| Serdes.serialize          | No       | Yes       | Schema     | schemaId, schemaVersion                 |
| Delivery.redirectTo       | **Yes**  | Yes       | Topic      | topic (interpolation), applyPolicies    |
| Mqtt.drop                 | **Yes**  | No        | —          | reasonString (interpolation)            |
| Mqtt.disconnect           | **Yes**  | No        | —          | (none)                                  |
| fn:\<scriptId\>           | No       | Yes       | Script     | (none, script receives publish+context) |

**Key distinctions:**

- **Terminal** functions end the pipeline (must be last).
- **Data-only** functions require a publish message → cannot be used in behavior policy event transitions.
- `fn:<scriptId>` is the pattern for user-defined transformation scripts.
- `Serdes.deserialize/serialize` reference schemas but are **built-in** (not user scripts).
- The main Edge frontend has a **composite** `DataHub.transform` that expands to: `Serdes.deserialize → fn:<script1> → ... → Serdes.serialize`. This is UI-only, not a backend function.

### 2.4 FSM Behavior Models

Three built-in FSM models, each defining valid states and transitions:

**Mqtt.events** (basic MQTT lifecycle):

```
States: Initial(I) → Connected(M) → Disconnected(S)

Transitions:
  Initial → Connected        on Mqtt.OnInboundConnect
  Connected → Connected      on Mqtt.OnInboundSubscribe
  Connected → Connected      on Mqtt.OnInboundPublish
  Connected → Connected      on Mqtt.OnInboundDisconnect
  Connected → Disconnected   on Connection.OnDisconnect
```

**Publish.duplicate** (duplicate payload detection):

```
States: Initial(I) → Connected(M) → NotDuplicated(M) ↔ Duplicated(M) → Violated(F) | Disconnected(S)

Transitions:
  Initial → Connected              on Mqtt.OnInboundConnect
  Connected → NotDuplicated        on Mqtt.OnInboundPublish
  NotDuplicated → NotDuplicated    on Mqtt.OnInboundPublish  [guard: isDifferentPayload]
  NotDuplicated → Duplicated       on Mqtt.OnInboundPublish  [guard: isSamePayload]
  Duplicated → NotDuplicated       on Mqtt.OnInboundPublish  [guard: isDifferentPayload]
  Duplicated → Duplicated          on Mqtt.OnInboundPublish  [guard: isSamePayload]
  Duplicated → Violated            on Connection.OnDisconnect
  NotDuplicated → Violated         on Connection.OnDisconnect [guard: anyMessageDuplicate]
  NotDuplicated → Disconnected     on Connection.OnDisconnect
  Connected → Disconnected         on Connection.OnDisconnect
```

**Publish.quota** (publish rate limiting):

```
States: Initial(I) → Connected(M) → Publishing(M) → Violated(F) | Disconnected(S)
Arguments: minPublishes (int, default 0), maxPublishes (int, default -1 = unlimited)

Transitions:
  Initial → Connected          on Mqtt.OnInboundConnect
  Connected → Publishing       on Mqtt.OnInboundPublish  [guard: isMaxPublishNotZero]
  Publishing → Violated        on Mqtt.OnInboundPublish  [guard: isPublishCountMoreThanOrEqualToMax]
  Publishing → Publishing      on Mqtt.OnInboundPublish
  Connected → Violated         on Connection.OnDisconnect [guard: isPublishCountLessThanMin]
  Publishing → Violated        on Connection.OnDisconnect [guard: isPublishCountLessThanMin]
  Connected → Disconnected     on Connection.OnDisconnect
  Publishing → Disconnected    on Connection.OnDisconnect
```

State types: I = Initial, M = Intermediate, S = Success, F = Failed.
Guards are built-in to the FSM model — not user-configurable.
Wildcard patterns: `Any.*` (any state), `Any.Success`, `Any.Failed`.

### 2.5 Transition Events

| Event                    | Packet     | Available for          |
| ------------------------ | ---------- | ---------------------- |
| Event.OnAny              | any        | catch-all              |
| Connection.OnDisconnect  | —          | always                 |
| Mqtt.OnInboundConnect    | CONNECT    | behavior only          |
| Mqtt.OnInboundDisconnect | DISCONNECT | behavior only          |
| Mqtt.OnInboundPublish    | PUBLISH    | both (data + behavior) |
| Mqtt.OnInboundSubscribe  | SUBSCRIBE  | behavior only          |

Not all functions are available for all events — `supportedEvents[]` in function metadata restricts this.

### 2.6 Validation Strategies

```
DataPolicyValidation
  └─ validators[]
      └─ DataPolicyValidator
          ├─ type: "SCHEMA"
          └─ arguments
              ├─ strategy: "ALL_OF" | "ANY_OF"
              └─ schemas: SchemaReference[]
                  └─ { schemaId: string, version: number | "latest" }
```

- **ALL_OF**: all schemas must validate the payload
- **ANY_OF**: at least one schema must validate

Note: `strategy` and `SchemaReference` are NOT in the current OpenAPI spec (TODOs in Edge frontend).

### 2.7 String Interpolation

Template variables available in function arguments (`${variableName}`):

| Variable         | Type   | Data Policy | Behavior Policy |
| ---------------- | ------ | ----------- | --------------- |
| clientId         | string | Yes         | Yes             |
| topic            | string | Yes         | No              |
| policyId         | string | Yes         | Yes             |
| validationResult | string | Yes         | Yes             |
| timestamp        | long   | Yes         | Yes             |
| fromState        | string | No          | Yes             |
| toState          | string | No          | Yes             |
| triggerEvent     | string | No          | Yes             |

### 2.8 System Limits

| Resource                  | Limit        |
| ------------------------- | ------------ |
| Data policies             | 5,000 max    |
| Behavior policies         | 5,000 max    |
| Schemas                   | 5,000 max    |
| Scripts                   | 5,000 max    |
| Schema/Script definition  | 100 KB       |
| Delivery.redirectTo depth | 20 redirects |

---

## 3. Gap Summary: What's Missing from Ontology

### 3A. Entities to add

| Candidate Entity      | Role     | Source                                     | Rationale                                                                                     |
| --------------------- | -------- | ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| **pipelineOperation** | artifact | Derived from policy pipelines              | Junction between policy and resources. Has ordering, references function+schema+script+topic. |
| **fsmTransition**     | artifact | Derived from behavior policy onTransitions | `fromState × toState` pair, contains event→pipeline mappings. Natural expandable sub-graph.   |
| **validator**         | artifact | Derived from data policy validation        | Has type, strategy, ordered schema references. Currently flattened.                           |

### 3B. Relationships to add or refine

| Relationship       | From                       | To                | Status                                          |
| ------------------ | -------------------------- | ----------------- | ----------------------------------------------- |
| pipeline (ordered) | DataPolicy / fsmTransition | pipelineOperation | New — replaces flat `executes`                  |
| invokes            | pipelineOperation          | Script            | New — when `functionId` = `fn:<scriptId>`       |
| invokesBuiltIn     | pipelineOperation          | (property)        | New — when `functionId` is a built-in function  |
| deserializesUsing  | pipelineOperation          | Schema            | New — when `functionId` = `Serdes.deserialize`  |
| serializesUsing    | pipelineOperation          | Schema            | New — when `functionId` = `Serdes.serialize`    |
| redirectsTo        | pipelineOperation          | Topic             | New — when `functionId` = `Delivery.redirectTo` |
| validates          | validator                  | Schema            | Refine — add strategy + version                 |
| usesModel          | BehaviorPolicy             | (property)        | New — FSM behavior.id reference                 |
| transition         | BehaviorPolicy             | fsmTransition     | New — owns FSM transitions                      |
| onEvent            | fsmTransition              | pipelineOperation | New — event-keyed pipeline                      |

### 3C. Properties to add

| Entity            | Property                                                       | Notes               |
| ----------------- | -------------------------------------------------------------- | ------------------- |
| pipelineOperation | functionId, pipelinePhase (onSuccess/onFailure/onEvent), order | Core identity       |
| fsmTransition     | fromState, toState                                             | State pair          |
| validator         | strategy (ALL_OF/ANY_OF)                                       | Validation mode     |
| BehaviorPolicy    | behaviorId (Mqtt.events/Publish.duplicate/Publish.quota)       | FSM model reference |

### 3D. What NOT to model

| Concept                                         | Reason                                                      |
| ----------------------------------------------- | ----------------------------------------------------------- |
| FsmStateInformationItem                         | Runtime per-client state, not design-time topology          |
| FSM guards (isSamePayload, etc.)                | Built-in to behavior models, not user-configurable          |
| DataHub.transform composite                     | Frontend-only UI concept, expands to real operations        |
| Interpolation variables                         | Template syntax within string arguments, not graph entities |
| Function metadata (isTerminal, supportedEvents) | Validation/constraint metadata, not topology                |

---

## 4. Impact on Phase 2 Clustering

With the expanded model, the **Policy chain cluster** (Rule 6 from TASK_PLAN) becomes much richer:

### DataPolicy cluster (expanded)

```
DataPolicy
  ├─ TopicFilter (attachment)
  ├─ Validator[1..N]
  │   └─ Schema (with version + strategy)
  ├─ onSuccess Pipeline
  │   └─ PipelineOperation[1..N]
  │       ├─ → Script (fn:<id>)
  │       ├─ → Schema (Serdes.deserialize/serialize)
  │       └─ → Topic (Delivery.redirectTo)
  └─ onFailure Pipeline
      └─ PipelineOperation[1..N]
          └─ (same patterns)
```

### BehaviorPolicy cluster (expanded)

```
BehaviorPolicy
  ├─ Schema (publish deserialization)
  ├─ Schema (will deserialization)
  └─ FsmTransition[1..N]
      ├─ fromState × toState
      └─ EventPipeline[1..6]
          └─ PipelineOperation[1..N]
              ├─ → Script
              ├─ → Schema
              └─ → Topic
```

This is a **deep hierarchical sub-graph** — exactly the kind of structure that benefits from
progressive expand/collapse. The clustering rule should offer multiple levels:

- **Level 0** (collapsed): Policy node alone — "validate-temperature (data policy)"
- **Level 1** (summary): + TopicFilter + aggregate resource counts — "2 schemas, 1 script, 1 redirect"
- **Level 2** (pipelines visible): + Pipeline phases (onSuccess/onFailure or transitions) as sub-nodes
- **Level 3** (full detail): + Individual PipelineOperations with their resource edges

---

## 5. Next Step: Ontology Engineering

Add the new entity classes (`pipelineOperation`, `fsmTransition`, `validator`) to
`src/graph/ontology/v2-ontology.ts`, update the assembler to derive them, and
ensure the graph can represent the full policy chain structure.

This is prerequisite for meaningful Phase 2 policy clustering.
