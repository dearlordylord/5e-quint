import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import { describe, expect, test } from "vitest";
import {
  battleId,
  characterSeed,
  fighterAttackSubject,
  fighterId,
  startBattleRight,
  statBlockCreatureInit,
  testBattleCreatureStateWithConditions,
} from "../battle-runtime.test-support.ts";
import type { BattleState } from "../battle-state-execution.ts";
import { battleSubjectActionEligibilityIssue } from "./action-eligibility.ts";

function eligibilityBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle-action-eligibility"),
    combatants: [
      characterSeed({ initiative: 20 }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

describe("battle subject action eligibility", () => {
  test("admits an action subject while its actor and resource are eligible", () => {
    const state = eligibilityBattle();

    expect(
      battleSubjectActionEligibilityIssue(
        state,
        fighterAttackSubject(state, "Longsword"),
      ),
    ).toBeNull();
  });

  test("reports an exhausted standard action resource", () => {
    const state = eligibilityBattle();
    const withoutAction = {
      ...state,
      currentTurnResources: {
        ...state.currentTurnResources,
        actionResources: [],
      },
    };

    expect(
      battleSubjectActionEligibilityIssue(withoutAction, {
        tag: "action",
        actorId: fighterId,
        action: "dash",
        speedKind: "walk",
      }),
    ).toBe("The selected action is no longer available for the current actor.");
  });

  test("reports an actor that cannot take actions before resource eligibility", () => {
    const state = eligibilityBattle();
    const fighter = state.combatants.get(fighterId);
    if (fighter === undefined) {
      throw new Error("Expected the fighter fixture.");
    }
    const incapacitated = {
      ...state,
      combatants: new Map(state.combatants).set(
        fighterId,
        testBattleCreatureStateWithConditions(
          fighter,
          applyCondition(fighter.conditions, "incapacitated"),
        ),
      ),
    };

    expect(
      battleSubjectActionEligibilityIssue(
        incapacitated,
        fighterAttackSubject(state, "Longsword"),
      ),
    ).toBe("The selected action is no longer available for the current actor.");
  });

  test("does not claim eligibility ownership for unrelated subjects", () => {
    const state = eligibilityBattle();

    expect(
      battleSubjectActionEligibilityIssue(state, {
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "endTurn",
      }),
    ).toBeNull();
  });
});
