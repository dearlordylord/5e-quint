export const SPELL_CASTER_FACT_USAGES = ["unused", "required"] as const;
export type SpellCasterFactUsage = (typeof SPELL_CASTER_FACT_USAGES)[number];

/** Facts a procedure's contextual admission consumes from its caster. */
export type SpellCasterRequirements = {
  readonly spellAttackBonus: SpellCasterFactUsage;
  readonly spellSaveDc: SpellCasterFactUsage;
};
