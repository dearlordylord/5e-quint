import { describe, expect, test } from "vitest";

import {
  directFrontierUseChecks,
  retainedProgramSessionAudit,
} from "./fixed-baseline-measurement.ts";
import type { PlayerCurrentTurnProjection } from "./sdk-player/player-turn-projection.ts";

const subject = {
  tag: "runtimeCommand",
  actorId: "fighter",
  command: "endTurn",
} as const;

function projection(
  continuation: number,
  frontier: PlayerCurrentTurnProjection["frontier"],
): PlayerCurrentTurnProjection {
  return {
    schemaVersion: 1,
    continuation,
    callSequences: [],
    turn: { round: 1, actorId: "fighter", phase: "subjectSelection" },
    frontier,
    changes: [],
  };
}

function returnedCall(
  continuation: number,
  seq: number,
  input: Record<string, unknown>,
): Parameters<typeof directFrontierUseChecks>[0]["calls"][number] {
  return {
    type: "sdk-call",
    seq,
    continuation,
    operation: "resolveBattleRuntimeSubject",
    inputSession: {},
    inputSessionSha256: "a".repeat(64),
    input,
    outcome: "returned",
    outputSession: {},
    outputSessionSha256: "b".repeat(64),
    result: { tag: "resolved" },
    resultSha256: "c".repeat(64),
  };
}

describe("fixed baseline omission audit", () => {
  test("distinguishes projected tactical reads from discarded observation copies", () => {
    expect(
      retainedProgramSessionAudit(`
        const phase = context.session.battle.state.subjectResolutionPhase;
        return {
          kind: "continue",
          session: context.session,
          observation: {
            battle: context.session.battle,
            battlefield: context.session.battlefield,
          },
        };
      `),
    ).toEqual({
      subjectResolutionPhaseReferences: 1,
      discardedFullObservationCopies: 2,
      unsupportedSessionReferences: [],
    });
    expect(
      retainedProgramSessionAudit(
        "const hidden = context.session.battle.state.combatants;",
      ),
    ).toMatchObject({
      unsupportedSessionReferences: ["context.session.battle.state.combatants"],
    });
  });

  test("checks every retained next continuation instead of a fixed count", () => {
    const calls = [
      returnedCall(2, 1, { subject, fills: [] }),
      returnedCall(3, 2, { subject, fills: [] }),
    ];
    const acts = [
      {
        ref: "subject:fighter" as const,
        subject,
        holes: [],
      },
    ];
    expect(
      directFrontierUseChecks({
        calls,
        projections: [
          projection(1, { kind: "acts", acts }),
          projection(2, { kind: "acts", acts }),
        ],
      }),
    ).toBe(2);
  });

  test("checks act holes and selected fill values", () => {
    const targetHole = {
      ref: "hole:target" as const,
      hole: {
        kind: "targetChoice",
        holeId: "battle:target",
        holeInstanceKey: "battle:target",
        label: "Target",
        choices: ["wolf"],
      },
    };
    const attackSubject = {
      tag: "action",
      actorId: "fighter",
      action: "attack",
    } as const;
    const act = {
      ref: "subject:attack" as const,
      subject: attackSubject,
      holes: [targetHole],
    };
    const badFill = returnedCall(2, 1, {
      subject: attackSubject,
      fills: [
        {
          kind: "targetChoice",
          holeId: "battle:target",
          value: "goblin",
        },
      ],
    });
    expect(() =>
      directFrontierUseChecks({
        calls: [badFill],
        projections: [projection(1, { kind: "acts", acts: [act] })],
      }),
    ).toThrow("outside the projected choices");
    const missingFill = returnedCall(2, 1, {
      subject: attackSubject,
      fills: [],
    });
    expect(() =>
      directFrontierUseChecks({
        calls: [missingFill],
        projections: [projection(1, { kind: "acts", acts: [act] })],
      }),
    ).toThrow("omitted a required hole family");
  });
});
