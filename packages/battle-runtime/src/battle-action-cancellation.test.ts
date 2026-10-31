import { describe, expect, test } from "vitest";
import {
  battlePendingActionCancellationForSession,
  settleBattleRuntimeTransaction,
  type BattleRuntimeTransactionResult,
} from "./battle-runtime-transaction.ts";
import {
  attackInitialTargetHole,
  battleId,
  battleRuntimeContextForStateForTest,
  characterSeed,
  cuttingWordsAttackOnlyUnit,
  cuttingWordsResource,
  fighterAttackSubject,
  fighterId,
  findAct,
  goblinAttacksReactionModifierCharacter,
  goblinScimitarHitReactionSetup,
  goblinId,
  interruptDecisionFill,
  startBattleSessionRight,
  statBlockCreatureInit,
  targetFill,
} from "./battle-runtime.test-support.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";

function pending(result: BattleRuntimeTransactionResult) {
  if (result.tag !== "needsHoles")
    throw new Error(
      `Expected pending action, got ${result.tag}${result.tag === "invalid" ? ": " + result.resolution.message : ""}`,
    );
  return result;
}

function selectAttack() {
  const session = startBattleSessionRight({
    battleId: battleId("synthetic-cancel-runtime"),
    combatants: [
      characterSeed({ initiative: 20 }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  const subject = fighterAttackSubject(session.state);
  const selection = pending(
    settleBattleRuntimeTransaction({
      session,
      transaction: null,
      operation: { kind: "ordinarySubject", subject, fills: [] },
    }),
  );
  return { session, subject, selection };
}

describe("Battle pending action cancellation safety", () => {
  test("offers cancellation only for the owning unanswered action", () => {
    const { session, selection } = selectAttack();
    const other = selectAttack();
    expect(
      battlePendingActionCancellationForSession(selection.transaction, session),
    ).toEqual({ kind: "available" });
    expect(battlePendingActionCancellationForSession(null, session)).toEqual({
      kind: "unavailable",
      reason: "noPendingTransaction",
    });
    expect(
      battlePendingActionCancellationForSession(
        structuredClone(selection.transaction),
        session,
      ),
    ).toEqual({ kind: "unavailable", reason: "foreignTransaction" });
    expect(
      battlePendingActionCancellationForSession(
        selection.transaction,
        other.session,
      ),
    ).toEqual({ kind: "unavailable", reason: "transactionSessionMismatch" });
  });

  test("refuses accepted inputs even when the checkpoint has not advanced", () => {
    const { session, subject, selection } = selectAttack();
    const answer = pending(
      settleBattleRuntimeTransaction({
        session,
        transaction: selection.transaction,
        operation: {
          kind: "ordinarySubject",
          subject,
          fills: [
            targetFill(
              attackInitialTargetHole(session.state, subject),
              goblinId,
            ),
          ],
        },
      }),
    );
    expect(answer.resolution.session).toBe(session);
    expect(
      battlePendingActionCancellationForSession(answer.transaction, session),
    ).toEqual({ kind: "unavailable", reason: "acceptedInput" });
  });

  test("keeps runtime event and turn-boundary continuations outside selection cancellation", () => {
    const { session } = selectAttack();
    const move = findAct(session, {
      tag: "runtimeCommand",
      command: "move",
      actorId: fighterId,
    });
    const selection = pending(
      settleBattleRuntimeTransaction({
        session,
        transaction: null,
        operation: {
          kind: "ordinarySubject",
          subject: move.subject,
          fills: [],
        },
      }),
    );
    expect(
      battlePendingActionCancellationForSession(selection.transaction, session),
    ).toEqual({ kind: "unavailable", reason: "runtimeProcedure" });
  });

  test("refuses an interrupt and the resumed committed checkpoint", () => {
    const unit = cuttingWordsAttackOnlyUnit();
    const state = goblinAttacksReactionModifierCharacter({
      unit,
      className: "bard",
      level: 3,
      unitId: unit.id,
      resources: [cuttingWordsResource({ unit })],
    });
    const setup = goblinScimitarHitReactionSetup(state);
    const session = battleRuntimeSessionForTest({
      state,
      context: battleRuntimeContextForStateForTest(state),
    });
    const outer = pending(
      settleBattleRuntimeTransaction({
        session,
        transaction: null,
        operation: {
          kind: "ordinarySubject",
          subject: setup.subject,
          fills: setup.prefixFills,
        },
      }),
    );
    expect(
      battlePendingActionCancellationForSession(
        outer.transaction,
        outer.resolution.session,
      ),
    ).toEqual({ kind: "unavailable", reason: "interruptDecision" });
    const frontier = outer.resolution.envelope.frontier;
    if (frontier.kind !== "interruptDecision")
      throw new Error("Expected reaction frontier");
    const declined = pending(
      settleBattleRuntimeTransaction({
        session: outer.resolution.session,
        transaction: outer.transaction,
        operation: {
          kind: "interruptDecision",
          fill: interruptDecisionFill(frontier.decisionHole, {
            kind: "decline",
            responderId: fighterId,
          }),
        },
      }),
    );
    expect(
      battlePendingActionCancellationForSession(
        declined.transaction,
        declined.resolution.session,
      ),
    ).toEqual({ kind: "unavailable", reason: "checkpointProgress" });
  });
});
