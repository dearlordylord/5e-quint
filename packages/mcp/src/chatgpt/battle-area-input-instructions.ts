import type {
  BattleHole,
  BattleSpellAreaInputRequest,
} from "@dnd/battle-runtime";
import { Match } from "effect";

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
      'Set area.kind to pointOriginSphereSaveDamageArea. Supply originAnchor, affectedTargetIds, and objectIgnitionFacts. Use originAnchor: { kind: "tableSelectedPoint" } for the table-computed point, or { kind: "combatant", combatantId } only when the origin is an existing combatant. Do not invent a combatant id for a free point.',
      "Report each object in the area once with its objectId and disposition. flammableUnattended objects start burning; notFlammable and wornOrCarried objects do not.",
      "Use objectIgnitionFacts: [] only when the table confirms there are no objects in the area to report. Omitting the field does not mean an empty area.",
    ]),
    Match.when("pointOriginSphereObjectDamageArea", () => [
      'Set area.kind to pointOriginSphereObjectDamageArea. Supply originAnchor, affectedTargetIds, and nonmagicalUnattendedObjectDamageFacts. Use originAnchor: { kind: "tableSelectedPoint" } for the table-computed point, or { kind: "combatant", combatantId } for an existing combatant.',
      "Report each affected nonmagical unattended object once with its objectId and damage disposition. Use an explicit [] only when the table confirms there are no such affected objects.",
    ]),
    Match.when("selfOriginCubePushArea", () => [
      "Set area.kind to selfOriginCubePushArea. Supply originAnchorId, affectedTargetIds, creaturePushes, unsecuredObjectPushes, and audibleBoom as required by the complete fillSchema.",
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
      "Set area.kind to directionalPersistentAreaArea. Supply originAnchorId, affectedTargetIds, areaId, directionId, and creaturePushes as required by the complete fillSchema.",
    ]),
    Match.exhaustive,
  );
}

export function battleAreaInputInstructions(
  hole: BattleHole,
): readonly string[] {
  if (
    hole.kind !== "savingThrowOutcome" ||
    !("areaInput" in hole) ||
    hole.areaInput === undefined
  )
    return [];
  return areaInputInstructions(hole.areaInput);
}
