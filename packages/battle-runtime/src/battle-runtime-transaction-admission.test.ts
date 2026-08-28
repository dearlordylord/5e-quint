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
