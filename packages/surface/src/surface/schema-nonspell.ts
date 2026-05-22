import { Schema } from "effect";
import type { ClassName } from "@dnd/shared/game-facts";

import {
  AbilitySchema,
  AlternateActionCostSchema,
  ArmorCategorySchema,
  ArmorTrainingCategorySchema,
  BackgroundRecordKindSchema,
  ClassLevelChoiceCountSchema,
  ClassRecordKindSchema,
  CLASS_NAMES,
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
  ToolProficiencyGrantSchema,
  WeaponProficiencySchema,
  WeaponCategorySchema,
  WeaponDamageSchema,
  WeaponMasteryNameSchema,
  WeaponPropertyDetailSchema,
  WeaponUsageSchema,
} from "./schema-base.ts";
import { exactOptional, strictStruct } from "./schema-helpers.ts";
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
  SpellRecordSchema,
  SpawnedCreatureStatBlockSchema,
} from "./schema-spell.ts";

const NonEmptyStringSchema = Schema.NonEmptyTrimmedString;

const NonNegativeIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
);

const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
);

const FONT_OF_MAGIC_CREATED_SPELL_SLOT_LEVELS = [
  1, 2, 3, 4, 5,
] as const satisfies ReadonlyArray<(typeof SPELL_SLOT_LEVELS)[number]>;
const FontOfMagicCreatedSpellSlotLevelSchema = Schema.Literal(
  ...FONT_OF_MAGIC_CREATED_SPELL_SLOT_LEVELS,
);

const GENERAL_CLASS_FEATURE_RECORD_CLASS_NAMES = CLASS_NAMES.filter(
  (
    className,
  ): className is Exclude<
    ClassName,
    "druid" | "fighter" | "monk" | "sorcerer" | "wizard" | "warlock"
  > =>
    className !== "druid" &&
    className !== "fighter" &&
    className !== "monk" &&
    className !== "sorcerer" &&
    className !== "wizard" &&
    className !== "warlock",
  // Brands and literal unions are erased at runtime; the filter above removes
  // exactly the excluded class names, and Schema.Literal requires a non-empty
  // tuple rather than a narrowed readonly array.
) as unknown as readonly [
  Exclude<
    ClassName,
    "druid" | "fighter" | "monk" | "sorcerer" | "wizard" | "warlock"
  >,
  ...Array<
    Exclude<
      ClassName,
      "druid" | "fighter" | "monk" | "sorcerer" | "wizard" | "warlock"
    >
  >,
];

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

const FiniteResourceCapSchema = Schema.Union(
  FixedCountCapSchema,
  ThresholdCountCapSchema,
  LinearCountCapSchema,
  Schema.Struct({ kind: Schema.Literal("proficiency_bonus") }),
  AbilityModifierCapSchema,
);

export const ClassFeatureActivationCostSchema = Schema.Union(
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

export const UseCountCapSchema = Schema.Union(
  FiniteResourceCapSchema,
  Schema.Struct({ kind: Schema.Literal("unlimited") }),
);

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
  poolId: NonEmptyStringSchema,
  cap: FiniteResourceCapSchema,
});

export const ActivationResourceSchema = Schema.Union(
  UseCountResourceSchema,
  ChargePoolResourceSchema,
);

const OngoingFeatureExtensionTriggerSchema = Schema.Literal(
  "attack_roll_against_enemy",
  "bonus_action",
  "enemy_saving_throw",
);

const OngoingFeatureLifecycleSchema = Schema.Union(
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
      unit: Schema.Literal("round", "minute", "hour", "day"),
      amount: PositiveIntegerSchema,
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("fixed_duration"),
    duration: Schema.Struct({
      unit: Schema.Literal("round", "minute", "hour", "day"),
      amount: PositiveIntegerSchema,
    }),
    earlyEndConditions: exactOptional(Schema.Array(ConditionSchema)),
    earlyEndArmorCategories: exactOptional(Schema.Array(ArmorCategorySchema)),
  }),
);

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

export const RelativeDayResetTriggerSchema = Schema.Literal(
  "resource_spent",
  "resource_empty",
);

export const RestResetCadenceSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("short_or_long_rest") }),
  Schema.Struct({ kind: Schema.Literal("long_rest") }),
  Schema.Struct({ kind: Schema.Literal("short_rest") }),
  Schema.Struct({
    kind: Schema.Literal("partial_short_full_long"),
    shortRestRefill: Schema.Number,
  }),
);

export const TimeResetCadenceSchema = Schema.Union(
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
);

export const ResetCadenceSchema = Schema.Union(
  RestResetCadenceSchema,
  TimeResetCadenceSchema,
);

export const RiderExpirySchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("target_uses_or_turn_start") }),
  Schema.Struct({ kind: Schema.Literal("end_of_next_turn") }),
  Schema.Struct({ kind: Schema.Literal("caster_turn_start") }),
);

const weaponKindSchema = Schema.Literal(
  "ranged",
  "melee_two_handed",
  "melee_one_handed",
  "two_weapons",
);

const baseEquipmentPredicateSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("holding_item") }),
  Schema.Struct({ kind: Schema.Literal("peering_through_item") }),
  Schema.Struct({ kind: Schema.Literal("wearing_item") }),
  Schema.Struct({ kind: Schema.Literal("unarmored") }),
  Schema.Struct({ kind: Schema.Literal("unarmed_or_monk_weapons_only") }),
  Schema.Struct({
    kind: Schema.Literal("wearing_armor"),
    categories: Schema.Array(Schema.Literal("light", "medium", "heavy")),
  }),
  Schema.Struct({
    kind: Schema.Literal("not_wearing_armor"),
    categories: Schema.Array(Schema.Literal("light", "medium", "heavy")),
  }),
  Schema.Struct({
    kind: Schema.Literal("wielding_weapon"),
    weaponKind: weaponKindSchema,
  }),
  Schema.Struct({ kind: Schema.Literal("not_wielding_shield") }),
);

export const EquipmentPredicateSchema = Schema.suspend(() =>
  Schema.Union(
    Schema.Struct({ kind: Schema.Literal("always") }),
    baseEquipmentPredicateSchema,
    Schema.Struct({
      kind: Schema.Literal("all_of"),
      predicates: Schema.NonEmptyArray(baseEquipmentPredicateSchema),
    }),
  ),
);

export const PassiveSuppressorSchema = Schema.Struct({
  kind: Schema.Literal("condition_active"),
  conditions: Schema.NonEmptyArray(ConditionSchema),
});

export const PassiveOperationSchema = Schema.Struct({
  trigger: Schema.Struct({
    kind: Schema.Literal("elapsed_time"),
    unit: Schema.Literal("hour", "day"),
    amount: Schema.Number,
  }),
  predicate: exactOptional(Schema.suspend(() => OngoingPredicateSchema)),
  effect: EffectAtomSchema,
});

export const ClassFeatureDurationSchema = Schema.Union(
  DurationSchema,
  Schema.Struct({
    kind: Schema.Literal("timed"),
    value: HalfClassLevelRoundedDownHoursDurationValueSchema,
    earlyEnd: exactOptional(Schema.NonEmptyArray(DurationEndTriggerSchema)),
  }),
);

const ActivatedAbilityBaseFields = {
  condition: exactOptional(EquipmentPredicateSchema),
  range: exactOptional(RangeSchema),
  usageLimit: exactOptional(
    Schema.Struct({ kind: Schema.Literal("once_per_turn") }),
  ),
};
const ResourceActivatedAbilityFields = {
  ...ActivatedAbilityBaseFields,
  resource: ActivationResourceSchema,
  resetCadence: ResetCadenceSchema,
  duration: exactOptional(ClassFeatureDurationSchema),
};
const ResourceOngoingFeatureAbilityFields = {
  ...ActivatedAbilityBaseFields,
  resource: ActivationResourceSchema,
  resetCadence: ResetCadenceSchema,
  duration: exactOptional(Schema.Never),
};
const ResourcelessOngoingFeatureAbilityFields = {
  ...ActivatedAbilityBaseFields,
  resource: exactOptional(Schema.Never),
  resetCadence: exactOptional(Schema.Never),
  duration: exactOptional(Schema.Never),
};
export const ActivatedAbilityMechanicsSchema = Schema.Union(
  Schema.Struct({
    ...ResourceActivatedAbilityFields,
    activationCost: ClassFeatureActivationCostSchema,
    ongoingFeature: exactOptional(Schema.Never),
    family: Schema.Literal("activation"),
    phases: Schema.NonEmptyArray(ActivationPhaseSchema),
  }),
  Schema.Struct({
    ...ResourceOngoingFeatureAbilityFields,
    activationCost: Schema.Struct({
      kind: Schema.Literal("bonus_action"),
      action: exactOptional(StandardActionKindSchema),
    }),
    ongoingFeature: ActivationCostOngoingFeatureSupportSchema,
    family: Schema.Literal("activation"),
    phases: Schema.NonEmptyArray(ActivationPhaseSchema),
  }),
  Schema.Struct({
    ...ResourcelessOngoingFeatureAbilityFields,
    activationCost: Schema.Struct({ kind: Schema.Literal("free") }),
    ongoingFeature: FirstAttackRollOngoingFeatureSupportSchema,
    family: Schema.Literal("activation"),
    phases: Schema.NonEmptyArray(ActivationPhaseSchema),
  }),
);

export const TriggeredReactionAbilityMechanicsSchema = Schema.Struct({
  condition: exactOptional(EquipmentPredicateSchema),
  resource: ActivationResourceSchema,
  resetCadence: ResetCadenceSchema,
  duration: exactOptional(ClassFeatureDurationSchema),
  usageLimit: exactOptional(
    Schema.Struct({ kind: Schema.Literal("once_per_turn") }),
  ),
  family: Schema.Literal("triggered_reaction"),
  activationCost: Schema.Struct({
    kind: Schema.Literal("reaction"),
    trigger: exactOptional(ReactionTriggerSchema),
  }),
  range: RangeSchema,
  interruptsTrigger: Schema.Boolean,
  phases: Schema.NonEmptyArray(ActivationPhaseSchema),
});

const MagicItemSpawnedCreaturePayloadSchema = Schema.Struct({
  creature: SpawnedCreatureStatBlockSchema,
  mode: exactOptional(CreatureModeSchema),
  control: CreatureControlSchema,
  dismissal: CreatureDismissalSchema,
});

export const MagicItemSpawnedCreatureMechanicsSchema = Schema.Struct({
  ...ResourceActivatedAbilityFields,
  activationCost: ClassFeatureActivationCostSchema,
  ...MagicItemSpawnedCreaturePayloadSchema.fields,
  family: Schema.Literal("spawned_creature"),
  range: RangeSchema,
});

export const ClassFeatureActivationMechanicsSchema =
  ActivatedAbilityMechanicsSchema;

export const AlternateActionCostMechanicsSchema = Schema.Struct({
  family: Schema.Literal("alternate_action_cost"),
  ...AlternateActionCostSchema.fields,
});

const BuildTimeFeatureChoiceChangeSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("never") }),
  Schema.Struct({
    kind: Schema.Literal("class_level"),
    count: PositiveIntegerSchema,
  }),
);

const FeatureChoiceSelectionRepeatabilitySchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("unique") }),
  Schema.Struct({
    kind: Schema.Literal("per_option"),
    default: Schema.Literal("once"),
    repeatableWhen: Schema.Struct({
      kind: Schema.Literal("option_description_repeatable_clause"),
    }),
  }),
);

export const ClassFeatureAcquisitionChoiceMechanicsSchema = Schema.Struct({
  family: Schema.Literal("class_feature_acquisition_choice"),
  choiceKey: NonEmptyStringSchema,
  timing: Schema.Literal("class_feature_acquisition"),
  options: Schema.NonEmptyArray(
    Schema.Struct({
      id: NonEmptyStringSchema,
      displayName: NonEmptyStringSchema,
      mechanics: Schema.suspend(() => PassiveMechanicsSchema),
    }),
  ),
});

export const ClassFeatureEffectSaveDcSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("class_spellcasting_spell_save_dc"),
  }),
  Schema.Struct({
    kind: Schema.Literal("class_feature_ability_save_dc"),
    base: Schema.Literal(8),
    ability: AbilitySchema,
  }),
);

export const ClassFeatureResourceContainerMechanicsSchema = Schema.Struct({
  family: Schema.Literal("resource_container"),
  resource: ActivationResourceSchema,
  resetCadence: ResetCadenceSchema,
  optionSet: Schema.Struct({
    choiceKey: NonEmptyStringSchema,
    timing: Schema.Literal("resource_use"),
    initialOptions: Schema.NonEmptyArray(
      Schema.Struct({
        id: NonEmptyStringSchema,
        displayName: NonEmptyStringSchema,
        battleExecution: exactOptional(
          Schema.Union(
            Schema.Struct({
              kind: Schema.Literal("bonus_action_unarmed_strike_sequence"),
              focusPointCost: Schema.Literal(1),
              strikeCount: Schema.Literal(2),
            }),
            Schema.Struct({
              kind: Schema.Literal("bonus_action_defensive_modes"),
              freeAction: Schema.Literal("disengage"),
              focusPointCost: Schema.Literal(1),
              focusActions: Schema.Tuple(
                Schema.Literal("disengage"),
                Schema.Literal("dodge"),
              ),
            }),
            Schema.Struct({
              kind: Schema.Literal("bonus_action_mobility_modes"),
              freeAction: Schema.Literal("dash"),
              focusPointCost: Schema.Literal(1),
              focusActions: Schema.Tuple(
                Schema.Literal("disengage"),
                Schema.Literal("dash"),
              ),
              jumpDistanceMultiplier: Schema.Struct({
                multiplier: Schema.Literal(2),
                expires: Schema.Literal("end_of_turn"),
              }),
            }),
          ),
        ),
      }),
    ),
  }),
  effectSaveDc: exactOptional(ClassFeatureEffectSaveDcSchema),
});

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
  Schema.filter(distinctSpellSlotCreationLevels, {
    message: () =>
      "Point-pool Spell Slot creation options must have distinct Spell Slot levels.",
  }),
);

export const PointPoolToSpellSlotOperationSchema = Schema.Struct({
  kind: Schema.Literal("point_pool_to_spell_slot"),
  activationCost: Schema.Struct({ kind: Schema.Literal("bonus_action") }),
  createdSlotExpiry: Schema.Struct({ kind: Schema.Literal("long_rest") }),
  options: ResourcePoolSpellSlotCreationOptionsSchema,
});

export const ResourcePoolOperationSchema = Schema.Union(
  SpellSlotToPointPoolOperationSchema,
  PointPoolToSpellSlotOperationSchema,
);

export const ClassFeatureResourcePoolMechanicsSchema = Schema.Struct({
  family: Schema.Literal("resource_pool"),
  resource: PointPoolResourceSchema,
  resetCadence: RestResetCadenceSchema,
  operations: Schema.NonEmptyArray(ResourcePoolOperationSchema),
});

export const FeatureChoiceMechanicsSchema = Schema.Union(
  Schema.Struct({
    family: Schema.Literal("feature_choice"),
    choiceKey: Schema.Literal("eldritch_invocations"),
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

const MetamagicChoiceLevelSchema = Schema.Struct({
  atLevel: PositiveIntegerSchema,
  total: PositiveIntegerSchema,
});

const METAMAGIC_CHOICE_LEVELS = [
  { atLevel: 2, total: 2 },
  { atLevel: 10, total: 4 },
  { atLevel: 17, total: 6 },
] as const satisfies ReadonlyArray<
  Schema.Schema.Type<typeof MetamagicChoiceLevelSchema>
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
  Schema.filter(metamagicChoiceCountMatchesSorcererTable, {
    message: () =>
      "Sorcerer Metamagic option totals must match the SRD Sorcerer Features table.",
  }),
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
const CanCombineMetamagicStackingSchema = Schema.Literal(
  "can_combine_with_different_metamagic",
);
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

const MetamagicOptionSchema = Schema.Union(
  Schema.Struct({
    id: Schema.Literal("sorcerer_careful_spell"),
    displayName: Schema.Literal("Careful Spell"),
    sorceryPointCost: Schema.Literal(1),
    stackingMode: OnePerSpellMetamagicStackingSchema,
    effectKind: Schema.Literal(CAREFUL_SPELL_METAMAGIC_EFFECT_KIND),
  }),
  Schema.Struct({
    id: Schema.Literal("sorcerer_distant_spell"),
    displayName: Schema.Literal("Distant Spell"),
    sorceryPointCost: Schema.Literal(1),
    stackingMode: OnePerSpellMetamagicStackingSchema,
    effectKind: Schema.Literal(DISTANT_SPELL_METAMAGIC_EFFECT_KIND),
  }),
  Schema.Struct({
    id: Schema.Literal("sorcerer_empowered_spell"),
    displayName: Schema.Literal("Empowered Spell"),
    sorceryPointCost: Schema.Literal(1),
    stackingMode: CanCombineMetamagicStackingSchema,
    effectKind: Schema.Literal(EMPOWERED_SPELL_METAMAGIC_EFFECT_KIND),
  }),
  Schema.Struct({
    id: Schema.Literal("sorcerer_extended_spell"),
    displayName: Schema.Literal("Extended Spell"),
    sorceryPointCost: Schema.Literal(1),
    stackingMode: OnePerSpellMetamagicStackingSchema,
    effectKind: Schema.Literal(EXTENDED_SPELL_METAMAGIC_EFFECT_KIND),
  }),
  Schema.Struct({
    id: Schema.Literal("sorcerer_heightened_spell"),
    displayName: Schema.Literal("Heightened Spell"),
    sorceryPointCost: Schema.Literal(2),
    stackingMode: OnePerSpellMetamagicStackingSchema,
    effectKind: Schema.Literal(HEIGHTENED_SPELL_METAMAGIC_EFFECT_KIND),
  }),
  Schema.Struct({
    id: Schema.Literal("sorcerer_quickened_spell"),
    displayName: Schema.Literal("Quickened Spell"),
    sorceryPointCost: Schema.Literal(2),
    stackingMode: OnePerSpellMetamagicStackingSchema,
    effectKind: Schema.Literal(QUICKENED_SPELL_METAMAGIC_EFFECT_KIND),
  }),
  Schema.Struct({
    id: Schema.Literal("sorcerer_seeking_spell"),
    displayName: Schema.Literal("Seeking Spell"),
    sorceryPointCost: Schema.Literal(1),
    stackingMode: CanCombineMetamagicStackingSchema,
    effectKind: Schema.Literal(SEEKING_SPELL_METAMAGIC_EFFECT_KIND),
  }),
  Schema.Struct({
    id: Schema.Literal("sorcerer_subtle_spell"),
    displayName: Schema.Literal("Subtle Spell"),
    sorceryPointCost: Schema.Literal(1),
    stackingMode: OnePerSpellMetamagicStackingSchema,
    effectKind: Schema.Literal(SUBTLE_SPELL_METAMAGIC_EFFECT_KIND),
  }),
  Schema.Struct({
    id: Schema.Literal("sorcerer_transmuted_spell"),
    displayName: Schema.Literal("Transmuted Spell"),
    sorceryPointCost: Schema.Literal(1),
    stackingMode: OnePerSpellMetamagicStackingSchema,
    effectKind: Schema.Literal(TRANSMUTED_SPELL_METAMAGIC_EFFECT_KIND),
  }),
  Schema.Struct({
    id: Schema.Literal("sorcerer_twinned_spell"),
    displayName: Schema.Literal("Twinned Spell"),
    sorceryPointCost: Schema.Literal(1),
    stackingMode: OnePerSpellMetamagicStackingSchema,
    effectKind: Schema.Literal(TWINNED_SPELL_METAMAGIC_EFFECT_KIND),
  }),
);

const MetamagicOptionsSchema = Schema.NonEmptyArray(MetamagicOptionSchema).pipe(
  Schema.filter(distinctCompleteMetamagicOptionSet, {
    message: () =>
      "Sorcerer Metamagic must author each SRD Metamagic option exactly once.",
  }),
);

export const SorcererMetamagicMechanicsSchema = Schema.Struct({
  family: Schema.Literal("metamagic_options"),
  choiceKey: Schema.Literal(SORCERER_METAMAGIC_OPTIONS_CHOICE_KEY),
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
    resourceUnitId: Schema.Literal("sorcerer_font_of_magic"),
  }),
  spellUseLimit: Schema.Struct({
    kind: Schema.Literal("one_per_spell_unless_option_allows_stacking"),
  }),
  options: MetamagicOptionsSchema,
});

export const ClassSpellcastingProjectionMechanicsSchema = Schema.Struct({
  family: Schema.Literal("class_spellcasting_projection"),
  source: Schema.Literal("class_record_spellcasting"),
  spellcastingKind: Schema.Literal("pact_magic_spellcasting_creation"),
});

const DruidWildCompanionSpendOptionSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("spell_slot") }),
  Schema.Struct({
    kind: Schema.Literal("one_class_feature_use"),
    resourceUnitId: Schema.Literal("druid_wild_shape"),
  }),
);

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
  Schema.filter(druidWildCompanionSpendOptionsMatchSrd, {
    message: () =>
      "Druid Wild Companion spend options must be exactly one Spell Slot option and one Wild Shape use option.",
  }),
);

export const DruidWildCompanionSpellCastMechanicsSchema = Schema.Struct({
  family: Schema.Literal("druid_wild_companion_spell_cast"),
  activationCost: Schema.Struct({
    kind: Schema.Literal("standard_action"),
    action: Schema.Literal("magic"),
  }),
  spellId: Schema.Literal("find_familiar"),
  spendOptions: DruidWildCompanionSpendOptionsSchema,
  componentOverride: Schema.Struct({
    material: Schema.Literal("not_required"),
  }),
  spellModeOverride: Schema.Struct({
    kind: Schema.Literal("fixed_creature_type_mode_option"),
    optionId: Schema.Literal("fey"),
  }),
  familiarDismissal: Schema.Struct({
    kind: Schema.Literal("caster_finishes_long_rest"),
  }),
});

export const WarlockPactSlotRecoveryMechanicsSchema = Schema.Struct({
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

export const ClassFeatureComponentMechanicsSchema = Schema.Union(
  Schema.suspend(() => PassiveMechanicsSchema),
  ActivatedAbilityMechanicsSchema,
  AlternateActionCostMechanicsSchema,
  Schema.suspend(() => OnHitTriggerMechanicsSchema),
  Schema.suspend(() => SaveDamageReplacementMechanicsSchema),
  Schema.suspend(() => ReactionRollOrDamageReductionMechanicsSchema),
);

export const CompositeClassFeatureMechanicsSchema = Schema.Struct({
  family: Schema.Literal("composite"),
  parts: Schema.NonEmptyArray(ClassFeatureComponentMechanicsSchema),
});

export const SpellbookRitualAccessMechanicsSchema = Schema.Struct({
  family: Schema.Literal("spellbook_ritual_access"),
  source: Schema.Literal("spellbook"),
  preparationRequirement: Schema.Literal("not_prepared"),
});

export const RestSpellSlotRecoveryMechanicsSchema = Schema.Struct({
  family: Schema.Literal("rest_spell_slot_recovery"),
  recoveryTrigger: Schema.Literal("short_rest"),
  resetCadence: Schema.Struct({ kind: Schema.Literal("long_rest") }),
  recoveredSlotLevelCap: Schema.Struct({
    kind: Schema.Literal("half_class_level_rounded_up"),
    maximumSlotLevelExclusive: Schema.Literal(6),
  }),
});

export const FailedAbilityCheckResourceBoostMechanicsSchema = Schema.Struct({
  family: Schema.Literal("failed_ability_check_resource_boost"),
  trigger: Schema.Struct({ kind: Schema.Literal("failed_ability_check") }),
  spends: Schema.Struct({
    resourceUnitId: NonEmptyStringSchema,
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

const MonkUncannyMetabolismHealingAmountSchema = Schema.Struct({
  kind: Schema.Literal("monk_martial_arts_die_plus_monk_level"),
  martialArtsUnitId: Schema.Literal("monk_martial_arts"),
});

export const MonkInitiativeFocusRecoveryMechanicsSchema = Schema.Struct({
  family: Schema.Literal("initiative_focus_recovery"),
  trigger: Schema.Struct({ kind: Schema.Literal("roll_initiative") }),
  optional: Schema.Literal(true),
  recovery: Schema.Struct({
    kind: Schema.Literal("recover_all_expended_uses"),
    resourceUnitId: Schema.Literal("monk_monks_focus"),
  }),
  healing: Schema.Struct({
    kind: Schema.Literal("heal_hp"),
    target: Schema.Literal("self"),
    amount: MonkUncannyMetabolismHealingAmountSchema,
  }),
  resetCadence: Schema.Struct({ kind: Schema.Literal("long_rest") }),
});

export const WeaponMasteryChoiceMechanicsSchema = Schema.Struct({
  family: Schema.Literal("weapon_mastery_choice"),
  choose: PositiveIntegerSchema,
  eligibleWeapons: Schema.Struct({
    kind: Schema.Literal("class_proficient_weapons"),
    usage: exactOptional(WeaponUsageSchema),
  }),
  changeOn: Schema.Struct({
    kind: Schema.Literal("long_rest"),
    count: PositiveIntegerSchema,
  }),
});

export const PassiveMechanicsSchema = Schema.Struct({
  family: Schema.Literal("passive"),
  condition: exactOptional(EquipmentPredicateSchema),
  suppressedBy: exactOptional(Schema.NonEmptyArray(PassiveSuppressorSchema)),
  grants: Schema.Array(EffectAtomSchema),
  operations: exactOptional(Schema.NonEmptyArray(PassiveOperationSchema)),
});

export const ClassFeatureMechanicsSchema = Schema.Union(
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
  DruidWildCompanionSpellCastMechanicsSchema,
  WarlockPactSlotRecoveryMechanicsSchema,
  FailedAbilityCheckResourceBoostMechanicsSchema,
  MonkInitiativeFocusRecoveryMechanicsSchema,
);

export const ClassGeneralFeatureMechanicsSchema = Schema.Union(
  ClassFeatureComponentMechanicsSchema,
  CompositeClassFeatureMechanicsSchema,
  ClassFeatureAcquisitionChoiceMechanicsSchema,
  ClassFeatureResourceContainerMechanicsSchema,
  ClassFeatureResourcePoolMechanicsSchema,
  WeaponMasteryChoiceMechanicsSchema,
);

export const DruidClassFeatureMechanicsSchema = Schema.Union(
  ClassGeneralFeatureMechanicsSchema,
  DruidWildCompanionSpellCastMechanicsSchema,
);

export const WizardClassFeatureMechanicsSchema = Schema.Union(
  SpellbookRitualAccessMechanicsSchema,
  RestSpellSlotRecoveryMechanicsSchema,
);

export const FighterClassFeatureMechanicsSchema =
  FailedAbilityCheckResourceBoostMechanicsSchema;

export const MonkClassFeatureMechanicsSchema = Schema.Union(
  ClassGeneralFeatureMechanicsSchema,
  MonkInitiativeFocusRecoveryMechanicsSchema,
);

export const SorcererClassFeatureMechanicsSchema = Schema.Union(
  ClassGeneralFeatureMechanicsSchema,
  SorcererMetamagicMechanicsSchema,
);

export const WarlockClassFeatureMechanicsSchema = Schema.Union(
  ClassGeneralFeatureMechanicsSchema,
  FeatureChoiceMechanicsSchema,
  ClassSpellcastingProjectionMechanicsSchema,
  WarlockPactSlotRecoveryMechanicsSchema,
);

export const MasteryTriggerSchema = Schema.Union(
  strictStruct({ kind: Schema.Literal("weapon_hit") }),
  strictStruct({ kind: Schema.Literal("weapon_hit_melee_only") }),
  strictStruct({ kind: Schema.Literal("weapon_hit_with_damage") }),
);

export const SneakAttackDamageRiderTriggerSchema = strictStruct({
  kind: Schema.Literal("hit_with_attack_roll"),
  weaponFilter: Schema.Literal("finesse_or_ranged"),
  eligibility: Schema.Literal(
    "advantage_or_non_incapacitated_ally_within_5ft_of_target_without_disadvantage",
  ),
});

export const FrenzyAttackDamageRiderTriggerSchema = strictStruct({
  kind: Schema.Literal("hit_with_attack_roll"),
  attackFilter: Schema.Literal("strength_weapon_or_unarmed_strike"),
  prerequisite: Schema.Literal("rage_active_and_reckless_attack_used_this_turn"),
  hitLimit: Schema.Literal("first_target_hit_this_turn"),
});

export const AttackDamageRiderTriggerSchema = Schema.Union(
  SneakAttackDamageRiderTriggerSchema,
  FrenzyAttackDamageRiderTriggerSchema,
);

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

export const RageDamageBonusDiceSchema = strictStruct({
  kind: Schema.Literal("rage_damage_bonus"),
  dieSize: Schema.Literal(6),
});

export const AddAttackDamageDiceRiderSchema = strictStruct({
  kind: Schema.Literal("add_attack_damage_dice"),
  dice: Schema.Union(ClassLevelDamageDiceSchema, RageDamageBonusDiceSchema),
  damageType: Schema.Literal("same_as_attack"),
});

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
  mode: Schema.Literal("advantage", "disadvantage"),
  on: Schema.Array(RollKindSchema),
  count: Schema.Number,
  expiresOn: RiderExpirySchema,
});

export const SaveGateRiderResultSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("apply_condition"),
    condition: ConditionSchema,
  }),
  strictStruct({ kind: Schema.Literal("none") }),
);

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
  on: Schema.Tuple(Schema.Literal("attack_roll")),
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

export const VexMasteryEffectSchema = strictStruct({
  kind: Schema.Literal("modify_roll_advantage"),
  mode: Schema.Literal("advantage"),
  on: Schema.Tuple(Schema.Literal("attack_roll")),
  count: Schema.Literal(1),
  expiresOn: strictStruct({
    kind: Schema.Literal("end_of_next_turn"),
  }),
});

export const SaveDamageReplacementMechanicsSchema = Schema.Struct({
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

const AttackDamageReductionZeroDamageRedirectSchema = strictStruct({
  spends: strictStruct({
    resourceUnitId: NonEmptyStringSchema,
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

const ReactionRollOrDamageReductionModifierSchema = Schema.Union(
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
    reduction: Schema.Union(
      strictStruct({
        kind: Schema.Literal("half_damage"),
        rounding: Schema.Literal("down"),
      }),
    ),
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
);

const ReactionRollOrDamageReductionModifiersSchema = Schema.NonEmptyArray(
  ReactionRollOrDamageReductionModifierSchema,
);

export const ReactionRollOrDamageReductionMechanicsSchema = Schema.Union(
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

export const RerollWeaponDamageDiceRiderSchema = strictStruct({
  kind: Schema.Literal("reroll_weapon_damage_dice"),
  diceScope: Schema.Literal("weapon_damage_dice"),
  choose: Schema.Literal("either_roll"),
});

export const WeaponHitMasteryEffectSchema = Schema.Union(
  SapMasteryEffectSchema,
  ToppleMasteryEffectSchema,
);

export const MasteryEffectSchema = Schema.Union(
  WeaponHitMasteryEffectSchema,
  VexMasteryEffectSchema,
  GrantWeaponAttackRiderSchema,
);

export const OnHitRiderEffectSchema = Schema.Union(
  MasteryEffectSchema,
  RerollWeaponDamageDiceRiderSchema,
  AddAttackDamageDiceRiderSchema,
);

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

export const ToppleMasteryMechanicsSchema = strictStruct({
  ...OnHitTriggerMechanicsBaseFields,
  optional: Schema.Literal(true),
  trigger: strictStruct({ kind: Schema.Literal("weapon_hit") }),
  effect: ToppleMasteryEffectSchema,
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

export const MasteryMechanicsSchema = Schema.Union(
  SapMasteryMechanicsSchema,
  ToppleMasteryMechanicsSchema,
  VexMasteryMechanicsSchema,
  CleaveMasteryMechanicsSchema,
);

export const AttackDamageRiderMechanicsSchema = strictStruct({
  ...OnHitTriggerMechanicsBaseFields,
  optional: Schema.Boolean,
  trigger: AttackDamageRiderTriggerSchema,
  effect: AddAttackDamageDiceRiderSchema,
  usageLimit: OncePerTurnUsageLimitSchema,
}).pipe(
  Schema.filter(
    (mechanics) =>
      (mechanics.optional === true &&
        "weaponFilter" in mechanics.trigger &&
        mechanics.effect.dice.kind === "class_level_table") ||
      (mechanics.optional === false &&
        "attackFilter" in mechanics.trigger &&
        mechanics.effect.dice.kind === "rage_damage_bonus"),
    {
      message: () =>
        "Attack damage riders must use matching optionality, trigger, and dice source.",
    },
  ),
);

export const WeaponDamageDiceRerollMechanicsSchema = strictStruct({
  ...OnHitTriggerMechanicsBaseFields,
  optional: Schema.Literal(true),
  trigger: WeaponDamageDiceRerollTriggerSchema,
  effect: RerollWeaponDamageDiceRiderSchema,
  usageLimit: OncePerTurnUsageLimitSchema,
});

export const MasteryOrWeaponDamageDiceRerollMechanicsSchema = Schema.Union(
  MasteryMechanicsSchema,
  WeaponDamageDiceRerollMechanicsSchema,
);

export const OnHitTriggerMechanicsSchema = Schema.Union(
  MasteryOrWeaponDamageDiceRerollMechanicsSchema,
  AttackDamageRiderMechanicsSchema,
);

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

export const AttackRollMissToHitReplacementMechanicsSchema = strictStruct({
  family: Schema.Literal("triggered_replacement"),
  trigger: AttackRollMissReplacementTriggerSchema,
  effect: AttackRollMissReplacementEffectSchema,
  optional: Schema.Literal(true),
  resetCadence: strictStruct({ kind: Schema.Literal("start_of_next_turn") }),
});

export const TriggeredReplacementMechanicsSchema = Schema.Union(
  HitPointTriggeredReplacementMechanicsSchema,
  AttackRollMissToHitReplacementMechanicsSchema,
);

const UnitMetadataSchema = Schema.Struct({
  id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  provenance: ProvenanceSchema,
  description: Schema.String,
});

const distinctAbilities = (abilities: readonly unknown[]): boolean =>
  new Set(abilities).size === abilities.length;

export const PrimaryAbilityExpressionSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("all_of"),
    abilities: Schema.NonEmptyArray(AbilitySchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("any_of"),
    abilities: Schema.NonEmptyArray(AbilitySchema),
  }),
).pipe(
  Schema.filter(
    (primaryAbilities) => distinctAbilities(primaryAbilities.abilities),
    {
      message: () => "Class Primary Ability entries must be distinct.",
    },
  ),
  Schema.filter(
    (primaryAbilities) =>
      primaryAbilities.kind !== "any_of" ||
      primaryAbilities.abilities.length > 1,
    {
      message: () =>
        "Class Primary Ability any_of entries must contain multiple alternatives.",
    },
  ),
);

export const BackgroundAbilityScoreIncreaseSchema = Schema.Struct({
  abilities: Schema.Tuple(AbilitySchema, AbilitySchema, AbilitySchema).pipe(
    Schema.filter(distinctAbilities, {
      message: () =>
        "Background ability score list must contain three distinct abilities.",
    }),
  ),
  methods: Schema.Tuple(
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
  ),
});

export const StartingEquipmentItemRefSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("unit_ref"),
    unitId: NonEmptyStringSchema,
    quantity: exactOptional(PositiveIntegerSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("selected_tool_proficiency"),
  }),
  Schema.Struct({
    kind: Schema.Literal("draft_owned_item"),
    itemName: NonEmptyStringSchema,
    quantity: exactOptional(PositiveIntegerSchema),
  }),
);

export const StartingEquipmentChoiceSchema = Schema.Union(
  Schema.Struct({
    id: NonEmptyStringSchema,
    kind: Schema.Literal("coin_grant"),
    coinsGp: NonNegativeIntegerSchema,
  }),
  Schema.Struct({
    id: NonEmptyStringSchema,
    kind: Schema.Literal("item_bundle"),
    items: Schema.NonEmptyArray(StartingEquipmentItemRefSchema),
    coinsGp: exactOptional(NonNegativeIntegerSchema),
  }),
);

export const ClassFeatureGrantSchema = Schema.Struct({
  unitId: NonEmptyStringSchema,
  level: PositiveIntegerSchema,
});

export const ArmorTrainingSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("trained"),
    categories: Schema.NonEmptyArray(ArmorTrainingCategorySchema),
  }),
  strictStruct({ kind: Schema.Literal("none") }),
);

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
  spellId: NonEmptyStringSchema,
  spellLevel: PositiveIntegerSchema,
});

const ClassSpellAccessSchema = Schema.Struct({
  spellId: NonEmptyStringSchema,
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

type ClassSpellcastingClassName = Extract<
  ClassName,
  (typeof LIST_PREPARED_SPELLCASTING_CLASS_NAMES)[number] | "warlock"
>;

export type ClassSpellList = {
  readonly cantrips: readonly string[];
  readonly leveled: Readonly<Partial<Record<number, readonly string[]>>>;
};

export const CLASS_SPELL_LISTS = {
  bard: {
    cantrips: [
      "dancing_lights",
      "light",
      "mage_hand",
      "mending",
      "message",
      "minor_illusion",
      "prestidigitation",
      "starry_wisp",
      "true_strike",
      "vicious_mockery",
    ],
    leveled: {
      1: [
        "animal_friendship",
        "bane",
        "charm_person",
        "color_spray",
        "command",
        "comprehend_languages",
        "cure_wounds",
        "detect_magic",
        "disguise_self",
        "dissonant_whispers",
        "faerie_fire",
        "feather_fall",
        "healing_word",
        "heroism",
        "hideous_laughter",
        "identify",
        "illusory_script",
        "longstrider",
        "silent_image",
        "sleep",
        "speak_with_animals",
        "thunderwave",
        "unseen_servant",
      ],
      2: [
        "aid",
        "animal_messenger",
        "blindness_deafness",
        "calm_emotions",
        "detect_thoughts",
        "enhance_ability",
        "enlarge_reduce",
        "enthrall",
        "heat_metal",
        "hold_person",
        "invisibility",
        "knock",
        "lesser_restoration",
        "locate_animals_or_plants",
        "locate_object",
        "magic_mouth",
        "mirror_image",
        "see_invisibility",
        "shatter",
        "silence",
        "suggestion",
        "zone_of_truth",
      ],
    },
  },
  cleric: {
    cantrips: [
      "guidance",
      "light",
      "mending",
      "resistance",
      "sacred_flame",
      "spare_the_dying",
      "thaumaturgy",
    ],
    leveled: {
      1: [
        "bane",
        "bless",
        "command",
        "create_or_destroy_water",
        "cure_wounds",
        "detect_evil_and_good",
        "detect_magic",
        "detect_poison_and_disease",
        "guiding_bolt",
        "healing_word",
        "inflict_wounds",
        "protection_from_evil_and_good",
        "purify_food_and_drink",
        "sanctuary",
        "shield_of_faith",
      ],
      2: [
        "aid",
        "augury",
        "blindness_deafness",
        "calm_emotions",
        "continual_flame",
        "enhance_ability",
        "find_traps",
        "gentle_repose",
        "hold_person",
        "lesser_restoration",
        "locate_object",
        "prayer_of_healing",
        "protection_from_poison",
        "silence",
        "spiritual_weapon",
        "warding_bond",
        "zone_of_truth",
      ],
    },
  },
  druid: {
    cantrips: [
      "druidcraft",
      "elementalism",
      "guidance",
      "mending",
      "message",
      "poison_spray",
      "produce_flame",
      "resistance",
      "shillelagh",
      "spare_the_dying",
      "starry_wisp",
    ],
    leveled: {
      1: [
        "animal_friendship",
        "charm_person",
        "create_or_destroy_water",
        "cure_wounds",
        "detect_magic",
        "detect_poison_and_disease",
        "entangle",
        "faerie_fire",
        "fog_cloud",
        "goodberry",
        "healing_word",
        "ice_knife",
        "jump",
        "longstrider",
        "protection_from_evil_and_good",
        "purify_food_and_drink",
        "speak_with_animals",
        "thunderwave",
      ],
      2: [
        "aid",
        "animal_messenger",
        "augury",
        "barkskin",
        "continual_flame",
        "darkvision",
        "enhance_ability",
        "enlarge_reduce",
        "find_traps",
        "flame_blade",
        "flaming_sphere",
        "gust_of_wind",
        "heat_metal",
        "hold_person",
        "lesser_restoration",
        "locate_animals_or_plants",
        "locate_object",
        "moonbeam",
        "pass_without_trace",
        "protection_from_poison",
        "spike_growth",
      ],
    },
  },
  paladin: {
    cantrips: [],
    leveled: {
      1: [
        "bless",
        "command",
        "cure_wounds",
        "detect_evil_and_good",
        "detect_magic",
        "detect_poison_and_disease",
        "divine_favor",
        "divine_smite",
        "heroism",
        "protection_from_evil_and_good",
        "purify_food_and_drink",
        "searing_smite",
        "shield_of_faith",
      ],
    },
  },
  ranger: {
    cantrips: [],
    leveled: {
      1: [
        "alarm",
        "animal_friendship",
        "cure_wounds",
        "detect_magic",
        "detect_poison_and_disease",
        "ensnaring_strike",
        "entangle",
        "fog_cloud",
        "goodberry",
        "hunters_mark",
        "jump",
        "longstrider",
        "speak_with_animals",
      ],
      2: [
        "aid",
        "animal_messenger",
        "barkskin",
        "darkvision",
        "enhance_ability",
        "find_traps",
        "gust_of_wind",
        "lesser_restoration",
        "locate_animals_or_plants",
        "locate_object",
        "magic_weapon",
        "pass_without_trace",
        "protection_from_poison",
        "silence",
        "spike_growth",
      ],
    },
  },
  sorcerer: {
    cantrips: [
      "acid_splash",
      "chill_touch",
      "dancing_lights",
      "elementalism",
      "fire_bolt",
      "light",
      "mage_hand",
      "mending",
      "message",
      "minor_illusion",
      "poison_spray",
      "prestidigitation",
      "ray_of_frost",
      "shocking_grasp",
      "sorcerous_burst",
      "true_strike",
    ],
    leveled: {
      1: [
        "burning_hands",
        "charm_person",
        "chromatic_orb",
        "color_spray",
        "comprehend_languages",
        "detect_magic",
        "disguise_self",
        "expeditious_retreat",
        "false_life",
        "feather_fall",
        "fog_cloud",
        "grease",
        "ice_knife",
        "jump",
        "mage_armor",
        "magic_missile",
        "ray_of_sickness",
        "shield",
        "silent_image",
        "sleep",
        "thunderwave",
      ],
      2: [
        "alter_self",
        "blindness_deafness",
        "blur",
        "darkness",
        "darkvision",
        "detect_thoughts",
        "dragons_breath",
        "enhance_ability",
        "enlarge_reduce",
        "flame_blade",
        "flaming_sphere",
        "gust_of_wind",
        "hold_person",
        "invisibility",
        "knock",
        "levitate",
        "magic_weapon",
        "mirror_image",
        "misty_step",
        "scorching_ray",
        "see_invisibility",
        "shatter",
        "spider_climb",
        "suggestion",
        "web",
      ],
    },
  },
  warlock: {
    cantrips: [
      "chill_touch",
      "eldritch_blast",
      "mage_hand",
      "minor_illusion",
      "poison_spray",
      "prestidigitation",
      "true_strike",
    ],
    leveled: {
      1: [
        "bane",
        "charm_person",
        "comprehend_languages",
        "detect_magic",
        "expeditious_retreat",
        "hellish_rebuke",
        "hex",
        "hideous_laughter",
        "illusory_script",
        "protection_from_evil_and_good",
        "speak_with_animals",
        "unseen_servant",
      ],
      2: [
        "darkness",
        "enthrall",
        "hold_person",
        "invisibility",
        "mind_spike",
        "mirror_image",
        "misty_step",
        "ray_of_enfeeblement",
        "spider_climb",
        "suggestion",
      ],
      3: [
        "counterspell",
        "dispel_magic",
        "fear",
        "fly",
        "gaseous_form",
        "hypnotic_pattern",
        "magic_circle",
        "major_image",
        "remove_curse",
        "tongues",
        "vampiric_touch",
      ],
      4: [
        "banishment",
        "blight",
        "charm_monster",
        "dimension_door",
        "hallucinatory_terrain",
      ],
      5: [
        "contact_other_plane",
        "dream",
        "hold_monster",
        "mislead",
        "planar_binding",
        "scrying",
        "teleportation_circle",
      ],
    },
  },
} as const satisfies Record<ClassSpellcastingClassName, ClassSpellList>;

export const classSpellList = (
  className: ClassSpellcastingClassName,
): ClassSpellList => CLASS_SPELL_LISTS[className];

export const classSpellListPreparedSpellLevel = (
  className: ClassSpellcastingClassName,
  spellId: string,
): number | undefined => {
  const entry = Object.entries(classSpellList(className).leveled).find(
    ([_spellLevel, spellIds]) => spellIds?.includes(spellId) === true,
  );
  return entry === undefined ? undefined : Number.parseInt(entry[0], 10);
};

export const allCantripsFromClassSpellList = (
  className: ClassSpellcastingClassName,
  spellIds: readonly string[],
): boolean => {
  const cantrips = new Set(classSpellList(className).cantrips);

  return spellIds.every((spellId) => cantrips.has(spellId));
};

export const allPreparedSpellsFromClassSpellList = (
  className: ClassSpellcastingClassName,
  spells: readonly { readonly spellId: string; readonly spellLevel: number }[],
): boolean =>
  spells.every(
    (spell) =>
      classSpellListPreparedSpellLevel(className, spell.spellId) ===
      spell.spellLevel,
  );

export const allCantripsFromAnyClassSpellList = (
  spellIds: readonly string[],
): boolean =>
  spellIds.every((spellId) =>
    (
      Object.keys(CLASS_SPELL_LISTS) as readonly ClassSpellcastingClassName[]
    ).some((className) => allCantripsFromClassSpellList(className, [spellId])),
  );

export const allLeveledSpellsFromAnyClassSpellList = (
  spells: readonly { readonly spellId: string; readonly spellLevel: number }[],
): boolean =>
  spells.every((spell) =>
    (
      Object.keys(CLASS_SPELL_LISTS) as readonly ClassSpellcastingClassName[]
    ).some((className) =>
      allPreparedSpellsFromClassSpellList(className, [spell]),
    ),
  );

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

const ClassSpellcastingClassNameSchema = Schema.Literal(
  ...LIST_PREPARED_SPELLCASTING_CLASS_NAMES,
);

const ClassCantripAccessSchema = Schema.Struct({
  kind: Schema.Literal("known_cantrips_from_class_spell_list"),
  choose: PositiveIntegerSchema,
  spellIds: Schema.NonEmptyArray(NonEmptyStringSchema),
  changeOn: Schema.Struct({
    kind: Schema.Literal("class_level"),
    count: PositiveIntegerSchema,
  }),
});

const ClassPreparedAccessSchema = Schema.Struct({
  kind: Schema.Literal("prepared_from_class_spell_list"),
  choose: PositiveIntegerSchema,
  spells: Schema.NonEmptyArray(ClassSpellAccessSchema),
  changeOn: Schema.Union(
    Schema.Struct({
      kind: Schema.Literal("class_level"),
      replacementCount: Schema.Literal(1),
    }),
    Schema.Struct({
      kind: Schema.Literal("long_rest"),
      replacementCount: Schema.Literal(1, "any"),
    }),
  ),
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
  spellcastingAbility: Schema.Literal("cha", "wis"),
  cantripAccess: exactOptional(ClassCantripAccessSchema),
  preparedAccess: ClassPreparedAccessSchema,
  spellSlotProjection: SpellSlotProjectionSchema,
  spellcastingFocus: Schema.Literal(
    "arcane_focus",
    "druidic_focus",
    "holy_symbol",
    "musical_instrument",
  ),
}).pipe(
  Schema.filter(
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
      message: () =>
        "List-prepared spellcasting choices must match class Spellcasting facts, counts, uniqueness, and available Spell Slot levels.",
    },
  ),
);

export const ListPreparedSpellcastingProgressionCreationSchema = Schema.Struct({
  kind: Schema.Literal("list_prepared_spellcasting_progression_creation"),
  featureLevel: Schema.Literal(1),
  spellcastingAbility: Schema.Literal("cha", "wis"),
  cantripAccess: exactOptional(ClassCantripAccessSchema),
  preparedAccess: ClassPreparedAccessSchema,
  spellSlotProjection: SpellSlotProjectionSchema,
  spellcastingProgression: Schema.NonEmptyArray(
    ListPreparedSpellcastingProgressionRowSchema,
  ),
  spellcastingFocus: Schema.Literal(
    "arcane_focus",
    "druidic_focus",
    "holy_symbol",
    "musical_instrument",
  ),
}).pipe(
  Schema.filter(
    (spellcasting) => {
      const levelOne = listPreparedSpellcastingProgressionAtLevel(
        spellcasting.spellcastingProgression,
        1,
      );
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

      const maxCantripCount = Math.max(
        ...spellcasting.spellcastingProgression.map((row) => row.cantripCount),
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
      message: () =>
        "List-prepared spellcasting progression choices must match level-1 facts, provide enough unique spell options for each progression row, and prepare only spells at or below available Spell Slot levels.",
    },
  ),
);

export const PactMagicSpellcastingCreationSchema = Schema.Struct({
  kind: Schema.Literal("pact_magic_spellcasting_creation"),
  featureLevel: Schema.Literal(1),
  spellcastingAbility: Schema.Literal("cha"),
  cantripAccess: Schema.Struct({
    kind: Schema.Literal("known_cantrips_from_class_spell_list"),
    choose: PositiveIntegerSchema,
    spellIds: Schema.NonEmptyArray(NonEmptyStringSchema),
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
  Schema.filter(
    (spellcasting) => {
      return (
        distinctStrings(spellcasting.cantripAccess.spellIds) &&
        allSpellIdsDistinct(spellcasting.preparedAccess.spells) &&
        distinctPactMagicProgressionLevels(spellcasting.pactMagicProgression) &&
        pactMagicProgressionMatchesLevelOneFacts(spellcasting) &&
        pactMagicOptionsCoverProgression(spellcasting) &&
        allCantripsFromClassSpellList(
          "warlock",
          spellcasting.cantripAccess.spellIds,
        ) &&
        allPreparedSpellsFromClassSpellList(
          "warlock",
          spellcasting.preparedAccess.spells,
        )
      );
    },
    {
      message: () =>
        "Pact Magic choices must match their counts, be unique, use the Warlock spell list, and prepare only spells at or below the Pact Slot level.",
    },
  ),
);

export const WizardSpellcastingCreationSchema = Schema.Struct({
  kind: Schema.Literal("wizard_spellcasting_creation"),
  featureLevel: Schema.Literal(1),
  spellcastingAbility: Schema.Literal("int"),
  cantripAccess: Schema.Struct({
    kind: Schema.Literal("known_cantrips"),
    choose: PositiveIntegerSchema,
    spellIds: Schema.NonEmptyArray(NonEmptyStringSchema),
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
    spellIds: Schema.NonEmptyArray(NonEmptyStringSchema),
    changeOn: Schema.Struct({ kind: Schema.Literal("long_rest") }),
  }),
  spellSlotProjection: SpellSlotProjectionSchema,
  spellcastingProgression: Schema.NonEmptyArray(
    WizardSpellcastingProgressionRowSchema,
  ),
  spellcastingFocuses: Schema.NonEmptyArray(
    Schema.Literal("arcane_focus", "spellbook"),
  ),
}).pipe(
  Schema.filter(
    (spellcasting) => {
      if (
        spellcasting.cantripAccess.choose !==
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
      if (!distinctStrings(slotLevels)) {
        return false;
      }

      if (
        !distinctWizardSpellcastingProgressionLevels(
          spellcasting.spellcastingProgression,
        ) ||
        !wizardSpellcastingProgressionMatchesLevelOneFacts(spellcasting)
      ) {
        return false;
      }

      const maxCantripCount = Math.max(
        ...spellcasting.spellcastingProgression.map((row) => row.cantripCount),
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
      if (!progressionSlotsHaveDistinctLevels) {
        return false;
      }

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
      message: () =>
        "Wizard spellcasting choices must match cantrip and spellbook counts, provide enough unique prepared spell options, and prepare only spellbook spells with available Spell Slot levels.",
    },
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

export const ClassSpellcastingCreationSchema = Schema.Union(
  ListPreparedSpellcastingCreationSchema,
  ListPreparedSpellcastingProgressionCreationSchema,
  PactMagicSpellcastingCreationSchema,
  WizardSpellcastingCreationSchema,
);

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
      options: Schema.NonEmptyArray(NonEmptyStringSchema),
    }),
  ),
};

export const WizardClassRecordSchema = Schema.Struct({
  ...ClassRecordBaseFields,
  className: Schema.Literal("wizard"),
  spellcasting: WizardSpellcastingCreationSchema,
});

export const ListPreparedSpellcastingClassRecordSchema = Schema.Struct({
  ...ClassRecordBaseFields,
  className: ClassSpellcastingClassNameSchema,
  spellcasting: Schema.Union(
    ListPreparedSpellcastingCreationSchema,
    ListPreparedSpellcastingProgressionCreationSchema,
  ),
}).pipe(
  Schema.filter(
    (unit) => {
      const classFacts = CLASS_PREPARED_SPELLCASTING_FACTS.find(
        (facts) => facts.className === unit.className,
      );
      if (classFacts === undefined) {
        return false;
      }

      return (
        unit.spellcasting.spellcastingAbility ===
          classFacts.spellcastingAbility &&
        unit.spellcasting.spellcastingFocus === classFacts.spellcastingFocus &&
        unit.spellcasting.preparedAccess.changeOn.kind ===
          classFacts.preparedChangeOn.kind &&
        unit.spellcasting.preparedAccess.changeOn.replacementCount ===
          classFacts.preparedChangeOn.replacementCount &&
        unit.spellcasting.preparedAccess.choose === classFacts.preparedCount &&
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
            unit.spellcasting.cantripAccess.spellIds.length ===
              classFacts.cantripCount &&
            allCantripsFromClassSpellList(
              unit.className,
              unit.spellcasting.cantripAccess.spellIds,
            )) &&
        allPreparedSpellsFromClassSpellList(
          unit.className,
          unit.spellcasting.preparedAccess.spells,
        ) &&
        (unit.spellcasting.kind ===
        "list_prepared_spellcasting_progression_creation"
          ? listPreparedSpellcastingProgressionMatchesLevelOneFacts(
              unit.spellcasting,
              classFacts,
            )
          : true)
      );
    },
    {
      message: () =>
        "List-prepared class records must match class-specific level-1 spellcasting ability, focus, cantrip count, prepared-spell count, Spell Slot projection, prepared-spell replacement timing/cardinality, and class spell list.",
    },
  ),
);

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

export const PactMagicClassRecordSchema = Schema.Struct({
  ...ClassRecordBaseFields,
  className: Schema.Literal("warlock"),
  spellcasting: PactMagicSpellcastingCreationSchema,
}).pipe(
  Schema.filter(
    (unit) => {
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
        pactMagicOptionsCoverProgression(unit.spellcasting) &&
        allCantripsFromClassSpellList(
          unit.className,
          unit.spellcasting.cantripAccess.spellIds,
        ) &&
        allPreparedSpellsFromClassSpellList(
          unit.className,
          unit.spellcasting.preparedAccess.spells,
        )
      );
    },
    {
      message: () =>
        "Warlock Pact Magic class records must match level-1 cantrip, prepared-spell, Pact Slot count, Pact Slot level, and Warlock spell list facts.",
    },
  ),
);

export const SpellcastingClassRecordSchema = Schema.Union(
  ListPreparedSpellcastingClassRecordSchema,
  PactMagicClassRecordSchema,
  WizardClassRecordSchema,
);

export const NonSpellcastingClassRecordSchema = Schema.Struct({
  ...ClassRecordBaseFields,
  className: Schema.Literal(...NON_SPELLCASTING_CLASS_NAMES),
  spellcasting: exactOptional(Schema.Never),
});

export const ClassContainerOnlyRecordSchema = Schema.Struct({
  ...ClassRecordBaseFields,
  className: Schema.Literal(
    ...CLASS_CONTAINER_WITHOUT_SPELL_ACCESS_CLASS_NAMES,
  ),
  spellcasting: exactOptional(Schema.Never),
});

export const NonWizardClassRecordSchema = Schema.Union(
  ListPreparedSpellcastingClassRecordSchema,
  PactMagicClassRecordSchema,
  ClassContainerOnlyRecordSchema,
);

export const ClassRecordSchema = Schema.Union(
  NonWizardClassRecordSchema,
  WizardClassRecordSchema,
);

const ClassFeatureRecordBaseFields = {
  ...UnitMetadataSchema.fields,
  kind: Schema.Literal("class_feature"),
  acquiredAtLevel: PositiveIntegerSchema,
};

export const WizardClassFeatureRecordSchema = Schema.Struct({
  ...ClassFeatureRecordBaseFields,
  className: Schema.Literal("wizard"),
  mechanics: Schema.Union(
    ClassGeneralFeatureMechanicsSchema,
    WizardClassFeatureMechanicsSchema,
  ),
});

export const FighterClassFeatureRecordSchema = Schema.Struct({
  ...ClassFeatureRecordBaseFields,
  className: Schema.Literal("fighter"),
  mechanics: Schema.Union(
    ClassGeneralFeatureMechanicsSchema,
    FighterClassFeatureMechanicsSchema,
  ),
});

export const DruidClassFeatureRecordSchema = Schema.Struct({
  ...ClassFeatureRecordBaseFields,
  className: Schema.Literal("druid"),
  mechanics: DruidClassFeatureMechanicsSchema,
});

export const MonkClassFeatureRecordSchema = Schema.Struct({
  ...ClassFeatureRecordBaseFields,
  className: Schema.Literal("monk"),
  mechanics: MonkClassFeatureMechanicsSchema,
});

export const SorcererClassFeatureRecordSchema = Schema.Struct({
  ...ClassFeatureRecordBaseFields,
  className: Schema.Literal("sorcerer"),
  mechanics: SorcererClassFeatureMechanicsSchema,
});

export const WarlockClassFeatureRecordSchema = Schema.Struct({
  ...ClassFeatureRecordBaseFields,
  className: Schema.Literal("warlock"),
  mechanics: WarlockClassFeatureMechanicsSchema,
});

export const OtherClassFeatureRecordSchema = Schema.Struct({
  ...ClassFeatureRecordBaseFields,
  className: Schema.Literal(...GENERAL_CLASS_FEATURE_RECORD_CLASS_NAMES),
  mechanics: ClassGeneralFeatureMechanicsSchema,
});

export const ClassFeatureRecordSchema = Schema.Union(
  WizardClassFeatureRecordSchema,
  FighterClassFeatureRecordSchema,
  DruidClassFeatureRecordSchema,
  MonkClassFeatureRecordSchema,
  SorcererClassFeatureRecordSchema,
  WarlockClassFeatureRecordSchema,
  OtherClassFeatureRecordSchema,
);

export const SubclassRecordSchema = Schema.Struct({
  ...UnitMetadataSchema.fields,
  kind: SubclassRecordKindSchema,
  className: ClassNameSchema,
  featureGrants: Schema.Array(ClassFeatureGrantSchema),
});

export const MasteryRecordSchema = Schema.Struct({
  ...UnitMetadataSchema.fields,
  kind: Schema.Literal("mastery"),
  mechanics: MasteryMechanicsSchema,
});

export const FeatMechanicsSchema = Schema.Union(
  PassiveMechanicsSchema,
  ActivatedAbilityMechanicsSchema,
  MasteryOrWeaponDamageDiceRerollMechanicsSchema,
  TriggeredReplacementMechanicsSchema,
);

export const FeatRecordSchema = Schema.Struct({
  ...UnitMetadataSchema.fields,
  kind: Schema.Literal("feat"),
  category: FeatCategorySchema,
  abilityScoreIncreaseChoice: exactOptional(
    Schema.Struct({
      maxScore: PositiveIntegerSchema,
      methods: Schema.NonEmptyArray(
        Schema.Union(
          Schema.Struct({
            kind: Schema.Literal("one_score"),
            increase: PositiveIntegerSchema,
          }),
          Schema.Struct({
            kind: Schema.Literal("two_scores"),
            primaryIncrease: PositiveIntegerSchema,
            secondaryIncrease: PositiveIntegerSchema,
          }),
        ),
      ),
    }),
  ),
  mechanics: FeatMechanicsSchema,
});

export const SpeciesTraitMechanicsSchema = Schema.Union(
  PassiveMechanicsSchema,
  ActivatedAbilityMechanicsSchema,
  TriggeredReplacementMechanicsSchema,
);

export const SpeciesTraitRecordSchema = Schema.Struct({
  ...UnitMetadataSchema.fields,
  kind: Schema.Literal("species_trait"),
  species: NonEmptyStringSchema,
  mechanics: SpeciesTraitMechanicsSchema,
});

export const BackgroundToolProficiencySchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("specific_tool"),
    toolId: NonEmptyStringSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("tool_category_choice"),
    category: Schema.Literal("gaming_set", "artisan_tool"),
    choose: PositiveIntegerSchema,
  }),
);

export const BackgroundRecordSchema = Schema.Struct({
  ...UnitMetadataSchema.fields,
  kind: BackgroundRecordKindSchema,
  abilityScoreIncrease: BackgroundAbilityScoreIncreaseSchema,
  originFeatId: NonEmptyStringSchema,
  skillProficiencies: Schema.NonEmptyArray(SkillSchema),
  toolProficiency: BackgroundToolProficiencySchema,
  startingEquipment: Schema.NonEmptyArray(StartingEquipmentChoiceSchema),
});

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
  options: Schema.Tuple(Schema.Literal("medium"), Schema.Literal("small")),
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

export const DragonbornSpeciesRecordSchema = Schema.Struct({
  ...SpeciesRecordBaseSchema.fields,
  species: Schema.Literal("dragonborn"),
  size: FixedMediumSpeciesSizeSchema,
  speed: SpeciesSpeed30Schema,
  traits: DragonbornSpeciesTraitsSchema,
});

export const DwarfSpeciesTraitsSchema = Schema.Struct({
  darkvision: Schema.Literal("dwarf_darkvision"),
  dwarvenResilience: Schema.Literal("dwarf_dwarven_resilience"),
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

export const SpeciesRecordSchema = Schema.Union(
  DragonbornSpeciesRecordSchema,
  DwarfSpeciesRecordSchema,
  ElfSpeciesRecordSchema,
  GoliathSpeciesRecordSchema,
  OrcSpeciesRecordSchema,
  TieflingSpeciesRecordSchema,
);

export const MagicItemComponentMechanicsSchema = Schema.Union(
  PassiveMechanicsSchema,
  ActivatedAbilityMechanicsSchema,
  TriggeredReactionAbilityMechanicsSchema,
  MasteryOrWeaponDamageDiceRerollMechanicsSchema,
  MagicItemSpawnedCreatureMechanicsSchema,
);

export const CompositeMagicItemMechanicsSchema = Schema.Struct({
  family: Schema.Literal("composite"),
  parts: Schema.NonEmptyArray(MagicItemComponentMechanicsSchema),
});

export const MagicItemMechanicsSchema = Schema.Union(
  MagicItemComponentMechanicsSchema,
  CompositeMagicItemMechanicsSchema,
);

export const MagicItemAttunementRestrictionSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("spellcaster") }),
  Schema.Struct({
    kind: Schema.Literal("class_list"),
    classes: Schema.NonEmptyArray(ClassNameSchema),
  }),
);

export const ItemDestructionPolicySchema = Schema.Union(
  strictStruct({ kind: Schema.Literal("none") }),
  Schema.Struct({ kind: Schema.Literal("becomes_nonmagical_on_hit") }),
  Schema.Struct({
    kind: Schema.Literal("last_charge_roll"),
    die: Schema.Number,
    destroyOn: Schema.Number,
  }),
  Schema.Struct({ kind: Schema.Literal("permanent_on_empty") }),
);

export const MagicItemAttunementSchema = Schema.Union(
  Schema.Struct({ requiresAttunement: Schema.Literal(false) }),
  Schema.Struct({
    requiresAttunement: Schema.Literal(true),
    attunementRestriction: exactOptional(MagicItemAttunementRestrictionSchema),
  }),
);

export const MagicItemVariantSchema = Schema.Struct({
  id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  description: exactOptional(Schema.String),
  rarity: MagicItemRaritySchema,
  mechanics: MagicItemMechanicsSchema,
  destruction: ItemDestructionPolicySchema,
  attunementOverride: exactOptional(MagicItemAttunementSchema),
});

export const MagicItemRecordSchema = Schema.Union(
  Schema.Struct({
    ...UnitMetadataSchema.fields,
    kind: Schema.Literal("magic_item"),
    rarity: MagicItemRaritySchema,
    mechanics: MagicItemMechanicsSchema,
    destruction: ItemDestructionPolicySchema,
    requiresAttunement: Schema.Literal(false),
  }),
  Schema.Struct({
    ...UnitMetadataSchema.fields,
    kind: Schema.Literal("magic_item"),
    rarity: MagicItemRaritySchema,
    mechanics: MagicItemMechanicsSchema,
    destruction: ItemDestructionPolicySchema,
    requiresAttunement: Schema.Literal(true),
    attunementRestriction: exactOptional(MagicItemAttunementRestrictionSchema),
  }),
  Schema.Struct({
    ...UnitMetadataSchema.fields,
    kind: Schema.Literal("magic_item"),
    defaultAttunement: MagicItemAttunementSchema,
    variants: Schema.NonEmptyArray(MagicItemVariantSchema),
  }),
);

export const MagicEquipmentTraitSchema = Schema.Struct({
  rarity: MagicItemRaritySchema,
  attunement: MagicItemAttunementSchema,
  mechanics: MagicItemMechanicsSchema,
  destruction: ItemDestructionPolicySchema,
});

export const MagicEquipmentVariantSchema = Schema.Struct({
  id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  description: exactOptional(Schema.String),
  magic: MagicEquipmentTraitSchema,
});

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

export const ArmorRecordSchema = Schema.Union(
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

export const ArmorTemplateRecordSchema = Schema.Struct({
  ...UnitMetadataSchema.fields,
  kind: Schema.Literal("armor_template"),
  template: Schema.Literal("any_armor_magic"),
  armorApplicability: Schema.Struct({
    kind: Schema.Literal("any_armor"),
    categories: Schema.NonEmptyArray(ArmorCategorySchema),
    excludedArmorIds: exactOptional(Schema.Array(NonEmptyStringSchema)),
  }),
  variants: Schema.NonEmptyArray(MagicEquipmentVariantSchema),
});

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

export const ShieldRecordSchema = Schema.Union(
  Schema.Struct(shieldRecordBaseFields),
);

export const ShieldTemplateRecordSchema = Schema.Struct({
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

export const WeaponTemplateRecordSchema = Schema.Struct({
  ...UnitMetadataSchema.fields,
  kind: Schema.Literal("weapon_template"),
  template: Schema.Literal("any_weapon_magic", "ammunition_magic"),
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
  weaponApplicability: Schema.Union(
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
  ),
  variants: Schema.NonEmptyArray(MagicEquipmentVariantSchema),
});

export const WeaponRecordSchema = Schema.Struct({
  ...UnitMetadataSchema.fields,
  kind: Schema.Literal("weapon"),
  category: WeaponCategorySchema,
  usage: WeaponUsageSchema,
  damage: WeaponDamageSchema,
  properties: exactOptional(Schema.Array(WeaponPropertyDetailSchema)),
  mastery: WeaponMasteryNameSchema,
  weightPounds: exactOptional(Schema.Number),
  costGp: Schema.Number,
});

export const UnitRecordSchema = Schema.Union(
  SpellRecordSchema,
  ClassRecordSchema,
  SubclassRecordSchema,
  ClassFeatureRecordSchema,
  BackgroundRecordSchema,
  MasteryRecordSchema,
  FeatRecordSchema,
  SpeciesRecordSchema,
  SpeciesTraitRecordSchema,
  MagicItemRecordSchema,
  ArmorRecordSchema,
  ArmorTemplateRecordSchema,
  ShieldRecordSchema,
  ShieldTemplateRecordSchema,
  WeaponTemplateRecordSchema,
  WeaponRecordSchema,
);
