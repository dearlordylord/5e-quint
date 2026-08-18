import { describe, expect, test } from "vitest";

import {
  directFrontierUseChecks,
  fixedBaselineEntityResourceFactAudit,
  fixedBaselineRunEvidencePaths,
  retainedProgramSessionAudit,
} from "./fixed-baseline-measurement.ts";
import type {
  PlayerCombatantProjection,
  PlayerCurrentTurnProjection,
} from "./sdk-player/player-turn-projection.ts";

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

function resourceRef(combatantId: string, ordinal: number): string {
  return JSON.stringify({
    scopeRef: JSON.stringify({ combatantId }),
    ordinal,
  });
}

function combatant(
  current: number,
  zeroHitPointLifecycle: PlayerCombatantProjection["zeroHitPointLifecycle"],
  resources: readonly [string, number][] = [],
): PlayerCombatantProjection {
  return {
    hitPoints: { current, maximum: 10, temporary: 0 },
    activeConditions: [],
    reactionAvailable: true,
    movementSpentFeet: 0,
    ammunition: [],
    resources: resources.map(([combatantId, ordinal]) => ({
      ref: resourceRef(combatantId, ordinal),
      usesRemaining: 0,
      usedThisTurn: false,
    })),
    spellSlots: [],
    zeroHitPointLifecycle,
  };
}

function fixedFactProjection(): PlayerCurrentTurnProjection {
  const living = {
    policy: "usesDeathSavingThrows",
    successes: 0,
    failures: 0,
    stable: false,
    dead: false,
    hitPointsRegained: false,
  } as const;
  return {
    ...projection(1, { kind: "none" }),
    changes: [
      ...["wolf-a", "wolf-b", "goblin-warrior-a"].map((id) => ({
        kind: "combatant" as const,
        id,
        change: "added" as const,
        after: combatant(0, { policy: "diesAtZeroHp" }),
      })),
      {
        kind: "combatant",
        id: "close-interception-fighter",
        change: "added",
        after: combatant(6, living, [
          ["close-interception-fighter", 0],
          ["close-interception-fighter", 3],
        ]),
      },
      {
        kind: "combatant",
        id: "close-interception-rogue",
        change: "added",
        after: combatant(1, living, [
          ["close-interception-rogue", 0],
          ["close-interception-rogue", 2],
        ]),
      },
    ],
  };
}

describe("fixed baseline omission audit", () => {
  test("derives the immutable program artifacts from the exact retained transcript", () => {
    expect(
      fixedBaselineRunEvidencePaths(
        "scripts/raw-swarm/out/generated-battle-004-sdk-player/evidence/sdk-calls.jsonl",
      ),
    ).toMatchObject({
      programPath: expect.stringMatching(
        /generated-battle-004-sdk-player\/evidence\/program\.ts$/,
      ),
      frozenPrefixPath: expect.stringMatching(/evidence\/frozen-prefix\.json$/),
      finalResultPath: expect.stringMatching(/evidence\/final\.json$/),
    });
    expect(() =>
      fixedBaselineRunEvidencePaths(
        "scripts/raw-swarm/out/substituted/evidence/sdk-calls.jsonl",
      ),
    ).toThrow("requires the retained run-4 transcript");
  });

  test("proves every retained final entity and resource fact", () => {
    const initialSession = {
      battlefield: {
        objects: [
          {
            objectId: "calibration-prism",
            damageDisposition: { kind: "hitPoints", hitPoints: 16 },
          },
        ],
      },
    };
    const projectionWithFacts = fixedFactProjection();
    expect(
      fixedBaselineEntityResourceFactAudit({
        initialSession,
        projections: [projectionWithFacts],
      }),
    ).toEqual({ total: 10, projectedChanges: 9, retainedInitialFacts: 1 });
    const withoutTerminalWolf = {
      ...projectionWithFacts,
      changes: projectionWithFacts.changes.filter(
        (change) => change.kind !== "combatant" || change.id !== "wolf-a",
      ),
    };
    expect(() =>
      fixedBaselineEntityResourceFactAudit({
        initialSession,
        projections: [withoutTerminalWolf],
      }),
    ).toThrow("omits the final wolf-a life-state fact");
  });

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
