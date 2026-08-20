import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
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
  ScenarioCatalogueComparisonSchema,
  validateScenarioCatalogueComparison,
} from "./scenario-authoring.ts";
import { ScenarioStageFactsAuthoritySchema } from "./stage-plan-authority.ts";
import {
  AdmittedScenarioRecordSchema,
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
      | Readonly<{
          readonly tag: "assessed";
          readonly admission: ScenarioSdkCapabilityAdmission;
        }>
      | Readonly<{ readonly tag: "notAssessed" }>;
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
      admission: {
        sdkCapabilityIntent: current.sdkCapabilityIntent,
        sdkCapabilityReview: current.sdkCapabilityReview,
      },
    })),
    Match.when(
      { sdkCapabilityIntent: "probeUnsupportedCapability" },
      (current) => ({
        tag: "assessed" as const,
        admission: {
          sdkCapabilityIntent: current.sdkCapabilityIntent,
          sdkCapabilityReview: current.sdkCapabilityReview,
        },
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

function relationshipRecordPaths(directory: string): RelationshipRecordPaths {
  if (!existsSync(directory)) {
    return {
      executions: [],
      executionProfiles: [],
      benchmarks: [],
      rejections: [],
      issues: [],
    };
  }
  const executions: string[] = [];
  const executionProfiles: string[] = [];
  const benchmarks: string[] = [];
  const rejections: string[] = [];
  const issues: CatalogueReadFailure[] = [];
  const pending = [directory];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) break;
    try {
      for (const entry of readdirSync(current, { withFileTypes: true })) {
        const path = resolve(current, entry.name);
        if (entry.isDirectory()) pending.push(path);
        else if (entry.isFile() && entry.name === "execution.json")
          executions.push(path);
        else if (entry.isFile() && entry.name === "execution-profile.json")
          executionProfiles.push(path);
        else if (entry.isFile() && entry.name === "benchmark.json")
          benchmarks.push(path);
        else if (entry.isFile() && entry.name === "candidate-rejection.json")
          rejections.push(path);
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
  expectedScenarioIds: readonly ScenarioId[],
): Either.Either<
  ScenarioCatalogueSource,
  NonEmptyIssues<CatalogueReadFailure>
> {
  const input = Either.try({
    try: (): unknown => JSON.parse(readFileSync(path, "utf8")),
    catch: (): CatalogueReadFailure => ({
      tag: "unreadableCatalogueAuthority",
      path,
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
        path,
        message: decoded.left.message,
      },
    ]);
  }
  const record = decoded.right;
  const expectedName = `${record.scenarioId}.scenario.json`;
  if (!path.endsWith(`/${expectedName}`)) {
    return Either.left([
      {
        tag: "catalogueScenarioIdentityMismatch",
        scenarioId: record.scenarioId,
        path,
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
    return Either.left([{ tag: "unreadableCatalogueAuthority", path }]);
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
        path,
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
        path,
      },
    ]);
  }
  if ("catalogueComparison" in review.right) {
    const comparison = validateScenarioCatalogueComparison({
      comparison: review.right.catalogueComparison,
      expectedScenarioIds,
    });
    if (Either.isLeft(comparison)) {
      return Either.left([
        {
          tag: "invalidCatalogueRecord",
          path: record.admissionReview.path,
          message: `Catalogue comparison is incomplete: ${comparison.left}`,
        },
      ]);
    }
  }
  return Either.right({
    ...record,
    characterRequirement: facts.right.facts.characterRequirement,
    spatialRequirement: facts.right.facts.spatialRequirement,
    contentAvailability: scenarioContentAdmission(review.right),
    sdkCapability: scenarioSdkCapability(review.right),
  });
}

export function readRawSwarmCatalogue(
  input: Readonly<{
    readonly repositoryRoot: string;
    readonly scenarioDirectory: string;
    readonly evidenceDirectory: string;
  }>,
): Either.Either<RawSwarmCatalogue, NonEmptyIssues<CatalogueReadFailure>> {
  const recordPaths = Either.try({
    try: () =>
      readdirSync(input.scenarioDirectory)
        .filter((name) => name.endsWith(".scenario.json"))
        .map((name) => resolve(input.scenarioDirectory, name)),
    catch: (): CatalogueReadFailure => ({
      tag: "unreadableCatalogueAuthority",
      path: input.scenarioDirectory,
    }),
  });
  if (Either.isLeft(recordPaths)) return Either.left([recordPaths.left]);
  const canonicalScenarioIds: ScenarioId[] = [];
  for (const path of recordPaths.right) {
    try {
      const decoded = Schema.decodeUnknownEither(AdmittedScenarioRecordSchema, {
        onExcessProperty: "error",
      })(JSON.parse(readFileSync(path, "utf8")));
      if (Either.isRight(decoded))
        canonicalScenarioIds.push(decoded.right.scenarioId);
    } catch {
      // The source reader below retains the detailed record failure.
    }
  }
  const scenarios: ScenarioCatalogueSource[] = [];
  const scenarioIssues: CatalogueReadFailure[] = [];
  for (const path of recordPaths.right) {
    const scenario = readScenarioCatalogueSource(
      input.repositoryRoot,
      path,
      canonicalScenarioIds,
    );
    if (Either.isLeft(scenario)) scenarioIssues.push(...scenario.left);
    else scenarios.push(scenario.right);
  }
  const relationshipPaths = relationshipRecordPaths(input.evidenceDirectory);
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
  return projectRawSwarmCatalogue({
    scenarios,
    executions: executions.right,
    executionProfiles: executionProfiles.right,
    benchmarks: benchmarks.right,
    rejectedCandidates: rejectedCandidates.right,
  });
}
