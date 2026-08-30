import type {
  BattleActiveEffect,
  BattleState,
} from "../battle-state-execution.ts";
import { characterRetainedSpellProcedureExecution } from "../character-execution-queries.ts";
import type { SpellProcedureExecution } from "../procedure-execution/spell-procedure-execution.ts";
import type { BattleActiveEffectSource } from "../active-effect/source.ts";

export function spellProcedureBoundToOccurrenceSource(
  state: BattleState,
  source: BattleActiveEffectSource,
): SpellProcedureExecution | undefined {
  const sourceCombatant = state.combatants.get(source.sourceCombatantId);
  return sourceCombatant?.origin.kind === "character"
    ? characterRetainedSpellProcedureExecution(
        sourceCombatant.origin.execution,
        source.sourceProcedureRef,
      )
    : undefined;
}

export function spellProcedureBoundToActiveEffect(
  state: BattleState,
  effect: BattleActiveEffect,
): SpellProcedureExecution | undefined {
  return "sourceProcedureRef" in effect
    ? spellProcedureBoundToOccurrenceSource(state, effect)
    : undefined;
}
