import type { CreatureId, CreatureRosterEntry } from "#/types.ts";

export const BATTLE_SOURCE_KINDS = [
  "characterSheet",
  "statBlock",
] as const;
export type BattleSourceKind = (typeof BATTLE_SOURCE_KINDS)[number];

export const BATTLE_SOURCE_REF_SEPARATOR = ":" as const;

export type CharacterSheetBattleSourceRef =
  `characterSheet${typeof BATTLE_SOURCE_REF_SEPARATOR}${string}`;
export type StatBlockBattleSourceRef =
  `statBlock${typeof BATTLE_SOURCE_REF_SEPARATOR}${string}`;
export type BattleSourceRef =
  | CharacterSheetBattleSourceRef
  | StatBlockBattleSourceRef;

export function characterSheetBattleSourceRef(
  creatureId: CreatureId,
): CharacterSheetBattleSourceRef {
  return `characterSheet:${creatureId}`;
}

export function statBlockBattleSourceRef(
  creatureId: CreatureId,
): StatBlockBattleSourceRef {
  return `statBlock:${creatureId}`;
}

export function battleSourceRefForCreature(
  creature: CreatureRosterEntry,
): BattleSourceRef {
  return creature.sourceKind === "characterSheet"
    ? characterSheetBattleSourceRef(creature.id)
    : statBlockBattleSourceRef(creature.id);
}

export function battleSourceKind(ref: BattleSourceRef): BattleSourceKind {
  return ref.startsWith("characterSheet:")
    ? "characterSheet"
    : "statBlock";
}

export function battleSourceLocalId(ref: BattleSourceRef): CreatureId {
  return ref.slice(ref.indexOf(BATTLE_SOURCE_REF_SEPARATOR) + 1);
}
