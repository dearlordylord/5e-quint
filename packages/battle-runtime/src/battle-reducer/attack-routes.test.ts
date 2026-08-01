import { describe, expect, test } from "vitest";
import {
  discoverBattleActCandidates,
  fighterAttackSubject,
  fighterVsGoblinBattle,
  fighterId,
  goblinAttackSubject,
  goblinTurnBattle,
} from "../battle-runtime.test-support.ts";
import {
  isWeaponAttackSubject,
  statBlockActionRouteForDiscoveredAct,
  weaponAttackRouteForDiscoveredAct,
} from "./attack-routes.ts";

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

  test("projects weapon and stat-block Attack discovery through focused owners", () => {
    const state = fighterVsGoblinBattle();
    const weaponAct = discoverBattleActCandidates(state).find(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "attack" &&
        act.subject.actorId === fighterId,
    );
    if (weaponAct === undefined)
      throw new Error("Expected a weapon Attack act.");
    const goblinState = goblinTurnBattle();
    const expectedGoblinSubject = goblinAttackSubject(goblinState, "Scimitar");
    const statBlockAct = discoverBattleActCandidates(goblinState).find(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "attack" &&
        act.subject.procedureRef === expectedGoblinSubject.procedureRef,
    );
    if (statBlockAct === undefined) {
      throw new Error("Expected a Stat Block Attack act.");
    }

    expect(weaponAttackRouteForDiscoveredAct(state, weaponAct)).toEqual([
      expect.objectContaining({
        subject: "weaponAttack",
        owner: "battleActionEconomy",
      }),
    ]);
    expect(
      statBlockActionRouteForDiscoveredAct(goblinState, statBlockAct),
    ).toEqual([
      expect.objectContaining({
        subject: "statBlockAction",
        owner: "battleStatBlockAction",
      }),
    ]);
  });
});
