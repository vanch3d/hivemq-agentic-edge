import { http, HttpResponse } from "msw";
import { API_BASE_URL } from "@/api-config";
import { unauthorizedError } from "../fixtures/errors";
import {
  adaptersList,
  adapterTypesList,
  adapterStatusList,
  adapterDomainTags,
  adapterNorthboundMappings,
  adapterSouthboundMappings,
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

  // --- Per-adapter domain tags ---
  http.get(
    `${API_BASE}/management/protocol-adapters/adapters/:adapterId/tags`,
    ({ request, params }) => {
      const err = requireAuth(request);
      if (err) return err;
      const tags = adapterDomainTags[params["adapterId"] as string] ?? {
        items: [],
      };
      return HttpResponse.json(tags);
    },
  ),

  // --- Global domain tags (aggregated across all adapters) ---
  http.get(`${API_BASE}/management/protocol-adapters/tags`, ({ request }) => {
    const err = requireAuth(request);
    if (err) return err;
    const allTags = Object.values(adapterDomainTags).flatMap(
      (list) => list.items,
    );
    return HttpResponse.json({ items: allTags });
  }),

  // --- Per-adapter northbound mappings ---
  http.get(
    `${API_BASE}/management/protocol-adapters/adapters/:adapterId/northboundMappings`,
    ({ request, params }) => {
      const err = requireAuth(request);
      if (err) return err;
      const mappings = adapterNorthboundMappings[
        params["adapterId"] as string
      ] ?? { items: [] };
      return HttpResponse.json(mappings);
    },
  ),

  // --- Global northbound mappings (aggregated) ---
  http.get(
    `${API_BASE}/management/protocol-adapters/mappings/northboundMappings`,
    ({ request }) => {
      const err = requireAuth(request);
      if (err) return err;
      const allMappings = Object.values(adapterNorthboundMappings).flatMap(
        (list) => list.items,
      );
      return HttpResponse.json({ items: allMappings });
    },
  ),

  // --- Per-adapter southbound mappings ---
  http.get(
    `${API_BASE}/management/protocol-adapters/adapters/:adapterId/southboundMappings`,
    ({ request, params }) => {
      const err = requireAuth(request);
      if (err) return err;
      const mappings = adapterSouthboundMappings[
        params["adapterId"] as string
      ] ?? { items: [] };
      return HttpResponse.json(mappings);
    },
  ),

  // --- Global southbound mappings (aggregated) ---
  http.get(
    `${API_BASE}/management/protocol-adapters/mappings/southboundMappings`,
    ({ request }) => {
      const err = requireAuth(request);
      if (err) return err;
      const allMappings = Object.values(adapterSouthboundMappings).flatMap(
        (list) => list.items,
      );
      return HttpResponse.json({ items: allMappings });
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
