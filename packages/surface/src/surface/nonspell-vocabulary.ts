import type { ClassName } from "@dnd/shared/game-facts";

export const MAGIC_INITIATE_SPELL_LISTS = [
  "cleric",
  "druid",
  "wizard",
] as const satisfies ReadonlyArray<ClassName>;

export type MagicInitiateSpellList =
  (typeof MAGIC_INITIATE_SPELL_LISTS)[number];
