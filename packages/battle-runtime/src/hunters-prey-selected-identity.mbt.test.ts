import { battleProcedureExecutionRefForTest } from "./battle-runtime-test-support.ts";
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.hunters-prey
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3PUTB-07-RANGER-HUNTERS-PREY-RUNTIME ranger_hunters_prey
// UNIT-IDENTITY-REPLAY: L3PUTB-07-RANGER-HUNTERS-PREY-RUNTIME ranger_hunters_prey doColossusSlayer doSkipThenUseColossusSlayer doHordeBreaker doHordeBreakerAfterPrimaryMiss doRejectMissingSelection doRejectSameTarget doRejectInvalidTargetPredicate doSecondHordeBreakerUnavailable
import { movementFeet } from "@dnd/shared/types";

import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.ts";
import type { BattleHole, BattleUnitRef } from "./index.ts";
import {
  ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE,
  battleUnitRefWithSupportProfiles,
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
  Either,
  fighterAttackSubject,
  fighterId,
  goblinId,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  skeletonId,
  startBattleRight,
  statBlockCreatureInit,
  targetFill,
  testLongswordAttack,
  unitFeatureDecisionFill,
  unitLibrary,
} from "./battle-runtime-test-support.ts";

type HuntersPreyProjection = {
  readonly colossusTargetHp: number;
  readonly hordeTargetHp: number;
  readonly colossusUsed: boolean;
  readonly hordeBreakerUsed: boolean;
  readonly lastResult: string;
  readonly lastInvalidReason: string;
};

type HuntersPreyOptionId = "colossusSlayer" | "hordeBreaker";
const syntheticExtraAttackUnitId = "test_hunters_prey_extra_attack";

function requireBoundAttackSelection(hole: BattleHole) {
  if (hole.kind !== "targetChoice" || hole.attack === undefined) {
    throw new Error("Expected bound Hunter's Prey attack selection.");
  }
  return hole.attack.selection;
}

const HUNTERS_PREY_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG = {
  Init: "init",
  ColossusSlayer: "colossusSlayer",
  SkipThenUseColossusSlayer: "skipThenUseColossusSlayer",
  HordeBreaker: "hordeBreaker",
  HordeBreakerAfterPrimaryMiss: "hordeBreakerAfterPrimaryMiss",
  RejectMissingSelection: "rejectMissingSelection",
  RejectSameTarget: "rejectSameTarget",
  RejectInvalidTargetPredicate: "rejectInvalidTargetPredicate",
  SecondHordeBreakerUnavailable: "secondHordeBreakerUnavailable",
} as const satisfies Readonly<
  Record<string, HuntersPreyProjection["lastResult"]>
>;

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Hunter's Prey selected identity replay",
  taskId: "L3PUTB-07-RANGER-HUNTERS-PREY-RUNTIME",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-hunters-prey.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: {
    lastResult: "qScenarioOutcome",
  },
  quintVariantFieldTags: {
    lastResult: HUNTERS_PREY_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG,
  },
  witnessInvalidScenarioReasons: {
    rejectMissingSelection: "invalidFill",
    rejectSameTarget: "invalidFill",
    rejectInvalidTargetPredicate: "invalidFill",
  },
  projectionSchema: {
    colossusTargetHp: "int",
    hordeTargetHp: "int",
    colossusUsed: "bool",
    hordeBreakerUsed: "bool",
    lastResult: "variant",
    lastInvalidReason: "str",
  },
  initialProjection: expectedProjection(),
  units: [
    {
      unitId: "ranger_hunters_prey",
      procedures: [
        {
          actionName: "doColossusSlayer",
          discover: projectColossusSlayer,
        },
        {
          actionName: "doSkipThenUseColossusSlayer",
          discover: projectSkipThenUseColossusSlayer,
        },
        {
          actionName: "doHordeBreaker",
          discover: projectHordeBreaker,
        },
        {
          actionName: "doHordeBreakerAfterPrimaryMiss",
          discover: projectHordeBreakerAfterPrimaryMiss,
        },
        {
          actionName: "doRejectMissingSelection",
          discover: projectRejectMissingSelection,
        },
        {
          actionName: "doRejectSameTarget",
          discover: projectRejectSameTarget,
        },
        {
          actionName: "doRejectInvalidTargetPredicate",
          discover: projectRejectInvalidTargetPredicate,
        },
        {
          actionName: "doSecondHordeBreakerUnavailable",
          discover: projectSecondHordeBreakerUnavailable,
        },
      ],
    },
  ],
});

function expectedProjection(
  overrides: Partial<HuntersPreyProjection> = {},
): HuntersPreyProjection {
  return {
    colossusTargetHp: 7,
    hordeTargetHp: 10,
    colossusUsed: false,
    hordeBreakerUsed: false,
    lastResult: "init",
    lastInvalidReason: "",
    ...overrides,
  };
}

function projectColossusSlayer(): HuntersPreyProjection {
  const state = startBattleRight({
    battleId: battleId("battle-hunters-prey-mbt-colossus-slayer"),
    combatants: [
      characterSeed({
        initiative: 20,
        characterUnitRefs: [huntersPreyUnitRef("colossusSlayer")],
        attack: testLongswordAttack(),
      }),
      statBlockCreatureInit({ initiative: 10, currentHp: 6 }),
    ],
  });
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
  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
        damageRollFillWithGroups(damage, [[1], [1]], ["ranger_hunters_prey"]),
      ],
    }),
  );

  return expectedProjection({
    colossusTargetHp: resolved.state.combatants.get(goblinId)?.hp ?? 0,
    colossusUsed:
      resolved.state.currentTurnResources.attackDamageRidersUsedThisTurn.some(
        (usage) => usage.unitId === "ranger_hunters_prey",
      ),
    lastResult: "colossusSlayer",
  });
}

function projectHordeBreaker(): HuntersPreyProjection {
  const resolved = resolveHordeBreakerUse();
  return expectedProjection({
    hordeTargetHp: resolved.state.combatants.get(skeletonId)?.hp ?? 0,
    hordeBreakerUsed: hordeBreakerWasUsed(resolved.state),
    lastResult: "hordeBreaker",
  });
}

function projectSkipThenUseColossusSlayer(): HuntersPreyProjection {
  const state = startBattleRight({
    battleId: battleId("battle-hunters-prey-mbt-skip-then-use-colossus"),
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
  const subject = fighterAttackSubject(state, "Longsword");
  const firstTarget = attackInitialTargetHole(state, subject);
  const firstRoll = attackRollHoleAfterTarget(
    state,
    firstTarget,
    subject,
    goblinId,
  );
  const firstDamage = attackDamageHoleAfterHit(
    state,
    firstTarget,
    firstRoll,
    { total: 15, naturalD20: 10 },
    subject,
    goblinId,
  );
  const skipped = requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(firstTarget, goblinId),
        attackRollFill(firstRoll, { total: 15, naturalD20: 10 }),
        damageRollFillWithGroups(firstDamage, [[1]], []),
      ],
    }),
  );
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
  const resolved = requireResolved(
    resolveBattleSubject({
      state: skipped.state,
      subject,
      fills: [
        targetFill(secondTarget, skeletonId),
        attackRollFill(secondRoll, { total: 15, naturalD20: 10 }),
        damageRollFillWithGroups(
          secondDamage,
          [[1], [1]],
          ["ranger_hunters_prey"],
        ),
      ],
    }),
  );
  return expectedProjection({
    colossusTargetHp: resolved.state.combatants.get(goblinId)?.hp ?? 0,
    colossusUsed:
      resolved.state.currentTurnResources.attackDamageRidersUsedThisTurn.some(
        (usage) => usage.unitId === "ranger_hunters_prey",
      ),
    lastResult: "skipThenUseColossusSlayer",
  });
}

function projectHordeBreakerAfterPrimaryMiss(): HuntersPreyProjection {
  const resolved = resolveHordeBreakerUse({ primaryHit: false });
  return expectedProjection({
    hordeTargetHp: resolved.state.combatants.get(skeletonId)?.hp ?? 0,
    hordeBreakerUsed: hordeBreakerWasUsed(resolved.state),
    lastResult: "hordeBreakerAfterPrimaryMiss",
  });
}

function projectRejectMissingSelection(): HuntersPreyProjection {
  const unit = unitLibrary.requireUnit("ranger_hunters_prey");
  const admitted = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  return expectedProjection({
    lastResult: "rejectMissingSelection",
    lastInvalidReason: Either.isLeft(admitted) ? "invalidFill" : "notInvalid",
  });
}

function projectRejectSameTarget(): HuntersPreyProjection {
  const window = hordeBreakerWindow();
  const result = resolveBattleSubject({
    state: window.state,
    subject: window.subject,
    fills: [
      ...window.primaryFills,
      unitFeatureDecisionFill(window.decision, "use"),
      targetFill(window.hordeTarget, goblinId, [
        attackTargetSpatialFact(
          fighterId,
          goblinId,
          requireBoundAttackSelection(window.hordeTarget),
        ),
        {
          kind: "hordeBreakerSecondTargetEligible",
          attackerId: fighterId,
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String("ranger_hunters_prey"),
          ),
          originalTargetId: goblinId,
          secondTargetId: goblinId,
        },
      ]),
    ],
  });
  return expectedProjection({
    lastResult: "rejectSameTarget",
    lastInvalidReason: result.tag === "invalid" ? result.reason : "notInvalid",
  });
}

function projectRejectInvalidTargetPredicate(): HuntersPreyProjection {
  const window = hordeBreakerWindow();
  const result = resolveBattleSubject({
    state: window.state,
    subject: window.subject,
    fills: [
      ...window.primaryFills,
      unitFeatureDecisionFill(window.decision, "use"),
      targetFill(window.hordeTarget, skeletonId, [
        attackTargetSpatialFact(
          fighterId,
          skeletonId,
          requireBoundAttackSelection(window.hordeTarget),
        ),
      ]),
    ],
  });
  return expectedProjection({
    lastResult: "rejectInvalidTargetPredicate",
    lastInvalidReason: result.tag === "invalid" ? result.reason : "notInvalid",
  });
}

function projectSecondHordeBreakerUnavailable(): HuntersPreyProjection {
  const base = hordeBreakerBattle();
  const state = {
    ...base,
    currentTurnResources: {
      ...base.currentTurnResources,
      huntersPreyHordeBreakerUsedThisTurn: [
        { attackerId: fighterId, unitId: "ranger_hunters_prey" },
      ],
    },
  };
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
  const result = requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
        damageRollFillWithGroups(damage, [[1]]),
      ],
    }),
  );
  return expectedProjection({
    hordeTargetHp: result.state.combatants.get(skeletonId)?.hp ?? 0,
    hordeBreakerUsed: hordeBreakerWasUsed(result.state),
    lastResult: "secondHordeBreakerUnavailable",
  });
}

function resolveHordeBreakerUse(input: { readonly primaryHit?: boolean } = {}) {
  const window = hordeBreakerWindow(input);
  const targetFillForHordeBreaker = targetFill(window.hordeTarget, skeletonId, [
    attackTargetSpatialFact(
      fighterId,
      skeletonId,
      requireBoundAttackSelection(window.hordeTarget),
    ),
    {
      kind: "hordeBreakerSecondTargetEligible",
      attackerId: fighterId,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String("ranger_hunters_prey"),
      ),
      originalTargetId: goblinId,
      secondTargetId: skeletonId,
    },
  ]);
  const hordeRoll = requireHole(
    resolveBattleSubject({
      state: window.state,
      subject: window.subject,
      fills: [
        ...window.primaryFills,
        unitFeatureDecisionFill(window.decision, "use"),
        targetFillForHordeBreaker,
      ],
    }),
    "attackRoll",
  );
  const hordeDamage = requireHole(
    resolveBattleSubject({
      state: window.state,
      subject: window.subject,
      fills: [
        ...window.primaryFills,
        unitFeatureDecisionFill(window.decision, "use"),
        targetFillForHordeBreaker,
        attackRollFill(hordeRoll, { total: 15, naturalD20: 10 }),
      ],
    }),
    "rolledDice",
  );
  return requireResolved(
    resolveBattleSubject({
      state: window.state,
      subject: window.subject,
      fills: [
        ...window.primaryFills,
        unitFeatureDecisionFill(window.decision, "use"),
        targetFillForHordeBreaker,
        attackRollFill(hordeRoll, { total: 15, naturalD20: 10 }),
        damageRollFillWithGroups(hordeDamage, [[1]]),
      ],
    }),
  );
}

function hordeBreakerWindow(input: { readonly primaryHit?: boolean } = {}) {
  const state = hordeBreakerBattle();
  const subject = fighterAttackSubject(state, "Longsword");
  const primaryTarget = attackInitialTargetHole(state, subject);
  const primaryAttackRoll =
    input.primaryHit === false
      ? { total: 5, naturalD20: 2 }
      : { total: 15, naturalD20: 10 };
  const primaryRoll = attackRollHoleAfterTarget(
    state,
    primaryTarget,
    subject,
    goblinId,
  );
  const attackFills = [
    attackTargetFill(primaryTarget, fighterId, goblinId),
    attackRollFill(primaryRoll, primaryAttackRoll),
  ];
  const primaryFills =
    input.primaryHit === false
      ? attackFills
      : [
          ...attackFills,
          damageRollFillWithGroups(
            attackDamageHoleAfterHit(
              state,
              primaryTarget,
              primaryRoll,
              primaryAttackRoll,
              subject,
              goblinId,
            ),
            [[1]],
          ),
        ];
  const decision = requireHole(
    resolveBattleSubject({ state, subject, fills: primaryFills }),
    "unitFeatureDecision",
  );
  const hordeTarget = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [...primaryFills, unitFeatureDecisionFill(decision, "use")],
    }),
    "targetChoice",
  );
  return { state, subject, primaryFills, decision, hordeTarget };
}

function hordeBreakerBattle() {
  return startBattleRight({
    battleId: battleId("battle-hunters-prey-mbt-horde-breaker"),
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
}

function hordeBreakerWasUsed(
  state: ReturnType<typeof startBattleRight>,
): boolean {
  return state.currentTurnResources.huntersPreyHordeBreakerUsedThisTurn.some(
    (usage) => usage.unitId === "ranger_hunters_prey",
  );
}

function huntersPreyUnitRef(optionId: HuntersPreyOptionId): BattleUnitRef {
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

function extraAttackUnitRef(): BattleUnitRef {
  return {
    unit: unitLibrary.requireUnit(syntheticExtraAttackUnitId),
    supportProfiles: [
      {
        kind: ATTACK_ACTION_ATTACK_COUNT_SCALING_SUPPORT_PROFILE,
        additionalAttacks: 1,
      },
    ],
  };
}
