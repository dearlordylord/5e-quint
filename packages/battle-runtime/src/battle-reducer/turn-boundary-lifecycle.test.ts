import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { difficultyClass, movementDeltaFeet } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import {
  battleProcedureExecutionRefForTest,
  fighterId,
  fighterVsGoblinBattle,
  goblinTurnBattle,
  goblinId,
  savingThrowOutcomeFill,
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
