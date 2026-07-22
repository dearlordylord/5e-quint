import type { CharacterProcedureBattleSubject } from "./battle-subjects.ts";
import type { CharacterBattleCreatureState } from "./battle-reducer.ts";
import {
  BONUS_ACTION_STANDARD_ACTION_PROCEDURE_QUERY,
  CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  DRUID_WILD_SHAPE_PROCEDURE_QUERY,
  MONK_FOCUS_PROCEDURE_QUERY,
  characterUnitProcedure,
  type CharacterUnitProcedureQuery,
} from "./character-execution-admission.ts";
import type { UnitRecord } from "@dnd/surface/surface/types";
import type { BattleProcedureExecutionRef } from "./identity.ts";
import type { CharacterBattleRuntimeContext } from "./battle-runtime-context.ts";
export function characterUnitProcedureQueryForSubject(
  subject: CharacterProcedureBattleSubject,
): CharacterUnitProcedureQuery | undefined {
  if (
    subject.tag === "unitFeature" ||
    subject.tag === "unitFeatureHeldWeaponActivation"
  ) {
    return CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY;
  }
  if (subject.tag === "druidWildShape") {
    return DRUID_WILD_SHAPE_PROCEDURE_QUERY;
  }
  if (subject.tag === "bonusActionStandardAction") {
    return BONUS_ACTION_STANDARD_ACTION_PROCEDURE_QUERY;
  }
  if (subject.tag === "monkFocusOption") {
    return MONK_FOCUS_PROCEDURE_QUERY;
  }
  return undefined;
}

export function characterUnitProcedureRefsForAuthoredSelection(
  context: CharacterBattleRuntimeContext,
  actor: CharacterBattleCreatureState,
  unitId: UnitRecord["id"],
  query: CharacterUnitProcedureQuery,
): readonly BattleProcedureExecutionRef[] {
  return context.unitProcedureOwnership.flatMap((ownership) =>
    ownership.unitId === unitId &&
    characterUnitProcedure(
      actor.origin.execution,
      ownership.procedureRef,
      query,
    ) !== undefined
      ? [ownership.procedureRef]
      : [],
  );
}
