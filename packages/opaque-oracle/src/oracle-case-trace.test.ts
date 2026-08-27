import { statBlockId } from "@dnd/shared/game-facts";
import {
  battleCreatureInitFromStatBlock,
  combatantId,
  BattleStatBlockProcedureExecutionRef,
  discoverBattleActs,
  endBattleRuntimeTurn,
  initiativeScore,
  startBattle,
  type BattleFill,
} from "@dnd/battle-runtime";
import { DieRollResult, movementFeet, resourceCount } from "@dnd/shared/types";
import { Either, Option, Schema } from "effect";
import fc from "fast-check";
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
  evaluateOracleBatch,
  evaluateOracleCase,
  ORACLE_BATTLE_ID,
  OracleCaseSchema,
  OracleTraceSchema,
  oracleTraceSchema,
  type OracleBattleAttempt,
  type OracleBattleInput,
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
import {
  OracleBattleCheckpointSchema,
  OracleBattleEnteredSchema,
  OracleBattleInterruptDecisionFillSchema,
  OracleBattleProgressedSchema,
} from "./oracle-case-trace-schema.ts";

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
  throw new Error(
    "SRD Stat Block catalog test fixture must build successfully.",
  );
}
const statBlockCatalog = statBlockLibraryResult.catalog;
const skeletonRecord = statBlockCatalog.getStatBlock("stat_block_skeleton");
if (Option.isNone(skeletonRecord)) {
  throw new Error("SRD Skeleton Stat Block test fixture must be available.");
}
const skeletonStatBlock = skeletonRecord.value;
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
      tempHp: 0,
    },
  ] as const,
  attempts: [],
};

const twoSkeletonBattle = {
  roster: [
    {
      origin: "statBlock" as const,
      combatantId: combatantId("oracle:skeleton-a"),
      statBlockId: statBlockId("stat_block_skeleton"),
      initiative: 10,
      ammunitionStocks: [{ ammunition: "arrow" as const, remaining: 0 }],
      conditions: [],
      tempHp: 0,
    },
    {
      origin: "statBlock" as const,
      combatantId: combatantId("oracle:skeleton-b"),
      statBlockId: statBlockId("stat_block_skeleton"),
      initiative: 0,
      ammunitionStocks: [{ ammunition: "arrow" as const, remaining: 0 }],
      conditions: [],
      tempHp: 0,
    },
  ] as const,
  attempts: [],
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
  attempts: [],
};

const standardCreationFillBatches = completeCreationFillBatches();
const ORACLE_LONG_TEST_TIMEOUT_MS = 20_000;

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
    expect(oracleTraceSchema).toBeDefined();
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

    const missingAttempts = decodeOracleCase({
      creation: { fillBatches: [] },
      sheet: { tag: "ordinary" },
      battle: { roster: statBlockBattle.roster },
    });
    expect(Either.isLeft(missingAttempts)).toBe(true);
    if (Either.isLeft(missingAttempts)) {
      expect(missingAttempts.left).toContainEqual({
        path: "/battle/attempts",
        code: "missingMember",
      });
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

  it("uses a concrete interrupt-decision fill member at the Case boundary", () => {
    const decline = Schema.decodeUnknownEither(
      OracleBattleInterruptDecisionFillSchema,
    )({
      kind: "interruptDecision",
      holeId: "oracle:interrupt",
      value: {
        kind: "decline",
        responderId: combatantId("oracle:stat-block"),
      },
    });
    expect(Either.isRight(decline)).toBe(true);

    const ordinary = Schema.decodeUnknownEither(
      OracleBattleInterruptDecisionFillSchema,
    )({
      kind: "movement",
      holeId: "oracle:movement",
      value: {
        speedKind: "walk",
        movementCostFeet: 5,
        provokedOpportunityAttacks: [],
      },
    });
    expect(Either.isLeft(ordinary)).toBe(true);
  });

  it("admits empty or all-Stat-Block rosters but rejects a second fresh Sheet, duplicate conditions, and omitted temp HP", () => {
    const empty = decodeOracleCase({
      creation: { fillBatches: [] },
      sheet: { tag: "ordinary" },
      battle: { roster: [], attempts: [] },
    });
    expect(Either.isRight(empty)).toBe(true);

    const duplicateSheet = decodeOracleCase({
      creation: { fillBatches: [] },
      sheet: { tag: "ordinary" },
      battle: {
        roster: [
          {
            origin: "characterSheet",
            combatantId: combatantId("oracle:character-one"),
            displayName: "One",
            initiative: 1,
            ammunitionStocks: [],
          },
          {
            origin: "characterSheet",
            combatantId: combatantId("oracle:character-two"),
            displayName: "Two",
            initiative: 0,
            ammunitionStocks: [],
          },
        ],
        attempts: [],
      },
    });
    expect(Either.isLeft(duplicateSheet)).toBe(true);

    const duplicateConditions = decodeOracleCase({
      creation: { fillBatches: [] },
      sheet: { tag: "ordinary" },
      battle: {
        roster: [
          {
            ...statBlockBattle.roster[0],
            conditions: ["prone", "prone"],
          },
        ],
        attempts: [],
      },
    });
    expect(Either.isLeft(duplicateConditions)).toBe(true);
    if (Either.isLeft(duplicateConditions)) {
      expect(duplicateConditions.left).toContainEqual({
        path: "/battle/roster/0/conditions",
        code: "duplicateCollectionMember",
      });
    }

    const omittedTempHp = decodeOracleCase({
      creation: { fillBatches: [] },
      sheet: { tag: "ordinary" },
      battle: {
        roster: [
          {
            origin: "statBlock",
            combatantId: combatantId("oracle:missing-temp-hp"),
            statBlockId: statBlockId("stat_block_skeleton"),
            initiative: 0,
            ammunitionStocks: [],
            conditions: [],
          },
        ],
        attempts: [],
      },
    });
    expect(Either.isLeft(omittedTempHp)).toBe(true);
    if (Either.isLeft(omittedTempHp)) {
      expect(omittedTempHp.left).toContainEqual({
        path: "/battle/roster/0/tempHp",
        code: "missingMember",
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
    const first = evaluateDecodedCase({
      case: oracleCase,
      unitLibrary,
      statBlockCatalog,
    });
    const second = evaluateDecodedCase({
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
    const trace = evaluateDecodedCase({
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
    if (firstBatch === undefined)
      throw new Error("test fills must be non-empty");
    const firstFill = firstBatch[0];
    if (firstFill === undefined)
      throw new Error("test batch must be non-empty");
    const surplus = evaluateDecodedCase({
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
    const trace = evaluateDecodedCase({
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
    expect(Object.keys(battleStep.checkpoint).sort()).toEqual([
      "combatants",
      "currentActorId",
      "round",
      "turnOrder",
    ]);
    expect(
      Object.keys(battleStep.checkpoint.combatants[0] ?? {}).sort(),
    ).toEqual([
      "armorClass",
      "combatantId",
      "conditions",
      "hp",
      "initiative",
      "maxHp",
      "origin",
      "size",
      "tempHp",
    ]);
    expect(
      battleStep.checkpoint.combatants.map(
        (combatant) => combatant.origin.kind,
      ),
    ).toEqual(["character", "statBlock"]);
    expect(battleStep.checkpoint.combatants[0]).not.toHaveProperty(
      "displayName",
    );
    expect(battleStep.frontier.acts.length).toBeGreaterThan(0);
    expect(
      battleStep.frontier.acts.every(
        (subject) => !Object.prototype.hasOwnProperty.call(subject, "label"),
      ),
    ).toBe(true);
    expect(Either.isRight(decodeOracleTraceJson(JSON.stringify(trace)))).toBe(
      true,
    );
  });

  it("keeps successful Acts non-vacuous and reports an empty roster as typed Battle rejection", () => {
    const successful = evaluateDecodedCase({
      case: {
        creation: { fillBatches: completeCreationFillBatches() },
        sheet: { tag: "ordinary" },
        battle: statBlockBattle,
      },
      unitLibrary,
      statBlockCatalog,
    });
    const entered = successful.steps.at(-1);
    expect(entered?.tag).toBe("battleEntered");
    if (entered?.tag === "battleEntered") {
      expect(entered.frontier.acts.length).toBeGreaterThan(0);
      expect(
        entered.frontier.acts.every(
          (subject) =>
            !Object.prototype.hasOwnProperty.call(subject, "initialHoles"),
        ),
      ).toBe(true);
    }

    const empty = evaluateDecodedCase({
      case: {
        creation: { fillBatches: completeCreationFillBatches() },
        sheet: { tag: "ordinary" },
        battle: { roster: [], attempts: [] },
      },
      unitLibrary,
      statBlockCatalog,
    });
    expect(empty.steps.at(-1)).toEqual({
      tag: "battleEntryRejected",
      issues: [{ tag: "characterBattleEncounterEmptyRoster" }],
    });
    expect(Either.isRight(decodeOracleTrace(empty))).toBe(true);
  });

  it("drives an ordinary Act attempt through the mechanical Hole frontier", () => {
    const initial = evaluateDecodedCase({
      case: {
        creation: { fillBatches: completeCreationFillBatches() },
        sheet: { tag: "ordinary" },
        battle: mixedBattle,
      },
      unitLibrary,
      statBlockCatalog,
    });
    const entered = initial.steps.at(-1);
    expect(entered?.tag).toBe("battleEntered");
    if (entered?.tag !== "battleEntered") return;
    const subject = entered.frontier.acts[0];
    expect(subject).toBeDefined();
    if (subject === undefined) return;

    const trace = evaluateDecodedCase({
      case: {
        creation: { fillBatches: completeCreationFillBatches() },
        sheet: { tag: "ordinary" },
        battle: {
          ...mixedBattle,
          attempts: [{ kind: "ordinarySubject", subject, fills: [] }],
        },
      },
      unitLibrary,
      statBlockCatalog,
    });
    const progressed = trace.steps.at(-1);
    expect(progressed?.tag).toBe("battleProgressed");
    if (progressed?.tag !== "battleProgressed") return;
    expect(progressed.frontier.kind).toBe("ordinaryHoles");
    if (progressed.frontier.kind === "ordinaryHoles") {
      expect(progressed.frontier.subject).toEqual(subject);
      expect(progressed.frontier.holes.length).toBeGreaterThan(0);
      expect(progressed.frontier.acceptedFills).toEqual([]);
    }
    expect(Either.isRight(decodeOracleTrace(trace))).toBe(true);
  });

  it("keeps an invalid Act attempt's checkpoint/frontier stable for retry", () => {
    const initial = evaluateDecodedCase({
      case: {
        creation: { fillBatches: completeCreationFillBatches() },
        sheet: { tag: "ordinary" },
        battle: mixedBattle,
      },
      unitLibrary,
      statBlockCatalog,
    });
    const entered = initial.steps.at(-1);
    expect(entered?.tag).toBe("battleEntered");
    if (entered?.tag !== "battleEntered") return;
    const subject = entered.frontier.acts[0];
    expect(subject).toBeDefined();
    if (subject === undefined || !("actorId" in subject)) return;

    const trace = evaluateDecodedCase({
      case: {
        creation: { fillBatches: completeCreationFillBatches() },
        sheet: { tag: "ordinary" },
        battle: {
          ...mixedBattle,
          attempts: [
            {
              kind: "ordinarySubject",
              subject: {
                ...subject,
                actorId: combatantId("oracle:wrong-actor"),
              },
              fills: [],
            },
            { kind: "ordinarySubject", subject, fills: [] },
          ],
        },
      },
      unitLibrary,
      statBlockCatalog,
    });
    const rejection = trace.steps.at(-2);
    const progressed = trace.steps.at(-1);
    expect(rejection?.tag).toBe("battleAttemptRejected");
    expect(progressed?.tag).toBe("battleProgressed");
    if (
      rejection?.tag !== "battleAttemptRejected" ||
      progressed?.tag !== "battleProgressed"
    ) {
      return;
    }
    expect(rejection.reason).toBe("wrongActor");
    expect(rejection.checkpoint).toEqual(
      trace.steps.find((step) => step.tag === "battleEntered")?.checkpoint,
    );
    expect(rejection.frontier).toEqual(
      trace.steps.find((step) => step.tag === "battleEntered")?.frontier,
    );
    expect(progressed.frontier.kind).toBe("ordinaryHoles");
    expect(Either.isRight(decodeOracleTrace(trace))).toBe(true);
  });

  it(
    "drives Move through an Opportunity Attack interrupt and retries after rejection",
    () => {
      const initial = evaluateDecodedCase({
        case: {
          creation: { fillBatches: completeCreationFillBatches() },
          sheet: { tag: "ordinary" },
          battle: twoSkeletonBattle,
        },
        unitLibrary,
        statBlockCatalog,
      });
      const entered = initial.steps.at(-1);
      expect(entered?.tag).toBe("battleEntered");
      if (entered?.tag !== "battleEntered") return;

      const moveSubject = entered.frontier.acts.find(
        (subject) =>
          subject.tag === "runtimeCommand" && subject.command === "move",
      );
      expect(moveSubject).toBeDefined();
      if (
        moveSubject?.tag !== "runtimeCommand" ||
        moveSubject.command !== "move"
      ) {
        return;
      }

      const moveHoles = evaluateDecodedCase({
        case: {
          creation: { fillBatches: completeCreationFillBatches() },
          sheet: { tag: "ordinary" },
          battle: {
            ...twoSkeletonBattle,
            attempts: [
              { kind: "ordinarySubject", subject: moveSubject, fills: [] },
            ],
          },
        },
        unitLibrary,
        statBlockCatalog,
      });
      const ordinary = moveHoles.steps.at(-1);
      expect(ordinary?.tag).toBe("battleProgressed");
      if (
        ordinary?.tag !== "battleProgressed" ||
        ordinary.frontier.kind !== "ordinaryHoles"
      ) {
        return;
      }
      const movementHole = ordinary.frontier.holes.find(
        (hole) => hole.kind === "movement",
      );
      expect(movementHole).toBeDefined();
      if (movementHole?.kind !== "movement") return;

      const movement = {
        kind: "movement" as const,
        holeId: movementHole.holeId,
        value: {
          speedKind: "walk" as const,
          movementCostFeet: movementFeet(10),
          provokedOpportunityAttacks: [
            {
              reactorId: combatantId("oracle:skeleton-b"),
              distanceFeet: movementFeet(5),
              procedureRef: skeletonShortswordProcedureRef(),
            },
          ],
        },
      } satisfies BattleFill;
      const moveAttempt = {
        kind: "ordinarySubject" as const,
        subject: moveSubject,
        fills: [movement],
      } satisfies OracleBattleAttempt;

      const valid = evaluateDecodedCase({
        case: {
          creation: { fillBatches: completeCreationFillBatches() },
          sheet: { tag: "ordinary" },
          battle: {
            ...twoSkeletonBattle,
            attempts: [moveAttempt],
          },
        },
        unitLibrary,
        statBlockCatalog,
      });
      const validFrontierStep = valid.steps.at(-1);
      expect(validFrontierStep?.tag).toBe("battleProgressed");
      if (
        validFrontierStep?.tag !== "battleProgressed" ||
        validFrontierStep.frontier.kind !== "interruptDecision"
      ) {
        return;
      }
      expect(validFrontierStep.frontier.decisionHole.trigger).toBe(
        "opportunityAttack",
      );
      const opportunityAttack = validFrontierStep.frontier.choices.find(
        (choice) =>
          choice.kind === "nestedProcedure" &&
          choice.subject.command === "opportunityAttack",
      );
      expect(opportunityAttack).toBeDefined();
      if (
        opportunityAttack?.kind !== "nestedProcedure" ||
        opportunityAttack.subject.command !== "opportunityAttack"
      ) {
        return;
      }
      expect(opportunityAttack.subject.reactorId).toBe(
        combatantId("oracle:skeleton-b"),
      );
      expect(opportunityAttack.initialHoles).toEqual([]);

      const interruptFill = Schema.decodeUnknownEither(
        OracleBattleInterruptDecisionFillSchema,
      )({
        kind: "interruptDecision",
        holeId: validFrontierStep.frontier.decisionHole.holeId,
        value: {
          kind: "resolve",
          responderId: opportunityAttack.subject.reactorId,
          choice: {
            kind: "opportunityAttack",
            selection: {
              procedureRef: opportunityAttack.subject.procedureRef,
            },
            fills: [],
          },
        },
      });
      expect(Either.isRight(interruptFill)).toBe(true);
      if (Either.isLeft(interruptFill)) return;
      const interruptAttempt = {
        kind: "interruptDecision" as const,
        fill: interruptFill.right,
      } satisfies OracleBattleAttempt;
      const afterInterrupt = evaluateDecodedCase({
        case: {
          creation: { fillBatches: completeCreationFillBatches() },
          sheet: { tag: "ordinary" },
          battle: {
            ...twoSkeletonBattle,
            attempts: [moveAttempt, interruptAttempt],
          },
        },
        unitLibrary,
        statBlockCatalog,
      });
      const afterInterruptStep = afterInterrupt.steps.at(-1);
      expect(afterInterruptStep?.tag).toBe("battleProgressed");
      if (
        afterInterruptStep?.tag !== "battleProgressed" ||
        afterInterruptStep.frontier.kind !== "ordinaryHoles"
      ) {
        return;
      }
      expect(afterInterruptStep.frontier.subject).toEqual(
        opportunityAttack.subject,
      );
      expect(afterInterruptStep.frontier.acceptedFills).toEqual([]);
      const attackRollHole = afterInterruptStep.frontier.holes.find(
        (hole) => hole.kind === "attackRoll",
      );
      expect(attackRollHole).toBeDefined();
      if (attackRollHole?.kind !== "attackRoll") return;

      const attackRoll = {
        kind: "attackRoll" as const,
        holeId: attackRollHole.holeId,
        value: {
          naturalD20: DieRollResult(20),
          total: 20,
        },
      } satisfies BattleFill;
      const afterAttackRoll = evaluateDecodedCase({
        case: {
          creation: { fillBatches: completeCreationFillBatches() },
          sheet: { tag: "ordinary" },
          battle: {
            ...twoSkeletonBattle,
            attempts: [
              moveAttempt,
              interruptAttempt,
              {
                kind: "ordinarySubject" as const,
                subject: afterInterruptStep.frontier.subject,
                fills: [attackRoll],
              },
            ],
          },
        },
        unitLibrary,
        statBlockCatalog,
      });
      const afterAttackRollStep = afterAttackRoll.steps.at(-1);
      expect(afterAttackRollStep?.tag).toBe("battleProgressed");
      if (
        afterAttackRollStep?.tag !== "battleProgressed" ||
        afterAttackRollStep.frontier.kind !== "ordinaryHoles"
      ) {
        return;
      }
      const rolledDiceHole = afterAttackRollStep.frontier.holes.find(
        (hole) => hole.kind === "rolledDice",
      );
      expect(rolledDiceHole).toBeDefined();
      if (rolledDiceHole?.kind !== "rolledDice") return;

      const rolledDice = {
        kind: "rolledDice" as const,
        holeId: rolledDiceHole.holeId,
        value: [{ results: [DieRollResult(6), DieRollResult(6)] }],
      } satisfies BattleFill;
      const afterRolledDice = evaluateDecodedCase({
        case: {
          creation: { fillBatches: completeCreationFillBatches() },
          sheet: { tag: "ordinary" },
          battle: {
            ...twoSkeletonBattle,
            attempts: [
              moveAttempt,
              interruptAttempt,
              {
                kind: "ordinarySubject" as const,
                subject: afterInterruptStep.frontier.subject,
                fills: [attackRoll, rolledDice],
              },
            ],
          },
        },
        unitLibrary,
        statBlockCatalog,
      });
      const afterRolledDiceStep = afterRolledDice.steps.at(-1);
      expect(afterRolledDiceStep?.tag).toBe("battleProgressed");
      if (
        afterRolledDiceStep?.tag !== "battleProgressed" ||
        afterRolledDiceStep.frontier.kind !== "ordinaryHoles"
      ) {
        return;
      }
      const damageDispositionHole = afterRolledDiceStep.frontier.holes.find(
        (hole) => hole.kind === "attackDamageDisposition",
      );
      expect(damageDispositionHole).toBeDefined();
      if (damageDispositionHole?.kind !== "attackDamageDisposition") return;

      const damageDisposition = {
        kind: "attackDamageDisposition" as const,
        holeId: damageDispositionHole.holeId,
        value: { kind: "ordinaryDamage" as const },
      } satisfies BattleFill;
      const resolved = evaluateDecodedCase({
        case: {
          creation: { fillBatches: completeCreationFillBatches() },
          sheet: { tag: "ordinary" },
          battle: {
            ...twoSkeletonBattle,
            attempts: [
              moveAttempt,
              interruptAttempt,
              {
                kind: "ordinarySubject" as const,
                subject: afterInterruptStep.frontier.subject,
                fills: [attackRoll, rolledDice, damageDisposition],
              },
            ],
          },
        },
        unitLibrary,
        statBlockCatalog,
      });
      const resolvedStep = resolved.steps.at(-1);
      expect(resolvedStep?.tag).toBe("battleProgressed");
      if (
        resolvedStep?.tag !== "battleProgressed" ||
        resolvedStep.frontier.kind !== "acts"
      ) {
        return;
      }
      const defeated = resolvedStep.checkpoint.combatants.find(
        ({ combatantId: id }) => id === combatantId("oracle:skeleton-a"),
      );
      expect(defeated?.hp).toBe(0);
      expect(
        resolvedStep.frontier.acts.some(
          (subject) =>
            subject.tag === "runtimeCommand" &&
            subject.actorId === combatantId("oracle:skeleton-a") &&
            subject.command === "endTurn",
        ),
      ).toBe(true);
      expect(Either.isRight(decodeOracleTrace(resolved))).toBe(true);

      const retry = evaluateDecodedCase({
        case: {
          creation: { fillBatches: completeCreationFillBatches() },
          sheet: { tag: "ordinary" },
          battle: {
            ...twoSkeletonBattle,
            attempts: [
              {
                kind: "ordinarySubject",
                subject: {
                  ...moveSubject,
                  actorId: combatantId("oracle:wrong-actor"),
                },
                fills: [],
              },
              moveAttempt,
            ],
          },
        },
        unitLibrary,
        statBlockCatalog,
      });
      const rejection = retry.steps.at(-2);
      const retriedFrontierStep = retry.steps.at(-1);
      expect(rejection?.tag).toBe("battleAttemptRejected");
      expect(retriedFrontierStep?.tag).toBe("battleProgressed");
      if (
        rejection?.tag !== "battleAttemptRejected" ||
        retriedFrontierStep?.tag !== "battleProgressed"
      ) {
        return;
      }
      expect(rejection.reason).toBe("wrongActor");
      expect(rejection.checkpoint).toEqual(entered.checkpoint);
      expect(rejection.frontier).toEqual(entered.frontier);
      expect(retriedFrontierStep.frontier).toEqual(validFrontierStep.frontier);
      expect(Either.isRight(decodeOracleTrace(valid))).toBe(true);
      expect(Either.isRight(decodeOracleTrace(retry))).toBe(true);
    },
    ORACLE_LONG_TEST_TIMEOUT_MS,
  );

  it("rejects stripped checkpoints with impossible identity or turn references", () => {
    const trace = evaluateDecodedCase({
      case: {
        creation: { fillBatches: completeCreationFillBatches() },
        sheet: { tag: "ordinary" },
        battle: mixedBattle,
      },
      unitLibrary,
      statBlockCatalog,
    });
    const entered = trace.steps.at(-1);
    expect(entered?.tag).toBe("battleEntered");
    if (entered?.tag !== "battleEntered") return;

    const laterActor = entered.checkpoint.turnOrder[1];
    expect(laterActor).toBeDefined();
    if (laterActor !== undefined) {
      expect(
        Either.isRight(
          Schema.decodeUnknownEither(OracleBattleCheckpointSchema)({
            ...entered.checkpoint,
            currentActorId: laterActor,
          }),
        ),
      ).toBe(true);
    }

    const invalid = {
      ...trace,
      steps: [
        ...trace.steps.slice(0, -1),
        {
          ...entered,
          checkpoint: {
            ...entered.checkpoint,
            currentActorId: combatantId("oracle:not-in-turn-order"),
          },
        },
      ],
    };
    const decoded = decodeOracleTrace(invalid);
    expect(Either.isLeft(decoded)).toBe(true);

    const crossReference = {
      ...trace,
      steps: [
        ...trace.steps.slice(0, -1),
        {
          ...entered,
          checkpoint: {
            ...entered.checkpoint,
            targetId: combatantId("oracle:not-a-checkpoint-field"),
          },
        },
      ],
    };
    expect(Either.isLeft(decodeOracleTrace(crossReference))).toBe(true);

    const unreachableFrontier = {
      ...trace,
      steps: [
        ...trace.steps.slice(0, -1),
        {
          ...entered,
          frontier: {
            kind: "acts",
            acts: [
              {
                ...entered.frontier.acts[0],
                actorId: combatantId("oracle:not-a-live-combatant"),
              },
            ],
          },
        },
      ],
    };
    expect(Either.isLeft(decodeOracleTrace(unreachableFrontier))).toBe(true);

    type SubjectWithProcedureRef = {
      readonly actorId: string;
      readonly procedureRef: string;
    };
    const hasProcedureRef = (
      subject: (typeof entered.frontier.acts)[number],
    ): subject is typeof subject & SubjectWithProcedureRef =>
      "actorId" in subject && "procedureRef" in subject;
    const ownerAct = entered.frontier.acts.find(hasProcedureRef);
    const foreignOwnerId = entered.checkpoint.combatants.find(
      ({ combatantId }) =>
        ownerAct !== undefined && combatantId !== ownerAct.actorId,
    )?.combatantId;
    expect(ownerAct).toBeDefined();
    expect(foreignOwnerId).toBeDefined();
    if (ownerAct !== undefined && foreignOwnerId !== undefined) {
      const forgedProcedureRef = ownerAct.procedureRef.replace(
        ownerAct.actorId,
        foreignOwnerId,
      );
      const crossOwnerProcedure = {
        ...trace,
        steps: [
          ...trace.steps.slice(0, -1),
          {
            ...entered,
            frontier: {
              kind: "acts",
              acts: entered.frontier.acts.map((subject) =>
                subject === ownerAct
                  ? {
                      ...subject,
                      procedureRef: forgedProcedureRef,
                    }
                  : subject,
              ),
            },
          },
        ],
      };
      expect(Either.isLeft(decodeOracleTrace(crossOwnerProcedure))).toBe(true);

      const wrongInitialActor = {
        ...trace,
        steps: [
          ...trace.steps.slice(0, -1),
          {
            ...entered,
            frontier: {
              kind: "acts",
              acts: entered.frontier.acts.map((subject) =>
                subject === ownerAct
                  ? {
                      ...subject,
                      actorId: foreignOwnerId,
                      procedureRef: forgedProcedureRef,
                    }
                  : subject,
              ),
            },
          },
        ],
      };
      expect(Either.isLeft(decodeOracleTrace(wrongInitialActor))).toBe(true);
    }

    const emptyFrontier = {
      ...trace,
      steps: [
        ...trace.steps.slice(0, -1),
        { ...entered, frontier: { kind: "acts", acts: [] } },
      ],
    };
    expect(Either.isLeft(decodeOracleTrace(emptyFrontier))).toBe(true);
  });

  it("requires initial admission to start at the first initiative actor but permits progressed turns to advance", () => {
    const trace = evaluateDecodedCase({
      case: {
        creation: { fillBatches: completeCreationFillBatches() },
        sheet: { tag: "ordinary" },
        battle: mixedBattle,
      },
      unitLibrary,
      statBlockCatalog,
    });
    const entered = trace.steps.at(-1);
    expect(entered?.tag).toBe("battleEntered");
    if (entered?.tag !== "battleEntered") return;
    const laterActor = entered.checkpoint.turnOrder[1];
    expect(laterActor).toBeDefined();
    if (laterActor === undefined) return;

    const progressed = Schema.decodeUnknownEither(OracleBattleProgressedSchema)(
      {
        tag: "battleProgressed",
        checkpoint: {
          ...entered.checkpoint,
          currentActorId: laterActor,
        },
        frontier: {
          kind: "acts",
          acts: [
            {
              tag: "runtimeCommand",
              actorId: laterActor,
              command: "endTurn",
            },
          ],
        },
      },
    );
    expect(Either.isRight(progressed)).toBe(true);

    const invalidAdmission = Schema.decodeUnknownEither(
      OracleBattleEnteredSchema,
    )({
      ...entered,
      checkpoint: {
        ...entered.checkpoint,
        currentActorId: laterActor,
      },
      frontier: {
        kind: "acts",
        acts: [
          {
            tag: "runtimeCommand",
            actorId: laterActor,
            command: "endTurn",
          },
        ],
      },
    });
    expect(Either.isLeft(invalidAdmission)).toBe(true);
  });

  it("uses a minimal terminal outcome and rejects impossible terminal spellings", () => {
    const trace = evaluateDecodedCase({
      case: {
        creation: { fillBatches: completeCreationFillBatches() },
        sheet: { tag: "ordinary" },
        battle: mixedBattle,
      },
      unitLibrary,
      statBlockCatalog,
    });
    const entered = trace.steps.at(-1);
    expect(entered?.tag).toBe("battleEntered");
    if (entered?.tag !== "battleEntered") return;

    const resolved = {
      ...trace,
      steps: [...trace.steps, { tag: "battleResolved" as const }],
    };
    expect(Either.isRight(decodeOracleTrace(resolved))).toBe(true);

    const resolvedWithCheckpoint = {
      ...trace,
      steps: [
        ...trace.steps,
        {
          tag: "battleResolved" as const,
          checkpoint: entered.checkpoint,
        },
      ],
    };
    expect(Either.isLeft(decodeOracleTrace(resolvedWithCheckpoint))).toBe(true);

    const resolvedWithFrontier = {
      ...trace,
      steps: [
        ...trace.steps,
        {
          tag: "battleResolved" as const,
          checkpoint: entered.checkpoint,
          frontier: { kind: "terminal" as const, outcome: "resolved" as const },
        },
      ],
    };
    expect(Either.isLeft(decodeOracleTrace(resolvedWithFrontier))).toBe(true);

    const resolvedWithOutcome = {
      ...trace,
      steps: [
        ...trace.steps,
        { tag: "battleResolved" as const, outcome: "resolved" as const },
      ],
    };
    expect(Either.isLeft(decodeOracleTrace(resolvedWithOutcome))).toBe(true);

    const terminalProgressed = {
      ...trace,
      steps: [
        ...trace.steps,
        {
          tag: "battleProgressed" as const,
          checkpoint: entered.checkpoint,
          frontier: { kind: "terminal" as const },
        },
      ],
    };
    expect(Either.isLeft(decodeOracleTrace(terminalProgressed))).toBe(true);

    const terminalRejection = {
      ...trace,
      steps: [
        ...trace.steps,
        {
          tag: "battleAttemptRejected" as const,
          checkpoint: entered.checkpoint,
          frontier: { kind: "terminal" as const },
          reason: "wrongActor" as const,
        },
      ],
    };
    expect(Either.isLeft(decodeOracleTrace(terminalRejection))).toBe(true);
  });

  it(
    "isolates nonempty A/B/A batch evaluation from singleton evaluation",
    () => {
      const caseA = caseWithMoveAttempt({
        battle: twoSkeletonBattleFor("oracle:isolation-a", 10, 0),
        movementCostFeet: 5,
      });
      const caseB = caseWithMoveAttempt({
        battle: twoSkeletonBattleFor("oracle:isolation-b", 8, 1),
        movementCostFeet: 10,
      });
      const singletonA = evaluateDecodedCase({
        case: caseA,
        unitLibrary,
        statBlockCatalog,
      });
      const singletonB = evaluateDecodedCase({
        case: caseB,
        unitLibrary,
        statBlockCatalog,
      });
      const batch = evaluateDecodedBatch({
        batch: { cases: [caseA, caseB, caseA] },
        services: { unitLibrary, statBlockCatalog },
      });
      expect(batch).toHaveLength(3);
      expect(batch[0]).toEqual(singletonA);
      expect(batch[2]).toEqual(singletonA);
      expect(batch[1]).toEqual(singletonB);
      expect(singletonA).not.toEqual(singletonB);
      expect(batch[1].steps.at(-1)?.tag).toBe("battleProgressed");
    },
    ORACLE_LONG_TEST_TIMEOUT_MS,
  );

  it(
    "matches individual and batch evaluation for nonempty move cases",
    () => {
      const cases = [
        caseWithMoveAttempt({
          battle: twoSkeletonBattleFor("oracle:batch-a", 12, 0),
          movementCostFeet: 5,
        }),
        caseWithMoveAttempt({
          battle: twoSkeletonBattleFor("oracle:batch-b", 9, 2),
          movementCostFeet: 15,
        }),
      ];
      const individual = cases.map((oracleCase) =>
        evaluateDecodedCase({
          case: oracleCase,
          unitLibrary,
          statBlockCatalog,
        }),
      );
      const batch = evaluateDecodedBatch({
        batch: { cases },
        services: { unitLibrary, statBlockCatalog },
      });

      expect(batch).toEqual(individual);
    },
    ORACLE_LONG_TEST_TIMEOUT_MS,
  );

  it("keeps valid movement-distance cases deterministic and round-trippable", () => {
    const baseCase = caseWithMoveAttempt({
      battle: twoSkeletonBattleFor("oracle:property", 10, 0),
      movementCostFeet: 5,
    });

    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10 }), (movementCost) => {
        const oracleCase = caseWithMovementCost(baseCase, movementCost);
        const first = evaluateDecodedCase({
          case: oracleCase,
          unitLibrary,
          statBlockCatalog,
        });
        const second = evaluateDecodedCase({
          case: oracleCase,
          unitLibrary,
          statBlockCatalog,
        });

        expect(second).toEqual(first);
        expect(JSON.stringify(second)).toBe(JSON.stringify(first));

        const decodedCase = decodeOracleCase(oracleCase);
        expect(Either.isRight(decodedCase)).toBe(true);
        if (Either.isLeft(decodedCase)) return;
        const encodedCase = Schema.encodeSync(OracleCaseSchema)(
          decodedCase.right,
        );
        const caseRoundTrip = decodeOracleCase(encodedCase);
        expect(Either.isRight(caseRoundTrip)).toBe(true);
        if (Either.isLeft(caseRoundTrip)) return;
        expect(caseRoundTrip.right).toEqual(decodedCase.right);

        const encodedTrace = Schema.encodeSync(OracleTraceSchema)(first);
        const traceRoundTrip = decodeOracleTrace(encodedTrace);
        expect(Either.isRight(traceRoundTrip)).toBe(true);
        if (Either.isLeft(traceRoundTrip)) return;
        expect(traceRoundTrip.right).toEqual(first);

        const validMoveAttempt = oracleCase.battle.attempts[0];
        if (
          validMoveAttempt?.kind !== "ordinarySubject" ||
          validMoveAttempt.subject.tag !== "runtimeCommand" ||
          validMoveAttempt.subject.command !== "move"
        ) {
          throw new Error("property fixture must contain a Move attempt");
        }
        const wrongActorAttempt = {
          kind: "ordinarySubject" as const,
          subject: {
            ...validMoveAttempt.subject,
            actorId: combatantId("oracle:property-wrong-actor"),
          },
          fills: [],
        } satisfies OracleBattleAttempt;
        const retryCase = {
          ...oracleCase,
          battle: {
            ...oracleCase.battle,
            attempts: [wrongActorAttempt, validMoveAttempt],
          },
        };
        const retry = evaluateDecodedCase({
          case: retryCase,
          unitLibrary,
          statBlockCatalog,
        });
        const rejection = retry.steps.at(-2);
        const retriedFrontierStep = retry.steps.at(-1);
        expect(rejection?.tag).toBe("battleAttemptRejected");
        expect(retriedFrontierStep?.tag).toBe("battleProgressed");
        if (
          rejection?.tag !== "battleAttemptRejected" ||
          retriedFrontierStep?.tag !== "battleProgressed"
        ) {
          return;
        }
        expect(rejection.reason).toBe("wrongActor");
        expect(rejection.checkpoint).toEqual(
          first.steps.find((step) => step.tag === "battleEntered")?.checkpoint,
        );
        expect(rejection.frontier).toEqual(
          first.steps.find((step) => step.tag === "battleEntered")?.frontier,
        );
        const firstFinalStep = first.steps.at(-1);
        expect(firstFinalStep?.tag).toBe("battleProgressed");
        if (firstFinalStep?.tag !== "battleProgressed") return;
        expect(retriedFrontierStep.frontier).toEqual(firstFinalStep.frontier);
      }),
      { numRuns: 2, seed: 0x122066, endOnFailure: true },
    );
  }, 20_000);

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
          tempHp: 0,
        },
        {
          origin: "statBlock" as const,
          combatantId: combatantId("oracle:broken-two"),
          statBlockId: statBlockId("stat_block_skeleton"),
          initiative: 0,
          ammunitionStocks: [{ ammunition: "arrow", remaining: 0 }],
          conditions: ["prone"],
          tempHp: 0,
        },
      ] as const,
      attempts: [],
    };
    const rejected = evaluateDecodedCase({
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
        projectionIssues?.tag === "characterBattleEncounterProjectionIssues"
      ) {
        expect(JSON.stringify(projectionIssues)).not.toContain("message");
        expect(projectionIssues.issues).toHaveLength(2);
        expect(
          projectionIssues.issues.map((issue) => issue.combatantId),
        ).toEqual([
          combatantId("oracle:broken-one"),
          combatantId("oracle:broken-two"),
        ]);
      }
    }

    const missing = evaluateDecodedCase({
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
              tempHp: 0,
            },
          ],
          attempts: [],
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

  it("keeps one branded Effect Trace authority", () => {
    expect(oracleTraceSchema).toBeDefined();
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
    const trace = evaluateDecodedCase({
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

type EvaluationServices = Omit<
  Parameters<typeof evaluateOracleCase>[0],
  "case"
>;

function evaluateDecodedCase(
  input: EvaluationServices & { readonly case: unknown },
) {
  const decoded = decodeOracleCase(input.case);
  if (Either.isLeft(decoded)) throw new Error("test Case must decode");
  return evaluateOracleCase({ ...input, case: decoded.right });
}

function evaluateDecodedBatch(input: {
  readonly batch: { readonly cases: readonly unknown[] };
  readonly services: EvaluationServices;
}) {
  const cases = input.batch.cases.map((candidate) => {
    const decoded = decodeOracleCase(candidate);
    if (Either.isLeft(decoded)) throw new Error("test Case must decode");
    return decoded.right;
  });
  if (cases.length === 0) throw new Error("test batch must be non-empty");
  return evaluateOracleBatch({
    services: input.services,
    batch: { cases: [cases[0], ...cases.slice(1)] },
  });
}

type OracleCaseCandidate = {
  readonly creation: {
    readonly fillBatches: ReturnType<typeof completeCreationFillBatches>;
  };
  readonly sheet: { readonly tag: "ordinary" };
  readonly battle: OracleBattleInput;
};

function twoSkeletonBattleFor(
  identityPrefix: string,
  firstInitiative: number,
  secondInitiative: number,
): OracleBattleInput {
  const roster = [
    {
      origin: "statBlock" as const,
      combatantId: combatantId(`${identityPrefix}:a`),
      statBlockId: statBlockId("stat_block_skeleton"),
      initiative: firstInitiative,
      ammunitionStocks: [{ ammunition: "arrow" as const, remaining: 0 }],
      conditions: [],
      tempHp: 0,
    },
    {
      origin: "statBlock" as const,
      combatantId: combatantId(`${identityPrefix}:b`),
      statBlockId: statBlockId("stat_block_skeleton"),
      initiative: secondInitiative,
      ammunitionStocks: [{ ammunition: "arrow" as const, remaining: 0 }],
      conditions: [],
      tempHp: 0,
    },
  ] satisfies OracleBattleInput["roster"];
  return { roster, attempts: [] };
}

function caseWithMoveAttempt(input: {
  readonly battle: OracleBattleInput;
  readonly movementCostFeet: number;
}): OracleCaseCandidate {
  const baseCase: OracleCaseCandidate = {
    creation: { fillBatches: standardCreationFillBatches },
    sheet: { tag: "ordinary" },
    battle: { ...input.battle, attempts: [] },
  };
  const initial = evaluateDecodedCase({
    case: baseCase,
    unitLibrary,
    statBlockCatalog,
  });
  const entered = initial.steps.at(-1);
  if (entered?.tag !== "battleEntered") {
    throw new Error("move fixture must enter Battle");
  }
  const moveSubject = entered.frontier.acts.find(
    (subject) => subject.tag === "runtimeCommand" && subject.command === "move",
  );
  if (moveSubject?.tag !== "runtimeCommand" || moveSubject.command !== "move") {
    throw new Error("move fixture must expose Move");
  }
  const moveHoles = evaluateDecodedCase({
    case: {
      ...baseCase,
      battle: {
        ...baseCase.battle,
        attempts: [
          { kind: "ordinarySubject", subject: moveSubject, fills: [] },
        ],
      },
    },
    unitLibrary,
    statBlockCatalog,
  });
  const ordinary = moveHoles.steps.at(-1);
  if (
    ordinary?.tag !== "battleProgressed" ||
    ordinary.frontier.kind !== "ordinaryHoles"
  ) {
    throw new Error("move fixture must expose ordinary holes");
  }
  const movementHole = ordinary.frontier.holes.find(
    (hole) => hole.kind === "movement",
  );
  if (movementHole?.kind !== "movement") {
    throw new Error("move fixture must expose a movement hole");
  }
  const movement = {
    kind: "movement" as const,
    holeId: movementHole.holeId,
    value: {
      speedKind: "walk" as const,
      movementCostFeet: movementFeet(input.movementCostFeet),
      provokedOpportunityAttacks: [],
    },
  } satisfies BattleFill;
  const moveAttempt = {
    kind: "ordinarySubject" as const,
    subject: moveSubject,
    fills: [movement],
  } satisfies OracleBattleAttempt;
  return {
    ...baseCase,
    battle: { ...baseCase.battle, attempts: [moveAttempt] },
  };
}

function caseWithMovementCost(
  baseCase: OracleCaseCandidate,
  movementCostFeet: number,
): OracleCaseCandidate {
  const moveAttempt = baseCase.battle.attempts[0];
  if (
    moveAttempt?.kind !== "ordinarySubject" ||
    moveAttempt.subject.tag !== "runtimeCommand" ||
    moveAttempt.subject.command !== "move"
  ) {
    throw new Error("movement-cost fixture must contain a Move attempt");
  }
  const movement = moveAttempt.fills[0];
  if (movement?.kind !== "movement") {
    throw new Error("movement-cost fixture must contain a movement fill");
  }
  const updatedMoveAttempt = {
    ...moveAttempt,
    fills: [
      {
        ...movement,
        value: {
          ...movement.value,
          movementCostFeet: movementFeet(movementCostFeet),
        },
      },
    ],
  } satisfies OracleBattleAttempt;
  return {
    ...baseCase,
    battle: { ...baseCase.battle, attempts: [updatedMoveAttempt] },
  };
}

function skeletonShortswordProcedureRef() {
  const skeletonA = battleCreatureInitFromStatBlock({
    combatantId: combatantId("oracle:skeleton-a"),
    statBlock: skeletonStatBlock,
    initiative: initiativeScore(10),
    ammunitionStocks: [{ ammunition: "arrow", remaining: resourceCount(0) }],
    conditions: [],
  });
  const skeletonB = battleCreatureInitFromStatBlock({
    combatantId: combatantId("oracle:skeleton-b"),
    statBlock: skeletonStatBlock,
    initiative: initiativeScore(0),
    ammunitionStocks: [{ ammunition: "arrow", remaining: resourceCount(0) }],
    conditions: [],
  });
  if (Either.isLeft(skeletonA) || Either.isLeft(skeletonB)) {
    throw new Error("test skeletons must initialize");
  }
  const started = startBattle({
    battleId: ORACLE_BATTLE_ID,
    combatants: [skeletonA.right, skeletonB.right],
  });
  if (Either.isLeft(started)) {
    throw new Error("test skeletons must start a battle");
  }
  const ended = endBattleRuntimeTurn({
    session: started.right,
    actorId: combatantId("oracle:skeleton-a"),
  });
  if (ended.tag !== "resolved") {
    throw new Error("test skeleton A turn must end");
  }
  const shortsword = discoverBattleActs(ended.session).find(
    (act) =>
      act.subject.tag === "action" &&
      act.subject.action === "attack" &&
      act.presentation.kind === "attack" &&
      act.presentation.name === "Shortsword" &&
      !("statBlockDamageNotation" in act.subject),
  );
  if (
    shortsword?.subject.tag !== "action" ||
    shortsword.subject.action !== "attack" ||
    "statBlockDamageNotation" in shortsword.subject
  ) {
    throw new Error("test skeleton B must expose canonical Shortsword");
  }
  const procedureRef = Schema.decodeUnknownEither(
    BattleStatBlockProcedureExecutionRef,
  )(shortsword.subject.procedureRef);
  if (Either.isLeft(procedureRef)) {
    throw new Error("test skeleton Shortsword ref must be canonical");
  }
  return procedureRef.right;
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
