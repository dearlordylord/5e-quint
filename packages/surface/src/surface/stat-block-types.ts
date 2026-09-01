import type { Brand } from "effect";

import type {
  Ability,
  AlignmentMorality,
  AlignmentOrder,
  AmmunitionKind,
  CreatureType,
  SpeedType,
  StandardActionKind,
  StatBlockId,
  SurfaceCondition,
  SurfaceSkill,
  UnitId,
} from "@dnd/shared/game-facts";
import type {
  AbilityScore,
  DamageDieSize,
  DamageType,
  Integer,
  NonNegativeInteger,
  PositiveInteger,
  ReadonlyNonEmptyArray,
  Size,
} from "@dnd/shared/types";
import {
  type SurfaceReactionTrigger,
  type SurfaceReactionTriggerKind,
  type SurfaceReactionTriggerMember,
} from "./surface-vocabulary.ts";
import type { SrdProvenance } from "./srd-provenance.ts";

export type { StatBlockId } from "@dnd/shared/game-facts";

export {
  SURFACE_REACTION_FALL_RANGE_FEET as STAT_BLOCK_REACTION_FALL_RANGE_FEET,
  SURFACE_REACTION_SPELL_COMPONENTS as STAT_BLOCK_REACTION_SPELL_COMPONENTS,
  SURFACE_REACTION_SPELL_SAVE_OUTCOMES as STAT_BLOCK_REACTION_SPELL_SAVE_OUTCOMES,
  SURFACE_REACTION_TRIGGER_ANY_OF as STAT_BLOCK_REACTION_TRIGGER_ANY_OF,
  SURFACE_REACTION_TRIGGER_CREATURE_CASTS_SPELL as STAT_BLOCK_REACTION_TRIGGER_CREATURE_CASTS_SPELL,
  SURFACE_REACTION_TRIGGER_HIT_BY_ATTACK_ROLL as STAT_BLOCK_REACTION_TRIGGER_HIT_BY_ATTACK_ROLL,
  SURFACE_REACTION_TRIGGER_KINDS as AUTHORED_STAT_BLOCK_REACTION_TRIGGER_KINDS,
  SURFACE_REACTION_TRIGGER_SELF_OR_VISIBLE_CREATURE_FALLS as STAT_BLOCK_REACTION_TRIGGER_SELF_OR_VISIBLE_CREATURE_FALLS,
  SURFACE_REACTION_TRIGGER_SPELL_SAVE_OUTCOME as STAT_BLOCK_REACTION_TRIGGER_SPELL_SAVE_OUTCOME,
  SURFACE_REACTION_TRIGGER_TAKES_DAMAGE_FROM_CREATURE as STAT_BLOCK_REACTION_TRIGGER_TAKES_DAMAGE_FROM_CREATURE,
  SURFACE_REACTION_TRIGGER_TARGETED_BY_NAMED_SPELL as STAT_BLOCK_REACTION_TRIGGER_TARGETED_BY_NAMED_SPELL,
  SURFACE_SPELL_LEVELS as STAT_BLOCK_REACTION_SPELL_LEVELS,
  SURFACE_WEAPON_FILTER_CATEGORIES as STAT_BLOCK_REACTION_WEAPON_CATEGORIES,
  SURFACE_WEAPON_FILTER_SOURCE_ITEM as STAT_BLOCK_REACTION_WEAPON_FILTER_SOURCE_ITEM,
  SURFACE_WEAPON_FILTER_SPECIFIC_ITEM as STAT_BLOCK_REACTION_WEAPON_FILTER_SPECIFIC_ITEM,
  SURFACE_WEAPON_FILTER_WEAPON_CATEGORY as STAT_BLOCK_REACTION_WEAPON_FILTER_WEAPON_CATEGORY,
  SURFACE_WEAPON_FILTER_WEAPON_PROPERTY as STAT_BLOCK_REACTION_WEAPON_FILTER_WEAPON_PROPERTY,
  SURFACE_WEAPON_PROPERTIES as STAT_BLOCK_REACTION_WEAPON_PROPERTIES,
} from "./surface-vocabulary.ts";

export const SRD_CHALLENGE_RATINGS = [
  0, 0.125, 0.25, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
  17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
] as const;

export type ChallengeRating = (typeof SRD_CHALLENGE_RATINGS)[number];

export type AuthoredStatBlockReactionTriggerKind = SurfaceReactionTriggerKind;

export type StatBlockProcedureOrdinal = PositiveInteger &
  Brand.Brand<"StatBlockProcedureOrdinal">;
export type StatBlockProcedureResourceOrdinal = PositiveInteger &
  Brand.Brand<"StatBlockProcedureResourceOrdinal">;

type StatBlockLiteralValue<Value = PositiveInteger> = {
  readonly kind: "literal";
  readonly value: Value;
};

type StatBlockProcedurePositiveValue = StatBlockLiteralValue<PositiveInteger>;
type StatBlockProcedureSignedValue = StatBlockLiteralValue<Integer>;

export type StatBlockProcedureResourceLimit =
  | { readonly kind: "daily"; readonly uses: PositiveInteger }
  | {
      readonly kind: "recharge";
      readonly minimumRoll: 2 | 3 | 4 | 5 | 6;
    }
  | { readonly kind: "recharge_after_rest"; readonly rest: "short_or_long" };

export type StatBlockProcedureResource = {
  readonly ordinal: StatBlockProcedureResourceOrdinal;
  readonly ownership: "shared" | "each";
  readonly limit: StatBlockProcedureResourceLimit;
};

type StatBlockProcedureNoResourceRefs = { readonly kind: "none" };
type StatBlockProcedureSomeResourceRefs = {
  readonly kind: "some";
  readonly ordinals: ReadonlyNonEmptyArray<StatBlockProcedureResourceOrdinal>;
};

export type StatBlockProcedureResourceRefs =
  | StatBlockProcedureNoResourceRefs
  | StatBlockProcedureSomeResourceRefs;

export type StatBlockProcedureDcSource = {
  readonly kind: "fixed";
  readonly dc: PositiveInteger;
};

type StatBlockProcedureDiceExpr = {
  readonly dice: PositiveInteger;
  readonly dieSize: DamageDieSize;
  readonly flat?: Integer;
  readonly spellcastingMod?: true;
  readonly abilityModifier?: Ability;
};

type StatBlockProcedureDamageAmount =
  | {
      readonly kind: "fixed";
      readonly expr: StatBlockProcedureDiceExpr;
      readonly static?: PositiveInteger;
    }
  | { readonly kind: "fixed"; readonly static: PositiveInteger };

type StatBlockConditionExpiration =
  | { readonly kind: "source_next_turn_end" }
  | { readonly kind: "target_next_turn_end" };

type StatBlockProcedureApplyConditionEffect =
  | {
      readonly kind: "apply_condition";
      readonly condition:
        | SurfaceCondition
        | ReadonlyNonEmptyArray<SurfaceCondition>
        | {
            readonly kind: "choose";
            readonly from: ReadonlyNonEmptyArray<SurfaceCondition>;
          };
      readonly duration?:
        | "current_turn"
        | "end_of_next_turn"
        | "end_of_caster_next_turn"
        | "spell_duration"
        | "until_long_rest_or_greater_restoration";
    }
  | {
      readonly kind: "apply_condition";
      readonly condition: SurfaceCondition;
      readonly expiresAt: StatBlockConditionExpiration;
    };

type StatBlockProcedureEffect =
  | StatBlockProcedureApplyConditionEffect
  | {
      readonly kind: "damage";
      readonly damageType: DamageType;
      readonly amount: StatBlockProcedureDamageAmount;
    }
  | {
      readonly kind: "conditional_bonus_damage";
      readonly when:
        | {
            readonly kind: "target_creature_type";
            readonly types: ReadonlyNonEmptyArray<CreatureType>;
          }
        | { readonly kind: "attack_roll_had_advantage" };
      readonly damageType: DamageType;
      readonly amount: StatBlockProcedureDamageAmount;
    }
  | {
      readonly kind: "apply_condition_if_target_size_at_most";
      readonly condition: SurfaceCondition;
      readonly maxCreatureSize: Size;
    };

type StatBlockSaveSuccessOutcome =
  | { readonly kind: "half_damage" }
  | StatBlockProcedureEffect;

export type StatBlockProcedureAreaShape =
  | { readonly kind: "sphere"; readonly radiusFeet: PositiveInteger }
  | { readonly kind: "circle"; readonly radiusFeet: PositiveInteger }
  | {
      readonly kind: "sphere_cluster";
      readonly count: PositiveInteger;
      readonly radiusFeet: PositiveInteger;
      readonly overlapResolution: "affect_once";
    }
  | { readonly kind: "cone"; readonly lengthFeet: PositiveInteger }
  | { readonly kind: "cube"; readonly sideFeet: PositiveInteger }
  | {
      readonly kind: "cube_cluster";
      readonly maxCubes: PositiveInteger;
      readonly sideFeet: PositiveInteger;
      readonly contiguous?: true;
    }
  | {
      readonly kind: "cylinder";
      readonly radiusFeet: PositiveInteger;
      readonly heightFeet: PositiveInteger;
    }
  | { readonly kind: "emanation"; readonly radiusFeet: PositiveInteger }
  | {
      readonly kind: "line";
      readonly lengthFeet: PositiveInteger;
      readonly widthFeet: PositiveInteger;
    }
  | {
      readonly kind: "wall_volume";
      readonly maxLengthFeet: PositiveInteger;
      readonly maxHeightFeet: PositiveInteger;
      readonly thicknessFeet: PositiveInteger;
    };

type AuthoredMultiattackProcedure = {
  readonly kind: "multiattack";
  readonly name: string;
  readonly dispatches: ReadonlyNonEmptyArray<{
    readonly procedureOrdinal: StatBlockProcedureOrdinal;
    readonly count: StatBlockProcedurePositiveValue;
  }>;
};

type AuthoredMeleeAttackRollProcedure = {
  readonly kind: "attack_roll";
  readonly name: string;
  readonly attackType: "melee";
  readonly attackAbility: Ability;
  readonly attackBonus: StatBlockProcedureSignedValue;
  readonly reachFeet: PositiveInteger;
  readonly onHit: ReadonlyNonEmptyArray<StatBlockProcedureEffect>;
  readonly multiattackCount?: StatBlockProcedurePositiveValue;
};

type AuthoredRangedAttackRollProcedure = {
  readonly kind: "attack_roll";
  readonly name: string;
  readonly attackType: "ranged";
  readonly attackAbility: Ability;
  readonly attackBonus: StatBlockProcedureSignedValue;
  readonly rangeFeet: {
    readonly normal: PositiveInteger;
    readonly long: PositiveInteger;
  };
  readonly onHit: ReadonlyNonEmptyArray<StatBlockProcedureEffect>;
  readonly multiattackCount?: StatBlockProcedurePositiveValue;
  readonly ammunition?: AmmunitionKind;
};

type AuthoredSaveGateProcedureFields = {
  readonly kind: "save";
  readonly name: string;
  readonly ability: Ability;
  readonly dc: StatBlockProcedureDcSource;
  readonly onFail: StatBlockProcedureEffect;
  readonly onSuccess: StatBlockSaveSuccessOutcome;
  readonly multiattackCount?: StatBlockProcedurePositiveValue;
};

type AuthoredSaveGateProcedure =
  | (AuthoredSaveGateProcedureFields & {
      readonly area: StatBlockProcedureAreaShape;
    })
  | (AuthoredSaveGateProcedureFields & {
      readonly target: {
        readonly kind: "one_creature_in_range";
        readonly rangeFeet: PositiveInteger;
      };
    });

type AuthoredSupportProcedure = {
  readonly kind: "support";
  readonly name: string;
  readonly target: "self" | "ally_in_range";
  readonly rangeFeet?: PositiveInteger;
  readonly effect: StatBlockProcedureEffect;
  readonly multiattackCount?: StatBlockProcedurePositiveValue;
};

type AuthoredActionOptionProcedure = {
  readonly kind: "action_option";
  readonly name: string;
  readonly options: ReadonlyNonEmptyArray<StandardActionKind>;
};

type StatBlockSpellInvocationEffectTerminationTrigger =
  | {
      readonly kind: "invoker_turn_boundary_in_illumination";
      readonly turnBoundary: "start_or_end";
      readonly illumination: "bright_light";
    }
  | { readonly kind: "same_invoker_recasts_spell" };

type DurationValue = {
  readonly unit: "round" | "minute" | "hour" | "day";
  readonly amount: PositiveInteger;
  readonly upcastTiers?: ReadonlyNonEmptyArray<{
    readonly atSlot: PositiveInteger;
    readonly amount: PositiveInteger;
  }>;
};

export type StatBlockSpellInvocationDelta =
  | {
      readonly kind: "transformation_form_creature_type_limit";
      readonly creatureTypes: ReadonlyNonEmptyArray<CreatureType>;
    }
  | {
      readonly kind: "temporary_hit_points";
      readonly spellGrant: "none";
      readonly maintenanceRequirement: "not_required";
    }
  | {
      readonly kind: "concentration_requirement";
      readonly requirement: "not_required";
    }
  | {
      readonly kind: "effect_termination";
      readonly triggers: ReadonlyNonEmptyArray<StatBlockSpellInvocationEffectTerminationTrigger>;
    }
  | {
      readonly kind: "created_substance_substitution";
      readonly replaces: "water";
      readonly substitute: "wine";
    }
  | { readonly kind: "duration_override"; readonly duration: DurationValue }
  | { readonly kind: "target_limit"; readonly target: "self" }
  | {
      readonly kind: "movement_trace_suppression";
      readonly subject: "invoker";
      readonly whileCondition: "invisible";
      readonly trace: "none";
    }
  | {
      readonly kind: "appearance_options";
      readonly sizes: ReadonlyNonEmptyArray<Size>;
      readonly bodyPlan: "biped";
    }
  | {
      readonly kind: "armor_class_already_includes_effect";
      readonly projection: "already_included";
    }
  | { readonly kind: "application_timing"; readonly timing: "before_combat" };

export type StatBlockSpellInvocationRestriction = {
  readonly authoredExpression: string;
  readonly deltas: ReadonlyNonEmptyArray<StatBlockSpellInvocationDelta>;
};

export type StatBlockSpellReference = {
  readonly spellId: UnitId;
  readonly count?: PositiveInteger;
  readonly castAtLevel?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  readonly restriction?: StatBlockSpellInvocationRestriction;
};

export type StatBlockSpellcastingGroup =
  | {
      readonly kind: "at_will";
      readonly resourceRefs: StatBlockProcedureNoResourceRefs;
      readonly spells: ReadonlyNonEmptyArray<StatBlockSpellReference>;
    }
  | {
      readonly kind: "limited";
      readonly resourceRefs: StatBlockProcedureSomeResourceRefs;
      readonly spells: ReadonlyNonEmptyArray<StatBlockSpellReference>;
    };

type AuthoredSpellcastingProcedure = {
  readonly kind: "spellcasting";
  readonly name: string;
  readonly ability: Ability;
  readonly spellSaveDc?: StatBlockProcedureDcSource;
  readonly spellAttackBonus?: StatBlockProcedureSignedValue;
  readonly components?: {
    readonly v: boolean;
    readonly s: boolean;
    readonly m: string | false;
  };
  readonly groups: ReadonlyNonEmptyArray<StatBlockSpellcastingGroup>;
};

type AuthoredNonSpellcastingExecutableProcedure =
  | AuthoredMultiattackProcedure
  | AuthoredMeleeAttackRollProcedure
  | AuthoredRangedAttackRollProcedure
  | AuthoredSaveGateProcedure
  | AuthoredSupportProcedure
  | AuthoredActionOptionProcedure;

export type AuthoredExecutableProcedure =
  | AuthoredNonSpellcastingExecutableProcedure
  | AuthoredSpellcastingProcedure;

export type StatBlockTextOnlyReason =
  | "unparsed_prose"
  | "unsupported_procedure_family"
  | "unsupported_action_shape"
  | "unsupported_spellcasting_restriction"
  | "required_table_adjudication";

type StatBlockNonSpellcastingExecutableProcedureEntry = {
  readonly kind: "executable";
  readonly procedureOrdinal: StatBlockProcedureOrdinal;
  readonly procedure: AuthoredNonSpellcastingExecutableProcedure;
  readonly resourceRefs: StatBlockProcedureResourceRefs;
};

type StatBlockSpellcastingExecutableProcedureEntry = {
  readonly kind: "executable";
  readonly procedureOrdinal: StatBlockProcedureOrdinal;
  readonly procedure: AuthoredSpellcastingProcedure;
  readonly resourceRefs: StatBlockProcedureNoResourceRefs;
};

type StatBlockExecutableProcedureEntry =
  | StatBlockNonSpellcastingExecutableProcedureEntry
  | StatBlockSpellcastingExecutableProcedureEntry;

type StatBlockTextOnlyProcedureEntry = {
  readonly kind: "textOnly";
  readonly procedureOrdinal: StatBlockProcedureOrdinal;
  readonly name: string;
  readonly description: string;
  readonly reason: StatBlockTextOnlyReason;
  readonly resourceRefs: StatBlockProcedureResourceRefs;
};

export type StatBlockProcedureEntry =
  | StatBlockExecutableProcedureEntry
  | StatBlockTextOnlyProcedureEntry;

export type AuthoredStatBlockReactionTriggerNonRecursive =
  SurfaceReactionTriggerMember<UnitId, PositiveInteger>;

export type AuthoredStatBlockReactionTriggerNonRecursiveEncoded =
  SurfaceReactionTriggerMember<string, number>;

export type AuthoredStatBlockReactionTrigger = SurfaceReactionTrigger<
  UnitId,
  PositiveInteger
>;

export type AuthoredStatBlockReactionTriggerEncoded = SurfaceReactionTrigger<
  string,
  number
>;

type StatBlockReactionProcedureEntry =
  | (StatBlockNonSpellcastingExecutableProcedureEntry & {
      readonly trigger: AuthoredStatBlockReactionTrigger;
    })
  | (StatBlockSpellcastingExecutableProcedureEntry & {
      readonly trigger: AuthoredStatBlockReactionTrigger;
    })
  | StatBlockTextOnlyProcedureEntry;

export type StatBlockProcedureSection =
  ReadonlyNonEmptyArray<StatBlockProcedureEntry>;
export type StatBlockReactionSection =
  ReadonlyNonEmptyArray<StatBlockReactionProcedureEntry>;

type StatBlockLegendaryActionUses =
  | { readonly kind: "fixed"; readonly uses: PositiveInteger }
  | {
      readonly kind: "lair_bonus";
      readonly usesOutsideLair: PositiveInteger;
      readonly additionalUsesInLair: PositiveInteger;
    };

export type StatBlockLegendaryActionSection = {
  readonly uses: StatBlockLegendaryActionUses;
  readonly entries: StatBlockProcedureSection;
};

export type StatBlockAlignment =
  | "unaligned"
  | { readonly order: AlignmentOrder; readonly morality: AlignmentMorality };

export type StandaloneStatBlockSize =
  | Size
  | {
      readonly kind: "alternatives";
      readonly options: ReadonlyNonEmptyArray<Size>;
    };

type StandaloneCreatureSense =
  | {
      readonly kind: "darkvision";
      readonly rangeFeet: PositiveInteger;
      readonly qualifier?: "unimpeded_by_magical_darkness";
    }
  | {
      readonly kind: "blindsight" | "tremorsense" | "truesight";
      readonly rangeFeet: PositiveInteger;
    };

export type StandaloneCreatureSpeed =
  | {
      readonly kind: Exclude<SpeedType, "fly">;
      readonly feet: StatBlockLiteralValue;
      readonly hover?: never;
      readonly availability?: never;
    }
  | {
      readonly kind: "fly";
      readonly feet: StatBlockLiteralValue;
      readonly hover?: true;
      readonly availability?: never;
    }
  | {
      readonly kind: Exclude<SpeedType, "fly">;
      readonly feet: StatBlockLiteralValue;
      readonly hover?: never;
      readonly availability: {
        readonly kind: "forms_only";
        readonly forms: ReadonlyNonEmptyArray<string>;
      };
    }
  | {
      readonly kind: "fly";
      readonly feet: StatBlockLiteralValue;
      readonly hover?: true;
      readonly availability: {
        readonly kind: "forms_only";
        readonly forms: ReadonlyNonEmptyArray<string>;
      };
    };

type StatBlockGmSpeedChoiceAlternative = Extract<
  StandaloneCreatureSpeed,
  { readonly availability?: never }
>;

type StatBlockGmSpeedChoiceAlternativeEncoded<
  Alternative extends StatBlockGmSpeedChoiceAlternative =
    StatBlockGmSpeedChoiceAlternative,
> = Alternative extends StatBlockGmSpeedChoiceAlternative
  ? Omit<Alternative, "feet"> & {
      readonly feet: StatBlockLiteralValue<number>;
    }
  : never;

export type StatBlockGmSpeedChoiceAlternatives = readonly [
  StatBlockGmSpeedChoiceAlternative,
  StatBlockGmSpeedChoiceAlternative,
  ...StatBlockGmSpeedChoiceAlternative[],
] &
  Brand.Brand<"StatBlockGmSpeedChoiceAlternatives">;

export type StatBlockGmSpeedChoiceAlternativesEncoded = readonly [
  StatBlockGmSpeedChoiceAlternativeEncoded,
  StatBlockGmSpeedChoiceAlternativeEncoded,
  ...StatBlockGmSpeedChoiceAlternativeEncoded[],
];

export type StatBlockGmSpeedChoice = {
  readonly kind: "gm_choice";
  readonly alternatives: StatBlockGmSpeedChoiceAlternatives;
} & Brand.Brand<"StatBlockGmSpeedChoice">;

export type StandaloneStatBlockSpeedEntry =
  | StandaloneCreatureSpeed
  | StatBlockGmSpeedChoice;

type CreatureSavingThrowModifier = {
  readonly ability: Ability;
  readonly modifier: Integer;
};

type CreatureSkillModifier = {
  readonly skill: SurfaceSkill;
  readonly modifier: Integer;
};

type CreatureResistanceList =
  | {
      readonly kind: "fixed";
      readonly damageTypes: ReadonlyNonEmptyArray<DamageType>;
    }
  | {
      readonly kind: "choose_one_from";
      readonly options: ReadonlyNonEmptyArray<DamageType>;
    };

type CreatureVulnerabilityList =
  | {
      readonly kind: "fixed";
      readonly damageTypes: ReadonlyNonEmptyArray<DamageType>;
    }
  | {
      readonly kind: "qualified";
      readonly damageTypes: ReadonlyNonEmptyArray<DamageType>;
      readonly qualifier: string;
    };

type QualifiedConditionImmunity = {
  readonly condition: SurfaceCondition;
  readonly qualifier: string;
};

type CreatureImmunityDeclaration =
  | { readonly damageTypes: ReadonlyNonEmptyArray<DamageType> }
  | {
      readonly damageTypes: ReadonlyNonEmptyArray<DamageType>;
      readonly conditions: ReadonlyNonEmptyArray<SurfaceCondition>;
    }
  | {
      readonly damageTypes: ReadonlyNonEmptyArray<DamageType>;
      readonly qualifiedConditions: ReadonlyNonEmptyArray<QualifiedConditionImmunity>;
    }
  | { readonly conditions: ReadonlyNonEmptyArray<SurfaceCondition> }
  | {
      readonly qualifiedConditions: ReadonlyNonEmptyArray<QualifiedConditionImmunity>;
    }
  | {
      readonly conditions: ReadonlyNonEmptyArray<SurfaceCondition>;
      readonly qualifiedConditions: ReadonlyNonEmptyArray<QualifiedConditionImmunity>;
    }
  | {
      readonly damageTypes: ReadonlyNonEmptyArray<DamageType>;
      readonly conditions: ReadonlyNonEmptyArray<SurfaceCondition>;
      readonly qualifiedConditions: ReadonlyNonEmptyArray<QualifiedConditionImmunity>;
    };

type CreatureImmunityList = CreatureImmunityDeclaration &
  Brand.Brand<"CreatureImmunityDeclaration">;

export type StatBlockCommunicationLanguageSet =
  | {
      readonly kind: "named";
      readonly languages: ReadonlyNonEmptyArray<string>;
    }
  | { readonly kind: "all" }
  | {
      readonly kind: "named_plus_other_languages";
      readonly languages: ReadonlyNonEmptyArray<string>;
      readonly additionalLanguages: PositiveInteger;
    };

type StatBlockTelepathy = {
  readonly rangeFeet: PositiveInteger;
  readonly response?: "receiving_creature_cannot_respond";
  readonly requiresLanguageUnderstanding?: StatBlockCommunicationLanguageSet;
};

export type StatBlockCommunication =
  | { readonly kind: "none"; readonly telepathy?: StatBlockTelepathy }
  | {
      readonly kind: "spoken_and_understood";
      readonly languages: StatBlockCommunicationLanguageSet;
      readonly additionallyUnderstoodButCannotSpeak?: StatBlockCommunicationLanguageSet;
      readonly speechRestriction?: {
        readonly kind: "cannot_speak_in_forms";
        readonly forms: ReadonlyNonEmptyArray<string>;
      };
      readonly telepathy?: StatBlockTelepathy;
    }
  | {
      readonly kind: "understood_but_cannot_speak";
      readonly languages: StatBlockCommunicationLanguageSet;
      readonly telepathy?: StatBlockTelepathy;
    }
  | {
      readonly kind: "understands_commands_only";
      readonly telepathy?: StatBlockTelepathy;
    };

type CreatureTrait = {
  readonly name: string;
  readonly description: string;
  readonly effect?:
    | {
        readonly kind: "attack_roll_advantage_when_non_incapacitated_ally_within_5_feet_of_target";
      }
    | {
        readonly kind: "caster_shared_resistance";
        readonly chosenFrom: "resistances_list";
      }
    | {
        readonly kind: "caster_heal_link";
        readonly rangeFeet: PositiveInteger;
      };
};

type StandaloneStatBlockFacts = {
  readonly creatureType: CreatureType;
  readonly creatureTypeTags?: ReadonlyNonEmptyArray<string>;
  readonly alignment: StatBlockAlignment;
  readonly ac: {
    readonly value: StatBlockLiteralValue;
    readonly annotations?: ReadonlyNonEmptyArray<string>;
  };
  readonly hp: StatBlockLiteralValue;
  readonly speeds: ReadonlyNonEmptyArray<StandaloneStatBlockSpeedEntry>;
  readonly abilityScores: {
    readonly str: AbilityScore;
    readonly dex: AbilityScore;
    readonly con: AbilityScore;
    readonly int: AbilityScore;
    readonly wis: AbilityScore;
    readonly cha: AbilityScore;
  };
  readonly initiative: {
    readonly modifier: Integer;
    readonly score: NonNegativeInteger;
  };
  readonly savingThrowModifiers?: ReadonlyNonEmptyArray<CreatureSavingThrowModifier>;
  readonly skillModifiers?: ReadonlyNonEmptyArray<CreatureSkillModifier>;
  readonly saveProficiencies?: ReadonlyNonEmptyArray<Ability>;
  readonly vulnerabilities?: CreatureVulnerabilityList;
  readonly resistances?: CreatureResistanceList;
  readonly immunities?: CreatureImmunityList;
  readonly senses?: ReadonlyNonEmptyArray<StandaloneCreatureSense>;
  readonly passivePerception: NonNegativeInteger;
  readonly gear?: ReadonlyNonEmptyArray<{
    readonly item: string;
    readonly quantity?: PositiveInteger;
  }>;
  readonly communication: StatBlockCommunication;
  readonly resources?: ReadonlyNonEmptyArray<StatBlockProcedureResource>;
  readonly actions?: StatBlockProcedureSection;
  readonly bonusActions?: StatBlockProcedureSection;
  readonly reactions?: StatBlockReactionSection;
  readonly legendaryActions?: StatBlockLegendaryActionSection;
  readonly traits?: ReadonlyNonEmptyArray<CreatureTrait>;
};

export type StandaloneStatBlock = StandaloneStatBlockFacts &
  (
    | { readonly size: StandaloneStatBlockSize; readonly swarm?: never }
    | {
        readonly size: "medium";
        readonly swarm: { readonly constituentSize: "tiny" };
      }
    | {
        readonly size: "large";
        readonly swarm: { readonly constituentSize: "tiny" };
      }
  );

export type StatBlockRecord = {
  readonly id: StatBlockId;
  readonly kind: "statBlock";
  readonly name: string;
  readonly provenance: {
    readonly kind: SrdProvenance["kind"] | "xphb" | "synthetic-test";
    readonly section: string;
  };
  readonly challengeRating: ChallengeRating;
  readonly statBlock: StandaloneStatBlock;
};

type StatBlockWireValue<A> = A extends StatBlockProcedureOrdinal
  ? number
  : A extends StatBlockProcedureResourceOrdinal
    ? number
    : A extends AbilityScore
      ? number
      : A extends NonNegativeInteger
        ? number
        : A extends PositiveInteger
          ? number
          : A extends Integer
            ? number
            : A extends UnitId
              ? string
              : A extends StatBlockId
                ? string
                : A extends StatBlockGmSpeedChoice
                  ? {
                      readonly kind: "gm_choice";
                      readonly alternatives: StatBlockGmSpeedChoiceAlternativesEncoded;
                    }
                  : A extends CreatureImmunityList
                    ? StatBlockWireValue<CreatureImmunityDeclaration>
                    : A extends readonly [infer First, ...infer Rest]
                      ? readonly [
                          StatBlockWireValue<First>,
                          ...StatBlockWireValue<Rest>,
                        ]
                      : A extends ReadonlyArray<infer Item>
                        ? ReadonlyArray<StatBlockWireValue<Item>>
                        : A extends object
                          ? {
                              readonly [Key in keyof A]: Key extends "trigger"
                                ? A[Key] extends AuthoredStatBlockReactionTrigger
                                  ? AuthoredStatBlockReactionTriggerEncoded
                                  : StatBlockWireValue<A[Key]>
                                : StatBlockWireValue<A[Key]>;
                            }
                          : A;

export type StandaloneStatBlockEncoded =
  StatBlockWireValue<StandaloneStatBlock>;
export type StatBlockRecordEncoded = StatBlockWireValue<StatBlockRecord>;

export type SrdStatBlockRecord = Omit<StatBlockRecord, "provenance"> & {
  readonly provenance: SrdProvenance;
};
export type SrdStatBlockRecordEncoded = StatBlockWireValue<SrdStatBlockRecord>;
