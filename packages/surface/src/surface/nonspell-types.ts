import type { Brand } from "effect";
import type {
  Ability,
  StandardActionKind,
  UnitId,
} from "@dnd/shared/game-facts";
import type { AbilityScore } from "@dnd/shared/types";

import type { MagicInitiateSpellList } from "./nonspell-vocabulary.ts";

type NonspellSupportValue = object | string | number | boolean;

export type NonspellTypeSupport = {
  readonly ActivationPhase: NonspellSupportValue;
  readonly ActivationPhaseEncoded: unknown;
  readonly CreatureControl: NonspellSupportValue;
  readonly CreatureControlEncoded: NonspellSupportValue;
  readonly CreatureDismissal: NonspellSupportValue;
  readonly CreatureDismissalEncoded: NonspellSupportValue;
  readonly CreatureMode: NonspellSupportValue;
  readonly CreatureModeEncoded: NonspellSupportValue;
  readonly EffectAtom: NonspellSupportValue;
  readonly EffectAtomEncoded: unknown;
  readonly OngoingPredicate: NonspellSupportValue;
  readonly OngoingPredicateEncoded: NonspellSupportValue;
  readonly Range: NonspellSupportValue;
  readonly RangeEncoded: NonspellSupportValue;
  readonly ReactionTrigger: NonspellSupportValue;
  readonly ReactionTriggerEncoded: unknown;
  readonly SpellRecord: NonspellSupportValue;
  readonly SpellRecordEncoded: NonspellSupportValue;
  readonly SpawnedCreatureStatBlock: NonspellSupportValue;
  readonly SpawnedCreatureStatBlockEncoded: NonspellSupportValue;
  readonly AbjureFoesMechanics: NonspellSupportValue;
  readonly AbjureFoesMechanicsEncoded: NonspellSupportValue;
  readonly AcrobaticMovementMechanics: NonspellSupportValue;
  readonly AcrobaticMovementMechanicsEncoded: NonspellSupportValue;
  readonly AlternateActionCostMechanics: NonspellSupportValue;
  readonly AlternateActionCostMechanicsEncoded: NonspellSupportValue;
  readonly ActivationResource: NonspellSupportValue;
  readonly ActivationResourceEncoded: NonspellSupportValue;
  readonly ArmorRecord: NonspellSupportValue;
  readonly ArmorRecordEncoded: NonspellSupportValue;
  readonly BackgroundRecord: NonspellSupportValue;
  readonly BackgroundRecordEncoded: NonspellSupportValue;
  readonly BonusActionDelegatedStandardActionsMechanics: NonspellSupportValue;
  readonly BonusActionDelegatedStandardActionsMechanicsEncoded: NonspellSupportValue;
  readonly BrutalStrikeMechanics: NonspellSupportValue;
  readonly BrutalStrikeMechanicsEncoded: NonspellSupportValue;
  readonly ClassFeatureActivationCost: NonspellSupportValue;
  readonly ClassFeatureActivationCostEncoded: NonspellSupportValue;
  readonly ClassFeatureDuration: NonspellSupportValue;
  readonly ClassFeatureDurationEncoded: unknown;
  readonly ClassFeatureResourceContainerMechanics: NonspellSupportValue;
  readonly ClassFeatureResourceContainerMechanicsEncoded: NonspellSupportValue;
  readonly ClassFeatureResourcePoolMechanics: NonspellSupportValue;
  readonly ClassFeatureResourcePoolMechanicsEncoded: NonspellSupportValue;
  readonly ClassSpellcastingProjectionMechanics: NonspellSupportValue;
  readonly ClassSpellcastingProjectionMechanicsEncoded: NonspellSupportValue;
  readonly MasteryRecord: NonspellSupportValue;
  readonly MasteryRecordEncoded: NonspellSupportValue;
  readonly CombatTurnStartHeroicInspirationMechanics: NonspellSupportValue;
  readonly CombatTurnStartHeroicInspirationMechanicsEncoded: NonspellSupportValue;
  readonly CunningStrikeMechanics: NonspellSupportValue;
  readonly CunningStrikeMechanicsEncoded: NonspellSupportValue;
  readonly DruidWildCompanionSpellCastMechanics: NonspellSupportValue;
  readonly DruidWildCompanionSpellCastMechanicsEncoded: NonspellSupportValue;
  readonly D20TestNaturalOneRerollMechanics: NonspellSupportValue;
  readonly D20TestNaturalOneRerollMechanicsEncoded: NonspellSupportValue;
  readonly EnemyZeroHitPointTemporaryHitPointsMechanics: NonspellSupportValue;
  readonly EnemyZeroHitPointTemporaryHitPointsMechanicsEncoded: NonspellSupportValue;
  readonly EquipmentPredicate: NonspellSupportValue;
  readonly EquipmentPredicateEncoded: NonspellSupportValue;
  readonly FailedAbilityCheckResourceBoostMechanics: NonspellSupportValue;
  readonly FailedAbilityCheckResourceBoostMechanicsEncoded: NonspellSupportValue;
  readonly FeatureChoiceMechanics: NonspellSupportValue;
  readonly FeatureChoiceMechanicsEncoded: NonspellSupportValue;
  readonly GnomishLineageMechanics: NonspellSupportValue;
  readonly GnomishLineageMechanicsEncoded: NonspellSupportValue;
  readonly HideActionObscurementPermissionMechanics: NonspellSupportValue;
  readonly HideActionObscurementPermissionMechanicsEncoded: NonspellSupportValue;
  readonly HuntersPreyMechanics: NonspellSupportValue;
  readonly HuntersPreyMechanicsEncoded: NonspellSupportValue;
  readonly IndomitableMechanics: NonspellSupportValue;
  readonly IndomitableMechanicsEncoded: NonspellSupportValue;
  readonly LightExtraAttackDamageAbilityModifierMechanics: NonspellSupportValue;
  readonly LightExtraAttackDamageAbilityModifierMechanicsEncoded: NonspellSupportValue;
  readonly MagicActionAreaSaveDamageHealingMechanics: NonspellSupportValue;
  readonly MagicActionAreaSaveDamageHealingMechanicsEncoded: NonspellSupportValue;
  readonly MagicActionHealingPoolMechanics: NonspellSupportValue;
  readonly MagicActionHealingPoolMechanicsEncoded: NonspellSupportValue;
  readonly MagicItemAttunement: NonspellSupportValue;
  readonly MagicItemAttunementEncoded: NonspellSupportValue;
  readonly MagicItemAttunementRestriction: NonspellSupportValue;
  readonly MagicItemAttunementRestrictionEncoded: NonspellSupportValue;
  readonly MasteryOrWeaponDamageDiceRerollMechanics: NonspellSupportValue;
  readonly MasteryOrWeaponDamageDiceRerollMechanicsEncoded: NonspellSupportValue;
  readonly MonkInitiativeFocusRecoveryMechanics: NonspellSupportValue;
  readonly MonkInitiativeFocusRecoveryMechanicsEncoded: NonspellSupportValue;
  readonly OnHitTriggerMechanics: NonspellSupportValue;
  readonly OnHitTriggerMechanicsEncoded: NonspellSupportValue;
  readonly OpenHandTechniqueMechanics: NonspellSupportValue;
  readonly OpenHandTechniqueMechanicsEncoded: NonspellSupportValue;
  readonly PotentCantripMechanics: NonspellSupportValue;
  readonly PotentCantripMechanicsEncoded: NonspellSupportValue;
  readonly PreparedSpellListExpansionMechanics: NonspellSupportValue;
  readonly PreparedSpellListExpansionMechanicsEncoded: NonspellSupportValue;
  readonly CreatureSpaceMovementPermissionMechanics: NonspellSupportValue;
  readonly CreatureSpaceMovementPermissionMechanicsEncoded: NonspellSupportValue;
  readonly RemarkableAthleteMechanics: NonspellSupportValue;
  readonly RemarkableAthleteMechanicsEncoded: NonspellSupportValue;
  readonly ReactionRollOrDamageReductionMechanics: NonspellSupportValue;
  readonly ReactionRollOrDamageReductionMechanicsEncoded: NonspellSupportValue;
  readonly ResetCadence: NonspellSupportValue;
  readonly ResetCadenceEncoded: NonspellSupportValue;
  readonly RestTriggeredHeroicInspirationMechanics: NonspellSupportValue;
  readonly RestTriggeredHeroicInspirationMechanicsEncoded: NonspellSupportValue;
  readonly RestSpellSlotRecoveryMechanics: NonspellSupportValue;
  readonly RestSpellSlotRecoveryMechanicsEncoded: NonspellSupportValue;
  readonly NonWizardClassRecord: NonspellSupportValue;
  readonly NonWizardClassRecordEncoded: NonspellSupportValue;
  readonly SacredWeaponMechanics: NonspellSupportValue;
  readonly SacredWeaponMechanicsEncoded: NonspellSupportValue;
  readonly SaveDamageReplacementMechanics: NonspellSupportValue;
  readonly SaveDamageReplacementMechanicsEncoded: NonspellSupportValue;
  readonly SorcererMetamagicMechanics: NonspellSupportValue;
  readonly SorcererMetamagicMechanicsEncoded: NonspellSupportValue;
  readonly SorcererSorcerousRestorationMechanics: NonspellSupportValue;
  readonly SorcererSorcerousRestorationMechanicsEncoded: NonspellSupportValue;
  readonly SpellbookRitualAccessMechanics: NonspellSupportValue;
  readonly SpellbookRitualAccessMechanicsEncoded: NonspellSupportValue;
  readonly SpellDamageRollAbilityModifierMechanics: NonspellSupportValue;
  readonly SpellDamageRollAbilityModifierMechanicsEncoded: NonspellSupportValue;
  readonly SpellSlotHealingModifierMechanics: NonspellSupportValue;
  readonly SpellSlotHealingModifierMechanicsEncoded: NonspellSupportValue;
  readonly SteadyAimMechanics: NonspellSupportValue;
  readonly SteadyAimMechanicsEncoded: NonspellSupportValue;
  readonly StunningStrikeMechanics: NonspellSupportValue;
  readonly StunningStrikeMechanicsEncoded: NonspellSupportValue;
  readonly SupremeSneakMechanics: NonspellSupportValue;
  readonly SupremeSneakMechanicsEncoded: NonspellSupportValue;
  readonly TacticalMasterMechanics: NonspellSupportValue;
  readonly TacticalMasterMechanicsEncoded: NonspellSupportValue;
  readonly TriggeredReplacementMechanics: NonspellSupportValue;
  readonly TriggeredReplacementMechanicsEncoded: NonspellSupportValue;
  readonly ShieldRecord: NonspellSupportValue;
  readonly ShieldRecordEncoded: NonspellSupportValue;
  readonly SpeciesRecord: NonspellSupportValue;
  readonly SpeciesRecordEncoded: NonspellSupportValue;
  readonly SubclassRecord: NonspellSupportValue;
  readonly SubclassRecordEncoded: NonspellSupportValue;
  readonly WarlockPactSlotRecoveryMechanics: NonspellSupportValue;
  readonly WarlockPactSlotRecoveryMechanicsEncoded: NonspellSupportValue;
  readonly WeaponMasteryChoiceMechanics: NonspellSupportValue;
  readonly WeaponMasteryChoiceMechanicsEncoded: NonspellSupportValue;
  readonly WeaponAttackDamageDieFloorMechanics: NonspellSupportValue;
  readonly WeaponAttackDamageDieFloorMechanicsEncoded: NonspellSupportValue;
  readonly WeaponRecord: NonspellSupportValue;
  readonly WeaponRecordEncoded: NonspellSupportValue;
  readonly WizardClassRecord: NonspellSupportValue;
  readonly WizardClassRecordEncoded: NonspellSupportValue;
  readonly ItemDestructionPolicy: NonspellSupportValue;
  readonly ItemDestructionPolicyEncoded: NonspellSupportValue;
  readonly WizardSpellbookLearningMechanics: NonspellSupportValue;
  readonly WizardSpellbookLearningMechanicsEncoded: NonspellSupportValue;
  readonly ArmorCategory: NonspellSupportValue;
  readonly ArmorCategoryEncoded: NonspellSupportValue;
  readonly Condition: NonspellSupportValue;
  readonly ConditionEncoded: NonspellSupportValue;
  readonly FeatCategory: NonspellSupportValue;
  readonly FeatCategoryEncoded: NonspellSupportValue;
  readonly MagicItemRarity: NonspellSupportValue;
  readonly MagicItemRarityEncoded: NonspellSupportValue;
  readonly WeaponCategory: NonspellSupportValue;
  readonly WeaponCategoryEncoded: NonspellSupportValue;
  readonly Provenance: NonspellSupportValue;
  readonly ProvenanceEncoded: NonspellSupportValue;
};

type SupportType<
  Support extends NonspellTypeSupport,
  Name extends keyof NonspellTypeSupport,
> = Support[Name];

type NonEmptyReadonlyArray<Value> = readonly [Value, ...Value[]];
type OngoingFeatureLifecycle<Support extends NonspellTypeSupport> =
  | {
      readonly kind: "turn_boundary";
      readonly initialExpiration: "start_of_next_turn";
      readonly earlyEndConditions?: ReadonlyArray<
        SupportType<Support, "Condition">
      >;
      readonly earlyEndArmorCategories?: ReadonlyArray<
        SupportType<Support, "ArmorCategory">
      >;
    }
  | {
      readonly kind: "round_extended";
      readonly initialExpiration: "end_of_next_turn";
      readonly earlyEndConditions?: ReadonlyArray<
        SupportType<Support, "Condition">
      >;
      readonly earlyEndArmorCategories?: ReadonlyArray<
        SupportType<Support, "ArmorCategory">
      >;
      readonly extensionTriggers: NonEmptyReadonlyArray<
        "attack_roll_against_enemy" | "bonus_action" | "enemy_saving_throw"
      >;
      readonly maximumDuration: {
        readonly unit: "round" | "minute" | "hour" | "day";
        readonly amount: number;
      };
    }
  | {
      readonly kind: "fixed_duration";
      readonly duration: {
        readonly unit: "round" | "minute" | "hour" | "day";
        readonly amount: number;
      };
      readonly earlyEndConditions?: ReadonlyArray<
        SupportType<Support, "Condition">
      >;
      readonly earlyEndArmorCategories?: ReadonlyArray<
        SupportType<Support, "ArmorCategory">
      >;
    };

type OngoingFeatureSupport<
  Support extends NonspellTypeSupport,
  ActivationTiming extends string,
> = {
  readonly activationTiming: ActivationTiming;
  readonly lifecycle: OngoingFeatureLifecycle<Support>;
  readonly concentrationEffect?: "break_and_prevent";
  readonly actionRestrictions?: ReadonlyArray<"spellcasting">;
  readonly levelOverrides?: ReadonlyArray<{
    readonly atClassLevel: number;
    readonly lifecycle: OngoingFeatureLifecycle<Support>;
  }>;
};

type ActivatedAbilityCommon<
  EquipmentPredicate,
  AbilityRange,
  ActivationResource,
  ResetCadence,
> = {
  readonly condition?: EquipmentPredicate;
  readonly range?: AbilityRange;
  readonly usageLimit?: { readonly kind: "once_per_turn" };
  readonly resource: ActivationResource;
  readonly resetCadence: ResetCadence;
};

type ResourceActivatedAbility<
  EquipmentPredicate,
  AbilityRange,
  ActivationResource,
  ResetCadence,
  ClassFeatureDuration,
  ActivationCost,
  ActivationPhase,
> = ActivatedAbilityCommon<
  EquipmentPredicate,
  AbilityRange,
  ActivationResource,
  ResetCadence
> & {
  readonly duration?: ClassFeatureDuration;
  readonly activationCost: ActivationCost;
  readonly ongoingFeature?: never;
  readonly family: "activation";
  readonly phases: NonEmptyReadonlyArray<ActivationPhase>;
};

type ResourceOngoingFeatureAbility<
  EquipmentPredicate,
  AbilityRange,
  ActivationResource,
  ResetCadence,
  OngoingFeature,
  ActivationPhase,
> = ActivatedAbilityCommon<
  EquipmentPredicate,
  AbilityRange,
  ActivationResource,
  ResetCadence
> & {
  readonly duration?: never;
  readonly activationCost: {
    readonly kind: "bonus_action";
    readonly action?: StandardActionKind;
  };
  readonly ongoingFeature: OngoingFeature;
  readonly family: "activation";
  readonly phases: NonEmptyReadonlyArray<ActivationPhase>;
};

type ResourcelessOngoingFeatureAbility<
  EquipmentPredicate,
  AbilityRange,
  OngoingFeature,
  ActivationPhase,
> = {
  readonly condition?: EquipmentPredicate;
  readonly range?: AbilityRange;
  readonly usageLimit?: { readonly kind: "once_per_turn" };
  readonly resource?: never;
  readonly resetCadence?: never;
  readonly duration?: never;
  readonly activationCost: { readonly kind: "free" };
  readonly ongoingFeature: OngoingFeature;
  readonly family: "activation";
  readonly phases: NonEmptyReadonlyArray<ActivationPhase>;
};

export type ActivatedAbilityMechanics<Support extends NonspellTypeSupport> =
  | ResourceActivatedAbility<
      SupportType<Support, "EquipmentPredicate">,
      SupportType<Support, "Range">,
      SupportType<Support, "ActivationResource">,
      SupportType<Support, "ResetCadence">,
      SupportType<Support, "ClassFeatureDuration">,
      SupportType<Support, "ClassFeatureActivationCost">,
      SupportType<Support, "ActivationPhase">
    >
  | ResourceOngoingFeatureAbility<
      SupportType<Support, "EquipmentPredicate">,
      SupportType<Support, "Range">,
      SupportType<Support, "ActivationResource">,
      SupportType<Support, "ResetCadence">,
      OngoingFeatureSupport<Support, "activation_cost">,
      SupportType<Support, "ActivationPhase">
    >
  | ResourcelessOngoingFeatureAbility<
      SupportType<Support, "EquipmentPredicate">,
      SupportType<Support, "Range">,
      OngoingFeatureSupport<Support, "first_attack_roll">,
      SupportType<Support, "ActivationPhase">
    >;

export type ActivatedAbilityMechanicsEncoded<
  Support extends NonspellTypeSupport,
> =
  | ResourceActivatedAbility<
      SupportType<Support, "EquipmentPredicateEncoded">,
      SupportType<Support, "RangeEncoded">,
      SupportType<Support, "ActivationResourceEncoded">,
      SupportType<Support, "ResetCadenceEncoded">,
      SupportType<Support, "ClassFeatureDurationEncoded">,
      SupportType<Support, "ClassFeatureActivationCostEncoded">,
      SupportType<Support, "ActivationPhaseEncoded">
    >
  | ResourceOngoingFeatureAbility<
      SupportType<Support, "EquipmentPredicateEncoded">,
      SupportType<Support, "RangeEncoded">,
      SupportType<Support, "ActivationResourceEncoded">,
      SupportType<Support, "ResetCadenceEncoded">,
      OngoingFeatureSupport<Support, "activation_cost">,
      SupportType<Support, "ActivationPhaseEncoded">
    >
  | ResourcelessOngoingFeatureAbility<
      SupportType<Support, "EquipmentPredicateEncoded">,
      SupportType<Support, "RangeEncoded">,
      OngoingFeatureSupport<Support, "first_attack_roll">,
      SupportType<Support, "ActivationPhaseEncoded">
    >;

export type PassiveOperation<Support extends NonspellTypeSupport> = {
  readonly trigger: {
    readonly kind: "elapsed_time";
    readonly unit: "hour" | "day";
    readonly amount: number;
  };
  readonly predicate?: SupportType<Support, "OngoingPredicate">;
  readonly effect: SupportType<Support, "EffectAtom">;
};

export type PassiveOperationEncoded<Support extends NonspellTypeSupport> = {
  readonly trigger: {
    readonly kind: "elapsed_time";
    readonly unit: "hour" | "day";
    readonly amount: number;
  };
  readonly predicate?: SupportType<Support, "OngoingPredicateEncoded">;
  readonly effect: SupportType<Support, "EffectAtomEncoded">;
};

export type PassiveMechanics<Support extends NonspellTypeSupport> = {
  readonly family: "passive";
  readonly condition?: SupportType<Support, "EquipmentPredicate">;
  readonly suppressedBy?: NonEmptyReadonlyArray<{
    readonly kind: "condition_active";
    readonly conditions: NonEmptyReadonlyArray<
      SupportType<Support, "Condition">
    >;
  }>;
  readonly grants: ReadonlyArray<SupportType<Support, "EffectAtom">>;
  readonly operations?: NonEmptyReadonlyArray<PassiveOperation<Support>>;
};

export type PassiveMechanicsEncoded<Support extends NonspellTypeSupport> = {
  readonly family: "passive";
  readonly condition?: SupportType<Support, "EquipmentPredicateEncoded">;
  readonly suppressedBy?: NonEmptyReadonlyArray<{
    readonly kind: "condition_active";
    readonly conditions: NonEmptyReadonlyArray<
      SupportType<Support, "ConditionEncoded">
    >;
  }>;
  readonly grants?: ReadonlyArray<SupportType<Support, "EffectAtomEncoded">>;
  readonly operations?: NonEmptyReadonlyArray<PassiveOperationEncoded<Support>>;
};

export type TriggeredReactionAbilityMechanics<
  Support extends NonspellTypeSupport,
> = ActivatedAbilityCommon<
  SupportType<Support, "EquipmentPredicate">,
  SupportType<Support, "Range">,
  SupportType<Support, "ActivationResource">,
  SupportType<Support, "ResetCadence">
> & {
  readonly duration?: SupportType<Support, "ClassFeatureDuration">;
  readonly family: "triggered_reaction";
  readonly activationCost: {
    readonly kind: "reaction";
    readonly trigger?: SupportType<Support, "ReactionTrigger">;
  };
  readonly range: SupportType<Support, "Range">;
  readonly interruptsTrigger: boolean;
  readonly phases: NonEmptyReadonlyArray<
    SupportType<Support, "ActivationPhase">
  >;
};

export type TriggeredReactionAbilityMechanicsEncoded<
  Support extends NonspellTypeSupport,
> = ActivatedAbilityCommon<
  SupportType<Support, "EquipmentPredicateEncoded">,
  SupportType<Support, "RangeEncoded">,
  SupportType<Support, "ActivationResourceEncoded">,
  SupportType<Support, "ResetCadenceEncoded">
> & {
  readonly duration?: SupportType<Support, "ClassFeatureDurationEncoded">;
  readonly family: "triggered_reaction";
  readonly activationCost: {
    readonly kind: "reaction";
    readonly trigger?: SupportType<Support, "ReactionTriggerEncoded">;
  };
  readonly range: SupportType<Support, "RangeEncoded">;
  readonly interruptsTrigger: boolean;
  readonly phases: NonEmptyReadonlyArray<
    SupportType<Support, "ActivationPhaseEncoded">
  >;
};

type SpawnedCreaturePayload<Creature, Mode, Control, Dismissal> = {
  readonly creature: Creature;
  readonly mode?: Mode;
  readonly control: Control;
  readonly dismissal: Dismissal;
};

export type MagicItemSpawnedCreatureMechanics<
  Support extends NonspellTypeSupport,
> = ActivatedAbilityCommon<
  SupportType<Support, "EquipmentPredicate">,
  SupportType<Support, "Range">,
  SupportType<Support, "ActivationResource">,
  SupportType<Support, "ResetCadence">
> &
  SpawnedCreaturePayload<
    SupportType<Support, "SpawnedCreatureStatBlock">,
    SupportType<Support, "CreatureMode">,
    SupportType<Support, "CreatureControl">,
    SupportType<Support, "CreatureDismissal">
  > & {
    readonly duration?: SupportType<Support, "ClassFeatureDuration">;
    readonly activationCost: SupportType<Support, "ClassFeatureActivationCost">;
    readonly family: "spawned_creature";
    readonly range: SupportType<Support, "Range">;
  };

export type MagicItemSpawnedCreatureMechanicsEncoded<
  Support extends NonspellTypeSupport,
> = ActivatedAbilityCommon<
  SupportType<Support, "EquipmentPredicateEncoded">,
  SupportType<Support, "RangeEncoded">,
  SupportType<Support, "ActivationResourceEncoded">,
  SupportType<Support, "ResetCadenceEncoded">
> &
  SpawnedCreaturePayload<
    SupportType<Support, "SpawnedCreatureStatBlockEncoded">,
    SupportType<Support, "CreatureModeEncoded">,
    SupportType<Support, "CreatureControlEncoded">,
    SupportType<Support, "CreatureDismissalEncoded">
  > & {
    readonly duration?: SupportType<Support, "ClassFeatureDurationEncoded">;
    readonly activationCost: SupportType<
      Support,
      "ClassFeatureActivationCostEncoded"
    >;
    readonly family: "spawned_creature";
    readonly range: SupportType<Support, "RangeEncoded">;
  };

export type ClassFeatureActivationMechanics<
  Support extends NonspellTypeSupport,
> = ActivatedAbilityMechanics<Support>;
export type ClassFeatureActivationMechanicsEncoded<
  Support extends NonspellTypeSupport,
> = ActivatedAbilityMechanicsEncoded<Support>;

export type ClassFeatureAcquisitionChoiceMechanics<
  Support extends NonspellTypeSupport,
> = {
  readonly family: "class_feature_acquisition_choice";
  readonly choiceKey: string;
  readonly timing: "class_feature_acquisition";
  readonly options: NonEmptyReadonlyArray<{
    readonly id: string;
    readonly displayName: string;
    readonly mechanics: PassiveMechanics<Support>;
  }>;
};

export type ClassFeatureAcquisitionChoiceMechanicsEncoded<
  Support extends NonspellTypeSupport,
> = {
  readonly family: "class_feature_acquisition_choice";
  readonly choiceKey: string;
  readonly timing: "class_feature_acquisition";
  readonly options: NonEmptyReadonlyArray<{
    readonly id: string;
    readonly displayName: string;
    readonly mechanics: PassiveMechanicsEncoded<Support>;
  }>;
};

export type ClassFeatureComponentMechanics<
  Support extends NonspellTypeSupport,
> =
  | PassiveMechanics<Support>
  | ActivatedAbilityMechanics<Support>
  | SupportType<Support, "AlternateActionCostMechanics">
  | SupportType<Support, "OnHitTriggerMechanics">
  | SupportType<Support, "SaveDamageReplacementMechanics">
  | SupportType<Support, "ReactionRollOrDamageReductionMechanics">;

export type ClassFeatureComponentMechanicsEncoded<
  Support extends NonspellTypeSupport,
> =
  | PassiveMechanicsEncoded<Support>
  | ActivatedAbilityMechanicsEncoded<Support>
  | SupportType<Support, "AlternateActionCostMechanicsEncoded">
  | SupportType<Support, "OnHitTriggerMechanicsEncoded">
  | SupportType<Support, "SaveDamageReplacementMechanicsEncoded">
  | SupportType<Support, "ReactionRollOrDamageReductionMechanicsEncoded">;

export type CompositeClassFeatureMechanics<
  Support extends NonspellTypeSupport,
> = {
  readonly family: "composite";
  readonly parts: NonEmptyReadonlyArray<
    ClassFeatureComponentMechanics<Support>
  >;
};

export type CompositeClassFeatureMechanicsEncoded<
  Support extends NonspellTypeSupport,
> = {
  readonly family: "composite";
  readonly parts: NonEmptyReadonlyArray<
    ClassFeatureComponentMechanicsEncoded<Support>
  >;
};

type ClassGeneralMechanics<
  Component,
  Composite,
  AcquisitionChoice,
  ResourceContainer,
  ResourcePool,
  WeaponMasteryChoice,
  DelegatedActions,
> =
  | Component
  | Composite
  | AcquisitionChoice
  | ResourceContainer
  | ResourcePool
  | WeaponMasteryChoice
  | DelegatedActions;

export type ClassGeneralFeatureMechanics<Support extends NonspellTypeSupport> =
  ClassGeneralMechanics<
    ClassFeatureComponentMechanics<Support>,
    CompositeClassFeatureMechanics<Support>,
    ClassFeatureAcquisitionChoiceMechanics<Support>,
    SupportType<Support, "ClassFeatureResourceContainerMechanics">,
    SupportType<Support, "ClassFeatureResourcePoolMechanics">,
    SupportType<Support, "WeaponMasteryChoiceMechanics">,
    SupportType<Support, "BonusActionDelegatedStandardActionsMechanics">
  >;

export type ClassGeneralFeatureMechanicsEncoded<
  Support extends NonspellTypeSupport,
> = ClassGeneralMechanics<
  ClassFeatureComponentMechanicsEncoded<Support>,
  CompositeClassFeatureMechanicsEncoded<Support>,
  ClassFeatureAcquisitionChoiceMechanicsEncoded<Support>,
  SupportType<Support, "ClassFeatureResourceContainerMechanicsEncoded">,
  SupportType<Support, "ClassFeatureResourcePoolMechanicsEncoded">,
  SupportType<Support, "WeaponMasteryChoiceMechanicsEncoded">,
  SupportType<Support, "BonusActionDelegatedStandardActionsMechanicsEncoded">
>;

type ClassFeatureMechanicsAdditionalDecoded<
  Support extends NonspellTypeSupport,
> =
  | SupportType<Support, "FeatureChoiceMechanics">
  | SupportType<Support, "ClassFeatureResourceContainerMechanics">
  | SupportType<Support, "ClassFeatureResourcePoolMechanics">
  | SupportType<Support, "SorcererMetamagicMechanics">
  | SupportType<Support, "ClassSpellcastingProjectionMechanics">
  | SupportType<Support, "WeaponMasteryChoiceMechanics">
  | SupportType<Support, "SpellbookRitualAccessMechanics">
  | SupportType<Support, "RestSpellSlotRecoveryMechanics">
  | SupportType<Support, "SorcererSorcerousRestorationMechanics">
  | SupportType<Support, "WizardSpellbookLearningMechanics">
  | SupportType<Support, "DruidWildCompanionSpellCastMechanics">
  | SupportType<Support, "WarlockPactSlotRecoveryMechanics">
  | SupportType<Support, "FailedAbilityCheckResourceBoostMechanics">
  | SupportType<Support, "MonkInitiativeFocusRecoveryMechanics">
  | SupportType<Support, "SpellSlotHealingModifierMechanics">
  | SupportType<Support, "MagicActionHealingPoolMechanics">
  | SupportType<Support, "MagicActionAreaSaveDamageHealingMechanics">
  | SupportType<Support, "EnemyZeroHitPointTemporaryHitPointsMechanics">
  | SupportType<Support, "BonusActionDelegatedStandardActionsMechanics">
  | SupportType<Support, "RemarkableAthleteMechanics">
  | SupportType<Support, "OpenHandTechniqueMechanics">
  | SupportType<Support, "StunningStrikeMechanics">
  | SupportType<Support, "CunningStrikeMechanics">
  | SupportType<Support, "BrutalStrikeMechanics">
  | SupportType<Support, "IndomitableMechanics">
  | SupportType<Support, "TacticalMasterMechanics">
  | SupportType<Support, "AbjureFoesMechanics">
  | SupportType<Support, "AcrobaticMovementMechanics">
  | SupportType<Support, "SupremeSneakMechanics">
  | SupportType<Support, "SacredWeaponMechanics">
  | SupportType<Support, "HuntersPreyMechanics">
  | SupportType<Support, "SteadyAimMechanics">
  | SupportType<Support, "PotentCantripMechanics">
  | SupportType<Support, "PreparedSpellListExpansionMechanics">
  | SupportType<Support, "SpellDamageRollAbilityModifierMechanics">
  | SupportType<Support, "CombatTurnStartHeroicInspirationMechanics">;

type ClassFeatureMechanicsAdditionalEncoded<
  Support extends NonspellTypeSupport,
> =
  | SupportType<Support, "FeatureChoiceMechanicsEncoded">
  | SupportType<Support, "ClassFeatureResourceContainerMechanicsEncoded">
  | SupportType<Support, "ClassFeatureResourcePoolMechanicsEncoded">
  | SupportType<Support, "SorcererMetamagicMechanicsEncoded">
  | SupportType<Support, "ClassSpellcastingProjectionMechanicsEncoded">
  | SupportType<Support, "WeaponMasteryChoiceMechanicsEncoded">
  | SupportType<Support, "SpellbookRitualAccessMechanicsEncoded">
  | SupportType<Support, "RestSpellSlotRecoveryMechanicsEncoded">
  | SupportType<Support, "SorcererSorcerousRestorationMechanicsEncoded">
  | SupportType<Support, "WizardSpellbookLearningMechanicsEncoded">
  | SupportType<Support, "DruidWildCompanionSpellCastMechanicsEncoded">
  | SupportType<Support, "WarlockPactSlotRecoveryMechanicsEncoded">
  | SupportType<Support, "FailedAbilityCheckResourceBoostMechanicsEncoded">
  | SupportType<Support, "MonkInitiativeFocusRecoveryMechanicsEncoded">
  | SupportType<Support, "SpellSlotHealingModifierMechanicsEncoded">
  | SupportType<Support, "MagicActionHealingPoolMechanicsEncoded">
  | SupportType<Support, "MagicActionAreaSaveDamageHealingMechanicsEncoded">
  | SupportType<Support, "EnemyZeroHitPointTemporaryHitPointsMechanicsEncoded">
  | SupportType<Support, "BonusActionDelegatedStandardActionsMechanicsEncoded">
  | SupportType<Support, "RemarkableAthleteMechanicsEncoded">
  | SupportType<Support, "OpenHandTechniqueMechanicsEncoded">
  | SupportType<Support, "StunningStrikeMechanicsEncoded">
  | SupportType<Support, "CunningStrikeMechanicsEncoded">
  | SupportType<Support, "BrutalStrikeMechanicsEncoded">
  | SupportType<Support, "IndomitableMechanicsEncoded">
  | SupportType<Support, "TacticalMasterMechanicsEncoded">
  | SupportType<Support, "AbjureFoesMechanicsEncoded">
  | SupportType<Support, "AcrobaticMovementMechanicsEncoded">
  | SupportType<Support, "SupremeSneakMechanicsEncoded">
  | SupportType<Support, "SacredWeaponMechanicsEncoded">
  | SupportType<Support, "HuntersPreyMechanicsEncoded">
  | SupportType<Support, "SteadyAimMechanicsEncoded">
  | SupportType<Support, "PotentCantripMechanicsEncoded">
  | SupportType<Support, "PreparedSpellListExpansionMechanicsEncoded">
  | SupportType<Support, "SpellDamageRollAbilityModifierMechanicsEncoded">
  | SupportType<Support, "CombatTurnStartHeroicInspirationMechanicsEncoded">;

export type ClassFeatureMechanics<Support extends NonspellTypeSupport> =
  | ClassFeatureComponentMechanics<Support>
  | CompositeClassFeatureMechanics<Support>
  | ClassFeatureAcquisitionChoiceMechanics<Support>
  | ClassFeatureMechanicsAdditionalDecoded<Support>;
export type ClassFeatureMechanicsEncoded<Support extends NonspellTypeSupport> =
  | ClassFeatureComponentMechanicsEncoded<Support>
  | CompositeClassFeatureMechanicsEncoded<Support>
  | ClassFeatureAcquisitionChoiceMechanicsEncoded<Support>
  | ClassFeatureMechanicsAdditionalEncoded<Support>;

export type BardClassFeatureMechanics<Support extends NonspellTypeSupport> =
  | ClassGeneralFeatureMechanics<Support>
  | SupportType<Support, "PreparedSpellListExpansionMechanics">;
export type BardClassFeatureMechanicsEncoded<
  Support extends NonspellTypeSupport,
> =
  | ClassGeneralFeatureMechanicsEncoded<Support>
  | SupportType<Support, "PreparedSpellListExpansionMechanicsEncoded">;
export type ClericClassFeatureMechanics<Support extends NonspellTypeSupport> =
  | ClassGeneralFeatureMechanics<Support>
  | SupportType<Support, "SpellSlotHealingModifierMechanics">
  | SupportType<Support, "MagicActionHealingPoolMechanics">;
export type ClericClassFeatureMechanicsEncoded<
  Support extends NonspellTypeSupport,
> =
  | ClassGeneralFeatureMechanicsEncoded<Support>
  | SupportType<Support, "SpellSlotHealingModifierMechanicsEncoded">
  | SupportType<Support, "MagicActionHealingPoolMechanicsEncoded">;
export type DruidClassFeatureMechanics<Support extends NonspellTypeSupport> =
  | ClassGeneralFeatureMechanics<Support>
  | SupportType<Support, "DruidWildCompanionSpellCastMechanics">
  | SupportType<Support, "MagicActionAreaSaveDamageHealingMechanics">;
export type DruidClassFeatureMechanicsEncoded<
  Support extends NonspellTypeSupport,
> =
  | ClassGeneralFeatureMechanicsEncoded<Support>
  | SupportType<Support, "DruidWildCompanionSpellCastMechanicsEncoded">
  | SupportType<Support, "MagicActionAreaSaveDamageHealingMechanicsEncoded">;
export type WizardClassFeatureMechanics<Support extends NonspellTypeSupport> =
  | ClassGeneralFeatureMechanics<Support>
  | SupportType<Support, "SpellbookRitualAccessMechanics">
  | SupportType<Support, "RestSpellSlotRecoveryMechanics">
  | SupportType<Support, "WizardSpellbookLearningMechanics">
  | SupportType<Support, "PotentCantripMechanics">
  | SupportType<Support, "SpellDamageRollAbilityModifierMechanics">;
export type WizardClassFeatureMechanicsEncoded<
  Support extends NonspellTypeSupport,
> =
  | ClassGeneralFeatureMechanicsEncoded<Support>
  | SupportType<Support, "SpellbookRitualAccessMechanicsEncoded">
  | SupportType<Support, "RestSpellSlotRecoveryMechanicsEncoded">
  | SupportType<Support, "WizardSpellbookLearningMechanicsEncoded">
  | SupportType<Support, "PotentCantripMechanicsEncoded">
  | SupportType<Support, "SpellDamageRollAbilityModifierMechanicsEncoded">;
export type BarbarianClassFeatureMechanics<
  Support extends NonspellTypeSupport,
> =
  | ClassGeneralFeatureMechanics<Support>
  | SupportType<Support, "BrutalStrikeMechanics">;
export type BarbarianClassFeatureMechanicsEncoded<
  Support extends NonspellTypeSupport,
> =
  | ClassGeneralFeatureMechanicsEncoded<Support>
  | SupportType<Support, "BrutalStrikeMechanicsEncoded">;
export type FighterClassFeatureMechanics<Support extends NonspellTypeSupport> =
  | ClassGeneralFeatureMechanics<Support>
  | SupportType<Support, "FailedAbilityCheckResourceBoostMechanics">
  | SupportType<Support, "IndomitableMechanics">
  | SupportType<Support, "TacticalMasterMechanics">
  | SupportType<Support, "RemarkableAthleteMechanics">
  | SupportType<Support, "CombatTurnStartHeroicInspirationMechanics">;
export type FighterClassFeatureMechanicsEncoded<
  Support extends NonspellTypeSupport,
> =
  | ClassGeneralFeatureMechanicsEncoded<Support>
  | SupportType<Support, "FailedAbilityCheckResourceBoostMechanicsEncoded">
  | SupportType<Support, "IndomitableMechanicsEncoded">
  | SupportType<Support, "TacticalMasterMechanicsEncoded">
  | SupportType<Support, "RemarkableAthleteMechanicsEncoded">
  | SupportType<Support, "CombatTurnStartHeroicInspirationMechanicsEncoded">;
export type MonkClassFeatureMechanics<Support extends NonspellTypeSupport> =
  | ClassGeneralFeatureMechanics<Support>
  | SupportType<Support, "MonkInitiativeFocusRecoveryMechanics">
  | SupportType<Support, "AcrobaticMovementMechanics">
  | SupportType<Support, "OpenHandTechniqueMechanics">
  | SupportType<Support, "StunningStrikeMechanics">;
export type MonkClassFeatureMechanicsEncoded<
  Support extends NonspellTypeSupport,
> =
  | ClassGeneralFeatureMechanicsEncoded<Support>
  | SupportType<Support, "MonkInitiativeFocusRecoveryMechanicsEncoded">
  | SupportType<Support, "AcrobaticMovementMechanicsEncoded">
  | SupportType<Support, "OpenHandTechniqueMechanicsEncoded">
  | SupportType<Support, "StunningStrikeMechanicsEncoded">;
export type PaladinClassFeatureMechanics<Support extends NonspellTypeSupport> =
  | ClassGeneralFeatureMechanics<Support>
  | SupportType<Support, "AbjureFoesMechanics">
  | SupportType<Support, "SacredWeaponMechanics">;
export type PaladinClassFeatureMechanicsEncoded<
  Support extends NonspellTypeSupport,
> =
  | ClassGeneralFeatureMechanicsEncoded<Support>
  | SupportType<Support, "AbjureFoesMechanicsEncoded">
  | SupportType<Support, "SacredWeaponMechanicsEncoded">;
export type RangerClassFeatureMechanics<Support extends NonspellTypeSupport> =
  | ClassGeneralFeatureMechanics<Support>
  | SupportType<Support, "HuntersPreyMechanics">;
export type RangerClassFeatureMechanicsEncoded<
  Support extends NonspellTypeSupport,
> =
  | ClassGeneralFeatureMechanicsEncoded<Support>
  | SupportType<Support, "HuntersPreyMechanicsEncoded">;
export type RogueClassFeatureMechanics<Support extends NonspellTypeSupport> =
  | ClassGeneralFeatureMechanics<Support>
  | SupportType<Support, "CunningStrikeMechanics">
  | SupportType<Support, "SupremeSneakMechanics">
  | SupportType<Support, "SteadyAimMechanics">;
export type RogueClassFeatureMechanicsEncoded<
  Support extends NonspellTypeSupport,
> =
  | ClassGeneralFeatureMechanicsEncoded<Support>
  | SupportType<Support, "CunningStrikeMechanicsEncoded">
  | SupportType<Support, "SupremeSneakMechanicsEncoded">
  | SupportType<Support, "SteadyAimMechanicsEncoded">;
export type SorcererClassFeatureMechanics<Support extends NonspellTypeSupport> =
  | ClassGeneralFeatureMechanics<Support>
  | SupportType<Support, "SorcererMetamagicMechanics">
  | SupportType<Support, "SorcererSorcerousRestorationMechanics">;
export type SorcererClassFeatureMechanicsEncoded<
  Support extends NonspellTypeSupport,
> =
  | ClassGeneralFeatureMechanicsEncoded<Support>
  | SupportType<Support, "SorcererMetamagicMechanicsEncoded">
  | SupportType<Support, "SorcererSorcerousRestorationMechanicsEncoded">;
export type WarlockClassFeatureMechanics<Support extends NonspellTypeSupport> =
  | ClassGeneralFeatureMechanics<Support>
  | SupportType<Support, "FeatureChoiceMechanics">
  | SupportType<Support, "ClassSpellcastingProjectionMechanics">
  | SupportType<Support, "WarlockPactSlotRecoveryMechanics">
  | SupportType<Support, "EnemyZeroHitPointTemporaryHitPointsMechanics">;
export type WarlockClassFeatureMechanicsEncoded<
  Support extends NonspellTypeSupport,
> =
  | ClassGeneralFeatureMechanicsEncoded<Support>
  | SupportType<Support, "FeatureChoiceMechanicsEncoded">
  | SupportType<Support, "ClassSpellcastingProjectionMechanicsEncoded">
  | SupportType<Support, "WarlockPactSlotRecoveryMechanicsEncoded">
  | SupportType<Support, "EnemyZeroHitPointTemporaryHitPointsMechanicsEncoded">;

type UnitMetadata<Id, Provenance> = {
  readonly id: Id;
  readonly name: string;
  readonly provenance: Provenance;
};
type DecodedUnitMetadata<Support extends NonspellTypeSupport> = UnitMetadata<
  UnitId,
  SupportType<Support, "Provenance">
>;
type EncodedUnitMetadata<Support extends NonspellTypeSupport> = UnitMetadata<
  string,
  SupportType<Support, "ProvenanceEncoded">
>;

type ClassFeatureRecordValue<
  Metadata,
  ClassName extends string,
  Mechanics,
> = Metadata & {
  readonly kind: "class_feature";
  readonly acquiredAtLevel: number;
  readonly className: ClassName;
  readonly mechanics: Mechanics;
};

export type BardClassFeatureRecord<Support extends NonspellTypeSupport> =
  ClassFeatureRecordValue<
    DecodedUnitMetadata<Support>,
    "bard",
    BardClassFeatureMechanics<Support>
  >;
export type BardClassFeatureRecordEncoded<Support extends NonspellTypeSupport> =
  ClassFeatureRecordValue<
    EncodedUnitMetadata<Support>,
    "bard",
    BardClassFeatureMechanicsEncoded<Support>
  >;
export type WizardClassFeatureRecord<Support extends NonspellTypeSupport> =
  ClassFeatureRecordValue<
    DecodedUnitMetadata<Support>,
    "wizard",
    WizardClassFeatureMechanics<Support>
  >;
export type WizardClassFeatureRecordEncoded<
  Support extends NonspellTypeSupport,
> = ClassFeatureRecordValue<
  EncodedUnitMetadata<Support>,
  "wizard",
  WizardClassFeatureMechanicsEncoded<Support>
>;
export type BarbarianClassFeatureRecord<Support extends NonspellTypeSupport> =
  ClassFeatureRecordValue<
    DecodedUnitMetadata<Support>,
    "barbarian",
    BarbarianClassFeatureMechanics<Support>
  >;
export type BarbarianClassFeatureRecordEncoded<
  Support extends NonspellTypeSupport,
> = ClassFeatureRecordValue<
  EncodedUnitMetadata<Support>,
  "barbarian",
  BarbarianClassFeatureMechanicsEncoded<Support>
>;
export type FighterClassFeatureRecord<Support extends NonspellTypeSupport> =
  ClassFeatureRecordValue<
    DecodedUnitMetadata<Support>,
    "fighter",
    FighterClassFeatureMechanics<Support>
  >;
export type FighterClassFeatureRecordEncoded<
  Support extends NonspellTypeSupport,
> = ClassFeatureRecordValue<
  EncodedUnitMetadata<Support>,
  "fighter",
  FighterClassFeatureMechanicsEncoded<Support>
>;
export type ClericClassFeatureRecord<Support extends NonspellTypeSupport> =
  ClassFeatureRecordValue<
    DecodedUnitMetadata<Support>,
    "cleric",
    ClericClassFeatureMechanics<Support>
  >;
export type ClericClassFeatureRecordEncoded<
  Support extends NonspellTypeSupport,
> = ClassFeatureRecordValue<
  EncodedUnitMetadata<Support>,
  "cleric",
  ClericClassFeatureMechanicsEncoded<Support>
>;
export type DruidClassFeatureRecord<Support extends NonspellTypeSupport> =
  ClassFeatureRecordValue<
    DecodedUnitMetadata<Support>,
    "druid",
    DruidClassFeatureMechanics<Support>
  >;
export type DruidClassFeatureRecordEncoded<
  Support extends NonspellTypeSupport,
> = ClassFeatureRecordValue<
  EncodedUnitMetadata<Support>,
  "druid",
  DruidClassFeatureMechanicsEncoded<Support>
>;
export type MonkClassFeatureRecord<Support extends NonspellTypeSupport> =
  ClassFeatureRecordValue<
    DecodedUnitMetadata<Support>,
    "monk",
    MonkClassFeatureMechanics<Support>
  >;
export type MonkClassFeatureRecordEncoded<Support extends NonspellTypeSupport> =
  ClassFeatureRecordValue<
    EncodedUnitMetadata<Support>,
    "monk",
    MonkClassFeatureMechanicsEncoded<Support>
  >;
export type PaladinClassFeatureRecord<Support extends NonspellTypeSupport> =
  ClassFeatureRecordValue<
    DecodedUnitMetadata<Support>,
    "paladin",
    PaladinClassFeatureMechanics<Support>
  >;
export type PaladinClassFeatureRecordEncoded<
  Support extends NonspellTypeSupport,
> = ClassFeatureRecordValue<
  EncodedUnitMetadata<Support>,
  "paladin",
  PaladinClassFeatureMechanicsEncoded<Support>
>;
export type RangerClassFeatureRecord<Support extends NonspellTypeSupport> =
  ClassFeatureRecordValue<
    DecodedUnitMetadata<Support>,
    "ranger",
    RangerClassFeatureMechanics<Support>
  >;
export type RangerClassFeatureRecordEncoded<
  Support extends NonspellTypeSupport,
> = ClassFeatureRecordValue<
  EncodedUnitMetadata<Support>,
  "ranger",
  RangerClassFeatureMechanicsEncoded<Support>
>;
export type RogueClassFeatureRecord<Support extends NonspellTypeSupport> =
  ClassFeatureRecordValue<
    DecodedUnitMetadata<Support>,
    "rogue",
    RogueClassFeatureMechanics<Support>
  >;
export type RogueClassFeatureRecordEncoded<
  Support extends NonspellTypeSupport,
> = ClassFeatureRecordValue<
  EncodedUnitMetadata<Support>,
  "rogue",
  RogueClassFeatureMechanicsEncoded<Support>
>;
export type SorcererClassFeatureRecord<Support extends NonspellTypeSupport> =
  ClassFeatureRecordValue<
    DecodedUnitMetadata<Support>,
    "sorcerer",
    SorcererClassFeatureMechanics<Support>
  >;
export type SorcererClassFeatureRecordEncoded<
  Support extends NonspellTypeSupport,
> = ClassFeatureRecordValue<
  EncodedUnitMetadata<Support>,
  "sorcerer",
  SorcererClassFeatureMechanicsEncoded<Support>
>;
export type WarlockClassFeatureRecord<Support extends NonspellTypeSupport> =
  ClassFeatureRecordValue<
    DecodedUnitMetadata<Support>,
    "warlock",
    WarlockClassFeatureMechanics<Support>
  >;
export type WarlockClassFeatureRecordEncoded<
  Support extends NonspellTypeSupport,
> = ClassFeatureRecordValue<
  EncodedUnitMetadata<Support>,
  "warlock",
  WarlockClassFeatureMechanicsEncoded<Support>
>;
export type ClassFeatureRecord<Support extends NonspellTypeSupport> =
  | BardClassFeatureRecord<Support>
  | WizardClassFeatureRecord<Support>
  | BarbarianClassFeatureRecord<Support>
  | FighterClassFeatureRecord<Support>
  | ClericClassFeatureRecord<Support>
  | DruidClassFeatureRecord<Support>
  | MonkClassFeatureRecord<Support>
  | PaladinClassFeatureRecord<Support>
  | RangerClassFeatureRecord<Support>
  | RogueClassFeatureRecord<Support>
  | SorcererClassFeatureRecord<Support>
  | WarlockClassFeatureRecord<Support>;
export type ClassFeatureRecordEncoded<Support extends NonspellTypeSupport> =
  | BardClassFeatureRecordEncoded<Support>
  | WizardClassFeatureRecordEncoded<Support>
  | BarbarianClassFeatureRecordEncoded<Support>
  | FighterClassFeatureRecordEncoded<Support>
  | ClericClassFeatureRecordEncoded<Support>
  | DruidClassFeatureRecordEncoded<Support>
  | MonkClassFeatureRecordEncoded<Support>
  | PaladinClassFeatureRecordEncoded<Support>
  | RangerClassFeatureRecordEncoded<Support>
  | RogueClassFeatureRecordEncoded<Support>
  | SorcererClassFeatureRecordEncoded<Support>
  | WarlockClassFeatureRecordEncoded<Support>;

type GrapplerFeatMechanics = {
  readonly family: "grappler";
  readonly punchAndGrab: {
    readonly trigger: "attack_action_unarmed_strike_hit_on_turn";
    readonly options: readonly ["damage", "grapple"];
    readonly usageLimit: { readonly kind: "once_per_turn" };
  };
  readonly attackAdvantage: {
    readonly mode: "advantage";
    readonly on: readonly ["attack_roll"];
    readonly target: "creature_grappled_by_you";
  };
  readonly fastWrestler: {
    readonly movementCost: "no_extra_grapple_drag_cost";
    readonly targetSize: "your_size_or_smaller";
  };
};
type MagicInitiateMechanics = {
  readonly family: "magic_initiate";
  readonly spellList: MagicInitiateSpellList;
};

export type FeatMechanics<Support extends NonspellTypeSupport> =
  | PassiveMechanics<Support>
  | ActivatedAbilityMechanics<Support>
  | SupportType<Support, "MasteryOrWeaponDamageDiceRerollMechanics">
  | SupportType<Support, "WeaponAttackDamageDieFloorMechanics">
  | SupportType<Support, "LightExtraAttackDamageAbilityModifierMechanics">
  | SupportType<Support, "TriggeredReplacementMechanics">
  | GrapplerFeatMechanics
  | MagicInitiateMechanics;
export type FeatMechanicsEncoded<Support extends NonspellTypeSupport> =
  | PassiveMechanicsEncoded<Support>
  | ActivatedAbilityMechanicsEncoded<Support>
  | SupportType<Support, "MasteryOrWeaponDamageDiceRerollMechanicsEncoded">
  | SupportType<Support, "WeaponAttackDamageDieFloorMechanicsEncoded">
  | SupportType<
      Support,
      "LightExtraAttackDamageAbilityModifierMechanicsEncoded"
    >
  | SupportType<Support, "TriggeredReplacementMechanicsEncoded">
  | GrapplerFeatMechanics
  | MagicInitiateMechanics;

type FeatAbilityScoreIncreaseChoice<Score, PositiveInteger> = {
  readonly abilityScope:
    | { readonly kind: "all_abilities" }
    | {
        readonly kind: "specific_abilities";
        readonly abilities: NonEmptyReadonlyArray<Ability>;
      };
  readonly maxScore: Score;
  readonly methods: NonEmptyReadonlyArray<
    | { readonly kind: "one_score"; readonly increase: PositiveInteger }
    | {
        readonly kind: "two_scores";
        readonly primaryIncrease: PositiveInteger;
        readonly secondaryIncrease: PositiveInteger;
      }
  >;
};

export type FeatRecord<Support extends NonspellTypeSupport> =
  DecodedUnitMetadata<Support> & {
    readonly kind: "feat";
    readonly category: SupportType<Support, "FeatCategory">;
    readonly abilityScoreIncreaseChoice?: FeatAbilityScoreIncreaseChoice<
      AbilityScore,
      number & Brand.Brand<"PositiveInteger">
    >;
    readonly mechanics: FeatMechanics<Support>;
  };
export type FeatRecordEncoded<Support extends NonspellTypeSupport> =
  EncodedUnitMetadata<Support> & {
    readonly kind: "feat";
    readonly category: SupportType<Support, "FeatCategoryEncoded">;
    readonly abilityScoreIncreaseChoice?: FeatAbilityScoreIncreaseChoice<
      number,
      number
    >;
    readonly mechanics: FeatMechanicsEncoded<Support>;
  };

export type SpeciesTraitMechanics<Support extends NonspellTypeSupport> =
  | PassiveMechanics<Support>
  | ActivatedAbilityMechanics<Support>
  | SupportType<Support, "TriggeredReplacementMechanics">
  | SupportType<Support, "GnomishLineageMechanics">
  | SupportType<Support, "D20TestNaturalOneRerollMechanics">
  | SupportType<Support, "CreatureSpaceMovementPermissionMechanics">
  | SupportType<Support, "HideActionObscurementPermissionMechanics">
  | SupportType<Support, "RestTriggeredHeroicInspirationMechanics">;
export type SpeciesTraitMechanicsEncoded<Support extends NonspellTypeSupport> =
  | PassiveMechanicsEncoded<Support>
  | ActivatedAbilityMechanicsEncoded<Support>
  | SupportType<Support, "TriggeredReplacementMechanicsEncoded">
  | SupportType<Support, "GnomishLineageMechanicsEncoded">
  | SupportType<Support, "D20TestNaturalOneRerollMechanicsEncoded">
  | SupportType<Support, "CreatureSpaceMovementPermissionMechanicsEncoded">
  | SupportType<Support, "HideActionObscurementPermissionMechanicsEncoded">
  | SupportType<Support, "RestTriggeredHeroicInspirationMechanicsEncoded">;

export type SpeciesTraitRecord<Support extends NonspellTypeSupport> =
  DecodedUnitMetadata<Support> & {
    readonly kind: "species_trait";
    readonly species: string;
    readonly mechanics: SpeciesTraitMechanics<Support>;
  };
export type SpeciesTraitRecordEncoded<Support extends NonspellTypeSupport> =
  EncodedUnitMetadata<Support> & {
    readonly kind: "species_trait";
    readonly species: string;
    readonly mechanics: SpeciesTraitMechanicsEncoded<Support>;
  };

export type MagicItemComponentMechanics<Support extends NonspellTypeSupport> =
  | PassiveMechanics<Support>
  | ActivatedAbilityMechanics<Support>
  | TriggeredReactionAbilityMechanics<Support>
  | SupportType<Support, "MasteryOrWeaponDamageDiceRerollMechanics">
  | MagicItemSpawnedCreatureMechanics<Support>;
export type MagicItemComponentMechanicsEncoded<
  Support extends NonspellTypeSupport,
> =
  | PassiveMechanicsEncoded<Support>
  | ActivatedAbilityMechanicsEncoded<Support>
  | TriggeredReactionAbilityMechanicsEncoded<Support>
  | SupportType<Support, "MasteryOrWeaponDamageDiceRerollMechanicsEncoded">
  | MagicItemSpawnedCreatureMechanicsEncoded<Support>;
export type CompositeMagicItemMechanics<Support extends NonspellTypeSupport> = {
  readonly family: "composite";
  readonly parts: NonEmptyReadonlyArray<MagicItemComponentMechanics<Support>>;
};
export type CompositeMagicItemMechanicsEncoded<
  Support extends NonspellTypeSupport,
> = {
  readonly family: "composite";
  readonly parts: NonEmptyReadonlyArray<
    MagicItemComponentMechanicsEncoded<Support>
  >;
};
export type MagicItemMechanics<Support extends NonspellTypeSupport> =
  | MagicItemComponentMechanics<Support>
  | CompositeMagicItemMechanics<Support>;
export type MagicItemMechanicsEncoded<Support extends NonspellTypeSupport> =
  | MagicItemComponentMechanicsEncoded<Support>
  | CompositeMagicItemMechanicsEncoded<Support>;

type MagicItemVariantValue<
  Support extends NonspellTypeSupport,
  Id,
  Mechanics,
  Destruction,
  Attunement,
> = {
  readonly id: Id;
  readonly name: string;
  readonly description?: string;
  readonly rarity: SupportType<Support, "MagicItemRarity">;
  readonly mechanics: Mechanics;
  readonly destruction: Destruction;
  readonly attunementOverride?: Attunement;
};
export type MagicItemVariant<Support extends NonspellTypeSupport> =
  MagicItemVariantValue<
    Support,
    string,
    MagicItemMechanics<Support>,
    SupportType<Support, "ItemDestructionPolicy">,
    SupportType<Support, "MagicItemAttunement">
  >;
export type MagicItemVariantEncoded<Support extends NonspellTypeSupport> =
  MagicItemVariantValue<
    Support,
    string,
    MagicItemMechanicsEncoded<Support>,
    SupportType<Support, "ItemDestructionPolicyEncoded">,
    SupportType<Support, "MagicItemAttunementEncoded">
  >;

type MagicItemRecordFields<
  Support extends NonspellTypeSupport,
  Metadata,
  Mechanics,
  Destruction,
> = Metadata & {
  readonly kind: "magic_item";
  readonly rarity: SupportType<Support, "MagicItemRarity">;
  readonly mechanics: Mechanics;
  readonly destruction: Destruction;
};
export type MagicItemRecord<Support extends NonspellTypeSupport> =
  | (MagicItemRecordFields<
      Support,
      DecodedUnitMetadata<Support>,
      MagicItemMechanics<Support>,
      SupportType<Support, "ItemDestructionPolicy">
    > & { readonly requiresAttunement: false })
  | (MagicItemRecordFields<
      Support,
      DecodedUnitMetadata<Support>,
      MagicItemMechanics<Support>,
      SupportType<Support, "ItemDestructionPolicy">
    > & {
      readonly requiresAttunement: true;
      readonly attunementRestriction?: SupportType<
        Support,
        "MagicItemAttunementRestriction"
      >;
    })
  | (DecodedUnitMetadata<Support> & {
      readonly kind: "magic_item";
      readonly defaultAttunement: SupportType<Support, "MagicItemAttunement">;
      readonly variants: NonEmptyReadonlyArray<MagicItemVariant<Support>>;
    });
export type MagicItemRecordEncoded<Support extends NonspellTypeSupport> =
  | (MagicItemRecordFields<
      Support,
      EncodedUnitMetadata<Support>,
      MagicItemMechanicsEncoded<Support>,
      SupportType<Support, "ItemDestructionPolicyEncoded">
    > & { readonly requiresAttunement: false })
  | (MagicItemRecordFields<
      Support,
      EncodedUnitMetadata<Support>,
      MagicItemMechanicsEncoded<Support>,
      SupportType<Support, "ItemDestructionPolicyEncoded">
    > & {
      readonly requiresAttunement: true;
      readonly attunementRestriction?: SupportType<
        Support,
        "MagicItemAttunementRestrictionEncoded"
      >;
    })
  | (EncodedUnitMetadata<Support> & {
      readonly kind: "magic_item";
      readonly defaultAttunement: SupportType<
        Support,
        "MagicItemAttunementEncoded"
      >;
      readonly variants: NonEmptyReadonlyArray<
        MagicItemVariantEncoded<Support>
      >;
    });

type MagicEquipmentTraitValue<
  Support extends NonspellTypeSupport,
  Mechanics,
  Destruction,
  Attunement,
> = {
  readonly rarity: SupportType<Support, "MagicItemRarity">;
  readonly attunement: Attunement;
  readonly mechanics: Mechanics;
  readonly destruction: Destruction;
};
export type MagicEquipmentTrait<Support extends NonspellTypeSupport> =
  MagicEquipmentTraitValue<
    Support,
    MagicItemMechanics<Support>,
    SupportType<Support, "ItemDestructionPolicy">,
    SupportType<Support, "MagicItemAttunement">
  >;
export type MagicEquipmentTraitEncoded<Support extends NonspellTypeSupport> =
  MagicEquipmentTraitValue<
    Support,
    MagicItemMechanicsEncoded<Support>,
    SupportType<Support, "ItemDestructionPolicyEncoded">,
    SupportType<Support, "MagicItemAttunementEncoded">
  >;
type MagicEquipmentVariantValue<Magic> = {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly magic: Magic;
};
export type MagicEquipmentVariant<Support extends NonspellTypeSupport> =
  MagicEquipmentVariantValue<MagicEquipmentTrait<Support>>;
export type MagicEquipmentVariantEncoded<Support extends NonspellTypeSupport> =
  MagicEquipmentVariantValue<MagicEquipmentTraitEncoded<Support>>;

type ArmorTemplateRecordValue<
  Support extends NonspellTypeSupport,
  Metadata,
  Variant,
  ExcludedArmorId,
> = Metadata & {
  readonly kind: "armor_template";
  readonly template: "any_armor_magic";
  readonly armorApplicability: {
    readonly kind: "any_armor";
    readonly categories: NonEmptyReadonlyArray<
      SupportType<Support, "ArmorCategory">
    >;
    readonly excludedArmorIds?: ReadonlyArray<ExcludedArmorId>;
  };
  readonly variants: NonEmptyReadonlyArray<Variant>;
};
export type ArmorTemplateRecord<Support extends NonspellTypeSupport> =
  ArmorTemplateRecordValue<
    Support,
    DecodedUnitMetadata<Support>,
    MagicEquipmentVariant<Support>,
    UnitId
  >;
export type ArmorTemplateRecordEncoded<Support extends NonspellTypeSupport> =
  ArmorTemplateRecordValue<
    Support,
    EncodedUnitMetadata<Support>,
    MagicEquipmentVariantEncoded<Support>,
    string
  >;

type ShieldTemplateRecordValue<Metadata, Variant> = Metadata & {
  readonly kind: "shield_template";
  readonly template: "shield_magic";
  readonly armorClassProjection: {
    readonly kind: "trained_shield_bonus";
    readonly handUse: "shield";
    readonly trainingRequired: "shield";
    readonly bonus: number;
  };
  readonly weightPounds: number;
  readonly costGp: number;
  readonly donDoff: { readonly action: "utilize" };
  readonly variants: NonEmptyReadonlyArray<Variant>;
};
export type ShieldTemplateRecord<Support extends NonspellTypeSupport> =
  ShieldTemplateRecordValue<
    DecodedUnitMetadata<Support>,
    MagicEquipmentVariant<Support>
  >;
export type ShieldTemplateRecordEncoded<Support extends NonspellTypeSupport> =
  ShieldTemplateRecordValue<
    EncodedUnitMetadata<Support>,
    MagicEquipmentVariantEncoded<Support>
  >;

type WeaponTemplateRecordValue<
  Support extends NonspellTypeSupport,
  Metadata,
  Variant,
> = Metadata & {
  readonly kind: "weapon_template";
  readonly template: "any_weapon_magic" | "ammunition_magic";
  readonly ammunitionQuantity?: {
    readonly kind: "typically_found_or_sold";
    readonly counts: NonEmptyReadonlyArray<number>;
    readonly valueEquivalence: {
      readonly count: number;
      readonly item: "potion_of_same_rarity";
    };
  };
  readonly weaponApplicability:
    | {
        readonly kind: "any_weapon";
        readonly categories: NonEmptyReadonlyArray<
          SupportType<Support, "WeaponCategory">
        >;
      }
    | { readonly kind: "any_melee_weapon" }
    | { readonly kind: "ammunition" };
  readonly variants: NonEmptyReadonlyArray<Variant>;
};
export type WeaponTemplateRecord<Support extends NonspellTypeSupport> =
  WeaponTemplateRecordValue<
    Support,
    DecodedUnitMetadata<Support>,
    MagicEquipmentVariant<Support>
  >;
export type WeaponTemplateRecordEncoded<Support extends NonspellTypeSupport> =
  WeaponTemplateRecordValue<
    Support,
    EncodedUnitMetadata<Support>,
    MagicEquipmentVariantEncoded<Support>
  >;

export type UnitRecord<Support extends NonspellTypeSupport> =
  | SupportType<Support, "SpellRecord">
  | SupportType<Support, "NonWizardClassRecord">
  | SupportType<Support, "WizardClassRecord">
  | SupportType<Support, "SubclassRecord">
  | ClassFeatureRecord<Support>
  | SupportType<Support, "BackgroundRecord">
  | SupportType<Support, "MasteryRecord">
  | FeatRecord<Support>
  | SupportType<Support, "SpeciesRecord">
  | SpeciesTraitRecord<Support>
  | MagicItemRecord<Support>
  | SupportType<Support, "ArmorRecord">
  | ArmorTemplateRecord<Support>
  | SupportType<Support, "ShieldRecord">
  | ShieldTemplateRecord<Support>
  | WeaponTemplateRecord<Support>
  | SupportType<Support, "WeaponRecord">;

export type UnitRecordEncoded<Support extends NonspellTypeSupport> =
  | SupportType<Support, "SpellRecordEncoded">
  | SupportType<Support, "NonWizardClassRecordEncoded">
  | SupportType<Support, "WizardClassRecordEncoded">
  | SupportType<Support, "SubclassRecordEncoded">
  | ClassFeatureRecordEncoded<Support>
  | SupportType<Support, "BackgroundRecordEncoded">
  | SupportType<Support, "MasteryRecordEncoded">
  | FeatRecordEncoded<Support>
  | SupportType<Support, "SpeciesRecordEncoded">
  | SpeciesTraitRecordEncoded<Support>
  | MagicItemRecordEncoded<Support>
  | SupportType<Support, "ArmorRecordEncoded">
  | ArmorTemplateRecordEncoded<Support>
  | SupportType<Support, "ShieldRecordEncoded">
  | ShieldTemplateRecordEncoded<Support>
  | WeaponTemplateRecordEncoded<Support>
  | SupportType<Support, "WeaponRecordEncoded">;
