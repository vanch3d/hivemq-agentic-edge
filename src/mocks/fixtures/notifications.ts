import type { NotificationList } from "@/api/types.gen";

export const notificationList: NotificationList = {
  items: [
    {
      title: "System update available",
      description: "A new version of HiveMQ Edge is available.",
      level: "NOTICE",
    },
    {
      title: "License expiring soon",
      description: "Your license will expire in 30 days.",
      level: "WARNING",
    },
  ],
};
