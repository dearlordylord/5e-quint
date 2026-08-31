import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { Result, Schema } from "effect";

import { parseSdkTranscript } from "./sdk-player/sdk-transcript.ts";
import {
  SdkReplayResultEvidenceSchema,
  type SdkReplayResultEvidence,
} from "./sdk-player/sdk-replay-result.ts";
import { validateAdmittedScenarioStagePlanEvidence } from "./stage-plan-authority.ts";
import { currentGitRevision, repoRoot, sha256Text } from "./transcript.ts";
import {
  canonicalRepositoryOutputPath,
  canonicalRepositoryReadPath,
} from "./repository-path.ts";

function fail(message: string): never {
  throw new Error(message);
}

function repositoryReadPath(path: string): string {
  const result = canonicalRepositoryReadPath(repoRoot, path);
  return Result.isSuccess(result)
    ? result.success
    : fail(
        `Replay authority is not repository-owned: ${path}: ${result.failure}`,
      );
}

function repositoryOutputPath(path: string): string {
  const result = canonicalRepositoryOutputPath(repoRoot, path);
  return Result.isSuccess(result)
    ? result.success
    : fail(`Replay output is not repository-owned: ${path}: ${result.failure}`);
}

export function matchedCallCountFromReplayOutput(
  output: string,
  expectedCallCount: number,
): number {
  const ready = new RegExp(
    `SDK player replay deterministic: (\\d+) call\\(s\\) matched\\.`,
  ).exec(output);
  if (ready !== null) {
    const matchedCallCount = Number(ready[1]);
    if (matchedCallCount !== expectedCallCount) {
      fail(
        `SDK replay reported ${String(matchedCallCount)} matched calls; transcript contains ${String(expectedCallCount)}.`,
      );
    }
    return matchedCallCount;
  }
  if (
    /SDK (?:character-composition|setup) obstruction replay deterministic:/.test(
      output,
    ) &&
    expectedCallCount === 0
  ) {
    return 0;
  }
  fail("SDK replay did not report a deterministic success result.");
}

export function retainReplayResultEvidence(input: {
  readonly path: string;
  readonly evidence: SdkReplayResultEvidence;
}): void {
  const path = repositoryOutputPath(input.path);
  const encoded = `${JSON.stringify(input.evidence, null, 2)}\n`;
  if (existsSync(path)) {
    const existing = readFileSync(path, "utf8");
    if (existing !== encoded) {
      fail(
        "Refusing to overwrite a different immutable replay-result authority.",
      );
    }
    return;
  }
  writeFileSync(path, encoded, { flag: "wx" });
}

function main(args: readonly string[]): void {
  const [evidenceSetPathInput, ...unexpected] = args;
  if (evidenceSetPathInput === undefined || unexpected.length > 0) {
    fail("Usage: replay-sdk-player.ts <evidence-set-directory>");
  }
  const evidenceSetPath = repositoryReadPath(evidenceSetPathInput);
  const transcriptPath = repositoryReadPath(
    resolve(evidenceSetPath, "evidence/sdk-calls.jsonl"),
  );
  const transcriptBytes = readFileSync(transcriptPath);
  const parsed = parseSdkTranscript(
    transcriptBytes
      .toString("utf8")
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
    sha256Text(
      readFileSync(
        repositoryReadPath(resolve(evidenceSetPath, "SCENARIO.md")),
        "utf8",
      ),
    ) !== parsed.value.header.scenarioSha256 ||
    sha256Text(
      readFileSync(
        repositoryReadPath(resolve(evidenceSetPath, "SCENARIO_REVIEW.json")),
        "utf8",
      ),
    ) !== parsed.value.header.scenarioReviewSha256
  ) {
    fail("Retained scenario or admission review diverged from the recording.");
  }
  const stagePlanPath = repositoryReadPath(
    resolve(evidenceSetPath, "evidence/stage-plan.json"),
  );
  const stagePlanFindingsPath = repositoryReadPath(
    resolve(evidenceSetPath, "evidence/stage-plan-findings.json"),
  );
  let stagePlan: unknown;
  let stagePlanFindings: unknown;
  try {
    stagePlan = JSON.parse(readFileSync(stagePlanPath, "utf8"));
    stagePlanFindings = JSON.parse(readFileSync(stagePlanFindingsPath, "utf8"));
  } catch {
    fail("Replay requires readable retained stage-plan authorities.");
  }
  const stagePlanEvidence = validateAdmittedScenarioStagePlanEvidence({
    plan: stagePlan,
    findings: stagePlanFindings,
    scenarioId: parsed.value.header.scenarioId,
    scenarioSha256: parsed.value.header.scenarioSha256,
    scenarioReviewSha256: parsed.value.header.scenarioReviewSha256,
  });
  if (Result.isFailure(stagePlanEvidence)) fail(stagePlanEvidence.failure);
  const replaySupervisor = repositoryReadPath(
    resolve(evidenceSetPath, "replay-supervisor.mjs"),
  );
  const replaySupervisorSha256 = createHash("sha256")
    .update(readFileSync(replaySupervisor))
    .digest("hex");
  if (replaySupervisorSha256 !== parsed.value.header.replaySupervisorSha256) {
    fail("Retained SDK replay supervisor does not match its recorded hash.");
  }
  const result = spawnSync(process.execPath, [replaySupervisor, "replay"], {
    cwd: evidenceSetPath,
    encoding: "utf8",
  });
  if (result.error !== undefined) throw result.error;
  if (result.signal !== null) fail(`SDK replay stopped by ${result.signal}.`);
  if (result.status !== 0) fail(result.stderr || "SDK replay failed.");
  const matchedCallCount = matchedCallCountFromReplayOutput(
    result.stdout,
    parsed.value.calls.length,
  );
  const replayResult: SdkReplayResultEvidence = {
    type: "raw-swarm-sdk-replay-result",
    schemaVersion: 1,
    scenarioId: parsed.value.header.scenarioId,
    transcriptSha256: sha256Text(transcriptBytes.toString("utf8")),
    replaySupervisorSha256,
    matchedCallCount,
    status: "succeeded",
  };
  const decodedReplayResult = Schema.decodeUnknownResult(
    SdkReplayResultEvidenceSchema,
    { onExcessProperty: "error" },
  )(replayResult);
  if (Result.isFailure(decodedReplayResult)) {
    fail(
      `Replay-result authority is invalid: ${decodedReplayResult.failure.message}`,
    );
  }
  retainReplayResultEvidence({
    path: repositoryOutputPath(
      resolve(evidenceSetPath, "evidence/replay-result.json"),
    ),
    evidence: decodedReplayResult.success,
  });
  process.stdout.write(result.stdout);
}

if (process.argv[1]?.endsWith("replay-sdk-player.ts")) {
  main(process.argv.slice(2));
}
