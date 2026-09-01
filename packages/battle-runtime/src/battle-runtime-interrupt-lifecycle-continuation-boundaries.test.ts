// KERNEL-COVERAGE: parity-witness BATTLE.REACTION.OFFER_DECLINE_RESUME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY

import { describe, expect, test } from "vitest";
import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { damageAmount, DieRollResult, movementFeet } from "@dnd/shared/types";
import { ATTACK_RESOLVERS } from "./battle-reducer/attack-main.ts";
import {
  maybeOpenInterruptWindow,
  interruptCheckpointFrame,
  openPrimaryAttackAfterDamageSequenceInterruptWindow,
  spendReaction,
} from "./battle-reducer/interrupt-execution.ts";
import { currentInterruptCheckpoint } from "./battle-reducer/battle-snapshot.ts";
import { battleCheckpointFrontierEnvelope } from "./battle-session-execution.ts";
import { resolveReplayContinuationFromState as resolveComposedReplayContinuationFromState } from "./battle-execution-composition.ts";
import { replayContinuationFrame } from "./battle-reducer/replay-continuation.ts";
import {
  ReplayContinuationExecution,
  resolveReplayContinuationFromState,
} from "./battle-reducer/replay-continuation.ts";
import {
  InterruptContinuationExecution,
  resolveActiveInterruptContinuation,
} from "./battle-reducer/interrupt-continuation.ts";
import { spellProcedureExecutionRegistry } from "./battle-reducer/spell-procedure-profiles/execution-composition.ts";
import { admitBattleResolutionInput } from "./battle-reducer/resolution-admission.ts";
import type { BattleAttackRouteResolvers } from "./battle-reducer/attack-resolvers.ts";
import type {
  BattleFallDamageLandingMitigationFrame,
  BattleFlySpeedGrantEndFallCleanupFrame,
  BattleState,
} from "./battle-state-execution.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import {
  InterruptLifecycleExecution,
  isInactiveInterruptCheckpoint,
  reconcileInterruptCheckpointAfterStateChange,
  resolveActiveInterruptProcedure,
  resolveInterruptLifecycleDecision,
} from "./battle-reducer/interrupt-lifecycle.ts";
import {
  attackInitialTargetHole,
  attackDamageHoleAfterHit,
  attackRollFill,
  attackRollHoleAfterTarget,
  attackExecutionSelectionForSubjectForTest,
  battleProcedureExecutionRefForTest,
  battleFrontierInterruptDecisionForState,
  battleId,
  breakBattleConcentration,
  characterSeed,
  cuttingWordsAttackOnlyUnit,
  cuttingWordsDamageOnlyUnit,
  cuttingWordsResource,
  concentrationSavingThrowFill,
  damageRollFill,
  fighterAttackSubject,
  fighterId,
  fighterVsGoblinBattle,
  fighterTurnWithReadiedRay,
  findHole,
  goblinAttackSubject,
  goblinId,
  hasCondition,
  interruptDecisionFill,
  reactionModifierChoice,
  requireHole,
  requireResolved,
  resolveBattleInterrupt,
  resolveBattleSubject,
  rolledDiceGroup,
  skeletonCreatureInit,
  skeletonId,
  statBlockAttackSubjectForTest,
  statBlockCreatureInit,
  startBattleSessionRight,
  startBattleRight,
  snapshotBattle,
  targetFill,
  testLongswordAttack,
  wizardId,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import type {
  AttackSpellDamageAddition,
  BattleFill,
  BattleInterruptedProcedure,
} from "./battle-state-execution.ts";
import { REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE } from "./unit-feature-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  knownWillingSpellTargetFill,
  savingThrowOutcomeFill,
  spellAct,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import { statBlockWithCreatureType } from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  flyUnitId,
  spellCasterId,
} from "./unit-profile-admission-catalog.test-support.ts";

describe("battle runtime: interrupt lifecycle and continuation boundaries", () => {
  test("closes an inactive checkpoint when its only responder spent a Reaction", () => {
    const state = fighterVsGoblinBattle();
    const opened = maybeOpenInterruptWindow(
      state,
      {
        trigger: "opportunityAttack",
        moverId: goblinId,
        threats: [
          {
            reactorId: fighterId,
            distanceFeet: movementFeet(5),
            ...attackExecutionSelectionForSubjectForTest(
              fighterAttackSubject(state),
            ),
          },
        ],
        continuation: {
          kind: "resolved",
          subject: {
            tag: "runtimeCommand",
            actorId: fighterId,
            command: "endTurn",
          },
        },
      },
      undefined,
    );
    if (opened === null) {
      throw new Error("Expected an Opportunity Attack checkpoint.");
    }
    const frame = currentInterruptCheckpoint(opened.state);
    if (frame === null || !isInactiveInterruptCheckpoint(frame)) {
      throw new Error("Expected an inactive Opportunity Attack checkpoint.");
    }
    const resumedStates: BattleState[] = [];
    const execution = InterruptLifecycleExecution.fromResolvers(
      () => {
        throw new Error("The synthetic checkpoint has no active procedure.");
      },
      ({ state: resumedState }) => {
        resumedStates.push(resumedState);
        return {
          tag: "resolved" as const,
          state: resumedState,
          snapshot: snapshotBattle(resumedState),
        };
      },
    );

    const reconciliation = reconcileInterruptCheckpointAfterStateChange({
      state: spendReaction(opened.state, fighterId),
      frame,
      execution,
    });

    expect(reconciliation.tag).toBe("closed");
    if (reconciliation.tag === "closed") {
      expect(resumedStates).toHaveLength(1);
      expect(reconciliation.result.tag).toBe("resolved");
      if (reconciliation.result.tag === "resolved") {
        expect(
          currentInterruptCheckpoint(reconciliation.result.state),
        ).toBeNull();
      }
    }
  });

  test("retains a distinct responder after another responder spends a Reaction", () => {
    const state = startBattleRight({
      battleId: battleId("battle-interrupt-reconciliation-distinct-responder"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
        skeletonCreatureInit({ initiative: 5 }),
      ],
    });
    const opened = maybeOpenInterruptWindow(
      state,
      {
        trigger: "opportunityAttack",
        moverId: goblinId,
        threats: [
          {
            reactorId: fighterId,
            distanceFeet: movementFeet(5),
            ...attackExecutionSelectionForSubjectForTest(
              fighterAttackSubject(state),
            ),
          },
          {
            reactorId: skeletonId,
            distanceFeet: movementFeet(5),
            ...attackExecutionSelectionForSubjectForTest(
              statBlockAttackSubjectForTest(
                state,
                skeletonId,
                "Shortsword",
                "actions",
              ),
            ),
          },
        ],
        continuation: {
          kind: "resolved",
          subject: {
            tag: "runtimeCommand",
            actorId: fighterId,
            command: "endTurn",
          },
        },
      },
      undefined,
    );
    if (opened === null) {
      throw new Error("Expected an Opportunity Attack checkpoint.");
    }
    const frame = currentInterruptCheckpoint(opened.state);
    if (frame === null || !isInactiveInterruptCheckpoint(frame)) {
      throw new Error("Expected an inactive Opportunity Attack checkpoint.");
    }
    const reconciliation = reconcileInterruptCheckpointAfterStateChange({
      state: spendReaction(opened.state, fighterId),
      frame,
      execution: InterruptLifecycleExecution.fromResolvers(
        () => {
          throw new Error("The synthetic checkpoint has no active procedure.");
        },
        ({ state: resumedState }) => ({
          tag: "resolved" as const,
          state: resumedState,
          snapshot: snapshotBattle(resumedState),
        }),
      ),
    });

    expect(reconciliation.tag).toBe("retained");
    if (reconciliation.tag === "retained") {
      expect(reconciliation.frame.eligibleResponders).toEqual([skeletonId]);
      expect(reconciliation.frame.choices).toHaveLength(1);
      expect(reconciliation.frame.offeredResponders).toEqual([]);
    }
  });

  test("preserves a declined responder while reconciliation retains an unoffered responder", () => {
    const state = startBattleRight({
      battleId: battleId("battle-interrupt-reconciliation-declined-history"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
        skeletonCreatureInit({ initiative: 5 }),
      ],
    });
    const opened = maybeOpenInterruptWindow(
      state,
      {
        trigger: "opportunityAttack",
        moverId: goblinId,
        threats: [
          {
            reactorId: fighterId,
            distanceFeet: movementFeet(5),
            ...attackExecutionSelectionForSubjectForTest(
              fighterAttackSubject(state),
            ),
          },
          {
            reactorId: skeletonId,
            distanceFeet: movementFeet(5),
            ...attackExecutionSelectionForSubjectForTest(
              statBlockAttackSubjectForTest(
                state,
                skeletonId,
                "Shortsword",
                "actions",
              ),
            ),
          },
        ],
        continuation: {
          kind: "resolved",
          subject: {
            tag: "runtimeCommand",
            actorId: fighterId,
            command: "endTurn",
          },
        },
      },
      undefined,
    );
    if (opened === null) {
      throw new Error("Expected an Opportunity Attack checkpoint.");
    }
    const frame = currentInterruptCheckpoint(opened.state);
    if (frame === null || !isInactiveInterruptCheckpoint(frame)) {
      throw new Error("Expected an inactive Opportunity Attack checkpoint.");
    }
    const declinedFrame = {
      ...frame,
      offeredResponders: [fighterId],
    };
    const declinedState: BattleState = {
      ...opened.state,
      interruptStack: [
        ...opened.state.interruptStack.slice(0, -1),
        interruptCheckpointFrame(declinedFrame),
      ],
    };
    const execution = InterruptLifecycleExecution.fromResolvers(
      () => {
        throw new Error("The synthetic checkpoint has no active procedure.");
      },
      ({ state: resumedState }) => ({
        tag: "resolved" as const,
        state: resumedState,
        snapshot: snapshotBattle(resumedState),
      }),
    );

    const afterSpent = reconcileInterruptCheckpointAfterStateChange({
      state: spendReaction(declinedState, fighterId),
      frame: declinedFrame,
      execution,
    });
    expect(afterSpent.tag).toBe("retained");
    if (afterSpent.tag !== "retained") return;
    expect(afterSpent.frame.offeredResponders).toEqual([fighterId]);
    expect(afterSpent.frame.eligibleResponders).toEqual([skeletonId]);
    expect(
      afterSpent.frame.choices.some(
        (choice) =>
          choice.kind === "nestedProcedure" &&
          choice.subject.command === "opportunityAttack" &&
          choice.subject.reactorId === fighterId,
      ),
    ).toBe(false);

    const fighter = afterSpent.state.combatants.get(fighterId);
    if (fighter === undefined) {
      throw new Error("Expected the Fighter combatant.");
    }
    const restoredState: BattleState = {
      ...afterSpent.state,
      combatants: new Map(afterSpent.state.combatants).set(fighterId, {
        ...fighter,
        reactionAvailable: true,
      }),
    };
    const afterRestored = reconcileInterruptCheckpointAfterStateChange({
      state: restoredState,
      frame: afterSpent.frame,
      execution,
    });
    expect(afterRestored.tag).toBe("retained");
    if (afterRestored.tag === "retained") {
      expect(afterRestored.frame.offeredResponders).toEqual([fighterId]);
      expect(afterRestored.frame.eligibleResponders).toEqual([skeletonId]);
      expect(afterRestored.frame.choices).toHaveLength(1);
      expect(
        afterRestored.frame.choices.some(
          (choice) =>
            choice.kind === "nestedProcedure" &&
            choice.subject.command === "opportunityAttack" &&
            choice.subject.reactorId === fighterId,
        ),
      ).toBe(false);
    }
  });

  test("opens a primary-attack follow-up continuation through an after-damage Reaction", () => {
    const state = fighterTurnWithReadiedRay("afterDamage");
    const subject = fighterAttackSubject(state);
    const fighter = state.combatants.get(fighterId);
    if (
      fighter?.origin.kind !== "character" ||
      fighter.origin.attack === null
    ) {
      throw new Error("Expected the Fighter attack option.");
    }

    const result = openPrimaryAttackAfterDamageSequenceInterruptWindow({
      state,
      subject,
      firstTargetId: goblinId,
      attack: fighter.origin.attack,
      fills: [],
      events: [
        {
          damageSourceId: fighterId,
          damagedId: goblinId,
          damageAmount: damageAmount(1),
          reactionSpellTargetFacts: [],
        },
      ],
      objectDamages: [],
      objectIgnitions: [],
      droppedObjects: [],
      handledInterruptTrigger: undefined,
      attackResolvers: ATTACK_RESOLVERS,
    });

    expect(result).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "afterDamage" }],
    });
    if (result.tag !== "needsHoles") {
      throw new Error("Expected an after-damage Reaction window.");
    }
    expect(
      currentInterruptCheckpoint(result.state)?.continuation,
    ).toMatchObject({
      kind: "afterDamageSequenceWithPrimaryAttackFollowUp",
      subject,
      firstTargetId: goblinId,
    });
    const decision = requireHole(result, "interruptDecision");
    expect(decision).toBeDefined();
    const resumed = resolveBattleInterrupt({
      state: result.state,
      fill: interruptDecisionFill(decision, {
        kind: "decline",
        responderId: decision.eligibleResponders[0]!,
      }),
    });
    if (resumed.tag !== "resolved") {
      throw new Error("Expected the declined Reaction window to resolve.");
    }
    expect(battleFrontierInterruptDecisionForState(resumed.state)).toBeNull();

    const checkpoint = currentInterruptCheckpoint(result.state);
    const choice = checkpoint?.choices.find(
      (candidate) =>
        candidate.kind === "nestedProcedure" &&
        candidate.subject.command === "releaseReadiedSpell",
    );
    if (
      choice?.kind !== "nestedProcedure" ||
      choice.subject.command !== "releaseReadiedSpell"
    ) {
      throw new Error("Expected a readied spell choice.");
    }
    const objectOutcomeExecution = InterruptLifecycleExecution.fromResolvers(
      (admitted) => ({
        tag: "resolved" as const,
        state: admitted.input.state,
        snapshot: snapshotBattle(admitted.input.state),
        objectDamages: [],
        objectIgnitions: [],
      }),
      ({ state: resumedState }) => ({
        tag: "resolved" as const,
        state: resumedState,
        snapshot: snapshotBattle(resumedState),
      }),
    );
    const objectOutcomes = resolveInterruptLifecycleDecision({
      state: result.state,
      fill: interruptDecisionFill(requireHole(result, "interruptDecision"), {
        kind: "resolve",
        responderId: choice.subject.readiedSpellCasterId,
        choice: {
          kind: "releaseReadiedSpell",
          procedureRef: choice.subject.procedureRef,
          fills: [],
        },
      }),
      execution: objectOutcomeExecution,
    });
    expect(objectOutcomes.tag).toBe("withInterruptRoute");
    expect(objectOutcomes.result.tag).toBe("resolved");
  });

  test("carries admitted attack-damage additions into an active Ready replay", () => {
    const state = fighterTurnWithReadiedRay("attackHit");
    const subject = fighterAttackSubject(state);
    const target = attackInitialTargetHole(state, subject);
    const attackRoll = attackRollHoleAfterTarget(state, target, subject);
    const addition = {
      kind: "attackSpellDamageAddition",
      sourceProcedure: "afterHitDamage",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic-after-hit-addition",
      ),
      sourceCombatantId: fighterId,
      damage: {
        expr: { dice: 1, dieSize: 4 },
        damageType: "fire",
      },
    } satisfies AttackSpellDamageAddition;
    const continuation = {
      kind: "replay",
      subject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
      ],
      attackDamageAdditions: [addition],
    } as const satisfies Extract<
      BattleInterruptedProcedure,
      { readonly kind: "replay" }
    >;
    const replay = resolveBattleSubject({
      state: {
        ...state,
        interruptStack: [
          replayContinuationFrame(continuation, { trigger: "afterDamage" }),
        ],
      },
      subject,
      fills: [],
    });
    expect(
      resolveComposedReplayContinuationFromState(
        state,
        continuation,
        { trigger: "afterDamage" },
        [],
      ).tag,
    ).toBe("needsHoles");
    expect(
      battleCheckpointFrontierEnvelope({
        ...state,
        interruptStack: [
          replayContinuationFrame(continuation, { trigger: "afterDamage" }),
        ],
      }).checkpoint.battleId,
    ).toBe(state.battleId);
    expect(replay).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "attackHit" }],
    });
    if (replay.tag !== "needsHoles") {
      throw new Error("Expected the replay to open an attack-hit Reaction.");
    }
    expect(battleCheckpointFrontierEnvelope(replay.state).frontier.kind).toBe(
      "interruptDecision",
    );
    const choice = currentInterruptCheckpoint(replay.state)?.choices.find(
      (candidate) =>
        candidate.kind === "nestedProcedure" &&
        candidate.subject.command === "releaseReadiedSpell",
    );
    if (
      choice?.kind !== "nestedProcedure" ||
      choice.subject.command !== "releaseReadiedSpell"
    ) {
      throw new Error("Expected a readied spell choice.");
    }
    const started = resolveBattleInterrupt({
      state: replay.state,
      fill: interruptDecisionFill(requireHole(replay, "interruptDecision"), {
        kind: "resolve",
        responderId: choice.subject.readiedSpellCasterId,
        choice: {
          kind: "releaseReadiedSpell",
          procedureRef: choice.subject.procedureRef,
          fills: [],
        },
      }),
    });
    expect(started).toMatchObject({ tag: "needsHoles" });
    if (started.tag !== "needsHoles") {
      throw new Error("Expected the readied spell to request target holes.");
    }
    expect(battleCheckpointFrontierEnvelope(started.state).frontier.kind).toBe(
      "holes",
    );
    const activeSubject = currentInterruptCheckpoint(started.state)
      ?.activeInterrupt?.subject;
    if (activeSubject === undefined) {
      throw new Error("Expected an active readied spell subject.");
    }
    const nestedContinuation = {
      kind: "replay",
      subject: activeSubject,
      fills: [],
      attackDamageAdditions: [addition],
    } as const satisfies Extract<
      BattleInterruptedProcedure,
      { readonly kind: "replay" }
    >;
    const replayExecution = ReplayContinuationExecution.fromExecutionRegistry(
      spellProcedureExecutionRegistry(),
      (admitted) => ({
        tag: "needsHoles" as const,
        state: admitted.input.state,
        subject: admitted.input.subject,
        holes: [],
        snapshot: snapshotBattle(admitted.input.state),
      }),
    );
    const replayWithAdditions = resolveReplayContinuationFromState({
      state: started.state,
      continuation: nestedContinuation,
      handledInterruptOccurrence: { trigger: "afterDamage" },
      fills: [],
      execution: replayExecution,
    });
    expect(replayWithAdditions).toMatchObject({ tag: "needsHoles" });
    if (replayWithAdditions.tag !== "needsHoles") {
      throw new Error("Expected the nested replay to remain active.");
    }
    expect(
      currentInterruptCheckpoint(replayWithAdditions.state)?.activeInterrupt,
    ).toEqual(
      expect.objectContaining({
        pendingAttackDamageAdditions: [addition],
      }),
    );
    const admission = admitBattleResolutionInput({
      state: replayWithAdditions.state,
      subject: activeSubject,
      fills: [],
    });
    if (admission.tag === "staleCharacterProcedure") {
      throw new Error(
        "Expected the active continuation subject to be admitted.",
      );
    }
    const seenRouteOptions: {
      additions: readonly AttackSpellDamageAddition[] | undefined;
    } = {
      additions: undefined,
    };
    const activeExecution = InterruptLifecycleExecution.fromResolvers(
      (admitted) => {
        seenRouteOptions.additions =
          admitted.interruptRouteOptions.pendingAttackDamageAdditions;
        return {
          tag: "resolved" as const,
          state: admitted.input.state,
          snapshot: snapshotBattle(admitted.input.state),
        };
      },
      ({ state: resumedState }) => ({
        tag: "resolved" as const,
        state: resumedState,
        snapshot: snapshotBattle(resumedState),
      }),
    );
    const activeResolved = resolveActiveInterruptProcedure({
      resolution: admission.input,
      execution: activeExecution,
    });
    expect(activeResolved.tag).toBe("resolved");
    expect(seenRouteOptions.additions).toEqual([addition]);
  });

  test("reports stale subjects for pending Fly cleanup and landing mitigation continuations", () => {
    const state = fighterTurnWithReadiedRay("afterDamage");
    const subject = fighterAttackSubject(state);
    const flySession = spellBattle({
      preparedSpells: [spellRecord(flyUnitId)],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const flyAct = spellAct({
      session: flySession,
      spellId: flyUnitId,
      slotLevel: 3,
    });
    const flyTarget = flyAct.initialHoles.find(
      (hole) => hole.kind === "targetChoice",
    );
    if (flyTarget === undefined) {
      throw new Error("Expected Fly target selection.");
    }
    const flyCast = resolveBattleSubject({
      state: flySession.state,
      subject: flyAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          flyTarget,
          flyUnitId,
          spellCasterId,
          spellCasterId,
        ),
      ],
    });
    if (flyCast.tag !== "resolved") {
      throw new Error("Expected admitted Fly cast to resolve.");
    }
    const afterFlyEnded = breakBattleConcentration(
      flyCast.state,
      spellCasterId,
    );
    const flyFrame = afterFlyEnded.interruptStack.find(
      (frame): frame is BattleFlySpeedGrantEndFallCleanupFrame =>
        frame.kind === "grantedFlightEndFallCleanup" &&
        frame.targetId === spellCasterId,
    );
    if (flyFrame === undefined) {
      throw new Error("Expected production Fly cleanup frame.");
    }
    const flySubject = {
      tag: "runtimeCommand",
      actorId: spellCasterId,
      command: "endTurn",
    } satisfies BattleSubject;
    const fallFrame = {
      kind: "fallDamageLandingMitigation",
      targetId: fighterId,
      reductionAmount: damageAmount(1),
    } satisfies BattleFallDamageLandingMitigationFrame;
    const replayExecution = ReplayContinuationExecution.fromExecutionRegistry(
      spellProcedureExecutionRegistry(),
      () => ({
        tag: "resolved" as const,
        state,
        snapshot: snapshotBattle(state),
      }),
    );
    const routeResolvers = {
      ...ATTACK_RESOLVERS,
      resolveMonkFocusFlurryOfBlowsStrike: () => {
        throw new Error("Unexpected Monk continuation resolution.");
      },
      resolvePactOfTheChainFamiliarReactionAttack: () => {
        throw new Error("Unexpected Familiar continuation resolution.");
      },
    } satisfies BattleAttackRouteResolvers;
    const execution = InterruptContinuationExecution.fromExecution(
      replayExecution,
      routeResolvers,
    );
    for (const input of [
      { state: afterFlyEnded, frame: flyFrame, subject: flySubject },
      {
        state: { ...state, interruptStack: [fallFrame] },
        frame: fallFrame,
        subject,
      },
    ]) {
      expect(
        battleCheckpointFrontierEnvelope({
          ...state,
          interruptStack: [input.frame],
        }).checkpoint.battleId,
      ).toBe(state.battleId);
      expect(
        resolveActiveInterruptContinuation({
          state: input.state,
          frame: input.frame,
          subject: input.subject,
          fills: [],
          execution,
        }),
      ).toEqual({ tag: "notActiveContinuation", frame: input.frame });
    }
  });

  test("keeps a non-replay attack-hit continuation intact after a reaction roll reduction", () => {
    const unit = cuttingWordsAttackOnlyUnit();
    const state = reactionModifierState(unit);
    const interruptedSubject = {
      tag: "runtimeCommand" as const,
      actorId: goblinId,
      command: "endTurn" as const,
    };
    const opened = maybeOpenInterruptWindow(
      state,
      {
        trigger: "attackHit",
        attackerId: goblinId,
        targetId: fighterId,
        attackRoll: { total: 15, naturalD20: DieRollResult(10) },
        attackKind: "melee",
        attackHitTriggerKind: "meleeWeapon",
        damageTypes: ["slashing"],
        continuation: { kind: "resolved", subject: interruptedSubject },
      },
      undefined,
    );
    if (opened === null) {
      throw new Error("Expected an attack-hit Reaction window.");
    }
    const choice = reactionModifierChoice(
      battleFrontierInterruptDecisionForState(opened.state)!.choices,
      unit.id,
      "attackRollReduction",
    );
    const resolved = resolveBattleInterrupt({
      state: opened.state,
      fill: interruptDecisionFill(requireHole(opened, "interruptDecision"), {
        kind: "resolve",
        responderId: fighterId,
        choice: {
          kind: "reactionRollOrDamageReduction",
          procedureRef: choice.modifier.procedureRef,
          modifierKind: "attackRollReduction",
          fills: [
            {
              kind: "rolledDice",
              holeId: choice.initialHoles[0]!.holeId,
              value: [rolledDiceGroup([3])],
            },
          ],
        },
      }),
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
  });

  test("drops stale rolled and Concentration fills when an attack-roll Reaction changes the total", () => {
    const unit = cuttingWordsAttackOnlyUnit();
    const state = reactionModifierState(unit);
    const subject = goblinAttackSubject(state, "Scimitar");
    const target = attackInitialTargetHole(state, subject);
    const attackRoll = attackRollHoleAfterTarget(state, target, subject);
    const replayFills = [
      attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
      {
        kind: "rolledDice" as const,
        holeId: holeId("synthetic-rolled-dice"),
        value: [rolledDiceGroup([1])],
      },
      {
        kind: "concentrationSavingThrow" as const,
        holeId: holeId("synthetic-concentration"),
        value: { succeeded: true, withoutRoll: true as const },
      },
    ] as const;
    const opened = maybeOpenInterruptWindow(
      state,
      {
        trigger: "attackHit",
        attackerId: goblinId,
        targetId: fighterId,
        attackRoll: { total: 15, naturalD20: DieRollResult(10) },
        attackKind: "melee",
        attackHitTriggerKind: "meleeWeapon",
        damageTypes: ["slashing"],
        continuation: { kind: "replay", subject, fills: replayFills },
      },
      undefined,
    );
    if (opened === null) {
      throw new Error("Expected an attack-hit Reaction window.");
    }
    const choice = reactionModifierChoice(
      battleFrontierInterruptDecisionForState(opened.state)!.choices,
      unit.id,
      "attackRollReduction",
    );
    const resumedRoute: { fills: readonly BattleFill[] } = { fills: [] };
    const execution = InterruptLifecycleExecution.fromResolvers(
      () => {
        throw new Error(
          "Expected the modifier to resolve without a subject route.",
        );
      },
      ({ continuation, state: resumedState }) => {
        if (continuation.kind === "replay") {
          resumedRoute.fills = continuation.fills;
        }
        return {
          tag: "resolved" as const,
          state: resumedState,
          snapshot: snapshotBattle(resumedState),
        };
      },
    );
    const outcome = resolveInterruptLifecycleDecision({
      state: opened.state,
      fill: interruptDecisionFill(requireHole(opened, "interruptDecision"), {
        kind: "resolve",
        responderId: fighterId,
        choice: {
          kind: "reactionRollOrDamageReduction",
          procedureRef: choice.modifier.procedureRef,
          modifierKind: "attackRollReduction",
          fills: [
            {
              kind: "rolledDice",
              holeId: choice.initialHoles[0]!.holeId,
              value: [rolledDiceGroup([3])],
            },
          ],
        },
      }),
      execution,
    });
    expect(outcome.tag).toBe("withInterruptRoute");
    expect(resumedRoute.fills).toEqual([
      expect.objectContaining({
        kind: "attackRoll",
        value: expect.objectContaining({ total: 12 }),
      }),
    ]);
  });

  test("converts a natural-d20 Concentration fill while resuming reduced damage", () => {
    const unit = cuttingWordsDamageOnlyUnit();
    const base = reactionModifierState(unit);
    const fighter = base.combatants.get(fighterId);
    if (fighter === undefined) {
      throw new Error("Expected the reaction responder.");
    }
    const state = {
      ...base,
      combatants: new Map(base.combatants).set(fighterId, {
        ...fighter,
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            "synthetic-concentration",
          ),
          effectKind: "spellEffect" as const,
        },
      }),
    };
    const subject = goblinAttackSubject(state, "Scimitar");
    const target = attackInitialTargetHole(state, subject);
    const attackRoll = attackRollHoleAfterTarget(
      state,
      target,
      subject,
      fighterId,
    );
    const damage = attackDamageHoleAfterHit(
      state,
      target,
      attackRoll,
      { total: 20, naturalD20: 15 },
      subject,
      fighterId,
    );
    const awaitingDamage = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, fighterId),
        attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
        damageRollFill(damage, 6),
      ],
    });
    if (awaitingDamage.tag !== "needsHoles") {
      throw new Error("Expected an attack-damage Reaction window.");
    }
    const choice = reactionModifierChoice(
      battleFrontierInterruptDecisionForState(awaitingDamage.state)!.choices,
      unit.id,
      "damageRollReduction",
    );
    const afterReduction = resolveBattleInterrupt({
      state: awaitingDamage.state,
      fill: interruptDecisionFill(
        requireHole(awaitingDamage, "interruptDecision"),
        {
          kind: "resolve",
          responderId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            procedureRef: choice.modifier.procedureRef,
            modifierKind: "damageRollReduction",
            fills: [
              {
                kind: "rolledDice",
                holeId: choice.initialHoles[0]!.holeId,
                value: [rolledDiceGroup([3])],
              },
            ],
          },
        },
      ),
    });
    if (afterReduction.tag !== "needsHoles") {
      throw new Error("Expected the reduced damage to request Concentration.");
    }
    const concentrationFrame = afterReduction.state.interruptStack.at(-1);
    if (concentrationFrame?.kind !== "attackDamageContinuationConcentration") {
      throw new Error("Expected an active Concentration continuation frame.");
    }
    const replayExecution = ReplayContinuationExecution.fromExecutionRegistry(
      spellProcedureExecutionRegistry(),
      () => ({
        tag: "resolved" as const,
        state: afterReduction.state,
        snapshot: snapshotBattle(afterReduction.state),
      }),
    );
    const routeResolvers = {
      ...ATTACK_RESOLVERS,
      resolveMonkFocusFlurryOfBlowsStrike: () => {
        throw new Error("Unexpected Monk continuation resolution.");
      },
      resolvePactOfTheChainFamiliarReactionAttack: () => {
        throw new Error("Unexpected Familiar continuation resolution.");
      },
    } satisfies BattleAttackRouteResolvers;
    expect(
      resolveActiveInterruptContinuation({
        state: afterReduction.state,
        frame: concentrationFrame,
        subject: {
          tag: "runtimeCommand",
          actorId: goblinId,
          command: "endTurn",
        },
        fills: [],
        execution: InterruptContinuationExecution.fromExecution(
          replayExecution,
          routeResolvers,
        ),
      }),
    ).toMatchObject({
      tag: "resolved",
      result: {
        tag: "invalid",
        reason: "staleSubject",
        message:
          "Attack damage Concentration save must be resolved before other battle subjects.",
      },
    });
    const concentration = findHole(
      afterReduction.holes,
      "concentrationSavingThrow",
    );
    const resumed = resolveBattleSubject({
      state: afterReduction.state,
      subject,
      fills: [
        concentrationSavingThrowFill(concentration, {
          succeeded: false,
          naturalD20: 10,
        }),
      ],
    });
    expect(resumed.tag).toBe("resolved");
  });

  test("resumes interrupted positive attack damage through a durable condition repeat-save continuation", () => {
    const modifier = cuttingWordsDamageOnlyUnit();
    const conditionSpell = spellRecord("hideous_laughter");
    const targetStatBlock = statBlockWithCreatureType("humanoid");
    const session = startBattleSessionRight({
      battleId: battleId("battle-interrupt-condition-damage-repeat-save"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Synthetic condition caster and damage responder",
          initiative: 30,
          classLevels: [
            { className: "wizard", level: 1 },
            { className: "bard", level: 3 },
          ],
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [conditionSpell],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
          resources: [cuttingWordsResource({ unit: modifier })],
          characterUnitRefs: [
            {
              unit: modifier,
              supportProfiles: [
                REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
              ],
            },
          ],
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Synthetic attack owner",
          initiative: 20,
          attack: testLongswordAttack(),
        }),
        statBlockCreatureInit({
          combatantId: goblinId,
          statBlockName: "Synthetic condition target",
          initiative: 10,
          statBlock: {
            ...targetStatBlock,
            statBlock: {
              ...targetStatBlock.statBlock,
              hp: { kind: "literal", value: 20 },
            },
          },
          currentHp: 20,
        }),
      ],
    });
    const conditionAct = spellAct({
      session,
      spellId: "hideous_laughter",
      slotLevel: 1,
    });
    const conditionTarget = findHole(
      conditionAct.initialHoles,
      "spellTargetList",
    );
    const conditionTargetFill = spellTargetListFill(
      conditionTarget,
      wizardId,
      "hideous_laughter",
      [goblinId],
    );
    const awaitingConditionSave = resolveBattleSubject({
      state: session.state,
      subject: conditionAct.subject,
      fills: [conditionTargetFill],
    });
    if (awaitingConditionSave.tag !== "needsHoles") {
      throw new Error("Expected the admitted condition spell save.");
    }
    const conditionSave = requireHole(
      awaitingConditionSave,
      "savingThrowOutcome",
    );
    const conditioned = requireResolved(
      resolveBattleSubject({
        state: session.state,
        subject: conditionAct.subject,
        fills: [
          conditionTargetFill,
          savingThrowOutcomeFill(conditionSave, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    );
    const attackerTurn = requireResolved(
      resolveBattleSubject({
        state: conditioned.state,
        subject: {
          tag: "runtimeCommand",
          actorId: wizardId,
          command: "endTurn",
        },
        fills: [],
      }),
    );
    const subject = fighterAttackSubject(attackerTurn.state, "Longsword");
    const target = attackInitialTargetHole(attackerTurn.state, subject);
    const attackRoll = attackRollHoleAfterTarget(
      attackerTurn.state,
      target,
      subject,
      goblinId,
    );
    const attackPrefix = [
      targetFill(target, goblinId),
      attackRollFill(attackRoll, {
        total: 20,
        naturalD20: 15,
        rollMode: "advantage",
      }),
    ];
    const damage = requireHole(
      resolveBattleSubject({
        state: attackerTurn.state,
        subject,
        fills: attackPrefix,
      }),
      "rolledDice",
    );
    const awaitingReaction = resolveBattleSubject({
      state: attackerTurn.state,
      subject,
      fills: [...attackPrefix, damageRollFill(damage, 6)],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected the attack-damage Reaction window.");
    }
    const choice = reactionModifierChoice(
      battleFrontierInterruptDecisionForState(awaitingReaction.state)!.choices,
      modifier.id,
      "damageRollReduction",
    );
    const pendingRepeatSave = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction, "interruptDecision"),
        {
          kind: "resolve",
          responderId: wizardId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            procedureRef: choice.modifier.procedureRef,
            modifierKind: "damageRollReduction",
            fills: [
              {
                kind: "rolledDice",
                holeId: choice.initialHoles[0]!.holeId,
                value: [rolledDiceGroup([3])],
              },
            ],
          },
        },
      ),
    });
    if (pendingRepeatSave.tag !== "needsHoles") {
      throw new Error("Expected a damage-triggered condition repeat save.");
    }
    expect(pendingRepeatSave.state.interruptStack.at(-1)?.kind).toBe(
      "attackDamageContinuationRepeatSave",
    );
    const repeatSave = requireHole(pendingRepeatSave, "savingThrowOutcome");
    expect(repeatSave).toMatchObject({
      saveGatedConditionRepeatSave: {
        targetId: goblinId,
        trigger: "damage",
      },
    });

    const interruptStackBeforeWrongFill =
      pendingRepeatSave.state.interruptStack;
    const wrongHole = resolveBattleSubject({
      state: pendingRepeatSave.state,
      subject,
      fills: [
        {
          ...savingThrowOutcomeFill(repeatSave, [
            { targetId: goblinId, succeeded: true },
          ]),
          holeId: holeId("wrong-attack-damage-repeat-save-hole"),
        },
      ],
    });
    expect(wrongHole).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Attack damage repeat save fill does not match the pending Saving Throw hole.",
    });
    expect(pendingRepeatSave.state.interruptStack).toEqual(
      interruptStackBeforeWrongFill,
    );

    const resumed = requireResolved(
      resolveBattleSubject({
        state: pendingRepeatSave.state,
        subject,
        fills: [
          savingThrowOutcomeFill(repeatSave, [
            { targetId: goblinId, succeeded: true },
          ]),
        ],
      }),
    );
    const resolvedTarget = resumed.state.combatants.get(goblinId);
    expect(resolvedTarget?.hp).toBe(14);
    expect(
      resolvedTarget === undefined
        ? true
        : hasCondition(resolvedTarget.conditions, "prone"),
    ).toBe(false);
    expect(
      resolvedTarget?.activeEffects.some(
        (effect) => effect.kind === "saveGatedConditionWithRepeat",
      ),
    ).toBe(false);
  });
});

function reactionModifierState(
  unit: ReturnType<typeof cuttingWordsAttackOnlyUnit>,
) {
  return startBattleRight({
    battleId: battleId(`battle-interrupt-${unit.id}`),
    combatants: [
      statBlockCreatureInit({ initiative: 20 }),
      characterSeed({
        combatantId: fighterId,
        displayName: "Synthetic Reaction Tester",
        initiative: 10,
        classLevels: [{ className: "bard", level: 3 }],
        attack: null,
        resources: [cuttingWordsResource({ unit })],
        characterUnitRefs: [
          {
            unit,
            supportProfiles: [
              REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
            ],
          },
        ],
      }),
    ],
  });
}
