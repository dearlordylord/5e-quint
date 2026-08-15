import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Either, Schema } from "effect";

import { ReviewOutputSchema } from "./review-contract.ts";
import { preflightSdkTranscript } from "./sdk-player/sdk-audit.ts";
import { parseSdkTranscript } from "./sdk-player/sdk-transcript.ts";
import { isJsonRecord, parsePlayerTranscript, repoRoot } from "./transcript.ts";

const INDEX_SCHEMA_VERSION = 1;

export type LegacyArtifactDisposition =
  | "artifactBacked"
  | "databaseOnly"
  | "inconsistent";

export type LegacyArtifactInventory = {
  readonly kind: "run" | "review";
  readonly legacyId: number;
  readonly disposition: LegacyArtifactDisposition;
  readonly indexedPath: string;
  readonly expectedSha256?: string;
  readonly currentSha256?: string;
  readonly recoveredPath?: string;
  readonly ambiguousArtifacts?: readonly {
    readonly path: string;
    readonly sha256: string;
  }[];
};

function fail(message: string): never {
  throw new Error(message);
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function relativeArtifactPath(path: string): string {
  let absolute: string;
  try {
    absolute = realpathSync(resolve(repoRoot, path));
  } catch {
    return fail(`Artifact is unreadable or missing: ${path}`);
  }
  const relativePath = relative(repoRoot, absolute);
  if (relativePath.startsWith(`..${sep}`) || relativePath === "..") {
    fail(`Artifact escapes the repository root: ${path}`);
  }
  return relativePath;
}

function jsonLines(path: string): readonly unknown[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line): unknown => JSON.parse(line));
}

export function openArtifactIndex(path: string): DatabaseSync {
  const absolute = resolve(repoRoot, path);
  mkdirSync(dirname(absolute), { recursive: true });
  const db = new DatabaseSync(absolute);
  const legacySteps = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'steps'",
    )
    .get();
  if (legacySteps !== undefined) {
    db.close();
    return fail(
      "Legacy Raw Swarm database must be inventoried and rebuilt before use.",
    );
  }
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS indexMetadata(
      schemaVersion INTEGER PRIMARY KEY CHECK(schemaVersion = ${INDEX_SCHEMA_VERSION})
    ) STRICT;
    INSERT OR IGNORE INTO indexMetadata(schemaVersion) VALUES (${INDEX_SCHEMA_VERSION});
    CREATE TABLE IF NOT EXISTS artifacts(
      sha256 TEXT PRIMARY KEY CHECK(length(sha256) = 64 AND sha256 NOT GLOB '*[^0-9a-f]*'),
      byteLength INTEGER NOT NULL CHECK(byteLength >= 0),
      mediaType TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE
    ) STRICT;
    CREATE TABLE IF NOT EXISTS runs(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scenarioId TEXT NOT NULL,
      gitSha TEXT NOT NULL,
      startedAt TEXT NOT NULL,
      transcriptSha256 TEXT NOT NULL UNIQUE REFERENCES artifacts(sha256),
      consumerIsolation TEXT CHECK(consumerIsolation IS NULL OR consumerIsolation IN ('permissionProfile', 'instructionalFallback'))
    ) STRICT;
    CREATE TABLE IF NOT EXISTS calls(
      runId INTEGER NOT NULL REFERENCES runs(id),
      seq INTEGER NOT NULL CHECK(seq > 0),
      source TEXT NOT NULL CHECK(source IN ('sdk', 'mcp')),
      continuation INTEGER,
      operation TEXT NOT NULL,
      outcome TEXT NOT NULL CHECK(outcome IN ('returned', 'threw')),
      inputSessionSha256 TEXT,
      outputSessionSha256 TEXT,
      resultSha256 TEXT,
      rejection TEXT,
      reviewFacts TEXT,
      CHECK(
        (source = 'sdk' AND operation IN ('scenarioRelation', 'discoverBattleActs', 'resolveScenarioMovement', 'resolveBattleRuntimeSubject', 'resolveBattleRuntimeInterrupt', 'endBattleRuntimeTurn'))
        OR (source = 'mcp' AND length(trim(operation)) > 0)
      ),
      CHECK(rejection IS NULL OR rejection IN ('sessionConflict', 'operationFailure')),
      CHECK(inputSessionSha256 IS NULL OR (length(inputSessionSha256) = 64 AND inputSessionSha256 NOT GLOB '*[^0-9a-f]*')),
      CHECK(outputSessionSha256 IS NULL OR (length(outputSessionSha256) = 64 AND outputSessionSha256 NOT GLOB '*[^0-9a-f]*')),
      CHECK(resultSha256 IS NULL OR (length(resultSha256) = 64 AND resultSha256 NOT GLOB '*[^0-9a-f]*')),
      CHECK(reviewFacts IS NULL OR json_valid(reviewFacts)),
      CHECK(
        (source = 'sdk' AND continuation IS NOT NULL AND continuation > 0 AND inputSessionSha256 IS NOT NULL AND reviewFacts IS NOT NULL)
        OR
        (source = 'mcp' AND continuation IS NULL AND inputSessionSha256 IS NULL AND outputSessionSha256 IS NULL AND rejection IS NULL AND reviewFacts IS NULL)
      ),
      CHECK(
        (outcome = 'returned' AND source = 'sdk' AND rejection IS NULL AND outputSessionSha256 IS NOT NULL AND resultSha256 IS NOT NULL)
        OR
        (outcome = 'returned' AND source = 'mcp' AND resultSha256 IS NOT NULL)
        OR
        (outcome = 'threw' AND source = 'sdk' AND rejection IS NOT NULL AND outputSessionSha256 IS NULL AND resultSha256 IS NULL)
      ),
      PRIMARY KEY(runId, seq)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS runArtifacts(
      runId INTEGER NOT NULL REFERENCES runs(id),
      role TEXT NOT NULL,
      artifactSha256 TEXT NOT NULL REFERENCES artifacts(sha256),
      PRIMARY KEY(runId, role)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS reviews(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      runId INTEGER NOT NULL REFERENCES runs(id),
      reviewer TEXT NOT NULL,
      artifactSha256 TEXT NOT NULL REFERENCES artifacts(sha256),
      auditSha256 TEXT REFERENCES artifacts(sha256),
      invocationLedgerSha256 TEXT REFERENCES artifacts(sha256),
      createdAt TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS issues(
      fingerprint TEXT PRIMARY KEY CHECK(length(fingerprint) = 64 AND fingerprint NOT GLOB '*[^0-9a-f]*'),
      class TEXT NOT NULL,
      claim TEXT NOT NULL,
      firstSeenAt TEXT NOT NULL,
      lastSeenAt TEXT NOT NULL,
      githubIssueNumber INTEGER CHECK(githubIssueNumber IS NULL OR githubIssueNumber > 0)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS verdicts(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      runId INTEGER NOT NULL REFERENCES runs(id),
      class TEXT NOT NULL,
      claim TEXT NOT NULL,
      evidence TEXT NOT NULL,
      reviewer TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      reviewId INTEGER REFERENCES reviews(id),
      issueFingerprint TEXT REFERENCES issues(fingerprint)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS reviewDrilldowns(
      reviewId INTEGER NOT NULL REFERENCES reviews(id),
      seq INTEGER NOT NULL CHECK(seq > 0),
      extractedSha256 TEXT NOT NULL CHECK(length(extractedSha256) = 64 AND extractedSha256 NOT GLOB '*[^0-9a-f]*'),
      extractedByteLength INTEGER NOT NULL CHECK(extractedByteLength >= 0),
      extractionArtifactSha256 TEXT NOT NULL REFERENCES artifacts(sha256),
      provenanceSha256 TEXT NOT NULL REFERENCES artifacts(sha256),
      PRIMARY KEY(reviewId, seq)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS legacyInventory(
      kind TEXT NOT NULL CHECK(kind IN ('run', 'review', 'database')),
      legacyId INTEGER NOT NULL,
      disposition TEXT NOT NULL CHECK(disposition IN ('artifactBacked', 'databaseOnly', 'inconsistent')),
      evidenceSha256 TEXT REFERENCES artifacts(sha256),
      detail TEXT NOT NULL,
      PRIMARY KEY(kind, legacyId)
    ) STRICT;
    CREATE INDEX IF NOT EXISTS calls_operation ON calls(operation);
    CREATE INDEX IF NOT EXISTS verdicts_run ON verdicts(runId);
    CREATE INDEX IF NOT EXISTS verdicts_issue ON verdicts(issueFingerprint);
  `);
  return db;
}

function registerArtifact(
  db: DatabaseSync,
  path: string,
  mediaType: string,
): {
  readonly sha256: string;
  readonly byteLength: number;
  readonly path: string;
} {
  const relativePath = relativeArtifactPath(path);
  const bytes = readFileSync(resolve(repoRoot, relativePath));
  const digest = sha256(bytes);
  const byDigest = db
    .prepare(
      "SELECT byteLength, mediaType, path FROM artifacts WHERE sha256 = ?",
    )
    .get(digest);
  if (byDigest !== undefined) {
    if (
      typeof byDigest !== "object" ||
      byDigest === null ||
      byDigest.byteLength !== bytes.byteLength ||
      typeof byDigest.path !== "string"
    ) {
      fail(`Artifact index has contradictory metadata for SHA-256 ${digest}.`);
    }
    return {
      sha256: digest,
      byteLength: bytes.byteLength,
      path: byDigest.path,
    };
  }
  const byPath = db
    .prepare("SELECT sha256 FROM artifacts WHERE path = ?")
    .get(relativePath);
  if (byPath !== undefined) {
    fail(`Indexed artifact changed at ${relativePath}.`);
  }
  db.prepare(
    "INSERT INTO artifacts(sha256, byteLength, mediaType, path) VALUES (?, ?, ?, ?)",
  ).run(digest, bytes.byteLength, mediaType, relativePath);
  return { sha256: digest, byteLength: bytes.byteLength, path: relativePath };
}

export function registerIndexArtifact(input: {
  readonly db: DatabaseSync;
  readonly path: string;
  readonly mediaType: string;
}): {
  readonly sha256: string;
  readonly byteLength: number;
  readonly path: string;
} {
  return registerArtifact(input.db, input.path, input.mediaType);
}

export function ingestArtifactRun(input: {
  readonly transcriptPath: string;
  readonly dbPath: string;
  readonly indexedTranscriptPath?: string;
}): number {
  const absoluteTranscript = resolve(repoRoot, input.transcriptPath);
  const records = jsonLines(absoluteTranscript);
  const sdk = parseSdkTranscript(records);
  const mcp =
    sdk.tag === "invalid" ? parsePlayerTranscript(records) : undefined;
  if (sdk.tag === "invalid" && (mcp === undefined || mcp.tag === "invalid")) {
    fail(sdk.message);
  }
  const db = openArtifactIndex(input.dbPath);
  try {
    const artifact = registerArtifact(
      db,
      input.indexedTranscriptPath ?? absoluteTranscript,
      "application/x-ndjson",
    );
    const sourceBytes = readFileSync(absoluteTranscript);
    if (
      artifact.sha256 !== sha256(sourceBytes) ||
      artifact.byteLength !== sourceBytes.byteLength
    ) {
      fail(
        "Indexed transcript bytes do not match the parsed transcript source.",
      );
    }
    if (
      db
        .prepare("SELECT id FROM runs WHERE transcriptSha256 = ?")
        .get(artifact.sha256) !== undefined
    ) {
      fail(`Transcript ${artifact.sha256} is already indexed.`);
    }
    db.exec("BEGIN");
    try {
      const identity = (() => {
        if (sdk.tag === "valid") return sdk.value.header;
        if (mcp?.tag === "valid") return mcp.value.header;
        return fail("Evidence transcript has no valid identity.");
      })();
      const isolation =
        sdk.tag === "valid" ? sdk.value.header.consumerIsolation : null;
      const run = db
        .prepare(
          "INSERT INTO runs(scenarioId, gitSha, startedAt, transcriptSha256, consumerIsolation) VALUES (?, ?, ?, ?, ?)",
        )
        .run(
          identity.scenarioId,
          identity.gitSha,
          identity.startedAt,
          artifact.sha256,
          isolation,
        );
      const runId = Number(run.lastInsertRowid);
      if (sdk.tag === "valid") {
        const header = sdk.value.header;
        const runDirectory = dirname(dirname(absoluteTranscript));
        const candidates = [
          [
            "scenario",
            resolve(runDirectory, "SCENARIO.md"),
            "text/markdown",
            header.scenarioSha256,
          ],
          [
            "scenarioReview",
            resolve(runDirectory, "SCENARIO_REVIEW.json"),
            "application/json",
            header.scenarioReviewSha256,
          ],
          [
            "replaySupervisor",
            resolve(runDirectory, "replay-supervisor.mjs"),
            "text/javascript",
            header.replaySupervisorSha256,
          ],
          [
            "characters",
            resolve(runDirectory, "evidence/characters.ts"),
            "text/typescript",
            header.charactersSha256,
          ],
          [
            "setup",
            resolve(runDirectory, "evidence/setup.ts"),
            "text/typescript",
            header.characterOutcome === "ready"
              ? header.setupSha256
              : undefined,
          ],
          [
            "program",
            resolve(runDirectory, "evidence/program.ts"),
            "text/typescript",
            undefined,
          ],
          [
            "frozenPrefix",
            resolve(runDirectory, "evidence/frozen-prefix.json"),
            "application/json",
            undefined,
          ],
          [
            "final",
            resolve(runDirectory, "evidence/final.json"),
            "application/json",
            undefined,
          ],
          [
            "modelInvocations",
            resolve(runDirectory, "evidence/invocations.jsonl"),
            "application/x-ndjson",
            undefined,
          ],
          [
            "modelEvents",
            resolve(runDirectory, "evidence/player-events.jsonl"),
            "application/x-ndjson",
            undefined,
          ],
          [
            "supervisorTimings",
            resolve(runDirectory, "evidence/supervisor-timings.jsonl"),
            "application/x-ndjson",
            undefined,
          ],
        ] as const;
        const insertArtifact = db.prepare(
          "INSERT INTO runArtifacts(runId, role, artifactSha256) VALUES (?, ?, ?)",
        );
        for (const [role, path, mediaType, expectedSha256] of candidates) {
          if (!existsSync(path)) {
            if (expectedSha256 !== undefined) {
              fail(`Run artifact ${role} is missing.`);
            }
            continue;
          }
          const registered = registerArtifact(db, path, mediaType);
          if (
            expectedSha256 !== undefined &&
            registered.sha256 !== expectedSha256
          ) {
            fail(`Run artifact ${role} does not match its transcript hash.`);
          }
          insertArtifact.run(runId, role, registered.sha256);
        }
      }
      const insert = db.prepare(
        `INSERT INTO calls(runId, seq, source, continuation, operation, outcome, inputSessionSha256, outputSessionSha256, resultSha256, rejection, reviewFacts)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      if (sdk.tag === "valid") {
        const audit = preflightSdkTranscript({
          transcriptPath: input.transcriptPath,
          recordedTranscriptPath: artifact.path,
        });
        if (audit.tag === "invalid") fail(audit.message);
        for (const call of audit.audit.calls) {
          insert.run(
            runId,
            call.seq,
            "sdk",
            call.continuation,
            call.operation,
            call.outcome,
            call.inputSessionSha256,
            call.outputSessionSha256 ?? null,
            call.resultSha256 ?? null,
            call.rejection ?? null,
            JSON.stringify(call.reviewFacts),
          );
        }
      } else if (mcp?.tag === "valid") {
        for (const exchange of mcp.value.exchanges) {
          insert.run(
            runId,
            exchange.seq,
            "mcp",
            null,
            exchange.tool,
            "returned",
            null,
            null,
            exchange.responseSha256,
            null,
            null,
          );
        }
      }
      db.exec("COMMIT");
      return runId;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  } finally {
    db.close();
  }
}

function filesBelow(path: string): readonly string[] {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true }).flatMap(
    (entry): readonly string[] => {
      const child = resolve(path, entry.name);
      return entry.isDirectory() ? filesBelow(child) : [child];
    },
  );
}

function shaAt(path: string): string | undefined {
  return existsSync(path) ? sha256(readFileSync(path)) : undefined;
}

function recoverBySha(
  expectedSha256: string,
  candidates: readonly string[],
): string | undefined {
  return candidates.find((candidate) => shaAt(candidate) === expectedSha256);
}

export function inventoryLegacyDatabase(input: {
  readonly legacyDbPath: string;
  readonly artifactSearchRoot?: string;
}): readonly LegacyArtifactInventory[] {
  const db = new DatabaseSync(resolve(repoRoot, input.legacyDbPath), {
    readOnly: true,
  });
  try {
    const searchRoot = resolve(
      repoRoot,
      input.artifactSearchRoot ?? "scripts/raw-swarm/out",
    );
    const candidates = filesBelow(searchRoot);
    const runs = db
      .prepare(
        "SELECT id, transcriptPath, transcriptSha256 FROM runs ORDER BY id",
      )
      .all();
    const inventory: LegacyArtifactInventory[] = runs.map((row) => {
      if (
        !isJsonRecord(row) ||
        typeof row.id !== "number" ||
        typeof row.transcriptPath !== "string" ||
        typeof row.transcriptSha256 !== "string"
      ) {
        fail("Legacy run identity is invalid.");
      }
      const currentSha256 = shaAt(resolve(repoRoot, row.transcriptPath));
      if (currentSha256 === row.transcriptSha256) {
        return {
          kind: "run",
          legacyId: row.id,
          disposition: "artifactBacked",
          indexedPath: row.transcriptPath,
          expectedSha256: row.transcriptSha256,
          currentSha256,
          recoveredPath: row.transcriptPath,
        };
      }
      const recovered = recoverBySha(row.transcriptSha256, candidates);
      return {
        kind: "run",
        legacyId: row.id,
        disposition: recovered === undefined ? "databaseOnly" : "inconsistent",
        indexedPath: row.transcriptPath,
        expectedSha256: row.transcriptSha256,
        ...(currentSha256 === undefined ? {} : { currentSha256 }),
        ...(recovered === undefined
          ? {}
          : { recoveredPath: relative(repoRoot, recovered) }),
      };
    });
    const reviewRoundHasReviewer = db
      .prepare("PRAGMA table_info(reviewRounds)")
      .all()
      .some((column) => isJsonRecord(column) && column.name === "reviewer");
    const reviews = db
      .prepare(
        `SELECT rr.id, rr.artifactPath, ${reviewRoundHasReviewer ? "rr.reviewer" : "NULL"} AS reviewRoundReviewer, r.scenarioId, r.gitSha, r.transcriptSha256
         FROM reviewRounds rr JOIN runs r ON r.id = rr.runId ORDER BY rr.id`,
      )
      .all();
    const hasVerdicts =
      db
        .prepare(
          "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'verdicts'",
        )
        .get() !== undefined;
    for (const row of reviews) {
      if (
        !isJsonRecord(row) ||
        typeof row.id !== "number" ||
        typeof row.artifactPath !== "string" ||
        (row.reviewRoundReviewer !== null &&
          typeof row.reviewRoundReviewer !== "string")
      ) {
        fail("Legacy review identity is invalid.");
      }
      const expectedVerdicts = hasVerdicts
        ? db
            .prepare(
              "SELECT class, claim, evidence FROM verdicts WHERE reviewRoundId = ? ORDER BY id",
            )
            .all(row.id)
        : [];
      const expectedReviewers = hasVerdicts
        ? new Set(
            db
              .prepare(
                "SELECT DISTINCT reviewer FROM verdicts WHERE reviewRoundId = ?",
              )
              .all(row.id)
              .flatMap((value) =>
                isJsonRecord(value) && typeof value.reviewer === "string"
                  ? [value.reviewer]
                  : [],
              ),
          )
        : new Set<string>();
      const matches = (path: string): boolean => {
        try {
          const decoded = Schema.decodeUnknownEither(ReviewOutputSchema, {
            onExcessProperty: "error",
          })(JSON.parse(readFileSync(path, "utf8")));
          if (Either.isLeft(decoded)) return false;
          const value = decoded.right;
          return (
            value.scenarioId === row.scenarioId &&
            value.gitSha === row.gitSha &&
            value.transcriptSha256 === row.transcriptSha256 &&
            (row.reviewRoundReviewer === null ||
              value.reviewer === row.reviewRoundReviewer) &&
            (expectedReviewers.size === 0 ||
              (expectedReviewers.size === 1 &&
                expectedReviewers.has(value.reviewer))) &&
            (!hasVerdicts ||
              JSON.stringify(value.verdicts) ===
                JSON.stringify(expectedVerdicts))
          );
        } catch {
          return false;
        }
      };
      const indexed = resolve(repoRoot, row.artifactPath);
      const matchesByContent = [indexed, ...candidates]
        .filter((candidate, index, all) => all.indexOf(candidate) === index)
        .filter(
          (candidate) => candidate.endsWith(".json") && matches(candidate),
        );
      const matchingDigests = new Set(
        matchesByContent.flatMap((candidate) => {
          const digest = shaAt(candidate);
          return digest === undefined ? [] : [digest];
        }),
      );
      if (matchingDigests.size > 1) {
        const currentSha256 = shaAt(indexed);
        inventory.push({
          kind: "review",
          legacyId: row.id,
          disposition: "inconsistent",
          indexedPath: row.artifactPath,
          ...(currentSha256 === undefined ? {} : { currentSha256 }),
          ambiguousArtifacts: matchesByContent.flatMap((candidate) => {
            const digest = shaAt(candidate);
            return digest === undefined
              ? []
              : [{ path: relative(repoRoot, candidate), sha256: digest }];
          }),
        });
        continue;
      }
      const recovered = matchesByContent[0];
      const currentSha256 = shaAt(indexed);
      const expectedSha256 =
        recovered === undefined ? undefined : shaAt(recovered);
      inventory.push({
        kind: "review",
        legacyId: row.id,
        disposition:
          recovered === undefined
            ? "databaseOnly"
            : recovered === indexed
              ? "artifactBacked"
              : "inconsistent",
        indexedPath: row.artifactPath,
        ...(currentSha256 === undefined ? {} : { currentSha256 }),
        ...(expectedSha256 === undefined ? {} : { expectedSha256 }),
        ...(recovered === undefined
          ? {}
          : { recoveredPath: relative(repoRoot, recovered) }),
      });
    }
    return inventory;
  } finally {
    db.close();
  }
}

function contentAddressedCopy(input: {
  readonly sourcePath: string;
  readonly artifactDirectory: string;
  readonly extension: string;
}): string {
  const bytes = readFileSync(resolve(repoRoot, input.sourcePath));
  const digest = sha256(bytes);
  const destination = resolve(
    repoRoot,
    input.artifactDirectory,
    digest.slice(0, 2),
    `${digest}.${input.extension}`,
  );
  mkdirSync(dirname(destination), { recursive: true });
  if (!existsSync(destination))
    copyFileSync(resolve(repoRoot, input.sourcePath), destination);
  return relative(repoRoot, destination);
}

function tableCount(db: DatabaseSync, table: string): number {
  const row = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get();
  return isJsonRecord(row) && typeof row.count === "number"
    ? row.count
    : fail(`Invalid ${table} count.`);
}

export function rebuildLegacyArtifactIndex(input: {
  readonly legacyDbPath: string;
  readonly dbPath: string;
  readonly artifactDirectory: string;
}): { readonly inventory: readonly LegacyArtifactInventory[] } {
  if (existsSync(resolve(repoRoot, input.dbPath)))
    fail("Refusing to overwrite rebuilt index.");
  const inventory = inventoryLegacyDatabase({
    legacyDbPath: input.legacyDbPath,
  });
  const oldDb = new DatabaseSync(resolve(repoRoot, input.legacyDbPath), {
    readOnly: true,
  });
  const runIdMap = new Map<number, number>();
  const reviewIdMap = new Map<number, number>();
  try {
    for (const item of inventory.filter((entry) => entry.kind === "run")) {
      if (item.recoveredPath === undefined) continue;
      const retained = contentAddressedCopy({
        sourcePath: item.recoveredPath,
        artifactDirectory: input.artifactDirectory,
        extension: "jsonl",
      });
      runIdMap.set(
        item.legacyId,
        ingestArtifactRun({
          transcriptPath: item.recoveredPath,
          indexedTranscriptPath: retained,
          dbPath: input.dbPath,
        }),
      );
    }
    const newDb = openArtifactIndex(input.dbPath);
    try {
      const legacyTables = oldDb
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        .all()
        .map((row) =>
          isJsonRecord(row) && typeof row.name === "string"
            ? row.name
            : fail("Legacy database table inventory is invalid."),
        );
      const quotedTable = (table: string): string =>
        `"${table.replaceAll('"', '""')}"`;
      const exactLegacyRows = Object.fromEntries(
        legacyTables.map((table) => [
          table,
          oldDb
            .prepare(`SELECT * FROM ${quotedTable(table)} ORDER BY rowid`)
            .all(),
        ]),
      );
      const legacyExportPath = resolve(
        repoRoot,
        input.artifactDirectory,
        "legacy-database-exact.json",
      );
      mkdirSync(dirname(legacyExportPath), { recursive: true });
      writeFileSync(
        legacyExportPath,
        `${JSON.stringify(exactLegacyRows, null, 2)}\n`,
        { flag: "wx" },
      );
      const retainedExactRows: unknown = JSON.parse(
        readFileSync(legacyExportPath, "utf8"),
      );
      if (JSON.stringify(retainedExactRows) !== JSON.stringify(exactLegacyRows))
        fail("Exact legacy row export changed during serialization.");
      const legacyExportArtifact = registerArtifact(
        newDb,
        legacyExportPath,
        "application/json",
      );
      newDb
        .prepare(
          "INSERT INTO legacyInventory(kind, legacyId, disposition, evidenceSha256, detail) VALUES ('database', 0, 'artifactBacked', ?, ?)",
        )
        .run(
          legacyExportArtifact.sha256,
          JSON.stringify({
            sourceDatabaseSha256: shaAt(resolve(repoRoot, input.legacyDbPath)),
            tables: legacyTables.map((table) => ({
              table,
              rowCount: exactLegacyRows[table].length,
              rowsSha256: sha256(
                Buffer.from(JSON.stringify(exactLegacyRows[table])),
              ),
            })),
          }),
        );
      for (const item of inventory) {
        let evidenceSha256: string | null = null;
        if (item.recoveredPath !== undefined) {
          const retained = contentAddressedCopy({
            sourcePath: item.recoveredPath,
            artifactDirectory: input.artifactDirectory,
            extension: item.kind === "run" ? "jsonl" : "json",
          });
          evidenceSha256 = registerArtifact(
            newDb,
            retained,
            item.kind === "run" ? "application/x-ndjson" : "application/json",
          ).sha256;
        } else {
          const rows =
            item.kind === "run"
              ? oldDb
                  .prepare("SELECT * FROM steps WHERE runId = ? ORDER BY seq")
                  .all(item.legacyId)
              : oldDb
                  .prepare(
                    "SELECT * FROM verdicts WHERE reviewRoundId = ? ORDER BY id",
                  )
                  .all(item.legacyId);
          const exportPath = resolve(
            repoRoot,
            input.artifactDirectory,
            "legacy-database-only",
            `${item.kind}-${item.legacyId}.json`,
          );
          mkdirSync(dirname(exportPath), { recursive: true });
          writeFileSync(
            exportPath,
            `${JSON.stringify({ inventory: item, rows }, null, 2)}\n`,
            { flag: "wx" },
          );
          evidenceSha256 = registerArtifact(
            newDb,
            exportPath,
            "application/json",
          ).sha256;
        }
        newDb
          .prepare(
            "INSERT INTO legacyInventory(kind, legacyId, disposition, evidenceSha256, detail) VALUES (?, ?, ?, ?, ?)",
          )
          .run(
            item.kind,
            item.legacyId,
            item.disposition,
            evidenceSha256,
            JSON.stringify(item),
          );
      }
      for (const row of oldDb
        .prepare("SELECT * FROM issues ORDER BY fingerprint")
        .all()) {
        if (!isJsonRecord(row)) fail("Legacy issue row is invalid.");
        newDb
          .prepare(
            `INSERT INTO issues(fingerprint, class, claim, firstSeenAt, lastSeenAt, githubIssueNumber)
           VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .run(
            row.fingerprint,
            row.class,
            row.claim,
            row.firstSeenAt,
            row.lastSeenAt,
            row.githubIssueNumber ?? null,
          );
      }
      for (const row of oldDb
        .prepare("SELECT * FROM reviewRounds ORDER BY id")
        .all()) {
        if (
          !isJsonRecord(row) ||
          typeof row.id !== "number" ||
          typeof row.runId !== "number" ||
          typeof row.reviewer !== "string" ||
          typeof row.createdAt !== "string"
        ) {
          fail("Legacy review row is invalid.");
        }
        const runId = runIdMap.get(row.runId);
        if (runId === undefined) continue;
        const artifact = inventory.find(
          (item) => item.kind === "review" && item.legacyId === row.id,
        );
        if (artifact?.recoveredPath === undefined) continue;
        const retained = contentAddressedCopy({
          sourcePath: artifact.recoveredPath,
          artifactDirectory: input.artifactDirectory,
          extension: "json",
        });
        const registered = registerArtifact(
          newDb,
          retained,
          "application/json",
        );
        const inserted = newDb
          .prepare(
            "INSERT INTO reviews(runId, reviewer, artifactSha256, auditSha256, invocationLedgerSha256, createdAt) VALUES (?, ?, ?, NULL, NULL, ?)",
          )
          .run(runId, row.reviewer, registered.sha256, row.createdAt);
        reviewIdMap.set(row.id, Number(inserted.lastInsertRowid));
      }
      let retainedVerdicts = 0;
      let databaseOnlyVerdicts = 0;
      for (const row of oldDb
        .prepare("SELECT * FROM verdicts ORDER BY id")
        .all()) {
        if (
          !isJsonRecord(row) ||
          typeof row.runId !== "number" ||
          typeof row.class !== "string" ||
          typeof row.claim !== "string" ||
          typeof row.evidence !== "string" ||
          typeof row.reviewer !== "string" ||
          typeof row.createdAt !== "string"
        ) {
          fail("Legacy verdict row is invalid.");
        }
        const runId = runIdMap.get(row.runId);
        if (runId === undefined) {
          databaseOnlyVerdicts += 1;
          continue;
        }
        let reviewId: number | null = null;
        if (typeof row.reviewRoundId === "number") {
          const mappedReviewId = reviewIdMap.get(row.reviewRoundId);
          if (mappedReviewId === undefined) {
            databaseOnlyVerdicts += 1;
            continue;
          }
          reviewId = mappedReviewId;
        }
        newDb
          .prepare(
            `INSERT INTO verdicts(runId, class, claim, evidence, reviewer, createdAt, reviewId, issueFingerprint)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            runId,
            row.class,
            row.claim,
            row.evidence,
            row.reviewer,
            row.createdAt,
            reviewId,
            row.issueFingerprint ?? null,
          );
        retainedVerdicts += 1;
      }
      const databaseOnlyRuns = inventory.filter(
        (item) => item.kind === "run" && item.recoveredPath === undefined,
      ).length;
      if (runIdMap.size + databaseOnlyRuns !== tableCount(oldDb, "runs"))
        fail("Legacy run disposition count mismatch.");
      const expectedCalls = [...runIdMap.keys()].reduce((count, oldRunId) => {
        const row = oldDb
          .prepare("SELECT COUNT(*) AS count FROM steps WHERE runId = ?")
          .get(oldRunId);
        return (
          count +
          (isJsonRecord(row) && typeof row.count === "number"
            ? row.count
            : fail("Invalid legacy call count."))
        );
      }, 0);
      if (tableCount(newDb, "calls") !== expectedCalls)
        fail("Recoverable legacy call count mismatch.");
      const databaseOnlyReviews = inventory.filter(
        (item) => item.kind === "review" && item.recoveredPath === undefined,
      ).length;
      if (
        reviewIdMap.size + databaseOnlyReviews !==
        tableCount(oldDb, "reviewRounds")
      )
        fail("Legacy review disposition count mismatch.");
      if (tableCount(newDb, "verdicts") !== retainedVerdicts)
        fail("Recoverable legacy verdict count mismatch.");
      if (
        retainedVerdicts + databaseOnlyVerdicts !==
        tableCount(oldDb, "verdicts")
      )
        fail("Legacy verdict disposition count mismatch.");
      if (tableCount(newDb, "issues") !== tableCount(oldDb, "issues"))
        fail("Legacy issue count mismatch.");
      const linked = (db: DatabaseSync): number => {
        const row = db
          .prepare(
            "SELECT COUNT(*) AS count FROM issues WHERE githubIssueNumber IS NOT NULL",
          )
          .get();
        return isJsonRecord(row) && typeof row.count === "number"
          ? row.count
          : fail("Invalid linked issue count.");
      };
      if (linked(newDb) !== linked(oldDb))
        fail("Legacy issue-link count mismatch.");
      const retainedLegacy = newDb
        .prepare("SELECT evidenceSha256 FROM legacyInventory")
        .all();
      for (const row of retainedLegacy) {
        if (!isJsonRecord(row) || typeof row.evidenceSha256 !== "string")
          fail("Legacy evidence reference is invalid.");
        const artifact = newDb
          .prepare(
            "SELECT path, sha256, byteLength FROM artifacts WHERE sha256 = ?",
          )
          .get(row.evidenceSha256);
        if (
          !isJsonRecord(artifact) ||
          typeof artifact.path !== "string" ||
          typeof artifact.sha256 !== "string" ||
          typeof artifact.byteLength !== "number"
        )
          fail("Legacy evidence artifact is missing.");
        const bytes = readFileSync(resolve(repoRoot, artifact.path));
        if (
          bytes.byteLength !== artifact.byteLength ||
          sha256(bytes) !== artifact.sha256
        )
          fail("Legacy evidence artifact hash verification failed.");
      }
    } finally {
      newDb.close();
    }
  } finally {
    oldDb.close();
  }
  return { inventory };
}

export type PortableManifest = {
  readonly schemaVersion: 1;
  readonly index: {
    readonly path: string;
    readonly sha256: string;
    readonly byteLength: number;
  };
  readonly artifacts: readonly {
    readonly path: string;
    readonly sha256: string;
    readonly byteLength: number;
  }[];
};

export function exportArtifactIndex(input: {
  readonly dbPath: string;
  readonly destination: string;
}): PortableManifest {
  const destination = resolve(input.destination);
  if (existsSync(destination)) fail("Refusing to overwrite portable export.");
  mkdirSync(destination, { recursive: true });
  const source = openArtifactIndex(input.dbPath);
  const snapshot = resolve(destination, "index.sqlite");
  try {
    source.exec(`VACUUM INTO '${snapshot.replaceAll("'", "''")}'`);
  } finally {
    source.close();
  }
  const snapshotDb = new DatabaseSync(snapshot);
  const artifactRows = snapshotDb
    .prepare(
      `SELECT DISTINCT artifacts.sha256, artifacts.byteLength, artifacts.path
       FROM artifacts
       WHERE artifacts.sha256 IN (
         SELECT transcriptSha256 FROM runs
         UNION SELECT artifactSha256 FROM runArtifacts
         UNION SELECT artifactSha256 FROM reviews
         UNION SELECT auditSha256 FROM reviews WHERE auditSha256 IS NOT NULL
         UNION SELECT invocationLedgerSha256 FROM reviews WHERE invocationLedgerSha256 IS NOT NULL
         UNION SELECT extractionArtifactSha256 FROM reviewDrilldowns
         UNION SELECT provenanceSha256 FROM reviewDrilldowns
         UNION SELECT evidenceSha256 FROM legacyInventory WHERE evidenceSha256 IS NOT NULL
       )
       ORDER BY artifacts.sha256`,
    )
    .all();
  const updatePortablePath = snapshotDb.prepare(
    "UPDATE artifacts SET path = ? WHERE sha256 = ?",
  );
  snapshotDb.exec("BEGIN IMMEDIATE");
  const artifacts = artifactRows.map((row) => {
    if (
      !isJsonRecord(row) ||
      typeof row.sha256 !== "string" ||
      typeof row.byteLength !== "number" ||
      typeof row.path !== "string"
    ) {
      fail("Artifact index contains an invalid reference.");
    }
    const containedPath = relativeArtifactPath(row.path);
    const sourcePath = realpathSync(resolve(repoRoot, containedPath));
    const bytes = readFileSync(sourcePath);
    if (bytes.byteLength !== row.byteLength || sha256(bytes) !== row.sha256) {
      fail(`Artifact changed before export: ${row.path}`);
    }
    const exportedPath = resolve(
      destination,
      "artifacts",
      row.sha256.slice(0, 2),
      `${row.sha256}${extname(row.path)}`,
    );
    mkdirSync(dirname(exportedPath), { recursive: true });
    copyFileSync(sourcePath, exportedPath);
    const portablePath = relative(destination, exportedPath);
    updatePortablePath.run(portablePath, row.sha256);
    return {
      path: portablePath,
      sha256: row.sha256,
      byteLength: row.byteLength,
    };
  });
  snapshotDb.exec("COMMIT");
  snapshotDb.close();
  const indexBytes = readFileSync(snapshot);
  const manifest: PortableManifest = {
    schemaVersion: 1,
    index: {
      path: "index.sqlite",
      sha256: sha256(indexBytes),
      byteLength: indexBytes.byteLength,
    },
    artifacts,
  };
  writeFileSync(
    resolve(destination, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    { flag: "wx" },
  );
  return manifest;
}
