import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { Either, Match, Option, Schema } from "effect";

import { artifactAuthorityForBytes } from "./artifact-authority.ts";
import {
  defaultRunDirectory,
  findingsArtifactPath,
  projectRunFindings,
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

import { isJsonRecord, repoRoot, sha256Canonical } from "./transcript.ts";

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

function positiveRunId(value: string): number {
  return positiveInteger(value, "--run");
}

function verdictClass(value: string): (typeof VERDICT_CLASSES)[number] {
  return (
    VERDICT_CLASSES.find((candidate) => candidate === value) ??
    fail(
      `Invalid --class ${value}; expected one of ${VERDICT_CLASSES.join(", ")}`,
    )
  );
}

function runExists(db: DatabaseSync, runId: number): boolean {
  const run = db.prepare("SELECT id FROM runs WHERE id = ?").get(runId);
  return isJsonRecord(run) && run.id === runId;
}

export function ingest(args: readonly string[]): void {
  const [transcriptArg, ...rest] = args;
  const transcriptPath = required(transcriptArg, "<transcript.jsonl>");
  const dbPath = required(flagValue(rest, "--db"), "--db");
  const runId = ingestArtifactRun({ transcriptPath, dbPath });
  console.log(`Indexed run ${runId} from ${transcriptPath} into ${dbPath}`);
}

function runByTranscript(
  db: DatabaseSync,
  transcriptPath: string,
): {
  readonly id: number;
  readonly scenarioId: string;
  readonly gitSha: string;
  readonly startedAt: string;
  readonly transcriptSha256: string;
} {
  const transcriptSha256 = createHash("sha256")
    .update(readFileSync(resolve(repoRoot, transcriptPath)))
    .digest("hex");
  const row = db
    .prepare(
      "SELECT id, scenarioId, gitSha, startedAt, transcriptSha256 FROM runs WHERE transcriptSha256 = ?",
    )
    .get(transcriptSha256);
  if (
    !isJsonRecord(row) ||
    typeof row.id !== "number" ||
    typeof row.scenarioId !== "string" ||
    typeof row.gitSha !== "string" ||
    typeof row.startedAt !== "string" ||
    row.transcriptSha256 !== transcriptSha256
  ) {
    fail(`Transcript ${transcriptPath} is not indexed in the artifact index.`);
  }
  return {
    id: row.id,
    scenarioId: row.scenarioId,
    gitSha: row.gitSha,
    startedAt: row.startedAt,
    transcriptSha256,
  };
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
        fail(`Run ${String(runId)} has an invalid imported review authority.`);
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
        fail(`Run ${String(runId)} has an invalid issue-link row.`);
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
    fail(`Run ${String(runId)} already has findings from another artifact.`);
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
          `Run ${String(runId)} already has a different authority for role ${authority.role}.`,
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
  const runDirectory = flagValue(rest, "--run-directory");
  const reviewPaths = flagValues(rest, "--review");
  const scenarioReviewPaths = flagValues(rest, "--scenario-review");
  const generationLedgerPaths = flagValues(rest, "--generation-ledger");
  const outputPath =
    flagValue(rest, "--output") ??
    findingsArtifactPath(runDirectory ?? defaultRunDirectory(transcriptPath));
  const renderPath = flagValue(rest, "--render");
  const db = openArtifactIndex(dbPath);
  const run = runByTranscript(db, transcriptPath);
  const importedReviewPaths = reviewPathsForRun(db, run.id);
  if (importedReviewPaths.length === 0) {
    db.close();
    fail(
      `Run ${String(run.id)} has no imported review; final findings must follow review import.`,
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
      `Final findings must include every imported review for run ${String(run.id)}.`,
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
  const projection = projectRunFindings({
    transcriptPath,
    ...(runDirectory === undefined ? {} : { runDirectory }),
    reviewPaths: importedReviewPaths,
    scenarioReviewPaths,
    generationLedgerPaths,
    issueLinks,
  });
  if (
    projection.run.scenarioId !== run.scenarioId ||
    projection.run.gitSha !== run.gitSha ||
    projection.run.startedAt !== run.startedAt ||
    projection.run.transcriptSha256 !== run.transcriptSha256
  ) {
    fail("Findings projection identity does not match the indexed run.");
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
            `Run ${String(run.id)} already has a different findings artifact.`,
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
    `Projected ${String(projection.findings.length)} finding(s) for run ${String(run.id)} into ${outputPath}`,
  );
}

function generationFindings(args: readonly string[]): void {
  const [findingsArg, ...rest] = args;
  const findingsPath = required(findingsArg, "<findings.json>");
  const dbPath = required(flagValue(rest, "--db"), "--db");
  const runId = ingestGenerationFindings({ findingsPath, dbPath });
  console.log(
    `Indexed generation findings run ${String(runId)} from ${findingsPath} into ${dbPath}`,
  );
}

function audit(args: readonly string[]): void {
  const dbPath = required(flagValue(args, "--db"), "--db");
  const runId = positiveRunId(required(flagValue(args, "--run"), "--run"));
  const outputPath = flagValue(args, "--output");
  const db = openArtifactIndex(dbPath);
  const row = db
    .prepare(
      `SELECT runs.scenarioId, runs.gitSha, runs.startedAt, runs.transcriptSha256,
              artifacts.path AS findingsPath
       FROM runs
       JOIN runArtifacts ON runArtifacts.runId = runs.id AND runArtifacts.role = 'findings'
       JOIN artifacts ON artifacts.sha256 = runArtifacts.artifactSha256
       WHERE runs.id = ?`,
    )
    .get(runId);
  db.close();
  if (
    !isJsonRecord(row) ||
    typeof row.findingsPath !== "string" ||
    typeof row.scenarioId !== "string" ||
    typeof row.gitSha !== "string" ||
    typeof row.startedAt !== "string" ||
    typeof row.transcriptSha256 !== "string"
  ) {
    fail(`Run ${String(runId)} has no indexed findings artifact.`);
  }
  const projection = readFindingsProjection(row.findingsPath);
  if (
    projection.run.scenarioId !== row.scenarioId ||
    projection.run.gitSha !== row.gitSha ||
    projection.run.startedAt !== row.startedAt ||
    projection.run.transcriptSha256 !== row.transcriptSha256
  ) {
    fail(`Findings artifact identity does not match run ${String(runId)}.`);
  }
  if (outputPath === undefined) {
    process.stdout.write(renderFindingsAudit(projection));
  } else {
    writeFindingsAudit({ projection, path: outputPath });
    console.log(`Rendered run ${String(runId)} audit into ${outputPath}`);
  }
}

function generationAudit(args: readonly string[]): void {
  const dbPath = required(flagValue(args, "--db"), "--db");
  const runId = positiveRunId(
    required(flagValue(args, "--generation-run"), "--generation-run"),
  );
  const outputPath = flagValue(args, "--output");
  const db = openArtifactIndex(dbPath);
  const row = db
    .prepare(
      `SELECT generationRuns.scenarioId, generationRuns.gitSha, generationRuns.startedAt,
              artifacts.path AS findingsPath
       FROM generationRuns
       JOIN generationRunArtifacts
         ON generationRunArtifacts.generationRunId = generationRuns.id
        AND generationRunArtifacts.role = 'findings'
       JOIN artifacts ON artifacts.sha256 = generationRunArtifacts.artifactSha256
       WHERE generationRuns.id = ?`,
    )
    .get(runId);
  db.close();
  if (
    !isJsonRecord(row) ||
    typeof row.findingsPath !== "string" ||
    typeof row.scenarioId !== "string" ||
    typeof row.gitSha !== "string" ||
    typeof row.startedAt !== "string"
  ) {
    fail(`Generation run ${String(runId)} has no indexed findings artifact.`);
  }
  const projection = readFindingsProjection(row.findingsPath);
  if (
    projection.run.scenarioId !== row.scenarioId ||
    projection.run.gitSha !== row.gitSha ||
    projection.run.startedAt !== row.startedAt ||
    projection.run.transcriptSha256 !== undefined
  ) {
    fail(`Generation findings identity does not match run ${String(runId)}.`);
  }
  if (outputPath === undefined) {
    process.stdout.write(renderFindingsAudit(projection));
  } else {
    writeFindingsAudit({ projection, path: outputPath });
    console.log(
      `Rendered generation run ${String(runId)} audit into ${outputPath}`,
    );
  }
}

function legacyInventory(args: readonly string[]): void {
  const legacyDbPath = required(flagValue(args, "--legacy-db"), "--legacy-db");
  for (const row of inventoryLegacyDatabase({ legacyDbPath })) {
    console.log(JSON.stringify(row));
  }
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
  const runId = ingestArtifactRun({ transcriptPath, dbPath });
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
  const insertRunArtifact = evidenceDb.prepare(
    "INSERT INTO runArtifacts(runId, role, artifactSha256) VALUES (?, ?, ?)",
  );
  for (const { role, path, mediaType } of evidenceSources) {
    const artifact = registerIndexArtifact({ db: evidenceDb, path, mediaType });
    insertRunArtifact.run(runId, role, artifact.sha256);
  }
  evidenceDb.close();
  review([
    reviewPath,
    "--db",
    dbPath,
    "--run",
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
  const runId = positiveRunId(required(flagValue(args, "--run"), "--run"));
  const parsedVerdictClass = verdictClass(
    required(flagValue(args, "--class"), "--class"),
  );
  const claim = required(flagValue(args, "--claim"), "--claim");
  const evidence = required(flagValue(args, "--evidence"), "--evidence");
  const reviewer = required(flagValue(args, "--reviewer"), "--reviewer");

  const db = openArtifactIndex(dbPath);
  if (!runExists(db, runId)) {
    db.close();
    fail(`Unknown run ${runId}`);
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
    `Verdict ${Number(info.lastInsertRowid)} recorded for run ${runId}: ${parsedVerdictClass}`,
  );
  db.close();
}

export function review(args: readonly string[]): void {
  const [reviewArg, ...rest] = args;
  const reviewPath = required(reviewArg, "<review.json>");
  const dbPath = required(flagValue(rest, "--db"), "--db");
  const runId = positiveRunId(required(flagValue(rest, "--run"), "--run"));
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
  const run = db
    .prepare(
      `SELECT r.scenarioId, r.gitSha, r.transcriptSha256, a.path AS transcriptPath
       FROM runs r JOIN artifacts a ON a.sha256 = r.transcriptSha256
       WHERE r.id = ?`,
    )
    .get(runId);
  if (!isJsonRecord(run)) {
    db.close();
    fail(`Unknown run ${runId}`);
  }
  if (typeof run.transcriptPath !== "string") {
    db.close();
    fail("Selected run has no transcript path");
  }
  const finalFindingsPath = findingsArtifactPath(
    defaultRunDirectory(run.transcriptPath),
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
      `Run ${String(runId)} already has immutable final findings; additional review import is not allowed.`,
    );
  }
  const currentTranscriptSha256 = createHash("sha256")
    .update(readFileSync(resolve(repoRoot, run.transcriptPath)))
    .digest("hex");
  if (
    typeof run.transcriptSha256 !== "string" ||
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
    `Imported ${decoded.right.verdicts.length} verdict(s) for run ${runId}`,
  );
  db.close();
}

function summary(args: readonly string[]): void {
  const dbPath = required(flagValue(args, "--db"), "--db");
  const db = openArtifactIndex(dbPath);
  const rows = db
    .prepare(
      "SELECT class, COUNT(*) AS count FROM verdicts GROUP BY class ORDER BY class",
    )
    .all();
  const runCount = db.prepare("SELECT COUNT(*) AS count FROM runs").get();
  if (!isJsonRecord(runCount) || typeof runCount.count !== "number") {
    db.close();
    fail("Report database returned an invalid run count");
  }
  console.log(`runs: ${runCount.count}`);
  if (rows.length === 0) {
    console.log("verdicts: none");
  }
  for (const row of rows) {
    if (
      !isJsonRecord(row) ||
      typeof row.class !== "string" ||
      typeof row.count !== "number"
    ) {
      db.close();
      fail("Report database returned an invalid verdict count");
    }
    console.log(`${row.class}: ${row.count}`);
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
