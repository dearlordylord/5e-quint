import { describe, expect, test } from "vitest";

import {
  PLAYER_CONTINUATION_LIMIT,
  playerContinuationAdmission,
  playerContinuationEvidence,
  playerInvocationNumberFromEventsArtifact,
} from "./player-continuation-evidence.ts";

describe("player continuation evidence", () => {
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

  test("rejects successful or terminal observations without an SDK call", () => {
    for (const kind of ["continue", "playerConcluded"] as const) {
      expect(
        playerContinuationEvidence({
          transcriptHeaderSha256,
          observations: [{ transcriptHeaderSha256, continuation: 1, kind }],
          callContinuations: [],
        }),
      ).toEqual({
        tag: "invalid",
        message: "Player continuation evidence is inconsistent.",
      });
    }
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

  test("admits through the trusted limit and rejects the next continuation", () => {
    expect(playerContinuationAdmission(PLAYER_CONTINUATION_LIMIT - 1)).toEqual({
      tag: "admitted",
    });
    expect(playerContinuationAdmission(PLAYER_CONTINUATION_LIMIT)).toEqual({
      tag: "limitReached",
      limit: PLAYER_CONTINUATION_LIMIT,
    });
  });

  test("parses retained multi-invocation event artifact names", () => {
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
});
