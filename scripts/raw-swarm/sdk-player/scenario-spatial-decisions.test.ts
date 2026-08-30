import { describe, expect, test } from "vitest";
import { Result } from "effect";
import {
  battleAttackExecutionScopeRef,
  battleAttackProcedureExecutionRef,
  battleExecutionScopeOrdinal,
  battleId,
  combatantId,
} from "../../../packages/battle-runtime/src/index.ts";
import { NonNegativeInteger } from "../../../packages/shared/src/types.ts";
import {
  scenarioTableSpatialFingerprint,
  tableAuthoredSpatialDecision,
} from "./scenario-spatial-decisions.ts";

const sourceProcedureRef = String(
  battleAttackProcedureExecutionRef(
    battleAttackExecutionScopeRef(
      battleId("scenario-spatial-normalization"),
      combatantId("normalization-actor"),
      battleExecutionScopeOrdinal(0),
    ),
    NonNegativeInteger(0),
  ),
);

const relationAnswer = {
  direction: "north" as const,
  distanceFeet: 5,
  attackerCanSeeTarget: true,
  cover: "none" as const,
  traversal: "open" as const,
};

function nonMovementDecision(kind: string): unknown {
  const questionByKind: Readonly<Record<string, unknown>> = {
    relation: {
      kind,
      sourceId: "normalization-source",
      targetId: "normalization-target",
    },
    spellTarget: {
      kind,
      casterId: "normalization-caster",
      targetId: "normalization-target",
      sourceProcedureRef,
    },
    objectTarget: {
      kind,
      actorId: "normalization-actor",
      objectId: "normalization-object",
      sourceProcedureRef,
    },
    attackTarget: {
      kind,
      actorId: "normalization-actor",
      targetId: "normalization-target",
      sourceProcedureRef,
      targetConstraint: "meleeReach",
    },
    grappleTarget: {
      kind,
      grapplerId: "normalization-actor",
      targetId: "normalization-target",
    },
    shoveTarget: {
      kind,
      shoverId: "normalization-actor",
      targetId: "normalization-target",
    },
    stagedConditionShakeAwakeTarget: {
      kind,
      actorId: "normalization-actor",
      targetId: "normalization-target",
    },
    areaControlShakeAwakeTarget: {
      kind,
      actorId: "normalization-actor",
      targetId: "normalization-target",
    },
    helpAttackTarget: {
      kind,
      helperId: "normalization-actor",
      targetEnemyId: "normalization-target",
    },
  };
  return {
    decisionId: `normalize-${kind}`,
    question: questionByKind[kind],
    answer: relationAnswer,
  };
}

function movementDecision(spatialFingerprint: string): unknown {
  return {
    decisionId: "normalize-movementRoute",
    question: {
      kind: "movementRoute",
      moverId: "normalization-actor",
      route: [{ x: 1, y: 0 }],
      speedKind: "walk",
    },
    answer: {
      kind: "movementRoute",
      movementCostFeet: 5,
      provokedOpportunityAttacks: [],
      creatureSpaceTraversal: { kind: "notRequired" },
      postMoveSpatialState: {
        kind: "tableAuthored",
        spatialFingerprint,
        tableAuthoredDecisions: [],
      },
    },
  };
}

describe("table-authored spatial decision normalization", () => {
  test.each([
    "relation",
    "spellTarget",
    "objectTarget",
    "attackTarget",
    "grappleTarget",
    "shoveTarget",
    "stagedConditionShakeAwakeTarget",
    "areaControlShakeAwakeTarget",
    "helpAttackTarget",
  ])("normalizes the %s question member", (kind) => {
    const normalized = tableAuthoredSpatialDecision(nonMovementDecision(kind));

    expect(normalized).toMatchObject({
      _tag: "Success",
      success: {
        decisionId: `normalize-${kind}`,
        question: { kind },
      },
    });
  });

  test("normalizes the movement-route member and its table state", () => {
    const fingerprint = scenarioTableSpatialFingerprint({
      kind: "normalization-post-move",
    });
    const normalized = tableAuthoredSpatialDecision(
      movementDecision(fingerprint),
    );

    expect(normalized).toMatchObject({
      _tag: "Success",
      success: {
        question: { kind: "movementRoute" },
        answer: {
          postMoveSpatialState: {
            kind: "tableAuthored",
            spatialFingerprint: fingerprint,
            tableAuthoredDecisions: [],
          },
        },
      },
    });
  });

  test("decodes only canonical table spatial fingerprints at the authored boundary", () => {
    const validFingerprint = scenarioTableSpatialFingerprint({
      kind: "canonical-table-state",
    });
    expect(
      tableAuthoredSpatialDecision(movementDecision(validFingerprint)),
    ).toMatchObject({ _tag: "Success" });

    for (const invalidFingerprint of [
      "",
      `sha256:${"a".repeat(63)}`,
      `sha256:${"A".repeat(64)}`,
      "tactical-space-state-fingerprint",
    ]) {
      const normalized = tableAuthoredSpatialDecision(
        movementDecision(invalidFingerprint),
      );
      expect(Result.isFailure(normalized)).toBe(true);
      if (Result.isFailure(normalized)) {
        expect(normalized.failure).toMatchObject({
          tag: "invalid-spatial-decision",
          message: expect.stringContaining(
            "canonical table spatial fingerprint",
          ),
        });
      }
    }
  });
});
