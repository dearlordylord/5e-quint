import { Either } from "effect";
import { describe, expect, test } from "vitest";

import { abilityScore } from "@dnd/shared/types";

import {
  characterBuildFact,
  characterDraftId,
  characterCreationBatchFact,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
  creationChoiceOptionId,
  creationFillFact,
  creationFillIndex,
  creationFinalizationFact,
  creationFrontierFact,
  creationHoleId,
  decodeCharacterBuildFact,
  decodeCharacterCreationBatchFact,
  decodeCreationFillFact,
  decodeCreationFrontierFact,
  draftRevision,
  exactChoiceCardinality,
  type CharacterBuild,
  type CharacterCreationBatchFact,
  type CreationBatchFillResult,
  type CreationHole,
} from "./index.ts";

function projectedBatchFact(
  result: CreationBatchFillResult,
): CharacterCreationBatchFact {
  const projection = characterCreationBatchFact(result);
  if (Either.isLeft(projection)) {
    throw new Error("Expected the synthetic owner result to project.");
  }
  return projection.right;
}

function syntheticChoiceHole(): Extract<CreationHole, { kind: "choice" }> {
  const cardinality = exactChoiceCardinality(1);
  if (cardinality === undefined) {
    throw new Error("Expected the literal positive cardinality to parse.");
  }
  return {
    kind: "choice",
    holeId: creationHoleId("cc:draft:draft.background"),
    source: { tag: "draft", path: "draft.background" },
    cardinality,
    options: [
      {
        optionId: creationChoiceOptionId("background_synthetic_guard"),
        label: "Synthetic Guard",
      },
    ],
  };
}

function syntheticBuild(): CharacterBuild {
  return {
    progression: { startingClass: "class_synthetic", advancements: [] },
    background: "background_synthetic_guard",
    species: "species_synthetic",
    originLanguages: ["Common", "Dwarvish", "Elvish"],
    classFeatureLanguages: [],
    alignment: { order: "neutral", morality: "neutral" },
    abilityScores: {
      str: abilityScore(10),
      dex: abilityScore(10),
      con: abilityScore(10),
      int: abilityScore(10),
      wis: abilityScore(10),
      cha: abilityScore(10),
    },
    proficiencyChoices: [],
    features: [],
    equipment: { owned: [], loadout: {} },
  };
}

describe("Character Creation owner facts", () => {
  test("projects the ordered Hole frontier without presentation fields", () => {
    const fact = creationFrontierFact([syntheticChoiceHole()]);

    expect(fact).toEqual({
      holes: [
        {
          kind: "choice",
          holeId: "cc:draft:draft.background",
          source: { tag: "draft", path: "draft.background" },
          cardinality: { tag: "exactly", count: 1 },
          options: [{ optionId: "background_synthetic_guard" }],
        },
      ],
    });
    expect(decodeCreationFrontierFact(fact)._tag).toBe("Right");
  });

  test("derives canonical Hole identity from the owner source", () => {
    const hole = {
      ...syntheticChoiceHole(),
      holeId: creationHoleId("cc:draft:draft.species"),
    };

    expect(creationFrontierFact([hole]).holes[0]?.holeId).toBe(
      "cc:draft:draft.background",
    );
  });

  test("retains ordered Fill identity while rejecting schema excess", () => {
    const fact = creationFillFact({
      kind: "choice",
      holeId: creationHoleId("cc:draft:draft.background"),
      optionIds: [
        creationChoiceOptionId("background_synthetic_guard"),
        creationChoiceOptionId("background_synthetic_sage"),
      ],
    });

    if (fact.kind !== "choice") {
      throw new Error("Expected a choice Fill fact.");
    }
    expect(fact.optionIds).toEqual([
      "background_synthetic_guard",
      "background_synthetic_sage",
    ]);
    expect(
      decodeCreationFillFact({ ...fact, label: "presentation" })._tag,
    ).toBe("Left");
  });

  test("projects owner rejections without draft protocol state or prose", () => {
    const hole = syntheticChoiceHole();
    const result: CreationBatchFillResult = {
      tag: "rejected",
      draft: {
        draftId: characterDraftId("draft-private"),
        revision: draftRevision(0),
        selections: { choices: [] },
      },
      holes: [hole],
      issues: [
        {
          tag: "illegalFill",
          holeId: hole.holeId,
          fillIndex: creationFillIndex(0),
          code: "unsupportedChoice",
          message: "presentation prose",
        },
      ],
      finalization: { tag: "incomplete", holes: [hole] },
    };

    const fact = projectedBatchFact(result);

    expect(fact).toEqual({
      tag: "rejected",
      frontier: creationFrontierFact([hole]),
      issues: [
        {
          tag: "illegalFill",
          holeId: "cc:draft:draft.background",
          fillIndex: 0,
          code: "unsupportedChoice",
        },
      ],
      finalization: {
        tag: "incomplete",
        blockingHoleIds: ["cc:draft:draft.background"],
      },
    });
    expect(fact).not.toHaveProperty("draft");
    expect(decodeCharacterCreationBatchFact(fact)._tag).toBe("Right");
    expect(
      decodeCharacterCreationBatchFact({
        ...fact,
        finalization: {
          tag: "incomplete",
          blockingHoleIds: ["cc:draft:draft.species"],
        },
      })._tag,
    ).toBe("Left");
    expect(
      decodeCharacterCreationBatchFact({
        ...fact,
        finalization: {
          tag: "incomplete",
          blockingHoleIds: [
            "cc:draft:draft.background",
            "cc:draft:draft.background",
          ],
        },
      })._tag,
    ).toBe("Left");
  });

  test("requires finalization blocker identity to follow frontier order", () => {
    const backgroundHole = syntheticChoiceHole();
    const speciesHoleTemplate = syntheticChoiceHole();
    const speciesHole: CreationHole = {
      ...speciesHoleTemplate,
      holeId: creationHoleId("cc:draft:draft.species"),
      source: { tag: "draft", path: "draft.species" },
    };
    const result: CreationBatchFillResult = {
      tag: "accepted",
      draft: {
        draftId: characterDraftId("draft-private"),
        revision: draftRevision(0),
        selections: { choices: [] },
      },
      holes: [backgroundHole, speciesHole],
      finalization: {
        tag: "incomplete",
        holes: [backgroundHole, speciesHole],
      },
    };
    const fact = projectedBatchFact(result);

    expect(decodeCharacterCreationBatchFact(fact)._tag).toBe("Right");
    expect(
      decodeCharacterCreationBatchFact({
        ...fact,
        finalization: {
          tag: "incomplete",
          blockingHoleIds: [
            "cc:draft:draft.species",
            "cc:draft:draft.background",
          ],
        },
      })._tag,
    ).toBe("Left");
  });

  test("returns a typed projection failure for inconsistent owner results", () => {
    const frontierHole = syntheticChoiceHole();
    const absentBlockingHole: Extract<CreationHole, { kind: "choice" }> = {
      ...syntheticChoiceHole(),
      holeId: creationHoleId("cc:draft:draft.species"),
      source: { tag: "draft", path: "draft.species" },
    };

    expect(
      characterCreationBatchFact({
        tag: "accepted",
        draft: {
          draftId: characterDraftId("draft-private"),
          revision: draftRevision(0),
          selections: { choices: [] },
        },
        holes: [frontierHole],
        finalization: { tag: "incomplete", holes: [absentBlockingHole] },
      })._tag,
    ).toBe("Left");
  });

  test("distinguishes finalization blockers from the fillable frontier", () => {
    const hole = syntheticChoiceHole();

    expect(
      creationFinalizationFact({ tag: "incomplete", holes: [hole] }),
    ).toEqual({
      tag: "incomplete",
      blockingHoles: creationFrontierFact([hole]).holes,
    });
  });

  test("projects finalization rejections without duplicate codes or prose", () => {
    expect(
      creationFinalizationFact({
        tag: "invalid",
        issues: [
          {
            tag: "invalidChoiceOption",
            code: "invalidChoiceOption",
            optionId: "synthetic_option",
            reason: "presentation reason",
            message: "presentation message",
          },
        ],
      }),
    ).toEqual({
      tag: "invalid",
      issues: [{ tag: "invalidChoiceOption", optionId: "synthetic_option" }],
    });
  });

  test("projects finalized Character Build facts through the strict schema", () => {
    const fact = characterBuildFact(syntheticBuild());

    expect(fact).toEqual(syntheticBuild());
    expect(decodeCharacterBuildFact(fact)._tag).toBe("Right");
    expect(
      decodeCharacterBuildFact({ ...fact, displayName: "Nope" })._tag,
    ).toBe("Left");
  });

  test("projects owned equipment once through its canonical item identity", () => {
    const build = syntheticBuild();
    const equipmentUnitId = characterEquipmentItemUnitId("weapon_synthetic");
    if (equipmentUnitId._tag === "Left") {
      throw new Error("Expected the synthetic equipment Unit id to parse.");
    }
    const itemId = characterEquipmentItemId({
      slot: "main",
      unitId: equipmentUnitId.right,
    });
    const fact = characterBuildFact({
      ...build,
      equipment: {
        owned: [
          {
            itemId,
            unitId: equipmentUnitId.right,
          },
        ],
        loadout: {
          weapon: { itemId, grip: "one_handed" },
        },
      },
    });

    expect(fact.equipment.owned).toEqual([{ itemId }]);
    expect(decodeCharacterBuildFact(fact)._tag).toBe("Right");
  });
});
