import type { UnitRecord } from "@dnd/surface/surface/types";

import type { CharacterSheet } from "./sheet-types.ts";

export function hasPreparedClassSpellAccess(
  sheet: Pick<CharacterSheet, "build">,
  spellId: UnitRecord["id"],
): boolean {
  return (
    sheet.build.spellcasting?.sources.some((source) =>
      source.preparedSpells.includes(spellId),
    ) ?? false
  );
}
