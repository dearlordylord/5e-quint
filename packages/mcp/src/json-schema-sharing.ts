import { createHash } from "node:crypto";

import type { McpOutputSchema } from "./schema-codec.ts";

const sharedSchemaBySource = new WeakMap<
  object,
  Map<number, McpOutputSchema>
>();
const primitiveSchemaFingerprints = new Map<string, SchemaFingerprint>();
const SHARED_SCHEMA_MIN_BYTES = 512;
const TOOL_SCHEMA_SHARED_SCHEMA_MIN_BYTES = 32;
const SCHEMA_ARRAY_KEYS = new Set([
  "allOf",
  "anyOf",
  "oneOf",
  "prefixItems",
  "items",
]);
const SCHEMA_MAP_KEYS = new Set([
  "$defs",
  "definitions",
  "dependentSchemas",
  "patternProperties",
  "properties",
]);
const SCHEMA_VALUE_KEYS = new Set([
  "additionalProperties",
  "contains",
  "contentSchema",
  "else",
  "if",
  "items",
  "not",
  "propertyNames",
  "then",
  "unevaluatedItems",
  "unevaluatedProperties",
]);

export function shareRepeatedSchemas(
  schema: McpOutputSchema,
  minimumDefinitionBytes: number = SHARED_SCHEMA_MIN_BYTES,
): McpOutputSchema {
  const cached = sharedSchemaBySource.get(schema)?.get(minimumDefinitionBytes);
  if (cached !== undefined) return cached;
  const fingerprints = new WeakMap<object, SchemaFingerprint>();
  schemaFingerprint(schema, fingerprints);
  const occurrences = new Map<string, SchemaOccurrence>();
  visitSchemaChildren(schema, (child) => {
    const fingerprint = schemaFingerprint(child, fingerprints);
    if (fingerprint.bytes < minimumDefinitionBytes) return;
    const occurrence = occurrences.get(fingerprint.hash);
    if (occurrence === undefined) {
      occurrences.set(fingerprint.hash, {
        exemplar: child,
        count: 1,
      });
    } else {
      occurrence.count += 1;
    }
  });
  const repeated = [...occurrences.entries()].filter(
    ([, occurrence]) => occurrence.count > 1,
  );
  if (repeated.length === 0) {
    cacheSharedSchema(schema, minimumDefinitionBytes, schema);
    return schema;
  }

  const definitionNameByHash = new Map(
    repeated.map(([hash]) => [hash, `Shared_${hash.slice(0, 16)}`]),
  );
  const sharedDefinitions = Object.fromEntries(
    repeated.map(([hash, occurrence]) => {
      const definitionName = definitionNameByHash.get(hash);
      if (definitionName === undefined) {
        throw new Error("Repeated schema definition name was not generated.");
      }
      return [
        definitionName,
        rewriteSchemaChildren(
          occurrence.exemplar,
          definitionNameByHash,
          fingerprints,
        ),
      ];
    }),
  );
  const rewrittenSchema = rewriteSchemaChildren(
    schema,
    definitionNameByHash,
    fingerprints,
  );
  const existingDefinitions = isJsonObject(rewrittenSchema.$defs)
    ? rewrittenSchema.$defs
    : {};
  const shared = {
    ...rewrittenSchema,
    $defs: { ...existingDefinitions, ...sharedDefinitions },
  };
  cacheSharedSchema(schema, minimumDefinitionBytes, shared);
  return shared;
}

function cacheSharedSchema(
  source: McpOutputSchema,
  minimumBytes: number,
  shared: McpOutputSchema,
): void {
  const variants =
    sharedSchemaBySource.get(source) ?? new Map<number, McpOutputSchema>();
  variants.set(minimumBytes, shared);
  sharedSchemaBySource.set(source, variants);
}

/** Local aliases have no public identity; shorten them without changing any constraint. */
export function shareToolSchemaDefinitions(
  schema: McpOutputSchema,
): McpOutputSchema {
  const shared = shareRepeatedSchemas(
    schema,
    TOOL_SCHEMA_SHARED_SCHEMA_MIN_BYTES,
  );
  if (!isJsonObject(shared.$defs)) return shared;
  const aliases = new Map(
    Object.keys(shared.$defs)
      .sort()
      .map((name, ordinal) => [name, `d${ordinal.toString(36)}`]),
  );
  const definitions = Object.fromEntries(
    Object.entries(shared.$defs).map(([name, value]) => [
      aliases.get(name) ?? name,
      value,
    ]),
  );
  return rewriteLocalReferences({ ...shared, $defs: definitions }, aliases);
}

function rewriteLocalReferences(
  schema: McpOutputSchema,
  aliases: ReadonlyMap<string, string>,
): McpOutputSchema {
  const rewritten = mapSchemaChildren(schema, (child) =>
    rewriteLocalReferences(child, aliases),
  );
  return typeof schema.$ref === "string" && schema.$ref.startsWith("#/$defs/")
    ? { ...rewritten, $ref: aliasedLocalReference(schema.$ref, aliases) }
    : rewritten;
}

function aliasedLocalReference(
  reference: string,
  aliases: ReadonlyMap<string, string>,
): string {
  const [encodedName = "", ...path] = reference
    .slice("#/$defs/".length)
    .split("/");
  const name = encodedName.replaceAll("~1", "/").replaceAll("~0", "~");
  const alias = aliases.get(name);
  return alias === undefined
    ? reference
    : `#/$defs/${alias}${path.length === 0 ? "" : `/${path.join("/")}`}`;
}

export function resolveLocalSchemaReference(
  schema: McpOutputSchema,
  definitions: McpOutputSchema,
  ancestors: ReadonlySet<string> = new Set(),
): McpOutputSchema {
  if (typeof schema.$ref !== "string") return schema;
  if (!schema.$ref.startsWith("#/$defs/"))
    throw new Error(
      "Generated Battle schemas require local definition references.",
    );
  const name = schema.$ref
    .slice("#/$defs/".length)
    .replaceAll("~1", "/")
    .replaceAll("~0", "~");
  const target = definitions[name];
  if (!isJsonObject(target))
    throw new Error(`Missing generated schema definition: ${name}`);
  if (ancestors.has(name))
    throw new Error(`Recursive subject or fill branch definition: ${name}`);
  return resolveLocalSchemaReference(
    target,
    definitions,
    new Set([...ancestors, name]),
  );
}

type SchemaOccurrence = {
  readonly exemplar: McpOutputSchema;
  count: number;
};

type SchemaFingerprint = {
  readonly bytes: number;
  readonly hash: string;
};

function schemaFingerprint(
  value: unknown,
  fingerprints: WeakMap<object, SchemaFingerprint>,
): SchemaFingerprint {
  if (!isJsonObject(value) && !Array.isArray(value)) {
    const serialized = JSON.stringify(value) ?? String(value);
    const key = `${typeof value}:${serialized}`;
    const cached = primitiveSchemaFingerprints.get(key);
    if (cached !== undefined) return cached;
    const fingerprint = {
      bytes: serialized.length,
      hash: createHash("sha256").update(key).digest("hex"),
    };
    primitiveSchemaFingerprints.set(key, fingerprint);
    return fingerprint;
  }
  const cached = fingerprints.get(value);
  if (cached !== undefined) return cached;
  if (Array.isArray(value)) {
    const children = value.map((child) =>
      schemaFingerprint(child, fingerprints),
    );
    const fingerprint = {
      bytes:
        2 +
        Math.max(0, children.length - 1) +
        children.reduce((sum, child) => sum + child.bytes, 0),
      hash: createHash("sha256")
        .update(`array:${children.map((child) => child.hash).join(":")}`)
        .digest("hex"),
    };
    fingerprints.set(value, fingerprint);
    return fingerprint;
  }

  const entries = Object.entries(value).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  const children = entries.map(([key, child]) => ({
    key,
    fingerprint: schemaFingerprint(child, fingerprints),
  }));
  const fingerprint = {
    bytes:
      2 +
      Math.max(0, children.length - 1) +
      children.reduce(
        (sum, child) =>
          sum + JSON.stringify(child.key).length + 1 + child.fingerprint.bytes,
        0,
      ),
    hash: createHash("sha256")
      .update(
        `object:${children
          .map(
            (child) => `${JSON.stringify(child.key)}:${child.fingerprint.hash}`,
          )
          .join(":")}`,
      )
      .digest("hex"),
  };
  fingerprints.set(value, fingerprint);
  return fingerprint;
}

/** Visit schema nodes and their pointer segments, excluding instance data. */
export function visitSchemaChildren(
  schema: McpOutputSchema,
  visit: (schema: McpOutputSchema, path: readonly string[]) => void,
  path: readonly string[] = [],
): void {
  visit(schema, path);
  for (const [key, value] of Object.entries(schema)) {
    if (SCHEMA_ARRAY_KEYS.has(key) && Array.isArray(value)) {
      visitSchemaArray(value, visit, [...path, key]);
      continue;
    }
    if (SCHEMA_MAP_KEYS.has(key) && isJsonObject(value)) {
      visitSchemaMap(value, visit, [...path, key]);
      continue;
    }
    if (isSchemaValueProperty(key, value)) {
      visitSchemaChildren(value, visit, [...path, key]);
    }
  }
}

function isSchemaValueProperty(
  key: string,
  value: unknown,
): value is McpOutputSchema {
  return SCHEMA_VALUE_KEYS.has(key) && isJsonObject(value);
}

function visitSchemaArray(
  children: readonly unknown[],
  visit: (schema: McpOutputSchema, path: readonly string[]) => void,
  path: readonly string[],
): void {
  for (const [index, child] of children.entries()) {
    if (isJsonObject(child))
      visitSchemaChildren(child, visit, [...path, String(index)]);
  }
}

function visitSchemaMap(
  children: McpOutputSchema,
  visit: (schema: McpOutputSchema, path: readonly string[]) => void,
  path: readonly string[],
): void {
  for (const [name, child] of Object.entries(children)) {
    if (isJsonObject(child)) visitSchemaChildren(child, visit, [...path, name]);
  }
}

function rewriteSchemaChildren(
  schema: McpOutputSchema,
  definitionNameByHash: ReadonlyMap<string, string>,
  fingerprints: WeakMap<object, SchemaFingerprint>,
): McpOutputSchema {
  return Object.fromEntries(
    Object.entries(schema).map(([key, value]) => {
      if (SCHEMA_ARRAY_KEYS.has(key) && Array.isArray(value)) {
        return [key, value.map((child) => rewriteSchema(child))];
      }
      if (SCHEMA_MAP_KEYS.has(key) && isJsonObject(value)) {
        return [
          key,
          Object.fromEntries(
            Object.entries(value).map(([name, child]) => [
              name,
              rewriteSchema(child),
            ]),
          ),
        ];
      }
      if (SCHEMA_VALUE_KEYS.has(key) && isJsonObject(value)) {
        return [key, rewriteSchema(value)];
      }
      return [key, value];
    }),
  );

  function rewriteSchema(value: unknown): unknown {
    if (!isJsonObject(value)) return value;
    const definitionName = definitionNameByHash.get(
      schemaFingerprint(value, fingerprints).hash,
    );
    return definitionName === undefined
      ? rewriteSchemaChildren(value, definitionNameByHash, fingerprints)
      : { $ref: `#/$defs/${definitionName}` };
  }
}

function isJsonObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Visit schema positions while preserving instance data such as const and examples. */
export function mapSchemaChildren(
  schema: McpOutputSchema,
  transform: (child: McpOutputSchema) => McpOutputSchema,
): McpOutputSchema {
  const child = (value: unknown) =>
    isJsonObject(value) ? transform(value) : value;
  return Object.fromEntries(
    Object.entries(schema).map(([key, value]) => {
      if (SCHEMA_ARRAY_KEYS.has(key) && Array.isArray(value))
        return [key, value.map(child)];
      if (SCHEMA_MAP_KEYS.has(key) && isJsonObject(value))
        return [
          key,
          Object.fromEntries(
            Object.entries(value).map(([name, value]) => [name, child(value)]),
          ),
        ];
      if (SCHEMA_VALUE_KEYS.has(key)) return [key, child(value)];
      return [key, value];
    }),
  );
}
