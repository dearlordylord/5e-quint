import { Schema } from "effect";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import {
  CREATURE_TYPES as SHARED_CREATURE_TYPES,
  SURFACE_CONDITIONS,
  SURFACE_SKILLS,
} from "@dnd/shared/game-facts";
import * as SurfaceSchema from "./schema.ts";

// Runtime literal sets kept as values; concrete surface types derive from the Effect schemas.
export const SKILLS = SURFACE_SKILLS satisfies ReadonlyArray<Skill>;
export const CONDITIONS = SURFACE_CONDITIONS satisfies ReadonlyArray<Condition>;
export const AREA_SHAPES = [
  "sphere",
  "cone",
  "cube",
  "cylinder",
  "emanation",
  "line",
] as const satisfies ReadonlyArray<AreaShape>;
export const CREATURE_TYPES =
  SHARED_CREATURE_TYPES satisfies ReadonlyArray<CreatureType>;
export const ILLUSION_SENSORY_CHANNELS = [
  "visual",
  "sound",
  "smell",
  "temperature",
] as const satisfies ReadonlyArray<IllusionSensoryChannel>;
export const OBJECT_MATERIALS = [
  "metal",
  "flammable",
] as const satisfies ReadonlyArray<ObjectMaterial>;

// Generic type-level utilities retained for authored-surface helper composition.
export type CastTimeChoice<T> = {
  readonly kind: "choice";
  readonly label: string;
  readonly options: ReadonlyNonEmptyArray<T>;
};
export type LinearPerLevel<T> = {
  readonly kind: "linear_per_level";
  readonly axis: LevelAxis;
  readonly base: T;
  readonly perLevel: T;
  readonly startingAtLevel: number;
};
export type ThresholdTiers<T> = {
  readonly kind: "threshold_tiers";
  readonly axis: LevelAxis;
  readonly base: T;
  readonly tiers: ReadonlyNonEmptyArray<{
    readonly atLevel: number;
    readonly value: T;
  }>;
};
export type SlotScaling<T> = {
  readonly kind: "linear";
  readonly base: T;
  readonly perSlotAboveBase: T;
  readonly baseLevel: number;
};

export type RollKind = Schema.Schema.Type<typeof SurfaceSchema.RollKindSchema>;
export type WeaponProperty = Schema.Schema.Type<
  typeof SurfaceSchema.WeaponPropertySchema
>;
export type ArmorCategory = Schema.Schema.Type<
  typeof SurfaceSchema.ArmorCategorySchema
>;
export type LightArmorAcFormula = Schema.Schema.Type<
  typeof SurfaceSchema.LightArmorAcFormulaSchema
>;
export type MediumArmorAcFormula = Schema.Schema.Type<
  typeof SurfaceSchema.MediumArmorAcFormulaSchema
>;
export type HeavyArmorAcFormula = Schema.Schema.Type<
  typeof SurfaceSchema.HeavyArmorAcFormulaSchema
>;
export type ArmorAcFormula = Schema.Schema.Type<
  typeof SurfaceSchema.ArmorAcFormulaSchema
>;
export type WeaponCategory = Schema.Schema.Type<
  typeof SurfaceSchema.WeaponCategorySchema
>;
export type WeaponUsage = Schema.Schema.Type<
  typeof SurfaceSchema.WeaponUsageSchema
>;
export type WeaponDamage = Schema.Schema.Type<
  typeof SurfaceSchema.WeaponDamageSchema
>;
export type WeaponRange = Schema.Schema.Type<
  typeof SurfaceSchema.WeaponRangeSchema
>;
export type WeaponPropertyDetail = Schema.Schema.Type<
  typeof SurfaceSchema.WeaponPropertyDetailSchema
>;
export type WeaponMasteryName = Schema.Schema.Type<
  typeof SurfaceSchema.WeaponMasteryNameSchema
>;
export type WeaponFilter = Schema.Schema.Type<
  typeof SurfaceSchema.WeaponFilterSchema
>;
export type ResistanceSourceFilter = Schema.Schema.Type<
  typeof SurfaceSchema.ResistanceSourceFilterSchema
>;
export type SavingThrowSourceFilter = Schema.Schema.Type<
  typeof SurfaceSchema.SavingThrowSourceFilterSchema
>;
export type Ability = Schema.Schema.Type<typeof SurfaceSchema.AbilitySchema>;
export type DamageType = Schema.Schema.Type<
  typeof SurfaceSchema.DamageTypeSchema
>;
export type CastTimeEffectModeChoice = Schema.Schema.Type<
  typeof SurfaceSchema.CastTimeEffectModeChoiceSchema
>;
export type DamageTypeRef = Schema.Schema.Type<
  typeof SurfaceSchema.DamageTypeRefSchema
>;
export type AttackKind = Schema.Schema.Type<
  typeof SurfaceSchema.AttackKindSchema
>;
export type ExileDestination = Schema.Schema.Type<
  typeof SurfaceSchema.ExileDestinationSchema
>;
export type ContainerStorageProfile = Schema.Schema.Type<
  typeof SurfaceSchema.ContainerStorageProfileSchema
>;
export type StandardActionKind = Schema.Schema.Type<
  typeof SurfaceSchema.StandardActionKindSchema
>;
export type ClassName = Schema.Schema.Type<
  typeof SurfaceSchema.ClassNameSchema
>;
export type ClassRecordKind = Schema.Schema.Type<
  typeof SurfaceSchema.ClassRecordKindSchema
>;
export type SubclassRecordKind = Schema.Schema.Type<
  typeof SurfaceSchema.SubclassRecordKindSchema
>;
export type BackgroundRecordKind = Schema.Schema.Type<
  typeof SurfaceSchema.BackgroundRecordKindSchema
>;
export type SpeciesRecordKind = Schema.Schema.Type<
  typeof SurfaceSchema.SpeciesRecordKindSchema
>;
export type RestKind = Schema.Schema.Type<typeof SurfaceSchema.RestKindSchema>;
export type FeatCategory = Schema.Schema.Type<
  typeof SurfaceSchema.FeatCategorySchema
>;
export type DiceDelta = Schema.Schema.Type<
  typeof SurfaceSchema.DiceDeltaSchema
>;
export type DurationUpcastTier = Schema.Schema.Type<
  typeof SurfaceSchema.DurationUpcastTierSchema
>;
export type TimeSpanDurationValue = Schema.Schema.Type<
  typeof SurfaceSchema.TimeSpanDurationValueSchema
>;
export type DurationValue = Schema.Schema.Type<
  typeof SurfaceSchema.DurationValueSchema
>;
export type Skill = Schema.Schema.Type<typeof SurfaceSchema.SkillSchema>;
export type SkillFilter = Schema.Schema.Type<
  typeof SurfaceSchema.SkillFilterSchema
>;
export type WeaponProficiencyCategory = Schema.Schema.Type<
  typeof SurfaceSchema.WeaponProficiencyCategorySchema
>;
export type ArmorTrainingCategory = Schema.Schema.Type<
  typeof SurfaceSchema.ArmorTrainingCategorySchema
>;
export type ProficiencyGrantSubject = Schema.Schema.Type<
  typeof SurfaceSchema.ProficiencyGrantSubjectSchema
>;
export type ProficiencyGrant = Schema.Schema.Type<
  typeof SurfaceSchema.ProficiencyGrantSchema
>;
export type Condition = Schema.Schema.Type<
  typeof SurfaceSchema.ConditionSchema
>;
export type AreaShape = Schema.Schema.Type<
  typeof SurfaceSchema.AreaShapeSchema
>;
export type SenseKind = Schema.Schema.Type<
  typeof SurfaceSchema.SenseKindSchema
>;
export type CreatureType = Schema.Schema.Type<
  typeof SurfaceSchema.CreatureTypeSchema
>;
export type LevelAxis = Schema.Schema.Type<
  typeof SurfaceSchema.LevelAxisSchema
>;
export type DiceExpr = Schema.Schema.Type<typeof SurfaceSchema.DiceExprSchema>;
export type DiceExprDelta = Schema.Schema.Type<
  typeof SurfaceSchema.DiceExprDeltaSchema
>;
export type DiceAmount = Schema.Schema.Type<
  typeof SurfaceSchema.DiceAmountSchema
>;
export type LinkedSpeed = Schema.Schema.Type<
  typeof SurfaceSchema.LinkedSpeedSchema
>;
export type LinkedDamage = Schema.Schema.Type<
  typeof SurfaceSchema.LinkedDamageSchema
>;
export type SpellAccessMode = Schema.Schema.Type<
  typeof SurfaceSchema.SpellAccessModeSchema
>;
export type GrantedSpellTargetRestriction = Schema.Schema.Type<
  typeof SurfaceSchema.GrantedSpellTargetRestrictionSchema
>;
export type GrantedSpellDurationOverride = Schema.Schema.Type<
  typeof SurfaceSchema.GrantedSpellDurationOverrideSchema
>;
export type EffectAtom = Schema.Schema.Type<
  typeof SurfaceSchema.EffectAtomSchema
>;
export type SpellLevel = Schema.Schema.Type<
  typeof SurfaceSchema.SpellLevelSchema
>;
export type SpellSchool = Schema.Schema.Type<
  typeof SurfaceSchema.SpellSchoolSchema
>;
export type ReactionTrigger = Schema.Schema.Type<
  typeof SurfaceSchema.ReactionTriggerSchema
>;
export type CastingTime = Schema.Schema.Type<
  typeof SurfaceSchema.CastingTimeSchema
>;
export type Range = Schema.Schema.Type<typeof SurfaceSchema.RangeSchema>;
export type Components = Schema.Schema.Type<
  typeof SurfaceSchema.ComponentsSchema
>;
export type DurationEndTrigger = Schema.Schema.Type<
  typeof SurfaceSchema.DurationEndTriggerSchema
>;
export type Duration = Schema.Schema.Type<typeof SurfaceSchema.DurationSchema>;
export type RepeatSaveSpec = Schema.Schema.Type<
  typeof SurfaceSchema.RepeatSaveSpecSchema
>;
export type TargetTypeFilter = Schema.Schema.Type<
  typeof SurfaceSchema.TargetTypeFilterSchema
>;
export type AreaOccupantDispositionFilter = Schema.Schema.Type<
  typeof SurfaceSchema.AreaOccupantDispositionFilterSchema
>;
export type TargetSelection = Schema.Schema.Type<
  typeof SurfaceSchema.TargetSelectionSchema
>;
export type AreaOrigin = Schema.Schema.Type<
  typeof SurfaceSchema.AreaOriginSchema
>;
export type AreaShapeDescriptor = Schema.Schema.Type<
  typeof SurfaceSchema.AreaShapeDescriptorSchema
>;
export type AreaShapeSpec = Schema.Schema.Type<
  typeof SurfaceSchema.AreaShapeSpecSchema
>;
export type MarkTransferEvent = Schema.Schema.Type<
  typeof SurfaceSchema.MarkTransferEventSchema
>;
export type MarkTransferCost = Schema.Schema.Type<
  typeof SurfaceSchema.MarkTransferCostSchema
>;
export type MarkTransfer = Schema.Schema.Type<
  typeof SurfaceSchema.MarkTransferSchema
>;
export type AttachmentRangeOrigin = Schema.Schema.Type<
  typeof SurfaceSchema.AttachmentRangeOriginSchema
>;
export type Attachment = Schema.Schema.Type<
  typeof SurfaceSchema.AttachmentSchema
>;
export type CreatedObjectDurability = Schema.Schema.Type<
  typeof SurfaceSchema.CreatedObjectDurabilitySchema
>;
export type IllusionSensoryChannel = Schema.Schema.Type<
  typeof SurfaceSchema.IllusionSensoryChannelSchema
>;
export type ObjectMaterial = Schema.Schema.Type<
  typeof SurfaceSchema.ObjectMaterialSchema
>;
export type ObjectFilter = Schema.Schema.Type<
  typeof SurfaceSchema.ObjectFilterSchema
>;
export type DcSource = Schema.Schema.Type<typeof SurfaceSchema.DcSourceSchema>;
export type OngoingTrigger = Schema.Schema.Type<
  typeof SurfaceSchema.OngoingTriggerSchema
>;
export type OngoingCasterActionCost = Schema.Schema.Type<
  typeof SurfaceSchema.OngoingCasterActionCostSchema
>;
export type OngoingPredicate = Schema.Schema.Type<
  typeof SurfaceSchema.OngoingPredicateSchema
>;
export type ModifyAcSetBaseEffect = Schema.Schema.Type<
  typeof SurfaceSchema.ModifyAcSetBaseEffectSchema
>;
export type ModifyAcSetFloorEffect = Schema.Schema.Type<
  typeof SurfaceSchema.ModifyAcSetFloorEffectSchema
>;
export type OngoingEffect = Schema.Schema.Type<
  typeof SurfaceSchema.OngoingEffectSchema
>;
export type OngoingOperation = Schema.Schema.Type<
  typeof SurfaceSchema.OngoingOperationSchema
>;
export type PassiveOperation = Schema.Schema.Type<
  typeof SurfaceSchema.PassiveOperationSchema
>;
export type ActionRestriction = Schema.Schema.Type<
  typeof SurfaceSchema.ActionRestrictionSchema
>;
export type SaveSuccessOutcome = Schema.Schema.Type<
  typeof SurfaceSchema.SaveSuccessOutcomeSchema
>;
export type RandomTableRoll = Schema.Schema.Type<
  typeof SurfaceSchema.RandomTableRollSchema
>;
export type RandomTableOutcome = Schema.Schema.Type<
  typeof SurfaceSchema.RandomTableOutcomeSchema
>;
export type ActivationPhase = Schema.Schema.Type<
  typeof SurfaceSchema.ActivationPhaseSchema
>;
export type PhaseContinuation = Schema.Schema.Type<
  typeof SurfaceSchema.PhaseContinuationSchema
>;
export type OngoingEffectMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.OngoingEffectMechanicsSchema
>;
export type ActivationMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.ActivationMechanicsSchema
>;
export type TriggeredReactionMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.TriggeredReactionMechanicsSchema
>;
export type AnchorTarget = Schema.Schema.Type<
  typeof SurfaceSchema.AnchorTargetSchema
>;
export type AnchoredEvent = Schema.Schema.Type<
  typeof SurfaceSchema.AnchoredEventSchema
>;
export type AnchoredFilter = Schema.Schema.Type<
  typeof SurfaceSchema.AnchoredFilterSchema
>;
export type AnchoredSignal = Schema.Schema.Type<
  typeof SurfaceSchema.AnchoredSignalSchema
>;
export type AnchoredTriggerMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.AnchoredTriggerMechanicsSchema
>;
export type StatBlockValue = Schema.Schema.Type<
  typeof SurfaceSchema.StatBlockValueSchema
>;
export type Size = Schema.Schema.Type<typeof SurfaceSchema.SizeSchema>;
export type SixAbilityScores = Schema.Schema.Type<
  typeof SurfaceSchema.SixAbilityScoresSchema
>;
export type CreatureSpeed = Schema.Schema.Type<
  typeof SurfaceSchema.CreatureSpeedSchema
>;
export type CreatureResistanceList = Schema.Schema.Type<
  typeof SurfaceSchema.CreatureResistanceListSchema
>;
export type CreatureVulnerabilityList = Schema.Schema.Type<
  typeof SurfaceSchema.CreatureVulnerabilityListSchema
>;
export type CreatureImmunityList = Schema.Schema.Type<
  typeof SurfaceSchema.CreatureImmunityListSchema
>;
export type CreatureSense = Schema.Schema.Type<
  typeof SurfaceSchema.CreatureSenseSchema
>;
export type CreatureNamedAttackRoll = Schema.Schema.Type<
  typeof SurfaceSchema.CreatureNamedAttackRollSchema
>;
export type CreatureNamedSaveGate = Schema.Schema.Type<
  typeof SurfaceSchema.CreatureNamedSaveGateSchema
>;
export type CreatureNamedSupport = Schema.Schema.Type<
  typeof SurfaceSchema.CreatureNamedSupportSchema
>;
export type CreatureNamedMultiattack = Schema.Schema.Type<
  typeof SurfaceSchema.CreatureNamedMultiattackSchema
>;
export type CreatureNamedActionOption = Schema.Schema.Type<
  typeof SurfaceSchema.CreatureNamedActionOptionSchema
>;
export type CreatureActions = Schema.Schema.Type<
  typeof SurfaceSchema.CreatureActionsSchema
>;
export type CreatureLimitedUse = Schema.Schema.Type<
  typeof SurfaceSchema.CreatureLimitedUseSchema
>;
export type CreatureLegendaryActions = Schema.Schema.Type<
  typeof SurfaceSchema.CreatureLegendaryActionsSchema
>;
export type CreatureSavingThrowModifier = Schema.Schema.Type<
  typeof SurfaceSchema.CreatureSavingThrowModifierSchema
>;
export type CreatureTraitEffect = Schema.Schema.Type<
  typeof SurfaceSchema.CreatureTraitEffectSchema
>;
export type CreatureTrait = Schema.Schema.Type<
  typeof SurfaceSchema.CreatureTraitSchema
>;
export type CreatureStatBlock = Schema.Schema.Type<
  typeof SurfaceSchema.CreatureStatBlockSchema
>;
export type MonsterStatBlock = Schema.Schema.Type<
  typeof SurfaceSchema.MonsterStatBlockSchema
>;
export type CreatureStatBlockOverrides = Schema.Schema.Type<
  typeof SurfaceSchema.CreatureStatBlockOverridesSchema
>;
export type CreatureMode = Schema.Schema.Type<
  typeof SurfaceSchema.CreatureModeSchema
>;
export type CreatureControl = Schema.Schema.Type<
  typeof SurfaceSchema.CreatureControlSchema
>;
export type CreatureDismissal = Schema.Schema.Type<
  typeof SurfaceSchema.CreatureDismissalSchema
>;
export type PolymorphFormSource = Schema.Schema.Type<
  typeof SurfaceSchema.PolymorphFormSourceSchema
>;
export type PolymorphRetainedField = Schema.Schema.Type<
  typeof SurfaceSchema.PolymorphRetainedFieldSchema
>;
export type PolymorphActionRestriction = Schema.Schema.Type<
  typeof SurfaceSchema.PolymorphActionRestrictionSchema
>;
export type PolymorphRevertTrigger = Schema.Schema.Type<
  typeof SurfaceSchema.PolymorphRevertTriggerSchema
>;
export type TemplatedCapacity = Schema.Schema.Type<
  typeof SurfaceSchema.TemplatedCapacitySchema
>;
export type TemplatedSizeTier = Schema.Schema.Type<
  typeof SurfaceSchema.TemplatedSizeTierSchema
>;
export type TemplatedMultiSpawnMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.TemplatedMultiSpawnMechanicsSchema
>;
export type ReanimationTargetKind = Schema.Schema.Type<
  typeof SurfaceSchema.ReanimationTargetKindSchema
>;
export type ReanimationSlotOption = Schema.Schema.Type<
  typeof SurfaceSchema.ReanimationSlotOptionSchema
>;
export type ReanimationSlotEntry = Schema.Schema.Type<
  typeof SurfaceSchema.ReanimationSlotEntrySchema
>;
export type ReanimationMenu = Schema.Schema.Type<
  typeof SurfaceSchema.ReanimationMenuSchema
>;
export type ReanimationReassertWindow = Schema.Schema.Type<
  typeof SurfaceSchema.ReanimationReassertWindowSchema
>;
export type ReanimatedCreatureMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.ReanimatedCreatureMechanicsSchema
>;
export type SpawnedCreatureStatBlock = Schema.Schema.Type<
  typeof SurfaceSchema.SpawnedCreatureStatBlockSchema
>;
export type SpawnedCreaturePayload = Schema.Schema.Type<
  typeof SurfaceSchema.SpawnedCreaturePayloadSchema
>;
export type SpawnedCreatureMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.SpawnedCreatureMechanicsSchema
>;
export type SpellMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.SpellMechanicsSchema
>;
export type ClassFeatureActivationCost = Schema.Schema.Type<
  typeof SurfaceSchema.ClassFeatureActivationCostSchema
>;
export type UseCountCap = Schema.Schema.Type<
  typeof SurfaceSchema.UseCountCapSchema
>;
export type UseCountResource = Schema.Schema.Type<
  typeof SurfaceSchema.UseCountResourceSchema
>;
export type ChargePoolResource = Schema.Schema.Type<
  typeof SurfaceSchema.ChargePoolResourceSchema
>;
export type ActivationResource = Schema.Schema.Type<
  typeof SurfaceSchema.ActivationResourceSchema
>;
export type RelativeDayResetTrigger = Schema.Schema.Type<
  typeof SurfaceSchema.RelativeDayResetTriggerSchema
>;
export type RestResetCadence = Schema.Schema.Type<
  typeof SurfaceSchema.RestResetCadenceSchema
>;
export type TimeResetCadence = Schema.Schema.Type<
  typeof SurfaceSchema.TimeResetCadenceSchema
>;
export type ResetCadence = Schema.Schema.Type<
  typeof SurfaceSchema.ResetCadenceSchema
>;
export type ActivatedAbilityMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.ActivatedAbilityMechanicsSchema
>;
export type TriggeredReactionAbilityMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.TriggeredReactionAbilityMechanicsSchema
>;
export type MagicItemSpawnedCreatureMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.MagicItemSpawnedCreatureMechanicsSchema
>;
export type ClassFeatureActivationMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.ClassFeatureActivationMechanicsSchema
>;
export type ClassFeatureComponentMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.ClassFeatureComponentMechanicsSchema
>;
export type CompositeClassFeatureMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.CompositeClassFeatureMechanicsSchema
>;
export type WeaponMasteryChoiceMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.WeaponMasteryChoiceMechanicsSchema
>;
export type EquipmentPredicate = Schema.Schema.Type<
  typeof SurfaceSchema.EquipmentPredicateSchema
>;
export type PassiveSuppressor = Schema.Schema.Type<
  typeof SurfaceSchema.PassiveSuppressorSchema
>;
export type PassiveMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.PassiveMechanicsSchema
>;
export type ClassFeatureMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.ClassFeatureMechanicsSchema
>;
export type RiderExpiry = Schema.Schema.Type<
  typeof SurfaceSchema.RiderExpirySchema
>;
export type MasteryTrigger = Schema.Schema.Type<
  typeof SurfaceSchema.MasteryTriggerSchema
>;
export type AttackDamageRiderTrigger = Schema.Schema.Type<
  typeof SurfaceSchema.AttackDamageRiderTriggerSchema
>;
export type WeaponDamageDiceRerollTrigger = Schema.Schema.Type<
  typeof SurfaceSchema.WeaponDamageDiceRerollTriggerSchema
>;
export type SecondaryTargetSelection = Schema.Schema.Type<
  typeof SurfaceSchema.SecondaryTargetSelectionSchema
>;
export type GrantWeaponAttackRider = Schema.Schema.Type<
  typeof SurfaceSchema.GrantWeaponAttackRiderSchema
>;
export type ModifyRollAdvantageRider = Schema.Schema.Type<
  typeof SurfaceSchema.ModifyRollAdvantageRiderSchema
>;
export type SaveGateRiderResult = Schema.Schema.Type<
  typeof SurfaceSchema.SaveGateRiderResultSchema
>;
export type SaveGateRider = Schema.Schema.Type<
  typeof SurfaceSchema.SaveGateRiderSchema
>;
export type RerollWeaponDamageDiceRider = Schema.Schema.Type<
  typeof SurfaceSchema.RerollWeaponDamageDiceRiderSchema
>;
export type SapMasteryEffect = Schema.Schema.Type<
  typeof SurfaceSchema.SapMasteryEffectSchema
>;
export type ToppleMasteryEffect = Schema.Schema.Type<
  typeof SurfaceSchema.ToppleMasteryEffectSchema
>;
export type VexMasteryEffect = Schema.Schema.Type<
  typeof SurfaceSchema.VexMasteryEffectSchema
>;
export type WeaponHitMasteryEffect = Schema.Schema.Type<
  typeof SurfaceSchema.WeaponHitMasteryEffectSchema
>;
export type MasteryEffect = Schema.Schema.Type<
  typeof SurfaceSchema.MasteryEffectSchema
>;
export type OnHitRiderEffect = Schema.Schema.Type<
  typeof SurfaceSchema.OnHitRiderEffectSchema
>;
export type UsageLimit = Schema.Schema.Type<
  typeof SurfaceSchema.UsageLimitSchema
>;
export type AttackDamageRiderMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.AttackDamageRiderMechanicsSchema
>;
export type WeaponDamageDiceRerollMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.WeaponDamageDiceRerollMechanicsSchema
>;
export type SapMasteryMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.SapMasteryMechanicsSchema
>;
export type ToppleMasteryMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.ToppleMasteryMechanicsSchema
>;
export type VexMasteryMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.VexMasteryMechanicsSchema
>;
export type CleaveMasteryMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.CleaveMasteryMechanicsSchema
>;
export type OnHitTriggerMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.OnHitTriggerMechanicsSchema
>;
export type MasteryOrWeaponDamageDiceRerollMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.MasteryOrWeaponDamageDiceRerollMechanicsSchema
>;
export type MasteryMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.MasteryMechanicsSchema
>;
export type TriggeredReplacementMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.TriggeredReplacementMechanicsSchema
>;
export type Provenance = Schema.Schema.Type<
  typeof SurfaceSchema.ProvenanceSchema
>;
export type SpellRecord = Schema.Schema.Type<
  typeof SurfaceSchema.SpellRecordSchema
>;
export type StartingEquipmentChoice = Schema.Schema.Type<
  typeof SurfaceSchema.StartingEquipmentChoiceSchema
>;
export type StartingEquipmentItemRef = Schema.Schema.Type<
  typeof SurfaceSchema.StartingEquipmentItemRefSchema
>;
export type ClassFeatureGrant = Schema.Schema.Type<
  typeof SurfaceSchema.ClassFeatureGrantSchema
>;
export type ArmorTraining = Schema.Schema.Type<
  typeof SurfaceSchema.ArmorTrainingSchema
>;
export type WizardSpellcastingCreation = Schema.Schema.Type<
  typeof SurfaceSchema.WizardSpellcastingCreationSchema
>;
export type RitualAdeptMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.RitualAdeptMechanicsSchema
>;
export type ArcaneRecoveryMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.ArcaneRecoveryMechanicsSchema
>;
export type TacticalMindMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.TacticalMindMechanicsSchema
>;
export type ClassRecord = Schema.Schema.Type<
  typeof SurfaceSchema.ClassRecordSchema
>;
export type SubclassRecord = Schema.Schema.Type<
  typeof SurfaceSchema.SubclassRecordSchema
>;
export type WizardClassRecord = Schema.Schema.Type<
  typeof SurfaceSchema.WizardClassRecordSchema
>;
export type NonWizardClassRecord = Schema.Schema.Type<
  typeof SurfaceSchema.NonWizardClassRecordSchema
>;
export type ClassFeatureRecord = Schema.Schema.Type<
  typeof SurfaceSchema.ClassFeatureRecordSchema
>;
export type BackgroundToolProficiency = Schema.Schema.Type<
  typeof SurfaceSchema.BackgroundToolProficiencySchema
>;
export type BackgroundAbilityScoreIncrease = Schema.Schema.Type<
  typeof SurfaceSchema.BackgroundAbilityScoreIncreaseSchema
>;
export type BackgroundRecord = Schema.Schema.Type<
  typeof SurfaceSchema.BackgroundRecordSchema
>;
export type MasteryRecord = Schema.Schema.Type<
  typeof SurfaceSchema.MasteryRecordSchema
>;
export type FeatMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.FeatMechanicsSchema
>;
export type FeatRecord = Schema.Schema.Type<
  typeof SurfaceSchema.FeatRecordSchema
>;
export type SpeciesTraitMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.SpeciesTraitMechanicsSchema
>;
export type OrcSpeciesTraits = Schema.Schema.Type<
  typeof SurfaceSchema.OrcSpeciesTraitsSchema
>;
export type OrcSpeciesRecord = Schema.Schema.Type<
  typeof SurfaceSchema.OrcSpeciesRecordSchema
>;
export type SpeciesRecord = Schema.Schema.Type<
  typeof SurfaceSchema.SpeciesRecordSchema
>;
export type SpeciesTraitRecord = Schema.Schema.Type<
  typeof SurfaceSchema.SpeciesTraitRecordSchema
>;
export type MagicItemComponentMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.MagicItemComponentMechanicsSchema
>;
export type CompositeMagicItemMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.CompositeMagicItemMechanicsSchema
>;
export type MagicItemMechanics = Schema.Schema.Type<
  typeof SurfaceSchema.MagicItemMechanicsSchema
>;
export type MagicItemRarity = Schema.Schema.Type<
  typeof SurfaceSchema.MagicItemRaritySchema
>;
export type MagicItemAttunementRestriction = Schema.Schema.Type<
  typeof SurfaceSchema.MagicItemAttunementRestrictionSchema
>;
export type ItemDestructionPolicy = Schema.Schema.Type<
  typeof SurfaceSchema.ItemDestructionPolicySchema
>;
export type MagicItemAttunement = Schema.Schema.Type<
  typeof SurfaceSchema.MagicItemAttunementSchema
>;
export type MagicEquipmentTrait = Schema.Schema.Type<
  typeof SurfaceSchema.MagicEquipmentTraitSchema
>;
export type MagicEquipmentVariant = Schema.Schema.Type<
  typeof SurfaceSchema.MagicEquipmentVariantSchema
>;
export type MagicItemVariant = Schema.Schema.Type<
  typeof SurfaceSchema.MagicItemVariantSchema
>;
export type MagicItemRecord = Schema.Schema.Type<
  typeof SurfaceSchema.MagicItemRecordSchema
>;
export type ArmorRecord = Schema.Schema.Type<
  typeof SurfaceSchema.ArmorRecordSchema
>;
export type ArmorTemplateRecord = Schema.Schema.Type<
  typeof SurfaceSchema.ArmorTemplateRecordSchema
>;
export type ShieldRecord = Schema.Schema.Type<
  typeof SurfaceSchema.ShieldRecordSchema
>;
export type ShieldTemplateRecord = Schema.Schema.Type<
  typeof SurfaceSchema.ShieldTemplateRecordSchema
>;
export type WeaponTemplateRecord = Schema.Schema.Type<
  typeof SurfaceSchema.WeaponTemplateRecordSchema
>;
export type WeaponRecord = Schema.Schema.Type<
  typeof SurfaceSchema.WeaponRecordSchema
>;
export type UnitRecord = Schema.Schema.Type<
  typeof SurfaceSchema.UnitRecordSchema
>;
export type StatBlockRecord = Schema.Schema.Type<
  typeof SurfaceSchema.StatBlockRecordSchema
>;
