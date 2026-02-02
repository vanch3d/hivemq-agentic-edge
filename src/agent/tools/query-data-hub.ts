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

type ApiError = { title?: string };

export const queryDataHub = queryDataHubDef.client(async (input) => {
  try {
    switch (input.operation) {
      case "listBehaviorPolicies": {
        const { data, error } = await getAllBehaviorPolicies();
        return {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
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
        return { data, error: (error as ApiError | undefined)?.title };
      }
      case "listDataPolicies": {
        const { data, error } = await getAllDataPolicies();
        return {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
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
        return { data, error: (error as ApiError | undefined)?.title };
      }
      case "listSchemas": {
        const { data, error } = await getAllSchemas();
        return {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
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
        return { data, error: (error as ApiError | undefined)?.title };
      }
      case "listScripts": {
        const { data, error } = await getAllScripts();
        return {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
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
        return { data, error: (error as ApiError | undefined)?.title };
      }
      case "listFsms": {
        const { data, error } = await getFsms();
        return {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
      }
      case "listFunctionSpecs": {
        const { data, error } = await getFunctionSpecs();
        return {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
      }
      case "listVariables": {
        const { data, error } = await getVariables();
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
