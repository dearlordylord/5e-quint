import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { Either, Match, Option, Schema } from "effect";

import { artifactAuthorityForBytes } from "./artifact-authority.ts";
import {
  defaultEvidenceSetDirectory,
  findingsArtifactPath,
  findingsTranscriptSha256,
  projectExecutionFindings,
  readFindingsProjection,
  writeFindingsProjection,
  type FindingAuthority,
  type Finding,
  type FindingIssueLink,
} from "./findings.ts";
import { renderFindingsAudit, writeFindingsAudit } from "./findings-audit.ts";
import { ReviewOutputSchema, VERDICT_CLASSES } from "./review-contract.ts";
import { readReviewInvocationEvidenceManifest } from "./review-invocation-evidence.ts";
import {
  exportArtifactIndex,
  ingestArtifactRun,
  ingestGenerationFindings,
  inventoryLegacyDatabase,
  openArtifactIndex,
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
} from "./transcript.ts";
import {
  EvidenceSetIdSchema,
  ExecutionIdSchema,
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
  startedAt: Schema.String,
  transcriptSha256: Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/)),
});
type PersistedExecutionIdentity = Schema.Schema.Type<
  typeof PersistedExecutionIdentitySchema
>;
const PersistedExecutionAuditSchema = Schema.Struct({
  ...PersistedExecutionIdentitySchema.fields,
  findingsPath: Schema.String,
});
const PersistedExecutionReviewSchema = Schema.Struct({
  ...PersistedExecutionIdentitySchema.fields,
  transcriptPath: Schema.String,
});
const PersistedCampaignAuditSchema = Schema.Struct({
  campaignId: ScenarioCampaignIdSchema,
  plannedScenarioId: ScenarioIdSchema,
  evidenceSetId: EvidenceSetIdSchema,
  gitSha: GitShaSchema,
  startedAt: Schema.String,
  findingsPath: Schema.String,
});

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
  const db = openArtifactIndex(dbPath);
  const row = db
    .prepare(
      `SELECT runs.id, runs.executionId, runs.evidenceSetId, runs.scenarioId, runs.gitSha, runs.startedAt, runs.transcriptSha256,
              artifacts.path AS findingsPath
       FROM runs
       JOIN runArtifacts ON runArtifacts.runId = runs.id AND runArtifacts.role = 'findings'
       JOIN artifacts ON artifacts.sha256 = runArtifacts.artifactSha256
       WHERE runs.id = ? AND runs.evidenceKind = 'currentExecution'`,
    )
    .get(runId);
  db.close();
  const decodedRow = Schema.decodeUnknownEither(PersistedExecutionAuditSchema, {
    onExcessProperty: "error",
  })(row);
  if (Either.isLeft(decodedRow)) {
    fail(`Execution row ${String(runId)} has no indexed findings artifact.`);
  }
  const execution = decodedRow.right;
  const projection = readFindingsProjection(execution.findingsPath);
  if (projection.subject.tag !== "execution") {
    fail(`Execution row ${String(runId)} has non-Execution findings.`);
  }
  if (
    projection.subject.executionId !== execution.executionId ||
    projection.subject.evidenceSetId !== execution.evidenceSetId ||
    projection.subject.scenarioId !== execution.scenarioId ||
    projection.subject.gitSha !== execution.gitSha ||
    projection.subject.startedAt !== execution.startedAt ||
    findingsTranscriptSha256(projection.subject) !== execution.transcriptSha256
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
}

function generationAudit(args: readonly string[]): void {
  const dbPath = required(flagValue(args, "--db"), "--db");
  const campaignRowId = positiveInteger(
    required(flagValue(args, "--campaign-row"), "--campaign-row"),
    "--campaign-row",
  );
  const outputPath = flagValue(args, "--output");
  const db = openArtifactIndex(dbPath);
  const row = db
    .prepare(
      `SELECT scenarioCampaigns.campaignId, scenarioCampaigns.plannedScenarioId, scenarioCampaigns.evidenceSetId, scenarioCampaigns.gitSha, scenarioCampaigns.startedAt,
              artifacts.path AS findingsPath
       FROM scenarioCampaigns
       JOIN scenarioCampaignArtifacts
         ON scenarioCampaignArtifacts.scenarioCampaignRowId = scenarioCampaigns.id
        AND scenarioCampaignArtifacts.role = 'findings'
       JOIN artifacts ON artifacts.sha256 = scenarioCampaignArtifacts.artifactSha256
       WHERE scenarioCampaigns.id = ?`,
    )
    .get(campaignRowId);
  db.close();
  const decodedRow = Schema.decodeUnknownEither(PersistedCampaignAuditSchema, {
    onExcessProperty: "error",
  })(row);
  if (Either.isLeft(decodedRow)) {
    fail(
      `Scenario Campaign row ${String(campaignRowId)} has no indexed findings artifact.`,
    );
  }
  const campaign = decodedRow.right;
  const projection = readFindingsProjection(campaign.findingsPath);
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
  const runId = ingestArtifactRun({
    transcriptPath,
    dbPath,
  });
  const evidenceDb = openArtifactIndex(dbPath);
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
  ];
  const insertExecutionArtifact = evidenceDb.prepare(
    "INSERT INTO runArtifacts(runId, role, artifactSha256) VALUES (?, ?, ?)",
  );
  for (const { role, path, mediaType } of evidenceSources) {
    const artifact = registerIndexArtifact({ db: evidenceDb, path, mediaType });
    insertExecutionArtifact.run(runId, role, artifact.sha256);
  }
  evidenceDb.close();
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
  const db = openArtifactIndex(dbPath);
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
    db.close();
    fail("Report database returned invalid evidence counts");
  }
  const count = (kind: "currentExecution" | "historicalObservation") =>
    evidenceCounts.find((row) => isJsonRecord(row) && row.evidenceKind === kind)
      ?.count ?? 0;
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
        db.close();
        fail("Report database returned an invalid verdict count");
      }
      console.log(`${label} ${row.class}: ${row.count}`);
    }
  }
  db.close();
}

function issues(args: readonly string[]): void {
  const { dbPath, linkFilter } = parseIssuesArgs(args);
  const db = openArtifactIndex(dbPath);
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
      db.close();
      fail("Report database returned an invalid issue row");
    }
    console.log(JSON.stringify(row));
  }
  db.close();
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
