export const STATIC_SPELL_MECHANICS_OWNER_KEYS = [
  "spawnedCompanionLifecycle",
  "glyphDurableOccurrence",
] as const;

export type StaticSpellMechanicsOwnerKey =
  (typeof STATIC_SPELL_MECHANICS_OWNER_KEYS)[number];
