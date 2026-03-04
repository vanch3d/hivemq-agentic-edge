# Task Plan: Internationalization (react-i18next)

## Architecture Decisions

- **Library**: `react-i18next` + `i18next`. No additional plugins needed.
- **Default namespace**: `translation` (i18next default).
- **Locale files**: `src/locales/<locale>.json` (e.g. `en-US.json`).
- **Initialization**: `src/i18n.ts` imported as a side-effect in `src/main.tsx` before rendering.
- **Schema↔i18n mapping**: `createLocalizedUiSchema()` utility auto-generates uiSchema entries from i18n keys by convention.

## Translation Key Convention

| Scope        | Pattern                                           | Example                                                     |
| ------------ | ------------------------------------------------- | ----------------------------------------------------------- |
| Page text    | `<page>.<element>`                                | `login.title`, `login.submit`                               |
| Page errors  | `<page>.errors.<errorName>`                       | `login.errors.invalidCredentials`                           |
| Navigation   | `nav.<item>`                                      | `nav.home`, `nav.logout`                                    |
| Schema field | `schemas.<schemaName>.fields.<field>.title`       | `schemas.usernamePasswordCredentials.fields.userName.title` |
| Schema field | `schemas.<schemaName>.fields.<field>.description` | (same pattern)                                              |
| Schema field | `schemas.<schemaName>.fields.<field>.placeholder` | (same pattern)                                              |

## Implementation Steps

- [x] Install `react-i18next` and `i18next`
- [x] Create `src/i18n.ts` configuration
- [x] Create `src/locales/en-US.json` with all translations
- [x] Import `@/i18n` in `src/main.tsx`
- [x] Create `src/utils/create-localized-ui-schema.ts` utility
- [x] Add `i18nPrefix` prop to `SchemaForm` wrapper
- [x] Replace all hardcoded strings with `t()` calls in all components
- [x] Verify build and lint pass
- [x] Update CONVENTIONS.md with i18n section
- [x] Create task documentation

## Files Created / Modified

| Action | File                                            |
| ------ | ----------------------------------------------- |
| Create | `src/i18n.ts`                                   |
| Create | `src/locales/en-US.json`                        |
| Create | `src/utils/create-localized-ui-schema.ts`       |
| Modify | `src/main.tsx`                                  |
| Modify | `src/components/schema-form.tsx`                |
| Modify | `src/routes/login.tsx`                          |
| Modify | `src/routes/_authenticated/workspace/index.tsx` |
| Modify | `src/components/workspace/toolbar.tsx`          |
| Modify | `src/components/workspace/sidebar.tsx`          |
