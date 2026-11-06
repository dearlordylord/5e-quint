import {
  BattleFillSchema,
  BattleHoleIdSchema,
  ALLOCATED_SPELL_DAMAGE_CHOICE_REJECTION_PRIORITY,
  type BattleHole,
  type BattleAllocatedSpellDamageRollHole,
} from "@dnd/battle-runtime";
import { Match, Option, Schema } from "effect";
import {
  isJsonSchemaObject as schemaObject,
  jsonSchemaRecord as record,
  jsonSchemaAlternatives as alternatives,
  jsonSchemaHasKind as hasKind,
  resolveLocalSchemaReference,
} from "../json-schema-sharing.ts";
import { targetInputSchemas } from "./battle-target-input-schema.ts";
import {
  mcpOutputJsonSchema,
  omitUnreferencedDefinitions,
  type McpOutputSchema,
} from "../schema-codec.ts";
import {
  requestedDiceValue,
  diceGroupsValue,
} from "./battle-dice-input-schema.ts";
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
  const dice = requestedDiceValue(schema, hole, definitions);
  if (Option.isSome(dice)) return dice.value;
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
  const areaRequest = hole.areaInput;
  const areaKind = areaRequest.kind;
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
    const originAnchorId =
      "originAnchorId" in areaRequest ? areaRequest.originAnchorId : undefined;
    const requestedAreas =
      originAnchorId === undefined
        ? areas
        : areas.map((area) => ({
            ...area,
            properties: {
              ...record(area.properties),
              originAnchorId: { const: originAnchorId },
            },
          }));
    return {
      ...branch,
      properties: { ...properties, area: { anyOf: requestedAreas } },
    };
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
  return diceGroupsValue(
    schema,
    request.groups,
    definitions,
    ({ targetId }) => `Damage dice for allocated target ${targetId}.`,
  );
}

function attackDiceInstructions(hole: BattleHole): readonly string[] {
  if (hole.kind !== "attackRoll" || hole.rollMode === undefined) return [];
  return [
    `The current attack roll mode is ${hole.rollMode}. Normal uses one natural d20; advantage/disadvantage uses two ordered natural d20 faces with that rollMode. Include the total after the attack bonus. Optional feature activations can change the mode; choose them before rolling.`,
  ];
}
function damageDiceInstructions(hole: BattleHole): readonly string[] {
  if (hole.kind !== "rolledDice" || !("damageDice" in hole)) return [];
  return Match.value(hole.damageDice).pipe(
    Match.when({ kind: "fixed" }, () => [
      "Use exactly damageDice.groups in order as the groups for roll_dice, then return each group's natural faces in value[].results. These counts already include critical-hit doubling and required damage riders: do not double them again or add modifiers to faces.",
      "If a fill is rejected, repair it using the existing sampled faces; inspect the current request before drawing any missing dice. A rejected fill is not permission to reroll the pending damage.",
    ]),
    Match.when({ kind: "selectionDependent" }, () => [
      "Choose optional damage riders and Cunning Strike when constructing this same fill, then roll their corresponding damage groups using the current attack details. Submit the choices and dice together; this choice-dependent request has no fixed groups. Critical-hit doubling applies once.",
    ]),
    Match.exhaustive,
  );
}
function candidateDiceInstructions(hole: BattleHole): readonly string[] {
  if (
    hole.kind !== "rolledDice" ||
    !("weaponDamageDiceRollChoiceProcedureRefs" in hole) ||
    hole.weaponDamageDiceRollChoiceProcedureRefs === undefined
  )
    return [];
  return [
    "If selecting the offered weapon damage dice-roll choice, supply its two candidate rolls and selected candidate together. The extra candidate rolls apply to the base weapon component; return the selected candidate as that component's value group and retain both candidates' actual faces.",
  ];
}

function contextualInputInstructions(
  hole: BattleHole,
  context: {
    readonly distanceFirst: boolean;
    readonly requestedRelationship: boolean;
  },
): readonly string[] {
  const { distanceFirst, requestedRelationship } = context;
  return [
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
    ...(isAllocatedSpellDamageRollHole(hole)
      ? [
          "Supply exactly one dice group per allocatedDamageDice.groups entry, in its target allocation order. Each group's results must contain that entry's dice count with natural faces from 1 through dieSize. A batched dice sample may be split into these groups without changing or rerolling its faces.",
        ]
      : []),
  ];
}

function requestedSpatialFacts(
  schema: McpOutputSchema,
  hole: BattleHole,
  definitions: McpOutputSchema,
): McpOutputSchema | undefined {
  const request =
    "sphereFactRequest" in hole
      ? hole.sphereFactRequest
      : "targetSpatialFactRequest" in hole
        ? hole.targetSpatialFactRequest
        : undefined;
  if (request === undefined) return undefined;
  const array = resolveLocalSchemaReference(schema, definitions);
  const facts = alternatives(record(array.items), definitions).filter((fact) =>
    hasKind(fact, request.kind, definitions),
  );
  if (facts.length === 0)
    throw new Error(
      "The canonical spatial fill must contain its requested fact.",
    );
  return {
    ...array,
    minItems: 1,
    ...("sphereFactRequest" in hole ? { maxItems: 1 } : {}),
    items: {
      anyOf: facts.map((fact) => ({
        ...fact,
        properties: {
          ...record(fact.properties),
          ...Object.fromEntries(
            Object.entries(request).map(([key, value]) => [
              key,
              { const: value },
            ]),
          ),
        },
      })),
    },
  };
}

function spatialFactInstructions(hole: BattleHole): readonly string[] {
  if ("sphereFactRequest" in hole)
    return [
      "Supply exactly one spatialFacts entry matching sphereFactRequest and all table-confirmed targetIds in that Sphere, including the healing target. Keep accepted Saving Throw outcomes and dice; this independent input supplies membership without replacing them.",
    ];
  if (
    "targetSpatialFactRequest" in hole &&
    hole.targetSpatialFactRequest !== undefined
  )
    return [
      "Supply one spatialFacts entry matching targetSpatialFactRequest for each selected Saving Throw target, confirming that it is visible and within range.",
    ];
  if (
    hole.kind === "savingThrowOutcome" &&
    "areaInput" in hole &&
    hole.areaInput !== undefined &&
    "shapeChoices" in hole.areaInput
  )
    return [
      "Use the acting creature as originAnchorId. The table computes one of areaInput.shapeChoices and reports every affectedTargetId; geometry is not inferred by the engine.",
    ];
  if (
    hole.kind === "savingThrowOutcome" &&
    "grantedAreaSaveDamageAction" in hole
  )
    return [
      "Use the acting creature as originAnchorId. The table computes the Cone with grantedAreaSaveDamageAction.lengthFeet and reports every affectedTargetId.",
    ];
  return [];
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
    hole.kind === "targetChoice" || hole.kind === "objectTargetChoice"
      ? targetInputSchemas(members, hole, canonicalDefinitions)
      : { members, definitions: canonicalDefinitions, distanceFirst: false };
  const { members: requestedMembers, definitions, distanceFirst } = target;
  const narrowed = requestedMembers.map((requested) => {
    const properties = record(requested.properties);
    const spatialFacts = schemaObject(properties.spatialFacts)
      ? requestedSpatialFacts(properties.spatialFacts, hole, definitions)
      : undefined;
    return {
      ...requested,
      ...("targetSpatialFactRequest" in hole &&
      hole.targetSpatialFactRequest !== undefined
        ? {
            required: [
              ...(Array.isArray(requested.required) ? requested.required : []),
              "spatialFacts",
            ],
          }
        : {}),
      properties: {
        ...properties,
        kind: { const: hole.kind },
        holeId: { const: hole.holeId },
        ...(spatialFacts === undefined ? {} : { spatialFacts }),
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
        ...contextualInputInstructions(hole, {
          distanceFirst,
          requestedRelationship,
        }),
        ...attackDiceInstructions(hole),
        ...damageDiceInstructions(hole),
        ...candidateDiceInstructions(hole),
        ...battleAreaInputInstructions(hole),
        ...spatialFactInstructions(hole),
      ],
    },
  ];
}
