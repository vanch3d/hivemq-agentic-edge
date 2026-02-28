import { createFileRoute, Link } from "@tanstack/react-router";
import { Box, Card, Heading, SimpleGrid, Text, Stack } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { LuBookOpen, LuInfo, LuSettings, LuWrench } from "react-icons/lu";

export const Route = createFileRoute(
  "/_authenticated/workspace/configuration/",
)({
  component: ConfigurationIndex,
});

function ConfigurationIndex() {
  const { t } = useTranslation();

  return (
    <Box>
      <Stack gap="1" mb="6">
        <Heading size="xl">{t("configuration.title")}</Heading>
        <Text color="fg.muted">{t("configuration.subtitle")}</Text>
      </Stack>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="4">
        <Card.Root asChild>
          <Link to="/workspace/configuration/ontology">
            <Card.Body>
              <Stack gap="2">
                <Box color="fg.muted">
                  <LuBookOpen size={24} />
                </Box>
                <Heading size="md">{t("configuration.ontology.title")}</Heading>
                <Text color="fg.muted" fontSize="sm">
                  {t("configuration.ontology.description")}
                </Text>
              </Stack>
            </Card.Body>
          </Link>
        </Card.Root>

        <Card.Root asChild>
          <Link to="/workspace/configuration/settings">
            <Card.Body>
              <Stack gap="2">
                <Box color="fg.muted">
                  <LuSettings size={24} />
                </Box>
                <Heading size="md">{t("settings.title")}</Heading>
                <Text color="fg.muted" fontSize="sm">
                  {t("settings.description")}
                </Text>
              </Stack>
            </Card.Body>
          </Link>
        </Card.Root>
        <Card.Root asChild>
          <Link to="/workspace/configuration/tools">
            <Card.Body>
              <Stack gap="2">
                <Box color="fg.muted">
                  <LuWrench size={24} />
                </Box>
                <Heading size="md">{t("configuration.tools.title")}</Heading>
                <Text color="fg.muted" fontSize="sm">
                  {t("configuration.tools.description")}
                </Text>
              </Stack>
            </Card.Body>
          </Link>
        </Card.Root>
        <Card.Root asChild>
          <Link to="/workspace/configuration/about">
            <Card.Body>
              <Stack gap="2">
                <Box color="fg.muted">
                  <LuInfo size={24} />
                </Box>
                <Heading size="md">{t("configuration.about.title")}</Heading>
                <Text color="fg.muted" fontSize="sm">
                  {t("configuration.about.description")}
                </Text>
              </Stack>
            </Card.Body>
          </Link>
        </Card.Root>
      </SimpleGrid>
    </Box>
  );
}
