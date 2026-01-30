import type { CreateClientConfig } from "./client.gen";

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080",
});
