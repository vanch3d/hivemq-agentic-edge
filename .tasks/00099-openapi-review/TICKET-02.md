# OPENAPI-02: Type Data Hub Policy Domain Objects

**Epic:** [OpenAPI Specification Quality & Agentic Readiness](./EPIC.md)
**Priority:** P0 Critical
**Type:** Type Safety
**Review sections:** 11, 12, 13, 14, 15

## Problem

The three most important Data Hub schemas — `PolicyOperation`, `DataPolicyValidator`, and `BehaviorPolicyBehavior` — all use `type: object` for their `arguments` fields and free-form strings for their discriminator fields (`functionId`, `type`, `id`). The actual domain types are well-defined in the product but invisible in the spec.

An LLM or SDK consumer given only this spec cannot:

- Know which function IDs are valid
- Construct correct arguments for any function
- Know which behavior models exist or what their FSM states are
- Build a valid validation strategy

## Scope

### 5 items — Add enums, discriminated unions, and typed argument schemas

1. **`PolicyOperation.functionId`** — add `enum` with the 9 known functions: `System.log`, `Metrics.Counter.increment`, `Mqtt.UserProperties.add`, `Serdes.deserialize`, `Serdes.serialize`, `Delivery.redirectTo`, `Mqtt.drop`, `Mqtt.disconnect`. Add a description noting that `fn:com.hivemq.modules.*` IDs are also valid for custom module functions.

2. **`PolicyOperation.arguments`** — replace `type: object` with a `oneOf` discriminated by `functionId`, defining per-function argument schemas:
   - `System.log`: `level` (enum: DEBUG, ERROR, WARN, INFO, TRACE, required), `message` (string, required, supports interpolation)
   - `Metrics.Counter.increment`: `metricName` (string, required), `incrementBy` (number, required)
   - `Mqtt.UserProperties.add`: `name` (string, required), `value` (string, required)
   - `Serdes.deserialize` / `Serdes.serialize`: `schemaId` (string, required), `schemaVersion` (string, required)
   - `Delivery.redirectTo`: `topic` (string, required, supports interpolation), `applyPolicies` (boolean, optional)
   - `Mqtt.drop`: `reasonString` (string, optional)
   - `Mqtt.disconnect`: no arguments

   Add descriptions noting terminal vs. non-terminal functions, data-policy-only restrictions, and pipeline ordering rules (deserialize before serialize).

3. **`DataPolicyValidator.arguments`** — replace `type: object` with a typed schema for the `SCHEMA` validator type:

   ```yaml
   properties:
     strategy:
       type: string
       enum: [ALL_OF, ANY_OF]
       description: "ALL_OF requires all schemas to pass; ANY_OF requires at least one."
     schemas:
       type: array
       items:
         $ref: "#/components/schemas/SchemaReference"
   required: [strategy, schemas]
   ```

   Note: `SchemaReference` already exists in the spec (used in `BehaviorPolicyDeserializer`) — reuse it.

4. **`BehaviorPolicyBehavior.id`** — add `enum` with the 3 known models: `Mqtt.events`, `Publish.duplicate`, `Publish.quota`. Define per-model argument schemas:
   - `Mqtt.events`: no arguments
   - `Publish.duplicate`: no arguments
   - `Publish.quota`: `minPublishes` (integer, default 0), `maxPublishes` (integer, default unlimited). At least one must be present.

5. **`BehaviorPolicyOnTransition.fromState` / `toState`** — add descriptions documenting valid states per behavior model, and document wildcard patterns (`Any.*`, `Any.Success`, `Any.Failed`). Consider adding per-model state enums or at minimum include the state machines in the description:
   - `Mqtt.events`: Initial → Connected → Disconnected
   - `Publish.duplicate`: Initial → Connected → NotDuplicated ↔ Duplicated → Violated | Disconnected
   - `Publish.quota`: Initial → Connected → Publishing → Violated | Disconnected

6. **`PolicySchema.type`** — add `enum: [JSON, PROTOBUF]`.
