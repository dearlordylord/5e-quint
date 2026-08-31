// RAW-COVERAGE: runtime-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.alternate-action-cost unit-feature.action-surge-resource unit-feature.acrobatic-movement unit-feature.attack-action-area-save-damage-replacement unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-damage-die-floor unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bardic-inspiration-grant unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-delegated-standard-actions unit-feature.bonus-action-ongoing-rage unit-feature.brutal-strike unit-feature.creature-space-movement-permission unit-feature.cunning-strike unit-feature.druid-wild-shape-known-form unit-feature.enemy-zero-hit-point-temporary-hit-points unit-feature.failed-ability-check-resource-boost unit-feature.failed-saving-throw-reroll unit-feature.first-attack-roll-reckless-advantage unit-feature.grappler unit-feature.hide-action-obscurement-permission unit-feature.hunters-prey unit-feature.initiative-proficiency-and-swap unit-feature.innate-sorcery-activation unit-feature.light-extra-attack-damage-ability-modifier unit-feature.magic-action-area-save-damage-healing unit-feature.magic-action-healing-pool unit-feature.magic-action-save-gated-condition unit-feature.martial-arts-attack-projection unit-feature.monk-focus-battle-options unit-feature.open-hand-technique unit-feature.paladin-sacred-weapon unit-feature.passive-ability-check-roll-mode unit-feature.passive-armor-class-bonus unit-feature.passive-damage-resistance unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-saving-throw-roll-mode unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.potent-cantrip unit-feature.reaction-roll-or-damage-reduction unit-feature.retaliation-reaction-attack unit-feature.remarkable-athlete unit-feature.rogue-steady-aim unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.spell-slot-healing-modifier unit-feature.stunning-strike unit-feature.weapon-critical-range-19 unit-feature.weapon-damage-dice-roll-choice unit-feature.weapon-mastery-sap unit-feature.weapon-mastery-topple unit-feature.weapon-mastery-cleave unit-feature.weapon-mastery-push unit-feature.weapon-mastery-slow unit-feature.fighter-tactical-master unit-feature.zero-hit-point-replacement
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.cunning-strike-option-grant
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll
import { optionalProperty } from "./optional-property.ts";
import { Match, Result } from "effect";
import { sameStringSet } from "./same-string-set.ts";
import {
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { CLASS_NAMES, unitId } from "@dnd/shared/game-facts";
import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import { zeroHitPointReplacementUnitProfile } from "@dnd/shared-algebras/zero-hit-point-replacement-algebra";
import {
  ARMOR_CATEGORIES,
  CONDITIONS as ALL_CONDITIONS,
  ClassLevel,
  DAMAGE_TYPES,
  classLevel,
  movementDeltaFeet,
  movementFeet,
  type Condition,
  type DamageType,
  type DamageDieSize,
  type MovementFeet,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type {
  Ability,
  ActivatedAbilityMechanics,
  ActionRestriction,
  AreaShapeSpec,
  ClassName,
  DiceAmount,
  DiceDelta,
  DiceExpr,
  EffectAtom,
  EquipmentPredicate,
  DragonbornSpeciesSource,
  StandardActionKind,
  AuthoredUnitSource,
  MasteryRecord,
  WeaponMasteryName,
} from "@dnd/surface/surface/types";
import { isEffectAtom } from "@dnd/surface/surface/types";
import type { BattleUnitRef } from "./battle-init.ts";
import type {
  CharacterBattleClassLevel,
  CharacterBattleClassLevelInit,
} from "./character-class-level.ts";
import { type BrutalStrikeProfile } from "./procedure-execution/brutal-strike.ts";
import { admitAtomicClassFeatureProcedure } from "./procedure-admission/atomic-class-feature.ts";
import { admitAtomicSpeciesTraitProcedure } from "./procedure-admission/atomic-species-trait-procedure.ts";
import {
  admitDruidWildShapeProcedure,
  type DruidWildShapeProcedureTemplate,
} from "./procedure-admission/druid-wild-shape.ts";
import {
  admitFailedSavingThrowRerollProcedure,
  type FailedSavingThrowRerollProcedureFacts,
} from "./procedure-admission/failed-saving-throw-reroll.ts";
import {
  admitMonkFocusProcedure,
  type MonkFocusProcedureFacts,
} from "./procedure-admission/monk-focus.ts";
import { admitWeaponMasteryProcedure } from "./procedure-admission/weapon-mastery.ts";
export {
  battleWeaponMasteryCleaveSupportForUnit,
  battleWeaponMasteryPushSupportForUnit,
  battleWeaponMasterySapSupportForUnit,
  battleWeaponMasterySlowSupportForUnit,
  battleWeaponMasteryToppleSupportForUnit,
  type BattleWeaponMasteryCleaveSupport,
  type BattleWeaponMasteryPushSupport,
  type BattleWeaponMasterySapSupport,
  type BattleWeaponMasterySlowSupport,
  type BattleWeaponMasteryToppleSupport,
} from "./procedure-admission/weapon-mastery.ts";
export type {
  BrutalStrikeEffect,
  BrutalStrikeHamstringEffect,
  BrutalStrikeOptionId,
  BrutalStrikeProfile,
} from "./procedure-execution/brutal-strike.ts";

export const WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE =
  "weaponOrUnarmedCriticalRange19";
export const ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE = "attackDamageRider";
export const SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE = "saveDamageReplacement";
export const REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE =
  "reactionRollOrDamageReduction";
const CUTTING_WORDS_REACTION_RANGE_FEET = 60;
export const ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE =
  "attackDamageReductionZeroDamageRedirect";
export const PASSIVE_ARMOR_CLASS_BONUS_SUPPORT_PROFILE =
  "passiveArmorClassBonus";
export const INITIATIVE_PROFICIENCY_AND_SWAP_SUPPORT_PROFILE =
  "initiativeProficiencyAndSwap";
export const ATTACK_ACTION_AREA_SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE =
  "attackActionAreaSaveDamageReplacement";
export const D20_TEST_NATURAL_ONE_REROLL_SUPPORT_PROFILE =
  "d20TestNaturalOneReroll";
export const PASSIVE_SAVING_THROW_ROLL_MODE_SUPPORT_PROFILE =
  "passiveSavingThrowRollMode";
const PASSIVE_CONDITION_SAVING_THROW_ROLL_MODE_CONDITIONS = [
  "poisoned",
  "frightened",
] as const satisfies ReadonlyArray<Condition>;
type PassiveConditionSavingThrowRollModeCondition =
  (typeof PASSIVE_CONDITION_SAVING_THROW_ROLL_MODE_CONDITIONS)[number];
export const PASSIVE_ABILITY_CHECK_ROLL_MODE_SUPPORT_PROFILE =
  "passiveAbilityCheckRollMode";
export const PASSIVE_DAMAGE_RESISTANCE_SUPPORT_PROFILE =
  "passiveDamageResistance";
export const ACROBATIC_MOVEMENT_SUPPORT_PROFILE = "acrobaticMovement";
export const CREATURE_SPACE_MOVEMENT_PERMISSION_SUPPORT_PROFILE =
  "creatureSpaceMovementPermission";
export * from "./unit-feature-execution-constants.ts";
import {
  ALTERNATE_ACTION_COST_ACTIONS,
  ATTACK_DAMAGE_DIE_FLOOR_MINIMUM_RESULT,
  ATTACK_DAMAGE_DIE_FLOOR_SUPPORT_PROFILE,
  ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE,
  ATTACK_ROLL_MISS_TO_HIT_REPLACEMENT_SUPPORT_PROFILE,
  BATTLE_ATTACK_ACTION_ADDITIONAL_ATTACKS,
  BRUTAL_STRIKE_SUPPORT_PROFILE,
  BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
  BONUS_ACTION_DELEGATED_STANDARD_ACTIONS_SUPPORT_PROFILE,
  CUNNING_STRIKE_OPTION_GRANT_SUPPORT_PROFILE,
  CUNNING_STRIKE_SUPPORT_PROFILE,
  DRACONIC_ANCESTRY_DAMAGE_TYPE_HOLE_ID,
  HIDE_ACTION_OBSCUREMENT_PERMISSION_SUPPORT_PROFILE,
  HUNTERS_PREY_SUPPORT_PROFILE,
  LIGHT_EXTRA_ATTACK_DAMAGE_ABILITY_MODIFIER_SUPPORT_PROFILE,
  MARTIAL_ARTS_BASE_DIE_SIZE,
  MARTIAL_ARTS_DIE_TIERS,
  MARTIAL_ARTS_ATTACK_PROJECTION_SUPPORT_PROFILE,
  MONK_FOCUS_BATTLE_OPTIONS_SUPPORT_PROFILE,
  PASSIVE_RANGED_ATTACK_ROLL_BONUS_SUPPORT_PROFILE,
  PASSIVE_SPEED_BONUS_SUPPORT_PROFILE,
  PASSIVE_SPEED_KIND_GRANTS_SUPPORT_PROFILE,
  PASSIVE_SPEED_KIND_GRANT_KINDS,
  TACTICAL_MASTER_REPLACEMENT_MASTERY_PROPERTIES,
  TACTICAL_MASTER_REPLACEMENT_SUPPORT_PROFILE,
  WEAPON_DAMAGE_DICE_ROLL_CHOICE_SUPPORT_PROFILE,
  WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE,
  WEAPON_MASTERY_PUSH_SUPPORT_PROFILE,
  WEAPON_MASTERY_SAP_SUPPORT_PROFILE,
  WEAPON_MASTERY_SLOW_SUPPORT_PROFILE,
  WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE,
  isWeaponMasteryPropertySupportProfile,
  weaponMasteryExecutionPropertyForSupportProfile,
  martialArtsSrdDieSizeAtClassLevel,
  type AlternateActionCostAction,
  type BattleAttackActionAdditionalAttacks,
  type BattleCunningStrikeSupportProfile,
  type BattlePassiveSpeedBonusSupportProfile,
  type BattlePassiveSpeedKindGrantsSupportProfile,
  type CunningStrikeEquipmentGatedConditionSaveEffect,
  type CunningStrikeHideInvisibleEndSuppressionEffect,
  type CunningStrikeOption,
  type CunningStrikePostDamageMovementEffect,
  type CunningStrikeSizeGatedConditionSaveEffect,
  type HideActionObscurementPermissionProfile,
  type MartialArtsDieSize,
  type OngoingFeatureDamageModifier,
  type OngoingFeatureExtensionTrigger,
  type OngoingFeatureLifecycleProfile,
  type OngoingFeatureRollModifier,
  type PassiveSavingThrowRollModeProfile,
  type PassiveSpeedBonusCondition,
  type PassiveSpeedBonusProfile,
  type PassiveSpeedKindGrantKind,
  type PassiveSpeedKindGrantProfile,
} from "./unit-feature-execution-constants.ts";
export const ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE =
  "zeroHitPointReplacement";
export const FAILED_ABILITY_CHECK_RESOURCE_BOOST_SUPPORT_PROFILE =
  "failedAbilityCheckResourceBoost";
export const FAILED_SAVING_THROW_REROLL_SUPPORT_PROFILE =
  "failedSavingThrowReroll";
export const BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE =
  "bardicInspirationGrant";
export {
  DRUID_WILD_SHAPE_KNOWN_FORM_SUPPORT_PROFILE,
  type BattleDruidWildShapeKnownFormSupportProfile,
} from "./druid-wild-shape-support-execution.ts";
import {
  DRUID_WILD_SHAPE_KNOWN_FORM_SUPPORT_PROFILE,
  type BattleDruidWildShapeKnownFormSupportProfile,
} from "./druid-wild-shape-support-execution.ts";
export const DRUID_BEAST_SPELLS_CLASS_LEVEL = 18;
export const DRUID_WILD_COMPANION_SPELL_CAST_SUPPORT_PROFILE =
  "druidWildCompanionSpellCast";
export const SPELL_SLOT_HEALING_MODIFIER_SUPPORT_PROFILE =
  "spellSlotHealingModifier";
export const MAGIC_ACTION_HEALING_POOL_SUPPORT_PROFILE =
  "magicActionHealingPool";
export const MAGIC_ACTION_AREA_SAVE_DAMAGE_HEALING_SUPPORT_PROFILE =
  "magicActionAreaSaveDamageHealing";
export const MAGIC_ACTION_SAVE_GATED_CONDITION_SUPPORT_PROFILE =
  "magicActionSaveGatedCondition";
export const ENEMY_ZERO_HIT_POINT_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE =
  "enemyZeroHitPointTemporaryHitPoints";
export const REMARKABLE_ATHLETE_SUPPORT_PROFILE = "remarkableAthlete";
export const OPEN_HAND_TECHNIQUE_SUPPORT_PROFILE = "openHandTechnique";
export const STUNNING_STRIKE_SUPPORT_PROFILE = "stunningStrike";
export const PALADIN_SACRED_WEAPON_SUPPORT_PROFILE = "paladinSacredWeapon";
export const ROGUE_STEADY_AIM_SUPPORT_PROFILE = "rogueSteadyAim";
export const POTENT_CANTRIP_SUPPORT_PROFILE = "potentCantrip";
export const GRAPPLER_SUPPORT_PROFILE = "grappler";
export const RETALIATION_REACTION_ATTACK_SUPPORT_PROFILE =
  "retaliationReactionAttack";
const BARDIC_INSPIRATION_RANGE_FEET = 60;
const BARDIC_INSPIRATION_BASE_DIE_SIZE = 6;
const CLERIC_CHANNEL_DIVINITY_RESOURCE_UNIT_ID = unitId(
  "cleric_channel_divinity",
);
const DRUID_WILD_SHAPE_RESOURCE_UNIT_ID = unitId("druid_wild_shape");
const MONK_FOCUS_RESOURCE_UNIT_ID = unitId("monk_monks_focus");
const MONK_FLURRY_OF_BLOWS_OPTION_ID = "flurry_of_blows" as const;
type DraconicAncestryDamageTypeSource =
  DragonbornSpeciesSource["draconicAncestry"]["damageType"];
type DraconicAncestryDamageType =
  DraconicAncestryDamageTypeSource["options"][number]["damageType"];
const DAMAGE_TYPE_VALUES = new Set<string>(DAMAGE_TYPES);
export type BattleUnitSupportProfileSourceFacts = {
  readonly draconicAncestryDamageType: DraconicAncestryDamageType;
};
const BARDIC_INSPIRATION_DIE_TIERS = [
  { atLevel: 5, dieSize: 8 },
  { atLevel: 10, dieSize: 10 },
  { atLevel: 15, dieSize: 12 },
] as const satisfies ReadonlyArray<{
  readonly atLevel: number;
  readonly dieSize: DamageDieSize;
}>;
type BardicInspirationDieSize =
  | typeof BARDIC_INSPIRATION_BASE_DIE_SIZE
  | (typeof BARDIC_INSPIRATION_DIE_TIERS)[number]["dieSize"];
export const BATTLE_UNIT_SUPPORT_PROFILES = [
  "alternateActionCost",
  WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
  SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
  PASSIVE_ARMOR_CLASS_BONUS_SUPPORT_PROFILE,
  PASSIVE_RANGED_ATTACK_ROLL_BONUS_SUPPORT_PROFILE,
  INITIATIVE_PROFICIENCY_AND_SWAP_SUPPORT_PROFILE,
  ATTACK_ROLL_MISS_TO_HIT_REPLACEMENT_SUPPORT_PROFILE,
  ATTACK_ACTION_AREA_SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
  D20_TEST_NATURAL_ONE_REROLL_SUPPORT_PROFILE,
  PASSIVE_SAVING_THROW_ROLL_MODE_SUPPORT_PROFILE,
  PASSIVE_ABILITY_CHECK_ROLL_MODE_SUPPORT_PROFILE,
  PASSIVE_DAMAGE_RESISTANCE_SUPPORT_PROFILE,
  PASSIVE_SPEED_BONUS_SUPPORT_PROFILE,
  PASSIVE_SPEED_KIND_GRANTS_SUPPORT_PROFILE,
  ACROBATIC_MOVEMENT_SUPPORT_PROFILE,
  CREATURE_SPACE_MOVEMENT_PERMISSION_SUPPORT_PROFILE,
  HIDE_ACTION_OBSCUREMENT_PERMISSION_SUPPORT_PROFILE,
  WEAPON_DAMAGE_DICE_ROLL_CHOICE_SUPPORT_PROFILE,
  ATTACK_DAMAGE_DIE_FLOOR_SUPPORT_PROFILE,
  LIGHT_EXTRA_ATTACK_DAMAGE_ABILITY_MODIFIER_SUPPORT_PROFILE,
  MARTIAL_ARTS_ATTACK_PROJECTION_SUPPORT_PROFILE,
  ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE,
  BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE,
  DRUID_WILD_SHAPE_KNOWN_FORM_SUPPORT_PROFILE,
  DRUID_WILD_COMPANION_SPELL_CAST_SUPPORT_PROFILE,
  BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
  FAILED_ABILITY_CHECK_RESOURCE_BOOST_SUPPORT_PROFILE,
  FAILED_SAVING_THROW_REROLL_SUPPORT_PROFILE,
  MONK_FOCUS_BATTLE_OPTIONS_SUPPORT_PROFILE,
  SPELL_SLOT_HEALING_MODIFIER_SUPPORT_PROFILE,
  MAGIC_ACTION_HEALING_POOL_SUPPORT_PROFILE,
  MAGIC_ACTION_AREA_SAVE_DAMAGE_HEALING_SUPPORT_PROFILE,
  MAGIC_ACTION_SAVE_GATED_CONDITION_SUPPORT_PROFILE,
  ENEMY_ZERO_HIT_POINT_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
  BONUS_ACTION_DELEGATED_STANDARD_ACTIONS_SUPPORT_PROFILE,
  REMARKABLE_ATHLETE_SUPPORT_PROFILE,
  OPEN_HAND_TECHNIQUE_SUPPORT_PROFILE,
  STUNNING_STRIKE_SUPPORT_PROFILE,
  CUNNING_STRIKE_SUPPORT_PROFILE,
  CUNNING_STRIKE_OPTION_GRANT_SUPPORT_PROFILE,
  PALADIN_SACRED_WEAPON_SUPPORT_PROFILE,
  HUNTERS_PREY_SUPPORT_PROFILE,
  ROGUE_STEADY_AIM_SUPPORT_PROFILE,
  POTENT_CANTRIP_SUPPORT_PROFILE,
  GRAPPLER_SUPPORT_PROFILE,
  BRUTAL_STRIKE_SUPPORT_PROFILE,
  RETALIATION_REACTION_ATTACK_SUPPORT_PROFILE,
  WEAPON_MASTERY_SAP_SUPPORT_PROFILE,
  WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE,
  WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE,
  WEAPON_MASTERY_PUSH_SUPPORT_PROFILE,
  WEAPON_MASTERY_SLOW_SUPPORT_PROFILE,
  TACTICAL_MASTER_REPLACEMENT_SUPPORT_PROFILE,
  ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE,
] as const;
export type PassiveRangedAttackRollBonusProfile = {
  readonly bonus: 2;
  readonly weaponFilter: {
    readonly kind: "weaponCategory";
    readonly category: "ranged";
  };
};
export type BattlePassiveRangedAttackRollBonusSupportProfile = {
  readonly kind: typeof PASSIVE_RANGED_ATTACK_ROLL_BONUS_SUPPORT_PROFILE;
  readonly attackRoll: PassiveRangedAttackRollBonusProfile;
};
export type InitiativeProficiencyAndSwapProfile = {
  readonly initiativeRollBonus: {
    readonly amount: { readonly kind: "proficiencyBonus" };
  };
  readonly swap: {
    readonly timing: "immediatelyAfterInitiativeRoll";
    readonly ally: "willingAllySameCombat";
    readonly prohibitedByCondition: "incapacitated";
  };
};
export type BattleInitiativeProficiencyAndSwapSupportProfile = {
  readonly kind: typeof INITIATIVE_PROFICIENCY_AND_SWAP_SUPPORT_PROFILE;
  readonly initiative: InitiativeProficiencyAndSwapProfile;
};
export type AttackRollMissToHitReplacementProfile = {
  readonly optional: true;
  readonly trigger: "missWithAttackRoll";
  readonly effect: "replaceMissWithHit";
  readonly resetCadence: "startOfNextTurn";
};
export type BattleAttackRollMissToHitReplacementSupportProfile = {
  readonly kind: typeof ATTACK_ROLL_MISS_TO_HIT_REPLACEMENT_SUPPORT_PROFILE;
  readonly replacement: AttackRollMissToHitReplacementProfile;
};
export type AttackActionAreaSaveDamageReplacementProfile = {
  readonly activationCost: { readonly kind: "replaceAttack" };
  readonly resource: {
    readonly cap: { readonly kind: "proficiencyBonus" };
    readonly resetCadence: "longRest";
  };
  readonly area: {
    readonly origin: { readonly kind: "self" };
    readonly shapeChoice: readonly [
      { readonly kind: "cone"; readonly lengthFeet: MovementFeet },
      {
        readonly kind: "line";
        readonly lengthFeet: MovementFeet;
        readonly widthFeet: MovementFeet;
      },
    ];
  };
  readonly save: {
    readonly ability: "dex";
    readonly dc: {
      readonly kind: "innate";
      readonly base: 8;
      readonly ability: "con";
    };
  };
  readonly damage: {
    readonly damageType: {
      readonly kind: "draconicAncestry";
      readonly holeId: typeof DRACONIC_ANCESTRY_DAMAGE_TYPE_HOLE_ID;
      readonly value: DraconicAncestryDamageType;
    };
    readonly amount: {
      readonly kind: "characterLevelDice";
      readonly base: { readonly dice: 1; readonly dieSize: 10 };
      readonly tiers: readonly [
        { readonly atLevel: 5; readonly dice: 2 },
        { readonly atLevel: 11; readonly dice: 3 },
        { readonly atLevel: 17; readonly dice: 4 },
      ];
    };
    readonly onSuccess: "halfDamage";
  };
};
export type BattleAttackActionAreaSaveDamageReplacementSupportProfile = {
  readonly kind: typeof ATTACK_ACTION_AREA_SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE;
  readonly breath: AttackActionAreaSaveDamageReplacementProfile;
};
export type D20TestNaturalOneRerollProfile = {
  readonly optional: true;
  readonly trigger: {
    readonly kind: "d20TestRollIs";
    readonly dieFace: 1;
  };
  readonly reroll: {
    readonly kind: "triggeringD20";
    readonly use: "newRoll";
  };
};
export type BattleD20TestNaturalOneRerollSupportProfile = {
  readonly kind: typeof D20_TEST_NATURAL_ONE_REROLL_SUPPORT_PROFILE;
  readonly reroll: D20TestNaturalOneRerollProfile;
};
export type BattlePassiveSavingThrowRollModeSupportProfile = {
  readonly kind: typeof PASSIVE_SAVING_THROW_ROLL_MODE_SUPPORT_PROFILE;
  readonly savingThrow: PassiveSavingThrowRollModeProfile;
};
export type PassiveAbilityCheckRollModeProfile = {
  readonly mode: "advantage";
  readonly scope: {
    readonly kind: "endingCondition";
    readonly condition: "grappled";
  };
};
export type BattlePassiveAbilityCheckRollModeSupportProfile = {
  readonly kind: typeof PASSIVE_ABILITY_CHECK_ROLL_MODE_SUPPORT_PROFILE;
  readonly abilityCheck: PassiveAbilityCheckRollModeProfile;
};
export type PassiveDamageResistanceProfile = {
  readonly damageType:
    | {
        readonly kind: "draconicAncestry";
        readonly holeId: typeof DRACONIC_ANCESTRY_DAMAGE_TYPE_HOLE_ID;
        readonly value: DraconicAncestryDamageType;
      }
    | {
        readonly kind: "fixed";
        readonly value: DamageType;
      };
};
export type BattlePassiveDamageResistanceSupportProfile = {
  readonly kind: typeof PASSIVE_DAMAGE_RESISTANCE_SUPPORT_PROFILE;
  readonly resistance: PassiveDamageResistanceProfile;
};
export type BattleAttackActionAttackCountScalingSupportProfile = {
  readonly kind: typeof ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE;
  readonly additionalAttacks: BattleAttackActionAdditionalAttacks;
};
type ThresholdTierDieAmount = Extract<
  DiceAmount,
  { readonly kind: "threshold_tiers" }
>;
export type BonusActionDashTemporaryHitPointsProfile = {
  readonly activationCost: {
    readonly kind: "bonusAction";
    readonly action: "dash";
  };
  readonly temporaryHitPoints: {
    readonly amount: { readonly kind: "proficiencyBonus" };
  };
  readonly resource: {
    readonly cap: { readonly kind: "proficiencyBonus" };
    readonly resetCadence: "shortOrLongRest";
  };
};
export type BattleBonusActionDashTemporaryHitPointsSupportProfile = {
  readonly kind: typeof BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE;
  readonly dashTemporaryHitPoints: BonusActionDashTemporaryHitPointsProfile;
};
export type FailedAbilityCheckResourceBoostProfile = {
  readonly trigger: "failedAbilityCheck";
  readonly bonus: {
    readonly dice: 1;
    readonly dieSize: 10;
  };
  readonly spends: {
    readonly resourceUnitId: AuthoredUnitSource["id"];
  };
  readonly refundSpendOnStillFailed: true;
};
export type BattleFailedAbilityCheckResourceBoostSupportProfile = {
  readonly kind: typeof FAILED_ABILITY_CHECK_RESOURCE_BOOST_SUPPORT_PROFILE;
  readonly abilityCheck: FailedAbilityCheckResourceBoostProfile;
};
export type FailedSavingThrowRerollProfile =
  FailedSavingThrowRerollProcedureFacts["savingThrow"];
export type BattleFailedSavingThrowRerollSupportProfile = {
  readonly kind: typeof FAILED_SAVING_THROW_REROLL_SUPPORT_PROFILE;
  readonly savingThrow: FailedSavingThrowRerollProfile;
};
export type SpellSlotHealingModifierProfile = {
  readonly trigger: {
    readonly kind: "casterSpellSlotRestoresHitPoints";
    readonly timing: "turnSpellIsCast";
  };
  readonly appliesTo: "eachCreatureHealedBySpell";
  readonly bonus: {
    readonly kind: "flatPlusSpellSlotLevel";
    readonly flat: 2;
  };
};
export type BattleSpellSlotHealingModifierSupportProfile = {
  readonly kind: typeof SPELL_SLOT_HEALING_MODIFIER_SUPPORT_PROFILE;
  readonly healingModifier: SpellSlotHealingModifierProfile;
};
export type MagicActionHealingPoolProfile = {
  readonly activationCost: {
    readonly kind: "standardAction";
    readonly action: "magic";
  };
  readonly spends: {
    readonly resourceUnitId: AuthoredUnitSource["id"];
    readonly amount: 1;
  };
  readonly rangeFeet: MovementFeet;
  readonly targetSelection: {
    readonly mode: "anyNumber";
    readonly targetKinds: readonly ["creature"];
    readonly stateFilter: readonly ["bloodied"];
    readonly includesSelf: true;
  };
  readonly pool: {
    readonly kind: "classLevelMultiplier";
    readonly multiplier: 5;
  };
  readonly perTargetCap: "halfHitPointMaximum";
};
export type BattleMagicActionHealingPoolSupportProfile = {
  readonly kind: typeof MAGIC_ACTION_HEALING_POOL_SUPPORT_PROFILE;
  readonly className: ClassName;
  readonly healingPool: MagicActionHealingPoolProfile;
};
export type FixedD6AmountProfile = {
  readonly kind: "fixed";
  readonly expr: {
    readonly dice: 2 | 3 | 4;
    readonly dieSize: 6;
  };
};
export type MagicActionAreaSaveDamageHealingProfile = {
  readonly activationCost: {
    readonly kind: "standardAction";
    readonly action: "magic";
  };
  readonly spends: {
    readonly resourceUnitId: AuthoredUnitSource["id"];
    readonly amount: 1;
  };
  readonly area: {
    readonly origin: {
      readonly kind: "pointWithinRange";
      readonly rangeFeet: MovementFeet;
    };
    readonly shape: {
      readonly kind: "sphere";
      readonly radiusFeet: MovementFeet;
    };
  };
  readonly save: {
    readonly ability: "con";
    readonly dc: "classSpellcastingSpellSaveDc";
  };
  readonly damage: {
    readonly targetSelection: "creaturesOfYourChoiceInArea";
    readonly amount: FixedD6AmountProfile;
    readonly damageType: "necrotic";
    readonly onSuccess: "halfDamage";
  };
  readonly healing: {
    readonly targetSelection: "oneCreatureOfYourChoiceInArea";
    readonly amount: FixedD6AmountProfile;
  };
};
export type BattleMagicActionAreaSaveDamageHealingSupportProfile = {
  readonly kind: typeof MAGIC_ACTION_AREA_SAVE_DAMAGE_HEALING_SUPPORT_PROFILE;
  readonly damageHealing: MagicActionAreaSaveDamageHealingProfile;
};
export type MagicActionSaveGatedConditionProfile = {
  readonly activationCost: {
    readonly kind: "standardAction";
    readonly action: "magic";
  };
  readonly spends: {
    readonly resourceUnitId: AuthoredUnitSource["id"];
    readonly amount: 1;
  };
  readonly targetSelection: {
    readonly kind: "visibleCreaturesWithinRange";
    readonly rangeFeet: MovementFeet;
    readonly count: {
      readonly kind: "abilityModifier";
      readonly ability: "cha";
      readonly minimum: 1;
    };
  };
  readonly save: {
    readonly ability: "wis";
    readonly dc: "classSpellcastingSpellSaveDc";
  };
  readonly onFail: {
    readonly condition: "frightened";
    readonly durationTicks: ElapsedTimeTicks;
    readonly earlyEnd: "targetTakesAnyDamage";
    readonly turnRestriction: "moveActionOrBonusAction";
  };
};
export type BattleMagicActionSaveGatedConditionSupportProfile = {
  readonly kind: typeof MAGIC_ACTION_SAVE_GATED_CONDITION_SUPPORT_PROFILE;
  readonly condition: MagicActionSaveGatedConditionProfile;
};
export type EnemyZeroHitPointTemporaryHitPointsProfile = {
  readonly trigger: {
    readonly kind: "enemyReducedToZeroHitPoints";
    readonly bySelf: true;
    readonly byOtherWithinFeet: MovementFeet;
  };
  readonly amount: {
    readonly kind: "abilityModifierPlusClassLevel";
    readonly ability: "cha";
    readonly minimum: 1;
  };
};
export type BattleEnemyZeroHitPointTemporaryHitPointsSupportProfile = {
  readonly kind: typeof ENEMY_ZERO_HIT_POINT_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE;
  readonly className: ClassName;
  readonly temporaryHitPoints: EnemyZeroHitPointTemporaryHitPointsProfile;
};
type PassiveSpeedKindGrantProfileForKind<
  TKind extends PassiveSpeedKindGrantKind,
> = {
  readonly speedKind: TKind;
  readonly feet: { readonly kind: "walkSpeed" };
};
export type ClimbSpeedKindGrantProfile =
  PassiveSpeedKindGrantProfileForKind<"climb">;
export type SwimSpeedKindGrantProfile =
  PassiveSpeedKindGrantProfileForKind<"swim">;
export type PassiveSpeedKindGrantProfiles = readonly [
  PassiveSpeedKindGrantProfile,
  ...PassiveSpeedKindGrantProfile[],
];
export type BattleAcrobaticMovementSupportProfile = {
  readonly kind: typeof ACROBATIC_MOVEMENT_SUPPORT_PROFILE;
  readonly acrobaticMovement: AcrobaticMovementProfile;
};
export type CreatureSpaceMovementPermissionProfile = {
  readonly moveThrough: {
    readonly kind: "occupiedCreatureSpace";
    readonly creatureSizeRelationToSelf: "larger";
  };
  readonly canStopInOccupiedSpace: false;
};
export type BattleCreatureSpaceMovementPermissionSupportProfile = {
  readonly kind: typeof CREATURE_SPACE_MOVEMENT_PERMISSION_SUPPORT_PROFILE;
  readonly permission: CreatureSpaceMovementPermissionProfile;
};
export type BattleHideActionObscurementPermissionSupportProfile = {
  readonly kind: typeof HIDE_ACTION_OBSCUREMENT_PERMISSION_SUPPORT_PROFILE;
  readonly permission: HideActionObscurementPermissionProfile;
};
export type BattleAlternateActionCostSupportProfile = {
  readonly kind: "alternateActionCost";
  readonly from: {
    readonly kind: "standardAction";
    readonly actions: ReadonlyNonEmptyArray<AlternateActionCostAction>;
  };
  readonly to: { readonly kind: "bonusAction" };
};
export type BattleBonusActionDelegatedStandardActionsSupportProfile = {
  readonly kind: typeof BONUS_ACTION_DELEGATED_STANDARD_ACTIONS_SUPPORT_PROFILE;
  readonly activationCost: { readonly kind: "bonusAction" };
  readonly sleightOfHand: {
    readonly abilityCheck: {
      readonly ability: "dex";
      readonly skill: "sleight_of_hand";
    };
    readonly operations: readonly [
      "pick_lock_with_thieves_tools",
      "disarm_trap_with_thieves_tools",
      "pick_pocket",
    ];
  };
  readonly objectUse: {
    readonly actions: readonly [
      {
        readonly action: "utilize";
      },
      {
        readonly action: "magic";
        readonly restrictedTo: "magicItemRequiresMagicAction";
      },
    ];
  };
};
export type RemarkableAthleteProfile = {
  readonly initiative: {
    readonly kind: "rollAdvantage";
    readonly roll: "initiative";
  };
  readonly abilityCheck: {
    readonly kind: "rollAdvantage";
    readonly ability: "str";
    readonly skill: "athletics";
  };
  readonly criticalHitMovement: {
    readonly trigger: "scoreCriticalHit";
    readonly timing: "immediatelyAfterTrigger";
    readonly distance: { readonly kind: "halfSpeed" };
    readonly opportunityAttacks: "doesNotProvoke";
  };
};
export type BattleRemarkableAthleteSupportProfile = {
  readonly kind: typeof REMARKABLE_ATHLETE_SUPPORT_PROFILE;
  readonly remarkableAthlete: RemarkableAthleteProfile;
};
export type OpenHandTechniqueProfile = {
  readonly trigger: {
    readonly kind: "hitWithAttackGrantedBy";
    readonly resourceUnitId: typeof MONK_FOCUS_RESOURCE_UNIT_ID;
    readonly optionId: typeof MONK_FLURRY_OF_BLOWS_OPTION_ID;
  };
  readonly optional: true;
  readonly effectSaveDc: {
    readonly kind: "classFeatureAbilitySaveDc";
    readonly base: 8;
    readonly ability: "wis";
  };
  readonly effects: {
    readonly denyOpportunityAttacks: {
      readonly kind: "denyOpportunityAttacks";
      readonly expires: "startOfTargetNextTurn";
    };
    readonly pushAwayOnFailedSave: {
      readonly kind: "pushAwayOnFailedSave";
      readonly save: { readonly ability: "str" };
      readonly distanceFeet: MovementFeet;
    };
    readonly applyConditionOnFailedSave: {
      readonly kind: "applyConditionOnFailedSave";
      readonly save: { readonly ability: "dex" };
      readonly condition: "prone";
    };
  };
};
export type BattleOpenHandTechniqueSupportProfile = {
  readonly kind: typeof OPEN_HAND_TECHNIQUE_SUPPORT_PROFILE;
  readonly technique: OpenHandTechniqueProfile;
};
export type StunningStrikeProfile = {
  readonly trigger: {
    readonly kind: "hitCreatureWithMonkWeaponOrUnarmedStrike";
    readonly usageLimit: "oncePerTurn";
  };
  readonly optional: true;
  readonly spends: {
    readonly resourceUnitId: typeof MONK_FOCUS_RESOURCE_UNIT_ID;
    readonly amount: 1;
  };
  readonly savingThrow: { readonly ability: "con" };
  readonly onFail: {
    readonly kind: "applyCondition";
    readonly condition: "stunned";
    readonly expires: "startOfSourceNextTurn";
  };
  readonly onSuccess: {
    readonly speed: {
      readonly kind: "halve";
      readonly expires: "startOfSourceNextTurn";
    };
    readonly attackRoll: {
      readonly mode: "advantage";
      readonly appliesTo: "nextAttackRollAgainstTargetBeforeExpiration";
    };
  };
};
export type BattleStunningStrikeSupportProfile = {
  readonly kind: typeof STUNNING_STRIKE_SUPPORT_PROFILE;
  readonly stunningStrike: StunningStrikeProfile;
};
export type CunningStrikeDieCost = {
  readonly kind: "sneakAttackDamageDice";
  readonly dice: 1;
  readonly dieSize: 6;
};
type MechanicsFamilyMember<
  Mechanics,
  Family extends string,
> = Mechanics extends { readonly family: Family } ? Mechanics : never;
type AuthoredUnitMechanicsFamilyMember<
  Unit,
  Family extends string,
> = Unit extends { readonly mechanics: infer Mechanics }
  ? MechanicsFamilyMember<Mechanics, Family> extends infer FamilyMechanics
    ? [FamilyMechanics] extends [never]
      ? never
      : Omit<Unit, "mechanics"> & { readonly mechanics: FamilyMechanics }
    : never
  : never;
type CunningStrikeUnit = AuthoredUnitMechanicsFamilyMember<
  AuthoredUnitSource,
  "cunning_strike"
>;
type StunningStrikeUnit = AuthoredUnitMechanicsFamilyMember<
  AuthoredUnitSource,
  "stunning_strike"
>;
type StunningStrikeMechanics = StunningStrikeUnit["mechanics"];
type PaladinSacredWeaponUnit = AuthoredUnitMechanicsFamilyMember<
  AuthoredUnitSource,
  "sacred_weapon"
>;
type PaladinSacredWeaponMechanics = PaladinSacredWeaponUnit["mechanics"];
type RogueSteadyAimUnit = AuthoredUnitMechanicsFamilyMember<
  AuthoredUnitSource,
  "steady_aim"
>;
type RogueSteadyAimMechanics = RogueSteadyAimUnit["mechanics"];
type PotentCantripUnit = AuthoredUnitMechanicsFamilyMember<
  AuthoredUnitSource,
  "potent_cantrip"
>;
type PotentCantripMechanics = PotentCantripUnit["mechanics"];
type GrapplerUnit = AuthoredUnitMechanicsFamilyMember<
  AuthoredUnitSource,
  "grappler"
>;
type GrapplerMechanics = GrapplerUnit["mechanics"];
type BrutalStrikeUnit = AuthoredUnitMechanicsFamilyMember<
  AuthoredUnitSource,
  "brutal_strike"
>;
type BrutalStrikeMechanics = BrutalStrikeUnit["mechanics"];
type CunningStrikeOptionGrantUnit = AuthoredUnitMechanicsFamilyMember<
  AuthoredUnitSource,
  "cunning_strike_option_grant"
>;
type CunningStrikeMechanics = CunningStrikeUnit["mechanics"];
export type CunningStrikeSurfaceOption =
  CunningStrikeMechanics["options"][number];
export type CunningStrikeOptionGrantSurfaceOption =
  CunningStrikeOptionGrantUnit["mechanics"]["option"];
type CunningStrikePoisonSurfaceOption = Extract<
  CunningStrikeSurfaceOption,
  { readonly requires: unknown }
>;
type CunningStrikeTripSurfaceOption = Extract<
  CunningStrikeSurfaceOption,
  { readonly target: unknown }
>;
type CunningStrikeWithdrawSurfaceOption = Extract<
  CunningStrikeSurfaceOption,
  { readonly movement: unknown }
>;
export const CUNNING_STRIKE_END_TURN_COVER_DEGREES = [
  "none",
  "half",
  "threeQuarters",
  "total",
] as const;
export type CunningStrikeOptionEffect =
  | CunningStrikeEquipmentGatedConditionSaveEffect
  | CunningStrikeSizeGatedConditionSaveEffect
  | CunningStrikePostDamageMovementEffect
  | CunningStrikeHideInvisibleEndSuppressionEffect;
export type CunningStrikeProfile = {
  readonly trigger: {
    readonly kind: "dealSneakAttackDamage";
    readonly sourceUnitId: AuthoredUnitSource["id"];
  };
  readonly choice: {
    readonly kind: "chooseOne";
    readonly maxOptions: 1;
  };
  readonly effectSaveDc: {
    readonly kind: "classFeatureAbilitySaveDc";
    readonly base: 8;
    readonly ability: "dex";
  };
  readonly options: readonly CunningStrikeOption[];
};
export type CunningStrikeOptionGrantProfile = {
  readonly sourceUnitId: AuthoredUnitSource["id"];
  readonly option: CunningStrikeOption;
};
export type BattleCunningStrikeOptionGrantSupportProfile = {
  readonly kind: typeof CUNNING_STRIKE_OPTION_GRANT_SUPPORT_PROFILE;
  readonly optionGrant: CunningStrikeOptionGrantProfile;
};
export type PaladinSacredWeaponProfile = {
  readonly activationCost: {
    readonly kind: "standardAction";
    readonly action: "attack";
  };
  readonly spends: {
    readonly resourceUnitId: PaladinSacredWeaponMechanics["spends"]["resourceUnitId"];
    readonly amount: 1;
  };
  readonly target: "heldMeleeWeapon";
  readonly duration: {
    readonly amount: 10;
    readonly unit: "minute";
    readonly endsOn: readonly [
      "useFeatureAgain",
      "dismissNoAction",
      "notCarryingWeapon",
    ];
  };
  readonly attackRollBonus: {
    readonly kind: "abilityModifier";
    readonly ability: "cha";
    readonly minimum: 1;
    readonly appliesTo: "imbuedWeaponAttackRolls";
  };
  readonly hitDamageTypeChoice: readonly ["normal", "radiant"];
  readonly light: {
    readonly brightRadiusFeet: MovementFeet;
    readonly dimAdditionalFeet: MovementFeet;
  };
};
export type BattlePaladinSacredWeaponSupportProfile = {
  readonly kind: typeof PALADIN_SACRED_WEAPON_SUPPORT_PROFILE;
  readonly sacredWeapon: PaladinSacredWeaponProfile;
};
export type HuntersPreyWoundedTargetWeaponDamageProfile = {
  readonly kind: "woundedTargetWeaponDamage";
  readonly trigger: "hitCreatureWithWeapon";
  readonly targetPredicate: "missingAnyHitPoints";
  readonly usageLimit: "oncePerTurn";
  readonly damage: {
    readonly kind: "addAttackDamageDice";
    readonly dice: { readonly dice: 1; readonly dieSize: 8 };
    readonly damageType: "sameAsAttack";
  };
};
export type HuntersPreyNearbyDifferentTargetSameWeaponAttackProfile = {
  readonly kind: "nearbyDifferentTargetSameWeaponAttack";
  readonly trigger: "makeWeaponAttack";
  readonly usageLimit: "oncePerTurn";
  readonly extraAttack: {
    readonly weapon: "sameWeapon";
    readonly target: {
      readonly kind: "differentCreatureNearOriginalTarget";
      readonly withinFeetOfOriginalTarget: MovementFeet;
      readonly withinWeaponRange: true;
      readonly notAttackedThisTurn: true;
    };
  };
};
export type HuntersPreyProfile =
  | HuntersPreyWoundedTargetWeaponDamageProfile
  | HuntersPreyNearbyDifferentTargetSameWeaponAttackProfile;
export type BattleHuntersPreySupportProfile = {
  readonly kind: typeof HUNTERS_PREY_SUPPORT_PROFILE;
  readonly huntersPrey: HuntersPreyProfile;
};
export type BattleUnitSupportProfileSelectedOption = {
  readonly kind: "huntersPrey";
  readonly selection: HuntersPreyProfile["kind"];
};
type HuntersPreyAdmittedMechanicsProfile = {
  readonly woundedTargetWeaponDamage: HuntersPreyWoundedTargetWeaponDamageProfile;
  readonly nearbyDifferentTargetSameWeaponAttack: HuntersPreyNearbyDifferentTargetSameWeaponAttackProfile;
};

type HuntersPreyAdmission =
  | {
      readonly tag: "notHuntersPrey";
      readonly unit: BattleUnitSupportSource;
    }
  | { readonly tag: "unsupported"; readonly unit: BattleUnitSupportSource }
  | {
      readonly tag: "admitted";
      readonly unit: BattleUnitSupportSource;
      readonly profile: HuntersPreyAdmittedMechanicsProfile;
    };

type SupportedHuntersPreyAdmission = Exclude<
  HuntersPreyAdmission,
  { readonly tag: "unsupported" }
>;
export type RogueSteadyAimProfile = {
  readonly activationCost: { readonly kind: "bonusAction" };
  readonly precondition: "noMovementThisTurn";
  readonly attackRoll: {
    readonly mode: "advantage";
    readonly appliesTo: "nextAttackRollCurrentTurn";
  };
  readonly speed: {
    readonly kind: "setToZero";
    readonly until: "endOfCurrentTurn";
  };
};
export type BattleRogueSteadyAimSupportProfile = {
  readonly kind: typeof ROGUE_STEADY_AIM_SUPPORT_PROFILE;
  readonly steadyAim: RogueSteadyAimProfile;
};
export type PotentCantripProfile = {
  readonly trigger: {
    readonly kind: "castCantripAtCreature";
    readonly cantripKind: "damaging";
  };
  readonly outcomes: readonly [
    "missWithAttackRoll",
    "targetSucceedsSavingThrow",
  ];
  readonly damage: "halfCantripDamageIfAny";
  readonly additionalEffect: "none";
};
export type BattlePotentCantripSupportProfile = {
  readonly kind: typeof POTENT_CANTRIP_SUPPORT_PROFILE;
  readonly potentCantrip: PotentCantripProfile;
};
export type GrapplerProfile = {
  readonly punchAndGrab: {
    readonly trigger: "attackActionUnarmedStrikeHitOnTurn";
    readonly options: readonly ["damage", "grapple"];
    readonly usageLimit: "oncePerTurn";
  };
  readonly attackAdvantage: {
    readonly mode: "advantage";
    readonly target: "creatureGrappledByYou";
  };
  readonly fastWrestler: {
    readonly movementCost: "noExtraGrappleDragCost";
    readonly targetSize: "yourSizeOrSmaller";
  };
};
export type BattleGrapplerSupportProfile = {
  readonly kind: typeof GRAPPLER_SUPPORT_PROFILE;
  readonly grappler: GrapplerProfile;
};
export type BattleGrapplerSupport = BattleGrapplerSupportProfile | null;
export type BattleBrutalStrikeSupportProfile = {
  readonly kind: typeof BRUTAL_STRIKE_SUPPORT_PROFILE;
  readonly brutalStrike: BrutalStrikeProfile;
};
export type BattleBrutalStrikeSupport = BattleBrutalStrikeSupportProfile | null;
export type RetaliationReactionAttackProfile = {
  readonly trigger: {
    readonly kind: "takesDamageFromCreatureWithinFiveFeet";
    readonly rangeFeet: 5;
  };
  readonly response: {
    readonly kind: "oneMeleeWeaponOrUnarmedStrikeAgainstDamageSource";
    readonly actionCost: "reaction";
  };
};
export type BattleRetaliationReactionAttackSupportProfile = {
  readonly kind: typeof RETALIATION_REACTION_ATTACK_SUPPORT_PROFILE;
  readonly retaliation: RetaliationReactionAttackProfile;
};
export type BattleMonkFocusBattleOptionsSupportProfile =
  MonkFocusProcedureFacts;
export type BattleTacticalMasterReplacementSupportProfile = {
  readonly kind: typeof TACTICAL_MASTER_REPLACEMENT_SUPPORT_PROFILE;
  readonly replacementProperties: typeof TACTICAL_MASTER_REPLACEMENT_MASTERY_PROPERTIES;
};
export type BattleUnitSupportProfile =
  | BattleAlternateActionCostSupportProfile
  | BattleBonusActionDelegatedStandardActionsSupportProfile
  | BattleMonkFocusBattleOptionsSupportProfile
  | BattlePassiveRangedAttackRollBonusSupportProfile
  | BattleInitiativeProficiencyAndSwapSupportProfile
  | BattleAttackRollMissToHitReplacementSupportProfile
  | BattleAttackActionAreaSaveDamageReplacementSupportProfile
  | BattleD20TestNaturalOneRerollSupportProfile
  | BattlePassiveSavingThrowRollModeSupportProfile
  | BattlePassiveAbilityCheckRollModeSupportProfile
  | BattlePassiveDamageResistanceSupportProfile
  | BattlePassiveSpeedBonusSupportProfile
  | BattlePassiveSpeedKindGrantsSupportProfile
  | BattleAcrobaticMovementSupportProfile
  | BattleCreatureSpaceMovementPermissionSupportProfile
  | BattleHideActionObscurementPermissionSupportProfile
  | BattleAttackActionAttackCountScalingSupportProfile
  | BattleBonusActionDashTemporaryHitPointsSupportProfile
  | BattleFailedAbilityCheckResourceBoostSupportProfile
  | BattleFailedSavingThrowRerollSupportProfile
  | BattleSpellSlotHealingModifierSupportProfile
  | BattleMagicActionHealingPoolSupportProfile
  | BattleMagicActionAreaSaveDamageHealingSupportProfile
  | BattleMagicActionSaveGatedConditionSupportProfile
  | BattleEnemyZeroHitPointTemporaryHitPointsSupportProfile
  | BattleDruidWildShapeKnownFormSupportProfile
  | BattleRemarkableAthleteSupportProfile
  | BattleOpenHandTechniqueSupportProfile
  | BattleStunningStrikeSupportProfile
  | BattleCunningStrikeSupportProfile
  | BattleCunningStrikeOptionGrantSupportProfile
  | BattlePaladinSacredWeaponSupportProfile
  | BattleHuntersPreySupportProfile
  | BattleRogueSteadyAimSupportProfile
  | BattlePotentCantripSupportProfile
  | BattleGrapplerSupportProfile
  | BattleBrutalStrikeSupportProfile
  | BattleRetaliationReactionAttackSupportProfile
  | BattleTacticalMasterReplacementSupportProfile
  | BattleLightExtraAttackDamageAbilityModifierSupportProfile
  | Exclude<
      (typeof BATTLE_UNIT_SUPPORT_PROFILES)[number],
      | "alternateActionCost"
      | "bonusActionDelegatedStandardActions"
      | "monkFocusBattleOptions"
      | "passiveRangedAttackRollBonus"
      | "initiativeProficiencyAndSwap"
      | "attackRollMissToHitReplacement"
      | "attackActionAreaSaveDamageReplacement"
      | "d20TestNaturalOneReroll"
      | "passiveSavingThrowRollMode"
      | "passiveAbilityCheckRollMode"
      | "passiveDamageResistance"
      | "passiveSpeedBonus"
      | "passiveSpeedKindGrants"
      | "acrobaticMovement"
      | "creatureSpaceMovementPermission"
      | "hideActionObscurementPermission"
      | "attackActionAttackCountScaling"
      | "bonusActionDashTemporaryHitPoints"
      | "failedAbilityCheckResourceBoost"
      | "failedSavingThrowReroll"
      | "spellSlotHealingModifier"
      | "magicActionHealingPool"
      | "magicActionAreaSaveDamageHealing"
      | "magicActionSaveGatedCondition"
      | "enemyZeroHitPointTemporaryHitPoints"
      | "druidWildShapeKnownForm"
      | "remarkableAthlete"
      | "openHandTechnique"
      | "stunningStrike"
      | "cunningStrike"
      | "cunningStrikeOptionGrant"
      | "paladinSacredWeapon"
      | "huntersPrey"
      | "rogueSteadyAim"
      | "potentCantrip"
      | "brutalStrike"
      | "retaliationReactionAttack"
      | "grappler"
      | "tacticalMasterReplacement"
      | "lightExtraAttackDamageAbilityModifier"
    >;

export type BattleUnitSupportProfileIssue = {
  readonly tag: "battleUnitSupportProfileIssue";
  readonly message: string;
};

export type ClassicNonSrdMechanicsUnit = {
  readonly id: AuthoredUnitSource["id"];
  readonly syntheticLabel: string;
  readonly provenance: { readonly kind: "classic-2024-mechanics-source-lane" };
  readonly kind: "class_feature";
  readonly mechanics: {
    readonly family: "alternate_action_cost";
    readonly from: {
      readonly kind: "standard_action";
      readonly actions: readonly StandardActionKind[];
    };
    readonly to: { readonly kind: "bonus_action" };
  };
};

export type BattleUnitSupportSource =
  | AuthoredUnitSource
  | ClassicNonSrdMechanicsUnit;

function battleUnitSupportProfileIssue(
  message: string,
): Result.Result<never, BattleUnitSupportProfileIssue> {
  return Result.fail({ tag: "battleUnitSupportProfileIssue", message });
}

type BattleUnitSupportProfilesInput = {
  readonly unit: BattleUnitSupportSource;
  readonly classLevels?: readonly CharacterBattleClassLevel[];
  readonly sourceFacts?: BattleUnitSupportProfileSourceFacts;
};

type BattleUnitSupportProfilesInputWithHuntersPreyAdmission = Omit<
  BattleUnitSupportProfilesInput,
  "unit"
> & {
  readonly huntersPreyAdmission: HuntersPreyAdmission;
};

type AdmittedBattleUnitSupportProfiles = {
  readonly supportProfiles: readonly BattleUnitSupportProfile[];
  readonly huntersPreyAdmission: SupportedHuntersPreyAdmission;
};

export function battleUnitSupportProfilesForUnit(
  input: BattleUnitSupportProfilesInput,
): Result.Result<
  readonly BattleUnitSupportProfile[],
  BattleUnitSupportProfileIssue
> {
  const { unit, ...supportInput } = input;
  const result = battleUnitSupportProfilesForInputWithHuntersPreyAdmission({
    ...supportInput,
    huntersPreyAdmission: huntersPreyAdmissionForUnit(unit),
  });
  return Result.isFailure(result)
    ? Result.fail(result.failure)
    : Result.succeed(result.success.supportProfiles);
}

function battleUnitSupportProfilesForInputWithHuntersPreyAdmission(
  inputWithHuntersPreyAdmission: BattleUnitSupportProfilesInputWithHuntersPreyAdmission,
): Result.Result<
  AdmittedBattleUnitSupportProfiles,
  BattleUnitSupportProfileIssue
> {
  const { huntersPreyAdmission, ...supportInput } =
    inputWithHuntersPreyAdmission;
  const input: BattleUnitSupportProfilesInput = {
    ...supportInput,
    unit: huntersPreyAdmission.unit,
  };
  const supportProfiles: BattleUnitSupportProfile[] = [];

  const bonusActionStandardActionSupport =
    battleBonusActionStandardActionSupportForUnit(input.unit);
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (bonusActionStandardActionSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle bonus-action standard-action Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (bonusActionStandardActionSupport !== null) {
    supportProfiles.push(bonusActionStandardActionSupport);
  }

  if (isClassicNonSrdMechanicsUnit(input.unit)) {
    return Result.succeed({
      supportProfiles,
      huntersPreyAdmission: { tag: "notHuntersPrey", unit: input.unit },
    });
  }

  const atomicClassFeatureProcedure = Match.value(
    admitAtomicClassFeatureProcedure(input.unit),
  ).pipe(
    Match.when({ tag: "notBattleOwned" }, () =>
      Result.succeed<readonly BattleUnitSupportProfile[]>([]),
    ),
    Match.when({ tag: "admitted" }, ({ procedure }) =>
      Result.succeed<readonly BattleUnitSupportProfile[]>(
        Match.value(procedure.facts).pipe(
          Match.when(
            { kind: "bonusActionDelegatedStandardActions" },
            ({ actionEconomy }) => [actionEconomy],
          ),
          Match.when({ kind: "acrobaticMovement" }, (facts) => [facts]),
          Match.exhaustive,
        ),
      ),
    ),
    Match.when({ tag: "rejected" }, ({ issues }) =>
      battleUnitSupportProfileIssue(
        Match.value(issues[0].procedure).pipe(
          Match.when(
            "bonusActionDelegatedStandardActions",
            () =>
              `Unsupported battle Bonus Action delegated standard-action Unit hook: ${input.unit.id}.`,
          ),
          Match.when(
            "acrobaticMovement",
            () =>
              `Unsupported battle Acrobatic Movement Unit hook: ${input.unit.id}.`,
          ),
          Match.exhaustive,
        ),
      ),
    ),
    Match.exhaustive,
  );
  if (Result.isFailure(atomicClassFeatureProcedure)) {
    return Result.fail(atomicClassFeatureProcedure.failure);
  }
  supportProfiles.push(...atomicClassFeatureProcedure.success);

  const criticalRangeSupport =
    battleWeaponOrUnarmedCriticalRange19SupportForUnit(input.unit);
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (criticalRangeSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle critical-range Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (criticalRangeSupport === "criticalRange19") {
    supportProfiles.push(WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE);
  }

  const attackDamageRiderSupport = battleAttackDamageRiderSupportForUnit(
    input.unit,
  );
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (attackDamageRiderSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle attack-damage rider Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (attackDamageRiderSupport === "attackDamageRider") {
    supportProfiles.push(ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE);
  }

  const saveDamageReplacementSupport =
    battleSaveDamageReplacementSupportForUnit(input.unit);
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (saveDamageReplacementSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle save-damage replacement Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (saveDamageReplacementSupport === "saveDamageReplacement") {
    supportProfiles.push(SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE);
  }

  const reactionRollOrDamageReductionSupport =
    battleReactionRollOrDamageReductionSupportForUnit(input.unit);
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (reactionRollOrDamageReductionSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle reaction roll or damage reduction Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (
    reactionRollOrDamageReductionSupport === "reactionRollOrDamageReduction"
  ) {
    supportProfiles.push(REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE);
  }
  if (
    reactionRollOrDamageReductionSupport ===
    "attackDamageReductionZeroDamageRedirect"
  ) {
    supportProfiles.push(
      ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
    );
  }

  const retaliationReactionAttackSupport =
    battleRetaliationReactionAttackSupportForUnit(input.unit);
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (retaliationReactionAttackSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Retaliation reaction attack Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (retaliationReactionAttackSupport !== null) {
    supportProfiles.push(retaliationReactionAttackSupport);
  }

  const passiveArmorClassBonusSupport =
    battlePassiveArmorClassBonusSupportForUnit(input.unit);
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (passiveArmorClassBonusSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle passive Armor Class bonus Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (passiveArmorClassBonusSupport === "passiveArmorClassBonus") {
    supportProfiles.push(PASSIVE_ARMOR_CLASS_BONUS_SUPPORT_PROFILE);
  }

  const passiveRangedAttackRollBonusSupport =
    battlePassiveRangedAttackRollBonusSupportForUnit(input.unit);
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (passiveRangedAttackRollBonusSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle passive ranged attack-roll bonus Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (passiveRangedAttackRollBonusSupport !== null) {
    supportProfiles.push(passiveRangedAttackRollBonusSupport);
  }

  const initiativeProficiencyAndSwapSupport =
    battleInitiativeProficiencyAndSwapSupportForUnit(input.unit);
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (initiativeProficiencyAndSwapSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Initiative proficiency-and-swap Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (initiativeProficiencyAndSwapSupport !== null) {
    supportProfiles.push(initiativeProficiencyAndSwapSupport);
  }

  const attackRollMissToHitReplacementSupport =
    battleAttackRollMissToHitReplacementSupportForUnit(input.unit);
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (attackRollMissToHitReplacementSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle attack-roll miss-to-hit replacement Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (attackRollMissToHitReplacementSupport !== null) {
    supportProfiles.push(attackRollMissToHitReplacementSupport);
  }

  const attackActionAreaSaveDamageReplacementSupport =
    battleAttackActionAreaSaveDamageReplacementSupportForUnit({
      unit: input.unit,
      draconicAncestryDamageType: input.sourceFacts?.draconicAncestryDamageType,
    });
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (attackActionAreaSaveDamageReplacementSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Attack-action area save-damage replacement Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (attackActionAreaSaveDamageReplacementSupport !== null) {
    supportProfiles.push(attackActionAreaSaveDamageReplacementSupport);
  }

  const atomicSpeciesTraitProcedure = Match.value(
    admitAtomicSpeciesTraitProcedure(input.unit),
  ).pipe(
    Match.when({ tag: "notBattleOwned" }, () =>
      Result.succeed<readonly BattleUnitSupportProfile[]>([]),
    ),
    Match.when({ tag: "admitted" }, ({ procedure }) =>
      Result.succeed<readonly BattleUnitSupportProfile[]>([procedure.facts]),
    ),
    Match.when({ tag: "rejected" }, ({ issues }) =>
      battleUnitSupportProfileIssue(
        Match.value(issues[0].procedure).pipe(
          Match.when(
            "d20TestNaturalOneReroll",
            () =>
              `Unsupported battle D20 Test natural-1 reroll Unit hook: ${input.unit.id}.`,
          ),
          Match.when(
            "creatureSpaceMovementPermission",
            () =>
              `Unsupported battle creature-space movement permission Unit hook: ${input.unit.id}.`,
          ),
          Match.when(
            "hideActionObscurementPermission",
            () =>
              `Unsupported battle Hide action obscurement permission Unit hook: ${input.unit.id}.`,
          ),
          Match.exhaustive,
        ),
      ),
    ),
    Match.exhaustive,
  );
  if (Result.isFailure(atomicSpeciesTraitProcedure)) {
    return Result.fail(atomicSpeciesTraitProcedure.failure);
  }
  supportProfiles.push(...atomicSpeciesTraitProcedure.success);

  const passiveSavingThrowRollModeSupport =
    battlePassiveSavingThrowRollModeSupportForUnit(input.unit);
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (passiveSavingThrowRollModeSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle passive Saving Throw roll-mode Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (passiveSavingThrowRollModeSupport !== null) {
    supportProfiles.push(passiveSavingThrowRollModeSupport);
  }

  const passiveAbilityCheckRollModeSupport =
    battlePassiveAbilityCheckRollModeSupportForUnit(input.unit);
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (passiveAbilityCheckRollModeSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle passive Ability Check roll-mode Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (passiveAbilityCheckRollModeSupport !== null) {
    supportProfiles.push(passiveAbilityCheckRollModeSupport);
  }

  const passiveDamageResistanceSupport =
    battlePassiveDamageResistanceSupportForUnit({
      unit: input.unit,
      draconicAncestryDamageType: input.sourceFacts?.draconicAncestryDamageType,
    });
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (passiveDamageResistanceSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle passive damage Resistance Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (passiveDamageResistanceSupport !== null) {
    supportProfiles.push(passiveDamageResistanceSupport);
  }

  const passiveSpeedBonusSupport = battlePassiveSpeedBonusSupportForUnit(
    input.unit,
  );
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (passiveSpeedBonusSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle passive Speed bonus Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (passiveSpeedBonusSupport !== null) {
    supportProfiles.push(passiveSpeedBonusSupport);
  }

  const passiveSpeedKindGrantsSupport =
    battlePassiveSpeedKindGrantsSupportForUnit(input.unit);
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (passiveSpeedKindGrantsSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle passive Speed-kind grants Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (passiveSpeedKindGrantsSupport !== null) {
    supportProfiles.push(passiveSpeedKindGrantsSupport);
  }

  const weaponDamageDiceRollChoiceSupport =
    battleWeaponDamageDiceRollChoiceSupportForUnit(input.unit);
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (weaponDamageDiceRollChoiceSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle weapon damage dice roll choice Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (weaponDamageDiceRollChoiceSupport === "weaponDamageDiceRollChoice") {
    supportProfiles.push(WEAPON_DAMAGE_DICE_ROLL_CHOICE_SUPPORT_PROFILE);
  }

  const attackDamageDieFloorSupport = battleAttackDamageDieFloorSupportForUnit(
    input.unit,
  );
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (attackDamageDieFloorSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle attack damage die floor Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (attackDamageDieFloorSupport === "attackDamageDieFloor") {
    supportProfiles.push(ATTACK_DAMAGE_DIE_FLOOR_SUPPORT_PROFILE);
  }

  const lightExtraAttackDamageAbilityModifierSupport =
    battleLightExtraAttackDamageAbilityModifierSupportForUnit(input.unit);
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (lightExtraAttackDamageAbilityModifierSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Light extra attack damage ability modifier Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (lightExtraAttackDamageAbilityModifierSupport !== null) {
    supportProfiles.push(lightExtraAttackDamageAbilityModifierSupport);
  }

  const martialArtsAttackProjectionSupport =
    battleMartialArtsAttackProjectionSupportForUnit(input.unit);
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (martialArtsAttackProjectionSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Martial Arts attack projection Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (martialArtsAttackProjectionSupport === "martialArtsAttackProjection") {
    supportProfiles.push(MARTIAL_ARTS_ATTACK_PROJECTION_SUPPORT_PROFILE);
  }

  const attackActionAttackCountScalingSupport =
    battleAttackActionAttackCountScalingSupportForUnit(input.unit);
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (attackActionAttackCountScalingSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Attack action attack-count scaling Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (attackActionAttackCountScalingSupport !== null) {
    supportProfiles.push(attackActionAttackCountScalingSupport);
  }

  const zeroHitPointReplacementSupport =
    battleZeroHitPointReplacementSupportForUnit(input.unit);
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (zeroHitPointReplacementSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle zero-Hit-Point replacement Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (zeroHitPointReplacementSupport === "zeroHitPointReplacement") {
    supportProfiles.push(ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE);
  }

  const bonusActionDashTemporaryHitPointsSupport =
    battleBonusActionDashTemporaryHitPointsSupportForUnit(input.unit);
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (bonusActionDashTemporaryHitPointsSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Bonus Action Dash Temporary Hit Points Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (bonusActionDashTemporaryHitPointsSupport !== null) {
    supportProfiles.push(bonusActionDashTemporaryHitPointsSupport);
  }

  const failedAbilityCheckResourceBoostSupport =
    battleFailedAbilityCheckResourceBoostSupportForUnit(input.unit);
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (failedAbilityCheckResourceBoostSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle failed ability-check resource boost Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (failedAbilityCheckResourceBoostSupport !== null) {
    supportProfiles.push(failedAbilityCheckResourceBoostSupport);
  }

  const spellSlotHealingModifierSupport =
    battleSpellSlotHealingModifierSupportForUnit(input.unit);
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (spellSlotHealingModifierSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Spell Slot healing modifier Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (spellSlotHealingModifierSupport !== null) {
    supportProfiles.push(spellSlotHealingModifierSupport);
  }

  const magicActionHealingPoolSupport =
    battleMagicActionHealingPoolSupportForUnit(input.unit);
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (magicActionHealingPoolSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Magic Action healing pool Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (magicActionHealingPoolSupport !== null) {
    supportProfiles.push(magicActionHealingPoolSupport);
  }

  const magicActionAreaSaveDamageHealingSupport =
    battleMagicActionAreaSaveDamageHealingSupportForUnit(
      input.unit,
      input.classLevels,
    );
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (magicActionAreaSaveDamageHealingSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Magic Action area save damage/healing Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (magicActionAreaSaveDamageHealingSupport !== null) {
    supportProfiles.push(magicActionAreaSaveDamageHealingSupport);
  }

  const magicActionSaveGatedConditionSupport =
    battleMagicActionSaveGatedConditionSupportForUnit(
      input.unit,
      input.classLevels,
    );
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (magicActionSaveGatedConditionSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Magic Action save-gated condition Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (magicActionSaveGatedConditionSupport !== null) {
    supportProfiles.push(magicActionSaveGatedConditionSupport);
  }

  const enemyZeroHitPointTemporaryHitPointsSupport =
    battleEnemyZeroHitPointTemporaryHitPointsSupportForUnit(input.unit);
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (enemyZeroHitPointTemporaryHitPointsSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle enemy zero-Hit-Point Temporary Hit Points Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (enemyZeroHitPointTemporaryHitPointsSupport !== null) {
    supportProfiles.push(enemyZeroHitPointTemporaryHitPointsSupport);
  }

  const remarkableAthleteSupport = battleRemarkableAthleteSupportForUnit(
    input.unit,
  );
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (remarkableAthleteSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Remarkable Athlete Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (remarkableAthleteSupport !== null) {
    supportProfiles.push(remarkableAthleteSupport);
  }

  const openHandTechniqueSupport = battleOpenHandTechniqueSupportForUnit(
    input.unit,
  );
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (openHandTechniqueSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Open Hand Technique Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (openHandTechniqueSupport !== null) {
    supportProfiles.push(openHandTechniqueSupport);
  }

  const stunningStrikeSupport = battleStunningStrikeSupportForUnit(input.unit);
  if (stunningStrikeSupport !== null) {
    supportProfiles.push(stunningStrikeSupport);
  }

  const cunningStrikeSupport = battleCunningStrikeSupportForUnit(input.unit);
  if (cunningStrikeSupport !== null) {
    supportProfiles.push(cunningStrikeSupport);
  }

  const cunningStrikeOptionGrantSupport =
    battleCunningStrikeOptionGrantSupportForUnit(input.unit);
  if (cunningStrikeOptionGrantSupport !== null) {
    supportProfiles.push(cunningStrikeOptionGrantSupport);
  }

  const paladinSacredWeaponSupport = battlePaladinSacredWeaponSupportForUnit(
    input.unit,
  );
  if (paladinSacredWeaponSupport !== null) {
    supportProfiles.push(paladinSacredWeaponSupport);
  }

  if (huntersPreyAdmission.tag === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Hunter's Prey Unit hook: ${input.unit.id}.`,
    );
  }

  const rogueSteadyAimSupport = battleRogueSteadyAimSupportForUnit(input.unit);
  if (rogueSteadyAimSupport !== null) {
    supportProfiles.push(rogueSteadyAimSupport);
  }

  const potentCantripSupport = battlePotentCantripSupportForUnit(input.unit);
  if (potentCantripSupport !== null) {
    supportProfiles.push(potentCantripSupport);
  }

  const grapplerSupport = battleGrapplerSupportForUnit(input.unit);
  if (grapplerSupport !== null) {
    supportProfiles.push(grapplerSupport);
  }

  const brutalStrikeSupport = battleBrutalStrikeSupportForUnit(input.unit);
  if (brutalStrikeSupport !== null) {
    supportProfiles.push(brutalStrikeSupport);
  }

  const bardicInspirationGrantSupport =
    battleBardicInspirationGrantSupportForUnit(input.unit);
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (bardicInspirationGrantSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Bardic Inspiration grant Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (bardicInspirationGrantSupport !== null) {
    supportProfiles.push(bardicInspirationGrantSupport);
  }

  const druidWildCompanionSpellCastSupport =
    battleDruidWildCompanionSpellCastSupportForUnit(input.unit);
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (druidWildCompanionSpellCastSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Druid Wild Companion Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (druidWildCompanionSpellCastSupport !== null) {
    supportProfiles.push(druidWildCompanionSpellCastSupport);
  }

  const tacticalMasterReplacementSupport =
    input.classLevels === undefined
      ? battleTacticalMasterReplacementSupportForUnit(input.unit)
      : battleTacticalMasterReplacementSupportForUnitAtClassLevels(
          input.unit,
          input.classLevels,
        );
  /* v8 ignore start -- @preserve -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (tacticalMasterReplacementSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Tactical Master Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (tacticalMasterReplacementSupport !== null) {
    supportProfiles.push(tacticalMasterReplacementSupport);
  }

  const weaponMasteryProcedure = Match.value(
    admitWeaponMasteryProcedure(input.unit),
  ).pipe(
    Match.when({ tag: "notBattleOwned" }, () =>
      Result.succeed<readonly BattleUnitSupportProfile[]>([]),
    ),
    Match.when({ tag: "admitted" }, (admission) =>
      Result.succeed<readonly BattleUnitSupportProfile[]>([
        admission.procedure.facts,
      ]),
    ),
    Match.when({ tag: "rejected" }, (rejection) =>
      battleUnitSupportProfileIssue(
        Match.value(rejection.issues[0].procedure).pipe(
          Match.when(
            WEAPON_MASTERY_PUSH_SUPPORT_PROFILE,
            () =>
              `Unsupported battle Weapon Mastery Push Unit hook: ${input.unit.id}.`,
          ),
          Match.when(
            WEAPON_MASTERY_SAP_SUPPORT_PROFILE,
            () =>
              `Unsupported battle Weapon Mastery Sap Unit hook: ${input.unit.id}.`,
          ),
          Match.when(
            WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE,
            () =>
              `Unsupported battle Weapon Mastery Topple Unit hook: ${input.unit.id}.`,
          ),
          Match.when(
            WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE,
            () =>
              `Unsupported battle Weapon Mastery Cleave Unit hook: ${input.unit.id}.`,
          ),
          Match.when(
            WEAPON_MASTERY_SLOW_SUPPORT_PROFILE,
            () =>
              `Unsupported battle Weapon Mastery Slow Unit hook: ${input.unit.id}.`,
          ),
          Match.when(
            "unrecognizedWeaponMastery",
            () =>
              `Unsupported battle Weapon Mastery Unit hook: ${input.unit.id}.`,
          ),
          Match.exhaustive,
        ),
      ),
    ),
    Match.exhaustive,
  );
  if (Result.isFailure(weaponMasteryProcedure)) {
    return Result.fail(weaponMasteryProcedure.failure);
  }
  supportProfiles.push(...weaponMasteryProcedure.success);

  return Result.succeed({ supportProfiles, huntersPreyAdmission });
}

export function battleUnitRefWithSupportProfiles(input: {
  readonly unitRef: {
    readonly unitId: AuthoredUnitSource["id"];
    readonly selectedOption?: BattleUnitSupportProfileSelectedOption;
  };
  readonly unit: BattleUnitSupportSource;
  readonly classLevels?: readonly CharacterBattleClassLevelInit[];
  readonly sourceFacts?: BattleUnitSupportProfileSourceFacts;
}): Result.Result<BattleUnitRef, BattleUnitSupportProfileIssue> {
  if (input.unitRef.unitId !== input.unit.id) {
    return battleUnitSupportProfileIssue(
      `Battle Unit ref ${input.unitRef.unitId} does not match Unit ${input.unit.id}.`,
    );
  }
  const huntersPreyAdmission = huntersPreyAdmissionForUnit(input.unit);
  const admittedSupportProfiles =
    battleUnitSupportProfilesForInputWithHuntersPreyAdmission({
      huntersPreyAdmission,
      ...(input.classLevels === undefined
        ? {}
        : {
            classLevels: parseBattleUnitSupportClassLevels(input.classLevels),
          }),
      ...optionalProperty("sourceFacts", input.sourceFacts),
    });
  if (Result.isFailure(admittedSupportProfiles)) {
    return Result.fail(admittedSupportProfiles.failure);
  }
  const admittedHuntersPrey =
    admittedSupportProfiles.success.huntersPreyAdmission;
  const huntersPreySupport = battleHuntersPreySupportForSupportedAdmission(
    admittedHuntersPrey,
    input.unitRef.selectedOption,
  );
  if (admittedHuntersPrey.tag === "admitted" && huntersPreySupport === null) {
    return battleUnitSupportProfileIssue(
      `Battle Unit ref ${input.unitRef.unitId} requires a retained Hunter's Prey selection before battle initialization.`,
    );
  }
  if (
    input.unitRef.selectedOption?.kind === "huntersPrey" &&
    huntersPreySupport === null
  ) {
    return battleUnitSupportProfileIssue(
      `Battle Unit ref ${input.unitRef.unitId} selected Hunter's Prey option requires Hunter's Prey support.`,
    );
  }
  return Result.succeed({
    unit: input.unit,
    supportProfiles:
      huntersPreySupport === null
        ? admittedSupportProfiles.success.supportProfiles
        : [
            ...admittedSupportProfiles.success.supportProfiles,
            huntersPreySupport,
          ],
  });
}

export function battleWeaponMasteryExecutionPropertyForUnit(
  unit: MasteryRecord,
): Result.Result<WeaponMasteryName, BattleUnitSupportProfileIssue> {
  const admitted = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  if (Result.isFailure(admitted)) return Result.fail(admitted.failure);

  const properties = admitted.success.supportProfiles.flatMap((profile) => {
    if (
      typeof profile !== "string" ||
      !isWeaponMasteryPropertySupportProfile(profile)
    ) {
      return [];
    }
    const property = weaponMasteryExecutionPropertyForSupportProfile(profile);
    return property === undefined ? [] : [property];
  });
  const property = properties[0];
  return property !== undefined && properties.length === 1
    ? Result.succeed(property)
    : battleUnitSupportProfileIssue(
        `Battle Weapon Mastery Unit ${unit.id} does not project exactly one supported execution property.`,
      );
}

export type OngoingFeatureSpellModifier = {
  readonly sourceClassName: ClassName;
  readonly saveDcBonus: number;
  readonly attackRollMode: AttackRollMode;
};

export type ReactionRollOrDamageReductionProfile =
  | {
      readonly kind: "attackRollReduction";
      readonly rangeFeet: MovementFeet;
      readonly requiresVisibleCreature: true;
      readonly reduction: ReactionReductionResourceDie;
    }
  | {
      readonly kind: "abilityCheckReduction";
      readonly rangeFeet: MovementFeet;
      readonly requiresVisibleCreature: true;
      readonly reduction: ReactionReductionResourceDie;
    }
  | {
      readonly kind: "attackDamageRollReduction";
      readonly rangeFeet: MovementFeet;
      readonly requiresVisibleCreature: true;
      readonly reduction: ReactionReductionResourceDie;
    }
  | {
      readonly kind: "attackDamageReduction";
      readonly requiresVisibleAttacker?: true;
      readonly damageIncludes?: readonly DamageType[];
      readonly reduction:
        | { readonly kind: "halfDamage" }
        | {
            readonly kind: "dicePlusAbilityModifierPlusClassLevel";
            readonly dieSize: 10;
            readonly ability: "dex";
          };
      readonly zeroDamageRedirect?: {
        readonly spends: ReactionReductionResourceSpend;
        readonly save: {
          readonly ability: "dex";
          readonly dc: {
            readonly kind: "abilityPlusProficiency";
            readonly base: 8;
            readonly ability: "wis";
          };
        };
        readonly damage: {
          readonly dice: {
            readonly dice: 2;
            readonly dieSize: DamageDieSize;
          };
          readonly ability: "dex";
          readonly damageType: "sameTypeDealtByAttack";
        };
        readonly targetGate: {
          readonly melee: "visibleWithin5Feet";
          readonly ranged: "visibleWithin60FeetWithoutTotalCover";
        };
      };
    }
  | {
      readonly kind: "fallDamageReduction";
      readonly reduction: {
        readonly kind: "classLevelMultiplier";
        readonly multiplier: 5;
      };
    };

type AuthoredAttackDamageReductionZeroDamageRedirect = {
  readonly spends: {
    readonly resourceUnitId: AuthoredUnitSource["id"];
    readonly amount: 1;
  };
  readonly save: {
    readonly ability: "dex";
    readonly dc: {
      readonly kind: "ability_plus_proficiency";
      readonly base: 8;
      readonly ability: "wis";
    };
  };
  readonly damage: {
    readonly dice: {
      readonly dice: 2;
      readonly dieSize: { readonly kind: "martial_arts_die" };
    };
    readonly ability: "dex";
    readonly damageType: { readonly kind: "same_type_dealt_by_attack" };
  };
  readonly targetGate: {
    readonly melee: { readonly kind: "visible_within_5_feet" };
    readonly ranged: {
      readonly kind: "visible_within_60_feet_without_total_cover";
    };
  };
};
type AttackDamageReductionZeroDamageRedirectProfile = NonNullable<
  Extract<
    ReactionRollOrDamageReductionProfile,
    { readonly kind: "attackDamageReduction" }
  >["zeroDamageRedirect"]
>;

function attackDamageReductionZeroDamageRedirectProjection(
  redirect: unknown,
  expectedResourceUnitId: AuthoredUnitSource["id"],
  classLevel: ClassLevel,
): AttackDamageReductionZeroDamageRedirectProfile | null {
  const authored = parseAuthoredAttackDamageReductionZeroDamageRedirect(
    redirect,
    expectedResourceUnitId,
  );
  if (authored === null) return null;
  return {
    spends: {
      resourceUnitId: authored.spends.resourceUnitId,
      amount: authored.spends.amount,
    },
    save: {
      ability: authored.save.ability,
      dc: {
        kind: "abilityPlusProficiency",
        base: authored.save.dc.base,
        ability: authored.save.dc.ability,
      },
    },
    damage: {
      dice: {
        dice: authored.damage.dice.dice,
        dieSize: martialArtsDieSize(classLevel),
      },
      ability: authored.damage.ability,
      damageType: "sameTypeDealtByAttack",
    },
    targetGate: {
      melee: "visibleWithin5Feet",
      ranged: "visibleWithin60FeetWithoutTotalCover",
    },
  };
}

function parseAuthoredAttackDamageReductionZeroDamageRedirect(
  redirect: unknown,
  expectedResourceUnitId: AuthoredUnitSource["id"],
): AuthoredAttackDamageReductionZeroDamageRedirect | null {
  /* v8 ignore next -- @preserve -- Malformed authored mechanics: the redirect payload must be a non-null object before its nested shape can be parsed. */
  if (typeof redirect !== "object" || redirect === null) return null;
  // Cast justification: the object guard above is the boundary evidence; every
  // nested field read below is checked before returning a freshly built value.
  const candidate =
    redirect as Partial<AuthoredAttackDamageReductionZeroDamageRedirect>;
  const resourceUnitId = candidate.spends?.resourceUnitId;
  const resourceAmount = candidate.spends?.amount;
  if (
    typeof resourceUnitId !== "string" ||
    resourceUnitId.length === 0 ||
    resourceUnitId !== expectedResourceUnitId ||
    resourceAmount !== 1 ||
    candidate.save?.ability !== "dex" ||
    candidate.save.dc?.kind !== "ability_plus_proficiency" ||
    candidate.save.dc.base !== 8 ||
    candidate.save.dc.ability !== "wis" ||
    candidate.damage?.dice?.dice !== 2 ||
    candidate.damage.dice.dieSize?.kind !== "martial_arts_die" ||
    candidate.damage.ability !== "dex" ||
    candidate.damage.damageType?.kind !== "same_type_dealt_by_attack" ||
    candidate.targetGate?.melee?.kind !== "visible_within_5_feet" ||
    candidate.targetGate.ranged?.kind !==
      "visible_within_60_feet_without_total_cover"
  ) {
    return null;
  }
  return {
    spends: {
      resourceUnitId: expectedResourceUnitId,
      amount: 1,
    },
    save: {
      ability: "dex",
      dc: {
        kind: "ability_plus_proficiency",
        base: 8,
        ability: "wis",
      },
    },
    damage: {
      dice: {
        dice: 2,
        dieSize: { kind: "martial_arts_die" },
      },
      ability: "dex",
      damageType: { kind: "same_type_dealt_by_attack" },
    },
    targetGate: {
      melee: { kind: "visible_within_5_feet" },
      ranged: { kind: "visible_within_60_feet_without_total_cover" },
    },
  };
}

function martialArtsDieSize(classLevel: ClassLevel): MartialArtsDieSize {
  return martialArtsSrdDieSizeAtClassLevel(classLevel);
}

export type ReactionReductionResourceSpend = {
  readonly resourceUnitId: AuthoredUnitSource["id"];
  readonly amount: 1;
};

export type ReactionReductionResourceDie = {
  readonly kind: "resourceDie";
  readonly dice: 1;
  readonly dieSize: 6 | 8 | 10 | 12;
  readonly flatModifier: 0;
  readonly spends: ReactionReductionResourceSpend;
};

export type PassiveArmorClassBonusProfile = {
  readonly bonus: 1;
  readonly condition: {
    readonly kind: "wearingArmor";
    readonly categories: readonly ["light", "medium", "heavy"];
  };
};

export type PassiveSpeedKindGrantsProfile = {
  readonly speed?: PassiveSpeedBonusProfile;
  readonly grants: PassiveSpeedKindGrantProfiles;
};

export const ACROBATIC_MOVEMENT_PATHS = [
  "alongVerticalSurface",
  "acrossLiquid",
] as const;
export type AcrobaticMovementPath = (typeof ACROBATIC_MOVEMENT_PATHS)[number];
export type AcrobaticMovementProfile = {
  readonly condition: Extract<
    PassiveSpeedBonusCondition,
    { readonly kind: "unarmoredUnshielded" }
  >;
  readonly timing: "onYourTurn";
  readonly paths: readonly [
    {
      readonly kind: "verticalSurface";
      readonly path: "alongVerticalSurface";
      readonly withoutFallingDuringMovement: true;
    },
    {
      readonly kind: "liquid";
      readonly path: "acrossLiquid";
      readonly withoutFallingDuringMovement: true;
    },
  ];
};

export type WeaponDamageDiceRollChoiceProfile = {
  readonly optional: true;
  readonly trigger: "weaponHit";
  readonly usageLimit: "oncePerTurn";
  readonly diceScope: "weaponDamageDice";
  readonly choose: "eitherRoll";
};
export type AttackDamageDieFloorProfile = {
  readonly optional: true;
  readonly trigger: "attackDamageRoll";
  readonly attackWeapon: {
    readonly kind: "meleeWeaponHeldWithTwoHands";
    readonly propertyGate: "twoHandedOrVersatile";
  };
  readonly dieScope: "attackDamageDice";
  readonly minimumResult: typeof ATTACK_DAMAGE_DIE_FLOOR_MINIMUM_RESULT;
};
export type LightExtraAttackDamageAbilityModifierProfile = {
  readonly optional: true;
  readonly trigger: "lightPropertyExtraAttackDamageRoll";
  readonly attackWeapon: {
    readonly kind: "weaponWithLightProperty";
  };
  readonly modifierSource: "attackAbilityModifier";
  readonly appliesWhen: "notAlreadyAddingAbilityModifier";
};
export type BattleLightExtraAttackDamageAbilityModifierSupportProfile = {
  readonly kind: typeof LIGHT_EXTRA_ATTACK_DAMAGE_ABILITY_MODIFIER_SUPPORT_PROFILE;
  readonly damageAbilityModifier: LightExtraAttackDamageAbilityModifierProfile;
};
export type MartialArtsAttackProjectionProfile = {
  readonly condition: {
    readonly kind: "unarmoredUnshieldedOnlyMonkWeapons";
  };
  readonly bonusActionAttack: {
    readonly kind: "unarmedStrike";
  };
  readonly damageReplacement: MartialArtsDamageReplacementProfile;
  readonly abilitySubstitution: {
    readonly use: "dex";
    readonly replaces: "str";
    readonly on: readonly ["attackRoll", "damageRoll", "unarmedStrikeSaveDc"];
  };
};
export type MartialArtsDamageReplacementProfile = {
  readonly scope: "unarmedOrMonkWeapon";
  readonly dice: 1;
  readonly dieSize: MartialArtsDieSize;
};

export type SupportedUnitFeatureFacts =
  | {
      readonly kind: "extraActionGrant";
      readonly restriction: ActionRestriction;
    }
  | {
      readonly kind: "selfBonusActionHealing";
      readonly dice: number;
      readonly dieSize: number;
      readonly flatBase: number;
      readonly flatPerLevel: number;
      readonly startingAtLevel: number;
      readonly className: ClassName;
      readonly classLevel: ClassLevel;
    }
  | {
      readonly kind: "ongoingFeature";
      readonly activationTrigger: "bonusAction" | "firstAttackRoll";
      readonly spendsUse: boolean;
      readonly lifecycle: OngoingFeatureLifecycleProfile;
      readonly concentrationEffect?: "breakAndPrevent";
      readonly actionRestrictions: readonly "spellcasting"[];
      readonly rollModifiers: readonly OngoingFeatureRollModifier[];
      readonly spellModifiers: readonly OngoingFeatureSpellModifier[];
      readonly damageModifiers: readonly OngoingFeatureDamageModifier[];
      readonly resistances: readonly DamageType[];
    }
  | {
      readonly kind: "attackDamageRider";
      readonly optional: true;
      readonly usageLimit: "oncePerTurn";
      readonly trigger: "finesseOrRangedAttackWithAdvantageOrAlly";
      readonly eligibility: "advantageOrNonIncapacitatedAllyWithin5ftOfTargetWithoutDisadvantage";
      readonly classLevel: ClassLevel;
      readonly dice: {
        readonly kind: "classLevelTable";
        readonly dieSize: number;
        readonly diceByLevel: readonly {
          readonly atLevel: number;
          readonly count: number;
        }[];
      };
    }
  | {
      readonly kind: "attackDamageRider";
      readonly optional: false;
      readonly usageLimit: "oncePerTurn";
      readonly trigger: "rageActiveRecklessStrengthBasedAttackFirstHit";
      readonly classLevel: ClassLevel;
      readonly dice: {
        readonly kind: "rageDamageBonus";
        readonly dieSize: 6;
      };
    }
  | {
      readonly kind: "saveDamageReplacement";
      readonly ability: "dex";
      readonly requiredSuccessDamage: "half";
      readonly onSuccess: "none";
      readonly onFail: "half";
      readonly suppressedByCondition: "incapacitated";
    }
  | {
      readonly kind: "reactionRollOrDamageReduction";
      readonly classLevel: ClassLevel;
      readonly modifiers: readonly ReactionRollOrDamageReductionProfile[];
    }
  | {
      readonly kind: "passiveArmorClassBonus";
      readonly armorClass: PassiveArmorClassBonusProfile;
    }
  | {
      readonly kind: "passiveRangedAttackRollBonus";
      readonly attackRoll: PassiveRangedAttackRollBonusProfile;
    }
  | {
      readonly kind: "initiativeProficiencyAndSwap";
      readonly initiative: InitiativeProficiencyAndSwapProfile;
    }
  | {
      readonly kind: "attackRollMissToHitReplacement";
      readonly replacement: AttackRollMissToHitReplacementProfile;
    }
  | {
      readonly kind: "attackActionAreaSaveDamageReplacement";
      readonly breath: AttackActionAreaSaveDamageReplacementProfile;
    }
  | {
      readonly kind: "d20TestNaturalOneReroll";
      readonly reroll: D20TestNaturalOneRerollProfile;
    }
  | {
      readonly kind: "passiveSavingThrowRollMode";
      readonly savingThrow: PassiveSavingThrowRollModeProfile;
    }
  | {
      readonly kind: "passiveAbilityCheckRollMode";
      readonly abilityCheck: PassiveAbilityCheckRollModeProfile;
    }
  | {
      readonly kind: "passiveSpeedBonus";
      readonly speed: PassiveSpeedBonusProfile;
    }
  | {
      readonly kind: "passiveSpeedKindGrants";
      readonly speedKindGrants: PassiveSpeedKindGrantsProfile;
    }
  | {
      readonly kind: "acrobaticMovement";
      readonly acrobaticMovement: AcrobaticMovementProfile;
    }
  | {
      readonly kind: "creatureSpaceMovementPermission";
      readonly permission: CreatureSpaceMovementPermissionProfile;
    }
  | {
      readonly kind: "hideActionObscurementPermission";
      readonly permission: HideActionObscurementPermissionProfile;
    }
  | {
      readonly kind: "weaponDamageDiceRollChoice";
      readonly damageDiceChoice: WeaponDamageDiceRollChoiceProfile;
    }
  | {
      readonly kind: "attackDamageDieFloor";
      readonly damageDieFloor: AttackDamageDieFloorProfile;
    }
  | {
      readonly kind: "lightExtraAttackDamageAbilityModifier";
      readonly damageAbilityModifier: LightExtraAttackDamageAbilityModifierProfile;
    }
  | {
      readonly kind: "martialArtsAttackProjection";
      readonly classLevel: ClassLevel;
      readonly martialArts: MartialArtsAttackProjectionProfile;
    }
  | {
      readonly kind: "bardicInspirationGrant";
      readonly rangeFeet: MovementFeet;
      readonly dieSize: DamageDieSize;
      readonly durationTicks: ElapsedTimeTicks;
      readonly spends: {
        readonly resourceUnitId: AuthoredUnitSource["id"];
        readonly amount: 1;
      };
    }
  | BattleDruidWildShapeKnownFormSupportProfile
  | {
      readonly kind: "attackActionAttackCountScaling";
      readonly additionalAttacks: BattleAttackActionAdditionalAttacks;
    }
  | {
      readonly kind: "zeroHitPointReplacement";
      readonly optional: true;
      readonly trigger: "reducedToZeroHitPointsNotKilledOutright";
      readonly replacementHp: 1;
      readonly resetCadence: "longRest";
    }
  | {
      readonly kind: "bonusActionDashTemporaryHitPoints";
      readonly dashTemporaryHitPoints: BonusActionDashTemporaryHitPointsProfile;
    }
  | {
      readonly kind: "failedAbilityCheckResourceBoost";
      readonly abilityCheck: FailedAbilityCheckResourceBoostProfile;
    }
  | {
      readonly kind: "failedSavingThrowReroll";
      readonly savingThrow: FailedSavingThrowRerollProfile;
    }
  | {
      readonly kind: "spellSlotHealingModifier";
      readonly healingModifier: SpellSlotHealingModifierProfile;
    }
  | {
      readonly kind: "magicActionHealingPool";
      readonly className: ClassName;
      readonly healingPool: MagicActionHealingPoolProfile;
    }
  | {
      readonly kind: "magicActionAreaSaveDamageHealing";
      readonly damageHealing: MagicActionAreaSaveDamageHealingProfile;
    }
  | {
      readonly kind: "magicActionSaveGatedCondition";
      readonly condition: MagicActionSaveGatedConditionProfile;
    }
  | {
      readonly kind: "enemyZeroHitPointTemporaryHitPoints";
      readonly className: ClassName;
      readonly temporaryHitPoints: EnemyZeroHitPointTemporaryHitPointsProfile;
    }
  | {
      readonly kind: "bonusActionDelegatedStandardActions";
      readonly actionEconomy: BattleBonusActionDelegatedStandardActionsSupportProfile;
    }
  | {
      readonly kind: "remarkableAthlete";
      readonly remarkableAthlete: RemarkableAthleteProfile;
    }
  | {
      readonly kind: "openHandTechnique";
      readonly technique: OpenHandTechniqueProfile;
    }
  | {
      readonly kind: "stunningStrike";
      readonly stunningStrike: StunningStrikeProfile;
    }
  | BattleCunningStrikeSupportProfile
  | BattleCunningStrikeOptionGrantSupportProfile
  | {
      readonly kind: "paladinSacredWeapon";
      readonly sacredWeapon: PaladinSacredWeaponProfile;
    }
  | {
      readonly kind: "rogueSteadyAim";
      readonly steadyAim: RogueSteadyAimProfile;
    }
  | {
      readonly kind: "potentCantrip";
      readonly potentCantrip: PotentCantripProfile;
    }
  | {
      readonly kind: "grappler";
      readonly grappler: GrapplerProfile;
    }
  | {
      readonly kind: "retaliationReactionAttack";
      readonly retaliation: RetaliationReactionAttackProfile;
    }
  | MonkFocusProcedureFacts;

export type SupportedUnitFeatureProfile = SupportedUnitFeatureFacts & {
  readonly unit: AuthoredUnitSource;
};

export type BattleAttackDamageRiderSupport =
  | "attackDamageRider"
  | "unsupported"
  | null;

export type BattleWeaponOrUnarmedCriticalRange19Support =
  | "criticalRange19"
  | "unsupported"
  | null;

export type BattleBonusActionStandardActionSupport =
  | BattleAlternateActionCostSupportProfile
  | "unsupported"
  | null;
export type BattleSpellSlotHealingModifierSupport =
  | BattleSpellSlotHealingModifierSupportProfile
  | "unsupported"
  | null;
export type BattleMagicActionHealingPoolSupport =
  | BattleMagicActionHealingPoolSupportProfile
  | "unsupported"
  | null;
export type BattleMagicActionAreaSaveDamageHealingSupport =
  | BattleMagicActionAreaSaveDamageHealingSupportProfile
  | "unsupported"
  | null;
export type BattleMagicActionSaveGatedConditionSupport =
  | BattleMagicActionSaveGatedConditionSupportProfile
  | "unsupported"
  | null;
export type BattleEnemyZeroHitPointTemporaryHitPointsSupport =
  | BattleEnemyZeroHitPointTemporaryHitPointsSupportProfile
  | "unsupported"
  | null;
export type BattleMonkFocusBattleOptionsSupport =
  | BattleMonkFocusBattleOptionsSupportProfile
  | "unsupported"
  | null;
export type BattleRemarkableAthleteSupport =
  | BattleRemarkableAthleteSupportProfile
  | "unsupported"
  | null;
export type BattleOpenHandTechniqueSupport =
  | BattleOpenHandTechniqueSupportProfile
  | "unsupported"
  | null;
export type BattleStunningStrikeSupport =
  BattleStunningStrikeSupportProfile | null;
export type BattleCunningStrikeSupport =
  BattleCunningStrikeSupportProfile | null;
export type BattleCunningStrikeOptionGrantSupport =
  BattleCunningStrikeOptionGrantSupportProfile | null;
export type BattleRetaliationReactionAttackSupport =
  | BattleRetaliationReactionAttackSupportProfile
  | "unsupported"
  | null;
export type BattlePaladinSacredWeaponSupport =
  BattlePaladinSacredWeaponSupportProfile | null;
export type BattleHuntersPreySupport =
  | BattleHuntersPreySupportProfile
  | "unsupported"
  | null;
export type BattleRogueSteadyAimSupport =
  BattleRogueSteadyAimSupportProfile | null;
export type BattlePotentCantripSupport =
  BattlePotentCantripSupportProfile | null;

export function battleBonusActionStandardActionSupportForUnit(
  unit: BattleUnitSupportSource,
): BattleBonusActionStandardActionSupport {
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "alternate_action_cost"
  ) {
    return null;
  }

  const actions = alternateActionCostActions(unit.mechanics.from.actions);
  /* v8 ignore start -- @preserve -- Malformed alternate-action-cost Surface mechanics are rejected here; supported projection and unrelated mechanics remain covered by admission tests. */
  if (unit.mechanics.from.kind !== "standard_action" || actions === null) {
    return "unsupported";
  }
  if (unit.mechanics.to.kind !== "bonus_action") {
    return "unsupported";
  }
  /* v8 ignore stop -- @preserve */

  return {
    kind: "alternateActionCost",
    from: {
      kind: "standardAction",
      actions,
    },
    to: { kind: "bonusAction" },
  };
}

type BattleBonusActionDelegatedStandardActionsSupport =
  | BattleBonusActionDelegatedStandardActionsSupportProfile
  | "unsupported"
  | null;

export function battleBonusActionDelegatedStandardActionsSupportForUnit(
  unit: BattleUnitSupportSource,
): BattleBonusActionDelegatedStandardActionsSupport {
  if (isClassicNonSrdMechanicsUnit(unit)) return null;
  return Match.value(admitAtomicClassFeatureProcedure(unit)).pipe(
    Match.when({ tag: "notBattleOwned" }, () => null),
    Match.when({ tag: "rejected" }, ({ issues }) =>
      issues[0].procedure === "bonusActionDelegatedStandardActions"
        ? ("unsupported" as const)
        : null,
    ),
    Match.when({ tag: "admitted" }, ({ procedure }) =>
      Match.value(procedure.facts).pipe(
        Match.when(
          { kind: "bonusActionDelegatedStandardActions" },
          ({ actionEconomy }) => actionEconomy,
        ),
        Match.when({ kind: "acrobaticMovement" }, () => null),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
}

function alternateActionCostActions(
  actions: readonly StandardActionKind[],
): ReadonlyNonEmptyArray<AlternateActionCostAction> | null {
  const first = actions[0];
  /* v8 ignore start -- @preserve -- Malformed authored alternate-cost mechanics: admission requires a non-empty list containing only the supported standard-action subset. */
  if (first === undefined || !isAlternateActionCostAction(first)) {
    return null;
  }
  const rest = actions.slice(1);
  if (!rest.every(isAlternateActionCostAction)) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  return [first, ...rest];
}

export function battleMonkFocusBattleOptionsSupportForUnit(
  unit: AuthoredUnitSource,
): BattleMonkFocusBattleOptionsSupport {
  return Match.value(admitMonkFocusProcedure(unit)).pipe(
    Match.when({ tag: "notBattleOwned" }, () => null),
    Match.when({ tag: "rejected" }, () => "unsupported" as const),
    Match.when({ tag: "admitted" }, ({ procedure }) => procedure.facts),
    Match.exhaustive,
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function isAlternateActionCostAction(
  action: StandardActionKind,
): action is AlternateActionCostAction {
  return ALTERNATE_ACTION_COST_ACTIONS.includes(
    action as AlternateActionCostAction,
  );
}

export function isClassicNonSrdMechanicsUnit(
  unit: BattleUnitSupportSource,
): unit is ClassicNonSrdMechanicsUnit {
  return unit.provenance.kind === "classic-2024-mechanics-source-lane";
}

export function battleWeaponOrUnarmedCriticalRange19SupportForUnit(
  unit: AuthoredUnitSource,
): BattleWeaponOrUnarmedCriticalRange19Support {
  if (unit.kind !== "class_feature" || unit.mechanics.family !== "passive") {
    return null;
  }

  const criticalRangeEffects = unit.mechanics.grants.filter(
    (effect) => effect.kind === "modify_crit_range",
  );
  if (criticalRangeEffects.length === 0) {
    return null;
  }

  return criticalRangeEffects.every(
    (effect) =>
      effect.threshold === 19 &&
      effect.attackRollFilter === "weapon_or_unarmed_strike" &&
      effect.weaponFilter === undefined,
  )
    ? "criticalRange19"
    : "unsupported";
}

type AttackDamageRiderMechanicsProjection =
  | Omit<
      Extract<
        SupportedUnitFeatureProfile,
        {
          readonly kind: "attackDamageRider";
          readonly trigger: "finesseOrRangedAttackWithAdvantageOrAlly";
        }
      >,
      "kind" | "unit" | "usageLimit" | "classLevel"
    >
  | Omit<
      Extract<
        SupportedUnitFeatureProfile,
        {
          readonly kind: "attackDamageRider";
          readonly trigger: "rageActiveRecklessStrengthBasedAttackFirstHit";
        }
      >,
      "kind" | "unit" | "usageLimit" | "classLevel"
    >;

export function battleAttackDamageRiderSupportForUnit(
  unit: AuthoredUnitSource,
): BattleAttackDamageRiderSupport {
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "on_hit_trigger"
  ) {
    return null;
  }
  return attackDamageRiderMechanicsProjection(unit) === null
    ? "unsupported"
    : "attackDamageRider";
}

function attackDamageRiderMechanicsProjection(
  unit: AuthoredUnitSource,
): AttackDamageRiderMechanicsProjection | null {
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "on_hit_trigger"
  ) {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.trigger.kind !== "hit_with_attack_roll" ||
    !("usageLimit" in mechanics) ||
    mechanics.usageLimit.kind !== "once_per_turn" ||
    mechanics.effect.kind !== "add_attack_damage_dice" ||
    mechanics.effect.damageType !== "same_as_attack"
  ) {
    return null;
  }
  if (
    mechanics.optional === true &&
    "weaponFilter" in mechanics.trigger &&
    mechanics.trigger.weaponFilter === "finesse_or_ranged" &&
    mechanics.trigger.eligibility ===
      "advantage_or_non_incapacitated_ally_within_5ft_of_target_without_disadvantage" &&
    mechanics.effect.dice.kind === "class_level_table"
  ) {
    return {
      optional: true,
      trigger: "finesseOrRangedAttackWithAdvantageOrAlly",
      eligibility:
        "advantageOrNonIncapacitatedAllyWithin5ftOfTargetWithoutDisadvantage",
      dice: {
        kind: "classLevelTable",
        dieSize: mechanics.effect.dice.dieSize,
        diceByLevel: mechanics.effect.dice.dice,
      },
    };
  }
  if (
    mechanics.optional === false &&
    "attackFilter" in mechanics.trigger &&
    mechanics.trigger.attackFilter === "strength_based_attack" &&
    mechanics.trigger.prerequisite ===
      "rage_active_and_reckless_attack_used_this_turn" &&
    mechanics.trigger.hitLimit === "first_target_hit_this_turn" &&
    mechanics.effect.dice.kind === "rage_damage_bonus"
  ) {
    return {
      optional: false,
      trigger: "rageActiveRecklessStrengthBasedAttackFirstHit",
      dice: {
        kind: "rageDamageBonus",
        dieSize: mechanics.effect.dice.dieSize,
      },
    };
  }
  return null;
}

export type BattleSaveDamageReplacementSupport =
  | "saveDamageReplacement"
  | "unsupported"
  | null;

type SaveDamageReplacementMechanicsProjection = {
  readonly ability: "dex";
};

export function battleSaveDamageReplacementSupportForUnit(
  unit: AuthoredUnitSource,
): BattleSaveDamageReplacementSupport {
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "save_damage_replacement"
  ) {
    return null;
  }
  return saveDamageReplacementMechanicsProjection(unit) === null
    ? "unsupported"
    : "saveDamageReplacement";
}

function saveDamageReplacementMechanicsProjection(
  unit: AuthoredUnitSource,
): SaveDamageReplacementMechanicsProjection | null {
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "save_damage_replacement"
  ) {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.trigger.kind !== "saving_throw_damage" ||
    mechanics.trigger.ability !== "dex" ||
    mechanics.trigger.successDamage !== "half_damage" ||
    mechanics.replacement.onSuccess !== "no_damage" ||
    mechanics.replacement.onFail !== "half_damage" ||
    mechanics.suppressedBy.length !== 1 ||
    mechanics.suppressedBy[0]?.kind !== "condition" ||
    mechanics.suppressedBy[0].condition !== "incapacitated"
  ) {
    return null;
  }
  return { ability: mechanics.trigger.ability };
}

export type BattleReactionRollOrDamageReductionSupport =
  | "reactionRollOrDamageReduction"
  | "attackDamageReductionZeroDamageRedirect"
  | "unsupported"
  | null;

export function battleReactionRollOrDamageReductionSupportForUnit(
  unit: AuthoredUnitSource,
): BattleReactionRollOrDamageReductionSupport {
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "reaction_roll_or_damage_reduction"
  ) {
    return null;
  }
  const projection = reactionRollOrDamageReductionMechanicsProjection(
    unit,
    classLevel(unit.acquiredAtLevel),
  );
  if (projection === null) return "unsupported";
  return projection.some(
    (modifier) =>
      modifier.kind === "attackDamageReduction" &&
      modifier.zeroDamageRedirect !== undefined,
  )
    ? "attackDamageReductionZeroDamageRedirect"
    : "reactionRollOrDamageReduction";
}

export type BattlePassiveArmorClassBonusSupport =
  | "passiveArmorClassBonus"
  | "unsupported"
  | null;

export type BattlePassiveRangedAttackRollBonusSupport =
  | BattlePassiveRangedAttackRollBonusSupportProfile
  | "unsupported"
  | null;

export type BattleInitiativeProficiencyAndSwapSupport =
  | BattleInitiativeProficiencyAndSwapSupportProfile
  | "unsupported"
  | null;

export type BattleAttackRollMissToHitReplacementSupport =
  | BattleAttackRollMissToHitReplacementSupportProfile
  | "unsupported"
  | null;

export type BattleAttackActionAreaSaveDamageReplacementSupport =
  | BattleAttackActionAreaSaveDamageReplacementSupportProfile
  | "unsupported"
  | null;

export type BattleD20TestNaturalOneRerollSupport =
  | BattleD20TestNaturalOneRerollSupportProfile
  | "unsupported"
  | null;

export type BattlePassiveSavingThrowRollModeSupport =
  | BattlePassiveSavingThrowRollModeSupportProfile
  | "unsupported"
  | null;

export type BattlePassiveAbilityCheckRollModeSupport =
  | BattlePassiveAbilityCheckRollModeSupportProfile
  | "unsupported"
  | null;

export type BattlePassiveDamageResistanceSupport =
  | BattlePassiveDamageResistanceSupportProfile
  | "unsupported"
  | null;

export type BattlePassiveSpeedBonusSupport =
  | BattlePassiveSpeedBonusSupportProfile
  | "unsupported"
  | null;

export type BattlePassiveSpeedKindGrantsSupport =
  | BattlePassiveSpeedKindGrantsSupportProfile
  | "unsupported"
  | null;

export type BattleAcrobaticMovementSupport =
  | BattleAcrobaticMovementSupportProfile
  | "unsupported"
  | null;

export type BattleCreatureSpaceMovementPermissionSupport =
  | BattleCreatureSpaceMovementPermissionSupportProfile
  | "unsupported"
  | null;

export type BattleHideActionObscurementPermissionSupport =
  | BattleHideActionObscurementPermissionSupportProfile
  | "unsupported"
  | null;

export type BattleWeaponDamageDiceRollChoiceSupport =
  | "weaponDamageDiceRollChoice"
  | "unsupported"
  | null;

export type BattleAttackDamageDieFloorSupport =
  | "attackDamageDieFloor"
  | "unsupported"
  | null;

export type BattleLightExtraAttackDamageAbilityModifierSupport =
  | BattleLightExtraAttackDamageAbilityModifierSupportProfile
  | "unsupported"
  | null;

export type BattleMartialArtsAttackProjectionSupport =
  | "martialArtsAttackProjection"
  | "unsupported"
  | null;

export type BattleAttackActionAttackCountScalingSupport =
  | BattleAttackActionAttackCountScalingSupportProfile
  | "unsupported"
  | null;

export type BattleZeroHitPointReplacementSupport =
  | "zeroHitPointReplacement"
  | "unsupported"
  | null;

export type BattleBonusActionDashTemporaryHitPointsSupport =
  | BattleBonusActionDashTemporaryHitPointsSupportProfile
  | "unsupported"
  | null;

export type BattleFailedAbilityCheckResourceBoostSupport =
  | BattleFailedAbilityCheckResourceBoostSupportProfile
  | "unsupported"
  | null;

export type BattleFailedSavingThrowRerollSupport =
  | BattleFailedSavingThrowRerollSupportProfile
  | "unsupported"
  | null;

export type BattleDruidWildShapeKnownFormSupport =
  | BattleDruidWildShapeKnownFormSupportProfile
  | "unsupported"
  | null;

export type BattleTacticalMasterReplacementSupport =
  | BattleTacticalMasterReplacementSupportProfile
  | "unsupported"
  | null;

export function battlePassiveArmorClassBonusSupportForUnit(
  unit: AuthoredUnitSource,
): BattlePassiveArmorClassBonusSupport {
  if (!hasPassiveArmorClassBonusMechanics(unit)) {
    return null;
  }
  return passiveArmorClassBonusProfileForUnit(unit) === null
    ? "unsupported"
    : "passiveArmorClassBonus";
}

export function battlePassiveRangedAttackRollBonusSupportForUnit(
  unit: AuthoredUnitSource,
): BattlePassiveRangedAttackRollBonusSupport {
  if (!hasPassiveRangedAttackRollBonusMechanics(unit)) {
    return null;
  }
  const attackRoll = passiveRangedAttackRollBonusProfileForUnit(unit);
  return attackRoll === null
    ? "unsupported"
    : { kind: PASSIVE_RANGED_ATTACK_ROLL_BONUS_SUPPORT_PROFILE, attackRoll };
}

export function battleInitiativeProficiencyAndSwapSupportForUnit(
  unit: AuthoredUnitSource,
): BattleInitiativeProficiencyAndSwapSupport {
  if (!hasInitiativeProficiencyAndSwapMechanics(unit)) {
    return null;
  }
  const initiative = initiativeProficiencyAndSwapProfileForUnit(unit);
  return initiative === null
    ? "unsupported"
    : { kind: INITIATIVE_PROFICIENCY_AND_SWAP_SUPPORT_PROFILE, initiative };
}

export function battleAttackRollMissToHitReplacementSupportForUnit(
  unit: AuthoredUnitSource,
): BattleAttackRollMissToHitReplacementSupport {
  if (!hasAttackRollMissToHitReplacementMechanics(unit)) {
    return null;
  }
  const replacement = attackRollMissToHitReplacementProfileForUnit(unit);
  return replacement === null
    ? "unsupported"
    : {
        kind: ATTACK_ROLL_MISS_TO_HIT_REPLACEMENT_SUPPORT_PROFILE,
        replacement,
      };
}

export function battleAttackActionAreaSaveDamageReplacementSupportForUnit(input: {
  readonly unit: AuthoredUnitSource;
  readonly draconicAncestryDamageType?: DraconicAncestryDamageType | undefined;
}): BattleAttackActionAreaSaveDamageReplacementSupport {
  if (!hasAttackActionAreaSaveDamageReplacementMechanics(input.unit)) {
    return null;
  }
  if (input.draconicAncestryDamageType === undefined) {
    return "unsupported";
  }
  const profile = attackActionAreaSaveDamageReplacementProfileForUnit({
    unit: input.unit,
    draconicAncestryDamageType: input.draconicAncestryDamageType,
  });
  return profile === null
    ? "unsupported"
    : {
        kind: ATTACK_ACTION_AREA_SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
        breath: profile.breath,
      };
}

export function battleD20TestNaturalOneRerollSupportForUnit(
  unit: AuthoredUnitSource,
): BattleD20TestNaturalOneRerollSupport {
  return Match.value(admitAtomicSpeciesTraitProcedure(unit)).pipe(
    Match.when({ tag: "notBattleOwned" }, () => null),
    Match.when({ tag: "rejected" }, ({ issues }) =>
      issues[0].procedure === "d20TestNaturalOneReroll"
        ? ("unsupported" as const)
        : null,
    ),
    Match.when({ tag: "admitted" }, ({ procedure }) =>
      Match.value(procedure.facts).pipe(
        Match.when({ kind: "d20TestNaturalOneReroll" }, (facts) => facts),
        Match.when({ kind: "creatureSpaceMovementPermission" }, () => null),
        Match.when({ kind: "hideActionObscurementPermission" }, () => null),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
}

export function battlePassiveSavingThrowRollModeSupportForUnit(
  unit: AuthoredUnitSource,
): BattlePassiveSavingThrowRollModeSupport {
  if (!hasPassiveSavingThrowRollModeMechanics(unit)) {
    return null;
  }
  const savingThrow = passiveSavingThrowRollModeProfileForUnit(unit);
  return savingThrow === null
    ? "unsupported"
    : {
        kind: PASSIVE_SAVING_THROW_ROLL_MODE_SUPPORT_PROFILE,
        savingThrow,
      };
}

export function battlePassiveAbilityCheckRollModeSupportForUnit(
  unit: AuthoredUnitSource,
): BattlePassiveAbilityCheckRollModeSupport {
  if (!hasPassiveAbilityCheckRollModeMechanics(unit)) {
    return null;
  }
  const abilityCheck = passiveAbilityCheckRollModeProfileForUnit(unit);
  return abilityCheck === null
    ? "unsupported"
    : {
        kind: PASSIVE_ABILITY_CHECK_ROLL_MODE_SUPPORT_PROFILE,
        abilityCheck,
      };
}

export function battlePassiveDamageResistanceSupportForUnit(input: {
  readonly unit: AuthoredUnitSource;
  readonly draconicAncestryDamageType?: DraconicAncestryDamageType | undefined;
}): BattlePassiveDamageResistanceSupport {
  if (!hasPassiveDamageResistanceMechanics(input.unit)) {
    return null;
  }
  const resistance = passiveDamageResistanceProfileForUnit({
    unit: input.unit,
    draconicAncestryDamageType: input.draconicAncestryDamageType,
  });
  return resistance === null
    ? "unsupported"
    : {
        kind: PASSIVE_DAMAGE_RESISTANCE_SUPPORT_PROFILE,
        resistance,
      };
}

export function battlePassiveSpeedBonusSupportForUnit(
  unit: AuthoredUnitSource,
): BattlePassiveSpeedBonusSupport {
  if (!hasPassiveSpeedBonusMechanics(unit)) {
    return null;
  }
  const speed = passiveSpeedBonusProfileForUnit(unit);
  return speed === null
    ? "unsupported"
    : { kind: PASSIVE_SPEED_BONUS_SUPPORT_PROFILE, ...speed };
}

export function battlePassiveSpeedKindGrantsSupportForUnit(
  unit: AuthoredUnitSource,
): BattlePassiveSpeedKindGrantsSupport {
  if (!hasPassiveSpeedKindGrantsMechanics(unit)) {
    return null;
  }
  const speedKindGrants = passiveSpeedKindGrantsProfileForUnit(unit);
  return speedKindGrants === null
    ? "unsupported"
    : {
        kind: PASSIVE_SPEED_KIND_GRANTS_SUPPORT_PROFILE,
        ...speedKindGrants,
      };
}

export function battleAcrobaticMovementSupportForUnit(
  unit: AuthoredUnitSource,
): BattleAcrobaticMovementSupport {
  return Match.value(admitAtomicClassFeatureProcedure(unit)).pipe(
    Match.when({ tag: "notBattleOwned" }, () => null),
    Match.when({ tag: "rejected" }, ({ issues }) =>
      issues[0].procedure === "acrobaticMovement"
        ? ("unsupported" as const)
        : null,
    ),
    Match.when({ tag: "admitted" }, ({ procedure }) =>
      Match.value(procedure.facts).pipe(
        Match.when({ kind: "acrobaticMovement" }, (facts) => facts),
        Match.when({ kind: "bonusActionDelegatedStandardActions" }, () => null),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
}

export function battleCreatureSpaceMovementPermissionSupportForUnit(
  unit: AuthoredUnitSource,
): BattleCreatureSpaceMovementPermissionSupport {
  return Match.value(admitAtomicSpeciesTraitProcedure(unit)).pipe(
    Match.when({ tag: "notBattleOwned" }, () => null),
    Match.when({ tag: "rejected" }, ({ issues }) =>
      issues[0].procedure === "creatureSpaceMovementPermission"
        ? ("unsupported" as const)
        : null,
    ),
    Match.when({ tag: "admitted" }, ({ procedure }) =>
      Match.value(procedure.facts).pipe(
        Match.when(
          { kind: "creatureSpaceMovementPermission" },
          (facts) => facts,
        ),
        Match.when({ kind: "d20TestNaturalOneReroll" }, () => null),
        Match.when({ kind: "hideActionObscurementPermission" }, () => null),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
}

export function battleHideActionObscurementPermissionSupportForUnit(
  unit: AuthoredUnitSource,
): BattleHideActionObscurementPermissionSupport {
  return Match.value(admitAtomicSpeciesTraitProcedure(unit)).pipe(
    Match.when({ tag: "notBattleOwned" }, () => null),
    Match.when({ tag: "rejected" }, ({ issues }) =>
      issues[0].procedure === "hideActionObscurementPermission"
        ? ("unsupported" as const)
        : null,
    ),
    Match.when({ tag: "admitted" }, ({ procedure }) =>
      Match.value(procedure.facts).pipe(
        Match.when(
          { kind: "hideActionObscurementPermission" },
          (facts) => facts,
        ),
        Match.when({ kind: "creatureSpaceMovementPermission" }, () => null),
        Match.when({ kind: "d20TestNaturalOneReroll" }, () => null),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
}

export function battleWeaponDamageDiceRollChoiceSupportForUnit(
  unit: AuthoredUnitSource,
): BattleWeaponDamageDiceRollChoiceSupport {
  if (!hasWeaponDamageDiceRollChoiceMechanics(unit)) {
    return null;
  }
  return weaponDamageDiceRollChoiceProfileForUnit(unit) === null
    ? "unsupported"
    : "weaponDamageDiceRollChoice";
}

export function battleAttackDamageDieFloorSupportForUnit(
  unit: AuthoredUnitSource,
): BattleAttackDamageDieFloorSupport {
  if (!hasAttackDamageDieFloorMechanics(unit)) {
    return null;
  }
  return attackDamageDieFloorProfileForUnit(unit) === null
    ? "unsupported"
    : "attackDamageDieFloor";
}

export function battleLightExtraAttackDamageAbilityModifierSupportForUnit(
  unit: AuthoredUnitSource,
): BattleLightExtraAttackDamageAbilityModifierSupport {
  if (!hasLightExtraAttackDamageAbilityModifierMechanics(unit)) {
    return null;
  }
  const damageAbilityModifier =
    lightExtraAttackDamageAbilityModifierProfileForUnit(unit);
  return damageAbilityModifier === null
    ? "unsupported"
    : {
        kind: LIGHT_EXTRA_ATTACK_DAMAGE_ABILITY_MODIFIER_SUPPORT_PROFILE,
        damageAbilityModifier,
      };
}

export function battleMartialArtsAttackProjectionSupportForUnit(
  unit: AuthoredUnitSource,
): BattleMartialArtsAttackProjectionSupport {
  if (!hasMartialArtsAttackProjectionMechanics(unit)) {
    return null;
  }
  return martialArtsAttackProjectionMechanicsForUnit(unit) === null
    ? "unsupported"
    : "martialArtsAttackProjection";
}

export function battleAttackActionAttackCountScalingSupportForUnit(
  unit: AuthoredUnitSource,
): BattleAttackActionAttackCountScalingSupport {
  if (!hasAttackActionAttackCountScalingMechanics(unit)) {
    return null;
  }
  const profile = attackActionAttackCountScalingProfileForUnit(unit);
  return profile === null
    ? "unsupported"
    : {
        kind: ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE,
        additionalAttacks: profile.additionalAttacks,
      };
}

export function battleZeroHitPointReplacementSupportForUnit(
  unit: AuthoredUnitSource,
): BattleZeroHitPointReplacementSupport {
  if (!hasZeroHitPointReplacementMechanics(unit)) {
    return null;
  }
  return zeroHitPointReplacementProfileForUnit(unit) === null
    ? "unsupported"
    : "zeroHitPointReplacement";
}

export function battleBonusActionDashTemporaryHitPointsSupportForUnit(
  unit: AuthoredUnitSource,
): BattleBonusActionDashTemporaryHitPointsSupport {
  if (!hasBonusActionDashTemporaryHitPointsMechanics(unit)) {
    return null;
  }
  const profile = bonusActionDashTemporaryHitPointsProfileForUnit(unit);
  return profile === null
    ? "unsupported"
    : {
        kind: BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
        dashTemporaryHitPoints: profile.dashTemporaryHitPoints,
      };
}

export function battleFailedAbilityCheckResourceBoostSupportForUnit(
  unit: AuthoredUnitSource,
): BattleFailedAbilityCheckResourceBoostSupport {
  if (!hasFailedAbilityCheckResourceBoostMechanics(unit)) {
    return null;
  }
  const profile = failedAbilityCheckResourceBoostProfileForUnit(unit);
  return profile === null
    ? "unsupported"
    : {
        kind: FAILED_ABILITY_CHECK_RESOURCE_BOOST_SUPPORT_PROFILE,
        abilityCheck: profile.abilityCheck,
      };
}

export function battleFailedSavingThrowRerollSupportForUnit(
  unit: AuthoredUnitSource,
): BattleFailedSavingThrowRerollSupport {
  return Match.value(admitFailedSavingThrowRerollProcedure(unit)).pipe(
    Match.when({ tag: "notBattleOwned" }, () => null),
    Match.when({ tag: "rejected" }, () => "unsupported" as const),
    Match.when({ tag: "admitted" }, ({ procedure }) => procedure.facts),
    Match.exhaustive,
  );
}

export function battleSpellSlotHealingModifierSupportForUnit(
  unit: AuthoredUnitSource,
): BattleSpellSlotHealingModifierSupport {
  if (!hasSpellSlotHealingModifierMechanics(unit)) {
    return null;
  }
  const profile = spellSlotHealingModifierProfileForUnit(unit);
  return profile === null
    ? "unsupported"
    : {
        kind: SPELL_SLOT_HEALING_MODIFIER_SUPPORT_PROFILE,
        healingModifier: profile.healingModifier,
      };
}

export function battleMagicActionHealingPoolSupportForUnit(
  unit: AuthoredUnitSource,
): BattleMagicActionHealingPoolSupport {
  if (!hasMagicActionHealingPoolMechanics(unit)) {
    return null;
  }
  const profile = magicActionHealingPoolProfileForUnit(unit);
  return profile === null
    ? "unsupported"
    : {
        kind: MAGIC_ACTION_HEALING_POOL_SUPPORT_PROFILE,
        className: profile.className,
        healingPool: profile.healingPool,
      };
}

export function battleMagicActionAreaSaveDamageHealingSupportForUnit(
  unit: AuthoredUnitSource,
  classLevels?: readonly CharacterBattleClassLevel[],
): BattleMagicActionAreaSaveDamageHealingSupport {
  if (!hasMagicActionAreaSaveDamageHealingMechanics(unit)) {
    return null;
  }
  const profile = magicActionAreaSaveDamageHealingProfileForUnit(
    unit,
    classLevels,
  );
  return profile === null
    ? "unsupported"
    : {
        kind: MAGIC_ACTION_AREA_SAVE_DAMAGE_HEALING_SUPPORT_PROFILE,
        damageHealing: profile.damageHealing,
      };
}

export function battleEnemyZeroHitPointTemporaryHitPointsSupportForUnit(
  unit: AuthoredUnitSource,
): BattleEnemyZeroHitPointTemporaryHitPointsSupport {
  if (!hasEnemyZeroHitPointTemporaryHitPointsMechanics(unit)) {
    return null;
  }
  const profile = enemyZeroHitPointTemporaryHitPointsProfileForUnit(unit);
  return profile === null
    ? "unsupported"
    : {
        kind: ENEMY_ZERO_HIT_POINT_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
        className: profile.className,
        temporaryHitPoints: profile.temporaryHitPoints,
      };
}

export function battleRemarkableAthleteSupportForUnit(
  unit: AuthoredUnitSource,
): BattleRemarkableAthleteSupport {
  if (!hasClassFeatureMechanicsFamily(unit, "remarkable_athlete")) {
    return null;
  }
  const profile = remarkableAthleteProfileForUnit(unit);
  return profile === null
    ? "unsupported"
    : {
        kind: REMARKABLE_ATHLETE_SUPPORT_PROFILE,
        remarkableAthlete: profile.remarkableAthlete,
      };
}

export function battleOpenHandTechniqueSupportForUnit(
  unit: AuthoredUnitSource,
): BattleOpenHandTechniqueSupport {
  if (!hasClassFeatureMechanicsFamily(unit, "open_hand_technique")) {
    return null;
  }
  const profile = openHandTechniqueProfileForUnit(unit);
  return profile === null
    ? "unsupported"
    : {
        kind: OPEN_HAND_TECHNIQUE_SUPPORT_PROFILE,
        technique: profile.technique,
      };
}

export function battleStunningStrikeSupportForUnit(
  unit: AuthoredUnitSource,
): BattleStunningStrikeSupport {
  if (!isStunningStrikeUnit(unit)) {
    return null;
  }
  const profile = stunningStrikeProfileForAdmittedUnit(unit);
  return {
    kind: STUNNING_STRIKE_SUPPORT_PROFILE,
    stunningStrike: profile.stunningStrike,
  };
}

export function battleCunningStrikeSupportForUnit(
  unit: AuthoredUnitSource,
): BattleCunningStrikeSupport {
  if (!isCunningStrikeUnit(unit)) {
    return null;
  }
  const profile = cunningStrikeProfileForAdmittedUnit(unit);
  return {
    kind: CUNNING_STRIKE_SUPPORT_PROFILE,
    cunningStrike: profile.cunningStrike,
  };
}

export function battleCunningStrikeOptionGrantSupportForUnit(
  unit: AuthoredUnitSource,
): BattleCunningStrikeOptionGrantSupport {
  if (!isCunningStrikeOptionGrantUnit(unit)) {
    return null;
  }
  const profile = cunningStrikeOptionGrantProfileForAdmittedUnit(unit);
  return {
    kind: CUNNING_STRIKE_OPTION_GRANT_SUPPORT_PROFILE,
    optionGrant: profile.optionGrant,
  };
}

export function battlePaladinSacredWeaponSupportForUnit(
  unit: AuthoredUnitSource,
): BattlePaladinSacredWeaponSupport {
  if (!isPaladinSacredWeaponUnit(unit)) {
    return null;
  }
  const profile = paladinSacredWeaponProfileForAdmittedUnit(unit);
  return {
    kind: PALADIN_SACRED_WEAPON_SUPPORT_PROFILE,
    sacredWeapon: profile.sacredWeapon,
  };
}

export function battleHuntersPreySupportForUnit(
  unit: BattleUnitSupportSource,
  selectedOption?: BattleUnitSupportProfileSelectedOption,
): BattleHuntersPreySupport {
  return battleHuntersPreySupportForAdmission(
    huntersPreyAdmissionForUnit(unit),
    selectedOption,
  );
}

function battleHuntersPreySupportForAdmission(
  admission: HuntersPreyAdmission,
  selectedOption?: BattleUnitSupportProfileSelectedOption,
): BattleHuntersPreySupport {
  if (admission.tag === "unsupported") return "unsupported";
  return battleHuntersPreySupportForSupportedAdmission(
    admission,
    selectedOption,
  );
}

function battleHuntersPreySupportForSupportedAdmission(
  admission: SupportedHuntersPreyAdmission,
  selectedOption?: BattleUnitSupportProfileSelectedOption,
): BattleHuntersPreySupportProfile | null {
  if (admission.tag === "notHuntersPrey") return null;
  return selectedOption === undefined
    ? null
    : selectedHuntersPreySupportProfile(admission.profile, selectedOption);
}

function selectedHuntersPreySupportProfile(
  admitted: HuntersPreyAdmittedMechanicsProfile,
  selectedOption: BattleUnitSupportProfileSelectedOption,
): BattleHuntersPreySupportProfile {
  return {
    kind: HUNTERS_PREY_SUPPORT_PROFILE,
    huntersPrey: Match.value(selectedOption.selection).pipe(
      Match.when(
        "woundedTargetWeaponDamage",
        () => admitted.woundedTargetWeaponDamage,
      ),
      Match.when(
        "nearbyDifferentTargetSameWeaponAttack",
        () => admitted.nearbyDifferentTargetSameWeaponAttack,
      ),
      Match.exhaustive,
    ),
  };
}

function huntersPreyAdmissionForUnit(
  unit: BattleUnitSupportSource,
): HuntersPreyAdmission {
  if (
    isClassicNonSrdMechanicsUnit(unit) ||
    !hasClassFeatureMechanicsFamily(unit, "hunters_prey")
  ) {
    return { tag: "notHuntersPrey", unit };
  }
  const profile = huntersPreyAdmittedMechanicsProfileForUnit(unit);
  return profile === null
    ? { tag: "unsupported", unit }
    : { tag: "admitted", unit, profile };
}

export function battleRogueSteadyAimSupportForUnit(
  unit: AuthoredUnitSource,
): BattleRogueSteadyAimSupport {
  if (!isRogueSteadyAimUnit(unit)) {
    return null;
  }
  const profile = rogueSteadyAimProfileForAdmittedUnit(unit);
  return {
    kind: ROGUE_STEADY_AIM_SUPPORT_PROFILE,
    steadyAim: profile.steadyAim,
  };
}

export function battlePotentCantripSupportForUnit(
  unit: AuthoredUnitSource,
): BattlePotentCantripSupport {
  if (!isPotentCantripUnit(unit)) {
    return null;
  }
  const profile = potentCantripProfileForAdmittedUnit(unit);
  return {
    kind: POTENT_CANTRIP_SUPPORT_PROFILE,
    potentCantrip: profile.potentCantrip,
  };
}

function hasClassFeatureMechanicsFamily(
  unit: AuthoredUnitSource,
  family: string,
): boolean {
  return unit.kind === "class_feature" && unit.mechanics.family === family;
}

function hasPassiveArmorClassBonusMechanics(unit: AuthoredUnitSource): boolean {
  if (unit.kind !== "feat" || unit.mechanics.family !== "passive") {
    return false;
  }
  const [effect] = unit.mechanics.grants;
  return (
    effect?.kind === "modify_ac" ||
    unit.mechanics.condition?.kind === "wearing_armor"
  );
}

function hasPassiveRangedAttackRollBonusMechanics(
  unit: AuthoredUnitSource,
): boolean {
  if (unit.kind !== "feat" || unit.mechanics.family !== "passive") {
    return false;
  }
  const [effect] = unit.mechanics.grants;
  return (
    effect?.kind === "modify_roll_numeric" &&
    (sameStringSet(effect.on, ["attack_roll"]) ||
      effect.weaponFilter !== undefined)
  );
}

function hasInitiativeProficiencyAndSwapMechanics(
  unit: AuthoredUnitSource,
): boolean {
  if (unit.kind !== "feat" || unit.mechanics.family !== "passive") {
    return false;
  }
  return (
    unit.mechanics.grants.some(
      (effect) =>
        effect.kind === "modify_roll_numeric" &&
        sameStringSet(effect.on, ["initiative"]),
    ) &&
    unit.mechanics.grants.some((effect) => effect.kind === "initiative_swap")
  );
}

function hasAttackRollMissToHitReplacementMechanics(
  unit: AuthoredUnitSource,
): boolean {
  return (
    unit.kind === "feat" &&
    unit.mechanics.family === "triggered_replacement" &&
    unit.mechanics.trigger.kind === "miss_with_attack_roll"
  );
}

function hasAttackActionAreaSaveDamageReplacementMechanics(
  unit: AuthoredUnitSource,
): boolean {
  return (
    unit.kind === "species_trait" &&
    unit.mechanics.family === "activation" &&
    unit.mechanics.activationCost.kind === "replace_attack"
  );
}

function hasPassiveSavingThrowRollModeMechanics(
  unit: AuthoredUnitSource,
): boolean {
  if (
    (unit.kind !== "class_feature" && unit.kind !== "species_trait") ||
    unit.mechanics.family !== "passive"
  ) {
    return false;
  }
  return unit.mechanics.grants.some(
    (effect) =>
      effect.kind === "modify_roll_advantage" &&
      sameStringSet(effect.on, ["saving_throw"]),
  );
}

function hasPassiveAbilityCheckRollModeMechanics(
  unit: AuthoredUnitSource,
): boolean {
  if (unit.kind !== "species_trait" || unit.mechanics.family !== "passive") {
    return false;
  }
  return unit.mechanics.grants.some(
    (effect) =>
      effect.kind === "modify_roll_advantage" &&
      sameStringSet(effect.on, ["ability_check"]),
  );
}

function hasPassiveDamageResistanceMechanics(
  unit: AuthoredUnitSource,
): boolean {
  if (unit.kind !== "species_trait" || unit.mechanics.family !== "passive") {
    return false;
  }
  return unit.mechanics.grants.some(
    (effect) =>
      effect.kind === "grant_resistance" &&
      passiveResistanceDamageTypeMechanicsAreSupported(effect.damageType),
  );
}

function hasPassiveSpeedBonusMechanics(unit: AuthoredUnitSource): boolean {
  if (unit.kind !== "class_feature" || unit.mechanics.family !== "passive") {
    return false;
  }
  const [effect] = unit.mechanics.grants;
  return (
    effect?.kind === "modify_speed" ||
    unit.mechanics.condition?.kind === "not_wearing_armor"
  );
}

function hasPassiveSpeedKindGrantsMechanics(unit: AuthoredUnitSource): boolean {
  if (unit.kind !== "class_feature") {
    return false;
  }
  if (unit.mechanics.family === "passive") {
    return unit.mechanics.grants.some(
      (effect) => effect.kind === "grant_speed",
    );
  }
  if (unit.mechanics.family !== "composite") {
    return false;
  }
  return unit.mechanics.parts.some(
    (part) =>
      part.family === "passive" &&
      part.grants.some((effect) => effect.kind === "grant_speed"),
  );
}

function hasWeaponDamageDiceRollChoiceMechanics(
  unit: AuthoredUnitSource,
): boolean {
  return (
    unit.kind === "feat" &&
    unit.mechanics.family === "on_hit_trigger" &&
    unit.mechanics.effect.kind === "reroll_weapon_damage_dice"
  );
}

function hasAttackDamageDieFloorMechanics(unit: AuthoredUnitSource): boolean {
  return unit.kind === "feat" && unit.mechanics.family === "damage_die_floor";
}

function hasLightExtraAttackDamageAbilityModifierMechanics(
  unit: AuthoredUnitSource,
): boolean {
  return (
    unit.kind === "feat" &&
    unit.mechanics.family === "light_extra_attack_damage_ability_modifier"
  );
}

function hasMartialArtsAttackProjectionMechanics(
  unit: AuthoredUnitSource,
): boolean {
  return (
    unit.kind === "class_feature" &&
    unit.className === "monk" &&
    unit.mechanics.family === "passive" &&
    unit.mechanics.grants.some(
      (effect) =>
        effect.kind === "replace_damage_die" ||
        effect.kind === "substitute_ability_for_rolls",
    )
  );
}

function hasAttackActionAttackCountScalingMechanics(
  unit: AuthoredUnitSource,
): boolean {
  if (unit.kind !== "class_feature" || unit.mechanics.family !== "passive") {
    return false;
  }
  return unit.mechanics.grants.some(
    (effect) => effect.kind === "scale_attack_count",
  );
}

function hasZeroHitPointReplacementMechanics(
  unit: AuthoredUnitSource,
): boolean {
  return (
    unit.kind === "species_trait" &&
    unit.mechanics.family === "triggered_replacement"
  );
}

function hasBonusActionDashTemporaryHitPointsMechanics(
  unit: AuthoredUnitSource,
): boolean {
  if (unit.kind !== "species_trait" || unit.mechanics.family !== "activation") {
    return false;
  }
  const mechanics = unit.mechanics;
  const [phase] = mechanics.phases;
  if (phase?.kind !== "direct" || phase.attachment.kind !== "self") {
    return false;
  }
  return (
    (mechanics.activationCost.kind === "standard_action" ||
      mechanics.activationCost.kind === "bonus_action") &&
    mechanics.activationCost.action === "dash" &&
    (phase.effects ?? []).some((effect) => effect.kind === "grant_temp_hp")
  );
}

function hasFailedAbilityCheckResourceBoostMechanics(
  unit: AuthoredUnitSource,
): boolean {
  return (
    unit.kind === "class_feature" &&
    unit.mechanics.family === "failed_ability_check_resource_boost"
  );
}

function hasSpellSlotHealingModifierMechanics(
  unit: AuthoredUnitSource,
): boolean {
  return (
    unit.kind === "class_feature" &&
    unit.mechanics.family === "spell_slot_healing_modifier"
  );
}

function hasMagicActionHealingPoolMechanics(unit: AuthoredUnitSource): boolean {
  return (
    unit.kind === "class_feature" &&
    unit.mechanics.family === "magic_action_healing_pool"
  );
}

function hasMagicActionAreaSaveDamageHealingMechanics(
  unit: AuthoredUnitSource,
): boolean {
  return (
    unit.kind === "class_feature" &&
    unit.mechanics.family === "magic_action_area_save_damage_healing"
  );
}

function hasMagicActionSaveGatedConditionMechanics(
  unit: AuthoredUnitSource,
): boolean {
  return (
    unit.kind === "class_feature" && unit.mechanics.family === "abjure_foes"
  );
}

function hasEnemyZeroHitPointTemporaryHitPointsMechanics(
  unit: AuthoredUnitSource,
): boolean {
  return (
    unit.kind === "class_feature" &&
    unit.mechanics.family === "enemy_zero_hit_point_temporary_hit_points"
  );
}

export function zeroHitPointReplacementProfileForUnit(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "zeroHitPointReplacement" }
> | null {
  const profile = zeroHitPointReplacementUnitProfile(unit);
  if (profile === null) return null;
  return {
    kind: "zeroHitPointReplacement",
    unit: profile.unit,
    optional: profile.optional,
    trigger: profile.trigger,
    replacementHp: profile.replacementHp,
    resetCadence: profile.resetCadence,
  };
}

export function bonusActionDashTemporaryHitPointsProfileForUnit(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "bonusActionDashTemporaryHitPoints" }
> | null {
  if (unit.kind !== "species_trait" || unit.mechanics.family !== "activation") {
    return null;
  }
  const mechanics = unit.mechanics;
  const [phase, ...extraPhases] = mechanics.phases;
  if (
    mechanics.activationCost.kind !== "bonus_action" ||
    mechanics.activationCost.action !== "dash" ||
    mechanics.resource?.kind !== "use_count" ||
    mechanics.resource.cap.kind !== "proficiency_bonus" ||
    mechanics.resetCadence?.kind !== "short_or_long_rest" ||
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "self" ||
    extraPhases.length > 0
  ) {
    return null;
  }
  const [effect, ...extraEffects] = phase.effects ?? [];
  if (
    effect?.kind !== "grant_temp_hp" ||
    effect.amount.kind !== "proficiency_bonus" ||
    extraEffects.length > 0
  ) {
    return null;
  }
  return {
    kind: "bonusActionDashTemporaryHitPoints",
    unit,
    dashTemporaryHitPoints: {
      activationCost: { kind: "bonusAction", action: "dash" },
      temporaryHitPoints: { amount: { kind: "proficiencyBonus" } },
      resource: {
        cap: { kind: "proficiencyBonus" },
        resetCadence: "shortOrLongRest",
      },
    },
  };
}

export function failedAbilityCheckResourceBoostProfileForUnit(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "failedAbilityCheckResourceBoost" }
> | null {
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "failed_ability_check_resource_boost"
  ) {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.trigger.kind !== "failed_ability_check" ||
    mechanics.bonus.kind !== "dice" ||
    mechanics.bonus.expr.dice !== 1 ||
    mechanics.bonus.expr.dieSize !== 10 ||
    mechanics.refundSpendOnStillFailed !== true
  ) {
    return null;
  }
  return {
    kind: "failedAbilityCheckResourceBoost",
    unit,
    abilityCheck: {
      trigger: "failedAbilityCheck",
      bonus: { dice: 1, dieSize: 10 },
      spends: { resourceUnitId: mechanics.spends.resourceUnitId },
      refundSpendOnStillFailed: true,
    },
  };
}

export function failedSavingThrowRerollProfileForUnit(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "failedSavingThrowReroll" }
> | null {
  return Match.value(admitFailedSavingThrowRerollProcedure(unit)).pipe(
    Match.when({ tag: "notBattleOwned" }, () => null),
    Match.when({ tag: "rejected" }, () => null),
    Match.when({ tag: "admitted" }, ({ procedure }) => ({
      ...procedure.facts,
      unit,
    })),
    Match.exhaustive,
  );
}

export function spellSlotHealingModifierProfileForUnit(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "spellSlotHealingModifier" }
> | null {
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "spell_slot_healing_modifier"
  ) {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.trigger.kind !== "caster_spell_slot_restores_hit_points" ||
    mechanics.trigger.timing !== "turn_spell_is_cast" ||
    mechanics.appliesTo !== "each_creature_healed_by_spell" ||
    mechanics.bonus.kind !== "flat_plus_spell_slot_level" ||
    mechanics.bonus.flat !== 2
  ) {
    return null;
  }
  return {
    kind: "spellSlotHealingModifier",
    unit,
    healingModifier: {
      trigger: {
        kind: "casterSpellSlotRestoresHitPoints",
        timing: "turnSpellIsCast",
      },
      appliesTo: "eachCreatureHealedBySpell",
      bonus: { kind: "flatPlusSpellSlotLevel", flat: 2 },
    },
  };
}

export function magicActionHealingPoolProfileForUnit(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "magicActionHealingPool" }
> | null {
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "magic_action_healing_pool"
  ) {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.activationCost.kind !== "standard_action" ||
    mechanics.activationCost.action !== "magic" ||
    // authored-id-dispatch-allow: battle-runtime-unit-feature-support-profile-boundary
    mechanics.spends.resourceUnitId !==
      CLERIC_CHANNEL_DIVINITY_RESOURCE_UNIT_ID ||
    mechanics.spends.amount !== 1 ||
    mechanics.range.kind !== "point" ||
    mechanics.range.feet !== 30 ||
    mechanics.targetSelection.mode !== "any_number" ||
    !sameStringSet(mechanics.targetSelection.targetKinds, ["creature"]) ||
    !sameStringSet(mechanics.targetSelection.stateFilter, ["bloodied"]) ||
    mechanics.targetSelection.includesSelf !== true ||
    mechanics.pool.kind !== "class_level_multiplier" ||
    mechanics.pool.multiplier !== 5 ||
    mechanics.perTargetCap !== "half_hit_point_maximum"
  ) {
    return null;
  }
  return {
    kind: "magicActionHealingPool",
    unit,
    className: unit.className,
    healingPool: {
      activationCost: { kind: "standardAction", action: "magic" },
      spends: {
        resourceUnitId: mechanics.spends.resourceUnitId,
        amount: 1,
      },
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
  };
}

export function magicActionAreaSaveDamageHealingProfileForUnit(
  unit: AuthoredUnitSource,
  classLevels?: readonly CharacterBattleClassLevel[],
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "magicActionAreaSaveDamageHealing" }
> | null {
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "magic_action_area_save_damage_healing"
  ) {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.activationCost.kind !== "standard_action" ||
    mechanics.activationCost.action !== "magic" ||
    // authored-id-dispatch-allow: battle-runtime-unit-feature-support-profile-boundary
    mechanics.spends.resourceUnitId !== DRUID_WILD_SHAPE_RESOURCE_UNIT_ID ||
    mechanics.spends.amount !== 1 ||
    mechanics.area.origin.kind !== "point_within_range" ||
    mechanics.area.origin.rangeFeet !== 60 ||
    mechanics.area.shape.kind !== "sphere" ||
    mechanics.area.shape.radiusFeet !== 10 ||
    mechanics.save.ability !== "con" ||
    mechanics.save.dc.kind !== "class_spellcasting_spell_save_dc" ||
    mechanics.damage.targetSelection.mode !==
      "creatures_of_your_choice_in_area" ||
    !landsAidScalingAmountMatches(mechanics.damage.amount) ||
    mechanics.damage.damageType !== "necrotic" ||
    mechanics.damage.onSuccess !== "half_damage" ||
    mechanics.healing.targetSelection.mode !==
      "one_creature_of_your_choice_in_area" ||
    !landsAidScalingAmountMatches(mechanics.healing.amount)
  ) {
    return null;
  }
  const druidLevel =
    classLevels === undefined
      ? classLevel(unit.acquiredAtLevel)
      : findCharacterClassLevel(classLevels, unit.className);
  if (druidLevel === undefined) {
    return null;
  }
  if (druidLevel < unit.acquiredAtLevel) {
    return null;
  }
  const amount = landsAidFixedAmountProfile(druidLevel);
  return {
    kind: "magicActionAreaSaveDamageHealing",
    unit,
    damageHealing: {
      activationCost: { kind: "standardAction", action: "magic" },
      spends: {
        resourceUnitId: mechanics.spends.resourceUnitId,
        amount: 1,
      },
      area: {
        origin: { kind: "pointWithinRange", rangeFeet: movementFeet(60) },
        shape: { kind: "sphere", radiusFeet: movementFeet(10) },
      },
      save: { ability: "con", dc: "classSpellcastingSpellSaveDc" },
      damage: {
        targetSelection: "creaturesOfYourChoiceInArea",
        amount,
        damageType: "necrotic",
        onSuccess: "halfDamage",
      },
      healing: {
        targetSelection: "oneCreatureOfYourChoiceInArea",
        amount,
      },
    },
  };
}

export function magicActionSaveGatedConditionProfileForUnit(
  unit: AuthoredUnitSource,
  classLevels?: readonly CharacterBattleClassLevel[],
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "magicActionSaveGatedCondition" }
> | null {
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "abjure_foes"
  ) {
    return null;
  }
  const mechanics = unit.mechanics;
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration({
    unit: mechanics.onFail.duration.unit,
    amount: mechanics.onFail.duration.amount,
  });
  if (
    mechanics.activationCost.kind !== "standard_action" ||
    mechanics.activationCost.action !== "magic" ||
    mechanics.spends.amount !== 1 ||
    mechanics.targetSelection.kind !== "visible_creatures_within_range" ||
    mechanics.targetSelection.rangeFeet !== 60 ||
    mechanics.targetSelection.count.kind !== "ability_modifier" ||
    mechanics.targetSelection.count.ability !== "cha" ||
    mechanics.targetSelection.count.minimum !== 1 ||
    mechanics.save.ability !== "wis" ||
    mechanics.save.dc.kind !== "class_spellcasting_spell_save_dc" ||
    mechanics.onFail.kind !== "apply_condition" ||
    mechanics.onFail.condition !== "frightened" ||
    mechanics.onFail.duration.unit !== "minute" ||
    mechanics.onFail.duration.amount !== 1 ||
    !sameStringSet(mechanics.onFail.duration.endsOn, [
      "target_takes_any_damage",
    ]) ||
    mechanics.onFail.turnRestriction.kind !== "choose_only_one" ||
    !sameStringSet(mechanics.onFail.turnRestriction.options, [
      "move",
      "action",
      "bonus_action",
    ]) ||
    Result.isFailure(durationTicks)
  ) {
    return null;
  }
  const paladinLevel =
    classLevels === undefined
      ? classLevel(unit.acquiredAtLevel)
      : findCharacterClassLevel(classLevels, unit.className);
  if (paladinLevel === undefined || paladinLevel < unit.acquiredAtLevel) {
    return null;
  }
  return {
    kind: "magicActionSaveGatedCondition",
    unit,
    condition: {
      activationCost: { kind: "standardAction", action: "magic" },
      spends: {
        resourceUnitId: mechanics.spends.resourceUnitId,
        amount: 1,
      },
      targetSelection: {
        kind: "visibleCreaturesWithinRange",
        rangeFeet: movementFeet(60),
        count: {
          kind: "abilityModifier",
          ability: "cha",
          minimum: 1,
        },
      },
      save: { ability: "wis", dc: "classSpellcastingSpellSaveDc" },
      onFail: {
        condition: "frightened",
        durationTicks: durationTicks.success,
        earlyEnd: "targetTakesAnyDamage",
        turnRestriction: "moveActionOrBonusAction",
      },
    },
  };
}

export function battleMagicActionSaveGatedConditionSupportForUnit(
  unit: AuthoredUnitSource,
  classLevels?: readonly CharacterBattleClassLevel[],
): BattleMagicActionSaveGatedConditionSupport {
  const profile = magicActionSaveGatedConditionProfileForUnit(
    unit,
    classLevels,
  );
  if (profile !== null) {
    return {
      kind: MAGIC_ACTION_SAVE_GATED_CONDITION_SUPPORT_PROFILE,
      condition: profile.condition,
    };
  }
  return hasMagicActionSaveGatedConditionMechanics(unit) ? "unsupported" : null;
}

export function enemyZeroHitPointTemporaryHitPointsProfileForUnit(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "enemyZeroHitPointTemporaryHitPoints" }
> | null {
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "enemy_zero_hit_point_temporary_hit_points"
  ) {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.trigger.kind !== "enemy_reduced_to_zero_hit_points" ||
    mechanics.trigger.bySelf !== true ||
    mechanics.trigger.byOtherWithinFeet !== 10 ||
    mechanics.amount.kind !== "ability_modifier_plus_class_level" ||
    mechanics.amount.ability !== "cha" ||
    mechanics.amount.minimum !== 1
  ) {
    return null;
  }
  return {
    kind: "enemyZeroHitPointTemporaryHitPoints",
    unit,
    className: unit.className,
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
  };
}

function landsAidFixedAmountProfile(
  druidLevel: ClassLevel,
): FixedD6AmountProfile {
  return {
    kind: "fixed",
    expr: { dice: landsAidDiceAtDruidLevel(druidLevel), dieSize: 6 },
  };
}

function landsAidScalingAmountMatches(amount: DiceAmount): boolean {
  return (
    amount.kind === "threshold_tiers" &&
    amount.axis === "class" &&
    amount.base.dice === 2 &&
    amount.base.dieSize === 6 &&
    amount.base.flat === undefined &&
    amount.base.spellcastingMod === undefined &&
    amount.base.abilityModifier === undefined &&
    sameDiceExprDeltaTiers(amount.tiers, [
      { atLevel: 10, override: { dice: 3 } },
      { atLevel: 14, override: { dice: 4 } },
    ])
  );
}

function landsAidDiceAtDruidLevel(druidLevel: ClassLevel): 2 | 3 | 4 {
  if (Number(druidLevel) >= 14) return 4;
  if (Number(druidLevel) >= 10) return 3;
  return 2;
}

function sameDiceExprDeltaTiers(
  actual: readonly {
    readonly atLevel: number;
    readonly override: Partial<DiceExpr>;
  }[],
  expected: readonly {
    readonly atLevel: number;
    readonly override: Partial<DiceExpr>;
  }[],
): boolean {
  return (
    actual.length === expected.length &&
    actual.every((tier, index) => {
      const expectedTier = expected[index];
      return (
        expectedTier !== undefined &&
        tier.atLevel === expectedTier.atLevel &&
        sameDiceExprDelta(tier.override, expectedTier.override)
      );
    })
  );
}

function sameDiceExprDelta(
  actual: Partial<DiceExpr>,
  expected: Partial<DiceExpr>,
): boolean {
  return (
    actual.dice === expected.dice &&
    actual.dieSize === expected.dieSize &&
    actual.flat === expected.flat &&
    actual.spellcastingMod === expected.spellcastingMod &&
    actual.abilityModifier === expected.abilityModifier
  );
}

export function attackActionAttackCountScalingProfileForUnit(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "attackActionAttackCountScaling" }
> | null {
  if (unit.kind !== "class_feature" || unit.mechanics.family !== "passive") {
    return null;
  }
  const [effect, ...extraEffects] = unit.mechanics.grants;
  if (
    effect?.kind !== "scale_attack_count" ||
    !isBattleAttackActionAdditionalAttacks(effect.additional) ||
    extraEffects.length > 0 ||
    unit.mechanics.condition !== undefined ||
    unit.mechanics.operations !== undefined ||
    unit.mechanics.suppressedBy !== undefined
  ) {
    return null;
  }
  return {
    kind: "attackActionAttackCountScaling",
    unit,
    additionalAttacks: effect.additional,
  };
}

function isBattleAttackActionAdditionalAttacks(
  additionalAttacks: number,
): additionalAttacks is BattleAttackActionAdditionalAttacks {
  return BATTLE_ATTACK_ACTION_ADDITIONAL_ATTACKS.some(
    (supported) => supported === additionalAttacks,
  );
}

export function passiveArmorClassBonusProfileForUnit(
  unit: AuthoredUnitSource,
): PassiveArmorClassBonusProfile | null {
  if (unit.kind !== "feat" || unit.mechanics.family !== "passive") {
    return null;
  }
  const [effect, ...extraEffects] = unit.mechanics.grants;
  if (
    effect?.kind !== "modify_ac" ||
    extraEffects.length > 0 ||
    unit.mechanics.condition?.kind !== "wearing_armor" ||
    !sameStringSet(unit.mechanics.condition.categories, [
      "light",
      "medium",
      "heavy",
    ])
  ) {
    return null;
  }
  const bonus = fixedDiceDeltaValue(effect.delta);
  return bonus === 1
    ? {
        bonus: 1,
        condition: {
          kind: "wearingArmor",
          categories: ["light", "medium", "heavy"],
        },
      }
    : null;
}

export function passiveRangedAttackRollBonusProfileForUnit(
  unit: AuthoredUnitSource,
): PassiveRangedAttackRollBonusProfile | null {
  if (unit.kind !== "feat" || unit.mechanics.family !== "passive") {
    return null;
  }
  const [effect, ...extraEffects] = unit.mechanics.grants;
  if (
    effect?.kind !== "modify_roll_numeric" ||
    extraEffects.length > 0 ||
    !sameStringSet(effect.on, ["attack_roll"]) ||
    effect.weaponFilter?.kind !== "weapon_category" ||
    effect.weaponFilter.category !== "ranged"
  ) {
    return null;
  }
  const bonus = fixedDiceDeltaValue(effect.delta);
  return bonus === 2
    ? {
        bonus: 2,
        weaponFilter: {
          kind: "weaponCategory",
          category: "ranged",
        },
      }
    : null;
}

export function initiativeProficiencyAndSwapProfileForUnit(
  unit: AuthoredUnitSource,
): InitiativeProficiencyAndSwapProfile | null {
  if (unit.kind !== "feat" || unit.mechanics.family !== "passive") {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.condition !== undefined ||
    mechanics.suppressedBy !== undefined ||
    mechanics.operations !== undefined
  ) {
    return null;
  }
  const [left, right, ...extraEffects] = mechanics.grants;
  if (left === undefined || right === undefined || extraEffects.length > 0) {
    return null;
  }
  const initiativeBonus =
    left.kind === "modify_roll_numeric"
      ? left
      : right.kind === "modify_roll_numeric"
        ? right
        : null;
  const swap =
    left.kind === "initiative_swap"
      ? left
      : right.kind === "initiative_swap"
        ? right
        : null;

  if (
    initiativeBonus === null ||
    swap === null ||
    !sameStringSet(initiativeBonus.on, ["initiative"]) ||
    initiativeBonus.delta.kind !== "proficiency_bonus" ||
    initiativeBonus.delta.sign !== "+" ||
    initiativeBonus.weaponFilter !== undefined ||
    initiativeBonus.abilityFilter !== undefined ||
    initiativeBonus.skillFilter !== undefined ||
    initiativeBonus.count !== undefined ||
    swap.timing !== "immediately_after_initiative_roll" ||
    swap.ally !== "willing_ally_same_combat" ||
    swap.prohibitedByCondition !== "incapacitated"
  ) {
    return null;
  }
  return {
    initiativeRollBonus: {
      amount: { kind: "proficiencyBonus" },
    },
    swap: {
      timing: "immediatelyAfterInitiativeRoll",
      ally: "willingAllySameCombat",
      prohibitedByCondition: "incapacitated",
    },
  };
}

export function attackRollMissToHitReplacementProfileForUnit(
  unit: AuthoredUnitSource,
): AttackRollMissToHitReplacementProfile | null {
  if (
    unit.kind !== "feat" ||
    unit.mechanics.family !== "triggered_replacement"
  ) {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.trigger.kind !== "miss_with_attack_roll" ||
    mechanics.effect.kind !== "replace_miss_with_hit" ||
    mechanics.optional !== true ||
    mechanics.resetCadence.kind !== "start_of_next_turn"
  ) {
    return null;
  }
  return {
    optional: true,
    trigger: "missWithAttackRoll",
    effect: "replaceMissWithHit",
    resetCadence: "startOfNextTurn",
  };
}

export function attackActionAreaSaveDamageReplacementProfileForUnit(input: {
  readonly unit: AuthoredUnitSource;
  readonly draconicAncestryDamageType: DraconicAncestryDamageType;
}): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "attackActionAreaSaveDamageReplacement" }
> | null {
  const { unit } = input;
  if (unit.kind !== "species_trait" || unit.mechanics.family !== "activation") {
    return null;
  }
  const mechanics = unit.mechanics;
  const resource = mechanics.resource;
  const resetCadence = mechanics.resetCadence;
  const [phase, ...extraPhases] = mechanics.phases;
  if (
    mechanics.activationCost.kind !== "replace_attack" ||
    resource?.kind !== "use_count" ||
    resource.cap.kind !== "proficiency_bonus" ||
    resetCadence?.kind !== "long_rest" ||
    phase?.kind !== "save_gate" ||
    extraPhases.length !== 0 ||
    phase.attachment.kind !== "area" ||
    phase.attachment.origin.kind !== "self" ||
    phase.ability !== "dex" ||
    phase.dc.kind !== "innate_dc" ||
    phase.dc.base !== 8 ||
    phase.dc.ability !== "con" ||
    phase.onFail.kind !== "damage" ||
    phase.onSuccess.kind !== "half_damage"
  ) {
    return null;
  }
  const shapeChoice = breathWeaponShapeChoice(phase.attachment.shape);
  const amount = breathWeaponDamageAmount(phase.onFail.amount);
  const damageType = draconicAncestryDamageTypeRef(
    phase.onFail.damageType,
    input.draconicAncestryDamageType,
  );
  if (shapeChoice === null || amount === null || damageType === null) {
    return null;
  }
  return {
    kind: "attackActionAreaSaveDamageReplacement",
    unit,
    breath: {
      activationCost: { kind: "replaceAttack" },
      resource: {
        cap: { kind: "proficiencyBonus" },
        resetCadence: "longRest",
      },
      area: {
        origin: { kind: "self" },
        shapeChoice,
      },
      save: {
        ability: "dex",
        dc: { kind: "innate", base: 8, ability: "con" },
      },
      damage: {
        damageType,
        amount,
        onSuccess: "halfDamage",
      },
    },
  };
}

function breathWeaponShapeChoice(
  shape: AreaShapeSpec,
): AttackActionAreaSaveDamageReplacementProfile["area"]["shapeChoice"] | null {
  if (shape.kind !== "choice" || shape.options.length !== 2) return null;
  const cone = shape.options.find(
    (option) => option.kind === "cone" && option.lengthFeet === 15,
  );
  const line = shape.options.find(
    (option) =>
      option.kind === "line" &&
      option.lengthFeet === 30 &&
      option.widthFeet === 5,
  );
  if (cone === undefined || line === undefined) {
    return null;
  }
  if (
    shape.options.some(
      (option) =>
        (option.kind !== "cone" && option.kind !== "line") ||
        (option.kind === "cone" && option !== cone) ||
        (option.kind === "line" && option !== line),
    )
  ) {
    return null;
  }
  return [
    { kind: "cone", lengthFeet: movementFeet(15) },
    { kind: "line", lengthFeet: movementFeet(30), widthFeet: movementFeet(5) },
  ];
}

function breathWeaponDamageAmount(
  amount: DiceAmount,
): AttackActionAreaSaveDamageReplacementProfile["damage"]["amount"] | null {
  if (amount.kind !== "threshold_tiers") return null;
  const [level5, level11, level17, ...extraTiers] = amount.tiers;
  if (
    amount.axis !== "character" ||
    amount.base.dice !== 1 ||
    amount.base.dieSize !== 10 ||
    level5?.atLevel !== 5 ||
    level5.override.dice !== 2 ||
    level11?.atLevel !== 11 ||
    level11.override.dice !== 3 ||
    level17?.atLevel !== 17 ||
    level17.override.dice !== 4 ||
    extraTiers.length !== 0
  ) {
    return null;
  }
  return {
    kind: "characterLevelDice",
    base: { dice: 1, dieSize: 10 },
    tiers: [
      { atLevel: 5, dice: 2 },
      { atLevel: 11, dice: 3 },
      { atLevel: 17, dice: 4 },
    ],
  };
}

type DamageEffectAtom = Extract<EffectAtom, { readonly kind: "damage" }>;
const DRACONIC_ANCESTRY_RESOURCE_SHAPE_WITNESS_DAMAGE_TYPE =
  "fire" satisfies DraconicAncestryDamageType;

export function unitHasAttackActionAreaSaveDamageReplacementResourceShape(
  unit: AuthoredUnitSource,
): boolean {
  return (
    attackActionAreaSaveDamageReplacementProfileForUnit({
      unit,
      draconicAncestryDamageType:
        DRACONIC_ANCESTRY_RESOURCE_SHAPE_WITNESS_DAMAGE_TYPE,
    }) !== null
  );
}

function draconicAncestryDamageTypeRef(
  damageType: DamageEffectAtom["damageType"],
  selectedDamageType: DraconicAncestryDamageType,
): AttackActionAreaSaveDamageReplacementProfile["damage"]["damageType"] | null {
  if (
    typeof damageType !== "object" ||
    damageType === null ||
    damageType.kind !== "same_choice_as" ||
    damageType.holeId !== DRACONIC_ANCESTRY_DAMAGE_TYPE_HOLE_ID
  ) {
    return null;
  }
  return {
    kind: "draconicAncestry",
    holeId: DRACONIC_ANCESTRY_DAMAGE_TYPE_HOLE_ID,
    value: selectedDamageType,
  };
}

type GrantResistanceEffectAtom = Extract<
  EffectAtom,
  { readonly kind: "grant_resistance" }
>;

function draconicAncestryResistanceDamageTypeRef(
  damageType: GrantResistanceEffectAtom["damageType"],
  selectedDamageType: DraconicAncestryDamageType | undefined,
): PassiveDamageResistanceProfile["damageType"] | null {
  if (
    typeof damageType !== "object" ||
    damageType === null ||
    damageType.kind !== "same_choice_as" ||
    damageType.holeId !== DRACONIC_ANCESTRY_DAMAGE_TYPE_HOLE_ID
  ) {
    return null;
  }
  if (selectedDamageType === undefined) {
    return null;
  }
  return {
    kind: "draconicAncestry",
    holeId: DRACONIC_ANCESTRY_DAMAGE_TYPE_HOLE_ID,
    value: selectedDamageType,
  };
}

function fixedResistanceDamageTypeRef(
  damageType: GrantResistanceEffectAtom["damageType"],
): PassiveDamageResistanceProfile["damageType"] | null {
  return typeof damageType === "string" && isDamageType(damageType)
    ? { kind: "fixed", value: damageType }
    : null;
}

function isDamageType(value: string): value is DamageType {
  return DAMAGE_TYPE_VALUES.has(value);
}

function passiveResistanceDamageTypeRef(
  damageType: GrantResistanceEffectAtom["damageType"],
  selectedDamageType: DraconicAncestryDamageType | undefined,
): PassiveDamageResistanceProfile["damageType"] | null {
  return (
    fixedResistanceDamageTypeRef(damageType) ??
    draconicAncestryResistanceDamageTypeRef(damageType, selectedDamageType)
  );
}

function passiveResistanceDamageTypeMechanicsAreSupported(
  damageType: GrantResistanceEffectAtom["damageType"],
): boolean {
  return (
    fixedResistanceDamageTypeRef(damageType) !== null ||
    draconicAncestryResistanceDamageTypeMechanicsAreSupported(damageType)
  );
}

function draconicAncestryResistanceDamageTypeMechanicsAreSupported(
  damageType: GrantResistanceEffectAtom["damageType"],
): boolean {
  return (
    typeof damageType === "object" &&
    damageType !== null &&
    damageType.kind === "same_choice_as" &&
    damageType.holeId === DRACONIC_ANCESTRY_DAMAGE_TYPE_HOLE_ID
  );
}

export function passiveDamageResistanceProfileForUnit(input: {
  readonly unit: AuthoredUnitSource;
  readonly draconicAncestryDamageType?: DraconicAncestryDamageType | undefined;
}): PassiveDamageResistanceProfile | null {
  const { unit } = input;
  if (unit.kind !== "species_trait" || unit.mechanics.family !== "passive") {
    return null;
  }
  const resistanceGrants = unit.mechanics.grants.filter(
    (effect): effect is GrantResistanceEffectAtom =>
      effect.kind === "grant_resistance",
  );
  if (resistanceGrants.length !== 1) {
    return null;
  }
  const [grant] = resistanceGrants;
  if ("sourceFilter" in grant && grant.sourceFilter !== undefined) {
    return null;
  }
  const damageType = passiveResistanceDamageTypeRef(
    grant.damageType,
    input.draconicAncestryDamageType,
  );
  return damageType === null ? null : { damageType };
}

export function passiveSavingThrowRollModeProfileForUnit(
  unit: AuthoredUnitSource,
): PassiveSavingThrowRollModeProfile | null {
  if (
    (unit.kind !== "class_feature" && unit.kind !== "species_trait") ||
    unit.mechanics.family !== "passive"
  ) {
    return null;
  }
  const rollModeEffects = unit.mechanics.grants.filter(isRollModeAdvantage);
  const [effect] = rollModeEffects;
  const [suppressor, ...extraSuppressors] = unit.mechanics.suppressedBy ?? [];
  const saveAbilityFilter =
    effect?.saveAbilityFilter === undefined ||
    Array.isArray(effect.saveAbilityFilter)
      ? (effect?.saveAbilityFilter ?? [])
      : null;
  if (
    effect === undefined ||
    rollModeEffects.length !== 1 ||
    effect.mode !== "advantage" ||
    !sameStringSet(effect.on, ["saving_throw"]) ||
    effect.affects !== undefined ||
    effect.spellSourceFilter !== undefined ||
    effect.attackerTypeFilter !== undefined ||
    effect.skillFilter !== undefined ||
    effect.abilityCheckTrigger !== undefined ||
    effect.abilityFilter !== undefined ||
    effect.saveSourceFilter !== undefined ||
    effect.contextRangeFeet !== undefined ||
    effect.count !== undefined ||
    effect.expiresOn !== undefined ||
    unit.mechanics.condition !== undefined ||
    unit.mechanics.operations !== undefined
  ) {
    return null;
  }
  if (
    unit.kind === "class_feature" &&
    saveAbilityFilter !== null &&
    sameStringSet(saveAbilityFilter, ["dex"]) &&
    effect.conditionFilter === undefined &&
    suppressor?.kind === "condition_active" &&
    sameStringSet(suppressor.conditions, ["incapacitated"]) &&
    extraSuppressors.length === 0
  ) {
    return {
      mode: "advantage",
      scope: {
        kind: "savingThrowAbility",
        ability: "dex",
        suppressedByCondition: "incapacitated",
      },
    };
  }
  if (
    unit.kind === "species_trait" &&
    saveAbilityFilter !== null &&
    sameStringSet(saveAbilityFilter, []) &&
    suppressor === undefined &&
    extraSuppressors.length === 0
  ) {
    const condition = passiveConditionSavingThrowRollModeCondition(
      effect.conditionFilter,
    );
    return condition === null
      ? null
      : {
          mode: "advantage",
          scope: {
            kind: "condition",
            condition,
          },
        };
  }
  return null;
}

function passiveConditionSavingThrowRollModeCondition(
  conditionFilter: readonly string[] | undefined,
): PassiveConditionSavingThrowRollModeCondition | null {
  const [condition, ...extraConditions] = conditionFilter ?? [];
  if (
    condition === undefined ||
    extraConditions.length !== 0 ||
    !isPassiveConditionSavingThrowRollModeCondition(condition)
  ) {
    return null;
  }
  return condition;
}

function isPassiveConditionSavingThrowRollModeCondition(
  condition: string,
): condition is PassiveConditionSavingThrowRollModeCondition {
  return PASSIVE_CONDITION_SAVING_THROW_ROLL_MODE_CONDITIONS.some(
    (supportedCondition) => supportedCondition === condition,
  );
}

export function passiveAbilityCheckRollModeProfileForUnit(
  unit: AuthoredUnitSource,
): PassiveAbilityCheckRollModeProfile | null {
  if (unit.kind !== "species_trait" || unit.mechanics.family !== "passive") {
    return null;
  }
  const rollModeEffects = unit.mechanics.grants.filter(isRollModeAdvantage);
  const [effect] = rollModeEffects;
  if (
    effect === undefined ||
    rollModeEffects.length !== 1 ||
    effect.mode !== "advantage" ||
    !sameStringSet(effect.on, ["ability_check"]) ||
    effect.abilityCheckTrigger?.kind !== "condition_end" ||
    effect.abilityCheckTrigger.condition !== "grappled" ||
    effect.conditionFilter !== undefined ||
    effect.affects !== undefined ||
    effect.spellSourceFilter !== undefined ||
    effect.attackerTypeFilter !== undefined ||
    effect.skillFilter !== undefined ||
    effect.abilityFilter !== undefined ||
    effect.saveAbilityFilter !== undefined ||
    effect.saveSourceFilter !== undefined ||
    effect.contextRangeFeet !== undefined ||
    effect.count !== undefined ||
    effect.expiresOn !== undefined ||
    unit.mechanics.condition !== undefined ||
    unit.mechanics.operations !== undefined ||
    (unit.mechanics.suppressedBy ?? []).length !== 0
  ) {
    return null;
  }
  return {
    mode: "advantage",
    scope: {
      kind: "endingCondition",
      condition: "grappled",
    },
  };
}

function isRollModeAdvantage(
  effect: EffectAtom,
): effect is Extract<EffectAtom, { readonly kind: "modify_roll_advantage" }> {
  return effect.kind === "modify_roll_advantage";
}

export function passiveSpeedBonusProfileForUnit(
  unit: AuthoredUnitSource,
): PassiveSpeedBonusProfile | null {
  if (unit.kind !== "class_feature" || unit.mechanics.family !== "passive") {
    return null;
  }
  return passiveSpeedBonusProfileForPassiveMechanics(unit.mechanics);
}

export function passiveSpeedKindGrantsProfileForUnit(
  unit: AuthoredUnitSource,
): PassiveSpeedKindGrantsProfile | null {
  if (unit.kind !== "class_feature") {
    return null;
  }
  if (unit.mechanics.family === "passive") {
    const grants = passiveSpeedKindGrantsForPassiveMechanics(unit.mechanics);
    return grants === null ? null : { grants };
  }
  if (unit.mechanics.family !== "composite") {
    return null;
  }
  const [speedPart, kindGrantPart, ...extraParts] = unit.mechanics.parts;
  if (
    speedPart?.family !== "passive" ||
    kindGrantPart?.family !== "passive" ||
    extraParts.length > 0
  ) {
    return null;
  }
  const speed = passiveSpeedBonusProfileForPassiveMechanics(speedPart);
  const grants = passiveSpeedKindGrantsForPassiveMechanics(kindGrantPart);
  return speed === null || grants === null ? null : { speed, grants };
}

export function acrobaticMovementProfileForUnit(
  unit: AuthoredUnitSource,
): AcrobaticMovementProfile | null {
  const support = battleAcrobaticMovementSupportForUnit(unit);
  return support === null || support === "unsupported"
    ? null
    : support.acrobaticMovement;
}

export function creatureSpaceMovementPermissionProfileForUnit(
  unit: AuthoredUnitSource,
): CreatureSpaceMovementPermissionProfile | null {
  const support = battleCreatureSpaceMovementPermissionSupportForUnit(unit);
  return support === null || support === "unsupported"
    ? null
    : support.permission;
}

export function hideActionObscurementPermissionProfileForUnit(
  unit: AuthoredUnitSource,
): HideActionObscurementPermissionProfile | null {
  const support = battleHideActionObscurementPermissionSupportForUnit(unit);
  return support === null || support === "unsupported"
    ? null
    : support.permission;
}

function passiveSpeedBonusProfileForPassiveMechanics(
  mechanics: Extract<
    Extract<
      AuthoredUnitSource,
      { readonly kind: "class_feature" }
    >["mechanics"],
    { readonly family: "passive" }
  >,
): PassiveSpeedBonusProfile | null {
  const [effect, ...extraEffects] = mechanics.grants;
  const condition = passiveSpeedBonusConditionForEquipmentPredicate(
    mechanics.condition,
  );
  if (
    effect?.kind !== "modify_speed" ||
    effect.delta !== 10 ||
    effect.unit !== "feet" ||
    extraEffects.length > 0 ||
    condition === null ||
    mechanics.operations !== undefined ||
    mechanics.suppressedBy !== undefined
  ) {
    return null;
  }
  return {
    deltaFeet: movementDeltaFeet(effect.delta),
    condition,
  };
}

function passiveSpeedBonusConditionForEquipmentPredicate(
  condition: EquipmentPredicate | undefined,
): PassiveSpeedBonusCondition | null {
  if (
    condition?.kind === "not_wearing_armor" &&
    sameStringSet(condition.categories, ["heavy"])
  ) {
    return {
      kind: "notWearingArmor",
      categories: ["heavy"],
    };
  }
  if (condition?.kind !== "all_of" || condition.predicates.length !== 2) {
    return null;
  }
  const unarmored = condition.predicates.some(
    (predicate) =>
      predicate.kind === "not_wearing_armor" &&
      sameStringSet(predicate.categories, ARMOR_CATEGORIES),
  );
  const unshielded = condition.predicates.some(
    (predicate) => predicate.kind === "not_wielding_shield",
  );
  return unarmored && unshielded ? { kind: "unarmoredUnshielded" } : null;
}

function passiveSpeedKindGrantsForPassiveMechanics(
  mechanics: Extract<
    Extract<
      AuthoredUnitSource,
      { readonly kind: "class_feature" }
    >["mechanics"],
    { readonly family: "passive" }
  >,
): PassiveSpeedKindGrantsProfile["grants"] | null {
  if (
    mechanics.condition !== undefined ||
    mechanics.operations !== undefined ||
    mechanics.suppressedBy !== undefined
  ) {
    return null;
  }

  const grants: PassiveSpeedKindGrantProfile[] = [];
  for (const effect of mechanics.grants) {
    if (effect.kind === "offer_ability_substitution_for_jump_distance") {
      continue;
    }
    if (
      effect.kind !== "grant_speed" ||
      !isPassiveSpeedKindGrantKind(effect.speedKind) ||
      typeof effect.feet === "number" ||
      effect.feet.kind !== "walk_speed" ||
      effect.hover !== undefined
    ) {
      return null;
    }
    grants.push({ speedKind: effect.speedKind, feet: { kind: "walkSpeed" } });
  }

  const [firstGrant, ...remainingGrants] = grants;
  if (firstGrant === undefined) {
    return null;
  }
  return [firstGrant, ...remainingGrants];
}

function isPassiveSpeedKindGrantKind(
  speedKind: Extract<EffectAtom, { readonly kind: "grant_speed" }>["speedKind"],
): speedKind is PassiveSpeedKindGrantKind {
  return PASSIVE_SPEED_KIND_GRANT_KINDS.some((kind) => kind === speedKind);
}

export function weaponDamageDiceRollChoiceProfileForUnit(
  unit: AuthoredUnitSource,
): WeaponDamageDiceRollChoiceProfile | null {
  if (unit.kind !== "feat" || unit.mechanics.family !== "on_hit_trigger") {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.optional !== true ||
    mechanics.trigger.kind !== "weapon_hit" ||
    !("usageLimit" in mechanics) ||
    mechanics.usageLimit?.kind !== "once_per_turn" ||
    mechanics.effect.kind !== "reroll_weapon_damage_dice" ||
    mechanics.effect.diceScope !== "weapon_damage_dice" ||
    mechanics.effect.choose !== "either_roll"
  ) {
    return null;
  }
  return {
    optional: true,
    trigger: "weaponHit",
    usageLimit: "oncePerTurn",
    diceScope: "weaponDamageDice",
    choose: "eitherRoll",
  };
}

export function attackDamageDieFloorProfileForUnit(
  unit: AuthoredUnitSource,
): AttackDamageDieFloorProfile | null {
  if (unit.kind !== "feat" || unit.mechanics.family !== "damage_die_floor") {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.optional !== true ||
    mechanics.trigger.kind !== "attack_damage_roll" ||
    mechanics.trigger.attackWeapon.kind !==
      "melee_weapon_held_with_two_hands" ||
    mechanics.trigger.attackWeapon.propertyGate !== "two_handed_or_versatile" ||
    mechanics.effect.kind !== "floor_damage_die_results" ||
    mechanics.effect.dieScope !== "attack_damage_dice" ||
    mechanics.effect.minimumResult !== ATTACK_DAMAGE_DIE_FLOOR_MINIMUM_RESULT
  ) {
    return null;
  }
  return {
    optional: true,
    trigger: "attackDamageRoll",
    attackWeapon: {
      kind: "meleeWeaponHeldWithTwoHands",
      propertyGate: "twoHandedOrVersatile",
    },
    dieScope: "attackDamageDice",
    minimumResult: ATTACK_DAMAGE_DIE_FLOOR_MINIMUM_RESULT,
  };
}

export function lightExtraAttackDamageAbilityModifierProfileForUnit(
  unit: AuthoredUnitSource,
): LightExtraAttackDamageAbilityModifierProfile | null {
  if (
    unit.kind !== "feat" ||
    unit.mechanics.family !== "light_extra_attack_damage_ability_modifier"
  ) {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.optional !== true ||
    mechanics.trigger.kind !== "light_property_extra_attack_damage_roll" ||
    mechanics.trigger.attackWeapon.kind !== "weapon_with_light_property" ||
    mechanics.effect.kind !== "permit_attack_damage_ability_modifier" ||
    mechanics.effect.modifierSource !== "attack_ability_modifier" ||
    mechanics.effect.appliesWhen !== "not_already_adding_ability_modifier"
  ) {
    return null;
  }
  return {
    optional: true,
    trigger: "lightPropertyExtraAttackDamageRoll",
    attackWeapon: { kind: "weaponWithLightProperty" },
    modifierSource: "attackAbilityModifier",
    appliesWhen: "notAlreadyAddingAbilityModifier",
  };
}

export function martialArtsAttackProjectionProfileForUnit(
  unit: AuthoredUnitSource,
  classLevels: readonly CharacterBattleClassLevel[],
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "martialArtsAttackProjection" }
> | null {
  const martialArts = martialArtsAttackProjectionMechanicsForUnit(unit);
  if (unit.kind !== "class_feature" || martialArts === null) {
    return null;
  }
  const monkLevel = findCharacterClassLevel(classLevels, unit.className);
  if (monkLevel === undefined || monkLevel < unit.acquiredAtLevel) {
    return null;
  }
  return {
    kind: "martialArtsAttackProjection",
    unit,
    classLevel: monkLevel,
    martialArts: {
      ...martialArts,
      damageReplacement: {
        ...martialArts.damageReplacement,
        dieSize: martialArtsSrdDieSizeAtClassLevel(monkLevel),
      },
    },
  };
}

function martialArtsAttackProjectionMechanicsForUnit(
  unit: AuthoredUnitSource,
): MartialArtsAttackProjectionProfile | null {
  if (
    unit.kind !== "class_feature" ||
    unit.className !== "monk" ||
    unit.mechanics.family !== "passive"
  ) {
    return null;
  }

  const condition = unit.mechanics.condition;
  if (condition?.kind !== "all_of" || condition.predicates.length !== 3) {
    return null;
  }
  const unarmedOrMonkWeaponsOnly = condition.predicates.some(
    (predicate) => predicate.kind === "unarmed_or_monk_weapons_only",
  );
  const unarmored = condition.predicates.some(
    (predicate) =>
      predicate.kind === "not_wearing_armor" &&
      sameStringSet(predicate.categories, ARMOR_CATEGORIES),
  );
  const unshielded = condition.predicates.some(
    (predicate) => predicate.kind === "not_wielding_shield",
  );
  if (!unarmedOrMonkWeaponsOnly || !unarmored || !unshielded) {
    return null;
  }

  const damageReplacements = unit.mechanics.grants.filter(
    (grant) => grant.kind === "replace_damage_die",
  );
  const abilitySubstitutions = unit.mechanics.grants.filter(
    (grant) => grant.kind === "substitute_ability_for_rolls",
  );
  const bonusActionAttacks = unit.mechanics.grants.filter(
    (grant) => grant.kind === "grant_bonus_action_attack",
  );
  if (
    damageReplacements.length !== 1 ||
    abilitySubstitutions.length !== 1 ||
    bonusActionAttacks.length !== 1
  ) {
    return null;
  }
  const [damageReplacement] = damageReplacements;
  const [abilitySubstitution] = abilitySubstitutions;
  const [bonusActionAttack] = bonusActionAttacks;
  if (
    bonusActionAttack?.attack !== "unarmed_strike" ||
    damageReplacement?.scope !== "unarmed_or_monk_weapon" ||
    damageReplacement.die.kind !== "threshold_tiers" ||
    damageReplacement.die.axis !== "class" ||
    !isSrdMartialArtsDieTable(damageReplacement.die) ||
    abilitySubstitution?.scope !== "unarmed_or_monk_weapon" ||
    abilitySubstitution.use !== "dex" ||
    abilitySubstitution.replaces !== "str" ||
    !sameStringSet(abilitySubstitution.on, [
      "attack_roll",
      "damage_roll",
      "unarmed_strike_save_dc",
    ])
  ) {
    return null;
  }

  return {
    condition: {
      kind: "unarmoredUnshieldedOnlyMonkWeapons",
    },
    bonusActionAttack: {
      kind: "unarmedStrike",
    },
    damageReplacement: {
      scope: "unarmedOrMonkWeapon",
      dice: 1,
      dieSize: MARTIAL_ARTS_BASE_DIE_SIZE,
    },
    abilitySubstitution: {
      use: "dex",
      replaces: "str",
      on: ["attackRoll", "damageRoll", "unarmedStrikeSaveDc"],
    },
  };
}

function parseMartialArtsAttackProjectionUnitFeatureProfile(
  unit: AuthoredUnitSource,
  classLevels: readonly CharacterBattleClassLevel[],
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "martialArtsAttackProjection" }
> | null {
  return martialArtsAttackProjectionProfileForUnit(unit, classLevels);
}

function fixedDiceDeltaValue(delta: DiceDelta): number | null {
  if (delta.kind !== "fixed_dice") {
    return null;
  }
  const value = delta.dice * delta.dieSize;
  return delta.sign === "-" ? -value : value;
}

function reactionRollOrDamageReductionMechanicsProjection(
  unit: AuthoredUnitSource,
  classLevel: ClassLevel,
): ReadonlyNonEmptyArray<ReactionRollOrDamageReductionProfile> | null {
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "reaction_roll_or_damage_reduction"
  ) {
    return null;
  }
  const bardicInspirationReduction = bardicInspirationReactionReduction(
    unit,
    classLevel,
  );
  const modifiers = unit.mechanics.modifiers.flatMap(
    (modifier): readonly ReactionRollOrDamageReductionProfile[] => {
      if (
        modifier.kind === "attack_roll_reduction" &&
        modifier.trigger.kind === "creature_succeeds_attack_roll" &&
        modifier.trigger.rangeFeet === CUTTING_WORDS_REACTION_RANGE_FEET &&
        modifier.trigger.requiresVisibleCreature === true &&
        modifier.reduction.kind === "bardic_inspiration_die" &&
        bardicInspirationReduction !== null
      ) {
        return [
          {
            kind: "attackRollReduction",
            rangeFeet: movementFeet(modifier.trigger.rangeFeet),
            requiresVisibleCreature: true,
            reduction: bardicInspirationReduction,
          },
        ];
      }
      if (
        modifier.kind === "ability_check_reduction" &&
        modifier.trigger.kind === "creature_succeeds_ability_check" &&
        modifier.trigger.rangeFeet === CUTTING_WORDS_REACTION_RANGE_FEET &&
        modifier.trigger.requiresVisibleCreature === true &&
        modifier.reduction.kind === "bardic_inspiration_die" &&
        bardicInspirationReduction !== null
      ) {
        return [
          {
            kind: "abilityCheckReduction",
            rangeFeet: movementFeet(modifier.trigger.rangeFeet),
            requiresVisibleCreature: true,
            reduction: bardicInspirationReduction,
          },
        ];
      }
      if (
        modifier.kind === "damage_roll_reduction" &&
        modifier.trigger.kind === "creature_makes_damage_roll" &&
        modifier.trigger.rangeFeet === CUTTING_WORDS_REACTION_RANGE_FEET &&
        modifier.trigger.requiresVisibleCreature === true &&
        modifier.reduction.kind === "bardic_inspiration_die" &&
        bardicInspirationReduction !== null
      ) {
        return [
          {
            kind: "attackDamageRollReduction",
            rangeFeet: movementFeet(modifier.trigger.rangeFeet),
            requiresVisibleCreature: true,
            reduction: bardicInspirationReduction,
          },
        ];
      }
      if (
        modifier.kind === "attack_damage_reduction" &&
        modifier.trigger.kind === "hit_by_attack_roll" &&
        modifier.reduction.kind === "half_damage" &&
        modifier.reduction.rounding === "down"
      ) {
        return [
          {
            kind: "attackDamageReduction",
            ...(modifier.trigger.requiresVisibleAttacker === true
              ? { requiresVisibleAttacker: true as const }
              : {}),
            reduction: { kind: "halfDamage" },
          },
        ];
      }
      if (
        modifier.kind === "attack_damage_reduction" &&
        modifier.trigger.kind === "hit_by_attack_roll" &&
        modifier.reduction.kind ===
          "dice_plus_ability_modifier_plus_class_level" &&
        modifier.reduction.dice.dice === 1 &&
        modifier.reduction.dice.dieSize === 10 &&
        modifier.reduction.ability === "dex" &&
        "zeroDamageRedirect" in modifier
      ) {
        const zeroDamageRedirect =
          attackDamageReductionZeroDamageRedirectProjection(
            modifier.zeroDamageRedirect,
            MONK_FOCUS_RESOURCE_UNIT_ID,
            classLevel,
          );
        if (zeroDamageRedirect === null) return [];
        return [
          {
            kind: "attackDamageReduction",
            ...("damageIncludes" in modifier.trigger
              ? { damageIncludes: modifier.trigger.damageIncludes }
              : {}),
            reduction: {
              kind: "dicePlusAbilityModifierPlusClassLevel",
              dieSize: 10,
              ability: "dex",
            },
            zeroDamageRedirect,
          },
        ];
      }
      if (
        modifier.kind === "fall_damage_reduction" &&
        modifier.trigger.kind === "creature_falls" &&
        modifier.reduction.kind === "class_level_multiplier" &&
        modifier.reduction.multiplier === 5
      ) {
        return [
          {
            kind: "fallDamageReduction",
            reduction: {
              kind: "classLevelMultiplier",
              multiplier: 5,
            },
          },
        ];
      }
      return [];
    },
  );
  const first = modifiers[0];
  return first !== undefined &&
    modifiers.length === unit.mechanics.modifiers.length &&
    reactionRollOrDamageReductionKindsUnique(modifiers)
    ? [first, ...modifiers.slice(1)]
    : null;
}

function bardicInspirationReactionReduction(
  unit: AuthoredUnitSource,
  classLevel: ClassLevel,
): ReactionReductionResourceDie | null {
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "reaction_roll_or_damage_reduction" ||
    !("resource" in unit.mechanics) ||
    unit.mechanics.resource?.kind !== "use_count" ||
    unit.mechanics.resource.cap.kind !== "ability_modifier" ||
    unit.mechanics.resource.cap.ability !== "cha" ||
    !("resetCadence" in unit.mechanics) ||
    unit.mechanics.resetCadence.kind !== "long_rest"
  ) {
    return null;
  }
  return {
    kind: "resourceDie",
    dice: 1,
    dieSize: bardicInspirationSrdDieSizeAtClassLevel(classLevel),
    flatModifier: 0,
    spends: { resourceUnitId: unit.id, amount: 1 },
  };
}

function reactionRollOrDamageReductionKindsUnique(
  modifiers: readonly ReactionRollOrDamageReductionProfile[],
): boolean {
  return (
    new Set(modifiers.map((modifier) => modifier.kind)).size ===
    modifiers.length
  );
}

export function parseSupportedUnitFeatureProfile(
  unit: AuthoredUnitSource,
  classLevels: readonly CharacterBattleClassLevel[],
  sourceFacts?: BattleUnitSupportProfileSourceFacts,
): SupportedUnitFeatureProfile | null {
  return (
    parseExtraActionGrantUnitFeatureProfile(unit) ??
    parseSelfBonusActionHealingUnitFeatureProfile(unit, classLevels) ??
    parseOngoingFeatureUnitFeatureProfile(unit, classLevels) ??
    parseAttackDamageRiderUnitFeatureProfile(unit, classLevels) ??
    parseSaveDamageReplacementUnitFeatureProfile(unit, classLevels) ??
    parseReactionRollOrDamageReductionUnitFeatureProfile(unit, classLevels) ??
    parseRetaliationReactionAttackUnitFeatureProfile(unit) ??
    parsePassiveArmorClassBonusUnitFeatureProfile(unit) ??
    parsePassiveRangedAttackRollBonusUnitFeatureProfile(unit) ??
    parseInitiativeProficiencyAndSwapUnitFeatureProfile(unit) ??
    parseAttackRollMissToHitReplacementUnitFeatureProfile(unit) ??
    (sourceFacts?.draconicAncestryDamageType === undefined
      ? null
      : attackActionAreaSaveDamageReplacementProfileForUnit({
          unit,
          draconicAncestryDamageType: sourceFacts.draconicAncestryDamageType,
        })) ??
    d20TestNaturalOneRerollUnitFeatureProfile(unit) ??
    parsePassiveSavingThrowRollModeUnitFeatureProfile(unit) ??
    parsePassiveAbilityCheckRollModeUnitFeatureProfile(unit) ??
    parsePassiveSpeedBonusUnitFeatureProfile(unit) ??
    parsePassiveSpeedKindGrantsUnitFeatureProfile(unit) ??
    parseAcrobaticMovementUnitFeatureProfile(unit) ??
    parseCreatureSpaceMovementPermissionUnitFeatureProfile(unit) ??
    parseHideActionObscurementPermissionUnitFeatureProfile(unit) ??
    parseWeaponDamageDiceRollChoiceUnitFeatureProfile(unit) ??
    parseAttackDamageDieFloorUnitFeatureProfile(unit) ??
    parseLightExtraAttackDamageAbilityModifierUnitFeatureProfile(unit) ??
    parseMartialArtsAttackProjectionUnitFeatureProfile(unit, classLevels) ??
    parseBardicInspirationGrantUnitFeatureProfile(unit, classLevels) ??
    parseDruidWildShapeKnownFormUnitFeatureProfile(unit, classLevels) ??
    attackActionAttackCountScalingProfileForUnit(unit) ??
    zeroHitPointReplacementProfileForUnit(unit) ??
    bonusActionDashTemporaryHitPointsProfileForUnit(unit) ??
    failedAbilityCheckResourceBoostProfileForUnit(unit) ??
    failedSavingThrowRerollProfileForUnit(unit) ??
    spellSlotHealingModifierProfileForUnit(unit) ??
    magicActionHealingPoolProfileForUnit(unit) ??
    magicActionAreaSaveDamageHealingProfileForUnit(unit, classLevels) ??
    magicActionSaveGatedConditionProfileForUnit(unit, classLevels) ??
    enemyZeroHitPointTemporaryHitPointsProfileForUnit(unit) ??
    bonusActionDelegatedStandardActionsProfileForUnit(unit) ??
    remarkableAthleteProfileForUnit(unit) ??
    openHandTechniqueProfileForUnit(unit) ??
    stunningStrikeProfileForUnit(unit) ??
    cunningStrikeProfileForUnit(unit, classLevels) ??
    cunningStrikeOptionGrantProfileForUnit(unit) ??
    paladinSacredWeaponProfileForUnit(unit) ??
    rogueSteadyAimProfileForUnit(unit) ??
    potentCantripProfileForUnit(unit) ??
    grapplerProfileForUnit(unit)
  );
}

function d20TestNaturalOneRerollUnitFeatureProfile(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "d20TestNaturalOneReroll" }
> | null {
  const support = battleD20TestNaturalOneRerollSupportForUnit(unit);
  return support === null || support === "unsupported"
    ? null
    : {
        kind: D20_TEST_NATURAL_ONE_REROLL_SUPPORT_PROFILE,
        unit,
        reroll: support.reroll,
      };
}

function bonusActionDelegatedStandardActionsProfileForUnit(
  unit: AuthoredUnitSource,
): SupportedUnitFeatureProfile | null {
  const support = battleBonusActionDelegatedStandardActionsSupportForUnit(unit);
  return support === null || support === "unsupported"
    ? null
    : {
        kind: BONUS_ACTION_DELEGATED_STANDARD_ACTIONS_SUPPORT_PROFILE,
        unit,
        actionEconomy: support,
      };
}

function remarkableAthleteProfileForUnit(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "remarkableAthlete" }
> | null {
  if (
    unit.kind !== "class_feature" ||
    unit.className !== "fighter" ||
    unit.mechanics.family !== "remarkable_athlete"
  ) {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.initiative.kind !== "roll_advantage" ||
    mechanics.initiative.roll !== "initiative" ||
    mechanics.abilityCheck.kind !== "roll_advantage" ||
    mechanics.abilityCheck.ability !== "str" ||
    mechanics.abilityCheck.skill !== "athletics" ||
    mechanics.criticalHitMovement.trigger.kind !== "score_critical_hit" ||
    mechanics.criticalHitMovement.timing !== "immediately_after_trigger" ||
    mechanics.criticalHitMovement.distance.kind !== "half_speed" ||
    mechanics.criticalHitMovement.opportunityAttacks !== "does_not_provoke"
  ) {
    return null;
  }
  return {
    kind: "remarkableAthlete",
    unit,
    remarkableAthlete: {
      initiative: { kind: "rollAdvantage", roll: "initiative" },
      abilityCheck: {
        kind: "rollAdvantage",
        ability: "str",
        skill: "athletics",
      },
      criticalHitMovement: {
        trigger: "scoreCriticalHit",
        timing: "immediatelyAfterTrigger",
        distance: { kind: "halfSpeed" },
        opportunityAttacks: "doesNotProvoke",
      },
    },
  };
}

function openHandTechniqueProfileForUnit(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "openHandTechnique" }
> | null {
  if (
    unit.kind !== "class_feature" ||
    unit.className !== "monk" ||
    unit.mechanics.family !== "open_hand_technique"
  ) {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.trigger.kind !== "hit_with_attack_granted_by" ||
    // authored-id-dispatch-allow: battle-runtime-unit-feature-support-profile-boundary
    mechanics.trigger.resourceOptionUnitId !== MONK_FOCUS_RESOURCE_UNIT_ID ||
    // authored-id-dispatch-allow: battle-runtime-unit-feature-support-profile-boundary
    mechanics.trigger.optionId !== MONK_FLURRY_OF_BLOWS_OPTION_ID ||
    mechanics.optional !== true ||
    mechanics.effectSaveDc.kind !== "class_feature_ability_save_dc" ||
    mechanics.effectSaveDc.base !== 8 ||
    mechanics.effectSaveDc.ability !== "wis" ||
    mechanics.choices.length !== 3
  ) {
    return null;
  }
  const denyOpportunityAttacks = mechanics.choices.find(
    (choice) =>
      "effect" in choice &&
      choice.effect.kind === "deny_opportunity_attacks" &&
      choice.effect.expires === "start_of_target_next_turn",
  );
  const pushAwayOnFailedSave = mechanics.choices.find(
    (choice) =>
      "save" in choice &&
      choice.save.ability === "str" &&
      choice.onFail.kind === "push_away" &&
      choice.onFail.distanceFeet === 15,
  );
  const applyConditionOnFailedSave = mechanics.choices.find(
    (choice) =>
      "save" in choice &&
      choice.save.ability === "dex" &&
      choice.onFail.kind === "apply_condition" &&
      choice.onFail.condition === "prone",
  );
  if (
    denyOpportunityAttacks === undefined ||
    pushAwayOnFailedSave === undefined ||
    applyConditionOnFailedSave === undefined
  ) {
    return null;
  }
  return {
    kind: "openHandTechnique",
    unit,
    technique: {
      trigger: {
        kind: "hitWithAttackGrantedBy",
        resourceUnitId: MONK_FOCUS_RESOURCE_UNIT_ID,
        optionId: MONK_FLURRY_OF_BLOWS_OPTION_ID,
      },
      optional: true,
      effectSaveDc: {
        kind: "classFeatureAbilitySaveDc",
        base: 8,
        ability: "wis",
      },
      effects: {
        denyOpportunityAttacks: {
          kind: "denyOpportunityAttacks",
          expires: "startOfTargetNextTurn",
        },
        pushAwayOnFailedSave: {
          kind: "pushAwayOnFailedSave",
          save: { ability: "str" },
          distanceFeet: movementFeet(15),
        },
        applyConditionOnFailedSave: {
          kind: "applyConditionOnFailedSave",
          save: { ability: "dex" },
          condition: "prone",
        },
      },
    },
  };
}

const STUNNING_STRIKE_TRIGGER_KIND = {
  hit_creature_with_monk_weapon_or_unarmed_strike:
    "hitCreatureWithMonkWeaponOrUnarmedStrike",
} as const satisfies Record<
  StunningStrikeMechanics["trigger"]["kind"],
  StunningStrikeProfile["trigger"]["kind"]
>;
const STUNNING_STRIKE_USAGE_LIMIT = {
  once_per_turn: "oncePerTurn",
} as const satisfies Record<
  StunningStrikeMechanics["trigger"]["usageLimit"],
  StunningStrikeProfile["trigger"]["usageLimit"]
>;
const STUNNING_STRIKE_CONDITION_EFFECT_KIND = {
  apply_condition: "applyCondition",
} as const satisfies Record<
  StunningStrikeMechanics["onFail"]["kind"],
  StunningStrikeProfile["onFail"]["kind"]
>;
const STUNNING_STRIKE_EXPIRATION = {
  start_of_source_next_turn: "startOfSourceNextTurn",
} as const satisfies Record<
  | StunningStrikeMechanics["onFail"]["expires"]
  | StunningStrikeMechanics["onSuccess"]["speed"]["expires"],
  | StunningStrikeProfile["onFail"]["expires"]
  | StunningStrikeProfile["onSuccess"]["speed"]["expires"]
>;
const STUNNING_STRIKE_ATTACK_ROLL_APPLICATION = {
  next_attack_roll_against_target_before_expiration:
    "nextAttackRollAgainstTargetBeforeExpiration",
} as const satisfies Record<
  StunningStrikeMechanics["onSuccess"]["attackRoll"]["appliesTo"],
  StunningStrikeProfile["onSuccess"]["attackRoll"]["appliesTo"]
>;

type StunningStrikeSupportedUnitFeatureProfile = Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "stunningStrike" }
>;

function isStunningStrikeUnit(
  unit: AuthoredUnitSource,
): unit is StunningStrikeUnit {
  return (
    unit.kind === "class_feature" && unit.mechanics.family === "stunning_strike"
  );
}

function stunningStrikeProfileForAdmittedUnit(
  unit: StunningStrikeUnit,
): StunningStrikeSupportedUnitFeatureProfile {
  const mechanics = unit.mechanics;
  return {
    kind: "stunningStrike",
    unit,
    stunningStrike: {
      trigger: {
        kind: STUNNING_STRIKE_TRIGGER_KIND[mechanics.trigger.kind],
        usageLimit: STUNNING_STRIKE_USAGE_LIMIT[mechanics.trigger.usageLimit],
      },
      optional: mechanics.optional,
      spends: {
        resourceUnitId: mechanics.spends.resourceUnitId,
        amount: mechanics.spends.amount,
      },
      savingThrow: { ability: mechanics.savingThrow.ability },
      onFail: {
        kind: STUNNING_STRIKE_CONDITION_EFFECT_KIND[mechanics.onFail.kind],
        condition: mechanics.onFail.condition,
        expires: STUNNING_STRIKE_EXPIRATION[mechanics.onFail.expires],
      },
      onSuccess: {
        speed: {
          kind: mechanics.onSuccess.speed.kind,
          expires:
            STUNNING_STRIKE_EXPIRATION[mechanics.onSuccess.speed.expires],
        },
        attackRoll: {
          mode: mechanics.onSuccess.attackRoll.mode,
          appliesTo:
            STUNNING_STRIKE_ATTACK_ROLL_APPLICATION[
              mechanics.onSuccess.attackRoll.appliesTo
            ],
        },
      },
    },
  };
}

function stunningStrikeProfileForUnit(
  unit: AuthoredUnitSource,
): StunningStrikeSupportedUnitFeatureProfile | null {
  return isStunningStrikeUnit(unit)
    ? stunningStrikeProfileForAdmittedUnit(unit)
    : null;
}

const CUNNING_STRIKE_COST_KIND = {
  sneak_attack_damage_dice: "sneakAttackDamageDice",
} as const satisfies Record<
  CunningStrikeSurfaceOption["cost"]["kind"],
  CunningStrikeDieCost["kind"]
>;
const CUNNING_STRIKE_REQUIREMENT_KIND = {
  equipment_on_person: "equipmentOnPerson",
} as const satisfies Record<
  CunningStrikePoisonSurfaceOption["requires"]["kind"],
  CunningStrikeEquipmentGatedConditionSaveEffect["requires"]["kind"]
>;
const CUNNING_STRIKE_CONDITION_EFFECT_KIND = {
  apply_condition: "applyCondition",
} as const satisfies Record<
  | CunningStrikePoisonSurfaceOption["onFail"]["kind"]
  | CunningStrikeTripSurfaceOption["onFail"]["kind"],
  | CunningStrikeEquipmentGatedConditionSaveEffect["onFail"]["kind"]
  | CunningStrikeSizeGatedConditionSaveEffect["onFail"]["kind"]
>;
const CUNNING_STRIKE_REPEAT_SAVE_CADENCE = {
  end_of_target_turn: "endOfTargetTurn",
} as const satisfies Record<
  CunningStrikePoisonSurfaceOption["onFail"]["repeatSave"]["cadence"],
  CunningStrikeEquipmentGatedConditionSaveEffect["onFail"]["repeatSave"]["cadence"]
>;
const CUNNING_STRIKE_REPEAT_SAVE_SUCCESS = {
  end_condition: "endCondition",
} as const satisfies Record<
  CunningStrikePoisonSurfaceOption["onFail"]["repeatSave"]["onSuccess"],
  CunningStrikeEquipmentGatedConditionSaveEffect["onFail"]["repeatSave"]["onSuccess"]
>;
const CUNNING_STRIKE_MOVEMENT_TIMING = {
  immediately_after_attack: "immediatelyAfterAttack",
} as const satisfies Record<
  CunningStrikeWithdrawSurfaceOption["movement"]["timing"],
  CunningStrikePostDamageMovementEffect["movement"]["timing"]
>;
const CUNNING_STRIKE_MOVEMENT_DISTANCE_KIND = {
  half_speed: "halfSpeed",
} as const satisfies Record<
  CunningStrikeWithdrawSurfaceOption["movement"]["distance"]["kind"],
  CunningStrikePostDamageMovementEffect["movement"]["distance"]["kind"]
>;
const CUNNING_STRIKE_OPPORTUNITY_ATTACKS = {
  does_not_provoke: "doesNotProvoke",
} as const satisfies Record<
  CunningStrikeWithdrawSurfaceOption["movement"]["opportunityAttacks"],
  CunningStrikePostDamageMovementEffect["movement"]["opportunityAttacks"]
>;
const CUNNING_STRIKE_COVER_DEGREE = {
  three_quarters: "threeQuarters",
  total: "total",
} as const satisfies Record<
  CunningStrikeOptionGrantSurfaceOption["effect"]["ifTurnEndsBehindCover"][number],
  CunningStrikeHideInvisibleEndSuppressionEffect["ifTurnEndsBehindCover"][number]
>;
const CUNNING_STRIKE_OPTION_GRANT_PREREQUISITE_KIND = {
  hide_action_invisible_condition: "hideActionInvisibleCondition",
} as const satisfies Record<
  CunningStrikeOptionGrantSurfaceOption["prerequisite"]["kind"],
  CunningStrikeHideInvisibleEndSuppressionEffect["prerequisite"]["kind"]
>;
const CUNNING_STRIKE_OPTION_GRANT_CONDITION_SOURCE = {
  hide_action: "hideAction",
} as const satisfies Record<
  CunningStrikeOptionGrantSurfaceOption["effect"]["conditionSource"],
  CunningStrikeHideInvisibleEndSuppressionEffect["conditionSource"]
>;
const CUNNING_STRIKE_OPTION_GRANT_EFFECT_KIND = {
  suppress_attack_end_of_invisible_condition: "hideInvisibleEndSuppression",
} as const satisfies Record<
  CunningStrikeOptionGrantSurfaceOption["effect"]["kind"],
  CunningStrikeHideInvisibleEndSuppressionEffect["kind"]
>;
const CUNNING_STRIKE_TRIGGER_KIND = {
  deal_sneak_attack_damage: "dealSneakAttackDamage",
} as const satisfies Record<
  CunningStrikeMechanics["trigger"]["kind"],
  CunningStrikeProfile["trigger"]["kind"]
>;
const CUNNING_STRIKE_CHOICE_KIND = {
  choose_one: "chooseOne",
} as const satisfies Record<
  CunningStrikeMechanics["choice"]["kind"],
  CunningStrikeProfile["choice"]["kind"]
>;
const CUNNING_STRIKE_SAVE_DC_KIND = {
  class_feature_ability_save_dc: "classFeatureAbilitySaveDc",
} as const satisfies Record<
  CunningStrikeMechanics["effectSaveDc"]["kind"],
  CunningStrikeProfile["effectSaveDc"]["kind"]
>;

function cunningStrikeCostForSurfaceOption(option: {
  readonly cost: CunningStrikeSurfaceOption["cost"];
}): CunningStrikeDieCost {
  return {
    kind: CUNNING_STRIKE_COST_KIND[option.cost.kind],
    dice: option.cost.dice,
    dieSize: option.cost.dieSize,
  };
}

function cunningStrikePoisonDurationTicks(duration: {
  readonly amount: 1;
  readonly unit: "minute";
}): ElapsedTimeTicks {
  const ticks = elapsedTimeTicksFromTimeSpanDuration(duration);
  if (Result.isFailure(ticks)) {
    throw new Error("Expected a supported duration.");
  }
  return ticks.success;
}

function cunningStrikeEffectForSurfaceOption(
  option: CunningStrikeSurfaceOption,
): CunningStrikeOptionEffect {
  if ("requires" in option) {
    const durationTicks = cunningStrikePoisonDurationTicks(
      option.onFail.duration,
    );
    return {
      kind: "equipmentGatedConditionSave",
      requires: {
        kind: CUNNING_STRIKE_REQUIREMENT_KIND[option.requires.kind],
        equipment: {
          kind: option.requires.equipment.kind,
          toolId: option.requires.equipment.toolId,
        },
      },
      save: { ability: option.save.ability },
      onFail: {
        kind: CUNNING_STRIKE_CONDITION_EFFECT_KIND[option.onFail.kind],
        condition: option.onFail.condition,
        durationTicks,
        repeatSave: {
          cadence:
            CUNNING_STRIKE_REPEAT_SAVE_CADENCE[
              option.onFail.repeatSave.cadence
            ],
          onSuccess:
            CUNNING_STRIKE_REPEAT_SAVE_SUCCESS[
              option.onFail.repeatSave.onSuccess
            ],
        },
      },
    };
  }
  if ("target" in option) {
    return {
      kind: "sizeGatedConditionSave",
      target: { maxSize: option.target.maxSize },
      save: { ability: option.save.ability },
      onFail: {
        kind: CUNNING_STRIKE_CONDITION_EFFECT_KIND[option.onFail.kind],
        condition: option.onFail.condition,
      },
    };
  }
  if ("movement" in option) {
    return {
      kind: "postDamageMovement",
      movement: {
        timing: CUNNING_STRIKE_MOVEMENT_TIMING[option.movement.timing],
        distance: {
          kind: CUNNING_STRIKE_MOVEMENT_DISTANCE_KIND[
            option.movement.distance.kind
          ],
        },
        opportunityAttacks:
          CUNNING_STRIKE_OPPORTUNITY_ATTACKS[
            option.movement.opportunityAttacks
          ],
      },
    };
  }
  return option;
}

function cunningStrikeEffectForOptionGrantSurfaceOption(
  option: CunningStrikeOptionGrantSurfaceOption,
): CunningStrikeOptionEffect {
  return {
    kind: CUNNING_STRIKE_OPTION_GRANT_EFFECT_KIND[option.effect.kind],
    prerequisite: {
      kind: CUNNING_STRIKE_OPTION_GRANT_PREREQUISITE_KIND[
        option.prerequisite.kind
      ],
    },
    conditionSource:
      CUNNING_STRIKE_OPTION_GRANT_CONDITION_SOURCE[
        option.effect.conditionSource
      ],
    ifTurnEndsBehindCover: [
      CUNNING_STRIKE_COVER_DEGREE[option.effect.ifTurnEndsBehindCover[0]],
      CUNNING_STRIKE_COVER_DEGREE[option.effect.ifTurnEndsBehindCover[1]],
    ],
  };
}

function cunningStrikeOptionForSurfaceOption(
  option: CunningStrikeSurfaceOption,
): CunningStrikeOption {
  const cost = cunningStrikeCostForSurfaceOption(option);
  const effect = cunningStrikeEffectForSurfaceOption(option);
  return {
    selectionId: option.id,
    cost,
    effect,
  };
}

function cunningStrikeOptionForOptionGrantSurfaceOption(
  option: CunningStrikeOptionGrantSurfaceOption,
): CunningStrikeOption {
  const cost = cunningStrikeCostForSurfaceOption(option);
  const effect = cunningStrikeEffectForOptionGrantSurfaceOption(option);
  return {
    selectionId: option.id,
    cost,
    effect,
  };
}

function cunningStrikeOptionsForMechanics(
  mechanics: CunningStrikeMechanics,
): readonly CunningStrikeOption[] {
  return mechanics.options.map(cunningStrikeOptionForSurfaceOption);
}

type CunningStrikeSupportedUnitFeatureProfile = Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "cunningStrike" }
>;

function isCunningStrikeUnit(
  unit: AuthoredUnitSource,
): unit is CunningStrikeUnit {
  return (
    unit.kind === "class_feature" && unit.mechanics.family === "cunning_strike"
  );
}

function cunningStrikeProfileForAdmittedUnit(
  unit: CunningStrikeUnit,
): CunningStrikeSupportedUnitFeatureProfile;
function cunningStrikeProfileForAdmittedUnit(
  unit: CunningStrikeUnit,
  classLevels: readonly CharacterBattleClassLevel[],
): CunningStrikeSupportedUnitFeatureProfile | null;
function cunningStrikeProfileForAdmittedUnit(
  unit: CunningStrikeUnit,
  classLevels?: readonly CharacterBattleClassLevel[],
): CunningStrikeSupportedUnitFeatureProfile | null {
  if (classLevels !== undefined) {
    const classLevel = findCharacterClassLevel(classLevels, unit.className);
    /* v8 ignore start -- @preserve -- Unsupported character/profile pairing: admission requires the Rogue level at or above acquisition. */
    if (classLevel === undefined || classLevel < unit.acquiredAtLevel) {
      return null;
    }
    /* v8 ignore stop -- @preserve */
  }
  const mechanics = unit.mechanics;
  const options = cunningStrikeOptionsForMechanics(mechanics);
  return {
    kind: CUNNING_STRIKE_SUPPORT_PROFILE,
    unit,
    cunningStrike: {
      trigger: {
        kind: CUNNING_STRIKE_TRIGGER_KIND[mechanics.trigger.kind],
        sourceUnitId: mechanics.trigger.sourceUnitId,
      },
      choice: {
        kind: CUNNING_STRIKE_CHOICE_KIND[mechanics.choice.kind],
        maxOptions: mechanics.choice.maxOptions,
      },
      effectSaveDc: {
        kind: CUNNING_STRIKE_SAVE_DC_KIND[mechanics.effectSaveDc.kind],
        base: mechanics.effectSaveDc.base,
        ability: mechanics.effectSaveDc.ability,
      },
      options,
    },
  };
}

function cunningStrikeProfileForUnit(
  unit: AuthoredUnitSource,
  classLevels: readonly CharacterBattleClassLevel[],
): CunningStrikeSupportedUnitFeatureProfile | null {
  if (!isCunningStrikeUnit(unit)) {
    return null;
  }
  return cunningStrikeProfileForAdmittedUnit(unit, classLevels);
}

type CunningStrikeOptionGrantSupportedUnitFeatureProfile = Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "cunningStrikeOptionGrant" }
>;

function isCunningStrikeOptionGrantUnit(
  unit: AuthoredUnitSource,
): unit is CunningStrikeOptionGrantUnit {
  return (
    unit.kind === "class_feature" &&
    unit.mechanics.family === "cunning_strike_option_grant"
  );
}

function cunningStrikeOptionGrantProfileForAdmittedUnit(
  unit: CunningStrikeOptionGrantUnit,
): CunningStrikeOptionGrantSupportedUnitFeatureProfile {
  const option = cunningStrikeOptionForOptionGrantSurfaceOption(
    unit.mechanics.option,
  );
  return {
    kind: CUNNING_STRIKE_OPTION_GRANT_SUPPORT_PROFILE,
    unit,
    optionGrant: {
      sourceUnitId: unit.mechanics.sourceUnitId,
      option,
    },
  };
}

function cunningStrikeOptionGrantProfileForUnit(
  unit: AuthoredUnitSource,
): CunningStrikeOptionGrantSupportedUnitFeatureProfile | null {
  if (!isCunningStrikeOptionGrantUnit(unit)) {
    return null;
  }
  return cunningStrikeOptionGrantProfileForAdmittedUnit(unit);
}

const PALADIN_SACRED_WEAPON_ACTIVATION_COST_KIND = {
  standard_action: "standardAction",
} as const satisfies Record<
  PaladinSacredWeaponMechanics["activationCost"]["kind"],
  PaladinSacredWeaponProfile["activationCost"]["kind"]
>;
const PALADIN_SACRED_WEAPON_TARGET_KIND = {
  held_melee_weapon: "heldMeleeWeapon",
} as const satisfies Record<
  PaladinSacredWeaponMechanics["target"]["kind"],
  PaladinSacredWeaponProfile["target"]
>;
const PALADIN_SACRED_WEAPON_DURATION_END = {
  use_feature_again: "useFeatureAgain",
  dismiss_no_action: "dismissNoAction",
  not_carrying_weapon: "notCarryingWeapon",
} as const satisfies Record<
  PaladinSacredWeaponMechanics["duration"]["endsOn"][number],
  PaladinSacredWeaponProfile["duration"]["endsOn"][number]
>;
const PALADIN_SACRED_WEAPON_ATTACK_ROLL_BONUS_KIND = {
  ability_modifier: "abilityModifier",
} as const satisfies Record<
  PaladinSacredWeaponMechanics["attackRollBonus"]["kind"],
  PaladinSacredWeaponProfile["attackRollBonus"]["kind"]
>;
const PALADIN_SACRED_WEAPON_ATTACK_ROLL_APPLICATION = {
  imbued_weapon_attack_rolls: "imbuedWeaponAttackRolls",
} as const satisfies Record<
  PaladinSacredWeaponMechanics["attackRollBonus"]["appliesTo"],
  PaladinSacredWeaponProfile["attackRollBonus"]["appliesTo"]
>;

function paladinSacredWeaponDurationEnds(
  endsOn: PaladinSacredWeaponMechanics["duration"]["endsOn"],
): PaladinSacredWeaponProfile["duration"]["endsOn"] {
  return [
    PALADIN_SACRED_WEAPON_DURATION_END[endsOn[0]],
    PALADIN_SACRED_WEAPON_DURATION_END[endsOn[1]],
    PALADIN_SACRED_WEAPON_DURATION_END[endsOn[2]],
  ];
}

type PaladinSacredWeaponSupportedUnitFeatureProfile = Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "paladinSacredWeapon" }
>;

function isPaladinSacredWeaponUnit(
  unit: AuthoredUnitSource,
): unit is PaladinSacredWeaponUnit {
  return (
    unit.kind === "class_feature" && unit.mechanics.family === "sacred_weapon"
  );
}

function paladinSacredWeaponProfileForAdmittedUnit(
  unit: PaladinSacredWeaponUnit,
): PaladinSacredWeaponSupportedUnitFeatureProfile {
  const mechanics = unit.mechanics;
  return {
    kind: "paladinSacredWeapon",
    unit,
    sacredWeapon: {
      activationCost: {
        kind: PALADIN_SACRED_WEAPON_ACTIVATION_COST_KIND[
          mechanics.activationCost.kind
        ],
        action: mechanics.activationCost.action,
      },
      spends: {
        resourceUnitId: mechanics.spends.resourceUnitId,
        amount: mechanics.spends.amount,
      },
      target: PALADIN_SACRED_WEAPON_TARGET_KIND[mechanics.target.kind],
      duration: {
        unit: mechanics.duration.unit,
        amount: mechanics.duration.amount,
        endsOn: paladinSacredWeaponDurationEnds(mechanics.duration.endsOn),
      },
      attackRollBonus: {
        kind: PALADIN_SACRED_WEAPON_ATTACK_ROLL_BONUS_KIND[
          mechanics.attackRollBonus.kind
        ],
        ability: mechanics.attackRollBonus.ability,
        minimum: mechanics.attackRollBonus.minimum,
        appliesTo:
          PALADIN_SACRED_WEAPON_ATTACK_ROLL_APPLICATION[
            mechanics.attackRollBonus.appliesTo
          ],
      },
      hitDamageTypeChoice: mechanics.hitDamageType.choice,
      light: {
        brightRadiusFeet: movementFeet(mechanics.light.brightRadiusFeet),
        dimAdditionalFeet: movementFeet(mechanics.light.dimAdditionalFeet),
      },
    },
  };
}

function paladinSacredWeaponProfileForUnit(
  unit: AuthoredUnitSource,
): PaladinSacredWeaponSupportedUnitFeatureProfile | null {
  return isPaladinSacredWeaponUnit(unit)
    ? paladinSacredWeaponProfileForAdmittedUnit(unit)
    : null;
}

function huntersPreyAdmittedMechanicsProfileForUnit(
  unit: BattleUnitSupportSource,
): HuntersPreyAdmittedMechanicsProfile | null {
  if (
    isClassicNonSrdMechanicsUnit(unit) ||
    unit.kind !== "class_feature" ||
    unit.className !== "ranger" ||
    unit.mechanics.family !== "hunters_prey"
  ) {
    return null;
  }
  const mechanics = unit.mechanics;
  const woundedTargetWeaponDamage = mechanics.options.find(
    (option) =>
      "targetPredicate" in option &&
      "damage" in option &&
      option.trigger.kind === "hit_creature_with_weapon" &&
      option.targetPredicate === "missing_any_hit_points" &&
      option.usageLimit.kind === "once_per_turn" &&
      option.damage.kind === "add_attack_damage_dice" &&
      option.damage.dice.dice === 1 &&
      option.damage.dice.dieSize === 8 &&
      option.damage.damageType === "same_as_attack",
  );
  const nearbyDifferentTargetSameWeaponAttack = mechanics.options.find(
    (option) =>
      "extraAttack" in option &&
      option.trigger.kind === "make_weapon_attack" &&
      option.usageLimit.kind === "once_per_turn" &&
      option.extraAttack.weapon === "same_weapon" &&
      option.extraAttack.target.kind ===
        "different_creature_near_original_target" &&
      option.extraAttack.target.withinFeetOfOriginalTarget === 5 &&
      option.extraAttack.target.withinWeaponRange === true &&
      option.extraAttack.target.notAttackedThisTurn === true,
  );
  if (
    mechanics.choice.kind !== "choose_one" ||
    mechanics.choice.replaceOn !== "short_or_long_rest" ||
    mechanics.options.length !== 2 ||
    woundedTargetWeaponDamage === undefined ||
    nearbyDifferentTargetSameWeaponAttack === undefined
  ) {
    return null;
  }
  return {
    woundedTargetWeaponDamage: {
      kind: "woundedTargetWeaponDamage",
      trigger: "hitCreatureWithWeapon",
      targetPredicate: "missingAnyHitPoints",
      usageLimit: "oncePerTurn",
      damage: {
        kind: "addAttackDamageDice",
        dice: { dice: 1, dieSize: 8 },
        damageType: "sameAsAttack",
      },
    },
    nearbyDifferentTargetSameWeaponAttack: {
      kind: "nearbyDifferentTargetSameWeaponAttack",
      trigger: "makeWeaponAttack",
      usageLimit: "oncePerTurn",
      extraAttack: {
        weapon: "sameWeapon",
        target: {
          kind: "differentCreatureNearOriginalTarget",
          withinFeetOfOriginalTarget: movementFeet(5),
          withinWeaponRange: true,
          notAttackedThisTurn: true,
        },
      },
    },
  };
}

const ROGUE_STEADY_AIM_ACTIVATION_COST_KIND = {
  bonus_action: "bonusAction",
} as const satisfies Record<
  RogueSteadyAimMechanics["activationCost"]["kind"],
  RogueSteadyAimProfile["activationCost"]["kind"]
>;
const ROGUE_STEADY_AIM_PRECONDITION_KIND = {
  no_movement_this_turn: "noMovementThisTurn",
} as const satisfies Record<
  RogueSteadyAimMechanics["precondition"]["kind"],
  RogueSteadyAimProfile["precondition"]
>;
const ROGUE_STEADY_AIM_ATTACK_ROLL_APPLICATION = {
  next_attack_roll_current_turn: "nextAttackRollCurrentTurn",
} as const satisfies Record<
  RogueSteadyAimMechanics["attackRoll"]["appliesTo"],
  RogueSteadyAimProfile["attackRoll"]["appliesTo"]
>;
const ROGUE_STEADY_AIM_SPEED_KIND = {
  set_to_zero: "setToZero",
} as const satisfies Record<
  RogueSteadyAimMechanics["speed"]["kind"],
  RogueSteadyAimProfile["speed"]["kind"]
>;
const ROGUE_STEADY_AIM_SPEED_DURATION = {
  end_of_current_turn: "endOfCurrentTurn",
} as const satisfies Record<
  RogueSteadyAimMechanics["speed"]["until"],
  RogueSteadyAimProfile["speed"]["until"]
>;

type RogueSteadyAimSupportedUnitFeatureProfile = Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "rogueSteadyAim" }
>;

function isRogueSteadyAimUnit(
  unit: AuthoredUnitSource,
): unit is RogueSteadyAimUnit {
  return (
    unit.kind === "class_feature" && unit.mechanics.family === "steady_aim"
  );
}

function rogueSteadyAimProfileForAdmittedUnit(
  unit: RogueSteadyAimUnit,
): RogueSteadyAimSupportedUnitFeatureProfile {
  const mechanics = unit.mechanics;
  return {
    kind: "rogueSteadyAim",
    unit,
    steadyAim: {
      activationCost: {
        kind: ROGUE_STEADY_AIM_ACTIVATION_COST_KIND[
          mechanics.activationCost.kind
        ],
      },
      precondition:
        ROGUE_STEADY_AIM_PRECONDITION_KIND[mechanics.precondition.kind],
      attackRoll: {
        mode: mechanics.attackRoll.mode,
        appliesTo:
          ROGUE_STEADY_AIM_ATTACK_ROLL_APPLICATION[
            mechanics.attackRoll.appliesTo
          ],
      },
      speed: {
        kind: ROGUE_STEADY_AIM_SPEED_KIND[mechanics.speed.kind],
        until: ROGUE_STEADY_AIM_SPEED_DURATION[mechanics.speed.until],
      },
    },
  };
}

function rogueSteadyAimProfileForUnit(
  unit: AuthoredUnitSource,
): RogueSteadyAimSupportedUnitFeatureProfile | null {
  return isRogueSteadyAimUnit(unit)
    ? rogueSteadyAimProfileForAdmittedUnit(unit)
    : null;
}

const POTENT_CANTRIP_TRIGGER_KIND = {
  cast_cantrip_at_creature: "castCantripAtCreature",
} as const satisfies Record<
  PotentCantripMechanics["trigger"]["kind"],
  PotentCantripProfile["trigger"]["kind"]
>;
const POTENT_CANTRIP_OUTCOME = {
  miss_with_attack_roll: "missWithAttackRoll",
  target_succeeds_saving_throw: "targetSucceedsSavingThrow",
} as const satisfies Record<
  PotentCantripMechanics["outcomes"][number],
  PotentCantripProfile["outcomes"][number]
>;
const POTENT_CANTRIP_DAMAGE_KIND = {
  half_cantrip_damage_if_any: "halfCantripDamageIfAny",
} as const satisfies Record<
  PotentCantripMechanics["damage"]["kind"],
  PotentCantripProfile["damage"]
>;

type PotentCantripSupportedUnitFeatureProfile = Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "potentCantrip" }
>;

function isPotentCantripUnit(
  unit: AuthoredUnitSource,
): unit is PotentCantripUnit {
  return (
    unit.kind === "class_feature" && unit.mechanics.family === "potent_cantrip"
  );
}

function potentCantripProfileForAdmittedUnit(
  unit: PotentCantripUnit,
): PotentCantripSupportedUnitFeatureProfile {
  const mechanics = unit.mechanics;
  return {
    kind: "potentCantrip",
    unit,
    potentCantrip: {
      trigger: {
        kind: POTENT_CANTRIP_TRIGGER_KIND[mechanics.trigger.kind],
        cantripKind: mechanics.trigger.cantripKind,
      },
      outcomes: [
        POTENT_CANTRIP_OUTCOME[mechanics.outcomes[0]],
        POTENT_CANTRIP_OUTCOME[mechanics.outcomes[1]],
      ],
      damage: POTENT_CANTRIP_DAMAGE_KIND[mechanics.damage.kind],
      additionalEffect: mechanics.additionalEffect,
    },
  };
}

function potentCantripProfileForUnit(
  unit: AuthoredUnitSource,
): PotentCantripSupportedUnitFeatureProfile | null {
  return isPotentCantripUnit(unit)
    ? potentCantripProfileForAdmittedUnit(unit)
    : null;
}

const GRAPPLER_PUNCH_AND_GRAB_TRIGGER = {
  attack_action_unarmed_strike_hit_on_turn:
    "attackActionUnarmedStrikeHitOnTurn",
} as const satisfies Record<
  GrapplerMechanics["punchAndGrab"]["trigger"],
  GrapplerProfile["punchAndGrab"]["trigger"]
>;
const GRAPPLER_PUNCH_AND_GRAB_OPTION = {
  damage: "damage",
  grapple: "grapple",
} as const satisfies Record<
  GrapplerMechanics["punchAndGrab"]["options"][number],
  GrapplerProfile["punchAndGrab"]["options"][number]
>;
const GRAPPLER_PUNCH_AND_GRAB_USAGE_LIMIT = {
  once_per_turn: "oncePerTurn",
} as const satisfies Record<
  GrapplerMechanics["punchAndGrab"]["usageLimit"]["kind"],
  GrapplerProfile["punchAndGrab"]["usageLimit"]
>;
const GRAPPLER_ATTACK_ADVANTAGE_TARGET = {
  creature_grappled_by_you: "creatureGrappledByYou",
} as const satisfies Record<
  GrapplerMechanics["attackAdvantage"]["target"],
  GrapplerProfile["attackAdvantage"]["target"]
>;
const GRAPPLER_FAST_WRESTLER_MOVEMENT_COST = {
  no_extra_grapple_drag_cost: "noExtraGrappleDragCost",
} as const satisfies Record<
  GrapplerMechanics["fastWrestler"]["movementCost"],
  GrapplerProfile["fastWrestler"]["movementCost"]
>;
const GRAPPLER_FAST_WRESTLER_TARGET_SIZE = {
  your_size_or_smaller: "yourSizeOrSmaller",
} as const satisfies Record<
  GrapplerMechanics["fastWrestler"]["targetSize"],
  GrapplerProfile["fastWrestler"]["targetSize"]
>;

function grapplerPunchAndGrabOptions(
  options: GrapplerMechanics["punchAndGrab"]["options"],
): GrapplerProfile["punchAndGrab"]["options"] {
  return [
    GRAPPLER_PUNCH_AND_GRAB_OPTION[options[0]],
    GRAPPLER_PUNCH_AND_GRAB_OPTION[options[1]],
  ];
}

type GrapplerSupportedUnitFeatureProfile = Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "grappler" }
>;

function isGrapplerUnit(unit: AuthoredUnitSource): unit is GrapplerUnit {
  return unit.kind === "feat" && unit.mechanics.family === "grappler";
}

function grapplerProfileForAdmittedUnit(
  unit: GrapplerUnit,
): GrapplerSupportedUnitFeatureProfile {
  const mechanics = unit.mechanics;
  return {
    kind: GRAPPLER_SUPPORT_PROFILE,
    unit,
    grappler: {
      punchAndGrab: {
        trigger:
          GRAPPLER_PUNCH_AND_GRAB_TRIGGER[mechanics.punchAndGrab.trigger],
        options: grapplerPunchAndGrabOptions(mechanics.punchAndGrab.options),
        usageLimit:
          GRAPPLER_PUNCH_AND_GRAB_USAGE_LIMIT[
            mechanics.punchAndGrab.usageLimit.kind
          ],
      },
      attackAdvantage: {
        mode: mechanics.attackAdvantage.mode,
        target:
          GRAPPLER_ATTACK_ADVANTAGE_TARGET[mechanics.attackAdvantage.target],
      },
      fastWrestler: {
        movementCost:
          GRAPPLER_FAST_WRESTLER_MOVEMENT_COST[
            mechanics.fastWrestler.movementCost
          ],
        targetSize:
          GRAPPLER_FAST_WRESTLER_TARGET_SIZE[mechanics.fastWrestler.targetSize],
      },
    },
  };
}

function grapplerProfileForUnit(
  unit: AuthoredUnitSource,
): GrapplerSupportedUnitFeatureProfile | null {
  return isGrapplerUnit(unit) ? grapplerProfileForAdmittedUnit(unit) : null;
}

export function battleGrapplerSupportForUnit(
  unit: AuthoredUnitSource,
): BattleGrapplerSupport {
  if (!isGrapplerUnit(unit)) {
    return null;
  }
  const profile = grapplerProfileForAdmittedUnit(unit);
  return { kind: GRAPPLER_SUPPORT_PROFILE, grappler: profile.grappler };
}

export function battleBrutalStrikeSupportForUnit(
  unit: AuthoredUnitSource,
): BattleBrutalStrikeSupport {
  if (!isBrutalStrikeUnit(unit)) {
    return null;
  }
  return battleBrutalStrikeSupportForAdmittedUnit(unit);
}

const BRUTAL_STRIKE_TRIGGER_KIND = {
  reckless_attack_strength_attack_hit: "recklessAttackStrengthAttackHit",
} as const satisfies Record<
  BrutalStrikeMechanics["trigger"]["kind"],
  BrutalStrikeProfile["trigger"]["kind"]
>;
const BRUTAL_STRIKE_DAMAGE_TYPE = {
  same_as_attack: "sameAsAttack",
} as const satisfies Record<
  BrutalStrikeMechanics["damage"]["damageType"],
  BrutalStrikeProfile["damage"]["damageType"]
>;
type BrutalStrikeSelfMovementKey =
  `${BrutalStrikeMechanics["options"][0]["selfMovement"]["kind"]}:${BrutalStrikeMechanics["options"][0]["selfMovement"]["opportunityAttacks"]}`;
const BRUTAL_STRIKE_SELF_MOVEMENT_KIND = {
  "move_toward_target:does_not_provoke":
    "moveTowardTargetWithoutOpportunityAttacks",
} as const satisfies Record<
  BrutalStrikeSelfMovementKey,
  BrutalStrikeProfile["options"][0]["effect"]["selfMovement"]["kind"]
>;
const BRUTAL_STRIKE_SELF_MOVEMENT_DISTANCE = {
  half_speed: "halfSpeed",
} as const satisfies Record<
  BrutalStrikeMechanics["options"][0]["selfMovement"]["distance"]["kind"],
  BrutalStrikeProfile["options"][0]["effect"]["selfMovement"]["distance"]
>;
const BRUTAL_STRIKE_HAMSTRING_STACKING = {
  most_recent_only: "mostRecentOnly",
} as const satisfies Record<
  BrutalStrikeMechanics["options"][1]["speedPenalty"]["stacking"],
  BrutalStrikeProfile["options"][1]["effect"]["stacking"]
>;
const BRUTAL_STRIKE_HAMSTRING_EXPIRATION = {
  start_of_your_next_turn: "startOfYourNextTurn",
} as const satisfies Record<
  BrutalStrikeMechanics["options"][1]["speedPenalty"]["until"],
  BrutalStrikeProfile["options"][1]["effect"]["expires"]
>;

function brutalStrikeSelfMovementKind(
  selfMovement: BrutalStrikeMechanics["options"][0]["selfMovement"],
): BrutalStrikeProfile["options"][0]["effect"]["selfMovement"]["kind"] {
  return BRUTAL_STRIKE_SELF_MOVEMENT_KIND[
    `${selfMovement.kind}:${selfMovement.opportunityAttacks}`
  ];
}

function brutalStrikeOptions(
  options: BrutalStrikeMechanics["options"],
): BrutalStrikeProfile["options"] {
  const forceful = options[0];
  const hamstring = options[1];
  return [
    {
      selectionId: forceful.id,
      effect: {
        kind: "forcefulBlow",
        pushFeet: movementFeet(forceful.forcedMovement.feet),
        selfMovement: {
          kind: brutalStrikeSelfMovementKind(forceful.selfMovement),
          distance:
            BRUTAL_STRIKE_SELF_MOVEMENT_DISTANCE[
              forceful.selfMovement.distance.kind
            ],
        },
      },
    },
    {
      selectionId: hamstring.id,
      effect: {
        kind: "hamstringBlow",
        deltaFeet: movementDeltaFeet(-hamstring.speedPenalty.feet),
        stacking:
          BRUTAL_STRIKE_HAMSTRING_STACKING[hamstring.speedPenalty.stacking],
        expires:
          BRUTAL_STRIKE_HAMSTRING_EXPIRATION[hamstring.speedPenalty.until],
      },
    },
  ];
}

function isBrutalStrikeUnit(
  unit: AuthoredUnitSource,
): unit is BrutalStrikeUnit {
  return (
    unit.kind === "class_feature" && unit.mechanics.family === "brutal_strike"
  );
}

function battleBrutalStrikeSupportForAdmittedUnit(
  unit: BrutalStrikeUnit,
): BattleBrutalStrikeSupportProfile {
  const mechanics = unit.mechanics;
  return {
    kind: BRUTAL_STRIKE_SUPPORT_PROFILE,
    brutalStrike: {
      trigger: {
        kind: BRUTAL_STRIKE_TRIGGER_KIND[mechanics.trigger.kind],
        advantageForgone: mechanics.trigger.advantageForgone,
        attackMustNotHaveDisadvantage:
          mechanics.trigger.attackMustNotHaveDisadvantage,
      },
      damage: {
        dice: mechanics.damage.dice.dice,
        dieSize: mechanics.damage.dice.dieSize,
        damageType: BRUTAL_STRIKE_DAMAGE_TYPE[mechanics.damage.damageType],
      },
      options: brutalStrikeOptions(mechanics.options),
    },
  };
}

export function battleBardicInspirationGrantSupportForUnit(
  unit: AuthoredUnitSource,
): typeof BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE | "unsupported" | null {
  const profile = parseBardicInspirationGrantUnitFeatureProfile(unit, [
    { className: "bard", level: classLevel(1) },
  ]);
  if (profile !== null) {
    return BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE;
  }
  return unit.kind === "class_feature" &&
    unit.mechanics.family === "activation" &&
    unit.mechanics.phases.some((phase) =>
      "effects" in phase
        ? phase.effects?.some((effect) => effect.kind === "grant_die_token") ===
          true
        : false,
    )
    ? "unsupported"
    : null;
}

export function battleDruidWildShapeKnownFormSupportForUnit(
  unit: AuthoredUnitSource,
): BattleDruidWildShapeKnownFormSupport {
  return Match.value(admitDruidWildShapeProcedure(unit)).pipe(
    Match.when({ tag: "notBattleOwned" }, () => null),
    Match.when({ tag: "rejected" }, () => "unsupported" as const),
    Match.when({ tag: "admitted" }, ({ projection }) =>
      druidWildShapeKnownFormProfileForTemplate(
        projection.procedure,
        classLevel(
          projection.procedure.binding.requirements.classLevel.minimumLevel,
        ),
      ),
    ),
    Match.exhaustive,
  );
}

export function battleDruidWildCompanionSpellCastSupportForUnit(
  unit: AuthoredUnitSource,
):
  | typeof DRUID_WILD_COMPANION_SPELL_CAST_SUPPORT_PROFILE
  | "unsupported"
  | null {
  if (
    unit.kind !== "class_feature" ||
    unit.className !== "druid" ||
    unit.mechanics.family !== "druid_wild_companion_spell_cast"
  ) {
    return null;
  }
  /* v8 ignore start -- @preserve -- Malformed Wild Companion Surface mechanics are rejected at profile admission; canonical synthetic fixture projection is covered. */
  return (
    // authored-id-dispatch-allow: battle-runtime-unit-feature-support-profile-boundary
    unit.mechanics.spellId === "find_familiar" &&
      unit.mechanics.activationCost.kind === "standard_action" &&
      unit.mechanics.activationCost.action === "magic" &&
      unit.mechanics.componentOverride.material === "not_required" &&
      unit.mechanics.spellModeOverride.kind ===
        "fixed_creature_type_mode_option" &&
      // authored-id-dispatch-allow: battle-runtime-unit-feature-support-profile-boundary
      unit.mechanics.spellModeOverride.optionId === "fey"
      ? DRUID_WILD_COMPANION_SPELL_CAST_SUPPORT_PROFILE
      : "unsupported"
  );
  /* v8 ignore stop -- @preserve */
}

function battleDruidWildShapeKnownFormSupportForUnitAtClassLevels(
  unit: AuthoredUnitSource,
  classLevels: readonly CharacterBattleClassLevel[],
): BattleDruidWildShapeKnownFormSupport {
  return Match.value(admitDruidWildShapeProcedure(unit)).pipe(
    Match.when({ tag: "notBattleOwned" }, () => null),
    Match.when({ tag: "rejected" }, () => "unsupported" as const),
    Match.when({ tag: "admitted" }, ({ projection }) => {
      const classLevelRequirement =
        projection.procedure.binding.requirements.classLevel;
      const actualClassLevel = findCharacterClassLevel(
        classLevels,
        classLevelRequirement.className,
      );
      return actualClassLevel === undefined ||
        actualClassLevel < classLevelRequirement.minimumLevel
        ? null
        : druidWildShapeKnownFormProfileForTemplate(
            projection.procedure,
            actualClassLevel,
          );
    }),
    Match.exhaustive,
  );
}

function battleTacticalMasterReplacementSupportForUnitAtClassLevels(
  unit: AuthoredUnitSource,
  classLevels: readonly CharacterBattleClassLevel[],
): BattleTacticalMasterReplacementSupport {
  if (unit.kind !== "class_feature") {
    return null;
  }
  const support = battleTacticalMasterReplacementSupportForUnit(unit);
  if (support === null || support === "unsupported") {
    return support;
  }
  const actualClassLevel = findCharacterClassLevel(classLevels, unit.className);
  return actualClassLevel === undefined ||
    Number(actualClassLevel) < unit.acquiredAtLevel
    ? null
    : support;
}

export function battleTacticalMasterReplacementSupportForUnit(
  unit: AuthoredUnitSource,
): BattleTacticalMasterReplacementSupport {
  if (
    unit.kind !== "class_feature" ||
    unit.className !== "fighter" ||
    unit.mechanics.family !== "weapon_mastery_property_replacement" ||
    !("replacement" in unit.mechanics)
  ) {
    return null;
  }
  const mechanics = unit.mechanics;
  /* v8 ignore start -- @preserve -- Malformed Tactical Master replacement mechanics are rejected at profile admission; the canonical mastery-choice projection is covered. */
  const supported =
    mechanics.trigger.kind ===
      "attack_with_weapon_mastery_property_you_can_use" &&
    mechanics.replacement.timing === "for_that_attack" &&
    TACTICAL_MASTER_REPLACEMENT_MASTERY_PROPERTIES.length ===
      mechanics.replacement.chooseOne.length &&
    TACTICAL_MASTER_REPLACEMENT_MASTERY_PROPERTIES.every(
      (property, index) => mechanics.replacement.chooseOne[index] === property,
    );
  return supported
    ? {
        kind: TACTICAL_MASTER_REPLACEMENT_SUPPORT_PROFILE,
        replacementProperties: TACTICAL_MASTER_REPLACEMENT_MASTERY_PROPERTIES,
      }
    : "unsupported";
  /* v8 ignore stop -- @preserve */
}

function parseBattleUnitSupportClassLevels(
  classLevels: readonly CharacterBattleClassLevelInit[],
): readonly CharacterBattleClassLevel[] {
  return classLevels.map((entry) => ({
    className: entry.className,
    level: classLevel(entry.level),
  }));
}

function parseDruidWildShapeKnownFormUnitFeatureProfile(
  unit: AuthoredUnitSource,
  classLevels: readonly CharacterBattleClassLevel[],
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "druidWildShapeKnownForm" }
> | null {
  const support = battleDruidWildShapeKnownFormSupportForUnitAtClassLevels(
    unit,
    classLevels,
  );
  if (support === null || support === "unsupported") {
    return null;
  }
  return { ...support, unit };
}

function druidWildShapeKnownFormProfileForTemplate(
  template: DruidWildShapeProcedureTemplate,
  classLevel: ClassLevel,
): BattleDruidWildShapeKnownFormSupportProfile {
  const knownFormRoster = template.knownFormRoster;
  return {
    kind: DRUID_WILD_SHAPE_KNOWN_FORM_SUPPORT_PROFILE,
    classLevel,
    knownFormRoster: {
      creatureType: knownFormRoster.creatureType,
      count: classLevelTotalChoicesAtLevel(
        knownFormRoster.count.levels,
        classLevel,
      ),
      maxChallengeRating: thresholdTierNumberAtClassLevel(
        knownFormRoster.maxChallengeRating,
        classLevel,
      ),
      flySpeed:
        Number(classLevel) >= knownFormRoster.flySpeed.atLevel
          ? "allowed"
          : "forbidden",
    },
  };
}

function classLevelTotalChoicesAtLevel(
  levels: DruidWildShapeProcedureTemplate["knownFormRoster"]["count"]["levels"],
  classLevel: ClassLevel,
): number {
  return levels.reduce(
    (total, tier) => (Number(classLevel) >= tier.atLevel ? tier.total : total),
    0,
  );
}

function thresholdTierNumberAtClassLevel(
  threshold: DruidWildShapeProcedureTemplate["knownFormRoster"]["maxChallengeRating"],
  classLevel: ClassLevel,
): number {
  return threshold.tiers.reduce<number>(
    (value, tier) => (Number(classLevel) >= tier.atLevel ? tier.value : value),
    threshold.base,
  );
}

function parseBardicInspirationGrantUnitFeatureProfile(
  unit: AuthoredUnitSource,
  classLevels: readonly CharacterBattleClassLevel[],
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "bardicInspirationGrant" }
> | null {
  /* v8 ignore start -- @preserve -- Unsupported structured input: Bardic Inspiration grant execution is admitted only from a Bard class-feature record. */
  if (unit.kind !== "class_feature" || unit.className !== "bard") {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  const classLevel = findCharacterClassLevel(classLevels, unit.className);
  /* v8 ignore start -- @preserve -- Unsupported character/profile pairing: admission requires the Bard level at or above acquisition. */
  if (classLevel === undefined || classLevel < unit.acquiredAtLevel) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Unsupported structured input: Bardic Inspiration grant owns activation mechanics; other mechanics families are rejected before projection. */
  if (unit.mechanics.family !== "activation") {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  const mechanics = unit.mechanics;
  const range = mechanics.range;
  /* v8 ignore start -- @preserve -- Unsupported structured input: this profile owns the exact Bonus Action, 60-foot target, Charisma use-count, Long Rest, one-phase activation shape. */
  if (
    mechanics.activationCost.kind !== "bonus_action" ||
    range === undefined ||
    range.kind !== "point" ||
    range.feet !== BARDIC_INSPIRATION_RANGE_FEET ||
    mechanics.resource?.kind !== "use_count" ||
    mechanics.resource.cap.kind !== "ability_modifier" ||
    mechanics.resource.cap.ability !== "cha" ||
    mechanics.resource.cap.minimum !== 1 ||
    mechanics.resetCadence?.kind !== "long_rest" ||
    mechanics.phases.length !== 1
  ) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  const phase = mechanics.phases[0];
  /* v8 ignore start -- @preserve -- Unsupported structured input: the grant must be one direct target-attached effect with single-target selection. */
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "target" ||
    phase.attachment.selection.mode !== "one" ||
    phase.effects?.length !== 1
  ) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  const effect = phase.effects[0];
  /* v8 ignore start -- @preserve -- Unsupported structured input: the granted token must match the SRD failed-D20-test, one-hour, class-threshold die shape. */
  if (
    effect?.kind !== "grant_die_token" ||
    effect.maxHeld !== 1 ||
    effect.trigger !== "failed_d20_test" ||
    effect.duration.unit !== "hour" ||
    effect.duration.amount !== 1 ||
    effect.die.kind !== "threshold_tiers" ||
    effect.die.axis !== "class" ||
    effect.die.base.dice !== 1
  ) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(effect.duration);
  const dieSize = bardicInspirationDieSizeAtClassLevel(effect.die, classLevel);
  /* v8 ignore start -- @preserve -- Unsupported structured input: the threshold die table or duration failed its typed SRD projection. */
  if (dieSize === null || Result.isFailure(durationTicks)) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  return {
    kind: "bardicInspirationGrant",
    unit,
    rangeFeet: movementFeet(BARDIC_INSPIRATION_RANGE_FEET),
    dieSize,
    durationTicks: durationTicks.success,
    spends: { resourceUnitId: unit.id, amount: 1 },
  };
}

function bardicInspirationDieSizeAtClassLevel(
  die: ThresholdTierDieAmount,
  classLevel: ClassLevel,
): BardicInspirationDieSize | null {
  if (!isSrdBardicInspirationDieTable(die)) {
    return null;
  }
  return bardicInspirationSrdDieSizeAtClassLevel(classLevel);
}

function isSrdBardicInspirationDieTable(die: ThresholdTierDieAmount): boolean {
  return thresholdTierDieTableMatches(die, {
    baseDieSize: BARDIC_INSPIRATION_BASE_DIE_SIZE,
    tiers: BARDIC_INSPIRATION_DIE_TIERS,
  });
}

function isSrdMartialArtsDieTable(die: ThresholdTierDieAmount): boolean {
  return thresholdTierDieTableMatches(die, {
    baseDieSize: MARTIAL_ARTS_BASE_DIE_SIZE,
    tiers: MARTIAL_ARTS_DIE_TIERS,
  });
}

function thresholdTierDieTableMatches(
  die: ThresholdTierDieAmount,
  expected: {
    readonly baseDieSize: DamageDieSize;
    readonly tiers: ReadonlyArray<{
      readonly atLevel: number;
      readonly dieSize: DamageDieSize;
    }>;
  },
): boolean {
  if (
    die.base.dice !== 1 ||
    die.base.dieSize !== expected.baseDieSize ||
    die.base.flat !== undefined ||
    die.base.spellcastingMod !== undefined ||
    die.base.abilityModifier !== undefined ||
    die.tiers.length !== expected.tiers.length
  ) {
    return false;
  }

  return expected.tiers.every((expectedTier) =>
    die.tiers.some((tier) => thresholdDieTierMatches(tier, expectedTier)),
  );
}

function thresholdDieTierMatches(
  tier: ThresholdTierDieAmount["tiers"][number],
  expected: { readonly atLevel: number; readonly dieSize: DamageDieSize },
): boolean {
  return (
    tier.atLevel === expected.atLevel &&
    tier.override.dice === undefined &&
    tier.override.flat === undefined &&
    tier.override.dieSize === expected.dieSize
  );
}

function bardicInspirationSrdDieSizeAtClassLevel(
  classLevel: ClassLevel,
): BardicInspirationDieSize {
  return (
    BARDIC_INSPIRATION_DIE_TIERS.filter(
      (candidate) => classLevel >= candidate.atLevel,
    )
      .sort((left, right) => left.atLevel - right.atLevel)
      .at(-1)?.dieSize ?? BARDIC_INSPIRATION_BASE_DIE_SIZE
  );
}

function parseExtraActionGrantUnitFeatureProfile(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "extraActionGrant" }
> | null {
  /* v8 ignore start -- @preserve -- Unsupported structured input: extra-action grant execution is admitted only from a class-feature record. */
  if (unit.kind !== "class_feature") {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  const mechanics = unit.mechanics;
  /* v8 ignore start -- @preserve -- Unsupported structured input: this profile owns a free activation with use-count, Short/Long Rest reset, and once-per-turn usage. */
  if (
    mechanics.family !== "activation" ||
    mechanics.activationCost.kind !== "free" ||
    mechanics.resource?.kind !== "use_count" ||
    mechanics.resetCadence?.kind !== "short_or_long_rest" ||
    mechanics.usageLimit?.kind !== "once_per_turn"
  ) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Unsupported structured input: extra-action grant owns exactly one activation phase. */
  if (mechanics.phases.length !== 1) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  const phase = mechanics.phases[0];
  /* v8 ignore start -- @preserve -- Unsupported structured input: the sole extra-action phase must be direct. */
  if (phase?.kind !== "direct") {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Unsupported structured input: the direct phase must contain exactly one effect. */
  if (phase.effects?.length !== 1) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  const effect = phase.effects[0];
  /* v8 ignore start -- @preserve -- Unsupported structured input: the sole effect must grant the extra action projected by this profile. */
  if (effect.kind !== "grant_extra_action") {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  return {
    kind: "extraActionGrant",
    unit,
    restriction: effect.restriction,
  };
}

function parseRetaliationReactionAttackUnitFeatureProfile(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "retaliationReactionAttack" }
> | null {
  const support = battleRetaliationReactionAttackSupportForUnit(unit);
  return support === null || support === "unsupported"
    ? null
    : {
        kind: RETALIATION_REACTION_ATTACK_SUPPORT_PROFILE,
        unit,
        retaliation: support.retaliation,
      };
}

export function battleRetaliationReactionAttackSupportForUnit(
  unit: AuthoredUnitSource,
): BattleRetaliationReactionAttackSupport {
  if (unit.kind !== "class_feature") {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.family !== "activation" ||
    mechanics.activationCost.kind !== "reaction"
  ) {
    return null;
  }
  const activationTrigger = mechanics.activationCost.trigger;
  if (
    !isRecord(activationTrigger) ||
    activationTrigger["kind"] !== "takes_damage_from_creature"
  ) {
    return null;
  }
  /* v8 ignore start -- @preserve -- Malformed Retaliation reaction mechanics are rejected at profile admission; the canonical one-attack reaction projection is covered. */
  if (activationTrigger["rangeFeet"] !== 5 || mechanics.phases.length !== 1) {
    return "unsupported";
  }
  const phase = mechanics.phases[0];
  const phaseEffects =
    phase?.kind === "direct" ? (phase.effects ?? []) : undefined;
  if (
    phase?.kind !== "direct" ||
    phaseEffects?.length !== 1 ||
    phase.attachment.kind !== "self"
  ) {
    return "unsupported";
  }
  const effect = phaseEffects[0];
  if (effect?.kind !== "grant_extra_action") {
    return "unsupported";
  }
  const restriction = effect.restriction;
  if (restriction.kind !== "allow_only" || restriction.actions.length !== 1) {
    return "unsupported";
  }
  const action = restriction.actions[0];
  if (
    action?.action !== "attack" ||
    action.attackLimit?.kind !== "attack_count" ||
    action.attackLimit.count !== 1
  ) {
    return "unsupported";
  }
  /* v8 ignore stop -- @preserve */
  return {
    kind: RETALIATION_REACTION_ATTACK_SUPPORT_PROFILE,
    retaliation: {
      trigger: {
        kind: "takesDamageFromCreatureWithinFiveFeet",
        rangeFeet: 5,
      },
      response: {
        kind: "oneMeleeWeaponOrUnarmedStrikeAgainstDamageSource",
        actionCost: "reaction",
      },
    },
  };
}

function parseSelfBonusActionHealingUnitFeatureProfile(
  unit: AuthoredUnitSource,
  classLevels: readonly CharacterBattleClassLevel[],
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "selfBonusActionHealing" }
> | null {
  /* v8 ignore start -- @preserve -- Unsupported structured input: this support profile is class-feature-only; other authored unit families are rejected before projection. */
  if (unit.kind !== "class_feature") {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  const classLevel = findCharacterClassLevel(classLevels, unit.className);
  /* v8 ignore start -- @preserve -- Unsupported character/profile pairing: admission requires the owning class level at or above the feature's acquisition level. */
  if (classLevel === undefined || classLevel < unit.acquiredAtLevel) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  const mechanics = unit.mechanics;
  /* v8 ignore start -- @preserve -- Unsupported structured input: self Bonus Action healing owns one activation, use-count, reset-cadence, and direct-phase shape. The admitted healing projection remains measured below. */
  if (
    mechanics.family !== "activation" ||
    mechanics.activationCost.kind !== "bonus_action" ||
    mechanics.resource?.kind !== "use_count" ||
    mechanics.resetCadence?.kind !== "partial_short_full_long" ||
    mechanics.phases.length !== 1
  ) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  const phase = mechanics.phases[0];
  /* v8 ignore start -- @preserve -- Unsupported structured input: the healing phase must be one direct self-attached effect; other phase shapes are rejected at profile admission. */
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "self" ||
    phase.effects?.length !== 1
  ) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  const effect = phase.effects[0];
  /* v8 ignore start -- @preserve -- Unsupported structured input: this profile admits the exact self-healing linear-per-class-level dice shape; malformed or differently-scaled healing atoms are rejected. */
  if (
    effect?.kind !== "heal_hp" ||
    effect.target !== "self" ||
    effect.amount.kind !== "linear_per_level" ||
    effect.amount.axis !== "class" ||
    effect.amount.perLevel.dice !== undefined ||
    effect.amount.perLevel.dieSize !== undefined ||
    effect.amount.base.dice === undefined ||
    effect.amount.base.dieSize === undefined
  ) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  return {
    kind: "selfBonusActionHealing",
    unit,
    dice: effect.amount.base.dice,
    dieSize: effect.amount.base.dieSize,
    flatBase: effect.amount.base.flat ?? 0,
    flatPerLevel: effect.amount.perLevel.flat ?? 0,
    startingAtLevel: effect.amount.startingAtLevel,
    className: unit.className,
    classLevel,
  };
}

function parseOngoingFeatureUnitFeatureProfile(
  unit: AuthoredUnitSource,
  classLevels: readonly CharacterBattleClassLevel[],
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "ongoingFeature" }
> | null {
  /* v8 ignore start -- @preserve -- Unsupported structured input: ongoing feature execution is admitted only from a class-feature record. */
  if (unit.kind !== "class_feature") {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  const mechanics = unit.mechanics;
  /* v8 ignore start -- @preserve -- Unsupported structured input: an ongoing feature owns exactly one activation phase and an explicit lifecycle block; other mechanics families are rejected. */
  if (
    mechanics.family !== "activation" ||
    !("ongoingFeature" in mechanics) ||
    mechanics.ongoingFeature === undefined ||
    mechanics.phases.length !== 1
  ) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  const phase = mechanics.phases[0];
  /* v8 ignore start -- @preserve -- Unsupported structured input: ongoing feature effects must be a non-empty direct self-attached phase before their typed effect parser runs. */
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "self" ||
    phase.effects === undefined ||
    phase.effects.length === 0
  ) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  const classLevel = findCharacterClassLevel(classLevels, unit.className);
  if (classLevel === undefined || classLevel < unit.acquiredAtLevel) {
    return null;
  }
  const effects = phase.effects.flatMap((effect): readonly EffectAtom[] =>
    isEffectAtom(effect) ? [effect] : [],
  );
  if (effects.length !== phase.effects.length) {
    return null;
  }
  const parsedEffects =
    parseOngoingFeatureEffects(effects, classLevel) ??
    parseSpellBenefitActivationProjectionEffects(effects);
  /* v8 ignore start -- @preserve -- Unsupported structured input: neither the ongoing-effect parser nor the spell-benefit activation parser admitted this effect list. */
  if (parsedEffects === null) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  const override = mechanics.ongoingFeature.levelOverrides
    ?.filter((candidate) => classLevel >= candidate.atClassLevel)
    .at(-1);
  const support = mechanics.ongoingFeature;
  const lifecycle = override?.lifecycle ?? support.lifecycle;
  const activation =
    support.activationTiming === "activation_cost"
      ? mechanics.activationCost.kind === "bonus_action" &&
        "resource" in mechanics &&
        mechanics.resource !== undefined
        ? {
            trigger: "bonusAction" as const,
            spendsUse: mechanics.resource.cap.kind !== "unlimited",
          }
        : null
      : mechanics.activationCost.kind === "free"
        ? { trigger: "firstAttackRoll" as const, spendsUse: false }
        : null;
  /* v8 ignore start -- @preserve -- Unsupported structured input: activation timing and cost did not form either the Bonus Action or first-attack trigger owned by this profile. */
  if (activation === null) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  const lifecycleProfile = parseOngoingFeatureLifecycle(lifecycle);
  /* v8 ignore start -- @preserve -- Unsupported structured input: the lifecycle block did not parse into a supported turn-boundary, extended, or fixed duration. */
  if (lifecycleProfile === null) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  const actionRestrictions = support.actionRestrictions ?? [];
  return {
    kind: "ongoingFeature",
    unit,
    activationTrigger: activation.trigger,
    spendsUse: activation.spendsUse,
    lifecycle: lifecycleProfile,
    ...(support.concentrationEffect === undefined
      ? {}
      : { concentrationEffect: "breakAndPrevent" as const }),
    actionRestrictions,
    ...parsedEffects,
  };
}

function parseAttackDamageRiderUnitFeatureProfile(
  unit: AuthoredUnitSource,
  classLevels: readonly CharacterBattleClassLevel[],
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "attackDamageRider" }
> | null {
  const mechanics = attackDamageRiderMechanicsProjection(unit);
  /* v8 ignore start -- @preserve -- Unsupported structured input: attack-damage riders require a class-feature record whose mechanics projection parsed successfully. */
  if (unit.kind !== "class_feature" || mechanics === null) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  const classLevel = findCharacterClassLevel(classLevels, unit.className);
  /* v8 ignore start -- @preserve -- Unsupported character/profile pairing: admission requires the owning class level at or above acquisition. */
  if (classLevel === undefined || classLevel < unit.acquiredAtLevel) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  if (mechanics.optional === true) {
    return {
      kind: "attackDamageRider",
      unit,
      optional: true,
      usageLimit: "oncePerTurn",
      trigger: mechanics.trigger,
      eligibility: mechanics.eligibility,
      classLevel,
      dice: mechanics.dice,
    };
  }
  return {
    kind: "attackDamageRider",
    unit,
    optional: false,
    usageLimit: "oncePerTurn",
    trigger: mechanics.trigger,
    classLevel,
    dice: mechanics.dice,
  };
}

function parseSaveDamageReplacementUnitFeatureProfile(
  unit: AuthoredUnitSource,
  classLevels: readonly CharacterBattleClassLevel[],
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "saveDamageReplacement" }
> | null {
  const mechanics = saveDamageReplacementMechanicsProjection(unit);
  /* v8 ignore start -- @preserve -- Unsupported structured input: save-damage replacement requires a class-feature record whose mechanics projection parsed successfully. */
  if (unit.kind !== "class_feature" || mechanics === null) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  const classLevel = findCharacterClassLevel(classLevels, unit.className);
  /* v8 ignore start -- @preserve -- Unsupported character/profile pairing: admission requires the owning class level at or above acquisition. */
  if (classLevel === undefined || classLevel < unit.acquiredAtLevel) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  return {
    kind: "saveDamageReplacement",
    unit,
    ability: mechanics.ability,
    requiredSuccessDamage: "half",
    onSuccess: "none",
    onFail: "half",
    suppressedByCondition: "incapacitated",
  };
}

function parseReactionRollOrDamageReductionUnitFeatureProfile(
  unit: AuthoredUnitSource,
  classLevels: readonly CharacterBattleClassLevel[],
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "reactionRollOrDamageReduction" }
> | null {
  /* v8 ignore start -- @preserve -- Unsupported structured input: reaction roll/damage reduction execution is admitted only from a class-feature record. */
  if (unit.kind !== "class_feature") {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  const classLevel = findCharacterClassLevel(classLevels, unit.className);
  /* v8 ignore start -- @preserve -- Unsupported character/profile pairing: admission requires the owning class level at or above acquisition. */
  if (classLevel === undefined || classLevel < unit.acquiredAtLevel) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  const modifiers = reactionRollOrDamageReductionMechanicsProjection(
    unit,
    classLevel,
  );
  /* v8 ignore start -- @preserve -- Unsupported structured input: the reaction modifier mechanics did not parse into a supported roll or damage reduction. */
  if (modifiers === null) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  return {
    kind: "reactionRollOrDamageReduction",
    unit,
    classLevel,
    modifiers,
  };
}

function parsePassiveArmorClassBonusUnitFeatureProfile(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "passiveArmorClassBonus" }
> | null {
  const armorClass = passiveArmorClassBonusProfileForUnit(unit);
  return armorClass === null
    ? null
    : {
        kind: "passiveArmorClassBonus",
        unit,
        armorClass,
      };
}

function parsePassiveRangedAttackRollBonusUnitFeatureProfile(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "passiveRangedAttackRollBonus" }
> | null {
  const attackRoll = passiveRangedAttackRollBonusProfileForUnit(unit);
  return attackRoll === null
    ? null
    : {
        kind: "passiveRangedAttackRollBonus",
        unit,
        attackRoll,
      };
}

function parseInitiativeProficiencyAndSwapUnitFeatureProfile(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "initiativeProficiencyAndSwap" }
> | null {
  const initiative = initiativeProficiencyAndSwapProfileForUnit(unit);
  return initiative === null
    ? null
    : {
        kind: "initiativeProficiencyAndSwap",
        unit,
        initiative,
      };
}

function parsePassiveSpeedBonusUnitFeatureProfile(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "passiveSpeedBonus" }
> | null {
  const speed = passiveSpeedBonusProfileForUnit(unit);
  return speed === null
    ? null
    : {
        kind: "passiveSpeedBonus",
        unit,
        speed,
      };
}

function parsePassiveSavingThrowRollModeUnitFeatureProfile(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "passiveSavingThrowRollMode" }
> | null {
  const savingThrow = passiveSavingThrowRollModeProfileForUnit(unit);
  return savingThrow === null
    ? null
    : {
        kind: "passiveSavingThrowRollMode",
        unit,
        savingThrow,
      };
}

function parsePassiveAbilityCheckRollModeUnitFeatureProfile(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "passiveAbilityCheckRollMode" }
> | null {
  const abilityCheck = passiveAbilityCheckRollModeProfileForUnit(unit);
  return abilityCheck === null
    ? null
    : {
        kind: "passiveAbilityCheckRollMode",
        unit,
        abilityCheck,
      };
}

function parsePassiveSpeedKindGrantsUnitFeatureProfile(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "passiveSpeedKindGrants" }
> | null {
  const speedKindGrants = passiveSpeedKindGrantsProfileForUnit(unit);
  return speedKindGrants === null
    ? null
    : {
        kind: "passiveSpeedKindGrants",
        unit,
        speedKindGrants,
      };
}

function parseAcrobaticMovementUnitFeatureProfile(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "acrobaticMovement" }
> | null {
  const acrobaticMovement = acrobaticMovementProfileForUnit(unit);
  return acrobaticMovement === null
    ? null
    : {
        kind: "acrobaticMovement",
        unit,
        acrobaticMovement,
      };
}

function parseCreatureSpaceMovementPermissionUnitFeatureProfile(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "creatureSpaceMovementPermission" }
> | null {
  const permission = creatureSpaceMovementPermissionProfileForUnit(unit);
  return permission === null
    ? null
    : {
        kind: "creatureSpaceMovementPermission",
        unit,
        permission,
      };
}

function parseHideActionObscurementPermissionUnitFeatureProfile(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "hideActionObscurementPermission" }
> | null {
  const permission = hideActionObscurementPermissionProfileForUnit(unit);
  return permission === null
    ? null
    : {
        kind: "hideActionObscurementPermission",
        unit,
        permission,
      };
}

function parseAttackRollMissToHitReplacementUnitFeatureProfile(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "attackRollMissToHitReplacement" }
> | null {
  const replacement = attackRollMissToHitReplacementProfileForUnit(unit);
  return replacement === null
    ? null
    : {
        kind: "attackRollMissToHitReplacement",
        unit,
        replacement,
      };
}

function parseWeaponDamageDiceRollChoiceUnitFeatureProfile(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "weaponDamageDiceRollChoice" }
> | null {
  const damageDiceChoice = weaponDamageDiceRollChoiceProfileForUnit(unit);
  return damageDiceChoice === null
    ? null
    : {
        kind: "weaponDamageDiceRollChoice",
        unit,
        damageDiceChoice,
      };
}

function parseAttackDamageDieFloorUnitFeatureProfile(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "attackDamageDieFloor" }
> | null {
  const damageDieFloor = attackDamageDieFloorProfileForUnit(unit);
  return damageDieFloor === null
    ? null
    : {
        kind: "attackDamageDieFloor",
        unit,
        damageDieFloor,
      };
}

function parseLightExtraAttackDamageAbilityModifierUnitFeatureProfile(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "lightExtraAttackDamageAbilityModifier" }
> | null {
  const damageAbilityModifier =
    lightExtraAttackDamageAbilityModifierProfileForUnit(unit);
  return damageAbilityModifier === null
    ? null
    : {
        kind: "lightExtraAttackDamageAbilityModifier",
        unit,
        damageAbilityModifier,
      };
}

export function findCharacterClassLevel(
  classLevels: readonly CharacterBattleClassLevel[],
  className: ClassName,
): ClassLevel | undefined {
  return classLevels.find((classLevel) => classLevel.className === className)
    ?.level;
}

export function requireCharacterClassLevel(
  classLevels: readonly CharacterBattleClassLevel[],
  className: ClassName,
): ClassLevel {
  const classLevel = findCharacterClassLevel(classLevels, className);
  if (classLevel === undefined) {
    throw new Error(
      `Character class feature resource requires a ${className} class level.`,
    );
  }
  return classLevel;
}

type OngoingFeatureActivationMechanics = Extract<
  ActivatedAbilityMechanics,
  { readonly ongoingFeature: { readonly activationTiming: string } }
>;

type OngoingFeatureLifecycleSupport =
  OngoingFeatureActivationMechanics["ongoingFeature"]["lifecycle"];

function parseOngoingFeatureLifecycle(
  lifecycle: OngoingFeatureLifecycleSupport,
): OngoingFeatureLifecycleProfile | null {
  return Match.value(lifecycle).pipe(
    Match.when({ kind: "turn_boundary" }, (turnBoundary) => {
      const earlyEndConditions = parseOngoingFeatureEarlyEndConditions(
        turnBoundary.earlyEndConditions ?? [],
      );
      const earlyEndArmorCategories = parseOngoingFeatureArmorCategories(
        turnBoundary.earlyEndArmorCategories ?? [],
      );
      return earlyEndConditions === null || earlyEndArmorCategories === null
        ? null
        : {
            kind: "turnBoundary" as const,
            initialExpiration: "startOfNextTurn" as const,
            earlyEndConditions,
            earlyEndArmorCategories,
            extensionTriggers: [] as const,
          };
    }),
    Match.when({ kind: "round_extended" }, (roundExtended) => {
      const [firstTrigger, ...remainingTriggers] =
        roundExtended.extensionTriggers;
      const maximumDurationRounds = durationToRounds(
        roundExtended.maximumDuration,
      );
      const earlyEndConditions = parseOngoingFeatureEarlyEndConditions(
        roundExtended.earlyEndConditions ?? [],
      );
      const earlyEndArmorCategories = parseOngoingFeatureArmorCategories(
        roundExtended.earlyEndArmorCategories ?? [],
      );
      if (
        maximumDurationRounds === null ||
        earlyEndConditions === null ||
        earlyEndArmorCategories === null
      ) {
        return null;
      }
      const supportedExtensionTriggers = [
        parseOngoingFeatureExtensionTrigger(firstTrigger),
        ...remainingTriggers.map(parseOngoingFeatureExtensionTrigger),
      ] as const satisfies readonly [
        OngoingFeatureExtensionTrigger,
        ...OngoingFeatureExtensionTrigger[],
      ];
      return {
        kind: "roundExtended" as const,
        initialExpiration: "endOfNextTurn" as const,
        maximumDurationRounds,
        earlyEndConditions,
        earlyEndArmorCategories,
        extensionTriggers: supportedExtensionTriggers,
      };
    }),
    Match.when({ kind: "fixed_duration" }, (fixedDuration) => {
      const maximumDurationRounds = durationToRounds(fixedDuration.duration);
      const earlyEndConditions = parseOngoingFeatureEarlyEndConditions(
        fixedDuration.earlyEndConditions ?? [],
      );
      const earlyEndArmorCategories = parseOngoingFeatureArmorCategories(
        fixedDuration.earlyEndArmorCategories ?? [],
      );
      return maximumDurationRounds === null ||
        earlyEndConditions === null ||
        earlyEndArmorCategories === null
        ? null
        : {
            kind: "fixedDuration" as const,
            maximumDurationRounds,
            earlyEndConditions,
            earlyEndArmorCategories,
            extensionTriggers: [] as const,
          };
    }),
    Match.exhaustive,
  );
}

function parseOngoingFeatureExtensionTrigger(
  trigger: "attack_roll_against_enemy" | "bonus_action" | "enemy_saving_throw",
): "attackRollAgainstEnemy" | "bonusAction" | "enemySavingThrow" {
  if (trigger === "attack_roll_against_enemy") return "attackRollAgainstEnemy";
  if (trigger === "bonus_action") return "bonusAction";
  return "enemySavingThrow";
}

function parseOngoingFeatureEarlyEndConditions(
  conditions: readonly string[],
): readonly Condition[] | null {
  const parsed: Condition[] = [];
  for (const condition of conditions) {
    const parsedCondition = ALL_CONDITIONS.find(
      (candidate) => candidate === condition,
    );
    if (parsedCondition === undefined) {
      return null;
    }
    parsed.push(parsedCondition);
  }
  return parsed;
}

function parseOngoingFeatureArmorCategories(
  categories: readonly string[],
): readonly ["heavy"] | readonly [] | null {
  if (categories.length === 0) return [];
  if (categories.length === 1 && categories[0] === "heavy") return ["heavy"];
  return null;
}

function durationToRounds(duration: {
  readonly unit: "round" | "minute" | "hour" | "day";
  readonly amount: number;
}): number | null {
  const ticks = elapsedTimeTicksFromTimeSpanDuration(duration);
  /* v8 ignore next -- @preserve -- Unsupported structured input: admitted ongoing-feature durations use positive Surface time spans convertible to whole combat rounds. */
  if (Result.isFailure(ticks)) {
    return null;
  }
  return Number(ticks.success);
}

function parseOngoingFeatureEffects(
  effects: readonly EffectAtom[],
  classLevel: ClassLevel,
): Pick<
  Extract<SupportedUnitFeatureProfile, { readonly kind: "ongoingFeature" }>,
  "rollModifiers" | "spellModifiers" | "damageModifiers" | "resistances"
> | null {
  const rollModifiers: OngoingFeatureRollModifier[] = [];
  const spellModifiers: OngoingFeatureSpellModifier[] = [];
  const damageModifiers: OngoingFeatureDamageModifier[] = [];
  const resistances: DamageType[] = [];
  for (const effect of effects) {
    if (
      effect.kind === "grant_resistance" &&
      typeof effect.damageType === "string"
    ) {
      /* v8 ignore start -- @preserve -- Unsupported structured input: the ongoing-feature support profile admits an unfiltered resistance grant only. Source-filtered resistance records are rejected at this admission boundary; admitted resistance projection remains measured below. */
      if ("sourceFilter" in effect && effect.sourceFilter !== undefined) {
        return null;
      }
      /* v8 ignore stop -- @preserve */
      resistances.push(effect.damageType);
      continue;
    }
    if (
      effect.kind === "modify_roll_advantage" &&
      effect.on.includes("attack_roll")
    ) {
      /* v8 ignore start -- @preserve -- Unsupported structured input: this profile admits an attack-roll-only modifier, so a mixed roll-target list is rejected before projection. */
      if (effect.on.some((target) => target !== "attack_roll")) {
        return null;
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Unsupported structured input: attacker, skill, condition, save, range, count, and expiry filters are outside this ongoing-feature profile. The supported optional ability-filter projection remains measured after this guard. */
      if (
        ("attackerTypeFilter" in effect &&
          effect.attackerTypeFilter !== undefined) ||
        ("skillFilter" in effect && effect.skillFilter !== undefined) ||
        ("conditionFilter" in effect && effect.conditionFilter !== undefined) ||
        ("abilityFilter" in effect &&
          effect.abilityFilter !== undefined &&
          !Array.isArray(effect.abilityFilter)) ||
        ("saveAbilityFilter" in effect &&
          effect.saveAbilityFilter !== undefined) ||
        ("saveSourceFilter" in effect &&
          effect.saveSourceFilter !== undefined) ||
        ("contextRangeFeet" in effect &&
          effect.contextRangeFeet !== undefined) ||
        ("count" in effect && effect.count !== undefined) ||
        ("expiresOn" in effect && effect.expiresOn !== undefined)
      ) {
        return null;
      }
      /* v8 ignore stop -- @preserve */
      const abilityFilter: readonly Ability[] | undefined =
        "abilityFilter" in effect && Array.isArray(effect.abilityFilter)
          ? effect.abilityFilter
          : undefined;
      const rollModifier: OngoingFeatureRollModifier = {
        mode: effect.mode,
        affects:
          effect.affects === "rolls_against_self"
            ? "rollsAgainstSelf"
            : "selfRoll",
        on: "attackRoll",
        ...optionalProperty("abilityFilter", abilityFilter),
      };
      rollModifiers.push(rollModifier);
      continue;
    }
    if (effect.kind === "modify_damage_numeric") {
      /* v8 ignore start -- @preserve -- Unsupported structured input: this profile admits either no weapon filter or the typed weapon-category filter; other structured filter shapes are rejected at admission. */
      if (
        effect.weaponFilter !== undefined &&
        effect.weaponFilter.kind !== "weapon_category"
      ) {
        return null;
      }
      /* v8 ignore stop -- @preserve */
      const amount = numericDeltaForClassLevel(effect.delta, classLevel);
      /* v8 ignore start -- @preserve -- Unsupported structured input: numericDeltaForClassLevel admits only the fixed-number and class-threshold shapes projected by this profile. */
      if (amount === null) {
        return null;
      }
      /* v8 ignore stop -- @preserve */
      damageModifiers.push({
        amount,
        ...optionalProperty("abilityFilter", effect.abilityFilter),
        ...(effect.weaponFilter?.kind === "weapon_category"
          ? { weaponUsageFilter: effect.weaponFilter.category }
          : {}),
      });
      continue;
    }
    /* v8 ignore next -- @preserve -- Unsupported structured input: every effect kind owned by this ongoing-feature profile is handled above; unrelated effect atoms are rejected at admission. */
    return null;
  }
  return rollModifiers.length === 0 &&
    damageModifiers.length === 0 &&
    resistances.length === 0
    ? parseSpellBenefitActivationProjectionEffects(effects)
    : { rollModifiers, spellModifiers, damageModifiers, resistances };
}

function parseSpellBenefitActivationProjectionEffects(
  effects: readonly EffectAtom[],
): Pick<
  Extract<SupportedUnitFeatureProfile, { readonly kind: "ongoingFeature" }>,
  "rollModifiers" | "spellModifiers" | "damageModifiers" | "resistances"
> | null {
  /* v8 ignore start -- @preserve -- Unsupported structured input: the spell-benefit activation profile is defined by exactly one save-DC atom and one spell-attack atom; other cardinalities are rejected before projection. */
  if (effects.length !== 2) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  const saveDc = effects.find((effect) => effect.kind === "modify_save_dc");
  const attackRollAdvantage = effects.find(
    (effect) => effect.kind === "modify_roll_advantage",
  );
  const saveDcModifier = spellSaveDcModifierBenefit(saveDc);
  const attackRollModifier =
    spellAttackRollModeModifierBenefit(attackRollAdvantage);
  /* v8 ignore start -- @preserve -- Unsupported structured input: malformed atom shapes or benefits sourced from different classes cannot form one spell-benefit activation profile. */
  if (
    saveDcModifier === null ||
    attackRollModifier === null ||
    saveDcModifier.sourceClassName !== attackRollModifier.sourceClassName
  ) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  return {
    rollModifiers: [],
    spellModifiers: [
      {
        sourceClassName: saveDcModifier.sourceClassName,
        saveDcBonus: saveDcModifier.saveDcBonus,
        attackRollMode: attackRollModifier.attackRollMode,
      },
    ],
    damageModifiers: [],
    resistances: [],
  };
}

type SpellSaveDcModifierBenefitEffect = {
  readonly kind: "modify_save_dc";
  readonly delta: {
    readonly kind: "fixed_number";
    readonly amount: 1;
    readonly sign: "+";
  };
  readonly spellSourceFilter: unknown;
};

/* v8 ignore start -- @preserve -- Structured-input shape gate: support is admitted only for the exact +1 fixed save-DC atom. Exhaustive malformed field permutations are rejected here; the narrowed profile projection remains measured in spellSaveDcModifierBenefit. */
function isSpellSaveDcModifierBenefitEffect(
  effect: { readonly kind: string } | undefined,
): effect is SpellSaveDcModifierBenefitEffect {
  return (
    effect?.kind === "modify_save_dc" &&
    "delta" in effect &&
    typeof effect.delta === "object" &&
    effect.delta !== null &&
    "kind" in effect.delta &&
    effect.delta.kind === "fixed_number" &&
    "amount" in effect.delta &&
    effect.delta.amount === 1 &&
    "sign" in effect.delta &&
    effect.delta.sign === "+" &&
    "spellSourceFilter" in effect
  );
}
/* v8 ignore stop -- @preserve */

function spellSaveDcModifierBenefit(
  effect: { readonly kind: string } | undefined,
): { readonly sourceClassName: ClassName; readonly saveDcBonus: 1 } | null {
  /* v8 ignore start -- @preserve -- Unsupported structured input: the exact atom shape is narrowed by isSpellSaveDcModifierBenefitEffect before its projection below. */
  if (!isSpellSaveDcModifierBenefitEffect(effect)) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  const sourceClassName = spellSourceFilterClassName(effect.spellSourceFilter);
  /* v8 ignore next -- @preserve -- Unsupported structured input: the admitted spell benefit supplies a typed class-name source filter, so null represents only a caller-mutated filter. */
  return sourceClassName === null ? null : { sourceClassName, saveDcBonus: 1 };
}

type SpellAttackRollModeModifierBenefitEffect = {
  readonly kind: "modify_roll_advantage";
  readonly mode: "advantage";
  readonly on: readonly ["spell_attack_roll"];
  readonly spellSourceFilter: unknown;
};

/* v8 ignore start -- @preserve -- Structured-input shape gate: support is admitted only for the exact spell-attack Advantage atom with no extra fields. Exhaustive malformed field permutations are rejected here; the narrowed projection remains measured in spellAttackRollModeModifierBenefit. */
function isSpellAttackRollModeModifierBenefitEffect(
  effect: { readonly kind: string } | undefined,
): effect is SpellAttackRollModeModifierBenefitEffect {
  return (
    effect?.kind === "modify_roll_advantage" &&
    hasOnlySpellAttackRollModeModifierBenefitFields(effect) &&
    "mode" in effect &&
    effect.mode === "advantage" &&
    "on" in effect &&
    Array.isArray(effect.on) &&
    effect.on.length === 1 &&
    effect.on[0] === "spell_attack_roll" &&
    "spellSourceFilter" in effect
  );
}
/* v8 ignore stop -- @preserve */

function spellAttackRollModeModifierBenefit(
  effect: { readonly kind: string } | undefined,
): {
  readonly sourceClassName: ClassName;
  readonly attackRollMode: "advantage";
} | null {
  /* v8 ignore start -- @preserve -- Unsupported structured input: the exact atom shape is narrowed by isSpellAttackRollModeModifierBenefitEffect before its projection below. */
  if (!isSpellAttackRollModeModifierBenefitEffect(effect)) {
    return null;
  }
  /* v8 ignore stop -- @preserve */
  const sourceClassName = spellSourceFilterClassName(effect.spellSourceFilter);
  /* v8 ignore next -- @preserve -- Unsupported structured input: the admitted spell benefit supplies a typed class-name source filter, so null represents only a caller-mutated filter. */
  return sourceClassName === null
    ? null
    : { sourceClassName, attackRollMode: "advantage" };
}

const SPELL_ATTACK_ROLL_MODE_MODIFIER_BENEFIT_FIELDS = [
  "kind",
  "mode",
  "on",
  "spellSourceFilter",
] as const satisfies ReadonlyArray<string>;
const SPELL_ATTACK_ROLL_MODE_MODIFIER_BENEFIT_FIELD_SET: ReadonlySet<string> =
  new Set(SPELL_ATTACK_ROLL_MODE_MODIFIER_BENEFIT_FIELDS);

function hasOnlySpellAttackRollModeModifierBenefitFields(effect: {
  readonly kind: string;
}): boolean {
  return Object.keys(effect).every((field) =>
    SPELL_ATTACK_ROLL_MODE_MODIFIER_BENEFIT_FIELD_SET.has(field),
  );
}

function spellSourceFilterClassName(
  spellSourceFilter: unknown,
): ClassName | null {
  /* v8 ignore next -- @preserve -- Unsupported structured input: Surface admission supplies an object with one recognized className; the alternatives reject malformed imported atoms. */
  if (
    typeof spellSourceFilter !== "object" ||
    spellSourceFilter === null ||
    !("className" in spellSourceFilter) ||
    typeof spellSourceFilter.className !== "string" ||
    !isClassName(spellSourceFilter.className)
  ) {
    return null;
  }
  return spellSourceFilter.className;
}

const CLASS_NAME_SET: ReadonlySet<string> = new Set(CLASS_NAMES);

function isClassName(value: string): value is ClassName {
  return CLASS_NAME_SET.has(value);
}

function numericDeltaForClassLevel(
  delta: DiceDelta,
  classLevel: ClassLevel,
): number | null {
  if (delta.kind === "fixed_number") {
    return delta.sign === "-" ? -delta.amount : delta.amount;
  }
  if (delta.kind === "threshold_tiers" && delta.axis === "class") {
    const value = delta.tiers.reduce(
      (current, tier) => (classLevel >= tier.atLevel ? tier.value : current),
      delta.base,
    );
    return delta.sign === "-" ? -value : value;
  }
  return null;
}
