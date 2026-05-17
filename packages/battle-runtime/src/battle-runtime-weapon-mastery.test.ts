import {
  startBattleRight,
  requireResolved,
  fighterVsGoblinBattle,
  masterySapUnitRefs,
  masteryToppleUnitRefs,
  masteryCleaveUnitRefs,
  longswordWeaponMasterySelections,
  greataxeWeaponMasterySelections,
  longbowWeaponMasterySelections,
  quarterstaffWeaponMasterySelections,
  fighterAttackSubject,
  goblinAttackSubject,
  attackInitialTargetHole,
  attackRollHoleAfterTarget,
  attackDamageHoleAfterHit,
  resolveLongswordHit,
  resolveLongswordMiss,
  requireHole,
  targetFill,
  attackTargetFill,
  attackTargetSpatialFact,
  attackRollFill,
  unitFeatureDecisionFill,
  concentrationSavingThrowFill,
  reactionDecisionFill,
  savingThrowOutcomeFill,
  damageRollFill,
  attackDamageDispositionFill,
  characterSeed,
  testShortswordAttack,
  testQuarterstaffAttack,
  testGreataxeAttack,
  testRangedCleaveLongbowAttack,
  statBlockCreatureInit,
  reactionModifierUnitRef,
  uncannyDodgeUnit,
  wizardSpellcasting,
  oppositionSide,
  fighterId,
  goblinId,
  skeletonId,
  wizardId,
  applyWeaponMasterySapOnHit,
  battleAbilityModifier,
  battleId,
  cantripSpellInvocationRef,
  concentrationSavingThrowDc,
  difficultyClass,
  endTurn,
  hasCondition,
  holeId,
  Hp,
  resolveBattleReaction,
  resolveBattleSubject,
} from "./battle-runtime-test-support.ts";
import type {
  BattleState,
  BattleSubject,
} from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";

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
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
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
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
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
    const subject = {
      tag: "action",
      actorId: fighterId,
      action: "attack",
      attackName: "Longsword",
    } as const satisfies Extract<BattleSubject, { readonly tag: "action" }>;
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
        attackTargetFill(
          targetHole,
          subject.actorId,
          goblinId,
          subject.attackName,
        ),
      ],
    });

    expect(result).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "attackRoll", label: "Longsword attack roll" }],
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

  test("attack hit asks for Longsword damage dice before spending the action", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = requireHole(
      resolveBattleSubject({
        state,
        subject: {
          tag: "action",
          actorId: fighterId,
          action: "attack",
          attackName: "Longsword",
        },
        fills: [],
      }),
      "targetChoice",
    );
    const rollHole = requireHole(
      resolveBattleSubject({
        state,
        subject: {
          tag: "action",
          actorId: fighterId,
          action: "attack",
          attackName: "Longsword",
        },
        fills: [targetFill(targetHole, goblinId)],
      }),
      "attackRoll",
    );

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
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
          label: "Longsword damage (1d8+3-slashing)",
          attack: {
            weapon: { id: "weapon_longsword" },
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
    const subject = fighterAttackSubject();
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
      sourceUnitId: "mastery_sap",
      sourceCombatantId: fighterId,
      mode: "disadvantage",
      expiresAt: { kind: "startOfTurn", combatantId: fighterId },
    });

    const goblinTurn = requireResolved(
      endTurn({ state: hit.state, actorId: fighterId }),
    ).state;
    const goblinSubject = goblinAttackSubject("Scimitar");
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
      expect.objectContaining({ sourceUnitId: "mastery_sap" }),
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
        sourceUnitId: "mastery_sap",
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
      expect.objectContaining({ sourceUnitId: "mastery_sap" }),
    );
  });

  test("Weapon Mastery Sap is gated by hit, selected mastery ownership, and Sap weapon property", () => {
    const subject = fighterAttackSubject();
    const hitWithoutSelection = resolveLongswordHit(
      fighterVsGoblinBattle({ characterUnitRefs: masterySapUnitRefs() }),
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
          weaponUnitId: "weapon_shortsword",
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

  test("Weapon Mastery Topple opens an optional Constitution save on a selected Topple weapon hit", () => {
    const state = fighterVsGoblinBattle({
      characterUnitRefs: masteryToppleUnitRefs(),
      weaponMasteries: quarterstaffWeaponMasterySelections(),
      attack: testQuarterstaffAttack(),
    });
    const subject = fighterAttackSubject("Quarterstaff");
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
          unitFeature: { unitId: "mastery_topple", label: "Topple" },
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
    const subject = fighterAttackSubject("Quarterstaff");
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
    const subject = fighterAttackSubject("Quarterstaff");
    const eligibleState = fighterVsGoblinBattle({
      characterUnitRefs: masteryToppleUnitRefs(),
      weaponMasteries: quarterstaffWeaponMasterySelections(),
      attack: testQuarterstaffAttack(),
    });
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
    const nonToppleWeapon = resolveBattleSubject({
      state: fighterVsGoblinBattle({
        characterUnitRefs: masteryToppleUnitRefs(),
        weaponMasteries: longswordWeaponMasterySelections(),
      }),
      subject: fighterAttackSubject(),
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 15, naturalD20: 10 }),
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
    const state = startBattleRight({
      battleId: battleId("battle-weapon-mastery-cleave"),
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
    const subject = fighterAttackSubject("Greataxe");
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
      attackTargetFill(primaryTarget, fighterId, goblinId, "Greataxe"),
      attackRollFill(primaryRoll, { total: 15, naturalD20: 10 }),
      damageRollFill(primaryDamage, 1),
    ];
    const decision = requireHole(
      resolveBattleSubject({ state, subject, fills: primaryFills }),
      "unitFeatureDecision",
    );
    expect(decision).toMatchObject({
      label: "Use Cleave",
      unitFeature: { unitId: "mastery_cleave", label: "Cleave" },
      choices: ["use", "decline"],
    });

    const target = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
      }),
      "targetChoice",
    );
    const cleaveFacts = [
      attackTargetSpatialFact(fighterId, skeletonId, "Greataxe"),
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
        weapon: expect.objectContaining({ id: "weapon_greataxe" }),
        damageAbilityModifier: battleAbilityModifier(0),
      }),
    });

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
    const subject = fighterAttackSubject("Greataxe");
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
      attackTargetFill(primaryTarget, fighterId, goblinId, "Greataxe"),
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
      attackTargetSpatialFact(fighterId, skeletonId, "Greataxe"),
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
          sourceSpellId: "mage_armor",
          effectKind: "spellEffect" as const,
        },
      }),
    };
    const subject = fighterAttackSubject("Greataxe");
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
      attackTargetFill(primaryTarget, fighterId, goblinId, "Greataxe"),
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
      attackTargetSpatialFact(fighterId, skeletonId, "Greataxe"),
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
    const subject = fighterAttackSubject("Greataxe");
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
      attackTargetFill(primaryTarget, fighterId, goblinId, "Greataxe"),
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
      attackTargetSpatialFact(fighterId, skeletonId, "Greataxe"),
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
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
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
    const subject = fighterAttackSubject("Greataxe");
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
      attackTargetFill(primaryTarget, fighterId, goblinId, "Greataxe"),
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
      holes: [{ kind: "reactionDecision", trigger: "afterDamage" }],
      snapshot: {
        pendingReaction: { trigger: "afterDamage" },
      },
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

    const afterDecline = resolveBattleReaction({
      state: awaitingPrimaryAfterDamage.state,
      fill: reactionDecisionFill(
        awaitingPrimaryAfterDamage.snapshot.pendingReaction!.decisionHole,
        { kind: "decline", reactorId: wizardId },
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
          side: oppositionSide,
          attack: null,
          classLevels: [{ className: "rogue", level: 5 }],
          unitFeatures: [{ unit: uncannyDodgeUnit() }],
          characterUnitRefs: [reactionModifierUnitRef("rogue_uncanny_dodge")],
        }),
      ],
    });
    const subject = fighterAttackSubject("Greataxe");
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
      attackTargetFill(primaryTarget, fighterId, goblinId, "Greataxe"),
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
      attackTargetSpatialFact(fighterId, skeletonId, "Greataxe"),
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
      holes: [{ kind: "reactionDecision", trigger: "attackHit" }],
      snapshot: {
        pendingReaction: { trigger: "attackHit" },
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

    const afterCleaveHitDecline = resolveBattleReaction({
      state: awaitingCleaveAttackHit.state,
      fill: reactionDecisionFill(
        awaitingCleaveAttackHit.snapshot.pendingReaction!.decisionHole,
        { kind: "decline", reactorId: skeletonId },
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
    const subject = fighterAttackSubject("Greataxe");
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
      attackTargetFill(primaryTarget, fighterId, goblinId, "Greataxe"),
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
      attackTargetSpatialFact(fighterId, skeletonId, "Greataxe"),
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
    const subject = fighterAttackSubject("Greataxe");
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
      attackTargetFill(primaryTarget, fighterId, goblinId, "Greataxe"),
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
      attackTargetSpatialFact(fighterId, skeletonId, "Greataxe"),
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

  test("Weapon Mastery Cleave rejects ineligible second-target facts and unsupported use", () => {
    const subject = fighterAttackSubject("Greataxe");
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
      attackTargetFill(primaryTarget, fighterId, goblinId, "Greataxe"),
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
          attackTargetSpatialFact(fighterId, skeletonId, "Greataxe"),
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
          attackTargetSpatialFact(fighterId, goblinId, "Greataxe"),
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
        battleId: battleId("battle-weapon-mastery-cleave-no-selection"),
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
        "Weapon Mastery Cleave is only valid for an eligible Cleave weapon hit.",
    });
    const noCleaveSupport = resolveBattleSubject({
      state: startBattleRight({
        battleId: battleId("battle-weapon-mastery-cleave-no-support"),
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
        "Weapon Mastery Cleave is only valid for an eligible Cleave weapon hit.",
    });

    const rangedCleaveState = startBattleRight({
      battleId: battleId("battle-weapon-mastery-cleave-ranged-gate"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: masteryCleaveUnitRefs(),
          weaponMasteries: longbowWeaponMasterySelections(),
          attack: testRangedCleaveLongbowAttack(),
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
      ],
    });
    const rangedSubject = fighterAttackSubject("Longbow");
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
        attackTargetFill(rangedTarget, fighterId, goblinId, "Longbow"),
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
        "Weapon Mastery Cleave is only valid for an eligible Cleave weapon hit.",
    });
  });
});
