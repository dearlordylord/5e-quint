// KERNEL-COVERAGE: parity-witness CREATION.FEATURE.PROFICIENCY_CHOICE
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-creation.class-feature-proficiency-choice
import { Result } from "effect";
import { expect, test } from "vitest";
import { unitId } from "@dnd/shared/game-facts";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import {
  bardCreationAtLevel,
  bardGainSpellcastingLevel,
} from "./bard-feature-sdk.test-support.ts";
import { type CharacterBuildChoiceGain } from "./character-build-advancement.ts";
import { classUnitIdFromUnitId } from "./character-progression-algebra.ts";
import { characterBuildProficiencies } from "./finalization.ts";
import { creationChoiceOptionId } from "./types.ts";
const catalog = buildUnitCatalog({ collections: [srdUnitCollection] });
if (catalog.tag !== "ok") throw new Error("Catalog required");
const unitLibrary = catalog.catalog;
const classId = classUnitIdFromUnitId({
  unitLibrary,
  classUnitId: unitId("class_bard"),
});
if (Result.isFailure(classId)) throw new Error("Bard owner required");
const bardClassId = classId.success;
const two = bardCreationAtLevel(2, unitLibrary).build;
const three = bardCreationAtLevel(3, unitLibrary).draft;
const gains = three.selections.choices.flatMap(
  (choice): CharacterBuildChoiceGain[] =>
    choice.kind === "unitChoice" &&
    (choice.source.choiceKey === "class_subclass_choice" ||
      choice.source.unitId === "bard_bonus_proficiencies")
      ? [
          {
            kind: "unitChoice",
            featureUnitId: choice.source.unitId,
            choiceKey: choice.source.choiceKey,
            optionIds: choice.options.map((option) => option.optionId),
          },
        ]
      : [],
);
function advance(gainedChoices: readonly CharacterBuildChoiceGain[]) {
  return bardGainSpellcastingLevel({
    build: two,
    nextLevel: 3,
    gainedChoices,
    unitLibrary,
  });
}
test("canonical Bard2→3 subclass and exactly three unowned skill selections advance together", () => {
  const result = advance(gains);
  if (Result.isFailure(result)) throw new Error(JSON.stringify(result.failure));
  const before = characterBuildProficiencies(two, unitLibrary),
    after = characterBuildProficiencies(result.success, unitLibrary);
  if (Result.isFailure(before) || Result.isFailure(after))
    throw new Error("Skills required");
  expect(
    after.success.skills.filter(
      (skill) => !before.success.skills.includes(skill),
    ),
  ).toHaveLength(3);
  expect(result.success.features).toContainEqual({
    kind: "selectedClassChoice",
    unitId: unitId("subclass_bard_college_of_lore"),
    selectedFromUnitId: bardClassId,
  });
});
test("missing, excess, duplicate, unearned and already owned gained skill choices are rejected", () => {
  const skills = gains.find(
    (gain) =>
      gain.kind === "unitChoice" &&
      gain.featureUnitId === "bard_bonus_proficiencies",
  );
  if (skills?.kind !== "unitChoice") throw new Error("Skill grant required");
  const first = skills.optionIds[0];
  if (first === undefined) throw new Error("Skill option required");
  const replace = (replacement: CharacterBuildChoiceGain) =>
    gains.map((gain) => (gain === skills ? replacement : gain));
  for (const choices of [
    [],
    gains.filter((gain) => gain !== skills),
    [...gains, skills],
    replace({ ...skills, optionIds: [first, first, first] }),
    replace({ ...skills, optionIds: [creationChoiceOptionId("perception")] }),
    replace({
      ...skills,
      optionIds: [
        creationChoiceOptionId("athletics"),
        creationChoiceOptionId("medicine"),
        creationChoiceOptionId("religion"),
      ],
    }),
    [...gains, { ...skills, featureUnitId: unitId("fighter_second_wind") }],
    replace({ ...skills, choiceKey: "class_feature_language_choice" }),
  ])
    expect(advance(choices)).toMatchObject({
      _tag: "Failure",
      failure: { code: "invalidClassLevelChoices" },
    });
});
