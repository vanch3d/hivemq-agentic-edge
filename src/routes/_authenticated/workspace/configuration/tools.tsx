import { createFileRoute } from "@tanstack/react-router";
import {
  Badge,
  Box,
  Card,
  Code,
  Heading,
  HStack,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
} from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { allToolDefinitions } from "@/agent/tool-definitions";
import type { ZodObject, ZodTypeAny } from "zod";

export const Route = createFileRoute(
  "/_authenticated/workspace/configuration/tools",
)({
  component: ToolsPage,
});

// ---------------------------------------------------------------------------
// Helpers to introspect Zod schemas at runtime
// ---------------------------------------------------------------------------

interface ParamInfo {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  values?: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDef = Record<string, any>;

function getDef(field: ZodTypeAny): AnyDef {
  return field._def as unknown as AnyDef;
}

function zodTypeName(field: ZodTypeAny): string {
  const def = getDef(field);
  const typeName = def.typeName as string | undefined;

  // Unwrap ZodOptional / ZodDefault
  if (typeName === "ZodOptional" || typeName === "ZodDefault") {
    return zodTypeName(def.innerType as ZodTypeAny);
  }
  if (typeName === "ZodEnum") return "enum";
  if (typeName === "ZodLiteral") return `"${String(def.value)}"`;
  if (typeName === "ZodRecord") return "object";
  if (typeName === "ZodString") return "string";
  if (typeName === "ZodNumber") return "number";
  if (typeName === "ZodBoolean") return "boolean";
  if (typeName === "ZodArray") return "array";
  return typeName?.replace("Zod", "").toLowerCase() ?? "unknown";
}

function enumValues(field: ZodTypeAny): string[] | undefined {
  const def = getDef(field);
  const typeName = def.typeName as string | undefined;
  if (typeName === "ZodOptional" || typeName === "ZodDefault") {
    return enumValues(def.innerType as ZodTypeAny);
  }
  if (typeName === "ZodEnum") return def.values as string[];
  return undefined;
}

function extractParams(schema: ZodTypeAny): ParamInfo[] {
  const shape = (schema as ZodObject<never>).shape as
    | Record<string, ZodTypeAny>
    | undefined;
  if (!shape) return [];

  return Object.entries(shape).map(([name, field]) => ({
    name,
    type: zodTypeName(field),
    required: !field.isOptional(),
    description: getDef(field).description as string | undefined,
    values: enumValues(field),
  }));
}

// ---------------------------------------------------------------------------
// Tool metadata derivation
// ---------------------------------------------------------------------------

type ToolCategory = "query" | "mutation" | "navigation";

interface ToolMeta {
  name: string;
  description: string;
  category: ToolCategory;
  params: ParamInfo[];
  outputParams: ParamInfo[];
}

function categorize(name: string): ToolCategory {
  if (name.startsWith("mutate")) return "mutation";
  if (name === "navigateTo") return "navigation";
  return "query";
}

const CATEGORY_ORDER: ToolCategory[] = ["query", "mutation", "navigation"];
const CATEGORY_COLORS: Record<ToolCategory, string> = {
  query: "blue",
  mutation: "orange",
  navigation: "purple",
};

function buildToolMetas(): ToolMeta[] {
  return allToolDefinitions.map((def) => ({
    name: def.name,
    description: def.description,
    category: categorize(def.name),
    params: def.inputSchema ? extractParams(def.inputSchema) : [],
    outputParams: def.outputSchema ? extractParams(def.outputSchema) : [],
  }));
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function ParamList({
  params,
  optionalLabel,
}: {
  params: ParamInfo[];
  optionalLabel: string;
}) {
  return (
    <Stack gap="2">
      {params.map((p) => (
        <HStack key={p.name} gap="2" align="start" flexWrap="wrap">
          <Code size="sm" fontWeight="bold">
            {p.name}
          </Code>
          <Badge size="sm" variant="subtle">
            {p.type}
          </Badge>
          {!p.required && (
            <Badge size="sm" variant="outline" colorPalette="gray">
              {optionalLabel}
            </Badge>
          )}
          {p.description && (
            <Text fontSize="xs" color="fg.muted">
              {p.description}
            </Text>
          )}
          {p.values && (
            <HStack gap="1" flexWrap="wrap">
              {p.values.map((v) => (
                <Badge key={v} size="sm" variant="outline">
                  {v}
                </Badge>
              ))}
            </HStack>
          )}
        </HStack>
      ))}
    </Stack>
  );
}

function ToolCard({
  tool,
  labels,
}: {
  tool: ToolMeta;
  labels: { operations: string; parameters: string; optional: string };
}) {
  const operations = tool.params.find(
    (p) => p.name === "operation" && p.values,
  );
  const otherParams = tool.params.filter((p) => p.name !== "operation");

  return (
    <Card.Root size="sm">
      <Card.Header>
        <HStack justify="space-between">
          <Heading size="sm">
            <Code>{tool.name}</Code>
          </Heading>
          <Badge colorPalette={CATEGORY_COLORS[tool.category]} size="sm">
            {tool.category}
          </Badge>
        </HStack>
      </Card.Header>
      <Card.Body>
        <Stack gap="4">
          <Text fontSize="sm" color="fg.muted">
            {tool.description}
          </Text>

          {operations && (
            <Box>
              <Text fontSize="xs" fontWeight="semibold" mb="1">
                {labels.operations}
              </Text>
              <HStack gap="1" flexWrap="wrap">
                {operations.values?.map((v) => (
                  <Badge key={v} size="sm" variant="outline">
                    {v}
                  </Badge>
                ))}
              </HStack>
            </Box>
          )}

          {otherParams.length > 0 && (
            <Box>
              <Text fontSize="xs" fontWeight="semibold" mb="1">
                {labels.parameters}
              </Text>
              <ParamList params={otherParams} optionalLabel={labels.optional} />
            </Box>
          )}
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}

function ToolsPage() {
  const { t } = useTranslation();
  const tools = buildToolMetas();

  const labels = {
    operations: t("configuration.tools.operations"),
    parameters: t("configuration.tools.parameters"),
    optional: t("configuration.tools.optional"),
  };

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    tools: tools.filter((tool) => tool.category === cat),
  })).filter((g) => g.tools.length > 0);

  return (
    <Box>
      <Stack gap="1" mb="6">
        <Heading size="xl">{t("configuration.tools.title")}</Heading>
        <Text color="fg.muted">{t("configuration.tools.pageDescription")}</Text>
        <HStack gap="3" mt="2">
          <Text fontSize="sm" color="fg.muted">
            {t("configuration.tools.totalCount", { count: tools.length })}
          </Text>
        </HStack>
      </Stack>

      <Tabs.Root defaultValue={grouped[0]?.category} variant="line">
        <Tabs.List>
          {grouped.map((g) => (
            <Tabs.Trigger key={g.category} value={g.category}>
              <HStack gap="2">
                <Text>{g.category}</Text>
                <Badge size="sm" variant="subtle">
                  {g.tools.length}
                </Badge>
              </HStack>
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {grouped.map((g) => (
          <Tabs.Content key={g.category} value={g.category}>
            <SimpleGrid columns={{ base: 1, lg: 2 }} gap="4" mt="4">
              {g.tools.map((tool) => (
                <ToolCard key={tool.name} tool={tool} labels={labels} />
              ))}
            </SimpleGrid>
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </Box>
  );
}
