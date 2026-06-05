import { describe, expect, test } from "vitest";
import { Either } from "effect";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { UnitRecord } from "@dnd/surface/surface/types";
import type { AbilityScoreAssignment as RawAbilityScoreAssignment } from "@dnd/shared-algebras/ability-score-algebra";

import {
  abilityScoreAssignment,
  characterBuildProficiencies,
  characterBuildUnitRefs,
  characterDraftId,
  choiceCardinalityBounds,
  classUnitIdFromUnitId,
  createCharacterDraft,
  creationChoiceOptionId,
  discoverCreationHoles,
  fillCreationHoles,
  finalizeCharacterDraft,
  unitChoiceSourceKey,
  unitChoiceSourceUnitId,
  type AbilityScoreAssignment,
  type CharacterDraft,
  type CharacterProgression,
  type CreationChoiceOptionId,
  type CreationFill,
  type CreationHole,
  type UnitChoiceKey,
} from "./index.ts";
import { parseCharacterProgressionShape } from "./character-progression-algebra.ts";
import { classFeatureGrantChoiceHoles } from "./discovery.ts";
import {
  CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
  CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
  progressionOptionId,
} from "./phase1-manifest.ts";
import { supportedHoleOptionIds } from "./support-gates.ts";
import { soldierBackgroundFixtureOptionIds } from "./background-fixture.test-support.ts";

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
      progression: testProgression("class_bard", 2),
      preferredOptionIdsBySource: {
        [testUnitChoiceSourceKey(
          "bard_expertise",
          CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
        )]: [
          creationChoiceOptionId("athletics"),
          creationChoiceOptionId("intimidation"),
        ],
      },
    });
    const selectedExpertise = selectedChoiceOptionIds(
      bard,
      "bard_expertise",
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
      progression: testProgression("class_bard", 2),
      preferredOptionIdsBySource: {
        [testUnitChoiceSourceKey(
          "class_bard",
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
    const holes = classFeatureGrantChoiceHoles("bard_expertise", unitLibrary, {
      classLevel: 9,
      ownedSkillProficiencies: [
        "athletics",
        "intimidation",
        "performance",
        "persuasion",
        "stealth",
      ],
      ownedSkillExpertise: ["stealth"],
    });

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

function testProgression(
  classUnitId: UnitRecord["id"],
  classLevel: number,
): CharacterProgression {
  const parsedClassUnitId = classUnitIdFromUnitId({ unitLibrary, classUnitId });
  if (Either.isLeft(parsedClassUnitId)) {
    throw new Error(
      `Invalid test class Unit id: ${JSON.stringify(parsedClassUnitId.left)}`,
    );
  }
  const result = parseCharacterProgressionShape({
    startingClass: parsedClassUnitId.right,
    advancements: Array.from({ length: classLevel - 1 }, () => ({
      classUnitId: parsedClassUnitId.right,
      hitPointRule: { tag: "fixedHigherLevelGain" as const },
    })),
  });
  if (Either.isLeft(result)) {
    throw new Error(`Invalid test progression: ${JSON.stringify(result.left)}`);
  }

  return result.right;
}

type PreferredSupportedFillOptionIdsBySource = Readonly<
  Record<string, readonly CreationChoiceOptionId[]>
>;

function completeSupportedProgressionDraft(input: {
  readonly draftId: string;
  readonly progression: CharacterProgression;
  readonly preferredOptionIdsBySource?: PreferredSupportedFillOptionIdsBySource;
}): CharacterDraft {
  let draft = createCharacterDraft({
    unitLibrary,
    draftId: characterDraftId(input.draftId),
  });
  const progressionOption = progressionOptionId(input.progression);

  for (let pass = 0; pass < 8; pass += 1) {
    const holes = discoverCreationHoles({ draft, unitLibrary });
    if (holes.length === 0) {
      return draft;
    }

    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: holes.map((hole) =>
        supportedFillForHole({
          hole,
          ...(input.preferredOptionIdsBySource === undefined
            ? {}
            : {
                preferredOptionIdsBySource: input.preferredOptionIdsBySource,
              }),
          progressionOption,
        }),
      ),
    });
    if (result.tag !== "accepted") {
      throw new Error(
        `Expected accepted character-creation fill batch, received ${JSON.stringify(result.issues)}`,
      );
    }
    draft = result.draft;
  }

  throw new Error(
    `Supported progression fixture still has holes after iterative fills: ${JSON.stringify(
      discoverCreationHoles({ draft, unitLibrary }).map((hole) => hole.holeId),
    )}`,
  );
}

function supportedFillForHole(input: {
  readonly hole: CreationHole;
  readonly preferredOptionIdsBySource?: PreferredSupportedFillOptionIdsBySource;
  readonly progressionOption: CreationChoiceOptionId;
}): CreationFill {
  if (input.hole.kind === "abilityScores") {
    return {
      kind: "abilityScores",
      holeId: input.hole.holeId,
      method: "standardArray",
      value: testAbilityScoreAssignment({
        str: 8,
        dex: 14,
        con: 13,
        int: 10,
        wis: 12,
        cha: 15,
      }),
    };
  }

  const supportedOptionIds = supportedHoleOptionIds(input.hole);
  if (supportedOptionIds === undefined) {
    throw new Error(
      `No support-profile options for discovered test hole: ${input.hole.holeId}`,
    );
  }
  const supportedOptionIdSet = new Set(supportedOptionIds);
  const holeOptionIds = input.hole.options.map((option) => option.optionId);
  const preferredOptionIds =
    input.hole.source.tag === "draft" &&
    input.hole.source.path === "draft.progression.initial"
      ? [input.progressionOption]
      : input.hole.source.tag === "draft" &&
          input.hole.source.path === "draft.background"
        ? [creationChoiceOptionId("background_soldier")]
        : input.hole.source.tag === "unitChoice"
          ? (input.preferredOptionIdsBySource?.[
              unitChoiceSourceKey(input.hole.source)
            ] ?? soldierBackgroundFixtureOptionIds(input.hole.source))
          : undefined;
  const holeOptionIdSet = new Set(holeOptionIds);
  const selectedOptionIds = (preferredOptionIds ?? holeOptionIds)
    .filter((optionId) => holeOptionIdSet.has(optionId))
    .filter((optionId) => supportedOptionIdSet.has(optionId))
    .slice(0, choiceCardinalityBounds(input.hole.cardinality).max);
  if (
    selectedOptionIds.length <
    choiceCardinalityBounds(input.hole.cardinality).max
  ) {
    throw new Error(
      `Not enough supported options for discovered test hole: ${input.hole.holeId}`,
    );
  }

  return {
    kind: "choice",
    holeId: input.hole.holeId,
    optionIds: selectedOptionIds,
  };
}

function testAbilityScoreAssignment(
  scores: RawAbilityScoreAssignment,
): AbilityScoreAssignment {
  const parsed = abilityScoreAssignment(scores);
  if (Either.isLeft(parsed)) {
    throw new Error(
      "Test fixture ability scores must be valid AbilityScore values.",
    );
  }
  return parsed.right;
}

function testUnitChoiceSourceKey(
  unitId: UnitRecord["id"],
  choiceKey: UnitChoiceKey,
): string {
  const sourceUnitId = unitChoiceSourceUnitId(unitId);
  if (Either.isLeft(sourceUnitId)) {
    throw new Error(
      `Invalid test Unit choice source Unit id: ${JSON.stringify(sourceUnitId.left)}`,
    );
  }

  return unitChoiceSourceKey({
    tag: "unitChoice",
    unitId: sourceUnitId.right,
    choiceKey,
  });
}

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

function expectRight<T, E>(result: Either.Either<T, E>): T {
  if (Either.isLeft(result)) {
    throw new Error(
      `Expected Either.right, received ${JSON.stringify(result.left)}`,
    );
  }
  expect(Either.isRight(result)).toBe(true);

  return result.right;
}
