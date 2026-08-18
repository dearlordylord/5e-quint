import { battleObjectId } from "./identity.ts";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import {
  statBlockId as parseSharedStatBlockId,
  unitId,
} from "@dnd/shared/game-facts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.cunning-strike
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.cunning-strike-option-grant
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L5-A13-ROGUE-CUNNING-STRIKE-BATTLE-RUNTIME rogue_cunning_strike
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19D-08-ROGUE-SUPREME-SNEAK rogue_supreme_sneak
import {
  assertBattleSnapshotCodecAcceptsHolesForSubjectForTest,
  battleProcedureExecutionRefForTest,
} from "./battle-runtime.test-support.ts";
import { describe, expect, test } from "vitest";
import {
  type BattleActiveEffect,
  type BattleDamageRollHole,
  type BattleFill,
  type BattleHole,
  type BattleState,
} from "./battle-state-execution.ts";
import { battleContinuationFillEquals } from "./battle-reducer/battle-fill-equality.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { classLevel, difficultyClass, movementFeet } from "@dnd/shared/types";
import type { BattleRuntimeSession } from "./index.ts";
import {
  attackDamageDispositionFill,
  attackDamageHoleAfterHit,
  attackExecutionSelectionForSubjectForTest,
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  attackTargetFill,
  battleId,
  characterBattleFeatureInitForTest,
  characterBonusAttackSubjectForTest,
  characterSeed,
  combatantId,
  concentrationSavingThrowFill,
  cunningStrikeFeature,
  cunningStrikeUnitRefs,
  damageRollFillWithGroups,
  elapsedTimeTicks,
  endTurn,
  fighterAttackSubject,
  fighterId,
  goblinAttackSubject,
  goblinId,
  hasCondition,
  interruptDecisionFill,
  movementFill,
  opportunityAttackProcedureSelectionForTest,
  reactionChoiceWithSubject,
  requireCharacterUnitProcedureRefForTest,
  requireHole,
  requireResolved,
  resolveBattleInterrupt,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  sneakAttackFeature,
  snapshotBattle,
  startBattleSessionRight,
  statBlockCreatureInit,
  statBlockRecord,
  targetFill,
  testCharacterD20Statistics,
  testDaggerAttack,
  testShortswordAttack,
  unitLibrary,
} from "./battle-runtime.test-support.ts";
import { battleCunningStrikeOptionGrantSupportForUnit } from "./unit-feature-support.ts";

describe("battle runtime: Cunning Strike", () => {
  test("Surface rejects malformed same-family Cunning Strike records", () => {
    const cunningStrike = unitLibrary.requireUnit("rogue_cunning_strike");
    if (
      cunningStrike.kind !== "class_feature" ||
      cunningStrike.mechanics.family !== "cunning_strike"
    ) {
      throw new Error("Expected Cunning Strike mechanics.");
    }
    const cunningStrikeMechanics = cunningStrike.mechanics;
    expect(() =>
      decodeUnitRecordSync({
        ...cunningStrike,
        id: "synthetic_cunning_strike_choose_two",
        mechanics: {
          ...cunningStrikeMechanics,
          choice: { ...cunningStrikeMechanics.choice, maxOptions: 2 },
        },
      }),
    ).toThrow();
    expect(() =>
      decodeUnitRecordSync({
        ...cunningStrike,
        id: "synthetic_cunning_strike_wrong_sneak_attack_source",
        mechanics: {
          ...cunningStrikeMechanics,
          trigger: {
            ...cunningStrikeMechanics.trigger,
            sourceUnitId: cunningStrike.id,
          },
        },
      }),
    ).toThrow();
  }, 30_000);

  test("Surface rejects malformed same-family Cunning Strike option grants", () => {
    const supremeSneak = unitLibrary.requireUnit("rogue_supreme_sneak");
    if (
      supremeSneak.kind !== "class_feature" ||
      supremeSneak.mechanics.family !== "cunning_strike_option_grant"
    ) {
      throw new Error("Expected Supreme Sneak mechanics.");
    }
    const supremeSneakMechanics = supremeSneak.mechanics;
    expect(() =>
      decodeUnitRecordSync({
        ...supremeSneak,
        id: "synthetic_supreme_sneak_unsupported_cost",
        mechanics: {
          ...supremeSneakMechanics,
          option: {
            ...supremeSneakMechanics.option,
            cost: { kind: "sneak_attack_damage_dice", dice: 2, dieSize: 6 },
          },
        },
      }),
    ).toThrow();
    expect(() =>
      decodeUnitRecordSync({
        ...supremeSneak,
        id: "synthetic_supreme_sneak_wrong_cunning_strike_source",
        mechanics: {
          ...supremeSneakMechanics,
          sourceUnitId: supremeSneak.id,
        },
      }),
    ).toThrow();
  }, 30_000);

  test("exposes typed Cunning Strike options from an eligible Sneak Attack damage rider", () => {
    const window = cunningStrikeDamageWindow("trip");
    const sneakAttackProcedureRef = requireCharacterUnitProcedureRefForTest(
      window.session,
      fighterId,
      "rogue_sneak_attack",
    );
    const cunningStrikeProcedureRef = requireCharacterUnitProcedureRefForTest(
      window.session,
      fighterId,
      "rogue_cunning_strike",
    );

    expect(window.damage).toMatchObject({
      kind: "rolledDice",
      attackDamageRiders: [
        expect.objectContaining({
          procedureRef: sneakAttackProcedureRef,
          damage: { dice: 3, dieSize: 6, damageType: "piercing" },
        }),
      ],
      cunningStrikeOptions: [
        expect.objectContaining({
          procedureRef: cunningStrikeProcedureRef,
          optionId: "poison",
          sourceDamageRiderProcedureRef: sneakAttackProcedureRef,
          dieCost: { dice: 1, dieSize: 6 },
        }),
        expect.objectContaining({
          procedureRef: cunningStrikeProcedureRef,
          optionId: "trip",
          sourceDamageRiderProcedureRef: sneakAttackProcedureRef,
          dieCost: { dice: 1, dieSize: 6 },
        }),
        expect.objectContaining({
          procedureRef: cunningStrikeProcedureRef,
          optionId: "withdraw",
          sourceDamageRiderProcedureRef: sneakAttackProcedureRef,
          dieCost: { dice: 1, dieSize: 6 },
        }),
      ],
    });
  });

  test("exposes Supreme Sneak Stealth Attack from the option-grant Surface profile", () => {
    const window = cunningStrikeDamageWindow("stealth_attack", {
      withSupremeSneak: true,
    });
    const sneakAttackProcedureRef = requireCharacterUnitProcedureRefForTest(
      window.session,
      fighterId,
      "rogue_sneak_attack",
    );
    const supremeSneakProcedureRef = requireCharacterUnitProcedureRefForTest(
      window.session,
      fighterId,
      "rogue_supreme_sneak",
    );

    expect(window.damage).toMatchObject({
      kind: "rolledDice",
      attackDamageRiders: [
        expect.objectContaining({
          procedureRef: sneakAttackProcedureRef,
          damage: { dice: 5, dieSize: 6, damageType: "piercing" },
        }),
      ],
      cunningStrikeOptions: expect.arrayContaining([
        expect.objectContaining({
          procedureRef: supremeSneakProcedureRef,
          optionId: "stealth_attack",
          sourceDamageRiderProcedureRef: sneakAttackProcedureRef,
          dieCost: { dice: 1, dieSize: 6 },
        }),
      ]),
    });
  });

  test("Stealth Attack preserves Hide invisibility only with qualifying end-turn cover", () => {
    const window = cunningStrikeDamageWindow("stealth_attack", {
      withSupremeSneak: true,
    });
    const needsCover = resolveBattleSubject({
      state: window.state,
      subject: window.subject,
      fills: window.damageAppliedFills,
    });
    const cover = requireHole(needsCover, "cunningStrikeEndTurnCoverFacts");
    if (needsCover.tag !== "needsHoles") {
      throw new Error("Expected Cunning Strike Stealth Attack cover witness.");
    }
    expect(needsCover.state.combatants.get(fighterId)?.hidden).toBeNull();
    expect(cover).toMatchObject({
      actorId: fighterId,
      coverDegrees: ["none", "half", "threeQuarters", "total"],
    });

    const totalCover = requireResolved(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.damageAppliedFills,
          cunningStrikeEndTurnCoverFactsFill(cover, "total"),
        ],
      }),
    ).state;
    expect(totalCover.combatants.get(fighterId)?.hidden).toEqual({
      discoveryDc: difficultyClass(16),
    });

    const halfCover = requireResolved(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.damageAppliedFills,
          cunningStrikeEndTurnCoverFactsFill(cover, "half"),
        ],
      }),
    ).state;
    expect(halfCover.combatants.get(fighterId)?.hidden).toBeNull();
  });

  test("rolled-dice fill equality includes the selected Cunning Strike option", () => {
    const window = cunningStrikeDamageWindow("trip");
    const roll = requireRolledDiceFill(window.damageAppliedFills);
    const poisonProcedureRef = requireCharacterUnitProcedureRefForTest(
      window.session,
      fighterId,
      "rogue_cunning_strike",
    );
    const sneakAttackProcedureRef = requireCharacterUnitProcedureRefForTest(
      window.session,
      fighterId,
      "rogue_sneak_attack",
    );
    const omittedSelection = damageRollFillWithGroups(
      window.damage,
      [[4], [6, 5]],
      [sneakAttackProcedureRef],
    );

    expect(battleContinuationFillEquals(roll, { ...roll })).toBe(true);
    expect(battleContinuationFillEquals(roll, omittedSelection)).toBe(false);
    expect(
      battleContinuationFillEquals(roll, {
        ...roll,
        cunningStrikeOption: {
          procedureRef: poisonProcedureRef,
          optionId: "poison",
        },
      }),
    ).toBe(false);
    const toolPossession = {
      kind: "toolPossessionFacts",
      holeId: holeId("cunning-strike-tool-possession"),
      value: { toolIdsOnPerson: ["poisoners_kit"] },
    } satisfies Extract<BattleFill, { readonly kind: "toolPossessionFacts" }>;
    expect(
      battleContinuationFillEquals(toolPossession, { ...toolPossession }),
    ).toBe(true);
    expect(
      battleContinuationFillEquals(toolPossession, {
        ...toolPossession,
        value: { toolIdsOnPerson: [] },
      }),
    ).toBe(false);
  });

  test("rejects a Cunning Strike option from a procedure the damage hole did not offer", () => {
    const window = cunningStrikeDamageWindow("trip");
    const forgedFills = window.damageAppliedFills.map((fill) =>
      fill.kind === "rolledDice" && fill.cunningStrikeOption !== undefined
        ? {
            ...fill,
            cunningStrikeOption: {
              ...fill.cunningStrikeOption,
              procedureRef: battleProcedureExecutionRefForTest(
                "foreign-cunning-strike-procedure",
              ),
            },
          }
        : fill,
    );

    expect(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: forgedFills,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Selected Cunning Strike option is not eligible for this attack.",
    });
  });

  test("Trip forgoes one Sneak Attack die before rolling and applies Prone after damage", () => {
    const window = cunningStrikeDamageWindow("trip");
    const save = requireHole(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: window.damageAppliedFills,
      }),
      "savingThrowOutcome",
    );

    expect(save).toMatchObject({
      ability: "dex",
      dc: { kind: "fixed", dc: difficultyClass(14) },
      targetIds: [goblinId],
    });

    const resolved = requireResolved(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.damageAppliedFills,
          savingThrowOutcomeFill(save, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    );
    const target = resolved.state.combatants.get(goblinId);
    if (target === undefined) {
      throw new Error("Expected Cunning Strike Trip target.");
    }

    expect(hasCondition(target.conditions, "prone")).toBe(true);
  });

  test("Trip staged resume keeps attack damage single-applied", () => {
    const window = cunningStrikeDamageWindow("trip");
    const needsTripSave = resolveBattleSubject({
      state: window.state,
      subject: window.subject,
      fills: window.damageAppliedFills,
    });
    const tripSave = requireHole(needsTripSave, "savingThrowOutcome");
    if (needsTripSave.tag !== "needsHoles") {
      throw new Error("Expected Cunning Strike Trip staged save.");
    }

    expect(targetTempHp(needsTripSave.state)).toBe(40);

    const resolved = requireResolved(
      resolveBattleSubject({
        state: needsTripSave.state,
        subject: window.subject,
        fills: [
          ...window.damageAppliedFills,
          savingThrowOutcomeFill(tripSave, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    );

    expect(targetTempHp(resolved.state)).toBe(22);
    expect(
      resolved.state.currentTurnResources.attackDamageRidersUsedThisTurn,
    ).toEqual([
      {
        attackerId: fighterId,
        procedureRef: requireCharacterUnitProcedureRefForTest(
          window.session,
          fighterId,
          "rogue_sneak_attack",
        ),
      },
    ]);
    expect(resolved.snapshot.turn.actionResources).toHaveLength(0);
  });

  test("Trip staged resume keeps off-hand attack damage single-applied", () => {
    const window = cunningStrikeOffHandDamageWindow("trip");
    expectStagedTripResumeSingleAppliesDamage(window);
  });

  test("Trip staged resume keeps Opportunity Attack damage single-applied", () => {
    const window = cunningStrikeOpportunityAttackDamageWindow("trip");
    const resolved = expectStagedTripResumeSingleAppliesDamage(window);
    expect(resolved.combatants.get(fighterId)).toMatchObject({
      reactionAvailable: false,
    });
  });

  test("Trip survives attack damage continuations and resolves immediately after damage", () => {
    const window = cunningStrikeDamageWindow("trip", {
      targetConcentrating: true,
    });
    const needsConcentration = resolveBattleSubject({
      state: window.state,
      subject: window.subject,
      fills: window.damageAppliedFills,
    });
    const concentration = requireHole(
      needsConcentration,
      "concentrationSavingThrow",
    );
    expect(concentration).toMatchObject({ combatantId: goblinId });
    if (needsConcentration.tag !== "needsHoles") {
      throw new Error(
        "Expected Cunning Strike damage to request Concentration.",
      );
    }

    const needsTripSave = resolveBattleSubject({
      state: needsConcentration.state,
      subject: window.subject,
      fills: [
        ...window.damageAppliedFills,
        concentrationSavingThrowFill(concentration, true),
      ],
    });
    const tripSave = requireHole(needsTripSave, "savingThrowOutcome");
    expect(tripSave).toMatchObject({
      ability: "dex",
      targetIds: [goblinId],
    });
    if (needsTripSave.tag !== "needsHoles") {
      throw new Error(
        "Expected Cunning Strike Trip to request a saving throw.",
      );
    }

    const resolved = requireResolved(
      resolveBattleSubject({
        state: needsTripSave.state,
        subject: window.subject,
        fills: [
          ...window.damageAppliedFills,
          concentrationSavingThrowFill(concentration, true),
          savingThrowOutcomeFill(tripSave, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    );
    const target = resolved.state.combatants.get(goblinId);
    if (target === undefined) {
      throw new Error("Expected Cunning Strike Trip continuation target.");
    }

    expect(hasCondition(target.conditions, "prone")).toBe(true);
    expect(target.concentration).not.toBeNull();
  });

  test("Withdraw continues through Concentration before requesting movement", () => {
    const window = cunningStrikeDamageWindow("withdraw", {
      targetConcentrating: true,
    });
    const needsConcentration = resolveBattleSubject({
      state: window.state,
      subject: window.subject,
      fills: window.damageAppliedFills,
    });
    const concentration = requireHole(
      needsConcentration,
      "concentrationSavingThrow",
    );
    if (needsConcentration.tag !== "needsHoles") {
      throw new Error("Expected Withdraw to request Concentration.");
    }

    const needsMovement = resolveBattleSubject({
      state: needsConcentration.state,
      subject: window.subject,
      fills: [
        ...window.damageAppliedFills,
        concentrationSavingThrowFill(concentration, true),
      ],
    });
    const movement = requireHole(needsMovement, "movement");
    expect(movement).toMatchObject({ actorId: fighterId });
    if (needsMovement.tag !== "needsHoles") {
      throw new Error("Expected Withdraw to request movement.");
    }

    const resolved = requireResolved(
      resolveBattleSubject({
        state: needsMovement.state,
        subject: window.subject,
        fills: [
          ...window.damageAppliedFills,
          concentrationSavingThrowFill(concentration, true),
          movementFill(movement, {
            movementCostFeet: 15,
            provokedOpportunityAttacks: [],
          }),
        ],
      }),
    );
    expect(resolved.state.combatants.get(fighterId)).toMatchObject({
      movementSpentFeet: movementFeet(0),
    });
  });

  test("Poison continues through Concentration before requesting tool possession", () => {
    const window = cunningStrikeDamageWindow("poison", {
      targetConcentrating: true,
    });
    const needsConcentration = resolveBattleSubject({
      state: window.state,
      subject: window.subject,
      fills: window.damageAppliedFills,
    });
    const concentration = requireHole(
      needsConcentration,
      "concentrationSavingThrow",
    );
    if (needsConcentration.tag !== "needsHoles") {
      throw new Error("Expected Poison to request Concentration.");
    }

    const needsKit = resolveBattleSubject({
      state: needsConcentration.state,
      subject: window.subject,
      fills: [
        ...window.damageAppliedFills,
        concentrationSavingThrowFill(concentration, true),
      ],
    });
    const kit = requireHole(needsKit, "toolPossessionFacts");
    expect(kit).toMatchObject({ actorId: fighterId });
    if (needsKit.tag !== "needsHoles") {
      throw new Error("Expected Poison to request tool possession.");
    }

    const needsSave = resolveBattleSubject({
      state: needsKit.state,
      subject: window.subject,
      fills: [
        ...window.damageAppliedFills,
        concentrationSavingThrowFill(concentration, true),
        toolPossessionFactsFill(kit, ["poisoners_kit"]),
      ],
    });
    expect(needsSave).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "savingThrowOutcome" })],
    });
  });

  test("Stealth Attack continues through Concentration before requesting cover", () => {
    const window = cunningStrikeDamageWindow("stealth_attack", {
      targetConcentrating: true,
      withSupremeSneak: true,
    });
    const needsConcentration = resolveBattleSubject({
      state: window.state,
      subject: window.subject,
      fills: window.damageAppliedFills,
    });
    const concentration = requireHole(
      needsConcentration,
      "concentrationSavingThrow",
    );
    if (needsConcentration.tag !== "needsHoles") {
      throw new Error("Expected Stealth Attack to request Concentration.");
    }

    const needsCover = resolveBattleSubject({
      state: needsConcentration.state,
      subject: window.subject,
      fills: [
        ...window.damageAppliedFills,
        concentrationSavingThrowFill(concentration, true),
      ],
    });
    const cover = requireHole(needsCover, "cunningStrikeEndTurnCoverFacts");
    expect(cover).toMatchObject({ actorId: fighterId });
    if (needsCover.tag !== "needsHoles") {
      throw new Error("Expected Stealth Attack to request cover.");
    }
    expect(
      resolveBattleSubject({
        state: needsCover.state,
        subject: window.subject,
        fills: [
          ...window.damageAppliedFills,
          concentrationSavingThrowFill(concentration, true),
          cunningStrikeEndTurnCoverFactsFill(cover, "total"),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });
  });

  test("Trip eligibility uses effective target size", () => {
    const damage = requireAttackDamageHole(
      cunningStrikeDamagePreview({
        targetStatBlock: largeTargetStatBlock(),
        targetActiveEffects: [targetSizeChangeEffect("increase")],
      }).damage,
    );

    expect(
      damage.cunningStrikeOptions?.map((option) => option.optionId),
    ).toEqual(["poison", "withdraw"]);
  });

  test("Poison requires Poisoner's Kit possession, then applies Poisoned with an end-turn repeat save", () => {
    const window = cunningStrikeDamageWindow("poison");
    const poisonProcedureRef = requireCunningStrikeOptionProcedureRef(
      window.damage,
      "poison",
    );
    const kit = requireHole(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: window.damageAppliedFills,
      }),
      "toolPossessionFacts",
    );
    expect(kit).toMatchObject({
      actorId: fighterId,
      toolIds: ["poisoners_kit"],
    });

    const needsSave = resolveBattleSubject({
      state: window.state,
      subject: window.subject,
      fills: [
        ...window.damageAppliedFills,
        toolPossessionFactsFill(kit, ["poisoners_kit"]),
      ],
    });
    const save = requireHole(needsSave, "savingThrowOutcome");
    if (needsSave.tag !== "needsHoles") {
      throw new Error("Expected Cunning Strike Poison saving-throw hole.");
    }
    expect(save).toMatchObject({
      ability: "con",
      dc: { kind: "fixed", dc: difficultyClass(14) },
      targetIds: [goblinId],
    });
    expect(
      resolveBattleSubject({
        state: needsSave.state,
        subject: window.subject,
        fills: [
          ...window.damageAppliedFills,
          savingThrowOutcomeFill(save, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "toolPossessionFacts" }],
    });

    const poisoned = requireResolved(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.damageAppliedFills,
          toolPossessionFactsFill(kit, ["poisoners_kit"]),
          savingThrowOutcomeFill(save, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const poisonedTarget = poisoned.combatants.get(goblinId);
    if (poisonedTarget === undefined) {
      throw new Error("Expected Cunning Strike Poison target.");
    }
    expect(hasCondition(poisonedTarget.conditions, "poisoned")).toBe(true);
    expect(poisonedTarget.activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "unitFeatureConditionEndTurnSave",
          sourceProcedureRef: poisonProcedureRef,
          sourceCombatantId: fighterId,
          condition: "poisoned",
          expiresAt: {
            kind: "duration",
            durationTicks: elapsedTimeTicks(10),
          },
        }),
      ]),
    );

    const targetTurn = requireResolved(
      endTurn({ state: poisoned, actorId: fighterId }),
    ).state;
    const repeatSaveRequest = endTurn({
      state: targetTurn,
      actorId: goblinId,
    });
    if (repeatSaveRequest.tag !== "needsHoles") {
      throw new Error("Expected Cunning Strike Poison repeat save.");
    }
    assertBattleSnapshotCodecAcceptsHolesForSubjectForTest({
      snapshot: repeatSaveRequest.snapshot,
      subject: repeatSaveRequest.subject,
      holes: repeatSaveRequest.holes,
    });
    const repeatSave = requireHole(repeatSaveRequest, "savingThrowOutcome");
    const failedRepeatSave = requireResolved(
      endTurn({
        state: targetTurn,
        actorId: goblinId,
        fills: [
          savingThrowOutcomeFill(repeatSave, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    );
    const maintainedTarget = failedRepeatSave.state.combatants.get(goblinId);
    if (maintainedTarget === undefined) {
      throw new Error(
        "Expected Cunning Strike Poison target after failed repeat save.",
      );
    }
    expect(hasCondition(maintainedTarget.conditions, "poisoned")).toBe(true);
    expect(maintainedTarget.activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "unitFeatureConditionEndTurnSave",
          sourceProcedureRef: poisonProcedureRef,
        }),
      ]),
    );
    expect(snapshotBattle(failedRepeatSave.state).currentActorId).toBe(
      fighterId,
    );
    const afterRepeatSave = requireResolved(
      endTurn({
        state: targetTurn,
        actorId: goblinId,
        fills: [
          savingThrowOutcomeFill(repeatSave, [
            { targetId: goblinId, succeeded: true },
          ]),
        ],
      }),
    ).state;
    const recoveredTarget = afterRepeatSave.combatants.get(goblinId);
    if (recoveredTarget === undefined) {
      throw new Error(
        "Expected Cunning Strike Poison target after repeat save.",
      );
    }
    expect(hasCondition(recoveredTarget.conditions, "poisoned")).toBe(false);
  });

  test("Withdraw moves up to half Speed after damage without provoking Opportunity Attacks or spending turn movement", () => {
    const window = cunningStrikeDamageWindow("withdraw");
    const move = requireHole(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: window.damageAppliedFills,
      }),
      "movement",
    );
    expect(move).toMatchObject({
      actorId: fighterId,
      movementBudgetFeet: movementFeet(15),
      speedKinds: [{ kind: "walk", movementBudgetFeet: movementFeet(15) }],
    });

    expect(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.damageAppliedFills,
          movementFill(move, {
            movementCostFeet: 15,
            provokedOpportunityAttacks: [
              {
                reactorId: goblinId,
                ...attackExecutionSelectionForSubjectForTest(
                  goblinAttackSubject(window.state, "Scimitar"),
                ),
              },
            ],
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: "Cunning Strike movement does not provoke Opportunity Attacks.",
    });

    const resolved = requireResolved(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.damageAppliedFills,
          movementFill(move, {
            movementCostFeet: 15,
            provokedOpportunityAttacks: [],
          }),
        ],
      }),
    );
    expect(resolved.state.combatants.get(fighterId)).toMatchObject({
      movementSpentFeet: movementFeet(0),
    });
  });
});

type CunningStrikeOptionId = NonNullable<
  Extract<BattleFill, { readonly kind: "rolledDice" }>["cunningStrikeOption"]
>["optionId"];

type CunningStrikeBattleInput = {
  readonly targetActiveEffects?: readonly BattleActiveEffect[];
  readonly targetConcentrating?: boolean;
  readonly targetStatBlock?: ReturnType<typeof statBlockRecord>;
  readonly withOffHandAttack?: boolean;
  readonly withSneakAttackAlly?: boolean;
  readonly withSupremeSneak?: boolean;
};

const cunningStrikeAllyId = combatantId("cunning-strike-ally");

function supremeSneakFeature(): NonNullable<
  Parameters<typeof characterSeed>[0]["unitFeatures"]
>[number] {
  return characterBattleFeatureInitForTest(
    unitLibrary.requireUnit("rogue_supreme_sneak"),
    [{ className: "rogue", level: classLevel(9) }],
  );
}

function supremeSneakUnitRefs(): ReturnType<typeof cunningStrikeUnitRefs> {
  const unit = unitLibrary.requireUnit("rogue_supreme_sneak");
  const support = battleCunningStrikeOptionGrantSupportForUnit(unit);
  if (support === null) {
    throw new Error("Expected Supreme Sneak option-grant support profile.");
  }
  return [
    ...cunningStrikeUnitRefs(),
    {
      unit: unitLibrary.requireUnit(unit.id),
      supportProfiles: [support],
    },
  ];
}

function cunningStrikeOptionUnitId(optionId: CunningStrikeOptionId): string {
  return optionId === "stealth_attack"
    ? "rogue_supreme_sneak"
    : "rogue_cunning_strike";
}

function cunningStrikeDamagePreview(input: CunningStrikeBattleInput = {}): {
  readonly session: BattleRuntimeSession;
  readonly state: BattleState;
  readonly subject: ReturnType<typeof fighterAttackSubject>;
  readonly target: BattleHole;
  readonly roll: BattleHole;
  readonly attackRoll: {
    readonly total: number;
    readonly naturalD20: number;
    readonly rollMode: "advantage";
  };
  readonly damage: BattleHole;
} {
  const session = cunningStrikeBattle(input);
  const state = session.state;
  const subject = fighterAttackSubject(state, "Dagger");
  const target = attackInitialTargetHole(state, subject);
  const roll = attackRollHoleAfterTarget(state, target, subject);
  const attackRoll = {
    total: 15,
    naturalD20: 10,
    rollMode: "advantage" as const,
  };
  const damage = attackDamageHoleAfterHit(
    state,
    target,
    roll,
    attackRoll,
    subject,
  );

  return { session, state, subject, target, roll, attackRoll, damage };
}

type CunningStrikeStagedDamageWindow = {
  readonly session: BattleRuntimeSession;
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly damageAppliedFills: readonly BattleFill[];
};

function cunningStrikeDamageWindow(
  optionId: CunningStrikeOptionId,
  input: CunningStrikeBattleInput = {},
): CunningStrikeStagedDamageWindow & { readonly damage: BattleHole } {
  const { session, state, subject, target, roll, attackRoll, damage } =
    cunningStrikeDamagePreview(input);

  return {
    session,
    state,
    subject,
    damage,
    damageAppliedFills: cunningStrikeDamageAppliedFills({
      session,
      state,
      subject,
      prefixFills: [
        targetFill(target, goblinId),
        attackRollFill(roll, attackRoll),
      ],
      damage,
      optionId,
      sneakAttackResultsAfterCost:
        optionId === "stealth_attack" ? [6, 5, 4, 3] : [6, 5],
    }),
  };
}

function cunningStrikeOffHandDamageWindow(
  optionId: CunningStrikeOptionId,
): CunningStrikeStagedDamageWindow {
  const session = cunningStrikeBattle({
    withOffHandAttack: true,
    withSneakAttackAlly: true,
  });
  const state = session.state;
  const attackSubject = fighterAttackSubject(state, "Shortsword");
  const attackTarget = attackInitialTargetHole(state, attackSubject);
  const qualifyingAttackRoll = attackRollHoleAfterTarget(
    state,
    attackTarget,
    attackSubject,
  );
  const afterQualifyingAttack = requireResolved(
    resolveBattleSubject({
      state,
      subject: attackSubject,
      fills: [
        targetFill(attackTarget, goblinId),
        attackRollFill(qualifyingAttackRoll, {
          total: 1,
          naturalD20: 1,
          rollMode: "advantage",
        }),
      ],
    }),
  ).state;
  const subject = characterBonusAttackSubjectForTest(
    afterQualifyingAttack,
    fighterId,
    "offHandAttack",
  );
  const target = requireHole(
    resolveBattleSubject({ state: afterQualifyingAttack, subject, fills: [] }),
    "targetChoice",
  );
  const targetSelection = attackTargetFill(
    target,
    fighterId,
    goblinId,
    undefined,
    [
      {
        kind: "attackerAllyWithin5FeetOfTarget",
        attackerId: fighterId,
        targetId: goblinId,
        allyId: cunningStrikeAllyId,
      },
    ],
  );
  const roll = requireHole(
    resolveBattleSubject({
      state: afterQualifyingAttack,
      subject,
      fills: [targetSelection],
    }),
    "attackRoll",
  );
  const attackRoll = { total: 15, naturalD20: 10 };
  const damage = requireHole(
    resolveBattleSubject({
      state: afterQualifyingAttack,
      subject,
      fills: [targetSelection, attackRollFill(roll, attackRoll)],
    }),
    "rolledDice",
  );

  return {
    session: battleRuntimeSessionForTest({
      ...session,
      state: afterQualifyingAttack,
    }),
    state: afterQualifyingAttack,
    subject,
    damageAppliedFills: cunningStrikeDamageAppliedFills({
      session: battleRuntimeSessionForTest({
        ...session,
        state: afterQualifyingAttack,
      }),
      state: afterQualifyingAttack,
      subject,
      prefixFills: [targetSelection, attackRollFill(roll, attackRoll)],
      damage,
      optionId,
    }),
  };
}

function cunningStrikeOpportunityAttackDamageWindow(
  optionId: CunningStrikeOptionId,
): CunningStrikeStagedDamageWindow {
  const session = cunningStrikeBattle({ withSneakAttackAlly: true });
  const state = requireResolved(
    endTurn({
      state: session.state,
      actorId: fighterId,
    }),
  ).state;
  const moveSubject = {
    tag: "runtimeCommand",
    actorId: goblinId,
    command: "move",
  } as const;
  const move = requireHole(
    resolveBattleSubject({ state, subject: moveSubject, fills: [] }),
    "movement",
  );
  const awaitingReaction = resolveBattleSubject({
    state,
    subject: moveSubject,
    fills: [
      movementFill(move, {
        movementCostFeet: 5,
        provokedOpportunityAttacks: [
          {
            reactorId: fighterId,
            ...attackExecutionSelectionForSubjectForTest(
              fighterAttackSubject(state, "Dagger"),
            ),
          },
        ],
      }),
    ],
  });
  if (awaitingReaction.tag !== "needsHoles") {
    throw new Error("Expected Cunning Strike Opportunity Attack interrupt.");
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
        responderId: fighterId,
        choice: opportunityAttackProcedureSelectionForTest(choice),
      },
    ),
  });
  if (startedReaction.tag !== "needsHoles") {
    throw new Error(
      `Expected Cunning Strike Opportunity Attack roll, got ${startedReaction.tag}${
        startedReaction.tag === "invalid" ? `: ${startedReaction.message}` : ""
      }.`,
    );
  }
  const subject = choice.subject;
  const roll = requireHole(startedReaction, "attackRoll");
  const attackRoll = {
    total: 15,
    naturalD20: 10,
    rollMode: "advantage" as const,
  };
  const damage = requireHole(
    resolveBattleSubject({
      state: startedReaction.state,
      subject,
      fills: [attackRollFill(roll, attackRoll)],
    }),
    "rolledDice",
  );

  return {
    session: battleRuntimeSessionForTest({
      ...session,
      state: startedReaction.state,
    }),
    state: startedReaction.state,
    subject,
    damageAppliedFills: cunningStrikeDamageAppliedFills({
      session: battleRuntimeSessionForTest({
        ...session,
        state: startedReaction.state,
      }),
      state: startedReaction.state,
      subject,
      prefixFills: [attackRollFill(roll, attackRoll)],
      damage,
      optionId,
    }),
  };
}

function cunningStrikeDamageAppliedFills(input: {
  readonly session: BattleRuntimeSession;
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly prefixFills: readonly BattleFill[];
  readonly damage: BattleHole;
  readonly optionId: CunningStrikeOptionId;
  readonly sneakAttackResultsAfterCost?: readonly number[];
}): readonly BattleFill[] {
  const throughDamageRoll = [
    ...input.prefixFills,
    damageRollFillWithGroups(
      input.damage,
      [[4], [...(input.sneakAttackResultsAfterCost ?? [6, 5])]],
      [
        requireCharacterUnitProcedureRefForTest(
          input.session,
          fighterId,
          "rogue_sneak_attack",
        ),
      ],
      undefined,
      {
        procedureRef: requireCharacterUnitProcedureRefForTest(
          input.session,
          fighterId,
          cunningStrikeOptionUnitId(input.optionId),
        ),
        optionId: input.optionId,
      },
    ),
  ];
  const afterDamageRoll = resolveBattleSubject({
    state: input.state,
    subject: input.subject,
    fills: throughDamageRoll,
  });
  const disposition =
    afterDamageRoll.tag === "needsHoles"
      ? afterDamageRoll.holes.find(
          (hole) => hole.kind === "attackDamageDisposition",
        )
      : undefined;
  return disposition === undefined
    ? throughDamageRoll
    : [
        ...throughDamageRoll,
        attackDamageDispositionFill(disposition, {
          kind: "ordinaryDamage",
        }),
      ];
}

function expectStagedTripResumeSingleAppliesDamage(
  window: CunningStrikeStagedDamageWindow,
): BattleState {
  const needsTripSave = resolveBattleSubject({
    state: window.state,
    subject: window.subject,
    fills: window.damageAppliedFills,
  });
  const tripSave = requireHole(needsTripSave, "savingThrowOutcome");
  if (needsTripSave.tag !== "needsHoles") {
    throw new Error("Expected Cunning Strike Trip staged save.");
  }
  expect(targetTempHp(needsTripSave.state)).toBe(40);
  const finalFills = [
    ...window.damageAppliedFills,
    savingThrowOutcomeFill(tripSave, [
      { targetId: goblinId, succeeded: false },
    ]),
  ];
  const direct = requireResolved(
    resolveBattleSubject({
      state: window.state,
      subject: window.subject,
      fills: finalFills,
    }),
  );
  const staged = requireResolved(
    resolveBattleSubject({
      state: needsTripSave.state,
      subject: window.subject,
      fills: finalFills,
    }),
  );
  expect(targetTempHp(staged.state)).toBe(targetTempHp(direct.state));
  const target = staged.state.combatants.get(goblinId);
  if (target === undefined) {
    throw new Error("Expected Cunning Strike staged target.");
  }
  expect(hasCondition(target.conditions, "prone")).toBe(true);
  return staged.state;
}

function cunningStrikeBattle(
  input: CunningStrikeBattleInput = {},
): BattleRuntimeSession {
  const attack = input.withOffHandAttack
    ? testShortswordAttack()
    : testDaggerAttack();
  const session = startBattleSessionRight({
    battleId: battleId("battle-cunning-strike"),
    combatants: [
      characterSeed({
        displayName: "Cunning Strike Rogue",
        initiative: 20,
        classLevels: [
          {
            className: "rogue",
            level: input.withSupremeSneak === true ? 9 : 5,
          },
        ],
        d20Statistics: testCharacterD20Statistics({ dex: 16 }),
        unitFeatures: [
          sneakAttackFeature({
            classLevel: input.withSupremeSneak === true ? 9 : 5,
          }),
          cunningStrikeFeature(),
          ...(input.withSupremeSneak === true ? [supremeSneakFeature()] : []),
        ],
        characterUnitRefs:
          input.withSupremeSneak === true
            ? supremeSneakUnitRefs()
            : cunningStrikeUnitRefs(),
        attack,
        ...(input.withOffHandAttack === true
          ? {
              offHandAttack: testDaggerAttack(),
              selectedLoadout: {
                weapon: {
                  itemId: battleObjectId("main:weapon_shortsword"),
                  unitId: unitId("weapon_shortsword"),
                  grip: "one_handed" as const,
                },
                offHandWeapon: {
                  itemId: battleObjectId("off:weapon_dagger"),
                  unitId: unitId("weapon_dagger"),
                },
              },
            }
          : {}),
      }),
      ...(input.withSneakAttackAlly === true
        ? [
            characterSeed({
              combatantId: cunningStrikeAllyId,
              displayName: "Cunning Strike Ally",
              initiative: 5,
              attack: null,
            }),
          ]
        : []),
      statBlockCreatureInit({
        initiative: 10,
        tempHp: 40,
        ...(input.targetStatBlock === undefined
          ? {}
          : { statBlock: input.targetStatBlock }),
      }),
    ],
  });
  const visibleState = session.state;
  const rogue = visibleState.combatants.get(fighterId);
  if (rogue === undefined) {
    throw new Error("Expected Cunning Strike rogue combatant.");
  }
  const target = visibleState.combatants.get(goblinId);
  if (target === undefined) {
    throw new Error("Expected Cunning Strike target combatant.");
  }
  return battleRuntimeSessionForTest({
    ...session,
    state: {
      ...visibleState,
      combatants: new Map(visibleState.combatants)
        .set(fighterId, {
          ...rogue,
          hidden: { discoveryDc: difficultyClass(16) },
        })
        .set(goblinId, {
          ...target,
          activeEffects: [
            ...target.activeEffects,
            ...(input.targetActiveEffects ?? []),
          ],
          ...(input.targetConcentrating === true
            ? {
                concentration: {
                  sourceProcedureRef: battleProcedureExecutionRefForTest(
                    String("synthetic_cunning_strike_concentration"),
                  ),
                  effectKind: "spellEffect" as const,
                },
              }
            : {}),
        }),
    },
  });
}

function largeTargetStatBlock(): ReturnType<typeof statBlockRecord> {
  const base = statBlockRecord();
  return {
    ...base,
    id: parseSharedStatBlockId(
      "stat_block_synthetic_cunning_strike_large_target",
    ),
    name: "Synthetic Cunning Strike Large Target",
    statBlock: {
      ...base.statBlock,
      displayName: "Synthetic Cunning Strike Large Target",
      size: "large",
    },
  };
}

function targetSizeChangeEffect(
  direction: "increase" | "decrease",
): Extract<BattleActiveEffect, { readonly kind: "spellCreatureSizeChange" }> {
  return {
    kind: "spellCreatureSizeChange",
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String("enlarge_reduce"),
    ),
    sourceCombatantId: fighterId,
    direction,
    expiresAt: {
      kind: "concentration",
      combatantId: fighterId,
      durationTicks: elapsedTimeTicks(60),
    },
  };
}

function requireAttackDamageHole(hole: BattleHole): BattleDamageRollHole {
  if (hole.kind !== "rolledDice" || !("attack" in hole)) {
    throw new Error("Expected attack damage roll hole.");
  }
  return hole;
}

function requireCunningStrikeOptionProcedureRef(
  hole: BattleHole,
  optionId: CunningStrikeOptionId,
) {
  const option = requireAttackDamageHole(hole).cunningStrikeOptions?.find(
    (candidate) => candidate.optionId === optionId,
  );
  if (option === undefined) {
    throw new Error(`Expected Cunning Strike ${optionId} option.`);
  }
  return option.procedureRef;
}

function requireRolledDiceFill(
  fills: readonly BattleFill[],
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  const fill = fills.find((candidate) => candidate.kind === "rolledDice");
  if (fill === undefined || fill.kind !== "rolledDice") {
    throw new Error("Expected rolledDice fill.");
  }
  return fill;
}

function toolPossessionFactsFill(
  hole: BattleHole,
  toolIdsOnPerson: readonly "poisoners_kit"[],
): Extract<BattleFill, { readonly kind: "toolPossessionFacts" }> {
  if (hole.kind !== "toolPossessionFacts") {
    throw new Error("Expected toolPossessionFacts hole.");
  }
  return {
    kind: "toolPossessionFacts",
    holeId: hole.holeId,
    value: { toolIdsOnPerson },
  };
}

function cunningStrikeEndTurnCoverFactsFill(
  hole: BattleHole,
  cover: Extract<
    BattleFill,
    { readonly kind: "cunningStrikeEndTurnCoverFacts" }
  >["value"]["cover"],
): Extract<BattleFill, { readonly kind: "cunningStrikeEndTurnCoverFacts" }> {
  if (hole.kind !== "cunningStrikeEndTurnCoverFacts") {
    throw new Error("Expected Cunning Strike end-turn cover facts hole.");
  }
  return {
    kind: "cunningStrikeEndTurnCoverFacts",
    holeId: hole.holeId,
    value: { cover },
  };
}

function targetTempHp(state: BattleState): number {
  return Number(state.combatants.get(goblinId)?.tempHp ?? 0);
}
