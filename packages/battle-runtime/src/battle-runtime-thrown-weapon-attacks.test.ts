// KERNEL-COVERAGE: parity-witness BATTLE.ATTACK.THROWN_WEAPON_ATTACK
// SRD 5.2.1 "Thrown": a Melee weapon with the Thrown property can be thrown to
// make a ranged attack with the ability modifier of its melee attack, and the
// thrown weapon lands where the table says, out of its owner's hand.
import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { movementFeet } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import {
  attackActionOptionsForActor,
  offHandAttackActionOptionsForActor,
} from "./battle-reducer/attack-damage-apply.ts";
import { discoverBattleActs } from "./battle-act-composition.ts";
import { ATTACK_TARGET_HOLE_ID } from "./battle-reducer/battle-runtime-protocol.ts";
import { attackHitTriggerKind } from "./battle-reducer/movement-speed.ts";
import {
  type BattleAttackProcedureExecutionRef,
  battleObjectId,
  battleTablePositionId,
} from "./identity.ts";
import {
  applyBattleHeldWeaponPickup,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type BattleTargetSpatialFact,
} from "./index.ts";
import {
  admitCharacterWeaponAttackExecutionWeapon,
  attackRollFill,
  attackTargetSpatialFact,
  battleAbilityModifier,
  battleResolutionHolesForTest,
  battleId,
  battleProcedureExecutionRefForTest,
  characterSeed,
  concentrationSavingThrowFill,
  damageRollFill,
  fighterId,
  goblinId,
  requireHole,
  readyTriggerDescriptionForTest,
  requireResolved,
  resolveBattleSubject,
  startBattleSessionRight,
  statBlockCreatureInit,
  targetFill,
  testDaggerAttack,
  testShortswordAttack,
  THROWN_WEAPON_LANDING_POSITION_FOR_TEST,
  thrownWeaponLandingFactsForTest,
  unitLibrary,
} from "./battle-runtime.test-support.ts";
import {
  spellCasterId,
  spellTargetId,
  trueStrikeUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  attackTargetFill,
  damageRollFillWithGroups,
  requireHole as requireFixtureHole,
  weaponAttackSubject,
  zeroAbilityWeaponAttackWithSyntheticMastery,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import { spellAct } from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  classLevel,
  proficiencyBonus,
} from "./unit-profile-admission.test-support.ts";

const mainDaggerId = battleObjectId("main:weapon_dagger");
const offHandDaggerId = battleObjectId("off:weapon_dagger");

function offHandDaggerAttack() {
  return { ...testDaggerAttack(), weaponObjectId: offHandDaggerId };
}

type DaggerBattleInput = {
  readonly mainHand: "dagger" | "shortsword";
  /** The Goblin acts first, so the fighter can react on the Goblin's turn. */
  readonly goblinActsFirst?: true;
};

function battleWithDaggers(input: DaggerBattleInput): BattleState {
  return sessionWithDaggers(input).state;
}

function sessionWithDaggers(input: DaggerBattleInput) {
  return startBattleSessionRight({
    battleId: battleId("battle-thrown-weapons"),
    combatants: [
      characterSeed({
        initiative: 20,
        attack:
          input.mainHand === "dagger"
            ? testDaggerAttack()
            : testShortswordAttack(),
        offHandAttack: offHandDaggerAttack(),
        selectedLoadout: {
          weapon:
            input.mainHand === "dagger"
              ? {
                  itemId: mainDaggerId,
                  unitId: parseSharedUnitId("weapon_dagger"),
                  grip: "one_handed",
                }
              : {
                  itemId: battleObjectId("main:weapon_shortsword"),
                  unitId: parseSharedUnitId("weapon_shortsword"),
                  grip: "one_handed",
                },
          offHandWeapon: {
            itemId: offHandDaggerId,
            unitId: parseSharedUnitId("weapon_dagger"),
          },
        },
      }),
      statBlockCreatureInit({
        initiative: input.goblinActsFirst === true ? 30 : 10,
      }),
    ],
  });
}

const spearId = battleObjectId("main:weapon_spear");

/**
 * A Spear goes through Battle's own weapon admission, with no synthetic
 * mastery: of the published Thrown weapons, it is the one Battle admits today.
 */
function battleWithSpear(): BattleState {
  const spear = unitLibrary.requireUnit("weapon_spear");
  if (spear.kind !== "weapon") {
    throw new Error("Expected Spear weapon Unit.");
  }
  return startBattleSessionRight({
    battleId: battleId("battle-thrown-spear"),
    combatants: [
      characterSeed({
        initiative: 20,
        attack: {
          kind: "weapon",
          ...admitCharacterWeaponAttackExecutionWeapon(spear, spearId),
          ability: "str",
          abilityModifier: battleAbilityModifier(3),
        },
        selectedLoadout: {
          weapon: {
            itemId: spearId,
            unitId: parseSharedUnitId("weapon_spear"),
            grip: "one_handed",
          },
        },
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  }).state;
}

function attackSubjectFor(
  state: BattleState,
  weaponDelivery: "thrown" | undefined,
): Extract<
  BattleSubject,
  { readonly action: "attack"; readonly attackAbility: unknown }
> {
  const option = attackActionOptionsForActor(state, fighterId).find(
    (attack) =>
      attack.kind === "weapon" && attack.weaponDelivery === weaponDelivery,
  );
  if (option === undefined || option.kind !== "weapon") {
    throw new Error("Expected the fighter's weapon attack option.");
  }
  return {
    tag: "action",
    actorId: fighterId,
    action: "attack",
    procedureRef: option.procedureRef,
    attackAbility: option.ability,
    attackDamageType: option.weapon.damage.damageType,
    ...(weaponDelivery === undefined ? {} : { weaponDelivery }),
  };
}

function thrownOffHandSubject(
  state: BattleState,
): Extract<BattleSubject, { readonly action: "offHandAttack" }> {
  const option = offHandAttackActionOptionsForActor(state, fighterId).find(
    (attack) => attack.weaponDelivery === "thrown",
  );
  if (option === undefined) {
    throw new Error("Expected a thrown off-hand Dagger option.");
  }
  return {
    tag: "bonusAction",
    actorId: fighterId,
    action: "offHandAttack",
    procedureRef: option.procedureRef,
    attackAbility: option.ability,
    attackDamageType: option.weapon.damage.damageType,
    weaponDelivery: "thrown",
  };
}

function thrownTargetFill(
  state: BattleState,
  subject: BattleSubject,
  extraFacts: readonly BattleTargetSpatialFact[] = [],
  distanceFeet = movementFeet(15),
): BattleFill {
  const hole = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  if (hole.attack === undefined) {
    throw new Error("Expected an attack target hole.");
  }
  return targetFill(hole, goblinId, [
    attackTargetSpatialFact(
      fighterId,
      goblinId,
      hole.attack.selection,
      distanceFeet,
    ),
    ...extraFacts,
  ]);
}

type ProximityEnemies = Extract<
  BattleTargetSpatialFact,
  { readonly kind: "rangedAttackEnemyProximity" }
>["enemies"];

function landingFact(
  subject: { readonly procedureRef: BattleAttackProcedureExecutionRef },
  positionId = battleTablePositionId("goblin-space"),
): Extract<BattleTargetSpatialFact, { readonly kind: "thrownWeaponLanding" }> {
  return {
    kind: "thrownWeaponLanding",
    attackerId: fighterId,
    procedureRef: subject.procedureRef,
    positionId,
  };
}

function noEnemyNear(
  subject: { readonly procedureRef: BattleAttackProcedureExecutionRef },
  enemies: ProximityEnemies = [],
): BattleTargetSpatialFact {
  return {
    kind: "rangedAttackEnemyProximity",
    attackerId: fighterId,
    procedureRef: subject.procedureRef,
    enemies,
  };
}

function throwToCompletion(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly facts: readonly BattleTargetSpatialFact[];
  readonly attackTotal: number;
}) {
  const target = thrownTargetFill(input.state, input.subject, input.facts);
  const roll = requireHole(
    resolveBattleSubject({
      state: input.state,
      subject: input.subject,
      fills: [target],
    }),
    "attackRoll",
  );
  const rolled = resolveBattleSubject({
    state: input.state,
    subject: input.subject,
    fills: [
      target,
      attackRollFill(roll, { total: input.attackTotal, naturalD20: 10 }),
    ],
  });
  if (rolled.tag !== "needsHoles") return rolled;
  const damage = requireHole(rolled, "rolledDice");
  return resolveBattleSubject({
    state: input.state,
    subject: input.subject,
    fills: [
      target,
      attackRollFill(roll, { total: input.attackTotal, naturalD20: 10 }),
      damageRollFill(damage, 3),
    ],
  });
}

function thrownDaggerDrop(subject: {
  readonly procedureRef: BattleAttackProcedureExecutionRef;
}) {
  return {
    kind: "objectDropped",
    actorId: fighterId,
    objectId: mainDaggerId,
    source: {
      kind: "thrownWeaponAttack",
      procedureRef: subject.procedureRef,
    },
  } as const;
}

function withConcentratingGoblin(state: BattleState): BattleState {
  const goblin = state.combatants.get(goblinId);
  if (goblin === undefined) {
    throw new Error("Expected the Goblin target.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(goblinId, {
      ...goblin,
      concentration: {
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          "synthetic-thrown-target-concentration",
        ),
        effectKind: "spellEffect",
      },
    }),
  };
}

function withReadiedThrownDagger(state: BattleState) {
  const subject = attackSubjectFor(state, "thrown");
  const readied: BattleState = {
    ...state,
    readiedResponses: new Map(state.readiedResponses).set(fighterId, {
      trigger: readyTriggerDescriptionForTest("the Goblin moves"),
      response: {
        kind: "attack",
        selection: {
          procedureRef: subject.procedureRef,
          attackAbility: subject.attackAbility,
          attackDamageType: subject.attackDamageType,
          weaponDelivery: "thrown",
        },
      },
      expiresAt: { kind: "startOfTurn", combatantId: fighterId },
    }),
  };
  const release = {
    tag: "runtimeCommand",
    actorId: goblinId,
    command: "releaseReadiedAttack",
    reactorId: fighterId,
    targetId: goblinId,
    procedureRef: subject.procedureRef,
  } as const satisfies BattleSubject;
  return { state: readied, attack: subject, release };
}

describe("battle runtime: thrown weapon attacks", () => {
  test("a held Dagger offers a thrown ranged attack beside its melee attack, with the same ability", () => {
    const state = battleWithDaggers({ mainHand: "dagger" });
    const daggerOptions = attackActionOptionsForActor(state, fighterId).filter(
      (attack) => attack.kind === "weapon",
    );

    expect(daggerOptions.map((attack) => attack.weaponDelivery)).toEqual([
      undefined,
      "thrown",
    ]);
    const [melee, thrown] = daggerOptions;
    expect(thrown?.ability).toBe(melee?.ability);
    expect(thrown?.abilityModifier).toBe(melee?.abilityModifier);

    const hole = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubjectFor(state, "thrown"),
        fills: [],
      }),
      "targetChoice",
    );
    expect(hole.attack).toMatchObject({
      selection: { weaponDelivery: "thrown" },
      targetConstraint: {
        kind: "rangedRange",
        normalFeet: movementFeet(20),
        longFeet: movementFeet(60),
      },
      requiresThrownWeaponLanding: true,
    });
    const meleeHole = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubjectFor(state, undefined),
        fills: [],
      }),
      "targetChoice",
    );
    expect(meleeHole.attack?.targetConstraint.kind).toBe("meleeReach");
    expect(meleeHole.attack?.requiresThrownWeaponLanding).toBeUndefined();
  });

  test("the thrown Dagger act names the throw beside the melee Dagger act", () => {
    const acts = discoverBattleActs(sessionWithDaggers({ mainHand: "dagger" }));
    const summaries = acts.flatMap((act) =>
      act.subject.tag === "bonusAction" ||
      (act.subject.tag === "action" && act.subject.action === "attack")
        ? [act.summary]
        : [],
    );

    expect(summaries).toEqual(
      expect.arrayContaining([
        "Take the Attack action with Dagger.",
        "Take the Attack action by throwing Dagger.",
      ]),
    );
  });

  test("a thrown Dagger lands at the table's position on a hit, out of the hand, and its owner can pick it up", () => {
    const state = battleWithDaggers({ mainHand: "dagger" });
    const subject = attackSubjectFor(state, "thrown");
    const landingPosition = battleTablePositionId("goblin-space");
    const completed = requireResolved(
      throwToCompletion({
        state,
        subject,
        facts: [noEnemyNear(subject), landingFact(subject, landingPosition)],
        attackTotal: 20,
      }),
    );

    expect(completed.droppedObjects).toEqual([
      {
        kind: "objectDropped",
        actorId: fighterId,
        objectId: mainDaggerId,
        source: {
          kind: "thrownWeaponAttack",
          procedureRef: subject.procedureRef,
        },
      },
    ]);
    expect(
      completed.state.groundObjects.get(fighterId)?.get(mainDaggerId),
    ).toEqual({
      positionId: landingPosition,
      source: {
        kind: "thrownWeaponAttack",
        procedureRef: subject.procedureRef,
      },
    });
    expect(
      attackActionOptionsForActor(completed.state, fighterId).map(
        (attack) => attack.kind,
      ),
    ).toEqual(["unarmedStrike"]);

    const pickedUp = applyBattleHeldWeaponPickup(completed.state, {
      interaction: {
        actorId: fighterId,
        objectId: mainDaggerId,
        actorSpace: { kind: "actorSpace", positionId: landingPosition },
      },
      loadoutSlot: "mainWeapon",
    });
    if (pickedUp.tag !== "applied") {
      throw new Error(`Expected the pickup, got ${pickedUp.reason}.`);
    }
    expect(
      attackActionOptionsForActor(pickedUp.state, fighterId)
        .filter((attack) => attack.kind === "weapon")
        .map((attack) => attack.weaponDelivery),
    ).toEqual([undefined, "thrown"]);
  });

  test("a Spear admitted without a synthetic mastery is thrown at 20/60 and lands out of the hand", () => {
    const state = battleWithSpear();
    const subject = attackSubjectFor(state, "thrown");
    const hole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    expect(hole.attack).toMatchObject({
      targetConstraint: {
        kind: "rangedRange",
        normalFeet: movementFeet(20),
        longFeet: movementFeet(60),
      },
      requiresThrownWeaponLanding: true,
    });

    const landingPosition = battleTablePositionId("goblin-space");
    const completed = requireResolved(
      throwToCompletion({
        state,
        subject,
        facts: [noEnemyNear(subject), landingFact(subject, landingPosition)],
        attackTotal: 20,
      }),
    );
    expect(
      completed.state.groundObjects.get(fighterId)?.get(spearId)?.positionId,
    ).toBe(landingPosition);
    expect(
      attackActionOptionsForActor(completed.state, fighterId).map(
        (attack) => attack.kind,
      ),
    ).not.toContain("weapon");
  });

  test("a thrown Dagger also leaves the hand on a miss", () => {
    const state = battleWithDaggers({ mainHand: "dagger" });
    const subject = attackSubjectFor(state, "thrown");
    const completed = requireResolved(
      throwToCompletion({
        state,
        subject,
        facts: [noEnemyNear(subject), landingFact(subject)],
        attackTotal: 2,
      }),
    );

    expect(
      completed.state.groundObjects.get(fighterId)?.has(mainDaggerId),
    ).toBe(true);
  });

  test("a melee Dagger attack keeps the Dagger in hand", () => {
    const state = battleWithDaggers({ mainHand: "dagger" });
    const subject = attackSubjectFor(state, undefined);
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );
    const completed = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 2, naturalD20: 2 }),
        ],
      }),
    );

    expect(completed.state.groundObjects.has(fighterId)).toBe(false);
    expect(completed.droppedObjects).toBeUndefined();
  });

  test("a thrown attack's target needs one landing fact scoped to its attack", () => {
    const state = battleWithDaggers({ mainHand: "dagger" });
    const subject = attackSubjectFor(state, "thrown");
    const melee = attackSubjectFor(state, undefined);
    const tryTarget = (facts: readonly BattleTargetSpatialFact[]) =>
      resolveBattleSubject({
        state,
        subject,
        fills: [
          thrownTargetFill(state, subject, [noEnemyNear(subject), ...facts]),
        ],
      });

    expect(tryTarget([landingFact(melee), landingFact(melee)])).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
    expect(
      tryTarget([
        {
          ...landingFact(subject),
          attackerId: goblinId,
        },
      ]),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Thrown weapon attack target requires one thrown weapon landing fact scoped to the attacker and procedure.",
    });
    expect(
      resolveBattleSubject({
        state,
        subject: melee,
        fills: [
          targetFill(
            requireHole(
              resolveBattleSubject({ state, subject: melee, fills: [] }),
              "targetChoice",
            ),
            goblinId,
            [
              attackTargetSpatialFact(
                fighterId,
                goblinId,
                melee,
                movementFeet(5),
              ),
              landingFact(melee),
            ],
          ),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Only a thrown weapon attack takes a thrown weapon landing fact.",
    });
  });

  test("a thrown attack is a ranged attack: long range and close combat give Disadvantage", () => {
    const state = battleWithDaggers({ mainHand: "dagger" });
    const subject = attackSubjectFor(state, "thrown");
    const rollModeAt = (distanceFeet: number, enemies: ProximityEnemies) =>
      requireHole(
        resolveBattleSubject({
          state,
          subject,
          fills: [
            thrownTargetFill(
              state,
              subject,
              [noEnemyNear(subject, enemies), landingFact(subject)],
              movementFeet(distanceFeet),
            ),
          ],
        }),
        "attackRoll",
      ).rollMode;

    expect(rollModeAt(20, [])).toBeUndefined();
    expect(rollModeAt(40, [])).toBe("disadvantage");
    expect(
      rollModeAt(5, [
        {
          enemyId: goblinId,
          distanceFeet: movementFeet(5),
          enemyCanSeeAttacker: true,
        },
      ]),
    ).toBe("disadvantage");
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          thrownTargetFill(
            state,
            subject,
            [noEnemyNear(subject), landingFact(subject)],
            movementFeet(65),
          ),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
  });

  test("a thrown off-hand Dagger makes the Light extra attack after a Shortsword attack", () => {
    const state = battleWithDaggers({ mainHand: "shortsword" });
    const shortsword = attackSubjectFor(state, undefined);
    const shortswordTarget = requireHole(
      resolveBattleSubject({ state, subject: shortsword, fills: [] }),
      "targetChoice",
    );
    const shortswordRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: shortsword,
        fills: [targetFill(shortswordTarget, goblinId)],
      }),
      "attackRoll",
    );
    const afterShortsword = requireResolved(
      resolveBattleSubject({
        state,
        subject: shortsword,
        fills: [
          targetFill(shortswordTarget, goblinId),
          attackRollFill(shortswordRoll, { total: 2, naturalD20: 2 }),
        ],
      }),
    ).state;
    const subject = thrownOffHandSubject(afterShortsword);

    const offHandTarget = requireHole(
      resolveBattleSubject({ state: afterShortsword, subject, fills: [] }),
      "targetChoice",
    );
    expect(
      resolveBattleSubject({
        state: afterShortsword,
        subject,
        fills: [
          {
            kind: "targetChoice",
            holeId: offHandTarget.holeId,
            value: goblinId,
            spatialFacts: [
              attackTargetSpatialFact(
                fighterId,
                goblinId,
                subject,
                movementFeet(15),
              ),
              landingFact(subject),
            ],
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Ranged attack target requires one scoped enemy proximity qualification; supply enemies: [] only after checking no enemies qualify.",
    });
    const completed = requireResolved(
      throwToCompletion({
        state: afterShortsword,
        subject,
        facts: [noEnemyNear(subject), landingFact(subject)],
        attackTotal: 20,
      }),
    );
    expect(
      completed.state.groundObjects.get(fighterId)?.get(offHandDaggerId)
        ?.source,
    ).toEqual({
      kind: "thrownWeaponAttack",
      procedureRef: subject.procedureRef,
    });
    expect(completed.droppedObjects).toEqual([
      {
        kind: "objectDropped",
        actorId: fighterId,
        objectId: offHandDaggerId,
        source: {
          kind: "thrownWeaponAttack",
          procedureRef: subject.procedureRef,
        },
      },
    ]);
    expect(completed.snapshot.turn.bonusActionQuotaAvailable).toBe(false);
  });

  test("after throwing the main-hand Dagger, the off-hand Dagger can still make the Light extra attack", () => {
    const state = battleWithDaggers({ mainHand: "dagger" });
    const subject = attackSubjectFor(state, "thrown");
    const afterThrow = requireResolved(
      throwToCompletion({
        state,
        subject,
        facts: [noEnemyNear(subject), landingFact(subject)],
        attackTotal: 2,
      }),
    ).state;

    expect(
      offHandAttackActionOptionsForActor(afterThrow, fighterId).map(
        (attack) => [attack.weaponObjectId, attack.weaponDelivery],
      ),
    ).toEqual([
      [offHandDaggerId, undefined],
      [offHandDaggerId, "thrown"],
    ]);
  });

  test("a thrown Dagger hit counts as a Melee weapon hit for after-hit triggers", () => {
    const state = battleWithDaggers({ mainHand: "dagger" });
    const thrown = attackActionOptionsForActor(state, fighterId).find(
      (attack) =>
        attack.kind === "weapon" && attack.weaponDelivery === "thrown",
    );
    if (thrown === undefined) {
      throw new Error("Expected the thrown Dagger option.");
    }

    expect(attackHitTriggerKind(thrown)).toBe("meleeWeapon");
  });

  test("a thrown Dagger that waits on its target's Concentration save lands once and is reported once", () => {
    const state = withConcentratingGoblin(
      battleWithDaggers({ mainHand: "dagger" }),
    );
    const subject = attackSubjectFor(state, "thrown");
    const target = thrownTargetFill(state, subject, [
      noEnemyNear(subject),
      landingFact(subject),
    ]);
    const roll = requireHole(
      resolveBattleSubject({ state, subject, fills: [target] }),
      "attackRoll",
    );
    const hit = attackRollFill(roll, { total: 20, naturalD20: 10 });
    const damage = requireHole(
      resolveBattleSubject({ state, subject, fills: [target, hit] }),
      "rolledDice",
    );
    const attackFills = [target, hit, damageRollFill(damage, 3)];
    const awaitingSave = resolveBattleSubject({
      state,
      subject,
      fills: attackFills,
    });
    const save = requireHole(awaitingSave, "concentrationSavingThrow");
    if (awaitingSave.tag !== "needsHoles") {
      throw new Error("Expected the Concentration save.");
    }

    const resumed = requireResolved(
      resolveBattleSubject({
        state: awaitingSave.state,
        subject,
        fills: [concentrationSavingThrowFill(save, true)],
      }),
    );
    expect(resumed.droppedObjects).toEqual([thrownDaggerDrop(subject)]);
    expect(
      resumed.state.groundObjects.get(fighterId)?.get(mainDaggerId)?.positionId,
    ).toBe(battleTablePositionId("goblin-space"));

    const replayed = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [...attackFills, concentrationSavingThrowFill(save, true)],
      }),
    );
    expect(replayed.droppedObjects).toEqual([thrownDaggerDrop(subject)]);
  });

  test("Ready offers the thrown Dagger as its own response beside the melee Dagger", () => {
    const state = battleWithDaggers({ mainHand: "dagger" });
    const thrown = attackSubjectFor(state, "thrown");
    const hole = requireHole(
      resolveBattleSubject({
        state,
        subject: { tag: "action", actorId: fighterId, action: "ready" },
        fills: [],
      }),
      "readyDeclaration",
    );

    expect(
      hole.responseChoices.filter(
        (response) =>
          response.kind === "attack" &&
          response.selection.procedureRef === thrown.procedureRef,
      ),
    ).toEqual([
      {
        kind: "attack",
        selection: {
          procedureRef: thrown.procedureRef,
          attackAbility: thrown.attackAbility,
          attackDamageType: thrown.attackDamageType,
        },
      },
      {
        kind: "attack",
        selection: {
          procedureRef: thrown.procedureRef,
          attackAbility: thrown.attackAbility,
          attackDamageType: thrown.attackDamageType,
          weaponDelivery: "thrown",
        },
      },
    ]);
  });

  test("a readied thrown Dagger needs a landing fact, stays in hand until its damage, then lands", () => {
    const { state, attack, release } = withReadiedThrownDagger(
      battleWithDaggers({ mainHand: "dagger", goblinActsFirst: true }),
    );
    const targetFacts = (facts: readonly BattleTargetSpatialFact[]) => ({
      kind: "targetSpatialFacts" as const,
      holeId: ATTACK_TARGET_HOLE_ID,
      spatialFacts: [
        attackTargetSpatialFact(fighterId, goblinId, attack, movementFeet(15)),
        noEnemyNear(attack),
        ...facts,
      ],
    });

    expect(
      resolveBattleSubject({
        state,
        subject: release,
        fills: [targetFacts([])],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Thrown weapon attack target requires one thrown weapon landing fact scoped to the attacker and procedure.",
    });

    const target = targetFacts([landingFact(attack)]);
    const roll = requireHole(
      resolveBattleSubject({ state, subject: release, fills: [target] }),
      "attackRoll",
    );
    const hit = attackRollFill(roll, { total: 20, naturalD20: 15 });
    const awaitingDamage = resolveBattleSubject({
      state,
      subject: release,
      fills: [target, hit],
    });
    const damage = requireHole(awaitingDamage, "rolledDice");
    if (awaitingDamage.tag !== "needsHoles") {
      throw new Error("Expected the readied attack's damage hole.");
    }
    expect(awaitingDamage.state.groundObjects.has(fighterId)).toBe(false);

    const resolved = requireResolved(
      resolveBattleSubject({
        state: awaitingDamage.state,
        subject: release,
        fills: [target, hit, damageRollFill(damage, 3)],
      }),
    );
    expect(resolved.droppedObjects).toEqual([thrownDaggerDrop(attack)]);
    expect(
      resolved.state.groundObjects.get(fighterId)?.get(mainDaggerId)?.source,
    ).toEqual({
      kind: "thrownWeaponAttack",
      procedureRef: attack.procedureRef,
    });
  });

  test("a readied thrown Dagger also lands on a miss", () => {
    const { state, attack, release } = withReadiedThrownDagger(
      battleWithDaggers({ mainHand: "dagger", goblinActsFirst: true }),
    );
    const target = {
      kind: "targetSpatialFacts" as const,
      holeId: ATTACK_TARGET_HOLE_ID,
      spatialFacts: [
        attackTargetSpatialFact(fighterId, goblinId, attack, movementFeet(15)),
        noEnemyNear(attack),
        landingFact(attack),
      ],
    };
    const roll = requireHole(
      resolveBattleSubject({ state, subject: release, fills: [target] }),
      "attackRoll",
    );
    const missed = requireResolved(
      resolveBattleSubject({
        state,
        subject: release,
        fills: [target, attackRollFill(roll, { total: 2, naturalD20: 2 })],
      }),
    );

    expect(missed.droppedObjects).toEqual([thrownDaggerDrop(attack)]);
  });

  test("the test helper's default landing fact lands at its default position", () => {
    const state = battleWithDaggers({ mainHand: "dagger" });
    const subject = attackSubjectFor(state, "thrown");
    const completed = requireResolved(
      throwToCompletion({ state, subject, facts: [], attackTotal: 2 }),
    );

    expect(
      completed.state.groundObjects.get(fighterId)?.get(mainDaggerId)
        ?.positionId,
    ).toBe(THROWN_WEAPON_LANDING_POSITION_FOR_TEST);
  });
});

const dartId = battleObjectId("main:weapon_dart");

/** A Wizard holding a Dart, who knows True Strike. */
function dartBattle() {
  return spellBattle({
    cantrips: [spellRecord(trueStrikeUnitId)],
    spellSlots: [],
    attack: zeroAbilityWeaponAttackWithSyntheticMastery("weapon_dart"),
    selectedLoadout: {
      weapon: {
        itemId: dartId,
        unitId: parseSharedUnitId("weapon_dart"),
        grip: "one_handed",
      },
    },
    casterClassLevels: [{ className: "wizard", level: classLevel(5) }],
    casterProficiencyBonus: proficiencyBonus(3),
    casterWeaponProficiencies: [
      { kind: "weapon_category", category: "simple" },
    ],
    targetHp: 20,
    targetMaxHp: 20,
  });
}

function dartTargetFill(holes: readonly BattleHole[]) {
  const hole = requireFixtureHole(holes, "targetChoice");
  expect(hole.attack?.requiresThrownWeaponLanding).toBe(true);
  return attackTargetFill(hole, spellCasterId, spellTargetId, [
    ...thrownWeaponLandingFactsForTest(hole),
  ]);
}

/** The open holes of a Dart attack that still waits on input. */
function dartHoles(result: BattleResolutionResult): readonly BattleHole[] {
  if (result.tag !== "needsHoles") {
    throw new Error(
      `Expected the Dart attack to need input, got ${result.tag}.`,
    );
  }
  return battleResolutionHolesForTest(result);
}

/** The Dart on the ground, and the result's one report of it. */
function expectDartLandedAndReported(result: BattleResolutionResult) {
  const resolved = requireResolved(result);
  const landed = resolved.state.groundObjects.get(spellCasterId)?.get(dartId);
  expect(landed?.positionId).toBe(THROWN_WEAPON_LANDING_POSITION_FOR_TEST);
  expect(resolved.droppedObjects).toEqual([
    {
      kind: "objectDropped",
      actorId: spellCasterId,
      objectId: dartId,
      source: landed?.source,
    },
  ]);
}

// SRD 5.2.1 Dart: a Ranged weapon with the Thrown property and no Ammunition,
// so its every attack is a throw.
describe("battle runtime: a thrown Dart", () => {
  test("an Attack action with a Dart needs a landing fact and lands the Dart", () => {
    const session = dartBattle();
    const subject = weaponAttackSubject(session, "Dart");
    const target = dartTargetFill(
      dartHoles(
        resolveBattleSubject({ state: session.state, subject, fills: [] }),
      ),
    );
    const roll = requireFixtureHole(
      dartHoles(
        resolveBattleSubject({
          state: session.state,
          subject,
          fills: [target],
        }),
      ),
      "attackRoll",
    );
    expectDartLandedAndReported(
      resolveBattleSubject({
        state: session.state,
        subject,
        fills: [target, attackRollFill(roll, { total: 2, naturalD20: 2 })],
      }),
    );
  });

  test("a True Strike attack with a Dart lands the Dart and reports it", () => {
    const session = dartBattle();
    const act = spellAct({ session, spellId: trueStrikeUnitId });
    const damageType: BattleFill = {
      kind: "damageTypeChoice",
      holeId: requireFixtureHole(act.initialHoles, "damageTypeChoice").holeId,
      value: "radiant",
    };
    const state = session.state;
    const target = dartTargetFill(
      dartHoles(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [damageType],
        }),
      ),
    );
    const roll = attackRollFill(
      requireFixtureHole(
        dartHoles(
          resolveBattleSubject({
            state,
            subject: act.subject,
            fills: [damageType, target],
          }),
        ),
        "attackRoll",
      ),
      { total: 20, naturalD20: 12 },
    );
    const damage = damageRollFillWithGroups(
      requireFixtureHole(
        dartHoles(
          resolveBattleSubject({
            state,
            subject: act.subject,
            fills: [damageType, target, roll],
          }),
        ),
        "rolledDice",
      ),
      [[2], [3]],
    );
    expectDartLandedAndReported(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [damageType, target, roll, damage],
      }),
    );
  });
});
