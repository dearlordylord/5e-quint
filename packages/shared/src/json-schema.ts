/**
 * Removes generated Effect `$id` annotations from nested JSON Schema nodes
 * while retaining the root metadata by default. Traversal follows
 * schema-valued keywords so data property names and annotation values are not
 * mistaken for schema metadata.
 */
export type StripNestedJsonSchemaIdsOptions = {
  readonly preserveRootId?: boolean;
};

const JSON_SCHEMA_MAP_KEYWORDS = [
  "$defs",
  "definitions",
  "dependentSchemas",
  "patternProperties",
  "properties",
] as const;

const JSON_SCHEMA_ARRAY_KEYWORDS = [
  "allOf",
  "anyOf",
  "oneOf",
  "prefixItems",
] as const;

const JSON_SCHEMA_VALUE_KEYWORDS = [
  "additionalItems",
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
] as const;

export function stripNestedJsonSchemaIds<T extends object>(
  value: T,
  options?: StripNestedJsonSchemaIdsOptions,
): T & Readonly<Record<string, unknown>>;
export function stripNestedJsonSchemaIds(
  value: unknown,
  options?: StripNestedJsonSchemaIdsOptions,
): unknown;
export function stripNestedJsonSchemaIds(
  value: unknown,
  options: StripNestedJsonSchemaIdsOptions = {},
): unknown {
  return stripSchema(value, options.preserveRootId ?? true);
}

function stripSchema(value: unknown, preserveRootId: boolean): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => stripSchema(entry, false));
  }
  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => preserveRootId || key !== "$id")
      .map(([key, entry]) => [key, stripSchemaKeywordValue(key, entry)]),
  );
}

function stripSchemaKeywordValue(key: string, value: unknown): unknown {
  if (isSchemaMapKeyword(key)) {
    if (!isRecord(value)) return value;
    return Object.fromEntries(
      Object.entries(value).map(([name, schema]) => [
        name,
        stripSchema(schema, false),
      ]),
    );
  }

  if (isSchemaArrayKeyword(key)) {
    return Array.isArray(value)
      ? value.map((schema) => stripSchema(schema, false))
      : value;
  }

  return isSchemaValueKeyword(key) ? stripSchema(value, false) : value;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSchemaMapKeyword(key: string): boolean {
  return JSON_SCHEMA_MAP_KEYWORDS.some((keyword) => keyword === key);
}

function isSchemaArrayKeyword(key: string): boolean {
  return JSON_SCHEMA_ARRAY_KEYWORDS.some((keyword) => keyword === key);
}

function isSchemaValueKeyword(key: string): boolean {
  return JSON_SCHEMA_VALUE_KEYWORDS.some((keyword) => keyword === key);
}
