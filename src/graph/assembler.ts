/**
 * Assembles the full domain graph from raw API data.
 * Pure function — no side effects, no API calls.
 *
 * Relationships derived from the domain ontology
 * (.tasks/00005-ontology/DOMAIN_ONTOLOGY.md):
 *
 *   Adapter  ──hasTags──▸  DomainTag
 *   DomainTag ──publishesTo──▸ TopicFilter     (via NB mapping)
 *   TopicFilter ──writesTo──▸ DomainTag        (via SB mapping)
 *   TopicFilter ──subscribes──▸ Bridge           (local subscriptions)
 *   TopicFilter ──forwards──▸  Bridge           (remote subscriptions)
 *   TopicFilter ──matches──▸ DataPolicy
 *   DataPolicy ──validates──▸ Schema           (via validators)
 *   DataPolicy ──executes──▸ Script            (via onSuccess/onFailure pipelines)
 *   BehaviorPolicy ──deserializes──▸ Schema    (via deserialization)
 *   BehaviorPolicy ──executes──▸ Script        (via onTransitions pipelines)
 *   Combiner ──combines──◂ Adapter | Bridge    (via sources)
 */

import type {
  Adapter,
  Bridge,
  DomainTag,
  TopicFilter,
  DataPolicy,
  BehaviorPolicy,
  PolicySchema,
  Script,
  Combiner,
  Listener,
  NorthboundMapping,
  SouthboundMapping,
  Status,
} from "@/api/types.gen";
import type { GraphNode, GraphEdge, DomainEntityType } from "./types";

// --- Input shape ---

export interface ApiData {
  adapters?: Adapter[];
  bridges?: Bridge[];
  domainTags?: DomainTag[];
  topicFilters?: TopicFilter[];
  dataPolicies?: DataPolicy[];
  behaviorPolicies?: BehaviorPolicy[];
  schemas?: PolicySchema[];
  scripts?: Script[];
  combiners?: Combiner[];
  listeners?: Listener[];
  northboundMappings?: NorthboundMapping[];
  southboundMappings?: SouthboundMapping[];
  /** Per-adapter domain tags: { adapterId → tags[] } */
  adapterTags?: Record<string, DomainTag[]>;
  /** Per-adapter northbound mappings: { adapterId → mappings[] } (v2) */
  adapterNorthboundMappings?: Record<string, NorthboundMapping[]>;
  /** Per-adapter southbound mappings: { adapterId → mappings[] } (v2) */
  adapterSouthboundMappings?: Record<string, SouthboundMapping[]>;
}

// --- Helpers ---

function makeNodeId(type: DomainEntityType, id: string): string {
  return `${type}:${id}`;
}

function statusFromApi(s?: Status): GraphNode["data"]["status"] {
  if (!s) return undefined;
  return {
    connection: s.connection as GraphNode["data"]["status"] extends undefined
      ? never
      : NonNullable<GraphNode["data"]["status"]>["connection"],
    runtime: s.runtime as GraphNode["data"]["status"] extends undefined
      ? never
      : NonNullable<GraphNode["data"]["status"]>["runtime"],
  };
}

function addNode(
  nodes: Map<string, GraphNode>,
  id: string,
  entityType: DomainEntityType,
  label: string,
  sublabel: string | undefined,
  status: GraphNode["data"]["status"],
  raw: Record<string, unknown>,
) {
  if (!nodes.has(id)) {
    nodes.set(id, {
      id,
      type: entityType,
      position: { x: 0, y: 0 },
      data: { entityType, label, sublabel, status, raw },
    });
  }
}

function addEdge(
  edges: GraphEdge[],
  source: string,
  target: string,
  relationship: string,
  nodes: Map<string, GraphNode>,
) {
  if (nodes.has(source) && nodes.has(target)) {
    const edgeId = `${source}-${relationship}-${target}`;
    // Avoid duplicate edges
    if (!edges.some((e) => e.id === edgeId)) {
      edges.push({
        id: edgeId,
        source,
        target,
        type: "relationship",
        data: { relationship },
      });
    }
  }
}

// --- Main assembler ---

export function assembleFullGraph(data: ApiData): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  // ── Adapters ──────────────────────────────────────────────
  data.adapters?.forEach((a) => {
    const id = makeNodeId("adapter", a.id);
    addNode(nodes, id, "adapter", a.id, a.type, statusFromApi(a.status), {
      ...a,
    } as unknown as Record<string, unknown>);
  });

  // ── Domain Tags (from per-adapter data) ───────────────────
  if (data.adapterTags) {
    for (const [adapterId, tags] of Object.entries(data.adapterTags)) {
      const adapterNodeId = makeNodeId("adapter", adapterId);
      tags.forEach((t) => {
        const tagId = makeNodeId("domainTag", t.name);
        addNode(nodes, tagId, "domainTag", t.name, t.description, undefined, {
          ...t,
        } as unknown as Record<string, unknown>);
        // Adapter → DomainTag
        addEdge(edges, adapterNodeId, tagId, "hasTags", nodes);
      });
    }
  }

  // ── Domain Tags (from global endpoint, for any not yet added) ──
  data.domainTags?.forEach((t) => {
    const tagId = makeNodeId("domainTag", t.name);
    addNode(nodes, tagId, "domainTag", t.name, t.description, undefined, {
      ...t,
    } as unknown as Record<string, unknown>);
  });

  // ── Topic Filters ─────────────────────────────────────────
  data.topicFilters?.forEach((tf) => {
    const id = makeNodeId("topicFilter", tf.topicFilter);
    addNode(
      nodes,
      id,
      "topicFilter",
      tf.topicFilter,
      tf.description,
      undefined,
      { ...tf } as unknown as Record<string, unknown>,
    );
  });

  // ── Northbound Mappings (DomainTag → TopicFilter) ─────────
  data.northboundMappings?.forEach((nb) => {
    const tagId = makeNodeId("domainTag", nb.tagName);
    const topicId = makeNodeId("topicFilter", nb.topic);
    // Ensure topic filter node exists for this NB destination
    addNode(nodes, topicId, "topicFilter", nb.topic, undefined, undefined, {
      topicFilter: nb.topic,
      source: "northbound-mapping",
    });
    addEdge(edges, tagId, topicId, "publishesTo", nodes);
  });

  // ── Southbound Mappings (TopicFilter → DomainTag) ─────────
  data.southboundMappings?.forEach((sb) => {
    const tagId = makeNodeId("domainTag", sb.tagName);
    const topicId = makeNodeId("topicFilter", sb.topicFilter);
    // Ensure topic filter node exists for this SB source
    addNode(
      nodes,
      topicId,
      "topicFilter",
      sb.topicFilter,
      undefined,
      undefined,
      { topicFilter: sb.topicFilter, source: "southbound-mapping" },
    );
    addEdge(edges, topicId, tagId, "writesTo", nodes);
  });

  // ── Bridges ───────────────────────────────────────────────
  data.bridges?.forEach((b) => {
    const id = makeNodeId("bridge", b.id);
    addNode(
      nodes,
      id,
      "bridge",
      b.id,
      `${b.host}:${b.port}`,
      statusFromApi(b.status),
      { ...b } as unknown as Record<string, unknown>,
    );

    // TopicFilter → Bridge (local subscriptions: data flows topic → bridge)
    b.localSubscriptions?.forEach((sub) => {
      sub.filters?.forEach((filter) => {
        const tfId = makeNodeId("topicFilter", filter);
        addNode(nodes, tfId, "topicFilter", filter, undefined, undefined, {
          topicFilter: filter,
          source: "bridge-local",
        });
        addEdge(edges, tfId, id, "subscribes", nodes);
      });
    });

    // TopicFilter → Bridge (remote subscriptions: data flows topic → bridge)
    b.remoteSubscriptions?.forEach((sub) => {
      sub.filters?.forEach((filter) => {
        const tfId = makeNodeId("topicFilter", filter);
        addNode(nodes, tfId, "topicFilter", filter, undefined, undefined, {
          topicFilter: filter,
          source: "bridge-remote",
        });
        addEdge(edges, tfId, id, "forwards", nodes);
      });
    });
  });

  // ── Schemas ───────────────────────────────────────────────
  data.schemas?.forEach((s) => {
    const id = makeNodeId("schema", s.id);
    addNode(nodes, id, "schema", s.id, s.type, undefined, {
      ...s,
    } as unknown as Record<string, unknown>);
  });

  // ── Scripts ───────────────────────────────────────────────
  data.scripts?.forEach((s) => {
    const id = makeNodeId("script", s.id);
    addNode(nodes, id, "script", s.id, s.description, undefined, {
      ...s,
    } as unknown as Record<string, unknown>);
  });

  // ── Data Policies ─────────────────────────────────────────
  data.dataPolicies?.forEach((dp) => {
    const id = makeNodeId("dataPolicy", dp.id);
    addNode(nodes, id, "dataPolicy", dp.id, undefined, undefined, {
      ...dp,
    } as unknown as Record<string, unknown>);

    // TopicFilter → DataPolicy (topic filter is the input the policy acts on)
    if (dp.matching?.topicFilter) {
      const tfId = makeNodeId("topicFilter", dp.matching.topicFilter);
      addNode(
        nodes,
        tfId,
        "topicFilter",
        dp.matching.topicFilter,
        undefined,
        undefined,
        { topicFilter: dp.matching.topicFilter, source: "data-policy" },
      );
      addEdge(edges, tfId, id, "matches", nodes);
    }

    // DataPolicy → Schema (via validation.validators[].arguments.schemaId)
    dp.validation?.validators?.forEach((v) => {
      const args = v.arguments as Record<string, unknown> | undefined;
      const schemaId = args?.schemaId as string | undefined;
      if (schemaId) {
        const schemaNodeId = makeNodeId("schema", schemaId);
        addEdge(edges, id, schemaNodeId, "validates", nodes);
      }
    });

    // DataPolicy → Script (via onSuccess/onFailure pipelines)
    [dp.onSuccess, dp.onFailure].forEach((action) => {
      action?.pipeline?.forEach((op) => {
        if (op.functionId) {
          const scriptId = makeNodeId("script", op.functionId);
          addEdge(edges, id, scriptId, "executes", nodes);
        }
      });
    });
  });

  // ── Behavior Policies ─────────────────────────────────────
  data.behaviorPolicies?.forEach((bp) => {
    const id = makeNodeId("behaviorPolicy", bp.id);
    addNode(
      nodes,
      id,
      "behaviorPolicy",
      bp.id,
      bp.matching?.clientIdRegex,
      undefined,
      { ...bp } as unknown as Record<string, unknown>,
    );

    // BehaviorPolicy → Schema (via deserialization)
    if (bp.deserialization) {
      [bp.deserialization.publish, bp.deserialization.will].forEach(
        (deserializer) => {
          if (deserializer?.schema?.schemaId) {
            const schemaNodeId = makeNodeId(
              "schema",
              deserializer.schema.schemaId,
            );
            addEdge(edges, id, schemaNodeId, "deserializes", nodes);
          }
        },
      );
    }

    // BehaviorPolicy → Script (via onTransitions pipeline operations)
    bp.onTransitions?.forEach((transition) => {
      const eventKeys = [
        "Connection.OnDisconnect",
        "Event.OnAny",
        "Mqtt.OnInboundConnect",
        "Mqtt.OnInboundDisconnect",
        "Mqtt.OnInboundPublish",
        "Mqtt.OnInboundSubscribe",
      ] as const;

      eventKeys.forEach((key) => {
        const event = transition[key];
        event?.pipeline?.forEach((op) => {
          if (op.functionId) {
            const scriptId = makeNodeId("script", op.functionId);
            addEdge(edges, id, scriptId, "executes", nodes);
          }
        });
      });
    });
  });

  // ── Combiners ─────────────────────────────────────────────
  data.combiners?.forEach((c) => {
    const id = makeNodeId("combiner", c.id);
    addNode(nodes, id, "combiner", c.name || c.id, c.description, undefined, {
      ...c,
    } as unknown as Record<string, unknown>);

    // Combiner ← source entities (Adapter, Bridge)
    c.sources?.items?.forEach((ref) => {
      const refType = ref.type?.toLowerCase();
      if (refType === "adapter" || refType === "bridge") {
        const sourceId = makeNodeId(refType as "adapter" | "bridge", ref.id);
        addEdge(edges, sourceId, id, "combines", nodes);
      }
    });
  });

  // ── Listeners ─────────────────────────────────────────────
  data.listeners?.forEach((l) => {
    const name = l.name ?? `${l.hostName}:${l.port}`;
    const id = makeNodeId("listener", name);
    addNode(
      nodes,
      id,
      "listener",
      name,
      `${l.protocol ?? ""} ${l.transport ?? ""}`.trim() || undefined,
      undefined,
      { ...l } as unknown as Record<string, unknown>,
    );
  });

  return {
    nodes: Array.from(nodes.values()),
    edges,
  };
}
