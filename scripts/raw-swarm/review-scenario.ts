import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { Result, Schema } from "effect";

import { replayRetainedScenarioReview } from "./generate-scenario.ts";
import { assertModelEntryPointGuard } from "./model-entrypoint-guard.ts";
import { RetainedScenarioReviewInputSchema } from "./scenario-review-input.ts";
import { currentGitRevision, GitShaSchema, repoRoot } from "./transcript.ts";

function fail(message: string): never {
  throw new Error(message);
}

function retainedInput(path: string) {
  const value: unknown = JSON.parse(readFileSync(path, "utf8"));
  const decoded = Schema.decodeUnknownResult(
    RetainedScenarioReviewInputSchema,
    {
      onExcessProperty: "error",
    },
  )(value);
  return Result.isSuccess(decoded)
    ? decoded.success
    : fail(
        `Invalid retained scenario review input: ${decoded.failure.message}`,
      );
}

async function main(args: readonly string[]): Promise<void> {
  assertModelEntryPointGuard();
  const [retainedInputPath, outputInput, ledgerInput, ...unexpected] = args;
  if (
    retainedInputPath === undefined ||
    outputInput === undefined ||
    ledgerInput === undefined ||
    unexpected.length > 0
  ) {
    fail(
      "Usage: review-scenario.ts <retained-review-input.json> <output.json> <invocations.jsonl>",
    );
  }
  const inputPath = resolve(repoRoot, retainedInputPath);
  const outputPath = resolve(repoRoot, outputInput);
  const ledgerPath = resolve(repoRoot, ledgerInput);
  const revision = currentGitRevision();
  if (revision.tag === "dirty") {
    fail("Scenario review requires a clean Git worktree.");
  }
  const gitSha = Schema.decodeUnknownResult(GitShaSchema)(revision.sha);
  if (Result.isFailure(gitSha)) fail(gitSha.failure.message);
  if (existsSync(outputPath)) {
    fail(`Refusing to overwrite scenario review output: ${outputPath}`);
  }
  const result = await replayRetainedScenarioReview({
    retainedInput: retainedInput(inputPath),
    ledgerPath,
    gitSha: gitSha.success,
  });
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, {
    flag: "wx",
  });
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
