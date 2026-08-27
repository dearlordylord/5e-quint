import { describe, expect, test, vi } from "vitest";
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import { movementFeet } from "@dnd/shared/types";
import type {
  BattleInterruptCheckpointInput,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import { currentActorId } from "./creature-state-leaves.ts";
import { combatantId } from "../identity.ts";
import {
  fighterTurnWithReadiedAcidAndSecondReadiedRay,
  battleProcedureExecutionRefForTest,
  fighterAttackSubject,
  fighterId,
  secondWizardId,
  targetFill,
  wizardId,
} from "../battle-runtime.test-support.ts";
import {
  currentInterruptCheckpoint,
  snapshotBattle,
} from "./battle-snapshot.ts";
import {
  maybeOpenInterruptWindow,
  maybeOpenPostCastReadySpellCastWindow,
  maybeOpenSpellCastInterruptWindowWithTriggeredSpellChoices,
  opportunityAttackReactionChoices,
  spendReaction,
} from "./interrupt-execution.ts";
import { opportunityAttackThreatsForMovement } from "./movement-speed.ts";
import {
  InterruptLifecycleExecution,
  resolveActiveInterruptProcedure,
  resolveInterruptLifecycleDecision,
} from "./interrupt-lifecycle.ts";
import { admitBattleResolutionInput } from "./resolution-admission.ts";

describe("interrupt lifecycle", () => {
  test("closes an admitted responder checkpoint before resuming its continuation", () => {
    const state = fighterTurnWithReadiedAcidAndSecondReadiedRay();
    const actorId = currentActorId(state);
    const opened = maybeOpenInterruptWindow(
      state,
      {
        trigger: "saveFailed",
        targetId: actorId,
        continuation: {
          kind: "resolved",
          subject: { tag: "action", actorId, action: "dodge" },
        },
      },
      undefined,
    );
    if (opened === null) {
      throw new Error("Expected the readied-spell interrupt window to open.");
    }
    const frame = currentInterruptCheckpoint(opened.state);
    const decisionHole = opened.holes[0];
    if (frame === null || decisionHole.kind !== "interruptDecision") {
      throw new Error("Expected an admitted interrupt decision checkpoint.");
    }
    const responderId = decisionHole.eligibleResponders[0];
    if (responderId === undefined) {
      throw new Error("Expected an admitted interrupt responder.");
    }

    const continuationResumer = vi.fn(
      ({ state: resumedState }): BattleResolutionResult => ({
        tag: "resolved",
        state: resumedState,
        snapshot: snapshotBattle(resumedState),
      }),
    );
    const execution = InterruptLifecycleExecution.fromResolvers(() => {
      throw new Error("Declining must not execute an interrupt subject.");
    }, continuationResumer);

    expect(
      resolveInterruptLifecycleDecision({
        state: { ...opened.state, interruptStack: [] },
        fill: {
          kind: "interruptDecision",
          holeId: decisionHole.holeId,
          value: { kind: "decline", responderId },
        },
        execution,
      }),
    ).toMatchObject({
      tag: "withoutInterruptRoute",
      result: {
        tag: "invalid",
        reason: "staleSubject",
        message: "No interrupt checkpoint is pending.",
      },
    });

    const outcome = resolveInterruptLifecycleDecision({
      state: opened.state,
      fill: {
        kind: "interruptDecision",
        holeId: decisionHole.holeId,
        value: { kind: "decline", responderId },
      },
      execution,
    });

    expect(outcome.tag).toBe("withInterruptRoute");
    expect(outcome.result.tag).toBe("resolved");
    if (outcome.result.tag === "invalid") {
      throw new Error("Expected the decline to close the checkpoint.");
    }
    expect(currentInterruptCheckpoint(outcome.result.state)).toBeNull();
    expect(continuationResumer).toHaveBeenCalledOnce();
    expect(continuationResumer).toHaveBeenCalledWith(
      expect.objectContaining({
        continuation: expect.objectContaining({ kind: "resolved" }),
        handledInterruptTrigger: "saveFailed",
      }),
    );
  });

  test("spends the Reaction and completes an admitted procedure through active re-entry", () => {
    const state = fighterTurnWithReadiedAcidAndSecondReadiedRay();
    const actorId = currentActorId(state);
    const opened = maybeOpenInterruptWindow(
      state,
      {
        trigger: "saveFailed",
        targetId: actorId,
        continuation: {
          kind: "resolved",
          subject: { tag: "action", actorId, action: "dodge" },
        },
      },
      undefined,
    );
    if (opened === null) {
      throw new Error("Expected the readied-spell interrupt window to open.");
    }
    const frame = currentInterruptCheckpoint(opened.state);
    const decisionHole = opened.holes[0];
    const choice = frame?.choices[0];
    if (
      frame === null ||
      decisionHole.kind !== "interruptDecision" ||
      choice?.kind !== "nestedProcedure" ||
      choice.subject.tag !== "runtimeCommand" ||
      choice.subject.command !== "releaseReadiedSpell"
    ) {
      throw new Error("Expected an admitted readied-spell procedure choice.");
    }
    const [firstHole, ...remainingHoles] = choice.initialHoles;
    if (firstHole?.kind !== "targetChoice") {
      throw new Error("Expected the readied spell to require a target choice.");
    }
    const targetId = firstHole.choices[0];
    if (targetId === undefined) {
      throw new Error("Expected an admitted readied-spell target.");
    }
    const procedureFill = targetFill(firstHole, targetId);
    const continuationResumer = vi.fn(
      ({ state: resumedState }): BattleResolutionResult => ({
        tag: "resolved",
        state: resumedState,
        snapshot: snapshotBattle(resumedState),
      }),
    );
    const subjectResolver = vi.fn((admitted) => {
      return admitted.input.fills.length === 0
        ? {
            tag: "needsHoles" as const,
            state: admitted.input.state,
            subject: admitted.input.subject,
            holes: [firstHole, ...remainingHoles],
            snapshot: snapshotBattle(admitted.input.state),
          }
        : {
            tag: "resolved" as const,
            state: admitted.input.state,
            snapshot: snapshotBattle(admitted.input.state),
          };
    });
    const execution = InterruptLifecycleExecution.fromResolvers(
      subjectResolver,
      continuationResumer,
    );

    const fill = {
      kind: "interruptDecision" as const,
      holeId: decisionHole.holeId,
      value: {
        kind: "resolve" as const,
        responderId: choice.subject.readiedSpellCasterId,
        choice: {
          kind: "releaseReadiedSpell" as const,
          readiedSpellCasterId: choice.subject.readiedSpellCasterId,
          procedureRef: choice.subject.procedureRef,
          fills: [],
        },
      },
    };
    const responder = opened.state.combatants.get(
      choice.subject.readiedSpellCasterId,
    );
    if (responder === undefined || responder.positiveHpUnconscious !== null) {
      throw new Error("Expected a conscious admitted interrupt responder.");
    }
    const ineligibleState: BattleState = {
      ...opened.state,
      combatants: new Map(opened.state.combatants).set(
        choice.subject.readiedSpellCasterId,
        {
          ...responder,
          conditions: applyCondition(responder.conditions, "incapacitated"),
        },
      ),
    };
    expect(
      resolveInterruptLifecycleDecision({
        state: ineligibleState,
        fill,
        execution,
      }),
    ).toMatchObject({
      tag: "withoutInterruptRoute",
      result: { tag: "invalid", reason: "staleSubject" },
    });

    const started = resolveInterruptLifecycleDecision({
      state: opened.state,
      fill,
      execution,
    });

    expect(started).toMatchObject({
      tag: "withInterruptRoute",
      result: { tag: "needsHoles" },
    });
    if (started.result.tag !== "needsHoles") {
      throw new Error("Expected the active interrupt procedure to need holes.");
    }
    expect(
      started.result.state.combatants.get(choice.subject.readiedSpellCasterId)
        ?.reactionAvailable,
    ).toBe(false);
    expect(
      currentInterruptCheckpoint(started.result.state)?.activeInterrupt,
    ).toBeDefined();
    expect(
      resolveInterruptLifecycleDecision({
        state: started.result.state,
        fill,
        execution,
      }),
    ).toMatchObject({
      tag: "withoutInterruptRoute",
      result: { tag: "invalid", reason: "staleSubject" },
    });

    const mismatchedAdmission = admitBattleResolutionInput({
      state: started.result.state,
      subject: { tag: "action", actorId, action: "dodge" },
      fills: [],
    });
    if (mismatchedAdmission.tag === "staleCharacterProcedure") {
      throw new Error("Expected an admitted non-character-bound subject.");
    }
    expect(
      resolveActiveInterruptProcedure({
        resolution: mismatchedAdmission.input,
        execution,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "A pending interrupt checkpoint must be resolved before the interrupted procedure can continue.",
    });

    const admission = admitBattleResolutionInput({
      state: started.result.state,
      subject: choice.subject,
      fills: [procedureFill],
    });
    if (admission.tag === "staleCharacterProcedure") {
      throw new Error(
        "Expected the active interrupt subject to remain admitted.",
      );
    }
    const completed = resolveActiveInterruptProcedure({
      resolution: admission.input,
      execution,
    });

    expect(completed.tag).toBe("resolved");
    if (completed.tag === "invalid") {
      throw new Error("Expected active interrupt completion.");
    }
    expect(currentInterruptCheckpoint(completed.state)).toBeNull();
    expect(continuationResumer).toHaveBeenCalledOnce();
    expect(subjectResolver).toHaveBeenLastCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ fills: [procedureFill] }),
      }),
    );
  });

  test("keeps a checkpoint open while eligible responders are still unoffered", () => {
    const base = fighterTurnWithReadiedAcidAndSecondReadiedRay();
    const wizardReadiedSpell = base.readiedSpells.get(wizardId);
    if (wizardReadiedSpell === undefined) {
      throw new Error("Expected the Wizard to hold a readied spell.");
    }
    const saveFailedState: BattleState = {
      ...base,
      readiedSpells: new Map(base.readiedSpells).set(wizardId, {
        ...wizardReadiedSpell,
        trigger: "saveFailed",
      }),
    };
    const opened = maybeOpenInterruptWindow(
      saveFailedState,
      {
        trigger: "saveFailed",
        targetId: currentActorId(saveFailedState),
        continuation: {
          kind: "resolved",
          subject: {
            tag: "action",
            actorId: currentActorId(saveFailedState),
            action: "dodge",
          },
        },
      },
      undefined,
    );
    if (opened === null) {
      throw new Error("Expected a multi-responder interrupt window.");
    }
    const decisionHole = opened.holes[0];
    if (decisionHole?.kind !== "interruptDecision") {
      throw new Error("Expected the interrupt decision hole.");
    }
    expect(decisionHole.eligibleResponders).toEqual(
      expect.arrayContaining([wizardId, secondWizardId]),
    );
    const continuationResumer = vi.fn(
      ({ state: resumedState }): BattleResolutionResult => ({
        tag: "resolved",
        state: resumedState,
        snapshot: snapshotBattle(resumedState),
      }),
    );
    const outcome = resolveInterruptLifecycleDecision({
      state: opened.state,
      fill: {
        kind: "interruptDecision",
        holeId: decisionHole.holeId,
        value: { kind: "decline", responderId: wizardId },
      },
      execution: InterruptLifecycleExecution.fromResolvers(() => {
        throw new Error("Declining must not execute an interrupt subject.");
      }, continuationResumer),
    });
    expect(outcome).toMatchObject({
      tag: "withInterruptRoute",
      result: { tag: "resolved" },
    });
    if (outcome.result.tag !== "resolved") {
      throw new Error("Expected the first responder decline to resolve.");
    }
    expect(currentInterruptCheckpoint(outcome.result.state)).toMatchObject({
      offeredResponders: [wizardId],
    });
    expect(continuationResumer).not.toHaveBeenCalled();
  });

  test("keeps stale and already-handled spell windows side-effect free", () => {
    const state = fighterTurnWithReadiedAcidAndSecondReadiedRay();
    const actorId = currentActorId(state);
    const sourceProcedureRef = battleProcedureExecutionRefForTest(
      "synthetic-interrupt-spell-cast",
    );
    const frame: BattleInterruptCheckpointInput = {
      trigger: "spellCast",
      casterId: actorId,
      sourceProcedureRef,
      spellProcedure: "spellAttackDamage",
      castLevel: 0,
      components: [],
      castingResource: { kind: "alreadySpent" },
      paymentCommitment: { kind: "pendingCasterSpellSlot" },
      metamagicCommitment: { kind: "none" },
      concentrationCommitment: { kind: "none" },
      targetIds: [],
      reactionSpellTargetFacts: [],
      continuation: {
        kind: "resolved",
        subject: { tag: "action", actorId, action: "dodge" },
      },
    };

    expect(
      maybeOpenSpellCastInterruptWindowWithTriggeredSpellChoices(
        state,
        frame,
        "spellCast",
      ),
    ).toBeNull();
    expect(
      maybeOpenPostCastReadySpellCastWindow({
        state,
        subject: { tag: "action", actorId, action: "dodge" },
        casterId: actorId,
        sourceProcedureRef,
        spellProcedure: "spellAttackDamage",
        targetIds: [],
        handledInterruptTrigger: "spellCast",
      }),
    ).toBeNull();

    const pendingState: BattleState = {
      ...state,
      currentTurnResources: {
        ...state.currentTurnResources,
        spellSlotUsesThisTurn: [{ kind: "pending", combatantId: actorId }],
      },
    };
    expect(maybeOpenInterruptWindow(pendingState, frame, undefined)).toBeNull();
    expect(spendReaction(state, combatantId("missing-reactor"))).toBe(state);
    const attackSubject = fighterAttackSubject(state);
    if (
      attackSubject.attackAbility === undefined ||
      attackSubject.attackDamageType === undefined
    ) {
      throw new Error("Expected the fighter attack selection facts.");
    }
    expect(
      opportunityAttackReactionChoices(state, actorId, [
        {
          reactorId: combatantId("missing-reactor"),
          distanceFeet: movementFeet(5),
          procedureRef: attackSubject.procedureRef,
          attackAbility: attackSubject.attackAbility,
          attackDamageType: attackSubject.attackDamageType,
        },
      ]),
    ).toEqual([]);
  });

  test("does not admit an incapacitated opportunity-attack reactor", () => {
    const state = fighterTurnWithReadiedAcidAndSecondReadiedRay();
    const fighter = state.combatants.get(fighterId);
    if (fighter === undefined || fighter.positiveHpUnconscious !== null) {
      throw new Error(
        "Expected a conscious fighter opportunity-attack reactor.",
      );
    }
    const attackSubject = fighterAttackSubject(state);
    if (
      attackSubject.attackAbility === undefined ||
      attackSubject.attackDamageType === undefined
    ) {
      throw new Error("Expected the fighter attack selection facts.");
    }
    const threat = {
      reactorId: fighterId,
      distanceFeet: movementFeet(5),
      procedureRef: attackSubject.procedureRef,
      attackAbility: attackSubject.attackAbility,
      attackDamageType: attackSubject.attackDamageType,
    };
    const unavailableState: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(fighterId, {
        ...fighter,
        conditions: applyCondition(fighter.conditions, "incapacitated"),
      }),
    };

    expect(
      opportunityAttackThreatsForMovement(unavailableState, {
        moverId: secondWizardId,
        speedKind: "walk",
        movementCostFeet: movementFeet(5),
        provokedOpportunityAttacks: [threat],
        spendsTurnMovement: false,
      }),
    ).toEqual([]);
    expect(
      opportunityAttackReactionChoices(unavailableState, secondWizardId, [
        threat,
      ]),
    ).toEqual([]);
  });
});
