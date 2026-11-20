// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.WEAPON_MASTERY_GRAZE
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.weapon-mastery-graze
import { Result } from "effect";
import { describe, expect, test } from "vitest";

import {
  attackDamageHoleAfterHit,
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  battleAbilityModifier,
  battleProcedureExecutionRefForTest,
  fighterAttackSubject,
  fighterVsGoblinBattle,
  goblinId,
  grazeWeaponMasterySelections,
  masteryGrazeUnitRefs,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  targetFill,
  testGrazeWeaponAttack,
  testGrazeWeaponUnitRef,
  unitFeatureDecisionFill,
  unitLibrary,
} from "./battle-runtime.test-support.ts";
import type {
  BattleFill,
  BattleHole,
  BattleState,
} from "./battle-runtime.test-support.ts";
import { WEAPON_MASTERY_GRAZE_DECISION_HOLE_ID } from "./battle-reducer/domain-constants.ts";
import { admitWeaponMasteryProcedure } from "./procedure-admission/weapon-mastery.ts";
import {
  battleUnitSupportProfilesForUnit,
  WEAPON_MASTERY_GRAZE_SUPPORT_PROFILE,
} from "./unit-feature-support.ts";

// SRD 5.2.1 equipment.md, Graze: "If your attack roll with this weapon misses a
// creature, you can deal damage to that creature equal to the ability modifier
// you used to make the attack roll. This damage is the same type dealt by the
// weapon, and the damage can be increased only by increasing the ability
// modifier."

const GRAZE_WEAPON_ID = String(testGrazeWeaponUnitRef().unit.id);
const MISS = { total: 10, naturalD20: 8 } as const;
const HIT = { total: 18, naturalD20: 15 } as const;

function grazeBattle(input?: {
  readonly abilityModifier?: number;
  readonly damageBonus?: number;
  readonly withMastery?: boolean;
  readonly withSelection?: boolean;
}): BattleState {
  const attack = testGrazeWeaponAttack(
    battleAbilityModifier(input?.abilityModifier ?? 3),
  );
  return fighterVsGoblinBattle({
    characterUnitRefs: [
      ...(input?.withMastery === false ? [] : masteryGrazeUnitRefs()),
      testGrazeWeaponUnitRef(),
    ],
    ...(input?.withSelection === false
      ? {}
      : { weaponMasteries: grazeWeaponMasterySelections() }),
    attack:
      input?.damageBonus === undefined
        ? attack
        : { ...attack, damageBonus: input.damageBonus },
  });
}

function rollFills(
  state: BattleState,
  roll: { readonly total: number; readonly naturalD20: number },
): readonly BattleFill[] {
  const subject = fighterAttackSubject(state, GRAZE_WEAPON_ID);
  const targetHole = attackInitialTargetHole(state, subject);
  const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
  return [targetFill(targetHole, goblinId), attackRollFill(rollHole, roll)];
}

function resolveGrazeAttack(
  state: BattleState,
  fills: readonly BattleFill[],
): ReturnType<typeof resolveBattleSubject> {
  return resolveBattleSubject({
    state,
    subject: fighterAttackSubject(state, GRAZE_WEAPON_ID),
    fills,
  });
}

function grazeDecisionFill(
  value: "use" | "decline",
): Extract<BattleFill, { readonly kind: "unitFeatureDecision" }> {
  return {
    kind: "unitFeatureDecision",
    holeId: WEAPON_MASTERY_GRAZE_DECISION_HOLE_ID,
    value,
  };
}

function goblinHp(state: BattleState): number {
  const goblin = state.combatants.get(goblinId);
  if (goblin === undefined) {
    throw new Error("Expected the Goblin.");
  }
  return Number(goblin.hp);
}

function actionSpent(state: BattleState): boolean {
  return state.currentTurnResources.actionTakenThisTurn;
}

function withGoblin(
  state: BattleState,
  change: (
    goblin: NonNullable<ReturnType<BattleState["combatants"]["get"]>>,
  ) => NonNullable<ReturnType<BattleState["combatants"]["get"]>>,
): BattleState {
  const goblin = state.combatants.get(goblinId);
  if (goblin === undefined) {
    throw new Error("Expected the Goblin.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(goblinId, change(goblin)),
  };
}

describe("battle runtime: Weapon Mastery Graze", () => {
  test("admits the SRD Graze mastery and a weapon whose mastery is Graze", () => {
    const graze = unitLibrary.requireUnit("mastery_graze");
    expect(admitWeaponMasteryProcedure(graze)).toMatchObject({
      tag: "admitted",
      procedure: { facts: WEAPON_MASTERY_GRAZE_SUPPORT_PROFILE },
    });
    const supportProfiles = battleUnitSupportProfilesForUnit({ unit: graze });
    expect(Result.getOrThrow(supportProfiles)).toEqual([
      WEAPON_MASTERY_GRAZE_SUPPORT_PROFILE,
    ]);
    expect(testGrazeWeaponAttack().weapon).toMatchObject({
      masteryProperty: "graze",
    });
  });

  test("a miss asks whether to use Graze", () => {
    const state = grazeBattle();
    const result = resolveGrazeAttack(state, rollFills(state, MISS));

    expect(result).toMatchObject({
      tag: "needsHoles",
      frontier: {
        kind: "holes",
        holes: [
          {
            kind: "unitFeatureDecision",
            holeId: WEAPON_MASTERY_GRAZE_DECISION_HOLE_ID,
            label: "Use Graze",
            choices: ["use", "decline"],
          },
        ],
      },
    });
    if (result.tag !== "needsHoles") throw new Error("Expected holes.");
    expect(actionSpent(result.state)).toBe(false);
  });

  test("using Graze deals the attack's ability modifier as the weapon's damage type", () => {
    const state = grazeBattle();
    const hpBefore = goblinHp(state);
    const decisionHole = requireHole(
      resolveGrazeAttack(state, rollFills(state, MISS)),
      "unitFeatureDecision",
    );

    const resolved = requireResolved(
      resolveGrazeAttack(state, [
        ...rollFills(state, MISS),
        unitFeatureDecisionFill(decisionHole, "use"),
      ]),
    );

    expect(goblinHp(resolved.state)).toBe(hpBefore - 3);
    expect(actionSpent(resolved.state)).toBe(true);
  });

  test("declining Graze deals no damage and still spends the attack", () => {
    const state = grazeBattle();
    const hpBefore = goblinHp(state);

    const resolved = requireResolved(
      resolveGrazeAttack(state, [
        ...rollFills(state, MISS),
        grazeDecisionFill("decline"),
      ]),
    );

    expect(goblinHp(resolved.state)).toBe(hpBefore);
    expect(actionSpent(resolved.state)).toBe(true);
  });

  test("Graze damage takes no damage bonus, since only the ability modifier can increase it", () => {
    const state = grazeBattle({ damageBonus: 2 });
    const hpBefore = goblinHp(state);

    const resolved = requireResolved(
      resolveGrazeAttack(state, [
        ...rollFills(state, MISS),
        grazeDecisionFill("use"),
      ]),
    );

    expect(goblinHp(resolved.state)).toBe(hpBefore - 3);
  });

  test("Graze damage uses the ability modifier of the ability the attack roll used", () => {
    const state = grazeBattle({ abilityModifier: 4 });
    const hpBefore = goblinHp(state);

    const resolved = requireResolved(
      resolveGrazeAttack(state, [
        ...rollFills(state, MISS),
        grazeDecisionFill("use"),
      ]),
    );

    expect(goblinHp(resolved.state)).toBe(hpBefore - 4);
  });

  test("the target's Resistance to the weapon's damage type still halves Graze damage", () => {
    const state = withGoblin(grazeBattle(), (goblin) => {
      if (goblin.origin.kind !== "statBlock") {
        throw new Error("Expected a Stat Block Goblin.");
      }
      return {
        ...goblin,
        origin: {
          ...goblin.origin,
          mechanics: {
            ...goblin.origin.mechanics,
            resistances: ["slashing"],
          },
        },
      };
    });
    const hpBefore = goblinHp(state);

    const resolved = requireResolved(
      resolveGrazeAttack(state, [
        ...rollFills(state, MISS),
        grazeDecisionFill("use"),
      ]),
    );

    expect(goblinHp(resolved.state)).toBe(hpBefore - 1);
  });

  test("Graze damage asks a concentrating target for its Concentration save", () => {
    const state = withGoblin(grazeBattle(), (goblin) => ({
      ...goblin,
      concentration: {
        sourceProcedureRef: battleProcedureExecutionRefForTest("graze-ward"),
        effectKind: "spellEffect" as const,
      },
    }));

    const result = resolveGrazeAttack(state, [
      ...rollFills(state, MISS),
      grazeDecisionFill("use"),
    ]);

    expect(requireHole(result, "concentrationSavingThrow")).toMatchObject({
      kind: "concentrationSavingThrow",
    });
  });

  test("a hit asks for weapon damage and rejects a Graze decision", () => {
    const state = grazeBattle();
    const subject = fighterAttackSubject(state, GRAZE_WEAPON_ID);
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
    expect(
      attackDamageHoleAfterHit(state, targetHole, rollHole, HIT, subject),
    ).toMatchObject({ kind: "rolledDice" });

    expect(
      resolveGrazeAttack(state, [
        ...rollFills(state, HIT),
        grazeDecisionFill("use"),
      ]),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Weapon Mastery Graze decision is only valid after an eligible Graze weapon miss.",
    });
  });

  test("a miss without Graze ends the attack, and a Graze decision is rejected", () => {
    const cases: readonly BattleState[] = [
      grazeBattle({ withMastery: false }),
      grazeBattle({ withSelection: false }),
      grazeBattle({ abilityModifier: 0 }),
      grazeBattle({ abilityModifier: -1 }),
    ];
    for (const state of cases) {
      const hpBefore = goblinHp(state);
      const resolved = requireResolved(
        resolveGrazeAttack(state, rollFills(state, MISS)),
      );
      expect(goblinHp(resolved.state)).toBe(hpBefore);
      expect(actionSpent(resolved.state)).toBe(true);

      expect(
        resolveGrazeAttack(state, [
          ...rollFills(state, MISS),
          grazeDecisionFill("use"),
        ]),
      ).toMatchObject({ tag: "invalid" });
    }
  });

  test("rejects a second Graze decision", () => {
    const state = grazeBattle();
    expect(
      resolveGrazeAttack(state, [
        ...rollFills(state, MISS),
        grazeDecisionFill("use"),
        grazeDecisionFill("decline"),
      ]),
    ).toMatchObject({
      tag: "invalid",
      message: "Weapon Mastery Graze decision was filled twice.",
    });
  });

  test("rejects a Graze decision that is neither use nor decline", () => {
    const state = grazeBattle();
    const hole: BattleHole = requireHole(
      resolveGrazeAttack(state, rollFills(state, MISS)),
      "unitFeatureDecision",
    );
    expect(
      resolveGrazeAttack(state, [
        ...rollFills(state, MISS),
        unitFeatureDecisionFill(hole, "attempt"),
      ]),
    ).toMatchObject({
      tag: "invalid",
      message: "Weapon Mastery Graze decision must be use or decline.",
    });
  });
});
