import { battleObjectId } from "./identity.ts";
import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { classLevel } from "@dnd/shared/types";
import {
  startBattleRight,
  startBattleSessionRight,
  assertBattleSnapshotCodecRoundTripForTest,
  assertBattleSnapshotCodecAcceptsHolesForSubjectForTest,
  fighterVsGoblinBattle,
  criticalRange19UnitRefs,
  fighterAttackSubject,
  characterBonusAttackSubjectForTest,
  goblinAttackSubject,
  attackInitialTargetHole,
  attackRollHoleAfterTarget,
  attackDamageHoleAfterHit,
  requireHole,
  findHole,
  targetFill,
  attackRollFill,
  damageRollFill,
  damageRollFillWithGroups,
  attackDamageDispositionHoleAfterDamage,
  attackDamageDispositionHoleAfterFills,
  attackDamageDispositionFill,
  battleEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
  characterSeed,
  combatantId,
  concentrationSavingThrowFill,
  concentrationSavingThrowDc,
  heavyArmorClassState,
  masterySapUnitRefs,
  testLongswordAttack,
  testUnarmedStrikeDamageAttack,
  testUnarmedStrikeDieAttack,
  testDaggerAttack,
  statBlockCreatureInit,
  supportedBattleUnitRef,
  fighterId,
  goblinId,
  unitLibrary,
  battleId,
  defaultArmorClassState,
  DieRollResult,
  discoverBattleActs,
  goblinTurnBattle,
  longswordWeaponMasterySelections,
  movementFeet,
  resolveBattleSubject,
  snapshotBattle,
  tacticalMasterReplacementUnitRefs,
  unitFeatureDecisionFill,
} from "./battle-runtime.test-support.ts";
import type {
  BattleState,
  BattleSubject,
} from "./battle-runtime.test-support.ts";
import type { AttackRollResult } from "@dnd/shared-algebras/runtime-hole-algebra";
import type {
  AttackDamageRider,
  BattleAttackRollResult,
  BattleFill,
  SpellAttackDamageComponent,
  SpellMarkedDamageRider,
} from "./battle-state-execution.ts";
import { statBlockAttackActionOptions } from "./stat-block-execution.ts";
import {
  attackActionBonus,
  attackActionOptionName,
  attackActionVariantOptions,
  attackDamage,
  attackDamageModifier,
  attackDamageComponents,
  attackPotentialDamageTypes,
  attackDamageRiderForProfile,
  attackRollMissToHitReplacementForProcedure,
  attackRollMissToHitReplacementHolePayload,
  clearPendingAttackRollMissToHitReplacementSelection,
  eligibleAttackDamageDieFloorProcedureRefsForAttacker,
  recordAttackRollMissToHitReplacementUsed,
  selectedAttackRollMissToHitReplacement,
  passiveRangedAttackRollBonus,
  selectedAttackDamageRiders,
  statBlockAttackTargetConstraint,
  targetHasAdjacentNonIncapacitatedAlly,
  unarmedStrikeAttackDamage,
  unarmedStrikeDamageDiceExpr,
  weaponAttackDamageExpression,
  weaponAttackSupportsFinesseOrRanged,
  weaponTargetConstraint,
  weaponDamageComponent,
} from "./battle-reducer/statblock-attacks.ts";
import {
  applyWeaponMasterySapOnHit,
  applyWeaponMasterySlowAfterDamage,
  tacticalMasterAttackWithReplacement,
  tacticalMasterReplacementDecisionHole,
} from "./battle-reducer/attack-roll.ts";
import { ATTACK_ROLL_MISS_TO_HIT_REPLACEMENT_SUPPORT_PROFILE } from "./unit-feature-execution-constants.ts";
import {
  combatProwessBattleUnitRef,
  greatWeaponFightingBattleUnitRef,
} from "./unit-profile-admission-feature-fixture.test-support.ts";
import type { UnitFeatureProcedureExecution } from "./character-execution-vocabulary.ts";
import {
  abilityCheckFill as resolutionAbilityCheckFill,
  grappleFillSet,
  shoveFillSet,
  validateAttackDamageFill,
} from "./battle-reducer/attack-resolution.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: attack rolls and damage", () => {
  test("attack damage projections preserve Stat Block critical, advantage, and character branches", () => {
    const state = goblinTurnBattle();
    const goblin = state.combatants.get(goblinId);
    if (goblin?.origin.kind !== "statBlock") {
      throw new Error("Expected Goblin Warrior Stat Block actor.");
    }
    const statBlockOptions = statBlockAttackActionOptions(
      goblin.origin.execution,
    );
    const scimitar = statBlockOptions.find(
      (option) =>
        option.attack.attackType === "melee" &&
        option.damageNotation === "rolled",
    );
    const scimitarStatic = statBlockOptions.find(
      (option) =>
        option.attack.attackType === "melee" &&
        option.damageNotation === "static",
    );
    if (scimitar === undefined || scimitarStatic === undefined) {
      throw new Error("Expected rolled and static Scimitar options.");
    }

    const ordinaryRoll: AttackRollResult = {
      total: 14,
      naturalD20: DieRollResult(10),
    };
    const advantageRoll: AttackRollResult = {
      total: 14,
      naturalD20: DieRollResult(10),
      rollMode: "advantage",
    };
    const criticalAdvantageRoll: AttackRollResult = {
      total: 24,
      naturalD20: DieRollResult(20),
      rollMode: "advantage",
    };

    expect(attackDamageComponents(scimitar, false, ordinaryRoll)).toEqual([
      { expr: { dice: 1, dieSize: 6, flat: 2 }, damageType: "slashing" },
    ]);
    expect(
      attackDamageComponents(scimitar, true, criticalAdvantageRoll),
    ).toEqual([
      { expr: { dice: 2, dieSize: 6, flat: 2 }, damageType: "slashing" },
      { expr: { dice: 2, dieSize: 4 }, damageType: "slashing" },
    ]);
    expect(
      attackPotentialDamageTypes(scimitar, false, advantageRoll, []),
    ).toEqual(["slashing"]);
    expect(attackDamageComponents(scimitarStatic, false, ordinaryRoll)).toEqual(
      [],
    );
    expect(
      attackDamageComponents(scimitarStatic, false, advantageRoll),
    ).toEqual([]);

    const fighter = state.combatants.get(fighterId);
    if (
      fighter?.origin.kind !== "character" ||
      fighter.origin.attack === null
    ) {
      throw new Error("Expected a character weapon attack.");
    }
    expect(
      attackDamageComponents(fighter.origin.attack, false, ordinaryRoll),
    ).toEqual([{ expr: { dice: 1, dieSize: 8 }, damageType: "slashing" }]);
    expect(weaponDamageComponent(fighter.origin.attack, true)).toEqual({
      expr: { dice: 2, dieSize: 8 },
      damageType: "slashing",
    });
    expect(weaponDamageComponent(scimitar, false)).toBeNull();
  });

  test("Stat Block damage expressions retain marked riders and thrown ranges", () => {
    const state = goblinTurnBattle();
    const goblin = state.combatants.get(goblinId);
    if (goblin?.origin.kind !== "statBlock") {
      throw new Error("Expected Goblin Warrior Stat Block actor.");
    }
    const scimitar = statBlockAttackActionOptions(goblin.origin.execution).find(
      (option) =>
        option.attack.attackType === "melee" &&
        option.damageNotation === "rolled",
    );
    if (scimitar === undefined) {
      throw new Error("Expected a rolled Stat Block melee attack.");
    }

    const markedRider = {
      kind: "spellMarkedDamageRider",
      effectRef: battleEffectExecutionRefForTest("synthetic-statblock-mark"),
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic-statblock-mark-source",
      ),
      sourceCombatantId: fighterId,
      targetCombatantId: goblinId,
      transfer: { kind: "awaitingTargetDrop", retargetTiming: "sameTurn" },
      abilityCheckBehavior: { kind: "none" },
      damage: { expr: { dice: 1, dieSize: 6 }, damageType: "fire" },
      expiresAt: { kind: "concentration", combatantId: fighterId },
    } satisfies SpellMarkedDamageRider;

    const criticalComponents = attackDamageComponents(
      scimitar,
      true,
      { total: 20, naturalD20: DieRollResult(20) },
      [],
      [],
      [markedRider],
    );
    expect(criticalComponents).toContainEqual({
      expr: { dice: 2, dieSize: 6 },
      damageType: "fire",
    });
    const subtractingRider: SpellAttackDamageComponent = {
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic-statblock-subtraction",
      ),
      sourceCombatantId: fighterId,
      damage: { expr: { dice: 1, dieSize: 6 }, damageType: "fire" },
      operation: "subtract",
    };
    expect(
      weaponAttackDamageExpression(
        scimitar,
        false,
        { total: 14, naturalD20: DieRollResult(10) },
        [],
        [subtractingRider],
      ),
    ).toBe("1d6+2-slashing-1d6-fire");

    const fighter = state.combatants.get(fighterId);
    if (fighter?.origin.kind !== "character") {
      throw new Error("Expected the character attack projection.");
    }
    const baseUnarmedStrike = fighter.origin.unarmedStrike;
    if (baseUnarmedStrike === null) {
      throw new Error("Expected the character Unarmed Strike projection.");
    }
    const procedureReplacementUnarmedStrike = {
      ...baseUnarmedStrike,
      effect: {
        ...baseUnarmedStrike.effect,
        damage: {
          kind: "procedureReplacement",
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            "synthetic-unarmed-die-replacement",
          ),
          dice: 1,
          dieSize: 6,
          damageType: "bludgeoning",
        },
      },
    } satisfies typeof baseUnarmedStrike;
    expect(
      unarmedStrikeDamageDiceExpr(procedureReplacementUnarmedStrike, false),
    ).toEqual({ dice: 1, dieSize: 6 });
    expect(
      unarmedStrikeDamageDiceExpr(procedureReplacementUnarmedStrike, true),
    ).toEqual({ dice: 2, dieSize: 6 });

    const dagger = testDaggerAttack();
    const thrownDaggerWeapon = {
      ...dagger.weapon,
      usage: "ranged",
    } satisfies typeof dagger.weapon;
    expect(weaponTargetConstraint(thrownDaggerWeapon)).toEqual({
      kind: "rangedRange",
      normalFeet: movementFeet(20),
      longFeet: movementFeet(60),
    });
  });

  test("public attack helpers preserve procedure replacement and level-gated rider boundaries", () => {
    const state = startBattleRight({
      battleId: battleId("attack-roll-miss-to-hit-level19"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "fighter", level: classLevel(19) }],
          characterUnitRefs: [combatProwessBattleUnitRef()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const fighter = state.combatants.get(fighterId);
    if (
      fighter?.origin.kind !== "character" ||
      fighter.origin.attack === null
    ) {
      throw new Error("Expected the admitted replacement character attack.");
    }
    const replacementBinding = fighter.origin.execution.procedureBindings.find(
      (binding) =>
        binding.procedure.kind === "unitSupportProfile" &&
        typeof binding.procedure.execution === "object" &&
        binding.procedure.execution !== null &&
        binding.procedure.execution.kind ===
          ATTACK_ROLL_MISS_TO_HIT_REPLACEMENT_SUPPORT_PROFILE,
    );
    if (replacementBinding === undefined) {
      throw new Error("Expected the admitted miss-to-hit replacement profile.");
    }
    const replacement = { procedureRef: replacementBinding.procedureRef };
    const subject = fighterAttackSubject(state, "Longsword");
    const attackRoll: BattleAttackRollResult = {
      total: 12,
      naturalD20: DieRollResult(2),
      missToHitReplacementProcedureRef: replacement.procedureRef,
    };
    const context = {
      subject,
      targetId: goblinId,
      attackRoll,
    };

    expect(
      attackRollMissToHitReplacementHolePayload(
        state,
        combatantId("missing-replacement-attacker"),
      ),
    ).toEqual({});
    expect(
      selectedAttackRollMissToHitReplacement({
        state,
        subject,
        attackerId: fighterId,
        targetId: goblinId,
        attackRoll: {
          total: 16,
          naturalD20: DieRollResult(10),
          missToHitReplacementProcedureRef: replacement.procedureRef,
        },
        ordinaryHit: true,
      }),
    ).toBeNull();
    expect(
      attackRollMissToHitReplacementForProcedure(
        state,
        goblinId,
        replacement.procedureRef,
        context,
      ),
    ).toBeNull();
    expect(
      attackRollMissToHitReplacementForProcedure(
        state,
        fighterId,
        battleProcedureExecutionRefForTest("not-an-admitted-replacement"),
        context,
      ),
    ).toBeNull();
    expect(
      selectedAttackRollMissToHitReplacement({
        state,
        subject,
        attackerId: fighterId,
        targetId: goblinId,
        attackRoll,
        ordinaryHit: false,
      }),
    ).toEqual(replacement);

    const usedState = recordAttackRollMissToHitReplacementUsed(
      state,
      fighterId,
      replacement,
      context,
    );
    expect(
      attackRollMissToHitReplacementForProcedure(
        usedState,
        fighterId,
        replacement.procedureRef,
        { ...context, attackRoll: { ...attackRoll, total: 13 } },
      ),
    ).toBeNull();
    expect(
      recordAttackRollMissToHitReplacementUsed(
        state,
        combatantId("missing-replacement-attacker"),
        replacement,
        context,
      ),
    ).toBe(state);
    expect(
      clearPendingAttackRollMissToHitReplacementSelection(
        usedState.currentTurnResources,
        fighterId,
      ),
    ).not.toHaveProperty("pendingAttackRollMissToHitReplacementSelection");

    const noDiceProfile = {
      kind: "attackDamageRider",
      optional: true,
      usageLimit: "oncePerTurn",
      trigger: "finesseOrRangedAttackWithAdvantageOrAlly",
      eligibility:
        "advantageOrNonIncapacitatedAllyWithin5ftOfTargetWithoutDisadvantage",
      classLevel: classLevel(1),
      dice: {
        kind: "classLevelTable",
        dieSize: 6,
        diceByLevel: [{ atLevel: 5, count: 1 }],
      },
    } satisfies Extract<
      UnitFeatureProcedureExecution,
      { readonly kind: "attackDamageRider" }
    >;
    expect(
      attackDamageRiderForProfile(
        noDiceProfile,
        battleProcedureExecutionRefForTest("synthetic-level-gated-rider"),
        fighterId,
        "fire",
        0,
      ),
    ).toBeNull();
  });

  test("Great Weapon Fighting exposes its admitted attack damage die-floor procedure", () => {
    const state = startBattleRight({
      battleId: battleId("attack-damage-die-floor-fighter"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "fighter", level: classLevel(1) }],
          characterUnitRefs: [greatWeaponFightingBattleUnitRef()],
          attack: testLongswordAttack(),
          selectedLoadout: {
            weapon: {
              itemId: battleObjectId("main:weapon_longsword"),
              unitId: parseSharedUnitId("weapon_longsword"),
              grip: "two_handed",
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const attacker = [...state.combatants.values()].find(
      (combatant) => combatant.origin.kind === "character",
    );
    if (
      attacker?.origin.kind !== "character" ||
      attacker.origin.attack === null
    ) {
      throw new Error("Expected the Great Weapon Fighting attacker.");
    }
    expect(
      eligibleAttackDamageDieFloorProcedureRefsForAttacker(
        attacker,
        attacker.origin.attack,
        attacker.origin.attack.procedureRef,
      ),
    ).toHaveLength(1);
  });

  test("attack rider selection keeps mandatory riders and rejects contradictory choices", () => {
    const mandatory: AttackDamageRider = {
      attackerId: goblinId,
      procedureRef: battleProcedureExecutionRefForTest("mandatory-rider"),
      optional: false,
      damage: { dice: 1, dieSize: 6, damageType: "slashing" },
    };
    const optional: AttackDamageRider = {
      attackerId: goblinId,
      procedureRef: battleProcedureExecutionRefForTest("optional-rider"),
      optional: true,
      damage: { dice: 1, dieSize: 4, damageType: "fire" },
    };

    expect(
      selectedAttackDamageRiders([mandatory, optional], undefined),
    ).toEqual([mandatory]);
    expect(selectedAttackDamageRiders([mandatory, optional], [])).toEqual([
      mandatory,
    ]);
    expect(
      selectedAttackDamageRiders(
        [mandatory, optional],
        [optional.procedureRef],
      ),
    ).toEqual([mandatory, optional]);
    expect(
      selectedAttackDamageRiders(
        [mandatory, optional],
        [optional.procedureRef, optional.procedureRef],
      ),
    ).toBeNull();
    expect(
      selectedAttackDamageRiders(
        [mandatory, optional],
        [battleProcedureExecutionRefForTest("unknown-rider")],
      ),
    ).toBeNull();
  });

  test("attack-control projections keep attack shapes and reduced-size damage distinct", () => {
    const state = goblinTurnBattle();
    const fighter = state.combatants.get(fighterId);
    const goblin = state.combatants.get(goblinId);
    if (
      fighter?.origin.kind !== "character" ||
      fighter.origin.attack === null ||
      fighter.origin.unarmedStrike === null ||
      goblin?.origin.kind !== "statBlock"
    ) {
      throw new Error("Expected character and Stat Block attack projections.");
    }
    const statBlockOptions = statBlockAttackActionOptions(
      goblin.origin.execution,
    );
    const scimitar = statBlockOptions.find(
      (option) =>
        option.attack.attackType === "melee" &&
        option.damageNotation === "rolled",
    );
    const shortbow = statBlockOptions.find(
      (option) => option.attack.attackType === "ranged",
    );
    if (scimitar === undefined || shortbow === undefined) {
      throw new Error("Expected Goblin melee and ranged attacks.");
    }

    expect(attackActionOptionName(fighter.origin.attack)).toBe(
      "weapon_longsword",
    );
    expect(attackActionOptionName(fighter.origin.unarmedStrike)).toBe(
      "Unarmed Strike",
    );
    expect(attackActionOptionName(scimitar)).toBe("Stat Block Attack");
    expect(attackActionVariantOptions(fighter.origin.unarmedStrike)).toEqual([
      fighter.origin.unarmedStrike,
    ]);
    expect(attackActionVariantOptions(scimitar)).toEqual([scimitar]);

    expect(attackDamage(fighter.origin.attack)).toEqual({
      kind: "dice",
      dice: 1,
      dieSize: 8,
      damageType: "slashing",
    });
    expect(attackDamage(fighter.origin.unarmedStrike)).toEqual({
      dice: 0,
      dieSize: 1,
      flat: 1,
      damageType: "bludgeoning",
    });
    expect(attackDamage(scimitar)).toEqual({
      dice: 1,
      dieSize: 6,
      flat: 2,
      damageType: "slashing",
    });
    expect(attackDamageModifier(fighter.origin.attack)).toBe(3);
    expect(attackDamageModifier(fighter.origin.unarmedStrike)).toBe(4);
    expect(attackDamageModifier(scimitar)).toBe(0);
    expect(Number(attackActionBonus(fighter.origin.attack))).toBe(3);
    expect(Number(attackActionBonus(scimitar))).toBe(4);
    expect(weaponAttackSupportsFinesseOrRanged(fighter.origin.attack)).toBe(
      false,
    );
    expect(weaponAttackSupportsFinesseOrRanged(shortbow)).toBe(false);
    expect(passiveRangedAttackRollBonus(undefined, shortbow)).toBe(0);

    expect(statBlockAttackTargetConstraint(scimitar)).toEqual({
      kind: "meleeReach",
      reachFeet: movementFeet(5),
    });
    expect(statBlockAttackTargetConstraint(shortbow)).toEqual({
      kind: "rangedRange",
      normalFeet: movementFeet(80),
      longFeet: movementFeet(320),
    });
    expect(unarmedStrikeAttackDamage(fighter.origin.unarmedStrike)).toEqual({
      dice: 0,
      dieSize: 1,
      flat: 1,
      damageType: "bludgeoning",
    });
    expect(
      unarmedStrikeDamageDiceExpr(fighter.origin.unarmedStrike, false),
    ).toBeNull();
    expect(
      unarmedStrikeDamageDiceExpr(fighter.origin.unarmedStrike, true),
    ).toBeNull();

    const reducedSizeRider: SpellAttackDamageComponent = {
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic-reduce-size-rider",
      ),
      sourceCombatantId: fighterId,
      damage: { expr: { dice: 1, dieSize: 4 }, damageType: "slashing" },
      operation: "subtract",
      minimumDamageTotal: 1,
    };
    expect(
      weaponAttackDamageExpression(
        scimitar,
        false,
        { total: 14, naturalD20: DieRollResult(10) },
        [],
        [reducedSizeRider],
      ),
    ).toBe("1d6-1d4+2-slashing");
  });

  test("adjacent-ally projection ignores unrelated and Incapacitated creatures", () => {
    const allyId = combatantId("attack-control-ally");
    const stateWithAlly = startBattleRight({
      battleId: battleId("attack-control-adjacent-ally"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: allyId,
          displayName: "Adjacent Ally",
          initiative: 15,
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const allyFact = {
      kind: "attackerAllyWithin5FeetOfTarget" as const,
      attackerId: fighterId,
      targetId: goblinId,
      allyId,
    };
    expect(
      targetHasAdjacentNonIncapacitatedAlly(
        stateWithAlly,
        fighterId,
        goblinId,
        [allyFact],
      ),
    ).toBe(true);
    expect(
      targetHasAdjacentNonIncapacitatedAlly(
        stateWithAlly,
        fighterId,
        goblinId,
        [{ ...allyFact, attackerId: goblinId }],
      ),
    ).toBe(false);
    expect(
      targetHasAdjacentNonIncapacitatedAlly(
        stateWithAlly,
        fighterId,
        goblinId,
        [{ ...allyFact, allyId: fighterId }],
      ),
    ).toBe(false);
    const incapacitatedState = startBattleRight({
      battleId: battleId("attack-control-incapacitated-ally"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: allyId,
          displayName: "Incapacitated Ally",
          initiative: 15,
          conditions: ["incapacitated"],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(
      targetHasAdjacentNonIncapacitatedAlly(
        incapacitatedState,
        fighterId,
        goblinId,
        [allyFact],
      ),
    ).toBe(false);
  });

  test("reapplying Slow and Sap replaces the existing source effect", () => {
    const state = fighterVsGoblinBattle({
      characterUnitRefs: tacticalMasterReplacementUnitRefs(),
      weaponMasteries: longswordWeaponMasterySelections(),
    });
    const fighter = state.combatants.get(fighterId);
    if (
      fighter?.origin.kind !== "character" ||
      fighter.origin.attack === null
    ) {
      throw new Error("Expected Tactical Master weapon attack.");
    }
    const decisionHole = tacticalMasterReplacementDecisionHole(
      state,
      fighterId,
      fighter.origin.attack,
    );
    if (decisionHole === null) {
      throw new Error("Expected Tactical Master replacement decision.");
    }
    const slowDecision = unitFeatureDecisionFill(decisionHole, "slow");
    if (slowDecision.kind !== "unitFeatureDecision") {
      throw new Error("Expected Tactical Master Slow decision fill.");
    }
    const slowedAttackResult = tacticalMasterAttackWithReplacement({
      state,
      attackerId: fighterId,
      attack: fighter.origin.attack,
      decision: slowDecision,
    });
    if (slowedAttackResult.tag !== "ok") {
      throw new Error("Expected Tactical Master Slow replacement.");
    }
    const slowedOnce = applyWeaponMasterySlowAfterDamage({
      state,
      attackerId: fighterId,
      targetId: goblinId,
      attack: slowedAttackResult.attack,
      damageAmount: 4,
    });
    const slowedTwice = applyWeaponMasterySlowAfterDamage({
      state: slowedOnce,
      attackerId: fighterId,
      targetId: goblinId,
      attack: slowedAttackResult.attack,
      damageAmount: 4,
    });
    expect(slowedTwice.combatants.get(goblinId)?.activeEffects).toHaveLength(1);
    expect(
      applyWeaponMasterySlowAfterDamage({
        state: slowedTwice,
        attackerId: fighterId,
        targetId: goblinId,
        attack: slowedAttackResult.attack,
        damageAmount: 0,
      }),
    ).toBe(slowedTwice);

    const sapState = fighterVsGoblinBattle({
      characterUnitRefs: masterySapUnitRefs(),
      weaponMasteries: longswordWeaponMasterySelections(),
    });
    const sapFighter = sapState.combatants.get(fighterId);
    if (
      sapFighter?.origin.kind !== "character" ||
      sapFighter.origin.attack === null
    ) {
      throw new Error("Expected Sap weapon attack.");
    }
    const sapOnce = applyWeaponMasterySapOnHit(
      sapState,
      fighterId,
      goblinId,
      sapFighter.origin.attack,
    );
    const sapTwice = applyWeaponMasterySapOnHit(
      sapOnce,
      fighterId,
      goblinId,
      sapFighter.origin.attack,
    );
    expect(sapTwice.combatants.get(goblinId)?.activeEffects).toHaveLength(1);
  });

  test("attack replay parsers reject cross-family, duplicate, and critical-hole fills", () => {
    const state = fighterVsGoblinBattle();
    const subject = fighterAttackSubject(state);
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
    const attackFill = attackRollFill(rollHole, {
      total: 15,
      naturalD20: 10,
    });
    const targetOnly = {
      kind: "targetChoice" as const,
      holeId: holeId("attack-control-target-only"),
      value: goblinId,
    } satisfies BattleFill;
    const abilityOnly = {
      kind: "abilityCheck" as const,
      holeId: holeId("attack-control-ability"),
      value: { total: 12 },
    } satisfies BattleFill;

    expect(
      resolutionAbilityCheckFill(
        [attackFill],
        holeId("attack-control-ability-hole"),
        "Athletics",
      ),
    ).toEqual({
      tag: "invalid",
      message: "Fill attackRoll does not match the Athletics replay holes.",
    });
    expect(
      resolutionAbilityCheckFill(
        [abilityOnly, abilityOnly],
        abilityOnly.holeId,
        "Athletics",
      ),
    ).toEqual({ tag: "invalid", message: "Athletics check was filled twice." });
    expect(grappleFillSet([attackFill])).toEqual({
      tag: "invalid",
      message: "Fill attackRoll does not match the Grapple replay holes.",
    });
    expect(grappleFillSet([targetOnly, targetOnly])).toEqual({
      tag: "invalid",
      message: "Grapple target was filled twice.",
    });
    expect(shoveFillSet([attackFill])).toEqual({
      tag: "invalid",
      message: "Fill attackRoll does not match the Shove replay holes.",
    });
    expect(shoveFillSet([targetOnly, targetOnly])).toEqual({
      tag: "invalid",
      message: "Shove target was filled twice.",
    });

    const fighter = state.combatants.get(fighterId);
    if (
      fighter?.origin.kind !== "character" ||
      fighter.origin.attack === null
    ) {
      throw new Error("Expected fighter weapon attack.");
    }
    const normalDamageHole = attackDamageHoleAfterHit(
      state,
      targetHole,
      rollHole,
      { total: 15, naturalD20: 10 },
      subject,
      goblinId,
    );
    const normalDamageFill = damageRollFill(normalDamageHole, 4);
    if (normalDamageFill.kind !== "rolledDice") {
      throw new Error("Expected rolled weapon damage fill.");
    }
    expect(
      validateAttackDamageFill(
        normalDamageFill,
        fighter.origin.attack,
        true,
        { total: 20, naturalD20: DieRollResult(20) },
        [],
      ),
    ).toBe("Critical hit damage must use the critical damage hole.");
  });

  test("attack miss spends the action without asking for weapon damage", () => {
    const state = fighterVsGoblinBattle();
    const subject = fighterAttackSubject(state, "Longsword");
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
    const awaitingRoll = resolveBattleSubject({
      state,
      subject,
      fills: [targetFill(targetHole, goblinId)],
    });
    if (awaitingRoll.tag !== "needsHoles") {
      throw new Error("Expected the weapon attack to await its attack roll.");
    }
    assertBattleSnapshotCodecAcceptsHolesForSubjectForTest({
      snapshot: awaitingRoll.snapshot,
      subject,
      holes: awaitingRoll.holes,
    });

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 14, naturalD20: 9 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          actionResources: [],
        },
        combatants: [
          { combatantId: fighterId },
          { combatantId: goblinId, hp: 10 },
        ],
      },
    });
  });

  test("natural 1 attack roll misses even when the total meets Armor Class", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);

    const result = resolveBattleSubject({
      state,
      subject: fighterAttackSubject(state, "Longsword"),
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 99, naturalD20: 1 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { actionResources: [] } },
    });
  });

  test("natural 20 attack roll hits even when the total is below Armor Class", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);

    const result = resolveBattleSubject({
      state,
      subject: fighterAttackSubject(state, "Longsword"),
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 1, naturalD20: 20 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "rolledDice",
          label: "weapon_longsword damage (2d8+3-slashing)",
        },
      ],
      snapshot: {
        turn: {
          actionResources: [{ kind: "action", source: "turn" }],
        },
      },
    });
  });

  test("an unresolved attack continuation does not advertise fresh acts", () => {
    // SRD 5.2.1 Rules Glossary, "Attack [Action]", and Playing the Game,
    // "One Thing at a Time": the attack roll and its damage are one selected
    // Attack action, not a fresh action-selection point.
    const state = fighterVsGoblinBattle();
    const subject = fighterAttackSubject(state, "Longsword");
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);

    const awaitingDamage = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 20, naturalD20: 15 }),
      ],
    });

    expect(awaitingDamage).toMatchObject({
      tag: "needsHoles",
      snapshot: {
        acts: [],
        turn: { attackRollMadeThisTurn: true },
      },
    });
  });

  test("attack replay rejects invalid natural d20 attack-roll results", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);

    const result = resolveBattleSubject({
      state,
      subject: fighterAttackSubject(state, "Longsword"),
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 21 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      snapshot: {
        turn: {
          actionResources: [{ kind: "action", source: "turn" }],
        },
      },
    });
    expect(result).not.toHaveProperty("routeEvents");
  });

  test("attack replay rejects damage fills on a miss", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = requireHole(
      resolveBattleSubject({
        state,
        subject: fighterAttackSubject(state, "Longsword"),
        fills: [
          targetFill(targetHole, goblinId),
          attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject: fighterAttackSubject(state, "Longsword"),
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 14, naturalD20: 9 }),
        damageRollFill(damageHole, 4),
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test("attack replay rejects damage dice outside the selected weapon expression", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = requireHole(
      resolveBattleSubject({
        state,
        subject: fighterAttackSubject(state, "Longsword"),
        fills: [
          targetFill(targetHole, goblinId),
          attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject: fighterAttackSubject(state, "Longsword"),
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 99),
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      snapshot: {
        turn: {
          actionResources: [{ kind: "action", source: "turn" }],
        },
      },
    });
  });

  test("attack replay rejects damage dice count that does not match the selected weapon", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = requireHole(
      resolveBattleSubject({
        state,
        subject: fighterAttackSubject(state, "Longsword"),
        fills: [
          targetFill(targetHole, goblinId),
          attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject: fighterAttackSubject(state, "Longsword"),
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFillWithGroups(damageHole, [[4], [5]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      snapshot: {
        turn: {
          actionResources: [{ kind: "action", source: "turn" }],
        },
      },
    });
  });

  test("critical hit requires doubled weapon damage dice", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(
      state,
      targetHole,
      rollHole,
      { total: 20, naturalD20: 20 },
      fighterAttackSubject(state),
      goblinId,
    );
    const dispositionHole = attackDamageDispositionHoleAfterFills(
      state,
      fighterAttackSubject(state),
      [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 20, naturalD20: 20 }),
        damageRollFillWithGroups(damageHole, [[4, 5]]),
      ],
    );

    const result = resolveBattleSubject({
      state,
      subject: fighterAttackSubject(state, "Longsword"),
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 20, naturalD20: 20 }),
        damageRollFillWithGroups(damageHole, [[4, 5]]),
        attackDamageDispositionFill(dispositionHole, {
          kind: "ordinaryDamage",
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          { combatantId: goblinId, hp: 0 },
        ],
      },
    });
  });

  test("admitted authored critical-range support makes a natural 19 weapon attack critical", () => {
    const state = fighterVsGoblinBattle({
      characterUnitRefs: criticalRange19UnitRefs(),
    });
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole, {
      total: 1,
      naturalD20: 19,
    });

    expect(damageHole).toMatchObject({
      critical: true,
      label: "weapon_longsword damage (2d8+3-slashing)",
    });
    const dispositionHole = attackDamageDispositionHoleAfterFills(
      state,
      fighterAttackSubject(state),
      [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 1, naturalD20: 19 }),
        damageRollFillWithGroups(damageHole, [[4, 5]]),
      ],
    );

    const result = resolveBattleSubject({
      state,
      subject: fighterAttackSubject(state, "Longsword"),
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 1, naturalD20: 19 }),
        damageRollFillWithGroups(damageHole, [[4, 5]]),
        attackDamageDispositionFill(dispositionHole, {
          kind: "ordinaryDamage",
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          { combatantId: goblinId, hp: 0 },
        ],
      },
    });
  });

  test("admitted authored critical-range support makes a natural 19 Unarmed Strike critical", () => {
    const state = startBattleRight({
      battleId: battleId("battle-unarmed-critical-range"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: criticalRange19UnitRefs(),
          attack: null,
          unarmedStrike: testUnarmedStrikeDamageAttack(),
          selectedLoadout: {},
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject: BattleSubject = fighterAttackSubject(
      state,
      "Unarmed Strike",
    );
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 1, naturalD20: 19 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          { combatantId: goblinId, hp: 6 },
        ],
      },
    });
  });

  test("fixed-damage Unarmed Strike waits for a concentrating target's save", () => {
    const baseState = startBattleRight({
      battleId: battleId("battle-unarmed-fixed-damage-concentration"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: null,
          unarmedStrike: testUnarmedStrikeDamageAttack(),
          selectedLoadout: {},
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const goblin = baseState.combatants.get(goblinId);
    if (goblin === undefined) {
      throw new Error("Expected concentrating Unarmed Strike target.");
    }
    const state: BattleState = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(goblinId, {
        ...goblin,
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            "synthetic-unarmed-target-concentration",
          ),
          effectKind: "spellEffect",
        },
      }),
    };
    const subject = fighterAttackSubject(state, "Unarmed Strike");
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
    const attackFills = [
      targetFill(targetHole, goblinId),
      attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
    ];

    const concentration = requireHole(
      resolveBattleSubject({ state, subject, fills: attackFills }),
      "concentrationSavingThrow",
    );
    expect(concentration).toMatchObject({
      combatantId: goblinId,
      damageAmount: 4,
      dc: concentrationSavingThrowDc(4),
    });
    const resolved = resolveBattleSubject({
      state,
      subject,
      fills: [
        ...attackFills,
        concentrationSavingThrowFill(concentration, true),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: goblinId, hp: 6 }),
        ]),
      },
    });
  });

  test("dice-based Unarmed Strike profiles request damage dice fills", () => {
    const state = startBattleRight({
      battleId: battleId("battle-unarmed-dice-profile"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: null,
          unarmedStrike: testUnarmedStrikeDieAttack(),
          selectedLoadout: {},
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject: BattleSubject = fighterAttackSubject(
      state,
      "Unarmed Strike",
    );
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
    const awaitingRoll = resolveBattleSubject({
      state,
      subject,
      fills: [targetFill(targetHole, goblinId)],
    });
    if (awaitingRoll.tag !== "needsHoles") {
      throw new Error("Expected the Unarmed Strike to await its attack roll.");
    }
    assertBattleSnapshotCodecAcceptsHolesForSubjectForTest({
      snapshot: awaitingRoll.snapshot,
      subject,
      holes: awaitingRoll.holes,
    });
    const damageHole = attackDamageHoleAfterHit(
      state,
      targetHole,
      rollHole,
      { total: 15, naturalD20: 10 },
      subject,
    );

    expect(damageHole).toMatchObject({
      critical: false,
      label: "Unarmed Strike damage (1d4+3-bludgeoning)",
    });

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 4),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          { combatantId: goblinId, hp: 3 },
        ],
      },
    });
  });

  test("critical hits double dice-based Unarmed Strike profile dice", () => {
    const state = startBattleRight({
      battleId: battleId("battle-unarmed-dice-critical"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: null,
          unarmedStrike: testUnarmedStrikeDieAttack(),
          selectedLoadout: {},
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject: BattleSubject = fighterAttackSubject(
      state,
      "Unarmed Strike",
    );
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
    const damageHole = attackDamageHoleAfterHit(
      state,
      targetHole,
      rollHole,
      { total: 20, naturalD20: 20 },
      subject,
    );

    expect(damageHole).toMatchObject({
      critical: true,
      label: "Unarmed Strike damage (2d4+3-bludgeoning)",
    });
    const dispositionHole = attackDamageDispositionHoleAfterFills(
      state,
      subject,
      [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 20, naturalD20: 20 }),
        damageRollFillWithGroups(damageHole, [[4, 4]]),
      ],
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 20, naturalD20: 20 }),
        damageRollFillWithGroups(damageHole, [[4, 4]]),
        attackDamageDispositionFill(dispositionHole, {
          kind: "ordinaryDamage",
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          { combatantId: goblinId, hp: 0 },
        ],
      },
    });
  });

  test("Martial Arts grants an eligible Bonus Action Unarmed Strike without an Attack-action prerequisite", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-martial-arts-bonus-unarmed-strike"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          displayName: "Monk",
          initiative: 20,
          classLevels: [{ className: "monk", level: 1 }],
          attack: null,
          unarmedStrike: testUnarmedStrikeDieAttack(),
          selectedLoadout: {},
          characterUnitRefs: [
            supportedBattleUnitRef(
              unitLibrary.requireUnit("monk_martial_arts"),
            ),
          ],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    assertBattleSnapshotCodecRoundTripForTest(snapshotBattle(state));
    const act = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "bonusAction" &&
        candidate.subject.action === "martialArtsUnarmedStrike",
    );
    if (act === undefined) {
      throw new Error("Expected Martial Arts Bonus Unarmed Strike act.");
    }
    const targetHole = findHole(act.initialHoles, "targetChoice");
    const needsRoll = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill(targetHole, goblinId)],
    });
    const rollHole = requireHole(needsRoll, "attackRoll");
    const needsDamage = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
      ],
    });
    const damageHole = requireHole(needsDamage, "rolledDice");

    const result = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 4),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: { bonusActionAvailable: false },
        combatants: [
          { combatantId: fighterId },
          { combatantId: goblinId, hp: 3 },
        ],
      },
    });
  });

  test("Martial Arts Bonus Action Unarmed Strike direct resolution requires an available Bonus Action", () => {
    const eligibleState = startBattleRight({
      battleId: battleId("battle-martial-arts-bonus-unarmed-strike-stale"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          displayName: "Monk",
          initiative: 20,
          classLevels: [{ className: "monk", level: 1 }],
          attack: null,
          unarmedStrike: testUnarmedStrikeDieAttack(),
          selectedLoadout: {},
          characterUnitRefs: [
            supportedBattleUnitRef(
              unitLibrary.requireUnit("monk_martial_arts"),
            ),
          ],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = {
      ...eligibleState,
      currentTurnResources: {
        ...eligibleState.currentTurnResources,
        currentHasBonusAction: false,
      },
    } satisfies BattleState;

    expect(
      resolveBattleSubject({
        state,
        subject: characterBonusAttackSubjectForTest(
          state,
          fighterId,
          "martialArtsUnarmedStrike",
        ),
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Bonus Action is no longer available for the current actor.",
    });
  });

  test("Martial Arts Bonus Action Unarmed Strike rejects armor, shield, and non-Monk-weapon loadouts", () => {
    const rejectedLoadouts = [
      {
        name: "armor",
        armorClass: heavyArmorClassState(),
        selectedLoadout: {
          armor: {
            itemId: battleObjectId("armor:equipment_chain_mail"),
            unitId: parseSharedUnitId("equipment_chain_mail"),
          },
          weapon: {
            itemId: battleObjectId("main:weapon_dagger"),
            unitId: parseSharedUnitId("weapon_dagger"),
            grip: "one_handed" as const,
          },
        },
        attack: testDaggerAttack(),
      },
      {
        name: "shield",
        selectedLoadout: {
          shield: {
            itemId: battleObjectId("shield:equipment_shield"),
            unitId: parseSharedUnitId("equipment_shield"),
          },
        },
        armorClass: {
          ...defaultArmorClassState(),
          leftHandUse: "shield" as const,
        },
        attack: null,
      },
      {
        name: "non-monk weapon",
        armorClass: undefined,
        selectedLoadout: {
          weapon: {
            itemId: battleObjectId("main:weapon_longsword"),
            unitId: parseSharedUnitId("weapon_longsword"),
            grip: "one_handed" as const,
          },
        },
        attack: testLongswordAttack(),
      },
    ] as const;

    for (const loadout of rejectedLoadouts) {
      const session = startBattleSessionRight({
        battleId: battleId(`battle-martial-arts-reject-${loadout.name}`),
        combatants: [
          characterSeed({
            combatantId: fighterId,
            displayName: "Monk",
            initiative: 20,
            classLevels: [{ className: "monk", level: 1 }],
            attack: loadout.attack,
            selectedLoadout: loadout.selectedLoadout,
            ...(loadout.armorClass === undefined
              ? {}
              : { armorClass: loadout.armorClass }),
            characterUnitRefs: [
              supportedBattleUnitRef(
                unitLibrary.requireUnit("monk_martial_arts"),
              ),
            ],
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      });
      const state = session.state;

      expect(
        discoverBattleActs(session).some(
          (candidate) =>
            candidate.subject.tag === "bonusAction" &&
            candidate.subject.action === "martialArtsUnarmedStrike",
        ),
      ).toBe(false);
      expect(
        resolveBattleSubject({
          state,
          subject: characterBonusAttackSubjectForTest(
            state,
            fighterId,
            "martialArtsUnarmedStrike",
          ),
          fills: [],
        }),
      ).toMatchObject({ tag: "invalid", reason: "unsupportedActOption" });
    }
  });

  test("natural 19 weapon attacks are ordinary hits without the admitted critical-range hook", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole, {
      total: 19,
      naturalD20: 19,
    });

    expect(damageHole).toMatchObject({
      critical: false,
      label: "weapon_longsword damage (1d8+3-slashing)",
    });
  });

  test("natural 1 still misses with admitted critical-range support", () => {
    const state = fighterVsGoblinBattle({
      characterUnitRefs: criticalRange19UnitRefs(),
    });
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);

    const result = resolveBattleSubject({
      state,
      subject: fighterAttackSubject(state, "Longsword"),
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 99, naturalD20: 1 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { actionResources: [] } },
    });
  });

  test("attack rejects a non-current actor", () => {
    const state = fighterVsGoblinBattle();

    const result = resolveBattleSubject({
      state,
      subject: goblinAttackSubject(state, "Scimitar"),
      fills: [],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "wrongActor",
    });
  });

  test("filled attack hit spends the action and applies rolled weapon damage to HP", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = requireHole(
      resolveBattleSubject({
        state,
        subject: fighterAttackSubject(state, "Longsword"),
        fills: [
          targetFill(targetHole, goblinId),
          attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject: fighterAttackSubject(state, "Longsword"),
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 4),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          actionResources: [],
        },
        combatants: [
          { combatantId: fighterId },
          { combatantId: goblinId, hp: 3, tempHp: 0 },
        ],
      },
    });
  });

  test("attack damage removes Temporary Hit Points before HP", () => {
    const state = startBattleRight({
      battleId: battleId("battle-temp-hp"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10, tempHp: 5 }),
      ],
    });
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole);

    const result = resolveBattleSubject({
      state,
      subject: fighterAttackSubject(state, "Longsword"),
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 4),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          { combatantId: goblinId, hp: 8, tempHp: 0 },
        ],
      },
    });
  });

  test("attack damage clamps Stat Block creature HP at 0 and marks Goblin Warrior dead", () => {
    const state = startBattleRight({
      battleId: battleId("battle-stat-block-zero"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10, currentHp: 3 }),
      ],
    });
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = attackDamageHoleAfterHit(state, targetHole, rollHole);
    const dispositionHole = attackDamageDispositionHoleAfterDamage(
      state,
      targetHole,
      rollHole,
      damageHole,
      goblinId,
      8,
    );

    const result = resolveBattleSubject({
      state,
      subject: fighterAttackSubject(state, "Longsword"),
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
        damageRollFill(damageHole, 8),
        attackDamageDispositionFill(dispositionHole, {
          kind: "ordinaryDamage",
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          {
            combatantId: goblinId,
            hp: 0,
            tempHp: 0,
            zeroHpLifecycle: { policy: "diesAtZeroHp", dead: true },
          },
        ],
      },
    });
  });
});
