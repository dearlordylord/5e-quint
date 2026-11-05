import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import type { DiceExpr } from "@dnd/surface/surface/types";
import {
  resolveLocalSchemaReference,
  jsonSchemaRecord as record,
  jsonSchemaAlternatives as alternatives,
} from "../json-schema-sharing.ts";
import type { McpOutputSchema } from "../schema-codec.ts";

export function diceGroupsValue<
  Group extends Pick<DiceExpr, "dice" | "dieSize">,
>(
  schema: McpOutputSchema,
  groups: readonly Group[],
  definitions: McpOutputSchema,
  description?: (group: Group) => string,
): McpOutputSchema {
  const value = resolveLocalSchemaReference(schema, definitions);
  const group = resolveLocalSchemaReference(record(value.items), definitions);
  const properties = record(group.properties);
  const results = resolveLocalSchemaReference(
    record(properties.results),
    definitions,
  );
  const die = resolveLocalSchemaReference(record(results.items), definitions);
  return {
    ...value,
    minItems: groups.length,
    maxItems: groups.length,
    prefixItems: groups.map((requested) => ({
      ...group,
      ...(description === undefined
        ? {}
        : { description: description(requested) }),
      properties: {
        ...properties,
        results: {
          ...results,
          minItems: requested.dice,
          maxItems: requested.dice,
          items: { ...die, minimum: 1, maximum: requested.dieSize },
        },
      },
    })),
    items: false,
  };
}

export function attackRollValue(
  schema: McpOutputSchema,
  mode: AttackRollMode,
  definitions: McpOutputSchema,
): McpOutputSchema {
  const value = resolveLocalSchemaReference(schema, definitions);
  const properties = record(value.properties);
  const tag = mode === "normal" ? "single" : "multiple";
  const rolls = alternatives(record(properties.d20TestRoll), definitions)
    .filter((roll) => {
      const discriminant = resolveLocalSchemaReference(
        record(record(roll.properties).tag),
        definitions,
      );
      return (
        discriminant.const === tag ||
        (Array.isArray(discriminant.enum) && discriminant.enum.includes(tag))
      );
    })
    .map((roll) => ({
      ...roll,
      properties: {
        ...record(roll.properties),
        ...(mode === "normal"
          ? {
              naturalD20: {
                ...record(record(roll.properties).naturalD20),
                minimum: 1,
                maximum: 20,
              },
            }
          : {
              first: {
                ...record(record(roll.properties).first),
                minimum: 1,
                maximum: 20,
              },
              second: {
                ...record(record(roll.properties).second),
                minimum: 1,
                maximum: 20,
              },
              rollMode: { const: mode },
            }),
      },
    }));
  if (rolls.length === 0)
    throw new Error(
      "The canonical attack roll must contain its requested roll form.",
    );
  return {
    ...value,
    properties: { ...properties, d20TestRoll: { anyOf: rolls } },
  };
}
