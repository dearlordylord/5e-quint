import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import {
  battleId,
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectOccurrencesForTest,
  characterSeed,
  fighterId,
  fighterVsGoblinBattle,
  goblinId,
  resource,
  startBattleRight,
  wizardId,
} from "../battle-runtime.test-support.ts";
import type { BattleState } from "../battle-state-execution.ts";
import { characterBattleResourceIsUseCount } from "../character-battle-resource-execution.ts";
import { END_OF_NEXT_TURN_DURING_TURN } from "./spell-end-target-state.ts";
import {
  resolveEndTurnCommand,
  tickBattleStateDurationEffects,
  tickDurationEffects,
} from "./turn-boundary-lifecycle.ts";
import { currentActorId } from "./creature-state-leaves.ts";

describe("turn-boundary lifecycle SR-04 coverage", () => {
  test("ticks only the selected duration cohort", () => {
    const state = fighterVsGoblinBattle();
    const selected = {
      kind: "nextAttackRollBySelf" as const,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "sr04-selected-duration",
      ),
      sourceCombatantId: fighterId,
      mode: "advantage" as const,
      expiresAt: {
        kind: "duration" as const,
        durationTicks: elapsedTimeTicks(2),
      },
    };
    const retained = {
      kind: "nextAttackRollBySelf" as const,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "sr04-retained-duration",
      ),
      sourceCombatantId: fighterId,
      mode: "disadvantage" as const,
      expiresAt: {
        kind: "duration" as const,
        durationTicks: elapsedTimeTicks(2),
      },
    };
    const allocated = battleStateWithAllocatedEffectOccurrencesForTest({
      state,
      occurrences: [
        { kind: "activeEffect", ownerId: goblinId, effect: selected },
        { kind: "activeEffect", ownerId: goblinId, effect: retained },
      ],
    });
    const selectedOccurrence = allocated.occurrences[0];
    const retainedOccurrence = allocated.occurrences[1];
    if (
      selectedOccurrence?.kind !== "activeEffect" ||
      retainedOccurrence?.kind !== "activeEffect"
    ) {
      throw new Error("Expected two allocated active-effect occurrences.");
    }

    const ticked = tickDurationEffects(
      allocated.state.combatants,
      undefined,
      new Set([selectedOccurrence.effect.effectRef]),
    );

    expect(ticked.value.get(goblinId)?.activeEffects).toEqual([
      {
        ...selectedOccurrence.effect,
        expiresAt: {
          kind: "duration",
          durationTicks: elapsedTimeTicks(1),
        },
      },
      retainedOccurrence.effect,
    ]);
    expect(ticked.grantedFlightEndFallCleanupFrames).toEqual([]);
    expect(ticked.spellEndTargetStatePromotionIds).toEqual([]);
  });

  test("promotes an expiring spell-end target state during a contextual tick", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sr04-spell-end-state-promotion"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Synthetic Caster",
          initiative: 20,
          attack: null,
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Synthetic Target",
          initiative: 10,
          attack: null,
        }),
      ],
    });
    const caster = state.combatants.get(wizardId);
    const target = state.combatants.get(fighterId);
    if (caster === undefined || target === undefined) {
      throw new Error("Expected the synthetic caster and target.");
    }
    const sourceProcedureRef = battleProcedureExecutionRefForTest(
      "sr04-spell-end-state",
    );
    const spellEndTargetState = {
      kind: "spellEndTargetState" as const,
      sourceProcedureRef,
      sourceCombatantId: wizardId,
      condition: "incapacitated" as const,
      expiresAt: {
        kind: "concentration" as const,
        combatantId: wizardId,
        durationTicks: elapsedTimeTicks(1),
      },
    };
    const allocated = battleStateWithAllocatedEffectOccurrencesForTest({
      state: {
        ...state,
        combatants: new Map(state.combatants).set(wizardId, {
          ...caster,
          concentration: {
            sourceProcedureRef,
            effectKind: "spellEffect",
          },
        }),
      },
      occurrences: [
        {
          kind: "activeEffect",
          ownerId: fighterId,
          effect: spellEndTargetState,
        },
      ],
    });

    const ticked = tickBattleStateDurationEffects(allocated.state, {
      spellEndTargetStatePromotionTiming: END_OF_NEXT_TURN_DURING_TURN,
    });
    const promotedTarget = ticked.value.combatants.get(fighterId);

    expect(ticked.spellEndTargetStatePromotionIds).toEqual([fighterId]);
    expect(promotedTarget?.activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "spellCondition",
          condition: "incapacitated",
          expiresAt: expect.objectContaining({
            kind: "endOfTurn",
            combatantId: fighterId,
          }),
        }),
        expect.objectContaining({
          kind: "spellSpeedZero",
          expiresAt: expect.objectContaining({
            kind: "endOfTurn",
            combatantId: fighterId,
          }),
        }),
      ]),
    );
    expect(
      promotedTarget?.activeEffects.some(
        (effect) => effect.kind === "spellEndTargetState",
      ),
    ).toBe(false);
    expect(ticked.value.combatants.get(wizardId)?.concentration).toBeNull();
  });

  test("resets the next character's turn state and per-turn resource", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sr04-character-turn-reset"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Synthetic Caster",
          initiative: 20,
          attack: null,
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Synthetic Fighter",
          initiative: 10,
          attack: null,
          resources: [resource()],
        }),
      ],
    });
    const fighter = state.combatants.get(fighterId);
    if (fighter?.origin.kind !== "character") {
      throw new Error("Expected the next actor to be a character.");
    }
    const spentResources = fighter.origin.resources.map((candidate) =>
      characterBattleResourceIsUseCount(candidate)
        ? { ...candidate, usedThisTurn: true }
        : candidate,
    );
    const stateBeforeEndTurn: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(fighterId, {
        ...fighter,
        dodging: true,
        reactionAvailable: false,
        movementSpentFeet: movementFeet(15),
        origin: {
          ...fighter.origin,
          resources: spentResources,
        },
      }),
    };

    const result = resolveEndTurnCommand({
      state: stateBeforeEndTurn,
      subject: {
        tag: "runtimeCommand",
        actorId: wizardId,
        command: "endTurn",
      },
      fills: [],
    });

    expect(result.tag).toBe("resolved");
    if (result.tag !== "resolved") return;
    expect(currentActorId(result.state)).toBe(fighterId);
    const resetFighter = result.state.combatants.get(fighterId);
    if (resetFighter?.origin.kind !== "character") {
      throw new Error("Expected the resolved next actor to be a character.");
    }
    expect(resetFighter).toMatchObject({
      dodging: false,
      reactionAvailable: true,
      movementSpentFeet: movementFeet(0),
      attackRollMissToHitReplacementsUsedSinceTurnStart: [],
    });
    expect(resetFighter.origin.resources).toEqual(
      spentResources.map((candidate) =>
        characterBattleResourceIsUseCount(candidate)
          ? { ...candidate, usedThisTurn: false }
          : candidate,
      ),
    );
  });
});
