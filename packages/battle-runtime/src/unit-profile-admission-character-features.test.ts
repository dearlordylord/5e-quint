// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT7 fighter_second_wind barbarian_reckless_attack rogue_evasion
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT8 fighter_action_surge fighter_improved_critical barbarian_rage rogue_cunning_action rogue_uncanny_dodge rogue_sneak_attack
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT59 monk_deflect_attacks
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT62 fighter_tactical_mind
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT65 bard_cutting_words
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV72A bard_bardic_inspiration
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV75A sorcerer_innate_sorcery
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV73A monk_martial_arts
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.bardic-inspiration-grant unit-feature.failed-ability-check-resource-boost unit-feature.innate-sorcery-activation unit-feature.martial-arts-attack-projection unit-feature.reaction-roll-or-damage-reduction
import { describe, expect, test } from "vitest";
import {
  ALTERNATE_ACTION_COST_ACTIONS,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
  BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE,
  Either,
  FAILED_ABILITY_CHECK_RESOURCE_BOOST_SUPPORT_PROFILE,
  MARTIAL_ARTS_ATTACK_PROJECTION_SUPPORT_PROFILE,
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
  SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
  WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
  barbarianRageUnitId,
  barbarianRecklessAttackUnitId,
  bardBardicInspirationUnitId,
  bardCuttingWordsUnitId,
  battleBardicInspirationGrantSupportForUnit,
  battleFailedAbilityCheckResourceBoostSupportForUnit,
  battleMartialArtsAttackProjectionSupportForUnit,
  battleReactionRollOrDamageReductionSupportForUnit,
  battleUnitRefWithSupportProfiles,
  classLevel,
  elapsedTimeTicks,
  fighterActionSurgeUnitId,
  fighterImprovedCriticalUnitId,
  fighterSecondWindUnitId,
  fighterTacticalMindUnitId,
  monkDeflectAttacksUnitId,
  monkMartialArtsUnitId,
  movementFeet,
  parseSupportedUnitFeatureProfile,
  rogueCunningActionUnitId,
  rogueEvasionUnitId,
  rogueSneakAttackUnitId,
  rogueUncannyDodgeUnitId,
  sorcererInnateSorceryUnitId,
  unitMechanicsVariant,
  unitLibrary,
} from "./unit-profile-admission-test-support.ts";
import type { UnitRecord } from "./unit-profile-admission-test-support.ts";

describe("QMBT7 deterministic Unit profile admission", () => {
  test("fighter_second_wind is admitted and projected through production feature support", () => {
    const unit = unitLibrary.requireUnit(fighterSecondWindUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "fighter", level: classLevel(1) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({ unitId: fighterSecondWindUnitId, supportProfiles: [] }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "selfBonusActionHealing",
        unit,
        dice: 1,
        dieSize: 10,
        flatBase: 1,
        flatPerLevel: 1,
        startingAtLevel: 1,
        className: "fighter",
        classLevel: classLevel(1),
      }),
    );
  });

  test("barbarian_reckless_attack is admitted and projected through production feature support", () => {
    const unit = unitLibrary.requireUnit(barbarianRecklessAttackUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "barbarian", level: classLevel(2) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: barbarianRecklessAttackUnitId,
        supportProfiles: [],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "ongoingFeature",
        unit,
        activationTrigger: "firstAttackRoll",
        spendsUse: false,
        lifecycle: {
          kind: "turnBoundary",
          initialExpiration: "startOfNextTurn",
          earlyEndConditions: [],
          earlyEndArmorCategories: [],
          extensionTriggers: [],
        },
        actionRestrictions: [],
        rollModifiers: [
          {
            mode: "advantage",
            affects: "selfRoll",
            on: "attackRoll",
            abilityFilter: ["str"],
          },
          {
            mode: "advantage",
            affects: "rollsAgainstSelf",
            on: "attackRoll",
          },
        ],
        damageModifiers: [],
        resistances: [],
      }),
    );
  });

  test("rogue_evasion is admitted and projected through production feature support", () => {
    const unit = unitLibrary.requireUnit(rogueEvasionUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "rogue", level: classLevel(7) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: rogueEvasionUnitId,
        supportProfiles: [SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "saveDamageReplacement",
        unit,
        ability: "dex",
        requiredSuccessDamage: "half",
        onSuccess: "none",
        onFail: "half",
        suppressedByCondition: "incapacitated",
      }),
    );
  });
});

describe("QMBT62 Tactical Mind deterministic Unit profile admission", () => {
  test("fighter_tactical_mind is admitted from failed ability-check resource boost mechanics", () => {
    const unit = unitLibrary.requireUnit(fighterTacticalMindUnitId);
    const supportProfile = {
      kind: FAILED_ABILITY_CHECK_RESOURCE_BOOST_SUPPORT_PROFILE,
      abilityCheck: {
        trigger: "failedAbilityCheck",
        bonus: { dice: 1, dieSize: 10 },
        spends: { resourceUnitId: fighterSecondWindUnitId },
        refundSpendOnStillFailed: true,
      },
    } as const;

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: fighterTacticalMindUnitId,
        supportProfiles: [supportProfile],
      }),
    );
    expect(battleFailedAbilityCheckResourceBoostSupportForUnit(unit)).toEqual(
      supportProfile,
    );
    expect(
      parseSupportedUnitFeatureProfile(unit, [
        { className: "fighter", level: classLevel(2) },
      ]),
    ).toEqual(
      expect.objectContaining({
        kind: "failedAbilityCheckResourceBoost",
        unit,
        abilityCheck: supportProfile.abilityCheck,
      }),
    );
  });

  test("fighter_tactical_mind rejects malformed dice and unrelated ability-check feature shapes", () => {
    const unit = unitLibrary.requireUnit(fighterTacticalMindUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "failed_ability_check_resource_boost"
    ) {
      throw new Error("Expected Tactical Mind Unit mechanics.");
    }
    const malformedDice = {
      ...unit,
      mechanics: {
        ...unit.mechanics,
        bonus: {
          kind: "dice" as const,
          expr: { dice: 1 as const, dieSize: 8 as const },
        },
      },
      // Cast justification: this fixture intentionally violates the authored
      // Tactical Mind d10 mechanics invariant; the guard above keeps every
      // other field sourced from a real UnitRecord fixture.
    } as unknown as UnitRecord;

    expect(
      battleFailedAbilityCheckResourceBoostSupportForUnit(malformedDice),
    ).toBe("unsupported");
    expect(
      battleFailedAbilityCheckResourceBoostSupportForUnit(
        unitLibrary.requireUnit(fighterSecondWindUnitId),
      ),
    ).toBeNull();
  });
});

describe("QMBT65 Cutting Words deterministic Unit profile admission", () => {
  test("bard_bardic_inspiration is admitted as a Bonus Action grant profile", () => {
    const unit = unitLibrary.requireUnit(bardBardicInspirationUnitId);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: bardBardicInspirationUnitId,
        supportProfiles: [BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE],
      }),
    );
    expect(battleBardicInspirationGrantSupportForUnit(unit)).toBe(
      BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE,
    );
    expect(
      parseSupportedUnitFeatureProfile(unit, [
        { className: "bard", level: classLevel(1) },
      ]),
    ).toEqual(
      expect.objectContaining({
        kind: "bardicInspirationGrant",
        unit,
        rangeFeet: movementFeet(60),
        dieSize: 6,
        durationTicks: elapsedTimeTicks(600),
        spends: { resourceUnitId: bardBardicInspirationUnitId, amount: 1 },
      }),
    );
  });

  test.each([
    { level: 1, dieSize: 6 },
    { level: 5, dieSize: 8 },
    { level: 10, dieSize: 10 },
    { level: 15, dieSize: 12 },
  ] as const)(
    "bard_bardic_inspiration grant profile projects the Bardic die at Bard level $level",
    ({ level, dieSize }) => {
      const unit = unitLibrary.requireUnit(bardBardicInspirationUnitId);

      expect(
        parseSupportedUnitFeatureProfile(unit, [
          { className: "bard", level: classLevel(level) },
        ]),
      ).toEqual(
        expect.objectContaining({ kind: "bardicInspirationGrant", dieSize }),
      );
    },
  );

  test("bard_bardic_inspiration rejects malformed grant mechanics", () => {
    const unit = unitLibrary.requireUnit(bardBardicInspirationUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "activation"
    ) {
      throw new Error("Expected Bardic Inspiration activation mechanics.");
    }
    const malformedUnit = {
      ...unit,
      mechanics: {
        ...unit.mechanics,
        range: { kind: "point" as const, feet: 30 },
      },
      // Cast justification: this fixture intentionally violates the authored
      // Bardic Inspiration 60-foot grant invariant while preserving the rest
      // of the real UnitRecord fixture.
    } as unknown as UnitRecord;

    expect(battleBardicInspirationGrantSupportForUnit(malformedUnit)).toBe(
      "unsupported",
    );
  });

  test("bard_bardic_inspiration rejects non-SRD Bardic die tier tables", () => {
    const unit = unitLibrary.requireUnit(bardBardicInspirationUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "activation"
    ) {
      throw new Error("Expected Bardic Inspiration activation mechanics.");
    }
    const phase = unit.mechanics.phases[0];
    if (phase?.kind !== "direct") {
      throw new Error("Expected Bardic Inspiration direct phase.");
    }
    const effect = phase.effects?.[0];
    if (
      effect?.kind !== "grant_die_token" ||
      effect.die.kind !== "threshold_tiers"
    ) {
      throw new Error("Expected Bardic Inspiration grant-die token.");
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
            tier.atLevel === 5 ? { ...tier, atLevel: 4 } : tier,
          ),
        },
      },
      {
        name: "wrong_tier_die",
        die: {
          ...die,
          tiers: die.tiers.map((tier) =>
            tier.atLevel === 10
              ? { ...tier, override: { ...tier.override, dieSize: 12 } }
              : tier,
          ),
        },
      },
      {
        name: "missing_tier",
        die: {
          ...die,
          tiers: die.tiers.filter((tier) => tier.atLevel !== 15),
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
        id: `bard_bardic_inspiration_${malformed.name}`,
        mechanics: {
          ...unit.mechanics,
          phases: [
            {
              ...phase,
              effects: [{ ...effect, die: malformed.die }],
            },
          ],
        },
      });

      expect(
        parseSupportedUnitFeatureProfile(malformedUnit, [
          { className: "bard", level: classLevel(15) },
        ]),
      ).toBeNull();
      expect(battleBardicInspirationGrantSupportForUnit(malformedUnit)).toBe(
        "unsupported",
      );
    }
  });

  test("bard_cutting_words is admitted from reaction roll-or-damage reduction mechanics", () => {
    const unit = unitLibrary.requireUnit(bardCuttingWordsUnitId);
    const supportProfile = REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE;

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: bardCuttingWordsUnitId,
        supportProfiles: [supportProfile],
      }),
    );
    expect(battleReactionRollOrDamageReductionSupportForUnit(unit)).toBe(
      supportProfile,
    );
    expect(
      parseSupportedUnitFeatureProfile(unit, [
        { className: "bard", level: classLevel(3) },
      ]),
    ).toEqual(
      expect.objectContaining({
        kind: "reactionRollOrDamageReduction",
        unit,
        classLevel: classLevel(3),
        modifiers: [
          {
            kind: "attackRollReduction",
            rangeFeet: movementFeet(60),
            requiresVisibleCreature: true,
            reduction: {
              kind: "resourceDie",
              dice: 1,
              dieSize: 6,
              flatModifier: 0,
              spends: { resourceUnitId: bardCuttingWordsUnitId, amount: 1 },
            },
          },
          {
            kind: "abilityCheckReduction",
            rangeFeet: movementFeet(60),
            requiresVisibleCreature: true,
            reduction: {
              kind: "resourceDie",
              dice: 1,
              dieSize: 6,
              flatModifier: 0,
              spends: { resourceUnitId: bardCuttingWordsUnitId, amount: 1 },
            },
          },
          {
            kind: "attackDamageRollReduction",
            rangeFeet: movementFeet(60),
            requiresVisibleCreature: true,
            reduction: {
              kind: "resourceDie",
              dice: 1,
              dieSize: 6,
              flatModifier: 0,
              spends: { resourceUnitId: bardCuttingWordsUnitId, amount: 1 },
            },
          },
        ],
      }),
    );
  });

  test("bard_cutting_words rejects malformed ability-check reduction mechanics", () => {
    const unit = unitLibrary.requireUnit(bardCuttingWordsUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "reaction_roll_or_damage_reduction"
    ) {
      throw new Error("Expected Cutting Words reaction modifier mechanics.");
    }
    const malformedAbilityCheckModifier = unit.mechanics.modifiers.map(
      (modifier) =>
        modifier.kind === "ability_check_reduction"
          ? {
              ...modifier,
              trigger: {
                ...modifier.trigger,
                requiresVisibleCreature: false,
              },
            }
          : modifier,
    );
    const malformedUnit = {
      ...unit,
      mechanics: {
        ...unit.mechanics,
        modifiers: malformedAbilityCheckModifier,
      },
      // Cast justification: this fixture intentionally violates the authored
      // Cutting Words visible-creature trigger invariant while preserving the
      // rest of the real UnitRecord fixture.
    } as unknown as UnitRecord;

    expect(
      battleReactionRollOrDamageReductionSupportForUnit(malformedUnit),
    ).toBe("unsupported");
  });

  test("bard_cutting_words rejects malformed ability-check reduction range", () => {
    const unit = unitLibrary.requireUnit(bardCuttingWordsUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "reaction_roll_or_damage_reduction"
    ) {
      throw new Error("Expected Cutting Words reaction modifier mechanics.");
    }
    const malformedAbilityCheckModifier = unit.mechanics.modifiers.map(
      (modifier) =>
        modifier.kind === "ability_check_reduction"
          ? {
              ...modifier,
              trigger: {
                ...modifier.trigger,
                rangeFeet: 30,
              },
            }
          : modifier,
    );
    const malformedUnit = {
      ...unit,
      mechanics: {
        ...unit.mechanics,
        modifiers: malformedAbilityCheckModifier,
      },
      // Cast justification: this fixture intentionally violates the authored
      // Cutting Words 60-foot trigger invariant while preserving the rest of
      // the real UnitRecord fixture.
    } as unknown as UnitRecord;

    expect(
      battleReactionRollOrDamageReductionSupportForUnit(malformedUnit),
    ).toBe("unsupported");
  });

  test("bard_cutting_words rejects malformed reduction resource projection facts", () => {
    const unit = unitLibrary.requireUnit(bardCuttingWordsUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "reaction_roll_or_damage_reduction"
    ) {
      throw new Error("Expected Cutting Words reaction modifier mechanics.");
    }
    const malformedUnit = {
      ...unit,
      mechanics: {
        ...unit.mechanics,
        resource: {
          kind: "use_count" as const,
          cap: { kind: "ability_modifier" as const, ability: "wis" as const },
        },
      },
      // Cast justification: this fixture intentionally violates the authored
      // Bardic Inspiration Charisma-use projection invariant while preserving
      // the rest of the real UnitRecord fixture.
    } as unknown as UnitRecord;

    expect(
      battleReactionRollOrDamageReductionSupportForUnit(malformedUnit),
    ).toBe("unsupported");
  });

  test("bard_cutting_words projects Bardic Inspiration die size by class level", () => {
    const unit = unitLibrary.requireUnit(bardCuttingWordsUnitId);

    expect(
      parseSupportedUnitFeatureProfile(unit, [
        { className: "bard", level: classLevel(5) },
      ]),
    ).toEqual(
      expect.objectContaining({
        kind: "reactionRollOrDamageReduction",
        modifiers: expect.arrayContaining([
          expect.objectContaining({
            kind: "attackRollReduction",
            reduction: expect.objectContaining({ dieSize: 8 }),
          }),
          expect.objectContaining({
            kind: "abilityCheckReduction",
            reduction: expect.objectContaining({ dieSize: 8 }),
          }),
          expect.objectContaining({
            kind: "attackDamageRollReduction",
            reduction: expect.objectContaining({ dieSize: 8 }),
          }),
        ]),
      }),
    );
  });
});

describe("SRDINV75A Innate Sorcery deterministic Unit profile admission", () => {
  test("sorcerer_innate_sorcery is admitted as a fixed-duration Bonus Action activation", () => {
    const unit = unitLibrary.requireUnit(sorcererInnateSorceryUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "sorcerer", level: classLevel(1) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: sorcererInnateSorceryUnitId,
        supportProfiles: [],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "ongoingFeature",
        unit,
        activationTrigger: "bonusAction",
        spendsUse: true,
        lifecycle: {
          kind: "fixedDuration",
          maximumDurationRounds: 10,
          earlyEndConditions: [],
          earlyEndArmorCategories: [],
          extensionTriggers: [],
        },
        actionRestrictions: [],
        rollModifiers: [],
        spellModifiers: [
          {
            saveDcBonus: 1,
            attackRollMode: "advantage",
          },
        ],
        damageModifiers: [],
        resistances: [],
      }),
    );
  });
});

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
              spends: { resourceUnitId: monkDeflectAttacksUnitId, amount: 1 },
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
        weaponFilter: "finesseOrRanged",
        eligibility:
          "advantageOrNonIncapacitatedAllyWithin5ftOfTargetWithoutDisadvantage",
        classLevel: classLevel(1),
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
      }),
    );
  });
});
