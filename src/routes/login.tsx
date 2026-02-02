import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { useAuth } from "@/context/auth-context";
import { ColorModeButton } from "@/components/ui/color-mode";
import { SchemaForm } from "@/components/schema-form";
import { getNotificationsOptions } from "@/api/@tanstack/react-query.gen";
import { UsernamePasswordCredentialsSchema } from "@/api/schemas.gen";
import type { UsernamePasswordCredentials } from "@/api/types.gen";

export const Route = createFileRoute("/login")({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: "/workspace" });
    }
  },
  component: LoginPage,
});

const loginSchema: RJSFSchema = {
  ...UsernamePasswordCredentialsSchema,
  title: "SSSSSSSS",
  description: "SZZZZZZZZZZ",
  required: ["userName", "password"],
};

const loginUiSchema: UiSchema = {
  userName: {
    "ui:autofocus": true,
  },
  password: {
    "ui:widget": "password",
  },
  "ui:order": ["userName", "password"],
};

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const notifications = useQuery(getNotificationsOptions());

  const handleSubmit = async (formData: UsernamePasswordCredentials) => {
    setError(null);
    setLoading(true);

    try {
      await login(formData.userName ?? "", formData.password ?? "");
      navigate({ to: "/workspace" });
    } catch {
      setError(t("login.errors.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex minH="100vh" align="center" justify="center" p="4">
      <Box position="absolute" top="4" right="4">
        <ColorModeButton />
      </Box>
      <Stack w="full" maxW="sm" gap="4">
        <Card.Root>
          <Card.Header>
            <Heading size="lg" textAlign="center">
              {t("login.title")}
            </Heading>
            <Text textAlign="center" color="fg.muted" fontSize="sm">
              {t("login.subtitle")}
            </Text>
          </Card.Header>
          <Card.Body>
            {error && (
              <Text color="fg.error" fontSize="sm" textAlign="center" mb="4">
                {error}
              </Text>
            )}
            <SchemaForm<UsernamePasswordCredentials>
              schema={loginSchema}
              uiSchema={loginUiSchema}
              i18nPrefix="usernamePasswordCredentials"
              onSubmit={handleSubmit}
            >
              <Button
                type="submit"
                colorPalette="blue"
                w="full"
                mt="4"
                loading={loading}
              >
                {t("login.submit")}
              </Button>
            </SchemaForm>
          </Card.Body>
        </Card.Root>

        {notifications.data?.items && notifications.data.items.length > 0 && (
          <Card.Root>
            <Card.Body>
              <Stack gap="2">
                {notifications.data.items.map((n, i) => (
                  <Box key={i}>
                    <Text fontSize="sm" fontWeight="medium">
                      <Badge
                        size="sm"
                        colorPalette={
                          n.level === "ERROR"
                            ? "red"
                            : n.level === "WARNING"
                              ? "orange"
                              : "blue"
                        }
                      >
                        {n.level}
                      </Badge>{" "}
                      {n.title}
                    </Text>
                    {n.description && (
                      <Text fontSize="xs" color="fg.muted">
                        {n.description}
                      </Text>
                    )}
                  </Box>
                ))}
              </Stack>
            </Card.Body>
          </Card.Root>
        )}
      </Stack>
    </Flex>
  );
}
