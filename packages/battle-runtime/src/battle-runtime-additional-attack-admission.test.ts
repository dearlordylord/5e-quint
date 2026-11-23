import { expect, test } from "vitest";
import {
  attackActionOptionForSubject,
  attackDamageHole,
} from "./battle-reducer/attack-damage-apply.ts";
import { resolveHuntersPreyHordeBreakerContinuation } from "./battle-reducer/attack-main.ts";
import {
  HUNTERS_PREY_HORDE_BREAKER_GRAZE_DECISION_HOLE_ID,
  HUNTERS_PREY_HORDE_BREAKER_DAMAGE_HOLE_ID,
} from "./battle-reducer/domain-constants.ts";
import {
  battleId,
  attackExecutionSelectionForSubjectForTest,
  attackTargetSpatialFact,
  attackRollFill,
  battleProcedureExecutionRefForSpellHoleForTest,
  damageRollFillWithGroups,
  grazeWeaponMasterySelections,
  masteryGrazeUnitRefs,
  targetFill,
  testGrazeWeaponAttack,
  testGrazeWeaponUnitRef,
  characterSeed,
  fighterAttackSubject,
  fighterId,
  goblinId,
  huntersPreyUnitRef,
  requireHole,
  requireResolved,
  skeletonId,
  snapshotBattle,
  startBattleRight,
  statBlockCreatureInit,
  testLongswordAttack,
  unitFeatureDecisionFill,
  type BattleFill,
} from "./battle-runtime.test-support.ts";

// A saved subordinate decision cannot grant an additional attack its owner did
// not admit. Exercise the continuation owner that consumes those saved fills.
test.each(["withoutFeature", "declined"] as const)(
  "Horde Breaker Graze refuses a %s additional attack without spending resources",
  (scenario) => {
    const state = startBattleRight({
      battleId: battleId("synthetic-additional-attack-admission"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          initiative: 20,
          attack: testLongswordAttack(),
          characterUnitRefs:
            scenario === "declined" ? [huntersPreyUnitRef("hordeBreaker")] : [],
        }),
        statBlockCreatureInit({ initiative: 10 }),
        statBlockCreatureInit({ combatantId: skeletonId, initiative: 9 }),
      ],
    });
    const subject = fighterAttackSubject(state);
    const attack = attackActionOptionForSubject(state, subject);
    if (attack === undefined)
      throw new Error("Expected the discovered attack.");
    const resolve = (fills: readonly BattleFill[]) =>
      resolveHuntersPreyHordeBreakerContinuation({
        state,
        subject,
        firstTargetId: goblinId,
        attack,
        fills,
        handledInterruptTrigger: undefined,
      });
    const decisionFills =
      scenario === "declined"
        ? [
            unitFeatureDecisionFill(
              requireHole(resolve([]), "unitFeatureDecision"),
              "decline",
            ),
          ]
        : [];
    const before = snapshotBattle(state);
    expect(requireResolved(resolve(decisionFills)).snapshot).toEqual(before);
    const staleGraze: BattleFill = {
      kind: "unitFeatureDecision",
      holeId: HUNTERS_PREY_HORDE_BREAKER_GRAZE_DECISION_HOLE_ID,
      value: "use",
    };
    expect(resolve([...decisionFills, staleGraze])).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Horde Breaker Graze requires an eligible Horde Breaker attack.",
      snapshot: before,
    });
  },
);

test("a missed Horde Breaker attack with fixed Graze damage rejects supplied damage dice", () => {
  const state = startBattleRight({
    battleId: battleId("synthetic-additional-attack-fixed-damage"),
    combatants: [
      characterSeed({
        combatantId: fighterId,
        initiative: 20,
        characterUnitRefs: [
          ...masteryGrazeUnitRefs(),
          testGrazeWeaponUnitRef(),
          huntersPreyUnitRef("hordeBreaker"),
        ],
        weaponMasteries: grazeWeaponMasterySelections(),
        attack: testGrazeWeaponAttack(),
      }),
      statBlockCreatureInit({ initiative: 10 }),
      statBlockCreatureInit({ combatantId: skeletonId, initiative: 9 }),
    ],
  });
  const subject = fighterAttackSubject(
    state,
    String(testGrazeWeaponUnitRef().unit.id),
  );
  const attack = attackActionOptionForSubject(state, subject);
  if (attack === undefined)
    throw new Error("Expected the discovered Graze attack.");
  const resolve = (fills: readonly BattleFill[]) =>
    resolveHuntersPreyHordeBreakerContinuation({
      state,
      subject,
      firstTargetId: goblinId,
      attack,
      fills,
      handledInterruptTrigger: undefined,
    });
  const decision = requireHole(resolve([]), "unitFeatureDecision");
  const selected = [unitFeatureDecisionFill(decision, "use")];
  const target = requireHole(resolve(selected), "targetChoice");
  const targeted = [
    ...selected,
    targetFill(target, skeletonId, [
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
    ]),
  ];
  const roll = requireHole(resolve(targeted), "attackRoll");
  const missed = [
    ...targeted,
    attackRollFill(roll, { total: 10, naturalD20: 8 }),
  ];
  const graze = requireHole(resolve(missed), "unitFeatureDecision");
  expect(graze.holeId).toBe(HUNTERS_PREY_HORDE_BREAKER_GRAZE_DECISION_HOLE_ID);
  const fixedDamage = [...missed, unitFeatureDecisionFill(graze, "use")];
  const resolved = requireResolved(resolve(fixedDamage));
  expect(Number(resolved.state.combatants.get(skeletonId)?.hp)).toBe(
    Number(state.combatants.get(skeletonId)?.hp) - 3,
  );
  const suppliedDamage = damageRollFillWithGroups(
    {
      ...attackDamageHole(attack),
      holeId: HUNTERS_PREY_HORDE_BREAKER_DAMAGE_HOLE_ID,
    },
    [[1]],
  );
  expect(resolve([...fixedDamage, suppliedDamage])).toMatchObject({
    tag: "invalid",
    reason: "invalidFill",
    message:
      "Fixed Graze damage does not use a damage roll or a source damage roll penalty.",
    snapshot: snapshotBattle(state),
  });
});
