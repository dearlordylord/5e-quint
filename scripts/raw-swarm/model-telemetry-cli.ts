import { randomUUID } from "node:crypto";
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

const args = process.argv.slice(2);
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
if (!Number.isInteger(shellStatus)) fail("--shell-status must be an integer.");
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
  fail("The current telemetry CLI must emit v4 model invocation evidence.");
}
appendInvocationLedger(ledgerPath, {
  ...evidence.entry,
  eventsSha256: invocationEventsSha256(eventsPath),
});
