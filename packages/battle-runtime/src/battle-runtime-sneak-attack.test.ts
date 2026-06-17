import {
  startBattleRight,
  requireResolved,
  sneakAttackUnitRefs,
  fighterAttackSubject,
  attackInitialTargetHole,
  attackRollHoleAfterTarget,
  attackDamageHoleAfterHit,
  requireHole,
  targetFill,
  attackTargetFill,
  attackRollFill,
  damageRollFillWithGroups,
  attackDamageDispositionHoleAfterFills,
  attackDamageDispositionFill,
  characterSeed,
  testLongswordAttack,
  testDaggerAttack,
  statBlockCreatureInit,
  sneakAttackFeature,
  unsupportedClassRiderResource,
  fighterId,
  goblinId,
  battleId,
  combatantId,
  difficultyClass,
  discoverBattleActs,
  resolveBattleSubject,
} from "./battle-runtime-test-support.ts";
import type {
  BattleState,
  BattleSubject,
} from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: Sneak Attack", () => {
  test("Sneak Attack is exposed as an optional attack damage rider on eligible hits", () => {
    const visibleState = startBattleRight({
      battleId: battleId("battle-sneak-attack-rider"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "rogue", level: 1 }],
          unitFeatures: [sneakAttackFeature()],
          characterUnitRefs: sneakAttackUnitRefs(),
          attack: testDaggerAttack(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const rogue = visibleState.combatants.get(fighterId);
    if (rogue === undefined) {
      throw new Error("Expected Sneak Attack rogue combatant.");
    }
    const state: BattleState = {
      ...visibleState,
      combatants: new Map(visibleState.combatants).set(fighterId, {
        ...rogue,
        hidden: { discoveryDc: difficultyClass(16) },
      }),
    };
    const attackSubject = fighterAttackSubject("Dagger");
    const target = attackInitialTargetHole(state, attackSubject);
    const roll = attackRollHoleAfterTarget(state, target, attackSubject);
    const damage = attackDamageHoleAfterHit(
      state,
      target,
      roll,
      { total: 15, naturalD20: 10, rollMode: "advantage" },
      attackSubject,
    );
    expect(damage).toMatchObject({
      kind: "rolledDice",
      attackDamageRiders: [
        {
          attackerId: fighterId,
          unitId: "rogue_sneak_attack",
          label: "Sneak Attack",
          damage: { dice: 1, dieSize: 6, damageType: "piercing" },
        },
      ],
    });
    const disposition = attackDamageDispositionHoleAfterFills(
      state,
      attackSubject,
      [
        targetFill(target, goblinId),
        attackRollFill(roll, {
          total: 15,
          naturalD20: 10,
          rollMode: "advantage",
        }),
        damageRollFillWithGroups(damage, [[4], [6]], ["rogue_sneak_attack"]),
      ],
    );

    const hit = requireResolved(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, {
            total: 15,
            naturalD20: 10,
            rollMode: "advantage",
          }),
          damageRollFillWithGroups(damage, [[4], [6]], ["rogue_sneak_attack"]),
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
    expect(
      hit.state.currentTurnResources.attackDamageRidersUsedThisTurn,
    ).toEqual([{ attackerId: fighterId, unitId: "rogue_sneak_attack" }]);
  });

  test("Sneak Attack accepts caller-supplied Advantage as attack-roll Advantage", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sneak-attack-caller-advantage"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "rogue", level: 1 }],
          unitFeatures: [sneakAttackFeature()],
          characterUnitRefs: sneakAttackUnitRefs(),
          attack: testDaggerAttack(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const attackSubject = fighterAttackSubject("Dagger");
    const target = attackInitialTargetHole(state, attackSubject);
    const roll = attackRollHoleAfterTarget(state, target, attackSubject);
    const damage = attackDamageHoleAfterHit(
      state,
      target,
      roll,
      { total: 15, naturalD20: 10, rollMode: "advantage" },
      attackSubject,
    );

    expect(damage).toMatchObject({
      attackDamageRiders: [
        expect.objectContaining({ unitId: "rogue_sneak_attack" }),
      ],
    });
  });

  test("Sneak Attack is inactive before its acquired class level", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sneak-attack-before-acquired-level"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "rogue", level: 1 }],
          unitFeatures: [sneakAttackFeature({ acquiredAtLevel: 2 })],
          characterUnitRefs: sneakAttackUnitRefs(),
          attack: testDaggerAttack(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const attackSubject = fighterAttackSubject("Dagger");
    const target = attackInitialTargetHole(state, attackSubject);
    const roll = attackRollHoleAfterTarget(state, target, attackSubject);
    const damage = attackDamageHoleAfterHit(
      state,
      target,
      roll,
      { total: 15, naturalD20: 10, rollMode: "advantage" },
      attackSubject,
    );

    expect(damage).not.toHaveProperty("attackDamageRiders");
  });

  test("Sneak Attack rider is gated by weapon, roll context, and once-per-turn usage", () => {
    const allyId = combatantId("ally");
    const state = startBattleRight({
      battleId: battleId("battle-sneak-attack-rider-gates"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "rogue", level: 1 }],
          unitFeatures: [sneakAttackFeature()],
          characterUnitRefs: sneakAttackUnitRefs(),
          attack: testLongswordAttack(),
        }),
        characterSeed({
          combatantId: allyId,
          displayName: "Ally",
          initiative: 10,
          attack: null,
        }),
        statBlockCreatureInit({ initiative: 5 }),
      ],
    });
    const longswordSubject = fighterAttackSubject("Longsword");
    const target = attackInitialTargetHole(state, longswordSubject);
    const roll = attackRollHoleAfterTarget(state, target, longswordSubject);
    const longswordDamage = attackDamageHoleAfterHit(
      state,
      target,
      roll,
      { total: 15, naturalD20: 10 },
      longswordSubject,
    );
    expect(longswordDamage).not.toHaveProperty("attackDamageRiders");

    const rogue = state.combatants.get(fighterId);
    if (rogue?.origin.kind !== "character") {
      throw new Error("Expected rogue character.");
    }
    const finesseState = {
      ...state,
      combatants: new Map(state.combatants).set(fighterId, {
        ...rogue,
        origin: {
          ...rogue.origin,
          attack: testDaggerAttack(),
        },
      }),
      currentTurnResources: {
        ...state.currentTurnResources,
        attackDamageRidersUsedThisTurn: [
          { attackerId: fighterId, unitId: "rogue_sneak_attack" },
        ],
      },
    } satisfies BattleState;
    const daggerSubject = fighterAttackSubject("Dagger");
    const daggerTarget = attackInitialTargetHole(finesseState, daggerSubject);
    const daggerRoll = attackRollHoleAfterTarget(
      finesseState,
      daggerTarget,
      daggerSubject,
    );
    const usedDamage = attackDamageHoleAfterHit(
      finesseState,
      daggerTarget,
      daggerRoll,
      { total: 15, naturalD20: 10 },
      daggerSubject,
    );
    expect(usedDamage).not.toHaveProperty("attackDamageRiders");
  });

  test("Sneak Attack can use the ally-within-5ft eligibility branch", () => {
    const allyId = combatantId("sneak-ally");
    const state = startBattleRight({
      battleId: battleId("battle-sneak-attack-ally-within-5ft"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "rogue", level: 1 }],
          unitFeatures: [sneakAttackFeature()],
          characterUnitRefs: sneakAttackUnitRefs(),
          attack: testDaggerAttack(),
        }),
        characterSeed({
          combatantId: allyId,
          displayName: "Ally",
          initiative: 10,
          attack: null,
        }),
        statBlockCreatureInit({ initiative: 5 }),
      ],
    });
    const subject = fighterAttackSubject("Dagger");
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
        expect.objectContaining({ unitId: "rogue_sneak_attack" }),
      ],
    });
  });

  test("Sneak Attack ally-within-5ft branch uses resolved roll mode after Advantage and Disadvantage cancel", () => {
    const allyId = combatantId("sneak-cancel-ally");
    const base = startBattleRight({
      battleId: battleId("battle-sneak-attack-canceled-roll-mode"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "rogue", level: 1 }],
          unitFeatures: [sneakAttackFeature()],
          characterUnitRefs: sneakAttackUnitRefs(),
          attack: testDaggerAttack(),
        }),
        characterSeed({
          combatantId: allyId,
          displayName: "Ally",
          initiative: 10,
          attack: null,
        }),
        statBlockCreatureInit({ initiative: 5 }),
      ],
    });
    const rogue = base.combatants.get(fighterId);
    const targetCombatant = base.combatants.get(goblinId);
    if (rogue === undefined || targetCombatant === undefined) {
      throw new Error("Expected Sneak Attack test combatants.");
    }
    const state: BattleState = {
      ...base,
      combatants: new Map(base.combatants)
        .set(fighterId, {
          ...rogue,
          hidden: { discoveryDc: difficultyClass(16) },
        })
        .set(goblinId, {
          ...targetCombatant,
          hidden: { discoveryDc: difficultyClass(17) },
        }),
    };
    const subject = fighterAttackSubject("Dagger");
    const target = attackInitialTargetHole(state, subject);
    const roll = attackRollHoleAfterTarget(state, target, subject, goblinId);
    expect(roll).not.toHaveProperty("rollMode");
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
        expect.objectContaining({ unitId: "rogue_sneak_attack" }),
      ],
    });
  });

  test("Sneak Attack rejects uneligible selected rider ids", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sneak-attack-invalid-selected-rider"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "rogue", level: 1 }],
          unitFeatures: [sneakAttackFeature()],
          characterUnitRefs: sneakAttackUnitRefs(),
          attack: testDaggerAttack(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = fighterAttackSubject("Dagger");
    const target = attackInitialTargetHole(state, subject);
    const roll = attackRollHoleAfterTarget(state, target, subject);
    const damage = attackDamageHoleAfterHit(
      state,
      target,
      roll,
      { total: 15, naturalD20: 10, rollMode: "advantage" },
      subject,
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(
            target,
            subject.actorId,
            goblinId,
            subject.attackName,
          ),
          attackRollFill(roll, {
            total: 15,
            naturalD20: 10,
            rollMode: "advantage",
          }),
          damageRollFillWithGroups(
            damage,
            [[4], [6]],
            ["rogue_sneak_attack_typo"],
          ),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
  });

  test("Sneak Attack damage dice are doubled on critical hits", () => {
    const allyId = combatantId("critical-ally");
    const state = startBattleRight({
      battleId: battleId("battle-sneak-attack-critical"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "rogue", level: 1 }],
          unitFeatures: [sneakAttackFeature()],
          characterUnitRefs: sneakAttackUnitRefs(),
          attack: testDaggerAttack(),
        }),
        characterSeed({
          combatantId: allyId,
          displayName: "Critical Ally",
          initiative: 10,
          attack: null,
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = fighterAttackSubject("Dagger");
    const target = attackInitialTargetHole(state, subject);
    const roll = attackRollHoleAfterTarget(state, target, subject);
    const damage = attackDamageHoleAfterHit(
      state,
      target,
      roll,
      { total: 20, naturalD20: 20 },
      subject,
    );

    const hit = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(
            target,
            subject.actorId,
            goblinId,
            subject.attackName,
            [
              {
                kind: "attackerAllyWithin5FeetOfTarget",
                attackerId: subject.actorId,
                targetId: goblinId,
                allyId,
              },
            ],
          ),
          attackRollFill(roll, {
            total: 20,
            naturalD20: 20,
          }),
          damageRollFillWithGroups(
            damage,
            [
              [1, 1],
              [2, 2],
            ],
            ["rogue_sneak_attack"],
          ),
        ],
      }),
    );

    expect(hit.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: goblinId, hp: 1 }),
      ]),
    );
  });

  test("attack sight witnesses compose into attack-roll mode", () => {
    const state = startBattleRight({
      battleId: battleId("battle-attack-sight-witnesses"),
      combatants: [
        characterSeed({ initiative: 20, attack: testDaggerAttack() }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = fighterAttackSubject("Dagger");
    const target = attackInitialTargetHole(state, subject);

    const attackerCannotSeeTarget = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(target, fighterId, goblinId, subject.attackName, [
            {
              kind: "attackAttackerCannotSeeTarget",
              attackerId: fighterId,
              targetId: goblinId,
            },
          ]),
        ],
      }),
      "attackRoll",
    );
    expect(attackerCannotSeeTarget).toMatchObject({
      rollMode: "disadvantage",
    });

    const targetCannotSeeAttacker = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(target, fighterId, goblinId, subject.attackName, [
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
    expect(targetCannotSeeAttacker).toMatchObject({ rollMode: "advantage" });

    const mutualUnseen = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          attackTargetFill(target, fighterId, goblinId, subject.attackName, [
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
    expect(mutualUnseen).not.toHaveProperty("rollMode");
  });

  test("mutual unseen cancellation lets Sneak Attack use the ally-within-5-feet branch", () => {
    const allyId = combatantId("sight-sneak-ally");
    const state = startBattleRight({
      battleId: battleId("battle-sneak-attack-mutual-unseen-ally"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "rogue", level: 1 }],
          unitFeatures: [sneakAttackFeature()],
          characterUnitRefs: sneakAttackUnitRefs(),
          attack: testDaggerAttack(),
        }),
        characterSeed({
          combatantId: allyId,
          displayName: "Sight Sneak Ally",
          initiative: 10,
          attack: null,
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = fighterAttackSubject("Dagger");
    const target = attackInitialTargetHole(state, subject);
    const targetFillWithSight = attackTargetFill(
      target,
      fighterId,
      goblinId,
      subject.attackName,
      [
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
        {
          kind: "attackerAllyWithin5FeetOfTarget",
          attackerId: fighterId,
          targetId: goblinId,
          allyId,
        },
      ],
    );
    const roll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFillWithSight],
      }),
      "attackRoll",
    );
    expect(roll).not.toHaveProperty("rollMode");
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFillWithSight,
          attackRollFill(roll, { total: 20, naturalD20: 15 }),
        ],
      }),
      "rolledDice",
    );

    const damageFills = [
      targetFillWithSight,
      attackRollFill(roll, { total: 20, naturalD20: 15 }),
      damageRollFillWithGroups(damage, [[4], [4]], ["rogue_sneak_attack"]),
    ];
    const disposition = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: damageFills,
      }),
      "attackDamageDisposition",
    );
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...damageFills,
          attackDamageDispositionFill(disposition, { kind: "ordinaryDamage" }),
        ],
      }),
    );

    expect(
      resolved.state.currentTurnResources.attackDamageRidersUsedThisTurn,
    ).toEqual([
      {
        attackerId: fighterId,
        unitId: "rogue_sneak_attack",
      },
    ]);
  });

  test("Sneak Attack once-per-turn usage is scoped to the attacking creature", () => {
    const secondRogueId = combatantId("second-rogue");
    const allyId = combatantId("second-rogue-ally");
    const state = startBattleRight({
      battleId: battleId("battle-sneak-attack-two-rogues"),
      combatants: [
        characterSeed({
          combatantId: secondRogueId,
          displayName: "Second Rogue",
          initiative: 20,
          classLevels: [{ className: "rogue", level: 1 }],
          unitFeatures: [sneakAttackFeature()],
          characterUnitRefs: sneakAttackUnitRefs(),
          attack: testDaggerAttack(),
        }),
        characterSeed({
          combatantId: allyId,
          displayName: "Second Rogue Ally",
          initiative: 10,
          attack: null,
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const secondRogueSubject = {
      tag: "action",
      actorId: secondRogueId,
      action: "attack",
      attackName: "Dagger",
    } as const satisfies Extract<BattleSubject, { readonly tag: "action" }>;
    const usedByDifferentRogue = {
      ...state,
      currentTurnResources: {
        ...state.currentTurnResources,
        attackDamageRidersUsedThisTurn: [
          { attackerId: fighterId, unitId: "rogue_sneak_attack" },
        ],
      },
    } satisfies BattleState;
    const target = attackInitialTargetHole(
      usedByDifferentRogue,
      secondRogueSubject,
    );
    const roll = attackRollHoleAfterTarget(
      usedByDifferentRogue,
      target,
      secondRogueSubject,
      goblinId,
    );
    const damage = attackDamageHoleAfterHit(
      usedByDifferentRogue,
      target,
      roll,
      { total: 15, naturalD20: 10 },
      secondRogueSubject,
      goblinId,
    );

    expect(damage).toMatchObject({
      attackDamageRiders: [
        expect.objectContaining({
          attackerId: secondRogueId,
          unitId: "rogue_sneak_attack",
        }),
      ],
    });
  });

  test("class riders without admitted support profiles remain gated", () => {
    const oldClassRiders = [
      ["rogue_evasion", "Rogue Evasion"],
      ["rogue_uncanny_dodge", "Uncanny Dodge"],
      ["bard_cutting_words", "Cutting Words"],
    ] as const;
    const state = startBattleRight({
      battleId: battleId("battle-old-class-riders-support-gated"),
      combatants: [
        characterSeed({
          initiative: 20,
          resources: oldClassRiders.map(([unitId, name]) =>
            unsupportedClassRiderResource(unitId, name),
          ),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    const discoveredUnitIds = discoverBattleActs(state).flatMap((act) =>
      act.subject.tag === "unitFeature" ? [act.subject.unitId] : [],
    );
    expect(discoveredUnitIds).toEqual([]);

    for (const [unitId] of oldClassRiders) {
      expect(
        resolveBattleSubject({
          state,
          subject: {
            tag: "unitFeature",
            actorId: fighterId,
            unitId,
          },
          fills: [],
        }),
      ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    }
  });
});
