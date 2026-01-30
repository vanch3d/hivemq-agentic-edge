import type { CreateClientConfig } from "./api/client.gen";
import { getAuthToken } from "./auth-token";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseURL: API_BASE_URL,
});

/**
 * Register an Axios request interceptor on the generated client instance.
 * Attaches the JWT Bearer token to every outgoing request when available.
 *
 * Call once at app startup, after the client has been created.
 */
export function setupAuthInterceptor(
  instance: import("axios").AxiosInstance,
): void {
  instance.interceptors.request.use((config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
}
