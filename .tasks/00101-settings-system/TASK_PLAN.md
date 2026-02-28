# Task Plan — Settings System

> See `TASK_BRIEF.md` for requirements.

## Architecture

The settings structure is defined by a **JSON Schema** on the server. The server is the single source of truth for what settings exist, their types, titles, descriptions, defaults, and allowed values. The frontend renders the form via `SchemaForm` (RJSF) — no hand-coded form fields to maintain.

```
Server defines: { schema, uiSchema, formData }
  → GET /api/settings returns all three
  → Frontend renders SchemaForm with server-provided schema
  → User changes produce formData (RJSF output)
  → formData persisted to localStorage (Zustand + persist)
  → On each chat request, formData sent in request body
  → Server merges: { ...envDefaults, ...requestFormData }
  → API key always stays server-side
```

Adding a new setting = add a property to the schema on the server. No frontend changes needed.

---

## Files

| Action | File | Purpose |
|--------|------|---------|
| CREATE | `server/api/settings.ts` | Hono route: serves JSON Schema + uiSchema + env-var defaults as formData |
| CREATE | `src/hooks/use-settings.ts` | TanStack Query hook for `GET /api/settings` |
| CREATE | `src/routes/_authenticated/workspace/configuration/settings.tsx` | Settings page — `SchemaForm` driven by server schema |
| MODIFY | `server/api/chat.ts` | Export `resolveEnvDefaults()`; accept `body.settings` override; refactor `resolveAdapter` |
| MODIFY | `server/index.ts` | Register `/api/settings` route |
| MODIFY | `src/context/chat-context.tsx` | Pass settings formData in `fetchServerSentEvents` body |
| MODIFY | `src/routes/_authenticated/workspace/configuration/index.tsx` | Add settings card |
| MODIFY | `src/locales/en-US.json` | Add page-level i18n keys (field labels come from schema) |

No types file, no Zustand store. The JSON Schema defines the structure. Persistence is `useLocalStorage` from `@uidotdev/usehooks`. The `formData` is `Record<string, unknown>` on both sides.

---

## Implementation Details

### 1. Settings schema — `server/api/settings.ts`

The JSON Schema defines the complete settings structure. Nested by concern, using `$defs` + `$ref` for clean structure. Two top-level sections: `ai` (sent to server with chat requests) and `ui` (consumed by frontend only, never sent to server).

```jsonc
{
  "$defs": {
    "anthropic": {
      "type": "object",
      "title": "Anthropic",
      "properties": {
        "model": {
          "type": "string",
          "title": "Model",
          "enum": [...ANTHROPIC_MODELS],  // injected at runtime
          "default": "claude-sonnet-4-5"
        }
      }
    },
    "ollama": {
      "type": "object",
      "title": "Ollama",
      "properties": {
        "model": {
          "type": "string",
          "title": "Model",
          "description": "Ollama model name (e.g. qwen3:8b, llama3).",
          "default": "llama3"
        },
        "host": {
          "type": "string",
          "title": "Host",
          "description": "URL of the Ollama server.",
          "default": "http://localhost:11434"
        },
        "think": {
          "type": "boolean",
          "title": "Thinking Mode",
          "description": "Enable extended thinking for models that support it (e.g. qwen3).",
          "default": true
        }
      }
    }
  },
  "type": "object",
  "properties": {
    "ai": {
      "type": "object",
      "title": "AI Assistant",
      "description": "Provider and model configuration for the chat agent.",
      "properties": {
        "provider": {
          "type": "string",
          "title": "Provider",
          "enum": ["anthropic", "ollama"],
          "default": "anthropic"
        },
        "anthropic": { "$ref": "#/$defs/anthropic" },
        "ollama": { "$ref": "#/$defs/ollama" }
      }
    },
    "ui": {
      "type": "object",
      "title": "Interface",
      "description": "Frontend preferences and feature flags.",
      "properties": {
        // future UI-only flags go here
      }
    }
  }
}
```

**formData** (nested, built from env vars):
```jsonc
{
  "ai": {
    "provider": "ollama",
    "anthropic": { "model": "claude-sonnet-4-5" },
    "ollama": { "model": "qwen3:8b", "host": "http://localhost:11434", "think": true }
  },
  "ui": {}
}
```

**uiSchema** controls rendering:
```jsonc
{
  "ai": {
    "provider": { "ui:widget": "radio" }
  }
}
```

**GET /api/settings** returns `{ schema, uiSchema, formData }`.

### 2. Server refactoring — `server/api/chat.ts`

- Export `ANTHROPIC_MODELS` array.
- New exported `resolveEnvDefaults(): Record<string, unknown>` — reads env vars into formData shape.
- Rename `resolveAdapter()` → `resolveAdapterFromSettings(settings)` — reads provider/model from settings object. API key always from `process.env`.
- POST handler: `const settings = { ...resolveEnvDefaults(), ...body.settings }`.

### 3. Persistence — `useLocalStorage` from `@uidotdev/usehooks`

Install: `pnpm add @uidotdev/usehooks`

No Zustand store needed. Two access patterns:

**In React (settings page):** `useLocalStorage("app-settings", {})` hook returns `[formData, setFormData]`.

**Outside React (chat context options function):** read `localStorage` directly:
```typescript
function getSettingsOverrides(): Record<string, unknown> {
  try {
    return JSON.parse(localStorage.getItem("app-settings") ?? "{}");
  } catch {
    return {};
  }
}
```

### 4. Chat context — `src/context/chat-context.tsx`

```typescript
connection: fetchServerSentEvents("/api/chat", () => {
  const settings = getSettingsOverrides();
  return Object.keys(settings).length > 0
    ? { body: { settings } }
    : {};
}),
```

### 5. Settings page — `src/routes/.../configuration/settings.tsx`

```typescript
function SettingsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useSettings();
  const [formData, setFormData] = useLocalStorage<Record<string, unknown>>("app-settings", {});

  if (isLoading || !data) return <Spinner />;

  // Merge: localStorage overrides on top of server defaults
  const mergedFormData = { ...data.formData, ...formData };

  return (
    <Box>
      <Heading>{t("settings.title")}</Heading>
      <Text>{t("settings.subtitle")}</Text>

      <SchemaForm
        schema={data.schema}
        uiSchema={data.uiSchema}
        formData={mergedFormData}
        onChange={(newData) => setFormData(newData)}
      >
        <Button type="button" onClick={() => setFormData({})}>
          {t("settings.resetDefaults")}
        </Button>
      </SchemaForm>
    </Box>
  );
}
```

No hand-coded fields. Schema changes on the server automatically appear in the UI.

### 6. Configuration index + i18n

Add settings card to `configuration/index.tsx`. Only page-level keys needed in `en-US.json` (field labels come from the schema):

```json
"settings": {
  "title": "AI Settings",
  "subtitle": "Configure the AI assistant provider and model.",
  "description": "AI provider, model, and related options.",
  "resetDefaults": "Reset to server defaults"
}
```

---

## Implementation Order

- [ ] 1. `pnpm add @uidotdev/usehooks`
- [ ] 2. `server/api/chat.ts` — export `ANTHROPIC_MODELS`, `resolveEnvDefaults()`; refactor `resolveAdapter` to accept settings
- [ ] 3. `server/api/settings.ts` + `server/index.ts` — schema + uiSchema + formData endpoint
- [ ] 4. `src/hooks/use-settings.ts` — React Query hook
- [ ] 5. `src/context/chat-context.tsx` — wire localStorage into chat body
- [ ] 6. `src/routes/.../configuration/settings.tsx` — SchemaForm page
- [ ] 7. `src/routes/.../configuration/index.tsx` — add card link
- [ ] 8. `src/locales/en-US.json` — page-level translations

---

## Verification

- [ ] `pnpm lint` + `npx vite build` — no errors
- [ ] `GET /api/settings` — returns `{ schema, uiSchema, formData }`
- [ ] `/workspace/configuration` — shows Ontology + Settings cards
- [ ] `/workspace/configuration/settings` — RJSF form renders with server defaults
- [ ] Change provider/model, refresh — settings persist (localStorage)
- [ ] Send chat message — server logs show overridden provider/model
- [ ] "Reset to server defaults" — clears localStorage, form shows env-var defaults
