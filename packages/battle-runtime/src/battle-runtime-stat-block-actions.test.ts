import { statBlockId as parseSharedStatBlockId } from "@dnd/shared/game-facts";
import {
  NonNegativeInteger,
  resourceCount,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import fc from "fast-check";
import { Schema } from "effect";
import * as Either from "effect/Either";
// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.ATTACK_CONTROL
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test stat-block.attack-control
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRUID-WILD-SHAPE-STAT-BLOCK-SIZE-GATED-CONDITION-RIDERS druid_wild_shape
import { battleProcedureExecutionRefForTest } from "./battle-runtime.test-support.ts";
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import { StatBlockProcedureResourceOrdinalSchema } from "@dnd/surface/surface/schema";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";
import type {
  BattleHole,
  BattleState,
  BattleSubject,
} from "./battle-runtime.test-support.ts";
import type { BattleActiveEffect } from "./battle-state-execution.ts";
import {
  abilityCheckFill,
  attackDamageHoleAfterHit,
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  attackTargetFill,
  assertBattleSnapshotCodecRoundTripForTest,
  authoredProcedureOrdinal,
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
  executableProcedureEntry,
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
  monsterResourceStatBlockWithSharedResource,
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
  statBlockRecord,
  targetFill,
  testLightHammerAttack,
  testPoisonWeaponAttack,
} from "./battle-runtime.test-support.ts";
import {
  BattleStatBlockProcedureExecutionRef,
  battleStatBlockProcedureExecutionRef,
  spellId,
  type BattleResourcePoolExecutionRef,
  type CombatantId,
} from "./identity.ts";
import {
  admittedStatBlockExecutionState,
  spendStatBlockMultiattackActivationResources,
  statBlockMultiattackResourcesAvailable,
  statBlockProcedureBinding,
  type StatBlockMultiattackProcedure,
  type StatBlockProcedureBindingFor,
} from "./stat-block-execution-state.ts";
import { statBlockMultiattackEffectiveDispatchProcedureRefsForActor } from "./battle-reducer/statblock.ts";
import {
  creatureActionSectionIsSupported,
  creatureNamedAttackRollIsSupported,
} from "./statblock-action-support.ts";
import { supportedStatBlockAttackHitConditionRiders } from "./statblock-attack-hit-condition-support.ts";
import { statBlockRechargeRollFillMatchesHole } from "./battle-reducer/turn-boundary-lifecycle.ts";
import { isStatBlockBattleCreatureState } from "./battle-reducer/battle-discovery.ts";
import { projectAuthoredStatBlock } from "./stat-block-authored-projection.ts";

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
  procedureOrdinal: number,
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
      candidate.subject.procedureRef ===
        procedureRefForAttack(state, procedureOrdinal),
  );
  if (act?.subject.tag !== "action" || act.subject.action !== "attack") {
    throw new Error(
      `Expected discovered attack procedure ordinal ${procedureOrdinal}.`,
    );
  }
  return act.subject;
}

function unavailableMultiattackSubject(state: BattleState): BattleSubject {
  return {
    tag: "action",
    actorId: goblinId,
    action: "multiattack",
    procedureRef: procedureRefForOrdinal(state, 3),
  };
}

function resourcePoolRefForAttack(
  state: BattleState,
  procedureOrdinal: number,
  section: "actions" | "legendaryActions" = "actions",
): BattleResourcePoolExecutionRef {
  const actor = state.combatants.get(goblinId);
  if (actor?.origin.kind !== "statBlock") {
    throw new Error("Expected Stat Block goblin.");
  }
  const origin = actor.origin;
  const procedureRef = procedureRefForOrdinal(state, procedureOrdinal, section);
  const binding = origin.execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === procedureRef,
  );
  const resourcePoolRef = binding?.resourcePoolRefs[0];
  if (resourcePoolRef === undefined) {
    throw new Error(
      `Expected procedure ordinal ${procedureOrdinal} to own a resource pool.`,
    );
  }
  return resourcePoolRef;
}

function procedureRefForOrdinal(
  state: BattleState,
  procedureOrdinal: number,
  section: "actions" | "legendaryActions" = "actions",
): ReturnType<typeof BattleStatBlockProcedureExecutionRef.make> {
  const actor = state.combatants.get(goblinId);
  if (actor?.origin.kind !== "statBlock") {
    throw new Error("Expected Stat Block goblin.");
  }
  const origin = actor.origin;
  const binding = origin.execution.procedureBindings.find((candidate) => {
    if (candidate.procedure.kind === "unarmedStrike") return false;
    return (
      candidate.procedure.section === section &&
      candidate.procedure.procedureOrdinal ===
        authoredProcedureOrdinal(procedureOrdinal)
    );
  });
  if (binding === undefined) {
    throw new Error(
      `Expected procedure ordinal ${procedureOrdinal} in ${section}.`,
    );
  }
  return binding.procedureRef;
}

function procedureRefForAttack(
  state: BattleState,
  procedureOrdinal: number,
  section: "actions" | "legendaryActions" = "actions",
): ReturnType<typeof BattleStatBlockProcedureExecutionRef.make> {
  const actor = state.combatants.get(goblinId);
  if (actor?.origin.kind !== "statBlock") {
    throw new Error("Expected Stat Block goblin.");
  }
  const binding = actor.origin.execution.procedureBindings.find((candidate) => {
    if (candidate.procedure.kind !== "attack") return false;
    return (
      candidate.procedure.section === section &&
      candidate.procedure.procedureOrdinal ===
        authoredProcedureOrdinal(procedureOrdinal)
    );
  });
  if (binding === undefined) {
    throw new Error(
      `Expected attack procedure ordinal ${procedureOrdinal} in ${section}.`,
    );
  }
  return binding.procedureRef;
}

function resourceOrdinal(value: number) {
  return Schema.decodeSync(StatBlockProcedureResourceOrdinalSchema)(value);
}

function repeatedProcedureRefs(
  procedureRef: BattleStatBlockProcedureExecutionRef,
  count: number,
): ReadonlyNonEmptyArray<BattleStatBlockProcedureExecutionRef> {
  if (count === 1) return [procedureRef];
  return [procedureRef, ...repeatedProcedureRefs(procedureRef, count - 1)];
}

function slowActivePenaltiesEffectForTest(): Extract<
  BattleActiveEffect,
  { readonly kind: "slowActivePenalties" }
> {
  return {
    kind: "slowActivePenalties",
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      "synthetic-slow-multiattack-resource",
    ),
    sourceCombatantId: fighterId,
    save: {
      ability: "wis",
      dc: { kind: "caster_spell_save_dc" },
    },
    expiresAt: {
      kind: "concentration",
      combatantId: fighterId,
      durationTicks: elapsedTimeTicks(10),
    },
  };
}

function authoredAttackProcedure(
  record: StatBlockRecord,
  name: string,
): Extract<
  Extract<
    NonNullable<StatBlockRecord["statBlock"]["actions"]>[number],
    { readonly kind: "executable" }
  >["procedure"],
  { readonly kind: "attack_roll" }
> {
  const entry = record.statBlock.actions?.find(
    (candidate) =>
      candidate.kind === "executable" &&
      candidate.procedure.kind === "attack_roll" &&
      candidate.procedure.name === name,
  );
  if (entry?.kind !== "executable" || entry.procedure.kind !== "attack_roll") {
    throw new Error(`Expected authored ${name} attack.`);
  }
  return entry.procedure;
}

function authoredProcedure(
  record: StatBlockRecord,
  ordinal: number,
): Extract<
  NonNullable<StatBlockRecord["statBlock"]["actions"]>[number],
  { readonly kind: "executable" }
> {
  const entry = record.statBlock.actions?.find(
    (candidate) =>
      candidate.procedureOrdinal === authoredProcedureOrdinal(ordinal),
  );
  if (entry?.kind !== "executable") {
    throw new Error(`Expected authored action ordinal ${ordinal}.`);
  }
  return entry;
}

function sizeGatedConditionRiderStatBlock(): StatBlockRecord {
  const base = statBlockRecord();
  const template = authoredAttackProcedure(base, "Scimitar");
  return {
    ...base,
    id: parseSharedStatBlockId("stat_block_size_gated_condition_test_monster"),
    name: "Size-Gated Condition Test Monster",
    statBlock: {
      ...base.statBlock,
      actions: [
        executableProcedureEntry(1, {
          ...template,
          attackAbility: "str",
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
        }),
      ],
    },
  };
}

function unsupportedConditionRiderStatBlock(): StatBlockRecord {
  const base = sizeGatedConditionRiderStatBlock();
  const bite = authoredAttackProcedure(base, "Bite");
  const damage = bite.onHit[0];
  if (damage === undefined) {
    throw new Error("Expected synthetic Bite damage.");
  }
  return {
    ...base,
    id: parseSharedStatBlockId(
      "stat_block_unsupported_condition_rider_test_monster",
    ),
    name: "Unsupported Condition Rider Test Monster",
    statBlock: {
      ...base.statBlock,
      actions: [
        executableProcedureEntry(1, {
          ...bite,
          onHit: [
            damage,
            {
              condition: "restrained",
              kind: "apply_condition_if_target_size_at_most",
              maxCreatureSize: "medium",
            },
          ],
        }),
      ],
    },
  };
}

function conditionOnlyRiderStatBlock(): StatBlockRecord {
  const base = sizeGatedConditionRiderStatBlock();
  const bite = authoredAttackProcedure(base, "Bite");
  return {
    ...base,
    id: parseSharedStatBlockId("stat_block_condition_only_rider_test_monster"),
    name: "Condition-Only Rider Test Monster",
    statBlock: {
      ...base.statBlock,
      actions: [
        executableProcedureEntry(1, {
          ...bite,
          onHit: [
            {
              condition: "prone",
              kind: "apply_condition_if_target_size_at_most",
              maxCreatureSize: "medium",
            },
          ],
        }),
      ],
    },
  };
}

function nonProneSizeGatedConditionRiderStatBlock(): StatBlockRecord {
  const base = sizeGatedConditionRiderStatBlock();
  const bite = authoredAttackProcedure(base, "Bite");
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
      actions: [
        executableProcedureEntry(1, {
          ...bite,
          onHit: [
            damage,
            {
              condition: "grappled",
              kind: "apply_condition_if_target_size_at_most",
              maxCreatureSize: "medium",
            },
          ],
        }),
      ],
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
      kind: "attackTargetDistance" as const,
      actorId: goblinId,
      targetId,
      distanceFeet: movementFeet(5),
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
  const shortbow = authoredAttackProcedure(base, "Shortbow");
  return {
    ...base,
    id: parseSharedStatBlockId("stat_block_multi_damage_test_monster"),
    name: "Multi Damage Test Monster",
    statBlock: {
      ...base.statBlock,
      actions: [
        executableProcedureEntry(1, {
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
        }),
      ],
    },
  };
}

function venomDartTargetFill(hole: BattleHole) {
  if (hole.kind !== "targetChoice" || hole.attack === undefined) {
    throw new Error("Expected attack target selection.");
  }
  return targetFill(hole, fighterId, [
    {
      kind: "attackTargetDistance",
      actorId: goblinId,
      targetId: fighterId,
      ...hole.attack.selection,
      distanceFeet: movementFeet(5),
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
  const subject = discoveredStatBlockAttackSubject(state, 1);
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
          procedureRef: procedureRefForAttack(afterFighter.state, 1),
        },
        {
          tag: "action",
          actorId: goblinId,
          action: "attack",
          procedureRef: procedureRefForAttack(afterFighter.state, 2),
        },
        { tag: "runtimeCommand", actorId: goblinId, command: "move" },
        { tag: "runtimeCommand", actorId: goblinId, command: "endTurn" },
      ]),
    );
  });

  test("a character cannot execute a Stat Block Multiattack subject", () => {
    const state = fighterVsGoblinBattle();
    const statBlockProcedureRef = procedureRefForAttack(state, 1);

    expect(
      resolveBattleSubject({
        state,
        subject: {
          tag: "action",
          actorId: fighterId,
          action: "multiattack",
          procedureRef: statBlockProcedureRef,
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
      message: "Multiattack requires an admitted Stat Block Multiattack.",
    });
  });

  test("a character cannot execute a Stat Block Bonus Action subject", () => {
    const state = fighterVsGoblinBattle();
    const statBlockProcedureRef = procedureRefForAttack(state, 1);

    expect(
      resolveBattleSubject({
        state,
        subject: {
          tag: "bonusAction",
          actorId: fighterId,
          action: "statBlockActionOption",
          procedureRef: statBlockProcedureRef,
          standardAction: "disengage",
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
      message:
        "Stat Block Bonus Action requires an admitted Stat Block action option.",
    });
  });

  test("a Stat Block Bonus Action rejects another procedure's execution reference", () => {
    const goblinTurn = requireResolved(
      endTurn({ state: fighterVsGoblinBattle(), actorId: fighterId }),
    ).state;
    const subject = discoveredStatBlockBonusActionSubject(
      goblinTurn,
      "disengage",
    );
    if (
      subject.tag !== "bonusAction" ||
      subject.action !== "statBlockActionOption"
    ) {
      throw new Error("Expected a Stat Block Bonus Action subject.");
    }

    expect(
      resolveBattleSubject({
        state: goblinTurn,
        subject: {
          ...subject,
          procedureRef: procedureRefForAttack(goblinTurn, 1),
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
      message:
        "Stat Block Bonus Action requires an admitted Stat Block action option.",
    });
  });

  test("a Stat Block Bonus Action rejects a standard action outside its admitted options", () => {
    const goblinTurn = requireResolved(
      endTurn({ state: fighterVsGoblinBattle(), actorId: fighterId }),
    ).state;
    const subject = discoveredStatBlockBonusActionSubject(
      goblinTurn,
      "disengage",
    );
    if (
      subject.tag !== "bonusAction" ||
      subject.action !== "statBlockActionOption"
    ) {
      throw new Error("Expected a Stat Block Bonus Action subject.");
    }

    expect(
      resolveBattleSubject({
        state: goblinTurn,
        subject: { ...subject, standardAction: "dash" },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
      message:
        "Stat Block Bonus Action requires an admitted Stat Block action option.",
    });
  });

  test("ordinary Stat Blocks do not gain Naturally Stealthy from a larger obscuring creature", () => {
    const goblinTurn = requireResolved(
      endTurn({
        state: fighterVsGoblinBattle({
          hidePrerequisites: hidePrerequisites([
            [
              goblinId,
              {
                kind: "obscuredOnlyByCreatureOutOfEnemyLineOfSight",
                obscuringCreatureId: fighterId,
              },
            ],
          ]),
        }),
        actorId: fighterId,
      }),
    ).state;
    const standardActions = discoverStatBlockActs(goblinTurn).flatMap(
      (candidate) =>
        candidate.subject.tag === "bonusAction" &&
        candidate.subject.action === "statBlockActionOption"
          ? [candidate.subject.standardAction]
          : [],
    );

    expect(standardActions).toContain("disengage");
    expect(standardActions).not.toContain("hide");
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
    const subject = discoveredStatBlockAttackSubject(monsterTurn, 1);

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
    const subject = discoveredStatBlockAttackSubject(monsterTurn, 1, "static");
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
    const attack = authoredAttackProcedure(statBlock, "Bite");

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
          procedureRef: procedureRefForAttack(state, 1),
        },
        {
          tag: "action",
          actorId: goblinId,
          action: "attack",
          procedureRef: procedureRefForAttack(state, 1),
          statBlockDamageNotation: "static",
        },
      ]),
    );
  });

  test("Stat Block condition-rider support rejects duplicate and nonterminal riders", () => {
    const statBlock = sizeGatedConditionRiderStatBlock();
    const attack = authoredAttackProcedure(statBlock, "Bite");
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

  test("Stat Block executable condition riders remain unsupported", () => {
    const statBlock = unsupportedConditionRiderStatBlock();
    const attack = authoredAttackProcedure(statBlock, "Bite");

    expect(creatureNamedAttackRollIsSupported(attack)).toBe(false);
    expect(supportedStatBlockAttackHitConditionRiders(attack)).toBeNull();

    const projected = projectAuthoredStatBlock(statBlock);
    expect(Either.isLeft(projected)).toBe(true);
    if (Either.isRight(projected)) return;
    expect(projected.left).toEqual({
      tag: "battleStatBlockProjectionFailure",
      reason: "unsupportedProcedureBinding",
      issues: [
        {
          section: "actions",
          procedureOrdinal: authoredProcedureOrdinal(1),
        },
      ],
    });
  });

  test("Stat Block attacks with non-Prone target-size condition riders remain unsupported", () => {
    const statBlock = nonProneSizeGatedConditionRiderStatBlock();
    const attack = authoredAttackProcedure(statBlock, "Bite");
    expect(creatureNamedAttackRollIsSupported(attack)).toBe(false);
    expect(supportedStatBlockAttackHitConditionRiders(attack)).toBeNull();

    const projected = projectAuthoredStatBlock(statBlock);
    expect(Either.isLeft(projected)).toBe(true);
    if (Either.isRight(projected)) return;
    expect(projected.left).toEqual({
      tag: "battleStatBlockProjectionFailure",
      reason: "unsupportedProcedureBinding",
      issues: [
        {
          section: "actions",
          procedureOrdinal: authoredProcedureOrdinal(1),
        },
      ],
    });
  });

  test("Stat Block attacks with only condition riders remain unsupported", () => {
    const statBlock = conditionOnlyRiderStatBlock();
    const attack = authoredAttackProcedure(statBlock, "Bite");
    expect(creatureNamedAttackRollIsSupported(attack)).toBe(false);

    const projected = projectAuthoredStatBlock(statBlock);
    expect(Either.isLeft(projected)).toBe(true);
    if (Either.isRight(projected)) return;
    expect(projected.left).toEqual({
      tag: "battleStatBlockProjectionFailure",
      reason: "unsupportedProcedureBinding",
      issues: [
        {
          section: "actions",
          procedureOrdinal: authoredProcedureOrdinal(1),
        },
      ],
    });
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
    if (bonusActions === undefined) {
      throw new Error("Expected a Stat Block Bonus Action option.");
    }
    const [firstBonusAction] = bonusActions;
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
        bonusActions: [
          {
            ...firstBonusAction,
            resourceRefs: {
              kind: "some",
              ordinals: [resourceOrdinal(1)],
            },
          },
        ],
        resources: [
          {
            ordinal: resourceOrdinal(1),
            ownership: "each",
            limit: { kind: "daily", uses: 1 },
          },
        ],
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
        attackProcedureRef: procedureRefForAttack(goblinTurn, 1),
        restriction: {
          kind: "exclude",
          actions: expect.arrayContaining(["dash", "magic", "utilize"]),
        },
      },
      {
        kind: "action",
        source: "statBlockMultiattack",
        sourceOwnerId: goblinId,
        attackProcedureRef: procedureRefForAttack(goblinTurn, 2),
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
        procedureRef: procedureRefForAttack(multiattackState, 1),
      },
      {
        tag: "action",
        actorId: goblinId,
        action: "attack",
        procedureRef: procedureRefForAttack(multiattackState, 1),
        statBlockDamageNotation: "static",
      },
      {
        tag: "action",
        actorId: goblinId,
        action: "attack",
        procedureRef: procedureRefForAttack(multiattackState, 2),
      },
      {
        tag: "action",
        actorId: goblinId,
        action: "attack",
        procedureRef: procedureRefForAttack(multiattackState, 2),
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
          procedureRefForAttack(multiattackState, 2) &&
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
        attackProcedureRef: procedureRefForAttack(goblinTurn, 1),
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
          procedureRef: procedureRefForAttack(afterDispatch, 1),
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
    const actions = base.statBlock.actions;
    const scimitar = authoredProcedure(base, 1);
    const multiattack = authoredProcedure(base, 3);
    if (actions === undefined || multiattack.procedure.kind !== "multiattack") {
      throw new Error("Expected the synthetic Multiattack fixtures.");
    }
    const [firstDispatch] = multiattack.procedure.dispatches;
    if (firstDispatch?.procedureOrdinal !== authoredProcedureOrdinal(1)) {
      throw new Error(
        "Expected authored ordinal 1 to be the first Multiattack dispatch.",
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
        actions: [
          {
            ...scimitar,
            resourceRefs: {
              kind: "some",
              ordinals: [resourceOrdinal(1)],
            },
          },
          ...actions.filter(
            (entry) =>
              entry.procedureOrdinal !== scimitar.procedureOrdinal &&
              entry.procedureOrdinal !== multiattack.procedureOrdinal,
          ),
          executableProcedureEntry(3, {
            ...multiattack.procedure,
            dispatches: [firstDispatch],
          }),
        ],
        resources: [
          {
            ordinal: resourceOrdinal(1),
            ownership: "each",
            limit: { kind: "daily", uses: 1 },
          },
        ],
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

  test("Stat Block Multiattack spends its own limited-use resource and rejects replay", () => {
    const base = monsterMultiattackStatBlock();
    const actions = base.statBlock.actions;
    const multiattack = authoredProcedure(base, 3);
    if (actions === undefined || multiattack.procedure.kind !== "multiattack") {
      throw new Error("Expected the synthetic Multiattack fixtures.");
    }
    const retainedActions = actions.filter(
      (entry) => entry.procedureOrdinal !== multiattack.procedureOrdinal,
    );
    const [firstRetainedAction, ...remainingRetainedActions] = retainedActions;
    if (firstRetainedAction === undefined) {
      throw new Error("Expected a non-Multiattack action fixture.");
    }
    const statBlock: StatBlockRecord = {
      ...base,
      id: parseSharedStatBlockId(
        "stat_block_limited_multiattack_own_resource_test_monster",
      ),
      name: "Limited Multiattack Own Resource Test Monster",
      provenance: {
        kind: "synthetic-test",
        section: "limited-multiattack-own-resource-test-monster",
      },
      statBlock: {
        ...base.statBlock,
        actions: [
          firstRetainedAction,
          ...remainingRetainedActions,
          {
            ...executableProcedureEntry(3, multiattack.procedure),
            resourceRefs: {
              kind: "some",
              ordinals: [resourceOrdinal(1)],
            },
          },
        ],
        resources: [
          {
            ordinal: resourceOrdinal(1),
            ownership: "each",
            limit: { kind: "daily", uses: 1 },
          },
        ],
      },
    };
    const goblinTurn = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-stat-block-multiattack-own-resource"),
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
    const goblin = afterMultiattack.combatants.get(goblinId);
    if (goblin?.origin.kind !== "statBlock") {
      throw new Error("Expected Stat Block goblin.");
    }
    expect(goblin.origin.execution.resourcePools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "daily", usesRemaining: 0 }),
      ]),
    );
    const fighterTurn = requireResolved(
      endTurn({ state: afterMultiattack, actorId: goblinId }),
    ).state;
    const nextGoblinTurn = requireResolved(
      endTurn({ state: fighterTurn, actorId: fighterId }),
    ).state;

    expect(
      discoverStatBlockActs(nextGoblinTurn).map((act) => act.subject),
    ).not.toContainEqual(subject);
    expect(
      resolveBattleSubject({ state: nextGoblinTurn, subject, fills: [] }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Multiattack Stat Block resources are no longer available.",
    });
  });

  test("Stat Block Multiattack spends overlapping binding and dispatch resources atomically", () => {
    const base = monsterResourceStatBlock();
    const actions = base.statBlock.actions;
    const resources = base.statBlock.resources;
    if (actions === undefined || resources === undefined) {
      throw new Error("Expected resource-backed Stat Block fixtures.");
    }
    const [firstResource, ...remainingResources] = resources;
    if (firstResource === undefined) {
      throw new Error("Expected the first Stat Block resource fixture.");
    }
    const statBlock: StatBlockRecord = {
      ...base,
      id: parseSharedStatBlockId(
        "stat_block_multiattack_binding_dispatch_overlap_test_monster",
      ),
      name: "Multiattack Binding Dispatch Overlap Test Monster",
      provenance: {
        kind: "synthetic-test",
        section: "multiattack-binding-dispatch-overlap-test-monster",
      },
      statBlock: {
        ...base.statBlock,
        actions: [
          ...actions,
          {
            ...executableProcedureEntry(3, {
              kind: "multiattack",
              name: "Synthetic Binding Dispatch Overlap",
              dispatches: [
                {
                  procedureOrdinal: authoredProcedureOrdinal(1),
                  count: { kind: "literal", value: 1 },
                },
              ],
            }),
            resourceRefs: {
              kind: "some",
              ordinals: [resourceOrdinal(1)],
            },
          },
        ],
        resources: [
          {
            ...firstResource,
            ownership: "shared",
            limit: { kind: "daily", uses: 2 },
          },
          ...remainingResources,
        ],
      },
    };
    const goblinTurn = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-stat-block-multiattack-overlap"),
          combatants: [
            characterSeed({ initiative: 20 }),
            statBlockCreatureInit({
              initiative: 10,
              statBlock,
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
    const multiattackBinding = goblin.origin.execution.procedureBindings.find(
      (binding) => binding.procedure.kind === "multiattack",
    );
    if (
      multiattackBinding === undefined ||
      multiattackBinding.procedure.kind !== "multiattack"
    ) {
      throw new Error("Expected the overlapping Multiattack binding.");
    }
    const [firstDispatch] = multiattackBinding.procedure.dispatchProcedureRefs;
    const dispatchBinding = goblin.origin.execution.procedureBindings.find(
      (binding) => binding.procedureRef === firstDispatch,
    );
    if (dispatchBinding === undefined) {
      throw new Error("Expected the first Multiattack dispatch binding.");
    }
    expect(multiattackBinding.resourcePoolRefs).toEqual(
      dispatchBinding.resourcePoolRefs,
    );
    const [resourcePoolRef] = multiattackBinding.resourcePoolRefs;
    if (resourcePoolRef === undefined) {
      throw new Error("Expected the overlapping resource pool.");
    }

    const subject = discoveredMultiattackSubject(goblinTurn);
    const afterMultiattack = requireResolved(
      resolveBattleSubject({ state: goblinTurn, subject, fills: [] }),
    ).state;
    const afterGoblin = afterMultiattack.combatants.get(goblinId);
    if (afterGoblin?.origin.kind !== "statBlock") {
      throw new Error("Expected Stat Block goblin after Multiattack.");
    }
    expect(afterGoblin.origin.execution.resourcePools).toContainEqual(
      expect.objectContaining({
        resourcePoolRef,
        kind: "daily",
        usesRemaining: 0,
      }),
    );
    const fighterTurn = requireResolved(
      endTurn({ state: afterMultiattack, actorId: goblinId }),
    ).state;
    const nextGoblinTurn = requireResolved(
      endTurn({ state: fighterTurn, actorId: fighterId }),
    ).state;
    expect(
      discoverStatBlockActs(nextGoblinTurn).map((act) => act.subject),
    ).not.toContainEqual(subject);
    expect(
      resolveBattleSubject({ state: nextGoblinTurn, subject, fills: [] }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Multiattack Stat Block resources are no longer available.",
    });
  });

  test("slowed Stat Block Multiattack gates and spends only its effective first dispatch resources", () => {
    const base = monsterResourceStatBlock();
    const actions = base.statBlock.actions;
    const resources = base.statBlock.resources;
    if (actions === undefined || resources === undefined) {
      throw new Error("Expected resource-backed Stat Block fixtures.");
    }
    const [firstResource, ...remainingResources] = resources;
    if (firstResource === undefined) {
      throw new Error("Expected the first Stat Block resource fixture.");
    }
    const statBlock: StatBlockRecord = {
      ...base,
      id: parseSharedStatBlockId(
        "stat_block_slow_multiattack_resource_test_monster",
      ),
      name: "Slow Multiattack Resource Test Monster",
      provenance: {
        kind: "synthetic-test",
        section: "slow-multiattack-resource-test-monster",
      },
      statBlock: {
        ...base.statBlock,
        actions: [
          ...actions,
          {
            ...executableProcedureEntry(3, {
              kind: "multiattack",
              name: "Synthetic Slow Multiattack",
              dispatches: [
                {
                  procedureOrdinal: authoredProcedureOrdinal(1),
                  count: { kind: "literal", value: 1 },
                },
                {
                  procedureOrdinal: authoredProcedureOrdinal(2),
                  count: { kind: "literal", value: 1 },
                },
              ],
            }),
            resourceRefs: {
              kind: "some",
              ordinals: [resourceOrdinal(1)],
            },
          },
        ],
        resources: [
          {
            ...firstResource,
            ownership: "shared",
            limit: { kind: "daily", uses: 2 },
          },
          ...remainingResources,
        ],
      },
    };
    const goblinTurn = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-stat-block-slow-multiattack-resource"),
          combatants: [
            characterSeed({ initiative: 20 }),
            statBlockCreatureInit({
              initiative: 10,
              statBlock,
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
    const slowedGoblinTurn: BattleState = {
      ...goblinTurn,
      combatants: new Map(goblinTurn.combatants).set(goblinId, {
        ...goblin,
        activeEffects: [
          ...goblin.activeEffects,
          slowActivePenaltiesEffectForTest(),
        ],
      }),
    };
    const subject = discoveredMultiattackSubject(slowedGoblinTurn);
    const afterMultiattack = requireResolved(
      resolveBattleSubject({
        state: slowedGoblinTurn,
        subject,
        fills: [],
      }),
    ).state;
    const afterGoblin = afterMultiattack.combatants.get(goblinId);
    if (afterGoblin?.origin.kind !== "statBlock") {
      throw new Error("Expected Stat Block goblin after Multiattack.");
    }
    expect(
      afterMultiattack.currentTurnResources.actionResources.filter(
        (resource) => resource.source === "statBlockMultiattack",
      ),
    ).toEqual([]);
    expect(afterGoblin.origin.execution.resourcePools).toContainEqual(
      expect.objectContaining({ kind: "daily", usesRemaining: 0 }),
    );
  });

  test("Stat Block Multiattack resource demand matches the independent capacity oracle", () => {
    const baseTurn = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-stat-block-multiattack-resource-oracle"),
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
    const actor = baseTurn.combatants.get(goblinId);
    if (!isStatBlockBattleCreatureState(actor)) {
      throw new Error("Expected Stat Block goblin.");
    }
    const firstAttackRef = procedureRefForAttack(baseTurn, 1);
    const secondAttackRef = procedureRefForAttack(baseTurn, 2);
    const firstAttackBinding = statBlockProcedureBinding(
      actor.origin.execution,
      firstAttackRef,
    );
    const secondAttackBinding = statBlockProcedureBinding(
      actor.origin.execution,
      secondAttackRef,
    );
    const ownPoolRef = firstAttackBinding?.resourcePoolRefs[0];
    const dispatchPoolRef = secondAttackBinding?.resourcePoolRefs[0];
    if (ownPoolRef === undefined || dispatchPoolRef === undefined) {
      throw new Error("Expected resource-backed attack bindings.");
    }
    const multiattackProcedureRef = battleStatBlockProcedureExecutionRef(
      actor.origin.execution.scopeRef,
      NonNegativeInteger(99),
    );

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3 }),
        fc.integer({ min: 1, max: 3 }),
        fc.boolean(),
        fc.boolean(),
        (availableUses, dispatchCount, slowed, shared) => {
          const binding: StatBlockProcedureBindingFor<StatBlockMultiattackProcedure> =
            {
              procedureRef: multiattackProcedureRef,
              resourcePoolRefs: [shared ? dispatchPoolRef : ownPoolRef],
              procedure: {
                kind: "multiattack",
                section: "actions",
                procedureOrdinal: authoredProcedureOrdinal(99),
                dispatchProcedureRefs: repeatedProcedureRefs(
                  secondAttackRef,
                  dispatchCount,
                ),
              },
            };
          const actorForPlan = slowed
            ? {
                ...actor,
                activeEffects: [
                  ...actor.activeEffects,
                  slowActivePenaltiesEffectForTest(),
                ],
              }
            : actor;
          const effectiveDispatchProcedureRefs =
            statBlockMultiattackEffectiveDispatchProcedureRefsForActor(
              actorForPlan,
              binding,
            );
          const [consumedProcedureRef, ...pendingProcedureRefs] =
            effectiveDispatchProcedureRefs;
          const relevantResourcePoolRefs = shared
            ? [dispatchPoolRef]
            : [ownPoolRef, dispatchPoolRef];
          const execution = admittedStatBlockExecutionState({
            ...actor.origin.execution,
            procedureBindings: [
              ...actor.origin.execution.procedureBindings,
              binding,
            ],
            resourcePools: actor.origin.execution.resourcePools.map((pool) =>
              relevantResourcePoolRefs.includes(pool.resourcePoolRef)
                ? {
                    resourcePoolRef: pool.resourcePoolRef,
                    kind: "daily" as const,
                    ownership: shared ? ("shared" as const) : ("each" as const),
                    usesMax: resourceCount(3),
                    usesRemaining: resourceCount(availableUses),
                  }
                : pool,
            ),
          });
          const effectiveDispatchCount = slowed ? 1 : dispatchCount;
          const expectedAvailable = shared
            ? availableUses >= 1 + effectiveDispatchCount
            : availableUses >= 1 && availableUses >= effectiveDispatchCount;

          expect(effectiveDispatchProcedureRefs).toHaveLength(
            effectiveDispatchCount,
          );
          expect(pendingProcedureRefs).toHaveLength(
            slowed ? 0 : dispatchCount - 1,
          );
          expect(
            statBlockMultiattackResourcesAvailable(
              execution,
              binding,
              effectiveDispatchProcedureRefs,
            ),
          ).toBe(expectedAvailable);

          if (!expectedAvailable) {
            return;
          }
          const spent = spendStatBlockMultiattackActivationResources(
            execution,
            binding,
            consumedProcedureRef,
          );
          const bindingPool = spent.resourcePools.find(
            (pool) =>
              pool.resourcePoolRef === (shared ? dispatchPoolRef : ownPoolRef),
          );
          const dispatchPool = spent.resourcePools.find(
            (pool) => pool.resourcePoolRef === dispatchPoolRef,
          );
          if (shared) {
            expect(bindingPool).toEqual(dispatchPool);
            expect(dispatchPool).toEqual(
              expect.objectContaining({
                kind: "daily",
                usesRemaining: resourceCount(availableUses - 2),
              }),
            );
          } else {
            expect(bindingPool).toEqual(
              expect.objectContaining({
                kind: "daily",
                usesRemaining: resourceCount(availableUses - 1),
              }),
            );
            expect(dispatchPool).toEqual(
              expect.objectContaining({
                kind: "daily",
                usesRemaining: resourceCount(availableUses - 1),
              }),
            );
          }
        },
      ),
      { numRuns: 48 },
    );
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

  test("Stat Block action bindings preserve shared resource identity by ordinal", () => {
    const statBlock = monsterResourceStatBlockWithSharedResource();
    const goblinTurn = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-monster-shared-resource-identity"),
          combatants: [
            characterSeed({ initiative: 20 }),
            statBlockCreatureInit({
              initiative: 10,
              statBlock,
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

    const cinderBinding = goblin.origin.execution.procedureBindings.find(
      (binding) =>
        binding.procedureRef === procedureRefForAttack(goblinTurn, 1),
    );
    const dreadBinding = goblin.origin.execution.procedureBindings.find(
      (binding) =>
        binding.procedureRef === procedureRefForAttack(goblinTurn, 2),
    );
    if (cinderBinding === undefined || dreadBinding === undefined) {
      throw new Error("Expected both shared-resource action bindings.");
    }
    expect(cinderBinding.resourcePoolRefs).toEqual(
      dreadBinding.resourcePoolRefs,
    );
    expect(cinderBinding.resourcePoolRefs).toHaveLength(1);
  });

  test("Stat Block Multiattack rejects multiple dispatches beyond a shared one-use pool", () => {
    const base = monsterResourceStatBlockWithSharedResource();
    const actions = base.statBlock.actions;
    if (actions === undefined) {
      throw new Error("Expected shared-resource action fixtures.");
    }
    const statBlock: StatBlockRecord = {
      ...base,
      id: parseSharedStatBlockId(
        "stat_block_repeated_limited_use_multiattack_test_monster",
      ),
      statBlock: {
        ...base.statBlock,
        actions: [
          ...actions,
          {
            ...executableProcedureEntry(3, {
              kind: "multiattack",
              name: "Synthetic Repeated Limited Attack",
              dispatches: [
                {
                  procedureOrdinal: authoredProcedureOrdinal(1),
                  count: { kind: "literal", value: 1 },
                },
                {
                  procedureOrdinal: authoredProcedureOrdinal(2),
                  count: { kind: "literal", value: 1 },
                },
              ],
            }),
            resourceRefs: { kind: "none" },
          },
        ],
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
              statBlock,
            }),
          ],
        }),
        actorId: fighterId,
      }),
    ).state;
    const multiattackSubject = unavailableMultiattackSubject(goblinTurn);
    expect(
      discoverStatBlockActs(goblinTurn).map((act) => act.subject),
    ).not.toContainEqual(multiattackSubject);
    const rejected = resolveBattleSubject({
      state: goblinTurn,
      subject: multiattackSubject,
      fills: [],
    });
    expect(rejected).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Multiattack Stat Block resources are no longer available.",
    });
    if (rejected.tag !== "invalid") {
      throw new Error("Expected shared-pool Multiattack rejection.");
    }
    expect(rejected.snapshot).toEqual(snapshotBattle(goblinTurn));
  });

  test("Stat Block Multiattack rejects a count-two dispatch against a shared one-use pool", () => {
    const base = monsterResourceStatBlockWithSharedResource();
    const actions = base.statBlock.actions;
    if (actions === undefined) {
      throw new Error("Expected shared-resource action fixtures.");
    }
    const statBlock: StatBlockRecord = {
      ...base,
      id: parseSharedStatBlockId(
        "stat_block_count_two_limited_use_multiattack_test_monster",
      ),
      name: "Count Two Limited Multiattack Test Monster",
      provenance: {
        kind: "synthetic-test",
        section: "count-two-limited-use-multiattack-test-monster",
      },
      statBlock: {
        ...base.statBlock,
        actions: [
          ...actions,
          executableProcedureEntry(3, {
            kind: "multiattack",
            name: "Synthetic Count Two Limited Attack",
            dispatches: [
              {
                procedureOrdinal: authoredProcedureOrdinal(1),
                count: { kind: "literal", value: 2 },
              },
            ],
          }),
        ],
      },
    };
    const goblinTurn = requireResolved(
      endTurn({
        state: startBattleRight({
          battleId: battleId("battle-monster-multiattack-count-two-limited"),
          combatants: [
            characterSeed({ initiative: 20 }),
            statBlockCreatureInit({
              initiative: 10,
              statBlock,
            }),
          ],
        }),
        actorId: fighterId,
      }),
    ).state;
    const multiattackSubject = unavailableMultiattackSubject(goblinTurn);
    expect(
      discoverStatBlockActs(goblinTurn).map((act) => act.subject),
    ).not.toContainEqual(multiattackSubject);
    const rejected = resolveBattleSubject({
      state: goblinTurn,
      subject: multiattackSubject,
      fills: [],
    });
    expect(rejected).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Multiattack Stat Block resources are no longer available.",
    });
    if (rejected.tag !== "invalid") {
      throw new Error("Expected count-two Multiattack rejection.");
    }
    expect(rejected.snapshot).toEqual(snapshotBattle(goblinTurn));
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

  test("Stat Block Multiattack dispatches by ordinal when authored labels duplicate", () => {
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
    ).toContainEqual(subject);
    const after = requireResolved(
      resolveBattleSubject({ state: goblinTurn, subject, fills: [] }),
    ).state;
    expect(after.currentTurnResources.actionResources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          attackProcedureRef: procedureRefForAttack(goblinTurn, 1),
        }),
        expect.objectContaining({
          attackProcedureRef: procedureRefForAttack(goblinTurn, 2),
        }),
      ]),
    );
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

    const cinderBreathPoolRef = resourcePoolRefForAttack(state, 1);
    const dreadGazePoolRef = resourcePoolRefForAttack(state, 2);
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
                ownership: "each",
              },
              {
                resourcePoolRef: dreadGazePoolRef,
                kind: "daily",
                usesMax: 1,
                usesRemaining: 1,
                ownership: "each",
              },
            ]),
          }),
        }),
      }),
    );
  });

  test("Stat Block Bonus Action and Reaction attack sections reject unsupported bindings", () => {
    const projected = projectAuthoredStatBlock(
      monsterResourceStatBlockWithUnsupportedAttackSections(),
    );
    expect(Either.isLeft(projected)).toBe(true);
    if (Either.isRight(projected)) return;
    expect(projected.left).toEqual({
      tag: "battleStatBlockProjectionFailure",
      reason: "unsupportedProcedureBinding",
      issues: [
        {
          section: "bonusActions",
          procedureOrdinal: authoredProcedureOrdinal(1),
        },
      ],
    });
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
    const cinderBreathPoolRef = resourcePoolRefForAttack(fighterTurn, 1);
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
        (pool) => pool.resourcePoolRef === resourcePoolRefForAttack(spent, 2),
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
    const cinderBreathPoolRef = resourcePoolRefForAttack(state, 1);
    const ashCloudPoolRef = resourcePoolRefForAttack(state, 3);
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
        act.subject.procedureRef ===
          procedureRefForAttack(state, 1, "legendaryActions"),
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
            procedureRefForAttack(afterLegendary, 1, "legendaryActions"),
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
            procedureRefForAttack(
              afterDistantFighterActs,
              1,
              "legendaryActions",
            ),
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
            procedureRefForAttack(state, 1, "legendaryActions"),
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
            procedureRefForAttack(ownTurn, 1, "legendaryActions"),
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
    const subject = discoveredStatBlockAttackSubject(state, 1);
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
    const subject = discoveredStatBlockAttackSubject(state, 1, "static");
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
