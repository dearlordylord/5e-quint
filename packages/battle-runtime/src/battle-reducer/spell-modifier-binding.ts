import type {
  BattleActiveEffect,
  BattleState,
} from "../battle-state-execution.ts";
import type {
  FixedCostMovementReplacementSpellProcedureExecution,
  WeaponAttackDamageEnhancementSpellProcedureExecution,
} from "../procedure-execution/spell-procedure-execution.ts";
import { spellProcedureBoundToActiveEffect } from "./spell-active-effect-binding.ts";

type EffectOf<Kind extends BattleActiveEffect["kind"]> = Extract<
  BattleActiveEffect,
  { readonly kind: Kind }
>;

export type BoundFixedCostMovementReplacementEffect =
  EffectOf<"fixedCostMovementReplacement"> &
    Pick<
      FixedCostMovementReplacementSpellProcedureExecution["activeEffect"],
      "movementCostFeet" | "maxJumpDistanceFeet"
    >;

export function boundFixedCostMovementReplacementEffect(
  state: BattleState,
  effect: EffectOf<"fixedCostMovementReplacement">,
): BoundFixedCostMovementReplacementEffect | undefined {
  const facts = spellProcedureBoundToActiveEffect(state, effect);
  return facts?.procedure === "fixedCostMovementReplacement"
    ? {
        ...effect,
        movementCostFeet: facts.activeEffect.movementCostFeet,
        maxJumpDistanceFeet: facts.activeEffect.maxJumpDistanceFeet,
      }
    : undefined;
}

export function weaponAttackDamageEnhancementBonus(
  state: BattleState,
  effect: EffectOf<"weaponAttackDamageEnhancement">,
): WeaponAttackDamageEnhancementSpellProcedureExecution["bonus"] | undefined {
  const facts = spellProcedureBoundToActiveEffect(state, effect);
  return facts?.procedure === "weaponAttackDamageEnhancement"
    ? facts.bonus
    : undefined;
}
