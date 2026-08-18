import { describe, expect, test } from "vitest";

import {
  playerContinuationEvidence,
  playerInvocationArtifactNames,
  playerInvocationNumberFromEventsArtifact,
  runPlayerInvocationLoop,
  type PlayerEvidenceState,
} from "./player-invocation-loop.ts";

describe("player invocation loop", () => {
  const transcriptHeaderSha256 = "a".repeat(64);

  test("counts a frozen execution observation without an SDK call", () => {
    expect(
      playerContinuationEvidence({
        transcriptHeaderSha256,
        observations: [
          {
            transcriptHeaderSha256,
            continuation: 1,
            kind: "executionError",
          },
        ],
        callContinuations: [],
      }),
    ).toEqual({
      tag: "valid",
      recordedContinuations: 1,
      lastContinuation: 1,
    });
  });

  test("admits a later call after a callless frozen observation", () => {
    expect(
      playerContinuationEvidence({
        transcriptHeaderSha256,
        observations: [
          { transcriptHeaderSha256, continuation: 1, kind: "executionError" },
          { transcriptHeaderSha256, continuation: 2, kind: "continue" },
        ],
        callContinuations: [2],
      }),
    ).toEqual({
      tag: "valid",
      recordedContinuations: 2,
      lastContinuation: 2,
    });
  });

  test("rejects calls without matching continuation observations", () => {
    expect(
      playerContinuationEvidence({
        transcriptHeaderSha256,
        observations: [],
        callContinuations: [1],
      }),
    ).toEqual({
      tag: "invalid",
      message: "Player continuation evidence is inconsistent.",
    });
  });

  test("rejects observations from another transcript", () => {
    expect(
      playerContinuationEvidence({
        transcriptHeaderSha256,
        observations: [
          {
            transcriptHeaderSha256: "b".repeat(64),
            continuation: 1,
            kind: "continue",
          },
        ],
        callContinuations: [1],
      }),
    ).toEqual({
      tag: "invalid",
      message: "Player continuation evidence is inconsistent.",
    });
  });

  test("owns deterministic invocation artifact names", () => {
    expect(playerInvocationArtifactNames(12)).toEqual({
      events: "player-invocation-0012.events.jsonl",
      log: "player-invocation-0012.log",
      finalMessage: "player-invocation-0012.final.txt",
    });
    expect(
      playerInvocationNumberFromEventsArtifact(
        "player-invocation-0012.events.jsonl",
      ),
    ).toBe(12);
    expect(
      playerInvocationNumberFromEventsArtifact("player-events.jsonl"),
    ).toBe(undefined);
    expect(
      playerInvocationNumberFromEventsArtifact(
        "player-invocation-10000.events.jsonl",
      ),
    ).toBe(10_000);
  });

  test("uses one invocation for each progressing continuation", () => {
    const states: PlayerEvidenceState[] = [
      { tag: "active", recordedContinuations: 0 },
      { tag: "active", recordedContinuations: 1 },
      { tag: "active", recordedContinuations: 1 },
      { tag: "concluded", recordedContinuations: 2 },
    ];
    const evidenceState = () => states.shift()!;

    expect(
      runPlayerInvocationLoop({
        evidenceState,
        invoke: () => ({ tag: "completed" }),
      }),
    ).toEqual({ tag: "concluded", invocationCount: 2 });
  });

  test("rejects a successful invocation that records no SDK evidence", () => {
    expect(
      runPlayerInvocationLoop({
        evidenceState: () => ({
          tag: "active",
          recordedContinuations: 0,
        }),
        invoke: () => ({ tag: "completed" }),
      }),
    ).toEqual({ tag: "noProgress", invocation: 1 });
  });

  test("rejects more than one continuation from one invocation", () => {
    const states: PlayerEvidenceState[] = [
      { tag: "active", recordedContinuations: 3 },
      { tag: "concluded", recordedContinuations: 5 },
    ];
    expect(
      runPlayerInvocationLoop({
        evidenceState: () => states.shift()!,
        invoke: () => ({ tag: "completed" }),
      }),
    ).toEqual({
      tag: "multipleContinuationsRecorded",
      invocation: 1,
      recordedContinuations: 2,
    });
  });

  test("continues after a failed process records one frozen continuation", () => {
    const states: PlayerEvidenceState[] = [
      { tag: "active", recordedContinuations: 0 },
      { tag: "active", recordedContinuations: 1 },
      { tag: "active", recordedContinuations: 1 },
      { tag: "concluded", recordedContinuations: 2 },
    ];
    const exits = [
      { tag: "exitedWithFailure", status: 1 } as const,
      { tag: "completed" } as const,
    ];
    expect(
      runPlayerInvocationLoop({
        evidenceState: () => states.shift()!,
        invoke: () => exits.shift()!,
      }),
    ).toEqual({ tag: "concluded", invocationCount: 2 });
  });

  test.each([
    [{ tag: "exitedWithFailure", status: 7 } as const],
    [{ tag: "signaled", signal: "SIGTERM" } as const],
    [{ tag: "failedToStart", message: "missing executable" } as const],
  ])("retains a failed invocation exit", (exit) => {
    expect(
      runPlayerInvocationLoop({
        evidenceState: () => ({
          tag: "active",
          recordedContinuations: 0,
        }),
        invoke: () => exit,
      }),
    ).toEqual({ tag: "invocationFailed", invocation: 1, exit });
  });

  test("stops at the invocation limit", () => {
    let recordedContinuations = 0;
    expect(
      runPlayerInvocationLoop({
        invocationLimit: 2,
        evidenceState: () => ({
          tag: "active",
          recordedContinuations,
        }),
        invoke: () => {
          recordedContinuations += 1;
          return { tag: "completed" };
        },
      }),
    ).toEqual({ tag: "invocationLimitReached", limit: 2 });
  });
});
