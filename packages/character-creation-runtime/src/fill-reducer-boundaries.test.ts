import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { abilityScore } from "@dnd/shared/types";
import { Either } from "effect";
import { describe, expect, test } from "vitest";

import {
  characterBuildSpellcastingSlotCapacity,
  classUnitId,
} from "./index.ts";
import {
  abilityScoreFillIssues,
  applyCreationFills,
  applyLoadoutFill,
  applyUnitFill,
  choiceFillIssues,
  creationFillIssues,
  fillIssuesForHole,
  fillKindMatchesHole,
  getHole,
  indexCreationHoles,
  requireChoiceOptionIndex,
} from "./fill-reducer.ts";
import {
  backgroundAbilityScoreIncreaseOptionId,
  choiceHole,
  draftSource,
  loadoutSource,
  unitSource,
} from "./hole-factories.ts";
import {
  BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY,
  CLASS_EQUIPMENT_CHOICE_KEY,
} from "./phase1-manifest.ts";
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
  type CreationHole,
  type FinalizedCharacterSelections,
} from "./types.ts";
import {
  finalizedClassChoiceFeatures,
  illegalFinalizationIssue,
  optionalUnitId,
} from "./finalization.ts";

function backgroundHoleWithoutUnitRef(): ChoiceCreationHole {
  const hole = choiceHole({
    source: draftSource("draft.background"),
    cardinality: exactChoiceCardinality(1),
    options: [
      {
        optionId: creationChoiceOptionId("background_soldier"),
        label: "Soldier",
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
  test("reports choice cardinality, identity, kind, and ability-score issues", () => {
    const choice = backgroundHoleWithoutUnitRef();
    const option = choice.options[0];
    if (option === undefined) {
      throw new Error("The background fixture must retain its option.");
    }
    const optionId = option.optionId;
    const optionById = new Map([[optionId, option]]);
    const choiceFill = (
      optionIds: readonly ReturnType<typeof creationChoiceOptionId>[],
    ): Extract<CreationFill, { readonly kind: "choice" }> => ({
      kind: "choice",
      holeId: choice.holeId,
      optionIds,
    });
    const abilityHole = {
      kind: "abilityScores",
      holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
      source: draftSource("draft.abilityScoreGeneration"),
      methods: ["standardArray"],
    } as const satisfies Extract<
      CreationHole,
      { readonly kind: "abilityScores" }
    >;
    const validAbilityFill = {
      kind: "abilityScores",
      holeId: abilityHole.holeId,
      method: "standardArray",
      value: {
        str: abilityScore(15),
        dex: abilityScore(14),
        con: abilityScore(13),
        int: abilityScore(12),
        wis: abilityScore(10),
        cha: abilityScore(8),
      },
    } as const satisfies Extract<
      CreationFill,
      { readonly kind: "abilityScores" }
    >;

    expect(
      choiceFillIssues(
        choiceFill([optionId]),
        creationFillIndex(0),
        choice,
        optionById,
      ),
    ).toEqual([]);
    expect(
      choiceFillIssues(
        choiceFill([]),
        creationFillIndex(0),
        choice,
        optionById,
      ),
    ).toMatchObject([{ code: "tooFewChoices" }]);
    expect(
      choiceFillIssues(
        choiceFill([optionId, creationChoiceOptionId("synthetic_unknown")]),
        creationFillIndex(0),
        choice,
        optionById,
      ),
    ).toMatchObject([{ code: "tooManyChoices" }, { code: "invalidChoice" }]);
    expect(
      choiceFillIssues(
        choiceFill([optionId, optionId]),
        creationFillIndex(0),
        choice,
        optionById,
      ),
    ).toMatchObject([{ code: "tooManyChoices" }, { code: "invalidChoice" }]);

    expect(fillKindMatchesHole(choiceFill([optionId]), choice)).toBe(true);
    expect(fillKindMatchesHole(validAbilityFill, choice)).toBe(false);
    expect(
      fillIssuesForHole(validAbilityFill, creationFillIndex(0), choice),
    ).toMatchObject([{ code: "wrongFillKind" }]);
    expect(
      abilityScoreFillIssues(
        validAbilityFill,
        creationFillIndex(0),
        abilityHole,
      ),
    ).toEqual([]);
    expect(
      abilityScoreFillIssues(
        {
          ...validAbilityFill,
          value: {
            str: abilityScore(8),
            dex: abilityScore(8),
            con: abilityScore(8),
            int: abilityScore(8),
            wis: abilityScore(8),
            cha: abilityScore(8),
          },
        },
        creationFillIndex(0),
        abilityHole,
      ),
    ).toMatchObject([{ code: "invalidAbilityScores" }]);
  });

  test("indexes known holes and reports unknown fills consistently", () => {
    const hole = backgroundHoleWithoutUnitRef();
    const holeIndex = indexCreationHoles([hole]);
    const knownFill: CreationFill = {
      kind: "choice",
      holeId: hole.holeId,
      optionIds: [creationChoiceOptionId("background_soldier")],
    };
    const unknownFill: CreationFill = {
      ...knownFill,
      holeId: creationHoleId("cc:draft:draft.species"),
    };

    expect(getHole(holeIndex, knownFill, creationFillIndex(0))).toEqual(
      Either.right(hole),
    );
    expect(requireChoiceOptionIndex(indexCreationHoles([]), hole).size).toBe(0);
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
          fills: [knownFill],
        },
        holeIndex,
      ),
    ).toMatchObject([
      {
        tag: "illegalFill",
        fillIndex: 0,
        code: "invalidChoice",
      },
    ]);
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

  test("rejects a second loadout fill for an already selected slot", () => {
    const equipmentUnitId = authoredUnitId("synthetic_weapon");
    const optionId = creationChoiceOptionId("synthetic_weapon");
    const hole = choiceHole({
      source: loadoutSource(equipmentUnitId, "weapon"),
      cardinality: exactChoiceCardinality(1),
      options: [
        {
          optionId,
          label: "Synthetic Weapon",
          unitRef: { unitId: equipmentUnitId },
        },
      ],
    });
    if (hole?.kind !== "choice" || hole.source.tag !== "loadout") {
      throw new Error("The loadout fixture must produce a choice hole.");
    }
    const loadoutHole = { ...hole, source: hole.source };
    const fill = {
      kind: "choice",
      holeId: loadoutHole.holeId,
      optionIds: [optionId],
    } as const;
    const acceptedFill = {
      hole: loadoutHole,
      fill,
      selectedOption: { optionId },
    };

    const first = applyLoadoutFill(
      { choices: [] },
      acceptedFill,
      creationFillIndex(0),
    );
    if (Either.isLeft(first)) {
      throw new Error("The first loadout fill must be accepted.");
    }
    expect(first.right.choices).toHaveLength(1);
    expect(
      applyLoadoutFill(first.right, acceptedFill, creationFillIndex(1)),
    ).toMatchObject({
      _tag: "Left",
      left: {
        tag: "illegalFill",
        fillIndex: 1,
        code: "duplicateFill",
      },
    });
    expect(
      applyCreationFills(draft, [
        {
          fillIndex: creationFillIndex(0),
          acceptedFill: { tag: "loadout", acceptedFill },
        },
        {
          fillIndex: creationFillIndex(1),
          acceptedFill: { tag: "loadout", acceptedFill },
        },
      ]),
    ).toMatchObject({
      _tag: "Left",
      left: [
        {
          tag: "illegalFill",
          fillIndex: 1,
          code: "duplicateFill",
        },
      ],
    });
  });

  test("applies each accepted Unit-sourced fill variant", () => {
    const backgroundOptionId = backgroundAbilityScoreIncreaseOptionId({
      kind: "oneEach",
    });
    const equipmentOptionId = creationChoiceOptionId("synthetic_equipment");
    const unitId = authoredUnitId("synthetic_unit");
    const backgroundIncreaseHole = choiceHole({
      source: unitSource(
        authoredUnitId("synthetic_background"),
        BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY,
      ),
      cardinality: exactChoiceCardinality(1),
      options: [
        { optionId: backgroundOptionId, label: "One point in each ability" },
      ],
    });
    const equipmentHole = choiceHole({
      source: unitSource(
        authoredUnitId("synthetic_class"),
        CLASS_EQUIPMENT_CHOICE_KEY,
      ),
      cardinality: exactChoiceCardinality(1),
      options: [
        {
          optionId: equipmentOptionId,
          label: "Synthetic equipment",
          unitRef: { unitId },
        },
      ],
    });
    if (
      backgroundIncreaseHole?.kind !== "choice" ||
      backgroundIncreaseHole.source.tag !== "unitChoice" ||
      equipmentHole?.kind !== "choice" ||
      equipmentHole.source.tag !== "unitChoice"
    ) {
      throw new Error("The Unit-sourced fixtures must produce choice holes.");
    }
    const backgroundUnitHole = {
      ...backgroundIncreaseHole,
      source: backgroundIncreaseHole.source,
    };
    const equipmentUnitHole = {
      ...equipmentHole,
      source: equipmentHole.source,
    };
    const backgroundFill = {
      kind: "choice",
      holeId: backgroundUnitHole.holeId,
      optionIds: [backgroundOptionId],
    } as const;
    const equipmentFill = {
      kind: "choice",
      holeId: equipmentUnitHole.holeId,
      optionIds: [equipmentOptionId],
    } as const;

    expect(
      applyUnitFill(
        { choices: [] },
        {
          tag: "backgroundAbilityScoreIncrease",
          hole: backgroundUnitHole,
          fill: backgroundFill,
          selection: { kind: "oneEach" },
        },
      ),
    ).toMatchObject({
      _tag: "Right",
      right: { backgroundAbilityScoreIncrease: { kind: "oneEach" } },
    });
    expect(
      applyUnitFill(
        { choices: [] },
        {
          tag: "equipmentPurchase",
          hole: equipmentUnitHole,
          fill: equipmentFill,
          unitIds: [unitId],
        },
      ),
    ).toMatchObject({
      _tag: "Right",
      right: { equipment: { selectedUnitIds: [unitId] } },
    });
    expect(
      applyUnitFill(
        { choices: [] },
        {
          tag: "unitChoice",
          hole: equipmentUnitHole,
          fill: equipmentFill,
          options: [{ optionId: equipmentOptionId }],
        },
      ),
    ).toMatchObject({
      _tag: "Right",
      right: {
        choices: [
          {
            kind: "unitChoice",
            source: equipmentUnitHole.source,
            options: [{ optionId: equipmentOptionId }],
          },
        ],
      },
    });
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
