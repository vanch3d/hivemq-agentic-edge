# Task 00003: Plan & Progress

## Architecture Decisions

- **RJSF v6.2.5** with `@rjsf/chakra-ui` — officially supports Chakra UI v3 (peer dep `>= 3.16.1`).
- **`SchemaForm` wrapper** (`src/components/schema-form.tsx`) — thin wrapper providing default validator, Chakra UI theme, and custom submit button support via `children`.
- **Validator**: Single `customizeValidator()` instance from `@rjsf/validator-ajv8` at module scope.
- **Schema sourcing**: Generated `as const` schemas from `schemas.gen.ts` are spread into mutable objects at the call site (adding `required`, etc.), which resolves the `RJSFSchema` type mismatch.
- **Custom submit buttons**: When `children` are passed to `SchemaForm`, the default RJSF submit button is hidden via `"ui:submitButtonOptions": { norender: true }`.
- **`chakra-react-select`**: Required peer dep of `@rjsf/chakra-ui`, installed but not directly used yet.

## File Structure

```
src/components/
  schema-form.tsx            # Reusable RJSF wrapper with Chakra UI theme
src/routes/
  login.tsx                  # Refactored to use SchemaForm + generated schema
```

## Implementation Steps

- [x] Install deps: @rjsf/core, @rjsf/chakra-ui, @rjsf/utils, @rjsf/validator-ajv8, chakra-react-select
- [x] Create `SchemaForm` wrapper component
- [x] Replace login form with RJSF-based form using `UsernamePasswordCredentialsSchema`
- [x] `pnpm build` passes
- [x] `pnpm lint:all` passes
