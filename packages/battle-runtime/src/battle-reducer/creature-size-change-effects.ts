// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-creature-size-change
import type {
  BattleActiveEffect,
  BattleCreatureState,
  SpellAttackDamageComponent,
} from "../battle-reducer.ts";
import type { SupportedAttackActionOption } from "../battle-action-options.ts";
import { attackDamage } from "./statblock-attacks.ts";

export type SpellCreatureSizeChangeEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spellCreatureSizeChange" }
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
  const displacedEffects = activeEffects.filter(isSpellCreatureSizeChangeEffect);
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

export function creatureSizeChangeAttackDamageComponent(
  effect: SpellCreatureSizeChangeEffect,
  attack: SupportedAttackActionOption,
): SpellAttackDamageComponent {
  const decrease = effect.direction === "decrease";
  return {
    sourceSpellId: effect.sourceSpellId,
    sourceCombatantId: effect.sourceCombatantId,
    damage: {
      expr: { dice: 1, dieSize: 4 },
      damageType: attackDamage(attack).damageType,
    },
    operation: decrease ? "subtract" : "add",
    ...(decrease ? { minimumDamageTotal: 1 as const } : {}),
  };
}
