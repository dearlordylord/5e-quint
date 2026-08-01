import type {
  BattleResolutionInput,
  BattleState,
} from "../battle-state-execution.ts";
import {
  characterSpellProcedure,
  type BattleSpellProcedureExecution,
} from "../character-execution-queries.ts";
import { isCharacterBattleCreatureState } from "./creature-state-execution.ts";

export function spellInvocationForRouteSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): BattleSpellProcedureExecution | undefined {
  if (subject.tag !== "actionSpell" && subject.tag !== "bonusActionSpell") {
    return undefined;
  }
  const actor = state.combatants.get(subject.actorId);
  if (
    !isCharacterBattleCreatureState(actor) ||
    subject.procedureRef === undefined
  ) {
    return undefined;
  }
  return characterSpellProcedure(
    actor.origin.execution,
    subject.procedureRef,
    actor,
  );
}
