// KERNEL-COVERAGE: parity-witness CREATION.FEAT_GRANT_OCCURRENCE.CHOICE_LIFECYCLE
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-creation.feat-grant-occurrences
import { characterClassLevel, unitId } from "@dnd/shared/game-facts";
import { Option, Result } from "effect";
import { expect, test } from "vitest";
import { classFeatureGrantChoiceHoles } from "./discovery.ts";
import {
  characterBuildFact,
  creationHoleFact,
  finalizeCharacterDraft,
} from "./index.ts";
import { buildFor } from "./repeated-feat-grants.test-support.ts";
import { draftFor, unitLibrary } from "./repeated-feat-grants.test-support.ts";
import {
  executableSupportIssues,
  finalizedSelections,
  finalizedClassChoiceFeaturesForSupportedChoices,
} from "./finalization.ts";
import {
  creationChoiceOptionId,
  parseUnitChoiceSourceKey,
  unitChoiceSourceUnitId,
  type FinalizedCharacterSelections,
} from "./types.ts";
const parsed = finalizedSelections(draftFor("fighter", 4));
if (parsed === undefined)
  throw new Error("Complete source selections required");
const selections = parsed;
test("oracle facts preserve earned occurrence evidence on choices and selected references", () => {
  const holes = classFeatureGrantChoiceHoles(
    unitId("fighter_ability_score_improvement_l4"),
    unitLibrary,
    { classLevel: 6, grantLevel: 6 },
  );
  expect(holes.map(creationHoleFact)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        source: expect.objectContaining({ grantLevel: 6 }),
      }),
    ]),
  );
  expect(characterBuildFact(buildFor("fighter", 8)).features).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: "selectedClassChoice",
        selectedFromGrantLevel: 8,
      }),
    ]),
  );
  const ranger = buildFor("ranger", 7);
  const owner = unitId("ranger_defensive_tactics");
  const feature = ranger.features.find(
    (f) => f.kind === "selectedClassChoice" && f.selectedFromUnitId === owner,
  );
  if (
    feature?.kind !== "selectedClassChoice" ||
    feature.selectedOption === undefined
  )
    throw new Error("Earned defense option required");
  const explicitOccurrence = {
    ...feature,
    selectedFromGrantLevel: characterClassLevel(7),
  };
  expect(
    characterBuildFact({
      ...ranger,
      features: ranger.features.map((f) =>
        f === feature ? explicitOccurrence : f,
      ),
    }).features,
  ).toContainEqual(explicitOccurrence);
});
test("canonical chosen source discovery supplies earned-level defaults and projects either Hunter choice", () => {
  const owner = unitId("bard_magical_discoveries");
  expect(classFeatureGrantChoiceHoles(owner, unitLibrary)).toEqual(
    classFeatureGrantChoiceHoles(owner, unitLibrary, { classLevel: 6 }),
  );
  expect(
    classFeatureGrantChoiceHoles(unitId("bard_expertise"), unitLibrary, {
      deferOwnedSkillExpertiseChoices: true,
    }),
  ).toEqual([]);
  const draft = draftFor("ranger", 3);
  for (const [option, selection] of [
    ["colossus_slayer", "woundedTargetWeaponDamage"],
    ["horde_breaker", "nearbyDifferentTargetSameWeaponAttack"],
  ] as const) {
    const result = finalizeCharacterDraft({
      unitLibrary,
      draft: {
        ...draft,
        selections: {
          ...draft.selections,
          choices: draft.selections.choices.map((choice) =>
            choice.kind === "unitChoice" &&
            choice.source.choiceKey === "hunters_prey"
              ? {
                  ...choice,
                  options: [{ optionId: creationChoiceOptionId(option) }],
                }
              : choice,
          ),
        },
      },
    });
    expect(result).toMatchObject({
      tag: "ready",
      build: {
        features: expect.arrayContaining([
          {
            kind: "selectedClassChoice",
            unitId: "ranger_hunters_prey",
            selectedFromUnitId: "ranger_hunters_prey",
            selectedOption: { kind: "huntersPrey", selection },
          },
        ]),
      },
    });
  }
});
function sourceId(value: string) {
  const result = unitChoiceSourceUnitId(value);
  if (Result.isFailure(result)) throw new Error("Source id required");
  return result.success;
}
function expectInvalid(choices: FinalizedCharacterSelections["choices"]) {
  expect(
    executableSupportIssues({ ...selections, choices }, unitLibrary),
  ).toContainEqual({
    tag: "unsupportedFinalization",
    cause: { tag: "selectedFeatPrerequisitesNotMet" },
  });
}
test("feat acquisition requires its canonical owning class and attained grant occurrence", () => {
  const feat = selections.choices.find(
    (choice) =>
      choice.kind === "unitChoice" &&
      choice.source.choiceKey === "class_feature_feat_choice" &&
      choice.source.unitId === "fighter_ability_score_improvement_l4",
  );
  if (feat?.kind !== "unitChoice") throw new Error("ASI selection required");
  const other = selections.choices.filter((choice) => choice !== feat);
  for (const source of [
    { ...feat.source, unitId: sourceId("aid") },
    { ...feat.source, unitId: sourceId("wizard_scholar") },
    { ...feat.source, grantLevel: characterClassLevel(8) },
  ])
    expectInvalid([...other, { ...feat, source }]);
  expectInvalid([
    ...other,
    {
      ...feat,
      options: feat.options.map((option) => ({ optionId: option.optionId })),
    },
  ]);
  const style = selections.choices.find(
    (choice) =>
      choice.kind === "unitChoice" &&
      choice.source.unitId === "fighter_fighting_style",
  );
  if (style === undefined) throw new Error("Style required");
  expectInvalid([...selections.choices, style]);
});
test("score selection decoding remains scoped to the feat acquisition before qualification", () => {
  const choices = selections.choices.map((choice) =>
    choice.kind === "unitChoice" &&
    choice.source.choiceKey === "class_feature_ability_score_increase_choice"
      ? {
          ...choice,
          options: [
            {
              optionId: creationChoiceOptionId(
                "synthetic_invalid_score_selection",
              ),
            },
          ],
        }
      : choice,
  );
  expectInvalid(choices);
});
test("a definition source cannot be substituted by a spell or feature record", () => {
  for (const background of [
    unitId("aid"),
    unitId("fighter_second_wind"),
    unitId("class_fighter"),
  ]) {
    expect(
      executableSupportIssues({ ...selections, background }, unitLibrary),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tag: "characterBuildProjection",
          cause: expect.objectContaining({
            tag: "unreadableUnit",
            role: "background",
            unitId: background,
          }),
        }),
      ]),
    );
  }
});
test("definition ownership rejects absent and substituted roots independently", () => {
  for (const [role, id] of [
    ["class", unitId("class_fighter")],
    ["background", selections.background],
    ["species", selections.species],
  ] as const) {
    for (const replacementId of [
      undefined,
      "aid",
      "fighter_second_wind",
      "class_wizard",
      selections.background,
      selections.species,
    ]) {
      const replacement =
        replacementId === undefined
          ? undefined
          : unitLibrary.requireUnit(replacementId);
      if (replacement?.kind === role) continue;
      const library = {
        ...unitLibrary,
        getUnit: (requested: Parameters<typeof unitLibrary.getUnit>[0]) =>
          requested === id
            ? replacement === undefined
              ? Option.none()
              : Option.some(replacement)
            : unitLibrary.getUnit(requested),
      };
      expect(executableSupportIssues(selections, library)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            tag: "characterBuildProjection",
            cause: expect.objectContaining({
              tag: replacement === undefined ? "unknownUnit" : "unreadableUnit",
              role,
              unitId: id,
            }),
          }),
        ]),
      );
    }
  }
});
test("occurrence source text admits canonical finite levels and rejects ambiguous suffixes", () => {
  const base =
    "u:36:fighter_ability_score_improvement_l4:c:class_feature_feat_choice";
  for (const suffix of ["0", "21", "4.5", "04", "NaN", "", "8:g:8"]) {
    expect(parseUnitChoiceSourceKey(`${base}:g:${suffix}`)).toMatchObject({
      _tag: "Failure",
      failure: { tag: "unitChoiceSourceKeyUnsupportedChoiceKey" },
    });
  }
  expect(Result.isSuccess(parseUnitChoiceSourceKey(`${base}:g:8`))).toBe(true);
});
test("both admitted defense options retain their selected source identity", () => {
  for (const [option, selection] of [
    ["escape_the_horde", "opportunityAttackDisadvantage"],
    ["multiattack_defense", "repeatAttackerAfterHitDisadvantage"],
  ] as const) {
    expect(
      finalizedClassChoiceFeaturesForSupportedChoices([
        {
          kind: "unitChoice",
          source: {
            tag: "unitChoice",
            unitId: sourceId("ranger_defensive_tactics"),
            choiceKey: "attack_roll_defense_choice",
          },
          options: [{ optionId: creationChoiceOptionId(option) }],
        },
      ]),
    ).toEqual([
      {
        kind: "selectedClassChoice",
        unitId: unitId("ranger_defensive_tactics"),
        selectedFromUnitId: unitId("ranger_defensive_tactics"),
        selectedOption: { kind: "attackRollDefense", selection },
      },
    ]);
  }
});
