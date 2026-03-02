import { Box, Heading } from "@chakra-ui/react";
import { useMemo } from "react";
import type { RefObject } from "react";
import type { RJSFSchema } from "@rjsf/utils";
import type FormCore from "@rjsf/core";
import { SchemaForm } from "@/components/schema-form";

interface ChatFormFieldsProps {
  schema: RJSFSchema;
  title: string;
  formData?: unknown;
  showAll: boolean;
  formRef: RefObject<FormCore | null>;
  onSubmit: (data: unknown) => void;
}

export function ChatFormFields({
  schema,
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

  return (
    <Box p="3" fontSize="sm" flex="1" minH="0" overflow="auto">
      <Heading size="xs" mb="2">
        {title}
      </Heading>
      <SchemaForm
        key={showAll ? "full" : "required"}
        ref={formRef}
        schema={displaySchema}
        formData={formData}
        onSubmit={onSubmit}
      >
        {/* Empty children suppress the default RJSF submit button */}
        <></>
      </SchemaForm>
    </Box>
  );
}
