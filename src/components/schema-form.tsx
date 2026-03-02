import Form from "@rjsf/chakra-ui";
import { customizeValidator } from "@rjsf/validator-ajv8";
import { useTranslation } from "react-i18next";
import type { RJSFSchema, UiSchema, TemplatesType } from "@rjsf/utils";
import type { IChangeEvent, FormProps } from "@rjsf/core";
import type { ReactNode, Ref } from "react";
import type FormCore from "@rjsf/core";
import { createLocalizedUiSchema } from "@/utils/create-localized-ui-schema";
import { resolveSchemaRefs } from "@/utils/resolve-schema-refs";
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
  /** Ref to the underlying RJSF Form for programmatic submit. */
  ref?: Ref<FormCore<TFormData>>;
} & Omit<
  Partial<FormProps<TFormData>>,
  | "schema"
  | "uiSchema"
  | "formData"
  | "onSubmit"
  | "onChange"
  | "validator"
  | "children"
  | "ref"
>;

export function SchemaForm<TFormData = unknown>({
  schema,
  uiSchema,
  formData,
  onSubmit,
  onChange,
  children,
  i18nPrefix,
  ref,
  ...rest
}: SchemaFormProps<TFormData>) {
  const { t } = useTranslation();

  // Resolve OpenAPI $ref pointers so RJSF can render nested schemas
  const resolvedSchema = resolveSchemaRefs(schema);

  let resolvedUiSchema: UiSchema = uiSchema ?? {};

  if (i18nPrefix) {
    resolvedUiSchema = createLocalizedUiSchema(
      t,
      i18nPrefix,
      resolvedSchema,
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
      ref={ref}
      schema={resolvedSchema}
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
