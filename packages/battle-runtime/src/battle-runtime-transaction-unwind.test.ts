// KERNEL-COVERAGE: parity-witness BATTLE.REACTION.OFFER_DECLINE_RESUME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY

import { describe, expect, test } from "vitest";

import {
  battlePendingTransactionView,
  settleBattleRuntimeTransaction,
  type BattleRuntimeTransactionResult,
} from "./battle-runtime-transaction.ts";
import {
  battleRuntimeSessionWithState,
  type BattleRuntimeSession,
} from "./battle-runtime-context.ts";
import type { BattleMechanicalFrontier } from "./battle-mechanical-frontier.ts";
import { currentInterruptCheckpoint } from "./battle-reducer/battle-snapshot.ts";
import {
  battleId,
  characterSeed,
  endTurn,
  findAct,
  fighterId,
  goblinAttackSubject,
  goblinId,
  interruptDecisionFill,
  movementFill,
  movementFeet,
  readyDeclarationFillForTest,
  requireResolved,
  resolveBattleSubject,
  secondSkeletonId,
  skeletonCreatureInit,
  skeletonId,
  startBattleSessionRight,
  statBlockAttackSubjectForTest,
  statBlockCreatureInit,
  attackExecutionSelectionForSubjectForTest,
} from "./battle-runtime.test-support.ts";
import type { BattleHole } from "./battle-state-execution.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import type { CombatantId } from "./identity.ts";

type NeedsHolesTransactionResult = Extract<
  BattleRuntimeTransactionResult,
  { readonly tag: "needsHoles" }
>;

function requireNeedsHoles(
  result: BattleRuntimeTransactionResult,
  context: string,
): NeedsHolesTransactionResult {
  if (result.tag !== "needsHoles") {
    throw new Error(
      `Expected ${context} to need holes, got ${result.tag}${
        result.tag === "invalid" ? `: ${result.resolution.message}` : ""
      }.`,
    );
  }
  return result;
}

type InterruptFrontier = Extract<
  BattleMechanicalFrontier,
  { readonly kind: "interruptDecision" }
>;

function requireInterruptFrontier(
  frontier: BattleMechanicalFrontier,
  context: string,
): InterruptFrontier {
  if (frontier.kind !== "interruptDecision") {
    throw new Error(`Expected ${context} to expose an interrupt frontier.`);
  }
  return frontier;
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
  session: BattleRuntimeSession,
  actorId: CombatantId,
): Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand"; readonly command: "move" }
> {
  const act = findAct(session, {
    tag: "runtimeCommand",
    actorId,
    command: "move",
  });
  if (act.subject.tag !== "runtimeCommand" || act.subject.command !== "move") {
    throw new Error("Expected a discovered Move subject.");
  }
  return act.subject;
}

function settledByDeclining(
  result: NeedsHolesTransactionResult,
  responderId: CombatantId,
): BattleRuntimeTransactionResult {
  const hole = requireHole(result, "interruptDecision");
  return settleBattleRuntimeTransaction({
    session: result.resolution.session,
    transaction: result.transaction,
    operation: {
      kind: "interruptDecision",
      fill: interruptDecisionFill(hole, {
        kind: "decline",
        responderId,
      }),
    },
  });
}

function readyMovementSession(): BattleRuntimeSession {
  const initial = startBattleSessionRight({
    battleId: battleId("battle-transaction-ready-movement"),
    combatants: [
      characterSeed({ initiative: 40 }),
      statBlockCreatureInit({ initiative: 30 }),
      skeletonCreatureInit({ initiative: 20 }),
      statBlockCreatureInit({
        combatantId: secondSkeletonId,
        initiative: 10,
      }),
    ],
  });
  const readySubject = {
    tag: "action" as const,
    actorId: fighterId,
    action: "ready" as const,
  };
  const readyAct = findAct(initial, readySubject);
  const declarationHole = readyAct.initialHoles.find(
    (hole) => hole.kind === "readyDeclaration",
  );
  if (declarationHole?.kind !== "readyDeclaration") {
    throw new Error("Expected the Ready declaration hole.");
  }
  const movementResponse = declarationHole.responseChoices.find(
    (response) => response.kind === "movement",
  );
  if (movementResponse?.kind !== "movement") {
    throw new Error("Expected a Ready movement response.");
  }
  const readied = requireResolved(
    resolveBattleSubject({
      state: initial.state,
      subject: readySubject,
      fills: [
        readyDeclarationFillForTest(
          declarationHole,
          "the goblin moves",
          movementResponse,
        ),
      ],
    }),
  );
  const ended = endTurn({ state: readied.state, actorId: fighterId });
  if (ended.tag !== "resolved") {
    throw new Error(
      `Expected the Ready actor's turn to end, got ${ended.tag}.`,
    );
  }
  return battleRuntimeSessionWithState(initial, ended.state);
}

describe("battle runtime transaction completion unwind", () => {
  test("replays an ordinary subject once after its nested interrupt declines", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-transaction-ordinary-replay"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = moveSubjectFor(session, fighterId);
    const initial = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session,
        transaction: null,
        operation: { kind: "ordinarySubject", subject, fills: [] },
      }),
      "initial Move",
    );
    const movementHole = requireHole(initial, "movement");
    const movement = movementFill(movementHole, {
      movementCostFeet: 5,
      provokedOpportunityAttacks: [
        {
          reactorId: goblinId,
          distanceFeet: movementFeet(5),
          ...attackExecutionSelectionForSubjectForTest(
            goblinAttackSubject(session.state, "Scimitar"),
          ),
        },
      ],
    });
    const interrupted = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session: initial.resolution.session,
        transaction: initial.transaction,
        operation: { kind: "ordinarySubject", subject, fills: [movement] },
      }),
      "Move with Opportunity Attack",
    );
    expect(interrupted.frontier.kind).toBe("interruptDecision");

    const declined = settledByDeclining(interrupted, goblinId);
    expect(declined.tag).toBe("settled");
    if (declined.tag === "settled") {
      expect(declined.resolution.session.state.interruptStack).toEqual([]);
      expect(declined.resolution.snapshot.pendingInterrupt).toBeNull();
    }
  });

  test("unwinds Ready ordinary and nested interrupt holes to the parent frontier once", () => {
    const session = readyMovementSession();
    const outerSubject = moveSubjectFor(session, goblinId);
    const initial = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session,
        transaction: null,
        operation: {
          kind: "ordinarySubject",
          subject: outerSubject,
          fills: [],
        },
      }),
      "initial outer Move",
    );
    const outerMovementHole = requireHole(initial, "movement");
    const outerMovement = movementFill(outerMovementHole, {
      movementCostFeet: 5,
      provokedOpportunityAttacks: [
        {
          reactorId: skeletonId,
          distanceFeet: movementFeet(5),
          ...attackExecutionSelectionForSubjectForTest(
            statBlockAttackSubjectForTest(
              session.state,
              skeletonId,
              "Shortsword",
              "actions",
            ),
          ),
        },
      ],
    });
    const outerInterrupt = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session: initial.resolution.session,
        transaction: initial.transaction,
        operation: {
          kind: "ordinarySubject",
          subject: outerSubject,
          fills: [outerMovement],
        },
      }),
      "outer Move with Opportunity Attack",
    );
    expect(outerInterrupt.frontier.kind).toBe("interruptDecision");

    const reportSubject = {
      tag: "runtimeCommand" as const,
      actorId: goblinId,
      command: "reportReadyTrigger" as const,
      readiedActorId: fighterId,
    };
    const report = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session: outerInterrupt.resolution.session,
        transaction: outerInterrupt.transaction,
        operation: {
          kind: "ordinarySubject",
          subject: reportSubject,
          fills: [],
        },
      }),
      "Ready trigger report",
    );
    expect(report.resolution.snapshot.pendingInterrupt?.trigger).toBe(
      "reportedReadyTrigger",
    );
    const readyDecisionHole = requireHole(report, "interruptDecision");
    const releaseChoice =
      report.resolution.snapshot.pendingInterrupt?.choices.find(
        (choice) =>
          choice.kind === "nestedProcedure" &&
          choice.subject.command === "releaseReadiedMovement",
      );
    if (
      releaseChoice?.kind !== "nestedProcedure" ||
      releaseChoice.subject.command !== "releaseReadiedMovement"
    ) {
      throw new Error("Expected the Ready movement release choice.");
    }
    const release = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session: report.resolution.session,
        transaction: report.transaction,
        operation: {
          kind: "interruptDecision",
          fill: interruptDecisionFill(readyDecisionHole, {
            kind: "resolve",
            responderId: fighterId,
            choice: {
              kind: "releaseReadiedMovement",
              fills: [],
            },
          }),
        },
      }),
      "Ready movement release",
    );
    expect(release.frontier.kind).toBe("ordinaryHoles");
    const readyMovementHole = requireHole(release, "movement");

    const nested = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session: release.resolution.session,
        transaction: release.transaction,
        operation: {
          kind: "ordinarySubject",
          subject: release.resolution.subject,
          fills: [
            movementFill(readyMovementHole, {
              movementCostFeet: 5,
              provokedOpportunityAttacks: [
                {
                  reactorId: secondSkeletonId,
                  distanceFeet: movementFeet(5),
                  ...attackExecutionSelectionForSubjectForTest(
                    statBlockAttackSubjectForTest(
                      session.state,
                      secondSkeletonId,
                      "Scimitar",
                      "actions",
                    ),
                  ),
                },
              ],
            }),
          ],
        },
      }),
      "Ready movement with nested Opportunity Attack",
    );
    expect(nested.frontier.kind).toBe("interruptDecision");
    expect(nested.resolution.snapshot.pendingInterrupt?.trigger).toBe(
      "opportunityAttack",
    );

    const afterNested = settledByDeclining(nested, secondSkeletonId);
    expect(afterNested.tag).toBe("needsHoles");
    if (afterNested.tag !== "needsHoles") return;
    expect(afterNested.frontier.kind).toBe("interruptDecision");
    expect(afterNested.resolution.snapshot.pendingInterrupt?.trigger).toBe(
      "opportunityAttack",
    );
    const afterNestedFrontier = requireInterruptFrontier(
      afterNested.frontier,
      "after nested decline",
    );
    expect(
      afterNestedFrontier.choices.filter(
        (choice) =>
          choice.kind === "nestedProcedure" &&
          choice.subject.command === "opportunityAttack" &&
          choice.subject.reactorId === skeletonId,
      ),
    ).toHaveLength(1);
    expect(
      afterNestedFrontier.choices.some(
        (choice) =>
          choice.kind === "nestedProcedure" &&
          choice.subject.command === "opportunityAttack" &&
          choice.subject.reactorId === skeletonId,
      ),
    ).toBe(true);
    expect(
      afterNestedFrontier.choices.some(
        (choice) =>
          choice.kind === "nestedProcedure" &&
          choice.subject.command === "releaseReadiedMovement",
      ),
    ).toBe(false);
    const refreshedParent = battlePendingTransactionView(
      afterNested.transaction,
    );
    expect(refreshedParent?.subject).toEqual(outerSubject);
    expect(refreshedParent?.fills).toHaveLength(1);

    const settled = settledByDeclining(afterNested, skeletonId);
    expect(settled.tag).toBe("settled");
    if (settled.tag === "settled") {
      expect(settled.resolution.session.state.interruptStack).toEqual([]);
      expect(settled.resolution.snapshot.pendingInterrupt).toBeNull();
    }
  });

  test("keeps a grandparent checkpoint owner when a Ready overlay closes its parent", () => {
    const readySession = readyMovementSession();
    const heldResponse = readySession.state.readiedResponses.get(fighterId);
    if (heldResponse === undefined) {
      throw new Error("Expected the Fighter Ready response.");
    }
    const session = battleRuntimeSessionWithState(readySession, {
      ...readySession.state,
      readiedResponses: new Map(readySession.state.readiedResponses).set(
        secondSkeletonId,
        heldResponse,
      ),
    });
    const outerSubject = moveSubjectFor(session, goblinId);
    const initial = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session,
        transaction: null,
        operation: {
          kind: "ordinarySubject",
          subject: outerSubject,
          fills: [],
        },
      }),
      "initial outer Move",
    );
    const outerMovement = movementFill(requireHole(initial, "movement"), {
      movementCostFeet: 5,
      provokedOpportunityAttacks: [
        {
          reactorId: skeletonId,
          distanceFeet: movementFeet(5),
          ...attackExecutionSelectionForSubjectForTest(
            statBlockAttackSubjectForTest(
              session.state,
              skeletonId,
              "Shortsword",
              "actions",
            ),
          ),
        },
      ],
    });
    const outerInterrupt = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session: initial.resolution.session,
        transaction: initial.transaction,
        operation: {
          kind: "ordinarySubject",
          subject: outerSubject,
          fills: [outerMovement],
        },
      }),
      "outer Move with Opportunity Attack",
    );
    const firstReportSubject = {
      tag: "runtimeCommand" as const,
      actorId: goblinId,
      command: "reportReadyTrigger" as const,
      readiedActorId: fighterId,
    };
    const firstReport = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session: outerInterrupt.resolution.session,
        transaction: outerInterrupt.transaction,
        operation: {
          kind: "ordinarySubject",
          subject: firstReportSubject,
          fills: [],
        },
      }),
      "first Ready trigger report",
    );
    const firstReportChoice =
      firstReport.resolution.snapshot.pendingInterrupt?.choices.find(
        (choice) =>
          choice.kind === "nestedProcedure" &&
          choice.subject.command === "releaseReadiedMovement",
      );
    if (
      firstReportChoice?.kind !== "nestedProcedure" ||
      firstReportChoice.subject.command !== "releaseReadiedMovement"
    ) {
      throw new Error("Expected the first Ready movement release choice.");
    }
    const released = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session: firstReport.resolution.session,
        transaction: firstReport.transaction,
        operation: {
          kind: "interruptDecision",
          fill: interruptDecisionFill(
            requireHole(firstReport, "interruptDecision"),
            {
              kind: "resolve",
              responderId: fighterId,
              choice: {
                kind: "releaseReadiedMovement",
                fills: [],
              },
            },
          ),
        },
      }),
      "first Ready movement release",
    );
    const nestedMovement = movementFill(requireHole(released, "movement"), {
      movementCostFeet: 5,
      provokedOpportunityAttacks: [
        {
          reactorId: secondSkeletonId,
          distanceFeet: movementFeet(5),
          ...attackExecutionSelectionForSubjectForTest(
            statBlockAttackSubjectForTest(
              session.state,
              secondSkeletonId,
              "Scimitar",
              "actions",
            ),
          ),
        },
      ],
    });
    const nested = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session: released.resolution.session,
        transaction: released.transaction,
        operation: {
          kind: "ordinarySubject",
          subject: released.resolution.subject,
          fills: [nestedMovement],
        },
      }),
      "nested Ready movement Opportunity Attack",
    );
    const secondReportSubject = {
      tag: "runtimeCommand" as const,
      actorId: goblinId,
      command: "reportReadyTrigger" as const,
      readiedActorId: secondSkeletonId,
    };
    const secondReport = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session: nested.resolution.session,
        transaction: nested.transaction,
        operation: {
          kind: "ordinarySubject",
          subject: secondReportSubject,
          fills: [],
        },
      }),
      "second Ready trigger report",
    );
    const secondReportChoice =
      secondReport.resolution.snapshot.pendingInterrupt?.choices.find(
        (choice) =>
          choice.kind === "nestedProcedure" &&
          choice.subject.command === "releaseReadiedMovement",
      );
    if (
      secondReportChoice?.kind !== "nestedProcedure" ||
      secondReportChoice.subject.command !== "releaseReadiedMovement"
    ) {
      throw new Error("Expected the second Ready movement release choice.");
    }
    const secondReleased = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session: secondReport.resolution.session,
        transaction: secondReport.transaction,
        operation: {
          kind: "interruptDecision",
          fill: interruptDecisionFill(
            requireHole(secondReport, "interruptDecision"),
            {
              kind: "resolve",
              responderId: secondSkeletonId,
              choice: {
                kind: "releaseReadiedMovement",
                fills: [],
              },
            },
          ),
        },
      }),
      "second Ready movement release",
    );
    const exposed = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session: secondReleased.resolution.session,
        transaction: secondReleased.transaction,
        operation: {
          kind: "ordinarySubject",
          subject: secondReleased.resolution.subject,
          fills: [
            movementFill(requireHole(secondReleased, "movement"), {
              movementCostFeet: 5,
              provokedOpportunityAttacks: [],
            }),
          ],
        },
      }),
      "second Ready movement completion",
    );

    expect(exposed.resolution.subject).toEqual(outerSubject);
    expect(exposed.frontier.kind).toBe("interruptDecision");
    expect(
      currentInterruptCheckpoint(exposed.resolution.session.state)?.trigger,
    ).toBe("opportunityAttack");
    expect(battlePendingTransactionView(exposed.transaction)).toMatchObject({
      subject: outerSubject,
      fills: [outerMovement],
      holes: [{ kind: "interruptDecision", trigger: "opportunityAttack" }],
    });
    const exposedFrontier = requireInterruptFrontier(
      exposed.frontier,
      "grandparent checkpoint",
    );
    expect(
      exposedFrontier.choices.some(
        (choice) =>
          choice.kind === "nestedProcedure" &&
          choice.subject.command === "releaseReadiedMovement",
      ),
    ).toBe(false);

    const settled = settledByDeclining(exposed, skeletonId);
    expect(settled.tag).toBe("settled");
    if (settled.tag === "settled") {
      expect(settled.resolution.session.state.interruptStack).toEqual([]);
      expect(settled.resolution.snapshot.pendingInterrupt).toBeNull();
    }
  });
});
