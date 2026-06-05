import {
  requireElapsedHours,
  requireResolved,
  requireBardicInspirationD20TestResolved,
  findHole,
  findAct,
  targetFill,
  interruptDecisionFill,
  rolledDiceGroup,
  cuttingWordsResource,
  bardicInspirationUnit,
  bardicInspirationSubject,
  bardicInspirationBattle,
  bardicInspirationTargetFill,
  grantBardicInspirationToGoblin,
  combatantHasBardicInspirationDie,
  bardicInspirationStaleTargetHole,
  characterResourceUses,
  goblinAttacksReactionModifierCharacter,
  goblinScimitarHitReactionSetup,
  reactionModifierChoice,
  cuttingWordsUnit,
  cuttingWordsAttackOnlyUnit,
  unsupportedAbilityModifierActivationUnit,
  fighterId,
  goblinId,
  armorClass,
  characterBattleResourceSupportedForUnit,
  DieRollResult,
  difficultyClass,
  discoverBattleActs,
  resolveBardicInspirationFailedD20Test,
  resolveBattleInterrupt,
  resolveBattleSubject,
  resourceCount,
  sameBattleSubject,
} from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: Bardic Inspiration", () => {
  test("Bardic Inspiration grants one one-hour d6 die at Bard level 1 and spends Bonus Action and Charisma-derived use", () => {
    const bardicInspiration = bardicInspirationUnit();
    const state = bardicInspirationBattle({ charismaModifier: 3 });
    const subject = bardicInspirationSubject(bardicInspiration.id);
    const target = findHole(
      findAct(state, subject).initialHoles,
      "targetChoice",
    );

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [bardicInspirationTargetFill(target, goblinId)],
      }),
    );

    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(
      resolved.state.combatants.get(fighterId)?.origin.kind === "character"
        ? resolved.state.combatants.get(fighterId)?.origin.resources
        : [],
    ).toEqual([
      expect.objectContaining({
        unit: expect.objectContaining({ id: bardicInspiration.id }),
        usesRemaining: resourceCount(2),
      }),
    ]);
    expect(resolved.state.combatants.get(goblinId)?.activeEffects).toEqual([
      {
        kind: "bardicInspirationDie",
        sourceUnitId: bardicInspiration.id,
        sourceCombatantId: fighterId,
        dieSize: 6,
        expiresAt: {
          kind: "duration",
          durationTicks: requireElapsedHours(1),
        },
      },
    ]);
  });

  test("Bardic Inspiration grants the SRD-scaled die at later Bard levels", () => {
    const bardicInspiration = bardicInspirationUnit();
    const state = bardicInspirationBattle({
      bardLevel: 15,
      charismaModifier: 3,
    });
    const subject = bardicInspirationSubject(bardicInspiration.id);
    const target = findHole(
      findAct(state, subject).initialHoles,
      "targetChoice",
    );

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [bardicInspirationTargetFill(target, goblinId)],
      }),
    );

    expect(resolved.state.combatants.get(goblinId)?.activeEffects).toEqual([
      expect.objectContaining({
        kind: "bardicInspirationDie",
        dieSize: 12,
      }),
    ]);
  });

  test("Bardic Inspiration use count observes Charisma modifier minimum", () => {
    const highCharisma = bardicInspirationBattle({ charismaModifier: 4 });
    const lowCharisma = bardicInspirationBattle({ charismaModifier: -1 });

    expect(characterResourceUses(highCharisma, fighterId)).toEqual([
      resourceCount(4),
    ]);
    expect(characterResourceUses(lowCharisma, fighterId)).toEqual([
      resourceCount(1),
    ]);
  });

  test("ability-modifier battle resources require a supported battle profile", () => {
    expect(
      characterBattleResourceSupportedForUnit(bardicInspirationUnit()),
    ).toBe(true);
    expect(characterBattleResourceSupportedForUnit(cuttingWordsUnit())).toBe(
      true,
    );
    expect(
      characterBattleResourceSupportedForUnit(
        unsupportedAbilityModifierActivationUnit(),
      ),
    ).toBe(false);
  });

  test("Bardic Inspiration rejects missing range facts before spending resources", () => {
    const bardicInspiration = bardicInspirationUnit();
    const state = bardicInspirationBattle({ charismaModifier: 3 });
    const subject = bardicInspirationSubject(bardicInspiration.id);
    const target = findHole(
      findAct(state, subject).initialHoles,
      "targetChoice",
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, goblinId, [])],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Bardic Inspiration target must be within 60 feet.",
    });
    expect(characterResourceUses(state, fighterId)).toEqual([resourceCount(3)]);
  });

  test("Bardic Inspiration accepts hearing when the target cannot see the Bard", () => {
    const bardicInspiration = bardicInspirationUnit();
    const state = bardicInspirationBattle({
      charismaModifier: 1,
      bardHidden: true,
    });
    const subject = bardicInspirationSubject(bardicInspiration.id);
    const target = findHole(
      findAct(state, subject).initialHoles,
      "targetChoice",
    );

    expect(
      requireResolved(
        resolveBattleSubject({
          state,
          subject,
          fills: [
            bardicInspirationTargetFill(target, goblinId, {
              canHear: true,
            }),
          ],
        }),
      ).state.combatants.get(goblinId)?.activeEffects,
    ).toEqual([
      expect.objectContaining({
        kind: "bardicInspirationDie",
        sourceUnitId: bardicInspiration.id,
      }),
    ]);
  });

  test("Bardic Inspiration rejects a Blinded target without a hearing fact", () => {
    const bardicInspiration = bardicInspirationUnit();
    const state = bardicInspirationBattle({
      charismaModifier: 1,
      targetConditions: ["blinded"],
    });
    const subject = bardicInspirationSubject(bardicInspiration.id);
    const target = findHole(
      findAct(state, subject).initialHoles,
      "targetChoice",
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [bardicInspirationTargetFill(target, goblinId)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Bardic Inspiration target must be able to see or hear the Bard.",
    });
  });

  test("Bardic Inspiration accepts Blinded hearing but rejects Deafened hearing", () => {
    const bardicInspiration = bardicInspirationUnit();
    const subject = bardicInspirationSubject(bardicInspiration.id);
    const blinded = bardicInspirationBattle({
      charismaModifier: 1,
      targetConditions: ["blinded"],
    });
    const blindedTarget = findHole(
      findAct(blinded, subject).initialHoles,
      "targetChoice",
    );

    expect(
      requireResolved(
        resolveBattleSubject({
          state: blinded,
          subject,
          fills: [
            bardicInspirationTargetFill(blindedTarget, goblinId, {
              canHear: true,
            }),
          ],
        }),
      ).state.combatants.get(goblinId)?.activeEffects,
    ).toEqual([
      expect.objectContaining({
        kind: "bardicInspirationDie",
        sourceUnitId: bardicInspiration.id,
      }),
    ]);

    const blindedAndDeafened = bardicInspirationBattle({
      charismaModifier: 1,
      targetConditions: ["blinded", "deafened"],
    });
    const blindedAndDeafenedTarget = findHole(
      findAct(blindedAndDeafened, subject).initialHoles,
      "targetChoice",
    );

    expect(
      resolveBattleSubject({
        state: blindedAndDeafened,
        subject,
        fills: [
          bardicInspirationTargetFill(blindedAndDeafenedTarget, goblinId, {
            canHear: true,
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Bardic Inspiration target must be able to see or hear the Bard.",
    });
  });

  test("Bardic Inspiration rejects an Unconscious target even with a hearing fact", () => {
    const bardicInspiration = bardicInspirationUnit();
    const state = bardicInspirationBattle({
      charismaModifier: 1,
      targetConditions: ["unconscious"],
    });
    const subject = bardicInspirationSubject(bardicInspiration.id);

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          bardicInspirationTargetFill(
            bardicInspirationStaleTargetHole(),
            goblinId,
            {
              canHear: true,
            },
          ),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Bardic Inspiration target must be able to see or hear the Bard.",
    });
  });

  test("Bardic Inspiration discovery omits Unconscious targets", () => {
    const bardicInspiration = bardicInspirationUnit();
    const state = bardicInspirationBattle({
      charismaModifier: 1,
      targetConditions: ["unconscious"],
    });
    const subject = bardicInspirationSubject(bardicInspiration.id);

    expect(
      discoverBattleActs(state).some((act) =>
        sameBattleSubject(act.subject, subject),
      ),
    ).toBe(false);
  });

  test("Bardic Inspiration rejects targets that can neither see nor hear the Bard", () => {
    const bardicInspiration = bardicInspirationUnit();
    const state = bardicInspirationBattle({
      charismaModifier: 1,
      bardHidden: true,
    });
    const subject = bardicInspirationSubject(bardicInspiration.id);
    const target = findHole(
      findAct(state, subject).initialHoles,
      "targetChoice",
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [bardicInspirationTargetFill(target, goblinId)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Bardic Inspiration target must be able to see or hear the Bard.",
    });
  });

  test("Bardic Inspiration rejects a second die on the same target", () => {
    const bardicInspiration = bardicInspirationUnit();
    const state = bardicInspirationBattle({ charismaModifier: 3 });
    const subject = bardicInspirationSubject(bardicInspiration.id);
    const target = findHole(
      findAct(state, subject).initialHoles,
      "targetChoice",
    );
    const granted = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [bardicInspirationTargetFill(target, goblinId)],
      }),
    ).state;

    expect(
      resolveBattleSubject({
        state: {
          ...granted,
          currentTurnResources: {
            ...granted.currentTurnResources,
            currentHasBonusAction: true,
          },
        },
        subject,
        fills: [bardicInspirationTargetFill(target, goblinId)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Bardic Inspiration target already has a Bardic Inspiration die.",
    });
  });

  test("Bardic Inspiration discovery omits targets already holding a die", () => {
    const bardicInspiration = bardicInspirationUnit();
    const state = bardicInspirationBattle({ charismaModifier: 3 });
    const subject = bardicInspirationSubject(bardicInspiration.id);
    const target = findHole(
      findAct(state, subject).initialHoles,
      "targetChoice",
    );
    const granted = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [bardicInspirationTargetFill(target, goblinId)],
      }),
    ).state;

    expect(
      discoverBattleActs({
        ...granted,
        currentTurnResources: {
          ...granted.currentTurnResources,
          currentHasBonusAction: true,
        },
      }).some((act) => sameBattleSubject(act.subject, subject)),
    ).toBe(false);
  });

  test("Bardic Inspiration failed D20 Test use can turn attack roll, saving throw, and ability check failures into success", () => {
    const attackRollState = grantBardicInspirationToGoblin();
    const attackRoll = requireBardicInspirationD20TestResolved(
      resolveBardicInspirationFailedD20Test({
        state: attackRollState,
        d20Test: {
          kind: "attackRoll",
          actorId: goblinId,
          attackRoll: { total: 14, naturalD20: DieRollResult(10) },
          armorClass: armorClass(15),
        },
        bardicInspirationRoll: 2,
      }),
    );

    expect(attackRoll.bardicInspirationD20Test).toEqual({
      boostedTotal: 16,
      boostedSucceeded: true,
    });
    expect(combatantHasBardicInspirationDie(attackRoll.state, goblinId)).toBe(
      false,
    );

    const savingThrow = requireBardicInspirationD20TestResolved(
      resolveBardicInspirationFailedD20Test({
        state: grantBardicInspirationToGoblin(),
        d20Test: {
          kind: "savingThrow",
          actorId: goblinId,
          ability: "wis",
          originalTotal: 12,
          dc: difficultyClass(15),
        },
        bardicInspirationRoll: 3,
      }),
    );

    expect(savingThrow.bardicInspirationD20Test).toEqual({
      boostedTotal: 15,
      boostedSucceeded: true,
    });
    expect(combatantHasBardicInspirationDie(savingThrow.state, goblinId)).toBe(
      false,
    );

    const abilityCheck = requireBardicInspirationD20TestResolved(
      resolveBardicInspirationFailedD20Test({
        state: grantBardicInspirationToGoblin(),
        d20Test: {
          kind: "abilityCheck",
          actorId: goblinId,
          ability: "dex",
          skillOrToolLabel: "Stealth",
          originalTotal: 13,
          dc: difficultyClass(15),
        },
        bardicInspirationRoll: 2,
      }),
    );

    expect(abilityCheck.bardicInspirationD20Test).toEqual({
      boostedTotal: 15,
      boostedSucceeded: true,
    });
    expect(combatantHasBardicInspirationDie(abilityCheck.state, goblinId)).toBe(
      false,
    );
  });

  test("Bardic Inspiration failed D20 Test use expends the die even when the boosted result still fails", () => {
    const result = requireBardicInspirationD20TestResolved(
      resolveBardicInspirationFailedD20Test({
        state: grantBardicInspirationToGoblin(),
        d20Test: {
          kind: "savingThrow",
          actorId: goblinId,
          ability: "con",
          originalTotal: 9,
          dc: difficultyClass(15),
        },
        bardicInspirationRoll: 4,
      }),
    );

    expect(result.bardicInspirationD20Test).toEqual({
      boostedTotal: 13,
      boostedSucceeded: false,
    });
    expect(combatantHasBardicInspirationDie(result.state, goblinId)).toBe(
      false,
    );
  });

  test("Bardic Inspiration failed D20 Test use rejects successes, invalid die rolls, and double spend", () => {
    const state = grantBardicInspirationToGoblin();

    expect(
      resolveBardicInspirationFailedD20Test({
        state,
        d20Test: {
          kind: "abilityCheck",
          actorId: goblinId,
          ability: "str",
          originalTotal: 15,
          dc: difficultyClass(15),
        },
        bardicInspirationRoll: 1,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Bardic Inspiration requires an already-failed D20 Test.",
    });
    expect(combatantHasBardicInspirationDie(state, goblinId)).toBe(true);

    expect(
      resolveBardicInspirationFailedD20Test({
        state,
        d20Test: {
          kind: "savingThrow",
          actorId: goblinId,
          ability: "dex",
          originalTotal: 12,
          dc: difficultyClass(15),
        },
        bardicInspirationRoll: 7,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Bardic Inspiration roll must be a 1d6 result.",
    });
    expect(combatantHasBardicInspirationDie(state, goblinId)).toBe(true);

    const spent = requireBardicInspirationD20TestResolved(
      resolveBardicInspirationFailedD20Test({
        state,
        d20Test: {
          kind: "attackRoll",
          actorId: goblinId,
          attackRoll: { total: 12, naturalD20: DieRollResult(10) },
          armorClass: armorClass(15),
        },
        bardicInspirationRoll: 1,
      }),
    );

    expect(
      resolveBardicInspirationFailedD20Test({
        state: spent.state,
        d20Test: {
          kind: "attackRoll",
          actorId: goblinId,
          attackRoll: { total: 12, naturalD20: DieRollResult(10) },
          armorClass: armorClass(15),
        },
        bardicInspirationRoll: 1,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Bardic Inspiration is no longer available for the D20 Test actor.",
    });
  });

  test("Bardic Inspiration reduction rolls must be one valid class die", () => {
    const cuttingWordsAttackOnly = cuttingWordsAttackOnlyUnit();
    const state = goblinAttacksReactionModifierCharacter({
      unit: cuttingWordsAttackOnly,
      className: "bard",
      level: 3,
      unitId: cuttingWordsAttackOnly.id,
      resources: [cuttingWordsResource({ unit: cuttingWordsAttackOnly })],
    });
    const setup = goblinScimitarHitReactionSetup(state);
    if (setup.result.tag !== "needsHoles") {
      throw new Error("Expected Cutting Words attack-hit Reaction window.");
    }
    const choice = reactionModifierChoice(
      setup.result.snapshot.pendingInterrupt!.choices,
      cuttingWordsAttackOnly.id,
      "attackRollReduction",
    );

    const resolved = resolveBattleInterrupt({
      state: setup.result.state,
      fill: interruptDecisionFill(
        findHole(setup.result.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: cuttingWordsAttackOnly.id,
            modifierKind: "attackRollReduction",
            fills: [
              {
                kind: "rolledDice",
                holeId: choice.initialHoles[0]!.holeId,
                value: [rolledDiceGroup([7])],
              },
            ],
          },
        },
      ),
    });

    expect(resolved).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Reaction modifier roll must provide one valid reduction die result.",
    });
  });
});
