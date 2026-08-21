import { createHash, randomUUID } from "node:crypto";
import { Either, JSONSchema, Match, Schema } from "effect";

import {
  GitShaSchema,
  ScenarioIdSchema,
  type ScenarioId,
} from "./transcript.ts";
import {
  decodeScenarioCandidateId,
  EvidenceSetIdSchema,
  ScenarioCampaignIdSchema,
  ScenarioCandidateIdSchema,
  PlannedScenarioIdSchema,
  type ScenarioCampaignId,
  type ScenarioCandidateId,
  type PlannedScenarioId,
} from "./raw-swarm-identities.ts";
import {
  planScenarioStages,
  ScenarioStageFactsSchema,
  type ScenarioStagePlan,
  type ScenarioStageFacts,
} from "./scenario-stage-plan.ts";
import {
  aggregateScenarioCatalogueComparisons,
  catalogueComparisonCritique,
  ScenarioCatalogueComparisonSchema,
  validateScenarioCatalogueComparison,
  type ScenarioCatalogueBatchExpectation,
  type ScenarioCatalogueComparison,
  type ScenarioCatalogueProjection,
} from "./scenario-authoring.ts";

const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.positive(),
);

export function codexOutputJsonSchema<A, I>(schema: Schema.Schema<A, I>) {
  return JSONSchema.make(Schema.Struct({ result: schema }));
}

/** Hash the exact retained scenario bytes, including the canonical newline. */
export function scenarioContentSha256(scenario: string): string {
  return createHash("sha256").update(`${scenario.trim()}\n`).digest("hex");
}

export const ScenarioCandidateSchema = Schema.Struct({
  prose: Schema.NonEmptyTrimmedString,
  stageFacts: ScenarioStageFactsSchema,
});

export const ScenarioCandidateBatchSchema = Schema.Struct({
  candidates: Schema.Array(ScenarioCandidateSchema).pipe(
    Schema.minItems(2),
    Schema.filter(
      (candidates) =>
        new Set(candidates.map(({ prose }) => prose)).size ===
        candidates.length,
      { message: () => "scenario candidates must be distinct" },
    ),
  ),
});

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

export const ScenarioContentAdmissionSchema = Schema.Union(
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

export const ScenarioSdkCapabilityAdmissionSchema = Schema.Union(
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

/**
 * Scenario-quality responsibility retained from the former readiness pass.
 * It is a named composite-review field so consolidating invocations does not
 * discard meaningfulness, objective pursuit, or distribution-fit checks.
 */
const ReadyScenarioQualityReviewSchema = Schema.Struct({
  classification: Schema.Literal("ready"),
  evidence: Schema.NonEmptyTrimmedString,
});
const NeedsRevisionScenarioQualityReviewSchema = Schema.Struct({
  classification: Schema.Literal("needsRevision"),
  evidence: Schema.NonEmptyTrimmedString,
  critique: Schema.NonEmptyTrimmedString,
});
export const ScenarioQualityReviewSchema = Schema.Union(
  ReadyScenarioQualityReviewSchema,
  NeedsRevisionScenarioQualityReviewSchema,
);

export const HistoricalScenarioCompositeReviewSchema = Schema.Struct({
  raw: ScenarioRawReviewSchema,
  contentAvailability: ScenarioContentReviewSchema,
  sdkCapability: ScenarioSdkCapabilityReviewSchema,
  artifactPolicy: ScenarioPolicyReviewSchema,
});
export const CurrentScenarioCompositeReviewSchema = Schema.Struct({
  raw: ScenarioRawReviewSchema,
  contentAvailability: ScenarioContentReviewSchema,
  sdkCapability: ScenarioSdkCapabilityReviewSchema,
  artifactPolicy: ScenarioPolicyReviewSchema,
  scenarioQuality: ScenarioQualityReviewSchema,
});
export const ScenarioCompositeReviewSchema = Schema.Union(
  HistoricalScenarioCompositeReviewSchema,
  CurrentScenarioCompositeReviewSchema,
);
export type ScenarioCompositeReview = Schema.Schema.Type<
  typeof ScenarioCompositeReviewSchema
>;
export type CurrentScenarioCompositeReview = Schema.Schema.Type<
  typeof CurrentScenarioCompositeReviewSchema
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

const CurrentFinalScenarioReviewSchema = Schema.Struct({
  ...FinalScenarioReviewBaseSchema.fields,
  reviewScope: Schema.Literal("rawContentSdkCapabilityPolicyQuality"),
  scenarioQuality: ScenarioQualityReviewSchema,
  catalogueComparison: ScenarioCatalogueComparisonSchema,
}).pipe(
  Schema.extend(ScenarioContentAdmissionSchema),
  Schema.extend(ScenarioSdkCapabilityAdmissionSchema),
);

/** Historical current-scope reviews predate catalogue comparison evidence. */
const HistoricalCurrentFinalScenarioReviewSchema = Schema.Struct({
  ...FinalScenarioReviewBaseSchema.fields,
  reviewScope: Schema.Literal("rawContentSdkCapabilityPolicyQuality"),
  scenarioQuality: ScenarioQualityReviewSchema,
}).pipe(
  Schema.extend(ScenarioContentAdmissionSchema),
  Schema.extend(ScenarioSdkCapabilityAdmissionSchema),
);

const CurrentRejectedScenarioCandidateReviewSchema = Schema.Struct({
  campaignId: ScenarioCampaignIdSchema,
  candidateId: ScenarioCandidateIdSchema,
  candidateScenarioSha256: ScenarioSha256Schema,
  gitSha: GitShaSchema,
  admitReviewedUnsupported: Schema.Boolean,
  rawReview: ScenarioRawReviewSchema,
  policyReview: ScenarioPolicyReviewSchema,
  reviewScope: Schema.Literal("rawContentSdkCapabilityPolicyQuality"),
  scenarioQuality: ScenarioQualityReviewSchema,
  catalogueComparison: ScenarioCatalogueComparisonSchema,
}).pipe(
  Schema.extend(ScenarioContentAdmissionSchema),
  Schema.extend(ScenarioSdkCapabilityAdmissionSchema),
);

const HistoricalRejectedScenarioCandidateReviewSchema = Schema.Struct({
  campaignId: ScenarioCampaignIdSchema,
  candidateId: ScenarioCandidateIdSchema,
  candidateScenarioSha256: ScenarioSha256Schema,
  gitSha: GitShaSchema,
  admitReviewedUnsupported: Schema.Boolean,
  rawReview: ScenarioRawReviewSchema,
  policyReview: ScenarioPolicyReviewSchema,
  reviewScope: Schema.Literal("rawContentSdkCapabilityPolicyQuality"),
  scenarioQuality: ScenarioQualityReviewSchema,
}).pipe(
  Schema.extend(ScenarioContentAdmissionSchema),
  Schema.extend(ScenarioSdkCapabilityAdmissionSchema),
);

export const RejectedScenarioCandidateReviewSchema = Schema.Union(
  CurrentRejectedScenarioCandidateReviewSchema,
  HistoricalRejectedScenarioCandidateReviewSchema,
);

export const FinalScenarioReviewSchema = Schema.Union(
  RawContentPolicyScenarioReviewSchema,
  RawContentSdkCapabilityPolicyScenarioReviewSchema,
  CurrentFinalScenarioReviewSchema,
  HistoricalCurrentFinalScenarioReviewSchema,
);

export type ScenarioContentAdmission = Schema.Schema.Type<
  typeof ScenarioContentAdmissionSchema
>;
export type ScenarioSdkCapabilityAdmission = Schema.Schema.Type<
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

function catalogueComparisonDisposition(
  comparison:
    | ScenarioCatalogueComparison
    | { readonly tag: "notConfigured" }
    | undefined,
): "admitted" | "rejected" {
  if (comparison === undefined || !("conclusion" in comparison)) {
    return "admitted";
  }
  const validated = validateScenarioCatalogueComparison({
    comparison,
    expectedScenarioIds: comparison.comparedScenarioIds,
  });
  return Either.isRight(validated) && validated.right.conclusion !== "redundant"
    ? "admitted"
    : "rejected";
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
  review:
    | ScenarioAdmissionReviews
    | ScenarioCampaignResult
    | ScenarioCampaignCandidateRejection,
): "admitted" | "rejected" {
  if (isCandidateCampaignRejection(review)) {
    return "rejected";
  }
  if (
    "scenarioQuality" in review &&
    review.scenarioQuality.classification === "needsRevision"
  ) {
    return "rejected";
  }
  if (
    "catalogueComparison" in review &&
    ("conclusion" in review.catalogueComparison
      ? catalogueComparisonDisposition(review.catalogueComparison) ===
        "rejected"
      : review.catalogueComparison.tag === "retained" &&
        catalogueComparisonDisposition(
          review.catalogueComparison.comparison,
        ) === "rejected")
  ) {
    return "rejected";
  }
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
    Match.when(
      { reviewScope: "rawContentSdkCapabilityPolicyQuality" },
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
    readonly catalogue: ScenarioCatalogueAdmissionContext;
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
  if (
    expected.catalogue.tag === "admittedScenarios" &&
    (expected.catalogue.scenarioIds.length === 0 ||
      expected.catalogue.batches.length === 0)
  ) {
    return Either.left(
      "A nonempty admitted catalogue must retain canonical Scenario ids and batches.",
    );
  }
  if ("catalogueComparison" in decoded.right) {
    const expectedScenarioIds =
      expected.catalogue.tag === "noAdmittedScenarios"
        ? []
        : expected.catalogue.scenarioIds;
    const comparison = validateScenarioCatalogueComparison({
      comparison: decoded.right.catalogueComparison,
      expectedScenarioIds,
      ...(expected.catalogue.tag === "noAdmittedScenarios"
        ? {}
        : { expectedBatches: expected.catalogue.batches }),
    });
    if (Either.isLeft(comparison)) {
      return Either.left(`Invalid catalogue comparison: ${comparison.left}`);
    }
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
  campaignId: ScenarioCampaignIdSchema,
  plannedScenarioId: PlannedScenarioIdSchema,
  scenarioTitle: Schema.NonEmptyTrimmedString,
  scenarioPurpose: Schema.NonEmptyTrimmedString,
  evidenceSetId: EvidenceSetIdSchema,
  distributionPreference: Schema.NonEmptyTrimmedString,
  contentAvailabilityIntent: ContentAvailabilityIntentSchema,
  sdkCapabilityIntent: SdkCapabilityIntentSchema,
  minimumIterations: PositiveIntegerSchema,
  maximumIterations: PositiveIntegerSchema,
  candidatesPerIteration: PositiveIntegerSchema.pipe(Schema.greaterThan(1)),
  reviewMilestone: PositiveIntegerSchema,
  admitReviewedUnsupported: Schema.Boolean,
}).pipe(
  Schema.filter(
    (config) =>
      config.minimumIterations <= config.maximumIterations &&
      config.reviewMilestone < config.maximumIterations,
    {
      message: () =>
        "campaign bounds require minimum <= maximum and one review milestone below maximum",
    },
  ),
);

export type ScenarioCampaignConfig = Schema.Schema.Type<
  typeof ScenarioCampaignConfigSchema
>;
export type ScenarioCandidateBatch = Schema.Schema.Type<
  typeof ScenarioCandidateBatchSchema
>;
export type ScenarioRawReview = Schema.Schema.Type<
  typeof ScenarioRawReviewSchema
>;
export type ScenarioPolicyReview = Schema.Schema.Type<
  typeof ScenarioPolicyReviewSchema
>;
export type ScenarioQualityReview = Schema.Schema.Type<
  typeof ScenarioQualityReviewSchema
>;
export type ScenarioContentReview = Schema.Schema.Type<
  typeof ScenarioContentReviewSchema
>;
export type ScenarioSdkCapabilityReview = Schema.Schema.Type<
  typeof ScenarioSdkCapabilityReviewSchema
>;
export type { ScenarioStageFacts };

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

export type ScenarioCatalogueComparisonContext =
  | Readonly<{ readonly tag: "notConfigured" }>
  | Readonly<{
      readonly tag: "required";
      readonly batches: readonly (readonly ScenarioCatalogueProjection[])[];
      readonly expectedScenarioIds: readonly ScenarioId[];
    }>;

export type ScenarioCatalogueAdmissionContext =
  | Readonly<{ readonly tag: "noAdmittedScenarios" }>
  | Readonly<{
      readonly tag: "admittedScenarios";
      readonly scenarioIds: readonly [ScenarioId, ...ScenarioId[]];
      readonly batches: readonly [
        ScenarioCatalogueBatchExpectation,
        ...ScenarioCatalogueBatchExpectation[],
      ];
    }>;

export type ScenarioCatalogueComparisonEvidence =
  | Readonly<{ readonly tag: "notConfigured" }>
  | Readonly<{
      readonly tag: "retained";
      readonly comparison: ScenarioCatalogueComparison;
    }>;

export interface ScenarioCampaignAgents {
  readonly generate: (
    input: ScenarioGenerationInput,
  ) => Promise<ScenarioCandidateBatch>;
  readonly reviewScenario: (input: {
    readonly scenario: string;
    readonly campaignId: ScenarioCampaignId;
    readonly candidateId: ScenarioCandidateId;
    readonly candidateScenarioSha256: string;
    readonly plannedScenarioId: PlannedScenarioId;
    readonly finalReview: boolean;
    readonly distributionPreference: string;
    readonly contentAvailabilityIntent: ScenarioCampaignConfig["contentAvailabilityIntent"];
    readonly sdkCapabilityIntent: ScenarioCampaignConfig["sdkCapabilityIntent"];
    readonly catalogueComparison: ScenarioCatalogueComparisonEvidence;
  }) => Promise<CurrentScenarioCompositeReview>;
  readonly compareCandidate?: (input: {
    readonly scenario: string;
    readonly candidateIndex: number;
    readonly candidateId: ScenarioCandidateId;
    readonly candidateScenarioSha256: string;
    readonly batchIndex: number;
    readonly batch: readonly ScenarioCatalogueProjection[];
  }) => Promise<ScenarioCatalogueComparison>;
}

export interface ScenarioCandidateSelector {
  readonly select: (candidateCount: number) => number;
}

type ScenarioCampaignResultBase = {
  readonly campaignId: ScenarioCampaignConfig["campaignId"];
  readonly candidateId: ScenarioCandidateId;
  readonly plannedScenarioId: ScenarioCampaignConfig["plannedScenarioId"];
  readonly scenarioTitle: string;
  readonly scenarioPurpose: string;
  readonly scenario: string;
  readonly iterations: number;
  readonly stopReason: "ready" | "maximum";
  readonly admitReviewedUnsupported: boolean;
  readonly rawReview: ScenarioRawReview;
  readonly policyReview: ScenarioPolicyReview;
  readonly scenarioQuality: ScenarioQualityReview;
  readonly reviewScope: "rawContentSdkCapabilityPolicyQuality";
  readonly stageFacts: ScenarioStageFacts;
  readonly candidateStagePlan: ScenarioStagePlan;
  readonly catalogueComparison: ScenarioCatalogueComparisonEvidence;
};

export type ScenarioCampaignCandidateRejection = {
  readonly tag: "candidateRejected";
  readonly campaignId: ScenarioCampaignConfig["campaignId"];
  readonly candidateId: ScenarioCandidateId;
  readonly scenario: string;
  readonly iterations: number;
  readonly stopReason: "candidateRejected";
  readonly stageFacts: ScenarioStageFacts;
  readonly candidateStagePlan: ScenarioStagePlan;
  readonly catalogueComparison: ScenarioCatalogueComparisonEvidence;
};

export type ScenarioCampaignResult =
  | (ScenarioCampaignResultBase &
      ScenarioContentAdmission &
      ScenarioSdkCapabilityAdmission)
  | ScenarioCampaignCandidateRejection;

function selectedCandidateId(): Either.Either<ScenarioCandidateId, string> {
  return decodeScenarioCandidateId(`candidate-${randomUUID()}`);
}

function isCandidateCampaignRejection(
  value: ScenarioAdmissionReviews | ScenarioCampaignResult,
): value is ScenarioCampaignCandidateRejection {
  return "tag" in value && value.tag === "candidateRejected";
}

export async function runScenarioCampaign(
  configInput: unknown,
  agents: ScenarioCampaignAgents,
  selector: ScenarioCandidateSelector,
  comparisonContext: ScenarioCatalogueComparisonContext = {
    tag: "notConfigured",
  },
): Promise<Either.Either<ScenarioCampaignResult, string>> {
  const decoded = Schema.decodeUnknownEither(ScenarioCampaignConfigSchema, {
    onExcessProperty: "error",
  })(configInput);
  if (Either.isLeft(decoded)) {
    return Either.left(`Invalid scenario campaign: ${decoded.left.message}`);
  }
  const config = decoded.right;
  if (comparisonContext.tag === "required") {
    const batchScenarioIds = comparisonContext.batches.flatMap((batch) =>
      batch.map(({ scenarioId }) => scenarioId),
    );
    const expectedScenarioIds = new Set(comparisonContext.expectedScenarioIds);
    if (
      (comparisonContext.expectedScenarioIds.length === 0 &&
        comparisonContext.batches.length !== 0) ||
      (comparisonContext.expectedScenarioIds.length > 0 &&
        comparisonContext.batches.length === 0) ||
      batchScenarioIds.length !==
        comparisonContext.expectedScenarioIds.length ||
      new Set(batchScenarioIds).size !== batchScenarioIds.length ||
      batchScenarioIds.some(
        (scenarioId) => !expectedScenarioIds.has(scenarioId),
      )
    ) {
      return Either.left(
        "Scenario Campaign requires complete, non-duplicated catalogue batches.",
      );
    }
  }
  const lastReviewMilestone = config.reviewMilestone;
  let draft:
    | { readonly tag: "unstarted" }
    | {
        readonly tag: "selected";
        readonly prose: string;
        readonly candidateId: ScenarioCandidateId;
        readonly iteration: number;
        readonly critiques: readonly string[];
        readonly stageFacts: ScenarioStageFacts;
        readonly candidateStagePlan: ScenarioStagePlan;
        readonly catalogueComparison: ScenarioCatalogueComparisonEvidence;
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
    const candidateIds: ScenarioCandidateId[] = [];
    for (
      let candidateIndex = 0;
      candidateIndex < candidates.right.candidates.length;
      candidateIndex += 1
    ) {
      const candidateId = selectedCandidateId();
      if (Either.isLeft(candidateId)) return Either.left(candidateId.left);
      candidateIds.push(candidateId.right);
    }
    const candidateComparisons: ScenarioCatalogueComparison[] = [];
    if (comparisonContext.tag === "required") {
      if (
        comparisonContext.batches.length > 0 &&
        agents.compareCandidate === undefined
      ) {
        return Either.left(
          "Scenario Campaign requires a catalogue comparison agent.",
        );
      }
      const compareCandidate = agents.compareCandidate;
      for (const [
        candidateIndex,
        candidate,
      ] of candidates.right.candidates.entries()) {
        const batchComparisons: ScenarioCatalogueComparison[] = [];
        const candidateId = candidateIds[candidateIndex];
        if (candidateId === undefined) {
          return Either.left("Scenario Campaign lost a Candidate identity.");
        }
        const candidateScenarioSha256 = scenarioContentSha256(candidate.prose);
        for (const [batchIndex, batch] of comparisonContext.batches.entries()) {
          if (compareCandidate === undefined) {
            return Either.left(
              "Scenario Campaign lost its catalogue comparison agent.",
            );
          }
          const comparison = await compareCandidate({
            scenario: candidate.prose,
            candidateIndex,
            candidateId,
            candidateScenarioSha256,
            batchIndex,
            batch,
          });
          batchComparisons.push(comparison);
        }
        const aggregate = aggregateScenarioCatalogueComparisons({
          comparisons: batchComparisons,
          expectedScenarioIds: comparisonContext.expectedScenarioIds,
          expectedBatches: comparisonContext.batches.map(
            (batch, batchIndex) => ({
              batchIndex,
              scenarioIds: batch.map(({ scenarioId }) => scenarioId),
            }),
          ),
        });
        if (Either.isLeft(aggregate)) return Either.left(aggregate.left);
        candidateComparisons.push(aggregate.right);
      }
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
    const candidate = candidates.right.candidates[selected];
    if (candidate === undefined) {
      return Either.left("Scenario selector did not select a candidate.");
    }
    const selectedComparison = candidateComparisons[selected];
    if (
      comparisonContext.tag === "required" &&
      selectedComparison === undefined
    ) {
      return Either.left(
        "Scenario Campaign lost the selected Candidate's catalogue comparison.",
      );
    }
    const selectedCatalogueComparison: ScenarioCatalogueComparisonEvidence =
      comparisonContext.tag === "required" && selectedComparison !== undefined
        ? { tag: "retained", comparison: selectedComparison }
        : { tag: "notConfigured" };
    const candidateId = candidateIds[selected];
    if (candidateId === undefined) {
      return Either.left(
        "Scenario Campaign lost the selected Candidate identity.",
      );
    }
    const candidateScenarioSha256 = scenarioContentSha256(candidate.prose);
    const candidatePlan = planScenarioStages({
      identity: {
        tag: "candidate",
        campaignId: config.campaignId,
        candidateId,
        candidateScenarioSha256,
      },
      facts: candidate.stageFacts,
    });
    if (Either.isLeft(candidatePlan)) return Either.left(candidatePlan.left);
    if (candidatePlan.right.outcome.tag === "rejected") {
      const catalogueCritiques =
        selectedCatalogueComparison.tag === "retained" &&
        selectedCatalogueComparison.comparison.conclusion === "redundant"
          ? [
              catalogueComparisonCritique(
                selectedCatalogueComparison.comparison,
              ),
            ]
          : [];
      const rejected = {
        tag: "selected" as const,
        prose: candidate.prose,
        candidateId,
        iteration,
        critiques: [candidatePlan.right.outcome.reason, ...catalogueCritiques],
        stageFacts: candidate.stageFacts,
        candidateStagePlan: candidatePlan.right,
        catalogueComparison: selectedCatalogueComparison,
      };
      if (iteration === config.maximumIterations) {
        return Either.right({
          tag: "candidateRejected",
          campaignId: config.campaignId,
          candidateId,
          scenario: rejected.prose,
          iterations: iteration,
          stopReason: "candidateRejected",
          stageFacts: rejected.stageFacts,
          candidateStagePlan: candidatePlan.right,
          catalogueComparison: selectedCatalogueComparison,
        });
      }
      draft = rejected;
      continue;
    }
    const prose = candidate.prose;
    const critiques: string[] = [];

    if (config.reviewMilestone === iteration) {
      const review = await agents.reviewScenario({
        scenario: prose,
        campaignId: config.campaignId,
        candidateId,
        candidateScenarioSha256,
        plannedScenarioId: config.plannedScenarioId,
        finalReview: false,
        distributionPreference: config.distributionPreference,
        contentAvailabilityIntent: config.contentAvailabilityIntent,
        sdkCapabilityIntent: config.sdkCapabilityIntent,
        catalogueComparison: selectedCatalogueComparison,
      });
      if (review.raw.classification !== "supported") {
        critiques.push(review.raw.critique);
      }
      if (review.scenarioQuality.classification !== "ready") {
        critiques.push(review.scenarioQuality.critique);
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
    if (
      selectedCatalogueComparison.tag === "retained" &&
      selectedCatalogueComparison.comparison.conclusion === "redundant"
    ) {
      critiques.push(
        catalogueComparisonCritique(selectedCatalogueComparison.comparison),
      );
    }
    draft = {
      tag: "selected",
      prose,
      candidateId,
      iteration,
      critiques,
      stageFacts: candidate.stageFacts,
      candidateStagePlan: candidatePlan.right,
      catalogueComparison: selectedCatalogueComparison,
    };
    if (iteration === config.maximumIterations) {
      break;
    }
    if (
      iteration >= config.minimumIterations &&
      iteration >= lastReviewMilestone &&
      critiques.length === 0
    ) {
      break;
    }
  }

  if (draft.tag === "unstarted") {
    return Either.left("Scenario campaign produced no scenario.");
  }
  const finalReview = await agents.reviewScenario({
    scenario: draft.prose,
    campaignId: config.campaignId,
    candidateId: draft.candidateId,
    candidateScenarioSha256: scenarioContentSha256(draft.prose),
    plannedScenarioId: config.plannedScenarioId,
    finalReview: true,
    distributionPreference: config.distributionPreference,
    contentAvailabilityIntent: config.contentAvailabilityIntent,
    sdkCapabilityIntent: config.sdkCapabilityIntent,
    catalogueComparison: draft.catalogueComparison,
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
    campaignId: config.campaignId,
    candidateId: draft.candidateId,
    plannedScenarioId: config.plannedScenarioId,
    scenarioTitle: config.scenarioTitle,
    scenarioPurpose: config.scenarioPurpose,
    scenario: draft.prose,
    iterations: draft.iteration,
    stopReason:
      draft.iteration === config.maximumIterations ? "maximum" : "ready",
    admitReviewedUnsupported: config.admitReviewedUnsupported,
    rawReview: finalReview.raw,
    policyReview: finalReview.artifactPolicy,
    scenarioQuality: finalReview.scenarioQuality,
    reviewScope: "rawContentSdkCapabilityPolicyQuality",
    stageFacts: draft.stageFacts,
    candidateStagePlan: draft.candidateStagePlan,
    catalogueComparison: draft.catalogueComparison,
    ...finalContentAdmission.right,
    ...finalSdkCapabilityAdmission.right,
  } as const;
  return Either.right(resultBase);
}
