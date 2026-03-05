import { mutateDataHubDef } from "@/agent/tool-definitions";
import {
  createBehaviorPolicy,
  updateBehaviorPolicy,
  deleteBehaviorPolicy,
  createDataPolicy,
  updateDataPolicy,
  deleteDataPolicy,
  createSchema,
  deleteSchema,
  createScript,
  deleteScript,
} from "@/api/sdk.gen";
import { requestFormInput, requestApproval } from "@/agent/tool-context";
import { getFormSchema } from "@/agent/form-schemas";
import { extractApiError } from "./api-error";

export const mutateDataHub = mutateDataHubDef.client(async (input) => {
  try {
    switch (input.operation) {
      // --- Behavior Policies ---
      case "createBehaviorPolicy": {
        const entry = getFormSchema("mutateDataHub", "createBehaviorPolicy");
        if (!entry) return { data: null, error: "No schema" };

        const formResult = await requestFormInput({
          schema: entry.schema,
          title: "Create Behavior Policy",
          formData: input.prefill,
          requiredOnly: entry.requiredOnly,
        });
        if (!formResult.submitted) return { data: null, error: "Cancelled" };

        const { data, error } = await createBehaviorPolicy({
          body: formResult.data as never,
        });
        return { data, error: extractApiError(error) };
      }

      case "updateBehaviorPolicy": {
        if (!input.resourceId)
          return { data: null, error: "resourceId required" };

        const entry = getFormSchema("mutateDataHub", "updateBehaviorPolicy");
        if (!entry) return { data: null, error: "No schema" };

        const formResult = await requestFormInput({
          schema: entry.schema,
          title: `Update Behavior Policy: ${input.resourceId}`,
          formData: { id: input.resourceId, ...input.prefill },
        });
        if (!formResult.submitted) return { data: null, error: "Cancelled" };

        const { data, error } = await updateBehaviorPolicy({
          path: { policyId: input.resourceId },
          body: formResult.data as never,
        });
        return { data, error: extractApiError(error) };
      }

      case "deleteBehaviorPolicy": {
        if (!input.resourceId)
          return { data: null, error: "resourceId required" };

        const approved = await requestApproval({
          title: "Delete Behavior Policy",
          description: `Permanently delete policy "${input.resourceId}"?`,
        });
        if (!approved) return { data: null, error: "Rejected" };

        const { error } = await deleteBehaviorPolicy({
          path: { policyId: input.resourceId },
        });
        return {
          data: error ? null : { deleted: input.resourceId },
          error: extractApiError(error),
        };
      }

      // --- Data Policies ---
      case "createDataPolicy": {
        const entry = getFormSchema("mutateDataHub", "createDataPolicy");
        if (!entry) return { data: null, error: "No schema" };

        const formResult = await requestFormInput({
          schema: entry.schema,
          title: "Create Data Policy",
          formData: input.prefill,
          requiredOnly: entry.requiredOnly,
        });
        if (!formResult.submitted) return { data: null, error: "Cancelled" };

        const { data, error } = await createDataPolicy({
          body: formResult.data as never,
        });
        return { data, error: extractApiError(error) };
      }

      case "updateDataPolicy": {
        if (!input.resourceId)
          return { data: null, error: "resourceId required" };

        const entry = getFormSchema("mutateDataHub", "updateDataPolicy");
        if (!entry) return { data: null, error: "No schema" };

        const formResult = await requestFormInput({
          schema: entry.schema,
          title: `Update Data Policy: ${input.resourceId}`,
          formData: { id: input.resourceId, ...input.prefill },
        });
        if (!formResult.submitted) return { data: null, error: "Cancelled" };

        const { data, error } = await updateDataPolicy({
          path: { policyId: input.resourceId },
          body: formResult.data as never,
        });
        return { data, error: extractApiError(error) };
      }

      case "deleteDataPolicy": {
        if (!input.resourceId)
          return { data: null, error: "resourceId required" };

        const approved = await requestApproval({
          title: "Delete Data Policy",
          description: `Permanently delete policy "${input.resourceId}"?`,
        });
        if (!approved) return { data: null, error: "Rejected" };

        const { error } = await deleteDataPolicy({
          path: { policyId: input.resourceId },
        });
        return {
          data: error ? null : { deleted: input.resourceId },
          error: extractApiError(error),
        };
      }

      // --- Schemas ---
      case "createSchema": {
        const entry = getFormSchema("mutateDataHub", "createSchema");
        if (!entry) return { data: null, error: "No schema" };

        const formResult = await requestFormInput({
          schema: entry.schema,
          title: "Create Schema",
          formData: input.prefill,
          requiredOnly: entry.requiredOnly,
        });
        if (!formResult.submitted) return { data: null, error: "Cancelled" };

        const { data, error } = await createSchema({
          body: formResult.data as never,
        });
        return { data, error: extractApiError(error) };
      }

      case "deleteSchema": {
        if (!input.resourceId)
          return { data: null, error: "resourceId required" };

        const approved = await requestApproval({
          title: "Delete Schema",
          description: `Permanently delete schema "${input.resourceId}" and all its versions?`,
        });
        if (!approved) return { data: null, error: "Rejected" };

        const { error } = await deleteSchema({
          path: { schemaId: input.resourceId },
        });
        return {
          data: error ? null : { deleted: input.resourceId },
          error: extractApiError(error),
        };
      }

      // --- Scripts ---
      case "createScript": {
        const entry = getFormSchema("mutateDataHub", "createScript");
        if (!entry) return { data: null, error: "No schema" };

        const formResult = await requestFormInput({
          schema: entry.schema,
          title: "Create Script",
          formData: input.prefill,
          requiredOnly: entry.requiredOnly,
        });
        if (!formResult.submitted) return { data: null, error: "Cancelled" };

        const { data, error } = await createScript({
          body: formResult.data as never,
        });
        return { data, error: extractApiError(error) };
      }

      case "deleteScript": {
        if (!input.resourceId)
          return { data: null, error: "resourceId required" };

        const approved = await requestApproval({
          title: "Delete Script",
          description: `Permanently delete script "${input.resourceId}"?`,
        });
        if (!approved) return { data: null, error: "Rejected" };

        const { error } = await deleteScript({
          path: { scriptId: input.resourceId },
        });
        return {
          data: error ? null : { deleted: input.resourceId },
          error: extractApiError(error),
        };
      }
    }
  } catch (e) {
    return { data: null, error: String(e) };
  }
});
