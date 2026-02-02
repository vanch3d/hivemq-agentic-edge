/**
 * Shared tool definitions (metadata only — no execution logic).
 *
 * These are used by both:
 * - The client (via `.client()` in each tool file) for local execution
 * - The server (via `chat({ tools })`) so the AI model knows which tools
 *   are available and can emit tool call events
 *
 * This file must remain free of browser-only imports (no sdk.gen, no
 * React Router, no DOM APIs).
 */
import { z } from "zod";
import { toolDefinition } from "@tanstack/ai";

export const queryBridgesDef = toolDefinition({
  name: "queryBridges",
  description:
    "Query MQTT bridge resources. Use 'list' to get all bridges, 'get' to get a single bridge by ID, 'listStatus' for all bridge statuses, 'getStatus' for a single bridge status.",
  inputSchema: z.object({
    operation: z.enum(["list", "get", "listStatus", "getStatus"]),
    bridgeId: z.string().optional(),
  }),
  outputSchema: z.object({
    data: z.unknown(),
    error: z.string().optional(),
  }),
});

export const queryAdaptersDef = toolDefinition({
  name: "queryAdapters",
  description:
    "Query protocol adapter resources. Use 'list' to get all adapters, 'get' for a single adapter, 'listTypes' for available adapter types, 'getType' for adapters of a specific type, 'listTags' for domain tags, 'listNorthbound'/'listSouthbound' for mappings, 'getStatus' for one adapter status, 'listAllStatus' for all statuses.",
  inputSchema: z.object({
    operation: z.enum([
      "list",
      "get",
      "listTypes",
      "getType",
      "listTags",
      "listNorthbound",
      "listSouthbound",
      "getStatus",
      "listAllStatus",
    ]),
    adapterId: z.string().optional(),
    adapterType: z.string().optional(),
  }),
  outputSchema: z.object({
    data: z.unknown(),
    error: z.string().optional(),
  }),
});

export const queryDataHubDef = toolDefinition({
  name: "queryDataHub",
  description:
    "Query Data Hub resources. Operations: 'listBehaviorPolicies', 'getBehaviorPolicy', 'listDataPolicies', 'getDataPolicy', 'listSchemas', 'getSchema', 'listScripts', 'getScript', 'listFsms', 'listFunctionSpecs', 'listVariables'.",
  inputSchema: z.object({
    operation: z.enum([
      "listBehaviorPolicies",
      "getBehaviorPolicy",
      "listDataPolicies",
      "getDataPolicy",
      "listSchemas",
      "getSchema",
      "listScripts",
      "getScript",
      "listFsms",
      "listFunctionSpecs",
      "listVariables",
    ]),
    resourceId: z.string().optional(),
  }),
  outputSchema: z.object({
    data: z.unknown(),
    error: z.string().optional(),
  }),
});

export const querySystemDef = toolDefinition({
  name: "querySystem",
  description:
    "Query system-level resources. Operations: 'events', 'metrics', 'notifications', 'capabilities', 'liveness', 'readiness', 'listeners', 'isa95', 'pulseStatus', 'listCombiners', 'getCombiner', 'listTopicFilters', 'getTopicFilter', 'configuration'.",
  inputSchema: z.object({
    operation: z.enum([
      "events",
      "metrics",
      "notifications",
      "capabilities",
      "liveness",
      "readiness",
      "listeners",
      "isa95",
      "pulseStatus",
      "listCombiners",
      "getCombiner",
      "listTopicFilters",
      "getTopicFilter",
      "configuration",
    ]),
    resourceId: z.string().optional(),
  }),
  outputSchema: z.object({
    data: z.unknown(),
    error: z.string().optional(),
  }),
});

export const querySamplingDef = toolDefinition({
  name: "querySampling",
  description:
    "Query topic sampling data. Use 'samples' to get sampled messages for a topic, 'schema' to get the inferred schema for a topic.",
  inputSchema: z.object({
    operation: z.enum(["samples", "schema"]),
    topic: z.string(),
  }),
  outputSchema: z.object({
    data: z.unknown(),
    error: z.string().optional(),
  }),
});

const KNOWN_ROUTES = ["/workspace", "/login"] as const;

export const navigateToDef = toolDefinition({
  name: "navigateTo",
  description: `Navigate the user to a page in the HiveMQ Edge management UI. Known routes: ${KNOWN_ROUTES.join(", ")}. You may also navigate to sub-routes as they are added.`,
  inputSchema: z.object({
    path: z
      .string()
      .describe("The route path to navigate to, e.g. '/workspace'"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    path: z.string(),
    error: z.string().optional(),
  }),
});

export const mutateBridgeDef = toolDefinition({
  name: "mutateBridge",
  description:
    "Mutate MQTT bridge resources. Operations: 'create', 'update', 'delete', 'transitionStatus'. All mutations require user confirmation.",
  inputSchema: z.object({
    operation: z.enum(["create", "update", "delete", "transitionStatus"]),
    bridgeId: z.string().optional(),
    prefill: z.record(z.string(), z.unknown()).optional(),
  }),
  outputSchema: z.object({
    data: z.unknown(),
    error: z.string().optional(),
  }),
});

export const mutateAdapterDef = toolDefinition({
  name: "mutateAdapter",
  description:
    "Mutate protocol adapter resources. Operations: 'create', 'update', 'delete', 'transitionStatus'. All mutations require user confirmation.",
  inputSchema: z.object({
    operation: z.enum(["create", "update", "delete", "transitionStatus"]),
    adapterId: z.string().optional(),
    adapterType: z.string().optional(),
    prefill: z.record(z.string(), z.unknown()).optional(),
  }),
  outputSchema: z.object({
    data: z.unknown(),
    error: z.string().optional(),
  }),
});

export const mutateDataHubDef = toolDefinition({
  name: "mutateDataHub",
  description:
    "Mutate Data Hub resources. Operations: 'createBehaviorPolicy', 'updateBehaviorPolicy', 'deleteBehaviorPolicy', 'createDataPolicy', 'updateDataPolicy', 'deleteDataPolicy', 'createSchema', 'deleteSchema', 'createScript', 'deleteScript'. All mutations require user confirmation.",
  inputSchema: z.object({
    operation: z.enum([
      "createBehaviorPolicy",
      "updateBehaviorPolicy",
      "deleteBehaviorPolicy",
      "createDataPolicy",
      "updateDataPolicy",
      "deleteDataPolicy",
      "createSchema",
      "deleteSchema",
      "createScript",
      "deleteScript",
    ]),
    resourceId: z.string().optional(),
    prefill: z.record(z.string(), z.unknown()).optional(),
  }),
  outputSchema: z.object({
    data: z.unknown(),
    error: z.string().optional(),
  }),
});

export const mutateSystemDef = toolDefinition({
  name: "mutateSystem",
  description:
    "Mutate system resources. Operations: 'addTopicFilter', 'updateTopicFilter', 'deleteTopicFilter', 'addCombiner', 'updateCombiner', 'deleteCombiner', 'setIsa95'. All mutations require user confirmation.",
  inputSchema: z.object({
    operation: z.enum([
      "addTopicFilter",
      "updateTopicFilter",
      "deleteTopicFilter",
      "addCombiner",
      "updateCombiner",
      "deleteCombiner",
      "setIsa95",
    ]),
    resourceId: z.string().optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  }),
  outputSchema: z.object({
    data: z.unknown(),
    error: z.string().optional(),
  }),
});

export const queryGraphDef = toolDefinition({
  name: "queryGraph",
  description:
    "Visualize the HiveMQ Edge domain ontology as an interactive graph. Scopes: 'full' (everything), 'dataFlow' (adapters → tags → topics → policies), 'adapterTopology' (adapters + tags + mappings), 'policyImpact' (policies → schemas/scripts), 'bridgeTopology' (bridges + topic filters), 'combinerSources' (combiners + sources). Optionally focus on a specific entity.",
  inputSchema: z.object({
    scope: z.enum([
      "full",
      "dataFlow",
      "adapterTopology",
      "policyImpact",
      "bridgeTopology",
      "combinerSources",
    ]),
    focusEntityId: z.string().optional(),
  }),
  outputSchema: z.object({
    display: z.literal("graph"),
    scope: z.string(),
    nodeCount: z.number(),
    edgeCount: z.number(),
  }),
});

/** All tool definitions for server-side registration */
export const allToolDefinitions = [
  queryBridgesDef,
  queryAdaptersDef,
  queryDataHubDef,
  querySystemDef,
  querySamplingDef,
  navigateToDef,
  mutateBridgeDef,
  mutateAdapterDef,
  mutateDataHubDef,
  mutateSystemDef,
  queryGraphDef,
];
