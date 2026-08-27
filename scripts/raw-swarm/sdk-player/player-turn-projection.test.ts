import fc from "fast-check";
import { describe, expect, test } from "vitest";

import { sha256Canonical } from "../transcript.ts";
import {
  PLAYER_TURN_PROJECTION_MAX_BYTES,
  PLAYER_TACTICAL_NOTE_MAX_BYTES,
  playerCurrentTurnProjection,
  playerInitialTurnProjection,
  projectPlayerActs,
  projectPlayerSubject,
} from "./player-turn-projection.ts";
import type { JsonValue } from "./continuation-contract.ts";
import type { SdkCallRecord } from "./sdk-transcript.ts";

type Mutable<T> = T extends object
  ? { -readonly [Key in keyof T]: Mutable<T[Key]> }
  : T;

function mutableClone<T>(value: T): Mutable<T> {
  // structuredClone preserves this JSON fixture's shape; the cast removes only
  // compile-time readonly markers so tests can construct before/after states.
  return structuredClone(value) as Mutable<T>;
}

const resourcePoolRef = (ordinal: number): string =>
  JSON.stringify({
    scopeRef: JSON.stringify({
      battleId: "battle",
      combatantId: "fighter",
      kind: "characterExecution",
      ordinal: 0,
    }),
    kind: "resourcePool",
    ordinal,
  });

const resourcePoolRefs = {
  initial: resourcePoolRef(0),
  limited: resourcePoolRef(1),
  unlimited: resourcePoolRef(2),
  pointPool: resourcePoolRef(3),
  daily: resourcePoolRef(4),
  recharge: resourcePoolRef(5),
  rest: resourcePoolRef(6),
  legendary: resourcePoolRef(7),
} as const;

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
                    resourcePoolRef: resourcePoolRefs.initial,
                    resource: {
                      kind: "use_count",
                      cap: { kind: "fixed", uses: 1 },
                    },
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
    spatial: {
      kind: "geometryDerived",
      arena: {},
      space: { placements: [{ token: "fighter", coordinate: { x: 1, y: 1 } }] },
      tableAuthoredDecisions: [],
    },
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

function discoverBattleActsCall(
  before: JsonValue,
  after: JsonValue,
): SdkCallRecord {
  const result: readonly [] = [];
  return {
    type: "sdk-call",
    seq: 1,
    continuation: 1,
    operation: "discoverBattleActs",
    inputSession: before,
    inputSessionSha256: sha256Canonical(before),
    input: {},
    outcome: "returned",
    outputSession: after,
    outputSessionSha256: sha256Canonical(after),
    result,
    resultSha256: sha256Canonical(result),
  };
}

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
  test("projects limited, unlimited, and point-pool character resources", () => {
    const before = mutableClone(beforeSession);
    const after = mutableClone(beforeSession);
    const beforeFighter = before.battle.state.combatants.$map[0][1];
    const afterFighter = after.battle.state.combatants.$map[0][1];
    Object.assign(beforeFighter.origin, {
      resources: [
        {
          resourcePoolRef: resourcePoolRefs.limited,
          resource: {
            kind: "use_count",
            cap: { kind: "fixed", uses: 2 },
          },
          usesRemaining: 2,
          usedThisTurn: false,
        },
        {
          resourcePoolRef: resourcePoolRefs.unlimited,
          resource: {
            kind: "use_count",
            cap: { kind: "unlimited" },
          },
          usedThisTurn: false,
        },
        {
          resourcePoolRef: resourcePoolRefs.pointPool,
          resource: {
            kind: "point_pool",
            poolId: "sorcery-points",
            cap: { kind: "fixed", uses: 3 },
          },
          pointsRemaining: 3,
        },
      ],
    });
    Object.assign(afterFighter.origin, {
      resources: [
        {
          resourcePoolRef: resourcePoolRefs.limited,
          resource: {
            kind: "use_count",
            cap: { kind: "fixed", uses: 2 },
          },
          usesRemaining: 1,
          usedThisTurn: true,
        },
        {
          resourcePoolRef: resourcePoolRefs.unlimited,
          resource: {
            kind: "use_count",
            cap: { kind: "unlimited" },
          },
          usedThisTurn: true,
        },
        {
          resourcePoolRef: resourcePoolRefs.pointPool,
          resource: {
            kind: "point_pool",
            poolId: "sorcery-points",
            cap: { kind: "fixed", uses: 3 },
          },
          pointsRemaining: 1,
        },
      ],
    });

    expect(
      playerCurrentTurnProjection({
        continuation: 1,
        calls: [discoverBattleActsCall(before, after)],
        beforeSession: before,
        afterSession: after,
        tacticalNote: "",
      }),
    ).toMatchObject({
      tag: "valid",
      projection: {
        changes: [
          {
            kind: "combatant",
            id: "fighter",
            after: {
              resources: [
                {
                  ref: resourcePoolRefs.limited,
                  usage: "limited",
                  usesRemaining: 1,
                  usedThisTurn: true,
                },
                {
                  ref: resourcePoolRefs.unlimited,
                  usage: "unlimited",
                  usedThisTurn: true,
                },
                {
                  ref: resourcePoolRefs.pointPool,
                  usage: "pointPool",
                  pointsRemaining: 1,
                },
              ],
            },
          },
        ],
      },
    });

    const malformed = mutableClone(after);
    const malformedPointPool =
      malformed.battle.state.combatants.$map[0][1].origin.resources[2];
    Object.assign(malformedPointPool, { usedThisTurn: false });
    expect(
      playerCurrentTurnProjection({
        continuation: 1,
        calls: [discoverBattleActsCall(before, malformed)],
        beforeSession: before,
        afterSession: malformed,
        tacticalNote: "",
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "The canonical session/result cannot be projected into the typed player turn contract.",
    });
  });

  test("projects every canonical combatant resource variant without conflating their state", () => {
    const before = mutableClone(beforeSession);
    const after = mutableClone(beforeSession);
    const beforeFighter = before.battle.state.combatants.$map[0][1];
    const afterFighter = after.battle.state.combatants.$map[0][1];
    beforeFighter.origin = {
      kind: "statBlock",
      execution: {
        resourcePools: [
          {
            resourcePoolRef: resourcePoolRefs.daily,
            kind: "daily",
            usesMax: 3,
            usesRemaining: 3,
          },
          {
            resourcePoolRef: resourcePoolRefs.recharge,
            kind: "recharge",
            minimumRoll: 5,
            available: false,
          },
          {
            resourcePoolRef: resourcePoolRefs.rest,
            kind: "recharge_after_rest",
            available: false,
          },
          {
            resourcePoolRef: resourcePoolRefs.legendary,
            kind: "legendaryActions",
            usesMax: 3,
            usesRemaining: 3,
          },
        ],
      },
    };
    afterFighter.origin = {
      kind: "statBlock",
      execution: {
        resourcePools: [
          {
            resourcePoolRef: resourcePoolRefs.daily,
            kind: "daily",
            usesMax: 3,
            usesRemaining: 2,
          },
          {
            resourcePoolRef: resourcePoolRefs.recharge,
            kind: "recharge",
            minimumRoll: 5,
            available: true,
          },
          {
            resourcePoolRef: resourcePoolRefs.rest,
            kind: "recharge_after_rest",
            available: true,
          },
          {
            resourcePoolRef: resourcePoolRefs.legendary,
            kind: "legendaryActions",
            usesMax: 3,
            usesRemaining: 2,
          },
        ],
      },
    };

    const projection = playerCurrentTurnProjection({
      continuation: 1,
      calls: [discoverBattleActsCall(before, after)],
      beforeSession: before,
      afterSession: after,
      tacticalNote: "",
    });

    expect(projection).toMatchObject({
      tag: "valid",
      projection: {
        changes: [
          {
            kind: "combatant",
            id: "fighter",
            after: {
              resources: [
                {
                  ref: resourcePoolRefs.daily,
                  kind: "daily",
                  usesMax: 3,
                  usesRemaining: 2,
                },
                {
                  ref: resourcePoolRefs.recharge,
                  kind: "recharge",
                  minimumRoll: 5,
                  available: true,
                },
                {
                  ref: resourcePoolRefs.rest,
                  kind: "recharge_after_rest",
                  available: true,
                },
                {
                  ref: resourcePoolRefs.legendary,
                  kind: "legendaryActions",
                  usesMax: 3,
                  usesRemaining: 2,
                },
              ],
            },
          },
        ],
      },
    });

    for (const malformedResource of [
      {
        resourcePoolRef: resourcePoolRefs.daily,
        kind: "daily",
        usesMax: -1,
        usesRemaining: -2,
      },
      {
        resourcePoolRef: resourcePoolRefs.daily,
        kind: "daily",
        usesMax: 1,
        usesRemaining: 2,
      },
      {
        resourcePoolRef: resourcePoolRefs.recharge,
        kind: "recharge",
        minimumRoll: 7,
        available: true,
      },
      {
        resourcePoolRef: "not-a-canonical-resource-ref",
        kind: "recharge_after_rest",
        available: true,
      },
    ] as const) {
      const malformed = mutableClone(after);
      malformed.battle.state.combatants.$map[0][1].origin = {
        kind: "statBlock",
        execution: { resourcePools: [malformedResource] },
      };
      expect(
        playerCurrentTurnProjection({
          continuation: 1,
          calls: [discoverBattleActsCall(before, malformed)],
          beforeSession: before,
          afterSession: malformed,
          tacticalNote: "",
        }),
      ).toMatchObject({ tag: "invalid" });
    }

    const duplicate = mutableClone(after);
    duplicate.battle.state.combatants.$map[0][1].origin = {
      kind: "statBlock",
      execution: {
        resourcePools: [
          afterFighter.origin.execution.resourcePools[0],
          afterFighter.origin.execution.resourcePools[0],
        ],
      },
    };
    expect(
      playerCurrentTurnProjection({
        continuation: 1,
        calls: [],
        beforeSession: before,
        afterSession: duplicate,
        tacticalNote: "",
      }),
    ).toMatchObject({ tag: "invalid" });
  });

  test("projects recharge-roll targets exactly and rejects unknown hole kinds", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: 0, max: 100 }), {
          minLength: 1,
        }),
        (ordinals) => {
          const scopeRef = JSON.stringify({
            battleId: "battle",
            combatantId: "fighter",
            kind: "statBlockExecution",
            ordinal: 0,
          });
          const rechargeTargets = ordinals.map((ordinal) =>
            JSON.stringify({
              scopeRef,
              kind: "resourcePool",
              ordinal,
            }),
          );
          const acts = projectPlayerActs([
            {
              subject: {
                tag: "runtimeCommand",
                actorId: "fighter",
                command: "startTurn",
              },
              initialHoles: [
                {
                  kind: "statBlockRechargeRoll",
                  holeId: "battle:recharge",
                  holeInstanceKey: "battle:recharge",
                  label: "Roll recharge dice",
                  combatantId: "fighter",
                  rechargeTargets,
                },
              ],
            },
          ]);
          expect(acts?.[0]?.holes[0]?.hole).toMatchObject({
            kind: "statBlockRechargeRoll",
            combatantId: "fighter",
            rechargeTargets,
          });
        },
      ),
    );

    expect(
      projectPlayerActs([
        {
          subject: {
            tag: "runtimeCommand",
            actorId: "fighter",
            command: "startTurn",
          },
          initialHoles: [
            {
              kind: "futureHole",
              holeId: "battle:future",
              holeInstanceKey: "battle:future",
              label: "Unsupported future hole",
            },
          ],
        },
      ]),
    ).toBeUndefined();
    expect(
      projectPlayerActs([
        {
          subject: {
            tag: "runtimeCommand",
            actorId: "fighter",
            command: "startTurn",
          },
          initialHoles: [
            {
              kind: "statBlockRechargeRoll",
              holeId: "battle:recharge",
              holeInstanceKey: "battle:recharge",
              label: "Roll recharge dice",
              combatantId: "fighter",
              rechargeTargets: [],
              unadmittedFuturePayload: true,
            },
          ],
        },
      ]),
    ).toBeUndefined();
    const duplicateHole = {
      kind: "targetChoice",
      holeId: "battle:target",
      holeInstanceKey: "battle:target",
      label: "Target",
      choices: ["wolf"],
    } as const;
    expect(
      projectPlayerActs([
        {
          subject: {
            tag: "runtimeCommand",
            actorId: "fighter",
            command: "startTurn",
          },
          initialHoles: [duplicateHole, duplicateHole],
        },
      ]),
    ).toBeUndefined();
  });

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
    afterSession.battlefield.spatial.space.placements[0].coordinate = {
      x: 2,
      y: 1,
    };
    afterSession.battlefield.objects[0].damageDisposition.hitPoints = 3;
    const resultSubject = {
      tag: "action",
      actorId: "fighter",
      action: "dash",
      speedKind: "walk",
    } as const;
    const result = {
      tag: "needsHoles",
      session: afterSession,
      envelope: {
        checkpoint: {},
        frontier: {
          kind: "holes",
          subject: resultSubject,
          continuation: { kind: "ordinaryReplay" },
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
        },
      },
    };
    const call = {
      type: "sdk-call",
      seq: 7,
      continuation: 3,
      operation: "resolveBattleRuntimeSubject",
      inputSession: beforeSession,
      inputSessionSha256: sha256Canonical(beforeSession),
      input: { subject: resultSubject, fills: [] },
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
                  ref: resourcePoolRefs.initial,
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
    const resultSubject = {
      tag: "action",
      actorId: "fighter",
      action: "dash",
      speedKind: "walk",
    } as const;
    const result = {
      tag: "needsHoles",
      session: beforeSession,
      envelope: {
        checkpoint: {},
        frontier: {
          kind: "holes",
          subject: resultSubject,
          continuation: { kind: "ordinaryReplay" },
          holes: [{ kind: "rolledDice", arbitraryPayload: "not a BattleHole" }],
        },
      },
    };
    const call = {
      type: "sdk-call",
      seq: 1,
      continuation: 1,
      operation: "resolveBattleRuntimeSubject",
      inputSession: beforeSession,
      inputSessionSha256: sha256Canonical(beforeSession),
      input: { subject: resultSubject, fills: [] },
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
      envelope: {
        ...result.envelope,
        frontier: {
          ...result.envelope.frontier,
          holes: [
            {
              kind: "targetChoice",
              holeId: "battle:target",
              holeInstanceKey: "battle:target",
              label: "Target",
            },
          ],
        },
      },
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
      {
        ...result,
        envelope: {
          ...result.envelope,
          frontier: {
            ...result.envelope.frontier,
            holes: { kind: "rolledDice" },
          },
        },
      },
      {
        ...result,
        envelope: {
          ...result.envelope,
          frontier: { ...result.envelope.frontier, holes: undefined },
        },
      },
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
      result: { subject: resultSubject },
      resultSha256: sha256Canonical({ subject: resultSubject }),
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

  test("preserves a returned battle rejection as the actionable frontier", () => {
    const result = {
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Attack roll relationship facts do not match a requested attack-roll decision.",
      session: beforeSession,
      envelope: {
        checkpoint: {},
        frontier: { kind: "acts", acts: [] },
      },
    } as const;
    const call = {
      type: "sdk-call",
      seq: 1,
      continuation: 1,
      operation: "resolveBattleRuntimeSubject",
      inputSession: beforeSession,
      inputSessionSha256: sha256Canonical(beforeSession),
      input: {
        subject: { tag: "action", actorId: "fighter", action: "attack" },
        fills: [],
      },
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
        tacticalNote: "The attempted attack was rejected.",
      }),
    ).toMatchObject({
      tag: "valid",
      projection: {
        frontier: {
          kind: "rejected",
          rejection: {
            tag: "invalid",
            reason: "invalidFill",
            message:
              "Attack roll relationship facts do not match a requested attack-roll decision.",
          },
        },
      },
    });
  });

  test("preserves canonical scenario rejections and rejects unknown conflicts", () => {
    const project = (result: {
      readonly tag: string;
      readonly message?: string;
      readonly issue?: Readonly<Record<string, string | number>>;
    }) =>
      playerCurrentTurnProjection({
        continuation: 1,
        calls: [
          {
            type: "sdk-call",
            seq: 1,
            continuation: 1,
            operation: "resolveScenarioMovement",
            inputSession: beforeSession,
            inputSessionSha256: sha256Canonical(beforeSession),
            input: { kind: "continue", fills: [] },
            outcome: "returned",
            outputSession: beforeSession,
            outputSessionSha256: sha256Canonical(beforeSession),
            result,
            resultSha256: sha256Canonical(result),
          },
        ],
        beforeSession,
        afterSession: beforeSession,
        tacticalNote: "",
      });

    expect(
      project({
        tag: "scenarioMovementRejected",
        message: "The route enters an unsupported occupied square.",
      }),
    ).toMatchObject({
      tag: "valid",
      projection: {
        frontier: {
          kind: "rejected",
          rejection: {
            tag: "scenarioMovementRejected",
            message: "The route enters an unsupported occupied square.",
          },
        },
      },
    });
    expect(
      project({
        tag: "scenarioSessionConflict",
        issue: {
          tag: "battle-lineage-conflict",
          expectedBattleId: "expected-battle",
          receivedBattleId: "received-battle",
          message: "The returned battle has a different lineage.",
        },
      }),
    ).toMatchObject({
      tag: "valid",
      projection: {
        frontier: {
          kind: "rejected",
          rejection: {
            tag: "scenarioSessionConflict",
            issue: {
              tag: "battle-lineage-conflict",
              expectedBattleId: "expected-battle",
              receivedBattleId: "received-battle",
              message: "The returned battle has a different lineage.",
            },
          },
        },
      },
    });
    expect(
      project({
        tag: "scenarioSessionConflict",
        issue: { tag: "invented", message: "Unknown conflict." },
      }),
    ).toMatchObject({ tag: "invalid", reason: "malformedProjectionSource" });
    for (const issue of [
      {
        tag: "battle-lineage-conflict",
        expectedBattleId: "",
        receivedBattleId: "received-battle",
        message: "Blank expected battle id.",
      },
      {
        tag: "battle-lineage-conflict",
        expectedBattleId: "expected-battle",
        receivedBattleId: "   ",
        message: "Blank received battle id.",
      },
      {
        tag: "unknown-object-damage",
        objectId: "",
        message: "Blank object id.",
      },
      {
        tag: "object-damage-state-conflict",
        objectId: "object-1",
        outcomePriorHitPoints: -1,
        message: "Negative prior hit points.",
      },
      {
        tag: "object-damage-state-conflict",
        objectId: "object-1",
        outcomePriorHitPoints: 1.5,
        message: "Fractional prior hit points.",
      },
    ] as const) {
      expect(project({ tag: "scenarioSessionConflict", issue })).toMatchObject({
        tag: "invalid",
        reason: "malformedProjectionSource",
      });
    }
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
