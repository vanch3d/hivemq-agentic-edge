import { http, HttpResponse } from "msw";
import { API_BASE_URL } from "@/api-config";
import { unauthorizedError } from "../fixtures/errors";
import { eventList } from "../fixtures/events";

const API_BASE = `${API_BASE_URL}/api/v1`;

export const eventHandlers = [
  http.get(`${API_BASE}/management/events`, ({ request }) => {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return HttpResponse.json(unauthorizedError, { status: 401 });
    }

    return HttpResponse.json(eventList);
  }),
];
