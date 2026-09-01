import { JsonSchema, Result, Schema, SchemaIssue, Struct, Tuple } from "effect";
import { StatBlockId } from "@dnd/shared/game-facts";
import * as SchemaAST from "effect/SchemaAST";
import {
  SRD_CHALLENGE_RATINGS,
  type StatBlockRecord,
  type StatBlockRecordEncoded,
} from "./stat-block-types.ts";
import { SRD_PROVENANCE_KIND, type SrdProvenance } from "./srd-provenance.ts";
import {
  SRD_SURFACE_KIND,
  type PublishedSrdSurface,
  type PublishedSrdSurfaceEncoded,
  type PublishedSrdUnitRecord,
  type PublishedSrdUnitRecordEncoded,
  type SrdSurface,
  type SrdSurfaceEncoded,
  type SrdUnitRecord,
  type SrdUnitRecordEncoded,
} from "./srd-surface-types.ts";

export type { PublishedSrdSurface, SrdSurface } from "./srd-surface-types.ts";
export type { SrdProvenance } from "./srd-provenance.ts";

export {
  ActionBonusActionChoiceEffectSchema,
  ActionRestrictionSchema,
  ActionRestrictionAllowedActionSchema,
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
  AbilityFilterSchema,
  AttackActionAttackCapEffectSchema,
  CastTimeEffectModeChoiceSchema,
  CastTimeChoiceCreatureTypeSchema,
  CastTimeChoiceDamageTypeSchema,
  CastTimeChoiceSizeSchema,
  CastingTimeSchema,
  CommandTargetNextTurnOptionsSchema,
  ComponentsSchema,
  CreatureActionsSchema,
  CREATURE_RECHARGE_MINIMUM_ROLLS,
  CreatureLegendaryActionsSchema,
  CreatureLimitedUseSchema,
  CreatureRechargeMinimumRollSchema,
  CreatureNamedActionOptionSchema,
  CreatureControlSchema,
  CreatureDismissalSchema,
  CreatureImmunityListSchema,
  CreatureSavingThrowModifierSchema,
  CreatureSavingThrowModifiersSchema,
  CreatureSkillModifierSchema,
  CreatureModeSchema,
  CreatureNamedAttackRollSchema,
  CreatureAttackRollMechanicsSchema,
  CreatureNamedMultiattackSchema,
  CreatureNamedSaveGateSchema,
  CreatureNamedSupportSchema,
  CreatureResistanceListSchema,
  CreatureSenseSchema,
  CreatureSpeedSchema,
  CreatureStatBlockProjectionSchema,
  CreatureStatBlockOverridesSchema,
  CreatureStatBlockSchema,
  AuthoredStatBlockReactionTriggerSchema,
  AuthoredExecutableProcedureSchema,
  StatBlockActionSectionSchema,
  StatBlockBonusActionSectionSchema,
  StatBlockLegendaryActionSectionSchema,
  StatBlockProcedureAreaShapeSchema,
  StatBlockProcedureDcSourceSchema,
  StatBlockProcedureEntrySchema,
  StatBlockProcedureOrdinalSchema,
  StatBlockProcedureResourceLimitSchema,
  StatBlockProcedureResourceOrdinalSchema,
  StatBlockProcedureResourceRefsSchema,
  StatBlockProcedureResourceSchema,
  StatBlockProcedureResourcesSchema,
  StatBlockProcedureSectionSchema,
  StatBlockReactionSectionSchema,
  STAT_BLOCK_SPELL_INVOCATION_DELTA_KINDS,
  StatBlockSpellInvocationDeltaSchema,
  StatBlockSpellInvocationDeltasSchema,
  StatBlockSpellInvocationRestrictionSchema,
  StatBlockSpellReferenceSchema,
  StatBlockSpellcastingComponentsSchema,
  StatBlockSpellcastingGroupSchema,
  StatBlockTextOnlyReasonSchema,
  StandaloneCreatureSenseSchema,
  StandaloneCreatureSpeedSchema,
  StandaloneStatBlockAbilityScoreSchema,
  StandaloneStatBlockAbilityScoresSchema,
  StandaloneStatBlockCreatureTypeTagsSchema,
  StandaloneStatBlockSpeedEntrySchema,
  StandaloneStatBlockSchema,
  StandaloneStatBlockSizeAndSwarmSchema,
  StandaloneStatBlockSizeSchema,
  StandaloneStatBlockValueSchema,
  StatBlockGmSpeedChoiceSchema,
  StatBlockAlignmentSchema,
  StatBlockArmorClassSchema,
  StatBlockArmorClassAnnotationSchema,
  StatBlockCommunicationSchema,
  StatBlockGearEntrySchema,
  StatBlockGearItemSchema,
  StatBlockInitiativeModifierSchema,
  StatBlockInitiativeSchema,
  StatBlockLanguageNameSchema,
  StatBlockPassivePerceptionSchema,
  StatBlockProcedureDescriptionSchema,
  StatBlockProcedureNameSchema,
  StatBlockLiteralValueSchema,
  StatBlockLanguageSetSchema,
  StatBlockTelepathySchema,
  CreatureTraitEffectSchema,
  CreatureTraitDescriptionSchema,
  CreatureTraitNameSchema,
  CreatureTraitSchema,
  CreatureVulnerabilityListSchema,
  CreatedObjectDurabilitySchema,
  DcSourceSchema,
  DamageTypeRefSchema,
  DivinationOmenEffectSchema,
  DurationEndTriggerSchema,
  DurationSchema,
  EffectAtomSchema,
  EffectEndTargetStateSchema,
  EtherealPhaseEffectSchema,
  ExtradimensionalSpaceEffectSchema,
  FeatherFallMitigationSchema,
  ForceMoveAnyDirectionEffectSchema,
  ForceMoveEffectSchema,
  ForceMovePullSlideEffectSchema,
  ForceMovePushEffectSchema,
  ForcedReactionMovementSchema,
  MagicCircleAffectedCreatureTypeChoiceSchema,
  MagicCircleAffectedCreatureTypeSchema,
  MagicCircleMagicalCrossingGateSchema,
  MagicCircleNormalWardDirectionSchema,
  MagicCircleProtectedTargetEffectsSchema,
  MagicCircleReversedWardDirectionSchema,
  MagicCircleWardDirectionChoiceSchema,
  MagicCircleWardMechanicsSchema,
  MagicCircleWardedCylinderOccurrenceSchema,
  StoneMergeAnchorChoiceSchema,
  StoneMergeCompleteExpulsionDamageSchema,
  StoneMergeExpulsionSchema,
  StoneMergeMechanicsSchema,
  StoneMergeOccupancySchema,
  StoneMergePartialExpulsionDamageSchema,
  StoneMergeStoneEventResponsesSchema,
  StoneMergeTargetSchema,
  GlyphWardingExplosiveRuneBranchSchema,
  GlyphWardingExplosiveRuneDamageAmountSchema,
  GlyphWardingExplosiveRuneDamageTypeRefSchema,
  GlyphWardingInscriptionAnchorChoiceSchema,
  GlyphWardingMechanicsSchema,
  GlyphWardingOccurrenceSchema,
  GlyphWardingReleaseChoiceSchema,
  GlyphWardingSpellGlyphBranchSchema,
  GlyphWardingStoredSpellEligibilitySchema,
  GlyphWardingTriggerSchema,
  IllusionSensoryChannelSchema,
  JumpMovementReplacementSchema,
  LiquidSurfaceTraversalSchema,
  MentalMessageDeliveryEffectSchema,
  MarkTransferCostSchema,
  MarkTransferEventSchema,
  MarkTransferSchema,
  ObjectFilterSchema,
  ObjectMaterialSchema,
  OngoingActionCostSchema,
  AuthoredConditionalEffectSchema,
  OngoingEffectMechanicsSchema,
  ModalOngoingEffectMechanicsSchema,
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
  ShapeShiftStatBlockFormSourceSchema,
  ShapeShiftRetainedFieldSchema,
  ShapeShiftRevertTriggerSchema,
  TransformTargetEffectSchema,
  RangeSchema,
  OngoingRandomTableOutcomeSchema,
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
  TargetVisibilityRequirementSchema,
  TargetStateFilterSchema,
  TargetTypeFilterSchema,
  TimedPermanentAfterSchema,
  TriggeredReactionMechanicsSchema,
} from "./schema-spell.ts";
export {
  AbilitySchema,
  AmmunitionKindSchema,
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
  AlternateActionCostMechanicsSchema,
  AttackRollMissReplacementEffectSchema,
  AttackRollMissReplacementTriggerSchema,
  AttackRollMissToHitReplacementMechanicsSchema,
  ArmorRecordSchema,
  ArmorTemplateRecordSchema,
  ArmorTrainingSchema,
  BarbarianClassFeatureMechanicsSchema,
  BarbarianClassFeatureRecordSchema,
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
  CombatTurnStartHeroicInspirationMechanicsSchema,
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
  AbjureFoesMechanicsSchema,
  AcrobaticMovementMechanicsSchema,
  BrutalStrikeMechanicsSchema,
  CUNNING_STRIKE_OPTION_SELECTION_IDS,
  CunningStrikeMechanicsSchema,
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
  StunningStrikeMechanicsSchema,
  MasteryOrWeaponDamageDiceRerollMechanicsSchema,
  OnHitTriggerMechanicsSchema,
  OnHitRiderEffectSchema,
  PassiveMechanicsSchema,
  PreparedSpellListExpansionMechanicsSchema,
  SpellDamageRollAbilityModifierMechanicsSchema,
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
  IndomitableMechanicsSchema,
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
  SorcererSorcerousRestorationMechanicsSchema,
  SORCERER_METAMAGIC_EFFECT_KINDS,
  SORCERER_METAMAGIC_OPTION_IDS,
  SORCERER_METAMAGIC_OPTIONS_CHOICE_KEY,
  SorcererMetamagicMechanicsSchema,
  SupremeSneakMechanicsSchema,
  TacticalMasterMechanicsSchema,
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
  UNIT_RECORD_MEMBER_SCHEMAS,
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
import { ProvenanceSchema, surfaceSchemaRole } from "./schema-base.ts";
import {
  CreatureImmunityListSchema,
  CreatureStatBlockSchema,
  SpellRecordSchema,
  StandaloneStatBlockSchema,
} from "./schema-spell.ts";

export {
  SURFACE_IDENTITY_KINDS,
  SURFACE_PROTOCOL_KINDS,
  SURFACE_PROJECTION_KINDS,
  SURFACE_SCHEMA_ROLE_ANNOTATION,
  SURFACE_STAT_BLOCK_DEPENDENCY_RELATIONS,
  SURFACE_STAT_BLOCK_REFERENCE_RELATIONS,
  SURFACE_UNIT_DEPENDENCY_RELATIONS,
  SURFACE_UNIT_REFERENCE_RELATIONS,
  isSurfaceSchemaRole,
  readSurfaceSchemaRole,
  surfaceSchemaRole,
  surfaceSchemaRolesEqual,
} from "./schema-base.ts";
export type {
  SurfaceSchemaFieldRole,
  SurfaceIdentityKind,
  SurfaceProjectionKind,
  SurfaceProtocolKind,
  SurfaceStatBlockDependencyRelation,
  SurfaceStatBlockReferenceRelation,
  SurfaceUnitDependencyRelation,
  SurfaceUnitReferenceRelation,
} from "./schema-base.ts";

// EXPLANATION: package-owned handwritten Effect decode boundary for the full
// content surface. Consumers decode through these helpers and derive types from
// this schema entrypoint rather than casting authored JSON.

export { SRD_CHALLENGE_RATINGS } from "./stat-block-types.ts";

export const ChallengeRatingSchema = Schema.Literals(SRD_CHALLENGE_RATINGS);

const statBlockRecordSchema = Schema.Struct({
  id: surfaceSchemaRole(StatBlockId, {
    category: "identity",
    kind: "id",
  }),
  kind: Schema.Literal("statBlock"),
  name: surfaceSchemaRole(Schema.Trimmed.check(Schema.isNonEmpty()), {
    category: "identity",
    kind: "name",
  }),
  provenance: ProvenanceSchema,
  challengeRating: ChallengeRatingSchema,
  statBlock: StandaloneStatBlockSchema,
}).pipe(Schema.annotate({ identifier: "StatBlockRecord" }));

export const StatBlockRecordSchema: Schema.Codec<
  StatBlockRecord,
  StatBlockRecordEncoded,
  never,
  never
> = statBlockRecordSchema;

const srdProvenanceSchema = Schema.Struct({
  kind: Schema.Literal(SRD_PROVENANCE_KIND),
  section: ProvenanceSchema.fields.section,
}).pipe(
  Schema.annotate({ identifier: "SrdProvenance" }),
) satisfies Schema.Codec<SrdProvenance, SrdProvenance, never, never>;

export const SrdProvenanceSchema = srdProvenanceSchema;

export const RulesExcerptSchema = surfaceSchemaRole(
  Schema.Trimmed.check(Schema.isNonEmpty()),
  {
    category: "prose",
    evidence: "exact",
  },
).pipe(Schema.annotate({ identifier: "RulesExcerpt" }));

const SrdRecordFieldsSchema = Schema.Struct({
  provenance: SrdProvenanceSchema,
});

const PublishedSrdRecordFieldsSchema = Schema.Struct({
  provenance: SrdProvenanceSchema,
  rulesExcerpt: RulesExcerptSchema,
});

interface AssignFieldsPreservingChecks<NewFields extends Schema.Struct.Fields>
  extends Struct.Lambda {
  <Fields extends Schema.Struct.Fields>(
    struct: Schema.Struct<Fields>,
  ): Schema.Struct<Struct.Assign<Fields, NewFields>>;
  readonly "~lambda.out": this["~lambda.in"] extends Schema.Struct<Schema.Struct.Fields>
    ? Schema.Struct<Struct.Assign<this["~lambda.in"]["fields"], NewFields>>
    : "Error: schema not eligible for field assignment";
}

const assignFieldsPreservingChecks = <NewFields extends Schema.Struct.Fields>(
  fields: NewFields,
) =>
  Struct.lambda<AssignFieldsPreservingChecks<NewFields>>((struct) =>
    struct.mapFields(
      (existing) => {
        const { provenance: _provenance, ...withoutProvenance } = existing;
        return { ...withoutProvenance, ...fields };
      },
      { unsafePreserveChecks: true },
    ),
  );

const specializeUnitRecordSchema = <Fields extends Schema.Struct.Fields>(
  fields: Schema.Struct<Fields>,
  identifier: string,
) =>
  UnitRecordSchema.mapMembers(
    Tuple.map(assignFieldsPreservingChecks(fields.fields)),
    {
      unsafePreserveChecks: true,
    },
  ).pipe(Schema.annotate({ identifier }));

const specializeStatBlockRecordSchema = <Fields extends Schema.Struct.Fields>(
  fields: Schema.Struct<Fields>,
  identifier: string,
) => {
  const specialized = statBlockRecordSchema.mapFields(
    (existing) => {
      const { provenance: _provenance, ...withoutProvenance } = existing;
      return { ...withoutProvenance, ...fields.fields };
    },
    { unsafePreserveChecks: true },
  );
  return specialized.pipe(Schema.annotate({ identifier }));
};

type EncodedPublicationFactorState = {
  readonly nextId: { value: number };
  readonly members: WeakMap<SchemaAST.AST, SchemaAST.AST>;
  readonly structural: WeakMap<SchemaAST.AST, SchemaAST.AST>;
  readonly suspends: WeakMap<SchemaAST.AST, SchemaAST.AST>;
};

// This bound limits publication graph factoring work, not the accepted
// record language. Unfactored nodes remain in the same encoded graph.
const MAX_FACTORED_UNION_DEPTH = 16;

const factorEncodedPublicationAst = (
  ast: SchemaAST.AST,
  state: EncodedPublicationFactorState,
  depth = 0,
): SchemaAST.AST => {
  const factor = (child: SchemaAST.AST): SchemaAST.AST =>
    factorEncodedPublicationAst(child, state, depth + 1);

  const existing = state.structural.get(ast);
  if (existing !== undefined) return existing;

  if (SchemaAST.isUnion(ast)) {
    if (depth > MAX_FACTORED_UNION_DEPTH) return ast;

    const factored = new SchemaAST.Union(
      ast.types.map((member) => {
        const existingMember = state.members.get(member);
        if (existingMember !== undefined) return existingMember;

        const id = state.nextId.value;
        state.nextId.value += 1;
        let factoredMember: SchemaAST.AST = member;
        const suspended = new SchemaAST.Suspend(() => factoredMember, {
          identifier: `SrdRecordUnion${id}Encoded`,
        });
        state.members.set(member, suspended);
        factoredMember = factor(member);
        return suspended;
      }),
      ast.mode,
      ast.annotations,
      ast.checks,
      undefined,
      ast.context,
      ast.encodingChecks,
    );
    state.structural.set(ast, factored);
    return factored;
  }
  if (SchemaAST.isObjects(ast)) {
    const factored = new SchemaAST.Objects(
      ast.propertySignatures.map(
        (property) =>
          new SchemaAST.PropertySignature(property.name, factor(property.type)),
      ),
      ast.indexSignatures.map(
        (index) =>
          new SchemaAST.IndexSignature(
            factor(index.parameter),
            factor(index.type),
          ),
      ),
      ast.annotations,
      ast.checks,
      undefined,
      ast.context,
      ast.encodingChecks,
    );
    state.structural.set(ast, factored);
    return factored;
  }
  if (SchemaAST.isArrays(ast)) {
    const factored = new SchemaAST.Arrays(
      ast.isMutable,
      ast.elements.map(factor),
      ast.rest.map(factor),
      ast.annotations,
      ast.checks,
      undefined,
      ast.context,
      ast.encodingChecks,
    );
    state.structural.set(ast, factored);
    return factored;
  }
  if (SchemaAST.isDeclaration(ast)) {
    const factored = new SchemaAST.Declaration(
      ast.typeParameters.map(factor),
      ast.run,
      ast.annotations,
      ast.checks,
      undefined,
      ast.context,
      ast.encodingChecks,
      ast.encodingRun,
    );
    state.structural.set(ast, factored);
    return factored;
  }
  if (SchemaAST.isSuspend(ast)) {
    const existing = state.suspends.get(ast);
    if (existing !== undefined) return existing;

    let factoredBody: SchemaAST.AST = ast;
    const suspended = new SchemaAST.Suspend(
      () => factoredBody,
      ast.annotations,
      undefined,
      undefined,
      ast.context,
    );
    state.suspends.set(ast, suspended);
    factoredBody = factor(ast.thunk());
    return suspended;
  }

  return ast;
};

const srdUnitRecordSchema = specializeUnitRecordSchema(
  SrdRecordFieldsSchema,
  "SrdUnitRecord",
) satisfies Schema.Codec<SrdUnitRecord, SrdUnitRecordEncoded, never, never>;

export const SrdUnitRecordSchema: Schema.Codec<
  SrdUnitRecord,
  SrdUnitRecordEncoded,
  never,
  never
> = srdUnitRecordSchema;

export const SrdStatBlockRecordSchema = specializeStatBlockRecordSchema(
  SrdRecordFieldsSchema,
  "SrdStatBlockRecord",
);

const publishedSrdUnitRecordSchema = specializeUnitRecordSchema(
  PublishedSrdRecordFieldsSchema,
  "PublishedSrdUnitRecord",
) satisfies Schema.Codec<
  PublishedSrdUnitRecord,
  PublishedSrdUnitRecordEncoded,
  never,
  never
>;

export const PublishedSrdUnitRecordSchema: Schema.Codec<
  PublishedSrdUnitRecord,
  PublishedSrdUnitRecordEncoded,
  never,
  never
> = publishedSrdUnitRecordSchema;

export const PublishedSrdStatBlockRecordSchema =
  specializeStatBlockRecordSchema(
    PublishedSrdRecordFieldsSchema,
    "PublishedSrdStatBlockRecord",
  );

const nonEmptyPublicationArray = <S extends Schema.Constraint>(item: S) =>
  Schema.NonEmptyArray(item);

const SrdUnitPublicationSchema = Schema.suspend(() => SrdUnitRecordSchema).pipe(
  Schema.annotate({ identifier: "SrdUnitPublication" }),
);
const SrdStatBlockPublicationSchema = Schema.suspend(
  () => SrdStatBlockRecordSchema,
).pipe(Schema.annotate({ identifier: "SrdStatBlockPublication" }));
const PublishedSrdUnitPublicationSchema = Schema.suspend(
  () => PublishedSrdUnitRecordSchema,
).pipe(
  Schema.annotateEncoded({ identifier: "PublishedSrdUnitPublicationEncoded" }),
);
const PublishedSrdStatBlockPublicationSchema = Schema.suspend(
  () => PublishedSrdStatBlockRecordSchema,
).pipe(
  Schema.annotateEncoded({
    identifier: "PublishedSrdStatBlockPublicationEncoded",
  }),
);

const srdSurfaceSchema = Schema.Struct({
  kind: Schema.Literal(SRD_SURFACE_KIND),
  units: nonEmptyPublicationArray(
    Schema.suspend(() => SrdUnitPublicationSchema),
  ),
  statBlocks: nonEmptyPublicationArray(
    Schema.suspend(() => SrdStatBlockPublicationSchema),
  ),
}) satisfies Schema.Codec<SrdSurface, SrdSurfaceEncoded, never, never>;

export const SrdSurfaceSchema: Schema.Codec<
  SrdSurface,
  SrdSurfaceEncoded,
  never,
  never
> = srdSurfaceSchema;

const publishedSrdSurfaceSchema = Schema.Struct({
  kind: Schema.Literal(SRD_SURFACE_KIND),
  units: nonEmptyPublicationArray(
    Schema.suspend(() => PublishedSrdUnitPublicationSchema),
  ),
  statBlocks: nonEmptyPublicationArray(
    Schema.suspend(() => PublishedSrdStatBlockPublicationSchema),
  ),
}) satisfies Schema.Codec<
  PublishedSrdSurface,
  PublishedSrdSurfaceEncoded,
  never,
  never
>;

export const PublishedSrdSurfaceSchema: Schema.Codec<
  PublishedSrdSurface,
  PublishedSrdSurfaceEncoded,
  never,
  never
> = publishedSrdSurfaceSchema;

const encodedPublication = Schema.toEncoded(PublishedSrdSurfaceSchema);
const factoredEncodedPublicationAst = factorEncodedPublicationAst(
  encodedPublication.ast,
  {
    nextId: { value: 0 },
    members: new WeakMap(),
    structural: new WeakMap(),
    suspends: new WeakMap(),
  },
);
const encodedPublicationDocument = Schema.toJsonSchemaDocument(
  Schema.make<typeof encodedPublication>(factoredEncodedPublicationAst),
);

export const SrdSurfaceJsonSchema = {
  $schema: JsonSchema.META_SCHEMA_URI_DRAFT_2020_12,
  $defs: encodedPublicationDocument.definitions,
  ...encodedPublicationDocument.schema,
};

const STRICT_DECODE_OPTIONS = { onExcessProperty: "error" } as const;

export function decodeUnitRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof UnitRecordSchema> {
  return Schema.decodeUnknownSync(UnitRecordSchema, STRICT_DECODE_OPTIONS)(raw);
}

export function decodeStatBlockRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof StatBlockRecordSchema> {
  return Schema.decodeUnknownSync(
    StatBlockRecordSchema,
    STRICT_DECODE_OPTIONS,
  )(raw);
}

export function decodeCreatureStatBlockSync(
  raw: unknown,
): Schema.Schema.Type<typeof CreatureStatBlockSchema> {
  return Schema.decodeUnknownSync(
    CreatureStatBlockSchema,
    STRICT_DECODE_OPTIONS,
  )(raw);
}

export function decodeCreatureImmunityDeclarationSync(
  raw: unknown,
): Schema.Schema.Type<typeof CreatureImmunityListSchema> {
  return Schema.decodeUnknownSync(
    CreatureImmunityListSchema,
    STRICT_DECODE_OPTIONS,
  )(raw);
}

export function decodeStatBlockRecordResult(
  raw: unknown,
): Result.Result<
  Schema.Schema.Type<typeof StatBlockRecordSchema>,
  Schema.SchemaError
> {
  return Schema.decodeUnknownResult(
    StatBlockRecordSchema,
    STRICT_DECODE_OPTIONS,
  )(raw);
}

export function decodeSpellRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof SpellRecordSchema> {
  return Schema.decodeUnknownSync(
    SpellRecordSchema,
    STRICT_DECODE_OPTIONS,
  )(raw);
}

export function decodeClassFeatureRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof ClassFeatureRecordSchema> {
  return Schema.decodeUnknownSync(
    ClassFeatureRecordSchema,
    STRICT_DECODE_OPTIONS,
  )(raw);
}

export function decodeClassRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof ClassRecordSchema> {
  return Schema.decodeUnknownSync(
    ClassRecordSchema,
    STRICT_DECODE_OPTIONS,
  )(raw);
}

export function decodeSubclassRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof SubclassRecordSchema> {
  return Schema.decodeUnknownSync(
    SubclassRecordSchema,
    STRICT_DECODE_OPTIONS,
  )(raw);
}

export function decodeBackgroundRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof BackgroundRecordSchema> {
  return Schema.decodeUnknownSync(
    BackgroundRecordSchema,
    STRICT_DECODE_OPTIONS,
  )(raw);
}

export function decodeSpeciesRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof SpeciesRecordSchema> {
  return Schema.decodeUnknownSync(
    SpeciesRecordSchema,
    STRICT_DECODE_OPTIONS,
  )(raw);
}

export function decodeMasteryRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof MasteryRecordSchema> {
  return Schema.decodeUnknownSync(
    MasteryRecordSchema,
    STRICT_DECODE_OPTIONS,
  )(raw);
}

export function decodeFeatRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof FeatRecordSchema> {
  return Schema.decodeUnknownSync(FeatRecordSchema, STRICT_DECODE_OPTIONS)(raw);
}

export function decodeSpeciesTraitRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof SpeciesTraitRecordSchema> {
  return Schema.decodeUnknownSync(
    SpeciesTraitRecordSchema,
    STRICT_DECODE_OPTIONS,
  )(raw);
}

export function decodeMagicItemRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof MagicItemRecordSchema> {
  return Schema.decodeUnknownSync(
    MagicItemRecordSchema,
    STRICT_DECODE_OPTIONS,
  )(raw);
}

export function decodeArmorRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof ArmorRecordSchema> {
  return Schema.decodeUnknownSync(
    ArmorRecordSchema,
    STRICT_DECODE_OPTIONS,
  )(raw);
}

export function decodeArmorTemplateRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof ArmorTemplateRecordSchema> {
  return Schema.decodeUnknownSync(
    ArmorTemplateRecordSchema,
    STRICT_DECODE_OPTIONS,
  )(raw);
}

export function decodeShieldRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof ShieldRecordSchema> {
  return Schema.decodeUnknownSync(
    ShieldRecordSchema,
    STRICT_DECODE_OPTIONS,
  )(raw);
}

export function decodeShieldTemplateRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof ShieldTemplateRecordSchema> {
  return Schema.decodeUnknownSync(
    ShieldTemplateRecordSchema,
    STRICT_DECODE_OPTIONS,
  )(raw);
}

export function decodeWeaponRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof WeaponRecordSchema> {
  return Schema.decodeUnknownSync(
    WeaponRecordSchema,
    STRICT_DECODE_OPTIONS,
  )(raw);
}

export function decodeWeaponTemplateRecordSync(
  raw: unknown,
): Schema.Schema.Type<typeof WeaponTemplateRecordSchema> {
  return Schema.decodeUnknownSync(
    WeaponTemplateRecordSchema,
    STRICT_DECODE_OPTIONS,
  )(raw);
}

export function decodeUnitRecordResult(
  raw: unknown,
): Result.Result<
  Schema.Schema.Type<typeof UnitRecordSchema>,
  Schema.SchemaError
> {
  return Schema.decodeUnknownResult(
    UnitRecordSchema,
    STRICT_DECODE_OPTIONS,
  )(raw);
}

export function decodeSrdSurfaceSync(raw: unknown): SrdSurface {
  return Schema.decodeUnknownSync(SrdSurfaceSchema, STRICT_DECODE_OPTIONS)(raw);
}

export function decodeSrdSurfaceResult(
  raw: unknown,
): Result.Result<SrdSurface, Schema.SchemaError> {
  return Schema.decodeUnknownResult(
    SrdSurfaceSchema,
    STRICT_DECODE_OPTIONS,
  )(raw);
}

export function formatSurfaceDecodeError(error: Schema.SchemaError): string {
  return SchemaIssue.makeFormatterDefault()(error.issue);
}
