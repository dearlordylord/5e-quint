import { Schema } from "effect";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";
import {
  BattleSnapshotSchema,
  battleId,
  combatantId,
  fighterVsGoblinBattle,
  characterSeed,
  goblinId,
  skeletonId,
  startBattleRight,
  snapshotBattle,
  statBlockCreatureInit,
  wizardId,
} from "./battle-runtime.test-support.ts";

describe("BattleSnapshot durable checkpoint", () => {
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
