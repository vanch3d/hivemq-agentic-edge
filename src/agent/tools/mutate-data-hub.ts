import { z } from "zod";
import { toolDefinition } from "@tanstack/ai";
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

const mutateDataHubDef = toolDefinition({
  name: "mutateDataHub",
  description:
    "Mutate Data Hub resources. Operations: 'createBehaviorPolicy', 'updateBehaviorPolicy', 'deleteBehaviorPolicy', 'createDataPolicy', 'updateDataPolicy', 'deleteDataPolicy', 'createSchema', 'deleteSchema', 'createScript', 'deleteScript'. All mutations require user confirmation.",
  inputSchema: z.object({
    operation: z.enum([
      "createBehaviorPolicy",
      "updateBehaviorPolicy",
      "deleteBehaviorPolicy",
      "createDataPolicy",
      "updateDataPolicy",
      "deleteDataPolicy",
      "createSchema",
      "deleteSchema",
      "createScript",
      "deleteScript",
    ]),
    resourceId: z.string().optional(),
    prefill: z.record(z.unknown()).optional(),
  }),
  outputSchema: z.object({
    data: z.unknown(),
    error: z.string().optional(),
  }),
});

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

        const body = formResult.data as Record<string, unknown>;
        const approved = await requestApproval({
          title: "Create Behavior Policy",
          description: `Create policy "${body["id"]}"?`,
        });
        if (!approved) return { data: null, error: "Rejected" };

        const { data, error } = await createBehaviorPolicy({ body });
        return { data, error: error?.title };
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

        const body = formResult.data as Record<string, unknown>;
        const approved = await requestApproval({
          title: "Update Behavior Policy",
          description: `Update policy "${input.resourceId}"?`,
        });
        if (!approved) return { data: null, error: "Rejected" };

        const { data, error } = await updateBehaviorPolicy({
          path: { policyId: input.resourceId },
          body,
        });
        return { data, error: error?.title };
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
          error: error?.title,
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

        const body = formResult.data as Record<string, unknown>;
        const approved = await requestApproval({
          title: "Create Data Policy",
          description: `Create policy "${body["id"]}"?`,
        });
        if (!approved) return { data: null, error: "Rejected" };

        const { data, error } = await createDataPolicy({ body });
        return { data, error: error?.title };
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

        const body = formResult.data as Record<string, unknown>;
        const approved = await requestApproval({
          title: "Update Data Policy",
          description: `Update policy "${input.resourceId}"?`,
        });
        if (!approved) return { data: null, error: "Rejected" };

        const { data, error } = await updateDataPolicy({
          path: { policyId: input.resourceId },
          body,
        });
        return { data, error: error?.title };
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
          error: error?.title,
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

        const body = formResult.data as Record<string, unknown>;
        const approved = await requestApproval({
          title: "Create Schema",
          description: `Create schema "${body["id"]}"?`,
        });
        if (!approved) return { data: null, error: "Rejected" };

        const { data, error } = await createSchema({ body });
        return { data, error: error?.title };
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
          error: error?.title,
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

        const body = formResult.data as Record<string, unknown>;
        const approved = await requestApproval({
          title: "Create Script",
          description: `Create script "${body["id"]}"?`,
        });
        if (!approved) return { data: null, error: "Rejected" };

        const { data, error } = await createScript({ body });
        return { data, error: error?.title };
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
          error: error?.title,
        };
      }
    }
  } catch (e) {
    return { data: null, error: String(e) };
  }
});
