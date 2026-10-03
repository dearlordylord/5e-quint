// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection FEATURE-571 bard_magical_discoveries
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection FEATURE-558 bard_font_of_inspiration
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection FEATURE-567 bard_bonus_proficiencies
// KERNEL-COVERAGE: parity-witness CREATION.FEATURE.PROFICIENCY_CHOICE
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-creation.class-feature-proficiency-choice
// KERNEL-COVERAGE: parity-witness CREATION.SPELL_ACCESS.CHOSEN_PREPARED_PAIR
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-creation.chosen-prepared-spell-access
// KERNEL-COVERAGE: parity-witness SHEET.FEATURE_RESOURCES.USE_COUNT_RECOVERY
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.use-count-resource-recovery
// RAW: .references/srd-5.2.1/classes.md:908-912,1729-1731,1737-1742.
import { describe, expect, test } from "vitest";
import { Option, Result } from "effect";
import { unitId } from "@dnd/shared/game-facts";
import { resourceCount, spellSlotLevel } from "@dnd/shared/types";
import {
  advanceCharacterBuildClassLevel,
  classUnitIdFromUnitId,
  creationChoiceOptionId,
  characterBuildFeatureUnitIds,
  type CharacterBuild,
  type CharacterBuildChoiceGain,
} from "@dnd/character-creation-runtime";
import {
  bardCreationAtLevel,
  bardGainSpellcastingLevel,
} from "../../character-creation-runtime/src/bard-feature-sdk.test-support.ts";
import {
  characterSheetSpellSlotSourceState,
  replaceCharacterSheetSpellSlotSourceState,
  restoreUseCountResourceWithSpellSlot,
  characterSheetResources,
  characterSheetSpellSlots,
  characterSheetClassFeaturePreparedSpellAccessesForBuild,
  startShortRest,
  finishShortRest,
  completeShortRest,
  startLongRest,
  finishLongRest,
  completeLongRest,
  CHARACTER_SHEET_SHORT_REST_TICKS,
  CHARACTER_SHEET_LONG_REST_BASE_TICKS,
} from "@dnd/character-sheet-runtime";
import { combatantId } from "@dnd/battle-runtime";
import {
  characterSheet,
  battleSessionFromSheets,
  unitLibrary,
} from "./sdk-integration.test-support.ts";
import { eligibleChosenPreparedSpellIds } from "../../character-creation-runtime/src/chosen-prepared-spell-access.ts";
import { parseCharacterBuild } from "../../character-sheet-runtime/src/stored-sheet-parser.ts";

function success<A, E>(result: Result.Result<A, E>): A {
  if (Result.isFailure(result)) throw new Error(JSON.stringify(result.failure));
  return result.success;
}
const bard = success(
  classUnitIdFromUnitId({ unitLibrary, classUnitId: unitId("class_bard") }),
);
const creation = (level: number) => bardCreationAtLevel(level, unitLibrary);
const gain = (
  build: CharacterBuild,
  nextLevel: number,
  gainedChoices: readonly CharacterBuildChoiceGain[] = [],
) =>
  bardGainSpellcastingLevel({ build, nextLevel, gainedChoices, unitLibrary });
function fixture(build: CharacterBuild, expended = 0) {
  return characterSheet({
    characterIdText: "character:lore-sdk",
    combatantId: combatantId("bard:lore-sdk"),
    build,
    initiative: 20,
    resourceExpenditures:
      expended === 0
        ? []
        : [
            {
              tag: "useCountResource",
              unitId: unitId("bard_bardic_inspiration"),
              expended: resourceCount(expended),
            },
          ],
  });
}
function expenditure(sheet: ReturnType<typeof fixture>["sheet"]) {
  return success(characterSheetResources(sheet, unitLibrary)).find(
    (resource) =>
      resource.tag === "useCountResource" &&
      resource.unitId === unitId("bard_bardic_inspiration"),
  )?.expended;
}
describe("Bard real-catalog SDK creation and class-level gain", () => {
  test("plain class level gain cannot bypass newly required Spellcasting selections", () => {
    const five = creation(5).build;
    const result = advanceCharacterBuildClassLevel({
      build: five,
      unitLibrary,
      levelGain: {
        tag: "classLevelGain",
        classUnitId: bard,
        hitPointRule: { tag: "fixedHigherLevelGain" },
        gainedChoices: [
          {
            kind: "preparedSpellAccess",
            featureUnitId: unitId("bard_magical_discoveries"),
            spellIds: [unitId("fire_bolt"), unitId("aid")],
          },
        ],
      },
    });
    expect(Result.isFailure(result)).toBe(true);
    expect(
      success(
        gain(five, 6, [
          {
            kind: "preparedSpellAccess",
            featureUnitId: unitId("bard_magical_discoveries"),
            spellIds: [unitId("fire_bolt"), unitId("aid")],
          },
        ]),
      ).spellcasting?.sources[0]?.preparedSpells,
    ).toHaveLength(10);
  });
  test("Bard2 gains Lore3 and exactly three legal skills, retained by storage and sheet", () => {
    const two = creation(2).build;
    const three = creation(3);
    const skills = three.draft.selections.choices.find(
      (choice) =>
        choice.kind === "unitChoice" &&
        choice.source.unitId === unitId("bard_bonus_proficiencies"),
    );
    if (skills === undefined || skills.kind !== "unitChoice")
      throw new Error("Expected canonical skill selection");
    const choices: readonly CharacterBuildChoiceGain[] = [
      {
        kind: "unitChoice",
        featureUnitId: bard,
        choiceKey: "class_subclass_choice",
        optionIds: [creationChoiceOptionId("subclass_bard_college_of_lore")],
      },
      {
        kind: "unitChoice",
        featureUnitId: unitId("bard_bonus_proficiencies"),
        choiceKey: "class_feature_proficiency_choice",
        optionIds: skills.options.map((option) => option.optionId),
      },
    ];
    const advanced = success(gain(two, 3, choices));
    expect(
      advanced.proficiencyChoices.filter((choice) => choice.kind === "skill"),
    ).toHaveLength(6);
    expect(
      success(
        parseCharacterBuild(JSON.parse(JSON.stringify(advanced)), unitLibrary),
      ).proficiencyChoices,
    ).toEqual(advanced.proficiencyChoices);
    expect(fixture(advanced).sheet.build.proficiencyChoices).toEqual(
      advanced.proficiencyChoices,
    );
    expect(
      gain(two, 3, [
        choices[0]!,
        {
          ...choices[1]!,
          kind: "unitChoice",
          featureUnitId: unitId("bard_bonus_proficiencies"),
          choiceKey: "class_feature_proficiency_choice",
          optionIds: [
            creationChoiceOptionId("history"),
            creationChoiceOptionId("history"),
            creationChoiceOptionId("medicine"),
          ],
        },
      ])._tag,
    ).toBe("Failure");
    expect(
      gain(two, 3, [
        choices[0]!,
        {
          kind: "unitChoice",
          featureUnitId: unitId("bard_bonus_proficiencies"),
          choiceKey: "class_feature_proficiency_choice",
          optionIds: [
            creationChoiceOptionId("history"),
            creationChoiceOptionId("medicine"),
            creationChoiceOptionId("invalid_skill"),
          ],
        },
      ])._tag,
    ).toBe("Failure");
  });
  test("Bard4 gains Font5 and source-linked rest and no-action exchange use the existing pool", () => {
    const build = success(gain(creation(4).build, 5));
    expect(characterBuildFeatureUnitIds(build, unitLibrary)).toContain(
      unitId("bard_font_of_inspiration"),
    );
    const sheet = fixture(build, 1).sheet;
    const exchanged = success(
      restoreUseCountResourceWithSpellSlot({
        sheet,
        unitLibrary,
        featureUnitId: unitId("bard_font_of_inspiration"),
        spellLevel: spellSlotLevel(1),
      }),
    );
    expect(expenditure(exchanged)).toBe(0);
    expect(
      characterSheetSpellSlots(exchanged)?.find((slot) => slot.spellLevel === 1)
        ?.expended,
    ).toBe(1);
    const slotState = characterSheetSpellSlotSourceState(sheet);
    if (slotState === undefined)
      throw new Error("Expected Bard ordinary slots");
    const depleted = success(
      replaceCharacterSheetSpellSlotSourceState({
        sheet,
        unitLibrary,
        spellSlotState: {
          ...slotState,
          ordinarySpellSlotExpenditures: [
            { spellLevel: spellSlotLevel(1), expended: resourceCount(4) },
          ],
        },
      }),
    );
    expect(
      restoreUseCountResourceWithSpellSlot({
        sheet: depleted,
        unitLibrary,
        featureUnitId: unitId("bard_font_of_inspiration"),
        spellLevel: spellSlotLevel(1),
      })._tag,
    ).toBe("Failure");
    expect(expenditure(depleted)).toBe(1);
    const started = success(startShortRest({ sheet }));
    const completion = success(
      finishShortRest({
        rest: started,
        restedTicks: CHARACTER_SHEET_SHORT_REST_TICKS,
      }),
    );
    expect(
      expenditure(success(completeShortRest({ completion, unitLibrary }))),
    ).toBe(0);
    const longRest = success(
      startLongRest({ sheet, timing: { tag: "noPriorLongRest" } }),
    );
    const longCompletion = success(
      finishLongRest({
        rest: longRest,
        restedTicks: CHARACTER_SHEET_LONG_REST_BASE_TICKS,
      }),
    );
    expect(
      expenditure(
        success(completeLongRest({ completion: longCompletion, unitLibrary })),
      ),
    ).toBe(0);
    expect(
      restoreUseCountResourceWithSpellSlot({
        sheet: exchanged,
        unitLibrary,
        featureUnitId: unitId("bard_font_of_inspiration"),
        spellLevel: spellSlotLevel(1),
      })._tag,
    ).toBe("Failure");
    expect(
      restoreUseCountResourceWithSpellSlot({
        sheet,
        unitLibrary,
        featureUnitId: unitId("bard_bardic_inspiration"),
        spellLevel: spellSlotLevel(1),
      })._tag,
    ).toBe("Failure");
  });
  test("Lore5 gains two always-prepared spells at6, replaces one at7 and retains canonical access into battle", () => {
    const choice: CharacterBuildChoiceGain = {
      kind: "preparedSpellAccess",
      featureUnitId: unitId("bard_magical_discoveries"),
      spellIds: [unitId("fire_bolt"), unitId("revivify")],
    };
    const five = creation(5).build;
    const six = success(gain(five, 6, [choice]));
    const seven = success(
      gain(six, 7, [
        { ...choice, spellIds: [unitId("fire_bolt"), unitId("aid")] },
      ]),
    );
    const sheet = fixture(seven);
    expect(
      characterSheetClassFeaturePreparedSpellAccessesForBuild({
        build: seven,
        unitLibrary,
      }),
    ).toContainEqual({
      sourceUnitId: unitId("bard_magical_discoveries"),
      spellIds: [unitId("fire_bolt"), unitId("aid")],
    });
    expect(
      success(
        parseCharacterBuild(JSON.parse(JSON.stringify(seven)), unitLibrary),
      ).features,
    ).toEqual(seven.features);
    expect(
      parseCharacterBuild(
        {
          ...seven,
          features: seven.features.map((feature) =>
            feature.kind === "selectedPreparedSpellAccess"
              ? {
                  ...feature,
                  selectedFromUnitId: unitId("bard_bardic_inspiration"),
                }
              : feature,
          ),
        },
        unitLibrary,
      )._tag,
    ).toBe("Failure");
    expect(
      parseCharacterBuild(
        {
          ...seven,
          features: seven.features.map((feature) =>
            feature.kind === "selectedPreparedSpellAccess"
              ? {
                  ...feature,
                  spellIds: [unitId("fire_bolt"), unitId("mass_cure_wounds")],
                }
              : feature,
          ),
        },
        unitLibrary,
      )._tag,
    ).toBe("Failure");
    const session = battleSessionFromSheets({
      battleIdText: "battle:lore-spell-access",
      characters: [sheet],
      monsters: [],
    });
    expect(session.context.characters.has(sheet.combatantId)).toBe(true);
    expect(
      gain(six, 7, [
        { ...choice, spellIds: [unitId("cure_wounds"), unitId("aid")] },
      ])._tag,
    ).toBe("Failure");
    expect(
      gain(five, 6, [
        { ...choice, spellIds: [unitId("fire_bolt"), unitId("fire_bolt")] },
      ])._tag,
    ).toBe("Failure");
    expect(
      gain(five, 6, [
        { ...choice, spellIds: [unitId("eldritch_blast"), unitId("aid")] },
      ])._tag,
    ).toBe("Failure");
    expect(
      gain(five, 6, [
        {
          ...choice,
          spellIds: [unitId("fire_bolt"), unitId("mass_cure_wounds")],
        },
      ])._tag,
    ).toBe("Failure");
    expect(gain(five, 6)).toMatchObject({
      failure: { code: "invalidPreparedSpellAccessGain" },
    });
    const source = unitLibrary.getUnit(unitId("bard_magical_discoveries"));
    if (Option.isNone(source) || source.value.kind !== "class_feature")
      throw new Error("Expected source");
    expect(
      eligibleChosenPreparedSpellIds({
        feature: source.value,
        classLevel: 6,
        unitLibrary,
      }),
    ).not.toContain(unitId("mass_cure_wounds"));
  });
});
