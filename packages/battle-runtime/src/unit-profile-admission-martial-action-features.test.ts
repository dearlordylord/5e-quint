// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT8 fighter_action_surge fighter_improved_critical barbarian_rage rogue_cunning_action rogue_uncanny_dodge rogue_sneak_attack
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT59 monk_deflect_attacks
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-MONK-MONKS-FOCUS-BATTLE-OPTIONS monk_monks_focus
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-FOLLOWUP-BARBARIAN-FRENZY barbarian_frenzy
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV73A monk_martial_arts
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.martial-arts-attack-projection unit-feature.monk-focus-battle-options unit-feature.reaction-roll-or-damage-reduction
import { describe, expect, test } from "vitest";
import {
  barbarianFrenzyUnitId,
  barbarianRageUnitId,
  fighterActionSurgeUnitId,
  fighterImprovedCriticalUnitId,
  monkDeflectAttacksUnitId,
  monkMartialArtsUnitId,
  monkMonksFocusUnitId,
  rogueCunningActionUnitId,
  rogueSneakAttackUnitId,
  rogueUncannyDodgeUnitId,
  unitLibrary,
  unitMechanicsVariant,
} from "./unit-profile-admission-catalog-support.ts";
import {
  ALTERNATE_ACTION_COST_ACTIONS,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
  battleMartialArtsAttackProjectionSupportForUnit,
  battleMonkFocusBattleOptionsSupportForUnit,
  battleReactionRollOrDamageReductionSupportForUnit,
  battleUnitRefWithSupportProfiles,
  classLevel,
  Either,
  MARTIAL_ARTS_ATTACK_PROJECTION_SUPPORT_PROFILE,
  MONK_FOCUS_BATTLE_OPTIONS_SUPPORT_PROFILE,
  parseSupportedUnitFeatureProfile,
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
  WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
} from "./unit-profile-admission-test-support.ts";
import type { UnitRecord } from "./unit-profile-admission-test-support.ts";

describe("QMBT68 Monk Deflect Attacks deterministic Unit profile admission", () => {
  test("monk_martial_arts is admitted as an attack projection profile", () => {
    const unit = unitLibrary.requireUnit(monkMartialArtsUnitId);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: monkMartialArtsUnitId,
        supportProfiles: [MARTIAL_ARTS_ATTACK_PROJECTION_SUPPORT_PROFILE],
      }),
    );
    expect(battleMartialArtsAttackProjectionSupportForUnit(unit)).toBe(
      MARTIAL_ARTS_ATTACK_PROJECTION_SUPPORT_PROFILE,
    );
    expect(
      parseSupportedUnitFeatureProfile(unit, [
        { className: "monk", level: classLevel(1) },
      ]),
    ).toEqual(
      expect.objectContaining({
        kind: "martialArtsAttackProjection",
        unit,
        classLevel: classLevel(1),
        martialArts: {
          condition: { kind: "unarmoredUnshieldedOnlyMonkWeapons" },
          bonusActionAttack: { kind: "unarmedStrike" },
          damageReplacement: {
            scope: "unarmedOrMonkWeapon",
            dice: 1,
            dieSize: 6,
          },
          abilitySubstitution: {
            use: "dex",
            replaces: "str",
            on: ["attackRoll", "damageRoll", "unarmedStrikeSaveDc"],
          },
        },
      }),
    );
  });

  test("monk_martial_arts admission requires its Bonus Action Unarmed Strike grant", () => {
    const unit = unitLibrary.requireUnit(monkMartialArtsUnitId);
    expect(unit.kind).toBe("class_feature");
    if (unit.kind !== "class_feature") {
      throw new Error("Expected Monk Martial Arts to be a class feature.");
    }
    expect(unit.mechanics.family).toBe("passive");
    if (unit.mechanics.family !== "passive") {
      throw new Error("Expected Monk Martial Arts to use passive mechanics.");
    }
    const attackProjectionUnit: UnitRecord = {
      ...unit,
      mechanics: {
        ...unit.mechanics,
        grants: unit.mechanics.grants.filter(
          (grant) => grant.kind !== "grant_bonus_action_attack",
        ),
      },
    };

    expect(
      battleMartialArtsAttackProjectionSupportForUnit(attackProjectionUnit),
    ).toBe("unsupported");
    expect(
      parseSupportedUnitFeatureProfile(attackProjectionUnit, [
        { className: "monk", level: classLevel(1) },
      ]),
    ).toBeNull();
  });

  test.each([
    { level: 1, dieSize: 6 },
    { level: 5, dieSize: 8 },
    { level: 11, dieSize: 10 },
    { level: 17, dieSize: 12 },
  ] as const)(
    "monk_martial_arts attack projection uses the Martial Arts die at Monk level $level",
    ({ level, dieSize }) => {
      const unit = unitLibrary.requireUnit(monkMartialArtsUnitId);

      expect(
        parseSupportedUnitFeatureProfile(unit, [
          { className: "monk", level: classLevel(level) },
        ]),
      ).toEqual(
        expect.objectContaining({
          kind: "martialArtsAttackProjection",
          classLevel: classLevel(level),
          martialArts: expect.objectContaining({
            damageReplacement: {
              scope: "unarmedOrMonkWeapon",
              dice: 1,
              dieSize,
            },
            abilitySubstitution: {
              use: "dex",
              replaces: "str",
              on: ["attackRoll", "damageRoll", "unarmedStrikeSaveDc"],
            },
          }),
        }),
      );
    },
  );

  test("monk_martial_arts rejects non-SRD Martial Arts die tier tables", () => {
    const unit = unitLibrary.requireUnit(monkMartialArtsUnitId);
    if (unit.kind !== "class_feature" || unit.mechanics.family !== "passive") {
      throw new Error("Expected Monk Martial Arts passive mechanics.");
    }
    const effect = unit.mechanics.grants.find(
      (grant) => grant.kind === "replace_damage_die",
    );
    if (effect?.kind !== "replace_damage_die") {
      throw new Error("Expected Monk Martial Arts damage replacement.");
    }
    if (effect.die.kind !== "threshold_tiers") {
      throw new Error("Expected Monk Martial Arts threshold tiers.");
    }
    const die = effect.die;
    const malformedDice = [
      {
        name: "wrong_base_die",
        die: { ...die, base: { ...die.base, dieSize: 4 } },
      },
      {
        name: "wrong_threshold",
        die: {
          ...die,
          tiers: die.tiers.map((tier) =>
            tier.atLevel === 11 ? { ...tier, atLevel: 10 } : tier,
          ),
        },
      },
      {
        name: "wrong_tier_die",
        die: {
          ...die,
          tiers: die.tiers.map((tier) =>
            tier.atLevel === 17
              ? { ...tier, override: { ...tier.override, dieSize: 10 } }
              : tier,
          ),
        },
      },
      {
        name: "missing_tier",
        die: {
          ...die,
          tiers: die.tiers.filter((tier) => tier.atLevel !== 17),
        },
      },
      {
        name: "extra_tier",
        die: {
          ...die,
          tiers: [...die.tiers, { atLevel: 20, override: { dieSize: 12 } }],
        },
      },
    ];

    for (const malformed of malformedDice) {
      const malformedUnit = unitMechanicsVariant(unit, {
        id: `monk_martial_arts_${malformed.name}`,
        mechanics: {
          ...unit.mechanics,
          grants: unit.mechanics.grants.map((grant) =>
            grant.kind === "replace_damage_die"
              ? { ...grant, die: malformed.die }
              : grant,
          ),
        },
      });

      expect(
        parseSupportedUnitFeatureProfile(malformedUnit, [
          { className: "monk", level: classLevel(17) },
        ]),
      ).toBeNull();
      expect(
        battleMartialArtsAttackProjectionSupportForUnit(malformedUnit),
      ).toBe("unsupported");
    }
  });

  test("monk_monks_focus admits executable battle options against the shared Focus Point resource", () => {
    const unit = unitLibrary.requireUnit(monkMonksFocusUnitId);
    const supportProfile = {
      kind: MONK_FOCUS_BATTLE_OPTIONS_SUPPORT_PROFILE,
      flurryOfBlows: {
        displayName: "Flurry of Blows",
        focusPointCost: 1,
        strikeCount: 2,
      },
      patientDefense: {
        displayName: "Patient Defense",
        freeAction: "disengage",
        focusPointCost: 1,
        focusActions: ["disengage", "dodge"],
      },
      stepOfTheWind: {
        displayName: "Step of the Wind",
        freeAction: "dash",
        focusPointCost: 1,
        focusActions: ["disengage", "dash"],
        jumpDistanceMultiplier: { multiplier: 2 },
      },
    } as const;

    expect(battleMonkFocusBattleOptionsSupportForUnit(unit)).toEqual(
      supportProfile,
    );
    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: monkMonksFocusUnitId,
        supportProfiles: [supportProfile],
      }),
    );
  });

  test("monk_monks_focus admission requires exact battle execution coverage for initial options", () => {
    const unit = unitLibrary.requireUnit(monkMonksFocusUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "resource_container"
    ) {
      throw new Error("Expected Monk's Focus resource container mechanics.");
    }
    const malformedUnit = unitMechanicsVariant(unit, {
      id: "monk_monks_focus_extra_initial_option",
      mechanics: {
        ...unit.mechanics,
        optionSet: {
          ...unit.mechanics.optionSet,
          initialOptions: [
            ...unit.mechanics.optionSet.initialOptions,
            {
              id: "synthetic_focus_option",
              displayName: "Synthetic Focus Option",
            },
          ],
        },
      },
    });

    expect(battleMonkFocusBattleOptionsSupportForUnit(malformedUnit)).toBe(
      "unsupported",
    );
    expect(
      parseSupportedUnitFeatureProfile(malformedUnit, [
        { className: "monk", level: classLevel(2) },
      ]),
    ).toBeNull();
  });

  test("monk_deflect_attacks projects zero-damage redirect executable facts", () => {
    const unit = unitLibrary.requireUnit(monkDeflectAttacksUnitId);
    const supportProfile =
      ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE;

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: monkDeflectAttacksUnitId,
        supportProfiles: [supportProfile],
      }),
    );
    expect(battleReactionRollOrDamageReductionSupportForUnit(unit)).toBe(
      supportProfile,
    );
    expect(
      parseSupportedUnitFeatureProfile(unit, [
        { className: "monk", level: classLevel(5) },
      ]),
    ).toEqual(
      expect.objectContaining({
        kind: "reactionRollOrDamageReduction",
        unit,
        classLevel: classLevel(5),
        modifiers: [
          {
            kind: "attackDamageReduction",
            damageIncludes: ["bludgeoning", "piercing", "slashing"],
            reduction: {
              kind: "dicePlusAbilityModifierPlusClassLevel",
              dieSize: 10,
              ability: "dex",
            },
            zeroDamageRedirect: {
              spends: { resourceUnitId: "monk_monks_focus", amount: 1 },
              save: {
                ability: "dex",
                dc: {
                  kind: "abilityPlusProficiency",
                  base: 8,
                  ability: "wis",
                },
              },
              damage: {
                dice: { dice: 2, dieSize: 8 },
                ability: "dex",
                damageType: "sameTypeDealtByAttack",
              },
              targetGate: {
                melee: "visibleWithin5Feet",
                ranged: "visibleWithin60FeetWithoutTotalCover",
              },
            },
          },
        ],
      }),
    );
  });

  test("monk_deflect_attacks rejects malformed redirect projection facts", () => {
    const unit = unitLibrary.requireUnit(monkDeflectAttacksUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "reaction_roll_or_damage_reduction"
    ) {
      throw new Error("Expected Deflect Attacks reaction modifier mechanics.");
    }
    const malformedModifier = unit.mechanics.modifiers.map((modifier) =>
      modifier.kind === "attack_damage_reduction" &&
      "zeroDamageRedirect" in modifier
        ? {
            ...modifier,
            zeroDamageRedirect: {
              ...modifier.zeroDamageRedirect,
              damage: {
                ...modifier.zeroDamageRedirect.damage,
                dice: {
                  ...modifier.zeroDamageRedirect.damage.dice,
                  dieSize: { kind: "d8" },
                },
              },
            },
          }
        : modifier,
    );
    const malformedUnit = {
      ...unit,
      mechanics: {
        ...unit.mechanics,
        modifiers: malformedModifier,
      },
      // Cast justification: this fixture intentionally violates the authored
      // Deflect Attacks Martial Arts die projection invariant while preserving
      // the rest of the real UnitRecord fixture.
    } as unknown as UnitRecord;

    expect(
      battleReactionRollOrDamageReductionSupportForUnit(malformedUnit),
    ).toBe("unsupported");
  });

  test("monk_deflect_attacks rejects redirect resource costs for a different Unit", () => {
    const unit = unitLibrary.requireUnit(monkDeflectAttacksUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "reaction_roll_or_damage_reduction"
    ) {
      throw new Error("Expected Deflect Attacks reaction modifier mechanics.");
    }
    const malformedModifier = unit.mechanics.modifiers.map((modifier) =>
      modifier.kind === "attack_damage_reduction" &&
      "zeroDamageRedirect" in modifier
        ? {
            ...modifier,
            zeroDamageRedirect: {
              ...modifier.zeroDamageRedirect,
              spends: {
                ...modifier.zeroDamageRedirect.spends,
                resourceUnitId: "wrong_deflect_attacks_resource",
              },
            },
          }
        : modifier,
    );
    const malformedUnit = {
      ...unit,
      mechanics: {
        ...unit.mechanics,
        modifiers: malformedModifier,
      },
      // Cast justification: this fixture intentionally violates the authored
      // Deflect Attacks resource ownership invariant while preserving the rest
      // of the real UnitRecord fixture.
    } as unknown as UnitRecord;

    expect(
      battleReactionRollOrDamageReductionSupportForUnit(malformedUnit),
    ).toBe("unsupported");
  });
});

describe("QMBT8 deterministic Unit feature admission expansion", () => {
  test("fighter_action_surge is admitted and projected through production feature support", () => {
    const unit = unitLibrary.requireUnit(fighterActionSurgeUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "fighter", level: classLevel(2) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({ unitId: fighterActionSurgeUnitId, supportProfiles: [] }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "extraActionGrant",
        unit,
        restriction: { kind: "exclude", actions: ["magic"] },
      }),
    );
  });

  test("fighter_improved_critical is admitted through production feature support", () => {
    const unit = unitLibrary.requireUnit(fighterImprovedCriticalUnitId);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: fighterImprovedCriticalUnitId,
        supportProfiles: [WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE],
      }),
    );
  });

  test("barbarian_rage is admitted and projected through production feature support", () => {
    const unit = unitLibrary.requireUnit(barbarianRageUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "barbarian", level: classLevel(1) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({ unitId: barbarianRageUnitId, supportProfiles: [] }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "ongoingFeature",
        unit,
        activationTrigger: "bonusAction",
        spendsUse: true,
        lifecycle: {
          kind: "roundExtended",
          initialExpiration: "endOfNextTurn",
          maximumDurationRounds: 100,
          earlyEndConditions: ["incapacitated"],
          earlyEndArmorCategories: ["heavy"],
          extensionTriggers: [
            "attackRollAgainstEnemy",
            "bonusAction",
            "enemySavingThrow",
          ],
        },
        concentrationEffect: "breakAndPrevent",
        actionRestrictions: ["spellcasting"],
        rollModifiers: [],
        damageModifiers: [
          {
            amount: 2,
            abilityFilter: ["str"],
          },
        ],
        resistances: ["bludgeoning", "piercing", "slashing"],
      }),
    );
  });

  test("rogue_cunning_action is admitted through production feature support", () => {
    const unit = unitLibrary.requireUnit(rogueCunningActionUnitId);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: rogueCunningActionUnitId,
        supportProfiles: [
          {
            kind: "alternateActionCost",
            from: {
              kind: "standardAction",
              actions: ALTERNATE_ACTION_COST_ACTIONS,
            },
            to: { kind: "bonusAction" },
          },
        ],
      }),
    );
  });

  test("rogue_uncanny_dodge is admitted and projected through production feature support", () => {
    const unit = unitLibrary.requireUnit(rogueUncannyDodgeUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "rogue", level: classLevel(5) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: rogueUncannyDodgeUnitId,
        supportProfiles: [REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "reactionRollOrDamageReduction",
        unit,
        classLevel: classLevel(5),
        modifiers: [
          {
            kind: "attackDamageReduction",
            requiresVisibleAttacker: true,
            reduction: { kind: "halfDamage" },
          },
        ],
      }),
    );
  });

  test("rogue_sneak_attack is admitted and projected through production feature support", () => {
    const unit = unitLibrary.requireUnit(rogueSneakAttackUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "rogue", level: classLevel(1) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: rogueSneakAttackUnitId,
        supportProfiles: [ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "attackDamageRider",
        unit,
        optional: true,
        usageLimit: "oncePerTurn",
        trigger: "finesseOrRangedAttackWithAdvantageOrAlly",
        eligibility:
          "advantageOrNonIncapacitatedAllyWithin5ftOfTargetWithoutDisadvantage",
        classLevel: classLevel(1),
        dice: {
          kind: "classLevelTable",
          dieSize: 6,
          diceByLevel: [
            { atLevel: 1, count: 1 },
            { atLevel: 3, count: 2 },
            { atLevel: 5, count: 3 },
            { atLevel: 7, count: 4 },
            { atLevel: 9, count: 5 },
            { atLevel: 11, count: 6 },
            { atLevel: 13, count: 7 },
            { atLevel: 15, count: 8 },
            { atLevel: 17, count: 9 },
            { atLevel: 19, count: 10 },
          ],
        },
      }),
    );
  });

  test("barbarian_frenzy is admitted as a mandatory Rage/Reckless damage rider", () => {
    const unit = unitLibrary.requireUnit(barbarianFrenzyUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "barbarian", level: classLevel(3) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: barbarianFrenzyUnitId,
        supportProfiles: [ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "attackDamageRider",
        unit,
        optional: false,
        usageLimit: "oncePerTurn",
        trigger: "rageActiveRecklessStrengthWeaponOrUnarmedStrikeFirstHit",
        classLevel: classLevel(3),
        dice: { kind: "rageDamageBonus", dieSize: 6 },
      }),
    );
  });
});
