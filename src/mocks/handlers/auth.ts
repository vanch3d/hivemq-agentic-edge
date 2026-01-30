import { http, HttpResponse } from "msw";
import { users } from "../db";

const API_BASE = "/api/v1";

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
      return HttpResponse.json(
        { title: "Unauthorized", status: 401 },
        { status: 401 },
      );
    }

    return HttpResponse.json({ token: createMockJwt(user.username, user.roles) });
  }),

  http.post(`${API_BASE}/auth/refresh-token`, async ({ request }) => {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return HttpResponse.json(
        { title: "Unauthorized", status: 401 },
        { status: 401 },
      );
    }

    // Return a fresh mock token
    return HttpResponse.json({ token: createMockJwt("admin", ["admin"]) });
  }),

  http.post(`${API_BASE}/auth/validate-token`, async ({ request }) => {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return HttpResponse.json(
        { title: "Unauthorized", status: 401 },
        { status: 401 },
      );
    }

    return HttpResponse.json({ token: authHeader.slice(7) });
  }),
];
