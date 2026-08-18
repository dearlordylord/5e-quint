import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, test } from "vitest";

import {
  exportArtifactIndex,
  ingestArtifactRun,
  inventoryLegacyDatabase,
  rebuildLegacyArtifactIndex,
  registerIndexArtifact,
} from "./artifact-index.ts";
import { rawSwarmTestOutputDirectory } from "./test-output.ts";
import {
  extractSdkTranscriptSequences,
  preflightSdkTranscript,
  readSdkAudit,
  writeSdkAudit,
} from "./sdk-player/sdk-audit.ts";
import { repoRoot, sha256Canonical, sha256Text } from "./transcript.ts";

const temporaryDirectories: string[] = [];

function temporaryDirectory(): string {
  const directory = rawSwarmTestOutputDirectory("index-test-");
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function sdkTranscript(directory: string): string {
  const run = resolve(directory, "run");
  const path = resolve(run, "evidence/sdk-calls.jsonl");
  mkdirSync(dirname(path), { recursive: true });
  const supervisor = "export {};\n";
  const scenario = "# Artifact index scenario\n";
  const scenarioReview = "{}\n";
  const characters = "export {};\n";
  const setup = "export {};\n";
  writeFileSync(resolve(run, "replay-supervisor.mjs"), supervisor);
  writeFileSync(resolve(run, "SCENARIO.md"), scenario);
  writeFileSync(resolve(run, "SCENARIO_REVIEW.json"), scenarioReview);
  writeFileSync(resolve(run, "evidence/characters.ts"), characters);
  writeFileSync(resolve(run, "evidence/setup.ts"), setup);
  writeFileSync(
    resolve(run, "evidence/player-invocation-0001.events.jsonl"),
    '{"type":"first"}\n',
  );
  writeFileSync(
    resolve(run, "evidence/player-invocation-0002.events.jsonl"),
    '{"type":"second"}\n',
  );
  const initialSession = { battle: { round: 1 } };
  const outputSession = { battle: { round: 2 } };
  const result = { tag: "resolved", session: outputSession };
  const header = {
    type: "sdk-player-header",
    scenarioId: "artifact-index",
    gitSha: "a".repeat(40),
    startedAt: "2026-08-14T00:00:00.000Z",
    consumerIsolation: "instructionalFallback",
    replaySupervisorSha256: sha256Text(supervisor),
    scenarioSha256: sha256Text(scenario),
    scenarioReviewSha256: sha256Text(scenarioReview),
    charactersSha256: sha256Text(characters),
    characterObservation: {},
    characterOutcome: "ready",
    characterSheets: [],
    characterSheetsSha256: sha256Canonical([]),
    setupSha256: sha256Text(setup),
    setupObservation: {},
    setupOutcome: "ready",
    initialSession,
    initialSessionSha256: sha256Canonical(initialSession),
  };
  const call = {
    type: "sdk-call",
    seq: 1,
    continuation: 1,
    operation: "endBattleRuntimeTurn",
    inputSession: initialSession,
    inputSessionSha256: sha256Canonical(initialSession),
    input: { actorId: "fighter" },
    outcome: "returned",
    outputSession,
    outputSessionSha256: sha256Canonical(outputSession),
    result,
    resultSha256: sha256Canonical(result),
  };
  writeFileSync(path, `${JSON.stringify(header)}\n${JSON.stringify(call)}\n`);
  return path;
}

describe("Raw Swarm artifact index", () => {
  test("indexes call metadata without duplicating sessions or results and exports every artifact", () => {
    const directory = temporaryDirectory();
    const transcript = sdkTranscript(directory);
    const dbPath = resolve(directory, "index.sqlite");

    expect(
      ingestArtifactRun({
        transcriptPath: relative(repoRoot, transcript),
        dbPath: relative(repoRoot, dbPath),
      }),
    ).toBe(1);

    const db = new DatabaseSync(dbPath, { readOnly: true });
    const columns = db.prepare("PRAGMA table_info(calls)").all();
    expect(columns).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "args" }),
        expect.objectContaining({ name: "response" }),
      ]),
    );
    expect(db.prepare("SELECT operation, outcome FROM calls").get()).toEqual({
      operation: "endBattleRuntimeTurn",
      outcome: "returned",
    });
    expect(
      db
        .prepare(
          "SELECT role FROM runArtifacts WHERE role LIKE 'playerInvocationEvents-%' ORDER BY role",
        )
        .all(),
    ).toEqual([
      { role: "playerInvocationEvents-1" },
      { role: "playerInvocationEvents-2" },
    ]);
    db.close();
    const constrained = new DatabaseSync(dbPath);
    expect(() =>
      constrained
        .prepare(
          `INSERT INTO calls(runId, seq, source, continuation, operation, outcome, inputSessionSha256, outputSessionSha256, resultSha256, reviewFacts)
           VALUES (1, 2, 'sdk', 0, 'invalid', 'returned', ?, ?, ?, '{}')`,
        )
        .run("a".repeat(64), "b".repeat(64), "c".repeat(64)),
    ).toThrow();
    expect(() =>
      constrained
        .prepare(
          `INSERT INTO calls(runId, seq, source, continuation, operation, outcome, inputSessionSha256, reviewFacts)
           VALUES (1, 2, 'sdk', 2, 'invalid', 'returned', ?, '{}')`,
        )
        .run("a".repeat(64)),
    ).toThrow();
    expect(() =>
      constrained
        .prepare(
          `INSERT INTO calls(runId, seq, source, operation, outcome)
           VALUES (1, 2, 'mcp', 'invalid', 'returned')`,
        )
        .run(),
    ).toThrow();
    expect(() =>
      constrained
        .prepare(
          `INSERT INTO calls(runId, seq, source, continuation, operation, outcome, inputSessionSha256, rejection, reviewFacts)
           VALUES (1, 2, 'sdk', 2, 'discoverBattleActs', 'threw', ?, 'invented', '{}')`,
        )
        .run("a".repeat(64)),
    ).toThrow();
    expect(() =>
      constrained
        .prepare(
          `INSERT INTO calls(runId, seq, source, continuation, operation, outcome, inputSessionSha256, outputSessionSha256, resultSha256, reviewFacts)
           VALUES (1, 2, 'sdk', 2, 'inventedOperation', 'returned', ?, ?, ?, '{}')`,
        )
        .run("a".repeat(64), "b".repeat(64), "c".repeat(64)),
    ).toThrow();
    expect(() =>
      constrained
        .prepare(
          `INSERT INTO calls(runId, seq, source, continuation, operation, outcome, inputSessionSha256, outputSessionSha256, resultSha256, reviewFacts)
           VALUES (1, 2, 'sdk', 2, 'discoverBattleActs', 'returned', ?, ?, ?, '{}')`,
        )
        .run("g".repeat(64), "b".repeat(64), "c".repeat(64)),
    ).toThrow();
    constrained.close();

    const preflight = preflightSdkTranscript({
      transcriptPath: relative(repoRoot, transcript),
    });
    expect(preflight.tag).toBe("valid");
    if (preflight.tag !== "valid") return;
    const extraction = extractSdkTranscriptSequences({
      audit: preflight.audit,
      sequences: [1],
    });
    expect(extraction.tag).toBe("valid");
    if (extraction.tag !== "valid") return;
    const recordsPath = resolve(directory, "records.jsonl");
    const provenancePath = resolve(directory, "provenance.json");
    const reviewPath = resolve(directory, "review.json");
    const auditPath = resolve(directory, "audit.jsonl");
    writeFileSync(recordsPath, extraction.encodedRecords);
    writeFileSync(provenancePath, `${JSON.stringify(extraction.provenance)}\n`);
    writeFileSync(reviewPath, '{"review":true}\n');
    writeSdkAudit(auditPath, preflight.audit);
    const writable = new DatabaseSync(dbPath);
    const reviewArtifact = registerIndexArtifact({
      db: writable,
      path: reviewPath,
      mediaType: "application/json",
    });
    const auditArtifact = registerIndexArtifact({
      db: writable,
      path: auditPath,
      mediaType: "application/x-ndjson",
    });
    writable
      .prepare(
        "INSERT INTO reviews(runId, reviewer, artifactSha256, auditSha256, createdAt) VALUES (1, 'reviewer', ?, ?, 'now')",
      )
      .run(reviewArtifact.sha256, auditArtifact.sha256);
    writable.close();
    // The extractor produced this schema-validated JSON record immediately above;
    // the cast exposes it only so this negative test can alter one field.
    const tamperedRecord = {
      ...(JSON.parse(extraction.encodedRecords.trim()) as Record<
        string,
        unknown
      >),
      operation: "discoverBattleActs",
    };
    const tamperedLine = JSON.stringify(tamperedRecord);
    const tamperedRecordsPath = resolve(directory, "tampered-records.jsonl");
    const tamperedProvenancePath = resolve(
      directory,
      "tampered-provenance.json",
    );
    writeFileSync(tamperedRecordsPath, `${tamperedLine}\n`);
    writeFileSync(
      tamperedProvenancePath,
      `${JSON.stringify({
        ...extraction.provenance,
        extractedRecordsByteLength: Buffer.byteLength(`${tamperedLine}\n`),
        extractedRecordsSha256: sha256Text(`${tamperedLine}\n`),
        records: [
          {
            ...extraction.provenance.records[0],
            operation: "discoverBattleActs",
            extractedByteLength: Buffer.byteLength(tamperedLine),
            extractedSha256: sha256Text(tamperedLine),
          },
        ],
      })}\n`,
    );
    expect(() =>
      execFileSync(
        "mise",
        [
          "exec",
          "--",
          "node",
          "--experimental-strip-types",
          resolve(repoRoot, "scripts/raw-swarm/report.ts"),
          "drilldown",
          relative(repoRoot, tamperedRecordsPath),
          relative(repoRoot, tamperedProvenancePath),
          "--review",
          "1",
          "--db",
          relative(repoRoot, dbPath),
        ],
        { cwd: repoRoot, stdio: "pipe" },
      ),
    ).toThrow();
    execFileSync(
      "mise",
      [
        "exec",
        "--",
        "node",
        "--experimental-strip-types",
        resolve(repoRoot, "scripts/raw-swarm/report.ts"),
        "drilldown",
        relative(repoRoot, recordsPath),
        relative(repoRoot, provenancePath),
        "--review",
        "1",
        "--db",
        relative(repoRoot, dbPath),
      ],
      { cwd: repoRoot },
    );
    const drilled = new DatabaseSync(dbPath, { readOnly: true });
    expect(drilled.prepare("SELECT seq FROM reviewDrilldowns").get()).toEqual({
      seq: 1,
    });
    drilled.close();

    const destination = resolve(directory, "portable");
    const manifest = exportArtifactIndex({
      dbPath: relative(repoRoot, dbPath),
      destination,
    });
    expect(manifest.artifacts).toHaveLength(10);
    expect(
      readFileSync(resolve(destination, "manifest.json"), "utf8"),
    ).toContain(manifest.artifacts[0]?.sha256);
    const portable = new DatabaseSync(resolve(destination, "index.sqlite"), {
      readOnly: true,
    });
    for (const row of portable
      .prepare("SELECT path, sha256 FROM artifacts")
      .all()) {
      expect(row).toEqual(
        expect.objectContaining({
          path: expect.stringMatching(/^artifacts\//),
        }),
      );
      // The SELECT list fixes both non-null SQLite column names and types.
      const portablePath = (row as { path: string; sha256: string }).path;
      const portableSha = (row as { path: string; sha256: string }).sha256;
      expect(
        sha256Text(readFileSync(resolve(destination, portablePath), "utf8")),
      ).toBe(portableSha);
    }
    // The joins require all three artifact paths; `.get()` must return this row
    // because the fixture inserted the linked run and review immediately above.
    const portableAudit = portable
      .prepare(
        `SELECT audit.path AS auditPath, transcript.path AS transcriptPath, replay.path AS replayPath
         FROM reviews
         JOIN artifacts audit ON audit.sha256 = reviews.auditSha256
         JOIN runs ON runs.id = reviews.runId
         JOIN artifacts transcript ON transcript.sha256 = runs.transcriptSha256
         JOIN runArtifacts ON runArtifacts.runId = runs.id AND runArtifacts.role = 'replaySupervisor'
         JOIN artifacts replay ON replay.sha256 = runArtifacts.artifactSha256`,
      )
      .get() as {
      readonly auditPath: string;
      readonly transcriptPath: string;
      readonly replayPath: string;
    };
    expect(
      readSdkAudit(resolve(destination, portableAudit.auditPath), {
        transcriptPath: resolve(destination, portableAudit.transcriptPath),
        replaySupervisorPath: resolve(destination, portableAudit.replayPath),
      }).tag,
    ).toBe("valid");
    const portableAuditResult = readSdkAudit(
      resolve(destination, portableAudit.auditPath),
      {
        transcriptPath: resolve(destination, portableAudit.transcriptPath),
        replaySupervisorPath: resolve(destination, portableAudit.replayPath),
      },
    );
    expect(portableAuditResult.tag).toBe("valid");
    if (portableAuditResult.tag === "valid") {
      const extraction = extractSdkTranscriptSequences({
        audit: portableAuditResult.audit,
        sequences: [1],
        transcriptArtifactPath: resolve(
          destination,
          portableAudit.transcriptPath,
        ),
        replaySupervisorArtifactPath: resolve(
          destination,
          portableAudit.replayPath,
        ),
      });
      expect(extraction.tag).toBe("valid");
      if (extraction.tag === "valid") {
        expect(extraction.provenance.transcriptPath).toBe(
          resolve(destination, portableAudit.transcriptPath),
        );
      }
    }
    portable.close();
    const originalTranscript = readFileSync(transcript, "utf8");
    writeFileSync(transcript, `${originalTranscript}changed\n`);
    expect(() =>
      exportArtifactIndex({
        dbPath: relative(repoRoot, dbPath),
        destination: resolve(directory, "changed-export"),
      }),
    ).toThrow("Artifact changed before export");
    writeFileSync(transcript, originalTranscript);
    const escaping = new DatabaseSync(dbPath);
    escaping
      .prepare("UPDATE artifacts SET path = '/etc/hosts' WHERE sha256 = ?")
      .run(sha256Text(originalTranscript));
    escaping.close();
    expect(() =>
      exportArtifactIndex({
        dbPath: relative(repoRoot, dbPath),
        destination: resolve(directory, "escaping-export"),
      }),
    ).toThrow("Artifact escapes the repository root");
    const missing = new DatabaseSync(dbPath);
    missing
      .prepare("UPDATE artifacts SET path = ? WHERE sha256 = ?")
      .run(
        "scripts/raw-swarm/out/does-not-exist-artifact",
        sha256Text(originalTranscript),
      );
    missing.close();
    expect(() =>
      exportArtifactIndex({
        dbPath: relative(repoRoot, dbPath),
        destination: resolve(directory, "missing-export"),
      }),
    ).toThrow("Artifact is unreadable or missing");
  });

  test("rejects an indexed transcript whose bytes differ from the parsed source", () => {
    const directory = temporaryDirectory();
    const transcript = sdkTranscript(directory);
    const different = resolve(directory, "different.jsonl");
    writeFileSync(different, `${readFileSync(transcript, "utf8")}changed\n`);
    expect(() =>
      ingestArtifactRun({
        transcriptPath: relative(repoRoot, transcript),
        indexedTranscriptPath: relative(repoRoot, different),
        dbPath: relative(repoRoot, resolve(directory, "index.sqlite")),
      }),
    ).toThrow("do not match the parsed transcript source");
  });

  test("classifies overwritten legacy paths and locates the exact immutable artifact", () => {
    const directory = temporaryDirectory();
    const legacyDbPath = resolve(directory, "legacy.sqlite");
    const indexedPath = resolve(directory, "shared.jsonl");
    const recoveredPath = resolve(directory, "run-1/evidence/sdk-calls.jsonl");
    mkdirSync(dirname(recoveredPath), { recursive: true });
    writeFileSync(indexedPath, "changed\n");
    writeFileSync(recoveredPath, "original\n");
    const originalHash = sha256Text("original\n");
    const wrongReviewerPath = resolve(directory, "wrong-reviewer.json");
    writeFileSync(
      wrongReviewerPath,
      JSON.stringify({
        scenarioId: "legacy-scenario",
        gitSha: "a".repeat(40),
        transcriptSha256: originalHash,
        reviewer: "other-reviewer",
        verdicts: [],
      }),
    );
    const db = new DatabaseSync(legacyDbPath);
    db.exec(`
      CREATE TABLE runs(id INTEGER PRIMARY KEY, scenarioId TEXT, gitSha TEXT, transcriptPath TEXT, transcriptSha256 TEXT);
      CREATE TABLE reviewRounds(id INTEGER PRIMARY KEY, runId INTEGER, artifactPath TEXT, reviewer TEXT);
    `);
    db.prepare("INSERT INTO runs VALUES (1, 'legacy-scenario', ?, ?, ?)").run(
      "a".repeat(40),
      relative(repoRoot, indexedPath),
      originalHash,
    );
    db.prepare("INSERT INTO reviewRounds VALUES (1, 1, ?, 'reviewer')").run(
      relative(repoRoot, wrongReviewerPath),
    );
    db.close();

    expect(
      inventoryLegacyDatabase({
        legacyDbPath: relative(repoRoot, legacyDbPath),
        artifactSearchRoot: relative(repoRoot, directory),
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "run",
          legacyId: 1,
          disposition: "inconsistent",
          evidence: expect.objectContaining({
            tag: "recovered",
            expectedSha256: originalHash,
            recoveredPath: relative(repoRoot, recoveredPath),
          }),
        }),
        expect.objectContaining({
          kind: "review",
          legacyId: 1,
          disposition: "databaseOnly",
        }),
      ]),
    );
  });

  test("rebuilds legacy rows into hash-linked artifacts with matching counts", () => {
    const directory = temporaryDirectory();
    const transcript = sdkTranscript(directory);
    const transcriptSha256 = sha256Text(readFileSync(transcript, "utf8"));
    const reviewPath = resolve(directory, "legacy-review.json");
    writeFileSync(
      reviewPath,
      JSON.stringify({
        scenarioId: "artifact-index",
        gitSha: "a".repeat(40),
        transcriptSha256,
        reviewer: "reviewer",
        verdicts: [{ class: "pass", claim: "claim", evidence: "evidence" }],
      }),
    );
    const legacyPath = resolve(directory, "legacy.sqlite");
    const legacy = new DatabaseSync(legacyPath);
    legacy.exec(`
      CREATE TABLE runs(id INTEGER PRIMARY KEY, scenarioId TEXT, gitSha TEXT, startedAt TEXT, transcriptPath TEXT, transcriptSha256 TEXT);
      CREATE TABLE steps(runId INTEGER, seq INTEGER);
      CREATE TABLE reviewRounds(id INTEGER PRIMARY KEY, runId INTEGER, artifactPath TEXT, reviewer TEXT, createdAt TEXT);
      CREATE TABLE verdicts(id INTEGER PRIMARY KEY, runId INTEGER, class TEXT, claim TEXT, evidence TEXT, reviewer TEXT, createdAt TEXT, reviewRoundId INTEGER, issueFingerprint TEXT);
      CREATE TABLE issues(fingerprint TEXT PRIMARY KEY, class TEXT, claim TEXT, firstSeenAt TEXT, lastSeenAt TEXT, githubIssueNumber INTEGER);
      CREATE TABLE legacyRegistry(name TEXT PRIMARY KEY, value TEXT);
    `);
    legacy
      .prepare(
        "INSERT INTO runs VALUES (1, 'artifact-index', ?, 'started', ?, ?)",
      )
      .run("a".repeat(40), relative(repoRoot, transcript), transcriptSha256);
    legacy
      .prepare(
        "INSERT INTO runs VALUES (2, 'database-only', ?, 'started', ?, ?)",
      )
      .run(
        "b".repeat(40),
        relative(repoRoot, resolve(directory, "missing.jsonl")),
        "c".repeat(64),
      );
    legacy.prepare("INSERT INTO steps VALUES (1, 1)").run();
    legacy.prepare("INSERT INTO steps VALUES (2, 1)").run();
    legacy
      .prepare(
        "INSERT INTO reviewRounds VALUES (1, 1, ?, 'reviewer', 'created')",
      )
      .run(relative(repoRoot, reviewPath));
    legacy
      .prepare(
        "INSERT INTO reviewRounds VALUES (2, 2, ?, 'reviewer', 'created')",
      )
      .run(relative(repoRoot, resolve(directory, "missing-review.json")));
    legacy
      .prepare(
        "INSERT INTO verdicts VALUES (1, 1, 'pass', 'claim', 'evidence', 'reviewer', 'created', 1, NULL)",
      )
      .run();
    legacy
      .prepare(
        "INSERT INTO verdicts VALUES (2, 2, 'bug', 'database claim', 'database evidence', 'reviewer', 'created', 2, NULL)",
      )
      .run();
    legacy
      .prepare("INSERT INTO legacyRegistry VALUES ('retained', 'exactly')")
      .run();
    legacy.close();

    const rebuiltPath = resolve(directory, "rebuilt.sqlite");
    const rebuilt = rebuildLegacyArtifactIndex({
      legacyDbPath: relative(repoRoot, legacyPath),
      dbPath: relative(repoRoot, rebuiltPath),
      artifactDirectory: relative(repoRoot, resolve(directory, "artifacts")),
    });
    expect(rebuilt.inventory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "run", disposition: "artifactBacked" }),
        expect.objectContaining({
          kind: "review",
          disposition: "artifactBacked",
        }),
        expect.objectContaining({
          kind: "run",
          legacyId: 2,
          disposition: "databaseOnly",
        }),
        expect.objectContaining({
          kind: "review",
          legacyId: 2,
          disposition: "databaseOnly",
        }),
      ]),
    );
    const indexed = new DatabaseSync(rebuiltPath, { readOnly: true });
    expect(
      indexed.prepare("SELECT COUNT(*) AS count FROM calls").get(),
    ).toEqual({
      count: 1,
    });
    expect(
      indexed.prepare("SELECT COUNT(*) AS count FROM verdicts").get(),
    ).toEqual({
      count: 1,
    });
    expect(
      indexed.prepare("SELECT COUNT(*) AS count FROM legacyInventory").get(),
    ).toEqual({ count: 5 });
    // The fixture inventory contains exactly one database evidence artifact.
    const exact = indexed
      .prepare(
        "SELECT artifacts.path FROM legacyInventory JOIN artifacts ON artifacts.sha256 = legacyInventory.evidenceSha256 WHERE legacyInventory.kind = 'database'",
      )
      .get() as { path: string };
    // `rebuildLegacyArtifactIndex` authored this retained evidence object with
    // all five arrays; the cast narrows that production-generated fixture.
    const exactRows = JSON.parse(
      readFileSync(resolve(repoRoot, exact.path), "utf8"),
    ) as {
      runs: readonly unknown[];
      steps: readonly unknown[];
      reviewRounds: readonly unknown[];
      verdicts: readonly unknown[];
      legacyRegistry: readonly unknown[];
    };
    expect(exactRows).toMatchObject({
      runs: expect.arrayContaining([expect.objectContaining({ id: 2 })]),
      steps: expect.arrayContaining([expect.objectContaining({ runId: 2 })]),
      reviewRounds: expect.arrayContaining([
        expect.objectContaining({ id: 2 }),
      ]),
      verdicts: expect.arrayContaining([expect.objectContaining({ id: 2 })]),
      legacyRegistry: [{ name: "retained", value: "exactly" }],
    });
    indexed.close();
  }, 30_000);
});
