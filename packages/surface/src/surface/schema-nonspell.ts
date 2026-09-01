// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.fighter-heroic-warrior character-sheet.cleric-divine-intervention-session-invocation
import { Effect, Schema, SchemaTransformation } from "effect";
import { UnitId, type UnitId as UnitIdType } from "@dnd/shared/game-facts";
import { AbilityScore } from "@dnd/shared/types";

import {
  AbilitySchema,
  AlternateActionCostSchema,
  ArmorCategorySchema,
  ArmorTrainingCategorySchema,
  BackgroundRecordKindSchema,
  ClassLevelChoiceCountSchema,
  ClassRecordKindSchema,
  SubclassRecordKindSchema,
  ClassNameSchema,
  ConditionSchema,
  DamageTypeSchema,
  DiceAmountSchema,
  FeatCategorySchema,
  HalfClassLevelRoundedDownHoursDurationValueSchema,
  HeavyArmorAcFormulaSchema,
  LIST_PREPARED_SPELLCASTING_CLASS_NAMES,
  LevelAxisSchema,
  LightArmorAcFormulaSchema,
  MagicItemRaritySchema,
  MediumArmorAcFormulaSchema,
  NON_SPELLCASTING_CLASS_NAMES,
  ProficiencyGrantSchema,
  ProvenanceSchema,
  RollKindSchema,
  SkillSchema,
  SpeciesRecordKindSchema,
  StandardActionKindSchema,
  surfaceSchemaRole,
  type SurfaceIdentityKind,
  type SurfaceSpecializedLinkSourceRole,
  type SurfaceProjectionKind,
  type SurfaceProtocolKind,
  type SurfaceUnitDependencyRelation,
  type SurfaceUnitReferenceRelation,
  ToolProficiencyGrantSchema,
  WeaponProficiencySchema,
  WeaponCategorySchema,
  WeaponDamageSchema,
  WeaponPropertyDetailSchema,
  WeaponUsageSchema,
} from "./schema-base.ts";
import {
  ForbiddenValueSchema,
  exactOptional,
  strictStruct,
} from "./schema-helpers.ts";
import { MAGIC_INITIATE_SPELL_LISTS } from "./nonspell-vocabulary.ts";

import {
  ActivationPhaseSchema,
  CreatureControlSchema,
  CreatureDismissalSchema,
  CreatureModeSchema,
  DcSourceSchema,
  DurationEndTriggerSchema,
  DurationSchema,
  EffectAtomSchema,
  OngoingPredicateSchema,
  RangeSchema,
  ReactionTriggerSchema,
  SPELL_SLOT_LEVELS,
  SpellSchoolSchema,
  SpellRecordSchema,
  SpawnedCreatureStatBlockSchema,
} from "./schema-spell.ts";

const codecMembers = <const Members extends ReadonlyArray<Schema.Top>>(
  ...members: Members
): Members => members;

const codecFields = <const Fields extends Schema.Struct.Fields>(
  fields: Fields,
): Fields => fields;

const surfaceIdentity = <A extends string, I, RD, RE>(
  schema: Schema.Codec<A, I, RD, RE>,
  kind: SurfaceIdentityKind,
): Schema.Codec<A, I, RD, RE> =>
  surfaceSchemaRole(schema, {
    category: "identity",
    kind,
  });

const surfaceProtocol = <A extends string, I, RD, RE>(
  schema: Schema.Codec<A, I, RD, RE>,
  kind: SurfaceProtocolKind,
): Schema.Codec<A, I, RD, RE> =>
  surfaceSchemaRole(schema, { category: "protocol", kind });

const surfaceProjection = <A extends string, I, RD, RE>(
  schema: Schema.Codec<A, I, RD, RE>,
  kind: SurfaceProjectionKind,
): Schema.Codec<A, I, RD, RE> =>
  surfaceSchemaRole(schema, { category: "projection", kind });

const surfaceReference = <A extends string, I, RD, RE>(
  schema: Schema.Codec<A, I, RD, RE>,
  relation: SurfaceUnitReferenceRelation,
  sourceRole?: SurfaceSpecializedLinkSourceRole,
): Schema.Codec<UnitIdType, I, RD, RE> => {
  const role =
    sourceRole === undefined
      ? ({ category: "reference", relation, targetKind: "unit" } as const)
      : ({
          category: "reference",
          relation,
          targetKind: "unit",
          sourceRole,
        } as const);
  return surfaceSchemaRole(
    surfaceSchemaRole(schema, role).pipe(Schema.decodeTo(UnitId)),
    role,
  );
};

const surfaceDependency = <A extends string, I, RD, RE>(
  schema: Schema.Codec<A, I, RD, RE>,
  relation: SurfaceUnitDependencyRelation,
  sourceRole?: SurfaceSpecializedLinkSourceRole,
): Schema.Codec<UnitIdType, I, RD, RE> => {
  const role =
    sourceRole === undefined
      ? ({ category: "dependency", relation, targetKind: "unit" } as const)
      : ({
          category: "dependency",
          relation,
          targetKind: "unit",
          sourceRole,
        } as const);
  return surfaceSchemaRole(
    surfaceSchemaRole(schema, role).pipe(Schema.decodeTo(UnitId)),
    role,
  );
};

const surfaceExactDependency = <const Value extends string>(
  value: Value,
  relation: SurfaceUnitDependencyRelation,
): Schema.Codec<Value & UnitIdType, Value> => {
  const exactUnitId = UnitId.make(value);
  const schema = surfaceSchemaRole(
    Schema.Literal(value)
      .pipe(Schema.decodeTo(UnitId))
      .pipe(
        Schema.decodeTo(
          Schema.Literal(value).pipe(Schema.brand("UnitId")),
          SchemaTransformation.transform({
            decode: () => value,
            encode: () => exactUnitId,
          }),
        ),
      ),
    {
      category: "dependency",
      relation,
      targetKind: "unit",
    },
  );
  return schema;
};

const surfaceProse = <A extends string, I, RD, RE>(
  schema: Schema.Codec<A, I, RD, RE>,
): Schema.Codec<A, I, RD, RE> =>
  surfaceSchemaRole(schema, { category: "prose", evidence: "summary" });

const NonEmptyStringSchema = Schema.Trimmed.check(Schema.isNonEmpty());

const NonNegativeIntegerSchema = Schema.Number.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
);

const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1)),
);

const AbilityScoreIncreasePositiveIntegerSchema = PositiveIntegerSchema.pipe(
  Schema.brand("PositiveInteger"),
);

const FONT_OF_MAGIC_CREATED_SPELL_SLOT_LEVELS = [
  1, 2, 3, 4, 5,
] as const satisfies ReadonlyArray<(typeof SPELL_SLOT_LEVELS)[number]>;
const FontOfMagicCreatedSpellSlotLevelSchema = Schema.Literals([
  ...FONT_OF_MAGIC_CREATED_SPELL_SLOT_LEVELS,
]);

const CLASS_CONTAINER_WITHOUT_SPELL_ACCESS_CLASS_NAMES = [
  ...LIST_PREPARED_SPELLCASTING_CLASS_NAMES,
  ...NON_SPELLCASTING_CLASS_NAMES,
] as const;

const numberTierSchema = Schema.Struct({
  atLevel: Schema.Number,
  value: Schema.Number,
});

const AbilityModifierCapSchema = Schema.Struct({
  kind: Schema.Literal("ability_modifier"),
  ability: AbilitySchema,
  minimum: exactOptional(Schema.Number),
});

const FixedCountCapSchema = Schema.Struct({
  kind: Schema.Literal("fixed"),
  uses: Schema.Number,
});

const ThresholdCountCapSchema = Schema.Struct({
  kind: Schema.Literal("threshold_tiers"),
  axis: LevelAxisSchema,
  base: Schema.Number,
  tiers: Schema.NonEmptyArray(numberTierSchema),
});

const LinearCountCapSchema = Schema.Struct({
  kind: Schema.Literal("linear_per_level"),
  axis: LevelAxisSchema,
  base: Schema.Number,
  perLevel: Schema.Number,
  startingAtLevel: Schema.Number,
});

const FiniteResourceCapSchema = Schema.Union([
  FixedCountCapSchema,
  ThresholdCountCapSchema,
  LinearCountCapSchema,
  Schema.Struct({ kind: Schema.Literal("proficiency_bonus") }),
  AbilityModifierCapSchema,
]);

const classFeatureActivationCostMembers = codecMembers(
  Schema.Struct({ kind: Schema.Literal("free") }),
  Schema.Struct({
    kind: Schema.Literal("standard_action"),
    action: StandardActionKindSchema,
  }),
  Schema.Struct({ kind: Schema.Literal("action_plus_bonus_action") }),
  Schema.Struct({
    kind: Schema.Literal("bonus_action"),
    action: exactOptional(StandardActionKindSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("reaction"),
    trigger: exactOptional(ReactionTriggerSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("study"),
    hours: PositiveIntegerSchema,
    withinDays: PositiveIntegerSchema,
  }),
  Schema.Struct({ kind: Schema.Literal("replace_attack") }),
);
type ClassFeatureActivationCostCodec = Schema.Union<
  typeof classFeatureActivationCostMembers
>;
export const ClassFeatureActivationCostSchema: ClassFeatureActivationCostCodec =
  Schema.Union(classFeatureActivationCostMembers);

export const UseCountCapSchema = Schema.Union([
  FiniteResourceCapSchema,
  Schema.Struct({ kind: Schema.Literal("unlimited") }),
]);

export const UseCountResourceSchema = Schema.Struct({
  kind: Schema.Literal("use_count"),
  cap: UseCountCapSchema,
});

export const ChargePoolResourceSchema = Schema.Struct({
  kind: Schema.Literal("charge_pool"),
  cap: FiniteResourceCapSchema,
  initialCount: exactOptional(DiceAmountSchema),
  lifetimeAbsorptionCap: exactOptional(Schema.Number),
});

export const PointPoolResourceSchema = Schema.Struct({
  kind: Schema.Literal("point_pool"),
  poolId: surfaceIdentity(NonEmptyStringSchema, "catalog-reference"),
  cap: FiniteResourceCapSchema,
});

const activationResourceMembers = codecMembers(
  UseCountResourceSchema,
  ChargePoolResourceSchema,
);
type ActivationResourceCodec = Schema.Union<typeof activationResourceMembers>;
export const ActivationResourceSchema: ActivationResourceCodec = Schema.Union(
  activationResourceMembers,
);

const OngoingFeatureExtensionTriggerSchema = Schema.Literals([
  "attack_roll_against_enemy",
  "bonus_action",
  "enemy_saving_throw",
]);

const OngoingFeatureLifecycleSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("turn_boundary"),
    initialExpiration: Schema.Literal("start_of_next_turn"),
    earlyEndConditions: exactOptional(Schema.Array(ConditionSchema)),
    earlyEndArmorCategories: exactOptional(Schema.Array(ArmorCategorySchema)),
  }),
  Schema.Struct({
    kind: Schema.Literal("round_extended"),
    initialExpiration: Schema.Literal("end_of_next_turn"),
    earlyEndConditions: exactOptional(Schema.Array(ConditionSchema)),
    earlyEndArmorCategories: exactOptional(Schema.Array(ArmorCategorySchema)),
    extensionTriggers: Schema.NonEmptyArray(
      OngoingFeatureExtensionTriggerSchema,
    ),
    maximumDuration: Schema.Struct({
      unit: Schema.Literals(["round", "minute", "hour", "day"]),
      amount: PositiveIntegerSchema,
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("fixed_duration"),
    duration: Schema.Struct({
      unit: Schema.Literals(["round", "minute", "hour", "day"]),
      amount: PositiveIntegerSchema,
    }),
    earlyEndConditions: exactOptional(Schema.Array(ConditionSchema)),
    earlyEndArmorCategories: exactOptional(Schema.Array(ArmorCategorySchema)),
  }),
]);

const OngoingFeatureSupportFields = {
  lifecycle: OngoingFeatureLifecycleSchema,
  concentrationEffect: exactOptional(Schema.Literal("break_and_prevent")),
  actionRestrictions: exactOptional(
    Schema.Array(Schema.Literal("spellcasting")),
  ),
  levelOverrides: exactOptional(
    Schema.Array(
      Schema.Struct({
        atClassLevel: PositiveIntegerSchema,
        lifecycle: OngoingFeatureLifecycleSchema,
      }),
    ),
  ),
};
const ActivationCostOngoingFeatureSupportSchema = Schema.Struct({
  activationTiming: Schema.Literal("activation_cost"),
  ...OngoingFeatureSupportFields,
});
const FirstAttackRollOngoingFeatureSupportSchema = Schema.Struct({
  activationTiming: Schema.Literal("first_attack_roll"),
  ...OngoingFeatureSupportFields,
});

export const RelativeDayResetTriggerSchema = Schema.Literals([
  "resource_spent",
  "resource_empty",
]);

export const RestResetCadenceSchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("short_or_long_rest") }),
  Schema.Struct({ kind: Schema.Literal("long_rest") }),
  Schema.Struct({ kind: Schema.Literal("short_rest") }),
  Schema.Struct({
    kind: Schema.Literal("partial_short_full_long"),
    shortRestRefill: Schema.Number,
  }),
]);

export const TimeResetCadenceSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("dawn"),
    regain: exactOptional(Schema.NullOr(DiceAmountSchema)),
  }),
  Schema.Struct({ kind: Schema.Literal("century") }),
  Schema.Struct({
    kind: Schema.Literal("elapsed_days"),
    days: Schema.Number,
    regain: exactOptional(Schema.NullOr(DiceAmountSchema)),
    startsWhen: RelativeDayResetTriggerSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("elapsed_hours"),
    hours: PositiveIntegerSchema,
    regain: exactOptional(Schema.NullOr(DiceAmountSchema)),
  }),
  Schema.Struct({ kind: Schema.Literal("never") }),
]);

const resetCadenceMembers = codecMembers(
  RestResetCadenceSchema,
  TimeResetCadenceSchema,
);
type ResetCadenceCodec = Schema.Union<typeof resetCadenceMembers>;
export const ResetCadenceSchema: ResetCadenceCodec =
  Schema.Union(resetCadenceMembers);

export const RiderExpirySchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("target_uses_or_turn_start") }),
  Schema.Struct({ kind: Schema.Literal("end_of_next_turn") }),
  Schema.Struct({ kind: Schema.Literal("caster_turn_start") }),
  Schema.Struct({ kind: Schema.Literal("start_of_attacker_next_turn") }),
]);

const weaponKindSchema = Schema.Literals([
  "ranged",
  "melee_two_handed",
  "melee_one_handed",
  "two_weapons",
]);

const baseEquipmentPredicateSchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("holding_item") }),
  Schema.Struct({ kind: Schema.Literal("peering_through_item") }),
  Schema.Struct({ kind: Schema.Literal("wearing_item") }),
  Schema.Struct({ kind: Schema.Literal("unarmored") }),
  Schema.Struct({ kind: Schema.Literal("unarmed_or_monk_weapons_only") }),
  Schema.Struct({
    kind: Schema.Literal("wearing_armor"),
    categories: Schema.Array(Schema.Literals(["light", "medium", "heavy"])),
  }),
  Schema.Struct({
    kind: Schema.Literal("not_wearing_armor"),
    categories: Schema.Array(Schema.Literals(["light", "medium", "heavy"])),
  }),
  Schema.Struct({
    kind: Schema.Literal("wielding_weapon"),
    weaponKind: weaponKindSchema,
  }),
  Schema.Struct({ kind: Schema.Literal("not_wielding_shield") }),
]);

export const EquipmentPredicateSchema = Schema.suspend(() =>
  Schema.Union([
    Schema.Struct({ kind: Schema.Literal("always") }),
    baseEquipmentPredicateSchema,
    Schema.Struct({
      kind: Schema.Literal("all_of"),
      predicates: Schema.NonEmptyArray(baseEquipmentPredicateSchema),
    }),
  ]),
).pipe(Schema.annotate({ identifier: "EquipmentPredicate" }));

export const PassiveSuppressorSchema = Schema.Struct({
  kind: Schema.Literal("condition_active"),
  conditions: Schema.NonEmptyArray(ConditionSchema),
});

class PassiveOperationFields {
  readonly trigger = Schema.Struct({
    kind: Schema.Literal("elapsed_time"),
    unit: Schema.Literals(["hour", "day"]),
    amount: Schema.Number,
  });
  readonly predicate = exactOptional(
    Schema.suspend(() => OngoingPredicateSchema).pipe(
      Schema.annotate({ identifier: "OngoingPredicate" }),
    ),
  );
  readonly effect: typeof EffectAtomSchema = EffectAtomSchema;
}
const passiveOperationFields = codecFields({
  ...new PassiveOperationFields(),
});
type PassiveOperationCodec = Schema.Struct<typeof passiveOperationFields>;
export type PassiveOperation = Schema.Schema.Type<PassiveOperationCodec>;
export const PassiveOperationSchema: PassiveOperationCodec = Schema.Struct(
  passiveOperationFields,
);

const classFeatureDurationMembers = codecMembers(
  DurationSchema,
  Schema.Struct({
    kind: Schema.Literal("timed"),
    value: HalfClassLevelRoundedDownHoursDurationValueSchema,
    earlyEnd: exactOptional(Schema.NonEmptyArray(DurationEndTriggerSchema)),
  }),
);
type ClassFeatureDurationCodec = Schema.Union<
  typeof classFeatureDurationMembers
>;
export const ClassFeatureDurationSchema: ClassFeatureDurationCodec =
  Schema.Union(classFeatureDurationMembers);

class ActivatedAbilityBaseFieldsOwner {
  readonly condition: Schema.optionalKey<typeof EquipmentPredicateSchema> =
    exactOptional(EquipmentPredicateSchema);
  readonly range: Schema.optionalKey<typeof RangeSchema> =
    exactOptional(RangeSchema);
  readonly usageLimit = exactOptional(
    Schema.Struct({ kind: Schema.Literal("once_per_turn") }),
  );
}
class ResourceActivatedAbilityFieldsOwner extends ActivatedAbilityBaseFieldsOwner {
  readonly resource: typeof ActivationResourceSchema = ActivationResourceSchema;
  readonly resetCadence: typeof ResetCadenceSchema = ResetCadenceSchema;
  readonly duration: Schema.optionalKey<typeof ClassFeatureDurationSchema> =
    exactOptional(ClassFeatureDurationSchema);
}
class ResourceOngoingFeatureAbilityFieldsOwner extends ActivatedAbilityBaseFieldsOwner {
  readonly resource: typeof ActivationResourceSchema = ActivationResourceSchema;
  readonly resetCadence: typeof ResetCadenceSchema = ResetCadenceSchema;
  readonly duration: Schema.optionalKey<typeof ForbiddenValueSchema> =
    exactOptional(ForbiddenValueSchema);
}
class ResourcelessOngoingFeatureAbilityFieldsOwner extends ActivatedAbilityBaseFieldsOwner {
  readonly resource: Schema.optionalKey<typeof ForbiddenValueSchema> =
    exactOptional(ForbiddenValueSchema);
  readonly resetCadence: Schema.optionalKey<typeof ForbiddenValueSchema> =
    exactOptional(ForbiddenValueSchema);
  readonly duration: Schema.optionalKey<typeof ForbiddenValueSchema> =
    exactOptional(ForbiddenValueSchema);
}
const ResourceActivatedAbilityFields = {
  ...new ResourceActivatedAbilityFieldsOwner(),
};
class ResourceActivatedAbilitySchemaFields extends ResourceActivatedAbilityFieldsOwner {
  readonly activationCost: typeof ClassFeatureActivationCostSchema =
    ClassFeatureActivationCostSchema;
  readonly ongoingFeature: Schema.optionalKey<typeof ForbiddenValueSchema> =
    exactOptional(ForbiddenValueSchema);
  readonly family = Schema.Literal("activation");
  readonly phases: Schema.NonEmptyArray<typeof ActivationPhaseSchema> =
    Schema.NonEmptyArray(ActivationPhaseSchema);
}
const resourceActivatedAbilityFields = codecFields({
  ...new ResourceActivatedAbilitySchemaFields(),
});
const ResourceActivatedAbilitySchema: Schema.Struct<
  typeof resourceActivatedAbilityFields
> = Schema.Struct(resourceActivatedAbilityFields);
class ResourceOngoingFeatureAbilitySchemaFields extends ResourceOngoingFeatureAbilityFieldsOwner {
  readonly activationCost = Schema.Struct({
    kind: Schema.Literal("bonus_action"),
    action: exactOptional(StandardActionKindSchema),
  });
  readonly ongoingFeature: typeof ActivationCostOngoingFeatureSupportSchema =
    ActivationCostOngoingFeatureSupportSchema;
  readonly family = Schema.Literal("activation");
  readonly phases: Schema.NonEmptyArray<typeof ActivationPhaseSchema> =
    Schema.NonEmptyArray(ActivationPhaseSchema);
}
const resourceOngoingFeatureAbilityFields = codecFields({
  ...new ResourceOngoingFeatureAbilitySchemaFields(),
});
const ResourceOngoingFeatureAbilitySchema: Schema.Struct<
  typeof resourceOngoingFeatureAbilityFields
> = Schema.Struct(resourceOngoingFeatureAbilityFields);
class ResourcelessOngoingFeatureAbilitySchemaFields extends ResourcelessOngoingFeatureAbilityFieldsOwner {
  readonly activationCost = Schema.Struct({ kind: Schema.Literal("free") });
  readonly ongoingFeature: typeof FirstAttackRollOngoingFeatureSupportSchema =
    FirstAttackRollOngoingFeatureSupportSchema;
  readonly family = Schema.Literal("activation");
  readonly phases: Schema.NonEmptyArray<typeof ActivationPhaseSchema> =
    Schema.NonEmptyArray(ActivationPhaseSchema);
}
const resourcelessOngoingFeatureAbilityFields = codecFields({
  ...new ResourcelessOngoingFeatureAbilitySchemaFields(),
});
const ResourcelessOngoingFeatureAbilitySchema: Schema.Struct<
  typeof resourcelessOngoingFeatureAbilityFields
> = Schema.Struct(resourcelessOngoingFeatureAbilityFields);
class ActivatedAbilityMechanicsMembers {
  readonly resource: typeof ResourceActivatedAbilitySchema =
    ResourceActivatedAbilitySchema;
  readonly resourceOngoing: typeof ResourceOngoingFeatureAbilitySchema =
    ResourceOngoingFeatureAbilitySchema;
  readonly resourcelessOngoing: typeof ResourcelessOngoingFeatureAbilitySchema =
    ResourcelessOngoingFeatureAbilitySchema;
}
const activatedAbilityMechanicsMembers: ReadonlyArray<
  ActivatedAbilityMechanicsMembers[keyof ActivatedAbilityMechanicsMembers]
> = Object.values(new ActivatedAbilityMechanicsMembers());
type ActivatedAbilityMechanicsCodec = Schema.Union<
  typeof activatedAbilityMechanicsMembers
>;
export type ActivatedAbilityMechanics =
  Schema.Schema.Type<ActivatedAbilityMechanicsCodec>;
export const ActivatedAbilityMechanicsSchema: ActivatedAbilityMechanicsCodec =
  Schema.Union(activatedAbilityMechanicsMembers);

class TriggeredReactionAbilityMechanicsFields {
  readonly condition: Schema.optionalKey<typeof EquipmentPredicateSchema> =
    exactOptional(EquipmentPredicateSchema);
  readonly resource: typeof ActivationResourceSchema = ActivationResourceSchema;
  readonly resetCadence: typeof ResetCadenceSchema = ResetCadenceSchema;
  readonly duration: Schema.optionalKey<typeof ClassFeatureDurationSchema> =
    exactOptional(ClassFeatureDurationSchema);
  /* v8 ignore next -- @preserve -- this nested declarative schema initializes during collection; canonical triggered-reaction records are decoded by the catalog tests */
  readonly usageLimit = exactOptional(
    Schema.Struct({ kind: Schema.Literal("once_per_turn") }),
  );
  readonly family = Schema.Literal("triggered_reaction");
  readonly activationCost: Schema.Struct<{
    readonly kind: Schema.Literal<"reaction">;
    readonly trigger: Schema.optionalKey<typeof ReactionTriggerSchema>;
  }> = Schema.Struct({
    kind: Schema.Literal("reaction"),
    trigger: exactOptional(ReactionTriggerSchema),
  });
  readonly range: typeof RangeSchema = RangeSchema;
  readonly interruptsTrigger: typeof Schema.Boolean = Schema.Boolean;
  readonly phases: Schema.NonEmptyArray<typeof ActivationPhaseSchema> =
    Schema.NonEmptyArray(ActivationPhaseSchema);
}
const triggeredReactionAbilityMechanicsFields = codecFields({
  ...new TriggeredReactionAbilityMechanicsFields(),
});
type TriggeredReactionAbilityMechanicsCodec = Schema.Struct<
  typeof triggeredReactionAbilityMechanicsFields
>;
export type TriggeredReactionAbilityMechanics =
  Schema.Schema.Type<TriggeredReactionAbilityMechanicsCodec>;
export const TriggeredReactionAbilityMechanicsSchema: TriggeredReactionAbilityMechanicsCodec =
  Schema.Struct(triggeredReactionAbilityMechanicsFields);

class MagicItemSpawnedCreaturePayloadFields {
  readonly creature: typeof SpawnedCreatureStatBlockSchema =
    SpawnedCreatureStatBlockSchema;
  readonly mode: Schema.optionalKey<typeof CreatureModeSchema> =
    exactOptional(CreatureModeSchema);
  readonly control: typeof CreatureControlSchema = CreatureControlSchema;
  readonly dismissal: typeof CreatureDismissalSchema = CreatureDismissalSchema;
}
const magicItemSpawnedCreaturePayloadFields = codecFields({
  ...new MagicItemSpawnedCreaturePayloadFields(),
});
type MagicItemSpawnedCreaturePayloadCodec = Schema.Struct<
  typeof magicItemSpawnedCreaturePayloadFields
>;
const MagicItemSpawnedCreaturePayloadSchema: MagicItemSpawnedCreaturePayloadCodec =
  Schema.Struct(magicItemSpawnedCreaturePayloadFields);

const magicItemSpawnedCreatureMechanicsFields = codecFields({
  ...ResourceActivatedAbilityFields,
  activationCost: ClassFeatureActivationCostSchema,
  ...MagicItemSpawnedCreaturePayloadSchema.fields,
  family: Schema.Literal("spawned_creature"),
  range: RangeSchema,
});
type MagicItemSpawnedCreatureMechanicsCodec = Schema.Struct<
  typeof magicItemSpawnedCreatureMechanicsFields
>;
export type MagicItemSpawnedCreatureMechanics =
  Schema.Schema.Type<MagicItemSpawnedCreatureMechanicsCodec>;
export const MagicItemSpawnedCreatureMechanicsSchema: MagicItemSpawnedCreatureMechanicsCodec =
  Schema.Struct(magicItemSpawnedCreatureMechanicsFields);

export type ClassFeatureActivationMechanics = ActivatedAbilityMechanics;
export const ClassFeatureActivationMechanicsSchema: typeof ActivatedAbilityMechanicsSchema =
  ActivatedAbilityMechanicsSchema;

const alternateActionCostMechanicsFields = codecFields({
  family: Schema.Literal("alternate_action_cost"),
  ...AlternateActionCostSchema.fields,
});
type AlternateActionCostMechanicsCodec = Schema.Struct<
  typeof alternateActionCostMechanicsFields
>;
export const AlternateActionCostMechanicsSchema: AlternateActionCostMechanicsCodec =
  Schema.Struct(alternateActionCostMechanicsFields);

const BuildTimeFeatureChoiceChangeSchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("never") }),
  Schema.Struct({
    kind: Schema.Literal("class_level"),
    count: PositiveIntegerSchema,
  }),
]);

const FeatureChoiceSelectionRepeatabilitySchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("unique") }),
  Schema.Struct({
    kind: Schema.Literal("per_option"),
    default: Schema.Literal("once"),
    repeatableWhen: Schema.Struct({
      kind: Schema.Literal("option_description_repeatable_clause"),
    }),
  }),
]);

const classFeatureAcquisitionChoiceMechanicsFields = codecFields({
  family: Schema.Literal("class_feature_acquisition_choice"),
  choiceKey: surfaceProtocol(NonEmptyStringSchema, "choiceKey"),
  timing: Schema.Literal("class_feature_acquisition"),
  options: Schema.NonEmptyArray(
    Schema.Struct({
      id: surfaceIdentity(NonEmptyStringSchema, "id"),
      displayName: surfaceIdentity(NonEmptyStringSchema, "displayName"),
      mechanics: Schema.suspend(() => PassiveMechanicsSchema).pipe(
        Schema.annotate({ identifier: "PassiveMechanics" }),
      ),
    }),
  ),
});
type ClassFeatureAcquisitionChoiceMechanicsCodec = Schema.Struct<
  typeof classFeatureAcquisitionChoiceMechanicsFields
>;
export type ClassFeatureAcquisitionChoiceMechanics =
  Schema.Schema.Type<ClassFeatureAcquisitionChoiceMechanicsCodec>;
export const ClassFeatureAcquisitionChoiceMechanicsSchema: ClassFeatureAcquisitionChoiceMechanicsCodec =
  Schema.Struct(classFeatureAcquisitionChoiceMechanicsFields);

export const ClassFeatureEffectSaveDcSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("class_spellcasting_spell_save_dc"),
  }),
  Schema.Struct({
    kind: Schema.Literal("class_feature_ability_save_dc"),
    base: Schema.Literal(8),
    ability: AbilitySchema,
  }),
]);

const classFeatureResourceContainerMechanicsFields = codecFields({
  family: Schema.Literal("resource_container"),
  resource: ActivationResourceSchema,
  resetCadence: ResetCadenceSchema,
  optionSet: Schema.Struct({
    choiceKey: surfaceProtocol(NonEmptyStringSchema, "choiceKey"),
    timing: Schema.Literal("resource_use"),
    initialOptions: Schema.NonEmptyArray(
      Schema.Struct({
        id: surfaceIdentity(NonEmptyStringSchema, "id"),
        displayName: surfaceIdentity(NonEmptyStringSchema, "displayName"),
        battleExecution: exactOptional(
          Schema.Union([
            Schema.Struct({
              kind: Schema.Literal("bonus_action_unarmed_strike_sequence"),
              focusPointCost: Schema.Literal(1),
              strikeCount: Schema.Literal(2),
            }),
            Schema.Struct({
              kind: Schema.Literal("bonus_action_defensive_modes"),
              freeAction: Schema.Literal("disengage"),
              focusPointCost: Schema.Literal(1),
              focusActions: Schema.Tuple([
                Schema.Literal("disengage"),
                Schema.Literal("dodge"),
              ]),
            }),
            Schema.Struct({
              kind: Schema.Literal("bonus_action_mobility_modes"),
              freeAction: Schema.Literal("dash"),
              focusPointCost: Schema.Literal(1),
              focusActions: Schema.Tuple([
                Schema.Literal("disengage"),
                Schema.Literal("dash"),
              ]),
              jumpDistanceMultiplier: Schema.Struct({
                multiplier: Schema.Literal(2),
                expires: Schema.Literal("end_of_turn"),
              }),
            }),
          ]),
        ),
      }),
    ),
  }),
  effectSaveDc: exactOptional(ClassFeatureEffectSaveDcSchema),
});
type ClassFeatureResourceContainerMechanicsCodec = Schema.Struct<
  typeof classFeatureResourceContainerMechanicsFields
>;
export const ClassFeatureResourceContainerMechanicsSchema: ClassFeatureResourceContainerMechanicsCodec =
  Schema.Struct(classFeatureResourceContainerMechanicsFields);

export const SpellSlotToPointPoolOperationSchema = Schema.Struct({
  kind: Schema.Literal("spell_slot_to_point_pool"),
  activationCost: Schema.Struct({ kind: Schema.Literal("free") }),
  pointGain: Schema.Struct({
    kind: Schema.Literal("equal_to_spell_slot_level"),
  }),
});

const ResourcePoolSpellSlotCreationOptionSchema = Schema.Struct({
  spellSlotLevel: FontOfMagicCreatedSpellSlotLevelSchema,
  pointCost: PositiveIntegerSchema,
  minimumClassLevel: PositiveIntegerSchema,
});

const distinctSpellSlotCreationLevels = (
  options: readonly Schema.Schema.Type<
    typeof ResourcePoolSpellSlotCreationOptionSchema
  >[],
): boolean =>
  new Set(options.map((option) => option.spellSlotLevel)).size ===
  options.length;

const ResourcePoolSpellSlotCreationOptionsSchema = Schema.NonEmptyArray(
  ResourcePoolSpellSlotCreationOptionSchema,
).pipe(
  Schema.check(
    Schema.makeFilter(distinctSpellSlotCreationLevels, {
      /* v8 ignore next 2 -- @preserve -- this annotation formats the diagnostic after malformed point-pool options repeat a Spell Slot level */
      message:
        "Point-pool Spell Slot creation options must have distinct Spell Slot levels.",
    }),
  ),
);

export const PointPoolToSpellSlotOperationSchema = Schema.Struct({
  kind: Schema.Literal("point_pool_to_spell_slot"),
  activationCost: Schema.Struct({ kind: Schema.Literal("bonus_action") }),
  createdSlotExpiry: Schema.Struct({ kind: Schema.Literal("long_rest") }),
  options: ResourcePoolSpellSlotCreationOptionsSchema,
});

export const ResourcePoolOperationSchema = Schema.Union([
  SpellSlotToPointPoolOperationSchema,
  PointPoolToSpellSlotOperationSchema,
]);

const classFeatureResourcePoolMechanicsFields = codecFields({
  family: Schema.Literal("resource_pool"),
  resource: PointPoolResourceSchema,
  resetCadence: RestResetCadenceSchema,
  operations: Schema.NonEmptyArray(ResourcePoolOperationSchema),
});
type ClassFeatureResourcePoolMechanicsCodec = Schema.Struct<
  typeof classFeatureResourcePoolMechanicsFields
>;
export const ClassFeatureResourcePoolMechanicsSchema: ClassFeatureResourcePoolMechanicsCodec =
  Schema.Struct(classFeatureResourcePoolMechanicsFields);

const featureChoiceMechanicsMembers = codecMembers(
  Schema.Struct({
    family: Schema.Literal("feature_choice"),
    choiceKey: surfaceSchemaRole(Schema.Literal("eldritch_invocations"), {
      category: "protocol",
      kind: "choiceKey",
    }),
    timing: Schema.Literal("class_feature_acquisition"),
    choiceCount: ClassLevelChoiceCountSchema,
    optionSource: Schema.Struct({
      kind: Schema.Literal("class_feature_options"),
      className: Schema.Literal("warlock"),
      optionKind: Schema.Literal("eldritch_invocation"),
    }),
    changeOn: BuildTimeFeatureChoiceChangeSchema,
    constraints: exactOptional(
      Schema.Struct({
        prerequisitesRequired: Schema.Boolean,
        selectionRepeatability: FeatureChoiceSelectionRepeatabilitySchema,
        prerequisiteForKnownOptionLocksReplacement: exactOptional(
          Schema.Boolean,
        ),
      }),
    ),
  }),
);
type FeatureChoiceMechanicsCodec = Schema.Union<
  typeof featureChoiceMechanicsMembers
>;
export const FeatureChoiceMechanicsSchema: FeatureChoiceMechanicsCodec =
  Schema.Union(featureChoiceMechanicsMembers);

type MetamagicChoiceLevelSchema = Schema.Struct<{
  atLevel: typeof PositiveIntegerSchema;
  total: typeof PositiveIntegerSchema;
}>;

const METAMAGIC_CHOICE_LEVELS = [
  { atLevel: 2, total: 2 },
  { atLevel: 10, total: 4 },
  { atLevel: 17, total: 6 },
] as const satisfies ReadonlyArray<
  Schema.Schema.Type<MetamagicChoiceLevelSchema>
>;

const metamagicChoiceCountMatchesSorcererTable = (
  choiceCount: Schema.Schema.Type<typeof ClassLevelChoiceCountSchema>,
): boolean =>
  choiceCount.kind === "class_level_total_choices" &&
  choiceCount.levels.length === METAMAGIC_CHOICE_LEVELS.length &&
  METAMAGIC_CHOICE_LEVELS.every(
    (expected, index) =>
      choiceCount.levels[index]?.atLevel === expected.atLevel &&
      choiceCount.levels[index]?.total === expected.total,
  );

const MetamagicChoiceCountSchema = ClassLevelChoiceCountSchema.pipe(
  Schema.check(
    Schema.makeFilter(metamagicChoiceCountMatchesSorcererTable, {
      /* v8 ignore next 2 -- @preserve -- this annotation formats the diagnostic after malformed Metamagic totals disagree with the SRD table */
      message:
        "Sorcerer Metamagic option totals must match the SRD Sorcerer Features table.",
    }),
  ),
);

export const SORCERER_METAMAGIC_OPTIONS_CHOICE_KEY =
  "sorcerer_metamagic_options" as const;

export const SORCERER_METAMAGIC_OPTION_IDS = [
  "sorcerer_careful_spell",
  "sorcerer_distant_spell",
  "sorcerer_empowered_spell",
  "sorcerer_extended_spell",
  "sorcerer_heightened_spell",
  "sorcerer_quickened_spell",
  "sorcerer_seeking_spell",
  "sorcerer_subtle_spell",
  "sorcerer_transmuted_spell",
  "sorcerer_twinned_spell",
] as const;
type MetamagicOptionId = (typeof SORCERER_METAMAGIC_OPTION_IDS)[number];

const distinctCompleteMetamagicOptionSet = (
  options: readonly { readonly id: MetamagicOptionId }[],
): boolean => {
  const ids = new Set(options.map((option) => option.id));
  return (
    options.length === SORCERER_METAMAGIC_OPTION_IDS.length &&
    ids.size === SORCERER_METAMAGIC_OPTION_IDS.length &&
    SORCERER_METAMAGIC_OPTION_IDS.every((optionId) => ids.has(optionId))
  );
};

const OnePerSpellMetamagicStackingSchema = Schema.Literal("one_per_spell");
const CanCombineMetamagicStackingSchema = Schema.Literals([
  "can_combine_with_different_metamagic",
]);
const CAREFUL_SPELL_METAMAGIC_EFFECT_KIND = "saving_throw_protection";
const DISTANT_SPELL_METAMAGIC_EFFECT_KIND = "spell_range_increase";
const EMPOWERED_SPELL_METAMAGIC_EFFECT_KIND = "damage_dice_reroll";
const EXTENDED_SPELL_METAMAGIC_EFFECT_KIND =
  "duration_extension_and_concentration_save_advantage";
const HEIGHTENED_SPELL_METAMAGIC_EFFECT_KIND = "saving_throw_disadvantage";
const QUICKENED_SPELL_METAMAGIC_EFFECT_KIND =
  "action_casting_time_to_bonus_action_with_spell_turn_limit";
const SEEKING_SPELL_METAMAGIC_EFFECT_KIND = "missed_spell_attack_reroll";
const SUBTLE_SPELL_METAMAGIC_EFFECT_KIND = "component_suppression";
const TRANSMUTED_SPELL_METAMAGIC_EFFECT_KIND = "damage_type_substitution";
const TWINNED_SPELL_METAMAGIC_EFFECT_KIND =
  "effective_spell_level_increase_for_extra_target";

export const SORCERER_METAMAGIC_EFFECT_KINDS = [
  CAREFUL_SPELL_METAMAGIC_EFFECT_KIND,
  DISTANT_SPELL_METAMAGIC_EFFECT_KIND,
  EMPOWERED_SPELL_METAMAGIC_EFFECT_KIND,
  EXTENDED_SPELL_METAMAGIC_EFFECT_KIND,
  HEIGHTENED_SPELL_METAMAGIC_EFFECT_KIND,
  QUICKENED_SPELL_METAMAGIC_EFFECT_KIND,
  SEEKING_SPELL_METAMAGIC_EFFECT_KIND,
  SUBTLE_SPELL_METAMAGIC_EFFECT_KIND,
  TRANSMUTED_SPELL_METAMAGIC_EFFECT_KIND,
  TWINNED_SPELL_METAMAGIC_EFFECT_KIND,
] as const;

const MetamagicOptionSchema = Schema.Union([
  Schema.Struct({
    id: surfaceIdentity(Schema.Literal("sorcerer_careful_spell"), "id"),
    displayName: surfaceIdentity(
      Schema.Literal("Careful Spell"),
      "displayName",
    ),
    sorceryPointCost: Schema.Literal(1),
    stackingMode: OnePerSpellMetamagicStackingSchema,
    effectKind: Schema.Literal(CAREFUL_SPELL_METAMAGIC_EFFECT_KIND),
  }),
  Schema.Struct({
    id: surfaceIdentity(Schema.Literal("sorcerer_distant_spell"), "id"),
    displayName: surfaceIdentity(
      Schema.Literal("Distant Spell"),
      "displayName",
    ),
    sorceryPointCost: Schema.Literal(1),
    stackingMode: OnePerSpellMetamagicStackingSchema,
    effectKind: Schema.Literal(DISTANT_SPELL_METAMAGIC_EFFECT_KIND),
  }),
  Schema.Struct({
    id: surfaceIdentity(Schema.Literal("sorcerer_empowered_spell"), "id"),
    displayName: surfaceIdentity(
      Schema.Literal("Empowered Spell"),
      "displayName",
    ),
    sorceryPointCost: Schema.Literal(1),
    stackingMode: CanCombineMetamagicStackingSchema,
    effectKind: Schema.Literal(EMPOWERED_SPELL_METAMAGIC_EFFECT_KIND),
  }),
  Schema.Struct({
    id: surfaceIdentity(Schema.Literal("sorcerer_extended_spell"), "id"),
    displayName: surfaceIdentity(
      Schema.Literal("Extended Spell"),
      "displayName",
    ),
    sorceryPointCost: Schema.Literal(1),
    stackingMode: OnePerSpellMetamagicStackingSchema,
    effectKind: Schema.Literal(EXTENDED_SPELL_METAMAGIC_EFFECT_KIND),
  }),
  Schema.Struct({
    id: surfaceIdentity(Schema.Literal("sorcerer_heightened_spell"), "id"),
    displayName: surfaceIdentity(
      Schema.Literal("Heightened Spell"),
      "displayName",
    ),
    sorceryPointCost: Schema.Literal(2),
    stackingMode: OnePerSpellMetamagicStackingSchema,
    effectKind: Schema.Literal(HEIGHTENED_SPELL_METAMAGIC_EFFECT_KIND),
  }),
  Schema.Struct({
    id: surfaceIdentity(Schema.Literal("sorcerer_quickened_spell"), "id"),
    displayName: surfaceIdentity(
      Schema.Literal("Quickened Spell"),
      "displayName",
    ),
    sorceryPointCost: Schema.Literal(2),
    stackingMode: OnePerSpellMetamagicStackingSchema,
    effectKind: Schema.Literal(QUICKENED_SPELL_METAMAGIC_EFFECT_KIND),
  }),
  Schema.Struct({
    id: surfaceIdentity(Schema.Literal("sorcerer_seeking_spell"), "id"),
    displayName: surfaceIdentity(
      Schema.Literal("Seeking Spell"),
      "displayName",
    ),
    sorceryPointCost: Schema.Literal(1),
    stackingMode: CanCombineMetamagicStackingSchema,
    effectKind: Schema.Literal(SEEKING_SPELL_METAMAGIC_EFFECT_KIND),
  }),
  Schema.Struct({
    id: surfaceIdentity(Schema.Literal("sorcerer_subtle_spell"), "id"),
    displayName: surfaceIdentity(Schema.Literal("Subtle Spell"), "displayName"),
    sorceryPointCost: Schema.Literal(1),
    stackingMode: OnePerSpellMetamagicStackingSchema,
    effectKind: Schema.Literal(SUBTLE_SPELL_METAMAGIC_EFFECT_KIND),
  }),
  Schema.Struct({
    id: surfaceIdentity(Schema.Literal("sorcerer_transmuted_spell"), "id"),
    displayName: surfaceIdentity(
      Schema.Literal("Transmuted Spell"),
      "displayName",
    ),
    sorceryPointCost: Schema.Literal(1),
    stackingMode: OnePerSpellMetamagicStackingSchema,
    effectKind: Schema.Literal(TRANSMUTED_SPELL_METAMAGIC_EFFECT_KIND),
  }),
  Schema.Struct({
    id: surfaceIdentity(Schema.Literal("sorcerer_twinned_spell"), "id"),
    displayName: surfaceIdentity(
      Schema.Literal("Twinned Spell"),
      "displayName",
    ),
    sorceryPointCost: Schema.Literal(1),
    stackingMode: OnePerSpellMetamagicStackingSchema,
    effectKind: Schema.Literal(TWINNED_SPELL_METAMAGIC_EFFECT_KIND),
  }),
]);

const MetamagicOptionsSchema = Schema.NonEmptyArray(MetamagicOptionSchema).pipe(
  Schema.check(
    Schema.makeFilter(distinctCompleteMetamagicOptionSet, {
      /* v8 ignore next 2 -- @preserve -- this annotation formats the diagnostic after malformed Metamagic options duplicate or omit an authored option */
      message:
        "Sorcerer Metamagic must author each SRD Metamagic option exactly once.",
    }),
  ),
);

const sorcererMetamagicMechanicsFields = codecFields({
  family: Schema.Literal("metamagic_options"),
  choiceKey: surfaceSchemaRole(
    Schema.Literal(SORCERER_METAMAGIC_OPTIONS_CHOICE_KEY),
    { category: "protocol", kind: "choiceKey" },
  ),
  timing: Schema.Literal("class_feature_acquisition"),
  choiceCount: MetamagicChoiceCountSchema,
  changeOn: Schema.Struct({
    kind: Schema.Literal("class_level"),
    count: Schema.Literal(1),
    replacement: Schema.Literal("one_known_option_with_one_unknown_option"),
  }),
  selectionRepeatability: Schema.Struct({
    kind: Schema.Literal("unique"),
  }),
  spends: Schema.Struct({
    kind: Schema.Literal("class_feature_point_pool"),
    resourceUnitId: surfaceDependency(
      Schema.Literal("sorcerer_font_of_magic"),
      "resource-link",
    ),
  }),
  spellUseLimit: Schema.Struct({
    kind: Schema.Literal("one_per_spell_unless_option_allows_stacking"),
  }),
  options: MetamagicOptionsSchema,
});
type SorcererMetamagicMechanicsCodec = Schema.Struct<
  typeof sorcererMetamagicMechanicsFields
>;
export const SorcererMetamagicMechanicsSchema: SorcererMetamagicMechanicsCodec =
  Schema.Struct(sorcererMetamagicMechanicsFields);

const classSpellcastingProjectionMechanicsFields = codecFields({
  family: Schema.Literal("class_spellcasting_projection"),
  source: Schema.Literal("class_record_spellcasting"),
  spellcastingKind: Schema.Literal("pact_magic_spellcasting_creation"),
});
type ClassSpellcastingProjectionMechanicsCodec = Schema.Struct<
  typeof classSpellcastingProjectionMechanicsFields
>;
export const ClassSpellcastingProjectionMechanicsSchema: ClassSpellcastingProjectionMechanicsCodec =
  Schema.Struct(classSpellcastingProjectionMechanicsFields);

const DruidWildCompanionSpendOptionSchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("spell_slot") }),
  Schema.Struct({
    kind: Schema.Literal("one_class_feature_use"),
    resourceUnitId: surfaceDependency(
      Schema.Literal("druid_wild_shape"),
      "resource-link",
    ),
  }),
]);

const druidWildCompanionSpendOptionsMatchSrd = (
  spendOptions: readonly Schema.Schema.Type<
    typeof DruidWildCompanionSpendOptionSchema
  >[],
): boolean =>
  spendOptions.length === 2 &&
  spendOptions.some((option) => option.kind === "spell_slot") &&
  spendOptions.some(
    (option) =>
      option.kind === "one_class_feature_use" &&
      option.resourceUnitId === "druid_wild_shape",
  );

const DruidWildCompanionSpendOptionsSchema = Schema.NonEmptyArray(
  DruidWildCompanionSpendOptionSchema,
).pipe(
  Schema.check(
    Schema.makeFilter(druidWildCompanionSpendOptionsMatchSrd, {
      /* v8 ignore next 2 -- @preserve -- this annotation formats the diagnostic after malformed Wild Companion spend options violate the fixed pair */
      message:
        "Druid Wild Companion spend options must be exactly one Spell Slot option and one Wild Shape use option.",
    }),
  ),
);

const druidWildCompanionSpellCastMechanicsFields = codecFields({
  family: Schema.Literal("druid_wild_companion_spell_cast"),
  activationCost: Schema.Struct({
    kind: Schema.Literal("standard_action"),
    action: Schema.Literal("magic"),
  }),
  spellId: surfaceDependency(
    Schema.Literal("find_familiar"),
    "spell-reference",
  ),
  spendOptions: DruidWildCompanionSpendOptionsSchema,
  componentOverride: Schema.Struct({
    material: Schema.Literal("not_required"),
  }),
  spellModeOverride: Schema.Struct({
    kind: Schema.Literal("fixed_creature_type_mode_option"),
    optionId: surfaceProtocol(Schema.Literal("fey"), "optionId"),
  }),
  familiarDismissal: Schema.Struct({
    kind: Schema.Literal("caster_finishes_long_rest"),
  }),
});
type DruidWildCompanionSpellCastMechanicsCodec = Schema.Struct<
  typeof druidWildCompanionSpellCastMechanicsFields
>;
export const DruidWildCompanionSpellCastMechanicsSchema: DruidWildCompanionSpellCastMechanicsCodec =
  Schema.Struct(druidWildCompanionSpellCastMechanicsFields);

const warlockPactSlotRecoveryMechanicsFields = codecFields({
  family: Schema.Literal("pact_slot_recovery"),
  activationCost: Schema.Struct({
    kind: Schema.Literal("one_minute_rite"),
  }),
  resource: Schema.Struct({
    kind: Schema.Literal("pact_slots"),
    source: Schema.Literal("class_record_pact_magic"),
  }),
  requiresExpendedSlots: Schema.Literal(true),
  recoveryCap: Schema.Struct({
    kind: Schema.Literal("half_maximum_rounded_up"),
  }),
  resetCadence: Schema.Struct({ kind: Schema.Literal("long_rest") }),
});
type WarlockPactSlotRecoveryMechanicsCodec = Schema.Struct<
  typeof warlockPactSlotRecoveryMechanicsFields
>;
export const WarlockPactSlotRecoveryMechanicsSchema: WarlockPactSlotRecoveryMechanicsCodec =
  Schema.Struct(warlockPactSlotRecoveryMechanicsFields);

const classFeatureComponentMechanicsMembers = codecMembers(
  Schema.suspend(() => PassiveMechanicsSchema).pipe(
    Schema.annotate({ identifier: "PassiveMechanics" }),
  ),
  ActivatedAbilityMechanicsSchema,
  AlternateActionCostMechanicsSchema,
  Schema.suspend(() => OnHitTriggerMechanicsSchema).pipe(
    Schema.annotate({ identifier: "OnHitTriggerMechanics" }),
  ),
  Schema.suspend(() => SaveDamageReplacementMechanicsSchema).pipe(
    Schema.annotate({ identifier: "SaveDamageReplacementMechanics" }),
  ),
  Schema.suspend(() => ReactionRollOrDamageReductionMechanicsSchema).pipe(
    Schema.annotate({ identifier: "ReactionRollOrDamageReductionMechanics" }),
  ),
);
type ClassFeatureComponentMechanicsCodec = Schema.Union<
  typeof classFeatureComponentMechanicsMembers
>;
export type ClassFeatureComponentMechanics =
  Schema.Schema.Type<ClassFeatureComponentMechanicsCodec>;
export const ClassFeatureComponentMechanicsSchema: ClassFeatureComponentMechanicsCodec =
  Schema.Union(classFeatureComponentMechanicsMembers);

const compositeClassFeatureMechanicsFields = codecFields({
  family: Schema.Literal("composite"),
  parts: Schema.NonEmptyArray(ClassFeatureComponentMechanicsSchema),
});
type CompositeClassFeatureMechanicsCodec = Schema.Struct<
  typeof compositeClassFeatureMechanicsFields
>;
export type CompositeClassFeatureMechanics =
  Schema.Schema.Type<CompositeClassFeatureMechanicsCodec>;
export const CompositeClassFeatureMechanicsSchema: CompositeClassFeatureMechanicsCodec =
  Schema.Struct(compositeClassFeatureMechanicsFields);

const spellbookRitualAccessMechanicsFields = codecFields({
  family: Schema.Literal("spellbook_ritual_access"),
  source: Schema.Literal("spellbook"),
  preparationRequirement: Schema.Literal("not_prepared"),
});
type SpellbookRitualAccessMechanicsCodec = Schema.Struct<
  typeof spellbookRitualAccessMechanicsFields
>;
export const SpellbookRitualAccessMechanicsSchema: SpellbookRitualAccessMechanicsCodec =
  Schema.Struct(spellbookRitualAccessMechanicsFields);

const restSpellSlotRecoveryMechanicsFields = codecFields({
  family: Schema.Literal("rest_spell_slot_recovery"),
  recoveryTrigger: Schema.Literal("short_rest"),
  resetCadence: Schema.Struct({ kind: Schema.Literal("long_rest") }),
  recoveredSlotLevelCap: Schema.Struct({
    kind: Schema.Literal("half_class_level_rounded_up"),
    maximumSlotLevelExclusive: Schema.Literal(6),
  }),
});
type RestSpellSlotRecoveryMechanicsCodec = Schema.Struct<
  typeof restSpellSlotRecoveryMechanicsFields
>;
export const RestSpellSlotRecoveryMechanicsSchema: RestSpellSlotRecoveryMechanicsCodec =
  Schema.Struct(restSpellSlotRecoveryMechanicsFields);

const sorcererSorcerousRestorationMechanicsFields = codecFields({
  family: Schema.Literal("sorcery_point_short_rest_recovery"),
  recoveryTrigger: Schema.Literal("short_rest"),
  resource: Schema.Struct({
    kind: Schema.Literal("point_pool"),
    resourceUnitId: surfaceDependency(
      Schema.Literal("sorcerer_font_of_magic"),
      "resource-link",
    ),
  }),
  recoveryCap: Schema.Struct({
    kind: Schema.Literal("half_class_level_rounded_down"),
  }),
  resetCadence: Schema.Struct({ kind: Schema.Literal("long_rest") }),
});
type SorcererSorcerousRestorationMechanicsCodec = Schema.Struct<
  typeof sorcererSorcerousRestorationMechanicsFields
>;
export const SorcererSorcerousRestorationMechanicsSchema: SorcererSorcerousRestorationMechanicsCodec =
  Schema.Struct(sorcererSorcerousRestorationMechanicsFields);

const WizardSpellbookLearningEligibilitySchema = Schema.Struct({
  className: Schema.Literal("wizard"),
  school: SpellSchoolSchema,
});

const wizardSpellbookLearningMechanicsFields = codecFields({
  family: Schema.Literal("wizard_spellbook_learning"),
  spellbookSource: Schema.Struct({
    kind: Schema.Literal("class_spellcasting_spellbook"),
    className: Schema.Literal("wizard"),
  }),
  grants: Schema.NonEmptyArray(
    Schema.Union([
      Schema.Struct({
        timing: Schema.Struct({
          kind: Schema.Literal("class_feature_acquisition"),
        }),
        choiceCount: Schema.Literal(2),
        eligibility: Schema.Struct({
          ...WizardSpellbookLearningEligibilitySchema.fields,
          maximumSpellLevel: Schema.Literal(2),
        }),
      }),
      Schema.Struct({
        timing: Schema.Struct({
          kind: Schema.Literal("new_spell_slot_level_access"),
          className: Schema.Literal("wizard"),
        }),
        choiceCount: Schema.Literal(1),
        eligibility: Schema.Struct({
          ...WizardSpellbookLearningEligibilitySchema.fields,
          maximumSpellLevel: Schema.Struct({
            kind: Schema.Literal("available_spell_slot_level"),
          }),
        }),
      }),
    ]),
  ),
});
type WizardSpellbookLearningMechanicsCodec = Schema.Struct<
  typeof wizardSpellbookLearningMechanicsFields
>;
export const WizardSpellbookLearningMechanicsSchema: WizardSpellbookLearningMechanicsCodec =
  Schema.Struct(wizardSpellbookLearningMechanicsFields);

const failedAbilityCheckResourceBoostMechanicsFields = codecFields({
  family: Schema.Literal("failed_ability_check_resource_boost"),
  trigger: Schema.Struct({ kind: Schema.Literal("failed_ability_check") }),
  spends: Schema.Struct({
    resourceUnitId: surfaceDependency(NonEmptyStringSchema, "resource-link"),
  }),
  bonus: Schema.Struct({
    kind: Schema.Literal("dice"),
    expr: Schema.Struct({
      dice: Schema.Literal(1),
      dieSize: Schema.Literal(10),
    }),
  }),
  refundSpendOnStillFailed: Schema.Literal(true),
});
type FailedAbilityCheckResourceBoostMechanicsCodec = Schema.Struct<
  typeof failedAbilityCheckResourceBoostMechanicsFields
>;
export const FailedAbilityCheckResourceBoostMechanicsSchema: FailedAbilityCheckResourceBoostMechanicsCodec =
  Schema.Struct(failedAbilityCheckResourceBoostMechanicsFields);

const MonkUncannyMetabolismHealingAmountSchema = Schema.Struct({
  kind: Schema.Literal("monk_martial_arts_die_plus_monk_level"),
  martialArtsUnitId: surfaceDependency(
    Schema.Literal("monk_martial_arts"),
    "resource-link",
  ),
});

const monkInitiativeFocusRecoveryMechanicsFields = codecFields({
  family: Schema.Literal("initiative_focus_recovery"),
  trigger: Schema.Struct({ kind: Schema.Literal("roll_initiative") }),
  optional: Schema.Literal(true),
  recovery: Schema.Struct({
    kind: Schema.Literal("recover_all_expended_uses"),
    resourceUnitId: surfaceDependency(
      Schema.Literal("monk_monks_focus"),
      "resource-link",
    ),
  }),
  healing: Schema.Struct({
    kind: Schema.Literal("heal_hp"),
    target: Schema.Literal("self"),
    amount: MonkUncannyMetabolismHealingAmountSchema,
  }),
  resetCadence: Schema.Struct({ kind: Schema.Literal("long_rest") }),
});
type MonkInitiativeFocusRecoveryMechanicsCodec = Schema.Struct<
  typeof monkInitiativeFocusRecoveryMechanicsFields
>;
export const MonkInitiativeFocusRecoveryMechanicsSchema: MonkInitiativeFocusRecoveryMechanicsCodec =
  Schema.Struct(monkInitiativeFocusRecoveryMechanicsFields);

const ReferencedResourceSpendSchema = strictStruct({
  resourceUnitId: surfaceDependency(NonEmptyStringSchema, "resource-link"),
  amount: PositiveIntegerSchema,
});

const spellSlotHealingModifierMechanicsFields = codecFields({
  family: Schema.Literal("spell_slot_healing_modifier"),
  trigger: strictStruct({
    kind: Schema.Literal("caster_spell_slot_restores_hit_points"),
    timing: Schema.Literal("turn_spell_is_cast"),
  }),
  appliesTo: Schema.Literal("each_creature_healed_by_spell"),
  bonus: strictStruct({
    kind: Schema.Literal("flat_plus_spell_slot_level"),
    flat: Schema.Literal(2),
  }),
});
type SpellSlotHealingModifierMechanicsCodec = Schema.Struct<
  typeof spellSlotHealingModifierMechanicsFields
>;
export const SpellSlotHealingModifierMechanicsSchema: SpellSlotHealingModifierMechanicsCodec =
  strictStruct(spellSlotHealingModifierMechanicsFields);

const magicActionHealingPoolMechanicsFields = codecFields({
  family: Schema.Literal("magic_action_healing_pool"),
  activationCost: strictStruct({
    kind: Schema.Literal("standard_action"),
    action: Schema.Literal("magic"),
  }),
  spends: ReferencedResourceSpendSchema,
  range: strictStruct({
    kind: Schema.Literal("point"),
    feet: Schema.Literal(30),
  }),
  targetSelection: strictStruct({
    mode: Schema.Literal("any_number"),
    targetKinds: Schema.Tuple([Schema.Literal("creature")]),
    stateFilter: Schema.Tuple([Schema.Literal("bloodied")]),
    includesSelf: Schema.Literal(true),
  }),
  pool: strictStruct({
    kind: Schema.Literal("class_level_multiplier"),
    multiplier: Schema.Literal(5),
  }),
  perTargetCap: Schema.Literal("half_hit_point_maximum"),
});
type MagicActionHealingPoolMechanicsCodec = Schema.Struct<
  typeof magicActionHealingPoolMechanicsFields
>;
export const MagicActionHealingPoolMechanicsSchema: MagicActionHealingPoolMechanicsCodec =
  strictStruct(magicActionHealingPoolMechanicsFields);

const magicActionAreaSaveDamageHealingMechanicsFields = codecFields({
  family: Schema.Literal("magic_action_area_save_damage_healing"),
  activationCost: strictStruct({
    kind: Schema.Literal("standard_action"),
    action: Schema.Literal("magic"),
  }),
  spends: ReferencedResourceSpendSchema,
  area: strictStruct({
    origin: strictStruct({
      kind: Schema.Literal("point_within_range"),
      rangeFeet: Schema.Literal(60),
    }),
    shape: strictStruct({
      kind: Schema.Literal("sphere"),
      radiusFeet: Schema.Literal(10),
    }),
  }),
  save: strictStruct({
    ability: Schema.Literal("con"),
    dc: strictStruct({
      kind: Schema.Literal("class_spellcasting_spell_save_dc"),
    }),
  }),
  damage: strictStruct({
    targetSelection: strictStruct({
      mode: Schema.Literal("creatures_of_your_choice_in_area"),
    }),
    damageType: Schema.Literal("necrotic"),
    amount: DiceAmountSchema,
    onSuccess: Schema.Literal("half_damage"),
  }),
  healing: strictStruct({
    targetSelection: strictStruct({
      mode: Schema.Literal("one_creature_of_your_choice_in_area"),
    }),
    amount: DiceAmountSchema,
  }),
});
type MagicActionAreaSaveDamageHealingMechanicsCodec = Schema.Struct<
  typeof magicActionAreaSaveDamageHealingMechanicsFields
>;
export const MagicActionAreaSaveDamageHealingMechanicsSchema: MagicActionAreaSaveDamageHealingMechanicsCodec =
  strictStruct(magicActionAreaSaveDamageHealingMechanicsFields);

const enemyZeroHitPointTemporaryHitPointsMechanicsFields = codecFields({
  family: Schema.Literal("enemy_zero_hit_point_temporary_hit_points"),
  trigger: strictStruct({
    kind: Schema.Literal("enemy_reduced_to_zero_hit_points"),
    bySelf: Schema.Literal(true),
    byOtherWithinFeet: Schema.Literal(10),
  }),
  amount: strictStruct({
    kind: Schema.Literal("ability_modifier_plus_class_level"),
    ability: Schema.Literal("cha"),
    minimum: Schema.Literal(1),
  }),
});
type EnemyZeroHitPointTemporaryHitPointsMechanicsCodec = Schema.Struct<
  typeof enemyZeroHitPointTemporaryHitPointsMechanicsFields
>;
export const EnemyZeroHitPointTemporaryHitPointsMechanicsSchema: EnemyZeroHitPointTemporaryHitPointsMechanicsCodec =
  strictStruct(enemyZeroHitPointTemporaryHitPointsMechanicsFields);

const bonusActionDelegatedStandardActionsMechanicsFields = codecFields({
  family: Schema.Literal("bonus_action_delegated_standard_actions"),
  activationCost: strictStruct({
    kind: Schema.Literal("bonus_action"),
  }),
  sleightOfHand: strictStruct({
    abilityCheck: strictStruct({
      ability: Schema.Literal("dex"),
      skill: Schema.Literal("sleight_of_hand"),
    }),
    operations: Schema.Tuple([
      Schema.Literal("pick_lock_with_thieves_tools"),
      Schema.Literal("disarm_trap_with_thieves_tools"),
      Schema.Literal("pick_pocket"),
    ]),
  }),
  objectUse: strictStruct({
    actions: Schema.Tuple([
      strictStruct({
        action: Schema.Literal("utilize"),
      }),
      strictStruct({
        action: Schema.Literal("magic"),
        restrictedTo: Schema.Literal("magic_item_requires_magic_action"),
      }),
    ]),
  }),
});
type BonusActionDelegatedStandardActionsMechanicsCodec = Schema.Struct<
  typeof bonusActionDelegatedStandardActionsMechanicsFields
>;
export const BonusActionDelegatedStandardActionsMechanicsSchema: BonusActionDelegatedStandardActionsMechanicsCodec =
  strictStruct(bonusActionDelegatedStandardActionsMechanicsFields);

const remarkableAthleteMechanicsFields = codecFields({
  family: Schema.Literal("remarkable_athlete"),
  initiative: strictStruct({
    kind: Schema.Literal("roll_advantage"),
    roll: Schema.Literal("initiative"),
  }),
  abilityCheck: strictStruct({
    kind: Schema.Literal("roll_advantage"),
    ability: Schema.Literal("str"),
    skill: Schema.Literal("athletics"),
  }),
  criticalHitMovement: strictStruct({
    trigger: strictStruct({
      kind: Schema.Literal("score_critical_hit"),
    }),
    timing: Schema.Literal("immediately_after_trigger"),
    distance: strictStruct({
      kind: Schema.Literal("half_speed"),
    }),
    opportunityAttacks: Schema.Literal("does_not_provoke"),
  }),
});
type RemarkableAthleteMechanicsCodec = Schema.Struct<
  typeof remarkableAthleteMechanicsFields
>;
export const RemarkableAthleteMechanicsSchema: RemarkableAthleteMechanicsCodec =
  strictStruct(remarkableAthleteMechanicsFields);

const openHandTechniqueMechanicsFields = codecFields({
  family: Schema.Literal("open_hand_technique"),
  trigger: strictStruct({
    kind: Schema.Literal("hit_with_attack_granted_by"),
    resourceOptionUnitId: surfaceProjection(
      Schema.Literal("monk_monks_focus"),
      "derived-reference",
    ),
    optionId: surfaceProtocol(Schema.Literal("flurry_of_blows"), "optionId"),
  }),
  optional: Schema.Literal(true),
  effectSaveDc: strictStruct({
    kind: Schema.Literal("class_feature_ability_save_dc"),
    base: Schema.Literal(8),
    ability: Schema.Literal("wis"),
  }),
  choices: Schema.Tuple([
    strictStruct({
      id: surfaceIdentity(Schema.Literal("addle"), "id"),
      effect: strictStruct({
        kind: Schema.Literal("deny_opportunity_attacks"),
        expires: Schema.Literal("start_of_target_next_turn"),
      }),
    }),
    strictStruct({
      id: surfaceIdentity(Schema.Literal("push"), "id"),
      save: strictStruct({
        ability: Schema.Literal("str"),
      }),
      onFail: strictStruct({
        kind: Schema.Literal("push_away"),
        distanceFeet: Schema.Literal(15),
      }),
    }),
    strictStruct({
      id: surfaceIdentity(Schema.Literal("topple"), "id"),
      save: strictStruct({
        ability: Schema.Literal("dex"),
      }),
      onFail: strictStruct({
        kind: Schema.Literal("apply_condition"),
        condition: Schema.Literal("prone"),
      }),
    }),
  ]),
});
type OpenHandTechniqueMechanicsCodec = Schema.Struct<
  typeof openHandTechniqueMechanicsFields
>;
export const OpenHandTechniqueMechanicsSchema: OpenHandTechniqueMechanicsCodec =
  strictStruct(openHandTechniqueMechanicsFields);

const stunningStrikeMechanicsFields = codecFields({
  family: Schema.Literal("stunning_strike"),
  trigger: strictStruct({
    kind: Schema.Literal("hit_creature_with_monk_weapon_or_unarmed_strike"),
    usageLimit: Schema.Literal("once_per_turn"),
  }),
  optional: Schema.Literal(true),
  spends: strictStruct({
    resourceUnitId: surfaceExactDependency("monk_monks_focus", "resource-link"),
    amount: Schema.Literal(1),
  }),
  savingThrow: strictStruct({
    ability: Schema.Literal("con"),
  }),
  onFail: strictStruct({
    kind: Schema.Literal("apply_condition"),
    condition: Schema.Literal("stunned"),
    expires: Schema.Literal("start_of_source_next_turn"),
  }),
  onSuccess: strictStruct({
    speed: strictStruct({
      kind: Schema.Literal("halve"),
      expires: Schema.Literal("start_of_source_next_turn"),
    }),
    attackRoll: strictStruct({
      mode: Schema.Literal("advantage"),
      appliesTo: Schema.Literals([
        "next_attack_roll_against_target_before_expiration",
      ]),
    }),
  }),
});
type StunningStrikeMechanicsCodec = Schema.Struct<
  typeof stunningStrikeMechanicsFields
>;
export const StunningStrikeMechanicsSchema: StunningStrikeMechanicsCodec =
  strictStruct(stunningStrikeMechanicsFields);

const CunningStrikeDieCostSchema = strictStruct({
  kind: Schema.Literal("sneak_attack_damage_dice"),
  dice: Schema.Literal(1),
  dieSize: Schema.Literal(6),
});

const CUNNING_STRIKE_POISON_OPTION_SELECTION_ID = "poison";
const CUNNING_STRIKE_TRIP_OPTION_SELECTION_ID = "trip";
const CUNNING_STRIKE_WITHDRAW_OPTION_SELECTION_ID = "withdraw";

export const CUNNING_STRIKE_OPTION_SELECTION_IDS = [
  CUNNING_STRIKE_POISON_OPTION_SELECTION_ID,
  CUNNING_STRIKE_TRIP_OPTION_SELECTION_ID,
  CUNNING_STRIKE_WITHDRAW_OPTION_SELECTION_ID,
] as const;

const cunningStrikeMechanicsFields = codecFields({
  family: Schema.Literal("cunning_strike"),
  trigger: strictStruct({
    kind: Schema.Literal("deal_sneak_attack_damage"),
    sourceUnitId: surfaceExactDependency(
      "rogue_sneak_attack",
      "unit-reference",
    ),
  }),
  choice: strictStruct({
    kind: Schema.Literal("choose_one"),
    maxOptions: Schema.Literal(1),
  }),
  effectSaveDc: strictStruct({
    kind: Schema.Literal("class_feature_ability_save_dc"),
    base: Schema.Literal(8),
    ability: Schema.Literal("dex"),
  }),
  options: Schema.Tuple([
    strictStruct({
      id: surfaceIdentity(
        Schema.Literal(CUNNING_STRIKE_POISON_OPTION_SELECTION_ID),
        "id",
      ),
      cost: CunningStrikeDieCostSchema,
      requires: strictStruct({
        kind: Schema.Literal("equipment_on_person"),
        equipment: strictStruct({
          kind: Schema.Literal("tool"),
          toolId: surfaceProjection(
            Schema.Literal("poisoners_kit"),
            "derived-reference",
          ),
        }),
      }),
      save: strictStruct({
        ability: Schema.Literal("con"),
      }),
      onFail: strictStruct({
        kind: Schema.Literal("apply_condition"),
        condition: Schema.Literal("poisoned"),
        duration: strictStruct({
          amount: Schema.Literal(1),
          unit: Schema.Literal("minute"),
        }),
        repeatSave: strictStruct({
          cadence: Schema.Literal("end_of_target_turn"),
          onSuccess: Schema.Literal("end_condition"),
        }),
      }),
    }),
    strictStruct({
      id: surfaceIdentity(
        Schema.Literal(CUNNING_STRIKE_TRIP_OPTION_SELECTION_ID),
        "id",
      ),
      cost: CunningStrikeDieCostSchema,
      target: strictStruct({
        maxSize: Schema.Literal("large"),
      }),
      save: strictStruct({
        ability: Schema.Literal("dex"),
      }),
      onFail: strictStruct({
        kind: Schema.Literal("apply_condition"),
        condition: Schema.Literal("prone"),
      }),
    }),
    strictStruct({
      id: surfaceIdentity(
        Schema.Literal(CUNNING_STRIKE_WITHDRAW_OPTION_SELECTION_ID),
        "id",
      ),
      cost: CunningStrikeDieCostSchema,
      movement: strictStruct({
        timing: Schema.Literal("immediately_after_attack"),
        distance: strictStruct({
          kind: Schema.Literal("half_speed"),
        }),
        opportunityAttacks: Schema.Literal("does_not_provoke"),
      }),
    }),
  ]),
});
type CunningStrikeMechanicsCodec = Schema.Struct<
  typeof cunningStrikeMechanicsFields
>;
export const CunningStrikeMechanicsSchema: CunningStrikeMechanicsCodec =
  strictStruct(cunningStrikeMechanicsFields);

const brutalStrikeMechanicsFields = codecFields({
  family: Schema.Literal("brutal_strike"),
  trigger: strictStruct({
    kind: Schema.Literal("reckless_attack_strength_attack_hit"),
    prerequisiteUnitId: surfaceDependency(
      Schema.Literal("barbarian_reckless_attack"),
      "unit-reference",
    ),
    timing: Schema.Literal("on_your_turn"),
    advantageForgone: Schema.Literal(true),
    attackMustNotHaveDisadvantage: Schema.Literal(true),
  }),
  damage: strictStruct({
    kind: Schema.Literal("add_attack_damage_dice"),
    dice: strictStruct({
      dice: Schema.Literal(1),
      dieSize: Schema.Literal(10),
    }),
    damageType: Schema.Literal("same_as_attack"),
  }),
  optionChoice: strictStruct({
    kind: Schema.Literal("choose_one"),
    maxOptions: Schema.Literal(1),
  }),
  options: Schema.Tuple([
    strictStruct({
      id: surfaceIdentity(Schema.Literal("forceful_blow"), "id"),
      target: strictStruct({
        kind: Schema.Literal("hit_target"),
      }),
      forcedMovement: strictStruct({
        kind: Schema.Literal("push"),
        feet: Schema.Literal(15),
        direction: Schema.Literal("straight_away_from_you"),
      }),
      selfMovement: strictStruct({
        kind: Schema.Literal("move_toward_target"),
        distance: strictStruct({ kind: Schema.Literal("half_speed") }),
        opportunityAttacks: Schema.Literal("does_not_provoke"),
      }),
    }),
    strictStruct({
      id: surfaceIdentity(Schema.Literal("hamstring_blow"), "id"),
      target: strictStruct({
        kind: Schema.Literal("hit_target"),
      }),
      speedPenalty: strictStruct({
        feet: Schema.Literal(15),
        until: Schema.Literal("start_of_your_next_turn"),
        stacking: Schema.Literal("most_recent_only"),
      }),
    }),
  ]),
});
type BrutalStrikeMechanicsCodec = Schema.Struct<
  typeof brutalStrikeMechanicsFields
>;
export const BrutalStrikeMechanicsSchema: BrutalStrikeMechanicsCodec =
  strictStruct(brutalStrikeMechanicsFields);

const indomitableMechanicsFields = codecFields({
  family: Schema.Literal("failed_saving_throw_reroll"),
  trigger: strictStruct({
    kind: Schema.Literal("failed_saving_throw"),
  }),
  reroll: strictStruct({
    mustUseNewRoll: Schema.Literal(true),
    bonus: strictStruct({
      kind: Schema.Literal("class_level"),
      className: Schema.Literal("fighter"),
    }),
  }),
  resource: strictStruct({
    kind: Schema.Literal("use_count"),
    cap: strictStruct({
      kind: Schema.Literal("threshold_tiers"),
      axis: Schema.Literal("class"),
      base: Schema.Literal(1),
      tiers: Schema.Tuple([
        strictStruct({ atLevel: Schema.Literal(13), value: Schema.Literal(2) }),
        strictStruct({ atLevel: Schema.Literal(17), value: Schema.Literal(3) }),
      ]),
    }),
  }),
  resetCadence: strictStruct({
    kind: Schema.Literal("long_rest"),
  }),
});
type IndomitableMechanicsCodec = Schema.Struct<
  typeof indomitableMechanicsFields
>;
export const IndomitableMechanicsSchema: IndomitableMechanicsCodec =
  strictStruct(indomitableMechanicsFields);

const tacticalMasterMechanicsFields = codecFields({
  family: Schema.Literal("weapon_mastery_property_replacement"),
  trigger: strictStruct({
    kind: Schema.Literal("attack_with_weapon_mastery_property_you_can_use"),
  }),
  replacement: strictStruct({
    timing: Schema.Literal("for_that_attack"),
    chooseOne: Schema.Tuple([
      Schema.Literal("push"),
      Schema.Literal("sap"),
      Schema.Literal("slow"),
    ]),
  }),
});
type TacticalMasterMechanicsCodec = Schema.Struct<
  typeof tacticalMasterMechanicsFields
>;
export const TacticalMasterMechanicsSchema: TacticalMasterMechanicsCodec =
  strictStruct(tacticalMasterMechanicsFields);

const abjureFoesMechanicsFields = codecFields({
  family: Schema.Literal("abjure_foes"),
  activationCost: strictStruct({
    kind: Schema.Literal("standard_action"),
    action: Schema.Literal("magic"),
  }),
  spends: ReferencedResourceSpendSchema,
  targetSelection: strictStruct({
    kind: Schema.Literal("visible_creatures_within_range"),
    rangeFeet: Schema.Literal(60),
    count: strictStruct({
      kind: Schema.Literal("ability_modifier"),
      ability: Schema.Literal("cha"),
      minimum: Schema.Literal(1),
    }),
  }),
  save: strictStruct({
    ability: Schema.Literal("wis"),
    dc: strictStruct({
      kind: Schema.Literal("class_spellcasting_spell_save_dc"),
    }),
  }),
  onFail: strictStruct({
    kind: Schema.Literal("apply_condition"),
    condition: Schema.Literal("frightened"),
    duration: strictStruct({
      amount: Schema.Literal(1),
      unit: Schema.Literal("minute"),
      endsOn: Schema.Tuple([Schema.Literal("target_takes_any_damage")]),
    }),
    turnRestriction: strictStruct({
      kind: Schema.Literal("choose_only_one"),
      options: Schema.Tuple([
        Schema.Literal("move"),
        Schema.Literal("action"),
        Schema.Literal("bonus_action"),
      ]),
    }),
  }),
});
type AbjureFoesMechanicsCodec = Schema.Struct<typeof abjureFoesMechanicsFields>;
export const AbjureFoesMechanicsSchema: AbjureFoesMechanicsCodec = strictStruct(
  abjureFoesMechanicsFields,
);

/* v8 ignore start -- @preserve -- declarative mechanics-schema construction initializes before full-suite V8 attribution; the canonical Monk feature is decoded by the catalog tests */
const acrobaticMovementMechanicsFields = codecFields({
  family: Schema.Literal("acrobatic_movement"),
  condition: EquipmentPredicateSchema,
  movement: strictStruct({
    timing: Schema.Literal("on_your_turn"),
    verticalSurfaces: strictStruct({
      path: Schema.Literal("along_vertical_surfaces"),
      withoutFallingDuringMovement: Schema.Literal(true),
    }),
    liquids: strictStruct({
      path: Schema.Literal("across_liquids"),
      withoutFallingDuringMovement: Schema.Literal(true),
    }),
  }),
});
type AcrobaticMovementMechanicsCodec = Schema.Struct<
  typeof acrobaticMovementMechanicsFields
>;
export const AcrobaticMovementMechanicsSchema: AcrobaticMovementMechanicsCodec =
  strictStruct(acrobaticMovementMechanicsFields);
/* v8 ignore stop -- @preserve */

const supremeSneakMechanicsFields = codecFields({
  family: Schema.Literal("cunning_strike_option_grant"),
  sourceUnitId: surfaceExactDependency(
    "rogue_cunning_strike",
    "unit-reference",
  ),
  option: strictStruct({
    id: surfaceIdentity(Schema.Literal("stealth_attack"), "id"),
    displayName: surfaceIdentity(
      Schema.Literal("Stealth Attack"),
      "displayName",
    ),
    cost: CunningStrikeDieCostSchema,
    prerequisite: strictStruct({
      kind: Schema.Literal("hide_action_invisible_condition"),
    }),
    effect: strictStruct({
      kind: Schema.Literal("suppress_attack_end_of_invisible_condition"),
      conditionSource: Schema.Literal("hide_action"),
      ifTurnEndsBehindCover: Schema.Tuple([
        Schema.Literal("three_quarters"),
        Schema.Literal("total"),
      ]),
    }),
  }),
});
type SupremeSneakMechanicsCodec = Schema.Struct<
  typeof supremeSneakMechanicsFields
>;
export const SupremeSneakMechanicsSchema: SupremeSneakMechanicsCodec =
  strictStruct(supremeSneakMechanicsFields);

const sacredWeaponMechanicsFields = codecFields({
  family: Schema.Literal("sacred_weapon"),
  activationCost: strictStruct({
    kind: Schema.Literal("standard_action"),
    action: Schema.Literal("attack"),
  }),
  spends: strictStruct({
    resourceUnitId: surfaceExactDependency(
      "paladin_channel_divinity",
      "resource-link",
    ),
    amount: Schema.Literal(1),
  }),
  target: strictStruct({
    kind: Schema.Literal("held_melee_weapon"),
  }),
  duration: strictStruct({
    unit: Schema.Literal("minute"),
    amount: Schema.Literal(10),
    endsOn: Schema.Tuple([
      Schema.Literal("use_feature_again"),
      Schema.Literal("dismiss_no_action"),
      Schema.Literal("not_carrying_weapon"),
    ]),
  }),
  attackRollBonus: strictStruct({
    kind: Schema.Literal("ability_modifier"),
    ability: Schema.Literal("cha"),
    minimum: Schema.Literal(1),
    appliesTo: Schema.Literal("imbued_weapon_attack_rolls"),
  }),
  hitDamageType: strictStruct({
    choice: Schema.Tuple([Schema.Literal("normal"), Schema.Literal("radiant")]),
  }),
  light: strictStruct({
    brightRadiusFeet: Schema.Literal(20),
    dimAdditionalFeet: Schema.Literal(20),
  }),
});
type SacredWeaponMechanicsCodec = Schema.Struct<
  typeof sacredWeaponMechanicsFields
>;
export const SacredWeaponMechanicsSchema: SacredWeaponMechanicsCodec =
  strictStruct(sacredWeaponMechanicsFields);

/* v8 ignore start -- @preserve -- declarative mechanics-schema construction initializes before V8 attribution; canonical Hunter's Prey records are decoded by the catalog tests */
const huntersPreyMechanicsFields = codecFields({
  family: Schema.Literal("hunters_prey"),
  choice: strictStruct({
    kind: Schema.Literal("choose_one"),
    replaceOn: Schema.Literal("short_or_long_rest"),
  }),
  options: Schema.Tuple([
    strictStruct({
      id: surfaceIdentity(Schema.Literal("colossus_slayer"), "id"),
      trigger: strictStruct({
        kind: Schema.Literal("hit_creature_with_weapon"),
      }),
      targetPredicate: Schema.Literal("missing_any_hit_points"),
      usageLimit: strictStruct({ kind: Schema.Literal("once_per_turn") }),
      damage: strictStruct({
        kind: Schema.Literal("add_attack_damage_dice"),
        dice: strictStruct({
          dice: Schema.Literal(1),
          dieSize: Schema.Literal(8),
        }),
        damageType: Schema.Literal("same_as_attack"),
      }),
    }),
    strictStruct({
      id: surfaceIdentity(Schema.Literal("horde_breaker"), "id"),
      trigger: strictStruct({
        kind: Schema.Literal("make_weapon_attack"),
      }),
      usageLimit: strictStruct({ kind: Schema.Literal("once_per_turn") }),
      extraAttack: strictStruct({
        weapon: Schema.Literal("same_weapon"),
        target: strictStruct({
          kind: Schema.Literal("different_creature_near_original_target"),
          withinFeetOfOriginalTarget: Schema.Literal(5),
          withinWeaponRange: Schema.Literal(true),
          notAttackedThisTurn: Schema.Literal(true),
        }),
      }),
    }),
  ]),
});
type HuntersPreyMechanicsCodec = Schema.Struct<
  typeof huntersPreyMechanicsFields
>;
export const HuntersPreyMechanicsSchema: HuntersPreyMechanicsCodec =
  strictStruct(huntersPreyMechanicsFields);
/* v8 ignore stop -- @preserve */

const steadyAimMechanicsFields = codecFields({
  family: Schema.Literal("steady_aim"),
  activationCost: strictStruct({
    kind: Schema.Literal("bonus_action"),
  }),
  precondition: strictStruct({
    kind: Schema.Literal("no_movement_this_turn"),
  }),
  attackRoll: strictStruct({
    mode: Schema.Literal("advantage"),
    appliesTo: Schema.Literal("next_attack_roll_current_turn"),
  }),
  speed: strictStruct({
    kind: Schema.Literal("set_to_zero"),
    until: Schema.Literal("end_of_current_turn"),
  }),
});
type SteadyAimMechanicsCodec = Schema.Struct<typeof steadyAimMechanicsFields>;
export const SteadyAimMechanicsSchema: SteadyAimMechanicsCodec = strictStruct(
  steadyAimMechanicsFields,
);

const potentCantripMechanicsFields = codecFields({
  family: Schema.Literal("potent_cantrip"),
  trigger: strictStruct({
    kind: Schema.Literal("cast_cantrip_at_creature"),
    cantripKind: Schema.Literal("damaging"),
  }),
  outcomes: Schema.Tuple([
    Schema.Literal("miss_with_attack_roll"),
    Schema.Literal("target_succeeds_saving_throw"),
  ]),
  damage: strictStruct({
    kind: Schema.Literal("half_cantrip_damage_if_any"),
  }),
  additionalEffect: Schema.Literal("none"),
});
type PotentCantripMechanicsCodec = Schema.Struct<
  typeof potentCantripMechanicsFields
>;
export const PotentCantripMechanicsSchema: PotentCantripMechanicsCodec =
  strictStruct(potentCantripMechanicsFields);

const weaponMasteryChoiceMechanicsFields = codecFields({
  family: Schema.Literal("weapon_mastery_choice"),
  choose: Schema.Union([PositiveIntegerSchema, ClassLevelChoiceCountSchema]),
  eligibleWeapons: Schema.Struct({
    kind: Schema.Literal("class_proficient_weapons"),
    usage: exactOptional(WeaponUsageSchema),
  }),
  changeOn: Schema.Struct({
    kind: Schema.Literal("long_rest"),
    count: PositiveIntegerSchema,
  }),
});
type WeaponMasteryChoiceMechanicsCodec = Schema.Struct<
  typeof weaponMasteryChoiceMechanicsFields
>;
export const WeaponMasteryChoiceMechanicsSchema: WeaponMasteryChoiceMechanicsCodec =
  Schema.Struct(weaponMasteryChoiceMechanicsFields);

class PassiveMechanicsFields {
  readonly family = Schema.Literal("passive");
  readonly condition = exactOptional(EquipmentPredicateSchema);
  readonly suppressedBy = exactOptional(
    Schema.NonEmptyArray(PassiveSuppressorSchema),
  );
  readonly grants: Schema.withDecodingDefaultTypeKey<
    Schema.$Array<typeof EffectAtomSchema>,
    never
  > = Schema.Array(EffectAtomSchema).pipe(
    Schema.withDecodingDefaultTypeKey(Effect.sync(() => [])),
  );
  readonly operations = exactOptional(
    Schema.NonEmptyArray(PassiveOperationSchema),
  );
}
const passiveMechanicsFields = codecFields({ ...new PassiveMechanicsFields() });
type PassiveMechanicsCodec = Schema.Struct<typeof passiveMechanicsFields>;
export type PassiveMechanics = Schema.Schema.Type<PassiveMechanicsCodec>;
export const PassiveMechanicsSchema: PassiveMechanicsCodec = Schema.Struct(
  passiveMechanicsFields,
);

const preparedSpellListExpansionMechanicsFields = codecFields({
  family: Schema.Literal("prepared_spell_list_expansion"),
  baseSpellList: Schema.Literal("bard"),
  additionalEligibleSpellLists: Schema.Tuple([
    Schema.Literal("cleric"),
    Schema.Literal("druid"),
    Schema.Literal("wizard"),
  ]),
});
type PreparedSpellListExpansionMechanicsCodec = Schema.Struct<
  typeof preparedSpellListExpansionMechanicsFields
>;
export const PreparedSpellListExpansionMechanicsSchema: PreparedSpellListExpansionMechanicsCodec =
  strictStruct(preparedSpellListExpansionMechanicsFields);

const spellDamageRollAbilityModifierMechanicsFields = codecFields({
  family: Schema.Literal("spell_damage_roll_ability_modifier"),
  spellSourceClassName: Schema.Literal("wizard"),
  school: Schema.Literal("evocation"),
  ability: Schema.Literal("int"),
  damageRollCount: Schema.Literal(1),
});
type SpellDamageRollAbilityModifierMechanicsCodec = Schema.Struct<
  typeof spellDamageRollAbilityModifierMechanicsFields
>;
export const SpellDamageRollAbilityModifierMechanicsSchema: SpellDamageRollAbilityModifierMechanicsCodec =
  strictStruct(spellDamageRollAbilityModifierMechanicsFields);

const combatTurnStartHeroicInspirationMechanicsFields = codecFields({
  family: Schema.Literal("combat_turn_start_heroic_inspiration"),
  trigger: strictStruct({
    kind: Schema.Literal("start_turn"),
    encounter: Schema.Literal("combat"),
    requiresMissingHeroicInspiration: Schema.Literal(true),
  }),
  grant: strictStruct({ kind: Schema.Literal("heroic_inspiration") }),
});
type CombatTurnStartHeroicInspirationMechanicsCodec = Schema.Struct<
  typeof combatTurnStartHeroicInspirationMechanicsFields
>;
export const CombatTurnStartHeroicInspirationMechanicsSchema: CombatTurnStartHeroicInspirationMechanicsCodec =
  strictStruct(combatTurnStartHeroicInspirationMechanicsFields);

/* v8 ignore start -- @preserve -- these union declarations only assemble already-tested mechanics schemas during collection */
const classFeatureMechanicsMembers = codecMembers(
  ClassFeatureComponentMechanicsSchema,
  CompositeClassFeatureMechanicsSchema,
  FeatureChoiceMechanicsSchema,
  ClassFeatureAcquisitionChoiceMechanicsSchema,
  ClassFeatureResourceContainerMechanicsSchema,
  ClassFeatureResourcePoolMechanicsSchema,
  SorcererMetamagicMechanicsSchema,
  ClassSpellcastingProjectionMechanicsSchema,
  WeaponMasteryChoiceMechanicsSchema,
  SpellbookRitualAccessMechanicsSchema,
  RestSpellSlotRecoveryMechanicsSchema,
  SorcererSorcerousRestorationMechanicsSchema,
  WizardSpellbookLearningMechanicsSchema,
  DruidWildCompanionSpellCastMechanicsSchema,
  WarlockPactSlotRecoveryMechanicsSchema,
  FailedAbilityCheckResourceBoostMechanicsSchema,
  MonkInitiativeFocusRecoveryMechanicsSchema,
  SpellSlotHealingModifierMechanicsSchema,
  MagicActionHealingPoolMechanicsSchema,
  MagicActionAreaSaveDamageHealingMechanicsSchema,
  EnemyZeroHitPointTemporaryHitPointsMechanicsSchema,
  BonusActionDelegatedStandardActionsMechanicsSchema,
  RemarkableAthleteMechanicsSchema,
  OpenHandTechniqueMechanicsSchema,
  StunningStrikeMechanicsSchema,
  CunningStrikeMechanicsSchema,
  BrutalStrikeMechanicsSchema,
  IndomitableMechanicsSchema,
  TacticalMasterMechanicsSchema,
  AbjureFoesMechanicsSchema,
  AcrobaticMovementMechanicsSchema,
  SupremeSneakMechanicsSchema,
  SacredWeaponMechanicsSchema,
  HuntersPreyMechanicsSchema,
  SteadyAimMechanicsSchema,
  PotentCantripMechanicsSchema,
  PreparedSpellListExpansionMechanicsSchema,
  SpellDamageRollAbilityModifierMechanicsSchema,
  CombatTurnStartHeroicInspirationMechanicsSchema,
);
type ClassFeatureMechanicsCodec = Schema.Union<
  typeof classFeatureMechanicsMembers
>;
export type ClassFeatureMechanics =
  Schema.Schema.Type<ClassFeatureMechanicsCodec>;
export const ClassFeatureMechanicsSchema: ClassFeatureMechanicsCodec =
  Schema.Union(classFeatureMechanicsMembers);

const classGeneralFeatureMechanicsMembers = codecMembers(
  ClassFeatureComponentMechanicsSchema,
  CompositeClassFeatureMechanicsSchema,
  ClassFeatureAcquisitionChoiceMechanicsSchema,
  ClassFeatureResourceContainerMechanicsSchema,
  ClassFeatureResourcePoolMechanicsSchema,
  WeaponMasteryChoiceMechanicsSchema,
  BonusActionDelegatedStandardActionsMechanicsSchema,
);
type ClassGeneralFeatureMechanicsCodec = Schema.Union<
  typeof classGeneralFeatureMechanicsMembers
>;
export type ClassGeneralFeatureMechanics =
  Schema.Schema.Type<ClassGeneralFeatureMechanicsCodec>;
export const ClassGeneralFeatureMechanicsSchema: ClassGeneralFeatureMechanicsCodec =
  Schema.Union(classGeneralFeatureMechanicsMembers);

const bardClassFeatureMechanicsMembers = codecMembers(
  ClassGeneralFeatureMechanicsSchema,
  PreparedSpellListExpansionMechanicsSchema,
);
type BardClassFeatureMechanicsCodec = Schema.Union<
  typeof bardClassFeatureMechanicsMembers
>;
export type BardClassFeatureMechanics =
  Schema.Schema.Type<BardClassFeatureMechanicsCodec>;
export const BardClassFeatureMechanicsSchema: BardClassFeatureMechanicsCodec =
  Schema.Union(bardClassFeatureMechanicsMembers);

const clericClassFeatureMechanicsMembers = codecMembers(
  ClassGeneralFeatureMechanicsSchema,
  SpellSlotHealingModifierMechanicsSchema,
  MagicActionHealingPoolMechanicsSchema,
);
type ClericClassFeatureMechanicsCodec = Schema.Union<
  typeof clericClassFeatureMechanicsMembers
>;
export type ClericClassFeatureMechanics =
  Schema.Schema.Type<ClericClassFeatureMechanicsCodec>;
export const ClericClassFeatureMechanicsSchema: ClericClassFeatureMechanicsCodec =
  Schema.Union(clericClassFeatureMechanicsMembers);

const druidClassFeatureMechanicsMembers = codecMembers(
  ClassGeneralFeatureMechanicsSchema,
  DruidWildCompanionSpellCastMechanicsSchema,
  MagicActionAreaSaveDamageHealingMechanicsSchema,
);
type DruidClassFeatureMechanicsCodec = Schema.Union<
  typeof druidClassFeatureMechanicsMembers
>;
export type DruidClassFeatureMechanics =
  Schema.Schema.Type<DruidClassFeatureMechanicsCodec>;
export const DruidClassFeatureMechanicsSchema: DruidClassFeatureMechanicsCodec =
  Schema.Union(druidClassFeatureMechanicsMembers);

const wizardClassFeatureMechanicsMembers = codecMembers(
  ClassGeneralFeatureMechanicsSchema,
  SpellbookRitualAccessMechanicsSchema,
  RestSpellSlotRecoveryMechanicsSchema,
  WizardSpellbookLearningMechanicsSchema,
  PotentCantripMechanicsSchema,
  SpellDamageRollAbilityModifierMechanicsSchema,
);
type WizardClassFeatureMechanicsCodec = Schema.Union<
  typeof wizardClassFeatureMechanicsMembers
>;
export type WizardClassFeatureMechanics =
  Schema.Schema.Type<WizardClassFeatureMechanicsCodec>;
export const WizardClassFeatureMechanicsSchema: WizardClassFeatureMechanicsCodec =
  Schema.Union(wizardClassFeatureMechanicsMembers);

const barbarianClassFeatureMechanicsMembers = codecMembers(
  ClassGeneralFeatureMechanicsSchema,
  BrutalStrikeMechanicsSchema,
);
type BarbarianClassFeatureMechanicsCodec = Schema.Union<
  typeof barbarianClassFeatureMechanicsMembers
>;
export type BarbarianClassFeatureMechanics =
  Schema.Schema.Type<BarbarianClassFeatureMechanicsCodec>;
export const BarbarianClassFeatureMechanicsSchema: BarbarianClassFeatureMechanicsCodec =
  Schema.Union(barbarianClassFeatureMechanicsMembers);

const fighterClassFeatureMechanicsMembers = codecMembers(
  ClassGeneralFeatureMechanicsSchema,
  FailedAbilityCheckResourceBoostMechanicsSchema,
  IndomitableMechanicsSchema,
  TacticalMasterMechanicsSchema,
  RemarkableAthleteMechanicsSchema,
  CombatTurnStartHeroicInspirationMechanicsSchema,
);
type FighterClassFeatureMechanicsCodec = Schema.Union<
  typeof fighterClassFeatureMechanicsMembers
>;
export type FighterClassFeatureMechanics =
  Schema.Schema.Type<FighterClassFeatureMechanicsCodec>;
export const FighterClassFeatureMechanicsSchema: FighterClassFeatureMechanicsCodec =
  Schema.Union(fighterClassFeatureMechanicsMembers);

const monkClassFeatureMechanicsMembers = codecMembers(
  ClassGeneralFeatureMechanicsSchema,
  MonkInitiativeFocusRecoveryMechanicsSchema,
  AcrobaticMovementMechanicsSchema,
  OpenHandTechniqueMechanicsSchema,
  StunningStrikeMechanicsSchema,
);
type MonkClassFeatureMechanicsCodec = Schema.Union<
  typeof monkClassFeatureMechanicsMembers
>;
export type MonkClassFeatureMechanics =
  Schema.Schema.Type<MonkClassFeatureMechanicsCodec>;
export const MonkClassFeatureMechanicsSchema: MonkClassFeatureMechanicsCodec =
  Schema.Union(monkClassFeatureMechanicsMembers);

const paladinClassFeatureMechanicsMembers = codecMembers(
  ClassGeneralFeatureMechanicsSchema,
  AbjureFoesMechanicsSchema,
  SacredWeaponMechanicsSchema,
);
type PaladinClassFeatureMechanicsCodec = Schema.Union<
  typeof paladinClassFeatureMechanicsMembers
>;
export type PaladinClassFeatureMechanics =
  Schema.Schema.Type<PaladinClassFeatureMechanicsCodec>;
export const PaladinClassFeatureMechanicsSchema: PaladinClassFeatureMechanicsCodec =
  Schema.Union(paladinClassFeatureMechanicsMembers);

const rangerClassFeatureMechanicsMembers = codecMembers(
  ClassGeneralFeatureMechanicsSchema,
  HuntersPreyMechanicsSchema,
);
type RangerClassFeatureMechanicsCodec = Schema.Union<
  typeof rangerClassFeatureMechanicsMembers
>;
export type RangerClassFeatureMechanics =
  Schema.Schema.Type<RangerClassFeatureMechanicsCodec>;
export const RangerClassFeatureMechanicsSchema: RangerClassFeatureMechanicsCodec =
  Schema.Union(rangerClassFeatureMechanicsMembers);

const rogueClassFeatureMechanicsMembers = codecMembers(
  ClassGeneralFeatureMechanicsSchema,
  CunningStrikeMechanicsSchema,
  SupremeSneakMechanicsSchema,
  SteadyAimMechanicsSchema,
);
type RogueClassFeatureMechanicsCodec = Schema.Union<
  typeof rogueClassFeatureMechanicsMembers
>;
export type RogueClassFeatureMechanics =
  Schema.Schema.Type<RogueClassFeatureMechanicsCodec>;
export const RogueClassFeatureMechanicsSchema: RogueClassFeatureMechanicsCodec =
  Schema.Union(rogueClassFeatureMechanicsMembers);

const sorcererClassFeatureMechanicsMembers = codecMembers(
  ClassGeneralFeatureMechanicsSchema,
  SorcererMetamagicMechanicsSchema,
  SorcererSorcerousRestorationMechanicsSchema,
);
type SorcererClassFeatureMechanicsCodec = Schema.Union<
  typeof sorcererClassFeatureMechanicsMembers
>;
export type SorcererClassFeatureMechanics =
  Schema.Schema.Type<SorcererClassFeatureMechanicsCodec>;
export const SorcererClassFeatureMechanicsSchema: SorcererClassFeatureMechanicsCodec =
  Schema.Union(sorcererClassFeatureMechanicsMembers);

const warlockClassFeatureMechanicsMembers = codecMembers(
  ClassGeneralFeatureMechanicsSchema,
  FeatureChoiceMechanicsSchema,
  ClassSpellcastingProjectionMechanicsSchema,
  WarlockPactSlotRecoveryMechanicsSchema,
  EnemyZeroHitPointTemporaryHitPointsMechanicsSchema,
);
type WarlockClassFeatureMechanicsCodec = Schema.Union<
  typeof warlockClassFeatureMechanicsMembers
>;
export type WarlockClassFeatureMechanics =
  Schema.Schema.Type<WarlockClassFeatureMechanicsCodec>;
export const WarlockClassFeatureMechanicsSchema: WarlockClassFeatureMechanicsCodec =
  Schema.Union(warlockClassFeatureMechanicsMembers);
/* v8 ignore stop -- @preserve */

export const MasteryTriggerSchema = Schema.Union([
  strictStruct({ kind: Schema.Literal("weapon_hit") }),
  strictStruct({ kind: Schema.Literal("weapon_hit_melee_only") }),
  strictStruct({ kind: Schema.Literal("weapon_hit_with_damage") }),
]);

export const SneakAttackDamageRiderTriggerSchema = strictStruct({
  kind: Schema.Literal("hit_with_attack_roll"),
  weaponFilter: Schema.Literal("finesse_or_ranged"),
  eligibility: Schema.Literals([
    "advantage_or_non_incapacitated_ally_within_5ft_of_target_without_disadvantage",
  ]),
});

/* v8 ignore next -- @preserve -- this declarative schema factory is initialized during module collection; canonical Frenzy mechanics are decoded by catalog tests */
export const FrenzyAttackDamageRiderTriggerSchema = strictStruct({
  kind: Schema.Literal("hit_with_attack_roll"),
  attackFilter: Schema.Literal("strength_based_attack"),
  prerequisite: Schema.Literals([
    "rage_active_and_reckless_attack_used_this_turn",
  ]),
  hitLimit: Schema.Literal("first_target_hit_this_turn"),
});

export const AttackDamageRiderTriggerSchema = Schema.Union([
  SneakAttackDamageRiderTriggerSchema,
  FrenzyAttackDamageRiderTriggerSchema,
]);

export const WeaponDamageDiceRerollTriggerSchema = strictStruct({
  kind: Schema.Literal("weapon_hit"),
});

export const ClassLevelDamageDiceSchema = strictStruct({
  kind: Schema.Literal("class_level_table"),
  dieSize: PositiveIntegerSchema,
  dice: Schema.NonEmptyArray(
    strictStruct({
      atLevel: PositiveIntegerSchema,
      count: PositiveIntegerSchema,
    }),
  ),
});

/* v8 ignore start -- @preserve -- these rider schema declarations initialize during collection; canonical Rage and attack-rider records are decoded by catalog tests */
export const RageDamageBonusDiceSchema = strictStruct({
  kind: Schema.Literal("rage_damage_bonus"),
  dieSize: Schema.Literal(6),
});

export const AddAttackDamageDiceRiderSchema = strictStruct({
  kind: Schema.Literal("add_attack_damage_dice"),
  dice: Schema.Union([ClassLevelDamageDiceSchema, RageDamageBonusDiceSchema]),
  damageType: Schema.Literal("same_as_attack"),
});
/* v8 ignore stop -- @preserve */

export const SecondaryTargetSelectionSchema = strictStruct({
  kind: Schema.Literal("adjacent_to_primary"),
  constraint: Schema.Literal("within_5ft_and_reach"),
});

export const GrantWeaponAttackRiderSchema = strictStruct({
  kind: Schema.Literal("grant_weapon_attack"),
  attackKind: Schema.Literal("melee_weapon_attack"),
  secondaryTarget: SecondaryTargetSelectionSchema,
  onHit: strictStruct({
    kind: Schema.Literal("weapon_damage"),
    abilityModifier: Schema.Literal("negative_only"),
  }),
});

export const ModifyRollAdvantageRiderSchema = Schema.Struct({
  kind: Schema.Literal("modify_roll_advantage"),
  mode: Schema.Literals(["advantage", "disadvantage"]),
  on: Schema.Array(RollKindSchema),
  count: Schema.Number,
  expiresOn: RiderExpirySchema,
});

/* v8 ignore start -- @preserve -- this declarative save-result schema initializes during collection; canonical mastery records decode both admitted results */
export const SaveGateRiderResultSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("apply_condition"),
    condition: ConditionSchema,
  }),
  strictStruct({ kind: Schema.Literal("none") }),
]);
/* v8 ignore stop -- @preserve */

export const SaveGateRiderSchema = Schema.Struct({
  kind: Schema.Literal("save_gate"),
  ability: AbilitySchema,
  dc: DcSourceSchema,
  onFail: SaveGateRiderResultSchema,
  onSuccess: SaveGateRiderResultSchema,
});

export const SapMasteryEffectSchema = strictStruct({
  kind: Schema.Literal("modify_roll_advantage"),
  mode: Schema.Literal("disadvantage"),
  on: Schema.Tuple([Schema.Literal("attack_roll")]),
  count: Schema.Literal(1),
  expiresOn: strictStruct({
    kind: Schema.Literal("target_uses_or_turn_start"),
  }),
});

export const ToppleMasteryEffectSchema = strictStruct({
  kind: Schema.Literal("save_gate"),
  ability: Schema.Literal("con"),
  dc: strictStruct({
    kind: Schema.Literal("weapon_attack_dc"),
    base: Schema.Literal(8),
  }),
  onFail: strictStruct({
    kind: Schema.Literal("apply_condition"),
    condition: Schema.Literal("prone"),
  }),
  onSuccess: strictStruct({ kind: Schema.Literal("none") }),
});

/* v8 ignore start -- @preserve -- these declarative mastery schema factories initialize during module collection; canonical Push, Slow, and Vex records are decoded by catalog tests */
export const PushMasteryEffectSchema = strictStruct({
  kind: Schema.Literal("push_creature"),
  maxDistanceFeet: Schema.Literal(10),
  direction: Schema.Literal("straight_away_from_self"),
  maximumTargetSize: Schema.Literal("large"),
});

export const SlowMasteryEffectSchema = strictStruct({
  kind: Schema.Literal("speed_delta"),
  deltaFeet: Schema.Literal(-10),
  maximumReductionFeet: Schema.Literal(10),
  expiresOn: strictStruct({
    kind: Schema.Literal("start_of_attacker_next_turn"),
  }),
});

export const VexMasteryEffectSchema = strictStruct({
  kind: Schema.Literal("modify_roll_advantage"),
  mode: Schema.Literal("advantage"),
  on: Schema.Tuple([Schema.Literal("attack_roll")]),
  count: Schema.Literal(1),
  expiresOn: strictStruct({
    kind: Schema.Literal("end_of_next_turn"),
  }),
});
/* v8 ignore stop -- @preserve */

/* v8 ignore start -- @preserve -- this declarative replacement schema initializes during collection; the canonical feature record is decoded by catalog tests */
const saveDamageReplacementMechanicsFields = codecFields({
  family: Schema.Literal("save_damage_replacement"),
  trigger: Schema.Struct({
    kind: Schema.Literal("saving_throw_damage"),
    ability: AbilitySchema,
    successDamage: Schema.Literal("half_damage"),
  }),
  replacement: Schema.Struct({
    onSuccess: Schema.Literal("no_damage"),
    onFail: Schema.Literal("half_damage"),
  }),
  suppressedBy: Schema.NonEmptyArray(
    Schema.Struct({
      kind: Schema.Literal("condition"),
      condition: Schema.Literal("incapacitated"),
    }),
  ),
});
type SaveDamageReplacementMechanicsCodec = Schema.Struct<
  typeof saveDamageReplacementMechanicsFields
>;
export const SaveDamageReplacementMechanicsSchema: SaveDamageReplacementMechanicsCodec =
  Schema.Struct(saveDamageReplacementMechanicsFields);
/* v8 ignore stop -- @preserve */

const BardicInspirationDieReductionSchema = strictStruct({
  kind: Schema.Literal("bardic_inspiration_die"),
});

const ReactionAttackDamageReductionTriggerSchema = strictStruct({
  kind: Schema.Literal("hit_by_attack_roll"),
  requiresVisibleAttacker: exactOptional(Schema.Boolean),
  damageIncludes: exactOptional(Schema.NonEmptyArray(DamageTypeSchema)),
});

const ReactionAttackDamageReductionUnconditionalTriggerSchema = strictStruct({
  kind: Schema.Literal("hit_by_attack_roll"),
  requiresVisibleAttacker: exactOptional(Schema.Boolean),
});

const ReactionFallDamageReductionTriggerSchema = strictStruct({
  kind: Schema.Literal("creature_falls"),
});

const ClassLevelMultiplierReductionSchema = strictStruct({
  kind: Schema.Literal("class_level_multiplier"),
  multiplier: PositiveIntegerSchema,
});

const AttackDamageReductionZeroDamageRedirectSchema = strictStruct({
  spends: strictStruct({
    resourceUnitId: surfaceDependency(NonEmptyStringSchema, "resource-link"),
    amount: Schema.Literal(1),
  }),
  save: strictStruct({
    ability: Schema.Literal("dex"),
    dc: strictStruct({
      kind: Schema.Literal("ability_plus_proficiency"),
      base: Schema.Literal(8),
      ability: Schema.Literal("wis"),
    }),
  }),
  damage: strictStruct({
    dice: strictStruct({
      dice: Schema.Literal(2),
      dieSize: strictStruct({ kind: Schema.Literal("martial_arts_die") }),
    }),
    ability: Schema.Literal("dex"),
    damageType: strictStruct({
      kind: Schema.Literal("same_type_dealt_by_attack"),
    }),
  }),
  targetGate: strictStruct({
    melee: strictStruct({
      kind: Schema.Literal("visible_within_5_feet"),
    }),
    ranged: strictStruct({
      kind: Schema.Literal("visible_within_60_feet_without_total_cover"),
    }),
  }),
});

/* v8 ignore start -- @preserve -- this declarative reaction-modifier schema tree initializes during collection; canonical reaction-reduction records are decoded by catalog tests */
const ReactionRollOrDamageReductionModifierSchema = Schema.Union([
  strictStruct({
    kind: Schema.Literal("attack_roll_reduction"),
    trigger: strictStruct({
      kind: Schema.Literal("creature_succeeds_attack_roll"),
      rangeFeet: PositiveIntegerSchema,
      requiresVisibleCreature: Schema.Boolean,
    }),
    reduction: BardicInspirationDieReductionSchema,
  }),
  strictStruct({
    kind: Schema.Literal("ability_check_reduction"),
    trigger: strictStruct({
      kind: Schema.Literal("creature_succeeds_ability_check"),
      rangeFeet: PositiveIntegerSchema,
      requiresVisibleCreature: Schema.Boolean,
    }),
    reduction: BardicInspirationDieReductionSchema,
  }),
  strictStruct({
    kind: Schema.Literal("damage_roll_reduction"),
    trigger: strictStruct({
      kind: Schema.Literal("creature_makes_damage_roll"),
      rangeFeet: PositiveIntegerSchema,
      requiresVisibleCreature: Schema.Boolean,
    }),
    reduction: BardicInspirationDieReductionSchema,
  }),
  strictStruct({
    kind: Schema.Literal("attack_damage_reduction"),
    trigger: ReactionAttackDamageReductionUnconditionalTriggerSchema,
    reduction: Schema.Union([
      strictStruct({
        kind: Schema.Literal("half_damage"),
        rounding: Schema.Literal("down"),
      }),
    ]),
  }),
  strictStruct({
    kind: Schema.Literal("attack_damage_reduction"),
    trigger: ReactionAttackDamageReductionTriggerSchema,
    reduction: strictStruct({
      kind: Schema.Literal("dice_plus_ability_modifier_plus_class_level"),
      dice: Schema.Struct({
        dice: Schema.Literal(1),
        dieSize: Schema.Literal(10),
      }),
      ability: Schema.Literal("dex"),
    }),
    zeroDamageRedirect: AttackDamageReductionZeroDamageRedirectSchema,
  }),
  strictStruct({
    kind: Schema.Literal("fall_damage_reduction"),
    trigger: ReactionFallDamageReductionTriggerSchema,
    reduction: ClassLevelMultiplierReductionSchema,
  }),
]);

const ReactionRollOrDamageReductionModifiersSchema = Schema.NonEmptyArray(
  ReactionRollOrDamageReductionModifierSchema,
);
/* v8 ignore stop -- @preserve */

/* v8 ignore start -- @preserve -- this declarative reaction schema initializes during collection; canonical reaction-reduction features are decoded by catalog tests */
const reactionRollOrDamageReductionMechanicsMembers = codecMembers(
  strictStruct({
    family: Schema.Literal("reaction_roll_or_damage_reduction"),
    modifiers: ReactionRollOrDamageReductionModifiersSchema,
  }),
  strictStruct({
    family: Schema.Literal("reaction_roll_or_damage_reduction"),
    resource: ActivationResourceSchema,
    resetCadence: ResetCadenceSchema,
    modifiers: ReactionRollOrDamageReductionModifiersSchema,
  }),
);
type ReactionRollOrDamageReductionMechanicsCodec = Schema.Union<
  typeof reactionRollOrDamageReductionMechanicsMembers
>;
export const ReactionRollOrDamageReductionMechanicsSchema: ReactionRollOrDamageReductionMechanicsCodec =
  Schema.Union(reactionRollOrDamageReductionMechanicsMembers);
/* v8 ignore stop -- @preserve */

/* v8 ignore start -- @preserve -- this declarative reroll schema initializes during collection; the canonical reroll feature is decoded by catalog tests */
export const RerollWeaponDamageDiceRiderSchema = strictStruct({
  kind: Schema.Literal("reroll_weapon_damage_dice"),
  diceScope: Schema.Literal("weapon_damage_dice"),
  choose: Schema.Literal("either_roll"),
});
/* v8 ignore stop -- @preserve */

/* v8 ignore start -- @preserve -- these mastery schema unions initialize during collection; every canonical mastery record is decoded by catalog tests */
export const WeaponHitMasteryEffectSchema = Schema.Union([
  PushMasteryEffectSchema,
  SapMasteryEffectSchema,
  ToppleMasteryEffectSchema,
]);

export const MasteryEffectSchema = Schema.Union([
  WeaponHitMasteryEffectSchema,
  SlowMasteryEffectSchema,
  VexMasteryEffectSchema,
  GrantWeaponAttackRiderSchema,
]);
/* v8 ignore stop -- @preserve */

export const OnHitRiderEffectSchema = Schema.Union([
  MasteryEffectSchema,
  RerollWeaponDamageDiceRiderSchema,
  AddAttackDamageDiceRiderSchema,
]);

const OnHitTriggerMechanicsBaseFields = {
  family: Schema.Literal("on_hit_trigger"),
};

const OncePerTurnUsageLimitSchema = strictStruct({
  kind: Schema.Literal("once_per_turn"),
});

export const SapMasteryMechanicsSchema = strictStruct({
  ...OnHitTriggerMechanicsBaseFields,
  optional: Schema.Literal(false),
  trigger: strictStruct({ kind: Schema.Literal("weapon_hit") }),
  effect: SapMasteryEffectSchema,
});

export const PushMasteryMechanicsSchema = strictStruct({
  ...OnHitTriggerMechanicsBaseFields,
  optional: Schema.Literal(true),
  trigger: strictStruct({ kind: Schema.Literal("weapon_hit") }),
  effect: PushMasteryEffectSchema,
});

/* v8 ignore start -- @preserve -- this declarative Topple schema initializes during collection; the canonical Topple record is decoded by catalog tests */
export const ToppleMasteryMechanicsSchema = strictStruct({
  ...OnHitTriggerMechanicsBaseFields,
  optional: Schema.Literal(true),
  trigger: strictStruct({ kind: Schema.Literal("weapon_hit") }),
  effect: ToppleMasteryEffectSchema,
});
/* v8 ignore stop -- @preserve */

export const SlowMasteryMechanicsSchema = strictStruct({
  ...OnHitTriggerMechanicsBaseFields,
  optional: Schema.Literal(true),
  trigger: strictStruct({ kind: Schema.Literal("weapon_hit_with_damage") }),
  effect: SlowMasteryEffectSchema,
});

export const VexMasteryMechanicsSchema = strictStruct({
  ...OnHitTriggerMechanicsBaseFields,
  optional: Schema.Literal(false),
  trigger: strictStruct({ kind: Schema.Literal("weapon_hit_with_damage") }),
  effect: VexMasteryEffectSchema,
});

export const CleaveMasteryMechanicsSchema = strictStruct({
  ...OnHitTriggerMechanicsBaseFields,
  optional: Schema.Literal(true),
  trigger: strictStruct({ kind: Schema.Literal("weapon_hit_melee_only") }),
  effect: GrantWeaponAttackRiderSchema,
  usageLimit: OncePerTurnUsageLimitSchema,
});

export const MasteryMechanicsSchema = Schema.Union([
  PushMasteryMechanicsSchema,
  SapMasteryMechanicsSchema,
  SlowMasteryMechanicsSchema,
  ToppleMasteryMechanicsSchema,
  VexMasteryMechanicsSchema,
  CleaveMasteryMechanicsSchema,
]);

export const AttackDamageRiderMechanicsSchema = strictStruct({
  ...OnHitTriggerMechanicsBaseFields,
  optional: Schema.Boolean,
  trigger: AttackDamageRiderTriggerSchema,
  effect: AddAttackDamageDiceRiderSchema,
  usageLimit: OncePerTurnUsageLimitSchema,
}).pipe(
  Schema.check(
    Schema.makeFilter(
      (mechanics) =>
        (mechanics.optional === true &&
          "weaponFilter" in mechanics.trigger &&
          mechanics.effect.dice.kind === "class_level_table") ||
        (mechanics.optional === false &&
          "attackFilter" in mechanics.trigger &&
          mechanics.effect.dice.kind === "rage_damage_bonus"),
      {
        /* v8 ignore next 2 -- @preserve -- this annotation formats the diagnostic after a malformed attack rider combines incompatible trigger, optionality, and dice facts */
        message:
          "Attack damage riders must use matching optionality, trigger, and dice source.",
      },
    ),
  ),
);

export const WeaponDamageDiceRerollMechanicsSchema = strictStruct({
  ...OnHitTriggerMechanicsBaseFields,
  optional: Schema.Literal(true),
  trigger: WeaponDamageDiceRerollTriggerSchema,
  effect: RerollWeaponDamageDiceRiderSchema,
  usageLimit: OncePerTurnUsageLimitSchema,
});

export const WeaponAttackDamageDieFloorTriggerSchema = strictStruct({
  kind: Schema.Literal("attack_damage_roll"),
  attackWeapon: strictStruct({
    kind: Schema.Literal("melee_weapon_held_with_two_hands"),
    propertyGate: Schema.Literal("two_handed_or_versatile"),
  }),
});

export const WeaponAttackDamageDieFloorEffectSchema = strictStruct({
  kind: Schema.Literal("floor_damage_die_results"),
  dieScope: Schema.Literal("attack_damage_dice"),
  minimumResult: Schema.Literal(3),
});

const weaponAttackDamageDieFloorMechanicsFields = codecFields({
  family: Schema.Literal("damage_die_floor"),
  optional: Schema.Literal(true),
  trigger: WeaponAttackDamageDieFloorTriggerSchema,
  effect: WeaponAttackDamageDieFloorEffectSchema,
});
type WeaponAttackDamageDieFloorMechanicsCodec = Schema.Struct<
  typeof weaponAttackDamageDieFloorMechanicsFields
>;
export const WeaponAttackDamageDieFloorMechanicsSchema: WeaponAttackDamageDieFloorMechanicsCodec =
  strictStruct(weaponAttackDamageDieFloorMechanicsFields);

export const LightExtraAttackDamageAbilityModifierTriggerSchema = strictStruct({
  kind: Schema.Literal("light_property_extra_attack_damage_roll"),
  attackWeapon: strictStruct({
    kind: Schema.Literal("weapon_with_light_property"),
  }),
});

export const LightExtraAttackDamageAbilityModifierEffectSchema = strictStruct({
  kind: Schema.Literal("permit_attack_damage_ability_modifier"),
  modifierSource: Schema.Literal("attack_ability_modifier"),
  appliesWhen: Schema.Literal("not_already_adding_ability_modifier"),
});

const lightExtraAttackDamageAbilityModifierMechanicsFields = codecFields({
  family: Schema.Literal("light_extra_attack_damage_ability_modifier"),
  optional: Schema.Literal(true),
  trigger: LightExtraAttackDamageAbilityModifierTriggerSchema,
  effect: LightExtraAttackDamageAbilityModifierEffectSchema,
});
type LightExtraAttackDamageAbilityModifierMechanicsCodec = Schema.Struct<
  typeof lightExtraAttackDamageAbilityModifierMechanicsFields
>;
export const LightExtraAttackDamageAbilityModifierMechanicsSchema: LightExtraAttackDamageAbilityModifierMechanicsCodec =
  strictStruct(lightExtraAttackDamageAbilityModifierMechanicsFields);

const masteryOrWeaponDamageDiceRerollMechanicsMembers = codecMembers(
  MasteryMechanicsSchema,
  WeaponDamageDiceRerollMechanicsSchema,
);
type MasteryOrWeaponDamageDiceRerollMechanicsCodec = Schema.Union<
  typeof masteryOrWeaponDamageDiceRerollMechanicsMembers
>;
export const MasteryOrWeaponDamageDiceRerollMechanicsSchema: MasteryOrWeaponDamageDiceRerollMechanicsCodec =
  Schema.Union(masteryOrWeaponDamageDiceRerollMechanicsMembers);

const onHitTriggerMechanicsMembers = codecMembers(
  MasteryOrWeaponDamageDiceRerollMechanicsSchema,
  AttackDamageRiderMechanicsSchema,
);
type OnHitTriggerMechanicsCodec = Schema.Union<
  typeof onHitTriggerMechanicsMembers
>;
export const OnHitTriggerMechanicsSchema: OnHitTriggerMechanicsCodec =
  Schema.Union(onHitTriggerMechanicsMembers);

export const HitPointReplacementTriggerSchema = Schema.Struct({
  kind: Schema.Literal("reduced_to_0_hp_not_killed_outright"),
});

export const HitPointReplacementEffectSchema = Schema.Struct({
  kind: Schema.Literal("prevent_drop_to_0_hp"),
  replacementHp: Schema.Number,
});

export const AttackRollMissReplacementTriggerSchema = strictStruct({
  kind: Schema.Literal("miss_with_attack_roll"),
});

export const AttackRollMissReplacementEffectSchema = strictStruct({
  kind: Schema.Literal("replace_miss_with_hit"),
});

export const HitPointTriggeredReplacementMechanicsSchema = Schema.Struct({
  family: Schema.Literal("triggered_replacement"),
  trigger: HitPointReplacementTriggerSchema,
  effect: HitPointReplacementEffectSchema,
  optional: Schema.Boolean,
  resetCadence: RestResetCadenceSchema,
});

/* v8 ignore start -- @preserve -- this declarative replacement schema initializes during collection; its canonical owner is decoded by catalog tests */
export const AttackRollMissToHitReplacementMechanicsSchema = strictStruct({
  family: Schema.Literal("triggered_replacement"),
  trigger: AttackRollMissReplacementTriggerSchema,
  effect: AttackRollMissReplacementEffectSchema,
  optional: Schema.Literal(true),
  resetCadence: strictStruct({ kind: Schema.Literal("start_of_next_turn") }),
});
/* v8 ignore stop -- @preserve */

/* v8 ignore start -- @preserve -- this declarative replacement union initializes during collection; both owned variants are decoded by catalog tests */
const triggeredReplacementMechanicsMembers = codecMembers(
  HitPointTriggeredReplacementMechanicsSchema,
  AttackRollMissToHitReplacementMechanicsSchema,
);
type TriggeredReplacementMechanicsCodec = Schema.Union<
  typeof triggeredReplacementMechanicsMembers
>;
export const TriggeredReplacementMechanicsSchema: TriggeredReplacementMechanicsCodec =
  Schema.Union(triggeredReplacementMechanicsMembers);
/* v8 ignore stop -- @preserve */

const UnitMetadataSchema = Schema.Struct({
  id: surfaceIdentity(UnitId, "id"),
  name: surfaceIdentity(NonEmptyStringSchema, "name"),
  provenance: ProvenanceSchema,
});

const distinctAbilities = (abilities: readonly unknown[]): boolean =>
  new Set(abilities).size === abilities.length;

/* v8 ignore start -- @preserve -- this declarative primary-ability union initializes during collection; schema-base tests decode and format both admitted variants */
export const PrimaryAbilityExpressionSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("all_of"),
    abilities: Schema.NonEmptyArray(AbilitySchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("any_of"),
    abilities: Schema.NonEmptyArray(AbilitySchema),
  }),
]).pipe(
  Schema.check(
    Schema.makeFilter(
      (primaryAbilities) => distinctAbilities(primaryAbilities.abilities),
      {
        /* v8 ignore next 2 -- @preserve -- this annotation formats the diagnostic after malformed class Primary Ability entries repeat an ability */
        message: "Class Primary Ability entries must be distinct.",
      },
    ),
  ),
  Schema.check(
    Schema.makeFilter(
      (primaryAbilities) =>
        primaryAbilities.kind !== "any_of" ||
        primaryAbilities.abilities.length > 1,
      {
        /* v8 ignore next 2 -- @preserve -- this annotation formats the diagnostic after a malformed any-of Primary Ability supplies fewer than two alternatives */
        message:
          "Class Primary Ability any_of entries must contain multiple alternatives.",
      },
    ),
  ),
);
/* v8 ignore stop -- @preserve */

export const BackgroundAbilityScoreIncreaseSchema = Schema.Struct({
  abilities: Schema.Tuple([AbilitySchema, AbilitySchema, AbilitySchema]).pipe(
    Schema.check(
      Schema.makeFilter(distinctAbilities, {
        /* v8 ignore next 2 -- @preserve -- this annotation formats the diagnostic after malformed Background ability choices repeat an ability */
        message:
          "Background ability score list must contain three distinct abilities.",
      }),
    ),
  ),
  methods: Schema.Tuple([
    Schema.Struct({
      kind: Schema.Literal("two_scores"),
      primaryIncrease: Schema.Literal(2),
      secondaryIncrease: Schema.Literal(1),
      maxScore: Schema.Literal(20),
    }),
    Schema.Struct({
      kind: Schema.Literal("three_scores"),
      eachIncrease: Schema.Literal(1),
      maxScore: Schema.Literal(20),
    }),
  ]),
});

export const STARTING_EQUIPMENT_SPELLCASTING_FOCUS_KINDS = ["arcane"] as const;

export const StartingEquipmentItemRefSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("unit_ref"),
    unitId: surfaceDependency(NonEmptyStringSchema, "item-reference"),
    quantity: exactOptional(PositiveIntegerSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("selected_tool_proficiency"),
  }),
  Schema.Struct({
    kind: Schema.Literal("unit_ref_with_spellcasting_focus"),
    authoredItemId: surfaceIdentity(NonEmptyStringSchema, "catalog-reference"),
    unitId: surfaceDependency(NonEmptyStringSchema, "item-reference"),
    spellcastingFocusKind: Schema.Literals([
      ...STARTING_EQUIPMENT_SPELLCASTING_FOCUS_KINDS,
    ]),
    quantity: exactOptional(PositiveIntegerSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("draft_owned_item"),
    itemName: surfaceIdentity(NonEmptyStringSchema, "catalog-reference"),
    quantity: exactOptional(PositiveIntegerSchema),
  }),
]);

export const StartingEquipmentChoiceSchema = Schema.Union([
  Schema.Struct({
    id: surfaceProtocol(NonEmptyStringSchema, "optionId"),
    kind: Schema.Literal("coin_grant"),
    coinsGp: NonNegativeIntegerSchema,
  }),
  Schema.Struct({
    id: surfaceProtocol(NonEmptyStringSchema, "optionId"),
    kind: Schema.Literal("item_bundle"),
    items: Schema.NonEmptyArray(StartingEquipmentItemRefSchema),
    coinsGp: exactOptional(NonNegativeIntegerSchema),
  }),
]);

export const ClassFeatureGrantSchema = Schema.Struct({
  unitId: surfaceDependency(
    NonEmptyStringSchema,
    "unit-reference",
    "class-feature-grant",
  ),
  level: PositiveIntegerSchema,
});

export const ArmorTrainingSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("trained"),
    categories: Schema.NonEmptyArray(ArmorTrainingCategorySchema),
  }),
  strictStruct({ kind: Schema.Literal("none") }),
]);

const SpellSlotCapacitySchema = Schema.Struct({
  spellLevel: PositiveIntegerSchema,
  count: NonNegativeIntegerSchema,
});

const SpellSlotProjectionSchema = Schema.Struct({
  kind: Schema.Literal("leveled_spell_slots"),
  slots: Schema.NonEmptyArray(SpellSlotCapacitySchema),
  resetCadence: Schema.Struct({ kind: Schema.Literal("long_rest") }),
});

const PactSlotProjectionSchema = Schema.Struct({
  kind: Schema.Literal("pact_slots"),
  count: PositiveIntegerSchema,
  spellLevel: PositiveIntegerSchema,
  resetCadence: Schema.Struct({
    kind: Schema.Literal("short_or_long_rest"),
  }),
});

const WizardSpellcastingProgressionRowSchema = Schema.Struct({
  atLevel: PositiveIntegerSchema,
  cantripCount: PositiveIntegerSchema,
  spellbookSpellCount: PositiveIntegerSchema,
  preparedSpellCount: PositiveIntegerSchema,
  spellSlots: Schema.NonEmptyArray(SpellSlotCapacitySchema),
});

const ListPreparedSpellcastingProgressionRowSchema = Schema.Struct({
  atLevel: PositiveIntegerSchema,
  cantripCount: NonNegativeIntegerSchema,
  preparedSpellCount: PositiveIntegerSchema,
  spellSlots: Schema.NonEmptyArray(SpellSlotCapacitySchema),
});

const PactMagicProgressionSchema = Schema.NonEmptyArray(
  Schema.Struct({
    atLevel: PositiveIntegerSchema,
    cantripTotal: PositiveIntegerSchema,
    preparedSpellTotal: PositiveIntegerSchema,
    pactSlotCount: PositiveIntegerSchema,
    pactSlotLevel: PositiveIntegerSchema,
  }),
);

const SpellbookSpellAccessSchema = Schema.Struct({
  spellId: surfaceReference(NonEmptyStringSchema, "spell-reference"),
  spellLevel: PositiveIntegerSchema,
});

const ClassSpellAccessSchema = Schema.Struct({
  spellId: surfaceReference(NonEmptyStringSchema, "spell-reference"),
  spellLevel: PositiveIntegerSchema,
});

const distinctStrings = (values: readonly string[]): boolean =>
  new Set(values).size === values.length;

const sameStringSet = (
  left: readonly string[],
  right: readonly string[],
): boolean =>
  left.length === right.length &&
  left.every((value) => right.some((candidate) => candidate === value));

const distinctSlotLevels = (
  slots: readonly { readonly spellLevel: number }[],
): boolean => distinctStrings(slots.map((slot) => slot.spellLevel.toString()));

const availableSlotLevels = (
  slots: readonly { readonly spellLevel: number; readonly count: number }[],
): ReadonlySet<number> =>
  new Set(
    slots.filter((slot) => slot.count > 0).map((slot) => slot.spellLevel),
  );

const allSpellIdsDistinct = (
  spells: readonly { readonly spellId: string }[],
): boolean => distinctStrings(spells.map((spell) => spell.spellId));

const allSpellLevelsAvailable = (
  spells: readonly { readonly spellLevel: number }[],
  levels: ReadonlySet<number>,
): boolean => spells.every((spell) => levels.has(spell.spellLevel));

const allSpellLevelsAtOrBelow = (
  spells: readonly { readonly spellLevel: number }[],
  maxSpellLevel: number,
): boolean => spells.every((spell) => spell.spellLevel <= maxSpellLevel);

const CLASS_PREPARED_SPELLCASTING_FACTS = [
  {
    className: "bard",
    spellcastingAbility: "cha",
    spellcastingFocus: "musical_instrument",
    preparedChangeOn: { kind: "class_level", replacementCount: 1 },
    cantripCount: 2,
    preparedCount: 4,
    spellSlotCount: 2,
    spellSlotLevel: 1,
  },
  {
    className: "cleric",
    spellcastingAbility: "wis",
    spellcastingFocus: "holy_symbol",
    preparedChangeOn: { kind: "long_rest", replacementCount: "any" },
    cantripCount: 3,
    preparedCount: 4,
    spellSlotCount: 2,
    spellSlotLevel: 1,
  },
  {
    className: "druid",
    spellcastingAbility: "wis",
    spellcastingFocus: "druidic_focus",
    preparedChangeOn: { kind: "long_rest", replacementCount: "any" },
    cantripCount: 2,
    preparedCount: 4,
    spellSlotCount: 2,
    spellSlotLevel: 1,
  },
  {
    className: "paladin",
    spellcastingAbility: "cha",
    spellcastingFocus: "holy_symbol",
    preparedChangeOn: { kind: "long_rest", replacementCount: 1 },
    cantripCount: 0,
    preparedCount: 2,
    spellSlotCount: 2,
    spellSlotLevel: 1,
  },
  {
    className: "ranger",
    spellcastingAbility: "wis",
    spellcastingFocus: "druidic_focus",
    preparedChangeOn: { kind: "long_rest", replacementCount: 1 },
    cantripCount: 0,
    preparedCount: 2,
    spellSlotCount: 2,
    spellSlotLevel: 1,
  },
  {
    className: "sorcerer",
    spellcastingAbility: "cha",
    spellcastingFocus: "arcane_focus",
    preparedChangeOn: { kind: "class_level", replacementCount: 1 },
    cantripCount: 4,
    preparedCount: 2,
    spellSlotCount: 2,
    spellSlotLevel: 1,
  },
] as const;

const ListPreparedSpellcastingClassNameSchema = Schema.Literals([
  ...LIST_PREPARED_SPELLCASTING_CLASS_NAMES,
]);

const ClassCantripAccessSchema = Schema.Struct({
  kind: Schema.Literal("known_cantrips_from_class_spell_list"),
  choose: PositiveIntegerSchema,
  spellIds: Schema.NonEmptyArray(
    surfaceReference(NonEmptyStringSchema, "spell-list"),
  ),
  changeOn: Schema.Struct({
    kind: Schema.Literal("class_level"),
    count: PositiveIntegerSchema,
  }),
});

const ClassPreparedAccessSchema = Schema.Struct({
  kind: Schema.Literal("prepared_from_class_spell_list"),
  choose: PositiveIntegerSchema,
  spells: Schema.NonEmptyArray(ClassSpellAccessSchema),
  changeOn: Schema.Union([
    Schema.Struct({
      kind: Schema.Literal("class_level"),
      replacementCount: Schema.Literal(1),
    }),
    Schema.Struct({
      kind: Schema.Literal("long_rest"),
      replacementCount: Schema.Literals([1, "any"]),
    }),
  ]),
});

const spellSlotProjectionMatchesLevelOneFacts = (
  spellcasting: {
    readonly spellSlotProjection: {
      readonly slots: readonly {
        readonly count: number;
        readonly spellLevel: number;
      }[];
    };
  },
  facts: {
    readonly spellSlotCount: number;
    readonly spellSlotLevel: number;
  },
): boolean =>
  spellcasting.spellSlotProjection.slots.length === 1 &&
  spellcasting.spellSlotProjection.slots[0]?.count === facts.spellSlotCount &&
  spellcasting.spellSlotProjection.slots[0]?.spellLevel ===
    facts.spellSlotLevel;

export const ListPreparedSpellcastingCreationSchema = Schema.Struct({
  kind: Schema.Literal("list_prepared_spellcasting_creation"),
  featureLevel: Schema.Literal(1),
  spellcastingAbility: Schema.Literals(["cha", "wis"]),
  cantripAccess: exactOptional(ClassCantripAccessSchema),
  preparedAccess: ClassPreparedAccessSchema,
  spellSlotProjection: SpellSlotProjectionSchema,
  spellcastingFocus: Schema.Literals([
    "arcane_focus",
    "druidic_focus",
    "holy_symbol",
    "musical_instrument",
  ]),
}).pipe(
  Schema.check(
    Schema.makeFilter(
      (spellcasting) => {
        return (
          spellcasting.preparedAccess.choose ===
            spellcasting.preparedAccess.spells.length &&
          allSpellIdsDistinct(spellcasting.preparedAccess.spells) &&
          distinctSlotLevels(spellcasting.spellSlotProjection.slots) &&
          (spellcasting.cantripAccess === undefined ||
            (spellcasting.cantripAccess.choose ===
              spellcasting.cantripAccess.spellIds.length &&
              distinctStrings(spellcasting.cantripAccess.spellIds))) &&
          allSpellLevelsAvailable(
            spellcasting.preparedAccess.spells,
            availableSlotLevels(spellcasting.spellSlotProjection.slots),
          )
        );
      },
      {
        /* v8 ignore next 2 -- @preserve -- this callback only formats the diagnostic after malformed list-prepared choices disagree with their class spellcasting facts */
        message:
          "List-prepared spellcasting choices must match class Spellcasting facts, counts, uniqueness, and available Spell Slot levels.",
      },
    ),
  ),
);

export const ListPreparedSpellcastingProgressionCreationSchema = Schema.Struct({
  kind: Schema.Literal("list_prepared_spellcasting_progression_creation"),
  featureLevel: Schema.Literal(1),
  spellcastingAbility: Schema.Literals(["cha", "wis"]),
  cantripAccess: exactOptional(ClassCantripAccessSchema),
  preparedAccess: ClassPreparedAccessSchema,
  spellSlotProjection: SpellSlotProjectionSchema,
  spellcastingProgression: Schema.NonEmptyArray(
    ListPreparedSpellcastingProgressionRowSchema,
  ),
  spellcastingFocus: Schema.Literals([
    "arcane_focus",
    "druidic_focus",
    "holy_symbol",
    "musical_instrument",
  ]),
}).pipe(
  Schema.check(
    Schema.makeFilter(
      (spellcasting) => {
        const levelOne = listPreparedSpellcastingProgressionAtLevel(
          spellcasting.spellcastingProgression,
          1,
        );
        /* v8 ignore start -- @preserve -- a missing/duplicate level-1 progression or mismatched projection is malformed list-prepared authorship */
        if (
          levelOne === undefined ||
          !distinctListPreparedSpellcastingProgressionLevels(
            spellcasting.spellcastingProgression,
          ) ||
          !sameSpellSlotCapacities(
            levelOne.spellSlots,
            spellcasting.spellSlotProjection.slots,
          )
        ) {
          return false;
        }
        /* v8 ignore stop -- @preserve */

        const maxCantripCount = Math.max(
          ...spellcasting.spellcastingProgression.map(
            (row) => row.cantripCount,
          ),
        );
        const maxPreparedSpellCount = Math.max(
          ...spellcasting.spellcastingProgression.map(
            (row) => row.preparedSpellCount,
          ),
        );
        const maxPreparedSpellLevel = Math.max(
          ...spellcasting.spellcastingProgression.flatMap((row) =>
            row.spellSlots
              .filter((slot) => slot.count > 0)
              .map((slot) => slot.spellLevel),
          ),
        );
        return (
          spellcasting.preparedAccess.choose === levelOne.preparedSpellCount &&
          spellcasting.preparedAccess.spells.length >= maxPreparedSpellCount &&
          allSpellIdsDistinct(spellcasting.preparedAccess.spells) &&
          distinctSlotLevels(spellcasting.spellSlotProjection.slots) &&
          spellcasting.spellcastingProgression.every((row) =>
            distinctSlotLevels(row.spellSlots),
          ) &&
          (maxCantripCount === 0
            ? spellcasting.cantripAccess === undefined
            : spellcasting.cantripAccess !== undefined &&
              spellcasting.cantripAccess.choose === levelOne.cantripCount &&
              spellcasting.cantripAccess.spellIds.length >= maxCantripCount &&
              distinctStrings(spellcasting.cantripAccess.spellIds)) &&
          allSpellLevelsAtOrBelow(
            spellcasting.preparedAccess.spells,
            maxPreparedSpellLevel,
          )
        );
      },
      {
        /* v8 ignore next 2 -- @preserve -- this callback only formats the diagnostic after malformed list-prepared progression choices violate their level or spell-list bounds */
        message:
          "List-prepared spellcasting progression choices must match level-1 facts, provide enough unique spell options for each progression row, and prepare only spells at or below available Spell Slot levels.",
      },
    ),
  ),
);

export const PactMagicSpellcastingCreationSchema = Schema.Struct({
  kind: Schema.Literal("pact_magic_spellcasting_creation"),
  featureLevel: Schema.Literal(1),
  spellcastingAbility: Schema.Literal("cha"),
  cantripAccess: Schema.Struct({
    kind: Schema.Literal("known_cantrips_from_class_spell_list"),
    choose: PositiveIntegerSchema,
    spellIds: Schema.NonEmptyArray(
      surfaceReference(NonEmptyStringSchema, "spell-list"),
    ),
    changeOn: Schema.Struct({
      kind: Schema.Literal("class_level"),
      count: PositiveIntegerSchema,
    }),
  }),
  preparedAccess: Schema.Struct({
    kind: Schema.Literal("prepared_from_class_spell_list"),
    choose: PositiveIntegerSchema,
    spells: Schema.NonEmptyArray(ClassSpellAccessSchema),
    changeOn: Schema.Struct({
      kind: Schema.Literal("class_level"),
      replacementCount: Schema.Literal(1),
    }),
  }),
  pactSlotProjection: PactSlotProjectionSchema,
  pactMagicProgression: PactMagicProgressionSchema,
  spellcastingFocus: Schema.Literal("arcane_focus"),
}).pipe(
  Schema.check(
    Schema.makeFilter(
      (spellcasting) => {
        return (
          distinctStrings(spellcasting.cantripAccess.spellIds) &&
          allSpellIdsDistinct(spellcasting.preparedAccess.spells) &&
          distinctPactMagicProgressionLevels(
            spellcasting.pactMagicProgression,
          ) &&
          pactMagicProgressionMatchesLevelOneFacts(spellcasting) &&
          pactMagicOptionsCoverProgression(spellcasting)
        );
      },
      {
        /* v8 ignore next 2 -- @preserve -- this callback only formats the diagnostic after malformed Pact Magic choices violate their counts, levels, or spell list */
        message:
          "Pact Magic choices must match their counts, be unique, use the Warlock spell list, and prepare only spells at or below the Pact Slot level.",
      },
    ),
  ),
);

export const WizardSpellcastingCreationSchema = Schema.Struct({
  kind: Schema.Literal("wizard_spellcasting_creation"),
  featureLevel: Schema.Literal(1),
  spellcastingAbility: Schema.Literal("int"),
  cantripAccess: Schema.Struct({
    kind: Schema.Literal("known_cantrips"),
    choose: PositiveIntegerSchema,
    spellIds: Schema.NonEmptyArray(
      surfaceReference(NonEmptyStringSchema, "spell-list"),
    ),
    changeOn: Schema.Struct({
      kind: Schema.Literal("long_rest"),
      count: PositiveIntegerSchema,
    }),
  }),
  spellbookAccess: Schema.Struct({
    kind: Schema.Literal("spellbook"),
    choose: PositiveIntegerSchema,
    spells: Schema.NonEmptyArray(SpellbookSpellAccessSchema),
  }),
  preparedAccess: Schema.Struct({
    kind: Schema.Literal("prepared_from_spellbook"),
    choose: PositiveIntegerSchema,
    spellIds: Schema.NonEmptyArray(
      surfaceReference(NonEmptyStringSchema, "spell-list"),
    ),
    changeOn: Schema.Struct({ kind: Schema.Literal("long_rest") }),
  }),
  spellSlotProjection: SpellSlotProjectionSchema,
  spellcastingProgression: Schema.NonEmptyArray(
    WizardSpellcastingProgressionRowSchema,
  ),
  spellcastingFocuses: Schema.NonEmptyArray(
    Schema.Literals(["arcane_focus", "spellbook"]),
  ),
}).pipe(
  Schema.check(
    Schema.makeFilter(
      (spellcasting) => {
        if (
          spellcasting.cantripAccess.choose >
            spellcasting.cantripAccess.spellIds.length ||
          spellcasting.spellbookAccess.choose >
            spellcasting.spellbookAccess.spells.length ||
          spellcasting.preparedAccess.choose >
            spellcasting.preparedAccess.spellIds.length
        ) {
          return false;
        }

        if (
          !distinctStrings(spellcasting.cantripAccess.spellIds) ||
          !distinctStrings(
            spellcasting.spellbookAccess.spells.map((spell) => spell.spellId),
          ) ||
          !distinctStrings(spellcasting.preparedAccess.spellIds)
        ) {
          return false;
        }

        const slotLevels = spellcasting.spellSlotProjection.slots.map((slot) =>
          slot.spellLevel.toString(),
        );
        /* v8 ignore start -- @preserve -- duplicate Wizard Spell Slot levels are malformed progression authorship */
        if (!distinctStrings(slotLevels)) {
          return false;
        }
        /* v8 ignore stop -- @preserve */

        if (
          !distinctWizardSpellcastingProgressionLevels(
            spellcasting.spellcastingProgression,
          ) ||
          !wizardSpellcastingProgressionMatchesLevelOneFacts(spellcasting)
        ) {
          return false;
        }

        const maxCantripCount = Math.max(
          ...spellcasting.spellcastingProgression.map(
            (row) => row.cantripCount,
          ),
        );
        const maxSpellbookSpellCount = Math.max(
          ...spellcasting.spellcastingProgression.map(
            (row) => row.spellbookSpellCount,
          ),
        );
        const maxPreparedSpellCount = Math.max(
          ...spellcasting.spellcastingProgression.map(
            (row) => row.preparedSpellCount,
          ),
        );
        if (
          maxCantripCount > spellcasting.cantripAccess.spellIds.length ||
          maxSpellbookSpellCount > spellcasting.spellbookAccess.spells.length ||
          maxPreparedSpellCount > spellcasting.preparedAccess.spellIds.length
        ) {
          return false;
        }
        const progressionSlotsHaveDistinctLevels =
          spellcasting.spellcastingProgression.every((row) =>
            distinctStrings(
              row.spellSlots.map((slot) => slot.spellLevel.toString()),
            ),
          );
        /* v8 ignore start -- @preserve -- duplicate Spell Slot levels within a Wizard progression row are malformed authorship */
        if (!progressionSlotsHaveDistinctLevels) {
          return false;
        }
        /* v8 ignore stop -- @preserve */

        const availableSlotLevels = new Set(
          spellcasting.spellcastingProgression.flatMap((row) =>
            row.spellSlots
              .filter((slot) => slot.count > 0)
              .map((slot) => slot.spellLevel),
          ),
        );

        const availableSpellbookSpellIds = spellcasting.spellbookAccess.spells
          .filter((spell) => availableSlotLevels.has(spell.spellLevel))
          .map((spell) => spell.spellId);

        return sameStringSet(
          spellcasting.preparedAccess.spellIds,
          availableSpellbookSpellIds,
        );
      },
      {
        /* v8 ignore next 2 -- @preserve -- this callback only formats the diagnostic after malformed Wizard choices violate cantrip, spellbook, or preparation facts */
        message:
          "Wizard spellcasting choices must match cantrip and spellbook counts, provide enough unique prepared spell options, and prepare only spellbook spells with available Spell Slot levels.",
      },
    ),
  ),
);

function distinctWizardSpellcastingProgressionLevels(
  progression: readonly {
    readonly atLevel: number;
  }[],
): boolean {
  return distinctStrings(progression.map((row) => row.atLevel.toString()));
}

function distinctListPreparedSpellcastingProgressionLevels(
  progression: readonly {
    readonly atLevel: number;
  }[],
): boolean {
  return distinctStrings(progression.map((row) => row.atLevel.toString()));
}

function wizardSpellcastingProgressionMatchesLevelOneFacts(spellcasting: {
  readonly cantripAccess: { readonly choose: number };
  readonly spellbookAccess: { readonly choose: number };
  readonly preparedAccess: { readonly choose: number };
  readonly spellSlotProjection: {
    readonly slots: readonly {
      readonly spellLevel: number;
      readonly count: number;
    }[];
  };
  readonly spellcastingProgression: readonly {
    readonly atLevel: number;
    readonly cantripCount: number;
    readonly spellbookSpellCount: number;
    readonly preparedSpellCount: number;
    readonly spellSlots: readonly {
      readonly spellLevel: number;
      readonly count: number;
    }[];
  }[];
}): boolean {
  const levelOne = spellcasting.spellcastingProgression.find(
    (row) => row.atLevel === 1,
  );
  return (
    levelOne !== undefined &&
    levelOne.cantripCount === spellcasting.cantripAccess.choose &&
    levelOne.spellbookSpellCount === spellcasting.spellbookAccess.choose &&
    levelOne.preparedSpellCount === spellcasting.preparedAccess.choose &&
    sameSpellSlotCapacities(
      levelOne.spellSlots,
      spellcasting.spellSlotProjection.slots,
    )
  );
}

function sameSpellSlotCapacities(
  left: readonly { readonly spellLevel: number; readonly count: number }[],
  right: readonly { readonly spellLevel: number; readonly count: number }[],
): boolean {
  return (
    left.length === right.length &&
    left.every((leftSlot) =>
      right.some(
        (rightSlot) =>
          rightSlot.spellLevel === leftSlot.spellLevel &&
          rightSlot.count === leftSlot.count,
      ),
    )
  );
}

function distinctPactMagicProgressionLevels(
  input: readonly {
    readonly atLevel: number;
  }[],
): boolean {
  return distinctStrings(input.map((row) => row.atLevel.toString()));
}

function pactMagicProgressionAtLevel(
  progression: readonly {
    readonly atLevel: number;
    readonly cantripTotal: number;
    readonly preparedSpellTotal: number;
    readonly pactSlotCount: number;
    readonly pactSlotLevel: number;
  }[],
  classLevel: number,
):
  | {
      readonly atLevel: number;
      readonly cantripTotal: number;
      readonly preparedSpellTotal: number;
      readonly pactSlotCount: number;
      readonly pactSlotLevel: number;
    }
  | undefined {
  return progression
    .filter((row) => row.atLevel <= classLevel)
    .sort((left, right) => left.atLevel - right.atLevel)
    .at(-1);
}

function listPreparedSpellcastingProgressionAtLevel(
  progression: readonly {
    readonly atLevel: number;
    readonly cantripCount: number;
    readonly preparedSpellCount: number;
    readonly spellSlots: readonly {
      readonly spellLevel: number;
      readonly count: number;
    }[];
  }[],
  classLevel: number,
):
  | {
      readonly atLevel: number;
      readonly cantripCount: number;
      readonly preparedSpellCount: number;
      readonly spellSlots: readonly {
        readonly spellLevel: number;
        readonly count: number;
      }[];
    }
  | undefined {
  return progression
    .filter((row) => row.atLevel <= classLevel)
    .sort((left, right) => left.atLevel - right.atLevel)
    .at(-1);
}

function pactMagicProgressionMatchesLevelOneFacts(spellcasting: {
  readonly cantripAccess: { readonly choose: number };
  readonly preparedAccess: { readonly choose: number };
  readonly pactSlotProjection: {
    readonly count: number;
    readonly spellLevel: number;
  };
  readonly pactMagicProgression: readonly {
    readonly atLevel: number;
    readonly cantripTotal: number;
    readonly preparedSpellTotal: number;
    readonly pactSlotCount: number;
    readonly pactSlotLevel: number;
  }[];
}): boolean {
  const levelOne = pactMagicProgressionAtLevel(
    spellcasting.pactMagicProgression,
    1,
  );
  return (
    levelOne?.atLevel === 1 &&
    levelOne.cantripTotal === spellcasting.cantripAccess.choose &&
    levelOne.preparedSpellTotal === spellcasting.preparedAccess.choose &&
    levelOne.pactSlotCount === spellcasting.pactSlotProjection.count &&
    levelOne.pactSlotLevel === spellcasting.pactSlotProjection.spellLevel
  );
}

function pactMagicOptionsCoverProgression(spellcasting: {
  readonly cantripAccess: {
    readonly spellIds: readonly string[];
  };
  readonly preparedAccess: {
    readonly spells: readonly {
      readonly spellId: string;
      readonly spellLevel: number;
    }[];
  };
  readonly pactMagicProgression: readonly {
    readonly cantripTotal: number;
    readonly preparedSpellTotal: number;
    readonly pactSlotLevel: number;
  }[];
}): boolean {
  const maxCantripCount = Math.max(
    ...spellcasting.pactMagicProgression.map((row) => row.cantripTotal),
  );
  const maxPreparedSpellCount = Math.max(
    ...spellcasting.pactMagicProgression.map((row) => row.preparedSpellTotal),
  );
  const maxPactSlotLevel = Math.max(
    ...spellcasting.pactMagicProgression.map((row) => row.pactSlotLevel),
  );

  return (
    spellcasting.cantripAccess.spellIds.length >= maxCantripCount &&
    spellcasting.preparedAccess.spells.length >= maxPreparedSpellCount &&
    allSpellLevelsAtOrBelow(
      spellcasting.preparedAccess.spells,
      maxPactSlotLevel,
    )
  );
}

/* v8 ignore start -- @preserve -- this declarative owner union initializes during collection; direct reader tests decode every admitted class spellcasting shape */
export const ClassSpellcastingCreationSchema = Schema.Union([
  ListPreparedSpellcastingCreationSchema,
  ListPreparedSpellcastingProgressionCreationSchema,
  PactMagicSpellcastingCreationSchema,
  WizardSpellcastingCreationSchema,
]);
/* v8 ignore stop -- @preserve */

/* v8 ignore start -- @preserve -- these declarative class-schema objects initialize during full-suite collection before V8 attribution; schema-nonspell-readers.test.ts decodes each owner directly */
const ClassRecordBaseFields = {
  ...UnitMetadataSchema.fields,
  kind: ClassRecordKindSchema,
  primaryAbilities: PrimaryAbilityExpressionSchema,
  hitPointDie: PositiveIntegerSchema,
  savingThrowProficiencies: Schema.NonEmptyArray(AbilitySchema),
  skillProficiencyChoice: Schema.Struct({
    choose: PositiveIntegerSchema,
    options: Schema.NonEmptyArray(SkillSchema),
  }),
  weaponProficiencies: Schema.NonEmptyArray(WeaponProficiencySchema),
  toolProficiencies: ToolProficiencyGrantSchema,
  armorTraining: ArmorTrainingSchema,
  startingEquipment: Schema.NonEmptyArray(StartingEquipmentChoiceSchema),
  featureGrants: Schema.Array(ClassFeatureGrantSchema),
  multiclassProficiencies: ProficiencyGrantSchema,
  subclassChoices: Schema.Array(
    Schema.Struct({
      level: PositiveIntegerSchema,
      options: Schema.NonEmptyArray(
        surfaceReference(
          NonEmptyStringSchema,
          "subclass-choice",
          "class-subclass-choice",
        ),
      ),
    }),
  ),
};

const wizardClassRecordFields = codecFields({
  ...ClassRecordBaseFields,
  className: Schema.Literal("wizard"),
  spellcasting: WizardSpellcastingCreationSchema,
});
type WizardClassRecordCodec = Schema.Struct<typeof wizardClassRecordFields>;
export const WizardClassRecordSchema: WizardClassRecordCodec = Schema.Struct(
  wizardClassRecordFields,
);

export const ListPreparedSpellcastingClassRecordSchema = Schema.Struct({
  ...ClassRecordBaseFields,
  className: ListPreparedSpellcastingClassNameSchema,
  spellcasting: Schema.Union([
    ListPreparedSpellcastingCreationSchema,
    ListPreparedSpellcastingProgressionCreationSchema,
  ]),
}).pipe(
  Schema.check(
    Schema.makeFilter(
      (unit) => {
        /* v8 ignore stop -- @preserve */
        const classFacts = CLASS_PREPARED_SPELLCASTING_FACTS.find(
          (facts) => facts.className === unit.className,
        );
        /* v8 ignore start -- @preserve -- the owning schema restricts className to the table-backed list-prepared names, so a missing facts row requires malformed internal composition */
        if (classFacts === undefined) {
          return false;
        }
        /* v8 ignore stop -- @preserve */

        return (
          unit.spellcasting.spellcastingAbility ===
            classFacts.spellcastingAbility &&
          unit.spellcasting.spellcastingFocus ===
            classFacts.spellcastingFocus &&
          unit.spellcasting.preparedAccess.changeOn.kind ===
            classFacts.preparedChangeOn.kind &&
          unit.spellcasting.preparedAccess.changeOn.replacementCount ===
            classFacts.preparedChangeOn.replacementCount &&
          unit.spellcasting.preparedAccess.choose ===
            classFacts.preparedCount &&
          (unit.spellcasting.kind === "list_prepared_spellcasting_creation"
            ? unit.spellcasting.preparedAccess.spells.length ===
              classFacts.preparedCount
            : unit.spellcasting.preparedAccess.spells.length >=
              classFacts.preparedCount) &&
          spellSlotProjectionMatchesLevelOneFacts(
            unit.spellcasting,
            classFacts,
          ) &&
          (classFacts.cantripCount === 0
            ? unit.spellcasting.cantripAccess === undefined
            : unit.spellcasting.cantripAccess?.choose ===
                classFacts.cantripCount &&
              (unit.spellcasting.kind === "list_prepared_spellcasting_creation"
                ? unit.spellcasting.cantripAccess.spellIds.length ===
                  classFacts.cantripCount
                : unit.spellcasting.cantripAccess.spellIds.length >=
                  classFacts.cantripCount) &&
              distinctStrings(unit.spellcasting.cantripAccess.spellIds)) &&
          (unit.spellcasting.kind ===
          "list_prepared_spellcasting_progression_creation"
            ? listPreparedSpellcastingProgressionMatchesLevelOneFacts(
                unit.spellcasting,
                classFacts,
              )
            : true)
        );
      },
      /* v8 ignore start -- @preserve -- the remaining filter options and schema composition are declarative initialization; direct reader tests exercise the valid class record */
      {
        /* v8 ignore next 2 -- @preserve -- this callback only formats the diagnostic after malformed class records contradict their list-prepared spellcasting table facts */
        message:
          "List-prepared class records must match class-specific level-1 spellcasting ability, focus, cantrip count, prepared-spell count, Spell Slot projection, prepared-spell replacement timing/cardinality, and class spell list.",
      },
    ),
  ),
);
/* v8 ignore stop -- @preserve */

function listPreparedSpellcastingProgressionMatchesLevelOneFacts(
  spellcasting: {
    readonly cantripAccess?: { readonly choose: number };
    readonly preparedAccess: { readonly choose: number };
    readonly spellSlotProjection: {
      readonly slots: readonly {
        readonly spellLevel: number;
        readonly count: number;
      }[];
    };
    readonly spellcastingProgression: readonly {
      readonly atLevel: number;
      readonly cantripCount: number;
      readonly preparedSpellCount: number;
      readonly spellSlots: readonly {
        readonly spellLevel: number;
        readonly count: number;
      }[];
    }[];
  },
  facts: {
    readonly cantripCount: number;
    readonly preparedCount: number;
    readonly spellSlotCount: number;
    readonly spellSlotLevel: number;
  },
): boolean {
  const levelOne = listPreparedSpellcastingProgressionAtLevel(
    spellcasting.spellcastingProgression,
    1,
  );
  return (
    levelOne?.atLevel === 1 &&
    levelOne.cantripCount === facts.cantripCount &&
    levelOne.preparedSpellCount === facts.preparedCount &&
    spellSlotProjectionMatchesLevelOneFacts(spellcasting, facts) &&
    sameSpellSlotCapacities(
      levelOne.spellSlots,
      spellcasting.spellSlotProjection.slots,
    )
  );
}

/* v8 ignore start -- @preserve -- this declarative Pact Magic class schema initializes during collection; schema-nonspell-readers.test.ts decodes the canonical Warlock directly */
export const PactMagicClassRecordSchema = Schema.Struct({
  ...ClassRecordBaseFields,
  className: Schema.Literal("warlock"),
  spellcasting: PactMagicSpellcastingCreationSchema,
}).pipe(
  Schema.check(
    Schema.makeFilter(
      (unit) => {
        /* v8 ignore stop -- @preserve */
        const levelOne = pactMagicProgressionAtLevel(
          unit.spellcasting.pactMagicProgression,
          1,
        );
        return (
          unit.spellcasting.cantripAccess.choose === 2 &&
          unit.spellcasting.preparedAccess.choose === 2 &&
          unit.spellcasting.pactSlotProjection.count === 1 &&
          unit.spellcasting.pactSlotProjection.spellLevel === 1 &&
          levelOne?.cantripTotal === 2 &&
          levelOne.preparedSpellTotal === 2 &&
          levelOne.pactSlotCount === 1 &&
          levelOne.pactSlotLevel === 1 &&
          pactMagicOptionsCoverProgression(unit.spellcasting)
        );
      },
      /* v8 ignore start -- @preserve -- the remaining filter options and schema composition are declarative initialization; malformed diagnostics are excluded explicitly */
      {
        /* v8 ignore next 2 -- @preserve -- this callback only formats the diagnostic after a malformed Warlock class record contradicts its Pact Magic level-1 facts */
        message:
          "Warlock Pact Magic class records must match level-1 cantrip, prepared-spell, Pact Slot count, Pact Slot level, and Warlock spell list facts.",
      },
    ),
  ),
);
/* v8 ignore stop -- @preserve */

/* v8 ignore start -- @preserve -- these declarative class and class-feature owner schemas initialize before full-suite V8 attribution; direct reader tests decode every listed owner */
export const SpellcastingClassRecordSchema = Schema.Union([
  ListPreparedSpellcastingClassRecordSchema,
  PactMagicClassRecordSchema,
  WizardClassRecordSchema,
]);

export const NonSpellcastingClassRecordSchema = Schema.Struct({
  ...ClassRecordBaseFields,
  className: Schema.Literals(NON_SPELLCASTING_CLASS_NAMES),
  spellcasting: exactOptional(ForbiddenValueSchema),
});

export const ClassContainerOnlyRecordSchema = Schema.Struct({
  ...ClassRecordBaseFields,
  className: Schema.Literals([
    ...CLASS_CONTAINER_WITHOUT_SPELL_ACCESS_CLASS_NAMES,
  ]),
  spellcasting: exactOptional(ForbiddenValueSchema),
});

const nonWizardClassRecordMembers = codecMembers(
  ListPreparedSpellcastingClassRecordSchema,
  PactMagicClassRecordSchema,
  ClassContainerOnlyRecordSchema,
);
type NonWizardClassRecordCodec = Schema.Union<
  typeof nonWizardClassRecordMembers
>;
export const NonWizardClassRecordSchema: NonWizardClassRecordCodec =
  Schema.Union(nonWizardClassRecordMembers);

export const ClassRecordSchema = Schema.Union([
  NonWizardClassRecordSchema,
  WizardClassRecordSchema,
]);

const ClassFeatureRecordBaseFields = {
  ...UnitMetadataSchema.fields,
  kind: Schema.Literal("class_feature"),
  acquiredAtLevel: PositiveIntegerSchema,
};

const bardClassFeatureRecordFields = codecFields({
  ...ClassFeatureRecordBaseFields,
  className: Schema.Literal("bard"),
  mechanics: BardClassFeatureMechanicsSchema,
});
type BardClassFeatureRecordCodec = Schema.Struct<
  typeof bardClassFeatureRecordFields
>;
export type BardClassFeatureRecord =
  Schema.Schema.Type<BardClassFeatureRecordCodec>;
export const BardClassFeatureRecordSchema: BardClassFeatureRecordCodec =
  Schema.Struct(bardClassFeatureRecordFields);

const wizardClassFeatureRecordFields = codecFields({
  ...ClassFeatureRecordBaseFields,
  className: Schema.Literal("wizard"),
  mechanics: WizardClassFeatureMechanicsSchema,
});
type WizardClassFeatureRecordCodec = Schema.Struct<
  typeof wizardClassFeatureRecordFields
>;
export type WizardClassFeatureRecord =
  Schema.Schema.Type<WizardClassFeatureRecordCodec>;
export const WizardClassFeatureRecordSchema: WizardClassFeatureRecordCodec =
  Schema.Struct(wizardClassFeatureRecordFields);

const barbarianClassFeatureRecordFields = codecFields({
  ...ClassFeatureRecordBaseFields,
  className: Schema.Literal("barbarian"),
  mechanics: BarbarianClassFeatureMechanicsSchema,
});
type BarbarianClassFeatureRecordCodec = Schema.Struct<
  typeof barbarianClassFeatureRecordFields
>;
export type BarbarianClassFeatureRecord =
  Schema.Schema.Type<BarbarianClassFeatureRecordCodec>;
export const BarbarianClassFeatureRecordSchema: BarbarianClassFeatureRecordCodec =
  Schema.Struct(barbarianClassFeatureRecordFields);

const fighterClassFeatureRecordFields = codecFields({
  ...ClassFeatureRecordBaseFields,
  className: Schema.Literal("fighter"),
  mechanics: FighterClassFeatureMechanicsSchema,
});
type FighterClassFeatureRecordCodec = Schema.Struct<
  typeof fighterClassFeatureRecordFields
>;
export type FighterClassFeatureRecord =
  Schema.Schema.Type<FighterClassFeatureRecordCodec>;
export const FighterClassFeatureRecordSchema: FighterClassFeatureRecordCodec =
  Schema.Struct(fighterClassFeatureRecordFields);
/* v8 ignore stop -- @preserve */

const clericClassFeatureRecordFields = codecFields({
  ...ClassFeatureRecordBaseFields,
  className: Schema.Literal("cleric"),
  mechanics: ClericClassFeatureMechanicsSchema,
});
type ClericClassFeatureRecordCodec = Schema.Struct<
  typeof clericClassFeatureRecordFields
>;
export type ClericClassFeatureRecord =
  Schema.Schema.Type<ClericClassFeatureRecordCodec>;
export const ClericClassFeatureRecordSchema: ClericClassFeatureRecordCodec =
  Schema.Struct(clericClassFeatureRecordFields);

const druidClassFeatureRecordFields = codecFields({
  ...ClassFeatureRecordBaseFields,
  className: Schema.Literal("druid"),
  mechanics: DruidClassFeatureMechanicsSchema,
});
type DruidClassFeatureRecordCodec = Schema.Struct<
  typeof druidClassFeatureRecordFields
>;
export type DruidClassFeatureRecord =
  Schema.Schema.Type<DruidClassFeatureRecordCodec>;
export const DruidClassFeatureRecordSchema: DruidClassFeatureRecordCodec =
  Schema.Struct(druidClassFeatureRecordFields);

const monkClassFeatureRecordFields = codecFields({
  ...ClassFeatureRecordBaseFields,
  className: Schema.Literal("monk"),
  mechanics: MonkClassFeatureMechanicsSchema,
});
type MonkClassFeatureRecordCodec = Schema.Struct<
  typeof monkClassFeatureRecordFields
>;
export type MonkClassFeatureRecord =
  Schema.Schema.Type<MonkClassFeatureRecordCodec>;
export const MonkClassFeatureRecordSchema: MonkClassFeatureRecordCodec =
  Schema.Struct(monkClassFeatureRecordFields);

const paladinClassFeatureRecordFields = codecFields({
  ...ClassFeatureRecordBaseFields,
  className: Schema.Literal("paladin"),
  mechanics: PaladinClassFeatureMechanicsSchema,
});
type PaladinClassFeatureRecordCodec = Schema.Struct<
  typeof paladinClassFeatureRecordFields
>;
export type PaladinClassFeatureRecord =
  Schema.Schema.Type<PaladinClassFeatureRecordCodec>;
export const PaladinClassFeatureRecordSchema: PaladinClassFeatureRecordCodec =
  Schema.Struct(paladinClassFeatureRecordFields);

const rangerClassFeatureRecordFields = codecFields({
  ...ClassFeatureRecordBaseFields,
  className: Schema.Literal("ranger"),
  mechanics: RangerClassFeatureMechanicsSchema,
});
type RangerClassFeatureRecordCodec = Schema.Struct<
  typeof rangerClassFeatureRecordFields
>;
export type RangerClassFeatureRecord =
  Schema.Schema.Type<RangerClassFeatureRecordCodec>;
export const RangerClassFeatureRecordSchema: RangerClassFeatureRecordCodec =
  Schema.Struct(rangerClassFeatureRecordFields);

const rogueClassFeatureRecordFields = codecFields({
  ...ClassFeatureRecordBaseFields,
  className: Schema.Literal("rogue"),
  mechanics: RogueClassFeatureMechanicsSchema,
});
type RogueClassFeatureRecordCodec = Schema.Struct<
  typeof rogueClassFeatureRecordFields
>;
export type RogueClassFeatureRecord =
  Schema.Schema.Type<RogueClassFeatureRecordCodec>;
export const RogueClassFeatureRecordSchema: RogueClassFeatureRecordCodec =
  Schema.Struct(rogueClassFeatureRecordFields);

const sorcererClassFeatureRecordFields = codecFields({
  ...ClassFeatureRecordBaseFields,
  className: Schema.Literal("sorcerer"),
  mechanics: SorcererClassFeatureMechanicsSchema,
});
type SorcererClassFeatureRecordCodec = Schema.Struct<
  typeof sorcererClassFeatureRecordFields
>;
export type SorcererClassFeatureRecord =
  Schema.Schema.Type<SorcererClassFeatureRecordCodec>;
export const SorcererClassFeatureRecordSchema: SorcererClassFeatureRecordCodec =
  Schema.Struct(sorcererClassFeatureRecordFields);

const warlockClassFeatureRecordFields = codecFields({
  ...ClassFeatureRecordBaseFields,
  className: Schema.Literal("warlock"),
  mechanics: WarlockClassFeatureMechanicsSchema,
});
type WarlockClassFeatureRecordCodec = Schema.Struct<
  typeof warlockClassFeatureRecordFields
>;
export type WarlockClassFeatureRecord =
  Schema.Schema.Type<WarlockClassFeatureRecordCodec>;
export const WarlockClassFeatureRecordSchema: WarlockClassFeatureRecordCodec =
  Schema.Struct(warlockClassFeatureRecordFields);

const classFeatureRecordMembers = codecMembers(
  BardClassFeatureRecordSchema,
  WizardClassFeatureRecordSchema,
  BarbarianClassFeatureRecordSchema,
  FighterClassFeatureRecordSchema,
  ClericClassFeatureRecordSchema,
  DruidClassFeatureRecordSchema,
  MonkClassFeatureRecordSchema,
  PaladinClassFeatureRecordSchema,
  RangerClassFeatureRecordSchema,
  RogueClassFeatureRecordSchema,
  SorcererClassFeatureRecordSchema,
  WarlockClassFeatureRecordSchema,
);
type ClassFeatureRecordCodec = Schema.Union<typeof classFeatureRecordMembers>;
export type ClassFeatureRecord = Schema.Schema.Type<ClassFeatureRecordCodec>;
export const ClassFeatureRecordSchema: ClassFeatureRecordCodec = Schema.Union(
  classFeatureRecordMembers,
);

const subclassRecordFields = codecFields({
  ...UnitMetadataSchema.fields,
  kind: SubclassRecordKindSchema,
  className: ClassNameSchema,
  featureGrants: Schema.Array(ClassFeatureGrantSchema).pipe(
    Schema.withDecodingDefaultTypeKey(Effect.sync(() => [])),
  ),
});
type SubclassRecordCodec = Schema.Struct<typeof subclassRecordFields>;
export const SubclassRecordSchema: SubclassRecordCodec =
  Schema.Struct(subclassRecordFields);

const masteryRecordFields = codecFields({
  ...UnitMetadataSchema.fields,
  kind: Schema.Literal("mastery"),
  mechanics: MasteryMechanicsSchema,
});
type MasteryRecordCodec = Schema.Struct<typeof masteryRecordFields>;
export const MasteryRecordSchema: MasteryRecordCodec =
  Schema.Struct(masteryRecordFields);

const featMechanicsMembers = codecMembers(
  PassiveMechanicsSchema,
  ActivatedAbilityMechanicsSchema,
  MasteryOrWeaponDamageDiceRerollMechanicsSchema,
  WeaponAttackDamageDieFloorMechanicsSchema,
  LightExtraAttackDamageAbilityModifierMechanicsSchema,
  TriggeredReplacementMechanicsSchema,
  strictStruct({
    family: Schema.Literal("grappler"),
    punchAndGrab: strictStruct({
      trigger: Schema.Literal("attack_action_unarmed_strike_hit_on_turn"),
      options: Schema.Tuple([
        Schema.Literal("damage"),
        Schema.Literal("grapple"),
      ]),
      usageLimit: strictStruct({ kind: Schema.Literal("once_per_turn") }),
    }),
    attackAdvantage: strictStruct({
      mode: Schema.Literal("advantage"),
      on: Schema.Tuple([Schema.Literal("attack_roll")]),
      target: Schema.Literal("creature_grappled_by_you"),
    }),
    fastWrestler: strictStruct({
      movementCost: Schema.Literal("no_extra_grapple_drag_cost"),
      targetSize: Schema.Literal("your_size_or_smaller"),
    }),
  }),
  strictStruct({
    family: Schema.Literal("magic_initiate"),
    spellList: Schema.Literals(MAGIC_INITIATE_SPELL_LISTS),
  }),
);
type FeatMechanicsCodec = Schema.Union<typeof featMechanicsMembers>;
export type FeatMechanics = Schema.Schema.Type<FeatMechanicsCodec>;
export const FeatMechanicsSchema: FeatMechanicsCodec =
  Schema.Union(featMechanicsMembers);

const FeatAbilityScoreIncreaseAbilityScopeSchema = Schema.Union([
  strictStruct({ kind: Schema.Literal("all_abilities") }),
  strictStruct({
    kind: Schema.Literal("specific_abilities"),
    abilities: Schema.NonEmptyArray(AbilitySchema).pipe(
      Schema.check(
        Schema.makeFilter(distinctAbilities, {
          /* v8 ignore next 2 -- @preserve -- this callback only formats the diagnostic after a malformed Feat ability scope repeats an ability */
          message:
            "Feat ability score increase ability list must contain distinct abilities.",
        }),
      ),
    ),
  }),
]);

const FeatAbilityScoreIncreaseChoiceSchema = Schema.Struct({
  abilityScope: FeatAbilityScoreIncreaseAbilityScopeSchema,
  maxScore: AbilityScore,
  methods: Schema.NonEmptyArray(
    Schema.Union([
      Schema.Struct({
        kind: Schema.Literal("one_score"),
        increase: AbilityScoreIncreasePositiveIntegerSchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("two_scores"),
        primaryIncrease: AbilityScoreIncreasePositiveIntegerSchema,
        secondaryIncrease: AbilityScoreIncreasePositiveIntegerSchema,
      }),
    ]),
  ),
}).pipe(
  Schema.check(
    Schema.makeFilter(
      /* v8 ignore start -- @preserve -- a two-score Feat with fewer than two scoped abilities is malformed authored input */
      (choice) =>
        choice.methods.every(
          (method) =>
            method.kind !== "two_scores" ||
            choice.abilityScope.kind === "all_abilities" ||
            choice.abilityScope.abilities.length > 1,
        ),
      /* v8 ignore stop -- @preserve */
      {
        /* v8 ignore next 2 -- @preserve -- this callback only formats the diagnostic after a malformed two-score Feat exposes fewer than two legal abilities */
        message:
          "Feat two-score ability score increases require at least two legal abilities.",
      },
    ),
  ),
);

const featRecordFields = codecFields({
  ...UnitMetadataSchema.fields,
  kind: Schema.Literal("feat"),
  category: FeatCategorySchema,
  abilityScoreIncreaseChoice: exactOptional(
    FeatAbilityScoreIncreaseChoiceSchema,
  ),
  mechanics: FeatMechanicsSchema,
});
type FeatRecordCodec = Schema.Struct<typeof featRecordFields>;
export type FeatRecord = Schema.Schema.Type<FeatRecordCodec>;
export const FeatRecordSchema: FeatRecordCodec =
  Schema.Struct(featRecordFields);

const GnomishLineageForestMechanicsSchema = strictStruct({
  family: Schema.Literal("passive"),
  grants: Schema.Tuple([
    strictStruct({
      kind: Schema.Literal("grant_spell_access"),
      spellId: surfaceDependency(
        Schema.Literal("minor_illusion"),
        "spell-reference",
      ),
      mode: Schema.Literal("known"),
    }),
    strictStruct({
      kind: Schema.Literal("grant_spell_access"),
      spellId: surfaceDependency(
        Schema.Literal("speak_with_animals"),
        "spell-reference",
      ),
      mode: Schema.Literal("prepared"),
    }),
    strictStruct({
      kind: Schema.Literal("grant_spell_free_casts"),
      spellId: surfaceDependency(
        Schema.Literal("speak_with_animals"),
        "spell-reference",
      ),
      count: strictStruct({
        kind: Schema.Literal("proficiency_bonus"),
      }),
      resetCadence: Schema.Literal("long_rest"),
    }),
  ]),
});

const GnomishLineageRockMechanicsSchema = strictStruct({
  family: Schema.Literal("passive"),
  grants: Schema.Tuple([
    strictStruct({
      kind: Schema.Literal("grant_spell_access"),
      spellId: surfaceDependency(Schema.Literal("mending"), "spell-reference"),
      mode: Schema.Literal("known"),
    }),
    strictStruct({
      kind: Schema.Literal("grant_spell_access"),
      spellId: surfaceDependency(
        Schema.Literal("prestidigitation"),
        "spell-reference",
      ),
      mode: Schema.Literal("known"),
    }),
  ]),
});

const GnomishLineageRockClockworkDeviceSchema = strictStruct({
  creation: strictStruct({
    trigger: strictStruct({
      kind: Schema.Literal("prestidigitation_cast"),
      spellId: surfaceReference(
        Schema.Literal("prestidigitation"),
        "spell-reference",
      ),
      castingTime: strictStruct({
        amount: Schema.Literal(10),
        unit: Schema.Literal("minute"),
      }),
    }),
    object: strictStruct({
      kind: Schema.Literal("clockwork_device"),
      size: Schema.Literal("tiny"),
      armorClass: Schema.Literal(5),
      hitPoints: Schema.Literal(1),
    }),
    storedEffect: strictStruct({
      kind: Schema.Literal("one_prestidigitation_effect_chosen_at_creation"),
      optionChoicesLockedAtCreation: Schema.Literal(true),
    }),
  }),
  activation: strictStruct({
    action: Schema.Literal("bonus_action"),
    activator: Schema.Literal("self_or_another_creature"),
    contact: Schema.Literal("touch"),
  }),
  concurrentLimit: Schema.Literal(3),
  duration: strictStruct({
    amount: Schema.Literal(8),
    unit: Schema.Literal("hour"),
  }),
  dismantle: strictStruct({
    actor: Schema.Literal("creator"),
    action: Schema.Literal("utilize"),
    contact: Schema.Literal("touch"),
  }),
});

const GnomishLineageForestOptionSchema = strictStruct({
  id: surfaceIdentity(Schema.Literal("forest_gnome"), "id"),
  displayName: surfaceIdentity(Schema.Literal("Forest Gnome"), "displayName"),
  mechanics: GnomishLineageForestMechanicsSchema,
});

const GnomishLineageRockOptionSchema = strictStruct({
  id: surfaceIdentity(Schema.Literal("rock_gnome"), "id"),
  displayName: surfaceIdentity(Schema.Literal("Rock Gnome"), "displayName"),
  mechanics: GnomishLineageRockMechanicsSchema,
  clockworkDevice: GnomishLineageRockClockworkDeviceSchema,
});

const gnomishLineageMechanicsFields = codecFields({
  family: Schema.Literal("species_lineage_choice"),
  choiceKey: surfaceSchemaRole(Schema.Literal("gnome_lineage"), {
    category: "protocol",
    kind: "choiceKey",
  }),
  timing: Schema.Literal("species_selection"),
  spellcastingAbilityChoice: strictStruct({
    kind: Schema.Literal("spellcasting_ability_choice"),
    abilities: Schema.Tuple([
      Schema.Literal("int"),
      Schema.Literal("wis"),
      Schema.Literal("cha"),
    ]),
  }),
  options: Schema.Tuple([
    GnomishLineageForestOptionSchema,
    GnomishLineageRockOptionSchema,
  ]),
});
type GnomishLineageMechanicsCodec = Schema.Struct<
  typeof gnomishLineageMechanicsFields
>;
export const GnomishLineageMechanicsSchema: GnomishLineageMechanicsCodec =
  strictStruct(gnomishLineageMechanicsFields);

const d20TestNaturalOneRerollMechanicsFields = codecFields({
  family: Schema.Literal("d20_test_natural_one_reroll"),
  trigger: strictStruct({
    kind: Schema.Literal("d20_test_roll_is"),
    dieFace: Schema.Literal(1),
  }),
  reroll: strictStruct({
    kind: Schema.Literal("reroll_triggering_d20"),
    use: Schema.Literal("new_roll"),
  }),
  optional: Schema.Literal(true),
});
type D20TestNaturalOneRerollMechanicsCodec = Schema.Struct<
  typeof d20TestNaturalOneRerollMechanicsFields
>;
export const D20TestNaturalOneRerollMechanicsSchema: D20TestNaturalOneRerollMechanicsCodec =
  strictStruct(d20TestNaturalOneRerollMechanicsFields);

const creatureSpaceMovementPermissionMechanicsFields = codecFields({
  family: Schema.Literal("creature_space_movement_permission"),
  moveThrough: strictStruct({
    kind: Schema.Literal("occupied_creature_space"),
    creatureSizeRelationToSelf: Schema.Literal("larger"),
  }),
  canStopInOccupiedSpace: Schema.Literal(false),
});
type CreatureSpaceMovementPermissionMechanicsCodec = Schema.Struct<
  typeof creatureSpaceMovementPermissionMechanicsFields
>;
export const CreatureSpaceMovementPermissionMechanicsSchema: CreatureSpaceMovementPermissionMechanicsCodec =
  strictStruct(creatureSpaceMovementPermissionMechanicsFields);

const hideActionObscurementPermissionMechanicsFields = codecFields({
  family: Schema.Literal("hide_action_obscurement_permission"),
  action: Schema.Literal("hide"),
  allowedObscurement: strictStruct({
    kind: Schema.Literal("obscured_only_by_creature"),
    creatureSizeRelationToSelf: Schema.Literal("at_least_one_size_larger"),
  }),
});
type HideActionObscurementPermissionMechanicsCodec = Schema.Struct<
  typeof hideActionObscurementPermissionMechanicsFields
>;
export const HideActionObscurementPermissionMechanicsSchema: HideActionObscurementPermissionMechanicsCodec =
  strictStruct(hideActionObscurementPermissionMechanicsFields);

const restTriggeredHeroicInspirationMechanicsFields = codecFields({
  family: Schema.Literal("rest_triggered_heroic_inspiration"),
  trigger: strictStruct({
    kind: Schema.Literal("finish_rest"),
    rest: Schema.Literal("long"),
  }),
  grant: strictStruct({ kind: Schema.Literal("heroic_inspiration") }),
});
type RestTriggeredHeroicInspirationMechanicsCodec = Schema.Struct<
  typeof restTriggeredHeroicInspirationMechanicsFields
>;
export const RestTriggeredHeroicInspirationMechanicsSchema: RestTriggeredHeroicInspirationMechanicsCodec =
  strictStruct(restTriggeredHeroicInspirationMechanicsFields);

const speciesTraitMechanicsMembers = codecMembers(
  PassiveMechanicsSchema,
  ActivatedAbilityMechanicsSchema,
  TriggeredReplacementMechanicsSchema,
  GnomishLineageMechanicsSchema,
  D20TestNaturalOneRerollMechanicsSchema,
  CreatureSpaceMovementPermissionMechanicsSchema,
  HideActionObscurementPermissionMechanicsSchema,
  RestTriggeredHeroicInspirationMechanicsSchema,
);
type SpeciesTraitMechanicsCodec = Schema.Union<
  typeof speciesTraitMechanicsMembers
>;
export type SpeciesTraitMechanics =
  Schema.Schema.Type<SpeciesTraitMechanicsCodec>;
export const SpeciesTraitMechanicsSchema: SpeciesTraitMechanicsCodec =
  Schema.Union(speciesTraitMechanicsMembers);

const speciesTraitRecordFields = codecFields({
  ...UnitMetadataSchema.fields,
  kind: Schema.Literal("species_trait"),
  species: surfaceIdentity(NonEmptyStringSchema, "catalog-reference"),
  mechanics: SpeciesTraitMechanicsSchema,
});
type SpeciesTraitRecordCodec = Schema.Struct<typeof speciesTraitRecordFields>;
export type SpeciesTraitRecord = Schema.Schema.Type<SpeciesTraitRecordCodec>;
export const SpeciesTraitRecordSchema: SpeciesTraitRecordCodec = Schema.Struct(
  speciesTraitRecordFields,
);

export const BackgroundToolProficiencySchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("specific_tool"),
    toolId: surfaceProjection(NonEmptyStringSchema, "derived-reference"),
  }),
  Schema.Struct({
    kind: Schema.Literal("tool_category_choice"),
    category: Schema.Literals(["gaming_set", "artisan_tool"]),
    choose: PositiveIntegerSchema,
  }),
]);

const backgroundRecordFields = codecFields({
  ...UnitMetadataSchema.fields,
  kind: BackgroundRecordKindSchema,
  abilityScoreIncrease: BackgroundAbilityScoreIncreaseSchema,
  originFeatId: surfaceDependency(
    NonEmptyStringSchema,
    "origin-feat-reference",
  ),
  skillProficiencies: Schema.NonEmptyArray(SkillSchema),
  toolProficiency: BackgroundToolProficiencySchema,
  startingEquipment: Schema.NonEmptyArray(StartingEquipmentChoiceSchema),
});
type BackgroundRecordCodec = Schema.Struct<typeof backgroundRecordFields>;
export const BackgroundRecordSchema: BackgroundRecordCodec = Schema.Struct(
  backgroundRecordFields,
);

export const OrcSpeciesTraitsSchema = Schema.Struct({
  adrenalineRush: Schema.Literal("orc_adrenaline_rush"),
  darkvision: Schema.Literal("orc_darkvision"),
  relentlessEndurance: Schema.Literal("orc_relentless_endurance"),
});

const FixedMediumSpeciesSizeSchema = Schema.Struct({
  kind: Schema.Literal("fixed"),
  size: Schema.Literal("medium"),
});

const SmallMediumSpeciesSizeChoiceSchema = Schema.Struct({
  kind: Schema.Literal("choice"),
  options: Schema.Tuple([Schema.Literal("medium"), Schema.Literal("small")]),
});

const SpeciesSpeed30Schema = Schema.Struct({
  walkFeet: Schema.Literal(30),
});

const SpeciesSpeed35Schema = Schema.Struct({
  walkFeet: Schema.Literal(35),
});

const SpeciesRecordBaseSchema = Schema.Struct({
  ...UnitMetadataSchema.fields,
  kind: SpeciesRecordKindSchema,
  creatureType: Schema.Literal("humanoid"),
});

export const DragonbornSpeciesTraitsSchema = Schema.Struct({
  breathWeapon: Schema.Literal("species_dragonborn_breath_weapon"),
  damageResistance: Schema.Literal("species_dragonborn_damage_resistance"),
  darkvision: Schema.Literal("species_dragonborn_darkvision"),
});

const DraconicAncestryDamageTypeSourceSchema = strictStruct({
  kind: Schema.Literal("choice_table"),
  holeId: surfaceProtocol(
    Schema.Literal("species_dragonborn_draconic_ancestry_damage_type"),
    "holeId",
  ),
  label: surfaceIdentity(Schema.Literal("draconic ancestry"), "label"),
  options: Schema.Tuple([
    strictStruct({
      id: surfaceIdentity(Schema.Literal("black"), "id"),
      displayName: surfaceIdentity(Schema.Literal("Black"), "displayName"),
      damageType: Schema.Literal("acid"),
    }),
    strictStruct({
      id: surfaceIdentity(Schema.Literal("blue"), "id"),
      displayName: surfaceIdentity(Schema.Literal("Blue"), "displayName"),
      damageType: Schema.Literal("lightning"),
    }),
    strictStruct({
      id: surfaceIdentity(Schema.Literal("brass"), "id"),
      displayName: surfaceIdentity(Schema.Literal("Brass"), "displayName"),
      damageType: Schema.Literal("fire"),
    }),
    strictStruct({
      id: surfaceIdentity(Schema.Literal("bronze"), "id"),
      displayName: surfaceIdentity(Schema.Literal("Bronze"), "displayName"),
      damageType: Schema.Literal("lightning"),
    }),
    strictStruct({
      id: surfaceIdentity(Schema.Literal("copper"), "id"),
      displayName: surfaceIdentity(Schema.Literal("Copper"), "displayName"),
      damageType: Schema.Literal("acid"),
    }),
    strictStruct({
      id: surfaceIdentity(Schema.Literal("gold"), "id"),
      displayName: surfaceIdentity(Schema.Literal("Gold"), "displayName"),
      damageType: Schema.Literal("fire"),
    }),
    strictStruct({
      id: surfaceIdentity(Schema.Literal("green"), "id"),
      displayName: surfaceIdentity(Schema.Literal("Green"), "displayName"),
      damageType: Schema.Literal("poison"),
    }),
    strictStruct({
      id: surfaceIdentity(Schema.Literal("red"), "id"),
      displayName: surfaceIdentity(Schema.Literal("Red"), "displayName"),
      damageType: Schema.Literal("fire"),
    }),
    strictStruct({
      id: surfaceIdentity(Schema.Literal("silver"), "id"),
      displayName: surfaceIdentity(Schema.Literal("Silver"), "displayName"),
      damageType: Schema.Literal("cold"),
    }),
    strictStruct({
      id: surfaceIdentity(Schema.Literal("white"), "id"),
      displayName: surfaceIdentity(Schema.Literal("White"), "displayName"),
      damageType: Schema.Literal("cold"),
    }),
  ]),
});

const DraconicAncestrySchema = strictStruct({
  damageType: DraconicAncestryDamageTypeSourceSchema,
});

export const DragonbornSpeciesRecordSchema = Schema.Struct({
  ...SpeciesRecordBaseSchema.fields,
  species: Schema.Literal("dragonborn"),
  size: FixedMediumSpeciesSizeSchema,
  speed: SpeciesSpeed30Schema,
  traits: DragonbornSpeciesTraitsSchema,
  draconicAncestry: DraconicAncestrySchema,
});

export const DwarfSpeciesTraitsSchema = Schema.Struct({
  darkvision: Schema.Literal("dwarf_darkvision"),
  dwarvenResilience: Schema.Literal("dwarf_dwarven_resilience"),
  dwarvenToughness: Schema.Literal("dwarf_dwarven_toughness"),
});

export const DwarfSpeciesRecordSchema = Schema.Struct({
  ...SpeciesRecordBaseSchema.fields,
  species: Schema.Literal("dwarf"),
  size: FixedMediumSpeciesSizeSchema,
  speed: SpeciesSpeed30Schema,
  traits: DwarfSpeciesTraitsSchema,
});

export const ElfSpeciesTraitsSchema = Schema.Struct({
  darkvision: Schema.Literal("elf_darkvision"),
});

export const ElfSpeciesRecordSchema = Schema.Struct({
  ...SpeciesRecordBaseSchema.fields,
  species: Schema.Literal("elf"),
  size: FixedMediumSpeciesSizeSchema,
  speed: SpeciesSpeed30Schema,
  traits: ElfSpeciesTraitsSchema,
});

export const GnomeSpeciesTraitsSchema = Schema.Struct({
  darkvision: Schema.Literal("species_gnome_darkvision"),
  gnomishCunning: Schema.Literal("species_gnome_gnomish_cunning"),
  gnomishLineage: Schema.Literal("species_gnome_gnomish_lineage"),
});

const FixedSmallSpeciesSizeSchema = Schema.Struct({
  kind: Schema.Literal("fixed"),
  size: Schema.Literal("small"),
});

export const GnomeSpeciesRecordSchema = Schema.Struct({
  ...SpeciesRecordBaseSchema.fields,
  species: Schema.Literal("gnome"),
  size: FixedSmallSpeciesSizeSchema,
  speed: SpeciesSpeed30Schema,
  traits: GnomeSpeciesTraitsSchema,
});

export const HalflingSpeciesTraitsSchema = Schema.Struct({
  brave: Schema.Literal("species_halfling_brave"),
  halflingNimbleness: Schema.Literal("species_halfling_nimbleness"),
  luck: Schema.Literal("species_halfling_luck"),
  naturallyStealthy: Schema.Literal("species_halfling_naturally_stealthy"),
});

export const HalflingSpeciesRecordSchema = Schema.Struct({
  ...SpeciesRecordBaseSchema.fields,
  species: Schema.Literal("halfling"),
  size: FixedSmallSpeciesSizeSchema,
  speed: SpeciesSpeed30Schema,
  traits: HalflingSpeciesTraitsSchema,
});

export const HumanSpeciesTraitsSchema = Schema.Struct({
  resourceful: Schema.Literal("species_human_resourceful"),
  skillful: Schema.Literal("species_human_skillful"),
  versatile: Schema.Literal("species_human_versatile"),
});

export const HumanSpeciesRecordSchema = Schema.Struct({
  ...SpeciesRecordBaseSchema.fields,
  species: Schema.Literal("human"),
  size: SmallMediumSpeciesSizeChoiceSchema,
  speed: SpeciesSpeed30Schema,
  traits: HumanSpeciesTraitsSchema,
});

export const GoliathSpeciesTraitsSchema = Schema.Struct({
  powerfulBuild: Schema.Literal("species_goliath_powerful_build"),
});

export const GoliathSpeciesRecordSchema = Schema.Struct({
  ...SpeciesRecordBaseSchema.fields,
  species: Schema.Literal("goliath"),
  size: FixedMediumSpeciesSizeSchema,
  speed: SpeciesSpeed35Schema,
  traits: GoliathSpeciesTraitsSchema,
});

export const OrcSpeciesRecordSchema = Schema.Struct({
  ...SpeciesRecordBaseSchema.fields,
  species: Schema.Literal("orc"),
  size: FixedMediumSpeciesSizeSchema,
  speed: SpeciesSpeed30Schema,
  traits: OrcSpeciesTraitsSchema,
});

export const TieflingSpeciesTraitsSchema = Schema.Struct({
  darkvision: Schema.Literal("species_tiefling_darkvision"),
});

export const TieflingSpeciesRecordSchema = Schema.Struct({
  ...SpeciesRecordBaseSchema.fields,
  species: Schema.Literal("tiefling"),
  size: SmallMediumSpeciesSizeChoiceSchema,
  speed: SpeciesSpeed30Schema,
  traits: TieflingSpeciesTraitsSchema,
});

const speciesRecordMembers = codecMembers(
  DragonbornSpeciesRecordSchema,
  DwarfSpeciesRecordSchema,
  ElfSpeciesRecordSchema,
  GnomeSpeciesRecordSchema,
  HalflingSpeciesRecordSchema,
  HumanSpeciesRecordSchema,
  GoliathSpeciesRecordSchema,
  OrcSpeciesRecordSchema,
  TieflingSpeciesRecordSchema,
);
type SpeciesRecordCodec = Schema.Union<typeof speciesRecordMembers>;
export const SpeciesRecordSchema: SpeciesRecordCodec =
  Schema.Union(speciesRecordMembers);

const magicItemComponentMechanicsMembers = codecMembers(
  PassiveMechanicsSchema,
  ActivatedAbilityMechanicsSchema,
  TriggeredReactionAbilityMechanicsSchema,
  MasteryOrWeaponDamageDiceRerollMechanicsSchema,
  MagicItemSpawnedCreatureMechanicsSchema,
);
type MagicItemComponentMechanicsCodec = Schema.Union<
  typeof magicItemComponentMechanicsMembers
>;
export type MagicItemComponentMechanics =
  Schema.Schema.Type<MagicItemComponentMechanicsCodec>;
export const MagicItemComponentMechanicsSchema: MagicItemComponentMechanicsCodec =
  Schema.Union(magicItemComponentMechanicsMembers);

const compositeMagicItemMechanicsFields = codecFields({
  family: Schema.Literal("composite"),
  parts: Schema.NonEmptyArray(MagicItemComponentMechanicsSchema),
});
type CompositeMagicItemMechanicsCodec = Schema.Struct<
  typeof compositeMagicItemMechanicsFields
>;
export type CompositeMagicItemMechanics =
  Schema.Schema.Type<CompositeMagicItemMechanicsCodec>;
export const CompositeMagicItemMechanicsSchema: CompositeMagicItemMechanicsCodec =
  Schema.Struct(compositeMagicItemMechanicsFields);

const magicItemMechanicsMembers = codecMembers(
  MagicItemComponentMechanicsSchema,
  CompositeMagicItemMechanicsSchema,
);
type MagicItemMechanicsCodec = Schema.Union<typeof magicItemMechanicsMembers>;
export type MagicItemMechanics = Schema.Schema.Type<MagicItemMechanicsCodec>;
export const MagicItemMechanicsSchema: MagicItemMechanicsCodec = Schema.Union(
  magicItemMechanicsMembers,
);

const magicItemAttunementRestrictionMembers = codecMembers(
  Schema.Struct({ kind: Schema.Literal("spellcaster") }),
  Schema.Struct({
    kind: Schema.Literal("class_list"),
    classes: Schema.NonEmptyArray(ClassNameSchema),
  }),
);
type MagicItemAttunementRestrictionCodec = Schema.Union<
  typeof magicItemAttunementRestrictionMembers
>;
export const MagicItemAttunementRestrictionSchema: MagicItemAttunementRestrictionCodec =
  Schema.Union(magicItemAttunementRestrictionMembers);

const itemDestructionPolicyMembers = codecMembers(
  strictStruct({ kind: Schema.Literal("none") }),
  Schema.Struct({ kind: Schema.Literal("becomes_nonmagical_on_hit") }),
  Schema.Struct({
    kind: Schema.Literal("last_charge_roll"),
    die: Schema.Number,
    destroyOn: Schema.Number,
  }),
  Schema.Struct({ kind: Schema.Literal("permanent_on_empty") }),
);
type ItemDestructionPolicyCodec = Schema.Union<
  typeof itemDestructionPolicyMembers
>;
export const ItemDestructionPolicySchema: ItemDestructionPolicyCodec =
  Schema.Union(itemDestructionPolicyMembers);

const magicItemAttunementMembers = codecMembers(
  Schema.Struct({ requiresAttunement: Schema.Literal(false) }),
  Schema.Struct({
    requiresAttunement: Schema.Literal(true),
    attunementRestriction: exactOptional(MagicItemAttunementRestrictionSchema),
  }),
);
type MagicItemAttunementCodec = Schema.Union<typeof magicItemAttunementMembers>;
export const MagicItemAttunementSchema: MagicItemAttunementCodec = Schema.Union(
  magicItemAttunementMembers,
);

const magicItemVariantFields = codecFields({
  id: surfaceIdentity(NonEmptyStringSchema, "id"),
  name: surfaceIdentity(NonEmptyStringSchema, "name"),
  description: exactOptional(surfaceProse(Schema.String)),
  rarity: MagicItemRaritySchema,
  mechanics: MagicItemMechanicsSchema,
  destruction: ItemDestructionPolicySchema,
  attunementOverride: exactOptional(MagicItemAttunementSchema),
});
type MagicItemVariantCodec = Schema.Struct<typeof magicItemVariantFields>;
export type MagicItemVariant = Schema.Schema.Type<MagicItemVariantCodec>;
export const MagicItemVariantSchema: MagicItemVariantCodec = Schema.Struct(
  magicItemVariantFields,
);

const MagicItemWithoutAttunementRecordSchema = Schema.Struct({
  ...UnitMetadataSchema.fields,
  kind: Schema.Literal("magic_item"),
  rarity: MagicItemRaritySchema,
  mechanics: MagicItemMechanicsSchema,
  destruction: ItemDestructionPolicySchema,
  requiresAttunement: Schema.Literal(false),
});
const MagicItemWithAttunementRecordSchema = Schema.Struct({
  ...UnitMetadataSchema.fields,
  kind: Schema.Literal("magic_item"),
  rarity: MagicItemRaritySchema,
  mechanics: MagicItemMechanicsSchema,
  destruction: ItemDestructionPolicySchema,
  requiresAttunement: Schema.Literal(true),
  attunementRestriction: exactOptional(MagicItemAttunementRestrictionSchema),
});
const MagicItemVariantCollectionRecordSchema = Schema.Struct({
  ...UnitMetadataSchema.fields,
  kind: Schema.Literal("magic_item"),
  defaultAttunement: MagicItemAttunementSchema,
  variants: Schema.NonEmptyArray(MagicItemVariantSchema),
});

const magicItemRecordMembers = codecMembers(
  MagicItemWithoutAttunementRecordSchema,
  MagicItemWithAttunementRecordSchema,
  MagicItemVariantCollectionRecordSchema,
);
type MagicItemRecordCodec = Schema.Union<typeof magicItemRecordMembers>;
export type MagicItemRecord = Schema.Schema.Type<MagicItemRecordCodec>;
export const MagicItemRecordSchema: MagicItemRecordCodec = Schema.Union(
  magicItemRecordMembers,
);

const magicEquipmentTraitFields = codecFields({
  rarity: MagicItemRaritySchema,
  attunement: MagicItemAttunementSchema,
  mechanics: MagicItemMechanicsSchema,
  destruction: ItemDestructionPolicySchema,
});
type MagicEquipmentTraitCodec = Schema.Struct<typeof magicEquipmentTraitFields>;
export type MagicEquipmentTrait = Schema.Schema.Type<MagicEquipmentTraitCodec>;
export const MagicEquipmentTraitSchema: MagicEquipmentTraitCodec =
  Schema.Struct(magicEquipmentTraitFields);

const magicEquipmentVariantFields = codecFields({
  id: surfaceIdentity(NonEmptyStringSchema, "id"),
  name: surfaceIdentity(NonEmptyStringSchema, "name"),
  description: exactOptional(surfaceProse(Schema.String)),
  magic: MagicEquipmentTraitSchema,
});
type MagicEquipmentVariantCodec = Schema.Struct<
  typeof magicEquipmentVariantFields
>;
export type MagicEquipmentVariant =
  Schema.Schema.Type<MagicEquipmentVariantCodec>;
export const MagicEquipmentVariantSchema: MagicEquipmentVariantCodec =
  Schema.Struct(magicEquipmentVariantFields);

const armorRecordBaseFields = {
  ...UnitMetadataSchema.fields,
  kind: Schema.Literal("armor"),
  strengthRequirement: exactOptional(Schema.Number),
  stealthDisadvantage: exactOptional(Schema.Literal(true)),
  weightPounds: Schema.Number,
  costGp: Schema.Number,
  donDoff: Schema.Struct({
    donMinutes: Schema.Number,
    doffMinutes: Schema.Number,
  }),
};

const armorRecordMembers = codecMembers(
  Schema.Struct({
    ...armorRecordBaseFields,
    category: Schema.Literal("light"),
    acFormula: LightArmorAcFormulaSchema,
  }),
  Schema.Struct({
    ...armorRecordBaseFields,
    category: Schema.Literal("medium"),
    acFormula: MediumArmorAcFormulaSchema,
  }),
  Schema.Struct({
    ...armorRecordBaseFields,
    category: Schema.Literal("heavy"),
    acFormula: HeavyArmorAcFormulaSchema,
  }),
);
type ArmorRecordCodec = Schema.Union<typeof armorRecordMembers>;
export const ArmorRecordSchema: ArmorRecordCodec =
  Schema.Union(armorRecordMembers);

const armorTemplateRecordFields = codecFields({
  ...UnitMetadataSchema.fields,
  kind: Schema.Literal("armor_template"),
  template: Schema.Literal("any_armor_magic"),
  armorApplicability: Schema.Struct({
    kind: Schema.Literal("any_armor"),
    categories: Schema.NonEmptyArray(ArmorCategorySchema),
    excludedArmorIds: exactOptional(
      Schema.Array(
        surfaceReference(NonEmptyStringSchema, "excluded-armor-reference"),
      ),
    ),
  }),
  variants: Schema.NonEmptyArray(MagicEquipmentVariantSchema),
});
type ArmorTemplateRecordCodec = Schema.Struct<typeof armorTemplateRecordFields>;
export type ArmorTemplateRecord = Schema.Schema.Type<ArmorTemplateRecordCodec>;
export const ArmorTemplateRecordSchema: ArmorTemplateRecordCodec =
  Schema.Struct(armorTemplateRecordFields);

const shieldRecordBaseFields = {
  ...UnitMetadataSchema.fields,
  kind: Schema.Literal("shield"),
  armorClassProjection: Schema.Struct({
    kind: Schema.Literal("trained_shield_bonus"),
    handUse: Schema.Literal("shield"),
    trainingRequired: Schema.Literal("shield"),
    bonus: Schema.Number,
  }),
  weightPounds: Schema.Number,
  costGp: Schema.Number,
  donDoff: Schema.Struct({
    action: Schema.Literal("utilize"),
  }),
};

const shieldRecordMembers = codecMembers(Schema.Struct(shieldRecordBaseFields));
type ShieldRecordCodec = Schema.Union<typeof shieldRecordMembers>;
export const ShieldRecordSchema: ShieldRecordCodec =
  Schema.Union(shieldRecordMembers);

const shieldTemplateRecordFields = codecFields({
  ...UnitMetadataSchema.fields,
  kind: Schema.Literal("shield_template"),
  template: Schema.Literal("shield_magic"),
  armorClassProjection: Schema.Struct({
    kind: Schema.Literal("trained_shield_bonus"),
    handUse: Schema.Literal("shield"),
    trainingRequired: Schema.Literal("shield"),
    bonus: Schema.Number,
  }),
  weightPounds: Schema.Number,
  costGp: Schema.Number,
  donDoff: Schema.Struct({
    action: Schema.Literal("utilize"),
  }),
  variants: Schema.NonEmptyArray(MagicEquipmentVariantSchema),
});
type ShieldTemplateRecordCodec = Schema.Struct<
  typeof shieldTemplateRecordFields
>;
export type ShieldTemplateRecord =
  Schema.Schema.Type<ShieldTemplateRecordCodec>;
export const ShieldTemplateRecordSchema: ShieldTemplateRecordCodec =
  Schema.Struct(shieldTemplateRecordFields);

const weaponTemplateRecordFields = codecFields({
  ...UnitMetadataSchema.fields,
  kind: Schema.Literal("weapon_template"),
  template: Schema.Literals(["any_weapon_magic", "ammunition_magic"]),
  ammunitionQuantity: exactOptional(
    Schema.Struct({
      kind: Schema.Literal("typically_found_or_sold"),
      counts: Schema.NonEmptyArray(Schema.Number),
      valueEquivalence: Schema.Struct({
        count: Schema.Number,
        item: Schema.Literal("potion_of_same_rarity"),
      }),
    }),
  ),
  weaponApplicability: Schema.Union([
    Schema.Struct({
      kind: Schema.Literal("any_weapon"),
      categories: Schema.NonEmptyArray(WeaponCategorySchema),
    }),
    Schema.Struct({
      kind: Schema.Literal("any_melee_weapon"),
    }),
    Schema.Struct({
      kind: Schema.Literal("ammunition"),
    }),
  ]),
  variants: Schema.NonEmptyArray(MagicEquipmentVariantSchema),
});
type WeaponTemplateRecordCodec = Schema.Struct<
  typeof weaponTemplateRecordFields
>;
export type WeaponTemplateRecord =
  Schema.Schema.Type<WeaponTemplateRecordCodec>;
export const WeaponTemplateRecordSchema: WeaponTemplateRecordCodec =
  Schema.Struct(weaponTemplateRecordFields);

const weaponRecordFields = codecFields({
  ...UnitMetadataSchema.fields,
  kind: Schema.Literal("weapon"),
  attachedWeaponAttackOverrideEligibility: exactOptional(
    Schema.Struct({ kind: Schema.Literal("clubOrQuarterstaff") }),
  ),
  category: WeaponCategorySchema,
  usage: WeaponUsageSchema,
  damage: WeaponDamageSchema,
  properties: exactOptional(Schema.Array(WeaponPropertyDetailSchema)),
  masteryUnitId: surfaceReference(NonEmptyStringSchema, "mastery-reference"),
  weightPounds: exactOptional(Schema.Number),
  costGp: Schema.Number,
});
type WeaponRecordCodec = Schema.Struct<typeof weaponRecordFields>;
export const WeaponRecordSchema: WeaponRecordCodec =
  Schema.Struct(weaponRecordFields);

// Keep this tuple as the single concrete-member source for UnitRecord and all
// provenance/publication specializations. Category unions above remain useful
// to their own callers, but expanding them here prevents fields added by a
// specialization from widening away member-level checks.
export const UNIT_RECORD_MEMBER_SCHEMAS = [
  SpellRecordSchema,
  ...NonWizardClassRecordSchema.members,
  WizardClassRecordSchema,
  SubclassRecordSchema,
  BardClassFeatureRecordSchema,
  WizardClassFeatureRecordSchema,
  BarbarianClassFeatureRecordSchema,
  FighterClassFeatureRecordSchema,
  ClericClassFeatureRecordSchema,
  DruidClassFeatureRecordSchema,
  MonkClassFeatureRecordSchema,
  PaladinClassFeatureRecordSchema,
  RangerClassFeatureRecordSchema,
  RogueClassFeatureRecordSchema,
  SorcererClassFeatureRecordSchema,
  WarlockClassFeatureRecordSchema,
  BackgroundRecordSchema,
  MasteryRecordSchema,
  FeatRecordSchema,
  ...SpeciesRecordSchema.members,
  SpeciesTraitRecordSchema,
  MagicItemWithoutAttunementRecordSchema,
  MagicItemWithAttunementRecordSchema,
  MagicItemVariantCollectionRecordSchema,
  ...ArmorRecordSchema.members,
  ArmorTemplateRecordSchema,
  ...ShieldRecordSchema.members,
  ShieldTemplateRecordSchema,
  WeaponTemplateRecordSchema,
  WeaponRecordSchema,
] as const;

type UnitRecordCodec = Schema.Union<typeof UNIT_RECORD_MEMBER_SCHEMAS>;
export type UnitRecord = Schema.Schema.Type<UnitRecordCodec>;

export const UnitRecordSchema: UnitRecordCodec = Schema.Union(
  UNIT_RECORD_MEMBER_SCHEMAS,
).pipe(Schema.annotate({ identifier: "UnitRecord" }));
