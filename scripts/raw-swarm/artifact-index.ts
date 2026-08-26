import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Either, Schema } from "effect";

import { ReviewOutputSchema, VERDICT_CLASSES } from "./review-contract.ts";
import { ExecutionStartRecordSchema } from "./evidence-manifests.ts";
import { readFindingsProjection } from "./findings.ts";
import { playerInvocationNumberFromEventsArtifact } from "./player-continuation-evidence.ts";
import { preflightSdkTranscript } from "./sdk-player/sdk-audit.ts";
import { parseSdkTranscript } from "./sdk-player/sdk-transcript.ts";
import { isJsonRecord, parsePlayerTranscript, repoRoot } from "./transcript.ts";
import {
  EvidenceSetIdSchema,
  ExecutionIdSchema,
  ScenarioIdSchema,
} from "./raw-swarm-identities.ts";
import {
  canonicalRepositoryReadPath,
  canonicalRepositoryReadRelativePath,
} from "./repository-path.ts";

const INDEX_SCHEMA_VERSION = 3;

const IndexedExecutionRecordSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  executionId: ExecutionIdSchema,
  evidenceSetId: EvidenceSetIdSchema,
  scenarioId: ScenarioIdSchema,
});

type ExecutionArtifactCandidate = readonly [
  role: string,
  path: string,
  mediaType: string,
  expectedSha256: string | undefined,
];

type CurrentExecutionAuthorityPaths = {
  readonly executionManifestPath: string;
  readonly executionStartPath: string;
};

export type LegacyArtifactDisposition =
  | "artifactBacked"
  | "databaseOnly"
  | "inconsistent";

type LegacyArtifactInventoryIdentity = {
  readonly kind: "run" | "review";
  readonly legacyId: number;
  readonly indexedPath: string;
};

type LegacyIndexedArtifact =
  | { readonly tag: "missing" }
  | { readonly tag: "present"; readonly sha256: string };

type LegacyExpectedArtifact =
  | { readonly tag: "notRecorded" }
  | { readonly tag: "recorded"; readonly sha256: string };

type LegacyAmbiguousArtifact = {
  readonly path: string;
  readonly sha256: string;
};

export type LegacyArtifactInventory = LegacyArtifactInventoryIdentity &
  (
    | {
        readonly disposition: "artifactBacked";
        readonly expected: {
          readonly tag: "recorded";
          readonly sha256: string;
        };
        readonly indexed: { readonly tag: "present"; readonly sha256: string };
        readonly recoveredPath: string;
      }
    | {
        readonly disposition: "databaseOnly";
        readonly expected: LegacyExpectedArtifact;
        readonly indexed: LegacyIndexedArtifact;
      }
    | {
        readonly disposition: "inconsistent";
        readonly evidence:
          | {
              readonly tag: "recovered";
              readonly expectedSha256: string;
              readonly indexed: LegacyIndexedArtifact;
              readonly recoveredPath: string;
            }
          | {
              readonly tag: "ambiguous";
              readonly indexed: LegacyIndexedArtifact;
              readonly firstArtifact: LegacyAmbiguousArtifact;
              readonly remainingArtifacts: readonly LegacyAmbiguousArtifact[];
            };
      }
  );

export type LegacyInventorySource =
  | { readonly tag: "transcriptPath" }
  | { readonly tag: "artifactIndex"; readonly schemaVersion: 1 | 2 | 3 };

export type LegacyInventoryUnavailableSource =
  | { readonly tag: "unsupported"; readonly reason: string }
  | { readonly tag: "transcriptPath"; readonly reason: string }
  | {
      readonly tag: "artifactIndex";
      readonly schemaVersion: 1 | 2 | 3;
      readonly reason: string;
    };

export type LegacyInventoryResult =
  | {
      readonly tag: "supported";
      readonly source: LegacyInventorySource;
      readonly inventory: readonly LegacyArtifactInventory[];
    }
  | {
      readonly tag: "unavailable";
      readonly source: LegacyInventoryUnavailableSource;
      readonly inventory: readonly [];
    };

function fail(message: string): never {
  throw new Error(message);
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function requiredCurrentExecutionAuthorityPath(
  evidenceSetDirectory: string,
  path: string,
  label: string,
): string {
  const candidate = resolve(evidenceSetDirectory, path);
  const canonical = canonicalRepositoryReadPath(repoRoot, candidate);
  if (Either.isRight(canonical)) return canonical.right;
  if (canonical.left.includes("ENOENT")) {
    return fail(
      `Current SDK transcript requires its ${label}: ${relative(repoRoot, candidate)}`,
    );
  }
  return fail(
    `Current SDK transcript ${label} is not repository-owned: ${relative(repoRoot, candidate)}: ${canonical.left}`,
  );
}

function currentExecutionAuthorityPaths(
  absoluteTranscript: string,
): CurrentExecutionAuthorityPaths {
  const evidenceSetDirectory = dirname(dirname(absoluteTranscript));
  return {
    executionManifestPath: requiredCurrentExecutionAuthorityPath(
      evidenceSetDirectory,
      "execution.json",
      "Execution manifest",
    ),
    executionStartPath: requiredCurrentExecutionAuthorityPath(
      evidenceSetDirectory,
      "evidence/execution-start.json",
      "Execution start authority",
    ),
  };
}

export function repositoryArtifactPath(path: string): string {
  const canonical = canonicalRepositoryReadRelativePath(repoRoot, path);
  if (Either.isLeft(canonical)) {
    const prefix = canonical.left.includes("escapes")
      ? "Artifact escapes the repository root"
      : "Artifact is unreadable or missing";
    fail(`${prefix}: ${path}: ${canonical.left}`);
  }
  return canonical.right;
}

function jsonLines(path: string): readonly unknown[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line): unknown => JSON.parse(line));
}

function validateArtifactIndex(
  db: DatabaseSync,
  requireCurrentSchema: boolean,
): void {
  const legacySteps = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'steps'",
    )
    .get();
  if (legacySteps !== undefined) {
    fail(
      "Legacy Raw Swarm database must be inventoried and rebuilt before use.",
    );
  }

  const existingMetadata = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'indexMetadata'",
    )
    .get();
  if (existingMetadata === undefined) {
    if (requireCurrentSchema) {
      fail(
        "Raw Swarm index is not initialized; use a write command before a read-only report command.",
      );
    }
  } else {
    const version = db.prepare("SELECT schemaVersion FROM indexMetadata").get();
    if (
      !isJsonRecord(version) ||
      version.schemaVersion !== INDEX_SCHEMA_VERSION
    ) {
      fail(
        `Raw Swarm index schema is not version ${String(INDEX_SCHEMA_VERSION)}; inventory and rebuild the database before using this command.`,
      );
    }
  }
}

export function openArtifactIndex(path: string): DatabaseSync {
  const absolute = resolve(repoRoot, path);
  mkdirSync(dirname(absolute), { recursive: true });
  const db = new DatabaseSync(absolute);
  try {
    validateArtifactIndex(db, false);
  } catch (error) {
    db.close();
    throw error;
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
      evidenceKind TEXT NOT NULL CHECK(evidenceKind IN ('currentExecution', 'historicalObservation')),
      transport TEXT NOT NULL CHECK(transport IN ('sdk', 'mcp')),
      executionId TEXT UNIQUE,
      evidenceSetId TEXT UNIQUE,
      scenarioId TEXT NOT NULL,
      gitSha TEXT NOT NULL,
      startedAt TEXT NOT NULL,
      transcriptSha256 TEXT NOT NULL UNIQUE REFERENCES artifacts(sha256),
      consumerIsolation TEXT CHECK(consumerIsolation IS NULL OR consumerIsolation IN ('permissionProfile', 'instructionalFallback')),
      CHECK(
        (evidenceKind = 'currentExecution' AND transport = 'sdk' AND executionId IS NOT NULL AND evidenceSetId IS NOT NULL)
        OR
        (evidenceKind = 'historicalObservation' AND executionId IS NULL AND evidenceSetId IS NULL)
      )
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
    CREATE TRIGGER IF NOT EXISTS calls_match_observation_transport
    BEFORE INSERT ON calls
    WHEN (SELECT transport FROM runs WHERE id = NEW.runId) <> NEW.source
    BEGIN
      SELECT RAISE(ABORT, 'call source does not match observation transport');
    END;
    CREATE TRIGGER IF NOT EXISTS updated_calls_match_observation_transport
    BEFORE UPDATE OF runId, source ON calls
    WHEN (SELECT transport FROM runs WHERE id = NEW.runId) <> NEW.source
    BEGIN
      SELECT RAISE(ABORT, 'call source does not match observation transport');
    END;
    CREATE TRIGGER IF NOT EXISTS observation_transport_matches_calls
    BEFORE UPDATE OF transport ON runs
    WHEN EXISTS(
      SELECT 1 FROM calls
      WHERE calls.runId = NEW.id AND calls.source <> NEW.transport
    )
    BEGIN
      SELECT RAISE(ABORT, 'observation transport does not match call source');
    END;
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
    CREATE TABLE IF NOT EXISTS findings(
      runId INTEGER NOT NULL REFERENCES runs(id),
      findingId TEXT NOT NULL CHECK(length(findingId) = 64 AND findingId NOT GLOB '*[^0-9a-f]*'),
      stage TEXT NOT NULL,
      category TEXT NOT NULL,
      kind TEXT NOT NULL,
      summary TEXT NOT NULL,
      detail TEXT,
      pointer TEXT NOT NULL CHECK(json_valid(pointer)),
      fingerprint TEXT CHECK(fingerprint IS NULL OR (length(fingerprint) = 64 AND fingerprint NOT GLOB '*[^0-9a-f]*')),
      githubIssueNumber INTEGER CHECK(githubIssueNumber IS NULL OR githubIssueNumber > 0),
      artifactSha256 TEXT NOT NULL REFERENCES artifacts(sha256),
      PRIMARY KEY(runId, findingId)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS scenarioCampaigns(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subjectIdentity TEXT NOT NULL UNIQUE CHECK(length(subjectIdentity) = 64 AND subjectIdentity NOT GLOB '*[^0-9a-f]*'),
      campaignId TEXT NOT NULL UNIQUE,
      plannedScenarioId TEXT NOT NULL,
      evidenceSetId TEXT NOT NULL UNIQUE,
      gitSha TEXT NOT NULL,
      startedAt TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS scenarioCampaignArtifacts(
      scenarioCampaignRowId INTEGER NOT NULL REFERENCES scenarioCampaigns(id),
      role TEXT NOT NULL,
      artifactSha256 TEXT NOT NULL REFERENCES artifacts(sha256),
      PRIMARY KEY(scenarioCampaignRowId, role)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS scenarioCampaignFindings(
      scenarioCampaignRowId INTEGER NOT NULL REFERENCES scenarioCampaigns(id),
      findingId TEXT NOT NULL CHECK(length(findingId) = 64 AND findingId NOT GLOB '*[^0-9a-f]*'),
      stage TEXT NOT NULL,
      category TEXT NOT NULL,
      kind TEXT NOT NULL,
      summary TEXT NOT NULL,
      detail TEXT,
      pointer TEXT NOT NULL CHECK(json_valid(pointer)),
      fingerprint TEXT CHECK(fingerprint IS NULL OR (length(fingerprint) = 64 AND fingerprint NOT GLOB '*[^0-9a-f]*')),
      artifactSha256 TEXT NOT NULL REFERENCES artifacts(sha256),
      PRIMARY KEY(scenarioCampaignRowId, findingId)
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
    CREATE INDEX IF NOT EXISTS findings_run ON findings(runId);
    CREATE INDEX IF NOT EXISTS findings_category ON findings(category);
    CREATE INDEX IF NOT EXISTS findings_fingerprint ON findings(fingerprint);
    CREATE INDEX IF NOT EXISTS scenarioCampaignFindings_campaign ON scenarioCampaignFindings(scenarioCampaignRowId);
    CREATE INDEX IF NOT EXISTS scenarioCampaignFindings_category ON scenarioCampaignFindings(category);
    CREATE INDEX IF NOT EXISTS scenarioCampaignFindings_fingerprint ON scenarioCampaignFindings(fingerprint);
  `);
  return db;
}

export function openArtifactIndexReadOnly(path: string): DatabaseSync {
  const absolute = resolve(repoRoot, path);
  if (!existsSync(absolute)) {
    return fail(`Raw Swarm index does not exist: ${path}`);
  }
  const db = new DatabaseSync(absolute, { readOnly: true });
  try {
    validateArtifactIndex(db, true);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
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
  const relativePath = repositoryArtifactPath(path);
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

function playerInvocationEventCandidates(
  evidenceSetDirectory: string,
): readonly ExecutionArtifactCandidate[] {
  const evidenceDirectory = resolve(evidenceSetDirectory, "evidence");
  const invocationEvents = readdirSync(evidenceDirectory)
    .flatMap((name) => {
      const invocation = playerInvocationNumberFromEventsArtifact(name);
      return invocation === undefined ? [] : [{ invocation, name }];
    })
    .sort((left, right) => left.invocation - right.invocation);
  if (
    invocationEvents.some(({ invocation }, index) => invocation !== index + 1)
  ) {
    fail("Player invocation event artifacts must form a contiguous sequence.");
  }
  const conversationEventsPath = resolve(
    evidenceDirectory,
    "player-events.jsonl",
  );
  if (invocationEvents.length > 0 && existsSync(conversationEventsPath)) {
    fail("A run cannot contain both conversation and per-invocation events.");
  }
  if (invocationEvents.length === 0) {
    return existsSync(conversationEventsPath)
      ? [
          [
            "playerInvocationEvents-1",
            conversationEventsPath,
            "application/x-ndjson",
            undefined,
          ],
        ]
      : [];
  }
  return invocationEvents.map(
    ({ invocation, name }): ExecutionArtifactCandidate => [
      `playerInvocationEvents-${String(invocation)}`,
      resolve(evidenceDirectory, name),
      "application/x-ndjson",
      undefined,
    ],
  );
}

function ingestArtifactRunWithDisposition(input: {
  readonly transcriptPath: string;
  readonly dbPath: string;
  readonly indexedTranscriptPath?: string;
  readonly ingestion: "currentEvidence" | "historicalRebuild";
  readonly additionalArtifacts?: readonly {
    readonly role: string;
    readonly path: string;
    readonly mediaType: string;
  }[];
}): number {
  const canonicalTranscriptPath = canonicalRepositoryReadPath(
    repoRoot,
    input.transcriptPath,
  );
  if (Either.isLeft(canonicalTranscriptPath)) {
    fail(
      `Artifact transcript is not repository-owned: ${input.transcriptPath}: ${canonicalTranscriptPath.left}`,
    );
  }
  const absoluteTranscript = canonicalTranscriptPath.right;
  const records = jsonLines(absoluteTranscript);
  const sdk = parseSdkTranscript(records);
  const mcp =
    sdk.tag === "invalid" ? parsePlayerTranscript(records) : undefined;
  if (sdk.tag === "invalid" && (mcp === undefined || mcp.tag === "invalid")) {
    fail(sdk.message);
  }
  if (input.ingestion === "currentEvidence" && sdk.tag === "invalid") {
    fail(
      "Current evidence ingestion requires an SDK transcript with an Execution manifest; use legacy rebuild for Historical Observations.",
    );
  }
  const currentAuthorities =
    sdk.tag === "valid" && input.ingestion === "currentEvidence"
      ? currentExecutionAuthorityPaths(absoluteTranscript)
      : undefined;
  const db = openArtifactIndex(input.dbPath);
  try {
    db.exec("BEGIN");
    const artifact = (() => {
      const registered = registerArtifact(
        db,
        input.indexedTranscriptPath ?? absoluteTranscript,
        "application/x-ndjson",
      );
      const sourceBytes = readFileSync(absoluteTranscript);
      if (
        registered.sha256 !== sha256(sourceBytes) ||
        registered.byteLength !== sourceBytes.byteLength
      ) {
        fail(
          "Indexed transcript bytes do not match the parsed transcript source.",
        );
      }
      if (
        db
          .prepare("SELECT id FROM runs WHERE transcriptSha256 = ?")
          .get(registered.sha256) !== undefined
      ) {
        fail(`Transcript ${registered.sha256} is already indexed.`);
      }
      return registered;
    })();
    try {
      const identity = (() => {
        if (sdk.tag === "valid") return sdk.value.header;
        if (mcp?.tag === "valid") return mcp.value.header;
        return fail("Evidence transcript has no valid identity.");
      })();
      const isolation =
        sdk.tag === "valid" ? sdk.value.header.consumerIsolation : null;
      const executionIdentity =
        currentAuthorities !== undefined
          ? (() => {
              const decoded = Schema.decodeUnknownEither(
                IndexedExecutionRecordSchema,
                { onExcessProperty: "error" },
              )(
                JSON.parse(
                  readFileSync(
                    currentAuthorities.executionManifestPath,
                    "utf8",
                  ),
                ),
              );
              if (Either.isLeft(decoded)) {
                return fail(
                  `Invalid Execution manifest: ${decoded.left.message}`,
                );
              }
              if (decoded.right.scenarioId !== identity.scenarioId) {
                return fail(
                  "Execution manifest Scenario does not match its transcript.",
                );
              }
              const executionStart = Schema.decodeUnknownEither(
                ExecutionStartRecordSchema,
                { onExcessProperty: "error" },
              )(
                JSON.parse(
                  readFileSync(currentAuthorities.executionStartPath, "utf8"),
                ),
              );
              if (Either.isLeft(executionStart)) {
                return fail(
                  `Invalid Execution start authority: ${executionStart.left.message}`,
                );
              }
              if (
                decoded.right.executionId !==
                  executionStart.right.executionId ||
                decoded.right.evidenceSetId !==
                  executionStart.right.evidenceSetId ||
                decoded.right.scenarioId !== executionStart.right.scenarioId
              ) {
                return fail(
                  "Execution manifest does not match its Execution start authority.",
                );
              }
              if (
                decoded.right.scenarioId !== identity.scenarioId ||
                executionStart.right.scenarioId !== identity.scenarioId ||
                executionStart.right.gitSha !== identity.gitSha ||
                executionStart.right.startedAt !== identity.startedAt
              ) {
                return fail(
                  "Execution identity authority does not match its transcript.",
                );
              }
              return decoded.right;
            })()
          : undefined;
      const run = db
        .prepare(
          "INSERT INTO runs(evidenceKind, transport, executionId, evidenceSetId, scenarioId, gitSha, startedAt, transcriptSha256, consumerIsolation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          executionIdentity === undefined
            ? "historicalObservation"
            : "currentExecution",
          sdk.tag === "valid" ? "sdk" : "mcp",
          executionIdentity?.executionId ?? null,
          executionIdentity?.evidenceSetId ?? null,
          identity.scenarioId,
          identity.gitSha,
          identity.startedAt,
          artifact.sha256,
          isolation,
        );
      const runId = Number(run.lastInsertRowid);
      if (sdk.tag === "valid") {
        const header = sdk.value.header;
        const evidenceSetDirectory = dirname(dirname(absoluteTranscript));
        const executionManifestCandidate:
          | ExecutionArtifactCandidate
          | undefined =
          currentAuthorities === undefined
            ? undefined
            : [
                "executionManifest",
                currentAuthorities.executionManifestPath,
                "application/json",
                undefined,
              ];
        const candidates: readonly ExecutionArtifactCandidate[] = [
          [
            "scenario",
            resolve(evidenceSetDirectory, "SCENARIO.md"),
            "text/markdown",
            header.scenarioSha256,
          ],
          [
            "scenarioReview",
            resolve(evidenceSetDirectory, "SCENARIO_REVIEW.json"),
            "application/json",
            header.scenarioReviewSha256,
          ],
          ...(executionManifestCandidate === undefined
            ? []
            : [executionManifestCandidate]),
          [
            "replaySupervisor",
            resolve(evidenceSetDirectory, "replay-supervisor.mjs"),
            "text/javascript",
            header.replaySupervisorSha256,
          ],
          [
            "characters",
            resolve(evidenceSetDirectory, "evidence/characters.ts"),
            "text/typescript",
            header.charactersSha256,
          ],
          [
            "setup",
            resolve(evidenceSetDirectory, "evidence/setup.ts"),
            "text/typescript",
            header.characterOutcome === "ready"
              ? header.setupSha256
              : undefined,
          ],
          [
            "program",
            resolve(evidenceSetDirectory, "evidence/program.ts"),
            "text/typescript",
            undefined,
          ],
          [
            "executionStart",
            currentAuthorities?.executionStartPath ??
              resolve(evidenceSetDirectory, "evidence/execution-start.json"),
            "application/json",
            undefined,
          ],
          [
            "stagePlan",
            resolve(evidenceSetDirectory, "evidence/stage-plan.json"),
            "application/json",
            undefined,
          ],
          [
            "stagePlanFindings",
            resolve(evidenceSetDirectory, "evidence/stage-plan-findings.json"),
            "application/json",
            undefined,
          ],
          [
            "frozenPrefix",
            resolve(evidenceSetDirectory, "evidence/frozen-prefix.json"),
            "application/json",
            undefined,
          ],
          [
            "final",
            resolve(evidenceSetDirectory, "evidence/final.json"),
            "application/json",
            undefined,
          ],
          [
            "modelInvocations",
            resolve(evidenceSetDirectory, "evidence/invocations.jsonl"),
            "application/x-ndjson",
            undefined,
          ],
          ...playerInvocationEventCandidates(evidenceSetDirectory),
          [
            "continuationObservations",
            resolve(evidenceSetDirectory, "evidence/observations.jsonl"),
            "application/x-ndjson",
            undefined,
          ],
          [
            "initialObservation",
            resolve(evidenceSetDirectory, "evidence/initial-observation.json"),
            "application/json",
            undefined,
          ],
          [
            "supervisorTimings",
            resolve(evidenceSetDirectory, "evidence/supervisor-timings.jsonl"),
            "application/x-ndjson",
            undefined,
          ],
          [
            "findingsCheckpoint",
            resolve(evidenceSetDirectory, "evidence/findings-checkpoint.json"),
            "application/json",
            undefined,
          ],
          [
            "findings",
            resolve(evidenceSetDirectory, "evidence/findings.json"),
            "application/json",
            undefined,
          ],
        ];
        const insertArtifact = db.prepare(
          "INSERT INTO runArtifacts(runId, role, artifactSha256) VALUES (?, ?, ?)",
        );
        for (const [role, path, mediaType, expectedSha256] of candidates) {
          if (!existsSync(path)) {
            if (expectedSha256 !== undefined) {
              fail(`Execution artifact ${role} is missing.`);
            }
            continue;
          }
          const registered = registerArtifact(db, path, mediaType);
          if (
            expectedSha256 !== undefined &&
            registered.sha256 !== expectedSha256
          ) {
            fail(
              `Execution artifact ${role} does not match its transcript hash.`,
            );
          }
          insertArtifact.run(runId, role, registered.sha256);
        }
      }
      if (input.additionalArtifacts !== undefined) {
        const insertAdditionalArtifact = db.prepare(
          "INSERT INTO runArtifacts(runId, role, artifactSha256) VALUES (?, ?, ?)",
        );
        for (const { role, path, mediaType } of input.additionalArtifacts) {
          const registered = registerArtifact(db, path, mediaType);
          insertAdditionalArtifact.run(runId, role, registered.sha256);
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

export function ingestArtifactRun(input: {
  readonly transcriptPath: string;
  readonly dbPath: string;
  readonly indexedTranscriptPath?: string;
}): number {
  return ingestArtifactRunWithDisposition({
    ...input,
    ingestion: "currentEvidence",
  });
}

/** Ingest a transcript and its controlled review authorities atomically. */
export function ingestArtifactRunWithArtifacts(input: {
  readonly transcriptPath: string;
  readonly dbPath: string;
  readonly additionalArtifacts: readonly {
    readonly role: string;
    readonly path: string;
    readonly mediaType: string;
  }[];
}): number {
  return ingestArtifactRunWithDisposition({
    ...input,
    ingestion: "currentEvidence",
  });
}

export function ingestGenerationFindings(input: {
  readonly findingsPath: string;
  readonly dbPath: string;
}): number {
  const projection = readFindingsProjection(input.findingsPath);
  if (
    projection.subject.tag !== "scenarioCampaign" ||
    projection.subject.sdkCalls.tag !== "transcriptFree"
  ) {
    fail(
      "Scenario Campaign findings must have a campaign subject without an SDK transcript authority.",
    );
  }
  const db = openArtifactIndex(input.dbPath);
  try {
    db.exec("BEGIN");
    try {
      const findingsArtifact = registerArtifact(
        db,
        input.findingsPath,
        "application/json",
      );
      const authorityArtifacts = projection.authorities.map((authority) => {
        const artifact = registerArtifact(
          db,
          authority.path,
          "application/octet-stream",
        );
        if (
          artifact.sha256 !== authority.sha256 ||
          artifact.byteLength !== authority.byteLength
        ) {
          fail(`Finding authority changed while indexing: ${authority.path}`);
        }
        return { role: authority.role, sha256: artifact.sha256 };
      });
      if (!authorityArtifacts.some(({ role }) => role === "campaign")) {
        fail(
          "Indexed Scenario Campaign findings must retain the decoded campaign manifest authority.",
        );
      }
      const existing = db
        .prepare(
          "SELECT id, campaignId, plannedScenarioId, evidenceSetId, gitSha, startedAt FROM scenarioCampaigns WHERE subjectIdentity = ?",
        )
        .get(projection.subjectIdentity);
      if (existing !== undefined) {
        if (
          !isJsonRecord(existing) ||
          typeof existing.id !== "number" ||
          existing.campaignId !== projection.subject.campaignId ||
          existing.plannedScenarioId !== projection.subject.plannedScenarioId ||
          existing.evidenceSetId !== projection.subject.evidenceSetId ||
          existing.gitSha !== projection.subject.gitSha ||
          existing.startedAt !== projection.subject.startedAt
        ) {
          fail(
            `Scenario Campaign findings ${projection.subjectIdentity} have contradictory identity.`,
          );
        }
        const indexedArtifact = db
          .prepare(
            "SELECT artifactSha256 FROM scenarioCampaignArtifacts WHERE scenarioCampaignRowId = ? AND role = 'findings'",
          )
          .get(existing.id);
        if (
          !isJsonRecord(indexedArtifact) ||
          indexedArtifact.artifactSha256 !== findingsArtifact.sha256
        ) {
          fail(
            `Scenario Campaign row ${String(existing.id)} already has another findings artifact.`,
          );
        }
        db.exec("COMMIT");
        return existing.id;
      }
      const inserted = db
        .prepare(
          "INSERT INTO scenarioCampaigns(subjectIdentity, campaignId, plannedScenarioId, evidenceSetId, gitSha, startedAt) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .run(
          projection.subjectIdentity,
          projection.subject.campaignId,
          projection.subject.plannedScenarioId,
          projection.subject.evidenceSetId,
          projection.subject.gitSha,
          projection.subject.startedAt,
        );
      const scenarioCampaignRowId = Number(inserted.lastInsertRowid);
      const insertAuthority = db.prepare(
        "INSERT INTO scenarioCampaignArtifacts(scenarioCampaignRowId, role, artifactSha256) VALUES (?, ?, ?)",
      );
      for (const authority of authorityArtifacts) {
        insertAuthority.run(
          scenarioCampaignRowId,
          authority.role,
          authority.sha256,
        );
      }
      if (authorityArtifacts.some(({ role }) => role === "findings")) {
        fail("Generation findings authorities cannot use the findings role.");
      }
      insertAuthority.run(
        scenarioCampaignRowId,
        "findings",
        findingsArtifact.sha256,
      );
      const insertFinding = db.prepare(
        `INSERT INTO scenarioCampaignFindings(scenarioCampaignRowId, findingId, stage, category, kind, summary, detail, pointer, fingerprint, artifactSha256)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const finding of projection.findings) {
        insertFinding.run(
          scenarioCampaignRowId,
          finding.findingId,
          finding.stage,
          finding.category,
          finding.kind,
          finding.summary,
          finding.detail ?? null,
          JSON.stringify(finding.pointer),
          finding.fingerprint ?? null,
          findingsArtifact.sha256,
        );
      }
      db.exec("COMMIT");
      return scenarioCampaignRowId;
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

function indexedArtifact(sha256: string | undefined): LegacyIndexedArtifact {
  return sha256 === undefined ? { tag: "missing" } : { tag: "present", sha256 };
}

function recoveredLegacyArtifactPath(
  item: LegacyArtifactInventory,
): string | undefined {
  if (item.disposition === "artifactBacked") return item.recoveredPath;
  if (
    item.disposition === "inconsistent" &&
    item.evidence.tag === "recovered"
  ) {
    return item.evidence.recoveredPath;
  }
  return undefined;
}

function recoverBySha(
  expectedSha256: string,
  candidates: readonly string[],
): string | undefined {
  return candidates.find((candidate) => shaAt(candidate) === expectedSha256);
}

type LegacyArtifactIdentity = {
  readonly id: number;
  readonly indexedPath: string;
  readonly transcriptSha256: string;
};

type LegacyReviewVerdict = Schema.Schema.Type<
  typeof ReviewOutputSchema
>["verdicts"][number];

type LegacyReviewArtifact =
  | { readonly tag: "recorded"; readonly sha256: string }
  | { readonly tag: "notRecorded" };

type LegacyReviewIdentity = {
  readonly id: number;
  readonly indexedPath: string;
  readonly reviewer: string | null;
  readonly scenarioId: string;
  readonly gitSha: string;
  readonly transcriptSha256: string;
  readonly artifact: LegacyReviewArtifact;
  readonly verdicts:
    | {
        readonly tag: "recorded";
        readonly rows: readonly LegacyReviewVerdict[];
      }
    | { readonly tag: "notRecorded" };
  readonly expectedReviewers: ReadonlySet<string>;
};

type LegacyReviewRows = {
  readonly rows: readonly unknown[];
  readonly referenceColumn: "reviewRoundId" | "reviewId";
  readonly unavailableSource: LegacyInventoryUnavailableSource;
};

function inventoryLegacyArtifact(
  identity: LegacyArtifactIdentity,
  candidates: readonly string[],
): LegacyArtifactInventory {
  const currentSha256 = shaAt(resolve(repoRoot, identity.indexedPath));
  if (currentSha256 === identity.transcriptSha256) {
    return {
      kind: "run",
      legacyId: identity.id,
      disposition: "artifactBacked",
      indexedPath: identity.indexedPath,
      expected: { tag: "recorded", sha256: identity.transcriptSha256 },
      indexed: { tag: "present", sha256: currentSha256 },
      recoveredPath: identity.indexedPath,
    };
  }
  const recovered = recoverBySha(identity.transcriptSha256, candidates);
  return recovered === undefined
    ? {
        kind: "run",
        legacyId: identity.id,
        disposition: "databaseOnly",
        indexedPath: identity.indexedPath,
        expected: { tag: "recorded", sha256: identity.transcriptSha256 },
        indexed: indexedArtifact(currentSha256),
      }
    : {
        kind: "run",
        legacyId: identity.id,
        disposition: "inconsistent",
        indexedPath: identity.indexedPath,
        evidence: {
          tag: "recovered",
          expectedSha256: identity.transcriptSha256,
          indexed: indexedArtifact(currentSha256),
          recoveredPath: relative(repoRoot, recovered),
        },
      };
}

function inventoryLegacyReview(
  identity: LegacyReviewIdentity,
  candidates: readonly string[],
): LegacyArtifactInventory {
  const matches = (path: string): boolean => {
    try {
      if (
        identity.artifact.tag === "recorded" &&
        shaAt(path) !== identity.artifact.sha256
      ) {
        return false;
      }
      const decoded = Schema.decodeUnknownEither(ReviewOutputSchema, {
        onExcessProperty: "error",
      })(JSON.parse(readFileSync(path, "utf8")));
      if (Either.isLeft(decoded)) return false;
      const value = decoded.right;
      return (
        value.scenarioId === identity.scenarioId &&
        value.gitSha === identity.gitSha &&
        value.transcriptSha256 === identity.transcriptSha256 &&
        (identity.reviewer === null || value.reviewer === identity.reviewer) &&
        (identity.expectedReviewers.size === 0 ||
          (identity.expectedReviewers.size === 1 &&
            identity.expectedReviewers.has(value.reviewer))) &&
        (identity.verdicts.tag === "notRecorded" ||
          verdictRowsEqual(value.verdicts, identity.verdicts.rows))
      );
    } catch {
      return false;
    }
  };
  const indexed = resolve(repoRoot, identity.indexedPath);
  const matchesByContent = [indexed, ...candidates]
    .filter((candidate, index, all) => all.indexOf(candidate) === index)
    .filter((candidate) => candidate.endsWith(".json") && matches(candidate));
  const matchingDigests = new Set(
    matchesByContent.flatMap((candidate) => {
      const digest = shaAt(candidate);
      return digest === undefined ? [] : [digest];
    }),
  );
  if (matchingDigests.size > 1) {
    const currentSha256 = shaAt(indexed);
    const ambiguousArtifacts = matchesByContent.flatMap((candidate) => {
      const digest = shaAt(candidate);
      return digest === undefined
        ? []
        : [{ path: relative(repoRoot, candidate), sha256: digest }];
    });
    const [firstArtifact, ...remainingArtifacts] = ambiguousArtifacts;
    if (firstArtifact === undefined) {
      fail("Ambiguous legacy review has no matching artifact.");
    }
    return {
      kind: "review",
      legacyId: identity.id,
      disposition: "inconsistent",
      indexedPath: identity.indexedPath,
      evidence: {
        tag: "ambiguous",
        indexed: indexedArtifact(currentSha256),
        firstArtifact,
        remainingArtifacts,
      },
    };
  }
  const recovered = matchesByContent[0];
  const currentSha256 = shaAt(indexed);
  const expectedSha256 =
    identity.artifact.tag === "recorded"
      ? identity.artifact.sha256
      : recovered === undefined
        ? undefined
        : shaAt(recovered);
  if (recovered === undefined || expectedSha256 === undefined) {
    return {
      kind: "review",
      legacyId: identity.id,
      disposition: "databaseOnly",
      indexedPath: identity.indexedPath,
      expected:
        identity.artifact.tag === "recorded"
          ? identity.artifact
          : { tag: "notRecorded" },
      indexed: indexedArtifact(currentSha256),
    };
  }
  if (recovered === indexed) {
    return {
      kind: "review",
      legacyId: identity.id,
      disposition: "artifactBacked",
      indexedPath: identity.indexedPath,
      expected: { tag: "recorded", sha256: expectedSha256 },
      indexed: { tag: "present", sha256: currentSha256 ?? expectedSha256 },
      recoveredPath: relative(repoRoot, recovered),
    };
  }
  return {
    kind: "review",
    legacyId: identity.id,
    disposition: "inconsistent",
    indexedPath: identity.indexedPath,
    evidence: {
      tag: "recovered",
      expectedSha256,
      indexed: indexedArtifact(currentSha256),
      recoveredPath: relative(repoRoot, recovered),
    },
  };
}

function verdictRowsEqual(
  actual: readonly LegacyReviewVerdict[],
  expected: readonly LegacyReviewVerdict[],
): boolean {
  return (
    actual.length === expected.length &&
    actual.every((row, index) => {
      const expectedRow = expected[index];
      return (
        expectedRow !== undefined &&
        row.class === expectedRow.class &&
        row.claim === expectedRow.claim &&
        row.evidence === expectedRow.evidence
      );
    })
  );
}

function parseLegacyVerdictRows(
  rows: readonly unknown[],
): readonly LegacyReviewVerdict[] | undefined {
  const decoded: LegacyReviewVerdict[] = [];
  for (const row of rows) {
    if (!isJsonRecord(row)) return undefined;
    const className = VERDICT_CLASSES.find(
      (candidate) => candidate === row.class,
    );
    if (
      className === undefined ||
      typeof row.claim !== "string" ||
      row.claim.trim().length === 0 ||
      typeof row.evidence !== "string" ||
      row.evidence.trim().length === 0
    ) {
      return undefined;
    }
    decoded.push({
      class: className,
      claim: row.claim,
      evidence: row.evidence,
    });
  }
  return decoded;
}

function tableColumns(db: DatabaseSync, table: string): ReadonlySet<string> {
  return new Set(
    db
      .prepare(`PRAGMA table_info("${table.replaceAll('"', '""')}")`)
      .all()
      .flatMap((column) =>
        isJsonRecord(column) && typeof column.name === "string"
          ? [column.name]
          : [],
      ),
  );
}

function artifactIndexSchemaVersion(db: DatabaseSync): 1 | 2 | 3 | undefined {
  if (!tableExists(db, "indexMetadata")) return undefined;
  const row = db.prepare("SELECT schemaVersion FROM indexMetadata").get();
  if (!isJsonRecord(row)) return undefined;
  return row.schemaVersion === 1 ||
    row.schemaVersion === 2 ||
    row.schemaVersion === 3
    ? row.schemaVersion
    : undefined;
}

function detectLegacyInventorySource(
  db: DatabaseSync,
):
  | LegacyInventorySource
  | { readonly tag: "unsupported"; readonly reason: string } {
  if (!tableExists(db, "runs")) {
    return {
      tag: "unsupported",
      reason: "Legacy database has no runs authority.",
    };
  }
  const runs = tableColumns(db, "runs");
  if (runs.has("transcriptPath") && runs.has("transcriptSha256")) {
    return { tag: "transcriptPath" };
  }
  const schemaVersion = artifactIndexSchemaVersion(db);
  if (
    runs.has("transcriptSha256") &&
    schemaVersion !== undefined &&
    tableExists(db, "artifacts")
  ) {
    return { tag: "artifactIndex", schemaVersion };
  }
  return {
    tag: "unsupported",
    reason:
      "Legacy database has no supported transcriptPath or hash-linked artifact authority.",
  };
}

function unavailableInventory(
  source: LegacyInventoryUnavailableSource,
): LegacyInventoryResult {
  return { tag: "unavailable", source, inventory: [] };
}

export function inventoryLegacyDatabase(input: {
  readonly legacyDbPath: string;
  readonly artifactSearchRoot?: string;
}): LegacyInventoryResult {
  const db = new DatabaseSync(resolve(repoRoot, input.legacyDbPath), {
    readOnly: true,
  });
  try {
    const detectedSource = detectLegacyInventorySource(db);
    if (detectedSource.tag === "unsupported") {
      return unavailableInventory(detectedSource);
    }
    const searchRoot = resolve(
      repoRoot,
      input.artifactSearchRoot ?? "scripts/raw-swarm/out",
    );
    const candidates = filesBelow(searchRoot);
    const runRows =
      detectedSource.tag === "transcriptPath"
        ? db
            .prepare(
              "SELECT id, transcriptPath, transcriptSha256 FROM runs ORDER BY id",
            )
            .all()
        : db
            .prepare(
              `SELECT runs.id, artifacts.path AS transcriptPath, runs.transcriptSha256
               FROM runs LEFT JOIN artifacts ON artifacts.sha256 = runs.transcriptSha256
               ORDER BY runs.id`,
            )
            .all();
    const runs: LegacyArtifactIdentity[] = [];
    for (const row of runRows) {
      if (
        !isJsonRecord(row) ||
        typeof row.id !== "number" ||
        typeof row.transcriptPath !== "string" ||
        typeof row.transcriptSha256 !== "string"
      ) {
        return detectedSource.tag === "artifactIndex"
          ? unavailableInventory({
              tag: "artifactIndex",
              schemaVersion: detectedSource.schemaVersion,
              reason:
                "Legacy database execution row has no readable transcript authority.",
            })
          : unavailableInventory({
              tag: "transcriptPath",
              reason:
                "Legacy database execution row has no readable transcript authority.",
            });
      }
      runs.push({
        id: row.id,
        indexedPath: row.transcriptPath,
        transcriptSha256: row.transcriptSha256,
      });
    }
    const inventory: LegacyArtifactInventory[] = runs.map((identity) =>
      inventoryLegacyArtifact(identity, candidates),
    );
    const hasVerdicts =
      db
        .prepare(
          "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'verdicts'",
        )
        .get() !== undefined;
    const reviewRows: LegacyReviewRows | undefined =
      detectedSource.tag === "transcriptPath" && tableExists(db, "reviewRounds")
        ? (() => {
            const reviewRoundHasReviewer = tableColumns(db, "reviewRounds").has(
              "reviewer",
            );
            return {
              rows: db
                .prepare(
                  `SELECT rr.id, rr.artifactPath, ${reviewRoundHasReviewer ? "rr.reviewer" : "NULL"} AS reviewer, NULL AS artifactSha256, r.scenarioId, r.gitSha, r.transcriptSha256
                   FROM reviewRounds rr JOIN runs r ON r.id = rr.runId ORDER BY rr.id`,
                )
                .all(),
              referenceColumn: "reviewRoundId" as const,
              unavailableSource: {
                tag: "transcriptPath" as const,
                reason:
                  "Legacy review identity has no readable artifact authority.",
              },
            };
          })()
        : detectedSource.tag === "artifactIndex" && tableExists(db, "reviews")
          ? {
              rows: db
                .prepare(
                  `SELECT reviews.id, artifacts.path AS artifactPath, reviews.reviewer AS reviewer,
                          reviews.artifactSha256 AS artifactSha256,
                          runs.scenarioId, runs.gitSha, runs.transcriptSha256
                   FROM reviews
                   JOIN runs ON runs.id = reviews.runId
                   LEFT JOIN artifacts ON artifacts.sha256 = reviews.artifactSha256
                   ORDER BY reviews.id`,
                )
                .all(),
              referenceColumn: "reviewId" as const,
              unavailableSource: {
                tag: "artifactIndex" as const,
                schemaVersion: detectedSource.schemaVersion,
                reason:
                  "Artifact-index review has no readable artifact authority.",
              },
            }
          : undefined;
    if (reviewRows !== undefined) {
      for (const row of reviewRows.rows) {
        if (
          !isJsonRecord(row) ||
          typeof row.id !== "number" ||
          typeof row.artifactPath !== "string" ||
          (row.reviewer !== null && typeof row.reviewer !== "string") ||
          (row.artifactSha256 !== null &&
            typeof row.artifactSha256 !== "string") ||
          typeof row.scenarioId !== "string" ||
          typeof row.gitSha !== "string" ||
          typeof row.transcriptSha256 !== "string" ||
          (detectedSource.tag === "artifactIndex" &&
            typeof row.artifactSha256 !== "string")
        ) {
          return unavailableInventory(reviewRows.unavailableSource);
        }
        const expectedVerdicts = hasVerdicts
          ? parseLegacyVerdictRows(
              db
                .prepare(
                  `SELECT class, claim, evidence FROM verdicts WHERE ${reviewRows.referenceColumn} = ? ORDER BY id`,
                )
                .all(row.id),
            )
          : [];
        if (expectedVerdicts === undefined) {
          return unavailableInventory(reviewRows.unavailableSource);
        }
        const expectedReviewers = hasVerdicts
          ? new Set(
              db
                .prepare(
                  `SELECT DISTINCT reviewer FROM verdicts WHERE ${reviewRows.referenceColumn} = ?`,
                )
                .all(row.id)
                .flatMap((value) =>
                  isJsonRecord(value) && typeof value.reviewer === "string"
                    ? [value.reviewer]
                    : [],
                ),
            )
          : new Set<string>();
        inventory.push(
          inventoryLegacyReview(
            {
              id: row.id,
              indexedPath: row.artifactPath,
              reviewer: row.reviewer,
              scenarioId: row.scenarioId,
              gitSha: row.gitSha,
              transcriptSha256: row.transcriptSha256,
              artifact:
                row.artifactSha256 === null
                  ? { tag: "notRecorded" }
                  : { tag: "recorded", sha256: row.artifactSha256 },
              verdicts: hasVerdicts
                ? { tag: "recorded", rows: expectedVerdicts }
                : { tag: "notRecorded" },
              expectedReviewers,
            },
            candidates,
          ),
        );
      }
    }
    return {
      tag: "supported",
      source: detectedSource,
      inventory,
    };
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

function tableExists(db: DatabaseSync, table: string): boolean {
  return (
    db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(table) !== undefined
  );
}

function registerLegacyEvidence(input: {
  readonly db: DatabaseSync;
  readonly legacyDb: DatabaseSync;
  readonly item: LegacyArtifactInventory;
  readonly artifactDirectory: string;
  readonly hasVerdicts: boolean;
}): string {
  const { db, legacyDb, item, artifactDirectory, hasVerdicts } = input;
  const recoveredPath = recoveredLegacyArtifactPath(item);
  if (recoveredPath !== undefined) {
    const retained = contentAddressedCopy({
      sourcePath: recoveredPath,
      artifactDirectory,
      extension: item.kind === "run" ? "jsonl" : "json",
    });
    return registerArtifact(
      db,
      retained,
      item.kind === "run" ? "application/x-ndjson" : "application/json",
    ).sha256;
  }
  const rows =
    item.kind === "run"
      ? legacyDb
          .prepare("SELECT * FROM steps WHERE runId = ? ORDER BY seq")
          .all(item.legacyId)
      : hasVerdicts
        ? legacyDb
            .prepare(
              "SELECT * FROM verdicts WHERE reviewRoundId = ? ORDER BY id",
            )
            .all(item.legacyId)
        : [];
  const exportPath = resolve(
    repoRoot,
    artifactDirectory,
    "legacy-database-only",
    `${item.kind}-${item.legacyId}.json`,
  );
  mkdirSync(dirname(exportPath), { recursive: true });
  writeFileSync(
    exportPath,
    `${JSON.stringify({ inventory: item, rows }, null, 2)}\n`,
    { flag: "wx" },
  );
  return registerArtifact(db, exportPath, "application/json").sha256;
}

export function rebuildLegacyArtifactIndex(input: {
  readonly legacyDbPath: string;
  readonly dbPath: string;
  readonly artifactDirectory: string;
}): { readonly inventory: readonly LegacyArtifactInventory[] } {
  if (existsSync(resolve(repoRoot, input.dbPath)))
    fail("Refusing to overwrite rebuilt index.");
  const inventoryResult = inventoryLegacyDatabase({
    legacyDbPath: input.legacyDbPath,
  });
  if (inventoryResult.tag === "unavailable") {
    fail(`Legacy inventory is unavailable: ${inventoryResult.source.reason}`);
  }
  if (inventoryResult.source.tag === "artifactIndex") {
    fail(
      "Hash-linked artifact indexes are already compact evidence stores; rebuild-index only accepts transcriptPath legacy databases.",
    );
  }
  const inventory = inventoryResult.inventory;
  const oldDb = new DatabaseSync(resolve(repoRoot, input.legacyDbPath), {
    readOnly: true,
  });
  const hasVerdicts = tableExists(oldDb, "verdicts");
  const runIdMap = new Map<number, number>();
  const reviewIdMap = new Map<number, number>();
  try {
    for (const item of inventory.filter((entry) => entry.kind === "run")) {
      const recoveredPath = recoveredLegacyArtifactPath(item);
      if (recoveredPath === undefined) continue;
      const retained = contentAddressedCopy({
        sourcePath: recoveredPath,
        artifactDirectory: input.artifactDirectory,
        extension: "jsonl",
      });
      runIdMap.set(
        item.legacyId,
        ingestArtifactRunWithDisposition({
          transcriptPath: recoveredPath,
          indexedTranscriptPath: retained,
          dbPath: input.dbPath,
          ingestion: "historicalRebuild",
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
        const evidenceSha256 = registerLegacyEvidence({
          db: newDb,
          legacyDb: oldDb,
          item,
          artifactDirectory: input.artifactDirectory,
          hasVerdicts,
        });
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
          (row.reviewer !== undefined &&
            row.reviewer !== null &&
            typeof row.reviewer !== "string") ||
          (row.createdAt !== undefined &&
            row.createdAt !== null &&
            typeof row.createdAt !== "string")
        ) {
          fail("Legacy review row is invalid.");
        }
        const runId = runIdMap.get(row.runId);
        if (runId === undefined) continue;
        const artifact = inventory.find(
          (item) => item.kind === "review" && item.legacyId === row.id,
        );
        if (artifact === undefined) continue;
        const recoveredPath = recoveredLegacyArtifactPath(artifact);
        if (recoveredPath === undefined) continue;
        const decodedReview = Schema.decodeUnknownEither(ReviewOutputSchema, {
          onExcessProperty: "error",
        })(JSON.parse(readFileSync(resolve(repoRoot, recoveredPath), "utf8")));
        if (Either.isLeft(decodedReview)) {
          fail(
            `Recovered legacy review ${String(row.id)} is invalid: ${decodedReview.left.message}`,
          );
        }
        const retained = contentAddressedCopy({
          sourcePath: recoveredPath,
          artifactDirectory: input.artifactDirectory,
          extension: "json",
        });
        const registered = registerArtifact(
          newDb,
          retained,
          "application/json",
        );
        const subjectIdentity = newDb
          .prepare("SELECT startedAt FROM runs WHERE id = ?")
          .get(runId);
        const createdAt =
          typeof row.createdAt === "string"
            ? row.createdAt
            : isJsonRecord(subjectIdentity) &&
                typeof subjectIdentity.startedAt === "string"
              ? subjectIdentity.startedAt
              : `legacy-review-${String(row.id)}`;
        const inserted = newDb
          .prepare(
            "INSERT INTO reviews(runId, reviewer, artifactSha256, auditSha256, invocationLedgerSha256, createdAt) VALUES (?, ?, ?, NULL, NULL, ?)",
          )
          .run(
            runId,
            typeof row.reviewer === "string"
              ? row.reviewer
              : decodedReview.right.reviewer,
            registered.sha256,
            createdAt,
          );
        reviewIdMap.set(row.id, Number(inserted.lastInsertRowid));
      }
      let retainedVerdicts = 0;
      let databaseOnlyVerdicts = 0;
      const legacyVerdictRows = hasVerdicts
        ? oldDb.prepare("SELECT * FROM verdicts ORDER BY id").all()
        : [];
      for (const row of legacyVerdictRows) {
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
        const reviewId =
          typeof row.reviewRoundId === "number"
            ? (reviewIdMap.get(row.reviewRoundId) ?? null)
            : null;
        if (typeof row.reviewRoundId === "number" && reviewId === null) {
          databaseOnlyVerdicts += 1;
          continue;
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
        (item) =>
          item.kind === "run" &&
          recoveredLegacyArtifactPath(item) === undefined,
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
        (item) =>
          item.kind === "review" &&
          recoveredLegacyArtifactPath(item) === undefined,
      ).length;
      if (
        reviewIdMap.size + databaseOnlyReviews !==
        tableCount(oldDb, "reviewRounds")
      )
        fail("Legacy review disposition count mismatch.");
      if (hasVerdicts) {
        if (tableCount(newDb, "verdicts") !== retainedVerdicts)
          fail("Recoverable legacy verdict count mismatch.");
        if (
          retainedVerdicts + databaseOnlyVerdicts !==
          tableCount(oldDb, "verdicts")
        )
          fail("Legacy verdict disposition count mismatch.");
      } else if (retainedVerdicts !== 0 || databaseOnlyVerdicts !== 0) {
        fail("Legacy verdict rows appeared without a verdicts table.");
      }
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
  const source = openArtifactIndexReadOnly(input.dbPath);
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
         UNION SELECT artifactSha256 FROM scenarioCampaignArtifacts
         UNION SELECT artifactSha256 FROM scenarioCampaignFindings
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
    const containedPath = repositoryArtifactPath(row.path);
    const sourcePath = resolve(repoRoot, containedPath);
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
