import { createFileRoute } from "@tanstack/react-router";
import { Box, Heading, Spinner, Stack, Tabs, Text } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { useOntologyList, useOntologyModule } from "@/hooks/use-ontology";
import { MarkdownViewer } from "@/components/configuration/markdown-viewer";

export const Route = createFileRoute(
  "/_authenticated/workspace/configuration/ontology",
)({
  component: OntologyPage,
});

function OntologyPage() {
  const { t } = useTranslation();
  const modules = useOntologyList();

  if (modules.isLoading) return <Spinner size="sm" />;
  if (modules.isError)
    return (
      <Text color="fg.error">
        {t("configuration.ontology.errors.failedToLoad", {
          message: modules.error.message,
        })}
      </Text>
    );

  const items = modules.data ?? [];

  return (
    <Box>
      <Stack gap="1" mb="6">
        <Heading size="xl">{t("configuration.ontology.title")}</Heading>
        <Text color="fg.muted">
          {t("configuration.ontology.pageDescription")}
        </Text>
      </Stack>

      <Tabs.Root defaultValue={items[0]?.id} variant="line">
        <Tabs.List>
          {items.map((m) => (
            <Tabs.Trigger key={m.id} value={m.id}>
              {m.name}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {items.map((m) => (
          <Tabs.Content key={m.id} value={m.id}>
            <OntologyTabContent moduleId={m.id} />
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </Box>
  );
}

function OntologyTabContent({ moduleId }: { moduleId: string }) {
  const { t } = useTranslation();
  const mod = useOntologyModule(moduleId);

  if (mod.isLoading) return <Spinner size="sm" mt="4" />;
  if (mod.isError)
    return (
      <Text color="fg.error" mt="4">
        {t("configuration.ontology.errors.failedToLoad", {
          message: mod.error.message,
        })}
      </Text>
    );

  return (
    <Box mt="4">
      <MarkdownViewer content={mod.data?.content ?? ""} />
    </Box>
  );
}
