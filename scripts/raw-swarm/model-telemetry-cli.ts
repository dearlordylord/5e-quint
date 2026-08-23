import { randomUUID } from "node:crypto";
import { closeSync, openSync } from "node:fs";
import { Either, Schema } from "effect";

import {
  appendInvocationEvidenceEvents,
  appendInvocationLedger,
  invocationEventsSha256,
  modelInvocationCompletedEvent,
  modelInvocationEvidenceFromEvents,
  modelInvocationResultFromCodexEvents,
  modelInvocationStartedEvent,
  readCodexEvents,
  MODEL_INVOCATION_PHASES,
  runCodexInvocation,
  type ModelInvocationPhase,
} from "./model-telemetry.ts";
import {
  decodeScenarioId,
  GitShaSchema,
  StartedAtSchema,
} from "./transcript.ts";
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

function runJsonDecoder(
  contents: string,
): Either.Either<unknown, { tag: "malformed"; message: string }> {
  try {
    return Either.right(JSON.parse(contents));
  } catch (error: unknown) {
    return Either.left({
      tag: "malformed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
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
        "--output-last-message",
        outputPath,
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
        expected: { path: outputPath, decode: runJsonDecoder },
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
  const args = cliArgs;
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
  const eventsPath = flag(args, "--events");
  const ledgerPath = flag(args, "--ledger");
  const model = flag(args, "--model");
  const reasoningEffort = flag(args, "--reasoning-effort");
  const stagePlanReason = args.includes("--stage-plan-reason")
    ? flag(args, "--stage-plan-reason")
    : `The ${phase} stage was recorded by the model telemetry boundary.`;
  const startedAt = Schema.decodeUnknownEither(StartedAtSchema)(
    flag(args, "--started-at"),
  );
  if (Either.isLeft(startedAt)) fail(startedAt.left.message);
  const elapsedMilliseconds = Number(flag(args, "--elapsed-ms"));
  const shellStatus = Number(flag(args, "--shell-status"));
  if (!Number.isInteger(elapsedMilliseconds) || elapsedMilliseconds < 0) {
    fail("--elapsed-ms must be a nonnegative integer.");
  }
  if (!Number.isInteger(shellStatus))
    fail("--shell-status must be an integer.");
  if (model.trim().length === 0 || reasoningEffort.trim().length === 0) {
    fail("Model and reasoning effort are required.");
  }
  const start = modelInvocationStartedEvent({
    subject: {
      tag: "execution",
      executionId: executionId.right,
      evidenceSetId: evidenceSetId.right,
      scenarioId: scenarioId.right,
    },
    gitSha: gitSha.right,
    phase,
    stagePlanReason,
    fallbackInvocationId: randomUUID(),
    model,
    reasoningEffort,
    startedAt: startedAt.right,
  });
  if (Either.isLeft(start)) fail(start.left.message);
  const codexEvents = readCodexEvents(eventsPath);
  if (codexEvents.tag === "invalid") fail(codexEvents.message);
  const invocationResult = modelInvocationResultFromCodexEvents(
    { tag: "shellStatus", status: shellStatus },
    codexEvents.events,
  );
  if (Either.isLeft(invocationResult)) fail(invocationResult.left);
  const completion = modelInvocationCompletedEvent({
    elapsedMilliseconds,
    exit: { tag: "shellStatus", status: shellStatus },
    result: invocationResult.right,
  });
  if (Either.isLeft(completion)) fail(completion.left.message);
  appendInvocationEvidenceEvents({
    path: eventsPath,
    start: start.right,
    completion: completion.right,
  });
  const parsedEvents = readCodexEvents(eventsPath);
  if (parsedEvents.tag === "invalid") fail(parsedEvents.message);
  const evidence = modelInvocationEvidenceFromEvents(parsedEvents.events);
  if (evidence.tag === "invalid") fail(evidence.message);
  if (evidence.entry.schemaVersion !== 4) {
    fail("The telemetry CLI must emit exact v4 model invocation evidence.");
  }
  appendInvocationLedger(ledgerPath, {
    ...evidence.entry,
    eventsSha256: invocationEventsSha256(eventsPath),
  });
}
