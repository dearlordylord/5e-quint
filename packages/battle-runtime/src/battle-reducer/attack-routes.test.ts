import { describe, expect, test } from "vitest";
import {
  fighterAttackSubject,
  fighterVsGoblinBattle,
  fighterId,
} from "../battle-runtime.test-support.ts";
import { isWeaponAttackSubject } from "./attack-routes.ts";

describe("attack route boundary", () => {
  test("classifies weapon Attack subjects without claiming other actions", () => {
    const state = fighterVsGoblinBattle();

    expect(isWeaponAttackSubject(fighterAttackSubject(state))).toBe(true);
    expect(
      isWeaponAttackSubject({
        tag: "action",
        action: "dash",
        actorId: fighterId,
        speedKind: "walk",
      }),
    ).toBe(false);
  });
});
