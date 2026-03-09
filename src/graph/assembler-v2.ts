/**
 * V2 Graph Assembler — Ontology-driven domain graph construction.
 *
 * Each domain area has its own assembly function for clarity:
 *   1. Orchestrators   — assembleOrchestrators
 *   2. Adapters        — assembleAdapters
 *   3. Bridges         — assembleBridges
 *   4. Topic Filters   — assembleTopicFilters
 *   5. Topics          — assembleTopics
 *   6. Mappers         — assembleMappers
 *   7. Data Policies   — assembleDataPolicies
 *   8. Behavior Pol.   — assembleBehaviorPolicies
 *   9. Resources       — assembleResources
 *  10. Wildcard Match  — assembleWildcardMatches
 *  11. Prune & DAG     — pruneDedupDag
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
  deriveValidators,
  deriveDataPolicyPipelines,
  deriveBehaviorPolicyTransitions,
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

// --- Collector (accumulates nodes + edges) ---

type Collector = {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
};

function addNode(c: Collector, n: GraphNode) {
  if (!c.nodes.has(n.id)) c.nodes.set(n.id, n);
}

function addEdge(c: Collector, e: GraphEdge) {
  c.edges.push(e);
}

function addAll(
  c: Collector,
  result: { nodes: GraphNode[]; edges: GraphEdge[] },
) {
  result.nodes.forEach((n) => addNode(c, n));
  result.edges.forEach((e) => addEdge(c, e));
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

// ── 1. Orchestrators ─────────────────────────────────────────────────────

function assembleOrchestrators(c: Collector): GraphNode {
  addNode(c, deriveEdgeBroker());
  const dataHubNode = deriveDataHub();
  addNode(c, dataHubNode);
  return dataHubNode;
}

// ── 2. Adapters ──────────────────────────────────────────────────────────

function assembleAdapters(c: Collector, data: ApiDataV2): void {
  // Adapter nodes
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

  // OT Devices (1 per Adapter)
  addAll(c, deriveOtDevices(data.adapters));

  // Tags (scoped by adapter)
  addAll(c, deriveTags(data.adapterTags));
}

// ── 3. Bridges ───────────────────────────────────────────────────────────

function assembleBridges(c: Collector, data: ApiDataV2): void {
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
}

// ── 4. Topic Filters ─────────────────────────────────────────────────────
// Collected from multiple sources: API list, SB mappers, bridge subs, data policies

function assembleTopicFilters(c: Collector, data: ApiDataV2): string[] {
  const topicFilterNodeIds: string[] = [];

  // From API topic filter list
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

  // From SB mapper sources (ensure filter nodes exist)
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

  // From bridge subscription filters
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

  // From data policy matching
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

  // Ownership edges (EdgeBroker → owns → TopicFilter)
  deriveTopicFilterOwnership(topicFilterNodeIds).forEach((e) => addEdge(c, e));

  return topicFilterNodeIds;
}

// ── 5. Topics ────────────────────────────────────────────────────────────

function assembleTopics(c: Collector, data: ApiDataV2): void {
  const redirectTopics = extractRedirectTopics(data.dataPolicies);

  addAll(
    c,
    deriveTopics({
      adapterNbMappings: data.adapterNorthboundMappings,
      combiners: data.combiners as ApiDataV2["combiners"],
      bridges: data.bridges,
      redirectTopics,
    }),
  );
}

// ── 6. Mappers ───────────────────────────────────────────────────────────

function assembleMappers(c: Collector, data: ApiDataV2): void {
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
        const sourceId = makeNodeId(refType as "adapter" | "bridge", ref.id);
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
}

// ── 7. Data Policies ─────────────────────────────────────────────────────

function assembleDataPolicies(
  c: Collector,
  data: ApiDataV2,
  dataHubNode: GraphNode,
): void {
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
  });

  // Validators (DataPolicy → validatesWith → Validator → validates → Schema)
  addAll(c, deriveValidators(data.dataPolicies));

  // Pipeline operations (DataPolicy → chains → Op → chains → Op → invokes/serializes/redirectsTo)
  addAll(c, deriveDataPolicyPipelines(data.dataPolicies));
}

// ── 8. Behavior Policies ─────────────────────────────────────────────────

function assembleBehaviorPolicies(
  c: Collector,
  data: ApiDataV2,
  dataHubNode: GraphNode,
): void {
  data.behaviorPolicies?.forEach((bp) => {
    const id = makeNodeId("behaviorPolicy", bp.id);
    addNode(
      c,
      node(id, "behaviorPolicy", bp.id, bp.matching?.clientIdRegex, undefined, {
        ...bp,
        behaviorId: bp.behavior?.id,
      } as unknown as Record<string, unknown>),
    );

    // DataHub → owns → BehaviorPolicy
    addEdge(c, edge(dataHubNode.id, id, REL.owns));

    // BehaviorPolicy → deserializes → Schema (publish/will)
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
  });

  // FSM Transitions + their pipeline operations
  addAll(c, deriveBehaviorPolicyTransitions(data.behaviorPolicies));
}

// ── 9. Resources ─────────────────────────────────────────────────────────

function assembleResources(
  c: Collector,
  data: ApiDataV2,
  dataHubNode: GraphNode,
): void {
  // Schemas
  data.schemas?.forEach((s) => {
    const id = makeNodeId("schema", s.id);
    addNode(
      c,
      node(id, "schema", s.id, s.type, undefined, {
        ...s,
      } as unknown as Record<string, unknown>),
    );
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
    addEdge(c, edge(dataHubNode.id, id, REL.owns));
  });
}

// ── 10. MQTT Wildcard Matching ───────────────────────────────────────────

function assembleWildcardMatches(c: Collector): void {
  const topicFilterNodes = Array.from(c.nodes.values()).filter(
    (n) => n.data.entityType === "topicFilter",
  );
  const topicNodes = Array.from(c.nodes.values()).filter(
    (n) => n.data.entityType === "topic",
  );
  computeWildcardMatches(topicFilterNodes, topicNodes).forEach((e) =>
    addEdge(c, e),
  );
}

// ── 11. Prune & Ensure DAG ──────────────────────────────────────────────

function pruneDedupDag(c: Collector): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  const validNodeIds = new Set(c.nodes.keys());

  // Remove edges whose endpoints don't exist
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

  return {
    nodes: Array.from(c.nodes.values()),
    edges: finalEdges,
  };
}

// ── Main assembler (orchestrator) ────────────────────────────────────────

export function assembleFullGraphV2(data: ApiDataV2): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  const c: Collector = { nodes: new Map(), edges: [] };

  const dataHubNode = assembleOrchestrators(c);
  assembleAdapters(c, data);
  assembleBridges(c, data);
  assembleTopicFilters(c, data);
  assembleTopics(c, data);
  assembleMappers(c, data);
  assembleDataPolicies(c, data, dataHubNode);
  assembleBehaviorPolicies(c, data, dataHubNode);
  assembleResources(c, data, dataHubNode);
  assembleWildcardMatches(c);

  const result = pruneDedupDag(c);
  log(
    "assembled: %d nodes, %d edges",
    result.nodes.length,
    result.edges.length,
  );
  return result;
}
