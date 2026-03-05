import { queryDataHubDef } from "@/agent/tool-definitions";
import {
  getAllBehaviorPolicies,
  getBehaviorPolicy,
  getAllDataPolicies,
  getDataPolicy,
  getAllSchemas,
  getSchema,
  getAllScripts,
  getScript,
  getFsms,
  getFunctionSpecs,
  getVariables,
} from "@/api/sdk.gen";
import { snapshotQueryResult } from "./snapshot-helper";
import { extractApiError } from "./api-error";

export const queryDataHub = queryDataHubDef.client(async (input) => {
  try {
    switch (input.operation) {
      case "listBehaviorPolicies": {
        const { data, error } = await getAllBehaviorPolicies();
        const result = {
          data: data?.items,
          error: extractApiError(error),
        };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "queryDataHub",
            operation: "listBehaviorPolicies",
            data: result.data,
            label: "Data Hub \u2014 behavior policies",
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "getBehaviorPolicy": {
        if (!input.resourceId)
          return {
            data: null,
            error: "resourceId is required for 'getBehaviorPolicy'",
          };
        const { data, error } = await getBehaviorPolicy({
          path: { policyId: input.resourceId },
        });
        const result = { data, error: extractApiError(error) };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "queryDataHub",
            operation: "getBehaviorPolicy",
            data: result.data,
            label: `Behavior policy \u2014 ${input.resourceId}`,
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "listDataPolicies": {
        const { data, error } = await getAllDataPolicies();
        const result = {
          data: data?.items,
          error: extractApiError(error),
        };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "queryDataHub",
            operation: "listDataPolicies",
            data: result.data,
            label: "Data Hub \u2014 data policies",
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "getDataPolicy": {
        if (!input.resourceId)
          return {
            data: null,
            error: "resourceId is required for 'getDataPolicy'",
          };
        const { data, error } = await getDataPolicy({
          path: { policyId: input.resourceId },
        });
        const result = { data, error: extractApiError(error) };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "queryDataHub",
            operation: "getDataPolicy",
            data: result.data,
            label: `Data policy \u2014 ${input.resourceId}`,
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "listSchemas": {
        const { data, error } = await getAllSchemas();
        const result = {
          data: data?.items,
          error: extractApiError(error),
        };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "queryDataHub",
            operation: "listSchemas",
            data: result.data,
            label: "Data Hub \u2014 schemas",
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "getSchema": {
        if (!input.resourceId)
          return {
            data: null,
            error: "resourceId is required for 'getSchema'",
          };
        const { data, error } = await getSchema({
          path: { schemaId: input.resourceId },
        });
        const result = { data, error: extractApiError(error) };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "queryDataHub",
            operation: "getSchema",
            data: result.data,
            label: `Schema \u2014 ${input.resourceId}`,
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "listScripts": {
        const { data, error } = await getAllScripts();
        const result = {
          data: data?.items,
          error: extractApiError(error),
        };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "queryDataHub",
            operation: "listScripts",
            data: result.data,
            label: "Data Hub \u2014 scripts",
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "getScript": {
        if (!input.resourceId)
          return {
            data: null,
            error: "resourceId is required for 'getScript'",
          };
        const { data, error } = await getScript({
          path: { scriptId: input.resourceId },
        });
        const result = { data, error: extractApiError(error) };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "queryDataHub",
            operation: "getScript",
            data: result.data,
            label: `Script \u2014 ${input.resourceId}`,
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "listFsms": {
        const { data, error } = await getFsms();
        const result = {
          data: data?.items,
          error: extractApiError(error),
        };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "queryDataHub",
            operation: "listFsms",
            data: result.data,
            label: "Data Hub \u2014 FSMs",
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "listFunctionSpecs": {
        const { data, error } = await getFunctionSpecs();
        const result = {
          data: data?.items,
          error: extractApiError(error),
        };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "queryDataHub",
            operation: "listFunctionSpecs",
            data: result.data,
            label: "Data Hub \u2014 function specs",
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "listVariables": {
        const { data, error } = await getVariables();
        const result = {
          data: data?.items,
          error: extractApiError(error),
        };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "queryDataHub",
            operation: "listVariables",
            data: result.data,
            label: "Data Hub \u2014 variables",
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
