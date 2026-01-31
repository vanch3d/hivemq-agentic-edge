import { z } from "zod";
import { toolDefinition } from "@tanstack/ai";
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

const queryAdaptersDef = toolDefinition({
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

export const queryAdapters = queryAdaptersDef.client(async (input) => {
  try {
    switch (input.operation) {
      case "list": {
        const { data, error } = await getAdapters();
        return { data: data?.items, error: error?.title };
      }
      case "get": {
        if (!input.adapterId)
          return { data: null, error: "adapterId is required for 'get'" };
        const { data, error } = await getAdapter({
          path: { adapterId: input.adapterId },
        });
        return { data, error: error?.title };
      }
      case "listTypes": {
        const { data, error } = await getAdapterTypes();
        return { data: data?.items, error: error?.title };
      }
      case "getType": {
        if (!input.adapterType)
          return { data: null, error: "adapterType is required for 'getType'" };
        const { data, error } = await getAdaptersForType({
          path: { adapterType: input.adapterType },
        });
        return { data: data?.items, error: error?.title };
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
        return { data: data?.items, error: error?.title };
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
        return { data: data?.items, error: error?.title };
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
        return { data: data?.items, error: error?.title };
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
        return { data, error: error?.title };
      }
      case "listAllStatus": {
        const { data, error } = await getAdaptersStatus();
        return { data: data?.items, error: error?.title };
      }
    }
  } catch (e) {
    return { data: null, error: String(e) };
  }
});
