import { queryMetricsDef } from "@/agent/tool-definitions";
import { getSample, getMetrics } from "@/api/sdk.gen";
import { snapshotQueryResult } from "./snapshot-helper";
import { extractApiError } from "./api-error";

const DEFAULT_POLL_INTERVAL = 2000;

export const queryMetrics = queryMetricsDef.client(async (input) => {
  try {
    switch (input.operation) {
      case "getValue": {
        if (!input.metricName)
          return { data: null, error: "metricName is required for 'getValue'" };

        const { data, error } = await getSample({
          path: { metricName: input.metricName },
        });
        const result = { data, error: extractApiError(error) };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "queryMetrics",
            operation: "getValue",
            data: result.data,
            label: `Metric — ${input.metricName}`,
          });
          return { ...result, snapshotId };
        }
        return result;
      }

      case "search": {
        if (!input.pattern)
          return { data: null, error: "pattern is required for 'search'" };

        const { data, error } = await getMetrics();
        const apiError = extractApiError(error);
        if (apiError) return { data: null, error: apiError };

        const pattern = input.pattern.toLowerCase();
        const filtered = (data?.items ?? []).filter((m) =>
          m.name?.toLowerCase().includes(pattern),
        );

        const result = { data: filtered };
        const snapshotId = snapshotQueryResult({
          toolName: "queryMetrics",
          operation: "search",
          data: filtered,
          label: `Metrics — search "${input.pattern}"`,
        });
        return { ...result, snapshotId };
      }

      case "monitor": {
        const metricNames =
          input.metricNames ??
          (input.metricName ? [input.metricName] : undefined);

        if (!metricNames || metricNames.length === 0)
          return {
            data: null,
            error: "metricName or metricNames is required for 'monitor'",
          };

        const pollInterval = input.pollInterval ?? DEFAULT_POLL_INTERVAL;

        // Fetch initial values for all metrics
        const initialResults = await Promise.all(
          metricNames.map((name) => getSample({ path: { metricName: name } })),
        );

        const initialData = initialResults.map((r) => r.data ?? null);
        const firstError = initialResults.find((r) => r.error);
        if (firstError) {
          const apiError = extractApiError(firstError.error);
          if (apiError) return { data: null, error: apiError };
        }

        return {
          display: "metric-live",
          metricNames,
          pollInterval,
          data: initialData,
        };
      }
    }
  } catch (e) {
    return { data: null, error: String(e) };
  }
});
