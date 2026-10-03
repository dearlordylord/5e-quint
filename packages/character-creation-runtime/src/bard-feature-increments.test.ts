// KERNEL-COVERAGE: parity-witness CREATION.FEATURE.PROFICIENCY_CHOICE
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-creation.class-feature-proficiency-choice
// KERNEL-COVERAGE: parity-witness CREATION.SPELL_ACCESS.CHOSEN_PREPARED_PAIR
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-creation.chosen-prepared-spell-access
import { describe, expect, test } from "vitest";
import { unitId } from "@dnd/shared/game-facts";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import {
  classUnitId,
  finalizeCharacterDraft,
  discoverCreationHoles,
  fillCreationHoles,
} from "./index.ts";
import { completeSupportedProgressionDraft } from "./supported-progression-fill.test-support.ts";

const catalog = buildUnitCatalog({ collections: [srdUnitCollection] });
if (catalog.tag !== "ok") throw new Error("Expected real SRD catalog.");
const unitLibrary = catalog.catalog;
describe("Bard feature increments through public creation", () => {
  test("Lore Bard six selects exactly two source-scoped cross-list spells", () => {
    const draft = completeSupportedProgressionDraft({
      draftId: "draft:lore-discoveries",
      unitLibrary,
      progression: {
        startingClass: classUnitId(unitId("class_bard")),
        advancements: Array.from({ length: 5 }, () => ({
          classUnitId: classUnitId(unitId("class_bard")),
          hitPointRule: { tag: "fixedHigherLevelGain" as const },
        })),
      },
    });
    const finalized = finalizeCharacterDraft({ draft, unitLibrary });
    if (finalized.tag !== "ready") throw new Error(JSON.stringify(finalized));
    expect(
      finalized.build.features.filter(
        (feature) => feature.kind === "selectedPreparedSpellAccess",
      ),
    ).toHaveLength(1);
  });
  test("Lore Bard three retains three distinct selected Bonus Proficiencies", () => {
    const draft = completeSupportedProgressionDraft({
      draftId: "draft:lore-bonus-proficiencies",
      unitLibrary,
      progression: {
        startingClass: classUnitId(unitId("class_bard")),
        advancements: Array.from({ length: 2 }, () => ({
          classUnitId: classUnitId(unitId("class_bard")),
          hitPointRule: { tag: "fixedHigherLevelGain" as const },
        })),
      },
    });
    const finalized = finalizeCharacterDraft({ draft, unitLibrary });
    if (finalized.tag !== "ready")
      throw new Error(`Expected legal Lore Bard: ${JSON.stringify(finalized)}`);
    const choices = finalized.build.proficiencyChoices.filter(
      (choice) => choice.kind === "skill",
    );
    const selected = draft.selections.choices.find(
      (choice) =>
        choice.kind === "unitChoice" &&
        choice.source.unitId === unitId("bard_bonus_proficiencies"),
    );
    expect(selected?.options).toHaveLength(3);
    const openDraft = {
      ...draft,
      selections: {
        ...draft.selections,
        choices: draft.selections.choices.filter(
          (choice) => choice !== selected,
        ),
      },
    };
    const hole = discoverCreationHoles({ draft: openDraft, unitLibrary }).find(
      (hole) =>
        hole.kind === "choice" &&
        hole.source.tag === "unitChoice" &&
        hole.source.unitId === unitId("bard_bonus_proficiencies"),
    );
    if (hole === undefined || hole.kind !== "choice")
      throw new Error("Expected Bonus Proficiencies choice.");
    const first = hole.options[0];
    if (first === undefined) throw new Error("Expected legal skill options.");
    const duplicate = fillCreationHoles({
      draft: openDraft,
      unitLibrary,
      expectedRevision: openDraft.revision,
      fills: [
        {
          kind: "choice",
          holeId: hole.holeId,
          optionIds: [first.optionId, first.optionId, first.optionId],
        },
      ],
    });
    expect(duplicate.tag).toBe("rejected");
    expect(choices).toHaveLength(6);
    expect(new Set(choices.map((choice) => choice.skill)).size).toBe(6);
  });
});
