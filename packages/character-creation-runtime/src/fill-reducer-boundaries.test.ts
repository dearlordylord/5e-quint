import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { abilityScore } from "@dnd/shared/types";
import { Either } from "effect";
import { describe, expect, test } from "vitest";

import {
  characterBuildSpellcastingSlotCapacity,
  classUnitId,
} from "./index.ts";
import {
  creationFillIssues,
  getHole,
  indexCreationHoles,
} from "./fill-reducer.ts";
import { choiceHole, draftSource } from "./hole-factories.ts";
import {
  characterDraftId,
  creationChoiceOptionId,
  creationFillIndex,
  creationHoleId,
  draftRevision,
  exactChoiceCardinality,
  type CharacterDraft,
  type ChoiceCreationHole,
  type CreationFill,
  type FinalizedCharacterSelections,
} from "./types.ts";
import {
  finalizedClassChoiceFeatures,
  illegalFinalizationIssue,
  optionalUnitId,
} from "./finalization.ts";

function backgroundHole(): ChoiceCreationHole {
  const hole = choiceHole({
    source: draftSource("draft.background"),
    cardinality: exactChoiceCardinality(1),
    options: [
      {
        optionId: creationChoiceOptionId("synthetic_background"),
        label: "Synthetic Background",
      },
    ],
  });
  if (hole?.kind !== "choice") {
    throw new Error("The background fixture must produce a choice hole.");
  }
  return hole;
}

const draft: CharacterDraft = {
  draftId: characterDraftId("draft:fill-reducer-boundaries"),
  revision: draftRevision(0),
  selections: { choices: [] },
};

describe("creation fill reducer boundaries", () => {
  test("indexes known holes and reports unknown fills consistently", () => {
    const hole = backgroundHole();
    const holeIndex = indexCreationHoles([hole]);
    const knownFill: CreationFill = {
      kind: "choice",
      holeId: hole.holeId,
      optionIds: [creationChoiceOptionId("synthetic_background")],
    };
    const unknownFill: CreationFill = {
      ...knownFill,
      holeId: creationHoleId("cc:draft:draft.species"),
    };

    expect(getHole(holeIndex, knownFill, creationFillIndex(0))).toEqual(
      Either.right(hole),
    );
    expect(getHole(holeIndex, unknownFill, creationFillIndex(1))).toMatchObject(
      {
        _tag: "Left",
        left: {
          tag: "illegalFill",
          holeId: "cc:draft:draft.species",
          fillIndex: 1,
          code: "unknownHole",
        },
      },
    );
    expect(
      creationFillIssues(
        {
          draft,
          expectedRevision: draft.revision,
          fills: [unknownFill],
        },
        holeIndex,
      ),
    ).toMatchObject([
      {
        tag: "illegalFill",
        holeId: "cc:draft:draft.species",
        fillIndex: 0,
        code: "unknownHole",
      },
    ]);
  });
});

describe("finalization projection utilities", () => {
  const selections: FinalizedCharacterSelections = {
    progression: {
      startingClass: classUnitId(authoredUnitId("synthetic_class")),
      advancements: [],
    },
    background: authoredUnitId("synthetic_background"),
    abilityScoreGeneration: {
      method: "standardArray",
      assignedScores: {
        str: abilityScore(15),
        dex: abilityScore(14),
        con: abilityScore(13),
        int: abilityScore(12),
        wis: abilityScore(10),
        cha: abilityScore(8),
      },
    },
    backgroundAbilityScoreIncrease: { kind: "oneEach" },
    species: authoredUnitId("synthetic_species"),
    languages: ["Common", "Dwarvish", "Elvish"],
    alignment: { order: "neutral", morality: "neutral" },
    choices: [],
    equipment: { selectedUnitIds: [] },
  };

  test("projects absent and present Unit references as fact lists", () => {
    expect(optionalUnitId(undefined)).toEqual([]);
    expect(optionalUnitId(authoredUnitId("synthetic_unit"))).toEqual([
      "synthetic_unit",
    ]);
  });

  test("projects empty spell-slot and class-choice collections", () => {
    expect(characterBuildSpellcastingSlotCapacity({})).toEqual([]);
    expect(finalizedClassChoiceFeatures(selections)).toEqual([]);
  });

  test("wraps an incomplete draft as an illegal finalization issue", () => {
    expect(illegalFinalizationIssue({ tag: "draftIncomplete" })).toEqual({
      tag: "illegalFinalization",
      cause: { tag: "draftIncomplete" },
    });
  });
});
