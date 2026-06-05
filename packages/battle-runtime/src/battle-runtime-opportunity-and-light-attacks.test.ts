import {
  startBattleRight,
  requireResolved,
  fighterVsGoblinBattle,
  criticalRange19UnitRefs,
  goblinAttackSubject,
  requireHole,
  findHole,
  targetFill,
  attackRollFill,
  interruptDecisionFill,
  movementFill,
  damageRollFill,
  damageRollFillWithGroups,
  attackDamageDispositionFill,
  rolledDiceGroup,
  characterSeed,
  testDaggerAttack,
  testShortswordAttack,
  statBlockCreatureInit,
  reactionModifierUnitRef,
  cuttingWordsResource,
  reactionModifierChoice,
  reactionChoiceWithSubject,
  uncannyDodgeUnit,
  cuttingWordsDamageOnlyUnit,
  oppositionSide,
  fighterId,
  goblinId,
  battleId,
  combatantId,
  difficultyClass,
  discoverBattleActs,
  endTurn,
  resolveBattleInterrupt,
  resolveBattleSubject,
} from "./battle-runtime-test-support.ts";
import type {
  BattleState,
  BattleSubject,
} from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";
import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { sourceDamageRollPenaltyRollHole } from "./battle-reducer/damage-helpers.ts";

describe("battle runtime: Light property and Opportunity Attacks", () => {
  test("Light Property Bonus Action Attack requires a prior Attack action Light weapon attack and omits a positive damage modifier", () => {
    const state = startBattleRight({
      battleId: battleId("battle-off-hand"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: testShortswordAttack(),
          offHandAttack: testDaggerAttack(),
          selectedLoadout: {
            weapon: {
              itemId: "main:weapon_shortsword",
              unitId: "weapon_shortsword",
              grip: "one_handed",
            },
            offHandWeapon: {
              itemId: "off:weapon_dagger",
              unitId: "weapon_dagger",
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject: BattleSubject = {
      tag: "bonusAction",
      actorId: fighterId,
      action: "offHandAttack",
      attackName: "Dagger",
    };

    expect(
      discoverBattleActs(state).map((act) => act.subject),
    ).not.toContainEqual(subject);
    expect(resolveBattleSubject({ state, subject, fills: [] })).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
    });

    const attackSubject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "attack",
      attackName: "Shortsword",
    };
    const attackTarget = requireHole(
      resolveBattleSubject({ state, subject: attackSubject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [targetFill(attackTarget, goblinId)],
      }),
      "attackRoll",
    );
    const afterQualifyingAttack = requireResolved(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(attackTarget, goblinId),
          attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
        ],
      }),
    ).state;

    const target = requireHole(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [],
      }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    expect(damage).toMatchObject({
      label: "Dagger damage (1d4-piercing)",
    });
    expect(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 15, naturalD20: 10 }),
          damageRollFill(damage, 4),
        ],
      }),
    ).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: { bonusActionAvailable: false },
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: goblinId, hp: 6 }),
        ]),
      },
    });
  });

  test("Light Property Bonus Action Attack rejects stale source damage penalty fills", () => {
    const state = startBattleRight({
      battleId: battleId("battle-off-hand-stale-source-penalty"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: testShortswordAttack(),
          offHandAttack: testDaggerAttack(),
          selectedLoadout: {
            weapon: {
              itemId: "main:weapon_shortsword",
              unitId: "weapon_shortsword",
              grip: "one_handed",
            },
            offHandWeapon: {
              itemId: "off:weapon_dagger",
              unitId: "weapon_dagger",
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const attackSubject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "attack",
      attackName: "Shortsword",
    };
    const attackTarget = requireHole(
      resolveBattleSubject({ state, subject: attackSubject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [targetFill(attackTarget, goblinId)],
      }),
      "attackRoll",
    );
    const afterQualifyingAttack = requireResolved(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(attackTarget, goblinId),
          attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
        ],
      }),
    ).state;
    const weakenedFighter = combatantWithSourceDamagePenalty(
      afterQualifyingAttack,
      fighterId,
      goblinId,
    );
    const subject: BattleSubject = {
      tag: "bonusAction",
      actorId: fighterId,
      action: "offHandAttack",
      attackName: "Dagger",
    };
    const target = requireHole(
      resolveBattleSubject({ state: weakenedFighter, subject, fills: [] }),
      "targetChoice",
    );
    const attack = requireHole(
      resolveBattleSubject({
        state: weakenedFighter,
        subject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: weakenedFighter,
        subject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(attack, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    const penaltyRequest = resolveBattleSubject({
      state: weakenedFighter,
      subject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(attack, { total: 15, naturalD20: 10 }),
        damageRollFill(damage, 4),
      ],
    });
    const penalty = requireHole(
      penaltyRequest,
      "rolledDice",
    );
    const stalePenalty = sourceDamageRollPenaltyRollHole({
      sourceSpellId: "ray_of_enfeeblement",
      sourceCombatantId: goblinId,
      affectedCombatantId: fighterId,
      damageRollHoleId: holeId("battle:test:offhand-stale-source-penalty"),
      amount: { dice: 1, dieSize: 8 },
    });
    expect(
      resolveBattleSubject({
        state: weakenedFighter,
        subject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(attack, { total: 1, naturalD20: 1 }),
          damageRollFillWithGroups(stalePenalty, [[1]]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Light Property Bonus Action Attack damage can only be filled after a hit.",
    });

    expect(
      resolveBattleSubject({
        state: weakenedFighter,
        subject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(attack, { total: 15, naturalD20: 10 }),
          damageRollFill(damage, 4),
          damageRollFillWithGroups(penalty, [[2]]),
          damageRollFillWithGroups(stalePenalty, [[1]]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Source damage roll penalty does not match an active source-side damage penalty.",
    });
  });

  test("Light Property Bonus Action Attack opens hit-triggered Reaction replay and spends the Bonus Action", () => {
    const rogueTargetId = combatantId("rogue-target");
    const state = startBattleRight({
      battleId: battleId("battle-off-hand-hit-reaction"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: testShortswordAttack(),
          offHandAttack: testDaggerAttack(),
          selectedLoadout: {
            weapon: {
              itemId: "main:weapon_shortsword",
              unitId: "weapon_shortsword",
              grip: "one_handed",
            },
            offHandWeapon: {
              itemId: "off:weapon_dagger",
              unitId: "weapon_dagger",
            },
          },
        }),
        statBlockCreatureInit({ initiative: 15 }),
        characterSeed({
          combatantId: rogueTargetId,
          displayName: "Rogue Target",
          initiative: 10,
          side: oppositionSide,
          classLevels: [{ className: "rogue", level: 5 }],
          attack: null,
          unitFeatures: [{ unit: uncannyDodgeUnit() }],
          characterUnitRefs: [reactionModifierUnitRef("rogue_uncanny_dodge")],
        }),
      ],
    });
    const attackSubject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "attack",
      attackName: "Shortsword",
    };
    const attackTarget = requireHole(
      resolveBattleSubject({ state, subject: attackSubject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [targetFill(attackTarget, goblinId)],
      }),
      "attackRoll",
    );
    const afterQualifyingAttack = requireResolved(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(attackTarget, goblinId),
          attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
        ],
      }),
    ).state;
    const subject: BattleSubject = {
      tag: "bonusAction",
      actorId: fighterId,
      action: "offHandAttack",
      attackName: "Dagger",
    };
    const target = requireHole(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [],
      }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [targetFill(target, rogueTargetId)],
      }),
      "attackRoll",
    );
    const awaitingReaction = resolveBattleSubject({
      state: afterQualifyingAttack,
      subject,
      fills: [
        targetFill(target, rogueTargetId),
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(
        "Expected Light Property Bonus Action Attack hit Reaction window.",
      );
    }
    expect(awaitingReaction).toMatchObject({
      holes: [{ kind: "interruptDecision", trigger: "attackHit" }],
    });

    const afterReaction = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        findHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: rogueTargetId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: "rogue_uncanny_dodge",
            modifierKind: "attackDamageReduction",
            fills: [],
          },
        },
      ),
    });
    if (afterReaction.tag !== "needsHoles") {
      throw new Error(
        "Expected Light Property Bonus Action Attack damage roll after Reaction.",
      );
    }
    const damage = requireHole(afterReaction, "rolledDice");
    const completed = resolveBattleSubject({
      state: afterReaction.state,
      subject,
      fills: [
        targetFill(target, rogueTargetId),
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
        damageRollFill(damage, 4),
      ],
    });

    if (completed.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${completed.tag}.`);
    }
    expect(completed.snapshot.turn.bonusActionAvailable).toBe(false);
    expect(completed.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: rogueTargetId,
          hp: 10,
          reactionAvailable: false,
        }),
      ]),
    );
  });

  test("admitted authored critical-range support makes a natural 19 Light Property Bonus Action Attack critical", () => {
    const state = startBattleRight({
      battleId: battleId("battle-off-hand-critical-range"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: criticalRange19UnitRefs(),
          attack: testShortswordAttack(),
          offHandAttack: testDaggerAttack(),
          selectedLoadout: {
            weapon: {
              itemId: "main:weapon_shortsword",
              unitId: "weapon_shortsword",
              grip: "one_handed",
            },
            offHandWeapon: {
              itemId: "off:weapon_dagger",
              unitId: "weapon_dagger",
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const attackSubject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "attack",
      attackName: "Shortsword",
    };
    const attackTarget = requireHole(
      resolveBattleSubject({ state, subject: attackSubject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [targetFill(attackTarget, goblinId)],
      }),
      "attackRoll",
    );
    const afterQualifyingAttack = requireResolved(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(attackTarget, goblinId),
          attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
        ],
      }),
    ).state;
    const subject: BattleSubject = {
      tag: "bonusAction",
      actorId: fighterId,
      action: "offHandAttack",
      attackName: "Dagger",
    };
    const target = requireHole(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [],
      }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 1, naturalD20: 19 }),
        ],
      }),
      "rolledDice",
    );

    expect(damage).toMatchObject({
      critical: true,
      label: "Dagger damage (2d4-piercing)",
    });
    expect(
      resolveBattleSubject({
        state: afterQualifyingAttack,
        subject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 1, naturalD20: 19 }),
          damageRollFillWithGroups(damage, [[2, 3]]),
        ],
      }),
    ).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: goblinId, hp: 5 }),
        ]),
      },
    });
  });

  test("Light Property Bonus Action Attack distinguishes held weapon identity from weapon kind", () => {
    const state = startBattleRight({
      battleId: battleId("battle-off-hand-two-daggers"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: testDaggerAttack(),
          offHandAttack: testDaggerAttack(),
          selectedLoadout: {
            weapon: {
              itemId: "main:dagger-1",
              unitId: "weapon_dagger",
              grip: "one_handed",
            },
            offHandWeapon: {
              itemId: "off:dagger-2",
              unitId: "weapon_dagger",
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const attackSubject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "attack",
      attackName: "Dagger",
    };
    const target = requireHole(
      resolveBattleSubject({ state, subject: attackSubject, fills: [] }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );
    const afterMainDagger = requireResolved(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 1, naturalD20: 1 }),
        ],
      }),
    ).state;

    expect(
      discoverBattleActs(afterMainDagger).map((act) => act.subject),
    ).toContainEqual({
      tag: "bonusAction",
      actorId: fighterId,
      action: "offHandAttack",
      attackName: "Dagger",
    });
  });

  test("table-provided reach-exit movement facts open an Opportunity Attack window", () => {
    const state = fighterVsGoblinBattle();
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        movementFill(hole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [
            { reactorId: goblinId, attackName: "Scimitar" },
          ],
        }),
      ],
    });

    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "opportunityAttack" }],
      snapshot: {
        pendingInterrupt: {
          choices: [
            {
              kind: "opportunityAttack",
              reactorId: goblinId,
              subject: {
                command: "opportunityAttack",
                reactorId: goblinId,
                targetId: fighterId,
                attackName: "Scimitar",
              },
            },
          ],
        },
      },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
  });

  test("attack target facts are scoped to the selected attack option and range band", () => {
    const state = requireResolved(
      endTurn({ state: fighterVsGoblinBattle(), actorId: fighterId }),
    ).state;
    const subject = goblinAttackSubject("Shortbow");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, fighterId, [
            {
              kind: "attackTargetInMeleeReach",
              actorId: goblinId,
              targetId: fighterId,
              attackName: "Scimitar",
            },
          ]),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, fighterId, [
            {
              kind: "attackTargetInRangedRange",
              actorId: goblinId,
              targetId: fighterId,
              attackName: "Shortbow",
              rangeBand: "normal",
            },
          ]),
        ],
      }),
    ).toMatchObject({ tag: "needsHoles", holes: [{ kind: "attackRoll" }] });
  });

  test("long-range attack target facts are legal and require Disadvantage", () => {
    const state = requireResolved(
      endTurn({ state: fighterVsGoblinBattle(), actorId: fighterId }),
    ).state;
    const subject = goblinAttackSubject("Shortbow");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const longRangeTargetFill = targetFill(target, fighterId, [
      {
        kind: "attackTargetInRangedRange",
        actorId: goblinId,
        targetId: fighterId,
        attackName: "Shortbow",
        rangeBand: "long",
      },
    ]);

    const afterTarget = resolveBattleSubject({
      state,
      subject,
      fills: [longRangeTargetFill],
    });

    expect(afterTarget).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "attackRoll", rollMode: "disadvantage" }],
    });
    const attackRoll = requireHole(afterTarget, "attackRoll");
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          longRangeTargetFill,
          attackRollFill(attackRoll, {
            total: 16,
            naturalD20: 14,
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Attack roll mode does not match the current attack-roll rule.",
    });
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          longRangeTargetFill,
          attackRollFill(attackRoll, {
            total: 16,
            naturalD20: 14,
            rollMode: "disadvantage",
          }),
        ],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
    });
  });

  test("contradictory range bands for the same attack target are rejected", () => {
    const state = requireResolved(
      endTurn({ state: fighterVsGoblinBattle(), actorId: fighterId }),
    ).state;
    const subject = goblinAttackSubject("Shortbow");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const normalRangeFact = {
      kind: "attackTargetInRangedRange" as const,
      actorId: goblinId,
      targetId: fighterId,
      attackName: "Shortbow",
      rangeBand: "normal" as const,
    };
    const longRangeFact = {
      ...normalRangeFact,
      rangeBand: "long" as const,
    };

    for (const spatialFacts of [
      [normalRangeFact, longRangeFact],
      [longRangeFact, normalRangeFact],
    ] as const) {
      expect(
        resolveBattleSubject({
          state,
          subject,
          fills: [targetFill(target, fighterId, spatialFacts)],
        }),
      ).toMatchObject({
        tag: "invalid",
        reason: "invalidFill",
        message:
          "Attack target range facts must contain at most one range band for each actor, target, and attack.",
      });
    }
  });

  test("long-range Disadvantage cancels with an Advantage source", () => {
    const goblinTurn = requireResolved(
      endTurn({ state: fighterVsGoblinBattle(), actorId: fighterId }),
    ).state;
    const goblin = goblinTurn.combatants.get(goblinId);
    if (goblin === undefined) {
      throw new Error("Expected Goblin combatant.");
    }
    const hiddenGoblinTurn: BattleState = {
      ...goblinTurn,
      combatants: new Map(goblinTurn.combatants).set(goblinId, {
        ...goblin,
        hidden: { discoveryDc: difficultyClass(16) },
      }),
    };
    const subject = goblinAttackSubject("Shortbow");
    const target = requireHole(
      resolveBattleSubject({ state: hiddenGoblinTurn, subject, fills: [] }),
      "targetChoice",
    );
    const longRangeTargetFill = targetFill(target, fighterId, [
      {
        kind: "attackTargetInRangedRange",
        actorId: goblinId,
        targetId: fighterId,
        attackName: "Shortbow",
        rangeBand: "long",
      },
    ]);

    const afterTarget = resolveBattleSubject({
      state: hiddenGoblinTurn,
      subject,
      fills: [longRangeTargetFill],
    });

    const attackRoll = requireHole(afterTarget, "attackRoll");
    expect(attackRoll).not.toHaveProperty("rollMode");
    expect(
      resolveBattleSubject({
        state: hiddenGoblinTurn,
        subject,
        fills: [
          longRangeTargetFill,
          attackRollFill(attackRoll, {
            total: 16,
            naturalD20: 14,
          }),
        ],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
    });
  });

  test("Opportunity Attack movement facts must name a qualifying melee option", () => {
    const state = fighterVsGoblinBattle();
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          movementFill(hole, {
            movementCostFeet: 5,
            provokedOpportunityAttacks: [
              { reactorId: goblinId, attackName: "Shortbow" },
            ],
          }),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
  });

  test("stale movement fill data cannot suppress an Opportunity Attack", () => {
    const state = fighterVsGoblinBattle();
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );
    const staleMovementValue = {
      movementCostFeet: 5,
      provokedOpportunityAttacks: [
        { reactorId: goblinId, attackName: "Scimitar" },
      ],
      provokesOpportunityAttacks: false,
    };
    const staleSuppressionFill = movementFill(hole, staleMovementValue);

    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [staleSuppressionFill],
    });

    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "opportunityAttack" }],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
  });

  test("declining an Opportunity Attack resumes the interrupted movement", () => {
    const state = fighterVsGoblinBattle();
    const subject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        movementFill(hole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [
            { reactorId: goblinId, attackName: "Scimitar" },
          ],
        }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }

    const declined = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        awaitingReaction.snapshot.pendingInterrupt!.decisionHole,
        { kind: "decline", responderId: goblinId },
      ),
    });

    if (declined.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${declined.tag}.`);
    }
    expect(declined.snapshot.pendingInterrupt).toBeNull();
    expect(declined.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: fighterId,
          movement: expect.objectContaining({
            spentFeet: 5,
            remainingFeet: 25,
          }),
        }),
        expect.objectContaining({
          combatantId: goblinId,
          reactionAvailable: true,
        }),
      ]),
    );
  });

  test("resolving an Opportunity Attack spends reaction, applies damage, then resumes movement", () => {
    const state = fighterVsGoblinBattle();
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const moveHole = requireHole(
      resolveBattleSubject({ state, subject: moveSubject, fills: [] }),
      "movement",
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject: moveSubject,
      fills: [
        movementFill(moveHole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [
            { reactorId: goblinId, attackName: "Scimitar" },
          ],
        }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
    const choice = reactionChoiceWithSubject(
      awaitingReaction.snapshot.pendingInterrupt!.choices,
    );
    const startedReaction = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        awaitingReaction.snapshot.pendingInterrupt!.decisionHole,
        {
          kind: "resolve",
          responderId: goblinId,
          choice: {
            kind: "opportunityAttack",
            reactorId: goblinId,
            fills: [],
          },
        },
      ),
    });
    expect(startedReaction).toMatchObject({
      tag: "needsHoles",
      subject: choice.subject,
      holes: [{ kind: "attackRoll" }],
    });
    if (startedReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${startedReaction.tag}.`);
    }

    const attackRoll = findHole(startedReaction.holes, "attackRoll");
    const damage = requireHole(
      resolveBattleSubject({
        state: startedReaction.state,
        subject: choice.subject,
        fills: [attackRollFill(attackRoll, { total: 20, naturalD20: 18 })],
      }),
      "rolledDice",
    );
    const completed = resolveBattleSubject({
      state: startedReaction.state,
      subject: choice.subject,
      fills: [
        attackRollFill(attackRoll, { total: 20, naturalD20: 18 }),
        damageRollFill(damage, 4),
      ],
    });

    if (completed.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${completed.tag}.`);
    }
    expect(completed.snapshot.pendingInterrupt).toBeNull();
    expect(completed.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: fighterId,
          hp: 6,
          movement: expect.objectContaining({
            spentFeet: 5,
            remainingFeet: 25,
          }),
        }),
        expect.objectContaining({
          combatantId: goblinId,
          reactionAvailable: false,
        }),
      ]),
    );
  });

  test("Opportunity Attack rejects stale source damage penalty fills", () => {
    const state = combatantWithSourceDamagePenalty(
      fighterVsGoblinBattle(),
      goblinId,
      fighterId,
    );
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const moveHole = requireHole(
      resolveBattleSubject({ state, subject: moveSubject, fills: [] }),
      "movement",
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject: moveSubject,
      fills: [
        movementFill(moveHole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [
            { reactorId: goblinId, attackName: "Scimitar" },
          ],
        }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
    const choice = reactionChoiceWithSubject(
      awaitingReaction.snapshot.pendingInterrupt!.choices,
    );
    const startedReaction = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        awaitingReaction.snapshot.pendingInterrupt!.decisionHole,
        {
          kind: "resolve",
          responderId: goblinId,
          choice: {
            kind: "opportunityAttack",
            reactorId: goblinId,
            fills: [],
          },
        },
      ),
    });
    if (startedReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${startedReaction.tag}.`);
    }
    const attackRoll = findHole(startedReaction.holes, "attackRoll");
    const damage = requireHole(
      resolveBattleSubject({
        state: startedReaction.state,
        subject: choice.subject,
        fills: [attackRollFill(attackRoll, { total: 20, naturalD20: 18 })],
      }),
      "rolledDice",
    );
    const penaltyRequest = resolveBattleSubject({
      state: startedReaction.state,
      subject: choice.subject,
      fills: [
        attackRollFill(attackRoll, { total: 20, naturalD20: 18 }),
        damageRollFill(damage, 4),
      ],
    });
    const penalty = requireHole(penaltyRequest, "rolledDice");
    const stalePenalty = sourceDamageRollPenaltyRollHole({
      sourceSpellId: "ray_of_enfeeblement",
      sourceCombatantId: fighterId,
      affectedCombatantId: goblinId,
      damageRollHoleId: holeId("battle:test:oa-stale-source-penalty"),
      amount: { dice: 1, dieSize: 8 },
    });
    expect(
      resolveBattleSubject({
        state: startedReaction.state,
        subject: choice.subject,
        fills: [
          attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
          damageRollFillWithGroups(stalePenalty, [[1]]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Opportunity Attack damage can only be filled after a hit.",
    });

    expect(
      resolveBattleSubject({
        state: startedReaction.state,
        subject: choice.subject,
        fills: [
          attackRollFill(attackRoll, { total: 20, naturalD20: 18 }),
          damageRollFill(damage, 4),
          damageRollFillWithGroups(penalty, [[2]]),
          damageRollFillWithGroups(stalePenalty, [[1]]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Source damage roll penalty does not match an active source-side damage penalty.",
    });
  });

  test("Opportunity Attack opens attack-damage Reaction windows before movement resumes", () => {
    const cuttingWordsDamageOnly = cuttingWordsDamageOnlyUnit();
    const state = startBattleRight({
      battleId: battleId("battle-opportunity-attack-damage-reaction"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "bard", level: 3 }],
          resources: [cuttingWordsResource({ unit: cuttingWordsDamageOnly })],
          unitFeatures: [cuttingWordsDamageOnly].map((unit) => ({ unit })),
          characterUnitRefs: [
            reactionModifierUnitRef(cuttingWordsDamageOnly.id),
          ],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const moveHole = requireHole(
      resolveBattleSubject({ state, subject: moveSubject, fills: [] }),
      "movement",
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject: moveSubject,
      fills: [
        movementFill(moveHole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [
            { reactorId: goblinId, attackName: "Scimitar" },
          ],
        }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
    const choice = reactionChoiceWithSubject(
      awaitingReaction.snapshot.pendingInterrupt!.choices,
    );
    const startedReaction = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        awaitingReaction.snapshot.pendingInterrupt!.decisionHole,
        {
          kind: "resolve",
          responderId: goblinId,
          choice: {
            kind: "opportunityAttack",
            reactorId: goblinId,
            fills: [],
          },
        },
      ),
    });
    if (startedReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${startedReaction.tag}.`);
    }
    const attackRoll = findHole(startedReaction.holes, "attackRoll");
    const damage = requireHole(
      resolveBattleSubject({
        state: startedReaction.state,
        subject: choice.subject,
        fills: [attackRollFill(attackRoll, { total: 20, naturalD20: 18 })],
      }),
      "rolledDice",
    );

    const awaitingDamageReaction = resolveBattleSubject({
      state: startedReaction.state,
      subject: choice.subject,
      fills: [
        attackRollFill(attackRoll, { total: 20, naturalD20: 18 }),
        damageRollFill(damage, 6),
      ],
    });
    if (awaitingDamageReaction.tag !== "needsHoles") {
      throw new Error("Expected Opportunity Attack damage Reaction window.");
    }
    expect(awaitingDamageReaction).toMatchObject({
      holes: [{ kind: "interruptDecision", trigger: "attackDamage" }],
    });

    const damageChoice = reactionModifierChoice(
      awaitingDamageReaction.snapshot.pendingInterrupt!.choices,
      cuttingWordsDamageOnly.id,
      "damageRollReduction",
    );
    const completed = resolveBattleInterrupt({
      state: awaitingDamageReaction.state,
      fill: interruptDecisionFill(
        findHole(awaitingDamageReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: cuttingWordsDamageOnly.id,
            modifierKind: "damageRollReduction",
            fills: [
              {
                kind: "rolledDice",
                holeId: damageChoice.initialHoles[0]!.holeId,
                value: [rolledDiceGroup([3])],
              },
            ],
          },
        },
      ),
    });

    if (completed.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${completed.tag}.`);
    }
    expect(completed.snapshot.pendingInterrupt).toBeNull();
    expect(completed.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: fighterId,
          hp: 7,
          reactionAvailable: false,
          movement: expect.objectContaining({
            spentFeet: 5,
            remainingFeet: 25,
          }),
        }),
        expect.objectContaining({
          combatantId: goblinId,
          reactionAvailable: false,
        }),
      ]),
    );
  });

  test("Opportunity Attack attack-hit damage reductions apply before movement resumes", () => {
    const state = startBattleRight({
      battleId: battleId("battle-opportunity-attack-hit-reduction"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "rogue", level: 5 }],
          unitFeatures: [{ unit: uncannyDodgeUnit() }],
          characterUnitRefs: [reactionModifierUnitRef("rogue_uncanny_dodge")],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const moveHole = requireHole(
      resolveBattleSubject({ state, subject: moveSubject, fills: [] }),
      "movement",
    );
    const awaitingOpportunityAttack = resolveBattleSubject({
      state,
      subject: moveSubject,
      fills: [
        movementFill(moveHole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [
            { reactorId: goblinId, attackName: "Scimitar" },
          ],
        }),
      ],
    });
    if (awaitingOpportunityAttack.tag !== "needsHoles") {
      throw new Error("Expected Opportunity Attack Reaction window.");
    }
    const opportunityAttackChoice = reactionChoiceWithSubject(
      awaitingOpportunityAttack.snapshot.pendingInterrupt!.choices,
    );
    const startedOpportunityAttack = resolveBattleInterrupt({
      state: awaitingOpportunityAttack.state,
      fill: interruptDecisionFill(
        findHole(awaitingOpportunityAttack.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: goblinId,
          choice: {
            kind: "opportunityAttack",
            reactorId: goblinId,
            fills: [],
          },
        },
      ),
    });
    if (startedOpportunityAttack.tag !== "needsHoles") {
      throw new Error("Expected Opportunity Attack roll hole.");
    }
    const attackRoll = findHole(startedOpportunityAttack.holes, "attackRoll");
    const awaitingHitReaction = resolveBattleSubject({
      state: startedOpportunityAttack.state,
      subject: opportunityAttackChoice.subject,
      fills: [attackRollFill(attackRoll, { total: 20, naturalD20: 18 })],
    });
    if (awaitingHitReaction.tag !== "needsHoles") {
      throw new Error("Expected Opportunity Attack hit Reaction window.");
    }
    const afterUncannyDodge = resolveBattleInterrupt({
      state: awaitingHitReaction.state,
      fill: interruptDecisionFill(
        findHole(awaitingHitReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: "rogue_uncanny_dodge",
            modifierKind: "attackDamageReduction",
            fills: [],
          },
        },
      ),
    });
    if (afterUncannyDodge.tag !== "needsHoles") {
      throw new Error(
        "Expected Opportunity Attack damage roll after Uncanny Dodge.",
      );
    }
    const damage = requireHole(afterUncannyDodge, "rolledDice");
    const completed = resolveBattleSubject({
      state: afterUncannyDodge.state,
      subject: opportunityAttackChoice.subject,
      fills: [
        attackRollFill(attackRoll, { total: 20, naturalD20: 18 }),
        damageRollFill(damage, 6),
      ],
    });

    if (completed.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${completed.tag}.`);
    }
    expect(completed.snapshot.pendingInterrupt).toBeNull();
    expect(completed.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: fighterId,
          hp: 8,
          reactionAvailable: false,
          movement: expect.objectContaining({ spentFeet: 5 }),
        }),
        expect.objectContaining({
          combatantId: goblinId,
          reactionAvailable: false,
        }),
      ]),
    );
  });

  test("Opportunity Attack attack-hit damage reductions narrow Knock Out disposition eligibility", () => {
    const state = startBattleRight({
      battleId: battleId("battle-opportunity-attack-hit-reduction-ko-gate"),
      combatants: [
        characterSeed({
          initiative: 20,
          currentHp: 5,
          classLevels: [{ className: "rogue", level: 5 }],
          unitFeatures: [{ unit: uncannyDodgeUnit() }],
          characterUnitRefs: [reactionModifierUnitRef("rogue_uncanny_dodge")],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const moveHole = requireHole(
      resolveBattleSubject({ state, subject: moveSubject, fills: [] }),
      "movement",
    );
    const awaitingOpportunityAttack = resolveBattleSubject({
      state,
      subject: moveSubject,
      fills: [
        movementFill(moveHole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [
            { reactorId: goblinId, attackName: "Scimitar" },
          ],
        }),
      ],
    });
    if (awaitingOpportunityAttack.tag !== "needsHoles") {
      throw new Error("Expected Opportunity Attack Reaction window.");
    }
    const opportunityAttackChoice = reactionChoiceWithSubject(
      awaitingOpportunityAttack.snapshot.pendingInterrupt!.choices,
    );
    const startedOpportunityAttack = resolveBattleInterrupt({
      state: awaitingOpportunityAttack.state,
      fill: interruptDecisionFill(
        findHole(awaitingOpportunityAttack.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: goblinId,
          choice: {
            kind: "opportunityAttack",
            reactorId: goblinId,
            fills: [],
          },
        },
      ),
    });
    if (startedOpportunityAttack.tag !== "needsHoles") {
      throw new Error("Expected Opportunity Attack roll hole.");
    }
    const attackRoll = findHole(startedOpportunityAttack.holes, "attackRoll");
    const awaitingHitReaction = resolveBattleSubject({
      state: startedOpportunityAttack.state,
      subject: opportunityAttackChoice.subject,
      fills: [attackRollFill(attackRoll, { total: 20, naturalD20: 18 })],
    });
    if (awaitingHitReaction.tag !== "needsHoles") {
      throw new Error("Expected Opportunity Attack hit Reaction window.");
    }
    const afterUncannyDodge = resolveBattleInterrupt({
      state: awaitingHitReaction.state,
      fill: interruptDecisionFill(
        findHole(awaitingHitReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: "rogue_uncanny_dodge",
            modifierKind: "attackDamageReduction",
            fills: [],
          },
        },
      ),
    });
    if (afterUncannyDodge.tag !== "needsHoles") {
      throw new Error(
        "Expected Opportunity Attack damage roll after Uncanny Dodge.",
      );
    }
    const damage = requireHole(afterUncannyDodge, "rolledDice");
    const completed = resolveBattleSubject({
      state: afterUncannyDodge.state,
      subject: opportunityAttackChoice.subject,
      fills: [
        attackRollFill(attackRoll, { total: 20, naturalD20: 18 }),
        damageRollFill(damage, 6),
      ],
    });

    if (completed.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${completed.tag}.`);
    }
    expect(completed.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: fighterId,
          hp: 1,
          reactionAvailable: false,
          conditions: [],
        }),
      ]),
    );
  });

  test("Opportunity Attack exposes Knock Out as an attack damage disposition", () => {
    const state = startBattleRight({
      battleId: battleId("battle-opportunity-attack-knock-out"),
      combatants: [
        characterSeed({ initiative: 20, currentHp: 3 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const moveHole = requireHole(
      resolveBattleSubject({ state, subject: moveSubject, fills: [] }),
      "movement",
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject: moveSubject,
      fills: [
        movementFill(moveHole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [
            { reactorId: goblinId, attackName: "Scimitar" },
          ],
        }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
    const choice = reactionChoiceWithSubject(
      awaitingReaction.snapshot.pendingInterrupt!.choices,
    );
    const startedReaction = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        awaitingReaction.snapshot.pendingInterrupt!.decisionHole,
        {
          kind: "resolve",
          responderId: goblinId,
          choice: {
            kind: "opportunityAttack",
            reactorId: goblinId,
            fills: [],
          },
        },
      ),
    });
    if (startedReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${startedReaction.tag}.`);
    }

    const attackRoll = findHole(startedReaction.holes, "attackRoll");
    const damage = requireHole(
      resolveBattleSubject({
        state: startedReaction.state,
        subject: choice.subject,
        fills: [attackRollFill(attackRoll, { total: 20, naturalD20: 18 })],
      }),
      "rolledDice",
    );
    const disposition = requireHole(
      resolveBattleSubject({
        state: startedReaction.state,
        subject: choice.subject,
        fills: [
          attackRollFill(attackRoll, { total: 20, naturalD20: 18 }),
          damageRollFill(damage, 1),
        ],
      }),
      "attackDamageDisposition",
    );

    expect(disposition).toMatchObject({
      kind: "attackDamageDisposition",
      attackerId: goblinId,
      targetId: fighterId,
      choices: [{ kind: "ordinaryDamage" }, { kind: "knockOut" }],
    });

    const completed = resolveBattleSubject({
      state: startedReaction.state,
      subject: choice.subject,
      fills: [
        attackRollFill(attackRoll, { total: 20, naturalD20: 18 }),
        damageRollFill(damage, 1),
        attackDamageDispositionFill(disposition, { kind: "knockOut" }),
      ],
    });

    expect(completed).toMatchObject({
      tag: "resolved",
      snapshot: {
        pendingInterrupt: null,
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: fighterId,
            hp: 1,
            conditions: expect.arrayContaining(["unconscious", "prone"]),
          }),
          expect.objectContaining({
            combatantId: goblinId,
            reactionAvailable: false,
          }),
        ]),
      },
    });
  });

  test("hidden opportunity attackers roll with Advantage and reveal after the attack roll", () => {
    const base = fighterVsGoblinBattle();
    const goblin = base.combatants.get(goblinId)!;
    const state: BattleState = {
      ...base,
      combatants: new Map(base.combatants).set(goblinId, {
        ...goblin,
        hidden: { discoveryDc: difficultyClass(16) },
      }),
    };
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const moveHole = requireHole(
      resolveBattleSubject({ state, subject: moveSubject, fills: [] }),
      "movement",
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject: moveSubject,
      fills: [
        movementFill(moveHole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [
            { reactorId: goblinId, attackName: "Scimitar" },
          ],
        }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingReaction.tag}.`);
    }
    const choice = reactionChoiceWithSubject(
      awaitingReaction.snapshot.pendingInterrupt!.choices,
    );
    const startedReaction = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        awaitingReaction.snapshot.pendingInterrupt!.decisionHole,
        {
          kind: "resolve",
          responderId: goblinId,
          choice: {
            kind: "opportunityAttack",
            reactorId: goblinId,
            fills: [],
          },
        },
      ),
    });
    if (startedReaction.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${startedReaction.tag}.`);
    }
    const attackRoll = requireHole(startedReaction, "attackRoll");
    expect(attackRoll).toMatchObject({ rollMode: "advantage" });

    const missed = requireResolved(
      resolveBattleSubject({
        state: startedReaction.state,
        subject: choice.subject,
        fills: [
          attackRollFill(attackRoll, {
            total: 1,
            naturalD20: 1,
            rollMode: "advantage",
          }),
        ],
      }),
    );
    expect(missed.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: goblinId }),
      ]),
    );
    expect(missed.state.combatants.get(goblinId)?.hidden).toBeNull();
  });
});

function combatantWithSourceDamagePenalty(
  state: BattleState,
  affectedId: typeof fighterId | typeof goblinId,
  sourceId: typeof fighterId | typeof goblinId,
): BattleState {
  const affected = state.combatants.get(affectedId);
  if (affected === undefined) {
    throw new Error("Expected affected combatant.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(affectedId, {
      ...affected,
      activeEffects: [
        ...affected.activeEffects,
        {
          kind: "sourceDamageRollPenalty" as const,
          sourceSpellId: "ray_of_enfeeblement",
          sourceCombatantId: sourceId,
          amount: { dice: 1 as const, dieSize: 8 as const },
          expiresAt: {
            kind: "concentration" as const,
            combatantId: sourceId,
          },
        },
      ],
    }),
  };
}
