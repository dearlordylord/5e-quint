import { assertStatBlockForTest } from "@dnd/surface/surface/stat-block-catalog.test-support";
// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md:584-588 (attack target, modifiers, resolution, and damage)
// - .references/srd-5.2.1/Playing-the-Game.md:618-624 (ranged range and Disadvantage)
// - .references/srd-5.2.1/Playing-the-Game.md:694-702 (damage rolls)
// - .references/srd-5.2.1/Equipment.md:54-56 (Light property extra attack)
// - .references/srd-5.2.1/Playing-the-Game.md:738-780 (healing, dropping to 0 Hit Points, and Death Saving Throws)
// - .references/srd-5.2.1/Classes/Monk.md:102-106 (Deflect Attacks reaction, Focus, and redirection)

import { describe, expect, test } from "vitest";
import {
  statBlockId,
  unitId as parseSharedUnitId,
} from "@dnd/shared/game-facts";

import {
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
  Hp,
  attackRollFill,
  battleId,
  characterBonusAttackSubjectForTest,
  characterBattleFeatureInitForTest,
  characterSeed,
  damageRollFill,
  battleFrontierInterruptDecisionForState,
  damageRollFillWithGroups,
  findHole,
  fighterAttackSubject,
  fighterId,
  fighterVsGoblinBattle,
  goblinAttackSubject,
  goblinId,
  goblinTurnBattle,
  interruptDecisionFill,
  monkDeflectAttacksFocusResource,
  reactionModifierChoice,
  reactionModifierReductionRollFill,
  reactionModifierUnitRefWithProfile,
  requireHole,
  requireResolved,
  resolveBattleInterrupt,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  startBattleRight,
  statBlockCatalog,
  statBlockAttackSubjectForTest,
  statBlockCreatureInit,
  targetFill,
  testDaggerAttack,
  testShortswordAttack,
  unitLibrary,
} from "./battle-runtime.test-support.ts";
import type {
  BattleState,
  BattleSubject,
  CombatantId,
} from "./battle-runtime.test-support.ts";
import {
  applyBattleHitPointDamage,
  applyHpHealing,
} from "./battle-reducer/damage-apply.ts";
import { classLevel } from "@dnd/shared/types";
import { armorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { battleObjectId, combatantId } from "./identity.ts";

const offHandDefenderId = combatantId("gh227-offhand-monk");
const deflectMonkId = combatantId("gh227-deflect-monk");
const redirectTargetId = combatantId("gh227-deflect-target");
const strengthAttackerId = combatantId("gh227-strength-attacker");

describe("GitHub #227 attack and damage coverage", () => {
  test("rejects replaying an Attack action after its action resource was spent", () => {
    const state = fighterVsGoblinBattle();
    const subject = fighterAttackSubject(state, "Longsword");
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
    const first = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 1, naturalD20: 1 }),
        ],
      }),
    );

    const replay = resolveBattleSubject({
      state: first.state,
      subject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, { total: 1, naturalD20: 1 }),
      ],
    });

    expect(replay).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("opens a target reaction window for a Light-property Bonus Action hit", () => {
    const state = startBattleRight({
      battleId: battleId("gh227-off-hand-reaction"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: testShortswordAttack(),
          offHandAttack: testDaggerAttack(),
          selectedLoadout: {
            weapon: {
              itemId: testShortswordAttack().weaponObjectId,
              unitId: parseSharedUnitId("weapon_shortsword"),
              grip: "one_handed",
            },
            offHandWeapon: {
              itemId: testDaggerAttack().weaponObjectId,
              unitId: parseSharedUnitId("weapon_dagger"),
            },
          },
        }),
        monkDefenderInit(),
      ],
    });
    const attackSubject = fighterAttackSubject(state, "Shortsword");
    const attackTarget = requireHole(
      resolveBattleSubject({ state, subject: attackSubject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [targetFill(attackTarget, offHandDefenderId)],
      }),
      "attackRoll",
    );
    const afterAttack = requireResolved(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(attackTarget, offHandDefenderId),
          attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
        ],
      }),
    ).state;

    const subject: BattleSubject = characterBonusAttackSubjectForTest(
      afterAttack,
      fighterId,
      "offHandAttack",
    );
    const target = requireHole(
      resolveBattleSubject({ state: afterAttack, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: afterAttack,
        subject,
        fills: [targetFill(target, offHandDefenderId)],
      }),
      "attackRoll",
    );
    const awaitingReaction = resolveBattleSubject({
      state: afterAttack,
      subject,
      fills: [
        targetFill(target, offHandDefenderId),
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
      ],
    });

    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
    });
  });

  test("healing a fallen character restores one HP and resets death saves", () => {
    const fallen = startBattleRight({
      battleId: battleId("gh227-heal-fallen"),
      combatants: [
        characterSeed({ initiative: 20, currentHp: 0 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const combatant = fallen.combatants.get(fighterId);
    if (combatant === undefined) {
      throw new Error("Expected the fallen fighter.");
    }

    const healed = applyHpHealing(combatant, 1);

    expect(healed).toMatchObject({
      hp: 1,
      positiveHpUnconscious: null,
      zeroHpLifecycle: {
        policy: "usesDeathSavingThrows",
        deathSaves: {
          deathSaves: { successes: 0, failures: 0 },
        },
      },
    });
  });

  test("projects Disadvantage for a long-range ordinary object attack", () => {
    const state = goblinTurnBattle();
    const subject = goblinAttackSubject(state, "Shortbow");
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const objectId = battleObjectId("gh227-long-range-target");
    const rollHole = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          {
            kind: "objectTargetChoice",
            holeId: targetHole.holeId,
            value: objectId,
            spatialFacts: [
              {
                kind: "attackObjectTarget",
                actorId: goblinId,
                objectId,
                range: {
                  kind: "rangedRange",
                  band: "long",
                  enemyWithin5FeetCanSeeAttacker: false,
                },
                attackerCanSeeObject: true,
                cover: "none",
                armorClass: armorClass(15),
                damageDisposition: { kind: "hitPoints", hitPoints: Hp(30) },
              },
            ],
          },
        ],
      }),
      "attackRoll",
    );

    expect(rollHole.rollMode).toBe("disadvantage");
  });

  test("resolves a successful Deflect Attacks redirect without transferring damage", () => {
    const state = deflectAttacksBattle();
    const monkBefore = state.combatants.get(deflectMonkId);
    if (monkBefore?.origin.kind !== "character") {
      throw new Error("Expected the Deflect Attacks Monk.");
    }
    expect(monkBefore.reactionAvailable).toBe(true);
    expect(monkBefore.origin.resources).toEqual(
      expect.arrayContaining([expect.objectContaining({ usesRemaining: 3 })]),
    );
    const setup = goblinScimitarHitReactionSetupForTarget(state, deflectMonkId);
    if (setup.result.tag !== "needsHoles") {
      throw new Error("Expected the Deflect Attacks reaction window.");
    }
    const unit = unitLibrary.requireUnit("monk_deflect_attacks");
    const choice = reactionModifierChoice(
      battleFrontierInterruptDecisionForState(setup.result.state)!.choices,
      unit.id,
      "attackDamageReduction",
    );
    const afterReaction = resolveBattleInterrupt({
      state: setup.result.state,
      fill: interruptDecisionFill(
        findHole(setup.result.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: deflectMonkId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            procedureRef: choice.modifier.procedureRef,
            modifierKind: "attackDamageReduction",
            fills: [reactionModifierReductionRollFill(choice, 10)],
          },
        },
      ),
    });
    if (afterReaction.tag !== "needsHoles") {
      throw new Error("Expected the attack damage roll.");
    }
    const damage = requireHole(afterReaction, "rolledDice");
    const awaitingRedirect = resolveBattleSubject({
      state: afterReaction.state,
      subject: setup.subject,
      fills: [...setup.prefixFills, damageRollFill(damage, 6)],
    });
    if (awaitingRedirect.tag !== "needsHoles") {
      throw new Error("Expected the redirect target and save holes.");
    }

    const resolved = resolveBattleSubject({
      state: awaitingRedirect.state,
      subject: setup.subject,
      fills: [
        ...setup.prefixFills,
        damageRollFill(damage, 6),
        targetFill(
          findHole(awaitingRedirect.holes, "targetChoice"),
          redirectTargetId,
          [
            {
              kind: "meleeRedirectTargetWithin5Feet",
              sourceId: deflectMonkId,
              targetId: redirectTargetId,
            },
          ],
        ),
        savingThrowOutcomeFill(
          findHole(awaitingRedirect.holes, "savingThrowOutcome"),
          [{ targetId: redirectTargetId, succeeded: true }],
        ),
        damageRollFillWithGroups(
          findHole(awaitingRedirect.holes, "rolledDice"),
          [[4, 4]],
        ),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") return;
    expect(resolved.state.combatants.get(deflectMonkId)?.hp).toBe(Hp(12));
    expect(resolved.state.combatants.get(redirectTargetId)?.hp).toBe(Hp(10));
    const monkAfter = resolved.state.combatants.get(deflectMonkId);
    if (monkAfter?.origin.kind !== "character") {
      throw new Error("Expected the resolved Deflect Attacks Monk.");
    }
    expect(monkAfter.reactionAvailable).toBe(false);
    expect(monkAfter.origin.resources).toEqual(
      expect.arrayContaining([expect.objectContaining({ usesRemaining: 2 })]),
    );
  });

  test("keeps a dies-at-zero creature at zero HP when damaged again", () => {
    const initial = fighterVsGoblinBattle();
    const target = initial.combatants.get(goblinId);
    if (target === undefined) throw new Error("Expected the Goblin target.");

    const defeated = applyBattleHitPointDamage({
      saveGatedConditionDamageRepeatSave: { kind: "noRepeatSave" },
      state: initial,
      target,
      damageAmount: Number(target.hp),
      deathFailuresAtZeroHp: 1,
    });
    const zeroHpTarget = defeated.combatants.get(goblinId);
    if (zeroHpTarget === undefined) {
      throw new Error("Expected the defeated Goblin target.");
    }

    const damagedAgain = applyBattleHitPointDamage({
      saveGatedConditionDamageRepeatSave: { kind: "noRepeatSave" },
      state: defeated,
      target: zeroHpTarget,
      damageAmount: 1,
      deathFailuresAtZeroHp: 1,
    });

    expect(damagedAgain.combatants.get(goblinId)).toMatchObject({
      hp: 0,
      zeroHpLifecycle: { policy: "diesAtZeroHp" },
    });
  });

  test("resolves a Stat Block attack hit through the public subject seam", () => {
    const state = startBattleRight({
      battleId: battleId("gh227-strength-attack-hit"),
      combatants: [
        statBlockCreatureInit({
          combatantId: strengthAttackerId,
          initiative: 20,
          statBlock: assertStatBlockForTest(
            statBlockCatalog,
            statBlockId("stat_block_riding_horse"),
          ),
        }),
        characterSeed({ initiative: 10, currentHp: 12 }),
      ],
    });
    const subject = statBlockAttackSubjectForTest(
      state,
      strengthAttackerId,
      "Hooves",
      "actions",
    );
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, fighterId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, fighterId),
          attackRollFill(roll, { total: 14, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, fighterId),
        attackRollFill(roll, { total: 14, naturalD20: 10 }),
        damageRollFill(damage, 5),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: fighterId, hp: 4 }),
        ]),
      },
    });
  });

  test("resolves a Light-property Bonus Action attack after the qualifying Attack", () => {
    const state = startBattleRight({
      battleId: battleId("gh227-off-hand-hit"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: testShortswordAttack(),
          offHandAttack: testDaggerAttack(),
          selectedLoadout: {
            weapon: {
              itemId: testShortswordAttack().weaponObjectId,
              unitId: parseSharedUnitId("weapon_shortsword"),
              grip: "one_handed",
            },
            offHandWeapon: {
              itemId: testDaggerAttack().weaponObjectId,
              unitId: parseSharedUnitId("weapon_dagger"),
            },
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const attackSubject = fighterAttackSubject(state, "Shortsword");
    const attackTarget = requireHole(
      resolveBattleSubject({ state, subject: attackSubject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [targetFill(attackTarget, goblinId)],
      }),
      "attackRoll",
    );
    const afterAttack = requireResolved(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(attackTarget, goblinId),
          attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
        ],
      }),
    ).state;

    const subject: BattleSubject = characterBonusAttackSubjectForTest(
      afterAttack,
      fighterId,
      "offHandAttack",
    );
    const target = requireHole(
      resolveBattleSubject({ state: afterAttack, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: afterAttack,
        subject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: afterAttack,
        subject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state: afterAttack,
      subject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(roll, { total: 15, naturalD20: 10 }),
        damageRollFill(damage, 4),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: { bonusActionQuotaAvailable: false },
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: goblinId, hp: 6 }),
        ]),
      },
    });
  });
});

function goblinScimitarHitReactionSetupForTarget(
  state: BattleState,
  targetId: CombatantId,
) {
  const subject = goblinAttackSubject(state, "Scimitar");
  const target = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const attackRoll = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [targetFill(target, targetId)],
    }),
    "attackRoll",
  );
  const prefixFills = [
    targetFill(target, targetId),
    attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
  ];
  const result = resolveBattleSubject({ state, subject, fills: prefixFills });
  return { subject, prefixFills, result };
}

function deflectAttacksBattle() {
  const unit = unitLibrary.requireUnit("monk_deflect_attacks");
  return startBattleRight({
    battleId: battleId("gh227-deflect-success"),
    combatants: [
      statBlockCreatureInit({ initiative: 20 }),
      statBlockCreatureInit({
        combatantId: redirectTargetId,
        statBlockName: "Redirect target",
        initiative: 15,
      }),
      characterSeed({
        combatantId: deflectMonkId,
        displayName: "Monk",
        initiative: 10,
        classLevels: [{ className: "monk", level: 3 }],
        attack: null,
        resources: [monkDeflectAttacksFocusResource({ usesRemaining: 3 })],
        unitFeatures: [
          characterBattleFeatureInitForTest(unit, [
            { className: "monk", level: classLevel(3) },
          ]),
        ],
        characterUnitRefs: [
          reactionModifierUnitRefWithProfile(
            unit.id,
            ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
          ),
        ],
      }),
    ],
  });
}

function monkDefenderInit() {
  const unit = unitLibrary.requireUnit("monk_deflect_attacks");
  return characterSeed({
    combatantId: offHandDefenderId,
    displayName: "Monk defender",
    initiative: 10,
    classLevels: [{ className: "monk", level: 3 }],
    attack: null,
    resources: [monkDeflectAttacksFocusResource({ usesRemaining: 3 })],
    unitFeatures: [
      characterBattleFeatureInitForTest(unit, [
        { className: "monk", level: classLevel(3) },
      ]),
    ],
    characterUnitRefs: [
      reactionModifierUnitRefWithProfile(
        unit.id,
        ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
      ),
    ],
  });
}
