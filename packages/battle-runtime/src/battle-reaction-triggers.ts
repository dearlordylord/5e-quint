// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-003 RAW-PTG-REACTIONS-006
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.reaction-roll-or-damage-reduction spell.reaction-shield
export const BATTLE_REACTION_TRIGGERS = [
  "attackHit",
  "attackDamage",
  "spellCast",
  "saveFailed",
  "afterDamage",
  "creatureFalls",
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
