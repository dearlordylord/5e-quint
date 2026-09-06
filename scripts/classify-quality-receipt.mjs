#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const RECEIPT_PATHS = new Set([
  "docs/migrations/effect-4/final-parity-report.md",
  "docs/migrations/effect-4/controlled-red-ledger.md",
]);
const SHA = /^[a-f0-9]{40}$/;
const FULL = { lane: "full" };

export function receiptDiff(raw) {
  const fields = raw.split("\0");
  if (fields.pop() !== "" || fields.length === 0 || fields.length % 2 !== 0)
    return false;
  return fields.every((field, index) =>
    index % 2 === 0
      ? /^:100644 100644 [a-f0-9]{40} [a-f0-9]{40} M$/.test(field)
      : RECEIPT_PATHS.has(field),
  );
}

export async function classifyReceipt({ event, ref, sha, runId, api, git }) {
  if (event !== "push" || ref !== "refs/heads/master" || !SHA.test(sha))
    return FULL;
  try {
    if (git(["rev-parse", "HEAD"]).trim() !== sha) return FULL;
    const current = await api(`actions/runs/${runId}`);
    if (
      current.head_sha !== sha ||
      current.event !== "push" ||
      current.head_branch !== "master" ||
      !Number.isSafeInteger(current.workflow_id)
    )
      return FULL;
    const response = await api(
      `actions/workflows/${current.workflow_id}/runs?branch=master&event=push&status=success&per_page=100`,
    );
    // Bounded discovery is conservative: older or unavailable evidence runs full.
    for (const run of response.workflow_runs) {
      if (
        run.id === Number(runId) ||
        !Number.isSafeInteger(run.id) ||
        !Number.isSafeInteger(run.run_attempt) ||
        run.workflow_id !== current.workflow_id ||
        run.event !== "push" ||
        run.head_branch !== "master" ||
        run.status !== "completed" ||
        run.conclusion !== "success" ||
        !SHA.test(run.head_sha) ||
        run.head_sha === sha
      )
        continue;
      if (git(["merge-base", run.head_sha, sha]).trim() !== run.head_sha)
        continue;
      const diff = git([
        "diff",
        "--raw",
        "-z",
        "--no-renames",
        "--no-abbrev",
        run.head_sha,
        sha,
        "--",
      ]);
      if (!receiptDiff(diff)) continue;
      const jobs = await api(
        `actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`,
      );
      if (jobs.total_count !== jobs.jobs.length) return FULL;
      const gates = jobs.jobs.filter(
        (job) =>
          job.name === "Resource-bounded workspace quality" &&
          job.head_sha === run.head_sha &&
          job.status === "completed" &&
          job.conclusion === "success" &&
          job.steps.some(
            (step) =>
              step.name === "Run workspace quality gate" &&
              step.status === "completed" &&
              step.conclusion === "success",
          ),
      );
      if (gates.length === 1)
        return { lane: "receipt", ancestor: run.head_sha, runId: run.id };
    }
    return FULL;
  } catch {
    // API, decoding, and Git failures cannot grant an exemption.
    return FULL;
  }
}

async function main() {
  const env = process.env;
  const result = await classifyReceipt({
    event: env.GITHUB_EVENT_NAME,
    ref: env.GITHUB_REF,
    sha: env.GITHUB_SHA,
    runId: env.GITHUB_RUN_ID,
    api: async (endpoint) => {
      const response = await fetch(
        `${env.GITHUB_API_URL}/repos/${env.GITHUB_REPOSITORY}/${endpoint}`,
        {
          headers: {
            Authorization: `Bearer ${env.GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!response.ok) throw new Error("Actions evidence unavailable");
      return response.json();
    },
    git: (args) => {
      const result = spawnSync("git", args, {
        encoding: "utf8",
        timeout: 10_000,
        maxBuffer: 1024 * 1024,
      });
      if (result.status !== 0) throw new Error("Git evidence unavailable");
      return result.stdout;
    },
  });
  appendFileSync(env.GITHUB_OUTPUT, `lane=${result.lane}\n`);
  const evidence =
    result.lane === "receipt"
      ? `Receipt checks only; implementation qualified at ${result.ancestor} by [full Quality run](${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${result.runId}). Receipt claims still require evidence review; this does not certify their prose or satisfy an exact-candidate SR-19 gate; use workflow_dispatch for full qualification.\n`
      : "Full workspace qualification selected.\n";
  appendFileSync(env.GITHUB_STEP_SUMMARY, evidence);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await main();
