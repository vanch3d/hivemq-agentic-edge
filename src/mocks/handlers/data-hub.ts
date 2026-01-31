import { http, HttpResponse } from "msw";
import { API_BASE_URL } from "@/api-config";
import { unauthorizedError } from "../fixtures/errors";
import {
  behaviorPolicyList,
  dataPolicyList,
  schemaList,
  scriptList,
} from "../fixtures/data-hub";

const API_BASE = `${API_BASE_URL}/api/v1`;

function requireAuth(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return HttpResponse.json(unauthorizedError, { status: 401 });
  }
  return null;
}

export const dataHubHandlers = [
  // Behavior policies
  http.get(
    `${API_BASE}/data-hub/behavior-validation/policies`,
    ({ request }) => {
      return requireAuth(request) ?? HttpResponse.json(behaviorPolicyList);
    },
  ),

  http.get(
    `${API_BASE}/data-hub/behavior-validation/policies/:policyId`,
    ({ request, params }) => {
      const err = requireAuth(request);
      if (err) return err;
      const policy = behaviorPolicyList.items.find(
        (p) => p.id === params["policyId"],
      );
      if (!policy) {
        return HttpResponse.json(
          { title: "Policy not found", status: 404 },
          { status: 404 },
        );
      }
      return HttpResponse.json(policy);
    },
  ),

  // Data policies
  http.get(`${API_BASE}/data-hub/data-validation/policies`, ({ request }) => {
    return requireAuth(request) ?? HttpResponse.json(dataPolicyList);
  }),

  http.get(
    `${API_BASE}/data-hub/data-validation/policies/:policyId`,
    ({ request, params }) => {
      const err = requireAuth(request);
      if (err) return err;
      const policy = dataPolicyList.items.find(
        (p) => p.id === params["policyId"],
      );
      if (!policy) {
        return HttpResponse.json(
          { title: "Policy not found", status: 404 },
          { status: 404 },
        );
      }
      return HttpResponse.json(policy);
    },
  ),

  // Schemas
  http.get(`${API_BASE}/data-hub/schemas`, ({ request }) => {
    return requireAuth(request) ?? HttpResponse.json(schemaList);
  }),

  http.get(`${API_BASE}/data-hub/schemas/:schemaId`, ({ request, params }) => {
    const err = requireAuth(request);
    if (err) return err;
    const schema = schemaList.items.find((s) => s.id === params["schemaId"]);
    if (!schema) {
      return HttpResponse.json(
        { title: "Schema not found", status: 404 },
        { status: 404 },
      );
    }
    return HttpResponse.json(schema);
  }),

  // Scripts
  http.get(`${API_BASE}/data-hub/scripts`, ({ request }) => {
    return requireAuth(request) ?? HttpResponse.json(scriptList);
  }),

  http.get(`${API_BASE}/data-hub/scripts/:scriptId`, ({ request, params }) => {
    const err = requireAuth(request);
    if (err) return err;
    const script = scriptList.items.find((s) => s.id === params["scriptId"]);
    if (!script) {
      return HttpResponse.json(
        { title: "Script not found", status: 404 },
        { status: 404 },
      );
    }
    return HttpResponse.json(script);
  }),

  // FSMs
  http.get(`${API_BASE}/data-hub/fsm`, ({ request }) => {
    return (
      requireAuth(request) ??
      HttpResponse.json({
        items: [
          { id: "Mqtt.events", description: "MQTT client event tracking" },
        ],
      })
    );
  }),

  // Function specs
  http.get(`${API_BASE}/data-hub/function-specs`, ({ request }) => {
    return (
      requireAuth(request) ??
      HttpResponse.json({
        items: [
          {
            id: "fn:com.hivemq:schema-validation:1",
            description: "Validate payload against a schema",
          },
          {
            id: "fn:com.hivemq:js-transformation:1",
            description: "Transform payload using JavaScript",
          },
        ],
      })
    );
  }),

  // Variables
  http.get(`${API_BASE}/data-hub/interpolation-variables`, ({ request }) => {
    return (
      requireAuth(request) ??
      HttpResponse.json({
        items: [
          { name: "clientId", description: "The MQTT client identifier" },
          { name: "topic", description: "The MQTT topic" },
        ],
      })
    );
  }),

  // Mutation handlers — echo body or return 204
  ...[
    "behavior-validation/policies",
    "data-validation/policies",
    "schemas",
    "scripts",
  ].flatMap((resource) => [
    http.post(`${API_BASE}/data-hub/${resource}`, async ({ request }) => {
      const err = requireAuth(request);
      if (err) return err;
      const body = await request.json();
      return HttpResponse.json(body, { status: 201 });
    }),
  ]),

  ...[
    "behavior-validation/policies/:policyId",
    "data-validation/policies/:policyId",
  ].flatMap((resource) => [
    http.put(`${API_BASE}/data-hub/${resource}`, async ({ request }) => {
      const err = requireAuth(request);
      if (err) return err;
      const body = await request.json();
      return HttpResponse.json(body);
    }),
    http.delete(`${API_BASE}/data-hub/${resource}`, ({ request }) => {
      return requireAuth(request) ?? new HttpResponse(null, { status: 204 });
    }),
  ]),

  ...["schemas/:schemaId", "scripts/:scriptId"].flatMap((resource) => [
    http.delete(`${API_BASE}/data-hub/${resource}`, ({ request }) => {
      return requireAuth(request) ?? new HttpResponse(null, { status: 204 });
    }),
  ]),
];
