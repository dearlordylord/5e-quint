import { statBlockId } from "@dnd/shared/game-facts";
import { combatantId } from "@dnd/battle-runtime";
import { Either, Option } from "effect";
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
  decodeOracleTraceJson,
  evaluateOracleCase,
  oracleLifecycleTraceSchema,
  oracleCaseJsonSchema,
  oracleTraceSchema,
  oracleTraceJsonSchema,
  OracleTraceSchema,
} from "./index.ts";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
  type StatBlockCatalog,
} from "@dnd/surface/surface/stat-block-catalog";

const unitLibraryResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitLibraryResult.tag !== "ok") {
  throw new Error("SRD Unit catalog test fixture must build successfully.");
}
const unitLibrary = unitLibraryResult.catalog;
const statBlockLibraryResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
if (statBlockLibraryResult.tag !== "ok") {
  throw new Error("SRD Stat Block catalog test fixture must build successfully.");
}
const statBlockCatalog = statBlockLibraryResult.catalog;
const skeletonRecord = statBlockCatalog.getStatBlock("stat_block_skeleton");
if (Option.isNone(skeletonRecord)) {
  throw new Error("SRD Skeleton Stat Block test fixture must be available.");
}
const projectionFailureStatBlockCatalog: StatBlockCatalog = {
  ...statBlockCatalog,
  getStatBlock: (id) =>
    id === skeletonRecord.value.id
      ? Option.some({
          ...skeletonRecord.value,
          statBlock: {
            ...skeletonRecord.value.statBlock,
            immunities: {
              ...(skeletonRecord.value.statBlock.immunities ?? {}),
              conditions: ["prone"] as const,
            },
          },
        })
      : statBlockCatalog.getStatBlock(id),
};

const statBlockBattle = {
  roster: [
    {
      origin: "statBlock" as const,
      combatantId: combatantId("oracle:stat-block"),
      statBlockId: statBlockId("stat_block_skeleton"),
      initiative: 0,
      ammunitionStocks: [{ ammunition: "arrow", remaining: 0 }],
      conditions: [],
    },
  ] as const,
};

const mixedBattle = {
  roster: [
    {
      origin: "characterSheet" as const,
      combatantId: combatantId("oracle:character"),
      displayName: "Oracle Character",
      initiative: 1,
      ammunitionStocks: [],
    },
    ...statBlockBattle.roster,
  ] as const,
};

describe("Opaque Oracle Case and Trace contract", () => {
  it("decodes the empty creation prefix as a strict Case", () => {
    const decoded = decodeOracleCase({
      creation: { fillBatches: [] },
      sheet: { tag: "ordinary" },
      battle: statBlockBattle,
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
      battle: statBlockBattle,
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
      battle: statBlockBattle,
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
      battle: statBlockBattle,
    });
    expect(Either.isLeft(duplicateSetMember)).toBe(true);
    if (Either.isLeft(duplicateSetMember)) {
      expect(duplicateSetMember.left).toContainEqual({
        path: "/sheet/statBlockIds",
        code: "duplicateCollectionMember",
      });
    }

    const duplicateJsonMember = decodeOracleCaseJson(
      '{"creation":{"fillBatches":[]},"creation":{"fillBatches":[]},"sheet":{"tag":"ordinary"},"battle":{"roster":[{"origin":"statBlock","combatantId":"oracle:stat-block","statBlockId":"stat_block_skeleton","initiative":0,"ammunitionStocks":[],"conditions":[]}]}}',
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
      battle: statBlockBattle,
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
      battle: statBlockBattle,
    };
    const first = evaluateOracleCase({
      case: oracleCase,
      unitLibrary,
      statBlockCatalog,
    });
    const second = evaluateOracleCase({
      case: oracleCase,
      unitLibrary,
      statBlockCatalog,
    });

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
        battle: mixedBattle,
      },
      unitLibrary,
      statBlockCatalog,
    });

    expect(trace.steps.at(-1)?.tag).toBe("battleEntered");
    expect(Either.isRight(decodeOracleTrace(trace))).toBe(true);
    expect(trace.steps.some((step) => step.tag === "characterBuilt")).toBe(
      true,
    );
    const sheetStep = trace.steps.find(
      (step) => step.tag === "characterSheetConstructed",
    );
    if (sheetStep?.tag === "characterSheetConstructed") {
      expect(sheetStep.sheet).not.toHaveProperty("characterId");
      expect(sheetStep.sheet).not.toHaveProperty("build");
    }

    const firstBatch = fillBatches[0];
    if (firstBatch === undefined) throw new Error("test fills must be non-empty");
    const firstFill = firstBatch[0];
    if (firstFill === undefined) throw new Error("test batch must be non-empty");
    const surplus = evaluateOracleCase({
      case: {
        creation: {
          fillBatches: [...fillBatches, [firstFill]],
        },
        sheet: { tag: "ordinary" },
        battle: statBlockBattle,
      },
      unitLibrary,
      statBlockCatalog,
    });
    expect(surplus.steps.at(-1)).toEqual({
      tag: "workflowRejected",
      reason: {
        code: "creationInputSurplus",
        firstUnusedBatchIndex: fillBatches.length,
      },
    });
  });

  it("projects mixed origins into one stripped checkpoint and one Acts frontier", () => {
    const trace = evaluateOracleCase({
      case: {
        creation: { fillBatches: completeCreationFillBatches() },
        sheet: { tag: "ordinary" },
        battle: mixedBattle,
      },
      unitLibrary,
      statBlockCatalog,
    });
    const battleSteps = trace.steps.filter(
      (step) => step.tag === "battleEntered",
    );
    expect(battleSteps).toHaveLength(1);
    const battleStep = battleSteps[0];
    if (battleStep?.tag !== "battleEntered") {
      throw new Error("successful mixed roster must enter Battle");
    }
    expect(battleStep.checkpoint).not.toHaveProperty("battleId");
    expect(battleStep.checkpoint).not.toHaveProperty("executionScopeCursors");
    expect(battleStep.checkpoint).not.toHaveProperty("acts");
    expect(battleStep.checkpoint).not.toHaveProperty("pendingInterrupt");
    expect(
      battleStep.checkpoint.combatants.map((combatant) => combatant.origin.kind),
    ).toEqual(["character", "statBlock"]);
    expect(battleStep.checkpoint.combatants[0]).not.toHaveProperty(
      "displayName",
    );
    expect(battleStep.frontier.acts.every((act) => {
      return (
        !Object.prototype.hasOwnProperty.call(act, "label") &&
        !Object.prototype.hasOwnProperty.call(act, "summary") &&
        !Object.prototype.hasOwnProperty.call(act, "presentation")
      );
    })).toBe(true);
    expect(Either.isRight(decodeOracleTraceJson(JSON.stringify(trace)))).toBe(
      true,
    );
  });

  it("accumulates independent projection failures and reports missing records as typed entry data", () => {
    const projectionFailureBattle = {
      roster: [
        {
          origin: "statBlock" as const,
          combatantId: combatantId("oracle:broken-one"),
          statBlockId: statBlockId("stat_block_skeleton"),
          initiative: 1,
          ammunitionStocks: [{ ammunition: "arrow", remaining: 0 }],
          conditions: ["prone"],
        },
        {
          origin: "statBlock" as const,
          combatantId: combatantId("oracle:broken-two"),
          statBlockId: statBlockId("stat_block_skeleton"),
          initiative: 0,
          ammunitionStocks: [{ ammunition: "arrow", remaining: 0 }],
          conditions: ["prone"],
        },
      ] as const,
    };
    const rejected = evaluateOracleCase({
      case: {
        creation: { fillBatches: completeCreationFillBatches() },
        sheet: { tag: "ordinary" },
        battle: projectionFailureBattle,
      },
      unitLibrary,
      statBlockCatalog: projectionFailureStatBlockCatalog,
    });
    const rejection = rejected.steps.at(-1);
    expect(rejection?.tag).toBe("battleEntryRejected");
    expect(Either.isRight(decodeOracleTrace(rejected))).toBe(true);
    if (rejection?.tag === "battleEntryRejected") {
      expect(rejection.issues).toHaveLength(1);
      const projectionIssues = rejection.issues[0];
      expect(projectionIssues?.tag).toBe(
        "characterBattleEncounterProjectionIssues",
      );
      if (
        projectionIssues?.tag ===
        "characterBattleEncounterProjectionIssues"
      ) {
        expect(projectionIssues.issues).toHaveLength(2);
        expect(projectionIssues.issues.map((issue) => issue.combatantId)).toEqual([
          combatantId("oracle:broken-one"),
          combatantId("oracle:broken-two"),
        ]);
      }
    }

    const missing = evaluateOracleCase({
      case: {
        creation: { fillBatches: completeCreationFillBatches() },
        sheet: { tag: "ordinary" },
        battle: {
          roster: [
            {
              origin: "statBlock",
              combatantId: combatantId("oracle:missing"),
              statBlockId: statBlockId("stat_block_missing"),
              initiative: 0,
              ammunitionStocks: [],
              conditions: [],
            },
          ],
        },
      },
      unitLibrary,
      statBlockCatalog,
    });
    expect(missing.steps.at(-1)).toEqual({
      tag: "battleEntryRejected",
      issues: [
        {
          tag: "statBlockUnavailable",
          statBlockId: statBlockId("stat_block_missing"),
        },
      ],
    });
  });

  it("keeps JSON Schema uniqueness on optionIds arrays and shares Trace authority", () => {
    const schema: unknown = JSON.parse(JSON.stringify(oracleCaseJsonSchema()));
    expect(countUniqueArrayAnnotations(schema)).toBeGreaterThanOrEqual(2);
    expect(oracleTraceSchema).toBe(OracleTraceSchema);
    expect(oracleLifecycleTraceSchema).toBe(OracleTraceSchema);
    const traceSchema = oracleTraceJsonSchema();
    expect(JSON.stringify(traceSchema)).toContain('"prefixItems"');
    expect(
      Either.isLeft(
        decodeOracleTrace({
          steps: [
            {
              tag: "creationStarted",
              frontier: { holes: [] },
            },
          ],
        }),
      ),
    ).toBe(true);
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
        battle: statBlockBattle,
      },
      unitLibrary,
      statBlockCatalog,
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

function countUniqueArrayAnnotations(value: unknown): number {
  if (Array.isArray(value)) {
    return value.reduce<number>(
      (count, child) => count + countUniqueArrayAnnotations(child),
      0,
    );
  }
  if (!isRecord(value)) return 0;
  const own = value.type === "array" && value.uniqueItems === true ? 1 : 0;
  return own + Object.values(value).reduce<number>(
    (count, child) => count + countUniqueArrayAnnotations(child),
    0,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
    const value = values[index];
    if (value === undefined) continue;
    collectChoiceCombinations(
      values,
      size,
      index + 1,
      [...prefix, value],
      output,
      limit,
    );
    if (output.length >= limit) return;
  }
}
