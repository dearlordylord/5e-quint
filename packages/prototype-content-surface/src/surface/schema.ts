import { Either, ParseResult, Schema } from "effect";

export {
  ActionRestrictionSchema,
  ActivationMechanicsSchema,
  ActivationPhaseSchema,
  AnchorTargetSchema,
  AnchoredEventSchema,
  AnchoredFilterSchema,
  AnchoredSignalSchema,
  AnchoredTriggerMechanicsSchema,
  AreaOccupantDispositionFilterSchema,
  AreaOriginSchema,
  AreaShapeDescriptorSchema,
  AreaShapeSpecSchema,
  AttachmentRangeOriginSchema,
  AttachmentSchema,
  CastTimeEffectModeChoiceSchema,
  CastTimeChoiceCreatureTypeSchema,
  CastTimeChoiceDamageTypeSchema,
  CastTimeChoiceSizeSchema,
  CastingTimeSchema,
  ComponentsSchema,
  CreatureActionsSchema,
  CreatureControlSchema,
  CreatureDismissalSchema,
  CreatureImmunityListSchema,
  CreatureModeSchema,
  CreatureNamedAttackRollSchema,
  CreatureNamedMultiattackSchema,
  CreatureNamedSaveGateSchema,
  CreatureNamedSupportSchema,
  CreatureResistanceListSchema,
  CreatureSenseSchema,
  CreatureSpeedSchema,
  CreatureStatBlockOverridesSchema,
  CreatureStatBlockSchema,
  CreatureTraitEffectSchema,
  CreatureTraitSchema,
  CreatedObjectDurabilitySchema,
  DcSourceSchema,
  DamageTypeRefSchema,
  DurationEndTriggerSchema,
  DurationSchema,
  EffectAtomSchema,
  IllusionSensoryChannelSchema,
  MarkTransferCostSchema,
  MarkTransferEventSchema,
  MarkTransferSchema,
  ObjectFilterSchema,
  ObjectMaterialSchema,
  OngoingCasterActionCostSchema,
  OngoingEffectMechanicsSchema,
  OngoingEffectSchema,
  OngoingOperationSchema,
  OngoingPredicateSchema,
  OngoingTriggerSchema,
  ModifyAcSetBaseEffectSchema,
  ModifyAcSetFloorEffectSchema,
  PhaseContinuationSchema,
  PolymorphActionRestrictionSchema,
  PolymorphFormSourceSchema,
  PolymorphRetainedFieldSchema,
  PolymorphRevertTriggerSchema,
  RangeSchema,
  RandomTableOutcomeSchema,
  RandomTableRollSchema,
  ReactionTriggerSchema,
  ReanimatedCreatureMechanicsSchema,
  ReanimationMenuSchema,
  ReanimationReassertWindowSchema,
  ReanimationSlotEntrySchema,
  ReanimationSlotOptionSchema,
  ReanimationTargetKindSchema,
  RepeatSaveSpecSchema,
  SaveSuccessOutcomeSchema,
  SizeSchema,
  SixAbilityScoresSchema,
  SpawnedCreatureMechanicsSchema,
  SpawnedCreaturePayloadSchema,
  SpawnedCreatureStatBlockSchema,
  SpellLevelSchema,
  SpellMechanicsHeaderSchema,
  SpellMechanicsSchema,
  SpellRecordSchema,
  SpellSchoolSchema,
  SlotScalingNumberSchema,
  StatBlockValueSchema,
  TemplatedCapacitySchema,
  TemplatedMultiSpawnMechanicsSchema,
  TemplatedSizeTierSchema,
  TargetSelectionSchema,
  TargetTypeFilterSchema,
  TriggeredReactionMechanicsSchema,
} from "./schema-spell.ts";
export {
  AbilitySchema,
  ArmorAcFormulaSchema,
  ArmorCategorySchema,
  AreaShapeSchema,
  AttackKindSchema,
  ArmorTrainingCategorySchema,
  ConditionSchema,
  CreatureTypeSchema,
  DamageTypeSchema,
  DiceAmountSchema,
  DiceDeltaSchema,
  DiceExprDeltaSchema,
  DiceExprSchema,
  DurationUpcastTierSchema,
  DurationValueSchema,
  ClassNameSchema,
  ContainerStorageProfileSchema,
  ExileDestinationSchema,
  FeatCategorySchema,
  GrantedSpellDurationOverrideSchema,
  GrantedSpellTargetRestrictionSchema,
  LevelAxisSchema,
  LinkedDamageSchema,
  LinkedSpeedSchema,
  MagicItemRaritySchema,
  HeavyArmorAcFormulaSchema,
  LightArmorAcFormulaSchema,
  MediumArmorAcFormulaSchema,
  ProficiencyGrantSchema,
  ProficiencyGrantSubjectSchema,
  ProvenanceSchema,
  ResistanceSourceFilterSchema,
  RestKindSchema,
  RollKindSchema,
  SavingThrowSourceFilterSchema,
  SenseKindSchema,
  SkillSchema,
  SkillFilterSchema,
  SpellAccessModeSchema,
  StandardActionKindSchema,
  UsageLimitSchema,
  WeaponCategorySchema,
  WeaponDamageSchema,
  WeaponFilterSchema,
  WeaponMasteryNameSchema,
  WeaponPropertyDetailSchema,
  WeaponPropertySchema,
  WeaponProficiencyCategorySchema,
  WeaponRangeSchema,
  WeaponUsageSchema,
} from "./schema-base.ts";
export {
  ActivationResourceSchema,
  ActivatedAbilityMechanicsSchema,
  ArmorRecordSchema,
  ArmorTemplateRecordSchema,
  ChargePoolResourceSchema,
  ClassFeatureActivationCostSchema,
  ClassFeatureActivationMechanicsSchema,
  ClassFeatureComponentMechanicsSchema,
  ClassFeatureMechanicsSchema,
  ClassFeatureRecordSchema,
  CompositeClassFeatureMechanicsSchema,
  CompositeMagicItemMechanicsSchema,
  EquipmentPredicateSchema,
  FeatMechanicsSchema,
  FeatRecordSchema,
  GrantWeaponAttackRiderSchema,
  MagicItemAttunementRestrictionSchema,
  MagicItemAttunementSchema,
  MagicItemComponentMechanicsSchema,
  MagicItemMechanicsSchema,
  MagicItemRecordSchema,
  MagicEquipmentTraitSchema,
  MagicEquipmentVariantSchema,
  MagicItemVariantSchema,
  MasteryEffectSchema,
  MasteryMechanicsSchema,
  MasteryRecordSchema,
  MasteryTriggerSchema,
  ModifyRollAdvantageRiderSchema,
  OnHitTriggerMechanicsSchema,
  PassiveMechanicsSchema,
  PassiveOperationSchema,
  PassiveSuppressorSchema,
  RelativeDayResetTriggerSchema,
  ResetCadenceSchema,
  RestResetCadenceSchema,
  RiderExpirySchema,
  SaveGateRiderResultSchema,
  SaveGateRiderSchema,
  SecondaryTargetSelectionSchema,
  SpeciesTraitMechanicsSchema,
  SpeciesTraitRecordSchema,
  ShieldRecordSchema,
  ShieldTemplateRecordSchema,
  TimeResetCadenceSchema,
  TriggeredReactionAbilityMechanicsSchema,
  UseCountCapSchema,
  UseCountResourceSchema,
  UnitRecordSchema,
  ItemDestructionPolicySchema,
  MagicItemSpawnedCreatureMechanicsSchema,
  WeaponRecordSchema,
} from "./schema-nonspell.ts";

import {
  ArmorRecordSchema,
  ArmorTemplateRecordSchema,
  ClassFeatureRecordSchema,
  FeatRecordSchema,
  MagicItemRecordSchema,
  MasteryRecordSchema,
  ShieldRecordSchema,
  ShieldTemplateRecordSchema,
  SpeciesTraitRecordSchema,
  UnitRecordSchema,
  WeaponRecordSchema,
} from "./schema-nonspell.ts";
import {
  SpellRecordSchema,
} from "./schema-spell.ts";

// EXPLANATION: package-owned handwritten Effect decode boundary for the full
// content surface. Consumers decode through these helpers and derive types from
// this schema entrypoint rather than casting authored JSON.

export function decodeUnitRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof UnitRecordSchema> {
  return Schema.decodeUnknownSync(UnitRecordSchema)(raw);
}

export function decodeSpellRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof SpellRecordSchema> {
  return Schema.decodeUnknownSync(SpellRecordSchema)(raw);
}

export function decodeClassFeatureRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof ClassFeatureRecordSchema> {
  return Schema.decodeUnknownSync(ClassFeatureRecordSchema)(raw);
}

export function decodeMasteryRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof MasteryRecordSchema> {
  return Schema.decodeUnknownSync(MasteryRecordSchema)(raw);
}

export function decodeFeatRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof FeatRecordSchema> {
  return Schema.decodeUnknownSync(FeatRecordSchema)(raw);
}

export function decodeSpeciesTraitRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof SpeciesTraitRecordSchema> {
  return Schema.decodeUnknownSync(SpeciesTraitRecordSchema)(raw);
}

export function decodeMagicItemRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof MagicItemRecordSchema> {
  return Schema.decodeUnknownSync(MagicItemRecordSchema)(raw);
}

export function decodeArmorRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof ArmorRecordSchema> {
  return Schema.decodeUnknownSync(ArmorRecordSchema)(raw);
}

export function decodeArmorTemplateRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof ArmorTemplateRecordSchema> {
  return Schema.decodeUnknownSync(ArmorTemplateRecordSchema)(raw);
}

export function decodeShieldRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof ShieldRecordSchema> {
  return Schema.decodeUnknownSync(ShieldRecordSchema)(raw);
}

export function decodeShieldTemplateRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof ShieldTemplateRecordSchema> {
  return Schema.decodeUnknownSync(ShieldTemplateRecordSchema)(raw);
}

export function decodeWeaponRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof WeaponRecordSchema> {
  return Schema.decodeUnknownSync(WeaponRecordSchema)(raw);
}

export function decodeUnitRecordEither(
  raw: unknown,
): Either.Either<Schema.Schema.Type<typeof UnitRecordSchema>, ParseResult.ParseError> {
  return Schema.decodeUnknownEither(UnitRecordSchema)(raw);
}

export function formatSurfaceDecodeError(error: ParseResult.ParseError): string {
  return ParseResult.TreeFormatter.formatErrorSync(error);
}
