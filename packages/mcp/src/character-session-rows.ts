import type { CharacterId } from "@dnd/battle-runtime";
import {
  characterSheetCompanion,
  characterSheetHitDice,
  characterSheetHitPointMaximum,
  characterSheetPactSlots,
  characterSheetResources,
  type CharacterSheetResourceState,
} from "@dnd/character-sheet-runtime";
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
    const pactSlots = characterSheetPactSlots(session);
    const hitPointMaximum = characterSheetHitPointMaximum({
      sheet: session,
      unitLibrary,
    });
    if (Either.isLeft(hitPointMaximum)) {
      return Either.left(hitPointMaximum.left.message);
    }
    const hitDice = characterSheetHitDice(session, unitLibrary);
    if (Either.isLeft(hitDice)) return Either.left(hitDice.left.message);
    const resources = characterSheetResources(session, unitLibrary);
    if (Either.isLeft(resources)) return Either.left(resources.left.message);
    return Either.right({
      characterId,
      status: session.tag,
      displayName: characterBuildDisplayName(unitLibrary, session.build),
      build: session.build,
      hitPoints: {
        current: characterSessionCurrentHp(session),
        maximum: hitPointMaximum.right,
        state: session.hitPoints,
      },
      hitDice: hitDice.right,
      ...(spellSlots === undefined ? {} : { spellSlots }),
      ...(pactSlots === undefined ? {} : { pactSlots }),
      resources: resources.right.map(characterSheetResourceDisplayRow),
      companion: characterSheetCompanion(session),
    });
  }

  return Either.right({
    characterId,
    status: session.tag,
    displayName: null,
    build: session.sheet.build,
    battleId: session.battleId,
    companion: characterSheetCompanion(session.sheet),
  });
}

function characterSheetResourceDisplayRow(
  resource: CharacterSheetResourceState,
) {
  return {
    tag: resource.tag,
    unitId: resource.unitId,
    count: resource.count,
    expended: resource.expended,
  };
}
