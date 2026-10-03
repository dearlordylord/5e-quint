import { type CharacterBuildClassLevelGain } from "@dnd/character-creation-runtime";
import { Hp } from "@dnd/shared/types";
import { elapsedTimeTicks } from "@dnd/shared/elapsed-time";
import { Result } from "effect";
import {
  buildFor,
  wizardSpellcastingGainChoicesForBuild,
  unitLibrary,
} from "../../character-creation-runtime/src/repeated-feat-grants.test-support.ts";
import {
  characterSheetId,
  type CharacterSheet,
  type CharacterSheetPreparedSpellRestReplacement,
} from "./sheet-types.ts";
import { createFreshCharacterSheet } from "./sheet-lifecycle.ts";
import { completeShortRest, finishShortRest, startShortRest } from "./rests.ts";

export function success<A, E>(result: Result.Result<A, E>): A {
  if (Result.isFailure(result)) throw new Error(JSON.stringify(result.failure));
  return result.success;
}
export function sheetAt(level = 5): CharacterSheet {
  return success(
    createFreshCharacterSheet({
      characterId: characterSheetId("character:memorize-spell"),
      build: buildFor("wizard", level),
      unitLibrary,
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
    }),
  );
}
export function fixture(sheet = sheetAt()) {
  const source = sheet.build.spellcasting?.sources[0];
  if (source === undefined) throw new Error("Wizard Spellcasting required");
  const removed = source.preparedSpells[0];
  const added = source.spellbook.find(
    (spell) => !source.preparedSpells.includes(spell),
  );
  if (removed === undefined || added === undefined)
    throw new Error("Prepared and spare spellbook spells required");
  return {
    sheet,
    source,
    replacement: {
      spellcastingSourceUnitId: source.sourceUnitId,
      removedSpellUnitId: removed,
      addedSpellUnitId: added,
    },
  };
}
export function rest(
  sheet: CharacterSheet,
  replacement?: CharacterSheetPreparedSpellRestReplacement,
) {
  const started = success(startShortRest({ sheet }));
  const completion = success(
    finishShortRest({ rest: started, restedTicks: elapsedTimeTicks(600) }),
  );
  return completeShortRest({
    completion,
    unitLibrary,
    ...(replacement === undefined
      ? {}
      : { preparedSpellReplacement: replacement }),
  });
}

export function wizardSpellcastingGainChoices(
  sheet: CharacterSheet,
): NonNullable<CharacterBuildClassLevelGain["gainedChoices"]> {
  return wizardSpellcastingGainChoicesForBuild(sheet.build);
}
