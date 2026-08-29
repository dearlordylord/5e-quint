import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { Result, Match, Schema } from "effect";

import type { ArtifactAuthority } from "./artifact-authority.ts";
import {
  BenchmarkIdSchema,
  EvidenceSetIdSchema,
  ExecutionIdSchema,
  ScenarioIdSchema,
  ScenarioExecutionIdentitySchema,
  ScenarioCampaignIdSchema,
  ScenarioCandidateIdSchema,
} from "./raw-swarm-identities.ts";
import type {
  BenchmarkId,
  EvidenceSetId,
  ExecutionId,
  ScenarioCampaignId,
  ScenarioCandidateId,
  ScenarioId,
} from "./raw-swarm-identities.ts";
import {
  finalScenarioDisposition,
  FinalScenarioReviewSchema,
  type ScenarioContentAdmission,
  type ScenarioSdkCapabilityAdmission,
} from "./scenario-campaign.ts";
import {
  batchScenarioCatalogueProjections,
  projectScenarioCatalogueForAuthoring,
  ScenarioCatalogueComparisonSchema,
  type ScenarioCatalogueBatchExpectation,
  validateScenarioCatalogueComparison,
  type ScenarioCatalogueComparison,
  type ScenarioCatalogueProjection,
} from "./scenario-authoring.ts";
import { ScenarioStageFactsAuthoritySchema } from "./stage-plan-authority.ts";
import {
  AdmittedScenarioRecordSchema,
  isCurrentAdmittedScenarioRecord,
  type AdmittedScenarioRecord,
} from "./scenario-admission.ts";
import {
  BenchmarkExecutionProfileDescriptorSchema,
  type BenchmarkExecutionProfileDescriptor,
} from "./performance-comparison.ts";
import { canonicalRepositoryReadPath } from "./repository-path.ts";

export { AdmittedScenarioRecordSchema, type AdmittedScenarioRecord };

type ScenarioCatalogueSource = AdmittedScenarioRecord &
  Readonly<{
    readonly characterRequirement: Schema.Schema.Type<
      typeof ScenarioStageFactsAuthoritySchema
    >["facts"]["characterRequirement"];
    readonly spatialRequirement: Schema.Schema.Type<
      typeof ScenarioStageFactsAuthoritySchema
    >["facts"]["spatialRequirement"];
    readonly contentAvailability: ScenarioContentAdmission;
    readonly sdkCapability:
      | Readonly<
          {
            readonly tag: "assessed";
          } & ScenarioSdkCapabilityAdmission
        >
      | Readonly<{ readonly tag: "notAssessed" }>;
  }>;

type ScenarioCatalogueAdmissionComparison =
  | Readonly<{ readonly tag: "historical" }>
  | Readonly<{
      readonly tag: "current";
      readonly comparison: ScenarioCatalogueComparison;
    }>;

type ScenarioCatalogueReadSource = Readonly<{
  readonly path: string;
  readonly source: ScenarioCatalogueSource;
  readonly admissionComparison: ScenarioCatalogueAdmissionComparison;
}>;

type ScenarioCatalogueScope = "live" | "contained";

type RawSwarmCatalogueScenario = ScenarioCatalogueSource &
  Readonly<{
    readonly executionIds: readonly ExecutionId[];
    readonly benchmarkIds: readonly BenchmarkId[];
  }>;

export type ScenarioExecutionRecord = Readonly<{
  readonly schemaVersion: 1;
  readonly executionId: ExecutionId;
  readonly scenarioId: ScenarioId;
  readonly evidenceSetId: EvidenceSetId;
}>;

export type BenchmarkComparisonTarget =
  | Readonly<{ readonly tag: "execution"; readonly executionId: ExecutionId }>
  | Readonly<{
      readonly tag: "executionProfile";
      readonly executionId: ExecutionId;
    }>;

export type BenchmarkRecord = Readonly<{
  readonly schemaVersion: 1;
  readonly benchmarkId: BenchmarkId;
  readonly evidenceSetId: EvidenceSetId;
  readonly comparisonTargets: readonly [
    BenchmarkComparisonTarget,
    BenchmarkComparisonTarget,
    ...BenchmarkComparisonTarget[],
  ];
}>;

type HistoricalRejectedScenarioCandidateRecord = Readonly<{
  readonly schemaVersion: 1;
  readonly candidateId: ScenarioCandidateId;
  readonly campaignId: ScenarioCampaignId;
  readonly evidenceSetId: EvidenceSetId;
  readonly reason: string;
}>;

type CurrentRejectedScenarioCandidateRecord =
  HistoricalRejectedScenarioCandidateRecord &
    Readonly<{
      /** The complete predecessor boundary used for this rejection. */
      readonly predecessorScenarioIds: readonly ScenarioId[];
      readonly predecessorBatches: readonly ScenarioCatalogueBatchExpectation[];
      readonly catalogueComparison: Schema.Schema.Type<
        typeof ScenarioCatalogueComparisonSchema
      >;
    }>;

export type RejectedScenarioCandidateRecord =
  | HistoricalRejectedScenarioCandidateRecord
  | CurrentRejectedScenarioCandidateRecord;

export const ScenarioExecutionRecordSchema = ScenarioExecutionIdentitySchema;

const BenchmarkComparisonTargetSchema = Schema.Union([
  Schema.Struct({
    tag: Schema.Literal("execution"),
    executionId: ExecutionIdSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("executionProfile"),
    executionId: ExecutionIdSchema,
  }),
]);

export const BenchmarkRecordSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  benchmarkId: BenchmarkIdSchema,
  evidenceSetId: EvidenceSetIdSchema,
  comparisonTargets: Schema.TupleWithRest(
    Schema.Tuple([
      BenchmarkComparisonTargetSchema,
      BenchmarkComparisonTargetSchema,
    ]),
    [BenchmarkComparisonTargetSchema],
  ).pipe(
    Schema.check(
      Schema.makeFilter(
        (targets) =>
          new Set(targets.map(({ executionId }) => executionId)).size ===
          targets.length,
        {
          message: "benchmark comparison target identities must be unique",
        },
      ),
    ),
  ),
});

function benchmarkComparisonTargetIds(
  benchmark: BenchmarkRecord,
): readonly ExecutionId[] {
  return benchmark.comparisonTargets.map(({ executionId }) => executionId);
}

function benchmarkComparisonTargetScenarioIds(
  benchmark: BenchmarkRecord,
  scenarioIdByExecutionId: ReadonlyMap<ExecutionId, ScenarioId>,
): readonly (ScenarioId | undefined)[] {
  return benchmarkComparisonTargetIds(benchmark).map((executionId) =>
    scenarioIdByExecutionId.get(executionId),
  );
}

function benchmarkComparisonTargetsForScenario(
  benchmark: BenchmarkRecord,
  executionIds: ReadonlySet<ExecutionId>,
): boolean {
  return benchmarkComparisonTargetIds(benchmark).some((executionId) =>
    executionIds.has(executionId),
  );
}

const HistoricalRejectedScenarioCandidateRecordSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  candidateId: ScenarioCandidateIdSchema,
  campaignId: ScenarioCampaignIdSchema,
  evidenceSetId: EvidenceSetIdSchema,
  reason: Schema.Trimmed.check(Schema.isNonEmpty()),
});

const CurrentRejectedScenarioCandidateRecordSchema = Schema.Struct({
  ...HistoricalRejectedScenarioCandidateRecordSchema.fields,
  predecessorScenarioIds: Schema.Array(ScenarioIdSchema),
  predecessorBatches: Schema.Array(
    Schema.Struct({
      batchIndex: Schema.Number.pipe(
        Schema.check(Schema.isInt()),
        Schema.check(Schema.isGreaterThanOrEqualTo(0)),
      ),
      scenarioIds: Schema.Array(ScenarioIdSchema),
    }),
  ),
  catalogueComparison: ScenarioCatalogueComparisonSchema,
});

/** Persistence decoding must let projection report duplicate target ids. */
const BenchmarkRecordPersistenceSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  benchmarkId: BenchmarkIdSchema,
  evidenceSetId: EvidenceSetIdSchema,
  comparisonTargets: Schema.TupleWithRest(
    Schema.Tuple([
      BenchmarkComparisonTargetSchema,
      BenchmarkComparisonTargetSchema,
    ]),
    [BenchmarkComparisonTargetSchema],
  ),
});

export const RejectedScenarioCandidateRecordSchema = Schema.Union([
  CurrentRejectedScenarioCandidateRecordSchema,
  HistoricalRejectedScenarioCandidateRecordSchema,
]);

export type ScenarioCatalogueFailure =
  | Readonly<{
      readonly tag: "duplicateScenarioId";
      readonly scenarioId: ScenarioId;
    }>
  | Readonly<{
      readonly tag: "duplicateExecutionId";
      readonly executionId: ExecutionId;
    }>
  | Readonly<{
      readonly tag: "duplicateBenchmarkId";
      readonly benchmarkId: BenchmarkId;
    }>
  | Readonly<{
      readonly tag: "duplicateCandidateId";
      readonly candidateId: ScenarioCandidateId;
    }>
  | Readonly<{
      readonly tag: "duplicateEvidenceSetId";
      readonly evidenceSetId: EvidenceSetId;
    }>
  | Readonly<{
      readonly tag: "danglingExecutionScenario";
      readonly executionId: ExecutionId;
      readonly scenarioId: ScenarioId;
    }>
  | Readonly<{
      readonly tag: "danglingBenchmarkExecution";
      readonly benchmarkId: BenchmarkId;
      readonly executionId: ExecutionId;
    }>
  | Readonly<{
      readonly tag: "duplicateBenchmarkExecution";
      readonly benchmarkId: BenchmarkId;
      readonly executionId: ExecutionId;
    }>
  | Readonly<{
      readonly tag: "benchmarkScenarioMismatch";
      readonly benchmarkId: BenchmarkId;
    }>
  | Readonly<{
      readonly tag: "benchmarkExecutionKindMismatch";
      readonly benchmarkId: BenchmarkId;
      readonly executionId: ExecutionId;
      readonly expected: "execution" | "executionProfile";
      readonly actual: "execution" | "executionProfile";
    }>;

export type RawSwarmCatalogue = Readonly<{
  /** Current admitted Scenarios available to future authoring. */
  readonly scenarios: readonly RawSwarmCatalogueScenario[];
  /** Immutable admitted authorities retained only for historical validation. */
  readonly containedScenarios: readonly RawSwarmCatalogueScenario[];
  readonly rejectedCandidates: readonly RejectedScenarioCandidateRecord[];
}>;

export function findAuthorableScenarioInCatalogue(input: {
  readonly catalogue: RawSwarmCatalogue;
  readonly scenarioId: ScenarioId;
}): Result.Result<RawSwarmCatalogue["scenarios"][number], string> {
  const scenario = input.catalogue.scenarios.find(
    ({ scenarioId }) => scenarioId === input.scenarioId,
  );
  return scenario === undefined
    ? Result.fail(
        `Scenario ${input.scenarioId} is not present in the canonically validated authorable catalogue.`,
      )
    : Result.succeed(scenario);
}

const duplicates = <A>(values: readonly A[]): readonly A[] => {
  const seen = new Set<A>();
  const found = new Set<A>();
  for (const value of values) {
    if (seen.has(value)) found.add(value);
    seen.add(value);
  }
  return [...found];
};

type NonEmptyIssues<A> = readonly [A, ...A[]];

function nonEmptyIssues<A>(
  issues: readonly A[],
): NonEmptyIssues<A> | undefined {
  const [first, ...remaining] = issues;
  return first === undefined ? undefined : [first, ...remaining];
}

export function projectRawSwarmCatalogue(
  input: Readonly<{
    /** Current admitted Scenarios available to future authoring. */
    readonly scenarios: readonly ScenarioCatalogueSource[];
    /** Immutable admitted authorities retained only for historical validation. */
    readonly containedScenarios: readonly ScenarioCatalogueSource[];
    readonly executions: readonly ScenarioExecutionRecord[];
    /** Profile records remain distinct from ordinary execution records. */
    readonly executionProfiles?: readonly BenchmarkExecutionProfileDescriptor[];
    readonly benchmarks: readonly BenchmarkRecord[];
    readonly rejectedCandidates: readonly RejectedScenarioCandidateRecord[];
  }>,
): Result.Result<RawSwarmCatalogue, NonEmptyIssues<ScenarioCatalogueFailure>> {
  const issues: ScenarioCatalogueFailure[] = [];
  const containedScenarioSources = input.containedScenarios;
  const allScenarioSources = [...input.scenarios, ...containedScenarioSources];
  const executionRecords: readonly ScenarioExecutionRecord[] = [
    ...input.executions,
    ...(input.executionProfiles ?? []).map(
      ({ schemaVersion, executionId, scenarioId, evidenceSetId }) => ({
        schemaVersion,
        executionId,
        scenarioId,
        evidenceSetId,
      }),
    ),
  ];
  const executionKindById = new Map<
    ExecutionId,
    "execution" | "executionProfile"
  >([
    ...input.executions.map(
      ({ executionId }) => [executionId, "execution"] as const,
    ),
    ...(input.executionProfiles ?? []).map(
      ({ executionId }) => [executionId, "executionProfile"] as const,
    ),
  ]);
  for (const scenarioId of duplicates(
    allScenarioSources.map(({ scenarioId }) => scenarioId),
  )) {
    issues.push({
      tag: "duplicateScenarioId",
      scenarioId,
    });
  }
  const duplicateExecutionIds = duplicates(
    executionRecords.map(({ executionId }) => executionId),
  );
  for (const executionId of duplicateExecutionIds) {
    issues.push({
      tag: "duplicateExecutionId",
      executionId,
    });
  }
  for (const benchmarkId of duplicates(
    input.benchmarks.map(({ benchmarkId }) => benchmarkId),
  )) {
    issues.push({
      tag: "duplicateBenchmarkId",
      benchmarkId,
    });
  }
  for (const benchmark of input.benchmarks) {
    for (const executionId of duplicates(
      benchmarkComparisonTargetIds(benchmark),
    )) {
      issues.push({
        tag: "duplicateBenchmarkExecution",
        benchmarkId: benchmark.benchmarkId,
        executionId,
      });
    }
  }
  for (const candidateId of duplicates(
    input.rejectedCandidates.map(({ candidateId }) => candidateId),
  )) {
    issues.push({
      tag: "duplicateCandidateId",
      candidateId,
    });
  }
  for (const evidenceSetId of duplicates([
    ...executionRecords.map(({ evidenceSetId }) => evidenceSetId),
    ...input.benchmarks.map(({ evidenceSetId }) => evidenceSetId),
    ...input.rejectedCandidates.map(({ evidenceSetId }) => evidenceSetId),
  ])) {
    issues.push({
      tag: "duplicateEvidenceSetId",
      evidenceSetId,
    });
  }

  const scenarioIds = new Set(
    allScenarioSources.map(({ scenarioId }) => scenarioId),
  );
  for (const execution of executionRecords) {
    if (!scenarioIds.has(execution.scenarioId)) {
      issues.push({
        tag: "danglingExecutionScenario",
        executionId: execution.executionId,
        scenarioId: execution.scenarioId,
      });
    }
  }
  const executionIds = new Set(
    executionRecords.map(({ executionId }) => executionId),
  );
  const scenarioIdByExecutionId = new Map(
    executionRecords.map(({ executionId, scenarioId }) => [
      executionId,
      scenarioId,
    ]),
  );
  for (const benchmark of input.benchmarks) {
    const danglingExecutionIds = benchmarkComparisonTargetIds(benchmark).filter(
      (executionId) => !executionIds.has(executionId),
    );
    for (const executionId of danglingExecutionIds) {
      issues.push({
        tag: "danglingBenchmarkExecution",
        benchmarkId: benchmark.benchmarkId,
        executionId,
      });
    }
    for (const target of benchmark.comparisonTargets) {
      const actual = executionKindById.get(target.executionId);
      if (actual !== undefined && actual !== target.tag) {
        issues.push({
          tag: "benchmarkExecutionKindMismatch",
          benchmarkId: benchmark.benchmarkId,
          executionId: target.executionId,
          expected: target.tag,
          actual,
        });
      }
    }
    if (
      danglingExecutionIds.length === 0 &&
      duplicateExecutionIds.length === 0 &&
      new Set(
        benchmarkComparisonTargetScenarioIds(
          benchmark,
          scenarioIdByExecutionId,
        ),
      ).size !== 1
    ) {
      issues.push({
        tag: "benchmarkScenarioMismatch",
        benchmarkId: benchmark.benchmarkId,
      });
    }
  }

  const catalogueIssues = nonEmptyIssues(issues);
  if (catalogueIssues !== undefined) return Result.fail(catalogueIssues);

  const projectScenarioRecords = (
    sources: readonly ScenarioCatalogueSource[],
  ): readonly RawSwarmCatalogueScenario[] =>
    [...sources]
      .sort((left, right) =>
        String(left.scenarioId).localeCompare(String(right.scenarioId)),
      )
      .map((scenario) => {
        const executions = executionRecords
          .filter(({ scenarioId }) => scenarioId === scenario.scenarioId)
          .map(({ executionId }) => executionId)
          .sort((left, right) => String(left).localeCompare(String(right)));
        const relevantExecutionIds = new Set(executions);
        const benchmarkIds = input.benchmarks
          .filter((benchmark) =>
            benchmarkComparisonTargetsForScenario(
              benchmark,
              relevantExecutionIds,
            ),
          )
          .map(({ benchmarkId }) => benchmarkId)
          .sort((left, right) => String(left).localeCompare(String(right)));
        return { ...scenario, executionIds: executions, benchmarkIds };
      });
  const scenarios = projectScenarioRecords(input.scenarios);
  const containedScenarios = projectScenarioRecords(containedScenarioSources);

  return Result.succeed({
    scenarios,
    containedScenarios,
    rejectedCandidates: [...input.rejectedCandidates].sort((left, right) =>
      String(left.candidateId).localeCompare(String(right.candidateId)),
    ),
  });
}

type CatalogueReadFailure =
  | ScenarioCatalogueFailure
  | Readonly<{
      readonly tag: "unreadableCatalogueAuthority";
      readonly path: string;
    }>
  | Readonly<{
      readonly tag: "invalidCatalogueRecord";
      readonly path: string;
      readonly message: string;
    }>
  | Readonly<{
      readonly tag: "catalogueAuthorityMismatch";
      readonly path: string;
      readonly role: "authoredSource" | "admissionReview" | "stageFacts";
    }>
  | Readonly<{
      readonly tag: "catalogueScenarioIdentityMismatch";
      readonly scenarioId: ScenarioId;
      readonly path: string;
    }>
  | Readonly<{
      readonly tag: "invalidRelationshipRecord";
      readonly path: string;
      readonly message: string;
    }>
  | Readonly<{
      readonly tag: "unreadableEvidenceDirectory";
      readonly path: string;
    }>;

type FinalScenarioReview = Schema.Schema.Type<typeof FinalScenarioReviewSchema>;

function scenarioContentAdmission(
  review: FinalScenarioReview,
): ScenarioContentAdmission {
  return Match.value(review).pipe(
    Match.when({ contentAvailabilityIntent: "availableOnly" }, (current) => ({
      contentAvailabilityIntent: current.contentAvailabilityIntent,
      contentReview: current.contentReview,
    })),
    Match.when(
      { contentAvailabilityIntent: "probeUnavailableContent" },
      (current) => ({
        contentAvailabilityIntent: current.contentAvailabilityIntent,
        contentReview: current.contentReview,
      }),
    ),
    Match.exhaustive,
  );
}

function scenarioSdkCapability(
  review: FinalScenarioReview,
): ScenarioCatalogueSource["sdkCapability"] {
  if (!("sdkCapabilityReview" in review)) return { tag: "notAssessed" };
  return Match.value(review).pipe(
    Match.when({ sdkCapabilityIntent: "supportedOnly" }, (current) => ({
      tag: "assessed" as const,
      sdkCapabilityIntent: current.sdkCapabilityIntent,
      sdkCapabilityReview: current.sdkCapabilityReview,
    })),
    Match.when(
      { sdkCapabilityIntent: "probeUnsupportedCapability" },
      (current) => ({
        tag: "assessed" as const,
        sdkCapabilityIntent: current.sdkCapabilityIntent,
        sdkCapabilityReview: current.sdkCapabilityReview,
      }),
    ),
    Match.exhaustive,
  );
}

type RelationshipRecordPaths = Readonly<{
  readonly executions: readonly string[];
  readonly executionProfiles: readonly string[];
  readonly benchmarks: readonly string[];
  readonly rejections: readonly string[];
  readonly issues: readonly CatalogueReadFailure[];
}>;

function relationshipRecordPaths(
  repositoryRoot: string,
  directory: string,
): RelationshipRecordPaths {
  try {
    lstatSync(directory);
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return {
        executions: [],
        executionProfiles: [],
        benchmarks: [],
        rejections: [],
        issues: [],
      };
    }
    return {
      executions: [],
      executionProfiles: [],
      benchmarks: [],
      rejections: [],
      issues: [{ tag: "unreadableEvidenceDirectory", path: directory }],
    };
  }
  const canonicalRoot = canonicalRepositoryReadPath(repositoryRoot, directory);
  if (Result.isFailure(canonicalRoot)) {
    return {
      executions: [],
      executionProfiles: [],
      benchmarks: [],
      rejections: [],
      issues: [{ tag: "unreadableEvidenceDirectory", path: directory }],
    };
  }
  const executions: string[] = [];
  const executionProfiles: string[] = [];
  const benchmarks: string[] = [];
  const rejections: string[] = [];
  const issues: CatalogueReadFailure[] = [];
  const pending = [canonicalRoot.success];
  const visitedDirectories = new Set<string>();
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) break;
    if (visitedDirectories.has(current)) continue;
    visitedDirectories.add(current);
    try {
      for (const entry of readdirSync(current, { withFileTypes: true })) {
        const path = resolve(current, entry.name);
        const canonicalPath = canonicalRepositoryReadPath(repositoryRoot, path);
        if (Result.isFailure(canonicalPath)) {
          issues.push({
            tag: "unreadableEvidenceDirectory",
            path,
          });
          continue;
        }
        const isDirectory = entry.isDirectory()
          ? true
          : entry.isSymbolicLink() &&
            statSync(canonicalPath.success).isDirectory();
        if (isDirectory) {
          pending.push(canonicalPath.success);
        } else if (entry.name === "execution.json") {
          executions.push(canonicalPath.success);
        } else if (entry.name === "execution-profile.json") {
          executionProfiles.push(canonicalPath.success);
        } else if (entry.name === "benchmark.json") {
          benchmarks.push(canonicalPath.success);
        } else if (entry.name === "candidate-rejection.json") {
          rejections.push(canonicalPath.success);
        }
      }
    } catch {
      issues.push({ tag: "unreadableEvidenceDirectory", path: current });
    }
  }
  return {
    executions: executions.sort(),
    executionProfiles: executionProfiles.sort(),
    benchmarks: benchmarks.sort(),
    rejections: rejections.sort(),
    issues,
  };
}

function readRelationshipRecords<A, I>(
  paths: readonly string[],
  schema: Schema.Codec<A, I, never>,
): Result.Result<readonly A[], NonEmptyIssues<CatalogueReadFailure>> {
  const records: A[] = [];
  const issues: CatalogueReadFailure[] = [];
  for (const path of paths) {
    try {
      const decoded = Schema.decodeUnknownResult(schema, {
        onExcessProperty: "error",
      })(JSON.parse(readFileSync(path, "utf8")));
      if (Result.isFailure(decoded)) {
        issues.push({
          tag: "invalidRelationshipRecord",
          path,
          message: decoded.failure.message,
        });
      } else {
        records.push(decoded.success);
      }
    } catch (error) {
      issues.push({
        tag: "invalidRelationshipRecord",
        path,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const relationshipIssues = nonEmptyIssues(issues);
  return relationshipIssues === undefined
    ? Result.succeed(records)
    : Result.fail(relationshipIssues);
}

function validateRejectedCandidateComparisons(input: {
  readonly records: readonly RejectedScenarioCandidateRecord[];
  readonly paths: readonly string[];
  readonly scenarios: readonly ScenarioCatalogueSource[];
}): readonly CatalogueReadFailure[] {
  const currentRecords = input.records.flatMap((record, index) =>
    "catalogueComparison" in record
      ? [{ record, path: input.paths[index] ?? "<unknown rejection record>" }]
      : [],
  );
  if (currentRecords.length === 0) return [];
  const projections = projectScenarioCatalogueForAuthoring({
    scenarios: input.scenarios,
  });
  const projectionIds = new Set(
    projections.map(({ scenarioId }) => scenarioId),
  );
  return currentRecords.flatMap(({ record, path }) => {
    const missingPredecessor = record.predecessorScenarioIds.find(
      (scenarioId) => !projectionIds.has(scenarioId),
    );
    if (missingPredecessor !== undefined) {
      return [
        {
          tag: "invalidRelationshipRecord" as const,
          path,
          message: `Rejected Candidate comparison names predecessor ${missingPredecessor}, which is absent from the canonical admitted catalogue.`,
        },
      ];
    }
    const predecessorIdsFromBatches = record.predecessorBatches.flatMap(
      ({ scenarioIds }) => scenarioIds,
    );
    if (
      record.predecessorBatches.some(
        ({ batchIndex }, position) => batchIndex !== position,
      ) ||
      predecessorIdsFromBatches.length !==
        record.predecessorScenarioIds.length ||
      new Set(predecessorIdsFromBatches).size !==
        predecessorIdsFromBatches.length ||
      !predecessorIdsFromBatches.every((scenarioId) =>
        record.predecessorScenarioIds.includes(scenarioId),
      )
    ) {
      return [
        {
          tag: "invalidRelationshipRecord" as const,
          path,
          message:
            "Rejected Candidate comparison retained a predecessor boundary whose ids and batches disagree.",
        },
      ];
    }
    const comparison = validateScenarioCatalogueComparison({
      comparison: record.catalogueComparison,
      expectedScenarioIds: record.predecessorScenarioIds,
      expectedBatches: record.predecessorBatches,
    });
    return Result.isFailure(comparison)
      ? [
          {
            tag: "invalidRelationshipRecord" as const,
            path,
            message: `Catalogue comparison is incomplete: ${comparison.failure}`,
          },
        ]
      : [];
  });
}

function validateCurrentAdmissionComparisons(input: {
  readonly reads: readonly ScenarioCatalogueReadSource[];
  readonly scenarios: readonly ScenarioCatalogueSource[];
}): readonly CatalogueReadFailure[] {
  const projections = projectScenarioCatalogueForAuthoring({
    scenarios: input.scenarios,
  });
  const projectionById = new Map(
    projections.map((projection) => [projection.scenarioId, projection]),
  );
  return input.reads.flatMap(({ path, source, admissionComparison }) => {
    if (admissionComparison.tag === "historical") {
      return isCurrentAdmittedScenarioRecord(source)
        ? [
            {
              tag: "invalidCatalogueRecord" as const,
              path,
              message:
                "A current admitted Scenario record must retain its current catalogue comparison.",
            },
          ]
        : [];
    }
    if (!isCurrentAdmittedScenarioRecord(source)) {
      return [
        {
          tag: "invalidCatalogueRecord" as const,
          path,
          message:
            "A current catalogue comparison requires a current admitted Scenario record with its predecessor boundary.",
        },
      ];
    }
    if (source.predecessorScenarioIds.includes(source.scenarioId)) {
      return [
        {
          tag: "invalidCatalogueRecord" as const,
          path,
          message:
            "An admitted Scenario comparison cannot include the Scenario being admitted.",
        },
      ];
    }
    const predecessorProjections: ScenarioCatalogueProjection[] = [];
    for (const scenarioId of source.predecessorScenarioIds) {
      const projection = projectionById.get(scenarioId);
      if (projection === undefined) {
        return [
          {
            tag: "invalidCatalogueRecord" as const,
            path,
            message:
              "An admitted Scenario comparison names a predecessor absent from the canonical catalogue.",
          },
        ];
      }
      predecessorProjections.push(projection);
    }
    const batches = batchScenarioCatalogueProjections(predecessorProjections);
    if (Result.isFailure(batches)) {
      return [
        {
          tag: "invalidCatalogueRecord" as const,
          path,
          message: `Canonical predecessor batching failed: ${batches.failure}`,
        },
      ];
    }
    const comparison = validateScenarioCatalogueComparison({
      comparison: admissionComparison.comparison,
      expectedScenarioIds: source.predecessorScenarioIds,
      expectedBatches: batches.success.map((batch, batchIndex) => ({
        batchIndex,
        scenarioIds: batch.map(({ scenarioId }) => scenarioId),
      })),
    });
    return Result.isFailure(comparison)
      ? [
          {
            tag: "invalidCatalogueRecord" as const,
            path,
            message: `Catalogue comparison is incomplete at its admission boundary: ${comparison.failure}`,
          },
        ]
      : [];
  });
}

function readAuthority(
  repositoryRoot: string,
  authority: ArtifactAuthority,
  role: "authoredSource" | "admissionReview" | "stageFacts",
): Result.Result<string, CatalogueReadFailure> {
  const canonicalPath = canonicalRepositoryReadPath(
    repositoryRoot,
    authority.path,
  );
  if (Result.isFailure(canonicalPath)) {
    return Result.fail({
      tag: "unreadableCatalogueAuthority",
      path: authority.path,
    });
  }
  try {
    const bytes = readFileSync(canonicalPath.success);
    if (
      bytes.byteLength !== authority.byteLength ||
      createHash("sha256").update(bytes).digest("hex") !== authority.sha256
    ) {
      return Result.fail({
        tag: "catalogueAuthorityMismatch",
        path: authority.path,
        role,
      });
    }
    return Result.succeed(bytes.toString("utf8"));
  } catch {
    return Result.fail({
      tag: "unreadableCatalogueAuthority",
      path: authority.path,
    });
  }
}

function readScenarioCatalogueSource(
  repositoryRoot: string,
  path: string,
  scope: ScenarioCatalogueScope,
): Result.Result<
  ScenarioCatalogueReadSource,
  NonEmptyIssues<CatalogueReadFailure>
> {
  const canonicalRecordPath = canonicalRepositoryReadPath(repositoryRoot, path);
  if (Result.isFailure(canonicalRecordPath)) {
    return Result.fail([{ tag: "unreadableCatalogueAuthority", path }]);
  }
  const recordPath = canonicalRecordPath.success;
  const input = Result.try({
    try: (): unknown => JSON.parse(readFileSync(recordPath, "utf8")),
    catch: (): CatalogueReadFailure => ({
      tag: "unreadableCatalogueAuthority",
      path: recordPath,
    }),
  });
  if (Result.isFailure(input)) return Result.fail([input.failure]);
  const decoded = Schema.decodeUnknownResult(AdmittedScenarioRecordSchema, {
    onExcessProperty: "error",
  })(input.success);
  if (Result.isFailure(decoded)) {
    return Result.fail([
      {
        tag: "invalidCatalogueRecord",
        path: recordPath,
        message: decoded.failure.message,
      },
    ]);
  }
  const record = decoded.success;
  const expectedName =
    scope === "live"
      ? `${record.scenarioId}.scenario.json`
      : `${record.scenarioId}.scenario.contained.json`;
  if (!recordPath.endsWith(`/${expectedName}`)) {
    return Result.fail([
      {
        tag: "catalogueScenarioIdentityMismatch",
        scenarioId: record.scenarioId,
        path: recordPath,
      },
    ]);
  }
  const prose = readAuthority(
    repositoryRoot,
    record.authoredSource,
    "authoredSource",
  );
  const reviewBytes = readAuthority(
    repositoryRoot,
    record.admissionReview,
    "admissionReview",
  );
  const factsBytes = readAuthority(
    repositoryRoot,
    record.stageFacts,
    "stageFacts",
  );
  const authorityIssues = nonEmptyIssues([
    ...(Result.isFailure(prose) ? [prose.failure] : []),
    ...(Result.isFailure(reviewBytes) ? [reviewBytes.failure] : []),
    ...(Result.isFailure(factsBytes) ? [factsBytes.failure] : []),
  ]);
  if (authorityIssues !== undefined) return Result.fail(authorityIssues);
  if (
    Result.isFailure(prose) ||
    Result.isFailure(reviewBytes) ||
    Result.isFailure(factsBytes)
  ) {
    return Result.fail([
      { tag: "unreadableCatalogueAuthority", path: recordPath },
    ]);
  }
  const review = Schema.decodeUnknownResult(
    Schema.fromJsonString(FinalScenarioReviewSchema),
    { onExcessProperty: "error" },
  )(reviewBytes.success);
  const facts = Schema.decodeUnknownResult(
    Schema.fromJsonString(ScenarioStageFactsAuthoritySchema),
    { onExcessProperty: "error" },
  )(factsBytes.success);
  const decodeIssues = nonEmptyIssues([
    ...(Result.isFailure(review)
      ? [
          {
            tag: "invalidCatalogueRecord",
            path: record.admissionReview.path,
            message: review.failure.message,
          } satisfies CatalogueReadFailure,
        ]
      : []),
    ...(Result.isFailure(facts)
      ? [
          {
            tag: "invalidCatalogueRecord",
            path: record.stageFacts.path,
            message: facts.failure.message,
          } satisfies CatalogueReadFailure,
        ]
      : []),
  ]);
  if (decodeIssues !== undefined) return Result.fail(decodeIssues);
  if (Result.isFailure(review) || Result.isFailure(facts)) {
    return Result.fail([
      {
        tag: "invalidCatalogueRecord",
        path: recordPath,
        message: "unreachable decode state",
      },
    ]);
  }
  const proseSha256 = createHash("sha256").update(prose.success).digest("hex");
  if (
    review.success.scenarioId !== record.scenarioId ||
    review.success.scenarioSha256 !== proseSha256 ||
    finalScenarioDisposition(review.success) !== "admitted" ||
    facts.success.scenarioId !== record.scenarioId ||
    facts.success.scenarioSha256 !== proseSha256
  ) {
    return Result.fail([
      {
        tag: "catalogueScenarioIdentityMismatch",
        scenarioId: record.scenarioId,
        path: recordPath,
      },
    ]);
  }
  return Result.succeed({
    path,
    source: {
      ...record,
      characterRequirement: facts.success.facts.characterRequirement,
      spatialRequirement: facts.success.facts.spatialRequirement,
      contentAvailability: scenarioContentAdmission(review.success),
      sdkCapability: scenarioSdkCapability(review.success),
    },
    admissionComparison:
      "catalogueComparison" in review.success
        ? { tag: "current", comparison: review.success.catalogueComparison }
        : { tag: "historical" },
  });
}

export function readRawSwarmCatalogue(
  input: Readonly<{
    readonly repositoryRoot: string;
    readonly scenarioDirectory: string;
    readonly evidenceDirectory: string;
  }>,
): Result.Result<RawSwarmCatalogue, NonEmptyIssues<CatalogueReadFailure>> {
  const canonicalScenarioDirectory = canonicalRepositoryReadPath(
    input.repositoryRoot,
    input.scenarioDirectory,
  );
  if (Result.isFailure(canonicalScenarioDirectory)) {
    return Result.fail([
      {
        tag: "unreadableCatalogueAuthority",
        path: input.scenarioDirectory,
      },
    ]);
  }
  const recordDiscoveryIssues: CatalogueReadFailure[] = [];
  const recordNames = Result.try({
    try: () => readdirSync(canonicalScenarioDirectory.success).sort(),
    catch: (): CatalogueReadFailure => ({
      tag: "unreadableCatalogueAuthority",
      path: canonicalScenarioDirectory.success,
    }),
  });
  if (Result.isFailure(recordNames)) return Result.fail([recordNames.failure]);
  const discoverRecordPaths = (suffix: string): readonly string[] =>
    recordNames.success
      .filter((name) => name.endsWith(suffix))
      .flatMap((name) => {
        const canonicalRecordPath = canonicalRepositoryReadPath(
          input.repositoryRoot,
          resolve(canonicalScenarioDirectory.success, name),
        );
        if (Result.isFailure(canonicalRecordPath)) {
          recordDiscoveryIssues.push({
            tag: "unreadableCatalogueAuthority",
            path: resolve(canonicalScenarioDirectory.success, name),
          });
          return [];
        }
        return [canonicalRecordPath.success];
      });
  const liveRecordPaths = discoverRecordPaths(".scenario.json").filter(
    (path) => !path.endsWith(".scenario.contained.json"),
  );
  const containedRecordPaths = discoverRecordPaths(".scenario.contained.json");
  const liveScenarioReads: ScenarioCatalogueReadSource[] = [];
  const containedScenarioReads: ScenarioCatalogueReadSource[] = [];
  const scenarioIssues: CatalogueReadFailure[] = [...recordDiscoveryIssues];
  for (const path of liveRecordPaths) {
    const scenario = readScenarioCatalogueSource(
      input.repositoryRoot,
      path,
      "live",
    );
    if (Result.isFailure(scenario)) scenarioIssues.push(...scenario.failure);
    else liveScenarioReads.push(scenario.success);
  }
  for (const path of containedRecordPaths) {
    const scenario = readScenarioCatalogueSource(
      input.repositoryRoot,
      path,
      "contained",
    );
    if (Result.isFailure(scenario)) scenarioIssues.push(...scenario.failure);
    else containedScenarioReads.push(scenario.success);
  }
  const scenarios = liveScenarioReads.map(({ source }) => source);
  const containedScenarios = containedScenarioReads.map(({ source }) => source);
  const allScenarios = [...scenarios, ...containedScenarios];
  const relationshipPaths = relationshipRecordPaths(
    input.repositoryRoot,
    input.evidenceDirectory,
  );
  const executions = readRelationshipRecords(
    relationshipPaths.executions,
    ScenarioExecutionRecordSchema,
  );
  const executionProfiles = readRelationshipRecords(
    relationshipPaths.executionProfiles,
    BenchmarkExecutionProfileDescriptorSchema,
  );
  const benchmarks = readRelationshipRecords(
    relationshipPaths.benchmarks,
    BenchmarkRecordPersistenceSchema,
  );
  const rejectedCandidates = readRelationshipRecords(
    relationshipPaths.rejections,
    RejectedScenarioCandidateRecordSchema,
  );
  const readIssues = nonEmptyIssues([
    ...scenarioIssues,
    ...relationshipPaths.issues,
    ...(Result.isFailure(executions) ? executions.failure : []),
    ...(Result.isFailure(executionProfiles) ? executionProfiles.failure : []),
    ...(Result.isFailure(benchmarks) ? benchmarks.failure : []),
    ...(Result.isFailure(rejectedCandidates) ? rejectedCandidates.failure : []),
  ]);
  if (readIssues !== undefined) return Result.fail(readIssues);
  if (Result.isFailure(executions)) return Result.fail(executions.failure);
  if (Result.isFailure(executionProfiles))
    return Result.fail(executionProfiles.failure);
  if (Result.isFailure(benchmarks)) return Result.fail(benchmarks.failure);
  if (Result.isFailure(rejectedCandidates))
    return Result.fail(rejectedCandidates.failure);
  const rejectionComparisonIssues = validateRejectedCandidateComparisons({
    records: rejectedCandidates.success,
    paths: relationshipPaths.rejections,
    scenarios: allScenarios,
  });
  const liveAdmissionComparisonIssues = validateCurrentAdmissionComparisons({
    reads: liveScenarioReads,
    scenarios,
  });
  const containedAdmissionComparisonIssues =
    validateCurrentAdmissionComparisons({
      reads: containedScenarioReads,
      scenarios: allScenarios,
    });
  const admissionComparisonIssues = [
    ...liveAdmissionComparisonIssues,
    ...containedAdmissionComparisonIssues,
  ];
  const allReadIssues = nonEmptyIssues([
    ...rejectionComparisonIssues,
    ...admissionComparisonIssues,
  ]);
  if (allReadIssues !== undefined) return Result.fail(allReadIssues);
  return projectRawSwarmCatalogue({
    scenarios,
    containedScenarios,
    executions: executions.success,
    executionProfiles: executionProfiles.success,
    benchmarks: benchmarks.success,
    rejectedCandidates: rejectedCandidates.success,
  });
}
