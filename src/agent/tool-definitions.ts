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
    summary: z
      .string()
      .optional()
      .describe(
        "Human-readable outcome of the mutation (e.g. 'Bridge test-bridge created successfully'). Use this to acknowledge the result to the user.",
      ),
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
    summary: z
      .string()
      .optional()
      .describe(
        "Human-readable outcome of the mutation (e.g. 'Bridge test-bridge created successfully'). Use this to acknowledge the result to the user.",
      ),
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
    summary: z
      .string()
      .optional()
      .describe(
        "Human-readable outcome of the mutation (e.g. 'Bridge test-bridge created successfully'). Use this to acknowledge the result to the user.",
      ),
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
    summary: z
      .string()
      .optional()
      .describe(
        "Human-readable outcome of the mutation (e.g. 'Bridge test-bridge created successfully'). Use this to acknowledge the result to the user.",
      ),
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
    summary: z
      .string()
      .optional()
      .describe(
        "Human-readable outcome of the mutation (e.g. 'Bridge test-bridge created successfully'). Use this to acknowledge the result to the user.",
      ),
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
    summary: z
      .string()
      .optional()
      .describe(
        "Human-readable outcome of the mutation (e.g. 'Bridge test-bridge created successfully'). Use this to acknowledge the result to the user.",
      ),
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
    summary: z
      .string()
      .optional()
      .describe(
        "Human-readable outcome of the mutation (e.g. 'Bridge test-bridge created successfully'). Use this to acknowledge the result to the user.",
      ),
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
    summary: z
      .string()
      .optional()
      .describe(
        "Human-readable outcome of the mutation (e.g. 'Bridge test-bridge created successfully'). Use this to acknowledge the result to the user.",
      ),
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
    summary: z
      .string()
      .optional()
      .describe(
        "Human-readable outcome of the mutation (e.g. 'Bridge test-bridge created successfully'). Use this to acknowledge the result to the user.",
      ),
    data: z.unknown(),
    error: z.string().optional(),
  }),
});

export const queryGraphDef = toolDefinition({
  name: "queryGraph",
  description:
    "Visualize the HiveMQ Edge domain ontology as an interactive graph. Scopes: 'full' (everything), 'dataFlow' (adapters → tags → topics → policies), 'adapterTopology' (adapters + tags + mappings), 'policyImpact' (policies → schemas/scripts), 'bridgeTopology' (bridges + topic filters), 'combinerSources' (combiners + sources). Use selectNodeId to select and zoom to a specific node (format: entityType:entityId, e.g. 'bridge:my-bridge'). Use focusEntityId to filter the scope to show only neighbors of that entity. Both can be combined.",
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
    selectNodeId: z
      .string()
      .optional()
      .describe(
        "Node ID to select and zoom to (format: entityType:entityId, e.g. 'bridge:my-bridge')",
      ),
  }),
  outputSchema: z.object({
    display: z.literal("graph"),
    scope: z.string(),
    nodeCount: z.number(),
    edgeCount: z.number(),
  }),
});

export const queryMetricsDef = toolDefinition({
  name: "queryMetrics",
  description:
    "Query metric values and monitor metrics live. Operations: 'getValue' reads a single metric's current value, 'search' finds metrics by name pattern, 'monitor' starts a live-updating sparkline visualization. Metric names follow the convention: com.hivemq.edge.protocol-adapters.{type}.{id}.{metric}, com.hivemq.edge.bridge.{bridgeName}.{metric}, com.hivemq.messages.{direction}.total.count. Use 'search' first to find the correct metric name if unsure.",
  inputSchema: z.object({
    operation: z.enum(["getValue", "monitor", "search"]),
    metricName: z
      .string()
      .optional()
      .describe("Full metric name for 'getValue'"),
    metricNames: z
      .array(z.string())
      .optional()
      .describe(
        "Array of metric names for 'monitor' (renders a grid of sparklines)",
      ),
    pattern: z
      .string()
      .optional()
      .describe("Substring to match against metric names for 'search'"),
    pollInterval: z
      .number()
      .optional()
      .describe(
        "Polling interval in milliseconds for 'monitor' (default 2000). Use longer intervals for slow-changing metrics.",
      ),
  }),
  outputSchema: z.object({
    summary: z
      .string()
      .optional()
      .describe(
        "Human-readable outcome (e.g. 'Current value of metric X is 42').",
      ),
    data: z.unknown(),
    error: z.string().optional(),
    display: z.string().optional(),
    metricNames: z.array(z.string()).optional(),
    pollInterval: z.number().optional(),
  }),
});

export const querySnapshotsDef = toolDefinition({
  name: "querySnapshots",
  description:
    "Search and navigate to saved query snapshots (recent query results). Use 'list' to see all snapshots, 'search' to filter by toolName or label text, 'open' to navigate the user to one or more snapshots by id. Each snapshot has: id, toolName (e.g. 'queryBridges'), operation, label, displayType, timestamp.",
  inputSchema: z.object({
    operation: z.enum(["list", "search", "open"]),
    toolName: z
      .string()
      .optional()
      .describe(
        "Filter by tool name for 'search', e.g. 'queryBridges', 'queryAdapters'",
      ),
    query: z
      .string()
      .optional()
      .describe("Text to search in snapshot labels for 'search'"),
    ids: z
      .array(z.string())
      .optional()
      .describe("Snapshot IDs to open for 'open'"),
    limit: z.number().optional().describe("Max results to return (default 10)"),
  }),
  outputSchema: z.object({
    snapshots: z.array(
      z.object({
        id: z.string(),
        toolName: z.string(),
        operation: z.string(),
        label: z.string(),
        displayType: z.string(),
        timestamp: z.number(),
      }),
    ),
    opened: z.array(z.string()).optional(),
    error: z.string().optional(),
  }),
});

/** All tool definitions for server-side registration */
export const allToolDefinitions = [
  queryBridgesDef,
  queryAdaptersDef,
  queryDataHubDef,
  querySystemDef,
  querySamplingDef,
  queryMetricsDef,
  navigateToDef,
  mutateBridgeDef,
  mutateAdapterDef,
  mutateDataHubDef,
  mutateSystemDef,
  queryGraphDef,
  querySnapshotsDef,
];
