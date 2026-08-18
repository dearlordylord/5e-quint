import { describe, expect, test } from "vitest";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  classLevel,
  damageAmount,
  DieRollResult,
  movementFeet,
} from "@dnd/shared/types";
import { ATTACK_RESOLVERS } from "./battle-reducer/attack-main.ts";
import {
  maybeOpenInterruptWindow,
  openPrimaryAttackAfterDamageSequenceInterruptWindow,
} from "./battle-reducer/interrupt-execution.ts";
import { currentInterruptCheckpoint } from "./battle-reducer/battle-snapshot.ts";
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
  EndedFlySpeedGrant,
} from "./battle-state-execution.ts";
import {
  InterruptLifecycleExecution,
  resolveActiveInterruptProcedure,
  resolveInterruptLifecycleDecision,
} from "./battle-reducer/interrupt-lifecycle.ts";
import {
  attackInitialTargetHole,
  attackDamageHoleAfterHit,
  attackRollFill,
  attackRollHoleAfterTarget,
  battleProcedureExecutionRefForTest,
  battleId,
  characterBattleFeatureInitForTest,
  characterSeed,
  cuttingWordsAttackOnlyUnit,
  cuttingWordsDamageOnlyUnit,
  cuttingWordsResource,
  concentrationSavingThrowFill,
  damageRollFill,
  fighterAttackSubject,
  fighterId,
  fighterTurnWithReadiedRay,
  findHole,
  goblinAttackSubject,
  goblinId,
  interruptDecisionFill,
  reactionModifierChoice,
  requireHole,
  resolveBattleInterrupt,
  resolveBattleSubject,
  rolledDiceGroup,
  statBlockCreatureInit,
  startBattleRight,
  snapshotBattle,
  targetFill,
} from "./battle-runtime.test-support.ts";
import type {
  AttackSpellDamageAddition,
  BattleFill,
  BattleInterruptedProcedure,
} from "./battle-state-execution.ts";
import { REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE } from "./unit-feature-support.ts";

describe("battle runtime: interrupt lifecycle and continuation boundaries", () => {
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
    expect(resumed.snapshot.pendingInterrupt).toBeNull();

    const checkpoint = currentInterruptCheckpoint(result.state);
    const choice = checkpoint?.choices.find(
      (candidate) => candidate.kind === "releaseReadiedSpell",
    );
    if (choice?.kind !== "releaseReadiedSpell") {
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
        responderId: choice.reactorId,
        choice: {
          kind: "releaseReadiedSpell",
          readiedSpellCasterId: choice.readiedSpellCasterId,
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
        interruptStack: [replayContinuationFrame(continuation, "afterDamage")],
      },
      subject,
      fills: [],
    });
    expect(replay).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "attackHit" }],
    });
    if (replay.tag !== "needsHoles") {
      throw new Error("Expected the replay to open an attack-hit Reaction.");
    }
    const choice = currentInterruptCheckpoint(replay.state)?.choices.find(
      (candidate) => candidate.kind === "releaseReadiedSpell",
    );
    if (choice?.kind !== "releaseReadiedSpell") {
      throw new Error("Expected a readied spell choice.");
    }
    const started = resolveBattleInterrupt({
      state: replay.state,
      fill: interruptDecisionFill(requireHole(replay, "interruptDecision"), {
        kind: "resolve",
        responderId: choice.reactorId,
        choice: {
          kind: "releaseReadiedSpell",
          readiedSpellCasterId: choice.readiedSpellCasterId,
          procedureRef: choice.subject.procedureRef,
          fills: [],
        },
      }),
    });
    expect(started).toMatchObject({ tag: "needsHoles" });
    if (started.tag !== "needsHoles") {
      throw new Error("Expected the readied spell to request target holes.");
    }
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
      handledInterruptTrigger: "afterDamage",
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
    const endedEffect = {
      kind: "specialSpeedGrant",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic-fly-cleanup",
      ),
      sourceCombatantId: fighterId,
      speedKind: "fly",
      speed: { kind: "fixed", speedFeet: movementFeet(60) },
      hover: true,
      expiresAt: {
        kind: "concentration",
        combatantId: fighterId,
        durationTicks: elapsedTimeTicks(1),
      },
    } satisfies EndedFlySpeedGrant;
    const flyFrame = {
      kind: "flySpeedGrantEndFallCleanup",
      targetId: fighterId,
      endedEffect,
    } satisfies BattleFlySpeedGrantEndFallCleanupFrame;
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
    for (const frame of [flyFrame, fallFrame]) {
      expect(
        resolveActiveInterruptContinuation({
          state: { ...state, interruptStack: [frame] },
          frame,
          subject,
          fills: [],
          execution,
        }),
      ).toEqual({ tag: "notActiveContinuation", frame });
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
      opened.snapshot.pendingInterrupt!.choices,
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
          procedureRef: choice.choice.procedureRef,
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
      opened.snapshot.pendingInterrupt!.choices,
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
          procedureRef: choice.choice.procedureRef,
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
      awaitingDamage.snapshot.pendingInterrupt!.choices,
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
            procedureRef: choice.choice.procedureRef,
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
        unitFeatures: [
          characterBattleFeatureInitForTest(unit, [
            { className: "bard", level: classLevel(3) },
          ]),
        ],
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
