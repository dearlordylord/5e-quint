// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-creation.wizard-spellcasting-advancement
import { characterClassLevel, unitId } from "@dnd/shared/game-facts";
import { Array as EffectArray, Result } from "effect";
import { describe, expect, test } from "vitest";
import { updateWizardSpellcastingForClassLevelGain } from "./wizard-spellcasting-advancement.ts";
import {
  advanceCharacterBuildClassLevel,
  classUnitIdFromUnitId,
  creationChoiceOptionId,
  type CharacterBuild,
  type CharacterBuildClassLevelGain,
} from "./index.ts";
import {
  buildFor,
  unitLibrary,
  wizardSpellcastingGainChoicesForBuild,
} from "./repeated-feat-grants.test-support.ts";
function success<A, E>(result: Result.Result<A, E>): A {
  if (Result.isFailure(result)) throw new Error(JSON.stringify(result.failure));
  return result.success;
}
const initial = buildFor("wizard", 4);
const classUnitId = success(
  classUnitIdFromUnitId({ unitLibrary, classUnitId: unitId("class_wizard") }),
);
const gains = wizardSpellcastingGainChoicesForBuild(initial);
const base = {
  tag: "classLevelGain",
  classUnitId,
  hitPointRule: { tag: "fixedHigherLevelGain" },
} as const;
const bonus = {
  kind: "unitChoice",
  featureUnitId: unitId("wizard_evocation_savant"),
  choiceKey: "wizard_spellbook_choices",
  optionIds: [creationChoiceOptionId("shatter")],
} as const;
function advance(
  build: CharacterBuild,
  choices:
    | readonly NonNullable<
        CharacterBuildClassLevelGain["gainedChoices"]
      >[number][]
    | undefined,
) {
  return advanceCharacterBuildClassLevel({
    build,
    unitLibrary,
    levelGain: {
      ...base,
      ...(choices !== undefined && EffectArray.isReadonlyArrayNonEmpty(choices)
        ? { gainedChoices: choices }
        : {}),
    },
  });
}
function invalid(choices: Parameters<typeof advance>[1], build = initial) {
  expect(advance(build, choices)).toMatchObject({
    _tag: "Failure",
    failure: { code: "invalidWizardSpellcastingGains" },
  });
}
describe("Wizard source-owned advancement", () => {
  test("earns exactly two book spells and the table preparation delta on the public route", () => {
    const after = success(advance(initial, gains));
    expect(after.spellcasting?.sources[0]?.spellbook).toHaveLength(
      (initial.spellcasting?.sources[0]?.spellbook.length ?? 0) + 2,
    );
    expect(after.spellcasting?.sources[0]?.preparedSpells).toHaveLength(9);
    expect(after.spellcasting?.sources[0]?.cantrips).toEqual(
      initial.spellcasting?.sources[0]?.cantrips,
    );
    expect(after.spellcasting?.slotPools.spellcasting?.slots).toContainEqual({
      spellLevel: 3,
      count: 2,
    });
  });
  test("rejects absent, duplicate, overcounted and forged class choice sources", () => {
    invalid(undefined);
    invalid(gains.slice(1));
    invalid([...gains, ...gains]);
    invalid(
      gains.map((gain) => ({
        ...gain,
        featureUnitId: unitId("wizard_scholar"),
      })),
    );
    invalid([
      ...gains,
      {
        kind: "unitChoice",
        featureUnitId: classUnitId,
        choiceKey: "wizard_cantrip_choices",
        optionIds: [creationChoiceOptionId("light")],
      },
    ]);
  });
  test("requires an owned Wizard spellcasting aggregate and source", () => {
    const { spellcasting: omitted, ...withoutCasting } = initial;
    void omitted;
    invalid(gains, withoutCasting);
    if (initial.spellcasting === undefined)
      throw new Error("fixture has spellcasting");
    invalid(gains, {
      ...initial,
      spellcasting: {
        ...initial.spellcasting,
        sources: EffectArray.map(initial.spellcasting.sources, (source) => ({
          ...source,
          sourceUnitId: unitId("class_cleric"),
        })),
      },
    });
  });
  test("rejects held, duplicated, ineligible and unbooked normal choices", () => {
    const held = initial.spellcasting?.sources[0]?.spellbook[0];
    if (held === undefined) throw new Error("fixture book");
    const book = gains.find(
      (gain) =>
        gain.kind === "unitChoice" &&
        gain.choiceKey === "wizard_spellbook_choices",
    );
    if (book?.kind !== "unitChoice") throw new Error("fixture gain");
    for (const optionIds of [
      [creationChoiceOptionId(held), book.optionIds[1]!],
      [book.optionIds[0]!, book.optionIds[0]!],
      [creationChoiceOptionId("disintegrate"), book.optionIds[1]!],
    ])
      invalid(
        gains.map((gain) => (gain === book ? { ...book, optionIds } : gain)),
      );
    const prepared = gains.find(
      (gain) =>
        gain.kind === "unitChoice" &&
        gain.choiceKey === "wizard_prepared_spell_choices",
    );
    if (prepared?.kind !== "unitChoice") throw new Error("fixture prepared");
    for (const optionIds of [
      [creationChoiceOptionId("disintegrate"), prepared.optionIds[1]!],
      [prepared.optionIds[0]!, prepared.optionIds[0]!],
      [
        creationChoiceOptionId(
          initial.spellcasting!.sources[0]!.preparedSpells[0]!,
        ),
        prepared.optionIds[1]!,
      ],
    ])
      invalid(
        gains.map((gain) =>
          gain === prepared ? { ...prepared, optionIds } : gain,
        ),
      );
  });
  test("learns one eligible unheld school spell only on new-slot access", () => {
    const after = success(advance(initial, [...gains, bonus]));
    expect(after.spellcasting?.sources[0]?.spellbook).toContain(
      unitId("shatter"),
    );
    for (const selection of [
      { ...bonus, featureUnitId: unitId("wizard_scholar") },
      { ...bonus, choiceKey: "wizard_prepared_spell_choices" as const },
      { ...bonus, optionIds: [creationChoiceOptionId("shield")] },
      { ...bonus, optionIds: [creationChoiceOptionId("chain_lightning")] },
      {
        ...bonus,
        optionIds: [
          creationChoiceOptionId("shatter"),
          creationChoiceOptionId("continual_flame"),
        ],
      },
    ])
      invalid([...gains, selection]);
    invalid([...gains, bonus, bonus]);
  });
  test("earns a new cantrip at level four and rejects held or non-cantrip additions", () => {
    const build = buildFor("wizard", 3);
    const source = build.spellcasting?.sources[0];
    if (source === undefined) throw new Error("Wizard source");
    const baseChoices = wizardSpellcastingGainChoicesForBuild(build);
    const classChoices = baseChoices.map((choice) =>
      choice.kind === "unitChoice" &&
      choice.choiceKey === "wizard_prepared_spell_choices"
        ? { ...choice, optionIds: choice.optionIds.slice(0, 1) }
        : choice,
    );
    const feat = {
      kind: "feat",
      featureUnitId: unitId("wizard_ability_score_improvement_l4"),
      grantLevel: characterClassLevel(4),
      selectedFeatUnitId: unitId("feat_ability_score_improvement"),
      abilityScoreIncreaseOptionId: creationChoiceOptionId(
        "ability_score:con:+2:max20",
      ),
    } as const;
    const learned = {
      kind: "unitChoice",
      featureUnitId: classUnitId,
      choiceKey: "wizard_cantrip_choices",
      optionIds: [creationChoiceOptionId("light")],
    } as const;
    const choices = [...classChoices, feat, learned];
    const after = success(advance(build, choices));
    expect(after.spellcasting?.sources[0]?.cantrips).toContain(unitId("light"));
    for (const id of [source.cantrips[0]!, unitId("shield")])
      invalid(
        [
          ...classChoices,
          feat,
          { ...learned, optionIds: [creationChoiceOptionId(id)] },
        ],
        build,
      );
    invalid([...choices, { ...bonus }], build);
  });
  test("owning reducer rejects absent adjacent table rows before changing the retained source", () => {
    const classUnit = unitLibrary.requireUnit(classUnitId);
    if (
      classUnit.kind !== "class" ||
      !("spellcasting" in classUnit) ||
      classUnit.spellcasting?.kind !== "wizard_spellcasting_creation"
    )
      throw new Error("canonical Wizard facts");
    const exhausted = {
      ...initial,
      progression: {
        ...initial.progression,
        advancements: globalThis.Array.from({ length: 19 }, () => ({
          classUnitId,
          hitPointRule: base.hitPointRule,
        })),
      },
    };
    expect(
      updateWizardSpellcastingForClassLevelGain({
        build: exhausted,
        unitLibrary,
        classUnit,
        spellcastingFacts: classUnit.spellcasting,
        levelGain: base,
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        code: "invalidWizardSpellcastingGains",
        message:
          "Wizard advancement requires adjacent Spellcasting table rows.",
      },
    });
    expect(exhausted.spellcasting).toBe(initial.spellcasting);
  });
  test("qualifies each feat against earlier earned increases on advancement", () => {
    const fighter = buildFor("fighter", 5);
    const id = success(
      classUnitIdFromUnitId({
        unitLibrary,
        classUnitId: unitId("class_fighter"),
      }),
    );
    const gain = {
      tag: "classLevelGain",
      classUnitId: id,
      hitPointRule: { tag: "fixedHigherLevelGain" },
      gainedChoices: [
        {
          kind: "feat",
          featureUnitId: unitId("fighter_ability_score_improvement_l4"),
          grantLevel: characterClassLevel(6),
          selectedFeatUnitId: unitId("feat_ability_score_improvement"),
          abilityScoreIncreaseOptionId: creationChoiceOptionId(
            "ability_score:str:+2:max20",
          ),
        },
      ],
    } as const;
    const after = success(
      advanceCharacterBuildClassLevel({
        build: fighter,
        unitLibrary,
        levelGain: gain,
      }),
    );
    expect(after.abilityScores.str).toBe(Number(fighter.abilityScores.str) + 2);
    for (const bad of [
      { ...gain.gainedChoices[0], grantLevel: characterClassLevel(4) },
      { ...gain.gainedChoices[0], selectedFeatUnitId: unitId("feat_archery") },
      {
        ...gain.gainedChoices[0],
        abilityScoreIncreaseOptionId: creationChoiceOptionId(
          "ability_score:str:+3:max20",
        ),
      },
    ])
      expect(
        advanceCharacterBuildClassLevel({
          build: fighter,
          unitLibrary,
          levelGain: { ...gain, gainedChoices: [bad] },
        }),
      ).toMatchObject({
        _tag: "Failure",
        failure: { code: "invalidFeatChoiceGains" },
      });
  });
});

test("Wizard advancement projects only its owned spellcasting source in a multi-source aggregate", () => {
  const other = buildFor("cleric", 1).spellcasting?.sources[0];
  const owned = initial.spellcasting;
  const classUnit = unitLibrary.requireUnit(classUnitId);
  if (
    other === undefined ||
    owned === undefined ||
    classUnit.kind !== "class" ||
    classUnit.spellcasting?.kind !== "wizard_spellcasting_creation"
  )
    throw new Error("Canonical source and Wizard table required");
  const build = {
    ...initial,
    spellcasting: { ...owned, sources: [other, ...owned.sources] as const },
  };
  if (!EffectArray.isReadonlyArrayNonEmpty(gains))
    throw new Error("Earned gains required");
  const result = success(
    updateWizardSpellcastingForClassLevelGain({
      build,
      unitLibrary,
      classUnit,
      spellcastingFacts: classUnit.spellcasting,
      levelGain: { ...base, gainedChoices: gains },
    }),
  );
  expect(
    result.sources.find((source) => source.sourceUnitId === other.sourceUnitId),
  ).toBe(other);
  expect(
    result.sources.find((source) => source.sourceUnitId === classUnitId)
      ?.spellbook,
  ).toHaveLength((owned.sources[0]?.spellbook?.length ?? 0) + 2);
  expect(build.spellcasting.sources).toEqual([other, ...owned.sources]);
});
