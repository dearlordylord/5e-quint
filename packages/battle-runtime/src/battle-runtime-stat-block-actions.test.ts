// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.ATTACK_CONTROL
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test stat-block.attack-control
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-SIZE-GATED-CONDITION-RIDERS druid_wild_shape
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import {
  startBattleRight,
  requireResolved,
  requireNeedsHoles,
  hidePrerequisites,
  fighterVsGoblinBattle,
  fighterGrapplesGoblin,
  goblinTurnBattle,
  fighterAttackSubject,
  goblinAttackSubject,
  monsterAttackSubject,
  attackInitialTargetHole,
  attackRollHoleAfterTarget,
  attackDamageHoleAfterHit,
  requireHole,
  findHole,
  findAct,
  targetFill,
  attackTargetFill,
  abilityCheckFill,
  attackRollFill,
  movementFill,
  grappleOutcomeFill,
  damageRollFill,
  damageRollFillWithGroups,
  characterSeed,
  testLightHammerAttack,
  testPoisonWeaponAttack,
  statBlockCreatureInit,
  monsterResourceStatBlock,
  monsterResourceStatBlockWithUnsupportedAttackSections,
  monsterMultiattackStatBlock,
  monsterResourceStatBlockWithTwoRechargeActions,
  statBlockRecord,
  skeletonCreatureInit,
  resistantSkeletonCreatureInit,
  fighterId,
  goblinId,
  skeletonId,
  distantFighterId,
  longRangeFighterId,
  battleId,
  DieRollResult,
  difficultyClass,
  discoverBattleActs,
  endTurn,
  movementFeet,
  resolveBattleSubject,
  snapshotBattle,
} from "./battle-runtime-test-support.ts";
import type {
  BattleHole,
  BattleState,
  BattleSubject,
} from "./battle-runtime-test-support.ts";
import { spellId, type CombatantId } from "./identity.ts";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import { creatureNamedAttackRollIsSupported } from "./statblock-action-support.ts";
import { supportedStatBlockAttackHitConditionRiders } from "./statblock-attack-hit-condition-support.ts";
import { describe, expect, test } from "vitest";

function sizeGatedConditionRiderStatBlock(): StatBlockRecord {
  const base = statBlockRecord();
  return {
    ...base,
    id: "stat_block_size_gated_condition_test_monster",
    name: "Size-Gated Condition Test Monster",
    statBlock: {
      ...base.statBlock,
      displayName: "Size-Gated Condition Test Monster",
      actions: {
        attacks: [
          {
            attackBonus: { kind: "literal", value: 4 },
            attackType: "melee",
            name: "Bite",
            onHit: [
              {
                amount: {
                  kind: "fixed",
                  expr: { dice: 1, dieSize: 6, flat: 2 },
                  static: 5,
                },
                damageType: "piercing",
                kind: "damage",
              },
              {
                condition: "prone",
                kind: "apply_condition_if_target_size_at_most",
                maxCreatureSize: "medium",
              },
            ],
            reachFeet: 5,
          },
        ],
      },
    },
  };
}

function untypedConditionRiderStatBlock(): StatBlockRecord {
  const base = sizeGatedConditionRiderStatBlock();
  const bite = base.statBlock.actions?.attacks?.[0];
  if (bite === undefined) {
    throw new Error("Expected synthetic Bite attack.");
  }
  const damage = bite.onHit[0];
  if (damage === undefined) {
    throw new Error("Expected synthetic Bite damage.");
  }
  return {
    ...base,
    id: "stat_block_untyped_condition_rider_test_monster",
    name: "Untyped Condition Rider Test Monster",
    statBlock: {
      ...base.statBlock,
      displayName: "Untyped Condition Rider Test Monster",
      actions: {
        attacks: [
          {
            ...bite,
            onHit: [
              damage,
              { kind: "apply_condition", condition: "prone" },
            ],
          },
        ],
      },
    },
  };
}

function conditionOnlyRiderStatBlock(): StatBlockRecord {
  const base = sizeGatedConditionRiderStatBlock();
  const bite = base.statBlock.actions?.attacks?.[0];
  if (bite === undefined) {
    throw new Error("Expected synthetic Bite attack.");
  }
  return {
    ...base,
    id: "stat_block_condition_only_rider_test_monster",
    name: "Condition-Only Rider Test Monster",
    statBlock: {
      ...base.statBlock,
      displayName: "Condition-Only Rider Test Monster",
      actions: {
        attacks: [
          {
            ...bite,
            onHit: [
              {
                condition: "prone",
                kind: "apply_condition_if_target_size_at_most",
                maxCreatureSize: "medium",
              },
            ],
          },
        ],
      },
    },
  };
}

function nonProneSizeGatedConditionRiderStatBlock(): StatBlockRecord {
  const base = sizeGatedConditionRiderStatBlock();
  const bite = base.statBlock.actions?.attacks?.[0];
  if (bite === undefined) {
    throw new Error("Expected synthetic Bite attack.");
  }
  const damage = bite.onHit[0];
  if (damage === undefined) {
    throw new Error("Expected synthetic Bite damage.");
  }
  return {
    ...base,
    id: "stat_block_non_prone_size_gated_condition_test_monster",
    name: "Non-Prone Size-Gated Condition Test Monster",
    statBlock: {
      ...base.statBlock,
      displayName: "Non-Prone Size-Gated Condition Test Monster",
      actions: {
        attacks: [
          {
            ...bite,
            onHit: [
              damage,
              {
                condition: "grappled",
                kind: "apply_condition_if_target_size_at_most",
                maxCreatureSize: "medium",
              },
            ],
          },
        ],
      },
    },
  };
}

function largeTargetStatBlock(): StatBlockRecord {
  const base = statBlockRecord();
  return {
    ...base,
    id: "stat_block_large_condition_rider_target",
    name: "Large Condition Rider Target",
    statBlock: {
      ...base.statBlock,
      displayName: "Large Condition Rider Target",
      hp: { kind: "literal", value: 20 },
      size: "large",
    },
  };
}

function proneImmuneTargetStatBlock(): StatBlockRecord {
  const base = statBlockRecord();
  return {
    ...base,
    id: "stat_block_prone_immune_condition_rider_target",
    name: "Prone-Immune Condition Rider Target",
    statBlock: {
      ...base.statBlock,
      displayName: "Prone-Immune Condition Rider Target",
      hp: { kind: "literal", value: 20 },
      immunities: {
        ...(base.statBlock.immunities ?? {}),
        conditions: ["prone"],
      },
      size: "medium",
    },
  };
}

function biteMeleeReachFact(targetId: CombatantId) {
  return [
    {
      kind: "attackTargetInMeleeReach" as const,
      actorId: goblinId,
      targetId,
      attackName: "Bite",
    },
  ];
}

function withProneConditionImmunity(
  state: BattleState,
  targetId: CombatantId,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    throw new Error("Expected Prone-immunity test target.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects: [
        ...target.activeEffects,
        {
          kind: "conditionImmunity",
          condition: "prone",
          conditionHadNonSpellSource: false,
          expiresAt: { kind: "untilDispelled" },
          sourceCombatantId: targetId,
          sourceSpellId: spellId("synthetic_prone_immunity"),
        },
      ],
    }),
  };
}

function monsterMultiDamageStatBlock(): StatBlockRecord {
  const base = statBlockRecord();
  const shortbow = base.statBlock.actions?.attacks?.find(
    (attack) => attack.name === "Shortbow",
  );
  if (shortbow === undefined) {
    throw new Error("Expected Goblin Warrior Shortbow fixture.");
  }
  return {
    ...base,
    id: "stat_block_multi_damage_test_monster",
    name: "Multi Damage Test Monster",
    statBlock: {
      ...base.statBlock,
      displayName: "Multi Damage Test Monster",
      actions: {
        attacks: [
          {
            ...shortbow,
            name: "Venom Dart",
            onHit: [
              {
                kind: "damage",
                damageType: "piercing",
                amount: {
                  kind: "fixed",
                  expr: { dice: 1, dieSize: 4, flat: 1 },
                  static: 3,
                },
              },
              {
                kind: "damage",
                damageType: "poison",
                amount: {
                  kind: "fixed",
                  expr: { dice: 1, dieSize: 6 },
                  static: 3,
                },
              },
            ],
          },
        ],
      },
    },
  };
}

function venomDartTargetFill(hole: BattleHole) {
  return targetFill(hole, fighterId, [
    {
      kind: "attackTargetInRangedRange",
      actorId: goblinId,
      targetId: fighterId,
      attackName: "Venom Dart",
      rangeBand: "normal",
    },
  ]);
}

function resolveBiteAgainst(input: {
  readonly battleIdValue: string;
  readonly targetId: CombatantId;
  readonly target: Parameters<typeof startBattleRight>[0]["combatants"][number];
  readonly stateTransform?: (state: BattleState) => BattleState;
}): BattleState {
  const initialState = startBattleRight({
    battleId: battleId(input.battleIdValue),
    combatants: [
      statBlockCreatureInit({
        initiative: 20,
        statBlock: sizeGatedConditionRiderStatBlock(),
      }),
      input.target,
    ],
  });
  const state = input.stateTransform?.(initialState) ?? initialState;
  const subject: BattleSubject = {
    tag: "action",
    actorId: goblinId,
    action: "attack",
    attackName: "Bite",
  };
  const targetHole = attackInitialTargetHole(state, subject);
  const targetChoice = targetFill(
    targetHole,
    input.targetId,
    biteMeleeReachFact(input.targetId),
  );
  const rollHole = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [targetChoice],
    }),
    "attackRoll",
  );
  const damageHole = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        targetChoice,
        attackRollFill(rollHole, { total: 20, naturalD20: 12 }),
      ],
    }),
    "rolledDice",
  );
  return requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        targetChoice,
        attackRollFill(rollHole, { total: 20, naturalD20: 12 }),
        damageRollFill(damageHole, 1),
      ],
    }),
  ).state;
}

describe("battle runtime: Stat Block actions", () => {
  test("Goblin Warrior discovers authored Scimitar and Shortbow attacks", () => {
    const afterFighter = endTurn({
      state: fighterVsGoblinBattle(),
      actorId: fighterId,
    });
    if (afterFighter.tag !== "resolved") {
      throw new Error(`Expected resolved End Turn, got ${afterFighter.tag}.`);
    }

    const acts = discoverBattleActs(afterFighter.state);

    expect(acts.map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        {
          tag: "action",
          actorId: goblinId,
          action: "attack",
          attackName: "Scimitar",
        },
        {
          tag: "action",
          actorId: goblinId,
          action: "attack",
          attackName: "Shortbow",
        },
        { tag: "runtimeCommand", actorId: goblinId, command: "move" },
        { tag: "runtimeCommand", actorId: goblinId, command: "endTurn" },
      ]),
    );
  });

  test("Stat Block attacks preserve multiple rolled hit damage components by type", () => {
    const monsterTurn = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-monster-multi-component-damage"),
          combatants: [
            characterSeed({ initiative: 20 }),
            statBlockCreatureInit({
              initiative: 10,
              statBlock: monsterMultiDamageStatBlock(),
            }),
          ],
        }),
        actorId: fighterId,
      }),
    ).state;
    const subject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "attack",
      attackName: "Venom Dart",
    };

    expect(discoverBattleActs(monsterTurn).map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        subject,
        {
          ...subject,
          statBlockDamageNotation: "static",
        },
      ]),
    );

    const targetHole = attackInitialTargetHole(monsterTurn, subject);
    const targetChoice = venomDartTargetFill(targetHole);
    const rollHole = requireHole(
      resolveBattleSubject({
        state: monsterTurn,
        subject,
        fills: [targetChoice],
      }),
      "attackRoll",
    );
    const damageHole = requireHole(
      resolveBattleSubject({
        state: monsterTurn,
        subject,
        fills: [
          targetChoice,
          attackRollFill(rollHole, { total: 20, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );

    expect(damageHole).toMatchObject({
      label: "Venom Dart damage (1d4+1-piercing+1d6-poison)",
    });

    const result = resolveBattleSubject({
      state: monsterTurn,
      subject,
      fills: [
        targetChoice,
        attackRollFill(rollHole, { total: 20, naturalD20: 12 }),
        damageRollFillWithGroups(damageHole, [[1], [2]]),
      ],
    });
    if (result.tag !== "resolved") {
      throw new Error(
        `Expected resolved, got ${result.tag}${
          result.tag === "invalid" ? `: ${result.message}` : ""
        }.`,
      );
    }
    expect(result.tag).toBe("resolved");
    const resolved = result.state;

    expect(resolved.combatants.get(fighterId)?.hp).toBe(8);
  });

  test("Stat Block static notation applies multiple hit damage components by type", () => {
    const monsterTurn = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-monster-multi-component-static-damage"),
          combatants: [
            characterSeed({ initiative: 20 }),
            statBlockCreatureInit({
              initiative: 10,
              statBlock: monsterMultiDamageStatBlock(),
            }),
          ],
        }),
        actorId: fighterId,
      }),
    ).state;
    const subject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "attack",
      attackName: "Venom Dart",
      statBlockDamageNotation: "static",
    };
    const targetHole = attackInitialTargetHole(monsterTurn, subject);
    const targetChoice = venomDartTargetFill(targetHole);
    const rollHole = requireHole(
      resolveBattleSubject({
        state: monsterTurn,
        subject,
        fills: [targetChoice],
      }),
      "attackRoll",
    );

    const result = resolveBattleSubject({
      state: monsterTurn,
      subject,
      fills: [
        targetChoice,
        attackRollFill(rollHole, { total: 20, naturalD20: 12 }),
      ],
    });
    if (result.tag !== "resolved") {
      throw new Error(
        `Expected resolved, got ${result.tag}${
          result.tag === "invalid" ? `: ${result.message}` : ""
        }.`,
      );
    }
    expect(result.tag).toBe("resolved");
    const resolved = result.state;

    expect(resolved.combatants.get(fighterId)?.hp).toBe(6);
  });

  test("Stat Block attacks admit target-size-gated condition riders from structured on-hit payload", () => {
    const statBlock = sizeGatedConditionRiderStatBlock();
    const attack = statBlock.statBlock.actions?.attacks?.[0];
    if (attack === undefined) {
      throw new Error("Expected synthetic Bite attack.");
    }

    expect(creatureNamedAttackRollIsSupported(attack)).toBe(true);
    expect(supportedStatBlockAttackHitConditionRiders(attack)).toEqual([
      {
        condition: "prone",
        targetSizePredicate: {
          kind: "targetCreatureSizeAtMost",
          maxCreatureSize: "medium",
        },
      },
    ]);

    const state = startBattleRight({
      battleId: battleId("battle-monster-size-gated-condition-admission"),
      combatants: [
        statBlockCreatureInit({ initiative: 20, statBlock }),
        characterSeed({ initiative: 10 }),
      ],
    });

    expect(discoverBattleActs(state).map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        {
          tag: "action",
          actorId: goblinId,
          action: "attack",
          attackName: "Bite",
        },
        {
          tag: "action",
          actorId: goblinId,
          action: "attack",
          attackName: "Bite",
          statBlockDamageNotation: "static",
        },
      ]),
    );
  });

  test("Stat Block attack-hit target-size condition rider applies inside the size gate", () => {
    const resolved = resolveBiteAgainst({
      battleIdValue: "battle-monster-size-gated-condition-medium-target",
      targetId: fighterId,
      target: characterSeed({ initiative: 10 }),
    });
    const target = resolved.combatants.get(fighterId);
    if (target === undefined) {
      throw new Error("Expected Bite target.");
    }

    expect(target.hp).toBe(9);
    expect(hasCondition(target.conditions, "prone")).toBe(true);
  });

  test("Stat Block attack-hit target-size condition rider does not apply outside the size gate", () => {
    const resolved = resolveBiteAgainst({
      battleIdValue: "battle-monster-size-gated-condition-large-target",
      targetId: distantFighterId,
      target: statBlockCreatureInit({
        combatantId: distantFighterId,
        displayName: "Large Target",
        initiative: 10,
        statBlock: largeTargetStatBlock(),
      }),
    });
    const target = resolved.combatants.get(distantFighterId);
    if (target === undefined) {
      throw new Error("Expected Bite target.");
    }

    expect(target.hp).toBe(17);
    expect(hasCondition(target.conditions, "prone")).toBe(false);
  });

  test("Stat Block attack-hit target-size condition rider respects Prone immunity inside the size gate", () => {
    const resolved = resolveBiteAgainst({
      battleIdValue: "battle-monster-size-gated-condition-prone-immune-target",
      targetId: distantFighterId,
      target: statBlockCreatureInit({
        combatantId: distantFighterId,
        displayName: "Prone-Immune Target",
        initiative: 10,
        statBlock: proneImmuneTargetStatBlock(),
      }),
    });
    const target = resolved.combatants.get(distantFighterId);
    if (target === undefined) {
      throw new Error("Expected Bite target.");
    }

    expect(target.hp).toBe(17);
    expect(hasCondition(target.conditions, "prone")).toBe(false);
  });

  test("Stat Block attack-hit target-size condition rider respects active Prone immunity inside the size gate", () => {
    const resolved = resolveBiteAgainst({
      battleIdValue:
        "battle-monster-size-gated-condition-active-prone-immune-target",
      targetId: fighterId,
      target: characterSeed({ initiative: 10 }),
      stateTransform: (state) =>
        withProneConditionImmunity(state, fighterId),
    });
    const target = resolved.combatants.get(fighterId);
    if (target === undefined) {
      throw new Error("Expected Bite target.");
    }

    expect(target.hp).toBe(9);
    expect(hasCondition(target.conditions, "prone")).toBe(false);
  });

  test("Stat Block attacks with untyped condition riders remain unsupported", () => {
    const statBlock = untypedConditionRiderStatBlock();
    const attack = statBlock.statBlock.actions?.attacks?.[0];
    if (attack === undefined) {
      throw new Error("Expected synthetic Bite attack.");
    }
    expect(creatureNamedAttackRollIsSupported(attack)).toBe(false);

    const state = startBattleRight({
      battleId: battleId("battle-monster-untyped-condition-rider-rejected"),
      combatants: [
        statBlockCreatureInit({ initiative: 20, statBlock }),
        characterSeed({ initiative: 10 }),
      ],
    });

    expect(discoverBattleActs(state).map((act) => act.subject)).not.toEqual(
      expect.arrayContaining([
        {
          tag: "action",
          actorId: goblinId,
          action: "attack",
          attackName: "Bite",
        },
      ]),
    );
  });

  test("Stat Block attacks with non-Prone target-size condition riders remain unsupported", () => {
    const statBlock = nonProneSizeGatedConditionRiderStatBlock();
    const attack = statBlock.statBlock.actions?.attacks?.[0];
    if (attack === undefined) {
      throw new Error("Expected synthetic Bite attack.");
    }
    expect(creatureNamedAttackRollIsSupported(attack)).toBe(false);
    expect(supportedStatBlockAttackHitConditionRiders(attack)).toBeNull();

    const state = startBattleRight({
      battleId: battleId(
        "battle-monster-non-prone-size-gated-condition-rider-rejected",
      ),
      combatants: [
        statBlockCreatureInit({ initiative: 20, statBlock }),
        characterSeed({ initiative: 10 }),
      ],
    });

    expect(discoverBattleActs(state).map((act) => act.subject)).not.toEqual(
      expect.arrayContaining([
        {
          tag: "action",
          actorId: goblinId,
          action: "attack",
          attackName: "Bite",
        },
      ]),
    );
  });

  test("Stat Block attacks with only condition riders remain unsupported", () => {
    const statBlock = conditionOnlyRiderStatBlock();
    const attack = statBlock.statBlock.actions?.attacks?.[0];
    if (attack === undefined) {
      throw new Error("Expected synthetic Bite attack.");
    }
    expect(creatureNamedAttackRollIsSupported(attack)).toBe(false);

    const state = startBattleRight({
      battleId: battleId("battle-monster-condition-only-rider-rejected"),
      combatants: [
        statBlockCreatureInit({ initiative: 20, statBlock }),
        characterSeed({ initiative: 10 }),
      ],
    });

    expect(discoverBattleActs(state).map((act) => act.subject)).not.toEqual(
      expect.arrayContaining([
        {
          tag: "action",
          actorId: goblinId,
          action: "attack",
          attackName: "Bite",
        },
      ]),
    );
  });

  test("Goblin Warrior discovers Nimble Escape as Stat Block Bonus Action options", () => {
    const goblinTurn = requireResolved(
      endTurn({
        state: fighterVsGoblinBattle({
          hidePrerequisites: hidePrerequisites([
            [goblinId, { kind: "heavilyObscuredOutOfEnemyLineOfSight" }],
          ]),
        }),
        actorId: fighterId,
      }),
    ).state;

    expect(discoverBattleActs(goblinTurn).map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        {
          tag: "bonusAction",
          actorId: goblinId,
          action: "statBlockActionOption",
          optionName: "Nimble Escape",
          standardAction: "disengage",
        },
        {
          tag: "bonusAction",
          actorId: goblinId,
          action: "statBlockActionOption",
          optionName: "Nimble Escape",
          standardAction: "hide",
        },
      ]),
    );
  });

  test("Goblin Warrior Nimble Escape spends Bonus Action for Disengage", () => {
    const goblinTurn = requireResolved(
      endTurn({ state: fighterVsGoblinBattle(), actorId: fighterId }),
    ).state;
    const subject: BattleSubject = {
      tag: "bonusAction",
      actorId: goblinId,
      action: "statBlockActionOption",
      optionName: "Nimble Escape",
      standardAction: "disengage",
    };

    const result = requireResolved(
      resolveBattleSubject({ state: goblinTurn, subject, fills: [] }),
    ).state;

    expect(result.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(result.currentTurnResources.disengaged).toBe(true);
  });

  test("Goblin Warrior Nimble Escape spends Bonus Action for Hide", () => {
    const goblinTurn = requireResolved(
      endTurn({
        state: fighterVsGoblinBattle({
          hidePrerequisites: hidePrerequisites([
            [goblinId, { kind: "heavilyObscuredOutOfEnemyLineOfSight" }],
          ]),
        }),
        actorId: fighterId,
      }),
    ).state;
    const subject: BattleSubject = {
      tag: "bonusAction",
      actorId: goblinId,
      action: "statBlockActionOption",
      optionName: "Nimble Escape",
      standardAction: "hide",
    };
    const act = findAct(goblinTurn, subject);

    const result = requireResolved(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [
          abilityCheckFill(findHole(act.initialHoles, "abilityCheck"), 17),
        ],
      }),
    ).state;

    expect(result.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(snapshotBattle(result).combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: goblinId,
          conditions: expect.arrayContaining(["invisible"]),
        }),
      ]),
    );
    expect(result.combatants.get(goblinId)?.hidden).toEqual({
      discoveryDc: difficultyClass(17),
    });
  });

  test("Stat Block Multiattack spends the Attack action and grants named dispatch attacks", () => {
    const goblinTurn = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-monster-multiattack"),
          combatants: [
            characterSeed({ initiative: 20 }),
            statBlockCreatureInit({
              initiative: 10,
              statBlock: monsterMultiattackStatBlock(),
            }),
          ],
        }),
        actorId: fighterId,
      }),
    ).state;
    const subject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "multiattack",
      multiattackName: "Multiattack",
    };

    expect(
      discoverBattleActs(goblinTurn).map((act) => act.subject),
    ).toContainEqual(subject);
    const multiattackState = requireResolved(
      resolveBattleSubject({ state: goblinTurn, subject, fills: [] }),
    ).state;

    expect(multiattackState.currentTurnResources.actionResources).toEqual([
      {
        kind: "action",
        source: "statBlockMultiattack",
        sourceOwnerId: goblinId,
        attackPart: { section: "actions", name: "Scimitar" },
        restriction: {
          kind: "exclude",
          actions: expect.arrayContaining(["dash", "magic", "utilize"]),
        },
      },
      {
        kind: "action",
        source: "statBlockMultiattack",
        sourceOwnerId: goblinId,
        attackPart: { section: "actions", name: "Shortbow" },
        restriction: {
          kind: "exclude",
          actions: expect.arrayContaining(["dash", "magic", "utilize"]),
        },
      },
    ]);
    const continuationActs = discoverBattleActs(multiattackState);
    const continuationSubjects = continuationActs.map((act) => act.subject);
    expect(continuationSubjects).toEqual([
      {
        tag: "action",
        actorId: goblinId,
        action: "attack",
        attackName: "Scimitar",
      },
      {
        tag: "action",
        actorId: goblinId,
        action: "attack",
        attackName: "Scimitar",
        statBlockDamageNotation: "static",
      },
      {
        tag: "action",
        actorId: goblinId,
        action: "attack",
        attackName: "Shortbow",
      },
      {
        tag: "action",
        actorId: goblinId,
        action: "attack",
        attackName: "Shortbow",
        statBlockDamageNotation: "static",
      },
      { tag: "runtimeCommand", actorId: goblinId, command: "move" },
      { tag: "runtimeCommand", actorId: goblinId, command: "endTurn" },
    ]);
    expect(continuationSubjects).not.toContainEqual(subject);
    expect(continuationActs.map((act) => act.label)).toEqual([
      "Attack",
      "Attack",
      "Attack",
      "Attack",
      "Move",
      "End Turn",
    ]);
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: goblinId,
      command: "move",
    };
    const moveHole = requireHole(
      resolveBattleSubject({
        state: multiattackState,
        subject: moveSubject,
        fills: [],
      }),
      "movement",
    );
    const afterMove = requireResolved(
      resolveBattleSubject({
        state: multiattackState,
        subject: moveSubject,
        fills: [
          movementFill(moveHole, {
            movementCostFeet: 5,
            provokedOpportunityAttacks: [],
          }),
        ],
      }),
    ).state;
    expect(afterMove.currentTurnResources.actionResources).toEqual(
      multiattackState.currentTurnResources.actionResources,
    );
    expect(afterMove.combatants.get(goblinId)?.movementSpentFeet).toBe(
      movementFeet(5),
    );
    expect(
      resolveBattleSubject({
        state: multiattackState,
        subject: {
          tag: "action",
          actorId: goblinId,
          action: "disengage",
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    expect(
      resolveBattleSubject({
        state: multiattackState,
        subject: {
          tag: "action",
          actorId: goblinId,
          action: "attack",
          attackName: "Dagger",
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });

    const shortbowSubject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "attack",
      attackName: "Shortbow",
    };
    const shortbow = findAct(multiattackState, shortbowSubject);
    const targetChoice = attackTargetFill(
      findHole(shortbow.initialHoles, "targetChoice"),
      goblinId,
      fighterId,
      "Shortbow",
    );
    const targeted = requireNeedsHoles(
      resolveBattleSubject({
        state: multiattackState,
        subject: shortbowSubject,
        fills: [targetChoice],
      }),
    );
    const afterDispatch = requireResolved(
      resolveBattleSubject({
        state: multiattackState,
        subject: shortbowSubject,
        fills: [
          targetChoice,
          attackRollFill(findHole(targeted.holes, "attackRoll"), {
            total: 1,
            naturalD20: 1,
          }),
        ],
      }),
    ).state;

    expect(afterDispatch.currentTurnResources.actionResources).toEqual([
      expect.objectContaining({
        source: "statBlockMultiattack",
        attackPart: { section: "actions", name: "Scimitar" },
      }),
    ]);
    expect(discoverBattleActs(afterDispatch).map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        {
          tag: "action",
          actorId: goblinId,
          action: "attack",
          attackName: "Scimitar",
        },
      ]),
    );
    expect(
      discoverBattleActs(afterDispatch).map((act) => act.subject),
    ).not.toContainEqual(shortbowSubject);
    expect(
      resolveBattleSubject({
        state: afterDispatch,
        subject: shortbowSubject,
        fills: [targetChoice],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("Stat Block Multiattack remains gated when a dispatch has no positive literal count", () => {
    const goblinTurn = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-monster-multiattack-zero-count"),
          combatants: [
            characterSeed({ initiative: 20 }),
            statBlockCreatureInit({
              initiative: 10,
              statBlock: monsterMultiattackStatBlock({
                scimitarCount: 0,
              }),
            }),
          ],
        }),
        actorId: fighterId,
      }),
    ).state;
    const subject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "multiattack",
      multiattackName: "Multiattack",
    };

    expect(
      discoverBattleActs(goblinTurn).map((act) => act.subject),
    ).not.toContainEqual(subject);
    expect(
      resolveBattleSubject({ state: goblinTurn, subject, fills: [] }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
    });
  });

  test("Stat Block Multiattack dispatch resources do not authorize Escape Grapple", () => {
    const grappled = fighterGrapplesGoblin(
      startBattleRight({
        battleId: battleId("battle-monster-multiattack-grapple-gate"),
        combatants: [
          characterSeed({ initiative: 20 }),
          statBlockCreatureInit({
            initiative: 10,
            statBlock: monsterMultiattackStatBlock(),
          }),
        ],
      }),
    ).state;
    const goblinTurn = requireResolved(
      endTurn({ state: grappled, actorId: fighterId }),
    ).state;
    const escapeSubject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "escapeGrapple",
    };
    const escape = requireHole(
      resolveBattleSubject({
        state: goblinTurn,
        subject: escapeSubject,
        fills: [],
      }),
      "grappleOutcome",
    );
    const multiattackState = requireResolved(
      resolveBattleSubject({
        state: goblinTurn,
        subject: {
          tag: "action",
          actorId: goblinId,
          action: "multiattack",
          multiattackName: "Multiattack",
        },
        fills: [],
      }),
    ).state;

    expect(
      discoverBattleActs(multiattackState).map((act) => act.subject),
    ).not.toContainEqual(escapeSubject);
    expect(
      resolveBattleSubject({
        state: multiattackState,
        subject: escapeSubject,
        fills: [grappleOutcomeFill(escape, true)],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("Stat Block Multiattack remains gated when dispatch names are ambiguous", () => {
    const goblinTurn = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-monster-multiattack-duplicate-name"),
          combatants: [
            characterSeed({ initiative: 20 }),
            statBlockCreatureInit({
              initiative: 10,
              statBlock: monsterMultiattackStatBlock({
                duplicateScimitarAttack: true,
              }),
            }),
          ],
        }),
        actorId: fighterId,
      }),
    ).state;
    const subject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "multiattack",
      multiattackName: "Multiattack",
    };

    expect(
      discoverBattleActs(goblinTurn).map((act) => act.subject),
    ).not.toContainEqual(subject);
    expect(
      resolveBattleSubject({ state: goblinTurn, subject, fills: [] }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
    });
  });

  test("Stat Block limited-use resources are initialized from authored monster controls", () => {
    const state = startBattleRight({
      battleId: battleId("battle-monster-resource-init"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({
          initiative: 10,
          statBlock: monsterResourceStatBlock(),
        }),
      ],
    });

    expect(state.combatants.get(goblinId)?.origin).toMatchObject({
      kind: "statBlock",
      resources: {
        legendaryActionUsesRemaining: 2,
        dailyUses: [
          {
            key: { section: "actions", name: "Dread Gaze" },
            usesRemaining: 1,
          },
        ],
        unavailableRechargeParts: [],
        unavailableRestRechargeParts: [],
      },
    });
    expect(snapshotBattle(state).combatants).toContainEqual(
      expect.objectContaining({
        combatantId: goblinId,
        origin: {
          kind: "statBlock",
          statBlockId: "stat_block_resource_test_monster",
          resources: {
            legendaryActions: { usesMax: 2, usesRemaining: 2 },
            limitedUses: expect.arrayContaining([
              {
                key: { section: "actions", name: "Cinder Breath" },
                kind: "recharge",
                minimumRoll: 5,
                available: true,
              },
              {
                key: { section: "actions", name: "Dread Gaze" },
                kind: "daily",
                usesMax: 1,
                usesRemaining: 1,
              },
            ]),
          },
        },
      }),
    );
  });

  test("Stat Block Bonus Action and Reaction attacks do not enter the Attack action lane", () => {
    const goblinTurn = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-monster-unsupported-sections"),
          combatants: [
            characterSeed({ initiative: 20 }),
            statBlockCreatureInit({
              initiative: 10,
              statBlock:
                monsterResourceStatBlockWithUnsupportedAttackSections(),
            }),
          ],
        }),
        actorId: fighterId,
      }),
    ).state;

    expect(
      discoverBattleActs(goblinTurn).some(
        (act) =>
          act.subject.tag === "action" &&
          act.subject.action === "attack" &&
          (act.subject.attackName === "Swift Bite" ||
            act.subject.attackName === "Counter Snap"),
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: goblinTurn,
        subject: {
          tag: "action",
          actorId: goblinId,
          action: "attack",
          attackName: "Swift Bite",
          statBlockSection: "bonusActions",
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "unsupportedActOption" });
    expect(
      resolveBattleSubject({
        state: goblinTurn,
        subject: {
          tag: "action",
          actorId: goblinId,
          action: "attack",
          attackName: "Counter Snap",
          statBlockSection: "reactions",
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "unsupportedActOption" });
  });

  test("Recharge attacks spend availability and use a start-turn d6 roll to return", () => {
    const firstGoblinTurn = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-monster-recharge"),
          combatants: [
            characterSeed({ initiative: 20 }),
            statBlockCreatureInit({
              initiative: 10,
              statBlock: monsterResourceStatBlock(),
            }),
          ],
        }),
        actorId: fighterId,
      }),
    ).state;
    const subject = monsterAttackSubject("Cinder Breath");
    const targetHole = attackInitialTargetHole(firstGoblinTurn, subject);
    const rollHole = attackRollHoleAfterTarget(
      firstGoblinTurn,
      targetHole,
      subject,
      fighterId,
    );
    const damageHole = attackDamageHoleAfterHit(
      firstGoblinTurn,
      targetHole,
      rollHole,
      { total: 20, naturalD20: 12 },
      subject,
      fighterId,
    );
    const spent = requireResolved(
      resolveBattleSubject({
        state: firstGoblinTurn,
        subject,
        fills: [
          targetFill(targetHole, fighterId),
          attackRollFill(rollHole, { total: 20, naturalD20: 12 }),
          damageRollFillWithGroups(damageHole, [[3]]),
        ],
      }),
    ).state;

    expect(
      discoverBattleActs(spent).some(
        (act) =>
          act.subject.tag === "action" &&
          act.subject.action === "attack" &&
          act.subject.attackName === "Cinder Breath",
      ),
    ).toBe(false);

    const fighterTurn = requireResolved(
      endTurn({ state: spent, actorId: goblinId }),
    ).state;
    const rechargeRequest = endTurn({ state: fighterTurn, actorId: fighterId });
    expect(rechargeRequest).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "statBlockRechargeRoll",
          rechargeTargets: [{ section: "actions", name: "Cinder Breath" }],
        },
      ],
    });
    if (rechargeRequest.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${rechargeRequest.tag}.`);
    }
    const recharged = requireResolved(
      resolveBattleSubject({
        state: fighterTurn,
        subject: {
          tag: "runtimeCommand",
          actorId: fighterId,
          command: "endTurn",
        },
        fills: [
          {
            kind: "statBlockRechargeRoll",
            holeId: rechargeRequest.holes[0].holeId,
            value: [
              {
                target: { section: "actions", name: "Cinder Breath" },
                roll: DieRollResult(5),
              },
            ],
          },
        ],
      }),
    ).state;

    expect(
      discoverBattleActs(recharged).some(
        (act) =>
          act.subject.tag === "action" &&
          act.subject.action === "attack" &&
          act.subject.attackName === "Cinder Breath",
      ),
    ).toBe(true);
  });

  test("Daily Stat Block attacks spend uses and are hidden when depleted", () => {
    const goblinTurn = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-monster-daily"),
          combatants: [
            characterSeed({ initiative: 20 }),
            statBlockCreatureInit({
              initiative: 10,
              statBlock: monsterResourceStatBlock(),
            }),
          ],
        }),
        actorId: fighterId,
      }),
    ).state;
    const subject = monsterAttackSubject("Dread Gaze");
    const targetHole = attackInitialTargetHole(goblinTurn, subject);
    const rollHole = attackRollHoleAfterTarget(
      goblinTurn,
      targetHole,
      subject,
      fighterId,
    );
    const damageHole = attackDamageHoleAfterHit(
      goblinTurn,
      targetHole,
      rollHole,
      { total: 20, naturalD20: 12 },
      subject,
      fighterId,
    );
    const spent = requireResolved(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [
          targetFill(targetHole, fighterId),
          attackRollFill(rollHole, { total: 20, naturalD20: 12 }),
          damageRollFillWithGroups(damageHole, [[3]]),
        ],
      }),
    ).state;

    expect(spent.combatants.get(goblinId)?.origin).toMatchObject({
      kind: "statBlock",
      resources: {
        dailyUses: [
          {
            key: { section: "actions", name: "Dread Gaze" },
            usesRemaining: 0,
          },
        ],
      },
    });
    expect(
      discoverBattleActs(spent).some(
        (act) =>
          act.subject.tag === "action" &&
          act.subject.action === "attack" &&
          act.subject.attackName === "Dread Gaze",
      ),
    ).toBe(false);
  });

  test("Recharge rolls are independent for each unavailable Stat Block part", () => {
    const state = startBattleRight({
      battleId: battleId("battle-monster-multi-recharge"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({
          initiative: 10,
          statBlock: monsterResourceStatBlockWithTwoRechargeActions(),
        }),
      ],
    });
    const goblin = state.combatants.get(goblinId);
    if (goblin?.origin.kind !== "statBlock") {
      throw new Error("Expected Stat Block goblin.");
    }
    const spentState: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(goblinId, {
        ...goblin,
        origin: {
          ...goblin.origin,
          resources: {
            ...goblin.origin.resources,
            unavailableRechargeParts: [
              { section: "actions", name: "Cinder Breath" },
              { section: "actions", name: "Ash Cloud" },
            ],
          },
        },
      }),
    };

    const rechargeRequest = endTurn({ state: spentState, actorId: fighterId });
    expect(rechargeRequest).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "statBlockRechargeRoll",
          rechargeTargets: [
            { section: "actions", name: "Cinder Breath" },
            { section: "actions", name: "Ash Cloud" },
          ],
        },
      ],
    });
    if (rechargeRequest.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${rechargeRequest.tag}.`);
    }

    const recharged = requireResolved(
      resolveBattleSubject({
        state: spentState,
        subject: {
          tag: "runtimeCommand",
          actorId: fighterId,
          command: "endTurn",
        },
        fills: [
          {
            kind: "statBlockRechargeRoll",
            holeId: rechargeRequest.holes[0].holeId,
            value: [
              {
                target: { section: "actions", name: "Cinder Breath" },
                roll: DieRollResult(4),
              },
              {
                target: { section: "actions", name: "Ash Cloud" },
                roll: DieRollResult(6),
              },
            ],
          },
        ],
      }),
    ).state;

    const rechargedGoblin = recharged.combatants.get(goblinId);
    if (rechargedGoblin?.origin.kind !== "statBlock") {
      throw new Error("Expected recharged Stat Block goblin.");
    }
    expect(
      rechargedGoblin.origin.resources.unavailableRechargeParts,
    ).toContainEqual({ section: "actions", name: "Cinder Breath" });
    expect(
      rechargedGoblin.origin.resources.unavailableRechargeParts,
    ).not.toContainEqual({ section: "actions", name: "Ash Cloud" });
  });

  test("Legendary Action attacks are Stat Block acts after another creature's turn", () => {
    const state = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-monster-legendary"),
          combatants: [
            characterSeed({ initiative: 20 }),
            characterSeed({
              combatantId: distantFighterId,
              displayName: "Distant Fighter",
              initiative: 15,
            }),
            statBlockCreatureInit({
              initiative: 10,
              statBlock: monsterResourceStatBlock(),
            }),
          ],
        }),
        actorId: fighterId,
      }),
    ).state;
    const legendaryAct = discoverBattleActs(state).find(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "attack" &&
        act.subject.attackName === "Tail Swipe" &&
        act.subject.statBlockSection === "legendaryActions",
    );
    if (legendaryAct === undefined) {
      throw new Error("Expected Tail Swipe Legendary Action act.");
    }
    const subject = legendaryAct.subject as Extract<
      BattleSubject,
      { readonly tag: "action"; readonly action: "attack" }
    >;
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(
      state,
      targetHole,
      subject,
      fighterId,
    );
    const damageHole = attackDamageHoleAfterHit(
      state,
      targetHole,
      rollHole,
      { total: 20, naturalD20: 12 },
      subject,
      fighterId,
    );
    const afterLegendary = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(targetHole, fighterId),
          attackRollFill(rollHole, { total: 20, naturalD20: 12 }),
          damageRollFillWithGroups(damageHole, [[2]]),
        ],
      }),
    ).state;

    expect(afterLegendary.currentTurnResources).toEqual(
      state.currentTurnResources,
    );
    expect(afterLegendary.combatants.get(goblinId)?.origin).toMatchObject({
      kind: "statBlock",
      resources: { legendaryActionUsesRemaining: 1 },
    });
    expect(
      discoverBattleActs(afterLegendary).some(
        (act) =>
          act.subject.tag === "action" &&
          act.subject.action === "attack" &&
          act.subject.statBlockSection === "legendaryActions",
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: afterLegendary,
        subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
  });

  test("Legendary Action window closes when the next actor proceeds", () => {
    const state = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-monster-legendary-window-close"),
          combatants: [
            characterSeed({ initiative: 20 }),
            characterSeed({
              combatantId: distantFighterId,
              displayName: "Distant Fighter",
              initiative: 15,
            }),
            statBlockCreatureInit({
              initiative: 10,
              statBlock: monsterResourceStatBlock(),
            }),
          ],
        }),
        actorId: fighterId,
      }),
    ).state;
    const distantSubject: BattleSubject = {
      tag: "action",
      actorId: distantFighterId,
      action: "attack",
      attackName: "Longsword",
    };
    const targetHole = attackInitialTargetHole(state, distantSubject);
    const rollHole = attackRollHoleAfterTarget(
      state,
      targetHole,
      distantSubject,
      goblinId,
    );
    const damageHole = attackDamageHoleAfterHit(
      state,
      targetHole,
      rollHole,
      { total: 20, naturalD20: 12 },
      distantSubject,
      goblinId,
    );
    const afterDistantFighterActs = requireResolved(
      resolveBattleSubject({
        state,
        subject: distantSubject,
        fills: [
          attackTargetFill(
            targetHole,
            distantSubject.actorId,
            goblinId,
            distantSubject.attackName,
          ),
          attackRollFill(rollHole, { total: 20, naturalD20: 12 }),
          damageRollFillWithGroups(damageHole, [[2]]),
        ],
      }),
    ).state;

    expect(
      discoverBattleActs(afterDistantFighterActs).some(
        (act) =>
          act.subject.tag === "action" &&
          act.subject.action === "attack" &&
          act.subject.statBlockSection === "legendaryActions",
      ),
    ).toBe(false);
  });

  test("Legendary Action attacks are not exposed before an eligible turn-end window", () => {
    const state = startBattleRight({
      battleId: battleId("battle-monster-legendary-negative-initial"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({
          initiative: 10,
          statBlock: monsterResourceStatBlock(),
        }),
      ],
    });

    expect(
      discoverBattleActs(state).some(
        (act) =>
          act.subject.tag === "action" &&
          act.subject.action === "attack" &&
          act.subject.statBlockSection === "legendaryActions",
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state,
        subject: monsterAttackSubject("Tail Swipe", "legendaryActions"),
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
  });

  test("Legendary Action attacks are not exposed on the monster's own current turn", () => {
    const ownTurn = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-monster-legendary-negative-own-turn"),
          combatants: [
            characterSeed({ initiative: 20 }),
            statBlockCreatureInit({
              initiative: 10,
              statBlock: monsterResourceStatBlock(),
            }),
          ],
        }),
        actorId: fighterId,
      }),
    ).state;

    expect(
      discoverBattleActs(ownTurn).some(
        (act) =>
          act.subject.tag === "action" &&
          act.subject.action === "attack" &&
          act.subject.statBlockSection === "legendaryActions",
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: ownTurn,
        subject: monsterAttackSubject("Tail Swipe", "legendaryActions"),
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
  });

  test("Goblin Warrior Scimitar attack derives roll bonus and damage from the Stat Block", () => {
    const state = goblinTurnBattle();
    const subject = goblinAttackSubject("Scimitar");
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const rollHole = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(targetHole, fighterId)],
      }),
      "attackRoll",
    );

    expect(rollHole).toMatchObject({
      kind: "attackRoll",
      label: "Scimitar attack roll",
      attackBonus: 4,
      attack: {
        kind: "statBlockAttack",
        attack: { name: "Scimitar" },
      },
    });

    const damageHole = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(targetHole, fighterId),
          attackRollFill(rollHole, { total: 14, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    expect(damageHole).toMatchObject({
      kind: "rolledDice",
      holeId: "battle:attack:damage-result:1d6+2-slashing",
      label: "Scimitar damage (1d6+2-slashing)",
      critical: false,
    });
  });

  test("Goblin Warrior target holes expose caller-selected table targets", () => {
    const state = startBattleRight({
      battleId: battleId("battle-goblin-target-legality"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        characterSeed({ initiative: 10 }),
        characterSeed({
          combatantId: distantFighterId,
          displayName: "Distant Fighter",
          initiative: 9,
        }),
        characterSeed({
          combatantId: longRangeFighterId,
          displayName: "Long Range Fighter",
          initiative: 8,
        }),
      ],
    });

    const scimitarTargetHole = requireHole(
      resolveBattleSubject({
        state,
        subject: goblinAttackSubject("Scimitar"),
        fills: [],
      }),
      "targetChoice",
    );
    const shortbowTargetHole = requireHole(
      resolveBattleSubject({
        state,
        subject: goblinAttackSubject("Shortbow"),
        fills: [],
      }),
      "targetChoice",
    );
    if (
      scimitarTargetHole.kind !== "targetChoice" ||
      shortbowTargetHole.kind !== "targetChoice"
    ) {
      throw new Error("Expected targetChoice holes.");
    }

    expect(scimitarTargetHole.choices).toEqual([
      fighterId,
      distantFighterId,
      longRangeFighterId,
    ]);
    expect(shortbowTargetHole.choices).toEqual([
      fighterId,
      distantFighterId,
      longRangeFighterId,
    ]);
  });

  test("Goblin Warrior Shortbow attack keeps its authored identity separate from Scimitar", () => {
    const state = goblinTurnBattle();
    const shortbowSubject = goblinAttackSubject("Shortbow");
    const shortbowTargetHole = requireHole(
      resolveBattleSubject({ state, subject: shortbowSubject, fills: [] }),
      "targetChoice",
    );
    const shortbowRollHole = requireHole(
      resolveBattleSubject({
        state,
        subject: shortbowSubject,
        fills: [targetFill(shortbowTargetHole, fighterId)],
      }),
      "attackRoll",
    );
    const shortbowDamageHole = requireHole(
      resolveBattleSubject({
        state,
        subject: shortbowSubject,
        fills: [
          targetFill(shortbowTargetHole, fighterId),
          attackRollFill(shortbowRollHole, { total: 14, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    expect(shortbowDamageHole).toMatchObject({
      holeId: "battle:attack:damage-result:1d6+2-piercing",
      label: "Shortbow damage (1d6+2-piercing)",
      attack: {
        kind: "statBlockAttack",
        attack: { name: "Shortbow" },
      },
    });

    const scimitarDamageHole = attackDamageHoleAfterHit(
      state,
      shortbowTargetHole,
      shortbowRollHole,
      { total: 14, naturalD20: 10 },
      goblinAttackSubject("Scimitar"),
      fighterId,
    );
    const confused = resolveBattleSubject({
      state,
      subject: shortbowSubject,
      fills: [
        targetFill(shortbowTargetHole, fighterId),
        attackRollFill(shortbowRollHole, { total: 14, naturalD20: 10 }),
        damageRollFill(scimitarDamageHole, 4),
      ],
    });

    expect(confused).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Attack damage must use the normal hit damage hole.",
    });
  });

  test("Goblin Warrior advantage rider is included when the attack roll had Advantage", () => {
    const state = goblinTurnBattle({ fighterHp: 12 });
    const subject: Extract<
      BattleSubject,
      { readonly tag: "action"; readonly action: "attack" }
    > = {
      tag: "action",
      actorId: goblinId,
      action: "attack",
      attackName: "Scimitar",
      statBlockSection: "actions",
    };
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(
      state,
      targetHole,
      subject,
      fighterId,
    );
    const damageHole = attackDamageHoleAfterHit(
      state,
      targetHole,
      rollHole,
      { total: 18, naturalD20: 14, rollMode: "advantage" },
      subject,
      fighterId,
    );

    expect(damageHole).toMatchObject({
      kind: "rolledDice",
      holeId: "battle:attack:damage-result:1d6+1d4+2-slashing",
      label: "Scimitar damage (1d6+1d4+2-slashing)",
    });

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, fighterId),
        attackRollFill(rollHole, {
          total: 18,
          naturalD20: 14,
          rollMode: "advantage",
        }),
        damageRollFillWithGroups(damageHole, [[4], [3]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: fighterId, hp: 3 }),
        ]),
      },
    });
  });

  test("same-type Stat Block attack damage applies Resistance once after combining components", () => {
    const state = startBattleRight({
      battleId: battleId("battle-combined-resistance-damage"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        resistantSkeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = goblinAttackSubject("Scimitar");
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(
      state,
      targetHole,
      subject,
      skeletonId,
    );
    const damageHole = attackDamageHoleAfterHit(
      state,
      targetHole,
      rollHole,
      { total: 18, naturalD20: 14, rollMode: "advantage" },
      subject,
      skeletonId,
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, skeletonId),
        attackRollFill(rollHole, {
          total: 18,
          naturalD20: 14,
          rollMode: "advantage",
        }),
        damageRollFillWithGroups(damageHole, [[1], [1]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: goblinId },
          { combatantId: skeletonId, hp: 11 },
        ],
      },
    });
  });

  test("Goblin Warrior attack resolves through HP mutation, action spend, and zero-HP policy", () => {
    const state = goblinTurnBattle({ fighterHp: 6 });
    const subject = goblinAttackSubject("Shortbow");
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const rollHole = attackRollHoleAfterTarget(
      state,
      targetHole,
      subject,
      fighterId,
    );
    const damageHole = attackDamageHoleAfterHit(
      state,
      targetHole,
      rollHole,
      { total: 14, naturalD20: 10 },
      subject,
      fighterId,
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(targetHole, fighterId),
        attackRollFill(rollHole, { total: 14, naturalD20: 10 }),
        damageRollFill(damageHole, 4),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentActorId: goblinId,
        turn: { actionResources: [] },
        combatants: [
          {
            combatantId: fighterId,
            hp: 0,
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows",
              deathSaves: { successes: 0, failures: 0 },
              dead: false,
            },
            conditions: expect.arrayContaining(["unconscious", "prone"]),
          },
          { combatantId: goblinId, hp: 10 },
        ],
      },
    });
  });

  test("Skeleton Bludgeoning vulnerability and Poison immunity modify supported damage paths", () => {
    const state = startBattleRight({
      battleId: battleId("battle-skeleton-damage-modifiers"),
      combatants: [
        characterSeed({ initiative: 20, attack: testLightHammerAttack() }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const flailSubject = fighterAttackSubject("Flail");
    const targetHole = attackInitialTargetHole(state, flailSubject);
    const rollHole = attackRollHoleAfterTarget(state, targetHole, flailSubject);
    const damageHole = attackDamageHoleAfterHit(
      state,
      targetHole,
      rollHole,
      { total: 14, naturalD20: 10 },
      flailSubject,
      skeletonId,
    );

    const bludgeoning = resolveBattleSubject({
      state,
      subject: flailSubject,
      fills: [
        targetFill(targetHole, skeletonId),
        attackRollFill(rollHole, { total: 14, naturalD20: 10 }),
        damageRollFill(damageHole, 2),
      ],
    });

    expect(bludgeoning).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          { combatantId: skeletonId, hp: 3 },
        ],
      },
    });

    const poisonState = startBattleRight({
      battleId: battleId("battle-skeleton-poison-immunity"),
      combatants: [
        characterSeed({ initiative: 20, attack: testPoisonWeaponAttack() }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const poisonSubject = fighterAttackSubject("Flail");
    const poisonTarget = attackInitialTargetHole(poisonState, poisonSubject);
    const poisonRoll = attackRollHoleAfterTarget(
      poisonState,
      poisonTarget,
      poisonSubject,
    );
    const poisonDamage = attackDamageHoleAfterHit(
      poisonState,
      poisonTarget,
      poisonRoll,
      { total: 14, naturalD20: 10 },
      poisonSubject,
      skeletonId,
    );
    const poison = resolveBattleSubject({
      state: poisonState,
      subject: poisonSubject,
      fills: [
        targetFill(poisonTarget, skeletonId),
        attackRollFill(poisonRoll, { total: 14, naturalD20: 10 }),
        damageRollFill(poisonDamage, 4),
      ],
    });

    expect(poison).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: fighterId },
          { combatantId: skeletonId, hp: 13 },
        ],
      },
    });
  });
});
