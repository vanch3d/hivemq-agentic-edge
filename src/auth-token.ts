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

/**
 * Decode the payload of a JWT without a library.
 * Returns the parsed claims object, or null if the token is malformed.
 */
function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    // base64url → base64 → decode
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

/**
 * Extract the `exp` (expiration) claim from a JWT.
 * Returns the expiration as a Unix timestamp in **milliseconds**, or null
 * if the token is malformed or has no exp claim.
 */
export function getTokenExpiration(jwt: string): number | null {
  const claims = decodeJwtPayload(jwt);
  if (claims && typeof claims.exp === "number") {
    return claims.exp * 1000; // seconds → ms
  }
  return null;
}

/**
 * Extract the username from a JWT.
 * Checks `sub`, then `preferred_username`, then `name`.
 */
export function getTokenUsername(jwt: string): string | null {
  const claims = decodeJwtPayload(jwt);
  if (!claims) return null;
  for (const key of ["sub", "preferred_username", "name"]) {
    if (typeof claims[key] === "string" && claims[key]) {
      return claims[key] as string;
    }
  }
  return null;
}
