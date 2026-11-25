// KERNEL-COVERAGE: parity-witness BATTLE.MOVEMENT.SPEED_COLLECTOR
import { abilityScore } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import {
  battleId,
  battleObjectId,
  characterSeed,
  fighterGrapplesGoblin,
  fighterId,
  fighterVsGoblinBattle,
  goblinId,
  heavyArmorClassState,
  longswordWeaponMasterySelections,
  movementDeltaFeet,
  movementFeet,
  startBattleRight,
  statBlockCreatureInit,
  tacticalMasterReplacementUnitRefs,
  testCharacterD20Statistics,
  testDaggerAttack,
  wizardId,
  type BattleState,
  type CombatantId,
} from "./battle-runtime.test-support.ts";
import { allocateBattleEffectOccurrenceForCreature } from "./effect-execution-ref.ts";
import { effectiveWalkSpeed } from "./battle-reducer/movement-speed.ts";
import { speedContributions } from "./battle-reducer/speed-collector.ts";
import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import type { BattleCreatureState } from "./battle-state-execution.ts";

function requireCreature(
  state: BattleState,
  combatantId: CombatantId,
): BattleCreatureState {
  const creature = state.combatants.get(combatantId);
  if (creature === undefined) {
    throw new Error(`Expected combatant ${combatantId}.`);
  }
  return creature;
}

function fighterSlowProcedureRef(state: BattleState) {
  const fighter = requireCreature(state, fighterId);
  if (fighter.origin.kind !== "character") {
    throw new Error("Expected the fighter character.");
  }
  const binding = fighter.origin.execution.procedureBindings.find(
    (candidate) =>
      candidate.procedure.kind === "unitSupportProfile" &&
      candidate.procedure.execution === "weaponMasterySlow",
  );
  if (binding === undefined) {
    throw new Error("Expected the fighter's Slow procedure.");
  }
  return binding.procedureRef;
}

function slowCapableBattle(): BattleState {
  return fighterVsGoblinBattle({
    characterUnitRefs: tacticalMasterReplacementUnitRefs(),
    weaponMasteries: longswordWeaponMasterySelections(),
  });
}

/** Slow from one attacker: -10 ft until the start of that attacker's turn. */
function withSlowFrom(
  state: BattleState,
  targetId: CombatantId,
  attackerId: CombatantId,
): BattleState {
  const allocation = allocateBattleEffectOccurrenceForCreature({
    owner: requireCreature(state, targetId),
    effect: {
      kind: "weaponMasterySpeedReduction",
      sourceProcedureRef: fighterSlowProcedureRef(state),
      sourceCombatantId: attackerId,
      reductionFeet: movementFeet(10),
      expiresAt: { kind: "startOfTurn", combatantId: attackerId },
    },
  });
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...allocation.owner,
      activeEffects: [...allocation.owner.activeEffects, allocation.effect],
    }),
  };
}

function armoredFighterBattle(strength: number): BattleState {
  return startBattleRight({
    battleId: battleId(`speed-collector-heavy-armor-str-${strength}`),
    combatants: [
      characterSeed({
        initiative: 20,
        armorClass: heavyArmorClassState(),
        d20Statistics: testCharacterD20Statistics({ str: strength }),
        selectedLoadout: {
          armor: {
            itemId: battleObjectId("armor:equipment_chain_mail"),
            unitId: parseSharedUnitId("equipment_chain_mail"),
            strengthRequirement: abilityScore(13),
          },
          weapon: {
            itemId: battleObjectId("main:weapon_dagger"),
            unitId: parseSharedUnitId("weapon_dagger"),
            grip: "one_handed",
          },
        },
        attack: testDaggerAttack(),
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

describe("Speed collector", () => {
  test("Slow from two attackers reduces Speed by 10 feet, not 20", () => {
    const base = slowCapableBattle();
    const oneSlow = withSlowFrom(base, goblinId, fighterId);
    const twoSlows = withSlowFrom(oneSlow, goblinId, wizardId);
    const goblin = requireCreature(twoSlows, goblinId);

    expect(
      goblin.activeEffects.filter(
        (effect) => effect.kind === "weaponMasterySpeedReduction",
      ),
    ).toHaveLength(2);
    expect(
      effectiveWalkSpeed(oneSlow, requireCreature(oneSlow, goblinId)),
    ).toBe(20);
    expect(effectiveWalkSpeed(twoSlows, goblin)).toBe(20);
    expect(speedContributions(twoSlows, goblin)).toEqual([
      {
        role: "delta",
        source: "weaponMasterySlow",
        deltaFeet: movementDeltaFeet(-10),
      },
    ]);
  });

  test("heavy armor reduces Speed by 10 feet below its Strength requirement", () => {
    const weak = armoredFighterBattle(10);
    const weakFighter = requireCreature(weak, fighterId);
    expect(effectiveWalkSpeed(weak, weakFighter)).toBe(20);
    expect(speedContributions(weak, weakFighter)).toEqual([
      {
        role: "delta",
        source: "heavyArmorStrength",
        deltaFeet: movementDeltaFeet(-10),
      },
    ]);

    const strong = armoredFighterBattle(13);
    const strongFighter = requireCreature(strong, fighterId);
    expect(effectiveWalkSpeed(strong, strongFighter)).toBe(30);
    expect(speedContributions(strong, strongFighter)).toEqual([]);
  });

  test("a grapple link holds the target's Speed at 0", () => {
    const grappled = fighterGrapplesGoblin(fighterVsGoblinBattle());
    const goblin = requireCreature(grappled.state, goblinId);

    expect(effectiveWalkSpeed(grappled.state, goblin)).toBe(0);
    expect(speedContributions(grappled.state, goblin)).toEqual([
      { role: "zero", source: "grappleLink" },
    ]);
  });
});
