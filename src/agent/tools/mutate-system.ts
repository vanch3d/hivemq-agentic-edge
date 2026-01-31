import { z } from "zod";
import { toolDefinition } from "@tanstack/ai";
import {
  addTopicFilters,
  updateTopicFilter,
  deleteTopicFilter,
  addCombiner,
  updateCombiner,
  deleteCombiner,
  setIsa95,
} from "@/api/sdk.gen";
import { requestApproval } from "@/agent/tool-context";

const mutateSystemDef = toolDefinition({
  name: "mutateSystem",
  description:
    "Mutate system resources. Operations: 'addTopicFilter', 'updateTopicFilter', 'deleteTopicFilter', 'addCombiner', 'updateCombiner', 'deleteCombiner', 'setIsa95'. All mutations require user confirmation.",
  inputSchema: z.object({
    operation: z.enum([
      "addTopicFilter",
      "updateTopicFilter",
      "deleteTopicFilter",
      "addCombiner",
      "updateCombiner",
      "deleteCombiner",
      "setIsa95",
    ]),
    resourceId: z.string().optional(),
    data: z.record(z.unknown()).optional(),
  }),
  outputSchema: z.object({
    data: z.unknown(),
    error: z.string().optional(),
  }),
});

export const mutateSystem = mutateSystemDef.client(async (input) => {
  try {
    switch (input.operation) {
      case "addTopicFilter": {
        if (!input.data)
          return { data: null, error: "data is required for 'addTopicFilter'" };

        const approved = await requestApproval({
          title: "Add Topic Filter",
          description: `Add topic filter "${input.data["topicFilter"] ?? ""}"?`,
        });
        if (!approved) return { data: null, error: "Rejected" };

        const { data, error } = await addTopicFilters({ body: input.data });
        return { data, error: error?.title };
      }

      case "updateTopicFilter": {
        if (!input.resourceId)
          return { data: null, error: "resourceId required" };
        if (!input.data)
          return { data: null, error: "data required" };

        const approved = await requestApproval({
          title: "Update Topic Filter",
          description: `Update topic filter "${input.resourceId}"?`,
        });
        if (!approved) return { data: null, error: "Rejected" };

        const { data, error } = await updateTopicFilter({
          path: { filter: input.resourceId },
          body: input.data,
        });
        return { data, error: error?.title };
      }

      case "deleteTopicFilter": {
        if (!input.resourceId)
          return { data: null, error: "resourceId required" };

        const approved = await requestApproval({
          title: "Delete Topic Filter",
          description: `Delete topic filter "${input.resourceId}"?`,
        });
        if (!approved) return { data: null, error: "Rejected" };

        const { error } = await deleteTopicFilter({
          path: { filter: input.resourceId },
        });
        return {
          data: error ? null : { deleted: input.resourceId },
          error: error?.title,
        };
      }

      case "addCombiner": {
        if (!input.data)
          return { data: null, error: "data is required for 'addCombiner'" };

        const approved = await requestApproval({
          title: "Add Combiner",
          description: `Create combiner "${input.data["id"] ?? ""}"?`,
        });
        if (!approved) return { data: null, error: "Rejected" };

        const { data, error } = await addCombiner({ body: input.data });
        return { data, error: error?.title };
      }

      case "updateCombiner": {
        if (!input.resourceId)
          return { data: null, error: "resourceId required" };
        if (!input.data) return { data: null, error: "data required" };

        const approved = await requestApproval({
          title: "Update Combiner",
          description: `Update combiner "${input.resourceId}"?`,
        });
        if (!approved) return { data: null, error: "Rejected" };

        const { data, error } = await updateCombiner({
          path: { combinerId: input.resourceId },
          body: input.data,
        });
        return { data, error: error?.title };
      }

      case "deleteCombiner": {
        if (!input.resourceId)
          return { data: null, error: "resourceId required" };

        const approved = await requestApproval({
          title: "Delete Combiner",
          description: `Permanently delete combiner "${input.resourceId}"?`,
        });
        if (!approved) return { data: null, error: "Rejected" };

        const { error } = await deleteCombiner({
          path: { combinerId: input.resourceId },
        });
        return {
          data: error ? null : { deleted: input.resourceId },
          error: error?.title,
        };
      }

      case "setIsa95": {
        if (!input.data)
          return { data: null, error: "data is required for 'setIsa95'" };

        const approved = await requestApproval({
          title: "Update ISA-95 Configuration",
          description: "Update the Unified Namespace ISA-95 hierarchy?",
        });
        if (!approved) return { data: null, error: "Rejected" };

        const { data, error } = await setIsa95({ body: input.data });
        return { data, error: error?.title };
      }
    }
  } catch (e) {
    return { data: null, error: String(e) };
  }
});
