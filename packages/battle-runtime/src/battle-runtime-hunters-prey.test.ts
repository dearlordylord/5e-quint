// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.hunters-prey
import { describe, expect, test } from "vitest";
import { movementFeet } from "@dnd/shared/types";
import {
  ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE,
} from "./unit-feature-support.ts";
import {
  attackDamageHoleAfterHit,
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  attackTargetFill,
  attackTargetSpatialFact,
  battleId,
  characterSeed,
  damageRollFillWithGroups,
  discoverBattleActs,
  endTurn,
  fighterAttackSubject,
  fighterId,
  findHole,
  goblinId,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  skeletonId,
  sneakAttackFeature,
  sneakAttackUnitRefs,
  spellRecord,
  startBattleRight,
  statBlockCreatureInit,
  testDaggerAttack,
  targetFill,
  testLongswordAttack,
  unitFeatureDecisionFill,
  unitLibrary,
  wizardId,
  wizardSpellcasting,
} from "./battle-runtime-test-support.ts";
import type { BattleState, BattleUnitRef } from "./index.ts";

const syntheticExtraAttackUnitId = "test_hunters_prey_extra_attack";

function huntersPreyUnitRef(
  optionId?: "colossusSlayer" | "hordeBreaker",
): BattleUnitRef {
  const unit = unitLibrary.requireUnit("ranger_hunters_prey");
  return {
    unitId: unit.id,
    supportProfiles: [
      {
        kind: "huntersPrey",
        huntersPrey: {
          choice: { kind: "chooseOne", replaceOn: "shortOrLongRest" },
          options: [
            {
              id: "colossusSlayer",
              trigger: "hitCreatureWithWeapon",
              targetPredicate: "missingAnyHitPoints",
              usageLimit: "oncePerTurn",
              damage: {
                kind: "addAttackDamageDice",
                dice: { dice: 1, dieSize: 8 },
                damageType: "sameAsAttack",
              },
            },
            {
              id: "hordeBreaker",
              trigger: "makeWeaponAttack",
              usageLimit: "oncePerTurn",
              extraAttack: {
                weapon: "sameWeapon",
                target: {
                  kind: "differentCreatureNearOriginalTarget",
                  withinFeetOfOriginalTarget: movementFeet(5),
                  withinWeaponRange: true,
                  notAttackedThisTurn: true,
                },
              },
            },
          ],
        },
      },
    ],
    ...(optionId === undefined
      ? {}
      : { selectedOption: { kind: "huntersPrey", optionId } }),
  };
}

function extraAttackUnitRef(): BattleUnitRef {
  return {
    unitId: syntheticExtraAttackUnitId,
    supportProfiles: [
      {
        kind: ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE,
        additionalAttacks: 1,
      },
    ],
  };
}

function resolveHordeBreakerUse(
  state: BattleState,
  subject: ReturnType<typeof fighterAttackSubject>,
): BattleState {
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
    attackTargetFill(primaryTarget, fighterId, goblinId, "Longsword"),
    attackRollFill(primaryRoll, { total: 15, naturalD20: 10 }),
    damageRollFillWithGroups(primaryDamage, [[1]]),
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
  const secondTargetFill = targetFill(target, skeletonId, [
    attackTargetSpatialFact(fighterId, skeletonId, "Longsword"),
    {
      kind: "hordeBreakerSecondTargetEligible",
      attackerId: fighterId,
      unitId: "ranger_hunters_prey",
      originalTargetId: goblinId,
      secondTargetId: skeletonId,
    },
  ]);
  const hordeRoll = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        ...primaryFills,
        unitFeatureDecisionFill(decision, "use"),
        secondTargetFill,
      ],
    }),
    "attackRoll",
  );
  const hordeDamage = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        ...primaryFills,
        unitFeatureDecisionFill(decision, "use"),
        secondTargetFill,
        attackRollFill(hordeRoll, { total: 15, naturalD20: 10 }),
      ],
    }),
    "rolledDice",
  );
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        ...primaryFills,
        unitFeatureDecisionFill(decision, "use"),
        secondTargetFill,
        attackRollFill(hordeRoll, { total: 15, naturalD20: 10 }),
        damageRollFillWithGroups(hordeDamage, [[1]]),
      ],
    }),
  ).state;
}

describe("battle runtime: Hunter's Prey", () => {
  test("Colossus Slayer can be skipped on one wounded hit and used on a later hit that turn", () => {
    const state = startBattleRight({
      battleId: battleId("battle-hunters-prey-colossus-slayer"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: [
            huntersPreyUnitRef("colossusSlayer"),
            extraAttackUnitRef(),
          ],
          attack: testLongswordAttack(),
        }),
        statBlockCreatureInit({ initiative: 10, currentHp: 6 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Second Target",
          initiative: 9,
          currentHp: 6,
        }),
      ],
    });
    const subject = fighterAttackSubject("Longsword");
    const target = attackInitialTargetHole(state, subject);
    const roll = attackRollHoleAfterTarget(state, target, subject, goblinId);
    const damage = attackDamageHoleAfterHit(
      state,
      target,
      roll,
      { total: 15, naturalD20: 10 },
      subject,
      goblinId,
    );

    expect(damage).toMatchObject({
      attackDamageRiders: [
        {
          attackerId: fighterId,
          unitId: "ranger_hunters_prey",
          label: "Colossus Slayer",
          optional: true,
          damage: { dice: 1, dieSize: 8, damageType: "slashing" },
        },
      ],
    });

    const skipped = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 15, naturalD20: 10 }),
          damageRollFillWithGroups(damage, [[1]], []),
        ],
      }),
    );
    expect(skipped.state.combatants.get(goblinId)?.hp).toBe(2);
    expect(
      skipped.state.currentTurnResources.attackDamageRidersUsedThisTurn,
    ).toEqual([]);

    const secondTarget = attackInitialTargetHole(skipped.state, subject);
    const secondRoll = attackRollHoleAfterTarget(
      skipped.state,
      secondTarget,
      subject,
      skeletonId,
    );
    const secondDamage = attackDamageHoleAfterHit(
      skipped.state,
      secondTarget,
      secondRoll,
      { total: 15, naturalD20: 10 },
      subject,
      skeletonId,
    );

    const result = resolveBattleSubject({
      state: skipped.state,
      subject,
      fills: [
        targetFill(secondTarget, skeletonId),
        attackRollFill(secondRoll, { total: 15, naturalD20: 10 }),
        damageRollFillWithGroups(secondDamage, [[1], [1]], [
          "ranger_hunters_prey",
        ]),
      ],
    });

    const resolved = requireResolved(result);
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(1);
    expect(
      resolved.state.currentTurnResources.attackDamageRidersUsedThisTurn,
    ).toEqual([{ attackerId: fighterId, unitId: "ranger_hunters_prey" }]);
  });

  test("Hunter's Prey rejects weapon attacks when the retained selected option is missing", () => {
    const state = startBattleRight({
      battleId: battleId("battle-hunters-prey-missing-selection"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: [huntersPreyUnitRef()],
          attack: testLongswordAttack(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = fighterAttackSubject("Longsword");
    const target = attackInitialTargetHole(state, subject);

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, goblinId)],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Hunter's Prey requires a retained selected option before resolving weapon attacks.",
    });
  });

  test("Horde Breaker grants a same-weapon attack against a caller-eligible different target once per turn", () => {
    const state = startBattleRight({
      battleId: battleId("battle-hunters-prey-horde-breaker"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: [huntersPreyUnitRef("hordeBreaker")],
          attack: testLongswordAttack(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Second Target",
          initiative: 9,
        }),
      ],
    });
    const subject = fighterAttackSubject("Longsword");
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
      attackTargetFill(primaryTarget, fighterId, goblinId, "Longsword"),
      attackRollFill(primaryRoll, { total: 15, naturalD20: 10 }),
      damageRollFillWithGroups(primaryDamage, [[1]]),
    ];
    const decision = requireHole(
      resolveBattleSubject({ state, subject, fills: primaryFills }),
      "unitFeatureDecision",
    );
    expect(decision).toMatchObject({
      label: "Use Horde Breaker",
      unitFeature: { unitId: "ranger_hunters_prey", label: "Horde Breaker" },
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
    const secondTargetFill = targetFill(target, skeletonId, [
      attackTargetSpatialFact(fighterId, skeletonId, "Longsword"),
      {
        kind: "hordeBreakerSecondTargetEligible",
        attackerId: fighterId,
        unitId: "ranger_hunters_prey",
        originalTargetId: goblinId,
        secondTargetId: skeletonId,
      },
    ]);
    const hordeRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          secondTargetFill,
        ],
      }),
      "attackRoll",
    );
    const hordeDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          secondTargetFill,
          attackRollFill(hordeRoll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        ...primaryFills,
        unitFeatureDecisionFill(decision, "use"),
        secondTargetFill,
        attackRollFill(hordeRoll, { total: 15, naturalD20: 10 }),
        damageRollFillWithGroups(hordeDamage, [[1]]),
      ],
    });

    const resolved = requireResolved(result);
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(6);
    expect(
      resolved.state.currentTurnResources.huntersPreyHordeBreakerUsedThisTurn,
    ).toEqual([{ attackerId: fighterId, unitId: "ranger_hunters_prey" }]);
  });

  test("Horde Breaker resets on the Ranger's next turn", () => {
    const state = startBattleRight({
      battleId: battleId("battle-hunters-prey-horde-breaker-next-turn"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: [huntersPreyUnitRef("hordeBreaker")],
          attack: testLongswordAttack(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Second Target",
          initiative: 9,
        }),
      ],
    });
    const subject = fighterAttackSubject("Longsword");
    const firstUse = resolveHordeBreakerUse(state, subject);
    expect(
      firstUse.currentTurnResources.huntersPreyHordeBreakerUsedThisTurn,
    ).toEqual([{ attackerId: fighterId, unitId: "ranger_hunters_prey" }]);

    const goblinTurn = requireResolved(
      endTurn({ state: firstUse, actorId: fighterId }),
    ).state;
    const skeletonTurn = requireResolved(
      endTurn({ state: goblinTurn, actorId: goblinId }),
    ).state;
    const nextRangerTurn = requireResolved(
      endTurn({ state: skeletonTurn, actorId: skeletonId }),
    ).state;

    expect(
      nextRangerTurn.currentTurnResources
        .huntersPreyHordeBreakerUsedThisTurn,
    ).toEqual([]);
    const secondUse = resolveHordeBreakerUse(nextRangerTurn, subject);
    expect(
      secondUse.currentTurnResources.huntersPreyHordeBreakerUsedThisTurn,
    ).toEqual([{ attackerId: fighterId, unitId: "ranger_hunters_prey" }]);
  });

  test("Horde Breaker can be used after the original weapon attack misses", () => {
    const state = startBattleRight({
      battleId: battleId("battle-hunters-prey-horde-breaker-after-miss"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: [huntersPreyUnitRef("hordeBreaker")],
          attack: testLongswordAttack(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Second Target",
          initiative: 9,
        }),
      ],
    });
    const subject = fighterAttackSubject("Longsword");
    const primaryTarget = attackInitialTargetHole(state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      state,
      primaryTarget,
      subject,
      goblinId,
    );
    const primaryFills = [
      attackTargetFill(primaryTarget, fighterId, goblinId, "Longsword"),
      attackRollFill(primaryRoll, { total: 5, naturalD20: 2 }),
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
    const secondTargetFill = targetFill(target, skeletonId, [
      attackTargetSpatialFact(fighterId, skeletonId, "Longsword"),
      {
        kind: "hordeBreakerSecondTargetEligible",
        attackerId: fighterId,
        unitId: "ranger_hunters_prey",
        originalTargetId: goblinId,
        secondTargetId: skeletonId,
      },
    ]);
    const hordeRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          secondTargetFill,
        ],
      }),
      "attackRoll",
    );
    const hordeDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          secondTargetFill,
          attackRollFill(hordeRoll, { total: 15, naturalD20: 10 }),
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
          secondTargetFill,
          attackRollFill(hordeRoll, { total: 15, naturalD20: 10 }),
          damageRollFillWithGroups(hordeDamage, [[1]]),
        ],
      }),
    );

    expect(resolved.state.combatants.get(goblinId)?.hp).toBe(10);
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(6);
    expect(
      resolved.state.currentTurnResources.huntersPreyHordeBreakerUsedThisTurn,
    ).toEqual([{ attackerId: fighterId, unitId: "ranger_hunters_prey" }]);
  });

  test("Horde Breaker target choices include a different non-enemy creature", () => {
    const state = startBattleRight({
      battleId: battleId("battle-hunters-prey-horde-breaker-friendly-target"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: [huntersPreyUnitRef("hordeBreaker")],
          attack: testLongswordAttack(),
        }),
        characterSeed({
          combatantId: wizardId,
          displayName: "Nearby Friend",
          initiative: 15,
          attack: null,
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = fighterAttackSubject("Longsword");
    const primaryTarget = attackInitialTargetHole(state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      state,
      primaryTarget,
      subject,
      goblinId,
    );
    const primaryFills = [
      attackTargetFill(primaryTarget, fighterId, goblinId, "Longsword"),
      attackRollFill(primaryRoll, { total: 5, naturalD20: 2 }),
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

    expect(target).toMatchObject({
      choices: expect.arrayContaining([wizardId]),
    });
  });

  test("Horde Breaker same-weapon damage includes attack damage riders on the second target", () => {
    const allyId = wizardId;
    const state = startBattleRight({
      battleId: battleId("battle-hunters-prey-horde-breaker-attack-rider"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "rogue", level: 1 }],
          unitFeatures: [sneakAttackFeature()],
          characterUnitRefs: [
            huntersPreyUnitRef("hordeBreaker"),
            ...sneakAttackUnitRefs(),
          ],
          attack: testDaggerAttack(),
        }),
        characterSeed({
          combatantId: allyId,
          displayName: "Nearby Ally",
          initiative: 15,
          attack: null,
        }),
        statBlockCreatureInit({ initiative: 10 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Second Target",
          initiative: 9,
        }),
      ],
    });
    const subject = fighterAttackSubject("Dagger");
    const primaryTarget = attackInitialTargetHole(state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      state,
      primaryTarget,
      subject,
      goblinId,
    );
    const primaryFills = [
      attackTargetFill(primaryTarget, fighterId, goblinId, "Dagger"),
      attackRollFill(primaryRoll, { total: 5, naturalD20: 2 }),
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
    const secondTargetFill = targetFill(target, skeletonId, [
      attackTargetSpatialFact(fighterId, skeletonId, "Dagger"),
      {
        kind: "hordeBreakerSecondTargetEligible",
        attackerId: fighterId,
        unitId: "ranger_hunters_prey",
        originalTargetId: goblinId,
        secondTargetId: skeletonId,
      },
      {
        kind: "sneakAttackAllyWithin5FeetOfTarget",
        attackerId: fighterId,
        targetId: skeletonId,
        allyId,
      },
    ]);
    const hordeRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          secondTargetFill,
        ],
      }),
      "attackRoll",
    );
    const hordeDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          secondTargetFill,
          attackRollFill(hordeRoll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    expect(hordeDamage).toMatchObject({
      attackDamageRiders: [
        {
          attackerId: fighterId,
          unitId: "rogue_sneak_attack",
          label: "Sneak Attack",
          optional: true,
        },
      ],
    });

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          secondTargetFill,
          attackRollFill(hordeRoll, { total: 15, naturalD20: 10 }),
          damageRollFillWithGroups(hordeDamage, [[1], [1]], [
            "rogue_sneak_attack",
          ]),
        ],
      }),
    );

    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(5);
    expect(
      resolved.state.currentTurnResources.attackDamageRidersUsedThisTurn,
    ).toEqual([{ attackerId: fighterId, unitId: "rogue_sneak_attack" }]);
  });

  test("Horde Breaker rejects invalid second-target fills after the original weapon attack misses", () => {
    const state = startBattleRight({
      battleId: battleId("battle-hunters-prey-horde-breaker-miss-same-target"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: [huntersPreyUnitRef("hordeBreaker")],
          attack: testLongswordAttack(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Second Target",
          initiative: 9,
        }),
      ],
    });
    const subject = fighterAttackSubject("Longsword");
    const primaryTarget = attackInitialTargetHole(state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      state,
      primaryTarget,
      subject,
      goblinId,
    );
    const primaryFills = [
      attackTargetFill(primaryTarget, fighterId, goblinId, "Longsword"),
      attackRollFill(primaryRoll, { total: 5, naturalD20: 2 }),
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

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          targetFill(target, goblinId, [
            attackTargetSpatialFact(fighterId, goblinId, "Longsword"),
            {
              kind: "hordeBreakerSecondTargetEligible",
              attackerId: fighterId,
              unitId: "ranger_hunters_prey",
              originalTargetId: goblinId,
              secondTargetId: goblinId,
            },
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Hunter's Prey Horde Breaker second target must be different, within 5 feet of the original target, within weapon range, and not already attacked this turn.",
    });
  });

  test("Horde Breaker same-weapon damage includes marked damage riders on the second target", () => {
    const state = startBattleRight({
      battleId: battleId("battle-hunters-prey-horde-breaker-marked-target"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: [huntersPreyUnitRef("hordeBreaker")],
          spellcasting: {
            ...wizardSpellcasting({
              preparedSpells: [spellRecord("hunters_mark")],
            }),
            sourceClassName: "ranger",
          },
          attack: testLongswordAttack(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Marked Target",
          initiative: 9,
        }),
      ],
    });
    const markAct = discoverBattleActs(state).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.spellId === "hunters_mark",
    );
    if (markAct === undefined) {
      throw new Error("Expected Hunter's Mark Bonus Action spell act.");
    }
    const markTarget = findHole(markAct.initialHoles, "targetChoice");
    const marked = requireResolved(
      resolveBattleSubject({
        state,
        subject: markAct.subject,
        fills: [
          targetFill(markTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: skeletonId,
              spellId: "hunters_mark",
            },
          ]),
        ],
      }),
    );

    const subject = fighterAttackSubject("Longsword");
    const primaryTarget = attackInitialTargetHole(marked.state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      marked.state,
      primaryTarget,
      subject,
      goblinId,
    );
    const primaryFills = [
      attackTargetFill(primaryTarget, fighterId, goblinId, "Longsword"),
      attackRollFill(primaryRoll, { total: 5, naturalD20: 2 }),
    ];
    const decision = requireHole(
      resolveBattleSubject({ state: marked.state, subject, fills: primaryFills }),
      "unitFeatureDecision",
    );
    const target = requireHole(
      resolveBattleSubject({
        state: marked.state,
        subject,
        fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
      }),
      "targetChoice",
    );
    const secondTargetFill = targetFill(target, skeletonId, [
      attackTargetSpatialFact(fighterId, skeletonId, "Longsword"),
      {
        kind: "hordeBreakerSecondTargetEligible",
        attackerId: fighterId,
        unitId: "ranger_hunters_prey",
        originalTargetId: goblinId,
        secondTargetId: skeletonId,
      },
    ]);
    const hordeRoll = requireHole(
      resolveBattleSubject({
        state: marked.state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          secondTargetFill,
        ],
      }),
      "attackRoll",
    );
    const hordeDamage = requireHole(
      resolveBattleSubject({
        state: marked.state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          secondTargetFill,
          attackRollFill(hordeRoll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    expect(hordeDamage).toMatchObject({
      spellMarkedDamageRiders: [
        expect.objectContaining({ targetCombatantId: skeletonId }),
      ],
    });

    const resolved = requireResolved(
      resolveBattleSubject({
        state: marked.state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          secondTargetFill,
          attackRollFill(hordeRoll, { total: 15, naturalD20: 10 }),
          damageRollFillWithGroups(hordeDamage, [[1], [1]]),
        ],
      }),
    );
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(5);
  });
});
