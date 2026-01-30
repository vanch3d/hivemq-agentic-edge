# Task 00002: OpenAPI Stubs & Mocks

## Objective

Implement API stubs and mocks from the HiveMQ Edge OpenAPI specification.

## Requirements

- OpenAPI spec located at `.docs/openapi-bundle.yaml`
- Use `@hey-api/openapi-ts` to generate client stubs with:
  - TypeScript types and SDK output
  - Axios client plugin
  - TanStack React Query plugin
  - Prettier and lint integration
  - Output to `./src/api`
- Use MSW (`msw`) for live browser mocking in development
- Use `@msw/data` (v2, with Zod) for persistent mock data collections
- Start with auth endpoint mocks only (3 endpoints); expand as needed
- Schema library: Zod
