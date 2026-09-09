import { Option } from "effect";
import { describe, expect, test } from "vitest";
import {
  battlePendingTransactionView,
  battlePendingTransactionViewForSession,
  settleBattleRuntimeTransaction,
  type BattleRuntimeTransactionResult,
} from "./battle-runtime-transaction.ts";
import { battleRuntimeSessionWithState } from "./battle-runtime-context.ts";
import {
  battleId,
  characterSeed,
  findAct,
  fighterId,
  goblinId,
  holeId,
  movementFill,
  startBattleSessionRight,
  statBlockCreatureInit,
} from "./battle-runtime.test-support.ts";
import type { BattleHole } from "./battle-state-execution.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import { currentActorId } from "./battle-reducer/creature-state-leaves.ts";

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

function moveSubjectFor(session: ReturnType<typeof startBattleSessionRight>) {
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

function pendingMove(): {
  readonly session: ReturnType<typeof startBattleSessionRight>;
  readonly subject: MoveSubject;
  readonly result: NeedsHolesTransactionResult;
} {
  const session = startBattleSessionRight({
    battleId: battleId("battle-sr04-transaction-move"),
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
  return { session, subject, result };
}

describe("battle runtime transaction SR-04 invariants", () => {
  test("commits a resolved end-turn operation without mutating its base session", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-sr04-transaction-commit"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const act = findAct(session, {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "endTurn",
    });
    if (
      act.subject.tag !== "runtimeCommand" ||
      act.subject.command !== "endTurn"
    ) {
      throw new Error("Expected a discovered End Turn subject.");
    }

    const committed = settleBattleRuntimeTransaction({
      session,
      transaction: null,
      operation: {
        kind: "ordinarySubject",
        subject: act.subject,
        fills: [],
      },
    });

    expect(committed.tag).toBe("settled");
    if (committed.tag !== "settled") return;
    expect(committed.session).toBe(committed.resolution.session);
    expect(committed.session).not.toBe(session);
    expect(committed.session.state).not.toBe(session.state);
    expect(committed.resolution.envelope.checkpoint.currentActorId).toBe(
      goblinId,
    );
    expect(currentActorId(session.state)).toBe(fighterId);
  });

  test("rolls back an invalid fill while retaining the pending transaction layer", () => {
    const pending = pendingMove();
    const movementHole = requireHole(pending.result, "movement");
    const movement = movementFill(movementHole, {
      movementCostFeet: 5,
      provokedOpportunityAttacks: [],
    });
    const invalidMovement = {
      ...movement,
      holeId: holeId("battle-sr04-stale-movement-hole"),
    };
    const beforeView = battlePendingTransactionView(pending.result.transaction);
    if (Option.isNone(beforeView)) {
      throw new Error("Expected the pending transaction to be runtime-owned.");
    }

    const rolledBack = settleBattleRuntimeTransaction({
      session: pending.result.resolution.session,
      transaction: pending.result.transaction,
      operation: {
        kind: "ordinarySubject",
        subject: pending.subject,
        fills: [invalidMovement],
      },
    });

    expect(rolledBack.tag).toBe("invalid");
    if (rolledBack.tag !== "invalid") return;
    expect(rolledBack.transaction).toBe(pending.result.transaction);
    expect(rolledBack.resolution.reason).toBe("invalidFill");
    expect(rolledBack.resolution.session).toBe(
      pending.result.resolution.session,
    );
    expect(battlePendingTransactionView(pending.result.transaction)).toEqual(
      beforeView,
    );
    expect(
      battlePendingTransactionViewForSession(
        pending.result.transaction,
        pending.result.resolution.session,
      ),
    ).toMatchObject({ tag: "valid", view: beforeView.value });
  });

  test("rejects a pending transaction from a conflicting session without consuming it", () => {
    const pending = pendingMove();
    const conflictingSession = battleRuntimeSessionWithState(
      pending.result.resolution.session,
      pending.result.resolution.session.state,
    );

    const conflicted = settleBattleRuntimeTransaction({
      session: conflictingSession,
      transaction: pending.result.transaction,
      operation: {
        kind: "ordinarySubject",
        subject: pending.subject,
        fills: [],
      },
    });

    expect(conflicted).toMatchObject({
      tag: "defect",
      issue: { tag: "transactionSessionMismatch" },
    });
    expect(
      battlePendingTransactionViewForSession(
        pending.result.transaction,
        pending.result.resolution.session,
      ),
    ).toMatchObject({ tag: "valid" });
    expect(
      battlePendingTransactionViewForSession(
        pending.result.transaction,
        conflictingSession,
      ),
    ).toEqual({ tag: "transactionSessionMismatch" });
  });
});
