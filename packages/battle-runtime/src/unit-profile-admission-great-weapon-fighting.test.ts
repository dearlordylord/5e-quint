// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-GREAT-WEAPON-FIGHTING-RUNTIME feat_great_weapon_fighting
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.attack-damage-die-floor
import { describe, expect, test } from "vitest";
import {
  greatWeaponFightingUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import {
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
  requireResultHole,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { greatWeaponFightingBattle } from "./unit-profile-admission-feature-fixture-support.ts";
import {
  ATTACK_DAMAGE_DIE_FLOOR_SUPPORT_PROFILE,
  battleAttackDamageDieFloorSupportForUnit,
  battleUnitRefWithSupportProfiles,
  Either,
  elapsedTimeTicks,
  parseSupportedUnitFeatureProfile,
  resolveBattleSubject,
} from "./unit-profile-admission-test-support.ts";
import type {
  BattleActiveEffect,
  BattleCreatureInit,
  BattleFill,
  BattleState,
  BattleSubject,
  UnitRecord,
} from "./unit-profile-admission-test-support.ts";

describe("L3-FOLLOWUP-GREAT-WEAPON-FIGHTING-RUNTIME deterministic profile slice", () => {
  test("Great Weapon Fighting is admitted as an optional attack damage die floor", () => {
    const unit = unitLibrary.requireUnit(greatWeaponFightingUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, []);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: greatWeaponFightingUnitId,
        supportProfiles: [ATTACK_DAMAGE_DIE_FLOOR_SUPPORT_PROFILE],
      }),
    );
    expect(battleAttackDamageDieFloorSupportForUnit(unit)).toBe(
      "attackDamageDieFloor",
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "attackDamageDieFloor",
        unit,
        damageDieFloor: {
          optional: true,
          trigger: "attackDamageRoll",
          attackWeapon: {
            kind: "meleeWeaponHeldWithTwoHands",
            propertyGate: "twoHandedOrVersatile",
          },
          dieScope: "attackDamageDice",
          minimumResult: 3,
        },
      }),
    );
  });

  test("two-handed Melee weapon attacks apply the selected floor before target resistance", () => {
    const attack = zeroAbilityWeaponAttack("weapon_greataxe");
    const state = withTargetSlashingResistance(
      greatWeaponFightingBattle({
        attack,
        selectedLoadout: mainWeaponLoadout("weapon_greataxe", "two_handed"),
      }),
    );

    const resolved = resolveWeaponHit({
      state,
      attackName: "Greataxe",
      damageGroups: [[1]],
      attackDamageDieFloorSelection: "apply",
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: spellCasterId },
          { combatantId: spellTargetId, hp: 11 },
        ],
      },
    });
  });

  test("qualifying multi-die weapon attacks floor each attack damage die", () => {
    const attack = zeroAbilityWeaponAttack("weapon_greatsword");
    const state = greatWeaponFightingBattle({
      attack,
      selectedLoadout: mainWeaponLoadout("weapon_greatsword", "two_handed"),
    });

    expect(
      resolveWeaponHit({
        state,
        attackName: "Greatsword",
        damageGroups: [[1, 2]],
        attackDamageDieFloorSelection: "apply",
      }),
    ).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: spellCasterId },
          { combatantId: spellTargetId, hp: 6 },
        ],
      },
    });
  });

  test("qualifying weapon attacks can decline the attack damage die floor", () => {
    const attack = zeroAbilityWeaponAttack("weapon_greatsword");
    const state = greatWeaponFightingBattle({
      attack,
      selectedLoadout: mainWeaponLoadout("weapon_greatsword", "two_handed"),
    });

    expect(
      resolveWeaponHit({
        state,
        attackName: "Greatsword",
        damageGroups: [[1, 2]],
        attackDamageDieFloorSelection: "decline",
      }),
    ).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: spellCasterId },
          { combatantId: spellTargetId, hp: 9 },
        ],
      },
    });
  });

  test("two-handed Versatile weapon attacks floor damage dice", () => {
    const attack = zeroAbilityWeaponAttack("weapon_longsword");
    const state = greatWeaponFightingBattle({
      attack,
      selectedLoadout: mainWeaponLoadout("weapon_longsword", "two_handed"),
    });

    expect(
      resolveWeaponHit({
        state,
        attackName: "Longsword",
        damageGroups: [[1]],
        attackDamageDieFloorSelection: "apply",
      }),
    ).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: spellCasterId },
          { combatantId: spellTargetId, hp: 9 },
        ],
      },
    });
  });

  test("qualifying attacks require an explicit attack damage die floor choice", () => {
    const attack = zeroAbilityWeaponAttack("weapon_greataxe");
    const state = greatWeaponFightingBattle({
      attack,
      selectedLoadout: mainWeaponLoadout("weapon_greataxe", "two_handed"),
    });

    expect(
      resolveWeaponHit({
        state,
        attackName: "Greataxe",
        damageGroups: [[1]],
        expectsAttackDamageDieFloorChoice: true,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Attack damage die floor choice is required for this attack.",
    });
  });

  test("one-handed Versatile weapon attacks do not floor damage dice", () => {
    const attack = zeroAbilityWeaponAttack("weapon_longsword");
    const state = greatWeaponFightingBattle({
      attack,
      selectedLoadout: mainWeaponLoadout("weapon_longsword", "one_handed"),
    });

    expect(
      resolveWeaponHit({ state, attackName: "Longsword", damageGroups: [[1]] }),
    ).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: spellCasterId },
          { combatantId: spellTargetId, hp: 11 },
        ],
      },
    });
  });

  test("Ranged Two-Handed weapon attacks do not floor damage dice", () => {
    const attack = zeroAbilityWeaponAttack("weapon_shortbow");
    const state = greatWeaponFightingBattle({
      attack,
      selectedLoadout: mainWeaponLoadout("weapon_shortbow", "two_handed"),
    });

    expect(
      resolveWeaponHit({ state, attackName: "Shortbow", damageGroups: [[1]] }),
    ).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: spellCasterId },
          { combatantId: spellTargetId, hp: 11 },
        ],
      },
    });
  });

  test("Melee weapons without Two-Handed or Versatile do not floor damage dice", () => {
    const attack = zeroAbilityWeaponAttack("weapon_dagger");
    const state = greatWeaponFightingBattle({
      attack,
      selectedLoadout: mainWeaponLoadout("weapon_dagger", "two_handed"),
    });

    expect(
      resolveWeaponHit({ state, attackName: "Dagger", damageGroups: [[1]] }),
    ).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: spellCasterId },
          { combatantId: spellTargetId, hp: 11 },
        ],
      },
    });
  });

  test("support gate rejects adjacent damage floor shapes", () => {
    const unit = unitLibrary.requireUnit(greatWeaponFightingUnitId);
    if (unit.kind !== "feat" || unit.mechanics.family !== "damage_die_floor") {
      throw new Error("Expected Great Weapon Fighting damage die floor feat.");
    }
    // Cast evidence: these fixtures deliberately mutate a decoded SRD Unit into
    // unsupported neighboring literal shapes so the production gate can reject
    // them at the Unit boundary.
    const adjacentUnits = [
      {
        ...unit,
        id: "synthetic_damage_floor_required_fixture",
        mechanics: { ...unit.mechanics, optional: false },
      },
      {
        ...unit,
        id: "synthetic_damage_floor_all_damage_dice_fixture",
        mechanics: {
          ...unit.mechanics,
          effect: { ...unit.mechanics.effect, dieScope: "all_damage_dice" },
        },
      },
    ] as unknown as readonly UnitRecord[];

    for (const adjacentUnit of adjacentUnits) {
      expect(
        battleUnitRefWithSupportProfiles({
          unitRef: { unitId: adjacentUnit.id },
          unit: adjacentUnit,
        }),
      ).toEqual(
        Either.left({
          tag: "battleUnitSupportProfileIssue",
          message: `Unsupported battle attack damage die floor Unit hook: ${adjacentUnit.id}.`,
        }),
      );
      expect(parseSupportedUnitFeatureProfile(adjacentUnit, [])).toBeNull();
    }
  });
});

type CharacterSelectedLoadout = Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["selectedLoadout"];

function mainWeaponLoadout(
  unitId: UnitRecord["id"],
  grip: "one_handed" | "two_handed",
): CharacterSelectedLoadout {
  return {
    weapon: {
      itemId: `main:${unitId}`,
      unitId,
      grip,
    },
  };
}

function weaponAttackSubject(
  attackName: string,
): Extract<BattleSubject, { readonly tag: "action" }> {
  return {
    tag: "action",
    actorId: spellCasterId,
    action: "attack",
    attackName,
  };
}

function resolveWeaponHit(input: {
  readonly state: BattleState;
  readonly attackName: string;
  readonly damageGroups: readonly (readonly number[])[];
  readonly expectsAttackDamageDieFloorChoice?: true;
  readonly attackDamageDieFloorSelection?: NonNullable<
    Extract<
      BattleFill,
      { readonly kind: "rolledDice" }
    >["attackDamageDieFloorChoice"]
  >["selection"];
}) {
  const subject = weaponAttackSubject(input.attackName);
  const target = requireResultHole(
    resolveBattleSubject({ state: input.state, subject, fills: [] }),
    "targetChoice",
  );
  const roll = requireResultHole(
    resolveBattleSubject({
      state: input.state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId, input.attackName),
      ],
    }),
    "attackRoll",
  );
  const damage = requireResultHole(
    resolveBattleSubject({
      state: input.state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId, input.attackName),
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
      ],
    }),
    "rolledDice",
  );
  if (
    input.expectsAttackDamageDieFloorChoice === true ||
    input.attackDamageDieFloorSelection !== undefined
  ) {
    expect(damage).toMatchObject({
      attackDamageDieFloorChoiceUnitIds: [greatWeaponFightingUnitId],
    });
  } else {
    expect(damage).not.toHaveProperty("attackDamageDieFloorChoiceUnitIds");
  }
  return resolveBattleSubject({
    state: input.state,
    subject,
    fills: [
      attackTargetFill(target, spellCasterId, spellTargetId, input.attackName),
      attackRollFill(roll, { total: 15, naturalD20: 10 }),
      damageRollFillWithGroups(
        damage,
        input.damageGroups,
        undefined,
        undefined,
        input.attackDamageDieFloorSelection === undefined
          ? undefined
          : {
              unitId: greatWeaponFightingUnitId,
              selection: input.attackDamageDieFloorSelection,
            },
      ),
    ],
  });
}

function withTargetSlashingResistance(state: BattleState): BattleState {
  const target = state.combatants.get(spellTargetId);
  if (target === undefined) {
    throw new Error("Expected target combatant.");
  }
  const resistance = {
    kind: "damageResistance",
    sourceSpellId: "synthetic_gwf_resistance",
    sourceCombatantId: spellTargetId,
    damageType: "slashing",
    expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(10) },
  } as const satisfies BattleActiveEffect;
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellTargetId, {
      ...target,
      activeEffects: [...target.activeEffects, resistance],
    }),
  };
}
