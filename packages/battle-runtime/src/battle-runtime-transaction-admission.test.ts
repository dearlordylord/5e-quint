import { describe, expect, test } from "vitest";

import {
  admitBattleRuntimeTransactionOperation,
  settleBattleRuntimeResolution,
  settleBattleRuntimeTransaction,
  type BattleRuntimeTransactionOperation,
  type BattleRuntimeTransactionResult,
} from "./battle-runtime-transaction.ts";
import { battleRuntimeSessionWithState } from "./battle-runtime-context.ts";
import { resolveBattleRuntimeSubject } from "./battle-session-execution.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  attackExecutionSelectionForSubjectForTest,
  battleId,
  characterSeed,
  findAct,
  fighterId,
  goblinAttackSubject,
  goblinId,
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
  const hole = result.resolution.holes.find(
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

  test("rejects a resolution from an unrelated battle", () => {
    const ordinary = pendingOrdinaryMove();
    const foreign = startBattleSessionRight({
      battleId: battleId("battle-transaction-admission-foreign"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const foreignResolution = resolveBattleRuntimeSubject({
      session: foreign,
      subject: ordinary.subject,
      fills: [],
    });

    const result = settleBattleRuntimeResolution({
      session: ordinary.result.resolution.session,
      transaction: ordinary.result.transaction,
      operation: {
        kind: "ordinarySubject",
        subject: ordinary.subject,
        fills: [],
      },
      resolution: foreignResolution,
    });

    expect(result).toMatchObject({
      tag: "defect",
      issue: {
        tag: "foreignResolutionSession",
        reason: "battleIdentityMismatch",
      },
    });
  });

  test("rejects a same-shape resolution session without runtime lineage", () => {
    const ordinary = pendingOrdinaryMove();
    const expectedSession = ordinary.result.resolution.session;
    const unrelated = battleRuntimeSessionForTest({
      state: expectedSession.state,
      context: expectedSession.context,
    });
    const unrelatedResolution = resolveBattleRuntimeSubject({
      session: unrelated,
      subject: ordinary.subject,
      fills: [],
    });

    const result = settleBattleRuntimeResolution({
      session: expectedSession,
      transaction: ordinary.result.transaction,
      operation: {
        kind: "ordinarySubject",
        subject: ordinary.subject,
        fills: [],
      },
      resolution: unrelatedResolution,
    });

    expect(result).toMatchObject({
      tag: "defect",
      issue: {
        tag: "foreignResolutionSession",
        reason: "sessionLineageMismatch",
      },
    });
  });

  test("accepts a resolution produced from the exact input session", () => {
    const ordinary = pendingOrdinaryMove();
    const expectedSession = ordinary.result.resolution.session;
    const directResolution = resolveBattleRuntimeSubject({
      session: expectedSession,
      subject: ordinary.subject,
      fills: [],
    });

    const result = settleBattleRuntimeResolution({
      session: expectedSession,
      transaction: ordinary.result.transaction,
      operation: {
        kind: "ordinarySubject",
        subject: ordinary.subject,
        fills: [],
      },
      resolution: directResolution,
    });

    expect(result.tag).not.toBe("defect");
  });

  test("accepts a resolution from a valid descendant overlay session", () => {
    const ordinary = pendingOrdinaryMove();
    const expectedSession = ordinary.result.resolution.session;
    const overlaySession = battleRuntimeSessionWithState(
      expectedSession,
      expectedSession.state,
    );
    const descendantResolution = resolveBattleRuntimeSubject({
      session: overlaySession,
      subject: ordinary.subject,
      fills: [],
    });

    const result = settleBattleRuntimeResolution({
      session: expectedSession,
      transaction: ordinary.result.transaction,
      operation: {
        kind: "ordinarySubject",
        subject: ordinary.subject,
        fills: [],
      },
      resolution: descendantResolution,
    });

    expect(result.tag).not.toBe("defect");
  });
});
