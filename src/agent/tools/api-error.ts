/**
 * Format a ProblemDetails object into a human-readable string.
 *
 * ProblemDetails shape (from OpenAPI):
 *   { title: string, type: string, detail?: string, status?: number,
 *     code?: string, errors?: Array<{ detail: string, parameter?: string }> }
 *
 * Produces e.g.:
 *   "Adapter failed validation: Invalid user supplied data (parameter: $.required)"
 *   "Adapter type not found: Adapter of type not found: opc-ua"
 */
function formatProblemDetails(pd: Record<string, unknown>): string {
  const parts: string[] = [];

  // Title is always the lead
  if (typeof pd.title === "string" && pd.title) {
    parts.push(pd.title);
  }

  // Top-level detail adds context if different from title
  if (
    typeof pd.detail === "string" &&
    pd.detail &&
    pd.detail !== pd.title
  ) {
    parts.push(pd.detail);
  }

  // errors[] array carries field-level detail the LLM needs for self-correction
  const errors = pd.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    for (const e of errors) {
      if (e && typeof e === "object") {
        const entry = e as Record<string, unknown>;
        const detail = entry.detail;
        if (typeof detail === "string" && detail) {
          const param = entry.parameter;
          if (typeof param === "string" && param) {
            parts.push(`${detail} (parameter: ${param})`);
          } else {
            parts.push(detail);
          }
        }
      }
    }
  }

  return parts.join(": ");
}

/**
 * Try to interpret an object as ProblemDetails and format it.
 * Returns undefined if the object doesn't look like ProblemDetails.
 */
function tryFormatProblemDetails(
  obj: Record<string, unknown>,
): string | undefined {
  // ProblemDetails requires `title` and `type` per the OpenAPI spec
  if (typeof obj.title === "string" && obj.title) {
    return formatProblemDetails(obj);
  }
  return undefined;
}

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
    const formatted = tryFormatProblemDetails(inner);
    if (formatted) return formatted;
  }

  // 2. Axios response data (.response.data)
  const response = err.response as Record<string, unknown> | undefined;
  if (response) {
    const data = response.data as Record<string, unknown> | undefined;
    if (data) {
      const formatted = tryFormatProblemDetails(data);
      if (formatted) return formatted;
    }
    // Status text fallback (e.g. "Unauthorized")
    if (typeof response.statusText === "string" && response.statusText) {
      return `${response.status} ${response.statusText}`;
    }
  }

  // 3. Generic Error.message
  if (typeof err.message === "string" && err.message) return err.message;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
