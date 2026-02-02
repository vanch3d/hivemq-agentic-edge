import { Box, Button, Flex, Heading, Text } from "@chakra-ui/react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { RJSFSchema } from "@rjsf/utils";
import { SchemaForm } from "@/components/schema-form";

interface ChatFormProps {
  schema: RJSFSchema;
  title: string;
  formData?: unknown;
  requiredOnly?: boolean;
  onSubmit: (data: unknown) => void;
  onCancel: () => void;
}

export function ChatForm({
  schema,
  title,
  formData,
  requiredOnly,
  onSubmit,
  onCancel,
}: ChatFormProps) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(!requiredOnly);

  // When requiredOnly, filter schema to only required properties.
  // Memoized to keep a stable reference for RJSF's internal diffing.
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
    <Box
      borderWidth="1px"
      borderRadius="md"
      p="2"
      bg="bg.subtle"
      w="full"
      fontSize="sm"
    >
      <Heading size="xs" mb="2">
        {title}
      </Heading>
      <SchemaForm
        key={showAll ? "full" : "required"}
        schema={displaySchema}
        formData={formData}
        onSubmit={onSubmit}
      >
        <Flex gap="2" mt="2" alignItems="center">
          <Button type="submit" size="xs" colorPalette="blue">
            {t("chat.formSubmit")}
          </Button>
          <Button size="xs" variant="ghost" onClick={onCancel}>
            {t("chat.formCancel")}
          </Button>
          {requiredOnly && !showAll && (
            <Text
              as="button"
              fontSize="xs"
              color="fg.muted"
              cursor="pointer"
              onClick={() => setShowAll(true)}
              ml="auto"
            >
              {t("chat.formShowAll")}
            </Text>
          )}
        </Flex>
      </SchemaForm>
    </Box>
  );
}
