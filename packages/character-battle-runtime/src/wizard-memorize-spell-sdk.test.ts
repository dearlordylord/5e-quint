// KERNEL-COVERAGE: parity-witness CREATION.SPELL_ACCESS.WIZARD_PROGRESSION
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-creation.wizard-spellcasting-advancement
import { combatantId } from "@dnd/battle-runtime";
import {
  advanceCharacterBuildClassLevel,
  classUnitIdFromUnitId,
} from "@dnd/character-creation-runtime";
import { unitId } from "@dnd/shared/game-facts";
import {
  elapsedTimeTicks,
  ELAPSED_TIME_TICKS_PER_HOUR,
} from "@dnd/shared/elapsed-time";
import {
  completeShortRest,
  finishShortRest,
  startShortRest,
} from "@dnd/character-sheet-runtime";
import { expect, test } from "vitest";
import {
  buildFor,
  unitLibrary,
} from "../../character-creation-runtime/src/repeated-feat-grants.test-support.ts";
import {
  wizardSpellcastingGainChoices,
  fixture,
  success,
} from "../../character-sheet-runtime/src/prepared-spell-rest-replacement.test-support.ts";
import {
  battleSessionFromSheets,
  characterSheet,
} from "./sdk-integration.test-support.ts";
import { settleCharacterSheetFromBattle } from "./index.ts";

test("Wizard4 gains level5 and replaces preparation at Short Rest before SDK battle roundtrip", () => {
  const actorId = combatantId("combatant:memorize-sdk");
  const before = characterSheet({
    characterIdText: "character:memorize-sdk",
    combatantId: actorId,
    build: buildFor("wizard", 4),
    initiative: 20,
    unitLibrary,
  });
  const classId = success(
    classUnitIdFromUnitId({ unitLibrary, classUnitId: unitId("class_wizard") }),
  );
  const build = success(
    advanceCharacterBuildClassLevel({
      build: before.sheet.build,
      unitLibrary,
      levelGain: {
        tag: "classLevelGain",
        classUnitId: classId,
        hitPointRule: { tag: "fixedHigherLevelGain" },
        gainedChoices: wizardSpellcastingGainChoices(before.sheet),
      },
    }),
  );
  const gained = characterSheet({
    ...before,
    characterIdText: before.sheet.characterId,
    build,
    unitLibrary,
  });
  const { source, replacement } = fixture(gained.sheet);
  const start = success(startShortRest({ sheet: gained.sheet }));
  const completion = success(
    finishShortRest({
      rest: start,
      restedTicks: elapsedTimeTicks(ELAPSED_TIME_TICKS_PER_HOUR),
    }),
  );
  const after = success(
    completeShortRest({
      completion,
      unitLibrary,
      preparedSpellReplacement: replacement,
    }),
  );
  expect(after.build.spellcasting?.sources[0]?.preparedSpells).toContain(
    replacement.addedSpellUnitId,
  );
  expect(after.build.spellcasting?.sources[0]?.preparedSpells).not.toContain(
    replacement.removedSpellUnitId,
  );
  expect(after.build.spellcasting?.sources[0]?.spellbook).toEqual(
    source.spellbook,
  );
  const session = battleSessionFromSheets({
    battleIdText: "battle:memorize-sdk",
    characters: [{ ...gained, sheet: after }],
    monsters: [],
  });
  const settled = success(
    settleCharacterSheetFromBattle({
      battleSession: session,
      combatantId: actorId,
      sheet: after,
      unitLibrary,
    }),
  );
  expect(settled.build.spellcasting).toEqual(after.build.spellcasting);
  expect(settled.spellSlotExpenditures).toEqual(after.spellSlotExpenditures);
});
