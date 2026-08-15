import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { relative, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { Either, Schema } from "effect";
import { afterEach, describe, expect, test, vi } from "vitest";

import { openArtifactIndex } from "./artifact-index.ts";
import {
  GitHubIssueNumberSchema,
  makeGitHubIssueLinker,
  SwarmFingerprintSchema,
  type GitHubCommandRunner,
} from "./report.ts";
import { repoRoot } from "./transcript.ts";

const reportScript = resolve(repoRoot, "scripts/raw-swarm/report.ts");
const temporaryDirectories: string[] = [];

function temporaryDirectory(): string {
  const directory = mkdtempSync(
    resolve(repoRoot, "scripts/raw-swarm/out/report-test-"),
  );
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
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

describe("RAW swarm artifact report index", () => {
  test("indexes a transcript, verifies immutable review identity, and retains verdict facts", () => {
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
        .map(JSON.stringify)
        .join("\n")}\n`,
    );
    report([
      "ingest",
      relative(repoRoot, transcriptPath),
      "--db",
      relative(repoRoot, dbPath),
    ]);
    expect(query(dbPath, "SELECT operation, outcome FROM calls")).toEqual({
      operation: "resolve_battle_act",
      outcome: "returned",
    });
    expect(
      query(
        dbPath,
        "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'steps'",
      ),
    ).toEqual({ count: 0 });

    const reviewPath = resolve(directory, "review.json");
    writeFileSync(
      reviewPath,
      JSON.stringify({
        scenarioId: "player-run-from-header",
        gitSha: "0".repeat(40),
        transcriptSha256: createHash("sha256")
          .update(readFileSync(transcriptPath))
          .digest("hex"),
        reviewer: "adversarial-reviewer",
        verdicts: [
          {
            class: "bug",
            claim: "Recorded transition contradicts its cited rule.",
            evidence: "Transcript seq 1; Rules-Glossary.md#action.",
          },
        ],
      }),
    );
    report([
      "review",
      relative(repoRoot, reviewPath),
      "--run",
      "1",
      "--db",
      relative(repoRoot, dbPath),
    ]);
    expect(query(dbPath, "SELECT class, reviewer FROM verdicts")).toEqual({
      class: "bug",
      reviewer: "adversarial-reviewer",
    });
    expect(query(dbPath, "SELECT COUNT(*) AS count FROM issues")).toEqual({
      count: 1,
    });

    const controlledDbPath = resolve(directory, "controlled.sqlite");
    const controlledExportPath = resolve(directory, "controlled-portable");
    const controlledTimingPath = resolve(
      controlledExportPath,
      "reporting-timing.json",
    );
    report([
      "controlled-reporting",
      relative(repoRoot, transcriptPath),
      relative(repoRoot, reviewPath),
      "--db",
      relative(repoRoot, controlledDbPath),
      "--destination",
      relative(repoRoot, controlledExportPath),
      "--timing",
      relative(repoRoot, controlledTimingPath),
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
      ]),
    );
  });

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
            tag: "success",
            stdout: JSON.stringify({
              body,
              labels: labels.map((name) => ({ name })),
            }),
          };
        }
        if (args[1] === "edit" && input !== undefined) {
          body = input;
          if (!labels.includes("raw-swarm")) labels.push("raw-swarm");
          return { tag: "success", stdout: "" };
        }
        return { tag: "failure", message: "Unexpected gh command" };
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
  });
});
