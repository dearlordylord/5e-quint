import { Schema } from "effect";

import {
  AbilitySchema,
  ArmorCategorySchema,
  ArmorTrainingCategorySchema,
  BackgroundRecordKindSchema,
  ClassRecordKindSchema,
  ClassNameSchema,
  ConditionSchema,
  DiceAmountSchema,
  FeatCategorySchema,
  HeavyArmorAcFormulaSchema,
  LevelAxisSchema,
  LightArmorAcFormulaSchema,
  MagicItemRaritySchema,
  MediumArmorAcFormulaSchema,
  ProvenanceSchema,
  RollKindSchema,
  SkillSchema,
  SpeciesRecordKindSchema,
  StandardActionKindSchema,
  UsageLimitSchema,
  WeaponCategorySchema,
  WeaponDamageSchema,
  WeaponMasteryNameSchema,
  WeaponProficiencyCategorySchema,
  WeaponPropertyDetailSchema,
  WeaponUsageSchema,
} from "./schema-base.ts";
import { exactOptional } from "./schema-helpers.ts";
import {
  ActivationPhaseSchema,
  CreatureControlSchema,
  CreatureDismissalSchema,
  CreatureModeSchema,
  DcSourceSchema,
  DurationSchema,
  EffectAtomSchema,
  OngoingPredicateSchema,
  RangeSchema,
  ReactionTriggerSchema,
  SpellRecordSchema,
  SpawnedCreatureStatBlockSchema,
} from "./schema-spell.ts";

const NonEmptyStringSchema = Schema.NonEmptyTrimmedString;

const numberTierSchema = Schema.Struct({
  atLevel: Schema.Number,
  value: Schema.Number,
});

export const ClassFeatureActivationCostSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("free") }),
  Schema.Struct({
    kind: Schema.Literal("standard_action"),
    action: StandardActionKindSchema,
  }),
  Schema.Struct({ kind: Schema.Literal("action_plus_bonus_action") }),
  Schema.Struct({ kind: Schema.Literal("bonus_action") }),
  Schema.Struct({
    kind: Schema.Literal("reaction"),
    trigger: exactOptional(ReactionTriggerSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("study"),
    hours: Schema.Number,
    withinDays: Schema.Number,
  }),
  Schema.Struct({ kind: Schema.Literal("replace_attack") }),
);

export const UseCountCapSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("fixed"), uses: Schema.Number }),
  Schema.Struct({
    kind: Schema.Literal("threshold_tiers"),
    axis: LevelAxisSchema,
    base: Schema.Number,
    tiers: Schema.NonEmptyArray(numberTierSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("linear_per_level"),
    axis: LevelAxisSchema,
    base: Schema.Number,
    perLevel: Schema.Number,
    startingAtLevel: Schema.Number,
  }),
  Schema.Struct({ kind: Schema.Literal("proficiency_bonus") }),
  Schema.Struct({
    kind: Schema.Literal("ability_modifier"),
    ability: AbilitySchema,
  }),
  Schema.Struct({ kind: Schema.Literal("unlimited") }),
);

export const UseCountResourceSchema = Schema.Struct({
  kind: Schema.Literal("use_count"),
  cap: UseCountCapSchema,
});

export const ChargePoolResourceSchema = Schema.Struct({
  kind: Schema.Literal("charge_pool"),
  cap: Schema.Union(
    Schema.Struct({ kind: Schema.Literal("fixed"), uses: Schema.Number }),
    Schema.Struct({
      kind: Schema.Literal("threshold_tiers"),
      axis: LevelAxisSchema,
      base: Schema.Number,
      tiers: Schema.NonEmptyArray(numberTierSchema),
    }),
    Schema.Struct({
      kind: Schema.Literal("linear_per_level"),
      axis: LevelAxisSchema,
      base: Schema.Number,
      perLevel: Schema.Number,
      startingAtLevel: Schema.Number,
    }),
    Schema.Struct({ kind: Schema.Literal("proficiency_bonus") }),
    Schema.Struct({
      kind: Schema.Literal("ability_modifier"),
      ability: AbilitySchema,
    }),
  ),
  initialCount: exactOptional(DiceAmountSchema),
  lifetimeAbsorptionCap: exactOptional(Schema.Number),
});

export const ActivationResourceSchema = Schema.Union(
  UseCountResourceSchema,
  ChargePoolResourceSchema,
);

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
    hours: Schema.Number,
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

const ActivatedAbilityHeaderSchema = Schema.Struct({
  condition: exactOptional(EquipmentPredicateSchema),
  activationCost: ClassFeatureActivationCostSchema,
  range: exactOptional(RangeSchema),
  resource: ActivationResourceSchema,
  resetCadence: ResetCadenceSchema,
  duration: exactOptional(DurationSchema),
  usageLimit: exactOptional(
    Schema.Struct({ kind: Schema.Literal("once_per_turn") }),
  ),
});

export const ActivatedAbilityMechanicsSchema = Schema.Struct({
  ...ActivatedAbilityHeaderSchema.fields,
  family: Schema.Literal("activation"),
  phases: Schema.NonEmptyArray(ActivationPhaseSchema),
});

export const TriggeredReactionAbilityMechanicsSchema = Schema.Struct({
  condition: exactOptional(EquipmentPredicateSchema),
  resource: ActivationResourceSchema,
  resetCadence: ResetCadenceSchema,
  duration: exactOptional(DurationSchema),
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
  ...ActivatedAbilityHeaderSchema.fields,
  ...MagicItemSpawnedCreaturePayloadSchema.fields,
  family: Schema.Literal("spawned_creature"),
  range: RangeSchema,
});

export const ClassFeatureActivationMechanicsSchema =
  ActivatedAbilityMechanicsSchema;

export const ClassFeatureComponentMechanicsSchema = Schema.Union(
  Schema.suspend(() => PassiveMechanicsSchema),
  ActivatedAbilityMechanicsSchema,
);

export const CompositeClassFeatureMechanicsSchema = Schema.Struct({
  family: Schema.Literal("composite"),
  parts: Schema.NonEmptyArray(ClassFeatureComponentMechanicsSchema),
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
);

export const MasteryTriggerSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("weapon_hit") }),
  Schema.Struct({ kind: Schema.Literal("weapon_hit_melee_only") }),
);

export const SecondaryTargetSelectionSchema = Schema.Struct({
  kind: Schema.Literal("adjacent_to_primary"),
  constraint: Schema.Literal("within_5ft_and_reach"),
});

export const GrantWeaponAttackRiderSchema = Schema.Struct({
  kind: Schema.Literal("grant_weapon_attack"),
  attackKind: Schema.Literal("melee_weapon_attack"),
  secondaryTarget: SecondaryTargetSelectionSchema,
  onHit: Schema.Struct({
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
  Schema.Struct({ kind: Schema.Literal("none") }),
);

export const SaveGateRiderSchema = Schema.Struct({
  kind: Schema.Literal("save_gate"),
  ability: AbilitySchema,
  dc: DcSourceSchema,
  onFail: SaveGateRiderResultSchema,
  onSuccess: SaveGateRiderResultSchema,
});

export const MasteryEffectSchema = Schema.Union(
  ModifyRollAdvantageRiderSchema,
  SaveGateRiderSchema,
  GrantWeaponAttackRiderSchema,
);

export const OnHitTriggerMechanicsSchema = Schema.Struct({
  family: Schema.Literal("on_hit_trigger"),
  trigger: MasteryTriggerSchema,
  optional: Schema.Boolean,
  effect: MasteryEffectSchema,
  usageLimit: exactOptional(UsageLimitSchema),
});

export const MasteryMechanicsSchema = OnHitTriggerMechanicsSchema;

const UnitMetadataSchema = Schema.Struct({
  id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  provenance: ProvenanceSchema,
  description: Schema.String,
});

const NonNegativeIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
);

const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
);

const distinctAbilities = (
  abilities: readonly [unknown, unknown, unknown],
): boolean => new Set(abilities).size === abilities.length;

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

export const ClassRecordSchema = Schema.Struct({
  ...UnitMetadataSchema.fields,
  kind: ClassRecordKindSchema,
  className: ClassNameSchema,
  hitPointDie: PositiveIntegerSchema,
  savingThrowProficiencies: Schema.NonEmptyArray(AbilitySchema),
  skillProficiencyChoice: Schema.Struct({
    choose: PositiveIntegerSchema,
    options: Schema.NonEmptyArray(SkillSchema),
  }),
  weaponProficiencies: Schema.NonEmptyArray(WeaponProficiencyCategorySchema),
  armorTraining: Schema.Array(ArmorTrainingCategorySchema),
  startingEquipment: Schema.NonEmptyArray(StartingEquipmentChoiceSchema),
  featureGrants: Schema.Array(ClassFeatureGrantSchema),
  weaponMastery: exactOptional(
    Schema.Struct({
      level: PositiveIntegerSchema,
      choose: PositiveIntegerSchema,
      eligibleWeapons: Schema.NonEmptyArray(WeaponCategorySchema),
    }),
  ),
});

export const ClassFeatureRecordSchema = Schema.Struct({
  ...UnitMetadataSchema.fields,
  kind: Schema.Literal("class_feature"),
  className: ClassNameSchema,
  acquiredAtLevel: PositiveIntegerSchema,
  mechanics: ClassFeatureMechanicsSchema,
});

export const MasteryRecordSchema = Schema.Struct({
  ...UnitMetadataSchema.fields,
  kind: Schema.Literal("mastery"),
  mechanics: MasteryMechanicsSchema,
});

export const FeatMechanicsSchema = Schema.Union(
  PassiveMechanicsSchema,
  ActivatedAbilityMechanicsSchema,
);

export const FeatRecordSchema = Schema.Struct({
  ...UnitMetadataSchema.fields,
  kind: Schema.Literal("feat"),
  category: FeatCategorySchema,
  mechanics: FeatMechanicsSchema,
});

export const SpeciesTraitMechanicsSchema = Schema.Union(
  PassiveMechanicsSchema,
  ActivatedAbilityMechanicsSchema,
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

export const OrcSpeciesRecordSchema = Schema.Struct({
  ...UnitMetadataSchema.fields,
  kind: SpeciesRecordKindSchema,
  species: Schema.Literal("orc"),
  creatureType: Schema.Literal("humanoid"),
  size: Schema.Struct({
    kind: Schema.Literal("fixed"),
    size: Schema.Literal("medium"),
  }),
  speed: Schema.Struct({
    walkFeet: Schema.Literal(30),
  }),
  traits: OrcSpeciesTraitsSchema,
});

export const SpeciesRecordSchema = OrcSpeciesRecordSchema;

export const MagicItemComponentMechanicsSchema = Schema.Union(
  PassiveMechanicsSchema,
  ActivatedAbilityMechanicsSchema,
  TriggeredReactionAbilityMechanicsSchema,
  OnHitTriggerMechanicsSchema,
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
  Schema.Struct({ kind: Schema.Literal("none") }),
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
