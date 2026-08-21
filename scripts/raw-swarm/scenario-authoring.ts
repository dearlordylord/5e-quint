import { Either, Match, Schema } from "effect";

import { ArtifactAuthoritySchema } from "./artifact-authority-schema.ts";
import { ScenarioIdSchema, type ScenarioId } from "./transcript.ts";
import type { ScenarioSdkCapabilityAdmission } from "./scenario-campaign.ts";

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
    | (Readonly<{ readonly tag: "assessed" }> & ScenarioSdkCapabilityAdmission);
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

const NonNegativeIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
);

export const ScenarioCatalogueComparisonBatchSchema = Schema.Struct({
  batchIndex: NonNegativeIntegerSchema,
  comparedScenarioIds: Schema.Array(ScenarioIdSchema),
  dimensions: ComparedScenarioDimensionsSchema,
});
export type ScenarioCatalogueComparisonBatch = Schema.Schema.Type<
  typeof ScenarioCatalogueComparisonBatchSchema
>;

export type ScenarioCatalogueBatchExpectation = Readonly<{
  readonly batchIndex: number;
  readonly scenarioIds: readonly ScenarioId[];
}>;

const ComparisonBasisSchema = Schema.Union(
  Schema.Struct({ tag: Schema.Literal("noAdmittedScenarios") }),
  Schema.Struct({
    tag: Schema.Literal("compared"),
    batches: Schema.Array(ScenarioCatalogueComparisonBatchSchema),
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

/** A bounded projection batch. Every admitted projection must be represented. */
export const SCENARIO_CATALOGUE_COMPARISON_BATCH_BYTE_LIMIT = 16 * 1024;
/**
 * Conservative bound for the complete comparison payload sent to the model:
 * instructions, Candidate prose, batch index, and the serialized batch. UTF-8
 * byte length is measured at this boundary; this is an explicit transport
 * bound, not an unverified claim about any provider tokenizer's token count.
 * The check cannot silently turn a large Candidate or batch into an unbounded
 * request.
 */
export const SCENARIO_CATALOGUE_COMPARISON_MODEL_INPUT_BYTE_LIMIT = 32 * 1024;

function encodedBytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

export function scenarioCatalogueComparisonPrompt(input: {
  readonly candidate: string;
  readonly candidateIndex: number;
  readonly batchIndex: number;
  readonly batch: readonly ScenarioCatalogueProjection[];
}): Either.Either<string, string> {
  const prompt = `Compare this complete Scenario Candidate with every admitted Scenario in the supplied canonical catalogue batch. This is Candidate ${input.candidateIndex}, catalogue batch ${input.batchIndex}; inspect the Candidate prose and each projection's referenced authored source when a concrete mechanic, composition, interaction sequence, or tactical question is needed. Read source authorities exactly; never sample, silently truncate, or infer missing catalogue entries.

Return one closed comparison object. The comparedScenarioIds must exactly equal this batch's ids, and basis.batches must contain exactly one object with batchIndex ${input.batchIndex}, those same ids, and complete dimension evidence. Use conclusion meaningfullyDistinct only for a material exploratory difference, purposefulOverlap only with a material differentiator, or redundant only when the Candidate repeats a useful admitted purpose and behavior; redundant requires closestMatches naming the closest admitted Scenario. Retain all dimensions for this batch; do not merge this batch with another invocation.

Candidate:
${input.candidate}

Canonical admitted catalogue batch ${input.batchIndex}:
${JSON.stringify(input.batch, null, 2)}`;
  const bytes = Buffer.byteLength(prompt, "utf8");
  return bytes <= SCENARIO_CATALOGUE_COMPARISON_MODEL_INPUT_BYTE_LIMIT
    ? Either.right(prompt)
    : Either.left(
        `Scenario catalogue comparison model input is ${bytes} UTF-8 bytes, exceeding the conservative ${SCENARIO_CATALOGUE_COMPARISON_MODEL_INPUT_BYTE_LIMIT}-byte bound.`,
      );
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
    Match.when(
      { tag: "assessed", sdkCapabilityIntent: "supportedOnly" },
      ({ sdkCapabilityReview }) =>
        `supportedOnly/${sdkCapabilityReview.classification}` as const,
    ),
    Match.when(
      { tag: "assessed", sdkCapabilityIntent: "probeUnsupportedCapability" },
      ({ sdkCapabilityReview }) =>
        `probeUnsupportedCapability/${sdkCapabilityReview.classification}` as const,
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

function comparisonBatchEvidence(
  comparison: ScenarioCatalogueComparison,
): Either.Either<ScenarioCatalogueComparisonBatch, string> {
  if (comparison.basis.tag !== "compared") {
    return Either.left(
      "A nonempty catalogue comparison must retain dimension evidence.",
    );
  }
  if (comparison.basis.batches.length !== 1) {
    return Either.left(
      "Each model comparison must retain exactly one named catalogue batch.",
    );
  }
  const batch = comparison.basis.batches[0]!;
  if (
    !sameScenarioIds(comparison.comparedScenarioIds, batch.comparedScenarioIds)
  ) {
    return Either.left(
      "A model comparison must retain the exact top-level Scenario ids for its named batch.",
    );
  }
  return Either.right(batch);
}

function validateBatchCoverage(input: {
  readonly batches: readonly ScenarioCatalogueComparisonBatch[];
  readonly expectedScenarioIds: readonly ScenarioId[];
  readonly expectedBatches?: readonly ScenarioCatalogueBatchExpectation[];
}): Either.Either<void, string> {
  const flattened = input.batches.flatMap(
    ({ comparedScenarioIds }) => comparedScenarioIds,
  );
  if (!sameScenarioIds(flattened, input.expectedScenarioIds)) {
    return Either.left(
      `Catalogue comparison covered ${flattened.length} of ${input.expectedScenarioIds.length} admitted Scenarios without silent sampling or truncation.`,
    );
  }
  if (
    new Set(flattened).size !== flattened.length ||
    input.batches.some(
      ({ comparedScenarioIds }) =>
        new Set(comparedScenarioIds).size !== comparedScenarioIds.length,
    )
  ) {
    return Either.left(
      "Catalogue comparison batches must cover every admitted Scenario exactly once.",
    );
  }
  if (input.expectedBatches !== undefined) {
    if (input.batches.length !== input.expectedBatches.length) {
      return Either.left(
        "Catalogue comparison retained a different number of canonical batches.",
      );
    }
    for (const [position, expected] of input.expectedBatches.entries()) {
      const actual = input.batches[position];
      if (
        actual === undefined ||
        actual.batchIndex !== expected.batchIndex ||
        !sameScenarioIds(actual.comparedScenarioIds, expected.scenarioIds)
      ) {
        return Either.left(
          `Catalogue comparison batch ${expected.batchIndex} did not retain its canonical Scenario identity.`,
        );
      }
    }
  } else {
    const indexes = input.batches.map(({ batchIndex }) => batchIndex);
    if (
      indexes.some((batchIndex, position) => batchIndex !== position) ||
      new Set(indexes).size !== indexes.length
    ) {
      return Either.left(
        "Catalogue comparison batch indexes must be contiguous and unique.",
      );
    }
  }
  return Either.right(undefined);
}

/**
 * Validate and retain a complete comparison over all admitted projections.
 * The caller supplies the expected ids from the canonical catalogue; a model
 * result that omits, duplicates, or invents an id is rejected.
 */
export function validateScenarioCatalogueComparison(input: {
  readonly comparison: ScenarioCatalogueComparison;
  readonly expectedScenarioIds: readonly ScenarioId[];
  readonly expectedBatches?: readonly ScenarioCatalogueBatchExpectation[];
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
    comparison.comparedScenarioIds.length !== input.expectedScenarioIds.length
  ) {
    return Either.left(
      `Catalogue comparison covered ${comparison.comparedScenarioIds.length} of ${input.expectedScenarioIds.length} admitted Scenarios without silent sampling or truncation.`,
    );
  }
  if (
    !sameScenarioIds(comparison.comparedScenarioIds, input.expectedScenarioIds)
  ) {
    return Either.left(
      "Catalogue comparison introduced, omitted, or duplicated a canonical Scenario identity.",
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
  if (input.expectedScenarioIds.length > 0) {
    const coverage = validateBatchCoverage({
      batches:
        comparison.basis.tag === "compared" ? comparison.basis.batches : [],
      expectedScenarioIds: input.expectedScenarioIds,
      ...(input.expectedBatches === undefined
        ? {}
        : { expectedBatches: input.expectedBatches }),
    });
    if (Either.isLeft(coverage)) return Either.left(coverage.left);
  }
  return Either.right(comparison);
}

/** Combine strict per-batch reviews without losing coverage evidence. */
export function aggregateScenarioCatalogueComparisons(input: {
  readonly comparisons: readonly ScenarioCatalogueComparison[];
  readonly expectedScenarioIds: readonly ScenarioId[];
  readonly expectedBatches?: readonly ScenarioCatalogueBatchExpectation[];
}): Either.Either<ScenarioCatalogueComparison, string> {
  if (input.expectedScenarioIds.length === 0) {
    if (input.comparisons.length > 0) {
      return Either.left(
        "An empty admitted catalogue cannot retain a nonempty comparison batch.",
      );
    }
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
  const batches: ScenarioCatalogueComparisonBatch[] = [];
  for (const comparison of input.comparisons) {
    const evidence = comparisonBatchEvidence(comparison);
    if (Either.isLeft(evidence)) return Either.left(evidence.left);
    batches.push(evidence.right);
  }
  const comparedScenarioIds = input.comparisons.flatMap(
    ({ comparedScenarioIds: ids }) => ids,
  );
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
  const comparison: ScenarioCatalogueComparison = {
    schemaVersion: 1,
    conclusion,
    comparedScenarioIds,
    closestMatches,
    materialDifferentiators,
    basis: {
      tag: "compared",
      batches,
    },
  };
  return validateScenarioCatalogueComparison({
    comparison,
    expectedScenarioIds: input.expectedScenarioIds,
    ...(input.expectedBatches === undefined
      ? {}
      : { expectedBatches: input.expectedBatches }),
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
