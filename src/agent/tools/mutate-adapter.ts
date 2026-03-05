import type { RJSFSchema } from "@rjsf/utils";
import { mutateAdapterDef } from "@/agent/tool-definitions";
import {
  addAdapter,
  updateAdapter,
  deleteAdapter,
  transitionAdapterStatus,
} from "@/api/sdk.gen";
import {
  requestFormInput,
  requestApproval,
  invalidateQueries,
  getAdapterTypeById,
} from "@/agent/tool-context";
import { getFormSchema } from "@/agent/form-schemas";
import { extractApiError } from "./api-error";

/**
 * Strip the `$schema` property from a JSON Schema.
 * Adapter type configSchemas use draft/2020-12 but RJSF expects draft-07.
 * The `$schema` keyword causes a validation error in AJV.
 */
function stripDollarSchema(schema: Record<string, unknown>): RJSFSchema {
  const { $schema: _, ...rest } = schema;
  return rest as RJSFSchema;
}

/**
 * Resolve the configSchema and uiSchema for an adapter type from the cache.
 * Returns null if the type is not found or has no configSchema.
 *
 * `mode` controls how the uiSchema is adjusted:
 * - "create": ensures the `id` field is enabled (user must provide it)
 * - "update": ensures the `id` field is disabled (cannot change it)
 */
async function resolveAdapterTypeSchema(
  typeId: string,
  mode: "create" | "update",
) {
  const adapterType = await getAdapterTypeById(typeId);
  if (!adapterType?.configSchema) return null;

  const schema = stripDollarSchema(
    adapterType.configSchema as Record<string, unknown>,
  );
  const uiSchema = {
    ...((adapterType.uiSchema as Record<string, unknown>) ?? {}),
    id: { "ui:disabled": mode === "update" },
  };

  return {
    schema,
    uiSchema,
    name: (adapterType.name as string) ?? typeId,
  };
}

/**
 * Split form data into the API payload shape: { id, type, config }.
 * The configSchema includes `id` at the top level alongside config fields.
 * We extract `id` and wrap everything else into `config`.
 */
function buildAdapterPayload(
  formData: Record<string, unknown>,
  adapterType: string,
) {
  const { id, ...config } = formData;
  return { id, type: adapterType, config };
}

export const mutateAdapter = mutateAdapterDef.client(async (input) => {
  try {
    switch (input.operation) {
      case "create": {
        if (!input.adapterType)
          return {
            data: null,
            error: "adapterType is required for 'create'",
          };

        const typeSchema = await resolveAdapterTypeSchema(
          input.adapterType,
          "create",
        );
        if (!typeSchema)
          return {
            data: null,
            error: `Unknown adapter type "${input.adapterType}" or type has no configSchema.`,
          };

        const formResult = await requestFormInput({
          schema: typeSchema.schema,
          uiSchema: typeSchema.uiSchema,
          title: `Create ${typeSchema.name}`,
          formData: input.prefill,
        });
        if (!formResult.submitted) return { data: null, error: "Cancelled" };

        const payload = buildAdapterPayload(
          formResult.data as Record<string, unknown>,
          input.adapterType,
        );

        const { data, error } = await addAdapter({
          path: { adapterType: input.adapterType },
          body: payload as never,
        });
        if (!error) invalidateQueries();
        return {
          summary: error
            ? undefined
            : `Adapter "${payload.id}" created successfully.`,
          data,
          error: extractApiError(error),
        };
      }

      case "update": {
        if (!input.adapterId)
          return { data: null, error: "adapterId is required for 'update'" };

        // For update, we need the adapter type to get the schema.
        // The adapterType should be provided by the LLM or we could look it up.
        const typeId = input.adapterType;
        if (!typeId)
          return {
            data: null,
            error: "adapterType is required for 'update' to resolve the form schema.",
          };

        const typeSchema = await resolveAdapterTypeSchema(typeId, "update");
        if (!typeSchema)
          return {
            data: null,
            error: `Unknown adapter type "${typeId}" or type has no configSchema.`,
          };

        const formResult = await requestFormInput({
          schema: typeSchema.schema,
          uiSchema: typeSchema.uiSchema,
          title: `Update Adapter: ${input.adapterId}`,
          formData: { id: input.adapterId, ...input.prefill },
        });
        if (!formResult.submitted) return { data: null, error: "Cancelled" };

        const payload = buildAdapterPayload(
          formResult.data as Record<string, unknown>,
          typeId,
        );

        const { data, error } = await updateAdapter({
          path: { adapterId: input.adapterId },
          body: payload as never,
        });
        if (!error) invalidateQueries();
        return {
          summary: error
            ? undefined
            : `Adapter "${input.adapterId}" updated successfully.`,
          data,
          error: extractApiError(error),
        };
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
        if (!error) invalidateQueries();
        return {
          summary: error
            ? undefined
            : `Adapter "${input.adapterId}" deleted successfully.`,
          data: error ? null : { deleted: input.adapterId },
          error: extractApiError(error),
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
        if (!error) invalidateQueries();
        const command =
          (formResult.data as Record<string, unknown>)?.command ?? "unknown";
        return {
          summary: error
            ? undefined
            : `Adapter "${input.adapterId}" status transition "${command}" completed successfully.`,
          data,
          error: extractApiError(error),
        };
      }
    }
  } catch (e) {
    return { data: null, error: String(e) };
  }
});
