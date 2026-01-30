import { authHandlers } from "./handlers/auth";
import { notificationHandlers } from "./handlers/notifications";
import { eventHandlers } from "./handlers/events";

export const handlers = [
  ...authHandlers,
  ...notificationHandlers,
  ...eventHandlers,
];
