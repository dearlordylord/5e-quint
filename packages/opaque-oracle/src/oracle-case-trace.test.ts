import { statBlockId } from "@dnd/shared/game-facts";
import {
  BattleFillSchema,
  combatantId,
  BattleSubjectSchema,
  initiativeScore,
  type BattleFill,
} from "@dnd/battle-runtime";
import { DieRollResult, movementFeet } from "@dnd/shared/types";
import { Either, Option, Schema } from "effect";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  creationChoiceOptionId,
  creationHoleId,
} from "@dnd/character-creation-runtime";
import {
  decodeOracleCase,
  decodeOracleCaseJson,
  decodeOracleTrace,
  decodeOracleTraceJson,
  canonicalStructuralKey,
  evaluateOracleBatch,
  evaluateOracleCase,
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
  OracleBattleContinuationSchema,
  OracleBattleEnteredSchema,
  OracleBattleInterruptDecisionFillSchema,
  type OracleBattleContinuation,
  type OracleBattleEntered,
  type OracleTrace,
} from "./oracle-case-trace-schema.ts";
import {
  completeCreationFillBatches as buildCompleteCreationFillBatches,
  discoverStatBlockAttackProcedureRef,
  startStatBlockBattle,
  statBlockBattleFor,
  type OracleStatBlockBattlePlacement,
} from "./oracle-evaluation-corpus-source.ts";

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
const statBlockRecord = statBlockCatalog.getStatBlock("stat_block_skeleton");
if (Option.isNone(statBlockRecord)) {
  throw new Error("SRD stat-block fixture must be available.");
}
const projectionFailureStatBlockCatalog: StatBlockCatalog = {
  ...statBlockCatalog,
  getStatBlock: (id) =>
    id === statBlockRecord.value.id
      ? Option.some({
          ...statBlockRecord.value,
          statBlock: {
            ...statBlockRecord.value.statBlock,
            immunities: {
              ...(statBlockRecord.value.statBlock.immunities ?? {}),
              conditions: ["prone"] as const,
            },
          },
        })
      : statBlockCatalog.getStatBlock(id),
};

const statBlockBattle = statBlockBattleFor([
  {
    combatantId: combatantId("oracle:stat-block"),
    statBlockId: statBlockId("stat_block_skeleton"),
    initiative: initiativeScore(0),
  },
]);

const twoStatBlockBattle = statBlockBattleFor([
  {
    combatantId: combatantId("oracle:skeleton-a"),
    statBlockId: statBlockId("stat_block_skeleton"),
    initiative: initiativeScore(10),
  },
  {
    combatantId: combatantId("oracle:skeleton-b"),
    statBlockId: statBlockId("stat_block_skeleton"),
    initiative: initiativeScore(0),
  },
]);

const mixedBattle = {
  roster: {
    tag: "characterSheet" as const,
    precedingStatBlocks: [],
    characterSheet: {
      combatantId: combatantId("oracle:character"),
      initiative: initiativeScore(1),
      ammunitionStocks: {},
    },
    followingStatBlocks: statBlockBattle.roster.entries,
  },
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

  it("sorts true sets without deduplicating them and preserves roster order", () => {
    const reversedKnownForms = decodeOracleCase({
      creation: { fillBatches: [] },
      sheet: {
        tag: "wildShapeKnownForms",
        statBlockIds: [
          statBlockId("stat_block_skeleton"),
          statBlockId("stat_block_rat"),
        ],
      },
      battle: statBlockBattle,
    });
    expect(Either.isRight(reversedKnownForms)).toBe(true);
    if (Either.isRight(reversedKnownForms)) {
      expect(reversedKnownForms.right.sheet).toEqual({
        tag: "wildShapeKnownForms",
        statBlockIds: [
          statBlockId("stat_block_rat"),
          statBlockId("stat_block_skeleton"),
        ],
      });
    }

    const duplicatedKnownForms = decodeOracleCase({
      creation: { fillBatches: [] },
      sheet: {
        tag: "wildShapeKnownForms",
        statBlockIds: [
          statBlockId("stat_block_skeleton"),
          statBlockId("stat_block_skeleton"),
        ],
      },
      battle: statBlockBattle,
    });
    expect(Either.isLeft(duplicatedKnownForms)).toBe(true);

    const ordered = decodeOracleCase({
      creation: { fillBatches: [] },
      sheet: { tag: "ordinary" },
      battle: {
        roster: {
          tag: "statBlocks",
          entries: [
            {
              ...twoStatBlockBattle.roster.entries[0],
              initiative: 0,
            },
            {
              ...twoStatBlockBattle.roster.entries[1],
              initiative: 0,
            },
          ],
        },
        attempts: [],
      },
    });
    const reversed = decodeOracleCase({
      creation: { fillBatches: [] },
      sheet: { tag: "ordinary" },
      battle: {
        roster: {
          tag: "statBlocks",
          entries: [
            {
              ...twoStatBlockBattle.roster.entries[1],
              initiative: 0,
            },
            {
              ...twoStatBlockBattle.roster.entries[0],
              initiative: 0,
            },
          ],
        },
        attempts: [],
      },
    });
    expect(Either.isRight(ordered)).toBe(true);
    expect(Either.isRight(reversed)).toBe(true);
    if (Either.isRight(ordered) && Either.isRight(reversed)) {
      expect(ordered.right.battle.roster).not.toEqual(
        reversed.right.battle.roster,
      );
    }
  });

  it("keeps hostile and cyclic unknown input total at the decode boundary", () => {
    const cyclic: Record<string, unknown> = {
      creation: { fillBatches: [] },
      sheet: { tag: "ordinary" },
      battle: statBlockBattle,
    };
    cyclic.self = cyclic;
    expect(canonicalStructuralKey({ a: 1, b: "two" })).toBe(
      canonicalStructuralKey({ b: "two", a: 1 }),
    );
    expect(canonicalStructuralKey([1, 2])).not.toBe(
      canonicalStructuralKey([2, 1]),
    );
    expect(canonicalStructuralKey([1])).not.toBe(canonicalStructuralKey(["1"]));
    expect(canonicalStructuralKey(cyclic)).toContain("object:cycle");
    expect(() => decodeOracleCase(cyclic)).not.toThrow();
    expect(Either.isLeft(decodeOracleCase(cyclic))).toBe(true);

    const hostile = new Proxy(
      {
        creation: { fillBatches: [] },
        sheet: { tag: "ordinary" },
        battle: statBlockBattle,
      },
      {
        ownKeys: () => {
          throw new Error("hostile ownKeys trap");
        },
      },
    );
    expect(() => decodeOracleCase(hostile)).not.toThrow();
    expect(Either.isLeft(decodeOracleCase(hostile))).toBe(true);
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

  it("admits empty or all-Stat-Block rosters but rejects legacy multi-Sheet input, duplicate conditions, and omitted temp HP", () => {
    const empty = decodeOracleCase({
      creation: { fillBatches: [] },
      sheet: { tag: "ordinary" },
      battle: { roster: { tag: "statBlocks", entries: [] }, attempts: [] },
    });
    expect(Either.isRight(empty)).toBe(true);

    const duplicateSheet = decodeOracleCase({
      creation: { fillBatches: [] },
      sheet: { tag: "ordinary" },
      battle: {
        roster: [
          {
            combatantId: combatantId("oracle:character-one"),
            initiative: 1,
            ammunitionStocks: {},
          },
          {
            combatantId: combatantId("oracle:character-two"),
            initiative: 0,
            ammunitionStocks: {},
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
        roster: {
          tag: "statBlocks",
          entries: [
            {
              ...statBlockBattle.roster.entries[0],
              conditions: ["prone", "prone"],
            },
          ],
        },
        attempts: [],
      },
    });
    expect(Either.isLeft(duplicateConditions)).toBe(true);
    if (Either.isLeft(duplicateConditions)) {
      expect(duplicateConditions.left).toContainEqual({
        path: "/battle/roster/entries/0/conditions",
        code: "duplicateCollectionMember",
      });
    }

    const omittedTempHp = decodeOracleCase({
      creation: { fillBatches: [] },
      sheet: { tag: "ordinary" },
      battle: {
        roster: {
          tag: "statBlocks",
          entries: [
            {
              combatantId: combatantId("oracle:missing-temp-hp"),
              statBlockId: statBlockId("stat_block_skeleton"),
              initiative: 0,
              ammunitionStocks: {},
              conditions: [],
            },
          ],
        },
        attempts: [],
      },
    });
    expect(Either.isLeft(omittedTempHp)).toBe(true);
    if (Either.isLeft(omittedTempHp)) {
      expect(omittedTempHp.left).toContainEqual({
        path: "/battle/roster/entries/0/tempHp",
        code: "missingMember",
      });
    }
  });

  it("requires every creation trace to own exactly one outcome", () => {
    const incomplete = decodeOracleTrace({
      creation: { started: { holes: [] }, progression: [] },
    });
    expect(Either.isLeft(incomplete)).toBe(true);
    if (Either.isLeft(incomplete)) {
      expect(incomplete.left).toContainEqual({
        path: "/creation/outcome",
        code: "missingMember",
      });
    }

    const exhausted = decodeOracleTrace({
      creation: {
        started: { holes: [] },
        progression: [],
        outcome: { tag: "inputExhausted" },
      },
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
    expect(first.creation.outcome).toEqual({ tag: "inputExhausted" });
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

    const built = trace.creation.outcome;
    expect(built.tag).toBe("built");
    if (built.tag !== "built") return;
    expect(built.sheet.tag).toBe("constructed");
    expect(Either.isRight(decodeOracleTrace(trace))).toBe(true);
    if (built.sheet.tag === "constructed") {
      expect(built.sheet.sheet).not.toHaveProperty("characterId");
      expect(built.sheet.sheet).not.toHaveProperty("build");
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
    expect(surplus.creation.outcome).toMatchObject({
      tag: "inputSurplus",
      index: fillBatches.length,
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
    const battleStep = requireBattleEntered(trace);
    expect(Object.keys(battleStep.checkpoint).sort()).toEqual([
      "alreadyActed",
      "round",
      "stillToAct",
    ]);
    const initiativeStack = [
      ...battleStep.checkpoint.alreadyActed,
      ...battleStep.checkpoint.stillToAct,
    ];
    expect(Object.keys(initiativeStack[0]?.creature ?? {}).sort()).toEqual([
      "armorClass",
      "combatantId",
      "conditions",
      "hp",
      "maxHp",
      "origin",
      "size",
      "tempHp",
    ]);
    expect(initiativeStack.map(({ creature }) => creature.origin.kind)).toEqual(
      ["character", "statBlock"],
    );
    expect(initiativeStack[0]).toHaveProperty("initiative");
    expect(initiativeStack[0]?.creature).not.toHaveProperty("initiative");
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
    const entered = requireBattleEntered(successful);
    expect(entered.frontier.acts.length).toBeGreaterThan(0);
    expect(
      entered.frontier.acts.every(
        (subject) =>
          !Object.prototype.hasOwnProperty.call(subject, "initialHoles"),
      ),
    ).toBe(true);

    const empty = evaluateDecodedCase({
      case: {
        creation: { fillBatches: completeCreationFillBatches() },
        sheet: { tag: "ordinary" },
        battle: { roster: { tag: "statBlocks", entries: [] }, attempts: [] },
      },
      unitLibrary,
      statBlockCatalog,
    });
    expect(empty.creation.outcome).toMatchObject({ tag: "built" });
    if (empty.creation.outcome.tag === "built") {
      expect(empty.creation.outcome.sheet.tag).toBe("constructed");
      if (empty.creation.outcome.sheet.tag === "constructed") {
        expect(empty.creation.outcome.sheet.battle).toEqual({
          tag: "rejected",
          issues: [{ tag: "characterBattleEncounterEmptyRoster" }],
        });
      }
    }
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
    const entered = requireBattleEntered(initial);
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
    const progressed = requireBattleContinuation(
      requireBattleEntered(trace),
      0,
    );
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
    const entered = requireBattleEntered(initial);
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
    const traceEntered = requireBattleEntered(trace);
    const progressed = requireBattleContinuation(traceEntered, 0);
    expect(traceEntered.segment.rejections).toEqual(["wrongActor"]);
    expect(traceEntered.checkpoint).toEqual(entered.checkpoint);
    expect(traceEntered.frontier).toEqual(entered.frontier);
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
          battle: twoStatBlockBattle,
        },
        unitLibrary,
        statBlockCatalog,
      });
      const entered = requireBattleEntered(initial);

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
            ...twoStatBlockBattle,
            attempts: [
              { kind: "ordinarySubject", subject: moveSubject, fills: [] },
            ],
          },
        },
        unitLibrary,
        statBlockCatalog,
      });
      const ordinary = requireBattleContinuation(
        requireBattleEntered(moveHoles),
        0,
      );
      expect(ordinary.frontier.kind).toBe("ordinaryHoles");
      if (ordinary.frontier.kind !== "ordinaryHoles") return;
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
              procedureRef: statBlockAttackProcedureRef(),
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
            ...twoStatBlockBattle,
            attempts: [moveAttempt],
          },
        },
        unitLibrary,
        statBlockCatalog,
      });
      const validFrontierStep = requireBattleContinuation(
        requireBattleEntered(valid),
        0,
      );
      expect(validFrontierStep.frontier.kind).toBe("interruptDecision");
      if (validFrontierStep.frontier.kind !== "interruptDecision") return;
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
            ...twoStatBlockBattle,
            attempts: [moveAttempt, interruptAttempt],
          },
        },
        unitLibrary,
        statBlockCatalog,
      });
      const afterInterruptStep = requireBattleContinuation(
        requireBattleEntered(afterInterrupt),
        1,
      );
      expect(afterInterruptStep.frontier.kind).toBe("ordinaryHoles");
      if (afterInterruptStep.frontier.kind !== "ordinaryHoles") return;
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
            ...twoStatBlockBattle,
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
      const afterAttackRollStep = requireBattleContinuation(
        requireBattleEntered(afterAttackRoll),
        2,
      );
      expect(afterAttackRollStep.frontier.kind).toBe("ordinaryHoles");
      if (afterAttackRollStep.frontier.kind !== "ordinaryHoles") return;
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
            ...twoStatBlockBattle,
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
      const afterRolledDiceStep = requireBattleContinuation(
        requireBattleEntered(afterRolledDice),
        2,
      );
      expect(afterRolledDiceStep.frontier.kind).toBe("ordinaryHoles");
      if (afterRolledDiceStep.frontier.kind !== "ordinaryHoles") return;
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
            ...twoStatBlockBattle,
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
      const resolvedStep = requireBattleContinuation(
        requireBattleEntered(resolved),
        2,
      );
      expect(resolvedStep.frontier.kind).toBe("acts");
      if (resolvedStep.frontier.kind !== "acts") return;
      const defeated = [
        ...resolvedStep.checkpoint.alreadyActed,
        ...resolvedStep.checkpoint.stillToAct,
      ].find(
        ({ creature }) =>
          creature.combatantId === combatantId("oracle:skeleton-a"),
      );
      expect(defeated?.creature.hp).toBe(0);
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
            ...twoStatBlockBattle,
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
      const retryEntered = requireBattleEntered(retry);
      const retriedFrontierStep = requireBattleContinuation(retryEntered, 0);
      expect(retryEntered.segment.rejections).toEqual(["wrongActor"]);
      expect(retryEntered.checkpoint).toEqual(entered.checkpoint);
      expect(retryEntered.frontier).toEqual(entered.frontier);
      expect(retriedFrontierStep.frontier).toEqual(validFrontierStep.frontier);
      expect(Either.isRight(decodeOracleTrace(valid))).toBe(true);
      expect(Either.isRight(decodeOracleTrace(retry))).toBe(true);
    },
    ORACLE_LONG_TEST_TIMEOUT_MS,
  );

  it(
    "keeps an outer Move interrupt pending while a Ready action reaction resolves",
    () => {
      const distinctReactorId = combatantId("oracle:reaction-skeleton");
      const reactionTemplate = mixedBattle.roster.followingStatBlocks[0];
      expect(reactionTemplate).toBeDefined();
      if (reactionTemplate === undefined) return;
      const readyReactionBattle = {
        ...mixedBattle,
        roster: {
          ...mixedBattle.roster,
          followingStatBlocks: [
            ...mixedBattle.roster.followingStatBlocks,
            {
              ...reactionTemplate,
              combatantId: distinctReactorId,
              initiative: -1,
            },
          ],
        },
      };
      const initial = evaluateDecodedCase({
        case: {
          creation: { fillBatches: completeCreationFillBatches() },
          sheet: { tag: "ordinary" },
          battle: readyReactionBattle,
        },
        unitLibrary,
        statBlockCatalog,
      });
      const entered = requireBattleEntered(initial);
      const readySubject = entered.frontier.acts.find(
        (subject) =>
          subject.tag === "action" &&
          subject.action === "ready" &&
          subject.actorId === combatantId("oracle:character"),
      );
      expect(readySubject).toBeDefined();
      if (readySubject?.tag !== "action" || readySubject.action !== "ready") {
        return;
      }

      const readyHolesTrace = evaluateDecodedCase({
        case: {
          creation: { fillBatches: completeCreationFillBatches() },
          sheet: { tag: "ordinary" },
          battle: {
            ...readyReactionBattle,
            attempts: [
              { kind: "ordinarySubject", subject: readySubject, fills: [] },
            ],
          },
        },
        unitLibrary,
        statBlockCatalog,
      });
      const readyHolesStep = requireBattleContinuation(
        requireBattleEntered(readyHolesTrace),
        0,
      );
      expect(readyHolesStep.frontier.kind).toBe("ordinaryHoles");
      if (readyHolesStep.frontier.kind !== "ordinaryHoles") return;
      const readyHole = readyHolesStep.frontier.holes.find(
        (hole) => hole.kind === "readyDeclaration",
      );
      expect(readyHole).toBeDefined();
      if (readyHole?.kind !== "readyDeclaration") return;
      const dodgeResponse = readyHole.responseChoices.find(
        (response) =>
          response.kind === "action" &&
          response.subject.tag === "action" &&
          response.subject.action === "dodge",
      );
      expect(dodgeResponse).toBeDefined();
      if (
        dodgeResponse?.kind !== "action" ||
        dodgeResponse.subject.tag !== "action" ||
        dodgeResponse.subject.action !== "dodge"
      ) {
        return;
      }
      const readyFill = Schema.decodeUnknownEither(BattleFillSchema)({
        kind: "readyDeclaration",
        holeId: readyHole.holeId,
        value: {
          trigger: "the skeleton moves",
          response: { kind: "action", subject: dodgeResponse.subject },
        },
      });
      expect(Either.isRight(readyFill)).toBe(true);
      if (Either.isLeft(readyFill)) return;
      const readyAttempt = {
        kind: "ordinarySubject" as const,
        subject: readySubject,
        fills: [readyFill.right],
      } satisfies OracleBattleAttempt;

      const afterReady = evaluateDecodedCase({
        case: {
          creation: { fillBatches: completeCreationFillBatches() },
          sheet: { tag: "ordinary" },
          battle: { ...readyReactionBattle, attempts: [readyAttempt] },
        },
        unitLibrary,
        statBlockCatalog,
      });
      const afterReadyStep = requireBattleContinuation(
        requireBattleEntered(afterReady),
        0,
      );
      expect(afterReadyStep.frontier.kind).toBe("acts");
      if (afterReadyStep.frontier.kind !== "acts") return;
      const endTurnSubject = afterReadyStep.frontier.acts.find(
        (subject) =>
          subject.tag === "runtimeCommand" &&
          subject.command === "endTurn" &&
          subject.actorId === readySubject.actorId,
      );
      expect(endTurnSubject).toBeDefined();
      if (
        endTurnSubject?.tag !== "runtimeCommand" ||
        endTurnSubject.command !== "endTurn"
      ) {
        return;
      }
      const endTurnAttempt = {
        kind: "ordinarySubject" as const,
        subject: endTurnSubject,
        fills: [],
      } satisfies OracleBattleAttempt;

      const afterEndTurn = evaluateDecodedCase({
        case: {
          creation: { fillBatches: completeCreationFillBatches() },
          sheet: { tag: "ordinary" },
          battle: {
            ...readyReactionBattle,
            attempts: [readyAttempt, endTurnAttempt],
          },
        },
        unitLibrary,
        statBlockCatalog,
      });
      const afterEndTurnStep = requireBattleContinuation(
        requireBattleEntered(afterEndTurn),
        1,
      );
      expect(afterEndTurnStep.frontier.kind).toBe("acts");
      if (afterEndTurnStep.frontier.kind !== "acts") return;
      const moveSubject = afterEndTurnStep.frontier.acts.find(
        (subject) =>
          subject.tag === "runtimeCommand" &&
          subject.command === "move" &&
          subject.actorId !== distinctReactorId,
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
            ...readyReactionBattle,
            attempts: [
              readyAttempt,
              endTurnAttempt,
              { kind: "ordinarySubject", subject: moveSubject, fills: [] },
            ],
          },
        },
        unitLibrary,
        statBlockCatalog,
      });
      const moveHolesStep = requireBattleContinuation(
        requireBattleEntered(moveHoles),
        2,
      );
      expect(moveHolesStep.frontier.kind).toBe("ordinaryHoles");
      if (moveHolesStep.frontier.kind !== "ordinaryHoles") return;
      const movementHole = moveHolesStep.frontier.holes.find(
        (hole) => hole.kind === "movement",
      );
      expect(movementHole).toBeDefined();
      if (movementHole?.kind !== "movement") return;
      const movementFill = Schema.decodeUnknownEither(BattleFillSchema)({
        kind: "movement",
        holeId: movementHole.holeId,
        value: {
          speedKind: "walk",
          movementCostFeet: movementFeet(10),
          provokedOpportunityAttacks: [
            {
              reactorId: distinctReactorId,
              distanceFeet: movementFeet(5),
              procedureRef: statBlockAttackProcedureRef(distinctReactorId),
            },
          ],
        },
      });
      expect(Either.isRight(movementFill)).toBe(true);
      if (Either.isLeft(movementFill)) return;
      const moveAttempt = {
        kind: "ordinarySubject" as const,
        subject: moveSubject,
        fills: [movementFill.right],
      } satisfies OracleBattleAttempt;

      const afterMove = evaluateDecodedCase({
        case: {
          creation: { fillBatches: completeCreationFillBatches() },
          sheet: { tag: "ordinary" },
          battle: {
            ...readyReactionBattle,
            attempts: [readyAttempt, endTurnAttempt, moveAttempt],
          },
        },
        unitLibrary,
        statBlockCatalog,
      });
      const afterMoveStep = requireBattleContinuation(
        requireBattleEntered(afterMove),
        2,
      );
      expect(afterMoveStep.frontier.kind).toBe("interruptDecision");
      if (afterMoveStep.frontier.kind !== "interruptDecision") return;
      expect(afterMoveStep.frontier.decisionHole.trigger).toBe(
        "opportunityAttack",
      );

      const reportSubjectResult = Schema.decodeUnknownEither(
        BattleSubjectSchema,
      )({
        tag: "runtimeCommand",
        actorId: moveSubject.actorId,
        command: "reportReadyTrigger",
        readiedActorId: readySubject.actorId,
      });
      expect(Either.isRight(reportSubjectResult)).toBe(true);
      if (Either.isLeft(reportSubjectResult)) return;
      const reportAttempt = {
        kind: "ordinarySubject" as const,
        subject: reportSubjectResult.right,
        fills: [],
      } satisfies OracleBattleAttempt;
      const afterReport = evaluateDecodedCase({
        case: {
          creation: { fillBatches: completeCreationFillBatches() },
          sheet: { tag: "ordinary" },
          battle: {
            ...readyReactionBattle,
            attempts: [
              readyAttempt,
              endTurnAttempt,
              moveAttempt,
              reportAttempt,
            ],
          },
        },
        unitLibrary,
        statBlockCatalog,
      });
      const afterReportStep = requireBattleContinuation(
        requireBattleEntered(afterReport),
        3,
      );
      expect(afterReportStep.frontier.kind).toBe("interruptDecision");
      if (afterReportStep.frontier.kind !== "interruptDecision") return;

      const repeatedReport = evaluateDecodedCase({
        case: {
          creation: { fillBatches: completeCreationFillBatches() },
          sheet: { tag: "ordinary" },
          battle: {
            ...readyReactionBattle,
            attempts: [
              readyAttempt,
              endTurnAttempt,
              moveAttempt,
              reportAttempt,
              reportAttempt,
            ],
          },
        },
        unitLibrary,
        statBlockCatalog,
      });
      const repeatedReportStep = requireBattleContinuation(
        requireBattleEntered(repeatedReport),
        3,
      );
      expect(repeatedReportStep.frontier).toEqual(afterReportStep.frontier);
      expect(repeatedReportStep.segment.rejections).toEqual(["staleSubject"]);

      const releaseReadiedAction = afterReportStep.frontier.choices.find(
        (choice) =>
          choice.kind === "nestedProcedure" &&
          choice.subject.command === "releaseReadiedAction",
      );
      expect(releaseReadiedAction).toBeDefined();
      if (
        releaseReadiedAction?.kind !== "nestedProcedure" ||
        releaseReadiedAction.subject.command !== "releaseReadiedAction"
      ) {
        return;
      }
      const releaseFill = Schema.decodeUnknownEither(
        OracleBattleInterruptDecisionFillSchema,
      )({
        kind: "interruptDecision",
        holeId: afterReportStep.frontier.decisionHole.holeId,
        value: {
          kind: "resolve",
          responderId: releaseReadiedAction.subject.reactorId,
          choice: { kind: "releaseReadiedAction", fills: [] },
        },
      });
      expect(Either.isRight(releaseFill)).toBe(true);
      if (Either.isLeft(releaseFill)) return;
      const releaseAttempt = {
        kind: "interruptDecision" as const,
        fill: releaseFill.right,
      } satisfies OracleBattleAttempt;

      const afterRelease = evaluateDecodedCase({
        case: {
          creation: { fillBatches: completeCreationFillBatches() },
          sheet: { tag: "ordinary" },
          battle: {
            ...readyReactionBattle,
            attempts: [
              readyAttempt,
              endTurnAttempt,
              moveAttempt,
              reportAttempt,
              releaseAttempt,
            ],
          },
        },
        unitLibrary,
        statBlockCatalog,
      });
      const afterReleaseEntered = requireBattleEntered(afterRelease);
      const afterReleaseStep = requireBattleContinuation(
        afterReleaseEntered,
        4,
      );
      expect(afterReleaseStep.frontier.kind).toBe("interruptDecision");
      if (afterReleaseStep.frontier.kind === "interruptDecision") {
        expect(afterReleaseStep.frontier.decisionHole.trigger).toBe(
          "opportunityAttack",
        );
      }
      expect(afterReleaseEntered.segment.outcome.tag).toBe("next");
      expect(Either.isRight(decodeOracleTrace(afterRelease))).toBe(true);
      expect(afterRelease).toEqual(
        evaluateDecodedCase({
          case: {
            creation: { fillBatches: completeCreationFillBatches() },
            sheet: { tag: "ordinary" },
            battle: {
              ...readyReactionBattle,
              attempts: [
                readyAttempt,
                endTurnAttempt,
                moveAttempt,
                reportAttempt,
                releaseAttempt,
              ],
            },
          },
          unitLibrary,
          statBlockCatalog,
        }),
      );
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
    const entered = requireBattleEntered(trace);

    const enteredStack = [
      ...entered.checkpoint.alreadyActed,
      ...entered.checkpoint.stillToAct,
    ];
    const laterEntry = enteredStack[1];
    const laterActor = laterEntry?.creature.combatantId;
    expect(laterActor).toBeDefined();
    if (laterEntry !== undefined && laterActor !== undefined) {
      expect(
        Either.isRight(
          Schema.decodeUnknownEither(OracleBattleCheckpointSchema)({
            ...entered.checkpoint,
            alreadyActed: [enteredStack[0]],
            stillToAct: enteredStack.slice(1),
          }),
        ),
      ).toBe(true);
    }

    const invalid = replaceBattleEntered(trace, (battle) => ({
      ...battle,
      checkpoint: {
        ...battle.checkpoint,
        stillToAct: [
          {
            ...battle.checkpoint.stillToAct[0],
            creature: {
              ...battle.checkpoint.stillToAct[0]?.creature,
              combatantId: combatantId("oracle:not-in-turn-order"),
            },
          },
          ...battle.checkpoint.stillToAct.slice(1),
        ],
      },
    }));
    const decoded = decodeOracleTrace(invalid);
    expect(Either.isLeft(decoded)).toBe(true);

    const crossReference = replaceBattleEntered(trace, (battle) => ({
      ...battle,
      checkpoint: {
        ...battle.checkpoint,
        targetId: combatantId("oracle:not-a-checkpoint-field"),
      },
    }));
    expect(Either.isLeft(decodeOracleTrace(crossReference))).toBe(true);

    const unreachableFrontier = replaceBattleEntered(trace, (battle) => ({
      ...battle,
      frontier: {
        kind: "acts",
        acts: [
          {
            ...battle.frontier.acts[0],
            actorId: combatantId("oracle:not-a-live-combatant"),
          },
        ],
      },
    }));
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
    const foreignOwnerId = enteredStack.find(
      ({ creature: { combatantId: id } }) =>
        ownerAct !== undefined && id !== ownerAct.actorId,
    )?.creature.combatantId;
    expect(ownerAct).toBeDefined();
    expect(foreignOwnerId).toBeDefined();
    if (ownerAct !== undefined && foreignOwnerId !== undefined) {
      const forgedProcedureRef = ownerAct.procedureRef.replace(
        ownerAct.actorId,
        foreignOwnerId,
      );
      const crossOwnerProcedure = replaceBattleEntered(trace, (battle) => ({
        ...battle,
        frontier: {
          kind: "acts",
          acts: battle.frontier.acts.map((subject) =>
            subject === ownerAct
              ? {
                  ...subject,
                  procedureRef: forgedProcedureRef,
                }
              : subject,
          ),
        },
      }));
      expect(Either.isLeft(decodeOracleTrace(crossOwnerProcedure))).toBe(true);

      const wrongInitialActor = replaceBattleEntered(trace, (battle) => ({
        ...battle,
        frontier: {
          kind: "acts",
          acts: battle.frontier.acts.map((subject) =>
            subject === ownerAct
              ? {
                  ...subject,
                  actorId: foreignOwnerId,
                  procedureRef: forgedProcedureRef,
                }
              : subject,
          ),
        },
      }));
      expect(Either.isLeft(decodeOracleTrace(wrongInitialActor))).toBe(true);
    }

    const emptyFrontier = replaceBattleEntered(trace, (battle) => ({
      ...battle,
      frontier: { kind: "acts", acts: [] },
    }));
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
    const entered = requireBattleEntered(trace);
    const enteredStack = [
      ...entered.checkpoint.alreadyActed,
      ...entered.checkpoint.stillToAct,
    ];
    const laterActor = enteredStack[1]?.creature.combatantId;
    expect(laterActor).toBeDefined();
    if (laterActor === undefined) return;

    const progressed = Schema.decodeUnknownEither(
      OracleBattleContinuationSchema,
    )({
      checkpoint: {
        ...entered.checkpoint,
        alreadyActed: [enteredStack[0]],
        stillToAct: enteredStack.slice(1),
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
      segment: {
        rejections: [],
        outcome: { tag: "awaitingInput" },
      },
    });
    expect(Either.isRight(progressed)).toBe(true);

    const invalidAdmission = Schema.decodeUnknownEither(
      OracleBattleEnteredSchema,
    )({
      ...entered,
      checkpoint: {
        ...entered.checkpoint,
        alreadyActed: [enteredStack[0]],
        stillToAct: enteredStack.slice(1),
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

  it(
    "isolates nonempty A/B/A batch evaluation from singleton evaluation",
    () => {
      const caseA = caseWithMoveAttempt({
        battle: twoStatBlockBattleFor(
          {
            combatantId: combatantId("oracle:isolation-a:a"),
            initiative: initiativeScore(10),
          },
          {
            combatantId: combatantId("oracle:isolation-a:b"),
            initiative: initiativeScore(0),
          },
        ),
        movementCostFeet: 5,
      });
      const caseB = caseWithMoveAttempt({
        battle: twoStatBlockBattleFor(
          {
            combatantId: combatantId("oracle:isolation-b:a"),
            initiative: initiativeScore(8),
          },
          {
            combatantId: combatantId("oracle:isolation-b:b"),
            initiative: initiativeScore(1),
          },
        ),
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
      expect(
        requireBattleContinuation(requireBattleEntered(batch[1]), 0).frontier
          .kind,
      ).toBe("acts");
    },
    ORACLE_LONG_TEST_TIMEOUT_MS,
  );

  it(
    "matches individual and batch evaluation for nonempty move cases",
    () => {
      const cases = [
        caseWithMoveAttempt({
          battle: twoStatBlockBattleFor(
            {
              combatantId: combatantId("oracle:batch-a:a"),
              initiative: initiativeScore(12),
            },
            {
              combatantId: combatantId("oracle:batch-a:b"),
              initiative: initiativeScore(0),
            },
          ),
          movementCostFeet: 5,
        }),
        caseWithMoveAttempt({
          battle: twoStatBlockBattleFor(
            {
              combatantId: combatantId("oracle:batch-b:a"),
              initiative: initiativeScore(9),
            },
            {
              combatantId: combatantId("oracle:batch-b:b"),
              initiative: initiativeScore(2),
            },
          ),
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
      battle: twoStatBlockBattleFor(
        {
          combatantId: combatantId("oracle:property:a"),
          initiative: initiativeScore(10),
        },
        {
          combatantId: combatantId("oracle:property:b"),
          initiative: initiativeScore(0),
        },
      ),
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
        const firstEntered = requireBattleEntered(first);
        const retryEntered = requireBattleEntered(retry);
        const retriedFrontierStep = requireBattleContinuation(retryEntered, 0);
        expect(retryEntered.segment.rejections).toEqual(["wrongActor"]);
        expect(retryEntered.checkpoint).toEqual(firstEntered.checkpoint);
        expect(retryEntered.frontier).toEqual(firstEntered.frontier);
        const firstFinalStep = requireBattleContinuation(firstEntered, 0);
        expect(retriedFrontierStep.frontier).toEqual(firstFinalStep.frontier);
      }),
      { numRuns: 2, seed: 0x122066, endOnFailure: true },
    );
  }, 20_000);

  it("accumulates independent projection failures and reports missing records as typed entry data", () => {
    const projectionFailureBattle = {
      roster: {
        tag: "statBlocks" as const,
        entries: [
          {
            combatantId: combatantId("oracle:broken-one"),
            statBlockId: statBlockId("stat_block_skeleton"),
            initiative: 1,
            ammunitionStocks: { arrow: 0 },
            conditions: ["prone"],
            tempHp: 0,
          },
          {
            combatantId: combatantId("oracle:broken-two"),
            statBlockId: statBlockId("stat_block_skeleton"),
            initiative: 0,
            ammunitionStocks: { arrow: 0 },
            conditions: ["prone"],
            tempHp: 0,
          },
        ],
      },
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
    expect(Either.isRight(decodeOracleTrace(rejected))).toBe(true);
    const rejectedOutcome = rejected.creation.outcome;
    expect(rejectedOutcome.tag).toBe("built");
    if (rejectedOutcome.tag !== "built") return;
    expect(rejectedOutcome.sheet.tag).toBe("constructed");
    if (rejectedOutcome.sheet.tag !== "constructed") return;
    const rejection = rejectedOutcome.sheet.battle;
    expect(rejection.tag).toBe("rejected");
    if (rejection.tag === "rejected") {
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
          roster: {
            tag: "statBlocks",
            entries: [
              {
                combatantId: combatantId("oracle:missing"),
                statBlockId: statBlockId("stat_block_missing"),
                initiative: 0,
                ammunitionStocks: {},
                conditions: [],
                tempHp: 0,
              },
            ],
          },
          attempts: [],
        },
      },
      unitLibrary,
      statBlockCatalog,
    });
    const missingOutcome = missing.creation.outcome;
    expect(missingOutcome.tag).toBe("built");
    if (missingOutcome.tag !== "built") return;
    expect(missingOutcome.sheet.tag).toBe("constructed");
    if (missingOutcome.sheet.tag !== "constructed") return;
    expect(missingOutcome.sheet.battle).toEqual({
      tag: "rejected",
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
          creation: { started: { holes: [] }, progression: [] },
        }),
      ),
    ).toBe(true);
  });

  it("returns a production fill rejection as a terminal Trace outcome", () => {
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
    expect(trace.creation.outcome.tag).toBe("fillRejected");
  });
});

function requireBattleEntered(trace: OracleTrace): OracleBattleEntered {
  const creationOutcome = trace.creation.outcome;
  if (creationOutcome.tag !== "built") {
    throw new Error("test Trace must contain a built creation outcome");
  }
  const sheetOutcome = creationOutcome.sheet;
  if (sheetOutcome.tag !== "constructed") {
    throw new Error("test Trace must contain a constructed sheet outcome");
  }
  const battleOutcome = sheetOutcome.battle;
  if (battleOutcome.tag !== "entered") {
    throw new Error("test Trace must contain an entered Battle outcome");
  }
  return battleOutcome;
}

function requireBattleContinuation(
  entered: OracleBattleEntered,
  continuationIndex: number,
): OracleBattleContinuation {
  if (!Number.isInteger(continuationIndex) || continuationIndex < 0) {
    throw new Error("test continuation index must be a non-negative integer");
  }

  let segment = entered.segment;
  for (let index = 0; index <= continuationIndex; index += 1) {
    if (segment.outcome.tag !== "next") {
      throw new Error(
        `test Trace is missing continuation ${continuationIndex} (terminal ${segment.outcome.tag})`,
      );
    }
    const continuation = segment.outcome.continuation;
    if (index === continuationIndex) return continuation;
    segment = continuation.segment;
  }
  throw new Error(`test Trace is missing continuation ${continuationIndex}`);
}

function replaceBattleEntered(
  trace: OracleTrace,
  update: (entered: OracleBattleEntered) => unknown,
): unknown {
  const creationOutcome = trace.creation.outcome;
  if (creationOutcome.tag !== "built") {
    throw new Error("test Trace must contain a built creation outcome");
  }
  const sheetOutcome = creationOutcome.sheet;
  if (sheetOutcome.tag !== "constructed") {
    throw new Error("test Trace must contain a constructed sheet outcome");
  }
  const battleOutcome = sheetOutcome.battle;
  if (battleOutcome.tag !== "entered") {
    throw new Error("test Trace must contain an entered Battle outcome");
  }
  return {
    ...trace,
    creation: {
      ...trace.creation,
      outcome: {
        ...creationOutcome,
        sheet: {
          ...sheetOutcome,
          battle: update(battleOutcome),
        },
      },
    },
  };
}

function completeCreationFillBatches() {
  const result = buildCompleteCreationFillBatches(unitLibrary);
  if (Either.isLeft(result)) {
    throw new Error(`test creation source failed: ${result.left.message}`);
  }
  return result.right;
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

type StatBlockBattleOrder = Pick<
  OracleStatBlockBattlePlacement,
  "combatantId" | "initiative"
>;

function twoStatBlockBattleFor(
  first: StatBlockBattleOrder,
  second: StatBlockBattleOrder,
): OracleBattleInput {
  return statBlockBattleFor([
    {
      combatantId: first.combatantId,
      statBlockId: statBlockId("stat_block_skeleton"),
      initiative: first.initiative,
    },
    {
      combatantId: second.combatantId,
      statBlockId: statBlockId("stat_block_skeleton"),
      initiative: second.initiative,
    },
  ]);
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
  const entered = requireBattleEntered(initial);
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
  const ordinary = requireBattleContinuation(
    requireBattleEntered(moveHoles),
    0,
  );
  if (ordinary.frontier.kind !== "ordinaryHoles") {
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

function statBlockAttackProcedureRef(
  reactorCombatantId = combatantId("oracle:skeleton-b"),
) {
  const firstCombatantId = combatantId("oracle:skeleton-a");
  const placements = [
    {
      combatantId: firstCombatantId,
      statBlockId: statBlockId("stat_block_skeleton"),
      initiative: initiativeScore(10),
    },
    {
      combatantId: reactorCombatantId,
      statBlockId: statBlockId("stat_block_skeleton"),
      initiative: initiativeScore(0),
    },
  ] as const satisfies readonly [
    OracleStatBlockBattlePlacement,
    ...OracleStatBlockBattlePlacement[],
  ];
  const started = startStatBlockBattle(
    { unitLibrary, statBlockCatalog },
    placements,
  );
  if (Either.isLeft(started)) {
    throw new Error(`test stat-block battle failed: ${started.left.message}`);
  }
  const procedureRef = discoverStatBlockAttackProcedureRef(
    started.right,
    firstCombatantId,
  );
  if (Either.isLeft(procedureRef)) {
    throw new Error(
      `test stat-block attack failed: ${procedureRef.left.message}`,
    );
  }
  return procedureRef.right;
}
