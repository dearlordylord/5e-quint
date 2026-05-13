// RAW-COVERAGE: runtime-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.alternate-action-cost unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bardic-inspiration-grant unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.innate-sorcery-activation unit-feature.martial-arts-attack-projection unit-feature.passive-armor-class-bonus unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-critical-range-19 unit-feature.weapon-damage-dice-roll-choice unit-feature.weapon-mastery-sap unit-feature.zero-hit-point-replacement
import { Match } from "effect";
import * as Either from "effect/Either";
import {
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import { zeroHitPointReplacementUnitProfile } from "@dnd/shared-algebras/zero-hit-point-replacement-algebra";
import {
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
  DamageType,
  EffectAtom,
  StandardActionKind,
  UnitRecord,
  WeaponRecord,
} from "@dnd/surface/surface/types";
import { isEffectAtom } from "@dnd/surface/surface/types";
import type { BattleMovementSpeedKind } from "./battle-subjects.ts";
import type { BattleUnitRef } from "./battle-init.ts";
import type { CharacterBattleClassLevel } from "./character-class-level.ts";

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
export const ATTACK_ROLL_MISS_TO_HIT_REPLACEMENT_SUPPORT_PROFILE =
  "attackRollMissToHitReplacement";
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
export const WEAPON_MASTERY_SAP_SUPPORT_PROFILE = "weaponMasterySap";
const BARDIC_INSPIRATION_RANGE_FEET = 60;
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
  ATTACK_ROLL_MISS_TO_HIT_REPLACEMENT_SUPPORT_PROFILE,
  PASSIVE_SPEED_BONUS_SUPPORT_PROFILE,
  PASSIVE_SPEED_KIND_GRANTS_SUPPORT_PROFILE,
  WEAPON_DAMAGE_DICE_ROLL_CHOICE_SUPPORT_PROFILE,
  MARTIAL_ARTS_ATTACK_PROJECTION_SUPPORT_PROFILE,
  ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE,
  BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE,
  BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
  FAILED_ABILITY_CHECK_RESOURCE_BOOST_SUPPORT_PROFILE,
  WEAPON_MASTERY_SAP_SUPPORT_PROFILE,
  ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE,
] as const;
export type BattlePassiveSpeedBonusSupportProfile = {
  readonly kind: typeof PASSIVE_SPEED_BONUS_SUPPORT_PROFILE;
  readonly deltaFeet: MovementDeltaFeet;
  readonly condition: {
    readonly kind: "notWearingArmor";
    readonly categories: readonly ["heavy"];
  };
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
export type BattleAttackActionAttackCountScalingSupportProfile = {
  readonly kind: typeof ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE;
  readonly additionalAttacks: 1;
};
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
export type BattleUnitSupportProfile =
  | BattleAlternateActionCostSupportProfile
  | BattlePassiveRangedAttackRollBonusSupportProfile
  | BattleAttackRollMissToHitReplacementSupportProfile
  | BattlePassiveSpeedBonusSupportProfile
  | BattlePassiveSpeedKindGrantsSupportProfile
  | BattleAttackActionAttackCountScalingSupportProfile
  | BattleBonusActionDashTemporaryHitPointsSupportProfile
  | BattleFailedAbilityCheckResourceBoostSupportProfile
  | Exclude<
      (typeof BATTLE_UNIT_SUPPORT_PROFILES)[number],
      | "alternateActionCost"
      | "passiveRangedAttackRollBonus"
      | "attackRollMissToHitReplacement"
      | "passiveSpeedBonus"
      | "passiveSpeedKindGrants"
      | "attackActionAttackCountScaling"
      | "bonusActionDashTemporaryHitPoints"
      | "failedAbilityCheckResourceBoost"
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

  return Either.right(supportProfiles);
}

export function battleUnitRefWithSupportProfiles(input: {
  readonly unitRef: Pick<BattleUnitRef, "unitId">;
  readonly unit: BattleUnitSupportSource;
}): Either.Either<BattleUnitRef, BattleUnitSupportProfileIssue> {
  if (input.unitRef.unitId !== input.unit.id) {
    return battleUnitSupportProfileIssue(
      `Battle Unit ref ${input.unitRef.unitId} does not match Unit ${input.unit.id}.`,
    );
  }
  const supportProfiles = battleUnitSupportProfilesForUnit({
    unit: input.unit,
  });
  if (Either.isLeft(supportProfiles)) return Either.left(supportProfiles.left);
  return Either.right({
    unitId: input.unitRef.unitId,
    supportProfiles: supportProfiles.right,
  });
}

export type OngoingFeatureRollModifier = {
  readonly mode: AttackRollMode;
  readonly affects: "selfRoll" | "rollsAgainstSelf";
  readonly on: "attackRoll";
  readonly abilityFilter?: readonly Ability[];
};

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
  if (
    candidate.spends?.resourceUnitId !== expectedResourceUnitId ||
    candidate.spends.amount !== 1 ||
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

function martialArtsDieSize(classLevel: ClassLevel): DamageDieSize {
  if (classLevel >= 17) return 12;
  if (classLevel >= 11) return 10;
  if (classLevel >= 5) return 8;
  return 6;
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
  readonly condition: {
    readonly kind: "notWearingArmor";
    readonly categories: readonly ["heavy"];
  };
};

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
  readonly damageReplacement: MartialArtsDamageReplacementProfile | null;
  readonly abilitySubstitution: {
    readonly use: "dex";
    readonly replaces: "str";
    readonly on: readonly ["attackRoll", "damageRoll", "unarmedStrikeSaveDc"];
  };
};
export type MartialArtsDamageReplacementProfile = {
  readonly scope: "unarmedOrMonkWeapon";
  readonly dice: 1;
  readonly dieSize: 6;
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
      readonly damageModifiers: readonly OngoingFeatureDamageModifier[];
      readonly resistances: readonly DamageType[];
    }
  | {
      readonly kind: "attackDamageRider";
      readonly unit: UnitRecord;
      readonly optional: true;
      readonly usageLimit: "oncePerTurn";
      readonly weaponFilter: "finesseOrRanged";
      readonly eligibility: "advantageOrNonIncapacitatedAllyWithin5ftOfTargetWithoutDisadvantage";
      readonly classLevel: ClassLevel;
      readonly dieSize: number;
      readonly diceByLevel: readonly {
        readonly atLevel: number;
        readonly count: number;
      }[];
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
      readonly kind: "attackRollMissToHitReplacement";
      readonly unit: UnitRecord;
      readonly replacement: AttackRollMissToHitReplacementProfile;
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
  | {
      readonly kind: "attackActionAttackCountScaling";
      readonly unit: UnitRecord;
      readonly additionalAttacks: 1;
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

type AttackDamageRiderMechanicsProjection = {
  readonly dieSize: number;
  readonly dice: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "attackDamageRider" }
  >["diceByLevel"];
};

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
    mechanics.optional !== true ||
    mechanics.trigger.kind !== "hit_with_attack_roll" ||
    mechanics.trigger.weaponFilter !== "finesse_or_ranged" ||
    mechanics.trigger.eligibility !==
      "advantage_or_non_incapacitated_ally_within_5ft_of_target_without_disadvantage" ||
    !("usageLimit" in mechanics) ||
    mechanics.usageLimit.kind !== "once_per_turn" ||
    mechanics.effect.kind !== "add_attack_damage_dice" ||
    mechanics.effect.damageType !== "same_as_attack" ||
    mechanics.effect.dice.kind !== "class_level_table"
  ) {
    return null;
  }
  return {
    dieSize: mechanics.effect.dice.dieSize,
    dice: mechanics.effect.dice.dice,
  };
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

export type BattleAttackRollMissToHitReplacementSupport =
  | BattleAttackRollMissToHitReplacementSupportProfile
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

export type BattleWeaponMasterySapSupport =
  | typeof WEAPON_MASTERY_SAP_SUPPORT_PROFILE
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
  return effect?.kind === "modify_roll_numeric";
}

function hasAttackRollMissToHitReplacementMechanics(unit: UnitRecord): boolean {
  return (
    unit.kind === "feat" &&
    unit.mechanics.family === "triggered_replacement" &&
    unit.mechanics.trigger.kind === "miss_with_attack_roll"
  );
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
    effect.additional !== 1 ||
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
    additionalAttacks: 1,
  };
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
  if (
    effect?.kind !== "modify_speed" ||
    effect.delta !== 10 ||
    effect.unit !== "feet" ||
    extraEffects.length > 0 ||
    mechanics.condition?.kind !== "not_wearing_armor" ||
    !sameStringSet(mechanics.condition.categories, ["heavy"]) ||
    mechanics.operations !== undefined ||
    mechanics.suppressedBy !== undefined
  ) {
    return null;
  }
  return {
    deltaFeet: movementDeltaFeet(effect.delta),
    condition: {
      kind: "notWearingArmor",
      categories: ["heavy"],
    },
  };
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
      damageReplacement:
        monkLevel < 5 ? martialArts.damageReplacement : null,
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
      sameStringSet(predicate.categories, ["light", "medium", "heavy"]),
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
    damageReplacement.die.base.dice !== 1 ||
    damageReplacement.die.base.dieSize !== 6 ||
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
      dieSize: 6,
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
            unit.id,
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
    dieSize: bardicInspirationDieSize(classLevel),
    flatModifier: 0,
    spends: { resourceUnitId: unit.id, amount: 1 },
  };
}

function bardicInspirationDieSize(classLevel: ClassLevel): 6 | 8 | 10 | 12 {
  if (classLevel >= 15) return 12;
  if (classLevel >= 10) return 10;
  if (classLevel >= 5) return 8;
  return 6;
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
    parseAttackRollMissToHitReplacementUnitFeatureProfile(unit) ??
    parsePassiveSpeedBonusUnitFeatureProfile(unit) ??
    parsePassiveSpeedKindGrantsUnitFeatureProfile(unit) ??
    parseWeaponDamageDiceRollChoiceUnitFeatureProfile(unit) ??
    parseMartialArtsAttackProjectionUnitFeatureProfile(unit, classLevels) ??
    parseBardicInspirationGrantUnitFeatureProfile(unit, classLevels) ??
    attackActionAttackCountScalingProfileForUnit(unit) ??
    zeroHitPointReplacementProfileForUnit(unit) ??
    bonusActionDashTemporaryHitPointsProfileForUnit(unit) ??
    failedAbilityCheckResourceBoostProfileForUnit(unit)
  );
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

export function battleWeaponMasterySapSupportForUnit(
  unit: UnitRecord,
): BattleWeaponMasterySapSupport {
  if (unit.kind !== "mastery") {
    return null;
  }
  return unit.mechanics.family === "on_hit_trigger" &&
    unit.mechanics.trigger.kind === "weapon_hit" &&
    unit.mechanics.optional === false &&
    unit.mechanics.effect.kind === "modify_roll_advantage" &&
    unit.mechanics.effect.mode === "disadvantage" &&
    unit.mechanics.effect.count === 1 &&
    unit.mechanics.effect.on.length === 1 &&
    unit.mechanics.effect.on[0] === "attack_roll" &&
    unit.mechanics.effect.expiresOn.kind === "target_uses_or_turn_start"
    ? WEAPON_MASTERY_SAP_SUPPORT_PROFILE
    : "unsupported";
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
  if (
    effect.die.base.dieSize !== 6 ||
    bardicInspirationLaterLevelDieSizeApplies(effect.die, classLevel) ||
    Either.isLeft(durationTicks)
  ) {
    return null;
  }
  return {
    kind: "bardicInspirationGrant",
    unit,
    rangeFeet: movementFeet(BARDIC_INSPIRATION_RANGE_FEET),
    dieSize: 6,
    durationTicks: durationTicks.right,
    spends: { resourceUnitId: unit.id, amount: 1 },
  };
}

function bardicInspirationLaterLevelDieSizeApplies(
  die: {
    readonly tiers?: readonly {
      readonly atLevel: number;
      readonly override: { readonly dieSize?: number };
    }[];
    readonly base: { readonly dieSize?: number };
  },
  classLevel: ClassLevel,
): boolean {
  return (die.tiers ?? []).some(
    (tier) =>
      classLevel >= tier.atLevel &&
      tier.override.dieSize !== undefined &&
      tier.override.dieSize !== 6,
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
  return {
    kind: "attackDamageRider",
    unit,
    optional: true,
    usageLimit: "oncePerTurn",
    weaponFilter: "finesseOrRanged",
    eligibility:
      "advantageOrNonIncapacitatedAllyWithin5ftOfTargetWithoutDisadvantage",
    classLevel,
    dieSize: mechanics.dieSize,
    diceByLevel: mechanics.dice,
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
  "rollModifiers" | "damageModifiers" | "resistances"
> | null {
  const rollModifiers: OngoingFeatureRollModifier[] = [];
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
      rollModifiers.push({
        mode: effect.mode,
        affects:
          effect.affects === "rolls_against_self"
            ? "rollsAgainstSelf"
            : "selfRoll",
        on: "attackRoll",
        ...(effect.abilityFilter === undefined
          ? {}
          : { abilityFilter: effect.abilityFilter }),
      });
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
    : { rollModifiers, damageModifiers, resistances };
}

function parseInnateSorceryActivationProjectionEffects(
  unit: UnitRecord,
  effects: readonly { readonly kind: string }[],
): Pick<
  Extract<SupportedUnitFeatureProfile, { readonly kind: "ongoingFeature" }>,
  "rollModifiers" | "damageModifiers" | "resistances"
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
  return { rollModifiers: [], damageModifiers: [], resistances: [] };
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
