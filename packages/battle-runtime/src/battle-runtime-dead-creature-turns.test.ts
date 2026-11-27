// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.TURN_BOUNDARY_EFFECT_LIFECYCLE_ORDERING
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { difficultyClass, Hp, Round } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import type { BattleState } from "./battle-state-execution.ts";
import {
  battleId,
  characterSeed,
  combatantId,
  damageRollFillWithGroups,
  endTurn,
  fighterId,
  findHole,
  goblinId,
  requireHole,
  requireNeedsHoles,
  requireOrdinaryFrontierFromNeedsHoles,
  requireResolved,
  startBattleRight,
  statBlockCreatureInit,
} from "./battle-runtime.test-support.ts";
import { snapshotBattle } from "./battle-reducer/battle-snapshot.ts";
import { zeroHpLifecycleIsTerminal } from "./battle-reducer/creature-state-leaves.ts";
import { applyHpDamage } from "./battle-reducer/damage-apply.ts";
import { battleStateWithLowLevelSourceOwnedEffectOccurrenceForTest } from "./low-level-effect-occurrence.test-support.ts";

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

function requireCombatant(state: BattleState, id: typeof goblinId) {
  const combatant = state.combatants.get(id);
  if (combatant === undefined) {
    throw new Error("Expected the combatant.");
  }
  return combatant;
}

function withDyingCombatant(
  state: BattleState,
  id: typeof goblinId,
): BattleState {
  const combatant = requireCombatant(state, id);
  const dying = applyHpDamage(combatant, Number(combatant.hp), {
    deathFailuresAtZeroHp: 1,
  });
  if (Number(dying.hp) !== 0 || zeroHpLifecycleIsTerminal(dying)) {
    throw new Error("Expected the combatant to be dying.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(id, dying),
  };
}

function withDeadCombatant(
  state: BattleState,
  id: typeof goblinId,
): BattleState {
  const combatant = requireCombatant(state, id);
  // Damage at least the current Hit Points plus the maximum kills outright.
  const dead = applyHpDamage(
    combatant,
    Number(combatant.hp) + Number(combatant.maxHp),
    { deathFailuresAtZeroHp: 1 },
  );
  if (!zeroHpLifecycleIsTerminal(dead)) {
    throw new Error("Expected the combatant to be dead.");
  }
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

  test("what ends at the end of a dead creature's turn still ends when its turn passes", () => {
    const withEffect =
      battleStateWithLowLevelSourceOwnedEffectOccurrenceForTest({
        state: battleWithDeadGoblinBetween(),
        sourceCombatantId: allyId,
        ownerId: allyId,
        effect: {
          kind: "nextAttackRollBySelf",
          mode: "advantage",
          expiresAt: {
            kind: "endOfTurn",
            combatantId: goblinId,
            round: Round(1),
          },
        },
      });
    expect(
      requireCombatant(withEffect.state, allyId).activeEffects,
    ).toHaveLength(1);

    const result = requireResolved(
      endTurn({ state: withEffect.state, actorId: fighterId }),
    );

    expect(requireCombatant(result.state, allyId).activeEffects).toEqual([]);
  });

  test("End Turn passes several dead creatures in a row, into the next round", () => {
    const state: BattleState = {
      ...withDeadCombatant(battleWithDeadGoblinBetween(), allyId),
      helpAttacks: [
        {
          helperId: allyId,
          allyId: goblinId,
          targetEnemyId: fighterId,
          expiresAt: { kind: "startOfTurn", combatantId: allyId },
        },
      ],
    };

    const result = requireResolved(endTurn({ state, actorId: fighterId }));

    expect(result.snapshot).toMatchObject({
      currentActorId: fighterId,
      round: 2,
    });
    expect(result.state.helpAttacks).toEqual([]);
  });

  test("a dying creature at 0 Hit Points still takes its turn", () => {
    const state = withDyingCombatant(battleWithDeadGoblinBetween(), allyId);

    const result = endTurn({ state, actorId: fighterId });

    expect(requireHole(result, "deathSavingThrow")).toMatchObject({
      combatantId: allyId,
    });
    expect(
      requireOrdinaryFrontierFromNeedsHoles(requireNeedsHoles(result))
        .pendingProcedure,
    ).toMatchObject({ sourceTurn: { actorId: allyId, round: 1 } });
  });

  test("the last creature alive killed by its own end-of-turn damage leaves nobody to act", () => {
    const goblinFirst = withDeadCombatant(
      startBattleRight({
        battleId: battleId("battle-dead-creature-turns-last-one-dies"),
        combatants: [
          characterSeed({ initiative: 10 }),
          statBlockCreatureInit({ initiative: 20, currentHp: 1 }),
        ],
      }),
      fighterId,
    );
    const withDamage =
      battleStateWithLowLevelSourceOwnedEffectOccurrenceForTest({
        state: goblinFirst,
        sourceCombatantId: goblinId,
        ownerId: goblinId,
        effect: {
          kind: "spellTurnEndDamage",
          damage: { expr: { dice: 1, dieSize: 6 }, damageType: "fire" },
          expiresAt: {
            kind: "endOfTurn",
            combatantId: goblinId,
            round: Round(1),
          },
        },
      });

    // Damage due at the start of its next turn would be asked for if that
    // turn were taken.
    const withStartDamage =
      battleStateWithLowLevelSourceOwnedEffectOccurrenceForTest({
        state: withDamage.state,
        sourceCombatantId: goblinId,
        ownerId: goblinId,
        effect: {
          kind: "spellTurnStartDamageAndSave",
          source: "turnBoundaryEffectLifecycle",
          damage: { expr: { dice: 1, dieSize: 4 }, damageType: "fire" },
          save: {
            ability: "con",
            dc: { kind: "fixed", dc: difficultyClass(12) },
            successEnds: "spell",
          },
          expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(10) },
        },
      });

    const awaitingDamage = requireNeedsHoles(
      endTurn({ state: withStartDamage.state, actorId: goblinId }),
    );
    const damageHoles =
      requireOrdinaryFrontierFromNeedsHoles(awaitingDamage).holes;
    expect(damageHoles.map((hole) => hole.kind)).toEqual(["rolledDice"]);
    const result = requireResolved(
      endTurn({
        state: awaitingDamage.state,
        actorId: goblinId,
        fills: [
          damageRollFillWithGroups(findHole(damageHoles, "rolledDice"), [[6]]),
        ],
      }),
    );

    const goblin = requireCombatant(result.state, goblinId);
    expect(goblin.hp).toBe(Hp(0));
    expect(zeroHpLifecycleIsTerminal(goblin)).toBe(true);

    const nextEndTurn = requireResolved(
      endTurn({ state: result.state, actorId: goblinId }),
    );
    expect(nextEndTurn.state).toEqual(result.state);
  });
});
