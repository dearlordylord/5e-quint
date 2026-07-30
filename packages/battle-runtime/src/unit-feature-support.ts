// RAW-COVERAGE: runtime-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.alternate-action-cost unit-feature.action-surge-resource unit-feature.acrobatic-movement unit-feature.attack-action-area-save-damage-replacement unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-damage-die-floor unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bardic-inspiration-grant unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-delegated-standard-actions unit-feature.bonus-action-ongoing-rage unit-feature.brutal-strike unit-feature.creature-space-movement-permission unit-feature.cunning-strike unit-feature.druid-wild-shape-known-form unit-feature.enemy-zero-hit-point-temporary-hit-points unit-feature.failed-ability-check-resource-boost unit-feature.failed-saving-throw-reroll unit-feature.first-attack-roll-reckless-advantage unit-feature.grappler unit-feature.hide-action-obscurement-permission unit-feature.hunters-prey unit-feature.initiative-proficiency-and-swap unit-feature.innate-sorcery-activation unit-feature.light-extra-attack-damage-ability-modifier unit-feature.magic-action-area-save-damage-healing unit-feature.magic-action-healing-pool unit-feature.magic-action-save-gated-condition unit-feature.martial-arts-attack-projection unit-feature.monk-focus-battle-options unit-feature.open-hand-technique unit-feature.paladin-sacred-weapon unit-feature.passive-ability-check-roll-mode unit-feature.passive-armor-class-bonus unit-feature.passive-damage-resistance unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-saving-throw-roll-mode unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.potent-cantrip unit-feature.reaction-roll-or-damage-reduction unit-feature.retaliation-reaction-attack unit-feature.remarkable-athlete unit-feature.rogue-steady-aim unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.spell-slot-healing-modifier unit-feature.stunning-strike unit-feature.weapon-critical-range-19 unit-feature.weapon-damage-dice-roll-choice unit-feature.weapon-mastery-sap unit-feature.weapon-mastery-topple unit-feature.weapon-mastery-cleave unit-feature.weapon-mastery-push unit-feature.weapon-mastery-slow unit-feature.fighter-tactical-master unit-feature.zero-hit-point-replacement
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.cunning-strike-option-grant
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll
import { Match } from "effect";
import * as Either from "effect/Either";
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
  type MovementDeltaFeet,
  type MovementFeet,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type {
  Ability,
  ActionRestriction,
  AreaShapeSpec,
  ClassName,
  DiceAmount,
  DiceExpr,
  EffectAtom,
  EquipmentPredicate,
  CunningStrikeMechanics,
  SupremeSneakMechanics,
  DragonbornSpeciesSource,
  StandardActionKind,
  AuthoredUnitSource,
} from "@dnd/surface/surface/types";
import { isEffectAtom } from "@dnd/surface/surface/types";
import {
  druidWildShapeKnownFormRosterFromPhase,
  isDruidWildShapeFeatureRecord,
  type DruidWildShapeActivationPhase,
  type DruidWildShapeKnownFormsRoster,
} from "@dnd/surface/surface/druid-wild-shape-readers";
import type { BattleUnitRef } from "./battle-init.ts";
import type {
  CharacterBattleClassLevel,
  CharacterBattleClassLevelInit,
} from "./character-class-level.ts";

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
  BRUTAL_STRIKE_OPTION_IDS,
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
export const PALADIN_CHANNEL_DIVINITY_RESOURCE_UNIT_ID = unitId(
  "paladin_channel_divinity",
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
export type FailedSavingThrowRerollProfile = {
  readonly trigger: "failedSavingThrow";
  readonly reroll: {
    readonly use: "newRoll";
    readonly bonus: {
      readonly kind: "classLevel";
      readonly className: "fighter";
    };
  };
  readonly spends: {
    readonly resourceUnitId: AuthoredUnitSource["id"];
    readonly amount: 1;
  };
  readonly resetCadence: "longRest";
};
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
export type CunningStrikeSurfaceOption =
  CunningStrikeMechanics["options"][number];
export type CunningStrikeOptionGrantSurfaceOption =
  SupremeSneakMechanics["option"];
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
    readonly resourceUnitId: typeof PALADIN_CHANNEL_DIVINITY_RESOURCE_UNIT_ID;
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
export type BrutalStrikeOptionId = (typeof BRUTAL_STRIKE_OPTION_IDS)[number];
export type BrutalStrikeProfile = {
  readonly trigger: {
    readonly kind: "recklessAttackStrengthAttackHit";
    readonly advantageForgone: true;
    readonly attackMustNotHaveDisadvantage: true;
  };
  readonly damage: {
    readonly dice: 1;
    readonly dieSize: 10;
    readonly damageType: "sameAsAttack";
  };
  readonly options: readonly [
    {
      readonly id: "forceful_blow";
      readonly pushFeet: MovementFeet;
      readonly selfMovement: {
        readonly kind: "moveTowardTarget";
        readonly distance: "halfSpeed";
        readonly opportunityAttacks: "doesNotProvoke";
      };
    },
    {
      readonly id: "hamstring_blow";
      readonly deltaFeet: MovementDeltaFeet;
      readonly stacking: "mostRecentOnly";
      readonly expires: "startOfYourNextTurn";
    },
  ];
};
export type BattleBrutalStrikeSupportProfile = {
  readonly kind: typeof BRUTAL_STRIKE_SUPPORT_PROFILE;
  readonly brutalStrike: BrutalStrikeProfile;
};
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
export type BattleMonkFocusBattleOptionsSupportProfile = {
  readonly kind: typeof MONK_FOCUS_BATTLE_OPTIONS_SUPPORT_PROFILE;
  readonly effectSaveDc: {
    readonly kind: "classFeatureAbilitySaveDc";
    readonly base: 8;
    readonly ability: "wis";
  };
  readonly flurryOfBlows: {
    readonly displayName: string;
    readonly focusPointCost: 1;
    readonly strikeCount: 2;
  };
  readonly patientDefense: {
    readonly displayName: string;
    readonly freeAction: "disengage";
    readonly focusPointCost: 1;
    readonly focusActions: readonly ["disengage", "dodge"];
  };
  readonly stepOfTheWind: {
    readonly displayName: string;
    readonly freeAction: "dash";
    readonly focusPointCost: 1;
    readonly focusActions: readonly ["disengage", "dash"];
    readonly jumpDistanceMultiplier: {
      readonly multiplier: 2;
    };
  };
};
export type SupportedDruidWildShapeKnownFormProfile =
  BattleDruidWildShapeKnownFormSupportProfile & {
    readonly unit: AuthoredUnitSource;
  };
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
): Either.Either<never, BattleUnitSupportProfileIssue> {
  return Either.left({ tag: "battleUnitSupportProfileIssue", message });
}

export function battleUnitSupportProfilesForUnit(input: {
  readonly unit: BattleUnitSupportSource;
  readonly classLevels?: readonly CharacterBattleClassLevel[];
  readonly sourceFacts?: BattleUnitSupportProfileSourceFacts;
}): Either.Either<
  readonly BattleUnitSupportProfile[],
  BattleUnitSupportProfileIssue
> {
  const supportProfiles: BattleUnitSupportProfile[] = [];

  const bonusActionStandardActionSupport =
    battleBonusActionStandardActionSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (bonusActionStandardActionSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle bonus-action standard-action Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (bonusActionStandardActionSupport !== null) {
    supportProfiles.push(bonusActionStandardActionSupport);
  }

  const bonusActionDelegatedStandardActionsSupport =
    battleBonusActionDelegatedStandardActionsSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (bonusActionDelegatedStandardActionsSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Bonus Action delegated standard-action Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (bonusActionDelegatedStandardActionsSupport !== null) {
    supportProfiles.push(bonusActionDelegatedStandardActionsSupport);
  }

  if (isClassicNonSrdMechanicsUnit(input.unit)) {
    return Either.right(supportProfiles);
  }

  const criticalRangeSupport =
    battleWeaponOrUnarmedCriticalRange19SupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (criticalRangeSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle critical-range Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (criticalRangeSupport === "criticalRange19") {
    supportProfiles.push(WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE);
  }

  const attackDamageRiderSupport = battleAttackDamageRiderSupportForUnit(
    input.unit,
  );
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (attackDamageRiderSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle attack-damage rider Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (attackDamageRiderSupport === "attackDamageRider") {
    supportProfiles.push(ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE);
  }

  const saveDamageReplacementSupport =
    battleSaveDamageReplacementSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (saveDamageReplacementSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle save-damage replacement Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (saveDamageReplacementSupport === "saveDamageReplacement") {
    supportProfiles.push(SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE);
  }

  const reactionRollOrDamageReductionSupport =
    battleReactionRollOrDamageReductionSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (reactionRollOrDamageReductionSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle reaction roll or damage reduction Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (retaliationReactionAttackSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Retaliation reaction attack Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (retaliationReactionAttackSupport !== null) {
    supportProfiles.push(retaliationReactionAttackSupport);
  }

  const passiveArmorClassBonusSupport =
    battlePassiveArmorClassBonusSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (passiveArmorClassBonusSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle passive Armor Class bonus Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (passiveArmorClassBonusSupport === "passiveArmorClassBonus") {
    supportProfiles.push(PASSIVE_ARMOR_CLASS_BONUS_SUPPORT_PROFILE);
  }

  const passiveRangedAttackRollBonusSupport =
    battlePassiveRangedAttackRollBonusSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (passiveRangedAttackRollBonusSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle passive ranged attack-roll bonus Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (passiveRangedAttackRollBonusSupport !== null) {
    supportProfiles.push(passiveRangedAttackRollBonusSupport);
  }

  const initiativeProficiencyAndSwapSupport =
    battleInitiativeProficiencyAndSwapSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (initiativeProficiencyAndSwapSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Initiative proficiency-and-swap Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (initiativeProficiencyAndSwapSupport !== null) {
    supportProfiles.push(initiativeProficiencyAndSwapSupport);
  }

  const attackRollMissToHitReplacementSupport =
    battleAttackRollMissToHitReplacementSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (attackRollMissToHitReplacementSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle attack-roll miss-to-hit replacement Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (attackRollMissToHitReplacementSupport !== null) {
    supportProfiles.push(attackRollMissToHitReplacementSupport);
  }

  const attackActionAreaSaveDamageReplacementSupport =
    battleAttackActionAreaSaveDamageReplacementSupportForUnit({
      unit: input.unit,
      draconicAncestryDamageType: input.sourceFacts?.draconicAncestryDamageType,
    });
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (attackActionAreaSaveDamageReplacementSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Attack-action area save-damage replacement Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (attackActionAreaSaveDamageReplacementSupport !== null) {
    supportProfiles.push(attackActionAreaSaveDamageReplacementSupport);
  }

  const d20TestNaturalOneRerollSupport =
    battleD20TestNaturalOneRerollSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (d20TestNaturalOneRerollSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle D20 Test natural-1 reroll Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (d20TestNaturalOneRerollSupport !== null) {
    supportProfiles.push(d20TestNaturalOneRerollSupport);
  }

  const passiveSavingThrowRollModeSupport =
    battlePassiveSavingThrowRollModeSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (passiveSavingThrowRollModeSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle passive Saving Throw roll-mode Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (passiveSavingThrowRollModeSupport !== null) {
    supportProfiles.push(passiveSavingThrowRollModeSupport);
  }

  const passiveAbilityCheckRollModeSupport =
    battlePassiveAbilityCheckRollModeSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (passiveAbilityCheckRollModeSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle passive Ability Check roll-mode Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (passiveAbilityCheckRollModeSupport !== null) {
    supportProfiles.push(passiveAbilityCheckRollModeSupport);
  }

  const passiveDamageResistanceSupport =
    battlePassiveDamageResistanceSupportForUnit({
      unit: input.unit,
      draconicAncestryDamageType: input.sourceFacts?.draconicAncestryDamageType,
    });
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (passiveDamageResistanceSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle passive damage Resistance Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (passiveDamageResistanceSupport !== null) {
    supportProfiles.push(passiveDamageResistanceSupport);
  }

  const passiveSpeedBonusSupport = battlePassiveSpeedBonusSupportForUnit(
    input.unit,
  );
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (passiveSpeedBonusSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle passive Speed bonus Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (passiveSpeedBonusSupport !== null) {
    supportProfiles.push(passiveSpeedBonusSupport);
  }

  const passiveSpeedKindGrantsSupport =
    battlePassiveSpeedKindGrantsSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (passiveSpeedKindGrantsSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle passive Speed-kind grants Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (passiveSpeedKindGrantsSupport !== null) {
    supportProfiles.push(passiveSpeedKindGrantsSupport);
  }

  const acrobaticMovementSupport = battleAcrobaticMovementSupportForUnit(
    input.unit,
  );
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (acrobaticMovementSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Acrobatic Movement Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (acrobaticMovementSupport !== null) {
    supportProfiles.push(acrobaticMovementSupport);
  }

  const creatureSpaceMovementPermissionSupport =
    battleCreatureSpaceMovementPermissionSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (creatureSpaceMovementPermissionSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle creature-space movement permission Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (creatureSpaceMovementPermissionSupport !== null) {
    supportProfiles.push(creatureSpaceMovementPermissionSupport);
  }

  const hideActionObscurementPermissionSupport =
    battleHideActionObscurementPermissionSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (hideActionObscurementPermissionSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Hide action obscurement permission Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (hideActionObscurementPermissionSupport !== null) {
    supportProfiles.push(hideActionObscurementPermissionSupport);
  }

  const weaponDamageDiceRollChoiceSupport =
    battleWeaponDamageDiceRollChoiceSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (weaponDamageDiceRollChoiceSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle weapon damage dice roll choice Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (weaponDamageDiceRollChoiceSupport === "weaponDamageDiceRollChoice") {
    supportProfiles.push(WEAPON_DAMAGE_DICE_ROLL_CHOICE_SUPPORT_PROFILE);
  }

  const attackDamageDieFloorSupport = battleAttackDamageDieFloorSupportForUnit(
    input.unit,
  );
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (attackDamageDieFloorSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle attack damage die floor Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (attackDamageDieFloorSupport === "attackDamageDieFloor") {
    supportProfiles.push(ATTACK_DAMAGE_DIE_FLOOR_SUPPORT_PROFILE);
  }

  const lightExtraAttackDamageAbilityModifierSupport =
    battleLightExtraAttackDamageAbilityModifierSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (lightExtraAttackDamageAbilityModifierSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Light extra attack damage ability modifier Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (lightExtraAttackDamageAbilityModifierSupport !== null) {
    supportProfiles.push(lightExtraAttackDamageAbilityModifierSupport);
  }

  const martialArtsAttackProjectionSupport =
    battleMartialArtsAttackProjectionSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (martialArtsAttackProjectionSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Martial Arts attack projection Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (martialArtsAttackProjectionSupport === "martialArtsAttackProjection") {
    supportProfiles.push(MARTIAL_ARTS_ATTACK_PROJECTION_SUPPORT_PROFILE);
  }

  const monkFocusBattleOptionsSupport =
    battleMonkFocusBattleOptionsSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (monkFocusBattleOptionsSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Monk Focus options Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (monkFocusBattleOptionsSupport !== null) {
    supportProfiles.push(monkFocusBattleOptionsSupport);
  }

  const attackActionAttackCountScalingSupport =
    battleAttackActionAttackCountScalingSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (attackActionAttackCountScalingSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Attack action attack-count scaling Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (attackActionAttackCountScalingSupport !== null) {
    supportProfiles.push(attackActionAttackCountScalingSupport);
  }

  const zeroHitPointReplacementSupport =
    battleZeroHitPointReplacementSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (zeroHitPointReplacementSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle zero-Hit-Point replacement Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (zeroHitPointReplacementSupport === "zeroHitPointReplacement") {
    supportProfiles.push(ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE);
  }

  const bonusActionDashTemporaryHitPointsSupport =
    battleBonusActionDashTemporaryHitPointsSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (bonusActionDashTemporaryHitPointsSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Bonus Action Dash Temporary Hit Points Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (bonusActionDashTemporaryHitPointsSupport !== null) {
    supportProfiles.push(bonusActionDashTemporaryHitPointsSupport);
  }

  const failedAbilityCheckResourceBoostSupport =
    battleFailedAbilityCheckResourceBoostSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (failedAbilityCheckResourceBoostSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle failed ability-check resource boost Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (failedAbilityCheckResourceBoostSupport !== null) {
    supportProfiles.push(failedAbilityCheckResourceBoostSupport);
  }

  const failedSavingThrowRerollSupport =
    battleFailedSavingThrowRerollSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (failedSavingThrowRerollSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle failed Saving Throw reroll Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (failedSavingThrowRerollSupport !== null) {
    supportProfiles.push(failedSavingThrowRerollSupport);
  }

  const spellSlotHealingModifierSupport =
    battleSpellSlotHealingModifierSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (spellSlotHealingModifierSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Spell Slot healing modifier Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (spellSlotHealingModifierSupport !== null) {
    supportProfiles.push(spellSlotHealingModifierSupport);
  }

  const magicActionHealingPoolSupport =
    battleMagicActionHealingPoolSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (magicActionHealingPoolSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Magic Action healing pool Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (magicActionHealingPoolSupport !== null) {
    supportProfiles.push(magicActionHealingPoolSupport);
  }

  const magicActionAreaSaveDamageHealingSupport =
    battleMagicActionAreaSaveDamageHealingSupportForUnit(
      input.unit,
      input.classLevels,
    );
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (magicActionAreaSaveDamageHealingSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Magic Action area save damage/healing Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (magicActionAreaSaveDamageHealingSupport !== null) {
    supportProfiles.push(magicActionAreaSaveDamageHealingSupport);
  }

  const magicActionSaveGatedConditionSupport =
    battleMagicActionSaveGatedConditionSupportForUnit(
      input.unit,
      input.classLevels,
    );
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (magicActionSaveGatedConditionSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Magic Action save-gated condition Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (magicActionSaveGatedConditionSupport !== null) {
    supportProfiles.push(magicActionSaveGatedConditionSupport);
  }

  const enemyZeroHitPointTemporaryHitPointsSupport =
    battleEnemyZeroHitPointTemporaryHitPointsSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (enemyZeroHitPointTemporaryHitPointsSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle enemy zero-Hit-Point Temporary Hit Points Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (enemyZeroHitPointTemporaryHitPointsSupport !== null) {
    supportProfiles.push(enemyZeroHitPointTemporaryHitPointsSupport);
  }

  const remarkableAthleteSupport = battleRemarkableAthleteSupportForUnit(
    input.unit,
  );
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (remarkableAthleteSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Remarkable Athlete Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (remarkableAthleteSupport !== null) {
    supportProfiles.push(remarkableAthleteSupport);
  }

  const openHandTechniqueSupport = battleOpenHandTechniqueSupportForUnit(
    input.unit,
  );
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (openHandTechniqueSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Open Hand Technique Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (openHandTechniqueSupport !== null) {
    supportProfiles.push(openHandTechniqueSupport);
  }

  const stunningStrikeSupport = battleStunningStrikeSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (stunningStrikeSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Stunning Strike Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (stunningStrikeSupport !== null) {
    supportProfiles.push(stunningStrikeSupport);
  }

  const cunningStrikeSupport = battleCunningStrikeSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (cunningStrikeSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Cunning Strike Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (cunningStrikeSupport !== null) {
    supportProfiles.push(cunningStrikeSupport);
  }

  const cunningStrikeOptionGrantSupport =
    battleCunningStrikeOptionGrantSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (cunningStrikeOptionGrantSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Cunning Strike option-grant Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (cunningStrikeOptionGrantSupport !== null) {
    supportProfiles.push(cunningStrikeOptionGrantSupport);
  }

  const paladinSacredWeaponSupport = battlePaladinSacredWeaponSupportForUnit(
    input.unit,
  );
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (paladinSacredWeaponSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Sacred Weapon Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (paladinSacredWeaponSupport !== null) {
    supportProfiles.push(paladinSacredWeaponSupport);
  }

  const huntersPreySupportValidation =
    battleHuntersPreySupportValidationForUnit(input.unit);
  /* v8 ignore start -- The Hunter's Prey reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (huntersPreySupportValidation === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Hunter's Prey Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */

  const rogueSteadyAimSupport = battleRogueSteadyAimSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (rogueSteadyAimSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Steady Aim Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (rogueSteadyAimSupport !== null) {
    supportProfiles.push(rogueSteadyAimSupport);
  }

  const potentCantripSupport = battlePotentCantripSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (potentCantripSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Potent Cantrip Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (potentCantripSupport !== null) {
    supportProfiles.push(potentCantripSupport);
  }

  const grapplerSupport = battleGrapplerSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (grapplerSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Grappler Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (grapplerSupport !== null) {
    supportProfiles.push(grapplerSupport);
  }

  const brutalStrikeSupport = battleBrutalStrikeSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (brutalStrikeSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Brutal Strike Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (brutalStrikeSupport !== null) {
    supportProfiles.push(brutalStrikeSupport);
  }

  const bardicInspirationGrantSupport =
    battleBardicInspirationGrantSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (bardicInspirationGrantSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Bardic Inspiration grant Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (bardicInspirationGrantSupport !== null) {
    supportProfiles.push(bardicInspirationGrantSupport);
  }

  const druidWildShapeKnownFormSupport =
    input.classLevels === undefined
      ? battleDruidWildShapeKnownFormSupportForUnit(input.unit)
      : battleDruidWildShapeKnownFormSupportForUnitAtClassLevels(
          input.unit,
          input.classLevels,
        );
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (druidWildShapeKnownFormSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Druid Wild Shape Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (druidWildShapeKnownFormSupport !== null) {
    supportProfiles.push(druidWildShapeKnownFormSupport);
  }

  const druidWildCompanionSpellCastSupport =
    battleDruidWildCompanionSpellCastSupportForUnit(input.unit);
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (druidWildCompanionSpellCastSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Druid Wild Companion Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (tacticalMasterReplacementSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Tactical Master Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (tacticalMasterReplacementSupport !== null) {
    supportProfiles.push(tacticalMasterReplacementSupport);
  }

  const weaponMasteryPushSupport = battleWeaponMasteryPushSupportForUnit(
    input.unit,
  );
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (weaponMasteryPushSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Weapon Mastery Push Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (weaponMasteryPushSupport !== null) {
    supportProfiles.push(weaponMasteryPushSupport);
  }

  const weaponMasterySapSupport = battleWeaponMasterySapSupportForUnit(
    input.unit,
  );
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (weaponMasterySapSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Weapon Mastery Sap Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (weaponMasterySapSupport !== null) {
    supportProfiles.push(weaponMasterySapSupport);
  }

  const weaponMasteryToppleSupport = battleWeaponMasteryToppleSupportForUnit(
    input.unit,
  );
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (weaponMasteryToppleSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Weapon Mastery Topple Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (weaponMasteryToppleSupport !== null) {
    supportProfiles.push(weaponMasteryToppleSupport);
  }

  const weaponMasteryCleaveSupport = battleWeaponMasteryCleaveSupportForUnit(
    input.unit,
  );
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (weaponMasteryCleaveSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Weapon Mastery Cleave Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (weaponMasteryCleaveSupport !== null) {
    supportProfiles.push(weaponMasteryCleaveSupport);
  }

  const weaponMasterySlowSupport = battleWeaponMasterySlowSupportForUnit(
    input.unit,
  );
  /* v8 ignore start -- Each focused hook reader owns malformed-shape conformance; this branch only translates its unsupported sentinel into the aggregate typed issue. */
  if (weaponMasterySlowSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Weapon Mastery Slow Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (weaponMasterySlowSupport !== null) {
    supportProfiles.push(weaponMasterySlowSupport);
  }

  return Either.right(supportProfiles);
}

export function battleUnitRefWithSupportProfiles(input: {
  readonly unitRef: {
    readonly unitId: AuthoredUnitSource["id"];
    readonly selectedOption?: BattleUnitSupportProfileSelectedOption;
  };
  readonly unit: BattleUnitSupportSource;
  readonly classLevels?: readonly CharacterBattleClassLevelInit[];
  readonly sourceFacts?: BattleUnitSupportProfileSourceFacts;
}): Either.Either<BattleUnitRef, BattleUnitSupportProfileIssue> {
  if (input.unitRef.unitId !== input.unit.id) {
    return battleUnitSupportProfileIssue(
      `Battle Unit ref ${input.unitRef.unitId} does not match Unit ${input.unit.id}.`,
    );
  }
  const supportProfiles = battleUnitSupportProfilesForUnit({
    unit: input.unit,
    ...(input.classLevels === undefined
      ? {}
      : { classLevels: parseBattleUnitSupportClassLevels(input.classLevels) }),
    ...(input.sourceFacts === undefined
      ? {}
      : { sourceFacts: input.sourceFacts }),
  });
  if (Either.isLeft(supportProfiles)) return Either.left(supportProfiles.left);

  const huntersPreySupport = battleHuntersPreySupportForUnit(
    input.unit,
    input.unitRef.selectedOption,
  );
  /* v8 ignore start -- Malformed authored support shape: the focused Hunter's Prey reader reports unsupported mechanics before a Unit ref can be admitted. */
  if (huntersPreySupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Hunter's Prey Unit hook: ${input.unit.id}.`,
    );
  }
  /* v8 ignore stop */
  if (
    !isClassicNonSrdMechanicsUnit(input.unit) &&
    hasClassFeatureMechanicsFamily(input.unit, "hunters_prey") &&
    huntersPreySupport === null
  ) {
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
  return Either.right({
    unit: input.unit,
    supportProfiles:
      huntersPreySupport === null
        ? supportProfiles.right
        : [...supportProfiles.right, huntersPreySupport],
  });
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
  /* v8 ignore next -- Malformed authored mechanics: the redirect payload must be a non-null object before its nested shape can be parsed. */
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
    };

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
  | BattleStunningStrikeSupportProfile
  | "unsupported"
  | null;
export type BattleCunningStrikeSupport =
  | BattleCunningStrikeSupportProfile
  | "unsupported"
  | null;
export type BattleCunningStrikeOptionGrantSupport =
  | BattleCunningStrikeOptionGrantSupportProfile
  | "unsupported"
  | null;
export type BattleRetaliationReactionAttackSupport =
  | BattleRetaliationReactionAttackSupportProfile
  | "unsupported"
  | null;
export type BattlePaladinSacredWeaponSupport =
  | BattlePaladinSacredWeaponSupportProfile
  | "unsupported"
  | null;
export type BattleHuntersPreySupport =
  | BattleHuntersPreySupportProfile
  | "unsupported"
  | null;
export type BattleRogueSteadyAimSupport =
  | BattleRogueSteadyAimSupportProfile
  | "unsupported"
  | null;
export type BattlePotentCantripSupport =
  | BattlePotentCantripSupportProfile
  | "unsupported"
  | null;
type MonkFocusBattleExecution =
  | {
      readonly kind: "bonus_action_unarmed_strike_sequence";
      readonly focusPointCost: 1;
      readonly strikeCount: 2;
    }
  | {
      readonly kind: "bonus_action_defensive_modes";
      readonly freeAction: "disengage";
      readonly focusPointCost: 1;
      readonly focusActions: readonly ["disengage", "dodge"];
    }
  | {
      readonly kind: "bonus_action_mobility_modes";
      readonly freeAction: "dash";
      readonly focusPointCost: 1;
      readonly focusActions: readonly ["disengage", "dash"];
      readonly jumpDistanceMultiplier: {
        readonly multiplier: 2;
        readonly expires: "end_of_turn";
      };
    };
type MonkFocusBattleOption = {
  readonly id: string;
  readonly displayName: string;
  readonly battleExecution: MonkFocusBattleExecution;
};

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
  /* v8 ignore start -- Malformed alternate-action-cost Surface mechanics are rejected here; supported projection and unrelated mechanics remain covered by admission tests. */
  if (unit.mechanics.from.kind !== "standard_action" || actions === null) {
    return "unsupported";
  }
  if (unit.mechanics.to.kind !== "bonus_action") {
    return "unsupported";
  }
  /* v8 ignore stop */

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
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "bonus_action_delegated_standard_actions"
  ) {
    return null;
  }

  const { sleightOfHand, objectUse } = unit.mechanics;
  /* v8 ignore start -- Malformed delegated-action Surface mechanics are rejected here; the canonical supported projection is covered by admission tests. */
  if (
    unit.mechanics.activationCost.kind !== "bonus_action" ||
    sleightOfHand.abilityCheck.ability !== "dex" ||
    sleightOfHand.abilityCheck.skill !== "sleight_of_hand" ||
    !tuple3Matches(sleightOfHand.operations, [
      "pick_lock_with_thieves_tools",
      "disarm_trap_with_thieves_tools",
      "pick_pocket",
    ]) ||
    !delegatedObjectUseActionsMatch(objectUse.actions)
  ) {
    return "unsupported";
  }
  /* v8 ignore stop */

  return {
    kind: BONUS_ACTION_DELEGATED_STANDARD_ACTIONS_SUPPORT_PROFILE,
    activationCost: { kind: "bonusAction" },
    sleightOfHand: {
      abilityCheck: { ability: "dex", skill: "sleight_of_hand" },
      operations: [
        "pick_lock_with_thieves_tools",
        "disarm_trap_with_thieves_tools",
        "pick_pocket",
      ],
    },
    objectUse: {
      actions: [
        { action: "utilize" },
        {
          action: "magic",
          restrictedTo: "magicItemRequiresMagicAction",
        },
      ],
    },
  };
}

function delegatedObjectUseActionsMatch(
  actions: readonly {
    readonly action: StandardActionKind;
    readonly restrictedTo?: string;
  }[],
): boolean {
  const [utilize, magic, ...extra] = actions;
  return (
    extra.length === 0 &&
    utilize?.action === "utilize" &&
    utilize.restrictedTo === undefined &&
    magic?.action === "magic" &&
    magic.restrictedTo === "magic_item_requires_magic_action"
  );
}

function alternateActionCostActions(
  actions: readonly StandardActionKind[],
): ReadonlyNonEmptyArray<AlternateActionCostAction> | null {
  const first = actions[0];
  /* v8 ignore start -- Malformed authored alternate-cost mechanics: admission requires a non-empty list containing only the supported standard-action subset. */
  if (first === undefined || !isAlternateActionCostAction(first)) {
    return null;
  }
  const rest = actions.slice(1);
  if (!rest.every(isAlternateActionCostAction)) {
    return null;
  }
  /* v8 ignore stop */
  return [first, ...rest];
}

export function battleMonkFocusBattleOptionsSupportForUnit(
  unit: AuthoredUnitSource,
): BattleMonkFocusBattleOptionsSupport {
  if (
    unit.kind !== "class_feature" ||
    unit.className !== "monk" ||
    unit.mechanics.family !== "resource_container"
  ) {
    return null;
  }

  const optionSet = unit.mechanics.optionSet;
  const initialBattleOptions = optionSet.initialOptions.map((option) => {
    const battleExecution = monkFocusBattleExecution(option);
    return {
      option,
      battleExecution,
      hasAuthoredBattleExecution: option.battleExecution !== undefined,
    };
  });
  const battleOptions = initialBattleOptions.flatMap((entry) => {
    const { option, battleExecution } = entry;
    return battleExecution === null
      ? []
      : [{ ...option, battleExecution } satisfies MonkFocusBattleOption];
  });
  if (battleOptions.length === 0) {
    return initialBattleOptions.some(
      (option) => option.hasAuthoredBattleExecution,
    )
      ? "unsupported"
      : null;
  }
  /* v8 ignore start -- Malformed Monk Focus resource and option shapes are rejected here; the canonical three-option projection is covered by admission tests. */
  if (
    unit.mechanics.resource.kind !== "use_count" ||
    unit.mechanics.resource.cap.kind !== "linear_per_level" ||
    unit.mechanics.resource.cap.axis !== "class" ||
    unit.mechanics.resource.cap.base !== 2 ||
    unit.mechanics.resource.cap.perLevel !== 1 ||
    unit.mechanics.resource.cap.startingAtLevel !== 2 ||
    unit.mechanics.resetCadence.kind !== "short_or_long_rest" ||
    unit.mechanics.effectSaveDc?.kind !== "class_feature_ability_save_dc" ||
    unit.mechanics.effectSaveDc.base !== 8 ||
    unit.mechanics.effectSaveDc.ability !== "wis" ||
    optionSet.timing !== "resource_use" ||
    initialBattleOptions.some((option) => option.battleExecution === null) ||
    battleOptions.length !== initialBattleOptions.length ||
    battleOptions.length !== 3
  ) {
    return "unsupported";
  }
  /* v8 ignore stop */

  const flurryOfBlows = battleOptions.find(
    (option) =>
      option.battleExecution?.kind === "bonus_action_unarmed_strike_sequence",
  );
  const patientDefense = battleOptions.find(
    (option) => option.battleExecution?.kind === "bonus_action_defensive_modes",
  );
  const stepOfTheWind = battleOptions.find(
    (option) => option.battleExecution?.kind === "bonus_action_mobility_modes",
  );
  /* v8 ignore start -- Malformed Monk Focus option identities are rejected here after typed option parsing; canonical option projection remains covered. */
  if (
    flurryOfBlows?.battleExecution?.kind !==
      "bonus_action_unarmed_strike_sequence" ||
    patientDefense?.battleExecution?.kind !== "bonus_action_defensive_modes" ||
    stepOfTheWind?.battleExecution?.kind !== "bonus_action_mobility_modes"
  ) {
    return "unsupported";
  }
  /* v8 ignore stop */

  return {
    kind: MONK_FOCUS_BATTLE_OPTIONS_SUPPORT_PROFILE,
    effectSaveDc: {
      kind: "classFeatureAbilitySaveDc",
      base: unit.mechanics.effectSaveDc.base,
      ability: unit.mechanics.effectSaveDc.ability,
    },
    flurryOfBlows: {
      displayName: flurryOfBlows.displayName,
      focusPointCost: flurryOfBlows.battleExecution.focusPointCost,
      strikeCount: flurryOfBlows.battleExecution.strikeCount,
    },
    patientDefense: {
      displayName: patientDefense.displayName,
      freeAction: patientDefense.battleExecution.freeAction,
      focusPointCost: patientDefense.battleExecution.focusPointCost,
      focusActions: patientDefense.battleExecution.focusActions,
    },
    stepOfTheWind: {
      displayName: stepOfTheWind.displayName,
      freeAction: stepOfTheWind.battleExecution.freeAction,
      focusPointCost: stepOfTheWind.battleExecution.focusPointCost,
      focusActions: stepOfTheWind.battleExecution.focusActions,
      jumpDistanceMultiplier: {
        multiplier:
          stepOfTheWind.battleExecution.jumpDistanceMultiplier.multiplier,
      },
    },
  };
}

function monkFocusBattleExecution(option: {
  readonly battleExecution?: unknown;
}): MonkFocusBattleExecution | null {
  const battleExecution = option.battleExecution;
  if (!isRecord(battleExecution)) return null;
  if (
    battleExecution["kind"] === "bonus_action_unarmed_strike_sequence" &&
    battleExecution["focusPointCost"] === 1 &&
    battleExecution["strikeCount"] === 2
  ) {
    return {
      kind: "bonus_action_unarmed_strike_sequence",
      focusPointCost: 1,
      strikeCount: 2,
    };
  }
  if (
    battleExecution["kind"] === "bonus_action_defensive_modes" &&
    battleExecution["freeAction"] === "disengage" &&
    battleExecution["focusPointCost"] === 1 &&
    tupleMatches(battleExecution["focusActions"], ["disengage", "dodge"])
  ) {
    return {
      kind: "bonus_action_defensive_modes",
      freeAction: "disengage",
      focusPointCost: 1,
      focusActions: ["disengage", "dodge"],
    };
  }
  const jumpDistanceMultiplier = battleExecution["jumpDistanceMultiplier"];
  if (
    battleExecution["kind"] === "bonus_action_mobility_modes" &&
    battleExecution["freeAction"] === "dash" &&
    battleExecution["focusPointCost"] === 1 &&
    tupleMatches(battleExecution["focusActions"], ["disengage", "dash"]) &&
    isRecord(jumpDistanceMultiplier) &&
    jumpDistanceMultiplier["multiplier"] === 2 &&
    jumpDistanceMultiplier["expires"] === "end_of_turn"
  ) {
    return {
      kind: "bonus_action_mobility_modes",
      freeAction: "dash",
      focusPointCost: 1,
      focusActions: ["disengage", "dash"],
      jumpDistanceMultiplier: { multiplier: 2, expires: "end_of_turn" },
    };
  }
  /* v8 ignore start -- Malformed authored Focus option: known option projections are handled above; any other battle-execution shape remains unsupported. The function terminator shares V8's ignored fallback range. */
  return null;
}
/* v8 ignore stop */

function tupleMatches<T extends readonly [string, string]>(
  actual: unknown,
  expected: T,
): actual is T {
  return (
    Array.isArray(actual) &&
    actual.length === 2 &&
    actual[0] === expected[0] &&
    actual[1] === expected[1]
  );
}

function tuple3Matches<T extends readonly [string, string, string]>(
  actual: unknown,
  expected: T,
): actual is T {
  return (
    Array.isArray(actual) &&
    actual.length === 3 &&
    actual[0] === expected[0] &&
    actual[1] === expected[1] &&
    actual[2] === expected[2]
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

function sameStringSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((leftValue) => right.includes(leftValue)) &&
    right.every((rightValue) => left.includes(rightValue))
  );
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

export type BattleWeaponMasterySapSupport =
  | typeof WEAPON_MASTERY_SAP_SUPPORT_PROFILE
  | "unsupported"
  | null;

export type BattleWeaponMasteryToppleSupport =
  | typeof WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE
  | "unsupported"
  | null;

export type BattleWeaponMasteryCleaveSupport =
  | typeof WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE
  | "unsupported"
  | null;

export type BattleWeaponMasteryPushSupport =
  | typeof WEAPON_MASTERY_PUSH_SUPPORT_PROFILE
  | "unsupported"
  | null;

export type BattleWeaponMasterySlowSupport =
  | typeof WEAPON_MASTERY_SLOW_SUPPORT_PROFILE
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
  if (!hasD20TestNaturalOneRerollMechanics(unit)) {
    return null;
  }
  const reroll = d20TestNaturalOneRerollProfileForUnit(unit);
  return reroll === null
    ? "unsupported"
    : {
        kind: D20_TEST_NATURAL_ONE_REROLL_SUPPORT_PROFILE,
        reroll,
      };
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
  if (!hasAcrobaticMovementMechanics(unit)) {
    return null;
  }
  const acrobaticMovement = acrobaticMovementProfileForUnit(unit);
  return acrobaticMovement === null
    ? "unsupported"
    : {
        kind: ACROBATIC_MOVEMENT_SUPPORT_PROFILE,
        acrobaticMovement,
      };
}

export function battleCreatureSpaceMovementPermissionSupportForUnit(
  unit: AuthoredUnitSource,
): BattleCreatureSpaceMovementPermissionSupport {
  if (!hasCreatureSpaceMovementPermissionMechanics(unit)) {
    return null;
  }
  const permission = creatureSpaceMovementPermissionProfileForUnit(unit);
  return permission === null
    ? "unsupported"
    : {
        kind: CREATURE_SPACE_MOVEMENT_PERMISSION_SUPPORT_PROFILE,
        permission,
      };
}

export function battleHideActionObscurementPermissionSupportForUnit(
  unit: AuthoredUnitSource,
): BattleHideActionObscurementPermissionSupport {
  if (!hasHideActionObscurementPermissionMechanics(unit)) {
    return null;
  }
  const permission = hideActionObscurementPermissionProfileForUnit(unit);
  return permission === null
    ? "unsupported"
    : {
        kind: HIDE_ACTION_OBSCUREMENT_PERMISSION_SUPPORT_PROFILE,
        permission,
      };
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
  if (!hasFailedSavingThrowRerollMechanics(unit)) {
    return null;
  }
  const profile = failedSavingThrowRerollProfileForUnit(unit);
  return profile === null
    ? "unsupported"
    : {
        kind: FAILED_SAVING_THROW_REROLL_SUPPORT_PROFILE,
        savingThrow: profile.savingThrow,
      };
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
  if (!hasClassFeatureMechanicsFamily(unit, "stunning_strike")) {
    return null;
  }
  const profile = stunningStrikeProfileForUnit(unit);
  return profile === null
    ? "unsupported"
    : {
        kind: STUNNING_STRIKE_SUPPORT_PROFILE,
        stunningStrike: profile.stunningStrike,
      };
}

export function battleCunningStrikeSupportForUnit(
  unit: AuthoredUnitSource,
): BattleCunningStrikeSupport {
  if (!hasClassFeatureMechanicsFamily(unit, "cunning_strike")) {
    return null;
  }
  const profile = cunningStrikeProfileForUnit(unit);
  return profile === null
    ? "unsupported"
    : {
        kind: CUNNING_STRIKE_SUPPORT_PROFILE,
        cunningStrike: profile.cunningStrike,
      };
}

export function battleCunningStrikeOptionGrantSupportForUnit(
  unit: AuthoredUnitSource,
): BattleCunningStrikeOptionGrantSupport {
  if (!hasClassFeatureMechanicsFamily(unit, "cunning_strike_option_grant")) {
    return null;
  }
  const profile = cunningStrikeOptionGrantProfileForUnit(unit);
  return profile === null
    ? "unsupported"
    : {
        kind: CUNNING_STRIKE_OPTION_GRANT_SUPPORT_PROFILE,
        optionGrant: profile.optionGrant,
      };
}

export function battlePaladinSacredWeaponSupportForUnit(
  unit: AuthoredUnitSource,
): BattlePaladinSacredWeaponSupport {
  if (!hasClassFeatureMechanicsFamily(unit, "sacred_weapon")) {
    return null;
  }
  const profile = paladinSacredWeaponProfileForUnit(unit);
  return profile === null
    ? "unsupported"
    : {
        kind: PALADIN_SACRED_WEAPON_SUPPORT_PROFILE,
        sacredWeapon: profile.sacredWeapon,
      };
}

export function battleHuntersPreySupportForUnit(
  unit: BattleUnitSupportSource,
  selectedOption?: BattleUnitSupportProfileSelectedOption,
): BattleHuntersPreySupport {
  if (
    isClassicNonSrdMechanicsUnit(unit) ||
    !hasClassFeatureMechanicsFamily(unit, "hunters_prey")
  ) {
    return null;
  }
  const admitted = huntersPreyAdmittedMechanicsProfileForUnit(unit);
  if (admitted === null) {
    return "unsupported";
  }
  return selectedOption === undefined
    ? null
    : selectedHuntersPreySupportProfile(admitted, selectedOption);
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

function battleHuntersPreySupportValidationForUnit(
  unit: BattleUnitSupportSource,
): "unsupported" | null {
  if (
    isClassicNonSrdMechanicsUnit(unit) ||
    !hasClassFeatureMechanicsFamily(unit, "hunters_prey")
  ) {
    return null;
  }
  return huntersPreyAdmittedMechanicsProfileForUnit(unit) === null
    ? "unsupported"
    : null;
}

export function battleRogueSteadyAimSupportForUnit(
  unit: AuthoredUnitSource,
): BattleRogueSteadyAimSupport {
  if (!hasClassFeatureMechanicsFamily(unit, "steady_aim")) {
    return null;
  }
  const profile = rogueSteadyAimProfileForUnit(unit);
  return profile === null
    ? "unsupported"
    : {
        kind: ROGUE_STEADY_AIM_SUPPORT_PROFILE,
        steadyAim: profile.steadyAim,
      };
}

export function battlePotentCantripSupportForUnit(
  unit: AuthoredUnitSource,
): BattlePotentCantripSupport {
  if (!hasClassFeatureMechanicsFamily(unit, "potent_cantrip")) {
    return null;
  }
  const profile = potentCantripProfileForUnit(unit);
  return profile === null
    ? "unsupported"
    : {
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

function hasFailedSavingThrowRerollMechanics(
  unit: AuthoredUnitSource,
): boolean {
  return hasClassFeatureMechanicsFamily(unit, "failed_saving_throw_reroll");
}

type D20TestNaturalOneRerollUnit = Extract<
  AuthoredUnitSource,
  { readonly kind: "species_trait" }
> & {
  readonly mechanics: {
    readonly family: "d20_test_natural_one_reroll";
  };
};

function hasD20TestNaturalOneRerollMechanics(
  unit: AuthoredUnitSource,
): unit is D20TestNaturalOneRerollUnit {
  return (
    unit.kind === "species_trait" &&
    unit.mechanics.family === "d20_test_natural_one_reroll"
  );
}

function d20TestNaturalOneRerollProfileForUnit(
  unit: AuthoredUnitSource,
): D20TestNaturalOneRerollProfile | null {
  if (!hasD20TestNaturalOneRerollMechanics(unit)) {
    return null;
  }
  return unit.mechanics.optional === true &&
    unit.mechanics.trigger.kind === "d20_test_roll_is" &&
    unit.mechanics.trigger.dieFace === 1 &&
    unit.mechanics.reroll.kind === "reroll_triggering_d20" &&
    unit.mechanics.reroll.use === "new_roll"
    ? {
        optional: true,
        trigger: { kind: "d20TestRollIs", dieFace: 1 },
        reroll: { kind: "triggeringD20", use: "newRoll" },
      }
    : null;
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

function hasAcrobaticMovementMechanics(unit: AuthoredUnitSource): boolean {
  return (
    unit.kind === "class_feature" &&
    unit.mechanics.family === "acrobatic_movement"
  );
}

function hasCreatureSpaceMovementPermissionMechanics(
  unit: AuthoredUnitSource,
): boolean {
  return (
    unit.kind === "species_trait" &&
    unit.mechanics.family === "creature_space_movement_permission"
  );
}

function hasHideActionObscurementPermissionMechanics(
  unit: AuthoredUnitSource,
): boolean {
  return (
    unit.kind === "species_trait" &&
    unit.mechanics.family === "hide_action_obscurement_permission"
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
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "failed_saving_throw_reroll"
  ) {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.trigger.kind !== "failed_saving_throw" ||
    mechanics.reroll.mustUseNewRoll !== true ||
    mechanics.reroll.bonus.kind !== "class_level" ||
    mechanics.reroll.bonus.className !== "fighter" ||
    mechanics.resource.kind !== "use_count" ||
    mechanics.resource.cap.kind !== "threshold_tiers" ||
    mechanics.resource.cap.axis !== "class" ||
    mechanics.resource.cap.base !== 1 ||
    mechanics.resource.cap.tiers.length !== 2 ||
    mechanics.resource.cap.tiers[0]?.atLevel !== 13 ||
    mechanics.resource.cap.tiers[0]?.value !== 2 ||
    mechanics.resource.cap.tiers[1]?.atLevel !== 17 ||
    mechanics.resource.cap.tiers[1]?.value !== 3 ||
    mechanics.resetCadence.kind !== "long_rest"
  ) {
    return null;
  }
  return {
    kind: "failedSavingThrowReroll",
    unit,
    savingThrow: {
      trigger: "failedSavingThrow",
      reroll: {
        use: "newRoll",
        bonus: {
          kind: "classLevel",
          className: "fighter",
        },
      },
      spends: {
        resourceUnitId: unit.id,
        amount: 1,
      },
      resetCadence: "longRest",
    },
  };
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
    Either.isLeft(durationTicks)
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
        durationTicks: durationTicks.right,
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
  if (
    unit.kind !== "class_feature" ||
    unit.className !== "monk" ||
    unit.mechanics.family !== "acrobatic_movement"
  ) {
    return null;
  }
  const condition = passiveSpeedBonusConditionForEquipmentPredicate(
    unit.mechanics.condition,
  );
  if (
    condition?.kind !== "unarmoredUnshielded" ||
    unit.mechanics.movement.timing !== "on_your_turn" ||
    unit.mechanics.movement.verticalSurfaces.path !==
      "along_vertical_surfaces" ||
    unit.mechanics.movement.verticalSurfaces.withoutFallingDuringMovement !==
      true ||
    unit.mechanics.movement.liquids.path !== "across_liquids" ||
    unit.mechanics.movement.liquids.withoutFallingDuringMovement !== true
  ) {
    return null;
  }
  return {
    condition,
    timing: "onYourTurn",
    paths: [
      {
        kind: "verticalSurface",
        path: "alongVerticalSurface",
        withoutFallingDuringMovement: true,
      },
      {
        kind: "liquid",
        path: "acrossLiquid",
        withoutFallingDuringMovement: true,
      },
    ],
  };
}

export function creatureSpaceMovementPermissionProfileForUnit(
  unit: AuthoredUnitSource,
): CreatureSpaceMovementPermissionProfile | null {
  if (
    unit.kind !== "species_trait" ||
    unit.mechanics.family !== "creature_space_movement_permission"
  ) {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.moveThrough.kind !== "occupied_creature_space" ||
    mechanics.moveThrough.creatureSizeRelationToSelf !== "larger" ||
    mechanics.canStopInOccupiedSpace !== false
  ) {
    return null;
  }
  return {
    moveThrough: {
      kind: "occupiedCreatureSpace",
      creatureSizeRelationToSelf: "larger",
    },
    canStopInOccupiedSpace: false,
  };
}

export function hideActionObscurementPermissionProfileForUnit(
  unit: AuthoredUnitSource,
): HideActionObscurementPermissionProfile | null {
  if (
    unit.kind !== "species_trait" ||
    unit.mechanics.family !== "hide_action_obscurement_permission" ||
    unit.mechanics.action !== "hide"
  ) {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.allowedObscurement.kind !== "obscured_only_by_creature" ||
    mechanics.allowedObscurement.creatureSizeRelationToSelf !==
      "at_least_one_size_larger"
  ) {
    return null;
  }
  return {
    allowedObscurement: {
      kind: "obscuredOnlyByCreature",
      creatureSizeRelationToSelf: "atLeastOneSizeLarger",
    },
  };
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

function fixedDiceDeltaValue(delta: {
  readonly kind: string;
  readonly dice?: number;
  readonly dieSize?: number;
  readonly sign?: string;
}): number | null {
  if (
    delta.kind !== "fixed_dice" ||
    delta.dice === undefined ||
    delta.dieSize === undefined
  ) {
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

function stunningStrikeProfileForUnit(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "stunningStrike" }
> | null {
  if (
    unit.kind !== "class_feature" ||
    unit.className !== "monk" ||
    unit.mechanics.family !== "stunning_strike"
  ) {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.trigger.kind !==
      "hit_creature_with_monk_weapon_or_unarmed_strike" ||
    mechanics.trigger.usageLimit !== "once_per_turn" ||
    mechanics.optional !== true ||
    // authored-id-dispatch-allow: battle-runtime-unit-feature-support-profile-boundary
    mechanics.spends.resourceUnitId !== MONK_FOCUS_RESOURCE_UNIT_ID ||
    mechanics.spends.amount !== 1 ||
    mechanics.savingThrow.ability !== "con" ||
    mechanics.onFail.kind !== "apply_condition" ||
    mechanics.onFail.condition !== "stunned" ||
    mechanics.onFail.expires !== "start_of_source_next_turn" ||
    mechanics.onSuccess.speed.kind !== "halve" ||
    mechanics.onSuccess.speed.expires !== "start_of_source_next_turn" ||
    mechanics.onSuccess.attackRoll.mode !== "advantage" ||
    mechanics.onSuccess.attackRoll.appliesTo !==
      "next_attack_roll_against_target_before_expiration"
  ) {
    return null;
  }
  return {
    kind: "stunningStrike",
    unit,
    stunningStrike: {
      trigger: {
        kind: "hitCreatureWithMonkWeaponOrUnarmedStrike",
        usageLimit: "oncePerTurn",
      },
      optional: true,
      spends: {
        resourceUnitId: MONK_FOCUS_RESOURCE_UNIT_ID,
        amount: 1,
      },
      savingThrow: { ability: "con" },
      onFail: {
        kind: "applyCondition",
        condition: "stunned",
        expires: "startOfSourceNextTurn",
      },
      onSuccess: {
        speed: {
          kind: "halve",
          expires: "startOfSourceNextTurn",
        },
        attackRoll: {
          mode: "advantage",
          appliesTo: "nextAttackRollAgainstTargetBeforeExpiration",
        },
      },
    },
  };
}

function cunningStrikeCostForSurfaceOption(option: {
  readonly cost: CunningStrikeSurfaceOption["cost"];
}): CunningStrikeDieCost | null {
  return option.cost.kind === "sneak_attack_damage_dice" &&
    option.cost.dice === 1 &&
    option.cost.dieSize === 6
    ? { kind: "sneakAttackDamageDice", dice: 1, dieSize: 6 }
    : null;
}

function cunningStrikeEffectForSurfaceOption(
  option: CunningStrikeSurfaceOption,
): CunningStrikeOptionEffect | null {
  if ("requires" in option) {
    if (
      option.requires.kind !== "equipment_on_person" ||
      option.requires.equipment.kind !== "tool" ||
      // authored-id-dispatch-allow: battle-runtime-unit-feature-support-profile-boundary
      option.requires.equipment.toolId !== "poisoners_kit" ||
      option.save.ability !== "con" ||
      option.onFail.kind !== "apply_condition" ||
      option.onFail.condition !== "poisoned" ||
      option.onFail.repeatSave.cadence !== "end_of_target_turn" ||
      option.onFail.repeatSave.onSuccess !== "end_condition"
    ) {
      return null;
    }
    const duration = elapsedTimeTicksFromTimeSpanDuration(
      option.onFail.duration,
    );
    if (Either.isLeft(duration)) {
      return null;
    }
    return {
      kind: "equipmentGatedConditionSave",
      requires: {
        kind: "equipmentOnPerson",
        equipment: { kind: "tool", toolId: "poisoners_kit" },
      },
      save: { ability: option.save.ability },
      onFail: {
        kind: "applyCondition",
        condition: option.onFail.condition,
        durationTicks: duration.right,
        repeatSave: {
          cadence: "endOfTargetTurn",
          onSuccess: "endCondition",
        },
      },
    };
  }
  if ("target" in option) {
    return option.target.maxSize === "large" &&
      option.save.ability === "dex" &&
      option.onFail.kind === "apply_condition" &&
      option.onFail.condition === "prone"
      ? {
          kind: "sizeGatedConditionSave",
          target: { maxSize: option.target.maxSize },
          save: { ability: option.save.ability },
          onFail: {
            kind: "applyCondition",
            condition: option.onFail.condition,
          },
        }
      : null;
  }
  if ("movement" in option) {
    return option.movement.timing === "immediately_after_attack" &&
      option.movement.distance.kind === "half_speed" &&
      option.movement.opportunityAttacks === "does_not_provoke"
      ? {
          kind: "postDamageMovement",
          movement: {
            timing: "immediatelyAfterAttack",
            distance: { kind: "halfSpeed" },
            opportunityAttacks: "doesNotProvoke",
          },
        }
      : null;
  }
  return null;
}

function cunningStrikeEffectForOptionGrantSurfaceOption(
  option: CunningStrikeOptionGrantSurfaceOption,
): CunningStrikeOptionEffect | null {
  return option.prerequisite.kind === "hide_action_invisible_condition" &&
    option.effect.kind === "suppress_attack_end_of_invisible_condition" &&
    option.effect.conditionSource === "hide_action" &&
    option.effect.ifTurnEndsBehindCover[0] === "three_quarters" &&
    option.effect.ifTurnEndsBehindCover[1] === "total"
    ? {
        kind: "hideInvisibleEndSuppression",
        prerequisite: { kind: "hideActionInvisibleCondition" },
        conditionSource: "hideAction",
        ifTurnEndsBehindCover: ["threeQuarters", "total"],
      }
    : null;
}

function cunningStrikeOptionForSurfaceOption(
  option: CunningStrikeSurfaceOption,
): CunningStrikeOption | null {
  const cost = cunningStrikeCostForSurfaceOption(option);
  if (cost === null) {
    return null;
  }
  const effect = cunningStrikeEffectForSurfaceOption(option);
  return effect === null
    ? null
    : {
        selectionId: option.id,
        cost,
        effect,
      };
}

function cunningStrikeOptionForOptionGrantSurfaceOption(
  option: CunningStrikeOptionGrantSurfaceOption,
): CunningStrikeOption | null {
  const cost = cunningStrikeCostForSurfaceOption(option);
  if (cost === null) {
    return null;
  }
  const effect = cunningStrikeEffectForOptionGrantSurfaceOption(option);
  return effect === null
    ? null
    : {
        selectionId: option.id,
        cost,
        effect,
      };
}

function cunningStrikeOptionsForMechanics(
  mechanics: CunningStrikeMechanics,
): readonly CunningStrikeOption[] | null {
  const options: CunningStrikeOption[] = [];
  for (const option of mechanics.options) {
    const projected = cunningStrikeOptionForSurfaceOption(option);
    if (projected === null) {
      return null;
    }
    options.push(projected);
  }
  return options;
}

function cunningStrikeProfileForUnit(
  unit: AuthoredUnitSource,
  classLevels?: readonly CharacterBattleClassLevel[],
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "cunningStrike" }
> | null {
  if (
    unit.kind !== "class_feature" ||
    unit.className !== "rogue" ||
    unit.mechanics.family !== "cunning_strike"
  ) {
    return null;
  }
  if (classLevels !== undefined) {
    const classLevel = findCharacterClassLevel(classLevels, unit.className);
    if (classLevel === undefined || classLevel < unit.acquiredAtLevel) {
      return null;
    }
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.trigger.kind !== "deal_sneak_attack_damage" ||
    mechanics.choice.kind !== "choose_one" ||
    mechanics.choice.maxOptions !== 1 ||
    mechanics.effectSaveDc.kind !== "class_feature_ability_save_dc" ||
    mechanics.effectSaveDc.base !== 8 ||
    mechanics.effectSaveDc.ability !== "dex"
  ) {
    return null;
  }
  const options = cunningStrikeOptionsForMechanics(mechanics);
  if (options === null) {
    return null;
  }
  return {
    kind: CUNNING_STRIKE_SUPPORT_PROFILE,
    unit,
    cunningStrike: {
      trigger: {
        kind: "dealSneakAttackDamage",
        sourceUnitId: mechanics.trigger.sourceUnitId,
      },
      choice: { kind: "chooseOne", maxOptions: 1 },
      effectSaveDc: {
        kind: "classFeatureAbilitySaveDc",
        base: 8,
        ability: "dex",
      },
      options,
    },
  };
}

function cunningStrikeOptionGrantProfileForUnit(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "cunningStrikeOptionGrant" }
> | null {
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "cunning_strike_option_grant"
  ) {
    return null;
  }
  const option = cunningStrikeOptionForOptionGrantSurfaceOption(
    unit.mechanics.option,
  );
  return option === null
    ? null
    : {
        kind: CUNNING_STRIKE_OPTION_GRANT_SUPPORT_PROFILE,
        unit,
        optionGrant: {
          sourceUnitId: unit.mechanics.sourceUnitId,
          option,
        },
      };
}

function paladinSacredWeaponProfileForUnit(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "paladinSacredWeapon" }
> | null {
  if (
    unit.kind !== "class_feature" ||
    unit.className !== "paladin" ||
    unit.mechanics.family !== "sacred_weapon"
  ) {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.activationCost.kind !== "standard_action" ||
    mechanics.activationCost.action !== "attack" ||
    // authored-id-dispatch-allow: battle-runtime-unit-feature-support-profile-boundary
    mechanics.spends.resourceUnitId !==
      PALADIN_CHANNEL_DIVINITY_RESOURCE_UNIT_ID ||
    mechanics.spends.amount !== 1 ||
    mechanics.target.kind !== "held_melee_weapon" ||
    mechanics.duration.unit !== "minute" ||
    mechanics.duration.amount !== 10 ||
    !sameStringSet(mechanics.duration.endsOn, [
      "use_feature_again",
      "dismiss_no_action",
      "not_carrying_weapon",
    ]) ||
    mechanics.attackRollBonus.kind !== "ability_modifier" ||
    mechanics.attackRollBonus.ability !== "cha" ||
    mechanics.attackRollBonus.minimum !== 1 ||
    mechanics.attackRollBonus.appliesTo !== "imbued_weapon_attack_rolls" ||
    !sameStringSet(mechanics.hitDamageType.choice, ["normal", "radiant"]) ||
    mechanics.light.brightRadiusFeet !== 20 ||
    mechanics.light.dimAdditionalFeet !== 20
  ) {
    return null;
  }
  return {
    kind: "paladinSacredWeapon",
    unit,
    sacredWeapon: {
      activationCost: { kind: "standardAction", action: "attack" },
      spends: {
        resourceUnitId: PALADIN_CHANNEL_DIVINITY_RESOURCE_UNIT_ID,
        amount: 1,
      },
      target: "heldMeleeWeapon",
      duration: {
        unit: "minute",
        amount: 10,
        endsOn: ["useFeatureAgain", "dismissNoAction", "notCarryingWeapon"],
      },
      attackRollBonus: {
        kind: "abilityModifier",
        ability: "cha",
        minimum: 1,
        appliesTo: "imbuedWeaponAttackRolls",
      },
      hitDamageTypeChoice: ["normal", "radiant"],
      light: {
        brightRadiusFeet: movementFeet(20),
        dimAdditionalFeet: movementFeet(20),
      },
    },
  };
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

function rogueSteadyAimProfileForUnit(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "rogueSteadyAim" }
> | null {
  if (
    unit.kind !== "class_feature" ||
    unit.className !== "rogue" ||
    unit.mechanics.family !== "steady_aim"
  ) {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.activationCost.kind !== "bonus_action" ||
    mechanics.precondition.kind !== "no_movement_this_turn" ||
    mechanics.attackRoll.mode !== "advantage" ||
    mechanics.attackRoll.appliesTo !== "next_attack_roll_current_turn" ||
    mechanics.speed.kind !== "set_to_zero" ||
    mechanics.speed.until !== "end_of_current_turn"
  ) {
    return null;
  }
  return {
    kind: "rogueSteadyAim",
    unit,
    steadyAim: {
      activationCost: { kind: "bonusAction" },
      precondition: "noMovementThisTurn",
      attackRoll: {
        mode: "advantage",
        appliesTo: "nextAttackRollCurrentTurn",
      },
      speed: { kind: "setToZero", until: "endOfCurrentTurn" },
    },
  };
}

function potentCantripProfileForUnit(
  unit: AuthoredUnitSource,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "potentCantrip" }
> | null {
  if (
    unit.kind !== "class_feature" ||
    unit.className !== "wizard" ||
    unit.mechanics.family !== "potent_cantrip"
  ) {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.trigger.kind !== "cast_cantrip_at_creature" ||
    mechanics.trigger.cantripKind !== "damaging" ||
    !sameStringSet(mechanics.outcomes, [
      "miss_with_attack_roll",
      "target_succeeds_saving_throw",
    ]) ||
    mechanics.damage.kind !== "half_cantrip_damage_if_any" ||
    mechanics.additionalEffect !== "none"
  ) {
    return null;
  }
  return {
    kind: "potentCantrip",
    unit,
    potentCantrip: {
      trigger: { kind: "castCantripAtCreature", cantripKind: "damaging" },
      outcomes: ["missWithAttackRoll", "targetSucceedsSavingThrow"],
      damage: "halfCantripDamageIfAny",
      additionalEffect: "none",
    },
  };
}

function grapplerProfileForUnit(
  unit: AuthoredUnitSource,
): Extract<SupportedUnitFeatureProfile, { readonly kind: "grappler" }> | null {
  if (unit.kind !== "feat" || unit.mechanics.family !== "grappler") {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.punchAndGrab.trigger !==
      "attack_action_unarmed_strike_hit_on_turn" ||
    !sameStringSet(mechanics.punchAndGrab.options, ["damage", "grapple"]) ||
    mechanics.punchAndGrab.usageLimit.kind !== "once_per_turn" ||
    mechanics.attackAdvantage.mode !== "advantage" ||
    !sameStringSet(mechanics.attackAdvantage.on, ["attack_roll"]) ||
    mechanics.attackAdvantage.target !== "creature_grappled_by_you" ||
    mechanics.fastWrestler.movementCost !== "no_extra_grapple_drag_cost" ||
    mechanics.fastWrestler.targetSize !== "your_size_or_smaller"
  ) {
    return null;
  }
  return {
    kind: GRAPPLER_SUPPORT_PROFILE,
    unit,
    grappler: {
      punchAndGrab: {
        trigger: "attackActionUnarmedStrikeHitOnTurn",
        options: ["damage", "grapple"],
        usageLimit: "oncePerTurn",
      },
      attackAdvantage: {
        mode: "advantage",
        target: "creatureGrappledByYou",
      },
      fastWrestler: {
        movementCost: "noExtraGrappleDragCost",
        targetSize: "yourSizeOrSmaller",
      },
    },
  };
}

export function battleGrapplerSupportForUnit(
  unit: AuthoredUnitSource,
): BattleGrapplerSupportProfile | "unsupported" | null {
  const profile = grapplerProfileForUnit(unit);
  if (profile !== null) {
    return { kind: GRAPPLER_SUPPORT_PROFILE, grappler: profile.grappler };
  }
  return unit.kind === "feat" && unit.mechanics.family === "grappler"
    ? "unsupported"
    : null;
}

export function battleBrutalStrikeSupportForUnit(
  unit: AuthoredUnitSource,
): BattleBrutalStrikeSupportProfile | "unsupported" | null {
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "brutal_strike"
  ) {
    return null;
  }
  const mechanics = unit.mechanics;
  const forceful = mechanics.options.find(
    (option): option is (typeof mechanics.options)[0] =>
      "forcedMovement" in option && "selfMovement" in option,
  );
  const hamstring = mechanics.options.find(
    (option): option is (typeof mechanics.options)[1] =>
      "speedPenalty" in option,
  );
  /* v8 ignore start -- Malformed Brutal Strike Surface mechanics are rejected at profile admission; canonical Forceful Blow and Hamstring projection is covered. */
  if (
    mechanics.trigger.kind !== "reckless_attack_strength_attack_hit" ||
    mechanics.trigger.advantageForgone !== true ||
    mechanics.trigger.attackMustNotHaveDisadvantage !== true ||
    mechanics.damage.kind !== "add_attack_damage_dice" ||
    mechanics.damage.damageType !== "same_as_attack" ||
    mechanics.damage.dice.dice !== 1 ||
    mechanics.damage.dice.dieSize !== 10 ||
    mechanics.optionChoice.kind !== "choose_one" ||
    mechanics.optionChoice.maxOptions !== 1 ||
    mechanics.options.length !== 2 ||
    forceful === undefined ||
    hamstring === undefined ||
    forceful.forcedMovement?.kind !== "push" ||
    forceful.forcedMovement.feet !== 15 ||
    forceful.forcedMovement.direction !== "straight_away_from_you" ||
    forceful.selfMovement?.kind !== "move_toward_target" ||
    forceful.selfMovement.distance.kind !== "half_speed" ||
    forceful.selfMovement.opportunityAttacks !== "does_not_provoke" ||
    hamstring.speedPenalty?.feet !== 15 ||
    hamstring.speedPenalty.stacking !== "most_recent_only" ||
    hamstring.speedPenalty.until !== "start_of_your_next_turn"
  ) {
    return "unsupported";
  }
  /* v8 ignore stop */
  return {
    kind: BRUTAL_STRIKE_SUPPORT_PROFILE,
    brutalStrike: {
      trigger: {
        kind: "recklessAttackStrengthAttackHit",
        advantageForgone: true,
        attackMustNotHaveDisadvantage: true,
      },
      damage: {
        dice: 1,
        dieSize: 10,
        damageType: "sameAsAttack",
      },
      options: [
        {
          id: forceful.id,
          pushFeet: movementFeet(forceful.forcedMovement.feet),
          selfMovement: {
            kind: "moveTowardTarget",
            distance: "halfSpeed",
            opportunityAttacks: "doesNotProvoke",
          },
        },
        {
          id: hamstring.id,
          deltaFeet: movementDeltaFeet(-hamstring.speedPenalty.feet),
          stacking: "mostRecentOnly",
          expires: "startOfYourNextTurn",
        },
      ],
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
  if (
    unit.kind !== "class_feature" ||
    unit.className !== "druid" ||
    unit.mechanics.family !== "activation"
  ) {
    return null;
  }
  if (
    !unit.mechanics.phases.some((phase) => phaseHasWildShapeTransform(phase))
  ) {
    return null;
  }
  /* v8 ignore start -- Malformed Wild Shape activation mechanics are rejected at profile admission; canonical known-form projection is covered. */
  return (
    druidWildShapeKnownFormSupportProfile(
      parseDruidWildShapeKnownFormUnitFeatureProfile(unit, [
        { className: "druid", level: classLevel(unit.acquiredAtLevel) },
      ]),
    ) ?? "unsupported"
  );
  /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed Wild Companion Surface mechanics are rejected at profile admission; canonical synthetic fixture projection is covered. */
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
  /* v8 ignore stop */
}

function battleDruidWildShapeKnownFormSupportForUnitAtClassLevels(
  unit: AuthoredUnitSource,
  classLevels: readonly CharacterBattleClassLevel[],
): BattleDruidWildShapeKnownFormSupport {
  if (
    unit.kind !== "class_feature" ||
    unit.className !== "druid" ||
    unit.mechanics.family !== "activation"
  ) {
    return null;
  }
  if (
    !unit.mechanics.phases.some((phase) => phaseHasWildShapeTransform(phase))
  ) {
    return null;
  }
  const profile = parseDruidWildShapeKnownFormUnitFeatureProfile(
    unit,
    classLevels,
  );
  if (profile !== null) {
    return druidWildShapeKnownFormSupportProfile(profile);
  }
  const actualClassLevel = findCharacterClassLevel(classLevels, unit.className);
  if (
    isDruidWildShapeFeatureRecord(unit) &&
    (actualClassLevel === undefined || actualClassLevel < unit.acquiredAtLevel)
  ) {
    return null;
  }
  return "unsupported";
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
  /* v8 ignore start -- Malformed Tactical Master replacement mechanics are rejected at profile admission; the canonical mastery-choice projection is covered. */
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
  /* v8 ignore stop */
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
): SupportedDruidWildShapeKnownFormProfile | null {
  if (!isDruidWildShapeFeatureRecord(unit)) {
    return null;
  }
  const classLevel = findCharacterClassLevel(classLevels, unit.className);
  if (classLevel === undefined || classLevel < unit.acquiredAtLevel) {
    return null;
  }
  const phase = unit.mechanics.phases[0];
  const knownFormRoster = druidWildShapeKnownFormRosterFromPhase(phase);
  const knownFormCount =
    knownFormRoster === undefined
      ? undefined
      : classLevelTotalChoicesAtLevel(knownFormRoster.knownForms, classLevel);
  if (knownFormRoster === undefined || knownFormCount == null) {
    return null;
  }
  return {
    kind: DRUID_WILD_SHAPE_KNOWN_FORM_SUPPORT_PROFILE,
    unit,
    classLevel,
    knownFormRoster: {
      creatureType: knownFormRoster.creatureType,
      count: knownFormCount,
      maxChallengeRating: thresholdTierNumberAtClassLevel(
        knownFormRoster.maxChallengeRating,
        classLevel,
      ),
      flySpeed:
        knownFormRoster.flySpeed.kind === "allowed_at_class_level" &&
        Number(classLevel) >= knownFormRoster.flySpeed.atLevel
          ? "allowed"
          : "forbidden",
    },
  };
}

function druidWildShapeKnownFormSupportProfile(
  profile: SupportedDruidWildShapeKnownFormProfile | null,
): BattleDruidWildShapeKnownFormSupportProfile | null {
  return profile === null
    ? null
    : {
        kind: profile.kind,
        classLevel: profile.classLevel,
        knownFormRoster: profile.knownFormRoster,
      };
}

function phaseHasWildShapeTransform(
  phase: DruidWildShapeActivationPhase,
): boolean {
  return druidWildShapeKnownFormRosterFromPhase(phase) !== undefined;
}

function classLevelTotalChoicesAtLevel(
  choices: DruidWildShapeKnownFormsRoster["knownForms"],
  classLevel: ClassLevel,
): number | null {
  if (choices.kind !== "class_level_total_choices") return null;
  return choices.levels.reduce(
    (total, tier) => (Number(classLevel) >= tier.atLevel ? tier.total : total),
    0,
  );
}

function thresholdTierNumberAtClassLevel(
  tiers: DruidWildShapeKnownFormsRoster["maxChallengeRating"],
  classLevel: ClassLevel,
): number {
  return tiers.tiers.reduce(
    (value, tier) => (Number(classLevel) >= tier.atLevel ? tier.value : value),
    tiers.base,
  );
}

export function battleWeaponMasterySapSupportForUnit(
  unit: AuthoredUnitSource,
): BattleWeaponMasterySapSupport {
  if (unit.kind !== "mastery") {
    return null;
  }
  /* v8 ignore start -- Malformed Sap mastery mechanics are rejected at profile admission; canonical Sap projection and unrelated mastery shapes remain covered. */
  const supported =
    unit.mechanics.family === "on_hit_trigger" &&
    unit.mechanics.trigger.kind === "weapon_hit" &&
    unit.mechanics.optional === false &&
    unit.mechanics.effect.kind === "modify_roll_advantage" &&
    unit.mechanics.effect.mode === "disadvantage" &&
    unit.mechanics.effect.count === 1 &&
    unit.mechanics.effect.on.length === 1 &&
    unit.mechanics.effect.on[0] === "attack_roll" &&
    unit.mechanics.effect.expiresOn.kind === "target_uses_or_turn_start";
  if (supported) {
    return WEAPON_MASTERY_SAP_SUPPORT_PROFILE;
  }
  return unit.mechanics.family === "on_hit_trigger" &&
    unit.mechanics.effect.kind === "modify_roll_advantage"
    ? "unsupported"
    : null;
  /* v8 ignore stop */
}

export function battleWeaponMasteryPushSupportForUnit(
  unit: AuthoredUnitSource,
): BattleWeaponMasteryPushSupport {
  if (unit.kind !== "mastery") {
    return null;
  }
  /* v8 ignore start -- Malformed Push mastery mechanics are rejected at profile admission; canonical Push projection and unrelated mastery shapes remain covered. */
  const supported =
    unit.mechanics.family === "on_hit_trigger" &&
    unit.mechanics.trigger.kind === "weapon_hit" &&
    unit.mechanics.optional === true &&
    unit.mechanics.effect.kind === "push_creature" &&
    unit.mechanics.effect.maxDistanceFeet === 10 &&
    unit.mechanics.effect.direction === "straight_away_from_self" &&
    unit.mechanics.effect.maximumTargetSize === "large";
  if (supported) {
    return WEAPON_MASTERY_PUSH_SUPPORT_PROFILE;
  }
  return unit.mechanics.family === "on_hit_trigger" &&
    unit.mechanics.effect.kind === "push_creature"
    ? "unsupported"
    : null;
  /* v8 ignore stop */
}

export function battleWeaponMasteryToppleSupportForUnit(
  unit: AuthoredUnitSource,
): BattleWeaponMasteryToppleSupport {
  if (unit.kind !== "mastery") {
    return null;
  }
  /* v8 ignore start -- Malformed Topple mastery mechanics are rejected at profile admission; canonical Topple projection and unrelated mastery shapes remain covered. */
  const supported =
    unit.mechanics.family === "on_hit_trigger" &&
    unit.mechanics.trigger.kind === "weapon_hit" &&
    unit.mechanics.optional === true &&
    unit.mechanics.effect.kind === "save_gate" &&
    unit.mechanics.effect.ability === "con" &&
    unit.mechanics.effect.dc.kind === "weapon_attack_dc" &&
    unit.mechanics.effect.dc.base === 8 &&
    unit.mechanics.effect.onFail.kind === "apply_condition" &&
    unit.mechanics.effect.onFail.condition === "prone" &&
    unit.mechanics.effect.onSuccess.kind === "none";
  if (supported) {
    return WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE;
  }
  return unit.mechanics.family === "on_hit_trigger" &&
    unit.mechanics.effect.kind === "save_gate"
    ? "unsupported"
    : null;
  /* v8 ignore stop */
}

export function battleWeaponMasterySlowSupportForUnit(
  unit: AuthoredUnitSource,
): BattleWeaponMasterySlowSupport {
  if (unit.kind !== "mastery") {
    return null;
  }
  /* v8 ignore start -- Malformed Slow mastery mechanics are rejected at profile admission; canonical Slow projection and unrelated mastery shapes remain covered. */
  const supported =
    unit.mechanics.family === "on_hit_trigger" &&
    unit.mechanics.trigger.kind === "weapon_hit_with_damage" &&
    unit.mechanics.optional === true &&
    unit.mechanics.effect.kind === "speed_delta" &&
    unit.mechanics.effect.deltaFeet === -10 &&
    unit.mechanics.effect.maximumReductionFeet === 10 &&
    unit.mechanics.effect.expiresOn.kind === "start_of_attacker_next_turn";
  if (supported) {
    return WEAPON_MASTERY_SLOW_SUPPORT_PROFILE;
  }
  return unit.mechanics.family === "on_hit_trigger" &&
    unit.mechanics.effect.kind === "speed_delta"
    ? "unsupported"
    : null;
  /* v8 ignore stop */
}

export function battleWeaponMasteryCleaveSupportForUnit(
  unit: AuthoredUnitSource,
): BattleWeaponMasteryCleaveSupport {
  if (unit.kind !== "mastery") {
    return null;
  }
  if (
    unit.mechanics.family !== "on_hit_trigger" ||
    unit.mechanics.effect.kind !== "grant_weapon_attack" ||
    !("usageLimit" in unit.mechanics)
  ) {
    return null;
  }
  /* v8 ignore start -- Malformed Cleave mastery mechanics are rejected at profile admission; canonical Cleave projection is covered. */
  const supported =
    unit.mechanics.trigger.kind === "weapon_hit_melee_only" &&
    unit.mechanics.optional === true &&
    unit.mechanics.effect.attackKind === "melee_weapon_attack" &&
    unit.mechanics.effect.secondaryTarget.kind === "adjacent_to_primary" &&
    unit.mechanics.effect.secondaryTarget.constraint ===
      "within_5ft_and_reach" &&
    unit.mechanics.effect.onHit.kind === "weapon_damage" &&
    unit.mechanics.effect.onHit.abilityModifier === "negative_only" &&
    unit.mechanics.usageLimit.kind === "once_per_turn";
  if (supported) {
    return WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE;
  }
  return "unsupported";
}
/* v8 ignore stop */

function parseBardicInspirationGrantUnitFeatureProfile(
  unit: AuthoredUnitSource,
  classLevels: readonly CharacterBattleClassLevel[],
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "bardicInspirationGrant" }
> | null {
  if (unit.kind !== "class_feature" || unit.className !== "bard") {
    return null;
  }
  const classLevel = findCharacterClassLevel(classLevels, unit.className);
  if (classLevel === undefined || classLevel < unit.acquiredAtLevel) {
    return null;
  }
  if (unit.mechanics.family !== "activation") {
    return null;
  }
  const mechanics = unit.mechanics;
  const range = mechanics.range;
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
  const phase = mechanics.phases[0];
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "target" ||
    phase.attachment.selection.mode !== "one" ||
    phase.effects?.length !== 1
  ) {
    return null;
  }
  const effect = phase.effects[0];
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
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(effect.duration);
  const dieSize = bardicInspirationDieSizeAtClassLevel(effect.die, classLevel);
  if (dieSize === null || Either.isLeft(durationTicks)) {
    return null;
  }
  return {
    kind: "bardicInspirationGrant",
    unit,
    rangeFeet: movementFeet(BARDIC_INSPIRATION_RANGE_FEET),
    dieSize,
    durationTicks: durationTicks.right,
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
  if (unit.kind !== "class_feature") {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.family !== "activation" ||
    mechanics.activationCost.kind !== "free" ||
    mechanics.resource?.kind !== "use_count" ||
    mechanics.resetCadence?.kind !== "short_or_long_rest" ||
    mechanics.usageLimit?.kind !== "once_per_turn"
  ) {
    return null;
  }
  if (mechanics.phases.length !== 1) {
    return null;
  }
  const phase = mechanics.phases[0];
  if (phase?.kind !== "direct") {
    return null;
  }
  if (phase.effects?.length !== 1) {
    return null;
  }
  const effect = phase.effects[0];
  return effect.kind === "grant_extra_action"
    ? {
        kind: "extraActionGrant",
        unit,
        restriction: effect.restriction,
      }
    : null;
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
  /* v8 ignore start -- Malformed Retaliation reaction mechanics are rejected at profile admission; the canonical one-attack reaction projection is covered. */
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
  /* v8 ignore stop */
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
  if (unit.kind !== "class_feature") {
    return null;
  }
  const classLevel = findCharacterClassLevel(classLevels, unit.className);
  if (classLevel === undefined || classLevel < unit.acquiredAtLevel) {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.family !== "activation" ||
    mechanics.activationCost.kind !== "bonus_action" ||
    mechanics.resource?.kind !== "use_count" ||
    mechanics.resetCadence?.kind !== "partial_short_full_long" ||
    mechanics.phases.length !== 1
  ) {
    return null;
  }
  const phase = mechanics.phases[0];
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "self" ||
    phase.effects?.length !== 1
  ) {
    return null;
  }
  const effect = phase.effects[0];
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
  if (unit.kind !== "class_feature") {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.family !== "activation" ||
    !("ongoingFeature" in mechanics) ||
    mechanics.ongoingFeature === undefined ||
    mechanics.phases.length !== 1
  ) {
    return null;
  }
  const phase = mechanics.phases[0];
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "self" ||
    phase.effects === undefined ||
    phase.effects.length === 0
  ) {
    return null;
  }
  const effects = phase.effects.flatMap((effect): readonly EffectAtom[] =>
    isEffectAtom(effect) ? [effect] : [],
  );
  const parsedEffects =
    effects.length === phase.effects.length
      ? (parseOngoingFeatureEffects(effects, classLevels, unit) ??
        parseSpellBenefitActivationProjectionEffects(phase.effects))
      : parseSpellBenefitActivationProjectionEffects(phase.effects);
  if (parsedEffects === null) {
    return null;
  }
  const override = mechanics.ongoingFeature.levelOverrides
    ?.filter(
      (candidate) =>
        classLevelForClass(classLevels, unit.className) >=
        candidate.atClassLevel,
    )
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
  if (activation === null) {
    return null;
  }
  const lifecycleProfile = parseOngoingFeatureLifecycle(lifecycle);
  if (lifecycleProfile === null) {
    return null;
  }
  const actionRestrictions = parseOngoingFeatureActionRestrictions(
    support.actionRestrictions ?? [],
  );
  if (actionRestrictions === null) {
    return null;
  }
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
  if (unit.kind !== "class_feature" || mechanics === null) {
    return null;
  }
  const classLevel = findCharacterClassLevel(classLevels, unit.className);
  if (classLevel === undefined || classLevel < unit.acquiredAtLevel) {
    return null;
  }
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
  if (unit.kind !== "class_feature" || mechanics === null) {
    return null;
  }
  const classLevel = findCharacterClassLevel(classLevels, unit.className);
  if (classLevel === undefined || classLevel < unit.acquiredAtLevel) {
    return null;
  }
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
  if (unit.kind !== "class_feature") {
    return null;
  }
  const classLevel = findCharacterClassLevel(classLevels, unit.className);
  if (classLevel === undefined || classLevel < unit.acquiredAtLevel) {
    return null;
  }
  const modifiers = reactionRollOrDamageReductionMechanicsProjection(
    unit,
    classLevel,
  );
  if (modifiers === null) {
    return null;
  }
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

function classLevelForClass(
  classLevels: readonly CharacterBattleClassLevel[],
  className: ClassName,
): number {
  return Number(
    classLevels.find((candidate) => candidate.className === className)?.level ??
      0,
  );
}

type OngoingFeatureLifecycleSupport =
  | {
      readonly kind: "turn_boundary";
      readonly initialExpiration: "start_of_next_turn";
      readonly earlyEndConditions?: readonly string[];
      readonly earlyEndArmorCategories?: readonly string[];
    }
  | {
      readonly kind: "round_extended";
      readonly initialExpiration: "end_of_next_turn";
      readonly maximumDuration: {
        readonly unit: "round" | "minute" | "hour" | "day";
        readonly amount: number;
      };
      readonly earlyEndConditions?: readonly string[];
      readonly earlyEndArmorCategories?: readonly string[];
      readonly extensionTriggers: readonly (
        | "attack_roll_against_enemy"
        | "bonus_action"
        | "enemy_saving_throw"
      )[];
    }
  | {
      readonly kind: "fixed_duration";
      readonly duration: {
        readonly unit: "round" | "minute" | "hour" | "day";
        readonly amount: number;
      };
      readonly earlyEndConditions?: readonly string[];
      readonly earlyEndArmorCategories?: readonly string[];
    };

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
            initialExpiration: parseOngoingFeatureInitialExpiration(
              turnBoundary.initialExpiration,
            ),
            earlyEndConditions,
            earlyEndArmorCategories,
            extensionTriggers: [] as const,
          };
    }),
    Match.when({ kind: "round_extended" }, (roundExtended) => {
      const extensionTriggers = roundExtended.extensionTriggers.map(
        parseOngoingFeatureExtensionTrigger,
      );
      const [firstTrigger, ...remainingTriggers] = extensionTriggers;
      if (firstTrigger === undefined) {
        return null;
      }
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
        firstTrigger,
        ...remainingTriggers,
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

function parseOngoingFeatureActionRestrictions(
  restrictions: readonly string[],
): readonly "spellcasting"[] | null {
  const parsed: "spellcasting"[] = [];
  for (const restriction of restrictions) {
    if (restriction !== "spellcasting") {
      return null;
    }
    parsed.push(restriction);
  }
  return parsed;
}

function parseOngoingFeatureInitialExpiration(
  expiration: "start_of_next_turn" | "end_of_next_turn",
): "startOfNextTurn" | "endOfNextTurn" {
  if (expiration === "start_of_next_turn") return "startOfNextTurn";
  return "endOfNextTurn";
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
  if (Either.isLeft(ticks)) {
    return null;
  }
  return Number(ticks.right);
}

function parseOngoingFeatureEffects(
  effects: readonly EffectAtom[],
  classLevels: readonly CharacterBattleClassLevel[],
  unit: AuthoredUnitSource,
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
      /* v8 ignore start -- Unsupported structured input: the ongoing-feature support profile admits an unfiltered resistance grant only. Source-filtered resistance records are rejected at this admission boundary; admitted resistance projection remains measured below. */
      if ("sourceFilter" in effect && effect.sourceFilter !== undefined) {
        return null;
      }
      /* v8 ignore stop */
      resistances.push(effect.damageType);
      continue;
    }
    if (
      effect.kind === "modify_roll_advantage" &&
      effect.on.includes("attack_roll")
    ) {
      /* v8 ignore start -- Unsupported structured input: this profile admits an attack-roll-only modifier, so a mixed roll-target list is rejected before projection. */
      if (effect.on.some((target) => target !== "attack_roll")) {
        return null;
      }
      /* v8 ignore stop */
      /* v8 ignore start -- Unsupported structured input: attacker, skill, condition, save, range, count, and expiry filters are outside this ongoing-feature profile. The supported optional ability-filter projection remains measured after this guard. */
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
      /* v8 ignore stop */
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
        ...(abilityFilter === undefined ? {} : { abilityFilter }),
      };
      rollModifiers.push(rollModifier);
      continue;
    }
    if (effect.kind === "modify_damage_numeric") {
      /* v8 ignore start -- Unsupported structured input: this profile admits either no weapon filter or the typed weapon-category filter; other structured filter shapes are rejected at admission. */
      if (
        effect.weaponFilter !== undefined &&
        effect.weaponFilter.kind !== "weapon_category"
      ) {
        return null;
      }
      /* v8 ignore stop */
      const amount = numericDeltaForClassLevel(
        effect.delta,
        unit.kind === "class_feature"
          ? classLevelForClass(classLevels, unit.className)
          : 0,
      );
      /* v8 ignore start -- Unsupported structured input: numericDeltaForClassLevel admits only the fixed-number and class-threshold shapes projected by this profile. */
      if (amount === null) {
        return null;
      }
      /* v8 ignore stop */
      damageModifiers.push({
        amount,
        ...(effect.abilityFilter === undefined
          ? {}
          : { abilityFilter: effect.abilityFilter }),
        ...(effect.weaponFilter?.kind === "weapon_category"
          ? { weaponUsageFilter: effect.weaponFilter.category }
          : {}),
      });
      continue;
    }
    /* v8 ignore next -- Unsupported structured input: every effect kind owned by this ongoing-feature profile is handled above; unrelated effect atoms are rejected at admission. */
    return null;
  }
  return rollModifiers.length === 0 &&
    damageModifiers.length === 0 &&
    resistances.length === 0
    ? parseSpellBenefitActivationProjectionEffects(effects)
    : { rollModifiers, spellModifiers, damageModifiers, resistances };
}

function parseSpellBenefitActivationProjectionEffects(
  effects: readonly { readonly kind: string }[],
): Pick<
  Extract<SupportedUnitFeatureProfile, { readonly kind: "ongoingFeature" }>,
  "rollModifiers" | "spellModifiers" | "damageModifiers" | "resistances"
> | null {
  /* v8 ignore start -- Unsupported structured input: the spell-benefit activation profile is defined by exactly one save-DC atom and one spell-attack atom; other cardinalities are rejected before projection. */
  if (effects.length !== 2) {
    return null;
  }
  /* v8 ignore stop */
  const saveDc = effects.find((effect) => effect.kind === "modify_save_dc");
  const attackRollAdvantage = effects.find(
    (effect) => effect.kind === "modify_roll_advantage",
  );
  const saveDcModifier = spellSaveDcModifierBenefit(saveDc);
  const attackRollModifier =
    spellAttackRollModeModifierBenefit(attackRollAdvantage);
  /* v8 ignore start -- Unsupported structured input: malformed atom shapes or benefits sourced from different classes cannot form one spell-benefit activation profile. */
  if (
    saveDcModifier === null ||
    attackRollModifier === null ||
    saveDcModifier.sourceClassName !== attackRollModifier.sourceClassName
  ) {
    return null;
  }
  /* v8 ignore stop */
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

function spellSaveDcModifierBenefit(
  effect: { readonly kind: string } | undefined,
): { readonly sourceClassName: ClassName; readonly saveDcBonus: 1 } | null {
  if (
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
  ) {
    const sourceClassName = spellSourceFilterClassName(
      effect.spellSourceFilter,
    );
    return sourceClassName === null
      ? null
      : { sourceClassName, saveDcBonus: 1 };
  }
  return null;
}

function spellAttackRollModeModifierBenefit(
  effect: { readonly kind: string } | undefined,
): {
  readonly sourceClassName: ClassName;
  readonly attackRollMode: "advantage";
} | null {
  if (
    effect?.kind === "modify_roll_advantage" &&
    hasOnlySpellAttackRollModeModifierBenefitFields(effect) &&
    "mode" in effect &&
    effect.mode === "advantage" &&
    "on" in effect &&
    Array.isArray(effect.on) &&
    effect.on.length === 1 &&
    effect.on[0] === "spell_attack_roll" &&
    "spellSourceFilter" in effect
  ) {
    const sourceClassName = spellSourceFilterClassName(
      effect.spellSourceFilter,
    );
    return sourceClassName === null
      ? null
      : { sourceClassName, attackRollMode: "advantage" };
  }
  return null;
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
  delta: {
    readonly kind: string;
    readonly amount?: number;
    readonly axis?: string;
    readonly base?: number;
    readonly tiers?: readonly {
      readonly atLevel: number;
      readonly value: number;
    }[];
    readonly sign?: string;
  },
  classLevel: number,
): number | null {
  if (delta.kind === "fixed_number" && delta.amount !== undefined) {
    return delta.sign === "-" ? -delta.amount : delta.amount;
  }
  if (
    delta.kind === "threshold_tiers" &&
    delta.axis === "class" &&
    delta.base !== undefined &&
    delta.tiers !== undefined
  ) {
    const value = delta.tiers.reduce(
      (current, tier) => (classLevel >= tier.atLevel ? tier.value : current),
      delta.base,
    );
    return delta.sign === "-" ? -value : value;
  }
  return null;
}
