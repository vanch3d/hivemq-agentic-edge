import { http, HttpResponse } from "msw";
import { API_BASE_URL } from "@/api-config";
import { unauthorizedError } from "../fixtures/errors";
import { samplesForTopic, schemaForTopic } from "../fixtures/sampling";

const API_BASE = `${API_BASE_URL}/api/v1`;

function requireAuth(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return HttpResponse.json(unauthorizedError, { status: 401 });
  }
  return null;
}

export const samplingHandlers = [
  http.get(`${API_BASE}/management/sampling/topic/:topic`, ({ request }) => {
    return requireAuth(request) ?? HttpResponse.json(samplesForTopic);
  }),

  http.get(`${API_BASE}/management/sampling/schema/:topic`, ({ request }) => {
    return requireAuth(request) ?? HttpResponse.json(schemaForTopic);
  }),
];
