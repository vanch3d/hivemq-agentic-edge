# Task 00002: Plan & Progress

## Architecture Decisions

- **Code generation**: `@hey-api/openapi-ts` generates typed SDK, Axios client, and TanStack Query hooks from the OpenAPI spec into `src/api/`
- **Client config**: `src/api/client-config.ts` sets `baseURL` from `VITE_API_BASE_URL` env var (defaults to `http://localhost:8080`). This file is NOT auto-generated and persists across regenerations.
- **Generated files**: All `*.gen.ts` files in `src/api/` are excluded from ESLint and Prettier (auto-generated, not hand-edited)
- **MSW browser mocking**: Service worker intercepts all API calls in dev mode. Enabled via async bootstrap in `main.tsx` before React renders.
- **Mock data**: `@msw/data` v2 with Zod schemas for type-safe in-memory collections. Seeded with default data.
- **QueryClientProvider**: Added in `__root.tsx` wrapping the Outlet, so all routes have access to TanStack Query.

## File Structure

```
openapi-ts.config.ts          # hey-api code generation config
src/api/
  client-config.ts            # Runtime Axios config (manual, not generated)
  client.gen.ts               # Generated Axios client
  types.gen.ts                # Generated TypeScript types
  sdk.gen.ts                  # Generated SDK functions
  @tanstack/react-query.gen.ts # Generated TanStack Query hooks
  client/                     # Generated client internals
  core/                       # Generated core utilities
  index.ts                    # Generated barrel export
src/mocks/
  browser.ts                  # MSW setupWorker
  handlers.ts                 # Aggregates all handler groups
  handlers/
    auth.ts                   # Auth endpoint mock handlers
  db.ts                       # Zod collections (users)
public/
  mockServiceWorker.js        # MSW service worker (generated)
```

## Implementation Steps

- [x] Install runtime deps (axios, @tanstack/react-query, zod)
- [x] Install dev deps (@hey-api/openapi-ts, msw, @msw/data)
- [x] Create `openapi-ts.config.ts` with plugins (typescript, sdk, client-axios, tanstack-react-query)
- [x] Create `src/api/client-config.ts` with baseURL from env
- [x] Run `pnpm api:generate` — generated all client files
- [x] Add `QueryClientProvider` to `src/routes/__root.tsx`
- [x] Run `npx msw init public/` — service worker in place
- [x] Create `src/mocks/db.ts` with Zod user collection
- [x] Create `src/mocks/handlers/auth.ts` with 3 auth endpoint handlers
- [x] Create `src/mocks/handlers.ts` and `src/mocks/browser.ts`
- [x] Update `src/main.tsx` to bootstrap MSW before render
- [x] Add `src/api/**/*.gen.ts` to eslint and prettier ignores
- [x] Add `public` to eslint ignores (MSW service worker)
- [x] `pnpm build` passes
- [x] `pnpm lint` passes
