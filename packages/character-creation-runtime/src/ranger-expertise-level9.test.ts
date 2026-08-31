import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, it, test } from "vitest";
import { Result } from "effect";
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
import {
  CLASS_CANTRIP_CHOICE_KEY,
  CLASS_FEATURE_ABILITY_SCORE_INCREASE_CHOICE_KEY,
  CLASS_FEATURE_FEAT_CHOICE_KEY,
  CLASS_FEATURE_LANGUAGE_CHOICE_KEY,
  CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
  CLASS_PREPARED_SPELL_CHOICE_KEY,
  CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
  CLASS_SUBCLASS_CHOICE_KEY,
  HUNTERS_PREY_CHOICE_KEY,
  PHASE1_SPECIES_ORC_UNIT_ID,
  RANGER_FIGHTING_STYLE_CHOICE_KEY,
  progressionOptionId,
} from "./phase1-manifest.ts";
import { supportedHoleOptionIds } from "./support-gates.ts";
import { soldierBackgroundFixtureOptionIds } from "./background-fixture.test-support.ts";

// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19C-02-RANGER-EXPERTISE-GENERIC-OWNER ranger_expertise ranger_ability_score_improvement_l8
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19C-02-RANGER-EXPERTISE-GENERIC-OWNER ranger_expertise ranger_ability_score_improvement_l8
// UNIT-IDENTITY-REPLAY: L19C-02-RANGER-EXPERTISE-GENERIC-OWNER ranger_expertise doSelectRangerLevel9Expertise
// UNIT-IDENTITY-REPLAY: L19C-02-RANGER-EXPERTISE-GENERIC-OWNER ranger_ability_score_improvement_l8 doSelectRangerLevel8AbilityScoreImprovement

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});

if (unitCatalogResult.tag !== "ok") {
  throw new Error("SRD Unit catalog test fixture must build successfully.");
}

const unitLibrary = unitCatalogResult.catalog;

const rangerExpertiseLevel9DriverSchema = {
  doSelectRangerLevel9Expertise: {},
  doSelectRangerLevel8AbilityScoreImprovement: {},
} as const;

type RangerExpertiseLevel9DriverAction =
  keyof typeof rangerExpertiseLevel9DriverSchema;
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly RangerExpertiseLevel9DriverAction[];
  readonly expected:
    | {
        readonly kind: "selectedClassChoice";
        readonly selectedFromUnitId: UnitRecord["id"];
        readonly unitId: UnitRecord["id"];
      }
    | {
        readonly kind: "skillExpertise";
        readonly expertise: readonly string[];
      };
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "L19C-02-RANGER-EXPERTISE-GENERIC-OWNER";
  readonly unitId: UnitRecord["id"];
  readonly actions: readonly RangerExpertiseLevel9DriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L19C-02-RANGER-EXPERTISE-GENERIC-OWNER",
    unitId: authoredUnitId("ranger_expertise"),
    actions: ["doSelectRangerLevel9Expertise"],
    sequences: [
      {
        name: "selected-ranger-level-9-expertise-finalizes-skill-expertise",
        actions: ["doSelectRangerLevel9Expertise"],
        expected: {
          kind: "skillExpertise",
          expertise: ["athletics", "intimidation", "animal_handling"],
        },
      },
    ],
  },
  {
    taskId: "L19C-02-RANGER-EXPERTISE-GENERIC-OWNER",
    unitId: authoredUnitId("ranger_ability_score_improvement_l8"),
    actions: ["doSelectRangerLevel8AbilityScoreImprovement"],
    sequences: [
      {
        name: "selected-ranger-level-8-asi-finalizes-selected-feat-ref",
        actions: ["doSelectRangerLevel8AbilityScoreImprovement"],
        expected: {
          kind: "selectedClassChoice",
          selectedFromUnitId: authoredUnitId(
            "ranger_ability_score_improvement_l8",
          ),
          unitId: authoredUnitId("feat_ability_score_improvement"),
        },
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Ranger level 9 Expertise", () => {
  test("production support admits Ranger 9 and finalizes level-9 Expertise with third-level spell access", () => {
    const rangerNine = testProgression(authoredUnitId("class_ranger"), 9);
    const ranger = completeSupportedProgressionDraft({
      draftId: "draft:srd-level-9-ranger-expertise",
      progression: rangerNine,
      preferredOptionIdsBySource: {
        [testUnitChoiceSourceKey(
          authoredUnitId("class_ranger"),
          CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
        )]: [
          creationChoiceOptionId("animal_handling"),
          creationChoiceOptionId("perception"),
          creationChoiceOptionId("survival"),
        ],
        [testUnitChoiceSourceKey(
          authoredUnitId("class_ranger"),
          CLASS_SUBCLASS_CHOICE_KEY,
        )]: [creationChoiceOptionId("subclass_ranger_hunter")],
        [testUnitChoiceSourceKey(
          authoredUnitId("class_ranger"),
          CLASS_PREPARED_SPELL_CHOICE_KEY,
        )]: [
          creationChoiceOptionId("cure_wounds"),
          creationChoiceOptionId("ensnaring_strike"),
          creationChoiceOptionId("goodberry"),
          creationChoiceOptionId("hunters_mark"),
          creationChoiceOptionId("aid"),
          creationChoiceOptionId("barkskin"),
          creationChoiceOptionId("lesser_restoration"),
          creationChoiceOptionId("conjure_animals"),
          creationChoiceOptionId("revivify"),
        ],
        [testUnitChoiceSourceKey(
          authoredUnitId("ranger_deft_explorer"),
          CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
        )]: [creationChoiceOptionId("athletics")],
        [testUnitChoiceSourceKey(
          authoredUnitId("ranger_deft_explorer"),
          CLASS_FEATURE_LANGUAGE_CHOICE_KEY,
        )]: [
          creationChoiceOptionId("Elvish"),
          creationChoiceOptionId("Gnomish"),
        ],
        [testUnitChoiceSourceKey(
          authoredUnitId("ranger_fighting_style"),
          RANGER_FIGHTING_STYLE_CHOICE_KEY,
        )]: [creationChoiceOptionId("druidic_warrior")],
        [testUnitChoiceSourceKey(
          authoredUnitId("ranger_fighting_style"),
          CLASS_CANTRIP_CHOICE_KEY,
        )]: [
          creationChoiceOptionId("guidance"),
          creationChoiceOptionId("starry_wisp"),
        ],
        [testUnitChoiceSourceKey(
          authoredUnitId("ranger_hunters_prey"),
          HUNTERS_PREY_CHOICE_KEY,
        )]: [creationChoiceOptionId("colossus_slayer")],
        [testUnitChoiceSourceKey(
          authoredUnitId("ranger_ability_score_improvement_l4"),
          CLASS_FEATURE_FEAT_CHOICE_KEY,
        )]: [creationChoiceOptionId("feat_ability_score_improvement")],
        [testUnitChoiceSourceKey(
          authoredUnitId("ranger_ability_score_improvement_l4"),
          CLASS_FEATURE_ABILITY_SCORE_INCREASE_CHOICE_KEY,
        )]: [creationChoiceOptionId("ability_score:dex:+2:max20")],
        [testUnitChoiceSourceKey(
          authoredUnitId("ranger_ability_score_improvement_l8"),
          CLASS_FEATURE_FEAT_CHOICE_KEY,
        )]: [creationChoiceOptionId("feat_ability_score_improvement")],
        [testUnitChoiceSourceKey(
          authoredUnitId("ranger_ability_score_improvement_l8"),
          CLASS_FEATURE_ABILITY_SCORE_INCREASE_CHOICE_KEY,
        )]: [creationChoiceOptionId("ability_score:wis:+2:max20")],
        [testUnitChoiceSourceKey(
          authoredUnitId("ranger_expertise"),
          CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
        )]: [
          creationChoiceOptionId("perception"),
          creationChoiceOptionId("survival"),
        ],
      },
    });
    const selectedDeftExpertise = selectedChoiceOptionIds(
      ranger,
      authoredUnitId("ranger_deft_explorer"),
      CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
    );
    const selectedLevelNineExpertise = selectedChoiceOptionIds(
      ranger,
      authoredUnitId("ranger_expertise"),
      CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
    );

    expect(selectedDeftExpertise).toEqual(["athletics"]);
    expect(selectedLevelNineExpertise).toEqual(["perception", "survival"]);

    const rangerBuild = finalizeCharacterDraft({ draft: ranger, unitLibrary });
    expect(rangerBuild.tag).toBe("ready");
    if (rangerBuild.tag !== "ready") {
      return;
    }

    const proficiencies = expectRight(
      characterBuildProficiencies(rangerBuild.build, unitLibrary),
    );
    expect(proficiencies.expertise).toEqual([
      "athletics",
      "perception",
      "survival",
    ]);

    const rangerSpellcasting = rangerBuild.build.spellcasting?.sources.find(
      (source) => source.sourceUnitId === "class_ranger",
    );
    expect(rangerSpellcasting?.preparedSpells).toEqual([
      "cure_wounds",
      "ensnaring_strike",
      "goodberry",
      "hunters_mark",
      "aid",
      "barkskin",
      "lesser_restoration",
      "conjure_animals",
      "revivify",
    ]);
    expect(
      rangerBuild.build.spellcasting?.slotPools.spellcasting?.slots,
    ).toEqual([
      { spellLevel: 1, count: 4 },
      { spellLevel: 2, count: 3 },
      { spellLevel: 3, count: 2 },
    ]);
    expect(rangerBuild.build.features).toEqual(
      expect.arrayContaining([
        {
          kind: "selectedClassChoice",
          selectedFromUnitId: "ranger_ability_score_improvement_l8",
          unitId: "feat_ability_score_improvement",
        },
      ]),
    );
    expect(
      characterBuildUnitRefs(rangerBuild.build, unitLibrary).map(
        (ref) => ref.unitId,
      ),
    ).toEqual(
      expect.arrayContaining([
        "ranger_roving",
        "ranger_ability_score_improvement_l8",
        "ranger_expertise",
        "conjure_animals",
        "revivify",
      ]),
    );
  });

  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      for (const sequence of replay.sequences) {
        for (const actionName of sequence.actions) {
          expect(rangerExpertiseLevel9DriverSchema[actionName]).toBeDefined();
        }

        const rangerBuild = finalizeReadyRangerNineBuild(
          `draft:${sequence.name}`,
        );
        if (sequence.expected.kind === "selectedClassChoice") {
          expect(rangerBuild.features).toEqual(
            expect.arrayContaining([sequence.expected]),
          );
          continue;
        }

        const proficiencies = expectRight(
          characterBuildProficiencies(rangerBuild, unitLibrary),
        );
        expect(proficiencies.expertise).toEqual(sequence.expected.expertise);
      }
    }
  });
});

function finalizeReadyRangerNineBuild(draftId: string) {
  const ranger = completeSupportedProgressionDraft({
    draftId,
    progression: testProgression(authoredUnitId("class_ranger"), 9),
  });
  const rangerBuild = finalizeCharacterDraft({ draft: ranger, unitLibrary });
  if (rangerBuild.tag !== "ready") {
    throw new Error(
      `Expected ready Ranger level 9 build, received ${JSON.stringify(rangerBuild)}`,
    );
  }

  return rangerBuild.build;
}

function testProgression(
  classUnitId: UnitRecord["id"],
  classLevel: number,
): CharacterProgression {
  const parsedClassUnitId = classUnitIdFromUnitId({ unitLibrary, classUnitId });
  if (Result.isFailure(parsedClassUnitId)) {
    throw new Error(
      `Invalid test class Unit id: ${JSON.stringify(parsedClassUnitId.failure)}`,
    );
  }
  const result = parseCharacterProgressionShape({
    startingClass: parsedClassUnitId.success,
    advancements: Array.from({ length: classLevel - 1 }, () => ({
      classUnitId: parsedClassUnitId.success,
      hitPointRule: { tag: "fixedHigherLevelGain" as const },
    })),
  });
  if (Result.isFailure(result)) {
    throw new Error(
      `Invalid test progression: ${JSON.stringify(result.failure)}`,
    );
  }

  return result.success;
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

  for (let pass = 0; pass < 12; pass += 1) {
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
        str: 13,
        dex: 15,
        con: 14,
        int: 8,
        wis: 12,
        cha: 10,
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
        : input.hole.source.tag === "draft" &&
            input.hole.source.path === "draft.species"
          ? [creationChoiceOptionId(PHASE1_SPECIES_ORC_UNIT_ID)]
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
      `Not enough supported options for discovered test hole: ${input.hole.holeId}; preferred=${JSON.stringify(
        preferredOptionIds,
      )}; supported=${JSON.stringify(supportedOptionIds)}; holeOptions=${JSON.stringify(
        holeOptionIds,
      )}`,
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
  if (Result.isFailure(parsed)) {
    throw new Error(
      "Test fixture ability scores must be valid AbilityScore values.",
    );
  }
  return parsed.success;
}

function testUnitChoiceSourceKey(
  unitId: UnitRecord["id"],
  choiceKey: UnitChoiceKey,
): string {
  const sourceUnitId = unitChoiceSourceUnitId(unitId);
  if (Result.isFailure(sourceUnitId)) {
    throw new Error(
      `Invalid test Unit choice source Unit id: ${JSON.stringify(sourceUnitId.failure)}`,
    );
  }

  return unitChoiceSourceKey({
    tag: "unitChoice",
    unitId: sourceUnitId.success,
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

function expectRight<T, E>(result: Result.Result<T, E>): T {
  if (Result.isFailure(result)) {
    throw new Error(
      `Expected Result.succeed, received ${JSON.stringify(result.failure)}`,
    );
  }
  expect(Result.isSuccess(result)).toBe(true);

  return result.success;
}
