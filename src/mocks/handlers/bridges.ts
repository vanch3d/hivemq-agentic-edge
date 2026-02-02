import { http, HttpResponse } from "msw";
import { API_BASE_URL } from "@/api-config";
import { unauthorizedError } from "../fixtures/errors";
import { bridgeList, bridgeStatusList } from "../fixtures/bridges";
import type { Bridge } from "@/api/types.gen";

const API_BASE = `${API_BASE_URL}/api/v1`;

export const bridgeHandlers = [
  http.get(`${API_BASE}/management/bridges`, ({ request }) => {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return HttpResponse.json(unauthorizedError, { status: 401 });
    }
    return HttpResponse.json(bridgeList);
  }),

  http.get(
    `${API_BASE}/management/bridges/:bridgeId`,
    ({ request, params }) => {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return HttpResponse.json(unauthorizedError, { status: 401 });
      }
      const bridge = bridgeList.items.find((b) => b.id === params["bridgeId"]);
      if (!bridge) {
        return HttpResponse.json(
          { title: "Bridge not found", status: 404 },
          { status: 404 },
        );
      }
      return HttpResponse.json(bridge);
    },
  ),

  http.get(`${API_BASE}/management/bridges/status`, ({ request }) => {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return HttpResponse.json(unauthorizedError, { status: 401 });
    }
    return HttpResponse.json(bridgeStatusList);
  }),

  http.get(
    `${API_BASE}/management/bridges/:bridgeId/status`,
    ({ request, params }) => {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return HttpResponse.json(unauthorizedError, { status: 401 });
      }
      const bridge = bridgeList.items.find((b) => b.id === params["bridgeId"]);
      if (!bridge?.status) {
        return HttpResponse.json(
          { title: "Bridge not found", status: 404 },
          { status: 404 },
        );
      }
      return HttpResponse.json(bridge.status);
    },
  ),

  // Mutation handlers
  http.post(`${API_BASE}/management/bridges`, async ({ request }) => {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return HttpResponse.json(unauthorizedError, { status: 401 });
    }
    const body = (await request.json()) as Bridge;
    return HttpResponse.json(body, { status: 201 });
  }),

  http.put(`${API_BASE}/management/bridges/:bridgeId`, async ({ request }) => {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return HttpResponse.json(unauthorizedError, { status: 401 });
    }
    const body = (await request.json()) as Bridge;
    return HttpResponse.json(body);
  }),

  http.delete(`${API_BASE}/management/bridges/:bridgeId`, ({ request }) => {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return HttpResponse.json(unauthorizedError, { status: 401 });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.put(
    `${API_BASE}/management/bridges/:bridgeId/status`,
    async ({ request }) => {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return HttpResponse.json(unauthorizedError, { status: 401 });
      }
      return HttpResponse.json({
        status: "PENDING",
        callbackTimeoutMillis: 5000,
      });
    },
  ),
];
