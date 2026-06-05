// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L13UG-A16 cleric_disciple_of_life cleric_preserve_life druid_lands_aid warlock_dark_ones_blessing
import { describe, expect, test } from "vitest";
import {
  clericDiscipleOfLifeUnitId,
  clericPreserveLifeUnitId,
  druidLandsAidUnitId,
  fighterSecondWindUnitId,
  subclassClericLifeDomainUnitId,
  subclassDruidCircleOfTheLandUnitId,
  subclassWarlockFiendPatronUnitId,
  unitLibrary,
  unitMechanicsVariant,
  warlockDarkOnesBlessingUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  battleEnemyZeroHitPointTemporaryHitPointsSupportForUnit,
  battleMagicActionAreaSaveDamageHealingSupportForUnit,
  battleMagicActionHealingPoolSupportForUnit,
  battleSpellSlotHealingModifierSupportForUnit,
  battleUnitRefWithSupportProfiles,
  classLevel,
  Either,
  ENEMY_ZERO_HIT_POINT_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
  MAGIC_ACTION_AREA_SAVE_DAMAGE_HEALING_SUPPORT_PROFILE,
  MAGIC_ACTION_HEALING_POOL_SUPPORT_PROFILE,
  movementFeet,
  parseSupportedUnitFeatureProfile,
  SPELL_SLOT_HEALING_MODIFIER_SUPPORT_PROFILE,
} from "./unit-profile-admission-test-support.ts";

describe("L13UG-A16 level-3 heal and damage feature admission", () => {
  test("selected SRD subclasses grant the admitted level-3 feature Units", () => {
    const lifeDomain = unitLibrary.requireUnit(subclassClericLifeDomainUnitId);
    const circleOfTheLand = unitLibrary.requireUnit(
      subclassDruidCircleOfTheLandUnitId,
    );
    const fiendPatron = unitLibrary.requireUnit(
      subclassWarlockFiendPatronUnitId,
    );

    expect(lifeDomain).toMatchObject({
      kind: "subclass",
      className: "cleric",
      featureGrants: expect.arrayContaining([
        { level: 3, unitId: clericDiscipleOfLifeUnitId },
        { level: 3, unitId: clericPreserveLifeUnitId },
      ]),
    });
    expect(circleOfTheLand).toMatchObject({
      kind: "subclass",
      className: "druid",
      featureGrants: expect.arrayContaining([
        { level: 3, unitId: druidLandsAidUnitId },
      ]),
    });
    expect(fiendPatron).toMatchObject({
      kind: "subclass",
      className: "warlock",
      featureGrants: expect.arrayContaining([
        { level: 3, unitId: warlockDarkOnesBlessingUnitId },
      ]),
    });
  });

  test("cleric_disciple_of_life is admitted as a Spell Slot healing modifier", () => {
    const unit = unitLibrary.requireUnit(clericDiscipleOfLifeUnitId);
    const supportProfile = {
      kind: SPELL_SLOT_HEALING_MODIFIER_SUPPORT_PROFILE,
      healingModifier: {
        trigger: {
          kind: "casterSpellSlotRestoresHitPoints",
          timing: "turnSpellIsCast",
        },
        appliesTo: "eachCreatureHealedBySpell",
        bonus: { kind: "flatPlusSpellSlotLevel", flat: 2 },
      },
    } as const;

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: clericDiscipleOfLifeUnitId,
        supportProfiles: [supportProfile],
      }),
    );
    expect(battleSpellSlotHealingModifierSupportForUnit(unit)).toEqual(
      supportProfile,
    );
    expect(
      parseSupportedUnitFeatureProfile(unit, [
        { className: "cleric", level: classLevel(3) },
      ]),
    ).toEqual(
      expect.objectContaining({
        kind: "spellSlotHealingModifier",
        unit,
        healingModifier: supportProfile.healingModifier,
      }),
    );
  });

  test("cleric_disciple_of_life rejects malformed healing bonus shapes", () => {
    const unit = unitLibrary.requireUnit(clericDiscipleOfLifeUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "spell_slot_healing_modifier"
    ) {
      throw new Error("Expected Disciple of Life healing modifier mechanics.");
    }
    const malformedUnit = unitMechanicsVariant(unit, {
      id: "cleric_disciple_of_life_wrong_flat",
      mechanics: {
        ...unit.mechanics,
        bonus: { kind: "flat_plus_spell_slot_level", flat: 1 },
      },
    });

    expect(battleSpellSlotHealingModifierSupportForUnit(malformedUnit)).toBe(
      "unsupported",
    );
    expect(
      battleSpellSlotHealingModifierSupportForUnit(
        unitLibrary.requireUnit(fighterSecondWindUnitId),
      ),
    ).toBeNull();
  });

  test("cleric_preserve_life is admitted as a Magic Action healing pool", () => {
    const unit = unitLibrary.requireUnit(clericPreserveLifeUnitId);
    const supportProfile = {
      kind: MAGIC_ACTION_HEALING_POOL_SUPPORT_PROFILE,
      healingPool: {
        activationCost: { kind: "standardAction", action: "magic" },
        spends: { resourceUnitId: "cleric_channel_divinity", amount: 1 },
        rangeFeet: movementFeet(30),
        targetSelection: {
          mode: "anyNumber",
          targetKinds: ["creature"],
          stateFilter: ["bloodied"],
          includesSelf: true,
        },
        pool: { kind: "classLevelMultiplier", multiplier: 5 },
        perTargetCap: "halfHitPointMaximum",
      },
    } as const;

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: clericPreserveLifeUnitId,
        supportProfiles: [supportProfile],
      }),
    );
    expect(battleMagicActionHealingPoolSupportForUnit(unit)).toEqual(
      supportProfile,
    );
    expect(
      parseSupportedUnitFeatureProfile(unit, [
        { className: "cleric", level: classLevel(3) },
      ]),
    ).toEqual(
      expect.objectContaining({
        kind: "magicActionHealingPool",
        unit,
        healingPool: supportProfile.healingPool,
      }),
    );
  });

  test("cleric_preserve_life rejects malformed resource references", () => {
    const unit = unitLibrary.requireUnit(clericPreserveLifeUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "magic_action_healing_pool"
    ) {
      throw new Error("Expected Preserve Life healing pool mechanics.");
    }
    const malformedUnit = unitMechanicsVariant(unit, {
      id: "cleric_preserve_life_wrong_resource",
      mechanics: {
        ...unit.mechanics,
        spends: { ...unit.mechanics.spends, resourceUnitId: unit.id },
      },
    });

    expect(battleMagicActionHealingPoolSupportForUnit(malformedUnit)).toBe(
      "unsupported",
    );
    expect(
      battleMagicActionHealingPoolSupportForUnit(
        unitLibrary.requireUnit(fighterSecondWindUnitId),
      ),
    ).toBeNull();
  });

  test("druid_lands_aid is admitted as a Magic Action area save damage/healing profile", () => {
    const unit = unitLibrary.requireUnit(druidLandsAidUnitId);
    const fixedTwoD6Amount = {
      kind: "fixed",
      expr: { dice: 2, dieSize: 6 },
    } as const;
    const landsAidScalingAmount = {
      kind: "threshold_tiers",
      axis: "class",
      base: { dice: 2, dieSize: 6 },
      tiers: [
        { atLevel: 10, override: { dice: 3 } },
        { atLevel: 14, override: { dice: 4 } },
      ],
    } as const;
    const supportProfile = {
      kind: MAGIC_ACTION_AREA_SAVE_DAMAGE_HEALING_SUPPORT_PROFILE,
      damageHealing: {
        activationCost: { kind: "standardAction", action: "magic" },
        spends: { resourceUnitId: "druid_wild_shape", amount: 1 },
        area: {
          origin: { kind: "pointWithinRange", rangeFeet: movementFeet(60) },
          shape: { kind: "sphere", radiusFeet: movementFeet(10) },
        },
        save: { ability: "con", dc: "classSpellcastingSpellSaveDc" },
        damage: {
          targetSelection: "creaturesOfYourChoiceInArea",
          amount: fixedTwoD6Amount,
          damageType: "necrotic",
          onSuccess: "halfDamage",
        },
        healing: {
          targetSelection: "oneCreatureOfYourChoiceInArea",
          amount: fixedTwoD6Amount,
        },
      },
    } as const;

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: druidLandsAidUnitId,
        supportProfiles: [supportProfile],
      }),
    );
    expect(battleMagicActionAreaSaveDamageHealingSupportForUnit(unit)).toEqual(
      supportProfile,
    );
    expect(unit).toMatchObject({
      mechanics: {
        damage: { amount: landsAidScalingAmount },
        healing: { amount: landsAidScalingAmount },
      },
    });
    expect(
      parseSupportedUnitFeatureProfile(unit, [
        { className: "druid", level: classLevel(3) },
      ]),
    ).toEqual(
      expect.objectContaining({
        kind: "magicActionAreaSaveDamageHealing",
        unit,
        damageHealing: supportProfile.damageHealing,
      }),
    );
    expect(parseSupportedUnitFeatureProfile(unit, [])).toBeNull();
    expect(
      parseSupportedUnitFeatureProfile(unit, [
        { className: "druid", level: classLevel(10) },
      ]),
    ).toEqual(
      expect.objectContaining({
        damageHealing: expect.objectContaining({
          damage: expect.objectContaining({
            amount: { kind: "fixed", expr: { dice: 3, dieSize: 6 } },
          }),
          healing: expect.objectContaining({
            amount: { kind: "fixed", expr: { dice: 3, dieSize: 6 } },
          }),
        }),
      }),
    );
    expect(
      parseSupportedUnitFeatureProfile(unit, [
        { className: "druid", level: classLevel(14) },
      ]),
    ).toEqual(
      expect.objectContaining({
        damageHealing: expect.objectContaining({
          damage: expect.objectContaining({
            amount: { kind: "fixed", expr: { dice: 4, dieSize: 6 } },
          }),
          healing: expect.objectContaining({
            amount: { kind: "fixed", expr: { dice: 4, dieSize: 6 } },
          }),
        }),
      }),
    );
  });

  test("druid_lands_aid rejects malformed save success semantics", () => {
    const unit = unitLibrary.requireUnit(druidLandsAidUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "magic_action_area_save_damage_healing"
    ) {
      throw new Error("Expected Land's Aid damage/healing mechanics.");
    }
    const malformedUnit = unitMechanicsVariant(unit, {
      id: "druid_lands_aid_wrong_success_damage",
      mechanics: {
        ...unit.mechanics,
        damage: { ...unit.mechanics.damage, onSuccess: "no_damage" },
      },
    });

    expect(
      battleMagicActionAreaSaveDamageHealingSupportForUnit(malformedUnit),
    ).toBe("unsupported");
    expect(
      battleMagicActionAreaSaveDamageHealingSupportForUnit(
        unitLibrary.requireUnit(fighterSecondWindUnitId),
      ),
    ).toBeNull();
  });

  test("druid_lands_aid rejects malformed Druid-level scaling", () => {
    const unit = unitLibrary.requireUnit(druidLandsAidUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "magic_action_area_save_damage_healing"
    ) {
      throw new Error("Expected Land's Aid damage/healing mechanics.");
    }
    const malformedUnit = unitMechanicsVariant(unit, {
      id: "druid_lands_aid_wrong_scaling",
      mechanics: {
        ...unit.mechanics,
        damage: {
          ...unit.mechanics.damage,
          amount: {
            ...unit.mechanics.damage.amount,
            tiers: [{ atLevel: 10, override: { dice: 4 } }],
          },
        },
      },
    });

    expect(
      battleMagicActionAreaSaveDamageHealingSupportForUnit(malformedUnit),
    ).toBe("unsupported");
    expect(
      parseSupportedUnitFeatureProfile(malformedUnit, [
        { className: "druid", level: classLevel(10) },
      ]),
    ).toBeNull();
  });

  test("warlock_dark_ones_blessing is admitted as enemy-zero-Hit-Point Temporary Hit Points", () => {
    const unit = unitLibrary.requireUnit(warlockDarkOnesBlessingUnitId);
    const supportProfile = {
      kind: ENEMY_ZERO_HIT_POINT_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
      temporaryHitPoints: {
        trigger: {
          kind: "enemyReducedToZeroHitPoints",
          bySelf: true,
          byOtherWithinFeet: movementFeet(10),
        },
        amount: {
          kind: "abilityModifierPlusClassLevel",
          ability: "cha",
          minimum: 1,
        },
      },
    } as const;

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: warlockDarkOnesBlessingUnitId,
        supportProfiles: [supportProfile],
      }),
    );
    expect(
      battleEnemyZeroHitPointTemporaryHitPointsSupportForUnit(unit),
    ).toEqual(supportProfile);
    expect(
      parseSupportedUnitFeatureProfile(unit, [
        { className: "warlock", level: classLevel(3) },
      ]),
    ).toEqual(
      expect.objectContaining({
        kind: "enemyZeroHitPointTemporaryHitPoints",
        unit,
        temporaryHitPoints: supportProfile.temporaryHitPoints,
      }),
    );
  });

  test("warlock_dark_ones_blessing rejects malformed Temporary Hit Points minimums", () => {
    const unit = unitLibrary.requireUnit(warlockDarkOnesBlessingUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "enemy_zero_hit_point_temporary_hit_points"
    ) {
      throw new Error(
        "Expected Dark One's Blessing Temporary Hit Points mechanics.",
      );
    }
    const malformedUnit = unitMechanicsVariant(unit, {
      id: "warlock_dark_ones_blessing_wrong_minimum",
      mechanics: {
        ...unit.mechanics,
        amount: { ...unit.mechanics.amount, minimum: 0 },
      },
    });

    expect(
      battleEnemyZeroHitPointTemporaryHitPointsSupportForUnit(malformedUnit),
    ).toBe("unsupported");
    expect(
      battleEnemyZeroHitPointTemporaryHitPointsSupportForUnit(
        unitLibrary.requireUnit(fighterSecondWindUnitId),
      ),
    ).toBeNull();
  });
});
