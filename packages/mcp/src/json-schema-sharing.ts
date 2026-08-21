import { createHash } from "node:crypto";

import type { McpOutputSchema } from "./schema-codec.ts";

const sharedSchemaBySource = new WeakMap<object, McpOutputSchema>();
const primitiveSchemaFingerprints = new Map<string, SchemaFingerprint>();
const SHARED_SCHEMA_MIN_BYTES = 512;
const SCHEMA_ARRAY_KEYS = new Set(["allOf", "anyOf", "oneOf"]);
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
  "else",
  "if",
  "items",
  "not",
  "propertyNames",
  "then",
]);

export function shareRepeatedSchemas(schema: McpOutputSchema): McpOutputSchema {
  const cached = sharedSchemaBySource.get(schema);
  if (cached !== undefined) return cached;
  const fingerprints = new WeakMap<object, SchemaFingerprint>();
  schemaFingerprint(schema, fingerprints);
  const occurrences = new Map<string, SchemaOccurrence>();
  visitSchemaChildren(schema, (child) => {
    const fingerprint = schemaFingerprint(child, fingerprints);
    if (fingerprint.bytes < SHARED_SCHEMA_MIN_BYTES) return;
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
    sharedSchemaBySource.set(schema, schema);
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
  sharedSchemaBySource.set(schema, shared);
  return shared;
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

function visitSchemaChildren(
  schema: McpOutputSchema,
  visit: (schema: McpOutputSchema) => void,
): void {
  visit(schema);
  for (const [key, value] of Object.entries(schema)) {
    if (SCHEMA_ARRAY_KEYS.has(key) && Array.isArray(value)) {
      for (const child of value) {
        if (isJsonObject(child)) visitSchemaChildren(child, visit);
      }
      continue;
    }
    if (SCHEMA_MAP_KEYS.has(key) && isJsonObject(value)) {
      for (const child of Object.values(value)) {
        if (isJsonObject(child)) visitSchemaChildren(child, visit);
      }
      continue;
    }
    if (SCHEMA_VALUE_KEYS.has(key) && isJsonObject(value)) {
      visitSchemaChildren(value, visit);
    }
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
