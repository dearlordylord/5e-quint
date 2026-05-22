// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-creature-size-change
import type {
  BattleActiveEffect,
  BattleCreatureState,
  CreatureSizeChangeSpellInvocation,
  SpellAttackDamageComponent,
} from "../battle-reducer.ts";
import type { SupportedAttackActionOption } from "../battle-action-options.ts";
import { attackDamage } from "./statblock-attacks.ts";

export type SpellCreatureSizeChangeEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spellCreatureSizeChange" }
>;

export const CREATURE_SIZE_CHANGE_DAMAGE_DICE = 1;
export const CREATURE_SIZE_CHANGE_DAMAGE_DIE_SIZE = 4;
export const CREATURE_SIZE_CHANGE_MINIMUM_DAMAGE_TOTAL = 1;

const CREATURE_SIZE_CHANGE_PROCEDURE_BY_DIRECTION = {
  increase: "creatureSizeIncrease",
  decrease: "creatureSizeDecrease",
} as const satisfies Record<
  SpellCreatureSizeChangeEffect["direction"],
  CreatureSizeChangeSpellInvocation["procedure"]
>;

export function isSpellCreatureSizeChangeEffect(
  effect: BattleActiveEffect,
): effect is SpellCreatureSizeChangeEffect {
  return effect.kind === "spellCreatureSizeChange";
}

export function activeCreatureSizeChangeEffect(
  combatant: BattleCreatureState | undefined,
): SpellCreatureSizeChangeEffect | null {
  return combatant?.activeEffects.find(isSpellCreatureSizeChangeEffect) ?? null;
}

export function activeEffectsWithoutCreatureSizeChange(
  activeEffects: readonly BattleActiveEffect[],
): readonly BattleActiveEffect[] {
  return activeEffects.filter(
    (effect) => !isSpellCreatureSizeChangeEffect(effect),
  );
}

export function activeEffectsWithCreatureSizeChangeReplaced(
  activeEffects: readonly BattleActiveEffect[],
  nextEffect: SpellCreatureSizeChangeEffect,
): {
  readonly activeEffects: readonly BattleActiveEffect[];
  readonly displacedEffects: readonly SpellCreatureSizeChangeEffect[];
} {
  const displacedEffects = activeEffects.filter(
    isSpellCreatureSizeChangeEffect,
  );
  return {
    activeEffects: [
      ...activeEffectsWithoutCreatureSizeChange(activeEffects),
      nextEffect,
    ],
    displacedEffects,
  };
}

export function creatureSizeChangeStrengthRollMode(
  effect: SpellCreatureSizeChangeEffect,
): "advantage" | "disadvantage" {
  return effect.direction === "increase" ? "advantage" : "disadvantage";
}

export function creatureSizeChangeProcedure(
  effect: SpellCreatureSizeChangeEffect,
): CreatureSizeChangeSpellInvocation["procedure"] {
  return CREATURE_SIZE_CHANGE_PROCEDURE_BY_DIRECTION[effect.direction];
}

export function creatureSizeChangeAttackDamageComponent(
  effect: SpellCreatureSizeChangeEffect,
  attack: SupportedAttackActionOption,
): SpellAttackDamageComponent {
  const decrease = effect.direction === "decrease";
  return {
    sourceSpellId: effect.sourceSpellId,
    sourceCombatantId: effect.sourceCombatantId,
    damage: {
      expr: {
        dice: CREATURE_SIZE_CHANGE_DAMAGE_DICE,
        dieSize: CREATURE_SIZE_CHANGE_DAMAGE_DIE_SIZE,
      },
      damageType: attackDamage(attack).damageType,
    },
    operation: decrease ? "subtract" : "add",
    ...(decrease
      ? { minimumDamageTotal: CREATURE_SIZE_CHANGE_MINIMUM_DAMAGE_TOTAL }
      : {}),
  };
}
