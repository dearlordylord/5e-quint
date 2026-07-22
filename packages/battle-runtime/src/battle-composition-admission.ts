import type { CharacterBattleCreatureState } from "./battle-state-execution.ts";
import {
  characterUnitProcedure,
  type CharacterUnitProcedureQuery,
} from "./character-execution-admission.ts";
import type { UnitRecord } from "@dnd/surface/surface/types";
import type { BattleProcedureExecutionRef } from "./identity.ts";
import type { CharacterBattleRuntimeContext } from "./battle-runtime-context.ts";
export { characterUnitProcedureQueryForSubject } from "./battle-reducer/resolution-subject-query.ts";

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
