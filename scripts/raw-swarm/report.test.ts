import { execFileSync, spawn } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Either, Schema } from "effect";
import { describe, expect, test, vi } from "vitest";

import {
  GitHubIssueNumberSchema,
  linkGithubIssue,
  makeGitHubIssueLinker,
  SwarmFingerprintSchema,
  type GitHubCommandRunner,
  type GitHubIssueLinker,
} from "./report.ts";
import { isJsonRecord, repoRoot, sha256Canonical } from "./transcript.ts";

const reportScript = resolve(repoRoot, "scripts/raw-swarm/report.ts");

function runReport(args: readonly string[]): void {
  reportOutput(args);
}

function reportOutput(args: readonly string[]): string {
  return execFileSync(
    "mise",
    ["exec", "--", "node", "--experimental-strip-types", reportScript, ...args],
    { cwd: repoRoot, encoding: "utf8" },
  );
}

function reportProcess(
  args: readonly string[],
  environment: Readonly<Record<string, string>>,
): Promise<void> {
  return new Promise((resolveProcess, rejectProcess) => {
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
        stdio: ["ignore", "ignore", "pipe"],
      },
    );
    const stderr: Buffer[] = [];
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", rejectProcess);
    child.on("close", (status) => {
      if (status === 0) {
        resolveProcess();
        return;
      }
      rejectProcess(
        new Error(
          `report process exited ${String(status)}: ${Buffer.concat(stderr).toString("utf8")}`,
        ),
      );
    });
  });
}

function queryOne(dbPath: string, sql: string): unknown {
  const output = execFileSync(
    "mise",
    [
      "exec",
      "--",
      "node",
      "--input-type=module",
      "-e",
      'import { DatabaseSync } from "node:sqlite"; const db = new DatabaseSync(process.argv[1], { readOnly: true }); console.log(JSON.stringify(db.prepare(process.argv[2]).get())); db.close();',
      dbPath,
      sql,
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  return JSON.parse(output);
}

function executeSql(dbPath: string, sql: string): void {
  execFileSync(
    "mise",
    [
      "exec",
      "--",
      "node",
      "--input-type=module",
      "-e",
      'import { DatabaseSync } from "node:sqlite"; const db = new DatabaseSync(process.argv[1]); db.exec(process.argv[2]); db.close();',
      dbPath,
      sql,
    ],
    { cwd: repoRoot },
  );
}

function queryString(dbPath: string, sql: string, field: string): string {
  const row = queryOne(dbPath, sql);
  if (!isJsonRecord(row) || typeof row[field] !== "string") {
    throw new Error(`Expected query field ${field} to be a string`);
  }
  return row[field];
}

describe("RAW swarm report store", () => {
  test("serializes concurrent CLI links through the production workflow lock", async () => {
    const directory = mkdtempSync(join(tmpdir(), "raw-swarm-link-lock-"));
    try {
      const dbPath = join(directory, "report.db");
      const fingerprint = "b".repeat(64);
      executeSql(
        dbPath,
        `CREATE TABLE issues(
          fingerprint TEXT PRIMARY KEY,
          class TEXT,
          claim TEXT,
          firstSeenAt TEXT,
          lastSeenAt TEXT
        );
        INSERT INTO issues VALUES(
          '${fingerprint}', 'bug', 'claim', 'first', 'last'
        )`,
      );
      reportOutput(["issues", "--db", dbPath]);

      const statePath = join(directory, "github-state.json");
      const overlapPath = join(directory, "github-overlap");
      writeFileSync(
        statePath,
        JSON.stringify({ body: "Existing issue", labels: [], edits: 0 }),
      );
      const fakeGhPath = join(directory, "gh");
      writeFileSync(
        fakeGhPath,
        `#!/usr/bin/env node
import fs from "node:fs";
const statePath = process.env.FAKE_GH_STATE;
const overlapPath = process.env.FAKE_GH_OVERLAP;
const activePath = statePath + ".active";
let active;
try {
  active = fs.openSync(activePath, "wx");
} catch {
  fs.writeFileSync(overlapPath, "overlap");
  process.exit(91);
}
try {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 150);
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  const command = process.argv[3];
  if (command === "view") {
    process.stdout.write(JSON.stringify({ body: state.body, labels: state.labels }));
  } else if (command === "edit") {
    state.body = fs.readFileSync(0, "utf8");
    if (!state.labels.some((label) => label.name === "raw-swarm")) {
      state.labels.push({ name: "raw-swarm" });
    }
    state.edits += 1;
    fs.writeFileSync(statePath, JSON.stringify(state));
  } else {
    process.exitCode = 64;
  }
} finally {
  fs.closeSync(active);
  fs.unlinkSync(activePath);
}
`,
      );
      chmodSync(fakeGhPath, 0o755);
      const linkArgs = [
        "link-github-issue",
        "--db",
        dbPath,
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
      await Promise.all([
        reportProcess(linkArgs, environment),
        reportProcess(linkArgs, environment),
      ]);

      expect(existsSync(overlapPath)).toBe(false);
      expect(JSON.parse(readFileSync(statePath, "utf8"))).toMatchObject({
        edits: 1,
        labels: [{ name: "raw-swarm" }],
      });
      expect(queryOne(dbPath, "SELECT githubIssueNumber FROM issues")).toEqual({
        githubIssueNumber: 42,
      });
    } finally {
      rmSync(directory, { recursive: true });
    }
  }, 60_000);

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
          const expectedArgs = ["issue", "view", "42", "--json", "body,labels"];
          if (
            input !== undefined ||
            args.length !== expectedArgs.length ||
            args.some((argument, at) => argument !== expectedArgs[at])
          ) {
            return { tag: "failure", message: "Invalid gh view arguments" };
          }
          return {
            tag: "success",
            stdout: JSON.stringify({
              body,
              labels: labels.map((name) => ({ name })),
            }),
          };
        }
        if (args[1] === "edit" && input !== undefined) {
          const expectedArgs = [
            "issue",
            "edit",
            "42",
            "--add-label",
            "raw-swarm",
            "--body-file",
            "-",
          ];
          if (
            args.length !== expectedArgs.length ||
            args.some((argument, at) => argument !== expectedArgs[at])
          ) {
            return { tag: "failure", message: "Invalid gh edit arguments" };
          }
          body = input;
          if (!labels.includes("raw-swarm")) labels.push("raw-swarm");
          return { tag: "success", stdout: "" };
        }
        return { tag: "failure", message: "Unexpected gh command" };
      }),
    };
    const linker = makeGitHubIssueLinker(runner);
    const first = linker.ensureLinked(issueNumber, fingerprint);
    expect(Either.isRight(first)).toBe(true);
    expect(body).toContain(`Raw-Swarm-Fingerprint: ${fingerprint}`);
    expect(labels).toContain("raw-swarm");

    const second = linker.ensureLinked(issueNumber, fingerprint);
    expect(Either.isRight(second)).toBe(true);
    expect(
      body.match(new RegExp(`Raw-Swarm-Fingerprint: ${fingerprint}`, "g")),
    ).toHaveLength(1);
    expect(runner.run).toHaveBeenCalledTimes(4);
  });

  test("migrates issue links with the same domain constraint as a fresh store", () => {
    const directory = mkdtempSync(
      join(tmpdir(), "raw-swarm-report-migration-"),
    );
    try {
      const dbPath = join(directory, "report.db");
      executeSql(
        dbPath,
        `CREATE TABLE issues(
          fingerprint TEXT PRIMARY KEY,
          class TEXT,
          claim TEXT,
          firstSeenAt TEXT,
          lastSeenAt TEXT
        )`,
      );
      reportOutput(["issues", "--db", dbPath]);
      const invalidIssue = (githubIssueNumber: number): string => `
        INSERT INTO issues(
          fingerprint, class, claim, firstSeenAt, lastSeenAt, githubIssueNumber
        ) VALUES (
          'fingerprint-${githubIssueNumber}', 'bug', 'claim', 'first', 'last',
          ${githubIssueNumber}
        )
      `;
      expect(() => executeSql(dbPath, invalidIssue(0))).toThrow();
      expect(() => executeSql(dbPath, invalidIssue(1.5))).toThrow();
    } finally {
      rmSync(directory, { recursive: true });
    }
  });

  test("derives scenario identity and kind from the transcript header", () => {
    const directory = mkdtempSync(join(tmpdir(), "raw-swarm-report-"));
    try {
      const transcriptPath = join(directory, "run.jsonl");
      const dbPath = join(directory, "report.db");
      const response = { result: { tag: "resolved" } };
      writeFileSync(
        transcriptPath,
        `${[
          {
            type: "header",
            scenarioId: "probe-from-header",
            kind: "scripted-probe",
            rawCitations: ["Rules-Glossary.md#action"],
            gitSha: "0123456789abcdef",
            startedAt: "2026-08-11T00:00:00.000Z",
          },
          {
            seq: 1,
            tool: "resolve_battle_act",
            args: {},
            response,
            responseSha256: sha256Canonical(response),
          },
        ]
          .map(JSON.stringify)
          .join("\n")}\n`,
        "utf8",
      );

      runReport(["ingest", transcriptPath, "--db", dbPath]);
      expect(() =>
        runReport([
          "verdict",
          "--db",
          dbPath,
          "--run",
          "999",
          "--class",
          "bug",
          "--claim",
          "orphan",
          "--evidence",
          "none",
          "--reviewer",
          "test",
        ]),
      ).toThrow();
      expect(queryOne(dbPath, "SELECT COUNT(*) AS count FROM issues")).toEqual({
        count: 0,
      });
      const reviewPath = join(directory, "review.json");
      writeFileSync(
        reviewPath,
        JSON.stringify({
          reviewer: "adversarial-reviewer",
          verdicts: [
            {
              class: "bug",
              claim: "Recorded transition matches its cited rule.",
              evidence: "Transcript seq 1; Rules-Glossary.md#action.",
            },
          ],
        }),
        "utf8",
      );
      runReport(["review", reviewPath, "--run", "1", "--db", dbPath]);

      expect(queryOne(dbPath, "SELECT id, kind FROM scenarios")).toEqual({
        id: "probe-from-header",
        kind: "scripted-probe",
      });
      expect(queryOne(dbPath, "SELECT scenarioId, gitSha FROM runs")).toEqual({
        scenarioId: "probe-from-header",
        gitSha: "0123456789abcdef",
      });
      expect(queryOne(dbPath, "SELECT tool, response FROM steps")).toEqual({
        tool: "resolve_battle_act",
        response: JSON.stringify(response),
      });
      expect(queryOne(dbPath, "SELECT class, reviewer FROM verdicts")).toEqual({
        class: "bug",
        reviewer: "adversarial-reviewer",
      });
      expect(
        queryOne(
          dbPath,
          "SELECT runId, reviewer, artifactPath FROM reviewRounds",
        ),
      ).toEqual({
        runId: 1,
        reviewer: "adversarial-reviewer",
        artifactPath: reviewPath,
      });
      expect(queryOne(dbPath, "SELECT class, claim FROM issues")).toEqual({
        class: "bug",
        claim: "Recorded transition matches its cited rule.",
      });
      const fingerprint = queryString(
        dbPath,
        "SELECT fingerprint FROM issues",
        "fingerprint",
      );
      expect(
        JSON.parse(
          reportOutput(["issues", "--db", dbPath, "--unlinked"]).trim(),
        ),
      ).toMatchObject({ fingerprint, githubIssueNumber: null });
      const linkArgs = [
        "--db",
        dbPath,
        "--fingerprint",
        fingerprint,
        "--github-issue",
        "42",
      ];
      const failedGithub: GitHubIssueLinker = {
        ensureLinked: () => Either.left("GitHub unavailable"),
      };
      expect(() => linkGithubIssue(linkArgs, failedGithub)).toThrow(
        "GitHub unavailable",
      );
      expect(queryOne(dbPath, "SELECT githubIssueNumber FROM issues")).toEqual({
        githubIssueNumber: null,
      });
      const throwingGithub: GitHubIssueLinker = {
        ensureLinked: () => {
          throw new Error("Unexpected linker failure");
        },
      };
      expect(() => linkGithubIssue(linkArgs, throwingGithub)).toThrow(
        "Unexpected linker failure",
      );
      expect(queryOne(dbPath, "SELECT githubIssueNumber FROM issues")).toEqual({
        githubIssueNumber: null,
      });
      expect(() =>
        linkGithubIssue(
          ["--db", "--fingerprint", fingerprint, "--github-issue", "42"],
          failedGithub,
        ),
      ).toThrow("requires exactly one");
      expect(existsSync(resolve(repoRoot, "--fingerprint"))).toBe(false);
      const ensureLinked = vi.fn(() => Either.right(undefined));
      const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
      try {
        linkGithubIssue(linkArgs, { ensureLinked });
      } finally {
        log.mockRestore();
      }
      expect(ensureLinked).toHaveBeenCalledWith(42, fingerprint);
      expect(queryOne(dbPath, "SELECT githubIssueNumber FROM issues")).toEqual({
        githubIssueNumber: 42,
      });
      expect(() =>
        linkGithubIssue(
          [
            "--db",
            dbPath,
            "--fingerprint",
            fingerprint,
            "--github-issue",
            "43",
          ],
          { ensureLinked },
        ),
      ).toThrow("refusing ambiguous relink");
      expect(ensureLinked).toHaveBeenCalledTimes(1);
      expect(queryOne(dbPath, "SELECT githubIssueNumber FROM issues")).toEqual({
        githubIssueNumber: 42,
      });
      expect(() =>
        executeSql(dbPath, "UPDATE issues SET githubIssueNumber = 0"),
      ).toThrow();
      expect(() =>
        executeSql(dbPath, "UPDATE issues SET githubIssueNumber = 1.5"),
      ).toThrow();
      expect(
        JSON.parse(reportOutput(["issues", "--db", dbPath, "--linked"]).trim()),
      ).toMatchObject({
        fingerprint,
        class: "bug",
        githubIssueNumber: 42,
      });
      expect(reportOutput(["issues", "--db", dbPath, "--unlinked"])).toBe("");
      expect(() =>
        reportOutput(["issues", "--db", dbPath, "--linked", "--unlinked"]),
      ).toThrow();
      expect(() =>
        reportOutput(["issues", "--db", dbPath, "--linkd"]),
      ).toThrow();
      expect(() => reportOutput(["issues", "--db", "--linked"])).toThrow();
      expect(queryOne(dbPath, "PRAGMA journal_mode")).toEqual({
        journal_mode: "wal",
      });
    } finally {
      rmSync(directory, { recursive: true });
    }
  }, 60_000);
});
