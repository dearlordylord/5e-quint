import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { combatantId } from "./identity.ts";
import { describe, expect, test } from "vitest";
import { battleActUnitPresentation } from "./battle-act-composition.ts";
import { reactionReductionResourceDieLabel } from "./battle-reducer/reaction-modifiers.ts";
import {
  armorClass,
  bardicInspirationBattle,
  bardicInspirationStaleTargetHole,
  bardicInspirationSubject,
  bardicInspirationTargetFill,
  bardicInspirationUnit,
  characterBattleResourceSupportedForUnit,
  characterResourceUses,
  combatantHasBardicInspirationDie,
  cuttingWordsAttackOnlyUnit,
  cuttingWordsResource,
  cuttingWordsUnit,
  DieRollResult,
  difficultyClass,
  discoverBattleActs,
  fighterId,
  findAct,
  findHole,
  goblinAttacksReactionModifierCharacter,
  goblinId,
  goblinScimitarHitReactionSetup,
  grantBardicInspirationToGoblin,
  interruptDecisionFill,
  reactionModifierChoice,
  requireBardicInspirationD20TestResolved,
  requireElapsedHours,
  requireResolved,
  resolveBardicInspirationFailedD20Test,
  resolveBattleInterrupt,
  resolveBattleSubject,
  resolveBattleSubjectUncheckedForTest,
  resourceCount,
  rolledDiceGroup,
  targetFill,
  unsupportedAbilityModifierActivationUnit,
} from "./battle-runtime.test-support.ts";
import type { BattleRuntimeSession } from "./index.ts";

function requireBardicInspirationProcedureRef(session: BattleRuntimeSession) {
  const actor = session.state.combatants.get(fighterId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected the Bard fixture to be a character.");
  }
  const binding = actor.origin.execution.procedureBindings.find(
    (candidate) =>
      candidate.procedure.kind === "unitFeature" &&
      candidate.procedure.execution.kind === "bardicInspirationGrant",
  );
  if (binding === undefined) {
    throw new Error("Expected the Bardic Inspiration mechanical procedure.");
  }
  return binding.procedureRef;
}

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
        session: state,
        subject,
        fills: [
          bardicInspirationTargetFill(
            target,
            requireBardicInspirationProcedureRef(state),
            goblinId,
          ),
        ],
      }),
    );

    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    const fighter = resolved.state.combatants.get(fighterId);
    if (fighter?.origin.kind !== "character") {
      throw new Error("Expected the Bard fixture to be a character.");
    }
    const bardicInspirationOwnership = state.context.characters
      .get(fighterId)
      ?.resourceOwnership.find(
        (ownership) => ownership.unit.id === bardicInspiration.id,
      );
    if (bardicInspirationOwnership === undefined) {
      throw new Error("Expected Bardic Inspiration resource ownership.");
    }
    expect(
      fighter.origin.resources.find(
        (resource) =>
          resource.resourcePoolRef ===
          bardicInspirationOwnership.resourcePoolRef,
      ),
    ).toEqual(
      expect.objectContaining({
        resourcePoolRef: bardicInspirationOwnership.resourcePoolRef,
        usesRemaining: resourceCount(2),
      }),
    );
    expect(resolved.state.combatants.get(goblinId)?.activeEffects).toEqual([
      {
        kind: "bardicInspirationDie",
        sourceProcedureRef: requireBardicInspirationProcedureRef(state),
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
        session: state,
        subject,
        fills: [
          bardicInspirationTargetFill(
            target,
            requireBardicInspirationProcedureRef(state),
            goblinId,
          ),
        ],
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

    expect(characterResourceUses(highCharisma.state, fighterId)).toEqual([
      resourceCount(4),
    ]);
    expect(characterResourceUses(lowCharisma.state, fighterId)).toEqual([
      resourceCount(1),
    ]);
  });

  test.each([
    { lostFact: "resource uses", removeResourceUses: true },
    { lostFact: "Bonus Action", removeResourceUses: false },
  ])(
    "Bardic Inspiration rejects a selected subject after the actor loses $lostFact",
    ({ removeResourceUses }) => {
      const session = bardicInspirationBattle({ charismaModifier: 3 });
      const subject = bardicInspirationSubject(bardicInspirationUnit().id);
      const selectedAct = findAct(session, subject);
      if (selectedAct.subject.tag !== "unitFeature") {
        throw new Error("Expected a selected Bardic Inspiration subject.");
      }
      const target = findHole(selectedAct.initialHoles, "targetChoice");
      const actor = session.state.combatants.get(fighterId);
      if (actor?.origin.kind !== "character") {
        throw new Error("Expected the Bard fixture to be a character.");
      }
      const staleSession = battleRuntimeSessionForTest({
        ...session,
        state: {
          ...session.state,
          currentTurnResources: {
            ...session.state.currentTurnResources,
            currentHasBonusAction: removeResourceUses,
          },
          combatants: new Map(session.state.combatants).set(fighterId, {
            ...actor,
            origin: {
              ...actor.origin,
              resources: actor.origin.resources.map((resource) =>
                removeResourceUses && resource.usesRemaining !== undefined
                  ? { ...resource, usesRemaining: resourceCount(0) }
                  : resource,
              ),
            },
          }),
        },
      });

      expect(
        resolveBattleSubjectUncheckedForTest({
          state: staleSession.state,
          subject: selectedAct.subject,
          fills: [
            bardicInspirationTargetFill(
              target,
              requireBardicInspirationProcedureRef(session),
              goblinId,
            ),
          ],
        }),
      ).toMatchObject({
        tag: "invalid",
        reason: "staleSubject",
        message: expect.stringContaining("no longer available"),
      });
    },
  );

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
        session: state,
        subject,
        fills: [targetFill(target, goblinId, [])],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Bardic Inspiration target must be within 60 feet.",
    });
    expect(characterResourceUses(state.state, fighterId)).toEqual([
      resourceCount(3),
    ]);
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
          session: state,
          subject,
          fills: [
            bardicInspirationTargetFill(
              target,
              requireBardicInspirationProcedureRef(state),
              goblinId,
              {
                canHear: true,
              },
            ),
          ],
        }),
      ).state.combatants.get(goblinId)?.activeEffects,
    ).toEqual([
      expect.objectContaining({
        kind: "bardicInspirationDie",
        sourceProcedureRef: requireBardicInspirationProcedureRef(state),
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
        session: state,
        subject,
        fills: [
          bardicInspirationTargetFill(
            target,
            requireBardicInspirationProcedureRef(state),
            goblinId,
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
          session: blinded,
          subject,
          fills: [
            bardicInspirationTargetFill(
              blindedTarget,
              requireBardicInspirationProcedureRef(blinded),
              goblinId,
              {
                canHear: true,
              },
            ),
          ],
        }),
      ).state.combatants.get(goblinId)?.activeEffects,
    ).toEqual([
      expect.objectContaining({
        kind: "bardicInspirationDie",
        sourceProcedureRef: requireBardicInspirationProcedureRef(blinded),
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
        session: blindedAndDeafened,
        subject,
        fills: [
          bardicInspirationTargetFill(
            blindedAndDeafenedTarget,
            requireBardicInspirationProcedureRef(blindedAndDeafened),
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

  test("Bardic Inspiration rejects an Unconscious target even with a hearing fact", () => {
    const state = bardicInspirationBattle({
      charismaModifier: 1,
      targetConditions: ["unconscious"],
    });

    expect(
      resolveBattleSubjectUncheckedForTest({
        state: state.state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          procedureRef: requireBardicInspirationProcedureRef(state),
        },
        fills: [
          bardicInspirationTargetFill(
            bardicInspirationStaleTargetHole(
              requireBardicInspirationProcedureRef(state),
            ),
            requireBardicInspirationProcedureRef(state),
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
      discoverBattleActs(state).some(
        (act) =>
          act.subject.tag === "unitFeature" &&
          subject.tag === "unitFeature" &&
          "unitId" in subject &&
          battleActUnitPresentation(act)?.unitId === subject.unitId,
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
        session: state,
        subject,
        fills: [
          bardicInspirationTargetFill(
            target,
            requireBardicInspirationProcedureRef(state),
            goblinId,
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
        session: state,
        subject,
        fills: [
          bardicInspirationTargetFill(
            target,
            requireBardicInspirationProcedureRef(state),
            goblinId,
          ),
        ],
      }),
    ).state;

    expect(
      resolveBattleSubjectUncheckedForTest({
        state: {
          ...granted,
          currentTurnResources: {
            ...granted.currentTurnResources,
            currentHasBonusAction: true,
          },
        },
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          procedureRef: requireBardicInspirationProcedureRef(state),
        },
        fills: [
          bardicInspirationTargetFill(
            target,
            requireBardicInspirationProcedureRef(state),
            goblinId,
          ),
        ],
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
        session: state,
        subject,
        fills: [
          bardicInspirationTargetFill(
            target,
            requireBardicInspirationProcedureRef(state),
            goblinId,
          ),
        ],
      }),
    ).state;

    expect(
      discoverBattleActs(
        battleRuntimeSessionForTest({
          ...state,
          state: {
            ...granted,
            currentTurnResources: {
              ...granted.currentTurnResources,
              currentHasBonusAction: true,
            },
          },
        }),
      ).some(
        (act) =>
          act.subject.tag === "unitFeature" &&
          subject.tag === "unitFeature" &&
          "unitId" in subject &&
          battleActUnitPresentation(act)?.unitId === subject.unitId,
      ),
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

  test("Bardic Inspiration failed D20 Test use rejects successes, invalid die rolls, double spend, and missing actors", () => {
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

    expect(
      resolveBardicInspirationFailedD20Test({
        state,
        d20Test: {
          kind: "savingThrow",
          actorId: combatantId("missing-bardic-inspiration-actor"),
          ability: "wis",
          originalTotal: 12,
          dc: difficultyClass(15),
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

  test("formats the admitted Bardic Inspiration reduction die", () => {
    expect(
      reactionReductionResourceDieLabel({
        dice: 1,
        dieSize: 6,
        flatModifier: 0,
      }),
    ).toBe("1d6");
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
            procedureRef: choice.choice.procedureRef,
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
