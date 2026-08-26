import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { relative, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { Either, Schema } from "effect";
import { afterEach, describe, expect, test, vi } from "vitest";

import { openArtifactIndex } from "./artifact-index.ts";
import { projectGenerationFindings } from "./generation-findings.ts";
import { writeFindingsProjection } from "./findings.ts";
import { controlledReviewEvidenceFixture } from "./review-invocation-evidence.test-support.ts";
import { rawSwarmTestOutputDirectory } from "./test-output.ts";
import {
  GitHubIssueNumberSchema,
  makeGitHubIssueLinker,
  SwarmFingerprintSchema,
  type GitHubCommandRunner,
} from "./report.ts";
import { repoRoot } from "./transcript.ts";

const reportScript = resolve(repoRoot, "scripts/raw-swarm/report.ts");
const temporaryDirectories: string[] = [];
const temporaryExternalDirectories: string[] = [];

function temporaryDirectory(): string {
  const directory = rawSwarmTestOutputDirectory("report-test-");
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
  for (const directory of temporaryExternalDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function report(
  args: readonly string[],
  env?: Readonly<Record<string, string>>,
): string {
  return execFileSync(
    "mise",
    ["exec", "--", "node", "--experimental-strip-types", reportScript, ...args],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, ...env },
    },
  );
}

function query(dbPath: string, sql: string): unknown {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    return db.prepare(sql).get();
  } finally {
    db.close();
  }
}

function snapshotDirectory(directory: string) {
  const entries = readdirSync(directory).sort();
  const files = entries.map((name) => {
    const bytes = readFileSync(resolve(directory, name));
    return {
      name,
      bytes,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  });
  return { entries, files };
}

function expectDirectoryUnchanged(
  directory: string,
  before: ReturnType<typeof snapshotDirectory>,
): void {
  const after = snapshotDirectory(directory);
  expect(after.entries).toEqual(before.entries);
  expect(after.files.map(({ name }) => name)).toEqual(
    before.files.map(({ name }) => name),
  );
  expect(after.files.map(({ sha256 }) => sha256)).toEqual(
    before.files.map(({ sha256 }) => sha256),
  );
  expect(after.files.map(({ bytes }) => bytes)).toEqual(
    before.files.map(({ bytes }) => bytes),
  );
}

type ReadOnlyReportAssertion = (invoke: () => string) => void;

const readOnlyReportCommands: readonly {
  readonly args: readonly string[];
  readonly assert: ReadOnlyReportAssertion;
}[] = [
  {
    args: ["summary"],
    assert: (invoke) => expect(invoke()).toContain("Executions: 0"),
  },
  {
    args: ["issues"],
    assert: (invoke) => expect(invoke()).toBe(""),
  },
  {
    args: ["audit", "--execution-row", "1"],
    assert: (invoke) => expect(invoke).toThrow(/no indexed findings artifact/),
  },
  {
    args: ["generation-audit", "--campaign-row", "1"],
    assert: (invoke) => expect(invoke).toThrow(/no indexed findings artifact/),
  },
];

function expectReadOnlyReportCommandsPreserve(
  dbPath: string,
  directorySnapshots: readonly {
    readonly directory: string;
    readonly before: ReturnType<typeof snapshotDirectory>;
  }[],
): void {
  const dbArgument = relative(repoRoot, dbPath);
  for (const command of readOnlyReportCommands) {
    command.assert(() => report([...command.args, "--db", dbArgument]));
    for (const snapshot of directorySnapshots) {
      expectDirectoryUnchanged(snapshot.directory, snapshot.before);
    }
  }
}

describe("RAW swarm artifact report index", () => {
  test("rejects the unnamed review-replay flag with a value", () => {
    expect(() =>
      report([
        "findings",
        "transcript.jsonl",
        "--db",
        "report.sqlite",
        "--review-replay",
        "final.json",
      ]),
    ).toThrow(/review replay uses the named/);
  });

  test("rejects a bare unnamed review-replay flag", () => {
    expect(() =>
      report([
        "findings",
        "transcript.jsonl",
        "--db",
        "report.sqlite",
        "--review-replay",
      ]),
    ).toThrow(/review replay uses the named/);
  });

  test("rejects an unknown review-replay flag", () => {
    expect(() =>
      report([
        "findings",
        "transcript.jsonl",
        "--db",
        "report.sqlite",
        "--review-replay-fnal",
        "final.json",
      ]),
    ).toThrow(/Unsupported findings replay flag/);
  });

  test("rejects a named review-replay pair with one member absent", () => {
    expect(() =>
      report([
        "findings",
        "transcript.jsonl",
        "--db",
        "report.sqlite",
        "--review-replay-final",
        "final.json",
      ]),
    ).toThrow(
      /review replay requires one named milestone envelope and one named final envelope/,
    );
  });

  test("rejects a named review-replay flag without a value", () => {
    expect(() =>
      report([
        "findings",
        "transcript.jsonl",
        "--db",
        "report.sqlite",
        "--review-replay-milestone",
        "--review-replay-final",
      ]),
    ).toThrow(/--review-replay-milestone requires a value/);
  });

  test("keeps source and portable directories stable across read-only report commands", () => {
    const directory = temporaryDirectory();
    const sourceDirectory = resolve(directory, "source");
    const dbPath = resolve(sourceDirectory, "source.sqlite");
    const source = openArtifactIndex(relative(repoRoot, dbPath));
    source.close();
    const sourceDirectoryBefore = snapshotDirectory(sourceDirectory);
    const destination = resolve(directory, "portable");
    report([
      "export",
      "--db",
      relative(repoRoot, dbPath),
      "--destination",
      relative(repoRoot, destination),
    ]);

    const portableIndexPath = resolve(destination, "index.sqlite");
    expectDirectoryUnchanged(sourceDirectory, sourceDirectoryBefore);
    const portableDirectoryBefore = snapshotDirectory(destination);
    const directorySnapshots = [
      { directory: sourceDirectory, before: sourceDirectoryBefore },
      { directory: destination, before: portableDirectoryBefore },
    ];
    expectReadOnlyReportCommandsPreserve(dbPath, directorySnapshots);
    expectReadOnlyReportCommandsPreserve(portableIndexPath, directorySnapshots);
  }, 60_000);

  test("preserves the legacy inventory obstruction for read-only report commands", () => {
    const directory = temporaryDirectory();
    const dbPath = resolve(directory, "legacy.sqlite");
    const legacy = new DatabaseSync(dbPath);
    legacy.exec(
      "CREATE TABLE steps(id INTEGER PRIMARY KEY); INSERT INTO steps VALUES (1);",
    );
    legacy.close();
    const indexBefore = readFileSync(dbPath);

    expect(() =>
      report(["summary", "--db", relative(repoRoot, dbPath)]),
    ).toThrow(
      /Legacy Raw Swarm database must be inventoried and rebuilt before use/,
    );
    expect(readFileSync(dbPath)).toEqual(indexBefore);
  }, 30_000);

  test("audits populated portable Execution and Campaign bundles after relocation", () => {
    const directory = temporaryDirectory();
    const externalRoot = mkdtempSync(resolve(tmpdir(), "raw-swarm-report-"));
    temporaryExternalDirectories.push(externalRoot);
    const evidence = controlledReviewEvidenceFixture({
      directory: resolve(directory, "execution-evidence"),
      ledgerEntries: [
        {
          schemaVersion: 4,
          phase: "postPlayReview",
          stagePlanReason: "The fixture stage requires post-play review.",
          invocationId: "relocated-review",
          model: "gpt-5.6-luna",
          reasoningEffort: "max",
          startedAt: "2026-08-17T00:00:00.000Z",
          elapsedMilliseconds: 1,
          exit: { tag: "exited", status: 0 },
          result: { tag: "succeeded" },
          usage: {
            tag: "unavailable",
            reason:
              "The first-party event stream exposed no turn.completed usage object.",
          },
        },
      ],
    });
    const executionDbPath = resolve(directory, "execution.sqlite");
    report([
      "ingest",
      relative(repoRoot, evidence.transcriptPath),
      "--db",
      relative(repoRoot, executionDbPath),
    ]);
    report([
      "review",
      relative(repoRoot, evidence.reviewPath),
      "--db",
      relative(repoRoot, executionDbPath),
      "--execution-row",
      "1",
      "--review-invocation-evidence",
      relative(repoRoot, evidence.manifestPath),
    ]);
    report([
      "findings",
      relative(repoRoot, evidence.transcriptPath),
      "--db",
      relative(repoRoot, executionDbPath),
      "--review",
      relative(repoRoot, evidence.reviewPath),
      "--generation-ledger",
      relative(repoRoot, evidence.ledgerPath),
      "--review-replay-milestone",
      relative(repoRoot, evidence.replayPrePlayReviewInputPaths[0]!),
      "--review-replay-final",
      relative(repoRoot, evidence.replayPrePlayReviewInputPaths[1]!),
    ]);
    const executionPortablePath = resolve(externalRoot, "execution");
    report([
      "export",
      "--db",
      relative(repoRoot, executionDbPath),
      "--destination",
      relative(repoRoot, executionPortablePath),
    ]);
    rmSync(resolve(directory, "execution-evidence"), {
      recursive: true,
      force: true,
    });
    const relocatedExecutionIndex = resolve(
      executionPortablePath,
      "index.sqlite",
    );
    const executionIndexBefore = readFileSync(relocatedExecutionIndex);
    const executionManifestBefore = readFileSync(
      resolve(executionPortablePath, "manifest.json"),
    );
    const executionManifest = JSON.parse(
      executionManifestBefore.toString("utf8"),
    ) as { readonly artifacts: readonly unknown[] };
    expect(executionManifest.artifacts.length).toBeGreaterThan(0);
    expect(
      report([
        "audit",
        "--execution-row",
        "1",
        "--db",
        relative(repoRoot, relocatedExecutionIndex),
      ]),
    ).toContain("fixture-execution");
    expect(readFileSync(relocatedExecutionIndex)).toEqual(executionIndexBefore);
    expect(
      readFileSync(resolve(executionPortablePath, "manifest.json")),
    ).toEqual(executionManifestBefore);

    const generationRoot = resolve(directory, "generation-evidence");
    mkdirSync(generationRoot, { recursive: true });
    const campaignPath = resolve(generationRoot, "campaign.json");
    writeFileSync(
      campaignPath,
      `${JSON.stringify({
        type: "raw-swarm-scenario-campaign",
        schemaVersion: 1,
        campaignId: "relocated-campaign",
        plannedScenarioId: "relocated-scenario",
        evidenceSetId: "relocated-evidence",
        gitSha: "a".repeat(40),
        startedAt: "2026-08-18T00:00:00.000Z",
        configSha256: "c".repeat(64),
      })}\n`,
    );
    const generationFindingsPath = resolve(
      generationRoot,
      "generation-findings.json",
    );
    const generationProjection = projectGenerationFindings({
      authorityPaths: [
        { role: "campaign", path: relative(repoRoot, campaignPath) },
      ],
      generationLedgerPaths: [],
      scenarioReviewPaths: [],
      stagePlanPaths: [],
      stagePlanFindingsPaths: [],
      disposition: {
        tag: "campaignFailure",
        reason: "The relocated campaign fixture stopped before admission.",
      },
    });
    writeFindingsProjection({
      projection: generationProjection,
      path: relative(repoRoot, generationFindingsPath),
    });
    const generationDbPath = resolve(directory, "generation.sqlite");
    report([
      "generation-findings",
      relative(repoRoot, generationFindingsPath),
      "--db",
      relative(repoRoot, generationDbPath),
    ]);
    const generationPortablePath = resolve(externalRoot, "generation");
    report([
      "export",
      "--db",
      relative(repoRoot, generationDbPath),
      "--destination",
      relative(repoRoot, generationPortablePath),
    ]);
    rmSync(generationRoot, { recursive: true, force: true });
    const relocatedGenerationIndex = resolve(
      generationPortablePath,
      "index.sqlite",
    );
    const generationIndexBefore = readFileSync(relocatedGenerationIndex);
    const generationManifestBefore = readFileSync(
      resolve(generationPortablePath, "manifest.json"),
    );
    const generationManifest = JSON.parse(
      generationManifestBefore.toString("utf8"),
    ) as { readonly artifacts: readonly unknown[] };
    expect(generationManifest.artifacts.length).toBeGreaterThan(0);
    expect(
      report([
        "generation-audit",
        "--campaign-row",
        "1",
        "--db",
        relative(repoRoot, relocatedGenerationIndex),
      ]),
    ).toContain("relocated-campaign");
    expect(readFileSync(relocatedGenerationIndex)).toEqual(
      generationIndexBefore,
    );
    expect(
      readFileSync(resolve(generationPortablePath, "manifest.json")),
    ).toEqual(generationManifestBefore);
  }, 60_000);

  test("rejects unclassified historical input and retains controlled Execution verdict facts", () => {
    const directory = temporaryDirectory();
    const transcriptPath = resolve(directory, "run.jsonl");
    const dbPath = resolve(directory, "report.sqlite");
    const response = { result: { tag: "resolved" } };
    writeFileSync(
      transcriptPath,
      `${[
        {
          type: "header",
          scenarioId: "player-run-from-header",
          gitSha: "0".repeat(40),
          startedAt: "2026-08-11T00:00:00.000Z",
        },
        {
          seq: 1,
          direction: "client->server",
          message: {
            id: 7,
            method: "tools/call",
            params: { name: "resolve_battle_act", arguments: {} },
          },
        },
        {
          seq: 2,
          direction: "server->client",
          message: { id: 7, result: response },
        },
      ]
        .map((record) => JSON.stringify(record))
        .join("\n")}\n`,
    );
    expect(() =>
      report([
        "ingest",
        relative(repoRoot, transcriptPath),
        "--db",
        relative(repoRoot, dbPath),
      ]),
    ).toThrow(/use legacy rebuild for Historical Observations/);

    const controlledDbPath = resolve(directory, "controlled.sqlite");
    const controlledExportPath = resolve(directory, "controlled-portable");
    const controlledTimingPath = resolve(
      controlledExportPath,
      "reporting-timing.json",
    );
    const controlledEvidence = controlledReviewEvidenceFixture({
      directory: resolve(directory, "controlled-evidence"),
      ledgerEntries: [
        {
          schemaVersion: 4,
          phase: "postPlayReview",
          stagePlanReason: "The fixture stage requires post-play review.",
          invocationId: "controlled-review",
          model: "gpt-5.6-luna",
          reasoningEffort: "max",
          startedAt: "2026-08-17T00:00:00.000Z",
          elapsedMilliseconds: 1,
          exit: { tag: "exited", status: 0 },
          result: { tag: "succeeded" },
          usage: {
            tag: "unavailable",
            reason:
              "The first-party event stream exposed no turn.completed usage object.",
          },
        },
      ],
    });
    report([
      "controlled-reporting",
      relative(repoRoot, controlledEvidence.transcriptPath),
      relative(repoRoot, controlledEvidence.reviewPath),
      "--db",
      relative(repoRoot, controlledDbPath),
      "--destination",
      relative(repoRoot, controlledExportPath),
      "--timing",
      relative(repoRoot, controlledTimingPath),
      "--review-invocation-evidence",
      relative(repoRoot, controlledEvidence.manifestPath),
    ]);
    expect(
      JSON.parse(readFileSync(controlledTimingPath, "utf8")),
    ).toMatchObject({
      schemaVersion: 1,
      operations: ["ingest", "review", "portableExport"],
      runId: 1,
      elapsedMilliseconds: expect.any(Number),
    });
    expect(existsSync(resolve(controlledExportPath, "manifest.json"))).toBe(
      true,
    );
    // The production export wrote a schema-owned manifest at this exact path;
    // the test narrows only the artifacts field it asserts below.
    const controlledManifest = JSON.parse(
      readFileSync(resolve(controlledExportPath, "manifest.json"), "utf8"),
    ) as { readonly artifacts: readonly { readonly sha256: string }[] };
    expect(controlledManifest.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sha256: createHash("sha256")
            .update(readFileSync(controlledTimingPath))
            .digest("hex"),
        }),
        expect.objectContaining({
          sha256: createHash("sha256")
            .update(readFileSync(controlledEvidence.manifestPath))
            .digest("hex"),
        }),
        expect.objectContaining({
          sha256: createHash("sha256")
            .update(readFileSync(controlledEvidence.packetPath))
            .digest("hex"),
        }),
        ...[
          ...controlledEvidence.sourcePrePlayReviewInputPaths,
          ...controlledEvidence.replayPrePlayReviewInputPaths,
        ].map((path) =>
          expect.objectContaining({
            sha256: createHash("sha256")
              .update(readFileSync(path))
              .digest("hex"),
          }),
        ),
      ]),
    );
    expect(
      query(
        controlledDbPath,
        "SELECT auditSha256, invocationLedgerSha256 FROM reviews",
      ),
    ).toEqual({
      auditSha256: createHash("sha256")
        .update(readFileSync(controlledEvidence.auditPath))
        .digest("hex"),
      invocationLedgerSha256: createHash("sha256")
        .update(readFileSync(controlledEvidence.ledgerPath))
        .digest("hex"),
    });
    report([
      "findings",
      relative(repoRoot, controlledEvidence.transcriptPath),
      "--db",
      relative(repoRoot, controlledDbPath),
      "--review",
      relative(repoRoot, controlledEvidence.reviewPath),
      "--generation-ledger",
      relative(repoRoot, controlledEvidence.ledgerPath),
      "--review-replay-milestone",
      relative(repoRoot, controlledEvidence.replayPrePlayReviewInputPaths[0]!),
      "--review-replay-final",
      relative(repoRoot, controlledEvidence.replayPrePlayReviewInputPaths[1]!),
    ]);
    expect(
      report([
        "audit",
        "--execution-row",
        "1",
        "--db",
        relative(repoRoot, controlledDbPath),
      ]),
    ).toContain("fixture-execution");
  }, 30_000);

  test("establishes and verifies the GitHub backlink and label idempotently", () => {
    let body = "Existing issue body";
    const labels: string[] = [];
    const issueNumber = Schema.decodeUnknownSync(GitHubIssueNumberSchema)(42);
    const fingerprint = Schema.decodeUnknownSync(SwarmFingerprintSchema)(
      "a".repeat(64),
    );
    const runner: GitHubCommandRunner = {
      run: vi.fn((args, input) => {
        if (args[1] === "view") {
          return {
            tag: "success" as const,
            stdout: JSON.stringify({
              body,
              labels: labels.map((name) => ({ name })),
            }),
          };
        }
        if (args[1] === "edit" && input !== undefined) {
          body = input;
          if (!labels.includes("raw-swarm")) labels.push("raw-swarm");
          return { tag: "success" as const, stdout: "" };
        }
        return {
          tag: "failure" as const,
          message: "Unexpected gh command",
        };
      }),
    };
    const linker = makeGitHubIssueLinker(runner);
    expect(Either.isRight(linker.ensureLinked(issueNumber, fingerprint))).toBe(
      true,
    );
    expect(Either.isRight(linker.ensureLinked(issueNumber, fingerprint))).toBe(
      true,
    );
    expect(
      body.match(new RegExp(`Raw-Swarm-Fingerprint: ${fingerprint}`, "g")),
    ).toHaveLength(1);
    expect(labels).toEqual(["raw-swarm"]);
  });

  test("serializes production GitHub linking and enforces the positive issue-number state", async () => {
    const directory = temporaryDirectory();
    const dbPath = resolve(directory, "report.sqlite");
    const fingerprint = "b".repeat(64);
    const db = openArtifactIndex(relative(repoRoot, dbPath));
    db.prepare(
      "INSERT INTO issues(fingerprint, class, claim, firstSeenAt, lastSeenAt) VALUES (?, 'bug', 'claim', 'first', 'last')",
    ).run(fingerprint);
    db.close();
    expect(() => {
      const invalid = new DatabaseSync(dbPath);
      try {
        invalid.prepare("UPDATE issues SET githubIssueNumber = 0").run();
      } finally {
        invalid.close();
      }
    }).toThrow();

    const statePath = resolve(directory, "github-state.json");
    const overlapPath = resolve(directory, "github-overlap");
    writeFileSync(
      statePath,
      JSON.stringify({ body: "Existing", labels: [], edits: 0 }),
    );
    const fakeGhPath = resolve(directory, "gh");
    writeFileSync(
      fakeGhPath,
      `#!/usr/bin/env node
import fs from "node:fs";
const statePath = process.env.FAKE_GH_STATE;
const activePath = statePath + ".active";
let active;
try { active = fs.openSync(activePath, "wx"); }
catch { fs.writeFileSync(process.env.FAKE_GH_OVERLAP, "overlap"); process.exit(91); }
try {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  if (process.argv[3] === "view") process.stdout.write(JSON.stringify({ body: state.body, labels: state.labels }));
  else if (process.argv[3] === "edit") {
    state.body = fs.readFileSync(0, "utf8");
    state.labels = [{ name: "raw-swarm" }]; state.edits += 1;
    fs.writeFileSync(statePath, JSON.stringify(state));
  }
} finally { fs.closeSync(active); fs.unlinkSync(activePath); }
`,
    );
    chmodSync(fakeGhPath, 0o755);
    const args = [
      "link-github-issue",
      "--db",
      relative(repoRoot, dbPath),
      "--fingerprint",
      fingerprint,
      "--github-issue",
      "42",
    ];
    const environment = {
      PATH: `${directory}:${process.env.PATH ?? ""}`,
      FAKE_GH_STATE: statePath,
      FAKE_GH_OVERLAP: overlapPath,
    };
    const run = (): Promise<void> =>
      new Promise((resolveRun, rejectRun) => {
        const child = spawn(
          "mise",
          [
            "exec",
            "--",
            "node",
            "--experimental-strip-types",
            reportScript,
            ...args,
          ],
          {
            cwd: repoRoot,
            env: { ...process.env, ...environment },
            stdio: "ignore",
          },
        );
        child.on("error", rejectRun);
        child.on("exit", (status) =>
          status === 0
            ? resolveRun()
            : rejectRun(new Error(`link exited ${status}`)),
        );
      });
    await Promise.all([run(), run()]);
    expect(existsSync(overlapPath)).toBe(false);
    expect(query(dbPath, "SELECT githubIssueNumber FROM issues")).toEqual({
      githubIssueNumber: 42,
    });
  }, 30_000);
});
