import { http, HttpResponse } from "msw";
import { API_BASE_URL } from "@/api-config";
import type { ApiBearerToken } from "@/api/types.gen";
import { unauthorizedError } from "../fixtures/errors";
import { users } from "../db";

const API_BASE = `${API_BASE_URL}/api/v1`;

function createMockJwt(username: string, roles: string[]): string {
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: username,
      roles,
      iss: "HiveMQ-Edge",
      aud: "HiveMQ-Edge-Api",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  );
  return `${header}.${payload}.mock-signature`;
}

export const authHandlers = [
  http.post(`${API_BASE}/auth/authenticate`, async ({ request }) => {
    const body = (await request.json()) as {
      userName?: string;
      password?: string;
    };

    const user = users.findFirst((q) =>
      q.where({
        username: body.userName ?? "",
        password: body.password ?? "",
      }),
    );

    if (!user) {
      return HttpResponse.json(unauthorizedError, { status: 401 });
    }

    const response: ApiBearerToken = {
      token: createMockJwt(user.username, user.roles),
    };
    return HttpResponse.json(response);
  }),

  http.post(`${API_BASE}/auth/refresh-token`, async ({ request }) => {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return HttpResponse.json(unauthorizedError, { status: 401 });
    }

    const response: ApiBearerToken = {
      token: createMockJwt("admin", ["admin"]),
    };
    return HttpResponse.json(response);
  }),

  http.post(`${API_BASE}/auth/validate-token`, async ({ request }) => {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return HttpResponse.json(unauthorizedError, { status: 401 });
    }

    const response: ApiBearerToken = { token: authHeader.slice(7) };
    return HttpResponse.json(response);
  }),
];
