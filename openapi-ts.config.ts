import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: ".docs/openapi-bundle.yaml",
  output: "src/api",
  plugins: [
    "@hey-api/typescript",
    "@hey-api/sdk",
    {
      name: "@hey-api/client-axios",
      runtimeConfigPath: "./client-config.ts",
    },
    "@tanstack/react-query",
  ],
});
