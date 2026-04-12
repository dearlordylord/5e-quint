import type {
  Ability,
  Condition,
  CreatureId,
  DamageType,
  DifficultyClass,
  SpellSlotLevel,
} from "#/types.ts";

/** Parameters for a readied spell held with Concentration (SRD 5.2.1 Ready). */
export interface ReadiedSpellParams {
  readonly caster: CreatureId;
  readonly target: CreatureId;
  readonly saveDC: DifficultyClass;
  readonly damageOnFail: number;
  readonly halfOnSuccess: boolean;
  readonly damageType: DamageType;
  readonly conditionOnFail: Condition;
  readonly applyCondition: boolean;
  readonly saveAbility: Ability;
  readonly spellName: string;
  readonly slotLvl: SpellSlotLevel;
}
