import { Hp } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import type { BattleState } from "./battle-state-execution.ts";
import {
  battleId,
  characterSeed,
  combatantId,
  endTurn,
  fighterId,
  goblinId,
  requireResolved,
  startBattleRight,
  statBlockCreatureInit,
} from "./battle-runtime.test-support.ts";
import { snapshotBattle } from "./battle-reducer/battle-snapshot.ts";

const allyId = combatantId("ally");

function battleWithDeadGoblinBetween(): BattleState {
  const state = startBattleRight({
    battleId: battleId("battle-dead-creature-turns"),
    combatants: [
      characterSeed({ initiative: 20 }),
      statBlockCreatureInit({ initiative: 15 }),
      characterSeed({
        combatantId: allyId,
        displayName: "Ally Fighter",
        initiative: 10,
        attack: null,
      }),
    ],
  });
  return withDeadCombatant(state, goblinId);
}

function withDeadCombatant(
  state: BattleState,
  id: typeof goblinId,
): BattleState {
  const combatant = state.combatants.get(id);
  if (combatant === undefined) {
    throw new Error("Expected the combatant.");
  }
  const dead =
    combatant.zeroHpLifecycle.policy === "diesAtZeroHp"
      ? { ...combatant, hp: Hp(0) }
      : {
          ...combatant,
          hp: Hp(0),
          zeroHpLifecycle: {
            ...combatant.zeroHpLifecycle,
            deathSaves: { tag: "dead" as const },
          },
        };
  return {
    ...state,
    combatants: new Map(state.combatants).set(id, dead),
  };
}

describe("dead creatures' turns", () => {
  test("End Turn passes over a dead creature to the next one alive", () => {
    const state = battleWithDeadGoblinBetween();

    const result = requireResolved(endTurn({ state, actorId: fighterId }));

    expect(result.snapshot).toMatchObject({
      currentActorId: allyId,
      round: 1,
      turnOrder: [fighterId, goblinId, allyId],
    });
  });

  test("what ends at the start of a dead creature's turn still ends when its turn passes", () => {
    const state: BattleState = {
      ...battleWithDeadGoblinBetween(),
      helpAttacks: [
        {
          helperId: goblinId,
          allyId,
          targetEnemyId: fighterId,
          expiresAt: { kind: "startOfTurn", combatantId: goblinId },
        },
      ],
    };

    const result = requireResolved(endTurn({ state, actorId: fighterId }));

    expect(result.state.helpAttacks).toEqual([]);
  });

  test("the only creature alive takes the next turn, in the next round", () => {
    const state = withDeadCombatant(
      startBattleRight({
        battleId: battleId("battle-dead-creature-turns-alone"),
        combatants: [
          characterSeed({ initiative: 20 }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
      goblinId,
    );

    const result = requireResolved(endTurn({ state, actorId: fighterId }));

    expect(result.snapshot).toMatchObject({
      currentActorId: fighterId,
      round: 2,
      turn: {
        actionResources: [{ kind: "action", source: "turn" }],
        bonusActionQuotaAvailable: true,
      },
    });
  });

  test("with nobody alive, End Turn leaves the order where it is", () => {
    const state = withDeadCombatant(
      withDeadCombatant(battleWithDeadGoblinBetween(), fighterId),
      allyId,
    );

    const result = requireResolved(endTurn({ state, actorId: fighterId }));

    expect(result.state).toEqual(state);
    expect(result.snapshot).toEqual(snapshotBattle(state));
    expect(result.snapshot).toMatchObject({
      currentActorId: fighterId,
      round: 1,
    });
  });
});
