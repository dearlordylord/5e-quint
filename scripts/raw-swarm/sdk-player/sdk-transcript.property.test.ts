import fc from "fast-check";
import { describe, expect, test } from "vitest";

import { sha256Canonical } from "../transcript.ts";
import {
  parseSdkTranscript,
  SDK_SESSION_CONFLICT_MESSAGE,
} from "./sdk-transcript.ts";

const jsonValue = fc.letrec((tie) => ({
  value: fc.oneof(
    fc.constant(null),
    fc.boolean(),
    fc.double({ noNaN: true, noDefaultInfinity: true }),
    fc.string({ maxLength: 30 }),
    fc.array(tie("value"), { maxLength: 4 }),
    fc.dictionary(fc.string({ maxLength: 12 }), tie("value"), {
      maxKeys: 4,
    }),
  ),
})).value;

const header = {
  type: "sdk-player-header",
  scenarioId: "property-scenario",
  gitSha: "a".repeat(40),
  startedAt: "2026-08-12T12:00:00.000Z",
  consumerIsolation: "permissionProfile",
  replaySupervisorSha256: "b".repeat(64),
  scenarioSha256: "d".repeat(64),
  scenarioReviewSha256: "e".repeat(64),
  charactersSha256: "f".repeat(64),
  characterOutcome: "ready",
  characterSheets: [],
  characterSheetsSha256: sha256Canonical([]),
  characterObservation: { characters: "property" },
  setupSha256: "c".repeat(64),
  setupOutcome: "ready",
  initialSession: { step: 0 },
  initialSessionSha256: sha256Canonical({ step: 0 }),
  setupObservation: { setup: "property" },
} as const;

describe("SDK player transcript boundary", () => {
  test("accepts a terminal character-composition obstruction", () => {
    const characterObstruction = {
      type: "sdk-player-header",
      scenarioId: "property-scenario",
      gitSha: "a".repeat(40),
      startedAt: "2026-08-12T12:00:00.000Z",
      consumerIsolation: "instructionalFallback",
      replaySupervisorSha256: "b".repeat(64),
      scenarioSha256: "d".repeat(64),
      scenarioReviewSha256: "e".repeat(64),
      charactersSha256: "f".repeat(64),
      characterOutcome: "obstructed",
      characterObservation: { missing: "supported-character-choice" },
      obstruction: "A required canonical Character Sheet cannot be completed.",
    } as const;

    expect(parseSdkTranscript([characterObstruction])).toMatchObject({
      tag: "valid",
      value: {
        header: { characterOutcome: "obstructed" },
        calls: [],
      },
    });
    expect(parseSdkTranscript([characterObstruction, {}]).tag).toBe("invalid");
  });

  test("accepts every canonical sequential discover-call stream", () => {
    fc.assert(
      fc.property(fc.array(jsonValue, { maxLength: 20 }), (results) => {
        const calls = results.map((result, index) => {
          const session = { step: 0 };
          return {
            type: "sdk-call",
            seq: index + 1,
            continuation: index + 1,
            operation: "discoverBattleActs",
            outcome: "returned",
            inputSession: session,
            inputSessionSha256: sha256Canonical(session),
            input: {},
            outputSession: session,
            outputSessionSha256: sha256Canonical(session),
            result,
            resultSha256: sha256Canonical(result),
          };
        });

        expect(parseSdkTranscript([header, ...calls])).toMatchObject({
          tag: "valid",
          value: { calls },
        });
      }),
      { numRuns: 100 },
    );
  });

  test("rejects arbitrary result tampering and sequence gaps", () => {
    fc.assert(
      fc.property(
        jsonValue,
        fc.integer({ min: 2, max: 100 }),
        (result, seq) => {
          const call = {
            type: "sdk-call",
            seq,
            continuation: 1,
            operation: "discoverBattleActs",
            outcome: "returned",
            inputSession: {},
            inputSessionSha256: "1".repeat(64),
            input: {},
            outputSession: {},
            outputSessionSha256: "1".repeat(64),
            result,
            resultSha256: "0".repeat(64),
          };

          expect(parseSdkTranscript([header, call]).tag).toBe("invalid");
        },
      ),
      { numRuns: 100 },
    );
  });

  test("rejects false continuation provenance", () => {
    const result = { available: true };
    const session = { step: 1 };
    const call = (seq: number, continuation: number) => ({
      type: "sdk-call",
      seq,
      continuation,
      operation: "discoverBattleActs",
      outcome: "returned",
      inputSession: session,
      inputSessionSha256: sha256Canonical(session),
      input: {},
      outputSession: session,
      outputSessionSha256: sha256Canonical(session),
      result,
      resultSha256: sha256Canonical(result),
    });

    expect(parseSdkTranscript([header, call(1, 2)]).tag).toBe("invalid");
    expect(parseSdkTranscript([header, call(1, 1), call(2, 3)]).tag).toBe(
      "invalid",
    );
    expect(
      parseSdkTranscript([header, call(1, 1), call(2, 2), call(3, 1)]).tag,
    ).toBe("invalid");
  });

  test("binds the first call to the setup session", () => {
    const foreignSession = { step: 1 };
    const call = {
      type: "sdk-call",
      seq: 1,
      continuation: 1,
      operation: "discoverBattleActs",
      outcome: "returned",
      inputSession: foreignSession,
      inputSessionSha256: sha256Canonical(foreignSession),
      input: {},
      outputSession: foreignSession,
      outputSessionSha256: sha256Canonical(foreignSession),
      result: [],
      resultSha256: sha256Canonical([]),
    };

    expect(parseSdkTranscript([header, call]).tag).toBe("invalid");
    expect(
      parseSdkTranscript([{ ...header, initialSession: new Map() }]).tag,
    ).toBe("invalid");
  });

  test("retains the replay cursor across recorded call failures", () => {
    const initialSession = { step: 0 };
    const advancedSession = { step: 1 };
    const foreignSession = { step: 99 };
    const returned = {
      type: "sdk-call",
      seq: 1,
      continuation: 1,
      operation: "endBattleRuntimeTurn",
      outcome: "returned",
      inputSession: initialSession,
      inputSessionSha256: sha256Canonical(initialSession),
      input: { actorId: "goblin", fills: [] },
      outputSession: advancedSession,
      outputSessionSha256: sha256Canonical(advancedSession),
      result: { tag: "resolved" },
      resultSha256: sha256Canonical({ tag: "resolved" }),
    };
    const rejected = {
      type: "sdk-call",
      seq: 2,
      continuation: 2,
      operation: "discoverBattleActs",
      outcome: "threw",
      rejection: "sessionConflict",
      inputSession: foreignSession,
      inputSessionSha256: sha256Canonical(foreignSession),
      input: {},
      error: { name: "Error", message: SDK_SESSION_CONFLICT_MESSAGE },
    };
    const recovered = {
      type: "sdk-call",
      seq: 3,
      continuation: 3,
      operation: "discoverBattleActs",
      outcome: "returned",
      inputSession: advancedSession,
      inputSessionSha256: sha256Canonical(advancedSession),
      input: {},
      outputSession: advancedSession,
      outputSessionSha256: sha256Canonical(advancedSession),
      result: [],
      resultSha256: sha256Canonical([]),
    };

    expect(
      parseSdkTranscript([header, returned, rejected, recovered]).tag,
    ).toBe("valid");
  });
});
