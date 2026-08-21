import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { Either, Match, Schema } from "effect";

import type { ArtifactAuthority } from "./artifact-authority.ts";
import {
  BenchmarkIdSchema,
  EvidenceSetIdSchema,
  ExecutionIdSchema,
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
      readonly catalogueComparison: Schema.Schema.Type<
        typeof ScenarioCatalogueComparisonSchema
      >;
    }>;

export type RejectedScenarioCandidateRecord =
  | HistoricalRejectedScenarioCandidateRecord
  | CurrentRejectedScenarioCandidateRecord;

export const ScenarioExecutionRecordSchema = ScenarioExecutionIdentitySchema;

const BenchmarkComparisonTargetSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("execution"),
    executionId: ExecutionIdSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("executionProfile"),
    executionId: ExecutionIdSchema,
  }),
);

export const BenchmarkRecordSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  benchmarkId: BenchmarkIdSchema,
  evidenceSetId: EvidenceSetIdSchema,
  comparisonTargets: Schema.Tuple(
    [BenchmarkComparisonTargetSchema, BenchmarkComparisonTargetSchema],
    BenchmarkComparisonTargetSchema,
  ).pipe(
    Schema.filter(
      (targets) =>
        new Set(targets.map(({ executionId }) => executionId)).size ===
        targets.length,
      {
        message: () => "benchmark comparison target identities must be unique",
      },
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
  reason: Schema.NonEmptyTrimmedString,
});

const CurrentRejectedScenarioCandidateRecordSchema = Schema.Struct({
  ...HistoricalRejectedScenarioCandidateRecordSchema.fields,
  catalogueComparison: ScenarioCatalogueComparisonSchema,
});

export const RejectedScenarioCandidateRecordSchema = Schema.Union(
  CurrentRejectedScenarioCandidateRecordSchema,
  HistoricalRejectedScenarioCandidateRecordSchema,
);

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
  readonly scenarios: readonly (ScenarioCatalogueSource & {
    readonly executionIds: readonly ExecutionId[];
    readonly benchmarkIds: readonly BenchmarkId[];
  })[];
  readonly rejectedCandidates: readonly RejectedScenarioCandidateRecord[];
}>;

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
    readonly scenarios: readonly ScenarioCatalogueSource[];
    readonly executions: readonly ScenarioExecutionRecord[];
    /** Profile records remain distinct from ordinary execution records. */
    readonly executionProfiles?: readonly BenchmarkExecutionProfileDescriptor[];
    readonly benchmarks: readonly BenchmarkRecord[];
    readonly rejectedCandidates: readonly RejectedScenarioCandidateRecord[];
  }>,
): Either.Either<RawSwarmCatalogue, NonEmptyIssues<ScenarioCatalogueFailure>> {
  const issues: ScenarioCatalogueFailure[] = [];
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
    input.scenarios.map(({ scenarioId }) => scenarioId),
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
    input.scenarios.map(({ scenarioId }) => scenarioId),
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
  if (catalogueIssues !== undefined) return Either.left(catalogueIssues);

  const scenarios = [...input.scenarios]
    .sort((left, right) =>
      String(left.scenarioId).localeCompare(String(right.scenarioId)),
    )
    .map((scenario) => {
      const executions = input.executions
        .concat(
          (input.executionProfiles ?? []).map(
            ({ schemaVersion, executionId, scenarioId, evidenceSetId }) => ({
              schemaVersion,
              executionId,
              scenarioId,
              evidenceSetId,
            }),
          ),
        )
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

  return Either.right({
    scenarios,
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
  if (Either.isLeft(canonicalRoot)) {
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
  const pending = [canonicalRoot.right];
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
        if (Either.isLeft(canonicalPath)) {
          issues.push({
            tag: "unreadableEvidenceDirectory",
            path,
          });
          continue;
        }
        const isDirectory = entry.isDirectory()
          ? true
          : entry.isSymbolicLink() &&
            statSync(canonicalPath.right).isDirectory();
        if (isDirectory) {
          pending.push(canonicalPath.right);
        } else if (entry.name === "execution.json") {
          executions.push(canonicalPath.right);
        } else if (entry.name === "execution-profile.json") {
          executionProfiles.push(canonicalPath.right);
        } else if (entry.name === "benchmark.json") {
          benchmarks.push(canonicalPath.right);
        } else if (entry.name === "candidate-rejection.json") {
          rejections.push(canonicalPath.right);
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
  schema: Schema.Schema<A, I, never>,
): Either.Either<readonly A[], NonEmptyIssues<CatalogueReadFailure>> {
  const records: A[] = [];
  const issues: CatalogueReadFailure[] = [];
  for (const path of paths) {
    try {
      const decoded = Schema.decodeUnknownEither(schema, {
        onExcessProperty: "error",
      })(JSON.parse(readFileSync(path, "utf8")));
      if (Either.isLeft(decoded)) {
        issues.push({
          tag: "invalidRelationshipRecord",
          path,
          message: decoded.left.message,
        });
      } else {
        records.push(decoded.right);
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
    ? Either.right(records)
    : Either.left(relationshipIssues);
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
  const batches = batchScenarioCatalogueProjections(projections);
  if (Either.isLeft(batches)) {
    return currentRecords.map(({ path }) => ({
      tag: "invalidRelationshipRecord" as const,
      path,
      message: `Canonical catalogue batching failed before rejection comparison validation: ${batches.left}`,
    }));
  }
  const expectedScenarioIds = projections.map(({ scenarioId }) => scenarioId);
  const expectedBatches = batches.right.map((batch, batchIndex) => ({
    batchIndex,
    scenarioIds: batch.map(({ scenarioId }) => scenarioId),
  }));
  return currentRecords.flatMap(({ record, path }) => {
    const comparison = validateScenarioCatalogueComparison({
      comparison: record.catalogueComparison,
      expectedScenarioIds,
      expectedBatches,
    });
    return Either.isLeft(comparison)
      ? [
          {
            tag: "invalidRelationshipRecord" as const,
            path,
            message: `Catalogue comparison is incomplete: ${comparison.left}`,
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
    if (Either.isLeft(batches)) {
      return [
        {
          tag: "invalidCatalogueRecord" as const,
          path,
          message: `Canonical predecessor batching failed: ${batches.left}`,
        },
      ];
    }
    const comparison = validateScenarioCatalogueComparison({
      comparison: admissionComparison.comparison,
      expectedScenarioIds: source.predecessorScenarioIds,
      expectedBatches: batches.right.map((batch, batchIndex) => ({
        batchIndex,
        scenarioIds: batch.map(({ scenarioId }) => scenarioId),
      })),
    });
    return Either.isLeft(comparison)
      ? [
          {
            tag: "invalidCatalogueRecord" as const,
            path,
            message: `Catalogue comparison is incomplete at its admission boundary: ${comparison.left}`,
          },
        ]
      : [];
  });
}

function readAuthority(
  repositoryRoot: string,
  authority: ArtifactAuthority,
  role: "authoredSource" | "admissionReview" | "stageFacts",
): Either.Either<string, CatalogueReadFailure> {
  const canonicalPath = canonicalRepositoryReadPath(
    repositoryRoot,
    authority.path,
  );
  if (Either.isLeft(canonicalPath)) {
    return Either.left({
      tag: "unreadableCatalogueAuthority",
      path: authority.path,
    });
  }
  try {
    const bytes = readFileSync(canonicalPath.right);
    if (
      bytes.byteLength !== authority.byteLength ||
      createHash("sha256").update(bytes).digest("hex") !== authority.sha256
    ) {
      return Either.left({
        tag: "catalogueAuthorityMismatch",
        path: authority.path,
        role,
      });
    }
    return Either.right(bytes.toString("utf8"));
  } catch {
    return Either.left({
      tag: "unreadableCatalogueAuthority",
      path: authority.path,
    });
  }
}

function readScenarioCatalogueSource(
  repositoryRoot: string,
  path: string,
): Either.Either<
  ScenarioCatalogueReadSource,
  NonEmptyIssues<CatalogueReadFailure>
> {
  const canonicalRecordPath = canonicalRepositoryReadPath(repositoryRoot, path);
  if (Either.isLeft(canonicalRecordPath)) {
    return Either.left([{ tag: "unreadableCatalogueAuthority", path }]);
  }
  const recordPath = canonicalRecordPath.right;
  const input = Either.try({
    try: (): unknown => JSON.parse(readFileSync(recordPath, "utf8")),
    catch: (): CatalogueReadFailure => ({
      tag: "unreadableCatalogueAuthority",
      path: recordPath,
    }),
  });
  if (Either.isLeft(input)) return Either.left([input.left]);
  const decoded = Schema.decodeUnknownEither(AdmittedScenarioRecordSchema, {
    onExcessProperty: "error",
  })(input.right);
  if (Either.isLeft(decoded)) {
    return Either.left([
      {
        tag: "invalidCatalogueRecord",
        path: recordPath,
        message: decoded.left.message,
      },
    ]);
  }
  const record = decoded.right;
  const expectedName = `${record.scenarioId}.scenario.json`;
  if (!recordPath.endsWith(`/${expectedName}`)) {
    return Either.left([
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
    ...(Either.isLeft(prose) ? [prose.left] : []),
    ...(Either.isLeft(reviewBytes) ? [reviewBytes.left] : []),
    ...(Either.isLeft(factsBytes) ? [factsBytes.left] : []),
  ]);
  if (authorityIssues !== undefined) return Either.left(authorityIssues);
  if (
    Either.isLeft(prose) ||
    Either.isLeft(reviewBytes) ||
    Either.isLeft(factsBytes)
  ) {
    return Either.left([
      { tag: "unreadableCatalogueAuthority", path: recordPath },
    ]);
  }
  const review = Schema.decodeUnknownEither(
    Schema.parseJson(FinalScenarioReviewSchema),
    { onExcessProperty: "error" },
  )(reviewBytes.right);
  const facts = Schema.decodeUnknownEither(
    Schema.parseJson(ScenarioStageFactsAuthoritySchema),
    { onExcessProperty: "error" },
  )(factsBytes.right);
  const decodeIssues = nonEmptyIssues([
    ...(Either.isLeft(review)
      ? [
          {
            tag: "invalidCatalogueRecord",
            path: record.admissionReview.path,
            message: review.left.message,
          } satisfies CatalogueReadFailure,
        ]
      : []),
    ...(Either.isLeft(facts)
      ? [
          {
            tag: "invalidCatalogueRecord",
            path: record.stageFacts.path,
            message: facts.left.message,
          } satisfies CatalogueReadFailure,
        ]
      : []),
  ]);
  if (decodeIssues !== undefined) return Either.left(decodeIssues);
  if (Either.isLeft(review) || Either.isLeft(facts)) {
    return Either.left([
      {
        tag: "invalidCatalogueRecord",
        path: recordPath,
        message: "unreachable decode state",
      },
    ]);
  }
  const proseSha256 = createHash("sha256").update(prose.right).digest("hex");
  if (
    review.right.scenarioId !== record.scenarioId ||
    review.right.scenarioSha256 !== proseSha256 ||
    finalScenarioDisposition(review.right) !== "admitted" ||
    facts.right.scenarioId !== record.scenarioId ||
    facts.right.scenarioSha256 !== proseSha256
  ) {
    return Either.left([
      {
        tag: "catalogueScenarioIdentityMismatch",
        scenarioId: record.scenarioId,
        path: recordPath,
      },
    ]);
  }
  return Either.right({
    path,
    source: {
      ...record,
      characterRequirement: facts.right.facts.characterRequirement,
      spatialRequirement: facts.right.facts.spatialRequirement,
      contentAvailability: scenarioContentAdmission(review.right),
      sdkCapability: scenarioSdkCapability(review.right),
    },
    admissionComparison:
      "catalogueComparison" in review.right
        ? { tag: "current", comparison: review.right.catalogueComparison }
        : { tag: "historical" },
  });
}

export function readRawSwarmCatalogue(
  input: Readonly<{
    readonly repositoryRoot: string;
    readonly scenarioDirectory: string;
    readonly evidenceDirectory: string;
  }>,
): Either.Either<RawSwarmCatalogue, NonEmptyIssues<CatalogueReadFailure>> {
  const canonicalScenarioDirectory = canonicalRepositoryReadPath(
    input.repositoryRoot,
    input.scenarioDirectory,
  );
  if (Either.isLeft(canonicalScenarioDirectory)) {
    return Either.left([
      {
        tag: "unreadableCatalogueAuthority",
        path: input.scenarioDirectory,
      },
    ]);
  }
  const recordDiscoveryIssues: CatalogueReadFailure[] = [];
  const recordPaths = Either.try({
    try: () =>
      readdirSync(canonicalScenarioDirectory.right)
        .filter((name) => name.endsWith(".scenario.json"))
        .sort()
        .flatMap((name) => {
          const canonicalRecordPath = canonicalRepositoryReadPath(
            input.repositoryRoot,
            resolve(canonicalScenarioDirectory.right, name),
          );
          if (Either.isLeft(canonicalRecordPath)) {
            recordDiscoveryIssues.push({
              tag: "unreadableCatalogueAuthority",
              path: resolve(canonicalScenarioDirectory.right, name),
            });
            return [];
          }
          return [canonicalRecordPath.right];
        }),
    catch: (): CatalogueReadFailure => ({
      tag: "unreadableCatalogueAuthority",
      path: canonicalScenarioDirectory.right,
    }),
  });
  if (Either.isLeft(recordPaths)) return Either.left([recordPaths.left]);
  const scenarioReads: ScenarioCatalogueReadSource[] = [];
  const scenarioIssues: CatalogueReadFailure[] = [...recordDiscoveryIssues];
  for (const path of recordPaths.right) {
    const scenario = readScenarioCatalogueSource(input.repositoryRoot, path);
    if (Either.isLeft(scenario)) scenarioIssues.push(...scenario.left);
    else scenarioReads.push(scenario.right);
  }
  const scenarios = scenarioReads.map(({ source }) => source);
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
    BenchmarkRecordSchema,
  );
  const rejectedCandidates = readRelationshipRecords(
    relationshipPaths.rejections,
    RejectedScenarioCandidateRecordSchema,
  );
  const readIssues = nonEmptyIssues([
    ...scenarioIssues,
    ...relationshipPaths.issues,
    ...(Either.isLeft(executions) ? executions.left : []),
    ...(Either.isLeft(executionProfiles) ? executionProfiles.left : []),
    ...(Either.isLeft(benchmarks) ? benchmarks.left : []),
    ...(Either.isLeft(rejectedCandidates) ? rejectedCandidates.left : []),
  ]);
  if (readIssues !== undefined) return Either.left(readIssues);
  if (Either.isLeft(executions)) return Either.left(executions.left);
  if (Either.isLeft(executionProfiles))
    return Either.left(executionProfiles.left);
  if (Either.isLeft(benchmarks)) return Either.left(benchmarks.left);
  if (Either.isLeft(rejectedCandidates))
    return Either.left(rejectedCandidates.left);
  const rejectionComparisonIssues = validateRejectedCandidateComparisons({
    records: rejectedCandidates.right,
    paths: relationshipPaths.rejections,
    scenarios,
  });
  const admissionComparisonIssues = validateCurrentAdmissionComparisons({
    reads: scenarioReads,
    scenarios,
  });
  const allReadIssues = nonEmptyIssues([
    ...rejectionComparisonIssues,
    ...admissionComparisonIssues,
  ]);
  if (allReadIssues !== undefined) return Either.left(allReadIssues);
  return projectRawSwarmCatalogue({
    scenarios,
    executions: executions.right,
    executionProfiles: executionProfiles.right,
    benchmarks: benchmarks.right,
    rejectedCandidates: rejectedCandidates.right,
  });
}
