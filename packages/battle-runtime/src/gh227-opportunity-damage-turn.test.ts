// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md:479-501 (rounds, turns, and movement)
// - .references/srd-5.2.1/Playing-the-Game.md:634-640 (Opportunity Attacks)
// - .references/srd-5.2.1/Playing-the-Game.md:694-730 (damage, Resistance, and Critical Hits)
// - .references/srd-5.2.1/Playing-the-Game.md:742-780 (Knocking Out, zero Hit Points, and Death Saving Throws)
// - .references/srd-5.2.1/Rules-Glossary.md:239-247 (Concentration)
// - .references/srd-5.2.1/Rules-Glossary.md:738-740 (Opportunity Attacks)
// - .references/srd-5.2.1/Rules-Glossary.md:814-816 (Reaction reset)

import { Hp, movementFeet } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import {
  attackExecutionSelectionForSubjectForTest,
  attackDamageDispositionFill,
  attackRollFill,
  concentrationSavingThrowFill,
  endTurn,
  findHole,
  movementFill,
  opportunityAttackProcedureSelectionForTest,
  reactionChoiceWithSubject,
  requireHole,
  requireResolved,
  resolveBattleInterrupt,
  resolveBattleSubject,
  resistantSkeletonCreatureInit,
  statBlockAttackSubjectForTest,
  statBlockCreatureInit,
  skeletonId,
  startBattleRight,
  wizardId,
  wizardTurnWithReadiedRay,
  interruptDecisionFill,
  damageRollFill,
  goblinId,
  battleId,
  battleFrontierInterruptDecisionForState,
} from "./battle-runtime.test-support.ts";
import type { BattleSubject } from "./battle-runtime.test-support.ts";

describe("GitHub #227 opportunity attack, damage, and turn boundaries", () => {
  test("voluntary movement through a concentrating actor resolves an OA and expires its Ready response at the next turn", () => {
    const session = wizardTurnWithReadiedRay("spellCast");
    const state = session.state;
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: wizardId,
      command: "move",
    };
    const movement = requireHole(
      resolveBattleSubject({ state, subject: moveSubject, fills: [] }),
      "movement",
    );
    const skeletonAttack = statBlockAttackSubjectForTest(
      state,
      skeletonId,
      "Shortsword",
      "actions",
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject: moveSubject,
      fills: [
        movementFill(movement, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [
            {
              reactorId: skeletonId,
              distanceFeet: movementFeet(5),
              ...attackExecutionSelectionForSubjectForTest(skeletonAttack),
            },
          ],
        }),
      ],
    });
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "opportunityAttack" }],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected the movement to offer an Opportunity Attack.");
    }

    const pendingInterrupt = battleFrontierInterruptDecisionForState(
      awaitingReaction.state,
    );
    if (pendingInterrupt === null) {
      throw new Error("Expected the Opportunity Attack decision window.");
    }
    const choice = reactionChoiceWithSubject(pendingInterrupt.choices);
    const started = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(pendingInterrupt.decisionHole, {
        kind: "resolve",
        responderId: skeletonId,
        choice: opportunityAttackProcedureSelectionForTest(choice),
      }),
    });
    expect(started).toMatchObject({
      tag: "needsHoles",
      subject: choice.subject,
      holes: [{ kind: "attackRoll" }],
    });
    if (started.tag !== "needsHoles") {
      throw new Error("Expected the Opportunity Attack attack-roll hole.");
    }

    const attackRoll = findHole(started.holes, "attackRoll");
    const rolled = resolveBattleSubject({
      state: started.state,
      subject: choice.subject,
      fills: [attackRollFill(attackRoll, { total: 20, naturalD20: 18 })],
    });
    const damage = requireHole(rolled, "rolledDice");
    const concentration = requireHole(
      resolveBattleSubject({
        state: started.state,
        subject: choice.subject,
        fills: [
          attackRollFill(attackRoll, { total: 20, naturalD20: 18 }),
          damageRollFill(damage, 4),
        ],
      }),
      "concentrationSavingThrow",
    );
    const completed = requireResolved(
      resolveBattleSubject({
        state: started.state,
        subject: choice.subject,
        fills: [
          attackRollFill(attackRoll, { total: 20, naturalD20: 18 }),
          damageRollFill(damage, 4),
          concentrationSavingThrowFill(concentration, true),
        ],
      }),
    );
    expect(battleFrontierInterruptDecisionForState(completed.state)).toBeNull();
    expect(completed.snapshot.readiedResponses.spells).toHaveLength(1);
    expect(completed.snapshot.readiedResponses.spells[0]).toMatchObject({
      casterId: wizardId,
    });
    expect(
      completed.snapshot.combatants.find(
        (combatant) => combatant.combatantId === wizardId,
      ),
    ).toMatchObject({
      hp: 5,
      movement: expect.objectContaining({ spentFeet: 5, remainingFeet: 25 }),
      concentrating: true,
    });
    expect(
      completed.snapshot.combatants.find(
        (combatant) => combatant.combatantId === skeletonId,
      ),
    ).toMatchObject({ reactionAvailable: false });

    const skeletonTurn = requireResolved(
      endTurn({ state: completed.state, actorId: wizardId }),
    );
    expect(skeletonTurn.snapshot.currentActorId).toBe(skeletonId);
    expect(
      skeletonTurn.snapshot.combatants.find(
        (combatant) => combatant.combatantId === skeletonId,
      ),
    ).toMatchObject({
      reactionAvailable: true,
      movement: expect.objectContaining({ spentFeet: 0, remainingFeet: 30 }),
    });

    const nextWizardTurn = requireResolved(
      endTurn({ state: skeletonTurn.state, actorId: skeletonId }),
    );
    expect(nextWizardTurn.snapshot.currentActorId).toBe(wizardId);
    expect(nextWizardTurn.snapshot.readiedResponses.spells).toEqual([]);
    expect(
      nextWizardTurn.snapshot.combatants.find(
        (combatant) => combatant.combatantId === wizardId,
      ),
    ).toMatchObject({ reactionAvailable: true, concentrating: false });
  });

  test("a resistant mover survives a mitigated OA before a later OA reaches zero and turns reset", () => {
    const resistant = resistantSkeletonCreatureInit({ initiative: 20 });
    const state = startBattleRight({
      battleId: battleId("gh227-opportunity-resistant-mover"),
      combatants: [
        {
          ...resistant,
          currentHp: Hp(4),
        },
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const firstMoveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: skeletonId,
      command: "move",
    };
    const firstMovement = requireHole(
      resolveBattleSubject({ state, subject: firstMoveSubject, fills: [] }),
      "movement",
    );
    const firstGoblinAttack = statBlockAttackSubjectForTest(
      state,
      goblinId,
      "Scimitar",
      "actions",
    );
    const firstAwaitingReaction = resolveBattleSubject({
      state,
      subject: firstMoveSubject,
      fills: [
        movementFill(firstMovement, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [
            {
              reactorId: goblinId,
              distanceFeet: movementFeet(5),
              ...attackExecutionSelectionForSubjectForTest(firstGoblinAttack),
            },
          ],
        }),
      ],
    });
    if (firstAwaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected the resistant mover to offer an OA.");
    }
    const firstPendingInterrupt = battleFrontierInterruptDecisionForState(
      firstAwaitingReaction.state,
    );
    if (firstPendingInterrupt === null) {
      throw new Error("Expected the OA decision window.");
    }
    const firstChoice = reactionChoiceWithSubject(
      firstPendingInterrupt.choices,
    );
    const firstStarted = resolveBattleInterrupt({
      state: firstAwaitingReaction.state,
      fill: interruptDecisionFill(firstPendingInterrupt.decisionHole, {
        kind: "resolve",
        responderId: goblinId,
        choice: opportunityAttackProcedureSelectionForTest(firstChoice),
      }),
    });
    if (firstStarted.tag !== "needsHoles") {
      throw new Error("Expected the OA attack-roll hole.");
    }
    const firstAttackRoll = findHole(firstStarted.holes, "attackRoll");
    const firstDamage = requireHole(
      resolveBattleSubject({
        state: firstStarted.state,
        subject: firstChoice.subject,
        fills: [attackRollFill(firstAttackRoll, { total: 20, naturalD20: 18 })],
      }),
      "rolledDice",
    );
    const firstCompleted = requireResolved(
      resolveBattleSubject({
        state: firstStarted.state,
        subject: firstChoice.subject,
        fills: [
          attackRollFill(firstAttackRoll, { total: 20, naturalD20: 18 }),
          damageRollFill(firstDamage, 4),
        ],
      }),
    );
    expect(
      battleFrontierInterruptDecisionForState(firstCompleted.state),
    ).toBeNull();
    expect(
      firstCompleted.snapshot.combatants.find(
        (combatant) => combatant.combatantId === skeletonId,
      ),
    ).toMatchObject({
      hp: 1,
      conditions: [],
      movement: expect.objectContaining({ spentFeet: 5, remainingFeet: 25 }),
      zeroHpLifecycle: { dead: false },
    });
    expect(
      firstCompleted.snapshot.combatants.find(
        (combatant) => combatant.combatantId === goblinId,
      ),
    ).toMatchObject({ reactionAvailable: false });

    const goblinTurn = requireResolved(
      endTurn({ state: firstCompleted.state, actorId: skeletonId }),
    );
    expect(goblinTurn.snapshot.currentActorId).toBe(goblinId);
    expect(
      goblinTurn.snapshot.combatants.find(
        (combatant) => combatant.combatantId === goblinId,
      ),
    ).toMatchObject({
      reactionAvailable: true,
      movement: expect.objectContaining({ spentFeet: 0, remainingFeet: 30 }),
    });

    const skeletonTurn = requireResolved(
      endTurn({ state: goblinTurn.state, actorId: goblinId }),
    );
    expect(skeletonTurn.snapshot.currentActorId).toBe(skeletonId);
    expect(
      skeletonTurn.snapshot.combatants.find(
        (combatant) => combatant.combatantId === skeletonId,
      ),
    ).toMatchObject({
      movement: expect.objectContaining({ spentFeet: 0, remainingFeet: 30 }),
    });

    const secondMoveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: skeletonId,
      command: "move",
    };
    const secondMovement = requireHole(
      resolveBattleSubject({
        state: skeletonTurn.state,
        subject: secondMoveSubject,
        fills: [],
      }),
      "movement",
    );
    const secondGoblinAttack = statBlockAttackSubjectForTest(
      skeletonTurn.state,
      goblinId,
      "Scimitar",
      "actions",
    );
    const secondAwaitingReaction = resolveBattleSubject({
      state: skeletonTurn.state,
      subject: secondMoveSubject,
      fills: [
        movementFill(secondMovement, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [
            {
              reactorId: goblinId,
              distanceFeet: movementFeet(5),
              ...attackExecutionSelectionForSubjectForTest(secondGoblinAttack),
            },
          ],
        }),
      ],
    });
    if (secondAwaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected the reset goblin to offer a second OA.");
    }
    const secondPendingInterrupt = battleFrontierInterruptDecisionForState(
      secondAwaitingReaction.state,
    );
    if (secondPendingInterrupt === null) {
      throw new Error("Expected the second OA decision window.");
    }
    const secondChoice = reactionChoiceWithSubject(
      secondPendingInterrupt.choices,
    );
    const secondStarted = resolveBattleInterrupt({
      state: secondAwaitingReaction.state,
      fill: interruptDecisionFill(secondPendingInterrupt.decisionHole, {
        kind: "resolve",
        responderId: goblinId,
        choice: opportunityAttackProcedureSelectionForTest(secondChoice),
      }),
    });
    if (secondStarted.tag !== "needsHoles") {
      throw new Error("Expected the second OA attack-roll hole.");
    }
    const secondAttackRoll = findHole(secondStarted.holes, "attackRoll");
    const secondDamage = requireHole(
      resolveBattleSubject({
        state: secondStarted.state,
        subject: secondChoice.subject,
        fills: [
          attackRollFill(secondAttackRoll, { total: 20, naturalD20: 18 }),
        ],
      }),
      "rolledDice",
    );
    const secondDamageDisposition = requireHole(
      resolveBattleSubject({
        state: secondStarted.state,
        subject: secondChoice.subject,
        fills: [
          attackRollFill(secondAttackRoll, { total: 20, naturalD20: 18 }),
          damageRollFill(secondDamage, 4),
        ],
      }),
      "attackDamageDisposition",
    );
    const secondCompleted = requireResolved(
      resolveBattleSubject({
        state: secondStarted.state,
        subject: secondChoice.subject,
        fills: [
          attackRollFill(secondAttackRoll, { total: 20, naturalD20: 18 }),
          damageRollFill(secondDamage, 4),
          attackDamageDispositionFill(secondDamageDisposition, {
            kind: "ordinaryDamage",
          }),
        ],
      }),
    );
    expect(
      battleFrontierInterruptDecisionForState(secondCompleted.state),
    ).toBeNull();
    expect(
      secondCompleted.snapshot.combatants.find(
        (combatant) => combatant.combatantId === skeletonId,
      ),
    ).toMatchObject({
      hp: 0,
      conditions: [],
      movement: expect.objectContaining({ spentFeet: 0, remainingFeet: 30 }),
      zeroHpLifecycle: { dead: true },
    });
    expect(
      secondCompleted.snapshot.combatants.find(
        (combatant) => combatant.combatantId === goblinId,
      ),
    ).toMatchObject({ reactionAvailable: false });

    const finalGoblinTurn = requireResolved(
      endTurn({ state: secondCompleted.state, actorId: skeletonId }),
    );
    expect(finalGoblinTurn.snapshot.currentActorId).toBe(goblinId);
    expect(
      finalGoblinTurn.snapshot.combatants.find(
        (combatant) => combatant.combatantId === goblinId,
      ),
    ).toMatchObject({
      reactionAvailable: true,
      movement: expect.objectContaining({ spentFeet: 0, remainingFeet: 30 }),
    });
  });
});
