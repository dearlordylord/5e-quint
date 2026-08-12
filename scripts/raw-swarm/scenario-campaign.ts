import { createHash } from "node:crypto";
import { Either, JSONSchema, Match, Schema } from "effect";

import { GitShaSchema, ScenarioIdSchema } from "./transcript.ts";

const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.positive(),
);

export function codexOutputJsonSchema<A, I>(schema: Schema.Schema<A, I>) {
  return JSONSchema.make(Schema.Struct({ result: schema }));
}

export const ScenarioCandidateBatchSchema = Schema.Struct({
  candidates: Schema.Array(Schema.NonEmptyTrimmedString).pipe(
    Schema.minItems(2),
    Schema.filter(
      (candidates) => new Set(candidates).size === candidates.length,
      { message: () => "scenario candidates must be distinct" },
    ),
  ),
});

export const ScenarioReadinessSchema = Schema.Union(
  Schema.Struct({ decision: Schema.Literal("ready") }),
  Schema.Struct({
    decision: Schema.Literal("continue"),
    critique: Schema.NonEmptyTrimmedString,
  }),
);

const SupportedScenarioRawReviewSchema = Schema.Struct({
  classification: Schema.Literal("supported"),
  evidence: Schema.NonEmptyTrimmedString,
});
const UnsupportedScenarioRawReviewSchema = Schema.Struct({
  classification: Schema.Literal("unsupported"),
  evidence: Schema.NonEmptyTrimmedString,
  critique: Schema.NonEmptyTrimmedString,
});
const ContradictoryScenarioRawReviewSchema = Schema.Struct({
  classification: Schema.Literal("contradictory"),
  evidence: Schema.NonEmptyTrimmedString,
  critique: Schema.NonEmptyTrimmedString,
});
export const ScenarioRawReviewSchema = Schema.Union(
  SupportedScenarioRawReviewSchema,
  UnsupportedScenarioRawReviewSchema,
  ContradictoryScenarioRawReviewSchema,
);

const SafeScenarioPolicyReviewSchema = Schema.Struct({
  classification: Schema.Literal("safe"),
  evidence: Schema.NonEmptyTrimmedString,
});
const ViolatingScenarioPolicyReviewSchema = Schema.Struct({
  classification: Schema.Literal("violation"),
  evidence: Schema.NonEmptyTrimmedString,
  critique: Schema.NonEmptyTrimmedString,
});
export const ScenarioPolicyReviewSchema = Schema.Union(
  SafeScenarioPolicyReviewSchema,
  ViolatingScenarioPolicyReviewSchema,
);

const ScenarioSha256Schema = Schema.String.pipe(
  Schema.pattern(/^[0-9a-f]{64}$/),
  Schema.brand("RawSwarmScenarioSha256"),
);

const FinalScenarioIdentitySchema = Schema.Struct({
  scenarioId: ScenarioIdSchema,
  scenarioSha256: ScenarioSha256Schema,
  gitSha: GitShaSchema,
});

export const FinalScenarioReviewSchema = Schema.Union(
  Schema.Struct({
    ...FinalScenarioIdentitySchema.fields,
    disposition: Schema.Literal("admitted"),
    rawReview: Schema.Union(
      SupportedScenarioRawReviewSchema,
      UnsupportedScenarioRawReviewSchema,
    ),
    policyReview: SafeScenarioPolicyReviewSchema,
  }),
  Schema.Struct({
    ...FinalScenarioIdentitySchema.fields,
    disposition: Schema.Literal("rejected"),
    rawReview: ScenarioRawReviewSchema,
    policyReview: ViolatingScenarioPolicyReviewSchema,
  }),
  Schema.Struct({
    ...FinalScenarioIdentitySchema.fields,
    disposition: Schema.Literal("rejected"),
    rawReview: Schema.Union(
      UnsupportedScenarioRawReviewSchema,
      ContradictoryScenarioRawReviewSchema,
    ),
    policyReview: SafeScenarioPolicyReviewSchema,
  }),
);

export function verifyFinalScenarioReview(
  input: unknown,
  expected: {
    readonly scenarioId: Schema.Schema.Type<typeof ScenarioIdSchema>;
    readonly gitSha: Schema.Schema.Type<typeof GitShaSchema>;
    readonly scenarioBytes: string;
  },
): Either.Either<Schema.Schema.Type<typeof FinalScenarioReviewSchema>, string> {
  const decoded = Schema.decodeUnknownEither(FinalScenarioReviewSchema, {
    onExcessProperty: "error",
  })(input);
  if (Either.isLeft(decoded)) {
    return Either.left(
      `Invalid final scenario review: ${decoded.left.message}`,
    );
  }
  if (
    decoded.right.scenarioId !== expected.scenarioId ||
    decoded.right.gitSha !== expected.gitSha ||
    decoded.right.scenarioSha256 !==
      createHash("sha256").update(expected.scenarioBytes).digest("hex")
  ) {
    return Either.left("Final scenario review identity does not match.");
  }
  return Either.right(decoded.right);
}

export function retentionRevisionMatches(
  expected: Schema.Schema.Type<typeof GitShaSchema>,
  actual:
    | { readonly tag: "clean"; readonly sha: string }
    | { readonly tag: "dirty" },
): boolean {
  return actual.tag === "clean" && actual.sha === expected;
}

export const ScenarioCampaignConfigSchema = Schema.Struct({
  scenarioId: ScenarioIdSchema,
  distributionPreference: Schema.NonEmptyTrimmedString,
  minimumIterations: PositiveIntegerSchema,
  maximumIterations: PositiveIntegerSchema,
  candidatesPerIteration: PositiveIntegerSchema.pipe(Schema.greaterThan(1)),
  rawReviewMilestones: Schema.Array(PositiveIntegerSchema),
  admitReviewedUnsupported: Schema.Boolean,
}).pipe(
  Schema.filter(
    (config) =>
      config.minimumIterations <= config.maximumIterations &&
      config.rawReviewMilestones.every(
        (milestone) => milestone < config.maximumIterations,
      ) &&
      new Set(config.rawReviewMilestones).size ===
        config.rawReviewMilestones.length,
    {
      message: () =>
        "campaign bounds require minimum <= maximum and unique RAW milestones below maximum",
    },
  ),
);

export type ScenarioCampaignConfig = Schema.Schema.Type<
  typeof ScenarioCampaignConfigSchema
>;
export type ScenarioCandidateBatch = Schema.Schema.Type<
  typeof ScenarioCandidateBatchSchema
>;
export type ScenarioReadiness = Schema.Schema.Type<
  typeof ScenarioReadinessSchema
>;
export type ScenarioRawReview = Schema.Schema.Type<
  typeof ScenarioRawReviewSchema
>;
export type ScenarioPolicyReview = Schema.Schema.Type<
  typeof ScenarioPolicyReviewSchema
>;

export type ScenarioGenerationInput = {
  readonly iteration: number;
  readonly distributionPreference: string;
  readonly priorRevision:
    | { readonly tag: "initial" }
    | {
        readonly tag: "selected";
        readonly prose: string;
        readonly critiques: readonly string[];
      };
  readonly candidateCount: number;
};

export interface ScenarioCampaignAgents {
  readonly generate: (
    input: ScenarioGenerationInput,
  ) => Promise<ScenarioCandidateBatch>;
  readonly reviewReadiness: (input: {
    readonly scenario: string;
    readonly distributionPreference: string;
  }) => Promise<ScenarioReadiness>;
  readonly reviewRaw: (
    scenario: string,
    finalReview: boolean,
  ) => Promise<ScenarioRawReview>;
  readonly reviewPolicy: (scenario: string) => Promise<ScenarioPolicyReview>;
}

export interface ScenarioCandidateSelector {
  readonly select: (candidateCount: number) => number;
}

export type ScenarioCampaignResult = {
  readonly scenarioId: ScenarioCampaignConfig["scenarioId"];
  readonly scenario: string;
  readonly iterations: number;
  readonly stopReason: "ready" | "maximum";
} & (
  | {
      readonly disposition: "admitted";
      readonly finalRawReview: Extract<
        ScenarioRawReview,
        { readonly classification: "supported" | "unsupported" }
      >;
      readonly finalPolicyReview: Extract<
        ScenarioPolicyReview,
        { readonly classification: "safe" }
      >;
    }
  | {
      readonly disposition: "rejected";
      readonly finalRawReview: ScenarioRawReview;
      readonly finalPolicyReview: Extract<
        ScenarioPolicyReview,
        { readonly classification: "violation" }
      >;
    }
  | {
      readonly disposition: "rejected";
      readonly finalRawReview: Extract<
        ScenarioRawReview,
        { readonly classification: "unsupported" | "contradictory" }
      >;
      readonly finalPolicyReview: Extract<
        ScenarioPolicyReview,
        { readonly classification: "safe" }
      >;
    }
);

export async function runScenarioCampaign(
  configInput: unknown,
  agents: ScenarioCampaignAgents,
  selector: ScenarioCandidateSelector,
): Promise<Either.Either<ScenarioCampaignResult, string>> {
  const decoded = Schema.decodeUnknownEither(ScenarioCampaignConfigSchema, {
    onExcessProperty: "error",
  })(configInput);
  if (Either.isLeft(decoded)) {
    return Either.left(`Invalid scenario campaign: ${decoded.left.message}`);
  }
  const config = decoded.right;
  let draft:
    | { readonly tag: "unstarted" }
    | {
        readonly tag: "selected";
        readonly prose: string;
        readonly iteration: number;
        readonly critiques: readonly string[];
      } = { tag: "unstarted" };

  for (
    let iteration = 1;
    iteration <= config.maximumIterations;
    iteration += 1
  ) {
    const batch = await agents.generate({
      iteration,
      distributionPreference: config.distributionPreference,
      priorRevision:
        draft.tag === "unstarted"
          ? { tag: "initial" }
          : {
              tag: "selected",
              prose: draft.prose,
              critiques: draft.critiques,
            },
      candidateCount: config.candidatesPerIteration,
    });
    const candidates = Schema.decodeUnknownEither(
      ScenarioCandidateBatchSchema,
      {
        onExcessProperty: "error",
      },
    )(batch);
    if (
      Either.isLeft(candidates) ||
      candidates.right.candidates.length !== config.candidatesPerIteration
    ) {
      return Either.left(
        "Scenario generator returned an invalid candidate batch.",
      );
    }
    const selected = selector.select(candidates.right.candidates.length);
    if (
      !Number.isInteger(selected) ||
      selected < 0 ||
      selected >= candidates.right.candidates.length
    ) {
      return Either.left(
        "Scenario selector returned an invalid candidate index.",
      );
    }
    const prose = candidates.right.candidates[selected];
    if (prose === undefined) {
      return Either.left("Scenario selector did not select a candidate.");
    }
    const critiques: string[] = [];

    if (config.rawReviewMilestones.includes(iteration)) {
      const review = await agents.reviewRaw(prose, false);
      if (review.classification !== "supported") {
        critiques.push(review.critique);
      }
    }
    draft = { tag: "selected", prose, iteration, critiques };
    if (iteration === config.maximumIterations) {
      break;
    }
    if (iteration >= config.minimumIterations && critiques.length === 0) {
      const readiness = await agents.reviewReadiness({
        scenario: prose,
        distributionPreference: config.distributionPreference,
      });
      if (readiness.decision === "ready") {
        break;
      }
      draft = {
        ...draft,
        critiques: [...draft.critiques, readiness.critique],
      };
    }
  }

  if (draft.tag === "unstarted") {
    return Either.left("Scenario campaign produced no scenario.");
  }
  const finalRawReview = await agents.reviewRaw(draft.prose, true);
  const finalPolicyReview = await agents.reviewPolicy(draft.prose);
  const resultBase = {
    scenarioId: config.scenarioId,
    scenario: draft.prose,
    iterations: draft.iteration,
    stopReason:
      draft.iteration === config.maximumIterations ? "maximum" : "ready",
  } as const;
  return Match.value(finalPolicyReview).pipe(
    Match.when({ classification: "violation" }, (policy) =>
      Either.right({
        ...resultBase,
        disposition: "rejected" as const,
        finalRawReview,
        finalPolicyReview: policy,
      }),
    ),
    Match.when({ classification: "safe" }, (policy) =>
      Match.value(finalRawReview).pipe(
        Match.when({ classification: "supported" }, (raw) =>
          Either.right({
            ...resultBase,
            disposition: "admitted" as const,
            finalRawReview: raw,
            finalPolicyReview: policy,
          }),
        ),
        Match.when({ classification: "unsupported" }, (raw) =>
          Match.value(config.admitReviewedUnsupported).pipe(
            Match.when(true, () =>
              Either.right({
                ...resultBase,
                disposition: "admitted" as const,
                finalRawReview: raw,
                finalPolicyReview: policy,
              }),
            ),
            Match.when(false, () =>
              Either.right({
                ...resultBase,
                disposition: "rejected" as const,
                finalRawReview: raw,
                finalPolicyReview: policy,
              }),
            ),
            Match.exhaustive,
          ),
        ),
        Match.when({ classification: "contradictory" }, (raw) =>
          Either.right({
            ...resultBase,
            disposition: "rejected" as const,
            finalRawReview: raw,
            finalPolicyReview: policy,
          }),
        ),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
}
