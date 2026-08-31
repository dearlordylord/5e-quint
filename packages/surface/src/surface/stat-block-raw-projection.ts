import { Either, Match, Schema } from "effect";

import {
  ABILITIES,
  ALIGNMENT_MORALITIES,
  ALIGNMENT_ORDERS,
  SPEED_TYPES,
} from "@dnd/shared/game-facts";
import {
  DAMAGE_TYPES,
  SIZES,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type { SrdStatBlockSourceOccurrence } from "./stat-block-parity-observation.ts";
import {
  AbilitySchema,
  ChallengeRatingSchema,
  ConditionSchema,
  CreatureTypeSchema,
  DamageTypeSchema,
  SizeSchema,
  SkillSchema,
  StandaloneStatBlockSpeedEntrySchema,
  StandaloneStatBlockSizeAndSwarmSchema,
  StandaloneCreatureSenseSchema,
  StandaloneStatBlockAbilityScoresSchema,
  StatBlockCommunicationSchema,
  StatBlockTextOnlyReasonSchema,
  CreatureTraitSchema,
  CreatureImmunityListSchema,
} from "./schema.ts";
import { exactOptional, nonEmpty, strictStruct } from "./schema-helpers.ts";
import {
  isChallengeRating,
  statBlockProficiencyBonusForChallengeRating,
} from "./stat-block-proficiency-bonus.ts";

import {
  CONDITIONS,
  CREATURE_TYPES,
  SKILLS,
  type Ability,
  type ChallengeRating,
  type Condition,
  type CreatureType,
  type CreatureTrait,
  type CreatureImmunityList,
  type DamageType,
  type Size,
  type Skill,
  type SrdStatBlockRecord,
  type StandaloneStatBlockSizeAndSwarm,
  type StandaloneCreatureSense,
  type StandaloneStatBlockSpeedEntry,
  type StatBlockCommunication,
  type StatBlockProcedureEntry,
  type StatBlockTextOnlyReason,
} from "./types.ts";

/**
 * Identity-free projector for comparing parser-bounded local SRD spans with
 * authored Stat Blocks. Hit Dice are deliberately outside this projection;
 * the current Surface Stat Block boundary owns only the printed HP average.
 */

const ABILITY_NAMES = ABILITIES;
const ATTACK_ABILITY_NAMES = ["str", "dex", "int", "wis", "cha"] as const;
type AttackAbility = (typeof ATTACK_ABILITY_NAMES)[number];
type NonEmptyStrings = ReadonlyNonEmptyArray<string>;

type AbilityMatrixFact = {
  readonly ability: Ability;
  readonly score: number;
  readonly modifier: number;
  readonly saveModifier: number;
};

type AbilityMatrix = readonly [
  AbilityMatrixFact,
  AbilityMatrixFact,
  AbilityMatrixFact,
  AbilityMatrixFact,
  AbilityMatrixFact,
  AbilityMatrixFact,
];

const PROCEDURE_SECTIONS = [
  "Actions",
  "Bonus Actions",
  "Reactions",
  "Legendary Actions",
] as const;
type ProcedureSection = (typeof PROCEDURE_SECTIONS)[number];
const RAW_SECTIONS = ["Traits", ...PROCEDURE_SECTIONS] as const;
type RawSection = (typeof RAW_SECTIONS)[number];

const procedureSection = (section: RawSection): ProcedureSection | undefined =>
  Match.value(section).pipe(
    Match.when("Traits", () => undefined),
    Match.when("Actions", (procedure) => procedure),
    Match.when("Bonus Actions", (procedure) => procedure),
    Match.when("Reactions", (procedure) => procedure),
    Match.when("Legendary Actions", (procedure) => procedure),
    Match.exhaustive,
  );

const isBonusActionSection = (section: RawSection): boolean =>
  Match.value(section).pipe(
    Match.when("Traits", () => false),
    Match.when("Actions", () => false),
    Match.when("Bonus Actions", () => true),
    Match.when("Reactions", () => false),
    Match.when("Legendary Actions", () => false),
    Match.exhaustive,
  );

type RawEntry = {
  readonly section: RawSection;
  readonly name: string;
  readonly description: string;
};

type NamedModifier<Name extends string> = {
  readonly name: Name;
  readonly modifier: number;
};

type AttackAbilityEvidence =
  | { readonly kind: "resolved"; readonly ability: AttackAbility }
  | {
      readonly kind: "unresolved";
      readonly candidates: readonly [
        AttackAbility,
        AttackAbility,
        ...AttackAbility[],
      ];
    };

type ResourceLimitProjection =
  | {
      readonly kind: "daily";
      readonly uses: number;
      readonly ownership: "shared" | "each";
    }
  | {
      readonly kind: "recharge";
      readonly minimumRoll: number;
      readonly ownership: "shared" | "each";
    }
  | {
      readonly kind: "recharge_after_rest";
      readonly rest: "short_or_long";
      readonly ownership: "shared" | "each";
    };

type DamageAmountProjection =
  | {
      readonly kind: "fixed";
      readonly static: number;
    }
  | {
      readonly kind: "fixed";
      readonly static: number;
      readonly expr: {
        readonly dice: number;
        readonly dieSize: number;
        readonly flat?: number;
        readonly spellcastingMod?: true;
        readonly abilityModifier?: Ability;
      };
    };

type DamageProjection = {
  readonly kind: "damage";
  readonly damageType: DamageType;
  readonly amount: DamageAmountProjection;
};

type ResistanceProjection =
  | { readonly kind: "none" }
  | {
      readonly kind: "fixed";
      readonly damageTypes: ReadonlyNonEmptyArray<DamageType>;
    }
  | {
      readonly kind: "choose_one_from";
      readonly options: ReadonlyNonEmptyArray<DamageType>;
    };

type AttackEffectProjection =
  | DamageProjection
  | (Omit<DamageProjection, "kind"> & {
      readonly kind: "conditional_bonus_damage";
      readonly when: "attack_roll_had_advantage";
    })
  | {
      readonly kind: "apply_condition_if_target_size_at_most";
      readonly condition: Condition;
      readonly maxCreatureSize: Size;
    }
  | {
      readonly kind: "apply_condition";
      readonly condition: Condition;
      readonly expiresAt: "source_next_turn_end" | "target_next_turn_end";
    };

type SpellProjection = {
  readonly spellId: string;
  readonly count?: number;
  readonly castAtLevel?: number;
  readonly restriction?: string;
};

type SpellcastingGroupProjection =
  | {
      readonly kind: "at_will";
      readonly spells: ReadonlyNonEmptyArray<SpellProjection>;
      readonly resourceLimits: readonly [];
    }
  | {
      readonly kind: "limited";
      readonly spells: ReadonlyNonEmptyArray<SpellProjection>;
      readonly resourceLimits: ReadonlyNonEmptyArray<ResourceLimitProjection>;
    };

type ProcedureProjection =
  | {
      readonly section: ProcedureSection;
      readonly name: string;
      readonly kind: "textOnly";
      readonly description: string;
      readonly reason: StatBlockTextOnlyReason;
      readonly resourceLimits: readonly ResourceLimitProjection[];
    }
  | ({
      readonly section: ProcedureSection;
      readonly name: string;
      readonly kind: "attack_roll";
      readonly attackBonus: number;
      readonly attackAbilityEvidence: AttackAbilityEvidence;
      readonly multiattackCount?: number;
      readonly onHit: ReadonlyNonEmptyArray<AttackEffectProjection>;
      readonly resourceLimits: readonly ResourceLimitProjection[];
    } & (
      | {
          readonly attackType: "melee";
          readonly reachFeet: number;
        }
      | {
          readonly attackType: "ranged";
          readonly rangeFeet: {
            readonly normal: number;
            readonly long: number;
          };
          readonly ammunition?: string;
        }
    ))
  | {
      readonly section: ProcedureSection;
      readonly name: string;
      readonly kind: "save";
      readonly ability: Ability;
      readonly dc: number;
      readonly area:
        | {
            readonly kind: "line";
            readonly lengthFeet: number;
            readonly widthFeet: number;
          }
        | { readonly kind: "cone"; readonly lengthFeet: number };
      readonly onFail: DamageProjection;
      readonly onSuccess: "half_damage";
      readonly multiattackCount?: number;
      readonly resourceLimits: readonly ResourceLimitProjection[];
    }
  | {
      readonly section: ProcedureSection;
      readonly name: string;
      readonly kind: "multiattack";
      readonly dispatches: ReadonlyNonEmptyArray<{
        readonly procedureName: string;
        readonly count: number;
      }>;
      readonly resourceLimits: readonly ResourceLimitProjection[];
    }
  | {
      readonly section: ProcedureSection;
      readonly name: string;
      readonly kind: "action_option";
      readonly options: NonEmptyStrings;
      readonly resourceLimits: readonly ResourceLimitProjection[];
    }
  | {
      readonly section: ProcedureSection;
      readonly name: string;
      readonly kind: "spellcasting";
      readonly ability: Ability;
      readonly spellSaveDc?: number;
      readonly spellAttackBonus?: number;
      readonly components:
        | { readonly kind: "spell_definition" }
        | {
            readonly kind: "fixed";
            readonly v: boolean;
            readonly s: boolean;
            readonly m: false | string;
          };
      readonly groups: ReadonlyNonEmptyArray<SpellcastingGroupProjection>;
      readonly resourceLimits: readonly ResourceLimitProjection[];
    };

type StructuralProcedure = Exclude<
  ProcedureProjection,
  { readonly kind: "textOnly" }
>;

type ScopedGeneralFacts = {
  readonly challengeRating: ChallengeRating;
  readonly sizeAndSwarm: StandaloneStatBlockSizeAndSwarm;
  readonly creatureType: CreatureType;
  readonly creatureTypeTags: readonly string[];
  readonly alignment:
    | "unaligned"
    | {
        readonly order: (typeof ALIGNMENT_ORDERS)[number];
        readonly morality: (typeof ALIGNMENT_MORALITIES)[number];
      };
  readonly ac: {
    readonly kind: "literal";
    readonly value: number;
    readonly annotations: readonly string[];
  };
  readonly hp: { readonly kind: "literal"; readonly value: number };
  readonly speeds: ReadonlyNonEmptyArray<StandaloneStatBlockSpeedEntry>;
  readonly abilityScores: Readonly<Record<Ability, number>>;
  readonly initiative: { readonly modifier: number; readonly score: number };
  readonly savingThrowModifiers: readonly NamedModifier<Ability>[];
  readonly saveProficiencies: readonly Ability[];
  readonly skillModifiers: readonly NamedModifier<Skill>[];
  readonly vulnerabilities:
    | { readonly kind: "none" }
    | {
        readonly kind: "fixed";
        readonly damageTypes: ReadonlyNonEmptyArray<DamageType>;
      }
    | {
        readonly kind: "qualified";
        readonly damageTypes: ReadonlyNonEmptyArray<DamageType>;
        readonly qualifier: string;
      };
  readonly resistances: ResistanceProjection;
  readonly immunities:
    | { readonly kind: "none" }
    | { readonly kind: "some"; readonly value: CreatureImmunityList };
  readonly senses: readonly StandaloneCreatureSense[];
  readonly passivePerception: number;
  readonly gear: readonly {
    readonly item: string;
    readonly quantity: number;
  }[];
  readonly communication: StatBlockCommunication;
  readonly legendaryActionUses?:
    | {
        readonly kind: "fixed";
        readonly uses: number;
      }
    | {
        readonly kind: "lair_bonus";
        readonly usesOutsideLair: number;
        readonly additionalUsesInLair: number;
      };
};

export type StatBlockScopedFidelityProjection = {
  readonly generalFacts: ScopedGeneralFacts;
  readonly resources: readonly ResourceLimitProjection[];
  readonly entryNames: readonly string[];
  readonly traits: readonly CreatureTrait[];
  readonly textOnlyProcedures: readonly {
    readonly section: ProcedureSection;
    readonly name: string;
    readonly description: string;
    readonly reason: StatBlockTextOnlyReason;
  }[];
  readonly procedures: readonly ProcedureProjection[];
};

const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
);
const SignedIntegerSchema = Schema.Number.pipe(Schema.int());
const NonEmptyStringSchema = Schema.NonEmptyTrimmedString;
const ProcedureSectionSchema = Schema.Literal(...PROCEDURE_SECTIONS);
const AttackAbilitySchema = Schema.Literal(...ATTACK_ABILITY_NAMES);

const ResourceLimitProjectionSchema = Schema.Union(
  strictStruct({
    kind: Schema.Literal("daily"),
    uses: PositiveIntegerSchema,
    ownership: Schema.Literal("shared", "each"),
  }),
  strictStruct({
    kind: Schema.Literal("recharge"),
    minimumRoll: Schema.Number.pipe(Schema.int(), Schema.between(2, 6)),
    ownership: Schema.Literal("shared", "each"),
  }),
  strictStruct({
    kind: Schema.Literal("recharge_after_rest"),
    rest: Schema.Literal("short_or_long"),
    ownership: Schema.Literal("shared", "each"),
  }),
);

const DamageAmountProjectionSchema = Schema.Union(
  strictStruct({
    kind: Schema.Literal("fixed"),
    static: PositiveIntegerSchema,
  }),
  strictStruct({
    kind: Schema.Literal("fixed"),
    static: PositiveIntegerSchema,
    expr: strictStruct({
      dice: PositiveIntegerSchema,
      dieSize: PositiveIntegerSchema,
      flat: exactOptional(SignedIntegerSchema),
      spellcastingMod: exactOptional(Schema.Literal(true)),
      abilityModifier: exactOptional(AbilitySchema),
    }),
  }),
);

const DamageProjectionSchema = strictStruct({
  kind: Schema.Literal("damage"),
  damageType: DamageTypeSchema,
  amount: DamageAmountProjectionSchema,
});

const AttackEffectProjectionSchema = Schema.Union(
  DamageProjectionSchema,
  strictStruct({
    kind: Schema.Literal("conditional_bonus_damage"),
    when: Schema.Literal("attack_roll_had_advantage"),
    damageType: DamageTypeSchema,
    amount: DamageAmountProjectionSchema,
  }),
  strictStruct({
    kind: Schema.Literal("apply_condition_if_target_size_at_most"),
    condition: ConditionSchema,
    maxCreatureSize: SizeSchema,
  }),
  strictStruct({
    kind: Schema.Literal("apply_condition"),
    condition: ConditionSchema,
    expiresAt: Schema.Literal("source_next_turn_end", "target_next_turn_end"),
  }),
);

const AttackAbilityEvidenceSchema = Schema.Union(
  strictStruct({
    kind: Schema.Literal("resolved"),
    ability: AttackAbilitySchema,
  }),
  strictStruct({
    kind: Schema.Literal("unresolved"),
    candidates: nonEmpty(AttackAbilitySchema).pipe(
      Schema.filter(
        (candidates) =>
          candidates.length >= 2 &&
          new Set(candidates).size === candidates.length,
        {
          message: () =>
            "Unresolved attack evidence requires at least two distinct abilities.",
        },
      ),
    ),
  }),
);

const SpellProjectionSchema = strictStruct({
  spellId: NonEmptyStringSchema,
  count: exactOptional(PositiveIntegerSchema),
  castAtLevel: exactOptional(PositiveIntegerSchema),
  restriction: exactOptional(NonEmptyStringSchema),
});

const SpellcastingGroupProjectionSchema = Schema.Union(
  strictStruct({
    kind: Schema.Literal("at_will"),
    spells: nonEmpty(SpellProjectionSchema),
    resourceLimits: Schema.Tuple(),
  }),
  strictStruct({
    kind: Schema.Literal("limited"),
    spells: nonEmpty(SpellProjectionSchema),
    resourceLimits: nonEmpty(ResourceLimitProjectionSchema),
  }),
);

const ProcedureBaseFields = {
  section: ProcedureSectionSchema,
  name: NonEmptyStringSchema,
  resourceLimits: Schema.Array(ResourceLimitProjectionSchema),
} as const;

const ProcedureProjectionSchema = Schema.Union(
  strictStruct({
    ...ProcedureBaseFields,
    kind: Schema.Literal("textOnly"),
    description: NonEmptyStringSchema,
    reason: StatBlockTextOnlyReasonSchema,
  }),
  strictStruct({
    ...ProcedureBaseFields,
    kind: Schema.Literal("attack_roll"),
    attackType: Schema.Literal("melee"),
    attackBonus: SignedIntegerSchema,
    attackAbilityEvidence: AttackAbilityEvidenceSchema,
    multiattackCount: exactOptional(PositiveIntegerSchema),
    reachFeet: PositiveIntegerSchema,
    onHit: nonEmpty(AttackEffectProjectionSchema),
  }),
  strictStruct({
    ...ProcedureBaseFields,
    kind: Schema.Literal("attack_roll"),
    attackType: Schema.Literal("ranged"),
    attackBonus: SignedIntegerSchema,
    attackAbilityEvidence: AttackAbilityEvidenceSchema,
    multiattackCount: exactOptional(PositiveIntegerSchema),
    rangeFeet: strictStruct({
      normal: PositiveIntegerSchema,
      long: PositiveIntegerSchema,
    }).pipe(
      Schema.filter(({ normal, long }) => normal <= long, {
        message: () => "Normal attack range cannot exceed long range.",
      }),
    ),
    ammunition: exactOptional(NonEmptyStringSchema),
    onHit: nonEmpty(AttackEffectProjectionSchema),
  }),
  strictStruct({
    ...ProcedureBaseFields,
    kind: Schema.Literal("save"),
    ability: AbilitySchema,
    dc: PositiveIntegerSchema,
    area: Schema.Union(
      strictStruct({
        kind: Schema.Literal("line"),
        lengthFeet: PositiveIntegerSchema,
        widthFeet: PositiveIntegerSchema,
      }),
      strictStruct({
        kind: Schema.Literal("cone"),
        lengthFeet: PositiveIntegerSchema,
      }),
    ),
    onFail: DamageProjectionSchema,
    onSuccess: Schema.Literal("half_damage"),
    multiattackCount: exactOptional(PositiveIntegerSchema),
  }),
  strictStruct({
    ...ProcedureBaseFields,
    kind: Schema.Literal("multiattack"),
    dispatches: nonEmpty(
      strictStruct({
        procedureName: NonEmptyStringSchema,
        count: PositiveIntegerSchema,
      }),
    ),
  }),
  strictStruct({
    ...ProcedureBaseFields,
    kind: Schema.Literal("action_option"),
    options: nonEmpty(NonEmptyStringSchema),
  }),
  strictStruct({
    ...ProcedureBaseFields,
    kind: Schema.Literal("spellcasting"),
    ability: AbilitySchema,
    spellSaveDc: exactOptional(PositiveIntegerSchema),
    spellAttackBonus: exactOptional(SignedIntegerSchema),
    components: Schema.Union(
      strictStruct({ kind: Schema.Literal("spell_definition") }),
      strictStruct({
        kind: Schema.Literal("fixed"),
        v: Schema.Boolean,
        s: Schema.Boolean,
        m: Schema.Union(Schema.Literal(false), NonEmptyStringSchema),
      }),
    ),
    groups: nonEmpty(SpellcastingGroupProjectionSchema),
  }),
);

const NamedAbilityModifierSchema = strictStruct({
  name: AbilitySchema,
  modifier: SignedIntegerSchema,
});
const NamedSkillModifierSchema = strictStruct({
  name: SkillSchema,
  modifier: SignedIntegerSchema,
});
const VulnerabilityProjectionSchema = Schema.Union(
  strictStruct({ kind: Schema.Literal("none") }),
  strictStruct({
    kind: Schema.Literal("fixed"),
    damageTypes: nonEmpty(DamageTypeSchema),
  }),
  strictStruct({
    kind: Schema.Literal("qualified"),
    damageTypes: nonEmpty(DamageTypeSchema),
    qualifier: NonEmptyStringSchema,
  }),
);
const ResistanceProjectionSchema = Schema.Union(
  strictStruct({ kind: Schema.Literal("none") }),
  strictStruct({
    kind: Schema.Literal("fixed"),
    damageTypes: nonEmpty(DamageTypeSchema),
  }),
  strictStruct({
    kind: Schema.Literal("choose_one_from"),
    options: nonEmpty(DamageTypeSchema),
  }),
);

export const StatBlockScopedFidelityProjectionSchema = strictStruct({
  generalFacts: strictStruct({
    challengeRating: ChallengeRatingSchema,
    sizeAndSwarm: StandaloneStatBlockSizeAndSwarmSchema,
    creatureType: CreatureTypeSchema,
    creatureTypeTags: Schema.Array(NonEmptyStringSchema),
    alignment: Schema.Union(
      Schema.Literal("unaligned"),
      strictStruct({
        order: Schema.Literal(...ALIGNMENT_ORDERS),
        morality: Schema.Literal(...ALIGNMENT_MORALITIES),
      }),
    ),
    ac: strictStruct({
      kind: Schema.Literal("literal"),
      value: PositiveIntegerSchema,
      annotations: Schema.Array(NonEmptyStringSchema),
    }),
    hp: strictStruct({
      kind: Schema.Literal("literal"),
      value: PositiveIntegerSchema,
    }),
    speeds: nonEmpty(StandaloneStatBlockSpeedEntrySchema),
    abilityScores: StandaloneStatBlockAbilityScoresSchema,
    initiative: strictStruct({
      modifier: SignedIntegerSchema,
      score: PositiveIntegerSchema,
    }),
    savingThrowModifiers: Schema.Array(NamedAbilityModifierSchema),
    saveProficiencies: Schema.Array(AbilitySchema),
    skillModifiers: Schema.Array(NamedSkillModifierSchema),
    vulnerabilities: VulnerabilityProjectionSchema,
    resistances: ResistanceProjectionSchema,
    immunities: Schema.Union(
      strictStruct({ kind: Schema.Literal("none") }),
      strictStruct({
        kind: Schema.Literal("some"),
        value: CreatureImmunityListSchema,
      }),
    ),
    senses: Schema.Array(StandaloneCreatureSenseSchema),
    passivePerception: PositiveIntegerSchema,
    gear: Schema.Array(
      strictStruct({
        item: NonEmptyStringSchema,
        quantity: PositiveIntegerSchema,
      }),
    ),
    communication: StatBlockCommunicationSchema,
    legendaryActionUses: exactOptional(
      Schema.Union(
        strictStruct({
          kind: Schema.Literal("fixed"),
          uses: PositiveIntegerSchema,
        }),
        strictStruct({
          kind: Schema.Literal("lair_bonus"),
          usesOutsideLair: PositiveIntegerSchema,
          additionalUsesInLair: PositiveIntegerSchema,
        }),
      ),
    ),
  }),
  resources: Schema.Array(ResourceLimitProjectionSchema),
  entryNames: Schema.Array(NonEmptyStringSchema),
  traits: Schema.Array(CreatureTraitSchema),
  textOnlyProcedures: Schema.Array(
    strictStruct({
      section: ProcedureSectionSchema,
      name: NonEmptyStringSchema,
      description: NonEmptyStringSchema,
      reason: StatBlockTextOnlyReasonSchema,
    }),
  ),
  procedures: Schema.Array(ProcedureProjectionSchema),
});

const procedureResourceLimits = (
  procedures: readonly ProcedureProjection[],
): readonly ResourceLimitProjection[] =>
  procedures.flatMap((procedure) => [
    ...procedure.resourceLimits,
    ...Match.value(procedure).pipe(
      Match.when({ kind: "spellcasting" }, ({ groups }) =>
        groups.flatMap((group) => group.resourceLimits),
      ),
      Match.when({ kind: "textOnly" }, () => []),
      Match.when({ kind: "attack_roll" }, () => []),
      Match.when({ kind: "save" }, () => []),
      Match.when({ kind: "multiattack" }, () => []),
      Match.when({ kind: "action_option" }, () => []),
      Match.exhaustive,
    ),
  ]);

const signedNumber = (value: string): number =>
  Number(value.replace("−", "-").replace("+", ""));

const normalizedProse = (value: string): string =>
  value.replaceAll("*", "").replace(/\s+/g, " ").trim();

const normalizedIdentifier = (value: string): string =>
  value.toLowerCase().replaceAll(" ", "_");

const normalizedProcedureName = (value: string): string =>
  value.replace(
    / \((?:Recharge \d(?:–\d)?|Recharge after a Short or Long Rest|\d+\/Day)(?:; (.+))?\)$/,
    (_, qualifier: string | undefined) =>
      qualifier === undefined ? "" : ` (${qualifier})`,
  );

const isRawSection = (value: string): value is RawSection =>
  RAW_SECTIONS.some((section) => section === value);

const isAttackAbility = (ability: Ability): ability is AttackAbility =>
  ATTACK_ABILITY_NAMES.some((attackAbility) => attackAbility === ability);

const rawAttackAbilityCandidates = (
  abilityScores: Readonly<Record<Ability, number>>,
  challengeRating: ChallengeRating,
  attackBonus: number,
): readonly AttackAbility[] =>
  ATTACK_ABILITY_NAMES.filter(
    (ability) =>
      Math.floor((abilityScores[ability] - 10) / 2) +
        statBlockProficiencyBonusForChallengeRating(challengeRating) ===
      attackBonus,
  );

const attackAbilityEvidence = (
  candidates: readonly AttackAbility[],
): AttackAbilityEvidence | undefined => {
  const [first, second, ...rest] = candidates;
  if (first === undefined) return undefined;
  return second === undefined
    ? { kind: "resolved", ability: first }
    : { kind: "unresolved", candidates: [first, second, ...rest] };
};

const requireMatch = (
  value: string,
  pattern: RegExp,
  context: string,
): RegExpMatchArray => {
  const match = value.match(pattern);
  if (match === null) {
    throw new Error(`Unable to parse ${context}: ${value}`);
  }
  return match;
};

const requireLine = (
  lines: readonly string[],
  prefix: string,
  context: string,
): string => {
  const line = lines.find((candidate) => candidate.startsWith(prefix));
  if (line === undefined) {
    throw new Error(`Missing ${context} line beginning ${prefix}`);
  }
  return line;
};

const sortedStrings = <Value extends string>(
  values: readonly Value[],
): readonly Value[] =>
  [...values].sort((left, right) => left.localeCompare(right));

const sortedNonEmptyStrings = <Value extends string>(
  values: readonly Value[],
  context: string,
): ReadonlyNonEmptyArray<Value> => {
  const sorted = sortedStrings(values);
  const [first, ...rest] = sorted;
  if (first === undefined || first.length === 0) {
    throw new Error(`Expected at least one nonempty ${context}`);
  }
  if (rest.some((value) => value.length === 0)) {
    throw new Error(`Expected nonempty ${context}`);
  }
  return [first, ...rest];
};

const nonEmptyValues = <Value>(
  values: readonly Value[],
  context: string,
): ReadonlyNonEmptyArray<Value> => {
  const [first, ...rest] = values;
  if (first === undefined) throw new Error(`Expected nonempty ${context}`);
  return [first, ...rest];
};

const parsedLiteral = <Value extends string>(
  values: readonly Value[],
  candidate: string,
  context: string,
): Value => {
  const value = values.find((entry) => entry === candidate);
  if (value === undefined) {
    throw new Error(`Unsupported ${context} ${candidate}`);
  }
  return value;
};

const sortedModifiers = <Name extends string>(
  values: readonly NamedModifier<Name>[],
): readonly NamedModifier<Name>[] =>
  [...values].sort((left, right) => left.name.localeCompare(right.name));

const parseMetadata = (
  lines: readonly string[],
  context: string,
): Pick<
  ScopedGeneralFacts,
  "sizeAndSwarm" | "creatureType" | "creatureTypeTags" | "alignment"
> => {
  const metadataLine = lines.find(
    (line) => line.startsWith("*") && !line.startsWith("**"),
  );
  if (metadataLine === undefined) {
    throw new Error(`Missing ${context} creature metadata`);
  }
  const metadata = requireMatch(
    metadataLine,
    /^\*(.+?) ([A-Za-z]+)(?: \(([^)]+)\))?, (.+)\*$/,
    `${context} creature metadata`,
  );
  const sizeText = metadata[1] ?? "";
  const alignmentText = metadata[4] ?? "";
  const swarmMetadata = sizeText.match(/^([A-Za-z]+) Swarm of ([A-Za-z]+)$/);
  const authoredCreatureType = (metadata[2] ?? "").toLowerCase();
  const creatureSizeText = swarmMetadata?.[1] ?? sizeText;
  const size: SrdStatBlockRecord["statBlock"]["size"] =
    creatureSizeText.includes(" or ")
      ? (() => {
          const options = creatureSizeText
            .split(" or ")
            .map((option) =>
              parsedLiteral(SIZES, option.toLowerCase(), `${context} Size`),
            );
          const [first, second, ...rest] = options;
          if (first === undefined || second === undefined) {
            throw new Error(
              `${context} Size alternatives require at least two sizes`,
            );
          }
          return { kind: "alternatives", options: [first, second, ...rest] };
        })()
      : parsedLiteral(SIZES, creatureSizeText.toLowerCase(), `${context} Size`);
  const alignment =
    alignmentText === "Unaligned"
      ? ("unaligned" as const)
      : alignmentText === "Neutral"
        ? ({ order: "neutral", morality: "neutral" } as const)
        : (() => {
            const parts = alignmentText.toLowerCase().split(" ");
            if (parts.length !== 2) {
              throw new Error(
                `Unable to parse ${context} alignment: ${alignmentText}`,
              );
            }
            return {
              order: parsedLiteral(
                ALIGNMENT_ORDERS,
                parts[0] ?? "",
                `${context} alignment order`,
              ),
              morality: parsedLiteral(
                ALIGNMENT_MORALITIES,
                parts[1] ?? "",
                `${context} alignment morality`,
              ),
            };
          })();

  return {
    sizeAndSwarm:
      swarmMetadata?.[2] === undefined
        ? { size }
        : (size === "medium" || size === "large") &&
            swarmMetadata[2].toLowerCase() === "tiny"
          ? { size, swarm: { constituentSize: "tiny" } }
          : (() => {
              throw new Error(`Unsupported ${context} Swarm aggregate Size`);
            })(),
    creatureType:
      swarmMetadata === null
        ? parsedLiteral(
            CREATURE_TYPES,
            authoredCreatureType,
            `${context} creature type`,
          )
        : authoredCreatureType === "beasts"
          ? "beast"
          : authoredCreatureType === "undead"
            ? "undead"
            : (() => {
                throw new Error(
                  `Unsupported RAW swarm creature type ${authoredCreatureType}`,
                );
              })(),
    creatureTypeTags:
      metadata[3] === undefined ? [] : [metadata[3].toLowerCase()],
    alignment,
  };
};

const parseSpeeds = (
  lines: readonly string[],
  context: string,
): ScopedGeneralFacts["speeds"] => {
  const speeds = requireLine(lines, "**Speed**", context)
    .replace("**Speed**", "")
    .trim()
    .split(", ")
    .map((part): StandaloneStatBlockSpeedEntry => {
      const gmChoice = part.match(
        /^((?:Burrow|Climb|Fly|Swim|Walk)(?: or (?:Burrow|Climb|Fly|Swim|Walk))+)(?: )(\d+) ft\. \(GM's choice\)$/,
      );
      if (gmChoice !== null) {
        const feet = Number(gmChoice[2]);
        const alternatives = (gmChoice[1] ?? "").split(" or ").map((kind) => ({
          kind: parsedLiteral(
            SPEED_TYPES,
            kind.toLowerCase(),
            `${context} GM Speed choice`,
          ),
          feet: { kind: "literal" as const, value: feet },
        }));
        const [first, second, ...rest] = alternatives;
        if (first === undefined || second === undefined) {
          throw new Error(
            `${context} GM Speed choice requires two alternatives`,
          );
        }
        return Schema.decodeUnknownSync(StandaloneStatBlockSpeedEntrySchema)({
          kind: "gm_choice",
          alternatives: [first, second, ...rest],
        });
      }
      const speed = requireMatch(
        part,
        /^(?:(Burrow|Climb|Fly|Swim) )?(\d+) ft\.(?: \((hover|[A-Za-z]+(?: or [A-Za-z]+)* form only)\))?$/,
        `${context} Speed`,
      );
      const qualifier = speed[3];
      const kind = parsedLiteral(
        SPEED_TYPES,
        (speed[1] ?? "walk").toLowerCase(),
        `${context} Speed kind`,
      );
      const availability =
        qualifier === undefined || qualifier === "hover"
          ? {}
          : {
              availability: {
                kind: "forms_only" as const,
                forms: sortedNonEmptyStrings(
                  qualifier
                    .replace(/ form only$/, "")
                    .split(" or ")
                    .map((form) => form.toLowerCase()),
                  `${context} Speed forms`,
                ),
              },
            };
      return kind === "fly"
        ? Schema.decodeUnknownSync(StandaloneStatBlockSpeedEntrySchema)({
            kind,
            feet: { kind: "literal", value: Number(speed[2]) },
            ...(qualifier === "hover" ? { hover: true as const } : {}),
            ...availability,
          })
        : Schema.decodeUnknownSync(StandaloneStatBlockSpeedEntrySchema)({
            kind,
            feet: { kind: "literal", value: Number(speed[2]) },
            ...availability,
          });
    });
  const [first, ...rest] = speeds;
  if (first === undefined) throw new Error(`Missing ${context} Speed`);
  return [first, ...rest];
};

const parseAbilityRow = (
  lines: readonly string[],
  label: "Score" | "Save",
  context: string,
): readonly number[] => {
  const values = requireLine(lines, `| **${label}**`, context)
    .split("|")
    .slice(2, 8)
    .map((value) => signedNumber(value.trim()));
  if (values.length !== ABILITY_NAMES.length) {
    throw new Error(`Expected six ${context} ${label} values`);
  }
  return values;
};

const abilityRecord = (
  values: readonly number[],
): Readonly<Record<Ability, number>> => {
  const [str, dex, con, int, wis, cha, extra] = values;
  if (
    str === undefined ||
    dex === undefined ||
    con === undefined ||
    int === undefined ||
    wis === undefined ||
    cha === undefined ||
    extra !== undefined ||
    values.some((value) => !Number.isFinite(value))
  ) {
    throw new Error("Expected exactly six finite ability values");
  }
  return { str, dex, con, int, wis, cha };
};

const isAbility = (value: string): value is Ability =>
  ABILITY_NAMES.some((ability) => ability === value);

const parseAbilityMatrixNumber = (
  value: string,
  pattern: RegExp,
  context: string,
): number => {
  if (!pattern.test(value)) {
    throw new Error(`Invalid ${context}: ${value}`);
  }
  return signedNumber(value);
};

const parseAbilityMatrixGroup = (
  cells: readonly [string, string, string, string],
  context: string,
): AbilityMatrixFact => {
  const [rawAbility, rawScore, rawModifier, rawSaveModifier] = cells;
  const ability = rawAbility.replaceAll("*", "").toLowerCase();
  if (!isAbility(ability)) {
    throw new Error(`Unrecognized ${context} ability label: ${rawAbility}`);
  }
  return {
    ability,
    score: parseAbilityMatrixNumber(rawScore, /^\d+$/, `${context} score`),
    modifier: parseAbilityMatrixNumber(
      rawModifier,
      /^[+−-]?\d+$/,
      `${context} modifier`,
    ),
    saveModifier: parseAbilityMatrixNumber(
      rawSaveModifier,
      /^[+−-]?\d+$/,
      `${context} save modifier`,
    ),
  };
};

const parseAbilityMatrix = (
  lines: readonly string[],
  context: string,
): AbilityMatrix | undefined => {
  const rows = lines
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim()),
    )
    .filter((cells) => {
      const [firstCell, secondCell] = cells;
      return (
        ((firstCell === "STR" || firstCell === "INT") &&
          secondCell !== undefined &&
          /^\d+$/.test(secondCell)) ||
        /^(?:STR|INT) \d+$/.test(firstCell ?? "")
      );
    });
  if (rows.length === 0) return undefined;
  if (rows.length !== 2) {
    throw new Error(`Expected exactly two ${context} ability matrix rows`);
  }

  const facts = rows.flatMap((cells, rowIndex) => {
    const expandedCells = cells.flatMap((cell) => {
      const combinedAbilityScore = cell.match(
        /^(STR|DEX|CON|INT|WIS|CHA) (\d+)$/,
      );
      return combinedAbilityScore === null
        ? [cell]
        : [combinedAbilityScore[1] ?? "", combinedAbilityScore[2] ?? ""];
    });
    if (
      expandedCells.length !== 12 ||
      expandedCells.some((cell) => cell.length === 0)
    ) {
      throw new Error(
        `Expected ${context} ability matrix row ${rowIndex + 1} to contain exactly twelve nonempty cells`,
      );
    }
    const [
      ability1,
      score1,
      modifier1,
      saveModifier1,
      ability2,
      score2,
      modifier2,
      saveModifier2,
      ability3,
      score3,
      modifier3,
      saveModifier3,
    ] = expandedCells;
    if (
      ability1 === undefined ||
      score1 === undefined ||
      modifier1 === undefined ||
      saveModifier1 === undefined ||
      ability2 === undefined ||
      score2 === undefined ||
      modifier2 === undefined ||
      saveModifier2 === undefined ||
      ability3 === undefined ||
      score3 === undefined ||
      modifier3 === undefined ||
      saveModifier3 === undefined
    ) {
      throw new Error(`Incomplete ${context} ability matrix row`);
    }
    return [
      parseAbilityMatrixGroup(
        [ability1, score1, modifier1, saveModifier1],
        context,
      ),
      parseAbilityMatrixGroup(
        [ability2, score2, modifier2, saveModifier2],
        context,
      ),
      parseAbilityMatrixGroup(
        [ability3, score3, modifier3, saveModifier3],
        context,
      ),
    ];
  });
  const [str, dex, con, int, wis, cha, extra] = facts;
  if (
    str === undefined ||
    dex === undefined ||
    con === undefined ||
    int === undefined ||
    wis === undefined ||
    cha === undefined ||
    extra !== undefined ||
    facts.some((fact, index) => fact.ability !== ABILITY_NAMES[index])
  ) {
    throw new Error(
      `Expected ${context} ability matrix labels in STR, DEX, CON, INT, WIS, CHA order`,
    );
  }
  return [str, dex, con, int, wis, cha];
};

const parseAbilityScores = (
  lines: readonly string[],
  context: string,
): Readonly<Record<Ability, number>> => {
  if (lines.some((line) => line.startsWith("| **Score**"))) {
    return abilityRecord(parseAbilityRow(lines, "Score", context));
  }
  const abilityMatrix = parseAbilityMatrix(lines, context);
  if (abilityMatrix !== undefined) {
    return abilityRecord(abilityMatrix.map(({ score }) => score));
  }
  const scoreCells = lines
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim()),
    )
    .find(
      (cells) =>
        cells.length === ABILITY_NAMES.length &&
        cells.every((cell) =>
          /^\d+ \([+−-]?\d+\)(?: Save [ +−-]?\d+)?$/.test(cell),
        ),
    );
  if (scoreCells === undefined) {
    throw new Error(`Expected six ${context} ability scores`);
  }
  return abilityRecord(
    scoreCells.map((cell) => Number(requireMatch(cell, /^(\d+)/, context)[1])),
  );
};

const parseSavingThrowModifiers = (
  lines: readonly string[],
  context: string,
): readonly NamedModifier<Ability>[] => {
  if (lines.some((line) => line.startsWith("| **Save**"))) {
    const saveValues = abilityRecord(parseAbilityRow(lines, "Save", context));
    return sortedModifiers(
      ABILITY_NAMES.map((ability) => ({
        name: ability,
        modifier: saveValues[ability],
      })),
    );
  }
  const abilityMatrix = parseAbilityMatrix(lines, context);
  if (abilityMatrix !== undefined) {
    return sortedModifiers(
      abilityMatrix.map(({ ability, saveModifier }) => ({
        name: ability,
        modifier: saveModifier,
      })),
    );
  }
  const combinedCells = lines
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim()),
    )
    .find(
      (cells) =>
        cells.length === ABILITY_NAMES.length &&
        cells.every((cell) => /^\d+ \([+−-]?\d+\) Save [ +−-]?\d+$/.test(cell)),
    );
  if (combinedCells !== undefined) {
    const saveValues = abilityRecord(
      combinedCells.map((cell) => {
        const match = requireMatch(
          cell,
          / Save ([+−-]?\d+)$/,
          `${context} Save`,
        );
        const value = match[1];
        if (value === undefined) {
          throw new Error(`Missing ${context} Save modifier`);
        }
        return signedNumber(value);
      }),
    );
    return sortedModifiers(
      ABILITY_NAMES.map((ability) => ({
        name: ability,
        modifier: saveValues[ability],
      })),
    );
  }
  const line = lines.find((candidate) => candidate.startsWith("**Saves**"));
  if (line === undefined) return [];
  return sortedModifiers(
    line
      .replace("**Saves**", "")
      .trim()
      .split(", ")
      .map((part) => {
        const modifier = requireMatch(
          part,
          /^(STR|DEX|CON|INT|WIS|CHA) ([+−-]?\d+)(?: \([^)]*\))?$/,
          `${context} Saves`,
        );
        return {
          name: parsedLiteral(
            ABILITY_NAMES,
            (modifier[1] ?? "").toLowerCase(),
            `${context} Save ability`,
          ),
          modifier: signedNumber(modifier[2] ?? ""),
        };
      }),
  );
};

const parseNamedModifiers = (
  lines: readonly string[],
  label: "Skills",
): readonly NamedModifier<Skill>[] => {
  const line = lines.find((candidate) => candidate.startsWith(`**${label}**`));
  if (line === undefined) {
    return [];
  }
  return sortedModifiers(
    line
      .replace(`**${label}**`, "")
      .trim()
      .split(", ")
      .map((part) => {
        const modifier = requireMatch(part, /^(.+?) ([+−-]?\d+)$/, label);
        return {
          name: parsedLiteral(
            SKILLS,
            normalizedIdentifier(modifier[1] ?? ""),
            "Skill",
          ),
          modifier: signedNumber(modifier[2] ?? ""),
        };
      }),
  );
};

const parseVulnerabilities = (
  lines: readonly string[],
): ScopedGeneralFacts["vulnerabilities"] => {
  const line = lines.find((candidate) =>
    candidate.startsWith("**Vulnerabilities**"),
  );
  if (line === undefined) return { kind: "none" };
  const value = line.replace("**Vulnerabilities**", "").trim();
  const qualified = value.match(/^([A-Z][a-z]+) damage (from .+)$/);
  return qualified === null
    ? {
        kind: "fixed",
        damageTypes: sortedNonEmptyStrings(
          value
            .split(", ")
            .map((item) =>
              parsedLiteral(
                DAMAGE_TYPES,
                item.toLowerCase(),
                "vulnerability damage type",
              ),
            ),
          "vulnerability damage type",
        ),
      }
    : {
        kind: "qualified",
        damageTypes: sortedNonEmptyStrings(
          [
            parsedLiteral(
              DAMAGE_TYPES,
              (qualified[1] ?? "").toLowerCase(),
              "qualified vulnerability damage type",
            ),
          ],
          "qualified vulnerability damage type",
        ),
        qualifier: qualified[2] ?? "",
      };
};

const parseResistances = (lines: readonly string[]): ResistanceProjection => {
  const line = lines.find((candidate) =>
    candidate.startsWith("**Resistances**"),
  );
  if (line === undefined) return { kind: "none" };
  const value = line.replace("**Resistances**", "").trim();
  const chosen = value.match(/^Damage type chosen for .+$/);
  const chosenOptions =
    chosen === null
      ? []
      : (requireMatch(
          normalizedProse(lines.join(" ")),
          /one of the following damage types [^:]*: ([A-Za-z, ]+)\./,
          "chosen resistance options",
        )[1]
          ?.split(", ")
          .map((damageType) =>
            parsedLiteral(
              DAMAGE_TYPES,
              damageType.replace(/^or /, "").toLowerCase(),
              "chosen resistance damage type",
            ),
          ) ?? []);
  return chosen === null
    ? {
        kind: "fixed",
        damageTypes: sortedNonEmptyStrings(
          value
            .split(", ")
            .map((damageType) =>
              parsedLiteral(
                DAMAGE_TYPES,
                damageType.toLowerCase(),
                "resistance damage type",
              ),
            ),
          "resistance damage type",
        ),
      }
    : {
        kind: "choose_one_from",
        options: sortedNonEmptyStrings(
          chosenOptions,
          "chosen resistance damage type",
        ),
      };
};

const parseImmunities = (
  lines: readonly string[],
): ScopedGeneralFacts["immunities"] => {
  const line = lines.find((candidate) =>
    candidate.startsWith("**Immunities**"),
  );
  if (line === undefined) {
    return { kind: "none" };
  }
  const [firstGroup = "", explicitConditions] = line
    .replace("**Immunities**", "")
    .trim()
    .split("; ");
  const parseDamageTypes = (value: string): readonly DamageType[] =>
    value === ""
      ? []
      : sortedStrings(
          value
            .split(", ")
            .map((item) =>
              parsedLiteral(
                DAMAGE_TYPES,
                item.toLowerCase(),
                "immunity damage type",
              ),
            ),
        );
  const parseConditions = (value: string) => {
    const conditions: Condition[] = [];
    const qualifiedConditions: {
      readonly condition: Condition;
      readonly qualifier: string;
    }[] = [];
    for (const item of value === "" ? [] : value.split(", ")) {
      const qualified = item.match(/^([A-Za-z]+) \((.+)\)$/);
      if (qualified === null) {
        conditions.push(
          parsedLiteral(CONDITIONS, item.toLowerCase(), "immunity condition"),
        );
      } else {
        qualifiedConditions.push({
          condition: parsedLiteral(
            CONDITIONS,
            (qualified[1] ?? "").toLowerCase(),
            "qualified immunity condition",
          ),
          qualifier: qualified[2] ?? "",
        });
      }
    }
    return {
      conditions: sortedStrings(conditions),
      qualifiedConditions: [...qualifiedConditions].sort((left, right) =>
        left.condition.localeCompare(right.condition),
      ),
    };
  };
  const conditionNames = new Set<string>(CONDITIONS);
  const firstGroupIsConditions =
    explicitConditions === undefined &&
    firstGroup
      .split(", ")
      .map((item) => item.match(/^([A-Za-z]+)/)?.[1]?.toLowerCase() ?? "")
      .every((value) => conditionNames.has(value));
  const firstConditionValues = parseConditions(
    firstGroupIsConditions ? firstGroup : "",
  );
  const explicitConditionValues = parseConditions(explicitConditions ?? "");
  const damageTypes = firstGroupIsConditions
    ? []
    : parseDamageTypes(firstGroup);
  const conditions = firstGroupIsConditions
    ? firstConditionValues.conditions
    : explicitConditionValues.conditions;
  const qualifiedConditions = firstGroupIsConditions
    ? firstConditionValues.qualifiedConditions
    : explicitConditionValues.qualifiedConditions;
  return {
    kind: "some",
    value: Schema.decodeUnknownSync(CreatureImmunityListSchema)({
      ...(damageTypes.length === 0 ? {} : { damageTypes }),
      ...(conditions.length === 0 ? {} : { conditions }),
      ...(qualifiedConditions.length === 0 ? {} : { qualifiedConditions }),
    }),
  };
};

const parseSenses = (
  lines: readonly string[],
  context: string,
): Pick<ScopedGeneralFacts, "senses" | "passivePerception"> => {
  const line = requireLine(lines, "**Senses**", context)
    .replace("**Senses**", "")
    .trim();
  const passive = requireMatch(
    line,
    /Passive Perception (\d+)/,
    `${context} Passive Perception`,
  );
  const sensesText = line.replace(/;? ?Passive Perception \d+/, "");
  const senses =
    sensesText === ""
      ? []
      : sensesText.split(", ").map((part): StandaloneCreatureSense => {
          const sense = requireMatch(
            part,
            /^(Blindsight|Darkvision|Tremorsense|Truesight) (\d+) ft\.(?: \((.+)\))?$/,
            `${context} Senses`,
          );
          const kind = parsedLiteral(
            ["darkvision", "blindsight", "tremorsense", "truesight"] as const,
            (sense[1] ?? "").toLowerCase(),
            `${context} Sense kind`,
          );
          const qualifier = sense[3];
          if (qualifier !== undefined) {
            if (
              kind !== "darkvision" ||
              qualifier !== "unimpeded by magical Darkness"
            ) {
              throw new Error(`Unsupported ${context} ${kind} qualifier`);
            }
            return {
              kind,
              rangeFeet: Number(sense[2]),
              qualifier: "unimpeded_by_magical_darkness",
            };
          }
          return { kind, rangeFeet: Number(sense[2]) };
        });
  return {
    senses: [...senses].sort((left, right) =>
      left.kind.localeCompare(right.kind),
    ),
    passivePerception: Number(passive[1]),
  };
};

const projectedGearItem = (item: string, quantity: number): string =>
  quantity > 1 && item.endsWith("s") ? item.slice(0, -1) : item;

const parseGear = (lines: readonly string[]): ScopedGeneralFacts["gear"] => {
  const line = lines.find((candidate) => candidate.startsWith("**Gear**"));
  if (line === undefined) {
    return [];
  }
  return line
    .replace("**Gear**", "")
    .trim()
    .split(", ")
    .map((part) => {
      const gear = requireMatch(part, /^(.*?)(?: \((\d+)\))?$/, "Gear");
      const quantity = Number(gear[2] ?? 1);
      const item = gear[1] ?? "";
      return {
        item: projectedGearItem(item, quantity),
        quantity,
      };
    })
    .sort((left, right) => left.item.localeCompare(right.item));
};

const NUMBER_WORDS = [
  ["one", 1],
  ["two", 2],
  ["three", 3],
  ["four", 4],
  ["five", 5],
] as const;

const parseLanguageSet = (value: string): unknown => {
  if (value === "All") return { kind: "all" };
  const additional = value.match(
    /^(.+) plus (one|two|three|four|five) other languages?$/,
  );
  const languages = nonEmptyValues(
    (additional?.[1] ?? value)
      .split(/, (?![^()]*\))| and /)
      .map((language) => language.replace(/^and /, "")),
    "language set",
  );
  if (additional === null) return { kind: "named", languages };
  const additionalLanguageCount = NUMBER_WORDS.find(
    ([word]) => word === additional[2],
  )?.[1];
  if (additionalLanguageCount === undefined) {
    throw new Error(`Unsupported additional language count ${additional[2]}`);
  }
  return {
    kind: "named_plus_other_languages",
    languages,
    additionalLanguages: additionalLanguageCount,
  };
};

const parseCommunicationCandidate = (
  lines: readonly string[],
  context: string,
): unknown => {
  const text = requireLine(lines, "**Languages**", context)
    .replace("**Languages**", "")
    .trim();
  if (text === "None") {
    return { kind: "none" };
  }
  const telepathyText = text.match(/; telepathy (\d+) ft\.$/);
  const withoutTelepathy = text.replace(/; telepathy \d+ ft\.$/, "");
  const telepathy =
    telepathyText?.[1] === undefined
      ? {}
      : { telepathy: { rangeFeet: Number(telepathyText[1]) } };
  const understoodOnly = withoutTelepathy.match(
    /^Understands (.+) but can't speak$/,
  );
  if (understoodOnly !== null) {
    return {
      kind: "understood_but_cannot_speak",
      languages: parseLanguageSet(understoodOnly[1] ?? ""),
      ...telepathy,
    };
  }
  const [spoken = "", qualifier] = withoutTelepathy.split("; ");
  if (telepathyText !== null && qualifier === undefined) {
    return {
      kind: "spoken_and_understood",
      languages: parseLanguageSet(spoken),
      ...telepathy,
    };
  }
  if (qualifier?.startsWith("telepathy ") === true) {
    const telepathy = requireMatch(
      qualifier,
      /^telepathy (\d+) ft\.(?: \((doesn't allow the receiving creature to respond telepathically|works only with creatures that understand (.+))\))?$/,
      `${context} telepathy`,
    );
    return {
      kind: "spoken_and_understood",
      languages: parseLanguageSet(spoken),
      telepathy: {
        rangeFeet: Number(telepathy[1]),
        ...(telepathy[3] === undefined
          ? {}
          : {
              requiresLanguageUnderstanding: parseLanguageSet(telepathy[3]),
            }),
        ...(telepathy[2]?.startsWith("doesn't allow") === true
          ? { response: "receiving_creature_cannot_respond" as const }
          : {}),
      },
    };
  }
  if (qualifier?.startsWith("understands ") === true) {
    const understood = requireMatch(
      qualifier,
      /^understands (.+) but can't speak them$/,
      `${context} understood languages`,
    );
    return {
      kind: "spoken_and_understood",
      languages: parseLanguageSet(spoken),
      additionallyUnderstoodButCannotSpeak: {
        kind: "named",
        languages: nonEmptyValues(
          (understood[1] ?? "").split(/, (?:and )?| and /),
          `${context} understood languages`,
        ),
      },
    };
  }
  if (qualifier !== undefined) {
    throw new Error(`Unsupported ${context} Languages shape: ${text}`);
  }
  return { kind: "spoken_and_understood", languages: parseLanguageSet(spoken) };
};

const parseCommunication = (
  lines: readonly string[],
  context: string,
): StatBlockCommunication =>
  Schema.decodeUnknownSync(StatBlockCommunicationSchema)(
    parseCommunicationCandidate(lines, context),
  );

const parseRawGeneralFacts = (
  name: string,
  lines: readonly string[],
): ScopedGeneralFacts => {
  const ac = requireMatch(
    requireLine(lines, "**AC**", name),
    /\*\*AC\*\* (\d+)(?: \(([^)]+)\))?/,
    `${name} AC`,
  );
  const hp = requireMatch(
    requireLine(lines, "**HP**", name),
    /\*\*HP\*\* (\d+)/,
    `${name} HP`,
  );
  const initiativeLine = lines.find((line) => line.includes("**Initiative**"));
  if (initiativeLine === undefined) {
    throw new Error(`Missing ${name} Initiative`);
  }
  const initiative = requireMatch(
    initiativeLine,
    /\*\*Initiative\*\* ([+−-]?\d+) \((\d+)\)/,
    `${name} Initiative`,
  );
  const challengeRatingMatch = requireMatch(
    requireLine(lines, "**CR**", name),
    /\*\*CR\*\* (\d+)(?:\/(\d+))?/,
    `${name} CR`,
  );
  const challengeRating =
    Number(challengeRatingMatch[1]) / Number(challengeRatingMatch[2] ?? 1);
  if (!isChallengeRating(challengeRating)) {
    throw new Error(`Unsupported ${name} Challenge Rating ${challengeRating}`);
  }

  return {
    challengeRating,
    ...parseMetadata(lines, name),
    ac: {
      kind: "literal",
      value: Number(ac[1]),
      annotations: ac[2] === undefined ? [] : [ac[2]],
    },
    hp: { kind: "literal", value: Number(hp[1]) },
    speeds: parseSpeeds(lines, name),
    abilityScores: parseAbilityScores(lines, name),
    initiative: {
      modifier: signedNumber(initiative[1] ?? ""),
      score: Number(initiative[2]),
    },
    savingThrowModifiers: parseSavingThrowModifiers(lines, name),
    saveProficiencies: [],
    skillModifiers: parseNamedModifiers(lines, "Skills"),
    vulnerabilities: parseVulnerabilities(lines),
    resistances: parseResistances(lines),
    immunities: parseImmunities(lines),
    ...parseSenses(lines, name),
    gear: parseGear(lines),
    communication: parseCommunication(lines, name),
  };
};

const parseRawEntries = (lines: readonly string[]): readonly RawEntry[] => {
  const entries: RawEntry[] = [];
  let section: RawSection | undefined;
  let current:
    | { readonly section: RawSection; readonly name: string; parts: string[] }
    | undefined;
  const flush = (): void => {
    if (current !== undefined) {
      entries.push({
        section: current.section,
        name: current.name,
        description: normalizedProse(current.parts.join(" ")),
      });
      current = undefined;
    }
  };

  for (const line of lines) {
    const heading = line.match(
      /^#{3,4} (Traits|Actions|Bonus Actions|Reactions|Legendary Actions)$/,
    );
    if (heading !== null) {
      flush();
      const candidateSection = heading[1] ?? "";
      if (!isRawSection(candidateSection)) {
        throw new Error(`Unsupported RAW section ${candidateSection}`);
      }
      section = candidateSection;
      continue;
    }
    const entry = line.match(/^\*{2,3}(.+?)\.\*{2,3}\s*(.*)$/);
    if (entry !== null && section !== undefined) {
      flush();
      current = {
        section,
        name: entry[1] ?? "",
        parts: [entry[2] ?? ""],
      };
      continue;
    }
    if (current !== undefined && !line.startsWith("*Legendary Action Uses:")) {
      current.parts.push(line);
    }
  }
  flush();
  return entries;
};

const parseRawTraitEffect = (
  description: string,
): StatBlockScopedFidelityProjection["traits"][number]["effect"] =>
  /^The .+ has Advantage on (?:an )?attack rolls? against a creature if at least one of the .+'s allies is within 5 feet of the creature and the ally doesn't have the Incapacitated condition\.$/.test(
    description,
  )
    ? {
        kind: "attack_roll_advantage_when_non_incapacitated_ally_within_5_feet_of_target",
      }
    : undefined;

const rawEntryName = (entry: RawEntry): string =>
  Match.value(entry.section).pipe(
    Match.when("Traits", (section) => `${section}/${entry.name}`),
    Match.when(
      "Actions",
      (section) => `${section}/${normalizedProcedureName(entry.name)}`,
    ),
    Match.when(
      "Bonus Actions",
      (section) => `${section}/${normalizedProcedureName(entry.name)}`,
    ),
    Match.when(
      "Reactions",
      (section) => `${section}/${normalizedProcedureName(entry.name)}`,
    ),
    Match.when(
      "Legendary Actions",
      (section) => `${section}/${normalizedProcedureName(entry.name)}`,
    ),
    Match.exhaustive,
  );

const rawTraitEvidence = (
  entry: RawEntry,
): StatBlockScopedFidelityProjection["traits"] =>
  Match.value(entry.section).pipe(
    Match.when("Traits", () => {
      const effect = parseRawTraitEffect(entry.description);
      return [
        Schema.decodeUnknownSync(CreatureTraitSchema)({
          name: entry.name,
          description: entry.description,
          ...(effect === undefined ? {} : { effect }),
        }),
      ];
    }),
    Match.when("Actions", () => []),
    Match.when("Bonus Actions", () => []),
    Match.when("Reactions", () => []),
    Match.when("Legendary Actions", () => []),
    Match.exhaustive,
  );

const projectRawTextOnlyProcedureEvidence = (
  procedure: ProcedureProjection,
): StatBlockScopedFidelityProjection["textOnlyProcedures"] =>
  Match.value(procedure).pipe(
    Match.when({ kind: "textOnly" }, (textOnly) => [
      {
        section: textOnly.section,
        name: textOnly.name,
        description: textOnly.description,
        reason: textOnly.reason,
      },
    ]),
    Match.when({ kind: "attack_roll" }, () => []),
    Match.when({ kind: "save" }, () => []),
    Match.when({ kind: "multiattack" }, () => []),
    Match.when({ kind: "action_option" }, () => []),
    Match.when({ kind: "spellcasting" }, () => []),
    Match.exhaustive,
  );

const parsedAbility = (value: string, context: string): Ability => {
  const normalized = value.slice(0, 3).toLowerCase();
  const ability = ABILITY_NAMES.find((candidate) => candidate === normalized);
  if (ability === undefined) {
    throw new Error(`Unsupported ${context} ability ${value}`);
  }
  return ability;
};

const parseDamage = (
  value: string,
  context: string,
): DamageProjection | undefined => {
  const match = value.match(
    /^(\d+)(?: \((\d+)d(\d+)(?: ([+−-]) (\d+))?\))? ([A-Z][a-z]+) damage$/,
  );
  if (match === null) return undefined;
  const flat =
    match[5] === undefined
      ? {}
      : {
          flat:
            Number(match[5]) * (match[4] === "−" || match[4] === "-" ? -1 : 1),
        };
  const damageTypeText = match[6];
  if (damageTypeText === undefined) {
    throw new Error(`Unable to parse ${context} damage type: ${value}`);
  }
  const staticDamage = Number(match[1]);
  const amount: DamageAmountProjection =
    match[2] === undefined || match[3] === undefined
      ? { kind: "fixed", static: staticDamage }
      : {
          kind: "fixed",
          static: staticDamage,
          expr: {
            dice: Number(match[2]),
            dieSize: Number(match[3]),
            ...flat,
          },
        };
  return {
    kind: "damage",
    damageType: parsedLiteral(
      DAMAGE_TYPES,
      damageTypeText.toLowerCase(),
      `${context} damage type`,
    ),
    amount,
  };
};

const parseRawResourceLimits = (
  name: string,
): readonly ResourceLimitProjection[] => {
  if (/\(Recharge after a Short or Long Rest\)$/.test(name)) {
    return [
      {
        kind: "recharge_after_rest",
        rest: "short_or_long",
        ownership: "shared",
      },
    ];
  }
  const recharge = name.match(/\(Recharge (\d)(?:–\d)?\)$/);
  if (recharge !== null) {
    return [
      {
        kind: "recharge",
        minimumRoll: Number(recharge[1]),
        ownership: "shared",
      },
    ];
  }
  const daily = name.match(/\((\d+)\/Day(?:; .+)?\)$/);
  return daily === null
    ? []
    : [
        {
          kind: "daily",
          uses: Number(daily[1]),
          ownership: "shared",
        },
      ];
};

const parseAmmunitionByWeapon = (
  equipmentSource: string,
): ReadonlyMap<string, string> =>
  new Map(
    equipmentSource.split(/\r?\n/).flatMap((line) => {
      const weapon = line.match(
        /^\| ([^|]+?)\s+\|[^|]*\|[^|]*Ammunition \(Range [^;]+; ([^)]+)\)/,
      );
      return weapon?.[1] === undefined || weapon[2] === undefined
        ? []
        : [[weapon[1].trim(), weapon[2].toLowerCase()] as const];
    }),
  );

const parseSimpleAttack = (
  entry: RawEntry,
  generalFacts: Pick<
    ScopedGeneralFacts,
    "abilityScores" | "challengeRating" | "gear"
  >,
  ammunitionByWeapon: ReadonlyMap<string, string>,
): ProcedureProjection | undefined => {
  const section = procedureSection(entry.section);
  if (section === undefined) return undefined;
  const match = entry.description.match(
    /^(Melee|Ranged) Attack Roll: ([+−-]\d+)(?: to hit)?, (?:(?:reach (\d+) (?:ft|feet)\.)|(?:range (\d+)(?:\/(\d+))? (?:ft|feet)\.)) Hit: (.+)\.$/,
  );
  if (match === null) return undefined;
  const hit = match[6] ?? "";
  const damageTexts = Array.from(
    hit.matchAll(
      /(\d+)(?: \((\d+)d(\d+)(?: ([+−-]) (\d+))?\))? ([A-Z][a-z]+) damage/g,
    ),
    (damage) => damage[0],
  );
  const damages = damageTexts.map((damage) =>
    parseDamage(damage, `${entry.name} Hit`),
  );
  if (damages.some((damage) => damage === undefined)) return undefined;
  const parsedDamages = damages.filter(
    (damage): damage is DamageProjection => damage !== undefined,
  );
  if (parsedDamages.length === 0) return undefined;
  const advantageConditional =
    /if (?:the attack roll|the [A-Za-z ]+) had Advantage(?: on the attack roll)?$/i.test(
      hit,
    );
  const totalDamageAlternative = advantageConditional && hit.includes(", or ");
  const [baseDamage, totalDamage] = parsedDamages;
  const baseAmount = baseDamage?.amount;
  const totalAmount = totalDamage?.amount;
  const alternativeBonus =
    totalDamageAlternative &&
    parsedDamages.length === 2 &&
    baseDamage !== undefined &&
    totalDamage !== undefined &&
    baseDamage.damageType === totalDamage.damageType &&
    baseAmount !== undefined &&
    totalAmount !== undefined &&
    "expr" in baseAmount &&
    "expr" in totalAmount &&
    baseAmount.expr.dieSize === totalAmount.expr.dieSize &&
    totalAmount.expr.dice > baseAmount.expr.dice &&
    totalAmount.static > baseAmount.static
      ? {
          kind: "conditional_bonus_damage" as const,
          damageType: totalDamage.damageType,
          amount: {
            kind: "fixed" as const,
            static: totalAmount.static - baseAmount.static,
            expr: {
              dice: totalAmount.expr.dice - baseAmount.expr.dice,
              dieSize: totalAmount.expr.dieSize,
              ...((totalAmount.expr.flat ?? 0) - (baseAmount.expr.flat ?? 0) ===
              0
                ? {}
                : {
                    flat:
                      (totalAmount.expr.flat ?? 0) -
                      (baseAmount.expr.flat ?? 0),
                  }),
            },
          },
          when: "attack_roll_had_advantage" as const,
        }
      : undefined;
  const projectedOnHit: readonly AttackEffectProjection[] | undefined =
    totalDamageAlternative
      ? baseDamage === undefined || alternativeBonus === undefined
        ? undefined
        : [baseDamage, alternativeBonus]
      : parsedDamages.map((damage, index) =>
          advantageConditional && index === parsedDamages.length - 1
            ? {
                ...damage,
                kind: "conditional_bonus_damage",
                when: "attack_roll_had_advantage",
              }
            : damage,
        );
  if (projectedOnHit === undefined) return undefined;
  const onHit: AttackEffectProjection[] = [...projectedOnHit];
  const sizeCondition = hit.match(
    /If the target is a (Tiny|Small|Medium|Large|Huge|Gargantuan) or smaller creature, it has the ([A-Za-z]+) condition/,
  );
  if (sizeCondition?.[1] !== undefined && sizeCondition[2] !== undefined) {
    onHit.push({
      kind: "apply_condition_if_target_size_at_most",
      maxCreatureSize: parsedLiteral(
        SIZES,
        sizeCondition[1].toLowerCase(),
        `${entry.name} target Size`,
      ),
      condition: parsedLiteral(
        CONDITIONS,
        sizeCondition[2].toLowerCase(),
        `${entry.name} condition`,
      ),
    });
  }
  const targetTurnCondition = hit.match(
    /(?:and )?the target has the ([A-Za-z]+) condition until the end of its next turn$/,
  );
  if (targetTurnCondition?.[1] !== undefined) {
    onHit.push({
      kind: "apply_condition",
      condition: parsedLiteral(
        CONDITIONS,
        targetTurnCondition[1].toLowerCase(),
        `${entry.name} condition`,
      ),
      expiresAt: "target_next_turn_end",
    });
  }
  const sourceTurnCondition = hit.match(
    /, and the target has the ([A-Za-z]+) condition until the end of the [A-Za-z]+(?: [A-Za-z]+)*'s next turn$/,
  );
  if (sourceTurnCondition?.[1] !== undefined) {
    onHit.push({
      kind: "apply_condition",
      condition: parsedLiteral(
        CONDITIONS,
        sourceTurnCondition[1].toLowerCase(),
        `${entry.name} condition`,
      ),
      expiresAt: "source_next_turn_end",
    });
  }
  const residual = hit
    .replace(
      /(\d+)(?: \((\d+)d(\d+)(?: ([+−-]) (\d+))?\))? ([A-Z][a-z]+) damage/g,
      "",
    )
    .replace(
      /If the target is a (?:Tiny|Small|Medium|Large|Huge|Gargantuan) or smaller creature, it has the [A-Za-z]+ condition/,
      "",
    )
    .replace(
      /(?:and )?the target has the [A-Za-z]+ condition until the end of its next turn/,
      "",
    )
    .replace(
      /, and the target has the [A-Za-z]+ condition until the end of the [A-Za-z]+(?: [A-Za-z]+)*'s next turn/,
      "",
    )
    .replace(
      /if (?:the attack roll|the [A-Za-z ]+) had Advantage(?: on the attack roll)?/i,
      "",
    )
    .replace(/\bor\b/gi, "")
    .replace(/\bplus\b/gi, "")
    .replace(/[\s,.]/g, "");
  if (residual !== "") return undefined;
  const attackType = match[1]?.toLowerCase();
  if (attackType !== "melee" && attackType !== "ranged") {
    throw new Error(`Unsupported ${entry.name} attack type ${match[1] ?? ""}`);
  }
  const attackAbility = attackAbilityEvidence(
    rawAttackAbilityCandidates(
      generalFacts.abilityScores,
      generalFacts.challengeRating,
      signedNumber(match[2] ?? ""),
    ),
  );
  if (attackAbility === undefined) return undefined;
  const procedureName = normalizedProcedureName(entry.name);
  const ammunition = generalFacts.gear.some(
    ({ item }) => item === procedureName,
  )
    ? ammunitionByWeapon.get(procedureName)
    : undefined;
  const commonAttack = {
    section,
    name: procedureName,
    kind: "attack_roll" as const,
    attackBonus: signedNumber(match[2] ?? ""),
    attackAbilityEvidence: attackAbility,
    onHit: nonEmptyValues(onHit, `${entry.name} attack effects`),
    resourceLimits: parseRawResourceLimits(entry.name),
  };
  return attackType === "melee"
    ? {
        ...commonAttack,
        attackType,
        reachFeet: Number(match[3]),
      }
    : {
        ...commonAttack,
        attackType,
        rangeFeet: {
          normal: Number(match[4]),
          long: Number(match[5] ?? match[4]),
        },
        ...(ammunition === undefined ? {} : { ammunition }),
      };
};

const parseSimpleSave = (entry: RawEntry): ProcedureProjection | undefined => {
  const section = procedureSection(entry.section);
  if (section === undefined) return undefined;
  const line = entry.description.match(
    /^(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) Saving Throw: DC (\d+), each creature in an? (\d+)-foot-long, (\d+)-foot-wide Line\. Failure: (.+)\. Success: Half damage\.$/,
  );
  const cone = entry.description.match(
    /^(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) Saving Throw: DC (\d+), each creature in a (\d+)-foot Cone\. Failure: (.+)\. Success: Half damage\.$/,
  );
  const match = line ?? cone;
  if (match === null) return undefined;
  const onFail = parseDamage(
    match[line === null ? 4 : 5] ?? "",
    `${entry.name} Failure`,
  );
  if (onFail === undefined) return undefined;
  return {
    section,
    name: normalizedProcedureName(entry.name),
    kind: "save",
    ability: parsedAbility(match[1] ?? "", entry.name),
    dc: Number(match[2]),
    area:
      line === null
        ? { kind: "cone", lengthFeet: Number(match[3]) }
        : {
            kind: "line",
            lengthFeet: Number(match[3]),
            widthFeet: Number(match[4]),
          },
    onFail,
    onSuccess: "half_damage",
    resourceLimits: parseRawResourceLimits(entry.name),
  };
};

const parseSimpleMultiattack = (
  entry: RawEntry,
): ProcedureProjection | undefined => {
  const section = procedureSection(entry.section);
  if (section === undefined) return undefined;
  if (entry.description.includes(",")) return undefined;
  const pair = entry.description.match(
    /^The .+ makes (one|two|three) (.+?) attacks? and (one|two|three) (.+?) attacks?\.$/,
  );
  if (pair !== null) {
    const firstCount = NUMBER_WORDS.find(([word]) => word === pair[1])?.[1];
    const secondCount = NUMBER_WORDS.find(([word]) => word === pair[3])?.[1];
    if (
      firstCount === undefined ||
      secondCount === undefined ||
      pair[2] === undefined ||
      pair[4] === undefined
    ) {
      throw new Error(`Unable to parse ${entry.name} dispatches`);
    }
    return {
      section,
      name: normalizedProcedureName(entry.name),
      kind: "multiattack",
      dispatches: [
        { procedureName: pair[2], count: firstCount },
        { procedureName: pair[4], count: secondCount },
      ],
      resourceLimits: parseRawResourceLimits(entry.name),
    };
  }
  const match = entry.description.match(
    /^The .+ makes (one|two|three) (.+) attacks\.$/,
  );
  if (match === null || match[2]?.includes(" or ") === true) return undefined;
  const count = NUMBER_WORDS.find(([word]) => word === match[1])?.[1];
  if (count === undefined || match[2] === undefined) {
    throw new Error(`Unable to parse ${entry.name} dispatch`);
  }
  return {
    section,
    name: normalizedProcedureName(entry.name),
    kind: "multiattack",
    dispatches: [{ procedureName: match[2], count }],
    resourceLimits: parseRawResourceLimits(entry.name),
  };
};

const splitOutsideParentheses = (value: string): readonly string[] => {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    const isAlternative = value.slice(index, index + 4) === " or ";
    if ((character === "," || isAlternative) && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + (isAlternative ? 4 : 1);
      if (isAlternative) index += 3;
    }
  }
  parts.push(value.slice(start).trim());
  return parts.filter((part) => part.length > 0);
};

const parseSpell = (value: string): SpellProjection => {
  const annotation = value.match(/^(.+?) \((.+)\)$/);
  const name = annotation?.[1] ?? value;
  const detail = annotation?.[2];
  const level = detail?.match(/^level (\d+) version$/);
  return {
    spellId: normalizedIdentifier(name),
    ...(level === null || level === undefined
      ? detail === undefined
        ? {}
        : { restriction: detail }
      : { castAtLevel: Number(level[1]) }),
  };
};

const parseSpellcasting = (
  entry: RawEntry,
): ProcedureProjection | undefined => {
  const section = procedureSection(entry.section);
  if (
    section === undefined ||
    normalizedProcedureName(entry.name) !== "Spellcasting"
  ) {
    return undefined;
  }
  const header = entry.description.match(
    /^The .+ casts one of the following spells, (?:(requiring no (?:(Somatic or )?Material|spell) components) and )?using (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) as (?:the )?spellcasting ability(?: \(spell save DC (\d+)(?:, ([+−-]\d+) to hit with spell attacks)?\))?: /,
  );
  if (header === null) return undefined;
  const groups = Array.from(
    entry.description.matchAll(
      /(?:- )?(?:At Will|(\d+)\/Day( Each)?): (.+?)(?= (?:- )?(?:At Will|\d+\/Day(?: Each)?):|$)/g,
    ),
    (
      group,
    ): Extract<
      ProcedureProjection,
      { readonly kind: "spellcasting" }
    >["groups"][number] => {
      const uses = group[1];
      const spells = nonEmptyValues(
        splitOutsideParentheses(group[3] ?? "").map(parseSpell),
        `${entry.name} spells`,
      );
      return uses === undefined
        ? { kind: "at_will", spells, resourceLimits: [] }
        : {
            kind: "limited",
            spells,
            resourceLimits: [
              {
                kind: "daily",
                uses: Number(uses),
                ownership: group[2] === undefined ? "shared" : "each",
              },
            ],
          };
    },
  );
  if (groups.length === 0) {
    throw new Error(`Missing ${entry.name} spell groups`);
  }
  return {
    section,
    name: normalizedProcedureName(entry.name),
    kind: "spellcasting",
    ability: parsedAbility(header[3] ?? "", entry.name),
    ...(header[4] === undefined ? {} : { spellSaveDc: Number(header[4]) }),
    ...(header[5] === undefined
      ? {}
      : { spellAttackBonus: signedNumber(header[5]) }),
    components:
      header[1] === undefined
        ? { kind: "spell_definition" }
        : header[1].includes("spell components")
          ? { kind: "fixed", v: false, s: false, m: false }
          : {
              kind: "fixed",
              v: true,
              s: header[2] === undefined,
              m: false,
            },
    groups: nonEmptyValues(groups, `${entry.name} spell groups`),
    resourceLimits: parseRawResourceLimits(entry.name),
  };
};

const parseDirectSpellcasting = (
  entry: RawEntry,
  inheritedAbility: Ability | undefined,
  inheritedSpellAttackBonus: number | undefined,
): ProcedureProjection | undefined => {
  const section = procedureSection(entry.section);
  if (section === undefined) return undefined;
  const explicitAbility = entry.description.match(
    /^The .+ casts (?:the )?(.+?)(?: spell)?( on itself| on that creature)?, requiring no (spell|Material|Somatic or Material) components and using (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) as the spellcasting ability(?: \(spell save DC (\d+)\))?\.(?: (The spell .+)\.)?$/,
  );
  const sameAbility = entry.description.match(
    /^The .+ casts (?:the )?(.+?)(?: spell)?( on itself| on that creature)?,( requiring no spell components and)? using the same spellcasting ability as Spellcasting\.(?: (The spell .+)\.)?$/,
  );
  if (explicitAbility === null && sameAbility === null) return undefined;
  const inherited = sameAbility === null ? undefined : inheritedAbility;
  if (sameAbility !== null && inherited === undefined) return undefined;
  const match = explicitAbility ?? sameAbility;
  if (match === null) return undefined;
  if (explicitAbility !== null && match[2] !== undefined) return undefined;
  if ((match[1] ?? "").includes(" in response")) {
    return undefined;
  }
  const explicit = explicitAbility !== null;
  const sourceRestriction = explicit ? match[6] : match[4];
  if (match[2] !== undefined && sourceRestriction !== undefined) {
    return undefined;
  }
  const spells = splitOutsideParentheses(match[1] ?? "").map((value) =>
    parseSpell(value.replace(/^or /, "")),
  );
  if (
    spells.length === 0 ||
    spells.some((spell) => spell.castAtLevel !== undefined) ||
    (spells.length > 1 &&
      (match[2] !== undefined || sourceRestriction !== undefined))
  ) {
    return undefined;
  }
  const projectedSpells = spells.map((spell) =>
    sourceRestriction !== undefined
      ? { ...spell, restriction: sourceRestriction }
      : match[2] === undefined
        ? spell
        : { ...spell, restriction: match[2].trim() },
  );
  const ability = explicit
    ? parsedAbility(match[4] ?? "", entry.name)
    : inherited;
  if (ability === undefined) return undefined;
  const limits = parseRawResourceLimits(entry.name);
  const projectedSpellList = nonEmptyValues(
    projectedSpells,
    `${entry.name} spells`,
  );
  const group: SpellcastingGroupProjection =
    limits.length === 0
      ? {
          kind: "at_will",
          spells: projectedSpellList,
          resourceLimits: [],
        }
      : {
          kind: "limited",
          spells: projectedSpellList,
          resourceLimits: nonEmptyValues(limits, `${entry.name} limits`),
        };
  return {
    section,
    name: normalizedProcedureName(entry.name),
    kind: "spellcasting",
    ability,
    ...(sameAbility === null || inheritedSpellAttackBonus === undefined
      ? {}
      : { spellAttackBonus: inheritedSpellAttackBonus }),
    ...(explicit && match[5] !== undefined
      ? { spellSaveDc: Number(match[5]) }
      : {}),
    components:
      explicitAbility !== null
        ? match[3] === "spell"
          ? { kind: "fixed", v: false, s: false, m: false }
          : {
              kind: "fixed",
              v: true,
              s: match[3] !== "Somatic or Material",
              m: false,
            }
        : sameAbility?.[3] !== undefined
          ? { kind: "fixed", v: false, s: false, m: false }
          : { kind: "spell_definition" },
    groups: [group],
    resourceLimits: [],
  };
};

const parseActionOption = (
  entry: RawEntry,
): ProcedureProjection | undefined => {
  const section = procedureSection(entry.section);
  if (section === undefined) return undefined;
  const match = entry.description.match(
    /^The .+ takes the (Dash), (Disengage), or (Hide) action\.$/,
  );
  const pair = entry.description.match(
    /^The .+ takes the (Disengage) or (Hide) action\.$/,
  );
  const options = match?.slice(1) ?? pair?.slice(1);
  return options === undefined
    ? undefined
    : {
        section,
        name: normalizedProcedureName(entry.name),
        kind: "action_option",
        options: nonEmptyValues(
          sortedStrings(options.map(normalizedIdentifier)),
          `${entry.name} action options`,
        ),
        resourceLimits: parseRawResourceLimits(entry.name),
      };
};

const rawTextOnlyReason = (
  entry: RawEntry,
): "unsupported_action_shape" | "unsupported_procedure_family" =>
  /^The .+ casts .+ on itself, requiring no spell components and using (?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) as the spellcasting ability\.$/.test(
    entry.description,
  ) ||
  (!entry.description.includes("in response") &&
    /^The .+ casts .+(?: or .+)+, using the same spellcasting ability as Spellcasting\.$/.test(
      entry.description,
    )) ||
  /^The .+ casts .+ twice, requiring no .+ components and using .+ as the spellcasting ability/.test(
    entry.description,
  ) ||
  (parseRawResourceLimits(entry.name).length === 0 &&
    /^The .+ casts .+ \(level \d+ version\), requiring no spell components and using .+ as the spellcasting ability/.test(
      entry.description,
    )) ||
  /^The .+ casts .+ using .+ as the spellcasting ability .+ duration is/.test(
    entry.description,
  ) ||
  (isBonusActionSection(entry.section) &&
    /^The .+ casts .+, requiring no spell components and using .+ as the spellcasting ability/.test(
      entry.description,
    ) &&
    !entry.description.includes("can't take this action again")) ||
  /^The .+ shape-shifts .+ Its game statistics are the same in each form, except (?:for )?(?:its|its Fly) Speed/.test(
    entry.description,
  ) ||
  (/^Trigger:/.test(entry.description) &&
    (/\. On a miss, .+ makes one .+ attack/.test(entry.description) ||
      /Response: The .+ uses [A-Za-z' -]+\.$/.test(entry.description) ||
      /Response: The wearer gains a .+ bonus to AC/.test(entry.description) ||
      /Response: The .+ adds \d+ to the roll\.$/.test(entry.description) ||
      /Response: The .+ reduces the damage .+ Saving Throw:/.test(
        entry.description,
      )))
    ? "unsupported_procedure_family"
    : "unsupported_action_shape";

const parseRawProcedure = (
  entry: RawEntry,
  generalFacts: Pick<
    ScopedGeneralFacts,
    "abilityScores" | "challengeRating" | "gear"
  >,
  ammunitionByWeapon: ReadonlyMap<string, string>,
  spellcastingAbility: Ability | undefined,
  spellAttackBonus: number | undefined,
): ProcedureProjection | undefined => {
  const section = procedureSection(entry.section);
  if (section === undefined) return undefined;
  return (
    parseSpellcasting(entry) ??
    parseDirectSpellcasting(entry, spellcastingAbility, spellAttackBonus) ??
    parseSimpleAttack(entry, generalFacts, ammunitionByWeapon) ??
    parseSimpleSave(entry) ??
    parseSimpleMultiattack(entry) ??
    parseActionOption(entry) ?? {
      section,
      name: normalizedProcedureName(entry.name),
      kind: "textOnly",
      description: entry.description,
      reason: rawTextOnlyReason(entry),
      resourceLimits: parseRawResourceLimits(entry.name),
    }
  );
};

const parseLegendaryActionUses = (
  lines: readonly string[],
): ScopedGeneralFacts["legendaryActionUses"] => {
  const line = lines.find((candidate) =>
    candidate.startsWith("*Legendary Action Uses:"),
  );
  if (line === undefined) return undefined;
  const uses = requireMatch(
    line,
    /^\*Legendary Action Uses: (\d+)(?: \((\d+) in Lair\))?\./,
    "Legendary Action Uses",
  );
  return uses[2] === undefined
    ? { kind: "fixed", uses: Number(uses[1]) }
    : {
        kind: "lair_bonus",
        usesOutsideLair: Number(uses[1]),
        additionalUsesInLair: Number(uses[2]) - Number(uses[1]),
      };
};

const procedureName = (entry: StatBlockProcedureEntry): string =>
  Match.value(entry).pipe(
    Match.when({ kind: "textOnly" }, (textOnly) => textOnly.name),
    Match.when(
      { kind: "executable" },
      (executable) => executable.procedure.name,
    ),
    Match.exhaustive,
  );

const authoredProcedures = (
  record: SrdStatBlockRecord,
): readonly {
  readonly section: ProcedureSection;
  readonly entry: StatBlockProcedureEntry;
}[] => [
  ...(record.statBlock.actions ?? []).map((entry) => ({
    section: "Actions" as const,
    entry,
  })),
  ...(record.statBlock.bonusActions ?? []).map((entry) => ({
    section: "Bonus Actions" as const,
    entry,
  })),
  ...(record.statBlock.reactions ?? []).map((entry) => ({
    section: "Reactions" as const,
    entry,
  })),
  ...(record.statBlock.legendaryActions?.entries ?? []).map((entry) => ({
    section: "Legendary Actions" as const,
    entry,
  })),
];

const rawRecordLines = (
  sourceLines: readonly string[],
  occurrence: SrdStatBlockSourceOccurrence,
): readonly string[] =>
  sourceLines.slice(occurrence.anchor.lineStart - 1, occurrence.anchor.lineEnd);

const uniqueSpellcastingFacts = (
  entries: readonly RawEntry[],
):
  | {
      readonly ability: Ability;
      readonly spellAttackBonus: number | undefined;
    }
  | undefined => {
  const spellcasting = entries.flatMap((entry) => {
    const procedure = parseSpellcasting(entry);
    return Match.value(procedure).pipe(
      Match.when(undefined, () => []),
      Match.when({ kind: "spellcasting" }, (spellcastingProcedure) => [
        spellcastingProcedure,
      ]),
      Match.when({ kind: "textOnly" }, () => []),
      Match.when({ kind: "attack_roll" }, () => []),
      Match.when({ kind: "save" }, () => []),
      Match.when({ kind: "multiattack" }, () => []),
      Match.when({ kind: "action_option" }, () => []),
      Match.exhaustive,
    );
  });
  if (spellcasting.length > 1) {
    throw new Error("A RAW Stat Block has multiple Spellcasting abilities");
  }
  const [procedure] = spellcasting;
  return procedure === undefined
    ? undefined
    : {
        ability: procedure.ability,
        spellAttackBonus: procedure.spellAttackBonus,
      };
};

const projectRawStatBlockUnsafe = (
  source: string,
  occurrence: SrdStatBlockSourceOccurrence,
  equipmentSource: string,
): StatBlockScopedFidelityProjection => {
  const sourceLines = source.split(/\r?\n/);
  const ammunitionByWeapon = parseAmmunitionByWeapon(equipmentSource);
  const lines = rawRecordLines(sourceLines, occurrence);
  const entries = parseRawEntries(lines);
  const generalFacts = parseRawGeneralFacts(occurrence.name, lines);
  const spellcasting = uniqueSpellcastingFacts(entries);
  const parsedProcedures = entries.flatMap((entry) => {
    const procedure = parseRawProcedure(
      entry,
      generalFacts,
      ammunitionByWeapon,
      spellcasting?.ability,
      spellcasting?.spellAttackBonus,
    );
    return procedure === undefined ? [] : [procedure];
  });
  const structurallyPresentNames = new Set(
    entries
      .filter((entry) => procedureSection(entry.section) !== undefined)
      .map((entry) => normalizedProcedureName(entry.name)),
  );
  const procedures = parsedProcedures.map(
    (procedure): ProcedureProjection =>
      Match.value(procedure).pipe(
        Match.when({ kind: "multiattack" }, (multiattack) => {
          if (
            multiattack.dispatches.every((dispatch) =>
              structurallyPresentNames.has(dispatch.procedureName),
            )
          ) {
            return multiattack;
          }
          const entry = entries.find(
            (candidate) =>
              candidate.section === multiattack.section &&
              normalizedProcedureName(candidate.name) === multiattack.name,
          );
          if (entry === undefined) {
            throw new Error(
              `Missing ${occurrence.name}/${multiattack.name} RAW entry`,
            );
          }
          return {
            section: multiattack.section,
            name: multiattack.name,
            kind: "textOnly" as const,
            description: entry.description,
            reason: "unsupported_action_shape" as const,
            resourceLimits: parseRawResourceLimits(entry.name),
          };
        }),
        Match.when({ kind: "textOnly" }, (unchanged) => unchanged),
        Match.when({ kind: "attack_roll" }, (unchanged) => unchanged),
        Match.when({ kind: "save" }, (unchanged) => unchanged),
        Match.when({ kind: "action_option" }, (unchanged) => unchanged),
        Match.when({ kind: "spellcasting" }, (unchanged) => unchanged),
        Match.exhaustive,
      ),
  );
  const legendaryActionUses = parseLegendaryActionUses(lines);
  const resources = procedureResourceLimits(procedures);

  return {
    generalFacts: {
      ...generalFacts,
      ...(legendaryActionUses === undefined ? {} : { legendaryActionUses }),
    },
    resources,
    entryNames: entries.map(rawEntryName),
    traits: entries.flatMap(rawTraitEvidence),
    textOnlyProcedures: procedures.flatMap(projectRawTextOnlyProcedureEvidence),
    procedures,
  };
};

type ProcedureResourceRefs = StatBlockProcedureEntry["resourceRefs"];
type ExecutableProcedure = Extract<
  StatBlockProcedureEntry,
  { readonly kind: "executable" }
>["procedure"];
type AuthoredSpellcastingGroup = Extract<
  ExecutableProcedure,
  { readonly kind: "spellcasting" }
>["groups"][number];
type AttackEffect = Extract<
  Extract<
    ExecutableProcedure,
    { readonly kind: "attack_roll" }
  >["onHit"][number],
  { readonly kind: string }
>;
type AttackDamage = Extract<AttackEffect, { readonly kind: "damage" }>;
type AttackConditionalDamage = Extract<
  AttackEffect,
  { readonly kind: "conditional_bonus_damage" }
>;

const projectDamageFields = (
  damage: AttackDamage | AttackConditionalDamage,
): Omit<DamageProjection, "kind"> => {
  const fixedAmount = Match.value(damage.amount).pipe(
    Match.when({ kind: "fixed" }, (amount) => amount),
    Match.exhaustive,
  );
  const expression = "expr" in fixedAmount ? fixedAmount.expr : undefined;
  const staticDamage = fixedAmount.static;
  if (staticDamage === undefined) {
    throw new Error(`Missing authored ${damage.damageType} static damage`);
  }
  return {
    damageType: damage.damageType,
    amount:
      expression === undefined
        ? { kind: "fixed", static: staticDamage }
        : {
            kind: "fixed",
            static: staticDamage,
            expr: {
              dice: expression.dice,
              dieSize: expression.dieSize,
              ...(expression.flat === undefined
                ? {}
                : { flat: expression.flat }),
              ...(expression.spellcastingMod === undefined
                ? {}
                : { spellcastingMod: expression.spellcastingMod }),
              ...(expression.abilityModifier === undefined
                ? {}
                : { abilityModifier: expression.abilityModifier }),
            },
          },
  };
};

const projectDamage = (damage: AttackDamage): DamageProjection => ({
  kind: "damage",
  ...projectDamageFields(damage),
});

const projectAttackEffect = (effect: AttackEffect): AttackEffectProjection => {
  return Match.value(effect).pipe(
    Match.when({ kind: "damage" }, projectDamage),
    Match.when({ kind: "conditional_bonus_damage" }, (conditional) => ({
      kind: "conditional_bonus_damage" as const,
      ...projectDamageFields(conditional),
      when: Match.value(conditional.when).pipe(
        Match.when(
          { kind: "attack_roll_had_advantage" },
          () => "attack_roll_had_advantage" as const,
        ),
        Match.when({ kind: "target_creature_type" }, () => {
          throw new Error("Unsupported conditional attack damage trigger");
        }),
        Match.exhaustive,
      ),
    })),
    Match.when({ kind: "apply_condition_if_target_size_at_most" }, (sized) => ({
      kind: "apply_condition_if_target_size_at_most" as const,
      condition: sized.condition,
      maxCreatureSize: sized.maxCreatureSize,
    })),
    Match.when(
      { kind: "apply_condition", expiresAt: Match.defined },
      (condition) => ({
        kind: "apply_condition" as const,
        condition: condition.condition,
        expiresAt: Match.value(condition.expiresAt).pipe(
          Match.when(
            { kind: "source_next_turn_end" },
            () => "source_next_turn_end" as const,
          ),
          Match.when(
            { kind: "target_next_turn_end" },
            () => "target_next_turn_end" as const,
          ),
          Match.exhaustive,
        ),
      }),
    ),
    Match.when({ kind: "apply_condition" }, () => {
      throw new Error("Unsupported authored attack effect");
    }),
    Match.exhaustive,
  );
};

const projectResourceLimits = (
  record: SrdStatBlockRecord,
  refs: ProcedureResourceRefs,
): readonly ResourceLimitProjection[] =>
  Match.value(refs).pipe(
    Match.when({ kind: "none" }, () => []),
    Match.when({ kind: "some" }, ({ ordinals }) => {
      const resources = new Map(
        (record.statBlock.resources ?? []).map((resource) => [
          resource.ordinal,
          resource,
        ]),
      );
      return ordinals.map((ordinal): ResourceLimitProjection => {
        const resource = resources.get(ordinal);
        if (resource === undefined) {
          throw new Error(`Missing ${record.name} resource ordinal ${ordinal}`);
        }
        return projectResource(resource);
      });
    }),
    Match.exhaustive,
  );

const projectResource = (
  resource: NonNullable<SrdStatBlockRecord["statBlock"]["resources"]>[number],
): ResourceLimitProjection =>
  Match.value(resource.limit).pipe(
    Match.when({ kind: "daily" }, (daily) => ({
      kind: "daily" as const,
      uses: daily.uses,
      ownership: resource.ownership,
    })),
    Match.when({ kind: "recharge" }, (recharge) => ({
      kind: "recharge" as const,
      minimumRoll: recharge.minimumRoll,
      ownership: resource.ownership,
    })),
    Match.when({ kind: "recharge_after_rest" }, (afterRest) => ({
      kind: "recharge_after_rest" as const,
      rest: afterRest.rest,
      ownership: resource.ownership,
    })),
    Match.exhaustive,
  );

const literalValue = (value: {
  readonly kind: "literal";
  readonly value: number;
}): number => value.value;

const projectAuthoredSpellcastingGroup = (
  record: SrdStatBlockRecord,
  group: AuthoredSpellcastingGroup,
): SpellcastingGroupProjection => {
  const spells = nonEmptyValues(
    group.spells.map((spell) => ({
      spellId: spell.spellId,
      ...(spell.count === undefined ? {} : { count: spell.count }),
      ...(spell.castAtLevel === undefined
        ? {}
        : { castAtLevel: spell.castAtLevel }),
      ...(spell.restriction === undefined
        ? {}
        : { restriction: spell.restriction.authoredExpression }),
    })),
    "spellcasting group spells",
  );
  return Match.value(group).pipe(
    Match.when({ kind: "at_will" }, () => ({
      kind: "at_will" as const,
      spells,
      resourceLimits: [] as const,
    })),
    Match.when({ kind: "limited" }, (limited) => ({
      kind: "limited" as const,
      spells,
      resourceLimits: nonEmptyValues(
        projectResourceLimits(record, limited.resourceRefs),
        "limited spellcasting group resources",
      ),
    })),
    Match.exhaustive,
  );
};

const projectExecutableProcedure = (
  record: SrdStatBlockRecord,
  section: ProcedureSection,
  entry: Extract<StatBlockProcedureEntry, { readonly kind: "executable" }>,
  namesByOrdinal: ReadonlyMap<number, string>,
): ProcedureProjection => {
  const resourceLimits = projectResourceLimits(record, entry.resourceRefs);
  return Match.value(entry.procedure).pipe(
    Match.when({ kind: "attack_roll" }, (attack) => {
      const attackAbility = (() => {
        const candidates = rawAttackAbilityCandidates(
          record.statBlock.abilityScores,
          record.challengeRating,
          literalValue(attack.attackBonus),
        );
        const evidence = attackAbilityEvidence(candidates);
        if (evidence === undefined) {
          throw new Error(
            `${record.name}/${attack.name} has no RAW-derived attack ability candidate`,
          );
        }
        if (
          !isAttackAbility(attack.attackAbility) ||
          !candidates.includes(attack.attackAbility)
        ) {
          throw new Error(
            `${record.name}/${attack.name} uses ${attack.attackAbility} outside RAW-derived attack ability candidates ${candidates.join(", ")}`,
          );
        }
        return evidence;
      })();
      const commonAttack = {
        section,
        name: normalizedProcedureName(attack.name),
        kind: "attack_roll" as const,
        attackBonus: literalValue(attack.attackBonus),
        attackAbilityEvidence: attackAbility,
        onHit: nonEmptyValues(
          attack.onHit.map(projectAttackEffect),
          `${record.name}/${attack.name} attack effects`,
        ),
        ...(attack.multiattackCount === undefined
          ? {}
          : { multiattackCount: literalValue(attack.multiattackCount) }),
        resourceLimits,
      };
      return Match.value(attack).pipe(
        Match.when({ attackType: "melee" }, ({ reachFeet }) => ({
          ...commonAttack,
          attackType: "melee" as const,
          reachFeet,
        })),
        Match.when({ attackType: "ranged" }, ({ rangeFeet, ammunition }) => ({
          ...commonAttack,
          attackType: "ranged" as const,
          rangeFeet,
          ...(ammunition === undefined ? {} : { ammunition }),
        })),
        Match.exhaustive,
      );
    }),
    Match.when({ kind: "save" }, (save) => {
      const unsupportedSimpleDamageSave = (): never => {
        throw new Error(
          `${record.name}/${save.name} is not a simple damage save`,
        );
      };
      const onFail = Match.value(save.onFail).pipe(
        Match.when({ kind: "damage" }, projectDamage),
        Match.when(
          { kind: "conditional_bonus_damage" },
          unsupportedSimpleDamageSave,
        ),
        Match.when(
          { kind: "apply_condition_if_target_size_at_most" },
          unsupportedSimpleDamageSave,
        ),
        Match.when({ kind: "apply_condition" }, unsupportedSimpleDamageSave),
        Match.exhaustive,
      );
      const onSuccess = Match.value(save.onSuccess).pipe(
        Match.when({ kind: "half_damage" }, () => "half_damage" as const),
        Match.when({ kind: "damage" }, unsupportedSimpleDamageSave),
        Match.when(
          { kind: "conditional_bonus_damage" },
          unsupportedSimpleDamageSave,
        ),
        Match.when(
          { kind: "apply_condition_if_target_size_at_most" },
          unsupportedSimpleDamageSave,
        ),
        Match.when({ kind: "apply_condition" }, unsupportedSimpleDamageSave),
        Match.exhaustive,
      );
      if (!("area" in save)) {
        throw new Error(`${record.name}/${save.name} has an unsupported area`);
      }
      const area = Match.value(save.area).pipe(
        Match.when({ kind: "line" }, (line) => ({
          kind: "line" as const,
          lengthFeet: line.lengthFeet,
          widthFeet: line.widthFeet,
        })),
        Match.when({ kind: "cone" }, (cone) => ({
          kind: "cone" as const,
          lengthFeet: cone.lengthFeet,
        })),
        Match.when({ kind: "sphere" }, () => {
          throw new Error(
            `${record.name}/${save.name} has an unsupported area`,
          );
        }),
        Match.when({ kind: "circle" }, () => {
          throw new Error(
            `${record.name}/${save.name} has an unsupported area`,
          );
        }),
        Match.when({ kind: "sphere_cluster" }, () => {
          throw new Error(
            `${record.name}/${save.name} has an unsupported area`,
          );
        }),
        Match.when({ kind: "cube" }, () => {
          throw new Error(
            `${record.name}/${save.name} has an unsupported area`,
          );
        }),
        Match.when({ kind: "cube_cluster" }, () => {
          throw new Error(
            `${record.name}/${save.name} has an unsupported area`,
          );
        }),
        Match.when({ kind: "cylinder" }, () => {
          throw new Error(
            `${record.name}/${save.name} has an unsupported area`,
          );
        }),
        Match.when({ kind: "emanation" }, () => {
          throw new Error(
            `${record.name}/${save.name} has an unsupported area`,
          );
        }),
        Match.when({ kind: "wall_volume" }, () => {
          throw new Error(
            `${record.name}/${save.name} has an unsupported area`,
          );
        }),
        Match.exhaustive,
      );
      return {
        section,
        name: normalizedProcedureName(save.name),
        kind: "save" as const,
        ability: save.ability,
        dc: save.dc.dc,
        area,
        onFail,
        onSuccess,
        ...(save.multiattackCount === undefined
          ? {}
          : { multiattackCount: literalValue(save.multiattackCount) }),
        resourceLimits,
      };
    }),
    Match.when({ kind: "multiattack" }, (multiattack) => ({
      section,
      name: normalizedProcedureName(multiattack.name),
      kind: "multiattack" as const,
      dispatches: nonEmptyValues(
        multiattack.dispatches.map((dispatch) => {
          const procedureName = namesByOrdinal.get(dispatch.procedureOrdinal);
          if (procedureName === undefined) {
            throw new Error(
              `${record.name}/${multiattack.name} has an unresolved dispatch`,
            );
          }
          return {
            procedureName: normalizedProcedureName(procedureName),
            count: literalValue(dispatch.count),
          };
        }),
        `${record.name}/${multiattack.name} dispatches`,
      ),
      resourceLimits,
    })),
    Match.when({ kind: "action_option" }, (option) => ({
      section,
      name: normalizedProcedureName(option.name),
      kind: "action_option" as const,
      options: nonEmptyValues(
        sortedStrings(option.options),
        `${record.name}/${option.name} options`,
      ),
      resourceLimits,
    })),
    Match.when({ kind: "spellcasting" }, (spellcasting) => ({
      section,
      name: normalizedProcedureName(spellcasting.name),
      kind: "spellcasting" as const,
      ability: spellcasting.ability,
      ...(spellcasting.spellSaveDc === undefined
        ? {}
        : { spellSaveDc: spellcasting.spellSaveDc.dc }),
      ...(spellcasting.spellAttackBonus === undefined
        ? {}
        : { spellAttackBonus: literalValue(spellcasting.spellAttackBonus) }),
      components:
        spellcasting.components === undefined
          ? { kind: "spell_definition" as const }
          : { kind: "fixed" as const, ...spellcasting.components },
      groups: nonEmptyValues(
        spellcasting.groups.map((group) =>
          projectAuthoredSpellcastingGroup(record, group),
        ),
        `${record.name}/${spellcasting.name} groups`,
      ),
      resourceLimits,
    })),
    Match.when({ kind: "support" }, (support) => {
      throw new Error(
        `${record.name}/${support.name} is an unexpected support procedure`,
      );
    }),
    Match.exhaustive,
  );
};

const bindAuthoredResourceLimits = (
  structuralProcedure: StructuralProcedure,
  authoredResourceLimits: readonly ResourceLimitProjection[],
): StructuralProcedure | undefined => {
  if (authoredResourceLimits.length === 0) return structuralProcedure;
  return Match.value(structuralProcedure).pipe(
    Match.when({ kind: "attack_roll" }, (procedure) => ({
      ...procedure,
      resourceLimits: authoredResourceLimits,
    })),
    Match.when({ kind: "save" }, (procedure) => ({
      ...procedure,
      resourceLimits: authoredResourceLimits,
    })),
    Match.when({ kind: "multiattack" }, (procedure) => ({
      ...procedure,
      resourceLimits: authoredResourceLimits,
    })),
    Match.when({ kind: "action_option" }, (procedure) => ({
      ...procedure,
      resourceLimits: authoredResourceLimits,
    })),
    Match.when({ kind: "spellcasting" }, (spellcasting) => {
      const limitedGroups = spellcasting.groups.filter(
        (group) => group.kind === "limited",
      );
      const targetGroup =
        limitedGroups.length === 1
          ? limitedGroups[0]
          : limitedGroups.length === 0 && spellcasting.groups.length === 1
            ? spellcasting.groups[0]
            : undefined;
      if (authoredResourceLimits.length !== 1 || targetGroup === undefined) {
        return undefined;
      }
      const limits = nonEmptyValues(
        authoredResourceLimits,
        "authored spellcasting resources",
      );
      return {
        ...spellcasting,
        groups: nonEmptyValues(
          spellcasting.groups.map(
            (group): SpellcastingGroupProjection =>
              group === targetGroup
                ? {
                    ...group,
                    kind: "limited",
                    resourceLimits: limits,
                  }
                : group,
          ),
          "bound spellcasting groups",
        ),
      };
    }),
    Match.exhaustive,
  );
};

const projectAuthoredProcedures = (
  record: SrdStatBlockRecord,
  ammunitionByWeapon: ReadonlyMap<string, string>,
): readonly ProcedureProjection[] => {
  const entries = authoredProcedures(record);
  const inheritedSpellcastingFacts = entries.flatMap(({ section, entry }) => {
    return Match.value(entry).pipe(
      Match.when({ kind: "executable" }, (executable) =>
        Match.value(executable.procedure).pipe(
          Match.when({ kind: "spellcasting" }, (spellcasting) =>
            normalizedProcedureName(spellcasting.name) === "Spellcasting"
              ? [
                  {
                    ability: spellcasting.ability,
                    spellAttackBonus: spellcasting.spellAttackBonus?.value,
                  },
                ]
              : [],
          ),
          Match.when({ kind: "attack_roll" }, () => []),
          Match.when({ kind: "save" }, () => []),
          Match.when({ kind: "multiattack" }, () => []),
          Match.when({ kind: "support" }, () => []),
          Match.when({ kind: "action_option" }, () => []),
          Match.exhaustive,
        ),
      ),
      Match.when({ kind: "textOnly" }, (textOnly) => {
        if (normalizedProcedureName(textOnly.name) !== "Spellcasting") {
          return [];
        }
        const parsed = parseSpellcasting({
          section,
          name: textOnly.name,
          description: normalizedProse(textOnly.description),
        });
        return Match.value(parsed).pipe(
          Match.when(undefined, () => []),
          Match.when({ kind: "spellcasting" }, (spellcasting) => [
            {
              ability: spellcasting.ability,
              spellAttackBonus: spellcasting.spellAttackBonus,
            },
          ]),
          Match.when({ kind: "textOnly" }, () => []),
          Match.when({ kind: "attack_roll" }, () => []),
          Match.when({ kind: "save" }, () => []),
          Match.when({ kind: "multiattack" }, () => []),
          Match.when({ kind: "action_option" }, () => []),
          Match.exhaustive,
        );
      }),
      Match.exhaustive,
    );
  });
  if (inheritedSpellcastingFacts.length > 1) {
    throw new Error(`${record.name} has multiple Spellcasting abilities`);
  }
  const inheritedSpellcasting = inheritedSpellcastingFacts[0];
  const namesBySectionAndOrdinal = new Map<
    ProcedureSection,
    Map<number, string>
  >();
  for (const { section, entry } of entries) {
    const namesByOrdinal = namesBySectionAndOrdinal.get(section) ?? new Map();
    namesByOrdinal.set(entry.procedureOrdinal, procedureName(entry));
    namesBySectionAndOrdinal.set(section, namesByOrdinal);
  }
  return entries.map(
    ({ section, entry }): ProcedureProjection =>
      Match.value(entry).pipe(
        Match.when({ kind: "textOnly" }, (textOnly) => {
          const resourceLimits = projectResourceLimits(
            record,
            textOnly.resourceRefs,
          );
          const fallback = (): ProcedureProjection => ({
            section,
            name: normalizedProcedureName(textOnly.name),
            kind: "textOnly",
            description: normalizedProse(textOnly.description),
            reason: textOnly.reason,
            resourceLimits,
          });
          const structuralProcedure = parseRawProcedure(
            {
              section,
              name: textOnly.name,
              description: normalizedProse(textOnly.description),
            },
            {
              abilityScores: record.statBlock.abilityScores,
              challengeRating: record.challengeRating,
              gear: (record.statBlock.gear ?? []).map((gear) => ({
                item: gear.item,
                quantity: gear.quantity ?? 1,
              })),
            },
            ammunitionByWeapon,
            inheritedSpellcasting?.ability,
            inheritedSpellcasting?.spellAttackBonus,
          );
          return Match.value(structuralProcedure).pipe(
            Match.when(undefined, fallback),
            Match.when({ kind: "textOnly" }, fallback),
            Match.when(
              { kind: "attack_roll" },
              (structural) =>
                bindAuthoredResourceLimits(structural, resourceLimits) ??
                fallback(),
            ),
            Match.when(
              { kind: "save" },
              (structural) =>
                bindAuthoredResourceLimits(structural, resourceLimits) ??
                fallback(),
            ),
            Match.when(
              { kind: "multiattack" },
              (structural) =>
                bindAuthoredResourceLimits(structural, resourceLimits) ??
                fallback(),
            ),
            Match.when(
              { kind: "action_option" },
              (structural) =>
                bindAuthoredResourceLimits(structural, resourceLimits) ??
                fallback(),
            ),
            Match.when(
              { kind: "spellcasting" },
              (structural) =>
                bindAuthoredResourceLimits(structural, resourceLimits) ??
                fallback(),
            ),
            Match.exhaustive,
          );
        }),
        Match.when({ kind: "executable" }, (executable) =>
          projectExecutableProcedure(
            record,
            section,
            executable,
            namesBySectionAndOrdinal.get(section) ?? new Map(),
          ),
        ),
        Match.exhaustive,
      ),
  );
};

const projectLegendaryActionUses = (
  record: SrdStatBlockRecord,
): ScopedGeneralFacts["legendaryActionUses"] => {
  const uses = record.statBlock.legendaryActions?.uses;
  if (uses === undefined) return undefined;
  return Match.value(uses).pipe(
    Match.when({ kind: "fixed" }, (fixed) => ({
      kind: "fixed" as const,
      uses: fixed.uses,
    })),
    Match.when({ kind: "lair_bonus" }, (lairBonus) => ({
      kind: "lair_bonus" as const,
      usesOutsideLair: lairBonus.usesOutsideLair,
      additionalUsesInLair: lairBonus.additionalUsesInLair,
    })),
    Match.exhaustive,
  );
};

const resourceReferenceOrdinals = (
  refs: StatBlockProcedureEntry["resourceRefs"],
): readonly number[] =>
  Match.value(refs).pipe(
    Match.when({ kind: "none" }, () => []),
    Match.when({ kind: "some" }, ({ ordinals }) => ordinals),
    Match.exhaustive,
  );

const entryReferencedResourceOrdinals = (
  entry: StatBlockProcedureEntry,
): readonly number[] =>
  Match.value(entry).pipe(
    Match.when({ kind: "textOnly" }, (textOnly) =>
      resourceReferenceOrdinals(textOnly.resourceRefs),
    ),
    Match.when({ kind: "executable" }, (executable) => [
      ...resourceReferenceOrdinals(executable.resourceRefs),
      ...Match.value(executable.procedure).pipe(
        Match.when({ kind: "spellcasting" }, (spellcasting) =>
          spellcasting.groups.flatMap((group) =>
            resourceReferenceOrdinals(group.resourceRefs),
          ),
        ),
        Match.when({ kind: "attack_roll" }, () => []),
        Match.when({ kind: "save" }, () => []),
        Match.when({ kind: "multiattack" }, () => []),
        Match.when({ kind: "support" }, () => []),
        Match.when({ kind: "action_option" }, () => []),
        Match.exhaustive,
      ),
    ]),
    Match.exhaustive,
  );

const projectVulnerabilities = (
  record: SrdStatBlockRecord,
): ScopedGeneralFacts["vulnerabilities"] =>
  Match.value(record.statBlock.vulnerabilities).pipe(
    Match.when(undefined, () => ({ kind: "none" as const })),
    Match.when({ kind: "qualified" }, (qualified) => ({
      kind: "qualified" as const,
      damageTypes: sortedNonEmptyStrings(
        qualified.damageTypes,
        `${record.name} qualified vulnerability damage type`,
      ),
      qualifier: qualified.qualifier,
    })),
    Match.when({ kind: "fixed" }, (fixed) => ({
      kind: "fixed" as const,
      damageTypes: sortedNonEmptyStrings(
        fixed.damageTypes,
        `${record.name} vulnerability damage type`,
      ),
    })),
    Match.exhaustive,
  );

const projectTextOnlyEvidence = (
  section: ProcedureSection,
  entry: StatBlockProcedureEntry,
): StatBlockScopedFidelityProjection["textOnlyProcedures"] =>
  Match.value(entry).pipe(
    Match.when({ kind: "textOnly" }, (textOnly) => [
      {
        section,
        name: normalizedProcedureName(textOnly.name),
        description: normalizedProse(textOnly.description),
        reason: textOnly.reason,
      },
    ]),
    Match.when({ kind: "executable" }, () => []),
    Match.exhaustive,
  );

const projectImmunities = (
  record: SrdStatBlockRecord,
): ScopedGeneralFacts["immunities"] => {
  const immunities = record.statBlock.immunities;
  if (immunities === undefined) return { kind: "none" };

  return {
    kind: "some",
    value: Schema.decodeUnknownSync(CreatureImmunityListSchema)({
      ...("damageTypes" in immunities
        ? {
            damageTypes: sortedNonEmptyStrings(
              immunities.damageTypes,
              `${record.name} immunity damage type`,
            ),
          }
        : {}),
      ...("conditions" in immunities
        ? {
            conditions: sortedNonEmptyStrings(
              immunities.conditions,
              `${record.name} immunity condition`,
            ),
          }
        : {}),
      ...("qualifiedConditions" in immunities
        ? {
            qualifiedConditions: [...immunities.qualifiedConditions].sort(
              (left, right) => left.condition.localeCompare(right.condition),
            ),
          }
        : {}),
    }),
  };
};

const projectAuthoredStatBlockUnsafe = (
  record: SrdStatBlockRecord,
  equipmentSource: string,
): StatBlockScopedFidelityProjection => {
  const ammunitionByWeapon = parseAmmunitionByWeapon(equipmentSource);
  const procedures = authoredProcedures(record);
  const projectedProcedures = projectAuthoredProcedures(
    record,
    ammunitionByWeapon,
  );
  const referencedResourceOrdinals = new Set(
    procedures.flatMap(({ entry }) => entryReferencedResourceOrdinals(entry)),
  );
  const legendaryActionUses = projectLegendaryActionUses(record);
  const resistances = record.statBlock.resistances;
  return {
    generalFacts: {
      challengeRating: record.challengeRating,
      sizeAndSwarm:
        record.statBlock.swarm === undefined
          ? { size: record.statBlock.size }
          : {
              size: record.statBlock.size,
              swarm: record.statBlock.swarm,
            },
      creatureType: record.statBlock.creatureType,
      creatureTypeTags: sortedStrings(record.statBlock.creatureTypeTags ?? []),
      alignment: record.statBlock.alignment,
      ac: {
        ...record.statBlock.ac.value,
        annotations: record.statBlock.ac.annotations ?? [],
      },
      hp: record.statBlock.hp,
      speeds: record.statBlock.speeds,
      abilityScores: record.statBlock.abilityScores,
      initiative: record.statBlock.initiative,
      savingThrowModifiers: sortedModifiers(
        (record.statBlock.savingThrowModifiers ?? []).map(
          ({ ability, modifier }) => ({ name: ability, modifier }),
        ),
      ),
      saveProficiencies: sortedStrings(
        record.statBlock.saveProficiencies ?? [],
      ),
      skillModifiers: sortedModifiers(
        (record.statBlock.skillModifiers ?? []).map(({ skill, modifier }) => ({
          name: skill,
          modifier,
        })),
      ),
      vulnerabilities: projectVulnerabilities(record),
      resistances:
        resistances === undefined
          ? { kind: "none" as const }
          : Match.value(resistances).pipe(
              Match.when({ kind: "fixed" }, (fixed) => ({
                kind: "fixed" as const,
                damageTypes: sortedNonEmptyStrings(
                  fixed.damageTypes,
                  `${record.name} resistance damage type`,
                ),
              })),
              Match.when({ kind: "choose_one_from" }, (chosen) => ({
                kind: "choose_one_from" as const,
                options: sortedNonEmptyStrings(
                  chosen.options,
                  `${record.name} resistance option`,
                ),
              })),
              Match.exhaustive,
            ),
      immunities: projectImmunities(record),
      senses: [...(record.statBlock.senses ?? [])].sort((left, right) =>
        left.kind.localeCompare(right.kind),
      ),
      passivePerception: record.statBlock.passivePerception,
      gear: [...(record.statBlock.gear ?? [])]
        .map((gear) => ({ item: gear.item, quantity: gear.quantity ?? 1 }))
        .sort((left, right) => left.item.localeCompare(right.item)),
      communication: record.statBlock.communication,
      ...(legendaryActionUses === undefined ? {} : { legendaryActionUses }),
    },
    resources: [
      ...procedureResourceLimits(projectedProcedures),
      ...(record.statBlock.resources ?? [])
        .filter((resource) => !referencedResourceOrdinals.has(resource.ordinal))
        .map((resource) => projectResource(resource)),
    ],
    entryNames: [
      ...(record.statBlock.traits ?? []).map((trait) => `Traits/${trait.name}`),
      ...procedures.map(
        ({ section, entry }) =>
          `${section}/${normalizedProcedureName(procedureName(entry))}`,
      ),
    ],
    traits: (record.statBlock.traits ?? []).map((trait) =>
      Schema.decodeUnknownSync(CreatureTraitSchema)({
        ...trait,
        description: normalizedProse(trait.description),
      }),
    ),
    textOnlyProcedures: procedures.flatMap(({ section, entry }) =>
      projectTextOnlyEvidence(section, entry),
    ),
    procedures: projectedProcedures,
  };
};

export type StatBlockScopedProjectionFailure =
  | {
      readonly tag: "source-path-mismatch";
      readonly suppliedSourcePath: SrdStatBlockSourceOccurrence["anchor"]["sourcePath"];
      readonly occurrenceSourcePath: SrdStatBlockSourceOccurrence["anchor"]["sourcePath"];
    }
  | {
      readonly tag: "projection-error";
      readonly errorName: string;
      readonly message: string;
    }
  | {
      readonly tag: "projection-invalid";
      readonly message: string;
    };

export type StatBlockScopedProjectionResult =
  | {
      readonly tag: "projected";
      readonly projection: StatBlockScopedFidelityProjection;
    }
  | {
      readonly tag: "failed";
      readonly failure: StatBlockScopedProjectionFailure;
    };

function projectionResult(
  project: () => StatBlockScopedFidelityProjection,
): StatBlockScopedProjectionResult {
  try {
    const projection = project();
    const decoded = Schema.decodeUnknownEither(
      StatBlockScopedFidelityProjectionSchema,
    )(projection);
    return Either.isLeft(decoded)
      ? {
          tag: "failed",
          failure: {
            tag: "projection-invalid",
            message: String(decoded.left),
          },
        }
      : { tag: "projected", projection };
  } catch (error) {
    return error instanceof Error
      ? {
          tag: "failed",
          failure: {
            tag: "projection-error",
            errorName: error.name,
            message: error.message,
          },
        }
      : {
          tag: "failed",
          failure: {
            tag: "projection-error",
            errorName: "NonErrorThrownValue",
            message: String(error),
          },
        };
  }
}

export function projectRawStatBlock(
  source: {
    readonly sourcePath: SrdStatBlockSourceOccurrence["anchor"]["sourcePath"];
    readonly contents: string;
  },
  occurrence: SrdStatBlockSourceOccurrence,
  equipmentSource: string,
): StatBlockScopedProjectionResult {
  if (source.sourcePath !== occurrence.anchor.sourcePath) {
    return {
      tag: "failed",
      failure: {
        tag: "source-path-mismatch",
        suppliedSourcePath: source.sourcePath,
        occurrenceSourcePath: occurrence.anchor.sourcePath,
      },
    };
  }
  return projectionResult(() =>
    projectRawStatBlockUnsafe(source.contents, occurrence, equipmentSource),
  );
}

export function projectAuthoredStatBlock(
  record: SrdStatBlockRecord,
  equipmentSource: string,
): StatBlockScopedProjectionResult {
  return projectionResult(() =>
    projectAuthoredStatBlockUnsafe(record, equipmentSource),
  );
}
