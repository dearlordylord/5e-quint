import type {
  BattleActiveEffect,
  BattleState,
} from "../battle-state-execution.ts";
import type {
  FixedCostMovementReplacementSpellProcedureExecution,
  SaveGatedConditionWithRepeatSpellProcedureExecution,
  SaveGatedTurnConstraintBundleSpellProcedureExecution,
  StagedSaveConditionSpellProcedureExecution,
  TargetingSaveInterdictionSpellProcedureExecution,
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

type WisdomSave<
  Execution extends { readonly ability: "wis"; readonly dc: unknown },
> = {
  readonly save: Pick<Execution, "ability" | "dc">;
};

export type BoundStagedSaveConditionPendingRepeatEffect =
  EffectOf<"stagedSaveConditionPendingRepeat"> &
    WisdomSave<StagedSaveConditionSpellProcedureExecution>;

export function boundStagedSaveConditionPendingRepeatEffect(
  state: BattleState,
  effect: EffectOf<"stagedSaveConditionPendingRepeat">,
): BoundStagedSaveConditionPendingRepeatEffect | undefined {
  const facts = spellProcedureBoundToActiveEffect(state, effect);
  return facts?.procedure === "stagedSaveCondition"
    ? { ...effect, save: { ability: facts.ability, dc: facts.dc } }
    : undefined;
}

export type BoundSaveGatedConditionWithRepeatEffect =
  EffectOf<"saveGatedConditionWithRepeat"> &
    WisdomSave<SaveGatedConditionWithRepeatSpellProcedureExecution>;

export function boundSaveGatedConditionWithRepeatEffect(
  state: BattleState,
  effect: EffectOf<"saveGatedConditionWithRepeat">,
): BoundSaveGatedConditionWithRepeatEffect | undefined {
  const facts = spellProcedureBoundToActiveEffect(state, effect);
  return facts?.procedure === "saveGatedConditionWithRepeat"
    ? { ...effect, save: { ability: facts.ability, dc: facts.dc } }
    : undefined;
}

export type BoundSaveGatedTurnConstraintBundleEffect =
  EffectOf<"saveGatedTurnConstraintBundle"> &
    WisdomSave<SaveGatedTurnConstraintBundleSpellProcedureExecution>;

export function boundSaveGatedTurnConstraintBundleEffect(
  state: BattleState,
  effect: EffectOf<"saveGatedTurnConstraintBundle">,
): BoundSaveGatedTurnConstraintBundleEffect | undefined {
  const facts = spellProcedureBoundToActiveEffect(state, effect);
  return facts?.procedure === "saveGatedTurnConstraintBundle"
    ? { ...effect, save: { ability: facts.ability, dc: facts.dc } }
    : undefined;
}

export type BoundTargetingSaveInterdictionEffect =
  EffectOf<"targetingSaveInterdiction"> &
    Pick<
      TargetingSaveInterdictionSpellProcedureExecution["activeEffect"],
      "save"
    >;

export function boundTargetingSaveInterdictionEffect(
  state: BattleState,
  effect: EffectOf<"targetingSaveInterdiction">,
): BoundTargetingSaveInterdictionEffect | undefined {
  const facts = spellProcedureBoundToActiveEffect(state, effect);
  return facts?.procedure === "targetingSaveInterdiction"
    ? { ...effect, save: facts.activeEffect.save }
    : undefined;
}
