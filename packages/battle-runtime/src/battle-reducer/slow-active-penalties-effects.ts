// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE BATTLE.SPELL.SLOW_MULTIATTACK_ATTACK_CAP
import type {
  BattleActiveEffect,
  BattleCreatureState,
} from "../battle-state-execution.ts";

export type SlowActivePenaltiesEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "slowActivePenalties" }
>;

export function slowActivePenaltiesEffects(
  combatant: BattleCreatureState | undefined,
): readonly SlowActivePenaltiesEffect[] {
  return combatant === undefined
    ? []
    : combatant.activeEffects.filter(
        (effect): effect is SlowActivePenaltiesEffect =>
          effect.kind === "slowActivePenalties",
      );
}
