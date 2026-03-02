import type { RJSFSchema } from "@rjsf/utils";
import * as allSchemas from "@/api/schemas.gen";

const REF_PREFIX = "#/components/schemas/";
const DEF_PREFIX = "#/definitions/";

/**
 * Lookup map: OpenAPI schema name → generated schema object.
 * Built once from the barrel export of schemas.gen.ts.
 * e.g. "LocalBridgeSubscription" → LocalBridgeSubscriptionSchema
 */
const schemaMap: Record<string, RJSFSchema> = {};
for (const [key, value] of Object.entries(allSchemas)) {
  if (key.endsWith("Schema") && typeof value === "object" && value !== null) {
    schemaMap[key.slice(0, -"Schema".length)] = value as RJSFSchema;
  }
}

/**
 * Walk a schema tree, collect all `$ref` names pointing to
 * `#/components/schemas/<Name>`, and rewrite them to `#/definitions/<Name>`.
 */
function collectRefs(
  obj: unknown,
  collected: Map<string, RJSFSchema>,
): unknown {
  if (obj === null || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => collectRefs(item, collected));
  }

  const record = obj as Record<string, unknown>;

  // Handle $ref pointer
  if (
    typeof record["$ref"] === "string" &&
    record["$ref"].startsWith(REF_PREFIX)
  ) {
    const name = record["$ref"].slice(REF_PREFIX.length);
    const resolved = schemaMap[name];
    if (resolved && !collected.has(name)) {
      collected.set(name, resolved);
      // Recurse into the resolved schema to find nested refs
      collectRefs(resolved, collected);
    }
    return { ...record, $ref: `${DEF_PREFIX}${name}` };
  }

  // Recurse into all values
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    result[key] = collectRefs(value, collected);
  }
  return result;
}

/**
 * Resolve OpenAPI-style `$ref` pointers in a schema so RJSF can render them.
 *
 * Rewrites `#/components/schemas/<Name>` → `#/definitions/<Name>` and injects
 * a `definitions` block at the schema root with the referenced schemas.
 * Handles nested refs recursively.
 *
 * Returns the original schema unchanged if no `$ref` pointers are found.
 */
export function resolveSchemaRefs(schema: RJSFSchema): RJSFSchema {
  const collected = new Map<string, RJSFSchema>();
  const rewritten = collectRefs(schema, collected) as RJSFSchema;

  if (collected.size === 0) return schema;

  // Build definitions, rewriting refs inside them too
  const definitions: Record<string, unknown> = {};
  for (const [name, def] of collected) {
    definitions[name] = collectRefs(def, collected);
  }

  return { ...rewritten, definitions } as RJSFSchema;
}
