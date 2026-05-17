import {
  fighterVsGoblinBattle,
  attackInitialTargetHole,
  targetFill,
  fighterId,
  goblinId,
  endTurn,
  resolveBattleSubject,
} from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: round end and runtime commands", () => {
  test("endTurn advances to a new round after the last actor acts", () => {
    const afterFighter = endTurn({
      state: fighterVsGoblinBattle(),
      actorId: fighterId,
    });
    if (afterFighter.tag !== "resolved") {
      throw new Error(`Expected resolved End Turn, got ${afterFighter.tag}.`);
    }

    const afterGoblin = endTurn({
      state: afterFighter.state,
      actorId: goblinId,
    });

    expect(afterGoblin).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentActorId: fighterId,
        round: 2,
        turnOrder: [fighterId, goblinId],
        turn: {
          actionResources: [{ kind: "action", source: "turn" }],
          bonusActionAvailable: true,
        },
      },
    });
  });

  test("endTurn rejects fills because it is a runtime command, not an Action hole protocol", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "endTurn",
      },
      fills: [targetFill(targetHole, goblinId)],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      snapshot: {
        currentActorId: fighterId,
        round: 1,
      },
    });
  });
});
