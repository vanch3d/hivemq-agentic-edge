import {
  getBridges,
  getBridgeByName,
  getBridgesStatus,
  getBridgeStatus,
} from "@/api/sdk.gen";
import { queryBridgesDef } from "@/agent/tool-definitions";
import { snapshotQueryResult } from "./snapshot-helper";
import { extractApiError } from "./api-error";

export const queryBridges = queryBridgesDef.client(async (input) => {
  try {
    switch (input.operation) {
      case "list": {
        const { data, error } = await getBridges();
        const result = {
          data: data?.items,
          error: extractApiError(error),
        };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "queryBridges",
            operation: "list",
            data: result.data,
            label: "Bridges \u2014 list",
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "get": {
        if (!input.bridgeId)
          return { data: null, error: "bridgeId is required for 'get'" };
        const { data, error } = await getBridgeByName({
          path: { bridgeId: input.bridgeId },
        });
        const result = { data, error: extractApiError(error) };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "queryBridges",
            operation: "get",
            data: result.data,
            label: `Bridge \u2014 ${input.bridgeId}`,
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "listStatus": {
        const { data, error } = await getBridgesStatus();
        const result = {
          data: data?.items,
          error: extractApiError(error),
        };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "queryBridges",
            operation: "listStatus",
            data: result.data,
            label: "Bridges \u2014 status",
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "getStatus": {
        if (!input.bridgeId)
          return { data: null, error: "bridgeId is required for 'getStatus'" };
        const { data, error } = await getBridgeStatus({
          path: { bridgeId: input.bridgeId },
        });
        const result = { data, error: extractApiError(error) };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "queryBridges",
            operation: "getStatus",
            data: result.data,
            label: `Bridge \u2014 ${input.bridgeId} status`,
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
