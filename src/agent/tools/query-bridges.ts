import {
  getBridges,
  getBridgeByName,
  getBridgesStatus,
  getBridgeStatus,
} from "@/api/sdk.gen";
import { queryBridgesDef } from "@/agent/tool-definitions";

type ApiError = { title?: string };

export const queryBridges = queryBridgesDef.client(async (input) => {
  try {
    switch (input.operation) {
      case "list": {
        const { data, error } = await getBridges();
        return {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
      }
      case "get": {
        if (!input.bridgeId)
          return { data: null, error: "bridgeId is required for 'get'" };
        const { data, error } = await getBridgeByName({
          path: { bridgeId: input.bridgeId },
        });
        return { data, error: (error as ApiError | undefined)?.title };
      }
      case "listStatus": {
        const { data, error } = await getBridgesStatus();
        return {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
      }
      case "getStatus": {
        if (!input.bridgeId)
          return { data: null, error: "bridgeId is required for 'getStatus'" };
        const { data, error } = await getBridgeStatus({
          path: { bridgeId: input.bridgeId },
        });
        return { data, error: (error as ApiError | undefined)?.title };
      }
    }
  } catch (e) {
    return { data: null, error: String(e) };
  }
});
