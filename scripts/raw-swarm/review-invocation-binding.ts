import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Either, Schema } from "effect";

import {
  codexOutputJsonSchema,
  CurrentScenarioCompositeReviewSchema,
  HistoricalScenarioCompositeReviewSchema,
  ScenarioCompositeReviewSchema,
} from "./scenario-campaign.ts";
import {
  modelInvocationEvidenceFromEvents,
  modelInvocationScenarioReference,
  readCodexEvents,
  type ModelInvocationLedgerEntry,
} from "./model-telemetry.ts";
import {
  RetainedScenarioReviewInputSchema,
  retainedScenarioReviewSubject,
  type RetainedScenarioReviewInput,
} from "./scenario-review-input.ts";
import { canonicalJson, repoRoot } from "./transcript.ts";

function fail(message: string): never {
  throw new Error(message);
}

function json(path: string): unknown {
  try {
    return JSON.parse(readFileSync(resolve(repoRoot, path), "utf8"));
  } catch {
    return fail(`Review invocation evidence ${path} is malformed JSON.`);
  }
}

export function retainedReviewInput<const Stage extends "milestone" | "final">(
  path: string,
  expectedStage: Stage,
): RetainedScenarioReviewInput {
  const decoded = Schema.decodeUnknownEither(
    RetainedScenarioReviewInputSchema,
    { onExcessProperty: "error" },
  )(json(path));
  if (Either.isLeft(decoded)) {
    fail(
      `Retained ${expectedStage} review input is invalid: ${decoded.left.message}`,
    );
  }
  if (decoded.right.reviewStage !== expectedStage) {
    fail(`Retained ${expectedStage} review input has the wrong stage.`);
  }
  return decoded.right;
}

export function finalAgentMessage(events: readonly unknown[]): unknown {
  const messages = events.flatMap((event): readonly string[] => {
    if (
      typeof event !== "object" ||
      event === null ||
      !("type" in event) ||
      event.type !== "item.completed" ||
      !("item" in event) ||
      typeof event.item !== "object" ||
      event.item === null ||
      !("type" in event.item) ||
      event.item.type !== "agent_message" ||
      !("text" in event.item) ||
      typeof event.item.text !== "string"
    ) {
      return [];
    }
    return [event.item.text];
  });
  const message = messages.at(-1);
  if (message === undefined) {
    fail("Review invocation has no final agent message.");
  }
  try {
    return JSON.parse(message);
  } catch {
    return fail("Review invocation final agent message is not JSON.");
  }
}

/**
 * Validate the immutable identity available at the retained-review boundary.
 * This module deliberately has no artifact-index dependency: callers own the
 * path authority hash and pass it in, avoiding the artifact-index/findings
 * import cycle.
 */
export function validateRetainedScenarioReviewInvocation(input: {
  readonly retainedInputPath: string;
  readonly eventPath: string;
  readonly eventSha256: string;
  readonly reviewStage: "milestone" | "final";
  readonly ledgerEntry: ModelInvocationLedgerEntry;
}): void {
  const retained = retainedReviewInput(
    input.retainedInputPath,
    input.reviewStage,
  );
  if (input.ledgerEntry.schemaVersion !== 4) {
    fail("Retained original composite reviews require v4 ledger evidence.");
  }
  if (input.eventSha256 !== input.ledgerEntry.eventsSha256) {
    fail(
      `Retained ${input.reviewStage} review input does not match its ledger event hash.`,
    );
  }
  const parsedEvents = readCodexEvents(resolve(repoRoot, input.eventPath));
  if (parsedEvents.tag === "invalid") {
    fail(parsedEvents.message);
  }
  const derived = modelInvocationEvidenceFromEvents(parsedEvents.events);
  if (derived.tag === "invalid" || derived.entry.schemaVersion !== 4) {
    fail(
      `Retained ${input.reviewStage} review input event stream is not valid v4 invocation evidence.`,
    );
  }
  const withoutEventsHash = Object.fromEntries(
    Object.entries(input.ledgerEntry).filter(([key]) => key !== "eventsSha256"),
  );
  if (canonicalJson(derived.entry) !== canonicalJson(withoutEventsHash)) {
    fail(
      `Retained ${input.reviewStage} review input does not match its invocation event metadata.`,
    );
  }
  const currentOutputSchema = codexOutputJsonSchema(
    CurrentScenarioCompositeReviewSchema,
  );
  const historicalOutputSchema = codexOutputJsonSchema(
    HistoricalScenarioCompositeReviewSchema,
  );
  if (
    canonicalJson(retained.outputJsonSchema) !==
      canonicalJson(currentOutputSchema) &&
    canonicalJson(retained.outputJsonSchema) !==
      canonicalJson(historicalOutputSchema)
  ) {
    fail(
      `Retained ${input.reviewStage} review input has an unsupported output schema.`,
    );
  }
  if (
    retained.invocationId !== input.ledgerEntry.invocationId ||
    (retained.schemaVersion === 2
      ? retained.scenarioId !==
        modelInvocationScenarioReference(input.ledgerEntry)
      : canonicalJson(retainedScenarioReviewSubject(retained)) !==
        canonicalJson(input.ledgerEntry.subject)) ||
    retained.sourceGitSha !== input.ledgerEntry.gitSha ||
    retained.model !== input.ledgerEntry.model ||
    retained.reasoningEffort !== input.ledgerEntry.reasoningEffort
  ) {
    fail(
      `Retained ${input.reviewStage} review input does not match its original invocation identity.`,
    );
  }
  const output = Schema.decodeUnknownEither(
    Schema.Struct({ result: ScenarioCompositeReviewSchema }),
    { onExcessProperty: "error" },
  )(finalAgentMessage(parsedEvents.events));
  if (
    Either.isLeft(output) ||
    canonicalJson(output.right.result) !== canonicalJson(retained.result)
  ) {
    fail(
      `Retained ${input.reviewStage} review input result does not match its invocation event output.`,
    );
  }
}
