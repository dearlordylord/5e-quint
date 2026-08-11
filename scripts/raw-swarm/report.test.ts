import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, test } from "vitest";

import { repoRoot, sha256Canonical } from "./transcript.ts";

const reportScript = resolve(repoRoot, "scripts/raw-swarm/report.ts");

function runReport(args: readonly string[]): void {
  execFileSync(
    "mise",
    ["exec", "--", "node", "--experimental-strip-types", reportScript, ...args],
    { cwd: repoRoot },
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

describe("RAW swarm report store", () => {
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
      expect(queryOne(dbPath, "PRAGMA journal_mode")).toEqual({
        journal_mode: "wal",
      });
    } finally {
      rmSync(directory, { recursive: true });
    }
  }, 60_000);
});
