import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parseSdkTranscript } from "./sdk-player/sdk-transcript.ts";
import { currentGitRevision, repoRoot, sha256Text } from "./transcript.ts";

function fail(message: string): never {
  throw new Error(message);
}

function main(args: readonly string[]): void {
  const [runPathInput, ...unexpected] = args;
  if (runPathInput === undefined || unexpected.length > 0) {
    fail("Usage: replay-sdk-player.ts <sdk-player-run-directory>");
  }
  const runPath = resolve(repoRoot, runPathInput);
  const transcriptPath = resolve(runPath, "evidence/sdk-calls.jsonl");
  const parsed = parseSdkTranscript(
    readFileSync(transcriptPath, "utf8")
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line): unknown => JSON.parse(line)),
  );
  if (parsed.tag === "invalid") fail(parsed.message);
  const revision = currentGitRevision();
  if (revision.tag === "dirty") fail("SDK replay requires a clean worktree.");
  if (revision.sha !== parsed.value.header.gitSha) {
    fail(
      `Replay requires recorded revision ${parsed.value.header.gitSha}; current checkout is ${revision.sha}.`,
    );
  }
  if (
    sha256Text(readFileSync(resolve(runPath, "SCENARIO.md"), "utf8")) !==
      parsed.value.header.scenarioSha256 ||
    sha256Text(
      readFileSync(resolve(runPath, "SCENARIO_REVIEW.json"), "utf8"),
    ) !== parsed.value.header.scenarioReviewSha256
  ) {
    fail("Retained scenario or admission review diverged from the recording.");
  }
  const replaySupervisor = resolve(runPath, "replay-supervisor.mjs");
  const replaySupervisorSha256 = createHash("sha256")
    .update(readFileSync(replaySupervisor))
    .digest("hex");
  if (replaySupervisorSha256 !== parsed.value.header.replaySupervisorSha256) {
    fail("Retained SDK replay supervisor does not match its recorded hash.");
  }
  const result = spawnSync(process.execPath, [replaySupervisor, "replay"], {
    cwd: runPath,
    encoding: "utf8",
  });
  if (result.error !== undefined) throw result.error;
  if (result.signal !== null) fail(`SDK replay stopped by ${result.signal}.`);
  if (result.status !== 0) fail(result.stderr || "SDK replay failed.");
  process.stdout.write(result.stdout);
}

main(process.argv.slice(2));
