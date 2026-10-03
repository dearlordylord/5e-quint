import { abilityScoreAssignment } from "@dnd/shared-algebras/ability-score-algebra";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection FEATURE-563 wizard_ability_score_improvement_l4
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection FEATURE-563 warlock_ability_score_improvement_l4
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection FEATURE-563 sorcerer_ability_score_improvement_l4
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection FEATURE-563 rogue_ability_score_improvement_l4
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection FEATURE-563 ranger_ability_score_improvement_l4
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection FEATURE-563 paladin_ability_score_improvement_l4
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection FEATURE-563 monk_ability_score_improvement_l4
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection FEATURE-563 fighter_ability_score_improvement_l4
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection FEATURE-563 druid_ability_score_improvement_l4
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection FEATURE-563 cleric_ability_score_improvement_l4
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection FEATURE-563 bard_ability_score_improvement_l4
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection FEATURE-563 barbarian_ability_score_improvement_l4
// KERNEL-COVERAGE: parity-witness CREATION.FEAT_GRANT_OCCURRENCE.CHOICE_LIFECYCLE
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-creation.feat-grant-occurrences
import { unitId, characterClassLevel } from "@dnd/shared/game-facts";
import { Result } from "effect";
import { describe, expect, test } from "vitest";
import {
  advanceCharacterBuildClassLevel,
  classUnitIdFromUnitId,
  creationChoiceOptionId,
  finalizeCharacterDraft,
  fighterLevelGainWithFightingStyleReplacement,
} from "./index.ts";

import {
  buildFor,
  draftFor,
  unitLibrary,
  classes,
} from "./repeated-feat-grants.test-support.ts";
describe("catalog-backed feat grant occurrences", () => {
  test.each(classes)(
    "%s level8 retains independent repeatable feat selections",
    (name) => {
      const build = buildFor(name, 8);
      expect(build.features).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: "selectedClassChoice",
            unitId: "feat_ability_score_improvement",
            selectedFromUnitId: `${name}_ability_score_improvement_l4`,
            selectedFromGrantLevel: characterClassLevel(8),
          }),
        ]),
      );
      expect(build.abilityScores.con).toBe(name === "fighter" ? 19 : 17);
    },
  );
  test("Fighter6 requests exactly one newly earned feat choice and retains level4", () => {
    const build = buildFor("fighter", 5);
    const parsedClass = classUnitIdFromUnitId({
      unitLibrary,
      classUnitId: unitId("class_fighter"),
    });
    if (Result.isFailure(parsedClass))
      throw new Error("Fighter class required");
    const levelGain = {
      tag: "classLevelGain",
      classUnitId: parsedClass.success,
      hitPointRule: { tag: "fixedHigherLevelGain" },
    } as const;
    expect(
      advanceCharacterBuildClassLevel({ build, unitLibrary, levelGain }),
    ).toMatchObject({ failure: { code: "invalidFeatChoiceGains" } });
    const choice = {
      kind: "feat" as const,
      featureUnitId: unitId("fighter_ability_score_improvement_l4"),
      grantLevel: characterClassLevel(6),
      selectedFeatUnitId: unitId("feat_ability_score_improvement"),
      abilityScoreIncreaseOptionId: creationChoiceOptionId(
        "ability_score:con:+2:max20",
      ),
    };
    const advanced = advanceCharacterBuildClassLevel({
      build,
      unitLibrary,
      levelGain: { ...levelGain, gainedChoices: [choice] },
    });
    expect(advanced).toMatchObject({ success: { abilityScores: { con: 17 } } });
    expect(
      advanceCharacterBuildClassLevel({
        build,
        unitLibrary,
        levelGain: { ...levelGain, gainedChoices: [choice, choice] },
      }),
    ).toMatchObject({ failure: { code: "invalidFeatChoiceGains" } });
    expect(
      advanceCharacterBuildClassLevel({
        build,
        unitLibrary,
        levelGain: {
          ...levelGain,
          gainedChoices: [{ ...choice, grantLevel: characterClassLevel(8) }],
        },
      }),
    ).toMatchObject({ failure: { code: "invalidFeatChoiceGains" } });
  });
  test("Champion7 retains an added style while Fighter8 replaces only primary style", () => {
    const build = buildFor("fighter", 7);
    const parsedClass = classUnitIdFromUnitId({
      unitLibrary,
      classUnitId: unitId("class_fighter"),
    });
    if (Result.isFailure(parsedClass))
      throw new Error("Fighter class required");
    const replacement = fighterLevelGainWithFightingStyleReplacement({
      unitLibrary,
      classUnitId: parsedClass.success,
      hitPointRule: { tag: "fixedHigherLevelGain" },
      selectedFeatUnitId: unitId("feat_great_weapon_fighting"),
    });
    if (Result.isFailure(replacement))
      throw new Error(JSON.stringify(replacement.failure));
    const advanced = advanceCharacterBuildClassLevel({
      build,
      unitLibrary,
      levelGain: {
        ...replacement.success,
        gainedChoices: [
          {
            kind: "feat",
            featureUnitId: unitId("fighter_ability_score_improvement_l4"),
            grantLevel: characterClassLevel(8),
            selectedFeatUnitId: unitId("feat_ability_score_improvement"),
            abilityScoreIncreaseOptionId: creationChoiceOptionId(
              "ability_score:con:+2:max20",
            ),
          },
        ],
      },
    });
    expect(advanced).toMatchObject({
      success: {
        features: expect.arrayContaining([
          {
            kind: "selectedClassChoice",
            selectedFromUnitId: "fighter_fighting_style",
            unitId: "feat_great_weapon_fighting",
          },
          {
            kind: "selectedClassChoice",
            selectedFromUnitId: "fighter_additional_fighting_style",
            unitId: "feat_archery",
          },
        ]),
      },
    });
  });
  test("Champion added style rejects omitted, duplicated, and forged selections", () => {
    const draft = draftFor("fighter", 7);
    const addedChoice = draft.selections.choices.find(
      (choice) =>
        choice.kind === "unitChoice" &&
        choice.source.unitId === "fighter_additional_fighting_style",
    );
    if (addedChoice === undefined || addedChoice.kind !== "unitChoice")
      throw new Error("Added style selection fixture required");
    const withoutAdded = {
      ...draft,
      selections: {
        ...draft.selections,
        choices: draft.selections.choices.filter(
          (choice) => choice !== addedChoice,
        ),
      },
    };
    expect(
      finalizeCharacterDraft({ draft: withoutAdded, unitLibrary }),
    ).toMatchObject({ tag: "incomplete" });
    const duplicate = {
      ...draft,
      selections: {
        ...draft.selections,
        choices: draft.selections.choices.map((choice) =>
          choice === addedChoice
            ? {
                ...addedChoice,
                options: [
                  {
                    optionId: creationChoiceOptionId("defense"),
                    unitRef: { unitId: unitId("defense") },
                  },
                ],
              }
            : choice,
        ),
      },
    };
    expect(
      finalizeCharacterDraft({ draft: duplicate, unitLibrary }),
    ).toMatchObject({ tag: "invalid" });
    const forged = {
      ...draft,
      selections: {
        ...draft.selections,
        choices: draft.selections.choices.map((choice) =>
          choice === addedChoice
            ? {
                ...addedChoice,
                source: {
                  ...addedChoice.source,
                  grantLevel: characterClassLevel(8),
                },
              }
            : choice,
        ),
      },
    };
    expect(
      finalizeCharacterDraft({ draft: forged, unitLibrary }),
    ).not.toMatchObject({ tag: "ready" });
  });
  test("repeated ASI rejects omitted and forged level8 occurrence and ability cap excess", () => {
    const draft = draftFor("fighter", 8);
    const feat = draft.selections.choices.find(
      (choice) =>
        choice.kind === "unitChoice" &&
        choice.source.unitId === "fighter_ability_score_improvement_l4" &&
        choice.source.grantLevel === 8 &&
        choice.source.choiceKey === "class_feature_feat_choice",
    );
    if (feat === undefined || feat.kind !== "unitChoice")
      throw new Error("Repeated ASI fixture required");
    const without = {
      ...draft,
      selections: {
        ...draft.selections,
        choices: draft.selections.choices.filter((choice) => choice !== feat),
      },
    };
    expect(
      finalizeCharacterDraft({ draft: without, unitLibrary }),
    ).not.toMatchObject({ tag: "ready" });
    const forged = {
      ...draft,
      selections: {
        ...draft.selections,
        choices: draft.selections.choices.map((choice) =>
          choice === feat
            ? {
                ...feat,
                source: { ...feat.source, grantLevel: characterClassLevel(7) },
              }
            : choice,
        ),
      },
    };
    expect(
      finalizeCharacterDraft({ draft: forged, unitLibrary }),
    ).not.toMatchObject({ tag: "ready" });
    const cap = {
      ...draft,
      selections: {
        ...draft.selections,
        choices: draft.selections.choices.map((choice) =>
          choice.kind === "unitChoice" &&
          choice.source.choiceKey ===
            "class_feature_ability_score_increase_choice"
            ? {
                ...choice,
                options: [
                  {
                    optionId: creationChoiceOptionId(
                      "ability_score:str:+2:max20",
                    ),
                  },
                ],
              }
            : choice,
        ),
      },
    };
    expect(finalizeCharacterDraft({ draft: cap, unitLibrary })).toMatchObject({
      tag: "invalid",
    });
  });
});

test("earlier ASI qualifies a later Grappler choice, whose own increase cannot supply its prerequisite", () => {
  const draft = draftFor("fighter", 8);
  const parsedScores = abilityScoreAssignment({
    str: 10,
    dex: 8,
    con: 13,
    int: 14,
    wis: 15,
    cha: 12,
  });
  if (Result.isFailure(parsedScores))
    throw new Error("Ordered feat standard array must parse");
  const scores = parsedScores.success;
  const choices = draft.selections.choices.map((choice) => {
    if (
      choice.kind !== "unitChoice" ||
      choice.source.unitId !== "fighter_ability_score_improvement_l4"
    )
      return choice;
    const level = choice.source.grantLevel ?? 4;
    if (choice.source.choiceKey === "class_feature_feat_choice" && level === 8)
      return {
        ...choice,
        options: [
          {
            optionId: creationChoiceOptionId("feat_grappler"),
            unitRef: { unitId: unitId("feat_grappler") },
          },
        ],
      };
    if (
      choice.source.choiceKey === "class_feature_ability_score_increase_choice"
    )
      return {
        ...choice,
        options: [
          {
            optionId: creationChoiceOptionId(
              level === 4
                ? "ability_score:str:+2:max20"
                : level === 6
                  ? "ability_score:con:+2:max20"
                  : "ability_score:str:+1:max20",
            ),
          },
        ],
      };
    return choice;
  });
  const legal = {
    ...draft,
    selections: {
      ...draft.selections,
      abilityScoreGeneration: {
        method: "standardArray" as const,
        assignedScores: scores,
      },
      backgroundAbilityScoreIncrease: {
        kind: "twoAndOne" as const,
        plusTwo: "con" as const,
        plusOne: "str" as const,
      },
      choices,
    },
  };
  expect(finalizeCharacterDraft({ draft: legal, unitLibrary })).toMatchObject({
    tag: "ready",
    build: { abilityScores: { str: 14 } },
  });
  const ownIncreaseOnly = {
    ...legal,
    selections: {
      ...legal.selections,
      backgroundAbilityScoreIncrease: {
        kind: "twoAndOne" as const,
        plusTwo: "str" as const,
        plusOne: "con" as const,
      },
      choices: choices.map((choice) =>
        choice.kind === "unitChoice" &&
        choice.source.unitId === "fighter_ability_score_improvement_l4" &&
        choice.source.grantLevel === undefined &&
        choice.source.choiceKey ===
          "class_feature_ability_score_increase_choice"
          ? {
              ...choice,
              options: [
                {
                  optionId: creationChoiceOptionId(
                    "ability_score:con:+2:max20",
                  ),
                },
              ],
            }
          : choice,
      ),
    },
  };
  expect(
    finalizeCharacterDraft({ draft: ownIncreaseOnly, unitLibrary }),
  ).toMatchObject({ tag: "invalid" });
});
