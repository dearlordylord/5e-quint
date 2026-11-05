import {
  BattleFillSchema,
  BattleHoleIdSchema,
  ALLOCATED_SPELL_DAMAGE_CHOICE_REJECTION_PRIORITY,
  type BattleHole,
  type BattleAllocatedSpellDamageRollHole,
} from "@dnd/battle-runtime";
import { Schema } from "effect";
import {
  resolveLocalSchemaReference,
  isJsonSchemaObject as schemaObject,
  jsonSchemaRecord as record,
  jsonSchemaAlternatives as alternatives,
  jsonSchemaHasKind as hasKind,
} from "../json-schema-sharing.ts";
import { targetInputSchemas } from "./battle-target-input-schema.ts";
import {
  mcpOutputJsonSchema,
  omitUnreferencedDefinitions,
  type McpOutputSchema,
} from "../schema-codec.ts";
import { battleAreaInputInstructions } from "./battle-area-input-instructions.ts";

export const BattleInputGuidanceSchema = Schema.Struct({
  holeId: BattleHoleIdSchema,
  valuePath: Schema.Literal("fill"),
  fillSchema: Schema.Record(Schema.String, Schema.Unknown),
  instructions: Schema.Array(Schema.String),
});

function isAllocatedSpellDamageRollHole(
  hole: BattleHole,
): hole is BattleAllocatedSpellDamageRollHole {
  return (
    hole.kind === "rolledDice" &&
    "allocatedDamageDice" in hole &&
    hole.allocatedDamageDice !== undefined
  );
}
function requestedValue(
  schema: McpOutputSchema,
  hole: BattleHole,
  definitions: McpOutputSchema,
): McpOutputSchema {
  if (isAllocatedSpellDamageRollHole(hole))
    return allocatedDamageDiceValue(
      schema,
      hole.allocatedDamageDice,
      definitions,
    );
  if (
    hole.kind !== "savingThrowOutcome" ||
    !("areaInput" in hole) ||
    hole.areaInput === undefined
  )
    return schema;
  const areaKind = hole.areaInput.kind;
  const values = alternatives(schema, definitions).filter(
    (branch) =>
      schemaObject(branch.properties) && schemaObject(branch.properties.area),
  );
  const narrowed = values.map((branch) => {
    const properties = record(branch.properties);
    const areas = alternatives(record(properties.area), definitions).filter(
      (area) =>
        areaKind === "areaMembership"
          ? !schemaObject(record(area.properties).kind) &&
            !("stagedConditionAutomaticSuccessFacts" in record(area.properties))
          : areaKind === "stagedConditionAreaMembership"
            ? !schemaObject(record(area.properties).kind)
            : hasKind(area, areaKind, definitions),
    );
    if (areas.length === 0)
      throw new Error(
        "The canonical fill must contain its requested area kind.",
      );
    return { ...branch, properties: { ...properties, area: { anyOf: areas } } };
  });
  if (narrowed.length === 0)
    throw new Error(
      "The canonical save fill must contain the requested area value.",
    );
  return { anyOf: narrowed };
}

function allocatedDamageDiceValue(
  schema: McpOutputSchema,
  request: BattleAllocatedSpellDamageRollHole["allocatedDamageDice"],
  definitions: McpOutputSchema,
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
    minItems: request.groups.length,
    maxItems: request.groups.length,
    prefixItems: request.groups.map(({ targetId, dice, dieSize }) => ({
      ...group,
      description: `Damage dice for allocated target ${targetId}.`,
      properties: {
        ...properties,
        results: {
          ...results,
          minItems: dice,
          maxItems: dice,
          items: { ...die, minimum: 1, maximum: dieSize },
        },
      },
    })),
    items: false,
  };
}

export function battleInputGuidance(hole: BattleHole) {
  if (hole.kind === "interruptDecision") return [];
  const allocatedDamageDice = isAllocatedSpellDamageRollHole(hole)
    ? hole.allocatedDamageDice
    : undefined;
  const canonical = mcpOutputJsonSchema(BattleFillSchema);
  const canonicalDefinitions = record(canonical.$defs);
  const members = alternatives(canonical, canonicalDefinitions).filter(
    (branch) => hasKind(branch, hole.kind, canonicalDefinitions),
  );
  if (members.length === 0)
    throw new Error("The canonical fill must contain the requested hole kind.");
  const requestedRelationship =
    "relationshipFactRequest" in hole &&
    hole.relationshipFactRequest !== undefined;
  const target =
    hole.kind === "targetChoice"
      ? targetInputSchemas(members, hole, canonicalDefinitions)
      : { members, definitions: canonicalDefinitions, distanceFirst: false };
  const { members: requestedMembers, definitions, distanceFirst } = target;
  const narrowed = requestedMembers.map((requested) => {
    const properties = record(requested.properties);
    return {
      ...requested,
      properties: {
        ...properties,
        kind: { const: hole.kind },
        holeId: { const: hole.holeId },
        ...(schemaObject(properties.value)
          ? { value: requestedValue(properties.value, hole, definitions) }
          : {}),
        ...("relationshipFacts" in properties && !requestedRelationship
          ? { relationshipFacts: false }
          : {}),
        ...(allocatedDamageDice === undefined
          ? {}
          : Object.fromEntries(
              ALLOCATED_SPELL_DAMAGE_CHOICE_REJECTION_PRIORITY.map(
                ({ field }) => [field, false],
              ),
            )),
      },
    };
  });
  return [
    {
      holeId: hole.holeId,
      valuePath: "fill" as const,
      fillSchema: omitUnreferencedDefinitions({
        type: "object",
        ...(distanceFirst
          ? narrowed.length === 0
            ? { not: {} }
            : { oneOf: narrowed }
          : { anyOf: narrowed }),
        $defs: definitions,
      }),
      instructions: [
        "Submit one complete fill matching fillSchema to provide_battle_input. Preserve its kind and holeId. Supply only fields admitted by this request; do not copy optional facts from another action.",
        ...(!distanceFirst
          ? []
          : [
              "For this attack target fill, put its required attackTargetDistance witness first in spatialFacts; optional table context may follow. This is the displayed fill format, not an order of game events. Compute distanceFeet from the actual layout.",
            ]),
        ...(requestedRelationship
          ? []
          : [
              "Omit relationshipFacts: this input does not request relationship facts.",
            ]),
        ...(hole.kind === "savingThrowOutcome"
          ? [
              "For every rolled Saving Throw, include d20TestRoll with the actual natural d20 result and succeeded after the target's modifiers. withoutRoll: true is only for a rules-supported outcome that required no roll; it is not a replacement for missing roll data.",
            ]
          : []),
        ...(allocatedDamageDice !== undefined
          ? [
              "Supply exactly one dice group per allocatedDamageDice.groups entry, in its target allocation order. Each group's results must contain that entry's dice count with natural faces from 1 through dieSize. A batched dice sample may be split into these groups without changing or rerolling its faces.",
            ]
          : []),
        ...battleAreaInputInstructions(hole),
      ],
    },
  ];
}
