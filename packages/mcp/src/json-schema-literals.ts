import type { McpOutputSchema } from "./schema-codec.ts";
import { mapSchemaChildren } from "./json-schema-sharing.ts";

function literalImpliesType(type: unknown, value: unknown): boolean {
  if (typeof value === "number") return numericLiteralImpliesType(type, value);
  if (value === null) return type === "null";
  return (
    (type === "string" && typeof value === "string") ||
    (type === "boolean" && typeof value === "boolean")
  );
}

function numericLiteralImpliesType(type: unknown, value: number): boolean {
  return (
    (type === "number" && Number.isFinite(value)) ||
    (type === "integer" && Number.isInteger(value))
  );
}

function singleton(value: unknown): value is readonly [unknown] {
  return Array.isArray(value) && value.length === 1;
}

function definitionReferencesOnly(schema: McpOutputSchema): boolean {
  if (
    schema.$dynamicRef !== undefined ||
    (schema.$ref !== undefined &&
      (typeof schema.$ref !== "string" ||
        !/^#\/\$defs\/[^/%]+$/.test(schema.$ref)))
  )
    return false;
  let safe = true;
  mapSchemaChildren(schema, (child) => {
    safe = definitionReferencesOnly(child) && safe;
    return child;
  });
  return safe;
}

function simplifyLiterals(source: McpOutputSchema): McpOutputSchema {
  const schema = mapSchemaChildren(source, simplifyLiterals);
  const values = schema.enum;
  const literal: McpOutputSchema =
    singleton(values) && !("const" in schema)
      ? (() => {
          const { enum: _enum, ...constraints } = schema;
          return { ...constraints, const: values[0] };
        })()
      : schema;
  if (!("const" in literal) || !literalImpliesType(literal.type, literal.const))
    return literal;
  const { type: _type, ...constraints } = literal;
  return constraints;
}

/** Simplify isolated tool schemas whose references cannot address a removed keyword. */
export function simplifyLiteralSchemaConstraints(
  source: McpOutputSchema,
): McpOutputSchema {
  return definitionReferencesOnly(source) ? simplifyLiterals(source) : source;
}
