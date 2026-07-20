import * as Either from "effect/Either";
import type { CharacterBattleClassLevel } from "./character-class-level.ts";
import {
  NonNegativeInteger,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import {
  type Attachment,
  type SpellRecord,
  type TargetSelection,
  type UnitRecord,
} from "@dnd/surface/surface/types";
import type {
  BattleCharacterExecutionScopeRef,
  BattleProcedureExecutionRef,
  BattleResourcePoolExecutionRef,
  BattleId,
  CombatantId,
  BattleExecutionScopeOrdinal,
  BattleActiveEffectExecutionRef,
  BattleProcedureExecutionCursor,
} from "./identity.ts";
import {
  BattleProcedureExecutionRef as BattleProcedureExecutionRefSchema,
  battleCharacterExecutionScopeRef,
  battleProcedureExecutionCursor,
  battleProcedureExecutionRef,
  battleResourcePoolExecutionRef,
} from "./identity.ts";
import {
  BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
  BONUS_ACTION_DELEGATED_STANDARD_ACTIONS_SUPPORT_PROFILE,
  MONK_FOCUS_BATTLE_OPTIONS_SUPPORT_PROFILE,
  type BattleUnitSupportProfile,
  type BattleUnitSupportProfileIssue,
  type SupportedUnitFeatureProfile,
} from "./unit-feature-support.ts";
import type {
  BattleActiveEffect,
  BattleSelectedSpellInvocation,
  ClassFeatureFreeCastInvocationResource,
  SupportedSpellInvocation,
} from "./battle-reducer.ts";
import type { BattleUnitRef } from "./battle-init.ts";
import { Brand, Match, Schema } from "effect";
import type { SpellExecutionFacts } from "./battle-reducer/spell-execution-facts.ts";
import {
  sameMagicalDarknessPointOriginExecution,
  sameMagicWeaponEnhancementExecution,
  sameMakeStableExecution,
  sameMarkedDamageRiderExecution,
  sameMirrorImageHitInterceptionExecution,
  sameMoonbeamExecution,
  sameObjectContactDamageExecution,
  sameObjectContactDamageRepeatExecution,
  sameObjectLightExecution,
  sameOngoingSpellEndExecution,
  samePersistentArmorEffectExecution,
  sameRepeatedDamageAllocationExecution,
  sameRollModifierExecution,
  sameSanctuaryTargetingInterdictionExecution,
  sameSaveGatedAttackRollAdvantageExecution,
  sameSaveGatedConditionExecution,
  sameScalarBuffExecution,
  sameSelfTransformationModeExecution,
  sameSleetStormAreaHazardExecution,
  sameSlowActivePenaltiesExecution,
  sameSpellAttackDamageExecution,
  sameSpellAttackSequenceExecution,
  sameSpikeGrowthMovementHazardExecution,
  sameSpiritualWeaponAttackProxyExecution,
  sameWebRestraintHazardExecution,
  sameWeaponAttackOverrideExecution,
  sameWeaponDamageRiderExecution,
} from "./spell-procedure-execution-equality-magical-darkness-web.ts";
import {
  sameMultisetBy,
  samePrimitiveMultiset,
  samePrimitiveSet,
  sameSetByKey,
  type MechanicalPrimitive,
} from "./mechanical-equality.ts";
import {
  sameAbilityD20TestRollModeSaveGateExecution,
  sameAfterHitDamageAndIlluminationExecution,
  sameAfterHitDamageExecution,
  sameAfterHitSaveGatedConditionExecution,
  sameAfterHitTimedDamageAndSaveExecution,
  sameAntimagicFieldOngoingSpellSuppressionExecution,
  sameChainedSpellAttackDamageExecution,
  sameChosenDamageResistanceExecution,
  sameCloudkillAreaHazardExecution,
  sameCommandExecution,
  sameConditionImmunityAndTurnStartTemporaryHitPointsExecution,
  sameConditionRemovalProtectionExecution,
  sameDamageReductionExecution,
  sameDancingLightsCombinedCastExecution,
  sameDancingLightsRepositionExecution,
  sameDancingLightsSeparateCastExecution,
  sameDirectHitPointRestorationExecution,
  sameDragonsBreathInitialExecution,
  sameHypnoticPatternExecution,
  sameInsectPlagueAreaHazardExecution,
} from "./spell-procedure-execution-equality-ability-insect-plague.ts";
import {
  sameSeeInvisibleObserverSightExecution,
  sameSelfTeleportExecution,
  sameShieldReactionExecution,
  sameSleepTargetAdmissionExecution,
  sameThaumaturgyBoomingVoiceExecution,
} from "./simple-spell-procedure-execution-equality.ts";
import {
  sameAttackBurstSaveDamageExecution,
  sameBlurAttackRollDefenseExecution,
} from "./spell-procedure-execution-equality-attack-blur.ts";
import {
  sameCounterspellExecution,
  sameCreatureSizeDecreaseExecution,
  sameCreatureSizeIncreaseExecution,
  sameCreatureTypeProtectionExecution,
} from "./spell-procedure-execution-equality-counterspell-size.ts";
import {
  sameHastePositiveExecution,
  sameHeldLightExecution,
} from "./spell-procedure-execution-equality-haste-light.ts";
import {
  sameDirectConditionExecution,
  sameDirectConditionRemovalExecution,
} from "./spell-procedure-execution-equality-direct-condition.ts";
import {
  sameExpeditiousRetreatDashExecution,
  sameFeatherFallMitigationExecution,
} from "./spell-procedure-execution-equality-retreat-feather-fall.ts";
import {
  sameFlamingSphereExecution,
  sameFogCloudObscurementExecution,
} from "./spell-procedure-execution-equality-sphere-fog.ts";
import {
  sameGreaseGroundHazardExecution,
  sameGustOfWindLineExecution,
} from "./spell-procedure-execution-equality-grease-gust.ts";
import {
  sameHeldLightHurlExecution,
  sameHideousLaughterExecution,
} from "./spell-procedure-execution-equality-held-hurl-laughter.ts";
import {
  sameJumpMovementReplacementExecution,
  sameLevitatedCreatureExecution,
} from "./spell-procedure-execution-equality-jump-levitate.ts";
import {
  sameSaveGatedConditionImmunityExecution,
  sameSaveGatedDamageExecution,
} from "./spell-procedure-execution-equality-save-immunity-damage.ts";
import {
  sameSpellCreatedHeldObjectAttackExecution,
  sameSpellCreatedHeldObjectExecution,
  sameSpellCreatedHeldObjectReEvokeExecution,
} from "./spell-procedure-execution-equality-created-object.ts";
import { sameSpellHostedWeaponAttackExecution } from "./spell-procedure-execution-equality-hosted-weapon.ts";
import {
  sameSpiritualWeaponRepeatAttackExecution,
  sameWardingBondExecution,
} from "./spell-procedure-execution-equality-spiritual-warding.ts";

export type UnitSupportProfileKind<TProfile = BattleUnitSupportProfile> =
  TProfile extends string
    ? TProfile
    : TProfile extends { readonly kind: infer TKind extends string }
      ? TKind
      : never;

export type CharacterUnitProcedureQuery =
  | { readonly kind: "unitFeatureOrSupportProfile" }
  | {
      readonly kind: "unitFeatureOrSupportProfileKinds";
      readonly featureKinds: ReadonlySet<UnitFeatureProcedureExecution["kind"]>;
      readonly supportKinds: ReadonlySet<UnitSupportProfileKind>;
    }
  | {
      readonly kind: "unitFeature";
      readonly featureKinds: ReadonlySet<UnitFeatureProcedureExecution["kind"]>;
    }
  | {
      readonly kind: "unitSupportProfile";
      readonly supportKinds: ReadonlySet<UnitSupportProfileKind>;
    };

export const CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY = {
  kind: "unitFeatureOrSupportProfile",
} as const satisfies CharacterUnitProcedureQuery;
export const MONK_FOCUS_PROCEDURE_QUERY = {
  kind: "unitSupportProfile",
  supportKinds: new Set<UnitSupportProfileKind>([
    MONK_FOCUS_BATTLE_OPTIONS_SUPPORT_PROFILE,
  ]),
} as const satisfies CharacterUnitProcedureQuery;
export const BONUS_ACTION_STANDARD_ACTION_PROCEDURE_QUERY = {
  kind: "unitFeatureOrSupportProfileKinds",
  featureKinds: new Set<UnitFeatureProcedureExecution["kind"]>([
    BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
    BONUS_ACTION_DELEGATED_STANDARD_ACTIONS_SUPPORT_PROFILE,
  ]),
  supportKinds: new Set<UnitSupportProfileKind>([
    "alternateActionCost",
    BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
    BONUS_ACTION_DELEGATED_STANDARD_ACTIONS_SUPPORT_PROFILE,
  ]),
} as const satisfies CharacterUnitProcedureQuery;
export const DRUID_WILD_SHAPE_PROCEDURE_QUERY = {
  kind: "unitFeature",
  featureKinds: new Set<UnitFeatureProcedureExecution["kind"]>([
    "druidWildShapeKnownForm",
  ]),
} as const satisfies CharacterUnitProcedureQuery;

export type CharacterProcedureBinding =
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "unitSupportProfile";
        readonly source: CharacterUnitProcedureSource;
        readonly execution: UnitSupportProcedureExecution;
      };
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "unitFeature";
        readonly source: CharacterUnitProcedureSource;
        readonly execution: UnitFeatureProcedureExecution;
      };
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "spellInvocation";
        readonly execution: SpellProcedureExecution;
      };
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "unavailableSpellInvocation";
        readonly execution: SpellProcedureExecution;
      };
    };

export type CharacterUnitProcedureBinding = {
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly procedure: CharacterUnitProcedureExecution;
};

export type CharacterUnitProcedureOwnership = {
  readonly unitId: UnitRecord["id"];
  readonly procedureRef: BattleProcedureExecutionRef;
};

export function characterUnitProcedureBindings(
  execution: CharacterExecutionState,
): readonly CharacterUnitProcedureBinding[] {
  return execution.procedureBindings.flatMap((binding) => {
    const procedure = binding.procedure;
    return procedure.kind === "unitFeature" ||
      procedure.kind === "unitSupportProfile"
      ? [{ procedureRef: binding.procedureRef, procedure }]
      : [];
  });
}

export type SpellRuleExecutionFacts = {
  readonly level: SpellRecord["mechanics"]["level"];
  readonly range: SpellRecord["mechanics"]["range"];
  readonly duration: SpellRecord["mechanics"]["duration"];
  readonly components: {
    readonly verbal: boolean;
    readonly somatic: boolean;
    readonly hasMaterial: boolean;
    readonly hasPricedOrConsumedMaterial: boolean;
  };
  readonly twinnedTargetCount: {
    readonly base: number;
    readonly baseLevel: number;
  } | null;
};

type SpellInvocationResourceExecution<
  Resource extends SupportedSpellInvocation["resource"],
> = Resource;

type SpellInvocationFor<
  Procedure extends SupportedSpellInvocation["procedure"],
> = {
  readonly [Invocation in SupportedSpellInvocation as Invocation["procedure"]]: Procedure extends Invocation["procedure"]
    ? Invocation & { readonly procedure: Procedure }
    : never;
}[SupportedSpellInvocation["procedure"]];

type SpellRuleExecutionFactsOwner = {
  readonly spellRuleFacts: SpellRuleExecutionFacts;
};

type AbilityD20TestRollModeSaveGateSpellInvocation =
  SpellInvocationFor<"abilityD20TestRollModeSaveGate">;
export type AbilityD20TestRollModeSaveGateSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: AbilityD20TestRollModeSaveGateSpellInvocation["ability"];
    readonly access: AbilityD20TestRollModeSaveGateSpellInvocation["access"];
    readonly actionCost: AbilityD20TestRollModeSaveGateSpellInvocation["actionCost"];
    readonly dc: AbilityD20TestRollModeSaveGateSpellInvocation["dc"];
    readonly failedSaveDamagePenaltyEffect: AbilityD20TestRollModeSaveGateSpellInvocation["failedSaveDamagePenaltyEffect"];
    readonly failedSaveEffect: AbilityD20TestRollModeSaveGateSpellInvocation["failedSaveEffect"];
    readonly procedure: AbilityD20TestRollModeSaveGateSpellInvocation["procedure"];
    readonly rangeFeet: AbilityD20TestRollModeSaveGateSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      AbilityD20TestRollModeSaveGateSpellInvocation["resource"]
    >;
    readonly successEffect: AbilityD20TestRollModeSaveGateSpellInvocation["successEffect"];
    readonly targeting: AbilityD20TestRollModeSaveGateSpellInvocation["targeting"];
  };

type AfterHitDamageSpellInvocation = SpellInvocationFor<"afterHitDamage">;
export type AfterHitDamageSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: AfterHitDamageSpellInvocation["access"];
    readonly actionCost: AfterHitDamageSpellInvocation["actionCost"];
    readonly conditionalBonusDamage: AfterHitDamageSpellInvocation["conditionalBonusDamage"];
    readonly damage: AfterHitDamageSpellInvocation["damage"];
    readonly procedure: AfterHitDamageSpellInvocation["procedure"];
    readonly resource: SpellInvocationResourceExecution<
      AfterHitDamageSpellInvocation["resource"]
    >;
  };

type AfterHitDamageAndIlluminationSpellInvocation =
  SpellInvocationFor<"afterHitDamageAndIllumination">;
export type AfterHitDamageAndIlluminationSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: AfterHitDamageAndIlluminationSpellInvocation["access"];
    readonly actionCost: AfterHitDamageAndIlluminationSpellInvocation["actionCost"];
    readonly activeEffect: AfterHitDamageAndIlluminationSpellInvocation["activeEffect"];
    readonly damage: AfterHitDamageAndIlluminationSpellInvocation["damage"];
    readonly procedure: AfterHitDamageAndIlluminationSpellInvocation["procedure"];
    readonly resource: SpellInvocationResourceExecution<
      AfterHitDamageAndIlluminationSpellInvocation["resource"]
    >;
  };

type AfterHitSaveGatedConditionSpellInvocation =
  SpellInvocationFor<"afterHitSaveGatedCondition">;
export type AfterHitSaveGatedConditionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: AfterHitSaveGatedConditionSpellInvocation["ability"];
    readonly access: AfterHitSaveGatedConditionSpellInvocation["access"];
    readonly actionCost: AfterHitSaveGatedConditionSpellInvocation["actionCost"];
    readonly dc: AfterHitSaveGatedConditionSpellInvocation["dc"];
    readonly effect: AfterHitSaveGatedConditionSpellInvocation["effect"];
    readonly procedure: AfterHitSaveGatedConditionSpellInvocation["procedure"];
    readonly resource: SpellInvocationResourceExecution<
      AfterHitSaveGatedConditionSpellInvocation["resource"]
    >;
    readonly targeting: AfterHitSaveGatedConditionSpellInvocation["targeting"];
  };

type AfterHitTimedDamageAndSaveSpellInvocation =
  SpellInvocationFor<"afterHitTimedDamageAndSave">;
export type AfterHitTimedDamageAndSaveSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: AfterHitTimedDamageAndSaveSpellInvocation["access"];
    readonly actionCost: AfterHitTimedDamageAndSaveSpellInvocation["actionCost"];
    readonly activeEffect: AfterHitTimedDamageAndSaveSpellInvocation["activeEffect"];
    readonly immediateDamage: AfterHitTimedDamageAndSaveSpellInvocation["immediateDamage"];
    readonly procedure: AfterHitTimedDamageAndSaveSpellInvocation["procedure"];
    readonly resource: SpellInvocationResourceExecution<
      AfterHitTimedDamageAndSaveSpellInvocation["resource"]
    >;
  };

type AntimagicFieldOngoingSpellSuppressionSpellInvocation =
  SpellInvocationFor<"antimagicFieldOngoingSpellSuppression">;
export type AntimagicFieldOngoingSpellSuppressionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: AntimagicFieldOngoingSpellSuppressionSpellInvocation["access"];
    readonly durationTicks: AntimagicFieldOngoingSpellSuppressionSpellInvocation["durationTicks"];
    readonly procedure: AntimagicFieldOngoingSpellSuppressionSpellInvocation["procedure"];
    readonly rangeFeet: AntimagicFieldOngoingSpellSuppressionSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      AntimagicFieldOngoingSpellSuppressionSpellInvocation["resource"]
    >;
    readonly targeting: AntimagicFieldOngoingSpellSuppressionSpellInvocation["targeting"];
  };

type AttackBurstSaveDamageSpellInvocation =
  SpellInvocationFor<"attackBurstSaveDamage">;
export type AttackBurstSaveDamageSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: AttackBurstSaveDamageSpellInvocation["access"];
    readonly attackBonus: AttackBurstSaveDamageSpellInvocation["attackBonus"];
    readonly attackKind: AttackBurstSaveDamageSpellInvocation["attackKind"];
    readonly burst: AttackBurstSaveDamageSpellInvocation["burst"];
    readonly damage: AttackBurstSaveDamageSpellInvocation["damage"];
    readonly procedure: AttackBurstSaveDamageSpellInvocation["procedure"];
    readonly rangeFeet: AttackBurstSaveDamageSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      AttackBurstSaveDamageSpellInvocation["resource"]
    >;
    readonly targeting: AttackBurstSaveDamageSpellInvocation["targeting"];
  };

type BlurAttackRollDefenseSpellInvocation =
  SpellInvocationFor<"blurAttackRollDefense">;
export type BlurAttackRollDefenseSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: BlurAttackRollDefenseSpellInvocation["access"];
    readonly actionCost: BlurAttackRollDefenseSpellInvocation["actionCost"];
    readonly activeEffect: BlurAttackRollDefenseSpellInvocation["activeEffect"];
    readonly procedure: BlurAttackRollDefenseSpellInvocation["procedure"];
    readonly resource: SpellInvocationResourceExecution<
      BlurAttackRollDefenseSpellInvocation["resource"]
    >;
  };

type ChainedSpellAttackDamageSpellInvocation =
  SpellInvocationFor<"chainedSpellAttackDamage">;
export type ChainedSpellAttackDamageSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: ChainedSpellAttackDamageSpellInvocation["access"];
    readonly attackBonus: ChainedSpellAttackDamageSpellInvocation["attackBonus"];
    readonly attackKind: ChainedSpellAttackDamageSpellInvocation["attackKind"];
    readonly damage: ChainedSpellAttackDamageSpellInvocation["damage"];
    readonly damageTypeChoices: ChainedSpellAttackDamageSpellInvocation["damageTypeChoices"];
    readonly leapRangeFeet: ChainedSpellAttackDamageSpellInvocation["leapRangeFeet"];
    readonly procedure: ChainedSpellAttackDamageSpellInvocation["procedure"];
    readonly rangeFeet: ChainedSpellAttackDamageSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      ChainedSpellAttackDamageSpellInvocation["resource"]
    >;
    readonly targeting: ChainedSpellAttackDamageSpellInvocation["targeting"];
  };

type ChosenDamageResistanceSpellInvocation =
  SpellInvocationFor<"chosenDamageResistance">;
export type ChosenDamageResistanceSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: ChosenDamageResistanceSpellInvocation["access"];
    readonly actionCost: ChosenDamageResistanceSpellInvocation["actionCost"];
    readonly damageTypeChoices: ChosenDamageResistanceSpellInvocation["damageTypeChoices"];
    readonly expiresAt: ChosenDamageResistanceSpellInvocation["expiresAt"];
    readonly procedure: ChosenDamageResistanceSpellInvocation["procedure"];
    readonly rangeFeet: ChosenDamageResistanceSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      ChosenDamageResistanceSpellInvocation["resource"]
    >;
    readonly targeting: ChosenDamageResistanceSpellInvocation["targeting"];
  };

type CloudkillAreaHazardSpellInvocation =
  SpellInvocationFor<"cloudkillAreaHazard">;
export type CloudkillAreaHazardSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: CloudkillAreaHazardSpellInvocation["ability"];
    readonly access: CloudkillAreaHazardSpellInvocation["access"];
    readonly damage: CloudkillAreaHazardSpellInvocation["damage"];
    readonly dc: CloudkillAreaHazardSpellInvocation["dc"];
    readonly durationTicks: CloudkillAreaHazardSpellInvocation["durationTicks"];
    readonly procedure: CloudkillAreaHazardSpellInvocation["procedure"];
    readonly rangeFeet: CloudkillAreaHazardSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      CloudkillAreaHazardSpellInvocation["resource"]
    >;
    readonly targeting: CloudkillAreaHazardSpellInvocation["targeting"];
  };

type CommandSpellInvocation = SpellInvocationFor<"command">;
export type CommandSpellProcedureExecution = SpellRuleExecutionFactsOwner & {
  readonly ability: CommandSpellInvocation["ability"];
  readonly access: CommandSpellInvocation["access"];
  readonly actionCost: CommandSpellInvocation["actionCost"];
  readonly dc: CommandSpellInvocation["dc"];
  readonly procedure: CommandSpellInvocation["procedure"];
  readonly resource: SpellInvocationResourceExecution<
    CommandSpellInvocation["resource"]
  >;
  readonly targeting: CommandSpellInvocation["targeting"];
};

type ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation =
  SpellInvocationFor<"conditionImmunityAndTurnStartTemporaryHitPoints">;
export type ConditionImmunityAndTurnStartTemporaryHitPointsSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation["access"];
    readonly actionCost: ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation["actionCost"];
    readonly activeEffects: ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation["activeEffects"];
    readonly procedure: ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation["procedure"];
    readonly rangeFeet: ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation["resource"]
    >;
    readonly targeting: ConditionImmunityAndTurnStartTemporaryHitPointsSpellInvocation["targeting"];
  };

type ConditionRemovalProtectionSpellInvocation =
  SpellInvocationFor<"conditionRemovalProtection">;
export type ConditionRemovalProtectionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: ConditionRemovalProtectionSpellInvocation["access"];
    readonly actionCost: ConditionRemovalProtectionSpellInvocation["actionCost"];
    readonly procedure: ConditionRemovalProtectionSpellInvocation["procedure"];
    readonly protection: ConditionRemovalProtectionSpellInvocation["protection"];
    readonly rangeFeet: ConditionRemovalProtectionSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      ConditionRemovalProtectionSpellInvocation["resource"]
    >;
    readonly targeting: ConditionRemovalProtectionSpellInvocation["targeting"];
  };

type CounterspellSpellInvocation = SpellInvocationFor<"counterspell">;
export type CounterspellSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: CounterspellSpellInvocation["ability"];
    readonly access: CounterspellSpellInvocation["access"];
    readonly dc: CounterspellSpellInvocation["dc"];
    readonly procedure: CounterspellSpellInvocation["procedure"];
    readonly rangeFeet: CounterspellSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      CounterspellSpellInvocation["resource"]
    >;
    readonly triggerComponents: CounterspellSpellInvocation["triggerComponents"];
    readonly targeting: CounterspellSpellInvocation["targeting"];
  };

type CreatureSizeDecreaseSpellInvocation =
  SpellInvocationFor<"creatureSizeDecrease">;
export type CreatureSizeDecreaseSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: CreatureSizeDecreaseSpellInvocation["ability"];
    readonly access: CreatureSizeDecreaseSpellInvocation["access"];
    readonly actionCost: CreatureSizeDecreaseSpellInvocation["actionCost"];
    readonly activeEffect: CreatureSizeDecreaseSpellInvocation["activeEffect"];
    readonly dc: CreatureSizeDecreaseSpellInvocation["dc"];
    readonly procedure: CreatureSizeDecreaseSpellInvocation["procedure"];
    readonly rangeFeet: CreatureSizeDecreaseSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      CreatureSizeDecreaseSpellInvocation["resource"]
    >;
    readonly targeting: CreatureSizeDecreaseSpellInvocation["targeting"];
  };

type CreatureSizeIncreaseSpellInvocation =
  SpellInvocationFor<"creatureSizeIncrease">;
export type CreatureSizeIncreaseSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: CreatureSizeIncreaseSpellInvocation["ability"];
    readonly access: CreatureSizeIncreaseSpellInvocation["access"];
    readonly actionCost: CreatureSizeIncreaseSpellInvocation["actionCost"];
    readonly activeEffect: CreatureSizeIncreaseSpellInvocation["activeEffect"];
    readonly dc: CreatureSizeIncreaseSpellInvocation["dc"];
    readonly procedure: CreatureSizeIncreaseSpellInvocation["procedure"];
    readonly rangeFeet: CreatureSizeIncreaseSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      CreatureSizeIncreaseSpellInvocation["resource"]
    >;
    readonly targeting: CreatureSizeIncreaseSpellInvocation["targeting"];
  };

type CreatureTypeProtectionSpellInvocation =
  SpellInvocationFor<"creatureTypeProtection">;
export type CreatureTypeProtectionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: CreatureTypeProtectionSpellInvocation["access"];
    readonly actionCost: CreatureTypeProtectionSpellInvocation["actionCost"];
    readonly activeEffect: CreatureTypeProtectionSpellInvocation["activeEffect"];
    readonly procedure: CreatureTypeProtectionSpellInvocation["procedure"];
    readonly rangeFeet: CreatureTypeProtectionSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      CreatureTypeProtectionSpellInvocation["resource"]
    >;
    readonly targeting: CreatureTypeProtectionSpellInvocation["targeting"];
  };

type DamageReductionSpellInvocation = SpellInvocationFor<"damageReduction">;
export type DamageReductionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: DamageReductionSpellInvocation["access"];
    readonly actionCost: DamageReductionSpellInvocation["actionCost"];
    readonly amount: DamageReductionSpellInvocation["amount"];
    readonly damageTypeChoices: DamageReductionSpellInvocation["damageTypeChoices"];
    readonly expiresAt: DamageReductionSpellInvocation["expiresAt"];
    readonly procedure: DamageReductionSpellInvocation["procedure"];
    readonly rangeFeet: DamageReductionSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      DamageReductionSpellInvocation["resource"]
    >;
    readonly targeting: DamageReductionSpellInvocation["targeting"];
  };

type DancingLightsCombinedCastSpellInvocation =
  SpellInvocationFor<"dancingLightsCombinedCast">;
export type DancingLightsCombinedCastSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: DancingLightsCombinedCastSpellInvocation["access"];
    readonly actionCost: DancingLightsCombinedCastSpellInvocation["actionCost"];
    readonly dimRadiusFeet: DancingLightsCombinedCastSpellInvocation["dimRadiusFeet"];
    readonly expiresAt: DancingLightsCombinedCastSpellInvocation["expiresAt"];
    readonly form: DancingLightsCombinedCastSpellInvocation["form"];
    readonly maxMoveFeet: DancingLightsCombinedCastSpellInvocation["maxMoveFeet"];
    readonly procedure: DancingLightsCombinedCastSpellInvocation["procedure"];
    readonly rangeFeet: DancingLightsCombinedCastSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      DancingLightsCombinedCastSpellInvocation["resource"]
    >;
    readonly spacingFeet: DancingLightsCombinedCastSpellInvocation["spacingFeet"];
  };

type DancingLightsRepositionSpellInvocation =
  SpellInvocationFor<"dancingLightsReposition">;
export type DancingLightsRepositionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: DancingLightsRepositionSpellInvocation["access"];
    readonly actionCost: DancingLightsRepositionSpellInvocation["actionCost"];
    readonly activeEffectRef: DancingLightsRepositionSpellInvocation["activeEffectRef"];
    readonly sourceDancingLightsProcedureRef: DancingLightsRepositionSpellInvocation["sourceDancingLightsProcedureRef"];
    readonly maxMoveFeet: DancingLightsRepositionSpellInvocation["maxMoveFeet"];
    readonly procedure: DancingLightsRepositionSpellInvocation["procedure"];
    readonly rangeFeet: DancingLightsRepositionSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      DancingLightsRepositionSpellInvocation["resource"]
    >;
    readonly spacingFeet: DancingLightsRepositionSpellInvocation["spacingFeet"];
  };

type DancingLightsSeparateCastSpellInvocation =
  SpellInvocationFor<"dancingLightsSeparateCast">;
export type DancingLightsSeparateCastSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: DancingLightsSeparateCastSpellInvocation["access"];
    readonly actionCost: DancingLightsSeparateCastSpellInvocation["actionCost"];
    readonly dimRadiusFeet: DancingLightsSeparateCastSpellInvocation["dimRadiusFeet"];
    readonly expiresAt: DancingLightsSeparateCastSpellInvocation["expiresAt"];
    readonly form: DancingLightsSeparateCastSpellInvocation["form"];
    readonly maxMoveFeet: DancingLightsSeparateCastSpellInvocation["maxMoveFeet"];
    readonly procedure: DancingLightsSeparateCastSpellInvocation["procedure"];
    readonly rangeFeet: DancingLightsSeparateCastSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      DancingLightsSeparateCastSpellInvocation["resource"]
    >;
    readonly spacingFeet: DancingLightsSeparateCastSpellInvocation["spacingFeet"];
  };

type DirectConditionSpellInvocation = SpellInvocationFor<"directCondition">;
export type DirectConditionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: DirectConditionSpellInvocation["access"];
    readonly actionCost: DirectConditionSpellInvocation["actionCost"];
    readonly activeEffect: DirectConditionSpellInvocation["activeEffect"];
    readonly procedure: DirectConditionSpellInvocation["procedure"];
    readonly rangeFeet: DirectConditionSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      DirectConditionSpellInvocation["resource"]
    >;
    readonly targeting: DirectConditionSpellInvocation["targeting"];
  };

type DirectConditionRemovalSpellInvocation =
  SpellInvocationFor<"directConditionRemoval">;
export type DirectConditionRemovalSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: DirectConditionRemovalSpellInvocation["access"];
    readonly actionCost: DirectConditionRemovalSpellInvocation["actionCost"];
    readonly conditionChoices: DirectConditionRemovalSpellInvocation["conditionChoices"];
    readonly procedure: DirectConditionRemovalSpellInvocation["procedure"];
    readonly rangeFeet: DirectConditionRemovalSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      DirectConditionRemovalSpellInvocation["resource"]
    >;
    readonly targeting: DirectConditionRemovalSpellInvocation["targeting"];
  };

type DirectHitPointRestorationSpellInvocation =
  SpellInvocationFor<"directHitPointRestoration">;
export type DirectHitPointRestorationSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: DirectHitPointRestorationSpellInvocation["access"];
    readonly actionCost: DirectHitPointRestorationSpellInvocation["actionCost"];
    readonly healing: DirectHitPointRestorationSpellInvocation["healing"];
    readonly procedure: DirectHitPointRestorationSpellInvocation["procedure"];
    readonly rangeFeet: DirectHitPointRestorationSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      DirectHitPointRestorationSpellInvocation["resource"]
    >;
    readonly targeting: DirectHitPointRestorationSpellInvocation["targeting"];
  };

type DragonsBreathInitialSpellInvocation =
  SpellInvocationFor<"dragonsBreathInitial">;
export type DragonsBreathInitialSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: DragonsBreathInitialSpellInvocation["access"];
    readonly actionCost: DragonsBreathInitialSpellInvocation["actionCost"];
    readonly activeEffect: DragonsBreathInitialSpellInvocation["activeEffect"];
    readonly damageTypeChoices: DragonsBreathInitialSpellInvocation["damageTypeChoices"];
    readonly procedure: DragonsBreathInitialSpellInvocation["procedure"];
    readonly rangeFeet: DragonsBreathInitialSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      DragonsBreathInitialSpellInvocation["resource"]
    >;
    readonly targeting: DragonsBreathInitialSpellInvocation["targeting"];
  };

type ExpeditiousRetreatDashSpellInvocation =
  SpellInvocationFor<"expeditiousRetreatDash">;
export type ExpeditiousRetreatDashSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: ExpeditiousRetreatDashSpellInvocation["access"];
    readonly actionCost: ExpeditiousRetreatDashSpellInvocation["actionCost"];
    readonly activeEffect: ExpeditiousRetreatDashSpellInvocation["activeEffect"];
    readonly procedure: ExpeditiousRetreatDashSpellInvocation["procedure"];
    readonly resource: SpellInvocationResourceExecution<
      ExpeditiousRetreatDashSpellInvocation["resource"]
    >;
  };

type FeatherFallMitigationSpellInvocation =
  SpellInvocationFor<"featherFallMitigation">;
export type FeatherFallMitigationSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: FeatherFallMitigationSpellInvocation["access"];
    readonly activeEffect: FeatherFallMitigationSpellInvocation["activeEffect"];
    readonly procedure: FeatherFallMitigationSpellInvocation["procedure"];
    readonly rangeFeet: FeatherFallMitigationSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      FeatherFallMitigationSpellInvocation["resource"]
    >;
    readonly targeting: FeatherFallMitigationSpellInvocation["targeting"];
  };

type FlamingSphereSpellInvocation = SpellInvocationFor<"flamingSphere">;
export type FlamingSphereSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: FlamingSphereSpellInvocation["ability"];
    readonly access: FlamingSphereSpellInvocation["access"];
    readonly damage: FlamingSphereSpellInvocation["damage"];
    readonly dc: FlamingSphereSpellInvocation["dc"];
    readonly durationTicks: FlamingSphereSpellInvocation["durationTicks"];
    readonly procedure: FlamingSphereSpellInvocation["procedure"];
    readonly ramMaxMoveFeet: FlamingSphereSpellInvocation["ramMaxMoveFeet"];
    readonly rangeFeet: FlamingSphereSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      FlamingSphereSpellInvocation["resource"]
    >;
    readonly targeting: FlamingSphereSpellInvocation["targeting"];
  };

type FogCloudObscurementSpellInvocation =
  SpellInvocationFor<"fogCloudObscurement">;
export type FogCloudObscurementSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: FogCloudObscurementSpellInvocation["access"];
    readonly durationTicks: FogCloudObscurementSpellInvocation["durationTicks"];
    readonly procedure: FogCloudObscurementSpellInvocation["procedure"];
    readonly rangeFeet: FogCloudObscurementSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      FogCloudObscurementSpellInvocation["resource"]
    >;
    readonly targeting: FogCloudObscurementSpellInvocation["targeting"];
  };

type GreaseGroundHazardSpellInvocation =
  SpellInvocationFor<"greaseGroundHazard">;
export type GreaseGroundHazardSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: GreaseGroundHazardSpellInvocation["ability"];
    readonly access: GreaseGroundHazardSpellInvocation["access"];
    readonly dc: GreaseGroundHazardSpellInvocation["dc"];
    readonly durationTicks: GreaseGroundHazardSpellInvocation["durationTicks"];
    readonly procedure: GreaseGroundHazardSpellInvocation["procedure"];
    readonly rangeFeet: GreaseGroundHazardSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      GreaseGroundHazardSpellInvocation["resource"]
    >;
    readonly targeting: GreaseGroundHazardSpellInvocation["targeting"];
  };

type GustOfWindLineSpellInvocation = SpellInvocationFor<"gustOfWindLine">;
export type GustOfWindLineSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: GustOfWindLineSpellInvocation["ability"];
    readonly access: GustOfWindLineSpellInvocation["access"];
    readonly dc: GustOfWindLineSpellInvocation["dc"];
    readonly durationTicks: GustOfWindLineSpellInvocation["durationTicks"];
    readonly movementCost: GustOfWindLineSpellInvocation["movementCost"];
    readonly procedure: GustOfWindLineSpellInvocation["procedure"];
    readonly pushDistanceFeet: GustOfWindLineSpellInvocation["pushDistanceFeet"];
    readonly rangeFeet: GustOfWindLineSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      GustOfWindLineSpellInvocation["resource"]
    >;
    readonly targeting: GustOfWindLineSpellInvocation["targeting"];
  };

type HastePositiveSpellInvocation = SpellInvocationFor<"hastePositive">;
export type HastePositiveSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: HastePositiveSpellInvocation["access"];
    readonly actionCost: HastePositiveSpellInvocation["actionCost"];
    readonly activeEffects: HastePositiveSpellInvocation["activeEffects"];
    readonly procedure: HastePositiveSpellInvocation["procedure"];
    readonly rangeFeet: HastePositiveSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      HastePositiveSpellInvocation["resource"]
    >;
    readonly targeting: HastePositiveSpellInvocation["targeting"];
  };

type HeldLightSpellInvocation = SpellInvocationFor<"heldLight">;
export type HeldLightSpellProcedureExecution = SpellRuleExecutionFactsOwner & {
  readonly access: HeldLightSpellInvocation["access"];
  readonly actionCost: HeldLightSpellInvocation["actionCost"];
  readonly expiresAt: HeldLightSpellInvocation["expiresAt"];
  readonly light: HeldLightSpellInvocation["light"];
  readonly hurl: HeldLightSpellInvocation["hurl"];
  readonly procedure: HeldLightSpellInvocation["procedure"];
  readonly resource: SpellInvocationResourceExecution<
    HeldLightSpellInvocation["resource"]
  >;
};

type HeldLightHurlSpellInvocation = SpellInvocationFor<"heldLightHurl">;
export type HeldLightHurlSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: HeldLightHurlSpellInvocation["access"];
    readonly attackBonus: HeldLightHurlSpellInvocation["attackBonus"];
    readonly attackKind: HeldLightHurlSpellInvocation["attackKind"];
    readonly damage: HeldLightHurlSpellInvocation["damage"];
    readonly procedure: HeldLightHurlSpellInvocation["procedure"];
    readonly rangeFeet: HeldLightHurlSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      HeldLightHurlSpellInvocation["resource"]
    >;
    readonly sourceEffectRef: HeldLightHurlSpellInvocation["sourceEffectRef"];
    readonly sourceHeldLightProcedureRef: HeldLightHurlSpellInvocation["sourceHeldLightProcedureRef"];
    readonly targeting: HeldLightHurlSpellInvocation["targeting"];
  };

type HideousLaughterSpellInvocation = SpellInvocationFor<"hideousLaughter">;
export type HideousLaughterSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: HideousLaughterSpellInvocation["ability"];
    readonly access: HideousLaughterSpellInvocation["access"];
    readonly actionCost: HideousLaughterSpellInvocation["actionCost"];
    readonly dc: HideousLaughterSpellInvocation["dc"];
    readonly procedure: HideousLaughterSpellInvocation["procedure"];
    readonly resource: SpellInvocationResourceExecution<
      HideousLaughterSpellInvocation["resource"]
    >;
    readonly targeting: HideousLaughterSpellInvocation["targeting"];
  };

type HypnoticPatternSpellInvocation = SpellInvocationFor<"hypnoticPattern">;
export type HypnoticPatternSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: HypnoticPatternSpellInvocation["ability"];
    readonly access: HypnoticPatternSpellInvocation["access"];
    readonly actionCost: HypnoticPatternSpellInvocation["actionCost"];
    readonly dc: HypnoticPatternSpellInvocation["dc"];
    readonly durationTicks: HypnoticPatternSpellInvocation["durationTicks"];
    readonly procedure: HypnoticPatternSpellInvocation["procedure"];
    readonly rangeFeet: HypnoticPatternSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      HypnoticPatternSpellInvocation["resource"]
    >;
    readonly targeting: HypnoticPatternSpellInvocation["targeting"];
  };

type InsectPlagueAreaHazardSpellInvocation =
  SpellInvocationFor<"insectPlagueAreaHazard">;
export type InsectPlagueAreaHazardSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: InsectPlagueAreaHazardSpellInvocation["ability"];
    readonly access: InsectPlagueAreaHazardSpellInvocation["access"];
    readonly damage: InsectPlagueAreaHazardSpellInvocation["damage"];
    readonly dc: InsectPlagueAreaHazardSpellInvocation["dc"];
    readonly durationTicks: InsectPlagueAreaHazardSpellInvocation["durationTicks"];
    readonly procedure: InsectPlagueAreaHazardSpellInvocation["procedure"];
    readonly rangeFeet: InsectPlagueAreaHazardSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      InsectPlagueAreaHazardSpellInvocation["resource"]
    >;
    readonly targeting: InsectPlagueAreaHazardSpellInvocation["targeting"];
  };

type JumpMovementReplacementSpellInvocation =
  SpellInvocationFor<"jumpMovementReplacement">;
export type JumpMovementReplacementSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: JumpMovementReplacementSpellInvocation["access"];
    readonly actionCost: JumpMovementReplacementSpellInvocation["actionCost"];
    readonly activeEffect: JumpMovementReplacementSpellInvocation["activeEffect"];
    readonly procedure: JumpMovementReplacementSpellInvocation["procedure"];
    readonly rangeFeet: JumpMovementReplacementSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      JumpMovementReplacementSpellInvocation["resource"]
    >;
    readonly targeting: JumpMovementReplacementSpellInvocation["targeting"];
  };

type LevitatedCreatureSpellInvocation = SpellInvocationFor<"levitatedCreature">;
export type LevitatedCreatureSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: LevitatedCreatureSpellInvocation["ability"];
    readonly access: LevitatedCreatureSpellInvocation["access"];
    readonly actionCost: LevitatedCreatureSpellInvocation["actionCost"];
    readonly activeEffect: LevitatedCreatureSpellInvocation["activeEffect"];
    readonly dc: LevitatedCreatureSpellInvocation["dc"];
    readonly maxInitialRiseFeet: LevitatedCreatureSpellInvocation["maxInitialRiseFeet"];
    readonly procedure: LevitatedCreatureSpellInvocation["procedure"];
    readonly rangeFeet: LevitatedCreatureSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      LevitatedCreatureSpellInvocation["resource"]
    >;
    readonly targeting: LevitatedCreatureSpellInvocation["targeting"];
  };

type MagicalDarknessPointOriginSpellInvocation =
  SpellInvocationFor<"magicalDarknessPointOrigin">;
export type MagicalDarknessPointOriginSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: MagicalDarknessPointOriginSpellInvocation["access"];
    readonly dispelledSpellCreatedLightMaxSpellLevel: MagicalDarknessPointOriginSpellInvocation["dispelledSpellCreatedLightMaxSpellLevel"];
    readonly durationTicks: MagicalDarknessPointOriginSpellInvocation["durationTicks"];
    readonly procedure: MagicalDarknessPointOriginSpellInvocation["procedure"];
    readonly rangeFeet: MagicalDarknessPointOriginSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      MagicalDarknessPointOriginSpellInvocation["resource"]
    >;
    readonly targeting: MagicalDarknessPointOriginSpellInvocation["targeting"];
  };

type MagicWeaponEnhancementSpellInvocation =
  SpellInvocationFor<"magicWeaponEnhancement">;
export type MagicWeaponEnhancementSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: MagicWeaponEnhancementSpellInvocation["access"];
    readonly actionCost: MagicWeaponEnhancementSpellInvocation["actionCost"];
    readonly bonus: MagicWeaponEnhancementSpellInvocation["bonus"];
    readonly durationTicks: MagicWeaponEnhancementSpellInvocation["durationTicks"];
    readonly procedure: MagicWeaponEnhancementSpellInvocation["procedure"];
    readonly resource: SpellInvocationResourceExecution<
      MagicWeaponEnhancementSpellInvocation["resource"]
    >;
  };

type MakeStableSpellInvocation = SpellInvocationFor<"makeStable">;
export type MakeStableSpellProcedureExecution = SpellRuleExecutionFactsOwner & {
  readonly access: MakeStableSpellInvocation["access"];
  readonly actionCost: MakeStableSpellInvocation["actionCost"];
  readonly procedure: MakeStableSpellInvocation["procedure"];
  readonly rangeFeet: MakeStableSpellInvocation["rangeFeet"];
  readonly resource: SpellInvocationResourceExecution<
    MakeStableSpellInvocation["resource"]
  >;
};

type MarkedDamageRiderCastSpellInvocation = Extract<
  SpellInvocationFor<"markedDamageRider">,
  { readonly action: "cast" }
>;
export type MarkedDamageRiderCastSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly abilityCheckBehavior: MarkedDamageRiderCastSpellInvocation["abilityCheckBehavior"];
    readonly access: MarkedDamageRiderCastSpellInvocation["access"];
    readonly action: MarkedDamageRiderCastSpellInvocation["action"];
    readonly actionCost: MarkedDamageRiderCastSpellInvocation["actionCost"];
    readonly damage: MarkedDamageRiderCastSpellInvocation["damage"];
    readonly expiresAt: MarkedDamageRiderCastSpellInvocation["expiresAt"];
    readonly procedure: MarkedDamageRiderCastSpellInvocation["procedure"];
    readonly rangeFeet: MarkedDamageRiderCastSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      MarkedDamageRiderCastSpellInvocation["resource"]
    >;
    readonly retargetTiming: MarkedDamageRiderCastSpellInvocation["retargetTiming"];
    readonly targeting: MarkedDamageRiderCastSpellInvocation["targeting"];
  };

type MarkedDamageRiderTransferSpellInvocation = Extract<
  SpellInvocationFor<"markedDamageRider">,
  { readonly action: "transfer" }
>;
export type MarkedDamageRiderTransferSpellProcedureExecution = {
  readonly action: MarkedDamageRiderTransferSpellInvocation["action"];
  readonly activeEffectRef: BattleActiveEffectExecutionRef;
  readonly activeEffectSourceProcedureRef: BattleProcedureExecutionRef;
  readonly procedure: MarkedDamageRiderTransferSpellInvocation["procedure"];
};

type MirrorImageHitInterceptionSpellInvocation =
  SpellInvocationFor<"mirrorImageHitInterception">;
export type MirrorImageHitInterceptionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: MirrorImageHitInterceptionSpellInvocation["access"];
    readonly actionCost: MirrorImageHitInterceptionSpellInvocation["actionCost"];
    readonly activeEffect: MirrorImageHitInterceptionSpellInvocation["activeEffect"];
    readonly procedure: MirrorImageHitInterceptionSpellInvocation["procedure"];
    readonly resource: SpellInvocationResourceExecution<
      MirrorImageHitInterceptionSpellInvocation["resource"]
    >;
  };

type MoonbeamSpellInvocation = SpellInvocationFor<"moonbeam">;
export type MoonbeamSpellProcedureExecution = SpellRuleExecutionFactsOwner & {
  readonly ability: MoonbeamSpellInvocation["ability"];
  readonly access: MoonbeamSpellInvocation["access"];
  readonly damage: MoonbeamSpellInvocation["damage"];
  readonly dc: MoonbeamSpellInvocation["dc"];
  readonly durationTicks: MoonbeamSpellInvocation["durationTicks"];
  readonly procedure: MoonbeamSpellInvocation["procedure"];
  readonly rangeFeet: MoonbeamSpellInvocation["rangeFeet"];
  readonly repositionMaxMoveFeet: MoonbeamSpellInvocation["repositionMaxMoveFeet"];
  readonly resource: SpellInvocationResourceExecution<
    MoonbeamSpellInvocation["resource"]
  >;
  readonly targeting: MoonbeamSpellInvocation["targeting"];
};

type ObjectContactDamageSpellInvocation =
  SpellInvocationFor<"objectContactDamage">;
export type ObjectContactDamageSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: ObjectContactDamageSpellInvocation["access"];
    readonly actionCost: ObjectContactDamageSpellInvocation["actionCost"];
    readonly damage: ObjectContactDamageSpellInvocation["damage"];
    readonly durationTicks: ObjectContactDamageSpellInvocation["durationTicks"];
    readonly procedure: ObjectContactDamageSpellInvocation["procedure"];
    readonly rangeFeet: ObjectContactDamageSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      ObjectContactDamageSpellInvocation["resource"]
    >;
    readonly targeting: ObjectContactDamageSpellInvocation["targeting"];
  };

type ObjectContactDamageRepeatSpellInvocation =
  SpellInvocationFor<"objectContactDamageRepeat">;
export type ObjectContactDamageRepeatSpellProcedureExecution = {
  readonly activeEffectRef: BattleActiveEffectExecutionRef;
  readonly activeEffectSourceProcedureRef: BattleProcedureExecutionRef;
  readonly procedure: ObjectContactDamageRepeatSpellInvocation["procedure"];
};

type ObjectLightClassCantripSpellInvocation = Extract<
  SpellInvocationFor<"objectLight">,
  { readonly access: { readonly tag: "classCantrip" } }
>;
export type ObjectLightClassCantripSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: ObjectLightClassCantripSpellInvocation["access"];
    readonly actionCost: ObjectLightClassCantripSpellInvocation["actionCost"];
    readonly expiresAt: ObjectLightClassCantripSpellInvocation["expiresAt"];
    readonly light: ObjectLightClassCantripSpellInvocation["light"];
    readonly procedure: ObjectLightClassCantripSpellInvocation["procedure"];
    readonly resource: SpellInvocationResourceExecution<
      ObjectLightClassCantripSpellInvocation["resource"]
    >;
    readonly targeting: ObjectLightClassCantripSpellInvocation["targeting"];
  };

type ObjectLightPreparedSpellInvocation = Extract<
  SpellInvocationFor<"objectLight">,
  { readonly access: { readonly tag: "prepared" } }
>;
export type ObjectLightPreparedSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: ObjectLightPreparedSpellInvocation["access"];
    readonly actionCost: ObjectLightPreparedSpellInvocation["actionCost"];
    readonly expiresAt: ObjectLightPreparedSpellInvocation["expiresAt"];
    readonly light: ObjectLightPreparedSpellInvocation["light"];
    readonly procedure: ObjectLightPreparedSpellInvocation["procedure"];
    readonly resource: SpellInvocationResourceExecution<
      ObjectLightPreparedSpellInvocation["resource"]
    >;
    readonly targeting: ObjectLightPreparedSpellInvocation["targeting"];
  };

type OngoingSpellEndSpellInvocation = SpellInvocationFor<"ongoingSpellEnd">;
export type OngoingSpellEndSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: OngoingSpellEndSpellInvocation["access"];
    readonly actionCost: OngoingSpellEndSpellInvocation["actionCost"];
    readonly procedure: OngoingSpellEndSpellInvocation["procedure"];
    readonly rangeFeet: OngoingSpellEndSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      OngoingSpellEndSpellInvocation["resource"]
    >;
  };

type PersistentArmorEffectPreparedSpellInvocation = Extract<
  SpellInvocationFor<"persistentArmorEffect">,
  { readonly access: { readonly tag: "prepared" } }
>;
export type PersistentArmorEffectPreparedSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PersistentArmorEffectPreparedSpellInvocation["access"];
    readonly activeEffect: PersistentArmorEffectPreparedSpellInvocation["activeEffect"];
    readonly procedure: PersistentArmorEffectPreparedSpellInvocation["procedure"];
    readonly rangeFeet: PersistentArmorEffectPreparedSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      PersistentArmorEffectPreparedSpellInvocation["resource"]
    >;
  };

type PersistentArmorEffectArmorOfShadowsSpellInvocation = Extract<
  SpellInvocationFor<"persistentArmorEffect">,
  { readonly access: { readonly tag: "armorOfShadows" } }
>;
export type PersistentArmorEffectArmorOfShadowsSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: PersistentArmorEffectArmorOfShadowsSpellInvocation["access"];
    readonly activeEffect: PersistentArmorEffectArmorOfShadowsSpellInvocation["activeEffect"];
    readonly procedure: PersistentArmorEffectArmorOfShadowsSpellInvocation["procedure"];
    readonly rangeFeet: PersistentArmorEffectArmorOfShadowsSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      PersistentArmorEffectArmorOfShadowsSpellInvocation["resource"]
    >;
  };

type RepeatedDamageAllocationSpellInvocation =
  SpellInvocationFor<"repeatedDamageAllocation">;
export type RepeatedDamageAllocationSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: RepeatedDamageAllocationSpellInvocation["access"];
    readonly damage: RepeatedDamageAllocationSpellInvocation["damage"];
    readonly procedure: RepeatedDamageAllocationSpellInvocation["procedure"];
    readonly rangeFeet: RepeatedDamageAllocationSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      RepeatedDamageAllocationSpellInvocation["resource"]
    >;
    readonly targeting: RepeatedDamageAllocationSpellInvocation["targeting"];
  };

type RollModifierWithoutAbilityChoiceApplicationSpellInvocation = Exclude<
  SpellInvocationFor<"rollModifier">,
  { readonly abilityChoiceApplication: unknown }
>;
export type RollModifierWithoutAbilityChoiceApplicationSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly abilityChoices: RollModifierWithoutAbilityChoiceApplicationSpellInvocation["abilityChoices"];
    readonly access: RollModifierWithoutAbilityChoiceApplicationSpellInvocation["access"];
    readonly actionCost: RollModifierWithoutAbilityChoiceApplicationSpellInvocation["actionCost"];
    readonly effect: RollModifierWithoutAbilityChoiceApplicationSpellInvocation["effect"];
    readonly procedure: RollModifierWithoutAbilityChoiceApplicationSpellInvocation["procedure"];
    readonly rangeFeet: RollModifierWithoutAbilityChoiceApplicationSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      RollModifierWithoutAbilityChoiceApplicationSpellInvocation["resource"]
    >;
    readonly saveGate: RollModifierWithoutAbilityChoiceApplicationSpellInvocation["saveGate"];
    readonly skillChoices: RollModifierWithoutAbilityChoiceApplicationSpellInvocation["skillChoices"];
    readonly targeting: RollModifierWithoutAbilityChoiceApplicationSpellInvocation["targeting"];
  };

type RollModifierWithAbilityChoiceApplicationSpellInvocation = Extract<
  SpellInvocationFor<"rollModifier">,
  { readonly abilityChoiceApplication: unknown }
>;
export type RollModifierWithAbilityChoiceApplicationSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly abilityChoiceApplication: RollModifierWithAbilityChoiceApplicationSpellInvocation["abilityChoiceApplication"];
    readonly abilityChoices: RollModifierWithAbilityChoiceApplicationSpellInvocation["abilityChoices"];
    readonly access: RollModifierWithAbilityChoiceApplicationSpellInvocation["access"];
    readonly actionCost: RollModifierWithAbilityChoiceApplicationSpellInvocation["actionCost"];
    readonly effect: RollModifierWithAbilityChoiceApplicationSpellInvocation["effect"];
    readonly procedure: RollModifierWithAbilityChoiceApplicationSpellInvocation["procedure"];
    readonly rangeFeet: RollModifierWithAbilityChoiceApplicationSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      RollModifierWithAbilityChoiceApplicationSpellInvocation["resource"]
    >;
    readonly saveGate: RollModifierWithAbilityChoiceApplicationSpellInvocation["saveGate"];
    readonly skillChoices: RollModifierWithAbilityChoiceApplicationSpellInvocation["skillChoices"];
    readonly targeting: RollModifierWithAbilityChoiceApplicationSpellInvocation["targeting"];
  };

type SanctuaryTargetingInterdictionSpellInvocation =
  SpellInvocationFor<"sanctuaryTargetingInterdiction">;
export type SanctuaryTargetingInterdictionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: SanctuaryTargetingInterdictionSpellInvocation["access"];
    readonly actionCost: SanctuaryTargetingInterdictionSpellInvocation["actionCost"];
    readonly activeEffect: SanctuaryTargetingInterdictionSpellInvocation["activeEffect"];
    readonly procedure: SanctuaryTargetingInterdictionSpellInvocation["procedure"];
    readonly rangeFeet: SanctuaryTargetingInterdictionSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      SanctuaryTargetingInterdictionSpellInvocation["resource"]
    >;
    readonly targeting: SanctuaryTargetingInterdictionSpellInvocation["targeting"];
  };

type SaveGatedAttackRollAdvantageSpellInvocation =
  SpellInvocationFor<"saveGatedAttackRollAdvantage">;
export type SaveGatedAttackRollAdvantageSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: SaveGatedAttackRollAdvantageSpellInvocation["ability"];
    readonly access: SaveGatedAttackRollAdvantageSpellInvocation["access"];
    readonly dc: SaveGatedAttackRollAdvantageSpellInvocation["dc"];
    readonly effect: SaveGatedAttackRollAdvantageSpellInvocation["effect"];
    readonly procedure: SaveGatedAttackRollAdvantageSpellInvocation["procedure"];
    readonly rangeFeet: SaveGatedAttackRollAdvantageSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      SaveGatedAttackRollAdvantageSpellInvocation["resource"]
    >;
    readonly targeting: SaveGatedAttackRollAdvantageSpellInvocation["targeting"];
  };

type SaveGatedConditionSpellInvocation =
  SpellInvocationFor<"saveGatedCondition">;
export type SaveGatedConditionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: SaveGatedConditionSpellInvocation["ability"];
    readonly access: SaveGatedConditionSpellInvocation["access"];
    readonly dc: SaveGatedConditionSpellInvocation["dc"];
    readonly effect: SaveGatedConditionSpellInvocation["effect"];
    readonly procedure: SaveGatedConditionSpellInvocation["procedure"];
    readonly rangeFeet: SaveGatedConditionSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      SaveGatedConditionSpellInvocation["resource"]
    >;
    readonly saveRollModeRule: SaveGatedConditionSpellInvocation["saveRollModeRule"];
    readonly targetCreatureTypes: SaveGatedConditionSpellInvocation["targetCreatureTypes"];
    readonly targeting: SaveGatedConditionSpellInvocation["targeting"];
  };

type SaveGatedConditionImmunitySpellInvocation =
  SpellInvocationFor<"saveGatedConditionImmunity">;
export type SaveGatedConditionImmunitySpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: SaveGatedConditionImmunitySpellInvocation["ability"];
    readonly access: SaveGatedConditionImmunitySpellInvocation["access"];
    readonly actionCost: SaveGatedConditionImmunitySpellInvocation["actionCost"];
    readonly activeEffects: SaveGatedConditionImmunitySpellInvocation["activeEffects"];
    readonly dc: SaveGatedConditionImmunitySpellInvocation["dc"];
    readonly procedure: SaveGatedConditionImmunitySpellInvocation["procedure"];
    readonly rangeFeet: SaveGatedConditionImmunitySpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      SaveGatedConditionImmunitySpellInvocation["resource"]
    >;
    readonly targetCreatureTypes: SaveGatedConditionImmunitySpellInvocation["targetCreatureTypes"];
    readonly targeting: SaveGatedConditionImmunitySpellInvocation["targeting"];
  };

type SaveGatedDamageClassCantripSpellInvocation = Extract<
  SpellInvocationFor<"saveGatedDamage">,
  { readonly access: { readonly tag: "classCantrip" } }
>;
export type SaveGatedDamageClassCantripSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: SaveGatedDamageClassCantripSpellInvocation["ability"];
    readonly access: SaveGatedDamageClassCantripSpellInvocation["access"];
    readonly additionalDamageComponents: SaveGatedDamageClassCantripSpellInvocation["additionalDamageComponents"];
    readonly castingTime: SaveGatedDamageClassCantripSpellInvocation["castingTime"];
    readonly damage: SaveGatedDamageClassCantripSpellInvocation["damage"];
    readonly dc: SaveGatedDamageClassCantripSpellInvocation["dc"];
    readonly failedSaveAbilityChoices: SaveGatedDamageClassCantripSpellInvocation["failedSaveAbilityChoices"];
    readonly failedSaveConditionEffects: SaveGatedDamageClassCantripSpellInvocation["failedSaveConditionEffects"];
    readonly failedSavePostDamageRiders: SaveGatedDamageClassCantripSpellInvocation["failedSavePostDamageRiders"];
    readonly postSaveAreaEffect?: SaveGatedDamageClassCantripSpellInvocation["postSaveAreaEffect"];
    readonly procedure: SaveGatedDamageClassCantripSpellInvocation["procedure"];
    readonly rangeFeet: SaveGatedDamageClassCantripSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      SaveGatedDamageClassCantripSpellInvocation["resource"]
    >;
    readonly saveRollModeRule: SaveGatedDamageClassCantripSpellInvocation["saveRollModeRule"];
    readonly successDamage: SaveGatedDamageClassCantripSpellInvocation["successDamage"];
    readonly targeting: SaveGatedDamageClassCantripSpellInvocation["targeting"];
  };

type SaveGatedDamagePreparedSpellInvocation = Extract<
  SpellInvocationFor<"saveGatedDamage">,
  { readonly access: { readonly tag: "prepared" } }
>;
export type SaveGatedDamagePreparedSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: SaveGatedDamagePreparedSpellInvocation["ability"];
    readonly access: SaveGatedDamagePreparedSpellInvocation["access"];
    readonly additionalDamageComponents: SaveGatedDamagePreparedSpellInvocation["additionalDamageComponents"];
    readonly castingTime: SaveGatedDamagePreparedSpellInvocation["castingTime"];
    readonly damage: SaveGatedDamagePreparedSpellInvocation["damage"];
    readonly dc: SaveGatedDamagePreparedSpellInvocation["dc"];
    readonly failedSaveAbilityChoices: SaveGatedDamagePreparedSpellInvocation["failedSaveAbilityChoices"];
    readonly failedSaveConditionEffects: SaveGatedDamagePreparedSpellInvocation["failedSaveConditionEffects"];
    readonly failedSavePostDamageRiders: SaveGatedDamagePreparedSpellInvocation["failedSavePostDamageRiders"];
    readonly postSaveAreaEffect?: SaveGatedDamagePreparedSpellInvocation["postSaveAreaEffect"];
    readonly procedure: SaveGatedDamagePreparedSpellInvocation["procedure"];
    readonly rangeFeet: SaveGatedDamagePreparedSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      SaveGatedDamagePreparedSpellInvocation["resource"]
    >;
    readonly saveRollModeRule: SaveGatedDamagePreparedSpellInvocation["saveRollModeRule"];
    readonly successDamage: SaveGatedDamagePreparedSpellInvocation["successDamage"];
    readonly targeting: SaveGatedDamagePreparedSpellInvocation["targeting"];
  };

type ScalarBuffSpellInvocation = SpellInvocationFor<"scalarBuff">;
export type ScalarBuffSpellProcedureExecution = SpellRuleExecutionFactsOwner & {
  readonly access: ScalarBuffSpellInvocation["access"];
  readonly actionCost: ScalarBuffSpellInvocation["actionCost"];
  readonly effect: ScalarBuffSpellInvocation["effect"];
  readonly procedure: ScalarBuffSpellInvocation["procedure"];
  readonly rangeFeet: ScalarBuffSpellInvocation["rangeFeet"];
  readonly resource: SpellInvocationResourceExecution<
    ScalarBuffSpellInvocation["resource"]
  >;
  readonly targeting: ScalarBuffSpellInvocation["targeting"];
};

type SeeInvisibleObserverSightSpellInvocation =
  SpellInvocationFor<"seeInvisibleObserverSight">;
export type SeeInvisibleObserverSightSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: SeeInvisibleObserverSightSpellInvocation["access"];
    readonly actionCost: SeeInvisibleObserverSightSpellInvocation["actionCost"];
    readonly activeEffect: SeeInvisibleObserverSightSpellInvocation["activeEffect"];
    readonly procedure: SeeInvisibleObserverSightSpellInvocation["procedure"];
    readonly resource: SpellInvocationResourceExecution<
      SeeInvisibleObserverSightSpellInvocation["resource"]
    >;
  };

type SelfTeleportSpellInvocation = SpellInvocationFor<"selfTeleport">;
export type SelfTeleportSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: SelfTeleportSpellInvocation["access"];
    readonly actionCost: SelfTeleportSpellInvocation["actionCost"];
    readonly maxDistanceFeet: SelfTeleportSpellInvocation["maxDistanceFeet"];
    readonly procedure: SelfTeleportSpellInvocation["procedure"];
    readonly resource: SpellInvocationResourceExecution<
      SelfTeleportSpellInvocation["resource"]
    >;
  };

type SelfTransformationModeSpellInvocation =
  SpellInvocationFor<"selfTransformationMode">;
export type SelfTransformationModeSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: SelfTransformationModeSpellInvocation["access"];
    readonly actionCost: SelfTransformationModeSpellInvocation["actionCost"];
    readonly expiresAt: SelfTransformationModeSpellInvocation["expiresAt"];
    readonly modeChoices: SelfTransformationModeSpellInvocation["modeChoices"];
    readonly naturalWeaponFacts: SelfTransformationModeSpellInvocation["naturalWeaponFacts"];
    readonly procedure: SelfTransformationModeSpellInvocation["procedure"];
    readonly resource: SpellInvocationResourceExecution<
      SelfTransformationModeSpellInvocation["resource"]
    >;
  };

type ShieldReactionSpellInvocation = SpellInvocationFor<"shieldReaction">;
export type ShieldReactionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: ShieldReactionSpellInvocation["access"];
    readonly armorClassBonus: ShieldReactionSpellInvocation["armorClassBonus"];
    readonly negatesRepeatedDamageAllocation: ShieldReactionSpellInvocation["negatesRepeatedDamageAllocation"];
    readonly procedure: ShieldReactionSpellInvocation["procedure"];
    readonly resource: SpellInvocationResourceExecution<
      ShieldReactionSpellInvocation["resource"]
    >;
  };

type SleepTargetAdmissionSpellInvocation =
  SpellInvocationFor<"sleepTargetAdmission">;
export type SleepTargetAdmissionSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: SleepTargetAdmissionSpellInvocation["ability"];
    readonly access: SleepTargetAdmissionSpellInvocation["access"];
    readonly dc: SleepTargetAdmissionSpellInvocation["dc"];
    readonly procedure: SleepTargetAdmissionSpellInvocation["procedure"];
    readonly rangeFeet: SleepTargetAdmissionSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      SleepTargetAdmissionSpellInvocation["resource"]
    >;
    readonly targeting: SleepTargetAdmissionSpellInvocation["targeting"];
  };

type SleetStormAreaHazardSpellInvocation =
  SpellInvocationFor<"sleetStormAreaHazard">;
export type SleetStormAreaHazardSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: SleetStormAreaHazardSpellInvocation["ability"];
    readonly access: SleetStormAreaHazardSpellInvocation["access"];
    readonly dc: SleetStormAreaHazardSpellInvocation["dc"];
    readonly durationTicks: SleetStormAreaHazardSpellInvocation["durationTicks"];
    readonly procedure: SleetStormAreaHazardSpellInvocation["procedure"];
    readonly rangeFeet: SleetStormAreaHazardSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      SleetStormAreaHazardSpellInvocation["resource"]
    >;
    readonly targeting: SleetStormAreaHazardSpellInvocation["targeting"];
  };

type SlowActivePenaltiesSpellInvocation =
  SpellInvocationFor<"slowActivePenalties">;
export type SlowActivePenaltiesSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: SlowActivePenaltiesSpellInvocation["ability"];
    readonly access: SlowActivePenaltiesSpellInvocation["access"];
    readonly actionCost: SlowActivePenaltiesSpellInvocation["actionCost"];
    readonly dc: SlowActivePenaltiesSpellInvocation["dc"];
    readonly durationTicks: SlowActivePenaltiesSpellInvocation["durationTicks"];
    readonly maxTargets: SlowActivePenaltiesSpellInvocation["maxTargets"];
    readonly procedure: SlowActivePenaltiesSpellInvocation["procedure"];
    readonly rangeFeet: SlowActivePenaltiesSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      SlowActivePenaltiesSpellInvocation["resource"]
    >;
    readonly targeting: SlowActivePenaltiesSpellInvocation["targeting"];
  };

type SpellAttackDamageClassCantripSpellInvocation = Extract<
  SpellInvocationFor<"spellAttackDamage">,
  { readonly access: { readonly tag: "classCantrip" } }
>;
export type SpellAttackDamageClassCantripSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: SpellAttackDamageClassCantripSpellInvocation["access"];
    readonly attackBonus: SpellAttackDamageClassCantripSpellInvocation["attackBonus"];
    readonly attackKind: SpellAttackDamageClassCantripSpellInvocation["attackKind"];
    readonly damage: SpellAttackDamageClassCantripSpellInvocation["damage"];
    readonly laterDamage: SpellAttackDamageClassCantripSpellInvocation["laterDamage"];
    readonly missDamage: SpellAttackDamageClassCantripSpellInvocation["missDamage"];
    readonly objectHitEffect: SpellAttackDamageClassCantripSpellInvocation["objectHitEffect"];
    readonly postDamageRiders: SpellAttackDamageClassCantripSpellInvocation["postDamageRiders"];
    readonly procedure: SpellAttackDamageClassCantripSpellInvocation["procedure"];
    readonly rangeFeet: SpellAttackDamageClassCantripSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      SpellAttackDamageClassCantripSpellInvocation["resource"]
    >;
    readonly targeting: SpellAttackDamageClassCantripSpellInvocation["targeting"];
  };

type SpellAttackDamagePreparedSpellInvocation = Extract<
  SpellInvocationFor<"spellAttackDamage">,
  { readonly access: { readonly tag: "prepared" } }
>;
export type SpellAttackDamagePreparedSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: SpellAttackDamagePreparedSpellInvocation["access"];
    readonly attackBonus: SpellAttackDamagePreparedSpellInvocation["attackBonus"];
    readonly attackKind: SpellAttackDamagePreparedSpellInvocation["attackKind"];
    readonly damage: SpellAttackDamagePreparedSpellInvocation["damage"];
    readonly laterDamage: SpellAttackDamagePreparedSpellInvocation["laterDamage"];
    readonly missDamage: SpellAttackDamagePreparedSpellInvocation["missDamage"];
    readonly objectHitEffect: SpellAttackDamagePreparedSpellInvocation["objectHitEffect"];
    readonly postDamageRiders: SpellAttackDamagePreparedSpellInvocation["postDamageRiders"];
    readonly procedure: SpellAttackDamagePreparedSpellInvocation["procedure"];
    readonly rangeFeet: SpellAttackDamagePreparedSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      SpellAttackDamagePreparedSpellInvocation["resource"]
    >;
    readonly targeting: SpellAttackDamagePreparedSpellInvocation["targeting"];
  };

type SpellAttackSequenceClassCantripSpellInvocation = Extract<
  SpellInvocationFor<"spellAttackSequence">,
  { readonly access: { readonly tag: "classCantrip" } }
>;
export type SpellAttackSequenceClassCantripSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: SpellAttackSequenceClassCantripSpellInvocation["access"];
    readonly attackBonus: SpellAttackSequenceClassCantripSpellInvocation["attackBonus"];
    readonly attackKind: SpellAttackSequenceClassCantripSpellInvocation["attackKind"];
    readonly damage: SpellAttackSequenceClassCantripSpellInvocation["damage"];
    readonly procedure: SpellAttackSequenceClassCantripSpellInvocation["procedure"];
    readonly rangeFeet: SpellAttackSequenceClassCantripSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      SpellAttackSequenceClassCantripSpellInvocation["resource"]
    >;
    readonly targeting: SpellAttackSequenceClassCantripSpellInvocation["targeting"];
  };

type SpellAttackSequencePreparedSpellInvocation = Extract<
  SpellInvocationFor<"spellAttackSequence">,
  { readonly access: { readonly tag: "prepared" } }
>;
export type SpellAttackSequencePreparedSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: SpellAttackSequencePreparedSpellInvocation["access"];
    readonly attackBonus: SpellAttackSequencePreparedSpellInvocation["attackBonus"];
    readonly attackKind: SpellAttackSequencePreparedSpellInvocation["attackKind"];
    readonly damage: SpellAttackSequencePreparedSpellInvocation["damage"];
    readonly procedure: SpellAttackSequencePreparedSpellInvocation["procedure"];
    readonly rangeFeet: SpellAttackSequencePreparedSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      SpellAttackSequencePreparedSpellInvocation["resource"]
    >;
    readonly targeting: SpellAttackSequencePreparedSpellInvocation["targeting"];
  };

type SpellCreatedHeldObjectSpellInvocation =
  SpellInvocationFor<"spellCreatedHeldObject">;
export type SpellCreatedHeldObjectSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: SpellCreatedHeldObjectSpellInvocation["access"];
    readonly actionCost: SpellCreatedHeldObjectSpellInvocation["actionCost"];
    readonly activeEffect: SpellCreatedHeldObjectSpellInvocation["activeEffect"];
    readonly procedure: SpellCreatedHeldObjectSpellInvocation["procedure"];
    readonly resource: SpellInvocationResourceExecution<
      SpellCreatedHeldObjectSpellInvocation["resource"]
    >;
  };

type SpellCreatedHeldObjectAttackSpellInvocation =
  SpellInvocationFor<"spellCreatedHeldObjectAttack">;
export type SpellCreatedHeldObjectAttackSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: SpellCreatedHeldObjectAttackSpellInvocation["access"];
    readonly sourceEffectRef: SpellCreatedHeldObjectAttackSpellInvocation["sourceEffectRef"];
    readonly sourceHeldObjectProcedureRef: SpellCreatedHeldObjectAttackSpellInvocation["sourceHeldObjectProcedureRef"];
    readonly attackBonus: SpellCreatedHeldObjectAttackSpellInvocation["attackBonus"];
    readonly attackKind: SpellCreatedHeldObjectAttackSpellInvocation["attackKind"];
    readonly damage: SpellCreatedHeldObjectAttackSpellInvocation["damage"];
    readonly procedure: SpellCreatedHeldObjectAttackSpellInvocation["procedure"];
    readonly rangeFeet: SpellCreatedHeldObjectAttackSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      SpellCreatedHeldObjectAttackSpellInvocation["resource"]
    >;
    readonly targeting: SpellCreatedHeldObjectAttackSpellInvocation["targeting"];
  };

type SpellCreatedHeldObjectReEvokeSpellInvocation =
  SpellInvocationFor<"spellCreatedHeldObjectReEvoke">;
export type SpellCreatedHeldObjectReEvokeSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: SpellCreatedHeldObjectReEvokeSpellInvocation["access"];
    readonly actionCost: SpellCreatedHeldObjectReEvokeSpellInvocation["actionCost"];
    readonly sourceEffectRef: SpellCreatedHeldObjectReEvokeSpellInvocation["sourceEffectRef"];
    readonly sourceHeldObjectProcedureRef: SpellCreatedHeldObjectReEvokeSpellInvocation["sourceHeldObjectProcedureRef"];
    readonly procedure: SpellCreatedHeldObjectReEvokeSpellInvocation["procedure"];
    readonly resource: SpellInvocationResourceExecution<
      SpellCreatedHeldObjectReEvokeSpellInvocation["resource"]
    >;
  };

type SpellHostedWeaponAttackSpellInvocation =
  SpellInvocationFor<"spellHostedWeaponAttack">;
export type SpellHostedWeaponAttackSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: SpellHostedWeaponAttackSpellInvocation["access"];
    readonly actionCost: SpellHostedWeaponAttackSpellInvocation["actionCost"];
    readonly attackBonus: SpellHostedWeaponAttackSpellInvocation["attackBonus"];
    readonly bonusDamage: SpellHostedWeaponAttackSpellInvocation["bonusDamage"];
    readonly componentWeaponItemId: string;
    readonly damageTypeChoices: SpellHostedWeaponAttackSpellInvocation["damageTypeChoices"];
    readonly procedure: SpellHostedWeaponAttackSpellInvocation["procedure"];
    readonly resource: SpellInvocationResourceExecution<
      SpellHostedWeaponAttackSpellInvocation["resource"]
    >;
    readonly spellcastingAbilityModifier: SpellHostedWeaponAttackSpellInvocation["spellcastingAbilityModifier"];
  };

type SpikeGrowthMovementHazardSpellInvocation =
  SpellInvocationFor<"spikeGrowthMovementHazard">;
export type SpikeGrowthMovementHazardSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: SpikeGrowthMovementHazardSpellInvocation["access"];
    readonly damage: SpikeGrowthMovementHazardSpellInvocation["damage"];
    readonly damagePerFeet: SpikeGrowthMovementHazardSpellInvocation["damagePerFeet"];
    readonly durationTicks: SpikeGrowthMovementHazardSpellInvocation["durationTicks"];
    readonly procedure: SpikeGrowthMovementHazardSpellInvocation["procedure"];
    readonly rangeFeet: SpikeGrowthMovementHazardSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      SpikeGrowthMovementHazardSpellInvocation["resource"]
    >;
    readonly targeting: SpikeGrowthMovementHazardSpellInvocation["targeting"];
  };

type SpiritualWeaponAttackProxySpellInvocation =
  SpellInvocationFor<"spiritualWeaponAttackProxy">;
export type SpiritualWeaponAttackProxySpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: SpiritualWeaponAttackProxySpellInvocation["access"];
    readonly actionCost: SpiritualWeaponAttackProxySpellInvocation["actionCost"];
    readonly attackBonus: SpiritualWeaponAttackProxySpellInvocation["attackBonus"];
    readonly attackKind: SpiritualWeaponAttackProxySpellInvocation["attackKind"];
    readonly damage: SpiritualWeaponAttackProxySpellInvocation["damage"];
    readonly durationTicks: SpiritualWeaponAttackProxySpellInvocation["durationTicks"];
    readonly forceReachFeet: SpiritualWeaponAttackProxySpellInvocation["forceReachFeet"];
    readonly procedure: SpiritualWeaponAttackProxySpellInvocation["procedure"];
    readonly rangeFeet: SpiritualWeaponAttackProxySpellInvocation["rangeFeet"];
    readonly repeatMoveMaxFeet: SpiritualWeaponAttackProxySpellInvocation["repeatMoveMaxFeet"];
    readonly resource: SpellInvocationResourceExecution<
      SpiritualWeaponAttackProxySpellInvocation["resource"]
    >;
    readonly targeting: SpiritualWeaponAttackProxySpellInvocation["targeting"];
  };

type SpiritualWeaponRepeatAttackSpellInvocation =
  SpellInvocationFor<"spiritualWeaponRepeatAttack">;
export type SpiritualWeaponRepeatAttackSpellProcedureExecution = {
  readonly activeEffectRef: BattleActiveEffectExecutionRef;
  readonly activeEffectSourceProcedureRef: BattleProcedureExecutionRef;
  readonly procedure: SpiritualWeaponRepeatAttackSpellInvocation["procedure"];
};

type ThaumaturgyBoomingVoiceSpellInvocation =
  SpellInvocationFor<"thaumaturgyBoomingVoice">;
export type ThaumaturgyBoomingVoiceSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: ThaumaturgyBoomingVoiceSpellInvocation["access"];
    readonly actionCost: ThaumaturgyBoomingVoiceSpellInvocation["actionCost"];
    readonly activeEffect: ThaumaturgyBoomingVoiceSpellInvocation["activeEffect"];
    readonly procedure: ThaumaturgyBoomingVoiceSpellInvocation["procedure"];
    readonly rangeFeet: ThaumaturgyBoomingVoiceSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      ThaumaturgyBoomingVoiceSpellInvocation["resource"]
    >;
  };

type WardingBondSpellInvocation = SpellInvocationFor<"wardingBond">;
export type WardingBondSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: WardingBondSpellInvocation["access"];
    readonly actionCost: WardingBondSpellInvocation["actionCost"];
    readonly activeEffect: WardingBondSpellInvocation["activeEffect"];
    readonly connectionRangeFeet: WardingBondSpellInvocation["connectionRangeFeet"];
    readonly procedure: WardingBondSpellInvocation["procedure"];
    readonly rangeFeet: WardingBondSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      WardingBondSpellInvocation["resource"]
    >;
  };

type WeaponAttackOverrideSpellInvocation =
  SpellInvocationFor<"weaponAttackOverride">;
export type WeaponAttackOverrideSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: WeaponAttackOverrideSpellInvocation["access"];
    readonly actionCost: WeaponAttackOverrideSpellInvocation["actionCost"];
    readonly activeEffect: WeaponAttackOverrideSpellInvocation["activeEffect"];
    readonly attachedWeaponItemId: string;
    readonly procedure: WeaponAttackOverrideSpellInvocation["procedure"];
    readonly resource: SpellInvocationResourceExecution<
      WeaponAttackOverrideSpellInvocation["resource"]
    >;
  };

type WeaponDamageRiderSpellInvocation = SpellInvocationFor<"weaponDamageRider">;
export type WeaponDamageRiderSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: WeaponDamageRiderSpellInvocation["access"];
    readonly actionCost: WeaponDamageRiderSpellInvocation["actionCost"];
    readonly activeEffect: WeaponDamageRiderSpellInvocation["activeEffect"];
    readonly procedure: WeaponDamageRiderSpellInvocation["procedure"];
    readonly resource: SpellInvocationResourceExecution<
      WeaponDamageRiderSpellInvocation["resource"]
    >;
  };

type WebRestraintHazardSpellInvocation =
  SpellInvocationFor<"webRestraintHazard">;
export type WebRestraintHazardSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly ability: WebRestraintHazardSpellInvocation["ability"];
    readonly access: WebRestraintHazardSpellInvocation["access"];
    readonly dc: WebRestraintHazardSpellInvocation["dc"];
    readonly durationTicks: WebRestraintHazardSpellInvocation["durationTicks"];
    readonly procedure: WebRestraintHazardSpellInvocation["procedure"];
    readonly rangeFeet: WebRestraintHazardSpellInvocation["rangeFeet"];
    readonly resource: SpellInvocationResourceExecution<
      WebRestraintHazardSpellInvocation["resource"]
    >;
    readonly targeting: WebRestraintHazardSpellInvocation["targeting"];
  };

export interface SpellProcedureExecutionByProcedure {
  readonly abilityD20TestRollModeSaveGate: AbilityD20TestRollModeSaveGateSpellProcedureExecution;
  readonly afterHitDamage: AfterHitDamageSpellProcedureExecution;
  readonly afterHitDamageAndIllumination: AfterHitDamageAndIlluminationSpellProcedureExecution;
  readonly afterHitSaveGatedCondition: AfterHitSaveGatedConditionSpellProcedureExecution;
  readonly afterHitTimedDamageAndSave: AfterHitTimedDamageAndSaveSpellProcedureExecution;
  readonly antimagicFieldOngoingSpellSuppression: AntimagicFieldOngoingSpellSuppressionSpellProcedureExecution;
  readonly attackBurstSaveDamage: AttackBurstSaveDamageSpellProcedureExecution;
  readonly blurAttackRollDefense: BlurAttackRollDefenseSpellProcedureExecution;
  readonly chainedSpellAttackDamage: ChainedSpellAttackDamageSpellProcedureExecution;
  readonly chosenDamageResistance: ChosenDamageResistanceSpellProcedureExecution;
  readonly cloudkillAreaHazard: CloudkillAreaHazardSpellProcedureExecution;
  readonly command: CommandSpellProcedureExecution;
  readonly conditionImmunityAndTurnStartTemporaryHitPoints: ConditionImmunityAndTurnStartTemporaryHitPointsSpellProcedureExecution;
  readonly conditionRemovalProtection: ConditionRemovalProtectionSpellProcedureExecution;
  readonly counterspell: CounterspellSpellProcedureExecution;
  readonly creatureSizeDecrease: CreatureSizeDecreaseSpellProcedureExecution;
  readonly creatureSizeIncrease: CreatureSizeIncreaseSpellProcedureExecution;
  readonly creatureTypeProtection: CreatureTypeProtectionSpellProcedureExecution;
  readonly damageReduction: DamageReductionSpellProcedureExecution;
  readonly dancingLightsCombinedCast: DancingLightsCombinedCastSpellProcedureExecution;
  readonly dancingLightsReposition: DancingLightsRepositionSpellProcedureExecution;
  readonly dancingLightsSeparateCast: DancingLightsSeparateCastSpellProcedureExecution;
  readonly directCondition: DirectConditionSpellProcedureExecution;
  readonly directConditionRemoval: DirectConditionRemovalSpellProcedureExecution;
  readonly directHitPointRestoration: DirectHitPointRestorationSpellProcedureExecution;
  readonly dragonsBreathInitial: DragonsBreathInitialSpellProcedureExecution;
  readonly expeditiousRetreatDash: ExpeditiousRetreatDashSpellProcedureExecution;
  readonly featherFallMitigation: FeatherFallMitigationSpellProcedureExecution;
  readonly flamingSphere: FlamingSphereSpellProcedureExecution;
  readonly fogCloudObscurement: FogCloudObscurementSpellProcedureExecution;
  readonly greaseGroundHazard: GreaseGroundHazardSpellProcedureExecution;
  readonly gustOfWindLine: GustOfWindLineSpellProcedureExecution;
  readonly hastePositive: HastePositiveSpellProcedureExecution;
  readonly heldLight: HeldLightSpellProcedureExecution;
  readonly heldLightHurl: HeldLightHurlSpellProcedureExecution;
  readonly hideousLaughter: HideousLaughterSpellProcedureExecution;
  readonly hypnoticPattern: HypnoticPatternSpellProcedureExecution;
  readonly insectPlagueAreaHazard: InsectPlagueAreaHazardSpellProcedureExecution;
  readonly jumpMovementReplacement: JumpMovementReplacementSpellProcedureExecution;
  readonly levitatedCreature: LevitatedCreatureSpellProcedureExecution;
  readonly magicalDarknessPointOrigin: MagicalDarknessPointOriginSpellProcedureExecution;
  readonly magicWeaponEnhancement: MagicWeaponEnhancementSpellProcedureExecution;
  readonly makeStable: MakeStableSpellProcedureExecution;
  readonly markedDamageRider:
    | MarkedDamageRiderCastSpellProcedureExecution
    | MarkedDamageRiderTransferSpellProcedureExecution;
  readonly mirrorImageHitInterception: MirrorImageHitInterceptionSpellProcedureExecution;
  readonly moonbeam: MoonbeamSpellProcedureExecution;
  readonly objectContactDamage: ObjectContactDamageSpellProcedureExecution;
  readonly objectContactDamageRepeat: ObjectContactDamageRepeatSpellProcedureExecution;
  readonly objectLight:
    | ObjectLightClassCantripSpellProcedureExecution
    | ObjectLightPreparedSpellProcedureExecution;
  readonly ongoingSpellEnd: OngoingSpellEndSpellProcedureExecution;
  readonly persistentArmorEffect:
    | PersistentArmorEffectPreparedSpellProcedureExecution
    | PersistentArmorEffectArmorOfShadowsSpellProcedureExecution;
  readonly repeatedDamageAllocation: RepeatedDamageAllocationSpellProcedureExecution;
  readonly rollModifier:
    | RollModifierWithoutAbilityChoiceApplicationSpellProcedureExecution
    | RollModifierWithAbilityChoiceApplicationSpellProcedureExecution;
  readonly sanctuaryTargetingInterdiction: SanctuaryTargetingInterdictionSpellProcedureExecution;
  readonly saveGatedAttackRollAdvantage: SaveGatedAttackRollAdvantageSpellProcedureExecution;
  readonly saveGatedCondition: SaveGatedConditionSpellProcedureExecution;
  readonly saveGatedConditionImmunity: SaveGatedConditionImmunitySpellProcedureExecution;
  readonly saveGatedDamage:
    | SaveGatedDamageClassCantripSpellProcedureExecution
    | SaveGatedDamagePreparedSpellProcedureExecution;
  readonly scalarBuff: ScalarBuffSpellProcedureExecution;
  readonly seeInvisibleObserverSight: SeeInvisibleObserverSightSpellProcedureExecution;
  readonly selfTeleport: SelfTeleportSpellProcedureExecution;
  readonly selfTransformationMode: SelfTransformationModeSpellProcedureExecution;
  readonly shieldReaction: ShieldReactionSpellProcedureExecution;
  readonly sleepTargetAdmission: SleepTargetAdmissionSpellProcedureExecution;
  readonly sleetStormAreaHazard: SleetStormAreaHazardSpellProcedureExecution;
  readonly slowActivePenalties: SlowActivePenaltiesSpellProcedureExecution;
  readonly spellAttackDamage:
    | SpellAttackDamageClassCantripSpellProcedureExecution
    | SpellAttackDamagePreparedSpellProcedureExecution;
  readonly spellAttackSequence:
    | SpellAttackSequenceClassCantripSpellProcedureExecution
    | SpellAttackSequencePreparedSpellProcedureExecution;
  readonly spellCreatedHeldObject: SpellCreatedHeldObjectSpellProcedureExecution;
  readonly spellCreatedHeldObjectAttack: SpellCreatedHeldObjectAttackSpellProcedureExecution;
  readonly spellCreatedHeldObjectReEvoke: SpellCreatedHeldObjectReEvokeSpellProcedureExecution;
  readonly spellHostedWeaponAttack: SpellHostedWeaponAttackSpellProcedureExecution;
  readonly spikeGrowthMovementHazard: SpikeGrowthMovementHazardSpellProcedureExecution;
  readonly spiritualWeaponAttackProxy: SpiritualWeaponAttackProxySpellProcedureExecution;
  readonly spiritualWeaponRepeatAttack: SpiritualWeaponRepeatAttackSpellProcedureExecution;
  readonly thaumaturgyBoomingVoice: ThaumaturgyBoomingVoiceSpellProcedureExecution;
  readonly wardingBond: WardingBondSpellProcedureExecution;
  readonly weaponAttackOverride: WeaponAttackOverrideSpellProcedureExecution;
  readonly weaponDamageRider: WeaponDamageRiderSpellProcedureExecution;
  readonly webRestraintHazard: WebRestraintHazardSpellProcedureExecution;
}

type SpellProcedureExecutionForInvocation<
  Invocation extends SupportedSpellInvocation,
> = Invocation extends SupportedSpellInvocation
  ? SpellProcedureExecutionByProcedure[Invocation["procedure"]] extends infer Execution
    ? Execution extends { readonly access: infer ExecutionAccess }
      ? Invocation extends { readonly access: infer InvocationAccess }
        ? InvocationAccess extends ExecutionAccess
          ? Execution
          : never
        : never
      : Execution
    : never
  : never;

export type SpellProcedureExecution<
  Invocation extends SupportedSpellInvocation = SupportedSpellInvocation,
> = SpellProcedureExecutionForInvocation<Invocation>;

type DynamicActiveEffectSpellProcedureExecution =
  | MarkedDamageRiderTransferSpellProcedureExecution
  | ObjectContactDamageRepeatSpellProcedureExecution
  | SpiritualWeaponRepeatAttackSpellProcedureExecution;

export type MarkedDamageRiderTransferLiveSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: MarkedDamageRiderTransferSpellInvocation["access"];
    readonly resource: SpellInvocationResourceExecution<
      MarkedDamageRiderTransferSpellInvocation["resource"]
    >;
    readonly procedure: MarkedDamageRiderTransferSpellInvocation["procedure"];
    readonly action: MarkedDamageRiderTransferSpellInvocation["action"];
    readonly actionCost: MarkedDamageRiderTransferSpellInvocation["actionCost"];
    readonly activeEffect: MarkedDamageRiderTransferSpellInvocation["activeEffect"];
    readonly rangeFeet: MarkedDamageRiderTransferSpellInvocation["rangeFeet"];
    readonly targeting: MarkedDamageRiderTransferSpellInvocation["targeting"];
  };

export type ObjectContactDamageRepeatLiveSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: ObjectContactDamageRepeatSpellInvocation["access"];
    readonly resource: SpellInvocationResourceExecution<
      ObjectContactDamageRepeatSpellInvocation["resource"]
    >;
    readonly procedure: ObjectContactDamageRepeatSpellInvocation["procedure"];
    readonly actionCost: ObjectContactDamageRepeatSpellInvocation["actionCost"];
    readonly activeEffect: ObjectContactDamageRepeatSpellInvocation["activeEffect"];
  };

export type SpiritualWeaponRepeatAttackLiveSpellProcedureExecution =
  SpellRuleExecutionFactsOwner & {
    readonly access: SpiritualWeaponRepeatAttackSpellInvocation["access"];
    readonly resource: SpellInvocationResourceExecution<
      SpiritualWeaponRepeatAttackSpellInvocation["resource"]
    >;
    readonly procedure: SpiritualWeaponRepeatAttackSpellInvocation["procedure"];
    readonly actionCost: SpiritualWeaponRepeatAttackSpellInvocation["actionCost"];
    readonly activeEffect: SpiritualWeaponRepeatAttackSpellInvocation["activeEffect"];
    readonly targeting: SpiritualWeaponRepeatAttackSpellInvocation["targeting"];
    readonly damage: SpiritualWeaponRepeatAttackSpellInvocation["damage"];
    readonly attackKind: SpiritualWeaponRepeatAttackSpellInvocation["attackKind"];
    readonly attackBonus: SpiritualWeaponRepeatAttackSpellInvocation["attackBonus"];
    readonly forceReachFeet: SpiritualWeaponRepeatAttackSpellInvocation["forceReachFeet"];
    readonly repeatMoveMaxFeet: SpiritualWeaponRepeatAttackSpellInvocation["repeatMoveMaxFeet"];
  };

type LiveDynamicSpellProcedureExecution<
  Execution extends DynamicActiveEffectSpellProcedureExecution,
> = Execution extends MarkedDamageRiderTransferSpellProcedureExecution
  ? MarkedDamageRiderTransferLiveSpellProcedureExecution
  : Execution extends ObjectContactDamageRepeatSpellProcedureExecution
    ? ObjectContactDamageRepeatLiveSpellProcedureExecution
    : Execution extends SpiritualWeaponRepeatAttackSpellProcedureExecution
      ? SpiritualWeaponRepeatAttackLiveSpellProcedureExecution
      : never;

export type SpellExecutableExecutionOf<
  Input extends SupportedSpellInvocation | SpellProcedureExecution,
> = (
  Input extends SupportedSpellInvocation
    ? SpellProcedureExecution<Input>
    : Input extends SpellProcedureExecution
      ? Input
      : never
) extends infer Execution
  ? Execution extends DynamicActiveEffectSpellProcedureExecution
    ? LiveDynamicSpellProcedureExecution<Execution>
    : Execution
  : never;

export type RuntimeSpellProcedureExecution =
  SpellExecutableExecutionOf<SpellProcedureExecution>;

export type BattleSpellProcedureExecution<
  Invocation extends SupportedSpellInvocation = SupportedSpellInvocation,
> = SpellExecutableExecutionOf<Invocation> & {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
};

export type UnitSupportProcedureExecutionContext = {
  readonly resourcePoolRefsByUnitId: ReadonlyMap<
    UnitRecord["id"],
    BattleResourcePoolExecutionRef
  >;
  readonly unitFeatureProcedureRefsByUnitId: ReadonlyMap<
    UnitRecord["id"],
    BattleProcedureExecutionRef
  >;
  readonly supportProcedureRefsByUnitId: ReadonlyMap<
    UnitRecord["id"],
    BattleProcedureExecutionRef
  >;
};

export type UnitFeatureProcedureExecutionContext = Pick<
  UnitSupportProcedureExecutionContext,
  "resourcePoolRefsByUnitId"
>;

export function unitFeatureProcedureExecutionContext(
  ownership: readonly {
    readonly unit: Pick<UnitRecord, "id">;
    readonly resourcePoolRef: BattleResourcePoolExecutionRef;
  }[],
): UnitFeatureProcedureExecutionContext {
  return {
    resourcePoolRefsByUnitId: new Map(
      ownership.map((resource) => [resource.unit.id, resource.resourcePoolRef]),
    ),
  };
}

export type UnitSupportProcedureExecution = Exclude<
  ReturnType<typeof unitSupportProcedureExecution>,
  undefined
>;

export type UnitFeatureProcedureExecution = Exclude<
  ReturnType<typeof unitFeatureProcedureExecution>,
  undefined
>;

export type CharacterUnitProcedureExecution =
  | {
      readonly kind: "unitFeature";
      readonly source: CharacterUnitProcedureSource;
      readonly execution: UnitFeatureProcedureExecution;
    }
  | {
      readonly kind: "unitSupportProfile";
      readonly source: CharacterUnitProcedureSource;
      readonly execution: UnitSupportProcedureExecution;
    };

export type CharacterUnitProcedureSource =
  | { readonly kind: "intrinsic" }
  | {
      readonly kind: "resourcePool";
      readonly resourcePoolRef: BattleResourcePoolExecutionRef;
    };

type CharacterProcedureWithoutRef =
  CharacterProcedureBinding extends infer TBinding
    ? TBinding extends CharacterProcedureBinding
      ? Omit<TBinding, "procedureRef">
      : never
    : never;

export function characterProcedureBinding(
  execution: CharacterExecutionState,
  procedureRef: BattleProcedureExecutionRef,
): CharacterProcedureBinding | undefined {
  return execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === procedureRef,
  );
}

export type CharacterProcedureBindingSnapshot =
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "unitFeature";
        readonly source: CharacterUnitProcedureSource;
        readonly execution: UnitFeatureProcedureExecution;
      };
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "unitSupportProfile";
        readonly source: CharacterUnitProcedureSource;
        readonly execution: UnitSupportProcedureExecution;
      };
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "spellInvocation";
        readonly executionFacts: SpellExecutionFacts;
      };
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "unavailableSpellInvocation";
      };
    };

type CharacterExecutionStateData = {
  readonly scopeRef: BattleCharacterExecutionScopeRef;
  readonly nextProcedureOrdinal: BattleProcedureExecutionCursor;
  readonly procedureBindings: readonly CharacterProcedureBinding[];
};
export type CharacterExecutionState = CharacterExecutionStateData &
  Brand.Brand<"CharacterExecutionState">;
const CharacterExecutionState = Brand.nominal<CharacterExecutionState>();

export type CharacterExecutionAdmission = {
  readonly execution: CharacterExecutionState;
  readonly unitProcedureOwnership: readonly CharacterUnitProcedureOwnership[];
};

type UnitSupportProcedureCandidate = {
  readonly unitId: UnitRecord["id"];
  readonly profile: BattleUnitSupportProfile;
};

type UnitFeatureProcedureCandidate = {
  readonly unitId: UnitRecord["id"];
  readonly execution: UnitFeatureProcedureExecution;
};

function unitSupportProcedureIsOwnedByUnitFeature(
  unitFeatureProcedures: readonly UnitFeatureProcedureCandidate[],
  candidate: UnitSupportProcedureCandidate,
  context: UnitSupportProcedureExecutionContext,
): boolean {
  const supportExecution = unitSupportProcedureExecution(
    candidate.profile,
    context,
  );
  return (
    supportExecution !== undefined &&
    unitFeatureProcedures.some(
      (feature) =>
        feature.unitId === candidate.unitId &&
        sameUnitFeatureAndSupportProcedureExecution(
          feature.execution,
          supportExecution,
        ),
    )
  );
}

export function characterExecutionFromUnits(input: {
  readonly battleId: BattleId;
  readonly combatantId: CombatantId;
  readonly scopeOrdinal: BattleExecutionScopeOrdinal;
  readonly unitFeatureProfiles: readonly SupportedUnitFeatureProfile[];
  readonly resourceUnits: readonly UnitRecord[];
  readonly units: readonly UnitRecord[];
  readonly unitRefs: readonly BattleUnitRef[];
  readonly classLevels: readonly CharacterBattleClassLevel[];
}): Either.Either<
  CharacterExecutionAdmission,
  ReadonlyNonEmptyArray<BattleUnitSupportProfileIssue>
> {
  const scopeRef = battleCharacterExecutionScopeRef(
    input.battleId,
    input.combatantId,
    input.scopeOrdinal,
  );
  const supportProfileIssues: BattleUnitSupportProfileIssue[] = [];
  const resourcePoolRefsByUnitId = new Map(
    input.resourceUnits.map((unit, ordinal) => [
      unit.id,
      battleResourcePoolExecutionRef(scopeRef, NonNegativeInteger(ordinal)),
    ]),
  );
  const unitFeatureExecutionContext: UnitFeatureProcedureExecutionContext = {
    resourcePoolRefsByUnitId,
  };
  const unitProcedures = input.unitFeatureProfiles.flatMap((profile) => {
    const execution = unitFeatureProcedureExecution(
      profile,
      unitFeatureExecutionContext,
    );
    if (
      execution === undefined &&
      profile.kind !== "cunningStrike" &&
      profile.kind !== "cunningStrikeOptionGrant"
    ) {
      supportProfileIssues.push({
        tag: "battleUnitSupportProfileIssue",
        message: `Unit feature profile ${profile.kind} references an unavailable mechanical execution resource.`,
      });
    }
    return execution === undefined
      ? []
      : [
          {
            unitId: profile.unit.id,
            execution,
            source: characterUnitProcedureSourceForAdmission(
              scopeRef,
              input.resourceUnits,
              profile.unit.id,
            ),
          },
        ];
  });
  if (supportProfileIssues.length > 0) {
    const [firstIssue, ...remainingIssues] = supportProfileIssues;
    return Either.left([firstIssue, ...remainingIssues]);
  }
  const allocatedUnitProcedures = allocateCharacterProcedureOccurrences(
    scopeRef,
    battleProcedureExecutionCursor(0),
    unitProcedures,
    ({ execution, source }) => ({
      procedure: {
        kind: "unitFeature" as const,
        source,
        execution,
      },
    }),
  );
  const unitFeatureProcedureRefsByUnitId = new Map(
    allocatedUnitProcedures.occurrences.map(
      ({ input: { unitId }, binding }) =>
        [unitId, binding.procedureRef] as const,
    ),
  );
  const unitSupportExecutionContext: UnitSupportProcedureExecutionContext = {
    resourcePoolRefsByUnitId,
    unitFeatureProcedureRefsByUnitId,
    supportProcedureRefsByUnitId: new Map(),
  };
  const unitSupportProcedures = input.unitRefs
    .flatMap((unitRef) =>
      unitRef.supportProfiles.map((profile) => ({
        unitId: unitRef.unit.id,
        profile,
      })),
    )
    .filter(
      (candidate) =>
        !unitSupportProcedureIsOwnedByUnitFeature(
          unitProcedures,
          candidate,
          unitSupportExecutionContext,
        ),
    );
  const primarySupportProcedures = unitSupportProcedures.filter(
    ({ profile }) =>
      typeof profile !== "object" ||
      profile.kind !== "cunningStrikeOptionGrant",
  );
  const projectedPrimarySupportProcedures: Array<{
    readonly unitId: UnitRecord["id"];
    readonly binding: CharacterProcedureWithoutRef;
  }> = [];
  for (const { profile, unitId } of primarySupportProcedures) {
    const execution = unitSupportProcedureExecution(
      profile,
      unitSupportExecutionContext,
    );
    if (execution === undefined) {
      supportProfileIssues.push({
        tag: "battleUnitSupportProfileIssue",
        message: `Unit support profile ${typeof profile === "string" ? profile : profile.kind} references an unavailable mechanical execution resource or procedure.`,
      });
      continue;
    }
    projectedPrimarySupportProcedures.push({
      unitId,
      binding: {
        procedure: {
          kind: "unitSupportProfile",
          source: characterUnitProcedureSourceForAdmission(
            scopeRef,
            input.resourceUnits,
            unitId,
          ),
          execution,
        },
      },
    });
  }
  if (supportProfileIssues.length > 0) {
    const [firstIssue, ...remainingIssues] = supportProfileIssues;
    return Either.left([firstIssue, ...remainingIssues]);
  }
  const allocatedPrimarySupportProcedures =
    allocateCharacterProcedureOccurrences(
      scopeRef,
      allocatedUnitProcedures.nextProcedureOrdinal,
      projectedPrimarySupportProcedures,
      ({ binding }) => binding,
    );
  const supportProcedureRefsByUnitId = new Map(
    allocatedPrimarySupportProcedures.occurrences.map(
      ({ input: { unitId }, binding }) =>
        [unitId, binding.procedureRef] as const,
    ),
  );
  const grantContext: UnitSupportProcedureExecutionContext = {
    ...unitSupportExecutionContext,
    supportProcedureRefsByUnitId,
  };
  const grantProcedures: Array<{
    readonly unitId: UnitRecord["id"];
    readonly binding: CharacterProcedureWithoutRef;
  }> = [];
  for (const { profile, unitId } of unitSupportProcedures) {
    if (
      typeof profile !== "object" ||
      profile.kind !== "cunningStrikeOptionGrant"
    ) {
      continue;
    }
    const execution = unitSupportProcedureExecution(profile, grantContext);
    if (execution === undefined) {
      supportProfileIssues.push({
        tag: "battleUnitSupportProfileIssue",
        message: `Unit support profile ${profile.kind} references an unavailable mechanical procedure.`,
      });
      continue;
    }
    grantProcedures.push({
      unitId,
      binding: {
        procedure: {
          kind: "unitSupportProfile",
          source: characterUnitProcedureSourceForAdmission(
            scopeRef,
            input.resourceUnits,
            unitId,
          ),
          execution,
        },
      },
    });
  }
  if (supportProfileIssues.length > 0) {
    const [firstIssue, ...remainingIssues] = supportProfileIssues;
    return Either.left([firstIssue, ...remainingIssues]);
  }
  const allocatedGrantProcedures = allocateCharacterProcedureOccurrences(
    scopeRef,
    allocatedPrimarySupportProcedures.nextProcedureOrdinal,
    grantProcedures,
    ({ binding }) => binding,
  );
  return Either.right({
    execution: CharacterExecutionState({
      scopeRef,
      nextProcedureOrdinal: allocatedGrantProcedures.nextProcedureOrdinal,
      procedureBindings: [
        ...allocatedUnitProcedures.procedureBindings,
        ...allocatedPrimarySupportProcedures.procedureBindings,
        ...allocatedGrantProcedures.procedureBindings,
      ],
    }),
    unitProcedureOwnership: [
      ...allocatedUnitProcedures.occurrences,
      ...allocatedPrimarySupportProcedures.occurrences,
      ...allocatedGrantProcedures.occurrences,
    ].map(({ input: { unitId }, binding }) => ({
      unitId,
      procedureRef: binding.procedureRef,
    })),
  });
}

function allocateCharacterProcedureOccurrences<Input>(
  scopeRef: BattleCharacterExecutionScopeRef,
  nextProcedureOrdinal: BattleProcedureExecutionCursor,
  inputs: readonly Input[],
  procedureFor: (input: Input) => CharacterProcedureWithoutRef,
): {
  readonly nextProcedureOrdinal: BattleProcedureExecutionCursor;
  readonly occurrences: readonly {
    readonly input: Input;
    readonly binding: CharacterProcedureBinding;
  }[];
  readonly procedureBindings: readonly CharacterProcedureBinding[];
} {
  let cursor = nextProcedureOrdinal;
  const occurrences = inputs.map((input) => {
    const procedureRef = battleProcedureExecutionRef(
      scopeRef,
      NonNegativeInteger(cursor),
    );
    cursor = battleProcedureExecutionCursor(cursor + 1);
    return {
      input,
      binding: {
        procedureRef,
        ...procedureFor(input),
      } satisfies CharacterProcedureBinding,
    };
  });
  return {
    nextProcedureOrdinal: cursor,
    occurrences,
    procedureBindings: occurrences.map(({ binding }) => binding),
  };
}

export function characterExecutionWithSpellInvocations(
  execution: CharacterExecutionState,
  invocations: readonly SupportedSpellInvocation[],
  context: SpellProcedureExecutionContext = EMPTY_SPELL_PROCEDURE_EXECUTION_CONTEXT,
): CharacterExecutionState {
  let refreshed = false;
  const remainingInvocations = [...invocations];
  const invocationByProcedureRef = new Map<
    BattleProcedureExecutionRef,
    SupportedSpellInvocation
  >();
  const reservedSelectedInvocationIndexes = new Set<number>();
  const selectedProcedureRef = (
    invocation: SupportedSpellInvocation,
  ): BattleProcedureExecutionRef | undefined => {
    if (!("sourceProcedureRef" in invocation)) return undefined;
    return Schema.is(BattleProcedureExecutionRefSchema)(
      invocation.sourceProcedureRef,
    )
      ? invocation.sourceProcedureRef
      : undefined;
  };
  remainingInvocations.forEach((invocation, invocationIndex) => {
    const procedureRef = selectedProcedureRef(invocation);
    if (
      procedureRef === undefined ||
      invocationByProcedureRef.has(procedureRef)
    ) {
      return;
    }
    const binding = execution.procedureBindings.find(
      (candidate) => candidate.procedureRef === procedureRef,
    );
    if (
      (binding?.procedure.kind !== "spellInvocation" &&
        binding?.procedure.kind !== "unavailableSpellInvocation") ||
      !spellInvocationMatchesExecution(
        invocation,
        binding.procedure.execution,
        context,
      )
    ) {
      return;
    }
    invocationByProcedureRef.set(procedureRef, invocation);
    reservedSelectedInvocationIndexes.add(invocationIndex);
  });
  for (let index = remainingInvocations.length - 1; index >= 0; index -= 1) {
    if (reservedSelectedInvocationIndexes.has(index)) {
      remainingInvocations.splice(index, 1);
    }
  }
  const reserveMatchingInvocation = (binding: CharacterProcedureBinding) => {
    if (
      binding.procedure.kind !== "spellInvocation" &&
      binding.procedure.kind !== "unavailableSpellInvocation"
    ) {
      return;
    }
    if (invocationByProcedureRef.has(binding.procedureRef)) return;
    const storedExecution = binding.procedure.execution;
    const currentInvocationIndex = remainingInvocations.findIndex(
      (invocation) =>
        spellInvocationMatchesExecution(invocation, storedExecution, context),
    );
    if (currentInvocationIndex < 0) return;
    const [currentInvocation] = remainingInvocations.splice(
      currentInvocationIndex,
      1,
    );
    if (currentInvocation !== undefined) {
      invocationByProcedureRef.set(binding.procedureRef, currentInvocation);
    }
  };
  // Live occurrences retain their refs first. Only genuinely new occurrences
  // are then available to restore an unavailable binding.
  execution.procedureBindings.forEach((binding) => {
    if (binding.procedure.kind === "spellInvocation") {
      reserveMatchingInvocation(binding);
    }
  });
  execution.procedureBindings.forEach((binding) => {
    if (binding.procedure.kind === "unavailableSpellInvocation") {
      reserveMatchingInvocation(binding);
    }
  });

  const refreshedBindings = execution.procedureBindings.map(
    (binding): CharacterProcedureBinding => {
      if (
        binding.procedure.kind !== "spellInvocation" &&
        binding.procedure.kind !== "unavailableSpellInvocation"
      ) {
        return binding;
      }
      const currentInvocation = invocationByProcedureRef.get(
        binding.procedureRef,
      );
      if (currentInvocation === undefined) {
        if (binding.procedure.kind === "unavailableSpellInvocation") {
          return binding;
        }
        refreshed = true;
        return {
          ...binding,
          procedure: {
            kind: "unavailableSpellInvocation",
            execution: binding.procedure.execution,
          },
        };
      }
      const currentExecution = spellProcedureExecution(
        currentInvocation,
        context,
      );
      if (currentExecution === undefined) {
        return binding.procedure.kind === "unavailableSpellInvocation"
          ? binding
          : {
              ...binding,
              procedure: {
                kind: "unavailableSpellInvocation",
                execution: binding.procedure.execution,
              },
            };
      }
      if (
        binding.procedure.kind === "spellInvocation" &&
        sameSpellProcedureExecution(
          binding.procedure.execution,
          currentExecution,
        )
      ) {
        return binding;
      }
      refreshed = true;
      return {
        ...binding,
        procedure: {
          kind: "spellInvocation",
          execution: currentExecution,
        },
      };
    },
  );
  const newInvocations = remainingInvocations;
  const allocated = allocateCharacterProcedureBindings(
    execution.scopeRef,
    execution.nextProcedureOrdinal,
    newInvocations.flatMap((invocation): CharacterProcedureWithoutRef[] => {
      const spellExecution = spellProcedureExecution(invocation, context);
      return spellExecution === undefined
        ? []
        : [
            {
              procedure: {
                kind: "spellInvocation",
                execution: spellExecution,
              },
            },
          ];
    }),
  );
  const spellBindings = allocated.procedureBindings;
  if (spellBindings.length === 0 && !refreshed) return execution;
  return CharacterExecutionState({
    scopeRef: execution.scopeRef,
    nextProcedureOrdinal: allocated.nextProcedureOrdinal,
    procedureBindings: [...refreshedBindings, ...spellBindings],
  });
}

export function characterExecutionWithSpiritualWeaponRepeatAttack(
  execution: CharacterExecutionState,
  repeatExecution: SpiritualWeaponRepeatAttackSpellProcedureExecution,
): CharacterExecutionState {
  const alreadyBound = execution.procedureBindings.some(
    (binding) =>
      binding.procedure.kind === "spellInvocation" &&
      binding.procedure.execution.procedure === "spiritualWeaponRepeatAttack" &&
      binding.procedure.execution.activeEffectRef ===
        repeatExecution.activeEffectRef &&
      binding.procedure.execution.activeEffectSourceProcedureRef ===
        repeatExecution.activeEffectSourceProcedureRef,
  );
  if (alreadyBound) return execution;
  const allocated = allocateCharacterProcedureBindings(
    execution.scopeRef,
    execution.nextProcedureOrdinal,
    [
      {
        procedure: {
          kind: "spellInvocation",
          execution: repeatExecution,
        },
      },
    ],
  );
  return CharacterExecutionState({
    scopeRef: execution.scopeRef,
    nextProcedureOrdinal: allocated.nextProcedureOrdinal,
    procedureBindings: [
      ...execution.procedureBindings,
      ...allocated.procedureBindings,
    ],
  });
}

export function characterExecutionWithHeldLightHurl(
  execution: CharacterExecutionState,
  hurlExecution: HeldLightHurlSpellProcedureExecution,
): CharacterExecutionState {
  const alreadyBound = execution.procedureBindings.some(
    (binding) =>
      binding.procedure.kind === "spellInvocation" &&
      binding.procedure.execution.procedure === "heldLightHurl" &&
      binding.procedure.execution.sourceEffectRef ===
        hurlExecution.sourceEffectRef &&
      binding.procedure.execution.sourceHeldLightProcedureRef ===
        hurlExecution.sourceHeldLightProcedureRef,
  );
  if (alreadyBound) return execution;
  const allocated = allocateCharacterProcedureBindings(
    execution.scopeRef,
    execution.nextProcedureOrdinal,
    [
      {
        procedure: {
          kind: "spellInvocation",
          execution: hurlExecution,
        },
      },
    ],
  );
  return CharacterExecutionState({
    scopeRef: execution.scopeRef,
    nextProcedureOrdinal: allocated.nextProcedureOrdinal,
    procedureBindings: [
      ...execution.procedureBindings,
      ...allocated.procedureBindings,
    ],
  });
}

export function characterExecutionWithDancingLightsReposition(
  execution: CharacterExecutionState,
  repositionExecution: DancingLightsRepositionSpellProcedureExecution,
): CharacterExecutionState {
  return characterExecutionWithDynamicSpellProcedures(execution, [
    repositionExecution,
  ]);
}

export function characterExecutionWithSpellCreatedHeldObjectProcedures(
  execution: CharacterExecutionState,
  procedures: readonly [
    SpellCreatedHeldObjectAttackSpellProcedureExecution,
    SpellCreatedHeldObjectReEvokeSpellProcedureExecution,
  ],
): CharacterExecutionState {
  return characterExecutionWithDynamicSpellProcedures(execution, procedures);
}

function characterExecutionWithDynamicSpellProcedures(
  execution: CharacterExecutionState,
  procedures: readonly (
    | DancingLightsRepositionSpellProcedureExecution
    | SpellCreatedHeldObjectAttackSpellProcedureExecution
    | SpellCreatedHeldObjectReEvokeSpellProcedureExecution
  )[],
): CharacterExecutionState {
  const unbound = procedures.filter(
    (procedure) =>
      !execution.procedureBindings.some(
        (binding) =>
          binding.procedure.kind === "spellInvocation" &&
          sameSpellProcedureExecution(binding.procedure.execution, procedure),
      ),
  );
  if (unbound.length === 0) return execution;
  const allocated = allocateCharacterProcedureBindings(
    execution.scopeRef,
    execution.nextProcedureOrdinal,
    unbound.map(
      (procedure): CharacterProcedureWithoutRef => ({
        procedure: { kind: "spellInvocation", execution: procedure },
      }),
    ),
  );
  return CharacterExecutionState({
    scopeRef: execution.scopeRef,
    nextProcedureOrdinal: allocated.nextProcedureOrdinal,
    procedureBindings: [
      ...execution.procedureBindings,
      ...allocated.procedureBindings,
    ],
  });
}

export function characterExecutionWithMarkedDamageRiderTransfer(
  execution: CharacterExecutionState,
  transferExecution: MarkedDamageRiderTransferSpellProcedureExecution,
): CharacterExecutionState {
  const alreadyBound = execution.procedureBindings.some(
    (binding) =>
      binding.procedure.kind === "spellInvocation" &&
      binding.procedure.execution.procedure === "markedDamageRider" &&
      binding.procedure.execution.action === "transfer" &&
      binding.procedure.execution.activeEffectRef ===
        transferExecution.activeEffectRef &&
      binding.procedure.execution.activeEffectSourceProcedureRef ===
        transferExecution.activeEffectSourceProcedureRef,
  );
  if (alreadyBound) return execution;
  const allocated = allocateCharacterProcedureBindings(
    execution.scopeRef,
    execution.nextProcedureOrdinal,
    [
      {
        procedure: {
          kind: "spellInvocation",
          execution: transferExecution,
        },
      },
    ],
  );
  return CharacterExecutionState({
    scopeRef: execution.scopeRef,
    nextProcedureOrdinal: allocated.nextProcedureOrdinal,
    procedureBindings: [
      ...execution.procedureBindings,
      ...allocated.procedureBindings,
    ],
  });
}

export function characterExecutionWithObjectContactDamageRepeat(
  execution: CharacterExecutionState,
  repeatExecution: ObjectContactDamageRepeatSpellProcedureExecution,
): CharacterExecutionState {
  const alreadyBound = execution.procedureBindings.some(
    (binding) =>
      binding.procedure.kind === "spellInvocation" &&
      binding.procedure.execution.procedure === "objectContactDamageRepeat" &&
      binding.procedure.execution.activeEffectRef ===
        repeatExecution.activeEffectRef &&
      binding.procedure.execution.activeEffectSourceProcedureRef ===
        repeatExecution.activeEffectSourceProcedureRef,
  );
  if (alreadyBound) return execution;
  const allocated = allocateCharacterProcedureBindings(
    execution.scopeRef,
    execution.nextProcedureOrdinal,
    [
      {
        procedure: {
          kind: "spellInvocation",
          execution: repeatExecution,
        },
      },
    ],
  );
  return CharacterExecutionState({
    scopeRef: execution.scopeRef,
    nextProcedureOrdinal: allocated.nextProcedureOrdinal,
    procedureBindings: [
      ...execution.procedureBindings,
      ...allocated.procedureBindings,
    ],
  });
}

function allocateCharacterProcedureBindings(
  scopeRef: BattleCharacterExecutionScopeRef,
  nextProcedureOrdinal: BattleProcedureExecutionCursor,
  procedures: readonly CharacterProcedureWithoutRef[],
): {
  readonly nextProcedureOrdinal: BattleProcedureExecutionCursor;
  readonly procedureBindings: readonly CharacterProcedureBinding[];
} {
  const procedureBindings: CharacterProcedureBinding[] = [];
  let cursor = Number(nextProcedureOrdinal);
  for (const procedure of procedures) {
    procedureBindings.push({
      ...procedure,
      procedureRef: battleProcedureExecutionRef(
        scopeRef,
        NonNegativeInteger(cursor),
      ),
    });
    cursor += 1;
  }
  return {
    nextProcedureOrdinal: battleProcedureExecutionCursor(cursor),
    procedureBindings,
  };
}

export function characterProcedureBindingSnapshots(
  execution: CharacterExecutionState,
  executionFactsFor: (
    invocation: SpellProcedureExecution,
  ) => SpellExecutionFacts,
): readonly CharacterProcedureBindingSnapshot[] {
  return execution.procedureBindings.map(
    (binding): CharacterProcedureBindingSnapshot =>
      Match.value(binding.procedure).pipe(
        Match.when({ kind: "unitFeature" }, (procedure) => ({
          procedureRef: binding.procedureRef,
          procedure: {
            kind: procedure.kind,
            source: procedure.source,
            execution: procedure.execution,
          },
        })),
        Match.when({ kind: "unitSupportProfile" }, (procedure) => ({
          procedureRef: binding.procedureRef,
          procedure: {
            kind: procedure.kind,
            source: procedure.source,
            execution: procedure.execution,
          },
        })),
        Match.when({ kind: "spellInvocation" }, (procedure) => ({
          procedureRef: binding.procedureRef,
          procedure: {
            kind: procedure.kind,
            executionFacts: executionFactsFor(procedure.execution),
          },
        })),
        Match.when({ kind: "unavailableSpellInvocation" }, (procedure) => ({
          procedureRef: binding.procedureRef,
          procedure: { kind: procedure.kind },
        })),
        Match.exhaustive,
      ),
  );
}

export function characterUnitProcedureRef(
  execution: CharacterExecutionState,
  procedure: CharacterUnitProcedureExecution,
  query: CharacterUnitProcedureQuery,
): BattleProcedureExecutionRef | undefined {
  return characterUnitProcedureRefs(execution, procedure, query)[0];
}

export function characterUnitProcedureRefs(
  execution: CharacterExecutionState,
  procedure: CharacterUnitProcedureExecution,
  query: CharacterUnitProcedureQuery,
): readonly BattleProcedureExecutionRef[] {
  return execution.procedureBindings.flatMap((binding) =>
    sameCharacterUnitProcedureExecution(binding.procedure, procedure) &&
    characterUnitProcedureMatchesQuery(binding.procedure, query)
      ? [binding.procedureRef]
      : [],
  );
}

export function characterUnitProcedureRefsForSource(
  execution: CharacterExecutionState,
  source: CharacterUnitProcedureSource,
  query: CharacterUnitProcedureQuery,
): readonly BattleProcedureExecutionRef[] {
  return execution.procedureBindings.flatMap((binding) =>
    (binding.procedure.kind === "unitFeature" ||
      binding.procedure.kind === "unitSupportProfile") &&
    sameCharacterUnitProcedureSource(binding.procedure.source, source) &&
    characterUnitProcedureMatchesQuery(binding.procedure, query)
      ? [binding.procedureRef]
      : [],
  );
}

export function unitSupportProfileKind(
  profile: UnitSupportProcedureExecution,
): UnitSupportProfileKind {
  return typeof profile === "string" ? profile : profile.kind;
}

function characterUnitProcedureSourceForAdmission(
  scopeRef: BattleCharacterExecutionScopeRef,
  resourceUnits: readonly UnitRecord[],
  unitId: UnitRecord["id"],
): CharacterUnitProcedureSource {
  const resourceOrdinal = resourceUnits.findIndex((unit) => unit.id === unitId);
  return resourceOrdinal < 0
    ? { kind: "intrinsic" }
    : {
        kind: "resourcePool",
        resourcePoolRef: battleResourcePoolExecutionRef(
          scopeRef,
          NonNegativeInteger(resourceOrdinal),
        ),
      };
}

export function characterUnitProcedureSourceForUnit(
  resources: readonly {
    readonly unit: Pick<UnitRecord, "id">;
    readonly resourcePoolRef: BattleResourcePoolExecutionRef;
  }[],
  unitId: UnitRecord["id"],
): CharacterUnitProcedureSource {
  const resource = resources.find((candidate) => candidate.unit.id === unitId);
  return resource === undefined
    ? { kind: "intrinsic" }
    : { kind: "resourcePool", resourcePoolRef: resource.resourcePoolRef };
}

export function characterUnitProcedure(
  execution: CharacterExecutionState,
  procedureRef: BattleProcedureExecutionRef,
  query: CharacterUnitProcedureQuery,
): CharacterUnitProcedureExecution | undefined {
  const binding = execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === procedureRef,
  );
  return binding !== undefined &&
    characterUnitProcedureMatchesQuery(binding.procedure, query)
    ? binding.procedure
    : undefined;
}

function characterUnitProcedureMatchesQuery(
  procedure: CharacterProcedureBinding["procedure"],
  query: CharacterUnitProcedureQuery,
): procedure is CharacterUnitProcedureExecution {
  return Match.value(query).pipe(
    Match.discriminatorsExhaustive("kind")({
      unitFeatureOrSupportProfile: () =>
        procedure.kind === "unitFeature" ||
        procedure.kind === "unitSupportProfile",
      unitFeatureOrSupportProfileKinds: ({ featureKinds, supportKinds }) =>
        (procedure.kind === "unitFeature" &&
          featureKinds.has(procedure.execution.kind)) ||
        (procedure.kind === "unitSupportProfile" &&
          supportKinds.has(unitSupportProfileKind(procedure.execution))),
      unitFeature: ({ featureKinds }) =>
        procedure.kind === "unitFeature" &&
        featureKinds.has(procedure.execution.kind),
      unitSupportProfile: ({ supportKinds }) =>
        procedure.kind === "unitSupportProfile" &&
        supportKinds.has(unitSupportProfileKind(procedure.execution)),
    }),
  );
}

function sameCharacterUnitProcedureExecution(
  left: CharacterProcedureBinding["procedure"],
  right: CharacterUnitProcedureExecution,
): boolean {
  return Match.value(right).pipe(
    Match.discriminatorsExhaustive("kind")({
      unitFeature: (expected) =>
        left.kind === "unitFeature" &&
        sameCharacterUnitProcedureSource(left.source, expected.source) &&
        sameUnitFeatureProcedureExecution(left.execution, expected.execution),
      unitSupportProfile: (expected) =>
        left.kind === "unitSupportProfile" &&
        sameCharacterUnitProcedureSource(left.source, expected.source) &&
        sameUnitSupportProcedureExecution(left.execution, expected.execution),
    }),
  );
}

function sameCharacterUnitProcedureSource(
  left: CharacterUnitProcedureSource,
  right: CharacterUnitProcedureSource,
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      intrinsic: () => right.kind === "intrinsic",
      resourcePool: ({ resourcePoolRef }) =>
        right.kind === "resourcePool" &&
        right.resourcePoolRef === resourcePoolRef,
    }),
  );
}

type OngoingFeatureExecution = Extract<
  UnitFeatureProcedureExecution,
  { readonly kind: "ongoingFeature" }
>;
type OngoingFeatureLifecycle = OngoingFeatureExecution["lifecycle"];
type OngoingFeatureRollModifier =
  OngoingFeatureExecution["rollModifiers"][number];
type OngoingFeatureSpellModifier =
  OngoingFeatureExecution["spellModifiers"][number];
type OngoingFeatureDamageModifier =
  OngoingFeatureExecution["damageModifiers"][number];

function sameOngoingFeatureLifecycle(
  left: OngoingFeatureLifecycle,
  right: OngoingFeatureLifecycle,
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      turnBoundary: (value) =>
        right.kind === "turnBoundary" &&
        value.initialExpiration === right.initialExpiration &&
        samePrimitiveMultiset(
          value.earlyEndConditions,
          right.earlyEndConditions,
        ) &&
        samePrimitiveMultiset(
          value.earlyEndArmorCategories,
          right.earlyEndArmorCategories,
        ) &&
        samePrimitiveMultiset(value.extensionTriggers, right.extensionTriggers),
      roundExtended: (value) =>
        right.kind === "roundExtended" &&
        value.initialExpiration === right.initialExpiration &&
        value.maximumDurationRounds === right.maximumDurationRounds &&
        samePrimitiveMultiset(
          value.earlyEndConditions,
          right.earlyEndConditions,
        ) &&
        samePrimitiveMultiset(
          value.earlyEndArmorCategories,
          right.earlyEndArmorCategories,
        ) &&
        samePrimitiveMultiset(value.extensionTriggers, right.extensionTriggers),
      fixedDuration: (value) =>
        right.kind === "fixedDuration" &&
        value.maximumDurationRounds === right.maximumDurationRounds &&
        samePrimitiveMultiset(
          value.earlyEndConditions,
          right.earlyEndConditions,
        ) &&
        samePrimitiveMultiset(
          value.earlyEndArmorCategories,
          right.earlyEndArmorCategories,
        ) &&
        samePrimitiveMultiset(value.extensionTriggers, right.extensionTriggers),
    }),
  );
}

function sameOptionalPrimitiveMultiset<Value extends MechanicalPrimitive>(
  left: readonly Value[] | undefined,
  right: readonly Value[] | undefined,
): boolean {
  return left === undefined || right === undefined
    ? left === right
    : samePrimitiveMultiset(left, right);
}

function sameOngoingFeatureRollModifier(
  left: OngoingFeatureRollModifier,
  right: OngoingFeatureRollModifier,
): boolean {
  return (
    left.mode === right.mode &&
    left.affects === right.affects &&
    left.on === right.on &&
    sameOptionalPrimitiveMultiset(left.abilityFilter, right.abilityFilter)
  );
}

function sameOngoingFeatureSpellModifier(
  left: OngoingFeatureSpellModifier,
  right: OngoingFeatureSpellModifier,
): boolean {
  return (
    left.sourceClassName === right.sourceClassName &&
    left.saveDcBonus === right.saveDcBonus &&
    left.attackRollMode === right.attackRollMode
  );
}

function sameOngoingFeatureDamageModifier(
  left: OngoingFeatureDamageModifier,
  right: OngoingFeatureDamageModifier,
): boolean {
  return (
    left.amount === right.amount &&
    left.weaponUsageFilter === right.weaponUsageFilter &&
    sameOptionalPrimitiveMultiset(left.abilityFilter, right.abilityFilter)
  );
}

function sameOngoingFeatureExecution(
  left: OngoingFeatureExecution,
  right: OngoingFeatureExecution,
): boolean {
  return (
    left.activationTrigger === right.activationTrigger &&
    left.spendsUse === right.spendsUse &&
    left.concentrationEffect === right.concentrationEffect &&
    sameOngoingFeatureLifecycle(left.lifecycle, right.lifecycle) &&
    samePrimitiveMultiset(left.actionRestrictions, right.actionRestrictions) &&
    sameMultisetBy(
      left.rollModifiers,
      right.rollModifiers,
      sameOngoingFeatureRollModifier,
    ) &&
    sameMultisetBy(
      left.spellModifiers,
      right.spellModifiers,
      sameOngoingFeatureSpellModifier,
    ) &&
    sameMultisetBy(
      left.damageModifiers,
      right.damageModifiers,
      sameOngoingFeatureDamageModifier,
    ) &&
    samePrimitiveMultiset(left.resistances, right.resistances)
  );
}

type OptionalAttackDamageRiderExecution = Extract<
  UnitFeatureProcedureExecution,
  { readonly kind: "attackDamageRider"; readonly optional: true }
>;

function sameLevelThresholdDiceTable(
  left: OptionalAttackDamageRiderExecution["dice"]["diceByLevel"],
  right: OptionalAttackDamageRiderExecution["dice"]["diceByLevel"],
): boolean {
  const hasDuplicateLevel = (
    table: OptionalAttackDamageRiderExecution["dice"]["diceByLevel"],
  ): boolean =>
    table.some(
      (entry, index) =>
        table.findIndex((candidate) => candidate.atLevel === entry.atLevel) !==
        index,
    );
  return (
    left.length === right.length &&
    !hasDuplicateLevel(left) &&
    !hasDuplicateLevel(right) &&
    left.every((entry) =>
      right.some(
        (candidate) =>
          candidate.atLevel === entry.atLevel &&
          candidate.count === entry.count,
      ),
    )
  );
}

type ReactionReductionExecution = Extract<
  UnitFeatureProcedureExecution,
  { readonly kind: "reactionRollOrDamageReduction" }
>;
type ReactionReductionModifier =
  ReactionReductionExecution["modifiers"][number];

function sameMechanicalResourceSpend(
  left: {
    readonly resourcePoolRef: BattleResourcePoolExecutionRef;
    readonly amount?: 1;
  },
  right: {
    readonly resourcePoolRef: BattleResourcePoolExecutionRef;
    readonly amount?: 1;
  },
): boolean {
  return (
    left.resourcePoolRef === right.resourcePoolRef &&
    left.amount === right.amount
  );
}

function sameReactionReductionModifier(
  left: ReactionReductionModifier,
  right: ReactionReductionModifier,
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      attackRollReduction: (value) =>
        right.kind === "attackRollReduction" &&
        value.rangeFeet === right.rangeFeet &&
        value.requiresVisibleCreature === right.requiresVisibleCreature &&
        value.reduction.dieSize === right.reduction.dieSize &&
        sameMechanicalResourceSpend(
          value.reduction.spends,
          right.reduction.spends,
        ),
      abilityCheckReduction: (value) =>
        right.kind === "abilityCheckReduction" &&
        value.rangeFeet === right.rangeFeet &&
        value.requiresVisibleCreature === right.requiresVisibleCreature &&
        value.reduction.dieSize === right.reduction.dieSize &&
        sameMechanicalResourceSpend(
          value.reduction.spends,
          right.reduction.spends,
        ),
      attackDamageRollReduction: (value) =>
        right.kind === "attackDamageRollReduction" &&
        value.rangeFeet === right.rangeFeet &&
        value.requiresVisibleCreature === right.requiresVisibleCreature &&
        value.reduction.dieSize === right.reduction.dieSize &&
        sameMechanicalResourceSpend(
          value.reduction.spends,
          right.reduction.spends,
        ),
      attackDamageReduction: (value) => {
        if (right.kind !== "attackDamageReduction") return false;
        if (
          value.requiresVisibleAttacker !== right.requiresVisibleAttacker ||
          !sameOptionalPrimitiveMultiset(
            value.damageIncludes,
            right.damageIncludes,
          ) ||
          value.reduction.kind !== right.reduction.kind
        ) {
          return false;
        }
        if (
          value.reduction.kind === "dicePlusAbilityModifierPlusClassLevel" &&
          (right.reduction.kind !== value.reduction.kind ||
            value.reduction.dieSize !== right.reduction.dieSize ||
            value.reduction.ability !== right.reduction.ability)
        ) {
          return false;
        }
        const leftRedirect =
          "zeroDamageRedirect" in value ? value.zeroDamageRedirect : undefined;
        const rightRedirect =
          "zeroDamageRedirect" in right ? right.zeroDamageRedirect : undefined;
        return leftRedirect === undefined || rightRedirect === undefined
          ? leftRedirect === rightRedirect
          : leftRedirect.damage.dice.dieSize ===
              rightRedirect.damage.dice.dieSize &&
              sameMechanicalResourceSpend(
                leftRedirect.spends,
                rightRedirect.spends,
              );
      },
      fallDamageReduction: (value) =>
        right.kind === "fallDamageReduction" &&
        value.reduction.multiplier === right.reduction.multiplier,
    }),
  );
}

type PassiveSpeedFacts = Extract<
  UnitSupportProcedureExecution,
  { readonly kind: "passiveSpeedBonus" }
>;

function samePassiveSpeedFacts(
  left: Pick<PassiveSpeedFacts, "deltaFeet" | "condition">,
  right: Pick<PassiveSpeedFacts, "deltaFeet" | "condition">,
): boolean {
  return (
    left.deltaFeet === right.deltaFeet &&
    left.condition.kind === right.condition.kind &&
    (left.condition.kind !== "notWearingArmor" ||
      (right.condition.kind === "notWearingArmor" &&
        samePrimitiveSet(
          left.condition.categories,
          right.condition.categories,
        )))
  );
}

type UnitFeatureSpeedKindGrants = Extract<
  UnitFeatureProcedureExecution,
  { readonly kind: "passiveSpeedKindGrants" }
>["speedKindGrants"];
type UnitSupportSpeedKindGrants = Extract<
  UnitSupportProcedureExecution,
  { readonly kind: "passiveSpeedKindGrants" }
>;
type UnitSpeedKindGrants =
  | UnitFeatureSpeedKindGrants
  | Pick<UnitSupportSpeedKindGrants, "speed" | "grants">;

function sameSpeedKindGrant(
  left: UnitSpeedKindGrants["grants"][number],
  right: UnitSpeedKindGrants["grants"][number],
): boolean {
  return (
    left.speedKind === right.speedKind && left.feet.kind === right.feet.kind
  );
}

function samePassiveSpeedKindGrants(
  left: UnitSpeedKindGrants,
  right: UnitSpeedKindGrants,
): boolean {
  const sameSpeed =
    left.speed === undefined || right.speed === undefined
      ? left.speed === right.speed
      : samePassiveSpeedFacts(left.speed, right.speed);
  return (
    sameSpeed &&
    sameSetByKey(
      left.grants,
      right.grants,
      (grant) => grant.speedKind,
      sameSpeedKindGrant,
    )
  );
}

type UnitDruidWildShapeExecution =
  | Extract<
      UnitFeatureProcedureExecution,
      { readonly kind: "druidWildShapeKnownForm" }
    >
  | Extract<
      UnitSupportProcedureExecution,
      { readonly kind: "druidWildShapeKnownForm" }
    >;

function sameDruidWildShapeKnownForm(
  left: UnitDruidWildShapeExecution,
  right: UnitDruidWildShapeExecution,
): boolean {
  return (
    left.classLevel === right.classLevel &&
    left.knownFormRoster.creatureType === right.knownFormRoster.creatureType &&
    left.knownFormRoster.count === right.knownFormRoster.count &&
    left.knownFormRoster.maxChallengeRating ===
      right.knownFormRoster.maxChallengeRating &&
    left.knownFormRoster.flySpeed === right.knownFormRoster.flySpeed
  );
}

type UnitMagicActionHealingPoolExecution =
  | Extract<
      UnitFeatureProcedureExecution,
      { readonly kind: "magicActionHealingPool" }
    >
  | Extract<
      UnitSupportProcedureExecution,
      { readonly kind: "magicActionHealingPool" }
    >;

function sameMagicActionHealingPool(
  left: UnitMagicActionHealingPoolExecution,
  right: UnitMagicActionHealingPoolExecution,
): boolean {
  return (
    left.className === right.className &&
    left.healingPool.rangeFeet === right.healingPool.rangeFeet &&
    left.healingPool.pool.multiplier === right.healingPool.pool.multiplier &&
    samePrimitiveSet(
      left.healingPool.targetSelection.targetKinds,
      right.healingPool.targetSelection.targetKinds,
    ) &&
    samePrimitiveSet(
      left.healingPool.targetSelection.stateFilter,
      right.healingPool.targetSelection.stateFilter,
    ) &&
    sameMechanicalResourceSpend(
      left.healingPool.spends,
      right.healingPool.spends,
    )
  );
}

type UnitMagicActionAreaSaveDamageHealingExecution =
  | Extract<
      UnitFeatureProcedureExecution,
      { readonly kind: "magicActionAreaSaveDamageHealing" }
    >
  | Extract<
      UnitSupportProcedureExecution,
      { readonly kind: "magicActionAreaSaveDamageHealing" }
    >;

function sameMagicActionAreaSaveDamageHealing(
  left: UnitMagicActionAreaSaveDamageHealingExecution,
  right: UnitMagicActionAreaSaveDamageHealingExecution,
): boolean {
  return (
    left.damageHealing.area.origin.rangeFeet ===
      right.damageHealing.area.origin.rangeFeet &&
    left.damageHealing.area.shape.radiusFeet ===
      right.damageHealing.area.shape.radiusFeet &&
    left.damageHealing.damage.amount.expr.dice ===
      right.damageHealing.damage.amount.expr.dice &&
    left.damageHealing.healing.amount.expr.dice ===
      right.damageHealing.healing.amount.expr.dice &&
    sameMechanicalResourceSpend(
      left.damageHealing.spends,
      right.damageHealing.spends,
    )
  );
}

type UnitMagicActionSaveGatedConditionExecution =
  | Extract<
      UnitFeatureProcedureExecution,
      { readonly kind: "magicActionSaveGatedCondition" }
    >
  | Extract<
      UnitSupportProcedureExecution,
      { readonly kind: "magicActionSaveGatedCondition" }
    >;

function sameMagicActionSaveGatedCondition(
  left: UnitMagicActionSaveGatedConditionExecution,
  right: UnitMagicActionSaveGatedConditionExecution,
): boolean {
  return (
    left.condition.targetSelection.rangeFeet ===
      right.condition.targetSelection.rangeFeet &&
    left.condition.onFail.durationTicks ===
      right.condition.onFail.durationTicks &&
    sameMechanicalResourceSpend(left.condition.spends, right.condition.spends)
  );
}

type UnitOpenHandTechniqueExecution =
  | Extract<
      UnitFeatureProcedureExecution,
      { readonly kind: "openHandTechnique" }
    >
  | Extract<
      UnitSupportProcedureExecution,
      { readonly kind: "openHandTechnique" }
    >;

function sameOpenHandTechnique(
  left: UnitOpenHandTechniqueExecution,
  right: UnitOpenHandTechniqueExecution,
): boolean {
  return (
    left.technique.trigger.resourcePoolRef ===
      right.technique.trigger.resourcePoolRef &&
    left.technique.effects.pushAwayOnFailedSave.distanceFeet ===
      right.technique.effects.pushAwayOnFailedSave.distanceFeet
  );
}

type UnitPaladinSacredWeaponExecution =
  | Extract<
      UnitFeatureProcedureExecution,
      { readonly kind: "paladinSacredWeapon" }
    >
  | Extract<
      UnitSupportProcedureExecution,
      { readonly kind: "paladinSacredWeapon" }
    >;

function samePaladinSacredWeapon(
  left: UnitPaladinSacredWeaponExecution,
  right: UnitPaladinSacredWeaponExecution,
): boolean {
  return (
    left.sacredWeapon.light.brightRadiusFeet ===
      right.sacredWeapon.light.brightRadiusFeet &&
    left.sacredWeapon.light.dimAdditionalFeet ===
      right.sacredWeapon.light.dimAdditionalFeet &&
    samePrimitiveSet(
      left.sacredWeapon.duration.endsOn,
      right.sacredWeapon.duration.endsOn,
    ) &&
    samePrimitiveSet(
      left.sacredWeapon.hitDamageTypeChoice,
      right.sacredWeapon.hitDamageTypeChoice,
    ) &&
    sameMechanicalResourceSpend(
      left.sacredWeapon.spends,
      right.sacredWeapon.spends,
    )
  );
}

type UnitCunningStrikeExecution = Extract<
  UnitSupportProcedureExecution,
  { readonly kind: "cunningStrike" }
>;
type UnitCunningStrikeOption =
  UnitCunningStrikeExecution["cunningStrike"]["options"][number];

function sameCunningStrikeOptionEffect(
  left: UnitCunningStrikeOption["effect"],
  right: UnitCunningStrikeOption["effect"],
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      equipmentGatedConditionSave: (value) =>
        right.kind === "equipmentGatedConditionSave" &&
        value.onFail.durationTicks === right.onFail.durationTicks,
      sizeGatedConditionSave: () => right.kind === "sizeGatedConditionSave",
      postDamageMovement: () => right.kind === "postDamageMovement",
      hideInvisibleEndSuppression: (value) =>
        right.kind === "hideInvisibleEndSuppression" &&
        samePrimitiveSet(
          value.ifTurnEndsBehindCover,
          right.ifTurnEndsBehindCover,
        ),
    }),
  );
}

function sameCunningStrikeOption(
  left: UnitCunningStrikeOption,
  right: UnitCunningStrikeOption,
): boolean {
  return (
    left.selectionId === right.selectionId &&
    sameCunningStrikeOptionEffect(left.effect, right.effect)
  );
}

function sameCunningStrikeOptions(
  left: readonly UnitCunningStrikeOption[],
  right: readonly UnitCunningStrikeOption[],
): boolean {
  return sameSetByKey(
    left,
    right,
    (option) => option.selectionId,
    sameCunningStrikeOption,
  );
}

function sameUnitSupportProcedureExecution(
  left: UnitSupportProcedureExecution,
  right: UnitSupportProcedureExecution,
): boolean {
  if (typeof left === "string" || typeof right === "string") {
    return left === right;
  }
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      alternateActionCost: (value) =>
        right.kind === "alternateActionCost" &&
        samePrimitiveSet(value.from.actions, right.from.actions),
      bonusActionDelegatedStandardActions: () =>
        right.kind === "bonusActionDelegatedStandardActions",
      passiveRangedAttackRollBonus: () =>
        right.kind === "passiveRangedAttackRollBonus",
      initiativeProficiencyAndSwap: () =>
        right.kind === "initiativeProficiencyAndSwap",
      attackRollMissToHitReplacement: () =>
        right.kind === "attackRollMissToHitReplacement",
      attackActionAreaSaveDamageReplacement: (value) =>
        right.kind === "attackActionAreaSaveDamageReplacement" &&
        value.breath.area.shapeChoice[0].lengthFeet ===
          right.breath.area.shapeChoice[0].lengthFeet &&
        value.breath.area.shapeChoice[1].lengthFeet ===
          right.breath.area.shapeChoice[1].lengthFeet &&
        value.breath.area.shapeChoice[1].widthFeet ===
          right.breath.area.shapeChoice[1].widthFeet &&
        value.breath.damage.damageType.value ===
          right.breath.damage.damageType.value,
      d20TestNaturalOneReroll: () => right.kind === "d20TestNaturalOneReroll",
      passiveSavingThrowRollMode: (value) =>
        right.kind === "passiveSavingThrowRollMode" &&
        value.savingThrow.scope.kind === right.savingThrow.scope.kind &&
        (value.savingThrow.scope.kind === "condition"
          ? right.savingThrow.scope.kind === "condition" &&
            value.savingThrow.scope.condition ===
              right.savingThrow.scope.condition
          : right.savingThrow.scope.kind === "savingThrowAbility" &&
            value.savingThrow.scope.ability ===
              right.savingThrow.scope.ability),
      passiveAbilityCheckRollMode: () =>
        right.kind === "passiveAbilityCheckRollMode",
      passiveDamageResistance: (value) =>
        right.kind === "passiveDamageResistance" &&
        value.resistance.damageType.kind === right.resistance.damageType.kind &&
        value.resistance.damageType.value === right.resistance.damageType.value,
      passiveSpeedBonus: (value) =>
        right.kind === "passiveSpeedBonus" &&
        samePassiveSpeedFacts(value, right),
      passiveSpeedKindGrants: (value) =>
        right.kind === "passiveSpeedKindGrants" &&
        samePassiveSpeedKindGrants(value, right),
      acrobaticMovement: () => right.kind === "acrobaticMovement",
      creatureSpaceMovementPermission: () =>
        right.kind === "creatureSpaceMovementPermission",
      hideActionObscurementPermission: () =>
        right.kind === "hideActionObscurementPermission",
      attackActionAttackCountScaling: (value) =>
        right.kind === "attackActionAttackCountScaling" &&
        value.additionalAttacks === right.additionalAttacks,
      bonusActionDashTemporaryHitPoints: () =>
        right.kind === "bonusActionDashTemporaryHitPoints",
      spellSlotHealingModifier: () => right.kind === "spellSlotHealingModifier",
      enemyZeroHitPointTemporaryHitPoints: (value) =>
        right.kind === "enemyZeroHitPointTemporaryHitPoints" &&
        value.className === right.className &&
        value.temporaryHitPoints.trigger.byOtherWithinFeet ===
          right.temporaryHitPoints.trigger.byOtherWithinFeet,
      druidWildShapeKnownForm: (value) =>
        right.kind === "druidWildShapeKnownForm" &&
        sameDruidWildShapeKnownForm(value, right),
      remarkableAthlete: () => right.kind === "remarkableAthlete",
      huntersPrey: (value) =>
        right.kind === "huntersPrey" &&
        value.huntersPrey.kind === right.huntersPrey.kind &&
        (value.huntersPrey.kind === "woundedTargetWeaponDamage"
          ? right.huntersPrey.kind === "woundedTargetWeaponDamage"
          : right.huntersPrey.kind ===
              "nearbyDifferentTargetSameWeaponAttack" &&
            value.huntersPrey.extraAttack.target.withinFeetOfOriginalTarget ===
              right.huntersPrey.extraAttack.target.withinFeetOfOriginalTarget),
      rogueSteadyAim: () => right.kind === "rogueSteadyAim",
      potentCantrip: () => right.kind === "potentCantrip",
      grappler: () => right.kind === "grappler",
      brutalStrike: (value) =>
        right.kind === "brutalStrike" &&
        value.brutalStrike.options[0].pushFeet ===
          right.brutalStrike.options[0].pushFeet &&
        value.brutalStrike.options[1].deltaFeet ===
          right.brutalStrike.options[1].deltaFeet,
      retaliationReactionAttack: () =>
        right.kind === "retaliationReactionAttack",
      tacticalMasterReplacement: (value) =>
        right.kind === "tacticalMasterReplacement" &&
        samePrimitiveSet(
          value.replacementProperties,
          right.replacementProperties,
        ),
      lightExtraAttackDamageAbilityModifier: () =>
        right.kind === "lightExtraAttackDamageAbilityModifier",
      monkFocusBattleOptions: () => right.kind === "monkFocusBattleOptions",
      failedAbilityCheckResourceBoost: (value) =>
        right.kind === "failedAbilityCheckResourceBoost" &&
        sameMechanicalResourceSpend(
          value.abilityCheck.spends,
          right.abilityCheck.spends,
        ),
      failedSavingThrowReroll: (value) =>
        right.kind === "failedSavingThrowReroll" &&
        sameMechanicalResourceSpend(
          value.savingThrow.spends,
          right.savingThrow.spends,
        ),
      magicActionHealingPool: (value) =>
        right.kind === "magicActionHealingPool" &&
        sameMagicActionHealingPool(value, right),
      magicActionAreaSaveDamageHealing: (value) =>
        right.kind === "magicActionAreaSaveDamageHealing" &&
        sameMagicActionAreaSaveDamageHealing(value, right),
      magicActionSaveGatedCondition: (value) =>
        right.kind === "magicActionSaveGatedCondition" &&
        sameMagicActionSaveGatedCondition(value, right),
      openHandTechnique: (value) =>
        right.kind === "openHandTechnique" &&
        sameOpenHandTechnique(value, right),
      stunningStrike: (value) =>
        right.kind === "stunningStrike" &&
        sameMechanicalResourceSpend(
          value.stunningStrike.spends,
          right.stunningStrike.spends,
        ),
      cunningStrike: (value) =>
        right.kind === "cunningStrike" &&
        value.cunningStrike.trigger.damageRiderProcedureRef ===
          right.cunningStrike.trigger.damageRiderProcedureRef &&
        sameCunningStrikeOptions(
          value.cunningStrike.options,
          right.cunningStrike.options,
        ),
      cunningStrikeOptionGrant: (value) =>
        right.kind === "cunningStrikeOptionGrant" &&
        value.optionGrant.sourceProcedureRef ===
          right.optionGrant.sourceProcedureRef &&
        sameCunningStrikeOption(
          value.optionGrant.option,
          right.optionGrant.option,
        ),
      paladinSacredWeapon: (value) =>
        right.kind === "paladinSacredWeapon" &&
        samePaladinSacredWeapon(value, right),
    }),
  );
}

type UnitExtraActionRestriction = Extract<
  UnitFeatureProcedureExecution,
  { readonly kind: "extraActionGrant" }
>["restriction"];

function sameUnitExtraActionRestriction(
  left: UnitExtraActionRestriction,
  right: UnitExtraActionRestriction,
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      none: () => right.kind === "none",
      exclude: (value) =>
        right.kind === "exclude" &&
        samePrimitiveMultiset(value.actions, right.actions),
      allow_only: (value) =>
        right.kind === "allow_only" &&
        sameMultisetBy(
          value.actions,
          right.actions,
          (leftAction, rightAction) =>
            leftAction.action === rightAction.action &&
            (leftAction.action !== "attack" ||
              (rightAction.action === "attack" &&
                leftAction.attackLimit.kind === rightAction.attackLimit.kind &&
                leftAction.attackLimit.count ===
                  rightAction.attackLimit.count)),
        ),
    }),
  );
}

function sameUnitFeatureProcedureExecution(
  left: UnitFeatureProcedureExecution,
  right: UnitFeatureProcedureExecution,
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      extraActionGrant: (value) =>
        right.kind === "extraActionGrant" &&
        sameUnitExtraActionRestriction(value.restriction, right.restriction),
      selfBonusActionHealing: (value) =>
        right.kind === "selfBonusActionHealing" &&
        value.dice === right.dice &&
        value.dieSize === right.dieSize &&
        value.flatBase === right.flatBase &&
        value.flatPerLevel === right.flatPerLevel &&
        value.startingAtLevel === right.startingAtLevel &&
        value.className === right.className &&
        value.classLevel === right.classLevel,
      ongoingFeature: (value) =>
        right.kind === "ongoingFeature" &&
        sameOngoingFeatureExecution(value, right),
      attackDamageRider: (value) => {
        if (
          right.kind !== "attackDamageRider" ||
          value.optional !== right.optional ||
          value.classLevel !== right.classLevel
        ) {
          return false;
        }
        return value.optional
          ? right.optional &&
              value.dice.dieSize === right.dice.dieSize &&
              sameLevelThresholdDiceTable(
                value.dice.diceByLevel,
                right.dice.diceByLevel,
              )
          : !right.optional && value.dice.dieSize === right.dice.dieSize;
      },
      saveDamageReplacement: () => right.kind === "saveDamageReplacement",
      reactionRollOrDamageReduction: (value) =>
        right.kind === "reactionRollOrDamageReduction" &&
        value.classLevel === right.classLevel &&
        sameMultisetBy(
          value.modifiers,
          right.modifiers,
          sameReactionReductionModifier,
        ),
      passiveArmorClassBonus: () => right.kind === "passiveArmorClassBonus",
      passiveRangedAttackRollBonus: () =>
        right.kind === "passiveRangedAttackRollBonus",
      initiativeProficiencyAndSwap: () =>
        right.kind === "initiativeProficiencyAndSwap",
      attackRollMissToHitReplacement: () =>
        right.kind === "attackRollMissToHitReplacement",
      attackActionAreaSaveDamageReplacement: (value) =>
        right.kind === "attackActionAreaSaveDamageReplacement" &&
        value.breath.area.shapeChoice[0].lengthFeet ===
          right.breath.area.shapeChoice[0].lengthFeet &&
        value.breath.area.shapeChoice[1].lengthFeet ===
          right.breath.area.shapeChoice[1].lengthFeet &&
        value.breath.area.shapeChoice[1].widthFeet ===
          right.breath.area.shapeChoice[1].widthFeet &&
        value.breath.damage.damageType.value ===
          right.breath.damage.damageType.value,
      d20TestNaturalOneReroll: () => right.kind === "d20TestNaturalOneReroll",
      passiveSavingThrowRollMode: (value) =>
        right.kind === "passiveSavingThrowRollMode" &&
        value.savingThrow.scope.kind === right.savingThrow.scope.kind &&
        (value.savingThrow.scope.kind === "condition"
          ? right.savingThrow.scope.kind === "condition" &&
            value.savingThrow.scope.condition ===
              right.savingThrow.scope.condition
          : right.savingThrow.scope.kind === "savingThrowAbility" &&
            value.savingThrow.scope.ability ===
              right.savingThrow.scope.ability),
      passiveAbilityCheckRollMode: () =>
        right.kind === "passiveAbilityCheckRollMode",
      passiveSpeedBonus: (value) =>
        right.kind === "passiveSpeedBonus" &&
        samePassiveSpeedFacts(value.speed, right.speed),
      passiveSpeedKindGrants: (value) =>
        right.kind === "passiveSpeedKindGrants" &&
        samePassiveSpeedKindGrants(
          value.speedKindGrants,
          right.speedKindGrants,
        ),
      acrobaticMovement: () => right.kind === "acrobaticMovement",
      creatureSpaceMovementPermission: () =>
        right.kind === "creatureSpaceMovementPermission",
      hideActionObscurementPermission: () =>
        right.kind === "hideActionObscurementPermission",
      weaponDamageDiceRollChoice: () =>
        right.kind === "weaponDamageDiceRollChoice",
      attackDamageDieFloor: () => right.kind === "attackDamageDieFloor",
      lightExtraAttackDamageAbilityModifier: () =>
        right.kind === "lightExtraAttackDamageAbilityModifier",
      martialArtsAttackProjection: (value) =>
        right.kind === "martialArtsAttackProjection" &&
        value.classLevel === right.classLevel &&
        value.martialArts.damageReplacement.dieSize ===
          right.martialArts.damageReplacement.dieSize,
      bardicInspirationGrant: (value) =>
        right.kind === "bardicInspirationGrant" &&
        value.rangeFeet === right.rangeFeet &&
        value.dieSize === right.dieSize &&
        value.durationTicks === right.durationTicks &&
        sameMechanicalResourceSpend(value.spends, right.spends),
      druidWildShapeKnownForm: (value) =>
        right.kind === "druidWildShapeKnownForm" &&
        sameDruidWildShapeKnownForm(value, right),
      attackActionAttackCountScaling: (value) =>
        right.kind === "attackActionAttackCountScaling" &&
        value.additionalAttacks === right.additionalAttacks,
      zeroHitPointReplacement: () => right.kind === "zeroHitPointReplacement",
      bonusActionDashTemporaryHitPoints: () =>
        right.kind === "bonusActionDashTemporaryHitPoints",
      failedAbilityCheckResourceBoost: (value) =>
        right.kind === "failedAbilityCheckResourceBoost" &&
        sameMechanicalResourceSpend(
          value.abilityCheck.spends,
          right.abilityCheck.spends,
        ),
      failedSavingThrowReroll: (value) =>
        right.kind === "failedSavingThrowReroll" &&
        sameMechanicalResourceSpend(
          value.savingThrow.spends,
          right.savingThrow.spends,
        ),
      spellSlotHealingModifier: () => right.kind === "spellSlotHealingModifier",
      magicActionHealingPool: (value) =>
        right.kind === "magicActionHealingPool" &&
        sameMagicActionHealingPool(value, right),
      magicActionAreaSaveDamageHealing: (value) =>
        right.kind === "magicActionAreaSaveDamageHealing" &&
        sameMagicActionAreaSaveDamageHealing(value, right),
      magicActionSaveGatedCondition: (value) =>
        right.kind === "magicActionSaveGatedCondition" &&
        sameMagicActionSaveGatedCondition(value, right),
      enemyZeroHitPointTemporaryHitPoints: (value) =>
        right.kind === "enemyZeroHitPointTemporaryHitPoints" &&
        value.className === right.className &&
        value.temporaryHitPoints.trigger.byOtherWithinFeet ===
          right.temporaryHitPoints.trigger.byOtherWithinFeet,
      bonusActionDelegatedStandardActions: () =>
        right.kind === "bonusActionDelegatedStandardActions",
      remarkableAthlete: () => right.kind === "remarkableAthlete",
      openHandTechnique: (value) =>
        right.kind === "openHandTechnique" &&
        sameOpenHandTechnique(value, right),
      stunningStrike: (value) =>
        right.kind === "stunningStrike" &&
        sameMechanicalResourceSpend(
          value.stunningStrike.spends,
          right.stunningStrike.spends,
        ),
      paladinSacredWeapon: (value) =>
        right.kind === "paladinSacredWeapon" &&
        samePaladinSacredWeapon(value, right),
      rogueSteadyAim: () => right.kind === "rogueSteadyAim",
      potentCantrip: () => right.kind === "potentCantrip",
      grappler: () => right.kind === "grappler",
      retaliationReactionAttack: () =>
        right.kind === "retaliationReactionAttack",
    }),
  );
}

function sameUnitFeatureAndSupportProcedureExecution(
  feature: UnitFeatureProcedureExecution,
  support: UnitSupportProcedureExecution,
): boolean {
  return Match.value(feature).pipe(
    Match.discriminatorsExhaustive("kind")({
      extraActionGrant: () => false,
      selfBonusActionHealing: () => false,
      ongoingFeature: () => false,
      attackDamageRider: () => support === "attackDamageRider",
      saveDamageReplacement: () => support === "saveDamageReplacement",
      reactionRollOrDamageReduction: () =>
        support === "reactionRollOrDamageReduction",
      passiveArmorClassBonus: () => support === "passiveArmorClassBonus",
      passiveRangedAttackRollBonus: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, attackRoll: value.attackRoll },
          support,
        ),
      initiativeProficiencyAndSwap: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, initiative: value.initiative },
          support,
        ),
      attackRollMissToHitReplacement: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, replacement: value.replacement },
          support,
        ),
      attackActionAreaSaveDamageReplacement: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, breath: value.breath },
          support,
        ),
      d20TestNaturalOneReroll: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, reroll: value.reroll },
          support,
        ),
      passiveSavingThrowRollMode: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, savingThrow: value.savingThrow },
          support,
        ),
      passiveAbilityCheckRollMode: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, abilityCheck: value.abilityCheck },
          support,
        ),
      passiveSpeedBonus: (value) =>
        sameUnitSupportProcedureExecution(
          {
            kind: value.kind,
            deltaFeet: value.speed.deltaFeet,
            condition: value.speed.condition,
          },
          support,
        ),
      passiveSpeedKindGrants: (value) =>
        sameUnitSupportProcedureExecution(
          value.speedKindGrants.speed === undefined
            ? {
                kind: value.kind,
                grants: value.speedKindGrants.grants,
              }
            : {
                kind: value.kind,
                speed: value.speedKindGrants.speed,
                grants: value.speedKindGrants.grants,
              },
          support,
        ),
      acrobaticMovement: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, acrobaticMovement: value.acrobaticMovement },
          support,
        ),
      creatureSpaceMovementPermission: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, permission: value.permission },
          support,
        ),
      hideActionObscurementPermission: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, permission: value.permission },
          support,
        ),
      weaponDamageDiceRollChoice: () =>
        support === "weaponDamageDiceRollChoice",
      attackDamageDieFloor: () => support === "attackDamageDieFloor",
      lightExtraAttackDamageAbilityModifier: (value) =>
        sameUnitSupportProcedureExecution(
          {
            kind: value.kind,
            damageAbilityModifier: value.damageAbilityModifier,
          },
          support,
        ),
      martialArtsAttackProjection: () =>
        support === "martialArtsAttackProjection",
      bardicInspirationGrant: () => support === "bardicInspirationGrant",
      druidWildShapeKnownForm: (value) =>
        sameUnitSupportProcedureExecution(
          {
            kind: value.kind,
            classLevel: value.classLevel,
            knownFormRoster: value.knownFormRoster,
          },
          support,
        ),
      attackActionAttackCountScaling: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, additionalAttacks: value.additionalAttacks },
          support,
        ),
      zeroHitPointReplacement: () => support === "zeroHitPointReplacement",
      bonusActionDashTemporaryHitPoints: (value) =>
        sameUnitSupportProcedureExecution(
          {
            kind: value.kind,
            dashTemporaryHitPoints: value.dashTemporaryHitPoints,
          },
          support,
        ),
      failedAbilityCheckResourceBoost: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, abilityCheck: value.abilityCheck },
          support,
        ),
      failedSavingThrowReroll: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, savingThrow: value.savingThrow },
          support,
        ),
      spellSlotHealingModifier: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, healingModifier: value.healingModifier },
          support,
        ),
      magicActionHealingPool: (value) =>
        sameUnitSupportProcedureExecution(
          {
            kind: value.kind,
            className: value.className,
            healingPool: value.healingPool,
          },
          support,
        ),
      magicActionAreaSaveDamageHealing: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, damageHealing: value.damageHealing },
          support,
        ),
      magicActionSaveGatedCondition: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, condition: value.condition },
          support,
        ),
      enemyZeroHitPointTemporaryHitPoints: (value) =>
        sameUnitSupportProcedureExecution(
          {
            kind: value.kind,
            className: value.className,
            temporaryHitPoints: value.temporaryHitPoints,
          },
          support,
        ),
      bonusActionDelegatedStandardActions: (value) =>
        sameUnitSupportProcedureExecution(
          {
            kind: value.kind,
            activationCost: value.actionEconomy.activationCost,
            sleightOfHand: value.actionEconomy.sleightOfHand,
            objectUse: value.actionEconomy.objectUse,
          },
          support,
        ),
      remarkableAthlete: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, remarkableAthlete: value.remarkableAthlete },
          support,
        ),
      openHandTechnique: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, technique: value.technique },
          support,
        ),
      stunningStrike: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, stunningStrike: value.stunningStrike },
          support,
        ),
      paladinSacredWeapon: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, sacredWeapon: value.sacredWeapon },
          support,
        ),
      rogueSteadyAim: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, steadyAim: value.steadyAim },
          support,
        ),
      potentCantrip: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, potentCantrip: value.potentCantrip },
          support,
        ),
      grappler: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, grappler: value.grappler },
          support,
        ),
      retaliationReactionAttack: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, retaliation: value.retaliation },
          support,
        ),
    }),
  );
}

export function unitFeatureProfileMatchesExecution(
  profile: SupportedUnitFeatureProfile,
  execution: UnitFeatureProcedureExecution,
  context: UnitFeatureProcedureExecutionContext,
): boolean {
  const projected = unitFeatureProcedureExecution(profile, context);
  return (
    projected !== undefined &&
    sameUnitFeatureProcedureExecution(projected, execution)
  );
}

export function unitFeatureProcedureExecution(
  profile: SupportedUnitFeatureProfile,
  context: UnitFeatureProcedureExecutionContext,
) {
  return Match.value(profile).pipe(
    Match.discriminatorsExhaustive("kind")({
      extraActionGrant: (value) => ({
        kind: value.kind,
        restriction: value.restriction,
      }),
      selfBonusActionHealing: (value) => ({
        kind: value.kind,
        dice: value.dice,
        dieSize: value.dieSize,
        flatBase: value.flatBase,
        flatPerLevel: value.flatPerLevel,
        startingAtLevel: value.startingAtLevel,
        className: value.className,
        classLevel: value.classLevel,
      }),
      ongoingFeature: (value) => ({
        kind: value.kind,
        activationTrigger: value.activationTrigger,
        spendsUse: value.spendsUse,
        lifecycle: value.lifecycle,
        ...(value.concentrationEffect === undefined
          ? {}
          : { concentrationEffect: value.concentrationEffect }),
        actionRestrictions: value.actionRestrictions,
        rollModifiers: value.rollModifiers,
        spellModifiers: value.spellModifiers,
        damageModifiers: value.damageModifiers,
        resistances: value.resistances,
      }),
      attackDamageRider: (value) =>
        Match.value(value).pipe(
          Match.when({ optional: true }, (variant) => ({
            kind: variant.kind,
            optional: variant.optional,
            usageLimit: variant.usageLimit,
            trigger: variant.trigger,
            eligibility: variant.eligibility,
            classLevel: variant.classLevel,
            dice: variant.dice,
          })),
          Match.when({ optional: false }, (variant) => ({
            kind: variant.kind,
            optional: variant.optional,
            usageLimit: variant.usageLimit,
            trigger: variant.trigger,
            classLevel: variant.classLevel,
            dice: variant.dice,
          })),
          Match.exhaustive,
        ),
      saveDamageReplacement: (value) => ({
        kind: value.kind,
        ability: value.ability,
        requiredSuccessDamage: value.requiredSuccessDamage,
        onSuccess: value.onSuccess,
        onFail: value.onFail,
        suppressedByCondition: value.suppressedByCondition,
      }),
      reactionRollOrDamageReduction: (value) => {
        const projectedModifiers = value.modifiers.map((modifier) =>
          Match.value(modifier).pipe(
            Match.discriminatorsExhaustive("kind")({
              attackRollReduction: (variant) => {
                const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
                  variant.reduction.spends.resourceUnitId,
                );
                return resourcePoolRef === undefined
                  ? undefined
                  : {
                      kind: variant.kind,
                      rangeFeet: variant.rangeFeet,
                      requiresVisibleCreature: variant.requiresVisibleCreature,
                      reduction: {
                        kind: variant.reduction.kind,
                        dice: variant.reduction.dice,
                        dieSize: variant.reduction.dieSize,
                        flatModifier: variant.reduction.flatModifier,
                        spends: {
                          resourcePoolRef,
                          amount: variant.reduction.spends.amount,
                        },
                      },
                    };
              },
              abilityCheckReduction: (variant) => {
                const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
                  variant.reduction.spends.resourceUnitId,
                );
                return resourcePoolRef === undefined
                  ? undefined
                  : {
                      kind: variant.kind,
                      rangeFeet: variant.rangeFeet,
                      requiresVisibleCreature: variant.requiresVisibleCreature,
                      reduction: {
                        kind: variant.reduction.kind,
                        dice: variant.reduction.dice,
                        dieSize: variant.reduction.dieSize,
                        flatModifier: variant.reduction.flatModifier,
                        spends: {
                          resourcePoolRef,
                          amount: variant.reduction.spends.amount,
                        },
                      },
                    };
              },
              attackDamageRollReduction: (variant) => {
                const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
                  variant.reduction.spends.resourceUnitId,
                );
                return resourcePoolRef === undefined
                  ? undefined
                  : {
                      kind: variant.kind,
                      rangeFeet: variant.rangeFeet,
                      requiresVisibleCreature: variant.requiresVisibleCreature,
                      reduction: {
                        kind: variant.reduction.kind,
                        dice: variant.reduction.dice,
                        dieSize: variant.reduction.dieSize,
                        flatModifier: variant.reduction.flatModifier,
                        spends: {
                          resourcePoolRef,
                          amount: variant.reduction.spends.amount,
                        },
                      },
                    };
              },
              attackDamageReduction: (variant) => {
                const redirect = variant.zeroDamageRedirect;
                if (redirect === undefined) {
                  return {
                    kind: variant.kind,
                    ...(variant.requiresVisibleAttacker === undefined
                      ? {}
                      : {
                          requiresVisibleAttacker:
                            variant.requiresVisibleAttacker,
                        }),
                    ...(variant.damageIncludes === undefined
                      ? {}
                      : { damageIncludes: variant.damageIncludes }),
                    reduction: variant.reduction,
                  };
                }
                const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
                  redirect.spends.resourceUnitId,
                );
                return resourcePoolRef === undefined
                  ? undefined
                  : {
                      kind: variant.kind,
                      ...(variant.requiresVisibleAttacker === undefined
                        ? {}
                        : {
                            requiresVisibleAttacker:
                              variant.requiresVisibleAttacker,
                          }),
                      ...(variant.damageIncludes === undefined
                        ? {}
                        : { damageIncludes: variant.damageIncludes }),
                      reduction: variant.reduction,
                      zeroDamageRedirect: {
                        spends: {
                          resourcePoolRef,
                          amount: redirect.spends.amount,
                        },
                        save: redirect.save,
                        damage: redirect.damage,
                        targetGate: redirect.targetGate,
                      },
                    };
              },
              fallDamageReduction: (variant) => ({
                kind: variant.kind,
                reduction: variant.reduction,
              }),
            }),
          ),
        );
        if (projectedModifiers.some((modifier) => modifier === undefined)) {
          return undefined;
        }
        const modifiers = projectedModifiers.filter(
          (modifier): modifier is Exclude<typeof modifier, undefined> =>
            modifier !== undefined,
        );
        return {
          kind: value.kind,
          classLevel: value.classLevel,
          modifiers,
        };
      },
      passiveArmorClassBonus: (value) => ({
        kind: value.kind,
        armorClass: value.armorClass,
      }),
      passiveRangedAttackRollBonus: (value) => ({
        kind: value.kind,
        attackRoll: value.attackRoll,
      }),
      initiativeProficiencyAndSwap: (value) => ({
        kind: value.kind,
        initiative: value.initiative,
      }),
      attackRollMissToHitReplacement: (value) => ({
        kind: value.kind,
        replacement: value.replacement,
      }),
      attackActionAreaSaveDamageReplacement: (value) => ({
        kind: value.kind,
        breath: value.breath,
      }),
      d20TestNaturalOneReroll: (value) => ({
        kind: value.kind,
        reroll: value.reroll,
      }),
      passiveSavingThrowRollMode: (value) => ({
        kind: value.kind,
        savingThrow: value.savingThrow,
      }),
      passiveAbilityCheckRollMode: (value) => ({
        kind: value.kind,
        abilityCheck: value.abilityCheck,
      }),
      passiveSpeedBonus: (value) => ({
        kind: value.kind,
        speed: value.speed,
      }),
      passiveSpeedKindGrants: (value) => ({
        kind: value.kind,
        speedKindGrants: value.speedKindGrants,
      }),
      acrobaticMovement: (value) => ({
        kind: value.kind,
        acrobaticMovement: value.acrobaticMovement,
      }),
      creatureSpaceMovementPermission: (value) => ({
        kind: value.kind,
        permission: value.permission,
      }),
      hideActionObscurementPermission: (value) => ({
        kind: value.kind,
        permission: value.permission,
      }),
      weaponDamageDiceRollChoice: (value) => ({
        kind: value.kind,
        damageDiceChoice: value.damageDiceChoice,
      }),
      attackDamageDieFloor: (value) => ({
        kind: value.kind,
        damageDieFloor: value.damageDieFloor,
      }),
      lightExtraAttackDamageAbilityModifier: (value) => ({
        kind: value.kind,
        damageAbilityModifier: value.damageAbilityModifier,
      }),
      martialArtsAttackProjection: (value) => ({
        kind: value.kind,
        classLevel: value.classLevel,
        martialArts: value.martialArts,
      }),
      bardicInspirationGrant: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              rangeFeet: value.rangeFeet,
              dieSize: value.dieSize,
              durationTicks: value.durationTicks,
              spends: { resourcePoolRef, amount: value.spends.amount },
            };
      },
      druidWildShapeKnownForm: (value) => ({
        kind: value.kind,
        classLevel: value.classLevel,
        knownFormRoster: value.knownFormRoster,
      }),
      cunningStrike: () => undefined,
      cunningStrikeOptionGrant: () => undefined,
      attackActionAttackCountScaling: (value) => ({
        kind: value.kind,
        additionalAttacks: value.additionalAttacks,
      }),
      zeroHitPointReplacement: (value) => ({
        kind: value.kind,
        optional: value.optional,
        trigger: value.trigger,
        replacementHp: value.replacementHp,
        resetCadence: value.resetCadence,
      }),
      bonusActionDashTemporaryHitPoints: (value) => ({
        kind: value.kind,
        dashTemporaryHitPoints: value.dashTemporaryHitPoints,
      }),
      failedAbilityCheckResourceBoost: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.abilityCheck.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              abilityCheck: {
                trigger: value.abilityCheck.trigger,
                bonus: value.abilityCheck.bonus,
                spends: { resourcePoolRef },
                refundSpendOnStillFailed:
                  value.abilityCheck.refundSpendOnStillFailed,
              },
            };
      },
      failedSavingThrowReroll: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.savingThrow.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              savingThrow: {
                trigger: value.savingThrow.trigger,
                reroll: value.savingThrow.reroll,
                spends: {
                  resourcePoolRef,
                  amount: value.savingThrow.spends.amount,
                },
                resetCadence: value.savingThrow.resetCadence,
              },
            };
      },
      spellSlotHealingModifier: (value) => ({
        kind: value.kind,
        healingModifier: value.healingModifier,
      }),
      magicActionHealingPool: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.healingPool.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              className: value.className,
              healingPool: {
                activationCost: value.healingPool.activationCost,
                spends: {
                  resourcePoolRef,
                  amount: value.healingPool.spends.amount,
                },
                rangeFeet: value.healingPool.rangeFeet,
                targetSelection: value.healingPool.targetSelection,
                pool: value.healingPool.pool,
                perTargetCap: value.healingPool.perTargetCap,
              },
            };
      },
      magicActionAreaSaveDamageHealing: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.damageHealing.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              damageHealing: {
                activationCost: value.damageHealing.activationCost,
                spends: {
                  resourcePoolRef,
                  amount: value.damageHealing.spends.amount,
                },
                area: value.damageHealing.area,
                save: value.damageHealing.save,
                damage: value.damageHealing.damage,
                healing: value.damageHealing.healing,
              },
            };
      },
      magicActionSaveGatedCondition: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.condition.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              condition: {
                activationCost: value.condition.activationCost,
                spends: {
                  resourcePoolRef,
                  amount: value.condition.spends.amount,
                },
                targetSelection: value.condition.targetSelection,
                save: value.condition.save,
                onFail: value.condition.onFail,
              },
            };
      },
      enemyZeroHitPointTemporaryHitPoints: (value) => ({
        kind: value.kind,
        className: value.className,
        temporaryHitPoints: value.temporaryHitPoints,
      }),
      bonusActionDelegatedStandardActions: (value) => ({
        kind: value.kind,
        actionEconomy: value.actionEconomy,
      }),
      remarkableAthlete: (value) => ({
        kind: value.kind,
        remarkableAthlete: value.remarkableAthlete,
      }),
      openHandTechnique: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.technique.trigger.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              technique: {
                trigger: {
                  kind: value.technique.trigger.kind,
                  resourcePoolRef,
                  optionId: value.technique.trigger.optionId,
                },
                optional: value.technique.optional,
                effectSaveDc: value.technique.effectSaveDc,
                effects: value.technique.effects,
              },
            };
      },
      stunningStrike: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.stunningStrike.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              stunningStrike: {
                trigger: value.stunningStrike.trigger,
                optional: value.stunningStrike.optional,
                spends: {
                  resourcePoolRef,
                  amount: value.stunningStrike.spends.amount,
                },
                savingThrow: value.stunningStrike.savingThrow,
                onFail: value.stunningStrike.onFail,
                onSuccess: value.stunningStrike.onSuccess,
              },
            };
      },
      paladinSacredWeapon: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.sacredWeapon.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              sacredWeapon: {
                activationCost: value.sacredWeapon.activationCost,
                spends: {
                  resourcePoolRef,
                  amount: value.sacredWeapon.spends.amount,
                },
                target: value.sacredWeapon.target,
                duration: value.sacredWeapon.duration,
                attackRollBonus: value.sacredWeapon.attackRollBonus,
                hitDamageTypeChoice: value.sacredWeapon.hitDamageTypeChoice,
                light: value.sacredWeapon.light,
              },
            };
      },
      rogueSteadyAim: (value) => ({
        kind: value.kind,
        steadyAim: value.steadyAim,
      }),
      potentCantrip: (value) => ({
        kind: value.kind,
        potentCantrip: value.potentCantrip,
      }),
      grappler: (value) => ({
        kind: value.kind,
        grappler: value.grappler,
      }),
      retaliationReactionAttack: (value) => ({
        kind: value.kind,
        retaliation: value.retaliation,
      }),
    }),
  );
}

export function unitSupportProcedureExecution(
  profile: BattleUnitSupportProfile,
  context: UnitSupportProcedureExecutionContext,
) {
  if (typeof profile === "string") return profile;
  return Match.value(profile).pipe(
    Match.discriminatorsExhaustive("kind")({
      alternateActionCost: (value) => ({
        kind: value.kind,
        from: value.from,
        to: value.to,
      }),
      bonusActionDelegatedStandardActions: (value) => ({
        kind: value.kind,
        activationCost: value.activationCost,
        sleightOfHand: value.sleightOfHand,
        objectUse: value.objectUse,
      }),
      passiveRangedAttackRollBonus: (value) => ({
        kind: value.kind,
        attackRoll: value.attackRoll,
      }),
      initiativeProficiencyAndSwap: (value) => ({
        kind: value.kind,
        initiative: value.initiative,
      }),
      attackRollMissToHitReplacement: (value) => ({
        kind: value.kind,
        replacement: value.replacement,
      }),
      attackActionAreaSaveDamageReplacement: (value) => ({
        kind: value.kind,
        breath: value.breath,
      }),
      d20TestNaturalOneReroll: (value) => ({
        kind: value.kind,
        reroll: value.reroll,
      }),
      passiveSavingThrowRollMode: (value) => ({
        kind: value.kind,
        savingThrow: value.savingThrow,
      }),
      passiveAbilityCheckRollMode: (value) => ({
        kind: value.kind,
        abilityCheck: value.abilityCheck,
      }),
      passiveDamageResistance: (value) => ({
        kind: value.kind,
        resistance: value.resistance,
      }),
      passiveSpeedBonus: (value) => ({
        kind: value.kind,
        deltaFeet: value.deltaFeet,
        condition: value.condition,
      }),
      passiveSpeedKindGrants: (value) => ({
        kind: value.kind,
        ...(value.speed === undefined ? {} : { speed: value.speed }),
        grants: value.grants,
      }),
      acrobaticMovement: (value) => ({
        kind: value.kind,
        acrobaticMovement: value.acrobaticMovement,
      }),
      creatureSpaceMovementPermission: (value) => ({
        kind: value.kind,
        permission: value.permission,
      }),
      hideActionObscurementPermission: (value) => ({
        kind: value.kind,
        permission: value.permission,
      }),
      attackActionAttackCountScaling: (value) => ({
        kind: value.kind,
        additionalAttacks: value.additionalAttacks,
      }),
      bonusActionDashTemporaryHitPoints: (value) => ({
        kind: value.kind,
        dashTemporaryHitPoints: value.dashTemporaryHitPoints,
      }),
      spellSlotHealingModifier: (value) => ({
        kind: value.kind,
        healingModifier: value.healingModifier,
      }),
      enemyZeroHitPointTemporaryHitPoints: (value) => ({
        kind: value.kind,
        className: value.className,
        temporaryHitPoints: value.temporaryHitPoints,
      }),
      druidWildShapeKnownForm: (value) => ({
        kind: value.kind,
        classLevel: value.classLevel,
        knownFormRoster: value.knownFormRoster,
      }),
      remarkableAthlete: (value) => ({
        kind: value.kind,
        remarkableAthlete: value.remarkableAthlete,
      }),
      huntersPrey: (value) => ({
        kind: value.kind,
        huntersPrey: value.huntersPrey,
      }),
      rogueSteadyAim: (value) => ({
        kind: value.kind,
        steadyAim: value.steadyAim,
      }),
      potentCantrip: (value) => ({
        kind: value.kind,
        potentCantrip: value.potentCantrip,
      }),
      grappler: (value) => ({
        kind: value.kind,
        grappler: value.grappler,
      }),
      brutalStrike: (value) => ({
        kind: value.kind,
        brutalStrike: value.brutalStrike,
      }),
      retaliationReactionAttack: (value) => ({
        kind: value.kind,
        retaliation: value.retaliation,
      }),
      tacticalMasterReplacement: (value) => ({
        kind: value.kind,
        replacementProperties: value.replacementProperties,
      }),
      lightExtraAttackDamageAbilityModifier: (value) => ({
        kind: value.kind,
        damageAbilityModifier: value.damageAbilityModifier,
      }),
      monkFocusBattleOptions: (value) => ({
        kind: value.kind,
        effectSaveDc: value.effectSaveDc,
        flurryOfBlows: {
          focusPointCost: value.flurryOfBlows.focusPointCost,
          strikeCount: value.flurryOfBlows.strikeCount,
        },
        patientDefense: {
          freeAction: value.patientDefense.freeAction,
          focusPointCost: value.patientDefense.focusPointCost,
          focusActions: value.patientDefense.focusActions,
        },
        stepOfTheWind: {
          freeAction: value.stepOfTheWind.freeAction,
          focusPointCost: value.stepOfTheWind.focusPointCost,
          focusActions: value.stepOfTheWind.focusActions,
          jumpDistanceMultiplier: value.stepOfTheWind.jumpDistanceMultiplier,
        },
      }),
      failedAbilityCheckResourceBoost: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.abilityCheck.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              abilityCheck: {
                trigger: value.abilityCheck.trigger,
                bonus: value.abilityCheck.bonus,
                spends: { resourcePoolRef },
                refundSpendOnStillFailed:
                  value.abilityCheck.refundSpendOnStillFailed,
              },
            };
      },
      failedSavingThrowReroll: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.savingThrow.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              savingThrow: {
                trigger: value.savingThrow.trigger,
                reroll: value.savingThrow.reroll,
                spends: {
                  resourcePoolRef,
                  amount: value.savingThrow.spends.amount,
                },
                resetCadence: value.savingThrow.resetCadence,
              },
            };
      },
      magicActionHealingPool: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.healingPool.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              className: value.className,
              healingPool: {
                activationCost: value.healingPool.activationCost,
                spends: {
                  resourcePoolRef,
                  amount: value.healingPool.spends.amount,
                },
                rangeFeet: value.healingPool.rangeFeet,
                targetSelection: value.healingPool.targetSelection,
                pool: value.healingPool.pool,
                perTargetCap: value.healingPool.perTargetCap,
              },
            };
      },
      magicActionAreaSaveDamageHealing: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.damageHealing.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              damageHealing: {
                activationCost: value.damageHealing.activationCost,
                spends: {
                  resourcePoolRef,
                  amount: value.damageHealing.spends.amount,
                },
                area: value.damageHealing.area,
                save: value.damageHealing.save,
                damage: value.damageHealing.damage,
                healing: value.damageHealing.healing,
              },
            };
      },
      magicActionSaveGatedCondition: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.condition.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              condition: {
                activationCost: value.condition.activationCost,
                spends: {
                  resourcePoolRef,
                  amount: value.condition.spends.amount,
                },
                targetSelection: value.condition.targetSelection,
                save: value.condition.save,
                onFail: value.condition.onFail,
              },
            };
      },
      openHandTechnique: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.technique.trigger.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              technique: {
                trigger: {
                  kind: value.technique.trigger.kind,
                  resourcePoolRef,
                  optionId: value.technique.trigger.optionId,
                },
                optional: value.technique.optional,
                effectSaveDc: value.technique.effectSaveDc,
                effects: value.technique.effects,
              },
            };
      },
      stunningStrike: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.stunningStrike.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              stunningStrike: {
                trigger: value.stunningStrike.trigger,
                optional: value.stunningStrike.optional,
                spends: {
                  resourcePoolRef,
                  amount: value.stunningStrike.spends.amount,
                },
                savingThrow: value.stunningStrike.savingThrow,
                onFail: value.stunningStrike.onFail,
                onSuccess: value.stunningStrike.onSuccess,
              },
            };
      },
      cunningStrike: (value) => {
        const damageRiderProcedureRef =
          context.unitFeatureProcedureRefsByUnitId.get(
            value.cunningStrike.trigger.sourceUnitId,
          );
        return damageRiderProcedureRef === undefined
          ? undefined
          : {
              kind: value.kind,
              cunningStrike: {
                trigger: {
                  kind: value.cunningStrike.trigger.kind,
                  damageRiderProcedureRef,
                },
                choice: value.cunningStrike.choice,
                effectSaveDc: value.cunningStrike.effectSaveDc,
                options: value.cunningStrike.options,
              },
            };
      },
      cunningStrikeOptionGrant: (value) => {
        const sourceProcedureRef = context.supportProcedureRefsByUnitId.get(
          value.optionGrant.sourceUnitId,
        );
        return sourceProcedureRef === undefined
          ? undefined
          : {
              kind: value.kind,
              optionGrant: {
                sourceProcedureRef,
                option: value.optionGrant.option,
              },
            };
      },
      paladinSacredWeapon: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.sacredWeapon.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              sacredWeapon: {
                activationCost: value.sacredWeapon.activationCost,
                spends: {
                  resourcePoolRef,
                  amount: value.sacredWeapon.spends.amount,
                },
                target: value.sacredWeapon.target,
                duration: value.sacredWeapon.duration,
                attackRollBonus: value.sacredWeapon.attackRollBonus,
                hitDamageTypeChoice: value.sacredWeapon.hitDamageTypeChoice,
                light: value.sacredWeapon.light,
              },
            };
      },
    }),
  );
}

export function characterSpellProcedureRef(
  execution: CharacterExecutionState,
  invocation: SupportedSpellInvocation | SpellProcedureExecution,
  context: SpellProcedureExecutionContext = EMPTY_SPELL_PROCEDURE_EXECUTION_CONTEXT,
): BattleProcedureExecutionRef | undefined {
  return execution.procedureBindings.find(
    (binding) =>
      binding.procedure.kind === "spellInvocation" &&
      spellInvocationMatchesExecution(
        invocation,
        binding.procedure.execution,
        context,
      ),
  )?.procedureRef;
}

export function characterSpellProcedureRefs(
  execution: CharacterExecutionState,
  invocations: readonly SupportedSpellInvocation[],
  context: SpellProcedureExecutionContext = EMPTY_SPELL_PROCEDURE_EXECUTION_CONTEXT,
): readonly (BattleProcedureExecutionRef | undefined)[] {
  const remainingBindings = execution.procedureBindings.filter(
    (binding) => binding.procedure.kind === "spellInvocation",
  );
  return invocations.map((invocation) => {
    const bindingIndex = remainingBindings.findIndex(
      (binding) =>
        binding.procedure.kind === "spellInvocation" &&
        spellInvocationMatchesExecution(
          invocation,
          binding.procedure.execution,
          context,
        ),
    );
    if (bindingIndex < 0) return undefined;
    const [binding] = remainingBindings.splice(bindingIndex, 1);
    return binding?.procedureRef;
  });
}

export function characterSpellProcedureRefsForProcedure(
  execution: CharacterExecutionState,
  procedures: ReadonlySet<SupportedSpellInvocation["procedure"]>,
): readonly BattleProcedureExecutionRef[] {
  return execution.procedureBindings.flatMap((binding) => {
    const procedure = binding.procedure;
    return (procedure.kind === "spellInvocation" ||
      procedure.kind === "unavailableSpellInvocation") &&
      procedures.has(procedure.execution.procedure)
      ? [binding.procedureRef]
      : [];
  });
}

function spellRuleExecutionFacts(
  mechanics: SpellRecord["mechanics"],
): SpellRuleExecutionFacts {
  return {
    level: mechanics.level,
    range: mechanics.range,
    duration: mechanics.duration,
    components: {
      verbal: mechanics.components.v,
      somatic: mechanics.components.s,
      hasMaterial: mechanics.components.m !== false,
      hasPricedOrConsumedMaterial:
        mechanics.components.m !== false &&
        (typeof mechanics.components.m === "object" ||
          ("materialCostGp" in mechanics.components &&
            mechanics.components.materialCostGp !== undefined) ||
          ("materialConsumed" in mechanics.components &&
            mechanics.components.materialConsumed === true)),
    },
    twinnedTargetCount: spellTwinnedTargetCountFacts(mechanics),
  };
}

function spellTwinnedTargetCountFacts(
  mechanics: SpellRecord["mechanics"],
): SpellRuleExecutionFacts["twinnedTargetCount"] {
  const selections = spellTargetSelections(mechanics).filter((selection) => {
    if (!("count" in selection)) return false;
    const count = selection.count;
    const baseLevel =
      typeof count === "object" && count !== null && "baseLevel" in count
        ? (count.baseLevel ?? mechanics.level)
        : undefined;
    return (
      selection.mode === "choose_up_to" &&
      !("repeatsAllowed" in selection && selection.repeatsAllowed === true) &&
      selection.targetKinds?.length === 1 &&
      selection.targetKinds[0] === "creature" &&
      typeof count === "object" &&
      count !== null &&
      count.kind === "linear" &&
      count.perSlotAboveBase === 1 &&
      baseLevel === mechanics.level
    );
  });
  const selection = selections.length === 1 ? selections[0] : undefined;
  if (
    selection?.mode !== "choose_up_to" ||
    typeof selection.count !== "object" ||
    selection.count === null ||
    selection.count.kind !== "linear"
  ) {
    return null;
  }
  return {
    base: selection.count.base,
    baseLevel: selection.count.baseLevel ?? mechanics.level,
  };
}

function spellTargetSelections(
  mechanics: SpellRecord["mechanics"],
): readonly TargetSelection[] {
  if (mechanics.family === "ongoing_effect") {
    const selection = targetSelectionFromAttachment(mechanics.attachment);
    return selection === null ? [] : [selection];
  }
  if (mechanics.family !== "activation") return [];
  return mechanics.phases.flatMap((phase) => {
    if (!("attachment" in phase)) return [];
    const selection = targetSelectionFromAttachment(phase.attachment);
    return selection === null ? [] : [selection];
  });
}

function targetSelectionFromAttachment(
  attachment: Attachment,
): TargetSelection | null {
  return attachment.kind === "hole" && attachment.value.kind === "target"
    ? attachment.value.selection
    : null;
}

export function characterStoredSpellProcedureRef(
  execution: CharacterExecutionState,
  invocation: SupportedSpellInvocation | SpellProcedureExecution,
): BattleProcedureExecutionRef | undefined {
  return execution.procedureBindings.find(
    (binding) =>
      (binding.procedure.kind === "spellInvocation" ||
        binding.procedure.kind === "unavailableSpellInvocation") &&
      spellInvocationMatchesExecution(invocation, binding.procedure.execution),
  )?.procedureRef;
}

function spellInvocationMatchesExecution(
  invocation: SupportedSpellInvocation | SpellProcedureExecution,
  execution: SpellProcedureExecution,
  context: SpellProcedureExecutionContext = EMPTY_SPELL_PROCEDURE_EXECUTION_CONTEXT,
): boolean {
  const projected =
    "spell" in invocation
      ? spellProcedureExecution(invocation, context)
      : invocation;
  return (
    projected !== undefined && sameSpellProcedureExecution(projected, execution)
  );
}

export function spellProcedureExecution<
  Invocation extends SupportedSpellInvocation,
>(
  invocation: Invocation,
  context?: SpellProcedureExecutionContext,
): Extract<
  Invocation["resource"],
  ClassFeatureFreeCastInvocationResource
> extends never
  ? SpellProcedureExecution<Invocation>
  : SpellProcedureExecution<Invocation> | undefined;
export function spellProcedureExecution(
  invocation: SupportedSpellInvocation,
  _context: SpellProcedureExecutionContext = EMPTY_SPELL_PROCEDURE_EXECUTION_CONTEXT,
): SpellProcedureExecution | undefined {
  const spellRuleFacts = spellRuleExecutionFacts(invocation.spell.mechanics);
  return Match.value(invocation).pipe(
    Match.discriminatorsExhaustive("procedure")({
      abilityD20TestRollModeSaveGate: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        actionCost: value.actionCost,
        dc: value.dc,
        failedSaveDamagePenaltyEffect: value.failedSaveDamagePenaltyEffect,
        failedSaveEffect: value.failedSaveEffect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        successEffect: value.successEffect,
        targeting: value.targeting,
      }),
      afterHitDamage: (value) => {
        const resource = classFeatureSpellInvocationResourceExecution(
          value.resource,
        );
        return resource === undefined
          ? undefined
          : {
              spellRuleFacts,
              access: value.access,
              actionCost: value.actionCost,
              conditionalBonusDamage: value.conditionalBonusDamage,
              damage: value.damage,
              procedure: value.procedure,
              resource,
            };
      },
      afterHitDamageAndIllumination: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        damage: value.damage,
        procedure: value.procedure,
        resource: value.resource,
      }),
      afterHitSaveGatedCondition: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        actionCost: value.actionCost,
        dc: value.dc,
        effect: value.effect,
        procedure: value.procedure,
        resource: value.resource,
        targeting: value.targeting,
      }),
      afterHitTimedDamageAndSave: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        immediateDamage: value.immediateDamage,
        procedure: value.procedure,
        resource: value.resource,
      }),
      antimagicFieldOngoingSpellSuppression: (value) => ({
        spellRuleFacts,
        access: value.access,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      attackBurstSaveDamage: (value) => ({
        spellRuleFacts,
        access: value.access,
        attackBonus: value.attackBonus,
        attackKind: value.attackKind,
        burst: value.burst,
        damage: value.damage,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      blurAttackRollDefense: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        resource: value.resource,
      }),
      chainedSpellAttackDamage: (value) => ({
        spellRuleFacts,
        access: value.access,
        attackBonus: value.attackBonus,
        attackKind: value.attackKind,
        damage: value.damage,
        damageTypeChoices: value.damageTypeChoices,
        leapRangeFeet: value.leapRangeFeet,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      chosenDamageResistance: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        damageTypeChoices: value.damageTypeChoices,
        expiresAt: value.expiresAt,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      cloudkillAreaHazard: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        damage: value.damage,
        dc: value.dc,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      command: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        actionCost: value.actionCost,
        dc: value.dc,
        procedure: value.procedure,
        resource: value.resource,
        targeting: value.targeting,
      }),
      conditionImmunityAndTurnStartTemporaryHitPoints: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffects: value.activeEffects,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      conditionRemovalProtection: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        procedure: value.procedure,
        protection: value.protection,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      counterspell: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        dc: value.dc,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        triggerComponents: value.triggerComponents,
        targeting: value.targeting,
      }),
      creatureSizeDecrease: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        dc: value.dc,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      creatureSizeIncrease: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        dc: value.dc,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      creatureTypeProtection: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      damageReduction: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        amount: value.amount,
        damageTypeChoices: value.damageTypeChoices,
        expiresAt: value.expiresAt,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      dancingLightsCombinedCast: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        dimRadiusFeet: value.dimRadiusFeet,
        expiresAt: value.expiresAt,
        form: value.form,
        maxMoveFeet: value.maxMoveFeet,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        spacingFeet: value.spacingFeet,
      }),
      dancingLightsReposition: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffectRef: value.activeEffectRef,
        sourceDancingLightsProcedureRef: value.sourceDancingLightsProcedureRef,
        maxMoveFeet: value.maxMoveFeet,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        spacingFeet: value.spacingFeet,
      }),
      dancingLightsSeparateCast: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        dimRadiusFeet: value.dimRadiusFeet,
        expiresAt: value.expiresAt,
        form: value.form,
        maxMoveFeet: value.maxMoveFeet,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        spacingFeet: value.spacingFeet,
      }),
      directCondition: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      directConditionRemoval: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        conditionChoices: value.conditionChoices,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      directHitPointRestoration: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        healing: value.healing,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      dragonsBreathInitial: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        damageTypeChoices: value.damageTypeChoices,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      expeditiousRetreatDash: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        resource: value.resource,
      }),
      featherFallMitigation: (value) => ({
        spellRuleFacts,
        access: value.access,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      flamingSphere: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        damage: value.damage,
        dc: value.dc,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        ramMaxMoveFeet: value.ramMaxMoveFeet,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      fogCloudObscurement: (value) => ({
        spellRuleFacts,
        access: value.access,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      greaseGroundHazard: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        dc: value.dc,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      gustOfWindLine: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        dc: value.dc,
        durationTicks: value.durationTicks,
        movementCost: value.movementCost,
        procedure: value.procedure,
        pushDistanceFeet: value.pushDistanceFeet,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      hastePositive: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffects: value.activeEffects,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      heldLight: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        expiresAt: value.expiresAt,
        hurl: value.hurl,
        light: value.light,
        procedure: value.procedure,
        resource: value.resource,
      }),
      heldLightHurl: (value) => ({
        spellRuleFacts,
        access: value.access,
        attackBonus: value.attackBonus,
        attackKind: value.attackKind,
        damage: value.damage,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        sourceEffectRef: value.sourceEffectRef,
        sourceHeldLightProcedureRef: value.sourceHeldLightProcedureRef,
        targeting: value.targeting,
      }),
      hideousLaughter: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        actionCost: value.actionCost,
        dc: value.dc,
        procedure: value.procedure,
        resource: value.resource,
        targeting: value.targeting,
      }),
      hypnoticPattern: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        actionCost: value.actionCost,
        dc: value.dc,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      insectPlagueAreaHazard: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        damage: value.damage,
        dc: value.dc,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      jumpMovementReplacement: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      levitatedCreature: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        dc: value.dc,
        maxInitialRiseFeet: value.maxInitialRiseFeet,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      magicalDarknessPointOrigin: (value) => ({
        spellRuleFacts,
        access: value.access,
        dispelledSpellCreatedLightMaxSpellLevel:
          value.dispelledSpellCreatedLightMaxSpellLevel,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      magicWeaponEnhancement: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        bonus: value.bonus,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        resource: value.resource,
      }),
      makeStable: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
      }),
      markedDamageRider: (value) =>
        Match.value(value).pipe(
          Match.when({ action: "cast" }, (cast) => {
            const resource = classFeatureSpellInvocationResourceExecution(
              cast.resource,
            );
            return resource === undefined
              ? undefined
              : {
                  spellRuleFacts,
                  abilityCheckBehavior: cast.abilityCheckBehavior,
                  access: cast.access,
                  action: cast.action,
                  actionCost: cast.actionCost,
                  damage: cast.damage,
                  expiresAt: cast.expiresAt,
                  procedure: cast.procedure,
                  rangeFeet: cast.rangeFeet,
                  resource,
                  retargetTiming: cast.retargetTiming,
                  targeting: cast.targeting,
                };
          }),
          Match.when({ action: "transfer" }, (transfer) => ({
            action: transfer.action,
            activeEffectRef: transfer.activeEffect.effectRef,
            activeEffectSourceProcedureRef:
              transfer.activeEffect.sourceProcedureRef,
            procedure: transfer.procedure,
          })),
          Match.exhaustive,
        ),
      mirrorImageHitInterception: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        resource: value.resource,
      }),
      moonbeam: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        damage: value.damage,
        dc: value.dc,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        repositionMaxMoveFeet: value.repositionMaxMoveFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      objectContactDamage: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        damage: value.damage,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      objectContactDamageRepeat: (value) => ({
        activeEffectRef: value.activeEffect.effectRef,
        activeEffectSourceProcedureRef: value.activeEffect.sourceProcedureRef,
        procedure: value.procedure,
      }),
      objectLight: (value) =>
        Match.value(value).pipe(
          Match.when({ access: { tag: "classCantrip" } }, (value) => ({
            spellRuleFacts,
            access: value.access,
            actionCost: value.actionCost,
            expiresAt: value.expiresAt,
            light: value.light,
            procedure: value.procedure,
            resource: value.resource,
            targeting: value.targeting,
          })),
          Match.when({ access: { tag: "prepared" } }, (value) => ({
            spellRuleFacts,
            access: value.access,
            actionCost: value.actionCost,
            expiresAt: value.expiresAt,
            light: value.light,
            procedure: value.procedure,
            resource: value.resource,
            targeting: value.targeting,
          })),
          Match.exhaustive,
        ),
      ongoingSpellEnd: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
      }),
      persistentArmorEffect: (value) =>
        Match.value(value).pipe(
          Match.when({ access: { tag: "prepared" } }, (value) => ({
            spellRuleFacts,
            access: value.access,
            activeEffect: value.activeEffect,
            procedure: value.procedure,
            rangeFeet: value.rangeFeet,
            resource: value.resource,
          })),
          Match.when({ access: { tag: "armorOfShadows" } }, (value) => ({
            spellRuleFacts,
            access: value.access,
            activeEffect: value.activeEffect,
            procedure: value.procedure,
            rangeFeet: value.rangeFeet,
            resource: value.resource,
          })),
          Match.exhaustive,
        ),
      repeatedDamageAllocation: (value) => ({
        spellRuleFacts,
        access: value.access,
        damage: value.damage,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      rollModifier: (value) =>
        "abilityChoiceApplication" in value
          ? {
              spellRuleFacts,
              abilityChoiceApplication: value.abilityChoiceApplication,
              abilityChoices: value.abilityChoices,
              access: value.access,
              actionCost: value.actionCost,
              effect: value.effect,
              procedure: value.procedure,
              rangeFeet: value.rangeFeet,
              resource: value.resource,
              saveGate: value.saveGate,
              skillChoices: value.skillChoices,
              targeting: value.targeting,
            }
          : {
              spellRuleFacts,
              abilityChoices: value.abilityChoices,
              access: value.access,
              actionCost: value.actionCost,
              effect: value.effect,
              procedure: value.procedure,
              rangeFeet: value.rangeFeet,
              resource: value.resource,
              saveGate: value.saveGate,
              skillChoices: value.skillChoices,
              targeting: value.targeting,
            },
      sanctuaryTargetingInterdiction: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      saveGatedAttackRollAdvantage: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        dc: value.dc,
        effect: value.effect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      saveGatedCondition: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        dc: value.dc,
        effect: value.effect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        saveRollModeRule: value.saveRollModeRule,
        targetCreatureTypes: value.targetCreatureTypes,
        targeting: value.targeting,
      }),
      saveGatedConditionImmunity: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        actionCost: value.actionCost,
        activeEffects: value.activeEffects,
        dc: value.dc,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targetCreatureTypes: value.targetCreatureTypes,
        targeting: value.targeting,
      }),
      saveGatedDamage: (value) =>
        Match.value(value).pipe(
          Match.when({ access: { tag: "classCantrip" } }, (value) => ({
            spellRuleFacts,
            ability: value.ability,
            access: value.access,
            additionalDamageComponents: value.additionalDamageComponents,
            castingTime: value.castingTime,
            damage: value.damage,
            dc: value.dc,
            failedSaveAbilityChoices: value.failedSaveAbilityChoices,
            failedSaveConditionEffects: value.failedSaveConditionEffects,
            failedSavePostDamageRiders: value.failedSavePostDamageRiders,
            postSaveAreaEffect: value.postSaveAreaEffect,
            procedure: value.procedure,
            rangeFeet: value.rangeFeet,
            resource: value.resource,
            saveRollModeRule: value.saveRollModeRule,
            successDamage: value.successDamage,
            targeting: value.targeting,
          })),
          Match.when({ access: { tag: "prepared" } }, (value) => ({
            spellRuleFacts,
            ability: value.ability,
            access: value.access,
            additionalDamageComponents: value.additionalDamageComponents,
            castingTime: value.castingTime,
            damage: value.damage,
            dc: value.dc,
            failedSaveAbilityChoices: value.failedSaveAbilityChoices,
            failedSaveConditionEffects: value.failedSaveConditionEffects,
            failedSavePostDamageRiders: value.failedSavePostDamageRiders,
            postSaveAreaEffect: value.postSaveAreaEffect,
            procedure: value.procedure,
            rangeFeet: value.rangeFeet,
            resource: value.resource,
            saveRollModeRule: value.saveRollModeRule,
            successDamage: value.successDamage,
            targeting: value.targeting,
          })),
          Match.exhaustive,
        ),
      scalarBuff: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        effect: value.effect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      seeInvisibleObserverSight: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        resource: value.resource,
      }),
      selfTeleport: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        maxDistanceFeet: value.maxDistanceFeet,
        procedure: value.procedure,
        resource: value.resource,
      }),
      selfTransformationMode: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        expiresAt: value.expiresAt,
        modeChoices: value.modeChoices,
        naturalWeaponFacts: value.naturalWeaponFacts,
        procedure: value.procedure,
        resource: value.resource,
      }),
      shieldReaction: (value) => ({
        spellRuleFacts,
        access: value.access,
        armorClassBonus: value.armorClassBonus,
        negatesRepeatedDamageAllocation: value.negatesRepeatedDamageAllocation,
        procedure: value.procedure,
        resource: value.resource,
      }),
      sleepTargetAdmission: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        dc: value.dc,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      sleetStormAreaHazard: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        dc: value.dc,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      slowActivePenalties: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        actionCost: value.actionCost,
        dc: value.dc,
        durationTicks: value.durationTicks,
        maxTargets: value.maxTargets,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      spellAttackDamage: (value) =>
        Match.value(value).pipe(
          Match.when({ access: { tag: "classCantrip" } }, (value) => ({
            spellRuleFacts,
            access: value.access,
            attackBonus: value.attackBonus,
            attackKind: value.attackKind,
            damage: value.damage,
            laterDamage: value.laterDamage,
            missDamage: value.missDamage,
            objectHitEffect: value.objectHitEffect,
            postDamageRiders: value.postDamageRiders,
            procedure: value.procedure,
            rangeFeet: value.rangeFeet,
            resource: value.resource,
            targeting: value.targeting,
          })),
          Match.when({ access: { tag: "prepared" } }, (value) => ({
            spellRuleFacts,
            access: value.access,
            attackBonus: value.attackBonus,
            attackKind: value.attackKind,
            damage: value.damage,
            laterDamage: value.laterDamage,
            missDamage: value.missDamage,
            objectHitEffect: value.objectHitEffect,
            postDamageRiders: value.postDamageRiders,
            procedure: value.procedure,
            rangeFeet: value.rangeFeet,
            resource: value.resource,
            targeting: value.targeting,
          })),
          Match.exhaustive,
        ),
      spellAttackSequence: (value) =>
        Match.value(value).pipe(
          Match.when({ access: { tag: "classCantrip" } }, (value) => ({
            spellRuleFacts,
            access: value.access,
            attackBonus: value.attackBonus,
            attackKind: value.attackKind,
            damage: value.damage,
            procedure: value.procedure,
            rangeFeet: value.rangeFeet,
            resource: value.resource,
            targeting: value.targeting,
          })),
          Match.when({ access: { tag: "prepared" } }, (value) => ({
            spellRuleFacts,
            access: value.access,
            attackBonus: value.attackBonus,
            attackKind: value.attackKind,
            damage: value.damage,
            procedure: value.procedure,
            rangeFeet: value.rangeFeet,
            resource: value.resource,
            targeting: value.targeting,
          })),
          Match.exhaustive,
        ),
      spellCreatedHeldObject: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        resource: value.resource,
      }),
      spellCreatedHeldObjectAttack: (value) => ({
        spellRuleFacts,
        access: value.access,
        sourceEffectRef: value.sourceEffectRef,
        sourceHeldObjectProcedureRef: value.sourceHeldObjectProcedureRef,
        attackBonus: value.attackBonus,
        attackKind: value.attackKind,
        damage: value.damage,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      spellCreatedHeldObjectReEvoke: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        sourceEffectRef: value.sourceEffectRef,
        sourceHeldObjectProcedureRef: value.sourceHeldObjectProcedureRef,
        procedure: value.procedure,
        resource: value.resource,
      }),
      spellHostedWeaponAttack: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        attackBonus: value.attackBonus,
        bonusDamage: value.bonusDamage,
        componentWeaponItemId: value.componentWeapon.itemId,
        damageTypeChoices: value.damageTypeChoices,
        procedure: value.procedure,
        resource: value.resource,
        spellcastingAbilityModifier: value.spellcastingAbilityModifier,
      }),
      spikeGrowthMovementHazard: (value) => ({
        spellRuleFacts,
        access: value.access,
        damage: value.damage,
        damagePerFeet: value.damagePerFeet,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      spiritualWeaponAttackProxy: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        attackBonus: value.attackBonus,
        attackKind: value.attackKind,
        damage: value.damage,
        durationTicks: value.durationTicks,
        forceReachFeet: value.forceReachFeet,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        repeatMoveMaxFeet: value.repeatMoveMaxFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      spiritualWeaponRepeatAttack: (value) => ({
        activeEffectRef: value.activeEffect.effectRef,
        activeEffectSourceProcedureRef: value.activeEffect.sourceProcedureRef,
        procedure: value.procedure,
      }),
      thaumaturgyBoomingVoice: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
      }),
      wardingBond: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        connectionRangeFeet: value.connectionRangeFeet,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
      }),
      weaponAttackOverride: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        attachedWeaponItemId: value.attachedWeapon.itemId,
        procedure: value.procedure,
        resource: value.resource,
      }),
      weaponDamageRider: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        resource: value.resource,
      }),
      webRestraintHazard: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        dc: value.dc,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
    }),
  );
}

export type SpellProcedureExecutionContext = {
  readonly resourcePoolRefsByUnitId: ReadonlyMap<
    UnitRecord["id"],
    BattleResourcePoolExecutionRef
  >;
};

export function spellProcedureExecutionContext(
  ownership: readonly {
    readonly unit: Pick<UnitRecord, "id">;
    readonly resourcePoolRef: BattleResourcePoolExecutionRef;
  }[],
): SpellProcedureExecutionContext {
  return {
    resourcePoolRefsByUnitId: new Map(
      ownership.map((resource) => [resource.unit.id, resource.resourcePoolRef]),
    ),
  };
}

const EMPTY_SPELL_PROCEDURE_EXECUTION_CONTEXT: SpellProcedureExecutionContext =
  {
    resourcePoolRefsByUnitId: new Map(),
  };

function classFeatureSpellInvocationResourceExecution(
  resource: AfterHitDamageSpellInvocation["resource"],
): AfterHitDamageSpellProcedureExecution["resource"] | undefined {
  return Match.value(resource).pipe(
    Match.discriminatorsExhaustive("tag")({
      spellSlot: (value) => value,
      classFeatureFreeCast: (value) => value,
    }),
  );
}

function sameSpellProcedureExecution(
  left: SpellProcedureExecution,
  right: SpellProcedureExecution,
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("procedure")({
      abilityD20TestRollModeSaveGate: (value) =>
        right.procedure === value.procedure &&
        sameAbilityD20TestRollModeSaveGateExecution(value, right),
      afterHitDamage: (value) =>
        right.procedure === value.procedure &&
        sameAfterHitDamageExecution(value, right),
      afterHitDamageAndIllumination: (value) =>
        right.procedure === value.procedure &&
        sameAfterHitDamageAndIlluminationExecution(value, right),
      afterHitSaveGatedCondition: (value) =>
        right.procedure === value.procedure &&
        sameAfterHitSaveGatedConditionExecution(value, right),
      afterHitTimedDamageAndSave: (value) =>
        right.procedure === value.procedure &&
        sameAfterHitTimedDamageAndSaveExecution(value, right),
      antimagicFieldOngoingSpellSuppression: (value) =>
        right.procedure === value.procedure &&
        sameAntimagicFieldOngoingSpellSuppressionExecution(value, right),
      attackBurstSaveDamage: (value) =>
        right.procedure === value.procedure &&
        sameAttackBurstSaveDamageExecution(value, right),
      blurAttackRollDefense: (value) =>
        right.procedure === value.procedure &&
        sameBlurAttackRollDefenseExecution(value, right),
      chainedSpellAttackDamage: (value) =>
        right.procedure === value.procedure &&
        sameChainedSpellAttackDamageExecution(value, right),
      chosenDamageResistance: (value) =>
        right.procedure === value.procedure &&
        sameChosenDamageResistanceExecution(value, right),
      cloudkillAreaHazard: (value) =>
        right.procedure === value.procedure &&
        sameCloudkillAreaHazardExecution(value, right),
      command: (value) =>
        right.procedure === value.procedure &&
        sameCommandExecution(value, right),
      conditionImmunityAndTurnStartTemporaryHitPoints: (value) =>
        right.procedure === value.procedure &&
        sameConditionImmunityAndTurnStartTemporaryHitPointsExecution(
          value,
          right,
        ),
      conditionRemovalProtection: (value) =>
        right.procedure === value.procedure &&
        sameConditionRemovalProtectionExecution(value, right),
      counterspell: (value) =>
        right.procedure === value.procedure &&
        sameCounterspellExecution(value, right),
      creatureSizeDecrease: (value) =>
        right.procedure === value.procedure &&
        sameCreatureSizeDecreaseExecution(value, right),
      creatureSizeIncrease: (value) =>
        right.procedure === value.procedure &&
        sameCreatureSizeIncreaseExecution(value, right),
      creatureTypeProtection: (value) =>
        right.procedure === value.procedure &&
        sameCreatureTypeProtectionExecution(value, right),
      damageReduction: (value) =>
        right.procedure === value.procedure &&
        sameDamageReductionExecution(value, right),
      dancingLightsCombinedCast: (value) =>
        right.procedure === value.procedure &&
        sameDancingLightsCombinedCastExecution(value, right),
      dancingLightsReposition: (value) =>
        right.procedure === value.procedure &&
        sameDancingLightsRepositionExecution(value, right),
      dancingLightsSeparateCast: (value) =>
        right.procedure === value.procedure &&
        sameDancingLightsSeparateCastExecution(value, right),
      directCondition: (value) =>
        right.procedure === value.procedure &&
        sameDirectConditionExecution(value, right),
      directConditionRemoval: (value) =>
        right.procedure === value.procedure &&
        sameDirectConditionRemovalExecution(value, right),
      directHitPointRestoration: (value) =>
        right.procedure === value.procedure &&
        sameDirectHitPointRestorationExecution(value, right),
      dragonsBreathInitial: (value) =>
        right.procedure === value.procedure &&
        sameDragonsBreathInitialExecution(value, right),
      expeditiousRetreatDash: (value) =>
        right.procedure === value.procedure &&
        sameExpeditiousRetreatDashExecution(value, right),
      featherFallMitigation: (value) =>
        right.procedure === value.procedure &&
        sameFeatherFallMitigationExecution(value, right),
      flamingSphere: (value) =>
        right.procedure === value.procedure &&
        sameFlamingSphereExecution(value, right),
      fogCloudObscurement: (value) =>
        right.procedure === value.procedure &&
        sameFogCloudObscurementExecution(value, right),
      greaseGroundHazard: (value) =>
        right.procedure === value.procedure &&
        sameGreaseGroundHazardExecution(value, right),
      gustOfWindLine: (value) =>
        right.procedure === value.procedure &&
        sameGustOfWindLineExecution(value, right),
      hastePositive: (value) =>
        right.procedure === value.procedure &&
        sameHastePositiveExecution(value, right),
      heldLight: (value) =>
        right.procedure === value.procedure &&
        sameHeldLightExecution(value, right),
      heldLightHurl: (value) =>
        right.procedure === value.procedure &&
        sameHeldLightHurlExecution(value, right),
      hideousLaughter: (value) =>
        right.procedure === value.procedure &&
        sameHideousLaughterExecution(value, right),
      hypnoticPattern: (value) =>
        right.procedure === value.procedure &&
        sameHypnoticPatternExecution(value, right),
      insectPlagueAreaHazard: (value) =>
        right.procedure === value.procedure &&
        sameInsectPlagueAreaHazardExecution(value, right),
      jumpMovementReplacement: (value) =>
        right.procedure === value.procedure &&
        sameJumpMovementReplacementExecution(value, right),
      levitatedCreature: (value) =>
        right.procedure === value.procedure &&
        sameLevitatedCreatureExecution(value, right),
      magicalDarknessPointOrigin: (value) =>
        right.procedure === value.procedure &&
        sameMagicalDarknessPointOriginExecution(value, right),
      magicWeaponEnhancement: (value) =>
        right.procedure === value.procedure &&
        sameMagicWeaponEnhancementExecution(value, right),
      makeStable: (value) =>
        right.procedure === value.procedure &&
        sameMakeStableExecution(value, right),
      markedDamageRider: (value) =>
        right.procedure === value.procedure &&
        sameMarkedDamageRiderExecution(value, right),
      mirrorImageHitInterception: (value) =>
        right.procedure === value.procedure &&
        sameMirrorImageHitInterceptionExecution(value, right),
      moonbeam: (value) =>
        right.procedure === value.procedure &&
        sameMoonbeamExecution(value, right),
      objectContactDamage: (value) =>
        right.procedure === value.procedure &&
        sameObjectContactDamageExecution(value, right),
      objectContactDamageRepeat: (value) =>
        right.procedure === value.procedure &&
        sameObjectContactDamageRepeatExecution(value, right),
      objectLight: (value) =>
        right.procedure === value.procedure &&
        sameObjectLightExecution(value, right),
      ongoingSpellEnd: (value) =>
        right.procedure === value.procedure &&
        sameOngoingSpellEndExecution(value, right),
      persistentArmorEffect: (value) =>
        right.procedure === value.procedure &&
        samePersistentArmorEffectExecution(value, right),
      repeatedDamageAllocation: (value) =>
        right.procedure === value.procedure &&
        sameRepeatedDamageAllocationExecution(value, right),
      rollModifier: (value) =>
        right.procedure === value.procedure &&
        sameRollModifierExecution(value, right),
      sanctuaryTargetingInterdiction: (value) =>
        right.procedure === value.procedure &&
        sameSanctuaryTargetingInterdictionExecution(value, right),
      saveGatedAttackRollAdvantage: (value) =>
        right.procedure === value.procedure &&
        sameSaveGatedAttackRollAdvantageExecution(value, right),
      saveGatedCondition: (value) =>
        right.procedure === value.procedure &&
        sameSaveGatedConditionExecution(value, right),
      saveGatedConditionImmunity: (value) =>
        right.procedure === value.procedure &&
        sameSaveGatedConditionImmunityExecution(value, right),
      saveGatedDamage: (value) =>
        right.procedure === value.procedure &&
        sameSaveGatedDamageExecution(value, right),
      scalarBuff: (value) =>
        right.procedure === value.procedure &&
        sameScalarBuffExecution(value, right),
      seeInvisibleObserverSight: (value) =>
        right.procedure === value.procedure &&
        sameSeeInvisibleObserverSightExecution(value, right),
      selfTeleport: (value) =>
        right.procedure === value.procedure &&
        sameSelfTeleportExecution(value, right),
      selfTransformationMode: (value) =>
        right.procedure === value.procedure &&
        sameSelfTransformationModeExecution(value, right),
      shieldReaction: (value) =>
        right.procedure === value.procedure &&
        sameShieldReactionExecution(value, right),
      sleepTargetAdmission: (value) =>
        right.procedure === value.procedure &&
        sameSleepTargetAdmissionExecution(value, right),
      sleetStormAreaHazard: (value) =>
        right.procedure === value.procedure &&
        sameSleetStormAreaHazardExecution(value, right),
      slowActivePenalties: (value) =>
        right.procedure === value.procedure &&
        sameSlowActivePenaltiesExecution(value, right),
      spellAttackDamage: (value) =>
        right.procedure === value.procedure &&
        sameSpellAttackDamageExecution(value, right),
      spellAttackSequence: (value) =>
        right.procedure === value.procedure &&
        sameSpellAttackSequenceExecution(value, right),
      spellCreatedHeldObject: (value) =>
        right.procedure === value.procedure &&
        sameSpellCreatedHeldObjectExecution(value, right),
      spellCreatedHeldObjectAttack: (value) =>
        right.procedure === value.procedure &&
        sameSpellCreatedHeldObjectAttackExecution(value, right),
      spellCreatedHeldObjectReEvoke: (value) =>
        right.procedure === value.procedure &&
        sameSpellCreatedHeldObjectReEvokeExecution(value, right),
      spellHostedWeaponAttack: (value) =>
        right.procedure === value.procedure &&
        sameSpellHostedWeaponAttackExecution(value, right),
      spikeGrowthMovementHazard: (value) =>
        right.procedure === value.procedure &&
        sameSpikeGrowthMovementHazardExecution(value, right),
      spiritualWeaponAttackProxy: (value) =>
        right.procedure === value.procedure &&
        sameSpiritualWeaponAttackProxyExecution(value, right),
      spiritualWeaponRepeatAttack: (value) =>
        right.procedure === value.procedure &&
        sameSpiritualWeaponRepeatAttackExecution(value, right),
      thaumaturgyBoomingVoice: (value) =>
        right.procedure === value.procedure &&
        sameThaumaturgyBoomingVoiceExecution(value, right),
      wardingBond: (value) =>
        right.procedure === value.procedure &&
        sameWardingBondExecution(value, right),
      weaponAttackOverride: (value) =>
        right.procedure === value.procedure &&
        sameWeaponAttackOverrideExecution(value, right),
      weaponDamageRider: (value) =>
        right.procedure === value.procedure &&
        sameWeaponDamageRiderExecution(value, right),
      webRestraintHazard: (value) =>
        right.procedure === value.procedure &&
        sameWebRestraintHazardExecution(value, right),
    }),
  );
}

export function characterSpellProcedure(
  execution: CharacterExecutionState,
  procedureRef: BattleProcedureExecutionRef,
  liveActor?: {
    readonly combatantId: CombatantId;
    readonly activeEffects: readonly BattleActiveEffect[];
  },
): BattleSpellProcedureExecution | undefined {
  const binding = execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === procedureRef,
  );
  if (binding?.procedure.kind !== "spellInvocation") return undefined;
  const executable = executableSpellProcedureFromLiveEffects(
    execution,
    binding.procedure.execution,
    liveActor,
  );
  if (executable === undefined) return undefined;
  return {
    ...executable,
    sourceProcedureRef: procedureRef,
  };
}

function executableSpellProcedureFromLiveEffects(
  execution: CharacterExecutionState,
  stored: SpellProcedureExecution,
  liveActor:
    | {
        readonly combatantId: CombatantId;
        readonly activeEffects: readonly BattleActiveEffect[];
      }
    | undefined,
): SpellExecutableExecutionOf<SpellProcedureExecution> | undefined {
  if (
    stored.procedure === "markedDamageRider" &&
    stored.action === "transfer"
  ) {
    if (liveActor === undefined) return undefined;
    const source = characterSpellProcedureExecution(
      execution,
      stored.activeEffectSourceProcedureRef,
    );
    const activeEffect = liveActor.activeEffects.find(
      (
        effect,
      ): effect is Extract<
        BattleActiveEffect,
        { readonly kind: "spellMarkedDamageRider" }
      > =>
        effect.kind === "spellMarkedDamageRider" &&
        effect.effectRef === stored.activeEffectRef &&
        effect.sourceProcedureRef === stored.activeEffectSourceProcedureRef &&
        effect.sourceCombatantId === liveActor.combatantId,
    );
    return activeEffect !== undefined &&
      source?.procedure === "markedDamageRider" &&
      source.action === "cast"
      ? {
          spellRuleFacts: source.spellRuleFacts,
          access: {
            tag: "spellEffect",
            sourceCombatantId: liveActor.combatantId,
          },
          resource: { tag: "none" },
          procedure: stored.procedure,
          action: stored.action,
          actionCost: "bonusAction",
          activeEffect,
          rangeFeet: source.rangeFeet,
          targeting: { kind: "singleCombatant" },
        }
      : undefined;
  }
  if (stored.procedure === "objectContactDamageRepeat") {
    if (liveActor === undefined) return undefined;
    const source = characterSpellProcedureExecution(
      execution,
      stored.activeEffectSourceProcedureRef,
    );
    const activeEffect = liveActor.activeEffects.find(
      (
        effect,
      ): effect is Extract<
        BattleActiveEffect,
        { readonly kind: "spellObjectContactDamage" }
      > =>
        effect.kind === "spellObjectContactDamage" &&
        effect.effectRef === stored.activeEffectRef &&
        effect.sourceProcedureRef === stored.activeEffectSourceProcedureRef &&
        effect.sourceCombatantId === liveActor.combatantId,
    );
    return activeEffect !== undefined &&
      source?.procedure === "objectContactDamage"
      ? {
          spellRuleFacts: source.spellRuleFacts,
          access: {
            tag: "spellEffect",
            sourceCombatantId: liveActor.combatantId,
          },
          resource: { tag: "none" },
          procedure: stored.procedure,
          actionCost: "bonusAction",
          activeEffect,
        }
      : undefined;
  }
  if (stored.procedure === "spiritualWeaponRepeatAttack") {
    if (liveActor === undefined) return undefined;
    const source = characterSpellProcedureExecution(
      execution,
      stored.activeEffectSourceProcedureRef,
    );
    const activeEffect = liveActor.activeEffects.find(
      (
        effect,
      ): effect is Extract<
        BattleActiveEffect,
        { readonly kind: "spiritualWeapon" }
      > =>
        effect.kind === "spiritualWeapon" &&
        effect.effectRef === stored.activeEffectRef &&
        effect.sourceProcedureRef === stored.activeEffectSourceProcedureRef &&
        effect.sourceCombatantId === liveActor.combatantId,
    );
    return activeEffect !== undefined &&
      source?.procedure === "spiritualWeaponAttackProxy"
      ? {
          spellRuleFacts: source.spellRuleFacts,
          access: {
            tag: "spellEffect",
            sourceCombatantId: liveActor.combatantId,
          },
          resource: { tag: "none" },
          procedure: stored.procedure,
          actionCost: "bonusAction",
          activeEffect,
          targeting: { kind: "singleCombatant" },
          damage: activeEffect.damage,
          attackKind: activeEffect.attackKind,
          attackBonus: activeEffect.attackBonus,
          forceReachFeet: activeEffect.forceReachFeet,
          repeatMoveMaxFeet: activeEffect.repeatMoveMaxFeet,
        }
      : undefined;
  }
  return stored;
}

export function characterSpellSelectionInvocation(
  execution: CharacterExecutionState,
  procedureRef: BattleProcedureExecutionRef,
  invocations: readonly SupportedSpellInvocation[],
  context: SpellProcedureExecutionContext = EMPTY_SPELL_PROCEDURE_EXECUTION_CONTEXT,
): BattleSelectedSpellInvocation | undefined {
  const storedExecution = characterSpellProcedureExecution(
    execution,
    procedureRef,
  );
  if (storedExecution === undefined) return undefined;
  const invocation = invocations.find((candidate) =>
    spellInvocationMatchesExecution(candidate, storedExecution, context),
  );
  return invocation === undefined
    ? undefined
    : bindSelectedSpellInvocation(invocation, procedureRef);
}

export function characterSpellProcedureExecution(
  execution: CharacterExecutionState,
  procedureRef: BattleProcedureExecutionRef,
): SpellProcedureExecution | undefined {
  const binding = characterProcedureBinding(execution, procedureRef);
  return binding?.procedure.kind === "spellInvocation"
    ? binding.procedure.execution
    : undefined;
}

export function bindStoredSpellProcedureExecutionFacts<
  I extends SpellProcedureExecution,
>(
  execution: I,
  procedureRef: BattleProcedureExecutionRef,
): I & { readonly sourceProcedureRef: BattleProcedureExecutionRef } {
  return { ...execution, sourceProcedureRef: procedureRef };
}

export function bindSelectedSpellInvocation<I extends SupportedSpellInvocation>(
  invocation: I,
  procedureRef: BattleProcedureExecutionRef,
): BattleSelectedSpellInvocation<I> {
  return { ...invocation, sourceProcedureRef: procedureRef };
}
