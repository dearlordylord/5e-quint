import type { CharacterId } from "@dnd/battle-runtime";
import { characterSheetHitPointMaximum } from "@dnd/character-sheet-runtime";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Either } from "effect";

import { characterBuildDisplayName } from "./character-display.ts";
import type { McpCompositionRoot } from "./composition-root.ts";
import type { CharacterSessionRow } from "./character-tool-output.ts";
import {
  characterBattleSpellSlots,
  characterSessionCurrentHp,
  type CharacterSession,
} from "./session-store.ts";

export function characterListRows(
  root: McpCompositionRoot,
): Either.Either<readonly CharacterSessionRow[], string> {
  const rows: CharacterSessionRow[] = [];
  for (const [characterId, session] of root.sessionStore.characters.entries()) {
    const row = characterListRow(root.unitLibrary, characterId, session);
    if (Either.isLeft(row)) return Either.left(row.left);
    rows.push(row.right);
  }
  return Either.right(rows);
}

function characterListRow(
  unitLibrary: UnitCatalog,
  characterId: CharacterId,
  session: CharacterSession,
): Either.Either<CharacterSessionRow, string> {
  if (session.tag === "available") {
    const spellSlots = characterBattleSpellSlots(session);
    return Either.right({
      characterId,
      status: session.tag,
      displayName: characterBuildDisplayName(unitLibrary, session.build),
      build: session.build,
      hitPoints: {
        current: characterSessionCurrentHp(session),
        maximum: characterSheetHitPointMaximum(session),
        state: session.hitPoints,
      },
      ...(spellSlots === undefined ? {} : { spellSlots }),
    });
  }

  return Either.right({
    characterId,
    status: session.tag,
    displayName: null,
    build: session.sheet.build,
    battleId: session.battleId,
  });
}
