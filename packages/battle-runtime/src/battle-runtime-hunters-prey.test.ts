import { battleActSpellPresentation } from "./battle-act-composition.ts";
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.hunters-prey
import { describe, expect, test } from "vitest";
import { attackBonus, classLevel, Hp, movementFeet } from "@dnd/shared/types";
import {
  ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE,
  battleUnitRefWithSupportProfiles,
} from "./unit-feature-support.ts";
import {
  attackDamageDispositionFill,
  attackDamageHoleAfterHit,
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  attackTargetFill,
  attackExecutionSelectionForSubjectForTest,
  attackTargetSpatialFact,
  battleAbilityModifier,
  battleId,
  battleProcedureExecutionRefForSpellHoleForTest,
  characterBattleFeatureInitForTest,
  characterSeed,
  damageRollFillWithGroups,
  discoverBattleActs,
  endTurn,
  Either,
  fighterAttackSubject,
  fighterId,
  findHole,
  goblinId,
  interruptDecisionFill,
  requireHole,
  requireCharacterUnitProcedureRefForTest,
  rageResource,
  requireResolved,
  reactionModifierUnitRef,
  resolveBattleSubject,
  resolveBattleInterrupt,
  skeletonId,
  sneakAttackFeature,
  sneakAttackUnitRefs,
  spellRecord,
  startBattleRight,
  startBattleSessionRight,
  statBlockCreatureInit,
  recklessAttackFeature,
  supportedBattleUnitRef,
  testCharacterD20Statistics,
  testDaggerAttack,
  targetFill,
  testLongswordAttack,
  unitFeatureDecisionFill,
  unitLibrary,
  uncannyDodgeUnit,
  wizardId,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import { huntersPreyUnsupportedDamageDieUnit } from "./unit-profile-admission-catalog.test-support.ts";
import { attackActionOptionForSubject } from "./battle-reducer/attack-damage-apply.ts";
import { resolveHuntersPreyHordeBreakerContinuation } from "./battle-reducer/attack-main.ts";
import type {
  BattleRuntimeSession,
  BattleState,
  BattleUnitRef,
} from "./index.ts";

function huntersPreyUnitRef(
  optionId: "colossusSlayer" | "hordeBreaker",
): BattleUnitRef {
  const unit = unitLibrary.requireUnit("ranger_hunters_prey");
  const huntersPrey =
    optionId === "colossusSlayer"
      ? {
          kind: "woundedTargetWeaponDamage" as const,
          trigger: "hitCreatureWithWeapon" as const,
          targetPredicate: "missingAnyHitPoints" as const,
          usageLimit: "oncePerTurn" as const,
          damage: {
            kind: "addAttackDamageDice" as const,
            dice: { dice: 1 as const, dieSize: 8 as const },
            damageType: "sameAsAttack" as const,
          },
        }
      : {
          kind: "nearbyDifferentTargetSameWeaponAttack" as const,
          trigger: "makeWeaponAttack" as const,
          usageLimit: "oncePerTurn" as const,
          extraAttack: {
            weapon: "sameWeapon" as const,
            target: {
              kind: "differentCreatureNearOriginalTarget" as const,
              withinFeetOfOriginalTarget: movementFeet(5),
              withinWeaponRange: true as const,
              notAttackedThisTurn: true as const,
            },
          },
        };
  return {
    unit: unitLibrary.requireUnit(unit.id),
    supportProfiles: [
      {
        kind: "huntersPrey",
        huntersPrey,
      },
    ],
  };
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
  sourceProcedureRef: ReturnType<
    typeof requireCharacterUnitProcedureRefForTest
  >,
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

function huntersPreyProcedureRef(session: BattleRuntimeSession) {
  return requireCharacterUnitProcedureRefForTest(
    session,
    fighterId,
    "ranger_hunters_prey",
  );
}

function extraAttackUnitRef(): BattleUnitRef {
  return {
    unit: unitLibrary.requireUnit("fighter_extra_attack"),
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
    attackTargetFill(
      primaryTarget,
      fighterId,
      goblinId,
      attackExecutionSelectionForSubjectForTest(subject),
    ),
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
    attackTargetSpatialFact(
      fighterId,
      skeletonId,
      attackExecutionSelectionForSubjectForTest(subject),
    ),
    {
      kind: "hordeBreakerSecondTargetEligible",
      attackerId: fighterId,
      sourceProcedureRef:
        battleProcedureExecutionRefForSpellHoleForTest(target),
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

type HordeBreakerAfterPrimaryMissFixtureInput = {
  readonly battleId: ReturnType<typeof battleId>;
  readonly secondTargetHp: Hp;
};

function hordeBreakerAfterPrimaryMissFixture(
  input: HordeBreakerAfterPrimaryMissFixtureInput,
): {
  readonly session: BattleRuntimeSession;
  readonly state: BattleState;
  readonly subject: ReturnType<typeof fighterAttackSubject>;
  readonly primaryFills: readonly [
    ReturnType<typeof attackTargetFill>,
    ReturnType<typeof attackRollFill>,
  ];
  readonly decision: Extract<
    ReturnType<typeof requireHole>,
    { readonly kind: "unitFeatureDecision" }
  >;
} {
  const halflingLuckUnit = unitLibrary.requireUnit("species_halfling_luck");
  const session = startBattleSessionRight({
    battleId: input.battleId,
    combatants: [
      characterSeed({
        initiative: 20,
        characterUnitRefs: [
          huntersPreyUnitRef("hordeBreaker"),
          supportedBattleUnitRef(halflingLuckUnit),
        ],
        unitFeatures: [characterBattleFeatureInitForTest(halflingLuckUnit)],
        attack: testLongswordAttack(),
      }),
      statBlockCreatureInit({ initiative: 10 }),
      statBlockCreatureInit({
        combatantId: skeletonId,
        displayName: "Second Target",
        initiative: 9,
        currentHp: input.secondTargetHp,
      }),
    ],
  });
  const state = session.state;
  const subject = fighterAttackSubject(state, "Longsword");
  const primaryTarget = attackInitialTargetHole(state, subject);
  const primaryRoll = attackRollHoleAfterTarget(
    state,
    primaryTarget,
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
    attackRollFill(primaryRoll, { total: 7, naturalD20: 2 }),
  ] as const;
  const decision = requireHole(
    resolveBattleSubject({ state, subject, fills: primaryFills }),
    "unitFeatureDecision",
  );
  return { session, state, subject, primaryFills, decision };
}

function hordeBreakerFollowupAttackFixture(
  input: HordeBreakerAfterPrimaryMissFixtureInput,
): ReturnType<typeof hordeBreakerAfterPrimaryMissFixture> & {
  readonly secondTargetFill: ReturnType<typeof targetFill>;
  readonly hordeRoll: Extract<
    ReturnType<typeof requireHole>,
    { readonly kind: "attackRoll" }
  >;
} {
  const fixture = hordeBreakerAfterPrimaryMissFixture(input);
  const { state, subject, primaryFills, decision } = fixture;
  const target = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
    }),
    "targetChoice",
  );
  const secondTargetFill = targetFill(target, skeletonId, [
    attackTargetSpatialFact(
      fighterId,
      skeletonId,
      attackExecutionSelectionForSubjectForTest(subject),
    ),
    {
      kind: "hordeBreakerSecondTargetEligible",
      attackerId: fighterId,
      sourceProcedureRef:
        battleProcedureExecutionRefForSpellHoleForTest(target),
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
  return { ...fixture, secondTargetFill, hordeRoll };
}

describe("battle runtime: Hunter's Prey", () => {
  test("Colossus Slayer can be skipped on one wounded hit and used on a later hit that turn", () => {
    const session = startBattleSessionRight({
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
    const state = session.state;
    const subject = fighterAttackSubject(state, "Longsword");
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
          procedureRef: huntersPreyProcedureRef(session),
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
        damageRollFillWithGroups(
          secondDamage,
          [[1], [1]],
          [
            requireCharacterUnitProcedureRefForTest(
              session,
              fighterId,
              "ranger_hunters_prey",
            ),
          ],
        ),
      ],
    });

    const resolved = requireResolved(result);
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(1);
    expect(
      resolved.state.currentTurnResources.attackDamageRidersUsedThisTurn,
    ).toEqual([
      { attackerId: fighterId, procedureRef: huntersPreyProcedureRef(session) },
    ]);
  });

  test("Hunter's Prey battle admission rejects a missing retained selection", () => {
    const unit = unitLibrary.requireUnit("ranger_hunters_prey");
    const admitted = battleUnitRefWithSupportProfiles({
      unitRef: { unitId: unit.id },
      unit,
    });

    expect(Either.isLeft(admitted)).toBe(true);
    if (Either.isRight(admitted)) return;
    expect(admitted.left.message).toBe(
      "Battle Unit ref ranger_hunters_prey requires a retained Hunter's Prey selection before battle initialization.",
    );
  });

  test("Hunter's Prey battle admission rejects malformed same-family mechanics before selection", () => {
    const malformedUnit = huntersPreyUnsupportedDamageDieUnit();
    const admitted = battleUnitRefWithSupportProfiles({
      unitRef: { unitId: malformedUnit.id },
      unit: malformedUnit,
    });

    expect(Either.isLeft(admitted)).toBe(true);
    if (Either.isRight(admitted)) return;
    expect(admitted.left.message).toBe(
      `Unsupported battle Hunter's Prey Unit hook: ${malformedUnit.id}.`,
    );
  });

  test("Horde Breaker grants a same-weapon attack against a caller-eligible different target once per turn", () => {
    const session = startBattleSessionRight({
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
    const state = session.state;
    const subject = fighterAttackSubject(state, "Longsword");
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
      damageRollFillWithGroups(primaryDamage, [[1]]),
    ];
    const decision = requireHole(
      resolveBattleSubject({ state, subject, fills: primaryFills }),
      "unitFeatureDecision",
    );
    expect(decision).toMatchObject({
      label: "Use Horde Breaker",
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
      declined.state.currentTurnResources.huntersPreyHordeBreakerUsedThisTurn,
    ).toEqual([]);

    const target = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
      }),
      "targetChoice",
    );
    const secondTargetFill = targetFill(target, skeletonId, [
      attackTargetSpatialFact(
        fighterId,
        skeletonId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      {
        kind: "hordeBreakerSecondTargetEligible",
        attackerId: fighterId,
        sourceProcedureRef:
          battleProcedureExecutionRefForSpellHoleForTest(target),
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
    ).toEqual([
      { attackerId: fighterId, procedureRef: huntersPreyProcedureRef(session) },
    ]);
  });

  test("Horde Breaker carries a zero-hit-point relationship decision into Dark One's Blessing", () => {
    const { unit: blessingUnit, unitRef: blessingUnitRef } =
      selectedDarkOnesBlessingUnit();
    const session = startBattleSessionRight({
      battleId: battleId(
        "battle-hunters-prey-horde-breaker-dark-ones-blessing",
      ),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "warlock", level: classLevel(3) }],
          d20Statistics: testCharacterD20Statistics({ str: 16, cha: 16 }),
          characterUnitRefs: [
            huntersPreyUnitRef("hordeBreaker"),
            blessingUnitRef,
          ],
          unitFeatures: [
            characterBattleFeatureInitForTest(blessingUnit, [
              { className: "warlock", level: classLevel(3) },
            ]),
          ],
          attack: testLongswordAttack(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Dark Blessing Target",
          initiative: 9,
          currentHp: 1,
        }),
      ],
    });
    const state = session.state;
    const subject = fighterAttackSubject(state, "Longsword");
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
      attackTargetSpatialFact(
        fighterId,
        skeletonId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      {
        kind: "hordeBreakerSecondTargetEligible" as const,
        attackerId: fighterId,
        sourceProcedureRef:
          battleProcedureExecutionRefForSpellHoleForTest(target),
        originalTargetId: goblinId,
        secondTargetId: skeletonId,
      },
      darkOnesBlessingRangeFact(blessingProcedureRef),
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
    const fillsThroughDamage = [
      ...primaryFills,
      unitFeatureDecisionFill(decision, "use"),
      secondTargetFill,
      attackRollFill(hordeRoll, { total: 15, naturalD20: 10 }),
      damageRollFillWithGroups(hordeDamage, [[1]]),
    ];
    const disposition = requireHole(
      resolveBattleSubject({ state, subject, fills: fillsThroughDamage }),
      "attackDamageDisposition",
    );
    const relationship = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...fillsThroughDamage,
          attackDamageDispositionFill(disposition, { kind: "ordinaryDamage" }),
        ],
      }),
      "damageRelationshipDecisions",
    );
    const relationshipQuestion = relationship.questions[0];
    if (relationshipQuestion === undefined) {
      throw new Error("Expected Dark One's Blessing relationship question.");
    }
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...fillsThroughDamage,
          attackDamageDispositionFill(disposition, { kind: "ordinaryDamage" }),
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
  });

  test("Horde Breaker resets on the Ranger's next turn", () => {
    const session = startBattleSessionRight({
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
    const state = session.state;
    const subject = fighterAttackSubject(state, "Longsword");
    const firstUse = resolveHordeBreakerUse(state, subject);
    expect(
      firstUse.currentTurnResources.huntersPreyHordeBreakerUsedThisTurn,
    ).toEqual([
      { attackerId: fighterId, procedureRef: huntersPreyProcedureRef(session) },
    ]);

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
      nextRangerTurn.currentTurnResources.huntersPreyHordeBreakerUsedThisTurn,
    ).toEqual([]);
    const secondUse = resolveHordeBreakerUse(nextRangerTurn, subject);
    expect(
      secondUse.currentTurnResources.huntersPreyHordeBreakerUsedThisTurn,
    ).toEqual([
      {
        attackerId: fighterId,
        procedureRef: huntersPreyProcedureRef(session),
      },
    ]);
  });

  test("Horde Breaker carries an attack-hit reaction window through its follow-up", () => {
    const state = startBattleRight({
      battleId: battleId("battle-hunters-prey-horde-breaker-reaction-windows"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: [huntersPreyUnitRef("hordeBreaker")],
          attack: testLongswordAttack(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Horde Breaker Reaction Target",
          initiative: 9,
          classLevels: [{ className: "rogue", level: 5 }],
          attack: null,
          unitFeatures: [
            characterBattleFeatureInitForTest(uncannyDodgeUnit(), [
              { className: "rogue", level: classLevel(5) },
            ]),
          ],
          characterUnitRefs: [reactionModifierUnitRef("rogue_uncanny_dodge")],
        }),
      ],
    });
    const subject = fighterAttackSubject(state, "Longsword");
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
      attackTargetSpatialFact(
        fighterId,
        skeletonId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      {
        kind: "hordeBreakerSecondTargetEligible",
        attackerId: fighterId,
        sourceProcedureRef:
          battleProcedureExecutionRefForSpellHoleForTest(target),
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
    const awaitingAttackHit = resolveBattleSubject({
      state,
      subject,
      fills: [
        ...primaryFills,
        unitFeatureDecisionFill(decision, "use"),
        secondTargetFill,
        attackRollFill(hordeRoll, { total: 15, naturalD20: 10 }),
      ],
    });
    expect(awaitingAttackHit).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "attackHit" }],
      snapshot: { pendingInterrupt: { trigger: "attackHit" } },
    });
    if (awaitingAttackHit.tag !== "needsHoles") {
      throw new Error(
        `Expected Horde Breaker attack-hit reaction, got ${awaitingAttackHit.tag}.`,
      );
    }
    const attackHitInterrupt = requireHole(
      awaitingAttackHit,
      "interruptDecision",
    );
    const afterAttackHit = resolveBattleInterrupt({
      state: awaitingAttackHit.state,
      fill: interruptDecisionFill(attackHitInterrupt, {
        kind: "decline",
        responderId: skeletonId,
      }),
    });
    if (afterAttackHit.tag !== "needsHoles") {
      throw new Error(
        `Expected Horde Breaker damage hole after attack-hit reaction, got ${afterAttackHit.tag}.`,
      );
    }
    const hordeDamage = requireHole(afterAttackHit, "rolledDice");
    const attack = attackActionOptionForSubject(state, subject);
    if (attack === undefined) {
      throw new Error("Expected Horde Breaker weapon attack option.");
    }
    const followupFills = [
      unitFeatureDecisionFill(decision, "use"),
      secondTargetFill,
      attackRollFill(hordeRoll, { total: 15, naturalD20: 10 }),
    ];
    const damageRequest = resolveHuntersPreyHordeBreakerContinuation({
      state: afterAttackHit.state,
      subject,
      firstTargetId: goblinId,
      attack,
      fills: followupFills,
      handledInterruptTrigger: "attackHit",
    });
    if (damageRequest.tag !== "needsHoles") {
      throw new Error(
        `Expected Horde Breaker damage hole, got ${damageRequest.tag}.`,
      );
    }
    const resolved = requireResolved(
      resolveHuntersPreyHordeBreakerContinuation({
        state: damageRequest.state,
        subject,
        firstTargetId: goblinId,
        attack,
        fills: [...followupFills, damageRollFillWithGroups(hordeDamage, [[1]])],
        handledInterruptTrigger: "attackHit",
      }),
    );
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(Hp(8));
    expect(
      resolved.state.currentTurnResources.huntersPreyHordeBreakerUsedThisTurn,
    ).toEqual([expect.objectContaining({ attackerId: fighterId })]);
  });

  test("Horde Breaker resumes a zero-damage extra attack through primary and follow-up damage Reactions", () => {
    const baseState = startBattleRight({
      battleId: battleId("battle-hunters-prey-primary-damage-resume"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: [huntersPreyUnitRef("hordeBreaker")],
          attack: {
            ...testLongswordAttack(),
            abilityModifier: battleAbilityModifier(-1),
            attackBonus: attackBonus(1),
            damageAbilityModifier: battleAbilityModifier(-1),
          },
        }),
        statBlockCreatureInit({ combatantId: goblinId, initiative: 10 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Second Target",
          initiative: 9,
        }),
      ],
    });
    const state = {
      ...baseState,
      readiedMovements: new Map(baseState.readiedMovements).set(goblinId, {
        trigger: "attackDamage" as const,
        expiresAt: { kind: "startOfTurn" as const, combatantId: goblinId },
      }),
    };
    const subject = fighterAttackSubject(state, "Longsword");
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
      { total: 15, naturalD20: 14 },
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
      attackRollFill(primaryRoll, { total: 15, naturalD20: 14 }),
      damageRollFillWithGroups(primaryDamage, [[4]]),
    ];
    const awaitingDamageReaction = resolveBattleSubject({
      state,
      subject,
      fills: primaryFills,
    });
    expect(awaitingDamageReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "attackDamage" }],
    });
    if (awaitingDamageReaction.tag !== "needsHoles") {
      throw new Error("Expected primary attack-damage Reaction window.");
    }
    const pendingInterrupt = awaitingDamageReaction.snapshot.pendingInterrupt;
    if (pendingInterrupt === null) {
      throw new Error("Expected a pending primary attack-damage interrupt.");
    }
    const primaryCheckpoint =
      awaitingDamageReaction.state.interruptStack.at(-1);
    if (
      primaryCheckpoint?.kind !== "interruptCheckpoint" ||
      primaryCheckpoint.frame.trigger !== "attackDamage"
    ) {
      throw new Error(
        "Expected a primary attack-damage interruption checkpoint.",
      );
    }
    expect(primaryCheckpoint.frame.continuation).toMatchObject({
      kind: "attackDamage",
      target: { combatantId: goblinId },
      attackResult: { total: 15, naturalD20: 14 },
      damageInput: {
        kind: "rolledDamage",
        damageRollByType: [{ damageType: "slashing", amount: 3 }],
      },
    });
    const declined = resolveBattleInterrupt({
      state: awaitingDamageReaction.state,
      fill: interruptDecisionFill(pendingInterrupt.decisionHole, {
        kind: "decline",
        responderId: goblinId,
      }),
    });
    expect(declined).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "unitFeatureDecision", label: "Use Horde Breaker" }],
    });
    if (declined.tag !== "needsHoles") {
      throw new Error(
        "Expected Horde Breaker decision after declining damage Reaction.",
      );
    }
    expect(declined.state.combatants.get(goblinId)?.hp).toBe(Hp(7));
    expect(declined.state.combatants.get(skeletonId)?.hp).toBe(Hp(10));
    expect(
      declined.state.currentTurnResources.huntersPreyHordeBreakerUsedThisTurn,
    ).toEqual([]);

    const decision = requireHole(declined, "unitFeatureDecision");
    const attack = attackActionOptionForSubject(declined.state, subject);
    if (attack === undefined) {
      throw new Error("Expected Horde Breaker weapon attack option.");
    }
    const decisionFill = unitFeatureDecisionFill(decision, "use");
    const target = requireHole(
      resolveHuntersPreyHordeBreakerContinuation({
        state: declined.state,
        subject,
        firstTargetId: goblinId,
        attack,
        fills: [decisionFill],
        handledInterruptTrigger: undefined,
      }),
      "targetChoice",
    );
    const secondTargetFill = targetFill(target, skeletonId, [
      attackTargetSpatialFact(
        fighterId,
        skeletonId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      {
        kind: "hordeBreakerSecondTargetEligible",
        attackerId: fighterId,
        sourceProcedureRef:
          battleProcedureExecutionRefForSpellHoleForTest(target),
        originalTargetId: goblinId,
        secondTargetId: skeletonId,
      },
    ]);
    const followupFills = [decisionFill, secondTargetFill];
    const hordeRoll = requireHole(
      resolveHuntersPreyHordeBreakerContinuation({
        state: declined.state,
        subject,
        firstTargetId: goblinId,
        attack,
        fills: followupFills,
        handledInterruptTrigger: undefined,
      }),
      "attackRoll",
    );
    const fillsThroughRoll = [
      ...followupFills,
      attackRollFill(hordeRoll, { total: 15, naturalD20: 14 }),
    ];
    const hordeDamage = requireHole(
      resolveHuntersPreyHordeBreakerContinuation({
        state: declined.state,
        subject,
        firstTargetId: goblinId,
        attack,
        fills: fillsThroughRoll,
        handledInterruptTrigger: undefined,
      }),
      "rolledDice",
    );
    const awaitingFollowupDamageReaction =
      resolveHuntersPreyHordeBreakerContinuation({
        state: declined.state,
        subject,
        firstTargetId: goblinId,
        attack,
        fills: [
          ...fillsThroughRoll,
          damageRollFillWithGroups(hordeDamage, [[1]]),
        ],
        handledInterruptTrigger: undefined,
      });
    expect(awaitingFollowupDamageReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "attackDamage" }],
    });
    if (awaitingFollowupDamageReaction.tag !== "needsHoles") {
      throw new Error("Expected Horde Breaker attack-damage Reaction window.");
    }
    const followupInterrupt =
      awaitingFollowupDamageReaction.snapshot.pendingInterrupt;
    if (followupInterrupt === null) {
      throw new Error("Expected a pending Horde Breaker damage interrupt.");
    }
    const followupCheckpoint =
      awaitingFollowupDamageReaction.state.interruptStack.at(-1);
    if (
      followupCheckpoint?.kind !== "interruptCheckpoint" ||
      followupCheckpoint.frame.trigger !== "attackDamage"
    ) {
      throw new Error(
        "Expected a procedure-bound attack-damage interruption checkpoint.",
      );
    }
    expect(followupCheckpoint.frame.continuation).toMatchObject({
      kind: "attackDamage",
      target: { combatantId: skeletonId },
      attackResult: { total: 15, naturalD20: 14 },
      damageInput: {
        kind: "rolledDamage",
        damageRollByType: [{ damageType: "slashing", amount: 0 }],
      },
    });
    const resolved = requireResolved(
      resolveBattleInterrupt({
        state: awaitingFollowupDamageReaction.state,
        fill: interruptDecisionFill(followupInterrupt.decisionHole, {
          kind: "decline",
          responderId: goblinId,
        }),
      }),
    );
    expect(resolved.state.combatants.get(goblinId)?.hp).toBe(Hp(7));
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(Hp(10));
    expect(
      resolved.state.currentTurnResources.huntersPreyHordeBreakerUsedThisTurn,
    ).toEqual([expect.objectContaining({ attackerId: fighterId })]);
  });

  test("Horde Breaker can be used after the original weapon attack misses", () => {
    const session = startBattleSessionRight({
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
    const state = session.state;
    const subject = fighterAttackSubject(state, "Longsword");
    const primaryTarget = attackInitialTargetHole(state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      state,
      primaryTarget,
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
      attackTargetSpatialFact(
        fighterId,
        skeletonId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      {
        kind: "hordeBreakerSecondTargetEligible",
        attackerId: fighterId,
        sourceProcedureRef:
          battleProcedureExecutionRefForSpellHoleForTest(target),
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
    ).toEqual([
      { attackerId: fighterId, procedureRef: huntersPreyProcedureRef(session) },
    ]);
  });

  test("Horde Breaker applies Frenzy after a Reckless miss while raging", () => {
    const frenzyUnit = unitLibrary.requireUnit("barbarian_frenzy");
    const session = startBattleSessionRight({
      battleId: battleId("battle-hunters-prey-horde-breaker-frenzy"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 3 }],
          resources: [rageResource()],
          characterUnitRefs: [
            huntersPreyUnitRef("hordeBreaker"),
            supportedBattleUnitRef(frenzyUnit),
          ],
          unitFeatures: [
            characterBattleFeatureInitForTest(frenzyUnit, [
              { className: "barbarian", level: classLevel(3) },
            ]),
            recklessAttackFeature(),
          ],
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
    const rageSubject = {
      tag: "unitFeature" as const,
      actorId: fighterId,
      procedureRef: requireCharacterUnitProcedureRefForTest(
        session,
        fighterId,
        "barbarian_rage",
      ),
    };
    const raging = requireResolved(
      resolveBattleSubject({
        state: session.state,
        subject: rageSubject,
        fills: [],
      }),
    ).state;
    const subject = fighterAttackSubject(raging, "Longsword");
    const primaryTarget = attackInitialTargetHole(raging, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      raging,
      primaryTarget,
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
      attackRollFill(primaryRoll, {
        total: 5,
        naturalD20: 2,
        rollMode: "advantage",
        activatedOngoingFeatureProcedureRef:
          requireCharacterUnitProcedureRefForTest(
            session,
            fighterId,
            "barbarian_reckless_attack",
          ),
      }),
    ] as const;
    const decision = requireHole(
      resolveBattleSubject({ state: raging, subject, fills: primaryFills }),
      "unitFeatureDecision",
    );
    const target = requireHole(
      resolveBattleSubject({
        state: raging,
        subject,
        fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
      }),
      "targetChoice",
    );
    const secondTargetFill = targetFill(target, skeletonId, [
      attackTargetSpatialFact(
        fighterId,
        skeletonId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      {
        kind: "hordeBreakerSecondTargetEligible",
        attackerId: fighterId,
        sourceProcedureRef:
          battleProcedureExecutionRefForSpellHoleForTest(target),
        originalTargetId: goblinId,
        secondTargetId: skeletonId,
      },
    ]);
    const hordeRoll = requireHole(
      resolveBattleSubject({
        state: raging,
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
        state: raging,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          secondTargetFill,
          attackRollFill(hordeRoll, {
            total: 15,
            naturalD20: 10,
            rollMode: "advantage",
          }),
        ],
      }),
      "rolledDice",
    );
    expect(hordeDamage).toMatchObject({
      attackDamageRiders: [
        expect.objectContaining({
          optional: false,
          damage: { dice: 2, dieSize: 6, damageType: "slashing" },
        }),
      ],
    });
  });

  test("Horde Breaker can be declined after the original weapon attack misses", () => {
    const { state, subject, primaryFills, decision } =
      hordeBreakerAfterPrimaryMissFixture({
        battleId: battleId(
          "battle-hunters-prey-horde-breaker-declined-after-miss",
        ),
        secondTargetHp: Hp(10),
      });

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [...primaryFills, unitFeatureDecisionFill(decision, "decline")],
      }),
    );

    expect(resolved.state.combatants.get(goblinId)?.hp).toBe(10);
    expect(
      resolved.state.currentTurnResources.huntersPreyHordeBreakerUsedThisTurn,
    ).toEqual([]);
  });

  test("a missed Horde Breaker follow-up consumes its once-per-turn use without requesting damage", () => {
    const {
      session,
      state,
      subject,
      primaryFills,
      decision,
      secondTargetFill,
      hordeRoll,
    } = hordeBreakerFollowupAttackFixture({
      battleId: battleId("battle-hunters-prey-horde-breaker-followup-miss"),
      secondTargetHp: Hp(10),
    });

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...primaryFills,
          unitFeatureDecisionFill(decision, "use"),
          secondTargetFill,
          attackRollFill(hordeRoll, { total: 7, naturalD20: 2 }),
        ],
      }),
    );

    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(10);
    expect(
      resolved.state.currentTurnResources.huntersPreyHordeBreakerUsedThisTurn,
    ).toEqual([
      { attackerId: fighterId, procedureRef: huntersPreyProcedureRef(session) },
    ]);
  });

  test("Horde Breaker offers an admitted natural-1 reroll before resolving its follow-up attack", () => {
    const {
      state,
      subject,
      primaryFills,
      decision,
      secondTargetFill,
      hordeRoll,
    } = hordeBreakerFollowupAttackFixture({
      battleId: battleId(
        "battle-hunters-prey-horde-breaker-natural-one-reroll",
      ),
      secondTargetHp: Hp(10),
    });

    const rerollRequested = resolveBattleSubject({
      state,
      subject,
      fills: [
        ...primaryFills,
        unitFeatureDecisionFill(decision, "use"),
        secondTargetFill,
        attackRollFill(hordeRoll, { total: 6, naturalD20: 1 }),
      ],
    });

    expect(rerollRequested).toMatchObject({
      tag: "needsHoles",
      holes: [
        expect.objectContaining({
          kind: "attackRoll",
          d20TestNaturalOneRerolls: [
            {
              effectKind: "d20_test_natural_one_reroll",
              label: "D20 Test natural-1 reroll",
            },
          ],
        }),
      ],
    });
  });

  test("Horde Breaker requests the melee zero-hit-point disposition independently for its follow-up target", () => {
    const {
      state,
      subject,
      primaryFills,
      decision,
      secondTargetFill,
      hordeRoll,
    } = hordeBreakerFollowupAttackFixture({
      battleId: battleId(
        "battle-hunters-prey-horde-breaker-zero-hp-disposition",
      ),
      secondTargetHp: Hp(1),
    });
    const fillsThroughRoll = [
      ...primaryFills,
      unitFeatureDecisionFill(decision, "use"),
      secondTargetFill,
      attackRollFill(hordeRoll, { total: 15, naturalD20: 10 }),
    ];
    const damage = requireHole(
      resolveBattleSubject({ state, subject, fills: fillsThroughRoll }),
      "rolledDice",
    );
    const fillsThroughDamage = [
      ...fillsThroughRoll,
      damageRollFillWithGroups(damage, [[1]]),
    ];
    const disposition = requireHole(
      resolveBattleSubject({ state, subject, fills: fillsThroughDamage }),
      "attackDamageDisposition",
    );

    expect(disposition).toMatchObject({
      label: "Attack damage disposition",
      targetId: skeletonId,
      choices: [{ kind: "ordinaryDamage" }, { kind: "knockOut" }],
    });

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...fillsThroughDamage,
          attackDamageDispositionFill(disposition, { kind: "ordinaryDamage" }),
        ],
      }),
    );
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(0);
  });

  test("Horde Breaker target choices include a different non-enemy creature", () => {
    const session = startBattleSessionRight({
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
    const state = session.state;
    const subject = fighterAttackSubject(state, "Longsword");
    const primaryTarget = attackInitialTargetHole(state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      state,
      primaryTarget,
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
    const session = startBattleSessionRight({
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
    const state = session.state;
    const subject = fighterAttackSubject(state, "Dagger");
    const primaryTarget = attackInitialTargetHole(state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      state,
      primaryTarget,
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
      attackTargetSpatialFact(
        fighterId,
        skeletonId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      {
        kind: "hordeBreakerSecondTargetEligible",
        attackerId: fighterId,
        sourceProcedureRef:
          battleProcedureExecutionRefForSpellHoleForTest(target),
        originalTargetId: goblinId,
        secondTargetId: skeletonId,
      },
      {
        kind: "attackerAllyWithin5FeetOfTarget",
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
          procedureRef: requireCharacterUnitProcedureRefForTest(
            session,
            fighterId,
            "rogue_sneak_attack",
          ),
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
          damageRollFillWithGroups(
            hordeDamage,
            [[1], [1]],
            [
              requireCharacterUnitProcedureRefForTest(
                session,
                fighterId,
                "rogue_sneak_attack",
              ),
            ],
          ),
        ],
      }),
    );

    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(5);
    expect(
      resolved.state.currentTurnResources.attackDamageRidersUsedThisTurn,
    ).toEqual([
      {
        attackerId: fighterId,
        procedureRef: requireCharacterUnitProcedureRefForTest(
          session,
          fighterId,
          "rogue_sneak_attack",
        ),
      },
    ]);
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
    const subject = fighterAttackSubject(state, "Longsword");
    const primaryTarget = attackInitialTargetHole(state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      state,
      primaryTarget,
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
            attackTargetSpatialFact(
              fighterId,
              goblinId,
              attackExecutionSelectionForSubjectForTest(subject),
            ),
            {
              kind: "hordeBreakerSecondTargetEligible",
              attackerId: fighterId,
              sourceProcedureRef:
                battleProcedureExecutionRefForSpellHoleForTest(target),
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
    const session = startBattleSessionRight({
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
    const markAct = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          "hunters_mark",
    );
    if (markAct === undefined) {
      throw new Error("Expected Hunter's Mark Bonus Action spell act.");
    }
    const markTarget = findHole(markAct.initialHoles, "targetChoice");
    const marked = requireResolved(
      resolveBattleSubject({
        state: session.state,
        subject: markAct.subject,
        fills: [
          targetFill(markTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: skeletonId,
              sourceProcedureRef:
                battleProcedureExecutionRefForSpellHoleForTest(markTarget),
            },
          ]),
        ],
      }),
    );

    const subject = fighterAttackSubject(session.state, "Longsword");
    const primaryTarget = attackInitialTargetHole(marked.state, subject);
    const primaryRoll = attackRollHoleAfterTarget(
      marked.state,
      primaryTarget,
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
      attackRollFill(primaryRoll, { total: 5, naturalD20: 2 }),
    ];
    const decision = requireHole(
      resolveBattleSubject({
        state: marked.state,
        subject,
        fills: primaryFills,
      }),
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
      attackTargetSpatialFact(
        fighterId,
        skeletonId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      {
        kind: "hordeBreakerSecondTargetEligible",
        attackerId: fighterId,
        sourceProcedureRef:
          battleProcedureExecutionRefForSpellHoleForTest(target),
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
