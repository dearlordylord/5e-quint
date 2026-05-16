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
  characterDraftId,
  choiceCardinalityBounds,
  classUnitIdFromUnitId,
  createCharacterDraft,
  discoverCreationHoles,
  fillCreationHoles,
  finalizeCharacterDraft,
  type AbilityScoreAssignment,
  type CharacterDraft,
  type CharacterProgression,
  type CreationChoiceOptionId,
  type CreationFill,
  type CreationHole,
  type UnitCatalog,
} from "./index.ts";
import { parseCharacterProgressionShape } from "./character-progression-algebra.ts";
import {
  CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
  progressionOptionId,
} from "./phase1-manifest.ts";
import { supportedHoleOptionIds } from "./support-gates.ts";

// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L1C-ROGUE-EXPERTISE-LEVEL-6-GRANT rogue_expertise

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});

if (unitCatalogResult.tag !== "ok") {
  throw new Error("SRD Unit catalog test fixture must build successfully.");
}

const unitLibrary = unitCatalogResult.catalog;

describe("Rogue level 6 Expertise", () => {
  test("production support admits Rogue 6 and finalizes four selected Expertise skills", () => {
    const rogueSix = testProgression("class_rogue", 6);
    const rogue = completeSupportedProgressionDraft({
      draftId: "draft:srd-level-6-rogue-expertise-feature-choice",
      progression: rogueSix,
    });
    const selectedExpertise = selectedChoiceOptionIds(
      rogue,
      "rogue_expertise",
      CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
    );

    expect(selectedExpertise).toHaveLength(4);
    expect(new Set(selectedExpertise).size).toBe(4);

    const rogueBuild = finalizeCharacterDraft({ draft: rogue, unitLibrary });
    expect(rogueBuild.tag).toBe("ready");
    if (rogueBuild.tag !== "ready") {
      return;
    }

    const proficiencies = expectRight(
      characterBuildProficiencies(rogueBuild.build, unitLibrary),
    );
    expect(proficiencies.expertise).toEqual(selectedExpertise);
    for (const skill of selectedExpertise) {
      expect(proficiencies.skills).toContain(skill);
    }
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

function completeSupportedProgressionDraft(input: {
  readonly draftId: string;
  readonly progression: CharacterProgression;
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
      fills: holes.map((hole) => supportedFillForHole(hole, progressionOption)),
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

function supportedFillForHole(
  hole: CreationHole,
  progressionOption: CreationChoiceOptionId,
): CreationFill {
  if (hole.kind === "abilityScores") {
    return {
      kind: "abilityScores",
      holeId: hole.holeId,
      method: "standardArray",
      value: testAbilityScoreAssignment({
        str: 15,
        dex: 14,
        con: 13,
        int: 8,
        wis: 10,
        cha: 12,
      }),
    };
  }

  const supportedOptionIds = supportedHoleOptionIds(hole);
  if (supportedOptionIds === undefined) {
    throw new Error(
      `No support-profile options for discovered test hole: ${hole.holeId}`,
    );
  }
  const supportedOptionIdSet = new Set(supportedOptionIds);
  const holeOptionIdSet = new Set(hole.options.map((option) => option.optionId));
  const preferredOptionIds =
    "path" in hole.source && hole.source.path === "draft.progression.initial"
      ? [progressionOption]
      : hole.options.map((option) => option.optionId);
  const selectedOptionIds = preferredOptionIds
    .filter((optionId) => holeOptionIdSet.has(optionId))
    .filter((optionId) => supportedOptionIdSet.has(optionId))
    .slice(0, choiceCardinalityBounds(hole.cardinality).max);
  if (
    selectedOptionIds.length < choiceCardinalityBounds(hole.cardinality).max
  ) {
    throw new Error(
      `Not enough supported options for discovered test hole: ${hole.holeId}`,
    );
  }

  return {
    kind: "choice",
    holeId: hole.holeId,
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
