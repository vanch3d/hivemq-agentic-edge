import type { BridgeList, StatusList } from "@/api/types.gen";

export const bridgeList: BridgeList = {
  items: [
    {
      id: "mqtt-bridge-01",
      host: "broker.hivemq.com",
      port: 1883,
      cleanStart: true,
      keepAlive: 60,
      sessionExpiry: 300,
      username: "edge-user",
      localSubscriptions: [
        { filters: ["factory/line1/#"], maxQoS: "AT_LEAST_ONCE" },
      ],
      remoteSubscriptions: [
        { filters: ["cloud/commands/#"], maxQoS: "AT_LEAST_ONCE" },
      ],
      status: {
        id: "mqtt-bridge-01",
        connection: "CONNECTED",
        runtime: "STARTED",
        type: "bridge",
        startedAt: "2026-01-30T08:00:00.000Z",
      },
    },
    {
      id: "mqtt-bridge-02",
      host: "192.168.1.100",
      port: 8883,
      cleanStart: false,
      keepAlive: 30,
      sessionExpiry: 600,
      localSubscriptions: [{ filters: ["sensors/#"], maxQoS: "AT_MOST_ONCE" }],
      remoteSubscriptions: [],
      status: {
        id: "mqtt-bridge-02",
        connection: "DISCONNECTED",
        runtime: "STOPPED",
        type: "bridge",
      },
    },
  ],
};

export const bridgeStatusList: StatusList = {
  items: bridgeList.items.map((b) => b.status!),
};
