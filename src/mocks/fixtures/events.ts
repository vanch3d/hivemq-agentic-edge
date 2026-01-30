import type { EventList } from "@/api/types.gen";

export const eventList: EventList = {
  items: [
    {
      identifier: { identifier: "evt-001", type: "EVENT" },
      created: "2026-01-30T10:00:00.000Z",
      timestamp: 1769763600000,
      message: "Bridge mqtt-bridge-01 connected successfully.",
      severity: "INFO",
    },
    {
      identifier: { identifier: "evt-002", type: "EVENT" },
      created: "2026-01-30T09:59:00.000Z",
      timestamp: 1769763540000,
      message: "Protocol adapter opcua-adapter-01 failed to connect.",
      severity: "ERROR",
    },
    {
      identifier: { identifier: "evt-003", type: "EVENT" },
      created: "2026-01-30T09:58:00.000Z",
      timestamp: 1769763480000,
      message: "Configuration reloaded by user admin.",
      severity: "WARN",
    },
  ],
};
