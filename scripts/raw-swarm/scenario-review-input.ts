import { Either, Schema } from "effect";

import { ScenarioCompositeReviewSchema } from "./scenario-campaign.ts";
import {
  ScenarioCampaignIdSchema,
  ScenarioCandidateIdSchema,
  EvidenceSetIdSchema,
  PlannedScenarioIdSchema,
  HistoricalScenarioIdSchema,
  type HistoricalScenarioId,
} from "./raw-swarm-identities.ts";
import { GitShaSchema, ScenarioIdSchema } from "./transcript.ts";

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
