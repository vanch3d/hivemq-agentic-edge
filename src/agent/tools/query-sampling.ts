import { querySamplingDef } from "@/agent/tool-definitions";
import { getSamplesForTopic, getSchemaForTopic } from "@/api/sdk.gen";

type ApiError = { title?: string };

export const querySampling = querySamplingDef.client(async (input) => {
  try {
    switch (input.operation) {
      case "samples": {
        const { data, error } = await getSamplesForTopic({
          path: { topic: input.topic },
        });
        return {
          data: data?.items,
          error: (error as ApiError | undefined)?.title,
        };
      }
      case "schema": {
        const { data, error } = await getSchemaForTopic({
          path: { topic: input.topic },
        });
        return { data, error: (error as ApiError | undefined)?.title };
      }
    }
  } catch (e) {
    return { data: null, error: String(e) };
  }
});
