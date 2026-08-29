import type { BattleEffectExecutionRef } from "../identity.ts";

export function escapeSpellRestraintAbilityCheckHoleKey(
  effectRef: BattleEffectExecutionRef,
): string {
  return `battle:escape-spell-restraint:${effectRef}:athletics-check`;
}

export function dragonsBreathHoleKey(
  effectRef: BattleEffectExecutionRef,
  suffix: string,
): string {
  return `battle:dragons-breath:${effectRef}:${suffix}`;
}
