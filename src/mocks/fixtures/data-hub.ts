import type {
  BehaviorPolicyList,
  DataPolicyList,
  SchemaList,
  ScriptList,
} from "@/api/types.gen";

export const behaviorPolicyList: BehaviorPolicyList = {
  items: [
    {
      id: "policy-max-messages",
      matching: {
        clientIdRegex: "device-.*",
      },
      behavior: {
        id: "Mqtt.events",
        arguments: { maxConnects: { limit: 10, timeFrame: "1h" } },
      },
    },
  ],
};

export const dataPolicyList: DataPolicyList = {
  items: [
    {
      id: "validate-temperature",
      matching: {
        topicFilter: "factory/+/temperature",
      },
      validation: {
        validators: [
          { type: "SCHEMA", arguments: { schemaId: "temperature-schema" } },
        ],
      },
    },
  ],
};

export const schemaList: SchemaList = {
  items: [
    {
      id: "temperature-schema",
      type: "JSON",
      schemaDefinition:
        '{"type":"object","properties":{"value":{"type":"number"},"unit":{"type":"string"}},"required":["value"]}',
    },
  ],
};

export const scriptList: ScriptList = {
  items: [
    {
      id: "transform-celsius",
      description: "Convert Fahrenheit to Celsius",
      functionType: "TRANSFORMATION",
      source:
        "function transform(publish, context) { publish.payload.value = (publish.payload.value - 32) * 5/9; return publish; }",
    },
  ],
};
