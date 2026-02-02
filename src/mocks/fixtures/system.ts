import type {
  MetricList,
  ListenerList,
  TopicFilterList,
  CombinerList,
  PulseStatus,
} from "@/api/types.gen";

export const metricList: MetricList = {
  items: [
    { name: "com.hivemq.messages.incoming.total.count" },
    { name: "com.hivemq.messages.outgoing.total.count" },
    { name: "com.hivemq.networking.connections.current" },
    { name: "com.hivemq.system.os.global.memory.total" },
  ],
};

export const listenerList: ListenerList = {
  items: [
    { name: "tcp-listener-1883", port: 1883, protocol: "TCP" },
    { name: "websocket-listener-8080", port: 8080, protocol: "WEBSOCKET" },
  ],
};

export const topicFilterList: TopicFilterList = {
  items: [
    { topicFilter: "factory/#" },
    { topicFilter: "sensors/+/temperature" },
    { topicFilter: "cloud/commands/#" },
  ],
};

export const combinerList: CombinerList = {
  items: [
    {
      id: "combiner-line1",
      name: "Line 1 Combiner",
      description: "Combine line 1 sensor data",
      sources: {
        items: [
          { id: "opcua-adapter-01", type: "ADAPTER" },
          { id: "modbus-adapter-01", type: "ADAPTER" },
        ],
      },
      mappings: { items: [] },
    },
  ],
};

export const pulseStatus: PulseStatus = {
  activation: "DEACTIVATED",
  runtime: "DISCONNECTED",
};

export const capabilitiesList = {
  items: ["BRIDGE", "PROTOCOL_ADAPTER", "DATA_HUB", "PERSISTENCE"],
};

export const isa95 = {
  enabled: true,
  prefixAllTopics: false,
  enterprise: "acme-corp",
  site: "factory-01",
  area: "assembly",
  productionLine: "line-1",
  workCell: "",
};

export const frontendConfiguration = {
  environment: {
    properties: {
      "hivemq-edge-version": "2025.1",
    },
  },
};

export const healthResponse = { status: "UP" };
