import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { ColorModeButton } from "@/components/ui/color-mode";
import { getNotificationsOptions } from "@/api/@tanstack/react-query.gen";

export const Route = createFileRoute("/login")({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: "/workspace" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const notifications = useQuery(getNotificationsOptions());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password);
      navigate({ to: "/workspace" });
    } catch {
      setError("Invalid username or password");
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
              Sign in
            </Heading>
            <Text textAlign="center" color="fg.muted" fontSize="sm">
              Enter your credentials to continue
            </Text>
          </Card.Header>
          <Card.Body>
            <form onSubmit={handleSubmit}>
              <Stack gap="4">
                {error && (
                  <Text color="fg.error" fontSize="sm" textAlign="center">
                    {error}
                  </Text>
                )}
                <Box>
                  <Text fontWeight="medium" fontSize="sm" mb="1">
                    Username
                  </Text>
                  <Input
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </Box>
                <Box>
                  <Text fontWeight="medium" fontSize="sm" mb="1">
                    Password
                  </Text>
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Box>
                <Button
                  type="submit"
                  colorPalette="blue"
                  w="full"
                  loading={loading}
                >
                  Sign in
                </Button>
              </Stack>
            </form>
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
