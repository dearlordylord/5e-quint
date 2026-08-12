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

const SuppliedScenarioContentReviewSchema = Schema.Struct({
  classification: Schema.Literal("supplied"),
  evidence: Schema.NonEmptyTrimmedString,
});
const ExplicitUnavailableProbeReviewSchema = Schema.Struct({
  classification: Schema.Literal("explicitUnavailableProbe"),
  evidence: Schema.NonEmptyTrimmedString,
});
const MissingUnavailableProbeReviewSchema = Schema.Struct({
  classification: Schema.Literal("missingUnavailableProbe"),
  evidence: Schema.NonEmptyTrimmedString,
  critique: Schema.NonEmptyTrimmedString,
});
const InvalidUnavailableSelectionReviewSchema = Schema.Struct({
  classification: Schema.Literal("invalidUnavailableSelection"),
  evidence: Schema.NonEmptyTrimmedString,
  critique: Schema.NonEmptyTrimmedString,
});
export const ScenarioContentReviewSchema = Schema.Union(
  SuppliedScenarioContentReviewSchema,
  ExplicitUnavailableProbeReviewSchema,
  MissingUnavailableProbeReviewSchema,
  InvalidUnavailableSelectionReviewSchema,
);

const CONTENT_AVAILABILITY_INTENTS = [
  "availableOnly",
  "probeUnavailableContent",
] as const;
const ContentAvailabilityIntentSchema = Schema.Literal(
  ...CONTENT_AVAILABILITY_INTENTS,
);
export type ContentAvailabilityIntent =
  (typeof CONTENT_AVAILABILITY_INTENTS)[number];

const ScenarioContentAdmissionSchema = Schema.Union(
  Schema.Struct({
    contentAvailabilityIntent: Schema.Literal("availableOnly"),
    contentReview: Schema.Union(
      SuppliedScenarioContentReviewSchema,
      InvalidUnavailableSelectionReviewSchema,
    ),
  }),
  Schema.Struct({
    contentAvailabilityIntent: Schema.Literal("probeUnavailableContent"),
    contentReview: Schema.Union(
      ExplicitUnavailableProbeReviewSchema,
      MissingUnavailableProbeReviewSchema,
      InvalidUnavailableSelectionReviewSchema,
    ),
  }),
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

export const FinalScenarioReviewSchema = Schema.Struct({
  ...FinalScenarioIdentitySchema.fields,
  admitReviewedUnsupported: Schema.Boolean,
  rawReview: ScenarioRawReviewSchema,
  policyReview: ScenarioPolicyReviewSchema,
}).pipe(Schema.extend(ScenarioContentAdmissionSchema));

type ScenarioAdmissionReviews = Pick<
  Schema.Schema.Type<typeof FinalScenarioReviewSchema>,
  | "contentAvailabilityIntent"
  | "admitReviewedUnsupported"
  | "rawReview"
  | "contentReview"
  | "policyReview"
>;

type ScenarioContentAdmission = Schema.Schema.Type<
  typeof ScenarioContentAdmissionSchema
>;

function decodeScenarioContentAdmission(input: {
  readonly contentAvailabilityIntent: ContentAvailabilityIntent;
  readonly contentReview: ScenarioContentReview;
}): Either.Either<ScenarioContentAdmission, string> {
  const decoded = Schema.decodeUnknownEither(ScenarioContentAdmissionSchema, {
    onExcessProperty: "error",
  })(input);
  return Either.isRight(decoded)
    ? Either.right(decoded.right)
    : Either.left(
        "Scenario content reviewer returned a result inconsistent with the campaign intent.",
      );
}

function rawDisposition(
  review: ScenarioRawReview,
  admitReviewedUnsupported: boolean,
): "admitted" | "rejected" {
  return Match.value(review).pipe(
    Match.when({ classification: "supported" }, () => "admitted" as const),
    Match.when({ classification: "unsupported" }, () =>
      admitReviewedUnsupported ? ("admitted" as const) : ("rejected" as const),
    ),
    Match.when({ classification: "contradictory" }, () => "rejected" as const),
    Match.exhaustive,
  );
}

export function finalScenarioDisposition(
  review: ScenarioAdmissionReviews,
): "admitted" | "rejected" {
  return Match.value(review.policyReview).pipe(
    Match.when({ classification: "violation" }, () => "rejected" as const),
    Match.when({ classification: "safe" }, () =>
      Match.value({
        contentAvailabilityIntent: review.contentAvailabilityIntent,
        contentReview: review.contentReview,
      }).pipe(
        Match.when(
          {
            contentAvailabilityIntent: "availableOnly",
            contentReview: { classification: "supplied" },
          },
          () =>
            rawDisposition(review.rawReview, review.admitReviewedUnsupported),
        ),
        Match.when(
          {
            contentAvailabilityIntent: "probeUnavailableContent",
            contentReview: { classification: "explicitUnavailableProbe" },
          },
          () =>
            rawDisposition(review.rawReview, review.admitReviewedUnsupported),
        ),
        Match.when(
          {
            contentReview: { classification: "invalidUnavailableSelection" },
          },
          () => "rejected" as const,
        ),
        Match.when(
          {
            contentReview: { classification: "missingUnavailableProbe" },
          },
          () => "rejected" as const,
        ),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
}

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
  contentAvailabilityIntent: ContentAvailabilityIntentSchema,
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
export type ScenarioContentReview = Schema.Schema.Type<
  typeof ScenarioContentReviewSchema
>;

export type ScenarioGenerationInput = {
  readonly iteration: number;
  readonly distributionPreference: string;
  readonly contentAvailabilityIntent: ScenarioCampaignConfig["contentAvailabilityIntent"];
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
    readonly contentAvailabilityIntent: ScenarioCampaignConfig["contentAvailabilityIntent"];
  }) => Promise<ScenarioReadiness>;
  readonly reviewRaw: (
    scenario: string,
    finalReview: boolean,
  ) => Promise<ScenarioRawReview>;
  readonly reviewContent: (input: {
    readonly scenario: string;
    readonly contentAvailabilityIntent: ScenarioCampaignConfig["contentAvailabilityIntent"];
  }) => Promise<ScenarioContentReview>;
  readonly reviewPolicy: (scenario: string) => Promise<ScenarioPolicyReview>;
}

export interface ScenarioCandidateSelector {
  readonly select: (candidateCount: number) => number;
}

type ScenarioCampaignResultBase = {
  readonly scenarioId: ScenarioCampaignConfig["scenarioId"];
  readonly scenario: string;
  readonly iterations: number;
  readonly stopReason: "ready" | "maximum";
  readonly admitReviewedUnsupported: boolean;
  readonly rawReview: ScenarioRawReview;
  readonly policyReview: ScenarioPolicyReview;
};

export type ScenarioCampaignResult = ScenarioCampaignResultBase &
  ScenarioContentAdmission;

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
      contentAvailabilityIntent: config.contentAvailabilityIntent,
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
      const contentReview = await agents.reviewContent({
        scenario: prose,
        contentAvailabilityIntent: config.contentAvailabilityIntent,
      });
      const contentAdmission = decodeScenarioContentAdmission({
        contentAvailabilityIntent: config.contentAvailabilityIntent,
        contentReview,
      });
      if (Either.isLeft(contentAdmission)) {
        return Either.left(contentAdmission.left);
      }
      Match.value(contentAdmission.right.contentReview).pipe(
        Match.when(
          { classification: "invalidUnavailableSelection" },
          ({ critique }) => critiques.push(critique),
        ),
        Match.when(
          { classification: "missingUnavailableProbe" },
          ({ critique }) => critiques.push(critique),
        ),
        Match.when({ classification: "supplied" }, () => undefined),
        Match.when(
          { classification: "explicitUnavailableProbe" },
          () => undefined,
        ),
        Match.exhaustive,
      );
    }
    draft = { tag: "selected", prose, iteration, critiques };
    if (iteration === config.maximumIterations) {
      break;
    }
    if (iteration >= config.minimumIterations && critiques.length === 0) {
      const readiness = await agents.reviewReadiness({
        scenario: prose,
        distributionPreference: config.distributionPreference,
        contentAvailabilityIntent: config.contentAvailabilityIntent,
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
  const finalContentReview = await agents.reviewContent({
    scenario: draft.prose,
    contentAvailabilityIntent: config.contentAvailabilityIntent,
  });
  const finalContentAdmission = decodeScenarioContentAdmission({
    contentAvailabilityIntent: config.contentAvailabilityIntent,
    contentReview: finalContentReview,
  });
  if (Either.isLeft(finalContentAdmission)) {
    return Either.left(finalContentAdmission.left);
  }
  const finalPolicyReview = await agents.reviewPolicy(draft.prose);
  const resultBase = {
    scenarioId: config.scenarioId,
    scenario: draft.prose,
    iterations: draft.iteration,
    stopReason:
      draft.iteration === config.maximumIterations ? "maximum" : "ready",
    admitReviewedUnsupported: config.admitReviewedUnsupported,
    rawReview: finalRawReview,
    policyReview: finalPolicyReview,
    ...finalContentAdmission.right,
  } as const;
  return Either.right(resultBase);
}
