import { Either, Match, Schema } from "effect";

import {
  ABILITIES,
  ALIGNMENT_MORALITIES,
  ALIGNMENT_ORDERS,
  SPEED_TYPES,
} from "@dnd/shared/game-facts";
import {
  DAMAGE_TYPES,
  DamageDieSizeSchema,
  SIZES,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type { SrdStatBlockSourceOccurrence } from "./stat-block-parity-observation.ts";
import {
  AbilitySchema,
  ChallengeRatingSchema,
  ConditionSchema,
  CreatureTypeSchema,
  CreatureSavingThrowModifiersSchema,
  CreatureSkillModifierSchema,
  CreatureResistanceListSchema,
  CreatureVulnerabilityListSchema,
  DamageTypeSchema,
  SizeSchema,
  StandaloneStatBlockSpeedEntrySchema,
  StandaloneStatBlockSizeAndSwarmSchema,
  StandaloneCreatureSenseSchema,
  StandaloneStatBlockAbilityScoresSchema,
  StandaloneStatBlockCreatureTypeTagsSchema,
  StandaloneStatBlockValueSchema,
  StatBlockAlignmentSchema,
  StatBlockArmorClassSchema,
  StatBlockCommunicationSchema,
  StatBlockGearEntrySchema,
  StatBlockInitiativeSchema,
  StatBlockPassivePerceptionSchema,
  StatBlockTextOnlyReasonSchema,
  CreatureTraitSchema,
  CreatureImmunityListSchema,
} from "./schema.ts";
import {
  exactOptional,
  ForbiddenValueSchema,
  nonEmpty,
  strictStruct,
} from "./schema-helpers.ts";
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
  type CreatureSkillModifier,
  type DamageType,
  type SrdStatBlockRecord,
  type StandaloneStatBlockSpeedEntry,
  type StatBlockCommunication,
  type StatBlockProcedureEntry,
} from "./types.ts";

/**
 * Identity-free projector for comparing parser-bounded local SRD spans with
 * authored Stat Blocks. Hit Dice are deliberately outside this projection;
 * the current Surface Stat Block boundary owns only the printed HP average.
 */

const ABILITY_NAMES = ABILITIES;
const ATTACK_ABILITY_NAMES = ["str", "dex", "int", "wis", "cha"] as const;
type AttackAbility = (typeof ATTACK_ABILITY_NAMES)[number];
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

export type StatBlockScopedProjectionEvidenceAnchor =
  | {
      readonly kind: "raw";
      readonly sourcePath: SrdStatBlockSourceOccurrence["anchor"]["sourcePath"];
      readonly heading: string;
      readonly lineStart: number;
      readonly lineEnd: number;
      readonly field: string;
    }
  | {
      readonly kind: "authored";
      readonly statBlockId: SrdStatBlockRecord["id"];
      readonly name: string;
      readonly field: string;
    };

export type StatBlockScopedProjectionIssue =
  | {
      readonly kind: "missing-required-evidence";
      readonly anchor: StatBlockScopedProjectionEvidenceAnchor;
      readonly expected: string;
    }
  | {
      readonly kind: "malformed-evidence";
      readonly anchor: StatBlockScopedProjectionEvidenceAnchor;
      readonly evidence: string;
      readonly expected: string;
    }
  | {
      readonly kind: "unsupported-evidence";
      readonly anchor: StatBlockScopedProjectionEvidenceAnchor;
      readonly evidence: string;
      readonly supported: string;
    }
  | {
      readonly kind: "unresolved-reference";
      readonly anchor: StatBlockScopedProjectionEvidenceAnchor;
      readonly reference: string;
    }
  | {
      readonly kind: "projection-schema-rejected";
      readonly anchor: StatBlockScopedProjectionEvidenceAnchor;
      readonly message: string;
    };

type ProjectionIssueContext = {
  readonly anchor:
    | Omit<
        Extract<
          StatBlockScopedProjectionEvidenceAnchor,
          { readonly kind: "raw" }
        >,
        "field"
      >
    | Omit<
        Extract<
          StatBlockScopedProjectionEvidenceAnchor,
          { readonly kind: "authored" }
        >,
        "field"
      >;
  readonly issues: StatBlockScopedProjectionIssue[];
};

const issueAnchor = (
  context: ProjectionIssueContext,
  field: string,
): StatBlockScopedProjectionEvidenceAnchor => {
  return Match.value(context.anchor).pipe(
    Match.when({ kind: "raw" }, (anchor) => ({ ...anchor, field })),
    Match.when({ kind: "authored" }, (anchor) => ({ ...anchor, field })),
    Match.exhaustive,
  );
};

const recordIssue = <Value>(
  context: ProjectionIssueContext,
  issue: StatBlockScopedProjectionIssue,
  dependencyFallback: Value,
): Value => {
  context.issues.push(issue);
  return dependencyFallback;
};

const missingEvidence = <Value>(
  context: ProjectionIssueContext,
  field: string,
  expected: string,
  dependencyFallback: Value,
): Value =>
  recordIssue(
    context,
    {
      kind: "missing-required-evidence",
      anchor: issueAnchor(context, field),
      expected,
    },
    dependencyFallback,
  );

const malformedEvidence = <Value>(
  context: ProjectionIssueContext,
  field: string,
  evidence: string,
  expected: string,
  dependencyFallback: Value,
): Value =>
  recordIssue(
    context,
    {
      kind: "malformed-evidence",
      anchor: issueAnchor(context, field),
      evidence,
      expected,
    },
    dependencyFallback,
  );

const unsupportedEvidence = <Value>(
  context: ProjectionIssueContext,
  field: string,
  evidence: string,
  supported: string,
  dependencyFallback: Value,
): Value =>
  recordIssue(
    context,
    {
      kind: "unsupported-evidence",
      anchor: issueAnchor(context, field),
      evidence,
      supported,
    },
    dependencyFallback,
  );

const unresolvedReference = <Value>(
  context: ProjectionIssueContext,
  field: string,
  reference: string,
  dependencyFallback: Value,
): Value =>
  recordIssue(
    context,
    {
      kind: "unresolved-reference",
      anchor: issueAnchor(context, field),
      reference,
    },
    dependencyFallback,
  );

const assess = <Value>(
  context: ProjectionIssueContext,
  project: () => Value,
): Value | undefined => {
  const issueCount = context.issues.length;
  const value = project();
  return context.issues.length === issueCount ? value : undefined;
};

const decodeProjectionValue = <Value, Encoded>(
  context: ProjectionIssueContext,
  schema: Schema.Schema<Value, Encoded, never>,
  candidate: unknown,
  field: string,
  dependencyFallback: Value,
): Value => {
  const decoded = Schema.decodeUnknownEither(schema)(candidate);
  return Either.isRight(decoded)
    ? decoded.right
    : malformedEvidence(
        context,
        field,
        String(decoded.left),
        "canonical Surface domain value",
        dependencyFallback,
      );
};

const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(1),
);
const SignedIntegerSchema = Schema.Number.pipe(Schema.int());
const NonEmptyStringSchema = Schema.NonEmptyTrimmedString;
const ProcedureSectionSchema = Schema.Literal(...PROCEDURE_SECTIONS);
const AttackAbilitySchema = Schema.Literal(...ATTACK_ABILITY_NAMES);
const DEPENDENCY_FALLBACK_IMMUNITY = Schema.decodeUnknownSync(
  CreatureImmunityListSchema,
)({ conditions: ["blinded"] });

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
    kind: Schema.Literal("static"),
    static: PositiveIntegerSchema,
    expr: exactOptional(ForbiddenValueSchema),
  }),
  strictStruct({
    kind: Schema.Literal("dice_expression"),
    static: PositiveIntegerSchema,
    expr: strictStruct({
      dice: PositiveIntegerSchema,
      dieSize: DamageDieSizeSchema,
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
    candidates: Schema.Tuple(
      [AttackAbilitySchema, AttackAbilitySchema],
      AttackAbilitySchema,
    ).pipe(
      Schema.filter(
        (candidates) => new Set(candidates).size === candidates.length,
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
    rangeFeet: exactOptional(ForbiddenValueSchema),
    ammunition: exactOptional(ForbiddenValueSchema),
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
    reachFeet: exactOptional(ForbiddenValueSchema),
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

const VulnerabilityProjectionSchema = Schema.Union(
  strictStruct({ kind: Schema.Literal("none") }),
  CreatureVulnerabilityListSchema,
);
const ResistanceProjectionSchema = Schema.Union(
  strictStruct({ kind: Schema.Literal("none") }),
  CreatureResistanceListSchema,
);

export const StatBlockScopedFidelityProjectionSchema = strictStruct({
  generalFacts: strictStruct({
    challengeRating: ChallengeRatingSchema,
    sizeAndSwarm: StandaloneStatBlockSizeAndSwarmSchema,
    creatureType: CreatureTypeSchema,
    creatureTypeTags: Schema.Union(
      Schema.Tuple(),
      StandaloneStatBlockCreatureTypeTagsSchema,
    ),
    alignment: StatBlockAlignmentSchema,
    ac: StatBlockArmorClassSchema,
    hp: StandaloneStatBlockValueSchema,
    speeds: nonEmpty(StandaloneStatBlockSpeedEntrySchema),
    abilityScores: StandaloneStatBlockAbilityScoresSchema,
    initiative: StatBlockInitiativeSchema,
    savingThrowModifiers: Schema.Union(
      Schema.Tuple(),
      CreatureSavingThrowModifiersSchema,
    ),
    saveProficiencies: Schema.Array(AbilitySchema),
    skillModifiers: Schema.Array(CreatureSkillModifierSchema),
    vulnerabilities: VulnerabilityProjectionSchema,
    resistances: ResistanceProjectionSchema,
    immunities: Schema.Union(
      strictStruct({ kind: Schema.Literal("none") }),
      strictStruct({
        kind: Schema.Literal("some"),
        value: CreatureImmunityListSchema,
      }),
    ),
    senses: Schema.Union(
      Schema.Tuple(),
      nonEmpty(StandaloneCreatureSenseSchema),
    ),
    passivePerception: StatBlockPassivePerceptionSchema,
    gear: Schema.Union(Schema.Tuple(), nonEmpty(StatBlockGearEntrySchema)),
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
}).pipe(
  Schema.filter(
    (projection) =>
      (projection.generalFacts.legendaryActionUses !== undefined) ===
      projection.procedures.some(
        ({ section }) => section === "Legendary Actions",
      ),
    {
      message: () =>
        "Legendary Action uses and a nonempty Legendary Action section must occur together.",
    },
  ),
);

export type StatBlockScopedFidelityProjection = Schema.Schema.Type<
  typeof StatBlockScopedFidelityProjectionSchema
>;

type ScopedGeneralFacts = StatBlockScopedFidelityProjection["generalFacts"];
type ProcedureProjection =
  StatBlockScopedFidelityProjection["procedures"][number];
type StructuralProcedure = Exclude<
  ProcedureProjection,
  { readonly kind: "textOnly" }
>;
type ResourceLimitProjection =
  StatBlockScopedFidelityProjection["resources"][number];
type DamageProjection = Extract<
  Extract<
    ProcedureProjection,
    { readonly kind: "attack_roll" }
  >["onHit"][number],
  { readonly kind: "damage" }
>;
type DamageAmountProjection = DamageProjection["amount"];
type AttackEffectProjection = Extract<
  ProcedureProjection,
  { readonly kind: "attack_roll" }
>["onHit"][number];
type AttackAbilityEvidence = Extract<
  ProcedureProjection,
  { readonly kind: "attack_roll" }
>["attackAbilityEvidence"];
type ResistanceProjection = ScopedGeneralFacts["resistances"];
type SpellcastingProcedure = Extract<
  ProcedureProjection,
  { readonly kind: "spellcasting" }
>;
type SpellcastingGroupProjection = SpellcastingProcedure["groups"][number];
type SpellProjection = SpellcastingGroupProjection["spells"][number];

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
  context: ProjectionIssueContext,
  value: string,
  pattern: RegExp,
  field: string,
): RegExpMatchArray | readonly [] => {
  const match = value.match(pattern);
  if (match === null) {
    return malformedEvidence(context, field, value, pattern.source, []);
  }
  return match;
};

const requireLine = (
  context: ProjectionIssueContext,
  lines: readonly string[],
  prefix: string,
  field: string,
): string => {
  const line = lines.find((candidate) => candidate.startsWith(prefix));
  if (line === undefined) {
    return missingEvidence(context, field, `line beginning ${prefix}`, "");
  }
  return line;
};

const requireLineMatch = (
  context: ProjectionIssueContext,
  lines: readonly string[],
  prefix: string,
  pattern: RegExp,
  field: string,
): RegExpMatchArray | readonly [] => {
  const line = assess(context, () =>
    requireLine(context, lines, prefix, field),
  );
  return line === undefined ? [] : requireMatch(context, line, pattern, field);
};

const sortedStrings = <Value extends string>(
  values: readonly Value[],
): readonly Value[] =>
  [...values].sort((left, right) => left.localeCompare(right));

const sortedNonEmptyStrings = <Value extends string>(
  issueContext: ProjectionIssueContext,
  values: readonly Value[],
  field: string,
  dependencyFallback: Value,
): ReadonlyNonEmptyArray<Value> => {
  const sorted = sortedStrings(values);
  const [first, ...rest] = sorted;
  if (first === undefined || first.length === 0) {
    return missingEvidence(issueContext, field, "at least one nonempty value", [
      dependencyFallback,
    ]);
  }
  if (rest.some((value) => value.length === 0)) {
    return malformedEvidence(
      issueContext,
      field,
      JSON.stringify(values),
      "only nonempty values",
      [first],
    );
  }
  return [first, ...rest];
};

const nonEmptyValues = <Value>(
  issueContext: ProjectionIssueContext,
  values: readonly Value[],
  field: string,
  dependencyFallback: Value,
): ReadonlyNonEmptyArray<Value> => {
  const [first, ...rest] = values;
  if (first === undefined) {
    return missingEvidence(issueContext, field, "at least one value", [
      dependencyFallback,
    ]);
  }
  return [first, ...rest];
};

const parsedLiteral = <Value extends string>(
  issueContext: ProjectionIssueContext,
  values: readonly [Value, ...Value[]],
  candidate: string,
  field: string,
): Value => {
  const value = values.find((entry) => entry === candidate);
  if (value === undefined) {
    const fallback = values[0];
    return unsupportedEvidence(
      issueContext,
      field,
      candidate,
      values.join(", "),
      fallback,
    );
  }
  return value;
};

const sortedByDomainName = <Value>(
  values: readonly Value[],
  domainName: (value: Value) => string,
): readonly Value[] =>
  [...values].sort((left, right) =>
    domainName(left).localeCompare(domainName(right)),
  );

const sortedAbsentOrNonEmpty = <Value>(
  values: readonly Value[],
  domainName: (value: Value) => string,
): readonly [] | ReadonlyNonEmptyArray<Value> => {
  const sorted = sortedByDomainName(values, domainName);
  const [first, ...rest] = sorted;
  return first === undefined ? [] : [first, ...rest];
};

const parseMetadata = (
  issueContext: ProjectionIssueContext,
  lines: readonly string[],
  contextLabel: string,
): Pick<
  ScopedGeneralFacts,
  "sizeAndSwarm" | "creatureType" | "creatureTypeTags" | "alignment"
> => {
  const dependencyFallback = {
    sizeAndSwarm: { size: "medium" as const },
    creatureType: "beast" as const,
    creatureTypeTags: [] as const,
    alignment: "unaligned" as const,
  };
  const metadataLine = lines.find(
    (line) => line.startsWith("*") && !line.startsWith("**"),
  );
  if (metadataLine === undefined) {
    return missingEvidence(
      issueContext,
      "metadata",
      `${contextLabel} creature metadata`,
      dependencyFallback,
    );
  }
  const metadata = assess(issueContext, () =>
    requireMatch(
      issueContext,
      metadataLine,
      /^\*(.+?) ([A-Za-z]+)(?: \(([^)]+)\))?, (.+)\*$/,
      "metadata",
    ),
  );
  if (metadata === undefined) return dependencyFallback;
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
              parsedLiteral(issueContext, SIZES, option.toLowerCase(), "size"),
            );
          const [first, second, ...rest] = options;
          if (first === undefined || second === undefined) {
            return missingEvidence(
              issueContext,
              "size",
              `${contextLabel} Size alternatives require at least two sizes`,
              "medium" as const,
            );
          }
          return { kind: "alternatives", options: [first, second, ...rest] };
        })()
      : parsedLiteral(
          issueContext,
          SIZES,
          creatureSizeText.toLowerCase(),
          "size",
        );
  const alignment =
    alignmentText === "Unaligned"
      ? ("unaligned" as const)
      : alignmentText === "Neutral"
        ? ({ order: "neutral", morality: "neutral" } as const)
        : (() => {
            const parts = alignmentText.toLowerCase().split(" ");
            if (parts.length !== 2) {
              return malformedEvidence(
                issueContext,
                "alignment",
                alignmentText,
                "order and morality",
                { order: "neutral" as const, morality: "neutral" as const },
              );
            }
            return {
              order: parsedLiteral(
                issueContext,
                ALIGNMENT_ORDERS,
                parts[0] ?? "",
                "alignment.order",
              ),
              morality: parsedLiteral(
                issueContext,
                ALIGNMENT_MORALITIES,
                parts[1] ?? "",
                "alignment.morality",
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
              return unsupportedEvidence(
                issueContext,
                "swarm",
                `${creatureSizeText} Swarm of ${swarmMetadata[2]}`,
                "Medium or Large Swarm of Tiny creatures",
                { size: "medium" as const },
              );
            })(),
    creatureType:
      swarmMetadata === null
        ? parsedLiteral(
            issueContext,
            CREATURE_TYPES,
            authoredCreatureType,
            "creatureType",
          )
        : authoredCreatureType === "beasts"
          ? "beast"
          : authoredCreatureType === "undead"
            ? "undead"
            : (() => {
                return unsupportedEvidence(
                  issueContext,
                  "creatureType",
                  authoredCreatureType,
                  "beasts or undead",
                  "beast" as const,
                );
              })(),
    creatureTypeTags:
      metadata[3] === undefined ? [] : [metadata[3].toLowerCase()],
    alignment,
  };
};

const parseSpeeds = (
  issueContext: ProjectionIssueContext,
  lines: readonly string[],
  contextLabel: string,
): ScopedGeneralFacts["speeds"] => {
  const speedLine = assess(issueContext, () =>
    requireLine(issueContext, lines, "**Speed**", "speeds"),
  );
  if (speedLine === undefined) {
    return [{ kind: "walk", feet: { kind: "literal", value: 1 } }];
  }
  const speeds = speedLine
    .replace("**Speed**", "")
    .trim()
    .split(", ")
    .flatMap((part, index) => {
      const field = `speeds.${index}`;
      const projected = assess(
        issueContext,
        (): StandaloneStatBlockSpeedEntry => {
          const gmChoice = part.match(
            /^((?:Burrow|Climb|Fly|Swim|Walk)(?: or (?:Burrow|Climb|Fly|Swim|Walk))+)(?: )(\d+) ft\. \(GM's choice\)$/,
          );
          if (gmChoice !== null) {
            const feet = Number(gmChoice[2]);
            const alternativeIssueCount = issueContext.issues.length;
            const alternatives = (gmChoice[1] ?? "")
              .split(" or ")
              .map((kind, alternativeIndex) => ({
                kind: parsedLiteral(
                  issueContext,
                  SPEED_TYPES,
                  kind.toLowerCase(),
                  `${field}.gmChoice.${alternativeIndex}`,
                ),
                feet: { kind: "literal" as const, value: feet },
              }));
            if (issueContext.issues.length > alternativeIssueCount) {
              return { kind: "walk", feet: { kind: "literal", value: 1 } };
            }
            const [first, second, ...rest] = alternatives;
            if (first === undefined || second === undefined) {
              return missingEvidence(
                issueContext,
                `${field}.gmChoice`,
                `${contextLabel} GM Speed choice requires two alternatives`,
                {
                  kind: "walk" as const,
                  feet: { kind: "literal" as const, value: feet },
                },
              );
            }
            return decodeProjectionValue(
              issueContext,
              StandaloneStatBlockSpeedEntrySchema,
              {
                kind: "gm_choice",
                alternatives: [first, second, ...rest],
              },
              `${field}.gmChoice`,
              { kind: "walk", feet: { kind: "literal", value: 1 } },
            );
          }
          const speed = assess(issueContext, () =>
            requireMatch(
              issueContext,
              part,
              /^(?:(Burrow|Climb|Fly|Swim) )?(\d+) ft\.(?: \((hover|[A-Za-z]+(?: or [A-Za-z]+)* form only)\))?$/,
              field,
            ),
          );
          if (speed === undefined) {
            return { kind: "walk", feet: { kind: "literal", value: 1 } };
          }
          const qualifier = speed[3];
          const kind = parsedLiteral(
            issueContext,
            SPEED_TYPES,
            (speed[1] ?? "walk").toLowerCase(),
            `${field}.kind`,
          );
          const availability =
            qualifier === undefined || qualifier === "hover"
              ? {}
              : {
                  availability: {
                    kind: "forms_only" as const,
                    forms: sortedNonEmptyStrings(
                      issueContext,
                      qualifier
                        .replace(/ form only$/, "")
                        .split(" or ")
                        .map((form) => form.toLowerCase()),
                      `${field}.forms`,
                      "base",
                    ),
                  },
                };
          const decodeNonFly = () =>
            decodeProjectionValue(
              issueContext,
              StandaloneStatBlockSpeedEntrySchema,
              {
                kind,
                feet: { kind: "literal", value: Number(speed[2]) },
                ...availability,
              },
              field,
              { kind: "walk", feet: { kind: "literal", value: 1 } },
            );
          return Match.value(kind).pipe(
            Match.when("fly", () =>
              decodeProjectionValue(
                issueContext,
                StandaloneStatBlockSpeedEntrySchema,
                {
                  kind,
                  feet: { kind: "literal", value: Number(speed[2]) },
                  ...(qualifier === "hover" ? { hover: true as const } : {}),
                  ...availability,
                },
                field,
                { kind: "fly", feet: { kind: "literal", value: 1 } },
              ),
            ),
            Match.when("walk", decodeNonFly),
            Match.when("burrow", decodeNonFly),
            Match.when("climb", decodeNonFly),
            Match.when("swim", decodeNonFly),
            Match.exhaustive,
          );
        },
      );
      return projected === undefined ? [] : [projected];
    });
  const [first, ...rest] = speeds;
  if (first === undefined) {
    return missingEvidence(issueContext, "speeds", `${contextLabel} Speed`, [
      { kind: "walk", feet: { kind: "literal", value: 1 } },
    ]);
  }
  return [first, ...rest];
};

const parseAbilityRow = (
  issueContext: ProjectionIssueContext,
  lines: readonly string[],
  label: "Score" | "Save",
  contextLabel: string,
): readonly number[] => {
  const field = `abilityScores.${label.toLowerCase()}`;
  const row = assess(issueContext, () =>
    requireLine(issueContext, lines, `| **${label}**`, field),
  );
  if (row === undefined) return [0, 0, 0, 0, 0, 0];
  const values = row
    .split("|")
    .slice(2, 8)
    .map((value) => signedNumber(value.trim()));
  if (values.length !== ABILITY_NAMES.length) {
    return malformedEvidence(
      issueContext,
      field,
      JSON.stringify(values),
      `six ${contextLabel} ${label} values`,
      [0, 0, 0, 0, 0, 0],
    );
  }
  return values;
};

const abilityRecord = (
  issueContext: ProjectionIssueContext,
  values: readonly number[],
  field: string,
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
    return malformedEvidence(
      issueContext,
      field,
      JSON.stringify(values),
      "exactly six finite ability values",
      { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    );
  }
  return { str, dex, con, int, wis, cha };
};

const isAbility = (value: string): value is Ability =>
  ABILITY_NAMES.some((ability) => ability === value);

const parseAbilityMatrixNumber = (
  issueContext: ProjectionIssueContext,
  value: string,
  pattern: RegExp,
  field: string,
): number => {
  if (!pattern.test(value)) {
    return malformedEvidence(issueContext, field, value, pattern.source, 0);
  }
  return signedNumber(value);
};

const parseAbilityMatrixGroup = (
  issueContext: ProjectionIssueContext,
  cells: readonly [string, string, string, string],
  factIndex: number,
): AbilityMatrixFact => {
  const [rawAbility, rawScore, rawModifier, rawSaveModifier] = cells;
  const field = `abilityScores.matrix.${factIndex}`;
  const abilityCandidate = rawAbility.replaceAll("*", "").toLowerCase();
  const ability = isAbility(abilityCandidate)
    ? abilityCandidate
    : unsupportedEvidence(
        issueContext,
        `${field}.label`,
        rawAbility,
        ABILITY_NAMES.join(", "),
        "str" as const,
      );
  return {
    ability,
    score: parseAbilityMatrixNumber(
      issueContext,
      rawScore,
      /^\d+$/,
      `${field}.score`,
    ),
    modifier: parseAbilityMatrixNumber(
      issueContext,
      rawModifier,
      /^[+−-]?\d+$/,
      `${field}.modifier`,
    ),
    saveModifier: parseAbilityMatrixNumber(
      issueContext,
      rawSaveModifier,
      /^[+−-]?\d+$/,
      `${field}.saveModifier`,
    ),
  };
};

const parseAbilityMatrix = (
  issueContext: ProjectionIssueContext,
  lines: readonly string[],
  contextLabel: string,
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
    return malformedEvidence(
      issueContext,
      "abilityScores.matrix",
      JSON.stringify(rows),
      `exactly two ${contextLabel} ability matrix rows`,
      undefined,
    );
  }

  const matrixIssueCount = issueContext.issues.length;
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
      return malformedEvidence(
        issueContext,
        `abilityScores.matrix.${rowIndex}`,
        JSON.stringify(expandedCells),
        `twelve nonempty ${contextLabel} cells`,
        [],
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
      return malformedEvidence(
        issueContext,
        `abilityScores.matrix.${rowIndex}`,
        JSON.stringify(expandedCells),
        `complete ${contextLabel} ability matrix row`,
        [],
      );
    }
    return [
      parseAbilityMatrixGroup(
        issueContext,
        [ability1, score1, modifier1, saveModifier1],
        rowIndex * 3,
      ),
      parseAbilityMatrixGroup(
        issueContext,
        [ability2, score2, modifier2, saveModifier2],
        rowIndex * 3 + 1,
      ),
      parseAbilityMatrixGroup(
        issueContext,
        [ability3, score3, modifier3, saveModifier3],
        rowIndex * 3 + 2,
      ),
    ];
  });
  if (issueContext.issues.length > matrixIssueCount) return undefined;
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
    return malformedEvidence(
      issueContext,
      "abilityScores.matrix.labels",
      JSON.stringify(facts.map(({ ability }) => ability)),
      `${contextLabel} labels in STR, DEX, CON, INT, WIS, CHA order`,
      undefined,
    );
  }
  return [str, dex, con, int, wis, cha];
};

const parseAbilityScores = (
  issueContext: ProjectionIssueContext,
  lines: readonly string[],
  contextLabel: string,
): Readonly<Record<Ability, number>> => {
  if (lines.some((line) => line.startsWith("| **Score**"))) {
    return abilityRecord(
      issueContext,
      parseAbilityRow(issueContext, lines, "Score", contextLabel),
      "abilityScores",
    );
  }
  const matrixIssueCount = issueContext.issues.length;
  const abilityMatrix = parseAbilityMatrix(issueContext, lines, contextLabel);
  if (issueContext.issues.length > matrixIssueCount) {
    return { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  }
  if (abilityMatrix !== undefined) {
    return abilityRecord(
      issueContext,
      abilityMatrix.map(({ score }) => score),
      "abilityScores",
    );
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
    return missingEvidence(
      issueContext,
      "abilityScores",
      `six ${contextLabel} ability scores`,
      { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    );
  }
  return abilityRecord(
    issueContext,
    scoreCells.map((cell) =>
      Number(requireMatch(issueContext, cell, /^(\d+)/, "abilityScores")[1]),
    ),
    "abilityScores",
  );
};

const parseSavingThrowModifiers = (
  issueContext: ProjectionIssueContext,
  lines: readonly string[],
  contextLabel: string,
): ScopedGeneralFacts["savingThrowModifiers"] => {
  if (lines.some((line) => line.startsWith("| **Save**"))) {
    const saveValues = abilityRecord(
      issueContext,
      parseAbilityRow(issueContext, lines, "Save", contextLabel),
      "savingThrowModifiers",
    );
    return sortedAbsentOrNonEmpty(
      ABILITY_NAMES.map((ability) => ({
        ability,
        modifier: saveValues[ability],
      })),
      ({ ability }) => ability,
    );
  }
  const abilityMatrix = parseAbilityMatrix(issueContext, lines, contextLabel);
  if (abilityMatrix !== undefined) {
    return sortedAbsentOrNonEmpty(
      abilityMatrix.map(({ ability, saveModifier }) => ({
        ability,
        modifier: saveModifier,
      })),
      ({ ability }) => ability,
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
      issueContext,
      combinedCells.map((cell) => {
        const match = requireMatch(
          issueContext,
          cell,
          / Save ([+−-]?\d+)$/,
          "savingThrowModifiers",
        );
        const value = match[1];
        if (value === undefined) {
          return missingEvidence(
            issueContext,
            "savingThrowModifiers",
            `${contextLabel} Save modifier`,
            0,
          );
        }
        return signedNumber(value);
      }),
      "savingThrowModifiers",
    );
    return sortedAbsentOrNonEmpty(
      ABILITY_NAMES.map((ability) => ({
        ability,
        modifier: saveValues[ability],
      })),
      ({ ability }) => ability,
    );
  }
  const line = lines.find((candidate) => candidate.startsWith("**Saves**"));
  if (line === undefined) return [];
  return sortedAbsentOrNonEmpty(
    line
      .replace("**Saves**", "")
      .trim()
      .split(", ")
      .flatMap((part, index) => {
        const field = `savingThrowModifiers.${index}`;
        const modifier = assess(issueContext, () =>
          requireMatch(
            issueContext,
            part,
            /^(STR|DEX|CON|INT|WIS|CHA) ([+−-]?\d+)(?: \([^)]*\))?$/,
            field,
          ),
        );
        if (modifier === undefined) return [];
        const projected = assess(issueContext, () => ({
          ability: parsedLiteral(
            issueContext,
            ABILITY_NAMES,
            (modifier[1] ?? "").toLowerCase(),
            `${field}.ability`,
          ),
          modifier: signedNumber(modifier[2] ?? ""),
        }));
        return projected === undefined ? [] : [projected];
      }),
    ({ ability }) => ability,
  );
};

const parseNamedModifiers = (
  issueContext: ProjectionIssueContext,
  lines: readonly string[],
  label: "Skills",
): readonly CreatureSkillModifier[] => {
  const line = lines.find((candidate) => candidate.startsWith(`**${label}**`));
  if (line === undefined) {
    return [];
  }
  return sortedByDomainName(
    line
      .replace(`**${label}**`, "")
      .trim()
      .split(", ")
      .flatMap((part, index) => {
        const field = `skillModifiers.${index}`;
        const modifier = assess(issueContext, () =>
          requireMatch(issueContext, part, /^(.+?) ([+−-]?\d+)$/, field),
        );
        if (modifier === undefined) return [];
        const projected = assess(issueContext, () => ({
          skill: parsedLiteral(
            issueContext,
            SKILLS,
            normalizedIdentifier(modifier[1] ?? ""),
            `${field}.skill`,
          ),
          modifier: signedNumber(modifier[2] ?? ""),
        }));
        return projected === undefined ? [] : [projected];
      }),
    ({ skill }) => skill,
  );
};

const parseVulnerabilities = (
  issueContext: ProjectionIssueContext,
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
          issueContext,
          value
            .split(", ")
            .map((item, index) =>
              parsedLiteral(
                issueContext,
                DAMAGE_TYPES,
                item.toLowerCase(),
                `vulnerabilities.damageTypes.${index}`,
              ),
            ),
          "vulnerabilities.damageTypes",
          "acid",
        ),
      }
    : {
        kind: "qualified",
        damageTypes: sortedNonEmptyStrings(
          issueContext,
          [
            parsedLiteral(
              issueContext,
              DAMAGE_TYPES,
              (qualified[1] ?? "").toLowerCase(),
              "vulnerabilities.damageType",
            ),
          ],
          "vulnerabilities.damageTypes",
          "acid",
        ),
        qualifier: qualified[2] ?? "",
      };
};

const parseResistances = (
  issueContext: ProjectionIssueContext,
  lines: readonly string[],
): ResistanceProjection => {
  const line = lines.find((candidate) =>
    candidate.startsWith("**Resistances**"),
  );
  if (line === undefined) return { kind: "none" };
  const value = line.replace("**Resistances**", "").trim();
  const chosen = value.match(/^Damage type chosen for .+$/);
  if (chosen !== null) {
    const optionList = assess(issueContext, () =>
      requireMatch(
        issueContext,
        normalizedProse(lines.join(" ")),
        /one of the following damage types [^:]*: ([A-Za-z, ]+)\./,
        "resistances.options",
      ),
    );
    if (optionList === undefined) {
      return { kind: "choose_one_from", options: ["acid"] };
    }
    const chosenOptions = (optionList[1] ?? "")
      .split(", ")
      .map((damageType, index) =>
        parsedLiteral(
          issueContext,
          DAMAGE_TYPES,
          damageType.replace(/^or /, "").toLowerCase(),
          `resistances.options.${index}`,
        ),
      );
    return {
      kind: "choose_one_from",
      options: sortedNonEmptyStrings(
        issueContext,
        chosenOptions,
        "resistances.options",
        "acid",
      ),
    };
  }
  return {
    kind: "fixed",
    damageTypes: sortedNonEmptyStrings(
      issueContext,
      value
        .split(", ")
        .map((damageType, index) =>
          parsedLiteral(
            issueContext,
            DAMAGE_TYPES,
            damageType.toLowerCase(),
            `resistances.damageTypes.${index}`,
          ),
        ),
      "resistances.damageTypes",
      "acid",
    ),
  };
};

const parseImmunities = (
  issueContext: ProjectionIssueContext,
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
            .map((item, index) =>
              parsedLiteral(
                issueContext,
                DAMAGE_TYPES,
                item.toLowerCase(),
                `immunities.damageTypes.${index}`,
              ),
            ),
        );
  const parseConditions = (value: string) => {
    const conditions: Condition[] = [];
    const qualifiedConditions: {
      readonly condition: Condition;
      readonly qualifier: string;
    }[] = [];
    for (const [index, item] of (value === ""
      ? []
      : value.split(", ")
    ).entries()) {
      const qualified = item.match(/^([A-Za-z]+) \((.+)\)$/);
      if (qualified === null) {
        conditions.push(
          parsedLiteral(
            issueContext,
            CONDITIONS,
            item.toLowerCase(),
            `immunities.conditions.${index}`,
          ),
        );
      } else {
        qualifiedConditions.push({
          condition: parsedLiteral(
            issueContext,
            CONDITIONS,
            (qualified[1] ?? "").toLowerCase(),
            `immunities.qualifiedConditions.${index}.condition`,
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
    value: decodeProjectionValue(
      issueContext,
      CreatureImmunityListSchema,
      {
        ...(damageTypes.length === 0 ? {} : { damageTypes }),
        ...(conditions.length === 0 ? {} : { conditions }),
        ...(qualifiedConditions.length === 0 ? {} : { qualifiedConditions }),
      },
      "immunities",
      DEPENDENCY_FALLBACK_IMMUNITY,
    ),
  };
};

const parseSenses = (
  issueContext: ProjectionIssueContext,
  lines: readonly string[],
): Pick<ScopedGeneralFacts, "senses" | "passivePerception"> => {
  const senseLine = assess(issueContext, () =>
    requireLine(issueContext, lines, "**Senses**", "senses"),
  );
  if (senseLine === undefined) {
    return { senses: [], passivePerception: 1 };
  }
  const line = senseLine.replace("**Senses**", "").trim();
  const passiveMarker = "Passive Perception";
  const passiveStart = line.lastIndexOf(passiveMarker);
  const sensesText = (passiveStart === -1 ? line : line.slice(0, passiveStart))
    .replace(/;?\s*$/, "")
    .trim();
  const passive =
    passiveStart === -1
      ? missingEvidence(
          issueContext,
          "passivePerception",
          "Passive Perception clause",
          [] as const,
        )
      : assess(issueContext, () =>
          requireMatch(
            issueContext,
            line.slice(passiveStart),
            /^Passive Perception (\d+)$/,
            "passivePerception",
          ),
        );
  const senses =
    sensesText === ""
      ? []
      : sensesText.split(", ").flatMap((part, index) => {
          const field = `senses.${index}`;
          const sense = assess(issueContext, () =>
            requireMatch(
              issueContext,
              part,
              /^(Blindsight|Darkvision|Tremorsense|Truesight) (\d+) ft\.(?: \((.+)\))?$/,
              field,
            ),
          );
          if (sense === undefined) return [];
          const kind = assess(issueContext, () =>
            parsedLiteral(
              issueContext,
              ["darkvision", "blindsight", "tremorsense", "truesight"] as const,
              (sense[1] ?? "").toLowerCase(),
              `${field}.kind`,
            ),
          );
          if (kind === undefined) return [];
          const qualifier = sense[3];
          if (qualifier !== undefined) {
            if (
              kind !== "darkvision" ||
              qualifier !== "unimpeded by magical Darkness"
            ) {
              unsupportedEvidence(
                issueContext,
                `${field}.qualifier`,
                `${kind}: ${qualifier}`,
                "darkvision: unimpeded by magical Darkness",
                undefined,
              );
              return [];
            }
            return [
              {
                kind,
                rangeFeet: Number(sense[2]),
                qualifier: "unimpeded_by_magical_darkness" as const,
              },
            ];
          }
          return [{ kind, rangeFeet: Number(sense[2]) }];
        });
  return {
    senses: sortedAbsentOrNonEmpty(senses, ({ kind }) => kind),
    passivePerception: Number(passive?.[1]),
  };
};

const projectedGearItem = (item: string, quantity: number): string =>
  quantity > 1 && item.endsWith("s") ? item.slice(0, -1) : item;

const parseGear = (
  issueContext: ProjectionIssueContext,
  lines: readonly string[],
): ScopedGeneralFacts["gear"] => {
  const line = lines.find((candidate) => candidate.startsWith("**Gear**"));
  if (line === undefined) {
    return [];
  }
  const gearEntries = line
    .replace("**Gear**", "")
    .trim()
    .split(", ")
    .map((part) => {
      const gear = requireMatch(
        issueContext,
        part,
        /^(.*?)(?: \((\d+)\))?$/,
        "gear",
      );
      const quantity = Number(gear[2] ?? 1);
      const item = gear[1] ?? "";
      return {
        item: projectedGearItem(item, quantity),
        quantity,
      };
    })
    .sort((left, right) => left.item.localeCompare(right.item));
  return nonEmptyValues(issueContext, gearEntries, "gear", {
    item: "Gear",
    quantity: 1,
  });
};

const NUMBER_WORDS = [
  ["one", 1],
  ["two", 2],
  ["three", 3],
  ["four", 4],
  ["five", 5],
] as const;

const parseLanguageSet = (
  issueContext: ProjectionIssueContext,
  value: string,
): unknown => {
  if (value === "All") return { kind: "all" };
  const additional = value.match(
    /^(.+) plus (one|two|three|four|five) other languages?$/,
  );
  const languages = nonEmptyValues(
    issueContext,
    (additional?.[1] ?? value)
      .split(/, (?![^()]*\))| and /)
      .map((language) => language.replace(/^and /, "")),
    "communication.languages",
    "Common",
  );
  if (additional === null) return { kind: "named", languages };
  const additionalLanguageCount = NUMBER_WORDS.find(
    ([word]) => word === additional[2],
  )?.[1];
  if (additionalLanguageCount === undefined) {
    return unsupportedEvidence(
      issueContext,
      "communication.additionalLanguages",
      additional[2] ?? "",
      NUMBER_WORDS.map(([word]) => word).join(", "),
      { kind: "named", languages },
    );
  }
  return {
    kind: "named_plus_other_languages",
    languages,
    additionalLanguages: additionalLanguageCount,
  };
};

const parseCommunicationCandidate = (
  issueContext: ProjectionIssueContext,
  lines: readonly string[],
  contextLabel: string,
): unknown => {
  const communicationLine = assess(issueContext, () =>
    requireLine(issueContext, lines, "**Languages**", "communication"),
  );
  if (communicationLine === undefined) return { kind: "none" };
  const text = communicationLine.replace("**Languages**", "").trim();
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
      languages: parseLanguageSet(issueContext, understoodOnly[1] ?? ""),
      ...telepathy,
    };
  }
  const [spoken = "", qualifier] = withoutTelepathy.split("; ");
  if (telepathyText !== null && qualifier === undefined) {
    return {
      kind: "spoken_and_understood",
      languages: parseLanguageSet(issueContext, spoken),
      ...telepathy,
    };
  }
  if (qualifier?.startsWith("telepathy ") === true) {
    const telepathy = requireMatch(
      issueContext,
      qualifier,
      /^telepathy (\d+) ft\.(?: \((doesn't allow the receiving creature to respond telepathically|works only with creatures that understand (.+))\))?$/,
      "communication.telepathy",
    );
    return {
      kind: "spoken_and_understood",
      languages: parseLanguageSet(issueContext, spoken),
      telepathy: {
        rangeFeet: Number(telepathy[1]),
        ...(telepathy[3] === undefined
          ? {}
          : {
              requiresLanguageUnderstanding: parseLanguageSet(
                issueContext,
                telepathy[3],
              ),
            }),
        ...(telepathy[2]?.startsWith("doesn't allow") === true
          ? { response: "receiving_creature_cannot_respond" as const }
          : {}),
      },
    };
  }
  if (qualifier?.startsWith("understands ") === true) {
    const understood = requireMatch(
      issueContext,
      qualifier,
      /^understands (.+) but can't speak them$/,
      "communication.understoodLanguages",
    );
    return {
      kind: "spoken_and_understood",
      languages: parseLanguageSet(issueContext, spoken),
      additionallyUnderstoodButCannotSpeak: {
        kind: "named",
        languages: nonEmptyValues(
          issueContext,
          (understood[1] ?? "").split(/, (?:and )?| and /),
          "communication.understoodLanguages",
          "Common",
        ),
      },
    };
  }
  if (qualifier !== undefined) {
    return unsupportedEvidence(
      issueContext,
      "communication",
      text,
      `${contextLabel} supported Languages shape`,
      { kind: "none" },
    );
  }
  return {
    kind: "spoken_and_understood",
    languages: parseLanguageSet(issueContext, spoken),
  };
};

const parseCommunication = (
  issueContext: ProjectionIssueContext,
  lines: readonly string[],
  contextLabel: string,
): StatBlockCommunication => {
  const candidate = assess(issueContext, () =>
    parseCommunicationCandidate(issueContext, lines, contextLabel),
  );
  if (candidate === undefined) return { kind: "none" };
  return Schema.decodeUnknownEither(StatBlockCommunicationSchema)(
    candidate,
  ).pipe(
    Either.match({
      onLeft: (error) =>
        malformedEvidence(
          issueContext,
          "communication",
          String(error),
          "canonical Stat Block communication",
          { kind: "none" },
        ),
      onRight: (communication) => communication,
    }),
  );
};

const parseRawGeneralFacts = (
  issueContext: ProjectionIssueContext,
  name: string,
  lines: readonly string[],
): ScopedGeneralFacts | undefined => {
  const metadata = assess(issueContext, () =>
    parseMetadata(issueContext, lines, name),
  );
  const ac = requireLineMatch(
    issueContext,
    lines,
    "**AC**",
    /\*\*AC\*\* (\d+)(?: \(([^)]+)\))?/,
    "ac",
  );
  const hp = requireLineMatch(
    issueContext,
    lines,
    "**HP**",
    /\*\*HP\*\* (\d+)/,
    "hp",
  );
  const initiativeLine = lines.find((line) => line.includes("**Initiative**"));
  const initiative =
    initiativeLine === undefined
      ? missingEvidence(
          issueContext,
          "initiative",
          `${name} Initiative`,
          [] as const,
        )
      : requireMatch(
          issueContext,
          initiativeLine,
          /\*\*Initiative\*\* ([+−-]?\d+) \((\d+)\)/,
          "initiative",
        );
  const challengeRatingMatch = assess(issueContext, () =>
    requireLineMatch(
      issueContext,
      lines,
      "**CR**",
      /\*\*CR\*\* (\d+)(?:\/(\d+))?/,
      "challengeRating",
    ),
  );
  const challengeRating = (() => {
    if (challengeRatingMatch === undefined) return 0 as const;
    const candidate =
      Number(challengeRatingMatch[1]) / Number(challengeRatingMatch[2] ?? 1);
    return isChallengeRating(candidate)
      ? candidate
      : unsupportedEvidence(
          issueContext,
          "challengeRating",
          String(candidate),
          "a canonical challenge rating",
          0 as const,
        );
  })();

  const speeds = assess(issueContext, () =>
    parseSpeeds(issueContext, lines, name),
  );
  const abilityScores = assess(issueContext, () =>
    parseAbilityScores(issueContext, lines, name),
  );
  const savingThrowModifiers =
    abilityScores === undefined
      ? undefined
      : assess(issueContext, () =>
          parseSavingThrowModifiers(issueContext, lines, name),
        );
  const skillModifiers = assess(issueContext, () =>
    parseNamedModifiers(issueContext, lines, "Skills"),
  );
  const vulnerabilities = assess(issueContext, () =>
    parseVulnerabilities(issueContext, lines),
  );
  const resistances = assess(issueContext, () =>
    parseResistances(issueContext, lines),
  );
  const immunities = assess(issueContext, () =>
    parseImmunities(issueContext, lines),
  );
  const senses = assess(issueContext, () => parseSenses(issueContext, lines));
  const gear = assess(issueContext, () => parseGear(issueContext, lines));
  const communication = assess(issueContext, () =>
    parseCommunication(issueContext, lines, name),
  );
  if (
    metadata === undefined ||
    speeds === undefined ||
    abilityScores === undefined ||
    savingThrowModifiers === undefined ||
    skillModifiers === undefined ||
    vulnerabilities === undefined ||
    resistances === undefined ||
    immunities === undefined ||
    senses === undefined ||
    gear === undefined ||
    communication === undefined
  ) {
    return undefined;
  }

  return {
    challengeRating,
    ...metadata,
    ac: {
      value: { kind: "literal", value: Number(ac[1]) },
      ...(ac[2] === undefined ? {} : { annotations: [ac[2]] }),
    },
    hp: { kind: "literal", value: Number(hp[1]) },
    speeds,
    abilityScores,
    initiative: {
      modifier: signedNumber(initiative[1] ?? ""),
      score: Number(initiative[2]),
    },
    savingThrowModifiers,
    saveProficiencies: [],
    skillModifiers,
    vulnerabilities,
    resistances,
    immunities,
    ...senses,
    gear,
    communication,
  };
};

const parseRawEntries = (
  issueContext: ProjectionIssueContext,
  lines: readonly string[],
): readonly RawEntry[] => {
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
      section = parsedLiteral(
        issueContext,
        RAW_SECTIONS,
        candidateSection,
        "entries.section",
      );
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
  issueContext: ProjectionIssueContext,
  entry: RawEntry,
): StatBlockScopedFidelityProjection["traits"] =>
  Match.value(entry.section).pipe(
    Match.when("Traits", () => {
      const effect = parseRawTraitEffect(entry.description);
      return [
        decodeProjectionValue(
          issueContext,
          CreatureTraitSchema,
          {
            name: entry.name,
            description: entry.description,
            ...(effect === undefined ? {} : { effect }),
          },
          `traits.${entry.name}`,
          { name: entry.name, description: entry.description },
        ),
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

const parsedAbility = (
  issueContext: ProjectionIssueContext,
  value: string,
  field: string,
): Ability => {
  const normalized = value.slice(0, 3).toLowerCase();
  const ability = ABILITY_NAMES.find((candidate) => candidate === normalized);
  if (ability === undefined) {
    return unsupportedEvidence(
      issueContext,
      field,
      value,
      ABILITY_NAMES.join(", "),
      "str",
    );
  }
  return ability;
};

const parseDamage = (
  issueContext: ProjectionIssueContext,
  value: string,
  field: string,
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
    return malformedEvidence(
      issueContext,
      `${field}.damageType`,
      value,
      "damage type",
      undefined,
    );
  }
  const staticDamage = Number(match[1]);
  const amount: DamageAmountProjection =
    match[2] === undefined || match[3] === undefined
      ? { kind: "static", static: staticDamage }
      : {
          kind: "dice_expression",
          static: staticDamage,
          expr: {
            dice: Number(match[2]),
            dieSize: decodeProjectionValue(
              issueContext,
              DamageDieSizeSchema,
              Number(match[3]),
              `${field}.dieSize`,
              4,
            ),
            ...flat,
          },
        };
  return {
    kind: "damage",
    damageType: parsedLiteral(
      issueContext,
      DAMAGE_TYPES,
      damageTypeText.toLowerCase(),
      `${field}.damageType`,
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
  issueContext: ProjectionIssueContext,
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
  const damages = damageTexts.map((damage, index) =>
    parseDamage(
      issueContext,
      damage,
      `procedures.${entry.name}.onHit.${index}`,
    ),
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
            kind: "dice_expression" as const,
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
        issueContext,
        SIZES,
        sizeCondition[1].toLowerCase(),
        `procedures.${entry.name}.targetSize`,
      ),
      condition: parsedLiteral(
        issueContext,
        CONDITIONS,
        sizeCondition[2].toLowerCase(),
        `procedures.${entry.name}.condition`,
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
        issueContext,
        CONDITIONS,
        targetTurnCondition[1].toLowerCase(),
        `procedures.${entry.name}.condition`,
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
        issueContext,
        CONDITIONS,
        sourceTurnCondition[1].toLowerCase(),
        `procedures.${entry.name}.condition`,
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
    return unsupportedEvidence(
      issueContext,
      `procedures.${entry.name}.attackType`,
      match[1] ?? "",
      "melee or ranged",
      undefined,
    );
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
    onHit: nonEmptyValues(
      issueContext,
      onHit,
      `procedures.${entry.name}.onHit`,
      baseDamage ?? {
        kind: "damage",
        damageType: "bludgeoning",
        amount: { kind: "static", static: 1 },
      },
    ),
    resourceLimits: parseRawResourceLimits(entry.name),
  };
  return Match.value(attackType).pipe(
    Match.when("melee", (attackType) => ({
      ...commonAttack,
      attackType,
      reachFeet: Number(match[3]),
    })),
    Match.when("ranged", (attackType) => ({
      ...commonAttack,
      attackType,
      rangeFeet: {
        normal: Number(match[4]),
        long: Number(match[5] ?? match[4]),
      },
      ...(ammunition === undefined ? {} : { ammunition }),
    })),
    Match.exhaustive,
  );
};

const parseSimpleSave = (
  issueContext: ProjectionIssueContext,
  entry: RawEntry,
): ProcedureProjection | undefined => {
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
    issueContext,
    match[line === null ? 4 : 5] ?? "",
    `procedures.${entry.name}.onFail`,
  );
  if (onFail === undefined) return undefined;
  return {
    section,
    name: normalizedProcedureName(entry.name),
    kind: "save",
    ability: parsedAbility(
      issueContext,
      match[1] ?? "",
      `procedures.${entry.name}.ability`,
    ),
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
  issueContext: ProjectionIssueContext,
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
      return malformedEvidence(
        issueContext,
        `procedures.${entry.name}.dispatches`,
        entry.description,
        "two named dispatches with supported counts",
        undefined,
      );
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
    return malformedEvidence(
      issueContext,
      `procedures.${entry.name}.dispatches`,
      entry.description,
      "one named dispatch with a supported count",
      undefined,
    );
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
  issueContext: ProjectionIssueContext,
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
        issueContext,
        splitOutsideParentheses(group[3] ?? "").map(parseSpell),
        `procedures.${entry.name}.spells`,
        { spellId: normalizedIdentifier(entry.name) },
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
    return missingEvidence(
      issueContext,
      `procedures.${entry.name}.groups`,
      "at least one spell group",
      undefined,
    );
  }
  return {
    section,
    name: normalizedProcedureName(entry.name),
    kind: "spellcasting",
    ability: parsedAbility(
      issueContext,
      header[3] ?? "",
      `procedures.${entry.name}.ability`,
    ),
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
    groups: nonEmptyValues(
      issueContext,
      groups,
      `procedures.${entry.name}.groups`,
      {
        kind: "at_will",
        spells: [{ spellId: normalizedIdentifier(entry.name) }],
        resourceLimits: [],
      },
    ),
    resourceLimits: parseRawResourceLimits(entry.name),
  };
};

const parseDirectSpellcasting = (
  issueContext: ProjectionIssueContext,
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
    ? parsedAbility(
        issueContext,
        match[4] ?? "",
        `procedures.${entry.name}.ability`,
      )
    : inherited;
  if (ability === undefined) return undefined;
  const limits = parseRawResourceLimits(entry.name);
  const projectedSpellList = nonEmptyValues(
    issueContext,
    projectedSpells,
    `procedures.${entry.name}.spells`,
    { spellId: normalizedIdentifier(entry.name) },
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
          resourceLimits: nonEmptyValues(
            issueContext,
            limits,
            `procedures.${entry.name}.resourceLimits`,
            { kind: "daily", uses: 1, ownership: "shared" },
          ),
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
  issueContext: ProjectionIssueContext,
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
          issueContext,
          sortedStrings(options.map(normalizedIdentifier)),
          `procedures.${entry.name}.options`,
          normalizedProcedureName(entry.name),
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
  issueContext: ProjectionIssueContext,
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
    parseSpellcasting(issueContext, entry) ??
    parseDirectSpellcasting(
      issueContext,
      entry,
      spellcastingAbility,
      spellAttackBonus,
    ) ??
    parseSimpleAttack(issueContext, entry, generalFacts, ammunitionByWeapon) ??
    parseSimpleSave(issueContext, entry) ??
    parseSimpleMultiattack(issueContext, entry) ??
    parseActionOption(issueContext, entry) ?? {
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
  issueContext: ProjectionIssueContext,
  lines: readonly string[],
): ScopedGeneralFacts["legendaryActionUses"] => {
  const line = lines.find((candidate) =>
    candidate.startsWith("*Legendary Action Uses:"),
  );
  if (line === undefined) return undefined;
  const uses = requireMatch(
    issueContext,
    line,
    /^\*Legendary Action Uses: (\d+)(?: \((\d+) in Lair\))?\./,
    "legendaryActionUses",
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
  issueContext: ProjectionIssueContext,
  entries: readonly RawEntry[],
):
  | {
      readonly ability: Ability;
      readonly spellAttackBonus: number | undefined;
    }
  | undefined => {
  const spellcasting = entries.flatMap((entry) => {
    const procedure = parseSpellcasting(issueContext, entry);
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
    return malformedEvidence(
      issueContext,
      "procedures.spellcasting",
      String(spellcasting.length),
      "at most one Spellcasting ability",
      undefined,
    );
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
  issueContext: ProjectionIssueContext,
  source: string,
  occurrence: SrdStatBlockSourceOccurrence,
  equipmentSource: string,
): StatBlockScopedFidelityProjection | undefined => {
  const sourceLines = source.split(/\r?\n/);
  const ammunitionByWeapon = parseAmmunitionByWeapon(equipmentSource);
  const lines = rawRecordLines(sourceLines, occurrence);
  const entries = parseRawEntries(issueContext, lines);
  const generalFacts = parseRawGeneralFacts(
    issueContext,
    occurrence.name,
    lines,
  );
  const spellcasting = uniqueSpellcastingFacts(issueContext, entries);
  const parsedProcedures =
    generalFacts === undefined
      ? []
      : entries.flatMap((entry) => {
          const procedure = assess(issueContext, () =>
            parseRawProcedure(
              issueContext,
              entry,
              generalFacts,
              ammunitionByWeapon,
              spellcasting?.ability,
              spellcasting?.spellAttackBonus,
            ),
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
            return unresolvedReference(
              issueContext,
              `procedures.${multiattack.name}`,
              `${occurrence.name}/${multiattack.name} RAW entry`,
              multiattack,
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
  const legendaryActionUses = assess(issueContext, () =>
    parseLegendaryActionUses(issueContext, lines),
  );
  const resources = procedureResourceLimits(procedures);

  if (generalFacts === undefined) return undefined;

  return {
    generalFacts: {
      ...generalFacts,
      ...(legendaryActionUses === undefined ? {} : { legendaryActionUses }),
    },
    resources,
    entryNames: entries.map(rawEntryName),
    traits: entries.flatMap((entry) => rawTraitEvidence(issueContext, entry)),
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
  issueContext: ProjectionIssueContext,
  damage: AttackDamage | AttackConditionalDamage,
  field: string,
): Omit<DamageProjection, "kind"> => {
  const fixedAmount = Match.value(damage.amount).pipe(
    Match.when({ kind: "fixed" }, (amount) => amount),
    Match.exhaustive,
  );
  const expression = "expr" in fixedAmount ? fixedAmount.expr : undefined;
  const staticDamage = fixedAmount.static;
  if (staticDamage === undefined) {
    return missingEvidence(
      issueContext,
      `${field}.static`,
      `authored ${damage.damageType} static damage`,
      { damageType: damage.damageType, amount: { kind: "static", static: 1 } },
    );
  }
  return {
    damageType: damage.damageType,
    amount:
      expression === undefined
        ? { kind: "static", static: staticDamage }
        : {
            kind: "dice_expression",
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

const projectDamage = (
  issueContext: ProjectionIssueContext,
  damage: AttackDamage,
  field: string,
): DamageProjection => ({
  kind: "damage",
  ...projectDamageFields(issueContext, damage, field),
});

const projectAttackEffect = (
  issueContext: ProjectionIssueContext,
  effect: AttackEffect,
  field: string,
): AttackEffectProjection | undefined => {
  return Match.value(effect).pipe(
    Match.when({ kind: "damage" }, (damage) =>
      projectDamage(issueContext, damage, field),
    ),
    Match.when({ kind: "conditional_bonus_damage" }, (conditional) => ({
      kind: "conditional_bonus_damage" as const,
      ...projectDamageFields(issueContext, conditional, field),
      when: Match.value(conditional.when).pipe(
        Match.when(
          { kind: "attack_roll_had_advantage" },
          () => "attack_roll_had_advantage" as const,
        ),
        Match.when({ kind: "target_creature_type" }, () => {
          return unsupportedEvidence(
            issueContext,
            `${field}.when`,
            "target_creature_type",
            "attack_roll_had_advantage",
            "attack_roll_had_advantage" as const,
          );
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
      return unsupportedEvidence(
        issueContext,
        field,
        "apply_condition without expiration",
        "apply_condition with supported expiration",
        undefined,
      );
    }),
    Match.exhaustive,
  );
};

const projectResourceLimits = (
  issueContext: ProjectionIssueContext,
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
          return unresolvedReference(
            issueContext,
            "resources",
            `${record.name} resource ordinal ${ordinal}`,
            { kind: "daily", uses: 1, ownership: "shared" },
          );
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
  issueContext: ProjectionIssueContext,
  record: SrdStatBlockRecord,
  group: AuthoredSpellcastingGroup,
): SpellcastingGroupProjection => {
  const spells = nonEmptyValues(
    issueContext,
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
    "procedures.spellcasting.spells",
    {
      spellId: group.spells[0].spellId,
      ...(group.spells[0].count === undefined
        ? {}
        : { count: group.spells[0].count }),
      ...(group.spells[0].castAtLevel === undefined
        ? {}
        : { castAtLevel: group.spells[0].castAtLevel }),
      ...(group.spells[0].restriction === undefined
        ? {}
        : {
            restriction: group.spells[0].restriction.authoredExpression,
          }),
    },
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
        issueContext,
        projectResourceLimits(issueContext, record, limited.resourceRefs),
        "procedures.spellcasting.resourceLimits",
        { kind: "daily", uses: 1, ownership: "shared" },
      ),
    })),
    Match.exhaustive,
  );
};

const projectExecutableProcedure = (
  issueContext: ProjectionIssueContext,
  record: SrdStatBlockRecord,
  section: ProcedureSection,
  entry: Extract<StatBlockProcedureEntry, { readonly kind: "executable" }>,
  namesByOrdinal: ReadonlyMap<number, string>,
): ProcedureProjection | undefined => {
  const resourceLimits = projectResourceLimits(
    issueContext,
    record,
    entry.resourceRefs,
  );
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
          return missingEvidence(
            issueContext,
            `procedures.${attack.name}.attackAbilityEvidence`,
            `${record.name}/${attack.name} RAW-derived attack ability candidate`,
            undefined,
          );
        }
        if (
          !isAttackAbility(attack.attackAbility) ||
          !candidates.includes(attack.attackAbility)
        ) {
          return unsupportedEvidence(
            issueContext,
            `procedures.${attack.name}.attackAbility`,
            attack.attackAbility,
            candidates.join(", "),
            undefined,
          );
        }
        return evidence;
      })();
      if (attackAbility === undefined) return undefined;
      const effectIssueCount = issueContext.issues.length;
      const projectedEffects = attack.onHit.flatMap((effect, index) => {
        const projected = assess(issueContext, () =>
          projectAttackEffect(
            issueContext,
            effect,
            `procedures.${attack.name}.onHit.${index}`,
          ),
        );
        return projected === undefined ? [] : [projected];
      });
      const [firstEffect, ...remainingEffects] = projectedEffects;
      if (firstEffect === undefined) {
        return issueContext.issues.length > effectIssueCount
          ? undefined
          : missingEvidence(
              issueContext,
              `procedures.${attack.name}.onHit`,
              "at least one attack effect",
              undefined,
            );
      }
      const onHit: ReadonlyNonEmptyArray<AttackEffectProjection> = [
        firstEffect,
        ...remainingEffects,
      ];
      const commonAttack = {
        section,
        name: normalizedProcedureName(attack.name),
        kind: "attack_roll" as const,
        attackBonus: literalValue(attack.attackBonus),
        attackAbilityEvidence: attackAbility,
        onHit,
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
      const unsupportedSimpleDamageSave = (
        branch: "onFail" | "onSuccess",
        effectKind: string,
      ) =>
        unsupportedEvidence(
          issueContext,
          `procedures.${save.name}.${branch}`,
          effectKind,
          "a simple damage save",
          undefined,
        );
      const onFail = Match.value(save.onFail).pipe(
        Match.when({ kind: "damage" }, (damage) =>
          projectDamage(issueContext, damage, `procedures.${save.name}.onFail`),
        ),
        Match.when({ kind: "conditional_bonus_damage" }, ({ kind }) =>
          unsupportedSimpleDamageSave("onFail", kind),
        ),
        Match.when(
          { kind: "apply_condition_if_target_size_at_most" },
          ({ kind }) => unsupportedSimpleDamageSave("onFail", kind),
        ),
        Match.when({ kind: "apply_condition" }, ({ kind }) =>
          unsupportedSimpleDamageSave("onFail", kind),
        ),
        Match.exhaustive,
      );
      const onSuccess = Match.value(save.onSuccess).pipe(
        Match.when({ kind: "half_damage" }, () => "half_damage" as const),
        Match.when({ kind: "damage" }, ({ kind }) =>
          unsupportedSimpleDamageSave("onSuccess", kind),
        ),
        Match.when({ kind: "conditional_bonus_damage" }, ({ kind }) =>
          unsupportedSimpleDamageSave("onSuccess", kind),
        ),
        Match.when(
          { kind: "apply_condition_if_target_size_at_most" },
          ({ kind }) => unsupportedSimpleDamageSave("onSuccess", kind),
        ),
        Match.when({ kind: "apply_condition" }, ({ kind }) =>
          unsupportedSimpleDamageSave("onSuccess", kind),
        ),
        Match.exhaustive,
      );
      if (onFail === undefined || onSuccess === undefined) return undefined;
      if (!("area" in save)) {
        return unsupportedEvidence(
          issueContext,
          `procedures.${save.name}.area`,
          "absent",
          "line or cone",
          undefined,
        );
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
          return undefined;
        }),
        Match.when({ kind: "circle" }, () => {
          return undefined;
        }),
        Match.when({ kind: "sphere_cluster" }, () => {
          return undefined;
        }),
        Match.when({ kind: "cube" }, () => {
          return undefined;
        }),
        Match.when({ kind: "cube_cluster" }, () => {
          return undefined;
        }),
        Match.when({ kind: "cylinder" }, () => {
          return undefined;
        }),
        Match.when({ kind: "emanation" }, () => {
          return undefined;
        }),
        Match.when({ kind: "wall_volume" }, () => {
          return undefined;
        }),
        Match.exhaustive,
      );
      if (area === undefined) {
        return unsupportedEvidence(
          issueContext,
          `procedures.${save.name}.area`,
          save.area.kind,
          "line or cone",
          undefined,
        );
      }
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
        issueContext,
        multiattack.dispatches.map((dispatch) => {
          const procedureName = namesByOrdinal.get(dispatch.procedureOrdinal);
          if (procedureName === undefined) {
            return unresolvedReference(
              issueContext,
              `procedures.${multiattack.name}.dispatches`,
              `procedure ordinal ${dispatch.procedureOrdinal}`,
              {
                procedureName: normalizedProcedureName(multiattack.name),
                count: 1,
              },
            );
          }
          return {
            procedureName: normalizedProcedureName(procedureName),
            count: literalValue(dispatch.count),
          };
        }),
        `procedures.${multiattack.name}.dispatches`,
        {
          procedureName: normalizedProcedureName(multiattack.name),
          count: 1,
        },
      ),
      resourceLimits,
    })),
    Match.when({ kind: "action_option" }, (option) => ({
      section,
      name: normalizedProcedureName(option.name),
      kind: "action_option" as const,
      options: nonEmptyValues(
        issueContext,
        sortedStrings(option.options),
        `procedures.${option.name}.options`,
        normalizedProcedureName(option.name),
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
        issueContext,
        spellcasting.groups.map((group) =>
          projectAuthoredSpellcastingGroup(issueContext, record, group),
        ),
        `procedures.${spellcasting.name}.groups`,
        {
          kind: "at_will",
          spells: [
            {
              spellId: spellcasting.groups[0].spells[0].spellId,
            },
          ],
          resourceLimits: [],
        },
      ),
      resourceLimits,
    })),
    Match.when({ kind: "support" }, (support) => {
      return unsupportedEvidence(
        issueContext,
        `procedures.${support.name}`,
        "support procedure",
        "an executable scoped-fidelity procedure",
        undefined,
      );
    }),
    Match.exhaustive,
  );
};

const bindAuthoredResourceLimits = (
  issueContext: ProjectionIssueContext,
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
      const limitedGroups = spellcasting.groups.filter((group) =>
        Match.value(group).pipe(
          Match.when({ kind: "at_will" }, () => false),
          Match.when({ kind: "limited" }, () => true),
          Match.exhaustive,
        ),
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
        issueContext,
        authoredResourceLimits,
        "procedures.spellcasting.resourceLimits",
        { kind: "daily", uses: 1, ownership: "shared" },
      );
      return {
        ...spellcasting,
        groups: nonEmptyValues(
          issueContext,
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
          "procedures.spellcasting.groups",
          targetGroup,
        ),
      };
    }),
    Match.exhaustive,
  );
};

const projectAuthoredProcedures = (
  issueContext: ProjectionIssueContext,
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
        const parsed = parseSpellcasting(issueContext, {
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
    malformedEvidence(
      issueContext,
      "procedures.spellcasting",
      String(inheritedSpellcastingFacts.length),
      "at most one Spellcasting ability",
      undefined,
    );
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
  return entries.flatMap(({ section, entry }) => {
    const projected = assess(issueContext, () =>
      Match.value(entry).pipe(
        Match.when({ kind: "textOnly" }, (textOnly) => {
          const resourceLimits = projectResourceLimits(
            issueContext,
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
            issueContext,
            {
              section,
              name: textOnly.name,
              description: normalizedProse(textOnly.description),
            },
            {
              abilityScores: record.statBlock.abilityScores,
              challengeRating: record.challengeRating,
              gear: sortedAbsentOrNonEmpty(
                (record.statBlock.gear ?? []).map((gear) => ({
                  item: gear.item,
                  quantity: gear.quantity ?? 1,
                })),
                ({ item }) => item,
              ),
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
                bindAuthoredResourceLimits(
                  issueContext,
                  structural,
                  resourceLimits,
                ) ?? fallback(),
            ),
            Match.when(
              { kind: "save" },
              (structural) =>
                bindAuthoredResourceLimits(
                  issueContext,
                  structural,
                  resourceLimits,
                ) ?? fallback(),
            ),
            Match.when(
              { kind: "multiattack" },
              (structural) =>
                bindAuthoredResourceLimits(
                  issueContext,
                  structural,
                  resourceLimits,
                ) ?? fallback(),
            ),
            Match.when(
              { kind: "action_option" },
              (structural) =>
                bindAuthoredResourceLimits(
                  issueContext,
                  structural,
                  resourceLimits,
                ) ?? fallback(),
            ),
            Match.when(
              { kind: "spellcasting" },
              (structural) =>
                bindAuthoredResourceLimits(
                  issueContext,
                  structural,
                  resourceLimits,
                ) ?? fallback(),
            ),
            Match.exhaustive,
          );
        }),
        Match.when({ kind: "executable" }, (executable) =>
          projectExecutableProcedure(
            issueContext,
            record,
            section,
            executable,
            namesBySectionAndOrdinal.get(section) ?? new Map(),
          ),
        ),
        Match.exhaustive,
      ),
    );
    return projected === undefined ? [] : [projected];
  });
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
  issueContext: ProjectionIssueContext,
  record: SrdStatBlockRecord,
): ScopedGeneralFacts["vulnerabilities"] =>
  Match.value(record.statBlock.vulnerabilities).pipe(
    Match.when(undefined, () => ({ kind: "none" as const })),
    Match.when({ kind: "qualified" }, (qualified) => ({
      kind: "qualified" as const,
      damageTypes: sortedNonEmptyStrings(
        issueContext,
        qualified.damageTypes,
        "vulnerabilities.damageTypes",
        "acid",
      ),
      qualifier: qualified.qualifier,
    })),
    Match.when({ kind: "fixed" }, (fixed) => ({
      kind: "fixed" as const,
      damageTypes: sortedNonEmptyStrings(
        issueContext,
        fixed.damageTypes,
        "vulnerabilities.damageTypes",
        "acid",
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
  issueContext: ProjectionIssueContext,
  record: SrdStatBlockRecord,
): ScopedGeneralFacts["immunities"] => {
  const immunities = record.statBlock.immunities;
  if (immunities === undefined) return { kind: "none" };

  return {
    kind: "some",
    value: decodeProjectionValue(
      issueContext,
      CreatureImmunityListSchema,
      {
        ...("damageTypes" in immunities
          ? {
              damageTypes: sortedNonEmptyStrings(
                issueContext,
                immunities.damageTypes,
                "immunities.damageTypes",
                "acid",
              ),
            }
          : {}),
        ...("conditions" in immunities
          ? {
              conditions: sortedNonEmptyStrings(
                issueContext,
                immunities.conditions,
                "immunities.conditions",
                "blinded",
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
      },
      "immunities",
      DEPENDENCY_FALLBACK_IMMUNITY,
    ),
  };
};

const projectAuthoredStatBlockUnsafe = (
  issueContext: ProjectionIssueContext,
  record: SrdStatBlockRecord,
  equipmentSource: string,
): StatBlockScopedFidelityProjection | undefined => {
  const ammunitionByWeapon = parseAmmunitionByWeapon(equipmentSource);
  const procedures = authoredProcedures(record);
  const projectedProcedures = projectAuthoredProcedures(
    issueContext,
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
      creatureTypeTags:
        record.statBlock.creatureTypeTags === undefined
          ? []
          : sortedNonEmptyStrings(
              issueContext,
              record.statBlock.creatureTypeTags,
              "creatureTypeTags",
              record.name.toLowerCase(),
            ),
      alignment: record.statBlock.alignment,
      ac: record.statBlock.ac,
      hp: record.statBlock.hp,
      speeds: record.statBlock.speeds,
      abilityScores: record.statBlock.abilityScores,
      initiative: record.statBlock.initiative,
      savingThrowModifiers: sortedAbsentOrNonEmpty(
        record.statBlock.savingThrowModifiers ?? [],
        ({ ability }) => ability,
      ),
      saveProficiencies: sortedStrings(
        record.statBlock.saveProficiencies ?? [],
      ),
      skillModifiers: sortedByDomainName(
        record.statBlock.skillModifiers ?? [],
        ({ skill }) => skill,
      ),
      vulnerabilities: projectVulnerabilities(issueContext, record),
      resistances:
        resistances === undefined
          ? { kind: "none" as const }
          : Match.value(resistances).pipe(
              Match.when({ kind: "fixed" }, (fixed) => ({
                kind: "fixed" as const,
                damageTypes: sortedNonEmptyStrings(
                  issueContext,
                  fixed.damageTypes,
                  "resistances.damageTypes",
                  "acid",
                ),
              })),
              Match.when({ kind: "choose_one_from" }, (chosen) => ({
                kind: "choose_one_from" as const,
                options: sortedNonEmptyStrings(
                  issueContext,
                  chosen.options,
                  "resistances.options",
                  "acid",
                ),
              })),
              Match.exhaustive,
            ),
      immunities: projectImmunities(issueContext, record),
      senses: sortedAbsentOrNonEmpty(
        record.statBlock.senses ?? [],
        ({ kind }) => kind,
      ),
      passivePerception: record.statBlock.passivePerception,
      gear: sortedAbsentOrNonEmpty(
        (record.statBlock.gear ?? []).map((gear) => ({
          item: gear.item,
          quantity: gear.quantity ?? 1,
        })),
        ({ item }) => item,
      ),
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
      decodeProjectionValue(
        issueContext,
        CreatureTraitSchema,
        {
          ...trait,
          description: normalizedProse(trait.description),
        },
        `traits.${trait.name}`,
        { name: trait.name, description: normalizedProse(trait.description) },
      ),
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
      readonly tag: "projection-issues";
      readonly issues: ReadonlyNonEmptyArray<StatBlockScopedProjectionIssue>;
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
  context: ProjectionIssueContext,
  projection: StatBlockScopedFidelityProjection | undefined,
): StatBlockScopedProjectionResult {
  const [firstIssue, ...remainingIssues] = context.issues;
  if (firstIssue !== undefined) {
    return {
      tag: "failed",
      failure: {
        tag: "projection-issues",
        issues: [firstIssue, ...remainingIssues],
      },
    };
  }
  if (projection === undefined) {
    const issue: StatBlockScopedProjectionIssue = {
      kind: "projection-schema-rejected",
      anchor: issueAnchor(context, "projection"),
      message: "Projection was unavailable without a recorded field issue.",
    };
    return {
      tag: "failed",
      failure: { tag: "projection-issues", issues: [issue] },
    };
  }
  const decoded = Schema.decodeUnknownEither(
    StatBlockScopedFidelityProjectionSchema,
  )(projection);
  if (Either.isRight(decoded)) {
    return { tag: "projected", projection: decoded.right };
  }
  const issue: StatBlockScopedProjectionIssue = {
    kind: "projection-schema-rejected",
    anchor: issueAnchor(context, "projection"),
    message: String(decoded.left),
  };
  return {
    tag: "failed",
    failure: { tag: "projection-issues", issues: [issue] },
  };
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
  const context: ProjectionIssueContext = {
    anchor: {
      kind: "raw",
      sourcePath: occurrence.anchor.sourcePath,
      heading: occurrence.anchor.heading,
      lineStart: occurrence.anchor.lineStart,
      lineEnd: occurrence.anchor.lineEnd,
    },
    issues: [],
  };
  return projectionResult(
    context,
    projectRawStatBlockUnsafe(
      context,
      source.contents,
      occurrence,
      equipmentSource,
    ),
  );
}

export function projectAuthoredStatBlock(
  record: SrdStatBlockRecord,
  equipmentSource: string,
): StatBlockScopedProjectionResult {
  const context: ProjectionIssueContext = {
    anchor: {
      kind: "authored",
      statBlockId: record.id,
      name: record.name,
    },
    issues: [],
  };
  return projectionResult(
    context,
    projectAuthoredStatBlockUnsafe(context, record, equipmentSource),
  );
}
