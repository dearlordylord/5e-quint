import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { Either, Match, Schema } from "effect";

import { ReviewOutputSchema, VERDICT_CLASSES } from "./review-contract.ts";

import {
  isJsonRecord,
  isMcpTranscriptStep,
  isTranscriptHeader,
  mcpToolExchanges,
  parseScriptedTranscript,
  repoRoot,
  sha256Canonical,
  type TranscriptHeader,
  type TranscriptStep,
} from "./transcript.ts";

const githubIssueNumberSqlCheck =
  "githubIssueNumber IS NULL OR (typeof(githubIssueNumber) = 'integer' AND githubIssueNumber > 0)";
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

function openDb(dbPath: string): DatabaseSync {
  const resolved = resolve(repoRoot, dbPath);
  mkdirSync(dirname(resolved), { recursive: true });
  const db = new DatabaseSync(resolved);
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS scenarios(
      id TEXT PRIMARY KEY,
      kind TEXT,
      rawCitations TEXT
    );
    CREATE TABLE IF NOT EXISTS runs(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scenarioId TEXT,
      gitSha TEXT,
      startedAt TEXT,
      transcriptPath TEXT,
      FOREIGN KEY(scenarioId) REFERENCES scenarios(id)
    );
    CREATE TABLE IF NOT EXISTS steps(
      runId INT,
      seq INT,
      tool TEXT,
      args TEXT,
      response TEXT,
      responseSha256 TEXT,
      FOREIGN KEY(runId) REFERENCES runs(id)
    );
    CREATE TABLE IF NOT EXISTS reviewRounds(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      runId INT,
      reviewer TEXT,
      artifactPath TEXT,
      createdAt TEXT,
      FOREIGN KEY(runId) REFERENCES runs(id)
    );
    CREATE TABLE IF NOT EXISTS issues(
      fingerprint TEXT PRIMARY KEY,
      class TEXT,
      claim TEXT,
      firstSeenAt TEXT,
      lastSeenAt TEXT,
      githubIssueNumber INTEGER CHECK(${githubIssueNumberSqlCheck})
    );
    CREATE TABLE IF NOT EXISTS verdicts(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      runId INT,
      class TEXT,
      claim TEXT,
      evidence TEXT,
      reviewer TEXT,
      createdAt TEXT,
      reviewRoundId INT,
      issueFingerprint TEXT,
      FOREIGN KEY(runId) REFERENCES runs(id),
      FOREIGN KEY(reviewRoundId) REFERENCES reviewRounds(id),
      FOREIGN KEY(issueFingerprint) REFERENCES issues(fingerprint)
    );
  `);
  const stepColumns = db.prepare("PRAGMA table_info(steps)").all();
  if (
    !stepColumns.some(
      (column) => isJsonRecord(column) && column.name === "response",
    )
  ) {
    db.exec("ALTER TABLE steps ADD COLUMN response TEXT");
  }
  const verdictColumns = db.prepare("PRAGMA table_info(verdicts)").all();
  if (
    !verdictColumns.some(
      (column) => isJsonRecord(column) && column.name === "reviewRoundId",
    )
  ) {
    db.exec("ALTER TABLE verdicts ADD COLUMN reviewRoundId INT");
  }
  if (
    !verdictColumns.some(
      (column) => isJsonRecord(column) && column.name === "issueFingerprint",
    )
  ) {
    db.exec("ALTER TABLE verdicts ADD COLUMN issueFingerprint TEXT");
  }
  const issueColumns = db.prepare("PRAGMA table_info(issues)").all();
  if (
    !issueColumns.some(
      (column) => isJsonRecord(column) && column.name === "githubIssueNumber",
    )
  ) {
    db.exec(`
      ALTER TABLE issues ADD COLUMN githubIssueNumber INTEGER
        CHECK(${githubIssueNumberSqlCheck})
    `);
  }
  return db;
}

function recordIssue(
  db: DatabaseSync,
  verdictClass: (typeof VERDICT_CLASSES)[number],
  claim: string,
  createdAt: string,
): string | null {
  if (verdictClass === "pass") return null;
  const fingerprint = sha256Canonical({ class: verdictClass, claim });
  db.prepare(
    `INSERT INTO issues(fingerprint, class, claim, firstSeenAt, lastSeenAt)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(fingerprint) DO UPDATE SET lastSeenAt = excluded.lastSeenAt`,
  ).run(fingerprint, verdictClass, claim, createdAt, createdAt);
  return fingerprint;
}

function flagValue(args: readonly string[], flag: string): string | undefined {
  const at = args.indexOf(flag);
  return at >= 0 ? args[at + 1] : undefined;
}

function hasFlag(args: readonly string[], flag: string): boolean {
  return args.includes(flag);
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

  const lines = readFileSync(resolve(repoRoot, transcriptPath), "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line): unknown => JSON.parse(line));

  const [header, ...recordedSteps] = lines;
  if (!isTranscriptHeader(header)) {
    fail("Transcript must start with a valid scenario header");
  }
  const steps = reportSteps(header, recordedSteps);

  const db = openDb(dbPath);
  const insertScenario = db.prepare(
    "INSERT INTO scenarios(id, kind, rawCitations) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING",
  );
  const insertRun = db.prepare(
    "INSERT INTO runs(scenarioId, gitSha, startedAt, transcriptPath) VALUES (?, ?, ?, ?)",
  );
  const insertStep = db.prepare(
    "INSERT INTO steps(runId, seq, tool, args, response, responseSha256) VALUES (?, ?, ?, ?, ?, ?)",
  );

  db.exec("BEGIN");
  const runId = (() => {
    try {
      insertScenario.run(
        header.scenarioId,
        header.kind,
        JSON.stringify(header.rawCitations),
      );
      const storedScenario = db
        .prepare("SELECT kind, rawCitations FROM scenarios WHERE id = ?")
        .get(header.scenarioId);
      if (
        !isJsonRecord(storedScenario) ||
        storedScenario.kind !== header.kind ||
        storedScenario.rawCitations !== JSON.stringify(header.rawCitations)
      ) {
        fail(`Scenario ${header.scenarioId} conflicts with stored metadata`);
      }
      const info = insertRun.run(
        header.scenarioId,
        header.gitSha,
        header.startedAt,
        transcriptPath,
      );
      const insertedRunId = Number(info.lastInsertRowid);
      for (const step of steps) {
        insertStep.run(
          insertedRunId,
          step.seq,
          step.tool,
          JSON.stringify(step.args),
          JSON.stringify(step.response),
          step.responseSha256,
        );
      }
      db.exec("COMMIT");
      return insertedRunId;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  })();

  console.log(
    `Ingested run ${runId} (${steps.length} steps) for scenario ${header.scenarioId} into ${dbPath}`,
  );
  db.close();
}

function reportSteps(
  header: TranscriptHeader,
  records: readonly unknown[],
): readonly TranscriptStep[] {
  if (header.kind === "scripted-probe") {
    const parsed = parseScriptedTranscript([header, ...records]);
    return parsed.tag === "valid" ? parsed.value.steps : fail(parsed.message);
  }
  if (!records.every(isMcpTranscriptStep)) {
    return fail("Freeplay transcript contains an invalid MCP record");
  }
  const exchanges = mcpToolExchanges(records);
  return exchanges.tag === "valid"
    ? exchanges.exchanges
    : fail(exchanges.message);
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

  const db = openDb(dbPath);
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
      const issueFingerprint = recordIssue(
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
        issueFingerprint,
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
  const decoded = Schema.decodeUnknownEither(ReviewOutputSchema, {
    onExcessProperty: "error",
  })(JSON.parse(readFileSync(resolve(repoRoot, reviewPath), "utf8")));
  if (Either.isLeft(decoded))
    fail(`Invalid review output: ${decoded.left.message}`);

  const db = openDb(dbPath);
  if (!runExists(db, runId)) {
    db.close();
    fail(`Unknown run ${runId}`);
  }
  const createdAt = new Date().toISOString();
  const insertReviewRound = db.prepare(
    "INSERT INTO reviewRounds(runId, reviewer, artifactPath, createdAt) VALUES (?, ?, ?, ?)",
  );
  const insert = db.prepare(
    "INSERT INTO verdicts(runId, class, claim, evidence, reviewer, createdAt, reviewRoundId, issueFingerprint) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  db.exec("BEGIN");
  try {
    const reviewRound = insertReviewRound.run(
      runId,
      decoded.right.reviewer,
      reviewPath,
      createdAt,
    );
    const reviewRoundId = Number(reviewRound.lastInsertRowid);
    for (const row of decoded.right.verdicts) {
      const issueFingerprint = recordIssue(db, row.class, row.claim, createdAt);
      insert.run(
        runId,
        row.class,
        row.claim,
        row.evidence,
        decoded.right.reviewer,
        createdAt,
        reviewRoundId,
        issueFingerprint,
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
  const db = openDb(dbPath);
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
  const db = openDb(dbPath);
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
  const db = openDb(dbPath);
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

  const db = openDb(args.dbPath);
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
    Match.when("verdict", () => verdict(rest)),
    Match.when("review", () => review(rest)),
    Match.when("summary", () => summary(rest)),
    Match.when("issues", () => issues(rest)),
    Match.when("link-github-issue", () => linkGithubIssueCommand(rest)),
    Match.orElse(() =>
      fail(
        "Usage: report.ts <ingest|verdict|review|summary|issues|link-github-issue> ... (see scripts/raw-swarm/README.md)",
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
