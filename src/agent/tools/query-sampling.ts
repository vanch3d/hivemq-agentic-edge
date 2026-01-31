import { z } from "zod";
import { toolDefinition } from "@tanstack/ai";
import { getSamplesForTopic, getSchemaForTopic } from "@/api/sdk.gen";

const querySamplingDef = toolDefinition({
  name: "querySampling",
  description:
    "Query topic sampling data. Use 'samples' to get sampled messages for a topic, 'schema' to get the inferred schema for a topic.",
  inputSchema: z.object({
    operation: z.enum(["samples", "schema"]),
    topic: z.string(),
  }),
  outputSchema: z.object({
    data: z.unknown(),
    error: z.string().optional(),
  }),
});

export const querySampling = querySamplingDef.client(async (input) => {
  try {
    switch (input.operation) {
      case "samples": {
        const { data, error } = await getSamplesForTopic({
          path: { topic: input.topic },
        });
        return { data: data?.items, error: error?.title };
      }
      case "schema": {
        const { data, error } = await getSchemaForTopic({
          path: { topic: input.topic },
        });
        return { data, error: error?.title };
      }
    }
  } catch (e) {
    return { data: null, error: String(e) };
  }
});
