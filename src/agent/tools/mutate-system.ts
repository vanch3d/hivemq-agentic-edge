import { mutateSystemDef } from "@/agent/tool-definitions";
import {
  addTopicFilters,
  updateTopicFilter,
  deleteTopicFilter,
  addCombiner,
  updateCombiner,
  deleteCombiner,
  setIsa95,
} from "@/api/sdk.gen";
import { requestApproval, invalidateQueries } from "@/agent/tool-context";
import { extractApiError } from "./api-error";

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

        const { data, error } = await addTopicFilters({
          body: input.data as never,
        });
        if (!error) invalidateQueries();
        const tf = input.data["topicFilter"] ?? "unknown";
        return {
          summary: error ? undefined : `Topic filter "${tf}" added successfully.`,
          data,
          error: extractApiError(error),
        };
      }

      case "updateTopicFilter": {
        if (!input.resourceId)
          return { data: null, error: "resourceId required" };
        if (!input.data) return { data: null, error: "data required" };

        const approved = await requestApproval({
          title: "Update Topic Filter",
          description: `Update topic filter "${input.resourceId}"?`,
        });
        if (!approved) return { data: null, error: "Rejected" };

        const { data, error } = await updateTopicFilter({
          path: { filter: input.resourceId },
          body: input.data as never,
        });
        if (!error) invalidateQueries();
        return {
          summary: error ? undefined : `Topic filter "${input.resourceId}" updated successfully.`,
          data,
          error: extractApiError(error),
        };
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
        if (!error) invalidateQueries();
        return {
          summary: error ? undefined : `Topic filter "${input.resourceId}" deleted successfully.`,
          data: error ? null : { deleted: input.resourceId },
          error: extractApiError(error),
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

        const { data, error } = await addCombiner({
          body: input.data as never,
        });
        if (!error) invalidateQueries();
        const cId = input.data["id"] ?? "unknown";
        return {
          summary: error ? undefined : `Combiner "${cId}" created successfully.`,
          data,
          error: extractApiError(error),
        };
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
          body: input.data as never,
        });
        if (!error) invalidateQueries();
        return {
          summary: error ? undefined : `Combiner "${input.resourceId}" updated successfully.`,
          data,
          error: extractApiError(error),
        };
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
        if (!error) invalidateQueries();
        return {
          summary: error ? undefined : `Combiner "${input.resourceId}" deleted successfully.`,
          data: error ? null : { deleted: input.resourceId },
          error: extractApiError(error),
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

        const { data, error } = await setIsa95({ body: input.data as never });
        if (!error) invalidateQueries();
        return {
          summary: error ? undefined : "ISA-95 configuration updated successfully.",
          data,
          error: extractApiError(error),
        };
      }
    }
  } catch (e) {
    return { data: null, error: String(e) };
  }
});
