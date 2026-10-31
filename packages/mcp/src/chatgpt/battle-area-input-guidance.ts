import {
  BattleHoleIdSchema,
  BattleSpellAreaChoiceSchema,
  BattleSpellAreaMembershipChoiceSchema,
  BattleSpellStagedConditionAreaMembershipChoiceSchema,
  type BattleHole,
  type BattleSpellAreaInputRequest,
} from "@dnd/battle-runtime";
import { Match, Schema } from "effect";
import { mcpOutputJsonSchema, type McpOutputSchema } from "../schema-codec.ts";

export const BattleAreaInputGuidanceSchema = Schema.Struct({
  holeId: BattleHoleIdSchema,
  valuePath: Schema.Literal("fill.value.area"),
  areaSchema: Schema.Record(Schema.String, Schema.Unknown),
  instructions: Schema.Array(Schema.String),
});

export type BattleAreaInputGuidance = typeof BattleAreaInputGuidanceSchema.Type;

function areaInputSchema(
  request: BattleSpellAreaInputRequest,
): McpOutputSchema {
  if (request.kind === "areaMembership")
    return mcpOutputJsonSchema(BattleSpellAreaMembershipChoiceSchema);
  if (request.kind === "stagedConditionAreaMembership")
    return mcpOutputJsonSchema(
      Schema.Union([
        BattleSpellAreaMembershipChoiceSchema,
        BattleSpellStagedConditionAreaMembershipChoiceSchema,
      ]),
    );
  const schema = BattleSpellAreaChoiceSchema.members.find(
    (member) =>
      "literal" in member.fields.kind &&
      member.fields.kind.literal === request.kind,
  );
  if (schema === undefined)
    throw new Error(
      "The canonical area codec must contain its requested area kind.",
    );
  return mcpOutputJsonSchema<
    typeof BattleSpellAreaChoiceSchema.Type,
    typeof BattleSpellAreaChoiceSchema.Encoded
  >(schema);
}

function areaInputInstructions(
  request: BattleSpellAreaInputRequest,
): readonly string[] {
  return Match.value(request.kind).pipe(
    Match.when("areaMembership", () => [
      "Supply the table's originAnchorId and all affectedTargetIds. Omit area.kind for this area request.",
    ]),
    Match.when("stagedConditionAreaMembership", () => [
      "Supply originAnchorId and affectedTargetIds. Omit area.kind. Include stagedConditionAutomaticSuccessFacts only for selected creatures the table confirms do not sleep.",
    ]),
    Match.when("pointOriginSphereSaveDamageArea", () => [
      "Set area.kind to pointOriginSphereSaveDamageArea. Supply originAnchorId, affectedTargetIds, and objectIgnitionFacts.",
      "Report each object in the area once with its objectId and disposition. flammableUnattended objects start burning; notFlammable and wornOrCarried objects do not.",
      "Use objectIgnitionFacts: [] only when the table confirms there are no objects in the area to report. Omitting the field does not mean an empty area.",
    ]),
    Match.when("pointOriginSphereObjectDamageArea", () => [
      "Set area.kind to pointOriginSphereObjectDamageArea. Supply originAnchorId, affectedTargetIds, and nonmagicalUnattendedObjectDamageFacts.",
      "Report each affected nonmagical unattended object once with its objectId and damage disposition. Use an explicit [] only when the table confirms there are no such affected objects.",
    ]),
    Match.when("selfOriginCubePushArea", () => [
      "Set area.kind to selfOriginCubePushArea. Supply originAnchorId, affectedTargetIds, creaturePushes, unsecuredObjectPushes, and audibleBoom as required by areaSchema.",
      "Report a creature push disposition for each failed-save target and each unsecured object entirely within the area. An empty object list is an explicit table confirmation that there are no such objects.",
    ]),
    Match.when("saveGatedTargetProjectionArea", () => [
      "Set area.kind to saveGatedTargetProjectionArea. Supply originAnchorId, affectedTargetIds, and affectedObjectIds. Use affectedObjectIds: [] only when the table confirms no objects are affected.",
    ]),
    Match.when("saveGatedAreaControlArea", () => [
      "Set area.kind to saveGatedAreaControlArea. Supply originAnchorId, affectedTargetIds, cubeSideFeet, and an affectedCreatureWitnesses entry for each affected creature confirming its location and ability to see the pattern.",
    ]),
    Match.when("saveGatedTurnConstraintBundleArea", () => [
      "Set area.kind to saveGatedTurnConstraintBundleArea. Supply originAnchorId, affectedTargetIds, cubeSideFeet, and affectedCreatureWitnesses confirming each selected creature is in the cube and chosen by the caster.",
    ]),
    Match.when("persistentAreaSaveConditionArea", () => [
      "Set area.kind to persistentAreaSaveConditionArea. Supply originAnchorId, affectedTargetIds, and the table's areaId for this persistent area.",
    ]),
    Match.when("directionalPersistentAreaArea", () => [
      "Set area.kind to directionalPersistentAreaArea. Supply originAnchorId, affectedTargetIds, areaId, directionId, and creaturePushes as required by areaSchema.",
    ]),
    Match.exhaustive,
  );
}

export function battleAreaInputGuidance(
  hole: BattleHole,
): readonly BattleAreaInputGuidance[] {
  if (
    hole.kind !== "savingThrowOutcome" ||
    !("areaInput" in hole) ||
    hole.areaInput === undefined
  )
    return [];
  return [
    {
      holeId: hole.holeId,
      valuePath: "fill.value.area",
      areaSchema: areaInputSchema(hole.areaInput),
      instructions: areaInputInstructions(hole.areaInput),
    },
  ];
}
