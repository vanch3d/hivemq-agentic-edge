# Layout Analysis — Node Ordering & Edge Direction

Based on manual layout from screenshot (2026-03-01), exploring the ideal
data-flow ordering and edge semantics.

---

## Question 1: Device vs Adapter/Bridge ordering

**Current**: OT Device (rank 0) ← Adapter (rank 1) — adapter is "after" device.
Edge: `Adapter → manages → OT Device` (points left).

**Your manual layout shows**: `Adapter → OT Device → Tags` (left to right).

This makes sense conceptually: the Adapter is the IT-side connector, the
Device is the OT-side thing it connects to, and Tags are what the device
exposes. The data flows from the physical world inward.

But there's a second reading: `Device → Adapter` where the device is the
source of data. The adapter is the software that reads from it.

### Option A: ADAPTER → DEVICE → TAGS (current direction, fix ranks)

```mermaid
graph LR
    A[Adapter<br/>test / simulation] -->|manages| D[OT Device<br/>test / simulation]
    D -->|exposes| T1[Tag<br/>tag1]
    D -->|exposes| T2[Tag<br/>test2]
    D -->|exposes| T3[Tag<br/>test]
```

Rank order: Adapter(0) → Device(1) → Tag(2)

Reads as: "The adapter manages the device, the device exposes tags."
This matches your manual layout exactly.

### Option B: DEVICE → ADAPTER (reverse edge direction)

```mermaid
graph LR
    D[OT Device] -->|connectedTo| A[Adapter]
    D -->|exposes| T1[Tag]
```

Rank order: Device(0) → Adapter(1) / Tag(1)

Reads as: "The device is the source, connected to an adapter."
More OT-engineer friendly but the adapter doesn't "come from" the device.

**Recommendation**: **Option A** — matches your manual layout and the
ontology semantics (adapter manages device, device exposes tags).

---

## Question 2: NB Mapper edge flow

**Current edges**:

```
Adapter → hasNorthboundMapper → NB Mapper
NB Mapper → sourceTag → Tag
NB Mapper → destinationTopic → Topic
```

**Problem**: The NB Mapper subtitle says "tag1 → teres" but the edges
don't flow that way visually. `sourceTag` points FROM mapper TO tag
(backwards from the data flow).

### Current (broken flow)

```mermaid
graph LR
    A[Adapter] -->|hasNB| NB[NB Mapper<br/>tag1 → teres]
    NB -->|sourceTag| T[Tag<br/>tag1]
    NB -->|destTopic| TP[Topic<br/>teres]
```

The mapper points TO its source tag — semantically correct ("this mapper
reads from this tag") but visually backwards.

### Proposed: Reverse sourceTag edge, inline mapper in flow

```mermaid
graph LR
    A[Adapter] -.->|owns| NB[NB Mapper]
    T[Tag<br/>tag1] -->|via| NB
    NB -->|publishesTo| TP[Topic<br/>teres]
    TP -->|ownedBy| EB[Edge Broker]
```

Rank order: Tag(2) → NB Mapper(3) → Topic(4) → Edge Broker(5)

The mapper sits between its source and destination in the flow.
The `owns` edge from Adapter is a secondary/structural edge (dashed),
not a flow edge.

### Alternative: Keep edges, just fix ranks

```mermaid
graph LR
    D[OT Device] -->|exposes| T[Tag]
    T ---|sourceTag| NB[NB Mapper]
    NB -->|destTopic| TP[Topic]
    A[Adapter] -.->|hasNB| NB
```

Same topology but Tag is ranked before NB Mapper in the flow axis.
The `hasNB` edge from Adapter is cross-flow (structural).

**Recommendation**: Reverse `sourceTag` edge direction to `Tag → readsFrom → NB Mapper`
or keep the edge but fix ranks so Tag < NB Mapper < Topic. The visual flow
should be: Tag → Mapper → Topic.

---

## Question 3: Bridge / Remote Broker ordering

**Current**: Bridge (rank 7) → connectsTo → Remote Broker (rank 8).

**Your manual layout shows**: `Remote Broker ← Bridge ← Combiner`
(remote broker on the LEFT, bridge in the middle).

This suggests: Remote Broker is the "external source/destination" and
the bridge is the connector to it, similar to how Adapter is the
connector to the Device.

### Option A: REMOTE BROKER → BRIDGE (mirror the device/adapter pattern)

```mermaid
graph LR
    RB[Remote Broker<br/>host:1883] -->|connectedVia| B[Bridge<br/>ffffff]
    B -->|sourceEntities| C[Combiner]
    A[Adapter] -->|sourceEntities| C
```

Reads as: "The remote broker connects via the bridge."
Mirrors: "The OT device connects via the adapter."

### Option B: Keep current direction but fix ranks

```mermaid
graph LR
    C[Combiner] -->|sources| B[Bridge]
    C -->|sources| A[Adapter]
    B -->|connectsTo| RB[Remote Broker]
```

Bridge and Remote Broker are at the right edge of the graph (outbound).

**Recommendation**: Your manual layout puts Remote Broker LEFT of Bridge.
This creates a nice symmetry:

```
Remote Broker → Bridge → ... → Adapter → OT Device
         (IT world)              (OT world)
```

The Edge Broker sits in the middle. Both sides "reach in" toward the
center. This is the most intuitive OT/IT convergence layout.

---

## Proposed Rank Order (LR)

```mermaid
graph LR
    subgraph "Layer 0 — External"
        RB[Remote Broker]
    end
    subgraph "Layer 1 — Connectors (IT)"
        BR[Bridge]
    end
    subgraph "Layer 2 — Bridge detail"
        BS[Bridge Sub]
    end
    subgraph "Layer 3 — Aggregation"
        CMB[Combiner]
        AM[Asset Mapper]
    end
    subgraph "Layer 4 — Central"
        EB[Edge Broker]
        TP[Topic]
        TF[TopicFilter]
    end
    subgraph "Layer 5 — Policy"
        DH[DataHub]
        DP[DataPolicy]
        BP[BehaviorPolicy]
    end
    subgraph "Layer 6 — Resources"
        SC[Schema]
        SR[Script]
    end
    subgraph "Layer 7 — Mappers"
        NB[NB Mapper]
        SB[SB Mapper]
    end
    subgraph "Layer 8 — Tags"
        TG[Tag]
    end
    subgraph "Layer 9 — Connectors (OT)"
        AD[Adapter]
    end
    subgraph "Layer 10 — Devices"
        DV[OT Device]
    end

    RB --> BR --> BS --> CMB --> EB
    EB --> TP
    EB --> TF
    TF --> DH --> DP --> SC
    DP --> SR
    TP --- NB --> TG --> AD --> DV
```

Wait — this puts Remote Broker on the far LEFT and OT Device on the far
RIGHT. The flow goes from IT (left) through the Edge Broker (center) to
OT (right). This is an **IT-centric** view.

**Alternative (OT-centric — matches your screenshot better)**:

```
OT Device → Adapter → Tag → NB Mapper → Topic → Edge Broker → ...policies... → Bridge → Remote Broker
```

This is the **data flow direction**: data originates at the OT device and
flows through the system toward the IT world.

---

## Final Proposed Ranks (OT → IT data flow, LR)

| Rank | Entities                               | Rationale                     |
| ---- | -------------------------------------- | ----------------------------- |
| 0    | OT Device                              | Physical source (leftmost)    |
| 1    | Adapter                                | Manages device                |
| 2    | Tag, DomainTag                         | Exposed by device             |
| 3    | NB Mapper, SB Mapper                   | Transform between tag ↔ topic |
| 4    | Topic, TopicFilter, Edge Broker, Pulse | Central messaging layer       |
| 5    | DataHub, Combiner, AssetMapper         | Policy engine, aggregation    |
| 6    | DataPolicy, BehaviorPolicy             | Policies                      |
| 7    | Schema, Script                         | Policy resources              |
| 8    | Bridge, BridgeSubscription             | Outbound to IT                |
| 9    | Remote Broker                          | External broker (rightmost)   |

### Edge direction changes needed

| Current                               | Proposed                                                                                                                                                                    | Reason                                   |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `Adapter → manages → Device`          | **Keep** (adapter at rank 1 → device at rank 0). Constraint will push Device LEFT of Adapter since Device has lower rank. Edge points "backward" but constraint is correct. | Rank constraint overrides edge direction |
| `NB Mapper → sourceTag → Tag`         | **Reverse to** `Tag → mappedBy → NB Mapper`                                                                                                                                 | Flow: tag data → mapper → topic          |
| `SB Mapper → destinationTag → Tag`    | **Keep** (SB is download: topic → mapper → tag)                                                                                                                             | Already correct for southbound           |
| `Bridge → connectsTo → Remote Broker` | **Keep**                                                                                                                                                                    | Bridge reaches out to remote             |

Actually, the rank constraint handles the positioning regardless of edge
direction. The edge `Adapter → manages → Device` will still position
Device at rank 0 (left) and Adapter at rank 1 (right of device) because
the constraint uses ENTITY_RANK, not edge direction.

So **no edge direction changes are strictly needed** — just rank
adjustments. The only visual issue is that some arrows point "backward"
(right to left), which the floating edges handle gracefully.

However, reversing `sourceTag` to `Tag → NB Mapper` would make the arrow
direction match the data flow and look cleaner.
