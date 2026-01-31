import { z } from "zod";
import { toolDefinition } from "@tanstack/ai";
import {
  getEvents,
  getMetrics,
  getNotifications,
  getCapabilities,
  liveness,
  readiness,
  getListeners,
  getIsa95,
  getPulseStatus,
  getCombiners,
  getCombinersById,
  getTopicFilters,
  getTopicFilter,
  getConfiguration,
} from "@/api/sdk.gen";

const querySystemDef = toolDefinition({
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

export const querySystem = querySystemDef.client(async (input) => {
  try {
    switch (input.operation) {
      case "events": {
        const { data, error } = await getEvents();
        return { data: data?.items, error: error?.title };
      }
      case "metrics": {
        const { data, error } = await getMetrics();
        return { data: data?.items, error: error?.title };
      }
      case "notifications": {
        const { data, error } = await getNotifications();
        return { data: data?.items, error: error?.title };
      }
      case "capabilities": {
        const { data, error } = await getCapabilities();
        return { data, error: error?.title };
      }
      case "liveness": {
        const { data, error } = await liveness();
        return { data, error: error?.title };
      }
      case "readiness": {
        const { data, error } = await readiness();
        return { data, error: error?.title };
      }
      case "listeners": {
        const { data, error } = await getListeners();
        return { data: data?.items, error: error?.title };
      }
      case "isa95": {
        const { data, error } = await getIsa95();
        return { data, error: error?.title };
      }
      case "pulseStatus": {
        const { data, error } = await getPulseStatus();
        return { data, error: error?.title };
      }
      case "listCombiners": {
        const { data, error } = await getCombiners();
        return { data: data?.items, error: error?.title };
      }
      case "getCombiner": {
        if (!input.resourceId)
          return {
            data: null,
            error: "resourceId is required for 'getCombiner'",
          };
        const { data, error } = await getCombinersById({
          path: { combinerId: input.resourceId },
        });
        return { data, error: error?.title };
      }
      case "listTopicFilters": {
        const { data, error } = await getTopicFilters();
        return { data: data?.items, error: error?.title };
      }
      case "getTopicFilter": {
        if (!input.resourceId)
          return {
            data: null,
            error: "resourceId is required for 'getTopicFilter'",
          };
        const { data, error } = await getTopicFilter({
          path: { filter: input.resourceId },
        });
        return { data, error: error?.title };
      }
      case "configuration": {
        const { data, error } = await getConfiguration();
        return { data, error: error?.title };
      }
    }
  } catch (e) {
    return { data: null, error: String(e) };
  }
});
