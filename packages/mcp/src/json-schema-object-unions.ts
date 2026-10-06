import type { McpOutputSchema } from "./schema-codec.ts";
import { mapSchemaChildren } from "./json-schema-sharing.ts";

function object(value: unknown): value is McpOutputSchema {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function strings(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  );
}
const OBJECT_CONSTRAINTS = new Set([
  "type",
  "properties",
  "required",
  "additionalProperties",
]);

/** Factor common conjunctions out of an anyOf, keeping each branch's closed property set. */
export function factorObjectUnionConstraints(
  source: McpOutputSchema,
): McpOutputSchema {
  const schema = mapSchemaChildren(source, factorObjectUnionConstraints);
  if (
    Object.keys(schema).length !== 1 ||
    !Array.isArray(schema.anyOf) ||
    schema.anyOf.length < 2
  )
    return schema;
  const branches = schema.anyOf;
  if (
    !branches.every(
      (
        branch,
      ): branch is McpOutputSchema & {
        properties: McpOutputSchema;
        required: readonly string[];
      } =>
        object(branch) &&
        branch.type === "object" &&
        branch.additionalProperties === false &&
        object(branch.properties) &&
        strings(branch.required) &&
        Object.keys(branch).every((key) => OBJECT_CONSTRAINTS.has(key)),
    )
  )
    return schema;
  const first = branches[0];
  if (!first) return schema;
  const commonFields = Object.keys(first.properties).filter((field) =>
    branches.every(
      (branch) =>
        JSON.stringify(branch.properties[field]) ===
        JSON.stringify(first.properties[field]),
    ),
  );
  const commonRequired = first.required.filter((field) =>
    branches.every((branch) => branch.required.includes(field)),
  );
  const candidate = {
    type: "object",
    properties: Object.fromEntries(
      commonFields.map((field) => [field, first.properties[field]]),
    ),
    ...(commonRequired.length === 0 ? {} : { required: commonRequired }),
    anyOf: branches.map((branch) => {
      const remainingRequired = branch.required.filter(
        (field) => !commonRequired.includes(field),
      );
      return {
        properties: Object.fromEntries(
          Object.entries(branch.properties).map(([field, constraint]) => [
            field,
            commonFields.includes(field) ? {} : constraint,
          ]),
        ),
        ...(remainingRequired.length === 0
          ? {}
          : { required: remainingRequired }),
        additionalProperties: false,
      };
    }),
  };
  return Buffer.byteLength(JSON.stringify(candidate)) <
    Buffer.byteLength(JSON.stringify(schema))
    ? candidate
    : schema;
}
