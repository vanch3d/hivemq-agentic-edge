import { http, HttpResponse } from "msw";
import { API_BASE_URL } from "@/api-config";
import { unauthorizedError } from "../fixtures/errors";
import {
  adaptersList,
  adapterTypesList,
  adapterStatusList,
} from "../fixtures/adapters";

const API_BASE = `${API_BASE_URL}/api/v1`;

function requireAuth(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return HttpResponse.json(unauthorizedError, { status: 401 });
  }
  return null;
}

export const adapterHandlers = [
  http.get(
    `${API_BASE}/management/protocol-adapters/adapters`,
    ({ request }) => {
      return requireAuth(request) ?? HttpResponse.json(adaptersList);
    },
  ),

  http.get(
    `${API_BASE}/management/protocol-adapters/adapters/:adapterId`,
    ({ request, params }) => {
      const err = requireAuth(request);
      if (err) return err;
      const adapter = adaptersList.items.find(
        (a) => a.id === params["adapterId"],
      );
      if (!adapter) {
        return HttpResponse.json(
          { title: "Adapter not found", status: 404 },
          { status: 404 },
        );
      }
      return HttpResponse.json(adapter);
    },
  ),

  http.get(`${API_BASE}/management/protocol-adapters/types`, ({ request }) => {
    return requireAuth(request) ?? HttpResponse.json(adapterTypesList);
  }),

  http.get(
    `${API_BASE}/management/protocol-adapters/types/:adapterType`,
    ({ request, params }) => {
      const err = requireAuth(request);
      if (err) return err;
      const filtered = adaptersList.items.filter(
        (a) => a.type === params["adapterType"],
      );
      return HttpResponse.json({ items: filtered });
    },
  ),

  http.get(
    `${API_BASE}/management/protocol-adapters/adapters/:adapterId/tags`,
    ({ request }) => {
      return (
        requireAuth(request) ??
        HttpResponse.json({
          items: [
            {
              name: "ns=3;s=Temperature",
              description: "Temperature sensor reading",
              definition: { dataType: "Float", accessLevel: "READ" },
            },
            {
              name: "ns=3;s=Pressure",
              description: "Pressure gauge reading",
              definition: { dataType: "Float", accessLevel: "READ" },
            },
          ],
        })
      );
    },
  ),

  http.get(
    `${API_BASE}/management/protocol-adapters/adapters/:adapterId/northboundMappings`,
    ({ request }) => {
      return (
        requireAuth(request) ??
        HttpResponse.json({
          items: [
            {
              tagName: "ns=3;s=Temperature",
              topic: "factory/line1/temperature",
              maxQoS: "AT_LEAST_ONCE",
              includeTimestamp: true,
              includeTagNames: false,
            },
          ],
        })
      );
    },
  ),

  http.get(
    `${API_BASE}/management/protocol-adapters/adapters/:adapterId/southboundMappings`,
    ({ request }) => {
      return requireAuth(request) ?? HttpResponse.json({ items: [] });
    },
  ),

  http.get(
    `${API_BASE}/management/protocol-adapters/adapters/:adapterId/status`,
    ({ request, params }) => {
      const err = requireAuth(request);
      if (err) return err;
      const adapter = adaptersList.items.find(
        (a) => a.id === params["adapterId"],
      );
      if (!adapter?.status) {
        return HttpResponse.json(
          { title: "Adapter not found", status: 404 },
          { status: 404 },
        );
      }
      return HttpResponse.json(adapter.status);
    },
  ),

  http.get(`${API_BASE}/management/protocol-adapters/status`, ({ request }) => {
    return requireAuth(request) ?? HttpResponse.json(adapterStatusList);
  }),

  // Mutation handlers
  http.post(
    `${API_BASE}/management/protocol-adapters/adapters/:adapterType`,
    async ({ request }) => {
      const err = requireAuth(request);
      if (err) return err;
      const body = await request.json();
      return HttpResponse.json(body, { status: 201 });
    },
  ),

  http.put(
    `${API_BASE}/management/protocol-adapters/adapters/:adapterId`,
    async ({ request }) => {
      const err = requireAuth(request);
      if (err) return err;
      const body = await request.json();
      return HttpResponse.json(body);
    },
  ),

  http.delete(
    `${API_BASE}/management/protocol-adapters/adapters/:adapterId`,
    ({ request }) => {
      return requireAuth(request) ?? new HttpResponse(null, { status: 204 });
    },
  ),

  http.put(
    `${API_BASE}/management/protocol-adapters/adapters/:adapterId/status`,
    async ({ request }) => {
      const err = requireAuth(request);
      if (err) return err;
      return HttpResponse.json({
        status: "PENDING",
        callbackTimeoutMillis: 5000,
      });
    },
  ),
];
