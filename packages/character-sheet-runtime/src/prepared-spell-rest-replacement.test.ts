// KERNEL-COVERAGE: parity-witness CREATION.SPELL_ACCESS.WIZARD_PROGRESSION
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-creation.wizard-spellcasting-advancement
import { isCharacterSheetWithSpellSlots } from "./spell-slots.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection FEATURE-562 wizard_memorize_spell
// KERNEL-COVERAGE: parity-witness SHEET.SPELL_ACCESS.SHORT_REST_PREPARED_REPLACEMENT
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.prepared-spell-rest-replacement
import { describe, expect, test } from "vitest";
import { Array as EffectArray, Option, Result } from "effect";
import { projectFixtureCatalog } from "./class-feature-catalog.test-support.ts";
import { characterSheetWithPreparedSpellRestReplacement } from "./prepared-spell-rest-replacement.ts";
import { unitId } from "@dnd/shared/game-facts";
import { elapsedTimeTicks } from "@dnd/shared/elapsed-time";
import { finishShortRest, startShortRest } from "./rests.ts";
import {
  fixture,
  rest,
  sheetAt,
  success,
  wizardSpellcastingGainChoices,
} from "./prepared-spell-rest-replacement.test-support.ts";
describe("Spellbook prepared spell replacement on completed Short Rest", () => {
  test("real Wizard5 retains source, spellbook, slots and exactly replaces one prepared spell", () => {
    const { sheet, source, replacement } = fixture();
    const after = success(rest(sheet, replacement));
    const next = after.build.spellcasting?.sources[0];
    expect(next).toEqual({
      ...source,
      preparedSpells: source.preparedSpells.map((spell) =>
        spell === replacement.removedSpellUnitId
          ? replacement.addedSpellUnitId
          : spell,
      ),
    });
    expect(after.build.spellcasting?.slotPools).toEqual(
      sheet.build.spellcasting?.slotPools,
    );
    expect(after.spellSlotExpenditures).toEqual(sheet.spellSlotExpenditures);
    expect(success(rest(sheet)).build).toEqual(sheet.build);
  });
  test.each([
    "removedCantrip",
    "addedCantrip",
    "absentBook",
    "unprepared",
    "alreadyPrepared",
    "forgedSource",
    "missingFeature",
  ] as const)("rejects %s", (kind) => {
    const { sheet, source, replacement } = fixture(
      kind === "missingFeature" ? sheetAt(4) : undefined,
    );
    const changed = {
      ...replacement,
      ...(kind === "removedCantrip"
        ? { removedSpellUnitId: source.cantrips[0] ?? unitId("light") }
        : {}),
      ...(kind === "addedCantrip"
        ? { addedSpellUnitId: source.cantrips[0] ?? unitId("light") }
        : {}),
      ...(kind === "absentBook" ? { addedSpellUnitId: unitId("wish") } : {}),
      ...(kind === "unprepared"
        ? { removedSpellUnitId: replacement.addedSpellUnitId }
        : {}),
      ...(kind === "alreadyPrepared"
        ? { addedSpellUnitId: replacement.removedSpellUnitId }
        : {}),
      ...(kind === "forgedSource"
        ? { spellcastingSourceUnitId: unitId("class_cleric") }
        : {}),
    };
    expect(Result.isFailure(rest(sheet, changed))).toBe(true);
  });
  test("an incomplete Short Rest cannot offer preparation replacement", () => {
    const { sheet } = fixture();
    expect(
      Result.isFailure(
        finishShortRest({
          rest: success(startShortRest({ sheet })),
          restedTicks: elapsedTimeTicks(599),
        }),
      ),
    ).toBe(true);
  });
});

test("real Wizard4 advances to5 and retains its rest replacement grant", async () => {
  const { advanceCharacterBuildClassLevel, classUnitIdFromUnitId } =
    await import("@dnd/character-creation-runtime");
  const { unitLibrary } =
    await import("../../character-creation-runtime/src/repeated-feat-grants.test-support.ts");
  const sheet = sheetAt(4);
  const classId = success(
    classUnitIdFromUnitId({ unitLibrary, classUnitId: unitId("class_wizard") }),
  );
  const build = success(
    advanceCharacterBuildClassLevel({
      build: sheet.build,
      unitLibrary,
      levelGain: {
        tag: "classLevelGain",
        classUnitId: classId,
        hitPointRule: { tag: "fixedHigherLevelGain" },
        gainedChoices: wizardSpellcastingGainChoices(sheet),
      },
    }),
  );
  const { createFreshCharacterSheet } = await import("./sheet-lifecycle.ts");
  const { Hp } = await import("@dnd/shared/types");
  const rebuilt = success(
    createFreshCharacterSheet({
      characterId: sheet.characterId,
      build,
      unitLibrary,
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
    }),
  );
  expect(build.spellcasting?.sources[0]?.spellbook.length).toBe(
    (sheet.build.spellcasting?.sources[0]?.spellbook.length ?? 0) + 2,
  );
  expect(build.spellcasting?.sources[0]?.preparedSpells.length).toBe(9);
  const replacementFixture = fixture(rebuilt);
  expect(
    Result.isSuccess(
      rest(replacementFixture.sheet, replacementFixture.replacement),
    ),
  ).toBe(true);
});

test("Wizard level gain rejects missing, excess, duplicate and forged source choices", async () => {
  const { advanceCharacterBuildClassLevel, classUnitIdFromUnitId } =
    await import("@dnd/character-creation-runtime");
  const { unitLibrary } =
    await import("../../character-creation-runtime/src/repeated-feat-grants.test-support.ts");
  const sheet = sheetAt(4);
  const classId = success(
    classUnitIdFromUnitId({ unitLibrary, classUnitId: unitId("class_wizard") }),
  );
  const gains = wizardSpellcastingGainChoices(sheet);
  const base = {
    tag: "classLevelGain",
    classUnitId: classId,
    hitPointRule: { tag: "fixedHigherLevelGain" },
  } as const;
  for (const choices of [
    undefined,
    gains.slice(1),
    [...gains, ...gains],
    gains.map((gain) =>
      gain.kind === "unitChoice"
        ? { ...gain, featureUnitId: unitId("class_cleric") }
        : gain,
    ),
  ]) {
    expect(
      Result.isFailure(
        advanceCharacterBuildClassLevel({
          build: sheet.build,
          unitLibrary,
          levelGain: {
            ...base,
            ...(choices !== undefined &&
            EffectArray.isReadonlyArrayNonEmpty(choices)
              ? { gainedChoices: choices }
              : {}),
          },
        }),
      ),
    ).toBe(true);
  }
});

test("a forged high-level Spellbook entry cannot supply preparation without owning Wizard slots", () => {
  const { sheet, replacement } = fixture();
  if (!isCharacterSheetWithSpellSlots(sheet))
    throw new Error("Spellcasting fixture required");
  const { sources, ...spellcasting } = sheet.build.spellcasting;
  const [first, ...others] = sources;
  const forgedBook = {
    ...sheet,
    build: {
      ...sheet.build,
      spellcasting: {
        ...spellcasting,
        sources: [
          { ...first, spellbook: [...first.spellbook, unitId("disintegrate")] },
          ...others,
        ] as const,
      },
    },
  };
  expect(
    Result.isFailure(
      rest(forgedBook, {
        ...replacement,
        addedSpellUnitId: unitId("disintegrate"),
      }),
    ),
  ).toBe(true);
});

test("new Spell Slot access permits one owned bonus learning choice with its school and level", async () => {
  const {
    advanceCharacterBuildClassLevel,
    classUnitIdFromUnitId,
    creationChoiceOptionId,
  } = await import("@dnd/character-creation-runtime");
  const { unitLibrary } =
    await import("../../character-creation-runtime/src/repeated-feat-grants.test-support.ts");
  const sheet = sheetAt(4);
  const classId = success(
    classUnitIdFromUnitId({ unitLibrary, classUnitId: unitId("class_wizard") }),
  );
  const gains = wizardSpellcastingGainChoices(sheet);
  const base = {
    tag: "classLevelGain",
    classUnitId: classId,
    hitPointRule: { tag: "fixedHigherLevelGain" },
  } as const;
  const bonus = {
    kind: "unitChoice" as const,
    featureUnitId: unitId("wizard_evocation_savant"),
    choiceKey: "wizard_spellbook_choices" as const,
    optionIds: [creationChoiceOptionId("shatter")],
  };
  const learned = success(
    advanceCharacterBuildClassLevel({
      build: sheet.build,
      unitLibrary,
      levelGain: { ...base, gainedChoices: [...gains, bonus] },
    }),
  );
  expect(learned.spellcasting?.sources[0]?.spellbook).toContain(
    unitId("shatter"),
  );
  for (const invalid of [
    { ...bonus, featureUnitId: unitId("wizard_scholar") },
    { ...bonus, optionIds: [creationChoiceOptionId("shield")] },
    { ...bonus, optionIds: [creationChoiceOptionId("disintegrate")] },
    {
      ...bonus,
      optionIds: [
        creationChoiceOptionId("shatter"),
        creationChoiceOptionId("continual_flame"),
      ],
    },
  ]) {
    expect(
      Result.isFailure(
        advanceCharacterBuildClassLevel({
          build: sheet.build,
          unitLibrary,
          levelGain: { ...base, gainedChoices: [...gains, invalid] },
        }),
      ),
    ).toBe(true);
  }
});

test("a non-spellcasting character cannot offer preparation replacement", async () => {
  const { buildFor, unitLibrary } =
    await import("../../character-creation-runtime/src/repeated-feat-grants.test-support.ts");
  const { createFreshCharacterSheet } = await import("./sheet-lifecycle.ts");
  const { Hp } = await import("@dnd/shared/types");
  const { replacement, sheet } = fixture();
  const fighter = success(
    createFreshCharacterSheet({
      characterId: sheet.characterId,
      build: buildFor("fighter", 1),
      unitLibrary,
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
    }),
  );
  expect(
    characterSheetWithPreparedSpellRestReplacement({
      sheet: fighter,
      replacement,
      unitLibrary,
    }),
  ).toMatchObject({
    _tag: "Failure",
    failure: {
      message: "Prepared Spell replacement requires class Spellcasting.",
    },
  });
});

test.each([
  "absentClass",
  "nonSpellbookClass",
  "absentFeature",
  "missingTableRow",
] as const)(
  "preparation replacement rejects %s catalog evidence",
  async (kind) => {
    const { unitLibrary } =
      await import("../../character-creation-runtime/src/repeated-feat-grants.test-support.ts");
    const { sheet, replacement } = fixture();
    const catalog = projectFixtureCatalog(unitLibrary, (unit) => {
      if (
        kind === "absentClass" &&
        unit.id === replacement.spellcastingSourceUnitId
      )
        return Option.none();
      if (kind === "absentFeature" && unit.id === "wizard_memorize_spell")
        return Option.none();
      if (
        unit.kind === "class" &&
        unit.id === replacement.spellcastingSourceUnitId
      ) {
        if (kind === "nonSpellbookClass") {
          const nonSpellbookClass = unitLibrary.requireUnit("class_fighter");
          return Option.some({ ...nonSpellbookClass, id: unit.id });
        }
        if (
          kind === "missingTableRow" &&
          unit.className === "wizard" &&
          unit.spellcasting?.kind === "wizard_spellcasting_creation"
        ) {
          const rows = unit.spellcasting.spellcastingProgression.filter(
            (row) => row.atLevel !== 5,
          );
          if (!EffectArray.isReadonlyArrayNonEmpty(rows))
            throw new Error("Fixture must retain other table rows");
          return Option.some({
            ...unit,
            spellcasting: {
              ...unit.spellcasting,
              spellcastingProgression: rows,
            },
          });
        }
      }
      return Option.some(unit);
    });
    expect(
      Result.isFailure(
        characterSheetWithPreparedSpellRestReplacement({
          sheet,
          replacement,
          unitLibrary: catalog,
        }),
      ),
    ).toBe(true);
    expect(sheet.build.spellcasting?.sources[0]?.preparedSpells).toContain(
      replacement.removedSpellUnitId,
    );
  },
);
