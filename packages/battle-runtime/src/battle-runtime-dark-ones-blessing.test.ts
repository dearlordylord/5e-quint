// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.enemy-zero-hit-point-temporary-hit-points
import { describe, expect, test } from "vitest";

import { Hp, movementFeet } from "@dnd/shared/types";

import {
  applyBattleHitPointDamage,
  battleId,
  characterSeed,
  combatantId,
  partySide,
  startBattleRight,
  statBlockCreatureInit,
  testCharacterD20Statistics,
  type BattleState,
  type CombatantId,
  unitLibrary,
} from "./battle-runtime-test-support.ts";
import type { BattleTargetSpatialFact } from "./battle-reducer.ts";
import { applyPreparedSlotSpellDamage } from "./battle-reducer/spells-damage-fills.ts";
import { applyChainedSpellDamage } from "./battle-reducer/spells-resolve-chained.ts";
import { battleEnemyZeroHitPointTemporaryHitPointsSupportForUnit } from "./unit-feature-support.ts";

type DarkOnesBlessingSupportProfile = Exclude<
  ReturnType<typeof battleEnemyZeroHitPointTemporaryHitPointsSupportForUnit>,
  null | "unsupported"
>;

const warlockId = combatantId("dark-ones-blessing-warlock");
const allyId = combatantId("dark-ones-blessing-ally");
const enemyId = combatantId("dark-ones-blessing-enemy");
const otherEnemyId = combatantId("dark-ones-blessing-other-enemy");
const unitId = "warlock_dark_ones_blessing";
const unit = unitLibrary.requireUnit(unitId);
const supportProfile = requireDarkOnesBlessingSupportProfile();

describe("Dark One's Blessing zero-HP Temporary Hit Points", () => {
  test("grants Temporary Hit Points when the Warlock reduces an enemy to 0 Hit Points", () => {
    const result = damageEnemyToZero({
      damageSourceId: warlockId,
      targetId: enemyId,
      warlockCha: 16,
      warlockLevel: 3,
    });

    expect(tempHp(result, warlockId)).toBe(6);
  });

  test("grants Temporary Hit Points when another creature reduces an enemy within 10 feet to 0 Hit Points", () => {
    const result = damageEnemyToZero({
      damageSourceId: allyId,
      targetId: enemyId,
      warlockCha: 16,
      warlockLevel: 3,
      spatialFacts: [darkOnesBlessingRangeFact(allyId, enemyId)],
    });

    expect(tempHp(result, warlockId)).toBe(6);
  });

  test("grants Temporary Hit Points when the damage source is not an enemy of the defeated target", () => {
    const result = damageEnemyToZero({
      damageSourceId: otherEnemyId,
      targetId: enemyId,
      warlockCha: 16,
      warlockLevel: 3,
      spatialFacts: [darkOnesBlessingRangeFact(otherEnemyId, enemyId)],
    });

    expect(tempHp(result, warlockId)).toBe(6);
  });

  test("prepared-slot spell damage threads source and range facts into zero-HP awards", () => {
    const state = darkOnesBlessingBattle({
      warlockCha: 16,
      warlockLevel: 3,
    });
    const result = applyPreparedSlotSpellDamage(state, enemyId, 5, {
      damageSourceId: allyId,
      spatialFacts: [darkOnesBlessingRangeFact(allyId, enemyId)],
    });

    expect(tempHp(result, warlockId)).toBe(6);
  });

  test("chained spell damage threads the caster as damage source into zero-HP awards", () => {
    const state = darkOnesBlessingBattle({
      warlockCha: 16,
      warlockLevel: 3,
    });
    const result = applyChainedSpellDamage(state, enemyId, 5, false, {
      concentrationSavingThrow: undefined,
      damageDisposition: { kind: "ordinaryDamage" },
      wardingBondDamageShareConcentrationSavingThrows: [],
      hideousLaughterDamageRepeatSaves: [],
      damageSourceId: warlockId,
      spatialFacts: [],
    });

    expect(tempHp(result, warlockId)).toBe(6);
  });

  test("rejects another creature's zero-HP event without the 10-foot range fact", () => {
    const result = damageEnemyToZero({
      damageSourceId: allyId,
      targetId: enemyId,
      warlockCha: 16,
      warlockLevel: 3,
    });

    expect(tempHp(result, warlockId)).toBe(0);
  });

  test("rejects non-enemy zero-HP events", () => {
    const result = damageEnemyToZero({
      damageSourceId: allyId,
      targetId: otherEnemyId,
      warlockCha: 16,
      warlockLevel: 3,
      targetSide: partySide,
      spatialFacts: [darkOnesBlessingRangeFact(allyId, otherEnemyId)],
    });

    expect(tempHp(result, warlockId)).toBe(0);
  });

  test("applies the minimum Temporary Hit Point amount", () => {
    const result = damageEnemyToZero({
      damageSourceId: warlockId,
      targetId: enemyId,
      warlockCha: 1,
      warlockLevel: 3,
    });

    expect(tempHp(result, warlockId)).toBe(1);
  });

  test("uses ordinary Temporary Hit Point replacement behavior", () => {
    const lowerAward = damageEnemyToZero({
      damageSourceId: warlockId,
      targetId: enemyId,
      warlockCha: 16,
      warlockLevel: 3,
      warlockTempHp: 8,
    });
    const higherAward = damageEnemyToZero({
      damageSourceId: warlockId,
      targetId: enemyId,
      warlockCha: 18,
      warlockLevel: 5,
      warlockTempHp: 4,
    });

    expect(tempHp(lowerAward, warlockId)).toBe(8);
    expect(tempHp(higherAward, warlockId)).toBe(9);
  });
});

function damageEnemyToZero(input: {
  readonly damageSourceId: CombatantId;
  readonly targetId: CombatantId;
  readonly warlockCha: number;
  readonly warlockLevel: number;
  readonly warlockTempHp?: number;
  readonly targetSide?: typeof partySide;
  readonly spatialFacts?: readonly BattleTargetSpatialFact[];
}): BattleState {
  const state = darkOnesBlessingBattle(input);
  const target = state.combatants.get(input.targetId);
  if (target === undefined) {
    throw new Error("Dark One's Blessing test target must exist.");
  }
  return applyBattleHitPointDamage({
    state,
    target,
    damageAmount: 5,
    deathFailuresAtZeroHp: 1,
    damageSourceId: input.damageSourceId,
    spatialFacts: input.spatialFacts ?? [],
  });
}

function darkOnesBlessingBattle(input: {
  readonly warlockCha: number;
  readonly warlockLevel: number;
  readonly warlockTempHp?: number;
  readonly targetSide?: typeof partySide;
}): BattleState {
  return startBattleRight({
    battleId: battleId("dark-ones-blessing-battle"),
    combatants: [
      characterSeed({
        combatantId: warlockId,
        displayName: "Warlock",
        initiative: 20,
        classLevels: [{ className: "warlock", level: input.warlockLevel }],
        characterUnitRefs: [
          {
            unitId,
            supportProfiles: [supportProfile],
          },
        ],
        unitFeatures: [{ unit }],
        d20Statistics: testCharacterD20Statistics({ cha: input.warlockCha }),
        tempHp: input.warlockTempHp ?? 0,
      }),
      characterSeed({
        combatantId: allyId,
        displayName: "Ally",
        initiative: 15,
        side: partySide,
      }),
      statBlockCreatureInit({
        combatantId: enemyId,
        initiative: 10,
        currentHp: 5,
      }),
      statBlockCreatureInit({
        combatantId: otherEnemyId,
        initiative: 5,
        currentHp: 5,
      }),
    ].map((combatant) =>
      combatant.combatantId === otherEnemyId && input.targetSide !== undefined
        ? { ...combatant, side: input.targetSide }
        : combatant,
    ),
  });
}

function darkOnesBlessingRangeFact(
  damageSourceId: CombatantId,
  targetId: CombatantId,
): BattleTargetSpatialFact {
  return {
    kind: "enemyZeroHitPointTemporaryHitPointsBeneficiaryWithinRange",
    beneficiaryId: warlockId,
    damageSourceId,
    targetId,
    unitId,
    rangeFeet: movementFeet(10),
  };
}

function requireDarkOnesBlessingSupportProfile(): DarkOnesBlessingSupportProfile {
  const profile = battleEnemyZeroHitPointTemporaryHitPointsSupportForUnit(unit);
  if (profile === null || profile === "unsupported") {
    throw new Error("Dark One's Blessing support profile is required.");
  }
  return profile;
}

function tempHp(state: BattleState, combatantId: CombatantId): number {
  return Number(state.combatants.get(combatantId)?.tempHp ?? Hp(0));
}
