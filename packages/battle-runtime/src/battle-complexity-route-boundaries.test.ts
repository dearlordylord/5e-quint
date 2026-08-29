import { describe, expect, test } from "vitest";
import { DieRollResult, movementFeet } from "@dnd/shared/types";
import {
  attackDamageDispositionFill,
  attackExecutionSelectionForSubjectForTest,
  attackRollFill,
  attackInitialTargetHole,
  attackRollHoleAfterTarget,
  battleId,
  battleFrontierInterruptDecisionForState,
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectOccurrencesForTest,
  characterBattleFeatureInitForTest,
  characterSeed,
  damageRollFill,
  damageRollFillWithGroups,
  endTurn,
  fighterAttackSubject,
  fighterId,
  findHole,
  goblinId,
  interruptDecisionFill,
  movementFill,
  opportunityAttackProcedureSelectionForTest,
  reactionChoiceWithSubject,
  requireHole,
  requireResolved,
  resolveBattleInterrupt,
  resolveBattleSubject,
  startBattleRight,
  startBattleSessionRight,
  statBlockCreatureInit,
  targetFill,
  testLongswordAttack,
  wizardId,
  wizardSpellcasting,
  spellRecord,
  requireCharacterSpellProcedureRefForTest,
  spellSlotInvocationRef,
  spellTargetAllocationFill,
  unitLibrary,
  supportedBattleUnitRef,
  type BattleState,
  type BattleSubject,
} from "./battle-runtime.test-support.ts";
import { statBlockAttackActionOptions } from "./stat-block-execution.ts";
import { sourceDamageRollPenaltyRollHole } from "./battle-reducer/damage-helpers.ts";
import { D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND } from "./battle-state-execution.ts";
import { speciesHalflingLuckUnitId } from "./unit-profile-admission-catalog.test-support.ts";

function readiedSpellProcedureRef(state: BattleState) {
  const readied = state.readiedSpells.get(wizardId);
  if (readied === undefined) {
    throw new Error("Expected the Wizard to hold a readied spell.");
  }
  return readied.procedureRef;
}

function startFighterOpportunityAttackAfterMovement(
  state: BattleState,
  moverId: typeof goblinId,
  attackName = "Longsword",
) {
  const moveSubject: BattleSubject = {
    tag: "runtimeCommand",
    actorId: moverId,
    command: "move",
  };
  const movement = requireHole(
    resolveBattleSubject({ state, subject: moveSubject, fills: [] }),
    "movement",
  );
  const fighterAttack = fighterAttackSubject(state, attackName);
  const awaitingOpportunity = resolveBattleSubject({
    state,
    subject: moveSubject,
    fills: [
      movementFill(movement, {
        movementCostFeet: 5,
        provokedOpportunityAttacks: [
          {
            reactorId: fighterAttack.actorId,
            distanceFeet: movementFeet(5),
            ...attackExecutionSelectionForSubjectForTest(fighterAttack),
          },
        ],
      }),
    ],
  });
  if (awaitingOpportunity.tag !== "needsHoles") {
    throw new Error("Expected fighter Opportunity Attack interrupt.");
  }
  const pendingInterrupt = battleFrontierInterruptDecisionForState(
    awaitingOpportunity.state,
  );
  if (pendingInterrupt === null) {
    throw new Error("Expected pending fighter Opportunity Attack interrupt.");
  }
  const rawOpportunityChoice = pendingInterrupt.choices.find(
    (choice) =>
      choice.kind === "opportunityAttack" && choice.reactorId === fighterId,
  );
  if (rawOpportunityChoice === undefined) {
    throw new Error("Expected fighter Opportunity Attack choice.");
  }
  const opportunityChoice = reactionChoiceWithSubject([rawOpportunityChoice]);
  const startedOpportunity = resolveBattleInterrupt({
    state: awaitingOpportunity.state,
    fill: interruptDecisionFill(pendingInterrupt.decisionHole, {
      kind: "resolve",
      responderId: fighterId,
      choice: opportunityAttackProcedureSelectionForTest(opportunityChoice),
    }),
  });
  if (startedOpportunity.tag !== "needsHoles") {
    throw new Error("Expected fighter Opportunity Attack roll hole.");
  }
  return {
    state: startedOpportunity.state,
    subject: opportunityChoice.subject,
    attackRoll: findHole(startedOpportunity.holes, "attackRoll"),
  };
}

describe("battle runtime complexity extraction route boundaries", () => {
  test("ordinary attacks expose target, roll, damage, and miss continuations", () => {
    const state = startBattleRight({
      battleId: battleId("battle-complexity-attack-routes"),
      combatants: [
        characterSeed({ initiative: 20, attack: testLongswordAttack() }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = fighterAttackSubject(state);
    const target = attackInitialTargetHole(state, subject);
    const roll = attackRollHoleAfterTarget(state, target, subject, goblinId);
    const hit = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const resolvedHit = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(hit, [[4]]),
      ],
    });
    expect(resolvedHit).toMatchObject({ tag: "resolved" });

    const miss = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, { total: 1, naturalD20: 1 }),
      ],
    });
    expect(miss).toMatchObject({ tag: "resolved" });
  });

  test("a stat-block static attack resolves through the fixed-damage branch", () => {
    const state = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-complexity-static-attack"),
          combatants: [
            characterSeed({
              combatantId: fighterId,
              initiative: 20,
              currentHp: 1,
              maxHp: 1,
            }),
            statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
          ],
        }),
        actorId: fighterId,
      }),
    ).state;
    const goblin = state.combatants.get(goblinId);
    if (goblin?.origin.kind !== "statBlock") {
      throw new Error("Expected a stat-block attacker.");
    }
    const staticOption = statBlockAttackActionOptions(
      goblin.origin.execution,
    ).find(
      (candidate) =>
        candidate.damageNotation === "static" &&
        candidate.attack.attackType === "melee",
    );
    if (staticOption === undefined) {
      throw new Error("Expected a static melee stat-block attack.");
    }
    const subject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "attack",
      procedureRef: staticOption.procedureRef,
      statBlockDamageNotation: "static",
    };
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, fighterId)],
      }),
      "attackRoll",
    );
    const awaitingDisposition = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, fighterId),
        attackRollFill(roll, { total: 20, naturalD20: 15 }),
      ],
    });
    const disposition = requireHole(
      awaitingDisposition,
      "attackDamageDisposition",
    );
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, fighterId),
          attackRollFill(roll, { total: 20, naturalD20: 15 }),
          attackDamageDispositionFill(disposition, { kind: "ordinaryDamage" }),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });
  });

  test("Halfling Luck continues an Unarmed Strike opportunity attack after a natural one", () => {
    const halflingLuck = unitLibrary.requireUnit(speciesHalflingLuckUnitId);
    const state = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-complexity-opportunity-reroll"),
          combatants: [
            characterSeed({
              combatantId: fighterId,
              initiative: 20,
              characterUnitRefs: [supportedBattleUnitRef(halflingLuck)],
              unitFeatures: [characterBattleFeatureInitForTest(halflingLuck)],
            }),
            statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
          ],
        }),
        actorId: fighterId,
      }),
    ).state;
    const opportunity = startFighterOpportunityAttackAfterMovement(
      state,
      goblinId,
      "Unarmed Strike",
    );
    const originalRoll = attackRollFill(opportunity.attackRoll, {
      total: 5,
      naturalD20: 1,
    });
    const rerollHole = requireHole(
      resolveBattleSubject({
        state: opportunity.state,
        subject: opportunity.subject,
        fills: [originalRoll],
      }),
      "attackRoll",
    );
    expect(rerollHole).toMatchObject({
      d20TestNaturalOneRerolls: expect.any(Array),
    });
    const resolved = resolveBattleSubject({
      state: opportunity.state,
      subject: opportunity.subject,
      fills: [
        attackRollFill(rerollHole, {
          total: 20,
          naturalD20: 1,
          d20TestNaturalOneReroll: {
            kind: "reroll",
            effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
            replacement: {
              total: 20,
              naturalD20: DieRollResult(18),
            },
          },
        }),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
  });

  test("opportunity attacks reject damage before a roll and resolve a normal hit", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-complexity-opportunity-routes"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          initiative: 20,
          attack: testLongswordAttack(),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
      ],
    });
    const goblinTurn = requireResolved(
      endTurn({ state: session.state, actorId: fighterId }),
    ).state;
    const opportunity = startFighterOpportunityAttackAfterMovement(
      goblinTurn,
      goblinId,
    );
    expect(
      resolveBattleSubject({
        state: opportunity.state,
        subject: opportunity.subject,
        fills: [
          attackRollFill(opportunity.attackRoll, {
            total: Number.NaN,
            naturalD20: 12,
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Opportunity Attack attack roll result is outside the d20 attack-roll protocol.",
    });
    expect(
      resolveBattleSubject({
        state: opportunity.state,
        subject: opportunity.subject,
        fills: [
          attackRollFill(opportunity.attackRoll, {
            total: 18,
            naturalD20: 12,
            spellAttackReroll: {
              kind: "decline",
              effectKind: "missed_spell_attack_reroll",
            },
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Seeking Spell rerolls are not available for this attack-roll owner.",
    });
    const damageHole = requireHole(
      resolveBattleSubject({
        state: opportunity.state,
        subject: opportunity.subject,
        fills: [
          attackRollFill(opportunity.attackRoll, {
            total: 18,
            naturalD20: 12,
          }),
        ],
      }),
      "rolledDice",
    );
    const prematureDamage = resolveBattleSubject({
      state: opportunity.state,
      subject: opportunity.subject,
      fills: [damageRollFill(damageHole, 4)],
    });
    expect(prematureDamage).toMatchObject({ tag: "invalid" });

    const roll = attackRollFill(opportunity.attackRoll, {
      total: 18,
      naturalD20: 12,
    });
    const damage = requireHole(
      resolveBattleSubject({
        state: opportunity.state,
        subject: opportunity.subject,
        fills: [roll],
      }),
      "rolledDice",
    );
    expect(
      resolveBattleSubject({
        state: opportunity.state,
        subject: opportunity.subject,
        fills: [roll, damageRollFill(damage, 4)],
      }),
    ).toMatchObject({ tag: "resolved" });
  });

  test("a readied attack spell exposes target, invalid roll, miss, and damage routes", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-complexity-readied-spell-routes"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("guiding_bolt")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
      ],
    });
    const wizardSession = session;
    const readySubject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        wizardSession,
        wizardId,
        spellSlotInvocationRef("guiding_bolt", 1, "spellAttackDamage"),
      ),
      mode: { tag: "ready", trigger: "attackHit" },
    };
    const ready = requireResolved(
      resolveBattleSubject({
        state: session.state,
        subject: readySubject,
        fills: [],
      }),
    ).state;
    const nextTurn = requireResolved(
      endTurn({ state: ready, actorId: wizardId }),
    ).state;
    const releaseSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: goblinId,
      command: "releaseReadiedSpell",
      readiedSpellCasterId: wizardId,
      procedureRef: readiedSpellProcedureRef(nextTurn),
    };
    const target = requireHole(
      resolveBattleSubject({
        state: nextTurn,
        subject: releaseSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: nextTurn,
        subject: releaseSubject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );
    const invalidMode = resolveBattleSubject({
      state: nextTurn,
      subject: releaseSubject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, {
          total: 999,
          naturalD20: 21,
          rollMode: "disadvantage",
        }),
      ],
    });
    expect(invalidMode).toMatchObject({ tag: "invalid" });

    const dodged = requireResolved(
      resolveBattleSubject({
        state: nextTurn,
        subject: { tag: "action", actorId: goblinId, action: "dodge" },
        fills: [],
      }),
    ).state;
    expect(dodged.combatants.get(goblinId)?.dodging).toBe(true);
    const dodgedTarget = requireHole(
      resolveBattleSubject({
        state: dodged,
        subject: releaseSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const dodgedRoll = requireHole(
      resolveBattleSubject({
        state: dodged,
        subject: releaseSubject,
        fills: [targetFill(dodgedTarget, goblinId)],
      }),
      "attackRoll",
    );
    const wrongRollMode = resolveBattleSubject({
      state: dodged,
      subject: releaseSubject,
      fills: [
        targetFill(dodgedTarget, goblinId),
        attackRollFill(dodgedRoll, {
          total: 10,
          naturalD20: 10,
          rollMode: "normal",
        }),
      ],
    });
    expect(wrongRollMode).toMatchObject({
      tag: "invalid",
      message:
        "Readied spell attack roll mode does not match the current attack-roll rule.",
    });

    const miss = requireResolved(
      resolveBattleSubject({
        state: nextTurn,
        subject: releaseSubject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, {
            total: 1,
            naturalD20: 1,
            rollMode: "normal",
          }),
        ],
      }),
    );
    expect(miss.state.readiedSpells.has(wizardId)).toBe(false);

    const secondSession = startBattleSessionRight({
      battleId: battleId("battle-complexity-readied-spell-hit"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("guiding_bolt")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
      ],
    });
    const secondReadySubject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        secondSession,
        wizardId,
        spellSlotInvocationRef("guiding_bolt", 1, "spellAttackDamage"),
      ),
      mode: { tag: "ready", trigger: "attackHit" },
    };
    const readyAgain = requireResolved(
      resolveBattleSubject({
        state: secondSession.state,
        subject: secondReadySubject,
        fills: [],
      }),
    ).state;
    const secondTurn = requireResolved(
      endTurn({ state: readyAgain, actorId: wizardId }),
    ).state;
    const secondRelease: BattleSubject = {
      ...releaseSubject,
      procedureRef: readiedSpellProcedureRef(secondTurn),
    };
    const secondTarget = requireHole(
      resolveBattleSubject({
        state: secondTurn,
        subject: secondRelease,
        fills: [],
      }),
      "targetChoice",
    );
    const secondRoll = requireHole(
      resolveBattleSubject({
        state: secondTurn,
        subject: secondRelease,
        fills: [targetFill(secondTarget, goblinId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: secondTurn,
        subject: secondRelease,
        fills: [
          targetFill(secondTarget, goblinId),
          attackRollFill(secondRoll, { total: 20, naturalD20: 14 }),
        ],
      }),
      "rolledDice",
    );
    const sourceProcedureRef = battleProcedureExecutionRefForTest(
      "complexity-source-penalty",
    );
    const allocatedSourcePenalty =
      battleStateWithAllocatedEffectOccurrencesForTest({
        state: secondTurn,
        occurrences: [
          {
            kind: "activeEffect",
            ownerId: goblinId,
            effect: {
              kind: "sourceDamageRollPenalty",
              sourceProcedureRef,
              sourceCombatantId: wizardId,
              amount: { dice: 1, dieSize: 8 },
              expiresAt: { kind: "concentration", combatantId: wizardId },
            },
          },
        ],
      });
    const sourcePenaltyOccurrence = allocatedSourcePenalty.occurrences[0];
    if (
      sourcePenaltyOccurrence?.kind !== "activeEffect" ||
      sourcePenaltyOccurrence.effect.kind !== "sourceDamageRollPenalty"
    ) {
      throw new Error("Expected allocated source damage roll penalty.");
    }
    const sourcePenalty = sourceDamageRollPenaltyRollHole({
      effectRef: sourcePenaltyOccurrence.effect.effectRef,
      sourceProcedureRef,
      sourceCombatantId: wizardId,
      affectedCombatantId: goblinId,
      damageRollHoleId: damage.holeId,
      amount: { dice: 1, dieSize: 8 },
    });
    expect(
      resolveBattleSubject({
        state: secondTurn,
        subject: secondRelease,
        fills: [
          targetFill(secondTarget, goblinId),
          attackRollFill(secondRoll, { total: 20, naturalD20: 14 }),
          damageRollFillWithGroups(sourcePenalty, [[1]]),
        ],
      }),
    ).toMatchObject({ tag: "invalid" });
    expect(
      resolveBattleSubject({
        state: secondTurn,
        subject: secondRelease,
        fills: [
          targetFill(secondTarget, goblinId),
          attackRollFill(secondRoll, {
            total: 1,
            naturalD20: 1,
            rollMode: "normal",
          }),
          damageRollFillWithGroups(damage, [[4, 4, 4, 4]]),
        ],
      }),
    ).toMatchObject({ tag: "invalid" });
    expect(
      resolveBattleSubject({
        state: secondTurn,
        subject: secondRelease,
        fills: [
          targetFill(secondTarget, goblinId),
          attackRollFill(secondRoll, { total: 20, naturalD20: 14 }),
          damageRollFillWithGroups(damage, [[4, 4, 4, 4]]),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });
  });

  test("a readied Magic Missile uses allocation and damage without an attack roll", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-complexity-readied-magic-missile"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
      ],
    });
    const readySubject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        wizardId,
        spellSlotInvocationRef("magic_missile", 1, "repeatedDamageAllocation"),
      ),
      mode: { tag: "ready", trigger: "attackHit" },
    };
    const ready = requireResolved(
      resolveBattleSubject({
        state: session.state,
        subject: readySubject,
        fills: [],
      }),
    );
    const nextTurn = requireResolved(
      endTurn({ state: ready.state, actorId: wizardId }),
    ).state;
    const releaseSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: goblinId,
      command: "releaseReadiedSpell",
      readiedSpellCasterId: wizardId,
      procedureRef: readiedSpellProcedureRef(nextTurn),
    };
    const allocation = requireHole(
      resolveBattleSubject({
        state: nextTurn,
        subject: releaseSubject,
        fills: [],
      }),
      "spellTargetAllocation",
    );
    const allocationFill = spellTargetAllocationFill(allocation, [
      { targetId: goblinId, count: 3 },
    ]);
    const damage = requireHole(
      resolveBattleSubject({
        state: nextTurn,
        subject: releaseSubject,
        fills: [allocationFill],
      }),
      "rolledDice",
    );
    expect(
      resolveBattleSubject({
        state: nextTurn,
        subject: releaseSubject,
        fills: [allocationFill, damageRollFillWithGroups(damage, [[1, 1, 1]])],
      }),
    ).toMatchObject({ tag: "resolved" });
  });
});
