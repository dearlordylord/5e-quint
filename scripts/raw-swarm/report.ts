import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { Either, Match, Option, Schema } from "effect";

import { artifactAuthorityForBytes } from "./artifact-authority.ts";
import {
  defaultEvidenceSetDirectory,
  FindingsProjectionSchema,
  findingsArtifactPath,
  findingsTranscriptSha256,
  portableFindingAuthoritySnapshotForBytes,
  projectExecutionFindings,
  readFindingsProjection,
  validateFindingsProjection,
  writeFindingsProjection,
  type FindingAuthority,
  type Finding,
  type FindingIssueLink,
  type FindingsProjection,
} from "./findings.ts";
import { renderFindingsAudit, writeFindingsAudit } from "./findings-audit.ts";
import { ReviewOutputSchema, VERDICT_CLASSES } from "./review-contract.ts";
import { readReviewInvocationEvidenceManifest } from "./review-invocation-evidence.ts";
import {
  exportArtifactIndex,
  ingestArtifactRun,
  ingestArtifactRunWithArtifacts,
  ingestGenerationFindings,
  inventoryLegacyDatabase,
  openArtifactIndex,
  openArtifactIndexReadOnly,
  registerIndexArtifact,
  rebuildLegacyArtifactIndex,
} from "./artifact-index.ts";
import {
  extractSdkTranscriptSequences,
  readSdkAudit,
} from "./sdk-player/sdk-audit.ts";

import {
  GitShaSchema,
  isJsonRecord,
  repoRoot,
  sha256Canonical,
  StartedAtSchema,
} from "./transcript.ts";
import { canonicalRepositoryReadPath } from "./repository-path.ts";
import {
  EvidenceSetIdSchema,
  ExecutionIdSchema,
  PlannedScenarioIdSchema,
  ScenarioCampaignIdSchema,
  ScenarioIdSchema,
} from "./raw-swarm-identities.ts";

const RAW_SWARM_GITHUB_LABEL = "raw-swarm";
const RAW_SWARM_LINK_LOCKED_ENV = "DND_RAW_SWARM_GITHUB_LINK_LOCKED";
const ISSUE_LINK_FILTERS = [
  { kind: "all", flag: null },
  { kind: "linked", flag: "--linked" },
  { kind: "unlinked", flag: "--unlinked" },
] as const;
type IssueLinkFilter = (typeof ISSUE_LINK_FILTERS)[number]["kind"];

export const GitHubIssueNumberSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.positive(),
  Schema.brand("GitHubIssueNumber"),
);
type GitHubIssueNumber = Schema.Schema.Type<typeof GitHubIssueNumberSchema>;

export const SwarmFingerprintSchema = Schema.String.pipe(
  Schema.pattern(/^[a-f0-9]{64}$/),
  Schema.brand("SwarmFingerprint"),
);
type SwarmFingerprint = Schema.Schema.Type<typeof SwarmFingerprintSchema>;

const GitHubIssueSchema = Schema.parseJson(
  Schema.Struct({
    body: Schema.String,
    labels: Schema.Array(Schema.Struct({ name: Schema.String })),
  }),
);

export interface GitHubIssueLinker {
  readonly ensureLinked: (
    issueNumber: GitHubIssueNumber,
    fingerprint: SwarmFingerprint,
  ) => Either.Either<void, string>;
}

interface LinkGithubIssueArgs {
  readonly dbPath: string;
  readonly fingerprint: SwarmFingerprint;
  readonly githubIssueNumber: GitHubIssueNumber;
}

type IssueGithubLink =
  | { readonly kind: "unlinked" }
  | { readonly kind: "linked"; readonly issueNumber: GitHubIssueNumber };

type GitHubCommandResult =
  | { readonly tag: "success"; readonly stdout: string }
  | { readonly tag: "failure"; readonly message: string };

export interface GitHubCommandRunner {
  readonly run: (
    args: readonly string[],
    input: string | undefined,
  ) => GitHubCommandResult;
}

function fail(message: string): never {
  throw new Error(message);
}

function recordBugIssue(
  db: DatabaseSync,
  verdictClass: (typeof VERDICT_CLASSES)[number],
  claim: string,
  createdAt: string,
): Option.Option<string> {
  const noIssue = (): Option.Option<string> => Option.none();
  const actionableIssue = (): Option.Option<string> => {
    const fingerprint = sha256Canonical({ class: verdictClass, claim });
    db.prepare(
      `INSERT INTO issues(fingerprint, class, claim, firstSeenAt, lastSeenAt)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(fingerprint) DO UPDATE SET lastSeenAt = excluded.lastSeenAt`,
    ).run(fingerprint, verdictClass, claim, createdAt, createdAt);
    return Option.some(fingerprint);
  };
  return Match.value(verdictClass).pipe(
    Match.when("bug", actionableIssue),
    Match.when("adapter-defect", actionableIssue),
    Match.when("unsupported-capability", noIssue),
    Match.when("assumption-divergence", noIssue),
    Match.when("corpus-ambiguity", noIssue),
    Match.when("scenario-invalid", noIssue),
    Match.when("player-invalid", noIssue),
    Match.when("reviewer-error", noIssue),
    Match.when("pass", noIssue),
    Match.exhaustive,
  );
}

function flagValue(args: readonly string[], flag: string): string | undefined {
  const at = args.indexOf(flag);
  return at >= 0 ? args[at + 1] : undefined;
}

function hasFlag(args: readonly string[], flag: string): boolean {
  return args.includes(flag);
}

function flagValues(args: readonly string[], flag: string): readonly string[] {
  return args.flatMap((argument, index) =>
    argument === flag && args[index + 1] !== undefined
      ? [args[index + 1]!]
      : [],
  );
}

function optionalSingleFlagValue(
  args: readonly string[],
  flag: string,
): string | undefined {
  const indexes = args.flatMap((argument, index) =>
    argument === flag ? [index] : [],
  );
  if (indexes.length === 0) return undefined;
  if (indexes.length > 1) fail(`${flag} may be supplied only once.`);
  const value = args[indexes[0]! + 1];
  if (value === undefined || value.startsWith("--")) {
    fail(`${flag} requires a value.`);
  }
  return value;
}

const liveGitHubCommandRunner: GitHubCommandRunner = {
  run: (args, input) => {
    const result = spawnSync("gh", args, {
      cwd: repoRoot,
      encoding: "utf8",
      input,
    });
    if (result.error === undefined && result.status === 0) {
      return { tag: "success", stdout: result.stdout };
    }
    const stderr = result.stderr.trim();
    const detail =
      result.error?.message ??
      (stderr.length > 0 ? stderr : "no diagnostic output");
    return {
      tag: "failure",
      message: `gh ${args.slice(0, 2).join(" ")} failed with status ${String(result.status)}: ${detail}`,
    };
  },
};

function readGitHubIssue(
  issueNumber: GitHubIssueNumber,
  runner: GitHubCommandRunner,
): Either.Either<Schema.Schema.Type<typeof GitHubIssueSchema>, string> {
  const result = runner.run(
    ["issue", "view", String(issueNumber), "--json", "body,labels"],
    undefined,
  );
  if (result.tag === "failure") {
    return Either.left(result.message);
  }
  const decoded = Schema.decodeUnknownEither(GitHubIssueSchema)(result.stdout);
  return Either.isLeft(decoded)
    ? Either.left(
        `gh issue view returned invalid JSON: ${String(decoded.left)}`,
      )
    : Either.right(decoded.right);
}

function githubIssueHasFingerprint(
  body: string,
  fingerprint: SwarmFingerprint,
): boolean {
  const marker = `Raw-Swarm-Fingerprint: ${fingerprint}`;
  return body.split("\n").some((line) => line.trim() === marker);
}

export function makeGitHubIssueLinker(
  runner: GitHubCommandRunner,
): GitHubIssueLinker {
  return {
    ensureLinked: (issueNumber, fingerprint) => {
      const before = readGitHubIssue(issueNumber, runner);
      if (Either.isLeft(before)) return before;
      const marker = `Raw-Swarm-Fingerprint: ${fingerprint}`;
      const hasFingerprint = githubIssueHasFingerprint(
        before.right.body,
        fingerprint,
      );
      const hasLabel = before.right.labels.some(
        (label) => label.name === RAW_SWARM_GITHUB_LABEL,
      );
      if (hasFingerprint && hasLabel) return Either.right(undefined);
      const body = hasFingerprint
        ? before.right.body
        : `${before.right.body.trimEnd()}\n\n${marker}\n`;
      const edited = runner.run(
        [
          "issue",
          "edit",
          String(issueNumber),
          "--add-label",
          RAW_SWARM_GITHUB_LABEL,
          "--body-file",
          "-",
        ],
        body,
      );
      if (edited.tag === "failure") {
        return Either.left(edited.message);
      }
      const verified = readGitHubIssue(issueNumber, runner);
      if (Either.isLeft(verified)) return verified;
      return githubIssueHasFingerprint(verified.right.body, fingerprint) &&
        verified.right.labels.some(
          (label) => label.name === RAW_SWARM_GITHUB_LABEL,
        )
        ? Either.right(undefined)
        : Either.left(
            `GitHub issue #${issueNumber} is missing its verified swarm backlink or label`,
          );
    },
  };
}

const liveGitHubIssueLinker = makeGitHubIssueLinker(liveGitHubCommandRunner);

function required(value: string | undefined, name: string): string {
  return value ?? fail(`Missing required ${name}`);
}

function positiveInteger(value: string, label: string): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : fail(`${label} must be a positive integer`);
}

function positiveExecutionRowId(value: string): number {
  return positiveInteger(value, "--execution-row");
}

function verdictClass(value: string): (typeof VERDICT_CLASSES)[number] {
  return (
    VERDICT_CLASSES.find((candidate) => candidate === value) ??
    fail(
      `Invalid --class ${value}; expected one of ${VERDICT_CLASSES.join(", ")}`,
    )
  );
}

function executionExists(db: DatabaseSync, runId: number): boolean {
  const run = db
    .prepare(
      "SELECT id FROM runs WHERE id = ? AND evidenceKind = 'currentExecution'",
    )
    .get(runId);
  return isJsonRecord(run) && run.id === runId;
}

const PersistedExecutionIdentitySchema = Schema.Struct({
  id: Schema.Number,
  executionId: ExecutionIdSchema,
  evidenceSetId: EvidenceSetIdSchema,
  scenarioId: ScenarioIdSchema,
  gitSha: GitShaSchema,
  startedAt: StartedAtSchema,
  transcriptSha256: Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/)),
});
type PersistedExecutionIdentity = Schema.Schema.Type<
  typeof PersistedExecutionIdentitySchema
>;
const PersistedExecutionAuditSchema = Schema.Struct({
  ...PersistedExecutionIdentitySchema.fields,
  findingsPath: Schema.String,
  findingsSha256: Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/)),
  findingsByteLength: Schema.Number.pipe(
    Schema.int(),
    Schema.greaterThanOrEqualTo(0),
  ),
});
const PersistedExecutionReviewSchema = Schema.Struct({
  ...PersistedExecutionIdentitySchema.fields,
  transcriptPath: Schema.String,
});
const PersistedCampaignAuditSchema = Schema.Struct({
  campaignId: ScenarioCampaignIdSchema,
  plannedScenarioId: PlannedScenarioIdSchema,
  evidenceSetId: EvidenceSetIdSchema,
  gitSha: GitShaSchema,
  startedAt: StartedAtSchema,
  findingsPath: Schema.String,
  findingsSha256: Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/)),
  findingsByteLength: Schema.Number.pipe(
    Schema.int(),
    Schema.greaterThanOrEqualTo(0),
  ),
});

type IndexedReportArtifact = Readonly<{
  readonly sha256: string;
  readonly byteLength: number;
  readonly path: string;
}>;

type PortableReportBundle = Readonly<{
  readonly root: string;
  readonly artifacts: ReadonlyMap<string, IndexedReportArtifact>;
}>;

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function pathIsContained(root: string, candidate: string): boolean {
  const candidateRelative = relative(root, candidate);
  return (
    candidateRelative === "" ||
    (!candidateRelative.startsWith(`..${sep}`) &&
      candidateRelative !== ".." &&
      !candidateRelative.startsWith(sep))
  );
}

function indexedReportArtifacts(
  db: DatabaseSync,
): readonly IndexedReportArtifact[] {
  return db
    .prepare("SELECT sha256, byteLength, path FROM artifacts ORDER BY sha256")
    .all()
    .map((row, index) => {
      if (
        !isJsonRecord(row) ||
        typeof row.sha256 !== "string" ||
        !SHA256_PATTERN.test(row.sha256) ||
        typeof row.byteLength !== "number" ||
        !Number.isInteger(row.byteLength) ||
        row.byteLength < 0 ||
        typeof row.path !== "string" ||
        row.path.length === 0
      ) {
        return fail(
          `Portable artifact index row ${String(index + 1)} is invalid.`,
        );
      }
      return {
        sha256: row.sha256,
        byteLength: row.byteLength,
        path: row.path,
      };
    });
}

function portableReportBundle(
  dbPath: string,
): PortableReportBundle | undefined {
  let indexPath: string;
  try {
    indexPath = realpathSync(resolve(repoRoot, dbPath));
  } catch (error) {
    return fail(
      `Portable report index is unreadable: ${dbPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const root = dirname(indexPath);
  const manifestPath = resolve(root, "manifest.json");
  if (!existsSync(manifestPath)) return undefined;
  try {
    const canonicalManifestPath = realpathSync(manifestPath);
    if (!pathIsContained(root, canonicalManifestPath)) {
      return fail(
        `Portable report manifest symlink escapes its bundle: ${manifestPath}`,
      );
    }
  } catch (error) {
    return fail(
      `Portable report manifest is unreadable: ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
  } catch (error) {
    return fail(
      `Portable report manifest is unreadable: ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!isJsonRecord(value) || value.schemaVersion !== 1) {
    return fail(
      `Portable report manifest schemaVersion must be 1: ${manifestPath}`,
    );
  }
  const index = value.index;
  if (
    !isJsonRecord(index) ||
    index.path !== "index.sqlite" ||
    typeof index.sha256 !== "string" ||
    !SHA256_PATTERN.test(index.sha256) ||
    typeof index.byteLength !== "number" ||
    !Number.isInteger(index.byteLength) ||
    index.byteLength < 0
  ) {
    return fail(
      `Portable report manifest has an invalid index: ${manifestPath}`,
    );
  }
  if (basename(indexPath) !== index.path) {
    return fail(
      `Portable report index path does not match its manifest: ${indexPath}`,
    );
  }
  let indexBytes: Buffer;
  try {
    indexBytes = readFileSync(indexPath);
  } catch (error) {
    return fail(
      `Portable report index is unreadable: ${indexPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (
    indexBytes.byteLength !== index.byteLength ||
    sha256Bytes(indexBytes) !== index.sha256
  ) {
    return fail(
      `Portable report index does not match its manifest: ${indexPath}`,
    );
  }
  if (!Array.isArray(value.artifacts)) {
    return fail(
      `Portable report manifest has no artifact list: ${manifestPath}`,
    );
  }
  const artifacts = new Map<string, IndexedReportArtifact>();
  const artifactPaths = new Set<string>();
  for (const [entryIndex, entry] of value.artifacts.entries()) {
    if (
      !isJsonRecord(entry) ||
      typeof entry.sha256 !== "string" ||
      !SHA256_PATTERN.test(entry.sha256) ||
      typeof entry.byteLength !== "number" ||
      !Number.isInteger(entry.byteLength) ||
      entry.byteLength < 0 ||
      typeof entry.path !== "string" ||
      entry.path.length === 0 ||
      entry.path.includes("\0") ||
      isAbsolute(entry.path) ||
      !pathIsContained(root, resolve(root, entry.path)) ||
      artifacts.has(entry.sha256) ||
      artifactPaths.has(entry.path)
    ) {
      return fail(
        `Portable report manifest artifact ${String(entryIndex + 1)} is invalid: ${manifestPath}`,
      );
    }
    artifacts.set(entry.sha256, {
      sha256: entry.sha256,
      byteLength: entry.byteLength,
      path: entry.path,
    });
    artifactPaths.add(entry.path);
  }
  return { root, artifacts };
}

function validatePortableArtifactInventory(
  bundle: PortableReportBundle,
  indexed: readonly IndexedReportArtifact[],
): void {
  if (bundle.artifacts.size !== indexed.length) {
    fail(
      `Portable report artifact inventory does not match its manifest: expected ${String(indexed.length)} entries, found ${String(bundle.artifacts.size)}.`,
    );
  }
  for (const artifact of indexed) {
    const manifestArtifact = bundle.artifacts.get(artifact.sha256);
    if (
      manifestArtifact === undefined ||
      manifestArtifact.byteLength !== artifact.byteLength ||
      manifestArtifact.path !== artifact.path
    ) {
      fail(
        `Portable report artifact inventory does not match its manifest: ${artifact.path}.`,
      );
    }
  }
}

function portableReportArtifactBytes(
  bundle: PortableReportBundle,
  indexed: IndexedReportArtifact,
): Buffer {
  const manifestArtifact = bundle.artifacts.get(indexed.sha256);
  if (
    manifestArtifact === undefined ||
    manifestArtifact.byteLength !== indexed.byteLength ||
    manifestArtifact.path !== indexed.path
  ) {
    return fail(
      `Portable report artifact ${indexed.sha256} is not consistently indexed by its manifest.`,
    );
  }
  if (
    indexed.path.includes("\0") ||
    indexed.path.length === 0 ||
    isAbsolute(indexed.path)
  ) {
    return fail(`Portable report artifact path is invalid: ${indexed.path}`);
  }
  const lexical = resolve(bundle.root, indexed.path);
  if (!pathIsContained(bundle.root, lexical)) {
    return fail(
      `Portable report artifact path escapes its bundle: ${indexed.path}`,
    );
  }
  let canonical: string;
  try {
    canonical = realpathSync(lexical);
  } catch (error) {
    return fail(
      `Portable report artifact is unreadable: ${indexed.path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!pathIsContained(bundle.root, canonical)) {
    return fail(
      `Portable report artifact symlink escapes its bundle: ${indexed.path}`,
    );
  }
  let bytes: Buffer;
  try {
    bytes = readFileSync(canonical);
  } catch (error) {
    return fail(
      `Portable report artifact is unreadable: ${indexed.path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (
    bytes.byteLength !== indexed.byteLength ||
    sha256Bytes(bytes) !== indexed.sha256
  ) {
    return fail(
      `Portable report artifact hash verification failed: ${indexed.path}`,
    );
  }
  return bytes;
}

function readPortableFindingsProjection(
  bundle: PortableReportBundle,
  findingsArtifact: IndexedReportArtifact,
  artifacts: readonly IndexedReportArtifact[],
): FindingsProjection {
  const findingsBytes = portableReportArtifactBytes(bundle, findingsArtifact);
  let value: unknown;
  try {
    value = JSON.parse(findingsBytes.toString("utf8")) as unknown;
  } catch (error) {
    return fail(
      `Portable findings artifact is invalid JSON: ${findingsArtifact.path}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const decoded = Schema.decodeUnknownEither(FindingsProjectionSchema, {
    onExcessProperty: "error",
  })(value);
  if (Either.isLeft(decoded)) {
    return fail(`Invalid findings projection: ${decoded.left.message}`);
  }
  const snapshots = decoded.right.authorities.map((authority) => {
    const indexedAuthority = artifacts.find(
      (artifact) => artifact.sha256 === authority.sha256,
    );
    if (indexedAuthority === undefined) {
      return fail(
        `Portable findings authority is not indexed: ${authority.path}`,
      );
    }
    if (indexedAuthority.byteLength !== authority.byteLength) {
      return fail(
        `Portable findings authority length does not match: ${authority.path}`,
      );
    }
    const bytes = portableReportArtifactBytes(bundle, indexedAuthority);
    const snapshot = portableFindingAuthoritySnapshotForBytes(authority, bytes);
    return Either.isRight(snapshot) ? snapshot.right : fail(snapshot.left);
  });
  const validation = validateFindingsProjection(decoded.right, snapshots);
  return validation.tag === "valid"
    ? validation.projection
    : fail(`Invalid findings projection: ${validation.message}`);
}

function readIndexedFindingsProjection(input: {
  readonly db: DatabaseSync;
  readonly dbPath: string;
  readonly findingsPath: string;
  readonly findingsSha256: string;
  readonly findingsByteLength: number;
}): FindingsProjection {
  const findingsArtifact = {
    sha256: input.findingsSha256,
    byteLength: input.findingsByteLength,
    path: input.findingsPath,
  } satisfies IndexedReportArtifact;
  const bundle = portableReportBundle(input.dbPath);
  if (bundle !== undefined) {
    const artifacts = indexedReportArtifacts(input.db);
    validatePortableArtifactInventory(bundle, artifacts);
    return readPortableFindingsProjection(bundle, findingsArtifact, artifacts);
  }
  const database = canonicalRepositoryReadPath(repoRoot, input.dbPath);
  if (Either.isLeft(database)) {
    return fail(
      `Portable report index requires a manifest.json beside the relocated database: ${input.dbPath}`,
    );
  }
  return readFindingsProjection(input.findingsPath);
}

export function ingest(args: readonly string[]): void {
  const [transcriptArg, ...rest] = args;
  const transcriptPath = required(transcriptArg, "<transcript.jsonl>");
  const dbPath = required(flagValue(rest, "--db"), "--db");
  const runId = ingestArtifactRun({
    transcriptPath,
    dbPath,
  });
  const db = openArtifactIndex(dbPath);
  const indexed = db
    .prepare("SELECT evidenceKind, transport FROM runs WHERE id = ?")
    .get(runId);
  db.close();
  const label =
    isJsonRecord(indexed) && indexed.evidenceKind === "currentExecution"
      ? "Execution"
      : `historical ${isJsonRecord(indexed) && indexed.transport === "sdk" ? "SDK" : "MCP"} observation`;
  console.log(
    `Indexed ${label} row ${runId} from ${transcriptPath} into ${dbPath}`,
  );
}

function runByTranscript(
  db: DatabaseSync,
  transcriptPath: string,
): PersistedExecutionIdentity {
  const transcriptSha256 = createHash("sha256")
    .update(readFileSync(resolve(repoRoot, transcriptPath)))
    .digest("hex");
  const row = db
    .prepare(
      "SELECT id, executionId, evidenceSetId, scenarioId, gitSha, startedAt, transcriptSha256 FROM runs WHERE transcriptSha256 = ? AND evidenceKind = 'currentExecution'",
    )
    .get(transcriptSha256);
  const decoded = Schema.decodeUnknownEither(PersistedExecutionIdentitySchema, {
    onExcessProperty: "error",
  })(row);
  if (
    Either.isLeft(decoded) ||
    decoded.right.transcriptSha256 !== transcriptSha256
  ) {
    fail(`Transcript ${transcriptPath} is not indexed in the artifact index.`);
  }
  return decoded.right;
}

function issueLinksForRun(
  db: DatabaseSync,
  runId: number,
): readonly FindingIssueLink[] {
  return db
    .prepare(
      `SELECT DISTINCT issues.fingerprint, issues.githubIssueNumber
       FROM verdicts
       JOIN issues ON issues.fingerprint = verdicts.issueFingerprint
       WHERE verdicts.runId = ? AND verdicts.issueFingerprint IS NOT NULL`,
    )
    .all(runId)
    .flatMap((row): readonly FindingIssueLink[] => {
      if (
        !isJsonRecord(row) ||
        typeof row.fingerprint !== "string" ||
        (row.githubIssueNumber !== null &&
          typeof row.githubIssueNumber !== "number")
      ) {
        return [];
      }
      return [
        {
          fingerprint: row.fingerprint,
          ...(row.githubIssueNumber === null
            ? {}
            : { githubIssueNumber: row.githubIssueNumber }),
        },
      ];
    });
}

function reviewPathsForRun(db: DatabaseSync, runId: number): readonly string[] {
  return db
    .prepare(
      `SELECT artifacts.path
       FROM reviews
       JOIN artifacts ON artifacts.sha256 = reviews.artifactSha256
       WHERE reviews.runId = ?
       ORDER BY reviews.id`,
    )
    .all(runId)
    .map((row) => {
      if (!isJsonRecord(row) || typeof row.path !== "string") {
        fail(
          `Execution row ${String(runId)} has an invalid imported review authority.`,
        );
      }
      return row.path;
    });
}

function unlinkedIssueFingerprintsForRun(
  db: DatabaseSync,
  runId: number,
): readonly string[] {
  return db
    .prepare(
      `SELECT DISTINCT issues.fingerprint
       FROM verdicts
       JOIN issues ON issues.fingerprint = verdicts.issueFingerprint
       WHERE verdicts.runId = ?
         AND verdicts.issueFingerprint IS NOT NULL
         AND issues.githubIssueNumber IS NULL
       ORDER BY issues.fingerprint`,
    )
    .all(runId)
    .map((row) => {
      if (!isJsonRecord(row) || typeof row.fingerprint !== "string") {
        fail(`Execution row ${String(runId)} has an invalid issue-link row.`);
      }
      return row.fingerprint;
    });
}

function insertFindingsProjection(
  db: DatabaseSync,
  runId: number,
  findingArtifactSha256: string,
  findings: readonly Finding[],
): void {
  const existing = db
    .prepare("SELECT DISTINCT artifactSha256 FROM findings WHERE runId = ?")
    .all(runId);
  if (
    existing.some(
      (row) =>
        !isJsonRecord(row) || row.artifactSha256 !== findingArtifactSha256,
    )
  ) {
    fail(
      `Execution row ${String(runId)} already has findings from another artifact.`,
    );
  }
  const insert = db.prepare(
    `INSERT INTO findings(runId, findingId, stage, category, kind, summary, detail, pointer, fingerprint, githubIssueNumber, artifactSha256)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const finding of findings) {
    const already = db
      .prepare(
        "SELECT findingId, artifactSha256 FROM findings WHERE runId = ? AND findingId = ?",
      )
      .get(runId, finding.findingId);
    if (already !== undefined) {
      if (
        !isJsonRecord(already) ||
        already.artifactSha256 !== findingArtifactSha256
      ) {
        fail(
          `Finding ${finding.findingId} is already indexed from another artifact.`,
        );
      }
      continue;
    }
    insert.run(
      runId,
      finding.findingId,
      finding.stage,
      finding.category,
      finding.kind,
      finding.summary,
      finding.detail ?? null,
      JSON.stringify(finding.pointer),
      finding.fingerprint ?? null,
      finding.githubIssueNumber ?? null,
      findingArtifactSha256,
    );
  }
}

function insertFindingAuthorities(
  db: DatabaseSync,
  runId: number,
  authorities: readonly FindingAuthority[],
): void {
  const insert = db.prepare(
    "INSERT INTO runArtifacts(runId, role, artifactSha256) VALUES (?, ?, ?)",
  );
  for (const authority of authorities) {
    const registered = registerIndexArtifact({
      db,
      path: authority.path,
      mediaType: "application/octet-stream",
    });
    if (
      registered.sha256 !== authority.sha256 ||
      registered.byteLength !== authority.byteLength
    ) {
      fail(`Finding authority hash changed while indexing: ${authority.path}`);
    }
    const existing = db
      .prepare(
        "SELECT artifactSha256 FROM runArtifacts WHERE runId = ? AND role = ?",
      )
      .get(runId, authority.role);
    if (existing !== undefined) {
      if (
        !isJsonRecord(existing) ||
        existing.artifactSha256 !== registered.sha256
      ) {
        fail(
          `Execution row ${String(runId)} already has a different authority for role ${authority.role}.`,
        );
      }
      continue;
    }
    insert.run(runId, authority.role, registered.sha256);
  }
}

function findings(args: readonly string[]): void {
  const [transcriptArg, ...rest] = args;
  const transcriptPath = required(transcriptArg, "<transcript.jsonl>");
  const dbPath = required(flagValue(rest, "--db"), "--db");
  const evidenceSetDirectory = flagValue(rest, "--execution-row-directory");
  const reviewPaths = flagValues(rest, "--review");
  const scenarioReviewPaths = flagValues(rest, "--scenario-review");
  const generationLedgerPaths = flagValues(rest, "--generation-ledger");
  const supportedReviewReplayFlags = new Set([
    "--review-replay-milestone",
    "--review-replay-final",
  ]);
  const unsupportedReviewReplayFlag = rest.find(
    (argument) =>
      argument.startsWith("--review-replay") &&
      !supportedReviewReplayFlags.has(argument),
  );
  if (
    unsupportedReviewReplayFlag !== undefined &&
    unsupportedReviewReplayFlag !== "--review-replay"
  ) {
    fail(`Unsupported findings replay flag: ${unsupportedReviewReplayFlag}.`);
  }
  if (hasFlag(rest, "--review-replay")) {
    fail(
      "Findings review replay uses the named --review-replay-milestone and --review-replay-final flags.",
    );
  }
  const milestoneReviewReplayPath = optionalSingleFlagValue(
    rest,
    "--review-replay-milestone",
  );
  const finalReviewReplayPath = optionalSingleFlagValue(
    rest,
    "--review-replay-final",
  );
  if (
    (milestoneReviewReplayPath === undefined) !==
    (finalReviewReplayPath === undefined)
  ) {
    fail(
      "Findings review replay requires one named milestone envelope and one named final envelope.",
    );
  }
  const reviewReplay =
    milestoneReviewReplayPath === undefined ||
    finalReviewReplayPath === undefined
      ? undefined
      : {
          tag: "milestoneAndFinal" as const,
          milestonePath: milestoneReviewReplayPath,
          finalPath: finalReviewReplayPath,
        };
  const outputPath =
    flagValue(rest, "--output") ??
    findingsArtifactPath(
      evidenceSetDirectory ?? defaultEvidenceSetDirectory(transcriptPath),
    );
  const renderPath = flagValue(rest, "--render");
  const db = openArtifactIndex(dbPath);
  const run = runByTranscript(db, transcriptPath);
  const importedReviewPaths = reviewPathsForRun(db, run.id);
  if (importedReviewPaths.length === 0) {
    db.close();
    fail(
      `Execution row ${String(run.id)} has no imported review; final findings must follow review import.`,
    );
  }
  const requestedReviewPaths = new Set(
    reviewPaths.map((path) => resolve(repoRoot, path)),
  );
  if (
    requestedReviewPaths.size > 0 &&
    importedReviewPaths.some(
      (path) => !requestedReviewPaths.has(resolve(repoRoot, path)),
    )
  ) {
    db.close();
    fail(
      `Final findings must include every imported review for Execution row ${String(run.id)}.`,
    );
  }
  const unlinked = unlinkedIssueFingerprintsForRun(db, run.id);
  if (unlinked.length > 0) {
    db.close();
    fail(
      `Final findings require linked issue fingerprints before projection: ${unlinked.join(", ")}`,
    );
  }
  const issueLinks = issueLinksForRun(db, run.id);
  db.close();
  const projection = projectExecutionFindings({
    transcriptPath,
    ...(evidenceSetDirectory === undefined ? {} : { evidenceSetDirectory }),
    reviewPaths: importedReviewPaths,
    scenarioReviewPaths,
    generationLedgerPaths,
    ...(reviewReplay === undefined ? {} : { reviewReplay }),
    issueLinks,
  });
  if (projection.subject.tag !== "execution") {
    fail("Execution findings projection did not retain Execution identity.");
  }
  if (
    projection.subject.executionId !== run.executionId ||
    projection.subject.evidenceSetId !== run.evidenceSetId ||
    projection.subject.scenarioId !== run.scenarioId ||
    projection.subject.gitSha !== run.gitSha ||
    projection.subject.startedAt !== run.startedAt ||
    findingsTranscriptSha256(projection.subject) !== run.transcriptSha256
  ) {
    fail("Findings projection identity does not match the indexed Execution.");
  }
  const authority = writeFindingsProjection({
    projection,
    path: outputPath,
  });
  const indexed = openArtifactIndex(dbPath);
  try {
    indexed.exec("BEGIN");
    try {
      const registered = registerIndexArtifact({
        db: indexed,
        path: outputPath,
        mediaType: "application/json",
      });
      if (registered.sha256 !== authority.sha256) {
        fail("Findings artifact hash changed while indexing.");
      }
      insertFindingAuthorities(indexed, run.id, projection.authorities);
      const existingRole = indexed
        .prepare(
          "SELECT artifactSha256 FROM runArtifacts WHERE runId = ? AND role = 'findings'",
        )
        .get(run.id);
      if (existingRole !== undefined) {
        if (
          !isJsonRecord(existingRole) ||
          existingRole.artifactSha256 !== registered.sha256
        ) {
          fail(
            `Execution row ${String(run.id)} already has a different findings artifact.`,
          );
        }
      } else {
        indexed
          .prepare(
            "INSERT INTO runArtifacts(runId, role, artifactSha256) VALUES (?, 'findings', ?)",
          )
          .run(run.id, registered.sha256);
      }
      insertFindingsProjection(
        indexed,
        run.id,
        registered.sha256,
        projection.findings,
      );
      indexed.exec("COMMIT");
    } catch (error) {
      indexed.exec("ROLLBACK");
      throw error;
    }
  } finally {
    indexed.close();
  }
  if (renderPath !== undefined) {
    writeFindingsAudit({ projection, path: renderPath });
  }
  console.log(
    `Projected ${String(projection.findings.length)} finding(s) for Execution row ${String(run.id)} into ${outputPath}`,
  );
}

function generationFindings(args: readonly string[]): void {
  const [findingsArg, ...rest] = args;
  const findingsPath = required(findingsArg, "<findings.json>");
  const dbPath = required(flagValue(rest, "--db"), "--db");
  const campaignRowId = ingestGenerationFindings({ findingsPath, dbPath });
  console.log(
    `Indexed Scenario Campaign findings row ${String(campaignRowId)} from ${findingsPath} into ${dbPath}`,
  );
}

function audit(args: readonly string[]): void {
  const dbPath = required(flagValue(args, "--db"), "--db");
  const runId = positiveExecutionRowId(
    required(flagValue(args, "--execution-row"), "--execution-row"),
  );
  const outputPath = flagValue(args, "--output");
  const db = openArtifactIndexReadOnly(dbPath);
  try {
    const row = db
      .prepare(
        `SELECT runs.id, runs.executionId, runs.evidenceSetId, runs.scenarioId, runs.gitSha, runs.startedAt, runs.transcriptSha256,
                artifacts.path AS findingsPath, artifacts.sha256 AS findingsSha256, artifacts.byteLength AS findingsByteLength
         FROM runs
         JOIN runArtifacts ON runArtifacts.runId = runs.id AND runArtifacts.role = 'findings'
         JOIN artifacts ON artifacts.sha256 = runArtifacts.artifactSha256
         WHERE runs.id = ? AND runs.evidenceKind = 'currentExecution'`,
      )
      .get(runId);
    const decodedRow = Schema.decodeUnknownEither(
      PersistedExecutionAuditSchema,
      { onExcessProperty: "error" },
    )(row);
    if (Either.isLeft(decodedRow)) {
      fail(`Execution row ${String(runId)} has no indexed findings artifact.`);
    }
    const execution = decodedRow.right;
    const projection = readIndexedFindingsProjection({
      db,
      dbPath,
      findingsPath: execution.findingsPath,
      findingsSha256: execution.findingsSha256,
      findingsByteLength: execution.findingsByteLength,
    });
    if (projection.subject.tag !== "execution") {
      fail(`Execution row ${String(runId)} has non-Execution findings.`);
    }
    if (
      projection.subject.executionId !== execution.executionId ||
      projection.subject.evidenceSetId !== execution.evidenceSetId ||
      projection.subject.scenarioId !== execution.scenarioId ||
      projection.subject.gitSha !== execution.gitSha ||
      projection.subject.startedAt !== execution.startedAt ||
      findingsTranscriptSha256(projection.subject) !==
        execution.transcriptSha256
    ) {
      fail(
        `Findings artifact identity does not match Execution row ${String(runId)}.`,
      );
    }
    if (outputPath === undefined) {
      process.stdout.write(renderFindingsAudit(projection));
    } else {
      writeFindingsAudit({ projection, path: outputPath });
      console.log(
        `Rendered Execution row ${String(runId)} audit into ${outputPath}`,
      );
    }
  } finally {
    db.close();
  }
}

function generationAudit(args: readonly string[]): void {
  const dbPath = required(flagValue(args, "--db"), "--db");
  const campaignRowId = positiveInteger(
    required(flagValue(args, "--campaign-row"), "--campaign-row"),
    "--campaign-row",
  );
  const outputPath = flagValue(args, "--output");
  const db = openArtifactIndexReadOnly(dbPath);
  try {
    const row = db
      .prepare(
        `SELECT scenarioCampaigns.campaignId, scenarioCampaigns.plannedScenarioId, scenarioCampaigns.evidenceSetId, scenarioCampaigns.gitSha, scenarioCampaigns.startedAt,
                artifacts.path AS findingsPath, artifacts.sha256 AS findingsSha256, artifacts.byteLength AS findingsByteLength
         FROM scenarioCampaigns
         JOIN scenarioCampaignArtifacts
           ON scenarioCampaignArtifacts.scenarioCampaignRowId = scenarioCampaigns.id
          AND scenarioCampaignArtifacts.role = 'findings'
         JOIN artifacts ON artifacts.sha256 = scenarioCampaignArtifacts.artifactSha256
         WHERE scenarioCampaigns.id = ?`,
      )
      .get(campaignRowId);
    const decodedRow = Schema.decodeUnknownEither(
      PersistedCampaignAuditSchema,
      { onExcessProperty: "error" },
    )(row);
    if (Either.isLeft(decodedRow)) {
      fail(
        `Scenario Campaign row ${String(campaignRowId)} has no indexed findings artifact.`,
      );
    }
    const campaign = decodedRow.right;
    const projection = readIndexedFindingsProjection({
      db,
      dbPath,
      findingsPath: campaign.findingsPath,
      findingsSha256: campaign.findingsSha256,
      findingsByteLength: campaign.findingsByteLength,
    });
    if (projection.subject.tag !== "scenarioCampaign") {
      fail(
        `Scenario Campaign row ${String(campaignRowId)} has non-Campaign findings.`,
      );
    }
    if (
      projection.subject.campaignId !== campaign.campaignId ||
      projection.subject.plannedScenarioId !== campaign.plannedScenarioId ||
      projection.subject.evidenceSetId !== campaign.evidenceSetId ||
      projection.subject.gitSha !== campaign.gitSha ||
      projection.subject.startedAt !== campaign.startedAt ||
      findingsTranscriptSha256(projection.subject) !== undefined
    ) {
      fail(
        `Generation findings identity does not match Scenario Campaign row ${String(campaignRowId)}.`,
      );
    }
    if (outputPath === undefined) {
      process.stdout.write(renderFindingsAudit(projection));
    } else {
      writeFindingsAudit({ projection, path: outputPath });
      console.log(
        `Rendered Scenario Campaign row ${String(campaignRowId)} audit into ${outputPath}`,
      );
    }
  } finally {
    db.close();
  }
}

function legacyInventory(args: readonly string[]): void {
  const legacyDbPath = required(flagValue(args, "--legacy-db"), "--legacy-db");
  console.log(JSON.stringify(inventoryLegacyDatabase({ legacyDbPath })));
}

function rebuildIndex(args: readonly string[]): void {
  const legacyDbPath = required(flagValue(args, "--legacy-db"), "--legacy-db");
  const dbPath = required(flagValue(args, "--db"), "--db");
  const artifactDirectory = required(
    flagValue(args, "--artifacts"),
    "--artifacts",
  );
  const result = rebuildLegacyArtifactIndex({
    legacyDbPath,
    dbPath,
    artifactDirectory,
  });
  console.log(`Rebuilt ${result.inventory.length} legacy artifact references.`);
}

function portableExport(args: readonly string[]): void {
  const dbPath = required(flagValue(args, "--db"), "--db");
  const destination = required(
    flagValue(args, "--destination"),
    "--destination",
  );
  const manifest = exportArtifactIndex({ dbPath, destination });
  console.log(JSON.stringify(manifest));
}

function controlledReporting(args: readonly string[]): void {
  const [transcriptArg, reviewArg, ...rest] = args;
  const transcriptPath = required(transcriptArg, "<transcript.jsonl>");
  const reviewPath = required(reviewArg, "<review.json>");
  const dbPath = required(flagValue(rest, "--db"), "--db");
  const destination = required(
    flagValue(rest, "--destination"),
    "--destination",
  );
  const timingPath = required(flagValue(rest, "--timing"), "--timing");
  const reviewInvocationEvidencePath = required(
    flagValue(rest, "--review-invocation-evidence"),
    "--review-invocation-evidence",
  );
  const reviewInvocationEvidence = readReviewInvocationEvidenceManifest(
    reviewInvocationEvidencePath,
  );
  if (
    resolve(repoRoot, transcriptPath) !==
      resolve(repoRoot, reviewInvocationEvidence.transcript.path) ||
    resolve(repoRoot, reviewPath) !==
      resolve(repoRoot, reviewInvocationEvidence.review.path)
  ) {
    fail(
      "Controlled reporting inputs do not match the review invocation evidence.",
    );
  }
  const absoluteDestination = resolve(repoRoot, destination);
  const absoluteTimingPath = resolve(repoRoot, timingPath);
  const portableTimingPath = relative(absoluteDestination, absoluteTimingPath);
  if (
    portableTimingPath === ".." ||
    portableTimingPath.startsWith(`..${sep}`)
  ) {
    fail("Controlled reporting timing must be inside the portable export.");
  }
  if (existsSync(absoluteTimingPath)) {
    fail("Refusing to overwrite controlled reporting timing evidence.");
  }
  const started = performance.now();
  const evidenceSources = [
    {
      role: "reviewInvocationEvidence",
      path: reviewInvocationEvidencePath,
      mediaType: "application/json",
    },
    {
      role: "postPlayReviewAudit",
      path: reviewInvocationEvidence.audit.path,
      mediaType: "application/x-ndjson",
    },
    {
      role: "postPlayReviewPacket",
      path: reviewInvocationEvidence.packet.path,
      mediaType: "application/json",
    },
    ...reviewInvocationEvidence.prePlayReviews.flatMap(
      ({ reviewStage, sourceInput, replayInput }) => [
        {
          role: `prePlayReviewSourceInput-${reviewStage}`,
          path: sourceInput.path,
          mediaType: "application/json",
        },
        {
          role: `prePlayReviewReplayInput-${reviewStage}`,
          path: replayInput.path,
          mediaType: "application/json",
        },
      ],
    ),
    ...reviewInvocationEvidence.invocationLedgers.map(({ path }, index) => ({
      role: `modelInvocationLedger-${index + 1}`,
      path,
      mediaType: "application/x-ndjson",
    })),
    ...reviewInvocationEvidence.invocationEvents.map(({ path }, index) => ({
      role: `modelInvocationEvents-${index + 1}`,
      path,
      mediaType: "application/x-ndjson",
    })),
    ...reviewInvocationEvidence.invocationRawArtifacts.map(
      ({ path }, index) => ({
        role: `modelInvocationRawArtifact-${index + 1}`,
        path,
        mediaType: "application/octet-stream",
      }),
    ),
  ];
  const runId = ingestArtifactRunWithArtifacts({
    transcriptPath,
    dbPath,
    additionalArtifacts: evidenceSources,
  });
  review([
    reviewPath,
    "--db",
    dbPath,
    "--execution-row",
    String(runId),
    "--review-invocation-evidence",
    reviewInvocationEvidencePath,
  ]);
  const manifest = exportArtifactIndex({ dbPath, destination });
  const transcriptSha256 = createHash("sha256")
    .update(readFileSync(resolve(repoRoot, transcriptPath)))
    .digest("hex");
  const reviewSha256 = createHash("sha256")
    .update(readFileSync(resolve(repoRoot, reviewPath)))
    .digest("hex");
  writeFileSync(
    absoluteTimingPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        operations: ["ingest", "review", "portableExport"],
        runId,
        transcriptSha256,
        reviewSha256,
        indexSha256: manifest.index.sha256,
        elapsedMilliseconds: Math.round(performance.now() - started),
      },
      null,
      2,
    )}\n`,
    { flag: "wx" },
  );
  const timingArtifact = artifactAuthorityForBytes(
    portableTimingPath,
    readFileSync(absoluteTimingPath),
  );
  writeFileSync(
    resolve(absoluteDestination, "manifest.json"),
    `${JSON.stringify(
      {
        ...manifest,
        artifacts: [...manifest.artifacts, timingArtifact].sort((left, right) =>
          left.sha256.localeCompare(right.sha256),
        ),
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Controlled reporting evidence: ${timingPath}`);
}

function recordDrilldown(args: readonly string[]): void {
  const [recordsPath, provenancePath] = args;
  const dbPath = required(flagValue(args, "--db"), "--db");
  const reviewId = positiveInteger(
    required(flagValue(args, "--review"), "--review"),
    "--review",
  );
  const extractedPath = required(recordsPath, "<records.jsonl>");
  const path = required(provenancePath, "<provenance.json>");
  const value: unknown = JSON.parse(
    readFileSync(resolve(repoRoot, path), "utf8"),
  );
  if (
    !isJsonRecord(value) ||
    value.schemaVersion !== 1 ||
    typeof value.transcriptPath !== "string" ||
    typeof value.transcriptByteLength !== "number" ||
    typeof value.transcriptSha256 !== "string" ||
    typeof value.extractedRecordsByteLength !== "number" ||
    typeof value.extractedRecordsSha256 !== "string" ||
    !Array.isArray(value.records)
  ) {
    fail("SDK extraction provenance is invalid.");
  }
  const extractedBytes = readFileSync(resolve(repoRoot, extractedPath));
  if (
    extractedBytes.byteLength !== value.extractedRecordsByteLength ||
    createHash("sha256").update(extractedBytes).digest("hex") !==
      value.extractedRecordsSha256
  ) {
    fail("SDK extraction artifact does not match its provenance.");
  }
  const extractedLines = extractedBytes
    .toString("utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0);
  if (extractedLines.length !== value.records.length) {
    fail("SDK extraction artifact record count does not match its provenance.");
  }
  const db = openArtifactIndex(dbPath);
  try {
    const review = db
      .prepare(
        `SELECT reviews.id, transcript.sha256, transcript.byteLength, transcript.path,
                audit.path AS auditPath, replay.path AS replayPath
         FROM reviews
         JOIN runs ON runs.id = reviews.runId
         JOIN artifacts transcript ON transcript.sha256 = runs.transcriptSha256
         LEFT JOIN artifacts audit ON audit.sha256 = reviews.auditSha256
         LEFT JOIN runArtifacts replayRole
           ON replayRole.runId = runs.id AND replayRole.role = 'replaySupervisor'
         LEFT JOIN artifacts replay ON replay.sha256 = replayRole.artifactSha256
         WHERE reviews.id = ?`,
      )
      .get(reviewId);
    if (!isJsonRecord(review)) {
      fail(`Unknown review ${reviewId}`);
    }
    if (
      review.sha256 !== value.transcriptSha256 ||
      review.byteLength !== value.transcriptByteLength
    ) {
      fail(
        "SDK extraction provenance does not identify the reviewed transcript.",
      );
    }
    if (
      typeof review.path !== "string" ||
      typeof review.auditPath !== "string" ||
      typeof review.replayPath !== "string"
    ) {
      fail("Reviewed drill-down has no derived audit authority.");
    }
    const audit = readSdkAudit(resolve(repoRoot, review.auditPath), {
      transcriptPath: review.path,
      replaySupervisorPath: review.replayPath,
    });
    if (audit.tag === "invalid") fail(audit.message);
    const requestedSequences = value.records.map((row) => {
      if (!isJsonRecord(row) || typeof row.seq !== "number") {
        return fail("SDK extraction provenance record is invalid.");
      }
      return row.seq;
    });
    const authoritativeExtraction = extractSdkTranscriptSequences({
      audit: audit.audit,
      sequences: requestedSequences,
      transcriptArtifactPath: review.path,
      replaySupervisorArtifactPath: review.replayPath,
    });
    if (authoritativeExtraction.tag === "invalid") {
      fail(authoritativeExtraction.message);
    }
    if (
      authoritativeExtraction.encodedRecords !==
        extractedBytes.toString("utf8") ||
      sha256Canonical(authoritativeExtraction.provenance) !==
        sha256Canonical(value)
    ) {
      fail("SDK extraction does not match the reviewed derived audit.");
    }
    const artifact = registerIndexArtifact({
      db,
      path,
      mediaType: "application/json",
    });
    const extractionArtifact = registerIndexArtifact({
      db,
      path: extractedPath,
      mediaType: "application/x-ndjson",
    });
    db.exec("BEGIN");
    try {
      const insert = db.prepare(
        `INSERT INTO reviewDrilldowns(reviewId, seq, extractedSha256, extractedByteLength, extractionArtifactSha256, provenanceSha256)
         VALUES (?, ?, ?, ?, ?, ?)`,
      );
      for (const [index, row] of value.records.entries()) {
        if (
          !isJsonRecord(row) ||
          typeof row.seq !== "number" ||
          typeof row.operation !== "string" ||
          (row.outcome !== "returned" && row.outcome !== "threw") ||
          typeof row.extractedSha256 !== "string" ||
          typeof row.extractedByteLength !== "number"
        ) {
          fail("SDK extraction provenance record is invalid.");
        }
        const extractedLine = extractedLines[index];
        if (
          extractedLine === undefined ||
          Buffer.byteLength(extractedLine) !== row.extractedByteLength ||
          createHash("sha256").update(extractedLine).digest("hex") !==
            row.extractedSha256
        ) {
          fail(
            `SDK extraction record ${row.seq} does not match its provenance.`,
          );
        }
        const extractedRecord: unknown = (() => {
          try {
            return JSON.parse(extractedLine);
          } catch {
            return fail(`SDK extraction record ${row.seq} is malformed JSON.`);
          }
        })();
        if (
          !isJsonRecord(extractedRecord) ||
          extractedRecord.seq !== row.seq ||
          extractedRecord.operation !== row.operation ||
          extractedRecord.outcome !== row.outcome
        ) {
          fail(
            `SDK extraction record ${row.seq} identity does not match its provenance.`,
          );
        }
        insert.run(
          reviewId,
          row.seq,
          row.extractedSha256,
          row.extractedByteLength,
          extractionArtifact.sha256,
          artifact.sha256,
        );
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  } finally {
    db.close();
  }
}

function verdict(args: readonly string[]): void {
  const dbPath = required(flagValue(args, "--db"), "--db");
  const runId = positiveExecutionRowId(
    required(flagValue(args, "--execution-row"), "--execution-row"),
  );
  const parsedVerdictClass = verdictClass(
    required(flagValue(args, "--class"), "--class"),
  );
  const claim = required(flagValue(args, "--claim"), "--claim");
  const evidence = required(flagValue(args, "--evidence"), "--evidence");
  const reviewer = required(flagValue(args, "--reviewer"), "--reviewer");

  const db = openArtifactIndex(dbPath);
  if (!executionExists(db, runId)) {
    db.close();
    fail(`Unknown Execution row ${runId}`);
  }
  const createdAt = new Date().toISOString();
  const insertVerdict = db.prepare(
    "INSERT INTO verdicts(runId, class, claim, evidence, reviewer, createdAt, issueFingerprint) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  db.exec("BEGIN");
  const info = (() => {
    try {
      const issueFingerprint = recordBugIssue(
        db,
        parsedVerdictClass,
        claim,
        createdAt,
      );
      const inserted = insertVerdict.run(
        runId,
        parsedVerdictClass,
        claim,
        evidence,
        reviewer,
        createdAt,
        Option.getOrNull(issueFingerprint),
      );
      db.exec("COMMIT");
      return inserted;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  })();
  console.log(
    `Verdict ${Number(info.lastInsertRowid)} recorded for Execution row ${runId}: ${parsedVerdictClass}`,
  );
  db.close();
}

export function review(args: readonly string[]): void {
  const [reviewArg, ...rest] = args;
  const reviewPath = required(reviewArg, "<review.json>");
  const dbPath = required(flagValue(rest, "--db"), "--db");
  const runId = positiveExecutionRowId(
    required(flagValue(rest, "--execution-row"), "--execution-row"),
  );
  const invocationEvidencePath = flagValue(
    rest,
    "--review-invocation-evidence",
  );
  const invocationEvidence =
    invocationEvidencePath === undefined
      ? undefined
      : readReviewInvocationEvidenceManifest(invocationEvidencePath);
  if (
    invocationEvidence !== undefined &&
    resolve(repoRoot, invocationEvidence.review.path) !==
      resolve(repoRoot, reviewPath)
  )
    fail("Review does not match its invocation evidence.");
  const decoded = Schema.decodeUnknownEither(ReviewOutputSchema, {
    onExcessProperty: "error",
  })(JSON.parse(readFileSync(resolve(repoRoot, reviewPath), "utf8")));
  if (Either.isLeft(decoded))
    fail(`Invalid review output: ${decoded.left.message}`);

  const db = openArtifactIndex(dbPath);
  const row = db
    .prepare(
      `SELECT r.id, r.executionId, r.evidenceSetId, r.scenarioId, r.gitSha, r.startedAt, r.transcriptSha256, a.path AS transcriptPath
       FROM runs r JOIN artifacts a ON a.sha256 = r.transcriptSha256
       WHERE r.id = ? AND r.evidenceKind = 'currentExecution'`,
    )
    .get(runId);
  const persisted = Schema.decodeUnknownEither(PersistedExecutionReviewSchema, {
    onExcessProperty: "error",
  })(row);
  if (Either.isLeft(persisted)) {
    db.close();
    fail(`Unknown Execution row ${runId}`);
  }
  const run = persisted.right;
  const finalFindingsPath = findingsArtifactPath(
    defaultEvidenceSetDirectory(run.transcriptPath),
  );
  const indexedFinalFindings = db
    .prepare(
      "SELECT 1 AS present FROM runArtifacts WHERE runId = ? AND role = 'findings'",
    )
    .get(runId);
  if (
    indexedFinalFindings !== undefined ||
    existsSync(resolve(repoRoot, finalFindingsPath))
  ) {
    db.close();
    fail(
      `Execution row ${String(runId)} already has immutable final findings; additional review import is not allowed.`,
    );
  }
  const currentTranscriptSha256 = createHash("sha256")
    .update(readFileSync(resolve(repoRoot, run.transcriptPath)))
    .digest("hex");
  if (
    run.scenarioId !== decoded.right.scenarioId ||
    run.gitSha !== decoded.right.gitSha ||
    run.transcriptSha256 !== decoded.right.transcriptSha256 ||
    currentTranscriptSha256 !== run.transcriptSha256
  ) {
    db.close();
    fail("Review identity does not match the selected run");
  }
  const createdAt = new Date().toISOString();
  const absoluteReviewPath = resolve(repoRoot, reviewPath);
  const reviewStem = absoluteReviewPath.endsWith(".json")
    ? absoluteReviewPath.slice(0, -".json".length)
    : absoluteReviewPath;
  const reviewArtifact = registerIndexArtifact({
    db,
    path: reviewPath,
    mediaType: "application/json",
  });
  const auditPath =
    invocationEvidence?.audit.path ?? `${reviewStem}.audit.jsonl`;
  const auditArtifact = (() => {
    if (!existsSync(auditPath)) return null;
    const audit = readSdkAudit(auditPath);
    if (
      audit.tag === "invalid" ||
      audit.audit.header.transcriptSha256 !== run.transcriptSha256
    ) {
      fail("Review audit does not match the selected run.");
    }
    return registerIndexArtifact({
      db,
      path: auditPath,
      mediaType: "application/x-ndjson",
    });
  })();
  const ledgerPath =
    invocationEvidence?.invocationLedgers[0]?.path ??
    `${reviewStem}.invocations.jsonl`;
  const ledgerArtifact = existsSync(ledgerPath)
    ? registerIndexArtifact({
        db,
        path: ledgerPath,
        mediaType: "application/x-ndjson",
      })
    : null;
  const insertReviewRound = db.prepare(
    "INSERT INTO reviews(runId, reviewer, artifactSha256, auditSha256, invocationLedgerSha256, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const insert = db.prepare(
    "INSERT INTO verdicts(runId, class, claim, evidence, reviewer, createdAt, reviewId, issueFingerprint) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  db.exec("BEGIN");
  try {
    const reviewRound = insertReviewRound.run(
      runId,
      decoded.right.reviewer,
      reviewArtifact.sha256,
      auditArtifact?.sha256 ?? null,
      ledgerArtifact?.sha256 ?? null,
      createdAt,
    );
    const reviewRoundId = Number(reviewRound.lastInsertRowid);
    for (const row of decoded.right.verdicts) {
      const issueFingerprint = recordBugIssue(
        db,
        row.class,
        row.claim,
        createdAt,
      );
      insert.run(
        runId,
        row.class,
        row.claim,
        row.evidence,
        decoded.right.reviewer,
        createdAt,
        reviewRoundId,
        Option.getOrNull(issueFingerprint),
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  console.log(
    `Imported ${decoded.right.verdicts.length} verdict(s) for Execution row ${runId}`,
  );
  db.close();
}

function summary(args: readonly string[]): void {
  const dbPath = required(flagValue(args, "--db"), "--db");
  const db = openArtifactIndexReadOnly(dbPath);
  try {
    const evidenceCounts = db
      .prepare(
        "SELECT evidenceKind, COUNT(*) AS count FROM runs GROUP BY evidenceKind",
      )
      .all();
    if (
      evidenceCounts.some(
        (row) =>
          !isJsonRecord(row) ||
          typeof row.evidenceKind !== "string" ||
          typeof row.count !== "number",
      )
    ) {
      fail("Report database returned invalid evidence counts");
    }
    const count = (kind: "currentExecution" | "historicalObservation") =>
      evidenceCounts.find(
        (row) => isJsonRecord(row) && row.evidenceKind === kind,
      )?.count ?? 0;
    console.log(`Executions: ${String(count("currentExecution"))}`);
    console.log(
      `Historical observations: ${String(count("historicalObservation"))}`,
    );
    for (const [kind, label] of [
      ["currentExecution", "Execution verdicts"],
      ["historicalObservation", "Historical verdicts"],
    ] as const) {
      const rows = db
        .prepare(
          "SELECT verdicts.class, COUNT(*) AS count FROM verdicts JOIN runs ON runs.id = verdicts.runId WHERE runs.evidenceKind = ? GROUP BY verdicts.class ORDER BY verdicts.class",
        )
        .all(kind);
      if (rows.length === 0) console.log(`${label}: none`);
      for (const row of rows) {
        if (
          !isJsonRecord(row) ||
          typeof row.class !== "string" ||
          typeof row.count !== "number"
        ) {
          fail("Report database returned an invalid verdict count");
        }
        console.log(`${label} ${row.class}: ${row.count}`);
      }
    }
  } finally {
    db.close();
  }
}

function issues(args: readonly string[]): void {
  const { dbPath, linkFilter } = parseIssuesArgs(args);
  const db = openArtifactIndexReadOnly(dbPath);
  try {
    const rows = db
      .prepare(
        `SELECT fingerprint, class, claim, firstSeenAt, lastSeenAt, githubIssueNumber
         FROM issues
         ${issueLinkFilterSql(linkFilter)}
         ORDER BY firstSeenAt, fingerprint`,
      )
      .all();
    for (const row of rows) {
      if (!isIssueRow(row)) {
        fail("Report database returned an invalid issue row");
      }
      console.log(JSON.stringify(row));
    }
  } finally {
    db.close();
  }
}

function parseIssuesArgs(args: readonly string[]): {
  readonly dbPath: string;
  readonly linkFilter: IssueLinkFilter;
} {
  const dbAt = args.indexOf("--db");
  const dbPath = required(dbAt >= 0 ? args[dbAt + 1] : undefined, "--db");
  if (dbPath.startsWith("--")) fail("Missing required --db value");
  const remaining = args.filter((_, at) => at !== dbAt && at !== dbAt + 1);
  const requested = ISSUE_LINK_FILTERS.filter(
    (filter) => filter.flag !== null && hasFlag(remaining, filter.flag),
  );
  if (
    remaining.some(
      (argument) => !requested.some((filter) => filter.flag === argument),
    )
  ) {
    fail(`Unknown issues option ${remaining.join(" ")}`);
  }
  if (requested.length > 1) {
    fail("--linked and --unlinked are mutually exclusive");
  }
  if (remaining.length !== requested.length) {
    fail(`Duplicate issues option ${remaining.join(" ")}`);
  }
  return { dbPath, linkFilter: requested[0]?.kind ?? "all" };
}

function issueLinkFilterSql(filter: IssueLinkFilter): string {
  return Match.value(filter).pipe(
    Match.when("all", () => ""),
    Match.when("linked", () => "WHERE githubIssueNumber IS NOT NULL"),
    Match.when("unlinked", () => "WHERE githubIssueNumber IS NULL"),
    Match.exhaustive,
  );
}

function isIssueRow(value: unknown): value is {
  readonly fingerprint: string;
  readonly class: string;
  readonly claim: string;
  readonly firstSeenAt: string;
  readonly lastSeenAt: string;
  readonly githubIssueNumber: number | null;
} {
  return (
    isJsonRecord(value) &&
    typeof value.fingerprint === "string" &&
    typeof value.class === "string" &&
    typeof value.claim === "string" &&
    typeof value.firstSeenAt === "string" &&
    typeof value.lastSeenAt === "string" &&
    (value.githubIssueNumber === null ||
      (typeof value.githubIssueNumber === "number" &&
        Number.isInteger(value.githubIssueNumber) &&
        value.githubIssueNumber > 0))
  );
}

export function linkGithubIssue(
  args: readonly string[],
  github: GitHubIssueLinker = liveGitHubIssueLinker,
): void {
  linkGithubIssueParsed(parseLinkGithubIssueArgs(args), github);
}

function parseLinkGithubIssueArgs(
  args: readonly string[],
): LinkGithubIssueArgs {
  const dbPath = required(flagValue(args, "--db"), "--db");
  const fingerprint = required(
    flagValue(args, "--fingerprint"),
    "--fingerprint",
  );
  const githubIssueNumberText = required(
    flagValue(args, "--github-issue"),
    "--github-issue",
  );
  const requiredFlags = ["--db", "--fingerprint", "--github-issue"] as const;
  if (
    args.length !== requiredFlags.length * 2 ||
    requiredFlags.some(
      (flag) => args.filter((argument) => argument === flag).length !== 1,
    ) ||
    [dbPath, fingerprint, githubIssueNumberText].some((value) =>
      value.startsWith("--"),
    )
  ) {
    fail(
      "link-github-issue requires exactly one --db, --fingerprint, and --github-issue value",
    );
  }
  const parsedFingerprint = Schema.decodeUnknownEither(SwarmFingerprintSchema)(
    fingerprint,
  );
  if (Either.isLeft(parsedFingerprint)) {
    fail("--fingerprint must be a lowercase SHA-256 value");
  }
  const githubIssueNumberInput = Number(githubIssueNumberText);
  const parsedGithubIssueNumber = Schema.decodeUnknownEither(
    GitHubIssueNumberSchema,
  )(githubIssueNumberInput);
  if (Either.isLeft(parsedGithubIssueNumber)) {
    fail("--github-issue must be a positive integer");
  }
  return {
    dbPath,
    fingerprint: parsedFingerprint.right,
    githubIssueNumber: parsedGithubIssueNumber.right,
  };
}

function currentGithubIssueNumber(
  db: DatabaseSync,
  fingerprint: SwarmFingerprint,
): Either.Either<IssueGithubLink, string> {
  const existing = db
    .prepare(
      "SELECT fingerprint, githubIssueNumber FROM issues WHERE fingerprint = ?",
    )
    .get(fingerprint);
  if (!isJsonRecord(existing) || existing.fingerprint !== fingerprint) {
    return Either.left(`Unknown issue fingerprint ${fingerprint}`);
  }
  return existing.githubIssueNumber === null
    ? Either.right({ kind: "unlinked" })
    : Schema.decodeUnknownEither(GitHubIssueNumberSchema)(
        existing.githubIssueNumber,
      ).pipe(
        Either.map(
          (issueNumber): IssueGithubLink => ({ kind: "linked", issueNumber }),
        ),
        Either.mapLeft(() => `Issue ${fingerprint} has an invalid GitHub link`),
      );
}

function readCurrentGithubIssueNumber(
  dbPath: string,
  fingerprint: SwarmFingerprint,
): Either.Either<IssueGithubLink, string> {
  const db = openArtifactIndex(dbPath);
  try {
    return currentGithubIssueNumber(db, fingerprint);
  } finally {
    db.close();
  }
}

function rejectConflictingLink(
  current: IssueGithubLink,
  requested: GitHubIssueNumber,
  fingerprint: SwarmFingerprint,
): void {
  Match.value(current).pipe(
    Match.when({ kind: "unlinked" }, () => undefined),
    Match.when({ kind: "linked" }, ({ issueNumber }) => {
      if (issueNumber !== requested) {
        fail(
          `Issue ${fingerprint} is already linked to GitHub issue #${issueNumber}; refusing ambiguous relink to #${requested}`,
        );
      }
    }),
    Match.exhaustive,
  );
}

function linkGithubIssueParsed(
  args: LinkGithubIssueArgs,
  github: GitHubIssueLinker,
): void {
  const current = readCurrentGithubIssueNumber(args.dbPath, args.fingerprint);
  if (Either.isLeft(current)) fail(current.left);
  rejectConflictingLink(
    current.right,
    args.githubIssueNumber,
    args.fingerprint,
  );

  const githubResult = github.ensureLinked(
    args.githubIssueNumber,
    args.fingerprint,
  );
  if (Either.isLeft(githubResult)) fail(githubResult.left);

  const db = openArtifactIndex(args.dbPath);
  try {
    db.exec("BEGIN IMMEDIATE");
    try {
      const rechecked = currentGithubIssueNumber(db, args.fingerprint);
      if (Either.isLeft(rechecked)) fail(rechecked.left);
      rejectConflictingLink(
        rechecked.right,
        args.githubIssueNumber,
        args.fingerprint,
      );
      const updated = db
        .prepare(
          "UPDATE issues SET githubIssueNumber = ? WHERE fingerprint = ?",
        )
        .run(args.githubIssueNumber, args.fingerprint);
      if (updated.changes !== 1) {
        fail(`Issue ${args.fingerprint} disappeared during linking`);
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  } finally {
    db.close();
  }
  console.log(
    `Linked issue ${args.fingerprint} to GitHub issue #${args.githubIssueNumber}`,
  );
  console.log(`Open visually: gh issue view ${args.githubIssueNumber} --web`);
}

function linkGithubIssueCommand(args: readonly string[]): void {
  const parsed = parseLinkGithubIssueArgs(args);
  if (process.env[RAW_SWARM_LINK_LOCKED_ENV] === "1") {
    linkGithubIssueParsed(parsed, liveGitHubIssueLinker);
    return;
  }
  const resolvedDbPath = resolve(repoRoot, parsed.dbPath);
  mkdirSync(dirname(resolvedDbPath), { recursive: true });
  const result = spawnSync(
    "flock",
    [
      "--exclusive",
      `${resolvedDbPath}.github-link.lock`,
      process.execPath,
      "--experimental-strip-types",
      fileURLToPath(import.meta.url),
      "link-github-issue",
      ...args,
    ],
    {
      cwd: repoRoot,
      env: { ...process.env, [RAW_SWARM_LINK_LOCKED_ENV]: "1" },
      stdio: "inherit",
    },
  );
  if (result.error !== undefined || result.status !== 0) {
    fail(
      result.error?.message ??
        `Locked link-github-issue failed with status ${String(result.status)}`,
    );
  }
}

function main(): void {
  const [command, ...rest] = process.argv.slice(2);
  Match.value(command).pipe(
    Match.when("ingest", () => ingest(rest)),
    Match.when("findings", () => findings(rest)),
    Match.when("generation-findings", () => generationFindings(rest)),
    Match.when("audit", () => audit(rest)),
    Match.when("generation-audit", () => generationAudit(rest)),
    Match.when("verdict", () => verdict(rest)),
    Match.when("review", () => review(rest)),
    Match.when("summary", () => summary(rest)),
    Match.when("issues", () => issues(rest)),
    Match.when("link-github-issue", () => linkGithubIssueCommand(rest)),
    Match.when("legacy-inventory", () => legacyInventory(rest)),
    Match.when("rebuild-index", () => rebuildIndex(rest)),
    Match.when("export", () => portableExport(rest)),
    Match.when("controlled-reporting", () => controlledReporting(rest)),
    Match.when("drilldown", () => recordDrilldown(rest)),
    Match.orElse(() =>
      fail(
        "Usage: report.ts <ingest|findings|generation-findings|audit|generation-audit|verdict|review|summary|issues|link-github-issue|legacy-inventory|rebuild-index|export|controlled-reporting|drilldown> ... (see scripts/raw-swarm/README.md)",
      ),
    ),
  );
}

if (
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main();
}
