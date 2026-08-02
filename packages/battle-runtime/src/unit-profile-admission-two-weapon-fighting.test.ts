import { battleObjectId } from "./identity.ts";
import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
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
import {
  attackTargetFill,
  assertBattleSnapshotCodecRoundTripForTest,
  attackRollFill,
  battleAbilityModifier,
  battleId,
  battleProcedureExecutionRefForTest,
  characterSeed,
  damageRollFill,
  fighterAttackSubject,
  characterBonusAttackSubjectForTest,
  fighterId,
  goblinId,
  requireCharacterUnitProcedureRefForTest,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  snapshotBattle,
  startBattleSessionRight,
  statBlockCreatureInit,
  targetFill,
  testDaggerAttack,
  testShortswordAttack,
  type BattleRuntimeSession,
  type BattleSubject,
} from "./battle-runtime.test-support.ts";
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
  unitMechanicsVariant,
} from "./unit-profile-admission-catalog.test-support.ts";
import { defineSelectedIdentityReplayWitness } from "./selected-identity-witness.test-support.ts";

describe("L3-FOLLOWUP-TWO-WEAPON-FIGHTING-RUNTIME deterministic profile slice", () => {
  test("Two-Weapon Fighting is admitted as a Light extra attack damage ability modifier permission", () => {
    const unit = unitLibrary.requireUnit(twoWeaponFightingUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, []);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unit: unitLibrary.requireUnit(twoWeaponFightingUnitId),
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

  test("Two-Weapon Fighting rejects a same-family near miss", () => {
    const unit = unitLibrary.requireUnit(twoWeaponFightingUnitId);
    if (
      unit.kind !== "feat" ||
      unit.mechanics.family !== "light_extra_attack_damage_ability_modifier"
    ) {
      throw new Error("Expected Two-Weapon Fighting mechanics.");
    }
    const nearMiss = unitMechanicsVariant(unit, {
      id: "synthetic_two_weapon_fighting_required",
      mechanics: { ...unit.mechanics, optional: false },
    });

    expect(
      battleLightExtraAttackDamageAbilityModifierSupportForUnit(nearMiss),
    ).toBe("unsupported");
  });

  test("Light Property Bonus Action Attack still omits a positive damage modifier by default", () => {
    const session = afterQualifyingLightAttack(lightAttackBattle({}));
    assertBattleSnapshotCodecRoundTripForTest(snapshotBattle(session.state));
    const result = resolveOffHandHit({
      state: session,
      damageRoll: 4,
    });

    expect(result.damage).toMatchObject({
      label: "weapon_dagger damage (1d4-piercing)",
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
      label: "weapon_dagger damage (1d4-piercing)",
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
      attackDamageAbilityModifierChoice: { selection: "apply" },
    });

    expect(result.damage).toMatchObject({
      label: "weapon_dagger damage (1d4-piercing)",
      attackDamageAbilityModifierChoice: {
        procedureRefs: [
          requireCharacterUnitProcedureRefForTest(
            result.state,
            fighterId,
            twoWeaponFightingUnitId,
          ),
        ],
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

  test("rejects a damage ability modifier choice from a procedure the damage hole did not offer", () => {
    const result = resolveOffHandHit({
      state: afterQualifyingLightAttack(
        lightAttackBattle({
          characterUnitRefs: [twoWeaponFightingBattleUnitRef()],
        }),
      ),
      damageRoll: 4,
      attackDamageAbilityModifierChoice: {
        procedureRef: battleProcedureExecutionRefForTest(
          "foreign-two-weapon-fighting-procedure",
        ),
        selection: "apply",
      },
    });

    expect(result.resolved).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Attack damage ability modifier choice is not eligible for this attack.",
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
      attackDamageAbilityModifierChoice: { selection: "decline" },
    });

    expect(result.damage).toMatchObject({
      label: "weapon_dagger damage (1d4-piercing)",
      attackDamageAbilityModifierChoice: {
        procedureRefs: [
          requireCharacterUnitProcedureRefForTest(
            result.state,
            fighterId,
            twoWeaponFightingUnitId,
          ),
        ],
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
      damageRoll: 4,
      attackDamageAbilityModifierChoice: { selection: "apply" },
      attackAbility: "dex",
    });

    expect(result.damage).toMatchObject({
      label: "weapon_dagger damage (1d4-piercing)",
      attackDamageAbilityModifierChoice: {
        procedureRefs: [
          requireCharacterUnitProcedureRefForTest(
            result.state,
            fighterId,
            twoWeaponFightingUnitId,
          ),
        ],
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
      damageRoll: 4,
      attackDamageAbilityModifierChoice: { selection: "decline" },
      attackAbility: "dex",
    });

    expect(result.damage).toMatchObject({
      label: "weapon_dagger damage (1d4-piercing)",
      attackDamageAbilityModifierChoice: {
        procedureRefs: [
          requireCharacterUnitProcedureRefForTest(
            result.state,
            fighterId,
            twoWeaponFightingUnitId,
          ),
        ],
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
      label: "weapon_dagger damage (1d4+2-piercing)",
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
      label: "weapon_dagger damage (1d4-1-piercing)",
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
});

function lightAttackBattle(input: {
  readonly characterUnitRefs?: readonly BattleUnitRef[];
  readonly offHandAttack?: ReturnType<typeof testDaggerAttack>;
}): BattleRuntimeSession {
  return startBattleSessionRight({
    battleId: battleId("unit-profile-two-weapon-fighting-admission"),
    combatants: [
      characterSeed({
        initiative: 20,
        attack: testShortswordAttack(),
        offHandAttack: input.offHandAttack ?? testDaggerAttack(),
        characterUnitRefs: input.characterUnitRefs ?? [],
        selectedLoadout: {
          weapon: {
            itemId: battleObjectId("main:weapon_shortsword"),
            unitId: parseSharedUnitId("weapon_shortsword"),
            grip: "one_handed",
          },
          offHandWeapon: {
            itemId: battleObjectId("off:weapon_dagger"),
            unitId: parseSharedUnitId("weapon_dagger"),
          },
        },
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

function afterQualifyingLightAttack(
  session: BattleRuntimeSession,
): BattleRuntimeSession {
  const subject: BattleSubject = fighterAttackSubject(
    session.state,
    "Shortsword",
  );
  const target = requireHole(
    resolveBattleSubject({ state: session.state, subject, fills: [] }),
    "targetChoice",
  );
  const roll = requireHole(
    resolveBattleSubject({
      state: session.state,
      subject,
      fills: [targetFill(target, goblinId)],
    }),
    "attackRoll",
  );
  const resolved = requireResolved(
    resolveBattleSubject({
      state: session.state,
      subject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, { total: 1, naturalD20: 1 }),
      ],
    }),
  );
  return battleRuntimeSessionForTest({
    state: resolved.state,
    context: session.context,
  });
}

function resolveOffHandHit(input: {
  readonly state: BattleRuntimeSession;
  readonly damageRoll: number;
  readonly attackAbility?: "dex";
  readonly expectsAttackDamageAbilityModifierChoice?: true;
  readonly attackDamageAbilityModifierChoice?: {
    readonly procedureRef?: ReturnType<
      typeof battleProcedureExecutionRefForTest
    >;
    readonly selection: NonNullable<
      Extract<
        BattleFill,
        { readonly kind: "rolledDice" }
      >["attackDamageAbilityModifierChoice"]
    >["selection"];
  };
}) {
  const subject: BattleSubject = characterBonusAttackSubjectForTest(
    input.state.state,
    fighterId,
    "offHandAttack",
    input.attackAbility,
  );
  const target = requireHole(
    resolveBattleSubject({ state: input.state.state, subject, fills: [] }),
    "targetChoice",
  );
  const targetChoice = attackTargetFill(target, fighterId, goblinId, {
    procedureRef: subject.procedureRef,
    attackAbility: subject.attackAbility,
    attackDamageType: subject.attackDamageType,
  });
  const roll = requireHole(
    resolveBattleSubject({
      state: input.state.state,
      subject,
      fills: [targetChoice],
    }),
    "attackRoll",
  );
  const damage = requireHole(
    resolveBattleSubject({
      state: input.state.state,
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
    input.attackDamageAbilityModifierChoice !== undefined
  ) {
    expect(damage).toMatchObject({
      attackDamageAbilityModifierChoice: {
        procedureRefs: [
          requireCharacterUnitProcedureRefForTest(
            input.state,
            fighterId,
            twoWeaponFightingUnitId,
          ),
        ],
      },
    });
  } else {
    expect(damage).not.toHaveProperty("attackDamageAbilityModifierChoice");
  }
  return {
    damage,
    state: input.state,
    resolved: resolveBattleSubject({
      state: input.state.state,
      subject,
      fills: [
        targetChoice,
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
        damageRollFill(
          damage,
          input.damageRoll,
          input.attackDamageAbilityModifierChoice === undefined
            ? undefined
            : {
                procedureRef:
                  input.attackDamageAbilityModifierChoice.procedureRef ??
                  requireCharacterUnitProcedureRefForTest(
                    input.state,
                    fighterId,
                    twoWeaponFightingUnitId,
                  ),
                selection: input.attackDamageAbilityModifierChoice.selection,
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
      unit: unitLibrary.requireUnit(twoWeaponFightingUnitId),
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
    attackDamageAbilityModifierChoice: { selection },
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
