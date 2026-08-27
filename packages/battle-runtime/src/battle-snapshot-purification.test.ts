import { Schema } from "effect";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";
import {
  currentInterruptCheckpoint,
  pendingInterruptSnapshot,
} from "./battle-reducer/battle-snapshot.ts";
import {
  BattleSnapshotSchema,
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  battleId,
  combatantId,
  fighterVsGoblinBattle,
  fighterAttackSubject,
  fighterTurnWithReadiedRay,
  characterSeed,
  goblinId,
  interruptDecisionFill,
  resolveBattleInterrupt,
  resolveBattleSubject,
  skeletonId,
  startBattleRight,
  snapshotBattle,
  statBlockCreatureInit,
  targetFill,
  wizardId,
} from "./battle-runtime.test-support.ts";

describe("BattleSnapshot durable checkpoint", () => {
  test("projects the current turn Bonus Action quota without discovering an ordinary action", () => {
    const snapshot = snapshotBattle(
      startBattleRight({
        battleId: battleId("battle-snapshot-bonus-action-quota"),
        combatants: [
          statBlockCreatureInit({ combatantId: goblinId, initiative: 20 }),
          characterSeed({ combatantId: wizardId, initiative: 10 }),
        ],
      }),
    );

    expect(snapshot.currentActorId).toBe(goblinId);
    expect(snapshot.turn.bonusActionQuotaAvailable).toBe(true);
    expect(snapshot.turn).not.toHaveProperty("bonusActionAvailable");
  });

  test("projects committed mechanics without acts, frontiers, cursors, or labels", () => {
    const snapshot = snapshotBattle(fighterVsGoblinBattle());
    const character = snapshot.combatants.find(
      (combatant) => combatant.combatantId !== goblinId,
    );

    expect(character?.origin.kind).toBe("character");
    expect(snapshot).not.toHaveProperty("acts");
    expect(snapshot).not.toHaveProperty("pendingInterrupt");
    expect(snapshot).not.toHaveProperty("executionScopeCursors");
    expect(snapshot).not.toHaveProperty("retiredExecutionScopeAllocations");
    expect(character).not.toHaveProperty("displayName");
    expect(character).not.toHaveProperty("nextActiveEffectOrdinal");
    if (character?.origin.kind === "character") {
      expect(character.origin.execution).not.toHaveProperty(
        "nextProcedureOrdinal",
      );
      expect(character.origin.execution.procedureBindings).toEqual(
        expect.any(Array),
      );
    }

    const encoded = Schema.encodeSync(BattleSnapshotSchema)(snapshot);
    expect(encoded).not.toHaveProperty("acts");
    expect(encoded).not.toHaveProperty("pendingInterrupt");
    expect(Schema.decodeUnknownSync(BattleSnapshotSchema)(encoded)).toEqual(
      snapshot,
    );
  });

  test("round-trips an arbitrary reachable mixed roster", () => {
    const state = startBattleRight({
      battleId: battleId("battle-snapshot-arbitrary-roster"),
      combatants: [
        characterSeed({ combatantId: wizardId, initiative: 30 }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 20 }),
        characterSeed({
          combatantId: combatantId("second-character"),
          initiative: 10,
        }),
        statBlockCreatureInit({ combatantId: skeletonId, initiative: 5 }),
      ],
    });
    const snapshot = snapshotBattle(state);
    const encoded = Schema.encodeSync(BattleSnapshotSchema)(snapshot);

    expect(snapshot.combatants).toHaveLength(4);
    expect(
      Either.isRight(Schema.decodeUnknownEither(BattleSnapshotSchema)(encoded)),
    ).toBe(true);
  });

  test("keeps committed interrupt mechanics separate from checkpoint and frontier projections", () => {
    const state = fighterTurnWithReadiedRay("attackHit");
    const subject = fighterAttackSubject(state);
    const target = attackInitialTargetHole(state, subject);
    const attackRoll = attackRollHoleAfterTarget(state, target, subject);
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
      ],
    });
    expect(awaitingReaction.tag).toBe("needsHoles");
    if (awaitingReaction.tag !== "needsHoles") return;
    expect(awaitingReaction.checkpointBoundary).toEqual({
      kind: "durableInterruptCheckpoint",
    });

    const frontier = pendingInterruptSnapshot(awaitingReaction.state);
    expect(frontier).toMatchObject({ trigger: "attackHit" });
    expect(currentInterruptCheckpoint(awaitingReaction.state)).toMatchObject({
      trigger: "attackHit",
    });
    expect(snapshotBattle(awaitingReaction.state)).not.toHaveProperty(
      "pendingInterrupt",
    );

    if (frontier === null) return;
    const releaseChoice = frontier.choices.find(
      (choice) => choice.kind === "releaseReadiedSpell",
    );
    if (
      releaseChoice?.kind !== "releaseReadiedSpell" ||
      releaseChoice.subject.tag !== "runtimeCommand" ||
      releaseChoice.subject.command !== "releaseReadiedSpell"
    ) {
      throw new Error("Expected a readied-spell release choice.");
    }
    const released = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(frontier.decisionHole, {
        kind: "resolve",
        responderId: wizardId,
        choice: {
          kind: "releaseReadiedSpell",
          readiedSpellCasterId: wizardId,
          procedureRef: releaseChoice.subject.procedureRef,
          fills: [],
        },
      }),
    });
    expect(released.tag).toBe("needsHoles");
    if (released.tag !== "needsHoles") return;

    const committed = snapshotBattle(released.state);
    expect(committed.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: wizardId,
          reactionAvailable: false,
        }),
      ]),
    );
    expect(committed).not.toHaveProperty("pendingInterrupt");
    expect(currentInterruptCheckpoint(released.state)).toMatchObject({
      trigger: "attackHit",
    });
    expect(pendingInterruptSnapshot(released.state)).toMatchObject({
      trigger: "attackHit",
    });
  });

  test("rejects legacy frontier and allocator fields at the codec boundary", () => {
    const snapshot = snapshotBattle(fighterVsGoblinBattle());
    const encoded = Schema.encodeSync(BattleSnapshotSchema)(snapshot);

    for (const field of [
      "acts",
      "pendingInterrupt",
      "executionScopeCursors",
      "retiredExecutionScopeAllocations",
    ] as const) {
      expect(
        Either.isLeft(
          Schema.decodeUnknownEither(BattleSnapshotSchema)({
            ...encoded,
            [field]: [],
          }),
        ),
      ).toBe(true);
    }

    const withPresentationLabel = {
      ...encoded,
      combatants: encoded.combatants.map((combatant) => ({
        ...combatant,
        displayName: "Goblin Warrior",
      })),
    };
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleSnapshotSchema)(withPresentationLabel),
      ),
    ).toBe(true);

    const withNestedCursor = {
      ...encoded,
      combatants: encoded.combatants.map((combatant) => ({
        ...combatant,
        nextActiveEffectOrdinal: 0,
      })),
    };
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleSnapshotSchema)(withNestedCursor),
      ),
    ).toBe(true);

    const withCharacterCursor = {
      ...encoded,
      combatants: encoded.combatants.map((combatant) =>
        combatant.origin.kind === "character"
          ? {
              ...combatant,
              origin: {
                ...combatant.origin,
                execution: {
                  ...combatant.origin.execution,
                  nextProcedureOrdinal: 0,
                },
              },
            }
          : combatant,
      ),
    };
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleSnapshotSchema)(withCharacterCursor),
      ),
    ).toBe(true);
  });
});
