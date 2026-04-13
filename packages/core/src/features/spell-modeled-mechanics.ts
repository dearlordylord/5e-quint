import type {
  Ability,
  Condition,
  DamageType,
  DifficultyClass,
  SpellSlotLevel,
} from "#/types.ts";
import { spellSlotLevel } from "#/types.ts";

export type BattleReadyableSpellReleasePayload = {
  readonly kind: "save";
  readonly saveAbility: Ability;
  readonly saveDC: DifficultyClass;
  readonly halfOnSuccess: boolean;
  readonly damageType: DamageType;
  readonly damageOnFail: number;
  readonly conditionOnFail: Condition;
  readonly applyCondition: boolean;
};

export type BattleReadyableSpellPayload = {
  readonly baseLevel: SpellSlotLevel;
  readonly slotLevel: SpellSlotLevel;
  readonly release: BattleReadyableSpellReleasePayload;
};

export interface BattleReadyableSaveSpellMechanics {
  readonly family: "battleReadyableSave";
  readonly baseLevel: SpellSlotLevel;
  readonly saveAbility: Ability;
  readonly halfOnSuccess: boolean;
  readonly damageType: DamageType;
  readonly conditionOnFail: Condition;
  readonly applyCondition: boolean;
  readonly damageOnFailAtSlotLevel: (slotLevel: SpellSlotLevel) => number;
  readonly projectBattlePayload: (
    slotLevel: SpellSlotLevel,
    saveDC: DifficultyClass,
  ) => BattleReadyableSpellPayload;
}

export type SpellModeledMechanics = BattleReadyableSaveSpellMechanics;

export function diceMaximum(dice: {
  readonly dice: number;
  readonly dieSize: number;
}) {
  return dice.dice * dice.dieSize;
}

export function battleReadyableSaveSpell(params: {
  readonly baseLevel: number;
  readonly saveAbility: Ability;
  readonly halfOnSuccess: boolean;
  readonly damageType: DamageType;
  readonly conditionOnFail: Condition;
  readonly applyCondition: boolean;
  readonly damageOnFailAtSlotLevel: (slotLevel: SpellSlotLevel) => number;
}): BattleReadyableSaveSpellMechanics {
  const baseLevel = spellSlotLevel(params.baseLevel);
  return {
    family: "battleReadyableSave",
    baseLevel,
    saveAbility: params.saveAbility,
    halfOnSuccess: params.halfOnSuccess,
    damageType: params.damageType,
    conditionOnFail: params.conditionOnFail,
    applyCondition: params.applyCondition,
    damageOnFailAtSlotLevel: params.damageOnFailAtSlotLevel,
    projectBattlePayload: (slotLevel, saveDC) => ({
      baseLevel,
      slotLevel,
      release: {
        kind: "save",
        saveAbility: params.saveAbility,
        saveDC,
        halfOnSuccess: params.halfOnSuccess,
        damageType: params.damageType,
        damageOnFail: params.damageOnFailAtSlotLevel(slotLevel),
        conditionOnFail: params.conditionOnFail,
        applyCondition: params.applyCondition,
      },
    }),
  };
}
