import Form from "@rjsf/chakra-ui";
import { customizeValidator } from "@rjsf/validator-ajv8";
import { useTranslation } from "react-i18next";
import type { RJSFSchema, UiSchema, TemplatesType } from "@rjsf/utils";
import type { IChangeEvent, FormProps } from "@rjsf/core";
import type { ReactNode } from "react";
import { createLocalizedUiSchema } from "@/utils/create-localized-ui-schema";
import { FieldTemplate } from "@/components/rjsf-templates/field-template";

const validator = customizeValidator();

const templates: Partial<TemplatesType> = {
  FieldTemplate,
};

type SchemaFormProps<TFormData = unknown> = {
  schema: RJSFSchema;
  uiSchema?: UiSchema;
  formData?: TFormData;
  onSubmit: (data: TFormData) => void;
  onChange?: (data: TFormData) => void;
  children?: ReactNode;
  /** When set, auto-resolves ui:title/description/placeholder from i18n keys
   *  using the convention: schemas.<i18nPrefix>.fields.<field>.title etc. */
  i18nPrefix?: string;
} & Omit<
  Partial<FormProps<TFormData>>,
  | "schema"
  | "uiSchema"
  | "formData"
  | "onSubmit"
  | "onChange"
  | "validator"
  | "children"
>;

export function SchemaForm<TFormData = unknown>({
  schema,
  uiSchema,
  formData,
  onSubmit,
  onChange,
  children,
  i18nPrefix,
  ...rest
}: SchemaFormProps<TFormData>) {
  const { t } = useTranslation();

  let resolvedUiSchema: UiSchema = uiSchema ?? {};

  if (i18nPrefix) {
    resolvedUiSchema = createLocalizedUiSchema(
      t,
      i18nPrefix,
      schema,
      resolvedUiSchema,
    );
  }

  if (children) {
    resolvedUiSchema = {
      ...resolvedUiSchema,
      "ui:submitButtonOptions": { norender: true },
    };
  }

  const handleSubmit = (event: IChangeEvent<TFormData>) => {
    if (event.formData !== undefined) {
      onSubmit(event.formData);
    }
  };

  const handleChange = onChange
    ? (event: IChangeEvent<TFormData>) => {
        if (event.formData !== undefined) {
          onChange(event.formData);
        }
      }
    : undefined;

  return (
    <Form
      schema={schema}
      uiSchema={resolvedUiSchema}
      formData={formData}
      onSubmit={handleSubmit}
      onChange={handleChange}
      validator={validator}
      templates={templates}
      {...rest}
    >
      {children}
    </Form>
  );
}
