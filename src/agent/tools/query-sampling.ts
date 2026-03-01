import { querySamplingDef } from "@/agent/tool-definitions";
import { getSamplesForTopic, getSchemaForTopic } from "@/api/sdk.gen";
import { snapshotQueryResult } from "./snapshot-helper";

type ApiError = { title?: string };

export const querySampling = querySamplingDef.client(async (input) => {
  try {
    switch (input.operation) {
      case "samples": {
        const { data, error } = await getSamplesForTopic({
          path: { topic: input.topic },
        });
        const result = {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "querySampling",
            operation: "samples",
            data: result.data,
            label: `Sampling \u2014 ${input.topic}`,
          });
          return { ...result, snapshotId };
        }
        return result;
      }
      case "schema": {
        const { data, error } = await getSchemaForTopic({
          path: { topic: input.topic },
        });
        const result = { data, error: (error as ApiError | undefined)?.title };
        if (result.data && !result.error) {
          const snapshotId = snapshotQueryResult({
            toolName: "querySampling",
            operation: "schema",
            data: result.data,
            label: `Sampling \u2014 ${input.topic} schema`,
          });
          return { ...result, snapshotId };
        }
        return result;
      }
    }
  } catch (e) {
    return { data: null, error: String(e) };
  }
});
