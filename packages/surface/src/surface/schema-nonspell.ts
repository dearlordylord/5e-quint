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
  NON_FIGHTER_NON_WIZARD_CLASS_NAMES,
  NON_WIZARD_CLASS_NAMES,
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

const NonNegativeIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
);

const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
);

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
  duration: exactOptional(DurationSchema),
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
  ...ResourceActivatedAbilityFields,
  activationCost: ClassFeatureActivationCostSchema,
  ...MagicItemSpawnedCreaturePayloadSchema.fields,
  family: Schema.Literal("spawned_creature"),
  range: RangeSchema,
});

export const ClassFeatureActivationMechanicsSchema =
  ActivatedAbilityMechanicsSchema;

export const ClassFeatureComponentMechanicsSchema = Schema.Union(
  Schema.suspend(() => PassiveMechanicsSchema),
  ActivatedAbilityMechanicsSchema,
  Schema.suspend(() => OnHitTriggerMechanicsSchema),
  Schema.suspend(() => SaveDamageReplacementMechanicsSchema),
);

export const CompositeClassFeatureMechanicsSchema = Schema.Struct({
  family: Schema.Literal("composite"),
  parts: Schema.NonEmptyArray(ClassFeatureComponentMechanicsSchema),
});

export const RitualAdeptMechanicsSchema = Schema.Struct({
  family: Schema.Literal("wizard_ritual_adept"),
  source: Schema.Literal("spellbook"),
  preparationRequirement: Schema.Literal("not_prepared"),
});

export const ArcaneRecoveryMechanicsSchema = Schema.Struct({
  family: Schema.Literal("arcane_recovery"),
  recoveryTrigger: Schema.Literal("short_rest"),
  resetCadence: Schema.Struct({ kind: Schema.Literal("long_rest") }),
  recoveredSlotLevelCap: Schema.Struct({
    kind: Schema.Literal("half_class_level_rounded_up"),
    maximumSlotLevelExclusive: Schema.Literal(6),
  }),
});

export const TacticalMindMechanicsSchema = Schema.Struct({
  family: Schema.Literal("failed_ability_check_second_wind_boost"),
  trigger: Schema.Struct({ kind: Schema.Literal("failed_ability_check") }),
  spends: Schema.Struct({
    resourceUnitId: Schema.Literal("fighter_second_wind"),
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

export const WeaponMasteryChoiceMechanicsSchema = Schema.Struct({
  family: Schema.Literal("weapon_mastery_choice"),
  choose: PositiveIntegerSchema,
  eligibleWeapons: Schema.NonEmptyArray(WeaponCategorySchema),
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
  WeaponMasteryChoiceMechanicsSchema,
  RitualAdeptMechanicsSchema,
  ArcaneRecoveryMechanicsSchema,
  TacticalMindMechanicsSchema,
);

export const ClassGeneralFeatureMechanicsSchema = Schema.Union(
  ClassFeatureComponentMechanicsSchema,
  CompositeClassFeatureMechanicsSchema,
  WeaponMasteryChoiceMechanicsSchema,
);

export const WizardClassFeatureMechanicsSchema = Schema.Union(
  RitualAdeptMechanicsSchema,
  ArcaneRecoveryMechanicsSchema,
);

export const FighterClassFeatureMechanicsSchema = TacticalMindMechanicsSchema;

export const MasteryTriggerSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("weapon_hit") }),
  Schema.Struct({ kind: Schema.Literal("weapon_hit_melee_only") }),
);

export const AttackDamageRiderTriggerSchema = Schema.Struct({
  kind: Schema.Literal("attack_roll_hit"),
  weaponFilter: Schema.Literal("finesse_or_ranged"),
  rollRequirement: Schema.Literal(
    "advantage_or_ally_adjacent_without_disadvantage",
  ),
});

export const ClassLevelDamageDiceSchema = Schema.Struct({
  kind: Schema.Literal("class_level_table"),
  className: ClassNameSchema,
  dieSize: PositiveIntegerSchema,
  dice: Schema.NonEmptyArray(
    Schema.Struct({
      atLevel: PositiveIntegerSchema,
      count: PositiveIntegerSchema,
    }),
  ),
});

export const AddAttackDamageDiceRiderSchema = Schema.Struct({
  kind: Schema.Literal("add_attack_damage_dice"),
  dice: ClassLevelDamageDiceSchema,
  damageType: Schema.Literal("same_as_attack"),
});

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

export const RerollWeaponDamageDiceRiderSchema = Schema.Struct({
  kind: Schema.Literal("reroll_weapon_damage_dice"),
  diceScope: Schema.Literal("weapon_damage_dice"),
  choose: Schema.Literal("either_roll"),
});

export const MasteryEffectSchema = Schema.Union(
  ModifyRollAdvantageRiderSchema,
  SaveGateRiderSchema,
  GrantWeaponAttackRiderSchema,
);

export const OnHitRiderEffectSchema = Schema.Union(
  MasteryEffectSchema,
  RerollWeaponDamageDiceRiderSchema,
  AddAttackDamageDiceRiderSchema,
);

export const OnHitTriggerMechanicsSchema = Schema.Struct({
  family: Schema.Literal("on_hit_trigger"),
  trigger: Schema.Union(MasteryTriggerSchema, AttackDamageRiderTriggerSchema),
  optional: Schema.Boolean,
  effect: OnHitRiderEffectSchema,
  usageLimit: exactOptional(UsageLimitSchema),
});

export const MasteryMechanicsSchema = Schema.Struct({
  family: Schema.Literal("on_hit_trigger"),
  trigger: MasteryTriggerSchema,
  optional: Schema.Boolean,
  effect: MasteryEffectSchema,
  usageLimit: exactOptional(UsageLimitSchema),
});

export const HitPointReplacementTriggerSchema = Schema.Struct({
  kind: Schema.Literal("reduced_to_0_hp_not_killed_outright"),
});

export const HitPointReplacementEffectSchema = Schema.Struct({
  kind: Schema.Literal("prevent_drop_to_0_hp"),
  replacementHp: Schema.Number,
});

export const TriggeredReplacementMechanicsSchema = Schema.Struct({
  family: Schema.Literal("triggered_replacement"),
  trigger: HitPointReplacementTriggerSchema,
  effect: HitPointReplacementEffectSchema,
  optional: Schema.Boolean,
  resetCadence: RestResetCadenceSchema,
});

const UnitMetadataSchema = Schema.Struct({
  id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  provenance: ProvenanceSchema,
  description: Schema.String,
});

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
  Schema.Struct({ kind: Schema.Literal("none") }),
);

const SpellSlotProjectionSchema = Schema.Struct({
  kind: Schema.Literal("leveled_spell_slots"),
  slots: Schema.NonEmptyArray(
    Schema.Struct({
      spellLevel: PositiveIntegerSchema,
      count: NonNegativeIntegerSchema,
    }),
  ),
  resetCadence: Schema.Struct({ kind: Schema.Literal("long_rest") }),
});

const SpellbookSpellAccessSchema = Schema.Struct({
  spellId: NonEmptyStringSchema,
  spellLevel: PositiveIntegerSchema,
});

const distinctStrings = (values: readonly string[]): boolean =>
  new Set(values).size === values.length;

export const WizardSpellcastingCreationSchema = Schema.Struct({
  kind: Schema.Literal("wizard_spellcasting_creation"),
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
  spellcastingFocuses: Schema.NonEmptyArray(
    Schema.Literal("arcane_focus", "spellbook"),
  ),
}).pipe(
  Schema.filter(
    (spellcasting) => {
      if (
        spellcasting.cantripAccess.choose !==
          spellcasting.cantripAccess.spellIds.length ||
        spellcasting.spellbookAccess.choose !==
          spellcasting.spellbookAccess.spells.length ||
        spellcasting.preparedAccess.choose !==
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

      const spellbookById = new Map(
        spellcasting.spellbookAccess.spells.map((spell) => [
          spell.spellId,
          spell.spellLevel,
        ]),
      );
      const availableSlotLevels = new Set(
        spellcasting.spellSlotProjection.slots
          .filter((slot) => slot.count > 0)
          .map((slot) => slot.spellLevel),
      );

      return spellcasting.preparedAccess.spellIds.every((spellId) => {
        const spellLevel = spellbookById.get(spellId);

        return spellLevel !== undefined && availableSlotLevels.has(spellLevel);
      });
    },
    {
      message: () =>
        "Wizard spellcasting choices must match their counts, be unique, and prepare only spellbook spells with available Spell Slot levels.",
    },
  ),
);

const ClassRecordBaseFields = {
  ...UnitMetadataSchema.fields,
  kind: ClassRecordKindSchema,
  hitPointDie: PositiveIntegerSchema,
  savingThrowProficiencies: Schema.NonEmptyArray(AbilitySchema),
  skillProficiencyChoice: Schema.Struct({
    choose: PositiveIntegerSchema,
    options: Schema.NonEmptyArray(SkillSchema),
  }),
  weaponProficiencies: Schema.NonEmptyArray(WeaponProficiencyCategorySchema),
  armorTraining: ArmorTrainingSchema,
  startingEquipment: Schema.NonEmptyArray(StartingEquipmentChoiceSchema),
  featureGrants: Schema.Array(ClassFeatureGrantSchema),
};

export const WizardClassRecordSchema = Schema.Struct({
  ...ClassRecordBaseFields,
  className: Schema.Literal("wizard"),
  spellcasting: WizardSpellcastingCreationSchema,
});

export const NonWizardClassRecordSchema = Schema.Struct({
  ...ClassRecordBaseFields,
  className: Schema.Literal(...NON_WIZARD_CLASS_NAMES),
  spellcasting: exactOptional(Schema.Never),
});

export const ClassRecordSchema = Schema.Union(
  WizardClassRecordSchema,
  NonWizardClassRecordSchema,
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

export const OtherClassFeatureRecordSchema = Schema.Struct({
  ...ClassFeatureRecordBaseFields,
  className: Schema.Literal(...NON_FIGHTER_NON_WIZARD_CLASS_NAMES),
  mechanics: ClassGeneralFeatureMechanicsSchema,
});

export const ClassFeatureRecordSchema = Schema.Union(
  WizardClassFeatureRecordSchema,
  FighterClassFeatureRecordSchema,
  OtherClassFeatureRecordSchema,
);

export const MasteryRecordSchema = Schema.Struct({
  ...UnitMetadataSchema.fields,
  kind: Schema.Literal("mastery"),
  mechanics: MasteryMechanicsSchema,
});

export const FeatMechanicsSchema = Schema.Union(
  PassiveMechanicsSchema,
  ActivatedAbilityMechanicsSchema,
  OnHitTriggerMechanicsSchema,
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
