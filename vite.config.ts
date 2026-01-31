import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import devServer from "@hono/vite-dev-server";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tsconfigPaths(),
    devServer({
      entry: "server/index.ts",
      exclude: [
        // Let Vite handle everything except /api/*
        /^(?!\/api\/).*/,
      ],
    }),
  ],
});
