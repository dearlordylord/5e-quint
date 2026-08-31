import { Match, Result, Schema } from "effect";

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
import { stripSrdStatBlockMarkdownEmphasis } from "./stat-block-raw-markdown-normalization.ts";
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
  StandaloneStatBlockAbilityScoreSchema,
  StandaloneStatBlockAbilityScoresSchema,
  StandaloneStatBlockCreatureTypeTagsSchema,
  StandaloneStatBlockValueSchema,
  StatBlockAlignmentSchema,
  StatBlockArmorClassSchema,
  StatBlockArmorClassAnnotationSchema,
  StatBlockCommunicationSchema,
  StatBlockGearEntrySchema,
  StatBlockGearItemSchema,
  StatBlockInitiativeSchema,
  StatBlockLanguageNameSchema,
  StatBlockPassivePerceptionSchema,
  StatBlockProcedureDescriptionSchema,
  StatBlockProcedureNameSchema,
  StatBlockTextOnlyReasonSchema,
  CreatureTraitSchema,
  CreatureTraitDescriptionSchema,
  CreatureTraitNameSchema,
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
    Match.whenOr("Traits", "Actions", () => false),
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
  schema: Schema.Codec<Value, Encoded, never, never>,
  candidate: unknown,
  field: string,
  dependencyFallback: Value,
): Value => {
  const decoded = Schema.decodeUnknownResult(schema)(candidate);
  return Result.isSuccess(decoded)
    ? decoded.success
    : malformedEvidence(
        context,
        field,
        String(decoded.failure),
        "canonical Surface domain value",
        dependencyFallback,
      );
};

const decodeEvidenceValue = <Value, Encoded>(
  context: ProjectionIssueContext,
  schema: Schema.Codec<Value, Encoded, never, never>,
  candidate: unknown,
  evidence: string,
  field: string,
  expected: string,
  dependencyFallback: Value,
): Value => {
  const decoded = Schema.decodeUnknownResult(schema)(candidate);
  return Result.isSuccess(decoded)
    ? decoded.success
    : malformedEvidence(context, field, evidence, expected, dependencyFallback);
};

const positiveIntegerEvidence = (
  context: ProjectionIssueContext,
  evidence: string,
  field: string,
): number =>
  decodeEvidenceValue(
    context,
    PositiveIntegerSchema,
    Number(evidence),
    evidence,
    field,
    "a positive integer",
    1,
  );

const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1)),
);
const SignedIntegerSchema = Schema.Number.pipe(Schema.check(Schema.isInt()));
const NonEmptyStringSchema = Schema.Trimmed.pipe(
  Schema.check(Schema.isNonEmpty()),
);
const ProcedureSectionSchema = Schema.Literals(PROCEDURE_SECTIONS);
const AttackAbilitySchema = Schema.Literals(ATTACK_ABILITY_NAMES);
const DEPENDENCY_FALLBACK_IMMUNITY = Schema.decodeUnknownSync(
  CreatureImmunityListSchema,
)({ conditions: ["blinded"] });

const ResourceLimitProjectionSchema = Schema.Union([
  strictStruct({
    kind: Schema.Literal("daily"),
    uses: PositiveIntegerSchema,
    ownership: Schema.Literals(["shared", "each"]),
  }),
  strictStruct({
    kind: Schema.Literal("recharge"),
    minimumRoll: Schema.Number.pipe(
      Schema.check(
        Schema.isInt(),
        Schema.isBetween({ minimum: 2, maximum: 6 }),
      ),
    ),
    ownership: Schema.Literals(["shared", "each"]),
  }),
  strictStruct({
    kind: Schema.Literal("recharge_after_rest"),
    rest: Schema.Literal("short_or_long"),
    ownership: Schema.Literals(["shared", "each"]),
  }),
]);

const DamageAmountProjectionSchema = Schema.Union([
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
]);

const DamageProjectionSchema = strictStruct({
  kind: Schema.Literal("damage"),
  damageType: DamageTypeSchema,
  amount: DamageAmountProjectionSchema,
});

const AttackEffectProjectionSchema = Schema.Union([
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
    expiresAt: Schema.Literals([
      "source_next_turn_end",
      "target_next_turn_end",
    ]),
  }),
]);

const AttackAbilityEvidenceSchema = Schema.Union([
  strictStruct({
    kind: Schema.Literal("resolved"),
    ability: AttackAbilitySchema,
  }),
  strictStruct({
    kind: Schema.Literal("unresolved"),
    candidates: Schema.TupleWithRest(
      Schema.Tuple([AttackAbilitySchema, AttackAbilitySchema]),
      [AttackAbilitySchema],
    ).pipe(
      Schema.check(
        Schema.makeFilter(
          (candidates) => new Set(candidates).size === candidates.length,
          {
            /* v8 ignore next -- @preserve -- this callback only formats a diagnostic after duplicate unresolved-ability evidence */
            message:
              "Unresolved attack evidence requires at least two distinct abilities.",
          },
        ),
      ),
    ),
  }),
]);

const SpellProjectionSchema = strictStruct({
  spellId: NonEmptyStringSchema,
  count: exactOptional(PositiveIntegerSchema),
  castAtLevel: exactOptional(PositiveIntegerSchema),
  restriction: exactOptional(NonEmptyStringSchema),
});

const SpellcastingGroupProjectionSchema = Schema.Union([
  strictStruct({
    kind: Schema.Literal("at_will"),
    spells: nonEmpty(SpellProjectionSchema),
    resourceLimits: Schema.Tuple([]),
  }),
  strictStruct({
    kind: Schema.Literal("limited"),
    spells: nonEmpty(SpellProjectionSchema),
    resourceLimits: nonEmpty(ResourceLimitProjectionSchema),
  }),
]);

const ProcedureBaseFields = {
  section: ProcedureSectionSchema,
  name: NonEmptyStringSchema,
  resourceLimits: Schema.Array(ResourceLimitProjectionSchema),
} as const;

const RangedAttackRangeSchema = strictStruct({
  normal: PositiveIntegerSchema,
  long: PositiveIntegerSchema,
}).pipe(
  Schema.check(
    Schema.makeFilter(({ normal, long }) => normal <= long, {
      /* v8 ignore next -- @preserve -- this callback only formats a diagnostic after malformed range ordering */
      message: "Normal attack range cannot exceed long range.",
    }),
  ),
);

const ProcedureProjectionSchema = Schema.Union([
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
    rangeFeet: RangedAttackRangeSchema,
    ammunition: exactOptional(NonEmptyStringSchema),
    reachFeet: exactOptional(ForbiddenValueSchema),
    onHit: nonEmpty(AttackEffectProjectionSchema),
  }),
  strictStruct({
    ...ProcedureBaseFields,
    kind: Schema.Literal("save"),
    ability: AbilitySchema,
    dc: PositiveIntegerSchema,
    area: Schema.Union([
      strictStruct({
        kind: Schema.Literal("line"),
        lengthFeet: PositiveIntegerSchema,
        widthFeet: PositiveIntegerSchema,
      }),
      strictStruct({
        kind: Schema.Literal("cone"),
        lengthFeet: PositiveIntegerSchema,
      }),
    ]),
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
    components: Schema.Union([
      strictStruct({ kind: Schema.Literal("spell_definition") }),
      strictStruct({
        kind: Schema.Literal("fixed"),
        v: Schema.Boolean,
        s: Schema.Boolean,
        m: Schema.Union([Schema.Literal(false), NonEmptyStringSchema]),
      }),
    ]),
    groups: nonEmpty(SpellcastingGroupProjectionSchema),
  }),
]);

const VulnerabilityProjectionSchema = Schema.Union([
  strictStruct({ kind: Schema.Literal("none") }),
  CreatureVulnerabilityListSchema,
]);
const ResistanceProjectionSchema = Schema.Union([
  strictStruct({ kind: Schema.Literal("none") }),
  CreatureResistanceListSchema,
]);

export const StatBlockScopedFidelityProjectionSchema = strictStruct({
  generalFacts: strictStruct({
    challengeRating: ChallengeRatingSchema,
    sizeAndSwarm: StandaloneStatBlockSizeAndSwarmSchema,
    creatureType: CreatureTypeSchema,
    creatureTypeTags: Schema.Union([
      Schema.Tuple([]),
      StandaloneStatBlockCreatureTypeTagsSchema,
    ]),
    alignment: StatBlockAlignmentSchema,
    ac: StatBlockArmorClassSchema,
    hp: StandaloneStatBlockValueSchema,
    speeds: nonEmpty(StandaloneStatBlockSpeedEntrySchema),
    abilityScores: StandaloneStatBlockAbilityScoresSchema,
    initiative: StatBlockInitiativeSchema,
    savingThrowModifiers: Schema.Union([
      Schema.Tuple([]),
      CreatureSavingThrowModifiersSchema,
    ]),
    saveProficiencies: Schema.Array(AbilitySchema),
    skillModifiers: Schema.Array(CreatureSkillModifierSchema),
    vulnerabilities: VulnerabilityProjectionSchema,
    resistances: ResistanceProjectionSchema,
    immunities: Schema.Union([
      strictStruct({ kind: Schema.Literal("none") }),
      strictStruct({
        kind: Schema.Literal("some"),
        value: CreatureImmunityListSchema,
      }),
    ]),
    senses: Schema.Union([
      Schema.Tuple([]),
      nonEmpty(StandaloneCreatureSenseSchema),
    ]),
    passivePerception: StatBlockPassivePerceptionSchema,
    gear: Schema.Union([Schema.Tuple([]), nonEmpty(StatBlockGearEntrySchema)]),
    communication: StatBlockCommunicationSchema,
    legendaryActionUses: exactOptional(
      Schema.Union([
        strictStruct({
          kind: Schema.Literal("fixed"),
          uses: PositiveIntegerSchema,
        }),
        strictStruct({
          kind: Schema.Literal("lair_bonus"),
          usesOutsideLair: PositiveIntegerSchema,
          additionalUsesInLair: PositiveIntegerSchema,
        }),
      ]),
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
  Schema.check(
    Schema.makeFilter(
      (projection) =>
        (projection.generalFacts.legendaryActionUses !== undefined) ===
        projection.procedures.some(
          ({ section }) => section === "Legendary Actions",
        ),
      {
        /* v8 ignore next -- @preserve -- this callback only formats a diagnostic after contradictory legendary-action projection */
        message:
          "Legendary Action uses and a nonempty Legendary Action section must occur together.",
      },
    ),
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
      Match.whenOr(
        { kind: "textOnly" },
        { kind: "attack_roll" },
        { kind: "save" },
        { kind: "multiattack" },
        { kind: "action_option" },
        () => [],
      ),
      Match.exhaustive,
    ),
  ]);

const signedNumber = (value: string): number =>
  Number(value.replace("−", "-").replace("+", ""));

const normalizedProse = (value: string): string =>
  stripSrdStatBlockMarkdownEmphasis(value).replace(/\s+/g, " ").trim();

const normalizedProcedureEvidence = (value: string): string =>
  stripSrdStatBlockMarkdownEmphasis(value)
    .replace(/\s*\n+\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim();

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

const compareCondition = (
  left: { readonly condition: string },
  right: { readonly condition: string },
): number => left.condition.localeCompare(right.condition);

const sortedNonEmptyStrings = <Value extends string>(
  issueContext: ProjectionIssueContext,
  values: readonly Value[],
  field: string,
  dependencyFallback: Value,
): ReadonlyNonEmptyArray<Value> => {
  const sorted = sortedStrings(values);
  const [first, ...rest] = sorted;
  /* v8 ignore start -- @preserve -- parser call sites replace invalid literals with a nonempty domain fallback before sorting */
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
  /* v8 ignore stop -- @preserve */
  return [first, ...rest];
};

const nonEmptyValues = <Value>(
  issueContext: ProjectionIssueContext,
  values: readonly Value[],
  field: string,
  dependencyFallback: Value,
): ReadonlyNonEmptyArray<Value> => {
  const [first, ...rest] = values;
  /* v8 ignore start -- @preserve -- every caller maps a schema-level nonempty collection or checks the projected collection before binding */
  if (first === undefined) {
    return missingEvidence(issueContext, field, "at least one value", [
      dependencyFallback,
    ]);
  }
  /* v8 ignore stop -- @preserve */
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

const matchCapture = (
  match: readonly (string | undefined)[],
  index: number,
): string => {
  /* v8 ignore next -- @preserve -- every caller requests a capture proved mandatory by its immediately preceding successful regex */
  return match[index] === undefined ? "" : match[index];
};

const parseSizeAlternatives = (
  issueContext: ProjectionIssueContext,
  creatureSizeText: string,
  contextLabel: string,
): SrdStatBlockRecord["statBlock"]["size"] => {
  const sizeIssueCount = issueContext.issues.length;
  const seenSizes = new Set<(typeof SIZES)[number]>();
  const options = creatureSizeText.split(" or ").flatMap((option, index) => {
    const parsed = assess(issueContext, () =>
      parsedLiteral(
        issueContext,
        SIZES,
        option.toLowerCase(),
        `size.options.${index}`,
      ),
    );
    if (parsed === undefined) return [];
    if (seenSizes.has(parsed)) {
      malformedEvidence(
        issueContext,
        `size.options.${index}`,
        option,
        "a distinct Size alternative",
        undefined,
      );
      return [];
    }
    seenSizes.add(parsed);
    return [parsed];
  });
  const [first, second, ...rest] = options;
  if (first !== undefined && second !== undefined) {
    return { kind: "alternatives", options: [first, second, ...rest] };
  }
  if (issueContext.issues.length > sizeIssueCount) {
    /* v8 ignore next -- @preserve -- a matched size-alternatives grammar always retains its first canonical size */
    return first === undefined ? "medium" : first;
  }
  /* v8 ignore next -- @preserve -- split always supplies a candidate; losing every candidate necessarily records an issue above */
  return missingEvidence(
    issueContext,
    "size",
    `${contextLabel} Size alternatives require at least two sizes`,
    "medium" as const,
  );
};

const parseMetadataSize = (
  issueContext: ProjectionIssueContext,
  creatureSizeText: string,
  contextLabel: string,
): SrdStatBlockRecord["statBlock"]["size"] =>
  creatureSizeText.includes(" or ")
    ? parseSizeAlternatives(issueContext, creatureSizeText, contextLabel)
    : parsedLiteral(
        issueContext,
        SIZES,
        creatureSizeText.toLowerCase(),
        "size",
      );

const parseMetadataAlignment = (
  issueContext: ProjectionIssueContext,
  alignmentText: string,
): ScopedGeneralFacts["alignment"] => {
  if (alignmentText === "Unaligned") return "unaligned";
  if (alignmentText === "Neutral") {
    return { order: "neutral", morality: "neutral" };
  }
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
  const [order, morality] = parts as [string, string];
  return {
    order: parsedLiteral(
      issueContext,
      ALIGNMENT_ORDERS,
      order,
      "alignment.order",
    ),
    morality: parsedLiteral(
      issueContext,
      ALIGNMENT_MORALITIES,
      morality,
      "alignment.morality",
    ),
  };
};

const parseSizeAndSwarm = (
  issueContext: ProjectionIssueContext,
  size: SrdStatBlockRecord["statBlock"]["size"],
  creatureSizeText: string,
  swarmConstituentSize: string | undefined,
): ScopedGeneralFacts["sizeAndSwarm"] => {
  if (swarmConstituentSize === undefined) return { size };
  if (
    (size === "medium" || size === "large") &&
    swarmConstituentSize.toLowerCase() === "tiny"
  ) {
    return { size, swarm: { constituentSize: "tiny" } };
  }
  return unsupportedEvidence(
    issueContext,
    "swarm",
    `${creatureSizeText} Swarm of ${swarmConstituentSize}`,
    "Medium or Large Swarm of Tiny creatures",
    { size: "medium" as const },
  );
};

const parseMetadataCreatureType = (
  issueContext: ProjectionIssueContext,
  authoredCreatureType: string,
  swarmMetadata: RegExpMatchArray | null,
): ScopedGeneralFacts["creatureType"] => {
  if (swarmMetadata === null) {
    return parsedLiteral(
      issueContext,
      CREATURE_TYPES,
      authoredCreatureType,
      "creatureType",
    );
  }
  if (authoredCreatureType === "beasts") return "beast";
  if (authoredCreatureType === "undead") return "undead";
  return unsupportedEvidence(
    issueContext,
    "creatureType",
    authoredCreatureType,
    "beasts or undead",
    "beast" as const,
  );
};

const parseCreatureTypeTags = (
  issueContext: ProjectionIssueContext,
  authoredTags: string | undefined,
): ScopedGeneralFacts["creatureTypeTags"] => {
  if (authoredTags === undefined) return [];
  const normalizedTags = authoredTags.toLowerCase();
  return decodeEvidenceValue(
    issueContext,
    StandaloneStatBlockCreatureTypeTagsSchema,
    [normalizedTags],
    normalizedTags,
    "creatureTypeTags.0",
    "a non-swarm creature type tag",
    ["creature"],
  );
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
  const metadataLine = lines.find((line) => /^[*_](?![*_])/.test(line));
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
      stripSrdStatBlockMarkdownEmphasis(metadataLine),
      /^(.+?) ([A-Za-z]+)(?: \(([^)]+)\))?, (.+)$/,
      "metadata",
    ),
  );
  if (metadata === undefined) return dependencyFallback;
  const sizeText = matchCapture(metadata, 1);
  const alignmentText = matchCapture(metadata, 4);
  const swarmMetadata = sizeText.match(/^([A-Za-z]+) Swarm of ([A-Za-z]+)$/);
  const authoredCreatureType = matchCapture(metadata, 2).toLowerCase();
  const creatureSizeText =
    swarmMetadata === null ? sizeText : matchCapture(swarmMetadata, 1);
  const size = parseMetadataSize(issueContext, creatureSizeText, contextLabel);
  const alignment = parseMetadataAlignment(issueContext, alignmentText);

  return {
    sizeAndSwarm: parseSizeAndSwarm(
      issueContext,
      size,
      creatureSizeText,
      swarmMetadata === null ? undefined : swarmMetadata[2],
    ),
    creatureType: parseMetadataCreatureType(
      issueContext,
      authoredCreatureType,
      swarmMetadata,
    ),
    creatureTypeTags: parseCreatureTypeTags(issueContext, metadata[3]),
    alignment,
  };
};

const parseGmChoiceSpeed = (
  issueContext: ProjectionIssueContext,
  gmChoice: RegExpMatchArray,
  field: string,
  contextLabel: string,
): StandaloneStatBlockSpeedEntry => {
  const feetEvidence = matchCapture(gmChoice, 2);
  const feet = decodeEvidenceValue(
    issueContext,
    StandaloneStatBlockValueSchema,
    { kind: "literal" as const, value: Number(feetEvidence) },
    feetEvidence,
    `${field}.feet`,
    "a positive integer Speed distance",
    { kind: "literal" as const, value: 1 },
  );
  const alternativeIssueCount = issueContext.issues.length;
  const seenKinds = new Set<(typeof SPEED_TYPES)[number]>();
  const alternatives = matchCapture(gmChoice, 1)
    .split(" or ")
    .flatMap((kind, alternativeIndex) => {
      const parsedKind = assess(issueContext, () =>
        parsedLiteral(
          issueContext,
          SPEED_TYPES,
          kind.toLowerCase(),
          `${field}.gmChoice.${alternativeIndex}.kind`,
        ),
      );
      /* v8 ignore next -- @preserve -- the enclosing GM-choice regex admits only SPEED_TYPES literals */
      if (parsedKind === undefined) return [];
      if (seenKinds.has(parsedKind)) {
        malformedEvidence(
          issueContext,
          `${field}.gmChoice.${alternativeIndex}.kind`,
          kind,
          "a distinct Speed-kind alternative",
          undefined,
        );
        return [];
      }
      seenKinds.add(parsedKind);
      return [{ kind: parsedKind, feet }];
    });
  if (issueContext.issues.length > alternativeIssueCount) {
    return { kind: "walk", feet: { kind: "literal", value: 1 } };
  }
  const [first, second, ...rest] = alternatives;
  /* v8 ignore next -- @preserve -- the enclosing regex requires at least two speed-kind alternatives */
  if (first === undefined || second === undefined) {
    return missingEvidence(
      issueContext,
      `${field}.gmChoice`,
      `${contextLabel} GM Speed choice requires two alternatives`,
      { kind: "walk" as const, feet },
    );
  }
  return decodeProjectionValue(
    issueContext,
    StandaloneStatBlockSpeedEntrySchema,
    { kind: "gm_choice", alternatives: [first, second, ...rest] },
    `${field}.gmChoice`,
    { kind: "walk", feet: { kind: "literal", value: 1 } },
  );
};

const parseFixedSpeed = (
  issueContext: ProjectionIssueContext,
  part: string,
  field: string,
): StandaloneStatBlockSpeedEntry => {
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
  const feetEvidence = matchCapture(speed, 2);
  const feet = decodeEvidenceValue(
    issueContext,
    StandaloneStatBlockValueSchema,
    { kind: "literal" as const, value: Number(feetEvidence) },
    feetEvidence,
    `${field}.feet`,
    "a positive integer Speed distance",
    { kind: "literal" as const, value: 1 },
  );
  const kind = parsedLiteral(
    issueContext,
    SPEED_TYPES,
    speed[1] === undefined ? "walk" : speed[1].toLowerCase(),
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
      { kind, feet, ...availability },
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
          feet,
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
};

const parseSpeedEntry = (
  issueContext: ProjectionIssueContext,
  part: string,
  field: string,
  contextLabel: string,
): StandaloneStatBlockSpeedEntry => {
  const gmChoice = part.match(
    /^((?:Burrow|Climb|Fly|Swim|Walk)(?: or (?:Burrow|Climb|Fly|Swim|Walk))+)(?: )(\d+) ft\. \(GM's choice\)$/,
  );
  return gmChoice === null
    ? parseFixedSpeed(issueContext, part, field)
    : parseGmChoiceSpeed(issueContext, gmChoice, field, contextLabel);
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
  const speedItemIssueCount = issueContext.issues.length;
  const speeds = speedLine
    .replace("**Speed**", "")
    .trim()
    .split(", ")
    .flatMap((part, index) => {
      const field = `speeds.${index}`;
      const projected = assess(issueContext, () =>
        parseSpeedEntry(issueContext, part, field, contextLabel),
      );
      return projected === undefined ? [] : [projected];
    });
  const [first, ...rest] = speeds;
  if (first === undefined) {
    /* v8 ignore next -- @preserve -- losing the item produced by split necessarily records a parsing issue */
    if (issueContext.issues.length > speedItemIssueCount) {
      return [{ kind: "walk", feet: { kind: "literal", value: 1 } }];
    }
    /* v8 ignore next -- @preserve -- split yields an item; an unprojectable item records an issue and returns through the branch above */
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
  const field = label === "Score" ? "abilityScores" : "savingThrowModifiers";
  const row = assess(issueContext, () =>
    requireLine(issueContext, lines, `| **${label}**`, field),
  );
  /* v8 ignore next -- @preserve -- matrix-style dispatch is selected only after the required labeled row is observed */
  if (row === undefined) return [0, 0, 0, 0, 0, 0];
  const cells = row
    .split("|")
    .slice(2, 8)
    .map((value) => value.trim());
  if (cells.length !== ABILITY_NAMES.length) {
    return malformedEvidence(
      issueContext,
      field,
      JSON.stringify(cells),
      `six ${contextLabel} ${label} values`,
      [0, 0, 0, 0, 0, 0],
    );
  }
  return cells.map((cell, index) =>
    label === "Score"
      ? parseAbilityScore(issueContext, cell, `${field}.${index}`)
      : parseAbilityMatrixNumber(
          issueContext,
          cell,
          /^[+−-]?\d+$/,
          `${field}.${index}`,
        ),
  );
};

type AbilityValues = readonly [number, number, number, number, number, number];

const isAbilityValues = (values: readonly number[]): values is AbilityValues =>
  values.length === ABILITY_NAMES.length && values.every(Number.isFinite);

const abilityRecord = (
  issueContext: ProjectionIssueContext,
  values: readonly number[],
  field: string,
): Readonly<Record<Ability, number>> => {
  /* v8 ignore next -- @preserve -- both ability parsers return exactly six finite decoded values or their six-value fallback */
  if (!isAbilityValues(values)) {
    return malformedEvidence(
      issueContext,
      field,
      JSON.stringify(values),
      "exactly six finite ability values",
      { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    );
  }
  const [str, dex, con, int, wis, cha] = values;
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

const parseAbilityScore = (
  issueContext: ProjectionIssueContext,
  value: string,
  field: string,
): number => {
  const syntacticValue = assess(issueContext, () =>
    parseAbilityMatrixNumber(issueContext, value, /^\d+$/, field),
  );
  return syntacticValue === undefined
    ? 10
    : decodeEvidenceValue(
        issueContext,
        StandaloneStatBlockAbilityScoreSchema,
        syntacticValue,
        value,
        field,
        "an integral ability score from 1 through 30",
        10,
      );
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
    score: parseAbilityScore(issueContext, rawScore, `${field}.score`),
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

const isAbilityMatrixHeader = (line: string): boolean => {
  const cells = line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
  return (
    cells.length === 9 &&
    cells.filter((cell) => cell === "MOD").length === 3 &&
    cells.filter((cell) => cell === "SAVE").length === 3
  );
};

const abilityMatrixRows = (
  lines: readonly string[],
  matrixHeaderIndex: number,
): readonly string[][] => {
  const rows: string[][] = [];
  for (const line of lines.slice(matrixHeaderIndex + 1)) {
    if (!line.startsWith("|")) {
      if (rows.length > 0) break;
      continue;
    }
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.every((cell) => /^[-:]+$/.test(cell))) continue;
    rows.push(cells);
  }
  return rows;
};

type AbilityMatrixRowCells = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

const isAbilityMatrixRowCells = (
  values: readonly string[],
): values is AbilityMatrixRowCells => values.length === 12;

const expandedAbilityMatrixCells = (
  cells: readonly string[],
): readonly string[] =>
  cells.flatMap((cell) => {
    const compactFact = cell.match(/^(\S+) (.+)$/);
    return compactFact === null
      ? [cell]
      : [matchCapture(compactFact, 1), matchCapture(compactFact, 2)];
  });

const parseAbilityMatrixRow = (
  issueContext: ProjectionIssueContext,
  cells: readonly string[],
  rowIndex: number,
  contextLabel: string,
): readonly AbilityMatrixFact[] => {
  const expandedCells = expandedAbilityMatrixCells(cells);
  if (
    !isAbilityMatrixRowCells(expandedCells) ||
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
};

const isAbilityMatrix = (
  facts: readonly AbilityMatrixFact[],
): facts is AbilityMatrix => facts.length === ABILITY_NAMES.length;

const parseAbilityMatrix = (
  issueContext: ProjectionIssueContext,
  lines: readonly string[],
  contextLabel: string,
): AbilityMatrix | undefined => {
  const matrixHeaderIndex = lines.findIndex(isAbilityMatrixHeader);
  if (matrixHeaderIndex === -1) return undefined;
  const rows = abilityMatrixRows(lines, matrixHeaderIndex);
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
  const facts = rows.flatMap((cells, rowIndex) =>
    parseAbilityMatrixRow(issueContext, cells, rowIndex, contextLabel),
  );
  if (issueContext.issues.length > matrixIssueCount) return undefined;
  if (
    !isAbilityMatrix(facts) ||
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
  return facts;
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
  const abilityHeaderIndex = lines.findIndex((line) => {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim().toLowerCase());
    return (
      cells.length === ABILITY_NAMES.length &&
      cells.every((cell, index) => cell === ABILITY_NAMES[index])
    );
  });
  const scoreCells =
    abilityHeaderIndex === -1
      ? undefined
      : lines
          .slice(abilityHeaderIndex + 1)
          .map((line) =>
            line
              .split("|")
              .slice(1, -1)
              .map((cell) => cell.trim()),
          )
          .find(
            (cells) =>
              cells.length === ABILITY_NAMES.length &&
              !cells.every((cell) => /^[-:]+$/.test(cell)),
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
    scoreCells.map((cell, index) => {
      const score = assess(issueContext, () =>
        requireMatch(
          issueContext,
          cell,
          /^(\d+) \([+−-]?\d+\)(?: Save .+)?$/,
          `abilityScores.${index}`,
        ),
      );
      return score === undefined
        ? 10
        : parseAbilityScore(
            issueContext,
            matchCapture(score, 1),
            `abilityScores.${index}`,
          );
    }),
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
  const abilityHeaderIndex = lines.findIndex((line) => {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim().toLowerCase());
    return (
      cells.length === ABILITY_NAMES.length &&
      cells.every((cell, index) => cell === ABILITY_NAMES[index])
    );
  });
  const combinedCells =
    /* v8 ignore next -- @preserve -- reaching combined-table parsing means the canonical ability header was already selected */
    abilityHeaderIndex === -1
      ? undefined
      : lines
          .slice(abilityHeaderIndex + 1)
          .map((line) =>
            line
              .split("|")
              .slice(1, -1)
              .map((cell) => cell.trim()),
          )
          .find(
            (cells) =>
              cells.length === ABILITY_NAMES.length &&
              !cells.every((cell) => /^[-:]+$/.test(cell)),
          );
  if (
    combinedCells !== undefined &&
    combinedCells.some((cell) => cell.includes(" Save "))
  ) {
    const saveValues = abilityRecord(
      issueContext,
      combinedCells.map((cell, index) => {
        const match = assess(issueContext, () =>
          requireMatch(
            issueContext,
            cell,
            / Save ([+−-]?\d+)$/,
            `savingThrowModifiers.${index}`,
          ),
        );
        const value = match?.[1];
        if (value === undefined) {
          return 0;
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
  const parts = line.replace("**Saves**", "").trim().split(", ");
  if (parts.length > ABILITY_NAMES.length) {
    malformedEvidence(
      issueContext,
      "savingThrowModifiers",
      String(parts.length),
      `at most ${ABILITY_NAMES.length} saving throw modifiers`,
      undefined,
    );
  }
  const seenAbilities = new Set<Ability>();
  return sortedAbsentOrNonEmpty(
    parts.flatMap((part, index) => {
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
          matchCapture(modifier, 1).toLowerCase(),
          `${field}.ability`,
        ),
        modifier: signedNumber(matchCapture(modifier, 2)),
      }));
      /* v8 ignore next -- @preserve -- the saving-throw regex admits only canonical abilities and signed integers */
      if (projected === undefined) return [];
      if (seenAbilities.has(projected.ability)) {
        malformedEvidence(
          issueContext,
          `${field}.ability`,
          matchCapture(modifier, 1),
          "a distinct saving throw ability",
          undefined,
        );
        return [];
      }
      seenAbilities.add(projected.ability);
      return [projected];
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
            normalizedIdentifier(matchCapture(modifier, 1)),
            `${field}.skill`,
          ),
          modifier: signedNumber(matchCapture(modifier, 2)),
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
              matchCapture(qualified, 1).toLowerCase(),
              "vulnerabilities.damageType",
            ),
          ],
          "vulnerabilities.damageTypes",
          "acid",
        ),
        qualifier: stripSrdStatBlockMarkdownEmphasis(
          matchCapture(qualified, 2),
        ),
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
    const optionClause = lines
      .map(normalizedProse)
      .find((candidate) =>
        candidate.includes("one of the following damage types"),
      );
    if (optionClause === undefined) {
      return missingEvidence(
        issueContext,
        "resistances.options",
        "the owning trait's chosen-resistance option clause",
        { kind: "choose_one_from", options: ["acid"] },
      );
    }
    const optionList = assess(issueContext, () =>
      requireMatch(
        issueContext,
        optionClause,
        /one of the following damage types [^:]*: ([A-Za-z, ]+)\./,
        "resistances.options",
      ),
    );
    if (optionList === undefined) {
      return { kind: "choose_one_from", options: ["acid"] };
    }
    const chosenOptions = matchCapture(optionList, 1)
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

type ParsedImmunityCondition = {
  readonly sourceIndex: number;
  readonly sourceEvidence: string;
  readonly value: Condition;
};

type ParsedQualifiedImmunityCondition = {
  readonly sourceIndex: number;
  readonly sourceEvidence: string;
  readonly value: {
    readonly condition: Condition;
    readonly qualifier: string;
  };
};

const parseImmunityDamageTypes = (
  issueContext: ProjectionIssueContext,
  value: string,
): readonly DamageType[] => {
  if (value === "") return [];
  return sortedStrings(
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
};

const parseImmunityConditions = (
  issueContext: ProjectionIssueContext,
  value: string,
): {
  readonly conditions: readonly ParsedImmunityCondition[];
  readonly qualifiedConditions: readonly ParsedQualifiedImmunityCondition[];
} => {
  const conditions: ParsedImmunityCondition[] = [];
  const qualifiedConditions: ParsedQualifiedImmunityCondition[] = [];
  const items = value === "" ? [] : value.split(", ");
  for (const [index, item] of items.entries()) {
    const qualified = item.match(/^([A-Za-z]+) \((.+)\)$/);
    if (qualified === null) {
      const condition = assess(issueContext, () =>
        parsedLiteral(
          issueContext,
          CONDITIONS,
          item.toLowerCase(),
          `immunities.conditions.${index}`,
        ),
      );
      if (condition !== undefined) {
        conditions.push({
          sourceIndex: index,
          sourceEvidence: item,
          value: condition,
        });
      }
      continue;
    }
    const condition = assess(issueContext, () =>
      parsedLiteral(
        issueContext,
        CONDITIONS,
        matchCapture(qualified, 1).toLowerCase(),
        `immunities.qualifiedConditions.${index}.condition`,
      ),
    );
    if (condition !== undefined) {
      qualifiedConditions.push({
        sourceIndex: index,
        sourceEvidence: item,
        value: { condition, qualifier: matchCapture(qualified, 2) },
      });
    }
  }
  return { conditions, qualifiedConditions };
};

const immunityGroupNames = (value: string): readonly string[] =>
  value
    .split(", ")
    .map((item) => item.match(/^([A-Za-z]+)/))
    .map((match) =>
      match === null ? "" : matchCapture(match, 1).toLowerCase(),
    );

const immunityGroupKindCounts = (
  value: string,
): { readonly conditions: number; readonly damageTypes: number } => {
  const conditionNames = new Set<string>(CONDITIONS);
  const damageTypeNames = new Set<string>(DAMAGE_TYPES);
  const names = immunityGroupNames(value);
  return {
    conditions: names.filter((name) => conditionNames.has(name)).length,
    damageTypes: names.filter((name) => damageTypeNames.has(name)).length,
  };
};

const immunityConditionsAndDamageTypes = (
  issueContext: ProjectionIssueContext,
  firstGroup: string,
  explicitConditions: string | undefined,
  firstGroupIsConditions: boolean,
): {
  readonly damageTypes: readonly DamageType[];
  readonly conditions: readonly ParsedImmunityCondition[];
  readonly qualifiedConditions: readonly ParsedQualifiedImmunityCondition[];
} => {
  const firstConditionValues = parseImmunityConditions(
    issueContext,
    firstGroupIsConditions ? firstGroup : "",
  );
  const explicitConditionValues = parseImmunityConditions(
    issueContext,
    explicitConditions === undefined ? "" : explicitConditions,
  );
  return {
    damageTypes: firstGroupIsConditions
      ? []
      : parseImmunityDamageTypes(issueContext, firstGroup),
    conditions: firstGroupIsConditions
      ? firstConditionValues.conditions
      : explicitConditionValues.conditions,
    qualifiedConditions: firstGroupIsConditions
      ? firstConditionValues.qualifiedConditions
      : explicitConditionValues.qualifiedConditions,
  };
};

const nonOverlappingImmunityConditions = (
  issueContext: ProjectionIssueContext,
  conditions: readonly ParsedImmunityCondition[],
  qualifiedConditions: readonly ParsedQualifiedImmunityCondition[],
): readonly ParsedQualifiedImmunityCondition[] => {
  const fixedConditionSet = new Set(conditions.map(({ value }) => value));
  return qualifiedConditions.filter(
    ({ sourceIndex, sourceEvidence, value }) => {
      if (!fixedConditionSet.has(value.condition)) return true;
      malformedEvidence(
        issueContext,
        `immunities.qualifiedConditions.${sourceIndex}.condition`,
        sourceEvidence,
        "a condition not already declared as a fixed immunity",
        undefined,
      );
      return false;
    },
  );
};

const decodedImmunityList = (
  issueContext: ProjectionIssueContext,
  damageTypes: readonly DamageType[],
  conditions: readonly ParsedImmunityCondition[],
  qualifiedConditions: readonly ParsedQualifiedImmunityCondition[],
): typeof DEPENDENCY_FALLBACK_IMMUNITY =>
  decodeProjectionValue(
    issueContext,
    CreatureImmunityListSchema,
    {
      ...(damageTypes.length === 0 ? {} : { damageTypes }),
      ...(conditions.length === 0
        ? {}
        : { conditions: sortedStrings(conditions.map(({ value }) => value)) }),
      ...(qualifiedConditions.length === 0
        ? {}
        : {
            qualifiedConditions: qualifiedConditions
              .map(({ value }) => value)
              .sort(compareCondition),
          }),
    },
    "immunities",
    DEPENDENCY_FALLBACK_IMMUNITY,
  );

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
  const immunityGroups = line.replace("**Immunities**", "").trim().split("; ");
  if (immunityGroups.length > 2) {
    malformedEvidence(
      issueContext,
      "immunities.groups",
      immunityGroups.join("; "),
      "at most one damage-type group and one condition group",
      undefined,
    );
  }
  const [firstGroup = "", explicitConditions] = immunityGroups;
  const kindCounts = immunityGroupKindCounts(firstGroup);
  if (
    explicitConditions === undefined &&
    kindCounts.conditions === kindCounts.damageTypes
  ) {
    return unsupportedEvidence(
      issueContext,
      "immunities.group",
      firstGroup,
      "an unambiguous damage-type or condition immunity list",
      { kind: "some", value: DEPENDENCY_FALLBACK_IMMUNITY },
    );
  }
  const firstGroupIsConditions =
    explicitConditions === undefined &&
    kindCounts.conditions > kindCounts.damageTypes;
  const { damageTypes, conditions, qualifiedConditions } =
    immunityConditionsAndDamageTypes(
      issueContext,
      firstGroup,
      explicitConditions,
      firstGroupIsConditions,
    );
  const nonOverlappingQualifiedConditions = nonOverlappingImmunityConditions(
    issueContext,
    conditions,
    qualifiedConditions,
  );
  return {
    kind: "some",
    value: decodedImmunityList(
      issueContext,
      damageTypes,
      conditions,
      nonOverlappingQualifiedConditions,
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
          const kind = parsedLiteral(
            issueContext,
            ["darkvision", "blindsight", "tremorsense", "truesight"] as const,
            matchCapture(sense, 1).toLowerCase(),
            `${field}.kind`,
          );
          const rangeFeet = positiveIntegerEvidence(
            issueContext,
            matchCapture(sense, 2),
            `${field}.rangeFeet`,
          );
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
                rangeFeet,
                qualifier: "unimpeded_by_magical_darkness" as const,
              },
            ];
          }
          return [{ kind, rangeFeet }];
        });
  return {
    senses: sortedAbsentOrNonEmpty(senses, ({ kind }) => kind),
    passivePerception:
      passive === undefined
        ? 1
        : decodeEvidenceValue(
            issueContext,
            StatBlockPassivePerceptionSchema,
            Number(passive[1]),
            passive[1] ?? "",
            "passivePerception",
            "a nonnegative integer",
            0,
          ),
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
    .map((part, index) => {
      const gear = requireMatch(
        issueContext,
        part,
        /^(.*?)(?: \((\d+)\))?$/,
        "gear",
      );
      const quantity =
        gear[2] === undefined
          ? 1
          : positiveIntegerEvidence(
              issueContext,
              gear[2],
              `gear.${index}.quantity`,
            );
      const itemEvidence = matchCapture(gear, 1);
      const item = decodeEvidenceValue(
        issueContext,
        StatBlockGearItemSchema,
        projectedGearItem(itemEvidence, quantity),
        itemEvidence,
        `gear.${index}.item`,
        "a nonempty gear item label",
        "Gear",
      );
      return {
        item,
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

const parseLanguageNames = (
  issueContext: ProjectionIssueContext,
  value: string,
  field: string,
) =>
  nonEmptyValues(
    issueContext,
    value.split(/, (?![^()]*\))| and /).map((language, index) => {
      const evidence = language.replace(/^and /, "");
      return decodeEvidenceValue(
        issueContext,
        StatBlockLanguageNameSchema,
        evidence,
        evidence,
        `${field}.${index}`,
        "a nonempty non-reserved language name",
        "Common",
      );
    }),
    field,
    "Common",
  );

const parseLanguageSet = (
  issueContext: ProjectionIssueContext,
  value: string,
  languageField = "communication.languages",
): unknown => {
  if (value === "All") return { kind: "all" };
  const additional = value.match(
    /^(.+) plus (one|two|three|four|five) other languages?$/,
  );
  const languages = parseLanguageNames(
    issueContext,
    additional === null ? value : matchCapture(additional, 1),
    languageField,
  );
  if (additional === null) return { kind: "named", languages };
  const additionalLanguageWord = matchCapture(additional, 2);
  const additionalLanguageCount = NUMBER_WORDS.find(
    ([word]) => word === additionalLanguageWord,
  )?.[1] as 1 | 2 | 3 | 4 | 5;
  return {
    kind: "named_plus_other_languages",
    languages,
    additionalLanguages: additionalLanguageCount,
  };
};

const trailingTelepathy = (
  issueContext: ProjectionIssueContext,
  telepathyText: RegExpMatchArray | null,
): { readonly telepathy?: { readonly rangeFeet: number } } => {
  if (telepathyText === null) return {};
  return {
    telepathy: {
      rangeFeet: positiveIntegerEvidence(
        issueContext,
        matchCapture(telepathyText, 1),
        "communication.telepathy.rangeFeet",
      ),
    },
  };
};

const parseTelepathyCommunicationQualifier = (
  issueContext: ProjectionIssueContext,
  qualifier: string,
  spokenLanguages: unknown,
): unknown => {
  const telepathy = assess(issueContext, () =>
    requireMatch(
      issueContext,
      qualifier,
      /^telepathy (\d+) ft\.(?: \((doesn't allow the receiving creature to respond telepathically|works only with creatures that understand (.+))\))?$/,
      "communication.telepathy",
    ),
  );
  if (telepathy === undefined) {
    return { kind: "spoken_and_understood", languages: spokenLanguages };
  }
  return {
    kind: "spoken_and_understood",
    languages: spokenLanguages,
    telepathy: {
      rangeFeet: positiveIntegerEvidence(
        issueContext,
        matchCapture(telepathy, 1),
        "communication.telepathy.rangeFeet",
      ),
      ...(telepathy[3] === undefined
        ? {}
        : {
            requiresLanguageUnderstanding: parseLanguageSet(
              issueContext,
              telepathy[3],
              "communication.telepathy.requiresLanguageUnderstanding.languages",
            ),
          }),
      ...(telepathy[2]?.startsWith("doesn't allow") === true
        ? { response: "receiving_creature_cannot_respond" as const }
        : {}),
    },
  };
};

const parseUnderstoodCommunicationQualifier = (
  issueContext: ProjectionIssueContext,
  qualifier: string,
  spokenLanguages: unknown,
): unknown => {
  const understood = assess(issueContext, () =>
    requireMatch(
      issueContext,
      qualifier,
      /^understands (.+) but can't speak them$/,
      "communication.understoodLanguages",
    ),
  );
  if (understood === undefined) {
    return { kind: "spoken_and_understood", languages: spokenLanguages };
  }
  return {
    kind: "spoken_and_understood",
    languages: spokenLanguages,
    additionallyUnderstoodButCannotSpeak: {
      kind: "named",
      languages: parseLanguageNames(
        issueContext,
        matchCapture(understood, 1),
        "communication.additionallyUnderstoodButCannotSpeak.languages",
      ),
    },
  };
};

const parseCommunicationQualifier = (
  issueContext: ProjectionIssueContext,
  qualifier: string | undefined,
  spokenLanguages: unknown,
  text: string,
  contextLabel: string,
): unknown => {
  if (qualifier === undefined) {
    return { kind: "spoken_and_understood", languages: spokenLanguages };
  }
  if (qualifier.startsWith("telepathy ")) {
    return parseTelepathyCommunicationQualifier(
      issueContext,
      qualifier,
      spokenLanguages,
    );
  }
  if (qualifier.startsWith("understands ")) {
    return parseUnderstoodCommunicationQualifier(
      issueContext,
      qualifier,
      spokenLanguages,
    );
  }
  return unsupportedEvidence(
    issueContext,
    "communication",
    text,
    `${contextLabel} supported Languages shape`,
    { kind: "spoken_and_understood", languages: spokenLanguages },
  );
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
  const telepathy = trailingTelepathy(issueContext, telepathyText);
  const understoodOnly = withoutTelepathy.match(
    /^Understands (.+) but can't speak$/,
  );
  if (understoodOnly !== null) {
    return {
      kind: "understood_but_cannot_speak",
      languages: parseLanguageSet(
        issueContext,
        matchCapture(understoodOnly, 1),
      ),
      ...telepathy,
    };
  }
  const communicationGroups = withoutTelepathy.split("; ");
  if (communicationGroups.length > 2) {
    malformedEvidence(
      issueContext,
      "communication.groups",
      withoutTelepathy,
      "a spoken-language group and at most one qualifier",
      undefined,
    );
  }
  const [spoken = "", qualifier] = communicationGroups;
  const spokenLanguages = parseLanguageSet(issueContext, spoken);
  if (telepathyText !== null) {
    return {
      kind: "spoken_and_understood",
      languages: spokenLanguages,
      ...telepathy,
    };
  }
  return parseCommunicationQualifier(
    issueContext,
    qualifier,
    spokenLanguages,
    text,
    contextLabel,
  );
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
  return Result.match(
    Schema.decodeUnknownResult(StatBlockCommunicationSchema)(candidate),
    {
      /* v8 ignore start -- @preserve -- the candidate is assembled from the same decoded domain fields required by StatBlockCommunicationSchema */
      onFailure: (error) =>
        malformedEvidence(
          issueContext,
          "communication",
          String(error),
          "canonical Stat Block communication",
          { kind: "none" },
        ),
      /* v8 ignore stop -- @preserve */
      onSuccess: (communication) => communication,
    },
  );
};

const assessedProjection = <Value>(
  issueContext: ProjectionIssueContext,
  projection: () => Value,
  fallback: Value,
): Value => {
  const result = assess(issueContext, projection);
  return result === undefined ? fallback : result;
};

const parseRawArmorClass = (
  issueContext: ProjectionIssueContext,
  lines: readonly string[],
): ScopedGeneralFacts["ac"] => {
  const ac = assess(issueContext, () =>
    requireLineMatch(
      issueContext,
      lines,
      "**AC**",
      /\*\*AC\*\* (\d+)(?: \(([^)]+)\))?/,
      "ac",
    ),
  );
  if (ac === undefined) {
    return { value: { kind: "literal", value: 1 } };
  }
  const valueEvidence = matchCapture(ac, 1);
  return {
    value: decodeEvidenceValue(
      issueContext,
      StandaloneStatBlockValueSchema,
      { kind: "literal" as const, value: Number(valueEvidence) },
      valueEvidence,
      "ac.value",
      "a positive integer Armor Class",
      { kind: "literal" as const, value: 1 },
    ),
    ...(ac[2] === undefined
      ? {}
      : {
          annotations: [
            decodeEvidenceValue(
              issueContext,
              StatBlockArmorClassAnnotationSchema,
              ac[2],
              ac[2],
              "ac.annotations.0",
              "a nonempty Armor Class annotation",
              "armor",
            ),
          ] as const,
        }),
  };
};

const parseRawHitPoints = (
  issueContext: ProjectionIssueContext,
  lines: readonly string[],
): ScopedGeneralFacts["hp"] => {
  const hp = assess(issueContext, () =>
    requireLineMatch(issueContext, lines, "**HP**", /\*\*HP\*\* (\d+)/, "hp"),
  );
  if (hp === undefined) return { kind: "literal", value: 1 };
  const evidence = matchCapture(hp, 1);
  return decodeEvidenceValue(
    issueContext,
    StandaloneStatBlockValueSchema,
    { kind: "literal" as const, value: Number(evidence) },
    evidence,
    "hp",
    "a canonical positive Hit Point value",
    { kind: "literal" as const, value: 1 },
  );
};

const parseRawInitiative = (
  issueContext: ProjectionIssueContext,
  lines: readonly string[],
  name: string,
): ScopedGeneralFacts["initiative"] => {
  const initiativeLine = lines.find((line) => line.includes("**Initiative**"));
  const initiativeEvidence = assess(issueContext, () =>
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
        ),
  );
  if (initiativeEvidence === undefined) return { modifier: 0, score: 0 };
  return decodeEvidenceValue(
    issueContext,
    StatBlockInitiativeSchema,
    {
      modifier: signedNumber(matchCapture(initiativeEvidence, 1)),
      score: Number(initiativeEvidence[2]),
    },
    /* v8 ignore next -- @preserve -- missing Initiative evidence returns above; a surviving match retains its source line */
    initiativeLine === undefined ? "" : initiativeLine,
    "initiative",
    "canonical Initiative modifier and nonnegative score",
    { modifier: 0, score: 0 },
  );
};

const parseRawChallengeRating = (
  issueContext: ProjectionIssueContext,
  lines: readonly string[],
): ScopedGeneralFacts["challengeRating"] => {
  const match = assess(issueContext, () =>
    requireLineMatch(
      issueContext,
      lines,
      "**CR**",
      /\*\*CR\*\* (\d+)(?:\/(\d+))?/,
      "challengeRating",
    ),
  );
  if (match === undefined) return 0;
  const numeratorEvidence = matchCapture(match, 1);
  const denominatorEvidence = match[2] === undefined ? "1" : match[2];
  const challengeRatingEvidence =
    match[2] === undefined
      ? numeratorEvidence
      : `${numeratorEvidence}/${denominatorEvidence}`;
  const denominator = assess(issueContext, () =>
    decodeEvidenceValue(
      issueContext,
      PositiveIntegerSchema,
      Number(denominatorEvidence),
      denominatorEvidence,
      "challengeRating.denominator",
      "a positive challenge-rating denominator",
      1,
    ),
  );
  if (denominator === undefined) return 0;
  const candidate = Number(numeratorEvidence) / denominator;
  return isChallengeRating(candidate)
    ? candidate
    : unsupportedEvidence(
        issueContext,
        "challengeRating",
        challengeRatingEvidence,
        "a canonical challenge rating",
        0 as const,
      );
};

const parseRawSavingThrowModifiers = (
  issueContext: ProjectionIssueContext,
  lines: readonly string[],
  name: string,
  abilityScores: Readonly<Record<Ability, number>> | undefined,
): ScopedGeneralFacts["savingThrowModifiers"] => {
  const hasIndependentEvidence = lines.some(
    (line) =>
      line.startsWith("| **Save**") ||
      (line.startsWith("|") && line.includes(" Save ")),
  );
  if (abilityScores === undefined && !hasIndependentEvidence) return [];
  return assessedProjection(
    issueContext,
    () => parseSavingThrowModifiers(issueContext, lines, name),
    [],
  );
};

const parseRawGeneralFacts = (
  issueContext: ProjectionIssueContext,
  name: string,
  lines: readonly string[],
): ScopedGeneralFacts => {
  const metadata = assessedProjection(
    issueContext,
    () => parseMetadata(issueContext, lines, name),
    {
      sizeAndSwarm: { size: "medium" as const },
      creatureType: "beast" as const,
      creatureTypeTags: [],
      alignment: "unaligned" as const,
    },
  );
  const ac = parseRawArmorClass(issueContext, lines);
  const hp = parseRawHitPoints(issueContext, lines);
  const initiative = parseRawInitiative(issueContext, lines, name);
  const challengeRating = parseRawChallengeRating(issueContext, lines);
  const speeds = assessedProjection(
    issueContext,
    () => parseSpeeds(issueContext, lines, name),
    [{ kind: "walk", feet: { kind: "literal", value: 1 } }],
  );
  const parsedAbilityScores = assess(issueContext, () =>
    parseAbilityScores(issueContext, lines, name),
  );
  const abilityScores =
    parsedAbilityScores === undefined
      ? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
      : parsedAbilityScores;
  const savingThrowModifiers = parseRawSavingThrowModifiers(
    issueContext,
    lines,
    name,
    parsedAbilityScores,
  );
  const skillModifiers = assessedProjection(
    issueContext,
    () => parseNamedModifiers(issueContext, lines, "Skills"),
    [],
  );
  const vulnerabilities = assessedProjection(
    issueContext,
    () => parseVulnerabilities(issueContext, lines),
    { kind: "none" as const },
  );
  const resistances = assessedProjection(
    issueContext,
    () => parseResistances(issueContext, lines),
    { kind: "none" as const },
  );
  const immunities = assessedProjection(
    issueContext,
    () => parseImmunities(issueContext, lines),
    { kind: "none" as const },
  );
  const senses = assessedProjection(
    issueContext,
    () => parseSenses(issueContext, lines),
    { senses: [], passivePerception: 1 },
  );
  const gear = assessedProjection(
    issueContext,
    () => parseGear(issueContext, lines),
    [],
  );
  const communication = assessedProjection(
    issueContext,
    () => parseCommunication(issueContext, lines, name),
    { kind: "none" as const },
  );
  return {
    challengeRating,
    ...metadata,
    ac,
    hp,
    speeds,
    abilityScores,
    initiative,
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

type RawEntryDraft = {
  readonly section: RawSection;
  readonly index: number;
  readonly name: string;
  parts: string[];
};

const appendRawEntry = (
  issueContext: ProjectionIssueContext,
  entries: RawEntry[],
  draft: RawEntryDraft | undefined,
): void => {
  if (draft === undefined) return;
  const descriptionEvidence = normalizedProse(draft.parts.join(" "));
  const isTrait = draft.section === "Traits";
  const descriptionField = isTrait
    ? `traits.${draft.index}.description`
    : `procedures.${normalizedIdentifier(draft.section)}.${draft.index}.description`;
  entries.push({
    section: draft.section,
    name: draft.name,
    description: decodeEvidenceValue(
      issueContext,
      isTrait
        ? CreatureTraitDescriptionSchema
        : StatBlockProcedureDescriptionSchema,
      descriptionEvidence,
      descriptionEvidence,
      descriptionField,
      isTrait
        ? "a canonical trait description"
        : "a nonempty procedure description",
      isTrait ? "" : "Unsupported procedure description.",
    ),
  });
};

const nextRawEntryIndex = (
  entryCounts: Map<RawSection, number>,
  section: RawSection,
): number => {
  const existing = entryCounts.get(section);
  const index = existing === undefined ? 0 : existing;
  entryCounts.set(section, index + 1);
  return index;
};

const startRawEntry = (
  issueContext: ProjectionIssueContext,
  entryCounts: Map<RawSection, number>,
  section: RawSection,
  entry: RegExpMatchArray,
): RawEntryDraft => {
  const index = nextRawEntryIndex(entryCounts, section);
  const isTrait = section === "Traits";
  const nameEvidence = matchCapture(entry, 1);
  return {
    section,
    index,
    name: decodeEvidenceValue(
      issueContext,
      isTrait ? CreatureTraitNameSchema : StatBlockProcedureNameSchema,
      nameEvidence,
      nameEvidence,
      isTrait
        ? `traits.${index}.name`
        : `procedures.${normalizedIdentifier(section)}.${index}.name`,
      isTrait ? "a canonical trait name" : "a nonempty trimmed procedure name",
      isTrait ? "Trait" : "Procedure",
    ),
    parts: [matchCapture(entry, 2)],
  };
};

const parseRawEntries = (
  issueContext: ProjectionIssueContext,
  lines: readonly string[],
): readonly RawEntry[] => {
  const entries: RawEntry[] = [];
  let section: RawSection | undefined;
  let current: RawEntryDraft | undefined;
  const entryCounts = new Map<RawSection, number>();

  for (const line of lines) {
    const heading = line.match(
      /^#{3,4} (Traits|Actions|Bonus Actions|Reactions|Legendary Actions)$/,
    );
    if (heading !== null) {
      appendRawEntry(issueContext, entries, current);
      current = undefined;
      section = parsedLiteral(
        issueContext,
        RAW_SECTIONS,
        matchCapture(heading, 1),
        "entries.section",
      );
      continue;
    }
    const entry = line.match(/^\*{2,3}(.*?)\.\*{2,3}\s*(.*)$/);
    if (entry !== null && section !== undefined) {
      appendRawEntry(issueContext, entries, current);
      current = startRawEntry(issueContext, entryCounts, section, entry);
      continue;
    }
    if (current !== undefined && !isLegendaryActionUsesLine(line)) {
      current.parts.push(line);
    }
  }
  appendRawEntry(issueContext, entries, current);
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
  /* v8 ignore next -- @preserve -- callers pass an ability name captured by a closed RAW ability-name regex */
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

const parsedDamageFlat = (
  match: RegExpMatchArray,
): { readonly flat?: number } => {
  if (match[5] === undefined) return {};
  const sign = match[4] === "−" || match[4] === "-" ? -1 : 1;
  return { flat: Number(match[5]) * sign };
};

const parsedDamageAmount = (
  issueContext: ProjectionIssueContext,
  match: RegExpMatchArray,
  field: string,
  staticDamage: number,
): DamageAmountProjection => {
  if (match[2] === undefined || match[3] === undefined) {
    return { kind: "static", static: staticDamage };
  }
  return {
    kind: "dice_expression",
    static: staticDamage,
    expr: {
      dice: decodeEvidenceValue(
        issueContext,
        PositiveIntegerSchema,
        Number(match[2]),
        match[2],
        `${field}.dice`,
        "a positive integer damage die count",
        1,
      ),
      dieSize: decodeEvidenceValue(
        issueContext,
        DamageDieSizeSchema,
        Number(match[3]),
        match[3],
        `${field}.dieSize`,
        "a canonical damage die size",
        4,
      ),
      ...parsedDamageFlat(match),
    },
  };
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
  const damageTypeText = match[6] as string;
  const staticDamage = decodeEvidenceValue(
    issueContext,
    PositiveIntegerSchema,
    Number(match[1]),
    matchCapture(match, 1),
    `${field}.static`,
    "a positive integer static damage value",
    1,
  );
  return {
    kind: "damage",
    damageType: parsedLiteral(
      issueContext,
      DAMAGE_TYPES,
      damageTypeText.toLowerCase(),
      `${field}.damageType`,
    ),
    amount: parsedDamageAmount(issueContext, match, field, staticDamage),
  };
};

const parseRawResourceLimits = (
  issueContext: ProjectionIssueContext,
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
        minimumRoll: decodeEvidenceValue(
          issueContext,
          Schema.Number.pipe(
            Schema.check(
              Schema.isInt(),
              Schema.isBetween({ minimum: 2, maximum: 6 }),
            ),
          ),
          Number(recharge[1]),
          matchCapture(recharge, 1),
          `resources.${normalizedProcedureName(name)}.minimumRoll`,
          "a recharge minimum from 2 through 6",
          6,
        ),
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
          uses: positiveIntegerEvidence(
            issueContext,
            matchCapture(daily, 1),
            `resources.${normalizedProcedureName(name)}.uses`,
          ),
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

type DiceDamageAmount = Extract<
  DamageAmountProjection,
  { readonly kind: "dice_expression" }
>;

const isDamagePair = (
  damages: readonly DamageProjection[],
): damages is readonly [DamageProjection, DamageProjection] =>
  damages.length === 2;

const comparableDiceDamageAmounts = (
  baseAmount: DamageAmountProjection,
  totalAmount: DamageAmountProjection,
):
  | {
      readonly base: DiceDamageAmount;
      readonly total: DiceDamageAmount;
    }
  | undefined => {
  if (
    baseAmount.kind !== "dice_expression" ||
    totalAmount.kind !== "dice_expression"
  ) {
    return undefined;
  }
  if (baseAmount.expr.dieSize !== totalAmount.expr.dieSize) return undefined;
  if (totalAmount.expr.dice <= baseAmount.expr.dice) return undefined;
  if (totalAmount.static <= baseAmount.static) return undefined;
  return { base: baseAmount, total: totalAmount };
};

const diceExpressionFlat = (amount: DiceDamageAmount): number =>
  amount.expr.flat === undefined ? 0 : amount.expr.flat;

const alternativeBonusDamage = (
  damages: readonly DamageProjection[],
): AttackEffectProjection | undefined => {
  if (!isDamagePair(damages)) return undefined;
  const [baseDamage, totalDamage] = damages;
  if (baseDamage.damageType !== totalDamage.damageType) return undefined;
  const amounts = comparableDiceDamageAmounts(
    baseDamage.amount,
    totalDamage.amount,
  );
  if (amounts === undefined) return undefined;
  const flat =
    diceExpressionFlat(amounts.total) - diceExpressionFlat(amounts.base);
  return {
    kind: "conditional_bonus_damage",
    damageType: totalDamage.damageType,
    amount: {
      kind: "dice_expression",
      static: amounts.total.static - amounts.base.static,
      expr: {
        dice: amounts.total.expr.dice - amounts.base.expr.dice,
        dieSize: amounts.total.expr.dieSize,
        ...(flat === 0 ? {} : { flat }),
      },
    },
    when: "attack_roll_had_advantage",
  };
};

const parsedAttackDamages = (
  issueContext: ProjectionIssueContext,
  hit: string,
  entryName: string,
): ReadonlyNonEmptyArray<DamageProjection> | undefined => {
  const damageTexts = Array.from(
    hit.matchAll(
      /(\d+)(?: \((\d+)d(\d+)(?: ([+−-]) (\d+))?\))? ([A-Z][a-z]+) damage/g,
    ),
    (damage) => damage[0],
  );
  const damages = damageTexts.map((damage, index) =>
    parseDamage(issueContext, damage, `procedures.${entryName}.onHit.${index}`),
  );
  /* v8 ignore next -- @preserve -- matchAll and parseDamage use the same complete damage-expression grammar */
  if (damages.some((damage) => damage === undefined)) return undefined;
  const parsed = damages.filter(
    (damage): damage is DamageProjection => damage !== undefined,
  );
  const [first, ...rest] = parsed;
  return first === undefined ? undefined : [first, ...rest];
};

const projectedAttackOnHit = (
  hit: string,
  damages: ReadonlyNonEmptyArray<DamageProjection>,
): readonly AttackEffectProjection[] | undefined => {
  const advantageConditional =
    /if (?:the attack roll|the [A-Za-z ]+) had Advantage(?: on the attack roll)?$/i.test(
      hit,
    );
  const totalDamageAlternative = advantageConditional && hit.includes(", or ");
  if (totalDamageAlternative) {
    const bonus = alternativeBonusDamage(damages);
    return bonus === undefined ? undefined : [damages[0], bonus];
  }
  return damages.map((damage, index) =>
    advantageConditional && index === damages.length - 1
      ? {
          ...damage,
          kind: "conditional_bonus_damage",
          when: "attack_roll_had_advantage",
        }
      : damage,
  );
};

const sizeConditionalAttackEffect = (
  issueContext: ProjectionIssueContext,
  hit: string,
  entryName: string,
): readonly AttackEffectProjection[] => {
  const condition = hit.match(
    /If the target is a (Tiny|Small|Medium|Large|Huge|Gargantuan) or smaller creature, it has the ([A-Za-z]+) condition/,
  );
  if (condition === null) return [];
  return [
    {
      kind: "apply_condition_if_target_size_at_most",
      maxCreatureSize: parsedLiteral(
        issueContext,
        SIZES,
        matchCapture(condition, 1).toLowerCase(),
        `procedures.${entryName}.targetSize`,
      ),
      condition: parsedLiteral(
        issueContext,
        CONDITIONS,
        matchCapture(condition, 2).toLowerCase(),
        `procedures.${entryName}.condition`,
      ),
    },
  ];
};

const turnConditionalAttackEffect = (
  issueContext: ProjectionIssueContext,
  hit: string,
  entryName: string,
  timing: "target_next_turn_end" | "source_next_turn_end",
): readonly AttackEffectProjection[] => {
  const condition = Match.value(timing).pipe(
    Match.when("target_next_turn_end", () =>
      hit.match(
        /(?:and )?the target has the ([A-Za-z]+) condition until the end of its next turn$/,
      ),
    ),
    Match.when("source_next_turn_end", () =>
      hit.match(
        /, and the target has the ([A-Za-z]+) condition until the end of the [A-Za-z]+(?: [A-Za-z]+)*'s next turn$/,
      ),
    ),
    Match.exhaustive,
  );
  if (condition === null) return [];
  return [
    {
      kind: "apply_condition",
      condition: parsedLiteral(
        issueContext,
        CONDITIONS,
        matchCapture(condition, 1).toLowerCase(),
        `procedures.${entryName}.condition`,
      ),
      expiresAt: timing,
    },
  ];
};

const attackConditionEffects = (
  issueContext: ProjectionIssueContext,
  hit: string,
  entryName: string,
): readonly AttackEffectProjection[] => [
  ...sizeConditionalAttackEffect(issueContext, hit, entryName),
  ...turnConditionalAttackEffect(
    issueContext,
    hit,
    entryName,
    "target_next_turn_end",
  ),
  ...turnConditionalAttackEffect(
    issueContext,
    hit,
    entryName,
    "source_next_turn_end",
  ),
];

const attackHitResidual = (hit: string): string =>
  hit
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

const parsedAttackType = (match: RegExpMatchArray): "melee" | "ranged" => {
  const attackType = matchCapture(match, 1).toLowerCase();
  return attackType as "melee" | "ranged";
};

const rangedAttackRange = (
  issueContext: ProjectionIssueContext,
  match: RegExpMatchArray,
  entryName: string,
): { readonly normal: number; readonly long: number } => {
  const normalEvidence = matchCapture(match, 4);
  const longEvidence = match[5] === undefined ? normalEvidence : match[5];
  const candidate = assess(issueContext, () => ({
    normal: positiveIntegerEvidence(
      issueContext,
      normalEvidence,
      `procedures.${entryName}.rangeFeet.normal`,
    ),
    long: positiveIntegerEvidence(
      issueContext,
      longEvidence,
      `procedures.${entryName}.rangeFeet.long`,
    ),
  }));
  if (candidate === undefined) return { normal: 1, long: 1 };
  return decodeEvidenceValue(
    issueContext,
    RangedAttackRangeSchema,
    candidate,
    match[5] === undefined
      ? normalEvidence
      : `${normalEvidence}/${longEvidence}`,
    `procedures.${entryName}.rangeFeet`,
    "positive normal range not exceeding long range",
    { normal: 1, long: 1 },
  );
};

const attackAmmunition = (
  procedureName: string,
  gear: ScopedGeneralFacts["gear"],
  ammunitionByWeapon: ReadonlyMap<string, string>,
): string | undefined => {
  if (!gear.some(({ item }) => item === procedureName)) return undefined;
  return ammunitionByWeapon.get(procedureName);
};

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
  /* v8 ignore next -- @preserve -- parseRawProcedure establishes a procedure section before calling this parser */
  if (section === undefined) return undefined;
  const match = entry.description.match(
    /^(Melee|Ranged) Attack Roll: ([+−-]\d+)(?: to hit)?, (?:(?:reach (\d+) (?:ft|feet)\.)|(?:range (\d+)(?:\/(\d+))? (?:ft|feet)\.)) Hit: (.+)\.$/,
  );
  if (match === null) return undefined;
  const hit = matchCapture(match, 6);
  const parsedDamages = parsedAttackDamages(issueContext, hit, entry.name);
  if (parsedDamages === undefined) return undefined;
  const projectedOnHit = projectedAttackOnHit(hit, parsedDamages);
  if (projectedOnHit === undefined) return undefined;
  const onHit = [
    ...projectedOnHit,
    ...attackConditionEffects(issueContext, hit, entry.name),
  ];
  if (attackHitResidual(hit) !== "") return undefined;
  const attackType = parsedAttackType(match);
  const attackAbility = attackAbilityEvidence(
    rawAttackAbilityCandidates(
      generalFacts.abilityScores,
      generalFacts.challengeRating,
      signedNumber(matchCapture(match, 2)),
    ),
  );
  if (attackAbility === undefined) return undefined;
  const procedureName = normalizedProcedureName(entry.name);
  const ammunition = attackAmmunition(
    procedureName,
    generalFacts.gear,
    ammunitionByWeapon,
  );
  const commonAttack = {
    section,
    name: procedureName,
    kind: "attack_roll" as const,
    attackBonus: signedNumber(matchCapture(match, 2)),
    attackAbilityEvidence: attackAbility,
    onHit: nonEmptyValues(
      issueContext,
      onHit,
      `procedures.${entry.name}.onHit`,
      parsedDamages[0],
    ),
    resourceLimits: parseRawResourceLimits(issueContext, entry.name),
  };
  return Match.value(attackType).pipe(
    Match.when("melee", (attackType) => ({
      ...commonAttack,
      attackType,
      reachFeet: positiveIntegerEvidence(
        issueContext,
        matchCapture(match, 3),
        `procedures.${entry.name}.reachFeet`,
      ),
    })),
    Match.when("ranged", (attackType) => ({
      ...commonAttack,
      attackType,
      rangeFeet: rangedAttackRange(issueContext, match, entry.name),
      ...(ammunition === undefined ? {} : { ammunition }),
    })),
    Match.exhaustive,
  );
};

type SimpleSaveShape = {
  readonly kind: "line" | "cone";
  readonly match: RegExpMatchArray;
};

const simpleSaveShape = (description: string): SimpleSaveShape | undefined => {
  const line = description.match(
    /^(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) Saving Throw: DC (\d+), each creature in an? (\d+)-foot-long, (\d+)-foot-wide Line\. Failure: (.+)\. Success: Half damage\.$/,
  );
  if (line !== null) return { kind: "line", match: line };
  const cone = description.match(
    /^(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) Saving Throw: DC (\d+), each creature in a (\d+)-foot Cone\. Failure: (.+)\. Success: Half damage\.$/,
  );
  return cone === null ? undefined : { kind: "cone", match: cone };
};

const simpleSaveArea = (
  issueContext: ProjectionIssueContext,
  shape: SimpleSaveShape,
  entryName: string,
): Extract<ProcedureProjection, { readonly kind: "save" }>["area"] =>
  Match.value(shape.kind).pipe(
    Match.when("cone", (kind) => ({
      kind,
      lengthFeet: positiveIntegerEvidence(
        issueContext,
        matchCapture(shape.match, 3),
        `procedures.${entryName}.area.lengthFeet`,
      ),
    })),
    Match.when("line", (kind) => ({
      kind,
      lengthFeet: positiveIntegerEvidence(
        issueContext,
        matchCapture(shape.match, 3),
        `procedures.${entryName}.area.lengthFeet`,
      ),
      widthFeet: positiveIntegerEvidence(
        issueContext,
        matchCapture(shape.match, 4),
        `procedures.${entryName}.area.widthFeet`,
      ),
    })),
    Match.exhaustive,
  );

const parseSimpleSave = (
  issueContext: ProjectionIssueContext,
  entry: RawEntry,
): ProcedureProjection | undefined => {
  const section = procedureSection(entry.section);
  /* v8 ignore next -- @preserve -- parseRawProcedure establishes a procedure section before calling this parser */
  if (section === undefined) return undefined;
  const shape = simpleSaveShape(entry.description);
  if (shape === undefined) return undefined;
  const damageCaptureIndex = shape.kind === "cone" ? 4 : 5;
  const onFail = parseDamage(
    issueContext,
    matchCapture(shape.match, damageCaptureIndex),
    `procedures.${entry.name}.onFail`,
  );
  if (onFail === undefined) return undefined;
  return {
    section,
    name: normalizedProcedureName(entry.name),
    kind: "save",
    ability: parsedAbility(
      issueContext,
      matchCapture(shape.match, 1),
      `procedures.${entry.name}.ability`,
    ),
    dc: positiveIntegerEvidence(
      issueContext,
      matchCapture(shape.match, 2),
      `procedures.${entry.name}.dc`,
    ),
    area: simpleSaveArea(issueContext, shape, entry.name),
    onFail,
    onSuccess: "half_damage",
    resourceLimits: parseRawResourceLimits(issueContext, entry.name),
  };
};

const numberWordValue = (value: string | undefined): number | undefined =>
  NUMBER_WORDS.find(([word]) => word === value)?.[1];

const parsePairedMultiattack = (
  issueContext: ProjectionIssueContext,
  entry: RawEntry,
  section: ProcedureSection,
  pair: RegExpMatchArray,
): ProcedureProjection | undefined => {
  const firstCount = numberWordValue(pair[1]) as number;
  const secondCount = numberWordValue(pair[3]) as number;
  const firstProcedureName = pair[2] as string;
  const secondProcedureName = pair[4] as string;
  return {
    section,
    name: normalizedProcedureName(entry.name),
    kind: "multiattack",
    dispatches: [
      { procedureName: firstProcedureName, count: firstCount },
      { procedureName: secondProcedureName, count: secondCount },
    ],
    resourceLimits: parseRawResourceLimits(issueContext, entry.name),
  };
};

const parseSingleMultiattack = (
  issueContext: ProjectionIssueContext,
  entry: RawEntry,
  section: ProcedureSection,
): ProcedureProjection | undefined => {
  const match = entry.description.match(
    /^The .+ makes (one|two|three) (.+) attacks\.$/,
  );
  if (match === null || match[2]?.includes(" or ") === true) return undefined;
  const count = numberWordValue(match[1]) as number;
  const procedureName = match[2] as string;
  return {
    section,
    name: normalizedProcedureName(entry.name),
    kind: "multiattack",
    dispatches: [{ procedureName, count }],
    resourceLimits: parseRawResourceLimits(issueContext, entry.name),
  };
};

const parseSimpleMultiattack = (
  issueContext: ProjectionIssueContext,
  entry: RawEntry,
): ProcedureProjection | undefined => {
  const section = procedureSection(entry.section);
  /* v8 ignore next -- @preserve -- parseRawProcedure establishes a procedure section before calling this parser */
  if (section === undefined) return undefined;
  if (entry.description.includes(",")) return undefined;
  const pair = entry.description.match(
    /^The .+ makes (one|two|three) (.+?) attacks? and (one|two|three) (.+?) attacks?\.$/,
  );
  return pair === null
    ? parseSingleMultiattack(issueContext, entry, section)
    : parsePairedMultiattack(issueContext, entry, section, pair);
};

const splitDelimiterLength = (value: string, index: number): 0 | 1 | 4 => {
  if (value[index] === ",") return 1;
  if (value.slice(index, index + 4) === " or ") return 4;
  return 0;
};

const splitOutsideParentheses = (value: string): readonly string[] => {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    const delimiterLength = splitDelimiterLength(value, index);
    if (delimiterLength > 0 && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + delimiterLength;
      if (delimiterLength === 4) index += 3;
    }
  }
  parts.push(value.slice(start).trim());
  return parts.filter((part) => part.length > 0);
};

const parseSpell = (
  issueContext: ProjectionIssueContext,
  value: string,
  field: string,
): SpellProjection => {
  const annotation = value.match(/^(.+?) \((.+)\)$/);
  if (annotation === null) {
    return { spellId: normalizedIdentifier(value) };
  }
  const name = matchCapture(annotation, 1);
  const detail = matchCapture(annotation, 2);
  const level = detail.match(/^level (\d+) version$/);
  if (level === null) {
    return { spellId: normalizedIdentifier(name), restriction: detail };
  }
  return {
    spellId: normalizedIdentifier(name),
    castAtLevel: positiveIntegerEvidence(
      issueContext,
      matchCapture(level, 1),
      `${field}.castAtLevel`,
    ),
  };
};

const parseSpellcastingGroup = (
  issueContext: ProjectionIssueContext,
  segment: string,
  groupIndex: number,
  entryName: string,
): readonly SpellcastingGroupProjection[] => {
  const groupEvidence = segment.replace(/^[- ]+/, "");
  const group = assess(issueContext, () =>
    requireMatch(
      issueContext,
      groupEvidence,
      /^([^:]+): (.+)$/,
      `procedures.${entryName}.groups.${groupIndex}`,
    ),
  );
  if (group === undefined) return [];
  const label = matchCapture(group, 1);
  const supportedLabel = label.match(/^(?:At Will|(\d+)\/Day( Each)?)$/);
  if (supportedLabel === null) {
    unsupportedEvidence(
      issueContext,
      `procedures.${entryName}.groups.${groupIndex}.label`,
      label,
      "At Will, N/Day, or N/Day Each",
      undefined,
    );
    return [];
  }
  const spells = nonEmptyValues(
    issueContext,
    splitOutsideParentheses(matchCapture(group, 2)).map((spell, index) =>
      parseSpell(
        issueContext,
        spell,
        `procedures.${entryName}.groups.${groupIndex}.spells.${index}`,
      ),
    ),
    `procedures.${entryName}.groups.${groupIndex}.spells`,
    { spellId: normalizedIdentifier(entryName) },
  );
  if (supportedLabel[1] === undefined) {
    return [{ kind: "at_will", spells, resourceLimits: [] }];
  }
  return [
    {
      kind: "limited",
      spells,
      resourceLimits: [
        {
          kind: "daily",
          uses: positiveIntegerEvidence(
            issueContext,
            supportedLabel[1],
            `procedures.${entryName}.groups.${groupIndex}.uses`,
          ),
          ownership: supportedLabel[2] === undefined ? "shared" : "each",
        },
      ],
    },
  ];
};

const parsedSpellcastingComponents = (
  header: RegExpMatchArray,
): Extract<
  ProcedureProjection,
  { readonly kind: "spellcasting" }
>["components"] => {
  if (header[1] === undefined) return { kind: "spell_definition" };
  if (header[1].includes("spell components")) {
    return { kind: "fixed", v: false, s: false, m: false };
  }
  return { kind: "fixed", v: true, s: header[2] === undefined, m: false };
};

const parsedSpellcastingCheckFacts = (
  issueContext: ProjectionIssueContext,
  header: RegExpMatchArray,
  entryName: string,
): { readonly spellSaveDc?: number; readonly spellAttackBonus?: number } => ({
  ...(header[4] === undefined
    ? {}
    : {
        spellSaveDc: positiveIntegerEvidence(
          issueContext,
          header[4],
          `procedures.${entryName}.spellSaveDc`,
        ),
      }),
  ...(header[5] === undefined
    ? {}
    : { spellAttackBonus: signedNumber(header[5]) }),
});

const parseSpellcasting = (
  issueContext: ProjectionIssueContext,
  entry: RawEntry,
): SpellcastingProcedure | undefined => {
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
  const groupIssueCount = issueContext.issues.length;
  const groups = entry.description
    .slice(header[0].length)
    .replace(/^[- ]+/, "")
    .replace(/ (?=\d+\/Day(?: Each)?:)/g, " - ")
    .split(" - ")
    .flatMap((segment, groupIndex) =>
      parseSpellcastingGroup(issueContext, segment, groupIndex, entry.name),
    );
  if (groups.length === 0) {
    /* v8 ignore next -- @preserve -- rejecting every split group necessarily records its parsing issue */
    if (issueContext.issues.length > groupIssueCount) return undefined;
    /* v8 ignore next -- @preserve -- split always supplies a group segment; rejecting every segment records an issue above */
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
      matchCapture(header, 3),
      `procedures.${entry.name}.ability`,
    ),
    ...parsedSpellcastingCheckFacts(issueContext, header, entry.name),
    components: parsedSpellcastingComponents(header),
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
    resourceLimits: parseRawResourceLimits(issueContext, entry.name),
  };
};

type DirectSpellcastingEvidence =
  | { readonly kind: "explicit"; readonly match: RegExpMatchArray }
  | { readonly kind: "inherited"; readonly match: RegExpMatchArray };

const directSpellcastingEvidence = (
  description: string,
): DirectSpellcastingEvidence | undefined => {
  const explicit = description.match(
    /^The .+ casts (?:the )?(.+?)(?: spell)?( on itself| on that creature)?, requiring no (spell|Material|Somatic or Material) components and using (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) as the spellcasting ability(?: \(spell save DC (\d+)\))?\.(?: (The spell .+)\.)?$/,
  );
  if (explicit !== null) return { kind: "explicit", match: explicit };
  const inherited = description.match(
    /^The .+ casts (?:the )?(.+?)(?: spell)?( on itself| on that creature)?,( requiring no spell components and)? using the same spellcasting ability as Spellcasting\.(?: (The spell .+)\.)?$/,
  );
  return inherited === null
    ? undefined
    : { kind: "inherited", match: inherited };
};

const directSpellcastingSourceRestriction = (
  evidence: DirectSpellcastingEvidence,
): string | undefined =>
  evidence.kind === "explicit" ? evidence.match[6] : evidence.match[4];

const directSpellcastingSyntaxIsSupported = (
  evidence: DirectSpellcastingEvidence,
  sourceRestriction: string | undefined,
): boolean => {
  if (evidence.kind === "explicit" && evidence.match[2] !== undefined) {
    return false;
  }
  if (matchCapture(evidence.match, 1).includes(" in response")) return false;
  return !(evidence.match[2] !== undefined && sourceRestriction !== undefined);
};

const directSpellcastingSpells = (
  issueContext: ProjectionIssueContext,
  evidence: DirectSpellcastingEvidence,
  sourceRestriction: string | undefined,
  entryName: string,
): readonly SpellProjection[] | undefined => {
  const spells = splitOutsideParentheses(matchCapture(evidence.match, 1)).map(
    (value, index) =>
      parseSpell(
        issueContext,
        value.replace(/^or /, ""),
        `procedures.${entryName}.spells.${index}`,
      ),
  );
  /* v8 ignore next -- @preserve -- a successful direct-spellcasting regex capture always splits to at least one spell */
  if (spells.length === 0) return undefined;
  if (spells.some((spell) => spell.castAtLevel !== undefined)) return undefined;
  if (
    spells.length > 1 &&
    (evidence.match[2] !== undefined || sourceRestriction !== undefined)
  ) {
    return undefined;
  }
  return spells.map((spell) =>
    sourceRestriction !== undefined
      ? { ...spell, restriction: sourceRestriction }
      : evidence.match[2] === undefined
        ? spell
        : { ...spell, restriction: evidence.match[2].trim() },
  );
};

const directSpellcastingAbility = (
  issueContext: ProjectionIssueContext,
  evidence: DirectSpellcastingEvidence,
  inheritedAbility: Ability | undefined,
  entryName: string,
): Ability | undefined =>
  evidence.kind === "explicit"
    ? parsedAbility(
        issueContext,
        matchCapture(evidence.match, 4),
        `procedures.${entryName}.ability`,
      )
    : inheritedAbility;

const directSpellcastingGroup = (
  issueContext: ProjectionIssueContext,
  entryName: string,
  spells: readonly SpellProjection[],
): SpellcastingGroupProjection => {
  const limits = parseRawResourceLimits(issueContext, entryName);
  const projectedSpells = nonEmptyValues(
    issueContext,
    spells,
    `procedures.${entryName}.spells`,
    { spellId: normalizedIdentifier(entryName) },
  );
  if (limits.length === 0) {
    return { kind: "at_will", spells: projectedSpells, resourceLimits: [] };
  }
  return {
    kind: "limited",
    spells: projectedSpells,
    resourceLimits: nonEmptyValues(
      issueContext,
      limits,
      `procedures.${entryName}.resourceLimits`,
      { kind: "daily", uses: 1, ownership: "shared" },
    ),
  };
};

const directSpellcastingCheckFacts = (
  issueContext: ProjectionIssueContext,
  evidence: DirectSpellcastingEvidence,
  inheritedSpellAttackBonus: number | undefined,
  entryName: string,
): { readonly spellAttackBonus?: number; readonly spellSaveDc?: number } => {
  if (evidence.kind === "inherited") {
    return inheritedSpellAttackBonus === undefined
      ? {}
      : { spellAttackBonus: inheritedSpellAttackBonus };
  }
  return evidence.match[5] === undefined
    ? {}
    : {
        spellSaveDc: positiveIntegerEvidence(
          issueContext,
          evidence.match[5],
          `procedures.${entryName}.spellSaveDc`,
        ),
      };
};

const directSpellcastingComponents = (
  evidence: DirectSpellcastingEvidence,
): Extract<
  ProcedureProjection,
  { readonly kind: "spellcasting" }
>["components"] => {
  if (evidence.kind === "inherited") {
    return evidence.match[3] === undefined
      ? { kind: "spell_definition" }
      : { kind: "fixed", v: false, s: false, m: false };
  }
  if (evidence.match[3] === "spell") {
    return { kind: "fixed", v: false, s: false, m: false };
  }
  return {
    kind: "fixed",
    v: true,
    s: evidence.match[3] !== "Somatic or Material",
    m: false,
  };
};

const parseDirectSpellcasting = (
  issueContext: ProjectionIssueContext,
  entry: RawEntry,
  inheritedAbility: Ability | undefined,
  inheritedSpellAttackBonus: number | undefined,
): SpellcastingProcedure | undefined => {
  const section = procedureSection(entry.section);
  /* v8 ignore next -- @preserve -- parseRawProcedure establishes a procedure section before calling this parser */
  if (section === undefined) return undefined;
  const evidence = directSpellcastingEvidence(entry.description);
  if (evidence === undefined) return undefined;
  const sourceRestriction = directSpellcastingSourceRestriction(evidence);
  if (!directSpellcastingSyntaxIsSupported(evidence, sourceRestriction)) {
    return undefined;
  }
  if (evidence.kind === "inherited" && inheritedAbility === undefined) {
    return undefined;
  }
  const spells = directSpellcastingSpells(
    issueContext,
    evidence,
    sourceRestriction,
    entry.name,
  );
  if (spells === undefined) return undefined;
  const ability = directSpellcastingAbility(
    issueContext,
    evidence,
    inheritedAbility,
    entry.name,
  );
  /* v8 ignore next -- @preserve -- explicit evidence carries a regex-proved ability and the missing inherited-ability case returns above */
  if (ability === undefined) return undefined;
  return {
    section,
    name: normalizedProcedureName(entry.name),
    kind: "spellcasting",
    ability,
    ...directSpellcastingCheckFacts(
      issueContext,
      evidence,
      inheritedSpellAttackBonus,
      entry.name,
    ),
    components: directSpellcastingComponents(evidence),
    groups: [directSpellcastingGroup(issueContext, entry.name, spells)],
    resourceLimits: [],
  };
};

const parseActionOption = (
  issueContext: ProjectionIssueContext,
  entry: RawEntry,
): ProcedureProjection | undefined => {
  const section = procedureSection(entry.section);
  /* v8 ignore next -- @preserve -- parseRawProcedure establishes a procedure section before calling this parser */
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
        resourceLimits: parseRawResourceLimits(issueContext, entry.name),
      };
};

type UnsupportedProcedureFamilyTest = (entry: RawEntry) => boolean;

const unsupportedSelfOrAlternativeSpellcasting: UnsupportedProcedureFamilyTest =
  (entry) =>
    /^The .+ casts .+ on itself, requiring no spell components and using (?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) as the spellcasting ability\.$/.test(
      entry.description,
    ) ||
    (!entry.description.includes("in response") &&
      /^The .+ casts .+(?: or .+)+, using the same spellcasting ability as Spellcasting\.$/.test(
        entry.description,
      ));

const unsupportedRepeatedOrUpcastSpellcasting: UnsupportedProcedureFamilyTest =
  (entry) =>
    /^The .+ casts .+ twice, requiring no .+ components and using .+ as the spellcasting ability/.test(
      entry.description,
    ) ||
    (!/\((?:Recharge (?:\d(?:–\d)?|after a Short or Long Rest)|\d+\/Day(?:; .+)?)\)$/.test(
      entry.name,
    ) &&
      /^The .+ casts .+ \(level \d+ version\), requiring no spell components and using .+ as the spellcasting ability/.test(
        entry.description,
      ));

const unsupportedDurationOrBonusActionSpellcasting: UnsupportedProcedureFamilyTest =
  (entry) =>
    /^The .+ casts .+ using .+ as the spellcasting ability .+ duration is/.test(
      entry.description,
    ) ||
    (isBonusActionSection(entry.section) &&
      /^The .+ casts .+, requiring no spell components and using .+ as the spellcasting ability/.test(
        entry.description,
      ) &&
      !entry.description.includes("can't take this action again"));

const unsupportedShapeShift: UnsupportedProcedureFamilyTest = (entry) =>
  /^The .+ shape-shifts .+ Its game statistics are the same in each form, except (?:for )?(?:its|its Fly) Speed/.test(
    entry.description,
  );

const unsupportedReactionProcedure: UnsupportedProcedureFamilyTest = (entry) =>
  /^Trigger:/.test(entry.description) &&
  (/\. On a miss, .+ makes one .+ attack/.test(entry.description) ||
    /Response: The .+ uses [A-Za-z' -]+\.$/.test(entry.description) ||
    /Response: The wearer gains a .+ bonus to AC/.test(entry.description) ||
    /Response: The .+ adds \d+ to the roll\.$/.test(entry.description) ||
    /Response: The .+ reduces the damage .+ Saving Throw:/.test(
      entry.description,
    ));

const UNSUPPORTED_PROCEDURE_FAMILY_TESTS = [
  unsupportedSelfOrAlternativeSpellcasting,
  unsupportedRepeatedOrUpcastSpellcasting,
  unsupportedDurationOrBonusActionSpellcasting,
  unsupportedShapeShift,
  unsupportedReactionProcedure,
] as const satisfies readonly UnsupportedProcedureFamilyTest[];

const rawTextOnlyReason = (
  entry: RawEntry,
): "unsupported_action_shape" | "unsupported_procedure_family" =>
  UNSUPPORTED_PROCEDURE_FAMILY_TESTS.some((test) => test(entry))
    ? "unsupported_procedure_family"
    : "unsupported_action_shape";

const firstProjectedProcedure = (
  projections: readonly (() => ProcedureProjection | undefined)[],
): ProcedureProjection | undefined => {
  for (const project of projections) {
    const projection = project();
    if (projection !== undefined) return projection;
  }
  return undefined;
};

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
  preparsedSpellcasting?: {
    readonly value: ProcedureProjection | undefined;
  },
): ProcedureProjection | undefined => {
  const section = procedureSection(entry.section);
  if (section === undefined) return undefined;
  const projection = firstProjectedProcedure([
    () =>
      preparsedSpellcasting === undefined
        ? parseSpellcasting(issueContext, entry)
        : preparsedSpellcasting.value,
    () =>
      parseDirectSpellcasting(
        issueContext,
        entry,
        spellcastingAbility,
        spellAttackBonus,
      ),
    () =>
      parseSimpleAttack(issueContext, entry, generalFacts, ammunitionByWeapon),
    () => parseSimpleSave(issueContext, entry),
    () => parseSimpleMultiattack(issueContext, entry),
    () => parseActionOption(issueContext, entry),
  ]);
  return projection === undefined
    ? {
        section,
        name: normalizedProcedureName(entry.name),
        kind: "textOnly",
        description: entry.description,
        reason: rawTextOnlyReason(entry),
        resourceLimits: parseRawResourceLimits(issueContext, entry.name),
      }
    : projection;
};

const parseLegendaryActionUses = (
  issueContext: ProjectionIssueContext,
  lines: readonly string[],
): ScopedGeneralFacts["legendaryActionUses"] => {
  const line = lines.find(isLegendaryActionUsesLine);
  if (line === undefined) return undefined;
  const normalizedLine = stripSrdStatBlockMarkdownEmphasis(line);
  const uses = assess(issueContext, () =>
    requireMatch(
      issueContext,
      normalizedLine,
      /^Legendary Action Uses: (\d+)(?: \((\d+) in Lair\))?\./,
      "legendaryActionUses",
    ),
  );
  if (uses === undefined) return undefined;
  const usesOutsideLair = assess(issueContext, () =>
    positiveIntegerEvidence(
      issueContext,
      matchCapture(uses, 1),
      "legendaryActionUses.usesOutsideLair",
    ),
  );
  if (uses[2] === undefined) {
    /* v8 ignore next -- @preserve -- the enclosing digit capture decodes to a positive integer or records an issue before this branch */
    return usesOutsideLair === undefined
      ? undefined
      : { kind: "fixed", uses: usesOutsideLair };
  }
  const usesInLair = assess(issueContext, () =>
    positiveIntegerEvidence(
      issueContext,
      matchCapture(uses, 2),
      "legendaryActionUses.usesInLair",
    ),
  );
  if (usesOutsideLair === undefined || usesInLair === undefined) {
    return undefined;
  }
  if (usesInLair <= usesOutsideLair) {
    malformedEvidence(
      issueContext,
      "legendaryActionUses.usesInLair",
      matchCapture(uses, 2),
      "a printed in-lair total greater than uses outside the lair",
      undefined,
    );
    return {
      kind: "lair_bonus",
      usesOutsideLair,
      additionalUsesInLair: 1,
    };
  }
  return {
    kind: "lair_bonus",
    usesOutsideLair,
    additionalUsesInLair: usesInLair - usesOutsideLair,
  };
};

const isLegendaryActionUsesLine = (line: string): boolean =>
  stripSrdStatBlockMarkdownEmphasis(line).startsWith("Legendary Action Uses:");

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
  parsedEntries: readonly (SpellcastingProcedure | undefined)[],
):
  | {
      readonly ability: Ability;
      readonly spellAttackBonus: number | undefined;
    }
  | undefined => {
  const spellcasting = parsedEntries.flatMap((procedure) => {
    return Match.value(procedure).pipe(
      Match.when(undefined, () => []),
      Match.when({ kind: "spellcasting" }, (spellcastingProcedure) => [
        spellcastingProcedure,
      ]),
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
  const parsedSpellcasting = entries.map((entry) =>
    parseSpellcasting(issueContext, entry),
  );
  const spellcasting = uniqueSpellcastingFacts(
    issueContext,
    parsedSpellcasting,
  );
  const parsedProcedures = entries.flatMap((entry, index) => {
    const procedure = assess(issueContext, () =>
      parseRawProcedure(
        issueContext,
        entry,
        generalFacts,
        ammunitionByWeapon,
        spellcasting?.ability,
        spellcasting?.spellAttackBonus,
        { value: parsedSpellcasting[index] },
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
          /* v8 ignore next -- @preserve -- each parsed multiattack is derived from the same entry collection searched here */
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
            resourceLimits: parseRawResourceLimits(issueContext, entry.name),
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
  const legendaryIssueCount = issueContext.issues.length;
  const parsedLegendaryActionUses = assess(issueContext, () =>
    parseLegendaryActionUses(issueContext, lines),
  );
  const hasLegendaryActionEntries = entries.some(
    ({ section }) => section === "Legendary Actions",
  );
  const legendaryActionUses = (() => {
    if (
      hasLegendaryActionEntries &&
      parsedLegendaryActionUses === undefined &&
      issueContext.issues.length === legendaryIssueCount
    ) {
      return missingEvidence(
        issueContext,
        "legendaryActionUses",
        "Legendary Action Uses for the present Legendary Actions section",
        undefined,
      );
    }
    if (!hasLegendaryActionEntries && parsedLegendaryActionUses !== undefined) {
      return unsupportedEvidence(
        issueContext,
        "legendaryActionUses",
        "uses without Legendary Actions",
        "uses paired with a nonempty Legendary Actions section",
        undefined,
      );
    }
    return parsedLegendaryActionUses;
  })();
  const resources = procedureResourceLimits(procedures);

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
        /* v8 ignore next -- @preserve -- authored onHit is nonempty; losing its first effect necessarily records an issue */
        return issueContext.issues.length > effectIssueCount
          ? undefined
          : missingEvidence(
              issueContext,
              `procedures.${attack.name}.onHit`,
              "at least one attack effect",
              undefined,
            );
      }
      if (attackAbility === undefined) return undefined;
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
        Match.whenOr(
          { kind: "conditional_bonus_damage" },
          { kind: "apply_condition_if_target_size_at_most" },
          { kind: "apply_condition" },
          ({ kind }) => unsupportedSimpleDamageSave("onFail", kind),
        ),
        Match.exhaustive,
      );
      const onSuccess = Match.value(save.onSuccess).pipe(
        Match.when({ kind: "half_damage" }, () => "half_damage" as const),
        Match.whenOr(
          { kind: "damage" },
          { kind: "conditional_bonus_damage" },
          { kind: "apply_condition_if_target_size_at_most" },
          { kind: "apply_condition" },
          ({ kind }) => unsupportedSimpleDamageSave("onSuccess", kind),
        ),
        Match.exhaustive,
      );
      const projectedArea =
        "area" in save
          ? Match.value(save.area).pipe(
              Match.when({ kind: "line" }, (line) => ({
                kind: "line" as const,
                lengthFeet: line.lengthFeet,
                widthFeet: line.widthFeet,
              })),
              Match.when({ kind: "cone" }, (cone) => ({
                kind: "cone" as const,
                lengthFeet: cone.lengthFeet,
              })),
              Match.whenOr(
                { kind: "sphere" },
                { kind: "circle" },
                { kind: "sphere_cluster" },
                { kind: "cube" },
                { kind: "cube_cluster" },
                { kind: "cylinder" },
                { kind: "emanation" },
                { kind: "wall_volume" },
                () => undefined,
              ),
              Match.exhaustive,
            )
          : undefined;
      const area =
        projectedArea ??
        unsupportedEvidence(
          issueContext,
          `procedures.${save.name}.area`,
          "area" in save ? save.area.kind : "absent",
          "line or cone",
          undefined,
        );
      if (
        onFail === undefined ||
        onSuccess === undefined ||
        area === undefined
      ) {
        return undefined;
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
    Match.whenOr(
      { kind: "attack_roll" },
      { kind: "save" },
      { kind: "multiattack" },
      { kind: "action_option" },
      (procedure) => ({
        ...procedure,
        resourceLimits: authoredResourceLimits,
      }),
    ),
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
  textOnlyDescriptions: ReadonlyMap<
    StatBlockProcedureEntry,
    { readonly projection: string; readonly procedureEvidence: string }
  >,
): readonly ProcedureProjection[] => {
  const entries = authoredProcedures(record);
  const parsedTextOnlySpellcasting = new Map<
    StatBlockProcedureEntry,
    { readonly value: SpellcastingProcedure | undefined }
  >();
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
          Match.whenOr(
            { kind: "attack_roll" },
            { kind: "save" },
            { kind: "multiattack" },
            { kind: "support" },
            { kind: "action_option" },
            () => [],
          ),
          Match.exhaustive,
        ),
      ),
      Match.when({ kind: "textOnly" }, (textOnly) => {
        if (normalizedProcedureName(textOnly.name) !== "Spellcasting") {
          return [];
        }
        const descriptions = textOnlyDescriptions.get(entry);
        const parsed = parseSpellcasting(issueContext, {
          section,
          name: textOnly.name,
          description:
            /* v8 ignore next -- @preserve -- preprocessing records normalized descriptions for every text-only procedure entry */
            descriptions?.procedureEvidence ??
            normalizedProcedureEvidence(textOnly.description),
        });
        parsedTextOnlySpellcasting.set(entry, { value: parsed });
        return Match.value(parsed).pipe(
          Match.when(undefined, () => []),
          Match.when({ kind: "spellcasting" }, (spellcasting) => [
            {
              ability: spellcasting.ability,
              spellAttackBonus: spellcasting.spellAttackBonus,
            },
          ]),
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
          const descriptions = textOnlyDescriptions.get(entry);
          const projectionDescription =
            descriptions?.projection ?? normalizedProse(textOnly.description);
          const resourceLimits = projectResourceLimits(
            issueContext,
            record,
            textOnly.resourceRefs,
          );
          const fallback = (): ProcedureProjection => ({
            section,
            name: normalizedProcedureName(textOnly.name),
            kind: "textOnly",
            description: projectionDescription,
            reason: textOnly.reason,
            resourceLimits,
          });
          const structuralProcedure = parseRawProcedure(
            issueContext,
            {
              section,
              name: textOnly.name,
              description:
                /* v8 ignore next -- @preserve -- preprocessing records normalized descriptions for every text-only procedure entry */
                descriptions?.procedureEvidence ??
                normalizedProcedureEvidence(textOnly.description),
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
            parsedTextOnlySpellcasting.get(entry),
          );
          return Match.value(structuralProcedure).pipe(
            Match.when(undefined, fallback),
            Match.when({ kind: "textOnly" }, fallback),
            Match.whenOr(
              { kind: "attack_roll" },
              { kind: "save" },
              { kind: "multiattack" },
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
            /* v8 ignore next -- @preserve -- the preceding entries loop creates the map for every authored procedure section */
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
        Match.whenOr(
          { kind: "attack_roll" },
          { kind: "save" },
          { kind: "multiattack" },
          { kind: "support" },
          { kind: "action_option" },
          () => [],
        ),
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
      qualifier: stripSrdStatBlockMarkdownEmphasis(qualified.qualifier),
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
  description: string | undefined,
): StatBlockScopedFidelityProjection["textOnlyProcedures"] =>
  Match.value(entry).pipe(
    Match.when({ kind: "textOnly" }, (textOnly) => [
      {
        section,
        name: normalizedProcedureName(textOnly.name),
        description: description ?? normalizedProse(textOnly.description),
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
                compareCondition,
              ),
            }
          : {}),
      },
      "immunities",
      DEPENDENCY_FALLBACK_IMMUNITY,
    ),
  };
};

const absentArray = <Value>(
  values: readonly Value[] | undefined,
): readonly Value[] => (values === undefined ? [] : values);

const authoredTextOnlyDescriptions = (
  issueContext: ProjectionIssueContext,
  procedures: readonly {
    readonly section: ProcedureSection;
    readonly entry: StatBlockProcedureEntry;
  }[],
): ReadonlyMap<
  StatBlockProcedureEntry,
  { readonly projection: string; readonly procedureEvidence: string }
> => {
  const descriptions = new Map<
    StatBlockProcedureEntry,
    { readonly projection: string; readonly procedureEvidence: string }
  >();
  for (const { section, entry } of procedures) {
    if (entry.kind !== "textOnly") continue;
    const normalized = normalizedProse(entry.description);
    const projection = decodeEvidenceValue(
      issueContext,
      StatBlockProcedureDescriptionSchema,
      normalized,
      normalized,
      `procedures.${normalizedIdentifier(section)}.${entry.procedureOrdinal}.description`,
      "a nonempty normalized authored procedure description",
      "Unsupported procedure description.",
    );
    descriptions.set(entry, {
      projection,
      procedureEvidence:
        projection === normalized
          ? normalizedProcedureEvidence(entry.description)
          : projection,
    });
  }
  return descriptions;
};

const projectAuthoredSizeAndSwarm = (
  record: SrdStatBlockRecord,
): ScopedGeneralFacts["sizeAndSwarm"] =>
  record.statBlock.swarm === undefined
    ? { size: record.statBlock.size }
    : { size: record.statBlock.size, swarm: record.statBlock.swarm };

const projectAuthoredCreatureTypeTags = (
  issueContext: ProjectionIssueContext,
  record: SrdStatBlockRecord,
): ScopedGeneralFacts["creatureTypeTags"] =>
  record.statBlock.creatureTypeTags === undefined
    ? []
    : sortedNonEmptyStrings(
        issueContext,
        record.statBlock.creatureTypeTags,
        "creatureTypeTags",
        record.name.toLowerCase(),
      );

const projectAuthoredResistances = (
  issueContext: ProjectionIssueContext,
  record: SrdStatBlockRecord,
): ScopedGeneralFacts["resistances"] => {
  const resistances = record.statBlock.resistances;
  if (resistances === undefined) return { kind: "none" };
  return Match.value(resistances).pipe(
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
  );
};

const projectAuthoredGear = (
  record: SrdStatBlockRecord,
): ScopedGeneralFacts["gear"] =>
  sortedAbsentOrNonEmpty(
    absentArray(record.statBlock.gear).map((gear) => ({
      item: gear.item,
      quantity: gear.quantity === undefined ? 1 : gear.quantity,
    })),
    ({ item }) => item,
  );

const projectAuthoredGeneralFacts = (
  issueContext: ProjectionIssueContext,
  record: SrdStatBlockRecord,
): ScopedGeneralFacts => {
  const legendaryActionUses = projectLegendaryActionUses(record);
  return {
    challengeRating: record.challengeRating,
    sizeAndSwarm: projectAuthoredSizeAndSwarm(record),
    creatureType: record.statBlock.creatureType,
    creatureTypeTags: projectAuthoredCreatureTypeTags(issueContext, record),
    alignment: record.statBlock.alignment,
    ac: record.statBlock.ac,
    hp: record.statBlock.hp,
    speeds: record.statBlock.speeds,
    abilityScores: record.statBlock.abilityScores,
    initiative: record.statBlock.initiative,
    savingThrowModifiers: sortedAbsentOrNonEmpty(
      absentArray(record.statBlock.savingThrowModifiers),
      ({ ability }) => ability,
    ),
    saveProficiencies: sortedStrings(
      absentArray(record.statBlock.saveProficiencies),
    ),
    skillModifiers: sortedByDomainName(
      absentArray(record.statBlock.skillModifiers),
      ({ skill }) => skill,
    ),
    vulnerabilities: projectVulnerabilities(issueContext, record),
    resistances: projectAuthoredResistances(issueContext, record),
    immunities: projectImmunities(issueContext, record),
    senses: sortedAbsentOrNonEmpty(
      absentArray(record.statBlock.senses),
      ({ kind }) => kind,
    ),
    passivePerception: record.statBlock.passivePerception,
    gear: projectAuthoredGear(record),
    communication: record.statBlock.communication,
    ...(legendaryActionUses === undefined ? {} : { legendaryActionUses }),
  };
};

const projectUnreferencedAuthoredResources = (
  record: SrdStatBlockRecord,
  referencedResourceOrdinals: ReadonlySet<number>,
): readonly ResourceLimitProjection[] =>
  absentArray(record.statBlock.resources)
    .filter((resource) => !referencedResourceOrdinals.has(resource.ordinal))
    .map(projectResource);

const projectAuthoredTrait = (
  issueContext: ProjectionIssueContext,
  trait: NonNullable<SrdStatBlockRecord["statBlock"]["traits"]>[number],
): StatBlockScopedFidelityProjection["traits"][number] =>
  decodeProjectionValue(
    issueContext,
    CreatureTraitSchema,
    { ...trait, description: normalizedProse(trait.description) },
    `traits.${trait.name}`,
    { name: trait.name, description: normalizedProse(trait.description) },
  );

const projectAuthoredStatBlockUnsafe = (
  issueContext: ProjectionIssueContext,
  record: SrdStatBlockRecord,
  equipmentSource: string,
): StatBlockScopedFidelityProjection | undefined => {
  const ammunitionByWeapon = parseAmmunitionByWeapon(equipmentSource);
  const procedures = authoredProcedures(record);
  const textOnlyDescriptions = authoredTextOnlyDescriptions(
    issueContext,
    procedures,
  );
  const projectedProcedures = projectAuthoredProcedures(
    issueContext,
    record,
    ammunitionByWeapon,
    textOnlyDescriptions,
  );
  const referencedResourceOrdinals = new Set(
    procedures.flatMap(({ entry }) => entryReferencedResourceOrdinals(entry)),
  );
  return {
    generalFacts: projectAuthoredGeneralFacts(issueContext, record),
    resources: [
      ...procedureResourceLimits(projectedProcedures),
      ...projectUnreferencedAuthoredResources(
        record,
        referencedResourceOrdinals,
      ),
    ],
    entryNames: [
      ...absentArray(record.statBlock.traits).map(
        (trait) => `Traits/${trait.name}`,
      ),
      ...procedures.map(
        ({ section, entry }) =>
          `${section}/${normalizedProcedureName(procedureName(entry))}`,
      ),
    ],
    traits: absentArray(record.statBlock.traits).map((trait) =>
      projectAuthoredTrait(issueContext, trait),
    ),
    textOnlyProcedures: procedures.flatMap(({ section, entry }) =>
      projectTextOnlyEvidence(
        section,
        entry,
        textOnlyDescriptions.get(entry)?.projection,
      ),
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
  /* v8 ignore start -- @preserve -- unsafe projectors either return a typed projection or record an issue that returns above */
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
  /* v8 ignore stop -- @preserve */
  const decoded = Schema.decodeUnknownResult(
    StatBlockScopedFidelityProjectionSchema,
  )(projection);
  return Result.match(decoded, {
    /* v8 ignore start -- @preserve -- the internally constructed projection has the same canonical schema as this defensive boundary decode */
    onFailure: (error): StatBlockScopedProjectionResult => {
      const issue: StatBlockScopedProjectionIssue = {
        kind: "projection-schema-rejected",
        anchor: issueAnchor(context, "projection"),
        message: String(error),
      };
      return {
        tag: "failed",
        failure: { tag: "projection-issues", issues: [issue] },
      };
    },
    /* v8 ignore stop -- @preserve */
    onSuccess: (decodedProjection): StatBlockScopedProjectionResult => ({
      tag: "projected",
      projection: decodedProjection,
    }),
  });
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
