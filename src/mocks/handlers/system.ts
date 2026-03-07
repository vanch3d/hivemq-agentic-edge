import { http, HttpResponse } from "msw";
import { API_BASE_URL } from "@/api-config";
import { unauthorizedError } from "../fixtures/errors";
import {
  metricList,
  listenerList,
  topicFilterList,
  combinerList,
  pulseStatus,
  capabilitiesList,
  isa95,
  frontendConfiguration,
  healthResponse,
} from "../fixtures/system";

const API_BASE = `${API_BASE_URL}/api/v1`;

function requireAuth(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return HttpResponse.json(unauthorizedError, { status: 401 });
  }
  return null;
}

// Pseudo-random number generator seeded by metric name for consistent behavior
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = (Math.imul(h, 1103515245) + 12345) | 0;
    return Math.abs(h) / 2147483647;
  };
}

// Track counter state per metric so they increment over time
const counterState = new Map<string, number>();

function generateMetricValue(metricName: string): number {
  const isCounter = metricName.includes(".count");
  const isMemory = metricName.includes(".memory.");
  const isConnections = metricName.includes(".connections.");

  if (isCounter) {
    const current =
      counterState.get(metricName) ??
      Math.floor(seededRandom(metricName)() * 10000);
    const increment = Math.floor(Math.random() * 5) + 1;
    const next = current + increment;
    counterState.set(metricName, next);
    return next;
  }

  if (isMemory) {
    // Fluctuate around 8GB
    const baseline = 8_589_934_592;
    return baseline + Math.floor((Math.random() - 0.5) * 500_000_000);
  }

  if (isConnections) {
    // Fluctuate around 12
    return Math.max(0, 12 + Math.floor((Math.random() - 0.5) * 6));
  }

  // Default: random value 0-100
  return Math.floor(Math.random() * 100);
}

export const systemHandlers = [
  http.get(`${API_BASE}/metrics`, ({ request }) => {
    return requireAuth(request) ?? HttpResponse.json(metricList);
  }),

  http.get(`${API_BASE}/metrics/:metricName/latest`, ({ request, params }) => {
    const err = requireAuth(request);
    if (err) return err;

    const metricName = params["metricName"] as string;
    const known = metricList.items.some((m) => m.name === metricName);
    if (!known) {
      return HttpResponse.json(
        { title: "Metric not found", status: 404 },
        { status: 404 },
      );
    }

    return HttpResponse.json({
      sampleTime: new Date().toISOString(),
      value: generateMetricValue(metricName),
    });
  }),

  http.get(`${API_BASE}/gateway/listeners`, ({ request }) => {
    return requireAuth(request) ?? HttpResponse.json(listenerList);
  }),

  http.get(`${API_BASE}/frontend/capabilities`, ({ request }) => {
    return requireAuth(request) ?? HttpResponse.json(capabilitiesList);
  }),

  http.get(`${API_BASE}/frontend/configuration`, ({ request }) => {
    return requireAuth(request) ?? HttpResponse.json(frontendConfiguration);
  }),

  http.get(`${API_BASE}/health/liveness`, () => {
    return HttpResponse.json(healthResponse);
  }),

  http.get(`${API_BASE}/health/readiness`, () => {
    return HttpResponse.json(healthResponse);
  }),

  http.get(`${API_BASE}/management/uns/isa95`, ({ request }) => {
    return requireAuth(request) ?? HttpResponse.json(isa95);
  }),

  http.get(`${API_BASE}/management/pulse/status`, ({ request }) => {
    return requireAuth(request) ?? HttpResponse.json(pulseStatus);
  }),

  http.get(`${API_BASE}/management/combiners`, ({ request }) => {
    return requireAuth(request) ?? HttpResponse.json(combinerList);
  }),

  http.get(
    `${API_BASE}/management/combiners/:combinerId`,
    ({ request, params }) => {
      const err = requireAuth(request);
      if (err) return err;
      const combiner = combinerList.items.find(
        (c) => c.id === params["combinerId"],
      );
      if (!combiner) {
        return HttpResponse.json(
          { title: "Combiner not found", status: 404 },
          { status: 404 },
        );
      }
      return HttpResponse.json(combiner);
    },
  ),

  http.get(`${API_BASE}/management/topic-filters`, ({ request }) => {
    return requireAuth(request) ?? HttpResponse.json(topicFilterList);
  }),

  http.get(
    `${API_BASE}/management/topic-filters/:filter`,
    ({ request, params }) => {
      const err = requireAuth(request);
      if (err) return err;
      const tf = topicFilterList.items.find(
        (t) => t.topicFilter === params["filter"],
      );
      if (!tf) {
        return HttpResponse.json(
          { title: "Topic filter not found", status: 404 },
          { status: 404 },
        );
      }
      return HttpResponse.json(tf);
    },
  ),

  // Mutation handlers
  http.post(`${API_BASE}/management/topic-filters`, async ({ request }) => {
    const err = requireAuth(request);
    if (err) return err;
    const body = await request.json();
    return HttpResponse.json(body, { status: 201 });
  }),

  http.put(
    `${API_BASE}/management/topic-filters/:filter`,
    async ({ request }) => {
      const err = requireAuth(request);
      if (err) return err;
      const body = await request.json();
      return HttpResponse.json(body);
    },
  ),

  http.delete(`${API_BASE}/management/topic-filters/:filter`, ({ request }) => {
    return requireAuth(request) ?? new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API_BASE}/management/combiners`, async ({ request }) => {
    const err = requireAuth(request);
    if (err) return err;
    const body = await request.json();
    return HttpResponse.json(body, { status: 201 });
  }),

  http.put(
    `${API_BASE}/management/combiners/:combinerId`,
    async ({ request }) => {
      const err = requireAuth(request);
      if (err) return err;
      const body = await request.json();
      return HttpResponse.json(body);
    },
  ),

  http.delete(`${API_BASE}/management/combiners/:combinerId`, ({ request }) => {
    return requireAuth(request) ?? new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API_BASE}/management/uns/isa95`, async ({ request }) => {
    const err = requireAuth(request);
    if (err) return err;
    const body = await request.json();
    return HttpResponse.json(body);
  }),
];
