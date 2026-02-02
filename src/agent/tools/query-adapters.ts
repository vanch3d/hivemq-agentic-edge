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

type ApiError = { title?: string };

export const queryAdapters = queryAdaptersDef.client(async (input) => {
  try {
    switch (input.operation) {
      case "list": {
        const { data, error } = await getAdapters();
        return {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
      }
      case "get": {
        if (!input.adapterId)
          return { data: null, error: "adapterId is required for 'get'" };
        const { data, error } = await getAdapter({
          path: { adapterId: input.adapterId },
        });
        return { data, error: (error as ApiError | undefined)?.title };
      }
      case "listTypes": {
        const { data, error } = await getAdapterTypes();
        return {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
      }
      case "getType": {
        if (!input.adapterType)
          return { data: null, error: "adapterType is required for 'getType'" };
        const { data, error } = await getAdaptersForType({
          path: { adapterType: input.adapterType },
        });
        return {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
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
        return {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
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
        return {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
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
        return {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
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
        return { data, error: (error as ApiError | undefined)?.title };
      }
      case "listAllStatus": {
        const { data, error } = await getAdaptersStatus();
        return {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
      }
    }
  } catch (e) {
    return { data: null, error: String(e) };
  }
});
