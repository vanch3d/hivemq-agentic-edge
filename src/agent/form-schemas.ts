/**
 * Maps mutation tool operations to their JSON schemas from the generated OpenAPI schemas.
 * Used by mutation tools to request inline forms in the chat drawer.
 */
import type { RJSFSchema } from "@rjsf/utils";
import {
  BridgeSchema,
  AdapterSchema,
  StatusTransitionCommandSchema,
  BehaviorPolicySchema,
  DataPolicySchema,
  PolicySchemaSchema,
  ScriptSchema,
} from "@/api/schemas.gen";

export type FormSchemaEntry = {
  schema: RJSFSchema;
  /** Fields to show by default (progressive disclosure — required fields first) */
  requiredOnly?: boolean;
};

/**
 * Registry of form schemas keyed by "toolName.operation".
 * Each entry provides the JSON schema for the inline form.
 */
export const formSchemaRegistry: Record<string, FormSchemaEntry> = {
  // Bridge mutations
  "mutateBridge.create": {
    schema: {
      ...BridgeSchema,
      required: ["id", "host", "port"],
    } as RJSFSchema,
    requiredOnly: true,
  },
  "mutateBridge.update": {
    schema: { ...BridgeSchema } as RJSFSchema,
  },
  "mutateBridge.transitionStatus": {
    schema: {
      ...StatusTransitionCommandSchema,
      required: ["command"],
    } as RJSFSchema,
  },

  // Adapter mutations
  "mutateAdapter.create": {
    schema: {
      ...AdapterSchema,
      required: ["id", "type"],
    } as RJSFSchema,
    requiredOnly: true,
  },
  "mutateAdapter.update": {
    schema: { ...AdapterSchema } as RJSFSchema,
  },
  "mutateAdapter.transitionStatus": {
    schema: {
      ...StatusTransitionCommandSchema,
      required: ["command"],
    } as RJSFSchema,
  },

  // Data Hub mutations
  "mutateDataHub.createBehaviorPolicy": {
    schema: {
      ...BehaviorPolicySchema,
      required: ["id", "matching", "behavior"],
    } as RJSFSchema,
    requiredOnly: true,
  },
  "mutateDataHub.updateBehaviorPolicy": {
    schema: { ...BehaviorPolicySchema } as RJSFSchema,
  },
  "mutateDataHub.createDataPolicy": {
    schema: {
      ...DataPolicySchema,
      required: ["id", "matching"],
    } as RJSFSchema,
    requiredOnly: true,
  },
  "mutateDataHub.updateDataPolicy": {
    schema: { ...DataPolicySchema } as RJSFSchema,
  },
  "mutateDataHub.createSchema": {
    schema: {
      ...PolicySchemaSchema,
      required: ["id", "schemaDefinition", "type"],
    } as RJSFSchema,
    requiredOnly: true,
  },
  "mutateDataHub.createScript": {
    schema: {
      ...ScriptSchema,
      required: ["id", "functionType", "source"],
    } as RJSFSchema,
    requiredOnly: true,
  },
};

/**
 * Look up the form schema for a given tool + operation.
 */
export function getFormSchema(
  toolName: string,
  operation: string,
): FormSchemaEntry | undefined {
  return formSchemaRegistry[`${toolName}.${operation}`];
}
