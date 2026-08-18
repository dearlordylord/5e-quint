import { describe, expect, test } from "vitest";

import { sha256Canonical } from "../transcript.ts";
import {
  PLAYER_TURN_PROJECTION_MAX_BYTES,
  PLAYER_TACTICAL_NOTE_MAX_BYTES,
  playerCurrentTurnProjection,
  playerInitialTurnProjection,
  projectPlayerSubject,
} from "./player-turn-projection.ts";

type Mutable<T> = T extends object
  ? { -readonly [Key in keyof T]: Mutable<T[Key]> }
  : T;

function mutableClone<T>(value: T): Mutable<T> {
  // structuredClone preserves this JSON fixture's shape; the cast removes only
  // compile-time readonly markers so tests can construct before/after states.
  return structuredClone(value) as Mutable<T>;
}

const beforeSession = {
  battle: {
    state: {
      initiative: { round: 2, stillToAct: [{ creature: "fighter" }] },
      subjectResolutionPhase: { kind: "subjectSelection" },
      combatants: {
        $map: [
          [
            "fighter",
            {
              hp: 10,
              maxHp: 10,
              tempHp: 0,
              conditions: { prone: false },
              reactionAvailable: true,
              movementSpentFeet: 0,
              zeroHpLifecycle: {
                policy: "usesDeathSavingThrows",
                deathSaves: {
                  deathSaves: { successes: 0, failures: 0 },
                  stable: false,
                  dead: false,
                  hpRegained: false,
                },
              },
              ammunitionStocks: [{ ammunition: "arrow", remaining: 2 }],
              origin: {
                kind: "character",
                resources: [
                  {
                    resourcePoolRef: "pool-1",
                    usesRemaining: 1,
                    usedThisTurn: false,
                  },
                ],
                execution: { resourcePools: [] },
                spellcasting: { spellSlots: [{ level: 1, remaining: 1 }] },
              },
            },
          ],
        ],
      },
      groundObjects: { $map: [] },
    },
  },
  battlefield: {
    space: { placements: [{ token: "fighter", coordinate: { x: 1, y: 1 } }] },
    objects: [
      {
        objectId: "door",
        armorClass: 12,
        damageDisposition: { kind: "hitPoints", hitPoints: 8 },
        traversal: "blocked",
        sight: "blocked",
        interveningCover: "total",
        ignoredProse: "must not enter player context",
      },
    ],
  },
} as const;

const attackProcedureRef = JSON.stringify({
  scopeRef: JSON.stringify({
    battleId: "battle",
    combatantId: "fighter",
    kind: "attackExecution",
    ordinal: 1,
  }),
  kind: "procedure",
  ordinal: 0,
});

describe("player current-turn projection", () => {
  test("projects the initial actionable act frontier before a recorded call", () => {
    const projected = playerInitialTurnProjection({
      session: beforeSession,
      acts: [
        {
          subject: {
            tag: "action",
            actorId: "fighter",
            action: "attack",
            procedureRef: attackProcedureRef,
          },
          label: "Attack",
          initialHoles: [
            {
              kind: "targetChoice",
              holeId: "battle:attack:target",
              holeInstanceKey: "battle:attack:target",
              label: "Attack target",
              choices: ["wolf"],
            },
          ],
        },
      ],
    });

    expect(projected).toMatchObject({
      tag: "valid",
      projection: {
        continuation: 0,
        callSequences: [],
        frontier: {
          kind: "acts",
          acts: [
            {
              label: "Attack",
              holes: [{ hole: { kind: "targetChoice", choices: ["wolf"] } }],
            },
          ],
        },
        changes: [],
      },
    });
  });

  test("keeps projected subjects discriminated by required protocol fields", () => {
    expect(projectPlayerSubject({ tag: "action", actorId: "fighter" })).toBe(
      undefined,
    );
    expect(
      projectPlayerSubject({ tag: "runtimeCommand", actorId: "fighter" }),
    ).toBeUndefined();
    expect(
      projectPlayerSubject({ tag: "actionSpell", actorId: "fighter" }),
    ).toBeUndefined();
    expect(
      projectPlayerSubject({
        tag: "unsupportedSubject",
        actorId: "fighter",
      }),
    ).toBeUndefined();
  });

  test("projects actionable holes with stable occurrences and material changes", () => {
    const afterSession = mutableClone(beforeSession);
    const fighter = afterSession.battle.state.combatants.$map[0][1];
    fighter.hp = 6;
    fighter.conditions.prone = true;
    fighter.reactionAvailable = false;
    fighter.movementSpentFeet = 10;
    fighter.ammunitionStocks[0].remaining = 1;
    fighter.origin.resources[0].usesRemaining = 0;
    fighter.origin.spellcasting.spellSlots[0].remaining = 0;
    afterSession.battlefield.space.placements[0].coordinate = { x: 2, y: 1 };
    afterSession.battlefield.objects[0].damageDisposition.hitPoints = 3;
    const result = {
      tag: "needsHoles",
      session: afterSession,
      subject: {
        tag: "action",
        actorId: "fighter",
        action: "dash",
        speedKind: "walk",
      },
      holes: [
        {
          kind: "targetChoice",
          holeId: "battle:attack:target",
          holeInstanceKey: "battle:attack:target",
          label: "Attack target",
          requiresTableSpatialFact: true,
          attack: {
            actorId: "fighter",
            selection: {
              procedureRef: attackProcedureRef,
              attackAbility: "str",
              attackDamageType: "bludgeoning",
            },
            targetConstraint: { kind: "meleeReach", reachFeet: 5 },
          },
          choices: ["enemy"],
        },
      ],
    };
    const call = {
      type: "sdk-call",
      seq: 7,
      continuation: 3,
      operation: "resolveBattleRuntimeSubject",
      inputSession: beforeSession,
      inputSessionSha256: sha256Canonical(beforeSession),
      input: { subject: { tag: "action", actorId: "fighter" }, fills: [] },
      outcome: "returned",
      outputSession: afterSession,
      outputSessionSha256: sha256Canonical(afterSession),
      result,
      resultSha256: sha256Canonical(result),
    } as const;

    const projection = playerCurrentTurnProjection({
      continuation: 3,
      calls: [call],
      beforeSession,
      afterSession,
      tacticalNote: "Continue the admitted attack.",
    });

    expect(projection).toMatchObject({
      tag: "valid",
      projection: {
        turn: { round: 2, actorId: "fighter", phase: "subjectSelection" },
        frontier: {
          kind: "holes",
          subject: {
            tag: "action",
            actorId: "fighter",
            action: "dash",
            speedKind: "walk",
          },
          holes: [
            {
              ref: expect.stringMatching(/^hole:[0-9a-f]{64}$/),
              hole: { kind: "targetChoice" },
            },
          ],
        },
        changes: [
          {
            kind: "combatant",
            id: "fighter",
            after: {
              hitPoints: { current: 6, maximum: 10, temporary: 0 },
              activeConditions: ["prone"],
              reactionAvailable: false,
              movementSpentFeet: 10,
              ammunition: [{ kind: "arrow", remaining: 1 }],
              resources: [
                {
                  ref: "pool-1",
                  usesRemaining: 0,
                  usedThisTurn: false,
                },
              ],
              spellSlots: [{ level: 1, remaining: 0 }],
            },
          },
          {
            kind: "object",
            id: "door",
            after: { damageDisposition: { kind: "hitPoints", hitPoints: 3 } },
          },
          { kind: "position", id: "fighter", after: { x: 2, y: 1 } },
        ],
      },
    });
    expect(JSON.stringify(projection)).not.toContain("ignoredProse");
    const repeated = playerCurrentTurnProjection({
      continuation: 4,
      calls: [{ ...call, seq: 8, continuation: 4 }],
      beforeSession,
      afterSession,
      tacticalNote: "",
    });
    expect(repeated.tag).toBe("valid");
    if (projection.tag === "valid" && repeated.tag === "valid") {
      expect(projection.projection.frontier).toMatchObject({ kind: "holes" });
      expect(repeated.projection.frontier).toMatchObject({ kind: "holes" });
      if (
        projection.projection.frontier.kind === "holes" &&
        repeated.projection.frontier.kind === "holes"
      ) {
        expect(repeated.projection.frontier.holes[0]?.ref).toBe(
          projection.projection.frontier.holes[0]?.ref,
        );
      }
    }
  });

  test("rejects a hole outside the typed projection boundary", () => {
    const result = {
      tag: "needsHoles",
      session: beforeSession,
      subject: {
        tag: "action",
        actorId: "fighter",
        action: "dash",
        speedKind: "walk",
      },
      holes: [{ kind: "rolledDice", arbitraryPayload: "not a BattleHole" }],
    };
    const call = {
      type: "sdk-call",
      seq: 1,
      continuation: 1,
      operation: "resolveBattleRuntimeSubject",
      inputSession: beforeSession,
      inputSessionSha256: sha256Canonical(beforeSession),
      input: { subject: result.subject, fills: [] },
      outcome: "returned",
      outputSession: beforeSession,
      outputSessionSha256: sha256Canonical(beforeSession),
      result,
      resultSha256: sha256Canonical(result),
    } as const;
    const malformedHoleProjection = playerCurrentTurnProjection({
      continuation: 1,
      calls: [call],
      beforeSession,
      afterSession: beforeSession,
      tacticalNote: "",
    });
    expect(malformedHoleProjection).toEqual({
      tag: "invalid",
      reason: "malformedProjectionSource",
      message:
        "The canonical session/result cannot be projected into the typed player turn contract.",
    });
    const missingChoices = {
      ...result,
      holes: [
        {
          kind: "targetChoice",
          holeId: "battle:target",
          holeInstanceKey: "battle:target",
          label: "Target",
        },
      ],
    };
    expect(
      playerCurrentTurnProjection({
        continuation: 1,
        calls: [
          {
            ...call,
            result: missingChoices,
            resultSha256: sha256Canonical(missingChoices),
          },
        ],
        beforeSession,
        afterSession: beforeSession,
        tacticalNote: "",
      }),
    ).toMatchObject({ tag: "invalid", reason: "malformedProjectionSource" });
    for (const malformedResult of [
      { ...result, holes: { kind: "rolledDice" } },
      { ...result, holes: undefined },
    ]) {
      const malformedCall = {
        ...call,
        result: malformedResult,
        resultSha256: sha256Canonical(malformedResult),
      };
      expect(
        playerCurrentTurnProjection({
          continuation: 1,
          calls: [malformedCall],
          beforeSession,
          afterSession: beforeSession,
          tacticalNote: "",
        }),
      ).toMatchObject({ tag: "invalid", reason: "malformedProjectionSource" });
    }
    const malformedDiscovery = {
      ...call,
      operation: "discoverBattleActs" as const,
      input: {},
      result: { subject: result.subject },
      resultSha256: sha256Canonical({ subject: result.subject }),
    };
    expect(
      playerCurrentTurnProjection({
        continuation: 1,
        calls: [malformedDiscovery],
        beforeSession,
        afterSession: beforeSession,
        tacticalNote: "",
      }),
    ).toMatchObject({ tag: "invalid", reason: "malformedProjectionSource" });
  });

  test("rejects an oversized tactical note instead of truncating it", () => {
    const projection = playerCurrentTurnProjection({
      continuation: 1,
      calls: [],
      beforeSession,
      afterSession: beforeSession,
      tacticalNote: "x".repeat(PLAYER_TACTICAL_NOTE_MAX_BYTES + 1),
    });
    expect(projection).toMatchObject({
      tag: "invalid",
      reason: "tacticalNoteTooLarge",
      maximumByteLength: PLAYER_TACTICAL_NOTE_MAX_BYTES,
    });
  });

  test("rejects an oversized semantic projection instead of truncating acts", () => {
    const result = [
      {
        subject: {
          tag: "runtimeCommand",
          actorId: "fighter",
          command: "endTurn",
        },
        label: "x".repeat(PLAYER_TURN_PROJECTION_MAX_BYTES),
        initialHoles: [],
      },
    ];
    const call = {
      type: "sdk-call",
      seq: 1,
      continuation: 1,
      operation: "discoverBattleActs",
      inputSession: beforeSession,
      inputSessionSha256: sha256Canonical(beforeSession),
      input: {},
      outcome: "returned",
      outputSession: beforeSession,
      outputSessionSha256: sha256Canonical(beforeSession),
      result,
      resultSha256: sha256Canonical(result),
    } as const;
    expect(
      playerCurrentTurnProjection({
        continuation: 1,
        calls: [call],
        beforeSession,
        afterSession: beforeSession,
        tacticalNote: "",
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "projectionTooLarge",
      maximumByteLength: PLAYER_TURN_PROJECTION_MAX_BYTES,
    });
  });

  test("rejects a missing or empty initiative still-to-act list", () => {
    const missingStillToAct = mutableClone(beforeSession);
    Reflect.deleteProperty(
      missingStillToAct.battle.state.initiative,
      "stillToAct",
    );
    expect(
      playerCurrentTurnProjection({
        continuation: 1,
        calls: [],
        beforeSession: missingStillToAct,
        afterSession: missingStillToAct,
        tacticalNote: "",
      }),
    ).toMatchObject({ tag: "invalid", reason: "malformedProjectionSource" });
    const emptyStillToAct = mutableClone(beforeSession);
    emptyStillToAct.battle.state.initiative.stillToAct = [];
    expect(
      playerCurrentTurnProjection({
        continuation: 1,
        calls: [],
        beforeSession: emptyStillToAct,
        afterSession: emptyStillToAct,
        tacticalNote: "",
      }),
    ).toMatchObject({ tag: "invalid", reason: "malformedProjectionSource" });
  });

  test("does not attach size metadata to malformed source failures", () => {
    const malformed = mutableClone(beforeSession);
    Reflect.deleteProperty(
      malformed.battle.state.subjectResolutionPhase,
      "kind",
    );
    const result = playerCurrentTurnProjection({
      continuation: 1,
      calls: [],
      beforeSession: malformed,
      afterSession: malformed,
      tacticalNote: "",
    });
    expect(result).toEqual({
      tag: "invalid",
      reason: "malformedProjectionSource",
      message:
        "The canonical session/result cannot be projected into the typed player turn contract.",
    });
    if (result.tag === "invalid") {
      expect("byteLength" in result).toBe(false);
      expect("maximumByteLength" in result).toBe(false);
    }
  });
});
