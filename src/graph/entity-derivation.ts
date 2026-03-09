/**
 * Entity derivation for ontology v2.
 *
 * Derived entities are not directly returned by the API — they are
 * computed from the API data. This module provides pure functions
 * for each derivation.
 */

import type {
  Adapter,
  Bridge,
  DomainTag,
  NorthboundMapping,
  SouthboundMapping,
  DataPolicy,
  BehaviorPolicy,
} from "@/api/types.gen";
import type { GraphNode, GraphEdge, DomainEntityType } from "./types";
import { REL } from "./relationships";
import { ENTITY_RANK } from "./constants";

// ── Helpers ──────────────────────────────────────────────────────────────

function makeNodeId(type: DomainEntityType, id: string): string {
  return `${type}:${id}`;
}

function node(
  id: string,
  entityType: DomainEntityType,
  label: string,
  sublabel: string | undefined,
  status: GraphNode["data"]["status"],
  raw: Record<string, unknown>,
  layoutRank?: number,
): GraphNode {
  return {
    id,
    type: entityType,
    position: { x: 0, y: 0 },
    data: { entityType, label, sublabel, status, raw, layoutRank },
  };
}

function edge(source: string, target: string, relationship: string): GraphEdge {
  return {
    id: `${source}-${relationship}-${target}`,
    source,
    target,
    type: "relationship",
    data: { relationship },
  };
}

export { makeNodeId, node, edge };

// ── MQTT Wildcard Matching ───────────────────────────────────────────────

/**
 * Returns true if an MQTT topic filter matches a concrete topic.
 *
 *  - `+` matches exactly one topic level
 *  - `#` matches zero or more levels (only valid at end)
 *  - `$`-prefixed topics are not matched by filters starting with `+` or `#`
 */
export function mqttMatch(filter: string, topic: string): boolean {
  if (filter === topic) return true;
  if (filter === "#") return !topic.startsWith("$");

  const filterLevels = filter.split("/");
  const topicLevels = topic.split("/");

  for (let i = 0; i < filterLevels.length; i++) {
    const f = filterLevels[i];

    if (f === "#") {
      // # must be last level; matches remainder
      return i === filterLevels.length - 1;
    }

    if (f === "+") {
      // + matches exactly one level — but not $-prefixed at position 0
      if (i === 0 && topicLevels[0]?.startsWith("$")) return false;
      if (i >= topicLevels.length) return false;
      continue;
    }

    // Literal level
    if (topicLevels[i] !== f) return false;
  }

  return filterLevels.length === topicLevels.length;
}

// ── Singleton Orchestrators ──────────────────────────────────────────────

export function deriveEdgeBroker(): GraphNode {
  return node(
    makeNodeId("edgeBroker", "edge"),
    "edgeBroker",
    "Edge Broker",
    "Local MQTT broker",
    undefined,
    {},
  );
}

export function deriveDataHub(): GraphNode {
  return node(
    makeNodeId("dataHub", "datahub"),
    "dataHub",
    "DataHub",
    "Policy engine",
    undefined,
    {},
  );
}

// ── Remote Brokers (1 per Bridge) ────────────────────────────────────────

export function deriveRemoteBrokers(
  bridges: Adapter[] | Bridge[] | undefined,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  (bridges as Bridge[] | undefined)?.forEach((b) => {
    const rbId = makeNodeId("remoteBroker", b.id);
    nodes.push(
      node(
        rbId,
        "remoteBroker",
        `${b.host}:${b.port}`,
        "Remote broker",
        undefined,
        {
          host: b.host,
          port: b.port,
          bridgeId: b.id,
        },
      ),
    );
    // Bridge → connectsTo → RemoteBroker
    edges.push(edge(makeNodeId("bridge", b.id), rbId, REL.connectsTo));
  });
  return { nodes, edges };
}

// ── OT Devices (1 per Adapter) ───────────────────────────────────────────

export function deriveOtDevices(adapters: Adapter[] | undefined): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  adapters?.forEach((a) => {
    const deviceId = makeNodeId("otDevice", a.id);
    nodes.push(
      node(deviceId, "otDevice", a.id, a.type, undefined, {
        adapterId: a.id,
        adapterType: a.type,
      }),
    );
    // Adapter → manages → OT Device
    edges.push(edge(makeNodeId("adapter", a.id), deviceId, REL.manages));
  });
  return { nodes, edges };
}

// ── Tags (scoped by adapter) ─────────────────────────────────────────────

export function deriveTags(
  adapterTags: Record<string, DomainTag[]> | undefined,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  if (!adapterTags) return { nodes, edges };

  for (const [adapterId, tags] of Object.entries(adapterTags)) {
    const deviceId = makeNodeId("otDevice", adapterId);
    tags.forEach((t) => {
      const tagId = makeNodeId("tag", `${adapterId}/${t.name}`);
      nodes.push(
        node(tagId, "tag", t.name, t.description, undefined, {
          ...t,
          adapterId,
        } as unknown as Record<string, unknown>),
      );
      // OT Device → exposes → Tag
      edges.push(edge(deviceId, tagId, REL.exposes));
    });
  }

  return { nodes, edges };
}

// ── Topics (derived from mapper destinations) ────────────────────────────

/**
 * Collects unique topic strings from all sources and creates Topic nodes.
 * Returns the topic nodes and ownership edges (EdgeBroker → ownsTopic).
 */
export function deriveTopics(opts: {
  adapterNbMappings: Record<string, NorthboundMapping[]> | undefined;
  combiners:
    | Array<{
        id: string;
        mappings?: { items?: Array<{ destination?: { topic?: string } }> };
      }>
    | undefined;
  bridges: Bridge[] | undefined;
  redirectTopics: string[];
}): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const seen = new Set<string>();
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const brokerId = makeNodeId("edgeBroker", "edge");

  function addTopic(topicString: string, source: string) {
    if (seen.has(topicString)) return;
    seen.add(topicString);
    const topicId = makeNodeId("topic", topicString);
    nodes.push(
      node(topicId, "topic", topicString, undefined, undefined, {
        topicPath: topicString,
        source,
      }),
    );
    // EdgeBroker → owns → Topic
    edges.push(edge(brokerId, topicId, REL.owns));
  }

  // From northbound mapper destinations
  if (opts.adapterNbMappings) {
    for (const mappings of Object.values(opts.adapterNbMappings)) {
      mappings.forEach((nb) => addTopic(nb.topic, "northbound-mapper"));
    }
  }

  // From combiner mapping destinations
  opts.combiners?.forEach((c) => {
    c.mappings?.items?.forEach((m) => {
      if (m.destination?.topic) {
        addTopic(m.destination.topic, "combiner");
      }
    });
  });

  // From bridge subscription destinations
  opts.bridges?.forEach((b) => {
    b.localSubscriptions?.forEach((sub) => {
      if (sub.destination) addTopic(sub.destination, "bridge-local");
    });
    b.remoteSubscriptions?.forEach((sub) => {
      if (sub.destination) addTopic(sub.destination, "bridge-remote");
    });
  });

  // From DataPolicy redirect targets
  opts.redirectTopics.forEach((t) => addTopic(t, "redirect"));

  return { nodes, edges };
}

// ── TopicFilter ownership ────────────────────────────────────────────────

/**
 * Creates EdgeBroker → ownsFilter edges for all topic filter nodes.
 */
export function deriveTopicFilterOwnership(
  topicFilterNodeIds: string[],
): GraphEdge[] {
  const brokerId = makeNodeId("edgeBroker", "edge");
  return topicFilterNodeIds.map((tfId) => edge(brokerId, tfId, REL.owns));
}

// ── Northbound Mappers (scoped by adapter) ───────────────────────────────

export function deriveNorthboundMappers(
  adapterNbMappings: Record<string, NorthboundMapping[]> | undefined,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  if (!adapterNbMappings) return { nodes, edges };

  for (const [adapterId, mappings] of Object.entries(adapterNbMappings)) {
    const adapterNodeId = makeNodeId("adapter", adapterId);
    mappings.forEach((nb) => {
      const mapperId = makeNodeId(
        "northboundMapper",
        `${adapterId}/${nb.tagName}`,
      );
      nodes.push(
        node(
          mapperId,
          "northboundMapper",
          `${nb.tagName} → ${nb.topic}`,
          undefined,
          undefined,
          { ...nb, adapterId } as unknown as Record<string, unknown>,
        ),
      );
      // Adapter → owns → Mapper (structural ownership)
      edges.push(edge(adapterNodeId, mapperId, REL.owns));
      // Tag → feeds → Mapper (data flow: tag is the source)
      const tagId = makeNodeId("tag", `${adapterId}/${nb.tagName}`);
      edges.push(edge(tagId, mapperId, REL.feeds));
      // Mapper → publishes → Topic (data flow: mapper outputs to topic)
      const topicId = makeNodeId("topic", nb.topic);
      edges.push(edge(mapperId, topicId, REL.publishes));
    });
  }

  return { nodes, edges };
}

// ── Southbound Mappers (scoped by adapter) ───────────────────────────────

export function deriveSouthboundMappers(
  adapterSbMappings: Record<string, SouthboundMapping[]> | undefined,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  if (!adapterSbMappings) return { nodes, edges };

  for (const [adapterId, mappings] of Object.entries(adapterSbMappings)) {
    const adapterNodeId = makeNodeId("adapter", adapterId);
    mappings.forEach((sb) => {
      const mapperId = makeNodeId(
        "southboundMapper",
        `${adapterId}/${sb.tagName}`,
      );
      nodes.push(
        node(
          mapperId,
          "southboundMapper",
          `${sb.topicFilter} → ${sb.tagName}`,
          undefined,
          undefined,
          { ...sb, adapterId } as unknown as Record<string, unknown>,
        ),
      );
      // Adapter → owns → Mapper (structural ownership)
      edges.push(edge(adapterNodeId, mapperId, REL.owns));
      // TopicFilter → feeds → Mapper (data flow: filter is the source)
      const tfId = makeNodeId("topicFilter", sb.topicFilter);
      edges.push(edge(tfId, mapperId, REL.feeds));
      // Mapper → writes → Tag (data flow: mapper outputs to tag)
      const tagId = makeNodeId("tag", `${adapterId}/${sb.tagName}`);
      edges.push(edge(mapperId, tagId, REL.writes));
    });
  }

  return { nodes, edges };
}

// ── Bridge Subscriptions ─────────────────────────────────────────────────

export function deriveBridgeSubscriptions(bridges: Bridge[] | undefined): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  bridges?.forEach((b) => {
    const bridgeNodeId = makeNodeId("bridge", b.id);

    b.localSubscriptions?.forEach((sub, i) => {
      const subId = makeNodeId("bridgeSubscription", `${b.id}/local/${i}`);
      nodes.push(
        node(subId, "bridgeSubscription", sub.destination, "local", undefined, {
          ...sub,
          bridgeId: b.id,
          direction: "local",
        } as unknown as Record<string, unknown>),
      );
      // Bridge → owns → BridgeSubscription
      edges.push(edge(bridgeNodeId, subId, REL.owns));
      // BridgeSubscription → filters → TopicFilter (one per filter)
      sub.filters?.forEach((filter) => {
        const tfId = makeNodeId("topicFilter", filter);
        edges.push(edge(subId, tfId, REL.filters));
      });
      // BridgeSubscription → delivers → Topic
      if (sub.destination) {
        const topicId = makeNodeId("topic", sub.destination);
        edges.push(edge(subId, topicId, REL.delivers));
      }
    });

    b.remoteSubscriptions?.forEach((sub, i) => {
      const subId = makeNodeId("bridgeSubscription", `${b.id}/remote/${i}`);
      nodes.push(
        node(
          subId,
          "bridgeSubscription",
          sub.destination,
          "remote",
          undefined,
          { ...sub, bridgeId: b.id, direction: "remote" } as unknown as Record<
            string,
            unknown
          >,
        ),
      );
      // Bridge → owns → BridgeSubscription
      edges.push(edge(bridgeNodeId, subId, REL.owns));
      // BridgeSubscription → filters → TopicFilter
      sub.filters?.forEach((filter) => {
        const tfId = makeNodeId("topicFilter", filter);
        edges.push(edge(subId, tfId, REL.filters));
      });
      // BridgeSubscription → delivers → Topic
      if (sub.destination) {
        const topicId = makeNodeId("topic", sub.destination);
        edges.push(edge(subId, topicId, REL.delivers));
      }
    });
  });

  return { nodes, edges };
}

// ── DataPolicy Redirect Extraction ───────────────────────────────────────

/**
 * Scans DataPolicy pipelines for Delivery.redirectTo operations.
 * Returns unique redirect target topic strings.
 *
 * Static targets (no interpolation) are returned as-is.
 * Interpolated targets (containing ${...}) are included as patterns.
 */
export function extractRedirectTopics(
  dataPolicies: DataPolicy[] | undefined,
): string[] {
  const topics = new Set<string>();

  dataPolicies?.forEach((dp) => {
    [dp.onSuccess, dp.onFailure].forEach((action) => {
      action?.pipeline?.forEach((op) => {
        if (op.functionId === "Delivery.redirectTo") {
          const args = op.arguments as Record<string, unknown>;
          const topic = args?.topic as string | undefined;
          if (topic) topics.add(topic);
        }
      });
    });
  });

  return Array.from(topics);
}

// ── Validators (derived from DataPolicy.validation) ─────────────────────

/**
 * Creates Validator nodes from DataPolicy validation.validators[].
 * Each validator references schemas via validates edges.
 */
export function deriveValidators(dataPolicies: DataPolicy[] | undefined): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  dataPolicies?.forEach((dp) => {
    const policyId = makeNodeId("dataPolicy", dp.id);
    dp.validation?.validators?.forEach((v, i) => {
      const args = v.arguments as Record<string, unknown> | undefined;

      // Extract strategy and schema references from arguments
      const strategy = (args?.strategy as string) ?? "ALL_OF";
      const schemas = (args?.schemas as Array<{ schemaId: string }>) ?? [];
      // Fallback: single schemaId at top level (simplified API format)
      const singleSchemaId = args?.schemaId as string | undefined;

      const validatorId = makeNodeId("validator", `${dp.id}/${i}`);
      nodes.push(
        node(
          validatorId,
          "validator",
          `${v.type ?? "SCHEMA"} validator`,
          strategy,
          undefined,
          {
            policyId: dp.id,
            index: i,
            type: v.type,
            strategy,
            schemaCount: schemas.length || (singleSchemaId ? 1 : 0),
            ...args,
          },
          ENTITY_RANK.dataPolicy + 1,
        ),
      );

      // DataPolicy → validatesWith → Validator
      edges.push(edge(policyId, validatorId, REL.validatesWith));

      // Validator → validates → Schema
      if (schemas.length > 0) {
        schemas.forEach((ref) => {
          if (ref.schemaId) {
            edges.push(
              edge(
                validatorId,
                makeNodeId("schema", ref.schemaId),
                REL.validates,
              ),
            );
          }
        });
      } else if (singleSchemaId) {
        edges.push(
          edge(
            validatorId,
            makeNodeId("schema", singleSchemaId),
            REL.validates,
          ),
        );
      }
    });
  });

  return { nodes, edges };
}

// ── Pipeline Operations (derived from policy pipelines) ─────────────────

/** Built-in function IDs — NOT user scripts */
const BUILT_IN_FUNCTIONS = new Set([
  "System.log",
  "Metrics.Counter.increment",
  "Mqtt.UserProperties.add",
  "Serdes.deserialize",
  "Serdes.serialize",
  "Delivery.redirectTo",
  "Mqtt.drop",
  "Mqtt.disconnect",
]);

const TERMINAL_FUNCTIONS = new Set([
  "Delivery.redirectTo",
  "Mqtt.drop",
  "Mqtt.disconnect",
]);

/**
 * Creates PipelineOperation nodes from a DataPolicy's onSuccess/onFailure pipelines.
 * Wires operations to their referenced scripts, schemas, and topics.
 */
export function deriveDataPolicyPipelines(
  dataPolicies: DataPolicy[] | undefined,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  dataPolicies?.forEach((dp) => {
    const policyId = makeNodeId("dataPolicy", dp.id);

    const phases = [
      { phase: "onSuccess", action: dp.onSuccess },
      { phase: "onFailure", action: dp.onFailure },
    ] as const;

    const pipelineBaseRank = ENTITY_RANK.dataPolicy + 1;

    phases.forEach(({ phase, action }) => {
      let prevOpId: string | null = null;
      action?.pipeline?.forEach((op, i) => {
        if (!op.functionId) return;
        const opId = makeNodeId("pipelineOperation", `${dp.id}/${phase}/${i}`);
        const isBuiltIn = BUILT_IN_FUNCTIONS.has(op.functionId);
        const isTerminal = TERMINAL_FUNCTIONS.has(op.functionId);

        nodes.push(
          node(
            opId,
            "pipelineOperation",
            op.id || op.functionId,
            op.functionId,
            undefined,
            {
              policyId: dp.id,
              functionId: op.functionId,
              pipelinePhase: phase,
              order: i,
              isBuiltIn,
              isTerminal,
              ...(op.arguments as Record<string, unknown>),
            },
            pipelineBaseRank + i,
          ),
        );

        // Chain: policy → chains → op[0] → chains → op[1] → ...
        if (prevOpId === null) {
          edges.push(edge(policyId, opId, REL.chains));
        } else {
          edges.push(edge(prevOpId, opId, REL.chains));
        }
        prevOpId = opId;

        // Wire to referenced resources
        wirePipelineOperation(
          opId,
          op.functionId,
          op.arguments as Record<string, unknown>,
          edges,
        );
      });
    });
  });

  return { nodes, edges };
}

/**
 * Creates FsmTransition nodes and their PipelineOperation nodes
 * from BehaviorPolicy.onTransitions[].
 */
export function deriveBehaviorPolicyTransitions(
  behaviorPolicies: BehaviorPolicy[] | undefined,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const eventKeys = [
    "Connection.OnDisconnect",
    "Event.OnAny",
    "Mqtt.OnInboundConnect",
    "Mqtt.OnInboundDisconnect",
    "Mqtt.OnInboundPublish",
    "Mqtt.OnInboundSubscribe",
  ] as const;

  const transitionRank = ENTITY_RANK.behaviorPolicy + 1;
  const behaviorPipelineBaseRank = transitionRank + 1;

  behaviorPolicies?.forEach((bp) => {
    const policyId = makeNodeId("behaviorPolicy", bp.id);

    bp.onTransitions?.forEach((tr, ti) => {
      const fromState = tr.fromState ?? "?";
      const toState = tr.toState ?? "?";
      const transitionId = makeNodeId(
        "fsmTransition",
        `${bp.id}/${fromState}/${toState}`,
      );

      nodes.push(
        node(
          transitionId,
          "fsmTransition",
          `${fromState} → ${toState}`,
          undefined,
          undefined,
          { policyId: bp.id, fromState, toState, index: ti },
          transitionRank,
        ),
      );

      // BehaviorPolicy → transitionsVia → FsmTransition
      edges.push(edge(policyId, transitionId, REL.transitionsVia));

      // For each event type, derive pipeline operations (chained)
      eventKeys.forEach((eventKey) => {
        const event = tr[eventKey];
        let prevOpId: string | null = null;
        event?.pipeline?.forEach((op, oi) => {
          if (!op.functionId) return;
          const opId = makeNodeId(
            "pipelineOperation",
            `${bp.id}/${fromState}/${toState}/${eventKey}/${oi}`,
          );
          const isBuiltIn = BUILT_IN_FUNCTIONS.has(op.functionId);
          const isTerminal = TERMINAL_FUNCTIONS.has(op.functionId);

          nodes.push(
            node(
              opId,
              "pipelineOperation",
              op.id || op.functionId,
              op.functionId,
              undefined,
              {
                policyId: bp.id,
                transitionId: `${fromState}/${toState}`,
                eventType: eventKey,
                functionId: op.functionId,
                pipelinePhase: "onEvent",
                order: oi,
                isBuiltIn,
                isTerminal,
                ...(op.arguments as Record<string, unknown>),
              },
              behaviorPipelineBaseRank + oi,
            ),
          );

          // Chain: transition → chains → op[0] → chains → op[1] → ...
          if (prevOpId === null) {
            edges.push(edge(transitionId, opId, REL.chains));
          } else {
            edges.push(edge(prevOpId, opId, REL.chains));
          }
          prevOpId = opId;

          // Wire to referenced resources
          wirePipelineOperation(
            opId,
            op.functionId,
            op.arguments as Record<string, unknown>,
            edges,
          );
        });
      });
    });
  });

  return { nodes, edges };
}

/**
 * Wires a pipeline operation to its referenced resources based on functionId.
 */
function wirePipelineOperation(
  opId: string,
  functionId: string,
  args: Record<string, unknown> | undefined,
  edges: GraphEdge[],
): void {
  if (!args) return;

  if (
    functionId === "Serdes.deserialize" ||
    functionId === "Serdes.serialize"
  ) {
    const schemaId = args.schemaId as string | undefined;
    if (schemaId) {
      edges.push(edge(opId, makeNodeId("schema", schemaId), REL.serializes));
    }
  } else if (functionId === "Delivery.redirectTo") {
    const topic = args.topic as string | undefined;
    if (topic) {
      edges.push(edge(opId, makeNodeId("topic", topic), REL.redirectsTo));
    }
  } else if (!BUILT_IN_FUNCTIONS.has(functionId)) {
    // User script: functionId is the script ID (or fn:<scriptId>)
    const scriptId = functionId.startsWith("fn:")
      ? functionId.slice(3)
      : functionId;
    edges.push(edge(opId, makeNodeId("script", scriptId), REL.invokes));
  }
}

// ── MQTT Wildcard Matching Edges ─────────────────────────────────────────

/**
 * Creates TopicFilter → matches → Topic edges for all matching pairs.
 */
export function computeWildcardMatches(
  topicFilterNodes: GraphNode[],
  topicNodes: GraphNode[],
): GraphEdge[] {
  const edges: GraphEdge[] = [];

  topicFilterNodes.forEach((tfNode) => {
    const filterString =
      (tfNode.data.raw?.topicFilter as string) ??
      (tfNode.data.raw?.topicPath as string) ??
      tfNode.data.label;

    topicNodes.forEach((tNode) => {
      const topicString =
        (tNode.data.raw?.topicPath as string) ?? tNode.data.label;

      if (mqttMatch(filterString, topicString)) {
        edges.push(edge(tfNode.id, tNode.id, REL.matches));
      }
    });
  });

  return edges;
}

// ── DAG Cycle Detection ──────────────────────────────────────────────────

/**
 * Removes back-edges to ensure the graph is a DAG.
 * Uses iterative DFS with coloring (white/gray/black).
 * Returns the filtered edge list.
 */
export function ensureDag(nodeIds: string[], edges: GraphEdge[]): GraphEdge[] {
  // Build adjacency list
  const adj = new Map<string, Array<{ edge: GraphEdge; target: string }>>();
  for (const id of nodeIds) adj.set(id, []);
  for (const e of edges) {
    adj.get(e.source)?.push({ edge: e, target: e.target });
  }

  const WHITE = 0,
    GRAY = 1,
    BLACK = 2;
  const color = new Map<string, number>();
  for (const id of nodeIds) color.set(id, WHITE);

  const backEdges = new Set<string>();

  // Iterative DFS
  for (const startId of nodeIds) {
    if (color.get(startId) !== WHITE) continue;

    const stack: Array<{ id: string; childIdx: number }> = [
      { id: startId, childIdx: 0 },
    ];
    color.set(startId, GRAY);

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const children = adj.get(frame.id) ?? [];

      if (frame.childIdx < children.length) {
        const child = children[frame.childIdx];
        frame.childIdx++;

        const childColor = color.get(child.target);
        if (childColor === GRAY) {
          // Back-edge detected — mark for removal
          backEdges.add(child.edge.id);
        } else if (childColor === WHITE) {
          color.set(child.target, GRAY);
          stack.push({ id: child.target, childIdx: 0 });
        }
      } else {
        color.set(frame.id, BLACK);
        stack.pop();
      }
    }
  }

  if (backEdges.size === 0) return edges;
  return edges.filter((e) => !backEdges.has(e.id));
}
