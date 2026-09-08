import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Result, Schema } from "effect";
import {
  decodeScenarioId,
  GitShaSchema,
  repoRoot,
  type GitSha,
} from "./transcript.ts";
import {
  decodeEvidenceSetId,
  decodeExecutionId,
} from "./raw-swarm-identities.ts";
import {
  canonicalRepositoryOutputPath,
  canonicalRepositoryReadPath,
} from "./repository-path.ts";
import { assertModelEntryPointGuard } from "./model-entrypoint-guard.ts";
import {
  BenchmarkContextProfileSchema,
  type BenchmarkContextProfile,
} from "./benchmark-context-profile.ts";

function repositoryReadPath(value: string): string {
  const result = canonicalRepositoryReadPath(repoRoot, value);
  if (Result.isSuccess(result)) return result.success;
  const prospective = canonicalRepositoryOutputPath(repoRoot, value);
  return Result.isSuccess(prospective)
    ? prospective.success
    : fail(
        `Read path is not a repository authority: ${value}: ${result.failure}`,
      );
}

function repositoryOutputPath(value: string): string {
  const result = canonicalRepositoryOutputPath(repoRoot, value);
  return Result.isSuccess(result)
    ? result.success
    : fail(
        `Output path is not a repository destination: ${value}: ${result.failure}`,
      );
}

function fail(message: string): never {
  throw new Error(message);
}

function parseOptionalImplementationGitSha(
  input: string | undefined,
): Result.Result<GitSha | undefined, string> {
  if (input === undefined) return Result.succeed(undefined);
  if (input.trim().length === 0 || input.startsWith("-")) {
    return Result.fail(
      "--implementation-git-sha requires a lowercase Git SHA value.",
    );
  }
  return Schema.decodeUnknownResult(GitShaSchema)(input).pipe(
    Result.mapError((error) => error.message),
  );
}

function parseOptionalBenchmarkProfile(
  input: string | undefined,
): Result.Result<BenchmarkContextProfile | undefined, string> {
  if (input === undefined) return Result.succeed(undefined);
  return Schema.decodeUnknownResult(BenchmarkContextProfileSchema)(input).pipe(
    Result.mapError((error) => error.message),
  );
}

function admitSdkPlayerArguments(args: readonly string[]) {
  assertModelEntryPointGuard();
  const [scenarioId, ...options] = args;
  const decodedScenarioId = decodeScenarioId(scenarioId);
  const instructionalFallback = options.includes("--instructional-isolation");
  const pathFlags = [
    "--scenario-path",
    "--scenario-review-path",
    "--characters-path",
    "--setup-path",
    "--stage-plan-path",
    "--stage-plan-findings-path",
    "--output-path",
    "--benchmark-context-path",
  ] as const;
  type PathFlag = (typeof pathFlags)[number];
  const isPathFlag = (value: string): value is PathFlag =>
    pathFlags.some((flag) => flag === value);
  const pathValues = new Map<PathFlag, string>();
  const pathOptionIndexes = new Set<number>();
  let invalidPathValue = false;
  for (const [index, option] of options.entries()) {
    if (!isPathFlag(option)) continue;
    const value = options[index + 1];
    if (
      value === undefined ||
      value.trim().length === 0 ||
      value.startsWith("-") ||
      pathValues.has(option)
    ) {
      invalidPathValue = true;
      continue;
    }
    pathValues.set(option, value);
    pathOptionIndexes.add(index);
    pathOptionIndexes.add(index + 1);
  }
  const executionIdFlagIndex = options.indexOf("--execution-id");
  const executionIdInput =
    executionIdFlagIndex === -1 ? undefined : options[executionIdFlagIndex + 1];
  const decodedExecutionId = decodeExecutionId(executionIdInput);
  const executionIdOptionIndexes =
    executionIdFlagIndex === -1
      ? new Set<number>()
      : new Set([executionIdFlagIndex, executionIdFlagIndex + 1]);
  const evidenceSetIdFlagIndex = options.indexOf("--evidence-set-id");
  const evidenceSetIdInput =
    evidenceSetIdFlagIndex === -1
      ? undefined
      : options[evidenceSetIdFlagIndex + 1];
  const decodedEvidenceSetId = decodeEvidenceSetId(evidenceSetIdInput);
  const evidenceSetIdOptionIndexes =
    evidenceSetIdFlagIndex === -1
      ? new Set<number>()
      : new Set([evidenceSetIdFlagIndex, evidenceSetIdFlagIndex + 1]);
  const implementationGitShaFlagIndex = options.indexOf(
    "--implementation-git-sha",
  );
  const implementationGitShaInput =
    implementationGitShaFlagIndex === -1
      ? undefined
      : options[implementationGitShaFlagIndex + 1];
  const implementationGitShaOptionIndexes =
    implementationGitShaFlagIndex === -1
      ? new Set<number>()
      : new Set([
          implementationGitShaFlagIndex,
          implementationGitShaFlagIndex + 1,
        ]);
  const decodedImplementationGitSha = parseOptionalImplementationGitSha(
    implementationGitShaInput,
  );
  const benchmarkProfileFlagIndex = options.indexOf("--benchmark-profile");
  const benchmarkProfileInput =
    benchmarkProfileFlagIndex === -1
      ? undefined
      : options[benchmarkProfileFlagIndex + 1];
  const benchmarkProfileOptionIndexes =
    benchmarkProfileFlagIndex === -1
      ? new Set<number>()
      : new Set([benchmarkProfileFlagIndex, benchmarkProfileFlagIndex + 1]);
  const decodedBenchmarkProfile = parseOptionalBenchmarkProfile(
    benchmarkProfileInput,
  );
  const acceptedOptions = options.filter(
    (_option, index) =>
      !executionIdOptionIndexes.has(index) &&
      !evidenceSetIdOptionIndexes.has(index) &&
      !implementationGitShaOptionIndexes.has(index) &&
      !benchmarkProfileOptionIndexes.has(index) &&
      !pathOptionIndexes.has(index),
  );
  if (
    Result.isFailure(decodedScenarioId) ||
    Result.isFailure(decodedExecutionId) ||
    Result.isFailure(decodedEvidenceSetId) ||
    Result.isFailure(decodedImplementationGitSha) ||
    Result.isFailure(decodedBenchmarkProfile) ||
    invalidPathValue ||
    acceptedOptions.some((option) => option !== "--instructional-isolation") ||
    options.some(
      (option, index) =>
        isPathFlag(option) &&
        (!pathOptionIndexes.has(index) ||
          options.filter((candidate) => candidate === option).length !== 1),
    ) ||
    options.filter((option) => option === "--instructional-isolation").length >
      1 ||
    options.filter((option) => option === "--execution-id").length !== 1 ||
    executionIdFlagIndex + 1 >= options.length ||
    options.filter((option) => option === "--evidence-set-id").length !== 1 ||
    evidenceSetIdFlagIndex + 1 >= options.length ||
    options.filter((option) => option === "--implementation-git-sha").length >
      1 ||
    (implementationGitShaFlagIndex !== -1 &&
      (implementationGitShaFlagIndex + 1 >= options.length ||
        implementationGitShaInput === undefined ||
        implementationGitShaInput.startsWith("-"))) ||
    options.filter((option) => option === "--benchmark-profile").length > 1 ||
    (benchmarkProfileFlagIndex !== -1 &&
      (benchmarkProfileFlagIndex + 1 >= options.length ||
        benchmarkProfileInput === undefined ||
        benchmarkProfileInput.startsWith("-")))
  ) {
    fail(
      "Usage: run-sdk-player.ts <scenario-id> --execution-id <execution-id> --evidence-set-id <evidence-set-id> [--implementation-git-sha <git-sha>] [--benchmark-profile <profile>] [--instructional-isolation] [--scenario-path <path>] [--scenario-review-path <path>] [--characters-path <path>] [--setup-path <path>] [--stage-plan-path <path>] [--stage-plan-findings-path <path>] [--output-path <path>] [--benchmark-context-path <path>]",
    );
  }
  const acceptedScenarioId = decodedScenarioId.success;
  const acceptedExecutionId = decodedExecutionId.success;
  const acceptedEvidenceSetId = decodedEvidenceSetId.success;
  const requestedImplementationGitSha = decodedImplementationGitSha.success;
  const requestedBenchmarkProfile = decodedBenchmarkProfile.success;
  const pathValue = (flag: PathFlag): string | undefined =>
    pathValues.get(flag);
  const benchmarkContextPathInput = pathValue("--benchmark-context-path");
  if (
    (benchmarkContextPathInput === undefined) !==
    (requestedBenchmarkProfile === undefined)
  ) {
    fail(
      "--benchmark-profile and --benchmark-context-path must be supplied together.",
    );
  }
  const output = repositoryOutputPath(
    pathValue("--output-path") ??
      `scripts/raw-swarm/out/${acceptedEvidenceSetId}`,
  );
  const scenarioPath = repositoryReadPath(
    pathValue("--scenario-path") ??
      `scripts/raw-swarm/sdk-player/scenarios/${acceptedScenarioId}.md`,
  );
  const setupPath = repositoryReadPath(
    pathValue("--setup-path") ??
      `scripts/raw-swarm/sdk-player/scenarios/${acceptedScenarioId}.setup.ts`,
  );
  const charactersPath = repositoryReadPath(
    pathValue("--characters-path") ??
      `scripts/raw-swarm/sdk-player/scenarios/${acceptedScenarioId}.characters.ts`,
  );
  const scenarioReviewPath = repositoryReadPath(
    pathValue("--scenario-review-path") ??
      `${scenarioPath}.scenario-review.json`,
  );
  const benchmarkContextPath =
    benchmarkContextPathInput === undefined
      ? undefined
      : repositoryReadPath(benchmarkContextPathInput);
  const customStagePlanPathInput = pathValue("--stage-plan-path");
  const customStagePlanFindingsPathInput = pathValue(
    "--stage-plan-findings-path",
  );
  const customStagePlanPath =
    customStagePlanPathInput === undefined
      ? undefined
      : repositoryReadPath(customStagePlanPathInput);
  const customStagePlanFindingsPath =
    customStagePlanFindingsPathInput === undefined
      ? undefined
      : repositoryReadPath(customStagePlanFindingsPathInput);
  if (
    (customStagePlanPath === undefined) !==
    (customStagePlanFindingsPath === undefined)
  ) {
    fail(
      "--stage-plan-path and --stage-plan-findings-path must be supplied together.",
    );
  }
  return {
    acceptedScenarioId,
    acceptedExecutionId,
    acceptedEvidenceSetId,
    requestedImplementationGitSha,
    instructionalFallback,
    output,
    scenarioPath,
    setupPath,
    charactersPath,
    scenarioReviewPath,
    benchmarkContext:
      requestedBenchmarkProfile === undefined ||
      benchmarkContextPath === undefined
        ? undefined
        : { profile: requestedBenchmarkProfile, path: benchmarkContextPath },
    stagePlan:
      customStagePlanPath === undefined ||
      customStagePlanFindingsPath === undefined
        ? undefined
        : {
            path: customStagePlanPath,
            findingsPath: customStagePlanFindingsPath,
          },
  };
}

export type SdkPlayerAdmission = ReturnType<typeof admitSdkPlayerArguments>;

async function main(args: readonly string[]): Promise<void> {
  const admission = admitSdkPlayerArguments(args);
  const { executeSdkPlayer } = await import("./sdk-player-execution.ts");
  await executeSdkPlayer(admission);
}

if (
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
