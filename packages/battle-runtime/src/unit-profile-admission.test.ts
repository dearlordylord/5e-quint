// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT7 fighter_second_wind barbarian_reckless_attack rogue_evasion
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT8 fighter_action_surge fighter_improved_critical barbarian_rage rogue_cunning_action rogue_uncanny_dodge rogue_sneak_attack
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT14 acid_splash mage_armor magic_missile ray_of_frost
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT22 shield
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT25 healing_word
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT32 cure_wounds mass_healing_word
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT34 mass_cure_wounds
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT21 mycelium_step
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT18 defense
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT27 feat_archery
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT31 feat_savage_attacker
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT37 fighter_extra_attack paladin_extra_attack ranger_extra_attack
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT40 barbarian_fast_movement
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT44 ranger_roving
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT47 orc_relentless_endurance
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT53 orc_adrenaline_rush
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT56 feat_boon_of_combat_prowess
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT59 monk_deflect_attacks
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT62 fighter_tactical_mind
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT65 bard_cutting_words
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.failed-ability-check-resource-boost unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.zero-hit-point-replacement
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";

import myceliumStepInput from "../../../plans/unit-profile-coverage/fixtures/classic-non-srd/mycelium_step.json";
import {
  abilityModifier,
  defaultArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import { classLevel } from "@dnd/shared/types";
import {
  attackBonus,
  difficultyClass,
  DieRollResult,
  Hp,
  movementDeltaFeet,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord, UnitRecord } from "@dnd/surface/surface/types";

import {
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
  ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE,
  ATTACK_ROLL_MISS_TO_HIT_REPLACEMENT_SUPPORT_PROFILE,
  FAILED_ABILITY_CHECK_RESOURCE_BOOST_SUPPORT_PROFILE,
  PASSIVE_ARMOR_CLASS_BONUS_SUPPORT_PROFILE,
  PASSIVE_RANGED_ATTACK_ROLL_BONUS_SUPPORT_PROFILE,
  battleCombatantSide,
  battleId,
  battleReactionRollOrDamageReductionSupportForUnit,
  battleUnitRefWithSupportProfiles,
  cantripSpellInvocationRef,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
  resolveBattleReaction,
  resolveBattleSubject,
  SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
  snapshotBattle,
  spellSlotInvocationRef,
  startBattle,
  WEAPON_DAMAGE_DICE_ROLL_CHOICE_SUPPORT_PROFILE,
  WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
  ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type BattleSubject,
  type CombatantId,
  type SupportedSpellInvocation,
} from "./index.ts";
import { characterBattleResourceForUnit } from "./character-battle-resources.ts";
import {
  ALTERNATE_ACTION_COST_ACTIONS,
  BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
  PASSIVE_SPEED_BONUS_SUPPORT_PROFILE,
  PASSIVE_SPEED_KIND_GRANTS_SUPPORT_PROFILE,
  battleFailedAbilityCheckResourceBoostSupportForUnit,
  bonusActionDashTemporaryHitPointsProfileForUnit,
  battlePassiveSpeedKindGrantsSupportForUnit,
  parseSupportedUnitFeatureProfile,
  type ClassicNonSrdMechanicsUnit,
} from "./unit-feature-support.ts";

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("QMBT7 Unit profile admission test Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;
const fighterSecondWindUnitId = "fighter_second_wind";
const fighterActionSurgeUnitId = "fighter_action_surge";
const fighterTacticalMindUnitId = "fighter_tactical_mind";
const fighterImprovedCriticalUnitId = "fighter_improved_critical";
const fighterExtraAttackUnitId = "fighter_extra_attack";
const barbarianRageUnitId = "barbarian_rage";
const barbarianRecklessAttackUnitId = "barbarian_reckless_attack";
const barbarianFastMovementUnitId = "barbarian_fast_movement";
const rangerRovingUnitId = "ranger_roving";
const orcAdrenalineRushUnitId = "orc_adrenaline_rush";
const orcRelentlessEnduranceUnitId = "orc_relentless_endurance";
const rogueCunningActionUnitId = "rogue_cunning_action";
const rogueEvasionUnitId = "rogue_evasion";
const rogueUncannyDodgeUnitId = "rogue_uncanny_dodge";
const rogueSneakAttackUnitId = "rogue_sneak_attack";
const bardCuttingWordsUnitId = "bard_cutting_words";
const monkDeflectAttacksUnitId = "monk_deflect_attacks";
const defenseUnitId = "defense";
const myceliumStepUnitId = "mycelium_step";
const archeryUnitId = "feat_archery";
const boonOfCombatProwessUnitId = "feat_boon_of_combat_prowess";
const savageAttackerUnitId = "feat_savage_attacker";
const acidSplashUnitId = "acid_splash";
const fireBoltUnitId = "fire_bolt";
const mageArmorUnitId = "mage_armor";
const magicMissileUnitId = "magic_missile";
const cureWoundsUnitId = "cure_wounds";
const healingWordUnitId = "healing_word";
const massCureWoundsUnitId = "mass_cure_wounds";
const massHealingWordUnitId = "mass_healing_word";
const rayOfFrostUnitId = "ray_of_frost";
const shieldUnitId = "shield";
const paladinExtraAttackUnitId = "paladin_extra_attack";
const rangerExtraAttackUnitId = "ranger_extra_attack";
const archerySupportProfile = {
  kind: PASSIVE_RANGED_ATTACK_ROLL_BONUS_SUPPORT_PROFILE,
  attackRoll: {
    bonus: 2,
    weaponFilter: { kind: "weaponCategory", category: "ranged" },
  },
} as const;
const extraAttackSupportProfile = {
  kind: ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE,
  additionalAttacks: 1,
} as const;
const combatProwessSupportProfile = {
  kind: ATTACK_ROLL_MISS_TO_HIT_REPLACEMENT_SUPPORT_PROFILE,
  replacement: {
    optional: true,
    trigger: "missWithAttackRoll",
    effect: "replaceMissWithHit",
    resetCadence: "startOfNextTurn",
  },
} as const;
const spellCasterId = combatantId("unit-profile-spell-caster");
const spellTargetId = combatantId("unit-profile-spell-target");
const massHealingTargetIds = [
  spellTargetId,
  combatantId("unit-profile-spell-target-2"),
  combatantId("unit-profile-spell-target-3"),
  combatantId("unit-profile-spell-target-4"),
  combatantId("unit-profile-spell-target-5"),
  combatantId("unit-profile-spell-target-6"),
  combatantId("unit-profile-spell-target-7"),
] as const;
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");
type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};
type BonusActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "bonusActionSpell" }
  >;
};
type PassiveFeatUnit = Extract<UnitRecord, { readonly kind: "feat" }> & {
  readonly mechanics: Extract<
    Extract<UnitRecord, { readonly kind: "feat" }>["mechanics"],
    { readonly family: "passive" }
  >;
};

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

describe("QMBT68 Monk Deflect Attacks deterministic Unit profile admission", () => {
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

describe("QMBT18 deterministic unsupported feature profile slice", () => {
  test("defense is admitted and projected as a passive Armor Class bonus while wearing armor", () => {
    const unit = unitLibrary.requireUnit(defenseUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, []);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: defenseUnitId,
        supportProfiles: [PASSIVE_ARMOR_CLASS_BONUS_SUPPORT_PROFILE],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "passiveArmorClassBonus",
        unit,
        armorClass: {
          bonus: 1,
          condition: {
            kind: "wearingArmor",
            categories: ["light", "medium", "heavy"],
          },
        },
      }),
    );
  });

  test("archery is admitted and projected as a passive ranged weapon attack-roll bonus", () => {
    const unit = unitLibrary.requireUnit(archeryUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, []);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: archeryUnitId,
        supportProfiles: [archerySupportProfile],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "passiveRangedAttackRollBonus",
        unit,
        attackRoll: {
          bonus: 2,
          weaponFilter: {
            kind: "weaponCategory",
            category: "ranged",
          },
        },
      }),
    );
  });

  test("archery support projection adds +2 to ranged weapon attack rolls", () => {
    const state = archeryBattle({
      attack: zeroAbilityWeaponAttack("weapon_shortbow"),
    });
    const attackRollHole = weaponAttackRollHole({
      state,
      attackName: "Shortbow",
      actorId: spellCasterId,
      targetId: spellTargetId,
    });

    expect(attackRollHole).toMatchObject({
      kind: "attackRoll",
      label: "Shortbow attack roll",
      attackBonus: 2,
      attack: {
        kind: "weapon",
        weapon: { id: "weapon_shortbow", usage: "ranged" },
      },
    });
  });

  test("archery support projection applies once with duplicate support refs", () => {
    const archeryUnitRef = archeryBattleUnitRef();
    const state = archeryBattle({
      attack: zeroAbilityWeaponAttack("weapon_shortbow"),
      characterUnitRefs: [archeryUnitRef, archeryUnitRef],
    });
    const attackRollHole = weaponAttackRollHole({
      state,
      attackName: "Shortbow",
      actorId: spellCasterId,
      targetId: spellTargetId,
    });

    expect(attackRollHole).toMatchObject({
      kind: "attackRoll",
      label: "Shortbow attack roll",
      attackBonus: 2,
      attack: {
        kind: "weapon",
        weapon: { id: "weapon_shortbow", usage: "ranged" },
      },
    });
  });

  test("archery support projection does not add +2 to melee weapon attack rolls", () => {
    const state = archeryBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const attackRollHole = weaponAttackRollHole({
      state,
      attackName: "Longsword",
      actorId: spellCasterId,
      targetId: spellTargetId,
    });

    expect(attackRollHole).toMatchObject({
      kind: "attackRoll",
      label: "Longsword attack roll",
      attackBonus: 0,
      attack: {
        kind: "weapon",
        weapon: { id: "weapon_longsword", usage: "melee" },
      },
    });
  });

  test("archery support gate rejects adjacent passive roll bonus shapes", () => {
    const unit = archeryFeatureUnit();
    const [effect] = unit.mechanics.grants;
    if (effect?.kind !== "modify_roll_numeric") {
      throw new Error("Expected Archery numeric roll modifier.");
    }
    const adjacentPassiveRollUnits = [
      {
        ...unit,
        id: "test_archery_saving_throw_bonus",
        mechanics: {
          ...unit.mechanics,
          grants: [{ ...effect, on: ["saving_throw"] }],
        },
      },
      {
        ...unit,
        id: "test_archery_melee_attack_bonus",
        mechanics: {
          ...unit.mechanics,
          grants: [
            {
              ...effect,
              weaponFilter: { kind: "weapon_category", category: "melee" },
            },
          ],
        },
      },
    ] as const satisfies readonly UnitRecord[];

    for (const adjacentUnit of adjacentPassiveRollUnits) {
      expect(
        battleUnitRefWithSupportProfiles({
          unitRef: { unitId: adjacentUnit.id },
          unit: adjacentUnit,
        }),
      ).toEqual(
        Either.left({
          tag: "battleUnitSupportProfileIssue",
          message: `Unsupported battle passive ranged attack-roll bonus Unit hook: ${adjacentUnit.id}.`,
        }),
      );
      expect(parseSupportedUnitFeatureProfile(adjacentUnit, [])).toBeNull();
    }
  });
});

describe("QMBT56 deterministic Combat Prowess profile slice", () => {
  test("boon of combat prowess is admitted as an attack-roll miss-to-hit replacement", () => {
    const unit = unitLibrary.requireUnit(boonOfCombatProwessUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, []);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: boonOfCombatProwessUnitId,
        supportProfiles: [combatProwessSupportProfile],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "attackRollMissToHitReplacement",
        unit,
        replacement: combatProwessSupportProfile.replacement,
      }),
    );
  });

  test("peerless aim can replace a missed weapon attack with the ordinary hit damage path", () => {
    const state = combatProwessBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const subject = weaponAttackSubject("Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        ],
      }),
      "attackRoll",
    );

    expect(roll).toMatchObject({
      missToHitReplacements: [
        { unitId: boonOfCombatProwessUnitId, label: boonOfCombatProwessUnitId },
      ],
    });

    const awaitingDamage = resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        attackRollFill(roll, {
          total: 1,
          naturalD20: 2,
          missToHitReplacementUnitId: boonOfCombatProwessUnitId,
        }),
      ],
    });
    const damage = requireResultHole(awaitingDamage, "rolledDice");
    if (awaitingDamage.tag !== "needsHoles") {
      throw new Error("Expected Peerless Aim weapon attack to need damage.");
    }
    const resolved = resolveBattleSubject({
      state: awaitingDamage.state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        attackRollFill(roll, {
          total: 1,
          naturalD20: 2,
          missToHitReplacementUnitId: boonOfCombatProwessUnitId,
        }),
        damageRollFillWithGroups(damage, [[4]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Peerless Aim weapon attack to resolve.");
    }
    expect(
      resolved.state.combatants
        .get(spellCasterId)
        ?.attackRollMissToHitReplacementsUsedSinceTurnStart.map(
          (usage) => usage.unitId,
        ),
    ).toEqual([boonOfCombatProwessUnitId]);
  });

  test("peerless aim survives attack-hit reaction replay before damage", () => {
    const state = combatProwessBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
      targetPreparedSpells: [spellRecord(shieldUnitId)],
    });
    const subject = weaponAttackSubject("Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        ],
      }),
      "attackRoll",
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        attackRollFill(roll, {
          total: 1,
          naturalD20: 2,
          missToHitReplacementUnitId: boonOfCombatProwessUnitId,
        }),
      ],
    });
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingReaction: { trigger: "attackHit" } },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Peerless Aim hit to open Shield reaction.");
    }
    const shieldChoice =
      awaitingReaction.snapshot.pendingReaction?.choices.find(
        (choice) =>
          choice.kind === "castTriggeredReactionSpell" &&
          choice.reactorId === spellTargetId,
      );
    if (
      shieldChoice === undefined ||
      shieldChoice.kind !== "castTriggeredReactionSpell"
    ) {
      throw new Error("Expected Shield reaction choice.");
    }
    const afterShield = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(
        requireHole(awaitingReaction.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: spellTargetId,
          choice: {
            kind: "castTriggeredReactionSpell",
            invocation: shieldChoice.invocation,
            fills: [],
          },
        },
      ),
    });
    expect(afterShield).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
      snapshot: { pendingReaction: null },
    });
    if (afterShield.tag !== "needsHoles") {
      throw new Error("Expected replayed Peerless Aim attack to need damage.");
    }
    const damage = requireHole(afterShield.holes, "rolledDice");
    const resolved = resolveBattleSubject({
      state: afterShield.state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        attackRollFill(roll, {
          total: 1,
          naturalD20: 2,
          missToHitReplacementUnitId: boonOfCombatProwessUnitId,
        }),
        damageRollFillWithGroups(damage, [[4]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Peerless Aim weapon attack to resolve.");
    }
    expect(
      resolved.state.combatants
        .get(spellCasterId)
        ?.attackRollMissToHitReplacementsUsedSinceTurnStart.map(
          (usage) => usage.unitId,
        ),
    ).toEqual([boonOfCombatProwessUnitId]);
  });

  test("pending peerless aim replay cannot authorize a different attack roll", () => {
    const spell = spellRecord(rayOfFrostUnitId);
    const state = combatProwessBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
      cantrips: [spell],
    });
    const subject = weaponAttackSubject("Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        ],
      }),
      "attackRoll",
    );
    const awaitingDamage = resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        attackRollFill(roll, {
          total: 1,
          naturalD20: 2,
          missToHitReplacementUnitId: boonOfCombatProwessUnitId,
        }),
      ],
    });
    expect(awaitingDamage).toMatchObject({ tag: "needsHoles" });
    if (awaitingDamage.tag !== "needsHoles") {
      throw new Error("Expected Peerless Aim weapon attack to need damage.");
    }

    const act = spellAct({
      state: awaitingDamage.state,
      spellId: rayOfFrostUnitId,
    });
    const spellTarget = requireResultHole(
      resolveBattleSubject({
        state: awaitingDamage.state,
        subject: act.subject,
        fills: [],
      }),
      "targetChoice",
    );
    const spellRoll = requireResultHole(
      resolveBattleSubject({
        state: awaitingDamage.state,
        subject: act.subject,
        fills: [
          spellTargetFill(
            spellTarget,
            rayOfFrostUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "attackRoll",
    );
    expect(spellRoll).not.toHaveProperty("missToHitReplacements");

    expect(
      resolveBattleSubject({
        state: awaitingDamage.state,
        subject: act.subject,
        fills: [
          spellTargetFill(
            spellTarget,
            rayOfFrostUnitId,
            spellCasterId,
            spellTargetId,
          ),
          attackRollFill(spellRoll, {
            total: 1,
            naturalD20: 2,
            missToHitReplacementUnitId: boonOfCombatProwessUnitId,
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test("declining peerless aim leaves the miss unresolved as a miss", () => {
    const state = combatProwessBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const subject = weaponAttackSubject("Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        ],
      }),
      "attackRoll",
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
          attackRollFill(roll, { total: 1, naturalD20: 2 }),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });
  });

  test("peerless aim applies to Unarmed Strike and spell attack misses", () => {
    const unarmedState = combatProwessBattle({ attack: null });
    const unarmedSubject: Extract<BattleSubject, { readonly tag: "action" }> = {
      tag: "action",
      actorId: spellCasterId,
      action: "attack",
      attackName: "Unarmed Strike",
    };
    const unarmedTarget = requireResultHole(
      resolveBattleSubject({
        state: unarmedState,
        subject: unarmedSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const unarmedRoll = requireResultHole(
      resolveBattleSubject({
        state: unarmedState,
        subject: unarmedSubject,
        fills: [attackTargetFill(unarmedTarget, spellCasterId, spellTargetId)],
      }),
      "attackRoll",
    );
    expect(
      resolveBattleSubject({
        state: unarmedState,
        subject: unarmedSubject,
        fills: [
          attackTargetFill(unarmedTarget, spellCasterId, spellTargetId),
          attackRollFill(unarmedRoll, {
            total: 1,
            naturalD20: 1,
            missToHitReplacementUnitId: boonOfCombatProwessUnitId,
          }),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });

    const spell = spellRecord(rayOfFrostUnitId);
    const spellState = combatProwessBattle({
      attack: null,
      cantrips: [spell],
    });
    const act = spellAct({ state: spellState, spellId: rayOfFrostUnitId });
    const spellTarget = requireResultHole(
      resolveBattleSubject({
        state: spellState,
        subject: act.subject,
        fills: [],
      }),
      "targetChoice",
    );
    const spellRoll = requireResultHole(
      resolveBattleSubject({
        state: spellState,
        subject: act.subject,
        fills: [
          spellTargetFill(
            spellTarget,
            rayOfFrostUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "attackRoll",
    );
    const spellDamage = resolveBattleSubject({
      state: spellState,
      subject: act.subject,
      fills: [
        spellTargetFill(
          spellTarget,
          rayOfFrostUnitId,
          spellCasterId,
          spellTargetId,
        ),
        attackRollFill(spellRoll, {
          total: 1,
          naturalD20: 2,
          missToHitReplacementUnitId: boonOfCombatProwessUnitId,
        }),
      ],
    });
    expect(spellDamage).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "rolledDice" })],
    });
    if (spellDamage.tag !== "needsHoles") {
      throw new Error("Expected Peerless Aim spell attack to need damage.");
    }
    expect(
      resolveBattleSubject({
        state: spellDamage.state,
        subject: act.subject,
        fills: [
          spellTargetFill(
            spellTarget,
            rayOfFrostUnitId,
            spellCasterId,
            spellTargetId,
          ),
          attackRollFill(spellRoll, {
            total: 1,
            naturalD20: 2,
            missToHitReplacementUnitId: boonOfCombatProwessUnitId,
          }),
          damageRollFillWithGroups(
            requireHole(spellDamage.holes, "rolledDice"),
            [[4]],
          ),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });
  });

  test("peerless aim cannot be reused before start of turn and resets at start of next turn", () => {
    const state = combatProwessBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const subject = weaponAttackSubject("Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        ],
      }),
      "attackRoll",
    );
    const damage = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
          attackRollFill(roll, {
            total: 1,
            naturalD20: 2,
            missToHitReplacementUnitId: boonOfCombatProwessUnitId,
          }),
        ],
      }),
      "rolledDice",
    );
    const used = resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        attackRollFill(roll, {
          total: 1,
          naturalD20: 2,
          missToHitReplacementUnitId: boonOfCombatProwessUnitId,
        }),
        damageRollFillWithGroups(damage, [[4]]),
      ],
    });
    expect(used).toMatchObject({ tag: "resolved" });
    if (used.tag !== "resolved") {
      throw new Error("Expected first Peerless Aim attack to resolve.");
    }

    expect(
      used.state.combatants
        .get(spellCasterId)
        ?.attackRollMissToHitReplacementsUsedSinceTurnStart.map(
          (usage) => usage.unitId,
        ),
    ).toEqual([boonOfCombatProwessUnitId]);

    const afterTargetTurn = resolveBattleSubject({
      state: used.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endTurn",
      },
      fills: [],
    });
    expect(afterTargetTurn).toMatchObject({ tag: "resolved" });
    if (afterTargetTurn.tag !== "resolved") {
      throw new Error("Expected end turn to resolve.");
    }
    const reset = resolveBattleSubject({
      state: afterTargetTurn.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellTargetId,
        command: "endTurn",
      },
      fills: [],
    });
    expect(reset).toMatchObject({ tag: "resolved" });
    if (reset.tag !== "resolved") {
      throw new Error("Expected second end turn to resolve.");
    }

    expect(
      reset.state.combatants.get(spellCasterId)
        ?.attackRollMissToHitReplacementsUsedSinceTurnStart,
    ).toEqual([]);
    expect(
      weaponAttackRollHole({
        state: reset.state,
        attackName: "Longsword",
        actorId: spellCasterId,
        targetId: spellTargetId,
      }),
    ).toMatchObject({
      missToHitReplacements: [
        { unitId: boonOfCombatProwessUnitId, label: boonOfCombatProwessUnitId },
      ],
    });
  });

  test("adjacent roll replacement shapes remain unsupported for the profile", () => {
    const unit = unitLibrary.requireUnit(boonOfCombatProwessUnitId);
    expect(unit.kind).toBe("feat");
    if (unit.kind !== "feat") {
      throw new Error("Expected Boon of Combat Prowess feat Unit.");
    }
    const adjacentUnits = [
      {
        ...unit,
        id: "test_combat_prowess_required",
        mechanics: { ...unit.mechanics, optional: false },
      },
      {
        ...unit,
        id: "test_combat_prowess_long_rest",
        mechanics: { ...unit.mechanics, resetCadence: { kind: "long_rest" } },
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
          message: `Unsupported battle attack-roll miss-to-hit replacement Unit hook: ${adjacentUnit.id}.`,
        }),
      );
      expect(parseSupportedUnitFeatureProfile(adjacentUnit, [])).toBeNull();
    }
  });
});

describe("QMBT31 deterministic Savage Attacker profile slice", () => {
  test("savage attacker is admitted and projected as a weapon damage dice roll choice", () => {
    const unit = unitLibrary.requireUnit(savageAttackerUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, []);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: savageAttackerUnitId,
        supportProfiles: [WEAPON_DAMAGE_DICE_ROLL_CHOICE_SUPPORT_PROFILE],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "weaponDamageDiceRollChoice",
        unit,
        damageDiceChoice: {
          optional: true,
          trigger: "weaponHit",
          usageLimit: "oncePerTurn",
          diceScope: "weaponDamageDice",
          choose: "eitherRoll",
        },
      }),
    );
  });

  test("savage attacker support projection chooses either weapon damage dice candidate on a weapon hit", () => {
    const state = savageAttackerBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const subject = weaponAttackSubject("Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        ],
      }),
      "attackRoll",
    );
    const damage = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
          attackRollFill(roll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    expect(damage).toMatchObject({
      kind: "rolledDice",
      weaponDamageDiceRollChoiceUnitIds: [savageAttackerUnitId],
    });

    const resolved = resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
        damageRollFillWithGroups(damage, [[8]], undefined, {
          unitId: savageAttackerUnitId,
          selection: "second",
          candidates: [
            { results: [DieRollResult(2)] },
            { results: [DieRollResult(8)] },
          ],
        }),
      ],
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          weaponDamageDiceRollChoicesUsedThisTurn: [
            { attackerId: spellCasterId, unitId: savageAttackerUnitId },
          ],
        },
      },
    });
  });

  test("savage attacker critical-hit candidates are full doubled weapon dice pools", () => {
    const state = savageAttackerBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const subject = weaponAttackSubject("Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        ],
      }),
      "attackRoll",
    );
    const damage = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
          attackRollFill(roll, { total: 20, naturalD20: 20 }),
        ],
      }),
      "rolledDice",
    );

    expect(damage).toMatchObject({
      kind: "rolledDice",
      weaponDamageDiceRollChoiceUnitIds: [savageAttackerUnitId],
    });

    const resolved = resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        attackRollFill(roll, { total: 20, naturalD20: 20 }),
        damageRollFillWithGroups(damage, [[2, 3]], undefined, {
          unitId: savageAttackerUnitId,
          selection: "second",
          candidates: [
            { results: [DieRollResult(1), DieRollResult(2)] },
            { results: [DieRollResult(2), DieRollResult(3)] },
          ],
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          weaponDamageDiceRollChoicesUsedThisTurn: [
            { attackerId: spellCasterId, unitId: savageAttackerUnitId },
          ],
        },
      },
    });
  });

  test("savage attacker rerolls only weapon dice when the hit has an attack damage rider", () => {
    const state = savageAttackerBattle({
      attack: zeroAbilityWeaponAttack("weapon_shortbow"),
      classLevels: [{ className: "rogue", level: classLevel(1) }],
      characterUnitRefs: [
        savageAttackerBattleUnitRef(),
        attackDamageRiderBattleUnitRef(),
      ],
      unitFeatures: [{ unit: unitLibrary.requireUnit(rogueSneakAttackUnitId) }],
    });
    const subject = weaponAttackSubject("Shortbow");
    const target = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Shortbow"),
        ],
      }),
      "attackRoll",
    );
    const damage = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Shortbow"),
          attackRollFill(roll, {
            total: 15,
            naturalD20: 10,
            rollMode: "advantage",
          }),
        ],
      }),
      "rolledDice",
    );

    expect(damage).toMatchObject({
      kind: "rolledDice",
      attackDamageRiders: [
        {
          attackerId: spellCasterId,
          unitId: rogueSneakAttackUnitId,
          label: "Sneak Attack",
          damage: { dice: 1, dieSize: 6, damageType: "piercing" },
        },
      ],
      weaponDamageDiceRollChoiceUnitIds: [savageAttackerUnitId],
    });

    const resolved = resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId, "Shortbow"),
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          rollMode: "advantage",
        }),
        damageRollFillWithGroups(damage, [[5], [6]], [rogueSneakAttackUnitId], {
          unitId: savageAttackerUnitId,
          selection: "second",
          candidates: [
            { results: [DieRollResult(2)] },
            { results: [DieRollResult(5)] },
          ],
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          attackDamageRidersUsedThisTurn: [
            { attackerId: spellCasterId, unitId: rogueSneakAttackUnitId },
          ],
          weaponDamageDiceRollChoicesUsedThisTurn: [
            { attackerId: spellCasterId, unitId: savageAttackerUnitId },
          ],
        },
      },
    });
  });

  test("savage attacker cannot be used after a miss or on non-weapon damage", () => {
    const weaponState = savageAttackerBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const subject = weaponAttackSubject("Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state: weaponState, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireResultHole(
      resolveBattleSubject({
        state: weaponState,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        ],
      }),
      "attackRoll",
    );
    const hitDamage = requireResultHole(
      resolveBattleSubject({
        state: weaponState,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
          attackRollFill(roll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    expect(
      resolveBattleSubject({
        state: weaponState,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
          attackRollFill(roll, { total: 1, naturalD20: 2 }),
          damageRollFillWithGroups(hitDamage, [[8]], undefined, {
            unitId: savageAttackerUnitId,
            selection: "second",
            candidates: [
              { results: [DieRollResult(2)] },
              { results: [DieRollResult(8)] },
            ],
          }),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    const unarmedState = savageAttackerBattle({ attack: null });
    const unarmedSubject = {
      tag: "action",
      actorId: spellCasterId,
      action: "attack",
      attackName: "Unarmed Strike",
    } as const satisfies Extract<BattleSubject, { readonly tag: "action" }>;
    const unarmedTarget = requireResultHole(
      resolveBattleSubject({
        state: unarmedState,
        subject: unarmedSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const unarmedRoll = requireResultHole(
      resolveBattleSubject({
        state: unarmedState,
        subject: unarmedSubject,
        fills: [
          attackTargetFill(
            unarmedTarget,
            spellCasterId,
            spellTargetId,
            "Unarmed Strike",
          ),
        ],
      }),
      "attackRoll",
    );
    const unarmedDamage = resolveBattleSubject({
      state: unarmedState,
      subject: unarmedSubject,
      fills: [
        attackTargetFill(
          unarmedTarget,
          spellCasterId,
          spellTargetId,
          "Unarmed Strike",
        ),
        attackRollFill(unarmedRoll, { total: 15, naturalD20: 10 }),
      ],
    });

    expect(unarmedDamage).not.toMatchObject({
      holes: [
        expect.objectContaining({
          weaponDamageDiceRollChoiceUnitIds: [savageAttackerUnitId],
        }),
      ],
    });
  });

  test("savage attacker is unavailable after one use in the same turn", () => {
    const base = savageAttackerBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const state: BattleState = {
      ...base,
      currentTurnResources: {
        ...base.currentTurnResources,
        weaponDamageDiceRollChoicesUsedThisTurn: [
          { attackerId: spellCasterId, unitId: savageAttackerUnitId },
        ],
      },
    };
    const subject = weaponAttackSubject("Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
        ],
      }),
      "attackRoll",
    );
    const damage = requireResultHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(target, spellCasterId, spellTargetId, "Longsword"),
          attackRollFill(roll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    expect(damage).not.toHaveProperty("weaponDamageDiceRollChoiceUnitIds");
  });

  test("savage attacker support gate rejects adjacent reroll shapes", () => {
    const unit = unitLibrary.requireUnit(savageAttackerUnitId);
    if (unit.kind !== "feat" || unit.mechanics.family !== "on_hit_trigger") {
      throw new Error("Expected Savage Attacker on-hit feat Unit.");
    }
    // The adjacent-shape fixtures intentionally mutate a decoded SRD Unit into
    // unsupported authored shapes that the current surface union does not
    // expose through a typed fixture constructor. The support gate is the local
    // evidence under test, so this cast does not cross a production boundary.
    const adjacentUnits = [
      {
        ...unit,
        id: "test_savage_attacker_required",
        mechanics: { ...unit.mechanics, optional: false },
      },
      {
        ...unit,
        id: "test_savage_attacker_other_scope",
        mechanics: {
          ...unit.mechanics,
          effect: { ...unit.mechanics.effect, diceScope: "all_damage_dice" },
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
          message: `Unsupported battle weapon damage dice roll choice Unit hook: ${adjacentUnit.id}.`,
        }),
      );
      expect(parseSupportedUnitFeatureProfile(adjacentUnit, [])).toBeNull();
    }
  });
});

describe("QMBT21 Classic non-SRD deterministic feature profile slice", () => {
  test("mycelium_step is admitted and projected through production alternate action cost support", () => {
    const unit = mechanicsOnlyClassicUnit(myceliumStepInput);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: myceliumStepUnitId,
        supportProfiles: [
          {
            kind: "alternateActionCost",
            from: {
              kind: "standardAction",
              actions: ["dash"],
            },
            to: { kind: "bonusAction" },
          },
        ],
      }),
    );
  });
});

describe("QMBT14 deterministic Spell Unit admission tracer", () => {
  test("magic_missile is admitted through catalog spell access and projected as a prepared slot spell", () => {
    const spell = spellRecord(magicMissileUnitId);
    const act = spellAct({
      state: spellBattle({ preparedSpells: [spell] }),
      spellId: magicMissileUnitId,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        "magic_missile",
        1,
        "repeatedDamageAllocation",
      ),
      mode: { tag: "cast" },
    });
    expect(spellActInvocation(act)).toEqual(
      expect.objectContaining({
        procedure: "repeatedDamageAllocation",
        spell,
        resource: { tag: "spellSlot", slotLevel: 1 },
        targeting: {
          kind: "repeatedEffectTargetAllocation",
          repeatedEffectCount: 3,
        },
        damage: {
          expr: { dice: 1, dieSize: 4, flat: 1 },
          damageType: "force",
        },
        rangeFeet: 120,
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "spellTargetAllocation",
        allocationCount: 3,
        choices: [spellCasterId, spellTargetId],
      }),
    ]);
  });

  test("ray_of_frost is admitted through catalog spell access and projected as a cantrip spell attack", () => {
    const spell = spellRecord(rayOfFrostUnitId);
    const act = spellAct({
      state: spellBattle({ cantrips: [spell] }),
      spellId: rayOfFrostUnitId,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: cantripSpellInvocationRef(
        "ray_of_frost",
        "spellAttackDamage",
      ),
      mode: { tag: "cast" },
    });
    expect(spell.mechanics.family).toBe("activation");
    expect(spell.mechanics.level).toBe(0);
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: [spellCasterId, spellTargetId],
      }),
    ]);
  });

  test("acid_splash is admitted through catalog spell access and projected as a save-gated cantrip", () => {
    const spell = spellRecord(acidSplashUnitId);
    const act = spellAct({
      state: spellBattle({ cantrips: [spell] }),
      spellId: acidSplashUnitId,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: cantripSpellInvocationRef("acid_splash", "saveGatedDamage"),
      mode: { tag: "cast" },
    });
    expect(spellActInvocation(act)).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
        spell,
        ability: "dex",
        area: {
          kind: "pointOriginSphere",
          radiusFeet: 5,
        },
        damage: {
          expr: { dice: 1, dieSize: 6 },
          damageType: "acid",
        },
        successDamage: "none",
        rangeFeet: 60,
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "savingThrowOutcome",
        areaChoices: [],
        targetRollModes: [],
      }),
    ]);
  });

  test("mage_armor is admitted through catalog spell access and projected as a persistent prepared spell", () => {
    const spell = spellRecord(mageArmorUnitId);
    const act = spellAct({
      state: spellBattle({ preparedSpells: [spell] }),
      spellId: mageArmorUnitId,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        "mage_armor",
        1,
        "persistentArmorEffect",
      ),
      mode: { tag: "cast" },
    });
    expect(spell.mechanics.family).toBe("ongoing_effect");
    expect(spell.mechanics.level).toBe(1);
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: [spellCasterId],
      }),
    ]);
  });
});

describe("QMBT15 Spell Unit admission candidate narrowing", () => {
  test("fire_bolt is not counted as deterministic admission while object targeting and burning are unprojected", () => {
    const spell = spellRecord(fireBoltUnitId);

    expect(spell.mechanics.family).toBe("activation");
    expect(spell.mechanics.level).toBe(0);
    expect(
      maybeSpellAct({
        state: spellBattle({ cantrips: [spell] }),
        spellId: fireBoltUnitId,
      }),
    ).toBeUndefined();
  });

  test("shield is admitted through catalog Spell Access and projected as a triggered Reaction spell", () => {
    const spell = spellRecord(shieldUnitId);

    expect(spell.mechanics.family).toBe("triggered_reaction");
    expect(spell.mechanics.castingTime.kind).toBe("reaction");
    expect(spell.mechanics.level).toBe(1);
    expect(
      maybeSpellAct({
        state: spellBattle({ preparedSpells: [spell] }),
        spellId: shieldUnitId,
      }),
    ).toBeUndefined();
  });
});

describe("QMBT25 deterministic Spell Unit admission re-triage", () => {
  test("healing_word is admitted through catalog spell access and projected as a Bonus Action healing spell", () => {
    const spell = spellRecord(healingWordUnitId);
    const state = spellBattle({ preparedSpells: [spell] });
    const act = bonusSpellAct({
      state,
      spellId: healingWordUnitId,
    });

    expect(act.subject).toEqual({
      tag: "bonusActionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        "healing_word",
        1,
        "directHitPointRestoration",
      ),
      mode: { tag: "cast" },
    });
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: [spellCasterId, spellTargetId],
      }),
    ]);
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const awaitingHealingRoll = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          healingWordUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    expect(awaitingHealingRoll).toMatchObject({ tag: "needsHoles" });
    if (awaitingHealingRoll.tag !== "needsHoles") {
      throw new Error("Expected Healing Word healing roll hole.");
    }

    expect(spellHoleInvocation(awaitingHealingRoll.holes)).toEqual(
      expect.objectContaining({
        procedure: "directHitPointRestoration",
        spell,
        resource: { tag: "spellSlot", slotLevel: 1 },
        healing: {
          expr: { dice: 2, dieSize: 4, flat: 3 },
        },
        rangeFeet: 60,
      }),
    );
  });
});

describe("QMBT32 deterministic direct Hit Point restoration spell admission", () => {
  test("cure_wounds is admitted through catalog spell access and projected as a Magic Action healing spell", () => {
    const spell = spellRecord(cureWoundsUnitId);
    const state = spellBattle({ preparedSpells: [spell] });
    const act = spellAct({
      state,
      spellId: cureWoundsUnitId,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        "cure_wounds",
        1,
        "directHitPointRestoration",
      ),
      mode: { tag: "cast" },
    });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const awaitingHealingRoll = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          cureWoundsUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    expect(awaitingHealingRoll).toMatchObject({ tag: "needsHoles" });
    if (awaitingHealingRoll.tag !== "needsHoles") {
      throw new Error("Expected Cure Wounds healing roll hole.");
    }
    expect(spellHoleInvocation(awaitingHealingRoll.holes)).toEqual(
      expect.objectContaining({
        procedure: "directHitPointRestoration",
        spell,
        actionCost: "magicAction",
        targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
        resource: { tag: "spellSlot", slotLevel: 1 },
        healing: {
          expr: { dice: 2, dieSize: 8, flat: 3 },
        },
        rangeFeet: 5,
      }),
    );
  });

  test("mass_healing_word is admitted as up-to-six Bonus Action healing and rejects adjacent invalid target counts", () => {
    const spell = spellRecord(massHealingWordUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      extraTargetIds: massHealingTargetIds.slice(1),
    });
    const act = bonusSpellAct({
      state,
      spellId: massHealingWordUnitId,
    });

    expect(act.subject).toEqual({
      tag: "bonusActionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        "mass_healing_word",
        3,
        "directHitPointRestoration",
      ),
      mode: { tag: "cast" },
    });
    const targetListHole = requireHole(act.initialHoles, "spellTargetList");
    expect(targetListHole).toEqual(
      expect.objectContaining({
        minTargets: 1,
        maxTargets: 6,
      }),
    );
    expect(spellHoleInvocation(act.initialHoles)).toEqual(
      expect.objectContaining({
        procedure: "directHitPointRestoration",
        actionCost: "bonusAction",
        targeting: { kind: "targetList", minTargets: 1, maxTargets: 6 },
        resource: { tag: "spellSlot", slotLevel: 3 },
        healing: {
          expr: { dice: 2, dieSize: 4, flat: 3 },
        },
      }),
    );

    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          spellTargetListFill(
            targetListHole,
            spellCasterId,
            massHealingWordUnitId,
            [],
          ),
        ],
      }),
    ).toMatchObject({ tag: "invalid" });
    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          spellTargetListFill(
            targetListHole,
            spellCasterId,
            massHealingWordUnitId,
            massHealingTargetIds,
          ),
        ],
      }),
    ).toMatchObject({ tag: "invalid" });
  });

  test("mass_cure_wounds is admitted as up-to-six point-origin Sphere Magic Action healing", () => {
    const spell = spellRecord(massCureWoundsUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 5, count: 1 }],
      extraTargetIds: massHealingTargetIds.slice(1),
    });
    const act = spellAct({
      state,
      spellId: massCureWoundsUnitId,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        "mass_cure_wounds",
        5,
        "directHitPointRestoration",
      ),
      mode: { tag: "cast" },
    });
    const targetListHole = requireHole(act.initialHoles, "spellTargetList");
    expect(targetListHole).toEqual(
      expect.objectContaining({
        minTargets: 1,
        maxTargets: 6,
      }),
    );
    expect(spellHoleInvocation(act.initialHoles)).toEqual(
      expect.objectContaining({
        procedure: "directHitPointRestoration",
        spell,
        actionCost: "magicAction",
        targeting: {
          kind: "pointOriginSphereTargetList",
          minTargets: 1,
          maxTargets: 6,
          area: { kind: "pointOriginSphere", radiusFeet: 30 },
        },
        resource: { tag: "spellSlot", slotLevel: 5 },
        healing: {
          expr: { dice: 5, dieSize: 8, flat: 3 },
        },
        rangeFeet: 60,
      }),
    );
  });

  test("mass_cure_wounds rejects target lists without one shared point-origin Sphere", () => {
    const spell = spellRecord(massCureWoundsUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 5, count: 1 }],
      extraTargetIds: massHealingTargetIds.slice(1),
    });
    const act = spellAct({
      state,
      spellId: massCureWoundsUnitId,
    });
    const targetListHole = requireHole(act.initialHoles, "spellTargetList");
    const targetIds = [spellTargetId, massHealingTargetIds[1]];

    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          {
            kind: "spellTargetList",
            holeId: targetListHole.holeId,
            value: { targetIds },
            spatialFacts: [
              {
                kind: "spellTargetsInPointOriginSphere",
                casterId: spellCasterId,
                spellId: massCureWoundsUnitId,
                areaId: "area-a",
                radiusFeet: movementFeet(30),
                targetIds: [targetIds[0]],
              },
              {
                kind: "spellTargetsInPointOriginSphere",
                casterId: spellCasterId,
                spellId: massCureWoundsUnitId,
                areaId: "area-b",
                radiusFeet: movementFeet(30),
                targetIds: [targetIds[1]],
              },
            ],
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Area healing targets must share one selected point-origin Sphere.",
    });
  });

  test("mass_cure_wounds level 6 slot scaling adds one healing die", () => {
    const spell = spellRecord(massCureWoundsUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 6, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: massCureWoundsUnitId,
      slotLevel: 6,
    });
    const targetListHole = requireHole(act.initialHoles, "spellTargetList");
    const awaitingHealingRoll = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetListFill(
          targetListHole,
          spellCasterId,
          massCureWoundsUnitId,
          [spellTargetId],
        ),
      ],
    });

    expect(awaitingHealingRoll).toMatchObject({ tag: "needsHoles" });
    if (awaitingHealingRoll.tag !== "needsHoles") {
      throw new Error("Expected Mass Cure Wounds healing roll hole.");
    }
    expect(spellHoleInvocation(awaitingHealingRoll.holes)).toEqual(
      expect.objectContaining({
        procedure: "directHitPointRestoration",
        resource: { tag: "spellSlot", slotLevel: 6 },
        healing: {
          expr: { dice: 6, dieSize: 8, flat: 3 },
        },
      }),
    );
  });
});

describe("QMBT37 deterministic Extra Attack admission", () => {
  test.each([
    [fighterExtraAttackUnitId, "fighter", 5],
    [paladinExtraAttackUnitId, "paladin", 5],
    [rangerExtraAttackUnitId, "ranger", 5],
  ] as const)(
    "%s is admitted as Attack action attack-count scaling",
    (unitId, className, level) => {
      const unit = unitLibrary.requireUnit(unitId);
      const profile = parseSupportedUnitFeatureProfile(unit, [
        { className, level: classLevel(level) },
      ]);

      expect(
        battleUnitRefWithSupportProfiles({
          unitRef: { unitId: unit.id },
          unit,
        }),
      ).toEqual(
        Either.right({
          unitId,
          supportProfiles: [extraAttackSupportProfile],
        }),
      );
      expect(profile).toEqual(
        expect.objectContaining({
          kind: "attackActionAttackCountScaling",
          unit,
          additionalAttacks: 1,
        }),
      );
    },
  );

  test("one Attack action resolves two attack slots and spends the action once", () => {
    const state = extraAttackBattle([extraAttackBattleUnitRef()]);
    const first = resolveWeaponAttack(state, "Longsword");

    expect(first).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          actionResources: [
            expect.objectContaining({
              source: "classFeatureExtraAttack",
              sourceUnitId: fighterExtraAttackUnitId,
            }),
          ],
        },
      },
    });
    if (first.tag !== "resolved") {
      throw new Error("Expected first Extra Attack slot to resolve.");
    }

    const second = resolveWeaponAttack(first.state, "Longsword");
    expect(second).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { actionResources: [] } },
    });
  });

  test("multiclass Extra Attack features do not stack into more than one added slot", () => {
    const state = extraAttackBattle([
      extraAttackBattleUnitRef(fighterExtraAttackUnitId),
      extraAttackBattleUnitRef(paladinExtraAttackUnitId),
    ]);
    const first = resolveWeaponAttack(state, "Longsword");
    expect(first).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          actionResources: [
            expect.objectContaining({
              source: "classFeatureExtraAttack",
            }),
          ],
        },
      },
    });
    if (first.tag !== "resolved") {
      throw new Error("Expected first Extra Attack slot to resolve.");
    }

    const second = resolveWeaponAttack(first.state, "Longsword");
    expect(second).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { actionResources: [] } },
    });
    if (second.tag !== "resolved") {
      throw new Error("Expected second Extra Attack slot to resolve.");
    }
    expect(discoverBattleActs(second.state)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: expect.objectContaining({
            tag: "action",
            action: "attack",
          }),
        }),
      ]),
    );
  });

  test("Movement may occur between Extra Attack attack slots", () => {
    const state = extraAttackBattle([extraAttackBattleUnitRef()]);
    const first = resolveWeaponAttack(state, "Longsword");
    expect(first.tag).toBe("resolved");
    if (first.tag !== "resolved") {
      throw new Error("Expected first Extra Attack slot to resolve.");
    }

    const moveAct = discoverBattleActs(first.state).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "move" &&
        candidate.subject.actorId === spellCasterId,
    );
    expect(moveAct).toBeDefined();
    if (moveAct === undefined) {
      throw new Error("Expected Movement between Extra Attack slots.");
    }

    const moved = resolveBattleSubject({
      state: first.state,
      subject: moveAct.subject,
      fills: [
        movementFill(requireHole(moveAct.initialHoles, "movement"), {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [],
        }),
      ],
    });
    expect(moved).toMatchObject({ tag: "resolved" });
    if (moved.tag !== "resolved") {
      throw new Error("Expected Movement to resolve.");
    }

    expect(resolveWeaponAttack(moved.state, "Longsword")).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.objectContaining({
            combatantId: spellCasterId,
            movement: expect.objectContaining({ spentFeet: 5 }),
          }),
          expect.anything(),
        ],
      },
    });
  });

  test("an Extra Attack slot does not pay the action cost to escape a grapple", () => {
    const state = extraAttackBattle([extraAttackBattleUnitRef()]);
    const first = resolveWeaponAttack(state, "Longsword");
    expect(first.tag).toBe("resolved");
    if (first.tag !== "resolved") {
      throw new Error("Expected first Extra Attack slot to resolve.");
    }
    const grappledState: BattleState = {
      ...first.state,
      grapples: [
        {
          grapplerId: spellTargetId,
          targetId: spellCasterId,
          escapeDc: difficultyClass(12),
          reachFeet: movementFeet(5),
          hand: "left",
          targetExemptFromDragCost: false,
        },
      ],
    };

    expect(discoverBattleActs(first.state)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: expect.objectContaining({
            tag: "action",
            action: "grapple",
          }),
        }),
      ]),
    );
    expect(discoverBattleActs(grappledState)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: expect.objectContaining({
            tag: "action",
            action: "escapeGrapple",
          }),
        }),
      ]),
    );
    expect(resolveWeaponAttack(grappledState, "Longsword")).toMatchObject({
      tag: "resolved",
    });
  });

  test("End Turn closes an unspent Extra Attack slot", () => {
    const state = extraAttackBattle([extraAttackBattleUnitRef()]);
    const first = resolveWeaponAttack(state, "Longsword");
    expect(first.tag).toBe("resolved");
    if (first.tag !== "resolved") {
      throw new Error("Expected first Extra Attack slot to resolve.");
    }

    const ended = resolveBattleSubject({
      state: first.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endTurn",
      },
      fills: [],
    });
    expect(ended).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { actionResources: [{ source: "turn" }] } },
    });
  });

  test("adjacent scale_attack_count additional values stay unsupported", () => {
    const unit = unitLibrary.requireUnit(fighterExtraAttackUnitId);
    expect(unit.kind).toBe("class_feature");
    if (unit.kind !== "class_feature" || unit.mechanics.family !== "passive") {
      throw new Error("Expected passive Fighter Extra Attack Unit.");
    }
    const adjacentUnit: UnitRecord = {
      ...unit,
      id: "test_extra_attack_additional_2",
      mechanics: {
        ...unit.mechanics,
        grants: [{ kind: "scale_attack_count", additional: 2 }],
      },
    };

    expect(
      battleUnitRefWithSupportProfiles({
        unitRef: { unitId: adjacentUnit.id },
        unit: adjacentUnit,
      }),
    ).toEqual(
      Either.left({
        tag: "battleUnitSupportProfileIssue",
        message:
          "Unsupported battle Attack action attack-count scaling Unit hook: test_extra_attack_additional_2.",
      }),
    );
  });
});

describe("QMBT40 deterministic Fast Movement admission", () => {
  test("barbarian_fast_movement is admitted as a passive Speed bonus while not wearing Heavy armor", () => {
    const unit = unitLibrary.requireUnit(barbarianFastMovementUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "barbarian", level: classLevel(5) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({
        unitRef: { unitId: unit.id },
        unit,
      }),
    ).toEqual(
      Either.right({
        unitId: barbarianFastMovementUnitId,
        supportProfiles: [fastMovementSupportProfile()],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "passiveSpeedBonus",
        unit,
        speed: {
          deltaFeet: movementDeltaFeet(10),
          condition: {
            kind: "notWearingArmor",
            categories: ["heavy"],
          },
        },
      }),
    );
  });

  test("Fast Movement increases movement budget and Dash bonus while not wearing Heavy armor", () => {
    const state = fastMovementBattle();
    expect(snapshotBattle(state).combatants).toContainEqual(
      expect.objectContaining({
        combatantId: spellCasterId,
        movement: expect.objectContaining({
          speedFeet: 40,
          remainingFeet: 40,
        }),
      }),
    );

    const dashed = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: spellCasterId,
        action: "dash",
        speedKind: "walk",
      },
      fills: [],
    });
    expect(dashed).toMatchObject({ tag: "resolved" });
    if (dashed.tag !== "resolved") {
      throw new Error("Expected Fast Movement Dash to resolve.");
    }
    expect(dashed.snapshot.turn.dashMovementBonusFeet).toBe(40);
    expect(dashed.snapshot.combatants).toContainEqual(
      expect.objectContaining({
        combatantId: spellCasterId,
        movement: expect.objectContaining({
          speedFeet: 40,
          remainingFeet: 80,
        }),
      }),
    );
  });

  test("Fast Movement does not increase Speed while wearing Heavy armor", () => {
    const state = fastMovementBattle({ armorClass: heavyArmorClassState() });
    expect(snapshotBattle(state).combatants).toContainEqual(
      expect.objectContaining({
        combatantId: spellCasterId,
        movement: expect.objectContaining({
          speedFeet: 30,
          remainingFeet: 30,
        }),
      }),
    );
  });

  test("Fast Movement support gate rejects adjacent passive Speed bonus shapes", () => {
    const unit = unitLibrary.requireUnit(barbarianFastMovementUnitId);
    if (unit.kind !== "class_feature" || unit.mechanics.family !== "passive") {
      throw new Error("Expected Fast Movement passive class feature.");
    }
    const [effect] = unit.mechanics.grants;
    if (effect?.kind !== "modify_speed") {
      throw new Error("Expected Fast Movement Speed modifier.");
    }
    const { condition: _condition, ...mechanicsWithoutCondition } =
      unit.mechanics;
    const adjacentSpeedUnits = [
      {
        ...unit,
        id: "test_fast_movement_wrong_delta",
        mechanics: {
          ...unit.mechanics,
          grants: [{ ...effect, delta: 5 }],
        },
      },
      {
        ...unit,
        id: "test_fast_movement_multiple_grants",
        mechanics: {
          ...unit.mechanics,
          grants: [effect, effect],
        },
      },
      {
        ...unit,
        id: "test_fast_movement_missing_heavy_predicate",
        mechanics: mechanicsWithoutCondition,
      },
    ] as const satisfies readonly UnitRecord[];

    for (const adjacentUnit of adjacentSpeedUnits) {
      expect(
        battleUnitRefWithSupportProfiles({
          unitRef: { unitId: adjacentUnit.id },
          unit: adjacentUnit,
        }),
      ).toEqual(
        Either.left({
          tag: "battleUnitSupportProfileIssue",
          message: `Unsupported battle passive Speed bonus Unit hook: ${adjacentUnit.id}.`,
        }),
      );
      expect(
        parseSupportedUnitFeatureProfile(adjacentUnit, [
          { className: "barbarian", level: classLevel(5) },
        ]),
      ).toBeNull();
    }
  });
});

describe("QMBT44 deterministic Roving admission", () => {
  test("ranger_roving is admitted as passive Speed-kind grants", () => {
    const unit = unitLibrary.requireUnit(rangerRovingUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "ranger", level: classLevel(6) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({
        unitRef: { unitId: unit.id },
        unit,
      }),
    ).toEqual(
      Either.right({
        unitId: rangerRovingUnitId,
        supportProfiles: [rovingSupportProfile()],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "passiveSpeedKindGrants",
        unit,
        speedKindGrants: {
          speed: rovingSpeedBonusProfile(),
          grants: rovingSpeedKindGrants(),
        },
      }),
    );
  });

  test("Roving projects walk, Climb, and Swim Speeds equal to effective Speed", () => {
    const state = rovingBattle();
    expect(snapshotBattle(state).combatants).toContainEqual(
      expect.objectContaining({
        combatantId: spellCasterId,
        movement: expect.objectContaining({
          speedFeet: 40,
          remainingFeet: 40,
          speedKinds: [
            { kind: "walk", speedFeet: 40, remainingFeet: 40 },
            { kind: "climb", speedFeet: 40, remainingFeet: 40 },
            { kind: "swim", speedFeet: 40, remainingFeet: 40 },
          ],
        }),
      }),
    );
  });

  test("Roving special Speeds track unmodified Speed while wearing Heavy armor", () => {
    const state = rovingBattle({ armorClass: heavyArmorClassState() });
    expect(snapshotBattle(state).combatants).toContainEqual(
      expect.objectContaining({
        combatantId: spellCasterId,
        movement: expect.objectContaining({
          speedFeet: 30,
          remainingFeet: 30,
          speedKinds: [
            { kind: "walk", speedFeet: 30, remainingFeet: 30 },
            { kind: "climb", speedFeet: 30, remainingFeet: 30 },
            { kind: "swim", speedFeet: 30, remainingFeet: 30 },
          ],
        }),
      }),
    );
  });

  test("Roving Movement can choose a represented Speed kind and subtracts distance already moved", () => {
    const state = rovingBattle();
    const firstMove = resolveBattleSubject({
      state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "move",
      },
      fills: [
        movementFill(rovingMovementHole(state), {
          speedKind: "climb",
          movementCostFeet: 15,
          provokedOpportunityAttacks: [],
        }),
      ],
    });
    expect(firstMove).toMatchObject({ tag: "resolved" });
    if (firstMove.tag !== "resolved") {
      throw new Error("Expected Roving climb Movement to resolve.");
    }
    expect(firstMove.snapshot.combatants).toContainEqual(
      expect.objectContaining({
        combatantId: spellCasterId,
        movement: expect.objectContaining({
          spentFeet: 15,
          speedKinds: [
            { kind: "walk", speedFeet: 40, remainingFeet: 25 },
            { kind: "climb", speedFeet: 40, remainingFeet: 25 },
            { kind: "swim", speedFeet: 40, remainingFeet: 25 },
          ],
        }),
      }),
    );

    const secondMove = resolveBattleSubject({
      state: firstMove.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "move",
      },
      fills: [
        movementFill(rovingMovementHole(firstMove.state), {
          speedKind: "swim",
          movementCostFeet: 25,
          provokedOpportunityAttacks: [],
        }),
      ],
    });
    expect(secondMove).toMatchObject({ tag: "resolved" });
  });

  test("Roving Dash uses the effective Speed shared by represented Speed kinds", () => {
    const state = rovingBattle();
    const dashed = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: spellCasterId,
        action: "dash",
        speedKind: "swim",
      },
      fills: [],
    });
    expect(dashed).toMatchObject({ tag: "resolved" });
    if (dashed.tag !== "resolved") {
      throw new Error("Expected Roving Dash to resolve.");
    }
    expect(dashed.snapshot.turn.dashMovementBonusFeet).toBe(40);
    expect(dashed.snapshot.combatants).toContainEqual(
      expect.objectContaining({
        combatantId: spellCasterId,
        movement: expect.objectContaining({
          speedKinds: [
            { kind: "walk", speedFeet: 40, remainingFeet: 80 },
            { kind: "climb", speedFeet: 40, remainingFeet: 80 },
            { kind: "swim", speedFeet: 40, remainingFeet: 80 },
          ],
        }),
      }),
    );
  });

  test("Roving support gate rejects adjacent passive Speed-kind grant shapes", () => {
    const unit = unitLibrary.requireUnit(rangerRovingUnitId);
    if (
      unit.kind !== "class_feature" ||
      unit.mechanics.family !== "composite"
    ) {
      throw new Error("Expected Roving composite class feature.");
    }
    const [speedPart, specialSpeedPart] = unit.mechanics.parts;
    if (
      speedPart?.family !== "passive" ||
      specialSpeedPart?.family !== "passive"
    ) {
      throw new Error("Expected Roving passive component mechanics.");
    }
    const [speedEffect] = speedPart.grants;
    const [climbEffect, swimEffect] = specialSpeedPart.grants;
    if (
      speedEffect?.kind !== "modify_speed" ||
      climbEffect?.kind !== "grant_speed" ||
      swimEffect?.kind !== "grant_speed"
    ) {
      throw new Error("Expected Roving Speed mechanics.");
    }

    const adjacentUnits = [
      {
        ...unit,
        id: "test_roving_only_climb",
        mechanics: {
          ...unit.mechanics,
          parts: [speedPart, { ...specialSpeedPart, grants: [climbEffect] }],
        },
      },
      {
        ...unit,
        id: "test_roving_fixed_swim",
        mechanics: {
          ...unit.mechanics,
          parts: [
            speedPart,
            {
              ...specialSpeedPart,
              grants: [climbEffect, { ...swimEffect, feet: 40 }],
            },
          ],
        },
      },
      {
        ...unit,
        id: "test_roving_wrong_delta",
        mechanics: {
          ...unit.mechanics,
          parts: [
            {
              ...speedPart,
              grants: [{ ...speedEffect, delta: 5 }],
            },
            specialSpeedPart,
          ],
        },
      },
    ] as const satisfies readonly UnitRecord[];

    for (const adjacentUnit of adjacentUnits) {
      expect(battlePassiveSpeedKindGrantsSupportForUnit(adjacentUnit)).toBe(
        "unsupported",
      );
    }
  });
});

describe("QMBT47 deterministic Relentless Endurance admission", () => {
  test("orc_relentless_endurance is admitted as zero-Hit-Point replacement", () => {
    const unit = unitLibrary.requireUnit(orcRelentlessEnduranceUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, []);

    expect(
      battleUnitRefWithSupportProfiles({
        unitRef: { unitId: unit.id },
        unit,
      }),
    ).toEqual(
      Either.right({
        unitId: orcRelentlessEnduranceUnitId,
        supportProfiles: [ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "zeroHitPointReplacement",
        unit,
        optional: true,
        trigger: "reducedToZeroHitPointsNotKilledOutright",
        replacementHp: 1,
        resetCadence: "longRest",
      }),
    );
    expect(characterBattleResourceForUnit(unit)).toEqual({
      kind: "use_count",
      cap: { kind: "fixed", uses: 1 },
    });
  });

  test("Relentless Endurance replaces a non-outright drop to 0 with 1 Hit Point and spends its use", () => {
    const state = relentlessEnduranceBattle({ targetHp: 3 });
    const disposition = relentlessEnduranceDisposition(state, 4);

    expect(disposition.choices).toContainEqual({
      kind: "zeroHitPointReplacement",
      unitId: orcRelentlessEnduranceUnitId,
    });

    const result = resolveBattleSubject({
      state,
      subject: weaponAttackSubject("Longsword"),
      fills: [
        ...disposition.prefixFills,
        attackDamageDispositionFill(disposition, {
          kind: "zeroHitPointReplacement",
          unitId: orcRelentlessEnduranceUnitId,
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            hp: 1,
            conditions: expect.not.arrayContaining(["unconscious"]),
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { successes: 0, failures: 0 },
              stable: false,
              dead: false,
            },
          }),
        ]),
      },
    });
    if (result.tag !== "resolved") {
      throw new Error("Expected Relentless Endurance damage to resolve.");
    }
    const target = result.state.combatants.get(spellTargetId);
    if (target?.origin.kind !== "character") {
      throw new Error("Expected Relentless Endurance target character.");
    }
    expect(target.origin.resources[0]?.usesRemaining).toBe(0);
  });

  test("Relentless Endurance replaces non-attack spell damage that drops the target to 0", () => {
    const unit = unitLibrary.requireUnit(orcRelentlessEnduranceUnitId);
    const spell = spellRecord(rayOfFrostUnitId);
    const state = spellBattle({
      cantrips: [spell],
      targetHp: 3,
      targetResources: [{ unit }],
      targetUnitRefs: [
        {
          unitId: orcRelentlessEnduranceUnitId,
          supportProfiles: [ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE],
        },
      ],
    });
    const act = spellAct({ state, spellId: rayOfFrostUnitId });
    const target = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spellTargetFill(
      target,
      rayOfFrostUnitId,
      spellCasterId,
      spellTargetId,
    );
    const roll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
    const damage = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill, rollFill],
      }),
      "rolledDice",
    );
    const damageFill = damageRollFillWithGroups(damage, [[4]]);
    const disposition = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill, rollFill, damageFill],
      }),
      "attackDamageDisposition",
    );

    const result = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        rollFill,
        damageFill,
        attackDamageDispositionFill(disposition, {
          kind: "zeroHitPointReplacement",
          unitId: orcRelentlessEnduranceUnitId,
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            hp: 1,
            conditions: expect.not.arrayContaining(["unconscious"]),
          }),
        ]),
      },
    });
  });

  test("Relentless Endurance replaces failed save damage that drops the target to 0", () => {
    const unit = unitLibrary.requireUnit(orcRelentlessEnduranceUnitId);
    const spell = spellRecord(acidSplashUnitId);
    const state = spellBattle({
      cantrips: [spell],
      targetHp: 3,
      targetResources: [{ unit }],
      targetUnitRefs: [
        {
          unitId: orcRelentlessEnduranceUnitId,
          supportProfiles: [ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE],
        },
      ],
    });
    const act = spellAct({ state, spellId: acidSplashUnitId });
    const save = requireHole(act.initialHoles, "savingThrowOutcome");
    const saveFill = savingThrowOutcomeFill(save, [
      { targetId: spellTargetId, succeeded: false },
    ]);
    const damage = requireResultHole(
      resolveBattleSubject({ state, subject: act.subject, fills: [saveFill] }),
      "rolledDice",
    );
    const damageFill = damageRollFillWithGroups(damage, [[4]]);
    const disposition = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [saveFill, damageFill],
      }),
      "attackDamageDisposition",
    );

    const result = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        saveFill,
        damageFill,
        attackDamageDispositionFill(disposition, {
          kind: "zeroHitPointReplacement",
          unitId: orcRelentlessEnduranceUnitId,
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            hp: 1,
            conditions: expect.not.arrayContaining(["unconscious"]),
          }),
        ]),
      },
    });
  });

  test("declining Relentless Endurance follows the ordinary zero-HP lifecycle", () => {
    const state = relentlessEnduranceBattle({ targetHp: 3 });
    const disposition = relentlessEnduranceDisposition(state, 4);

    const result = resolveBattleSubject({
      state,
      subject: weaponAttackSubject("Longsword"),
      fills: [
        ...disposition.prefixFills,
        attackDamageDispositionFill(disposition, { kind: "ordinaryDamage" }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            hp: 0,
            conditions: expect.arrayContaining(["unconscious"]),
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { successes: 0, failures: 0 },
              stable: false,
              dead: false,
            },
          }),
        ]),
      },
    });
  });

  test("Relentless Endurance is not offered for outright death or spent uses", () => {
    const killedOutright = relentlessEnduranceBattle({
      targetHp: 1,
      targetMaxHp: 6,
    });
    expect(relentlessEnduranceDamageResult(killedOutright, 7)).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            hp: 0,
            zeroHpLifecycle: expect.objectContaining({ dead: true }),
          }),
        ]),
      },
    });

    const spent = relentlessEnduranceBattle({ targetHp: 3, usesRemaining: 0 });
    expect(relentlessEnduranceDamageResult(spent, 4)).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            hp: 0,
            conditions: expect.arrayContaining(["unconscious"]),
          }),
        ]),
      },
    });
  });

  test("invalid zero-Hit-Point replacement disposition fills are rejected", () => {
    const state = relentlessEnduranceBattle({ targetHp: 3 });
    const disposition = relentlessEnduranceDisposition(state, 4);

    expect(
      resolveBattleSubject({
        state,
        subject: weaponAttackSubject("Longsword"),
        fills: [
          ...disposition.prefixFills,
          attackDamageDispositionFill(disposition, {
            kind: "zeroHitPointReplacement",
            unitId: "wrong_relentless_endurance",
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Damage disposition must match one of the currently offered choices.",
    });
  });

  test("malformed zero-Hit-Point replacement mechanics remain unsupported", () => {
    const base = unitLibrary.requireUnit(
      orcRelentlessEnduranceUnitId,
    ) as UnitRecord & {
      readonly mechanics: {
        readonly family: "triggered_replacement";
        readonly trigger: object;
        readonly effect: object;
        readonly optional: boolean;
        readonly resetCadence: object;
      };
    };
    const malformedUnits = [
      unitMechanicsVariant(base, {
        id: "relentless_endurance_wrong_replacement_hp",
        mechanics: {
          ...base.mechanics,
          effect: { ...base.mechanics.effect, replacementHp: 2 },
        },
      }),
      unitMechanicsVariant(base, {
        id: "relentless_endurance_required",
        mechanics: { ...base.mechanics, optional: false },
      }),
      unitMechanicsVariant(base, {
        id: "relentless_endurance_wrong_trigger",
        mechanics: {
          ...base.mechanics,
          trigger: { kind: "creature_makes_damage_roll" },
        },
      }),
      unitMechanicsVariant(base, {
        id: "relentless_endurance_wrong_reset",
        mechanics: {
          ...base.mechanics,
          resetCadence: { kind: "short_or_long_rest" },
        },
      }),
      {
        ...base,
        id: "relentless_endurance_spell_source",
        kind: "spell",
      } as UnitRecord,
    ];

    for (const unit of malformedUnits) {
      expect(parseSupportedUnitFeatureProfile(unit, [])).toBeNull();
      const supportResult = battleUnitRefWithSupportProfiles({
        unitRef: { unitId: unit.id },
        unit,
      });
      expect(supportResult).toEqual(
        unit.kind === "species_trait"
          ? Either.left({
              tag: "battleUnitSupportProfileIssue",
              message: `Unsupported battle zero-Hit-Point replacement Unit hook: ${unit.id}.`,
            })
          : Either.right({ unitId: unit.id, supportProfiles: [] }),
      );
    }
  });
});

describe("QMBT53 deterministic Adrenaline Rush admission", () => {
  test("orc_adrenaline_rush is admitted as Bonus Action Dash Temporary Hit Points", () => {
    const unit = unitLibrary.requireUnit(orcAdrenalineRushUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, []);

    expect(
      battleUnitRefWithSupportProfiles({
        unitRef: { unitId: unit.id },
        unit,
      }),
    ).toEqual(
      Either.right({
        unitId: orcAdrenalineRushUnitId,
        supportProfiles: [adrenalineRushSupportProfile()],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "bonusActionDashTemporaryHitPoints",
        unit,
        dashTemporaryHitPoints: adrenalineRushProfilePayload(),
      }),
    );
    expect(characterBattleResourceForUnit(unit)).toEqual({
      kind: "use_count",
      cap: { kind: "proficiency_bonus" },
    });
  });

  test("Adrenaline Rush spends a Bonus Action Dash use and grants Proficiency Bonus Temporary Hit Points", () => {
    const state = adrenalineRushBattle({ tempHp: 1 });
    const act = adrenalineRushDashAct(state);
    const result = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          bonusActionAvailable: false,
          dashMovementBonusFeet: 30,
        },
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellCasterId,
            tempHp: 3,
            movement: expect.objectContaining({
              speedFeet: 30,
              remainingFeet: 60,
            }),
            origin: expect.objectContaining({
              resources: [
                expect.objectContaining({
                  unitId: orcAdrenalineRushUnitId,
                  usesRemaining: 2,
                }),
              ],
            }),
          }),
        ]),
      },
    });
  });

  test("Adrenaline Rush keeps higher existing Temporary Hit Points", () => {
    const state = adrenalineRushBattle({ tempHp: 5 });
    const result = resolveBattleSubject({
      state,
      subject: adrenalineRushDashAct(state).subject,
      fills: [],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellCasterId,
            tempHp: 5,
          }),
        ]),
      },
    });
  });

  test("Adrenaline Rush is unavailable without uses", () => {
    const state = adrenalineRushBattle({ usesRemaining: 0 });
    expect(
      discoverBattleActs(state).some(
        (act) =>
          act.subject.tag === "bonusActionStandardAction" &&
          act.subject.sourceUnitId === orcAdrenalineRushUnitId,
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state,
        subject: adrenalineRushDashSubject(),
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
    });
  });

  test("malformed Bonus Action Dash Temporary Hit Points mechanics remain unsupported", () => {
    const base = unitLibrary.requireUnit(orcAdrenalineRushUnitId);
    if (
      base.kind !== "species_trait" ||
      base.mechanics.family !== "activation"
    ) {
      throw new Error("Expected Adrenaline Rush activation species trait.");
    }
    const [phase] = base.mechanics.phases;
    if (phase?.kind !== "direct") {
      throw new Error("Expected Adrenaline Rush direct phase.");
    }
    const [effect] = phase.effects ?? [];
    if (effect?.kind !== "grant_temp_hp") {
      throw new Error("Expected Adrenaline Rush direct Temporary Hit Points.");
    }
    const malformedUnits = [
      unitMechanicsVariant(base, {
        id: "adrenaline_rush_standard_action_dash",
        mechanics: {
          ...base.mechanics,
          activationCost: { kind: "standard_action", action: "dash" },
        },
      }),
      unitMechanicsVariant(base, {
        id: "adrenaline_rush_wrong_effect_amount",
        mechanics: {
          ...base.mechanics,
          phases: [
            {
              ...phase,
              effects: [
                {
                  ...effect,
                  amount: {
                    kind: "fixed",
                    expr: { dice: 0, dieSize: 0, flat: 4 },
                  },
                },
              ],
            },
          ],
        },
      }),
      unitMechanicsVariant(base, {
        id: "adrenaline_rush_wrong_resource_cap",
        mechanics: {
          ...base.mechanics,
          resource: { kind: "use_count", cap: { kind: "fixed", uses: 1 } },
        },
      }),
      unitMechanicsVariant(base, {
        id: "adrenaline_rush_wrong_reset",
        mechanics: {
          ...base.mechanics,
          resetCadence: { kind: "long_rest" },
        },
      }),
    ] as const satisfies readonly UnitRecord[];

    for (const unit of malformedUnits) {
      expect(bonusActionDashTemporaryHitPointsProfileForUnit(unit)).toBeNull();
      expect(
        battleUnitRefWithSupportProfiles({
          unitRef: { unitId: unit.id },
          unit,
        }),
      ).toEqual(
        Either.left({
          tag: "battleUnitSupportProfileIssue",
          message: `Unsupported battle Bonus Action Dash Temporary Hit Points Unit hook: ${unit.id}.`,
        }),
      );
    }
  });
});

function spellRecord(unitId: string): SpellRecord {
  const unit = unitLibrary.requireUnit(unitId);
  expect(unit.kind).toBe("spell");
  return unit as SpellRecord;
}

function spellBattle(input: {
  readonly cantrips?: readonly SpellRecord[];
  readonly preparedSpells?: readonly SpellRecord[];
  readonly spellSlots?: readonly {
    readonly spellLevel: 1 | 3 | 5 | 6;
    readonly count: number;
  }[];
  readonly extraTargetIds?: readonly CombatantId[];
  readonly targetHp?: number;
  readonly targetMaxHp?: number;
  readonly targetResources?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"];
  readonly targetUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
}): BattleState {
  const result = startBattle({
    battleId: battleId("unit-profile-spell-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Spellcaster",
        initiative: 20,
        side: partySide,
        spellcasting: {
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: input.cantrips ?? [],
          preparedSpells: input.preparedSpells ?? [],
          spellSlots: input.spellSlots ?? [{ spellLevel: 1, count: 2 }],
        },
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
        ...(input.targetHp === undefined ? {} : { currentHp: input.targetHp }),
        ...(input.targetMaxHp === undefined
          ? {}
          : { maxHp: input.targetMaxHp }),
        ...(input.targetResources === undefined
          ? {}
          : { resources: input.targetResources }),
        ...(input.targetUnitRefs === undefined
          ? {}
          : { characterUnitRefs: input.targetUnitRefs }),
      }),
      ...(input.extraTargetIds ?? []).map((combatantId, index) =>
        characterCreature({
          combatantId,
          displayName: `Target ${index + 2}`,
          initiative: 9 - index,
          side: oppositionSide,
        }),
      ),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function archeryBattle(input: {
  readonly attack: NonNullable<
    Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["attack"]
  >;
  readonly characterUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
}): BattleState {
  const characterUnitRefs = input.characterUnitRefs ?? [archeryBattleUnitRef()];
  const result = startBattle({
    battleId: battleId("unit-profile-archery-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Archer",
        initiative: 20,
        side: partySide,
        attack: input.attack,
        characterUnitRefs,
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function savageAttackerBattle(input: {
  readonly attack: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"];
  readonly characterUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
  readonly classLevels?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"];
  readonly currentHp?: number;
  readonly maxHp?: number;
  readonly tempHp?: number;
  readonly resources?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"];
  readonly unitFeatures?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unitFeatures"];
}): BattleState {
  const savageAttackerUnitRef = savageAttackerBattleUnitRef();
  const result = startBattle({
    battleId: battleId("unit-profile-savage-attacker-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Savage Attacker",
        initiative: 20,
        side: partySide,
        attack: input.attack,
        characterUnitRefs: input.characterUnitRefs ?? [savageAttackerUnitRef],
        ...(input.classLevels === undefined
          ? {}
          : { classLevels: input.classLevels }),
        ...(input.unitFeatures === undefined
          ? {}
          : { unitFeatures: input.unitFeatures }),
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function combatProwessBattle(input: {
  readonly attack: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"];
  readonly cantrips?: readonly SpellRecord[];
  readonly targetPreparedSpells?: readonly SpellRecord[];
}): BattleState {
  const result = startBattle({
    battleId: battleId("unit-profile-combat-prowess-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Peerless Aim User",
        initiative: 20,
        side: partySide,
        attack: input.attack,
        characterUnitRefs: [combatProwessBattleUnitRef()],
        ...(input.cantrips === undefined
          ? {}
          : {
              spellcasting: {
                spellcastingAbilityModifier: abilityModifier(3),
                proficiencyBonus: proficiencyBonus(2),
                canCastSpells: true,
                cantrips: input.cantrips,
                preparedSpells: [],
                spellSlots: [],
              },
            }),
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
        ...(input.targetPreparedSpells === undefined
          ? {}
          : {
              spellcasting: {
                spellcastingAbilityModifier: abilityModifier(3),
                proficiencyBonus: proficiencyBonus(2),
                canCastSpells: true,
                cantrips: [],
                preparedSpells: input.targetPreparedSpells,
                spellSlots: [{ spellLevel: 1, count: 1 }],
              },
            }),
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function extraAttackBattle(
  characterUnitRefs: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"],
): BattleState {
  const result = startBattle({
    battleId: battleId("unit-profile-extra-attack-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Extra Attacker",
        initiative: 20,
        side: partySide,
        attack: zeroAbilityWeaponAttack("weapon_longsword"),
        characterUnitRefs,
        classLevels: [{ className: "fighter", level: classLevel(5) }],
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function fastMovementBattle(
  input: {
    readonly armorClass?: Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["armorClass"];
  } = {},
): BattleState {
  const result = startBattle({
    battleId: battleId("unit-profile-fast-movement-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Fast Barbarian",
        initiative: 20,
        side: partySide,
        characterUnitRefs: [fastMovementBattleUnitRef()],
        classLevels: [{ className: "barbarian", level: classLevel(5) }],
        ...(input.armorClass === undefined
          ? {}
          : { armorClass: input.armorClass }),
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function rovingBattle(
  input: {
    readonly armorClass?: Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["armorClass"];
  } = {},
): BattleState {
  const result = startBattle({
    battleId: battleId("unit-profile-roving-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Roving Ranger",
        initiative: 20,
        side: partySide,
        characterUnitRefs: [rovingBattleUnitRef()],
        classLevels: [{ className: "ranger", level: classLevel(6) }],
        ...(input.armorClass === undefined
          ? {}
          : { armorClass: input.armorClass }),
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function relentlessEnduranceBattle(input: {
  readonly targetHp: number;
  readonly targetMaxHp?: number;
  readonly usesRemaining?: number;
}): BattleState {
  const unit = unitLibrary.requireUnit(orcRelentlessEnduranceUnitId);
  const result = startBattle({
    battleId: battleId("unit-profile-relentless-endurance-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Attacker",
        initiative: 20,
        side: partySide,
        attack: zeroAbilityWeaponAttack("weapon_longsword"),
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Orc Target",
        initiative: 10,
        side: oppositionSide,
        currentHp: input.targetHp,
        maxHp: input.targetMaxHp ?? 12,
        resources: [
          input.usesRemaining === undefined
            ? { unit }
            : { unit, usesRemaining: input.usesRemaining },
        ],
        characterUnitRefs: [
          {
            unitId: orcRelentlessEnduranceUnitId,
            supportProfiles: [ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE],
          },
        ],
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function adrenalineRushBattle(
  input: { readonly tempHp?: number; readonly usesRemaining?: number } = {},
): BattleState {
  const unit = unitLibrary.requireUnit(orcAdrenalineRushUnitId);
  const result = startBattle({
    battleId: battleId("unit-profile-adrenaline-rush-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Orc",
        initiative: 20,
        side: partySide,
        tempHp: input.tempHp ?? 0,
        classLevels: [{ className: "fighter", level: classLevel(5) }],
        resources: [
          input.usesRemaining === undefined
            ? { unit }
            : { unit, usesRemaining: input.usesRemaining },
        ],
        characterUnitRefs: [adrenalineRushBattleUnitRef()],
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function adrenalineRushDashAct(state: BattleState): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "bonusActionStandardAction"; readonly action: "dash" }
  >;
} {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "bonusActionStandardAction" &&
      candidate.subject.sourceUnitId === orcAdrenalineRushUnitId &&
      candidate.subject.action === "dash" &&
      candidate.subject.speedKind === "walk",
  );
  expect(isAdrenalineRushDashAct(act)).toBe(true);
  if (!isAdrenalineRushDashAct(act)) {
    throw new Error("Expected Adrenaline Rush Bonus Action Dash act.");
  }
  return act;
}

function isAdrenalineRushDashAct(
  act: AvailableBattleAct | undefined,
): act is AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "bonusActionStandardAction"; readonly action: "dash" }
  >;
} {
  return (
    act !== undefined &&
    act.subject.tag === "bonusActionStandardAction" &&
    act.subject.action === "dash" &&
    act.subject.sourceUnitId === orcAdrenalineRushUnitId &&
    act.subject.speedKind === "walk"
  );
}

function adrenalineRushDashSubject(): Extract<
  BattleSubject,
  { readonly tag: "bonusActionStandardAction"; readonly action: "dash" }
> {
  return {
    tag: "bonusActionStandardAction",
    actorId: spellCasterId,
    sourceUnitId: orcAdrenalineRushUnitId,
    action: "dash",
    speedKind: "walk",
  };
}

function relentlessEnduranceDisposition(
  state: BattleState,
  damageRoll: number,
): Extract<BattleHole, { readonly kind: "attackDamageDisposition" }> & {
  readonly prefixFills: readonly BattleFill[];
} {
  const subject = weaponAttackSubject("Longsword");
  const target = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const targetFill = attackTargetFill(
    target,
    spellCasterId,
    spellTargetId,
    "Longsword",
  );
  const roll = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [targetFill] }),
    "attackRoll",
  );
  const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
  const damage = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [targetFill, rollFill] }),
    "rolledDice",
  );
  const damageFill = damageRollFillWithGroups(damage, [[damageRoll]]);
  const awaitingDisposition = resolveBattleSubject({
    state,
    subject,
    fills: [targetFill, rollFill, damageFill],
  });
  const disposition = requireResultHole(
    awaitingDisposition,
    "attackDamageDisposition",
  );
  return {
    ...disposition,
    prefixFills: [targetFill, rollFill, damageFill],
  };
}

function relentlessEnduranceDamageResult(
  state: BattleState,
  damageRoll: number,
): ReturnType<typeof resolveBattleSubject> {
  const subject = weaponAttackSubject("Longsword");
  const target = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const targetFill = attackTargetFill(
    target,
    spellCasterId,
    spellTargetId,
    "Longsword",
  );
  const roll = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [targetFill] }),
    "attackRoll",
  );
  const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
  const damage = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [targetFill, rollFill] }),
    "rolledDice",
  );
  const damageFill = damageRollFillWithGroups(damage, [[damageRoll]]);
  const withoutDisposition = resolveBattleSubject({
    state,
    subject,
    fills: [targetFill, rollFill, damageFill],
  });
  if (
    withoutDisposition.tag !== "needsHoles" ||
    !withoutDisposition.holes.some(
      (hole) => hole.kind === "attackDamageDisposition",
    )
  ) {
    return withoutDisposition;
  }
  const disposition = requireResultHole(
    withoutDisposition,
    "attackDamageDisposition",
  );
  return resolveBattleSubject({
    state,
    subject,
    fills: [
      targetFill,
      rollFill,
      damageFill,
      attackDamageDispositionFill(disposition, { kind: "ordinaryDamage" }),
    ],
  });
}

function unitMechanicsVariant(
  base: UnitRecord,
  overrides: {
    readonly id: string;
    readonly mechanics: unknown;
  },
): UnitRecord {
  return {
    ...base,
    id: overrides.id,
    mechanics: overrides.mechanics,
  } as UnitRecord;
}

function resolveWeaponAttack(
  state: BattleState,
  attackName: "Longsword" | "Shortbow",
): ReturnType<typeof resolveBattleSubject> {
  const subject = weaponAttackSubject(attackName);
  const target = requireResultHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const roll = requireResultHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId, attackName),
      ],
    }),
    "attackRoll",
  );
  const damage = requireResultHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(target, spellCasterId, spellTargetId, attackName),
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
      ],
    }),
    "rolledDice",
  );
  return resolveBattleSubject({
    state,
    subject,
    fills: [
      attackTargetFill(target, spellCasterId, spellTargetId, attackName),
      attackRollFill(roll, { total: 15, naturalD20: 10 }),
      damageRollFillWithGroups(damage, [[4]]),
    ],
  });
}

function extraAttackBattleUnitRef(
  unitId:
    | typeof fighterExtraAttackUnitId
    | typeof paladinExtraAttackUnitId = fighterExtraAttackUnitId,
): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = unitLibrary.requireUnit(unitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId,
      supportProfiles: [extraAttackSupportProfile],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

function attackDamageRiderBattleUnitRef(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = unitLibrary.requireUnit(rogueSneakAttackUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: rogueSneakAttackUnitId,
      supportProfiles: [ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

function savageAttackerBattleUnitRef(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = unitLibrary.requireUnit(savageAttackerUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: savageAttackerUnitId,
      supportProfiles: [WEAPON_DAMAGE_DICE_ROLL_CHOICE_SUPPORT_PROFILE],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

function archeryBattleUnitRef(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = archeryFeatureUnit();
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: archeryUnitId,
      supportProfiles: [archerySupportProfile],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

function combatProwessBattleUnitRef(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = unitLibrary.requireUnit(boonOfCombatProwessUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: boonOfCombatProwessUnitId,
      supportProfiles: [combatProwessSupportProfile],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

function fastMovementBattleUnitRef(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = unitLibrary.requireUnit(barbarianFastMovementUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: barbarianFastMovementUnitId,
      supportProfiles: [fastMovementSupportProfile()],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

function rovingBattleUnitRef(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = unitLibrary.requireUnit(rangerRovingUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: rangerRovingUnitId,
      supportProfiles: [rovingSupportProfile()],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

function adrenalineRushBattleUnitRef(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = unitLibrary.requireUnit(orcAdrenalineRushUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: orcAdrenalineRushUnitId,
      supportProfiles: [adrenalineRushSupportProfile()],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

function fastMovementSupportProfile() {
  return {
    kind: PASSIVE_SPEED_BONUS_SUPPORT_PROFILE,
    deltaFeet: movementDeltaFeet(10),
    condition: {
      kind: "notWearingArmor",
      categories: ["heavy"],
    },
  } as const;
}

function rovingSupportProfile() {
  return {
    kind: PASSIVE_SPEED_KIND_GRANTS_SUPPORT_PROFILE,
    speed: rovingSpeedBonusProfile(),
    grants: rovingSpeedKindGrants(),
  } as const;
}

function adrenalineRushSupportProfile() {
  return {
    kind: BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
    dashTemporaryHitPoints: adrenalineRushProfilePayload(),
  } as const;
}

function adrenalineRushProfilePayload() {
  return {
    activationCost: { kind: "bonusAction", action: "dash" },
    temporaryHitPoints: { amount: { kind: "proficiencyBonus" } },
    resource: {
      cap: { kind: "proficiencyBonus" },
      resetCadence: "shortOrLongRest",
    },
  } as const;
}

function rovingSpeedBonusProfile() {
  return {
    deltaFeet: movementDeltaFeet(10),
    condition: {
      kind: "notWearingArmor",
      categories: ["heavy"],
    },
  } as const;
}

function rovingSpeedKindGrants() {
  return [
    { speedKind: "climb", feet: { kind: "walkSpeed" } },
    { speedKind: "swim", feet: { kind: "walkSpeed" } },
  ] as const;
}

function rovingMovementHole(
  state: BattleState,
): Extract<BattleHole, { readonly kind: "movement" }> {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.actorId === spellCasterId &&
      candidate.subject.command === "move",
  );
  if (act === undefined) {
    throw new Error("Expected Roving Movement act.");
  }
  return requireHole(act.initialHoles, "movement");
}

function archeryFeatureUnit(): PassiveFeatUnit {
  const unit = unitLibrary.requireUnit(archeryUnitId);
  expect(isPassiveFeatUnit(unit)).toBe(true);
  if (!isPassiveFeatUnit(unit)) {
    throw new Error("Expected Archery passive feat Unit.");
  }
  return unit;
}

function isPassiveFeatUnit(unit: UnitRecord): unit is PassiveFeatUnit {
  return unit.kind === "feat" && unit.mechanics.family === "passive";
}

function heavyArmorClassState(): ReturnType<typeof defaultArmorClassState> {
  return {
    ...defaultArmorClassState(),
    base: {
      kind: "armor",
      category: "heavy",
      formula: { kind: "heavy_fixed", ac: 16 },
    },
    armorTraining: new Set(["heavy"]),
  };
}

function characterCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
  readonly attack?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"];
  readonly characterUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
  readonly classLevels?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"];
  readonly currentHp?: number;
  readonly maxHp?: number;
  readonly tempHp?: number;
  readonly resources?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["resources"];
  readonly armorClass?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["armorClass"];
  readonly unitFeatures?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["unitFeatures"];
}): BattleCreatureInit {
  const attack = input.attack ?? null;
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: input.characterUnitRefs ?? [],
      classLevels: input.classLevels ?? [{ className: "wizard", level: 1 }],
      armorClass:
        input.armorClass !== undefined
          ? input.armorClass
          : attack === null
            ? defaultArmorClassState()
            : { ...defaultArmorClassState(), rightHandUse: "mainWeapon" },
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(input.currentHp ?? 12),
      maxHp: Hp(input.maxHp ?? 12),
      tempHp: Hp(input.tempHp ?? 0),
      selectedLoadout:
        attack === null
          ? {}
          : {
              weapon: {
                itemId: `main:${attack.weapon.id}`,
                unitId: attack.weapon.id,
                grip: "one_handed" as const,
              },
            },
      attack,
      ...(input.unitFeatures === undefined
        ? {}
        : { unitFeatures: input.unitFeatures }),
      ...(input.resources === undefined ? {} : { resources: input.resources }),
      unarmedStrike: {
        kind: "unarmedStrike",
        effect: {
          kind: "damage",
          damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
        },
        attackAbility: "str",
        attackAbilityModifier: abilityModifier(0),
        attackBonus: attackBonus(2),
        damageAbilityModifier: abilityModifier(0),
      },
      ...(input.spellcasting === undefined
        ? {}
        : { spellcasting: input.spellcasting }),
    },
  };
}

function zeroAbilityWeaponAttack(
  unitId: "weapon_longsword" | "weapon_shortbow",
): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"]
> {
  const weapon = unitLibrary.requireUnit(unitId);
  if (weapon.kind !== "weapon") {
    throw new Error(`Expected ${unitId} weapon Unit.`);
  }
  return {
    kind: "weapon",
    weapon,
    ability: "str",
    abilityModifier: abilityModifier(0),
  };
}

function weaponAttackRollHole(input: {
  readonly state: BattleState;
  readonly attackName: "Longsword" | "Shortbow";
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
}): Extract<BattleHole, { readonly kind: "attackRoll" }> {
  const subject: BattleSubject = {
    tag: "action",
    actorId: input.actorId,
    action: "attack",
    attackName: input.attackName,
  };
  const targetHole = requireResultHole(
    resolveBattleSubject({ state: input.state, subject, fills: [] }),
    "targetChoice",
  );
  return requireResultHole(
    resolveBattleSubject({
      state: input.state,
      subject,
      fills: [
        attackTargetFill(
          targetHole,
          input.actorId,
          input.targetId,
          input.attackName,
        ),
      ],
    }),
    "attackRoll",
  );
}

function weaponAttackSubject(
  attackName: "Longsword" | "Shortbow",
): Extract<BattleSubject, { readonly tag: "action" }> {
  return {
    tag: "action",
    actorId: spellCasterId,
    action: "attack",
    attackName,
  };
}

function requireResultHole<K extends BattleHole["kind"]>(
  result: ReturnType<typeof resolveBattleSubject>,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  expect(result).toMatchObject({ tag: "needsHoles" });
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected ${kind} hole result.`);
  }
  return requireHole(result.holes, kind);
}

function reactionDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "reactionDecision" }>,
  value: Extract<BattleFill, { readonly kind: "reactionDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "reactionDecision" }> {
  return { kind: "reactionDecision", holeId: hole.holeId, value };
}

function spellAct(input: {
  readonly state: BattleState;
  readonly spellId: string;
  readonly slotLevel?: number;
}): ActionSpellAct {
  const act = maybeSpellAct(input);
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error(`Expected ${input.spellId} spell act.`);
  }
  return act;
}

function maybeSpellAct(input: {
  readonly state: BattleState;
  readonly spellId: string;
  readonly slotLevel?: number;
}): ActionSpellAct | undefined {
  return discoverBattleActs(input.state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === input.spellId &&
      (input.slotLevel === undefined ||
        (candidate.subject.invocation.tag === "spellSlot" &&
          Number(candidate.subject.invocation.slotLevel) === input.slotLevel)),
  );
}

function bonusSpellAct(input: {
  readonly state: BattleState;
  readonly spellId: string;
}): BonusActionSpellAct {
  const act = discoverBattleActs(input.state).find(
    (candidate): candidate is BonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.invocation.spellId === input.spellId,
  );
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error(`Expected ${input.spellId} Bonus Action spell act.`);
  }
  return act;
}

function requireHole<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function attackTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  actorId: CombatantId,
  targetId: CombatantId,
  attackName = "Unarmed Strike",
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      attackName === "Shortbow"
        ? {
            kind: "attackTargetInRangedRange",
            actorId,
            targetId,
            attackName,
            rangeBand: "normal",
          }
        : {
            kind: "attackTargetInMeleeReach",
            actorId,
            targetId,
            attackName,
          },
    ],
  };
}

function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  value: {
    readonly total: number;
    readonly naturalD20: number;
    readonly rollMode?: "advantage" | "disadvantage" | "normal";
    readonly missToHitReplacementUnitId?: string;
  },
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
      ...(value.rollMode === undefined ? {} : { rollMode: value.rollMode }),
      ...(value.missToHitReplacementUnitId === undefined
        ? {}
        : { missToHitReplacementUnitId: value.missToHitReplacementUnitId }),
    },
  };
}

function movementFill(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
  value: {
    readonly speedKind?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["speedKind"];
    readonly movementCostFeet: number;
    readonly provokedOpportunityAttacks: readonly {
      readonly reactorId: CombatantId;
      readonly attackName: string;
    }[];
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: value.speedKind ?? "walk",
      movementCostFeet: movementFeet(value.movementCostFeet),
      provokedOpportunityAttacks: value.provokedOpportunityAttacks,
    },
  };
}

function spellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellId: string,
  casterId: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId,
        targetId,
        spellId,
      },
    ],
  };
}

function spellTargetListFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetList" }>,
  casterId: CombatantId,
  spellId: string,
  targetIds: readonly CombatantId[],
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  if (hole.spell.targeting.kind === "pointOriginSphereTargetList") {
    return {
      kind: "spellTargetList",
      holeId: hole.holeId,
      value: { targetIds },
      spatialFacts: [
        {
          kind: "spellTargetsInPointOriginSphere",
          casterId,
          spellId,
          areaId: `test:${spellId}:point-origin-sphere`,
          radiusFeet: hole.spell.targeting.area.radiusFeet,
          targetIds,
        },
      ],
    };
  }
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds },
    spatialFacts: targetIds.map((targetId) => ({
      kind: "spellTarget",
      casterId,
      targetId,
      spellId,
    })),
  };
}

function savingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value:
      "spell" in hole
        ? {
            area: {
              originAnchorId: spellCasterId,
              affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
            },
            outcomes,
          }
        : { outcomes },
  };
}

function damageRollFillWithGroups(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  groups: readonly (readonly number[])[],
  selectedAttackDamageRiderUnitIds?: readonly string[],
  weaponDamageDiceRollChoice?: Extract<
    BattleFill,
    { readonly kind: "rolledDice" }
  >["weaponDamageDiceRollChoice"],
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  const [firstGroup, ...restGroups] = groups;
  if (firstGroup === undefined) {
    throw new Error("Expected at least one rolled dice group.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    ...(selectedAttackDamageRiderUnitIds === undefined
      ? {}
      : { selectedAttackDamageRiderUnitIds }),
    ...(weaponDamageDiceRollChoice === undefined
      ? {}
      : { weaponDamageDiceRollChoice }),
    value: [
      rolledDiceGroup(firstGroup),
      ...restGroups.map((group) => rolledDiceGroup(group)),
    ],
  };
}

function attackDamageDispositionFill(
  hole: Extract<BattleHole, { readonly kind: "attackDamageDisposition" }>,
  value: Extract<
    BattleFill,
    { readonly kind: "attackDamageDisposition" }
  >["value"],
): Extract<BattleFill, { readonly kind: "attackDamageDisposition" }> {
  return {
    kind: "attackDamageDisposition",
    holeId: hole.holeId,
    value,
  };
}

function rolledDiceGroup(
  group: readonly number[],
): Extract<BattleFill, { readonly kind: "rolledDice" }>["value"][number] {
  const [firstResult, ...restResults] = group;
  if (firstResult === undefined) {
    throw new Error("Expected at least one die roll result.");
  }
  return {
    results: [DieRollResult(firstResult), ...restResults.map(DieRollResult)],
  };
}

function mechanicsOnlyClassicUnit(
  input: typeof myceliumStepInput,
): ClassicNonSrdMechanicsUnit {
  if (
    input.id !== myceliumStepUnitId ||
    input.syntheticLabel !== "Mycelium Step" ||
    input.provenance.kind !== "classic-2024-mechanics-source-lane" ||
    input.mechanics.family !== "alternate_action_cost" ||
    input.mechanics.from.kind !== "standard_action" ||
    input.mechanics.from.actions.length !== 1 ||
    input.mechanics.from.actions[0] !== "dash" ||
    input.mechanics.to.kind !== "bonus_action"
  ) {
    throw new Error("Classic mycelium_step fixture shape drifted.");
  }

  return {
    id: myceliumStepUnitId,
    syntheticLabel: "Mycelium Step",
    provenance: { kind: "classic-2024-mechanics-source-lane" },
    kind: "class_feature",
    mechanics: {
      family: "alternate_action_cost",
      from: { kind: "standard_action", actions: ["dash"] },
      to: { kind: "bonus_action" },
    },
  };
}

function spellActInvocation(act: ActionSpellAct): SupportedSpellInvocation {
  const hole = act.initialHoles[0];
  return spellHoleInvocation(hole === undefined ? [] : [hole]);
}

function spellHoleInvocation(
  holes: readonly BattleHole[],
): SupportedSpellInvocation {
  const hole = holes[0];
  if (hole === undefined || !("spell" in hole)) {
    throw new Error("Expected spell hole to carry invocation.");
  }
  return hole.spell;
}
