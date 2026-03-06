/**
 * V2 Graph Assembler — Ontology-driven domain graph construction.
 *
 * Organized by the v2 ontology taxonomy:
 *   1. Orchestrators (Edge Broker, DataHub)
 *   2. Connectors (Adapter, Bridge)
 *   3. Integration Points (OT Device, Tag, Topic, TopicFilter)
 *   4. Mappers (NorthboundMapper, SouthboundMapper, Combiner, BridgeSubscription)
 *   5. Policies (DataPolicy, BehaviorPolicy)
 *   6. Resources (Schema, Script)
 *
 * Pure function — no side effects, no API calls.
 */

import createDebug from "debug";
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
  NorthboundMapping,
  SouthboundMapping,
  Status,
} from "@/api/types.gen";
import type { GraphNode, GraphEdge, DomainEntityType } from "./types";
import { REL } from "./relationships";
import {
  makeNodeId,
  node,
  edge,
  deriveEdgeBroker,
  deriveDataHub,
  deriveRemoteBrokers,
  deriveOtDevices,
  deriveTags,
  deriveTopics,
  deriveTopicFilterOwnership,
  deriveNorthboundMappers,
  deriveSouthboundMappers,
  deriveBridgeSubscriptions,
  extractRedirectTopics,
  computeWildcardMatches,
  ensureDag,
} from "./entity-derivation";

const log = createDebug("edge:graph:assembler");

// --- Input shape ---

export interface ApiDataV2 {
  adapters?: Adapter[];
  bridges?: Bridge[];
  domainTags?: DomainTag[];
  topicFilters?: TopicFilter[];
  dataPolicies?: DataPolicy[];
  behaviorPolicies?: BehaviorPolicy[];
  schemas?: PolicySchema[];
  scripts?: Script[];
  combiners?: Combiner[];
  northboundMappings?: NorthboundMapping[];
  southboundMappings?: SouthboundMapping[];
  /** Per-adapter domain tags: { adapterId → tags[] } */
  adapterTags?: Record<string, DomainTag[]>;
  /** Per-adapter northbound mappings: { adapterId → mappings[] } */
  adapterNorthboundMappings?: Record<string, NorthboundMapping[]>;
  /** Per-adapter southbound mappings: { adapterId → mappings[] } */
  adapterSouthboundMappings?: Record<string, SouthboundMapping[]>;
}

// --- Helpers ---

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

type Collector = {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
};

function addNode(c: Collector, n: GraphNode) {
  if (!c.nodes.has(n.id)) c.nodes.set(n.id, n);
}

function addEdge(c: Collector, e: GraphEdge) {
  // Only add if both endpoints exist (or will be added)
  c.edges.push(e);
}

function addAll(c: Collector, result: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  result.nodes.forEach((n) => addNode(c, n));
  result.edges.forEach((e) => addEdge(c, e));
}

// --- Main assembler ---

export function assembleFullGraphV2(data: ApiDataV2): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  const c: Collector = { nodes: new Map(), edges: [] };

  // ── 1. Orchestrators ─────────────────────────────────────────

  // Edge Broker (singleton)
  addNode(c, deriveEdgeBroker());

  // DataHub (singleton)
  const dataHubNode = deriveDataHub();
  addNode(c, dataHubNode);

  // ── 2. Connectors ────────────────────────────────────────────

  // Adapters
  data.adapters?.forEach((a) => {
    addNode(
      c,
      node(
        makeNodeId("adapter", a.id),
        "adapter",
        a.id,
        a.type,
        statusFromApi(a.status),
        { ...a } as unknown as Record<string, unknown>,
      ),
    );
  });

  // Bridges
  data.bridges?.forEach((b) => {
    addNode(
      c,
      node(
        makeNodeId("bridge", b.id),
        "bridge",
        b.id,
        `${b.host}:${b.port}`,
        statusFromApi(b.status),
        { ...b } as unknown as Record<string, unknown>,
      ),
    );
  });

  // Remote Brokers (1 per Bridge)
  addAll(c, deriveRemoteBrokers(data.bridges));

  // ── 3. Integration Points ────────────────────────────────────

  // OT Devices (1 per Adapter)
  addAll(c, deriveOtDevices(data.adapters));

  // Tags (scoped by adapter, via per-adapter domain tags)
  addAll(c, deriveTags(data.adapterTags));

  // Topic Filters (from API)
  const topicFilterNodeIds: string[] = [];
  data.topicFilters?.forEach((tf) => {
    const id = makeNodeId("topicFilter", tf.topicFilter);
    addNode(
      c,
      node(id, "topicFilter", tf.topicFilter, tf.description, undefined, {
        ...tf,
      } as unknown as Record<string, unknown>),
    );
    topicFilterNodeIds.push(id);
  });

  // Ensure topic filter nodes for SB mapper sources
  if (data.adapterSouthboundMappings) {
    for (const mappings of Object.values(data.adapterSouthboundMappings)) {
      mappings.forEach((sb) => {
        const tfId = makeNodeId("topicFilter", sb.topicFilter);
        if (!c.nodes.has(tfId)) {
          addNode(
            c,
            node(tfId, "topicFilter", sb.topicFilter, undefined, undefined, {
              topicFilter: sb.topicFilter,
              source: "southbound-mapper",
            }),
          );
          topicFilterNodeIds.push(tfId);
        }
      });
    }
  }

  // Ensure topic filter nodes for bridge subscription filters
  data.bridges?.forEach((b) => {
    [...(b.localSubscriptions ?? []), ...(b.remoteSubscriptions ?? [])].forEach(
      (sub) => {
        sub.filters?.forEach((filter) => {
          const tfId = makeNodeId("topicFilter", filter);
          if (!c.nodes.has(tfId)) {
            addNode(
              c,
              node(tfId, "topicFilter", filter, undefined, undefined, {
                topicFilter: filter,
                source: "bridge-subscription",
              }),
            );
            topicFilterNodeIds.push(tfId);
          }
        });
      },
    );
  });

  // Ensure topic filter nodes for data policy matching
  data.dataPolicies?.forEach((dp) => {
    if (dp.matching?.topicFilter) {
      const tfId = makeNodeId("topicFilter", dp.matching.topicFilter);
      if (!c.nodes.has(tfId)) {
        addNode(
          c,
          node(
            tfId,
            "topicFilter",
            dp.matching.topicFilter,
            undefined,
            undefined,
            { topicFilter: dp.matching.topicFilter, source: "data-policy" },
          ),
        );
        topicFilterNodeIds.push(tfId);
      }
    }
  });

  // Extract redirect topics from DataPolicy pipelines
  const redirectTopics = extractRedirectTopics(data.dataPolicies);

  // Topics (derived from NB mapper destinations, combiners, bridges, redirects)
  addAll(
    c,
    deriveTopics({
      adapterNbMappings: data.adapterNorthboundMappings,
      combiners: data.combiners as ApiDataV2["combiners"],
      bridges: data.bridges,
      redirectTopics,
    }),
  );

  // TopicFilter ownership (EdgeBroker → ownsFilter)
  deriveTopicFilterOwnership(topicFilterNodeIds).forEach((e) =>
    addEdge(c, e),
  );

  // ── 4. Mappers ───────────────────────────────────────────────

  // Northbound Mappers
  addAll(c, deriveNorthboundMappers(data.adapterNorthboundMappings));

  // Southbound Mappers
  addAll(c, deriveSouthboundMappers(data.adapterSouthboundMappings));

  // Combiners
  data.combiners?.forEach((cmb) => {
    const isAsset = cmb.mappings?.items?.some((m) => m.destination?.assetId);
    const entityType: DomainEntityType = isAsset ? "assetMapper" : "combiner";
    const id = makeNodeId(entityType, cmb.id);
    addNode(
      c,
      node(id, entityType, cmb.name || cmb.id, cmb.description, undefined, {
        ...cmb,
      } as unknown as Record<string, unknown>),
    );

    // Combiner ← source entities (Adapter, Bridge)
    cmb.sources?.items?.forEach((ref) => {
      const refType = ref.type?.toLowerCase();
      if (refType === "adapter" || refType === "bridge") {
        const sourceId = makeNodeId(
          refType as "adapter" | "bridge",
          ref.id,
        );
        addEdge(c, edge(sourceId, id, REL.sources));
      }
    });

    // Combiner → destinationTopic (from mapping destinations)
    cmb.mappings?.items?.forEach((m) => {
      if (m.destination?.topic) {
        const topicId = makeNodeId("topic", m.destination.topic);
        addEdge(c, edge(id, topicId, REL.publishes));
      }
    });
  });

  // Bridge Subscriptions
  addAll(c, deriveBridgeSubscriptions(data.bridges));

  // ── 5. Policies ──────────────────────────────────────────────

  // Data Policies
  data.dataPolicies?.forEach((dp) => {
    const id = makeNodeId("dataPolicy", dp.id);
    addNode(
      c,
      node(id, "dataPolicy", dp.id, undefined, undefined, {
        ...dp,
      } as unknown as Record<string, unknown>),
    );

    // DataHub → owns → DataPolicy
    addEdge(c, edge(dataHubNode.id, id, REL.owns));

    // DataPolicy → attachedTo → TopicFilter
    if (dp.matching?.topicFilter) {
      const tfId = makeNodeId("topicFilter", dp.matching.topicFilter);
      addEdge(c, edge(id, tfId, REL.attachedTo));
    }

    // DataPolicy → validates → Schema
    dp.validation?.validators?.forEach((v) => {
      const args = v.arguments as Record<string, unknown> | undefined;
      const schemaId = args?.schemaId as string | undefined;
      if (schemaId) {
        addEdge(c, edge(id, makeNodeId("schema", schemaId), REL.validates));
      }
    });

    // DataPolicy → executes → Script
    [dp.onSuccess, dp.onFailure].forEach((action) => {
      action?.pipeline?.forEach((op) => {
        if (op.functionId && !op.functionId.startsWith("Delivery.")) {
          addEdge(
            c,
            edge(id, makeNodeId("script", op.functionId), REL.executes),
          );
        }
      });
    });

    // DataPolicy → redirects → Topic (from Delivery.redirectTo)
    [dp.onSuccess, dp.onFailure].forEach((action) => {
      action?.pipeline?.forEach((op) => {
        if (op.functionId === "Delivery.redirectTo") {
          const args = op.arguments as Record<string, unknown>;
          const topic = args?.topic as string | undefined;
          if (topic) {
            addEdge(
              c,
              edge(id, makeNodeId("topic", topic), REL.redirects),
            );
          }
        }
      });
    });
  });

  // Behavior Policies
  data.behaviorPolicies?.forEach((bp) => {
    const id = makeNodeId("behaviorPolicy", bp.id);
    addNode(
      c,
      node(id, "behaviorPolicy", bp.id, bp.matching?.clientIdRegex, undefined, {
        ...bp,
      } as unknown as Record<string, unknown>),
    );

    // DataHub → owns → BehaviorPolicy
    addEdge(c, edge(dataHubNode.id, id, REL.owns));

    // BehaviorPolicy → deserializes → Schema
    if (bp.deserialization) {
      [bp.deserialization.publish, bp.deserialization.will].forEach(
        (deserializer) => {
          if (deserializer?.schema?.schemaId) {
            addEdge(
              c,
              edge(
                id,
                makeNodeId("schema", deserializer.schema.schemaId),
                REL.deserializes,
              ),
            );
          }
        },
      );
    }

    // BehaviorPolicy → executes → Script
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
            addEdge(
              c,
              edge(id, makeNodeId("script", op.functionId), REL.executes),
            );
          }
        });
      });
    });
  });

  // ── 6. Resources ─────────────────────────────────────────────

  // Schemas
  data.schemas?.forEach((s) => {
    const id = makeNodeId("schema", s.id);
    addNode(
      c,
      node(id, "schema", s.id, s.type, undefined, {
        ...s,
      } as unknown as Record<string, unknown>),
    );
    // DataHub → owns → Schema
    addEdge(c, edge(dataHubNode.id, id, REL.owns));
  });

  // Scripts
  data.scripts?.forEach((s) => {
    const id = makeNodeId("script", s.id);
    addNode(
      c,
      node(id, "script", s.id, s.description, undefined, {
        ...s,
      } as unknown as Record<string, unknown>),
    );
    // DataHub → owns → Script
    addEdge(c, edge(dataHubNode.id, id, REL.owns));
  });

  // ── 7. MQTT Wildcard Matching ────────────────────────────────

  const topicFilterNodes = Array.from(c.nodes.values()).filter(
    (n) => n.data.entityType === "topicFilter",
  );
  const topicNodes = Array.from(c.nodes.values()).filter(
    (n) => n.data.entityType === "topic",
  );
  computeWildcardMatches(topicFilterNodes, topicNodes).forEach((e) =>
    addEdge(c, e),
  );

  // ── 8. Prune Edges & Ensure DAG ─────────────────────────────
  // Remove edges whose endpoints don't exist
  const validNodeIds = new Set(c.nodes.keys());
  let prunedEdges = c.edges.filter(
    (e) => validNodeIds.has(e.source) && validNodeIds.has(e.target),
  );

  // Deduplicate edges
  const seenEdges = new Set<string>();
  prunedEdges = prunedEdges.filter((e) => {
    if (seenEdges.has(e.id)) return false;
    seenEdges.add(e.id);
    return true;
  });

  // Ensure DAG (remove back-edges from cycles)
  const finalEdges = ensureDag(Array.from(c.nodes.keys()), prunedEdges);

  const result = {
    nodes: Array.from(c.nodes.values()),
    edges: finalEdges,
  };
  log("assembled: %d nodes, %d edges", result.nodes.length, result.edges.length);
  return result;
}
