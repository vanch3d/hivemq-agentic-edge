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
      deserialization: {
        publish: { schema: { schemaId: "temperature-schema", version: "1" } },
      },
      onTransitions: [
        {
          fromState: "Connected",
          toState: "Disconnected",
          "Connection.OnDisconnect": {
            pipeline: [
              {
                id: "log-disconnect",
                functionId: "System.log",
                arguments: { level: "WARN", message: "Device disconnected" },
              },
              {
                id: "transform-disconnect",
                functionId: "transform-celsius",
                arguments: {},
              },
            ],
          },
        },
        {
          fromState: "Any",
          toState: "Any",
          "Mqtt.OnInboundPublish": {
            pipeline: [
              {
                id: "deserialize-publish",
                functionId: "Serdes.deserialize",
                arguments: { schemaId: "temperature-schema" },
              },
            ],
          },
        },
      ],
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
      onSuccess: {
        pipeline: [
          {
            id: "log-valid",
            functionId: "System.log",
            arguments: { level: "INFO", message: "Payload valid" },
          },
        ],
      },
      onFailure: {
        pipeline: [
          {
            id: "transform-fallback",
            functionId: "transform-celsius",
            arguments: {},
          },
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
