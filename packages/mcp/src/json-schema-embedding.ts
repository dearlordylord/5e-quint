import type { McpOutputSchema } from "./schema-codec.ts";

export function embeddedSchema(
  schema: McpOutputSchema,
  definitionNamespace: string,
): {
  readonly schema: McpOutputSchema;
  readonly definitions: Readonly<Record<string, unknown>>;
} {
  const rootDefinitions = isJsonObject(schema.$defs) ? schema.$defs : {};
  const body = Object.fromEntries(
    Object.entries(schema).filter(([key]) => key !== "$id" && key !== "$defs"),
  );
  return {
    schema: rewriteDefinitionReferences(body, definitionNamespace),
    definitions: Object.fromEntries(
      Object.entries(rootDefinitions).map(([name, definition]) => [
        `${definitionNamespace}_${name}`,
        rewriteDefinitionReferences(definition, definitionNamespace),
      ]),
    ),
  };
}

function rewriteDefinitionReferences(
  value: McpOutputSchema,
  definitionNamespace: string,
): McpOutputSchema;
function rewriteDefinitionReferences(
  value: unknown,
  definitionNamespace: string,
): unknown;
function rewriteDefinitionReferences(
  value: unknown,
  definitionNamespace: string,
): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) =>
      rewriteDefinitionReferences(entry, definitionNamespace),
    );
  }
  if (!isJsonObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "$id")
      .map(([key, entry]) => [
        key,
        key === "$ref" &&
        typeof entry === "string" &&
        entry.startsWith("#/$defs/")
          ? `#/$defs/${definitionNamespace}_${entry.slice("#/$defs/".length)}`
          : rewriteDefinitionReferences(entry, definitionNamespace),
      ]),
  );
}

function isJsonObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
