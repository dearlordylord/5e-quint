// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT7 fighter_second_wind barbarian_reckless_attack rogue_evasion
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT62 fighter_tactical_mind
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT65 bard_cutting_words
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV72A bard_bardic_inspiration
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV75A sorcerer_innate_sorcery
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.bardic-inspiration-grant unit-feature.failed-ability-check-resource-boost unit-feature.innate-sorcery-activation unit-feature.reaction-roll-or-damage-reduction
import { describe, expect, test } from "vitest";
import {
  barbarianRecklessAttackUnitId,
  bardBardicInspirationUnitId,
  bardCuttingWordsUnitId,
  fighterSecondWindUnitId,
  fighterTacticalMindUnitId,
  rogueEvasionUnitId,
  sorcererInnateSorceryUnitId,
  unitLibrary,
  unitMechanicsVariant,
} from "./unit-profile-admission-catalog-support.ts";
import {
  BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE,
  battleBardicInspirationGrantSupportForUnit,
  battleFailedAbilityCheckResourceBoostSupportForUnit,
  battleReactionRollOrDamageReductionSupportForUnit,
  battleUnitRefWithSupportProfiles,
  classLevel,
  Either,
  elapsedTimeTicks,
  FAILED_ABILITY_CHECK_RESOURCE_BOOST_SUPPORT_PROFILE,
  movementFeet,
  parseSupportedUnitFeatureProfile,
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
  SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
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
