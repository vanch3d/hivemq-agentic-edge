import { http, HttpResponse } from "msw";
import { API_BASE_URL } from "@/api-config";
import { notificationList } from "../fixtures/notifications";

const API_BASE = `${API_BASE_URL}/api/v1`;

export const notificationHandlers = [
  http.get(`${API_BASE}/frontend/notifications`, () => {
    return HttpResponse.json(notificationList);
  }),
];
