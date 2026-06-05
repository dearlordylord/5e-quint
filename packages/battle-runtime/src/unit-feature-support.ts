// RAW-COVERAGE: runtime-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.alternate-action-cost unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bardic-inspiration-grant unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-delegated-standard-actions unit-feature.bonus-action-ongoing-rage unit-feature.druid-wild-shape-known-form unit-feature.enemy-zero-hit-point-temporary-hit-points unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.hunters-prey unit-feature.initiative-proficiency-and-swap unit-feature.innate-sorcery-activation unit-feature.magic-action-area-save-damage-healing unit-feature.magic-action-healing-pool unit-feature.martial-arts-attack-projection unit-feature.monk-focus-battle-options unit-feature.open-hand-technique unit-feature.paladin-sacred-weapon unit-feature.passive-armor-class-bonus unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-saving-throw-roll-mode unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.potent-cantrip unit-feature.reaction-roll-or-damage-reduction unit-feature.remarkable-athlete unit-feature.rogue-steady-aim unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.spell-slot-healing-modifier unit-feature.weapon-critical-range-19 unit-feature.weapon-damage-dice-roll-choice unit-feature.weapon-mastery-sap unit-feature.weapon-mastery-topple unit-feature.weapon-mastery-cleave unit-feature.zero-hit-point-replacement
import { Match } from "effect";
import * as Either from "effect/Either";
import {
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import { zeroHitPointReplacementUnitProfile } from "@dnd/shared-algebras/zero-hit-point-replacement-algebra";
import {
  ARMOR_CATEGORIES,
  CONDITIONS as ALL_CONDITIONS,
  ClassLevel,
  classLevel,
  movementDeltaFeet,
  movementFeet,
  type Condition,
  type DamageDieSize,
  type MovementDeltaFeet,
  type MovementFeet,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type {
  Ability,
  ActionRestriction,
  ClassName,
  DiceAmount,
  DiceExpr,
  DamageType,
  EffectAtom,
  EquipmentPredicate,
  CreatureType,
  StandardActionKind,
  UnitRecord,
  WeaponRecord,
} from "@dnd/surface/surface/types";
import { isEffectAtom } from "@dnd/surface/surface/types";
import {
  druidWildShapeKnownFormRosterFromPhase,
  isDruidWildShapeFeatureRecord,
  type DruidWildShapeActivationPhase,
  type DruidWildShapeKnownFormsRoster,
} from "@dnd/surface/surface/druid-wild-shape-readers";
import type { BattleMovementSpeedKind } from "./battle-subjects.ts";
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
export const PASSIVE_RANGED_ATTACK_ROLL_BONUS_SUPPORT_PROFILE =
  "passiveRangedAttackRollBonus";
export const INITIATIVE_PROFICIENCY_AND_SWAP_SUPPORT_PROFILE =
  "initiativeProficiencyAndSwap";
export const ATTACK_ROLL_MISS_TO_HIT_REPLACEMENT_SUPPORT_PROFILE =
  "attackRollMissToHitReplacement";
export const PASSIVE_SAVING_THROW_ROLL_MODE_SUPPORT_PROFILE =
  "passiveSavingThrowRollMode";
export const PASSIVE_SPEED_BONUS_SUPPORT_PROFILE = "passiveSpeedBonus";
export const PASSIVE_SPEED_KIND_GRANTS_SUPPORT_PROFILE =
  "passiveSpeedKindGrants";
export const WEAPON_DAMAGE_DICE_ROLL_CHOICE_SUPPORT_PROFILE =
  "weaponDamageDiceRollChoice";
export const MARTIAL_ARTS_ATTACK_PROJECTION_SUPPORT_PROFILE =
  "martialArtsAttackProjection";
export const ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE =
  "attackActionAttackCountScaling";
export const ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE =
  "zeroHitPointReplacement";
export const BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE =
  "bonusActionDashTemporaryHitPoints";
export const FAILED_ABILITY_CHECK_RESOURCE_BOOST_SUPPORT_PROFILE =
  "failedAbilityCheckResourceBoost";
export const BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE =
  "bardicInspirationGrant";
export const MONK_FOCUS_BATTLE_OPTIONS_SUPPORT_PROFILE =
  "monkFocusBattleOptions";
export const DRUID_WILD_SHAPE_KNOWN_FORM_SUPPORT_PROFILE =
  "druidWildShapeKnownForm";
export const SPELL_SLOT_HEALING_MODIFIER_SUPPORT_PROFILE =
  "spellSlotHealingModifier";
export const MAGIC_ACTION_HEALING_POOL_SUPPORT_PROFILE =
  "magicActionHealingPool";
export const MAGIC_ACTION_AREA_SAVE_DAMAGE_HEALING_SUPPORT_PROFILE =
  "magicActionAreaSaveDamageHealing";
export const ENEMY_ZERO_HIT_POINT_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE =
  "enemyZeroHitPointTemporaryHitPoints";
export const BONUS_ACTION_DELEGATED_STANDARD_ACTIONS_SUPPORT_PROFILE =
  "bonusActionDelegatedStandardActions";
export const REMARKABLE_ATHLETE_SUPPORT_PROFILE = "remarkableAthlete";
export const OPEN_HAND_TECHNIQUE_SUPPORT_PROFILE = "openHandTechnique";
export const PALADIN_SACRED_WEAPON_SUPPORT_PROFILE = "paladinSacredWeapon";
export const HUNTERS_PREY_SUPPORT_PROFILE = "huntersPrey";
export const ROGUE_STEADY_AIM_SUPPORT_PROFILE = "rogueSteadyAim";
export const POTENT_CANTRIP_SUPPORT_PROFILE = "potentCantrip";
export const WEAPON_MASTERY_SAP_SUPPORT_PROFILE = "weaponMasterySap";
export const WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE = "weaponMasteryTopple";
export const WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE = "weaponMasteryCleave";
const BARDIC_INSPIRATION_RANGE_FEET = 60;
const BARDIC_INSPIRATION_BASE_DIE_SIZE = 6;
const CLERIC_CHANNEL_DIVINITY_RESOURCE_UNIT_ID =
  "cleric_channel_divinity" as const satisfies UnitRecord["id"];
export const PALADIN_CHANNEL_DIVINITY_RESOURCE_UNIT_ID =
  "paladin_channel_divinity" as const satisfies UnitRecord["id"];
const DRUID_WILD_SHAPE_RESOURCE_UNIT_ID =
  "druid_wild_shape" as const satisfies UnitRecord["id"];
const MONK_FOCUS_RESOURCE_UNIT_ID =
  "monk_monks_focus" as const satisfies UnitRecord["id"];
const MONK_FLURRY_OF_BLOWS_OPTION_ID = "flurry_of_blows" as const;
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
const MARTIAL_ARTS_BASE_DIE_SIZE = 6;
const MARTIAL_ARTS_DIE_TIERS = [
  { atLevel: 5, dieSize: 8 },
  { atLevel: 11, dieSize: 10 },
  { atLevel: 17, dieSize: 12 },
] as const satisfies ReadonlyArray<{
  readonly atLevel: number;
  readonly dieSize: DamageDieSize;
}>;
type MartialArtsDieSize =
  | typeof MARTIAL_ARTS_BASE_DIE_SIZE
  | (typeof MARTIAL_ARTS_DIE_TIERS)[number]["dieSize"];
export const ALTERNATE_ACTION_COST_ACTIONS = [
  "dash",
  "disengage",
  "hide",
] as const satisfies ReadonlyArray<StandardActionKind>;
export type AlternateActionCostAction =
  (typeof ALTERNATE_ACTION_COST_ACTIONS)[number];
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
  PASSIVE_SAVING_THROW_ROLL_MODE_SUPPORT_PROFILE,
  PASSIVE_SPEED_BONUS_SUPPORT_PROFILE,
  PASSIVE_SPEED_KIND_GRANTS_SUPPORT_PROFILE,
  WEAPON_DAMAGE_DICE_ROLL_CHOICE_SUPPORT_PROFILE,
  MARTIAL_ARTS_ATTACK_PROJECTION_SUPPORT_PROFILE,
  ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE,
  BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE,
  DRUID_WILD_SHAPE_KNOWN_FORM_SUPPORT_PROFILE,
  BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
  FAILED_ABILITY_CHECK_RESOURCE_BOOST_SUPPORT_PROFILE,
  MONK_FOCUS_BATTLE_OPTIONS_SUPPORT_PROFILE,
  SPELL_SLOT_HEALING_MODIFIER_SUPPORT_PROFILE,
  MAGIC_ACTION_HEALING_POOL_SUPPORT_PROFILE,
  MAGIC_ACTION_AREA_SAVE_DAMAGE_HEALING_SUPPORT_PROFILE,
  ENEMY_ZERO_HIT_POINT_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
  BONUS_ACTION_DELEGATED_STANDARD_ACTIONS_SUPPORT_PROFILE,
  REMARKABLE_ATHLETE_SUPPORT_PROFILE,
  OPEN_HAND_TECHNIQUE_SUPPORT_PROFILE,
  PALADIN_SACRED_WEAPON_SUPPORT_PROFILE,
  HUNTERS_PREY_SUPPORT_PROFILE,
  ROGUE_STEADY_AIM_SUPPORT_PROFILE,
  POTENT_CANTRIP_SUPPORT_PROFILE,
  WEAPON_MASTERY_SAP_SUPPORT_PROFILE,
  WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE,
  WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE,
  ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE,
] as const;
export type BattlePassiveSpeedBonusSupportProfile = {
  readonly kind: typeof PASSIVE_SPEED_BONUS_SUPPORT_PROFILE;
  readonly deltaFeet: MovementDeltaFeet;
  readonly condition: PassiveSpeedBonusCondition;
};
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
export type PassiveSavingThrowRollModeProfile = {
  readonly mode: "advantage";
  readonly ability: "dex";
  readonly suppressedByCondition: "incapacitated";
};
export type BattlePassiveSavingThrowRollModeSupportProfile = {
  readonly kind: typeof PASSIVE_SAVING_THROW_ROLL_MODE_SUPPORT_PROFILE;
  readonly savingThrow: PassiveSavingThrowRollModeProfile;
};
export const BATTLE_ATTACK_ACTION_ADDITIONAL_ATTACKS = [
  1,
  2,
  3,
] as const satisfies ReadonlyArray<number>;
export type BattleAttackActionAdditionalAttacks =
  (typeof BATTLE_ATTACK_ACTION_ADDITIONAL_ATTACKS)[number];
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
    readonly resourceUnitId: UnitRecord["id"];
  };
  readonly refundSpendOnStillFailed: true;
};
export type BattleFailedAbilityCheckResourceBoostSupportProfile = {
  readonly kind: typeof FAILED_ABILITY_CHECK_RESOURCE_BOOST_SUPPORT_PROFILE;
  readonly abilityCheck: FailedAbilityCheckResourceBoostProfile;
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
    readonly resourceUnitId: UnitRecord["id"];
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
    readonly resourceUnitId: UnitRecord["id"];
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
  readonly temporaryHitPoints: EnemyZeroHitPointTemporaryHitPointsProfile;
};
export const PASSIVE_SPEED_KIND_GRANT_KINDS = [
  "climb",
  "swim",
] as const satisfies ReadonlyArray<BattleMovementSpeedKind>;
export type PassiveSpeedKindGrantKind =
  (typeof PASSIVE_SPEED_KIND_GRANT_KINDS)[number];
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
export type PassiveSpeedKindGrantProfile =
  | ClimbSpeedKindGrantProfile
  | SwimSpeedKindGrantProfile;
export type BattlePassiveSpeedKindGrantsSupportProfile = {
  readonly kind: typeof PASSIVE_SPEED_KIND_GRANTS_SUPPORT_PROFILE;
  readonly speed: PassiveSpeedBonusProfile;
  readonly grants: readonly [
    ClimbSpeedKindGrantProfile,
    SwimSpeedKindGrantProfile,
  ];
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
  readonly choices: readonly [
    {
      readonly id: "addle";
      readonly effect: {
        readonly kind: "denyOpportunityAttacks";
        readonly expires: "startOfTargetNextTurn";
      };
    },
    {
      readonly id: "push";
      readonly save: { readonly ability: "str" };
      readonly onFail: {
        readonly kind: "pushAway";
        readonly distanceFeet: MovementFeet;
      };
    },
    {
      readonly id: "topple";
      readonly save: { readonly ability: "dex" };
      readonly onFail: {
        readonly kind: "applyCondition";
        readonly condition: "prone";
      };
    },
  ];
};
export type BattleOpenHandTechniqueSupportProfile = {
  readonly kind: typeof OPEN_HAND_TECHNIQUE_SUPPORT_PROFILE;
  readonly technique: OpenHandTechniqueProfile;
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
export type HuntersPreyProfile = {
  readonly choice: {
    readonly kind: "chooseOne";
    readonly replaceOn: "shortOrLongRest";
  };
  readonly options: readonly [
    {
      readonly id: "colossusSlayer";
      readonly trigger: "hitCreatureWithWeapon";
      readonly targetPredicate: "missingAnyHitPoints";
      readonly usageLimit: "oncePerTurn";
      readonly damage: {
        readonly kind: "addAttackDamageDice";
        readonly dice: { readonly dice: 1; readonly dieSize: 8 };
        readonly damageType: "sameAsAttack";
      };
    },
    {
      readonly id: "hordeBreaker";
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
    },
  ];
};
export type BattleHuntersPreySupportProfile = {
  readonly kind: typeof HUNTERS_PREY_SUPPORT_PROFILE;
  readonly huntersPrey: HuntersPreyProfile;
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
export type BattleMonkFocusBattleOptionsSupportProfile = {
  readonly kind: typeof MONK_FOCUS_BATTLE_OPTIONS_SUPPORT_PROFILE;
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
export type BattleDruidWildShapeKnownFormSupportProfile = {
  readonly kind: typeof DRUID_WILD_SHAPE_KNOWN_FORM_SUPPORT_PROFILE;
  readonly classLevel: ClassLevel;
  readonly knownFormRoster: {
    readonly creatureType: CreatureType;
    readonly count: number;
    readonly maxChallengeRating: number;
    readonly flySpeed: "allowed" | "forbidden";
  };
};

export type SupportedDruidWildShapeKnownFormProfile =
  BattleDruidWildShapeKnownFormSupportProfile & {
    readonly unit: UnitRecord;
  };
export type BattleUnitSupportProfile =
  | BattleAlternateActionCostSupportProfile
  | BattleBonusActionDelegatedStandardActionsSupportProfile
  | BattleMonkFocusBattleOptionsSupportProfile
  | BattlePassiveRangedAttackRollBonusSupportProfile
  | BattleInitiativeProficiencyAndSwapSupportProfile
  | BattleAttackRollMissToHitReplacementSupportProfile
  | BattlePassiveSavingThrowRollModeSupportProfile
  | BattlePassiveSpeedBonusSupportProfile
  | BattlePassiveSpeedKindGrantsSupportProfile
  | BattleAttackActionAttackCountScalingSupportProfile
  | BattleBonusActionDashTemporaryHitPointsSupportProfile
  | BattleFailedAbilityCheckResourceBoostSupportProfile
  | BattleSpellSlotHealingModifierSupportProfile
  | BattleMagicActionHealingPoolSupportProfile
  | BattleMagicActionAreaSaveDamageHealingSupportProfile
  | BattleEnemyZeroHitPointTemporaryHitPointsSupportProfile
  | BattleDruidWildShapeKnownFormSupportProfile
  | BattleRemarkableAthleteSupportProfile
  | BattleOpenHandTechniqueSupportProfile
  | BattlePaladinSacredWeaponSupportProfile
  | BattleHuntersPreySupportProfile
  | BattleRogueSteadyAimSupportProfile
  | BattlePotentCantripSupportProfile
  | Exclude<
      (typeof BATTLE_UNIT_SUPPORT_PROFILES)[number],
      | "alternateActionCost"
      | "bonusActionDelegatedStandardActions"
      | "monkFocusBattleOptions"
      | "passiveRangedAttackRollBonus"
      | "initiativeProficiencyAndSwap"
      | "attackRollMissToHitReplacement"
      | "passiveSavingThrowRollMode"
      | "passiveSpeedBonus"
      | "passiveSpeedKindGrants"
      | "attackActionAttackCountScaling"
      | "bonusActionDashTemporaryHitPoints"
      | "failedAbilityCheckResourceBoost"
      | "spellSlotHealingModifier"
      | "magicActionHealingPool"
      | "magicActionAreaSaveDamageHealing"
      | "enemyZeroHitPointTemporaryHitPoints"
      | "druidWildShapeKnownForm"
      | "remarkableAthlete"
      | "openHandTechnique"
      | "paladinSacredWeapon"
      | "huntersPrey"
      | "rogueSteadyAim"
      | "potentCantrip"
    >;

export type BattleUnitSupportProfileIssue = {
  readonly tag: "battleUnitSupportProfileIssue";
  readonly message: string;
};

export type ClassicNonSrdMechanicsUnit = {
  readonly id: UnitRecord["id"];
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

type BattleUnitSupportSource = UnitRecord | ClassicNonSrdMechanicsUnit;

function battleUnitSupportProfileIssue(
  message: string,
): Either.Either<never, BattleUnitSupportProfileIssue> {
  return Either.left({ tag: "battleUnitSupportProfileIssue", message });
}

export function battleUnitSupportProfilesForUnit(input: {
  readonly unit: BattleUnitSupportSource;
  readonly classLevels?: readonly CharacterBattleClassLevel[];
}): Either.Either<
  readonly BattleUnitSupportProfile[],
  BattleUnitSupportProfileIssue
> {
  const supportProfiles: BattleUnitSupportProfile[] = [];

  const bonusActionStandardActionSupport =
    battleBonusActionStandardActionSupportForUnit(input.unit);
  if (bonusActionStandardActionSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle bonus-action standard-action Unit hook: ${input.unit.id}.`,
    );
  }
  if (bonusActionStandardActionSupport !== null) {
    supportProfiles.push(bonusActionStandardActionSupport);
  }

  const bonusActionDelegatedStandardActionsSupport =
    battleBonusActionDelegatedStandardActionsSupportForUnit(input.unit);
  if (bonusActionDelegatedStandardActionsSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Bonus Action delegated standard-action Unit hook: ${input.unit.id}.`,
    );
  }
  if (bonusActionDelegatedStandardActionsSupport !== null) {
    supportProfiles.push(bonusActionDelegatedStandardActionsSupport);
  }

  if (isClassicNonSrdMechanicsUnit(input.unit)) {
    return Either.right(supportProfiles);
  }

  const criticalRangeSupport =
    battleWeaponOrUnarmedCriticalRange19SupportForUnit(input.unit);
  if (criticalRangeSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle critical-range Unit hook: ${input.unit.id}.`,
    );
  }
  if (criticalRangeSupport === "criticalRange19") {
    supportProfiles.push(WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE);
  }

  const attackDamageRiderSupport = battleAttackDamageRiderSupportForUnit(
    input.unit,
  );
  if (attackDamageRiderSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle attack-damage rider Unit hook: ${input.unit.id}.`,
    );
  }
  if (attackDamageRiderSupport === "attackDamageRider") {
    supportProfiles.push(ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE);
  }

  const saveDamageReplacementSupport =
    battleSaveDamageReplacementSupportForUnit(input.unit);
  if (saveDamageReplacementSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle save-damage replacement Unit hook: ${input.unit.id}.`,
    );
  }
  if (saveDamageReplacementSupport === "saveDamageReplacement") {
    supportProfiles.push(SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE);
  }

  const reactionRollOrDamageReductionSupport =
    battleReactionRollOrDamageReductionSupportForUnit(input.unit);
  if (reactionRollOrDamageReductionSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle reaction roll or damage reduction Unit hook: ${input.unit.id}.`,
    );
  }
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

  const passiveArmorClassBonusSupport =
    battlePassiveArmorClassBonusSupportForUnit(input.unit);
  if (passiveArmorClassBonusSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle passive Armor Class bonus Unit hook: ${input.unit.id}.`,
    );
  }
  if (passiveArmorClassBonusSupport === "passiveArmorClassBonus") {
    supportProfiles.push(PASSIVE_ARMOR_CLASS_BONUS_SUPPORT_PROFILE);
  }

  const passiveRangedAttackRollBonusSupport =
    battlePassiveRangedAttackRollBonusSupportForUnit(input.unit);
  if (passiveRangedAttackRollBonusSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle passive ranged attack-roll bonus Unit hook: ${input.unit.id}.`,
    );
  }
  if (passiveRangedAttackRollBonusSupport !== null) {
    supportProfiles.push(passiveRangedAttackRollBonusSupport);
  }

  const initiativeProficiencyAndSwapSupport =
    battleInitiativeProficiencyAndSwapSupportForUnit(input.unit);
  if (initiativeProficiencyAndSwapSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Initiative proficiency-and-swap Unit hook: ${input.unit.id}.`,
    );
  }
  if (initiativeProficiencyAndSwapSupport !== null) {
    supportProfiles.push(initiativeProficiencyAndSwapSupport);
  }

  const attackRollMissToHitReplacementSupport =
    battleAttackRollMissToHitReplacementSupportForUnit(input.unit);
  if (attackRollMissToHitReplacementSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle attack-roll miss-to-hit replacement Unit hook: ${input.unit.id}.`,
    );
  }
  if (attackRollMissToHitReplacementSupport !== null) {
    supportProfiles.push(attackRollMissToHitReplacementSupport);
  }

  const passiveSavingThrowRollModeSupport =
    battlePassiveSavingThrowRollModeSupportForUnit(input.unit);
  if (passiveSavingThrowRollModeSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle passive Saving Throw roll-mode Unit hook: ${input.unit.id}.`,
    );
  }
  if (passiveSavingThrowRollModeSupport !== null) {
    supportProfiles.push(passiveSavingThrowRollModeSupport);
  }

  const passiveSpeedBonusSupport = battlePassiveSpeedBonusSupportForUnit(
    input.unit,
  );
  if (passiveSpeedBonusSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle passive Speed bonus Unit hook: ${input.unit.id}.`,
    );
  }
  if (passiveSpeedBonusSupport !== null) {
    supportProfiles.push(passiveSpeedBonusSupport);
  }

  const passiveSpeedKindGrantsSupport =
    battlePassiveSpeedKindGrantsSupportForUnit(input.unit);
  if (passiveSpeedKindGrantsSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle passive Speed-kind grants Unit hook: ${input.unit.id}.`,
    );
  }
  if (passiveSpeedKindGrantsSupport !== null) {
    supportProfiles.push(passiveSpeedKindGrantsSupport);
  }

  const weaponDamageDiceRollChoiceSupport =
    battleWeaponDamageDiceRollChoiceSupportForUnit(input.unit);
  if (weaponDamageDiceRollChoiceSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle weapon damage dice roll choice Unit hook: ${input.unit.id}.`,
    );
  }
  if (weaponDamageDiceRollChoiceSupport === "weaponDamageDiceRollChoice") {
    supportProfiles.push(WEAPON_DAMAGE_DICE_ROLL_CHOICE_SUPPORT_PROFILE);
  }

  const martialArtsAttackProjectionSupport =
    battleMartialArtsAttackProjectionSupportForUnit(input.unit);
  if (martialArtsAttackProjectionSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Martial Arts attack projection Unit hook: ${input.unit.id}.`,
    );
  }
  if (martialArtsAttackProjectionSupport === "martialArtsAttackProjection") {
    supportProfiles.push(MARTIAL_ARTS_ATTACK_PROJECTION_SUPPORT_PROFILE);
  }

  const monkFocusBattleOptionsSupport =
    battleMonkFocusBattleOptionsSupportForUnit(input.unit);
  if (monkFocusBattleOptionsSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Monk Focus options Unit hook: ${input.unit.id}.`,
    );
  }
  if (monkFocusBattleOptionsSupport !== null) {
    supportProfiles.push(monkFocusBattleOptionsSupport);
  }

  const attackActionAttackCountScalingSupport =
    battleAttackActionAttackCountScalingSupportForUnit(input.unit);
  if (attackActionAttackCountScalingSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Attack action attack-count scaling Unit hook: ${input.unit.id}.`,
    );
  }
  if (attackActionAttackCountScalingSupport !== null) {
    supportProfiles.push(attackActionAttackCountScalingSupport);
  }

  const zeroHitPointReplacementSupport =
    battleZeroHitPointReplacementSupportForUnit(input.unit);
  if (zeroHitPointReplacementSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle zero-Hit-Point replacement Unit hook: ${input.unit.id}.`,
    );
  }
  if (zeroHitPointReplacementSupport === "zeroHitPointReplacement") {
    supportProfiles.push(ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE);
  }

  const bonusActionDashTemporaryHitPointsSupport =
    battleBonusActionDashTemporaryHitPointsSupportForUnit(input.unit);
  if (bonusActionDashTemporaryHitPointsSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Bonus Action Dash Temporary Hit Points Unit hook: ${input.unit.id}.`,
    );
  }
  if (bonusActionDashTemporaryHitPointsSupport !== null) {
    supportProfiles.push(bonusActionDashTemporaryHitPointsSupport);
  }

  const failedAbilityCheckResourceBoostSupport =
    battleFailedAbilityCheckResourceBoostSupportForUnit(input.unit);
  if (failedAbilityCheckResourceBoostSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle failed ability-check resource boost Unit hook: ${input.unit.id}.`,
    );
  }
  if (failedAbilityCheckResourceBoostSupport !== null) {
    supportProfiles.push(failedAbilityCheckResourceBoostSupport);
  }

  const spellSlotHealingModifierSupport =
    battleSpellSlotHealingModifierSupportForUnit(input.unit);
  if (spellSlotHealingModifierSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Spell Slot healing modifier Unit hook: ${input.unit.id}.`,
    );
  }
  if (spellSlotHealingModifierSupport !== null) {
    supportProfiles.push(spellSlotHealingModifierSupport);
  }

  const magicActionHealingPoolSupport =
    battleMagicActionHealingPoolSupportForUnit(input.unit);
  if (magicActionHealingPoolSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Magic Action healing pool Unit hook: ${input.unit.id}.`,
    );
  }
  if (magicActionHealingPoolSupport !== null) {
    supportProfiles.push(magicActionHealingPoolSupport);
  }

  const magicActionAreaSaveDamageHealingSupport =
    battleMagicActionAreaSaveDamageHealingSupportForUnit(
      input.unit,
      input.classLevels,
    );
  if (magicActionAreaSaveDamageHealingSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Magic Action area save damage/healing Unit hook: ${input.unit.id}.`,
    );
  }
  if (magicActionAreaSaveDamageHealingSupport !== null) {
    supportProfiles.push(magicActionAreaSaveDamageHealingSupport);
  }

  const enemyZeroHitPointTemporaryHitPointsSupport =
    battleEnemyZeroHitPointTemporaryHitPointsSupportForUnit(input.unit);
  if (enemyZeroHitPointTemporaryHitPointsSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle enemy zero-Hit-Point Temporary Hit Points Unit hook: ${input.unit.id}.`,
    );
  }
  if (enemyZeroHitPointTemporaryHitPointsSupport !== null) {
    supportProfiles.push(enemyZeroHitPointTemporaryHitPointsSupport);
  }

  const remarkableAthleteSupport = battleRemarkableAthleteSupportForUnit(
    input.unit,
  );
  if (remarkableAthleteSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Remarkable Athlete Unit hook: ${input.unit.id}.`,
    );
  }
  if (remarkableAthleteSupport !== null) {
    supportProfiles.push(remarkableAthleteSupport);
  }

  const openHandTechniqueSupport = battleOpenHandTechniqueSupportForUnit(
    input.unit,
  );
  if (openHandTechniqueSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Open Hand Technique Unit hook: ${input.unit.id}.`,
    );
  }
  if (openHandTechniqueSupport !== null) {
    supportProfiles.push(openHandTechniqueSupport);
  }

  const paladinSacredWeaponSupport = battlePaladinSacredWeaponSupportForUnit(
    input.unit,
  );
  if (paladinSacredWeaponSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Sacred Weapon Unit hook: ${input.unit.id}.`,
    );
  }
  if (paladinSacredWeaponSupport !== null) {
    supportProfiles.push(paladinSacredWeaponSupport);
  }

  const huntersPreySupport = battleHuntersPreySupportForUnit(input.unit);
  if (huntersPreySupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Hunter's Prey Unit hook: ${input.unit.id}.`,
    );
  }
  if (huntersPreySupport !== null) {
    supportProfiles.push(huntersPreySupport);
  }

  const rogueSteadyAimSupport = battleRogueSteadyAimSupportForUnit(input.unit);
  if (rogueSteadyAimSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Steady Aim Unit hook: ${input.unit.id}.`,
    );
  }
  if (rogueSteadyAimSupport !== null) {
    supportProfiles.push(rogueSteadyAimSupport);
  }

  const potentCantripSupport = battlePotentCantripSupportForUnit(input.unit);
  if (potentCantripSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Potent Cantrip Unit hook: ${input.unit.id}.`,
    );
  }
  if (potentCantripSupport !== null) {
    supportProfiles.push(potentCantripSupport);
  }

  const bardicInspirationGrantSupport =
    battleBardicInspirationGrantSupportForUnit(input.unit);
  if (bardicInspirationGrantSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Bardic Inspiration grant Unit hook: ${input.unit.id}.`,
    );
  }
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
  if (druidWildShapeKnownFormSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Druid Wild Shape Unit hook: ${input.unit.id}.`,
    );
  }
  if (druidWildShapeKnownFormSupport !== null) {
    supportProfiles.push(druidWildShapeKnownFormSupport);
  }

  const weaponMasterySapSupport = battleWeaponMasterySapSupportForUnit(
    input.unit,
  );
  if (weaponMasterySapSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Weapon Mastery Sap Unit hook: ${input.unit.id}.`,
    );
  }
  if (weaponMasterySapSupport !== null) {
    supportProfiles.push(weaponMasterySapSupport);
  }

  const weaponMasteryToppleSupport = battleWeaponMasteryToppleSupportForUnit(
    input.unit,
  );
  if (weaponMasteryToppleSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Weapon Mastery Topple Unit hook: ${input.unit.id}.`,
    );
  }
  if (weaponMasteryToppleSupport !== null) {
    supportProfiles.push(weaponMasteryToppleSupport);
  }

  const weaponMasteryCleaveSupport = battleWeaponMasteryCleaveSupportForUnit(
    input.unit,
  );
  if (weaponMasteryCleaveSupport === "unsupported") {
    return battleUnitSupportProfileIssue(
      `Unsupported battle Weapon Mastery Cleave Unit hook: ${input.unit.id}.`,
    );
  }
  if (weaponMasteryCleaveSupport !== null) {
    supportProfiles.push(weaponMasteryCleaveSupport);
  }

  return Either.right(supportProfiles);
}

export function battleUnitRefWithSupportProfiles(input: {
  readonly unitRef: Pick<BattleUnitRef, "unitId" | "selectedOption">;
  readonly unit: BattleUnitSupportSource;
  readonly classLevels?: readonly CharacterBattleClassLevelInit[];
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
  });
  if (Either.isLeft(supportProfiles)) return Either.left(supportProfiles.left);
  if (
    input.unitRef.selectedOption?.kind === "huntersPrey" &&
    !supportProfiles.right.some(
      (profile) =>
        typeof profile === "object" && profile.kind === HUNTERS_PREY_SUPPORT_PROFILE,
    )
  ) {
    return battleUnitSupportProfileIssue(
      `Battle Unit ref ${input.unitRef.unitId} selected Hunter's Prey option requires Hunter's Prey support.`,
    );
  }
  return Either.right({
    unitId: input.unitRef.unitId,
    supportProfiles: supportProfiles.right,
    ...(input.unitRef.selectedOption === undefined
      ? {}
      : { selectedOption: input.unitRef.selectedOption }),
  });
}

export type OngoingFeatureRollModifier = {
  readonly mode: AttackRollMode;
  readonly affects: "selfRoll" | "rollsAgainstSelf";
  readonly on: "attackRoll";
  readonly abilityFilter?: readonly Ability[];
};

export type OngoingFeatureSpellModifier = {
  readonly saveDcBonus: number;
  readonly attackRollMode: AttackRollMode;
};

export function ongoingFeatureSpellModifierSourceClassName(
  profile: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "ongoingFeature" }
  >,
): ClassName | null {
  return profile.unit.kind === "class_feature" ? profile.unit.className : null;
}

export type OngoingFeatureDamageModifier = {
  readonly amount: number;
  readonly abilityFilter?: readonly Ability[];
  readonly weaponUsageFilter?: WeaponRecord["usage"];
};

export type OngoingFeatureExtensionTrigger =
  | "attackRollAgainstEnemy"
  | "bonusAction"
  | "enemySavingThrow";

export type OngoingFeatureLifecycleProfile =
  | {
      readonly kind: "turnBoundary";
      readonly initialExpiration: "startOfNextTurn" | "endOfNextTurn";
      readonly earlyEndConditions: readonly Condition[];
      readonly earlyEndArmorCategories: readonly ["heavy"] | readonly [];
      readonly extensionTriggers: readonly [];
    }
  | {
      readonly kind: "roundExtended";
      readonly initialExpiration: "endOfNextTurn";
      readonly maximumDurationRounds: number;
      readonly earlyEndConditions: readonly Condition[];
      readonly earlyEndArmorCategories: readonly ["heavy"] | readonly [];
      readonly extensionTriggers: readonly [
        OngoingFeatureExtensionTrigger,
        ...OngoingFeatureExtensionTrigger[],
      ];
    }
  | {
      readonly kind: "fixedDuration";
      readonly maximumDurationRounds: number;
      readonly earlyEndConditions: readonly Condition[];
      readonly earlyEndArmorCategories: readonly ["heavy"] | readonly [];
      readonly extensionTriggers: readonly [];
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
    };

type AuthoredAttackDamageReductionZeroDamageRedirect = {
  readonly spends: {
    readonly resourceUnitId: UnitRecord["id"];
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
  expectedResourceUnitId: UnitRecord["id"],
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
  expectedResourceUnitId: UnitRecord["id"],
): AuthoredAttackDamageReductionZeroDamageRedirect | null {
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
  readonly resourceUnitId: UnitRecord["id"];
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

export type PassiveSpeedBonusProfile = {
  readonly deltaFeet: MovementDeltaFeet;
  readonly condition: PassiveSpeedBonusCondition;
};

type PassiveHeavyArmorSpeedBonusCondition = {
  readonly kind: "notWearingArmor";
  readonly categories: readonly ["heavy"];
};

type PassiveUnarmoredUnshieldedSpeedBonusCondition = {
  readonly kind: "unarmoredUnshielded";
};

export type PassiveSpeedBonusCondition =
  | PassiveHeavyArmorSpeedBonusCondition
  | PassiveUnarmoredUnshieldedSpeedBonusCondition;

export type PassiveSpeedKindGrantsProfile = {
  readonly speed: PassiveSpeedBonusProfile;
  readonly grants: readonly [
    ClimbSpeedKindGrantProfile,
    SwimSpeedKindGrantProfile,
  ];
};

export type WeaponDamageDiceRollChoiceProfile = {
  readonly optional: true;
  readonly trigger: "weaponHit";
  readonly usageLimit: "oncePerTurn";
  readonly diceScope: "weaponDamageDice";
  readonly choose: "eitherRoll";
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

export type SupportedUnitFeatureProfile =
  | {
      readonly kind: "extraActionGrant";
      readonly unit: UnitRecord;
      readonly restriction: ActionRestriction;
    }
  | {
      readonly kind: "selfBonusActionHealing";
      readonly unit: UnitRecord;
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
      readonly unit: UnitRecord;
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
      readonly unit: UnitRecord;
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
      readonly unit: UnitRecord;
      readonly optional: false;
      readonly usageLimit: "oncePerTurn";
      readonly trigger: "rageActiveRecklessStrengthWeaponOrUnarmedStrikeFirstHit";
      readonly classLevel: ClassLevel;
      readonly dice: {
        readonly kind: "rageDamageBonus";
        readonly dieSize: 6;
      };
    }
  | {
      readonly kind: "saveDamageReplacement";
      readonly unit: UnitRecord;
      readonly ability: "dex";
      readonly requiredSuccessDamage: "half";
      readonly onSuccess: "none";
      readonly onFail: "half";
      readonly suppressedByCondition: "incapacitated";
    }
  | {
      readonly kind: "reactionRollOrDamageReduction";
      readonly unit: UnitRecord;
      readonly classLevel: ClassLevel;
      readonly modifiers: readonly ReactionRollOrDamageReductionProfile[];
    }
  | {
      readonly kind: "passiveArmorClassBonus";
      readonly unit: UnitRecord;
      readonly armorClass: PassiveArmorClassBonusProfile;
    }
  | {
      readonly kind: "passiveRangedAttackRollBonus";
      readonly unit: UnitRecord;
      readonly attackRoll: PassiveRangedAttackRollBonusProfile;
    }
  | {
      readonly kind: "initiativeProficiencyAndSwap";
      readonly unit: UnitRecord;
      readonly initiative: InitiativeProficiencyAndSwapProfile;
    }
  | {
      readonly kind: "attackRollMissToHitReplacement";
      readonly unit: UnitRecord;
      readonly replacement: AttackRollMissToHitReplacementProfile;
    }
  | {
      readonly kind: "passiveSavingThrowRollMode";
      readonly unit: UnitRecord;
      readonly savingThrow: PassiveSavingThrowRollModeProfile;
    }
  | {
      readonly kind: "passiveSpeedBonus";
      readonly unit: UnitRecord;
      readonly speed: PassiveSpeedBonusProfile;
    }
  | {
      readonly kind: "passiveSpeedKindGrants";
      readonly unit: UnitRecord;
      readonly speedKindGrants: PassiveSpeedKindGrantsProfile;
    }
  | {
      readonly kind: "weaponDamageDiceRollChoice";
      readonly unit: UnitRecord;
      readonly damageDiceChoice: WeaponDamageDiceRollChoiceProfile;
    }
  | {
      readonly kind: "martialArtsAttackProjection";
      readonly unit: UnitRecord;
      readonly classLevel: ClassLevel;
      readonly martialArts: MartialArtsAttackProjectionProfile;
    }
  | {
      readonly kind: "bardicInspirationGrant";
      readonly unit: UnitRecord;
      readonly rangeFeet: MovementFeet;
      readonly dieSize: DamageDieSize;
      readonly durationTicks: ElapsedTimeTicks;
      readonly spends: {
        readonly resourceUnitId: UnitRecord["id"];
        readonly amount: 1;
      };
    }
  | SupportedDruidWildShapeKnownFormProfile
  | {
      readonly kind: "attackActionAttackCountScaling";
      readonly unit: UnitRecord;
      readonly additionalAttacks: BattleAttackActionAdditionalAttacks;
    }
  | {
      readonly kind: "zeroHitPointReplacement";
      readonly unit: UnitRecord;
      readonly optional: true;
      readonly trigger: "reducedToZeroHitPointsNotKilledOutright";
      readonly replacementHp: 1;
      readonly resetCadence: "longRest";
    }
  | {
      readonly kind: "bonusActionDashTemporaryHitPoints";
      readonly unit: UnitRecord;
      readonly dashTemporaryHitPoints: BonusActionDashTemporaryHitPointsProfile;
    }
  | {
      readonly kind: "failedAbilityCheckResourceBoost";
      readonly unit: UnitRecord;
      readonly abilityCheck: FailedAbilityCheckResourceBoostProfile;
    }
  | {
      readonly kind: "spellSlotHealingModifier";
      readonly unit: UnitRecord;
      readonly healingModifier: SpellSlotHealingModifierProfile;
    }
  | {
      readonly kind: "magicActionHealingPool";
      readonly unit: UnitRecord;
      readonly healingPool: MagicActionHealingPoolProfile;
    }
  | {
      readonly kind: "magicActionAreaSaveDamageHealing";
      readonly unit: UnitRecord;
      readonly damageHealing: MagicActionAreaSaveDamageHealingProfile;
    }
  | {
      readonly kind: "enemyZeroHitPointTemporaryHitPoints";
      readonly unit: UnitRecord;
      readonly temporaryHitPoints: EnemyZeroHitPointTemporaryHitPointsProfile;
    }
  | {
      readonly kind: "bonusActionDelegatedStandardActions";
      readonly unit: UnitRecord;
      readonly actionEconomy: BattleBonusActionDelegatedStandardActionsSupportProfile;
    }
  | {
      readonly kind: "remarkableAthlete";
      readonly unit: UnitRecord;
      readonly remarkableAthlete: RemarkableAthleteProfile;
    }
  | {
      readonly kind: "openHandTechnique";
      readonly unit: UnitRecord;
      readonly technique: OpenHandTechniqueProfile;
    }
  | {
      readonly kind: "paladinSacredWeapon";
      readonly unit: UnitRecord;
      readonly sacredWeapon: PaladinSacredWeaponProfile;
    }
  | {
      readonly kind: "huntersPrey";
      readonly unit: UnitRecord;
      readonly huntersPrey: HuntersPreyProfile;
    }
  | {
      readonly kind: "rogueSteadyAim";
      readonly unit: UnitRecord;
      readonly steadyAim: RogueSteadyAimProfile;
    }
  | {
      readonly kind: "potentCantrip";
      readonly unit: UnitRecord;
      readonly potentCantrip: PotentCantripProfile;
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
  if (unit.mechanics.from.kind !== "standard_action" || actions === null) {
    return "unsupported";
  }
  if (unit.mechanics.to.kind !== "bonus_action") {
    return "unsupported";
  }

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
  if (first === undefined || !isAlternateActionCostAction(first)) {
    return null;
  }
  const rest = actions.slice(1);
  if (!rest.every(isAlternateActionCostAction)) {
    return null;
  }
  return [first, ...rest];
}

export function battleMonkFocusBattleOptionsSupportForUnit(
  unit: UnitRecord,
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
  if (
    flurryOfBlows?.battleExecution?.kind !==
      "bonus_action_unarmed_strike_sequence" ||
    patientDefense?.battleExecution?.kind !== "bonus_action_defensive_modes" ||
    stepOfTheWind?.battleExecution?.kind !== "bonus_action_mobility_modes"
  ) {
    return "unsupported";
  }

  return {
    kind: MONK_FOCUS_BATTLE_OPTIONS_SUPPORT_PROFILE,
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
  return null;
}

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

function isClassicNonSrdMechanicsUnit(
  unit: BattleUnitSupportSource,
): unit is ClassicNonSrdMechanicsUnit {
  return unit.provenance.kind === "classic-2024-mechanics-source-lane";
}

export function battleWeaponOrUnarmedCriticalRange19SupportForUnit(
  unit: UnitRecord,
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
          readonly trigger: "rageActiveRecklessStrengthWeaponOrUnarmedStrikeFirstHit";
        }
      >,
      "kind" | "unit" | "usageLimit" | "classLevel"
    >;

export function battleAttackDamageRiderSupportForUnit(
  unit: UnitRecord,
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
  unit: UnitRecord,
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
    mechanics.trigger.attackFilter === "strength_weapon_or_unarmed_strike" &&
    mechanics.trigger.prerequisite ===
      "rage_active_and_reckless_attack_used_this_turn" &&
    mechanics.trigger.hitLimit === "first_target_hit_this_turn" &&
    mechanics.effect.dice.kind === "rage_damage_bonus"
  ) {
    return {
      optional: false,
      trigger: "rageActiveRecklessStrengthWeaponOrUnarmedStrikeFirstHit",
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
  unit: UnitRecord,
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
  unit: UnitRecord,
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
  unit: UnitRecord,
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

export type BattlePassiveSavingThrowRollModeSupport =
  | BattlePassiveSavingThrowRollModeSupportProfile
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

export type BattleWeaponDamageDiceRollChoiceSupport =
  | "weaponDamageDiceRollChoice"
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

export type BattleDruidWildShapeKnownFormSupport =
  | BattleDruidWildShapeKnownFormSupportProfile
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

export function battlePassiveArmorClassBonusSupportForUnit(
  unit: UnitRecord,
): BattlePassiveArmorClassBonusSupport {
  if (!hasPassiveArmorClassBonusMechanics(unit)) {
    return null;
  }
  return passiveArmorClassBonusProfileForUnit(unit) === null
    ? "unsupported"
    : "passiveArmorClassBonus";
}

export function battlePassiveRangedAttackRollBonusSupportForUnit(
  unit: UnitRecord,
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
  unit: UnitRecord,
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
  unit: UnitRecord,
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

export function battlePassiveSavingThrowRollModeSupportForUnit(
  unit: UnitRecord,
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

export function battlePassiveSpeedBonusSupportForUnit(
  unit: UnitRecord,
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
  unit: UnitRecord,
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

export function battleWeaponDamageDiceRollChoiceSupportForUnit(
  unit: UnitRecord,
): BattleWeaponDamageDiceRollChoiceSupport {
  if (!hasWeaponDamageDiceRollChoiceMechanics(unit)) {
    return null;
  }
  return weaponDamageDiceRollChoiceProfileForUnit(unit) === null
    ? "unsupported"
    : "weaponDamageDiceRollChoice";
}

export function battleMartialArtsAttackProjectionSupportForUnit(
  unit: UnitRecord,
): BattleMartialArtsAttackProjectionSupport {
  if (!hasMartialArtsAttackProjectionMechanics(unit)) {
    return null;
  }
  return martialArtsAttackProjectionMechanicsForUnit(unit) === null
    ? "unsupported"
    : "martialArtsAttackProjection";
}

export function battleAttackActionAttackCountScalingSupportForUnit(
  unit: UnitRecord,
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
  unit: UnitRecord,
): BattleZeroHitPointReplacementSupport {
  if (!hasZeroHitPointReplacementMechanics(unit)) {
    return null;
  }
  return zeroHitPointReplacementProfileForUnit(unit) === null
    ? "unsupported"
    : "zeroHitPointReplacement";
}

export function battleBonusActionDashTemporaryHitPointsSupportForUnit(
  unit: UnitRecord,
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
  unit: UnitRecord,
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

export function battleSpellSlotHealingModifierSupportForUnit(
  unit: UnitRecord,
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
  unit: UnitRecord,
): BattleMagicActionHealingPoolSupport {
  if (!hasMagicActionHealingPoolMechanics(unit)) {
    return null;
  }
  const profile = magicActionHealingPoolProfileForUnit(unit);
  return profile === null
    ? "unsupported"
    : {
        kind: MAGIC_ACTION_HEALING_POOL_SUPPORT_PROFILE,
        healingPool: profile.healingPool,
      };
}

export function battleMagicActionAreaSaveDamageHealingSupportForUnit(
  unit: UnitRecord,
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
  unit: UnitRecord,
): BattleEnemyZeroHitPointTemporaryHitPointsSupport {
  if (!hasEnemyZeroHitPointTemporaryHitPointsMechanics(unit)) {
    return null;
  }
  const profile = enemyZeroHitPointTemporaryHitPointsProfileForUnit(unit);
  return profile === null
    ? "unsupported"
    : {
        kind: ENEMY_ZERO_HIT_POINT_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
        temporaryHitPoints: profile.temporaryHitPoints,
      };
}

export function battleRemarkableAthleteSupportForUnit(
  unit: UnitRecord,
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
  unit: UnitRecord,
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

export function battlePaladinSacredWeaponSupportForUnit(
  unit: UnitRecord,
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
  unit: UnitRecord,
): BattleHuntersPreySupport {
  if (!hasClassFeatureMechanicsFamily(unit, "hunters_prey")) {
    return null;
  }
  const profile = huntersPreyProfileForUnit(unit);
  return profile === null
    ? "unsupported"
    : {
        kind: HUNTERS_PREY_SUPPORT_PROFILE,
        huntersPrey: profile.huntersPrey,
      };
}

export function battleRogueSteadyAimSupportForUnit(
  unit: UnitRecord,
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
  unit: UnitRecord,
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
  unit: UnitRecord,
  family: string,
): boolean {
  return unit.kind === "class_feature" && unit.mechanics.family === family;
}

function hasPassiveArmorClassBonusMechanics(unit: UnitRecord): boolean {
  if (unit.kind !== "feat" || unit.mechanics.family !== "passive") {
    return false;
  }
  const [effect] = unit.mechanics.grants;
  return (
    effect?.kind === "modify_ac" ||
    unit.mechanics.condition?.kind === "wearing_armor"
  );
}

function hasPassiveRangedAttackRollBonusMechanics(unit: UnitRecord): boolean {
  if (unit.kind !== "feat" || unit.mechanics.family !== "passive") {
    return false;
  }
  const [effect] = unit.mechanics.grants;
  return (
    effect?.kind === "modify_roll_numeric" &&
    sameStringSet(effect.on, ["attack_roll"])
  );
}

function hasInitiativeProficiencyAndSwapMechanics(unit: UnitRecord): boolean {
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

function hasAttackRollMissToHitReplacementMechanics(unit: UnitRecord): boolean {
  return (
    unit.kind === "feat" &&
    unit.mechanics.family === "triggered_replacement" &&
    unit.mechanics.trigger.kind === "miss_with_attack_roll"
  );
}

function hasPassiveSavingThrowRollModeMechanics(unit: UnitRecord): boolean {
  if (unit.kind !== "class_feature" || unit.mechanics.family !== "passive") {
    return false;
  }
  const [effect] = unit.mechanics.grants;
  return effect?.kind === "modify_roll_advantage";
}

function hasPassiveSpeedBonusMechanics(unit: UnitRecord): boolean {
  if (unit.kind !== "class_feature" || unit.mechanics.family !== "passive") {
    return false;
  }
  const [effect] = unit.mechanics.grants;
  return (
    effect?.kind === "modify_speed" ||
    unit.mechanics.condition?.kind === "not_wearing_armor"
  );
}

function hasPassiveSpeedKindGrantsMechanics(unit: UnitRecord): boolean {
  if (unit.kind !== "class_feature" || unit.mechanics.family !== "composite") {
    return false;
  }
  return unit.mechanics.parts.some(
    (part) =>
      part.family === "passive" &&
      part.grants.some((effect) => effect.kind === "grant_speed"),
  );
}

function hasWeaponDamageDiceRollChoiceMechanics(unit: UnitRecord): boolean {
  return (
    unit.kind === "feat" &&
    unit.mechanics.family === "on_hit_trigger" &&
    unit.mechanics.effect.kind === "reroll_weapon_damage_dice"
  );
}

function hasMartialArtsAttackProjectionMechanics(unit: UnitRecord): boolean {
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

function hasAttackActionAttackCountScalingMechanics(unit: UnitRecord): boolean {
  if (unit.kind !== "class_feature" || unit.mechanics.family !== "passive") {
    return false;
  }
  return unit.mechanics.grants.some(
    (effect) => effect.kind === "scale_attack_count",
  );
}

function hasZeroHitPointReplacementMechanics(unit: UnitRecord): boolean {
  return (
    unit.kind === "species_trait" &&
    unit.mechanics.family === "triggered_replacement"
  );
}

function hasBonusActionDashTemporaryHitPointsMechanics(
  unit: UnitRecord,
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
  unit: UnitRecord,
): boolean {
  return (
    unit.kind === "class_feature" &&
    unit.mechanics.family === "failed_ability_check_resource_boost"
  );
}

function hasSpellSlotHealingModifierMechanics(unit: UnitRecord): boolean {
  return (
    unit.kind === "class_feature" &&
    unit.mechanics.family === "spell_slot_healing_modifier"
  );
}

function hasMagicActionHealingPoolMechanics(unit: UnitRecord): boolean {
  return (
    unit.kind === "class_feature" &&
    unit.mechanics.family === "magic_action_healing_pool"
  );
}

function hasMagicActionAreaSaveDamageHealingMechanics(
  unit: UnitRecord,
): boolean {
  return (
    unit.kind === "class_feature" &&
    unit.mechanics.family === "magic_action_area_save_damage_healing"
  );
}

function hasEnemyZeroHitPointTemporaryHitPointsMechanics(
  unit: UnitRecord,
): boolean {
  return (
    unit.kind === "class_feature" &&
    unit.mechanics.family === "enemy_zero_hit_point_temporary_hit_points"
  );
}

export function zeroHitPointReplacementProfileForUnit(
  unit: UnitRecord,
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
  unit: UnitRecord,
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
  unit: UnitRecord,
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

export function spellSlotHealingModifierProfileForUnit(
  unit: UnitRecord,
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
  unit: UnitRecord,
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
  unit: UnitRecord,
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

export function enemyZeroHitPointTemporaryHitPointsProfileForUnit(
  unit: UnitRecord,
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
  unit: UnitRecord,
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
  unit: UnitRecord,
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
  unit: UnitRecord,
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
  unit: UnitRecord,
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
  unit: UnitRecord,
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

export function passiveSavingThrowRollModeProfileForUnit(
  unit: UnitRecord,
): PassiveSavingThrowRollModeProfile | null {
  if (unit.kind !== "class_feature" || unit.mechanics.family !== "passive") {
    return null;
  }
  const [effect, ...extraEffects] = unit.mechanics.grants;
  const [suppressor, ...extraSuppressors] = unit.mechanics.suppressedBy ?? [];
  if (
    effect?.kind !== "modify_roll_advantage" ||
    effect.mode !== "advantage" ||
    !sameStringSet(effect.on, ["saving_throw"]) ||
    !sameStringSet(effect.saveAbilityFilter ?? [], ["dex"]) ||
    effect.affects !== undefined ||
    effect.spellSourceFilter !== undefined ||
    effect.attackerTypeFilter !== undefined ||
    effect.skillFilter !== undefined ||
    effect.conditionFilter !== undefined ||
    effect.abilityFilter !== undefined ||
    effect.saveSourceFilter !== undefined ||
    effect.contextRangeFeet !== undefined ||
    effect.count !== undefined ||
    effect.expiresOn !== undefined ||
    extraEffects.length > 0 ||
    unit.mechanics.condition !== undefined ||
    unit.mechanics.operations !== undefined ||
    suppressor?.kind !== "condition_active" ||
    !sameStringSet(suppressor.conditions, ["incapacitated"]) ||
    extraSuppressors.length > 0
  ) {
    return null;
  }
  return {
    mode: "advantage",
    ability: "dex",
    suppressedByCondition: "incapacitated",
  };
}

export function passiveSpeedBonusProfileForUnit(
  unit: UnitRecord,
): PassiveSpeedBonusProfile | null {
  if (unit.kind !== "class_feature" || unit.mechanics.family !== "passive") {
    return null;
  }
  return passiveSpeedBonusProfileForPassiveMechanics(unit.mechanics);
}

export function passiveSpeedKindGrantsProfileForUnit(
  unit: UnitRecord,
): PassiveSpeedKindGrantsProfile | null {
  if (unit.kind !== "class_feature" || unit.mechanics.family !== "composite") {
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

function passiveSpeedBonusProfileForPassiveMechanics(
  mechanics: Extract<
    Extract<UnitRecord, { readonly kind: "class_feature" }>["mechanics"],
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
    Extract<UnitRecord, { readonly kind: "class_feature" }>["mechanics"],
    { readonly family: "passive" }
  >,
): PassiveSpeedKindGrantsProfile["grants"] | null {
  if (
    mechanics.condition !== undefined ||
    mechanics.operations !== undefined ||
    mechanics.suppressedBy !== undefined ||
    mechanics.grants.length !== 2
  ) {
    return null;
  }
  const grants = mechanics.grants.flatMap(
    (effect): readonly PassiveSpeedKindGrantProfile[] => {
      if (
        effect.kind !== "grant_speed" ||
        !isPassiveSpeedKindGrantKind(effect.speedKind) ||
        typeof effect.feet === "number" ||
        effect.feet.kind !== "walk_speed" ||
        effect.hover !== undefined
      ) {
        return [];
      }
      return [{ speedKind: effect.speedKind, feet: { kind: "walkSpeed" } }];
    },
  );
  if (grants.length !== 2) {
    return null;
  }
  const climb = grants.find(
    (grant): grant is ClimbSpeedKindGrantProfile => grant.speedKind === "climb",
  );
  const swim = grants.find(
    (grant): grant is SwimSpeedKindGrantProfile => grant.speedKind === "swim",
  );
  return climb === undefined || swim === undefined ? null : [climb, swim];
}

function isPassiveSpeedKindGrantKind(
  speedKind: Extract<EffectAtom, { readonly kind: "grant_speed" }>["speedKind"],
): speedKind is PassiveSpeedKindGrantKind {
  return PASSIVE_SPEED_KIND_GRANT_KINDS.some((kind) => kind === speedKind);
}

export function weaponDamageDiceRollChoiceProfileForUnit(
  unit: UnitRecord,
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

export function martialArtsAttackProjectionProfileForUnit(
  unit: UnitRecord,
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
  unit: UnitRecord,
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
  unit: UnitRecord,
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
  unit: UnitRecord,
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
  unit: UnitRecord,
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
  unit: UnitRecord,
  classLevels: readonly CharacterBattleClassLevel[],
): SupportedUnitFeatureProfile | null {
  return (
    parseExtraActionGrantUnitFeatureProfile(unit) ??
    parseSelfBonusActionHealingUnitFeatureProfile(unit, classLevels) ??
    parseOngoingFeatureUnitFeatureProfile(unit, classLevels) ??
    parseAttackDamageRiderUnitFeatureProfile(unit, classLevels) ??
    parseSaveDamageReplacementUnitFeatureProfile(unit, classLevels) ??
    parseReactionRollOrDamageReductionUnitFeatureProfile(unit, classLevels) ??
    parsePassiveArmorClassBonusUnitFeatureProfile(unit) ??
    parsePassiveRangedAttackRollBonusUnitFeatureProfile(unit) ??
    parseInitiativeProficiencyAndSwapUnitFeatureProfile(unit) ??
    parseAttackRollMissToHitReplacementUnitFeatureProfile(unit) ??
    parsePassiveSavingThrowRollModeUnitFeatureProfile(unit) ??
    parsePassiveSpeedBonusUnitFeatureProfile(unit) ??
    parsePassiveSpeedKindGrantsUnitFeatureProfile(unit) ??
    parseWeaponDamageDiceRollChoiceUnitFeatureProfile(unit) ??
    parseMartialArtsAttackProjectionUnitFeatureProfile(unit, classLevels) ??
    parseBardicInspirationGrantUnitFeatureProfile(unit, classLevels) ??
    parseDruidWildShapeKnownFormUnitFeatureProfile(unit, classLevels) ??
    attackActionAttackCountScalingProfileForUnit(unit) ??
    zeroHitPointReplacementProfileForUnit(unit) ??
    bonusActionDashTemporaryHitPointsProfileForUnit(unit) ??
    failedAbilityCheckResourceBoostProfileForUnit(unit) ??
    spellSlotHealingModifierProfileForUnit(unit) ??
    magicActionHealingPoolProfileForUnit(unit) ??
    magicActionAreaSaveDamageHealingProfileForUnit(unit, classLevels) ??
    enemyZeroHitPointTemporaryHitPointsProfileForUnit(unit) ??
    bonusActionDelegatedStandardActionsProfileForUnit(unit) ??
    remarkableAthleteProfileForUnit(unit) ??
    openHandTechniqueProfileForUnit(unit) ??
    paladinSacredWeaponProfileForUnit(unit) ??
    huntersPreyProfileForUnit(unit) ??
    rogueSteadyAimProfileForUnit(unit) ??
    potentCantripProfileForUnit(unit)
  );
}

function bonusActionDelegatedStandardActionsProfileForUnit(
  unit: UnitRecord,
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
  unit: UnitRecord,
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
  unit: UnitRecord,
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
  const [addle, push, topple] = mechanics.choices;
  if (
    mechanics.trigger.kind !== "hit_with_attack_granted_by" ||
    mechanics.trigger.resourceOptionUnitId !== MONK_FOCUS_RESOURCE_UNIT_ID ||
    mechanics.trigger.optionId !== MONK_FLURRY_OF_BLOWS_OPTION_ID ||
    mechanics.optional !== true ||
    mechanics.effectSaveDc.kind !== "class_feature_ability_save_dc" ||
    mechanics.effectSaveDc.base !== 8 ||
    mechanics.effectSaveDc.ability !== "wis" ||
    mechanics.choices.length !== 3 ||
    addle?.id !== "addle" ||
    addle.effect.kind !== "deny_opportunity_attacks" ||
    addle.effect.expires !== "start_of_target_next_turn" ||
    push?.id !== "push" ||
    push.save.ability !== "str" ||
    push.onFail.kind !== "push_away" ||
    push.onFail.distanceFeet !== 15 ||
    topple?.id !== "topple" ||
    topple.save.ability !== "dex" ||
    topple.onFail.kind !== "apply_condition" ||
    topple.onFail.condition !== "prone"
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
      choices: [
        {
          id: "addle",
          effect: {
            kind: "denyOpportunityAttacks",
            expires: "startOfTargetNextTurn",
          },
        },
        {
          id: "push",
          save: { ability: "str" },
          onFail: { kind: "pushAway", distanceFeet: movementFeet(15) },
        },
        {
          id: "topple",
          save: { ability: "dex" },
          onFail: { kind: "applyCondition", condition: "prone" },
        },
      ],
    },
  };
}

function paladinSacredWeaponProfileForUnit(
  unit: UnitRecord,
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

function huntersPreyProfileForUnit(
  unit: UnitRecord,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "huntersPrey" }
> | null {
  if (
    unit.kind !== "class_feature" ||
    unit.className !== "ranger" ||
    unit.mechanics.family !== "hunters_prey"
  ) {
    return null;
  }
  const mechanics = unit.mechanics;
  const [colossusSlayer, hordeBreaker] = mechanics.options;
  if (
    mechanics.choice.kind !== "choose_one" ||
    mechanics.choice.replaceOn !== "short_or_long_rest" ||
    mechanics.options.length !== 2 ||
    colossusSlayer?.id !== "colossus_slayer" ||
    colossusSlayer.trigger.kind !== "hit_creature_with_weapon" ||
    colossusSlayer.targetPredicate !== "missing_any_hit_points" ||
    colossusSlayer.usageLimit.kind !== "once_per_turn" ||
    colossusSlayer.damage.kind !== "add_attack_damage_dice" ||
    colossusSlayer.damage.dice.dice !== 1 ||
    colossusSlayer.damage.dice.dieSize !== 8 ||
    colossusSlayer.damage.damageType !== "same_as_attack" ||
    hordeBreaker?.id !== "horde_breaker" ||
    hordeBreaker.trigger.kind !== "make_weapon_attack" ||
    hordeBreaker.usageLimit.kind !== "once_per_turn" ||
    hordeBreaker.extraAttack.weapon !== "same_weapon" ||
    hordeBreaker.extraAttack.target.kind !==
      "different_creature_near_original_target" ||
    hordeBreaker.extraAttack.target.withinFeetOfOriginalTarget !== 5 ||
    hordeBreaker.extraAttack.target.withinWeaponRange !== true ||
    hordeBreaker.extraAttack.target.notAttackedThisTurn !== true
  ) {
    return null;
  }
  return {
    kind: "huntersPrey",
    unit,
    huntersPrey: {
      choice: { kind: "chooseOne", replaceOn: "shortOrLongRest" },
      options: [
        {
          id: "colossusSlayer",
          trigger: "hitCreatureWithWeapon",
          targetPredicate: "missingAnyHitPoints",
          usageLimit: "oncePerTurn",
          damage: {
            kind: "addAttackDamageDice",
            dice: { dice: 1, dieSize: 8 },
            damageType: "sameAsAttack",
          },
        },
        {
          id: "hordeBreaker",
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
      ],
    },
  };
}

function rogueSteadyAimProfileForUnit(
  unit: UnitRecord,
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
  unit: UnitRecord,
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

export function battleBardicInspirationGrantSupportForUnit(
  unit: UnitRecord,
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
  unit: UnitRecord,
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
  return (
    druidWildShapeKnownFormSupportProfile(
      parseDruidWildShapeKnownFormUnitFeatureProfile(unit, [
        { className: "druid", level: classLevel(unit.acquiredAtLevel) },
      ]),
    ) ?? "unsupported"
  );
}

function battleDruidWildShapeKnownFormSupportForUnitAtClassLevels(
  unit: UnitRecord,
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
    (actualClassLevel === undefined ||
      actualClassLevel < unit.acquiredAtLevel ||
      Number(actualClassLevel) >= 18)
  ) {
    return null;
  }
  return "unsupported";
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
  unit: UnitRecord,
  classLevels: readonly CharacterBattleClassLevel[],
): SupportedDruidWildShapeKnownFormProfile | null {
  if (!isDruidWildShapeFeatureRecord(unit)) {
    return null;
  }
  const classLevel = findCharacterClassLevel(classLevels, unit.className);
  if (classLevel === undefined || classLevel < unit.acquiredAtLevel) {
    return null;
  }
  if (Number(classLevel) >= 18) {
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
  unit: UnitRecord,
): BattleWeaponMasterySapSupport {
  if (unit.kind !== "mastery") {
    return null;
  }
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
}

export function battleWeaponMasteryToppleSupportForUnit(
  unit: UnitRecord,
): BattleWeaponMasteryToppleSupport {
  if (unit.kind !== "mastery") {
    return null;
  }
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
}

export function battleWeaponMasteryCleaveSupportForUnit(
  unit: UnitRecord,
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

function parseBardicInspirationGrantUnitFeatureProfile(
  unit: UnitRecord,
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

function martialArtsSrdDieSizeAtClassLevel(
  classLevel: ClassLevel,
): MartialArtsDieSize {
  return (
    MARTIAL_ARTS_DIE_TIERS.filter(
      (candidate) => classLevel >= candidate.atLevel,
    )
      .sort((left, right) => left.atLevel - right.atLevel)
      .at(-1)?.dieSize ?? MARTIAL_ARTS_BASE_DIE_SIZE
  );
}

function parseExtraActionGrantUnitFeatureProfile(
  unit: UnitRecord,
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

function parseSelfBonusActionHealingUnitFeatureProfile(
  unit: UnitRecord,
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
  unit: UnitRecord,
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
        parseInnateSorceryActivationProjectionEffects(unit, phase.effects))
      : parseInnateSorceryActivationProjectionEffects(unit, phase.effects);
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
  unit: UnitRecord,
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
  unit: UnitRecord,
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
  unit: UnitRecord,
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
  unit: UnitRecord,
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
  unit: UnitRecord,
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
  unit: UnitRecord,
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
  unit: UnitRecord,
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
  unit: UnitRecord,
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

function parsePassiveSpeedKindGrantsUnitFeatureProfile(
  unit: UnitRecord,
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

function parseAttackRollMissToHitReplacementUnitFeatureProfile(
  unit: UnitRecord,
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
  unit: UnitRecord,
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
  unit: UnitRecord,
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
      if ("sourceFilter" in effect && effect.sourceFilter !== undefined) {
        return null;
      }
      resistances.push(effect.damageType);
      continue;
    }
    if (
      effect.kind === "modify_roll_advantage" &&
      effect.on.includes("attack_roll")
    ) {
      if (effect.on.some((target) => target !== "attack_roll")) {
        return null;
      }
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
      if (
        effect.weaponFilter !== undefined &&
        effect.weaponFilter.kind !== "weapon_category"
      ) {
        return null;
      }
      const amount = numericDeltaForClassLevel(
        effect.delta,
        unit.kind === "class_feature"
          ? classLevelForClass(classLevels, unit.className)
          : 0,
      );
      if (amount === null) {
        return null;
      }
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
    return null;
  }
  return rollModifiers.length === 0 &&
    damageModifiers.length === 0 &&
    resistances.length === 0
    ? parseInnateSorceryActivationProjectionEffects(unit, effects)
    : { rollModifiers, spellModifiers, damageModifiers, resistances };
}

function parseInnateSorceryActivationProjectionEffects(
  unit: UnitRecord,
  effects: readonly { readonly kind: string }[],
): Pick<
  Extract<SupportedUnitFeatureProfile, { readonly kind: "ongoingFeature" }>,
  "rollModifiers" | "spellModifiers" | "damageModifiers" | "resistances"
> | null {
  if (
    unit.kind !== "class_feature" ||
    unit.className !== "sorcerer" ||
    effects.length !== 2
  ) {
    return null;
  }
  const saveDc = effects.find((effect) => effect.kind === "modify_save_dc");
  const attackRollAdvantage = effects.find(
    (effect) => effect.kind === "modify_roll_advantage",
  );
  if (
    !isInnateSorcerySaveDcEffect(saveDc) ||
    !isInnateSorcerySpellAttackAdvantageEffect(attackRollAdvantage)
  ) {
    return null;
  }
  return {
    rollModifiers: [],
    spellModifiers: [
      {
        saveDcBonus: 1,
        attackRollMode: "advantage",
      },
    ],
    damageModifiers: [],
    resistances: [],
  };
}

function isInnateSorcerySaveDcEffect(
  effect: { readonly kind: string } | undefined,
): effect is {
  readonly kind: "modify_save_dc";
  readonly delta: {
    readonly kind: "fixed_number";
    readonly amount: 1;
    readonly sign: "+";
  };
  readonly spellSourceFilter: { readonly className: "sorcerer" };
} {
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
    "spellSourceFilter" in effect &&
    typeof effect.spellSourceFilter === "object" &&
    effect.spellSourceFilter !== null &&
    "className" in effect.spellSourceFilter &&
    effect.spellSourceFilter.className === "sorcerer"
  );
}

function isInnateSorcerySpellAttackAdvantageEffect(
  effect: { readonly kind: string } | undefined,
): effect is {
  readonly kind: "modify_roll_advantage";
  readonly mode: "advantage";
  readonly on: readonly ["spell_attack_roll"];
  readonly spellSourceFilter: { readonly className: "sorcerer" };
} {
  return (
    effect?.kind === "modify_roll_advantage" &&
    "mode" in effect &&
    effect.mode === "advantage" &&
    "on" in effect &&
    Array.isArray(effect.on) &&
    effect.on.length === 1 &&
    effect.on[0] === "spell_attack_roll" &&
    "spellSourceFilter" in effect &&
    typeof effect.spellSourceFilter === "object" &&
    effect.spellSourceFilter !== null &&
    "className" in effect.spellSourceFilter &&
    effect.spellSourceFilter.className === "sorcerer"
  );
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
