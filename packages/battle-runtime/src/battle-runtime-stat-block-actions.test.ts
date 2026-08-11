import { statBlockId as parseSharedStatBlockId } from "@dnd/shared/game-facts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import fc from "fast-check";
// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.ATTACK_CONTROL
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test stat-block.attack-control
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-SIZE-GATED-CONDITION-RIDERS druid_wild_shape
import { battleProcedureExecutionRefForTest } from "./battle-runtime.test-support.ts";
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";
import type {
  BattleHole,
  BattleState,
  BattleSubject,
} from "./battle-runtime.test-support.ts";
import {
  abilityCheckFill,
  attackDamageHoleAfterHit,
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  attackTargetFill,
  assertBattleSnapshotCodecRoundTripForTest,
  battleId,
  battleRuntimeContextForStateForTest,
  characterAttackSubjectForTest,
  characterSeed,
  damageRollFill,
  damageRollFillWithGroups,
  DieRollResult,
  difficultyClass,
  discoverBattleActs,
  distantFighterId,
  endTurn,
  fighterAttackSubject,
  fighterGrapplesGoblin,
  fighterId,
  fighterVsGoblinBattle,
  findAct,
  findHole,
  goblinAttackSubject,
  goblinId,
  goblinTurnBattle,
  grappleOutcomeFill,
  hidePrerequisites,
  longRangeFighterId,
  monsterAttackSubject,
  monsterMultiattackStatBlock,
  monsterResourceStatBlock,
  monsterResourceStatBlockWithTwoRechargeActions,
  monsterResourceStatBlockWithUnsupportedAttackSections,
  movementFeet,
  movementFill,
  requireHole,
  requireNeedsHoles,
  requireResolved,
  resistantSkeletonCreatureInit,
  resolveBattleSubject,
  skeletonCreatureInit,
  skeletonId,
  snapshotBattle,
  startBattleRight,
  statBlockCreatureInit,
  statBlockProcedurePresentationsForStateForTest,
  statBlockRecord,
  targetFill,
  testLightHammerAttack,
  testPoisonWeaponAttack,
} from "./battle-runtime.test-support.ts";
import {
  BattleStatBlockProcedureExecutionRef,
  spellId,
  type BattleResourcePoolExecutionRef,
  type CombatantId,
} from "./identity.ts";
import {
  creatureActionSectionIsSupported,
  creatureNamedAttackRollIsSupported,
} from "./statblock-action-support.ts";
import { supportedStatBlockAttackHitConditionRiders } from "./statblock-attack-hit-condition-support.ts";
import { statBlockRechargeRollFillMatchesHole } from "./battle-reducer/turn-boundary-lifecycle.ts";

function discoverStatBlockActs(state: BattleState) {
  return discoverBattleActs(
    battleRuntimeSessionForTest({
      state,
      context: battleRuntimeContextForStateForTest(state),
    }),
  );
}

test("an empty Stat Block action section is executable", () => {
  expect(creatureActionSectionIsSupported({})).toBe(true);
});

function discoveredMultiattackSubject(state: BattleState): BattleSubject {
  const act = discoverStatBlockActs(state).find(
    (candidate) =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "multiattack",
  );
  if (act === undefined) throw new Error("Expected a discovered Multiattack.");
  return act.subject;
}

function discoveredStatBlockBonusActionSubject(
  state: BattleState,
  standardAction: "disengage" | "hide",
): BattleSubject {
  const act = discoverStatBlockActs(state).find(
    (candidate) =>
      candidate.subject.tag === "bonusAction" &&
      candidate.subject.action === "statBlockActionOption" &&
      candidate.subject.standardAction === standardAction,
  );
  if (act === undefined) {
    throw new Error(`Expected a discovered ${standardAction} option.`);
  }
  return act.subject;
}

function discoveredStatBlockAttackSubject(
  state: BattleState,
  attackName: string,
  damageNotation: "rolled" | "static" = "rolled",
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  const act = discoverStatBlockActs(state).find(
    (candidate) =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "attack" &&
      candidate.subject.procedureRef !== undefined &&
      (candidate.subject.statBlockDamageNotation ?? "rolled") ===
        damageNotation &&
      candidate.summary.includes(attackName),
  );
  if (act?.subject.tag !== "action" || act.subject.action !== "attack") {
    throw new Error(`Expected discovered ${attackName} attack.`);
  }
  return act.subject;
}

function unavailableMultiattackSubject(state: BattleState): BattleSubject {
  return {
    tag: "action",
    actorId: goblinId,
    action: "multiattack",
    procedureRef: procedureRefForAttack(state, "Scimitar"),
  };
}

function resourcePoolRefForAttack(
  state: BattleState,
  attackName: string,
): BattleResourcePoolExecutionRef {
  const actor = state.combatants.get(goblinId);
  if (actor?.origin.kind !== "statBlock") {
    throw new Error("Expected Stat Block goblin.");
  }
  const origin = actor.origin;
  const procedureRef = statBlockProcedurePresentationsForStateForTest(
    state,
    goblinId,
  ).find(
    (candidate) => candidate.kind === "attack" && candidate.name === attackName,
  )?.procedureRef;
  const binding = origin.execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === procedureRef,
  );
  const resourcePoolRef = binding?.resourcePoolRefs[0];
  if (resourcePoolRef === undefined) {
    throw new Error(`Expected ${attackName} to own a resource pool.`);
  }
  return resourcePoolRef;
}

function procedureRefForAttack(
  state: BattleState,
  attackName: string,
): ReturnType<typeof BattleStatBlockProcedureExecutionRef.make> {
  const actor = state.combatants.get(goblinId);
  if (actor?.origin.kind !== "statBlock") {
    throw new Error("Expected Stat Block goblin.");
  }
  const origin = actor.origin;
  const procedureRef = statBlockProcedurePresentationsForStateForTest(
    state,
    goblinId,
  ).find(
    (candidate) => candidate.kind === "attack" && candidate.name === attackName,
  )?.procedureRef;
  const binding = origin.execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === procedureRef,
  );
  if (binding === undefined) {
    throw new Error(`Expected ${attackName} procedure binding.`);
  }
  return binding.procedureRef;
}

function sizeGatedConditionRiderStatBlock(): StatBlockRecord {
  const base = statBlockRecord();
  return {
    ...base,
    id: parseSharedStatBlockId("stat_block_size_gated_condition_test_monster"),
    name: "Size-Gated Condition Test Monster",
    statBlock: {
      ...base.statBlock,
      displayName: "Size-Gated Condition Test Monster",
      actions: {
        attacks: [
          {
            attackAbility: "str",
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
    id: parseSharedStatBlockId(
      "stat_block_untyped_condition_rider_test_monster",
    ),
    name: "Untyped Condition Rider Test Monster",
    statBlock: {
      ...base.statBlock,
      displayName: "Untyped Condition Rider Test Monster",
      actions: {
        attacks: [
          {
            ...bite,
            onHit: [damage, { kind: "apply_condition", condition: "prone" }],
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
    id: parseSharedStatBlockId("stat_block_condition_only_rider_test_monster"),
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
    id: parseSharedStatBlockId(
      "stat_block_non_prone_size_gated_condition_test_monster",
    ),
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
    id: parseSharedStatBlockId("stat_block_large_condition_rider_target"),
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
    id: parseSharedStatBlockId(
      "stat_block_prone_immune_condition_rider_target",
    ),
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

function procedureRefForStatBlockAttackSubject(
  subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >,
) {
  if (subject.procedureRef === undefined) {
    throw new Error("Expected Stat Block attack procedure ref.");
  }
  return BattleStatBlockProcedureExecutionRef.make(subject.procedureRef);
}

function biteMeleeReachFact(
  targetId: CombatantId,
  procedureRef: ReturnType<typeof BattleStatBlockProcedureExecutionRef.make>,
) {
  return [
    {
      kind: "attackTargetInMeleeReach" as const,
      actorId: goblinId,
      targetId,
      procedureRef,
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
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String(spellId("synthetic_prone_immunity")),
          ),
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
    id: parseSharedStatBlockId("stat_block_multi_damage_test_monster"),
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
  if (hole.kind !== "targetChoice" || hole.attack === undefined) {
    throw new Error("Expected attack target selection.");
  }
  return targetFill(hole, fighterId, [
    {
      kind: "attackTargetInRangedRange",
      actorId: goblinId,
      targetId: fighterId,
      ...hole.attack.selection,
      rangeBand: "normal",
    },
  ]);
}

function resolveBiteAgainst(input: {
  readonly battleIdValue: string;
  readonly targetId: CombatantId;
  readonly target: Parameters<typeof startBattleRight>[0]["combatants"][number];
  readonly stateTransform?: (state: BattleState) => BattleState;
  readonly attackRollMode?: "advantage";
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
  const subject = discoveredStatBlockAttackSubject(state, "Bite");
  const targetHole = attackInitialTargetHole(state, subject);
  const targetChoice = targetFill(
    targetHole,
    input.targetId,
    biteMeleeReachFact(
      input.targetId,
      procedureRefForStatBlockAttackSubject(subject),
    ),
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
        attackRollFill(rollHole, {
          total: 20,
          naturalD20: 12,
          ...(input.attackRollMode === undefined
            ? {}
            : { rollMode: input.attackRollMode }),
        }),
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
        attackRollFill(rollHole, {
          total: 20,
          naturalD20: 12,
          ...(input.attackRollMode === undefined
            ? {}
            : { rollMode: input.attackRollMode }),
        }),
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

    const acts = discoverStatBlockActs(afterFighter.state);

    expect(acts.map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        {
          tag: "action",
          actorId: goblinId,
          action: "attack",
          procedureRef: procedureRefForAttack(afterFighter.state, "Scimitar"),
        },
        {
          tag: "action",
          actorId: goblinId,
          action: "attack",
          procedureRef: procedureRefForAttack(afterFighter.state, "Shortbow"),
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
    const subject = discoveredStatBlockAttackSubject(monsterTurn, "Venom Dart");

    expect(
      discoverStatBlockActs(monsterTurn).map((act) => act.subject),
    ).toEqual(
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
      label: "Stat Block Attack damage (1d4+1-piercing+1d6-poison)",
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
    const subject = discoveredStatBlockAttackSubject(
      monsterTurn,
      "Venom Dart",
      "static",
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

    expect(discoverStatBlockActs(state).map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        {
          tag: "action",
          actorId: goblinId,
          action: "attack",
          procedureRef: procedureRefForAttack(state, "Bite"),
        },
        {
          tag: "action",
          actorId: goblinId,
          action: "attack",
          procedureRef: procedureRefForAttack(state, "Bite"),
          statBlockDamageNotation: "static",
        },
      ]),
    );
  });

  test("Stat Block condition-rider support rejects duplicate and nonterminal riders", () => {
    const statBlock = sizeGatedConditionRiderStatBlock();
    const attack = statBlock.statBlock.actions?.attacks?.[0];
    const damage = attack?.onHit[0];
    const rider = attack?.onHit[1];
    if (attack === undefined || damage === undefined || rider === undefined) {
      throw new Error("Expected synthetic Bite damage and condition rider.");
    }

    expect(
      supportedStatBlockAttackHitConditionRiders({
        ...attack,
        onHit: [damage, rider, rider],
      }),
    ).toBeNull();
    expect(
      supportedStatBlockAttackHitConditionRiders({
        ...attack,
        onHit: [rider, damage],
      }),
    ).toBeNull();
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

  test("Stat Block condition riders do not restore consumed one-shot target effects", () => {
    const oneShotProcedureRef = battleProcedureExecutionRefForTest(
      "synthetic-next-attack-against-target",
    );
    const resolved = resolveBiteAgainst({
      battleIdValue:
        "battle-monster-size-gated-condition-consumed-target-effect",
      targetId: fighterId,
      target: characterSeed({ initiative: 10 }),
      attackRollMode: "advantage",
      stateTransform: (state) => {
        const target = state.combatants.get(fighterId);
        if (target === undefined) {
          throw new Error("Expected Bite target.");
        }
        return {
          ...state,
          combatants: new Map(state.combatants).set(fighterId, {
            ...target,
            activeEffects: [
              ...target.activeEffects,
              {
                kind: "nextAttackRollAgainstSelf",
                sourceProcedureRef: oneShotProcedureRef,
                sourceCombatantId: goblinId,
                mode: "advantage",
                expiresAt: { kind: "startOfTurn", combatantId: goblinId },
              },
            ],
          }),
        };
      },
    });
    const target = resolved.combatants.get(fighterId);
    if (target === undefined) {
      throw new Error("Expected Bite target.");
    }

    expect(hasCondition(target.conditions, "prone")).toBe(true);
    expect(
      target.activeEffects.some(
        (effect) =>
          effect.kind === "nextAttackRollAgainstSelf" &&
          effect.sourceProcedureRef === oneShotProcedureRef,
      ),
    ).toBe(false);
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
      stateTransform: (state) => withProneConditionImmunity(state, fighterId),
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

    expect(
      discoverStatBlockActs(state).map((act) => act.summary),
    ).not.toContain("Take the Attack action with Bite.");
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

    expect(
      discoverStatBlockActs(state).map((act) => act.summary),
    ).not.toContain("Take the Attack action with Bite.");
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

    expect(
      discoverStatBlockActs(state).map((act) => act.summary),
    ).not.toContain("Take the Attack action with Bite.");
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
    assertBattleSnapshotCodecRoundTripForTest(snapshotBattle(goblinTurn));

    expect(
      discoveredStatBlockBonusActionSubject(goblinTurn, "disengage"),
    ).toMatchObject({
      actorId: goblinId,
      standardAction: "disengage",
    });
    expect(
      discoveredStatBlockBonusActionSubject(goblinTurn, "hide"),
    ).toMatchObject({
      actorId: goblinId,
      standardAction: "hide",
    });
  });

  test("Goblin Warrior Nimble Escape spends Bonus Action for Disengage", () => {
    const goblinTurn = requireResolved(
      endTurn({ state: fighterVsGoblinBattle(), actorId: fighterId }),
    ).state;
    const subject = discoveredStatBlockBonusActionSubject(
      goblinTurn,
      "disengage",
    );

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
    const subject = discoveredStatBlockBonusActionSubject(goblinTurn, "hide");
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

  test("Goblin Warrior Nimble Escape rejects a discovered Hide after concealment ends", () => {
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
    const subject = discoveredStatBlockBonusActionSubject(goblinTurn, "hide");
    const act = findAct(goblinTurn, subject);
    const staleState = {
      ...goblinTurn,
      hidePrerequisites: new Map(),
    } satisfies BattleState;

    expect(
      resolveBattleSubject({
        state: staleState,
        subject,
        fills: [
          abilityCheckFill(findHole(act.initialHoles, "abilityCheck"), 17),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
      message:
        "Hide requires Heavily Obscured, sufficient cover, or an admitted creature-obscurement permission while out of enemy line of sight.",
    });
  });

  test("Goblin Warrior Nimble Escape can fail its Hide check while spending Bonus Action", () => {
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
    const subject = discoveredStatBlockBonusActionSubject(goblinTurn, "hide");
    const act = findAct(goblinTurn, subject);
    const result = requireResolved(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [
          abilityCheckFill(findHole(act.initialHoles, "abilityCheck"), 1),
        ],
      }),
    ).state;

    expect(result.currentTurnResources.currentHasBonusAction).toBe(false);
    expect(result.combatants.get(goblinId)?.hidden).toBeNull();
  });

  test("limited-use Stat Block Bonus Action rejects a replay after a later turn", () => {
    const base = monsterMultiattackStatBlock();
    const bonusActions = base.statBlock.bonusActions;
    if (bonusActions?.actionOptions === undefined) {
      throw new Error("Expected a Stat Block Bonus Action option.");
    }
    const [firstBonusAction, ...remainingBonusActions] =
      bonusActions.actionOptions;
    if (firstBonusAction === undefined) {
      throw new Error("Expected a first Stat Block Bonus Action option.");
    }
    const statBlock: StatBlockRecord = {
      id: parseSharedStatBlockId(
        "stat_block_limited_bonus_action_replay_test_monster",
      ),
      kind: base.kind,
      name: "Limited Bonus Action Replay Test Monster",
      provenance: {
        kind: "synthetic-test",
        section: "limited-bonus-action-replay-test-monster",
      },
      challengeRating: base.challengeRating,
      statBlock: {
        ...base.statBlock,
        displayName: "Limited Bonus Action Replay Test Monster",
        bonusActions: {
          ...bonusActions,
          actionOptions: [
            {
              ...firstBonusAction,
              limitedUse: { kind: "daily" as const, uses: 1 },
            },
            ...remainingBonusActions.map((option) => ({
              ...option,
              limitedUse: { kind: "daily" as const, uses: 1 },
            })),
          ],
        },
      },
    };
    const goblinTurn = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-stat-block-limited-bonus-replay"),
          combatants: [
            characterSeed({ initiative: 20 }),
            statBlockCreatureInit({ initiative: 10, statBlock }),
          ],
        }),
        actorId: fighterId,
      }),
    ).state;
    const subject = discoveredStatBlockBonusActionSubject(
      goblinTurn,
      "disengage",
    );

    const afterUse = requireResolved(
      resolveBattleSubject({ state: goblinTurn, subject, fills: [] }),
    ).state;
    expect(afterUse.currentTurnResources.currentHasBonusAction).toBe(false);

    const fighterTurn = requireResolved(
      endTurn({ state: afterUse, actorId: goblinId }),
    ).state;
    const nextGoblinTurn = requireResolved(
      endTurn({ state: fighterTurn, actorId: fighterId }),
    ).state;

    expect(
      resolveBattleSubject({ state: nextGoblinTurn, subject, fills: [] }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Stat Block Bonus Action resource is no longer available.",
    });
  });

  test("Stat Block Multiattack rejects malformed fills before an unsupported procedure reference", () => {
    const goblinTurn = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-monster-multiattack-invalid-fill"),
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
    const unrelatedTargetHole = attackInitialTargetHole(
      goblinTurn,
      goblinAttackSubject(goblinTurn, "Scimitar"),
    );

    expect(
      resolveBattleSubject({
        state: goblinTurn,
        subject: unavailableMultiattackSubject(goblinTurn),
        fills: [targetFill(unrelatedTargetHole, fighterId)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Multiattack accepts no fills.",
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
    assertBattleSnapshotCodecRoundTripForTest(snapshotBattle(goblinTurn));
    const subject = discoveredMultiattackSubject(goblinTurn);

    expect(
      discoverStatBlockActs(goblinTurn).map((act) => act.subject),
    ).toContainEqual(subject);

    const multiattackState = requireResolved(
      resolveBattleSubject({ state: goblinTurn, subject, fills: [] }),
    ).state;

    expect(multiattackState.currentTurnResources.actionResources).toEqual([
      {
        kind: "action",
        source: "statBlockMultiattack",
        sourceOwnerId: goblinId,
        attackProcedureRef: procedureRefForAttack(goblinTurn, "Scimitar"),
        restriction: {
          kind: "exclude",
          actions: expect.arrayContaining(["dash", "magic", "utilize"]),
        },
      },
      {
        kind: "action",
        source: "statBlockMultiattack",
        sourceOwnerId: goblinId,
        attackProcedureRef: procedureRefForAttack(goblinTurn, "Shortbow"),
        restriction: {
          kind: "exclude",
          actions: expect.arrayContaining(["dash", "magic", "utilize"]),
        },
      },
    ]);
    const continuationActs = discoverStatBlockActs(multiattackState);
    const continuationSubjects = continuationActs.map((act) => act.subject);
    expect(continuationSubjects).toEqual([
      {
        tag: "action",
        actorId: goblinId,
        action: "attack",
        procedureRef: procedureRefForAttack(multiattackState, "Scimitar"),
      },
      {
        tag: "action",
        actorId: goblinId,
        action: "attack",
        procedureRef: procedureRefForAttack(multiattackState, "Scimitar"),
        statBlockDamageNotation: "static",
      },
      {
        tag: "action",
        actorId: goblinId,
        action: "attack",
        procedureRef: procedureRefForAttack(multiattackState, "Shortbow"),
      },
      {
        tag: "action",
        actorId: goblinId,
        action: "attack",
        procedureRef: procedureRefForAttack(multiattackState, "Shortbow"),
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
    const shortbow = discoverStatBlockActs(multiattackState).find(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "attack" &&
        act.subject.procedureRef ===
          procedureRefForAttack(multiattackState, "Shortbow") &&
        act.subject.statBlockDamageNotation === undefined,
    );
    if (shortbow === undefined) throw new Error("Expected Shortbow act.");
    const shortbowSubject = shortbow.subject;
    const targetChoice = attackTargetFill(
      findHole(shortbow.initialHoles, "targetChoice"),
      goblinId,
      fighterId,
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
        attackProcedureRef: procedureRefForAttack(goblinTurn, "Scimitar"),
      }),
    ]);
    expect(
      discoverStatBlockActs(afterDispatch).map((act) => act.subject),
    ).toEqual(
      expect.arrayContaining([
        {
          tag: "action",
          actorId: goblinId,
          action: "attack",
          procedureRef: procedureRefForAttack(afterDispatch, "Scimitar"),
        },
      ]),
    );
    expect(
      discoverStatBlockActs(afterDispatch).map((act) => act.subject),
    ).not.toContainEqual(shortbowSubject);
    expect(
      resolveBattleSubject({
        state: afterDispatch,
        subject: shortbowSubject,
        fills: [targetChoice],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("limited-use Stat Block Multiattack rejects a replay after its dispatch is spent", () => {
    const base = monsterMultiattackStatBlock({ scimitarCount: 1 });
    const attacks = base.statBlock.actions?.attacks;
    const multiattacks = base.statBlock.actions?.multiattacks;
    const scimitar = attacks?.find((attack) => attack.name === "Scimitar");
    const multiattack = multiattacks?.[0];
    if (
      attacks === undefined ||
      multiattack === undefined ||
      scimitar === undefined
    ) {
      throw new Error("Expected the synthetic Multiattack fixtures.");
    }
    const [firstDispatch] = multiattack.dispatches;
    if (firstDispatch?.name !== "Scimitar") {
      throw new Error(
        "Expected Scimitar to be the first Multiattack dispatch.",
      );
    }
    const statBlock: StatBlockRecord = {
      id: parseSharedStatBlockId(
        "stat_block_limited_multiattack_replay_test_monster",
      ),
      kind: base.kind,
      name: "Limited Multiattack Replay Test Monster",
      provenance: {
        kind: "synthetic-test",
        section: "limited-multiattack-replay-test-monster",
      },
      challengeRating: base.challengeRating,
      statBlock: {
        ...base.statBlock,
        displayName: "Limited Multiattack Replay Test Monster",
        actions: {
          ...base.statBlock.actions,
          attacks: [
            {
              ...scimitar,
              limitedUse: { kind: "daily" as const, uses: 1 },
            },
            ...attacks.filter((attack) => attack.name !== "Scimitar"),
          ],
          multiattacks: [
            {
              ...multiattack,
              dispatches: [firstDispatch],
            },
          ],
        },
      },
    };
    const goblinTurn = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-stat-block-limited-multiattack-replay"),
          combatants: [
            characterSeed({ initiative: 20 }),
            statBlockCreatureInit({ initiative: 10, statBlock }),
          ],
        }),
        actorId: fighterId,
      }),
    ).state;
    const subject = discoveredMultiattackSubject(goblinTurn);
    const afterMultiattack = requireResolved(
      resolveBattleSubject({ state: goblinTurn, subject, fills: [] }),
    ).state;
    const fighterTurn = requireResolved(
      endTurn({ state: afterMultiattack, actorId: goblinId }),
    ).state;
    const nextGoblinTurn = requireResolved(
      endTurn({ state: fighterTurn, actorId: fighterId }),
    ).state;

    expect(
      resolveBattleSubject({ state: nextGoblinTurn, subject, fills: [] }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Multiattack Stat Block resources are no longer available.",
    });
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
    const subject = unavailableMultiattackSubject(goblinTurn);

    expect(
      discoverStatBlockActs(goblinTurn).map((act) => act.subject),
    ).not.toContainEqual(subject);
    expect(
      resolveBattleSubject({ state: goblinTurn, subject, fills: [] }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
    });
  });

  test("Stat Block Multiattack remains gated when repeated dispatches exceed one limited use", () => {
    const statBlock = monsterResourceStatBlock();
    const repeatedLimitedUseStatBlock: StatBlockRecord = {
      ...statBlock,
      id: parseSharedStatBlockId(
        "stat_block_repeated_limited_use_multiattack_test_monster",
      ),
      statBlock: {
        ...statBlock.statBlock,
        actions: {
          ...statBlock.statBlock.actions,
          multiattacks: [
            {
              name: "Synthetic Repeated Limited Attack",
              dispatches: [
                { name: "Dread Gaze", count: { kind: "literal", value: 1 } },
                { name: "Dread Gaze", count: { kind: "literal", value: 1 } },
              ],
            },
          ],
        },
      },
    };
    const goblinTurn = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-monster-multiattack-repeated-limited-use"),
          combatants: [
            characterSeed({ initiative: 20 }),
            statBlockCreatureInit({
              initiative: 10,
              statBlock: repeatedLimitedUseStatBlock,
            }),
          ],
        }),
        actorId: fighterId,
      }),
    ).state;
    const goblin = goblinTurn.combatants.get(goblinId);
    if (goblin?.origin.kind !== "statBlock") {
      throw new Error("Expected Stat Block goblin.");
    }

    expect(
      goblin.origin.execution.procedureBindings.some(
        (binding) => binding.procedure.kind === "multiattack",
      ),
    ).toBe(false);
    expect(
      discoverStatBlockActs(goblinTurn).some(
        (act) =>
          act.subject.tag === "action" && act.subject.action === "multiattack",
      ),
    ).toBe(false);
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
        subject: discoveredMultiattackSubject(goblinTurn),
        fills: [],
      }),
    ).state;

    expect(
      discoverStatBlockActs(multiattackState).map((act) => act.subject),
    ).not.toContainEqual(escapeSubject);
    expect(
      resolveBattleSubject({
        state: multiattackState,
        subject: escapeSubject,
        fills: [grappleOutcomeFill(escape, true)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Pending Stat Block Multiattack dispatches must be resolved, Movement may be taken between attacks, or the turn must end before other battle subjects.",
    });
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
    const subject = unavailableMultiattackSubject(goblinTurn);

    expect(
      discoverStatBlockActs(goblinTurn).map((act) => act.subject),
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

    const cinderBreathPoolRef = resourcePoolRefForAttack(
      state,
      "Cinder Breath",
    );
    const dreadGazePoolRef = resourcePoolRefForAttack(state, "Dread Gaze");
    const goblin = state.combatants.get(goblinId);
    if (goblin?.origin.kind !== "statBlock") {
      throw new Error("Expected Stat Block goblin.");
    }
    const legendaryPool = goblin.origin.execution.resourcePools.find(
      (pool) => pool.kind === "legendaryActions",
    );
    if (legendaryPool === undefined) {
      throw new Error("Expected a Legendary Action resource pool.");
    }
    expect(goblin.origin.execution.resourcePools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resourcePoolRef: cinderBreathPoolRef,
          kind: "recharge",
          available: true,
        }),
        expect.objectContaining({
          resourcePoolRef: dreadGazePoolRef,
          kind: "daily",
          usesRemaining: 1,
        }),
        expect.objectContaining({
          kind: "legendaryActions",
          usesRemaining: 2,
        }),
      ]),
    );
    expect(snapshotBattle(state).combatants).toContainEqual(
      expect.objectContaining({
        combatantId: goblinId,
        origin: expect.objectContaining({
          kind: "statBlock",
          statBlockId: "stat_block_resource_test_monster",
          execution: expect.objectContaining({
            resourcePools: expect.arrayContaining([
              {
                resourcePoolRef: legendaryPool.resourcePoolRef,
                kind: "legendaryActions",
                usesMax: 2,
                usesRemaining: 2,
              },
              {
                resourcePoolRef: cinderBreathPoolRef,
                kind: "recharge",
                minimumRoll: 5,
                available: true,
              },
              {
                resourcePoolRef: dreadGazePoolRef,
                kind: "daily",
                usesMax: 1,
                usesRemaining: 1,
              },
            ]),
          }),
        }),
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
      discoverStatBlockActs(goblinTurn).some(
        (act) =>
          act.summary === "Take the Attack action with Swift Bite." ||
          act.summary === "Take the Attack action with Counter Snap.",
      ),
    ).toBe(false);
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
    const subject = monsterAttackSubject(firstGoblinTurn, "Cinder Breath");
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
      discoverStatBlockActs(spent).some(
        (act) =>
          act.subject.tag === "action" &&
          act.subject.action === "attack" &&
          act.summary.includes("Cinder Breath"),
      ),
    ).toBe(false);

    const fighterTurn = requireResolved(
      endTurn({ state: spent, actorId: goblinId }),
    ).state;
    const cinderBreathPoolRef = resourcePoolRefForAttack(
      fighterTurn,
      "Cinder Breath",
    );
    const rechargeRequest = endTurn({ state: fighterTurn, actorId: fighterId });
    expect(rechargeRequest).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "statBlockRechargeRoll",
          rechargeTargets: [cinderBreathPoolRef],
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
                target: cinderBreathPoolRef,
                roll: DieRollResult(5),
              },
            ],
          },
        ],
      }),
    ).state;

    expect(
      discoverStatBlockActs(recharged).some(
        (act) =>
          act.subject.tag === "action" &&
          act.subject.action === "attack" &&
          act.summary.includes("Cinder Breath"),
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
    const subject = monsterAttackSubject(goblinTurn, "Dread Gaze");
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

    const spentGoblin = spent.combatants.get(goblinId);
    if (spentGoblin?.origin.kind !== "statBlock") {
      throw new Error("Expected spent Stat Block goblin.");
    }
    expect(
      spentGoblin.origin.execution.resourcePools.find(
        (pool) =>
          pool.resourcePoolRef ===
          resourcePoolRefForAttack(spent, "Dread Gaze"),
      ),
    ).toMatchObject({ kind: "daily", usesRemaining: 0 });
    expect(
      discoverStatBlockActs(spent).some(
        (act) =>
          act.subject.tag === "action" &&
          act.subject.action === "attack" &&
          act.subject.procedureRef === subject.procedureRef,
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
    const cinderBreathPoolRef = resourcePoolRefForAttack(
      state,
      "Cinder Breath",
    );
    const ashCloudPoolRef = resourcePoolRefForAttack(state, "Ash Cloud");
    const unavailablePoolRefs = new Set([cinderBreathPoolRef, ashCloudPoolRef]);
    const spentState: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(goblinId, {
        ...goblin,
        origin: {
          ...goblin.origin,
          execution: {
            ...goblin.origin.execution,
            resourcePools: goblin.origin.execution.resourcePools.map((pool) =>
              pool.kind === "recharge" &&
              unavailablePoolRefs.has(pool.resourcePoolRef)
                ? { ...pool, available: false }
                : pool,
            ),
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
          rechargeTargets: [cinderBreathPoolRef, ashCloudPoolRef],
        },
      ],
    });
    if (rechargeRequest.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${rechargeRequest.tag}.`);
    }
    const rechargeHole = requireHole(rechargeRequest, "statBlockRechargeRoll");
    if (rechargeHole.kind !== "statBlockRechargeRoll") {
      throw new Error("Expected a Stat Block Recharge roll hole.");
    }
    expect(statBlockRechargeRollFillMatchesHole([], null)).toBe(true);
    expect(
      statBlockRechargeRollFillMatchesHole(
        [{ target: cinderBreathPoolRef, roll: DieRollResult(1) }],
        null,
      ),
    ).toBe(false);
    expect(statBlockRechargeRollFillMatchesHole([], rechargeHole)).toBe(false);
    expect(
      statBlockRechargeRollFillMatchesHole(
        [
          { target: cinderBreathPoolRef, roll: DieRollResult(7) },
          { target: ashCloudPoolRef, roll: DieRollResult(6) },
        ],
        rechargeHole,
      ),
    ).toBe(false);
    expect(
      statBlockRechargeRollFillMatchesHole(
        [
          { target: cinderBreathPoolRef, roll: DieRollResult(1) },
          { target: cinderBreathPoolRef, roll: DieRollResult(6) },
        ],
        rechargeHole,
      ),
    ).toBe(false);
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 6 }),
        fc.integer({ min: 1, max: 6 }),
        fc.boolean(),
        (cinderRoll, ashRoll, reverse) => {
          const results = [
            {
              target: cinderBreathPoolRef,
              roll: DieRollResult(cinderRoll),
            },
            { target: ashCloudPoolRef, roll: DieRollResult(ashRoll) },
          ] as const;
          expect(
            statBlockRechargeRollFillMatchesHole(
              reverse ? [...results].reverse() : results,
              rechargeHole,
            ),
          ).toBe(true);
        },
      ),
    );

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
                target: cinderBreathPoolRef,
                roll: DieRollResult(4),
              },
              {
                target: ashCloudPoolRef,
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
      rechargedGoblin.origin.execution.resourcePools.find(
        (pool) => pool.resourcePoolRef === cinderBreathPoolRef,
      ),
    ).toMatchObject({ available: false });
    expect(
      rechargedGoblin.origin.execution.resourcePools.find(
        (pool) => pool.resourcePoolRef === ashCloudPoolRef,
      ),
    ).toMatchObject({ available: true });
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
    const legendaryAct = discoverStatBlockActs(state).find(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "attack" &&
        act.subject.procedureRef === procedureRefForAttack(state, "Tail Swipe"),
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
    const legendaryGoblin = afterLegendary.combatants.get(goblinId);
    if (legendaryGoblin?.origin.kind !== "statBlock") {
      throw new Error("Expected Legendary Action Stat Block goblin.");
    }
    expect(
      legendaryGoblin.origin.execution.resourcePools.find(
        (pool) => pool.kind === "legendaryActions",
      ),
    ).toMatchObject({ usesRemaining: 1 });
    expect(
      discoverStatBlockActs(afterLegendary).some(
        (act) =>
          act.subject.tag === "action" &&
          act.subject.action === "attack" &&
          act.subject.procedureRef ===
            procedureRefForAttack(afterLegendary, "Tail Swipe"),
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
    const distantSubject = characterAttackSubjectForTest(
      state,
      distantFighterId,
      "Longsword",
    );
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
          attackTargetFill(targetHole, distantSubject.actorId, goblinId),
          attackRollFill(rollHole, { total: 20, naturalD20: 12 }),
          damageRollFillWithGroups(damageHole, [[2]]),
        ],
      }),
    ).state;

    expect(
      discoverStatBlockActs(afterDistantFighterActs).some(
        (act) =>
          act.subject.tag === "action" &&
          act.subject.action === "attack" &&
          act.subject.procedureRef ===
            procedureRefForAttack(afterDistantFighterActs, "Tail Swipe"),
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
      discoverStatBlockActs(state).some(
        (act) =>
          act.subject.tag === "action" &&
          act.subject.action === "attack" &&
          act.subject.procedureRef ===
            procedureRefForAttack(state, "Tail Swipe"),
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state,
        subject: monsterAttackSubject(state, "Tail Swipe", "legendaryActions"),
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
      discoverStatBlockActs(ownTurn).some(
        (act) =>
          act.subject.tag === "action" &&
          act.subject.action === "attack" &&
          act.subject.procedureRef ===
            procedureRefForAttack(ownTurn, "Tail Swipe"),
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: ownTurn,
        subject: monsterAttackSubject(
          ownTurn,
          "Tail Swipe",
          "legendaryActions",
        ),
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
  });

  test("Goblin Warrior Scimitar attack derives roll bonus and damage from the Stat Block", () => {
    const state = goblinTurnBattle();
    const subject = goblinAttackSubject(state, "Scimitar");
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
      label: "Stat Block Attack attack roll",
      attackBonus: 4,
      attack: {
        kind: "statBlockAttack",
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
      label: "Stat Block Attack damage (1d6+2-slashing)",
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
        subject: goblinAttackSubject(state, "Scimitar"),
        fills: [],
      }),
      "targetChoice",
    );
    const shortbowTargetHole = requireHole(
      resolveBattleSubject({
        state,
        subject: goblinAttackSubject(state, "Shortbow"),
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
    const shortbowSubject = goblinAttackSubject(state, "Shortbow");
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
      label: "Stat Block Attack damage (1d6+2-piercing)",
      attack: {
        kind: "statBlockAttack",
      },
    });

    const scimitarSubject = goblinAttackSubject(state, "Scimitar");
    const scimitarTargetHole = attackInitialTargetHole(state, scimitarSubject);
    const scimitarRollHole = attackRollHoleAfterTarget(
      state,
      scimitarTargetHole,
      scimitarSubject,
      fighterId,
    );
    const scimitarDamageHole = attackDamageHoleAfterHit(
      state,
      scimitarTargetHole,
      scimitarRollHole,
      { total: 14, naturalD20: 10 },
      scimitarSubject,
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
    const subject = discoveredStatBlockAttackSubject(state, "Scimitar");
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
      label: "Stat Block Attack damage (1d6+1d4+2-slashing)",
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

  test("Goblin Warrior static damage includes its Advantage rider without a damage-roll frontier", () => {
    const state = goblinTurnBattle({ fighterHp: 12 });
    const subject = discoveredStatBlockAttackSubject(
      state,
      "Scimitar",
      "static",
    );
    const targetHole = attackInitialTargetHole(state, subject);
    const rollHole = attackRollHoleAfterTarget(
      state,
      targetHole,
      subject,
      fighterId,
    );
    const target = targetFill(targetHole, fighterId);

    const normal = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          target,
          attackRollFill(rollHole, { total: 18, naturalD20: 14 }),
        ],
      }),
    );
    expect(normal.state.combatants.get(fighterId)?.hp).toBe(7);

    const withAdvantage = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          target,
          attackRollFill(rollHole, {
            total: 18,
            naturalD20: 14,
            rollMode: "advantage",
          }),
        ],
      }),
    );
    expect(withAdvantage.state.combatants.get(fighterId)?.hp).toBe(5);
  });

  test("same-type Stat Block attack damage applies Resistance once after combining components", () => {
    const state = startBattleRight({
      battleId: battleId("battle-combined-resistance-damage"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        resistantSkeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = goblinAttackSubject(state, "Scimitar");
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
    const subject = goblinAttackSubject(state, "Shortbow");
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
    const flailSubject = fighterAttackSubject(state, "Flail");
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
    const poisonSubject = fighterAttackSubject(poisonState, "Flail");
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
