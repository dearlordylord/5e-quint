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
  CreatureNamedActionOptionSchema,
  CreatureControlSchema,
  CreatureDismissalSchema,
  CreatureImmunityListSchema,
  CreatureSavingThrowModifierSchema,
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
  CreatureVulnerabilityListSchema,
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
  BackgroundRecordKindSchema,
  ConditionSchema,
  CreatureTypeSchema,
  DamageTypeSchema,
  DiceAmountSchema,
  DiceDeltaSchema,
  DiceExprDeltaSchema,
  DiceExprSchema,
  DurationUpcastTierSchema,
  DurationValueSchema,
  ClassRecordKindSchema,
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
  SpeciesRecordKindSchema,
  STANDARD_ACTION_KINDS,
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
  ArmorTrainingSchema,
  BackgroundAbilityScoreIncreaseSchema,
  BackgroundRecordSchema,
  BackgroundToolProficiencySchema,
  ChargePoolResourceSchema,
  ClassFeatureActivationCostSchema,
  ClassFeatureGrantSchema,
  ClassFeatureActivationMechanicsSchema,
  ClassFeatureComponentMechanicsSchema,
  ClassGeneralFeatureMechanicsSchema,
  ClassFeatureMechanicsSchema,
  ClassFeatureRecordSchema,
  ClassRecordSchema,
  FighterClassFeatureMechanicsSchema,
  FighterClassFeatureRecordSchema,
  NonWizardClassRecordSchema,
  OtherClassFeatureRecordSchema,
  CompositeClassFeatureMechanicsSchema,
  ArcaneRecoveryMechanicsSchema,
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
  OnHitRiderEffectSchema,
  PassiveMechanicsSchema,
  PassiveOperationSchema,
  PassiveSuppressorSchema,
  RitualAdeptMechanicsSchema,
  RelativeDayResetTriggerSchema,
  ResetCadenceSchema,
  RestResetCadenceSchema,
  RerollWeaponDamageDiceRiderSchema,
  RiderExpirySchema,
  SaveGateRiderResultSchema,
  SaveGateRiderSchema,
  SecondaryTargetSelectionSchema,
  OrcSpeciesRecordSchema,
  OrcSpeciesTraitsSchema,
  SpeciesRecordSchema,
  SpeciesTraitMechanicsSchema,
  SpeciesTraitRecordSchema,
  ShieldRecordSchema,
  ShieldTemplateRecordSchema,
  StartingEquipmentChoiceSchema,
  StartingEquipmentItemRefSchema,
  TimeResetCadenceSchema,
  TacticalMindMechanicsSchema,
  TriggeredReplacementMechanicsSchema,
  TriggeredReactionAbilityMechanicsSchema,
  UseCountCapSchema,
  UseCountResourceSchema,
  WizardSpellcastingCreationSchema,
  WizardClassFeatureMechanicsSchema,
  WizardClassFeatureRecordSchema,
  WizardClassRecordSchema,
  UnitRecordSchema,
  WeaponMasteryChoiceMechanicsSchema,
  ItemDestructionPolicySchema,
  MagicItemSpawnedCreatureMechanicsSchema,
  WeaponTemplateRecordSchema,
  WeaponRecordSchema,
} from "./schema-nonspell.ts";

import {
  ArmorRecordSchema,
  ArmorTemplateRecordSchema,
  BackgroundRecordSchema,
  ClassFeatureRecordSchema,
  ClassRecordSchema,
  FeatRecordSchema,
  MagicItemRecordSchema,
  MasteryRecordSchema,
  ShieldRecordSchema,
  ShieldTemplateRecordSchema,
  SpeciesRecordSchema,
  SpeciesTraitRecordSchema,
  UnitRecordSchema,
  WeaponTemplateRecordSchema,
  WeaponRecordSchema,
} from "./schema-nonspell.ts";
import { ProvenanceSchema } from "./schema-base.ts";
import { CreatureStatBlockSchema, SpellRecordSchema } from "./schema-spell.ts";

// EXPLANATION: package-owned handwritten Effect decode boundary for the full
// content surface. Consumers decode through these helpers and derive types from
// this schema entrypoint rather than casting authored JSON.

export const MonsterStatBlockSchema = CreatureStatBlockSchema;

export const StatBlockRecordSchema = Schema.Struct({
  id: Schema.NonEmptyTrimmedString,
  kind: Schema.Literal("statBlock"),
  name: Schema.NonEmptyTrimmedString,
  provenance: ProvenanceSchema,
  statBlock: MonsterStatBlockSchema,
});

export function decodeUnitRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof UnitRecordSchema> {
  return Schema.decodeUnknownSync(UnitRecordSchema)(raw);
}

export function decodeStatBlockRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof StatBlockRecordSchema> {
  return Schema.decodeUnknownSync(StatBlockRecordSchema)(raw);
}

export function decodeMonsterStatBlockSync(
  raw: unknown,
): Schema.Schema.Type<typeof MonsterStatBlockSchema> {
  return Schema.decodeUnknownSync(MonsterStatBlockSchema)(raw);
}

export function decodeStatBlockRecordEither(
  raw: unknown,
): Either.Either<
  Schema.Schema.Type<typeof StatBlockRecordSchema>,
  ParseResult.ParseError
> {
  return Schema.decodeUnknownEither(StatBlockRecordSchema)(raw);
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

export function decodeClassRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof ClassRecordSchema> {
  return Schema.decodeUnknownSync(ClassRecordSchema)(raw);
}

export function decodeBackgroundRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof BackgroundRecordSchema> {
  return Schema.decodeUnknownSync(BackgroundRecordSchema)(raw);
}

export function decodeSpeciesRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof SpeciesRecordSchema> {
  return Schema.decodeUnknownSync(SpeciesRecordSchema)(raw);
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

export function decodeWeaponTemplateRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof WeaponTemplateRecordSchema> {
  return Schema.decodeUnknownSync(WeaponTemplateRecordSchema)(raw);
}

export function decodeUnitRecordEither(
  raw: unknown,
): Either.Either<
  Schema.Schema.Type<typeof UnitRecordSchema>,
  ParseResult.ParseError
> {
  return Schema.decodeUnknownEither(UnitRecordSchema)(raw);
}

export function formatSurfaceDecodeError(
  error: ParseResult.ParseError,
): string {
  return ParseResult.TreeFormatter.formatErrorSync(error);
}
