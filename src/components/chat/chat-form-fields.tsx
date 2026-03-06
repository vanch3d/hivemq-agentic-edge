import { Box, Heading } from "@chakra-ui/react";
import { useCallback, useMemo } from "react";
import type { RefObject } from "react";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import type FormCore from "@rjsf/core";
import { SchemaForm } from "@/components/schema-form";

interface ChatFormFieldsProps {
  schema: RJSFSchema;
  uiSchema?: UiSchema;
  title: string;
  formData?: unknown;
  showAll: boolean;
  formRef: RefObject<FormCore | null>;
  onSubmit: (data: unknown) => void;
}

export function ChatFormFields({
  schema,
  uiSchema,
  title,
  formData,
  showAll,
  formRef,
  onSubmit,
}: ChatFormFieldsProps) {
  const displaySchema = useMemo<RJSFSchema>(() => {
    if (!showAll && schema.required && schema.properties) {
      return {
        ...schema,
        properties: Object.fromEntries(
          Object.entries(schema.properties as Record<string, unknown>).filter(
            ([key]) => (schema.required as string[]).includes(key),
          ),
        ),
      } as unknown as RJSFSchema;
    }
    return schema;
  }, [schema, showAll]);

  // When showing required-only fields, RJSF strips non-displayed fields from
  // the submission. Merge initial formData back so prefilled values (e.g. config)
  // are preserved in the API payload.
  const handleSubmit = useCallback(
    (data: unknown) => {
      if (!showAll && formData && typeof formData === "object") {
        onSubmit({ ...formData, ...(data as object) });
      } else {
        onSubmit(data);
      }
    },
    [showAll, formData, onSubmit],
  );

  return (
    <Box p="3" fontSize="sm" flex="1" minH="0" overflow="auto">
      <Heading size="xs" mb="2">
        {title}
      </Heading>
      <SchemaForm
        key={showAll ? "full" : "required"}
        ref={formRef}
        schema={displaySchema}
        uiSchema={uiSchema}
        formData={formData}
        onSubmit={handleSubmit}
      >
        {/* Empty children suppress the default RJSF submit button */}
        <></>
      </SchemaForm>
    </Box>
  );
}
