// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.rogue-steady-aim
import {
  startBattleRight,
  testBattleCreatureStateWithConditions,
  requireResolved,
  fighterAttackSubject,
  goblinAttackSubject,
  attackInitialTargetHole,
  attackRollHoleAfterTarget,
  attackDamageHoleAfterHit,
  requireHole,
  findHole,
  targetFill,
  attackTargetFill,
  attackRollFill,
  reactionDecisionFill,
  grappleOutcomeFill,
  damageRollFill,
  damageRollFillWithGroups,
  attackDamageDispositionHoleAfterFills,
  attackDamageDispositionFill,
  characterSeed,
  heavyArmorClassState,
  statBlockCreatureInit,
  actionSurgeResource,
  resource,
  supportedBattleUnitRef,
  rageResource,
  innateSorceryResource,
  recklessAttackFeature,
  testUnarmedStrikeDamageAttack,
  testUnarmedStrikeDieAttack,
  actionSurgeWithAdditionalDirectEffect,
  secondWindWithAdditionalDirectEffect,
  wizardSpellcasting,
  spellRecord,
  fighterId,
  goblinId,
  wizardId,
  unitLibrary,
  applyCondition,
  battleId,
  cantripSpellInvocationRef,
  characterBattleResourceUsage,
  difficultyClass,
  discoverBattleActs,
  endTurn,
  movementFeet,
  resolveBattleReaction,
  resolveBattleSubject,
  resolveFailedAbilityCheckResourceBoost,
  resourceCount,
  spellSaveDcForCaster,
  startBattle,
} from "./battle-runtime-test-support.ts";
import type {
  BattleState,
  BattleSubject,
} from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: class action features", () => {
  test("Action Surge grants one additional non-Magic action and cannot be used twice in one turn", () => {
    const state = {
      ...startBattleRight({
        battleId: battleId("battle-action-surge"),
        combatants: [
          characterSeed({
            initiative: 20,
            resources: [actionSurgeResource()],
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
      currentTurnResources: {
        actionResources: [],
        currentHasBonusAction: true,
        commandHalt: null,
        jumpDistanceMultiplier: null,
        spellSlotUsesThisTurn: [],
        levelOnePlusSpellCastsThisTurn: [],
        quickenedLevelOnePlusSpellCastsThisTurn: [],
        attackRollMadeThisTurn: false,
        attackDamageRidersUsedThisTurn: [],
        recklessAttackWhileRagingUsedThisTurn: [],
        weaponDamageDiceRollChoicesUsedThisTurn: [],
        weaponMasteryCleaveAttackersUsedThisTurn: [],
        dashMovementBonusFeet: movementFeet(0),
        disengaged: false,
      },
    } satisfies BattleState;

    expect(discoverBattleActs(state).map((act) => act.subject)).toEqual([
      {
        tag: "unitFeature",
        actorId: fighterId,
        unitId: "fighter_action_surge",
      },
      { tag: "runtimeCommand", actorId: fighterId, command: "move" },
      { tag: "runtimeCommand", actorId: fighterId, command: "endTurn" },
    ]);

    const surged = resolveBattleSubject({
      state,
      subject: {
        tag: "unitFeature",
        actorId: fighterId,
        unitId: "fighter_action_surge",
      },
      fills: [],
    });

    expect(surged).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          actionResources: [
            {
              kind: "action",
              source: "unit",
              sourceOwnerId: fighterId,
              sourceUnitId: "fighter_action_surge",
              restriction: { kind: "exclude", actions: ["magic"] },
            },
          ],
        },
        acts: expect.arrayContaining([
          expect.objectContaining({
            subject: expect.objectContaining({ action: "attack" }),
          }),
          expect.objectContaining({
            subject: expect.objectContaining({ action: "grapple" }),
          }),
          expect.objectContaining({
            subject: {
              tag: "runtimeCommand",
              actorId: fighterId,
              command: "move",
            },
          }),
          expect.objectContaining({
            subject: {
              tag: "runtimeCommand",
              actorId: fighterId,
              command: "endTurn",
            },
          }),
        ]),
      },
    });

    if (surged.tag !== "resolved") {
      throw new Error(`Expected resolved Action Surge, got ${surged.tag}.`);
    }
    expect(
      surged.snapshot.acts.some((act) => act.subject.tag === "actionSpell"),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: surged.state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "fighter_action_surge",
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });

    const afterFighter = requireResolved(
      endTurn({ state: surged.state, actorId: fighterId }),
    );
    expect(afterFighter.state.combatants.get(fighterId)?.origin).toMatchObject({
      resources: [expect.objectContaining({ usedThisTurn: true })],
    });

    const afterGoblin = requireResolved(
      endTurn({ state: afterFighter.state, actorId: goblinId }),
    );
    expect(afterGoblin.state.combatants.get(fighterId)?.origin).toMatchObject({
      resources: [expect.objectContaining({ usedThisTurn: false })],
    });

    const zeroHpActorState = {
      ...startBattleRight({
        battleId: battleId("battle-action-surge-atZeroHitPoints-actor"),
        combatants: [
          characterSeed({
            initiative: 20,
            currentHp: 0,
            resources: [actionSurgeResource()],
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
      currentTurnResources: {
        actionResources: [],
        currentHasBonusAction: true,
        commandHalt: null,
        jumpDistanceMultiplier: null,
        spellSlotUsesThisTurn: [],
        levelOnePlusSpellCastsThisTurn: [],
        quickenedLevelOnePlusSpellCastsThisTurn: [],
        attackRollMadeThisTurn: false,
        attackDamageRidersUsedThisTurn: [],
        recklessAttackWhileRagingUsedThisTurn: [],
        weaponDamageDiceRollChoicesUsedThisTurn: [],
        weaponMasteryCleaveAttackersUsedThisTurn: [],
        dashMovementBonusFeet: movementFeet(0),
        disengaged: false,
      },
    } satisfies BattleState;
    expect(
      resolveBattleSubject({
        state: zeroHpActorState,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "fighter_action_surge",
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("Action Surge discovery and resolution share the supported Unit feature shape", () => {
    const state = {
      ...startBattleRight({
        battleId: battleId("battle-action-surge-unsupported-shape"),
        combatants: [
          characterSeed({
            initiative: 20,
            resources: [
              actionSurgeResource({
                unit: actionSurgeWithAdditionalDirectEffect(),
              }),
            ],
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
      currentTurnResources: {
        actionResources: [],
        currentHasBonusAction: true,
        commandHalt: null,
        jumpDistanceMultiplier: null,
        spellSlotUsesThisTurn: [],
        levelOnePlusSpellCastsThisTurn: [],
        quickenedLevelOnePlusSpellCastsThisTurn: [],
        attackRollMadeThisTurn: false,
        attackDamageRidersUsedThisTurn: [],
        recklessAttackWhileRagingUsedThisTurn: [],
        weaponDamageDiceRollChoicesUsedThisTurn: [],
        weaponMasteryCleaveAttackersUsedThisTurn: [],
        dashMovementBonusFeet: movementFeet(0),
        disengaged: false,
      },
    } satisfies BattleState;

    expect(discoverBattleActs(state).map((act) => act.subject)).toEqual([
      { tag: "runtimeCommand", actorId: fighterId, command: "move" },
      { tag: "runtimeCommand", actorId: fighterId, command: "endTurn" },
    ]);
    expect(
      resolveBattleSubject({
        state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "fighter_action_surge",
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("Second Wind spends a Bonus Action and feature use to heal through the HP boundary", () => {
    const state = startBattleRight({
      battleId: battleId("battle-second-wind"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevel: 2,
          currentHp: 4,
          resources: [resource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    const secondWindAct = discoverBattleActs(state).find(
      (act) =>
        act.subject.tag === "unitFeature" &&
        act.subject.unitId === "fighter_second_wind",
    );
    expect(secondWindAct).toMatchObject({
      subject: {
        tag: "unitFeature",
        actorId: fighterId,
        unitId: "fighter_second_wind",
      },
      label: "Second Wind",
      initialHoles: [
        { kind: "rolledDice", label: "Second Wind healing (1d10)" },
      ],
    });

    if (secondWindAct === undefined) {
      throw new Error("Expected Second Wind act.");
    }
    const result = resolveBattleSubject({
      state,
      subject: secondWindAct.subject,
      fills: [
        damageRollFill(findHole(secondWindAct.initialHoles, "rolledDice"), 8),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          bonusActionAvailable: false,
        },
        combatants: [
          {
            combatantId: fighterId,
            hp: 12,
          },
          { combatantId: goblinId },
        ],
      },
    });
    if (result.tag !== "resolved") {
      throw new Error(`Expected resolved Second Wind, got ${result.tag}.`);
    }
    expect(result.state.combatants.get(fighterId)?.origin).toMatchObject({
      resources: [
        expect.objectContaining({
          unit: expect.objectContaining({ id: "fighter_second_wind" }),
          usesRemaining: 1,
        }),
      ],
    });
    expect(
      discoverBattleActs(result.state).some(
        (act) =>
          act.subject.tag === "unitFeature" &&
          act.subject.unitId === "fighter_second_wind",
      ),
    ).toBe(false);
  });

  test("Second Wind is rejected without action capacity, resource uses, or the supported Unit shape", () => {
    const noBonusActionState = {
      ...startBattleRight({
        battleId: battleId("battle-second-wind-no-bonus-action"),
        combatants: [
          characterSeed({
            initiative: 20,
            currentHp: 4,
            resources: [resource()],
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
      currentTurnResources: {
        actionResources: [{ kind: "action", source: "turn" }],
        currentHasBonusAction: false,
        commandHalt: null,
        jumpDistanceMultiplier: null,
        spellSlotUsesThisTurn: [],
        levelOnePlusSpellCastsThisTurn: [],
        quickenedLevelOnePlusSpellCastsThisTurn: [],
        attackRollMadeThisTurn: false,
        attackDamageRidersUsedThisTurn: [],
        recklessAttackWhileRagingUsedThisTurn: [],
        weaponDamageDiceRollChoicesUsedThisTurn: [],
        weaponMasteryCleaveAttackersUsedThisTurn: [],
        dashMovementBonusFeet: movementFeet(0),
        disengaged: false,
      },
    } satisfies BattleState;
    expect(
      resolveBattleSubject({
        state: noBonusActionState,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "fighter_second_wind",
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });

    const depletedState = startBattleRight({
      battleId: battleId("battle-second-wind-depleted"),
      combatants: [
        characterSeed({
          initiative: 20,
          currentHp: 4,
          resources: [resource({ usesRemaining: 0 })],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(discoverBattleActs(depletedState).map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        {
          tag: "action",
          actorId: fighterId,
          action: "attack",
          attackName: "Longsword",
        },
        { tag: "action", actorId: fighterId, action: "grapple" },
        { tag: "runtimeCommand", actorId: fighterId, command: "move" },
        { tag: "runtimeCommand", actorId: fighterId, command: "endTurn" },
      ]),
    );

    const unsupportedState = startBattleRight({
      battleId: battleId("battle-second-wind-unsupported-shape"),
      combatants: [
        characterSeed({
          initiative: 20,
          currentHp: 4,
          resources: [
            resource({
              unit: secondWindWithAdditionalDirectEffect(),
            }),
          ],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(
      resolveBattleSubject({
        state: unsupportedState,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "fighter_second_wind",
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });

    const zeroHpActorState = startBattleRight({
      battleId: battleId("battle-second-wind-atZeroHitPoints-actor"),
      combatants: [
        characterSeed({
          initiative: 20,
          currentHp: 0,
          resources: [resource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(
      resolveBattleSubject({
        state: zeroHpActorState,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "fighter_second_wind",
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("Steady Aim spends a Bonus Action, grants next-attack Advantage, and sets Speed to 0 until turn end", () => {
    const steadyAimUnit = unitLibrary.requireUnit("rogue_steady_aim");
    if (steadyAimUnit.kind !== "class_feature") {
      throw new Error("Expected Steady Aim class feature Unit.");
    }
    const state = startBattleRight({
      battleId: battleId("battle-rogue-steady-aim"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "rogue", level: 3 }],
          unitFeatures: [{ unit: steadyAimUnit }],
          characterUnitRefs: [supportedBattleUnitRef(steadyAimUnit)],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    const act = discoverBattleActs(state).find(
      (candidate) =>
        candidate.subject.tag === "unitFeature" &&
        candidate.subject.unitId === "rogue_steady_aim",
    );
    expect(act).toMatchObject({
      subject: {
        tag: "unitFeature",
        actorId: fighterId,
        unitId: "rogue_steady_aim",
      },
      label: "Steady Aim",
      initialHoles: [],
    });
    if (act === undefined) {
      throw new Error("Expected Steady Aim act.");
    }

    const aimed = requireResolved(
      resolveBattleSubject({ state, subject: act.subject, fills: [] }),
    );
    expect(aimed.snapshot.turn.bonusActionAvailable).toBe(false);
    expect(
      aimed.snapshot.combatants.find(
        (combatant) => combatant.combatantId === fighterId,
      )?.movement,
    ).toMatchObject({ speedFeet: 0, remainingFeet: 0 });
    expect(aimed.state.combatants.get(fighterId)?.activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "nextAttackRollBySelf",
          sourceUnitId: "rogue_steady_aim",
          mode: "advantage",
        }),
        expect.objectContaining({
          kind: "selfSpeedZero",
          sourceUnitId: "rogue_steady_aim",
        }),
      ]),
    );

    const targetHole = attackInitialTargetHole(aimed.state);
    const rollHole = attackRollHoleAfterTarget(aimed.state, targetHole);
    expect(rollHole).toMatchObject({
      kind: "attackRoll",
      rollMode: "advantage",
    });
    const attackRoll = attackRollFill(rollHole, {
      total: 16,
      naturalD20: 11,
      rollMode: "advantage",
    });
    const needsDamage = resolveBattleSubject({
      state: aimed.state,
      subject: fighterAttackSubject(),
      fills: [targetFill(targetHole, goblinId), attackRoll],
    });
    const damageHole = requireHole(needsDamage, "rolledDice");
    const attacked = requireResolved(
      resolveBattleSubject({
        state: aimed.state,
        subject: fighterAttackSubject(),
        fills: [
          targetFill(targetHole, goblinId),
          attackRoll,
          damageRollFill(damageHole, 4),
        ],
      }),
    );
    expect(
      attacked.state.combatants
        .get(fighterId)
        ?.activeEffects.some(
          (effect) => effect.kind === "nextAttackRollBySelf",
        ),
    ).toBe(false);
    expect(
      attacked.state.combatants
        .get(fighterId)
        ?.activeEffects.some((effect) => effect.kind === "selfSpeedZero"),
    ).toBe(true);
    expect(
      attacked.snapshot.combatants.find(
        (combatant) => combatant.combatantId === fighterId,
      )?.movement.speedFeet,
    ).toBe(0);

    const ended = endTurn({ state: attacked.state, actorId: fighterId });
    expect(ended).toMatchObject({ tag: "resolved" });
    if (ended.tag !== "resolved") {
      throw new Error("Expected Steady Aim turn end to resolve.");
    }
    expect(
      ended.state.combatants
        .get(fighterId)
        ?.activeEffects.some(
          (effect) =>
            effect.kind === "nextAttackRollBySelf" ||
            effect.kind === "selfSpeedZero",
        ),
    ).toBe(false);
    expect(
      ended.snapshot.combatants.find(
        (combatant) => combatant.combatantId === fighterId,
      )?.movement.speedFeet,
    ).toBe(30);
  });

  test("Steady Aim rejects prior movement or an unavailable Bonus Action", () => {
    const steadyAimUnit = unitLibrary.requireUnit("rogue_steady_aim");
    if (steadyAimUnit.kind !== "class_feature") {
      throw new Error("Expected Steady Aim class feature Unit.");
    }
    const state = startBattleRight({
      battleId: battleId("battle-rogue-steady-aim-reject"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "rogue", level: 3 }],
          unitFeatures: [{ unit: steadyAimUnit }],
          characterUnitRefs: [supportedBattleUnitRef(steadyAimUnit)],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      unitId: "rogue_steady_aim",
    };
    const actor = state.combatants.get(fighterId);
    if (actor === undefined) {
      throw new Error("Expected Steady Aim actor.");
    }
    const movedState = {
      ...state,
      combatants: new Map(state.combatants).set(fighterId, {
        ...actor,
        movementSpentFeet: movementFeet(5),
      }),
    } satisfies BattleState;
    expect(
      discoverBattleActs(movedState).some(
        (candidate) =>
          candidate.subject.tag === "unitFeature" &&
          candidate.subject.unitId === "rogue_steady_aim",
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({ state: movedState, subject, fills: [] }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Steady Aim is available only if the actor has not moved this turn.",
    });

    const noBonusActionState = {
      ...state,
      currentTurnResources: {
        ...state.currentTurnResources,
        currentHasBonusAction: false,
      },
    } satisfies BattleState;
    expect(
      resolveBattleSubject({ state: noBonusActionState, subject, fills: [] }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Steady Aim Bonus Action is no longer available.",
    });
  });

  test("Rage enters a reusable ongoing feature and applies damage and Resistance riders", () => {
    const state = startBattleRight({
      battleId: battleId("battle-rage-ongoing-feature"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 1 }],
          resources: [rageResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const rageSubject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      unitId: "barbarian_rage",
    };
    expect(discoverBattleActs(state).map((act) => act.subject)).toEqual(
      expect.arrayContaining([rageSubject]),
    );

    const raging = resolveBattleSubject({
      state,
      subject: rageSubject,
      fills: [],
    });
    expect(raging).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: expect.objectContaining({
          bonusActionAvailable: false,
        }),
      },
    });
    if (raging.tag !== "resolved") throw new Error("Expected resolved Rage.");
    expect([
      ...raging.state.combatants.get(fighterId)!
        .activeOngoingFeatureOccurrences,
    ]).toEqual(
      expect.arrayContaining([
        ["barbarian_rage", expect.objectContaining({ kind: "roundExtended" })],
      ]),
    );

    const attackSubject = fighterAttackSubject();
    const target = attackInitialTargetHole(raging.state, attackSubject);
    const roll = attackRollHoleAfterTarget(raging.state, target, attackSubject);
    const damage = attackDamageHoleAfterHit(
      raging.state,
      target,
      roll,
      { total: 15, naturalD20: 10 },
      attackSubject,
    );
    const hit = resolveBattleSubject({
      state: raging.state,
      subject: attackSubject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
        damageRollFill(damage, 4),
      ],
    });
    expect(hit).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: goblinId, hp: 1 }),
        ]),
      },
    });

    const goblinTurn = requireResolved(
      endTurn({ state: raging.state, actorId: fighterId }),
    ).state;
    const scimitar = goblinAttackSubject("Scimitar");
    const barbarianTarget = attackInitialTargetHole(goblinTurn, scimitar);
    const goblinRoll = attackRollHoleAfterTarget(
      goblinTurn,
      barbarianTarget,
      scimitar,
      fighterId,
    );
    const goblinDamage = attackDamageHoleAfterHit(
      goblinTurn,
      barbarianTarget,
      goblinRoll,
      { total: 15, naturalD20: 10 },
      scimitar,
      fighterId,
    );
    const resisted = resolveBattleSubject({
      state: goblinTurn,
      subject: scimitar,
      fills: [
        targetFill(barbarianTarget, fighterId),
        attackRollFill(goblinRoll, { total: 15, naturalD20: 10 }),
        damageRollFill(goblinDamage, 4),
      ],
    });
    expect(resisted).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: fighterId, hp: 9 }),
        ]),
      },
    });
  });

  test("Rage breaks Concentration and prevents spellcasting", () => {
    const state = startBattleRight({
      battleId: battleId("battle-rage-spellcasting-restriction"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [
            { className: "barbarian", level: 1 },
            { className: "wizard", level: 1 },
          ],
          resources: [rageResource()],
          spellcasting: wizardSpellcasting(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const concentratingActor = state.combatants.get(fighterId);
    if (concentratingActor === undefined) {
      throw new Error("Expected barbarian caster.");
    }
    const concentratingState = {
      ...state,
      combatants: new Map(state.combatants).set(fighterId, {
        ...concentratingActor,
        concentration: {
          sourceSpellId: "mage_armor",
          effectKind: "spellEffect" as const,
        },
      }),
    };
    const rageSubject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      unitId: "barbarian_rage",
    };
    const raging = requireResolved(
      resolveBattleSubject({
        state: concentratingState,
        subject: rageSubject,
        fills: [],
      }),
    );
    expect(raging.state.combatants.get(fighterId)?.concentration).toBeNull();
    expect(
      discoverBattleActs(raging.state).map((act) => act.subject),
    ).not.toEqual(
      expect.arrayContaining([
        {
          tag: "actionSpell",
          actorId: fighterId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "cast" },
        },
      ]),
    );
    expect(
      resolveBattleSubject({
        state: raging.state,
        subject: {
          tag: "actionSpell",
          actorId: fighterId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "cast" },
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("Rage breaking Concentration dissipates a held readied spell", () => {
    const state = startBattleRight({
      battleId: battleId("battle-rage-readied-spell-cleanup"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [
            { className: "barbarian", level: 1 },
            { className: "wizard", level: 1 },
          ],
          resources: [rageResource()],
          spellcasting: wizardSpellcasting(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const readied = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "actionSpell",
          actorId: fighterId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "ready", trigger: "attackHit" },
        },
        fills: [],
      }),
    );
    expect(readied.state.readiedSpells.has(fighterId)).toBe(true);
    const raging = requireResolved(
      resolveBattleSubject({
        state: readied.state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "barbarian_rage",
        },
        fills: [],
      }),
    );
    expect(raging.state.combatants.get(fighterId)?.concentration).toBeNull();
    expect(raging.state.readiedSpells.has(fighterId)).toBe(false);
  });

  test("Reckless Attack is unavailable after any earlier attack roll that turn", () => {
    const state = startBattleRight({
      battleId: battleId("battle-reckless-after-spell-attack"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [
            { className: "barbarian", level: 2 },
            { className: "fighter", level: 2 },
            { className: "wizard", level: 1 },
          ],
          unitFeatures: [recklessAttackFeature()],
          resources: [actionSurgeResource()],
          spellcasting: wizardSpellcasting(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const spellSubject: BattleSubject = {
      tag: "actionSpell",
      actorId: fighterId,
      invocation: cantripSpellInvocationRef(
        "ray_of_frost",
        "spellAttackDamage",
      ),
      mode: { tag: "cast" },
    };
    const spellAct = discoverBattleActs(state).find(
      (act) =>
        act.subject.tag === "actionSpell" &&
        act.subject.actorId === fighterId &&
        act.subject.invocation.spellId === "ray_of_frost" &&
        act.subject.invocation.procedure === "spellAttackDamage",
    );
    const target = spellAct?.initialHoles[0];
    if (target?.kind !== "targetChoice") {
      throw new Error("Expected Ray of Frost target hole.");
    }
    const afterTarget = resolveBattleSubject({
      state,
      subject: spellSubject,
      fills: [targetFill(target, goblinId)],
    });
    if (afterTarget.tag !== "needsHoles") {
      throw new Error("Expected Ray of Frost attack-roll hole.");
    }
    const roll = afterTarget.holes[0];
    if (roll?.kind !== "attackRoll") {
      throw new Error("Expected Ray of Frost attack-roll hole.");
    }
    const missed = requireResolved(
      resolveBattleSubject({
        state,
        subject: spellSubject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 1, naturalD20: 1 }),
        ],
      }),
    );
    expect(missed.state.currentTurnResources.attackRollMadeThisTurn).toBe(true);
    const surged = requireResolved(
      resolveBattleSubject({
        state: missed.state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "fighter_action_surge",
        },
        fills: [],
      }),
    );
    const attackSubject = fighterAttackSubject();
    const attackTarget = attackInitialTargetHole(surged.state, attackSubject);
    const attackRoll = attackRollHoleAfterTarget(
      surged.state,
      attackTarget,
      attackSubject,
    );
    if (attackRoll.kind !== "attackRoll") {
      throw new Error("Expected weapon attack-roll hole.");
    }
    if (!("attack" in attackRoll)) {
      throw new Error("Expected weapon attack-roll hole.");
    }
    expect(attackRoll.ongoingFeatureActivations).toBeUndefined();
  });

  test("Rage Damage scales by Barbarian level", () => {
    const state = startBattleRight({
      battleId: battleId("battle-rage-damage-scaling"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 9 }],
          resources: [rageResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const raging = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "barbarian_rage",
        },
        fills: [],
      }),
    );
    const attackSubject = fighterAttackSubject();
    const target = attackInitialTargetHole(raging.state, attackSubject);
    const roll = attackRollHoleAfterTarget(raging.state, target, attackSubject);
    const damage = attackDamageHoleAfterHit(
      raging.state,
      target,
      roll,
      { total: 15, naturalD20: 10 },
      attackSubject,
    );
    const disposition = attackDamageDispositionHoleAfterFills(
      raging.state,
      attackSubject,
      [
        targetFill(target, goblinId),
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
        damageRollFill(damage, 4),
      ],
    );
    const hit = requireResolved(
      resolveBattleSubject({
        state: raging.state,
        subject: attackSubject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 15, naturalD20: 10 }),
          damageRollFill(damage, 4),
          attackDamageDispositionFill(disposition, {
            kind: "ordinaryDamage",
          }),
        ],
      }),
    );
    expect(hit.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: goblinId, hp: 0 }),
      ]),
    );
  });

  test("Tactical Mind spends Second Wind only when a failed ability check becomes successful", () => {
    const tacticalMindUnit = unitLibrary.requireUnit("fighter_tactical_mind");
    const state = startBattleRight({
      battleId: battleId("battle-tactical-mind-converted-success"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevel: 2,
          resources: [resource({ usesRemaining: 2 })],
          unitFeatures: [{ unit: tacticalMindUnit }],
          characterUnitRefs: [supportedBattleUnitRef(tacticalMindUnit)],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    const converted = resolveFailedAbilityCheckResourceBoost({
      state,
      unitId: tacticalMindUnit.id,
      abilityCheck: {
        actorId: fighterId,
        ability: "int",
        skillOrToolLabel: "Investigation",
        originalTotal: 13,
        dc: difficultyClass(15),
      },
      boostRoll: 3,
    });

    expect(converted).toMatchObject({
      tag: "resolved",
      abilityCheckBoost: {
        boostedTotal: 16,
        boostedSucceeded: true,
      },
      snapshot: {
        turn: {
          bonusActionAvailable: true,
        },
      },
    });
    if (converted.tag !== "resolved") {
      throw new Error(`Expected resolved Tactical Mind, got ${converted.tag}.`);
    }
    expect(converted.state.combatants.get(fighterId)?.origin).toMatchObject({
      resources: [
        expect.objectContaining({
          unit: expect.objectContaining({ id: "fighter_second_wind" }),
          usesRemaining: 1,
        }),
      ],
    });

    const stillFailed = resolveFailedAbilityCheckResourceBoost({
      state,
      unitId: tacticalMindUnit.id,
      abilityCheck: {
        actorId: fighterId,
        ability: "wis",
        originalTotal: 10,
        dc: difficultyClass(15),
      },
      boostRoll: 4,
    });

    expect(stillFailed).toMatchObject({
      tag: "resolved",
      abilityCheckBoost: {
        boostedTotal: 14,
        boostedSucceeded: false,
      },
    });
    if (stillFailed.tag !== "resolved") {
      throw new Error(
        `Expected resolved Tactical Mind, got ${stillFailed.tag}.`,
      );
    }
    expect(stillFailed.state.combatants.get(fighterId)?.origin).toMatchObject({
      resources: [
        expect.objectContaining({
          unit: expect.objectContaining({ id: "fighter_second_wind" }),
          usesRemaining: 2,
        }),
      ],
    });
  });

  test("Tactical Mind rejects successful checks, depleted Second Wind, and unsupported Unit projection", () => {
    const tacticalMindUnit = unitLibrary.requireUnit("fighter_tactical_mind");
    const baseState = startBattleRight({
      battleId: battleId("battle-tactical-mind-invalid"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevel: 2,
          resources: [resource({ usesRemaining: 1 })],
          unitFeatures: [{ unit: tacticalMindUnit }],
          characterUnitRefs: [supportedBattleUnitRef(tacticalMindUnit)],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(
      resolveFailedAbilityCheckResourceBoost({
        state: baseState,
        unitId: tacticalMindUnit.id,
        abilityCheck: {
          actorId: fighterId,
          ability: "str",
          originalTotal: 15,
          dc: difficultyClass(15),
        },
        boostRoll: 1,
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    const depletedState = startBattleRight({
      battleId: battleId("battle-tactical-mind-depleted"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevel: 2,
          resources: [resource({ usesRemaining: 0 })],
          unitFeatures: [{ unit: tacticalMindUnit }],
          characterUnitRefs: [supportedBattleUnitRef(tacticalMindUnit)],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(
      resolveFailedAbilityCheckResourceBoost({
        state: depletedState,
        unitId: tacticalMindUnit.id,
        abilityCheck: {
          actorId: fighterId,
          ability: "dex",
          originalTotal: 14,
          dc: difficultyClass(15),
        },
        boostRoll: 1,
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });

    const unsupportedState = startBattleRight({
      battleId: battleId("battle-tactical-mind-unsupported"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevel: 2,
          resources: [resource({ usesRemaining: 1 })],
          unitFeatures: [{ unit: tacticalMindUnit }],
          characterUnitRefs: [],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(
      resolveFailedAbilityCheckResourceBoost({
        state: unsupportedState,
        unitId: tacticalMindUnit.id,
        abilityCheck: {
          actorId: fighterId,
          ability: "cha",
          originalTotal: 14,
          dc: difficultyClass(15),
        },
        boostRoll: 1,
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("Rage is unavailable in Heavy armor", () => {
    const state = startBattleRight({
      battleId: battleId("battle-rage-heavy-armor-gated"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 1 }],
          resources: [rageResource()],
          armorClass: heavyArmorClassState(),
          selectedLoadout: {
            armor: "armor_chain_mail",
            weapon: {
              itemId: "main:weapon_longsword",
              unitId: "weapon_longsword",
              grip: "one_handed",
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(discoverBattleActs(state).map((act) => act.subject)).not.toEqual(
      expect.arrayContaining([
        { tag: "unitFeature", actorId: fighterId, unitId: "barbarian_rage" },
      ]),
    );
  });

  test("Rage extension spends a Bonus Action without spending another use", () => {
    const state = startBattleRight({
      battleId: battleId("battle-rage-bonus-action-extension"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 1 }],
          resources: [rageResource({ usesRemaining: 2 })],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const rageSubject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      unitId: "barbarian_rage",
    };
    const raging = requireResolved(
      resolveBattleSubject({ state, subject: rageSubject, fills: [] }),
    );
    const nextRound = requireResolved(
      endTurn({
        state: requireResolved(
          endTurn({ state: raging.state, actorId: fighterId }),
        ).state,
        actorId: goblinId,
      }),
    ).state;
    expect(discoverBattleActs(nextRound).map((act) => act.subject)).toEqual(
      expect.arrayContaining([rageSubject]),
    );
    const extended = requireResolved(
      resolveBattleSubject({
        state: nextRound,
        subject: rageSubject,
        fills: [],
      }),
    );
    const barbarian = extended.state.combatants.get(fighterId);
    expect(barbarian?.origin.kind).toBe("character");
    if (barbarian?.origin.kind !== "character") {
      throw new Error("Expected barbarian character.");
    }
    const rageState = barbarian.origin.resources[0];
    if (
      rageState === undefined ||
      characterBattleResourceUsage(rageState) !== "limited" ||
      !("usesRemaining" in rageState)
    ) {
      throw new Error("Expected limited Rage resource.");
    }
    expect(Number(rageState.usesRemaining)).toBe(1);
    expect(extended.snapshot.turn.bonusActionAvailable).toBe(false);
  });

  test("Rage extends when Grapple forces an enemy saving throw", () => {
    const state = startBattleRight({
      battleId: battleId("battle-rage-grapple-saving-throw-extension"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 1 }],
          resources: [rageResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const raging = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "barbarian_rage",
        },
        fills: [],
      }),
    );
    const nextFighterTurn = requireResolved(
      endTurn({
        state: requireResolved(
          endTurn({ state: raging.state, actorId: fighterId }),
        ).state,
        actorId: goblinId,
      }),
    ).state;
    const grappleSubject: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "grapple",
    };
    const grappleAct = discoverBattleActs(nextFighterTurn).find(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.actorId === fighterId &&
        act.subject.action === "grapple",
    );
    if (grappleAct === undefined) {
      throw new Error("Expected Grapple act.");
    }
    const target = findHole(grappleAct.initialHoles, "targetChoice");
    const afterTarget = resolveBattleSubject({
      state: nextFighterTurn,
      subject: grappleSubject,
      fills: [targetFill(target, goblinId)],
    });
    if (afterTarget.tag !== "needsHoles") {
      throw new Error("Expected Grapple outcome hole.");
    }
    const outcome = findHole(afterTarget.holes, "grappleOutcome");
    const grappled = requireResolved(
      resolveBattleSubject({
        state: nextFighterTurn,
        subject: grappleSubject,
        fills: [
          targetFill(target, goblinId),
          grappleOutcomeFill(outcome, false),
        ],
      }),
    );
    const barbarian = grappled.state.combatants.get(fighterId);
    expect(
      [...(barbarian?.activeOngoingFeatureOccurrences.values() ?? [])][0]
        ?.expiresAt,
    ).toEqual({
      kind: "endOfTurn",
      combatantId: fighterId,
      round: 3,
    });
  });

  test("Incapacitated combatants cannot activate or extend Rage", () => {
    const state = startBattleRight({
      battleId: battleId("battle-rage-incapacitated-action-gate"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 1 }],
          resources: [rageResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const barbarian = state.combatants.get(fighterId);
    if (barbarian === undefined) {
      throw new Error("Expected barbarian combatant.");
    }
    const incapacitatedState = {
      ...state,
      combatants: new Map(state.combatants).set(
        fighterId,
        testBattleCreatureStateWithConditions(
          barbarian,
          applyCondition(barbarian.conditions, "incapacitated"),
        ),
      ),
    };
    const rageSubject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      unitId: "barbarian_rage",
    };
    expect(
      discoverBattleActs(incapacitatedState).map((act) => act.subject),
    ).not.toEqual(expect.arrayContaining([rageSubject]));
    expect(
      resolveBattleSubject({
        state: incapacitatedState,
        subject: rageSubject,
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("Persistent Rage uses ten-minute duration and Unconscious early end", () => {
    const state = startBattleRight({
      battleId: battleId("battle-persistent-rage"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 15 }],
          resources: [rageResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const raging = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "barbarian_rage",
        },
        fills: [],
      }),
    );
    const snapshotBarbarian = raging.state.combatants.get(fighterId);
    expect(
      [
        ...(snapshotBarbarian?.activeOngoingFeatureOccurrences.values() ?? []),
      ][0]?.expiresAt,
    ).toEqual({
      kind: "endOfTurn",
      combatantId: fighterId,
      round: 101,
    });
    const barbarian = raging.state.combatants.get(fighterId);
    if (barbarian === undefined) {
      throw new Error("Expected barbarian combatant.");
    }
    const incapacitated = {
      ...raging.state,
      combatants: new Map(raging.state.combatants).set(
        fighterId,
        testBattleCreatureStateWithConditions(
          barbarian,
          applyCondition(barbarian.conditions, "incapacitated"),
        ),
      ),
    };
    const stillRaging = requireResolved(
      endTurn({ state: incapacitated, actorId: fighterId }),
    );
    expect(
      stillRaging.state.combatants.get(fighterId)
        ?.activeOngoingFeatureOccurrences.size,
    ).toBe(1);
    const unconscious = {
      ...raging.state,
      combatants: new Map(raging.state.combatants).set(
        fighterId,
        testBattleCreatureStateWithConditions(
          barbarian,
          applyCondition(barbarian.conditions, "unconscious"),
        ),
      ),
    };
    const ended = requireResolved(
      endTurn({ state: unconscious, actorId: fighterId }),
    );
    expect(
      ended.state.combatants.get(fighterId)?.activeOngoingFeatureOccurrences
        .size,
    ).toBe(0);
  });

  test("Innate Sorcery activation spends a Bonus Action and one Long Rest use for one minute", () => {
    const state = startBattleRight({
      battleId: battleId("battle-innate-sorcery"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "sorcerer", level: 1 }],
          resources: [innateSorceryResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      unitId: "sorcerer_innate_sorcery",
    };

    expect(discoverBattleActs(state).map((act) => act.subject)).toEqual(
      expect.arrayContaining([subject]),
    );

    const result = requireResolved(
      resolveBattleSubject({ state, subject, fills: [] }),
    );
    const sorcerer = result.state.combatants.get(fighterId);
    const resource =
      sorcerer?.origin.kind === "character"
        ? sorcerer.origin.resources[0]
        : undefined;

    expect(result.state.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(resource).toMatchObject({ usesRemaining: resourceCount(1) });
    expect(sorcerer?.activeOngoingFeatureOccurrences).toEqual(
      new Map([
        [
          "sorcerer_innate_sorcery",
          {
            kind: "fixedDuration",
            expiresAt: {
              kind: "endOfTurn",
              combatantId: fighterId,
              round: 11,
            },
          },
        ],
      ]),
    );
  });

  test("Innate Sorcery rejects exhausted uses and non-Sorcerer ownership", () => {
    const subject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      unitId: "sorcerer_innate_sorcery",
    };
    const exhausted = startBattleRight({
      battleId: battleId("battle-innate-sorcery-exhausted"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "sorcerer", level: 1 }],
          resources: [innateSorceryResource({ usesRemaining: 0 })],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(discoverBattleActs(exhausted).map((act) => act.subject)).not.toEqual(
      expect.arrayContaining([subject]),
    );
    expect(
      resolveBattleSubject({ state: exhausted, subject, fills: [] }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    expect(() =>
      startBattle({
        battleId: battleId("battle-innate-sorcery-non-sorcerer"),
        combatants: [
          characterSeed({
            initiative: 20,
            resources: [innateSorceryResource()],
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      }),
    ).toThrow(
      "Character class feature resource requires a sorcerer class level.",
    );
  });

  test("Innate Sorcery expires after its one-minute active duration", () => {
    const state = startBattleRight({
      battleId: battleId("battle-innate-sorcery-expiry"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "sorcerer", level: 1 }],
          resources: [innateSorceryResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      unitId: "sorcerer_innate_sorcery",
    };
    let current = requireResolved(
      resolveBattleSubject({ state, subject, fills: [] }),
    ).state;

    for (let round = 1; round <= 10; round += 1) {
      current = requireResolved(
        endTurn({ state: current, actorId: fighterId }),
      ).state;
      current = requireResolved(
        endTurn({ state: current, actorId: goblinId }),
      ).state;
    }
    current = requireResolved(
      endTurn({ state: current, actorId: fighterId }),
    ).state;

    expect(
      current.combatants.get(fighterId)?.activeOngoingFeatureOccurrences,
    ).toEqual(new Map());
  });

  test("Innate Sorcery projects +1 DC and spell attack Advantage for Sorcerer spells while active", () => {
    const state = startBattleRight({
      battleId: battleId("battle-innate-sorcery-spell-projection"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "sorcerer", level: 1 }],
          resources: [innateSorceryResource()],
          spellcasting: {
            ...wizardSpellcasting({
              cantrips: [
                spellRecord("acid_splash"),
                spellRecord("ray_of_frost"),
              ],
              preparedSpells: [],
            }),
            sourceClassName: "sorcerer",
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const activated = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "sorcerer_innate_sorcery",
        },
        fills: [],
      }),
    ).state;

    expect(spellSaveDcForCaster(activated, fighterId)).toBe(14);

    const subject: BattleSubject = {
      tag: "actionSpell",
      actorId: fighterId,
      invocation: cantripSpellInvocationRef(
        "ray_of_frost",
        "spellAttackDamage",
      ),
      mode: { tag: "cast" },
    };
    const target = requireHole(
      resolveBattleSubject({ state: activated, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: activated,
        subject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );

    expect(attackRoll).toMatchObject({ rollMode: "advantage" });

    const mutualUnseenAttackRoll = requireHole(
      resolveBattleSubject({
        state: activated,
        subject,
        fills: [
          targetFill(target, goblinId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: goblinId,
              spellId: "ray_of_frost",
            },
            {
              kind: "attackAttackerCannotSeeTarget",
              attackerId: fighterId,
              targetId: goblinId,
            },
            {
              kind: "attackTargetCannotSeeAttacker",
              attackerId: fighterId,
              targetId: goblinId,
            },
          ]),
        ],
      }),
      "attackRoll",
    );

    expect(mutualUnseenAttackRoll).not.toHaveProperty("rollMode");
  });

  test("Innate Sorcery does not project onto non-Sorcerer spell sources and stops after expiration", () => {
    const state = startBattleRight({
      battleId: battleId("battle-innate-sorcery-spell-source-gate"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [
            { className: "sorcerer", level: 1 },
            { className: "wizard", level: 1 },
          ],
          resources: [innateSorceryResource()],
          spellcasting: {
            ...wizardSpellcasting({
              cantrips: [spellRecord("ray_of_frost")],
              preparedSpells: [],
            }),
            sourceClassName: "wizard",
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const activated = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "sorcerer_innate_sorcery",
        },
        fills: [],
      }),
    ).state;

    expect(spellSaveDcForCaster(activated, fighterId)).toBe(13);

    const subject: BattleSubject = {
      tag: "actionSpell",
      actorId: fighterId,
      invocation: cantripSpellInvocationRef(
        "ray_of_frost",
        "spellAttackDamage",
      ),
      mode: { tag: "cast" },
    };
    const target = requireHole(
      resolveBattleSubject({ state: activated, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: activated,
        subject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );

    expect(attackRoll).not.toHaveProperty("rollMode");

    let expired = activated;
    for (let round = 1; round <= 10; round += 1) {
      expired = requireResolved(
        endTurn({ state: expired, actorId: fighterId }),
      ).state;
      expired = requireResolved(
        endTurn({ state: expired, actorId: goblinId }),
      ).state;
    }
    expired = requireResolved(
      endTurn({ state: expired, actorId: fighterId }),
    ).state;

    expect(spellSaveDcForCaster(expired, fighterId)).toBe(13);
  });

  test("Rage early-end conditions remove the ongoing feature instead of hiding it", () => {
    const state = startBattleRight({
      battleId: battleId("battle-rage-early-end-removal"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 1 }],
          resources: [rageResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const rageSubject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      unitId: "barbarian_rage",
    };
    const raging = requireResolved(
      resolveBattleSubject({ state, subject: rageSubject, fills: [] }),
    );
    const barbarian = raging.state.combatants.get(fighterId);
    if (barbarian === undefined) {
      throw new Error("Expected barbarian combatant.");
    }
    const incapacitated = {
      ...raging.state,
      combatants: new Map(raging.state.combatants).set(
        fighterId,
        testBattleCreatureStateWithConditions(
          barbarian,
          applyCondition(barbarian.conditions, "incapacitated"),
        ),
      ),
    };
    const ended = requireResolved(
      endTurn({ state: incapacitated, actorId: fighterId }),
    );
    expect(
      ended.state.combatants.get(fighterId)?.activeOngoingFeatureOccurrences
        .size,
    ).toBe(0);
  });

  test("Reckless Attack ongoing feature grants reciprocal Advantage until the actor's next turn", () => {
    const state = startBattleRight({
      battleId: battleId("battle-reckless-ongoing-feature"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 2 }],
          unitFeatures: [recklessAttackFeature()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(discoverBattleActs(state).map((act) => act.subject)).not.toEqual(
      expect.arrayContaining([
        {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "barbarian_reckless_attack",
        },
      ]),
    );

    const attackSubject = fighterAttackSubject();
    const target = attackInitialTargetHole(state, attackSubject);
    const roll = attackRollHoleAfterTarget(state, target, attackSubject);
    expect(roll).toMatchObject({
      ongoingFeatureActivations: [
        expect.objectContaining({
          unitId: "barbarian_reckless_attack",
          rollMode: "advantage",
        }),
      ],
    });
    const reckless = resolveBattleSubject({
      state,
      subject: attackSubject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          rollMode: "advantage",
          activatedOngoingFeatureUnitId: "barbarian_reckless_attack",
        }),
      ],
    });
    if (reckless.tag !== "needsHoles") {
      throw new Error("Expected Reckless attack to reach damage roll.");
    }
    expect([
      ...reckless.state.combatants.get(fighterId)!
        .activeOngoingFeatureOccurrences,
    ]).toEqual(
      expect.arrayContaining([
        [
          "barbarian_reckless_attack",
          expect.objectContaining({ kind: "turnBoundary" }),
        ],
      ]),
    );
    const damage = findHole(reckless.holes, "rolledDice");
    expect(
      resolveBattleSubject({
        state: reckless.state,
        subject: attackSubject,
        fills: [
          attackTargetFill(
            target,
            attackSubject.actorId,
            goblinId,
            attackSubject.attackName,
          ),
          attackRollFill(roll, {
            total: 15,
            naturalD20: 10,
            rollMode: "advantage",
            activatedOngoingFeatureUnitId: "barbarian_reckless_attack",
          }),
          damageRollFill(damage, 4),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });

    const goblinTurn = requireResolved(
      endTurn({ state: reckless.state, actorId: fighterId }),
    ).state;
    const scimitar = goblinAttackSubject("Scimitar");
    const barbarianTarget = attackInitialTargetHole(goblinTurn, scimitar);
    const incomingRoll = attackRollHoleAfterTarget(
      goblinTurn,
      barbarianTarget,
      scimitar,
      fighterId,
    );
    expect(incomingRoll).toMatchObject({ rollMode: "advantage" });

    const barbarianTurn = requireResolved(
      endTurn({ state: goblinTurn, actorId: goblinId }),
    ).state;
    expect(
      barbarianTurn.combatants.get(fighterId)?.activeOngoingFeatureOccurrences,
    ).toEqual(new Map());
  });

  test("Frenzy applies mandatory Rage Damage dice to the first Reckless Strength hit", () => {
    const frenzyUnit = unitLibrary.requireUnit("barbarian_frenzy");
    const state = startBattleRight({
      battleId: battleId("battle-barbarian-frenzy"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 3 }],
          resources: [rageResource()],
          unitFeatures: [{ unit: frenzyUnit }, recklessAttackFeature()],
          characterUnitRefs: [supportedBattleUnitRef(frenzyUnit)],
          unarmedStrike: testUnarmedStrikeDamageAttack(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const rageSubject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      unitId: "barbarian_rage",
    };
    const raging = requireResolved(
      resolveBattleSubject({ state, subject: rageSubject, fills: [] }),
    ).state;

    const attackSubject = fighterAttackSubject("Unarmed Strike");
    const target = attackInitialTargetHole(raging, attackSubject);
    const roll = attackRollHoleAfterTarget(raging, target, attackSubject);
    const afterRecklessRoll = resolveBattleSubject({
      state: raging,
      subject: attackSubject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          rollMode: "advantage",
          activatedOngoingFeatureUnitId: "barbarian_reckless_attack",
        }),
      ],
    });
    if (afterRecklessRoll.tag !== "needsHoles") {
      throw new Error("Expected Frenzy attack to reach damage roll.");
    }
    const damage = findHole(afterRecklessRoll.holes, "rolledDice");
    expect(damage).toMatchObject({
      attackDamageRiders: [
        {
          unitId: "barbarian_frenzy",
          optional: false,
          damage: { dice: 2, dieSize: 6, damageType: "bludgeoning" },
        },
      ],
    });
    const damageFill = damageRollFillWithGroups(damage, [[4, 4]]);
    const disposition = attackDamageDispositionHoleAfterFills(
      afterRecklessRoll.state,
      attackSubject,
      [
        targetFill(target, goblinId),
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          rollMode: "advantage",
          activatedOngoingFeatureUnitId: "barbarian_reckless_attack",
        }),
        damageFill,
      ],
    );

    const hit = requireResolved(
      resolveBattleSubject({
        state: afterRecklessRoll.state,
        subject: attackSubject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, {
            total: 15,
            naturalD20: 10,
            rollMode: "advantage",
            activatedOngoingFeatureUnitId: "barbarian_reckless_attack",
          }),
          damageFill,
          attackDamageDispositionFill(disposition, { kind: "ordinaryDamage" }),
        ],
      }),
    );
    expect(
      hit.state.currentTurnResources.attackDamageRidersUsedThisTurn,
    ).toEqual([{ attackerId: fighterId, unitId: "barbarian_frenzy" }]);
  });

  test("Frenzy does not apply when Reckless Attack was used before Rage was active", () => {
    const frenzyUnit = unitLibrary.requireUnit("barbarian_frenzy");
    const extraAttackUnit = unitLibrary.requireUnit("fighter_extra_attack");
    const state = startBattleRight({
      battleId: battleId("battle-barbarian-frenzy-reckless-before-rage"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [
            { className: "barbarian", level: 3 },
            { className: "fighter", level: 5 },
          ],
          resources: [rageResource()],
          unitFeatures: [{ unit: frenzyUnit }, recklessAttackFeature()],
          characterUnitRefs: [
            supportedBattleUnitRef(frenzyUnit),
            supportedBattleUnitRef(extraAttackUnit),
          ],
          unarmedStrike: testUnarmedStrikeDieAttack(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    const attackSubject = fighterAttackSubject("Unarmed Strike");
    const firstTarget = attackInitialTargetHole(state, attackSubject);
    const firstRoll = attackRollHoleAfterTarget(
      state,
      firstTarget,
      attackSubject,
    );
    const afterRecklessMiss = requireResolved(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(firstTarget, goblinId),
          attackRollFill(firstRoll, {
            total: 1,
            naturalD20: 1,
            rollMode: "advantage",
            activatedOngoingFeatureUnitId: "barbarian_reckless_attack",
          }),
        ],
      }),
    ).state;
    expect(
      afterRecklessMiss.currentTurnResources
        .recklessAttackWhileRagingUsedThisTurn,
    ).toEqual([]);

    const rageSubject: BattleSubject = {
      tag: "unitFeature",
      actorId: fighterId,
      unitId: "barbarian_rage",
    };
    const ragingAfterRecklessMiss = requireResolved(
      resolveBattleSubject({
        state: afterRecklessMiss,
        subject: rageSubject,
        fills: [],
      }),
    ).state;

    const secondTarget = attackInitialTargetHole(
      ragingAfterRecklessMiss,
      attackSubject,
    );
    const secondRoll = attackRollHoleAfterTarget(
      ragingAfterRecklessMiss,
      secondTarget,
      attackSubject,
    );
    const afterSecondHit = resolveBattleSubject({
      state: ragingAfterRecklessMiss,
      subject: attackSubject,
      fills: [
        targetFill(secondTarget, goblinId),
        attackRollFill(secondRoll, {
          total: 15,
          naturalD20: 10,
          rollMode: "advantage",
        }),
      ],
    });
    if (afterSecondHit.tag !== "needsHoles") {
      throw new Error("Expected second Reckless hit to reach damage roll.");
    }
    const damage = findHole(afterSecondHit.holes, "rolledDice");
    expect(damage).not.toMatchObject({
      attackDamageRiders: [
        expect.objectContaining({ unitId: "barbarian_frenzy" }),
      ],
    });
  });

  test("Reckless Attack cannot be declared before the first attack roll", () => {
    const state = startBattleRight({
      battleId: battleId("battle-reckless-not-predeclared"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 2 }],
          unitFeatures: [recklessAttackFeature()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    expect(
      resolveBattleSubject({
        state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "barbarian_reckless_attack",
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("Reckless Attack activation preserves straight rolls when modifiers already cancel", () => {
    const state = startBattleRight({
      battleId: battleId("battle-reckless-cancelled-modifiers"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 2 }],
          unitFeatures: [recklessAttackFeature()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const fighter = state.combatants.get(fighterId);
    const goblin = state.combatants.get(goblinId);
    if (fighter === undefined || goblin === undefined) {
      throw new Error("Expected combatants.");
    }
    const contestedState: BattleState = {
      ...state,
      combatants: new Map(state.combatants)
        .set(fighterId, {
          ...fighter,
          hidden: { discoveryDc: difficultyClass(16) },
        })
        .set(goblinId, {
          ...goblin,
          hidden: { discoveryDc: difficultyClass(16) },
        }),
    };
    const attackSubject = fighterAttackSubject();
    const target = attackInitialTargetHole(contestedState, attackSubject);
    const roll = attackRollHoleAfterTarget(
      contestedState,
      target,
      attackSubject,
    );
    if (roll.kind !== "attackRoll") {
      throw new Error("Expected attack-roll hole.");
    }
    expect(roll.rollMode).toBeUndefined();
    const reckless = resolveBattleSubject({
      state: contestedState,
      subject: attackSubject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          activatedOngoingFeatureUnitId: "barbarian_reckless_attack",
        }),
      ],
    });
    if (reckless.tag !== "needsHoles") {
      throw new Error("Expected Reckless attack to reach damage roll.");
    }
    const damage = findHole(reckless.holes, "rolledDice");
    expect(
      resolveBattleSubject({
        state: reckless.state,
        subject: attackSubject,
        fills: [
          attackTargetFill(
            target,
            attackSubject.actorId,
            goblinId,
            attackSubject.attackName,
          ),
          attackRollFill(roll, {
            total: 15,
            naturalD20: 10,
            activatedOngoingFeatureUnitId: "barbarian_reckless_attack",
          }),
          damageRollFill(damage, 4),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });
  });

  test("Reckless Attack replay stays valid after an attack-hit Reaction window", () => {
    const baseState = startBattleRight({
      battleId: battleId("battle-reckless-reaction-replay"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 2 }],
          unitFeatures: [recklessAttackFeature()],
        }),
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 10,
          attack: null,
        }),
        statBlockCreatureInit({ initiative: 5 }),
      ],
    });
    const state = {
      ...baseState,
      readiedMovements: new Map([
        [
          wizardId,
          {
            trigger: "attackHit" as const,
            expiresAt: { kind: "startOfTurn" as const, combatantId: wizardId },
          },
        ],
      ]),
    } satisfies BattleState;
    const attackSubject = fighterAttackSubject();
    const target = attackInitialTargetHole(state, attackSubject);
    const roll = attackRollHoleAfterTarget(state, target, attackSubject);
    const awaitingReaction = resolveBattleSubject({
      state,
      subject: attackSubject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          rollMode: "advantage",
          activatedOngoingFeatureUnitId: "barbarian_reckless_attack",
        }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected attack-hit Reaction window.");
    }

    const decision = findHole(awaitingReaction.holes, "reactionDecision");
    const resumed = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(decision, {
        kind: "decline",
        reactorId: wizardId,
      }),
    });

    expect(resumed).toMatchObject({ tag: "needsHoles" });
    if (resumed.tag !== "needsHoles") {
      throw new Error("Expected resumed Reckless attack to need damage.");
    }
    expect(findHole(resumed.holes, "rolledDice")).toBeDefined();
  });
});
