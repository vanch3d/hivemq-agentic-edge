# API Authentication Analysis

## Findings

The HiveMQ Edge OpenAPI specification (`.docs/openapi-bundle.yaml`) does **not** formally declare any security requirements:

- No `securitySchemes` in `components`
- No global `security` declaration
- No per-operation `security` annotations

However, the API clearly implements JWT-based authentication via three dedicated endpoints. At runtime the server requires a `Bearer` token for all endpoints except those listed as public below.

## Security Scheme (runtime, undocumented)

- **Type**: HTTP Bearer (JWT)
- **Header**: `Authorization: Bearer <token>`
- **Token source**: `POST /api/v1/auth/authenticate` returns `{ token: "..." }`
- **Refresh**: `POST /api/v1/auth/refresh-token`
- **Validation**: `POST /api/v1/auth/validate-token`

## Public Endpoints (no token required)

| Group    | Endpoints                                                                                                       |
| -------- | --------------------------------------------------------------------------------------------------------------- |
| Auth     | `POST /api/v1/auth/authenticate`, `POST /api/v1/auth/refresh-token`, `POST /api/v1/auth/validate-token`         |
| Health   | `GET /api/v1/health/liveness`, `GET /api/v1/health/readiness`                                                   |
| Frontend | `GET /api/v1/frontend/capabilities`, `GET /api/v1/frontend/configuration`, `GET /api/v1/frontend/notifications` |
| Root     | `GET /`                                                                                                         |

## Authenticated Endpoints (token required)

All other endpoints require the Bearer token. This includes:

- `/api/v1/management/bridges/*`
- `/api/v1/management/protocol-adapters/*`
- `/api/v1/management/events/*`
- `/api/v1/management/topic-filters/*`
- `/api/v1/management/combiners/*`
- `/api/v1/management/pulse/*`
- `/api/v1/data-hub/behavior-validation/*`
- `/api/v1/data-hub/data-validation/*`
- `/api/v1/data-hub/schemas/*`
- `/api/v1/data-hub/scripts/*`
- `/api/v1/data-hub/fsm`, `/api/v1/data-hub/functions`, `/api/v1/data-hub/interpolation-variables`, `/api/v1/data-hub/function-specs`
- `/api/v1/gateway/configuration`, `/api/v1/gateway/listeners`
- `/api/v1/metrics/*`

## Implementation Notes

Since the spec does not declare security, the generated SDK functions do not include auth parameters. Authentication must be handled at the Axios client level via a request interceptor that attaches the `Authorization` header to all outgoing requests (except public endpoints).
