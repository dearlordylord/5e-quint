// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3-FOLLOWUP-TWO-WEAPON-FIGHTING-RUNTIME feat_two_weapon_fighting
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3-FOLLOWUP-TWO-WEAPON-FIGHTING-DECLINE-RUNTIME feat_two_weapon_fighting
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-TWO-WEAPON-FIGHTING-RUNTIME feat_two_weapon_fighting
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-TWO-WEAPON-FIGHTING-DECLINE-RUNTIME feat_two_weapon_fighting
// UNIT-IDENTITY-REPLAY: L3-FOLLOWUP-TWO-WEAPON-FIGHTING-RUNTIME feat_two_weapon_fighting doReplayTwoWeaponFightingApplyDamageModifier
// UNIT-IDENTITY-REPLAY: L3-FOLLOWUP-TWO-WEAPON-FIGHTING-DECLINE-RUNTIME feat_two_weapon_fighting doReplayTwoWeaponFightingDeclineDamageModifier
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.light-extra-attack-damage-ability-modifier
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";
import { attackBonus } from "@dnd/shared/types";
import type { UnitRecord } from "@dnd/surface/surface/types";
import {
  attackTargetFill,
  attackRollFill,
  battleAbilityModifier,
  battleId,
  characterSeed,
  damageRollFill,
  fighterId,
  goblinId,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  startBattleRight,
  statBlockCreatureInit,
  targetFill,
  testDaggerAttack,
  testShortswordAttack,
  type BattleState,
  type BattleSubject,
} from "./battle-runtime-test-support.ts";
import {
  battleLightExtraAttackDamageAbilityModifierSupportForUnit,
  battleUnitRefWithSupportProfiles,
  LIGHT_EXTRA_ATTACK_DAMAGE_ABILITY_MODIFIER_SUPPORT_PROFILE,
  parseSupportedUnitFeatureProfile,
  type BattleFill,
  type BattleUnitRef,
} from "./index.ts";
import {
  twoWeaponFightingUnitId,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import { defineSelectedIdentityReplayWitness } from "./selected-identity-witness.ts";

describe("L3-FOLLOWUP-TWO-WEAPON-FIGHTING-RUNTIME deterministic profile slice", () => {
  test("Two-Weapon Fighting is admitted as a Light extra attack damage ability modifier permission", () => {
    const unit = unitLibrary.requireUnit(twoWeaponFightingUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, []);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: twoWeaponFightingUnitId,
        supportProfiles: [twoWeaponFightingSupportProfile()],
      }),
    );
    expect(
      battleLightExtraAttackDamageAbilityModifierSupportForUnit(unit),
    ).toEqual(twoWeaponFightingSupportProfile());
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "lightExtraAttackDamageAbilityModifier",
        unit,
        damageAbilityModifier: twoWeaponFightingDamageAbilityModifierProfile(),
      }),
    );
  });

  test("Light Property Bonus Action Attack still omits a positive damage modifier by default", () => {
    const result = resolveOffHandHit({
      state: afterQualifyingLightAttack(lightAttackBattle({})),
      damageRoll: 4,
    });

    expect(result.damage).toMatchObject({
      label: "Dagger damage (1d4-piercing)",
    });
    expect(result.resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: goblinId, hp: 6 }),
        ]),
      },
    });
  });

  test("Light Property Bonus Action Attack suppresses a positive existing damage modifier without selected support", () => {
    const result = resolveOffHandHit({
      state: afterQualifyingLightAttack(
        lightAttackBattle({
          offHandAttack: {
            ...testDaggerAttack(),
            damageAbilityModifier: battleAbilityModifier(2),
          },
        }),
      ),
      damageRoll: 4,
    });

    expect(result.damage).toMatchObject({
      label: "Dagger damage (1d4-piercing)",
    });
    expect(result.resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: goblinId, hp: 6 }),
        ]),
      },
    });
  });

  test("selected Two-Weapon Fighting restores the ordinary positive damage ability modifier", () => {
    const result = resolveOffHandHit({
      state: afterQualifyingLightAttack(
        lightAttackBattle({
          characterUnitRefs: [twoWeaponFightingBattleUnitRef()],
        }),
      ),
      damageRoll: 4,
      attackDamageAbilityModifierSelection: "apply",
    });

    expect(result.damage).toMatchObject({
      label: "Dagger damage (1d4-piercing)",
      attackDamageAbilityModifierChoice: {
        unitIds: [twoWeaponFightingUnitId],
        appliedDamageAbilityModifier: battleAbilityModifier(3),
        declinedDamageAbilityModifier: battleAbilityModifier(0),
      },
    });
    expect(result.resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: goblinId, hp: 3 }),
        ]),
      },
    });
  });

  test("selected Two-Weapon Fighting can decline the optional damage ability modifier", () => {
    const result = resolveOffHandHit({
      state: afterQualifyingLightAttack(
        lightAttackBattle({
          characterUnitRefs: [twoWeaponFightingBattleUnitRef()],
        }),
      ),
      damageRoll: 4,
      attackDamageAbilityModifierSelection: "decline",
    });

    expect(result.damage).toMatchObject({
      label: "Dagger damage (1d4-piercing)",
      attackDamageAbilityModifierChoice: {
        unitIds: [twoWeaponFightingUnitId],
      },
    });
    expect(result.resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: goblinId, hp: 6 }),
        ]),
      },
    });
  });

  test("selected Two-Weapon Fighting applies an alternate ability damage modifier through an explicit choice", () => {
    const result = resolveOffHandHit({
      state: afterQualifyingLightAttack(
        lightAttackBattle({
          characterUnitRefs: [twoWeaponFightingBattleUnitRef()],
          offHandAttack: testDaggerAttackWithAlternateDexterity(),
        }),
      ),
      attackName: "Dagger (Dexterity)",
      damageRoll: 4,
      attackDamageAbilityModifierSelection: "apply",
    });

    expect(result.damage).toMatchObject({
      label: "Dagger (Dexterity) damage (1d4-piercing)",
      attackDamageAbilityModifierChoice: {
        unitIds: [twoWeaponFightingUnitId],
        appliedDamageAbilityModifier: battleAbilityModifier(4),
        declinedDamageAbilityModifier: battleAbilityModifier(0),
      },
    });
    expect(result.resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: goblinId, hp: 2 }),
        ]),
      },
    });
  });

  test("selected Two-Weapon Fighting can decline an alternate ability damage modifier", () => {
    const result = resolveOffHandHit({
      state: afterQualifyingLightAttack(
        lightAttackBattle({
          characterUnitRefs: [twoWeaponFightingBattleUnitRef()],
          offHandAttack: testDaggerAttackWithAlternateDexterity(),
        }),
      ),
      attackName: "Dagger (Dexterity)",
      damageRoll: 4,
      attackDamageAbilityModifierSelection: "decline",
    });

    expect(result.damage).toMatchObject({
      label: "Dagger (Dexterity) damage (1d4-piercing)",
      attackDamageAbilityModifierChoice: {
        unitIds: [twoWeaponFightingUnitId],
        appliedDamageAbilityModifier: battleAbilityModifier(4),
        declinedDamageAbilityModifier: battleAbilityModifier(0),
      },
    });
    expect(result.resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: goblinId, hp: 6 }),
        ]),
      },
    });
  });

  test("selected Two-Weapon Fighting requires an explicit damage ability modifier choice", () => {
    const result = resolveOffHandHit({
      state: afterQualifyingLightAttack(
        lightAttackBattle({
          characterUnitRefs: [twoWeaponFightingBattleUnitRef()],
        }),
      ),
      damageRoll: 4,
      expectsAttackDamageAbilityModifierChoice: true,
    });

    expect(result.resolved).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Attack damage ability modifier choice is required for this attack.",
    });
  });

  test("selected Two-Weapon Fighting does not add a second modifier when the attack is already adding one", () => {
    const result = resolveOffHandHit({
      state: afterQualifyingLightAttack(
        lightAttackBattle({
          characterUnitRefs: [twoWeaponFightingBattleUnitRef()],
          offHandAttack: {
            ...testDaggerAttack(),
            damageAbilityModifier: battleAbilityModifier(2),
          },
        }),
      ),
      damageRoll: 4,
    });

    expect(result.damage).toMatchObject({
      label: "Dagger damage (1d4+2-piercing)",
    });
    expect(result.damage).not.toHaveProperty(
      "attackDamageAbilityModifierChoice",
    );
    expect(result.resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: goblinId, hp: 4 }),
        ]),
      },
    });
  });

  test("selected Two-Weapon Fighting preserves a negative damage ability modifier", () => {
    const result = resolveOffHandHit({
      state: afterQualifyingLightAttack(
        lightAttackBattle({
          characterUnitRefs: [twoWeaponFightingBattleUnitRef()],
          offHandAttack: {
            ...testDaggerAttack(),
            abilityModifier: battleAbilityModifier(-1),
          },
        }),
      ),
      damageRoll: 4,
    });

    expect(result.damage).toMatchObject({
      label: "Dagger damage (1d4-1-piercing)",
    });
    expect(result.damage).not.toHaveProperty(
      "attackDamageAbilityModifierChoice",
    );
    expect(result.resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: goblinId, hp: 7 }),
        ]),
      },
    });
  });

  test("support gate rejects adjacent Light extra attack damage modifier shapes", () => {
    const unit = unitLibrary.requireUnit(twoWeaponFightingUnitId);
    if (
      unit.kind !== "feat" ||
      unit.mechanics.family !== "light_extra_attack_damage_ability_modifier"
    ) {
      throw new Error(
        "Expected Two-Weapon Fighting Light extra attack damage feat.",
      );
    }
    // Cast evidence: these fixtures deliberately mutate a decoded SRD Unit into
    // unsupported neighboring literal shapes so the production gate can reject
    // them at the Unit boundary.
    const adjacentUnits = [
      {
        ...unit,
        id: "synthetic_light_extra_attack_required_fixture",
        mechanics: { ...unit.mechanics, optional: false },
      },
      {
        ...unit,
        id: "synthetic_light_extra_attack_wrong_weapon_fixture",
        mechanics: {
          ...unit.mechanics,
          trigger: {
            ...unit.mechanics.trigger,
            attackWeapon: { kind: "weapon_with_heavy_property" },
          },
        },
      },
      {
        ...unit,
        id: "synthetic_light_extra_attack_wrong_source_fixture",
        mechanics: {
          ...unit.mechanics,
          effect: {
            ...unit.mechanics.effect,
            modifierSource: "flat_bonus",
          },
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
          message: `Unsupported battle Light extra attack damage ability modifier Unit hook: ${adjacentUnit.id}.`,
        }),
      );
      expect(parseSupportedUnitFeatureProfile(adjacentUnit, [])).toBeNull();
    }
  });
});

function lightAttackBattle(input: {
  readonly characterUnitRefs?: readonly BattleUnitRef[];
  readonly offHandAttack?: ReturnType<typeof testDaggerAttack>;
}): BattleState {
  return startBattleRight({
    battleId: battleId("unit-profile-two-weapon-fighting-admission"),
    combatants: [
      characterSeed({
        initiative: 20,
        attack: testShortswordAttack(),
        offHandAttack: input.offHandAttack ?? testDaggerAttack(),
        characterUnitRefs: input.characterUnitRefs ?? [],
        selectedLoadout: {
          weapon: {
            itemId: "main:weapon_shortsword",
            unitId: "weapon_shortsword",
            grip: "one_handed",
          },
          offHandWeapon: {
            itemId: "off:weapon_dagger",
            unitId: "weapon_dagger",
          },
        },
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

function afterQualifyingLightAttack(state: BattleState): BattleState {
  const subject: BattleSubject = {
    tag: "action",
    actorId: fighterId,
    action: "attack",
    attackName: "Shortsword",
  };
  const target = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const roll = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [targetFill(target, goblinId)],
    }),
    "attackRoll",
  );
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, { total: 1, naturalD20: 1 }),
      ],
    }),
  ).state;
}

function resolveOffHandHit(input: {
  readonly state: BattleState;
  readonly damageRoll: number;
  readonly attackName?: string;
  readonly expectsAttackDamageAbilityModifierChoice?: true;
  readonly attackDamageAbilityModifierSelection?: NonNullable<
    Extract<
      BattleFill,
      { readonly kind: "rolledDice" }
    >["attackDamageAbilityModifierChoice"]
  >["selection"];
}) {
  const subject: BattleSubject = {
    tag: "bonusAction",
    actorId: fighterId,
    action: "offHandAttack",
    attackName: input.attackName ?? "Dagger",
  };
  const target = requireHole(
    resolveBattleSubject({ state: input.state, subject, fills: [] }),
    "targetChoice",
  );
  const targetChoice = attackTargetFill(
    target,
    fighterId,
    goblinId,
    subject.attackName,
  );
  const roll = requireHole(
    resolveBattleSubject({
      state: input.state,
      subject,
      fills: [targetChoice],
    }),
    "attackRoll",
  );
  const damage = requireHole(
    resolveBattleSubject({
      state: input.state,
      subject,
      fills: [
        targetChoice,
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
      ],
    }),
    "rolledDice",
  );
  if (
    input.expectsAttackDamageAbilityModifierChoice === true ||
    input.attackDamageAbilityModifierSelection !== undefined
  ) {
    expect(damage).toMatchObject({
      attackDamageAbilityModifierChoice: {
        unitIds: [twoWeaponFightingUnitId],
      },
    });
  } else {
    expect(damage).not.toHaveProperty("attackDamageAbilityModifierChoice");
  }
  return {
    damage,
    resolved: resolveBattleSubject({
      state: input.state,
      subject,
      fills: [
        targetChoice,
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
        damageRollFill(
          damage,
          input.damageRoll,
          input.attackDamageAbilityModifierSelection === undefined
            ? undefined
            : {
                unitId: twoWeaponFightingUnitId,
                selection: input.attackDamageAbilityModifierSelection,
              },
        ),
      ],
    }),
  };
}

function testDaggerAttackWithAlternateDexterity(): ReturnType<
  typeof testDaggerAttack
> {
  return {
    ...testDaggerAttack(),
    alternateAbilityChoices: [
      {
        ability: "dex",
        abilityModifier: battleAbilityModifier(4),
        attackBonus: attackBonus(6),
        damageAbilityModifier: battleAbilityModifier(4),
      },
    ],
  };
}

function twoWeaponFightingBattleUnitRef(): BattleUnitRef {
  const unit = unitLibrary.requireUnit(twoWeaponFightingUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: twoWeaponFightingUnitId,
      supportProfiles: [twoWeaponFightingSupportProfile()],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

function twoWeaponFightingSupportProfile() {
  return {
    kind: LIGHT_EXTRA_ATTACK_DAMAGE_ABILITY_MODIFIER_SUPPORT_PROFILE,
    damageAbilityModifier: twoWeaponFightingDamageAbilityModifierProfile(),
  } as const;
}

function twoWeaponFightingDamageAbilityModifierProfile() {
  return {
    optional: true,
    trigger: "lightPropertyExtraAttackDamageRoll",
    attackWeapon: { kind: "weaponWithLightProperty" },
    modifierSource: "attackAbilityModifier",
    appliesWhen: "notAlreadyAddingAbilityModifier",
  } as const;
}

defineSelectedIdentityReplayWitness({
  describeLabel:
    "L3-FOLLOWUP-TWO-WEAPON-FIGHTING-RUNTIME selected identity replay",
  taskId: "L3-FOLLOWUP-TWO-WEAPON-FIGHTING-RUNTIME",
  initialProjection: {
    unitId: twoWeaponFightingUnitId,
    procedure: "initial",
    targetHp: 10,
  },
  units: [
    {
      unitId: twoWeaponFightingUnitId,
      procedures: [
        {
          actionName: "doReplayTwoWeaponFightingApplyDamageModifier",
          projectionAfter: {
            unitId: twoWeaponFightingUnitId,
            procedure: "lightExtraAttackDamageAbilityModifierApply",
            targetHp: 3,
          },
          discover: () => replayTwoWeaponFighting("apply"),
        },
        {
          actionName: "doReplayTwoWeaponFightingDeclineDamageModifier",
          projectionAfter: {
            unitId: twoWeaponFightingUnitId,
            procedure: "lightExtraAttackDamageAbilityModifierDecline",
            targetHp: 6,
          },
          discover: () => replayTwoWeaponFighting("decline"),
        },
      ],
    },
  ],
});

function replayTwoWeaponFighting(selection: "apply" | "decline"): {
  readonly unitId: typeof twoWeaponFightingUnitId;
  readonly procedure:
    | "lightExtraAttackDamageAbilityModifierApply"
    | "lightExtraAttackDamageAbilityModifierDecline";
  readonly targetHp: number;
} {
  const result = resolveOffHandHit({
    state: afterQualifyingLightAttack(
      lightAttackBattle({
        characterUnitRefs: [twoWeaponFightingBattleUnitRef()],
      }),
    ),
    damageRoll: 4,
    attackDamageAbilityModifierSelection: selection,
  });
  if (result.resolved.tag !== "resolved") {
    throw new Error("Expected selected Two-Weapon Fighting replay.");
  }
  return {
    unitId: twoWeaponFightingUnitId,
    procedure:
      selection === "apply"
        ? "lightExtraAttackDamageAbilityModifierApply"
        : "lightExtraAttackDamageAbilityModifierDecline",
    targetHp: Number(result.resolved.state.combatants.get(goblinId)?.hp),
  };
}
