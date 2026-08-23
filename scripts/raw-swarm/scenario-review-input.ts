import { Either, Schema } from "effect";

import { ScenarioCompositeReviewSchema } from "./scenario-campaign.ts";
import {
  modelInvocationScenarioReference,
  type ModelInvocationLedgerEntry,
} from "./model-telemetry.ts";
import {
  ScenarioCampaignIdSchema,
  ScenarioCandidateIdSchema,
  EvidenceSetIdSchema,
  PlannedScenarioIdSchema,
  HistoricalScenarioIdSchema,
  type EvidenceSetId,
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
  return subject.tag === "scenario"
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
  if (subject.tag === "scenario") {
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
      readonly tag: "candidate";
      readonly reviewStage: RetainedScenarioReviewStage;
      readonly scenarioId: RetainedScenarioReviewScenarioReference;
      readonly scenarioSha256: ScenarioReviewSourceSha256;
      readonly campaign: RetainedScenarioReviewCampaignIdentity;
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

type RetainedScenarioReviewReplayBindingCommon = Readonly<{
  readonly reviewStage: RetainedScenarioReviewStage;
  readonly invocationId: string;
  readonly ledgerSchemaVersion: 2 | 4;
  readonly ledgerScenarioReference: ReturnType<
    typeof modelInvocationScenarioReference
  >;
  readonly sourceGitSha: Schema.Schema.Type<typeof GitShaSchema>;
  readonly model: "gpt-5.6-luna";
  readonly reasoningEffort: Schema.Schema.Type<
    typeof RetainedScenarioReviewReasoningEffortSchema
  >;
  /** The successful binding retains parsed values for downstream validators. */
  readonly retainedInput: RetainedScenarioReviewInput;
  readonly ledgerEntry: ModelInvocationLedgerEntry;
}>;

export type RetainedScenarioReviewReplayBinding =
  | (RetainedScenarioReviewReplayBindingCommon & {
      readonly tag: "candidate";
      readonly scenarioId: RetainedScenarioReviewScenarioReference;
      readonly scenarioSha256: ScenarioReviewSourceSha256;
      readonly campaign: RetainedScenarioReviewCampaignIdentity;
      readonly envelopeSubject: CandidateRetainedScenarioReviewInput["subject"];
      readonly retainedInput: CandidateRetainedScenarioReviewInput;
    })
  | (RetainedScenarioReviewReplayBindingCommon & {
      readonly tag: "scenario";
      readonly scenarioId: Schema.Schema.Type<typeof ScenarioIdSchema>;
      readonly envelopeSubject: ScenarioRetainedScenarioReviewInput["subject"];
      readonly retainedInput: ScenarioRetainedScenarioReviewInput;
    })
  | (RetainedScenarioReviewReplayBindingCommon & {
      readonly tag: "historicalScenario";
      readonly scenarioId: HistoricalScenarioId;
      readonly envelopeSubject: HistoricalRetainedScenarioReviewSubject;
      readonly retainedInput: HistoricalRetainedScenarioReviewInput;
    });

/**
 * Validate the lifecycle-specific expectation against the parsed envelope
 * once. Candidate expectations carry the complete Campaign, Evidence Set,
 * planned Scenario, and source hash identity; Scenario expectations
 * intentionally carry no Candidate ownership.
 */
export function retainedScenarioReviewMatchesReplayExpectation(
  input: RetainedScenarioReviewInput,
  expected: RetainedScenarioReviewReplayExpectation,
): Either.Either<RetainedScenarioReviewReplayExpectation, string> {
  const subject = retainedScenarioReviewSubject(input);
  const inputTag =
    subject.tag === "scenarioCandidate" ? "candidate" : "scenario";
  if (inputTag !== expected.tag) {
    return Either.left(
      `Review invocation ${input.invocationId} has lifecycle ${inputTag}, not expected ${expected.tag}.`,
    );
  }
  return Either.right(expected);
}

function replayLedgerSchemaVersion(
  input: RetainedScenarioReviewInput,
  ledgerEntry: ModelInvocationLedgerEntry,
  invocationId: string,
): Either.Either<2 | 4, string> {
  if (input.schemaVersion === 2) {
    if (ledgerEntry.schemaVersion === 2) return Either.right(2);
    if (ledgerEntry.schemaVersion !== 4) {
      return Either.left(
        `Historical review invocation ${invocationId} does not match the expected ledger version.`,
      );
    }
    return ledgerEntry.subject.tag === "scenario"
      ? Either.right(4)
      : Either.left(
          `Historical review invocation ${invocationId} requires a v4 Scenario lifecycle subject.`,
        );
  }
  if (ledgerEntry.schemaVersion !== 4) {
    const lifecycle =
      input.schemaVersion === 3 && input.subject.tag === "scenarioCandidate"
        ? "Candidate"
        : "Scenario";
    return Either.left(
      `Current ${lifecycle} review invocation ${invocationId} requires v4 ledger evidence.`,
    );
  }
  if (canonicalJson(ledgerEntry.subject) !== canonicalJson(input.subject)) {
    return Either.left(
      `Current review invocation ${invocationId} does not match its lifecycle subject.`,
    );
  }
  return Either.right(4);
}

/**
 * The replay boundary has two historical shapes. Schema-2 retained reviews
 * can bind only to historical v2 or current v4 ledger scenario references;
 * schema-3 Candidate reviews require a lifecycle-discriminated v4 row so the
 * immutable Candidate, Campaign, and Evidence Set identity is preserved.
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
        : "scenario";
  if (
    (expected.tag === "candidate" && inputTag !== "candidate") ||
    (expected.tag === "scenario" && inputTag === "candidate")
  ) {
    return Either.left(
      `Review invocation ${input.invocationId} has lifecycle ${inputTag}, not expected ${expected.tag}.`,
    );
  }
  if (expected.tag === "candidate" && expected.reviewStage === "final") {
    const admission = retainedScenarioReviewMatchesAdmission(input, {
      scenarioId: expected.scenarioId,
      scenarioSha256: expected.scenarioSha256,
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

  const common = {
    reviewStage: expected.reviewStage,
    invocationId: input.invocationId,
    ledgerSchemaVersion: ledgerSchemaVersion.right,
    ledgerScenarioReference,
    sourceGitSha: input.sourceGitSha,
    model: input.model,
    reasoningEffort: input.reasoningEffort,
    retainedInput: input,
    ledgerEntry,
  } as const;
  if (expected.tag === "candidate") {
    if (!isCandidateRetainedScenarioReviewInput(input)) {
      return Either.left(
        `Current Candidate review invocation ${input.invocationId} has an invalid lifecycle shape.`,
      );
    }
    return Either.right({
      ...common,
      tag: "candidate",
      scenarioId: expected.scenarioId,
      scenarioSha256: expected.scenarioSha256,
      campaign: expected.campaign,
      envelopeSubject: input.subject,
      retainedInput: input,
    });
  }
  if (input.schemaVersion === 2) {
    return Either.right({
      ...common,
      tag: "historicalScenario",
      scenarioId: input.scenarioId,
      envelopeSubject: { tag: "scenario", scenarioId: input.scenarioId },
      retainedInput: input,
    });
  }
  if (!isScenarioRetainedScenarioReviewInput(input)) {
    return Either.left(
      `Scenario review invocation ${input.invocationId} has an invalid lifecycle shape.`,
    );
  }
  return Either.right({
    ...common,
    tag: "scenario",
    scenarioId: input.subject.scenarioId,
    envelopeSubject: input.subject,
    retainedInput: input,
  });
}
