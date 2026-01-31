# OpenAPI Specification Review

**File:** `.docs/openapi-bundle.yaml`
**Version:** OpenAPI 3.0.1 — HiveMQ Edge REST API 2025.19-SNAPSHOT
**Stats:** 8443 lines, 105 operations across 49 paths, 105 component schemas

---

## Executive Summary

The specification is functional but has significant quality issues: no security declarations despite JWT-based auth, widespread copy-paste errors in descriptions, inconsistent naming conventions, missing `required` fields on core schemas, and multiple undefined tags. The Data Hub section is noticeably better documented than the Edge-native management endpoints.

---

## 1. Security Declarations — MISSING ENTIRELY

**Severity: Critical**

The API implements JWT-based authentication (Bearer token), yet the spec contains:

- No `securitySchemes` under `components`
- No global `security` declaration
- No per-operation `security` annotations

This means:

- Generated SDKs cannot distinguish public from authenticated endpoints
- API documentation tools (Swagger UI, Redoc) show no auth requirements
- Clients must rely on runtime 401 responses to discover auth requirements

**Public endpoints** (determined empirically): `/api/v1/auth/*`, `/api/v1/health/*`, `/api/v1/frontend/*`, `GET /`
**Authenticated endpoints:** Everything else

See `.tasks/00002-openapi/API_AUTH.md` for the full breakdown.

---

## 2. Copy-Paste Errors in Descriptions

**Severity: High** — misleading documentation

| Endpoint | Issue |
| --- | --- |
| `POST /api/v1/auth/refresh-token` | Description says "Authorize the presented user to obtain a secure token" — copied from `authenticate`, should describe token refresh |
| `POST /api/v1/auth/validate-token` | Both summary AND description copied from `authenticate` — should describe token validation |
| `GET /api/v1/management/events` | Description says "Get all bridges configured in the system" — should say events |
| `GET /api/v1/management/events` (`limit` param) | Description says "Obtain all events since the specified epoch" — copied from the `since` param |
| `PUT .../behavior-validation/policies/{policyId}` (400 response) | Says "Behavior policy creation failed" — should say "update failed" |
| `PUT .../data-validation/policies/{policyId}` (400 response) | Says "Data policy creation failed" — should say "update failed" |
| `GET .../adapters/{adapterId}/status` (example) | Example shows `type: bridge` — should show adapter |
| `GET .../writing-schema/{adapterId}/{tagName}` (example) | Example shows domain tag data, not a writing schema |
| `POST .../pulse/asset-mappers` | Request body description says "The combiner to add" |
| `BehaviorPolicyNotFoundError.id` | Description says "The data policy id" — should say behavior policy id |
| `SchemaInsufficientStorageError` | Description says "The policy id" — should say schema id |
| `ScriptInsufficientStorageError` | Description says "The policy id" — should say script id |

---

## 3. Missing Descriptions and Titles

**Severity: Medium**

### 3.1 Schemas with no description (35 of 105)

Core entities missing descriptions: `UsernamePasswordCredentials`, `ApiBearerToken`, `Bridge`, `Adapter`, `HealthStatus`, `GatewayConfiguration`, `StatusTransitionCommand`, `StatusTransitionResult`, `ISA95ApiBean`, `AdapterConfig`, `TagSchema`, `DataPoint`, `PolicySchema`, `Script`, `PulseActivationToken`.

Most list wrapper schemas also lack descriptions: `BridgeList`, `EventList`, `StatusList`, `AdaptersList`, `NotificationList`, `ListenerList`, `CapabilityList`, `MetricList`, `TopicFilterList`, `PayloadSampleList`, `ProtocolAdaptersList`, `ValuesTree`, `EntityReferenceList`, `DataCombiningList`, `FsmStatesInformationListItem`.

### 3.2 Misleading "List of result items" description

15 schemas reuse the description `"List of result items that are returned by this endpoint"` as their own schema-level description. This is a copy-paste artifact from the `items` array description and does not describe the entity itself. Affected: `Capability`, `Extension`, `Module`, `Notification`, `Listener`, `Event`, `NorthboundMapping`, `SouthboundMapping`, `DomainTag`, `ObjectNode`, `ProtocolAdapter`, `PayloadSample`, `TopicFilter`, `Metric`, `FsmStateInformationItem`.

### 3.3 Endpoints with missing or empty summary/description

- `GET /` — no summary, no description, no tags, response is `*/*` with empty schema

---

## 4. Missing `required` Fields on Core Schemas

**Severity: Medium** — affects form validation and SDK type safety

| Schema | Fields that should likely be required |
| --- | --- |
| `UsernamePasswordCredentials` | `userName`, `password` |
| `ApiBearerToken` | `token` |
| `StatusTransitionCommand` | `command` |
| `Status` | `connection`, `runtime` (or at least `id`) |
| `Notification` | `title`, `level` |
| `Listener` | `hostName`, `port`, `name` |
| `HealthStatus` | `status` |
| `Capability` | `id` |
| `ProtocolAdapter` | `id`, `name` |
| `Adapter` | `type` (only `id` is required) |
| `Metric` | `name` |
| `DataPoint` | `value` |
| `ObjectNode` | `name`, `nodeType` |
| `FsmStateInformationItem` | `stateName`, `policyId` |

---

## 5. Inconsistent operationId Naming

**Severity: Medium** — affects generated SDK method names

Three conventions are mixed:

| Convention | Examples | Count |
| --- | --- | --- |
| camelCase | `getAllBehaviorPolicies`, `getBridges`, `addBridge`, `getAdapters` | ~40 |
| kebab-case | `refresh-token`, `get-capabilities`, `get-bridges-status`, `get-combiners` | ~50 |
| Mixed | `getCombinersById` (plural for single), `getBridgeByName` (says "Name", path says "Id") | ~5 |

The Data Hub endpoints consistently use camelCase. Edge-native management endpoints predominantly use kebab-case. Frontend/Gateway endpoints use kebab-case.

---

## 6. Inconsistent HTTP Status Codes

**Severity: Medium**

| Pattern | Data Hub endpoints | Edge management endpoints |
| --- | --- | --- |
| Create (POST) | `201 Created` with response body | `200 OK` with empty body |
| Delete (DELETE) | `204 No Content` | `200 OK` with empty body |
| Update (PUT) | `200 OK` with response body | `200 OK` with empty body |

Edge management endpoints (bridges, adapters, topic filters, combiners, pulse, UNS) never return the created/updated resource, making it impossible for clients to confirm the result without a follow-up GET.

---

## 7. Undefined Tags

**Severity: Low**

Four tags are used on endpoints but never defined in the top-level `tags:` section:

- `Authentication` — used alongside the defined `Authentication Endpoint`
- `Health Check Endpoint` — used on health endpoints, not defined at all
- `Metrics` — used alongside the defined `Metrics Endpoint`
- `Combiners` — used on combiner endpoints, not defined at all

---

## 8. Grammar and Typos

**Severity: Low**

| Location | Issue |
| --- | --- |
| `delete-adapter-domainTags` summary | "an domain" → "a domain" |
| `delete-topicFilter` summary | "an topic" → "a topic" |
| `getTagSchema` description | "portocol" → "protocol" |
| `getSchemaForTopic` summary | "based in" → "based on" |
| `getSamplesForTopic` summary | "their gathered" → "are gathered" |
| `getBehaviorPolicy` summary | "Get a  policy" (double space) |
| `get-listeners` summary | Trailing space: "configured  " |
| `getAdapter` description | Unmatched trailing quote |

---

## 9. Security Concerns in Schemas

**Severity: Medium**

Sensitive fields not marked as `writeOnly: true`:

- `TlsConfiguration.keystorePassword`
- `TlsConfiguration.privateKeyPassword`
- `TlsConfiguration.truststorePassword`
- `Bridge.password`
- `FirstUseInformation.prefillPassword`

These fields will appear in GET responses and generated types without any indication that they should not be displayed.

---

## 10. Structural Oddities

| Issue | Detail |
| --- | --- |
| **Pulse asset-mappers duplicate Combiners** | `/api/v1/management/pulse/asset-mappers/*` endpoints mirror `/api/v1/management/combiners/*` exactly, reusing `Combiner`, `CombinerList`, `DataCombiningList` schemas. Path params still use `combinerId` in the asset-mappers context. |
| **`JsonNode` is a catch-all** | Used for adapter configs, FSM definitions, tag definitions, writing schemas, protocol adapter config/ui schemas, and function specs. Its description ("The arguments of the fsm derived from the behavior policy") is specific to one use case. |
| **`GET /api/v1/data-hub/functions` deprecated** | Marked `deprecated: true` with replacement `/api/v1/data-hub/function-specs`, but no sunset timeline documented. |
| **Topic filter path param uses `$ref`** | The `{filter}` path parameter on topic-filter endpoints uses `$ref` to a shared parameter definition instead of inline — unusual but valid. |
| **`createSchema` has `If-Match` header** | Unusual for a POST/create operation; typically used for conditional updates. |
| **`set-isa95` uses POST** | Semantically this is a PUT (idempotent set/replace), not a POST. |
| **Naming: `AdaptersList` vs `BridgeList`** | Inconsistent pluralization — some list schemas use `*sList`, others `*List`. |

---

## 11. Summary Scorecard

| Aspect | Rating | Notes |
| --- | --- | --- |
| Completeness — endpoints | Good | 105 operations covering all product domains |
| Completeness — security | Missing | No security declarations at all |
| Completeness — descriptions | Poor | 35/105 schemas lack descriptions, 15 have copy-paste placeholder |
| Completeness — required fields | Poor | 27 schemas with no required fields, many clearly should have them |
| Correctness — descriptions | Poor | 12+ copy-paste errors producing misleading documentation |
| Consistency — naming | Poor | Three operationId conventions mixed, tag naming inconsistent |
| Consistency — HTTP semantics | Fair | Data Hub follows REST conventions; Edge management does not |
| Consistency — error handling | Good | Well-structured error hierarchy with discriminators |
| Schema quality — Data Hub | Good | Descriptions, required fields, proper status codes |
| Schema quality — Edge native | Poor | Missing descriptions, missing required, empty response bodies |
