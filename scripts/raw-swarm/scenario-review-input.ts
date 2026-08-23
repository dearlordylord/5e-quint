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
type RetainedScenarioReviewSubject = Schema.Schema.Type<
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
    readonly scenarioId: Schema.Schema.Type<typeof ScenarioIdSchema>;
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
  readonly plannedScenarioId?: PlannedScenarioId;
}>;

/**
 * The replay boundary has two historical shapes. Schema-2 retained reviews
 * can bind only to historical v2 or current v4 ledger scenario references;
 * schema-3 Candidate reviews require a lifecycle-discriminated v4 row so the
 * immutable Candidate, Campaign, and Evidence Set identity is preserved.
 */
export function retainedScenarioReviewMatchesReplayBinding(
  input: RetainedScenarioReviewInput,
  ledgerEntry: ModelInvocationLedgerEntry,
  expected: Readonly<{
    readonly reviewStage: RetainedScenarioReviewStage;
    readonly scenarioId: Schema.Schema.Type<typeof ScenarioIdSchema>;
    readonly scenarioSha256: ScenarioReviewSourceSha256;
    readonly campaign?: RetainedScenarioReviewCampaignIdentity;
  }>,
): Either.Either<
  RetainedScenarioReviewSubject | HistoricalRetainedScenarioReviewSubject,
  string
> {
  if (input.reviewStage !== expected.reviewStage) {
    return Either.left(
      `Review stage ${input.reviewStage} does not match expected ${expected.reviewStage}.`,
    );
  }
  if (expected.reviewStage === "final") {
    const admission = retainedScenarioReviewMatchesAdmission(input, {
      scenarioId: expected.scenarioId,
      scenarioSha256: expected.scenarioSha256,
    });
    if (Either.isLeft(admission)) return admission;
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

  const subject = retainedScenarioReviewSubject(input);
  if (input.schemaVersion === 2) {
    if (
      (ledgerEntry.schemaVersion !== 2 && ledgerEntry.schemaVersion !== 4) ||
      String(modelInvocationScenarioReference(ledgerEntry)) !==
        String(expected.scenarioId)
    ) {
      return Either.left(
        `Historical review invocation ${input.invocationId} does not match the expected scenario or ledger version.`,
      );
    }
    return Either.right(subject);
  }

  if (ledgerEntry.schemaVersion !== 4) {
    return Either.left(
      `Current Candidate review invocation ${input.invocationId} requires v4 ledger evidence.`,
    );
  }
  if (canonicalJson(ledgerEntry.subject) !== canonicalJson(input.subject)) {
    return Either.left(
      `Current review invocation ${input.invocationId} does not match its lifecycle subject.`,
    );
  }
  if (
    input.subject.tag === "scenarioCandidate" &&
    expected.campaign !== undefined
  ) {
    if (
      input.subject.campaignId !== expected.campaign.campaignId ||
      input.subject.evidenceSetId !== expected.campaign.evidenceSetId ||
      (expected.campaign.plannedScenarioId !== undefined &&
        input.subject.plannedScenarioId !== expected.campaign.plannedScenarioId)
    ) {
      return Either.left(
        `Review Candidate ${input.subject.candidateId} does not belong to the expected Campaign and Evidence Set.`,
      );
    }
  }
  return Either.right(subject);
}
