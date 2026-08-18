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

export const CONTENT_AVAILABILITY_INTENTS = [
  "availableOnly",
  "probeUnavailableContent",
] as const;
export const ContentAvailabilityIntentSchema = Schema.Literal(
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

export const SDK_CAPABILITY_INTENTS = [
  "supportedOnly",
  "probeUnsupportedCapability",
] as const;
export const SdkCapabilityIntentSchema = Schema.Literal(
  ...SDK_CAPABILITY_INTENTS,
);
export type SdkCapabilityIntent = (typeof SDK_CAPABILITY_INTENTS)[number];

const SupportedScenarioSdkCapabilityReviewSchema = Schema.Struct({
  classification: Schema.Literal("supported"),
  evidence: Schema.NonEmptyTrimmedString,
});
const UnsupportedScenarioSdkCapabilityReviewSchema = Schema.Struct({
  classification: Schema.Literal("unsupported"),
  evidence: Schema.NonEmptyTrimmedString,
  critique: Schema.NonEmptyTrimmedString,
});
const ExplicitUnsupportedSdkCapabilityProbeReviewSchema = Schema.Struct({
  classification: Schema.Literal("explicitUnsupportedProbe"),
  evidence: Schema.NonEmptyTrimmedString,
});
const MissingUnsupportedSdkCapabilityProbeReviewSchema = Schema.Struct({
  classification: Schema.Literal("missingUnsupportedProbe"),
  evidence: Schema.NonEmptyTrimmedString,
  critique: Schema.NonEmptyTrimmedString,
});
export const ScenarioSdkCapabilityReviewSchema = Schema.Union(
  SupportedScenarioSdkCapabilityReviewSchema,
  UnsupportedScenarioSdkCapabilityReviewSchema,
  ExplicitUnsupportedSdkCapabilityProbeReviewSchema,
  MissingUnsupportedSdkCapabilityProbeReviewSchema,
);

const ScenarioSdkCapabilityAdmissionSchema = Schema.Union(
  Schema.Struct({
    sdkCapabilityIntent: Schema.Literal("supportedOnly"),
    sdkCapabilityReview: Schema.Union(
      SupportedScenarioSdkCapabilityReviewSchema,
      UnsupportedScenarioSdkCapabilityReviewSchema,
    ),
  }),
  Schema.Struct({
    sdkCapabilityIntent: Schema.Literal("probeUnsupportedCapability"),
    sdkCapabilityReview: Schema.Union(
      ExplicitUnsupportedSdkCapabilityProbeReviewSchema,
      MissingUnsupportedSdkCapabilityProbeReviewSchema,
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

export const ScenarioCompositeReviewSchema = Schema.Struct({
  raw: ScenarioRawReviewSchema,
  contentAvailability: ScenarioContentReviewSchema,
  sdkCapability: ScenarioSdkCapabilityReviewSchema,
  artifactPolicy: ScenarioPolicyReviewSchema,
});
export type ScenarioCompositeReview = Schema.Schema.Type<
  typeof ScenarioCompositeReviewSchema
>;

const ScenarioSha256Schema = Schema.String.pipe(
  Schema.pattern(/^[0-9a-f]{64}$/),
  Schema.brand("RawSwarmScenarioSha256"),
);

const FinalScenarioIdentitySchema = Schema.Struct({
  scenarioId: ScenarioIdSchema,
  scenarioSha256: ScenarioSha256Schema,
  gitSha: GitShaSchema,
});

const FinalScenarioReviewBaseSchema = Schema.Struct({
  ...FinalScenarioIdentitySchema.fields,
  admitReviewedUnsupported: Schema.Boolean,
  rawReview: ScenarioRawReviewSchema,
  policyReview: ScenarioPolicyReviewSchema,
});

const RawContentPolicyScenarioReviewSchema = Schema.Struct({
  ...FinalScenarioReviewBaseSchema.fields,
  reviewScope: Schema.Literal("rawContentPolicy"),
}).pipe(Schema.extend(ScenarioContentAdmissionSchema));

const RawContentSdkCapabilityPolicyScenarioReviewSchema = Schema.Struct({
  ...FinalScenarioReviewBaseSchema.fields,
  reviewScope: Schema.Literal("rawContentSdkCapabilityPolicy"),
}).pipe(
  Schema.extend(ScenarioContentAdmissionSchema),
  Schema.extend(ScenarioSdkCapabilityAdmissionSchema),
);

export const FinalScenarioReviewSchema = Schema.Union(
  RawContentPolicyScenarioReviewSchema,
  RawContentSdkCapabilityPolicyScenarioReviewSchema,
);

type ScenarioContentAdmission = Schema.Schema.Type<
  typeof ScenarioContentAdmissionSchema
>;
type ScenarioSdkCapabilityAdmission = Schema.Schema.Type<
  typeof ScenarioSdkCapabilityAdmissionSchema
>;

type ScenarioAdmissionReviews = Schema.Schema.Type<
  typeof FinalScenarioReviewSchema
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

function decodeScenarioSdkCapabilityAdmission(input: {
  readonly sdkCapabilityIntent: SdkCapabilityIntent;
  readonly sdkCapabilityReview: ScenarioSdkCapabilityReview;
}): Either.Either<ScenarioSdkCapabilityAdmission, string> {
  const decoded = Schema.decodeUnknownEither(
    ScenarioSdkCapabilityAdmissionSchema,
    { onExcessProperty: "error" },
  )(input);
  return Either.isRight(decoded)
    ? Either.right(decoded.right)
    : Either.left(
        "Scenario SDK capability reviewer returned a result inconsistent with the campaign intent.",
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

function contentDisposition(
  review: ScenarioContentAdmission,
  rawReview: ScenarioRawReview,
  admitReviewedUnsupported: boolean,
): "admitted" | "rejected" {
  return Match.value(review).pipe(
    Match.when(
      { contentAvailabilityIntent: "availableOnly" },
      ({ contentReview }) =>
        Match.value(contentReview).pipe(
          Match.when({ classification: "supplied" }, () =>
            rawDisposition(rawReview, admitReviewedUnsupported),
          ),
          Match.when(
            { classification: "invalidUnavailableSelection" },
            () => "rejected" as const,
          ),
          Match.exhaustive,
        ),
    ),
    Match.when(
      { contentAvailabilityIntent: "probeUnavailableContent" },
      ({ contentReview }) =>
        Match.value(contentReview).pipe(
          Match.when({ classification: "explicitUnavailableProbe" }, () =>
            rawDisposition(rawReview, admitReviewedUnsupported),
          ),
          Match.when(
            { classification: "invalidUnavailableSelection" },
            () => "rejected" as const,
          ),
          Match.when(
            { classification: "missingUnavailableProbe" },
            () => "rejected" as const,
          ),
          Match.exhaustive,
        ),
    ),
    Match.exhaustive,
  );
}

function sdkCapabilityDisposition(
  review: ScenarioSdkCapabilityAdmission,
): "admitted" | "rejected" {
  return Match.value(review).pipe(
    Match.when(
      { sdkCapabilityIntent: "supportedOnly" },
      ({ sdkCapabilityReview }) =>
        Match.value(sdkCapabilityReview).pipe(
          Match.when(
            { classification: "supported" },
            () => "admitted" as const,
          ),
          Match.when(
            { classification: "unsupported" },
            () => "rejected" as const,
          ),
          Match.exhaustive,
        ),
    ),
    Match.when(
      { sdkCapabilityIntent: "probeUnsupportedCapability" },
      ({ sdkCapabilityReview }) =>
        Match.value(sdkCapabilityReview).pipe(
          Match.when(
            { classification: "explicitUnsupportedProbe" },
            () => "admitted" as const,
          ),
          Match.when(
            { classification: "missingUnsupportedProbe" },
            () => "rejected" as const,
          ),
          Match.exhaustive,
        ),
    ),
    Match.exhaustive,
  );
}

export function finalScenarioDisposition(
  review: ScenarioAdmissionReviews,
): "admitted" | "rejected" {
  return Match.value(review).pipe(
    Match.when({ reviewScope: "rawContentPolicy" }, (scopedReview) =>
      Match.value(scopedReview.policyReview).pipe(
        Match.when({ classification: "violation" }, () => "rejected" as const),
        Match.when({ classification: "safe" }, () =>
          contentDisposition(
            scopedReview,
            scopedReview.rawReview,
            scopedReview.admitReviewedUnsupported,
          ),
        ),
        Match.exhaustive,
      ),
    ),
    Match.when(
      { reviewScope: "rawContentSdkCapabilityPolicy" },
      (scopedReview) =>
        Match.value(scopedReview.policyReview).pipe(
          Match.when(
            { classification: "violation" },
            () => "rejected" as const,
          ),
          Match.when({ classification: "safe" }, () =>
            sdkCapabilityDisposition(scopedReview) === "rejected"
              ? "rejected"
              : contentDisposition(
                  scopedReview,
                  scopedReview.rawReview,
                  scopedReview.admitReviewedUnsupported,
                ),
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
  sdkCapabilityIntent: SdkCapabilityIntentSchema,
  minimumIterations: PositiveIntegerSchema,
  maximumIterations: PositiveIntegerSchema,
  candidatesPerIteration: PositiveIntegerSchema.pipe(Schema.greaterThan(1)),
  reviewMilestones: Schema.Array(PositiveIntegerSchema).pipe(
    Schema.minItems(1),
  ),
  admitReviewedUnsupported: Schema.Boolean,
}).pipe(
  Schema.filter(
    (config) =>
      config.minimumIterations <= config.maximumIterations &&
      config.reviewMilestones.every(
        (milestone) => milestone < config.maximumIterations,
      ) &&
      new Set(config.reviewMilestones).size === config.reviewMilestones.length,
    {
      message: () =>
        "campaign bounds require minimum <= maximum and unique review milestones below maximum",
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
export type ScenarioSdkCapabilityReview = Schema.Schema.Type<
  typeof ScenarioSdkCapabilityReviewSchema
>;

export type ScenarioGenerationInput = {
  readonly iteration: number;
  readonly distributionPreference: string;
  readonly contentAvailabilityIntent: ScenarioCampaignConfig["contentAvailabilityIntent"];
  readonly sdkCapabilityIntent: ScenarioCampaignConfig["sdkCapabilityIntent"];
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
    readonly sdkCapabilityIntent: ScenarioCampaignConfig["sdkCapabilityIntent"];
  }) => Promise<ScenarioReadiness>;
  readonly reviewScenario: (input: {
    readonly scenario: string;
    readonly finalReview: boolean;
    readonly contentAvailabilityIntent: ScenarioCampaignConfig["contentAvailabilityIntent"];
    readonly sdkCapabilityIntent: ScenarioCampaignConfig["sdkCapabilityIntent"];
  }) => Promise<ScenarioCompositeReview>;
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
  readonly reviewScope: "rawContentSdkCapabilityPolicy";
};

export type ScenarioCampaignResult = ScenarioCampaignResultBase &
  ScenarioContentAdmission &
  ScenarioSdkCapabilityAdmission;

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
  const lastReviewMilestone = Math.max(...config.reviewMilestones);
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
      sdkCapabilityIntent: config.sdkCapabilityIntent,
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

    if (config.reviewMilestones.includes(iteration)) {
      const review = await agents.reviewScenario({
        scenario: prose,
        finalReview: false,
        contentAvailabilityIntent: config.contentAvailabilityIntent,
        sdkCapabilityIntent: config.sdkCapabilityIntent,
      });
      if (review.raw.classification !== "supported") {
        critiques.push(review.raw.critique);
      }
      const contentAdmission = decodeScenarioContentAdmission({
        contentAvailabilityIntent: config.contentAvailabilityIntent,
        contentReview: review.contentAvailability,
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
      const sdkCapabilityAdmission = decodeScenarioSdkCapabilityAdmission({
        sdkCapabilityIntent: config.sdkCapabilityIntent,
        sdkCapabilityReview: review.sdkCapability,
      });
      if (Either.isLeft(sdkCapabilityAdmission)) {
        return Either.left(sdkCapabilityAdmission.left);
      }
      Match.value(sdkCapabilityAdmission.right.sdkCapabilityReview).pipe(
        Match.when({ classification: "unsupported" }, ({ critique }) =>
          critiques.push(critique),
        ),
        Match.when(
          { classification: "missingUnsupportedProbe" },
          ({ critique }) => critiques.push(critique),
        ),
        Match.when({ classification: "supported" }, () => undefined),
        Match.when(
          { classification: "explicitUnsupportedProbe" },
          () => undefined,
        ),
        Match.exhaustive,
      );
    }
    draft = { tag: "selected", prose, iteration, critiques };
    if (iteration === config.maximumIterations) {
      break;
    }
    if (
      iteration >= config.minimumIterations &&
      iteration >= lastReviewMilestone &&
      critiques.length === 0
    ) {
      const readiness = await agents.reviewReadiness({
        scenario: prose,
        distributionPreference: config.distributionPreference,
        contentAvailabilityIntent: config.contentAvailabilityIntent,
        sdkCapabilityIntent: config.sdkCapabilityIntent,
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
  const finalReview = await agents.reviewScenario({
    scenario: draft.prose,
    finalReview: true,
    contentAvailabilityIntent: config.contentAvailabilityIntent,
    sdkCapabilityIntent: config.sdkCapabilityIntent,
  });
  const finalContentAdmission = decodeScenarioContentAdmission({
    contentAvailabilityIntent: config.contentAvailabilityIntent,
    contentReview: finalReview.contentAvailability,
  });
  if (Either.isLeft(finalContentAdmission)) {
    return Either.left(finalContentAdmission.left);
  }
  const finalSdkCapabilityAdmission = decodeScenarioSdkCapabilityAdmission({
    sdkCapabilityIntent: config.sdkCapabilityIntent,
    sdkCapabilityReview: finalReview.sdkCapability,
  });
  if (Either.isLeft(finalSdkCapabilityAdmission)) {
    return Either.left(finalSdkCapabilityAdmission.left);
  }
  const resultBase = {
    scenarioId: config.scenarioId,
    scenario: draft.prose,
    iterations: draft.iteration,
    stopReason:
      draft.iteration === config.maximumIterations ? "maximum" : "ready",
    admitReviewedUnsupported: config.admitReviewedUnsupported,
    rawReview: finalReview.raw,
    policyReview: finalReview.artifactPolicy,
    reviewScope: "rawContentSdkCapabilityPolicy",
    ...finalContentAdmission.right,
    ...finalSdkCapabilityAdmission.right,
  } as const;
  return Either.right(resultBase);
}
