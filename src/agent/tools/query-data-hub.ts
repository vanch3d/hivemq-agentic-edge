import { z } from "zod";
import { toolDefinition } from "@tanstack/ai";
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

const queryDataHubDef = toolDefinition({
  name: "queryDataHub",
  description:
    "Query Data Hub resources. Operations: 'listBehaviorPolicies', 'getBehaviorPolicy', 'listDataPolicies', 'getDataPolicy', 'listSchemas', 'getSchema', 'listScripts', 'getScript', 'listFsms', 'listFunctionSpecs', 'listVariables'.",
  inputSchema: z.object({
    operation: z.enum([
      "listBehaviorPolicies",
      "getBehaviorPolicy",
      "listDataPolicies",
      "getDataPolicy",
      "listSchemas",
      "getSchema",
      "listScripts",
      "getScript",
      "listFsms",
      "listFunctionSpecs",
      "listVariables",
    ]),
    resourceId: z.string().optional(),
  }),
  outputSchema: z.object({
    data: z.unknown(),
    error: z.string().optional(),
  }),
});

export const queryDataHub = queryDataHubDef.client(async (input) => {
  try {
    switch (input.operation) {
      case "listBehaviorPolicies": {
        const { data, error } = await getAllBehaviorPolicies();
        return { data: data?.items, error: error?.title };
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
        return { data, error: error?.title };
      }
      case "listDataPolicies": {
        const { data, error } = await getAllDataPolicies();
        return { data: data?.items, error: error?.title };
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
        return { data, error: error?.title };
      }
      case "listSchemas": {
        const { data, error } = await getAllSchemas();
        return { data: data?.items, error: error?.title };
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
        return { data, error: error?.title };
      }
      case "listScripts": {
        const { data, error } = await getAllScripts();
        return { data: data?.items, error: error?.title };
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
        return { data, error: error?.title };
      }
      case "listFsms": {
        const { data, error } = await getFsms();
        return { data: data?.items, error: error?.title };
      }
      case "listFunctionSpecs": {
        const { data, error } = await getFunctionSpecs();
        return { data: data?.items, error: error?.title };
      }
      case "listVariables": {
        const { data, error } = await getVariables();
        return { data: data?.items, error: error?.title };
      }
    }
  } catch (e) {
    return { data: null, error: String(e) };
  }
});
