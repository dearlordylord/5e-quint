import { Either, Match, Schema } from "effect";

import { ArtifactAuthoritySchema } from "./artifact-authority-schema.ts";
import { ScenarioIdSchema, type ScenarioId } from "./transcript.ts";

type ScenarioSourceAuthority = Schema.Schema.Type<
  typeof ArtifactAuthoritySchema
>;

const CHARACTER_REQUIREMENT_TAGS = [
  "statBlocksOnly",
  "characterSheetsRequired",
] as const;
const CharacterRequirementTagSchema = Schema.Literal(
  ...CHARACTER_REQUIREMENT_TAGS,
);
type CharacterRequirementTag = (typeof CHARACTER_REQUIREMENT_TAGS)[number];

const SPATIAL_CONTEXTS = [
  "notRequired",
  "geometryAssisted",
  "tableAuthored",
  "incoherent",
] as const;
const SpatialContextSchema = Schema.Literal(...SPATIAL_CONTEXTS);
type SpatialContext = (typeof SPATIAL_CONTEXTS)[number];

const CONTENT_AVAILABILITY_INTENTS = [
  "availableOnly",
  "probeUnavailableContent",
] as const;
const ContentAvailabilityIntentSchema = Schema.Literal(
  ...CONTENT_AVAILABILITY_INTENTS,
);
type ContentAvailabilityIntent = (typeof CONTENT_AVAILABILITY_INTENTS)[number];

const SDK_SUPPORT_BOUNDARIES = [
  "notAssessed",
  "supportedOnly/supported",
  "supportedOnly/unsupported",
  "probeUnsupportedCapability/explicitUnsupportedProbe",
  "probeUnsupportedCapability/missingUnsupportedProbe",
] as const;
const SdkSupportBoundarySchema = Schema.Literal(...SDK_SUPPORT_BOUNDARIES);
type SdkSupportBoundary = (typeof SDK_SUPPORT_BOUNDARIES)[number];

type CatalogueScenarioForProjection = Readonly<{
  readonly scenarioId: ScenarioId;
  readonly title: string;
  readonly purpose: string;
  readonly authoredSource: ScenarioSourceAuthority;
  readonly characterRequirement: Readonly<{
    readonly tag: CharacterRequirementTag;
  }>;
  readonly spatialRequirement:
    | Readonly<{ readonly tag: "notRequired" }>
    | Readonly<{ readonly tag: "geometryAssisted" }>
    | Readonly<{
        readonly tag: "outsideExperimentEnvelope";
        readonly resolution: "tableAuthored" | "incoherent";
      }>;
  readonly contentAvailability: Readonly<{
    readonly contentAvailabilityIntent: ContentAvailabilityIntent;
  }>;
  readonly sdkCapability:
    | Readonly<{ readonly tag: "notAssessed" }>
    | Readonly<{
        readonly tag: "assessed";
        readonly admission:
          | Readonly<{
              readonly sdkCapabilityIntent: "supportedOnly";
              readonly sdkCapabilityReview: Readonly<{
                readonly classification: "supported" | "unsupported";
              }>;
            }>
          | Readonly<{
              readonly sdkCapabilityIntent: "probeUnsupportedCapability";
              readonly sdkCapabilityReview: Readonly<{
                readonly classification:
                  | "explicitUnsupportedProbe"
                  | "missingUnsupportedProbe";
              }>;
            }>;
      }>;
}>;
type RawCatalogueForProjection = Readonly<{
  readonly scenarios: readonly CatalogueScenarioForProjection[];
}>;

/**
 * Conclusions are deliberately a closed vocabulary.  The authoring operator
 * uses them to decide whether a Candidate can continue toward admission; they
 * are not a score or a retrieval result.
 */
export const SCENARIO_CATALOGUE_CONCLUSIONS = [
  "meaningfullyDistinct",
  "purposefulOverlap",
  "redundant",
] as const;
export const ScenarioCatalogueConclusionSchema = Schema.Literal(
  ...SCENARIO_CATALOGUE_CONCLUSIONS,
);
export type ScenarioCatalogueConclusion =
  (typeof SCENARIO_CATALOGUE_CONCLUSIONS)[number];

export const ScenarioCatalogueProjectionSchema = Schema.Struct({
  scenarioId: ScenarioIdSchema,
  title: Schema.NonEmptyTrimmedString,
  purpose: Schema.NonEmptyTrimmedString,
  authoredSource: ArtifactAuthoritySchema,
  characterRequirement: CharacterRequirementTagSchema,
  spatialContext: SpatialContextSchema,
  contentAvailabilityIntent: ContentAvailabilityIntentSchema,
  sdkSupportBoundary: SdkSupportBoundarySchema,
});
export type ScenarioCatalogueProjection = Schema.Schema.Type<
  typeof ScenarioCatalogueProjectionSchema
>;

const ComparedScenarioDimensionsSchema = Schema.Struct({
  exploratoryPurpose: Schema.NonEmptyTrimmedString,
  materiallyRelevantMechanics: Schema.NonEmptyTrimmedString,
  encounterComposition: Schema.NonEmptyTrimmedString,
  interactionSequence: Schema.NonEmptyTrimmedString,
  tacticalQuestion: Schema.NonEmptyTrimmedString,
  sdkSupportBoundary: Schema.NonEmptyTrimmedString,
  spatialContext: Schema.Union(
    Schema.Struct({ tag: Schema.Literal("notMaterial") }),
    Schema.Struct({
      tag: Schema.Literal("supporting"),
      evidence: Schema.NonEmptyTrimmedString,
    }),
  ),
});

const ComparisonBasisSchema = Schema.Union(
  Schema.Struct({ tag: Schema.Literal("noAdmittedScenarios") }),
  Schema.Struct({
    tag: Schema.Literal("compared"),
    dimensions: ComparedScenarioDimensionsSchema,
  }),
);

const ClosestMatchSchema = Schema.Struct({
  scenarioId: ScenarioIdSchema,
  reason: Schema.NonEmptyTrimmedString,
});

/**
 * One review result can be retained beside the admitted review.  The
 * comparison is evidence, not a second catalogue: scenario facts remain
 * owned by the admitted record and its referenced authorities.
 */
export const ScenarioCatalogueComparisonSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  conclusion: ScenarioCatalogueConclusionSchema,
  comparedScenarioIds: Schema.Array(ScenarioIdSchema),
  closestMatches: Schema.Array(ClosestMatchSchema),
  materialDifferentiators: Schema.Array(Schema.NonEmptyTrimmedString),
  basis: ComparisonBasisSchema,
});
export type ScenarioCatalogueComparison = Schema.Schema.Type<
  typeof ScenarioCatalogueComparisonSchema
>;

/** A bounded model input batch. Every admitted projection must be represented. */
export const SCENARIO_CATALOGUE_COMPARISON_BATCH_BYTE_LIMIT = 16 * 1024;

function encodedBytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

/**
 * Split projections by measured UTF-8 bytes.  A projection that cannot fit in
 * one batch is an explicit failure; this function never samples or truncates.
 */
export function batchScenarioCatalogueProjections(
  projections: readonly ScenarioCatalogueProjection[],
): Either.Either<readonly (readonly ScenarioCatalogueProjection[])[], string> {
  const batches: ScenarioCatalogueProjection[][] = [];
  let current: ScenarioCatalogueProjection[] = [];
  for (const projection of projections) {
    const singleton = [projection] as const;
    if (
      encodedBytes(singleton) > SCENARIO_CATALOGUE_COMPARISON_BATCH_BYTE_LIMIT
    ) {
      return Either.left(
        `Scenario catalogue projection ${projection.scenarioId} exceeds the ${SCENARIO_CATALOGUE_COMPARISON_BATCH_BYTE_LIMIT}-byte comparison batch limit.`,
      );
    }
    const candidate = [...current, projection];
    if (
      current.length > 0 &&
      encodedBytes(candidate) > SCENARIO_CATALOGUE_COMPARISON_BATCH_BYTE_LIMIT
    ) {
      batches.push(current);
      current = [projection];
    } else {
      current = candidate;
    }
  }
  if (current.length > 0) batches.push(current);
  return Either.right(batches);
}

function spatialContext(
  scenario: CatalogueScenarioForProjection,
): SpatialContext {
  return Match.value(scenario.spatialRequirement).pipe(
    Match.when({ tag: "notRequired" }, () => "notRequired" as const),
    Match.when({ tag: "geometryAssisted" }, () => "geometryAssisted" as const),
    Match.when(
      { tag: "outsideExperimentEnvelope", resolution: "tableAuthored" },
      () => "tableAuthored" as const,
    ),
    Match.when(
      { tag: "outsideExperimentEnvelope", resolution: "incoherent" },
      () => "incoherent" as const,
    ),
    Match.exhaustive,
  );
}

function sdkSupportBoundary(
  scenario: CatalogueScenarioForProjection,
): SdkSupportBoundary {
  return Match.value(scenario.sdkCapability).pipe(
    Match.when({ tag: "notAssessed" }, () => "notAssessed" as const),
    Match.when({ tag: "assessed" }, ({ admission }) =>
      Match.value(admission).pipe(
        Match.when(
          { sdkCapabilityIntent: "supportedOnly" },
          ({ sdkCapabilityReview }) =>
            `supportedOnly/${sdkCapabilityReview.classification}` as const,
        ),
        Match.when(
          { sdkCapabilityIntent: "probeUnsupportedCapability" },
          ({ sdkCapabilityReview }) =>
            `probeUnsupportedCapability/${sdkCapabilityReview.classification}` as const,
        ),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
}

/** Derive the concise comparison view from the existing admitted catalogue. */
export function projectScenarioCatalogueForAuthoring(
  catalogue: RawCatalogueForProjection,
): readonly ScenarioCatalogueProjection[] {
  return catalogue.scenarios.map((scenario) => ({
    scenarioId: scenario.scenarioId,
    title: scenario.title,
    purpose: scenario.purpose,
    authoredSource: scenario.authoredSource,
    characterRequirement: scenario.characterRequirement.tag,
    spatialContext: spatialContext(scenario),
    contentAvailabilityIntent:
      scenario.contentAvailability.contentAvailabilityIntent,
    sdkSupportBoundary: sdkSupportBoundary(scenario),
  }));
}

function sameScenarioIds(
  actual: readonly ScenarioId[],
  expected: readonly ScenarioId[],
): boolean {
  if (actual.length !== expected.length) return false;
  const expectedSet = new Set(expected);
  return (
    new Set(actual).size === actual.length &&
    actual.every((scenarioId) => expectedSet.has(scenarioId))
  );
}

function comparisonDimensionEvidence(
  comparisons: readonly ScenarioCatalogueComparison[],
): Either.Either<
  Schema.Schema.Type<typeof ComparedScenarioDimensionsSchema>,
  string
> {
  const compared = comparisons.find(
    (comparison) => comparison.basis.tag === "compared",
  );
  if (compared === undefined || compared.basis.tag !== "compared") {
    return Either.left(
      "Catalogue comparison batches did not retain dimension evidence.",
    );
  }
  return Either.right(compared.basis.dimensions);
}

/**
 * Validate and retain a complete comparison over all admitted projections.
 * The caller supplies the expected ids from the canonical catalogue; a model
 * result that omits, duplicates, or invents an id is rejected.
 */
export function validateScenarioCatalogueComparison(input: {
  readonly comparison: ScenarioCatalogueComparison;
  readonly expectedScenarioIds: readonly ScenarioId[];
}): Either.Either<ScenarioCatalogueComparison, string> {
  const decoded = Schema.decodeUnknownEither(
    ScenarioCatalogueComparisonSchema,
    {
      onExcessProperty: "error",
    },
  )(input.comparison);
  if (Either.isLeft(decoded)) return Either.left(decoded.left.message);
  const comparison = decoded.right;
  if (
    !sameScenarioIds(comparison.comparedScenarioIds, input.expectedScenarioIds)
  ) {
    return Either.left(
      `Catalogue comparison covered ${comparison.comparedScenarioIds.length} of ${input.expectedScenarioIds.length} admitted Scenarios without silent sampling or truncation.`,
    );
  }
  const expectedScenarioIds = new Set(input.expectedScenarioIds);
  if (
    comparison.closestMatches.some(
      ({ scenarioId }) => !expectedScenarioIds.has(scenarioId),
    )
  ) {
    return Either.left(
      "A closest match must identify an admitted Scenario in the compared catalogue.",
    );
  }
  if (
    comparison.conclusion === "redundant" &&
    comparison.closestMatches.length === 0
  ) {
    return Either.left(
      "A redundant Candidate comparison must identify its closest admitted Scenario.",
    );
  }
  if (
    comparison.conclusion === "purposefulOverlap" &&
    comparison.materialDifferentiators.length === 0
  ) {
    return Either.left(
      "A purposeful-overlap comparison must name a material differentiator.",
    );
  }
  if (
    input.expectedScenarioIds.length > 0 &&
    comparison.basis.tag !== "compared"
  ) {
    return Either.left(
      "A nonempty catalogue comparison must retain dimension evidence.",
    );
  }
  if (
    input.expectedScenarioIds.length === 0 &&
    comparison.basis.tag !== "noAdmittedScenarios"
  ) {
    return Either.left(
      "An empty admitted catalogue must be retained as noAdmittedScenarios.",
    );
  }
  if (
    input.expectedScenarioIds.length === 0 &&
    comparison.conclusion !== "meaningfullyDistinct"
  ) {
    return Either.left(
      "A Candidate cannot overlap or repeat an empty admitted catalogue.",
    );
  }
  return Either.right(comparison);
}

/** Combine strict per-batch reviews without losing coverage evidence. */
export function aggregateScenarioCatalogueComparisons(input: {
  readonly comparisons: readonly ScenarioCatalogueComparison[];
  readonly expectedScenarioIds: readonly ScenarioId[];
}): Either.Either<ScenarioCatalogueComparison, string> {
  if (input.expectedScenarioIds.length === 0) {
    return validateScenarioCatalogueComparison({
      expectedScenarioIds: [],
      comparison: {
        schemaVersion: 1,
        conclusion: "meaningfullyDistinct",
        comparedScenarioIds: [],
        closestMatches: [],
        materialDifferentiators: [],
        basis: { tag: "noAdmittedScenarios" },
      },
    });
  }
  if (input.comparisons.length === 0) {
    return Either.left(
      "A nonempty admitted catalogue requires at least one comparison batch.",
    );
  }
  const comparedScenarioIds = input.comparisons.flatMap(
    ({ comparedScenarioIds: ids }) => ids,
  );
  if (
    !sameScenarioIds(comparedScenarioIds, input.expectedScenarioIds) ||
    new Set(comparedScenarioIds).size !== comparedScenarioIds.length
  ) {
    return Either.left(
      "Catalogue comparison batches must cover every admitted Scenario exactly once.",
    );
  }
  const conclusion = input.comparisons.some(
    ({ conclusion: candidate }) => candidate === "redundant",
  )
    ? "redundant"
    : input.comparisons.some(
          ({ conclusion: candidate }) => candidate === "purposefulOverlap",
        )
      ? "purposefulOverlap"
      : "meaningfullyDistinct";
  const closestMatches = [
    ...new Map(
      input.comparisons
        .flatMap(({ closestMatches: matches }) => matches)
        .map((match) => [match.scenarioId, match] as const),
    ).values(),
  ];
  const materialDifferentiators = [
    ...new Set(
      input.comparisons.flatMap(
        ({ materialDifferentiators: differentiators }) => differentiators,
      ),
    ),
  ];
  const dimensions = comparisonDimensionEvidence(input.comparisons);
  if (Either.isLeft(dimensions)) return Either.left(dimensions.left);
  const comparison: ScenarioCatalogueComparison = {
    schemaVersion: 1,
    conclusion,
    comparedScenarioIds,
    closestMatches,
    materialDifferentiators,
    basis: {
      tag: "compared",
      dimensions: dimensions.right,
    },
  };
  return validateScenarioCatalogueComparison({
    comparison,
    expectedScenarioIds: input.expectedScenarioIds,
  });
}

export function catalogueComparisonCritique(
  comparison: ScenarioCatalogueComparison,
): string {
  const closest = comparison.closestMatches[0];
  return comparison.conclusion === "redundant" && closest !== undefined
    ? `Candidate is redundant with admitted Scenario ${closest.scenarioId}: ${closest.reason}. Revise its mechanics or tactical purpose before another comparison.`
    : comparison.conclusion === "purposefulOverlap"
      ? `Candidate overlaps an admitted Scenario but retains this material differentiator: ${comparison.materialDifferentiators.join("; ")}. Preserve that distinction in the next revision.`
      : "Candidate is meaningfully distinct from every admitted Scenario in the canonical catalogue.";
}
