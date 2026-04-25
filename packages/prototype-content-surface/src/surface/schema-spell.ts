import { Schema } from "effect";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import {
  AbilitySchema,
  ConditionSchema,
  CreatureTypeSchema,
  DamageTypeSchema,
  DiceAmountSchema,
  DiceDeltaSchema,
  DurationValueSchema,
  GrantedSpellDurationOverrideSchema,
  GrantedSpellTargetRestrictionSchema,
  LevelAxisSchema,
  LinkedSpeedSchema,
  ProficiencyGrantSchema,
  ProvenanceSchema,
  ResistanceSourceFilterSchema,
  RollKindSchema,
  SavingThrowSourceFilterSchema,
  SkillSchema,
  SpellAccessModeSchema,
  StandardActionKindSchema,
  UsageLimitSchema,
  WeaponFilterSchema,
} from "./schema-base.ts";
import { exactOptional as optionalExact, nonEmpty } from "./schema-helpers.ts";

// Handwritten spell / mechanics surface schema slice built on the shared base
// vocabulary in schema-base.ts.

export const SpellLevelSchema = Schema.Literal(0, 1, 2, 3, 4, 5, 6, 7, 8, 9);

export const SpellSchoolSchema = Schema.Literal(
  "abjuration",
  "conjuration",
  "divination",
  "enchantment",
  "evocation",
  "illusion",
  "necromancy",
  "transmutation",
);

export const LinearPerLevelNumberSchema = Schema.Struct({
  kind: Schema.Literal("linear_per_level"),
  axis: LevelAxisSchema,
  base: Schema.Number,
  perLevel: Schema.Number,
  startingAtLevel: Schema.Number,
});

export const ThresholdTierNumberSchema = Schema.Struct({
  atLevel: Schema.Number,
  value: Schema.Number,
});

export const ThresholdTiersNumberSchema = Schema.Struct({
  kind: Schema.Literal("threshold_tiers"),
  axis: LevelAxisSchema,
  base: Schema.Number,
  tiers: nonEmpty(ThresholdTierNumberSchema),
});

export const DiceExprBaseSchema = Schema.Struct({
  dice: Schema.Number,
  dieSize: Schema.Number,
  flat: optionalExact(Schema.Number),
});

export const CastTimeChoiceDamageTypeSchema = Schema.Struct({
  kind: Schema.Literal("choice"),
  label: Schema.String,
  options: nonEmpty(DamageTypeSchema),
});

export const DamageTypeChoiceTableSchema = nonEmpty(
  Schema.Struct({
    id: Schema.String,
    displayName: Schema.String,
    damageType: DamageTypeSchema,
  }),
);

export const CastTimeEffectModeChoiceSchema = Schema.Struct({
  label: Schema.String,
  options: nonEmpty(
    Schema.Struct({
      id: Schema.String,
      displayName: Schema.String,
      effects: optionalExact(Schema.suspend(() => nonEmpty(EffectAtomSchema))),
    }),
  ),
  allowsMidDurationSwitchAs: optionalExact(Schema.Literal("magic_action")),
});

export const HoleIdSchema = Schema.String;
export const HoleLabelSchema = Schema.String;

function makeHoleSchema<A, I, R>(value: Schema.Schema<A, I, R>) {
  return Schema.Struct({
    kind: Schema.Literal("hole"),
    holeId: HoleIdSchema,
    value,
    label: optionalExact(HoleLabelSchema),
  });
}

export const DamageTypeRefBaseSchema = Schema.Union(
  DamageTypeSchema,
  CastTimeChoiceDamageTypeSchema,
  Schema.Struct({
    kind: Schema.Literal("same_choice_as"),
    holeId: HoleIdSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("choice_table"),
    holeId: HoleIdSchema,
    label: Schema.String,
    options: DamageTypeChoiceTableSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("same_table_choice_as"),
    holeId: HoleIdSchema,
    options: DamageTypeChoiceTableSchema,
  }),
);

export const DamageTypeRefSchema = Schema.Union(
  DamageTypeRefBaseSchema,
  makeHoleSchema(DamageTypeRefBaseSchema),
);

export const ActionRestrictionSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("none"),
  }),
  Schema.Struct({
    kind: Schema.Literal("exclude"),
    actions: nonEmpty(StandardActionKindSchema),
  }),
);

type DamageTypeRef = Schema.Schema.Type<typeof DamageTypeRefSchema>;
type DiceAmount = Schema.Schema.Type<typeof DiceAmountSchema>;
type DiceDelta = Schema.Schema.Type<typeof DiceDeltaSchema>;
type WeaponFilter = Schema.Schema.Type<typeof WeaponFilterSchema>;
type ObjectFilter = Schema.Schema.Type<typeof ObjectFilterSchema>;
type Skill = Schema.Schema.Type<typeof SkillSchema>;
type Condition = Schema.Schema.Type<typeof ConditionSchema>;
type CreatureType = Schema.Schema.Type<typeof CreatureTypeSchema>;
type Ability = Schema.Schema.Type<typeof AbilitySchema>;
type SavingThrowSourceFilter = Schema.Schema.Type<
  typeof SavingThrowSourceFilterSchema
>;
type ActionRestriction = Schema.Schema.Type<typeof ActionRestrictionSchema>;
type ExileDestination =
  | "demiplane"
  | "astral_plane"
  | "ethereal_plane"
  | "plane_of_origin"
  | "different_plane";
type ContainerStorageProfile = {
  readonly maxWeightPounds: number;
  readonly maxVolumeCubicFeet: number;
  readonly weightOverridePounds?: number;
  readonly airSupply?: {
    readonly sharedMinutes: number;
  };
  readonly extradimensional?: true;
};
type Size = Schema.Schema.Type<typeof SizeSchema>;
type AreaShapeSpec = Schema.Schema.Type<typeof AreaShapeSpecSchema>;
type CreatedObjectDurability = Schema.Schema.Type<
  typeof CreatedObjectDurabilitySchema
>;
type IllusionSensoryChannel = Schema.Schema.Type<
  typeof IllusionSensoryChannelSchema
>;
type PolymorphFormSource = Schema.Schema.Type<typeof PolymorphFormSourceSchema>;
type PolymorphRetainedField = Schema.Schema.Type<
  typeof PolymorphRetainedFieldSchema
>;
type PolymorphActionRestriction = Schema.Schema.Type<
  typeof PolymorphActionRestrictionSchema
>;
type PolymorphRevertTrigger = Schema.Schema.Type<
  typeof PolymorphRevertTriggerSchema
>;
type Attachment = Schema.Schema.Type<typeof AttachmentSchema>;
type DcSource = Schema.Schema.Type<typeof DcSourceSchema>;
type CastTimeEffectModeChoice = Schema.Schema.Type<
  typeof CastTimeEffectModeChoiceSchema
>;
type ModifyAcSetBaseEffect = Schema.Schema.Type<
  typeof ModifyAcSetBaseEffectSchema
>;
type ModifyAcSetFloorEffect = Schema.Schema.Type<
  typeof ModifyAcSetFloorEffectSchema
>;
type RollKind = Schema.Schema.Type<typeof RollKindSchema>;
type SpellLevel = Schema.Schema.Type<typeof SpellLevelSchema>;
type SpellSchool = Schema.Schema.Type<typeof SpellSchoolSchema>;

type ReactionTrigger =
  | {
      readonly kind: "hit_by_attack_roll";
      readonly weaponFilter?: WeaponFilter;
    }
  | {
      readonly kind: "takes_damage_from_creature";
      readonly requiresVisibleCreature?: true;
      readonly rangeFeet?: number;
    }
  | { readonly kind: "targeted_by_named_spell"; readonly spellId: string }
  | {
      readonly kind: "creature_casts_spell";
      readonly components: ReadonlyNonEmptyArray<"V" | "S" | "M">;
      readonly spellLevelAtMost?: SpellLevel;
      readonly requiresVisibleCaster?: true;
    }
  | {
      readonly kind: "spell_save_outcome";
      readonly outcome: "success" | "failure";
      readonly spellLevelAtMost?: SpellLevel;
      readonly spellSchool?: SpellSchool;
      readonly spellTargetsOnlySelf?: true;
      readonly spellHasNoAreaOfEffect?: true;
    }
  | {
      readonly kind: "any_of";
      readonly triggers: ReadonlyNonEmptyArray<ReactionTrigger>;
    };

type EffectAtom =
  | {
      readonly kind: "damage";
      readonly damageType: DamageTypeRef;
      readonly amount: DiceAmount;
      readonly timing?: "end_of_next_turn";
    }
  | {
      readonly kind: "conditional_bonus_damage";
      readonly when: {
        readonly kind: "target_creature_type";
        readonly types: ReadonlyNonEmptyArray<CreatureType>;
      };
      readonly damageType: DamageTypeRef;
      readonly amount: DiceAmount;
    }
  | {
      readonly kind: "conditional_by_current_hp";
      readonly threshold: number;
      readonly comparison: "lte" | "lt" | "gte" | "gt" | "eq";
      readonly onMatch: EffectAtom;
      readonly otherwise?: EffectAtom;
    }
  | { readonly kind: "kill_target" }
  | { readonly kind: "end_current_effect" }
  | {
      readonly kind: "repeat_save_for_condition";
      readonly condition: Condition;
      readonly ability: Ability;
      readonly dc: DcSource;
      readonly cadence: "end_of_target_turn";
      readonly onSuccess: "ends_condition";
    }
  | {
      readonly kind: "heal_hp";
      readonly amount: DiceAmount;
      readonly target: "self" | "target_creature";
    }
  | { readonly kind: "heal_to_max_hp"; readonly target: "target_creature" }
  | {
      readonly kind: "modify_max_hp";
      readonly direction: "increase";
      readonly delta: DiceAmount;
    }
  | {
      readonly kind: "modify_max_hp";
      readonly direction: "decrease";
      readonly delta: DiceAmount;
      readonly floor?: number;
    }
  | { readonly kind: "modify_ac"; readonly delta: DiceDelta }
  | ModifyAcSetBaseEffect
  | { readonly kind: "modify_save_dc"; readonly delta: DiceDelta }
  | {
      readonly kind: "apply_condition";
      readonly condition:
        | Condition
        | ReadonlyNonEmptyArray<Condition>
        | {
            readonly kind: "choose";
            readonly from: ReadonlyNonEmptyArray<Condition>;
          };
    }
  | {
      readonly kind: "remove_condition";
      readonly condition:
        | Condition
        | ReadonlyNonEmptyArray<Condition>
        | {
            readonly kind: "choose";
            readonly from: ReadonlyNonEmptyArray<Condition>;
          };
    }
  | {
      readonly kind: "grant_resistance";
      readonly damageType: DamageTypeRef;
      readonly sourceFilter?: Schema.Schema.Type<
        typeof ResistanceSourceFilterSchema
      >;
    }
  | {
      readonly kind: "reduce_damage_taken";
      readonly amount: DiceAmount;
      readonly damageType?: DamageTypeRef;
    }
  | {
      readonly kind: "retaliatory_damage";
      readonly target: "triggering_attacker";
      readonly damageType: DamageTypeRef;
      readonly amount: DiceAmount;
    }
  | {
      readonly kind: "grant_extra_action";
      readonly restriction: ActionRestriction;
    }
  | { readonly kind: "scale_attack_count"; readonly additional: number }
  | {
      readonly kind: "modify_roll_numeric";
      readonly on: ReadonlyNonEmptyArray<RollKind>;
      readonly delta: DiceDelta;
      readonly weaponFilter?: WeaponFilter;
      readonly skillFilter?:
        | {
            readonly kind: "fixed";
            readonly skills: ReadonlyNonEmptyArray<Skill>;
          }
        | {
            readonly kind: "choice";
            readonly options: ReadonlyNonEmptyArray<Skill>;
          };
      readonly count?: number;
    }
  | {
      readonly kind: "modify_damage_numeric";
      readonly delta: DiceDelta;
      readonly weaponFilter?: WeaponFilter;
    }
  | {
      readonly kind: "modify_crit_range";
      readonly threshold: number;
      readonly weaponFilter?: WeaponFilter;
    }
  | { readonly kind: "suppress_incoming_critical_hit" }
  | {
      readonly kind: "modify_roll_advantage";
      readonly mode: "advantage" | "disadvantage";
      readonly on: ReadonlyNonEmptyArray<RollKind>;
      readonly attackerTypeFilter?: ReadonlyNonEmptyArray<CreatureType>;
      readonly skillFilter?:
        | {
            readonly kind: "fixed";
            readonly skills: ReadonlyNonEmptyArray<Skill>;
          }
        | {
            readonly kind: "choice";
            readonly options: ReadonlyNonEmptyArray<Skill>;
          };
      readonly conditionFilter?: ReadonlyNonEmptyArray<Condition>;
      readonly abilityFilter?: ReadonlyNonEmptyArray<Ability>;
      readonly saveAbilityFilter?: ReadonlyNonEmptyArray<Ability>;
      readonly saveSourceFilter?: SavingThrowSourceFilter;
      readonly contextRangeFeet?: number;
      readonly count?: number;
      readonly expiresOn?:
        | { readonly kind: "target_uses_or_turn_start" }
        | { readonly kind: "end_of_next_turn" }
        | { readonly kind: "caster_turn_start" };
    }
  | {
      readonly kind: "suppress_roll_disadvantage";
      readonly on: ReadonlyNonEmptyArray<RollKind>;
      readonly skillFilter?:
        | {
            readonly kind: "fixed";
            readonly skills: ReadonlyNonEmptyArray<Skill>;
          }
        | {
            readonly kind: "choice";
            readonly options: ReadonlyNonEmptyArray<Skill>;
          };
    }
  | {
      readonly kind: "remove_equipment_requirement";
      readonly requirement: "strength";
    }
  | {
      readonly kind: "modify_speed";
      readonly delta: number;
      readonly unit: "feet";
    }
  | { readonly kind: "set_speed"; readonly feet: number }
  | {
      readonly kind: "set_speed_ratio";
      readonly numerator: number;
      readonly denominator: number;
    }
  | {
      readonly kind: "force_move";
      readonly direction: "push" | "pull" | "slide";
      readonly distanceFeet: number;
    }
  | { readonly kind: "block_targeting"; readonly scope: string }
  | { readonly kind: "block_travel"; readonly scope: string }
  | {
      readonly kind: "block_projectiles";
      readonly projectile: "ordinary";
      readonly exception?: "giant_or_siege";
    }
  | { readonly kind: "block_gases_and_gaseous_creatures" }
  | {
      readonly kind: "block_flying_movement";
      readonly maxSize: "small";
      readonly includesObjects?: true;
    }
  | {
      readonly kind: "negate_named_effect";
      readonly spellId: string;
      readonly scope: "damage_only" | "all_effects";
    }
  | {
      readonly kind: "negate_triggering_spell";
      readonly maxSpellLevel?: number;
    }
  | { readonly kind: "reflect_triggering_spell" }
  | { readonly kind: "maximize_healing_received" }
  | {
      readonly kind: "transform_target";
      readonly newForm: PolymorphFormSource;
      readonly retainedFields: ReadonlyNonEmptyArray<PolymorphRetainedField>;
      readonly tempHpFromForm?: true;
      readonly actionRestriction?: PolymorphActionRestriction;
      readonly revertTriggers: ReadonlyNonEmptyArray<PolymorphRevertTrigger>;
    }
  | {
      readonly kind: "end_ongoing_spells";
      readonly maxSpellLevel:
        | number
        | "caster_slot_level"
        | "contested_spell_level";
    }
  | {
      readonly kind: "grant_sense";
      readonly sense: "darkvision" | "blindsight" | "tremorsense" | "truesight";
      readonly rangeFeet: number;
    }
  | {
      readonly kind: "modify_sense_range";
      readonly sense: "darkvision" | "blindsight" | "tremorsense" | "truesight";
      readonly grantIfAbsentFeet: number;
      readonly increaseIfPresentFeet: number;
    }
  | {
      readonly kind: "grant_language_understanding";
      readonly scope: "spoken_or_signed" | "spoken_signed_written_literal";
      readonly intelligibleToAnyLanguageKnower: boolean;
      readonly writtenRequiresTouch?: true;
      readonly excludesCodesAndSecretMessages?: true;
    }
  | {
      readonly kind: "grant_creature_communication";
      readonly creatureType: CreatureType;
      readonly includesInfluenceActionOptions: boolean;
    }
  | { readonly kind: "deny_opportunity_attack" }
  | { readonly kind: "grant_temp_hp"; readonly amount: DiceAmount }
  | {
      readonly kind: "prevent_drop_to_0_hp";
      readonly replacementHp: number;
      readonly consumesEffect?: true;
    }
  | {
      readonly kind: "negate_instant_death";
      readonly consumesEffect?: true;
    }
  | { readonly kind: "grant_condition_immunity"; readonly condition: Condition }
  | {
      readonly kind: "suppress_condition_benefit";
      readonly condition: Condition;
    }
  | {
      readonly kind: "grant_damage_immunity";
      readonly damageType: Schema.Schema.Type<typeof DamageTypeSchema>;
    }
  | { readonly kind: "block_max_hp_reduction" }
  | {
      readonly kind: "set_ability_score";
      readonly ability: Ability;
      readonly value: number;
      readonly mode: "set" | "floor";
    }
  | {
      readonly kind: "modify_ability_score";
      readonly ability: Ability;
      readonly delta: number;
      readonly minimum?: number;
      readonly maximum?: number;
    }
  | {
      readonly kind: "modify_proficiency_bonus";
      readonly delta: number;
      readonly minimum?: number;
      readonly maximum?: number;
    }
  | {
      readonly kind: "detect";
      readonly property:
        | "magic"
        | "evil_and_good"
        | "poison_and_disease"
        | "thoughts";
      readonly radiusFeet: number;
    }
  | {
      readonly kind: "grant_speed";
      readonly speedKind: "fly" | "swim" | "climb" | "burrow";
      readonly feet: number | Schema.Schema.Type<typeof LinkedSpeedSchema>;
      readonly hover?: boolean;
    }
  | { readonly kind: "ignore_web_restrictions" }
  | { readonly kind: "alter_item_kind"; readonly newKind: string }
  | {
      readonly kind: "natural_weapons";
      readonly damageType: Schema.Schema.Type<typeof DamageTypeSchema>;
      readonly damageDie: number;
    }
  | { readonly kind: "water_breathing" }
  | {
      readonly kind: "teleport";
      readonly maxFeet: number;
      readonly destination: "unoccupied_visible_space";
    }
  | { readonly kind: "transport_exile"; readonly destination: ExileDestination }
  | {
      readonly kind: "container_storage";
      readonly storage: ContainerStorageProfile;
    }
  | {
      readonly kind: "create_sensor";
      readonly visibility: "invisible";
      readonly durability: "invulnerable";
      readonly sensorSenses?: ReadonlyNonEmptyArray<{
        readonly kind:
          | "darkvision"
          | "blindsight"
          | "tremorsense"
          | "truesight";
        readonly rangeFeet: number;
      }>;
    }
  | {
      readonly kind: "remote_perception";
      readonly senses: ReadonlyNonEmptyArray<"seeing" | "hearing">;
      readonly switchCost?: "bonus_action";
    }
  | {
      readonly kind: "emit_light";
      readonly brightRadiusFeet: number;
      readonly dimAdditionalFeet?: number;
    }
  | ({ readonly kind: "grant_feat" } & (
      | {
          readonly category:
            | "general"
            | "fighting_style"
            | "epic_boon"
            | "origin";
          readonly openFallback?: "any_qualifying_feat";
        }
      | {
          readonly categories: ReadonlyNonEmptyArray<
            "general" | "fighting_style" | "epic_boon" | "origin"
          >;
          readonly openFallback?: "any_qualifying_feat";
        }
    ))
  | {
      readonly kind: "grant_proficiency";
      readonly proficiency: Schema.Schema.Type<typeof ProficiencyGrantSchema>;
    }
  | {
      readonly kind: "grant_spell_access";
      readonly spellId: string;
      readonly mode: Schema.Schema.Type<typeof SpellAccessModeSchema>;
      readonly dcOverride?: DcSource;
      readonly areaOverride?: AreaShapeSpec;
      readonly targetRestriction?: Schema.Schema.Type<
        typeof GrantedSpellTargetRestrictionSchema
      >;
      readonly durationOverride?: Schema.Schema.Type<
        typeof GrantedSpellDurationOverrideSchema
      >;
    }
  | {
      readonly kind: "composite";
      readonly effects: ReadonlyNonEmptyArray<EffectAtom>;
    }
  | { readonly kind: "block_reanimation" }
  | { readonly kind: "ignite_objects"; readonly filter: ObjectFilter }
  | {
      readonly kind: "create_object";
      readonly maxSize: Size;
      readonly shape?: AreaShapeSpec;
      readonly consumable?: true;
      readonly durability?: CreatedObjectDurability;
    }
  | {
      readonly kind: "create_illusion";
      readonly maxSize: Size;
      readonly channels: ReadonlyNonEmptyArray<IllusionSensoryChannel>;
    }
  | { readonly kind: "force_drop_item" }
  | { readonly kind: "bond_objects" }
  | { readonly kind: "lock_object"; readonly password?: string }
  | { readonly kind: "reposition_attachment"; readonly maxMoveFeet?: number }
  | { readonly kind: "area_is_difficult_terrain" }
  | { readonly kind: "grant_cover"; readonly cover: "three_quarters" }
  | { readonly kind: "allow_reaction_stand_up" }
  | { readonly kind: "none" };

type SaveSuccessOutcome = { readonly kind: "half_damage" } | EffectAtom;

type RepeatSaveSpec = Schema.Schema.Type<typeof RepeatSaveSpecSchema>;
type RandomTableRoll = Schema.Schema.Type<typeof RandomTableRollSchema>;

type RandomTableOutcome = {
  readonly min: number;
  readonly max: number;
  readonly label: string;
  readonly phases?: ReadonlyNonEmptyArray<ActivationPhase>;
};

type ContinuationPredicate = {
  readonly kind: "damage_roll_has_duplicate_faces";
  readonly minimumMultiplicity: 2;
};

type ContinuationLimit =
  | { readonly kind: "max_leaps_from_slot_level" }
  | { readonly kind: "exclude_already_targeted_in_same_cast" };

type PhaseContinuation = {
  readonly kind: "repeat";
  readonly when: ContinuationPredicate;
  readonly limits: ReadonlyNonEmptyArray<ContinuationLimit>;
  readonly next: ReadonlyNonEmptyArray<ActivationPhase>;
};

type ActivationPhase =
  | {
      readonly kind: "attack_roll";
      readonly attachment: Attachment;
      readonly attackKind: "ranged_spell_attack" | "melee_spell_attack";
      readonly onHit: ReadonlyNonEmptyArray<EffectAtom>;
      readonly onMiss: ReadonlyNonEmptyArray<EffectAtom>;
      readonly continue?: PhaseContinuation;
    }
  | {
      readonly kind: "save_gate";
      readonly attachment: Attachment;
      readonly ability: Ability;
      readonly dc: DcSource;
      readonly onFail: EffectAtom;
      readonly onSuccess: SaveSuccessOutcome;
      readonly repeatSave?: RepeatSaveSpec;
      readonly autoSuccessIfCasterSlotGte?: "triggering_spell_level";
      readonly saveAppliesIf?: "unwilling_target";
    }
  | {
      readonly kind: "ability_check_gate";
      readonly attachment: Attachment;
      readonly ability: Ability;
      readonly dc: number;
      readonly onPass: EffectAtom;
      readonly onFail?: EffectAtom;
      readonly autoSuccessIfCasterSlotGte?: "target_spell_level";
    }
  | {
      readonly kind: "random_table";
      readonly roll: RandomTableRoll;
      readonly outcomes: ReadonlyNonEmptyArray<RandomTableOutcome>;
    }
  | {
      readonly kind: "direct";
      readonly attachment: Attachment;
      readonly effects?: ReadonlyNonEmptyArray<EffectAtom>;
      readonly mode?: CastTimeEffectModeChoice;
    };

type OngoingEffect =
  | EffectAtom
  | {
      readonly kind: "save_gate";
      readonly ability: Ability;
      readonly dc: DcSource;
      readonly onFail: EffectAtom;
      readonly onSuccess: SaveSuccessOutcome;
    }
  | {
      readonly kind: "ability_check_gate";
      readonly ability: Ability;
      readonly dc: DcSource;
      readonly onPass: EffectAtom;
      readonly onFail?: EffectAtom;
    }
  | {
      readonly kind: "attack_roll";
      readonly attackKind: "ranged_spell_attack" | "melee_spell_attack";
      readonly onHit: ReadonlyNonEmptyArray<EffectAtom>;
      readonly onMiss: ReadonlyNonEmptyArray<EffectAtom>;
    }
  | {
      readonly kind: "composite_ongoing";
      readonly effects: ReadonlyNonEmptyArray<OngoingEffect>;
    }
  | ModifyAcSetFloorEffect;

export const ReactionTriggerSchema: Schema.suspend<
  ReactionTrigger,
  ReactionTrigger,
  never
> = Schema.suspend(() =>
  Schema.Union(
    Schema.Struct({
      kind: Schema.Literal("hit_by_attack_roll"),
      weaponFilter: optionalExact(WeaponFilterSchema),
    }),
    Schema.Struct({
      kind: Schema.Literal("takes_damage_from_creature"),
      requiresVisibleCreature: optionalExact(Schema.Literal(true)),
      rangeFeet: optionalExact(Schema.Number),
    }),
    Schema.Struct({
      kind: Schema.Literal("targeted_by_named_spell"),
      spellId: Schema.String,
    }),
    Schema.Struct({
      kind: Schema.Literal("creature_casts_spell"),
      components: nonEmpty(Schema.Literal("V", "S", "M")),
      spellLevelAtMost: optionalExact(SpellLevelSchema),
      requiresVisibleCaster: optionalExact(Schema.Literal(true)),
    }),
    Schema.Struct({
      kind: Schema.Literal("spell_save_outcome"),
      outcome: Schema.Literal("success", "failure"),
      spellLevelAtMost: optionalExact(SpellLevelSchema),
      spellSchool: optionalExact(SpellSchoolSchema),
      spellTargetsOnlySelf: optionalExact(Schema.Literal(true)),
      spellHasNoAreaOfEffect: optionalExact(Schema.Literal(true)),
    }),
    Schema.Struct({
      kind: Schema.Literal("any_of"),
      triggers: nonEmpty(ReactionTriggerSchema),
    }),
  ),
);

export const BonusActionTriggerSchema = Schema.Struct({
  kind: Schema.Literal("after_hit_with"),
  attack: Schema.Literal("melee_weapon_or_unarmed_strike", "weapon"),
});

export const CastingTimeSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("action"),
    ritual: optionalExact(Schema.Literal(true)),
  }),
  Schema.Struct({
    kind: Schema.Literal("bonus_action"),
    trigger: optionalExact(BonusActionTriggerSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("reaction"),
    trigger: ReactionTriggerSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("minutes"),
    amount: Schema.Number,
    ritual: Schema.Boolean,
  }),
);

export const RangeSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("self") }),
  Schema.Struct({ kind: Schema.Literal("touch") }),
  Schema.Struct({
    kind: Schema.Literal("point"),
    feet: Schema.Number,
  }),
);

export const ComponentsSchema = Schema.Struct({
  v: Schema.Boolean,
  s: Schema.Boolean,
  m: Schema.Union(Schema.Literal(false), Schema.String),
  materialCostGp: optionalExact(Schema.Number),
  materialConsumed: optionalExact(Schema.Literal(true)),
});

export const DurationEndTriggerSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("target_makes_attack_roll") }),
  Schema.Struct({ kind: Schema.Literal("target_deals_damage") }),
  Schema.Struct({ kind: Schema.Literal("target_casts_spell") }),
  Schema.Struct({ kind: Schema.Literal("target_dons_armor") }),
  Schema.Struct({ kind: Schema.Literal("target_damaged_by_caster_or_ally") }),
  Schema.Struct({ kind: Schema.Literal("target_takes_damage") }),
  Schema.Struct({ kind: Schema.Literal("caster_recasts_spell") }),
);

export const DurationSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("instantaneous"),
  }),
  Schema.Struct({
    kind: Schema.Literal("concentration"),
    upTo: DurationValueSchema,
    earlyEnd: optionalExact(nonEmpty(DurationEndTriggerSchema)),
    permanentIfMaintainedFull: optionalExact(Schema.Literal(true)),
  }),
  Schema.Struct({
    kind: Schema.Literal("timed"),
    value: DurationValueSchema,
    earlyEnd: optionalExact(nonEmpty(DurationEndTriggerSchema)),
  }),
  Schema.Struct({
    kind: Schema.Literal("permanent"),
    endsOn: optionalExact(nonEmpty(Schema.Literal("dispel", "damage"))),
  }),
);

export const SpellMechanicsHeaderSchema = Schema.Struct({
  level: SpellLevelSchema,
  school: SpellSchoolSchema,
  castingTime: CastingTimeSchema,
  range: RangeSchema,
  components: ComponentsSchema,
  duration: DurationSchema,
});

export const TargetTypeFilterSchema = nonEmpty(CreatureTypeSchema);

export const AreaOccupantDispositionFilterSchema = Schema.Literal(
  "friendly_to_source",
  "hostile_to_source",
);

export const SlotScalingNumberSchema = Schema.Struct({
  kind: Schema.Literal("linear"),
  base: Schema.Number,
  perSlotAboveBase: Schema.Number,
  baseLevel: Schema.Number,
});

export const TargetSelectionSchema = Schema.Union(
  Schema.Struct({
    mode: Schema.Literal("one"),
    typeFilter: optionalExact(TargetTypeFilterSchema),
  }),
  Schema.Struct({
    mode: Schema.Literal("choose_up_to"),
    count: Schema.Union(
      Schema.Number,
      SlotScalingNumberSchema,
      ThresholdTiersNumberSchema,
    ),
    repeatsAllowed: optionalExact(Schema.Literal(true)),
    typeFilter: optionalExact(TargetTypeFilterSchema),
  }),
  Schema.Struct({
    mode: Schema.Literal("any_number"),
    typeFilter: optionalExact(TargetTypeFilterSchema),
  }),
);

export const AreaOriginSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("point_within_range") }),
  Schema.Struct({ kind: Schema.Literal("on_primary_target") }),
  Schema.Struct({ kind: Schema.Literal("self") }),
);

export const AreaShapeDescriptorSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("sphere"),
    radiusFeet: Schema.Number,
  }),
  Schema.Struct({
    kind: Schema.Literal("sphere_cluster"),
    count: Schema.Number,
    radiusFeet: Schema.Number,
    overlapResolution: Schema.Literal("affect_once"),
  }),
  Schema.Struct({
    kind: Schema.Literal("cone"),
    lengthFeet: Schema.Number,
  }),
  Schema.Struct({
    kind: Schema.Literal("cube"),
    sideFeet: Schema.Number,
  }),
  Schema.Struct({
    kind: Schema.Literal("cube_cluster"),
    maxCubes: Schema.Number,
    sideFeet: Schema.Number,
    contiguous: optionalExact(Schema.Literal(true)),
  }),
  Schema.Struct({
    kind: Schema.Literal("cylinder"),
    radiusFeet: Schema.Number,
    heightFeet: Schema.Number,
  }),
  Schema.Struct({
    kind: Schema.Literal("emanation"),
    radiusFeet: Schema.Number,
  }),
  Schema.Struct({
    kind: Schema.Literal("line"),
    lengthFeet: Schema.Number,
    widthFeet: Schema.Number,
  }),
);

export const AreaShapeSpecSchema = Schema.Union(
  AreaShapeDescriptorSchema,
  Schema.Struct({
    kind: Schema.Literal("choice"),
    options: nonEmpty(AreaShapeDescriptorSchema),
  }),
);

export const MarkTransferEventSchema = Schema.Struct({
  kind: Schema.Literal("target_drops_to_0_hp"),
});

export const MarkTransferCostSchema = Schema.Struct({
  kind: Schema.Literal("bonus_action"),
});

export const MarkTransferSchema = Schema.Struct({
  onEvent: MarkTransferEventSchema,
  cost: MarkTransferCostSchema,
});

export const AttachmentRangeOriginSchema = Schema.Literal(
  "caster",
  "spell_sensor",
);

export const SizeSchema = Schema.Literal(
  "tiny",
  "small",
  "medium",
  "large",
  "huge",
  "gargantuan",
);

export const ObjectMaterialSchema = Schema.Literal("metal", "flammable");

export const ObjectFilterSchema = Schema.Struct({
  material: optionalExact(ObjectMaterialSchema),
  heldOrWorn: optionalExact(Schema.Literal("required", "forbidden")),
  manufactured: optionalExact(Schema.Boolean),
  maxSize: optionalExact(SizeSchema),
});

export const AttachmentBaseSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("self"),
  }),
  Schema.Struct({
    kind: Schema.Literal("target"),
    selection: TargetSelectionSchema,
    rangeOrigin: optionalExact(AttachmentRangeOriginSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("area"),
    shape: AreaShapeSpecSchema,
    origin: AreaOriginSchema,
    occupantDispositionFilter: optionalExact(
      AreaOccupantDispositionFilterSchema,
    ),
    rangeOrigin: optionalExact(AttachmentRangeOriginSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("mark"),
    selection: TargetSelectionSchema,
    rangeOrigin: optionalExact(AttachmentRangeOriginSchema),
    transfer: optionalExact(MarkTransferSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("object"),
    count: Schema.Literal(1, 2),
    filter: optionalExact(ObjectFilterSchema),
    rangeOrigin: optionalExact(AttachmentRangeOriginSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("location"),
    description: Schema.String,
    rangeOrigin: optionalExact(AttachmentRangeOriginSchema),
  }),
);

export const AttachmentSchema = Schema.Union(
  AttachmentBaseSchema,
  makeHoleSchema(AttachmentBaseSchema),
);

export const ContinuationPredicateSchema = Schema.Struct({
  kind: Schema.Literal("damage_roll_has_duplicate_faces"),
  minimumMultiplicity: Schema.Literal(2),
});

export const ContinuationLimitSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("max_leaps_from_slot_level"),
  }),
  Schema.Struct({
    kind: Schema.Literal("exclude_already_targeted_in_same_cast"),
  }),
);

export const DcSourceSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("caster_spell_save_dc"),
  }),
  Schema.Struct({
    kind: Schema.Literal("fixed"),
    dc: Schema.Number,
  }),
  Schema.Struct({
    kind: Schema.Literal("weapon_attack_dc"),
    base: Schema.Number,
  }),
  Schema.Struct({
    kind: Schema.Literal("innate_dc"),
    base: Schema.Number,
    ability: AbilitySchema,
  }),
);

export const OngoingCasterActionCostSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("bonus_action") }),
  Schema.Struct({
    kind: Schema.Literal("standard_action"),
    action: StandardActionKindSchema,
  }),
);

export const OngoingTriggerSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("passive") }),
  Schema.Struct({ kind: Schema.Literal("on_caster_attack_hit") }),
  Schema.Struct({
    kind: Schema.Literal("on_attached_hit_by_attack_roll"),
    attackKind: optionalExact(Schema.Literal("melee")),
    attackerWithinFeet: optionalExact(Schema.Number),
  }),
  Schema.Struct({ kind: Schema.Literal("on_attached_turn_start") }),
  Schema.Struct({ kind: Schema.Literal("on_caster_turn_start") }),
  Schema.Struct({ kind: Schema.Literal("on_attached_damaged") }),
  Schema.Struct({
    kind: Schema.Literal("on_creature_moves"),
    perFeet: optionalExact(Schema.Number),
  }),
  Schema.Struct({ kind: Schema.Literal("on_creature_enters_area") }),
  Schema.Struct({ kind: Schema.Literal("on_creature_ends_turn_in_area") }),
  Schema.Struct({
    kind: Schema.Literal("on_caster_spends_action"),
    cost: OngoingCasterActionCostSchema,
  }),
  Schema.Struct({ kind: Schema.Literal("on_creature_studies") }),
);

export const OngoingPredicateSchema = Schema.Struct({
  kind: Schema.Literal("at_hp_threshold"),
  threshold: Schema.Number,
  comparison: Schema.Literal("lte", "eq", "gte"),
});

export const ModifyAcSetBaseEffectSchema = Schema.Struct({
  kind: Schema.Literal("modify_ac_set_base"),
  const: Schema.Number,
  abilityMod: AbilitySchema,
});

export const ModifyAcSetFloorEffectSchema = Schema.Struct({
  kind: Schema.Literal("modify_ac_set_floor"),
  const: Schema.Number,
});

export const IllusionSensoryChannelSchema = Schema.Literal(
  "visual",
  "sound",
  "smell",
  "temperature",
);

export const CreatedObjectDurabilitySchema = Schema.Struct({
  acValue: Schema.Number,
  hpPerSection: Schema.Number,
  damageImmunities: optionalExact(nonEmpty(DamageTypeSchema)),
  damageResistances: optionalExact(nonEmpty(DamageTypeSchema)),
  damageVulnerabilities: optionalExact(nonEmpty(DamageTypeSchema)),
});

export const PolymorphFormSourceSchema = Schema.Struct({
  kind: Schema.Literal("catalog_ref"),
  creatureType: CreatureTypeSchema,
  crBound: Schema.Union(
    Schema.Struct({ kind: Schema.Literal("target_cr_or_level") }),
    Schema.Struct({ kind: Schema.Literal("caster_level") }),
    Schema.Struct({
      kind: Schema.Literal("fixed"),
      cr: Schema.Number,
    }),
  ),
});

export const PolymorphRetainedFieldSchema = Schema.Literal(
  "alignment",
  "personality",
  "creature_type",
  "hit_points",
  "hit_point_dice",
  "intelligence",
  "wisdom",
  "charisma",
  "skill_proficiencies",
  "languages",
);

export const PolymorphActionRestrictionSchema = Schema.Literal(
  "no_speech_no_spells",
);

export const PolymorphRevertTriggerSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("zero_hp") }),
  Schema.Struct({ kind: Schema.Literal("spell_ends") }),
  Schema.Struct({ kind: Schema.Literal("temp_hp_depleted") }),
  Schema.Struct({ kind: Schema.Literal("dismissed_by_caster") }),
);

export const EffectAtomSchema: Schema.suspend<EffectAtom, EffectAtom, never> =
  Schema.suspend(() =>
    Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("damage"),
        damageType: DamageTypeRefSchema,
        amount: DiceAmountSchema,
        timing: optionalExact(Schema.Literal("end_of_next_turn")),
      }),
      Schema.Struct({
        kind: Schema.Literal("conditional_bonus_damage"),
        when: Schema.Struct({
          kind: Schema.Literal("target_creature_type"),
          types: nonEmpty(CreatureTypeSchema),
        }),
        damageType: DamageTypeRefSchema,
        amount: DiceAmountSchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("conditional_by_current_hp"),
        threshold: Schema.Number,
        comparison: Schema.Literal("lte", "lt", "gte", "gt", "eq"),
        onMatch: EffectAtomSchema,
        otherwise: optionalExact(EffectAtomSchema),
      }),
      Schema.Struct({ kind: Schema.Literal("kill_target") }),
      Schema.Struct({ kind: Schema.Literal("end_current_effect") }),
      Schema.Struct({
        kind: Schema.Literal("repeat_save_for_condition"),
        condition: ConditionSchema,
        ability: AbilitySchema,
        dc: DcSourceSchema,
        cadence: Schema.Literal("end_of_target_turn"),
        onSuccess: Schema.Literal("ends_condition"),
      }),
      Schema.Struct({
        kind: Schema.Literal("heal_hp"),
        amount: DiceAmountSchema,
        target: Schema.Literal("self", "target_creature"),
      }),
      Schema.Struct({
        kind: Schema.Literal("heal_to_max_hp"),
        target: Schema.Literal("target_creature"),
      }),
      Schema.Struct({
        kind: Schema.Literal("modify_max_hp"),
        direction: Schema.Literal("increase"),
        delta: DiceAmountSchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("modify_max_hp"),
        direction: Schema.Literal("decrease"),
        delta: DiceAmountSchema,
        floor: optionalExact(Schema.Number),
      }),
      Schema.Struct({
        kind: Schema.Literal("modify_ac"),
        delta: DiceDeltaSchema,
      }),
      ModifyAcSetBaseEffectSchema,
      Schema.Struct({
        kind: Schema.Literal("modify_save_dc"),
        delta: DiceDeltaSchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("apply_condition"),
        condition: Schema.Union(
          ConditionSchema,
          nonEmpty(ConditionSchema),
          Schema.Struct({
            kind: Schema.Literal("choose"),
            from: nonEmpty(ConditionSchema),
          }),
        ),
      }),
      Schema.Struct({
        kind: Schema.Literal("remove_condition"),
        condition: Schema.Union(
          ConditionSchema,
          nonEmpty(ConditionSchema),
          Schema.Struct({
            kind: Schema.Literal("choose"),
            from: nonEmpty(ConditionSchema),
          }),
        ),
      }),
      Schema.Struct({
        kind: Schema.Literal("grant_resistance"),
        damageType: DamageTypeRefSchema,
        sourceFilter: optionalExact(ResistanceSourceFilterSchema),
      }),
      Schema.Struct({
        kind: Schema.Literal("reduce_damage_taken"),
        amount: DiceAmountSchema,
        damageType: optionalExact(DamageTypeRefSchema),
      }),
      Schema.Struct({
        kind: Schema.Literal("retaliatory_damage"),
        target: Schema.Literal("triggering_attacker"),
        damageType: DamageTypeRefSchema,
        amount: DiceAmountSchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("grant_extra_action"),
        restriction: ActionRestrictionSchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("scale_attack_count"),
        additional: Schema.Number,
      }),
      Schema.Struct({
        kind: Schema.Literal("modify_roll_numeric"),
        on: nonEmpty(RollKindSchema),
        delta: DiceDeltaSchema,
        weaponFilter: optionalExact(WeaponFilterSchema),
        skillFilter: optionalExact(
          Schema.Union(
            Schema.Struct({
              kind: Schema.Literal("fixed"),
              skills: nonEmpty(SkillSchema),
            }),
            Schema.Struct({
              kind: Schema.Literal("choice"),
              options: nonEmpty(SkillSchema),
            }),
          ),
        ),
        count: optionalExact(Schema.Number),
      }),
      Schema.Struct({
        kind: Schema.Literal("modify_damage_numeric"),
        delta: DiceDeltaSchema,
        weaponFilter: optionalExact(WeaponFilterSchema),
      }),
      Schema.Struct({
        kind: Schema.Literal("modify_crit_range"),
        threshold: Schema.Number,
        weaponFilter: optionalExact(WeaponFilterSchema),
      }),
      Schema.Struct({
        kind: Schema.Literal("suppress_incoming_critical_hit"),
      }),
      Schema.Struct({
        kind: Schema.Literal("modify_roll_advantage"),
        mode: Schema.Literal("advantage", "disadvantage"),
        on: nonEmpty(RollKindSchema),
        attackerTypeFilter: optionalExact(nonEmpty(CreatureTypeSchema)),
        skillFilter: optionalExact(
          Schema.Union(
            Schema.Struct({
              kind: Schema.Literal("fixed"),
              skills: nonEmpty(SkillSchema),
            }),
            Schema.Struct({
              kind: Schema.Literal("choice"),
              options: nonEmpty(SkillSchema),
            }),
          ),
        ),
        conditionFilter: optionalExact(nonEmpty(ConditionSchema)),
        abilityFilter: optionalExact(nonEmpty(AbilitySchema)),
        saveAbilityFilter: optionalExact(nonEmpty(AbilitySchema)),
        saveSourceFilter: optionalExact(SavingThrowSourceFilterSchema),
        contextRangeFeet: optionalExact(Schema.Number),
        count: optionalExact(Schema.Number),
        expiresOn: optionalExact(
          Schema.Union(
            Schema.Struct({
              kind: Schema.Literal("target_uses_or_turn_start"),
            }),
            Schema.Struct({ kind: Schema.Literal("end_of_next_turn") }),
            Schema.Struct({ kind: Schema.Literal("caster_turn_start") }),
          ),
        ),
      }),
      Schema.Struct({
        kind: Schema.Literal("suppress_roll_disadvantage"),
        on: nonEmpty(RollKindSchema),
        skillFilter: optionalExact(
          Schema.Union(
            Schema.Struct({
              kind: Schema.Literal("fixed"),
              skills: nonEmpty(SkillSchema),
            }),
            Schema.Struct({
              kind: Schema.Literal("choice"),
              options: nonEmpty(SkillSchema),
            }),
          ),
        ),
      }),
      Schema.Struct({
        kind: Schema.Literal("remove_equipment_requirement"),
        requirement: Schema.Literal("strength"),
      }),
      Schema.Struct({
        kind: Schema.Literal("modify_speed"),
        delta: Schema.Number,
        unit: Schema.Literal("feet"),
      }),
      Schema.Struct({
        kind: Schema.Literal("set_speed"),
        feet: Schema.Number,
      }),
      Schema.Struct({
        kind: Schema.Literal("set_speed_ratio"),
        numerator: Schema.Number,
        denominator: Schema.Number,
      }),
      Schema.Struct({
        kind: Schema.Literal("force_move"),
        direction: Schema.Literal("push", "pull", "slide"),
        distanceFeet: Schema.Number,
      }),
      Schema.Struct({
        kind: Schema.Literal("block_targeting"),
        scope: Schema.String,
      }),
      Schema.Struct({
        kind: Schema.Literal("block_travel"),
        scope: Schema.String,
      }),
      Schema.Struct({
        kind: Schema.Literal("block_projectiles"),
        projectile: Schema.Literal("ordinary"),
        exception: optionalExact(Schema.Literal("giant_or_siege")),
      }),
      Schema.Struct({
        kind: Schema.Literal("block_gases_and_gaseous_creatures"),
      }),
      Schema.Struct({
        kind: Schema.Literal("block_flying_movement"),
        maxSize: Schema.Literal("small"),
        includesObjects: optionalExact(Schema.Literal(true)),
      }),
      Schema.Struct({
        kind: Schema.Literal("negate_named_effect"),
        spellId: Schema.String,
        scope: Schema.Literal("damage_only", "all_effects"),
      }),
      Schema.Struct({
        kind: Schema.Literal("negate_triggering_spell"),
        maxSpellLevel: optionalExact(Schema.Number),
      }),
      Schema.Struct({ kind: Schema.Literal("reflect_triggering_spell") }),
      Schema.Struct({ kind: Schema.Literal("maximize_healing_received") }),
      Schema.Struct({
        kind: Schema.Literal("transform_target"),
        newForm: PolymorphFormSourceSchema,
        retainedFields: nonEmpty(PolymorphRetainedFieldSchema),
        tempHpFromForm: optionalExact(Schema.Literal(true)),
        actionRestriction: optionalExact(PolymorphActionRestrictionSchema),
        revertTriggers: nonEmpty(PolymorphRevertTriggerSchema),
      }),
      Schema.Struct({
        kind: Schema.Literal("end_ongoing_spells"),
        maxSpellLevel: Schema.Union(
          Schema.Number,
          Schema.Literal("caster_slot_level", "contested_spell_level"),
        ),
      }),
      Schema.Struct({
        kind: Schema.Literal("grant_sense"),
        sense: Schema.Literal(
          "darkvision",
          "blindsight",
          "tremorsense",
          "truesight",
        ),
        rangeFeet: Schema.Number,
      }),
      Schema.Struct({
        kind: Schema.Literal("modify_sense_range"),
        sense: Schema.Literal(
          "darkvision",
          "blindsight",
          "tremorsense",
          "truesight",
        ),
        grantIfAbsentFeet: Schema.Number,
        increaseIfPresentFeet: Schema.Number,
      }),
      Schema.Struct({
        kind: Schema.Literal("grant_language_understanding"),
        scope: Schema.Literal(
          "spoken_or_signed",
          "spoken_signed_written_literal",
        ),
        intelligibleToAnyLanguageKnower: Schema.Boolean,
        writtenRequiresTouch: optionalExact(Schema.Literal(true)),
        excludesCodesAndSecretMessages: optionalExact(Schema.Literal(true)),
      }),
      Schema.Struct({
        kind: Schema.Literal("grant_creature_communication"),
        creatureType: CreatureTypeSchema,
        includesInfluenceActionOptions: Schema.Boolean,
      }),
      Schema.Struct({ kind: Schema.Literal("deny_opportunity_attack") }),
      Schema.Struct({
        kind: Schema.Literal("grant_temp_hp"),
        amount: DiceAmountSchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("prevent_drop_to_0_hp"),
        replacementHp: Schema.Number,
        consumesEffect: optionalExact(Schema.Literal(true)),
      }),
      Schema.Struct({
        kind: Schema.Literal("negate_instant_death"),
        consumesEffect: optionalExact(Schema.Literal(true)),
      }),
      Schema.Struct({
        kind: Schema.Literal("grant_feat"),
        category: Schema.Literal(
          "general",
          "fighting_style",
          "epic_boon",
          "origin",
        ),
        openFallback: optionalExact(Schema.Literal("any_qualifying_feat")),
      }),
      Schema.Struct({
        kind: Schema.Literal("grant_feat"),
        categories: nonEmpty(
          Schema.Literal("general", "fighting_style", "epic_boon", "origin"),
        ),
        openFallback: optionalExact(Schema.Literal("any_qualifying_feat")),
      }),
      Schema.Struct({
        kind: Schema.Literal("grant_proficiency"),
        proficiency: ProficiencyGrantSchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("grant_spell_access"),
        spellId: Schema.String,
        mode: SpellAccessModeSchema,
        dcOverride: optionalExact(DcSourceSchema),
        areaOverride: optionalExact(AreaShapeSpecSchema),
        targetRestriction: optionalExact(GrantedSpellTargetRestrictionSchema),
        durationOverride: optionalExact(GrantedSpellDurationOverrideSchema),
      }),
      Schema.Struct({
        kind: Schema.Literal("grant_condition_immunity"),
        condition: ConditionSchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("suppress_condition_benefit"),
        condition: ConditionSchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("grant_damage_immunity"),
        damageType: DamageTypeSchema,
      }),
      Schema.Struct({ kind: Schema.Literal("block_max_hp_reduction") }),
      Schema.Struct({
        kind: Schema.Literal("set_ability_score"),
        ability: AbilitySchema,
        value: Schema.Number,
        mode: Schema.Literal("set", "floor"),
      }),
      Schema.Struct({
        kind: Schema.Literal("modify_ability_score"),
        ability: AbilitySchema,
        delta: Schema.Number,
        minimum: optionalExact(Schema.Number),
        maximum: optionalExact(Schema.Number),
      }),
      Schema.Struct({
        kind: Schema.Literal("modify_proficiency_bonus"),
        delta: Schema.Number,
        minimum: optionalExact(Schema.Number),
        maximum: optionalExact(Schema.Number),
      }),
      Schema.Struct({
        kind: Schema.Literal("detect"),
        property: Schema.Literal(
          "magic",
          "evil_and_good",
          "poison_and_disease",
          "thoughts",
        ),
        radiusFeet: Schema.Number,
      }),
      Schema.Struct({
        kind: Schema.Literal("grant_speed"),
        speedKind: Schema.Literal("fly", "swim", "climb", "burrow"),
        feet: Schema.Union(Schema.Number, LinkedSpeedSchema),
        hover: optionalExact(Schema.Boolean),
      }),
      Schema.Struct({ kind: Schema.Literal("ignore_web_restrictions") }),
      Schema.Struct({
        kind: Schema.Literal("alter_item_kind"),
        newKind: Schema.String,
      }),
      Schema.Struct({
        kind: Schema.Literal("natural_weapons"),
        damageType: DamageTypeSchema,
        damageDie: Schema.Number,
      }),
      Schema.Struct({ kind: Schema.Literal("water_breathing") }),
      Schema.Struct({
        kind: Schema.Literal("teleport"),
        maxFeet: Schema.Number,
        destination: Schema.Literal("unoccupied_visible_space"),
      }),
      Schema.Struct({
        kind: Schema.Literal("transport_exile"),
        destination: Schema.Literal(
          "demiplane",
          "astral_plane",
          "ethereal_plane",
          "plane_of_origin",
          "different_plane",
        ),
      }),
      Schema.Struct({
        kind: Schema.Literal("container_storage"),
        storage: Schema.Struct({
          maxWeightPounds: Schema.Number,
          maxVolumeCubicFeet: Schema.Number,
          weightOverridePounds: optionalExact(Schema.Number),
          airSupply: optionalExact(
            Schema.Struct({
              sharedMinutes: Schema.Number,
            }),
          ),
          extradimensional: optionalExact(Schema.Literal(true)),
        }),
      }),
      Schema.Struct({
        kind: Schema.Literal("create_sensor"),
        visibility: Schema.Literal("invisible"),
        durability: Schema.Literal("invulnerable"),
        sensorSenses: optionalExact(
          nonEmpty(
            Schema.Struct({
              kind: Schema.Literal(
                "darkvision",
                "blindsight",
                "tremorsense",
                "truesight",
              ),
              rangeFeet: Schema.Number,
            }),
          ),
        ),
      }),
      Schema.Struct({
        kind: Schema.Literal("remote_perception"),
        senses: nonEmpty(Schema.Literal("seeing", "hearing")),
        switchCost: optionalExact(Schema.Literal("bonus_action")),
      }),
      Schema.Struct({
        kind: Schema.Literal("emit_light"),
        brightRadiusFeet: Schema.Number,
        dimAdditionalFeet: optionalExact(Schema.Number),
      }),
      Schema.Struct({
        kind: Schema.Literal("composite"),
        effects: nonEmpty(EffectAtomSchema),
      }),
      Schema.Struct({ kind: Schema.Literal("block_reanimation") }),
      Schema.Struct({
        kind: Schema.Literal("ignite_objects"),
        filter: ObjectFilterSchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("create_object"),
        maxSize: SizeSchema,
        shape: optionalExact(AreaShapeSpecSchema),
        consumable: optionalExact(Schema.Literal(true)),
        durability: optionalExact(CreatedObjectDurabilitySchema),
      }),
      Schema.Struct({
        kind: Schema.Literal("create_illusion"),
        maxSize: SizeSchema,
        channels: nonEmpty(IllusionSensoryChannelSchema),
      }),
      Schema.Struct({ kind: Schema.Literal("force_drop_item") }),
      Schema.Struct({ kind: Schema.Literal("bond_objects") }),
      Schema.Struct({
        kind: Schema.Literal("lock_object"),
        password: optionalExact(Schema.String),
      }),
      Schema.Struct({
        kind: Schema.Literal("reposition_attachment"),
        maxMoveFeet: optionalExact(Schema.Number),
      }),
      Schema.Struct({ kind: Schema.Literal("area_is_difficult_terrain") }),
      Schema.Struct({
        kind: Schema.Literal("grant_cover"),
        cover: Schema.Literal("three_quarters"),
      }),
      Schema.Struct({ kind: Schema.Literal("allow_reaction_stand_up") }),
      Schema.Struct({ kind: Schema.Literal("none") }),
    ),
  );

export const SaveSuccessOutcomeSchema: Schema.suspend<
  SaveSuccessOutcome,
  SaveSuccessOutcome,
  never
> = Schema.suspend(() =>
  Schema.Union(
    Schema.Struct({
      kind: Schema.Literal("half_damage"),
    }),
    EffectAtomSchema,
  ),
);

export const RepeatSaveSpecSchema = Schema.Struct({
  cadence: Schema.Literal("end_of_target_turn", "on_target_takes_damage"),
  onSuccess: Schema.Literal("ends_on_target"),
  onFailAgain: optionalExact(EffectAtomSchema),
});

export const RandomTableRollSchema = Schema.Struct({
  die: Schema.Number,
  modifier: optionalExact(Schema.Number),
});

export const RandomTableOutcomeSchema: Schema.suspend<
  RandomTableOutcome,
  RandomTableOutcome,
  never
> = Schema.suspend(() =>
  Schema.Struct({
    min: Schema.Number,
    max: Schema.Number,
    label: Schema.String,
    phases: optionalExact(nonEmpty(ActivationPhaseSchema)),
  }),
);

export const PhaseContinuationSchema: Schema.suspend<
  PhaseContinuation,
  PhaseContinuation,
  never
> = Schema.suspend(() =>
  Schema.Struct({
    kind: Schema.Literal("repeat"),
    when: ContinuationPredicateSchema,
    limits: nonEmpty(ContinuationLimitSchema),
    next: nonEmpty(ActivationPhaseSchema),
  }),
);

export const ActivationPhaseSchema: Schema.suspend<
  ActivationPhase,
  ActivationPhase,
  never
> = Schema.suspend(() =>
  Schema.Union(
    Schema.Struct({
      kind: Schema.Literal("attack_roll"),
      attachment: AttachmentSchema,
      attackKind: Schema.Literal("ranged_spell_attack", "melee_spell_attack"),
      onHit: nonEmpty(EffectAtomSchema),
      onMiss: nonEmpty(EffectAtomSchema),
      continue: optionalExact(PhaseContinuationSchema),
    }),
    Schema.Struct({
      kind: Schema.Literal("save_gate"),
      attachment: AttachmentSchema,
      ability: AbilitySchema,
      dc: DcSourceSchema,
      onFail: EffectAtomSchema,
      onSuccess: SaveSuccessOutcomeSchema,
      repeatSave: optionalExact(RepeatSaveSpecSchema),
      autoSuccessIfCasterSlotGte: optionalExact(
        Schema.Literal("triggering_spell_level"),
      ),
      saveAppliesIf: optionalExact(Schema.Literal("unwilling_target")),
    }),
    Schema.Struct({
      kind: Schema.Literal("ability_check_gate"),
      attachment: AttachmentSchema,
      ability: AbilitySchema,
      dc: Schema.Number,
      onPass: EffectAtomSchema,
      onFail: optionalExact(EffectAtomSchema),
      autoSuccessIfCasterSlotGte: optionalExact(
        Schema.Literal("target_spell_level"),
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("random_table"),
      roll: RandomTableRollSchema,
      outcomes: nonEmpty(RandomTableOutcomeSchema),
    }),
    Schema.Struct({
      kind: Schema.Literal("direct"),
      attachment: AttachmentSchema,
      effects: optionalExact(nonEmpty(EffectAtomSchema)),
      mode: optionalExact(CastTimeEffectModeChoiceSchema),
    }),
  ),
);

export const OngoingEffectSchema: Schema.suspend<
  OngoingEffect,
  OngoingEffect,
  never
> = Schema.suspend(() =>
  Schema.Union(
    EffectAtomSchema,
    Schema.Struct({
      kind: Schema.Literal("save_gate"),
      ability: AbilitySchema,
      dc: DcSourceSchema,
      onFail: EffectAtomSchema,
      onSuccess: SaveSuccessOutcomeSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("ability_check_gate"),
      ability: AbilitySchema,
      dc: DcSourceSchema,
      onPass: EffectAtomSchema,
      onFail: optionalExact(EffectAtomSchema),
    }),
    Schema.Struct({
      kind: Schema.Literal("attack_roll"),
      attackKind: Schema.Literal("ranged_spell_attack", "melee_spell_attack"),
      onHit: nonEmpty(EffectAtomSchema),
      onMiss: nonEmpty(EffectAtomSchema),
    }),
    Schema.Struct({
      kind: Schema.Literal("composite_ongoing"),
      effects: nonEmpty(OngoingEffectSchema),
    }),
    ModifyAcSetFloorEffectSchema,
  ),
);

export const OngoingOperationSchema = Schema.Struct({
  trigger: OngoingTriggerSchema,
  predicate: optionalExact(OngoingPredicateSchema),
  effect: OngoingEffectSchema,
  usageLimit: optionalExact(UsageLimitSchema),
});

export const OngoingEffectMechanicsSchema = Schema.extend(
  SpellMechanicsHeaderSchema,
  Schema.Struct({
    family: Schema.Literal("ongoing_effect"),
    attachment: AttachmentSchema,
    initialPhase: optionalExact(ActivationPhaseSchema),
    operations: nonEmpty(OngoingOperationSchema),
  }),
);

export const ActivationMechanicsSchema = Schema.extend(
  SpellMechanicsHeaderSchema,
  Schema.Struct({
    family: Schema.Literal("activation"),
    phases: nonEmpty(ActivationPhaseSchema),
  }),
);

export const TriggeredReactionMechanicsSchema = Schema.extend(
  SpellMechanicsHeaderSchema,
  Schema.Struct({
    family: Schema.Literal("triggered_reaction"),
    interruptsTrigger: Schema.Boolean,
    phases: nonEmpty(ActivationPhaseSchema),
  }),
);

export const AnchorTargetSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("location"),
    description: Schema.Literal("door_or_window"),
  }),
  Schema.Struct({
    kind: Schema.Literal("area"),
    shape: Schema.Struct({
      kind: Schema.Literal("cube"),
      maxSideFeet: Schema.Number,
    }),
  }),
);

export const AnchoredEventSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("physical_contact") }),
  Schema.Struct({ kind: Schema.Literal("enters_area") }),
);

export const AnchoredFilterSchema = Schema.Struct({
  kind: Schema.Literal("creature_exemption_list"),
  chosenAtCast: Schema.Literal(true),
});

export const AnchoredSignalSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("audible"),
    sound: Schema.String,
    durationSeconds: Schema.Number,
    audibleRadiusFeet: Schema.Number,
  }),
  Schema.Struct({
    kind: Schema.Literal("mental"),
    rangeFeet: Schema.Number,
    awakensIfAsleep: Schema.Boolean,
  }),
);

export const AnchoredTriggerMechanicsSchema = Schema.extend(
  SpellMechanicsHeaderSchema,
  Schema.Struct({
    family: Schema.Literal("anchored_trigger"),
    anchor: AnchorTargetSchema,
    events: Schema.Array(AnchoredEventSchema),
    filters: Schema.Array(AnchoredFilterSchema),
    signals: Schema.Array(AnchoredSignalSchema),
  }),
);

export const StatBlockValueSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("literal"),
    value: Schema.Number,
  }),
  LinearPerLevelNumberSchema,
  Schema.Struct({
    kind: Schema.Literal("caster_derived"),
    source: Schema.Literal(
      "spell_attack_mod",
      "spell_save_dc",
      "proficiency_bonus",
      "spellcasting_ability_mod",
    ),
  }),
);

export const SixAbilityScoresSchema = Schema.Struct({
  str: Schema.Number,
  dex: Schema.Number,
  con: Schema.Number,
  int: Schema.Number,
  wis: Schema.Number,
  cha: Schema.Number,
});

export const CreatureSpeedSchema = Schema.Struct({
  kind: Schema.Literal("walk", "fly", "swim", "climb", "burrow"),
  feet: StatBlockValueSchema,
  requiresSlotLevel: optionalExact(Schema.Number),
});

export const CreatureResistanceListSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("fixed"),
    damageTypes: nonEmpty(DamageTypeSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("choose_one_from"),
    options: nonEmpty(DamageTypeSchema),
  }),
);

export const CreatureImmunityListSchema = Schema.Struct({
  damageTypes: optionalExact(nonEmpty(DamageTypeSchema)),
  conditions: optionalExact(nonEmpty(ConditionSchema)),
});

export const CreatureSenseSchema = Schema.Struct({
  kind: Schema.Literal("darkvision", "blindsight", "tremorsense", "truesight"),
  rangeFeet: Schema.Number,
});

export const CreatureNamedAttackRollSchema = Schema.Struct({
  name: Schema.String,
  attackType: Schema.Literal("melee", "ranged"),
  attackBonus: StatBlockValueSchema,
  reachFeet: optionalExact(Schema.Number),
  rangeFeet: optionalExact(
    Schema.Struct({
      normal: Schema.Number,
      long: Schema.Number,
    }),
  ),
  onHit: nonEmpty(EffectAtomSchema),
  multiattackCount: optionalExact(StatBlockValueSchema),
});

export const CreatureNamedSaveGateSchema = Schema.Struct({
  name: Schema.String,
  ability: AbilitySchema,
  dc: DcSourceSchema,
  area: AreaShapeDescriptorSchema,
  onFail: EffectAtomSchema,
  onSuccess: SaveSuccessOutcomeSchema,
  multiattackCount: optionalExact(StatBlockValueSchema),
});

export const CreatureNamedSupportSchema = Schema.Struct({
  name: Schema.String,
  target: Schema.Literal("self", "ally_in_range"),
  rangeFeet: optionalExact(Schema.Number),
  effect: EffectAtomSchema,
  multiattackCount: optionalExact(StatBlockValueSchema),
});

export const CreatureNamedMultiattackSchema = Schema.Struct({
  name: Schema.String,
  dispatches: nonEmpty(
    Schema.Struct({
      name: Schema.String,
      count: StatBlockValueSchema,
    }),
  ),
});

export const CreatureActionsSchema = Schema.Struct({
  multiattacks: optionalExact(nonEmpty(CreatureNamedMultiattackSchema)),
  attacks: optionalExact(nonEmpty(CreatureNamedAttackRollSchema)),
  saves: optionalExact(nonEmpty(CreatureNamedSaveGateSchema)),
  supports: optionalExact(nonEmpty(CreatureNamedSupportSchema)),
});

export const CreatureTraitEffectSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("caster_shared_resistance"),
    chosenFrom: Schema.Literal("resistances_list"),
  }),
  Schema.Struct({
    kind: Schema.Literal("caster_heal_link"),
    rangeFeet: Schema.Number,
  }),
);

export const CreatureTraitSchema = Schema.Struct({
  name: Schema.String,
  description: Schema.String,
  effect: optionalExact(CreatureTraitEffectSchema),
});

export const CastTimeChoiceSizeSchema = Schema.Struct({
  kind: Schema.Literal("choice"),
  label: Schema.String,
  options: nonEmpty(SizeSchema),
});

export const CastTimeChoiceCreatureTypeSchema = Schema.Struct({
  kind: Schema.Literal("choice"),
  label: Schema.String,
  options: nonEmpty(CreatureTypeSchema),
});

export const CreatureStatBlockSchema = Schema.Struct({
  displayName: Schema.String,
  size: Schema.Union(SizeSchema, CastTimeChoiceSizeSchema),
  creatureType: Schema.Union(
    CreatureTypeSchema,
    CastTimeChoiceCreatureTypeSchema,
  ),
  ac: StatBlockValueSchema,
  hp: StatBlockValueSchema,
  speeds: nonEmpty(CreatureSpeedSchema),
  abilityScores: SixAbilityScoresSchema,
  saveProficiencies: optionalExact(nonEmpty(AbilitySchema)),
  resistances: optionalExact(CreatureResistanceListSchema),
  immunities: optionalExact(CreatureImmunityListSchema),
  senses: optionalExact(nonEmpty(CreatureSenseSchema)),
  languages: optionalExact(
    Schema.Union(Schema.Literal("caster_languages"), nonEmpty(Schema.String)),
  ),
  actions: optionalExact(CreatureActionsSchema),
  bonusActions: optionalExact(CreatureActionsSchema),
  reactions: optionalExact(CreatureActionsSchema),
  traits: optionalExact(nonEmpty(CreatureTraitSchema)),
});

export const CreatureStatBlockOverridesSchema = Schema.Struct({
  creatureType: optionalExact(CreatureTypeSchema),
  speeds: optionalExact(nonEmpty(CreatureSpeedSchema)),
  resistances: optionalExact(CreatureResistanceListSchema),
  immunities: optionalExact(CreatureImmunityListSchema),
  traits: optionalExact(nonEmpty(CreatureTraitSchema)),
  actions: optionalExact(CreatureActionsSchema),
  bonusActions: optionalExact(CreatureActionsSchema),
});

export const CreatureModeSchema = Schema.Struct({
  label: Schema.String,
  options: nonEmpty(
    Schema.Struct({
      id: Schema.String,
      displayName: Schema.String,
      overrides: CreatureStatBlockOverridesSchema,
    }),
  ),
});

export const CreatureControlSchema = Schema.Struct({
  initiative: Schema.Literal("shared_with_caster", "own_roll"),
  turnOrder: optionalExact(Schema.Literal("immediately_after_caster")),
  commandCost: Schema.Union(
    Schema.Struct({ kind: Schema.Literal("no_action_required") }),
    Schema.Struct({ kind: Schema.Literal("bonus_action") }),
    Schema.Struct({ kind: Schema.Literal("action") }),
  ),
  commandRangeFeet: optionalExact(Schema.Number),
  defaultBehavior: optionalExact(
    Schema.Literal("dodge_and_avoid", "independent"),
  ),
  telepathy: optionalExact(
    Schema.Struct({
      rangeFeet: Schema.Number,
      sharedSenses: optionalExact(Schema.Literal("bonus_action")),
    }),
  ),
  oneAtATime: optionalExact(Schema.Literal(true)),
});

export const CreatureDismissalSchema = Schema.Struct({
  onZeroHp: Schema.Literal("disappears"),
  onSpellEnd: Schema.Literal("disappears"),
  caster0Hp: optionalExact(Schema.Literal("disappears")),
  manualDismiss: optionalExact(
    Schema.Literal("magic_action", "bonus_action", "never"),
  ),
  leavesBehind: optionalExact(Schema.Literal("equipment", "nothing")),
});

export const TemplatedCapacitySchema = Schema.Struct({
  kind: Schema.Literal("caster_ability_modifier"),
  ability: AbilitySchema,
});

export const TemplatedSizeTierSchema = Schema.Struct({
  size: SizeSchema,
  weight: Schema.Number,
  hp: StatBlockValueSchema,
  slamDamage: DiceAmountSchema,
});

export const TemplatedMultiSpawnMechanicsSchema = Schema.extend(
  SpellMechanicsHeaderSchema,
  Schema.Struct({
    family: Schema.Literal("templated_multi_spawn"),
    capacity: TemplatedCapacitySchema,
    baseStatBlock: CreatureStatBlockSchema,
    sizeTiers: nonEmpty(TemplatedSizeTierSchema),
    control: CreatureControlSchema,
    revertOnZeroHp: Schema.Literal(true),
  }),
);

export const ReanimationTargetKindSchema = Schema.Literal(
  "corpse_or_bones_of_small_or_medium_humanoid",
  "corpse_of_small_or_medium_humanoid",
);

export const ReanimationSlotOptionSchema = Schema.Struct({
  monsterId: Schema.String,
  count: Schema.Number,
});

export const ReanimationSlotEntrySchema = Schema.Struct({
  slotLevel: Schema.Number,
  options: nonEmpty(ReanimationSlotOptionSchema),
});

export const ReanimationMenuSchema = nonEmpty(ReanimationSlotEntrySchema);

export const ReanimationReassertWindowSchema = Schema.Struct({
  hours: Schema.Number,
  maxReassertPerCast: Schema.Number,
});

export const ReanimatedCreatureMechanicsSchema = Schema.extend(
  SpellMechanicsHeaderSchema,
  Schema.Struct({
    family: Schema.Literal("reanimated_creature"),
    targetKind: ReanimationTargetKindSchema,
    menu: ReanimationMenuSchema,
    control: CreatureControlSchema,
    reassertWindow: ReanimationReassertWindowSchema,
    nightOnly: optionalExact(Schema.Literal(true)),
  }),
);

export const SpawnedCreatureStatBlockSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("inline"),
    statBlock: CreatureStatBlockSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("catalog_ref"),
    monsterId: Schema.String,
    displayName: Schema.String,
  }),
);

export const SpawnedCreaturePayloadSchema = Schema.Struct({
  creature: SpawnedCreatureStatBlockSchema,
  mode: optionalExact(CreatureModeSchema),
  control: CreatureControlSchema,
  dismissal: CreatureDismissalSchema,
});

export const SpawnedCreatureMechanicsSchema = Schema.extend(
  SpellMechanicsHeaderSchema,
  Schema.extend(
    SpawnedCreaturePayloadSchema,
    Schema.Struct({
      family: Schema.Literal("spawned_creature"),
    }),
  ),
);

export const SpellMechanicsSchema = Schema.Union(
  OngoingEffectMechanicsSchema,
  ActivationMechanicsSchema,
  TriggeredReactionMechanicsSchema,
  AnchoredTriggerMechanicsSchema,
  SpawnedCreatureMechanicsSchema,
  ReanimatedCreatureMechanicsSchema,
  TemplatedMultiSpawnMechanicsSchema,
);

export const SpellRecordSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  provenance: ProvenanceSchema,
  description: Schema.String,
  kind: Schema.Literal("spell"),
  mechanics: SpellMechanicsSchema,
});
