import { querySystemDef } from "@/agent/tool-definitions";
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
import { snapshotQueryResult } from "./snapshot-helper";

type ApiError = { title?: string };

export const querySystem = querySystemDef.client(async (input) => {
  try {
    switch (input.operation) {
      case "events": {
        const { data, error } = await getEvents();
        const result = {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "querySystem",
            operation: "events",
            data: result.data,
            label: "System \u2014 events",
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "metrics": {
        const { data, error } = await getMetrics();
        const result = {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "querySystem",
            operation: "metrics",
            data: result.data,
            label: "System \u2014 metrics",
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "notifications": {
        const { data, error } = await getNotifications();
        const result = {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "querySystem",
            operation: "notifications",
            data: result.data,
            label: "System \u2014 notifications",
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "capabilities": {
        const { data, error } = await getCapabilities();
        const result = { data, error: (error as ApiError | undefined)?.title };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "querySystem",
            operation: "capabilities",
            data: result.data,
            label: "System \u2014 capabilities",
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "liveness": {
        const { data, error } = await liveness();
        const result = { data, error: (error as ApiError | undefined)?.title };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "querySystem",
            operation: "liveness",
            data: result.data,
            label: "System \u2014 liveness",
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "readiness": {
        const { data, error } = await readiness();
        const result = { data, error: (error as ApiError | undefined)?.title };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "querySystem",
            operation: "readiness",
            data: result.data,
            label: "System \u2014 readiness",
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "listeners": {
        const { data, error } = await getListeners();
        const result = {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "querySystem",
            operation: "listeners",
            data: result.data,
            label: "System \u2014 listeners",
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "isa95": {
        const { data, error } = await getIsa95();
        const result = { data, error: (error as ApiError | undefined)?.title };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "querySystem",
            operation: "isa95",
            data: result.data,
            label: "System \u2014 ISA-95",
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "pulseStatus": {
        const { data, error } = await getPulseStatus();
        const result = { data, error: (error as ApiError | undefined)?.title };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "querySystem",
            operation: "pulseStatus",
            data: result.data,
            label: "System \u2014 pulse status",
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "listCombiners": {
        const { data, error } = await getCombiners();
        const result = {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "querySystem",
            operation: "listCombiners",
            data: result.data,
            label: "System \u2014 combiners",
          });
          return { ...result, snapshotId };
        }
        return result;
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
        const result = { data, error: (error as ApiError | undefined)?.title };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "querySystem",
            operation: "getCombiner",
            data: result.data,
            label: `Combiner \u2014 ${input.resourceId}`,
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "listTopicFilters": {
        const { data, error } = await getTopicFilters();
        const result = {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "querySystem",
            operation: "listTopicFilters",
            data: result.data,
            label: "System \u2014 topic filters",
          });
          return { ...result, snapshotId };
        }
        return result;
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
        const result = { data, error: (error as ApiError | undefined)?.title };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "querySystem",
            operation: "getTopicFilter",
            data: result.data,
            label: `Topic filter \u2014 ${input.resourceId}`,
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "configuration": {
        const { data, error } = await getConfiguration();
        const result = { data, error: (error as ApiError | undefined)?.title };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "querySystem",
            operation: "configuration",
            data: result.data,
            label: "System \u2014 configuration",
          });
          return { ...result, snapshotId };
        }
        return result;
      }
    }
  } catch (e) {
    return { data: null, error: String(e) };
  }
});
