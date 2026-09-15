import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, test } from "vitest";
import { Result } from "effect";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { UnitRecord } from "@dnd/surface/surface/types";

import {
  characterBuildProficiencies,
  characterBuildUnitRefs,
  choiceCardinalityBounds,
  creationChoiceOptionId,
  finalizeCharacterDraft,
  type CharacterDraft,
  type CreationChoiceOptionId,
} from "./index.ts";
import { classFeatureGrantChoiceHoles } from "./discovery.ts";
import {
  CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
  CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
} from "./phase1-manifest.ts";
import {
  completeSupportedProgressionDraft,
  testProgression,
  testUnitChoiceSourceKey,
} from "./supported-progression-fill.test-support.ts";

// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-AUTHOR-BARD-EXPERTISE bard_expertise
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3MCHAR-02-BARD-EXPERTISE-L9-CLOSURE bard_expertise

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});

if (unitCatalogResult.tag !== "ok") {
  throw new Error("SRD Unit catalog test fixture must build successfully.");
}

const unitLibrary = unitCatalogResult.catalog;

describe("Bard Expertise", () => {
  test("finalizes two owned skills as Bard level-2 Expertise", () => {
    const bard = completeSupportedProgressionDraft({
      draftId: "draft:srd-level-2-bard-expertise",
      unitLibrary,
      progression: testProgression(
        unitLibrary,
        authoredUnitId("class_bard"),
        2,
      ),
      standardArrayAssignment: {
        str: 8,
        dex: 14,
        con: 13,
        int: 10,
        wis: 12,
        cha: 15,
      },
      preferredOptionIdsBySource: {
        [testUnitChoiceSourceKey(
          authoredUnitId("bard_expertise"),
          CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
        )]: [
          creationChoiceOptionId("athletics"),
          creationChoiceOptionId("intimidation"),
        ],
      },
    });
    const selectedExpertise = selectedChoiceOptionIds(
      bard,
      authoredUnitId("bard_expertise"),
      CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
    );

    expect(selectedExpertise).toEqual(["athletics", "intimidation"]);

    const bardBuild = finalizeCharacterDraft({ draft: bard, unitLibrary });
    expect(bardBuild.tag).toBe("ready");
    if (bardBuild.tag !== "ready") {
      return;
    }

    const proficiencies = expectRight(
      characterBuildProficiencies(bardBuild.build, unitLibrary),
    );
    expect(proficiencies.skills).toEqual(
      expect.arrayContaining(["athletics", "intimidation"]),
    );
    expect(proficiencies.expertise).toEqual(selectedExpertise);
    expect(
      bardBuild.build.spellcasting?.sources[0]?.preparedSpells,
    ).toHaveLength(5);
    expect(bardBuild.build.spellcasting?.slotPools.spellcasting?.slots).toEqual(
      [{ spellLevel: 1, count: 3 }],
    );
    expect(
      characterBuildUnitRefs(bardBuild.build, unitLibrary).map(
        (ref) => ref.unitId,
      ),
    ).toContain("bard_expertise");
  });

  test("rejects Bard Expertise choices that are not owned skill proficiencies", () => {
    const bard = completeSupportedProgressionDraft({
      draftId: "draft:srd-level-2-bard-invalid-expertise",
      unitLibrary,
      progression: testProgression(
        unitLibrary,
        authoredUnitId("class_bard"),
        2,
      ),
      standardArrayAssignment: {
        str: 8,
        dex: 14,
        con: 13,
        int: 10,
        wis: 12,
        cha: 15,
      },
      preferredOptionIdsBySource: {
        [testUnitChoiceSourceKey(
          authoredUnitId("class_bard"),
          CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
        )]: [
          creationChoiceOptionId("performance"),
          creationChoiceOptionId("persuasion"),
          creationChoiceOptionId("arcana"),
        ],
      },
    });
    const invalidExpertise: CharacterDraft = {
      ...bard,
      selections: {
        ...bard.selections,
        choices: bard.selections.choices.map((choice) =>
          choice.kind === "unitChoice" &&
          choice.source.unitId === "bard_expertise" &&
          choice.source.choiceKey === CLASS_FEATURE_PROFICIENCY_CHOICE_KEY
            ? {
                ...choice,
                options: choice.options.map((option, index) =>
                  index === 0
                    ? {
                        ...option,
                        optionId: creationChoiceOptionId("stealth"),
                      }
                    : option,
                ),
              }
            : choice,
        ),
      },
    };

    expect(
      finalizeCharacterDraft({ draft: invalidExpertise, unitLibrary }),
    ).toMatchObject({ tag: "invalid" });
  });

  test("discovers Bard level-9 Expertise as one four-skill owned-proficiency choice", () => {
    const holes = classFeatureGrantChoiceHoles(
      authoredUnitId("bard_expertise"),
      unitLibrary,
      {
        classLevel: 9,
        ownedSkillProficiencies: [
          "athletics",
          "intimidation",
          "performance",
          "persuasion",
          "stealth",
        ],
        ownedSkillExpertise: ["stealth"],
      },
    );

    expect(holes).toHaveLength(1);
    const [hole] = holes;
    expect(hole?.source).toMatchObject({
      tag: "unitChoice",
      unitId: "bard_expertise",
      choiceKey: CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
    });
    expect(choiceCardinalityBounds(hole.cardinality)).toEqual({
      min: 4,
      max: 4,
    });
    expect(hole.options.map((option) => option.optionId)).toEqual([
      "athletics",
      "intimidation",
      "performance",
      "persuasion",
    ]);
  });
});

function selectedChoiceOptionIds(
  draft: CharacterDraft,
  unitId: UnitRecord["id"],
  choiceKey: string,
): readonly CreationChoiceOptionId[] {
  return draft.selections.choices.flatMap((selection) =>
    selection.kind === "unitChoice" &&
    selection.source.unitId === unitId &&
    selection.source.choiceKey === choiceKey
      ? selection.options.map((option) => option.optionId)
      : [],
  );
}

function expectRight<T, E>(result: Result.Result<T, E>): T {
  if (Result.isFailure(result)) {
    throw new Error(
      `Expected Result.succeed, received ${JSON.stringify(result.failure)}`,
    );
  }
  expect(Result.isSuccess(result)).toBe(true);

  return result.success;
}
