import { Either, JSONSchema, ParseResult, Schema } from "effect";
import { StatBlockId } from "@dnd/shared/game-facts";
import * as SchemaAST from "effect/SchemaAST";

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
  CreatureLegendaryActionsSchema,
  CreatureLimitedUseSchema,
  CreatureRechargeMinimumRollSchema,
  CreatureNamedActionOptionSchema,
  CreatureControlSchema,
  CreatureDismissalSchema,
  CreatureImmunityListSchema,
  CreatureSavingThrowModifierSchema,
  CreatureModeSchema,
  CreatureNamedAttackRollSchema,
  CreatureAttackRollMechanicsSchema,
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
import { CreatureStatBlockSchema, SpellRecordSchema } from "./schema-spell.ts";

export {
  SURFACE_IDENTITY_KINDS,
  SURFACE_PROTOCOL_KINDS,
  SURFACE_PROJECTION_KINDS,
  SURFACE_SCHEMA_ROLE_ANNOTATION,
  SURFACE_STAT_BLOCK_REFERENCE_RELATIONS,
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
  SurfaceStatBlockReferenceRelation,
  SurfaceUnitReferenceRelation,
} from "./schema-base.ts";

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
  id: surfaceSchemaRole(StatBlockId, {
    category: "identity",
    kind: "id",
  }),
  kind: Schema.Literal("statBlock"),
  name: surfaceSchemaRole(Schema.NonEmptyTrimmedString, {
    category: "identity",
    kind: "name",
  }),
  provenance: ProvenanceSchema,
  challengeRating: ChallengeRatingSchema,
  statBlock: MonsterStatBlockSchema,
}).annotations({ identifier: "StatBlockRecord" });

export const SrdProvenanceSchema = Schema.Struct({
  kind: Schema.Literal("srd-5.2.1"),
  section: ProvenanceSchema.fields.section,
}).annotations({ identifier: "SrdProvenance" });

export type SrdProvenance = Schema.Schema.Type<typeof SrdProvenanceSchema>;

// AST-derived schemas have an erased runtime type here; this local type keeps
// the graph construction context-free while the exported schemas restore the
// precise Unit and Stat Block types below.
type RecordSchema = Schema.Schema.AnyNoContext;

const recordVariants = (schema: RecordSchema): ReadonlyArray<RecordSchema> => {
  if (schema.ast._tag !== "Union") return [schema];

  return schema.ast.types.flatMap((ast) => {
    // Schema.make faithfully rehydrates each existing union member AST; the
    // cast only supplies the context-free local graph type.
    return recordVariants(Schema.make(ast) as RecordSchema);
  });
};

// Schema.omit's curried key constraint cannot see the fields of an AST-derived
// union. The runtime AST still contains the established provenance field, so
// this cast only widens the local graph-construction helper.
const omitProvenance = Schema.omit as unknown as (
  key: "provenance",
) => (schema: RecordSchema) => RecordSchema;

type AstFactorState = {
  readonly nextId: { value: number };
  readonly members: WeakMap<SchemaAST.AST, SchemaAST.AST>;
  readonly suspends: WeakMap<SchemaAST.AST, SchemaAST.AST>;
};

// This bound limits graph factoring work, not the accepted record language.
// Unfactored nodes remain in the same canonical Effect graph and preserve
// their original parse/encode semantics.
const MAX_FACTORED_UNION_DEPTH = 16;

const factorUnionAst = (
  ast: SchemaAST.AST,
  state: AstFactorState,
  depth = 0,
): SchemaAST.AST => {
  const factor = (child: SchemaAST.AST): SchemaAST.AST =>
    factorUnionAst(child, state, depth + 1);

  if (ast._tag === "Union") {
    if (depth > MAX_FACTORED_UNION_DEPTH) return ast;

    return SchemaAST.Union.make(
      ast.types.map((member) => {
        const existing = state.members.get(member);
        if (existing !== undefined) return existing;

        const id = state.nextId.value;
        state.nextId.value += 1;
        let factoredMember: SchemaAST.AST = member;
        const suspended = new SchemaAST.Suspend(() => factoredMember, {
          [SchemaAST.IdentifierAnnotationId]: `SrdRecordUnion${id}`,
        });
        state.members.set(member, suspended);
        factoredMember = factor(member);
        return suspended;
      }),
      ast.annotations,
    );
  }
  if (ast._tag === "TypeLiteral") {
    return new SchemaAST.TypeLiteral(
      ast.propertySignatures.map(
        (property) =>
          new SchemaAST.PropertySignature(
            property.name,
            factor(property.type),
            property.isOptional,
            property.isReadonly,
            property.annotations,
          ),
      ),
      ast.indexSignatures.map(
        (index) =>
          new SchemaAST.IndexSignature(
            factor(index.parameter),
            factor(index.type),
            index.isReadonly,
          ),
      ),
      ast.annotations,
    );
  }
  if (ast._tag === "TupleType") {
    return new SchemaAST.TupleType(
      ast.elements.map(
        (element) =>
          new SchemaAST.OptionalType(
            factor(element.type),
            element.isOptional,
            element.annotations,
          ),
      ),
      ast.rest.map(
        (element) =>
          new SchemaAST.Type(factor(element.type), element.annotations),
      ),
      ast.isReadonly,
      ast.annotations,
    );
  }
  if (ast._tag === "Refinement") {
    return new SchemaAST.Refinement(
      factor(ast.from),
      ast.filter,
      ast.annotations,
    );
  }
  if (ast._tag === "Transformation") {
    return new SchemaAST.Transformation(
      factor(ast.from),
      factor(ast.to),
      ast.transformation,
      ast.annotations,
    );
  }
  if (ast._tag === "Declaration") {
    return new SchemaAST.Declaration(
      ast.typeParameters.map(factor),
      ast.decodeUnknown,
      ast.encodeUnknown,
      ast.annotations,
    );
  }
  if (ast._tag === "Suspend") {
    const existing = state.suspends.get(ast);
    if (existing !== undefined) return existing;

    let factoredBody: SchemaAST.AST = ast;
    const suspended = new SchemaAST.Suspend(
      () => factoredBody,
      ast.annotations,
    );
    state.suspends.set(ast, suspended);
    factoredBody = factor(ast.f());
    return suspended;
  }

  return ast;
};

const SRD_FACTOR_STATE: AstFactorState = {
  nextId: { value: 0 },
  members: new WeakMap(),
  suspends: new WeakMap(),
};

const specializeSrdRecordSchema = (
  schema: RecordSchema,
  identifier: string,
): RecordSchema => {
  const provenance = Schema.Struct({ provenance: SrdProvenanceSchema });
  const variants = recordVariants(schema).map((variant, index) => {
    // Schema.extend keeps the variant's existing fields; RecordSchema is only
    // the erased, context-free type used while rebuilding its AST.
    const specialized = Schema.extend(provenance)(
      omitProvenance("provenance")(variant),
    ) as RecordSchema;
    // The rewrite preserves decoding and only adds named graph boundaries for
    // the generated JSON Schema references.
    const factored = Schema.make(
      factorUnionAst(specialized.ast, SRD_FACTOR_STATE),
    ) as RecordSchema;

    // Effect's JSON Schema encoder emits a $defs/$ref pair for suspend nodes.
    // Naming each record variant here keeps the published graph finite without
    // maintaining a second JSON Schema representation beside this graph.
    return Schema.suspend(() => factored).annotations({
      identifier: `${identifier}Variant${index}`,
    });
  });

  return Schema.Union(
    ...(variants as unknown as [RecordSchema, ...Array<RecordSchema>]),
  ).annotations({ identifier }) as RecordSchema;
};

// The specialization helper intentionally works over erased AST members; the
// public boundary restores the source record type plus the fixed SRD fact.
export const SrdUnitRecordSchema = specializeSrdRecordSchema(
  UnitRecordSchema,
  "SrdUnitRecord",
) as unknown as Schema.Schema<
  Schema.Schema.Type<typeof UnitRecordSchema> & {
    readonly provenance: SrdProvenance;
  },
  Schema.Schema.Encoded<typeof UnitRecordSchema>,
  never
>;

export const SrdStatBlockRecordSchema = specializeSrdRecordSchema(
  StatBlockRecordSchema,
  "SrdStatBlockRecord",
) as unknown as Schema.Schema<
  Schema.Schema.Type<typeof StatBlockRecordSchema> & {
    readonly provenance: SrdProvenance;
  },
  Schema.Schema.Encoded<typeof StatBlockRecordSchema>,
  never
>;

const nonEmptyPublicationArray = <S extends Schema.Schema.AnyNoContext>(
  item: S,
) => Schema.Tuple([item], item);

const SrdUnitPublicationSchema = Schema.suspend(
  () => SrdUnitRecordSchema,
).annotations({ identifier: "SrdUnitPublication" });
const SrdStatBlockPublicationSchema = Schema.suspend(
  () => SrdStatBlockRecordSchema,
).annotations({ identifier: "SrdStatBlockPublication" });

export const SrdSurfaceSchema = Schema.Struct({
  kind: Schema.Literal("srd-5.2.1-surface-catalog"),
  units: nonEmptyPublicationArray(
    Schema.suspend(() => SrdUnitPublicationSchema),
  ),
  statBlocks: nonEmptyPublicationArray(
    Schema.suspend(() => SrdStatBlockPublicationSchema),
  ),
});

export const SrdSurfaceJsonSchema = JSONSchema.make(
  Schema.encodedSchema(SrdSurfaceSchema),
  { target: "jsonSchema2020-12" },
);

export type SrdSurface = Schema.Schema.Type<typeof SrdSurfaceSchema>;

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

export function decodeMonsterStatBlockSync(
  raw: unknown,
): Schema.Schema.Type<typeof MonsterStatBlockSchema> {
  return Schema.decodeUnknownSync(
    MonsterStatBlockSchema,
    STRICT_DECODE_OPTIONS,
  )(raw);
}

export function decodeStatBlockRecordEither(
  raw: unknown,
): Either.Either<
  Schema.Schema.Type<typeof StatBlockRecordSchema>,
  ParseResult.ParseError
> {
  return Schema.decodeUnknownEither(
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

export function decodeUnitRecordEither(
  raw: unknown,
): Either.Either<
  Schema.Schema.Type<typeof UnitRecordSchema>,
  ParseResult.ParseError
> {
  return Schema.decodeUnknownEither(
    UnitRecordSchema,
    STRICT_DECODE_OPTIONS,
  )(raw);
}

export function decodeSrdSurfaceSync(raw: unknown): SrdSurface {
  return Schema.decodeUnknownSync(SrdSurfaceSchema, STRICT_DECODE_OPTIONS)(raw);
}

export function decodeSrdSurfaceEither(
  raw: unknown,
): Either.Either<SrdSurface, ParseResult.ParseError> {
  return Schema.decodeUnknownEither(
    SrdSurfaceSchema,
    STRICT_DECODE_OPTIONS,
  )(raw);
}

export function formatSurfaceDecodeError(
  error: ParseResult.ParseError,
): string {
  return ParseResult.TreeFormatter.formatErrorSync(error);
}
