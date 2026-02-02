import { authHandlers } from "./handlers/auth";
import { notificationHandlers } from "./handlers/notifications";
import { eventHandlers } from "./handlers/events";
import { bridgeHandlers } from "./handlers/bridges";
import { adapterHandlers } from "./handlers/adapters";
import { dataHubHandlers } from "./handlers/data-hub";
import { systemHandlers } from "./handlers/system";
import { samplingHandlers } from "./handlers/sampling";
import { chatHandlers } from "./handlers/chat";

const edgeApiHandlers = [
  ...authHandlers,
  ...notificationHandlers,
  ...eventHandlers,
  ...bridgeHandlers,
  ...adapterHandlers,
  ...dataHubHandlers,
  ...systemHandlers,
  ...samplingHandlers,
];

export const handlers = [
  ...(import.meta.env.VITE_MOCK_EDGE_API !== "false" ? edgeApiHandlers : []),
  ...(import.meta.env.VITE_MOCK_AGENT_CHAT === "true" ? chatHandlers : []),
];
