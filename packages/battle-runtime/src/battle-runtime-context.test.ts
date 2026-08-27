import {
  battleId,
  characterSeed,
  combatantId,
  startBattleSessionRight,
  statBlockCreatureInit,
} from "./battle-runtime.test-support.ts";
import { battleRuntimeSessionWithState } from "./battle-runtime-context.ts";
import { removeBattleRuntimeCombatants } from "./index.ts";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";

describe("battle runtime context", () => {
  test("prunes context entries for combatants removed from the reducer roster", () => {
    const retainedCharacterId = combatantId("retained-character");
    const removedCharacterId = combatantId("removed-character");
    const retainedStatBlockId = combatantId("retained-stat-block");
    const removedStatBlockId = combatantId("removed-stat-block");
    const session = startBattleSessionRight({
      battleId: battleId("battle-runtime-context-pruning"),
      combatants: [
        characterSeed({ combatantId: retainedCharacterId, initiative: 40 }),
        characterSeed({ combatantId: removedCharacterId, initiative: 30 }),
        statBlockCreatureInit({
          combatantId: retainedStatBlockId,
          initiative: 20,
        }),
        statBlockCreatureInit({
          combatantId: removedStatBlockId,
          initiative: 10,
        }),
      ],
    });
    const removed = removeBattleRuntimeCombatants({
      session,
      combatantIds: [removedCharacterId, removedStatBlockId],
    });
    expect(Either.isRight(removed)).toBe(true);
    if (Either.isLeft(removed)) return;

    const successor = battleRuntimeSessionWithState(
      session,
      removed.right.state,
    );

    expect(successor.context.characters.get(retainedCharacterId)).toBe(
      session.context.characters.get(retainedCharacterId),
    );
    expect(successor.context.statBlocks.get(retainedStatBlockId)).toBe(
      session.context.statBlocks.get(retainedStatBlockId),
    );
    expect(successor.context.characters.has(removedCharacterId)).toBe(false);
    expect(successor.context.statBlocks.has(removedStatBlockId)).toBe(false);
    expect([...successor.context.characters.keys()]).toEqual([
      retainedCharacterId,
    ]);
    expect([...successor.context.statBlocks.keys()]).toEqual([
      retainedStatBlockId,
    ]);
  });
});
