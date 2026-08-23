import { Either, Schema } from "effect";

import { ScenarioCompositeReviewSchema } from "./scenario-campaign.ts";
import {
  modelInvocationScenarioReference,
  type CurrentModelInvocationLedgerEntry,
  type ModelInvocationLedgerEntry,
} from "./model-telemetry.ts";
import {
  ScenarioCampaignIdSchema,
  ScenarioCandidateIdSchema,
  EvidenceSetIdSchema,
  PlannedScenarioIdSchema,
  HistoricalScenarioIdSchema,
  BenchmarkIdSchema,
  type EvidenceSetId,
  type BenchmarkId,
  type HistoricalScenarioId,
  type PlannedScenarioId,
  type ScenarioCampaignId,
} from "./raw-swarm-identities.ts";
import { canonicalJson, GitShaSchema, ScenarioIdSchema } from "./transcript.ts";

export const RETAINED_SCENARIO_REVIEW_REASONING_EFFORTS = [
  "medium",
  "max",
] as const;
export const RetainedScenarioReviewReasoningEffortSchema = Schema.Literal(
  ...RETAINED_SCENARIO_REVIEW_REASONING_EFFORTS,
);

const RetainedScenarioReviewCommonFields = {
  phase: Schema.Literal("scenarioCompositeReview"),
  reviewStage: Schema.Literal("milestone", "final"),
  sourceGitSha: GitShaSchema,
  invocationId: Schema.NonEmptyString,
  model: Schema.Literal("gpt-5.6-luna"),
  reasoningEffort: RetainedScenarioReviewReasoningEffortSchema,
  prompt: Schema.NonEmptyString,
  outputJsonSchema: Schema.Unknown,
  result: ScenarioCompositeReviewSchema,
} as const;

const HistoricalRetainedScenarioReviewInputSchema = Schema.Struct({
  schemaVersion: Schema.Literal(2),
  ...RetainedScenarioReviewCommonFields,
  scenarioId: HistoricalScenarioIdSchema,
});

const RetainedScenarioReviewSubjectSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("scenarioCandidate"),
    campaignId: ScenarioCampaignIdSchema,
    evidenceSetId: EvidenceSetIdSchema,
    candidateId: ScenarioCandidateIdSchema,
    candidateScenarioSha256: Schema.String.pipe(
      Schema.pattern(/^[0-9a-f]{64}$/),
    ),
    plannedScenarioId: PlannedScenarioIdSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("scenario"),
    scenarioId: ScenarioIdSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("benchmark"),
    benchmarkId: BenchmarkIdSchema,
    profile: Schema.Literal(
      "documentDeclarationSet",
      "boundedCapabilityProjection",
    ),
    scenarioId: ScenarioIdSchema,
  }),
);
export type RetainedScenarioReviewSubject = Schema.Schema.Type<
  typeof RetainedScenarioReviewSubjectSchema
>;
type ScenarioReviewSourceSha256 = Extract<
  RetainedScenarioReviewSubject,
  { readonly tag: "scenarioCandidate" }
>["candidateScenarioSha256"];
type HistoricalRetainedScenarioReviewSubject = Readonly<{
  readonly tag: "scenario";
  readonly scenarioId: HistoricalScenarioId;
}>;

const CurrentRetainedScenarioReviewInputSchema = Schema.Struct({
  schemaVersion: Schema.Literal(3),
  ...RetainedScenarioReviewCommonFields,
  subject: RetainedScenarioReviewSubjectSchema,
});

export const RetainedScenarioReviewInputSchema = Schema.Union(
  HistoricalRetainedScenarioReviewInputSchema,
  CurrentRetainedScenarioReviewInputSchema,
);

export type RetainedScenarioReviewInput = Schema.Schema.Type<
  typeof RetainedScenarioReviewInputSchema
>;

export function retainedScenarioReviewSubject(
  input: RetainedScenarioReviewInput,
): RetainedScenarioReviewSubject | HistoricalRetainedScenarioReviewSubject {
  return input.schemaVersion === 2
    ? { tag: "scenario", scenarioId: input.scenarioId }
    : input.subject;
}

export function retainedScenarioReviewScenarioId(
  input: RetainedScenarioReviewInput,
): Either.Either<
  Schema.Schema.Type<typeof ScenarioIdSchema> | HistoricalScenarioId,
  string
> {
  const subject = retainedScenarioReviewSubject(input);
  return subject.tag === "scenario" || subject.tag === "benchmark"
    ? Either.right(subject.scenarioId)
    : Either.left(
        "A Scenario Candidate review reservation cannot satisfy an admitted Scenario identity.",
      );
}

export function retainedScenarioReviewMatchesAdmission(
  input: RetainedScenarioReviewInput,
  admission: Readonly<{
    readonly scenarioId: RetainedScenarioReviewScenarioReference;
    readonly scenarioSha256: ScenarioReviewSourceSha256;
  }>,
): Either.Either<ReturnType<typeof retainedScenarioReviewSubject>, string> {
  const subject = retainedScenarioReviewSubject(input);
  if (subject.tag === "scenario" || subject.tag === "benchmark") {
    return subject.scenarioId === admission.scenarioId
      ? Either.right(subject)
      : Either.left(
          `Review scenario ${subject.scenarioId} does not match admitted scenario ${admission.scenarioId}.`,
        );
  }
  if (String(subject.plannedScenarioId) !== String(admission.scenarioId)) {
    return Either.left(
      `Review Candidate plans scenario ${subject.plannedScenarioId}, not admitted scenario ${admission.scenarioId}.`,
    );
  }
  return subject.candidateScenarioSha256 === admission.scenarioSha256
    ? Either.right(subject)
    : Either.left(
        `Review Candidate source hash does not match admitted scenario ${admission.scenarioId}.`,
      );
}

export function retainedScenarioReviewPlannedScenarioId(
  input: RetainedScenarioReviewInput,
): Either.Either<Schema.Schema.Type<typeof PlannedScenarioIdSchema>, string> {
  const subject = retainedScenarioReviewSubject(input);
  return subject.tag === "scenarioCandidate"
    ? Either.right(subject.plannedScenarioId)
    : Either.left(
        "An admitted Scenario review does not carry a Campaign reservation identity.",
      );
}

export type RetainedScenarioReviewStage = "milestone" | "final";

export type RetainedScenarioReviewCampaignIdentity = Readonly<{
  readonly campaignId: ScenarioCampaignId;
  readonly evidenceSetId: EvidenceSetId;
  readonly plannedScenarioId: PlannedScenarioId;
}>;

export type RetainedScenarioReviewBenchmarkIdentity = Readonly<{
  readonly benchmarkId: BenchmarkId;
  readonly profile: "documentDeclarationSet" | "boundedCapabilityProjection";
}>;

export type RetainedScenarioReviewScenarioReference =
  | Schema.Schema.Type<typeof ScenarioIdSchema>
  | HistoricalScenarioId
  | PlannedScenarioId;

export type RetainedScenarioReviewReplayExpectation =
  | Readonly<{
      readonly tag: "scenario";
      readonly reviewStage: RetainedScenarioReviewStage;
      readonly scenarioId: RetainedScenarioReviewScenarioReference;
    }>
  | Readonly<{
      readonly tag: "historicalScenario";
      readonly reviewStage: "milestone";
      readonly scenarioId: RetainedScenarioReviewScenarioReference;
      readonly campaign: RetainedScenarioReviewCampaignIdentity;
    }>
  | Readonly<{
      readonly tag: "historicalScenario";
      readonly reviewStage: "final";
      readonly scenarioId: RetainedScenarioReviewScenarioReference;
      /** Hash of the admitted Scenario, never a revised Candidate hash. */
      readonly admittedScenarioSha256: ScenarioReviewSourceSha256;
      readonly campaign: RetainedScenarioReviewCampaignIdentity;
    }>
  | Readonly<{
      readonly tag: "candidate";
      readonly reviewStage: "milestone";
      readonly scenarioId: RetainedScenarioReviewScenarioReference;
      readonly campaign: RetainedScenarioReviewCampaignIdentity;
    }>
  | Readonly<{
      readonly tag: "candidate";
      readonly reviewStage: "final";
      readonly scenarioId: RetainedScenarioReviewScenarioReference;
      /** Hash of the admitted Scenario, never a revised Candidate hash. */
      readonly admittedScenarioSha256: ScenarioReviewSourceSha256;
      readonly campaign: RetainedScenarioReviewCampaignIdentity;
    }>
  | Readonly<{
      readonly tag: "benchmark";
      readonly reviewStage: RetainedScenarioReviewStage;
      readonly scenarioId: RetainedScenarioReviewScenarioReference;
      readonly benchmark: RetainedScenarioReviewBenchmarkIdentity;
    }>;

type CurrentRetainedScenarioReviewInput = Extract<
  RetainedScenarioReviewInput,
  { readonly schemaVersion: 3 }
>;
type CandidateRetainedScenarioReviewInput = Omit<
  CurrentRetainedScenarioReviewInput,
  "subject"
> & {
  readonly subject: Extract<
    CurrentRetainedScenarioReviewInput["subject"],
    { readonly tag: "scenarioCandidate" }
  >;
};
type ScenarioRetainedScenarioReviewInput = Omit<
  CurrentRetainedScenarioReviewInput,
  "subject"
> & {
  readonly subject: Extract<
    CurrentRetainedScenarioReviewInput["subject"],
    { readonly tag: "scenario" }
  >;
};
type BenchmarkRetainedScenarioReviewInput = Omit<
  CurrentRetainedScenarioReviewInput,
  "subject"
> & {
  readonly subject: Extract<
    CurrentRetainedScenarioReviewInput["subject"],
    { readonly tag: "benchmark" }
  >;
};
type HistoricalRetainedScenarioReviewInput = Extract<
  RetainedScenarioReviewInput,
  { readonly schemaVersion: 2 }
>;

function isCandidateRetainedScenarioReviewInput(
  input: RetainedScenarioReviewInput,
): input is CandidateRetainedScenarioReviewInput {
  return input.schemaVersion === 3 && input.subject.tag === "scenarioCandidate";
}

function isScenarioRetainedScenarioReviewInput(
  input: RetainedScenarioReviewInput,
): input is ScenarioRetainedScenarioReviewInput {
  return input.schemaVersion === 3 && input.subject.tag === "scenario";
}

function isBenchmarkRetainedScenarioReviewInput(
  input: RetainedScenarioReviewInput,
): input is BenchmarkRetainedScenarioReviewInput {
  return input.schemaVersion === 3 && input.subject.tag === "benchmark";
}

type CandidateReplayLedgerEntry = Extract<
  CurrentModelInvocationLedgerEntry,
  {
    readonly phase: "scenarioCompositeReview";
    readonly subject: { readonly tag: "scenarioCandidate" };
  }
>;
type ScenarioReplayLedgerEntry = Extract<
  CurrentModelInvocationLedgerEntry,
  {
    readonly phase: "scenarioCompositeReview";
    readonly subject: { readonly tag: "scenario" };
  }
>;
type BenchmarkReplayLedgerEntry = CurrentModelInvocationLedgerEntry &
  Readonly<{
    readonly schemaVersion: 4 | 5;
    readonly phase: "scenarioCompositeReview";
    readonly subject: Extract<
      CurrentModelInvocationLedgerEntry["subject"],
      { readonly tag: "benchmark" }
    >;
  }>;
type HistoricalReplayLedgerEntry =
  | Extract<ModelInvocationLedgerEntry, { readonly schemaVersion: 2 }>
  | CandidateReplayLedgerEntry
  | ScenarioReplayLedgerEntry;

export type RetainedScenarioReviewReplayBinding =
  | Readonly<{
      readonly tag: "candidate";
      readonly retainedInput: CandidateRetainedScenarioReviewInput;
      readonly ledgerEntry: CandidateReplayLedgerEntry;
    }>
  | Readonly<{
      readonly tag: "scenario";
      readonly retainedInput: ScenarioRetainedScenarioReviewInput;
      readonly ledgerEntry: ScenarioReplayLedgerEntry;
    }>
  | Readonly<{
      readonly tag: "historicalScenario";
      readonly retainedInput: HistoricalRetainedScenarioReviewInput;
      readonly ledgerEntry: HistoricalReplayLedgerEntry;
    }>
  | Readonly<{
      readonly tag: "benchmark";
      readonly retainedInput:
        | BenchmarkRetainedScenarioReviewInput
        | HistoricalRetainedScenarioReviewInput;
      readonly ledgerEntry: BenchmarkReplayLedgerEntry;
    }>;

function replayLedgerSchemaVersion(
  input: RetainedScenarioReviewInput,
  ledgerEntry: ModelInvocationLedgerEntry,
  invocationId: string,
): Either.Either<2 | 4 | 5, string> {
  if (input.schemaVersion === 2) {
    if (ledgerEntry.schemaVersion === 2) return Either.right(2);
    if (ledgerEntry.schemaVersion !== 4 && ledgerEntry.schemaVersion !== 5) {
      return Either.left(
        `Historical review invocation ${invocationId} does not match the expected ledger version.`,
      );
    }
    return Either.right(ledgerEntry.schemaVersion);
  }
  if (ledgerEntry.schemaVersion !== 4 && ledgerEntry.schemaVersion !== 5) {
    const lifecycle =
      input.schemaVersion === 3 && input.subject.tag === "scenarioCandidate"
        ? "Candidate"
        : input.schemaVersion === 3 && input.subject.tag === "benchmark"
          ? "benchmark"
          : "Scenario";
    return Either.left(
      `Current ${lifecycle} review invocation ${invocationId} requires current ledger evidence.`,
    );
  }
  if (canonicalJson(ledgerEntry.subject) !== canonicalJson(input.subject)) {
    return Either.left(
      `Current review invocation ${invocationId} does not match its lifecycle subject.`,
    );
  }
  return Either.right(ledgerEntry.schemaVersion);
}

function isCandidateReplayLedgerEntry(
  entry: ModelInvocationLedgerEntry,
): entry is CandidateReplayLedgerEntry {
  return (
    (entry.schemaVersion === 4 || entry.schemaVersion === 5) &&
    entry.phase === "scenarioCompositeReview" &&
    entry.subject.tag === "scenarioCandidate"
  );
}

function isScenarioReplayLedgerEntry(
  entry: ModelInvocationLedgerEntry,
): entry is ScenarioReplayLedgerEntry {
  return (
    (entry.schemaVersion === 4 || entry.schemaVersion === 5) &&
    entry.phase === "scenarioCompositeReview" &&
    entry.subject.tag === "scenario"
  );
}

function isBenchmarkReplayLedgerEntry(
  entry: ModelInvocationLedgerEntry,
): entry is BenchmarkReplayLedgerEntry {
  return (
    (entry.schemaVersion === 4 || entry.schemaVersion === 5) &&
    entry.phase === "scenarioCompositeReview" &&
    entry.subject.tag === "benchmark"
  );
}

function isHistoricalReplayLedgerEntry(
  entry: ModelInvocationLedgerEntry,
): entry is HistoricalReplayLedgerEntry {
  return (
    entry.schemaVersion === 2 ||
    isCandidateReplayLedgerEntry(entry) ||
    isScenarioReplayLedgerEntry(entry)
  );
}

/**
 * Construct the one canonical replay binding after validating the
 * lifecycle-specific expectation against the parsed envelope and ledger.
 * Schema-2 retained reviews can bind to exact v2 rows or migrated v4
 * lifecycle rows, including a scenarioCandidate row after its Campaign
 * ownership is checked; schema-3 Candidate reviews require a
 * lifecycle-discriminated current row so the immutable Candidate, Campaign, and
 * Evidence Set identity is preserved.
 */
export function retainedScenarioReviewMatchesReplayBinding(
  input: RetainedScenarioReviewInput,
  ledgerEntry: ModelInvocationLedgerEntry,
  expected: RetainedScenarioReviewReplayExpectation,
): Either.Either<RetainedScenarioReviewReplayBinding, string> {
  if (input.reviewStage !== expected.reviewStage) {
    return Either.left(
      `Review stage ${input.reviewStage} does not match expected ${expected.reviewStage}.`,
    );
  }
  const subject = retainedScenarioReviewSubject(input);
  const inputTag =
    input.schemaVersion === 2
      ? "historicalScenario"
      : subject.tag === "scenarioCandidate"
        ? "candidate"
        : subject.tag === "benchmark"
          ? "benchmark"
          : "scenario";
  if (
    (expected.tag === "candidate" && inputTag !== "candidate") ||
    ((expected.tag === "scenario" || expected.tag === "historicalScenario") &&
      (inputTag === "candidate" || inputTag === "benchmark")) ||
    (expected.tag === "benchmark" &&
      input.schemaVersion !== 2 &&
      inputTag !== "benchmark") ||
    (expected.tag === "historicalScenario" && input.schemaVersion !== 2)
  ) {
    return Either.left(
      `Review invocation ${input.invocationId} has lifecycle ${inputTag}, not expected ${expected.tag}.`,
    );
  }
  if (expected.tag === "candidate" && expected.reviewStage === "final") {
    const admission = retainedScenarioReviewMatchesAdmission(input, {
      scenarioId: expected.scenarioId,
      scenarioSha256: expected.admittedScenarioSha256,
    });
    if (Either.isLeft(admission)) return Either.left(admission.left);
  }
  if (ledgerEntry.invocationId !== input.invocationId) {
    return Either.left(
      `Review invocation ${input.invocationId} does not match ledger invocation ${ledgerEntry.invocationId}.`,
    );
  }
  if (ledgerEntry.phase !== "scenarioCompositeReview") {
    return Either.left(
      `Review invocation ${input.invocationId} is not a composite-review ledger entry.`,
    );
  }
  if (
    ledgerEntry.gitSha !== input.sourceGitSha ||
    ledgerEntry.model !== input.model ||
    ledgerEntry.reasoningEffort !== input.reasoningEffort
  ) {
    return Either.left(
      `Review invocation ${input.invocationId} does not match its source Git, model, or reasoning effort.`,
    );
  }

  const envelopeScenarioReference =
    subject.tag === "scenarioCandidate"
      ? subject.plannedScenarioId
      : subject.scenarioId;
  const ledgerScenarioReference = modelInvocationScenarioReference(ledgerEntry);
  if (
    String(
      input.schemaVersion === 2 ? input.scenarioId : envelopeScenarioReference,
    ) !== String(expected.scenarioId) ||
    String(ledgerScenarioReference) !== String(expected.scenarioId)
  ) {
    return Either.left(
      input.schemaVersion === 2
        ? expected.reviewStage === "final"
          ? `${String(envelopeScenarioReference)} does not match admitted scenario ${String(expected.scenarioId)}.`
          : `Historical review invocation ${input.invocationId} does not match the expected scenario identity.`
        : `Review invocation ${input.invocationId} does not match the expected scenario identity.`,
    );
  }

  const ledgerSchemaVersion = replayLedgerSchemaVersion(
    input,
    ledgerEntry,
    input.invocationId,
  );
  if (Either.isLeft(ledgerSchemaVersion))
    return Either.left(ledgerSchemaVersion.left);

  if (
    expected.tag === "historicalScenario" &&
    (ledgerEntry.schemaVersion === 4 || ledgerEntry.schemaVersion === 5) &&
    ledgerEntry.subject.tag === "scenarioCandidate" &&
    (ledgerEntry.subject.campaignId !== expected.campaign.campaignId ||
      ledgerEntry.subject.evidenceSetId !== expected.campaign.evidenceSetId ||
      ledgerEntry.subject.plannedScenarioId !==
        expected.campaign.plannedScenarioId)
  ) {
    return Either.left(
      `Historical review Candidate ${ledgerEntry.subject.candidateId} does not belong to the expected Campaign, Evidence Set, and planned Scenario.`,
    );
  }

  if (
    expected.tag === "historicalScenario" &&
    expected.reviewStage === "final" &&
    (ledgerEntry.schemaVersion === 4 || ledgerEntry.schemaVersion === 5) &&
    ledgerEntry.subject.tag === "scenarioCandidate" &&
    ledgerEntry.subject.candidateScenarioSha256 !==
      expected.admittedScenarioSha256
  ) {
    return Either.left(
      `Historical review Candidate ${ledgerEntry.subject.candidateId} does not match the admitted Scenario source hash.`,
    );
  }

  if (expected.tag === "candidate") {
    if (
      subject.tag !== "scenarioCandidate" ||
      subject.campaignId !== expected.campaign.campaignId ||
      subject.evidenceSetId !== expected.campaign.evidenceSetId ||
      subject.plannedScenarioId !== expected.campaign.plannedScenarioId
    ) {
      return Either.left(
        `Review Candidate ${subject.tag === "scenarioCandidate" ? subject.candidateId : input.invocationId} does not belong to the expected Campaign, Evidence Set, and planned Scenario.`,
      );
    }
  }

  if (expected.tag === "benchmark") {
    if (!isBenchmarkReplayLedgerEntry(ledgerEntry)) {
      return Either.left(
        `Benchmark review invocation ${input.invocationId} requires a benchmark lifecycle ledger entry.`,
      );
    }
    if (
      ledgerEntry.subject.benchmarkId !== expected.benchmark.benchmarkId ||
      ledgerEntry.subject.profile !== expected.benchmark.profile ||
      ledgerEntry.subject.scenarioId !== expected.scenarioId
    ) {
      return Either.left(
        `Benchmark review invocation ${input.invocationId} does not match its benchmark, profile, or scenario identity.`,
      );
    }
    if (
      !isBenchmarkRetainedScenarioReviewInput(input) &&
      input.schemaVersion !== 2
    ) {
      return Either.left(
        `Benchmark review invocation ${input.invocationId} has an invalid parsed lifecycle binding.`,
      );
    }
    return Either.right({
      tag: "benchmark",
      retainedInput: input,
      ledgerEntry,
    });
  }

  if (expected.tag === "candidate") {
    if (
      !isCandidateRetainedScenarioReviewInput(input) ||
      !isCandidateReplayLedgerEntry(ledgerEntry)
    ) {
      return Either.left(
        `Current Candidate review invocation ${input.invocationId} has an invalid parsed lifecycle binding.`,
      );
    }
    return Either.right({
      tag: "candidate",
      retainedInput: input,
      ledgerEntry,
    });
  }
  if (input.schemaVersion === 2) {
    if (!isHistoricalReplayLedgerEntry(ledgerEntry)) {
      return Either.left(
        `Historical review invocation ${input.invocationId} has an invalid parsed lifecycle binding.`,
      );
    }
    return Either.right({
      tag: "historicalScenario",
      retainedInput: input,
      ledgerEntry,
    });
  }
  if (
    !isScenarioRetainedScenarioReviewInput(input) ||
    !isScenarioReplayLedgerEntry(ledgerEntry)
  ) {
    return Either.left(
      `Scenario review invocation ${input.invocationId} has an invalid parsed lifecycle binding.`,
    );
  }
  return Either.right({
    tag: "scenario",
    retainedInput: input,
    ledgerEntry,
  });
}
