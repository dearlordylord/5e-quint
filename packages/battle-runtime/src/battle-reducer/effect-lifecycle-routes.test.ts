import { describe, expect, test } from "vitest";
import {
  fighterAttackSubject,
  fighterVsGoblinBattle,
} from "../battle-runtime.test-support.ts";
import { rollModifierRouteForDiscoveredAct } from "./effect-lifecycle-routes.ts";

describe("effect lifecycle route boundary", () => {
  test("does not claim an ordinary weapon attack without a roll modifier effect", () => {
    const state = fighterVsGoblinBattle();

    expect(
      rollModifierRouteForDiscoveredAct(state, {
        subject: fighterAttackSubject(state),
        initialHoles: [],
      }),
    ).toBeUndefined();
  });
});
