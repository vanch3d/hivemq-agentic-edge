import { authHandlers } from "./handlers/auth";
import { notificationHandlers } from "./handlers/notifications";
import { eventHandlers } from "./handlers/events";
import { bridgeHandlers } from "./handlers/bridges";
import { adapterHandlers } from "./handlers/adapters";
import { dataHubHandlers } from "./handlers/data-hub";
import { systemHandlers } from "./handlers/system";
import { samplingHandlers } from "./handlers/sampling";

export const handlers = [
  ...authHandlers,
  ...notificationHandlers,
  ...eventHandlers,
  ...bridgeHandlers,
  ...adapterHandlers,
  ...dataHubHandlers,
  ...systemHandlers,
  ...samplingHandlers,
];
