/**
 * Extract a human-readable error message from the SDK error object.
 *
 * The generated Axios client returns the AxiosError itself as `error`.
 * The response body (ProblemDetails) is patched onto `error.error`,
 * and the raw response is at `error.response?.data`.
 *
 * This helper checks all known locations so tool handlers get a useful
 * string instead of `undefined`.
 */
export function extractApiError(error: unknown): string | undefined {
  if (!error) return undefined;

  // Quick check: already a string (e.g. from catch block)
  if (typeof error === "string") return error;

  const err = error as Record<string, unknown>;

  // 1. Patched ProblemDetails on AxiosError (.error.title / .error.detail)
  const inner = err.error as Record<string, unknown> | undefined;
  if (inner) {
    const title = inner.title ?? inner.detail;
    if (typeof title === "string" && title) return title;
  }

  // 2. Axios response data (.response.data.title / .response.data.detail)
  const response = err.response as Record<string, unknown> | undefined;
  if (response) {
    const data = response.data as Record<string, unknown> | undefined;
    if (data) {
      const title = data.title ?? data.detail;
      if (typeof title === "string" && title) return title;
    }
    // Status text fallback (e.g. "Unauthorized")
    if (typeof response.statusText === "string" && response.statusText) {
      return `${response.status} ${response.statusText}`;
    }
  }

  // 3. Generic Error.message
  if (typeof err.message === "string" && err.message) return err.message;

  return String(error);
}
