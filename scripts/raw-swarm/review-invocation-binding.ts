import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Either, Schema } from "effect";

import {
  codexOutputJsonSchema,
  CurrentScenarioCompositeReviewSchema,
  HistoricalScenarioCompositeReviewSchema,
  ScenarioCompositeReviewSchema,
} from "./scenario-campaign.ts";
import { modelInvocationEvidenceFromEvents } from "./model-telemetry.ts";
import {
  RetainedScenarioReviewInputSchema,
  type RetainedScenarioReviewInput,
  type RetainedScenarioReviewReplayBinding,
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
 * Validate event output against an already successful replay binding. The
 * replay boundary parses and validates the envelope and ledger exactly once;
 * this module only reads the separately-authoritative event stream and binds
 * its metadata/result to those parsed values.
 */
export function validateRetainedScenarioReviewInvocation(input: {
  readonly binding: RetainedScenarioReviewReplayBinding;
  readonly eventSha256: string;
  /** Parsed from the same bytes whose hash is passed above. */
  readonly events: readonly unknown[];
}): void {
  const { binding } = input;
  const retained = binding.retainedInput;
  const ledgerEntry = binding.ledgerEntry;
  const reviewStage = retained.reviewStage;
  if (input.eventSha256 !== ledgerEntry.eventsSha256) {
    fail(
      `Retained ${reviewStage} review input does not match its ledger event hash.`,
    );
  }
  const derived = modelInvocationEvidenceFromEvents(input.events);
  if (
    derived.tag === "invalid" ||
    derived.entry.schemaVersion !== ledgerEntry.schemaVersion
  ) {
    fail(
      `Retained ${reviewStage} review input event stream does not match its bound invocation evidence.`,
    );
  }
  const withoutEventsHash = Object.fromEntries(
    Object.entries(ledgerEntry).filter(([key]) => key !== "eventsSha256"),
  );
  if (canonicalJson(derived.entry) !== canonicalJson(withoutEventsHash)) {
    fail(
      `Retained ${reviewStage} review input does not match its invocation event metadata.`,
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
      `Retained ${reviewStage} review input has an unsupported output schema.`,
    );
  }
  const output = Schema.decodeUnknownEither(
    Schema.Struct({ result: ScenarioCompositeReviewSchema }),
    { onExcessProperty: "error" },
  )(finalAgentMessage(input.events));
  if (
    Either.isLeft(output) ||
    canonicalJson(output.right.result) !== canonicalJson(retained.result)
  ) {
    fail(
      `Retained ${reviewStage} review input result does not match its invocation event output.`,
    );
  }
}
