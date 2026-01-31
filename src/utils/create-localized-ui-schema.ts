import type { TFunction } from "i18next";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";

/**
 * Auto-generates a uiSchema with `ui:title`, `ui:description`, and
 * `ui:placeholder` resolved from i18n keys following the convention:
 *
 *   schemas.<schemaName>.fields.<fieldName>.title
 *   schemas.<schemaName>.fields.<fieldName>.description
 *   schemas.<schemaName>.fields.<fieldName>.placeholder
 *
 * Only keys that exist in the translation file are included.
 * The result is deep-merged with `overrides` so callers can add
 * non-translatable directives like `"ui:widget"` or `"ui:order"`.
 */
export function createLocalizedUiSchema(
  t: TFunction,
  schemaName: string,
  schema: RJSFSchema,
  overrides?: UiSchema,
): UiSchema {
  const uiSchema: UiSchema = {};
  const properties = schema.properties ?? {};

  for (const field of Object.keys(properties)) {
    const fieldUi: Record<string, string> = {};
    const prefix = `schemas.${schemaName}.fields.${field}`;

    const title = t(`${prefix}.title`, { defaultValue: "" });
    if (title) fieldUi["ui:title"] = title;

    const description = t(`${prefix}.description`, { defaultValue: "" });
    if (description) fieldUi["ui:description"] = description;

    const placeholder = t(`${prefix}.placeholder`, { defaultValue: "" });
    if (placeholder) fieldUi["ui:placeholder"] = placeholder;

    if (Object.keys(fieldUi).length > 0) {
      uiSchema[field] = fieldUi;
    }
  }

  if (!overrides) return uiSchema;

  // Deep-merge: overrides take precedence per field, but i18n keys
  // fill in any gaps. Top-level uiSchema keys (like "ui:order") pass through.
  const merged: UiSchema = { ...uiSchema };
  for (const [key, value] of Object.entries(overrides)) {
    if (
      key in merged &&
      typeof merged[key] === "object" &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      merged[key] = { ...(merged[key] as Record<string, unknown>), ...value };
    } else {
      merged[key] = value;
    }
  }
  return merged;
}
