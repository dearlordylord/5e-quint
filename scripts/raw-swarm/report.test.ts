import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, test } from "vitest";

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
      runReport([
        "link-github-issue",
        "--db",
        dbPath,
        "--fingerprint",
        fingerprint,
        "--github-issue",
        "42",
      ]);
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
        JSON.parse(reportOutput(["issues", "--db", dbPath]).trim()),
      ).toMatchObject({
        fingerprint,
        class: "bug",
        githubIssueNumber: 42,
      });
      expect(queryOne(dbPath, "PRAGMA journal_mode")).toEqual({
        journal_mode: "wal",
      });
    } finally {
      rmSync(directory, { recursive: true });
    }
  }, 60_000);
});
