import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: ".docs/openapi-bundle.yaml",
  output: "src/api",
  plugins: [
    "@hey-api/typescript",
    { name: "@hey-api/schemas", type: "json" },
    "@hey-api/sdk",
    {
      name: "@hey-api/client-axios",
      runtimeConfigPath: "../api-config.ts",
    },
    "@tanstack/react-query",
  ],
});
