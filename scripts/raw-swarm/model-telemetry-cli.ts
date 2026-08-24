import { randomUUID } from "node:crypto";
import { closeSync, openSync } from "node:fs";
import { Either, Schema } from "effect";

import {
  jsonModelInvocationLastMessageDecoder,
  MODEL_INVOCATION_PHASES,
  runCodexInvocation,
  type ModelInvocationPhase,
} from "./model-telemetry.ts";
import { ReviewOutputSchema } from "./review-contract.ts";
import { decodeScenarioId, GitShaSchema } from "./transcript.ts";
import {
  decodeEvidenceSetId,
  decodeExecutionId,
} from "./raw-swarm-identities.ts";

function fail(message: string): never {
  throw new Error(message);
}

function flag(args: readonly string[], name: string): string {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] !== undefined
    ? args[at + 1]!
    : fail(`Missing ${name}.`);
}

async function runPostPlayInvocation(args: readonly string[]): Promise<number> {
  const root = flag(args, "--root");
  const inputPath = flag(args, "--input");
  const outputPath = flag(args, "--output");
  const schemaPath = flag(args, "--schema");
  const eventsPath = flag(args, "--events");
  const logPath = flag(args, "--log");
  const ledgerPath = flag(args, "--ledger");
  const phaseInput = flag(args, "--phase");
  const scenarioId = decodeScenarioId(flag(args, "--scenario-id"));
  if (Either.isLeft(scenarioId)) fail(scenarioId.left);
  const executionId = decodeExecutionId(flag(args, "--execution-id"));
  if (Either.isLeft(executionId)) fail(executionId.left);
  const evidenceSetId = decodeEvidenceSetId(flag(args, "--evidence-set-id"));
  if (Either.isLeft(evidenceSetId)) fail(evidenceSetId.left);
  const gitSha = Schema.decodeUnknownEither(GitShaSchema)(
    flag(args, "--git-sha"),
  );
  if (Either.isLeft(gitSha)) fail(gitSha.left.message);
  const phase: ModelInvocationPhase =
    MODEL_INVOCATION_PHASES.find((candidate) => candidate === phaseInput) ??
    fail(`Unknown model invocation phase ${phaseInput}.`);
  if (phase !== "postPlayReview") {
    fail("The owned review runner only accepts the postPlayReview phase.");
  }
  const model = flag(args, "--model");
  const reasoningEffort = flag(args, "--reasoning-effort");
  const stagePlanReason = flag(args, "--stage-plan-reason");
  const stdinFd = openSync(inputPath, "r");
  try {
    const result = await runCodexInvocation({
      args: [
        "exec",
        "-C",
        root,
        "--sandbox",
        "danger-full-access",
        "--ephemeral",
        "--json",
        "-m",
        model,
        "-c",
        `model_reasoning_effort="${reasoningEffort}"`,
        "--output-schema",
        schemaPath,
        "-",
      ],
      cwd: root,
      env: process.env,
      stdinFd,
      eventPath: eventsPath,
      logPath,
      ledgerPath,
      phase,
      stagePlanReason,
      subject: {
        tag: "execution",
        executionId: executionId.right,
        evidenceSetId: evidenceSetId.right,
        scenarioId: scenarioId.right,
      },
      gitSha: gitSha.right,
      fallbackInvocationId: randomUUID(),
      model,
      reasoningEffort,
      operation: {
        tag: "expectedLastMessage",
        expected: {
          path: outputPath,
          decode: jsonModelInvocationLastMessageDecoder(ReviewOutputSchema),
        },
      },
    });
    if (result.tag === "failed") {
      process.stderr.write(
        `Post-play Codex invocation failed: ${result.cause.reason}\n`,
      );
      return 1;
    }
    return 0;
  } finally {
    closeSync(stdinFd);
  }
}

const cliArgs = process.argv.slice(2);
if (cliArgs[0] === "run") {
  runPostPlayInvocation(cliArgs.slice(1))
    .then((status) => {
      process.exitCode = status;
    })
    .catch((error: unknown) => {
      process.stderr.write(
        `${error instanceof Error ? error.message : String(error)}\n`,
      );
      process.exitCode = 1;
    });
} else {
  process.stderr.write(
    "Usage: model-telemetry-cli.ts run --root ... --input ... --output ...\n",
  );
  process.exitCode = 1;
}
