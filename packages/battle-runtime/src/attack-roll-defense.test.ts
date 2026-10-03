// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.ATTACK_ROLL_DEFENSE
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.attack-roll-defense
import type { AttackRollDefenseSelection } from "@dnd/shared/game-facts";
// RAW: .references/srd-5.2.1/classes.md:6825-6832.
import { describe, expect, test } from "vitest";
import { Result } from "effect";
import { battleUnitRefWithSupportProfiles } from "./unit-feature-support.ts";
import {
  requiredAttackRollMode,
  recordAttackRollOngoingFeatures,
} from "./battle-reducer/attack-roll.ts";
import { resetBattleTurnResources } from "./battle-reducer/turn-resource-reset.ts";
import {
  startBattleSessionRight,
  battleId,
  characterSeed,
  fighterId,
  goblinId,
  statBlockCreatureInit,
  unitLibrary,
  testLongswordAttack,
  goblinAttackSubject,
  attackExecutionSelectionForSubjectForTest,
  movementFeet,
  resolveBattleSubject,
  requireHole,
  movementFill,
  battleFrontierInterruptDecisionForState,
  reactionChoiceWithSubject,
  resolveBattleInterrupt,
  interruptDecisionFill,
  opportunityAttackProcedureSelectionForTest,
  battleResolutionHolesForTest,
  findHole,
  attackRollFill,
} from "./battle-runtime.test-support.ts";

function battle(selection: AttackRollDefenseSelection) {
  const unit = unitLibrary.requireUnit("ranger_defensive_tactics");
  const ref = Result.getOrThrow(
    battleUnitRefWithSupportProfiles({
      unit,
      unitRef: {
        unitId: unit.id,
        selectedOption: { kind: "attackRollDefense", selection },
      },
    }),
  );
  return startBattleSessionRight({
    battleId: battleId("battle:attack-roll-defense"),
    combatants: [
      characterSeed({ initiative: 20, characterUnitRefs: [ref] }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  }).state;
}

describe("selected attack-roll defenses", () => {
  test("the Opportunity Attack Reaction pipeline requests Disadvantage and rejects a normal roll", () => {
    const state = battle("opportunityAttackDisadvantage");
    const subject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    } as const;
    const movement = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );
    const awaiting = resolveBattleSubject({
      state,
      subject,
      fills: [
        movementFill(movement, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [
            {
              reactorId: goblinId,
              distanceFeet: movementFeet(5),
              ...attackExecutionSelectionForSubjectForTest(
                goblinAttackSubject(state, "Scimitar"),
              ),
            },
          ],
        }),
      ],
    });
    if (awaiting.tag !== "needsHoles")
      throw new Error("Expected Opportunity Attack window.");
    const pending = battleFrontierInterruptDecisionForState(awaiting.state);
    if (pending === null) throw new Error("Expected pending Reaction.");
    const choice = reactionChoiceWithSubject(pending.choices);
    const started = resolveBattleInterrupt({
      state: awaiting.state,
      fill: interruptDecisionFill(pending.decisionHole, {
        kind: "resolve",
        responderId: goblinId,
        choice: opportunityAttackProcedureSelectionForTest(choice),
      }),
    });
    if (started.tag !== "needsHoles")
      throw new Error("Expected Reaction roll request.");
    const roll = findHole(battleResolutionHolesForTest(started), "attackRoll");
    expect(roll.rollMode).toBe("disadvantage");
    expect(
      resolveBattleSubject({
        state: started.state,
        subject: choice.subject,
        fills: [attackRollFill(roll, { total: 20, naturalD20: 18 })],
      }).tag,
    ).toBe("invalid");
    expect(
      resolveBattleSubject({
        state: started.state,
        subject: choice.subject,
        fills: [
          attackRollFill(roll, {
            total: 20,
            naturalD20: 18,
            rollMode: "disadvantage",
          }),
        ],
      }).tag,
    ).toBe("needsHoles");
  });
  test("requires the selected option on its owning mechanics", () => {
    const unit = unitLibrary.requireUnit("ranger_defensive_tactics");
    expect(
      Result.isFailure(
        battleUnitRefWithSupportProfiles({
          unit,
          unitRef: { unitId: unit.id },
        }),
      ),
    ).toBe(true);
    const unrelated = unitLibrary.requireUnit("ranger_hunters_lore");
    expect(
      Result.isFailure(
        battleUnitRefWithSupportProfiles({
          unit: unrelated,
          unitRef: {
            unitId: unrelated.id,
            selectedOption: {
              kind: "attackRollDefense",
              selection: "opportunityAttackDisadvantage",
            },
          },
        }),
      ),
    ).toBe(true);
  });
  test("Opportunity Attack disadvantage excludes ordinary and retaliation attacks", () => {
    const state = battle("opportunityAttackDisadvantage");
    expect(
      requiredAttackRollMode(
        state,
        goblinId,
        fighterId,
        testLongswordAttack(),
        [],
      ),
    ).toBeUndefined();
    expect(
      requiredAttackRollMode(
        state,
        goblinId,
        fighterId,
        testLongswordAttack(),
        [],
        true,
      ),
    ).toBe("disadvantage");
    const afterHit = recordAttackRollOngoingFeatures(
      state,
      goblinId,
      fighterId,
      null,
      [],
      true,
    );
    expect(
      afterHit.currentTurnResources.attackRollDefensesTriggeredThisTurn,
    ).toEqual([]);
  });
  test("a hit marks only its attacker and defender for this turn, including a reaction attacker", () => {
    const state = battle("repeatAttackerAfterHitDisadvantage");
    expect(
      requiredAttackRollMode(
        state,
        goblinId,
        fighterId,
        testLongswordAttack(),
        [],
        true,
      ),
    ).toBeUndefined();
    const missed = recordAttackRollOngoingFeatures(
      state,
      goblinId,
      fighterId,
      null,
      [],
      false,
    );
    expect(
      missed.currentTurnResources.attackRollDefensesTriggeredThisTurn,
    ).toEqual([]);
    const hit = recordAttackRollOngoingFeatures(
      state,
      goblinId,
      fighterId,
      null,
      [],
      true,
    );
    expect(
      requiredAttackRollMode(
        hit,
        goblinId,
        fighterId,
        testLongswordAttack(),
        [],
      ),
    ).toBe("disadvantage");
    expect(
      requiredAttackRollMode(
        hit,
        fighterId,
        goblinId,
        testLongswordAttack(),
        [],
      ),
    ).toBeUndefined();
    expect(
      recordAttackRollOngoingFeatures(hit, goblinId, fighterId, null, [], true)
        .currentTurnResources.attackRollDefensesTriggeredThisTurn,
    ).toHaveLength(1);
    const ended = {
      ...hit,
      currentTurnResources: resetBattleTurnResources(hit.currentTurnResources),
    };
    expect(
      requiredAttackRollMode(
        ended,
        goblinId,
        fighterId,
        testLongswordAttack(),
        [],
      ),
    ).toBeUndefined();
  });
});
