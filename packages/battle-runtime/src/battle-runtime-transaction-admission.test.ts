import { describe, expect, test } from "vitest";

import {
  admitBattleRuntimeTransactionOperation,
  settleCreatureFallsRuntimeTransaction,
  settleBattleRuntimeTransaction,
  type BattleRuntimeTransactionOperation,
  type BattleRuntimeTransactionResult,
} from "./battle-runtime-transaction.ts";
import {
  attackExecutionSelectionForSubjectForTest,
  battleId,
  characterSeed,
  findAct,
  fighterId,
  goblinAttackSubject,
  goblinId,
  holeId,
  interruptDecisionFill,
  movementFill,
  movementFeet,
  startBattleSessionRight,
  statBlockCreatureInit,
} from "./battle-runtime.test-support.ts";
import type { BattleHole } from "./battle-state-execution.ts";
import type { BattleSubject } from "./battle-subjects.ts";

type NeedsHolesTransactionResult = Extract<
  BattleRuntimeTransactionResult,
  { readonly tag: "needsHoles" }
>;

type MoveSubject = Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand"; readonly command: "move" }
>;

function requireNeedsHoles(
  result: BattleRuntimeTransactionResult,
  context: string,
): NeedsHolesTransactionResult {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected ${context} to need holes, got ${result.tag}.`);
  }
  return result;
}

function requireHole<Kind extends BattleHole["kind"]>(
  result: NeedsHolesTransactionResult,
  kind: Kind,
): Extract<BattleHole, { readonly kind: Kind }> {
  const frontier = result.resolution.envelope.frontier;
  const holes: readonly BattleHole[] =
    frontier.kind === "interruptDecision"
      ? [frontier.decisionHole]
      : frontier.holes;
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: Kind }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole in transaction result.`);
  }
  return hole;
}

function moveSubjectFor(
  session: ReturnType<typeof startBattleSessionRight>,
): MoveSubject {
  const act = findAct(session, {
    tag: "runtimeCommand",
    actorId: fighterId,
    command: "move",
  });
  if (act.subject.tag !== "runtimeCommand" || act.subject.command !== "move") {
    throw new Error("Expected a discovered Move subject.");
  }
  return act.subject;
}

function pendingOrdinaryMove(): {
  readonly session: ReturnType<typeof startBattleSessionRight>;
  readonly result: NeedsHolesTransactionResult;
  readonly subject: MoveSubject;
} {
  const session = startBattleSessionRight({
    battleId: battleId("battle-transaction-admission-ordinary"),
    combatants: [
      characterSeed({ initiative: 20 }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  const subject = moveSubjectFor(session);
  const result = requireNeedsHoles(
    settleBattleRuntimeTransaction({
      session,
      transaction: null,
      operation: { kind: "ordinarySubject", subject, fills: [] },
    }),
    "initial Move",
  );
  expect(result.frontier.kind).toBe("ordinaryHoles");
  return { session, result, subject };
}

function pendingInterruptMove(): {
  readonly session: ReturnType<typeof startBattleSessionRight>;
  readonly result: NeedsHolesTransactionResult;
  readonly subject: MoveSubject;
} {
  const ordinary = pendingOrdinaryMove();
  const movementHole = requireHole(ordinary.result, "movement");
  const result = requireNeedsHoles(
    settleBattleRuntimeTransaction({
      session: ordinary.result.resolution.session,
      transaction: ordinary.result.transaction,
      operation: {
        kind: "ordinarySubject",
        subject: ordinary.subject,
        fills: [
          movementFill(movementHole, {
            movementCostFeet: 5,
            provokedOpportunityAttacks: [
              {
                reactorId: goblinId,
                distanceFeet: movementFeet(5),
                ...attackExecutionSelectionForSubjectForTest(
                  goblinAttackSubject(ordinary.session.state, "Scimitar"),
                ),
              },
            ],
          }),
        ],
      },
    }),
    "Move with Opportunity Attack",
  );
  expect(result.frontier.kind).toBe("interruptDecision");
  return { ...ordinary, result };
}

function interruptOperation(
  result: NeedsHolesTransactionResult,
): Extract<
  BattleRuntimeTransactionOperation,
  { readonly kind: "interruptDecision" }
> {
  const hole = requireHole(result, "interruptDecision");
  return {
    kind: "interruptDecision",
    fill: interruptDecisionFill(hole, {
      kind: "decline",
      responderId: goblinId,
    }),
  };
}

function readyTriggerReportSubject(): Extract<
  BattleSubject,
  {
    readonly tag: "runtimeCommand";
    readonly command: "reportReadyTrigger";
  }
> {
  return {
    tag: "runtimeCommand",
    actorId: goblinId,
    command: "reportReadyTrigger",
    readiedActorId: fighterId,
  };
}

describe("battle runtime transaction operation admission", () => {
  test("rejects an interrupt decision against an ordinary-hole frontier", () => {
    const ordinary = pendingOrdinaryMove();
    const interrupt = pendingInterruptMove();

    expect(
      admitBattleRuntimeTransactionOperation({
        transaction: ordinary.result.transaction,
        operation: interruptOperation(interrupt.result),
      }),
    ).toEqual({
      tag: "rejected",
      issue: {
        tag: "interruptDecisionRequiresInterruptFrontier",
        pendingSubject: ordinary.subject,
      },
    });

    expect(
      settleBattleRuntimeTransaction({
        session: ordinary.result.resolution.session,
        transaction: ordinary.result.transaction,
        operation: interruptOperation(interrupt.result),
      }),
    ).toMatchObject({
      tag: "invalid",
      resolution: {
        message:
          "An interrupt decision requires a pending interrupt-decision frontier.",
      },
    });
  });

  test("rejects an ordinary subject against an interrupt-decision frontier", () => {
    const interrupt = pendingInterruptMove();

    expect(
      admitBattleRuntimeTransactionOperation({
        transaction: interrupt.result.transaction,
        operation: {
          kind: "ordinarySubject",
          subject: interrupt.subject,
          fills: [],
        },
      }),
    ).toEqual({
      tag: "rejected",
      issue: {
        tag: "ordinarySubjectRequiresOrdinaryFrontier",
        pendingSubject: interrupt.subject,
        requestedSubject: interrupt.subject,
      },
    });
  });

  test("admits a same-subject ordinary operation at an ordinary-hole frontier", () => {
    const ordinary = pendingOrdinaryMove();
    const operation: Extract<
      BattleRuntimeTransactionOperation,
      { readonly kind: "ordinarySubject" }
    > = {
      kind: "ordinarySubject",
      subject: ordinary.subject,
      fills: [],
    };

    expect(
      admitBattleRuntimeTransactionOperation({
        transaction: ordinary.result.transaction,
        operation,
      }),
    ).toEqual({ tag: "admitted", operation });
  });

  test("admits an interrupt decision at an interrupt-decision frontier", () => {
    const interrupt = pendingInterruptMove();
    const operation = interruptOperation(interrupt.result);

    expect(
      admitBattleRuntimeTransactionOperation({
        transaction: interrupt.result.transaction,
        operation,
      }),
    ).toEqual({ tag: "admitted", operation });
  });

  test("keeps null, foreign-subject, and overlay operations explicit", () => {
    const ordinary = pendingOrdinaryMove();
    const interrupt = pendingInterruptMove();
    const differentSubject: Extract<
      BattleRuntimeTransactionOperation,
      { readonly kind: "ordinarySubject" }
    > = {
      kind: "ordinarySubject",
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "ready",
      },
      fills: [],
    };
    const readyOperation: Extract<
      BattleRuntimeTransactionOperation,
      { readonly kind: "ordinarySubject" }
    > = {
      kind: "ordinarySubject",
      subject: readyTriggerReportSubject(),
      fills: [],
    };

    expect(
      admitBattleRuntimeTransactionOperation({
        transaction: null,
        operation: interruptOperation(interrupt.result),
      }),
    ).toEqual({
      tag: "rejected",
      issue: { tag: "interruptRequiresPendingTransaction" },
    });
    expect(
      admitBattleRuntimeTransactionOperation({
        transaction: ordinary.result.transaction,
        operation: differentSubject,
      }),
    ).toEqual({
      tag: "rejected",
      issue: {
        tag: "differentPendingSubject",
        pendingSubject: ordinary.subject,
        requestedSubject: differentSubject.subject,
      },
    });
    expect(
      admitBattleRuntimeTransactionOperation({
        transaction: interrupt.result.transaction,
        operation: differentSubject,
      }),
    ).toEqual({
      tag: "rejected",
      issue: {
        tag: "ordinarySubjectRequiresOrdinaryFrontier",
        pendingSubject: interrupt.subject,
        requestedSubject: differentSubject.subject,
      },
    });
    expect(
      admitBattleRuntimeTransactionOperation({
        transaction: ordinary.result.transaction,
        operation: readyOperation,
      }),
    ).toEqual({
      tag: "rejected",
      issue: {
        tag: "readyTriggerOverlayRequiresInterruptFrontier",
        pendingSubject: ordinary.subject,
        requestedSubject: readyOperation.subject,
      },
    });

    expect(
      settleBattleRuntimeTransaction({
        session: interrupt.result.resolution.session,
        transaction: interrupt.result.transaction,
        operation: differentSubject,
      }),
    ).toMatchObject({
      tag: "invalid",
      transaction: interrupt.result.transaction,
      resolution: {
        message:
          "An ordinary subject operation cannot run while an interrupt-decision frontier is pending.",
      },
    });
    expect(
      settleBattleRuntimeTransaction({
        session: ordinary.result.resolution.session,
        transaction: ordinary.result.transaction,
        operation: readyOperation,
      }),
    ).toMatchObject({
      tag: "invalid",
      transaction: ordinary.result.transaction,
      resolution: {
        message:
          "A report-ready trigger may overlay only a different subject's interrupt frontier.",
      },
    });
    expect(
      settleBattleRuntimeTransaction({
        session: ordinary.result.resolution.session,
        transaction: ordinary.result.transaction,
        operation: differentSubject,
      }),
    ).toMatchObject({
      tag: "invalid",
      transaction: ordinary.result.transaction,
      resolution: {
        message: "A pending battle transaction owns a different subject.",
      },
    });
    expect(
      settleBattleRuntimeTransaction({
        session: ordinary.session,
        transaction: null,
        operation: interruptOperation(interrupt.result),
      }),
    ).toMatchObject({
      tag: "invalid",
      transaction: null,
      resolution: {
        message: "An interrupt decision requires a pending battle transaction.",
      },
    });
  });

  test("returns the reducer's invalid fill through the transaction boundary", () => {
    const ordinary = pendingOrdinaryMove();
    const movement = movementFill(requireHole(ordinary.result, "movement"), {
      movementCostFeet: 5,
      provokedOpportunityAttacks: [],
    });
    const invalid = settleBattleRuntimeTransaction({
      session: ordinary.result.resolution.session,
      transaction: ordinary.result.transaction,
      operation: {
        kind: "ordinarySubject",
        subject: ordinary.subject,
        fills: [{ ...movement, holeId: holeId("stale-movement-hole") }],
      },
    });

    expect(invalid).toMatchObject({
      tag: "invalid",
      transaction: ordinary.result.transaction,
      resolution: { reason: "invalidFill" },
    });
  });

  test("admits the different-subject Ready report overlay at an interrupt frontier", () => {
    const interrupt = pendingInterruptMove();
    const operation: Extract<
      BattleRuntimeTransactionOperation,
      { readonly kind: "ordinarySubject" }
    > = {
      kind: "ordinarySubject",
      subject: readyTriggerReportSubject(),
      fills: [],
    };

    expect(
      admitBattleRuntimeTransactionOperation({
        transaction: interrupt.result.transaction,
        operation,
      }),
    ).toEqual({ tag: "admitted", operation });
  });

  test("rejects Creature Falls against a different pending subject", () => {
    const ordinary = pendingOrdinaryMove();

    const result = settleCreatureFallsRuntimeTransaction({
      session: ordinary.result.resolution.session,
      transaction: ordinary.result.transaction,
      fallingCreatureId: fighterId,
      reactionSpellTargetFacts: [],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      transaction: ordinary.result.transaction,
      resolution: {
        reason: "staleSubject",
      },
    });
  });
});
