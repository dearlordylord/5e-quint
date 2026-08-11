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
  isTranscriptStep,
  mcpToolExchanges,
  repoRoot,
  sha256Canonical,
  type TranscriptHeader,
  type TranscriptStep,
} from "./transcript.ts";

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
      lastSeenAt TEXT
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

function required(value: string | undefined, name: string): string {
  return value ?? fail(`Missing required ${name}`);
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
    if (!records.every(isTranscriptStep)) {
      return fail("Scripted transcript contains an invalid step");
    }
    if (
      records.some(
        (step) => step.responseSha256 !== sha256Canonical(step.response),
      )
    ) {
      return fail("Scripted transcript contains a response hash mismatch");
    }
    return records;
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
  const runId = required(flagValue(args, "--run"), "--run");
  const verdictClass = required(flagValue(args, "--class"), "--class");
  const claim = required(flagValue(args, "--claim"), "--claim");
  const evidence = required(flagValue(args, "--evidence"), "--evidence");
  const reviewer = required(flagValue(args, "--reviewer"), "--reviewer");
  if (!VERDICT_CLASSES.some((candidate) => candidate === verdictClass)) {
    fail(
      `Invalid --class ${verdictClass}; expected one of ${VERDICT_CLASSES.join(", ")}`,
    );
  }

  const db = openDb(dbPath);
  const createdAt = new Date().toISOString();
  const issueFingerprint = recordIssue(db, verdictClass, claim, createdAt);
  const info = db
    .prepare(
      "INSERT INTO verdicts(runId, class, claim, evidence, reviewer, createdAt, issueFingerprint) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      Number(runId),
      verdictClass,
      claim,
      evidence,
      reviewer,
      createdAt,
      issueFingerprint,
    );
  console.log(
    `Verdict ${Number(info.lastInsertRowid)} recorded for run ${runId}: ${verdictClass}`,
  );
  db.close();
}

export function review(args: readonly string[]): void {
  const [reviewArg, ...rest] = args;
  const reviewPath = required(reviewArg, "<review.json>");
  const dbPath = required(flagValue(rest, "--db"), "--db");
  const runId = Number(required(flagValue(rest, "--run"), "--run"));
  if (!Number.isInteger(runId) || runId < 1) {
    fail("--run must be a positive integer");
  }
  const decoded = Schema.decodeUnknownEither(ReviewOutputSchema, {
    onExcessProperty: "error",
  })(JSON.parse(readFileSync(resolve(repoRoot, reviewPath), "utf8")));
  if (Either.isLeft(decoded))
    fail(`Invalid review output: ${decoded.left.message}`);

  const db = openDb(dbPath);
  const run = db.prepare("SELECT id FROM runs WHERE id = ?").get(runId);
  if (!isJsonRecord(run) || run.id !== runId) {
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

function main(): void {
  const [command, ...rest] = process.argv.slice(2);
  Match.value(command).pipe(
    Match.when("ingest", () => ingest(rest)),
    Match.when("verdict", () => verdict(rest)),
    Match.when("review", () => review(rest)),
    Match.when("summary", () => summary(rest)),
    Match.orElse(() =>
      fail(
        "Usage: report.ts <ingest|verdict|review|summary> ... (see scripts/raw-swarm/README.md)",
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
