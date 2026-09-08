import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  chmodSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { classifyReceipt, receiptDiff } from "./classify-quality-receipt.mjs";

const candidate = "a".repeat(40);
const ancestor = "b".repeat(40);
const receipt = "docs/migrations/effect-4/final-parity-report.md";
const diff = `:100644 100644 ${ancestor} ${candidate} M\0${receipt}\0`;
const qualified = {
  id: 41,
  run_attempt: 1,
  workflow_id: 7,
  head_sha: ancestor,
  head_branch: "master",
  event: "push",
  status: "completed",
  conclusion: "success",
};
const job = {
  name: "Resource-bounded workspace quality",
  head_sha: ancestor,
  status: "completed",
  conclusion: "success",
  steps: [
    {
      name: "Run workspace quality gate",
      status: "completed",
      conclusion: "success",
    },
  ],
};
function scenario({
  run = qualified,
  jobs = [job],
  raw = diff,
  ...overrides
} = {}) {
  return {
    event: "push",
    ref: "refs/heads/master",
    sha: candidate,
    runId: "42",
    api: async (endpoint) => {
      if (endpoint === "actions/runs/42")
        return { ...qualified, head_sha: candidate };
      if (endpoint.startsWith("actions/workflows/7/runs?"))
        return { workflow_runs: [run] };
      assert.equal(endpoint, "actions/runs/41/attempts/1/jobs?per_page=100");
      return { total_count: jobs.length, jobs };
    },
    git: (args) =>
      args[0] === "rev-parse"
        ? candidate
        : args[0] === "merge-base"
          ? ancestor
          : raw,
    ...overrides,
  };
}

test("qualifies a complete hosted full-gate ancestor and reports its identity", async () => {
  assert.deepEqual(await classifyReceipt(scenario()), {
    lane: "receipt",
    ancestor,
    runId: 41,
  });
});

test("receipt diff rejects empty, unknown, mixed, status and mode changes", () => {
  assert.equal(receiptDiff(diff), true);
  for (const raw of [
    "",
    "\0",
    diff.slice(0, -1),
    diff.replace(receipt, "plans/CLEANROOM_SOURCE_READINESS_LEDGER.md"),
    diff + diff.replace(receipt, "packages/core.ts"),
    ...["A", "D", "R100", "C100", "T"].map((status) =>
      diff.replace(" M\0", ` ${status}\0`),
    ),
    diff.replace(":100644", ":100755"),
    diff.replace(" 100644", " 100755"),
    diff.replace(":100644", ":120000"),
    diff.replace(" 100644", " 120000"),
  ])
    assert.equal(receiptDiff(raw), false, JSON.stringify(raw));
});

test("manual, PR, wrong branch, same SHA, failed or light ancestors run full", async () => {
  const inputs = [
    { event: "workflow_dispatch" },
    { event: "pull_request" },
    { ref: "refs/heads/topic" },
    { raw: "" },
    { run: { ...qualified, head_sha: candidate } },
    ...["failure", "cancelled", "skipped", null].map((conclusion) => ({
      run: { ...qualified, conclusion },
    })),
    { run: { ...qualified, status: "in_progress" } },
    { run: { ...qualified, workflow_id: 8 } },
    { run: { ...qualified, event: "pull_request" } },
    { run: { ...qualified, head_branch: "topic" } },
    { jobs: [{ ...job, steps: [{ ...job.steps[0], conclusion: "skipped" }] }] },
    {
      jobs: [
        {
          ...job,
          steps: [
            {
              ...job.steps[0],
              name: "Run receipt document and certificate checks",
            },
          ],
        },
      ],
    },
    { jobs: [job, job] },
    { raw: diff + diff.replace(receipt, "source.ts") },
  ];
  for (const input of inputs)
    assert.deepEqual(await classifyReceipt(scenario(input)), { lane: "full" });
});

test("API errors, malformed evidence, missing history, divergent ancestors fail closed", async () => {
  for (const overrides of [
    {
      api: async () => {
        throw new Error("unavailable");
      },
    },
    { api: async () => ({}) },
    {
      git: () => {
        throw new Error("shallow history");
      },
    },
    { git: (args) => (args[0] === "rev-parse" ? candidate : "c".repeat(40)) },
    { git: () => ancestor },
  ])
    assert.deepEqual(await classifyReceipt(scenario(overrides)), {
      lane: "full",
    });
});

test("raw Git diff detects additions, deletion and executable mode on admitted paths", () => {
  const cwd = mkdtempSync(join(tmpdir(), "dnd-receipt-test-"));
  const git = (...args) =>
    execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  try {
    git("init", "--quiet");
    git("config", "user.email", "test@example.invalid");
    git("config", "user.name", "Receipt test");
    git("config", "core.filemode", "true");
    mkdirSync(join(cwd, "docs/migrations/effect-4"), { recursive: true });
    writeFileSync(join(cwd, receipt), "baseline\n");
    git("add", ".");
    git("commit", "--quiet", "-m", "baseline");
    const base = git("rev-parse", "HEAD");
    const changed = () =>
      execFileSync(
        "git",
        [
          "diff",
          "--raw",
          "-z",
          "--no-renames",
          "--no-abbrev",
          base,
          "HEAD",
          "--",
        ],
        { cwd, encoding: "utf8" },
      );
    writeFileSync(join(cwd, receipt), "updated receipt\n");
    git("add", ".");
    git("commit", "--quiet", "-m", "receipt");
    assert.equal(receiptDiff(changed()), true);
    chmodSync(join(cwd, receipt), 0o755);
    git("add", ".");
    git("commit", "--quiet", "-m", "mode");
    assert.equal(receiptDiff(changed()), false);
    rmSync(join(cwd, receipt));
    git("add", ".");
    git("commit", "--quiet", "-m", "delete");
    assert.equal(receiptDiff(changed()), false);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
