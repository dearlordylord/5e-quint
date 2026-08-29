import type {
  BattleActiveEffect,
  BattleState,
} from "../battle-state-execution.ts";
import { characterRetainedSpellProcedureExecution } from "../character-execution-queries.ts";
import type { SpellProcedureExecution } from "../procedure-execution/spell-procedure-execution.ts";

export function spellProcedureBoundToActiveEffect(
  state: BattleState,
  effect: BattleActiveEffect,
): SpellProcedureExecution | undefined {
  const source = state.combatants.get(effect.sourceCombatantId);
  return source?.origin.kind === "character" && "sourceProcedureRef" in effect
    ? characterRetainedSpellProcedureExecution(
        source.origin.execution,
        effect.sourceProcedureRef,
      )
    : undefined;
}
