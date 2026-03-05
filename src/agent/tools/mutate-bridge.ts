import { mutateBridgeDef } from "@/agent/tool-definitions";
import {
  addBridge,
  updateBridge,
  removeBridge,
  transitionBridgeStatus,
} from "@/api/sdk.gen";
import { requestFormInput, requestApproval } from "@/agent/tool-context";
import { getFormSchema } from "@/agent/form-schemas";
import { extractApiError } from "./api-error";

export const mutateBridge = mutateBridgeDef.client(async (input) => {
  try {
    switch (input.operation) {
      case "create": {
        const entry = getFormSchema("mutateBridge", "create");
        if (!entry) return { data: null, error: "No schema for create" };

        const formResult = await requestFormInput({
          schema: entry.schema,
          title: "Create Bridge",
          formData: input.prefill,
          requiredOnly: entry.requiredOnly,
        });
        if (!formResult.submitted) return { data: null, error: "Cancelled" };

        const { data, error } = await addBridge({
          body: formResult.data as never,
        });
        return { data, error: extractApiError(error) };
      }

      case "update": {
        if (!input.bridgeId)
          return { data: null, error: "bridgeId is required for 'update'" };

        const entry = getFormSchema("mutateBridge", "update");
        if (!entry) return { data: null, error: "No schema for update" };

        const formResult = await requestFormInput({
          schema: entry.schema,
          title: `Update Bridge: ${input.bridgeId}`,
          formData: { id: input.bridgeId, ...input.prefill },
        });
        if (!formResult.submitted) return { data: null, error: "Cancelled" };

        const { data, error } = await updateBridge({
          path: { bridgeId: input.bridgeId },
          body: formResult.data as never,
        });
        return { data, error: extractApiError(error) };
      }

      case "delete": {
        if (!input.bridgeId)
          return { data: null, error: "bridgeId is required for 'delete'" };

        const approved = await requestApproval({
          title: "Delete Bridge",
          description: `Permanently delete bridge "${input.bridgeId}"?`,
        });
        if (!approved) return { data: null, error: "Rejected" };

        const { error } = await removeBridge({
          path: { bridgeId: input.bridgeId },
        });
        return {
          data: error ? null : { deleted: input.bridgeId },
          error: extractApiError(error),
        };
      }

      case "transitionStatus": {
        if (!input.bridgeId)
          return {
            data: null,
            error: "bridgeId is required for 'transitionStatus'",
          };

        const entry = getFormSchema("mutateBridge", "transitionStatus");
        if (!entry)
          return { data: null, error: "No schema for transitionStatus" };

        const formResult = await requestFormInput({
          schema: entry.schema,
          title: `Bridge Status: ${input.bridgeId}`,
          formData: input.prefill,
        });
        if (!formResult.submitted) return { data: null, error: "Cancelled" };

        const { data, error } = await transitionBridgeStatus({
          path: { bridgeId: input.bridgeId },
          body: formResult.data as never,
        });
        return { data, error: extractApiError(error) };
      }
    }
  } catch (e) {
    return { data: null, error: String(e) };
  }
});
