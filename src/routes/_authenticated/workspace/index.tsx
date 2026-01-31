import { createFileRoute } from "@tanstack/react-router";
import { Heading, Text, Box, Badge, Spinner, Stack } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getEventsOptions } from "@/api/@tanstack/react-query.gen";

export const Route = createFileRoute("/_authenticated/workspace/")({
  component: WorkspaceIndex,
});

function WorkspaceIndex() {
  const { t } = useTranslation();
  const events = useQuery(getEventsOptions());

  return (
    <Box>
      <Heading size="xl" mb="4">
        {t("workspace.title")}
      </Heading>

      <Box>
        <Heading size="md" mb="2">
          {t("workspace.events.title")}
        </Heading>
        {events.isLoading && <Spinner size="sm" />}
        {events.isError && (
          <Text color="fg.error">
            {t("workspace.events.errors.failedToLoad", {
              message: events.error.message,
            })}
          </Text>
        )}
        <Stack gap="2">
          {events.data?.items?.map((e, i) => (
            <Box key={i} p="3" borderWidth="1px" borderRadius="md">
              <Text fontWeight="medium">
                <Badge
                  colorPalette={
                    e.severity === "ERROR" || e.severity === "CRITICAL"
                      ? "red"
                      : e.severity === "WARN"
                        ? "orange"
                        : "green"
                  }
                >
                  {e.severity}
                </Badge>{" "}
                {e.message}
              </Text>
              <Text fontSize="sm" color="fg.muted">
                {e.created}
              </Text>
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
