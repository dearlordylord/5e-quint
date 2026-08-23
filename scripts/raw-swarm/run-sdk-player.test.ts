import { describe, expect, test } from "vitest";
import { Either, Schema } from "effect";

import { reconcilePlayerInvocation } from "./run-sdk-player.ts";
import { ModelInvocationNonZeroExitStatusSchema } from "./model-telemetry.ts";

describe("SDK player invocation lifecycle", () => {
  test("retains a terminal obstruction when the model exits nonzero", () => {
    const result = reconcilePlayerInvocation(
      {
        tag: "failed",
        process: {
          tag: "exited",
          status: Schema.decodeUnknownSync(
            ModelInvocationNonZeroExitStatusSchema,
          )(1),
        },
        cause: { tag: "process", reason: "Codex exited with status 1." },
      },
      {
        tag: "obstructed",
        recordedContinuations: 128,
        obstruction: {
          kind: "continuationLimit",
          limit: 128,
          message: "Synthetic terminal SDK obstruction.",
        },
      },
    );
    expect(Either.isRight(result)).toBe(true);
    expect(result).toMatchObject({
      _tag: "Right",
      right: {
        tag: "obstructed",
        recordedContinuations: 128,
      },
    });
  });

  test("does not turn an active or concluded player into obstruction success", () => {
    const lifecycle = {
      tag: "failed" as const,
      operation: "expectedLastMessage" as const,
      process: {
        tag: "timedOut" as const,
        timeoutMilliseconds: 25,
        termination: {
          tag: "reaped" as const,
          signalDelivery: {
            tag: "confirmed" as const,
            signal: "SIGKILL" as const,
          },
        },
      },
      cause: { tag: "process" as const, reason: "Codex timed out." },
    };
    expect(
      reconcilePlayerInvocation(lifecycle, {
        tag: "active",
        recordedContinuations: 2,
      }),
    ).toMatchObject({ _tag: "Left" });
    expect(
      reconcilePlayerInvocation(lifecycle, {
        tag: "concluded",
        recordedContinuations: 2,
      }),
    ).toMatchObject({ _tag: "Left" });
  });
});
