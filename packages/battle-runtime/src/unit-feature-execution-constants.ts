export const LIGHT_EXTRA_ATTACK_DAMAGE_ABILITY_MODIFIER_SUPPORT_PROFILE =
  "lightExtraAttackDamageAbilityModifier";
export const DRACONIC_ANCESTRY_DAMAGE_TYPE_HOLE_ID =
  "species_dragonborn_draconic_ancestry_damage_type" as const;
export const DRACONIC_ANCESTRY_DAMAGE_TYPES = [
  "acid",
  "cold",
  "fire",
  "lightning",
  "poison",
] as const satisfies ReadonlyArray<DamageType>;
export const MARTIAL_ARTS_ATTACK_PROJECTION_SUPPORT_PROFILE =
  "martialArtsAttackProjection";
export const ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE =
  "attackActionAttackCountScaling";
export const BATTLE_ATTACK_ACTION_ADDITIONAL_ATTACKS = [
  1, 2, 3,
] as const satisfies ReadonlyArray<number>;
export type BattleAttackActionAdditionalAttacks =
  (typeof BATTLE_ATTACK_ACTION_ADDITIONAL_ATTACKS)[number];
export const BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE =
  "bonusActionDashTemporaryHitPoints";
export const BONUS_ACTION_DELEGATED_STANDARD_ACTIONS_SUPPORT_PROFILE =
  "bonusActionDelegatedStandardActions";
export const MONK_FOCUS_BATTLE_OPTIONS_SUPPORT_PROFILE =
  "monkFocusBattleOptions";
export const HIDE_ACTION_OBSCUREMENT_PERMISSION_SUPPORT_PROFILE =
  "hideActionObscurementPermission";
export const PASSIVE_SPEED_BONUS_SUPPORT_PROFILE = "passiveSpeedBonus";
export const PASSIVE_SPEED_KIND_GRANTS_SUPPORT_PROFILE =
  "passiveSpeedKindGrants";
export const ALTERNATE_ACTION_COST_ACTIONS = [
  "dash",
  "disengage",
  "hide",
] as const satisfies ReadonlyArray<StandardActionKind>;
export type AlternateActionCostAction =
  (typeof ALTERNATE_ACTION_COST_ACTIONS)[number];
export type HideActionObscurementPermissionProfile = {
  readonly allowedObscurement: {
    readonly kind: "obscuredOnlyByCreature";
    readonly creatureSizeRelationToSelf: "atLeastOneSizeLarger";
  };
};
import type { StandardActionKind } from "@dnd/shared/game-facts";
import type {
  ClassLevel,
  Condition,
  DamageType,
  MovementDeltaFeet,
} from "@dnd/shared/types";
import type { BattleMovementSpeedKind } from "./battle-subjects.ts";
import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import type { Ability } from "@dnd/shared/types";
import type {
  WeaponMasteryName,
  WeaponUsage,
} from "@dnd/surface/surface/types";
import type { ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { CUNNING_STRIKE_OPTION_SELECTION_IDS as BASE_CUNNING_STRIKE_OPTION_SELECTION_IDS } from "@dnd/surface/surface/schema";
import { BRUTAL_STRIKE_OPTION_IDS } from "./procedure-execution/brutal-strike.ts";
export { BRUTAL_STRIKE_OPTION_IDS } from "./procedure-execution/brutal-strike.ts";

export const MARTIAL_ARTS_BASE_DIE_SIZE = 6;
export const MARTIAL_ARTS_DIE_TIERS = [
  { atLevel: 5, dieSize: 8 },
  { atLevel: 11, dieSize: 10 },
  { atLevel: 17, dieSize: 12 },
] as const;
export type MartialArtsDieSize =
  | typeof MARTIAL_ARTS_BASE_DIE_SIZE
  | (typeof MARTIAL_ARTS_DIE_TIERS)[number]["dieSize"];
export function martialArtsSrdDieSizeAtClassLevel(
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
export const PASSIVE_SPEED_KIND_GRANT_KINDS = [
  "climb",
  "swim",
] as const satisfies ReadonlyArray<BattleMovementSpeedKind>;
export type PassiveSpeedKindGrantKind =
  (typeof PASSIVE_SPEED_KIND_GRANT_KINDS)[number];
export type PassiveSpeedBonusCondition =
  | {
      readonly kind: "notWearingArmor";
      readonly categories: readonly ["heavy"];
    }
  | { readonly kind: "unarmoredUnshielded" };
export type PassiveSpeedBonusProfile = {
  readonly deltaFeet: MovementDeltaFeet;
  readonly condition: PassiveSpeedBonusCondition;
};
export type BattlePassiveSpeedBonusSupportProfile = {
  readonly kind: typeof PASSIVE_SPEED_BONUS_SUPPORT_PROFILE;
  readonly deltaFeet: MovementDeltaFeet;
  readonly condition: PassiveSpeedBonusCondition;
};
export type PassiveSpeedKindGrantProfile = {
  readonly speedKind: PassiveSpeedKindGrantKind;
  readonly feet: { readonly kind: "walkSpeed" };
};
export type BattlePassiveSpeedKindGrantsSupportProfile = {
  readonly kind: typeof PASSIVE_SPEED_KIND_GRANTS_SUPPORT_PROFILE;
  readonly speed?: PassiveSpeedBonusProfile;
  readonly grants: readonly [
    PassiveSpeedKindGrantProfile,
    ...PassiveSpeedKindGrantProfile[],
  ];
};
export const HUNTERS_PREY_SUPPORT_PROFILE = "huntersPrey";
export const WEAPON_MASTERY_SAP_SUPPORT_PROFILE = "weaponMasterySap";
export const WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE = "weaponMasteryTopple";
export const WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE = "weaponMasteryCleave";
export const WEAPON_MASTERY_PUSH_SUPPORT_PROFILE = "weaponMasteryPush";
export const WEAPON_MASTERY_SLOW_SUPPORT_PROFILE = "weaponMasterySlow";
export const WEAPON_MASTERY_EXECUTION_PROPERTIES_BY_SUPPORT_PROFILE = [
  { supportProfile: WEAPON_MASTERY_PUSH_SUPPORT_PROFILE, property: "push" },
  { supportProfile: WEAPON_MASTERY_SAP_SUPPORT_PROFILE, property: "sap" },
  { supportProfile: WEAPON_MASTERY_SLOW_SUPPORT_PROFILE, property: "slow" },
  {
    supportProfile: WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE,
    property: "topple",
  },
  {
    supportProfile: WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE,
    property: "cleave",
  },
] as const satisfies ReadonlyArray<{
  readonly supportProfile: string;
  readonly property: WeaponMasteryName;
}>;
export type WeaponMasteryPropertySupportProfile =
  (typeof WEAPON_MASTERY_EXECUTION_PROPERTIES_BY_SUPPORT_PROFILE)[number]["supportProfile"];

export function isWeaponMasteryPropertySupportProfile(
  supportProfile: string,
): supportProfile is WeaponMasteryPropertySupportProfile {
  return WEAPON_MASTERY_EXECUTION_PROPERTIES_BY_SUPPORT_PROFILE.some(
    (entry) => entry.supportProfile === supportProfile,
  );
}

export function weaponMasteryExecutionPropertyForSupportProfile(
  supportProfile: WeaponMasteryPropertySupportProfile,
): WeaponMasteryName | undefined {
  return WEAPON_MASTERY_EXECUTION_PROPERTIES_BY_SUPPORT_PROFILE.find(
    (entry) => entry.supportProfile === supportProfile,
  )?.property;
}
export const TACTICAL_MASTER_REPLACEMENT_SUPPORT_PROFILE =
  "tacticalMasterReplacement";
export const TACTICAL_MASTER_REPLACEMENT_MASTERY_PROPERTIES = [
  "push",
  "sap",
  "slow",
] as const satisfies ReadonlyArray<WeaponMasteryName>;
export type TacticalMasterReplacementMasteryProperty =
  (typeof TACTICAL_MASTER_REPLACEMENT_MASTERY_PROPERTIES)[number];
export const TACTICAL_MASTER_REPLACEMENT_DECISION_CHOICES = [
  ...TACTICAL_MASTER_REPLACEMENT_MASTERY_PROPERTIES,
  "decline",
] as const;
export type TacticalMasterReplacementDecision =
  (typeof TACTICAL_MASTER_REPLACEMENT_DECISION_CHOICES)[number];
export type OngoingFeatureRollModifier = {
  readonly mode: AttackRollMode;
  readonly affects: "selfRoll" | "rollsAgainstSelf";
  readonly on: "attackRoll";
  readonly abilityFilter?: readonly Ability[];
};
export type OngoingFeatureDamageModifier = {
  readonly amount: number;
  readonly abilityFilter?: readonly Ability[];
  readonly weaponUsageFilter?: WeaponUsage;
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
export type PassiveSavingThrowRollModeProfile =
  | {
      readonly mode: "advantage";
      readonly scope: {
        readonly kind: "savingThrowAbility";
        readonly ability: "dex";
        readonly suppressedByCondition: "incapacitated";
      };
    }
  | {
      readonly mode: "advantage";
      readonly scope: {
        readonly kind: "condition";
        readonly condition: "poisoned" | "frightened";
      };
    };
export const BRUTAL_STRIKE_SUPPORT_PROFILE = "brutalStrike";
export const BRUTAL_STRIKE_ROLL_DECISION_CHOICES = ["use", "decline"] as const;
export type BrutalStrikeRollDecisionChoice =
  (typeof BRUTAL_STRIKE_ROLL_DECISION_CHOICES)[number];
export const BRUTAL_STRIKE_EFFECT_DECISION_CHOICES = [
  ...BRUTAL_STRIKE_OPTION_IDS,
  "decline",
] as const;
export type BrutalStrikeEffectDecisionChoice =
  (typeof BRUTAL_STRIKE_EFFECT_DECISION_CHOICES)[number];
export const ATTACK_DAMAGE_DIE_FLOOR_MINIMUM_RESULT = 3;
export const ATTACK_DAMAGE_DIE_FLOOR_SUPPORT_PROFILE = "attackDamageDieFloor";
export const ATTACK_ROLL_MISS_TO_HIT_REPLACEMENT_SUPPORT_PROFILE =
  "attackRollMissToHitReplacement";
export const PASSIVE_RANGED_ATTACK_ROLL_BONUS_SUPPORT_PROFILE =
  "passiveRangedAttackRollBonus";
export const WEAPON_DAMAGE_DICE_ROLL_CHOICE_SUPPORT_PROFILE =
  "weaponDamageDiceRollChoice";
export const CUNNING_STRIKE_SUPPORT_PROFILE = "cunningStrike";
export const CUNNING_STRIKE_OPTION_GRANT_SUPPORT_PROFILE =
  "cunningStrikeOptionGrant";
export const BATTLE_CUNNING_STRIKE_OPTION_SELECTION_IDS = [
  ...BASE_CUNNING_STRIKE_OPTION_SELECTION_IDS,
  "stealth_attack",
] as const;
export type CunningStrikeOptionSelectionId =
  (typeof BATTLE_CUNNING_STRIKE_OPTION_SELECTION_IDS)[number];
export type CunningStrikeEndTurnCoverDegree =
  | "none"
  | "half"
  | "threeQuarters"
  | "total";
export type CunningStrikeQualifyingCoverDegree = Extract<
  CunningStrikeEndTurnCoverDegree,
  "threeQuarters" | "total"
>;
export type CunningStrikeEquipmentGatedConditionSaveEffect = {
  readonly kind: "equipmentGatedConditionSave";
  readonly requires: {
    readonly kind: "equipmentOnPerson";
    readonly equipment: {
      readonly kind: "tool";
      readonly toolId: "poisoners_kit";
    };
  };
  readonly save: { readonly ability: "con" };
  readonly onFail: {
    readonly kind: "applyCondition";
    readonly condition: "poisoned";
    readonly durationTicks: ElapsedTimeTicks;
    readonly repeatSave: {
      readonly cadence: "endOfTargetTurn";
      readonly onSuccess: "endCondition";
    };
  };
};
export type CunningStrikeSizeGatedConditionSaveEffect = {
  readonly kind: "sizeGatedConditionSave";
  readonly target: { readonly maxSize: "large" };
  readonly save: { readonly ability: "dex" };
  readonly onFail: {
    readonly kind: "applyCondition";
    readonly condition: "prone";
  };
};
export type CunningStrikePostDamageMovementEffect = {
  readonly kind: "postDamageMovement";
  readonly movement: {
    readonly timing: "immediatelyAfterAttack";
    readonly distance: { readonly kind: "halfSpeed" };
    readonly opportunityAttacks: "doesNotProvoke";
  };
};
export type CunningStrikeHideInvisibleEndSuppressionEffect = {
  readonly kind: "hideInvisibleEndSuppression";
  readonly prerequisite: { readonly kind: "hideActionInvisibleCondition" };
  readonly conditionSource: "hideAction";
  readonly ifTurnEndsBehindCover: readonly [
    CunningStrikeQualifyingCoverDegree,
    CunningStrikeQualifyingCoverDegree,
  ];
};
export type CunningStrikeOption = {
  readonly selectionId: CunningStrikeOptionSelectionId;
  readonly cost: {
    readonly kind: "sneakAttackDamageDice";
    readonly dice: 1;
    readonly dieSize: 6;
  };
  readonly effect:
    | CunningStrikeEquipmentGatedConditionSaveEffect
    | CunningStrikeSizeGatedConditionSaveEffect
    | CunningStrikePostDamageMovementEffect
    | CunningStrikeHideInvisibleEndSuppressionEffect;
};
export type BattleCunningStrikeSupportProfile = {
  readonly kind: typeof CUNNING_STRIKE_SUPPORT_PROFILE;
  readonly cunningStrike: {
    readonly trigger: {
      readonly kind: "dealSneakAttackDamage";
      readonly sourceUnitId: UnitId;
    };
    readonly choice: { readonly kind: "chooseOne"; readonly maxOptions: 1 };
    readonly effectSaveDc: {
      readonly kind: "classFeatureAbilitySaveDc";
      readonly base: 8;
      readonly ability: "dex";
    };
    readonly options: readonly CunningStrikeOption[];
  };
};
import type { UnitId } from "@dnd/shared/game-facts";
