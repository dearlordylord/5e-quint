// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.WEAPON_MASTERY_GRAZE
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.weapon-mastery-graze
import { Result } from "effect";
import { describe, expect, test } from "vitest";

import {
  attackDamageDispositionFill,
  attackDamageHoleAfterHit,
  attackExecutionSelectionForSubjectForTest,
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  battleAbilityModifier,
  battleFrontierInterruptDecisionForState,
  battleId,
  battleProcedureExecutionRefForTest,
  battleResolutionHolesForTest,
  characterSeed,
  concentrationSavingThrowFill,
  endTurn,
  fighterAttackSubject,
  fighterId,
  fighterVsGoblinBattle,
  findHole,
  goblinId,
  grazeWeaponMasterySelections,
  huntersPreyUnitRef,
  interruptDecisionFill,
  masteryGrazeUnitRefs,
  movementFeet,
  movementFill,
  opportunityAttackProcedureSelectionForTest,
  reactionChoiceWithSubject,
  requireHole,
  requireResolved,
  resolveBattleInterrupt,
  resolveBattleSubject,
  skeletonId,
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
import { WEAPON_MASTERY_GRAZE_DECISION_HOLE_ID } from "./battle-reducer/domain-constants.ts";
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

  test("an Opportunity Attack with a Graze weapon rejects a Graze decision", () => {
    const fighterTurn = grazeBattle();
    const goblinTurn = endTurn({ state: fighterTurn, actorId: fighterId });
    if (goblinTurn.tag !== "resolved") {
      throw new Error("Expected the Goblin's turn.");
    }
    const state = goblinTurn.state;
    const subject = {
      tag: "runtimeCommand",
      actorId: goblinId,
      command: "move",
    } as const;
    const movement = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );
    const awaiting = resolveBattleSubject({
      state,
      subject,
      fills: [
        movementFill(movement, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [
            {
              reactorId: fighterId,
              distanceFeet: movementFeet(5),
              ...attackExecutionSelectionForSubjectForTest(
                fighterAttackSubject(fighterTurn, GRAZE_WEAPON_ID),
              ),
            },
          ],
        }),
      ],
    });
    if (awaiting.tag !== "needsHoles") {
      throw new Error("Expected an Opportunity Attack window.");
    }
    const pending = battleFrontierInterruptDecisionForState(awaiting.state);
    if (pending === null) throw new Error("Expected a pending Reaction.");
    const choice = reactionChoiceWithSubject(pending.choices);
    const started = resolveBattleInterrupt({
      state: awaiting.state,
      fill: interruptDecisionFill(pending.decisionHole, {
        kind: "resolve",
        responderId: fighterId,
        choice: opportunityAttackProcedureSelectionForTest(choice),
      }),
    });
    if (started.tag !== "needsHoles") {
      throw new Error("Expected the Opportunity Attack roll.");
    }
    const roll = findHole(battleResolutionHolesForTest(started), "attackRoll");

    expect(
      resolveBattleSubject({
        state: started.state,
        subject: choice.subject,
        fills: [attackRollFill(roll, MISS), grazeDecisionFill("use")],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: "Opportunity Attack doesn't resolve Weapon Mastery Graze.",
    });
  });

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
      grazeBattle({ abilityModifier: 0 }),
      grazeBattle({ abilityModifier: -1 }),
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
