import type { Ability, DamageType } from "#/types.ts";

export const PROJECTED_UNIT_KINDS = [
  "PUKSpell",
  "PUKClassFeature",
] as const satisfies ReadonlyArray<string>;
export type ProjectedUnitKind = (typeof PROJECTED_UNIT_KINDS)[number];

export interface ProjectedSource {
  readonly unitId: string;
  readonly unitKind: ProjectedUnitKind;
  readonly unitName: string;
}

export interface ProjectedAreaSpherePointWithinRange {
  readonly rangeFeet: number;
  readonly radiusFeet: number;
}

export type ProjectedExecutableAttachment =
  | { readonly tag: "PEASelf" }
  | { readonly tag: "PEAOneTarget" }
  | {
      readonly tag: "PEAAreaSpherePointWithinRange";
      readonly value: ProjectedAreaSpherePointWithinRange;
    };

export const PROJECTED_SAVE_DCS = [
  "PDCSpellSaveDc",
] as const satisfies ReadonlyArray<string>;
export type ProjectedSaveDc = (typeof PROJECTED_SAVE_DCS)[number];

export const PROJECTED_GRANTED_ACTION_RESTRICTIONS = [
  "PGARExcludeMagicAction",
] as const satisfies ReadonlyArray<string>;
export type ProjectedGrantedActionRestriction =
  (typeof PROJECTED_GRANTED_ACTION_RESTRICTIONS)[number];

export const PROJECTED_ACTIVATION_COSTS = [
  "PACAction",
  "PACBonusAction",
  "PACFree",
] as const satisfies ReadonlyArray<string>;
export type ProjectedActivationCost =
  (typeof PROJECTED_ACTIVATION_COSTS)[number];

export const PROJECTED_USAGE_LIMITS = [
  "PULNone",
  "PULOncePerTurn",
] as const satisfies ReadonlyArray<string>;
export type ProjectedUsageLimit = (typeof PROJECTED_USAGE_LIMITS)[number];

export const PROJECTED_LEVEL_AXES = [
  "PLACharacterLevel",
  "PLAFighterLevel",
] as const satisfies ReadonlyArray<string>;
export type ProjectedLevelAxis = (typeof PROJECTED_LEVEL_AXES)[number];

export interface ProjectedDiceExpr {
  readonly dice: number;
  readonly dieSize: number;
  readonly flat: number;
}

export interface ProjectedThresholdDiceTier {
  readonly atLevel: number;
  readonly diceOverride: number;
}

export interface ProjectedThresholdDiceAmount {
  readonly axis: ProjectedLevelAxis;
  readonly base: ProjectedDiceExpr;
  readonly tiers: ReadonlyArray<ProjectedThresholdDiceTier>;
}

export interface ProjectedLinearDicePlusLevelAmount {
  readonly axis: ProjectedLevelAxis;
  readonly base: ProjectedDiceExpr;
  readonly perLevelFlat: number;
  readonly startingAtLevel: number;
}

export type ProjectedAmount =
  | {
      readonly tag: "PAThresholdDice";
      readonly value: ProjectedThresholdDiceAmount;
    }
  | {
      readonly tag: "PALinearDicePlusLevel";
      readonly value: ProjectedLinearDicePlusLevelAmount;
    };

export const PROJECTED_RESOURCE_AXES = [
  "PRAClass",
] as const satisfies ReadonlyArray<string>;
export type ProjectedResourceAxis = (typeof PROJECTED_RESOURCE_AXES)[number];

export const PROJECTED_RESOURCE_POOLS = [
  "PRPSecondWind",
  "PRPActionSurge",
] as const satisfies ReadonlyArray<string>;
export type ProjectedResourcePool = (typeof PROJECTED_RESOURCE_POOLS)[number];

export interface ProjectedThresholdUseCapTier {
  readonly atLevel: number;
  readonly value: number;
}

export interface ProjectedThresholdUseCap {
  readonly axis: ProjectedResourceAxis;
  readonly base: number;
  readonly tiers: ReadonlyArray<ProjectedThresholdUseCapTier>;
}

export type ProjectedResourceCap = {
  readonly tag: "PRCThresholdTiers";
  readonly value: ProjectedThresholdUseCap;
};

export interface ProjectedPartialShortFullLong {
  readonly shortRestRefill: number;
}

export type ProjectedResetCadence =
  | {
      readonly tag: "PRCPartialShortFullLong";
      readonly value: ProjectedPartialShortFullLong;
    }
  | { readonly tag: "PRCShortOrLongRest" };

export type ProjectedResourceGate =
  | { readonly tag: "PRGNone" }
  | {
      readonly tag: "PRGUseCount";
      readonly value: {
        readonly pool: ProjectedResourcePool;
        readonly cap: ProjectedResourceCap;
        readonly resetCadence: ProjectedResetCadence;
      };
    };

interface ProjectedExecutableBase {
  readonly source: ProjectedSource;
  readonly activationCost: ProjectedActivationCost;
  readonly resourceGate: ProjectedResourceGate;
  readonly usageLimit: ProjectedUsageLimit;
  readonly attachment: ProjectedExecutableAttachment;
}

export interface ProjectedSaveGateDamageAction extends ProjectedExecutableBase {
  readonly tag: "PEASaveGateDamage";
  readonly ability: Ability;
  readonly dc: ProjectedSaveDc;
  readonly damageType: DamageType;
  readonly amount: ProjectedAmount;
}

export interface ProjectedDirectHealHpAction extends ProjectedExecutableBase {
  readonly tag: "PEADirectHealHp";
  readonly amount: ProjectedAmount;
}

export interface ProjectedDirectGrantExtraActionAction
  extends ProjectedExecutableBase {
  readonly tag: "PEADirectGrantExtraAction";
  readonly restriction: ProjectedGrantedActionRestriction;
}

export type ProjectedExecutableAction =
  | ProjectedSaveGateDamageAction
  | ProjectedDirectHealHpAction
  | ProjectedDirectGrantExtraActionAction;

export const PROJECTED_PERSISTENT_ATTACHMENTS = [
  "PPAChosenTarget",
] as const satisfies ReadonlyArray<string>;
export type ProjectedPersistentAttachment =
  (typeof PROJECTED_PERSISTENT_ATTACHMENTS)[number];

export const PROJECTED_PERSISTENT_EARLY_ENDS = [
  "PPEETargetDonsArmor",
] as const satisfies ReadonlyArray<string>;
export type ProjectedPersistentEarlyEnd =
  (typeof PROJECTED_PERSISTENT_EARLY_ENDS)[number];

export interface ProjectedSetBaseAcPayload {
  readonly source: ProjectedSource;
  readonly attachment: ProjectedPersistentAttachment;
  readonly baseArmorClass: number;
  readonly abilityModifier: Ability;
  readonly earlyEnds: ReadonlyArray<ProjectedPersistentEarlyEnd>;
}

export type ProjectedPersistentRecord = {
  readonly tag: "PPRSetBaseAc";
  readonly value: ProjectedSetBaseAcPayload;
};
