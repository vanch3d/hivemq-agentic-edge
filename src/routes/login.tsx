import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
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
import { useAuth } from "@/context/auth-context";
import { ColorModeButton } from "@/components/ui/color-mode";

export const Route = createFileRoute("/login")({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: "/workspace" });
    }
  },
  component: LoginPage,
});

import { redirect } from "@tanstack/react-router";

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(username, password);
    navigate({ to: "/workspace" });
  };

  return (
    <Flex minH="100vh" align="center" justify="center" p="4">
      <Box position="absolute" top="4" right="4">
        <ColorModeButton />
      </Box>
      <Card.Root w="full" maxW="sm">
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
              <Button type="submit" colorPalette="blue" w="full">
                Sign in
              </Button>
            </Stack>
          </form>
        </Card.Body>
      </Card.Root>
    </Flex>
  );
}
