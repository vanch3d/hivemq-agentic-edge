/**
 * Module-level token store shared between the auth context (React) and the
 * Axios request interceptor (non-React). This avoids coupling the HTTP client
 * to React context while keeping a single source of truth for the JWT.
 */

let token: string | null = null;

export function getAuthToken(): string | null {
  return token;
}

export function setAuthToken(value: string | null): void {
  token = value;
}
