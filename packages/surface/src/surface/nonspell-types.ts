import type { Brand, Schema } from "effect";
import type { Ability, UnitId } from "@dnd/shared/game-facts";
import type { AbilityScore } from "@dnd/shared/types";

import type {
  ActivationPhaseSchema,
  CreatureControlSchema,
  CreatureDismissalSchema,
  CreatureModeSchema,
  EffectAtomSchema,
  OngoingPredicateSchema,
  RangeSchema,
  ReactionTriggerSchema,
  SpellRecordSchema,
  SpawnedCreatureStatBlockSchema,
} from "./schema-spell.ts";
import type {
  AbjureFoesMechanicsSchema,
  AcrobaticMovementMechanicsSchema,
  AlternateActionCostMechanicsSchema,
  ActivationResourceSchema,
  ArmorRecordSchema,
  BackgroundRecordSchema,
  BonusActionDelegatedStandardActionsMechanicsSchema,
  BrutalStrikeMechanicsSchema,
  ClassFeatureActivationCostSchema,
  ClassFeatureDurationSchema,
  ClassFeatureResourceContainerMechanicsSchema,
  ClassFeatureResourcePoolMechanicsSchema,
  ClassSpellcastingProjectionMechanicsSchema,
  MasteryRecordSchema,
  CombatTurnStartHeroicInspirationMechanicsSchema,
  CunningStrikeMechanicsSchema,
  DruidWildCompanionSpellCastMechanicsSchema,
  D20TestNaturalOneRerollMechanicsSchema,
  EnemyZeroHitPointTemporaryHitPointsMechanicsSchema,
  EquipmentPredicateSchema,
  FailedAbilityCheckResourceBoostMechanicsSchema,
  FeatureChoiceMechanicsSchema,
  GnomishLineageMechanicsSchema,
  HideActionObscurementPermissionMechanicsSchema,
  HuntersPreyMechanicsSchema,
  IndomitableMechanicsSchema,
  LightExtraAttackDamageAbilityModifierMechanicsSchema,
  MagicActionAreaSaveDamageHealingMechanicsSchema,
  MagicActionHealingPoolMechanicsSchema,
  MagicItemAttunementSchema,
  MagicItemAttunementRestrictionSchema,
  MasteryOrWeaponDamageDiceRerollMechanicsSchema,
  MonkInitiativeFocusRecoveryMechanicsSchema,
  OnHitTriggerMechanicsSchema,
  OpenHandTechniqueMechanicsSchema,
  PotentCantripMechanicsSchema,
  PreparedSpellListExpansionMechanicsSchema,
  CreatureSpaceMovementPermissionMechanicsSchema,
  RemarkableAthleteMechanicsSchema,
  ReactionRollOrDamageReductionMechanicsSchema,
  ResetCadenceSchema,
  RestTriggeredHeroicInspirationMechanicsSchema,
  RestSpellSlotRecoveryMechanicsSchema,
  NonWizardClassRecordSchema,
  SacredWeaponMechanicsSchema,
  SaveDamageReplacementMechanicsSchema,
  SorcererMetamagicMechanicsSchema,
  SorcererSorcerousRestorationMechanicsSchema,
  SpellbookRitualAccessMechanicsSchema,
  SpellDamageRollAbilityModifierMechanicsSchema,
  SpellSlotHealingModifierMechanicsSchema,
  SteadyAimMechanicsSchema,
  StunningStrikeMechanicsSchema,
  SupremeSneakMechanicsSchema,
  TacticalMasterMechanicsSchema,
  TriggeredReplacementMechanicsSchema,
  ShieldRecordSchema,
  SpeciesRecordSchema,
  SubclassRecordSchema,
  WarlockPactSlotRecoveryMechanicsSchema,
  WeaponMasteryChoiceMechanicsSchema,
  WeaponAttackDamageDieFloorMechanicsSchema,
  WeaponRecordSchema,
  WizardClassRecordSchema,
  ItemDestructionPolicySchema,
  WizardSpellbookLearningMechanicsSchema,
} from "./schema-nonspell.ts";
import type {
  ArmorCategorySchema,
  ConditionSchema,
  FeatCategorySchema,
  MagicItemRaritySchema,
  WeaponCategorySchema,
  ProvenanceSchema,
} from "./schema-base.ts";

type Decoded<Codec extends Schema.Top> = Schema.Schema.Type<Codec>;
type Encoded<Codec extends Schema.Top> = Schema.Codec.Encoded<Codec>;
type NonEmptyReadonlyArray<Value> = readonly [Value, ...Value[]];
type OngoingFeatureLifecycle =
  | {
      readonly kind: "turn_boundary";
      readonly initialExpiration: "start_of_next_turn";
      readonly earlyEndConditions?: ReadonlyArray<
        Decoded<typeof ConditionSchema>
      >;
      readonly earlyEndArmorCategories?: ReadonlyArray<
        Decoded<typeof ArmorCategorySchema>
      >;
    }
  | {
      readonly kind: "round_extended";
      readonly initialExpiration: "end_of_next_turn";
      readonly earlyEndConditions?: ReadonlyArray<
        Decoded<typeof ConditionSchema>
      >;
      readonly earlyEndArmorCategories?: ReadonlyArray<
        Decoded<typeof ArmorCategorySchema>
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
        Decoded<typeof ConditionSchema>
      >;
      readonly earlyEndArmorCategories?: ReadonlyArray<
        Decoded<typeof ArmorCategorySchema>
      >;
    };

type OngoingFeatureSupport<ActivationTiming extends string> = {
  readonly activationTiming: ActivationTiming;
  readonly lifecycle: OngoingFeatureLifecycle;
  readonly concentrationEffect?: "break_and_prevent";
  readonly actionRestrictions?: ReadonlyArray<"spellcasting">;
  readonly levelOverrides?: ReadonlyArray<{
    readonly atClassLevel: number;
    readonly lifecycle: OngoingFeatureLifecycle;
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
    readonly action?:
      | "attack"
      | "dash"
      | "disengage"
      | "dodge"
      | "help"
      | "hide"
      | "influence"
      | "magic"
      | "ready"
      | "search"
      | "study"
      | "utilize";
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

export type ActivatedAbilityMechanics =
  | ResourceActivatedAbility<
      Decoded<typeof EquipmentPredicateSchema>,
      Decoded<typeof RangeSchema>,
      Decoded<typeof ActivationResourceSchema>,
      Decoded<typeof ResetCadenceSchema>,
      Decoded<typeof ClassFeatureDurationSchema>,
      Decoded<typeof ClassFeatureActivationCostSchema>,
      Decoded<typeof ActivationPhaseSchema>
    >
  | ResourceOngoingFeatureAbility<
      Decoded<typeof EquipmentPredicateSchema>,
      Decoded<typeof RangeSchema>,
      Decoded<typeof ActivationResourceSchema>,
      Decoded<typeof ResetCadenceSchema>,
      OngoingFeatureSupport<"activation_cost">,
      Decoded<typeof ActivationPhaseSchema>
    >
  | ResourcelessOngoingFeatureAbility<
      Decoded<typeof EquipmentPredicateSchema>,
      Decoded<typeof RangeSchema>,
      OngoingFeatureSupport<"first_attack_roll">,
      Decoded<typeof ActivationPhaseSchema>
    >;

export type ActivatedAbilityMechanicsEncoded =
  | ResourceActivatedAbility<
      Encoded<typeof EquipmentPredicateSchema>,
      Encoded<typeof RangeSchema>,
      Encoded<typeof ActivationResourceSchema>,
      Encoded<typeof ResetCadenceSchema>,
      Encoded<typeof ClassFeatureDurationSchema>,
      Encoded<typeof ClassFeatureActivationCostSchema>,
      Encoded<typeof ActivationPhaseSchema>
    >
  | ResourceOngoingFeatureAbility<
      Encoded<typeof EquipmentPredicateSchema>,
      Encoded<typeof RangeSchema>,
      Encoded<typeof ActivationResourceSchema>,
      Encoded<typeof ResetCadenceSchema>,
      OngoingFeatureSupport<"activation_cost">,
      Encoded<typeof ActivationPhaseSchema>
    >
  | ResourcelessOngoingFeatureAbility<
      Encoded<typeof EquipmentPredicateSchema>,
      Encoded<typeof RangeSchema>,
      OngoingFeatureSupport<"first_attack_roll">,
      Encoded<typeof ActivationPhaseSchema>
    >;

export type PassiveOperation = {
  readonly trigger: {
    readonly kind: "elapsed_time";
    readonly unit: "hour" | "day";
    readonly amount: number;
  };
  readonly predicate?: Decoded<typeof OngoingPredicateSchema>;
  readonly effect: Decoded<typeof EffectAtomSchema>;
};

export type PassiveOperationEncoded = {
  readonly trigger: {
    readonly kind: "elapsed_time";
    readonly unit: "hour" | "day";
    readonly amount: number;
  };
  readonly predicate?: Encoded<typeof OngoingPredicateSchema>;
  readonly effect: Encoded<typeof EffectAtomSchema>;
};

export type PassiveMechanics = {
  readonly family: "passive";
  readonly condition?: Decoded<typeof EquipmentPredicateSchema>;
  readonly suppressedBy?: NonEmptyReadonlyArray<{
    readonly kind: "condition_active";
    readonly conditions: NonEmptyReadonlyArray<Decoded<typeof ConditionSchema>>;
  }>;
  readonly grants: ReadonlyArray<Decoded<typeof EffectAtomSchema>>;
  readonly operations?: NonEmptyReadonlyArray<PassiveOperation>;
};

export type PassiveMechanicsEncoded = {
  readonly family: "passive";
  readonly condition?: Encoded<typeof EquipmentPredicateSchema>;
  readonly suppressedBy?: NonEmptyReadonlyArray<{
    readonly kind: "condition_active";
    readonly conditions: NonEmptyReadonlyArray<Encoded<typeof ConditionSchema>>;
  }>;
  readonly grants?: ReadonlyArray<Encoded<typeof EffectAtomSchema>>;
  readonly operations?: NonEmptyReadonlyArray<PassiveOperationEncoded>;
};

export type TriggeredReactionAbilityMechanics = ActivatedAbilityCommon<
  Decoded<typeof EquipmentPredicateSchema>,
  Decoded<typeof RangeSchema>,
  Decoded<typeof ActivationResourceSchema>,
  Decoded<typeof ResetCadenceSchema>
> & {
  readonly duration?: Decoded<typeof ClassFeatureDurationSchema>;
  readonly family: "triggered_reaction";
  readonly activationCost: {
    readonly kind: "reaction";
    readonly trigger?: Decoded<typeof ReactionTriggerSchema>;
  };
  readonly range: Decoded<typeof RangeSchema>;
  readonly interruptsTrigger: boolean;
  readonly phases: NonEmptyReadonlyArray<Decoded<typeof ActivationPhaseSchema>>;
};

export type TriggeredReactionAbilityMechanicsEncoded = ActivatedAbilityCommon<
  Encoded<typeof EquipmentPredicateSchema>,
  Encoded<typeof RangeSchema>,
  Encoded<typeof ActivationResourceSchema>,
  Encoded<typeof ResetCadenceSchema>
> & {
  readonly duration?: Encoded<typeof ClassFeatureDurationSchema>;
  readonly family: "triggered_reaction";
  readonly activationCost: {
    readonly kind: "reaction";
    readonly trigger?: Encoded<typeof ReactionTriggerSchema>;
  };
  readonly range: Encoded<typeof RangeSchema>;
  readonly interruptsTrigger: boolean;
  readonly phases: NonEmptyReadonlyArray<Encoded<typeof ActivationPhaseSchema>>;
};

type SpawnedCreaturePayload<Creature, Mode, Control, Dismissal> = {
  readonly creature: Creature;
  readonly mode?: Mode;
  readonly control: Control;
  readonly dismissal: Dismissal;
};

export type MagicItemSpawnedCreatureMechanics = ActivatedAbilityCommon<
  Decoded<typeof EquipmentPredicateSchema>,
  Decoded<typeof RangeSchema>,
  Decoded<typeof ActivationResourceSchema>,
  Decoded<typeof ResetCadenceSchema>
> &
  SpawnedCreaturePayload<
    Decoded<typeof SpawnedCreatureStatBlockSchema>,
    Decoded<typeof CreatureModeSchema>,
    Decoded<typeof CreatureControlSchema>,
    Decoded<typeof CreatureDismissalSchema>
  > & {
    readonly duration?: Decoded<typeof ClassFeatureDurationSchema>;
    readonly activationCost: Decoded<typeof ClassFeatureActivationCostSchema>;
    readonly family: "spawned_creature";
    readonly range: Decoded<typeof RangeSchema>;
  };

export type MagicItemSpawnedCreatureMechanicsEncoded = ActivatedAbilityCommon<
  Encoded<typeof EquipmentPredicateSchema>,
  Encoded<typeof RangeSchema>,
  Encoded<typeof ActivationResourceSchema>,
  Encoded<typeof ResetCadenceSchema>
> &
  SpawnedCreaturePayload<
    Encoded<typeof SpawnedCreatureStatBlockSchema>,
    Encoded<typeof CreatureModeSchema>,
    Encoded<typeof CreatureControlSchema>,
    Encoded<typeof CreatureDismissalSchema>
  > & {
    readonly duration?: Encoded<typeof ClassFeatureDurationSchema>;
    readonly activationCost: Encoded<typeof ClassFeatureActivationCostSchema>;
    readonly family: "spawned_creature";
    readonly range: Encoded<typeof RangeSchema>;
  };

export type ClassFeatureActivationMechanics = ActivatedAbilityMechanics;
export type ClassFeatureActivationMechanicsEncoded =
  ActivatedAbilityMechanicsEncoded;

export type ClassFeatureAcquisitionChoiceMechanics = {
  readonly family: "class_feature_acquisition_choice";
  readonly choiceKey: string;
  readonly timing: "class_feature_acquisition";
  readonly options: NonEmptyReadonlyArray<{
    readonly id: string;
    readonly displayName: string;
    readonly mechanics: PassiveMechanics;
  }>;
};

export type ClassFeatureAcquisitionChoiceMechanicsEncoded = {
  readonly family: "class_feature_acquisition_choice";
  readonly choiceKey: string;
  readonly timing: "class_feature_acquisition";
  readonly options: NonEmptyReadonlyArray<{
    readonly id: string;
    readonly displayName: string;
    readonly mechanics: PassiveMechanicsEncoded;
  }>;
};

export type ClassFeatureComponentMechanics =
  | PassiveMechanics
  | ActivatedAbilityMechanics
  | Decoded<typeof AlternateActionCostMechanicsSchema>
  | Decoded<typeof OnHitTriggerMechanicsSchema>
  | Decoded<typeof SaveDamageReplacementMechanicsSchema>
  | Decoded<typeof ReactionRollOrDamageReductionMechanicsSchema>;

export type ClassFeatureComponentMechanicsEncoded =
  | PassiveMechanicsEncoded
  | ActivatedAbilityMechanicsEncoded
  | Encoded<typeof AlternateActionCostMechanicsSchema>
  | Encoded<typeof OnHitTriggerMechanicsSchema>
  | Encoded<typeof SaveDamageReplacementMechanicsSchema>
  | Encoded<typeof ReactionRollOrDamageReductionMechanicsSchema>;

export type CompositeClassFeatureMechanics = {
  readonly family: "composite";
  readonly parts: NonEmptyReadonlyArray<ClassFeatureComponentMechanics>;
};

export type CompositeClassFeatureMechanicsEncoded = {
  readonly family: "composite";
  readonly parts: NonEmptyReadonlyArray<ClassFeatureComponentMechanicsEncoded>;
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

export type ClassGeneralFeatureMechanics = ClassGeneralMechanics<
  ClassFeatureComponentMechanics,
  CompositeClassFeatureMechanics,
  ClassFeatureAcquisitionChoiceMechanics,
  Decoded<typeof ClassFeatureResourceContainerMechanicsSchema>,
  Decoded<typeof ClassFeatureResourcePoolMechanicsSchema>,
  Decoded<typeof WeaponMasteryChoiceMechanicsSchema>,
  Decoded<typeof BonusActionDelegatedStandardActionsMechanicsSchema>
>;

export type ClassGeneralFeatureMechanicsEncoded = ClassGeneralMechanics<
  ClassFeatureComponentMechanicsEncoded,
  CompositeClassFeatureMechanicsEncoded,
  ClassFeatureAcquisitionChoiceMechanicsEncoded,
  Encoded<typeof ClassFeatureResourceContainerMechanicsSchema>,
  Encoded<typeof ClassFeatureResourcePoolMechanicsSchema>,
  Encoded<typeof WeaponMasteryChoiceMechanicsSchema>,
  Encoded<typeof BonusActionDelegatedStandardActionsMechanicsSchema>
>;

type ClassFeatureMechanicsAdditionalDecoded =
  | Decoded<typeof FeatureChoiceMechanicsSchema>
  | Decoded<typeof ClassFeatureResourceContainerMechanicsSchema>
  | Decoded<typeof ClassFeatureResourcePoolMechanicsSchema>
  | Decoded<typeof SorcererMetamagicMechanicsSchema>
  | Decoded<typeof ClassSpellcastingProjectionMechanicsSchema>
  | Decoded<typeof WeaponMasteryChoiceMechanicsSchema>
  | Decoded<typeof SpellbookRitualAccessMechanicsSchema>
  | Decoded<typeof RestSpellSlotRecoveryMechanicsSchema>
  | Decoded<typeof SorcererSorcerousRestorationMechanicsSchema>
  | Decoded<typeof WizardSpellbookLearningMechanicsSchema>
  | Decoded<typeof DruidWildCompanionSpellCastMechanicsSchema>
  | Decoded<typeof WarlockPactSlotRecoveryMechanicsSchema>
  | Decoded<typeof FailedAbilityCheckResourceBoostMechanicsSchema>
  | Decoded<typeof MonkInitiativeFocusRecoveryMechanicsSchema>
  | Decoded<typeof SpellSlotHealingModifierMechanicsSchema>
  | Decoded<typeof MagicActionHealingPoolMechanicsSchema>
  | Decoded<typeof MagicActionAreaSaveDamageHealingMechanicsSchema>
  | Decoded<typeof EnemyZeroHitPointTemporaryHitPointsMechanicsSchema>
  | Decoded<typeof BonusActionDelegatedStandardActionsMechanicsSchema>
  | Decoded<typeof RemarkableAthleteMechanicsSchema>
  | Decoded<typeof OpenHandTechniqueMechanicsSchema>
  | Decoded<typeof StunningStrikeMechanicsSchema>
  | Decoded<typeof CunningStrikeMechanicsSchema>
  | Decoded<typeof BrutalStrikeMechanicsSchema>
  | Decoded<typeof IndomitableMechanicsSchema>
  | Decoded<typeof TacticalMasterMechanicsSchema>
  | Decoded<typeof AbjureFoesMechanicsSchema>
  | Decoded<typeof AcrobaticMovementMechanicsSchema>
  | Decoded<typeof SupremeSneakMechanicsSchema>
  | Decoded<typeof SacredWeaponMechanicsSchema>
  | Decoded<typeof HuntersPreyMechanicsSchema>
  | Decoded<typeof SteadyAimMechanicsSchema>
  | Decoded<typeof PotentCantripMechanicsSchema>
  | Decoded<typeof PreparedSpellListExpansionMechanicsSchema>
  | Decoded<typeof SpellDamageRollAbilityModifierMechanicsSchema>
  | Decoded<typeof CombatTurnStartHeroicInspirationMechanicsSchema>;

type ClassFeatureMechanicsAdditionalEncoded =
  | Encoded<typeof FeatureChoiceMechanicsSchema>
  | Encoded<typeof ClassFeatureResourceContainerMechanicsSchema>
  | Encoded<typeof ClassFeatureResourcePoolMechanicsSchema>
  | Encoded<typeof SorcererMetamagicMechanicsSchema>
  | Encoded<typeof ClassSpellcastingProjectionMechanicsSchema>
  | Encoded<typeof WeaponMasteryChoiceMechanicsSchema>
  | Encoded<typeof SpellbookRitualAccessMechanicsSchema>
  | Encoded<typeof RestSpellSlotRecoveryMechanicsSchema>
  | Encoded<typeof SorcererSorcerousRestorationMechanicsSchema>
  | Encoded<typeof WizardSpellbookLearningMechanicsSchema>
  | Encoded<typeof DruidWildCompanionSpellCastMechanicsSchema>
  | Encoded<typeof WarlockPactSlotRecoveryMechanicsSchema>
  | Encoded<typeof FailedAbilityCheckResourceBoostMechanicsSchema>
  | Encoded<typeof MonkInitiativeFocusRecoveryMechanicsSchema>
  | Encoded<typeof SpellSlotHealingModifierMechanicsSchema>
  | Encoded<typeof MagicActionHealingPoolMechanicsSchema>
  | Encoded<typeof MagicActionAreaSaveDamageHealingMechanicsSchema>
  | Encoded<typeof EnemyZeroHitPointTemporaryHitPointsMechanicsSchema>
  | Encoded<typeof BonusActionDelegatedStandardActionsMechanicsSchema>
  | Encoded<typeof RemarkableAthleteMechanicsSchema>
  | Encoded<typeof OpenHandTechniqueMechanicsSchema>
  | Encoded<typeof StunningStrikeMechanicsSchema>
  | Encoded<typeof CunningStrikeMechanicsSchema>
  | Encoded<typeof BrutalStrikeMechanicsSchema>
  | Encoded<typeof IndomitableMechanicsSchema>
  | Encoded<typeof TacticalMasterMechanicsSchema>
  | Encoded<typeof AbjureFoesMechanicsSchema>
  | Encoded<typeof AcrobaticMovementMechanicsSchema>
  | Encoded<typeof SupremeSneakMechanicsSchema>
  | Encoded<typeof SacredWeaponMechanicsSchema>
  | Encoded<typeof HuntersPreyMechanicsSchema>
  | Encoded<typeof SteadyAimMechanicsSchema>
  | Encoded<typeof PotentCantripMechanicsSchema>
  | Encoded<typeof PreparedSpellListExpansionMechanicsSchema>
  | Encoded<typeof SpellDamageRollAbilityModifierMechanicsSchema>
  | Encoded<typeof CombatTurnStartHeroicInspirationMechanicsSchema>;

export type ClassFeatureMechanics =
  | ClassFeatureComponentMechanics
  | CompositeClassFeatureMechanics
  | ClassFeatureAcquisitionChoiceMechanics
  | ClassFeatureMechanicsAdditionalDecoded;
export type ClassFeatureMechanicsEncoded =
  | ClassFeatureComponentMechanicsEncoded
  | CompositeClassFeatureMechanicsEncoded
  | ClassFeatureAcquisitionChoiceMechanicsEncoded
  | ClassFeatureMechanicsAdditionalEncoded;

export type BardClassFeatureMechanics =
  | ClassGeneralFeatureMechanics
  | Decoded<typeof PreparedSpellListExpansionMechanicsSchema>;
export type BardClassFeatureMechanicsEncoded =
  | ClassGeneralFeatureMechanicsEncoded
  | Encoded<typeof PreparedSpellListExpansionMechanicsSchema>;
export type ClericClassFeatureMechanics =
  | ClassGeneralFeatureMechanics
  | Decoded<typeof SpellSlotHealingModifierMechanicsSchema>
  | Decoded<typeof MagicActionHealingPoolMechanicsSchema>;
export type ClericClassFeatureMechanicsEncoded =
  | ClassGeneralFeatureMechanicsEncoded
  | Encoded<typeof SpellSlotHealingModifierMechanicsSchema>
  | Encoded<typeof MagicActionHealingPoolMechanicsSchema>;
export type DruidClassFeatureMechanics =
  | ClassGeneralFeatureMechanics
  | Decoded<typeof DruidWildCompanionSpellCastMechanicsSchema>
  | Decoded<typeof MagicActionAreaSaveDamageHealingMechanicsSchema>;
export type DruidClassFeatureMechanicsEncoded =
  | ClassGeneralFeatureMechanicsEncoded
  | Encoded<typeof DruidWildCompanionSpellCastMechanicsSchema>
  | Encoded<typeof MagicActionAreaSaveDamageHealingMechanicsSchema>;
export type WizardClassFeatureMechanics =
  | ClassGeneralFeatureMechanics
  | Decoded<typeof SpellbookRitualAccessMechanicsSchema>
  | Decoded<typeof RestSpellSlotRecoveryMechanicsSchema>
  | Decoded<typeof WizardSpellbookLearningMechanicsSchema>
  | Decoded<typeof PotentCantripMechanicsSchema>
  | Decoded<typeof SpellDamageRollAbilityModifierMechanicsSchema>;
export type WizardClassFeatureMechanicsEncoded =
  | ClassGeneralFeatureMechanicsEncoded
  | Encoded<typeof SpellbookRitualAccessMechanicsSchema>
  | Encoded<typeof RestSpellSlotRecoveryMechanicsSchema>
  | Encoded<typeof WizardSpellbookLearningMechanicsSchema>
  | Encoded<typeof PotentCantripMechanicsSchema>
  | Encoded<typeof SpellDamageRollAbilityModifierMechanicsSchema>;
export type BarbarianClassFeatureMechanics =
  | ClassGeneralFeatureMechanics
  | Decoded<typeof BrutalStrikeMechanicsSchema>;
export type BarbarianClassFeatureMechanicsEncoded =
  | ClassGeneralFeatureMechanicsEncoded
  | Encoded<typeof BrutalStrikeMechanicsSchema>;
export type FighterClassFeatureMechanics =
  | ClassGeneralFeatureMechanics
  | Decoded<typeof FailedAbilityCheckResourceBoostMechanicsSchema>
  | Decoded<typeof IndomitableMechanicsSchema>
  | Decoded<typeof TacticalMasterMechanicsSchema>
  | Decoded<typeof RemarkableAthleteMechanicsSchema>
  | Decoded<typeof CombatTurnStartHeroicInspirationMechanicsSchema>;
export type FighterClassFeatureMechanicsEncoded =
  | ClassGeneralFeatureMechanicsEncoded
  | Encoded<typeof FailedAbilityCheckResourceBoostMechanicsSchema>
  | Encoded<typeof IndomitableMechanicsSchema>
  | Encoded<typeof TacticalMasterMechanicsSchema>
  | Encoded<typeof RemarkableAthleteMechanicsSchema>
  | Encoded<typeof CombatTurnStartHeroicInspirationMechanicsSchema>;
export type MonkClassFeatureMechanics =
  | ClassGeneralFeatureMechanics
  | Decoded<typeof MonkInitiativeFocusRecoveryMechanicsSchema>
  | Decoded<typeof AcrobaticMovementMechanicsSchema>
  | Decoded<typeof OpenHandTechniqueMechanicsSchema>
  | Decoded<typeof StunningStrikeMechanicsSchema>;
export type MonkClassFeatureMechanicsEncoded =
  | ClassGeneralFeatureMechanicsEncoded
  | Encoded<typeof MonkInitiativeFocusRecoveryMechanicsSchema>
  | Encoded<typeof AcrobaticMovementMechanicsSchema>
  | Encoded<typeof OpenHandTechniqueMechanicsSchema>
  | Encoded<typeof StunningStrikeMechanicsSchema>;
export type PaladinClassFeatureMechanics =
  | ClassGeneralFeatureMechanics
  | Decoded<typeof AbjureFoesMechanicsSchema>
  | Decoded<typeof SacredWeaponMechanicsSchema>;
export type PaladinClassFeatureMechanicsEncoded =
  | ClassGeneralFeatureMechanicsEncoded
  | Encoded<typeof AbjureFoesMechanicsSchema>
  | Encoded<typeof SacredWeaponMechanicsSchema>;
export type RangerClassFeatureMechanics =
  | ClassGeneralFeatureMechanics
  | Decoded<typeof HuntersPreyMechanicsSchema>;
export type RangerClassFeatureMechanicsEncoded =
  | ClassGeneralFeatureMechanicsEncoded
  | Encoded<typeof HuntersPreyMechanicsSchema>;
export type RogueClassFeatureMechanics =
  | ClassGeneralFeatureMechanics
  | Decoded<typeof CunningStrikeMechanicsSchema>
  | Decoded<typeof SupremeSneakMechanicsSchema>
  | Decoded<typeof SteadyAimMechanicsSchema>;
export type RogueClassFeatureMechanicsEncoded =
  | ClassGeneralFeatureMechanicsEncoded
  | Encoded<typeof CunningStrikeMechanicsSchema>
  | Encoded<typeof SupremeSneakMechanicsSchema>
  | Encoded<typeof SteadyAimMechanicsSchema>;
export type SorcererClassFeatureMechanics =
  | ClassGeneralFeatureMechanics
  | Decoded<typeof SorcererMetamagicMechanicsSchema>
  | Decoded<typeof SorcererSorcerousRestorationMechanicsSchema>;
export type SorcererClassFeatureMechanicsEncoded =
  | ClassGeneralFeatureMechanicsEncoded
  | Encoded<typeof SorcererMetamagicMechanicsSchema>
  | Encoded<typeof SorcererSorcerousRestorationMechanicsSchema>;
export type WarlockClassFeatureMechanics =
  | ClassGeneralFeatureMechanics
  | Decoded<typeof FeatureChoiceMechanicsSchema>
  | Decoded<typeof ClassSpellcastingProjectionMechanicsSchema>
  | Decoded<typeof WarlockPactSlotRecoveryMechanicsSchema>
  | Decoded<typeof EnemyZeroHitPointTemporaryHitPointsMechanicsSchema>;
export type WarlockClassFeatureMechanicsEncoded =
  | ClassGeneralFeatureMechanicsEncoded
  | Encoded<typeof FeatureChoiceMechanicsSchema>
  | Encoded<typeof ClassSpellcastingProjectionMechanicsSchema>
  | Encoded<typeof WarlockPactSlotRecoveryMechanicsSchema>
  | Encoded<typeof EnemyZeroHitPointTemporaryHitPointsMechanicsSchema>;

type UnitMetadata<Id, Provenance> = {
  readonly id: Id;
  readonly name: string;
  readonly provenance: Provenance;
};
type DecodedUnitMetadata = UnitMetadata<
  UnitId,
  Decoded<typeof ProvenanceSchema>
>;
type EncodedUnitMetadata = UnitMetadata<
  string,
  Encoded<typeof ProvenanceSchema>
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

export type BardClassFeatureRecord = ClassFeatureRecordValue<
  DecodedUnitMetadata,
  "bard",
  BardClassFeatureMechanics
>;
export type BardClassFeatureRecordEncoded = ClassFeatureRecordValue<
  EncodedUnitMetadata,
  "bard",
  BardClassFeatureMechanicsEncoded
>;
export type WizardClassFeatureRecord = ClassFeatureRecordValue<
  DecodedUnitMetadata,
  "wizard",
  WizardClassFeatureMechanics
>;
export type WizardClassFeatureRecordEncoded = ClassFeatureRecordValue<
  EncodedUnitMetadata,
  "wizard",
  WizardClassFeatureMechanicsEncoded
>;
export type BarbarianClassFeatureRecord = ClassFeatureRecordValue<
  DecodedUnitMetadata,
  "barbarian",
  BarbarianClassFeatureMechanics
>;
export type BarbarianClassFeatureRecordEncoded = ClassFeatureRecordValue<
  EncodedUnitMetadata,
  "barbarian",
  BarbarianClassFeatureMechanicsEncoded
>;
export type FighterClassFeatureRecord = ClassFeatureRecordValue<
  DecodedUnitMetadata,
  "fighter",
  FighterClassFeatureMechanics
>;
export type FighterClassFeatureRecordEncoded = ClassFeatureRecordValue<
  EncodedUnitMetadata,
  "fighter",
  FighterClassFeatureMechanicsEncoded
>;
export type ClericClassFeatureRecord = ClassFeatureRecordValue<
  DecodedUnitMetadata,
  "cleric",
  ClericClassFeatureMechanics
>;
export type ClericClassFeatureRecordEncoded = ClassFeatureRecordValue<
  EncodedUnitMetadata,
  "cleric",
  ClericClassFeatureMechanicsEncoded
>;
export type DruidClassFeatureRecord = ClassFeatureRecordValue<
  DecodedUnitMetadata,
  "druid",
  DruidClassFeatureMechanics
>;
export type DruidClassFeatureRecordEncoded = ClassFeatureRecordValue<
  EncodedUnitMetadata,
  "druid",
  DruidClassFeatureMechanicsEncoded
>;
export type MonkClassFeatureRecord = ClassFeatureRecordValue<
  DecodedUnitMetadata,
  "monk",
  MonkClassFeatureMechanics
>;
export type MonkClassFeatureRecordEncoded = ClassFeatureRecordValue<
  EncodedUnitMetadata,
  "monk",
  MonkClassFeatureMechanicsEncoded
>;
export type PaladinClassFeatureRecord = ClassFeatureRecordValue<
  DecodedUnitMetadata,
  "paladin",
  PaladinClassFeatureMechanics
>;
export type PaladinClassFeatureRecordEncoded = ClassFeatureRecordValue<
  EncodedUnitMetadata,
  "paladin",
  PaladinClassFeatureMechanicsEncoded
>;
export type RangerClassFeatureRecord = ClassFeatureRecordValue<
  DecodedUnitMetadata,
  "ranger",
  RangerClassFeatureMechanics
>;
export type RangerClassFeatureRecordEncoded = ClassFeatureRecordValue<
  EncodedUnitMetadata,
  "ranger",
  RangerClassFeatureMechanicsEncoded
>;
export type RogueClassFeatureRecord = ClassFeatureRecordValue<
  DecodedUnitMetadata,
  "rogue",
  RogueClassFeatureMechanics
>;
export type RogueClassFeatureRecordEncoded = ClassFeatureRecordValue<
  EncodedUnitMetadata,
  "rogue",
  RogueClassFeatureMechanicsEncoded
>;
export type SorcererClassFeatureRecord = ClassFeatureRecordValue<
  DecodedUnitMetadata,
  "sorcerer",
  SorcererClassFeatureMechanics
>;
export type SorcererClassFeatureRecordEncoded = ClassFeatureRecordValue<
  EncodedUnitMetadata,
  "sorcerer",
  SorcererClassFeatureMechanicsEncoded
>;
export type WarlockClassFeatureRecord = ClassFeatureRecordValue<
  DecodedUnitMetadata,
  "warlock",
  WarlockClassFeatureMechanics
>;
export type WarlockClassFeatureRecordEncoded = ClassFeatureRecordValue<
  EncodedUnitMetadata,
  "warlock",
  WarlockClassFeatureMechanicsEncoded
>;
export type OtherClassFeatureRecord = ClassFeatureRecordValue<
  DecodedUnitMetadata,
  "barbarian",
  ClassGeneralFeatureMechanics
>;
export type OtherClassFeatureRecordEncoded = ClassFeatureRecordValue<
  EncodedUnitMetadata,
  "barbarian",
  ClassGeneralFeatureMechanicsEncoded
>;

export type ClassFeatureRecord =
  | BardClassFeatureRecord
  | WizardClassFeatureRecord
  | BarbarianClassFeatureRecord
  | FighterClassFeatureRecord
  | ClericClassFeatureRecord
  | DruidClassFeatureRecord
  | MonkClassFeatureRecord
  | PaladinClassFeatureRecord
  | RangerClassFeatureRecord
  | RogueClassFeatureRecord
  | SorcererClassFeatureRecord
  | WarlockClassFeatureRecord
  | OtherClassFeatureRecord;
export type ClassFeatureRecordEncoded =
  | BardClassFeatureRecordEncoded
  | WizardClassFeatureRecordEncoded
  | BarbarianClassFeatureRecordEncoded
  | FighterClassFeatureRecordEncoded
  | ClericClassFeatureRecordEncoded
  | DruidClassFeatureRecordEncoded
  | MonkClassFeatureRecordEncoded
  | PaladinClassFeatureRecordEncoded
  | RangerClassFeatureRecordEncoded
  | RogueClassFeatureRecordEncoded
  | SorcererClassFeatureRecordEncoded
  | WarlockClassFeatureRecordEncoded
  | OtherClassFeatureRecordEncoded;

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
  readonly spellList: "cleric" | "druid" | "wizard";
};

export type FeatMechanics =
  | PassiveMechanics
  | ActivatedAbilityMechanics
  | Decoded<typeof MasteryOrWeaponDamageDiceRerollMechanicsSchema>
  | Decoded<typeof WeaponAttackDamageDieFloorMechanicsSchema>
  | Decoded<typeof LightExtraAttackDamageAbilityModifierMechanicsSchema>
  | Decoded<typeof TriggeredReplacementMechanicsSchema>
  | GrapplerFeatMechanics
  | MagicInitiateMechanics;
export type FeatMechanicsEncoded =
  | PassiveMechanicsEncoded
  | ActivatedAbilityMechanicsEncoded
  | Encoded<typeof MasteryOrWeaponDamageDiceRerollMechanicsSchema>
  | Encoded<typeof WeaponAttackDamageDieFloorMechanicsSchema>
  | Encoded<typeof LightExtraAttackDamageAbilityModifierMechanicsSchema>
  | Encoded<typeof TriggeredReplacementMechanicsSchema>
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

export type FeatRecord = DecodedUnitMetadata & {
  readonly kind: "feat";
  readonly category: Decoded<typeof FeatCategorySchema>;
  readonly abilityScoreIncreaseChoice?: FeatAbilityScoreIncreaseChoice<
    AbilityScore,
    number & Brand.Brand<"PositiveInteger">
  >;
  readonly mechanics: FeatMechanics;
};
export type FeatRecordEncoded = EncodedUnitMetadata & {
  readonly kind: "feat";
  readonly category: Encoded<typeof FeatCategorySchema>;
  readonly abilityScoreIncreaseChoice?: FeatAbilityScoreIncreaseChoice<
    number,
    number
  >;
  readonly mechanics: FeatMechanicsEncoded;
};

export type SpeciesTraitMechanics =
  | PassiveMechanics
  | ActivatedAbilityMechanics
  | Decoded<typeof TriggeredReplacementMechanicsSchema>
  | Decoded<typeof GnomishLineageMechanicsSchema>
  | Decoded<typeof D20TestNaturalOneRerollMechanicsSchema>
  | Decoded<typeof CreatureSpaceMovementPermissionMechanicsSchema>
  | Decoded<typeof HideActionObscurementPermissionMechanicsSchema>
  | Decoded<typeof RestTriggeredHeroicInspirationMechanicsSchema>;
export type SpeciesTraitMechanicsEncoded =
  | PassiveMechanicsEncoded
  | ActivatedAbilityMechanicsEncoded
  | Encoded<typeof TriggeredReplacementMechanicsSchema>
  | Encoded<typeof GnomishLineageMechanicsSchema>
  | Encoded<typeof D20TestNaturalOneRerollMechanicsSchema>
  | Encoded<typeof CreatureSpaceMovementPermissionMechanicsSchema>
  | Encoded<typeof HideActionObscurementPermissionMechanicsSchema>
  | Encoded<typeof RestTriggeredHeroicInspirationMechanicsSchema>;

export type SpeciesTraitRecord = DecodedUnitMetadata & {
  readonly kind: "species_trait";
  readonly species: string;
  readonly mechanics: SpeciesTraitMechanics;
};
export type SpeciesTraitRecordEncoded = EncodedUnitMetadata & {
  readonly kind: "species_trait";
  readonly species: string;
  readonly mechanics: SpeciesTraitMechanicsEncoded;
};

export type MagicItemComponentMechanics =
  | PassiveMechanics
  | ActivatedAbilityMechanics
  | TriggeredReactionAbilityMechanics
  | Decoded<typeof MasteryOrWeaponDamageDiceRerollMechanicsSchema>
  | MagicItemSpawnedCreatureMechanics;
export type MagicItemComponentMechanicsEncoded =
  | PassiveMechanicsEncoded
  | ActivatedAbilityMechanicsEncoded
  | TriggeredReactionAbilityMechanicsEncoded
  | Encoded<typeof MasteryOrWeaponDamageDiceRerollMechanicsSchema>
  | MagicItemSpawnedCreatureMechanicsEncoded;
export type CompositeMagicItemMechanics = {
  readonly family: "composite";
  readonly parts: NonEmptyReadonlyArray<MagicItemComponentMechanics>;
};
export type CompositeMagicItemMechanicsEncoded = {
  readonly family: "composite";
  readonly parts: NonEmptyReadonlyArray<MagicItemComponentMechanicsEncoded>;
};
export type MagicItemMechanics =
  | MagicItemComponentMechanics
  | CompositeMagicItemMechanics;
export type MagicItemMechanicsEncoded =
  | MagicItemComponentMechanicsEncoded
  | CompositeMagicItemMechanicsEncoded;

type MagicItemVariantValue<Id, Mechanics, Destruction, Attunement> = {
  readonly id: Id;
  readonly name: string;
  readonly description?: string;
  readonly rarity: Decoded<typeof MagicItemRaritySchema>;
  readonly mechanics: Mechanics;
  readonly destruction: Destruction;
  readonly attunementOverride?: Attunement;
};
export type MagicItemVariant = MagicItemVariantValue<
  string,
  MagicItemMechanics,
  Decoded<typeof ItemDestructionPolicySchema>,
  Decoded<typeof MagicItemAttunementSchema>
>;
export type MagicItemVariantEncoded = MagicItemVariantValue<
  string,
  MagicItemMechanicsEncoded,
  Encoded<typeof ItemDestructionPolicySchema>,
  Encoded<typeof MagicItemAttunementSchema>
>;

type MagicItemRecordFields<Metadata, Mechanics, Destruction> = Metadata & {
  readonly kind: "magic_item";
  readonly rarity: Decoded<typeof MagicItemRaritySchema>;
  readonly mechanics: Mechanics;
  readonly destruction: Destruction;
};
export type MagicItemRecord =
  | (MagicItemRecordFields<
      DecodedUnitMetadata,
      MagicItemMechanics,
      Decoded<typeof ItemDestructionPolicySchema>
    > & { readonly requiresAttunement: false })
  | (MagicItemRecordFields<
      DecodedUnitMetadata,
      MagicItemMechanics,
      Decoded<typeof ItemDestructionPolicySchema>
    > & {
      readonly requiresAttunement: true;
      readonly attunementRestriction?: Decoded<
        typeof MagicItemAttunementRestrictionSchema
      >;
    })
  | (DecodedUnitMetadata & {
      readonly kind: "magic_item";
      readonly defaultAttunement: Decoded<typeof MagicItemAttunementSchema>;
      readonly variants: NonEmptyReadonlyArray<MagicItemVariant>;
    });
export type MagicItemRecordEncoded =
  | (MagicItemRecordFields<
      EncodedUnitMetadata,
      MagicItemMechanicsEncoded,
      Encoded<typeof ItemDestructionPolicySchema>
    > & { readonly requiresAttunement: false })
  | (MagicItemRecordFields<
      EncodedUnitMetadata,
      MagicItemMechanicsEncoded,
      Encoded<typeof ItemDestructionPolicySchema>
    > & {
      readonly requiresAttunement: true;
      readonly attunementRestriction?: Encoded<
        typeof MagicItemAttunementRestrictionSchema
      >;
    })
  | (EncodedUnitMetadata & {
      readonly kind: "magic_item";
      readonly defaultAttunement: Encoded<typeof MagicItemAttunementSchema>;
      readonly variants: NonEmptyReadonlyArray<MagicItemVariantEncoded>;
    });

type MagicEquipmentTraitValue<Mechanics, Destruction, Attunement> = {
  readonly rarity: Decoded<typeof MagicItemRaritySchema>;
  readonly attunement: Attunement;
  readonly mechanics: Mechanics;
  readonly destruction: Destruction;
};
export type MagicEquipmentTrait = MagicEquipmentTraitValue<
  MagicItemMechanics,
  Decoded<typeof ItemDestructionPolicySchema>,
  Decoded<typeof MagicItemAttunementSchema>
>;
export type MagicEquipmentTraitEncoded = MagicEquipmentTraitValue<
  MagicItemMechanicsEncoded,
  Encoded<typeof ItemDestructionPolicySchema>,
  Encoded<typeof MagicItemAttunementSchema>
>;
type MagicEquipmentVariantValue<Magic> = {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly magic: Magic;
};
export type MagicEquipmentVariant =
  MagicEquipmentVariantValue<MagicEquipmentTrait>;
export type MagicEquipmentVariantEncoded =
  MagicEquipmentVariantValue<MagicEquipmentTraitEncoded>;

type ArmorTemplateRecordValue<Metadata, Variant, ExcludedArmorId> = Metadata & {
  readonly kind: "armor_template";
  readonly template: "any_armor_magic";
  readonly armorApplicability: {
    readonly kind: "any_armor";
    readonly categories: NonEmptyReadonlyArray<
      Decoded<typeof ArmorCategorySchema>
    >;
    readonly excludedArmorIds?: ReadonlyArray<ExcludedArmorId>;
  };
  readonly variants: NonEmptyReadonlyArray<Variant>;
};
export type ArmorTemplateRecord = ArmorTemplateRecordValue<
  DecodedUnitMetadata,
  MagicEquipmentVariant,
  UnitId
>;
export type ArmorTemplateRecordEncoded = ArmorTemplateRecordValue<
  EncodedUnitMetadata,
  MagicEquipmentVariantEncoded,
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
export type ShieldTemplateRecord = ShieldTemplateRecordValue<
  DecodedUnitMetadata,
  MagicEquipmentVariant
>;
export type ShieldTemplateRecordEncoded = ShieldTemplateRecordValue<
  EncodedUnitMetadata,
  MagicEquipmentVariantEncoded
>;

type WeaponTemplateRecordValue<Metadata, Variant> = Metadata & {
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
          Decoded<typeof WeaponCategorySchema>
        >;
      }
    | { readonly kind: "any_melee_weapon" }
    | { readonly kind: "ammunition" };
  readonly variants: NonEmptyReadonlyArray<Variant>;
};
export type WeaponTemplateRecord = WeaponTemplateRecordValue<
  DecodedUnitMetadata,
  MagicEquipmentVariant
>;
export type WeaponTemplateRecordEncoded = WeaponTemplateRecordValue<
  EncodedUnitMetadata,
  MagicEquipmentVariantEncoded
>;

export type UnitRecord =
  | Decoded<typeof SpellRecordSchema>
  | Decoded<typeof NonWizardClassRecordSchema>
  | Decoded<typeof WizardClassRecordSchema>
  | Decoded<typeof SubclassRecordSchema>
  | ClassFeatureRecord
  | Decoded<typeof BackgroundRecordSchema>
  | Decoded<typeof MasteryRecordSchema>
  | FeatRecord
  | Decoded<typeof SpeciesRecordSchema>
  | SpeciesTraitRecord
  | MagicItemRecord
  | Decoded<typeof ArmorRecordSchema>
  | ArmorTemplateRecord
  | Decoded<typeof ShieldRecordSchema>
  | ShieldTemplateRecord
  | WeaponTemplateRecord
  | Decoded<typeof WeaponRecordSchema>;

export type UnitRecordEncoded =
  | Encoded<typeof SpellRecordSchema>
  | Encoded<typeof NonWizardClassRecordSchema>
  | Encoded<typeof WizardClassRecordSchema>
  | Encoded<typeof SubclassRecordSchema>
  | ClassFeatureRecordEncoded
  | Encoded<typeof BackgroundRecordSchema>
  | Encoded<typeof MasteryRecordSchema>
  | FeatRecordEncoded
  | Encoded<typeof SpeciesRecordSchema>
  | SpeciesTraitRecordEncoded
  | MagicItemRecordEncoded
  | Encoded<typeof ArmorRecordSchema>
  | ArmorTemplateRecordEncoded
  | Encoded<typeof ShieldRecordSchema>
  | ShieldTemplateRecordEncoded
  | WeaponTemplateRecordEncoded
  | Encoded<typeof WeaponRecordSchema>;
