import { createHash, randomUUID } from "node:crypto";
import {
  Array as EffectArray,
  JsonSchema,
  Match,
  Result,
  Schema,
  Tuple,
} from "effect";

import type { ArtifactSha256 } from "./artifact-authority-schema.ts";

import {
  GitShaSchema,
  ScenarioIdSchema,
  canonicalJson,
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
  Schema.check(Schema.isInt()),
  Schema.check(Schema.isGreaterThan(0)),
);

export function codexOutputJsonSchema<A, I>(schema: Schema.Codec<A, I>) {
  const document = JsonSchema.toDocumentDraft07(
    Schema.toJsonSchemaDocument(Schema.Struct({ result: schema })),
  );
  return {
    $schema: JsonSchema.META_SCHEMA_URI_DRAFT_07,
    ...document.schema,
    ...(Object.keys(document.definitions).length === 0
      ? {}
      : { definitions: document.definitions }),
  };
}

/** Hash the exact retained scenario bytes, including the canonical newline. */
export function scenarioContentSha256(scenario: string): string {
  return createHash("sha256").update(`${scenario.trim()}\n`).digest("hex");
}

export const ScenarioCandidateSchema = Schema.Struct({
  prose: Schema.Trimmed.check(Schema.isNonEmpty()),
  stageFacts: ScenarioStageFactsSchema,
});

export const ScenarioCandidateBatchSchema = Schema.Struct({
  candidates: Schema.Array(ScenarioCandidateSchema).pipe(
    Schema.check(Schema.isMinLength(2)),
    Schema.check(
      Schema.makeFilter(
        (candidates) =>
          new Set(candidates.map(({ prose }) => prose)).size ===
          candidates.length,
        { message: "scenario candidates must be distinct" },
      ),
    ),
  ),
});

const SupportedScenarioRawReviewSchema = Schema.Struct({
  classification: Schema.Literal("supported"),
  evidence: Schema.Trimmed.check(Schema.isNonEmpty()),
});
const UnsupportedScenarioRawReviewSchema = Schema.Struct({
  classification: Schema.Literal("unsupported"),
  evidence: Schema.Trimmed.check(Schema.isNonEmpty()),
  critique: Schema.Trimmed.check(Schema.isNonEmpty()),
});
const ContradictoryScenarioRawReviewSchema = Schema.Struct({
  classification: Schema.Literal("contradictory"),
  evidence: Schema.Trimmed.check(Schema.isNonEmpty()),
  critique: Schema.Trimmed.check(Schema.isNonEmpty()),
});
export const ScenarioRawReviewSchema = Schema.Union([
  SupportedScenarioRawReviewSchema,
  UnsupportedScenarioRawReviewSchema,
  ContradictoryScenarioRawReviewSchema,
]);

const SuppliedScenarioContentReviewSchema = Schema.Struct({
  classification: Schema.Literal("supplied"),
  evidence: Schema.Trimmed.check(Schema.isNonEmpty()),
});
const ExplicitUnavailableProbeReviewSchema = Schema.Struct({
  classification: Schema.Literal("explicitUnavailableProbe"),
  evidence: Schema.Trimmed.check(Schema.isNonEmpty()),
});
const MissingUnavailableProbeReviewSchema = Schema.Struct({
  classification: Schema.Literal("missingUnavailableProbe"),
  evidence: Schema.Trimmed.check(Schema.isNonEmpty()),
  critique: Schema.Trimmed.check(Schema.isNonEmpty()),
});
const InvalidUnavailableSelectionReviewSchema = Schema.Struct({
  classification: Schema.Literal("invalidUnavailableSelection"),
  evidence: Schema.Trimmed.check(Schema.isNonEmpty()),
  critique: Schema.Trimmed.check(Schema.isNonEmpty()),
});
const AvailableOnlyScenarioContentReviewSchema = Schema.Union([
  SuppliedScenarioContentReviewSchema,
  InvalidUnavailableSelectionReviewSchema,
]);
const ProbeUnavailableContentScenarioContentReviewSchema = Schema.Union([
  ExplicitUnavailableProbeReviewSchema,
  MissingUnavailableProbeReviewSchema,
  InvalidUnavailableSelectionReviewSchema,
]);
export const ScenarioContentReviewSchema = Schema.Union([
  SuppliedScenarioContentReviewSchema,
  ExplicitUnavailableProbeReviewSchema,
  MissingUnavailableProbeReviewSchema,
  InvalidUnavailableSelectionReviewSchema,
]);

export const CONTENT_AVAILABILITY_INTENTS = [
  "availableOnly",
  "probeUnavailableContent",
] as const;
export const ContentAvailabilityIntentSchema = Schema.Literals(
  CONTENT_AVAILABILITY_INTENTS,
);
export type ContentAvailabilityIntent =
  (typeof CONTENT_AVAILABILITY_INTENTS)[number];

const AvailableOnlyScenarioContentAdmissionSchema = Schema.Struct({
  contentAvailabilityIntent: Schema.Literal("availableOnly"),
  contentReview: AvailableOnlyScenarioContentReviewSchema,
});
const ProbeUnavailableContentScenarioContentAdmissionSchema = Schema.Struct({
  contentAvailabilityIntent: Schema.Literal("probeUnavailableContent"),
  contentReview: ProbeUnavailableContentScenarioContentReviewSchema,
});
export const ScenarioContentAdmissionSchema = Schema.Union([
  AvailableOnlyScenarioContentAdmissionSchema,
  ProbeUnavailableContentScenarioContentAdmissionSchema,
]);

export const SDK_CAPABILITY_INTENTS = [
  "supportedOnly",
  "probeUnsupportedCapability",
] as const;
export const SdkCapabilityIntentSchema = Schema.Literals(
  SDK_CAPABILITY_INTENTS,
);
export type SdkCapabilityIntent = (typeof SDK_CAPABILITY_INTENTS)[number];

const SupportedScenarioSdkCapabilityReviewSchema = Schema.Struct({
  classification: Schema.Literal("supported"),
  evidence: Schema.Trimmed.check(Schema.isNonEmpty()),
});
const UnsupportedScenarioSdkCapabilityReviewSchema = Schema.Struct({
  classification: Schema.Literal("unsupported"),
  evidence: Schema.Trimmed.check(Schema.isNonEmpty()),
  critique: Schema.Trimmed.check(Schema.isNonEmpty()),
});
const ExplicitUnsupportedSdkCapabilityProbeReviewSchema = Schema.Struct({
  classification: Schema.Literal("explicitUnsupportedProbe"),
  evidence: Schema.Trimmed.check(Schema.isNonEmpty()),
});
const MissingUnsupportedSdkCapabilityProbeReviewSchema = Schema.Struct({
  classification: Schema.Literal("missingUnsupportedProbe"),
  evidence: Schema.Trimmed.check(Schema.isNonEmpty()),
  critique: Schema.Trimmed.check(Schema.isNonEmpty()),
});
const SupportedOnlyScenarioSdkCapabilityReviewSchema = Schema.Union([
  SupportedScenarioSdkCapabilityReviewSchema,
  UnsupportedScenarioSdkCapabilityReviewSchema,
]);
const ProbeUnsupportedCapabilityScenarioSdkCapabilityReviewSchema =
  Schema.Union([
    ExplicitUnsupportedSdkCapabilityProbeReviewSchema,
    MissingUnsupportedSdkCapabilityProbeReviewSchema,
  ]);
export const ScenarioSdkCapabilityReviewSchema = Schema.Union([
  SupportedScenarioSdkCapabilityReviewSchema,
  UnsupportedScenarioSdkCapabilityReviewSchema,
  ExplicitUnsupportedSdkCapabilityProbeReviewSchema,
  MissingUnsupportedSdkCapabilityProbeReviewSchema,
]);

const SupportedOnlyScenarioSdkCapabilityAdmissionSchema = Schema.Struct({
  sdkCapabilityIntent: Schema.Literal("supportedOnly"),
  sdkCapabilityReview: SupportedOnlyScenarioSdkCapabilityReviewSchema,
});
const ProbeUnsupportedCapabilityScenarioSdkCapabilityAdmissionSchema =
  Schema.Struct({
    sdkCapabilityIntent: Schema.Literal("probeUnsupportedCapability"),
    sdkCapabilityReview:
      ProbeUnsupportedCapabilityScenarioSdkCapabilityReviewSchema,
  });
export const ScenarioSdkCapabilityAdmissionSchema = Schema.Union([
  SupportedOnlyScenarioSdkCapabilityAdmissionSchema,
  ProbeUnsupportedCapabilityScenarioSdkCapabilityAdmissionSchema,
]);

const ScenarioContentSdkCapabilityAdmissionSchema = Schema.Union([
  ...EffectArray.cartesianWith(
    ScenarioContentAdmissionSchema.members,
    ScenarioSdkCapabilityAdmissionSchema.members,
    (contentAdmission, sdkCapabilityAdmission) =>
      Schema.Struct({
        ...contentAdmission.fields,
        ...sdkCapabilityAdmission.fields,
      }),
  ),
]);

const SafeScenarioPolicyReviewSchema = Schema.Struct({
  classification: Schema.Literal("safe"),
  evidence: Schema.Trimmed.check(Schema.isNonEmpty()),
});
const ViolatingScenarioPolicyReviewSchema = Schema.Struct({
  classification: Schema.Literal("violation"),
  evidence: Schema.Trimmed.check(Schema.isNonEmpty()),
  critique: Schema.Trimmed.check(Schema.isNonEmpty()),
});
export const ScenarioPolicyReviewSchema = Schema.Union([
  SafeScenarioPolicyReviewSchema,
  ViolatingScenarioPolicyReviewSchema,
]);

/**
 * Scenario-quality responsibility retained from the former readiness pass.
 * It is a named composite-review field so consolidating invocations does not
 * discard meaningfulness, objective pursuit, or distribution-fit checks.
 */
const ReadyScenarioQualityReviewSchema = Schema.Struct({
  classification: Schema.Literal("ready"),
  evidence: Schema.Trimmed.check(Schema.isNonEmpty()),
});
const NeedsRevisionScenarioQualityReviewSchema = Schema.Struct({
  classification: Schema.Literal("needsRevision"),
  evidence: Schema.Trimmed.check(Schema.isNonEmpty()),
  critique: Schema.Trimmed.check(Schema.isNonEmpty()),
});
export const ScenarioQualityReviewSchema = Schema.Union([
  ReadyScenarioQualityReviewSchema,
  NeedsRevisionScenarioQualityReviewSchema,
]);

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
export const ScenarioCompositeReviewSchema = Schema.Union([
  HistoricalScenarioCompositeReviewSchema,
  CurrentScenarioCompositeReviewSchema,
]);
export type ScenarioCompositeReview = Schema.Schema.Type<
  typeof ScenarioCompositeReviewSchema
>;
export type CurrentScenarioCompositeReview = Schema.Schema.Type<
  typeof CurrentScenarioCompositeReviewSchema
>;

type ScenarioContentReviewForIntent<Intent extends ContentAvailabilityIntent> =
  Intent extends "availableOnly"
    ? Schema.Schema.Type<typeof AvailableOnlyScenarioContentReviewSchema>
    : Schema.Schema.Type<
        typeof ProbeUnavailableContentScenarioContentReviewSchema
      >;
type ScenarioSdkCapabilityReviewForIntent<Intent extends SdkCapabilityIntent> =
  Intent extends "supportedOnly"
    ? Schema.Schema.Type<typeof SupportedOnlyScenarioSdkCapabilityReviewSchema>
    : Schema.Schema.Type<
        typeof ProbeUnsupportedCapabilityScenarioSdkCapabilityReviewSchema
      >;
export type ScenarioCompositeReviewForIntents<
  ContentIntent extends ContentAvailabilityIntent,
  SdkIntent extends SdkCapabilityIntent,
> = Omit<
  CurrentScenarioCompositeReview,
  "contentAvailability" | "sdkCapability"
> & {
  readonly contentAvailability: ScenarioContentReviewForIntent<ContentIntent>;
  readonly sdkCapability: ScenarioSdkCapabilityReviewForIntent<SdkIntent>;
};
export const ScenarioSha256Schema = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^[0-9a-f]{64}$/)),
  Schema.brand("RawSwarmScenarioSha256"),
);
export type ScenarioSha256 = Schema.Schema.Type<typeof ScenarioSha256Schema>;

export function scenarioSha256MatchesArtifact(input: {
  readonly scenarioSha256: ScenarioSha256;
  readonly artifactSha256: ArtifactSha256;
}): boolean {
  return input.scenarioSha256.localeCompare(input.artifactSha256) === 0;
}

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

const RawContentPolicyScenarioReviewSchema =
  ScenarioContentAdmissionSchema.mapMembers(
    Tuple.map(
      Schema.fieldsAssign({
        ...FinalScenarioReviewBaseSchema.fields,
        reviewScope: Schema.Literal("rawContentPolicy"),
      }),
    ),
  );

const RawContentSdkCapabilityPolicyScenarioReviewSchema =
  ScenarioContentSdkCapabilityAdmissionSchema.mapMembers(
    Tuple.map(
      Schema.fieldsAssign({
        ...FinalScenarioReviewBaseSchema.fields,
        reviewScope: Schema.Literal("rawContentSdkCapabilityPolicy"),
      }),
    ),
  );

const CurrentFinalScenarioReviewSchema =
  ScenarioContentSdkCapabilityAdmissionSchema.mapMembers(
    Tuple.map(
      Schema.fieldsAssign({
        ...FinalScenarioReviewBaseSchema.fields,
        reviewScope: Schema.Literal("rawContentSdkCapabilityPolicyQuality"),
        scenarioQuality: ScenarioQualityReviewSchema,
        catalogueComparison: ScenarioCatalogueComparisonSchema,
      }),
    ),
  );

/** Historical current-scope reviews predate catalogue comparison evidence. */
const HistoricalCurrentFinalScenarioReviewSchema =
  ScenarioContentSdkCapabilityAdmissionSchema.mapMembers(
    Tuple.map(
      Schema.fieldsAssign({
        ...FinalScenarioReviewBaseSchema.fields,
        reviewScope: Schema.Literal("rawContentSdkCapabilityPolicyQuality"),
        scenarioQuality: ScenarioQualityReviewSchema,
      }),
    ),
  );

const CurrentRejectedScenarioCandidateReviewSchema =
  ScenarioContentSdkCapabilityAdmissionSchema.mapMembers(
    Tuple.map(
      Schema.fieldsAssign({
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
      }),
    ),
  );

const HistoricalRejectedScenarioCandidateReviewSchema =
  ScenarioContentSdkCapabilityAdmissionSchema.mapMembers(
    Tuple.map(
      Schema.fieldsAssign({
        campaignId: ScenarioCampaignIdSchema,
        candidateId: ScenarioCandidateIdSchema,
        candidateScenarioSha256: ScenarioSha256Schema,
        gitSha: GitShaSchema,
        admitReviewedUnsupported: Schema.Boolean,
        rawReview: ScenarioRawReviewSchema,
        policyReview: ScenarioPolicyReviewSchema,
        reviewScope: Schema.Literal("rawContentSdkCapabilityPolicyQuality"),
        scenarioQuality: ScenarioQualityReviewSchema,
      }),
    ),
  );

export const RejectedScenarioCandidateReviewSchema = Schema.Union([
  CurrentRejectedScenarioCandidateReviewSchema,
  HistoricalRejectedScenarioCandidateReviewSchema,
]);

export const FinalScenarioReviewSchema = Schema.Union([
  RawContentPolicyScenarioReviewSchema,
  RawContentSdkCapabilityPolicyScenarioReviewSchema,
  CurrentFinalScenarioReviewSchema,
  HistoricalCurrentFinalScenarioReviewSchema,
]);

export type ScenarioContentAdmission = Schema.Schema.Type<
  typeof ScenarioContentAdmissionSchema
>;
export type ScenarioSdkCapabilityAdmission = Schema.Schema.Type<
  typeof ScenarioSdkCapabilityAdmissionSchema
>;

/**
 * Select the review output schema from the decoded campaign intents. The
 * returned schema is the model-facing boundary; its classification unions
 * contain only the outcomes that can belong to the selected intent.
 */
export function scenarioCompositeReviewSchemaForIntents<
  ContentIntent extends ContentAvailabilityIntent,
  SdkIntent extends SdkCapabilityIntent,
>(input: {
  readonly contentAvailabilityIntent: ContentIntent;
  readonly sdkCapabilityIntent: SdkIntent;
}): Schema.Codec<
  ScenarioCompositeReviewForIntents<ContentIntent, SdkIntent>,
  ScenarioCompositeReviewForIntents<ContentIntent, SdkIntent>
>;
export function scenarioCompositeReviewSchemaForIntents(input: {
  readonly contentAvailabilityIntent: ContentAvailabilityIntent;
  readonly sdkCapabilityIntent: SdkCapabilityIntent;
}): Schema.Codec<
  CurrentScenarioCompositeReview,
  CurrentScenarioCompositeReview
> {
  return Schema.Struct({
    raw: ScenarioRawReviewSchema,
    contentAvailability: Match.value(input.contentAvailabilityIntent).pipe(
      Match.when(
        "availableOnly",
        () => AvailableOnlyScenarioContentReviewSchema,
      ),
      Match.when(
        "probeUnavailableContent",
        () => ProbeUnavailableContentScenarioContentReviewSchema,
      ),
      Match.exhaustive,
    ),
    sdkCapability: Match.value(input.sdkCapabilityIntent).pipe(
      Match.when(
        "supportedOnly",
        () => SupportedOnlyScenarioSdkCapabilityReviewSchema,
      ),
      Match.when(
        "probeUnsupportedCapability",
        () => ProbeUnsupportedCapabilityScenarioSdkCapabilityReviewSchema,
      ),
      Match.exhaustive,
    ),
    artifactPolicy: ScenarioPolicyReviewSchema,
    scenarioQuality: ScenarioQualityReviewSchema,
  });
}

type ScenarioReviewResultDecoder<Result> = (
  value: unknown,
) => Result.Result<Result, Schema.SchemaError>;
type ScenarioReviewOutputDecoder<Result> = ScenarioReviewResultDecoder<{
  readonly result: Result;
}>;

function scenarioReviewResultDecoder<A, I>(
  schema: Schema.Codec<A, I>,
): ScenarioReviewResultDecoder<A> {
  const decode = Schema.decodeUnknownResult(schema, {
    onExcessProperty: "error",
  });
  return (value) => decode(value);
}

function scenarioReviewOutputDecoder<A, I>(
  schema: Schema.Codec<A, I>,
): ScenarioReviewOutputDecoder<A> {
  return scenarioReviewResultDecoder(Schema.Struct({ result: schema }));
}

type ScenarioReviewSchemaCompatibility<
  Tag extends string,
  Result,
  Encoded,
> = Readonly<{
  readonly tag: Tag;
  readonly schema: Schema.Codec<Result, Encoded>;
  readonly decodeResult: ScenarioReviewResultDecoder<Result>;
  readonly decodeOutput: ScenarioReviewOutputDecoder<Result>;
}>;

function scenarioReviewSchemaCompatibility<Tag extends string, Result, Encoded>(
  tag: Tag,
  schema: Schema.Codec<Result, Encoded>,
): ScenarioReviewSchemaCompatibility<Tag, Result, Encoded> {
  return {
    tag,
    schema,
    decodeResult: scenarioReviewResultDecoder(schema),
    decodeOutput: scenarioReviewOutputDecoder(schema),
  };
}

export type ScenarioReviewOutputSchemaCompatibility =
  | ScenarioReviewSchemaCompatibility<
      "historical",
      Schema.Schema.Type<typeof HistoricalScenarioCompositeReviewSchema>,
      Schema.Codec.Encoded<typeof HistoricalScenarioCompositeReviewSchema>
    >
  | ScenarioReviewSchemaCompatibility<
      "legacyCurrent",
      Schema.Schema.Type<typeof CurrentScenarioCompositeReviewSchema>,
      Schema.Codec.Encoded<typeof CurrentScenarioCompositeReviewSchema>
    >
  | (ScenarioReviewSchemaCompatibility<
      "intentSpecificCurrent",
      ScenarioCompositeReviewForIntents<
        ContentAvailabilityIntent,
        SdkCapabilityIntent
      >,
      ScenarioCompositeReviewForIntents<
        ContentAvailabilityIntent,
        SdkCapabilityIntent
      >
    > &
      Readonly<{
        readonly contentAvailabilityIntent: ContentAvailabilityIntent;
        readonly sdkCapabilityIntent: SdkCapabilityIntent;
      }>);

/**
 * Classify the retained model-output schema once, including its evidence
 * version policy. Current strict envelopes carry an intent-specific schema;
 * the generic current schema remains readable only as an explicit legacy
 * compatibility branch.
 */
export function classifyScenarioReviewOutputSchema(input: {
  readonly schemaVersion: 2 | 3;
  readonly outputJsonSchema: unknown;
}): Result.Result<ScenarioReviewOutputSchemaCompatibility, string> {
  const outputJson = canonicalJson(input.outputJsonSchema);
  const historicalJson = canonicalJson(
    codexOutputJsonSchema(HistoricalScenarioCompositeReviewSchema),
  );
  const currentJson = canonicalJson(
    codexOutputJsonSchema(CurrentScenarioCompositeReviewSchema),
  );
  const candidates = CONTENT_AVAILABILITY_INTENTS.flatMap(
    (contentAvailabilityIntent) =>
      SDK_CAPABILITY_INTENTS.map(
        (sdkCapabilityIntent) =>
          [contentAvailabilityIntent, sdkCapabilityIntent] as const,
      ),
  );
  const matching = candidates.find(
    ([contentAvailabilityIntent, sdkCapabilityIntent]) =>
      outputJson ===
      canonicalJson(
        codexOutputJsonSchema(
          scenarioCompositeReviewSchemaForIntents({
            contentAvailabilityIntent,
            sdkCapabilityIntent,
          }),
        ),
      ),
  );
  return Match.value(input.schemaVersion).pipe(
    Match.when(2, () => {
      if (outputJson === historicalJson) {
        return Result.succeed({
          ...scenarioReviewSchemaCompatibility(
            "historical" as const,
            HistoricalScenarioCompositeReviewSchema,
          ),
        });
      }
      return Result.fail(
        "Historical scenario review input does not use the historical composite-review schema.",
      );
    }),
    Match.when(3, () => {
      if (matching !== undefined) {
        const schema = scenarioCompositeReviewSchemaForIntents({
          contentAvailabilityIntent: matching[0],
          sdkCapabilityIntent: matching[1],
        });
        return Result.succeed({
          ...scenarioReviewSchemaCompatibility(
            "intentSpecificCurrent" as const,
            schema,
          ),
          contentAvailabilityIntent: matching[0],
          sdkCapabilityIntent: matching[1],
        });
      }
      if (outputJson === currentJson) {
        return Result.succeed({
          ...scenarioReviewSchemaCompatibility(
            "legacyCurrent" as const,
            CurrentScenarioCompositeReviewSchema,
          ),
        });
      }
      return Result.fail(
        "Current scenario review input does not use a canonical intent-specific or legacy composite-review schema.",
      );
    }),
    Match.exhaustive,
  );
}

type ScenarioAdmissionReviews = Schema.Schema.Type<
  typeof FinalScenarioReviewSchema
>;

/**
 * Defensive contract validation for custom campaign agents. The production
 * model callback already returns the intent-specific schema; this boundary
 * remains for injected agents that do not use that decoder.
 */
function validateScenarioContentAdmission(input: {
  readonly contentAvailabilityIntent: ContentAvailabilityIntent;
  readonly contentReview: ScenarioContentReview;
}): Result.Result<ScenarioContentAdmission, string> {
  return Match.value(input.contentAvailabilityIntent).pipe(
    Match.when("availableOnly", () => {
      const decoded = Schema.decodeUnknownResult(
        AvailableOnlyScenarioContentAdmissionSchema,
        { onExcessProperty: "error" },
      )(input);
      return Result.isSuccess(decoded)
        ? Result.succeed(decoded.success)
        : Result.fail(
            "Scenario content reviewer returned a result inconsistent with the campaign intent.",
          );
    }),
    Match.when("probeUnavailableContent", () => {
      const decoded = Schema.decodeUnknownResult(
        ProbeUnavailableContentScenarioContentAdmissionSchema,
        { onExcessProperty: "error" },
      )(input);
      return Result.isSuccess(decoded)
        ? Result.succeed(decoded.success)
        : Result.fail(
            "Scenario content reviewer returned a result inconsistent with the campaign intent.",
          );
    }),
    Match.exhaustive,
  );
}

/**
 * Defensive contract validation for custom campaign agents. The production
 * model callback already returns the intent-specific schema; this boundary
 * remains for injected agents that do not use that decoder.
 */
function validateScenarioSdkCapabilityAdmission(input: {
  readonly sdkCapabilityIntent: SdkCapabilityIntent;
  readonly sdkCapabilityReview: ScenarioSdkCapabilityReview;
}): Result.Result<ScenarioSdkCapabilityAdmission, string> {
  return Match.value(input.sdkCapabilityIntent).pipe(
    Match.when("supportedOnly", () => {
      const decoded = Schema.decodeUnknownResult(
        SupportedOnlyScenarioSdkCapabilityAdmissionSchema,
        { onExcessProperty: "error" },
      )(input);
      return Result.isSuccess(decoded)
        ? Result.succeed(decoded.success)
        : Result.fail(
            "Scenario SDK capability reviewer returned a result inconsistent with the campaign intent.",
          );
    }),
    Match.when("probeUnsupportedCapability", () => {
      const decoded = Schema.decodeUnknownResult(
        ProbeUnsupportedCapabilityScenarioSdkCapabilityAdmissionSchema,
        { onExcessProperty: "error" },
      )(input);
      return Result.isSuccess(decoded)
        ? Result.succeed(decoded.success)
        : Result.fail(
            "Scenario SDK capability reviewer returned a result inconsistent with the campaign intent.",
          );
    }),
    Match.exhaustive,
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
  return Result.isSuccess(validated) &&
    validated.success.conclusion !== "redundant"
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
): Result.Result<Schema.Schema.Type<typeof FinalScenarioReviewSchema>, string> {
  const decoded = Schema.decodeUnknownResult(FinalScenarioReviewSchema, {
    onExcessProperty: "error",
  })(input);
  if (Result.isFailure(decoded)) {
    return Result.fail(
      `Invalid final scenario review: ${decoded.failure.message}`,
    );
  }
  if (
    decoded.success.scenarioId !== expected.scenarioId ||
    decoded.success.gitSha !== expected.gitSha ||
    decoded.success.scenarioSha256 !==
      createHash("sha256").update(expected.scenarioBytes).digest("hex")
  ) {
    return Result.fail("Final scenario review identity does not match.");
  }
  if (
    expected.catalogue.tag === "admittedScenarios" &&
    (expected.catalogue.scenarioIds.length === 0 ||
      expected.catalogue.batches.length === 0)
  ) {
    return Result.fail(
      "A nonempty admitted catalogue must retain canonical Scenario ids and batches.",
    );
  }
  if ("catalogueComparison" in decoded.success) {
    const expectedScenarioIds =
      expected.catalogue.tag === "noAdmittedScenarios"
        ? []
        : expected.catalogue.scenarioIds;
    const comparison = validateScenarioCatalogueComparison({
      comparison: decoded.success.catalogueComparison,
      expectedScenarioIds,
      ...(expected.catalogue.tag === "noAdmittedScenarios"
        ? {}
        : { expectedBatches: expected.catalogue.batches }),
    });
    if (Result.isFailure(comparison)) {
      return Result.fail(`Invalid catalogue comparison: ${comparison.failure}`);
    }
  }
  return Result.succeed(decoded.success);
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
  scenarioTitle: Schema.Trimmed.check(Schema.isNonEmpty()),
  scenarioPurpose: Schema.Trimmed.check(Schema.isNonEmpty()),
  evidenceSetId: EvidenceSetIdSchema,
  distributionPreference: Schema.Trimmed.check(Schema.isNonEmpty()),
  contentAvailabilityIntent: ContentAvailabilityIntentSchema,
  sdkCapabilityIntent: SdkCapabilityIntentSchema,
  minimumIterations: PositiveIntegerSchema,
  maximumIterations: PositiveIntegerSchema,
  candidatesPerIteration: PositiveIntegerSchema.pipe(
    Schema.check(Schema.isGreaterThan(1)),
  ),
  reviewMilestone: PositiveIntegerSchema,
  admitReviewedUnsupported: Schema.Boolean,
}).pipe(
  Schema.check(
    Schema.makeFilter(
      (config) =>
        config.minimumIterations <= config.maximumIterations &&
        config.reviewMilestone < config.maximumIterations,
      {
        message:
          "campaign bounds require minimum <= maximum and one review milestone below maximum",
      },
    ),
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
  readonly scenarioPurpose: ScenarioCampaignConfig["scenarioPurpose"];
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

export type ScenarioReviewInput<
  ContentIntent extends ContentAvailabilityIntent = ContentAvailabilityIntent,
  SdkIntent extends SdkCapabilityIntent = SdkCapabilityIntent,
> = {
  readonly scenario: string;
  readonly scenarioPurpose: ScenarioCampaignConfig["scenarioPurpose"];
  readonly campaignId: ScenarioCampaignId;
  readonly candidateId: ScenarioCandidateId;
  readonly candidateScenarioSha256: string;
  readonly plannedScenarioId: PlannedScenarioId;
  readonly finalReview: boolean;
  readonly distributionPreference: string;
  readonly stageFacts: ScenarioStageFacts;
  readonly contentAvailabilityIntent: ContentIntent;
  readonly sdkCapabilityIntent: SdkIntent;
  readonly catalogueComparison: ScenarioCatalogueComparisonEvidence;
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
  readonly reviewScenario: <
    ContentIntent extends ContentAvailabilityIntent,
    SdkIntent extends SdkCapabilityIntent,
  >(
    input: ScenarioReviewInput<ContentIntent, SdkIntent>,
  ) => Promise<ScenarioCompositeReviewForIntents<ContentIntent, SdkIntent>>;
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

function selectedCandidateId(): Result.Result<ScenarioCandidateId, string> {
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
): Promise<Result.Result<ScenarioCampaignResult, string>> {
  const decoded = Schema.decodeUnknownResult(ScenarioCampaignConfigSchema, {
    onExcessProperty: "error",
  })(configInput);
  if (Result.isFailure(decoded)) {
    return Result.fail(`Invalid scenario campaign: ${decoded.failure.message}`);
  }
  const config = decoded.success;
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
      return Result.fail(
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
      scenarioPurpose: config.scenarioPurpose,
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
    const candidates = Schema.decodeUnknownResult(
      ScenarioCandidateBatchSchema,
      {
        onExcessProperty: "error",
      },
    )(batch);
    if (
      Result.isFailure(candidates) ||
      candidates.success.candidates.length !== config.candidatesPerIteration
    ) {
      return Result.fail(
        "Scenario generator returned an invalid candidate batch.",
      );
    }
    const candidateIds: ScenarioCandidateId[] = [];
    for (
      let candidateIndex = 0;
      candidateIndex < candidates.success.candidates.length;
      candidateIndex += 1
    ) {
      const candidateId = selectedCandidateId();
      if (Result.isFailure(candidateId))
        return Result.fail(candidateId.failure);
      candidateIds.push(candidateId.success);
    }
    const candidateComparisons: ScenarioCatalogueComparison[] = [];
    if (comparisonContext.tag === "required") {
      if (
        comparisonContext.batches.length > 0 &&
        agents.compareCandidate === undefined
      ) {
        return Result.fail(
          "Scenario Campaign requires a catalogue comparison agent.",
        );
      }
      const compareCandidate = agents.compareCandidate;
      for (const [
        candidateIndex,
        candidate,
      ] of candidates.success.candidates.entries()) {
        const batchComparisons: ScenarioCatalogueComparison[] = [];
        const candidateId = candidateIds[candidateIndex];
        if (candidateId === undefined) {
          return Result.fail("Scenario Campaign lost a Candidate identity.");
        }
        const candidateScenarioSha256 = scenarioContentSha256(candidate.prose);
        for (const [batchIndex, batch] of comparisonContext.batches.entries()) {
          if (compareCandidate === undefined) {
            return Result.fail(
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
        if (Result.isFailure(aggregate)) return Result.fail(aggregate.failure);
        candidateComparisons.push(aggregate.success);
      }
    }
    const selected = selector.select(candidates.success.candidates.length);
    if (
      !Number.isInteger(selected) ||
      selected < 0 ||
      selected >= candidates.success.candidates.length
    ) {
      return Result.fail(
        "Scenario selector returned an invalid candidate index.",
      );
    }
    const candidate = candidates.success.candidates[selected];
    if (candidate === undefined) {
      return Result.fail("Scenario selector did not select a candidate.");
    }
    const selectedComparison = candidateComparisons[selected];
    if (
      comparisonContext.tag === "required" &&
      selectedComparison === undefined
    ) {
      return Result.fail(
        "Scenario Campaign lost the selected Candidate's catalogue comparison.",
      );
    }
    const selectedCatalogueComparison: ScenarioCatalogueComparisonEvidence =
      comparisonContext.tag === "required" && selectedComparison !== undefined
        ? { tag: "retained", comparison: selectedComparison }
        : { tag: "notConfigured" };
    const candidateId = candidateIds[selected];
    if (candidateId === undefined) {
      return Result.fail(
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
    if (Result.isFailure(candidatePlan))
      return Result.fail(candidatePlan.failure);
    if (candidatePlan.success.outcome.tag === "rejected") {
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
        critiques: [
          candidatePlan.success.outcome.reason,
          ...catalogueCritiques,
        ],
        stageFacts: candidate.stageFacts,
        candidateStagePlan: candidatePlan.success,
        catalogueComparison: selectedCatalogueComparison,
      };
      if (iteration === config.maximumIterations) {
        return Result.succeed({
          tag: "candidateRejected",
          campaignId: config.campaignId,
          candidateId,
          scenario: rejected.prose,
          iterations: iteration,
          stopReason: "candidateRejected",
          stageFacts: rejected.stageFacts,
          candidateStagePlan: candidatePlan.success,
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
        scenarioPurpose: config.scenarioPurpose,
        campaignId: config.campaignId,
        candidateId,
        candidateScenarioSha256,
        plannedScenarioId: config.plannedScenarioId,
        finalReview: false,
        distributionPreference: config.distributionPreference,
        stageFacts: candidate.stageFacts,
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
      const contentAdmission = validateScenarioContentAdmission({
        contentAvailabilityIntent: config.contentAvailabilityIntent,
        contentReview: review.contentAvailability,
      });
      if (Result.isFailure(contentAdmission)) {
        return Result.fail(contentAdmission.failure);
      }
      Match.value(contentAdmission.success.contentReview).pipe(
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
      const sdkCapabilityAdmission = validateScenarioSdkCapabilityAdmission({
        sdkCapabilityIntent: config.sdkCapabilityIntent,
        sdkCapabilityReview: review.sdkCapability,
      });
      if (Result.isFailure(sdkCapabilityAdmission)) {
        return Result.fail(sdkCapabilityAdmission.failure);
      }
      Match.value(sdkCapabilityAdmission.success.sdkCapabilityReview).pipe(
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
      candidateStagePlan: candidatePlan.success,
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
    return Result.fail("Scenario campaign produced no scenario.");
  }
  const finalReview = await agents.reviewScenario({
    scenario: draft.prose,
    scenarioPurpose: config.scenarioPurpose,
    campaignId: config.campaignId,
    candidateId: draft.candidateId,
    candidateScenarioSha256: scenarioContentSha256(draft.prose),
    plannedScenarioId: config.plannedScenarioId,
    finalReview: true,
    distributionPreference: config.distributionPreference,
    stageFacts: draft.stageFacts,
    contentAvailabilityIntent: config.contentAvailabilityIntent,
    sdkCapabilityIntent: config.sdkCapabilityIntent,
    catalogueComparison: draft.catalogueComparison,
  });
  const finalContentAdmission = validateScenarioContentAdmission({
    contentAvailabilityIntent: config.contentAvailabilityIntent,
    contentReview: finalReview.contentAvailability,
  });
  if (Result.isFailure(finalContentAdmission)) {
    return Result.fail(finalContentAdmission.failure);
  }
  const finalSdkCapabilityAdmission = validateScenarioSdkCapabilityAdmission({
    sdkCapabilityIntent: config.sdkCapabilityIntent,
    sdkCapabilityReview: finalReview.sdkCapability,
  });
  if (Result.isFailure(finalSdkCapabilityAdmission)) {
    return Result.fail(finalSdkCapabilityAdmission.failure);
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
    ...finalContentAdmission.success,
    ...finalSdkCapabilityAdmission.success,
  } as const;
  return Result.succeed(resultBase);
}
