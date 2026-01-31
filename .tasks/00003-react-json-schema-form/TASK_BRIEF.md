# Task 00003: Requirements

## Objective

Use [react-jsonschema-form](https://github.com/rjsf-team/react-jsonschema-form) (RJSF) to automatically generate forms from the JSON schemas produced by the API code generation (`src/api/schemas.gen.ts`).

## Requirements

1. Use the RJSF Chakra UI theme (`@rjsf/chakra-ui`) to match the existing UI.
2. Create a general-purpose `SchemaForm` wrapper component for consistent configuration across all forms.
3. Replace the login form with an RJSF-based form as the first use case.
4. Future forms should follow the same pattern — schema from `schemas.gen.ts`, uiSchema for customization, `SchemaForm` wrapper for rendering.
