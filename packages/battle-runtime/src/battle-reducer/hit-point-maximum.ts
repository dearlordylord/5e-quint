import { Hp } from "@dnd/shared/types";
import type {
  BattleActiveEffect,
  BattleCreatureState,
} from "../battle-state-execution.ts";

type HitPointMaximumIncreaseEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "hitPointMaximumIncrease" }
>;

export function effectiveHitPointMaximum(combatant: BattleCreatureState): Hp {
  return Hp(
    Number(combatant.maxHp) +
      appliedHitPointMaximumIncreaseAmount(combatant.activeEffects),
  );
}

export function appliedHitPointMaximumIncreaseAmount(
  effects: readonly BattleActiveEffect[],
): number {
  const highestAmountBySpell = new Map<string, number>();
  for (const effect of effects) {
    if (effect.kind !== "hitPointMaximumIncrease") {
      continue;
    }
    const amount = hitPointMaximumIncreaseAmount(effect);
    const activeAmount =
      highestAmountBySpell.get(effect.sourceProcedureRef) ?? 0;
    if (amount > activeAmount) {
      highestAmountBySpell.set(effect.sourceProcedureRef, amount);
    }
  }
  return [...highestAmountBySpell.values()].reduce(
    (total, amount) => total + amount,
    0,
  );
}

export function hitPointMaximumIncreaseAmount(
  effect: HitPointMaximumIncreaseEffect,
): number {
  return Math.max(0, Math.floor(effect.amount));
}
