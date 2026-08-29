// KERNEL-COVERAGE: parity-witness BATTLE.REACTION.OFFER_DECLINE_RESUME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY

import { Option } from "effect";
import { describe, expect, test } from "vitest";
import { classLevel } from "@dnd/shared/types";
import {
  armorClass,
  defaultArmorClassState,
  defaultUnarmoredArmorClassBase,
} from "@dnd/shared-algebras/armor-class-algebra";

import {
  admitBattleRuntimeTransactionOperation,
  battlePendingTransactionEnvelopeForSession,
  battlePendingTransactionView,
  battlePendingTransactionViewForSession,
  settleCreatureFallsRuntimeTransaction,
  settleBattleRuntimeTransaction,
  type BattlePendingTransaction,
  type BattleRuntimeTransactionResult,
} from "./battle-runtime-transaction.ts";
import {
  battleRuntimeSessionWithState,
  type BattleRuntimeSession,
} from "./battle-runtime-context.ts";
import type { BattleMechanicalFrontier } from "./battle-mechanical-frontier.ts";
import { currentInterruptCheckpoint } from "./battle-reducer/battle-snapshot.ts";
import {
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  battleId,
  battleRuntimeContextForStateForTest,
  characterSeed,
  characterBattleFeatureInitForTest,
  concentrationSavingThrowFill,
  cuttingWordsAttackOnlyUnit,
  cuttingWordsResource,
  damageRollFillWithGroups,
  endTurn,
  findAct,
  fighterAttackSubject,
  fighterId,
  goblinAttackSubject,
  goblinId,
  interruptDecisionFill,
  movementFill,
  movementFeet,
  readyDeclarationFillForTest,
  requireResolved,
  resolveBattleSubject,
  fighterTurnWithReadiedAcidAndSecondReadiedRay,
  goblinAttacksReactionModifierCharacter,
  goblinScimitarHitReactionSetup,
  reactionModifierChoice,
  reactionModifierUnitRef,
  rolledDiceGroup,
  savingThrowOutcomeFill,
  secondWizardId,
  secondSkeletonId,
  skeletonCreatureInit,
  skeletonId,
  startBattleSessionRight,
  startBattleRight,
  statBlockAttackSubjectForTest,
  statBlockCreatureInit,
  targetFill,
  attackExecutionSelectionForSubjectForTest,
  wizardId,
  unitLibrary,
} from "./battle-runtime.test-support.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
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

function transactionSubject(
  result: NeedsHolesTransactionResult,
): BattleSubject {
  const view = battlePendingTransactionView(result.transaction);
  if (Option.isNone(view)) {
    throw new Error("Expected an owned pending transaction.");
  }
  return view.value.subject;
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

function movementWithOpportunityAttack(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
  reactorId: CombatantId,
  attackSubject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >,
) {
  return movementFill(hole, {
    movementCostFeet: 5,
    provokedOpportunityAttacks: [
      {
        reactorId,
        distanceFeet: movementFeet(5),
        ...attackExecutionSelectionForSubjectForTest(attackSubject),
      },
    ],
  });
}

function movementWithoutOpportunityAttacks(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
) {
  return movementFill(hole, {
    movementCostFeet: 5,
    provokedOpportunityAttacks: [],
  });
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

function readySession(
  responseKind: "movement" | "dodge",
  battleIdValue: string,
  includeSecondSkeleton: boolean,
): BattleRuntimeSession {
  const initial = startBattleSessionRight({
    battleId: battleId(battleIdValue),
    combatants: [
      characterSeed({ initiative: 40 }),
      statBlockCreatureInit({ initiative: 30 }),
      skeletonCreatureInit({ initiative: 20 }),
      ...(includeSecondSkeleton
        ? [
            statBlockCreatureInit({
              combatantId: secondSkeletonId,
              initiative: 10,
            }),
          ]
        : []),
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
  const response = declarationHole.responseChoices.find((candidate) =>
    responseKind === "movement"
      ? candidate.kind === "movement"
      : candidate.kind === "action" && candidate.subject.action === "dodge",
  );
  if (response === undefined) {
    throw new Error(`Expected a Ready ${responseKind} response.`);
  }
  const readied = requireResolved(
    resolveBattleSubject({
      state: initial.state,
      subject: readySubject,
      fills: [
        readyDeclarationFillForTest(
          declarationHole,
          "the goblin moves",
          response,
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

function readyMovementSession(): BattleRuntimeSession {
  return readySession("movement", "battle-transaction-ready-movement", true);
}

function readyDodgeSession(): BattleRuntimeSession {
  return readySession("dodge", "battle-transaction-ready-dodge", false);
}

describe("battle runtime transaction completion unwind", () => {
  test("settles a resolved runtime command without a pending transaction", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-transaction-resolved-command"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const settled = settleBattleRuntimeTransaction({
      session,
      transaction: null,
      operation: {
        kind: "ordinarySubject",
        subject: {
          tag: "runtimeCommand",
          actorId: fighterId,
          command: "endTurn",
        },
        fills: [],
      },
    });

    expect(settled.tag).toBe("settled");
    if (settled.tag === "settled") {
      expect(settled.acts.length).toBeGreaterThan(0);
      expect(settled.resolution.envelope.checkpoint.currentActorId).toBe(
        goblinId,
      );
    }
  });

  test("represents an opaque token from another owner as an empty lookup", () => {
    // The token constructor is private; this boundary test models a token
    // supplied by a different runtime owner.
    const foreignToken = Object.freeze({}) as BattlePendingTransaction;

    expect(Option.isNone(battlePendingTransactionView(foreignToken))).toBe(
      true,
    );

    const session = readyMovementSession();
    expect(
      battlePendingTransactionViewForSession(foreignToken, session),
    ).toEqual({ tag: "foreignTransaction" });
    expect(
      battlePendingTransactionEnvelopeForSession(foreignToken, session),
    ).toEqual({ tag: "foreignTransaction" });

    expect(
      admitBattleRuntimeTransactionOperation({
        transaction: foreignToken,
        operation: {
          kind: "ordinarySubject",
          subject: {
            tag: "runtimeCommand",
            actorId: fighterId,
            command: "endTurn",
          },
          fills: [],
        },
      }),
    ).toEqual({
      tag: "rejected",
      issue: { tag: "foreignTransaction" },
    });
    expect(
      settleBattleRuntimeTransaction({
        session,
        transaction: foreignToken,
        operation: {
          kind: "ordinarySubject",
          subject: {
            tag: "runtimeCommand",
            actorId: fighterId,
            command: "endTurn",
          },
          fills: [],
        },
      }),
    ).toMatchObject({
      tag: "defect",
      issue: { tag: "foreignTransaction" },
    });
    expect(
      settleCreatureFallsRuntimeTransaction({
        session,
        transaction: foreignToken,
        fallingCreatureId: fighterId,
        reactionSpellTargetFacts: [],
      }),
    ).toMatchObject({
      tag: "defect",
      issue: { tag: "foreignTransaction" },
    });
  });

  test("projects a pending layer only for its exact session", () => {
    const session = readyMovementSession();
    const subject = moveSubjectFor(session, goblinId);
    const pending = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session,
        transaction: null,
        operation: { kind: "ordinarySubject", subject, fills: [] },
      }),
      "initial Move",
    );
    const currentSession = pending.resolution.session;
    const differentSession = battleRuntimeSessionWithState(
      currentSession,
      currentSession.state,
    );

    expect(
      battlePendingTransactionViewForSession(
        pending.transaction,
        currentSession,
      ),
    ).toMatchObject({
      tag: "valid",
      view: { subject, fills: [], holes: [{ kind: "movement" }] },
    });
    expect(
      battlePendingTransactionViewForSession(
        pending.transaction,
        differentSession,
      ),
    ).toEqual({ tag: "transactionSessionMismatch" });

    const ordinaryEnvelope = battlePendingTransactionEnvelopeForSession(
      pending.transaction,
      currentSession,
    );
    expect(ordinaryEnvelope.tag).toBe("valid");
    if (ordinaryEnvelope.tag === "valid") {
      expect(ordinaryEnvelope.envelope.frontier).toMatchObject({
        kind: "holes",
        subject,
        continuation: { kind: "ordinaryReplay" },
      });
    }
    expect(
      battlePendingTransactionEnvelopeForSession(
        pending.transaction,
        differentSession,
      ),
    ).toEqual({ tag: "transactionSessionMismatch" });
    expect(
      settleBattleRuntimeTransaction({
        session: differentSession,
        transaction: pending.transaction,
        operation: { kind: "ordinarySubject", subject, fills: [] },
      }),
    ).toMatchObject({
      tag: "defect",
      issue: { tag: "transactionSessionMismatch" },
    });

    const interruptMovement = movementWithOpportunityAttack(
      requireHole(pending, "movement"),
      skeletonId,
      statBlockAttackSubjectForTest(
        session.state,
        skeletonId,
        "Shortsword",
        "actions",
      ),
    );
    const interrupt = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session: currentSession,
        transaction: pending.transaction,
        operation: {
          kind: "ordinarySubject",
          subject,
          fills: [interruptMovement],
        },
      }),
      "Move with Opportunity Attack",
    );
    const interruptEnvelope = battlePendingTransactionEnvelopeForSession(
      interrupt.transaction,
      interrupt.resolution.session,
    );
    expect(interruptEnvelope.tag).toBe("valid");
    if (interruptEnvelope.tag === "valid") {
      expect(interruptEnvelope.envelope.frontier.kind).toBe(
        "interruptDecision",
      );
    }
  });

  test("closes a standalone Ready-trigger overlay after its interrupt declines", () => {
    const session = readyMovementSession();
    const reportSubject = {
      tag: "runtimeCommand" as const,
      actorId: goblinId,
      command: "reportReadyTrigger" as const,
      readiedActorId: fighterId,
    };
    const report = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session,
        transaction: null,
        operation: {
          kind: "ordinarySubject",
          subject: reportSubject,
          fills: [],
        },
      }),
      "standalone Ready trigger report",
    );
    expect(report.frontier.kind).toBe("interruptDecision");

    const settled = settledByDeclining(report, fighterId);
    expect(settled.tag).toBe("settled");
    if (settled.tag === "settled") {
      expect(settled.resolution.session.state.interruptStack).toEqual([]);
      expect(settled.resolution.envelope.frontier.kind).toBe("acts");
    }
  });

  test("settles a standalone Ready-triggered movement after release", () => {
    const session = readyMovementSession();
    const reportSubject = {
      tag: "runtimeCommand" as const,
      actorId: goblinId,
      command: "reportReadyTrigger" as const,
      readiedActorId: fighterId,
    };
    const report = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session,
        transaction: null,
        operation: {
          kind: "ordinarySubject",
          subject: reportSubject,
          fills: [],
        },
      }),
      "standalone Ready trigger report",
    );
    const reportFrontier = requireInterruptFrontier(
      report.frontier,
      "standalone Ready trigger report",
    );
    const releaseChoice = reportFrontier.choices.find(
      (choice) =>
        choice.kind === "nestedProcedure" &&
        choice.subject.command === "releaseReadiedMovement",
    );
    if (
      releaseChoice?.kind !== "nestedProcedure" ||
      releaseChoice.subject.command !== "releaseReadiedMovement"
    ) {
      throw new Error(
        "Expected the standalone readied movement release choice.",
      );
    }
    const released = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session: report.resolution.session,
        transaction: report.transaction,
        operation: {
          kind: "interruptDecision",
          fill: interruptDecisionFill(
            requireHole(report, "interruptDecision"),
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
      "standalone readied movement release",
    );
    const settled = settleBattleRuntimeTransaction({
      session: released.resolution.session,
      transaction: released.transaction,
      operation: {
        kind: "ordinarySubject",
        subject: transactionSubject(released),
        fills: [
          movementWithoutOpportunityAttacks(requireHole(released, "movement")),
        ],
      },
    });

    expect(settled.tag).toBe("settled");
    if (settled.tag !== "settled") {
      throw new Error("Expected standalone Ready movement to settle.");
    }
    expect(settled.resolution.session.state.interruptStack).toEqual([]);
    expect(settled.resolution.envelope.frontier.kind).toBe("acts");
    expect(settled.acts.length).toBeGreaterThan(0);
  });

  test("returns a typed invalid result for a report without a readied response", () => {
    const ready = readyMovementSession();
    const session = battleRuntimeSessionWithState(ready, {
      ...ready.state,
      readiedResponses: new Map(),
    });

    const result = settleBattleRuntimeTransaction({
      session,
      transaction: null,
      operation: {
        kind: "ordinarySubject",
        subject: {
          tag: "runtimeCommand",
          actorId: goblinId,
          command: "reportReadyTrigger",
          readiedActorId: fighterId,
        },
        fills: [],
      },
    });

    expect(result.tag).toBe("invalid");
    if (result.tag !== "invalid") {
      throw new Error("Expected a typed invalid Ready report result.");
    }
    expect(result.resolution.reason).toBe("staleSubject");
  });

  test("returns the existing interrupt frontier after a root Ready report closes", () => {
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
      "root-over-stack initial Move",
    );
    const outerInterrupt = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session: initial.resolution.session,
        transaction: initial.transaction,
        operation: {
          kind: "ordinarySubject",
          subject: outerSubject,
          fills: [
            movementWithOpportunityAttack(
              requireHole(initial, "movement"),
              skeletonId,
              statBlockAttackSubjectForTest(
                session.state,
                skeletonId,
                "Shortsword",
                "actions",
              ),
            ),
          ],
        },
      }),
      "root-over-stack opportunity attack",
    );
    const rootReport = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session: outerInterrupt.resolution.session,
        transaction: null,
        operation: {
          kind: "ordinarySubject",
          subject: {
            tag: "runtimeCommand",
            actorId: goblinId,
            command: "reportReadyTrigger",
            readiedActorId: fighterId,
          },
          fills: [],
        },
      }),
      "root Ready report over interrupt stack",
    );

    const closed = settledByDeclining(rootReport, fighterId);
    const remaining = requireNeedsHoles(
      closed,
      "the existing Opportunity Attack after root Ready decline",
    );
    const remainingFrontier = requireInterruptFrontier(
      remaining.frontier,
      "the existing Opportunity Attack after root Ready decline",
    );
    expect(remainingFrontier.decisionHole.trigger).toBe("opportunityAttack");
  });

  test("returns a typed defect when a root Ready report overlays a subject continuation", () => {
    const session = readyMovementSession();
    const outerSubject = moveSubjectFor(session, goblinId);
    const continuationSession = battleRuntimeSessionWithState(session, {
      ...session.state,
      subjectResolutionPhase: {
        kind: "subjectContinuation",
        subject: outerSubject,
      },
    });
    const report = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session: continuationSession,
        transaction: null,
        operation: {
          kind: "ordinarySubject",
          subject: {
            tag: "runtimeCommand",
            actorId: goblinId,
            command: "reportReadyTrigger",
            readiedActorId: fighterId,
          },
          fills: [],
        },
      }),
      "root Ready report over subject continuation",
    );

    const closed = settledByDeclining(report, fighterId);

    expect(closed.tag).toBe("defect");
    if (closed.tag !== "defect") {
      throw new Error(
        "Expected the root Ready report to retain the subject continuation.",
      );
    }
    expect(closed.issue).toEqual({ tag: "unsettledSubjectContinuation" });
  });

  test("replays an outer attack when a nested reaction changes a hit to a miss", () => {
    const unit = cuttingWordsAttackOnlyUnit();
    const highArmorClass = {
      ...defaultArmorClassState(),
      base: {
        ...defaultUnarmoredArmorClassBase(),
        base: armorClass(16),
      },
    };
    const state = goblinAttacksReactionModifierCharacter({
      unit,
      className: "bard",
      level: 3,
      unitId: unit.id,
      resources: [cuttingWordsResource({ unit })],
      armorClass: highArmorClass,
    });
    const setup = goblinScimitarHitReactionSetup(state);
    if (setup.result.tag !== "needsHoles") {
      throw new Error("Expected the attack to open a Reaction window.");
    }
    const session = battleRuntimeSessionForTest({
      state,
      context: battleRuntimeContextForStateForTest(state),
    });
    const outer = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session,
        transaction: null,
        operation: {
          kind: "ordinarySubject",
          subject: setup.subject,
          fills: setup.prefixFills,
        },
      }),
      "outer attack Reaction window",
    );
    requireInterruptFrontier(outer.frontier, "outer attack Reaction window");
    const rawOuterFrontier = outer.resolution.envelope.frontier;
    if (rawOuterFrontier.kind !== "interruptDecision") {
      throw new Error("Expected the raw outer Reaction frontier.");
    }
    const choice = reactionModifierChoice(
      rawOuterFrontier.choices,
      unit.id,
      "attackRollReduction",
    );
    const reductionHole = choice.initialHoles.find(
      (hole) => hole.kind === "rolledDice",
    );
    if (reductionHole === undefined) {
      throw new Error("Expected the attack-roll reduction roll hole.");
    }
    const settled = settleBattleRuntimeTransaction({
      session: outer.resolution.session,
      transaction: outer.transaction,
      operation: {
        kind: "interruptDecision",
        fill: interruptDecisionFill(requireHole(outer, "interruptDecision"), {
          kind: "resolve",
          responderId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            procedureRef: choice.modifier.procedureRef,
            modifierKind: "attackRollReduction",
            fills: [
              {
                kind: "rolledDice",
                holeId: reductionHole.holeId,
                value: [rolledDiceGroup([6])],
              },
            ],
          },
        }),
      },
    });

    expect(settled.tag).toBe("settled");
    if (settled.tag === "settled") {
      expect(settled.resolution.envelope.frontier.kind).toBe("acts");
      expect(
        settled.resolution.session.state.combatants.get(fighterId)?.hp,
      ).toBe(12);
    }
  });

  test("refreshes the parent interrupt after a readied action resolves immediately", () => {
    const session = readyDodgeSession();
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
      "initial Move",
    );
    const outerInterrupt = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session: initial.resolution.session,
        transaction: initial.transaction,
        operation: {
          kind: "ordinarySubject",
          subject: outerSubject,
          fills: [
            movementWithOpportunityAttack(
              requireHole(initial, "movement"),
              skeletonId,
              statBlockAttackSubjectForTest(
                session.state,
                skeletonId,
                "Shortsword",
                "actions",
              ),
            ),
          ],
        },
      }),
      "Move Opportunity Attack",
    );
    const report = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session: outerInterrupt.resolution.session,
        transaction: outerInterrupt.transaction,
        operation: {
          kind: "ordinarySubject",
          subject: {
            tag: "runtimeCommand",
            actorId: goblinId,
            command: "reportReadyTrigger",
            readiedActorId: fighterId,
          },
          fills: [],
        },
      }),
      "Ready Dodge report",
    );
    const settled = settleBattleRuntimeTransaction({
      session: report.resolution.session,
      transaction: report.transaction,
      operation: {
        kind: "interruptDecision",
        fill: interruptDecisionFill(requireHole(report, "interruptDecision"), {
          kind: "resolve",
          responderId: fighterId,
          choice: {
            kind: "releaseReadiedAction",
            fills: [],
          },
        }),
      },
    });
    expect(settled.tag).toBe("needsHoles");
    if (settled.tag !== "needsHoles") return;
    expect(settled.frontier.kind).toBe("interruptDecision");
    expect(settled.resolution.envelope.frontier.kind).toBe("interruptDecision");
    if (settled.resolution.envelope.frontier.kind === "interruptDecision") {
      expect(settled.resolution.envelope.frontier.trigger).toBe(
        "opportunityAttack",
      );
    }
  });

  test("resumes a parent Move after a readied movement completes", () => {
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
      "initial Move",
    );
    const outerMovement = movementWithOpportunityAttack(
      requireHole(initial, "movement"),
      skeletonId,
      statBlockAttackSubjectForTest(
        session.state,
        skeletonId,
        "Shortsword",
        "actions",
      ),
    );
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
      "outer Move opportunity attack",
    );
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
      "Ready movement report",
    );
    const reportFrontier = requireInterruptFrontier(
      report.frontier,
      "Ready movement report",
    );
    const releaseChoice = reportFrontier.choices.find(
      (choice) =>
        choice.kind === "nestedProcedure" &&
        choice.subject.command === "releaseReadiedMovement",
    );
    if (
      releaseChoice?.kind !== "nestedProcedure" ||
      releaseChoice.subject.command !== "releaseReadiedMovement"
    ) {
      throw new Error("Expected the readied movement release choice.");
    }
    const released = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session: report.resolution.session,
        transaction: report.transaction,
        operation: {
          kind: "interruptDecision",
          fill: interruptDecisionFill(
            requireHole(report, "interruptDecision"),
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
      "readied movement release",
    );
    const nestedMovement = movementWithoutOpportunityAttacks(
      requireHole(released, "movement"),
    );
    const resumed = settleBattleRuntimeTransaction({
      session: released.resolution.session,
      transaction: released.transaction,
      operation: {
        kind: "ordinarySubject",
        subject: transactionSubject(released),
        fills: [nestedMovement],
      },
    });
    expect(resumed.tag).toBe("needsHoles");
    if (resumed.tag !== "needsHoles") return;
    expect(resumed.frontier.kind).toBe("interruptDecision");
    if (resumed.resolution.envelope.frontier.kind !== "interruptDecision") {
      return;
    }
    expect(resumed.resolution.envelope.frontier.trigger).toBe(
      "opportunityAttack",
    );

    const settled = settledByDeclining(resumed, skeletonId);
    expect(settled.tag).toBe("settled");
  });

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
    const movement = movementWithOpportunityAttack(
      movementHole,
      goblinId,
      goblinAttackSubject(session.state, "Scimitar"),
    );
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
      expect(declined.resolution.envelope.frontier.kind).toBe("acts");
    }
  });

  test("resumes a top-level attack after its Reaction interrupt declines", () => {
    const unit = cuttingWordsAttackOnlyUnit();
    const state = goblinAttacksReactionModifierCharacter({
      unit,
      className: "bard",
      level: 3,
      unitId: unit.id,
      resources: [cuttingWordsResource({ unit })],
    });
    const setup = goblinScimitarHitReactionSetup(state);
    if (setup.result.tag !== "needsHoles") {
      throw new Error("Expected the attack to open a Reaction window.");
    }
    const session = battleRuntimeSessionForTest({
      state,
      context: battleRuntimeContextForStateForTest(state),
    });
    const outer = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session,
        transaction: null,
        operation: {
          kind: "ordinarySubject",
          subject: setup.subject,
          fills: setup.prefixFills,
        },
      }),
      "top-level attack Reaction window",
    );
    const declined = settledByDeclining(outer, fighterId);

    expect(declined.tag).toBe("needsHoles");
    if (declined.tag !== "needsHoles") return;
    expect(declined.frontier.kind).toBe("ordinaryHoles");
    expect(requireHole(declined, "rolledDice")).toMatchObject({
      kind: "rolledDice",
      attack: { kind: "statBlockAttack", damageNotation: "rolled" },
    });
  });

  test("resumes a top-level Creature Falls continuation after Reaction decline", () => {
    const slowFallUnit = unitLibrary.requireUnit("monk_slow_fall");
    const state = startBattleRight({
      battleId: battleId("battle-transaction-creature-falls"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          displayName: "Monk",
          initiative: 10,
          classLevels: [{ className: "monk", level: 4 }],
          attack: null,
          unitFeatures: [
            characterBattleFeatureInitForTest(slowFallUnit, [
              { className: "monk", level: classLevel(4) },
            ]),
          ],
          characterUnitRefs: [reactionModifierUnitRef(slowFallUnit.id)],
        }),
      ],
    });
    const session = battleRuntimeSessionForTest({
      state,
      context: battleRuntimeContextForStateForTest(state),
    });
    const opened = requireNeedsHoles(
      settleCreatureFallsRuntimeTransaction({
        session,
        transaction: null,
        fallingCreatureId: fighterId,
        reactionSpellTargetFacts: [],
      }),
      "Creature Falls Reaction window",
    );
    expect(opened.frontier.kind).toBe("interruptDecision");

    const declined = settledByDeclining(opened, fighterId);

    expect(declined.tag).toBe("settled");
    if (declined.tag !== "settled") return;
    expect(declined.resolution.session.state.interruptStack).toEqual([]);
    expect(declined.resolution.envelope.frontier.kind).toBe("acts");
  });

  test("replays the outer attack after a nested readied-spell interrupt declines", () => {
    const state = fighterTurnWithReadiedAcidAndSecondReadiedRay();
    const session = battleRuntimeSessionForTest({
      state,
      context: battleRuntimeContextForStateForTest(state),
    });
    const subject = fighterAttackSubject(state);
    const target = attackInitialTargetHole(state, subject);
    const attackRoll = attackRollHoleAfterTarget(state, target, subject);
    const outerTargetFill = targetFill(target, goblinId);
    const outerAttackRollFill = attackRollFill(attackRoll, {
      total: 15,
      naturalD20: 10,
    });
    const outer = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session,
        transaction: null,
        operation: {
          kind: "ordinarySubject",
          subject,
          fills: [outerTargetFill, outerAttackRollFill],
        },
      }),
      "outer attack-hit interrupt",
    );
    const outerFrontier = requireInterruptFrontier(
      outer.frontier,
      "outer attack-hit interrupt",
    );
    const releaseChoice = outerFrontier.choices.find(
      (choice) =>
        choice.kind === "nestedProcedure" &&
        choice.subject.command === "releaseReadiedSpell",
    );
    if (
      releaseChoice?.kind !== "nestedProcedure" ||
      releaseChoice.subject.command !== "releaseReadiedSpell"
    ) {
      throw new Error("Expected a readied-spell release choice.");
    }
    const released = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session: outer.resolution.session,
        transaction: outer.transaction,
        operation: {
          kind: "interruptDecision",
          fill: interruptDecisionFill(requireHole(outer, "interruptDecision"), {
            kind: "resolve",
            responderId: wizardId,
            choice: {
              kind: "releaseReadiedSpell",
              procedureRef: releaseChoice.subject.procedureRef,
              fills: [],
            },
          }),
        },
      }),
      "readied-spell release",
    );
    expect(released.frontier.kind).toBe("ordinaryHoles");
    const save = requireHole(released, "savingThrowOutcome");
    const failedTargetId = [...state.combatants.keys()].find(
      (combatantId) => combatantId !== wizardId,
    );
    if (failedTargetId === undefined) {
      throw new Error("Expected a target for the readied spell save.");
    }
    const nested = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session: released.resolution.session,
        transaction: released.transaction,
        operation: {
          kind: "ordinarySubject",
          subject: transactionSubject(released),
          fills: [
            savingThrowOutcomeFill(save, [
              { targetId: failedTargetId, succeeded: false },
            ]),
          ],
        },
      }),
      "nested save-failed interrupt",
    );
    const nestedFrontier = requireInterruptFrontier(
      nested.frontier,
      "nested save-failed interrupt",
    );
    expect(
      nestedFrontier.choices.some(
        (choice) =>
          choice.kind === "nestedProcedure" &&
          choice.subject.command === "releaseReadiedSpell" &&
          choice.subject.readiedSpellCasterId === secondWizardId,
      ),
    ).toBe(true);
    const declined = requireNeedsHoles(
      settledByDeclining(nested, secondWizardId),
      "nested decline",
    );
    const damage = requireHole(declined, "rolledDice");
    const afterDamage = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session: declined.resolution.session,
        transaction: declined.transaction,
        operation: {
          kind: "ordinarySubject",
          subject: transactionSubject(declined),
          fills: [damageRollFillWithGroups(damage, [[4]])],
        },
      }),
      "readied-spell concentration save",
    );
    const resumed = settleBattleRuntimeTransaction({
      session: afterDamage.resolution.session,
      transaction: afterDamage.transaction,
      operation: {
        kind: "ordinarySubject",
        subject: transactionSubject(afterDamage),
        fills: [
          concentrationSavingThrowFill(
            requireHole(afterDamage, "concentrationSavingThrow"),
            true,
          ),
        ],
      },
    });
    expect(resumed.tag).toBe("needsHoles");
    if (resumed.tag !== "needsHoles") {
      throw new Error("Expected the outer attack to need its damage roll.");
    }
    expect(resumed.frontier.kind).toBe("ordinaryHoles");
    if (resumed.frontier.kind !== "ordinaryHoles") {
      throw new Error("Expected the outer attack's ordinary Hole frontier.");
    }
    expect(resumed.frontier.subject).toEqual(subject);
    expect(resumed.frontier.holes.map((hole) => hole.kind)).toEqual([
      "rolledDice",
    ]);
  });

  test("keeps the next Ready responder after the first attack-hit decline", () => {
    const base = fighterTurnWithReadiedAcidAndSecondReadiedRay();
    const secondReadiedSpell = base.readiedSpells.get(secondWizardId);
    if (secondReadiedSpell === undefined) {
      throw new Error("Expected the second Wizard to hold a readied spell.");
    }
    const state = {
      ...base,
      readiedSpells: new Map(base.readiedSpells).set(secondWizardId, {
        ...secondReadiedSpell,
        trigger: "attackHit" as const,
      }),
    };
    const session = battleRuntimeSessionForTest({
      state,
      context: battleRuntimeContextForStateForTest(state),
    });
    const subject = fighterAttackSubject(state);
    const target = attackInitialTargetHole(state, subject);
    const attackRoll = attackRollHoleAfterTarget(state, target, subject);
    const opened = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session,
        transaction: null,
        operation: {
          kind: "ordinarySubject",
          subject,
          fills: [
            targetFill(target, goblinId),
            attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
          ],
        },
      }),
      "two-responder attack-hit interrupt",
    );
    requireInterruptFrontier(
      opened.frontier,
      "two-responder attack-hit interrupt",
    );
    expect(requireHole(opened, "interruptDecision").eligibleResponders).toEqual(
      [wizardId, secondWizardId],
    );

    const declined = settledByDeclining(opened, wizardId);
    const remaining = requireNeedsHoles(
      declined,
      "the remaining Ready responder after first decline",
    );
    requireInterruptFrontier(remaining.frontier, "remaining Ready responder");
    expect(
      requireHole(remaining, "interruptDecision").eligibleResponders,
    ).toEqual([secondWizardId]);
    expect(remaining.resolution.session.state.interruptStack).not.toEqual([]);

    const afterSecondDecline = requireNeedsHoles(
      settledByDeclining(remaining, secondWizardId),
      "the resumed attack after both Ready responders decline",
    );
    expect(afterSecondDecline.frontier.kind).toBe("ordinaryHoles");
    expect(requireHole(afterSecondDecline, "rolledDice")).toMatchObject({
      kind: "rolledDice",
    });
  });

  test("preserves sequential attack fills while opening the reaction frontier", () => {
    const base = fighterTurnWithReadiedAcidAndSecondReadiedRay();
    const secondReadiedSpell = base.readiedSpells.get(secondWizardId);
    if (secondReadiedSpell === undefined) {
      throw new Error("Expected the second Wizard to hold a readied spell.");
    }
    const state = {
      ...base,
      readiedSpells: new Map(base.readiedSpells).set(secondWizardId, {
        ...secondReadiedSpell,
        trigger: "attackHit" as const,
      }),
    };
    const session = battleRuntimeSessionForTest({
      state,
      context: battleRuntimeContextForStateForTest(state),
    });
    const subject = fighterAttackSubject(state);
    const initial = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session,
        transaction: null,
        operation: { kind: "ordinarySubject", subject, fills: [] },
      }),
      "attack target frontier",
    );
    const target = attackInitialTargetHole(state, subject);
    const afterTarget = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session: initial.resolution.session,
        transaction: initial.transaction,
        operation: {
          kind: "ordinarySubject",
          subject,
          fills: [targetFill(target, goblinId)],
        },
      }),
      "attack roll frontier",
    );
    const attackRoll = requireHole(afterTarget, "attackRoll");
    const afterRoll = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session: afterTarget.resolution.session,
        transaction: afterTarget.transaction,
        operation: {
          kind: "ordinarySubject",
          subject,
          fills: [attackRollFill(attackRoll, { total: 15, naturalD20: 10 })],
        },
      }),
      "attack-hit reaction frontier after sequential fills",
    );

    const frontier = requireInterruptFrontier(
      afterRoll.frontier,
      "attack-hit reaction frontier after sequential fills",
    );
    expect(frontier.decisionHole.trigger).toBe("attackHit");
    expect(
      requireHole(afterRoll, "interruptDecision").eligibleResponders,
    ).toEqual([wizardId, secondWizardId]);
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
    const outerMovement = movementWithOpportunityAttack(
      outerMovementHole,
      skeletonId,
      statBlockAttackSubjectForTest(
        session.state,
        skeletonId,
        "Shortsword",
        "actions",
      ),
    );
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
    expect(report.frontier.kind).toBe("interruptDecision");
    if (report.resolution.envelope.frontier.kind !== "interruptDecision") {
      return;
    }
    expect(report.resolution.envelope.frontier.trigger).toBe(
      "reportedReadyTrigger",
    );
    if (report.frontier.kind !== "interruptDecision") return;
    const repeatedReportOperation = {
      kind: "ordinarySubject" as const,
      subject: reportSubject,
      fills: [],
    };
    expect(
      admitBattleRuntimeTransactionOperation({
        transaction: report.transaction,
        operation: repeatedReportOperation,
      }),
    ).toEqual({
      tag: "rejected",
      issue: {
        tag: "repeatedReadyTrigger",
        pendingSubject: reportSubject,
        requestedSubject: reportSubject,
      },
    });
    expect(
      settleBattleRuntimeTransaction({
        session: report.resolution.session,
        transaction: report.transaction,
        operation: repeatedReportOperation,
      }),
    ).toMatchObject({
      tag: "invalid",
      transaction: report.transaction,
      resolution: {
        message:
          "A report-ready trigger cannot be repeated while its interrupt decision is pending.",
      },
    });
    const readyDecisionHole = requireHole(report, "interruptDecision");
    const releaseChoice = report.frontier.choices.find(
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
          subject: transactionSubject(release),
          fills: [
            movementWithOpportunityAttack(
              readyMovementHole,
              secondSkeletonId,
              statBlockAttackSubjectForTest(
                session.state,
                secondSkeletonId,
                "Scimitar",
                "actions",
              ),
            ),
          ],
        },
      }),
      "Ready movement with nested Opportunity Attack",
    );
    expect(nested.frontier.kind).toBe("interruptDecision");
    if (nested.resolution.envelope.frontier.kind !== "interruptDecision") {
      return;
    }
    expect(nested.resolution.envelope.frontier.trigger).toBe(
      "opportunityAttack",
    );

    const afterNested = settledByDeclining(nested, secondSkeletonId);
    expect(afterNested.tag).toBe("needsHoles");
    if (afterNested.tag !== "needsHoles") return;
    expect(afterNested.frontier.kind).toBe("interruptDecision");
    if (afterNested.resolution.envelope.frontier.kind !== "interruptDecision") {
      return;
    }
    expect(afterNested.resolution.envelope.frontier.trigger).toBe(
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
    expect(Option.isSome(refreshedParent)).toBe(true);
    if (Option.isSome(refreshedParent)) {
      expect(refreshedParent.value.subject).toEqual(outerSubject);
      expect(refreshedParent.value.fills).toHaveLength(1);
    }

    const settled = settledByDeclining(afterNested, skeletonId);
    expect(settled.tag).toBe("settled");
    if (settled.tag === "settled") {
      expect(settled.resolution.session.state.interruptStack).toEqual([]);
      expect(settled.resolution.envelope.frontier.kind).toBe("acts");
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
    const outerMovement = movementWithOpportunityAttack(
      requireHole(initial, "movement"),
      skeletonId,
      statBlockAttackSubjectForTest(
        session.state,
        skeletonId,
        "Shortsword",
        "actions",
      ),
    );
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
    expect(firstReport.frontier.kind).toBe("interruptDecision");
    const firstReportFrontier = requireInterruptFrontier(
      firstReport.frontier,
      "first Ready trigger report",
    );
    const firstReportChoice = firstReportFrontier.choices.find(
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
    const nestedMovement = movementWithOpportunityAttack(
      requireHole(released, "movement"),
      secondSkeletonId,
      statBlockAttackSubjectForTest(
        session.state,
        secondSkeletonId,
        "Scimitar",
        "actions",
      ),
    );
    const nested = requireNeedsHoles(
      settleBattleRuntimeTransaction({
        session: released.resolution.session,
        transaction: released.transaction,
        operation: {
          kind: "ordinarySubject",
          subject: transactionSubject(released),
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
    expect(secondReport.frontier.kind).toBe("interruptDecision");
    const secondReportFrontier = requireInterruptFrontier(
      secondReport.frontier,
      "second Ready trigger report",
    );
    const secondReportChoice = secondReportFrontier.choices.find(
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
          subject: transactionSubject(secondReleased),
          fills: [
            movementWithoutOpportunityAttacks(
              requireHole(secondReleased, "movement"),
            ),
          ],
        },
      }),
      "second Ready movement completion",
    );

    expect(transactionSubject(exposed)).toEqual(outerSubject);
    expect(exposed.frontier.kind).toBe("interruptDecision");
    expect(
      currentInterruptCheckpoint(exposed.resolution.session.state)?.trigger,
    ).toBe("opportunityAttack");
    const exposedTransactionView = battlePendingTransactionView(
      exposed.transaction,
    );
    expect(Option.isSome(exposedTransactionView)).toBe(true);
    if (Option.isSome(exposedTransactionView)) {
      expect(exposedTransactionView.value).toMatchObject({
        subject: outerSubject,
        fills: [outerMovement],
        holes: [{ kind: "interruptDecision", trigger: "opportunityAttack" }],
      });
    }
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
      expect(settled.resolution.envelope.frontier.kind).toBe("acts");
    }
  });
});
