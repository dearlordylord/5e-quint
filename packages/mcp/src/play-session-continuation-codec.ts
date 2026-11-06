import { Result, Schema } from "effect";
import { validateState } from "@drdice/prng";
import type {
  McpApplicationServices,
  McpPlaySessionRoot,
} from "./composition-root.ts";
import {
  ContinuationGraphSchema,
  decodeContinuationGraph,
  encodeContinuationGraph,
  type ContinuationGraph,
} from "./continuation-graph.ts";
import { parseCanonicalContinuation } from "./continuation-validation.ts";
import { retainPlaySessionContinuation } from "./play-session-continuation.ts";
import { restorePlaySessionContinuation } from "./play-session-continuation-restore.ts";
import type { DiceSeed } from "./dice-sampling-service.ts";

export function encodePlaySessionContinuation(
  root: McpPlaySessionRoot,
): Result.Result<ContinuationGraph, string> {
  return Result.flatMap(retainPlaySessionContinuation(root), (continuation) =>
    encodeContinuationGraph(root, continuation),
  );
}

export function decodePlaySessionContinuation(
  services: McpApplicationServices,
  seed: DiceSeed,
  graph: ContinuationGraph,
): Result.Result<McpPlaySessionRoot, string> {
  return Result.flatMap(
    decodeContinuationGraph(services, graph),
    (continuation) => {
      const parsed = parseCanonicalContinuation(continuation);
      if (Result.isFailure(parsed)) return Result.fail(parsed.failure);
      if (!validateState(parsed.success.dice).ok)
        return Result.fail(
          "Saved continuation has an invalid random-source state.",
        );
      return restorePlaySessionContinuation(services, seed, parsed.success);
    },
  );
}

export function parseContinuationGraph(
  value: unknown,
): Result.Result<ContinuationGraph, string> {
  return Result.mapError(
    Schema.decodeUnknownResult(ContinuationGraphSchema, {
      onExcessProperty: "error",
    })(value),
    (issue) => issue.message,
  );
}
