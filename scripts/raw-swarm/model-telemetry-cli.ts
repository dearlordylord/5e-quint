import { randomUUID } from "node:crypto";
import { Either, Schema } from "effect";

import {
  appendInvocationEvidenceEvents,
  appendInvocationLedger,
  invocationEventsSha256,
  modelInvocationCompletedEvent,
  modelInvocationEvidenceFromEvents,
  modelInvocationStartedEvent,
  readCodexEvents,
  MODEL_INVOCATION_PHASES,
  type ModelInvocationPhase,
} from "./model-telemetry.ts";
import { decodeScenarioId, GitShaSchema } from "./transcript.ts";

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
const startedAt = flag(args, "--started-at");
const elapsedMilliseconds = Number(flag(args, "--elapsed-ms"));
const exitStatus = Number(flag(args, "--exit-status"));
if (!Number.isInteger(elapsedMilliseconds) || elapsedMilliseconds < 0) {
  fail("--elapsed-ms must be a nonnegative integer.");
}
if (!Number.isInteger(exitStatus)) fail("--exit-status must be an integer.");
if (
  model.trim().length === 0 ||
  reasoningEffort.trim().length === 0 ||
  !Number.isFinite(Date.parse(startedAt))
) {
  fail("Model, reasoning effort, and ISO start time are required.");
}
appendInvocationEvidenceEvents({
  path: eventsPath,
  start: modelInvocationStartedEvent({
    scenarioId: scenarioId.right,
    gitSha: gitSha.right,
    phase,
    fallbackInvocationId: randomUUID(),
    model,
    reasoningEffort,
    startedAt,
  }),
  completion: modelInvocationCompletedEvent({
    elapsedMilliseconds,
    exit: { tag: "exited", status: exitStatus },
  }),
});
const parsedEvents = readCodexEvents(eventsPath);
if (parsedEvents.tag === "invalid") fail(parsedEvents.message);
const evidence = modelInvocationEvidenceFromEvents(parsedEvents.events);
if (evidence.tag === "invalid") fail(evidence.message);
appendInvocationLedger(ledgerPath, {
  ...evidence.entry,
  eventsSha256: invocationEventsSha256(eventsPath),
});
