import { resolveLocalSchemaReference } from "../json-schema-sharing.ts";
import type { McpOutputSchema, McpObjectInputSchema } from "../schema-codec.ts";

function schemaObject(value: unknown): value is McpOutputSchema {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function admitsLiteral(
  value: unknown,
  literal: string,
): value is McpOutputSchema &
  ({ readonly const: string } | { readonly enum: readonly unknown[] }) {
  if (!schemaObject(value)) return false;
  return (
    value.const === literal ||
    (Array.isArray(value.enum) && value.enum.includes(literal))
  );
}

/** Select canonical subject branches before emitting a named operation's schema. */
export function battleSubjectInputSchemaForCarriers(
  schema: McpObjectInputSchema,
  carriers: readonly string[],
  standardActions: readonly string[],
): McpObjectInputSchema & {
  readonly properties: McpOutputSchema & { readonly subject: McpOutputSchema };
} {
  const properties = schema.properties;
  if (!schemaObject(properties) || !schemaObject(properties.subject))
    throw new Error("Named Battle input must declare its subject schema.");
  const definitions = schemaObject(schema.$defs) ? schema.$defs : {};
  const selected = selectedSubjectBranches(
    properties.subject,
    definitions,
    carriers,
    standardActions,
  );
  const first = selected[0];
  if (first === undefined)
    throw new Error(
      `Named Battle operation has no canonical subject branches: ${carriers.join(", ")}`,
    );
  return {
    ...schema,
    properties: {
      ...properties,
      subject: selected.length === 1 ? first : { anyOf: selected },
    },
  };
}

function selectedSubjectBranches(
  schema: McpOutputSchema,
  definitions: McpOutputSchema,
  carriers: readonly string[],
  standardActions: readonly string[],
): readonly McpOutputSchema[] {
  const resolved = resolveLocalSchemaReference(schema, definitions);
  if (Array.isArray(resolved.anyOf)) {
    return resolved.anyOf.flatMap((branch) => {
      if (!schemaObject(branch))
        throw new Error("Invalid canonical Battle subject branch.");
      return selectedSubjectBranches(
        branch,
        definitions,
        carriers,
        standardActions,
      );
    });
  }
  const properties = resolvedProperties(resolved, definitions);
  return carriers.flatMap((key) => {
    const [tag, ...operationParts] = key.split(".");
    if (tag === undefined || !admitsLiteral(properties.tag, tag)) return [];
    const discriminator = ["command", "action", "option"].find(
      (field) => field in properties,
    );
    const operationProperty =
      discriminator === undefined
        ? {}
        : literalProperty(
            discriminator,
            properties[discriminator],
            operationParts[0],
          );
    if (operationProperty === undefined) return [];
    const standardActionProperty =
      "standardAction" in properties
        ? standardActionRestriction(properties.standardAction, standardActions)
        : {};
    const narrowedProperties = {
      ...properties,
      ...operationProperty,
      ...standardActionProperty,
      tag: { ...properties.tag, const: tag },
    };
    const mode = operationParts[discriminator === undefined ? 0 : 1];
    return selectedSubjectMode(
      resolved,
      narrowedProperties,
      properties.mode,
      definitions,
      mode,
    );
  });
}

function selectedSubjectMode(
  resolved: McpOutputSchema,
  narrowedProperties: McpOutputSchema,
  modeSchema: unknown,
  definitions: McpOutputSchema,
  mode: string | undefined,
): readonly McpOutputSchema[] {
  if (mode === undefined)
    return [{ ...resolved, properties: narrowedProperties }];
  if (!schemaObject(modeSchema))
    throw new Error("Compound Battle carrier must declare its mode.");
  const selectedModes = selectedModeBranches(modeSchema, definitions, mode);
  if (selectedModes.length === 0) return [];
  return [
    {
      ...resolved,
      properties: {
        ...narrowedProperties,
        mode:
          selectedModes.length === 1
            ? selectedModes[0]
            : { anyOf: selectedModes },
      },
    },
  ];
}

function selectedModeBranches(
  schema: McpOutputSchema,
  definitions: McpOutputSchema,
  mode: string,
): readonly McpOutputSchema[] {
  const resolved = resolveLocalSchemaReference(schema, definitions);
  if (Array.isArray(resolved.anyOf))
    return resolved.anyOf.flatMap((branch) => {
      if (!schemaObject(branch))
        throw new Error("Invalid canonical Battle subject mode.");
      return selectedModeBranches(branch, definitions, mode);
    });
  if (admitsLiteral(resolved, mode)) return [{ ...resolved, const: mode }];
  if (!schemaObject(resolved.properties)) return [];
  const properties = resolvedProperties(resolved, definitions);
  const tag = literalProperty("tag", properties.tag, mode);
  return tag === undefined
    ? []
    : [{ ...resolved, properties: { ...properties, ...tag } }];
}

function literalProperty(
  field: string,
  schema: unknown,
  literal: string | undefined,
): McpOutputSchema | undefined {
  return literal !== undefined && admitsLiteral(schema, literal)
    ? { [field]: { ...schema, const: literal } }
    : undefined;
}

function standardActionRestriction(
  schema: unknown,
  actions: readonly string[],
): McpOutputSchema {
  if (
    !schemaObject(schema) ||
    actions.length === 0 ||
    !actions.every((action) => admitsLiteral(schema, action))
  )
    throw new Error(
      "Named Stat Block bonus action must select canonical standardAction values.",
    );
  return { standardAction: { ...schema, enum: actions } };
}

function resolvedProperties(
  schema: McpOutputSchema,
  definitions: McpOutputSchema,
): McpOutputSchema {
  if (!schemaObject(schema.properties))
    throw new Error("Canonical Battle subject must declare its fields.");
  return Object.fromEntries(
    Object.entries(schema.properties).map(([field, value]) => {
      if (!schemaObject(value))
        throw new Error(
          `Canonical Battle subject must declare ${field}'s schema.`,
        );
      return [field, resolveLocalSchemaReference(value, definitions)];
    }),
  );
}
