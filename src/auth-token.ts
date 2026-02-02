/**
 * Module-level token store shared between the auth context (React) and the
 * Axios request interceptor (non-React). This avoids coupling the HTTP client
 * to React context while keeping a single source of truth for the JWT.
 *
 * Also persists to sessionStorage so the token survives HMR re-mounts and
 * full page reloads within the same tab.
 */

const STORAGE_KEY = "auth_token";

let token: string | null = sessionStorage.getItem(STORAGE_KEY);

export function getAuthToken(): string | null {
  return token;
}

export function setAuthToken(value: string | null): void {
  token = value;
  if (value) {
    sessionStorage.setItem(STORAGE_KEY, value);
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}
