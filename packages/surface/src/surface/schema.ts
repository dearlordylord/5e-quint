import { Either, ParseResult, Schema } from "effect";

export {
  ActionBonusActionChoiceEffectSchema,
  ActionRestrictionSchema,
  ActivationMechanicsSchema,
  ActivationPhaseSchema,
  AnchorTargetSchema,
  AnchoredEventSchema,
  AnchoredFilterSchema,
  AnchoredSignalSchema,
  AnchoredTriggerMechanicsSchema,
  AreaAttachmentBaseSchema,
  AreaAttachmentSchema,
  AreaDirectEffectAtomSchema,
  AreaExclusionSchema,
  AudibleEffectSchema,
  AreaOccupantDispositionFilterSchema,
  AreaOccupantPerceptionFilterSchema,
  AreaOriginSchema,
  AreaPushUnsecuredObjectsSchema,
  AreaShapeDescriptorSchema,
  AreaScopedEffectAtomSchema,
  AreaShapeSpecSchema,
  AttachmentRangeOriginSchema,
  AttachmentSchema,
  AttackActionAttackCapEffectSchema,
  CastTimeEffectModeChoiceSchema,
  CastTimeChoiceCreatureTypeSchema,
  CastTimeChoiceDamageTypeSchema,
  CastTimeChoiceSizeSchema,
  CastingTimeSchema,
  CommandTargetNextTurnOptionsSchema,
  ComponentsSchema,
  CreatureActionsSchema,
  CreatureLegendaryActionsSchema,
  CreatureLimitedUseSchema,
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
  DivinationOmenEffectSchema,
  DurationEndTriggerSchema,
  DurationSchema,
  EffectAtomSchema,
  ExtradimensionalSpaceEffectSchema,
  FeatherFallMitigationSchema,
  ForceMoveAnyDirectionEffectSchema,
  ForceMoveEffectSchema,
  ForceMovePullSlideEffectSchema,
  ForceMovePushEffectSchema,
  ForcedReactionMovementSchema,
  IllusionSensoryChannelSchema,
  JumpMovementReplacementSchema,
  MentalMessageDeliveryEffectSchema,
  MarkTransferCostSchema,
  MarkTransferEventSchema,
  MarkTransferSchema,
  ObjectFilterSchema,
  ObjectMaterialSchema,
  OngoingActionCostSchema,
  OngoingEffectMechanicsSchema,
  OngoingEffectSchema,
  OngoingOperationSchema,
  OngoingPredicateSchema,
  OngoingTriggerSchema,
  PassiveHitInterceptMechanicsSchema,
  ModalActivationMechanicsSchema,
  ModifyAcSetBaseEffectSchema,
  ModifyAcSetFloorEffectSchema,
  PhaseContinuationSchema,
  ShapeShiftActionRestrictionSchema,
  ShapeShiftFormSourceSchema,
  ShapeShiftRetainedFieldSchema,
  ShapeShiftRevertTriggerSchema,
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
  SpellSlotLevelSchema,
  SomaticSpellFailureChanceEffectSchema,
  SpellMechanicsHeaderSchema,
  SpellMechanicsSchema,
  SpellRecordSchema,
  SpellSchoolSchema,
  StatBlockValueSchema,
  TemplatedCapacitySchema,
  TemplatedMultiSpawnMechanicsSchema,
  TemplatedSizeTierSchema,
  TargetCountSlotScalingSchema,
  TargetCountThresholdTierSchema,
  TargetCountThresholdTiersSchema,
  TargetCastingRequirementSchema,
  TargetDispositionSchema,
  TargetRelativePositionSchema,
  TargetSelectionSchema,
  TargetStateFilterSchema,
  TargetTypeFilterSchema,
  TimedPermanentAfterSchema,
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
  ClassLevelChoiceCountSchema,
  ConditionSchema,
  CreatureTypeSchema,
  DamageTypeSchema,
  DiceAmountSchema,
  DiceDeltaSchema,
  DiceExprDeltaSchema,
  DiceExprSchema,
  HalfClassLevelRoundedDownHoursDurationValueSchema,
  TimeSpanDurationValueSchema,
  DurationUpcastTierSchema,
  DurationValueSchema,
  ClassRecordKindSchema,
  SubclassRecordKindSchema,
  ClassNameSchema,
  ContainerStorageProfileSchema,
  ExileDestinationSchema,
  FeatCategorySchema,
  GrantedSpellDurationOverrideSchema,
  GrantedSpellTargetRestrictionSchema,
  LevelAxisSchema,
  LinkedDamageSchema,
  LinkedSpeedSchema,
  MagicalitySchema,
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
  ToolProficiencyGrantSchema,
  ToolProficiencyGrantSubjectSchema,
  ToolProficiencyCategorySchema,
  UsageLimitSchema,
  WeaponCategorySchema,
  WeaponDamageSchema,
  WeaponFilterSchema,
  WeaponMasteryNameSchema,
  WeaponPropertyDetailSchema,
  WeaponPropertySchema,
  WeaponProficiencySchema,
  WeaponProficiencyCategorySchema,
  WeaponRangeSchema,
  WeaponUsageSchema,
} from "./schema-base.ts";
export {
  ActivationResourceSchema,
  ActivatedAbilityMechanicsSchema,
  allCantripsFromAnyClassSpellList,
  allCantripsFromClassSpellList,
  allLeveledSpellsFromAnyClassSpellList,
  allPreparedSpellsFromClassSpellList,
  CLASS_SPELL_LISTS,
  classSpellListPreparedSpellLevel,
  AlternateActionCostMechanicsSchema,
  AttackRollMissReplacementEffectSchema,
  AttackRollMissReplacementTriggerSchema,
  AttackRollMissToHitReplacementMechanicsSchema,
  ArmorRecordSchema,
  ArmorTemplateRecordSchema,
  ArmorTrainingSchema,
  BackgroundAbilityScoreIncreaseSchema,
  BackgroundRecordSchema,
  BackgroundToolProficiencySchema,
  ChargePoolResourceSchema,
  ClassFeatureActivationCostSchema,
  ClassFeatureDurationSchema,
  ClassFeatureGrantSchema,
  ClassFeatureActivationMechanicsSchema,
  ClassFeatureComponentMechanicsSchema,
  ClassGeneralFeatureMechanicsSchema,
  ClassFeatureMechanicsSchema,
  ClassFeatureRecordSchema,
  ClassRecordSchema,
  ClericClassFeatureMechanicsSchema,
  ClericClassFeatureRecordSchema,
  ClassSpellcastingProjectionMechanicsSchema,
  ClassSpellcastingCreationSchema,
  DruidClassFeatureMechanicsSchema,
  DruidClassFeatureRecordSchema,
  DruidWildCompanionSpellCastMechanicsSchema,
  FeatureChoiceMechanicsSchema,
  SubclassRecordSchema,
  FighterClassFeatureMechanicsSchema,
  FighterClassFeatureRecordSchema,
  ListPreparedSpellcastingClassRecordSchema,
  ListPreparedSpellcastingCreationSchema,
  ListPreparedSpellcastingProgressionCreationSchema,
  NonWizardClassRecordSchema,
  NonSpellcastingClassRecordSchema,
  OtherClassFeatureRecordSchema,
  CompositeClassFeatureMechanicsSchema,
  ClassFeatureAcquisitionChoiceMechanicsSchema,
  ClassFeatureEffectSaveDcSchema,
  ClassFeatureResourceContainerMechanicsSchema,
  ClassFeatureResourcePoolMechanicsSchema,
  PrimaryAbilityExpressionSchema,
  RestSpellSlotRecoveryMechanicsSchema,
  CompositeMagicItemMechanicsSchema,
  EquipmentPredicateSchema,
  FeatMechanicsSchema,
  FeatRecordSchema,
  GrantWeaponAttackRiderSchema,
  AttackDamageRiderMechanicsSchema,
  AttackDamageRiderTriggerSchema,
  MagicItemAttunementRestrictionSchema,
  MagicItemAttunementSchema,
  MagicItemComponentMechanicsSchema,
  MagicItemMechanicsSchema,
  MagicItemRecordSchema,
  MagicEquipmentTraitSchema,
  MagicActionAreaSaveDamageHealingMechanicsSchema,
  MagicActionHealingPoolMechanicsSchema,
  HuntersPreyMechanicsSchema,
  MagicEquipmentVariantSchema,
  MagicItemVariantSchema,
  MasteryEffectSchema,
  MasteryMechanicsSchema,
  MasteryRecordSchema,
  MasteryTriggerSchema,
  CleaveMasteryMechanicsSchema,
  MonkClassFeatureMechanicsSchema,
  MonkClassFeatureRecordSchema,
  MonkInitiativeFocusRecoveryMechanicsSchema,
  ModifyRollAdvantageRiderSchema,
  OpenHandTechniqueMechanicsSchema,
  MasteryOrWeaponDamageDiceRerollMechanicsSchema,
  OnHitTriggerMechanicsSchema,
  OnHitRiderEffectSchema,
  PassiveMechanicsSchema,
  PassiveOperationSchema,
  PassiveSuppressorSchema,
  PaladinClassFeatureMechanicsSchema,
  PaladinClassFeatureRecordSchema,
  PointPoolResourceSchema,
  PointPoolToSpellSlotOperationSchema,
  PotentCantripMechanicsSchema,
  RangerClassFeatureMechanicsSchema,
  RangerClassFeatureRecordSchema,
  RemarkableAthleteMechanicsSchema,
  SpellbookRitualAccessMechanicsSchema,
  RelativeDayResetTriggerSchema,
  ResourcePoolOperationSchema,
  ResetCadenceSchema,
  RestResetCadenceSchema,
  RerollWeaponDamageDiceRiderSchema,
  RiderExpirySchema,
  RogueClassFeatureMechanicsSchema,
  RogueClassFeatureRecordSchema,
  SapMasteryEffectSchema,
  SapMasteryMechanicsSchema,
  SacredWeaponMechanicsSchema,
  SaveGateRiderResultSchema,
  SaveGateRiderSchema,
  SecondaryTargetSelectionSchema,
  SpellSlotToPointPoolOperationSchema,
  SorcererClassFeatureMechanicsSchema,
  SorcererClassFeatureRecordSchema,
  SORCERER_METAMAGIC_EFFECT_KINDS,
  SORCERER_METAMAGIC_OPTION_IDS,
  SORCERER_METAMAGIC_OPTIONS_CHOICE_KEY,
  SorcererMetamagicMechanicsSchema,
  ToppleMasteryEffectSchema,
  ToppleMasteryMechanicsSchema,
  VexMasteryEffectSchema,
  VexMasteryMechanicsSchema,
  WeaponAttackDamageDieFloorEffectSchema,
  WeaponAttackDamageDieFloorMechanicsSchema,
  WeaponAttackDamageDieFloorTriggerSchema,
  WeaponHitMasteryEffectSchema,
  WeaponDamageDiceRerollMechanicsSchema,
  WeaponDamageDiceRerollTriggerSchema,
  CreatureSpaceMovementPermissionMechanicsSchema,
  D20TestNaturalOneRerollMechanicsSchema,
  DragonbornSpeciesRecordSchema,
  DragonbornSpeciesTraitsSchema,
  DwarfSpeciesRecordSchema,
  DwarfSpeciesTraitsSchema,
  ElfSpeciesRecordSchema,
  ElfSpeciesTraitsSchema,
  GnomeSpeciesRecordSchema,
  GnomeSpeciesTraitsSchema,
  GnomishLineageMechanicsSchema,
  HalflingSpeciesRecordSchema,
  HalflingSpeciesTraitsSchema,
  HideActionObscurementPermissionMechanicsSchema,
  HumanSpeciesRecordSchema,
  HumanSpeciesTraitsSchema,
  GoliathSpeciesRecordSchema,
  GoliathSpeciesTraitsSchema,
  OrcSpeciesRecordSchema,
  OrcSpeciesTraitsSchema,
  RestTriggeredHeroicInspirationMechanicsSchema,
  SpeciesRecordSchema,
  SpeciesTraitMechanicsSchema,
  SpeciesTraitRecordSchema,
  TieflingSpeciesRecordSchema,
  TieflingSpeciesTraitsSchema,
  ShieldRecordSchema,
  ShieldTemplateRecordSchema,
  StartingEquipmentChoiceSchema,
  StartingEquipmentItemRefSchema,
  TimeResetCadenceSchema,
  EnemyZeroHitPointTemporaryHitPointsMechanicsSchema,
  FailedAbilityCheckResourceBoostMechanicsSchema,
  SpellSlotHealingModifierMechanicsSchema,
  SteadyAimMechanicsSchema,
  TriggeredReplacementMechanicsSchema,
  HitPointTriggeredReplacementMechanicsSchema,
  TriggeredReactionAbilityMechanicsSchema,
  ReactionRollOrDamageReductionMechanicsSchema,
  UseCountCapSchema,
  UseCountResourceSchema,
  PactMagicClassRecordSchema,
  PactMagicSpellcastingCreationSchema,
  SpellcastingClassRecordSchema,
  WizardSpellcastingCreationSchema,
  WizardClassFeatureMechanicsSchema,
  WizardClassFeatureRecordSchema,
  WarlockClassFeatureMechanicsSchema,
  WarlockClassFeatureRecordSchema,
  WarlockPactSlotRecoveryMechanicsSchema,
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
  SubclassRecordSchema,
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

export const SRD_CHALLENGE_RATINGS = [
  0, 0.125, 0.25, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
  17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
] as const;

export const ChallengeRatingSchema = Schema.Literal(...SRD_CHALLENGE_RATINGS);

export const StatBlockRecordSchema = Schema.Struct({
  id: Schema.NonEmptyTrimmedString,
  kind: Schema.Literal("statBlock"),
  name: Schema.NonEmptyTrimmedString,
  provenance: ProvenanceSchema,
  challengeRating: ChallengeRatingSchema,
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

export function decodeSubclassRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof SubclassRecordSchema> {
  return Schema.decodeUnknownSync(SubclassRecordSchema)(raw);
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
