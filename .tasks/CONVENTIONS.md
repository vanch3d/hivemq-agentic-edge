# Task Tracking Conventions

All work is tracked under `.tasks/` with one subfolder per task, named with a sequential ID prefix (e.g. `00001-core-application`).

## Folder Structure

```
.tasks/
  CONVENTIONS.md              ← This file (rules for all agents)
  <taskid>-<slug>/
    INDEX.md                  ← Table of contents for the task folder
    TASK_BRIEF.md             ← What the user asked for (requirements only)
    TASK_PLAN.md              ← Architecture decisions, plan, progress
    ...                       ← Any other documents as needed
```

## Document Roles

| Document          | Contains                                                                                | Does NOT contain                                                    |
| ----------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **TASK_BRIEF.md** | User's requirements, objectives, scope, and any follow-up requests                      | Implementation details, architecture decisions, progress checklists |
| **TASK_PLAN.md**  | Architecture decisions, file structure, implementation steps with progress checkboxes   | User's original requirements (reference the brief instead)          |
| **INDEX.md**      | Table of contents listing every document in the task folder with a one-line description | Actual task content                                                 |

## Rules

1. **TASK_BRIEF is append-only for requirements.** When the user adds or changes requirements, update the brief. Never put planning or progress in the brief.
2. **TASK_PLAN tracks what you decided and where you are.** Use checkboxes (`- [x]` / `- [ ]`) for progress. Update them as you go.
3. **Keep INDEX.md current.** When you add a new document to the task folder, add a row to the index.
4. **Create additional documents as needed.** For example: `DECISIONS.md` for lengthy trade-off discussions, `ISSUES.md` for blockers, `CHANGELOG.md` for a log of changes. Always add them to the index.
5. **Task IDs are zero-padded to 5 digits** (e.g. `00001`, `00002`).
6. **Slug should be short and descriptive** using lowercase kebab-case.

---

# API Layer Conventions

## Generated code (`src/api/`)

The entire `src/api/` directory is **auto-generated** by `@hey-api/openapi-ts` and is **wiped and recreated** on every run of `pnpm api:generate`. Never place manual files inside `src/api/`.

## Manual API files (outside `src/api/`)

Files that configure or extend the generated client live in `src/` directly:

| File                | Purpose                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `src/api-config.ts` | Exports `API_BASE_URL`, `createClientConfig` (used by generated client), and `setupAuthInterceptor()`             |
| `src/auth-token.ts` | Module-level JWT token store (`getAuthToken` / `setAuthToken`) shared between React context and Axios interceptor |

These files are imported by the generated `src/api/client.gen.ts` (via `runtimeConfigPath` in `openapi-ts.config.ts`) and by application code. They must stay outside `src/api/` to survive regeneration.

## Authentication pattern

- **Token store**: `src/auth-token.ts` holds the JWT in a module-level variable. `AuthProvider` calls `setAuthToken()` on login/logout. The Axios interceptor reads it via `getAuthToken()`.
- **Interceptor**: Registered once at app startup in `src/main.tsx` via `setupAuthInterceptor(client.instance)`. Attaches `Authorization: Bearer <token>` to every request when a token is present.
- **Public endpoints** (no token needed): `/api/v1/auth/*`, `/api/v1/health/*`, `/api/v1/frontend/*`, `/`. See `.tasks/00002-openapi/API_AUTH.md` for the full list.
- **Authenticated endpoints**: Everything else. See `.tasks/00002-openapi/API_AUTH.md` for the full breakdown.

## MSW mocks — naming convention

Handler and fixture files are named by **resource/entity**, not by URL path prefix. This gives a 1:1 pairing between handlers and fixtures.

| Resource | Handler file | Fixture file | API path(s) |
|----------|-------------|-------------|-------------|
| auth | `handlers/auth.ts` | — (dynamic JWT) | `/api/v1/auth/*` |
| notifications | `handlers/notifications.ts` | `fixtures/notifications.ts` | `/api/v1/frontend/notifications` |
| events | `handlers/events.ts` | `fixtures/events.ts` | `/api/v1/management/events` |
| bridges (future) | `handlers/bridges.ts` | `fixtures/bridges.ts` | `/api/v1/management/bridges/*` |
| *(shared errors)* | — | `fixtures/errors.ts` | — |

**Rules**:
1. **Name by resource**, not by URL segment. The URL path is an implementation detail inside the handler file.
2. **Handler and fixture share the same filename** for the same resource (e.g. `events.ts` + `events.ts`).
3. **`auth` is a special case** — it produces dynamic JWTs so it has no static fixture, but uses `fixtures/errors.ts` for error responses.
4. **`fixtures/errors.ts`** holds cross-cutting error responses (`unauthorizedError: ProblemDetails`, etc.) shared by any handler.
5. **Exported array names** follow the pattern `<resource>Handlers` (e.g. `notificationHandlers`, `eventHandlers`).

## MSW mock handlers (`src/mocks/handlers/`)

- One file per resource in `src/mocks/handlers/`.
- Each file exports a named handler array (e.g. `export const eventHandlers = [...]`).
- `src/mocks/handlers.ts` aggregates and re-exports all handler arrays.
- Handler URLs use `API_BASE_URL` from `src/api-config.ts` to stay in sync with the Axios client: `` const API_BASE = `${API_BASE_URL}/api/v1` ``.
- Authenticated endpoint mocks must check for the `Authorization` header and return `unauthorizedError` with status 401 if missing.
- Dynamic data collections live in `src/mocks/db.ts` using `@msw/data` with Zod schemas.

## Fixture data (`src/mocks/fixtures/`)

Static mock response data lives in `src/mocks/fixtures/`, one file per resource. This data is shared between MSW handlers and tests.

**Typing rules** — every fixture must:
- Be explicitly typed using the generated types from `@/api/types.gen` (e.g. `NotificationList`, `EventList`, `ProblemDetails`).
- Use `import type` for type imports.
- Have no `any`, no `as const` casting, no untyped object literals. The TypeScript compiler must validate the data against the API schema.

## Adding a new API endpoint mock

1. Create a fixture file in `src/mocks/fixtures/<resource>.ts` with explicitly typed response data.
2. Create a handler file `src/mocks/handlers/<resource>.ts` (same name as the fixture). Export a `<resource>Handlers` array.
3. The handler imports its response data from the fixture — no inline object literals for response bodies.
4. Add the handler array to `src/mocks/handlers.ts`.
5. For authenticated endpoints, check the `Authorization` header and return `unauthorizedError` from `fixtures/errors.ts` with status 401 if missing.
6. Type any dynamically constructed responses using the generated types (e.g. `const response: ApiBearerToken = { ... }`).
