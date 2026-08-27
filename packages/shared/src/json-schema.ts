/**
 * Removes generated Effect `$id` annotations below a JSON Schema root while
 * retaining the root metadata. Effect reuses the same built-in ids for many
 * nested schemas, which is not valid when a document is compiled as one graph.
 */
export function stripNestedJsonSchemaIds<T extends object>(
  value: T,
): T & Readonly<Record<string, unknown>>;
export function stripNestedJsonSchemaIds(value: unknown): unknown;
export function stripNestedJsonSchemaIds(value: unknown): unknown {
  return stripIds(value, true);
}

function stripIds(value: unknown, preserveRoot: boolean): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => stripIds(entry, false));
  }
  if (typeof value !== "object" || value === null) return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => preserveRoot || key !== "$id")
      .map(([key, entry]) => [key, stripIds(entry, false)]),
  );
}
