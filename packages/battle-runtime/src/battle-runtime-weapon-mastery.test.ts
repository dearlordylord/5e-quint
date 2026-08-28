import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.fighter-tactical-master unit-feature.weapon-mastery-push unit-feature.weapon-mastery-slow
import { attackBonus, classLevel } from "@dnd/shared/types";
import { Either } from "effect";
import {
  characterBattleFeatureInitForTest,
  startBattleRight,
  startBattleSessionRight,
  requireResolved,
  fighterVsGoblinBattle,
  masterySapUnitRefs,
  masteryToppleUnitRefs,
  masteryCleaveUnitRefs,
  tacticalMasterReplacementUnitRefs,
  longswordWeaponMasterySelections,
  greataxeWeaponMasterySelections,
  longbowWeaponMasterySelections,
  quarterstaffWeaponMasterySelections,
  fighterAttackSubject,
  attackExecutionSelectionForSubjectForTest,
  goblinAttackSubject,
  attackInitialTargetHole,
  attackRollHoleAfterTarget,
  attackDamageHoleAfterHit,
  resolveLongswordHit,
  resolveLongswordMiss,
  findHole,
  requireHole,
  targetFill,
  attackTargetFill,
  attackTargetSpatialFact,
  attackRollFill,
  unitFeatureDecisionFill,
  concentrationSavingThrowFill,
  interruptDecisionFill,
  savingThrowOutcomeFill,
  damageRollFill,
  damageRollFillWithGroups,
  attackDamageDispositionFill,
  battleTablePositionId,
  characterSeed,
  testShortswordAttack,
  testQuarterstaffAttack,
  testGreataxeAttack,
  testRangedCleaveLongbowAttack,
  testRangedCleaveLongbowUnitRef,
  statBlockCreatureInit,
  requireCharacterUnitProcedureRefForTest,
  reactionModifierUnitRef,
  testCharacterD20Statistics,
  uncannyDodgeUnit,
  wizardSpellcasting,
  fighterId,
  goblinId,
  skeletonId,
  wizardId,
  applyWeaponMasterySapOnHit,
  battleAbilityModifier,
  battleId,
  concentrationSavingThrowDc,
  difficultyClass,
  elapsedTimeTicks,
  endTurn,
  hasCondition,
  holeId,
  Hp,
  movementDeltaFeet,
  movementFeet,
  movementFill,
  resolveBattleInterrupt,
  resolveBattleSubject,
  supportedBattleUnitRef,
  unitLibrary,
} from "./battle-runtime.test-support.ts";
import { battleAmmunitionStock } from "./index.ts";
import type {
  BattleState,
  BattleSubject,
  CombatantId,
} from "./battle-runtime.test-support.ts";
import {
  fighterRemarkableAthleteUnitId,
  wardingBondUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import { weaponMasteryCleaveExtraAttack } from "./battle-reducer/attack-roll.ts";
import { attackActionOptionForSubject } from "./battle-reducer/attack-damage-apply.ts";
import { resolveHuntersPreyHordeBreakerContinuation } from "./battle-reducer/attack-main.ts";
import { WEAPON_MASTERY_SAP_SUPPORT_PROFILE } from "./unit-feature-support.ts";
import {
  battleUnitRefWithSupportProfiles,
  speciesHalflingLuckUnitId,
} from "./unit-profile-admission.test-support.ts";
import { describe, expect, test } from "vitest";
import {
  battleActiveEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
  battleFrontierInterruptDecisionForState,
} from "./battle-runtime.test-support.ts";
import {
  spellAct,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";

function requireMechanicalCharacterProcedureRef(
  state: BattleState,
  actorId: CombatantId,
  procedure: "weaponMasterySlow" | "weaponMasterySap" | "spellAttackDamage",
) {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    throw new Error(`Expected character actor ${actorId}.`);
  }
  const binding =
    procedure === "spellAttackDamage"
      ? actor.origin.execution.procedureBindings.find(
          (candidate) =>
            candidate.procedure.kind === "spellInvocation" &&
            typeof candidate.procedure.execution === "object" &&
            candidate.procedure.execution.procedure === procedure,
        )
      : actor.origin.execution.procedureBindings.find(
          (candidate) =>
            candidate.procedure.kind === "unitSupportProfile" &&
            candidate.procedure.execution === procedure,
        );
  if (binding === undefined) {
    throw new Error(`Expected mechanical procedure ${procedure}.`);
  }
  return binding.procedureRef;
}

function selectedDarkOnesBlessingUnit() {
  const unit = unitLibrary.requireUnit("warlock_dark_ones_blessing");
  const admitted = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  if (Either.isLeft(admitted)) {
    throw new Error(admitted.left.message);
  }
  return { unit, unitRef: admitted.right };
}

function darkOnesBlessingRangeFact(
  sourceProcedureRef: ReturnType<typeof battleProcedureExecutionRefForTest>,
) {
  return {
    kind: "enemyZeroHitPointTemporaryHitPointsBeneficiaryWithinRange" as const,
    beneficiaryId: fighterId,
    damageSourceId: fighterId,
    targetId: skeletonId,
    sourceProcedureRef,
    rangeFeet: movementFeet(10),
  };
}

function withWardingBondTargetAndConcentratingCaster(
  state: BattleState,
  targetId: CombatantId,
  casterId: CombatantId,
): BattleState {
  const target = state.combatants.get(targetId);
  const caster = state.combatants.get(casterId);
  if (target === undefined || caster === undefined) {
    throw new Error("Expected Warding Bond fixture combatants.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants)
      .set(targetId, {
        ...target,
        activeEffects: [
          ...target.activeEffects,
          {
            kind: "wardingBond" as const,
            effectRef: battleActiveEffectExecutionRefForTest("mastery-ward"),
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              String(wardingBondUnitId),
            ),
            sourceCombatantId: casterId,
            expiresAt: {
              kind: "duration" as const,
              durationTicks: elapsedTimeTicks(600),
            },
          },
        ],
      })
      .set(casterId, {
        ...caster,
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String(wardingBondUnitId),
          ),
          effectKind: "spellEffect" as const,
        },
      }),
  };
}

describe("battle runtime: Weapon Mastery", () => {
  test("attack resolution rejects an Unconscious current character at 0 HP", () => {
    const state = startBattleRight({
      battleId: battleId("battle-unconscious-actor-resolve"),
      combatants: [
        characterSeed({ initiative: 20, currentHp: 0 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    const result = resolveBattleSubject({
      state,
      subject: fighterAttackSubject(state, "Longsword"),
      fills: [],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: fighterId,
            hp: 0,
            zeroHpLifecycle: expect.objectContaining({
              policy: "usesDeathSavingThrows",
              dead: false,
            }),
            conditions: expect.arrayContaining([
              "incapacitated",
              "unconscious",
              "prone",
            ]),
          }),
        ]),
      },
    });
  });

  test("attack replay asks for a target before roll or damage", () => {
    const state = fighterVsGoblinBattle();
    const result = resolveBattleSubject({
      state,
      subject: fighterAttackSubject(state, "Longsword"),
      fills: [],
    });

    expect(result).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "targetChoice",
          label: "Attack target",
          choices: [goblinId],
        },
      ],
    });
  });

  test("attack replay asks for an attack roll after target selection", () => {
    const state = fighterVsGoblinBattle();
    const subject = fighterAttackSubject(state, "Longsword") satisfies Extract<
      BattleSubject,
      { readonly tag: "action" }
    >;
    const targetHole = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [],
      }),
      "targetChoice",
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        attackTargetFill(targetHole, subject.actorId, goblinId, {
          ...attackExecutionSelectionForSubjectForTest(subject),
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "attackRoll", label: "weapon_longsword attack roll" }],
    });

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          {
            kind: "targetChoice",
            holeId: targetHole.holeId,
            value: goblinId,
          },
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
  });

  test("attack hit asks for weapon_longsword damage dice before spending the action", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = requireHole(
      resolveBattleSubject({
        state,
        subject: fighterAttackSubject(state, "Longsword"),
        fills: [],
      }),
      "targetChoice",
    );
    const rollHole = requireHole(
      resolveBattleSubject({
        state,
        subject: fighterAttackSubject(state, "Longsword"),
        fills: [targetFill(targetHole, goblinId)],
      }),
      "attackRoll",
    );

    const result = resolveBattleSubject({
      state,
      subject: fighterAttackSubject(state, "Longsword"),
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "rolledDice",
          label: "weapon_longsword damage (1d8+3-slashing)",
          attack: {
            weapon: { weaponUnitId: "weapon_longsword" },
            ability: "str",
            abilityModifier: 3,
          },
        },
      ],
      snapshot: {
        turn: {
          actionResources: [{ kind: "action", source: "turn" }],
        },
      },
    });
  });

  test("Weapon Mastery Sap applies next attack Disadvantage on a selected Sap weapon hit", () => {
    const state = fighterVsGoblinBattle({
      characterUnitRefs: masterySapUnitRefs(),
      weaponMasteries: longswordWeaponMasterySelections(),
    });
    const subject = fighterAttackSubject(state);
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
    const damageHole = attackDamageHoleAfterHit(
      state,
      targetHole,
      rollHole,
      { total: 15, naturalD20: 10 },
      subject,
    );

    const hit = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(targetHole, goblinId),
          attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
          damageRollFill(damageHole, 1),
        ],
      }),
    );

    expect(hit.state.combatants.get(goblinId)?.activeEffects).toContainEqual({
      kind: "nextAttackRollBySelf",
      sourceProcedureRef: expect.any(String),
      sourceCombatantId: fighterId,
      mode: "disadvantage",
      expiresAt: { kind: "startOfTurn", combatantId: fighterId },
    });

    const goblinTurn = requireResolved(
      endTurn({ state: hit.state, actorId: fighterId }),
    ).state;
    const goblinSubject = goblinAttackSubject(goblinTurn, "Scimitar");
    const goblinTarget = attackInitialTargetHole(goblinTurn, goblinSubject);
    const goblinRoll = attackRollHoleAfterTarget(
      goblinTurn,
      goblinTarget,
      goblinSubject,
      fighterId,
    );

    expect(goblinRoll).toMatchObject({
      kind: "attackRoll",
      rollMode: "disadvantage",
    });

    const missed = requireResolved(
      resolveBattleSubject({
        state: goblinTurn,
        subject: goblinSubject,
        fills: [
          targetFill(goblinTarget, fighterId),
          attackRollFill(goblinRoll, {
            total: 1,
            naturalD20: 1,
            rollMode: "disadvantage",
          }),
        ],
      }),
    );

    expect(
      missed.state.combatants.get(goblinId)?.activeEffects,
    ).not.toContainEqual(
      expect.objectContaining({ sourceProcedureRef: expect.any(String) }),
    );
  });

  test("Weapon Mastery Sap dispatches by property support profile, not mastery unit identity", () => {
    const hit = resolveLongswordHit(
      fighterVsGoblinBattle({
        characterUnitRefs: [
          {
            unit: unitLibrary.requireUnit("fighter_second_wind"),
            supportProfiles: [WEAPON_MASTERY_SAP_SUPPORT_PROFILE],
          },
        ],
        weaponMasteries: longswordWeaponMasterySelections(),
      }),
    );

    expect(hit.state.combatants.get(goblinId)?.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "nextAttackRollBySelf",
        sourceProcedureRef: expect.any(String),
      }),
    );
  });

  test("Weapon Mastery Sap expires at the start of the attacker's next turn without a target attack", () => {
    const hit = resolveLongswordHit(
      fighterVsGoblinBattle({
        characterUnitRefs: masterySapUnitRefs(),
        weaponMasteries: longswordWeaponMasterySelections(),
      }),
    );

    expect(hit.state.combatants.get(goblinId)?.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "nextAttackRollBySelf",
        sourceProcedureRef: expect.any(String),
      }),
    );

    const goblinTurn = requireResolved(
      endTurn({ state: hit.state, actorId: fighterId }),
    ).state;
    const fighterNextTurn = requireResolved(
      endTurn({ state: goblinTurn, actorId: goblinId }),
    ).state;

    expect(
      fighterNextTurn.combatants.get(goblinId)?.activeEffects,
    ).not.toContainEqual(
      expect.objectContaining({ sourceProcedureRef: expect.any(String) }),
    );
  });

  test("Weapon Mastery Sap is gated by hit, selected mastery ownership, and Sap weapon property", () => {
    const hitWithoutSelectionState = fighterVsGoblinBattle({
      characterUnitRefs: masterySapUnitRefs(),
    });
    const subject = fighterAttackSubject(hitWithoutSelectionState);
    const hitWithoutSelection = resolveLongswordHit(
      hitWithoutSelectionState,
      subject,
    );
    const missedWithSelection = resolveLongswordMiss(
      fighterVsGoblinBattle({
        characterUnitRefs: masterySapUnitRefs(),
        weaponMasteries: longswordWeaponMasterySelections(),
      }),
      subject,
    );
    const hitWithSelectionButNoSapSupport = resolveLongswordHit(
      fighterVsGoblinBattle({
        weaponMasteries: longswordWeaponMasterySelections(),
      }),
      subject,
    );
    const selectedNonSapWeaponState = fighterVsGoblinBattle({
      characterUnitRefs: masterySapUnitRefs(),
      weaponMasteries: [
        {
          weaponUnitId: parseSharedUnitId("weapon_shortsword"),
        },
      ],
    });
    const selectedNonSapWeapon = applyWeaponMasterySapOnHit(
      selectedNonSapWeaponState,
      fighterId,
      goblinId,
      testShortswordAttack(),
    );

    for (const result of [
      hitWithoutSelection,
      missedWithSelection,
      hitWithSelectionButNoSapSupport,
    ]) {
      expect(result.state.combatants.get(goblinId)?.activeEffects).toEqual([]);
    }
    expect(
      selectedNonSapWeapon.combatants.get(goblinId)?.activeEffects,
    ).toEqual([]);
  });

  test("Fighter Tactical Master can replace Longsword Sap with Push for one attack", () => {
    const state = fighterVsGoblinBattle({
      characterUnitRefs: tacticalMasterReplacementUnitRefs(),
      weaponMasteries: longswordWeaponMasterySelections(),
    });
    const subject = fighterAttackSubject(state);
    const targetHole = attackInitialTargetHole(state, subject);
    const pushDisposition = {
      kind: "pushed" as const,
      distanceFeet: movementFeet(10),
      destinationId: battleTablePositionId("tactical-master-push-destination"),
      provokesOpportunityAttacks: false as const,
    };
    const target = attackTargetFill(
      targetHole,
      subject.actorId,
      goblinId,
      undefined,
      [
        {
          kind: "weaponMasteryPushDisposition" as const,
          attackerId: subject.actorId,
          targetId: goblinId,
          ...attackExecutionSelectionForSubjectForTest(subject),
          disposition: pushDisposition,
        },
      ],
    );
    const replacementHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [target] }),
      "unitFeatureDecision",
    );

    expect(replacementHole).toMatchObject({
      label: "Tactical Master mastery replacement",
      choices: ["push", "sap", "slow", "decline"],
    });

    const replacement = unitFeatureDecisionFill(replacementHole, "push");
    const rollHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [target, replacement] }),
      "attackRoll",
    );
    const damageHole = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          target,
          replacement,
          attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    const hit = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          target,
          replacement,
          attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
          damageRollFill(damageHole, 1),
        ],
      }),
    );

    expect(hit.shovePushes).toEqual([
      { targetId: goblinId, disposition: pushDisposition },
    ]);
    expect(
      hit.state.combatants.get(goblinId)?.activeEffects,
    ).not.toContainEqual(
      expect.objectContaining({ sourceProcedureRef: expect.any(String) }),
    );
  });

  test("Fighter Tactical Master can replace Longsword Sap with Slow after damage", () => {
    const state = fighterVsGoblinBattle({
      characterUnitRefs: tacticalMasterReplacementUnitRefs(),
      weaponMasteries: longswordWeaponMasterySelections(),
    });
    const subject = fighterAttackSubject(state);
    const targetHole = attackInitialTargetHole(state, subject);
    const target = attackTargetFill(
      targetHole,
      subject.actorId,
      goblinId,
      attackExecutionSelectionForSubjectForTest(subject),
    );
    const replacementHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [target] }),
      "unitFeatureDecision",
    );
    const replacement = unitFeatureDecisionFill(replacementHole, "slow");
    const rollHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [target, replacement] }),
      "attackRoll",
    );
    const damageHole = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          target,
          replacement,
          attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    const hit = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          target,
          replacement,
          attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
          damageRollFill(damageHole, 1),
        ],
      }),
    );
    const slowProcedureRef = requireMechanicalCharacterProcedureRef(
      state,
      fighterId,
      "weaponMasterySlow",
    );
    const sapProcedureRef = requireMechanicalCharacterProcedureRef(
      state,
      fighterId,
      "weaponMasterySap",
    );

    expect(hit.state.combatants.get(goblinId)?.activeEffects).toContainEqual({
      kind: "unitFeatureSpeedDelta",
      sourceProcedureRef: slowProcedureRef,
      sourceCombatantId: fighterId,
      deltaFeet: movementDeltaFeet(-10),
      expiresAt: { kind: "startOfTurn", combatantId: fighterId },
    });
    expect(
      hit.state.combatants.get(goblinId)?.activeEffects,
    ).not.toContainEqual(
      expect.objectContaining({ sourceProcedureRef: sapProcedureRef }),
    );
  });

  test("Fighter Tactical Master decline preserves the attack's original mastery", () => {
    const state = fighterVsGoblinBattle({
      characterUnitRefs: tacticalMasterReplacementUnitRefs(),
      weaponMasteries: longswordWeaponMasterySelections(),
    });
    const subject = fighterAttackSubject(state);
    const targetHole = attackInitialTargetHole(state, subject);
    const target = attackTargetFill(
      targetHole,
      subject.actorId,
      goblinId,
      attackExecutionSelectionForSubjectForTest(subject),
    );
    const replacementHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [target] }),
      "unitFeatureDecision",
    );
    const replacement = unitFeatureDecisionFill(replacementHole, "decline");
    const rollHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [target, replacement] }),
      "attackRoll",
    );
    const damageHole = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          target,
          replacement,
          attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    const hit = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          target,
          replacement,
          attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
          damageRollFill(damageHole, 1),
        ],
      }),
    );

    expect(hit.state.combatants.get(goblinId)?.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "nextAttackRollBySelf",
        sourceProcedureRef: expect.any(String),
      }),
    );
  });

  test("Weapon Mastery Topple opens an optional Constitution save on a selected Topple weapon hit", () => {
    const state = fighterVsGoblinBattle({
      characterUnitRefs: masteryToppleUnitRefs(),
      weaponMasteries: quarterstaffWeaponMasterySelections(),
      attack: testQuarterstaffAttack(),
    });
    const subject = fighterAttackSubject(state, "Quarterstaff");
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "savingThrowOutcome",
          label: "Topple Constitution saving throw",
          ability: "con",
          dc: { kind: "fixed", dc: difficultyClass(13) },
          targetIds: [goblinId],
          targetRollModes: [],
        },
      ],
    });
  });

  test("Weapon Mastery Topple applies Prone on failed save and does nothing on success or decline", () => {
    const state = fighterVsGoblinBattle({
      characterUnitRefs: masteryToppleUnitRefs(),
      weaponMasteries: quarterstaffWeaponMasterySelections(),
      attack: testQuarterstaffAttack(),
    });
    const subject = fighterAttackSubject(state, "Quarterstaff");
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
    const hitFills = [
      targetFill(targetHole, goblinId),
      attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
    ];
    const saveHole = requireHole(
      resolveBattleSubject({ state, subject, fills: hitFills }),
      "savingThrowOutcome",
    );

    const failedSave = resolveBattleSubject({
      state,
      subject,
      fills: [
        ...hitFills,
        savingThrowOutcomeFill(saveHole, [
          { targetId: goblinId, succeeded: false },
        ]),
      ],
    });
    const failedDamageHole = requireHole(failedSave, "rolledDice");
    expect(failedSave).toMatchObject({
      tag: "needsHoles",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: goblinId,
            conditions: expect.arrayContaining(["prone"]),
          }),
        ]),
      },
    });
    const resolvedFailure = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...hitFills,
          savingThrowOutcomeFill(saveHole, [
            { targetId: goblinId, succeeded: false },
          ]),
          damageRollFill(failedDamageHole, 1),
        ],
      }),
    );
    const resolvedFailureTarget =
      resolvedFailure.state.combatants.get(goblinId);
    if (resolvedFailureTarget === undefined) {
      throw new Error("Expected Goblin after Topple resolution.");
    }
    expect(hasCondition(resolvedFailureTarget.conditions, "prone")).toBe(true);

    for (const toppleFill of [
      savingThrowOutcomeFill(saveHole, [
        { targetId: goblinId, succeeded: true },
      ]),
      savingThrowOutcomeFill(saveHole, []),
    ]) {
      const noOp = resolveBattleSubject({
        state,
        subject,
        fills: [...hitFills, toppleFill],
      });
      expect(noOp).toMatchObject({
        tag: "needsHoles",
        snapshot: {
          combatants: expect.arrayContaining([
            expect.objectContaining({
              combatantId: goblinId,
              conditions: expect.not.arrayContaining(["prone"]),
            }),
          ]),
        },
      });
    }
  });

  test("Weapon Mastery Topple is gated by hit, selected mastery ownership, Topple weapon property, and support profile", () => {
    const eligibleState = fighterVsGoblinBattle({
      characterUnitRefs: masteryToppleUnitRefs(),
      weaponMasteries: quarterstaffWeaponMasterySelections(),
      attack: testQuarterstaffAttack(),
    });
    const subject = fighterAttackSubject(eligibleState, "Quarterstaff");
    const targetHole = attackInitialTargetHole(eligibleState, subject);
    const rollHole = attackRollHoleAfterTarget(
      eligibleState,
      targetHole,
      subject,
    );
    const saveHole = requireHole(
      resolveBattleSubject({
        state: eligibleState,
        subject,
        fills: [
          targetFill(targetHole, goblinId),
          attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        ],
      }),
      "savingThrowOutcome",
    );
    const toppleSaveFill = savingThrowOutcomeFill(saveHole, [
      { targetId: goblinId, succeeded: false },
    ]);

    const missesWithSelection = resolveBattleSubject({
      state: eligibleState,
      subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 1, naturalD20: 1 }),
        toppleSaveFill,
      ],
    });
    const noSelection = resolveBattleSubject({
      state: fighterVsGoblinBattle({
        characterUnitRefs: masteryToppleUnitRefs(),
        attack: testQuarterstaffAttack(),
      }),
      subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        toppleSaveFill,
      ],
    });
    const noSupport = resolveBattleSubject({
      state: fighterVsGoblinBattle({
        weaponMasteries: quarterstaffWeaponMasterySelections(),
        attack: testQuarterstaffAttack(),
      }),
      subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        toppleSaveFill,
      ],
    });
    const nonToppleWeaponState = fighterVsGoblinBattle({
      characterUnitRefs: masteryToppleUnitRefs(),
      weaponMasteries: longswordWeaponMasterySelections(),
    });
    const nonToppleWeaponSubject = fighterAttackSubject(nonToppleWeaponState);
    const nonToppleTargetHole = attackInitialTargetHole(
      nonToppleWeaponState,
      nonToppleWeaponSubject,
    );
    const nonToppleRollHole = attackRollHoleAfterTarget(
      nonToppleWeaponState,
      nonToppleTargetHole,
      nonToppleWeaponSubject,
    );
    const nonToppleWeapon = resolveBattleSubject({
      state: nonToppleWeaponState,
      subject: nonToppleWeaponSubject,
      fills: [
        targetFill(nonToppleTargetHole, goblinId),
        attackRollFill(nonToppleRollHole, { total: 15, naturalD20: 10 }),
        toppleSaveFill,
      ],
    });

    for (const result of [
      missesWithSelection,
      noSelection,
      noSupport,
      nonToppleWeapon,
    ]) {
      expect(result).toMatchObject({
        tag: "invalid",
        message:
          "Weapon Mastery Topple Saving Throw is only valid for an eligible Topple weapon hit.",
      });
    }
  });

  test("Weapon Mastery Cleave optionally attacks a caller-eligible second target with same weapon damage and no positive ability modifier", () => {
    const halflingLuck = unitLibrary.requireUnit(speciesHalflingLuckUnitId);
    const halflingLuckRef = battleUnitRefWithSupportProfiles({
      unitRef: { unitId: halflingLuck.id },
      unit: halflingLuck,
    });
    if (Either.isLeft(halflingLuckRef)) {
      throw new Error(halflingLuckRef.left.message);
    }
    const state = startBattleRight({
      battleId: battleId("battle-weapon-mastery-cleave"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: [
            ...masteryCleaveUnitRefs(),
            halflingLuckRef.right,
          ],
          unitFeatures: [characterBattleFeatureInitForTest(halflingLuck)],
          weaponMasteries: greataxeWeaponMasterySelections(),
          attack: testGreataxeAttack(),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Table-Chosen Second Target",
          initiative: 9,
          currentHp: 10,
          maxHp: 10,
          attack: null,
        }),
      ],
    });
    const subject = fighterAttackSubject(state, "Greataxe");
    const primaryTarget = attackInitialTargetHole(state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      state,
      primaryTarget,
      subject,
      goblinId,
    );
    const primaryDamage = attackDamageHoleAfterHit(
      state,
      primaryTarget,
      primaryRoll,
      { total: 15, naturalD20: 10 },
      subject,
      goblinId,
    );
    const primaryFills = [
      attackTargetFill(
        primaryTarget,
        fighterId,
        goblinId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      attackRollFill(primaryRoll, { total: 15, naturalD20: 10 }),
      damageRollFill(primaryDamage, 1),
    ];
    const decision = requireHole(
      resolveBattleSubject({ state, subject, fills: primaryFills }),
      "unitFeatureDecision",
    );
    expect(decision).toMatchObject({
      label: "Use Cleave",
      choices: ["use", "decline"],
    });

    const declined = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [...primaryFills, unitFeatureDecisionFill(decision, "decline")],
      }),
    );
    expect(declined.state.combatants.get(goblinId)?.hp).toBe(Hp(6));
    expect(declined.state.combatants.get(skeletonId)?.hp).toBe(Hp(10));
    expect(
      declined.state.currentTurnResources
        .weaponMasteryCleaveAttackersUsedThisTurn,
    ).toEqual([]);

    const target = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
      }),
      "targetChoice",
    );
    const cleaveFacts = [
      attackTargetSpatialFact(
        fighterId,
        skeletonId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      {
        kind: "cleaveSecondTargetWithin5FeetOfFirstTarget" as const,
        attackerId: fighterId,
        firstTargetId: goblinId,
        secondTargetId: skeletonId,
      },
    ];
    const targetFillValue = targetFill(target, skeletonId, cleaveFacts);
    const cleaveRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
        ],
      }),
      "attackRoll",
    );
    expect(cleaveRoll).toMatchObject({
      label: "Cleave attack roll",
      attack: expect.objectContaining({
        kind: "weapon",
        weapon: expect.objectContaining({
          weaponUnitId: "weapon_greataxe",
        }),
        damageAbilityModifier: battleAbilityModifier(0),
      }),
    });

    const naturalOneRoll = { total: 6, naturalD20: 1 } as const;
    const naturalOneCleave = resolveBattleSubject({
      state,
      subject,
      fills: [
        ...primaryFills,
        unitFeatureDecisionFill(decision, "use"),
        targetFillValue,
        attackRollFill(cleaveRoll, naturalOneRoll),
      ],
    });
    const naturalOneDecision = requireHole(naturalOneCleave, "attackRoll");
    if (!("d20TestNaturalOneRerolls" in naturalOneDecision)) {
      throw new Error("Expected Cleave to offer a natural-one reroll.");
    }
    expect(naturalOneDecision.d20TestNaturalOneRerolls).toHaveLength(1);
    const rerollOffer = naturalOneDecision.d20TestNaturalOneRerolls[0];
    if (rerollOffer === undefined) {
      throw new Error("Expected one natural-one reroll offer.");
    }

    // Declining Luck is intentionally legal but tactically poor; it verifies
    // that the missed extra attack still consumes Cleave's once-per-turn use.
    const declinedRerollCleave = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
          attackRollFill(naturalOneDecision, {
            ...naturalOneRoll,
            d20TestNaturalOneReroll: {
              kind: "decline",
              effectKind: rerollOffer.effectKind,
            },
          }),
        ],
      }),
    );
    expect(declinedRerollCleave.state.combatants.get(skeletonId)?.hp).toBe(
      Hp(10),
    );
    expect(
      declinedRerollCleave.state.currentTurnResources
        .weaponMasteryCleaveAttackersUsedThisTurn,
    ).toEqual([fighterId]);

    const cleaveDamageRequest = resolveBattleSubject({
      state,
      subject,
      fills: [
        ...primaryFills,
        unitFeatureDecisionFill(decision, "use"),
        targetFillValue,
        attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
      ],
    });
    if (cleaveDamageRequest.tag !== "needsHoles") {
      throw new Error(
        `Expected Cleave damage request, got ${cleaveDamageRequest.tag}.`,
      );
    }
    const cleaveDamage = requireHole(cleaveDamageRequest, "rolledDice");
    expect(
      cleaveDamageRequest.state.currentTurnResources
        .weaponMasteryCleaveAttackersUsedThisTurn,
    ).toEqual([]);
    expect(cleaveDamage).toMatchObject({
      label: "Cleave damage (1d12-slashing)",
    });

    const resolvedResult = resolveBattleSubject({
      state,
      subject,
      fills: [
        ...primaryFills,
        unitFeatureDecisionFill(decision, "use"),
        targetFillValue,
        attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
        damageRollFill(cleaveDamage, 4),
      ],
    });
    if (resolvedResult.tag === "invalid") {
      throw new Error(resolvedResult.message);
    }
    expect(resolvedResult).toMatchObject({ tag: "resolved" });
    const resolved = requireResolved(resolvedResult);

    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(Hp(6));
    expect(
      resolved.state.currentTurnResources
        .weaponMasteryCleaveAttackersUsedThisTurn,
    ).toEqual([fighterId]);
  });

  test("Cleave applies a fresh Ray of Enfeeblement damage penalty after Remarkable Athlete movement", () => {
    const remarkableAthlete = unitLibrary.requireUnit(
      fighterRemarkableAthleteUnitId,
    );
    const rayOfEnfeeblement = spellRecord("ray_of_enfeeblement");
    const session = startBattleSessionRight({
      battleId: battleId(
        "battle-weapon-mastery-cleave-critical-movement-enfeeblement",
      ),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Ray of Enfeeblement caster",
          initiative: 30,
          classLevels: [{ className: "wizard", level: 3 }],
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [rayOfEnfeeblement],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
        }),
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "fighter", level: 3 }],
          characterUnitRefs: [
            ...masteryCleaveUnitRefs(),
            supportedBattleUnitRef(remarkableAthlete),
          ],
          unitFeatures: [
            characterBattleFeatureInitForTest(remarkableAthlete, [
              { className: "fighter", level: classLevel(3) },
            ]),
          ],
          weaponMasteries: greataxeWeaponMasterySelections(),
          attack: testGreataxeAttack(),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Cleave second target",
          initiative: 9,
        }),
      ],
    });
    const ray = spellAct({ session, spellId: "ray_of_enfeeblement" });
    const rayTarget = findHole(ray.initialHoles, "spellTargetList");
    const rayTargetFill = spellTargetListFill(
      rayTarget,
      wizardId,
      "ray_of_enfeeblement",
      [fighterId],
    );
    const raySave = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject: ray.subject,
        fills: [rayTargetFill],
      }),
      "savingThrowOutcome",
    );
    const enfeebled = requireResolved(
      resolveBattleSubject({
        state: session.state,
        subject: ray.subject,
        fills: [
          rayTargetFill,
          savingThrowOutcomeFill(raySave, [
            { targetId: fighterId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const fighterTurn = requireResolved(
      endTurn({ state: enfeebled, actorId: wizardId }),
    ).state;

    const subject = fighterAttackSubject(fighterTurn, "Greataxe");
    const primaryTarget = attackInitialTargetHole(fighterTurn, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      fighterTurn,
      primaryTarget,
      subject,
      goblinId,
    );
    const targetChoice = attackTargetFill(
      primaryTarget,
      fighterId,
      goblinId,
      attackExecutionSelectionForSubjectForTest(subject),
    );
    const attackRoll = attackRollFill(primaryRoll, {
      total: 18,
      naturalD20: 14,
      rollMode: "disadvantage",
    });
    const primaryDamage = requireHole(
      resolveBattleSubject({
        state: fighterTurn,
        subject,
        fills: [targetChoice, attackRoll],
      }),
      "rolledDice",
    );
    const primaryDamageFill = damageRollFill(primaryDamage, 6);
    const primaryPenalty = requireHole(
      resolveBattleSubject({
        state: fighterTurn,
        subject,
        fills: [targetChoice, attackRoll, primaryDamageFill],
      }),
      "rolledDice",
    );
    expect(primaryPenalty).toHaveProperty("sourceDamageRollPenalty");
    const primaryFills = [
      targetChoice,
      attackRoll,
      primaryDamageFill,
      damageRollFillWithGroups(primaryPenalty, [[2]]),
    ];
    const cleaveDecisionResult = resolveBattleSubject({
      state: fighterTurn,
      subject,
      fills: primaryFills,
    });
    if (cleaveDecisionResult.tag !== "needsHoles") {
      throw new Error("Expected the Cleave decision frontier.");
    }
    const cleaveDecision = requireHole(
      cleaveDecisionResult,
      "unitFeatureDecision",
    );
    const secondTarget = requireHole(
      resolveBattleSubject({
        state: fighterTurn,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(cleaveDecision, "use"),
        ],
      }),
      "targetChoice",
    );
    const secondTargetFill = targetFill(secondTarget, skeletonId, [
      attackTargetSpatialFact(
        fighterId,
        skeletonId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      {
        kind: "cleaveSecondTargetWithin5FeetOfFirstTarget",
        attackerId: fighterId,
        firstTargetId: goblinId,
        secondTargetId: skeletonId,
      },
    ]);
    const throughSecondTarget = [
      ...primaryFills,
      unitFeatureDecisionFill(cleaveDecision, "use"),
      secondTargetFill,
    ];
    const cleaveRoll = requireHole(
      resolveBattleSubject({
        state: fighterTurn,
        subject,
        fills: throughSecondTarget,
      }),
      "attackRoll",
    );
    const criticalCleaveRoll = attackRollFill(cleaveRoll, {
      total: 24,
      naturalD20: 20,
      rollMode: "disadvantage",
    });
    const remarkableAthleteDecision = requireHole(
      resolveBattleSubject({
        state: fighterTurn,
        subject,
        fills: [...throughSecondTarget, criticalCleaveRoll],
      }),
      "unitFeatureDecision",
    );
    expect(remarkableAthleteDecision).toMatchObject({
      label: "Use Remarkable Athlete movement",
    });
    const throughMovementDecision = [
      ...throughSecondTarget,
      criticalCleaveRoll,
      unitFeatureDecisionFill(remarkableAthleteDecision, "use"),
    ];
    const movement = requireHole(
      resolveBattleSubject({
        state: fighterTurn,
        subject,
        fills: throughMovementDecision,
      }),
      "movement",
    );
    const throughMovement = [
      ...throughMovementDecision,
      movementFill(movement, {
        movementCostFeet: 10,
        provokedOpportunityAttacks: [],
      }),
    ];
    const cleaveDamage = requireHole(
      resolveBattleSubject({
        state: fighterTurn,
        subject,
        fills: throughMovement,
      }),
      "rolledDice",
    );
    const cleaveDamageFill = damageRollFillWithGroups(cleaveDamage, [[4, 4]]);
    const cleavePenalty = requireHole(
      resolveBattleSubject({
        state: fighterTurn,
        subject,
        fills: [...throughMovement, cleaveDamageFill],
      }),
      "rolledDice",
    );
    expect(cleavePenalty).toMatchObject({
      sourceDamageRollPenalty: {
        affectedCombatantId: fighterId,
        damageRollHoleId: cleaveDamage.holeId,
      },
    });
    expect(
      resolveBattleSubject({
        state: fighterTurn,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(cleaveDecision, "decline"),
          damageRollFillWithGroups(cleavePenalty, [[2]]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Weapon Mastery additional weapon attack fills require using the attack.",
    });
    const primaryAttack = attackActionOptionForSubject(fighterTurn, subject);
    if (primaryAttack === undefined) {
      throw new Error("Expected the selected Greataxe attack option.");
    }
    expect(
      resolveHuntersPreyHordeBreakerContinuation({
        state: cleaveDecisionResult.state,
        subject,
        firstTargetId: goblinId,
        attack: primaryAttack,
        fills: [damageRollFillWithGroups(cleavePenalty, [[2]])],
        handledInterruptTrigger: "attackHit",
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Source damage roll penalty does not match the Horde Breaker damage event.",
    });
    const resolved = requireResolved(
      resolveBattleSubject({
        state: fighterTurn,
        subject,
        fills: [
          ...throughMovement,
          cleaveDamageFill,
          damageRollFillWithGroups(cleavePenalty, [[2]]),
        ],
      }),
    );
    expect(resolved.state.combatants.get(goblinId)?.hp).toBe(Hp(3));
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(Hp(4));
    expect(
      resolved.state.currentTurnResources
        .weaponMasteryCleaveAttackersUsedThisTurn,
    ).toEqual([fighterId]);
  });

  test("Weapon Mastery Cleave removes positive damage modifiers from every ability choice", () => {
    const cleaveAttack = weaponMasteryCleaveExtraAttack({
      ...testGreataxeAttack(),
      alternateAbilityChoices: [
        {
          ability: "dex",
          abilityModifier: battleAbilityModifier(2),
          attackBonus: attackBonus(4),
          damageAbilityModifier: battleAbilityModifier(2),
        },
        {
          ability: "int",
          abilityModifier: battleAbilityModifier(-1),
          attackBonus: attackBonus(1),
          damageAbilityModifier: battleAbilityModifier(-1),
        },
      ],
    });

    expect(cleaveAttack).toMatchObject({
      damageAbilityModifier: battleAbilityModifier(0),
      alternateAbilityChoices: [
        {
          ability: "dex",
          abilityModifier: battleAbilityModifier(2),
          attackBonus: attackBonus(4),
          damageAbilityModifier: battleAbilityModifier(0),
        },
        {
          ability: "int",
          abilityModifier: battleAbilityModifier(-1),
          attackBonus: attackBonus(1),
          damageAbilityModifier: battleAbilityModifier(-1),
        },
      ],
    });
  });

  test("Weapon Mastery Cleave preserves a negative ability modifier on second-hit damage", () => {
    const state = startBattleRight({
      battleId: battleId("battle-weapon-mastery-cleave-negative-modifier"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: masteryCleaveUnitRefs(),
          weaponMasteries: greataxeWeaponMasterySelections(),
          attack: testGreataxeAttack(battleAbilityModifier(-1)),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Second Target",
          initiative: 9,
        }),
      ],
    });
    const subject = fighterAttackSubject(state, "Greataxe");
    const primaryTarget = attackInitialTargetHole(state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      state,
      primaryTarget,
      subject,
      goblinId,
    );
    const primaryDamage = attackDamageHoleAfterHit(
      state,
      primaryTarget,
      primaryRoll,
      { total: 15, naturalD20: 10 },
      subject,
      goblinId,
    );
    const primaryFills = [
      attackTargetFill(
        primaryTarget,
        fighterId,
        goblinId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      attackRollFill(primaryRoll, { total: 15, naturalD20: 10 }),
      damageRollFill(primaryDamage, 4),
    ];
    const decision = requireHole(
      resolveBattleSubject({ state, subject, fills: primaryFills }),
      "unitFeatureDecision",
    );
    const target = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
      }),
      "targetChoice",
    );
    const targetFillValue = targetFill(target, skeletonId, [
      attackTargetSpatialFact(
        fighterId,
        skeletonId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      {
        kind: "cleaveSecondTargetWithin5FeetOfFirstTarget" as const,
        attackerId: fighterId,
        firstTargetId: goblinId,
        secondTargetId: skeletonId,
      },
    ]);
    const cleaveRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
        ],
      }),
      "attackRoll",
    );
    const cleaveDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
          attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
          attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
          damageRollFill(cleaveDamage, 4),
        ],
      }),
    );

    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(Hp(7));
  });

  test("Weapon Mastery Cleave second-hit damage requests Concentration before applying damage", () => {
    const baseState = startBattleRight({
      battleId: battleId("battle-weapon-mastery-cleave-concentration"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: masteryCleaveUnitRefs(),
          weaponMasteries: greataxeWeaponMasterySelections(),
          attack: testGreataxeAttack(),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Concentrating Second Target",
          initiative: 9,
        }),
      ],
    });
    const skeleton = baseState.combatants.get(skeletonId);
    if (skeleton === undefined) {
      throw new Error("Expected Skeleton combatant.");
    }
    const state: BattleState = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(skeletonId, {
        ...skeleton,
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String("mage_armor"),
          ),
          effectKind: "spellEffect" as const,
        },
      }),
    };
    const subject = fighterAttackSubject(state, "Greataxe");
    const primaryTarget = attackInitialTargetHole(state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      state,
      primaryTarget,
      subject,
      goblinId,
    );
    const primaryDamage = attackDamageHoleAfterHit(
      state,
      primaryTarget,
      primaryRoll,
      { total: 15, naturalD20: 10 },
      subject,
      goblinId,
    );
    const primaryFills = [
      attackTargetFill(
        primaryTarget,
        fighterId,
        goblinId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      attackRollFill(primaryRoll, { total: 15, naturalD20: 10 }),
      damageRollFill(primaryDamage, 1),
    ];
    const decision = requireHole(
      resolveBattleSubject({ state, subject, fills: primaryFills }),
      "unitFeatureDecision",
    );
    const target = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
      }),
      "targetChoice",
    );
    const targetFillValue = targetFill(target, skeletonId, [
      attackTargetSpatialFact(
        fighterId,
        skeletonId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      {
        kind: "cleaveSecondTargetWithin5FeetOfFirstTarget" as const,
        attackerId: fighterId,
        firstTargetId: goblinId,
        secondTargetId: skeletonId,
      },
    ]);
    const cleaveRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
        ],
      }),
      "attackRoll",
    );
    const cleaveDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
          attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    const concentration = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
          attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
          damageRollFill(cleaveDamage, 4),
        ],
      }),
      "concentrationSavingThrow",
    );
    expect(concentration).toMatchObject({
      combatantId: skeletonId,
      damageAmount: 4,
      dc: concentrationSavingThrowDc(4),
    });

    const resolvedResult = resolveBattleSubject({
      state,
      subject,
      fills: [
        ...primaryFills,
        unitFeatureDecisionFill(decision, "use"),
        targetFillValue,
        attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
        damageRollFill(cleaveDamage, 4),
        concentrationSavingThrowFill(concentration, true),
      ],
    });
    if (resolvedResult.tag === "invalid") {
      throw new Error(resolvedResult.message);
    }
    const resolved = requireResolved(resolvedResult);
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(Hp(6));
  });

  test("Weapon Mastery Cleave keeps Warding Bond primary shared-damage Concentration separate from the extra attack", () => {
    const state = withWardingBondTargetAndConcentratingCaster(
      startBattleRight({
        battleId: battleId("battle-weapon-mastery-cleave-warding-bond"),
        combatants: [
          characterSeed({
            initiative: 20,
            characterUnitRefs: masteryCleaveUnitRefs(),
            weaponMasteries: greataxeWeaponMasterySelections(),
            attack: testGreataxeAttack(),
          }),
          statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
          statBlockCreatureInit({
            combatantId: skeletonId,
            displayName: "Warding Bond Caster",
            initiative: 9,
          }),
        ],
      }),
      goblinId,
      skeletonId,
    );
    const subject = fighterAttackSubject(state, "Greataxe");
    const primaryTarget = attackInitialTargetHole(state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      state,
      primaryTarget,
      subject,
      goblinId,
    );
    const primaryDamage = attackDamageHoleAfterHit(
      state,
      primaryTarget,
      primaryRoll,
      { total: 20, naturalD20: 15 },
      subject,
      goblinId,
    );
    const primaryFills = [
      attackTargetFill(
        primaryTarget,
        fighterId,
        goblinId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      attackRollFill(primaryRoll, { total: 20, naturalD20: 15 }),
      damageRollFill(primaryDamage, 8),
    ];
    const primarySharedSave = requireHole(
      resolveBattleSubject({ state, subject, fills: primaryFills }),
      "concentrationSavingThrow",
    );
    expect(primarySharedSave).toMatchObject({
      combatantId: skeletonId,
      damageAmount: 5,
      dc: concentrationSavingThrowDc(5),
    });
    const primaryFillsWithSharedSave = [
      ...primaryFills,
      concentrationSavingThrowFill(primarySharedSave, true),
    ];
    const decision = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: primaryFillsWithSharedSave,
      }),
      "unitFeatureDecision",
    );
    const target = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFillsWithSharedSave,
          unitFeatureDecisionFill(decision, "use"),
        ],
      }),
      "targetChoice",
    );
    const targetFillValue = targetFill(target, skeletonId, [
      attackTargetSpatialFact(
        fighterId,
        skeletonId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      {
        kind: "cleaveSecondTargetWithin5FeetOfFirstTarget" as const,
        attackerId: fighterId,
        firstTargetId: goblinId,
        secondTargetId: skeletonId,
      },
    ]);
    const cleaveRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFillsWithSharedSave,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
        ],
      }),
      "attackRoll",
    );
    const cleaveDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFillsWithSharedSave,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
          attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    const cleaveNeedsConcentration = resolveBattleSubject({
      state,
      subject,
      fills: [
        ...primaryFillsWithSharedSave,
        unitFeatureDecisionFill(decision, "use"),
        targetFillValue,
        attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
        damageRollFill(cleaveDamage, 4),
      ],
    });
    if (cleaveNeedsConcentration.tag === "invalid") {
      throw new Error(cleaveNeedsConcentration.message);
    }
    expect(cleaveNeedsConcentration).toMatchObject({ tag: "needsHoles" });
    const cleaveConcentration = requireHole(
      cleaveNeedsConcentration,
      "concentrationSavingThrow",
    );
    expect(cleaveConcentration).toMatchObject({
      combatantId: skeletonId,
      damageAmount: 4,
      dc: concentrationSavingThrowDc(4),
    });

    const resolvedResult = resolveBattleSubject({
      state,
      subject,
      fills: [
        ...primaryFillsWithSharedSave,
        unitFeatureDecisionFill(decision, "use"),
        targetFillValue,
        attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
        damageRollFill(cleaveDamage, 4),
        concentrationSavingThrowFill(cleaveConcentration, true),
      ],
    });
    if (resolvedResult.tag === "invalid") {
      throw new Error(resolvedResult.message);
    }
    const resolved = requireResolved(resolvedResult);
    expect(resolved.state.combatants.get(skeletonId)?.concentration).toEqual({
      sourceProcedureRef: expect.any(String),
      effectKind: "spellEffect",
    });
  });

  test("Weapon Mastery Cleave rejects unused Concentration fills during extra-attack damage replay", () => {
    const state = startBattleRight({
      battleId: battleId("battle-weapon-mastery-cleave-stale-concentration"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: masteryCleaveUnitRefs(),
          weaponMasteries: greataxeWeaponMasterySelections(),
          attack: testGreataxeAttack(),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Second Target",
          initiative: 9,
        }),
      ],
    });
    const subject = fighterAttackSubject(state, "Greataxe");
    const primaryTarget = attackInitialTargetHole(state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      state,
      primaryTarget,
      subject,
      goblinId,
    );
    const primaryDamage = attackDamageHoleAfterHit(
      state,
      primaryTarget,
      primaryRoll,
      { total: 15, naturalD20: 10 },
      subject,
      goblinId,
    );
    const primaryFills = [
      attackTargetFill(
        primaryTarget,
        fighterId,
        goblinId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      attackRollFill(primaryRoll, { total: 15, naturalD20: 10 }),
      damageRollFill(primaryDamage, 1),
    ];
    const decision = requireHole(
      resolveBattleSubject({ state, subject, fills: primaryFills }),
      "unitFeatureDecision",
    );
    const target = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
      }),
      "targetChoice",
    );
    const targetFillValue = targetFill(target, skeletonId, [
      attackTargetSpatialFact(
        fighterId,
        skeletonId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      {
        kind: "cleaveSecondTargetWithin5FeetOfFirstTarget" as const,
        attackerId: fighterId,
        firstTargetId: goblinId,
        secondTargetId: skeletonId,
      },
    ]);
    const cleaveRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
        ],
      }),
      "attackRoll",
    );
    const cleaveDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
          attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    const staleConcentration = {
      kind: "concentrationSavingThrow" as const,
      holeId: holeId("test:stale-cleave-concentration"),
      value: { succeeded: true },
    };
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
          attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
          damageRollFill(cleaveDamage, 4),
          staleConcentration,
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
    });
  });

  test("Weapon Mastery Cleave opens primary after-damage reactions before the extra attack", () => {
    const wizardReady = requireResolved(
      resolveBattleSubject({
        state: startBattleRight({
          battleId: battleId("battle-weapon-mastery-cleave-after-damage-order"),
          combatants: [
            characterSeed({
              combatantId: wizardId,
              displayName: "Wizard",
              initiative: 30,
              attack: null,
              spellcasting: wizardSpellcasting(),
            }),
            characterSeed({
              initiative: 20,
              characterUnitRefs: masteryCleaveUnitRefs(),
              weaponMasteries: greataxeWeaponMasterySelections(),
              attack: testGreataxeAttack(),
            }),
            statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
            statBlockCreatureInit({
              combatantId: skeletonId,
              displayName: "Second Target",
              initiative: 9,
            }),
          ],
        }),
        subject: {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireMechanicalCharacterProcedureRef(
            startBattleRight({
              battleId: battleId(
                "battle-weapon-mastery-cleave-after-damage-order",
              ),
              combatants: [
                characterSeed({
                  combatantId: wizardId,
                  displayName: "Wizard",
                  initiative: 30,
                  attack: null,
                  spellcasting: wizardSpellcasting(),
                }),
                characterSeed({
                  initiative: 20,
                  characterUnitRefs: masteryCleaveUnitRefs(),
                  weaponMasteries: greataxeWeaponMasterySelections(),
                  attack: testGreataxeAttack(),
                }),
                statBlockCreatureInit({
                  combatantId: goblinId,
                  initiative: 10,
                }),
                statBlockCreatureInit({
                  combatantId: skeletonId,
                  displayName: "Second Target",
                  initiative: 9,
                }),
              ],
            }),
            wizardId,
            "spellAttackDamage",
          ),
          mode: { tag: "ready", trigger: "afterDamage" },
        },
        fills: [],
      }),
    );
    const state = requireResolved(
      endTurn({ state: wizardReady.state, actorId: wizardId }),
    ).state;
    const subject = fighterAttackSubject(state, "Greataxe");
    const primaryTarget = attackInitialTargetHole(state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      state,
      primaryTarget,
      subject,
      goblinId,
    );
    const primaryDamage = attackDamageHoleAfterHit(
      state,
      primaryTarget,
      primaryRoll,
      { total: 15, naturalD20: 10 },
      subject,
      goblinId,
    );
    const primaryFills = [
      attackTargetFill(
        primaryTarget,
        fighterId,
        goblinId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      attackRollFill(primaryRoll, { total: 15, naturalD20: 10 }),
      damageRollFill(primaryDamage, 1),
    ];
    const awaitingPrimaryAfterDamage = resolveBattleSubject({
      state,
      subject,
      fills: primaryFills,
    });

    expect(awaitingPrimaryAfterDamage).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "afterDamage" }],
    });
    if (awaitingPrimaryAfterDamage.tag !== "needsHoles") {
      throw new Error(
        `Expected primary after-damage reaction, got ${awaitingPrimaryAfterDamage.tag}.`,
      );
    }
    expect(awaitingPrimaryAfterDamage.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: goblinId, hp: Hp(6) }),
        expect.objectContaining({ combatantId: skeletonId, hp: Hp(10) }),
      ]),
    );

    const afterDecline = resolveBattleInterrupt({
      state: awaitingPrimaryAfterDamage.state,
      fill: interruptDecisionFill(
        battleFrontierInterruptDecisionForState(
          awaitingPrimaryAfterDamage.state,
        )!.decisionHole,
        { kind: "decline", responderId: wizardId },
      ),
    });
    expect(afterDecline).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "unitFeatureDecision" }],
    });
  });

  test("Weapon Mastery Cleave opens attack-hit reactions for the extra attack before damage", () => {
    const state = startBattleRight({
      battleId: battleId("battle-weapon-mastery-cleave-attack-hit-window"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: masteryCleaveUnitRefs(),
          weaponMasteries: greataxeWeaponMasterySelections(),
          attack: testGreataxeAttack(),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Uncanny Second Target",
          initiative: 9,
          attack: null,
          classLevels: [{ className: "rogue", level: 5 }],
          unitFeatures: [
            characterBattleFeatureInitForTest(uncannyDodgeUnit(), [
              { className: "rogue", level: classLevel(5) },
            ]),
          ],
          characterUnitRefs: [reactionModifierUnitRef("rogue_uncanny_dodge")],
        }),
      ],
    });
    const subject = fighterAttackSubject(state, "Greataxe");
    const primaryTarget = attackInitialTargetHole(state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      state,
      primaryTarget,
      subject,
      goblinId,
    );
    const primaryDamage = attackDamageHoleAfterHit(
      state,
      primaryTarget,
      primaryRoll,
      { total: 15, naturalD20: 10 },
      subject,
      goblinId,
    );
    const primaryFills = [
      attackTargetFill(
        primaryTarget,
        fighterId,
        goblinId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      attackRollFill(primaryRoll, { total: 15, naturalD20: 10 }),
      damageRollFill(primaryDamage, 1),
    ];
    const decision = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: primaryFills,
      }),
      "unitFeatureDecision",
    );
    const target = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
      }),
      "targetChoice",
    );
    const targetFillValue = targetFill(target, skeletonId, [
      attackTargetSpatialFact(
        fighterId,
        skeletonId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      {
        kind: "cleaveSecondTargetWithin5FeetOfFirstTarget" as const,
        attackerId: fighterId,
        firstTargetId: goblinId,
        secondTargetId: skeletonId,
      },
    ]);
    const cleaveRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
        ],
      }),
      "attackRoll",
    );

    const awaitingCleaveAttackHit = resolveBattleSubject({
      state,
      subject,
      fills: [
        ...primaryFills,
        unitFeatureDecisionFill(decision, "use"),
        targetFillValue,
        attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
      ],
    });

    expect(awaitingCleaveAttackHit).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "attackHit" }],
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: skeletonId, hp: Hp(12) }),
        ]),
      },
    });
    if (awaitingCleaveAttackHit.tag !== "needsHoles") {
      throw new Error(
        `Expected Cleave attack-hit reaction, got ${awaitingCleaveAttackHit.tag}.`,
      );
    }

    const afterCleaveHitDecline = resolveBattleInterrupt({
      state: awaitingCleaveAttackHit.state,
      fill: interruptDecisionFill(
        battleFrontierInterruptDecisionForState(awaitingCleaveAttackHit.state)!
          .decisionHole,
        { kind: "decline", responderId: skeletonId },
      ),
    });
    expect(afterCleaveHitDecline).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
    });
  });

  test("Weapon Mastery Cleave offers melee zero-hit-point disposition for the extra attack", () => {
    const state = startBattleRight({
      battleId: battleId("battle-weapon-mastery-cleave-knock-out"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: masteryCleaveUnitRefs(),
          weaponMasteries: greataxeWeaponMasterySelections(),
          attack: testGreataxeAttack(),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Second Target",
          initiative: 9,
        }),
      ],
    });
    const subject = fighterAttackSubject(state, "Greataxe");
    const primaryTarget = attackInitialTargetHole(state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      state,
      primaryTarget,
      subject,
      goblinId,
    );
    const primaryDamage = attackDamageHoleAfterHit(
      state,
      primaryTarget,
      primaryRoll,
      { total: 15, naturalD20: 10 },
      subject,
      goblinId,
    );
    const primaryFills = [
      attackTargetFill(
        primaryTarget,
        fighterId,
        goblinId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      attackRollFill(primaryRoll, { total: 15, naturalD20: 10 }),
      damageRollFill(primaryDamage, 1),
    ];
    const decision = requireHole(
      resolveBattleSubject({ state, subject, fills: primaryFills }),
      "unitFeatureDecision",
    );
    const target = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
      }),
      "targetChoice",
    );
    const targetFillValue = targetFill(target, skeletonId, [
      attackTargetSpatialFact(
        fighterId,
        skeletonId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      {
        kind: "cleaveSecondTargetWithin5FeetOfFirstTarget" as const,
        attackerId: fighterId,
        firstTargetId: goblinId,
        secondTargetId: skeletonId,
      },
    ]);
    const cleaveRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
        ],
      }),
      "attackRoll",
    );
    const cleaveDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
          attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    const disposition = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
          attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
          damageRollFill(cleaveDamage, 10),
        ],
      }),
      "attackDamageDisposition",
    );

    expect(disposition).toMatchObject({
      attackerId: fighterId,
      targetId: skeletonId,
      choices: [{ kind: "ordinaryDamage" }, { kind: "knockOut" }],
    });

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        ...primaryFills,
        unitFeatureDecisionFill(decision, "use"),
        targetFillValue,
        attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
        damageRollFill(cleaveDamage, 10),
        attackDamageDispositionFill(disposition, { kind: "knockOut" }),
      ],
    });
    if (result.tag === "invalid") {
      throw new Error(result.message);
    }
    const resolved = requireResolved(result);
    expect(resolved.state.combatants.get(skeletonId)).toMatchObject({
      hp: Hp(1),
      conditions: expect.objectContaining({
        unconscious: true,
        prone: true,
      }),
    });
  });

  test("Weapon Mastery Cleave keeps primary and extra-attack zero-hit-point dispositions independent", () => {
    const state = startBattleRight({
      battleId: battleId("battle-weapon-mastery-cleave-two-dispositions"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: masteryCleaveUnitRefs(),
          weaponMasteries: greataxeWeaponMasterySelections(),
          attack: testGreataxeAttack(),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Second Target",
          initiative: 9,
        }),
      ],
    });
    const subject = fighterAttackSubject(state, "Greataxe");
    const primaryTarget = attackInitialTargetHole(state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      state,
      primaryTarget,
      subject,
      goblinId,
    );
    const primaryDamage = attackDamageHoleAfterHit(
      state,
      primaryTarget,
      primaryRoll,
      { total: 15, naturalD20: 10 },
      subject,
      goblinId,
    );
    const primaryDamageFills = [
      attackTargetFill(
        primaryTarget,
        fighterId,
        goblinId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      attackRollFill(primaryRoll, { total: 15, naturalD20: 10 }),
      damageRollFill(primaryDamage, 10),
    ];
    const primaryDisposition = requireHole(
      resolveBattleSubject({ state, subject, fills: primaryDamageFills }),
      "attackDamageDisposition",
    );
    expect(primaryDisposition).toMatchObject({
      attackerId: fighterId,
      targetId: goblinId,
      choices: [{ kind: "ordinaryDamage" }, { kind: "knockOut" }],
    });
    const primaryFills = [
      ...primaryDamageFills,
      attackDamageDispositionFill(primaryDisposition, { kind: "knockOut" }),
    ];
    const decision = requireHole(
      resolveBattleSubject({ state, subject, fills: primaryFills }),
      "unitFeatureDecision",
    );
    const target = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
      }),
      "targetChoice",
    );
    const targetFillValue = targetFill(target, skeletonId, [
      attackTargetSpatialFact(
        fighterId,
        skeletonId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      {
        kind: "cleaveSecondTargetWithin5FeetOfFirstTarget" as const,
        attackerId: fighterId,
        firstTargetId: goblinId,
        secondTargetId: skeletonId,
      },
    ]);
    const cleaveRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
        ],
      }),
      "attackRoll",
    );
    const cleaveDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
          attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    const cleaveDisposition = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
          attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
          damageRollFill(cleaveDamage, 10),
        ],
      }),
      "attackDamageDisposition",
    );

    expect(cleaveDisposition).toMatchObject({
      attackerId: fighterId,
      targetId: skeletonId,
      choices: [{ kind: "ordinaryDamage" }, { kind: "knockOut" }],
    });
    expect(cleaveDisposition.holeId).not.toBe(primaryDisposition.holeId);

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
          attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
          damageRollFill(cleaveDamage, 10),
          attackDamageDispositionFill(cleaveDisposition, { kind: "knockOut" }),
        ],
      }),
    );
    expect(resolved.state.combatants.get(goblinId)).toMatchObject({
      hp: Hp(1),
      conditions: expect.objectContaining({
        unconscious: true,
        prone: true,
      }),
    });
    expect(resolved.state.combatants.get(skeletonId)).toMatchObject({
      hp: Hp(1),
      conditions: expect.objectContaining({
        unconscious: true,
        prone: true,
      }),
    });
  });

  test("Weapon Mastery Cleave carries a zero-hit-point relationship decision into Dark One's Blessing", () => {
    const { unit: blessingUnit, unitRef: blessingUnitRef } =
      selectedDarkOnesBlessingUnit();
    const session = startBattleSessionRight({
      battleId: battleId("battle-weapon-mastery-cleave-dark-ones-blessing"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "warlock", level: 3 }],
          d20Statistics: testCharacterD20Statistics({ str: 16, cha: 16 }),
          characterUnitRefs: [...masteryCleaveUnitRefs(), blessingUnitRef],
          unitFeatures: [
            characterBattleFeatureInitForTest(blessingUnit, [
              { className: "warlock", level: classLevel(3) },
            ]),
          ],
          weaponMasteries: greataxeWeaponMasterySelections(),
          attack: testGreataxeAttack(),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Dark Blessing Target",
          initiative: 9,
          currentHp: 1,
        }),
      ],
    });
    const state = session.state;
    const subject = fighterAttackSubject(state, "Greataxe");
    const blessingProcedureRef = requireCharacterUnitProcedureRefForTest(
      session,
      fighterId,
      String(blessingUnit.id),
    );
    const primaryTarget = attackInitialTargetHole(state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      state,
      primaryTarget,
      subject,
      goblinId,
    );
    const primaryDamage = attackDamageHoleAfterHit(
      state,
      primaryTarget,
      primaryRoll,
      { total: 15, naturalD20: 10 },
      subject,
      goblinId,
    );
    const primaryFills = [
      attackTargetFill(
        primaryTarget,
        fighterId,
        goblinId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      attackRollFill(primaryRoll, { total: 15, naturalD20: 10 }),
      damageRollFill(primaryDamage, 1),
    ];
    const decision = requireHole(
      resolveBattleSubject({ state, subject, fills: primaryFills }),
      "unitFeatureDecision",
    );
    const target = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
      }),
      "targetChoice",
    );
    const targetFillValue = targetFill(target, skeletonId, [
      attackTargetSpatialFact(
        fighterId,
        skeletonId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      {
        kind: "cleaveSecondTargetWithin5FeetOfFirstTarget" as const,
        attackerId: fighterId,
        firstTargetId: goblinId,
        secondTargetId: skeletonId,
      },
      darkOnesBlessingRangeFact(blessingProcedureRef),
    ]);
    const cleaveRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
        ],
      }),
      "attackRoll",
    );
    const cleaveDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFillValue,
          attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    const fillsThroughDamage = [
      ...primaryFills,
      unitFeatureDecisionFill(decision, "use"),
      targetFillValue,
      attackRollFill(cleaveRoll, { total: 15, naturalD20: 10 }),
      damageRollFill(cleaveDamage, 4),
    ];
    const disposition = requireHole(
      resolveBattleSubject({ state, subject, fills: fillsThroughDamage }),
      "attackDamageDisposition",
    );
    const fillsThroughDisposition = [
      ...fillsThroughDamage,
      attackDamageDispositionFill(disposition, { kind: "ordinaryDamage" }),
    ];
    const relationship = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: fillsThroughDisposition,
      }),
      "damageRelationshipDecisions",
    );
    expect(relationship.questions).toEqual([
      expect.objectContaining({
        kind: "enemyZeroHitPointTemporaryHitPoints",
        beneficiaryId: fighterId,
        targetId: skeletonId,
        procedureRef: blessingProcedureRef,
      }),
    ]);
    const relationshipQuestion = relationship.questions[0];
    if (relationshipQuestion === undefined) {
      throw new Error("Expected Dark One's Blessing relationship question.");
    }
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...fillsThroughDisposition,
          {
            kind: "damageRelationshipDecisions" as const,
            holeId: relationship.holeId,
            answers: [
              {
                questionId: relationshipQuestion.questionId,
                answer: true,
              },
            ],
          },
        ],
      }),
    );
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(Hp(0));
    expect(resolved.state.combatants.get(fighterId)?.tempHp).toBe(Hp(6));
    expect(
      resolved.state.currentTurnResources
        .weaponMasteryCleaveAttackersUsedThisTurn,
    ).toEqual([fighterId]);
  });

  test("Weapon Mastery Cleave rejects ineligible second-target facts and unsupported use", () => {
    const eligibleState = startBattleRight({
      battleId: battleId("battle-weapon-mastery-cleave-rejection"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: masteryCleaveUnitRefs(),
          weaponMasteries: greataxeWeaponMasterySelections(),
          attack: testGreataxeAttack(),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Second Target",
          initiative: 9,
        }),
      ],
    });
    const subject = fighterAttackSubject(eligibleState, "Greataxe");
    const primaryTarget = attackInitialTargetHole(eligibleState, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      eligibleState,
      primaryTarget,
      subject,
      goblinId,
    );
    const primaryDamage = attackDamageHoleAfterHit(
      eligibleState,
      primaryTarget,
      primaryRoll,
      { total: 15, naturalD20: 10 },
      subject,
      goblinId,
    );
    const primaryFills = [
      attackTargetFill(
        primaryTarget,
        fighterId,
        goblinId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      attackRollFill(primaryRoll, { total: 15, naturalD20: 10 }),
      damageRollFill(primaryDamage, 1),
    ];
    const decision = requireHole(
      resolveBattleSubject({
        state: eligibleState,
        subject,
        fills: primaryFills,
      }),
      "unitFeatureDecision",
    );
    const target = requireHole(
      resolveBattleSubject({
        state: eligibleState,
        subject,
        fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
      }),
      "targetChoice",
    );
    const ineligibleTarget = resolveBattleSubject({
      state: eligibleState,
      subject,
      fills: [
        ...primaryFills,
        unitFeatureDecisionFill(decision, "use"),
        targetFill(target, skeletonId, [
          attackTargetSpatialFact(
            fighterId,
            skeletonId,
            attackExecutionSelectionForSubjectForTest(subject),
          ),
        ]),
      ],
    });
    expect(ineligibleTarget).toMatchObject({
      tag: "invalid",
      message:
        "Weapon Mastery Cleave second target must be within 5 feet of the first target and within the attacker's reach.",
    });
    const sameAsPrimaryTarget = resolveBattleSubject({
      state: eligibleState,
      subject,
      fills: [
        ...primaryFills,
        unitFeatureDecisionFill(decision, "use"),
        targetFill(target, goblinId, [
          attackTargetSpatialFact(
            fighterId,
            goblinId,
            attackExecutionSelectionForSubjectForTest(subject),
          ),
          {
            kind: "cleaveSecondTargetWithin5FeetOfFirstTarget" as const,
            attackerId: fighterId,
            firstTargetId: goblinId,
            secondTargetId: goblinId,
          },
        ]),
      ],
    });
    expect(sameAsPrimaryTarget).toMatchObject({
      tag: "invalid",
      message:
        "Weapon Mastery Cleave second target must be within 5 feet of the first target and within the attacker's reach.",
    });

    const noSelection = resolveBattleSubject({
      state: startBattleRight({
        battleId: battleId("battle-weapon-mastery-cleave-rejection"),
        combatants: [
          characterSeed({
            initiative: 20,
            characterUnitRefs: masteryCleaveUnitRefs(),
            attack: testGreataxeAttack(),
          }),
          statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
        ],
      }),
      subject,
      fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
    });
    expect(noSelection).toMatchObject({
      tag: "invalid",
      message:
        "Weapon Mastery additional weapon attack is only valid after an eligible weapon hit.",
    });
    const noCleaveSupport = resolveBattleSubject({
      state: startBattleRight({
        battleId: battleId("battle-weapon-mastery-cleave-rejection"),
        combatants: [
          characterSeed({
            initiative: 20,
            weaponMasteries: greataxeWeaponMasterySelections(),
            attack: testGreataxeAttack(),
          }),
          statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
        ],
      }),
      subject,
      fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
    });
    expect(noCleaveSupport).toMatchObject({
      tag: "invalid",
      message:
        "Weapon Mastery additional weapon attack is only valid after an eligible weapon hit.",
    });

    const rangedCleaveState = startBattleRight({
      battleId: battleId("battle-weapon-mastery-cleave-ranged-gate"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: [
            ...masteryCleaveUnitRefs(),
            testRangedCleaveLongbowUnitRef(),
          ],
          weaponMasteries: longbowWeaponMasterySelections(),
          attack: testRangedCleaveLongbowAttack(),
          ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
      ],
    });
    const rangedSubject = fighterAttackSubject(rangedCleaveState, "Longbow");
    const rangedTarget = attackInitialTargetHole(
      rangedCleaveState,
      rangedSubject,
    );
    const rangedRoll = attackRollHoleAfterTarget(
      rangedCleaveState,
      rangedTarget,
      rangedSubject,
      goblinId,
    );
    const rangedDamage = attackDamageHoleAfterHit(
      rangedCleaveState,
      rangedTarget,
      rangedRoll,
      { total: 15, naturalD20: 10 },
      rangedSubject,
      goblinId,
    );
    const rangedAttack = resolveBattleSubject({
      state: rangedCleaveState,
      subject: rangedSubject,
      fills: [
        attackTargetFill(rangedTarget, fighterId, goblinId),
        attackRollFill(rangedRoll, { total: 15, naturalD20: 10 }),
        damageRollFill(rangedDamage, 4),
      ],
    });
    expect(rangedAttack).toMatchObject({ tag: "resolved" });

    const alreadyUsed = resolveBattleSubject({
      state: {
        ...eligibleState,
        currentTurnResources: {
          ...eligibleState.currentTurnResources,
          weaponMasteryCleaveAttackersUsedThisTurn: [fighterId],
        },
      },
      subject,
      fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
    });
    expect(alreadyUsed).toMatchObject({
      tag: "invalid",
      message:
        "Weapon Mastery additional weapon attack is only valid after an eligible weapon hit.",
    });
  });
});
