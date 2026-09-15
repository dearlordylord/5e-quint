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
  finalizeCharacterDraft,
  type CharacterDraft,
  type CreationChoiceOptionId,
} from "./index.ts";
import { CLASS_FEATURE_PROFICIENCY_CHOICE_KEY } from "./phase1-manifest.ts";
import {
  completeSupportedProgressionDraft,
  testProgression,
} from "./supported-progression-fill.test-support.ts";

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
    const rogueSix = testProgression(
      unitLibrary,
      authoredUnitId("class_rogue"),
      6,
    );
    const rogue = completeSupportedProgressionDraft({
      draftId: "draft:srd-level-6-rogue-expertise-feature-choice",
      unitLibrary,
      progression: rogueSix,
    });
    const selectedExpertise = selectedChoiceOptionIds(
      rogue,
      authoredUnitId("rogue_expertise"),
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
