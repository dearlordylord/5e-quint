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
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants
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
  ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE,
  PASSIVE_ARMOR_CLASS_BONUS_SUPPORT_PROFILE,
  PASSIVE_RANGED_ATTACK_ROLL_BONUS_SUPPORT_PROFILE,
  battleCombatantSide,
  battleId,
  battleUnitRefWithSupportProfiles,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
  resolveBattleSubject,
  SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
  snapshotBattle,
  startBattle,
  WEAPON_DAMAGE_DICE_ROLL_CHOICE_SUPPORT_PROFILE,
  WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type BattleSubject,
  type CombatantId,
  type SupportedSpellAct,
} from "./index.ts";
import {
  ALTERNATE_ACTION_COST_ACTIONS,
  PASSIVE_SPEED_BONUS_SUPPORT_PROFILE,
  PASSIVE_SPEED_KIND_GRANTS_SUPPORT_PROFILE,
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
const fighterImprovedCriticalUnitId = "fighter_improved_critical";
const fighterExtraAttackUnitId = "fighter_extra_attack";
const barbarianRageUnitId = "barbarian_rage";
const barbarianRecklessAttackUnitId = "barbarian_reckless_attack";
const barbarianFastMovementUnitId = "barbarian_fast_movement";
const rangerRovingUnitId = "ranger_roving";
const rogueCunningActionUnitId = "rogue_cunning_action";
const rogueEvasionUnitId = "rogue_evasion";
const rogueUncannyDodgeUnitId = "rogue_uncanny_dodge";
const rogueSneakAttackUnitId = "rogue_sneak_attack";
const defenseUnitId = "defense";
const myceliumStepUnitId = "mycelium_step";
const archeryUnitId = "feat_archery";
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
        supportProfiles: [PASSIVE_RANGED_ATTACK_ROLL_BONUS_SUPPORT_PROFILE],
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
      spellId: magicMissileUnitId,
      spellActId: "preparedSlotSpell:magic_missile:slot:1",
    });
    expect(spellActInvocation(act)).toEqual(
      expect.objectContaining({
        kind: "preparedSlotSpell",
        spell,
        slotLevel: 1,
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
      spellId: rayOfFrostUnitId,
      spellActId: "cantripSpellAttack:ray_of_frost",
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
      spellId: acidSplashUnitId,
      spellActId: "cantripSaveGateDamage:acid_splash",
    });
    expect(spellActInvocation(act)).toEqual(
      expect.objectContaining({
        kind: "cantripSaveGateDamage",
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
      spellId: mageArmorUnitId,
      spellActId: "preparedPersistentSpell:mage_armor:slot:1",
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
      spellId: healingWordUnitId,
      spellActId: "preparedHealingSpell:healing_word:slot:1",
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
        kind: "preparedHealingSpell",
        spell,
        slotLevel: 1,
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
      spellId: cureWoundsUnitId,
      spellActId: "preparedHealingSpell:cure_wounds:slot:1",
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
        kind: "preparedHealingSpell",
        spell,
        actionCost: "magicAction",
        targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
        slotLevel: 1,
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
      spellId: massHealingWordUnitId,
      spellActId: "preparedHealingSpell:mass_healing_word:slot:3",
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
        kind: "preparedHealingSpell",
        actionCost: "bonusAction",
        targeting: { kind: "targetList", minTargets: 1, maxTargets: 6 },
        slotLevel: 3,
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
      spellId: massCureWoundsUnitId,
      spellActId: "preparedHealingSpell:mass_cure_wounds:slot:5",
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
        kind: "preparedHealingSpell",
        spell,
        actionCost: "magicAction",
        targeting: {
          kind: "pointOriginSphereTargetList",
          minTargets: 1,
          maxTargets: 6,
          area: { kind: "pointOriginSphere", radiusFeet: 30 },
        },
        slotLevel: 5,
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
        kind: "preparedHealingSpell",
        slotLevel: 6,
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
          supportProfiles: [ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE],
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
}): BattleState {
  const archeryUnitRef = archeryBattleUnitRef();
  const result = startBattle({
    battleId: battleId("unit-profile-archery-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Archer",
        initiative: 20,
        side: partySide,
        attack: input.attack,
        characterUnitRefs: [archeryUnitRef],
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
      supportProfiles: [ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE],
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
      supportProfiles: [PASSIVE_RANGED_ATTACK_ROLL_BONUS_SUPPORT_PROFILE],
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
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
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
      candidate.subject.spellId === input.spellId &&
      (input.slotLevel === undefined ||
        candidate.subject.spellActId?.endsWith(`:slot:${input.slotLevel}`) ===
          true),
  );
}

function bonusSpellAct(input: {
  readonly state: BattleState;
  readonly spellId: string;
}): BonusActionSpellAct {
  const act = discoverBattleActs(input.state).find(
    (candidate): candidate is BonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.spellId === input.spellId,
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
  },
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
      ...(value.rollMode === undefined ? {} : { rollMode: value.rollMode }),
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

function spellActInvocation(act: ActionSpellAct): SupportedSpellAct {
  const hole = act.initialHoles[0];
  return spellHoleInvocation(hole === undefined ? [] : [hole]);
}

function spellHoleInvocation(holes: readonly BattleHole[]): SupportedSpellAct {
  const hole = holes[0];
  if (hole === undefined || !("spell" in hole)) {
    throw new Error("Expected spell hole to carry invocation.");
  }
  return hole.spell;
}
