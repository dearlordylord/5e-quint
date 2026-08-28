import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  classLevel,
  difficultyClass,
  movementDeltaFeet,
  movementFeet,
} from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import {
  assertBattleSnapshotCodecAcceptsHolesForSubjectForTest,
  battleEffectExecutionRefForTest,
  battleId,
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectOccurrencesForTest,
  characterSeed,
  damageRollFillWithGroups,
  ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE,
  fighterId,
  fighterVsGoblinBattle,
  goblinTurnBattle,
  goblinId,
  KNOCKED_OUT_UNCONSCIOUS,
  savingThrowOutcomeFill,
  Result,
  Schema,
  startBattleRight,
  wizardId,
} from "../battle-runtime.test-support.ts";
import { BattleSnapshotSchema } from "../index.ts";
import {
  acidArrowUnitId,
  orcRelentlessEnduranceUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "../unit-profile-admission-catalog.test-support.ts";
import {
  attackDamageDispositionFill,
  attackRollFill,
  requireHole,
  requireResultHole,
} from "../unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "../unit-profile-admission-spell-battle.test-support.ts";
import {
  spellAct,
  spellTargetFill,
} from "../unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "../unit-profile-admission-spell-record.test-support.ts";
import {
  endTurn,
  resolveBattleSubject,
} from "../unit-profile-admission.test-support.ts";
import type {
  BattleActiveEffect,
  BattleState,
} from "../battle-state-execution.ts";
import {
  afterActiveEffectOccurrenceUpdate,
  isEndTurnFillKind,
  resolveEndTurnCommand,
  tickDurationEffects,
  updateCombatantWithActiveEffectOccurrence,
} from "./turn-boundary-lifecycle.ts";

describe("turn-boundary active-effect occurrence updates", () => {
  test("a non-owned occurrence cannot trigger effect teardown", () => {
    const state = fighterVsGoblinBattle();
    const source = state.combatants.get(fighterId);
    const target = state.combatants.get(goblinId);
    if (source === undefined || target === undefined) {
      throw new Error("Expected the fighter and goblin combatants.");
    }

    const sourceProcedureRef =
      battleProcedureExecutionRefForTest("stale-occurrence");
    const concentration = {
      sourceProcedureRef,
      effectKind: "spellEffect" as const,
    };
    const ownedEffect: Extract<
      BattleActiveEffect,
      { readonly kind: "nextAttackRollBySelf" }
    > = {
      kind: "nextAttackRollBySelf",
      effectRef: battleEffectExecutionRefForTest("owned-occurrence"),
      sourceProcedureRef,
      sourceCombatantId: fighterId,
      mode: "advantage",
      expiresAt: {
        kind: "duration",
        durationTicks: elapsedTimeTicks(1),
      },
    };
    const combatants = new Map(state.combatants)
      .set(fighterId, { ...source, concentration })
      .set(goblinId, { ...target, activeEffects: [ownedEffect] });
    const staleOccurrence = {
      ...ownedEffect,
      effectRef: battleEffectExecutionRefForTest("stale-occurrence"),
    };

    const update = updateCombatantWithActiveEffectOccurrence(
      combatants,
      goblinId,
      staleOccurrence,
      () => {
        throw new Error("A stale occurrence must not update its target.");
      },
    );
    const afterTeardown = afterActiveEffectOccurrenceUpdate(
      update,
      (updatedCombatants) =>
        new Map(updatedCombatants).set(fighterId, {
          ...source,
          concentration: null,
        }),
    );

    expect(update.tag).toBe("unchanged");
    expect(afterTeardown.get(fighterId)?.concentration).toEqual(concentration);
    expect(afterTeardown.get(goblinId)?.activeEffects).toEqual([ownedEffect]);
  });

  test("a same-reference clone can update its active effect occurrence", () => {
    const state = fighterVsGoblinBattle();
    const target = state.combatants.get(goblinId);
    if (target === undefined) {
      throw new Error("Expected the goblin combatant.");
    }
    const effectRef = battleEffectExecutionRefForTest(
      "same-reference-occurrence",
    );
    const ownedEffect = {
      kind: "nextAttackRollBySelf" as const,
      effectRef,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "same-reference-occurrence",
      ),
      sourceCombatantId: fighterId,
      mode: "advantage" as const,
      expiresAt: {
        kind: "duration" as const,
        durationTicks: elapsedTimeTicks(1),
      },
    } satisfies BattleActiveEffect;
    const combatants = new Map(state.combatants).set(goblinId, {
      ...target,
      activeEffects: [ownedEffect],
    });
    const clonedOccurrence = { ...ownedEffect };

    const update = updateCombatantWithActiveEffectOccurrence(
      combatants,
      goblinId,
      clonedOccurrence,
      (current) => ({
        ...current,
        activeEffects: current.activeEffects.map((effect) =>
          effect.effectRef === clonedOccurrence.effectRef
            ? { ...clonedOccurrence, mode: "disadvantage" }
            : effect,
        ),
      }),
    );

    expect(update).toMatchObject({ tag: "updated" });
    expect(update.combatants.get(goblinId)?.activeEffects).toEqual([
      { ...ownedEffect, mode: "disadvantage" },
    ]);
  });

  test("ticks duration effects and tears down an expired concentration source", () => {
    const state = fighterVsGoblinBattle();
    const fighter = state.combatants.get(fighterId);
    const goblin = state.combatants.get(goblinId);
    if (fighter === undefined || goblin === undefined) {
      throw new Error("Expected the fighter and goblin combatants.");
    }
    const tickingSourceProcedureRef = battleProcedureExecutionRefForTest(
      "ticking-duration-source",
    );
    const concentrationSourceProcedureRef = battleProcedureExecutionRefForTest(
      "expiring-concentration-source",
    );
    const tickingEffect = {
      kind: "nextAttackRollBySelf" as const,
      sourceProcedureRef: tickingSourceProcedureRef,
      sourceCombatantId: fighterId,
      mode: "advantage" as const,
      expiresAt: {
        kind: "duration" as const,
        durationTicks: elapsedTimeTicks(2),
      },
    } as const;
    const expiringConcentrationEffect = {
      kind: "speedDelta" as const,
      sourceProcedureRef: concentrationSourceProcedureRef,
      sourceCombatantId: fighterId,
      deltaFeet: movementDeltaFeet(10),
      expiresAt: {
        kind: "concentration" as const,
        combatantId: fighterId,
        durationTicks: elapsedTimeTicks(1),
      },
    } as const;
    const stateWithConcentration: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(fighterId, {
        ...fighter,
        concentration: {
          sourceProcedureRef: concentrationSourceProcedureRef,
          effectKind: "spellEffect",
        },
      }),
    };
    const allocated = battleStateWithAllocatedEffectOccurrencesForTest({
      state: stateWithConcentration,
      occurrences: [tickingEffect, expiringConcentrationEffect].map(
        (effect) => ({
          kind: "activeEffect" as const,
          ownerId: goblinId,
          effect,
        }),
      ),
    });
    const [allocatedTicking] = allocated.occurrences;
    if (allocatedTicking?.kind !== "activeEffect") {
      throw new Error("Expected the allocated ticking occurrence.");
    }
    const ticked = tickDurationEffects(allocated.state.combatants);
    expect(ticked.value.get(goblinId)?.activeEffects).toEqual([
      {
        ...allocatedTicking.effect,
        expiresAt: {
          kind: "duration",
          durationTicks: elapsedTimeTicks(1),
        },
      },
    ]);
    expect(ticked.value.get(fighterId)?.concentration).toBeNull();
    expect(ticked.flySpeedGrantEndFallCleanupFrames).toEqual([]);
  });

  test("duration expiry preserves a knocked-out target while ending its caster's concentration", () => {
    const state = startBattleRight({
      battleId: battleId("battle-knockout-duration-expiry"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Synthetic Caster",
          initiative: 20,
          attack: null,
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Knocked-Out Target",
          initiative: 10,
          currentHp: 1,
          conditions: ["unconscious"],
          positiveHpUnconscious: KNOCKED_OUT_UNCONSCIOUS,
          attack: null,
        }),
      ],
    });
    const caster = state.combatants.get(wizardId);
    const target = state.combatants.get(fighterId);
    if (caster === undefined || target === undefined) {
      throw new Error("Expected the caster and knocked-out target.");
    }
    const sourceProcedureRef = battleProcedureExecutionRefForTest(
      "knockout-duration-expiry",
    );
    const effect = {
      kind: "speedDelta" as const,
      sourceProcedureRef,
      sourceCombatantId: wizardId,
      deltaFeet: movementDeltaFeet(10),
      expiresAt: {
        kind: "concentration" as const,
        combatantId: wizardId,
        durationTicks: elapsedTimeTicks(1),
      },
    } as const;
    const stateWithConcentration: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(wizardId, {
        ...caster,
        concentration: { sourceProcedureRef, effectKind: "spellEffect" },
      }),
    };
    const allocated = battleStateWithAllocatedEffectOccurrencesForTest({
      state: stateWithConcentration,
      occurrences: [{ kind: "activeEffect", ownerId: fighterId, effect }],
    });

    const expired = tickDurationEffects(allocated.state.combatants).value;

    expect(expired.get(wizardId)?.concentration).toBeNull();
    expect(expired.get(fighterId)).toMatchObject({
      hp: 1,
      positiveHpUnconscious: KNOCKED_OUT_UNCONSCIOUS,
      activeEffects: [],
    });
    expect(expired.get(fighterId)?.conditions).toEqual(target.conditions);
  });

  test("starting a new turn refreshes spell reduction and jump use markers", () => {
    const state = startBattleRight({
      battleId: battleId("battle-turn-start-spell-use-refresh"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Synthetic Caster",
          initiative: 20,
          attack: null,
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Allied Target",
          initiative: 10,
          attack: null,
        }),
      ],
    });
    const caster = state.combatants.get(wizardId);
    const target = state.combatants.get(fighterId);
    if (caster === undefined || target === undefined) {
      throw new Error("Expected the caster and incoming allied target.");
    }
    const resistanceProcedureRef = battleProcedureExecutionRefForTest(
      "turn-start-marker-refresh",
    );
    const jumpProcedureRef = battleProcedureExecutionRefForTest(
      "turn-start-jump-refresh",
    );
    const activeEffects = [
      {
        kind: "spellDamageReduction" as const,
        sourceProcedureRef: resistanceProcedureRef,
        sourceCombatantId: wizardId,
        damageType: "slashing" as const,
        amount: { dice: 1 as const, dieSize: 4 as const },
        usedThisTurn: true,
        expiresAt: {
          kind: "concentration" as const,
          combatantId: wizardId,
        },
      },
      {
        kind: "jumpMovementReplacement" as const,
        sourceProcedureRef: jumpProcedureRef,
        sourceCombatantId: wizardId,
        movementCostFeet: movementFeet(10),
        maxJumpDistanceFeet: movementFeet(30),
        usedThisTurn: true,
        expiresAt: {
          kind: "duration" as const,
          durationTicks: elapsedTimeTicks(10),
        },
      },
    ] as const;
    const stateWithConcentration: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(wizardId, {
        ...caster,
        concentration: {
          sourceProcedureRef: resistanceProcedureRef,
          effectKind: "spellEffect",
        },
      }),
    };
    const allocated = battleStateWithAllocatedEffectOccurrencesForTest({
      state: stateWithConcentration,
      occurrences: activeEffects.map((effect) => ({
        kind: "activeEffect" as const,
        ownerId: fighterId,
        effect,
      })),
    });
    const allocatedEffects = allocated.occurrences.flatMap((occurrence) =>
      occurrence.kind === "activeEffect" ? [occurrence.effect] : [],
    );

    const result = resolveEndTurnCommand({
      state: allocated.state,
      subject: {
        tag: "runtimeCommand",
        actorId: wizardId,
        command: "endTurn",
      },
      fills: [],
    });

    expect(result.tag).toBe("resolved");
    if (result.tag !== "resolved") return;
    expect(result.state.combatants.get(fighterId)?.activeEffects).toEqual([
      { ...allocatedEffects[0], usedThisTurn: false },
      { ...allocatedEffects[1], usedThisTurn: false },
    ]);
  });

  test("resolves a reachable sleep repeat-save frontier at turn end", () => {
    const state = goblinTurnBattle();
    const fighter = state.combatants.get(fighterId);
    const goblin = state.combatants.get(goblinId);
    if (fighter === undefined || goblin === undefined) {
      throw new Error("Expected the source and current goblin actor.");
    }
    const sourceProcedureRef = battleProcedureExecutionRefForTest(
      "sleep-repeat-source",
    );
    const pendingSleep = {
      kind: "sleepPendingRepeatSave" as const,
      effectRef: battleEffectExecutionRefForTest("pending-sleep-transition"),
      sourceProcedureRef,
      sourceCombatantId: fighterId,
      conditionHadNonSpellSource: false,
      save: {
        ability: "wis" as const,
        dc: { kind: "fixed" as const, dc: difficultyClass(12) },
      },
      repeatAt: {
        kind: "endOfTurn" as const,
        combatantId: goblinId,
        round: state.initiative.round,
      },
      expiresAt: {
        kind: "concentration" as const,
        combatantId: fighterId,
      },
    } as const satisfies BattleActiveEffect;
    const sleepingState: BattleState = {
      ...state,
      combatants: new Map(state.combatants)
        .set(fighterId, {
          ...fighter,
          concentration: { sourceProcedureRef, effectKind: "spellEffect" },
        })
        .set(goblinId, {
          ...goblin,
          activeEffects: [pendingSleep],
        }),
    };
    const subject = {
      tag: "runtimeCommand" as const,
      actorId: goblinId,
      command: "endTurn" as const,
    };
    const frontier = resolveEndTurnCommand({
      state: sleepingState,
      subject,
      fills: [],
    });
    expect(frontier.tag).toBe("needsHoles");
    if (frontier.tag !== "needsHoles") return;
    const saveHole = frontier.holes.find(
      (hole) => hole.kind === "savingThrowOutcome" && "sleepRepeatSave" in hole,
    );
    if (saveHole === undefined) {
      throw new Error("Expected the sleep repeat-save hole.");
    }
    const succeeded = resolveEndTurnCommand({
      state: sleepingState,
      subject,
      fills: [
        savingThrowOutcomeFill(saveHole, [
          { targetId: goblinId, succeeded: true },
        ]),
      ],
    });
    expect(succeeded.tag).toBe("resolved");
    if (succeeded.tag !== "resolved") return;
    expect(succeeded.state.combatants.get(goblinId)?.activeEffects).toEqual([]);

    const failed = resolveEndTurnCommand({
      state: sleepingState,
      subject,
      fills: [
        savingThrowOutcomeFill(saveHole, [
          { targetId: goblinId, succeeded: false },
        ]),
      ],
    });
    expect(failed.tag).toBe("resolved");
    if (failed.tag !== "resolved") return;
    expect(failed.state.combatants.get(goblinId)?.activeEffects).toEqual([
      expect.objectContaining({
        kind: "sleepUnconscious",
        effectRef: pendingSleep.effectRef,
      }),
    ]);
  });

  test("requests a damage disposition when turn-end damage drops the actor to zero HP", () => {
    const acidArrow = spellRecord(acidArrowUnitId);
    const enduranceUnit = unitLibrary.requireUnit(orcRelentlessEnduranceUnitId);
    const session = spellBattle({
      preparedSpells: [acidArrow],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "wizard", level: classLevel(3) }],
      targetHp: 5,
      targetMaxHp: 12,
      targetResources: [{ unit: enduranceUnit }],
      targetUnitRefs: [
        {
          unit: enduranceUnit,
          supportProfiles: [ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE],
        },
      ],
    });
    const act = spellAct({
      session,
      spellId: acidArrowUnitId,
      slotLevel: 2,
    });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spellTargetFill(
      targetHole,
      acidArrowUnitId,
      spellCasterId,
      spellTargetId,
    );
    const attackHole = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const attackFill = attackRollFill(attackHole, {
      total: 18,
      naturalD20: 12,
    });
    const initialDamageHole = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [targetFill, attackFill],
      }),
      "rolledDice",
    );
    const cast = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        targetFill,
        attackFill,
        damageRollFillWithGroups(initialDamageHole, [[1, 1, 1, 1]]),
      ],
    });
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const casterTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    expect(casterTurn.tag).toBe("resolved");
    if (casterTurn.tag !== "resolved") return;
    const targetTurn = endTurn({
      state: casterTurn.state,
      actorId: spellTargetId,
    });
    expect(targetTurn.tag).toBe("needsHoles");
    if (targetTurn.tag !== "needsHoles") return;
    const laterDamageHole = requireResultHole(targetTurn, "rolledDice");
    expect(laterDamageHole).toMatchObject({
      spellTurnEndDamage: {
        targetId: spellTargetId,
        sourceProcedureRef: act.subject.procedureRef,
        damage: { expr: { dice: 2, dieSize: 4 }, damageType: "acid" },
      },
    });
    const laterDamageFill = damageRollFillWithGroups(laterDamageHole, [[1, 1]]);

    const target = casterTurn.state.combatants.get(spellTargetId);
    const checkpointEffect = target?.activeEffects.find(
      (effect) => effect.kind === "spellTurnEndDamage",
    );
    if (
      target === undefined ||
      checkpointEffect?.kind !== "spellTurnEndDamage"
    ) {
      throw new Error("Expected the exact turn-end damage occurrence.");
    }
    const { effectRef: checkpointEffectRef, ...replacementTemplate } =
      checkpointEffect;
    const withoutCheckpoint: BattleState = {
      ...casterTurn.state,
      combatants: new Map(casterTurn.state.combatants).set(spellTargetId, {
        ...target,
        activeEffects: target.activeEffects.filter(
          (effect) => effect.effectRef !== checkpointEffectRef,
        ),
      }),
    };
    const replacement = battleStateWithAllocatedEffectOccurrencesForTest({
      state: withoutCheckpoint,
      occurrences: [
        {
          kind: "activeEffect",
          ownerId: spellTargetId,
          effect: replacementTemplate,
        },
      ],
    });
    const replacementEffect = replacement.occurrences[0];
    if (replacementEffect?.kind !== "activeEffect") {
      throw new Error("Expected a replacement turn-end damage occurrence.");
    }
    const staleFillResult = endTurn({
      state: replacement.state,
      actorId: spellTargetId,
      fills: [laterDamageFill],
    });
    expect(staleFillResult).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "rolledDice",
          spellTurnEndDamage: {
            effectRef: replacementEffect.effect.effectRef,
          },
        },
      ],
    });
    if (staleFillResult.tag !== "needsHoles") {
      throw new Error("Expected the replacement occurrence's exact roll hole.");
    }
    expect(replacementEffect.effect.effectRef).not.toBe(checkpointEffectRef);
    expect(staleFillResult.state.combatants.get(spellTargetId)?.hp).toBe(
      target.hp,
    );

    const sameReferenceCloneState: BattleState = {
      ...casterTurn.state,
      combatants: new Map(casterTurn.state.combatants).set(spellTargetId, {
        ...target,
        activeEffects: target.activeEffects.map((effect) =>
          effect.effectRef === checkpointEffectRef ? { ...effect } : effect,
        ),
      }),
    };

    const awaitingDisposition = endTurn({
      state: sameReferenceCloneState,
      actorId: spellTargetId,
      fills: [laterDamageFill],
    });
    expect(awaitingDisposition.tag).toBe("needsHoles");
    if (awaitingDisposition.tag !== "needsHoles") return;
    expect(awaitingDisposition.holes).toEqual([
      expect.objectContaining({
        kind: "attackDamageDisposition",
        attackerId: spellCasterId,
        targetId: spellTargetId,
        choices: expect.arrayContaining([
          { kind: "ordinaryDamage" },
          expect.objectContaining({ kind: "zeroHitPointReplacement" }),
        ]),
      }),
    ]);
    const checkpointDispositionHole = requireResultHole(
      awaitingDisposition,
      "attackDamageDisposition",
    );
    expect(checkpointDispositionHole.damageOccurrence).toEqual({
      kind: "spellTurnEndDamage",
      effectRef: checkpointEffectRef,
    });
    assertBattleSnapshotCodecAcceptsHolesForSubjectForTest({
      snapshot: awaitingDisposition.snapshot,
      subject: awaitingDisposition.subject,
      holes: awaitingDisposition.holes,
    });
    const otherOwnerAllocation =
      battleStateWithAllocatedEffectOccurrencesForTest({
        state: sameReferenceCloneState,
        occurrences: [
          {
            kind: "activeEffect",
            ownerId: spellCasterId,
            effect: replacementTemplate,
          },
        ],
      });
    const otherOwnerOccurrence = otherOwnerAllocation.occurrences[0];
    if (otherOwnerOccurrence?.kind !== "activeEffect") {
      throw new Error("Expected another owner's live occurrence.");
    }
    const twoOwnerAwaitingDisposition = endTurn({
      state: otherOwnerAllocation.state,
      actorId: spellTargetId,
      fills: [laterDamageFill],
    });
    if (twoOwnerAwaitingDisposition.tag !== "needsHoles") {
      throw new Error("Expected the exact downstream disposition hole.");
    }
    const encodedDownstreamSnapshot = Schema.encodeSync(BattleSnapshotSchema)(
      twoOwnerAwaitingDisposition.snapshot,
    );
    const deferredDownstreamSnapshot = {
      ...encodedDownstreamSnapshot,
      acts: [
        {
          subject: twoOwnerAwaitingDisposition.subject,
          initialHoles: twoOwnerAwaitingDisposition.holes,
        },
      ],
    };
    const mutateDownstreamOccurrence = (
      mutation: "missing" | "forged" | "wrongOwner",
    ) => ({
      ...deferredDownstreamSnapshot,
      acts: deferredDownstreamSnapshot.acts.map((candidate) => ({
        ...candidate,
        initialHoles: candidate.initialHoles.map((hole) => {
          if (hole.kind !== "attackDamageDisposition") return hole;
          if (mutation === "missing") {
            const { damageOccurrence: _damageOccurrence, ...withoutSource } =
              hole;
            return withoutSource;
          }
          return {
            ...hole,
            damageOccurrence: {
              kind: "spellTurnEndDamage" as const,
              effectRef:
                mutation === "forged"
                  ? battleEffectExecutionRefForTest(
                      "forged-turn-end-downstream",
                    )
                  : otherOwnerOccurrence.effect.effectRef,
            },
          };
        }),
      })),
    });
    for (const mutation of ["missing", "forged", "wrongOwner"] as const) {
      expect(
        Result.isFailure(
          Schema.decodeUnknownResult(BattleSnapshotSchema)(
            mutateDownstreamOccurrence(mutation),
          ),
        ),
      ).toBe(true);
    }
    const replacementDamageHole = requireResultHole(
      staleFillResult,
      "rolledDice",
    );
    const replacementDamageFill = damageRollFillWithGroups(
      replacementDamageHole,
      [[1, 1]],
    );
    const replacementAwaitingDisposition = endTurn({
      state: replacement.state,
      actorId: spellTargetId,
      fills: [replacementDamageFill],
    });
    const replacementDispositionHole = requireResultHole(
      replacementAwaitingDisposition,
      "attackDamageDisposition",
    );
    expect(replacementDispositionHole.holeId).not.toBe(
      checkpointDispositionHole.holeId,
    );
    const staleDownstreamFillResult = endTurn({
      state: replacement.state,
      actorId: spellTargetId,
      fills: [
        replacementDamageFill,
        attackDamageDispositionFill(checkpointDispositionHole, {
          kind: "ordinaryDamage",
        }),
      ],
    });
    expect(staleDownstreamFillResult).toMatchObject({
      tag: "needsHoles",
      holes: [{ holeId: replacementDispositionHole.holeId }],
    });
  });

  test("recognizes the turn-boundary fill vocabulary", () => {
    expect(isEndTurnFillKind("savingThrowOutcome")).toBe(true);
    expect(isEndTurnFillKind("targetChoice")).toBe(false);
  });
});
