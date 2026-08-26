import { statBlockId } from "@dnd/shared/game-facts";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import {
  abilityScoreAssignment,
  characterDraftId,
  choiceCardinalityBounds,
  createCharacterDraft,
  creationChoiceOptionId,
  creationHoleId,
  discoverCreationHoles,
  fillCreationHoles,
  type CharacterDraft,
  type CreationChoiceOptionId,
  type CreationHole,
  type CreationFill,
} from "@dnd/character-creation-runtime";
import {
  decodeOracleCase,
  decodeOracleCaseJson,
  decodeOracleTrace,
  evaluateOracleCase,
  oracleCaseJsonSchema,
  oracleTraceJsonSchema,
} from "./index.ts";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";

const unitLibraryResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitLibraryResult.tag !== "ok") {
  throw new Error("SRD Unit catalog test fixture must build successfully.");
}
const unitLibrary = unitLibraryResult.catalog;

describe("Opaque Oracle Case and Trace contract", () => {
  it("decodes the empty creation prefix as a strict Case", () => {
    const decoded = decodeOracleCase({
      creation: { fillBatches: [] },
      sheet: { tag: "ordinary" },
    });

    expect(Either.isRight(decoded)).toBe(true);
    if (Either.isRight(decoded)) {
      expect(decoded.right.creation.fillBatches).toEqual([]);
    }
    expect(oracleCaseJsonSchema()).toMatchObject({ type: "object" });
    expect(oracleTraceJsonSchema()).toMatchObject({ type: "object" });
  });

  it("rejects unknown members, duplicate set members, and duplicate JSON keys", () => {
    const unknownMember = decodeOracleCase({
      creation: { fillBatches: [] },
      sheet: { tag: "ordinary" },
      extra: true,
    });
    expect(Either.isLeft(unknownMember)).toBe(true);
    if (Either.isLeft(unknownMember)) {
      expect(unknownMember.left).toContainEqual({
        path: "/extra",
        code: "unknownMember",
      });
    }

    const unknownFillVariant = decodeOracleCase({
      creation: {
        fillBatches: [[{ kind: "not-a-fill", holeId: "not-a-hole" }]],
      },
      sheet: { tag: "ordinary" },
    });
    expect(Either.isLeft(unknownFillVariant)).toBe(true);
    if (Either.isLeft(unknownFillVariant)) {
      expect(unknownFillVariant.left).toContainEqual({
        path: "/creation/fillBatches/0/0/kind",
        code: "unknownVariant",
      });
    }

    const duplicateSetMember = decodeOracleCase({
      creation: { fillBatches: [] },
      sheet: {
        tag: "wildShapeKnownForms",
        statBlockIds: [
          statBlockId("stat_block_rat"),
          statBlockId("stat_block_rat"),
        ],
      },
    });
    expect(Either.isLeft(duplicateSetMember)).toBe(true);
    if (Either.isLeft(duplicateSetMember)) {
      expect(duplicateSetMember.left).toContainEqual({
        path: "/sheet/statBlockIds",
        code: "duplicateCollectionMember",
      });
    }

    const duplicateJsonMember = decodeOracleCaseJson(
      '{"creation":{"fillBatches":[]},"creation":{"fillBatches":[]},"sheet":{"tag":"ordinary"}}',
    );
    expect(Either.isLeft(duplicateJsonMember)).toBe(true);
    if (Either.isLeft(duplicateJsonMember)) {
      expect(duplicateJsonMember.left).toEqual([
        { path: "/creation", code: "duplicateMember" },
      ]);
    }
  });

  it("reports malformed set members through the decoder", () => {
    const decoded = decodeOracleCase({
      creation: {
        fillBatches: [
          [
            {
              kind: "choice",
              holeId: "cc:draft:draft.background",
              optionIds: [1],
            },
          ],
        ],
      },
      sheet: { tag: "ordinary" },
    });

    expect(Either.isLeft(decoded)).toBe(true);
    if (Either.isLeft(decoded)) {
      expect(decoded.left).toContainEqual({
        path: "/creation/fillBatches/0/0/optionIds/0",
        code: "wrongType",
      });
    }
  });

  it("requires the creation lifecycle to reach a terminal rejection or sheet", () => {
    const incomplete = decodeOracleTrace({
      steps: [
        {
          tag: "creationStarted",
          frontier: { holes: [] },
        },
      ],
    });
    expect(Either.isLeft(incomplete)).toBe(true);
    if (Either.isLeft(incomplete)) {
      expect(incomplete.left).toEqual([
        { path: "/steps", code: "invalidLifecycle" },
      ]);
    }

    const exhausted = decodeOracleTrace({
      steps: [
        { tag: "creationStarted", frontier: { holes: [] } },
        {
          tag: "workflowRejected",
          reason: { code: "creationInputExhausted" },
        },
      ],
    });
    expect(Either.isRight(exhausted)).toBe(true);
  });

  it("evaluates identical Cases deterministically with a call-local identity", () => {
    const oracleCase = {
      creation: { fillBatches: [] },
      sheet: { tag: "ordinary" as const },
    };
    const first = evaluateOracleCase({ case: oracleCase, unitLibrary });
    const second = evaluateOracleCase({ case: oracleCase, unitLibrary });

    expect(first).toEqual(second);
    expect(first.steps.at(-1)).toEqual({
      tag: "workflowRejected",
      reason: { code: "creationInputExhausted" },
    });
  });

  it("projects a production creation completion into a fresh Character Sheet", () => {
    const fillBatches = completeCreationFillBatches();
    const trace = evaluateOracleCase({
      case: {
        creation: { fillBatches },
        sheet: { tag: "ordinary" },
      },
      unitLibrary,
    });

    expect(trace.steps.at(-1)?.tag).toBe("characterSheetConstructed");
    expect(trace.steps.some((step) => step.tag === "characterBuilt")).toBe(
      true,
    );
    const finalStep = trace.steps.at(-1);
    if (finalStep?.tag === "characterSheetConstructed") {
      expect(finalStep.sheet).not.toHaveProperty("characterId");
      expect(finalStep.sheet).not.toHaveProperty("build");
    }

    const surplus = evaluateOracleCase({
      case: {
        creation: {
          fillBatches: [...fillBatches, [fillBatches[0]![0]!]],
        },
        sheet: { tag: "ordinary" },
      },
      unitLibrary,
    });
    expect(surplus.steps.at(-1)).toEqual({
      tag: "workflowRejected",
      reason: {
        code: "creationInputSurplus",
        firstUnusedBatchIndex: fillBatches.length,
      },
    });
  });

  it("returns a production fill rejection as a terminal Trace step", () => {
    const trace = evaluateOracleCase({
      case: {
        creation: {
          fillBatches: [
            [
              {
                kind: "choice",
                holeId: creationHoleId("cc:draft:draft.background"),
                optionIds: [creationChoiceOptionId("not-a-background")],
              },
            ],
          ],
        },
        sheet: { tag: "ordinary" },
      },
      unitLibrary,
    });
    expect(trace.steps.at(-1)?.tag).toBe("creationFillRejected");
  });
});

function completeCreationFillBatches(): readonly [
  CreationFill,
  ...CreationFill[],
][] {
  let draft = createCharacterDraft({
    draftId: characterDraftId("opaque-oracle:test-draft"),
  });
  const batches: Array<[CreationFill, ...CreationFill[]]> = [];
  const scores = abilityScoreAssignment({
    str: 15,
    dex: 14,
    con: 13,
    int: 12,
    wis: 10,
    cha: 8,
  });
  if (Either.isLeft(scores)) throw new Error("test scores must be valid");

  for (let iteration = 0; iteration < 100; iteration += 1) {
    const holes = discoverCreationHoles({ draft, unitLibrary });
    const hole = holes[0];
    if (hole === undefined) {
      return batches;
    }
    const accepted = acceptedFillForHole(draft, hole, scores.right);
    batches.push([accepted.fill]);
    draft = accepted.draft;
  }
  throw new Error("test creation did not converge");
}

function acceptedFillForHole(
  draft: CharacterDraft,
  hole: CreationHole,
  scores: Extract<CreationFill, { kind: "abilityScores" }>["value"],
): { readonly fill: CreationFill; readonly draft: CharacterDraft } {
  if (hole.kind === "abilityScores") {
    const fill: CreationFill = {
      kind: "abilityScores",
      holeId: hole.holeId,
      method: "standardArray",
      value: scores,
    };
    const result = fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [fill],
    });
    if (result.tag === "accepted") return { fill, draft: result.draft };
    throw new Error(`test ability-score fill rejected at ${hole.holeId}`);
  }

  const { min, max } = choiceCardinalityBounds(hole.cardinality);
  const optionIds = hole.options.map((option) => option.optionId);
  for (let size = Number(min); size <= Number(max); size += 1) {
    const combinations = choiceCombinations(optionIds, size, 256);
    for (const selectedOptionIds of combinations) {
      const fill: CreationFill = {
        kind: "choice",
        holeId: hole.holeId,
        optionIds: selectedOptionIds,
      };
      const result = fillCreationHoles({
        draft,
        unitLibrary,
        expectedRevision: draft.revision,
        fills: [fill],
      });
      if (result.tag === "accepted") return { fill, draft: result.draft };
    }
  }
  throw new Error(`no accepted test fill for ${hole.holeId}`);
}

function choiceCombinations(
  values: readonly CreationChoiceOptionId[],
  size: number,
  limit: number,
): readonly (readonly CreationChoiceOptionId[])[] {
  const output: CreationChoiceOptionId[][] = [];
  collectChoiceCombinations(values, size, 0, [], output, limit);
  return output;
}

function collectChoiceCombinations(
  values: readonly CreationChoiceOptionId[],
  size: number,
  start: number,
  prefix: readonly CreationChoiceOptionId[],
  output: CreationChoiceOptionId[][],
  limit: number,
): void {
  if (output.length >= limit) return;
  if (prefix.length === size) {
    output.push([...prefix]);
    return;
  }
  for (let index = start; index < values.length; index += 1) {
    collectChoiceCombinations(
      values,
      size,
      index + 1,
      [...prefix, values[index]!],
      output,
      limit,
    );
    if (output.length >= limit) return;
  }
}
