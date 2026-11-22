// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection GH530-WEAPON-MASTERY-GRAZE mastery_graze
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.WEAPON_MASTERY_GRAZE
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.weapon-mastery-graze
import { Result } from "effect";
import { describe, expect, test } from "vitest";

import {
  attackDamageDispositionFill,
  battleEffectExecutionRefForTest,
  damageRollFillWithGroups,
  attackDamageHoleAfterHit,
  attackExecutionSelectionForSubjectForTest,
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  attackTargetSpatialFact,
  battleProcedureExecutionRefForSpellHoleForTest,
  Hp,
  battleAbilityModifier,
  battleId,
  battleProcedureExecutionRefForTest,
  characterSeed,
  concentrationSavingThrowFill,
  fighterAttackSubject,
  fighterId,
  fighterVsGoblinBattle,
  goblinId,
  grazeWeaponMasterySelections,
  huntersPreyUnitRef,
  masteryGrazeUnitRefs,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  skeletonId,
  snapshotBattle,
  startBattleRight,
  statBlockCreatureInit,
  targetFill,
  testGrazeWeaponAttack,
  testGrazeWeaponUnitRef,
  unitFeatureDecisionFill,
  unitLibrary,
} from "./battle-runtime.test-support.ts";
import type {
  BattleFill,
  BattleHole,
  BattleState,
} from "./battle-runtime.test-support.ts";
import {
  HUNTERS_PREY_HORDE_BREAKER_GRAZE_DECISION_HOLE_ID,
  WEAPON_MASTERY_GRAZE_DECISION_HOLE_ID,
} from "./battle-reducer/domain-constants.ts";
import { sourceDamageRollPenaltyRollHole } from "./battle-reducer/damage-helpers.ts";
import { admitWeaponMasteryProcedure } from "./procedure-admission/weapon-mastery.ts";
import {
  battleUnitSupportProfilesForUnit,
  WEAPON_MASTERY_GRAZE_SUPPORT_PROFILE,
} from "./unit-feature-support.ts";

// SRD 5.2.1 equipment.md, Graze: "If your attack roll with this weapon misses a
// creature, you can deal damage to that creature equal to the ability modifier
// you used to make the attack roll. This damage is the same type dealt by the
// weapon, and the damage can be increased only by increasing the ability
// modifier."

const GRAZE_WEAPON_ID = String(testGrazeWeaponUnitRef().unit.id);
const MISS = { total: 10, naturalD20: 8 } as const;
const HIT = { total: 18, naturalD20: 15 } as const;

function grazeBattle(input?: {
  readonly abilityModifier?: number;
  readonly damageBonus?: number;
  readonly withMastery?: boolean;
  readonly withSelection?: boolean;
}): BattleState {
  const attack = testGrazeWeaponAttack(
    battleAbilityModifier(input?.abilityModifier ?? 3),
  );
  return fighterVsGoblinBattle({
    characterUnitRefs: [
      ...(input?.withMastery === false ? [] : masteryGrazeUnitRefs()),
      testGrazeWeaponUnitRef(),
    ],
    ...(input?.withSelection === false
      ? {}
      : { weaponMasteries: grazeWeaponMasterySelections() }),
    attack:
      input?.damageBonus === undefined
        ? attack
        : { ...attack, damageBonus: input.damageBonus },
  });
}

function rollFills(
  state: BattleState,
  roll: { readonly total: number; readonly naturalD20: number },
): readonly BattleFill[] {
  const subject = fighterAttackSubject(state, GRAZE_WEAPON_ID);
  const targetHole = attackInitialTargetHole(state, subject);
  const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
  return [targetFill(targetHole, goblinId), attackRollFill(rollHole, roll)];
}

function resolveGrazeAttack(
  state: BattleState,
  fills: readonly BattleFill[],
): ReturnType<typeof resolveBattleSubject> {
  return resolveBattleSubject({
    state,
    subject: fighterAttackSubject(state, GRAZE_WEAPON_ID),
    fills,
  });
}

function grazeDecisionFill(
  value: "use" | "decline",
): Extract<BattleFill, { readonly kind: "unitFeatureDecision" }> {
  return {
    kind: "unitFeatureDecision",
    holeId: WEAPON_MASTERY_GRAZE_DECISION_HOLE_ID,
    value,
  };
}

function goblinHp(state: BattleState): number {
  const goblin = state.combatants.get(goblinId);
  if (goblin === undefined) {
    throw new Error("Expected the Goblin.");
  }
  return Number(goblin.hp);
}

function actionSpent(state: BattleState): boolean {
  return state.currentTurnResources.actionTakenThisTurn;
}

function withGoblin(
  state: BattleState,
  change: (
    goblin: NonNullable<ReturnType<BattleState["combatants"]["get"]>>,
  ) => NonNullable<ReturnType<BattleState["combatants"]["get"]>>,
): BattleState {
  const goblin = state.combatants.get(goblinId);
  if (goblin === undefined) {
    throw new Error("Expected the Goblin.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(goblinId, change(goblin)),
  };
}

function withGoblinDefense(
  state: BattleState,
  defense: "resistances" | "vulnerabilities",
): BattleState {
  return withGoblin(state, (goblin) => {
    if (goblin.origin.kind !== "statBlock") {
      throw new Error("Expected a Stat Block Goblin.");
    }
    return {
      ...goblin,
      origin: {
        ...goblin.origin,
        mechanics: { ...goblin.origin.mechanics, [defense]: ["slashing"] },
      },
    };
  });
}

describe("battle runtime: Weapon Mastery Graze", () => {
  test("admits the SRD Graze mastery and a weapon whose mastery is Graze", () => {
    const graze = unitLibrary.requireUnit("mastery_graze");
    expect(admitWeaponMasteryProcedure(graze)).toMatchObject({
      tag: "admitted",
      procedure: { facts: WEAPON_MASTERY_GRAZE_SUPPORT_PROFILE },
    });
    const supportProfiles = battleUnitSupportProfilesForUnit({ unit: graze });
    expect(Result.getOrThrow(supportProfiles)).toEqual([
      WEAPON_MASTERY_GRAZE_SUPPORT_PROFILE,
    ]);
    expect(testGrazeWeaponAttack().weapon).toMatchObject({
      masteryProperty: "graze",
    });
  });

  test("a miss asks whether to use Graze", () => {
    const state = grazeBattle();
    const result = resolveGrazeAttack(state, rollFills(state, MISS));

    expect(result).toMatchObject({
      tag: "needsHoles",
      frontier: {
        kind: "holes",
        holes: [
          {
            kind: "unitFeatureDecision",
            holeId: WEAPON_MASTERY_GRAZE_DECISION_HOLE_ID,
            label: "Use Graze",
            choices: ["use", "decline"],
          },
        ],
      },
    });
    if (result.tag !== "needsHoles") throw new Error("Expected holes.");
    expect(actionSpent(result.state)).toBe(false);
  });

  test("using Graze deals the attack's ability modifier as the weapon's damage type", () => {
    const state = grazeBattle();
    const hpBefore = goblinHp(state);
    const decisionHole = requireHole(
      resolveGrazeAttack(state, rollFills(state, MISS)),
      "unitFeatureDecision",
    );

    const resolved = requireResolved(
      resolveGrazeAttack(state, [
        ...rollFills(state, MISS),
        unitFeatureDecisionFill(decisionHole, "use"),
      ]),
    );

    expect(goblinHp(resolved.state)).toBe(hpBefore - 3);
    expect(actionSpent(resolved.state)).toBe(true);
  });

  test("declining Graze deals no damage and still spends the attack", () => {
    const state = grazeBattle();
    const hpBefore = goblinHp(state);

    const resolved = requireResolved(
      resolveGrazeAttack(state, [
        ...rollFills(state, MISS),
        grazeDecisionFill("decline"),
      ]),
    );

    expect(goblinHp(resolved.state)).toBe(hpBefore);
    expect(actionSpent(resolved.state)).toBe(true);
  });

  test("Graze damage takes no damage bonus, since only the ability modifier can increase it", () => {
    const state = grazeBattle({ damageBonus: 2 });
    const hpBefore = goblinHp(state);

    const resolved = requireResolved(
      resolveGrazeAttack(state, [
        ...rollFills(state, MISS),
        grazeDecisionFill("use"),
      ]),
    );

    expect(goblinHp(resolved.state)).toBe(hpBefore - 3);
  });

  test("Graze damage uses the ability modifier of the ability the attack roll used", () => {
    const state = grazeBattle({ abilityModifier: 4 });
    const hpBefore = goblinHp(state);

    const resolved = requireResolved(
      resolveGrazeAttack(state, [
        ...rollFills(state, MISS),
        grazeDecisionFill("use"),
      ]),
    );

    expect(goblinHp(resolved.state)).toBe(hpBefore - 4);
  });

  test("the target's Resistance to the weapon's damage type still halves Graze damage", () => {
    const state = withGoblinDefense(grazeBattle(), "resistances");
    const hpBefore = goblinHp(state);

    const resolved = requireResolved(
      resolveGrazeAttack(state, [
        ...rollFills(state, MISS),
        grazeDecisionFill("use"),
      ]),
    );

    expect(goblinHp(resolved.state)).toBe(hpBefore - 1);
  });

  // ASSUMPTIONS.md A54: Vulnerability still doubles Graze damage.
  test("the target's Vulnerability to the weapon's damage type doubles Graze damage", () => {
    const state = withGoblinDefense(grazeBattle(), "vulnerabilities");
    const hpBefore = goblinHp(state);

    const resolved = requireResolved(
      resolveGrazeAttack(state, [
        ...rollFills(state, MISS),
        grazeDecisionFill("use"),
      ]),
    );

    expect(goblinHp(resolved.state)).toBe(hpBefore - 6);
  });

  test("a natural 1 misses and still asks whether to use Graze", () => {
    const state = grazeBattle();

    expect(
      requireHole(
        resolveGrazeAttack(
          state,
          rollFills(state, { total: 4, naturalD20: 1 }),
        ),
        "unitFeatureDecision",
      ),
    ).toMatchObject({ holeId: WEAPON_MASTERY_GRAZE_DECISION_HOLE_ID });
  });

  test("Graze damage that drops a creature to 0 Hit Points asks whether to knock it out", () => {
    const state = startBattleRight({
      battleId: battleId("battle-graze-knock-out"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: [
            ...masteryGrazeUnitRefs(),
            testGrazeWeaponUnitRef(),
          ],
          weaponMasteries: grazeWeaponMasterySelections(),
          attack: testGrazeWeaponAttack(),
        }),
        statBlockCreatureInit({ initiative: 10, currentHp: 3 }),
      ],
    });
    const fills = [...rollFills(state, MISS), grazeDecisionFill("use")];
    const disposition = requireHole(
      resolveGrazeAttack(state, fills),
      "attackDamageDisposition",
    );
    expect(disposition).toMatchObject({
      attackerId: fighterId,
      targetId: goblinId,
      choices: [{ kind: "ordinaryDamage" }, { kind: "knockOut" }],
    });

    const resolved = requireResolved(
      resolveGrazeAttack(state, [
        ...fills,
        attackDamageDispositionFill(disposition, { kind: "ordinaryDamage" }),
      ]),
    );
    expect(goblinHp(resolved.state)).toBe(0);
    expect(actionSpent(resolved.state)).toBe(true);
  });

  test("Graze damage asks a concentrating target for its Concentration save, then completes the attack", () => {
    const state = withGoblin(grazeBattle(), (goblin) => ({
      ...goblin,
      concentration: {
        sourceProcedureRef: battleProcedureExecutionRefForTest("graze-ward"),
        effectKind: "spellEffect" as const,
      },
    }));
    const hpBefore = goblinHp(state);
    const fills = [...rollFills(state, MISS), grazeDecisionFill("use")];

    const saveHole = requireHole(
      resolveGrazeAttack(state, fills),
      "concentrationSavingThrow",
    );
    const resolved = requireResolved(
      resolveGrazeAttack(state, [
        ...fills,
        concentrationSavingThrowFill(saveHole, true),
      ]),
    );

    expect(goblinHp(resolved.state)).toBe(hpBefore - 3);
    expect(actionSpent(resolved.state)).toBe(true);
    expect(
      resolved.state.combatants.get(goblinId)?.concentration,
    ).toBeDefined();
  });

  test("after Graze damage a Hunter's Prey Ranger is still offered Horde Breaker", () => {
    const state = startBattleRight({
      battleId: battleId("battle-graze-horde-breaker"),
      combatants: [
        characterSeed({
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
        statBlockCreatureInit({
          combatantId: skeletonId,
          statBlockName: "Second Target",
          initiative: 9,
        }),
      ],
    });
    const hpBefore = goblinHp(state);
    const fills = [...rollFills(state, MISS), grazeDecisionFill("use")];

    const hordeBreaker = requireHole(
      resolveGrazeAttack(state, fills),
      "unitFeatureDecision",
    );
    expect(hordeBreaker).toMatchObject({ label: "Use Horde Breaker" });

    const resolved = requireResolved(
      resolveGrazeAttack(state, [
        ...fills,
        unitFeatureDecisionFill(hordeBreaker, "decline"),
      ]),
    );
    expect(goblinHp(resolved.state)).toBe(hpBefore - 3);
    expect(actionSpent(resolved.state)).toBe(true);
  });

  test.each([
    ["use", "use"],
    ["use", "decline"],
    ["decline", "use"],
    ["decline", "decline"],
  ] as const)(
    "primary Graze %s and Horde Breaker Graze %s are independent",
    (primaryChoice, followupChoice) => {
      const state = startBattleRight({
        battleId: battleId("battle-graze-independent-horde-breaker"),
        combatants: [
          characterSeed({
            initiative: 20,
            characterUnitRefs: [
              ...masteryGrazeUnitRefs(),
              testGrazeWeaponUnitRef(),
              huntersPreyUnitRef("hordeBreaker"),
            ],
            weaponMasteries: grazeWeaponMasterySelections(),
            attack: { ...testGrazeWeaponAttack(), damageBonus: 9 },
          }),
          statBlockCreatureInit({ initiative: 10 }),
          statBlockCreatureInit({
            combatantId: skeletonId,
            statBlockName: "Second Target",
            initiative: 9,
          }),
        ],
      });
      const primaryFills = [
        ...rollFills(state, MISS),
        grazeDecisionFill(primaryChoice),
      ];
      const horde = requireHole(
        resolveGrazeAttack(state, primaryFills),
        "unitFeatureDecision",
      );
      expect(horde).toMatchObject({ label: "Use Horde Breaker" });
      const hordeFills = [
        ...primaryFills,
        unitFeatureDecisionFill(horde, "use"),
      ];
      const target = requireHole(
        resolveGrazeAttack(state, hordeFills),
        "targetChoice",
      );
      const hordeProcedureRef =
        battleProcedureExecutionRefForSpellHoleForTest(target);
      const secondTarget = targetFill(target, skeletonId, [
        attackTargetSpatialFact(
          fighterId,
          skeletonId,
          attackExecutionSelectionForSubjectForTest(
            fighterAttackSubject(state, GRAZE_WEAPON_ID),
          ),
        ),
        {
          kind: "hordeBreakerSecondTargetEligible",
          attackerId: fighterId,
          sourceProcedureRef: hordeProcedureRef,
          originalTargetId: goblinId,
          secondTargetId: skeletonId,
        },
      ]);
      const targetedFills = [...hordeFills, secondTarget];
      const roll = requireHole(
        resolveGrazeAttack(state, targetedFills),
        "attackRoll",
      );
      const missedFills = [...targetedFills, attackRollFill(roll, MISS)];
      const awaiting = resolveGrazeAttack(state, missedFills);
      const followup = requireHole(awaiting, "unitFeatureDecision");
      expect(followup).toMatchObject({
        holeId: HUNTERS_PREY_HORDE_BREAKER_GRAZE_DECISION_HOLE_ID,
        choices: ["use", "decline"],
      });
      expect(followup.holeId).not.toBe(WEAPON_MASTERY_GRAZE_DECISION_HOLE_ID);
      // Replay the same host with the additional choice; the primary choice is
      // retained once and neither attack receives the weapon's damage bonus.
      const resolved = requireResolved(
        resolveGrazeAttack(state, [
          ...missedFills,
          unitFeatureDecisionFill(followup, followupChoice),
        ]),
      );
      expect(goblinHp(resolved.state)).toBe(
        goblinHp(state) - (primaryChoice === "use" ? 3 : 0),
      );
      expect(Number(resolved.state.combatants.get(skeletonId)?.hp)).toBe(
        Number(state.combatants.get(skeletonId)?.hp) -
          (followupChoice === "use" ? 3 : 0),
      );
      expect(
        resolved.state.currentTurnResources.huntersPreyHordeBreakerUsedThisTurn,
      ).toEqual([{ attackerId: fighterId, procedureRef: hordeProcedureRef }]);
      expect(actionSpent(resolved.state)).toBe(true);

      expect(
        resolveGrazeAttack(state, [
          ...targetedFills,
          attackRollFill(roll, HIT),
          unitFeatureDecisionFill(followup, "use"),
        ]),
      ).toMatchObject({ tag: "invalid" });
    },
  );

  test("a hit asks for weapon damage and rejects a Graze decision", () => {
    const state = grazeBattle();
    const subject = fighterAttackSubject(state, GRAZE_WEAPON_ID);
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, subject);
    expect(
      attackDamageHoleAfterHit(state, targetHole, rollHole, HIT, subject),
    ).toMatchObject({ kind: "rolledDice" });

    expect(
      resolveGrazeAttack(state, [
        ...rollFills(state, HIT),
        grazeDecisionFill("use"),
      ]),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Weapon Mastery Graze decision is only valid after an eligible Graze weapon miss.",
    });
  });

  test("a miss without Graze ends the attack, and a Graze decision is rejected", () => {
    const cases: readonly BattleState[] = [
      grazeBattle({ withMastery: false }),
      grazeBattle({ withSelection: false }),
    ];
    for (const state of cases) {
      const hpBefore = goblinHp(state);
      const resolved = requireResolved(
        resolveGrazeAttack(state, rollFills(state, MISS)),
      );
      expect(goblinHp(resolved.state)).toBe(hpBefore);
      expect(actionSpent(resolved.state)).toBe(true);

      expect(
        resolveGrazeAttack(state, [
          ...rollFills(state, MISS),
          grazeDecisionFill("use"),
        ]),
      ).toMatchObject({ tag: "invalid" });
    }
  });

  test.each([0, -1])(
    "modifier %s still offers Graze, and zero damage preserves HP, temporary HP, and Concentration",
    (abilityModifier) => {
      const state = withGoblin(grazeBattle({ abilityModifier }), (goblin) => ({
        ...goblin,
        tempHp: Hp(4),
        concentration: {
          sourceProcedureRef:
            battleProcedureExecutionRefForTest("graze-zero-ward"),
          effectKind: "spellEffect" as const,
        },
      }));
      const decision = requireHole(
        resolveGrazeAttack(state, rollFills(state, MISS)),
        "unitFeatureDecision",
      );
      expect(decision).toMatchObject({ choices: ["use", "decline"] });
      for (const choice of ["use", "decline"] as const) {
        const resolved = requireResolved(
          resolveGrazeAttack(state, [
            ...rollFills(state, MISS),
            unitFeatureDecisionFill(decision, choice),
          ]),
        );
        expect(resolved.state.combatants.get(goblinId)).toMatchObject({
          hp: state.combatants.get(goblinId)?.hp,
          tempHp: Hp(4),
          concentration: state.combatants.get(goblinId)?.concentration,
        });
        expect(actionSpent(resolved.state)).toBe(true);
      }
    },
  );

  test("rejects a primary source damage roll penalty on fixed Graze damage", () => {
    const state = grazeBattle();
    const damageRoll = requireHole(
      resolveGrazeAttack(state, rollFills(state, HIT)),
      "rolledDice",
    );
    // Deliberately malformed: the primary miss has no damage roll to penalize.
    const penalty = sourceDamageRollPenaltyRollHole({
      effectRef: battleEffectExecutionRefForTest(
        "synthetic:graze-stale-penalty",
      ),
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic:source-penalty",
      ),
      sourceCombatantId: goblinId,
      affectedCombatantId: fighterId,
      damageRollHoleId: damageRoll.holeId,
      amount: { dice: 1, dieSize: 8 },
    });
    const result = resolveGrazeAttack(state, [
      ...rollFills(state, MISS),
      grazeDecisionFill("use"),
      damageRollFillWithGroups(penalty, [[1]]),
    ]);
    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Fixed attack damage does not use a damage roll or a source damage roll penalty.",
    });
    expect(result.snapshot).toEqual(snapshotBattle(state));
  });

  test("rejects a second Graze decision", () => {
    const state = grazeBattle();
    expect(
      resolveGrazeAttack(state, [
        ...rollFills(state, MISS),
        grazeDecisionFill("use"),
        grazeDecisionFill("decline"),
      ]),
    ).toMatchObject({
      tag: "invalid",
      message: "Weapon Mastery Graze decision was filled twice.",
    });
  });

  test("rejects a Graze decision that is neither use nor decline", () => {
    const state = grazeBattle();
    const hole: BattleHole = requireHole(
      resolveGrazeAttack(state, rollFills(state, MISS)),
      "unitFeatureDecision",
    );
    expect(
      resolveGrazeAttack(state, [
        ...rollFills(state, MISS),
        unitFeatureDecisionFill(hole, "attempt"),
      ]),
    ).toMatchObject({
      tag: "invalid",
      message: "Weapon Mastery Graze decision must be use or decline.",
    });
  });
});
