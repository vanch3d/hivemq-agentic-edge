import { mutateAdapterDef } from "@/agent/tool-definitions";
import {
  addAdapter,
  updateAdapter,
  deleteAdapter,
  transitionAdapterStatus,
} from "@/api/sdk.gen";
import { requestFormInput, requestApproval } from "@/agent/tool-context";
import { getFormSchema } from "@/agent/form-schemas";

type ApiError = { title?: string };

export const mutateAdapter = mutateAdapterDef.client(async (input) => {
  try {
    switch (input.operation) {
      case "create": {
        if (!input.adapterType)
          return {
            data: null,
            error: "adapterType is required for 'create'",
          };

        const entry = getFormSchema("mutateAdapter", "create");
        if (!entry) return { data: null, error: "No schema for create" };

        const formResult = await requestFormInput({
          schema: entry.schema,
          title: `Create ${input.adapterType} Adapter`,
          formData: { type: input.adapterType, ...input.prefill },
          requiredOnly: entry.requiredOnly,
        });
        if (!formResult.submitted) return { data: null, error: "Cancelled" };

        const { data, error } = await addAdapter({
          path: { adapterType: input.adapterType },
          body: formResult.data as never,
        });
        return { data, error: (error as ApiError | undefined)?.title };
      }

      case "update": {
        if (!input.adapterId)
          return { data: null, error: "adapterId is required for 'update'" };

        const entry = getFormSchema("mutateAdapter", "update");
        if (!entry) return { data: null, error: "No schema for update" };

        const formResult = await requestFormInput({
          schema: entry.schema,
          title: `Update Adapter: ${input.adapterId}`,
          formData: { id: input.adapterId, ...input.prefill },
        });
        if (!formResult.submitted) return { data: null, error: "Cancelled" };

        const { data, error } = await updateAdapter({
          path: { adapterId: input.adapterId },
          body: formResult.data as never,
        });
        return { data, error: (error as ApiError | undefined)?.title };
      }

      case "delete": {
        if (!input.adapterId)
          return { data: null, error: "adapterId is required for 'delete'" };

        const approved = await requestApproval({
          title: "Delete Adapter",
          description: `Permanently delete adapter "${input.adapterId}"?`,
        });
        if (!approved) return { data: null, error: "Rejected" };

        const { error } = await deleteAdapter({
          path: { adapterId: input.adapterId },
        });
        return {
          data: error ? null : { deleted: input.adapterId },
          error: (error as ApiError | undefined)?.title,
        };
      }

      case "transitionStatus": {
        if (!input.adapterId)
          return {
            data: null,
            error: "adapterId is required for 'transitionStatus'",
          };

        const entry = getFormSchema("mutateAdapter", "transitionStatus");
        if (!entry)
          return { data: null, error: "No schema for transitionStatus" };

        const formResult = await requestFormInput({
          schema: entry.schema,
          title: `Adapter Status: ${input.adapterId}`,
          formData: input.prefill,
        });
        if (!formResult.submitted) return { data: null, error: "Cancelled" };

        const { data, error } = await transitionAdapterStatus({
          path: { adapterId: input.adapterId },
          body: formResult.data as never,
        });
        return { data, error: (error as ApiError | undefined)?.title };
      }
    }
  } catch (e) {
    return { data: null, error: String(e) };
  }
});
