import { z } from "zod";
import { toolDefinition } from "@tanstack/ai";
import {
  getBridges,
  getBridgeByName,
  getBridgesStatus,
  getBridgeStatus,
} from "@/api/sdk.gen";

const queryBridgesDef = toolDefinition({
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

export const queryBridges = queryBridgesDef.client(async (input) => {
  try {
    switch (input.operation) {
      case "list": {
        const { data, error } = await getBridges();
        return { data: data?.items, error: error?.title };
      }
      case "get": {
        if (!input.bridgeId)
          return { data: null, error: "bridgeId is required for 'get'" };
        const { data, error } = await getBridgeByName({
          path: { bridgeId: input.bridgeId },
        });
        return { data, error: error?.title };
      }
      case "listStatus": {
        const { data, error } = await getBridgesStatus();
        return { data: data?.items, error: error?.title };
      }
      case "getStatus": {
        if (!input.bridgeId)
          return { data: null, error: "bridgeId is required for 'getStatus'" };
        const { data, error } = await getBridgeStatus({
          path: { bridgeId: input.bridgeId },
        });
        return { data, error: error?.title };
      }
    }
  } catch (e) {
    return { data: null, error: String(e) };
  }
});
