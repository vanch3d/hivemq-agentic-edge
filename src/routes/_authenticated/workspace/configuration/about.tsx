import { createFileRoute } from "@tanstack/react-router";
import { Box, Heading, Spinner, Stack, Text } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { useAbout } from "@/hooks/use-about";
import { MarkdownViewer } from "@/components/configuration/markdown-viewer";

export const Route = createFileRoute(
  "/_authenticated/workspace/configuration/about",
)({
  component: AboutPage,
});

function AboutPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error } = useAbout();

  if (isLoading) return <Spinner size="sm" />;
  if (isError)
    return (
      <Text color="fg.error">
        {t("configuration.about.errors.failedToLoad", {
          message: error.message,
        })}
      </Text>
    );

  return (
    <Box>
      <Stack gap="1" mb="6">
        <Heading size="xl">{t("configuration.about.title")}</Heading>
        <Text color="fg.muted">{t("configuration.about.pageDescription")}</Text>
      </Stack>

      <MarkdownViewer content={data?.content ?? ""} />
    </Box>
  );
}
