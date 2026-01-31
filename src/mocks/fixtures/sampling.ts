export const samplesForTopic = {
  items: [
    {
      topic: "factory/line1/temperature",
      payload: '{"value": 23.5, "unit": "C"}',
      timestamp: 1769763600000,
    },
    {
      topic: "factory/line1/temperature",
      payload: '{"value": 24.1, "unit": "C"}',
      timestamp: 1769763601000,
    },
    {
      topic: "factory/line1/temperature",
      payload: '{"value": 23.8, "unit": "C"}',
      timestamp: 1769763602000,
    },
  ],
};

export const schemaForTopic = {
  schemaDefinition:
    '{"type":"object","properties":{"value":{"type":"number"},"unit":{"type":"string"}},"required":["value","unit"]}',
};
