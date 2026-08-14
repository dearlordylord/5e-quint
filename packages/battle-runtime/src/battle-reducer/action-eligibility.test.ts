import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import { describe, expect, test } from "vitest";
import { battleActSpellPresentation } from "../battle-act-composition.ts";
import {
  battleId,
  characterSeed,
  discoverBattleActs,
  fighterAttackSubject,
  fighterId,
  findAct,
  magicSubject,
  skeletonCreatureInit,
  spellRecord,
  startBattleRight,
  startBattleSessionRight,
  statBlockCreatureInit,
  testBattleCreatureStateWithConditions,
  wizardId,
  wizardSpellcasting,
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

  test("owns Magic and Bonus Action spell resource diagnostics", () => {
    const actionSession = startBattleSessionRight({
      battleId: battleId("battle-magic-action-eligibility"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("mage_armor")],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const bonusActionSession = startBattleSessionRight({
      battleId: battleId("battle-bonus-action-spell-eligibility"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Warlock",
          initiative: 20,
          attack: null,
          classLevels: [{ className: "warlock", level: 1 }],
          spellcasting: {
            ...wizardSpellcasting({
              preparedSpells: [spellRecord("hex")],
            }),
            spellcastingSource: {
              tag: "classSpellcasting",
              className: "warlock",
              abilityModifier: 3,
            },
          },
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const withoutMagicAction = {
      ...actionSession.state,
      currentTurnResources: {
        ...actionSession.state.currentTurnResources,
        actionResources: [],
      },
    };
    const withoutBonusAction = {
      ...bonusActionSession.state,
      currentTurnResources: {
        ...bonusActionSession.state.currentTurnResources,
        currentHasBonusAction: false,
      },
    };
    const bonusActionSpell = discoverBattleActs(bonusActionSession).find(
      (act) =>
        act.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(act)?.invocation.spellId === "hex",
    );
    if (bonusActionSpell?.subject.tag !== "bonusActionSpell") {
      throw new Error("Expected a Hex Bonus Action spell subject.");
    }

    expect(
      battleSubjectActionEligibilityIssue(
        withoutMagicAction,
        findAct(actionSession, magicSubject("mage_armor")).subject,
      ),
    ).toBe("Magic action is no longer available for the current actor.");
    expect(
      battleSubjectActionEligibilityIssue(
        withoutBonusAction,
        bonusActionSpell.subject,
      ),
    ).toBe("Bonus Action spell is no longer available for the current actor.");
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
