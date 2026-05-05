export const BATTLE_REACTION_TRIGGERS = [
  "attackHit",
  "attackDamage",
  "spellCast",
  "saveFailed",
  "afterDamage",
  "opportunityAttack",
] as const;
export type BattleReactionTrigger = (typeof BATTLE_REACTION_TRIGGERS)[number];

export const BATTLE_READIED_SPELL_TRIGGERS = [
  "attackHit",
  "spellCast",
  "saveFailed",
  "afterDamage",
] as const satisfies ReadonlyArray<BattleReactionTrigger>;
export type BattleReadiedSpellTrigger =
  (typeof BATTLE_READIED_SPELL_TRIGGERS)[number];
