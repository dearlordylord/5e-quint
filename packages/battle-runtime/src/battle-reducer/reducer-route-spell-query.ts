import { creatureSpellProcedure } from "../creature-spell-procedure.ts";
import type {
  BattleResolutionInput,
  BattleState,
} from "../battle-state-execution.ts";
import { type BattleSpellProcedureExecution } from "../character-execution-queries.ts";
import type { BattleProcedureExecutionRef, CombatantId } from "../identity.ts";

export function spellInvocationForRouteSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): BattleSpellProcedureExecution | undefined {
  if (subject.tag !== "actionSpell" && subject.tag !== "bonusActionSpell") {
    return undefined;
  }
  const actor = state.combatants.get(subject.actorId);
  if (actor === undefined || subject.procedureRef === undefined) {
    return undefined;
  }
  return creatureSpellProcedure(actor, subject.procedureRef);
}

export function spellInvocationForInterruptChoice(
  state: BattleState,
  reactorId: CombatantId,
  procedureRef: BattleProcedureExecutionRef,
): BattleSpellProcedureExecution | undefined {
  const reactor = state.combatants.get(reactorId);
  return reactor === undefined
    ? undefined
    : creatureSpellProcedure(reactor, procedureRef);
}
