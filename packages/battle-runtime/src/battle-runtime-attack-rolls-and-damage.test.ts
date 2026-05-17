import {
  startBattleRight,
  fighterVsGoblinBattle,
  criticalRange19UnitRefs,
  fighterAttackSubject,
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
  characterSeed,
  heavyArmorClassState,
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
  discoverBattleActs,
  resolveBattleSubject,
} from "./battle-runtime-test-support.ts";
import type {
  BattleState,
  BattleSubject,
} from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: attack rolls and damage", () => {
  test("attack miss spends the action without asking for weapon damage", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);

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
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
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
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
      fills: [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 1, naturalD20: 20 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "needsHoles",
      holes: [
        { kind: "rolledDice", label: "Longsword damage (2d8+3-slashing)" },
      ],
      snapshot: {
        turn: {
          actionResources: [{ kind: "action", source: "turn" }],
        },
      },
    });
  });

  test("attack replay rejects invalid natural d20 attack-roll results", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);

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
  });

  test("attack replay rejects damage fills on a miss", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);
    const rollHole = attackRollHoleAfterTarget(state, targetHole);
    const damageHole = requireHole(
      resolveBattleSubject({
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
      }),
      "rolledDice",
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
      }),
      "rolledDice",
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
      }),
      "rolledDice",
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
      fighterAttackSubject(),
      goblinId,
    );
    const dispositionHole = attackDamageDispositionHoleAfterFills(
      state,
      fighterAttackSubject(),
      [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 20, naturalD20: 20 }),
        damageRollFillWithGroups(damageHole, [[4, 5]]),
      ],
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
      label: "Longsword damage (2d8+3-slashing)",
    });
    const dispositionHole = attackDamageDispositionHoleAfterFills(
      state,
      fighterAttackSubject(),
      [
        targetFill(targetHole, goblinId),
        attackRollFill(rollHole, { total: 1, naturalD20: 19 }),
        damageRollFillWithGroups(damageHole, [[4, 5]]),
      ],
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
    const subject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "attack",
      attackName: "Unarmed Strike",
    };
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
    const subject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "attack",
      attackName: "Unarmed Strike",
    };
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
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
    const subject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "attack",
      attackName: "Unarmed Strike",
    };
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
    const state = startBattleRight({
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
    const act = discoverBattleActs(state).find(
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
        subject: {
          tag: "bonusAction",
          actorId: fighterId,
          action: "martialArtsUnarmedStrike",
          attackName: "Unarmed Strike",
        },
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
          armor: "equipment_chain_mail",
          weapon: {
            itemId: "main:weapon_dagger",
            unitId: "weapon_dagger",
            grip: "one_handed" as const,
          },
        },
        attack: testDaggerAttack(),
      },
      {
        name: "shield",
        selectedLoadout: { shield: "equipment_shield" },
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
            itemId: "main:weapon_longsword",
            unitId: "weapon_longsword",
            grip: "one_handed" as const,
          },
        },
        attack: testLongswordAttack(),
      },
    ] as const;

    for (const loadout of rejectedLoadouts) {
      const state = startBattleRight({
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

      expect(
        discoverBattleActs(state).some(
          (candidate) =>
            candidate.subject.tag === "bonusAction" &&
            candidate.subject.action === "martialArtsUnarmedStrike",
        ),
      ).toBe(false);
      expect(
        resolveBattleSubject({
          state,
          subject: {
            tag: "bonusAction",
            actorId: fighterId,
            action: "martialArtsUnarmedStrike",
            attackName: "Unarmed Strike",
          },
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
      label: "Longsword damage (1d8+3-slashing)",
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
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
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
      subject: {
        tag: "action",
        actorId: goblinId,
        action: "attack",
        attackName: "Scimitar",
      },
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
      }),
      "rolledDice",
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
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
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
      subject: {
        tag: "action",
        actorId: fighterId,
        action: "attack",
        attackName: "Longsword",
      },
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
