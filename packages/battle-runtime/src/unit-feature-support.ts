import { Match } from "effect";
import * as Either from "effect/Either";
import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  CONDITIONS as ALL_CONDITIONS,
  ClassLevel,
  movementFeet,
  type Condition,
  type MovementFeet,
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
import type { BattleUnitRef } from "./battle-init.ts";
import type { CharacterBattleClassLevel } from "./character-class-level.ts";

export const WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE =
  "weaponOrUnarmedCriticalRange19";
export const ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE = "attackDamageRider";
export const SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE = "saveDamageReplacement";
export const REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE =
  "reactionRollOrDamageReduction";
export const BATTLE_UNIT_SUPPORT_PROFILES = [
  "bonusActionHide",
  WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
  SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
] as const;
export type BattleUnitSupportProfile =
  (typeof BATTLE_UNIT_SUPPORT_PROFILES)[number];

export type BattleUnitSupportProfileIssue = {
  readonly tag: "battleUnitSupportProfileIssue";
  readonly message: string;
};

const CUNNING_ACTION_STANDARD_ACTIONS = [
  "dash",
  "disengage",
  "hide",
] as const satisfies ReadonlyArray<StandardActionKind>;

function battleUnitSupportProfileIssue(
  message: string,
): Either.Either<never, BattleUnitSupportProfileIssue> {
  return Either.left({ tag: "battleUnitSupportProfileIssue", message });
}

export function battleUnitSupportProfilesForUnit(input: {
  readonly unit: UnitRecord;
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
  if (bonusActionStandardActionSupport === "bonusActionHide") {
    supportProfiles.push("bonusActionHide");
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

  return Either.right(supportProfiles);
}

export function battleUnitRefWithSupportProfiles(input: {
  readonly unitRef: Pick<BattleUnitRef, "unitId">;
  readonly unit: UnitRecord;
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
      readonly reduction: { readonly kind: "bardicInspirationDie" };
    }
  | {
      readonly kind: "attackDamageRollReduction";
      readonly rangeFeet: MovementFeet;
      readonly requiresVisibleCreature: true;
      readonly reduction: { readonly kind: "bardicInspirationDie" };
    }
  | {
      readonly kind: "attackDamageReduction";
      readonly requiresVisibleAttacker?: true;
      readonly damageIncludes?: readonly DamageType[];
      readonly reduction: { readonly kind: "halfDamage" };
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
  | "bonusActionHide"
  | "unsupported"
  | null;

export function battleBonusActionStandardActionSupportForUnit(
  unit: UnitRecord,
): BattleBonusActionStandardActionSupport {
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "alternate_action_cost"
  ) {
    return null;
  }

  return unit.mechanics.from.kind === "standard_action" &&
    sameStringSet(
      unit.mechanics.from.actions,
      CUNNING_ACTION_STANDARD_ACTIONS,
    ) &&
    unit.mechanics.to.kind === "bonus_action"
    ? "bonusActionHide"
    : "unsupported";
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
  return reactionRollOrDamageReductionMechanicsProjection(unit) === null
    ? "unsupported"
    : "reactionRollOrDamageReduction";
}

function reactionRollOrDamageReductionMechanicsProjection(
  unit: UnitRecord,
): readonly ReactionRollOrDamageReductionProfile[] | null {
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "reaction_roll_or_damage_reduction"
  ) {
    return null;
  }
  const modifiers = unit.mechanics.modifiers.flatMap(
    (modifier): readonly ReactionRollOrDamageReductionProfile[] => {
      if (
        modifier.kind === "attack_roll_reduction" &&
        modifier.trigger.kind === "creature_succeeds_attack_roll" &&
        modifier.trigger.requiresVisibleCreature === true &&
        modifier.reduction.kind === "bardic_inspiration_die"
      ) {
        return [
          {
            kind: "attackRollReduction",
            rangeFeet: movementFeet(modifier.trigger.rangeFeet),
            requiresVisibleCreature: true,
            reduction: { kind: "bardicInspirationDie" },
          },
        ];
      }
      if (
        modifier.kind === "damage_roll_reduction" &&
        modifier.trigger.kind === "creature_makes_damage_roll" &&
        modifier.trigger.requiresVisibleCreature === true &&
        modifier.reduction.kind === "bardic_inspiration_die"
      ) {
        return [
          {
            kind: "attackDamageRollReduction",
            rangeFeet: movementFeet(modifier.trigger.rangeFeet),
            requiresVisibleCreature: true,
            reduction: { kind: "bardicInspirationDie" },
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
      return [];
    },
  );
  return modifiers.length === unit.mechanics.modifiers.length &&
    reactionRollOrDamageReductionKindsUnique(modifiers)
    ? modifiers
    : null;
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
    parseReactionRollOrDamageReductionUnitFeatureProfile(unit, classLevels)
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
  const parsedEffects = parseOngoingFeatureEffects(
    phase.effects,
    classLevels,
    unit,
  );
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
  const modifiers = reactionRollOrDamageReductionMechanicsProjection(unit);
  if (unit.kind !== "class_feature" || modifiers === null) {
    return null;
  }
  const classLevel = findCharacterClassLevel(classLevels, unit.className);
  if (classLevel === undefined || classLevel < unit.acquiredAtLevel) {
    return null;
  }
  return {
    kind: "reactionRollOrDamageReduction",
    unit,
    classLevel,
    modifiers,
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
    ? null
    : { rollModifiers, damageModifiers, resistances };
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
