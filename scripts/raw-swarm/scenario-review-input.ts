import { Schema } from "effect";

import { ScenarioCompositeReviewSchema } from "./scenario-campaign.ts";
import {
  ScenarioCampaignIdSchema,
  ScenarioCandidateIdSchema,
  PlannedScenarioIdSchema,
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
  scenarioId: ScenarioIdSchema,
});

const RetainedScenarioReviewSubjectSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("scenarioCandidate"),
    campaignId: ScenarioCampaignIdSchema,
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
): Schema.Schema.Type<typeof RetainedScenarioReviewSubjectSchema> {
  return input.schemaVersion === 2
    ? { tag: "scenario", scenarioId: input.scenarioId }
    : input.subject;
}

export function retainedScenarioReviewScenarioId(
  input: RetainedScenarioReviewInput,
) {
  const subject = retainedScenarioReviewSubject(input);
  return subject.tag === "scenario"
    ? subject.scenarioId
    : subject.plannedScenarioId;
}
