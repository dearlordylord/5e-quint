import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";
import { Either, Match, Schema } from "effect";

import {
  FinalScenarioReviewSchema,
  ScenarioCompositeReviewSchema,
  finalScenarioDisposition,
} from "./scenario-campaign.ts";
import { ReviewOutputSchema, VERDICT_CLASSES } from "./review-contract.ts";
import { artifactAuthorityForBytes } from "./artifact-authority.ts";
import {
  ScenarioStagePlanFindingsSchema,
  scenarioStagePlanFindings,
  validateScenarioStagePlan,
  type RawSwarmStageName,
  type ScenarioStagePlanFinding,
} from "./scenario-stage-plan.ts";
import {
  parseSdkTranscript,
  type SdkCallRecord,
} from "./sdk-player/sdk-transcript.ts";
import {
  modelInvocationScenarioReference,
  parseModelInvocationLedgerEntry,
  readCodexEventsWithSource,
  type CurrentModelInvocationLedgerEntry,
  type ModelInvocationLedgerEntry,
} from "./model-telemetry.ts";
import {
  canonicalJson,
  GitShaSchema,
  isJsonRecord,
  repoRoot,
  sha256Canonical,
  StartedAtSchema,
  type StartedAt,
} from "./transcript.ts";
import {
  RetainedScenarioReviewInputSchema,
  retainedScenarioReviewMatchesReplayBinding,
  type RetainedScenarioReviewBenchmarkIdentity,
  type RetainedScenarioReviewCampaignIdentity,
} from "./scenario-review-input.ts";
import { validateRetainedScenarioReviewInvocation } from "./review-invocation-binding.ts";
import { SdkReplayResultEvidenceSchema } from "./sdk-player/sdk-replay-result.ts";
import {
  EvidenceSetIdSchema,
  ExecutionIdSchema,
  type HistoricalScenarioId,
  PlannedScenarioIdSchema,
  ScenarioCampaignIdSchema,
  ScenarioIdSchema,
  type ScenarioCampaignId,
  type ScenarioCandidateId,
  type PlannedScenarioId,
  type ScenarioId,
} from "./raw-swarm-identities.ts";
import type { GitSha } from "./transcript.ts";
import {
  ExecutionStartRecordSchema,
  ScenarioCampaignManifestSchema,
} from "./evidence-manifests.ts";
import {
  canonicalRepositoryOutputPath,
  canonicalRepositoryReadPath,
} from "./repository-path.ts";

export const RAW_SWARM_FINDINGS_SCHEMA_VERSION = 2;

export const FINDING_CATEGORIES = [
  "runtime-rules-defect",
  "sdk-contract-defect",
  "sdk-usability-friction",
  "scenario-author-defect",
  "reviewer-defect",
  "model-controller-mistake",
  "experiment-boundary-obstruction",
  "informational-observation",
] as const;
export type FindingCategory = (typeof FINDING_CATEGORIES)[number];

export const FINDING_STAGES = [
  "generation",
  "character-authoring",
  "setup-authoring",
  "player",
  "review",
  "triage",
] as const;
export type FindingStage = (typeof FINDING_STAGES)[number];

export const FINDING_KINDS = [
  "generation-rejection",
  "generation-invocation-failure",
  "character-obstruction",
  "setup-obstruction",
  "pre-call-compilation-failure",
  "pre-call-runtime-failure",
  "malformed-submission",
  "successful-correction",
  "sdk-call-failure",
  "accepted-call-verdict",
  "promoted-issue",
  "informational-observation",
] as const;
export type FindingKind = (typeof FINDING_KINDS)[number];

const HashSchema = Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/));
const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThan(0),
);
const NonNegativeIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
);

const AuthoritySchema = Schema.Struct({
  role: Schema.NonEmptyTrimmedString,
  path: Schema.NonEmptyTrimmedString,
  byteLength: NonNegativeIntegerSchema,
  sha256: HashSchema,
});
export type FindingAuthority = Schema.Schema.Type<typeof AuthoritySchema>;

const ArtifactPointerSchema = Schema.Struct({
  kind: Schema.Literal("artifact"),
  authorityRole: Schema.NonEmptyTrimmedString,
  line: Schema.optional(PositiveIntegerSchema),
});
const SdkSequencePointerSchema = Schema.Struct({
  kind: Schema.Literal("sdkSequence"),
  authorityRole: Schema.NonEmptyTrimmedString,
  sequence: PositiveIntegerSchema,
});
const ReviewVerdictPointerSchema = Schema.Struct({
  kind: Schema.Literal("reviewVerdict"),
  authorityRole: Schema.NonEmptyTrimmedString,
  verdictIndex: PositiveIntegerSchema,
});
const IssuePointerSchema = Schema.Struct({
  kind: Schema.Literal("issue"),
  authorityRole: Schema.NonEmptyTrimmedString,
  fingerprint: HashSchema,
});
export const FindingPointerSchema = Schema.Union(
  ArtifactPointerSchema,
  SdkSequencePointerSchema,
  ReviewVerdictPointerSchema,
  IssuePointerSchema,
);
export type FindingPointer = Schema.Schema.Type<typeof FindingPointerSchema>;

const FindingSchema = Schema.Struct({
  findingId: HashSchema,
  stage: Schema.Literal(...FINDING_STAGES),
  category: Schema.Literal(...FINDING_CATEGORIES),
  kind: Schema.Literal(...FINDING_KINDS),
  summary: Schema.NonEmptyTrimmedString,
  detail: Schema.optional(Schema.NonEmptyTrimmedString),
  pointer: FindingPointerSchema,
  fingerprint: Schema.optional(HashSchema),
  githubIssueNumber: Schema.optional(PositiveIntegerSchema),
});
export type Finding = Schema.Schema.Type<typeof FindingSchema>;

const FindingsSubjectCommonFields = {
  gitSha: GitShaSchema,
  startedAt: StartedAtSchema,
} as const;

const FindingsSdkCallsSchema = Schema.Union(
  Schema.Struct({ tag: Schema.Literal("transcriptFree") }),
  Schema.Struct({
    tag: Schema.Literal("retainedTranscript"),
    transcriptSha256: HashSchema,
    callCount: NonNegativeIntegerSchema,
  }),
);

const FindingsSubjectSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("execution"),
    executionId: ExecutionIdSchema,
    evidenceSetId: EvidenceSetIdSchema,
    scenarioId: ScenarioIdSchema,
    ...FindingsSubjectCommonFields,
    sdkCalls: FindingsSdkCallsSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("scenarioCampaign"),
    campaignId: ScenarioCampaignIdSchema,
    evidenceSetId: EvidenceSetIdSchema,
    plannedScenarioId: PlannedScenarioIdSchema,
    ...FindingsSubjectCommonFields,
    sdkCalls: Schema.Struct({ tag: Schema.Literal("transcriptFree") }),
  }),
);
export type FindingsSubject = Schema.Schema.Type<typeof FindingsSubjectSchema>;

export function findingsTranscriptSha256(
  subject: FindingsSubject,
): string | undefined {
  return subject.sdkCalls.tag === "retainedTranscript"
    ? subject.sdkCalls.transcriptSha256
    : undefined;
}

export function findingsSdkCallCount(subject: FindingsSubject): number {
  return subject.sdkCalls.tag === "retainedTranscript"
    ? subject.sdkCalls.callCount
    : 0;
}

export const FindingsProjectionSchema = Schema.Struct({
  type: Schema.Literal("raw-swarm-findings"),
  schemaVersion: Schema.Literal(RAW_SWARM_FINDINGS_SCHEMA_VERSION),
  subjectIdentity: HashSchema,
  subject: FindingsSubjectSchema,
  authorities: Schema.Array(AuthoritySchema).pipe(Schema.minItems(1)),
  findings: Schema.Array(FindingSchema),
});
export type FindingsProjection = Schema.Schema.Type<
  typeof FindingsProjectionSchema
>;

export type FindingsProjectionResult =
  | { readonly tag: "valid"; readonly projection: FindingsProjection }
  | { readonly tag: "invalid"; readonly message: string };

export type FindingIssueLink = {
  readonly fingerprint: string;
  readonly githubIssueNumber?: number;
};

export type CompositeReviewReplaySelection =
  | {
      readonly tag: "finalOnly";
      readonly finalPath: string;
    }
  | {
      readonly tag: "milestoneAndFinal";
      readonly milestonePath: string;
      readonly finalPath: string;
    };

export type FindingsProjectionInput = {
  readonly transcriptPath: string;
  readonly evidenceSetDirectory?: string;
  readonly reviewPaths: readonly string[];
  readonly scenarioReviewPaths: readonly string[];
  readonly generationLedgerPaths: readonly string[];
  /** Original composite-review envelopes required by the owning stage plan. */
  readonly reviewReplay?: CompositeReviewReplaySelection;
  readonly issueLinks: readonly FindingIssueLink[];
};

type ParsedSourceAuthority = Readonly<
  Pick<FindingAuthority, "byteLength" | "sha256">
>;

const canonicalFindingAuthoritySnapshotBrand: unique symbol = Symbol(
  "canonicalFindingAuthoritySnapshot",
);
const canonicalFindingAuthoritySnapshots = new WeakSet<object>();
const canonicalFindingAuthoritySnapshotValues = new WeakMap<
  object,
  Readonly<{
    readonly authority: FindingAuthority;
    readonly bytes: Uint8Array;
  }>
>();

export type CanonicalFindingAuthoritySnapshot = Readonly<{
  readonly path: string;
  readonly [canonicalFindingAuthoritySnapshotBrand]: true;
}>;

export function canonicalFindingAuthoritySnapshotForBytes(
  authority: FindingAuthority,
  bytes: Uint8Array,
): Either.Either<CanonicalFindingAuthoritySnapshot, string> {
  const canonical: Either.Either<string, string> = (() => {
    try {
      return Either.right(sourcePath(authority.path));
    } catch (error: unknown) {
      return Either.left(
        error instanceof Error
          ? error.message
          : `Finding authority path is invalid: ${authority.path}.`,
      );
    }
  })();
  if (Either.isLeft(canonical)) return Either.left(canonical.left);
  if (canonical.right !== authority.path) {
    return Either.left(
      `Finding authority path is not repository-relative: ${authority.path}.`,
    );
  }
  const observed = artifactAuthorityForBytes(canonical.right, bytes);
  if (
    observed.byteLength !== authority.byteLength ||
    observed.sha256 !== authority.sha256
  ) {
    return Either.left(
      `Finding authority bytes do not match ${authority.path}.`,
    );
  }
  const snapshot = {
    path: authority.path,
    [canonicalFindingAuthoritySnapshotBrand]: true,
  } as const satisfies CanonicalFindingAuthoritySnapshot;
  canonicalFindingAuthoritySnapshots.add(snapshot);
  canonicalFindingAuthoritySnapshotValues.set(snapshot, {
    authority: {
      role: authority.role,
      path: authority.path,
      byteLength: authority.byteLength,
      sha256: authority.sha256,
    },
    bytes: Uint8Array.from(bytes),
  });
  return Either.right(snapshot);
}

const parsedSourceBrand: unique symbol = Symbol("parsedFindingSource");
const parsedSources = new WeakSet<object>();

type UnresolvedSource = Readonly<{
  readonly tag: "unresolved";
  readonly role: string;
  readonly path: string;
}>;

type ParsedSource = Readonly<{
  readonly tag: "parsed";
  readonly role: string;
  readonly path: string;
  /** Hash metadata derived from the bytes parsed for this source. */
  readonly authority: ParsedSourceAuthority;
  readonly [parsedSourceBrand]: true;
}>;

export type Source = UnresolvedSource | ParsedSource;

type ParsedRun = {
  readonly scenarioId: ScenarioId;
  readonly gitSha: GitSha;
  readonly startedAt: StartedAt;
  readonly scenarioSha256?: string;
  readonly scenarioReviewSha256?: string;
  readonly transcriptSha256: string;
  readonly callCount: number;
  readonly calls: readonly SdkCallRecord[];
  readonly characterObstruction?: string;
  readonly setupObstruction?: string;
};

export type ReviewIdentityExpectation = {
  readonly scenarioId: ScenarioId;
  readonly gitSha: GitSha;
  readonly transcriptSha256: string;
  readonly scenarioSha256?: string;
  readonly scenarioReviewSha256?: string;
  readonly candidateScenarioSha256?: string;
};

export type ScenarioReviewIdentityExpectation = {
  readonly scenarioId: ScenarioId;
  /** Generation and player runs may retain this artifact across commits. */
  readonly gitSha?: GitSha;
  readonly scenarioSha256?: string;
  readonly scenarioReviewSha256?: string;
};

export type StagePlanIdentityExpectation =
  | Readonly<{
      readonly tag: "candidate";
      readonly campaignId: ScenarioCampaignId;
      readonly candidateId: ScenarioCandidateId;
      readonly candidateScenarioSha256: string;
    }>
  | Readonly<{
      readonly tag: "admitted";
      readonly scenarioId: ScenarioId;
      readonly scenarioSha256: string;
      readonly scenarioReviewSha256: string;
    }>;

function stagePlanIdentitiesMatch(
  actual: ScenarioStagePlanFinding["identity"],
  expected: StagePlanIdentityExpectation,
): boolean {
  if (actual.tag !== expected.tag) return false;
  return Match.value(actual).pipe(
    Match.when(
      { tag: "candidate" },
      (candidate) =>
        expected.tag === "candidate" &&
        candidate.campaignId === expected.campaignId &&
        candidate.candidateId === expected.candidateId &&
        candidate.candidateScenarioSha256 === expected.candidateScenarioSha256,
    ),
    Match.when(
      { tag: "admitted" },
      (scenario) =>
        expected.tag === "admitted" &&
        scenario.scenarioId === expected.scenarioId &&
        scenario.scenarioSha256 === expected.scenarioSha256 &&
        scenario.scenarioReviewSha256 === expected.scenarioReviewSha256,
    ),
    Match.exhaustive,
  );
}

function fail(message: string): never {
  throw new Error(message);
}

function boundedText(value: string): string {
  const normalized = value.replaceAll("\u0000", "").trim();
  return normalized.length <= 2_048
    ? normalized
    : `${normalized.slice(0, 2_045)}...`;
}

export function authorityFor(source: Source): FindingAuthority {
  const canonical = sourcePath(source.path);
  if (source.tag === "parsed") {
    if (!parsedSources.has(source)) {
      fail("Parsed finding source is not an opaque cached source.");
    }
    if (source.path !== canonical) {
      fail(`Parsed finding authority path is not canonical: ${source.path}`);
    }
    return {
      role: source.role,
      path: canonical,
      ...source.authority,
    };
  }
  const authorityPath = canonicalRepositoryReadPath(repoRoot, canonical);
  if (Either.isLeft(authorityPath)) {
    fail(`Finding authority is unreadable: ${source.path}`);
  }
  const bytes = readFileSync(authorityPath.right);
  return {
    role: source.role,
    path: canonical,
    byteLength: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

export function unresolvedSource(input: {
  readonly role: string;
  readonly path: string;
}): UnresolvedSource {
  return {
    tag: "unresolved",
    role: input.role,
    path: sourcePath(input.path),
  };
}

export function readSourceWithAuthority(input: {
  readonly role: string;
  readonly path: string;
}): Either.Either<ParsedSource, string> {
  const source: Either.Either<UnresolvedSource, string> = (() => {
    try {
      return Either.right(unresolvedSource(input));
    } catch (error: unknown) {
      return Either.left(
        error instanceof Error ? error.message : "Finding source is invalid.",
      );
    }
  })();
  if (Either.isLeft(source)) return Either.left(source.left);
  const absolutePath = canonicalRepositoryReadPath(repoRoot, source.right.path);
  if (Either.isLeft(absolutePath)) return Either.left(absolutePath.left);
  const bytes = (() => {
    try {
      return Either.right(readFileSync(absolutePath.right));
    } catch {
      return Either.left(`Finding source ${source.right.path} is unreadable.`);
    }
  })();
  if (Either.isLeft(bytes)) return Either.left(bytes.left);
  return Either.right(sourceWithAuthority(source.right, bytes.right));
}

function sourceWithAuthority(
  source: UnresolvedSource,
  bytes: Uint8Array,
): ParsedSource {
  const canonical = sourcePath(source.path);
  const authority = artifactAuthorityForBytes(canonical, bytes);
  const parsed = {
    tag: "parsed",
    role: source.role,
    path: canonical,
    authority: {
      byteLength: authority.byteLength,
      sha256: authority.sha256,
    },
    [parsedSourceBrand]: true,
  } as const satisfies ParsedSource;
  parsedSources.add(parsed);
  return parsed;
}

export function sourcePath(path: string): string {
  const relativePath = (absolute: string): string => {
    const value = relative(repoRoot, absolute);
    if (value.length === 0) {
      fail(`Finding source must identify a repository file: ${path}`);
    }
    return value;
  };
  const read = canonicalRepositoryReadPath(repoRoot, path);
  if (Either.isRight(read)) return relativePath(read.right);
  const output = canonicalRepositoryOutputPath(repoRoot, path);
  if (Either.isRight(output)) return relativePath(output.right);
  fail(`Finding source is not repository-owned: ${path}: ${read.left}`);
}

type JsonLineRecord = {
  readonly value: unknown;
  /** One-based physical line, including blank lines before this record. */
  readonly line: number;
};

function readJsonLineRecords(path: string): readonly JsonLineRecord[] {
  const canonical = sourcePath(path);
  return readFileSync(resolve(repoRoot, canonical), "utf8")
    .split("\n")
    .flatMap((line, index) => {
      if (line.trim().length === 0) return [];
      try {
        return [{ value: JSON.parse(line) as unknown, line: index + 1 }];
      } catch {
        fail(
          `Finding source ${path} line ${String(index + 1)} is invalid JSON.`,
        );
      }
    });
}

function readJsonLines(path: string): readonly unknown[] {
  return readJsonLineRecords(path).map(({ value }) => value);
}

function authorityRoleFor(
  sources: readonly Source[],
  path: string,
  preferredRole: string,
): string {
  const existing = sources.find((source) => source.path === path);
  if (existing !== undefined) return existing.role;
  const roleTaken = sources.some((source) => source.role === preferredRole);
  return roleTaken
    ? `${preferredRole}-${String(
        sources.filter((source) => source.role.startsWith(preferredRole))
          .length + 1,
      )}`
    : preferredRole;
}

export function addSource(
  sources: Source[],
  path: string,
  preferredRole: string,
): string | undefined {
  const canonical = sourcePath(path);
  if (!existsSync(resolve(repoRoot, canonical))) return undefined;
  const role = authorityRoleFor(sources, canonical, preferredRole);
  if (!sources.some((source) => source.path === canonical)) {
    sources.push({ tag: "unresolved", role, path: canonical });
  }
  return role;
}

export function readSourceRecord(path: string): unknown {
  const canonical = sourcePath(path);
  try {
    return JSON.parse(readFileSync(resolve(repoRoot, canonical), "utf8"));
  } catch {
    return undefined;
  }
}

type RetainedScenarioReviewInputRead = Readonly<{
  readonly input: Schema.Schema.Type<typeof RetainedScenarioReviewInputSchema>;
  readonly bytes: Buffer;
}>;

function readSourceBytes(path: string): Either.Either<Buffer, string> {
  try {
    return Either.right(readFileSync(resolve(repoRoot, path)));
  } catch {
    return Either.left(`Finding source ${path} is unreadable.`);
  }
}

function readRetainedScenarioReviewInputOnce(
  path: string,
): Either.Either<RetainedScenarioReviewInputRead, string> {
  const canonical = sourcePath(path);
  const bytes = readSourceBytes(canonical);
  if (Either.isLeft(bytes)) {
    return Either.left(`Review replay input ${canonical} is unreadable.`);
  }
  const value: Either.Either<unknown, string> = (() => {
    try {
      return Either.right(JSON.parse(bytes.right.toString("utf8")) as unknown);
    } catch {
      return Either.left(`Review replay input ${canonical} is invalid JSON.`);
    }
  })();
  if (Either.isLeft(value)) return Either.left(value.left);
  const decoded = Schema.decodeUnknownEither(
    RetainedScenarioReviewInputSchema,
    { onExcessProperty: "error" },
  )(value.right);
  if (Either.isLeft(decoded)) {
    return Either.left(
      `Review replay input ${canonical} is invalid: ${decoded.left.message}`,
    );
  }
  return Either.right({
    input: decoded.right,
    bytes: bytes.right,
  });
}

function parseRun(transcriptPath: string): Either.Either<ParsedRun, string> {
  const canonicalTranscriptPath = sourcePath(transcriptPath);
  const records = (() => {
    try {
      return Either.right(readJsonLines(canonicalTranscriptPath));
    } catch (error) {
      return Either.left(
        `SDK transcript is malformed and cannot be projected: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  })();
  if (Either.isLeft(records)) {
    return Either.left(records.left);
  }
  const transcriptSha256 = createHash("sha256")
    .update(readFileSync(resolve(repoRoot, canonicalTranscriptPath)))
    .digest("hex");
  const sdk = parseSdkTranscript(records.right);
  if (sdk.tag === "valid") {
    const header = sdk.value.header;
    return Either.right({
      scenarioId: header.scenarioId,
      gitSha: header.gitSha,
      startedAt: header.startedAt,
      scenarioSha256: header.scenarioSha256,
      scenarioReviewSha256: header.scenarioReviewSha256,
      transcriptSha256,
      callCount: sdk.value.calls.length,
      calls: sdk.value.calls,
      ...(header.characterOutcome === "obstructed"
        ? { characterObstruction: header.obstruction }
        : {}),
      ...(header.characterOutcome === "ready" &&
      header.setupOutcome === "obstructed"
        ? { setupObstruction: header.obstruction }
        : {}),
    });
  }
  return Either.left(
    `SDK transcript is malformed and cannot be projected: ${sdk.message}`,
  );
}

function assertReviewOutputIdentity(
  path: string,
  review: Schema.Schema.Type<typeof ReviewOutputSchema>,
  expected: ReviewIdentityExpectation | undefined,
): void {
  if (
    expected !== undefined &&
    (review.scenarioId !== expected.scenarioId ||
      review.gitSha !== expected.gitSha ||
      review.transcriptSha256 !== expected.transcriptSha256)
  ) {
    fail(
      `Review authority identity does not match the findings subject: ${path}`,
    );
  }
}

function assertFinalScenarioReviewIdentity(
  path: string,
  review: Schema.Schema.Type<typeof FinalScenarioReviewSchema>,
  expected: ScenarioReviewIdentityExpectation | undefined,
): void {
  if (expected === undefined) return;
  const reviewSha256 = createHash("sha256")
    .update(readFileSync(resolve(repoRoot, path)))
    .digest("hex");
  if (
    review.scenarioId !== expected.scenarioId ||
    (expected.gitSha !== undefined && review.gitSha !== expected.gitSha) ||
    (expected.scenarioSha256 !== undefined &&
      review.scenarioSha256 !== expected.scenarioSha256) ||
    (expected.scenarioReviewSha256 !== undefined &&
      reviewSha256 !== expected.scenarioReviewSha256)
  ) {
    fail(
      `Scenario review authority identity does not match the findings subject: ${path}`,
    );
  }
}

function issueLink(
  links: readonly FindingIssueLink[],
  fingerprint: string,
): FindingIssueLink | undefined {
  return links.find((link) => link.fingerprint === fingerprint);
}

function findingFingerprint(input: {
  readonly verdictClass: string;
  readonly claim: string;
}): string {
  return sha256Canonical({ class: input.verdictClass, claim: input.claim });
}

export function makeFinding(input: {
  readonly stage: FindingStage;
  readonly category: FindingCategory;
  readonly kind: FindingKind;
  readonly summary: string;
  readonly detail?: string;
  readonly pointer: FindingPointer;
  readonly fingerprint?: string;
  readonly githubIssueNumber?: number;
}): Finding {
  const boundedDetail =
    input.detail === undefined ? undefined : boundedText(input.detail);
  const detail = boundedDetail === "" ? undefined : boundedDetail;
  const identity = {
    stage: input.stage,
    category: input.category,
    kind: input.kind,
    summary: input.summary,
    ...(detail === undefined ? {} : { detail }),
    pointer: input.pointer,
    ...(input.fingerprint === undefined
      ? {}
      : { fingerprint: input.fingerprint }),
  };
  return {
    findingId: sha256Canonical(identity),
    stage: input.stage,
    category: input.category,
    kind: input.kind,
    summary: input.summary,
    ...(detail === undefined ? {} : { detail }),
    pointer: input.pointer,
    ...(input.fingerprint === undefined
      ? {}
      : { fingerprint: input.fingerprint }),
    ...(input.githubIssueNumber === undefined
      ? {}
      : { githubIssueNumber: input.githubIssueNumber }),
  };
}

type VerdictClass = (typeof VERDICT_CLASSES)[number];

function categoryForVerdict(verdictClass: VerdictClass): FindingCategory {
  return Match.value(verdictClass).pipe(
    Match.when("bug", () => "runtime-rules-defect" as const),
    Match.when("adapter-defect", () => "sdk-contract-defect" as const),
    Match.when(
      "unsupported-capability",
      () => "experiment-boundary-obstruction" as const,
    ),
    Match.when(
      "assumption-divergence",
      () => "informational-observation" as const,
    ),
    Match.when("corpus-ambiguity", () => "informational-observation" as const),
    Match.when("scenario-invalid", () => "scenario-author-defect" as const),
    Match.when("player-invalid", () => "model-controller-mistake" as const),
    Match.when("reviewer-error", () => "reviewer-defect" as const),
    Match.when("pass", () => "informational-observation" as const),
    Match.exhaustive,
  );
}

export function pointerForSource(
  authorityRole: string,
  line?: number,
): FindingPointer {
  return line === undefined
    ? { kind: "artifact", authorityRole }
    : { kind: "artifact", authorityRole, line };
}

export function findingsFromReview(
  path: string,
  authorityRole: string,
  links: readonly FindingIssueLink[],
  expectedIdentity?: ReviewIdentityExpectation,
): readonly Finding[] {
  const value = readSourceRecord(path);
  const decoded = Schema.decodeUnknownEither(ReviewOutputSchema, {
    onExcessProperty: "error",
  })(value);
  if (Either.isRight(decoded)) {
    assertReviewOutputIdentity(path, decoded.right, expectedIdentity);
    return decoded.right.verdicts.flatMap((verdict, index) => {
      const category = categoryForVerdict(verdict.class);
      const fingerprint =
        verdict.class === "bug" || verdict.class === "adapter-defect"
          ? findingFingerprint({
              verdictClass: verdict.class,
              claim: verdict.claim,
            })
          : undefined;
      const linked =
        fingerprint === undefined ? undefined : issueLink(links, fingerprint);
      const sequenceMatch = /(?:transcript|sequence|seq|call)\s+(\d+)/i.exec(
        verdict.evidence,
      );
      const pointer: FindingPointer =
        sequenceMatch === null
          ? {
              kind: "reviewVerdict",
              authorityRole,
              verdictIndex: index + 1,
            }
          : {
              kind: "sdkSequence",
              authorityRole: "transcript",
              sequence: Number(sequenceMatch[1]),
            };
      const finding = makeFinding({
        stage: "review",
        category,
        kind: "accepted-call-verdict",
        summary: `${verdict.class}: ${verdict.claim}`,
        detail: verdict.evidence,
        pointer,
        ...(fingerprint === undefined ? {} : { fingerprint }),
        ...(linked?.githubIssueNumber === undefined
          ? {}
          : { githubIssueNumber: linked.githubIssueNumber }),
      });
      const promoted =
        linked === undefined || fingerprint === undefined
          ? []
          : [
              makeFinding({
                stage: "triage",
                category,
                kind: "promoted-issue",
                summary:
                  linked.githubIssueNumber === undefined
                    ? "Finding linked to indexed issue fingerprint."
                    : `Finding linked to GitHub issue #${String(linked.githubIssueNumber)}.`,
                detail: verdict.claim,
                pointer: {
                  kind: "issue",
                  authorityRole,
                  fingerprint,
                },
                fingerprint,
                ...(linked.githubIssueNumber === undefined
                  ? {}
                  : { githubIssueNumber: linked.githubIssueNumber }),
              }),
            ];
      return [finding, ...promoted];
    });
  }

  fail(`Review authority has an unsupported schema: ${path}`);
}

function scenarioReviewFinding(
  authorityRole: string,
  summary: string,
  detail: string,
  category: FindingCategory,
  kind: FindingKind,
): Finding {
  return makeFinding({
    stage: "generation",
    category,
    kind,
    summary,
    detail,
    pointer: pointerForSource(authorityRole),
  });
}

function findingsFromScenarioReview(
  review: Schema.Schema.Type<typeof ScenarioCompositeReviewSchema>,
  authorityRole: string,
): readonly Finding[] {
  const findings: Finding[] = [];
  if (review.raw.classification !== "supported") {
    findings.push(
      scenarioReviewFinding(
        authorityRole,
        `Scenario RAW review classified the candidate as ${review.raw.classification}.`,
        review.raw.critique,
        review.raw.classification === "contradictory"
          ? "scenario-author-defect"
          : "experiment-boundary-obstruction",
        "generation-rejection",
      ),
    );
  }
  if (
    review.contentAvailability.classification ===
      "invalidUnavailableSelection" ||
    review.contentAvailability.classification === "missingUnavailableProbe"
  ) {
    findings.push(
      scenarioReviewFinding(
        authorityRole,
        "Scenario content availability review rejected the candidate.",
        review.contentAvailability.critique,
        "scenario-author-defect",
        "generation-rejection",
      ),
    );
  }
  if (
    review.sdkCapability.classification === "unsupported" ||
    review.sdkCapability.classification === "missingUnsupportedProbe"
  ) {
    findings.push(
      scenarioReviewFinding(
        authorityRole,
        "Scenario SDK-capability review found an unsupported boundary.",
        review.sdkCapability.critique,
        "experiment-boundary-obstruction",
        "generation-rejection",
      ),
    );
  }
  if (review.artifactPolicy.classification === "violation") {
    findings.push(
      scenarioReviewFinding(
        authorityRole,
        "Scenario artifact-policy review rejected the candidate.",
        review.artifactPolicy.critique,
        "scenario-author-defect",
        "generation-rejection",
      ),
    );
  }
  if (
    "scenarioQuality" in review &&
    review.scenarioQuality.classification === "needsRevision"
  ) {
    findings.push(
      scenarioReviewFinding(
        authorityRole,
        "Scenario-quality review found a material readiness defect.",
        review.scenarioQuality.critique,
        "scenario-author-defect",
        "generation-rejection",
      ),
    );
  }
  return findings;
}

export function findingsFromFinalScenarioReview(
  review: Schema.Schema.Type<typeof FinalScenarioReviewSchema>,
  authorityRole: string,
  path?: string,
  expectedIdentity?: ScenarioReviewIdentityExpectation,
): readonly Finding[] {
  if (path !== undefined) {
    assertFinalScenarioReviewIdentity(path, review, expectedIdentity);
  }
  const sdkCapabilityReview =
    "sdkCapabilityReview" in review
      ? review.sdkCapabilityReview
      : ({
          classification: "supported" as const,
          evidence:
            "SDK capability review was outside this retained review scope.",
        } as const);
  const findings = findingsFromScenarioReview(
    {
      raw: review.rawReview,
      contentAvailability: review.contentReview,
      sdkCapability: sdkCapabilityReview,
      artifactPolicy: review.policyReview,
      ...("scenarioQuality" in review
        ? { scenarioQuality: review.scenarioQuality }
        : {}),
    },
    authorityRole,
  );
  return finalScenarioDisposition(review) === "rejected"
    ? findings
    : findings.map((finding) =>
        finding.kind === "generation-rejection"
          ? makeFinding({
              stage: finding.stage,
              category: finding.category,
              kind: "informational-observation",
              summary: `Scenario review retained a ${finding.category} observation while admitting the candidate.`,
              pointer: finding.pointer,
              ...(finding.detail === undefined
                ? {}
                : { detail: finding.detail }),
            })
          : finding,
      );
}

/**
 * Scenario-review authorities have a distinct schema boundary from post-play
 * ReviewOutput authorities. Historical composite reviews remain readable only
 * when no current execution identity is being asserted; they cannot be attributed to
 * a current execution because that schema carries no identity fields.
 */
export function findingsFromScenarioReviewSource(
  path: string,
  authorityRole: string,
  expectedIdentity?: ScenarioReviewIdentityExpectation,
): readonly Finding[] {
  const value = readSourceRecord(path);
  const final = Schema.decodeUnknownEither(FinalScenarioReviewSchema, {
    onExcessProperty: "error",
  })(value);
  if (Either.isRight(final)) {
    return findingsFromFinalScenarioReview(
      final.right,
      authorityRole,
      path,
      expectedIdentity,
    );
  }
  const composite = Schema.decodeUnknownEither(ScenarioCompositeReviewSchema, {
    onExcessProperty: "error",
  })(value);
  if (Either.isRight(composite)) {
    if (expectedIdentity !== undefined) {
      fail(`Historical scenario review has no execution identity: ${path}`);
    }
    return findingsFromScenarioReview(composite.right, authorityRole);
  }
  fail(`Scenario-review authority has an unsupported schema: ${path}`);
}

function findingsFromPlayerEventSource(source: Source): readonly Finding[] {
  const lines = readFileSync(resolve(repoRoot, source.path), "utf8").split(
    "\n",
  );
  const findings: Finding[] = [];
  let failedPlayerCommand = false;
  for (const [index, line] of lines.entries()) {
    if (line.trim().length === 0) continue;
    const value = (() => {
      try {
        return Either.right(JSON.parse(line) as unknown);
      } catch {
        return Either.left("malformed");
      }
    })();
    if (Either.isLeft(value)) {
      findings.push(
        makeFinding({
          stage: "player",
          category: "model-controller-mistake",
          kind: "malformed-submission",
          summary: "Player event evidence contains malformed JSON.",
          pointer: pointerForSource(source.role, index + 1),
        }),
      );
      continue;
    }
    if (!isJsonRecord(value.right) || value.right.type !== "item.completed") {
      continue;
    }
    const item = value.right.item;
    if (!isJsonRecord(item) || item.type !== "command_execution") continue;
    const command = typeof item.command === "string" ? item.command : "";
    if (!command.includes("player-client")) continue;
    const output =
      typeof item.aggregated_output === "string" ? item.aggregated_output : "";
    const exitCode = item.exit_code;
    const failed = exitCode !== 0 || item.status === "failed";
    if (failed) {
      failedPlayerCommand = true;
      const typecheck =
        output.includes("did not typecheck") || /TS\d{4}/.test(output);
      const malformed =
        /"tag"\s*:\s*"error"/.test(output) &&
        /(invalid|must be|missing|malformed|stale|export)/i.test(output);
      const kind: FindingKind = typecheck
        ? "pre-call-compilation-failure"
        : malformed
          ? "malformed-submission"
          : "pre-call-runtime-failure";
      findings.push(
        makeFinding({
          stage: "player",
          category:
            typecheck || malformed
              ? "sdk-usability-friction"
              : "model-controller-mistake",
          kind,
          summary: typecheck
            ? "Player submission failed TypeScript compilation before an SDK call."
            : malformed
              ? "Player submitted a malformed or protocol-invalid request before an SDK call."
              : "Player execution failed before an SDK call.",
          detail: output,
          pointer: pointerForSource(source.role, index + 1),
        }),
      );
      continue;
    }
    if (failedPlayerCommand && /"tag"\s*:\s*"ok"/.test(output)) {
      findings.push(
        makeFinding({
          stage: "player",
          category: "informational-observation",
          kind: "successful-correction",
          summary:
            "A later player submission succeeded after an earlier pre-call failure.",
          pointer: pointerForSource(source.role, index + 1),
        }),
      );
      failedPlayerCommand = false;
    }
  }
  return findings;
}

function findingsFromObservationSource(source: Source): readonly Finding[] {
  const findings: Finding[] = [];
  for (const { value, line } of readJsonLineRecords(source.path)) {
    if (!isJsonRecord(value) || value.kind !== "executionError") continue;
    findings.push(
      makeFinding({
        stage: "player",
        category: "sdk-usability-friction",
        kind: "pre-call-runtime-failure",
        summary: "A player continuation recorded an execution error.",
        pointer: pointerForSource(source.role, line),
        ...(typeof value.message === "string" ? { detail: value.message } : {}),
      }),
    );
  }
  return findings;
}

export type GenerationLedgerOwner =
  | Readonly<{ readonly tag: "scenario" }>
  | Readonly<{
      readonly tag: "campaign";
      readonly campaign: RetainedScenarioReviewCampaignIdentity;
    }>
  | Readonly<{
      readonly tag: "benchmark";
      readonly benchmark: RetainedScenarioReviewBenchmarkIdentity & {
        readonly scenarioId: ScenarioId;
      };
    }>;

export function findingsFromGenerationLedger(
  source: Source,
  expected: Readonly<{
    /** A campaign ledger still refers to its reservation, not an admitted Scenario. */
    readonly scenarioId: ScenarioId | HistoricalScenarioId | PlannedScenarioId;
    readonly gitSha?: GitSha;
    readonly owner: GenerationLedgerOwner;
  }>,
): readonly Finding[] {
  const findings: Finding[] = [];
  for (const { value, line } of readJsonLineRecords(source.path)) {
    const decoded = parseModelInvocationLedgerEntry(value);
    if (Either.isLeft(decoded)) {
      fail(
        `Generation invocation ledger ${source.path} line ${String(line)} is malformed: ${decoded.left.message}`,
      );
    }
    const campaignMismatch =
      expected.owner.tag === "campaign" &&
      (decoded.right.schemaVersion === 4 ||
        decoded.right.schemaVersion === 5) &&
      ((decoded.right.phase === "scenarioGeneration" &&
        (decoded.right.subject.tag !== "scenarioCampaign" ||
          decoded.right.subject.campaignId !==
            expected.owner.campaign.campaignId ||
          decoded.right.subject.evidenceSetId !==
            expected.owner.campaign.evidenceSetId ||
          decoded.right.subject.plannedScenarioId !==
            expected.owner.campaign.plannedScenarioId)) ||
        (decoded.right.phase === "scenarioCompositeReview" &&
          decoded.right.subject.tag === "scenarioCandidate" &&
          (decoded.right.subject.campaignId !==
            expected.owner.campaign.campaignId ||
            decoded.right.subject.evidenceSetId !==
              expected.owner.campaign.evidenceSetId ||
            decoded.right.subject.plannedScenarioId !==
              expected.owner.campaign.plannedScenarioId)));
    const benchmarkMismatch =
      expected.owner.tag === "benchmark" &&
      (decoded.right.schemaVersion !== 4 && decoded.right.schemaVersion !== 5
        ? true
        : decoded.right.subject.tag !== "benchmark" ||
          decoded.right.subject.benchmarkId !==
            expected.owner.benchmark.benchmarkId ||
          decoded.right.subject.profile !== expected.owner.benchmark.profile ||
          decoded.right.subject.scenarioId !==
            expected.owner.benchmark.scenarioId);
    const foreignBenchmarkMismatch =
      expected.owner.tag !== "benchmark" &&
      (decoded.right.schemaVersion === 4 ||
        decoded.right.schemaVersion === 5) &&
      decoded.right.subject.tag === "benchmark";
    const candidateWithoutCampaign =
      expected.owner.tag !== "campaign" &&
      (decoded.right.schemaVersion === 4 ||
        decoded.right.schemaVersion === 5) &&
      decoded.right.subject.tag === "scenarioCandidate";
    if (
      String(modelInvocationScenarioReference(decoded.right)) !==
        expected.scenarioId ||
      (expected.gitSha !== undefined &&
        String(decoded.right.gitSha) !== expected.gitSha) ||
      campaignMismatch ||
      benchmarkMismatch ||
      foreignBenchmarkMismatch ||
      candidateWithoutCampaign
    ) {
      fail(
        `Generation invocation ledger ${source.path} line ${String(line)} belongs to a different findings identity.`,
      );
    }
    const exit = decoded.right.exit;
    const processFailed =
      exit.tag === "exited" || exit.tag === "shellStatus"
        ? exit.status !== 0
        : true;
    const resultFailed =
      "result" in decoded.right && decoded.right.result.tag === "failed";
    const failed = processFailed || resultFailed;
    if (!failed) continue;
    findings.push(
      makeFinding({
        stage: "generation",
        category: "model-controller-mistake",
        kind: "generation-invocation-failure",
        summary:
          "A recorded scenario-generation invocation did not complete successfully.",
        detail: JSON.stringify(value),
        pointer: pointerForSource(source.role, line),
      }),
    );
  }
  return findings;
}

function expectedReplayCampaignIdentity(
  generationLedgerPaths: readonly string[],
): RetainedScenarioReviewCampaignIdentity | undefined {
  let expected: RetainedScenarioReviewCampaignIdentity | undefined;
  for (const path of generationLedgerPaths) {
    const ledgerPath = sourcePath(path);
    const manifestPath = replayCampaignManifestPath(ledgerPath);
    if (!existsSync(manifestPath)) continue;
    const canonicalManifestPath = sourcePath(relative(repoRoot, manifestPath));
    const decoded = Schema.decodeUnknownEither(ScenarioCampaignManifestSchema, {
      onExcessProperty: "error",
    })(readSourceRecord(canonicalManifestPath));
    if (Either.isLeft(decoded)) {
      fail(
        `Generation Campaign manifest is invalid: ${canonicalManifestPath}: ${decoded.left.message}`,
      );
    }
    const campaign = {
      campaignId: decoded.right.campaignId,
      evidenceSetId: decoded.right.evidenceSetId,
      plannedScenarioId: decoded.right.plannedScenarioId,
    } satisfies RetainedScenarioReviewCampaignIdentity;
    if (
      expected !== undefined &&
      canonicalJson(expected) !== canonicalJson(campaign)
    ) {
      fail(
        "Generation ledgers for retained review replay belong to different Campaign identities.",
      );
    }
    expected = campaign;
  }
  return expected;
}

function replayCampaignManifestPath(ledgerPath: string): string {
  return resolve(repoRoot, dirname(ledgerPath), "campaign.json");
}

function requiredReplayCampaignIdentity(
  generationLedgerPaths: readonly string[],
): RetainedScenarioReviewCampaignIdentity {
  for (const path of generationLedgerPaths) {
    const ledgerPath = sourcePath(path);
    const manifestPath = replayCampaignManifestPath(ledgerPath);
    if (!existsSync(manifestPath)) {
      fail(
        `Review replay inputs require the generation Campaign manifest beside ${ledgerPath}: ${manifestPath}.`,
      );
    }
  }
  const expected = expectedReplayCampaignIdentity(generationLedgerPaths);
  if (expected === undefined) {
    fail("Review replay inputs require a Campaign and Evidence Set identity.");
  }
  return expected;
}

type ReplayLedgerOwner = Exclude<
  GenerationLedgerOwner,
  Readonly<{ readonly tag: "scenario" }>
>;

function readReplayLedgerEntries(
  generationLedgerPaths: readonly string[],
): readonly ModelInvocationLedgerEntry[] {
  return generationLedgerPaths.flatMap((path) => {
    const canonical = sourcePath(path);
    const records = (() => {
      try {
        return Either.right(readJsonLineRecords(canonical));
      } catch {
        return Either.left(
          `Original generation ledger is unreadable: ${canonical}`,
        );
      }
    })();
    if (Either.isLeft(records)) {
      fail(`Original generation ledger is unreadable: ${canonical}`);
    }
    return records.right.map(({ value, line }) => {
      const decoded = parseModelInvocationLedgerEntry(value);
      if (Either.isLeft(decoded)) {
        fail(
          `Original generation ledger ${canonical} line ${String(line)} is malformed: ${decoded.left.message}`,
        );
      }
      return decoded.right;
    });
  });
}

function replayLedgerOwner(
  ledgerEntries: readonly ModelInvocationLedgerEntry[],
  generationLedgerPaths: readonly string[],
): ReplayLedgerOwner {
  const benchmarkEntries = ledgerEntries.flatMap(
    (entry): readonly CurrentModelInvocationLedgerEntry[] =>
      (entry.schemaVersion === 4 || entry.schemaVersion === 5) &&
      entry.subject.tag === "benchmark"
        ? [entry]
        : [],
  );
  if (benchmarkEntries.length > 0) {
    if (benchmarkEntries.length !== ledgerEntries.length) {
      fail(
        "Generation ledgers must not mix benchmark-owned and Campaign-owned invocation rows.",
      );
    }
    const first = benchmarkEntries[0]!;
    if (first.subject.tag !== "benchmark") {
      fail("Benchmark generation ledger ownership is malformed.");
    }
    for (const entry of benchmarkEntries) {
      if (
        entry.subject.tag !== "benchmark" ||
        entry.subject.benchmarkId !== first.subject.benchmarkId ||
        entry.subject.profile !== first.subject.profile ||
        entry.subject.scenarioId !== first.subject.scenarioId
      ) {
        fail(
          "Generation ledgers for benchmark replay belong to different benchmark identities.",
        );
      }
    }
    return {
      tag: "benchmark",
      benchmark: {
        benchmarkId: first.subject.benchmarkId,
        profile: first.subject.profile,
        scenarioId: first.subject.scenarioId,
      },
    };
  }
  return {
    tag: "campaign",
    campaign: requiredReplayCampaignIdentity(generationLedgerPaths),
  };
}

function originalCompositeReviewInputs(
  sources: Source[],
  selection: CompositeReviewReplaySelection | undefined,
  generationLedgerPaths: readonly string[],
  expectedScenario: Readonly<{
    readonly scenarioId: ScenarioId;
    readonly scenarioSha256: string;
  }>,
): void {
  if (selection === undefined) return;
  const replayContract = Match.value(selection).pipe(
    Match.when({ tag: "finalOnly" }, ({ finalPath }) => ({
      entries: [{ path: finalPath, stage: "final" as const }] as const,
    })),
    Match.when(
      { tag: "milestoneAndFinal" },
      ({ milestonePath, finalPath }) => ({
        entries: [
          { path: milestonePath, stage: "milestone" as const },
          { path: finalPath, stage: "final" as const },
        ] as const,
      }),
    ),
    Match.exhaustive,
  );
  if (generationLedgerPaths.length === 0) {
    fail(
      "Review replay inputs require at least one original generation ledger for invocation matching.",
    );
  }

  const canonicalEntries = replayContract.entries.map((entry) => ({
    ...entry,
    path: sourcePath(entry.path),
  }));
  if (
    new Set(canonicalEntries.map(({ path }) => path)).size !==
    canonicalEntries.length
  ) {
    fail("Review replay inputs must identify distinct envelope paths.");
  }

  const ledgerEntries = readReplayLedgerEntries(generationLedgerPaths);
  const owner = replayLedgerOwner(ledgerEntries, generationLedgerPaths);

  const invocationIds = new Set<string>();
  for (const { path: canonical, stage: expectedStage } of canonicalEntries) {
    const retained = readRetainedScenarioReviewInputOnce(canonical);
    if (Either.isLeft(retained)) fail(retained.left);
    const review = retained.right.input;
    if (invocationIds.has(review.invocationId)) {
      fail(
        `Review replay inputs contain duplicate original invocation id ${review.invocationId}.`,
      );
    }
    invocationIds.add(review.invocationId);
    const matches = ledgerEntries.filter(
      (entry) => entry.invocationId === review.invocationId,
    );
    if (matches.length !== 1) {
      fail(
        `Review replay input ${canonical} must match exactly one original generation ledger invocation id ${review.invocationId}, found ${String(matches.length)}.`,
      );
    }
    const entry = matches[0]!;
    const binding = (() => {
      if (owner.tag === "benchmark") {
        return retainedScenarioReviewMatchesReplayBinding(review, entry, {
          tag: "benchmark",
          reviewStage: expectedStage,
          scenarioId: expectedScenario.scenarioId,
          benchmark: owner.benchmark,
        });
      }
      if (review.schemaVersion === 2) {
        return expectedStage === "final"
          ? retainedScenarioReviewMatchesReplayBinding(review, entry, {
              tag: "historicalScenario",
              reviewStage: "final",
              scenarioId: expectedScenario.scenarioId,
              admittedScenarioSha256: expectedScenario.scenarioSha256,
              campaign: owner.campaign,
            })
          : retainedScenarioReviewMatchesReplayBinding(review, entry, {
              tag: "historicalScenario",
              reviewStage: "milestone",
              scenarioId: expectedScenario.scenarioId,
              campaign: owner.campaign,
            });
      }
      if (review.subject.tag !== "scenarioCandidate") {
        return retainedScenarioReviewMatchesReplayBinding(review, entry, {
          tag: "scenario",
          reviewStage: expectedStage,
          scenarioId: expectedScenario.scenarioId,
        });
      }
      if (expectedStage === "final") {
        return retainedScenarioReviewMatchesReplayBinding(review, entry, {
          tag: "candidate",
          reviewStage: "final",
          scenarioId: expectedScenario.scenarioId,
          admittedScenarioSha256: expectedScenario.scenarioSha256,
          campaign: owner.campaign,
        });
      }
      return retainedScenarioReviewMatchesReplayBinding(review, entry, {
        tag: "candidate",
        reviewStage: "milestone",
        scenarioId: expectedScenario.scenarioId,
        campaign: owner.campaign,
      });
    })();
    if (Either.isLeft(binding)) {
      fail(
        `Review replay input ${canonical} does not match original composite-review invocation ${review.invocationId}: ${binding.left}`,
      );
    }
    const eventPath = canonical.endsWith(".json")
      ? `${canonical.slice(0, -".json".length)}.events.jsonl`
      : `${canonical}.events.jsonl`;
    if (sources.some((source) => source.path === eventPath)) {
      fail(`Review replay event authority ${eventPath} is already registered.`);
    }
    const eventRole = `prePlayReviewReplayEvents-${review.reviewStage}`;
    const retainedEventRole = addSource(sources, eventPath, eventRole);
    if (retainedEventRole === undefined) {
      fail(
        `Retained ${review.reviewStage} review event stream is missing: ${eventPath}.`,
      );
    }
    const parsedEvents = readCodexEventsWithSource(eventPath);
    if (parsedEvents.tag === "invalid") fail(parsedEvents.message);
    const eventAuthority = {
      role: retainedEventRole,
      ...artifactAuthorityForBytes(eventPath, parsedEvents.rawContents),
    } satisfies FindingAuthority;
    const eventSourceIndex = sources.findIndex(
      (source) => source.path === eventPath,
    );
    if (eventSourceIndex >= 0) {
      const eventSource = sources[eventSourceIndex]!;
      if (eventSource.tag !== "unresolved") {
        fail(`Finding event source is already authority-bound: ${eventPath}`);
      }
      sources[eventSourceIndex] = sourceWithAuthority(
        eventSource,
        parsedEvents.rawContents,
      );
    }
    validateRetainedScenarioReviewInvocation({
      binding: binding.right,
      eventSha256: eventAuthority.sha256,
      events: parsedEvents.events,
    });
    if (
      retainedEventRole !== eventRole ||
      eventAuthority.path !== eventPath ||
      eventAuthority.sha256 !== entry.eventsSha256
    ) {
      fail(
        `Review replay event authority ${eventPath} could not retain its closed ${review.reviewStage} role.`,
      );
    }
    if (sources.some((source) => source.path === canonical)) {
      fail(
        `Review replay input ${canonical} is already registered as another findings authority.`,
      );
    }
    const role = addSource(sources, canonical, `replay-${review.reviewStage}`);
    if (role !== `replay-${review.reviewStage}`) {
      fail(
        `Review replay input ${canonical} could not retain its closed ${review.reviewStage} authority role.`,
      );
    }
    const sourceIndex = sources.findIndex(
      (source) => source.path === canonical,
    );
    if (sourceIndex >= 0) {
      const source = sources[sourceIndex]!;
      if (source.tag !== "unresolved") {
        fail(`Finding replay source is already authority-bound: ${canonical}`);
      }
      sources[sourceIndex] = sourceWithAuthority(source, retained.right.bytes);
    }
  }
}

function validateReplayResultSource(input: {
  readonly source: Source;
  readonly replaySupervisor: Source | undefined;
  readonly parsed: ParsedRun;
}): void {
  const decoded = Schema.decodeUnknownEither(SdkReplayResultEvidenceSchema, {
    onExcessProperty: "error",
  })(readSourceRecord(input.source.path));
  if (Either.isLeft(decoded)) {
    fail(
      `Replay-result authority ${input.source.path} is invalid: ${decoded.left.message}`,
    );
  }
  if (input.replaySupervisor === undefined) {
    fail(
      "Replay-result authority requires the retained replay-supervisor authority.",
    );
  }
  const replayResult = decoded.right;
  const replaySupervisorAuthority = authorityFor(input.replaySupervisor);
  if (
    replayResult.scenarioId !== input.parsed.scenarioId ||
    replayResult.transcriptSha256 !== input.parsed.transcriptSha256 ||
    replayResult.replaySupervisorSha256 !== replaySupervisorAuthority.sha256 ||
    replayResult.matchedCallCount !== input.parsed.callCount
  ) {
    fail(
      `Replay-result authority ${input.source.path} does not match the retained transcript, supervisor, or SDK call count.`,
    );
  }
}

function findingStageForPlanStage(stage: RawSwarmStageName): FindingStage {
  return Match.value(stage).pipe(
    Match.when("scenarioGeneration", () => "generation" as const),
    Match.when("scenarioCompositeReview", () => "generation" as const),
    Match.when(
      "scenarioCharacterAuthoring",
      () => "character-authoring" as const,
    ),
    Match.when("scenarioSetupAuthoring", () => "setup-authoring" as const),
    Match.when("player", () => "player" as const),
    Match.when("postPlayReview", () => "review" as const),
    Match.exhaustive,
  );
}

export function findingsFromStagePlanSource(
  source: Source,
  expectedIdentity?: StagePlanIdentityExpectation,
): readonly Finding[] {
  const decoded = Schema.decodeUnknownEither(ScenarioStagePlanFindingsSchema, {
    onExcessProperty: "error",
  })(readSourceRecord(source.path));
  if (Either.isLeft(decoded)) {
    return [
      makeFinding({
        stage: "generation",
        category: "model-controller-mistake",
        kind: "generation-invocation-failure",
        summary: "Retained stage-plan findings could not be decoded.",
        detail: decoded.left.message,
        pointer: pointerForSource(source.role),
      }),
    ];
  }
  return decoded.right.map((finding: ScenarioStagePlanFinding) => {
    if (
      expectedIdentity !== undefined &&
      !stagePlanIdentitiesMatch(finding.identity, expectedIdentity)
    ) {
      fail(
        `Stage-plan finding identity does not match the findings subject: ${source.path}`,
      );
    }
    return makeFinding({
      stage: findingStageForPlanStage(finding.stage),
      category:
        finding.determinedBy === "spatialRequirement"
          ? "experiment-boundary-obstruction"
          : finding.disposition === "rejected"
            ? "scenario-author-defect"
            : "informational-observation",
      kind:
        finding.disposition === "rejected"
          ? "generation-rejection"
          : "informational-observation",
      summary: `${finding.stage} stage was ${finding.disposition}.`,
      detail: `${finding.determinedBy}: ${finding.reason}`,
      pointer: pointerForSource(source.role),
    });
  });
}

export function deduplicateFindings(
  findings: readonly Finding[],
): readonly Finding[] {
  const unique = new Map<string, Finding>();
  for (const finding of findings) unique.set(finding.findingId, finding);
  return [...unique.values()].sort((left, right) =>
    left.findingId.localeCompare(right.findingId),
  );
}

function subjectAuthorityBindingError(
  projection: FindingsProjection,
): string | undefined {
  const expectedRole =
    projection.subject.tag === "scenarioCampaign"
      ? "campaign"
      : "executionStart";
  const authority =
    projection.authorities.find(({ role }) => role === expectedRole) ??
    (projection.subject.tag === "execution"
      ? projection.authorities.find(({ role }) => role === "execution")
      : undefined);
  if (authority === undefined) {
    return `Findings subject requires its ${expectedRole} authority.`;
  }
  if (projection.subject.tag === "scenarioCampaign") {
    const decoded = Schema.decodeUnknownEither(ScenarioCampaignManifestSchema, {
      onExcessProperty: "error",
    })(readSourceRecord(authority.path));
    if (Either.isLeft(decoded)) {
      return `Campaign authority does not decode as a campaign manifest: ${authority.path}`;
    }
    const campaign = decoded.right;
    return campaign.campaignId === projection.subject.campaignId &&
      campaign.plannedScenarioId === projection.subject.plannedScenarioId &&
      campaign.evidenceSetId === projection.subject.evidenceSetId &&
      campaign.gitSha === projection.subject.gitSha &&
      campaign.startedAt === projection.subject.startedAt
      ? undefined
      : "Findings campaign subject does not match its decoded campaign manifest.";
  }
  const decoded = Schema.decodeUnknownEither(ExecutionStartRecordSchema, {
    onExcessProperty: "error",
  })(readSourceRecord(authority.path));
  if (Either.isLeft(decoded)) {
    return `Execution authority does not decode as an execution-start manifest: ${authority.path}`;
  }
  const execution = decoded.right;
  return execution.executionId === projection.subject.executionId &&
    execution.evidenceSetId === projection.subject.evidenceSetId &&
    execution.scenarioId === projection.subject.scenarioId &&
    execution.gitSha === projection.subject.gitSha &&
    execution.startedAt === projection.subject.startedAt
    ? undefined
    : "Findings execution subject does not match its decoded execution manifest.";
}

function validateDecodedProjection(
  projection: FindingsProjection,
  snapshots: readonly CanonicalFindingAuthoritySnapshot[],
): FindingsProjectionResult {
  if (projection.subjectIdentity !== sha256Canonical(projection.subject)) {
    return {
      tag: "invalid",
      message: "Finding subject identity does not match the subject fields.",
    };
  }
  const roles = new Set<string>();
  const paths = new Set<string>();
  for (const authority of projection.authorities) {
    if (roles.has(authority.role)) {
      return {
        tag: "invalid",
        message: `Duplicate finding authority ${authority.role}.`,
      };
    }
    roles.add(authority.role);
    if (paths.has(authority.path)) {
      return {
        tag: "invalid",
        message: `Duplicate finding authority path ${authority.path}.`,
      };
    }
    paths.add(authority.path);
    const canonicalPath = (() => {
      try {
        return Either.right(sourcePath(authority.path));
      } catch (error) {
        return Either.left(
          error instanceof Error
            ? error.message
            : `Finding authority path is invalid: ${authority.path}.`,
        );
      }
    })();
    if (Either.isLeft(canonicalPath)) {
      return {
        tag: "invalid",
        message: canonicalPath.left,
      };
    }
    if (canonicalPath.right !== authority.path) {
      return {
        tag: "invalid",
        message: `Finding authority path is not repository-relative: ${authority.path}.`,
      };
    }
    const canonicalAuthority = canonicalRepositoryReadPath(
      repoRoot,
      authority.path,
    );
    if (Either.isLeft(canonicalAuthority)) {
      return {
        tag: "invalid",
        message: `Finding authority is not a canonical repository path: ${authority.path}.`,
      };
    }
    if (relative(repoRoot, canonicalAuthority.right) !== authority.path) {
      return {
        tag: "invalid",
        message: `Finding authority is not a canonical repository path: ${authority.path}.`,
      };
    }
    const snapshot = snapshots.find(
      (candidate) => candidate.path === authority.path,
    );
    const bytes = (() => {
      if (snapshot !== undefined) {
        if (!canonicalFindingAuthoritySnapshots.has(snapshot)) {
          return Either.left(
            `Finding authority snapshot is not canonical: ${authority.path}.`,
          );
        }
        const captured = canonicalFindingAuthoritySnapshotValues.get(snapshot);
        if (
          captured === undefined ||
          captured.authority.byteLength !== authority.byteLength ||
          captured.authority.sha256 !== authority.sha256
        ) {
          return Either.left(
            `Finding authority snapshot does not match ${authority.path}.`,
          );
        }
        return Either.right(captured.bytes);
      }
      try {
        return Either.right(readFileSync(canonicalAuthority.right));
      } catch {
        return Either.left(
          `Finding authority is unreadable: ${authority.path}.`,
        );
      }
    })();
    if (Either.isLeft(bytes)) {
      return { tag: "invalid", message: bytes.left };
    }
    if (
      bytes.right.byteLength !== authority.byteLength ||
      createHash("sha256").update(bytes.right).digest("hex") !==
        authority.sha256
    ) {
      return {
        tag: "invalid",
        message: `Finding authority hash does not match ${authority.path}.`,
      };
    }
  }
  const subjectBindingError = subjectAuthorityBindingError(projection);
  if (subjectBindingError !== undefined) {
    return { tag: "invalid", message: subjectBindingError };
  }
  if (projection.subject.sdkCalls.tag === "transcriptFree") {
    if (roles.has("transcript")) {
      return {
        tag: "invalid",
        message:
          "A transcript-free subject cannot have a transcript authority.",
      };
    }
  } else {
    if (projection.subject.tag !== "execution") {
      return {
        tag: "invalid",
        message:
          "Only an Execution findings subject can retain an SDK transcript.",
      };
    }
    const transcript = projection.authorities.find(
      (authority) => authority.role === "transcript",
    );
    if (transcript?.sha256 !== projection.subject.sdkCalls.transcriptSha256) {
      return {
        tag: "invalid",
        message:
          "Transcript authority does not match execution transcript hash.",
      };
    }
    if (transcript === undefined) {
      return {
        tag: "invalid",
        message:
          "An execution transcript hash requires a transcript authority.",
      };
    }
    const parsedTranscript = parseRun(transcript.path);
    if (Either.isLeft(parsedTranscript)) {
      return {
        tag: "invalid",
        message: `Finding transcript cannot be parsed: ${parsedTranscript.left}`,
      };
    }
    const parsed = parsedTranscript.right;
    if (
      parsed.scenarioId !== projection.subject.scenarioId ||
      parsed.gitSha !== projection.subject.gitSha ||
      parsed.startedAt !== projection.subject.startedAt
    ) {
      return {
        tag: "invalid",
        message:
          "Finding execution identity does not match the transcript header.",
      };
    }
    if (
      parsed.transcriptSha256 !== projection.subject.sdkCalls.transcriptSha256
    ) {
      return {
        tag: "invalid",
        message:
          "Finding transcript hash does not match the parsed transcript.",
      };
    }
    if (parsed.callCount !== projection.subject.sdkCalls.callCount) {
      return {
        tag: "invalid",
        message: `Finding callCount ${String(projection.subject.sdkCalls.callCount)} does not match the transcript SDK call count ${String(parsed.callCount)}.`,
      };
    }
  }
  const findingIds = new Set<string>();
  const authorityPaths = new Map(
    projection.authorities.map((authority) => [authority.role, authority.path]),
  );
  for (const finding of projection.findings) {
    if (findingIds.has(finding.findingId)) {
      return {
        tag: "invalid",
        message: `Duplicate finding ${finding.findingId}.`,
      };
    }
    findingIds.add(finding.findingId);
    if (!roles.has(finding.pointer.authorityRole)) {
      return {
        tag: "invalid",
        message: `Finding ${finding.findingId} points to an unknown authority.`,
      };
    }
    if (
      finding.pointer.kind === "sdkSequence" &&
      finding.pointer.authorityRole !== "transcript"
    ) {
      return {
        tag: "invalid",
        message: `Finding ${finding.findingId} SDK sequence pointer must use the transcript authority.`,
      };
    }
    if (
      finding.pointer.kind === "sdkSequence" &&
      (projection.subject.sdkCalls.tag === "transcriptFree" ||
        finding.pointer.sequence > projection.subject.sdkCalls.callCount)
    ) {
      return {
        tag: "invalid",
        message: `Finding ${finding.findingId} points past the recorded SDK call count.`,
      };
    }
    if (
      finding.pointer.kind === "issue" &&
      finding.fingerprint !== finding.pointer.fingerprint
    ) {
      return {
        tag: "invalid",
        message: `Finding ${finding.findingId} issue pointer does not match its fingerprint.`,
      };
    }
    const pointerPath = authorityPaths.get(finding.pointer.authorityRole);
    if (pointerPath === undefined) {
      return {
        tag: "invalid",
        message: `Finding ${finding.findingId} points to an unknown authority.`,
      };
    }
    if (
      finding.pointer.kind === "artifact" &&
      finding.pointer.line !== undefined
    ) {
      const contents = readFileSync(resolve(repoRoot, pointerPath), "utf8");
      const lineCount =
        contents.length === 0
          ? 0
          : contents.split("\n").length - (contents.endsWith("\n") ? 1 : 0);
      if (finding.pointer.line > lineCount) {
        return {
          tag: "invalid",
          message: `Finding ${finding.findingId} points past the authority line count.`,
        };
      }
    }
    if (finding.pointer.kind === "reviewVerdict") {
      const reviewed = Schema.decodeUnknownEither(ReviewOutputSchema, {
        onExcessProperty: "error",
      })(readSourceRecord(pointerPath));
      if (
        Either.isLeft(reviewed) ||
        finding.pointer.verdictIndex > reviewed.right.verdicts.length
      ) {
        return {
          tag: "invalid",
          message: `Finding ${finding.findingId} points past the review verdict count.`,
        };
      }
    }
    const identity = {
      stage: finding.stage,
      category: finding.category,
      kind: finding.kind,
      summary: finding.summary,
      ...(finding.detail === undefined ? {} : { detail: finding.detail }),
      pointer: finding.pointer,
      ...(finding.fingerprint === undefined
        ? {}
        : { fingerprint: finding.fingerprint }),
    };
    if (finding.findingId !== sha256Canonical(identity)) {
      return {
        tag: "invalid",
        message: `Finding ${finding.findingId} has an inconsistent identity.`,
      };
    }
  }
  return { tag: "valid", projection };
}

export function validateFindingsProjection(
  value: unknown,
  snapshots: readonly CanonicalFindingAuthoritySnapshot[] = [],
): FindingsProjectionResult {
  const decoded = Schema.decodeUnknownEither(FindingsProjectionSchema, {
    onExcessProperty: "error",
  })(value);
  if (Either.isLeft(decoded)) {
    return { tag: "invalid", message: decoded.left.message };
  }
  if (!Array.isArray(snapshots)) {
    return {
      tag: "invalid",
      message: "Finding authority snapshots must be a canonical snapshot list.",
    };
  }
  return validateDecodedProjection(decoded.right, snapshots);
}

export function projectExecutionFindings(
  input: FindingsProjectionInput,
): FindingsProjection {
  const transcriptPath = sourcePath(input.transcriptPath);
  const evidenceSetDirectory = sourcePath(
    input.evidenceSetDirectory ?? defaultEvidenceSetDirectory(transcriptPath),
  );
  const parsedResult = parseRun(transcriptPath);
  if (Either.isLeft(parsedResult)) fail(parsedResult.left);
  const parsed = parsedResult.right;
  const executionStartPath = sourcePath(
    `${evidenceSetDirectory}/evidence/execution-start.json`,
  );
  const executionStart = Schema.decodeUnknownEither(
    ExecutionStartRecordSchema,
    {
      onExcessProperty: "error",
    },
  )(readSourceRecord(executionStartPath));
  if (Either.isLeft(executionStart)) {
    fail(
      `Execution start authority is invalid: ${executionStartPath}: ${executionStart.left.message}`,
    );
  }
  if (
    executionStart.right.scenarioId !== parsed.scenarioId ||
    executionStart.right.gitSha !== parsed.gitSha ||
    executionStart.right.startedAt !== parsed.startedAt
  ) {
    fail("Execution start authority does not match the transcript identity.");
  }
  const sources: Source[] = [
    unresolvedSource({ role: "transcript", path: transcriptPath }),
    unresolvedSource({ role: "executionStart", path: executionStartPath }),
  ];
  const sourceFindings: Finding[] = [];

  if (parsed.characterObstruction !== undefined) {
    sourceFindings.push(
      makeFinding({
        stage: "character-authoring",
        category: "experiment-boundary-obstruction",
        kind: "character-obstruction",
        summary: "Character authoring was obstructed before setup.",
        detail: parsed.characterObstruction,
        pointer: pointerForSource("transcript"),
      }),
    );
  }
  if (parsed.setupObstruction !== undefined) {
    sourceFindings.push(
      makeFinding({
        stage: "setup-authoring",
        category: "experiment-boundary-obstruction",
        kind: "setup-obstruction",
        summary: "Scenario setup was obstructed before player execution.",
        detail: parsed.setupObstruction,
        pointer: pointerForSource("transcript"),
      }),
    );
  }
  for (const call of parsed.calls) {
    if (call.outcome === "threw") {
      sourceFindings.push(
        makeFinding({
          stage: "player",
          category:
            call.rejection === "sessionConflict"
              ? "model-controller-mistake"
              : "sdk-usability-friction",
          kind: "sdk-call-failure",
          summary: `SDK ${call.operation} call ${String(call.seq)} threw ${call.rejection}.`,
          detail: call.error.message,
          pointer: {
            kind: "sdkSequence",
            authorityRole: "transcript",
            sequence: call.seq,
          },
        }),
      );
    } else if (
      isJsonRecord(call.result) &&
      (call.result.tag === "invalid" ||
        call.result.tag === "scenarioMovementRejected" ||
        call.result.tag === "scenarioSessionConflict")
    ) {
      sourceFindings.push(
        makeFinding({
          stage: "player",
          category: "informational-observation",
          kind: "informational-observation",
          summary: `SDK ${call.operation} call ${String(call.seq)} returned ${String(call.result.tag)}.`,
          pointer: {
            kind: "sdkSequence",
            authorityRole: "transcript",
            sequence: call.seq,
          },
          ...(typeof call.result.message === "string"
            ? { detail: call.result.message }
            : {}),
        }),
      );
    }
  }

  const scenarioPath = sourcePath(`${evidenceSetDirectory}/SCENARIO.md`);
  const scenarioExists = existsSync(resolve(repoRoot, scenarioPath));
  if (parsed.scenarioSha256 !== undefined && !scenarioExists) {
    fail(
      `Scenario authority is required by the execution transcript: ${scenarioPath}`,
    );
  }
  const scenarioAuthoritySha256 = scenarioExists
    ? authorityFor(unresolvedSource({ role: "scenario", path: scenarioPath }))
        .sha256
    : undefined;
  if (
    parsed.scenarioSha256 !== undefined &&
    scenarioAuthoritySha256 !== parsed.scenarioSha256
  ) {
    fail(
      `Scenario authority hash does not match the findings subject: ${scenarioPath}`,
    );
  }
  const scenarioReviewPath = sourcePath(
    `${evidenceSetDirectory}/SCENARIO_REVIEW.json`,
  );
  if (
    parsed.scenarioReviewSha256 !== undefined &&
    !existsSync(resolve(repoRoot, scenarioReviewPath))
  ) {
    fail(
      `Scenario review authority is required by the execution transcript: ${scenarioReviewPath}`,
    );
  }
  const stagePlanPath = sourcePath(
    `${evidenceSetDirectory}/evidence/stage-plan.json`,
  );
  if (
    parsed.scenarioSha256 !== undefined &&
    !existsSync(resolve(repoRoot, stagePlanPath))
  ) {
    fail(
      `Stage-plan authority is required by the execution transcript: ${stagePlanPath}`,
    );
  }
  const expectedReviewIdentity: ReviewIdentityExpectation = {
    scenarioId: executionStart.right.scenarioId,
    gitSha: parsed.gitSha,
    transcriptSha256: parsed.transcriptSha256,
    ...(parsed.scenarioSha256 === undefined
      ? {}
      : { scenarioSha256: parsed.scenarioSha256 }),
    ...(parsed.scenarioReviewSha256 === undefined
      ? {}
      : { scenarioReviewSha256: parsed.scenarioReviewSha256 }),
    ...(scenarioAuthoritySha256 === undefined
      ? {}
      : { candidateScenarioSha256: scenarioAuthoritySha256 }),
  };
  const expectedScenarioReviewIdentity: ScenarioReviewIdentityExpectation = {
    scenarioId: executionStart.right.scenarioId,
    ...(parsed.scenarioSha256 === undefined
      ? {}
      : { scenarioSha256: parsed.scenarioSha256 }),
    ...(parsed.scenarioReviewSha256 === undefined
      ? {}
      : { scenarioReviewSha256: parsed.scenarioReviewSha256 }),
  };
  const candidateSources = [
    { suffix: "evidence/stage-plan.json", role: "stagePlan", kind: "opaque" },
    {
      suffix: "evidence/stage-plan-findings.json",
      role: "stagePlanFindings",
      kind: "stagePlanFindings",
    },
    { suffix: "SCENARIO.md", role: "scenario", kind: "opaque" },
    {
      suffix: "SCENARIO_REVIEW.json",
      role: "scenarioReview",
      kind: "scenarioReview",
    },
    { suffix: "evidence/characters.ts", role: "characters", kind: "opaque" },
    { suffix: "evidence/setup.ts", role: "setup", kind: "opaque" },
    {
      suffix: "evidence/frozen-prefix.json",
      role: "frozenPrefix",
      kind: "opaque",
    },
    { suffix: "evidence/final.json", role: "final", kind: "opaque" },
    {
      suffix: "evidence/invocations.jsonl",
      role: "modelInvocations",
      kind: "opaque",
    },
    {
      suffix: "evidence/supervisor-timings.jsonl",
      role: "supervisorTimings",
      kind: "opaque",
    },
    {
      suffix: "evidence/initial-observation.json",
      role: "initialObservation",
      kind: "opaque",
    },
    {
      suffix: "evidence/observations.jsonl",
      role: "observations",
      kind: "observations",
    },
    {
      suffix: "replay-supervisor.mjs",
      role: "replaySupervisor",
      kind: "opaque",
    },
    {
      suffix: "evidence/replay-result.json",
      role: "replayResult",
      kind: "replayResult",
    },
  ] as const;
  for (const candidate of candidateSources) {
    const addedRole = addSource(
      sources,
      `${evidenceSetDirectory}/${candidate.suffix}`,
      candidate.role,
    );
    if (addedRole === undefined) continue;
    if (candidate.kind === "observations") {
      sourceFindings.push(
        ...findingsFromObservationSource(
          unresolvedSource({
            role: addedRole,
            path: sourcePath(`${evidenceSetDirectory}/${candidate.suffix}`),
          }),
        ),
      );
    } else if (candidate.kind === "stagePlanFindings") {
      if (
        parsed.scenarioSha256 === undefined ||
        parsed.scenarioReviewSha256 === undefined
      ) {
        fail(
          `Admitted stage-plan findings require scenario and scenario-review hashes: ${evidenceSetDirectory}`,
        );
      }
      sourceFindings.push(
        ...findingsFromStagePlanSource(
          unresolvedSource({
            role: addedRole,
            path: sourcePath(`${evidenceSetDirectory}/${candidate.suffix}`),
          }),
          {
            tag: "admitted",
            scenarioId: parsed.scenarioId,
            scenarioSha256: parsed.scenarioSha256,
            scenarioReviewSha256: parsed.scenarioReviewSha256,
          },
        ),
      );
    } else if (candidate.kind === "scenarioReview") {
      const path = sourcePath(`${evidenceSetDirectory}/${candidate.suffix}`);
      sourceFindings.push(
        ...findingsFromScenarioReviewSource(
          path,
          addedRole,
          expectedScenarioReviewIdentity,
        ),
      );
    } else if (candidate.kind === "replayResult") {
      validateReplayResultSource({
        source: unresolvedSource({
          role: addedRole,
          path: sourcePath(`${evidenceSetDirectory}/${candidate.suffix}`),
        }),
        replaySupervisor: sources.find(
          (source) => source.role === "replaySupervisor",
        ),
        parsed,
      });
    }
  }

  if (parsed.scenarioSha256 !== undefined) {
    const stagePlan = validateScenarioStagePlan(
      readSourceRecord(stagePlanPath),
    );
    if (Either.isLeft(stagePlan)) fail(stagePlan.left);
    if (
      stagePlan.right.identity.tag !== "admitted" ||
      stagePlan.right.identity.scenarioId !== parsed.scenarioId ||
      stagePlan.right.identity.scenarioSha256 !== parsed.scenarioSha256 ||
      stagePlan.right.identity.scenarioReviewSha256 !==
        parsed.scenarioReviewSha256
    ) {
      fail(
        `Stage-plan authority identity does not match the findings subject: ${stagePlanPath}`,
      );
    }
    const stagePlanFindingsPath = sourcePath(
      `${evidenceSetDirectory}/evidence/stage-plan-findings.json`,
    );
    if (!existsSync(resolve(repoRoot, stagePlanFindingsPath))) {
      fail(
        `Stage-plan findings authority is required by the execution transcript: ${stagePlanFindingsPath}`,
      );
    }
    const decodedFindings = Schema.decodeUnknownEither(
      ScenarioStagePlanFindingsSchema,
      { onExcessProperty: "error" },
    )(readSourceRecord(stagePlanFindingsPath));
    if (Either.isLeft(decodedFindings)) {
      fail(
        `Invalid stage-plan findings authority: ${decodedFindings.left.message}`,
      );
    }
    if (
      canonicalJson(decodedFindings.right) !==
      canonicalJson(scenarioStagePlanFindings(stagePlan.right))
    ) {
      fail(
        `Stage-plan findings authority does not match the retained plan: ${stagePlanFindingsPath}`,
      );
    }
  }

  for (const [index, path] of input.reviewPaths.entries()) {
    const canonical = sourcePath(path);
    const role = addSource(sources, canonical, `review-${String(index + 1)}`)!;
    sourceFindings.push(
      ...findingsFromReview(
        canonical,
        role,
        input.issueLinks,
        expectedReviewIdentity,
      ),
    );
  }
  for (const [index, path] of input.scenarioReviewPaths.entries()) {
    const canonical = sourcePath(path);
    const role = addSource(
      sources,
      canonical,
      `scenarioReview-${String(index + 1)}`,
    )!;
    sourceFindings.push(
      ...findingsFromScenarioReviewSource(
        canonical,
        role,
        expectedScenarioReviewIdentity,
      ),
    );
  }
  const expectedGenerationOwner: GenerationLedgerOwner =
    input.reviewReplay !== undefined && input.generationLedgerPaths.length > 0
      ? replayLedgerOwner(
          readReplayLedgerEntries(input.generationLedgerPaths),
          input.generationLedgerPaths,
        )
      : (() => {
          const campaign = expectedReplayCampaignIdentity(
            input.generationLedgerPaths,
          );
          return campaign === undefined
            ? ({ tag: "scenario" } as const)
            : ({ tag: "campaign", campaign } as const);
        })();
  for (const path of input.generationLedgerPaths) {
    const manifestPath = sourcePath(
      relative(repoRoot, replayCampaignManifestPath(sourcePath(path))),
    );
    if (existsSync(resolve(repoRoot, manifestPath))) {
      if (expectedGenerationOwner.tag === "benchmark") {
        fail(
          `Benchmark-owned generation ledger ${sourcePath(path)} must not carry a Campaign manifest authority.`,
        );
      }
      const role = addSource(sources, manifestPath, "campaign");
      if (role === undefined) {
        fail(`Generation Campaign manifest is unreadable: ${manifestPath}.`);
      }
    }
  }
  for (const [index, path] of input.generationLedgerPaths.entries()) {
    const canonical = sourcePath(path);
    const role = addSource(
      sources,
      canonical,
      `generationLedger-${String(index + 1)}`,
    )!;
    sourceFindings.push(
      ...findingsFromGenerationLedger(
        unresolvedSource({ role, path: canonical }),
        {
          scenarioId: parsed.scenarioId,
          owner: expectedGenerationOwner,
        },
      ),
    );
  }
  if (input.reviewReplay !== undefined) {
    if (parsed.scenarioSha256 === undefined) {
      fail(
        "Review replay inputs require a current transcript with an admitted Scenario source hash.",
      );
    }
    originalCompositeReviewInputs(
      sources,
      input.reviewReplay,
      input.generationLedgerPaths,
      {
        scenarioId: parsed.scenarioId,
        scenarioSha256: parsed.scenarioSha256,
      },
    );
  }

  if (existsSync(resolve(repoRoot, evidenceSetDirectory, "evidence"))) {
    for (const name of readdirSync(
      resolve(repoRoot, evidenceSetDirectory, "evidence"),
    )) {
      if (name !== "player-events.jsonl" && !name.endsWith(".events.jsonl"))
        continue;
      const role = addSource(
        sources,
        `${evidenceSetDirectory}/evidence/${name}`,
        name === "player-events.jsonl"
          ? "playerEvents"
          : "playerEventsInvocation",
      );
      if (role !== undefined) {
        sourceFindings.push(
          ...findingsFromPlayerEventSource(
            unresolvedSource({
              role,
              path: sourcePath(`${evidenceSetDirectory}/evidence/${name}`),
            }),
          ),
        );
      }
    }
  }

  for (const source of sources) {
    if (source.role === "transcript") continue;
    // Authorities are intentionally metadata only; no source contents enter
    // the projection. The source-specific passes above retain only bounded
    // findings and exact pointers.
  }
  const authorities = sources
    .map(authorityFor)
    .sort((left, right) => left.role.localeCompare(right.role));
  const subject = {
    tag: "execution" as const,
    executionId: executionStart.right.executionId,
    evidenceSetId: executionStart.right.evidenceSetId,
    scenarioId: executionStart.right.scenarioId,
    gitSha: parsed.gitSha,
    startedAt: parsed.startedAt,
    sdkCalls: {
      tag: "retainedTranscript" as const,
      transcriptSha256: parsed.transcriptSha256,
      callCount: parsed.callCount,
    },
  };
  const projection: FindingsProjection = {
    type: "raw-swarm-findings",
    schemaVersion: RAW_SWARM_FINDINGS_SCHEMA_VERSION,
    subjectIdentity: sha256Canonical(subject),
    subject,
    authorities,
    findings: deduplicateFindings(sourceFindings),
  };
  const validation = validateFindingsProjection(projection);
  if (validation.tag === "invalid") fail(validation.message);
  return projection;
}

export function defaultEvidenceSetDirectory(transcriptPath: string): string {
  return basename(transcriptPath) === "sdk-calls.jsonl"
    ? dirname(dirname(transcriptPath))
    : dirname(transcriptPath);
}

export function findingsArtifactPath(evidenceSetDirectory: string): string {
  return sourcePath(`${evidenceSetDirectory}/evidence/findings.json`);
}

export function findingsCheckpointArtifactPath(
  evidenceSetDirectory: string,
): string {
  return sourcePath(
    `${evidenceSetDirectory}/evidence/findings-checkpoint.json`,
  );
}

export function writeFindingsProjection(input: {
  readonly projection: FindingsProjection;
  readonly path: string;
}): FindingAuthority {
  const path = sourcePath(input.path);
  const absolute = resolve(repoRoot, path);
  mkdirSync(dirname(absolute), { recursive: true });
  const encoded = `${JSON.stringify(input.projection, null, 2)}\n`;
  if (existsSync(absolute)) {
    const existing = readSourceRecord(path);
    const validation = validateFindingsProjection(existing);
    if (
      validation.tag === "valid" &&
      sha256Canonical(validation.projection) ===
        sha256Canonical(input.projection)
    ) {
      return authorityFor(unresolvedSource({ role: "findings", path }));
    }
    fail(`Refusing to overwrite a different findings artifact: ${path}`);
  }
  writeFileSync(absolute, encoded, { flag: "wx" });
  return authorityFor(unresolvedSource({ role: "findings", path }));
}

export function readFindingsProjection(path: string): FindingsProjection {
  const value = readSourceRecord(sourcePath(path));
  const validation = validateFindingsProjection(value);
  return validation.tag === "valid"
    ? validation.projection
    : fail(`Invalid findings projection: ${validation.message}`);
}
