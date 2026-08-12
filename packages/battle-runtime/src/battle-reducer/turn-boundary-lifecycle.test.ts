import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  difficultyClass,
  movementDeltaFeet,
  movementFeet,
} from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import {
  battleActiveEffectExecutionRefForTest,
  battleId,
  battleProcedureExecutionRefForTest,
  characterSeed,
  fighterId,
  fighterVsGoblinBattle,
  goblinTurnBattle,
  goblinId,
  KNOCKED_OUT_UNCONSCIOUS,
  savingThrowOutcomeFill,
  startBattleRight,
  wizardId,
} from "../battle-runtime.test-support.ts";
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
    const staleOccurrence = { ...ownedEffect };

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
    } as const satisfies BattleActiveEffect;
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
    } as const satisfies BattleActiveEffect;
    const stateWithEffects: BattleState = {
      ...state,
      combatants: new Map(state.combatants)
        .set(fighterId, {
          ...fighter,
          concentration: {
            sourceProcedureRef: concentrationSourceProcedureRef,
            effectKind: "spellEffect",
          },
        })
        .set(goblinId, {
          ...goblin,
          activeEffects: [tickingEffect, expiringConcentrationEffect],
        }),
    };
    const ticked = tickDurationEffects(stateWithEffects.combatants);
    expect(ticked.value.get(goblinId)?.activeEffects).toEqual([
      {
        ...tickingEffect,
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
    } as const satisfies BattleActiveEffect;
    const combatants = new Map(state.combatants)
      .set(wizardId, {
        ...caster,
        concentration: { sourceProcedureRef, effectKind: "spellEffect" },
      })
      .set(fighterId, { ...target, activeEffects: [effect] });

    const expired = tickDurationEffects(combatants).value;

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
        effectRef: battleActiveEffectExecutionRefForTest(
          "turn-start-jump-refresh",
        ),
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
    ] as const satisfies readonly BattleActiveEffect[];
    const stateWithUsedMarkers: BattleState = {
      ...state,
      combatants: new Map(state.combatants)
        .set(wizardId, {
          ...caster,
          concentration: {
            sourceProcedureRef: resistanceProcedureRef,
            effectKind: "spellEffect",
          },
        })
        .set(fighterId, { ...target, activeEffects }),
    };

    const result = resolveEndTurnCommand({
      state: stateWithUsedMarkers,
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
      { ...activeEffects[0], usedThisTurn: false },
      { ...activeEffects[1], usedThisTurn: false },
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
      expect.objectContaining({ kind: "sleepUnconscious" }),
    ]);
  });

  test("recognizes the turn-boundary fill vocabulary", () => {
    expect(isEndTurnFillKind("savingThrowOutcome")).toBe(true);
    expect(isEndTurnFillKind("targetChoice")).toBe(false);
  });
});
