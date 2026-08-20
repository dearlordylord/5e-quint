import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import { Either, Match, Schema } from "effect";

import type { ArtifactAuthority } from "./artifact-authority.ts";
import {
  BenchmarkIdSchema,
  EvidenceSetIdSchema,
  ExecutionIdSchema,
  ScenarioCampaignIdSchema,
  ScenarioCandidateIdSchema,
  ScenarioIdSchema,
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
import { ScenarioStageFactsAuthoritySchema } from "./stage-plan-authority.ts";
import {
  AdmittedScenarioRecordSchema,
  type AdmittedScenarioRecord,
} from "./scenario-admission.ts";

export { AdmittedScenarioRecordSchema, type AdmittedScenarioRecord };

type ScenarioCatalogueSource = AdmittedScenarioRecord &
  Readonly<{
    readonly characterRequirement: Schema.Schema.Type<
      typeof ScenarioStageFactsAuthoritySchema
    >["facts"]["characterRequirement"];
    readonly spatialRequirement: Schema.Schema.Type<
      typeof ScenarioStageFactsAuthoritySchema
    >["facts"]["spatialRequirement"];
    readonly admission: "admitted";
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

export type BenchmarkRecord = Readonly<{
  readonly schemaVersion: 1;
  readonly benchmarkId: BenchmarkId;
  readonly evidenceSetId: EvidenceSetId;
  readonly executionIds: readonly [ExecutionId, ExecutionId, ...ExecutionId[]];
}>;

export type RejectedScenarioCandidateRecord = Readonly<{
  readonly schemaVersion: 1;
  readonly candidateId: ScenarioCandidateId;
  readonly campaignId: ScenarioCampaignId;
  readonly evidenceSetId: EvidenceSetId;
  readonly reason: string;
}>;

export const ScenarioExecutionRecordSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  executionId: ExecutionIdSchema,
  scenarioId: ScenarioIdSchema,
  evidenceSetId: EvidenceSetIdSchema,
});

export const BenchmarkRecordSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  benchmarkId: BenchmarkIdSchema,
  evidenceSetId: EvidenceSetIdSchema,
  executionIds: Schema.Tuple(
    [ExecutionIdSchema, ExecutionIdSchema],
    ExecutionIdSchema,
  ).pipe(
    Schema.filter((ids) => new Set(ids).size === ids.length, {
      message: () => "benchmark execution ids must be unique",
    }),
  ),
});

export const RejectedScenarioCandidateRecordSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  candidateId: ScenarioCandidateIdSchema,
  campaignId: ScenarioCampaignIdSchema,
  evidenceSetId: EvidenceSetIdSchema,
  reason: Schema.NonEmptyTrimmedString,
});

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
    readonly benchmarks: readonly BenchmarkRecord[];
    readonly rejectedCandidates: readonly RejectedScenarioCandidateRecord[];
  }>,
): Either.Either<RawSwarmCatalogue, NonEmptyIssues<ScenarioCatalogueFailure>> {
  const issues: ScenarioCatalogueFailure[] = [];
  for (const scenarioId of duplicates(
    input.scenarios.map(({ scenarioId }) => scenarioId),
  )) {
    issues.push({
      tag: "duplicateScenarioId",
      scenarioId,
    });
  }
  const duplicateExecutionIds = duplicates(
    input.executions.map(({ executionId }) => executionId),
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
    for (const executionId of duplicates(benchmark.executionIds)) {
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
    ...input.executions.map(({ evidenceSetId }) => evidenceSetId),
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
  for (const execution of input.executions) {
    if (!scenarioIds.has(execution.scenarioId)) {
      issues.push({
        tag: "danglingExecutionScenario",
        executionId: execution.executionId,
        scenarioId: execution.scenarioId,
      });
    }
  }
  const executionIds = new Set(
    input.executions.map(({ executionId }) => executionId),
  );
  const scenarioIdByExecutionId = new Map(
    input.executions.map(({ executionId, scenarioId }) => [
      executionId,
      scenarioId,
    ]),
  );
  for (const benchmark of input.benchmarks) {
    const danglingExecutionIds = benchmark.executionIds.filter(
      (executionId) => !executionIds.has(executionId),
    );
    for (const executionId of danglingExecutionIds) {
      issues.push({
        tag: "danglingBenchmarkExecution",
        benchmarkId: benchmark.benchmarkId,
        executionId,
      });
    }
    if (
      danglingExecutionIds.length === 0 &&
      duplicateExecutionIds.length === 0 &&
      new Set(
        benchmark.executionIds.map((executionId) =>
          scenarioIdByExecutionId.get(executionId),
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
        .filter(({ scenarioId }) => scenarioId === scenario.scenarioId)
        .map(({ executionId }) => executionId)
        .sort((left, right) => String(left).localeCompare(String(right)));
      const relevantExecutionIds = new Set(executions);
      const benchmarkIds = input.benchmarks
        .filter(({ executionIds: children }) =>
          children.some((executionId) => relevantExecutionIds.has(executionId)),
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
  readonly benchmarks: readonly string[];
  readonly rejections: readonly string[];
  readonly issues: readonly CatalogueReadFailure[];
}>;

function relationshipRecordPaths(directory: string): RelationshipRecordPaths {
  if (!existsSync(directory)) {
    return { executions: [], benchmarks: [], rejections: [], issues: [] };
  }
  const executions: string[] = [];
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
  const path = resolve(repositoryRoot, authority.path);
  const repositoryRelative = relative(resolve(repositoryRoot), path);
  if (
    repositoryRelative === ".." ||
    repositoryRelative.startsWith("../") ||
    repositoryRelative.startsWith("..\\")
  ) {
    return Either.left({
      tag: "unreadableCatalogueAuthority",
      path: authority.path,
    });
  }
  try {
    const bytes = readFileSync(path);
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
  return Either.right({
    ...record,
    characterRequirement: facts.right.facts.characterRequirement,
    spatialRequirement: facts.right.facts.spatialRequirement,
    admission: "admitted",
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
  const scenarios: ScenarioCatalogueSource[] = [];
  const scenarioIssues: CatalogueReadFailure[] = [];
  for (const path of recordPaths.right) {
    const scenario = readScenarioCatalogueSource(input.repositoryRoot, path);
    if (Either.isLeft(scenario)) scenarioIssues.push(...scenario.left);
    else scenarios.push(scenario.right);
  }
  const relationshipPaths = relationshipRecordPaths(input.evidenceDirectory);
  const executions = readRelationshipRecords(
    relationshipPaths.executions,
    ScenarioExecutionRecordSchema,
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
    ...(Either.isLeft(benchmarks) ? benchmarks.left : []),
    ...(Either.isLeft(rejectedCandidates) ? rejectedCandidates.left : []),
  ]);
  if (readIssues !== undefined) return Either.left(readIssues);
  if (Either.isLeft(executions)) return Either.left(executions.left);
  if (Either.isLeft(benchmarks)) return Either.left(benchmarks.left);
  if (Either.isLeft(rejectedCandidates))
    return Either.left(rejectedCandidates.left);
  return projectRawSwarmCatalogue({
    scenarios,
    executions: executions.right,
    benchmarks: benchmarks.right,
    rejectedCandidates: rejectedCandidates.right,
  });
}
