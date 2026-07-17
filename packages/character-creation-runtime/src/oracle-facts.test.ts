import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import { abilityScore } from "@dnd/shared/types";

import {
  CharacterBuildFactSchema,
  CharacterCreationBatchFactSchema,
  CreationFillFactSchema,
  CreationFrontierFactSchema,
  characterBuildFact,
  characterDraftId,
  characterCreationBatchFact,
  creationChoiceOptionId,
  creationFillFact,
  creationFillIndex,
  creationFrontierFact,
  creationHoleId,
  draftRevision,
  exactChoiceCardinality,
  type CharacterBuild,
  type CreationBatchFillResult,
  type CreationHole,
} from "./index.ts";

const decodeStrict = <A, I>(schema: Schema.Schema<A, I>) =>
  Schema.decodeUnknownEither(schema, { onExcessProperty: "error" });

function syntheticChoiceHole(): CreationHole {
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
    expect(decodeStrict(CreationFrontierFactSchema)(fact)._tag).toBe("Right");
  });

  test("rejects contradictory Hole identity and source facts", () => {
    const fact = creationFrontierFact([syntheticChoiceHole()]);

    expect(
      decodeStrict(CreationFrontierFactSchema)({
        holes: [
          {
            ...fact.holes[0],
            source: { tag: "draft", path: "draft.species" },
          },
        ],
      })._tag,
    ).toBe("Left");
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
      decodeStrict(CreationFillFactSchema)({ ...fact, label: "presentation" })
        ._tag,
    ).toBe("Left");
  });

  test("projects owner rejections without draft protocol state or prose", () => {
    const hole = syntheticChoiceHole();
    const result: CreationBatchFillResult = {
      tag: "rejected",
      draft: {
        draftId: characterDraftId("draft-private"),
        revision: draftRevision(7),
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

    const fact = characterCreationBatchFact(result);

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
        frontier: creationFrontierFact([hole]),
      },
    });
    expect(fact).not.toHaveProperty("draft");
    expect(decodeStrict(CharacterCreationBatchFactSchema)(fact)._tag).toBe(
      "Right",
    );
  });

  test("projects finalized Character Build facts through the strict schema", () => {
    const fact = characterBuildFact(syntheticBuild());

    expect(fact).toEqual(syntheticBuild());
    expect(decodeStrict(CharacterBuildFactSchema)(fact)._tag).toBe("Right");
    expect(
      decodeStrict(CharacterBuildFactSchema)({ ...fact, displayName: "Nope" })
        ._tag,
    ).toBe("Left");
  });
});
