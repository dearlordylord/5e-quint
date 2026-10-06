import { resolveLocalSchemaReference } from "../json-schema-sharing.ts";
import type { McpObjectInputSchema, McpOutputSchema } from "../schema-codec.ts";

function schemaObject(value: unknown): value is McpOutputSchema {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function schemaProperties(schema: McpOutputSchema): McpOutputSchema {
  if (!schemaObject(schema.properties))
    throw new Error("Generated Battle fill must declare fields.");
  return schema.properties;
}
function schemaField(schema: McpOutputSchema, field: string): McpOutputSchema {
  const properties = schemaProperties(schema);
  if (!schemaObject(properties) || !schemaObject(properties[field]))
    throw new Error(`Generated Battle fill must declare ${field}.`);
  return properties[field];
}
function alternatives(
  schema: McpOutputSchema,
  definitions: McpOutputSchema,
): readonly McpOutputSchema[] {
  const resolved = resolveLocalSchemaReference(schema, definitions);
  if (!Array.isArray(resolved.anyOf)) return [resolved];
  return resolved.anyOf.flatMap((branch) => {
    if (!schemaObject(branch))
      throw new Error("Invalid generated Battle fill branch.");
    return alternatives(branch, definitions);
  });
}
function literalValues(
  source: McpOutputSchema,
  definitions: McpOutputSchema,
): readonly string[] {
  const schema = resolveLocalSchemaReference(source, definitions);
  if (typeof schema.const === "string") return [schema.const];
  if (
    Array.isArray(schema.enum) &&
    schema.enum.every((value): value is string => typeof value === "string")
  )
    return schema.enum;
  throw new Error(
    "Generated Battle fill discriminants must declare their string values.",
  );
}
function kindIs(
  schema: McpOutputSchema,
  kind: string,
  definitions: McpOutputSchema,
): boolean {
  return literalValues(schemaField(schema, "kind"), definitions).includes(kind);
}

export function battleFillInputSchemaForOperation(
  schema: McpObjectInputSchema,
  input: {
    readonly ordinaryAllowed: boolean;
    readonly reactionChoices: readonly string[];
    readonly modifierKinds: readonly string[];
    readonly declineAllowed: boolean;
  },
): McpObjectInputSchema {
  const properties = schema.properties;
  if (!schemaObject(properties))
    throw new Error("Generated Battle input must declare fields.");
  const definitions = schemaObject(schema.$defs) ? schema.$defs : {};
  const fills = alternatives(schemaField(schema, "fill"), definitions);
  const ordinary = fills.filter(
    (branch) => !kindIs(branch, "interruptDecision", definitions),
  );
  const ordinaryDefinitionName = "ChatGptOrdinaryFill";
  if (ordinaryDefinitionName in definitions)
    throw new Error("Generated ordinary-fill definition already exists.");
  const ordinaryReference = { $ref: `#/$defs/${ordinaryDefinitionName}` };
  const reaction = fills
    .filter((branch) => kindIs(branch, "interruptDecision", definitions))
    .flatMap((branch) => {
      const values = alternatives(
        schemaField(branch, "value"),
        definitions,
      ).flatMap((value) => {
        if (kindIs(value, "decline", definitions))
          return input.declineAllowed ? [value] : [];
        if (!kindIs(value, "resolve", definitions))
          throw new Error("Unaccounted Battle interrupt decision branch.");
        const choices = alternatives(
          schemaField(value, "choice"),
          definitions,
        ).flatMap((choice) => {
          const admittedKinds = literalValues(
            schemaField(choice, "kind"),
            definitions,
          ).filter((kind) => input.reactionChoices.includes(kind));
          if (admittedKinds.length === 0) return [];
          const choiceProperties = choice.properties;
          if (!schemaObject(choiceProperties))
            throw new Error("Generated Reaction choice must declare fields.");
          const modifiers = admittedKinds.includes(
            "reactionRollOrDamageReduction",
          )
            ? {
                modifierKind: {
                  ...schemaField(choice, "modifierKind"),
                  enum: input.modifierKinds,
                },
              }
            : {};
          const fillsSchema = resolveLocalSchemaReference(
            schemaField(choice, "fills"),
            definitions,
          );
          return [
            {
              ...choice,
              properties: {
                ...choiceProperties,
                kind: { ...schemaField(choice, "kind"), enum: admittedKinds },
                ...modifiers,
                fills: { ...fillsSchema, items: false, maxItems: 0 },
              },
            },
          ];
        });
        return choices.length === 0
          ? []
          : [
              {
                ...value,
                properties: {
                  ...schemaProperties(value),
                  choice: { anyOf: choices },
                },
              },
            ];
      });
      return values.length === 0
        ? []
        : [
            {
              ...branch,
              properties: {
                ...schemaProperties(branch),
                value: { anyOf: values },
              },
            },
          ];
    });
  const selected = [
    ...(input.ordinaryAllowed ? [ordinaryReference] : []),
    ...reaction,
  ];
  if (selected.length === 0)
    throw new Error("Named Battle operation has no admitted fill branches.");
  return {
    ...schema,
    properties: { ...properties, fill: { anyOf: selected } },
    $defs: { ...definitions, [ordinaryDefinitionName]: { anyOf: ordinary } },
  };
}
