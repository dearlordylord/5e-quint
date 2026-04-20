import type {
  Ability,
  Condition,
  CreatureId,
  DamageType,
  DifficultyClass,
  SpellId,
  SpellSlotLevel,
} from "#/types.ts";
import type { BattleSpellAccessId } from "#/battle-spell-access.ts";

/** Parameters for a readied spell held with Concentration (SRD 5.2.1 Ready). */
export interface ReadiedSpellParams {
  readonly accessId: BattleSpellAccessId;
  readonly caster: CreatureId;
  readonly target: CreatureId;
  readonly saveDC: DifficultyClass;
  readonly damageOnFail: number;
  readonly halfOnSuccess: boolean;
  readonly damageType: DamageType;
  readonly conditionOnFail: Condition;
  readonly applyCondition: boolean;
  readonly saveAbility: Ability;
  readonly spellId: SpellId;
  readonly slotLvl: SpellSlotLevel;
}
