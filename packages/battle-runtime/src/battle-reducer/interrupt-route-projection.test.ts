import { describe, expect, test } from "vitest";
import {
  fighterId,
  fighterVsGoblinBattle,
} from "../battle-runtime.test-support.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import { battleReducerRouteForFeatherFallLanding } from "./interrupt-route-projection.ts";

describe("interrupt route projection boundary", () => {
  test("projects mitigated Feather Fall landing cleanup in owner order", () => {
    const state = fighterVsGoblinBattle();

    expect(
      battleReducerRouteForFeatherFallLanding({
        tag: "mitigated",
        state,
        snapshot: snapshotBattle(state),
        targetId: fighterId,
        fallDamagePrevented: true,
        fallingPronePrevented: true,
      }),
    ).toEqual([
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "reactionFallMitigation",
        holes: [],
        owner: "battleActiveEffect",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "reactionFallMitigation",
        holes: [],
        owner: "battleMovementResource",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "reactionFallMitigation",
        holes: [],
        owner: "battleHitPoint",
      },
    ]);
  });
});
