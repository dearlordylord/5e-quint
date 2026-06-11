import { Schema } from "effect";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type { ClassName } from "@dnd/shared/game-facts";
import {
  AbilitySchema,
  AlternateActionCostSchema,
  ClassLevelChoiceCountSchema,
  CLASS_SPELLCASTING_CLASS_NAMES,
  ClassNameSchema,
  ConditionSchema,
  CreatureTypeSchema,
  DamageTypeSchema,
  DiceAmountSchema,
  DiceDeltaSchema,
  DiceExprSchema,
  DurationValueSchema,
  GrantedSpellDurationOverrideSchema,
  GrantedSpellTargetRestrictionSchema,
  LevelAxisSchema,
  LinkedSpeedSchema,
  MagicalitySchema,
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
import {
  exactOptional as optionalExact,
  nonEmpty,
  strictStruct,
} from "./schema-helpers.ts";

// Handwritten spell / mechanics surface schema slice built on the shared base
// vocabulary in schema-base.ts.

export const SPELL_SLOT_LEVELS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9,
] as const satisfies ReadonlyArray<number>;

export const SpellLevelSchema = Schema.Literal(0, 1, 2, 3, 4, 5, 6, 7, 8, 9);
export const SpellSlotLevelSchema = Schema.Literal(...SPELL_SLOT_LEVELS);
const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
);

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

const DETECTION_PROPERTIES = [
  "magic",
  "evil_and_good",
  "poison_and_disease",
  "thoughts",
  "traps",
] as const satisfies ReadonlyNonEmptyArray<string>;
const DetectionPropertySchema = Schema.Literal(...DETECTION_PROPERTIES);
type DetectionProperty = Schema.Schema.Type<typeof DetectionPropertySchema>;

const LOCATE_KIND_SUBJECTS = [
  "beast",
  "plant_creature",
  "nonmagical_plant",
] as const satisfies ReadonlyNonEmptyArray<string>;
const LocateKindSubjectSchema = Schema.Literal(...LOCATE_KIND_SUBJECTS);
type LocateKindSubject = Schema.Schema.Type<typeof LocateKindSubjectSchema>;

const ObjectLocationSenseSearchModesSchema = strictStruct({
  specificKnownObject: strictStruct({
    seenUpCloseWithinFeet: Schema.Literal(30),
  }),
  nearestObjectKind: Schema.Literal("particular_kind"),
});
type ObjectLocationSenseSearchModes = Schema.Schema.Type<
  typeof ObjectLocationSenseSearchModesSchema
>;

export const DivinationOmenEffectSchema = strictStruct({
  kind: Schema.Literal("divination_omen"),
  source: Schema.Literal("otherworldly_entity"),
  subject: strictStruct({
    kind: Schema.Literal("planned_course_of_action"),
    plannedWithinMinutes: Schema.Literal(30),
  }),
  adjudication: strictStruct({
    kind: Schema.Literal("gm_chosen_omen_table"),
    table: strictStruct({
      good: Schema.Literal("weal"),
      bad: Schema.Literal("woe"),
      goodAndBad: Schema.Literal("weal_and_woe"),
      neitherGoodNorBad: Schema.Literal("indifference"),
    }),
  }),
  changedCircumstances: Schema.Literal("not_accounted_for"),
  repeatCasting: strictStruct({
    resetBy: Schema.Literal("long_rest"),
    noAnswerChance: strictStruct({
      kind: Schema.Literal("cumulative_percent_per_cast_after_first"),
      percent: Schema.Literal(25),
      result: Schema.Literal("no_answer"),
    }),
  }),
});

const SPELL_CREATED_HELD_OBJECT_REQUIREMENTS = [
  "free_hand",
] as const satisfies ReadonlyNonEmptyArray<string>;
const SpellCreatedHeldObjectRequirementSchema = Schema.Literal(
  ...SPELL_CREATED_HELD_OBJECT_REQUIREMENTS,
);

const SPELL_CREATED_HELD_OBJECT_DISAPPEARANCE_TRIGGERS = [
  "caster_lets_go",
] as const satisfies ReadonlyNonEmptyArray<string>;
const SpellCreatedHeldObjectDisappearanceTriggerSchema = Schema.Literal(
  ...SPELL_CREATED_HELD_OBJECT_DISAPPEARANCE_TRIGGERS,
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
export const TargetCountThresholdTierSchema = Schema.Struct({
  atLevel: PositiveIntegerSchema,
  value: PositiveIntegerSchema,
});

export const TargetCountThresholdTiersSchema = Schema.Struct({
  kind: Schema.Literal("threshold_tiers"),
  axis: LevelAxisSchema,
  base: PositiveIntegerSchema,
  tiers: nonEmpty(TargetCountThresholdTierSchema),
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

export const CastTimeChoiceAbilitySchema = Schema.Struct({
  kind: Schema.Literal("choice"),
  label: Schema.String,
  options: nonEmpty(AbilitySchema),
});

export const AbilityFilterSchema = Schema.Union(
  nonEmpty(AbilitySchema),
  makeHoleSchema(CastTimeChoiceAbilitySchema),
  Schema.Struct({
    kind: Schema.Literal("per_target_hole"),
    holeId: HoleIdSchema,
    value: CastTimeChoiceAbilitySchema,
    label: optionalExact(HoleLabelSchema),
  }),
);

export const DamageTypeRefBaseSchema = Schema.Union(
  DamageTypeSchema,
  Schema.Struct({
    kind: Schema.Literal("all_damage_types"),
  }),
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

const AlterSelfNaturalWeaponGrowthDamageTypeChoiceSchema = strictStruct({
  kind: Schema.Literal("choice_table"),
  holeId: Schema.Literal("alter_self_natural_weapon_growth"),
  label: Schema.Literal("natural weapon growth"),
  options: Schema.Tuple(
    strictStruct({
      id: Schema.Literal("claws"),
      displayName: Schema.Literal("claws"),
      damageType: Schema.Literal("slashing"),
    }),
    strictStruct({
      id: Schema.Literal("fangs"),
      displayName: Schema.Literal("fangs"),
      damageType: Schema.Literal("piercing"),
    }),
    strictStruct({
      id: Schema.Literal("horns"),
      displayName: Schema.Literal("horns"),
      damageType: Schema.Literal("piercing"),
    }),
    strictStruct({
      id: Schema.Literal("hooves"),
      displayName: Schema.Literal("hooves"),
      damageType: Schema.Literal("bludgeoning"),
    }),
  ),
});

export const ActionRestrictionSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("none"),
  }),
  Schema.Struct({
    kind: Schema.Literal("exclude"),
    actions: nonEmpty(StandardActionKindSchema),
  }),
);

export const CommandTargetNextTurnOptionsSchema = strictStruct({
  approach: strictStruct({
    route: Schema.Literal("shortest_direct_to_caster"),
    endsTurnWhenWithinFeet: Schema.Literal(5),
  }),
  drop: strictStruct({
    objectSet: Schema.Literal("held_objects"),
    afterward: Schema.Literal("end_turn"),
  }),
  flee: strictStruct({
    direction: Schema.Literal("away_from_caster"),
    means: Schema.Literal("fastest_available"),
    duration: Schema.Literal("target_turn"),
  }),
  grovel: strictStruct({
    condition: Schema.Literal("prone"),
    afterward: Schema.Literal("end_turn"),
  }),
  halt: strictStruct({
    movement: Schema.Literal("none"),
    action: Schema.Literal("none"),
    bonusAction: Schema.Literal("none"),
    duration: Schema.Literal("target_turn"),
  }),
});

export const ForcedReactionMovementSchema = strictStruct({
  kind: Schema.Literal("forced_reaction_movement"),
  cost: Schema.Literal("target_reaction_if_available"),
  unavailable: Schema.Literal("no_movement"),
  distance: Schema.Literal("as_far_as_possible"),
  direction: Schema.Literal("away_from_caster"),
  route: Schema.Literal("safest_available"),
});

export const JumpMovementReplacementSchema = strictStruct({
  kind: Schema.Literal("jump_movement_replacement"),
  frequency: Schema.Literal("once_on_each_target_turn"),
  maxJumpDistanceFeet: PositiveIntegerSchema,
  movementCostFeet: PositiveIntegerSchema,
});

export const FeatherFallMitigationSchema = strictStruct({
  kind: Schema.Literal("feather_fall_mitigation"),
  descentRateCapFeetPerRound: Schema.Literal(60),
  landingOutcome: Schema.Literal("no_fall_damage_and_end_for_target"),
});

export const AudibleEffectSchema = strictStruct({
  kind: Schema.Literal("audible"),
  sound: Schema.String,
  audibleRadiusFeet: PositiveIntegerSchema,
});

export const AreaPushUnsecuredObjectsSchema = strictStruct({
  kind: Schema.Literal("push_unsecured_objects"),
  objectLocation: Schema.Literal("entirely_within_area"),
  originDirection: Schema.Literal("away_from_caster"),
  distanceFeet: PositiveIntegerSchema,
});

export const DamageSourceFilterSchema = strictStruct({
  kind: Schema.Literal("attack_hit"),
  attackRollFilter: Schema.Literal("weapon_or_unarmed_strike"),
});

const MagicWeaponEnhancementBonusSchema = strictStruct({
  kind: Schema.Literal("threshold_tiers"),
  axis: Schema.Literal("slot"),
  base: Schema.Literal(1),
  tiers: Schema.Tuple(
    strictStruct({
      atLevel: Schema.Literal(3),
      value: Schema.Literal(2),
    }),
    strictStruct({
      atLevel: Schema.Literal(6),
      value: Schema.Literal(3),
    }),
  ),
  sign: Schema.Literal("+"),
});

export const ForceMovePushEffectSchema = strictStruct({
  kind: Schema.Literal("force_move"),
  movementKind: Schema.Literal("push"),
  originDirection: optionalExact(Schema.Literal("away_from_caster")),
  distanceFeet: PositiveIntegerSchema,
});

export const ForceMovePullSlideEffectSchema = strictStruct({
  kind: Schema.Literal("force_move"),
  movementKind: Schema.Literal("pull", "slide"),
  distanceFeet: PositiveIntegerSchema,
});

export const ForceMoveAnyDirectionEffectSchema = strictStruct({
  kind: Schema.Literal("force_move"),
  movementKind: Schema.Literal("move"),
  direction: Schema.Literal("any_direction"),
  distanceFeet: PositiveIntegerSchema,
});

export const ForceMoveEffectSchema = Schema.Union(
  ForceMovePushEffectSchema,
  ForceMovePullSlideEffectSchema,
  ForceMoveAnyDirectionEffectSchema,
);

type DamageTypeRef = Schema.Schema.Type<typeof DamageTypeRefSchema>;
type DiceAmount = Schema.Schema.Type<typeof DiceAmountSchema>;
type DiceDelta = Schema.Schema.Type<typeof DiceDeltaSchema>;
type MagicWeaponEnhancementBonus = Schema.Schema.Type<
  typeof MagicWeaponEnhancementBonusSchema
>;
type WeaponFilter = Schema.Schema.Type<typeof WeaponFilterSchema>;
type ObjectFilter = Schema.Schema.Type<typeof ObjectFilterSchema>;
type Skill = Schema.Schema.Type<typeof SkillSchema>;
type Condition = Schema.Schema.Type<typeof ConditionSchema>;
type CreatureType = Schema.Schema.Type<typeof CreatureTypeSchema>;
type Ability = Schema.Schema.Type<typeof AbilitySchema>;
const SpellcastingAbilityCheckAbilitySchema = Schema.Union(
  AbilitySchema,
  Schema.Literal("caster_spellcasting_ability"),
);
type SpellcastingAbilityCheckAbility = Schema.Schema.Type<
  typeof SpellcastingAbilityCheckAbilitySchema
>;
type UsageLimit = Schema.Schema.Type<typeof UsageLimitSchema>;
type AbilityFilter = Schema.Schema.Type<typeof AbilityFilterSchema>;
type SavingThrowSourceFilter = Schema.Schema.Type<
  typeof SavingThrowSourceFilterSchema
>;
type ActionRestriction = Schema.Schema.Type<typeof ActionRestrictionSchema>;
type ActionEconomyKind = "action" | "bonus_action" | "reaction";
type StandardActionKind = Schema.Schema.Type<typeof StandardActionKindSchema>;
type TargetEffectEscapeAction = {
  readonly kind: "target_effect_escape_action";
  readonly actor: "another_creature";
  readonly cost: "action";
  readonly method: "shake_awake";
  readonly outcome: "end_current_effect";
};
type AlternateActionCost = Schema.Schema.Type<typeof AlternateActionCostSchema>;
type ExileDestination =
  | "demiplane"
  | "astral_plane"
  | "ethereal_plane"
  | "plane_of_origin"
  | "different_plane";
type ClassLevelChoiceCount = Schema.Schema.Type<
  typeof ClassLevelChoiceCountSchema
>;
type ClassSpellListName = (typeof CLASS_SPELLCASTING_CLASS_NAMES)[number];
type AlterSelfNaturalWeaponGrowthDamageTypeChoice = Schema.Schema.Type<
  typeof AlterSelfNaturalWeaponGrowthDamageTypeChoiceSchema
>;

function distinctSkills(skills: readonly Skill[]): boolean {
  return new Set(skills).size === skills.length;
}
type SpellGrantedWeaponAttack = {
  readonly kind: "make_weapon_attack";
  readonly weapon: "material_component";
  readonly abilityOverride?: "spellcasting";
  readonly damageTypeChoice?: ReadonlyNonEmptyArray<
    "radiant" | "weapon_normal"
  >;
  readonly bonusDamage?: {
    readonly damageType: DamageTypeRef;
    readonly amount: DiceAmount;
  };
};
type SpellWeaponAttackOverride = {
  readonly kind: "override_attached_weapon_attack";
  readonly replacesAbility: "str";
  readonly attackRollAbility: "spellcasting";
  readonly damageRollAbility: "spellcasting";
  readonly attackScope: "melee_attacks_using_attached_weapon";
  readonly damageDie: DiceAmount;
  readonly damageTypeChoice: readonly ["force", "weapon_normal"];
};
type ContainerStorageProfile = {
  readonly maxWeightPounds: number;
  readonly maxVolumeCubicFeet: number;
  readonly weightOverridePounds?: number;
  readonly airSupply?: {
    readonly sharedMinutes: number;
  };
  readonly extradimensional?: true;
};
type ExtradimensionalSpaceEffect = Schema.Schema.Type<
  typeof ExtradimensionalSpaceEffectSchema
>;
type Size = Schema.Schema.Type<typeof SizeSchema>;
type AreaShapeSpec = Schema.Schema.Type<typeof AreaShapeSpecSchema>;
type CreatedObjectDurability = Schema.Schema.Type<
  typeof CreatedObjectDurabilitySchema
>;
type IllusionSensoryChannel = Schema.Schema.Type<
  typeof IllusionSensoryChannelSchema
>;
type ShapeShiftFormSource = Schema.Schema.Type<
  typeof ShapeShiftFormSourceSchema
>;
type ShapeShiftRetainedField = Schema.Schema.Type<
  typeof ShapeShiftRetainedFieldSchema
>;
type ShapeShiftActionRestriction = Schema.Schema.Type<
  typeof ShapeShiftActionRestrictionSchema
>;
type CommandTargetNextTurnOptions = Schema.Schema.Type<
  typeof CommandTargetNextTurnOptionsSchema
>;
type ForcedReactionMovement = Schema.Schema.Type<
  typeof ForcedReactionMovementSchema
>;
type JumpMovementReplacement = Schema.Schema.Type<
  typeof JumpMovementReplacementSchema
>;
type FeatherFallMitigation = Schema.Schema.Type<
  typeof FeatherFallMitigationSchema
>;
type ForceMoveEffect = Schema.Schema.Type<typeof ForceMoveEffectSchema>;
type AudibleEffect = Schema.Schema.Type<typeof AudibleEffectSchema>;
type AreaPushUnsecuredObjects = Schema.Schema.Type<
  typeof AreaPushUnsecuredObjectsSchema
>;
type DamageSourceFilter = Schema.Schema.Type<typeof DamageSourceFilterSchema>;
type AreaScopedEffectAtom = AreaPushUnsecuredObjects;
type AreaDirectEffectAtom = EffectAtom | AreaScopedEffectAtom;
type LandChoiceSpellAccessTier = {
  readonly minimumClassLevel: number;
  readonly spellIds: ReadonlyNonEmptyArray<string>;
};
type ClassLevelPreparedSpellAccessTier = {
  readonly minimumClassLevel: number;
  readonly spellIds: ReadonlyNonEmptyArray<string>;
};
type ShapeShiftRevertTrigger = Schema.Schema.Type<
  typeof ShapeShiftRevertTriggerSchema
>;
type AreaAttachment = Schema.Schema.Type<typeof AreaAttachmentSchema>;
type CreatureTargetAttachment = Schema.Schema.Type<
  typeof CreatureTargetAttachmentSchema
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
  | { readonly kind: "self_or_visible_creature_falls"; readonly rangeFeet: 60 }
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

type AttackRollAbilityCheckDisadvantageUntilCasterTurnStart = {
  readonly kind: "modify_roll_advantage";
  readonly mode: "disadvantage";
  readonly on: readonly ["attack_roll", "ability_check"];
  readonly expiresOn: { readonly kind: "caster_turn_start" };
};

type ObjectContactDamageEffect = {
  readonly kind: "object_contact_damage";
  readonly contact: {
    readonly kind: "table_witnessed_physical_contact_with_spell_object";
  };
  readonly damageType: DamageTypeRef;
  readonly amount: DiceAmount;
  readonly holdingOrWearingSave: {
    readonly appliesIf: {
      readonly kind: "table_witnessed_holding_or_wearing_spell_object";
    };
    readonly ability: "con";
    readonly dc: DcSource;
    readonly onSuccess: { readonly kind: "none" };
    readonly onFailure: {
      readonly kind: "drop_if_possible_else_disadvantage";
      readonly dropCapabilityWitness: {
        readonly kind: "table_witnessed_drop_capability";
        readonly subject: "damaged_creature";
        readonly object: "spell_object";
      };
      readonly dropResultWitness: {
        readonly kind: "table_witnessed_drop_result";
        readonly subject: "damaged_creature";
        readonly object: "spell_object";
      };
      readonly fallbackWhen: "object_not_dropped";
      readonly fallback: AttackRollAbilityCheckDisadvantageUntilCasterTurnStart;
    };
  };
};

type EffectAtom =
  | ObjectContactDamageEffect
  | {
      readonly kind: "damage";
      readonly damageType: DamageTypeRef;
      readonly amount: DiceAmount;
      readonly timing?: "end_of_next_turn";
    }
  | { readonly kind: "half_initial_damage_only" }
  | {
      readonly kind: "conditional_bonus_damage";
      readonly when:
        | {
            readonly kind: "target_creature_type";
            readonly types: ReadonlyNonEmptyArray<CreatureType>;
          }
        | {
            readonly kind: "attack_roll_had_advantage";
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
      readonly kind: "repeat_save_counter";
      readonly condition: Condition;
      readonly ability: Ability;
      readonly dc: DcSource;
      readonly cadence: "end_of_target_turn";
      readonly appliesCondition?: true;
      readonly successCount: number;
      readonly failureCount: number;
      readonly onSuccessCount: EffectAtom;
      readonly onFailureCount: EffectAtom;
    }
  | {
      readonly kind: "delayed_save";
      readonly condition?: Condition;
      readonly ability: Ability;
      readonly dc: DcSource;
      readonly cadence: "start_of_caster_next_turn";
      readonly onSuccess: EffectAtom;
      readonly onFailure: EffectAtom;
    }
  | {
      readonly kind: "condition_persists_after_full_duration";
      readonly condition: Condition;
      readonly untilEndedBy: string;
    }
  | {
      readonly kind: "heal_hp";
      readonly amount: DiceAmount;
      readonly target: "self" | "target_creature";
    }
  | {
      readonly kind: "grant_rest_benefit";
      readonly benefit: "short_rest";
      readonly target: "target_creature";
    }
  | {
      readonly kind: "spell_recipient_rest_lockout";
      readonly resetBy: "target_finishes_long_rest";
      readonly target: "target_creature";
    }
  | {
      readonly kind: "prevent_hit_point_regain";
      readonly expiresAt: "end_of_caster_next_turn";
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
  | {
      readonly kind: "modify_save_dc";
      readonly delta: DiceDelta;
      readonly spellSourceFilter?: { readonly className: ClassName };
    }
  | {
      readonly kind: "apply_condition";
      readonly condition:
        | Condition
        | ReadonlyNonEmptyArray<Condition>
        | {
            readonly kind: "choose";
            readonly from: ReadonlyNonEmptyArray<Condition>;
          };
      readonly duration?:
        | "current_turn"
        | "end_of_next_turn"
        | "spell_duration";
    }
  | {
      readonly kind: "apply_condition_while_in_area_or_until_escape";
      readonly condition: "restrained";
    }
  | {
      readonly kind: "suppress_condition_self_end";
      readonly condition: "prone";
    }
  | {
      readonly kind: "restrict_action_usage";
      readonly actions: ReadonlyNonEmptyArray<ActionEconomyKind>;
      readonly whileCondition?: Condition;
      readonly duration?: "current_turn" | "spell_duration";
    }
  | TargetEffectEscapeAction
  | {
      readonly kind: "command_target_next_turn";
      readonly execution: "target_next_turn";
      readonly options: CommandTargetNextTurnOptions;
    }
  | ForcedReactionMovement
  | JumpMovementReplacement
  | FeatherFallMitigation
  | AudibleEffect
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
      readonly kind: "share_damage_to_caster";
      readonly amount: "same_as_attached_damage_taken";
    }
  | {
      readonly kind: "retaliatory_damage";
      readonly target: "triggering_attacker";
      readonly damageType: DamageTypeRef;
      readonly amount: DiceAmount;
    }
  | {
      readonly kind: "take_standard_action";
      readonly action: StandardActionKind;
      readonly cost: "included_in_effect";
    }
  | ({
      readonly kind: "grant_alternate_action_cost";
    } & AlternateActionCost)
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
      readonly abilityFilter?: AbilityFilter;
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
      readonly kind: "initiative_swap";
      readonly timing: "immediately_after_initiative_roll";
      readonly ally: "willing_ally_same_combat";
      readonly prohibitedByCondition: "incapacitated";
    }
  | {
      readonly kind: "jack_of_all_trades_ability_check_bonus";
    }
  | {
      readonly kind: "modify_damage_numeric";
      readonly delta: DiceDelta;
      readonly damageSourceFilter?: DamageSourceFilter;
      readonly weaponFilter?: WeaponFilter;
      readonly abilityFilter?: ReadonlyNonEmptyArray<Ability>;
      readonly minimumDamageTotal?: 1;
    }
  | {
      readonly kind: "grant_magic_weapon_enhancement";
      readonly bonus: MagicWeaponEnhancementBonus;
    }
  | {
      readonly kind: "modify_size_category";
      readonly direction: "increase" | "decrease";
      readonly steps: 1;
    }
  | {
      readonly kind: "modify_crit_range";
      readonly threshold: number;
      readonly attackRollFilter: "weapon_or_unarmed_strike";
      readonly weaponFilter?: WeaponFilter;
    }
  | {
      readonly kind: "transfer_weapon_bonus_to_ac";
      readonly maxBonus: number;
      readonly from: "attack_and_damage_bonus";
      readonly trigger: "first_attack_roll_each_turn";
      readonly duration: "start_of_next_turn";
      readonly weaponFilter?: WeaponFilter;
    }
  | { readonly kind: "suppress_incoming_critical_hit" }
  | {
      readonly kind: "modify_roll_advantage";
      readonly mode: "advantage" | "disadvantage";
      readonly affects?: "self_roll" | "rolls_against_self";
      readonly on: ReadonlyNonEmptyArray<RollKind>;
      readonly abilityCheckTrigger?: {
        readonly kind: "condition_end";
        readonly condition: Condition;
      };
      readonly spellSourceFilter?: { readonly className: ClassName };
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
      readonly abilityFilter?: AbilityFilter;
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
  | ForceMoveEffect
  | { readonly kind: "suspend_target"; readonly until: "end_of_next_turn" }
  | { readonly kind: "fall_at_end_of_next_turn_unless_reapplied" }
  | {
      readonly kind: "force_fall";
      readonly direction: "upward" | "downward";
      readonly maxDistanceFeet?: number;
      readonly impactAsNormalFall?: true;
    }
  | {
      readonly kind: "levitate_target";
      readonly initialRiseMaxFeet: 20;
      readonly suspension: "spell_duration";
      readonly targetMovement: {
        readonly allowedBy: "push_or_pull_fixed_object_or_surface_within_reach";
        readonly movementMode: "as_if_climbing";
      };
      readonly casterAltitudeControl: {
        readonly maxDistanceFeet: 20;
        readonly direction: "up_or_down";
        readonly cost: "magic_action_on_caster_turn";
        readonly targetMustRemainWithinSpellRange: true;
      };
      readonly selfAltitudeControl: {
        readonly maxDistanceFeet: 20;
        readonly direction: "up_or_down";
        readonly cost: "part_of_move";
      };
      readonly ending: "float_gently_to_ground_if_aloft";
    }
  | { readonly kind: "grab_fixed_object" }
  | {
      readonly kind: "suspend_in_area";
      readonly location: "top";
      readonly until: "effect_ends";
    }
  | {
      readonly kind: "fall_when_effect_ends";
      readonly direction: "downward";
      readonly unlessCanStopFall?: true;
    }
  | {
      readonly kind: "move_area";
      readonly distanceFeet: number;
      readonly direction: "away_from_caster";
      readonly includeCreaturesInArea?: true;
    }
  | {
      readonly kind: "reduce_area_height";
      readonly amount: DiceAmount;
    }
  | { readonly kind: "end_current_effect_at_area_height_zero" }
  | {
      readonly kind: "ability_check_to_move_in_area";
      readonly ability: "str";
      readonly skill: "athletics";
      readonly dc: DcSource;
      readonly onFailure: "cannot_move";
    }
  | { readonly kind: "fall_to_ground" }
  | { readonly kind: "block_targeting"; readonly scope: string }
  | {
      readonly kind: "choose_new_target_or_lose";
      readonly subject: "triggering_attack_or_spell";
    }
  | { readonly kind: "block_travel"; readonly scope: string }
  | { readonly kind: "end_if_created_in_occupied_space" }
  | { readonly kind: "allow_designated_creatures_safe_passage" }
  | { readonly kind: "object_immune_to_all_damage" }
  | { readonly kind: "object_destroyed_by_spell"; readonly spellId: string }
  | { readonly kind: "cannot_be_dispelled_by_spell"; readonly spellId: string }
  | { readonly kind: "block_ethereal_travel" }
  | {
      readonly kind: "replace_destroyed_object_section_with_area";
      readonly areaLabel: string;
    }
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
  | { readonly kind: "waste_triggering_spell_or_effect" }
  | { readonly kind: "maximize_healing_received" }
  | {
      readonly kind: "transform_target";
      readonly newForm: ShapeShiftFormSource;
      readonly retainedFields: ReadonlyNonEmptyArray<ShapeShiftRetainedField>;
      readonly tempHpFromForm?: true;
      readonly actionRestriction?: ShapeShiftActionRestriction;
      readonly revertTriggers: ReadonlyNonEmptyArray<ShapeShiftRevertTrigger>;
    }
  | {
      readonly kind: "end_ongoing_spells";
      readonly maxSpellLevel:
        | number
        | "caster_slot_level"
        | "contested_spell_level";
    }
  | { readonly kind: "see_invisible_and_ethereal" }
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
  | { readonly kind: "make_stable" }
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
      readonly property: DetectionProperty;
      readonly radiusFeet: number;
    }
  | {
      readonly kind: "magical_identity_mask";
      readonly creatureBranch: {
        readonly chosenCreatureType: "other_than_actual_type";
        readonly treatedAsBy: "spells_and_magical_effects";
      };
      readonly objectBranch: {
        readonly auraAppearance: "nonmagical_magical_or_chosen_school";
        readonly observedBy: "spells_and_magical_effects_detecting_magical_auras";
      };
    }
  | {
      readonly kind: "locate_kind";
      readonly subjectKinds: ReadonlyNonEmptyArray<LocateKindSubject>;
      readonly maxDistanceFeet: number;
      readonly match: "closest";
      readonly query: "described_or_named_specific_kind";
      readonly result: "direction_and_distance";
    }
  | {
      readonly kind: "object_location_sense";
      readonly searchModes: ObjectLocationSenseSearchModes;
      readonly maxDistanceFeet: number;
      readonly result: "direction_to_location_and_movement";
      readonly blockedBy: "any_thickness_of_lead_direct_path";
    }
  | Schema.Schema.Type<typeof DivinationOmenEffectSchema>
  | CourierTaskEffect
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
      readonly damageType: AlterSelfNaturalWeaponGrowthDamageTypeChoice;
      readonly damageDie: 6;
      readonly replacesAbility: "str";
      readonly attackRollAbility: "spellcasting";
      readonly damageRollAbility: "spellcasting";
    }
  | { readonly kind: "water_breathing" }
  | {
      readonly kind: "teleport";
      readonly maxFeet: number;
      readonly destination: "unoccupied_visible_space";
    }
  | { readonly kind: "transport_exile"; readonly destination: ExileDestination }
  | SpellGrantedWeaponAttack
  | SpellWeaponAttackOverride
  | {
      readonly kind: "container_storage";
      readonly storage: ContainerStorageProfile;
    }
  | ExtradimensionalSpaceEffect
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
  | {
      readonly kind: "emit_dim_light";
      readonly radiusFeet: number;
      readonly expiresAt: "end_of_caster_next_turn";
    }
  | {
      readonly kind: "spell_created_held_object";
      readonly heldBy: "caster";
      readonly requirements: ReadonlyNonEmptyArray<
        Schema.Schema.Type<typeof SpellCreatedHeldObjectRequirementSchema>
      >;
      readonly disappearsWhen: ReadonlyNonEmptyArray<
        Schema.Schema.Type<
          typeof SpellCreatedHeldObjectDisappearanceTriggerSchema
        >
      >;
      readonly reEvoke: {
        readonly cost: { readonly kind: "bonus_action" };
        readonly requirements: ReadonlyNonEmptyArray<
          Schema.Schema.Type<typeof SpellCreatedHeldObjectRequirementSchema>
        >;
      };
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
      readonly kind: "grant_expertise";
      readonly choiceCount: ClassLevelChoiceCount;
      readonly skills:
        | {
            readonly kind: "owned_skill_proficiencies_without_expertise";
          }
        | {
            readonly kind: "listed_owned_skill_proficiencies_without_expertise";
            readonly skills: ReadonlyNonEmptyArray<Skill>;
          };
    }
  | {
      readonly kind: "grant_language";
      readonly languageId: string;
    }
  | {
      readonly kind: "grant_hidden_language_messages";
      readonly languageId: string;
      readonly message: {
        readonly kind: "hidden_language_message";
      };
      readonly spotting: {
        readonly languageKnowers: "automatic";
        readonly others: {
          readonly ability: "int";
          readonly skill: "investigation";
          readonly dc: 15;
        };
      };
      readonly deciphering: {
        readonly withoutLanguageRequires: "magic";
      };
    }
  | {
      readonly kind: "grant_language_choice";
      readonly source: "character_creation_language_tables";
      readonly count: number;
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
      readonly kind: "grant_spell_access_choice";
      readonly spellList: ClassSpellListName;
      readonly spellLevel: Schema.Schema.Type<typeof SpellLevelSchema>;
      readonly mode: Schema.Schema.Type<typeof SpellAccessModeSchema>;
      readonly count: number;
      readonly replacement?: {
        readonly trigger: "class_level_gain";
        readonly replacementCount: number;
      };
    }
  | {
      readonly kind: "grant_class_level_prepared_spell_access";
      readonly tiers: ReadonlyNonEmptyArray<ClassLevelPreparedSpellAccessTier>;
    }
  | {
      readonly kind: "grant_land_choice_prepared_spell_access";
      readonly choice: {
        readonly kind: "druid_circle_land";
        readonly trigger: "long_rest";
      };
      readonly spellsByLand: {
        readonly arid: ReadonlyNonEmptyArray<LandChoiceSpellAccessTier>;
        readonly polar: ReadonlyNonEmptyArray<LandChoiceSpellAccessTier>;
        readonly temperate: ReadonlyNonEmptyArray<LandChoiceSpellAccessTier>;
        readonly tropical: ReadonlyNonEmptyArray<LandChoiceSpellAccessTier>;
      };
    }
  | {
      readonly kind: "grant_spell_free_casts";
      readonly spellId: string;
      readonly count: number;
      readonly resetCadence: "long_rest" | "short_or_long_rest";
      readonly scaling?: {
        readonly axis: "class";
        readonly tiers: ReadonlyNonEmptyArray<{
          readonly atLevel: number;
          readonly count: number;
        }>;
      };
    }
  | {
      readonly kind: "grant_die_token";
      readonly die: DiceAmount;
      readonly trigger: "failed_d20_test";
      readonly duration: { readonly unit: "hour"; readonly amount: number };
      readonly maxHeld: number;
    }
  | {
      readonly kind: "grant_bonus_action_attack";
      readonly attack: "unarmed_strike";
    }
  | {
      readonly kind: "replace_damage_die";
      readonly die: DiceAmount;
      readonly scope: "unarmed_or_monk_weapon";
    }
  | {
      readonly kind: "substitute_ability_for_rolls";
      readonly use: Ability;
      readonly replaces: Ability;
      readonly on: ReadonlyNonEmptyArray<
        "attack_roll" | "damage_roll" | "unarmed_strike_save_dc"
      >;
      readonly scope: "unarmed_or_monk_weapon";
    }
  | {
      readonly kind: "offer_ability_substitution_for_ability_checks";
      readonly use: Ability;
      readonly skillFilter: {
        readonly kind: "fixed";
        readonly skills: ReadonlyNonEmptyArray<Skill>;
      };
      readonly requiredActiveFeature?: {
        readonly kind: "class_feature";
        readonly unitId: string;
      };
    }
  | {
      readonly kind: "offer_ability_substitution_for_jump_distance";
      readonly use: Ability;
      readonly replaces: Ability;
    }
  | {
      readonly kind: "composite";
      readonly effects: ReadonlyNonEmptyArray<EffectAtom>;
    }
  | {
      readonly kind: "choose_effect_mode";
      readonly label: string;
      readonly options: ReadonlyNonEmptyArray<{
        readonly id: string;
        readonly displayName: string;
        readonly effects: ReadonlyNonEmptyArray<OngoingEffect>;
      }>;
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
  | { readonly kind: "move_object"; readonly maxDistanceFeet: number }
  | { readonly kind: "pull_object_away"; readonly maxDistanceFeet: number }
  | { readonly kind: "manipulate_object" }
  | { readonly kind: "break_concentration" }
  | {
      readonly kind: "damage_structure";
      readonly amount: DiceAmount;
      readonly damageType: DamageTypeRef;
      readonly structureContact: "ground_in_area";
    }
  | {
      readonly kind: "collapse_structure";
      readonly trigger: "structure_drops_to_0_hp";
    }
  | {
      readonly kind: "bury_in_rubble";
      readonly escape: {
        readonly kind: "ability_check";
        readonly ability: "str";
        readonly skill: "athletics";
        readonly dc: number;
        readonly action: "action";
      };
    }
  | { readonly kind: "bond_objects" }
  | { readonly kind: "lock_object"; readonly password?: string }
  | { readonly kind: "release_object_access"; readonly mundaneLockLimit: 1 }
  | {
      readonly kind: "suppress_arcane_lock";
      readonly duration: { readonly unit: "minute"; readonly amount: 10 };
      readonly allowsOpenClose: true;
    }
  | { readonly kind: "reposition_attachment"; readonly maxMoveFeet?: number }
  | { readonly kind: "area_is_difficult_terrain" }
  | { readonly kind: "area_emits_dim_light" }
  | { readonly kind: "area_is_lightly_obscured" }
  | { readonly kind: "area_is_heavily_obscured" }
  | { readonly kind: "area_is_magical_darkness" }
  | {
      readonly kind: "area_of_silence";
      readonly soundBoundary: "blocks_creation_and_passage";
      readonly appliesWhen: "entirely_inside_area";
      readonly grantsDamageImmunity: "thunder";
      readonly imposesCondition: "deafened";
      readonly preventsSpellComponent: "verbal";
    }
  | {
      readonly kind: "truthfulness_constraint";
      readonly prohibitedCommunication: "deliberate_lie";
      readonly appliesWhile: "in_spell_area";
      readonly targetAwareness: "aware_of_spell";
      readonly allowedResponse: "evasive_or_silent_truthful";
    }
  | { readonly kind: "reveal_save_outcome_to_caster" }
  | {
      readonly kind: "end_overlapping_spell_created_bright_or_dim_light";
      readonly maxSpellLevel: number;
    }
  | {
      readonly kind: "area_anchor_or_layering_requirement";
      readonly anchor: {
        readonly kind: "between_solid_masses";
        readonly count: 2;
      };
      readonly layering: {
        readonly kind: "across_surface";
        readonly surfaces: readonly ["floor", "wall", "ceiling"];
        readonly flatSurfaceDepthFeet: 5;
      };
      readonly unmetOutcome: {
        readonly kind: "collapse_and_end_effect";
        readonly timing: "start_of_caster_next_turn";
      };
    }
  | {
      readonly kind: "area_section_burns_away";
      readonly section: { readonly kind: "cube"; readonly sideFeet: 5 };
      readonly exposure: "fire";
      readonly burnsAwayAfter: { readonly unit: "round"; readonly amount: 1 };
      readonly creatureStartsTurnInFireDamage: {
        readonly damageType: "fire";
        readonly amount: DiceAmount;
      };
    }
  | { readonly kind: "area_has_strong_wind" }
  | { readonly kind: "prevent_ranged_weapon_attacks" }
  | {
      readonly kind: "area_movement_cost_multiplier";
      readonly multiplier: number;
      readonly appliesTo: "any_movement" | "toward_source";
    }
  | { readonly kind: "grant_cover"; readonly cover: "three_quarters" }
  | { readonly kind: "block_line_of_sight" }
  | {
      readonly kind: "prevent_creature_passage";
      readonly exceptCreatureTypes: ReadonlyNonEmptyArray<CreatureType>;
      readonly allowsThroughBarrier: ReadonlyNonEmptyArray<
        "spells" | "ranged_attacks" | "reach_weapon_attacks"
      >;
    }
  | { readonly kind: "prevent_spellcasting_and_magic_actions" }
  | { readonly kind: "prevent_magical_ranged_attacks" }
  | { readonly kind: "block_magical_targeting_and_aoe" }
  | { readonly kind: "block_teleport_and_planar_travel" }
  | { readonly kind: "suppress_magic_items" }
  | {
      readonly kind: "suppress_ongoing_magic_effects";
      readonly exceptSources: ReadonlyNonEmptyArray<"artifact" | "deity">;
      readonly suppressedTimeCountsAgainstDuration: true;
    }
  | {
      readonly kind: "ordered_barrier_layers";
      readonly layers: ReadonlyNonEmptyArray<{
        readonly order: number;
        readonly label: string;
        readonly save?: {
          readonly ability: Ability;
          readonly dc: DcSource;
          readonly onFail: EffectAtom;
          readonly onSuccess: SaveSuccessOutcome;
        };
        readonly passiveEffects?: ReadonlyNonEmptyArray<EffectAtom>;
        readonly destroyedBy: string;
      }>;
    }
  | { readonly kind: "allow_reaction_stand_up" }
  | {
      readonly kind: "revert_shape_shift_to_true_form";
      readonly onlyIfTargetIsShapeShifted: true;
    }
  | {
      readonly kind: "suppress_shape_shifting_while_in_area";
      readonly onlyIfTargetIsShapeShifted: true;
    }
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

type SaveGateTargetAutoSuccessPredicate = Schema.Schema.Type<
  typeof SaveGateTargetAutoSuccessPredicateSchema
>;
type CourierTaskEffect = Schema.Schema.Type<typeof CourierTaskEffectSchema>;

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
      readonly repeatSaves?: ReadonlyNonEmptyArray<RepeatSaveSpec>;
      readonly autoSuccessIfCasterSlotGte?: "triggering_spell_level";
      readonly autoSuccessIfTarget?: never;
      readonly saveAppliesIf?: "unwilling_target" | "unwilling_creature_target";
      readonly usageLimit?: UsageLimit;
    }
  | {
      readonly kind: "save_gate";
      readonly attachment: CreatureTargetAttachment;
      readonly ability: Ability;
      readonly dc: DcSource;
      readonly onFail: EffectAtom;
      readonly onSuccess: SaveSuccessOutcome;
      readonly repeatSaves?: ReadonlyNonEmptyArray<RepeatSaveSpec>;
      readonly autoSuccessIfCasterSlotGte?: "triggering_spell_level";
      readonly autoSuccessIfTarget: SaveGateTargetAutoSuccessPredicate;
      readonly saveAppliesIf?: "unwilling_target" | "unwilling_creature_target";
      readonly usageLimit?: UsageLimit;
    }
  | {
      readonly kind: "ability_check_gate";
      readonly attachment: Attachment;
      readonly ability: SpellcastingAbilityCheckAbility;
      readonly skill?: Skill;
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
      readonly attachment: AreaAttachment;
      readonly effects: ReadonlyNonEmptyArray<AreaDirectEffectAtom>;
      readonly mode?: CastTimeEffectModeChoice;
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
      readonly attachment?: AreaAttachment;
      readonly ability: Ability;
      readonly dc: DcSource;
      readonly onFail: EffectAtom;
      readonly onSuccess: SaveSuccessOutcome;
    }
  | {
      readonly kind: "ability_check_gate";
      readonly ability: SpellcastingAbilityCheckAbility;
      readonly skill?: Skill;
      readonly dc: DcSource;
      readonly onPass: EffectAtom;
      readonly onFail?: EffectAtom;
    }
  | {
      readonly kind: "attack_roll";
      readonly attachment?: CreatureTargetAttachment;
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
      kind: Schema.Literal("self_or_visible_creature_falls"),
      rangeFeet: Schema.Literal(60),
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
    amount: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1)),
    ritual: Schema.Boolean,
  }),
);

export const RangeSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("self") }),
  Schema.Struct({ kind: Schema.Literal("touch") }),
  Schema.Struct({
    kind: Schema.Literal("point"),
    feet: Schema.Union(Schema.Number, ThresholdTiersNumberSchema),
  }),
);

export const MaterialComponentSchema = strictStruct({
  kind: Schema.Literal("paired_worn_items"),
  itemKind: Schema.Literal("ring"),
  material: Schema.Literal("platinum"),
  minimumValueGpEach: PositiveIntegerSchema,
  wornBy: Schema.Tuple(Schema.Literal("caster"), Schema.Literal("target")),
  requiredFor: Schema.Literal("spell_duration"),
});

const GenericComponentsSchema = Schema.Struct({
  v: Schema.Boolean,
  s: Schema.Boolean,
  m: Schema.Union(Schema.Literal(false), Schema.String),
  materialCostGp: optionalExact(Schema.Number),
  materialConsumed: optionalExact(Schema.Literal(true)),
});

const StructuredMaterialComponentsSchema = strictStruct({
  v: Schema.Boolean,
  s: Schema.Boolean,
  m: MaterialComponentSchema,
});

export const ComponentsSchema = Schema.Union(
  GenericComponentsSchema,
  StructuredMaterialComponentsSchema,
);

export const DurationEndTriggerSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("target_makes_attack_roll") }),
  Schema.Struct({ kind: Schema.Literal("target_deals_damage") }),
  Schema.Struct({ kind: Schema.Literal("target_casts_spell") }),
  Schema.Struct({ kind: Schema.Literal("target_dons_armor") }),
  Schema.Struct({ kind: Schema.Literal("target_damaged_by_caster_or_ally") }),
  Schema.Struct({ kind: Schema.Literal("target_takes_damage") }),
  Schema.Struct({ kind: Schema.Literal("caster_recasts_spell") }),
  Schema.Struct({ kind: Schema.Literal("caster_drops_to_0_hp") }),
  Schema.Struct({ kind: Schema.Literal("attached_bond_exceeds_range") }),
  Schema.Struct({
    kind: Schema.Literal("spell_cast_again_on_connected_creature"),
  }),
  Schema.Struct({ kind: Schema.Literal("area_dispersed_by_strong_wind") }),
  Schema.Struct({ kind: Schema.Literal("caster_lets_go_of_attached_weapon") }),
);

export const TimedPermanentAfterSchema = Schema.Struct({
  kind: Schema.Literal("repeated_casts"),
  cadence: Schema.Literal("daily"),
  count: PositiveIntegerSchema,
  target: Schema.Literal("same_target"),
  endsOn: nonEmpty(Schema.Literal("dispel")),
});

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
    permanentAfter: optionalExact(TimedPermanentAfterSchema),
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
export const AreaOccupantPerceptionFilterSchema = Schema.Literal(
  "can_see_area_effect",
);

export const TargetCountSlotScalingSchema = Schema.Struct({
  kind: Schema.Literal("linear"),
  base: PositiveIntegerSchema,
  perSlotAboveBase: PositiveIntegerSchema,
  baseLevel: SpellSlotLevelSchema,
});

const TARGET_KINDS = [
  "creature",
  "object",
  "magical_effect",
] as const satisfies ReadonlyNonEmptyArray<string>;
export const TargetKindSchema = Schema.Literal(...TARGET_KINDS);
export const TargetDispositionSchema = Schema.Literal("willing");
export const TargetStateFilterSchema = nonEmpty(
  Schema.Literal("falling", "zero_hp_not_dead"),
);
const CreatureTargetKindsSchema = nonEmpty(Schema.Literal("creature"));
const CreatureOrObjectTargetKindsSchema = Schema.Union(
  Schema.Tuple(Schema.Literal("creature"), Schema.Literal("object")),
  Schema.Tuple(Schema.Literal("object"), Schema.Literal("creature")),
);

export const TargetRelativePositionSchema = strictStruct({
  kind: Schema.Literal("within_feet_of_attachment"),
  attachmentHoleId: HoleIdSchema,
  feet: PositiveIntegerSchema,
});

export const CreatureTargetSelectionSchema = strictStruct({
  mode: Schema.Literal("one"),
  targetKinds: CreatureTargetKindsSchema,
  typeFilter: optionalExact(TargetTypeFilterSchema),
  creatureSizeFilter: optionalExact(
    Schema.suspend(() => CreatureSizeFilterSchema),
  ),
  relativePosition: optionalExact(TargetRelativePositionSchema),
});

export const TargetCastingRequirementSchema = strictStruct({
  kind: Schema.Literal("remain_within_spell_range_for_entire_casting"),
});

export const TargetSelectionSchema = Schema.Union(
  strictStruct({
    mode: Schema.Literal("one"),
    targetKinds: CreatureOrObjectTargetKindsSchema,
    objectFilter: Schema.suspend(() => ObjectFilterSchema),
    creatureDisposition: optionalExact(TargetDispositionSchema),
  }),
  CreatureTargetSelectionSchema,
  strictStruct({
    mode: Schema.Literal("one"),
    targetKinds: optionalExact(nonEmpty(TargetKindSchema)),
    typeFilter: optionalExact(TargetTypeFilterSchema),
  }),
  strictStruct({
    mode: Schema.Literal("one"),
    targetKinds: CreatureTargetKindsSchema,
    typeFilter: optionalExact(TargetTypeFilterSchema),
    stateFilter: TargetStateFilterSchema,
  }),
  strictStruct({
    mode: Schema.Literal("one"),
    targetKinds: CreatureTargetKindsSchema,
    disposition: TargetDispositionSchema,
    typeFilter: optionalExact(TargetTypeFilterSchema),
    stateFilter: optionalExact(TargetStateFilterSchema),
  }),
  strictStruct({
    mode: Schema.Literal("choose_up_to"),
    count: Schema.Union(
      PositiveIntegerSchema,
      TargetCountSlotScalingSchema,
      TargetCountThresholdTiersSchema,
    ),
    repeatsAllowed: optionalExact(Schema.Literal(true)),
    targetKinds: optionalExact(nonEmpty(TargetKindSchema)),
    typeFilter: optionalExact(TargetTypeFilterSchema),
    castingRequirement: optionalExact(TargetCastingRequirementSchema),
  }),
  strictStruct({
    mode: Schema.Literal("choose_up_to"),
    count: Schema.Union(
      PositiveIntegerSchema,
      TargetCountSlotScalingSchema,
      TargetCountThresholdTiersSchema,
    ),
    repeatsAllowed: optionalExact(Schema.Literal(true)),
    targetKinds: CreatureTargetKindsSchema,
    typeFilter: optionalExact(TargetTypeFilterSchema),
    stateFilter: TargetStateFilterSchema,
  }),
  strictStruct({
    mode: Schema.Literal("choose_up_to"),
    count: Schema.Union(
      PositiveIntegerSchema,
      TargetCountSlotScalingSchema,
      TargetCountThresholdTiersSchema,
    ),
    repeatsAllowed: optionalExact(Schema.Literal(true)),
    targetKinds: CreatureTargetKindsSchema,
    disposition: TargetDispositionSchema,
    typeFilter: optionalExact(TargetTypeFilterSchema),
    stateFilter: optionalExact(TargetStateFilterSchema),
  }),
  strictStruct({
    mode: Schema.Literal("any_number"),
    targetKinds: optionalExact(nonEmpty(TargetKindSchema)),
    typeFilter: optionalExact(TargetTypeFilterSchema),
  }),
  strictStruct({
    mode: Schema.Literal("any_number"),
    targetKinds: CreatureTargetKindsSchema,
    typeFilter: optionalExact(TargetTypeFilterSchema),
    stateFilter: TargetStateFilterSchema,
  }),
  strictStruct({
    mode: Schema.Literal("any_number"),
    targetKinds: CreatureTargetKindsSchema,
    disposition: TargetDispositionSchema,
    typeFilter: optionalExact(TargetTypeFilterSchema),
    stateFilter: optionalExact(TargetStateFilterSchema),
  }),
);

export const AreaOriginSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("point_within_range") }),
  Schema.Struct({ kind: Schema.Literal("on_primary_target") }),
  Schema.Struct({ kind: Schema.Literal("on_attached_creature") }),
  Schema.Struct({ kind: Schema.Literal("self") }),
);

export const AreaShapeDescriptorSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("sphere"),
    radiusFeet: Schema.Union(Schema.Number, LinearPerLevelNumberSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("circle"),
    radiusFeet: Schema.Union(Schema.Number, LinearPerLevelNumberSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("sphere_cluster"),
    count: Schema.Number,
    radiusFeet: Schema.Union(Schema.Number, LinearPerLevelNumberSchema),
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
    radiusFeet: Schema.Union(Schema.Number, LinearPerLevelNumberSchema),
    heightFeet: Schema.Number,
  }),
  Schema.Struct({
    kind: Schema.Literal("emanation"),
    radiusFeet: Schema.Union(Schema.Number, LinearPerLevelNumberSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("line"),
    lengthFeet: Schema.Number,
    widthFeet: Schema.Number,
  }),
  Schema.Struct({
    kind: Schema.Literal("wall_volume"),
    maxLengthFeet: Schema.Number,
    maxHeightFeet: Schema.Number,
    thicknessFeet: Schema.Number,
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

export const MarkTransferAvailabilitySchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("after_trigger"),
  }),
  Schema.Struct({
    kind: Schema.Literal("later_turn_after_trigger"),
  }),
);

export const MarkTransferSchema = Schema.Struct({
  onEvent: MarkTransferEventSchema,
  availability: MarkTransferAvailabilitySchema,
  cost: MarkTransferCostSchema,
});

export const AttachmentRangeOriginSchema = Schema.Literal(
  "caster",
  "spell_sensor",
);

export const BondRangeSchema = strictStruct({
  kind: Schema.Literal("within_feet"),
  feet: PositiveIntegerSchema,
});

export const TargetAttachmentBaseSchema = Schema.Struct({
  kind: Schema.Literal("target"),
  selection: TargetSelectionSchema,
  rangeOrigin: optionalExact(AttachmentRangeOriginSchema),
});

export const CreatureTargetAttachmentBaseSchema = Schema.Struct({
  kind: Schema.Literal("target"),
  selection: CreatureTargetSelectionSchema,
  rangeOrigin: optionalExact(AttachmentRangeOriginSchema),
});

export const CreatureTargetAttachmentSchema = Schema.Union(
  CreatureTargetAttachmentBaseSchema,
  makeHoleSchema(CreatureTargetAttachmentBaseSchema),
);

export const TargetAttachmentSchema = Schema.Union(
  TargetAttachmentBaseSchema,
  makeHoleSchema(TargetAttachmentBaseSchema),
);

export const SizeSchema = Schema.Literal(
  "tiny",
  "small",
  "medium",
  "large",
  "huge",
  "gargantuan",
);

export const CreatureSizeFilterSchema = strictStruct({
  kind: Schema.Literal("exact"),
  creatureSize: SizeSchema,
});

export const ObjectMaterialSchema = Schema.Literal("metal", "flammable");
const ObjectKindFilterSchema = Schema.Literal("weapon");
const ObjectMagicalityFilterSchema = MagicalitySchema;

export const ObjectTargetRelationSchema = Schema.Literal(
  "loose",
  "not_worn_or_carried",
);

export const ObjectAccessPreventionMeansSchema =
  Schema.Literal("mundane_or_magical");

export const ObjectVisibilityRequirementSchema =
  Schema.Literal("caster_can_see");

export const ObjectFilterSchema = Schema.Struct({
  objectKind: optionalExact(ObjectKindFilterSchema),
  magicality: optionalExact(ObjectMagicalityFilterSchema),
  material: optionalExact(ObjectMaterialSchema),
  visibility: optionalExact(ObjectVisibilityRequirementSchema),
  targetRelation: optionalExact(ObjectTargetRelationSchema),
  maxWeightPounds: optionalExact(PositiveIntegerSchema),
  manufactured: optionalExact(Schema.Boolean),
  maxSize: optionalExact(SizeSchema),
  accessPreventionMeans: optionalExact(ObjectAccessPreventionMeansSchema),
});

export const AreaAttachmentBaseSchema = Schema.Struct({
  kind: Schema.Literal("area"),
  shape: AreaShapeSpecSchema,
  origin: AreaOriginSchema,
  selection: optionalExact(TargetSelectionSchema),
  occupantDispositionFilter: optionalExact(AreaOccupantDispositionFilterSchema),
  occupantPerceptionFilter: optionalExact(AreaOccupantPerceptionFilterSchema),
  rangeOrigin: optionalExact(AttachmentRangeOriginSchema),
});

export const AreaAttachmentSchema = Schema.Union(
  AreaAttachmentBaseSchema,
  makeHoleSchema(AreaAttachmentBaseSchema),
);

export const AttachmentBaseSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("self"),
  }),
  TargetAttachmentBaseSchema,
  strictStruct({
    kind: Schema.Literal("caster_target_bond"),
    target: makeHoleSchema(TargetAttachmentBaseSchema),
    range: BondRangeSchema,
  }),
  AreaAttachmentBaseSchema,
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
  strictStruct({
    kind: Schema.Literal("held_weapon"),
    heldBy: Schema.Literal("caster"),
    count: Schema.Literal(1),
    weaponIds: nonEmpty(Schema.String),
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

export const ExtradimensionalSpaceEffectSchema = strictStruct({
  kind: Schema.Literal("create_extradimensional_space"),
  anchor: strictStruct({
    kind: Schema.Literal("touched_rope"),
    topEndMotion: Schema.Literal("hovers_until_perpendicular_or_ceiling"),
  }),
  entry: strictStruct({
    visibility: Schema.Literal("invisible"),
    widthFeet: PositiveIntegerSchema,
    heightFeet: PositiveIntegerSchema,
    location: Schema.Literal("anchor_upper_end"),
  }),
  access: strictStruct({
    kind: Schema.Literal("climb_anchor"),
    anchorMovement: Schema.Literal("can_be_pulled_into_or_dropped_out"),
  }),
  capacity: strictStruct({
    creatureCount: PositiveIntegerSchema,
    maxCreatureSize: SizeSchema,
  }),
  boundary: strictStruct({
    attacksSpellsAndEffects: Schema.Literal("blocked_bidirectionally"),
    occupantPerception: Schema.Literal("can_see_out_through_portal"),
  }),
  onEnd: strictStruct({
    kind: Schema.Literal("drop_contents_out"),
  }),
});

export const SaveGateTargetAutoSuccessPredicateSchema = strictStruct({
  kind: Schema.Literal("challenge_rating_not_equal"),
  challengeRating: Schema.Literal(0),
});

export const CourierTaskEffectSchema = strictStruct({
  kind: Schema.Literal("assign_courier_task"),
  messenger: Schema.Literal("target_beast"),
  destination: Schema.Literal("caster_specified_visited_location"),
  recipient: Schema.Literal("caster_specified_general_description"),
  message: strictStruct({
    maxWords: Schema.Literal(25),
    delivery: Schema.Literal("mimic_caster_communication"),
  }),
  travel: strictStruct({
    direction: Schema.Literal("toward_destination_for_duration"),
    groundMilesPer24Hours: Schema.Literal(25),
    flyingMilesPer24Hours: Schema.Literal(50),
  }),
  onArrival: Schema.Literal("deliver_to_described_creature"),
  onExpiryBeforeArrival: Schema.Literal(
    "message_lost_and_beast_returns_to_casting_location",
  ),
});

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

export const OngoingActionCostSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("action") }),
  Schema.Struct({ kind: Schema.Literal("bonus_action") }),
  Schema.Struct({
    kind: Schema.Literal("standard_action"),
    action: StandardActionKindSchema,
  }),
);

export const OngoingTurnWindowSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("effect_turn"),
    turn: Schema.Number,
  }),
  Schema.Struct({
    kind: Schema.Literal("effect_turn_range"),
    from: Schema.Number,
    to: Schema.Number,
  }),
);

export const OngoingTriggerSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("passive") }),
  Schema.Struct({ kind: Schema.Literal("on_effect_starts") }),
  Schema.Struct({ kind: Schema.Literal("on_caster_attack_hit") }),
  Schema.Struct({
    kind: Schema.Literal("on_attached_hit_by_attack_roll"),
    attackKind: optionalExact(Schema.Literal("melee")),
    attackerWithinFeet: optionalExact(Schema.Number),
    attackerTypeFilter: optionalExact(nonEmpty(CreatureTypeSchema)),
  }),
  Schema.Struct({ kind: Schema.Literal("on_attached_turn_start") }),
  Schema.Struct({ kind: Schema.Literal("on_attached_turn_end") }),
  Schema.Struct({
    kind: Schema.Literal("on_caster_turn_start"),
    turnWindow: optionalExact(OngoingTurnWindowSchema),
  }),
  Schema.Struct({ kind: Schema.Literal("on_caster_turn_end") }),
  Schema.Struct({ kind: Schema.Literal("on_attached_damaged") }),
  Schema.Struct({
    kind: Schema.Literal("on_attached_targeted"),
    targeting: nonEmpty(Schema.Literal("attack_roll", "damaging_spell")),
    excludes: Schema.Literal("area_of_effect"),
  }),
  Schema.Struct({
    kind: Schema.Literal("on_creature_moves"),
    perFeet: optionalExact(Schema.Number),
  }),
  Schema.Struct({ kind: Schema.Literal("on_creature_enters_area") }),
  Schema.Struct({ kind: Schema.Literal("on_creature_starts_turn_in_area") }),
  Schema.Struct({ kind: Schema.Literal("on_creature_ends_turn_in_area") }),
  Schema.Struct({
    kind: Schema.Literal("on_creature_ends_turn_within_distance_of_area"),
    distanceFeet: Schema.Number,
  }),
  Schema.Struct({ kind: Schema.Literal("on_creature_moves_through_area") }),
  Schema.Struct({
    kind: Schema.Literal("on_creature_moves_within_area"),
    distanceFeet: Schema.Number,
  }),
  Schema.Struct({
    kind: Schema.Literal("on_creature_starts_turn_within_area"),
    distanceFeet: Schema.Number,
  }),
  Schema.Struct({
    kind: Schema.Literal("on_creature_attempts_magical_escape"),
    methods: nonEmpty(Schema.Literal("teleportation", "interplanar_travel")),
  }),
  Schema.Struct({ kind: Schema.Literal("on_object_section_destroyed") }),
  Schema.Struct({
    kind: Schema.Literal("on_area_moves_into_creature_space"),
    maxCreatureSize: optionalExact(SizeSchema),
  }),
  Schema.Struct({ kind: Schema.Literal("on_creature_exits_area") }),
  Schema.Struct({
    kind: Schema.Literal("on_structure_collapses"),
    affectedWithin: Schema.Literal("half_structure_height"),
  }),
  Schema.Struct({
    kind: Schema.Literal("on_caster_spends_action"),
    cost: OngoingActionCostSchema,
    laterTurnsOnly: optionalExact(Schema.Literal(true)),
  }),
  Schema.Struct({
    kind: Schema.Literal("on_attached_spends_action"),
    cost: OngoingActionCostSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("on_affected_creature_spends_action"),
    cost: OngoingActionCostSchema,
  }),
  Schema.Struct({ kind: Schema.Literal("on_creature_studies") }),
);

export const OngoingPredicateSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("attached_bond_within_range"),
  }),
  Schema.Struct({
    kind: Schema.Literal("at_hp_threshold"),
    threshold: Schema.Number,
    comparison: Schema.Literal("lte", "eq", "gte"),
  }),
  Schema.Struct({
    kind: Schema.Literal("has_condition"),
    condition: ConditionSchema,
  }),
  Schema.Struct({
    kind: Schema.Literal("spell_created_held_object_active"),
  }),
  Schema.Struct({
    kind: Schema.Literal("table_witnessed_attachment_within_spell_range"),
  }),
);

const BaseAcReplacementFormulaSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("base_plus_dex"),
    base: Schema.Number,
  }),
  Schema.Struct({
    kind: Schema.Literal("base_plus_dex_con"),
    base: Schema.Number,
  }),
  Schema.Struct({
    kind: Schema.Literal("base_plus_dex_wis"),
    base: Schema.Number,
  }),
  Schema.Struct({
    kind: Schema.Literal("base_plus_dex_cha"),
    base: Schema.Number,
  }),
);

export const ModifyAcSetBaseEffectSchema = Schema.Struct({
  kind: Schema.Literal("modify_ac_set_base"),
  formula: BaseAcReplacementFormulaSchema,
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

export const ShapeShiftCatalogRefFormSourceSchema = Schema.Struct({
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

export const ShapeShiftKnownFormsRosterSourceSchema = Schema.Struct({
  kind: Schema.Literal("known_forms_roster"),
  creatureType: CreatureTypeSchema,
  knownForms: ClassLevelChoiceCountSchema,
  recommendedFormStatBlockIds: nonEmpty(Schema.NonEmptyTrimmedString),
  knownFormChange: Schema.Struct({
    kind: Schema.Literal("long_rest"),
    replacementCount: Schema.Literal(1),
  }),
  maxChallengeRating: ThresholdTiersNumberSchema,
  flySpeed: Schema.Union(
    Schema.Struct({ kind: Schema.Literal("forbidden") }),
    Schema.Struct({
      kind: Schema.Literal("allowed_at_class_level"),
      atLevel: PositiveIntegerSchema,
    }),
  ),
});

export const ShapeShiftFormSourceSchema = Schema.Union(
  ShapeShiftCatalogRefFormSourceSchema,
  ShapeShiftKnownFormsRosterSourceSchema,
);

export const ShapeShiftRetainedFieldSchema = Schema.Literal(
  "alignment",
  "personality",
  "memories",
  "speech",
  "creature_type",
  "hit_points",
  "hit_point_dice",
  "intelligence",
  "wisdom",
  "charisma",
  "class_features",
  "skill_proficiencies",
  "saving_throw_proficiencies",
  "languages",
  "feats",
);

export const ShapeShiftActionRestrictionSchema = Schema.Literal(
  "no_speech_no_spells",
  "no_spellcasting",
);

export const ShapeShiftRevertTriggerSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("zero_hp") }),
  Schema.Struct({ kind: Schema.Literal("spell_ends") }),
  Schema.Struct({ kind: Schema.Literal("temp_hp_depleted") }),
  Schema.Struct({ kind: Schema.Literal("dismissed_by_caster") }),
  Schema.Struct({ kind: Schema.Literal("duration_expires") }),
  Schema.Struct({ kind: Schema.Literal("source_used_again") }),
  Schema.Struct({
    kind: Schema.Literal("condition_active"),
    condition: ConditionSchema,
  }),
  Schema.Struct({ kind: Schema.Literal("death") }),
  Schema.Struct({
    kind: Schema.Literal("dismissed_by_target"),
    action: Schema.Literal("bonus_action"),
  }),
);

export const ObjectContactDamageEffectSchema = strictStruct({
  kind: Schema.Literal("object_contact_damage"),
  contact: strictStruct({
    kind: Schema.Literal("table_witnessed_physical_contact_with_spell_object"),
  }),
  damageType: DamageTypeRefSchema,
  amount: DiceAmountSchema,
  holdingOrWearingSave: strictStruct({
    appliesIf: strictStruct({
      kind: Schema.Literal("table_witnessed_holding_or_wearing_spell_object"),
    }),
    ability: Schema.Literal("con"),
    dc: DcSourceSchema,
    onSuccess: strictStruct({ kind: Schema.Literal("none") }),
    onFailure: strictStruct({
      kind: Schema.Literal("drop_if_possible_else_disadvantage"),
      dropCapabilityWitness: strictStruct({
        kind: Schema.Literal("table_witnessed_drop_capability"),
        subject: Schema.Literal("damaged_creature"),
        object: Schema.Literal("spell_object"),
      }),
      dropResultWitness: strictStruct({
        kind: Schema.Literal("table_witnessed_drop_result"),
        subject: Schema.Literal("damaged_creature"),
        object: Schema.Literal("spell_object"),
      }),
      fallbackWhen: Schema.Literal("object_not_dropped"),
      fallback: strictStruct({
        kind: Schema.Literal("modify_roll_advantage"),
        mode: Schema.Literal("disadvantage"),
        on: Schema.Tuple(
          Schema.Literal("attack_roll"),
          Schema.Literal("ability_check"),
        ),
        expiresOn: strictStruct({ kind: Schema.Literal("caster_turn_start") }),
      }),
    }),
  }),
});

export const EffectAtomSchema: Schema.suspend<EffectAtom, EffectAtom, never> =
  Schema.suspend(() =>
    Schema.Union(
      ObjectContactDamageEffectSchema,
      Schema.Struct({
        kind: Schema.Literal("damage"),
        damageType: DamageTypeRefSchema,
        amount: DiceAmountSchema,
        timing: optionalExact(Schema.Literal("end_of_next_turn")),
      }),
      Schema.Struct({
        kind: Schema.Literal("half_initial_damage_only"),
      }),
      Schema.Struct({
        kind: Schema.Literal("conditional_bonus_damage"),
        when: Schema.Union(
          Schema.Struct({
            kind: Schema.Literal("target_creature_type"),
            types: nonEmpty(CreatureTypeSchema),
          }),
          Schema.Struct({
            kind: Schema.Literal("attack_roll_had_advantage"),
          }),
        ),
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
        kind: Schema.Literal("repeat_save_counter"),
        condition: ConditionSchema,
        ability: AbilitySchema,
        dc: DcSourceSchema,
        cadence: Schema.Literal("end_of_target_turn"),
        appliesCondition: optionalExact(Schema.Literal(true)),
        successCount: Schema.Number,
        failureCount: Schema.Number,
        onSuccessCount: EffectAtomSchema,
        onFailureCount: EffectAtomSchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("delayed_save"),
        condition: optionalExact(ConditionSchema),
        ability: AbilitySchema,
        dc: DcSourceSchema,
        cadence: Schema.Literal("start_of_caster_next_turn"),
        onSuccess: EffectAtomSchema,
        onFailure: EffectAtomSchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("condition_persists_after_full_duration"),
        condition: ConditionSchema,
        untilEndedBy: Schema.String,
      }),
      Schema.Struct({
        kind: Schema.Literal("heal_hp"),
        amount: DiceAmountSchema,
        target: Schema.Literal("self", "target_creature"),
      }),
      strictStruct({
        kind: Schema.Literal("grant_rest_benefit"),
        benefit: Schema.Literal("short_rest"),
        target: Schema.Literal("target_creature"),
      }),
      strictStruct({
        kind: Schema.Literal("spell_recipient_rest_lockout"),
        resetBy: Schema.Literal("target_finishes_long_rest"),
        target: Schema.Literal("target_creature"),
      }),
      Schema.Struct({
        kind: Schema.Literal("prevent_hit_point_regain"),
        expiresAt: Schema.Literal("end_of_caster_next_turn"),
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
        spellSourceFilter: optionalExact(
          Schema.Struct({ className: ClassNameSchema }),
        ),
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
        duration: optionalExact(
          Schema.Literal("current_turn", "end_of_next_turn", "spell_duration"),
        ),
      }),
      strictStruct({
        kind: Schema.Literal("apply_condition_while_in_area_or_until_escape"),
        condition: Schema.Literal("restrained"),
      }),
      Schema.Struct({
        kind: Schema.Literal("suppress_condition_self_end"),
        condition: Schema.Literal("prone"),
      }),
      Schema.Struct({
        kind: Schema.Literal("restrict_action_usage"),
        actions: nonEmpty(Schema.Literal("action", "bonus_action", "reaction")),
        whileCondition: optionalExact(ConditionSchema),
        duration: optionalExact(
          Schema.Literal("current_turn", "spell_duration"),
        ),
      }),
      strictStruct({
        kind: Schema.Literal("target_effect_escape_action"),
        actor: Schema.Literal("another_creature"),
        cost: Schema.Literal("action"),
        method: Schema.Literal("shake_awake"),
        outcome: Schema.Literal("end_current_effect"),
      }),
      strictStruct({
        kind: Schema.Literal("command_target_next_turn"),
        execution: Schema.Literal("target_next_turn"),
        options: CommandTargetNextTurnOptionsSchema,
      }),
      ForcedReactionMovementSchema,
      JumpMovementReplacementSchema,
      FeatherFallMitigationSchema,
      AudibleEffectSchema,
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
        kind: Schema.Literal("share_damage_to_caster"),
        amount: Schema.Literal("same_as_attached_damage_taken"),
      }),
      Schema.Struct({
        kind: Schema.Literal("retaliatory_damage"),
        target: Schema.Literal("triggering_attacker"),
        damageType: DamageTypeRefSchema,
        amount: DiceAmountSchema,
      }),
      strictStruct({
        kind: Schema.Literal("take_standard_action"),
        action: StandardActionKindSchema,
        cost: Schema.Literal("included_in_effect"),
      }),
      strictStruct({
        kind: Schema.Literal("grant_alternate_action_cost"),
        ...AlternateActionCostSchema.fields,
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
        abilityFilter: optionalExact(AbilityFilterSchema),
        count: optionalExact(Schema.Number),
      }),
      strictStruct({
        kind: Schema.Literal("initiative_swap"),
        timing: Schema.Literal("immediately_after_initiative_roll"),
        ally: Schema.Literal("willing_ally_same_combat"),
        prohibitedByCondition: Schema.Literal("incapacitated"),
      }),
      strictStruct({
        kind: Schema.Literal("jack_of_all_trades_ability_check_bonus"),
      }),
      Schema.Struct({
        kind: Schema.Literal("modify_damage_numeric"),
        delta: DiceDeltaSchema,
        damageSourceFilter: optionalExact(DamageSourceFilterSchema),
        weaponFilter: optionalExact(WeaponFilterSchema),
        abilityFilter: optionalExact(nonEmpty(AbilitySchema)),
        minimumDamageTotal: optionalExact(Schema.Literal(1)),
      }),
      strictStruct({
        kind: Schema.Literal("grant_magic_weapon_enhancement"),
        bonus: MagicWeaponEnhancementBonusSchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("modify_size_category"),
        direction: Schema.Literal("increase", "decrease"),
        steps: Schema.Literal(1),
      }),
      Schema.Struct({
        kind: Schema.Literal("modify_crit_range"),
        threshold: Schema.Number,
        attackRollFilter: Schema.Literal("weapon_or_unarmed_strike"),
        weaponFilter: optionalExact(WeaponFilterSchema),
      }),
      Schema.Struct({
        kind: Schema.Literal("transfer_weapon_bonus_to_ac"),
        maxBonus: Schema.Number,
        from: Schema.Literal("attack_and_damage_bonus"),
        trigger: Schema.Literal("first_attack_roll_each_turn"),
        duration: Schema.Literal("start_of_next_turn"),
        weaponFilter: optionalExact(WeaponFilterSchema),
      }),
      Schema.Struct({
        kind: Schema.Literal("suppress_incoming_critical_hit"),
      }),
      Schema.Struct({
        kind: Schema.Literal("modify_roll_advantage"),
        mode: Schema.Literal("advantage", "disadvantage"),
        affects: optionalExact(
          Schema.Literal("self_roll", "rolls_against_self"),
        ),
        on: nonEmpty(RollKindSchema),
        abilityCheckTrigger: optionalExact(
          strictStruct({
            kind: Schema.Literal("condition_end"),
            condition: ConditionSchema,
          }),
        ),
        spellSourceFilter: optionalExact(
          Schema.Struct({ className: ClassNameSchema }),
        ),
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
        abilityFilter: optionalExact(AbilityFilterSchema),
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
      ForceMoveEffectSchema,
      Schema.Struct({
        kind: Schema.Literal("suspend_target"),
        until: Schema.Literal("end_of_next_turn"),
      }),
      Schema.Struct({
        kind: Schema.Literal("fall_at_end_of_next_turn_unless_reapplied"),
      }),
      Schema.Struct({
        kind: Schema.Literal("force_fall"),
        direction: Schema.Literal("upward", "downward"),
        maxDistanceFeet: optionalExact(Schema.Number),
        impactAsNormalFall: optionalExact(Schema.Literal(true)),
      }),
      strictStruct({
        kind: Schema.Literal("levitate_target"),
        initialRiseMaxFeet: Schema.Literal(20),
        suspension: Schema.Literal("spell_duration"),
        targetMovement: strictStruct({
          allowedBy: Schema.Literal(
            "push_or_pull_fixed_object_or_surface_within_reach",
          ),
          movementMode: Schema.Literal("as_if_climbing"),
        }),
        casterAltitudeControl: strictStruct({
          maxDistanceFeet: Schema.Literal(20),
          direction: Schema.Literal("up_or_down"),
          cost: Schema.Literal("magic_action_on_caster_turn"),
          targetMustRemainWithinSpellRange: Schema.Literal(true),
        }),
        selfAltitudeControl: strictStruct({
          maxDistanceFeet: Schema.Literal(20),
          direction: Schema.Literal("up_or_down"),
          cost: Schema.Literal("part_of_move"),
        }),
        ending: Schema.Literal("float_gently_to_ground_if_aloft"),
      }),
      Schema.Struct({ kind: Schema.Literal("grab_fixed_object") }),
      Schema.Struct({
        kind: Schema.Literal("suspend_in_area"),
        location: Schema.Literal("top"),
        until: Schema.Literal("effect_ends"),
      }),
      Schema.Struct({
        kind: Schema.Literal("fall_when_effect_ends"),
        direction: Schema.Literal("downward"),
        unlessCanStopFall: optionalExact(Schema.Literal(true)),
      }),
      Schema.Struct({
        kind: Schema.Literal("move_area"),
        distanceFeet: Schema.Number,
        direction: Schema.Literal("away_from_caster"),
        includeCreaturesInArea: optionalExact(Schema.Literal(true)),
      }),
      Schema.Struct({
        kind: Schema.Literal("reduce_area_height"),
        amount: DiceAmountSchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("end_current_effect_at_area_height_zero"),
      }),
      Schema.Struct({
        kind: Schema.Literal("ability_check_to_move_in_area"),
        ability: Schema.Literal("str"),
        skill: Schema.Literal("athletics"),
        dc: DcSourceSchema,
        onFailure: Schema.Literal("cannot_move"),
      }),
      Schema.Struct({ kind: Schema.Literal("fall_to_ground") }),
      Schema.Struct({
        kind: Schema.Literal("block_targeting"),
        scope: Schema.String,
      }),
      Schema.Struct({
        kind: Schema.Literal("choose_new_target_or_lose"),
        subject: Schema.Literal("triggering_attack_or_spell"),
      }),
      Schema.Struct({
        kind: Schema.Literal("block_travel"),
        scope: Schema.String,
      }),
      Schema.Struct({
        kind: Schema.Literal("end_if_created_in_occupied_space"),
      }),
      Schema.Struct({
        kind: Schema.Literal("allow_designated_creatures_safe_passage"),
      }),
      Schema.Struct({ kind: Schema.Literal("object_immune_to_all_damage") }),
      Schema.Struct({
        kind: Schema.Literal("object_destroyed_by_spell"),
        spellId: Schema.String,
      }),
      Schema.Struct({
        kind: Schema.Literal("cannot_be_dispelled_by_spell"),
        spellId: Schema.String,
      }),
      Schema.Struct({ kind: Schema.Literal("block_ethereal_travel") }),
      Schema.Struct({
        kind: Schema.Literal("replace_destroyed_object_section_with_area"),
        areaLabel: Schema.String,
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
      Schema.Struct({
        kind: Schema.Literal("waste_triggering_spell_or_effect"),
      }),
      Schema.Struct({ kind: Schema.Literal("maximize_healing_received") }),
      Schema.Struct({
        kind: Schema.Literal("transform_target"),
        newForm: ShapeShiftFormSourceSchema,
        retainedFields: nonEmpty(ShapeShiftRetainedFieldSchema),
        tempHpFromForm: optionalExact(Schema.Literal(true)),
        actionRestriction: optionalExact(ShapeShiftActionRestrictionSchema),
        revertTriggers: nonEmpty(ShapeShiftRevertTriggerSchema),
      }),
      Schema.Struct({
        kind: Schema.Literal("end_ongoing_spells"),
        maxSpellLevel: Schema.Union(
          Schema.Number,
          Schema.Literal("caster_slot_level", "contested_spell_level"),
        ),
      }),
      Schema.Struct({ kind: Schema.Literal("see_invisible_and_ethereal") }),
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
      Schema.Struct({ kind: Schema.Literal("make_stable") }),
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
        kind: Schema.Literal("grant_expertise"),
        choiceCount: ClassLevelChoiceCountSchema,
        skills: Schema.Union(
          Schema.Struct({
            kind: Schema.Literal("owned_skill_proficiencies_without_expertise"),
          }),
          Schema.Struct({
            kind: Schema.Literal(
              "listed_owned_skill_proficiencies_without_expertise",
            ),
            skills: nonEmpty(SkillSchema),
          }).pipe(
            Schema.filter((source) => distinctSkills(source.skills), {
              message: () =>
                "Listed Expertise skill source must contain distinct skills.",
            }),
          ),
        ),
      }),
      Schema.Struct({
        kind: Schema.Literal("grant_language"),
        languageId: Schema.NonEmptyTrimmedString,
      }),
      Schema.Struct({
        kind: Schema.Literal("grant_hidden_language_messages"),
        languageId: Schema.NonEmptyTrimmedString,
        message: Schema.Struct({
          kind: Schema.Literal("hidden_language_message"),
        }),
        spotting: Schema.Struct({
          languageKnowers: Schema.Literal("automatic"),
          others: Schema.Struct({
            ability: Schema.Literal("int"),
            skill: Schema.Literal("investigation"),
            dc: Schema.Literal(15),
          }),
        }),
        deciphering: Schema.Struct({
          withoutLanguageRequires: Schema.Literal("magic"),
        }),
      }),
      Schema.Struct({
        kind: Schema.Literal("grant_language_choice"),
        source: Schema.Literal("character_creation_language_tables"),
        count: PositiveIntegerSchema,
      }),
      strictStruct({
        kind: Schema.Literal("grant_spell_access"),
        spellId: Schema.String,
        mode: SpellAccessModeSchema,
        dcOverride: optionalExact(DcSourceSchema),
        areaOverride: optionalExact(AreaShapeSpecSchema),
        targetRestriction: optionalExact(GrantedSpellTargetRestrictionSchema),
        durationOverride: optionalExact(GrantedSpellDurationOverrideSchema),
      }),
      strictStruct({
        kind: Schema.Literal("grant_spell_access_choice"),
        spellList: Schema.Literal(...CLASS_SPELLCASTING_CLASS_NAMES),
        spellLevel: SpellLevelSchema,
        mode: SpellAccessModeSchema,
        count: PositiveIntegerSchema,
        replacement: optionalExact(
          strictStruct({
            trigger: Schema.Literal("class_level_gain"),
            replacementCount: PositiveIntegerSchema,
          }),
        ),
      }),
      strictStruct({
        kind: Schema.Literal("grant_class_level_prepared_spell_access"),
        tiers: nonEmpty(
          Schema.Struct({
            minimumClassLevel: PositiveIntegerSchema,
            spellIds: nonEmpty(Schema.NonEmptyTrimmedString),
          }),
        ),
      }),
      strictStruct({
        kind: Schema.Literal("grant_land_choice_prepared_spell_access"),
        choice: Schema.Struct({
          kind: Schema.Literal("druid_circle_land"),
          trigger: Schema.Literal("long_rest"),
        }),
        spellsByLand: Schema.Struct({
          arid: nonEmpty(
            Schema.Struct({
              minimumClassLevel: PositiveIntegerSchema,
              spellIds: nonEmpty(Schema.NonEmptyTrimmedString),
            }),
          ),
          polar: nonEmpty(
            Schema.Struct({
              minimumClassLevel: PositiveIntegerSchema,
              spellIds: nonEmpty(Schema.NonEmptyTrimmedString),
            }),
          ),
          temperate: nonEmpty(
            Schema.Struct({
              minimumClassLevel: PositiveIntegerSchema,
              spellIds: nonEmpty(Schema.NonEmptyTrimmedString),
            }),
          ),
          tropical: nonEmpty(
            Schema.Struct({
              minimumClassLevel: PositiveIntegerSchema,
              spellIds: nonEmpty(Schema.NonEmptyTrimmedString),
            }),
          ),
        }),
      }),
      Schema.Struct({
        kind: Schema.Literal("grant_spell_free_casts"),
        spellId: Schema.NonEmptyTrimmedString,
        count: PositiveIntegerSchema,
        resetCadence: Schema.Literal("long_rest", "short_or_long_rest"),
        scaling: optionalExact(
          Schema.Struct({
            axis: Schema.Literal("class"),
            tiers: nonEmpty(
              Schema.Struct({
                atLevel: PositiveIntegerSchema,
                count: PositiveIntegerSchema,
              }),
            ),
          }),
        ),
      }),
      Schema.Struct({
        kind: Schema.Literal("grant_die_token"),
        die: DiceAmountSchema,
        trigger: Schema.Literal("failed_d20_test"),
        duration: Schema.Struct({
          unit: Schema.Literal("hour"),
          amount: PositiveIntegerSchema,
        }),
        maxHeld: PositiveIntegerSchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("grant_bonus_action_attack"),
        attack: Schema.Literal("unarmed_strike"),
      }),
      Schema.Struct({
        kind: Schema.Literal("replace_damage_die"),
        die: DiceAmountSchema,
        scope: Schema.Literal("unarmed_or_monk_weapon"),
      }),
      Schema.Struct({
        kind: Schema.Literal("substitute_ability_for_rolls"),
        use: AbilitySchema,
        replaces: AbilitySchema,
        on: nonEmpty(
          Schema.Literal(
            "attack_roll",
            "damage_roll",
            "unarmed_strike_save_dc",
          ),
        ),
        scope: Schema.Literal("unarmed_or_monk_weapon"),
      }),
      Schema.Struct({
        kind: Schema.Literal("offer_ability_substitution_for_ability_checks"),
        use: AbilitySchema,
        skillFilter: Schema.Struct({
          kind: Schema.Literal("fixed"),
          skills: nonEmpty(SkillSchema),
        }),
        requiredActiveFeature: optionalExact(
          Schema.Struct({
            kind: Schema.Literal("class_feature"),
            unitId: Schema.String,
          }),
        ),
      }),
      Schema.Struct({
        kind: Schema.Literal("offer_ability_substitution_for_jump_distance"),
        use: AbilitySchema,
        replaces: AbilitySchema,
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
        property: DetectionPropertySchema,
        radiusFeet: Schema.Number,
      }),
      Schema.Struct({
        kind: Schema.Literal("magical_identity_mask"),
        creatureBranch: Schema.Struct({
          chosenCreatureType: Schema.Literal("other_than_actual_type"),
          treatedAsBy: Schema.Literal("spells_and_magical_effects"),
        }),
        objectBranch: Schema.Struct({
          auraAppearance: Schema.Literal("nonmagical_magical_or_chosen_school"),
          observedBy: Schema.Literal(
            "spells_and_magical_effects_detecting_magical_auras",
          ),
        }),
      }),
      Schema.Struct({
        kind: Schema.Literal("locate_kind"),
        subjectKinds: nonEmpty(LocateKindSubjectSchema),
        maxDistanceFeet: PositiveIntegerSchema,
        match: Schema.Literal("closest"),
        query: Schema.Literal("described_or_named_specific_kind"),
        result: Schema.Literal("direction_and_distance"),
      }),
      Schema.Struct({
        kind: Schema.Literal("object_location_sense"),
        searchModes: ObjectLocationSenseSearchModesSchema,
        maxDistanceFeet: PositiveIntegerSchema,
        result: Schema.Literal("direction_to_location_and_movement"),
        blockedBy: Schema.Literal("any_thickness_of_lead_direct_path"),
      }),
      DivinationOmenEffectSchema,
      CourierTaskEffectSchema,
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
        damageType: AlterSelfNaturalWeaponGrowthDamageTypeChoiceSchema,
        damageDie: Schema.Literal(6),
        replacesAbility: Schema.Literal("str"),
        attackRollAbility: Schema.Literal("spellcasting"),
        damageRollAbility: Schema.Literal("spellcasting"),
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
        kind: Schema.Literal("make_weapon_attack"),
        weapon: Schema.Literal("material_component"),
        abilityOverride: optionalExact(Schema.Literal("spellcasting")),
        damageTypeChoice: optionalExact(
          nonEmpty(Schema.Literal("radiant", "weapon_normal")),
        ),
        bonusDamage: optionalExact(
          Schema.Struct({
            damageType: DamageTypeRefSchema,
            amount: DiceAmountSchema,
          }),
        ),
      }),
      strictStruct({
        kind: Schema.Literal("override_attached_weapon_attack"),
        replacesAbility: Schema.Literal("str"),
        attackRollAbility: Schema.Literal("spellcasting"),
        damageRollAbility: Schema.Literal("spellcasting"),
        attackScope: Schema.Literal("melee_attacks_using_attached_weapon"),
        damageDie: DiceAmountSchema,
        damageTypeChoice: Schema.Tuple(
          Schema.Literal("force"),
          Schema.Literal("weapon_normal"),
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
      ExtradimensionalSpaceEffectSchema,
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
        kind: Schema.Literal("emit_dim_light"),
        radiusFeet: Schema.Number,
        expiresAt: Schema.Literal("end_of_caster_next_turn"),
      }),
      strictStruct({
        kind: Schema.Literal("spell_created_held_object"),
        heldBy: Schema.Literal("caster"),
        requirements: nonEmpty(SpellCreatedHeldObjectRequirementSchema),
        disappearsWhen: nonEmpty(
          SpellCreatedHeldObjectDisappearanceTriggerSchema,
        ),
        reEvoke: strictStruct({
          cost: strictStruct({ kind: Schema.Literal("bonus_action") }),
          requirements: nonEmpty(SpellCreatedHeldObjectRequirementSchema),
        }),
      }),
      Schema.Struct({
        kind: Schema.Literal("composite"),
        effects: nonEmpty(EffectAtomSchema),
      }),
      Schema.Struct({
        kind: Schema.Literal("choose_effect_mode"),
        label: Schema.String,
        options: nonEmpty(
          Schema.Struct({
            id: Schema.String,
            displayName: Schema.String,
            effects: nonEmpty(OngoingEffectSchema),
          }),
        ),
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
      Schema.Struct({
        kind: Schema.Literal("move_object"),
        maxDistanceFeet: Schema.Number,
      }),
      Schema.Struct({
        kind: Schema.Literal("pull_object_away"),
        maxDistanceFeet: Schema.Number,
      }),
      Schema.Struct({ kind: Schema.Literal("manipulate_object") }),
      Schema.Struct({ kind: Schema.Literal("break_concentration") }),
      Schema.Struct({
        kind: Schema.Literal("damage_structure"),
        amount: DiceAmountSchema,
        damageType: DamageTypeRefSchema,
        structureContact: Schema.Literal("ground_in_area"),
      }),
      Schema.Struct({
        kind: Schema.Literal("collapse_structure"),
        trigger: Schema.Literal("structure_drops_to_0_hp"),
      }),
      Schema.Struct({
        kind: Schema.Literal("bury_in_rubble"),
        escape: Schema.Struct({
          kind: Schema.Literal("ability_check"),
          ability: Schema.Literal("str"),
          skill: Schema.Literal("athletics"),
          dc: Schema.Number,
          action: Schema.Literal("action"),
        }),
      }),
      Schema.Struct({ kind: Schema.Literal("bond_objects") }),
      Schema.Struct({
        kind: Schema.Literal("lock_object"),
        password: optionalExact(Schema.String),
      }),
      Schema.Struct({
        kind: Schema.Literal("release_object_access"),
        mundaneLockLimit: Schema.Literal(1),
      }),
      Schema.Struct({
        kind: Schema.Literal("suppress_arcane_lock"),
        duration: Schema.Struct({
          unit: Schema.Literal("minute"),
          amount: Schema.Literal(10),
        }),
        allowsOpenClose: Schema.Literal(true),
      }),
      Schema.Struct({
        kind: Schema.Literal("reposition_attachment"),
        maxMoveFeet: optionalExact(Schema.Number),
      }),
      Schema.Struct({ kind: Schema.Literal("area_is_difficult_terrain") }),
      Schema.Struct({ kind: Schema.Literal("area_emits_dim_light") }),
      Schema.Struct({ kind: Schema.Literal("area_is_lightly_obscured") }),
      Schema.Struct({ kind: Schema.Literal("area_is_heavily_obscured") }),
      Schema.Struct({ kind: Schema.Literal("area_is_magical_darkness") }),
      strictStruct({
        kind: Schema.Literal("area_of_silence"),
        soundBoundary: Schema.Literal("blocks_creation_and_passage"),
        appliesWhen: Schema.Literal("entirely_inside_area"),
        grantsDamageImmunity: Schema.Literal("thunder"),
        imposesCondition: Schema.Literal("deafened"),
        preventsSpellComponent: Schema.Literal("verbal"),
      }),
      strictStruct({
        kind: Schema.Literal("truthfulness_constraint"),
        prohibitedCommunication: Schema.Literal("deliberate_lie"),
        appliesWhile: Schema.Literal("in_spell_area"),
        targetAwareness: Schema.Literal("aware_of_spell"),
        allowedResponse: Schema.Literal("evasive_or_silent_truthful"),
      }),
      strictStruct({
        kind: Schema.Literal("reveal_save_outcome_to_caster"),
      }),
      Schema.Struct({
        kind: Schema.Literal(
          "end_overlapping_spell_created_bright_or_dim_light",
        ),
        maxSpellLevel: Schema.Number,
      }),
      strictStruct({
        kind: Schema.Literal("area_anchor_or_layering_requirement"),
        anchor: strictStruct({
          kind: Schema.Literal("between_solid_masses"),
          count: Schema.Literal(2),
        }),
        layering: strictStruct({
          kind: Schema.Literal("across_surface"),
          surfaces: Schema.Tuple(
            Schema.Literal("floor"),
            Schema.Literal("wall"),
            Schema.Literal("ceiling"),
          ),
          flatSurfaceDepthFeet: Schema.Literal(5),
        }),
        unmetOutcome: strictStruct({
          kind: Schema.Literal("collapse_and_end_effect"),
          timing: Schema.Literal("start_of_caster_next_turn"),
        }),
      }),
      strictStruct({
        kind: Schema.Literal("area_section_burns_away"),
        section: strictStruct({
          kind: Schema.Literal("cube"),
          sideFeet: Schema.Literal(5),
        }),
        exposure: Schema.Literal("fire"),
        burnsAwayAfter: strictStruct({
          unit: Schema.Literal("round"),
          amount: Schema.Literal(1),
        }),
        creatureStartsTurnInFireDamage: strictStruct({
          damageType: Schema.Literal("fire"),
          amount: DiceAmountSchema,
        }),
      }),
      Schema.Struct({ kind: Schema.Literal("area_has_strong_wind") }),
      Schema.Struct({ kind: Schema.Literal("prevent_ranged_weapon_attacks") }),
      Schema.Struct({
        kind: Schema.Literal("area_movement_cost_multiplier"),
        multiplier: PositiveIntegerSchema,
        appliesTo: Schema.Literal("any_movement", "toward_source"),
      }),
      Schema.Struct({
        kind: Schema.Literal("grant_cover"),
        cover: Schema.Literal("three_quarters"),
      }),
      Schema.Struct({ kind: Schema.Literal("block_line_of_sight") }),
      Schema.Struct({
        kind: Schema.Literal("prevent_creature_passage"),
        exceptCreatureTypes: nonEmpty(CreatureTypeSchema),
        allowsThroughBarrier: nonEmpty(
          Schema.Literal("spells", "ranged_attacks", "reach_weapon_attacks"),
        ),
      }),
      Schema.Struct({
        kind: Schema.Literal("prevent_spellcasting_and_magic_actions"),
      }),
      Schema.Struct({ kind: Schema.Literal("prevent_magical_ranged_attacks") }),
      Schema.Struct({
        kind: Schema.Literal("block_magical_targeting_and_aoe"),
      }),
      Schema.Struct({
        kind: Schema.Literal("block_teleport_and_planar_travel"),
      }),
      Schema.Struct({ kind: Schema.Literal("suppress_magic_items") }),
      Schema.Struct({
        kind: Schema.Literal("suppress_ongoing_magic_effects"),
        exceptSources: nonEmpty(Schema.Literal("artifact", "deity")),
        suppressedTimeCountsAgainstDuration: Schema.Literal(true),
      }),
      Schema.Struct({
        kind: Schema.Literal("ordered_barrier_layers"),
        layers: nonEmpty(
          Schema.Struct({
            order: Schema.Number,
            label: Schema.String,
            save: optionalExact(
              Schema.Struct({
                ability: AbilitySchema,
                dc: DcSourceSchema,
                onFail: EffectAtomSchema,
                onSuccess: SaveSuccessOutcomeSchema,
              }),
            ),
            passiveEffects: optionalExact(nonEmpty(EffectAtomSchema)),
            destroyedBy: Schema.String,
          }),
        ),
      }),
      Schema.Struct({ kind: Schema.Literal("allow_reaction_stand_up") }),
      Schema.Struct({
        kind: Schema.Literal("revert_shape_shift_to_true_form"),
        onlyIfTargetIsShapeShifted: Schema.Literal(true),
      }),
      Schema.Struct({
        kind: Schema.Literal("suppress_shape_shifting_while_in_area"),
        onlyIfTargetIsShapeShifted: Schema.Literal(true),
      }),
      Schema.Struct({ kind: Schema.Literal("none") }),
    ),
  );

export const AreaScopedEffectAtomSchema = AreaPushUnsecuredObjectsSchema;
export const AreaDirectEffectAtomSchema = Schema.Union(
  EffectAtomSchema,
  AreaScopedEffectAtomSchema,
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
  rollMode: optionalExact(Schema.Literal("advantage")),
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
      repeatSaves: optionalExact(nonEmpty(RepeatSaveSpecSchema)),
      autoSuccessIfCasterSlotGte: optionalExact(
        Schema.Literal("triggering_spell_level"),
      ),
      autoSuccessIfTarget: optionalExact(Schema.Never),
      saveAppliesIf: optionalExact(
        Schema.Literal("unwilling_target", "unwilling_creature_target"),
      ),
      usageLimit: optionalExact(UsageLimitSchema),
    }),
    Schema.Struct({
      kind: Schema.Literal("save_gate"),
      attachment: CreatureTargetAttachmentSchema,
      ability: AbilitySchema,
      dc: DcSourceSchema,
      onFail: EffectAtomSchema,
      onSuccess: SaveSuccessOutcomeSchema,
      repeatSaves: optionalExact(nonEmpty(RepeatSaveSpecSchema)),
      autoSuccessIfCasterSlotGte: optionalExact(
        Schema.Literal("triggering_spell_level"),
      ),
      autoSuccessIfTarget: SaveGateTargetAutoSuccessPredicateSchema,
      saveAppliesIf: optionalExact(
        Schema.Literal("unwilling_target", "unwilling_creature_target"),
      ),
      usageLimit: optionalExact(UsageLimitSchema),
    }),
    Schema.Struct({
      kind: Schema.Literal("ability_check_gate"),
      attachment: AttachmentSchema,
      ability: SpellcastingAbilityCheckAbilitySchema,
      skill: optionalExact(SkillSchema),
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
      attachment: AreaAttachmentSchema,
      effects: nonEmpty(AreaDirectEffectAtomSchema),
      mode: optionalExact(CastTimeEffectModeChoiceSchema),
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
      attachment: optionalExact(AreaAttachmentSchema),
      ability: AbilitySchema,
      dc: DcSourceSchema,
      onFail: EffectAtomSchema,
      onSuccess: SaveSuccessOutcomeSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("ability_check_gate"),
      ability: SpellcastingAbilityCheckAbilitySchema,
      skill: optionalExact(SkillSchema),
      dc: DcSourceSchema,
      onPass: EffectAtomSchema,
      onFail: optionalExact(EffectAtomSchema),
    }),
    Schema.Struct({
      kind: Schema.Literal("attack_roll"),
      attachment: optionalExact(CreatureTargetAttachmentSchema),
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
  targetLimit: optionalExact(
    Schema.Struct({
      count: Schema.Number,
      distinct: Schema.Literal(true),
      targetTypes: nonEmpty(Schema.Literal("creature", "object")),
    }),
  ),
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

export const PassiveHitInterceptMechanicsSchema = Schema.extend(
  SpellMechanicsHeaderSchema,
  Schema.Struct({
    family: Schema.Literal("passive_hit_intercept"),
    attachment: Schema.Struct({
      kind: Schema.Literal("self"),
    }),
    duplicatePool: Schema.Struct({
      count: Schema.Literal(3),
      dicePerRemainingDuplicate: Schema.Literal(1),
      dieSize: Schema.Literal(6),
      successAtLeast: Schema.Literal(3),
      onHit: Schema.Literal("duplicate_hit_instead_and_destroyed"),
      onFailure: Schema.Literal("caster_hit_normally"),
      ignoresOtherDamageAndEffects: Schema.Literal(true),
      endsWhen: Schema.Literal("all_duplicates_destroyed"),
      unaffectedBy: Schema.Tuple(
        Schema.Literal("blinded"),
        Schema.Literal("blindsight"),
        Schema.Literal("truesight"),
      ),
    }),
  }),
);

export const AnchorTargetSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("location"),
    description: Schema.Literal("door_or_window"),
  }),
  Schema.Struct({
    kind: Schema.Literal("object"),
    visibility: ObjectVisibilityRequirementSchema,
    wornOrCarried: Schema.Literal("not_worn_or_carried_by_another_creature"),
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
  Schema.Struct({
    kind: Schema.Literal("caster_defined_visual_or_audible_condition"),
    maxDistanceFeet: Schema.Literal(30),
  }),
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
  Schema.Struct({
    kind: Schema.Literal("spoken_message"),
    voice: Schema.Literal("caster_voice"),
    volume: Schema.Literal("same_as_spoken"),
    maxWords: Schema.Literal(25),
    maxDeliveryMinutes: Schema.Literal(10),
    mouthPlacement: Schema.Literal("object_mouth_if_present"),
    repetition: Schema.Literal("caster_choice_once_or_repeating"),
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

export const CreatureVulnerabilityListSchema = Schema.Struct({
  kind: Schema.Literal("fixed"),
  damageTypes: nonEmpty(DamageTypeSchema),
});

export const CreatureImmunityListSchema = Schema.Struct({
  damageTypes: optionalExact(nonEmpty(DamageTypeSchema)),
  conditions: optionalExact(nonEmpty(ConditionSchema)),
});

export const CreatureSenseSchema = Schema.Struct({
  kind: Schema.Literal("darkvision", "blindsight", "tremorsense", "truesight"),
  rangeFeet: Schema.Number,
});

const StatBlockDamageNotationAmountSchema = Schema.Struct({
  kind: Schema.Literal("fixed"),
  expr: DiceExprSchema,
  static: optionalExact(Schema.Number),
});

const CreatureAttackEffectAtomSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("damage"),
    damageType: DamageTypeRefSchema,
    amount: StatBlockDamageNotationAmountSchema,
    timing: optionalExact(Schema.Literal("end_of_next_turn")),
  }),
  Schema.Struct({
    kind: Schema.Literal("conditional_bonus_damage"),
    when: Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("target_creature_type"),
        types: nonEmpty(CreatureTypeSchema),
      }),
      Schema.Struct({
        kind: Schema.Literal("attack_roll_had_advantage"),
      }),
    ),
    damageType: DamageTypeRefSchema,
    amount: StatBlockDamageNotationAmountSchema,
  }),
  EffectAtomSchema,
);

export const CreatureNamedAttackRollSchema = Schema.Struct({
  name: Schema.String,
  description: optionalExact(Schema.String),
  attackType: Schema.Literal("melee", "ranged"),
  attackBonus: StatBlockValueSchema,
  reachFeet: optionalExact(Schema.Number),
  rangeFeet: optionalExact(
    Schema.Struct({
      normal: Schema.Number,
      long: Schema.Number,
    }),
  ),
  onHit: nonEmpty(CreatureAttackEffectAtomSchema),
  multiattackCount: optionalExact(StatBlockValueSchema),
  limitedUse: optionalExact(Schema.suspend(() => CreatureLimitedUseSchema)),
});

const CreatureNamedSaveGateBaseSchemaFields = {
  name: Schema.String,
  description: optionalExact(Schema.String),
  ability: AbilitySchema,
  dc: DcSourceSchema,
  onFail: EffectAtomSchema,
  onSuccess: SaveSuccessOutcomeSchema,
  multiattackCount: optionalExact(StatBlockValueSchema),
  limitedUse: optionalExact(Schema.suspend(() => CreatureLimitedUseSchema)),
} as const;

export const CreatureNamedSaveGateSchema = Schema.Union(
  strictStruct({
    ...CreatureNamedSaveGateBaseSchemaFields,
    area: AreaShapeDescriptorSchema,
  }),
  strictStruct({
    ...CreatureNamedSaveGateBaseSchemaFields,
    target: Schema.Struct({
      kind: Schema.Literal("one_creature_in_range"),
      rangeFeet: Schema.Number,
    }),
  }),
);

export const CreatureNamedSupportSchema = Schema.Struct({
  name: Schema.String,
  target: Schema.Literal("self", "ally_in_range"),
  rangeFeet: optionalExact(Schema.Number),
  effect: EffectAtomSchema,
  multiattackCount: optionalExact(StatBlockValueSchema),
  limitedUse: optionalExact(Schema.suspend(() => CreatureLimitedUseSchema)),
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

export const CreatureNamedActionOptionSchema = Schema.Struct({
  name: Schema.String,
  options: nonEmpty(StandardActionKindSchema),
  limitedUse: optionalExact(Schema.suspend(() => CreatureLimitedUseSchema)),
});

export const CreatureNamedSpecialActionSchema = Schema.Struct({
  name: Schema.String,
  description: Schema.String,
  limitedUse: optionalExact(Schema.suspend(() => CreatureLimitedUseSchema)),
});

export const CreatureActionsSchema = Schema.Struct({
  multiattacks: optionalExact(nonEmpty(CreatureNamedMultiattackSchema)),
  attacks: optionalExact(nonEmpty(CreatureNamedAttackRollSchema)),
  saves: optionalExact(nonEmpty(CreatureNamedSaveGateSchema)),
  supports: optionalExact(nonEmpty(CreatureNamedSupportSchema)),
  actionOptions: optionalExact(nonEmpty(CreatureNamedActionOptionSchema)),
  specials: optionalExact(nonEmpty(CreatureNamedSpecialActionSchema)),
});

export const CreatureLimitedUseSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("daily"),
    uses: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1)),
  }),
  Schema.Struct({
    kind: Schema.Literal("recharge"),
    minimumRoll: Schema.Number.pipe(Schema.int(), Schema.between(2, 6)),
  }),
  Schema.Struct({ kind: Schema.Literal("recharge_after_rest") }),
);

export const CreatureLegendaryActionsSchema = Schema.Struct({
  uses: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1)),
  actions: CreatureActionsSchema,
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

export const CreatureSavingThrowModifierSchema = Schema.Struct({
  ability: AbilitySchema,
  modifier: Schema.Number.pipe(Schema.int()),
});

export const CreatureSkillModifierSchema = Schema.Struct({
  skill: SkillSchema,
  modifier: Schema.Number.pipe(Schema.int()),
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
  initiativeModifier: optionalExact(Schema.Number.pipe(Schema.int())),
  savingThrowModifiers: optionalExact(
    nonEmpty(CreatureSavingThrowModifierSchema),
  ),
  skillModifiers: optionalExact(nonEmpty(CreatureSkillModifierSchema)),
  saveProficiencies: optionalExact(nonEmpty(AbilitySchema)),
  vulnerabilities: optionalExact(CreatureVulnerabilityListSchema),
  resistances: optionalExact(CreatureResistanceListSchema),
  immunities: optionalExact(CreatureImmunityListSchema),
  senses: optionalExact(nonEmpty(CreatureSenseSchema)),
  languages: optionalExact(
    Schema.Union(Schema.Literal("caster_languages"), nonEmpty(Schema.String)),
  ),
  actions: optionalExact(CreatureActionsSchema),
  bonusActions: optionalExact(CreatureActionsSchema),
  reactions: optionalExact(CreatureActionsSchema),
  legendaryActions: optionalExact(CreatureLegendaryActionsSchema),
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
  hours: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1)),
  maxReassertPerCast: Schema.Number.pipe(
    Schema.int(),
    Schema.greaterThanOrEqualTo(1),
  ),
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
  Schema.Struct({
    kind: Schema.Literal("familiar_form_catalog"),
    normalForms: nonEmpty(
      Schema.Struct({
        formId: Schema.NonEmptyTrimmedString,
        statBlockId: Schema.NonEmptyTrimmedString,
        displayName: Schema.NonEmptyTrimmedString,
      }),
    ),
    additionalNormalFormEligibility: Schema.Struct({
      kind: Schema.Literal("challengeRatingZeroBeast"),
    }),
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
  PassiveHitInterceptMechanicsSchema,
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
