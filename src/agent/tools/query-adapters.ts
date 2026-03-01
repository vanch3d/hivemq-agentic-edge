import {
  getAdapters,
  getAdapter,
  getAdapterTypes,
  getAdaptersForType,
  getAdapterDomainTags,
  getAdapterNorthboundMappings,
  getAdapterSouthboundMappings,
  getAdapterStatus,
  getAdaptersStatus,
} from "@/api/sdk.gen";
import { queryAdaptersDef } from "@/agent/tool-definitions";
import { snapshotQueryResult } from "./snapshot-helper";

type ApiError = { title?: string };

export const queryAdapters = queryAdaptersDef.client(async (input) => {
  try {
    switch (input.operation) {
      case "list": {
        const { data, error } = await getAdapters();
        const result = {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "queryAdapters",
            operation: "list",
            data: result.data,
            label: "Adapters \u2014 list",
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "get": {
        if (!input.adapterId)
          return { data: null, error: "adapterId is required for 'get'" };
        const { data, error } = await getAdapter({
          path: { adapterId: input.adapterId },
        });
        const result = { data, error: (error as ApiError | undefined)?.title };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "queryAdapters",
            operation: "get",
            data: result.data,
            label: `Adapter \u2014 ${input.adapterId}`,
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "listTypes": {
        const { data, error } = await getAdapterTypes();
        const result = {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "queryAdapters",
            operation: "listTypes",
            data: result.data,
            label: "Adapter types",
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "getType": {
        if (!input.adapterType)
          return { data: null, error: "adapterType is required for 'getType'" };
        const { data, error } = await getAdaptersForType({
          path: { adapterType: input.adapterType },
        });
        const result = {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "queryAdapters",
            operation: "getType",
            data: result.data,
            label: `Adapters \u2014 type ${input.adapterType}`,
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "listTags": {
        if (!input.adapterId)
          return {
            data: null,
            error: "adapterId is required for 'listTags'",
          };
        const { data, error } = await getAdapterDomainTags({
          path: { adapterId: input.adapterId },
        });
        const result = {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "queryAdapters",
            operation: "listTags",
            data: result.data,
            label: `Adapter \u2014 ${input.adapterId} tags`,
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "listNorthbound": {
        if (!input.adapterId)
          return {
            data: null,
            error: "adapterId is required for 'listNorthbound'",
          };
        const { data, error } = await getAdapterNorthboundMappings({
          path: { adapterId: input.adapterId },
        });
        const result = {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "queryAdapters",
            operation: "listNorthbound",
            data: result.data,
            label: `Adapter \u2014 ${input.adapterId} northbound`,
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "listSouthbound": {
        if (!input.adapterId)
          return {
            data: null,
            error: "adapterId is required for 'listSouthbound'",
          };
        const { data, error } = await getAdapterSouthboundMappings({
          path: { adapterId: input.adapterId },
        });
        const result = {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "queryAdapters",
            operation: "listSouthbound",
            data: result.data,
            label: `Adapter \u2014 ${input.adapterId} southbound`,
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "getStatus": {
        if (!input.adapterId)
          return {
            data: null,
            error: "adapterId is required for 'getStatus'",
          };
        const { data, error } = await getAdapterStatus({
          path: { adapterId: input.adapterId },
        });
        const result = { data, error: (error as ApiError | undefined)?.title };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "queryAdapters",
            operation: "getStatus",
            data: result.data,
            label: `Adapter \u2014 ${input.adapterId} status`,
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "listAllStatus": {
        const { data, error } = await getAdaptersStatus();
        const result = {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "queryAdapters",
            operation: "listAllStatus",
            data: result.data,
            label: "Adapters \u2014 all status",
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
