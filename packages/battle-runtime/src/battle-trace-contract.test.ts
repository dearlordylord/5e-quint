import { resolveBattleSubject } from "./battle-runtime.test-support.ts";
import { Either } from "effect";
import { battleStatBlockCombatantSource } from "./stat-block-combatant-admission.ts";
import { describe, expect, test } from "vitest";

import { DieRollResult, Hp, movementFeet } from "@dnd/shared/types";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";
import { invalidResult } from "./battle-reducer/result-helpers.ts";
import { projectAuthoredStatBlock } from "./stat-block-authored-projection.ts";

import {
  battleActTraceCheckpoint,
  battleId,
  battleResolutionTraceCheckpoint,
  battleSnapshotProjection,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  snapshotBattle,
  startBattle,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleRuntimeSession,
  type CombatantId,
} from "./index.ts";

const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});

if (statBlockCatalogResult.tag !== "ok") {
  throw new Error(
    "Battle trace contract tests require the SRD Stat Block catalog.",
  );
}

const statBlockCatalog = statBlockCatalogResult.catalog;
const attackerId = combatantId("trace-attacker");
const targetId = combatantId("trace-target");

describe("battle trace contract", () => {
  test("projects public weapon attack hit replay into QNT-owned checkpoints", () => {
    const session = startBattleRight();
    const state = session.state;
    expect(battleSnapshotProjection(state).snapshot).toEqual(
      snapshotBattle(state),
    );
    const attackAct = requireAttackAct(session);
    const targetHole = requireHole(attackAct.initialHoles, "targetChoice");
    const target = attackTargetFill(targetHole);
    const afterTarget = resolveBattleSubject({
      state,
      subject: attackAct.subject,
      fills: [target],
    });
    const attackRollHole = requireResultHole(afterTarget, "attackRoll");
    const attackRoll = attackRollFill(attackRollHole, {
      naturalD20: 12,
      total: 17,
    });
    const afterAttackRoll = resolveBattleSubject({
      state,
      subject: attackAct.subject,
      fills: [target, attackRoll],
    });
    const damageHole = requireResultHole(afterAttackRoll, "rolledDice");
    const damage = damageRollFill(damageHole, 3);
    const afterDamage = resolveBattleSubject({
      state,
      subject: attackAct.subject,
      fills: [target, attackRoll, damage],
    });

    expect([
      battleActTraceCheckpoint(attackAct),
      battleResolutionTraceCheckpoint(afterTarget),
      battleResolutionTraceCheckpoint(afterAttackRoll),
      battleResolutionTraceCheckpoint(afterDamage),
    ]).toEqual([
      { tag: "actAvailable", holeKinds: ["targetChoice"] },
      { tag: "needsHoles", holeKinds: ["attackRoll"] },
      { tag: "needsHoles", holeKinds: ["rolledDice"] },
      { tag: "resolved" },
    ]);
  });

  test("projects public weapon attack miss replay into QNT-owned checkpoints", () => {
    const session = startBattleRight();
    const state = session.state;
    const attackAct = requireAttackAct(session);
    const targetHole = requireHole(attackAct.initialHoles, "targetChoice");
    const target = attackTargetFill(targetHole);
    const afterTarget = resolveBattleSubject({
      state,
      subject: attackAct.subject,
      fills: [target],
    });
    const attackRollHole = requireResultHole(afterTarget, "attackRoll");
    const attackRoll = attackRollFill(attackRollHole, {
      naturalD20: 4,
      total: 9,
    });
    const afterAttackRoll = resolveBattleSubject({
      state,
      subject: attackAct.subject,
      fills: [target, attackRoll],
    });

    expect([
      battleActTraceCheckpoint(attackAct),
      battleResolutionTraceCheckpoint(afterTarget),
      battleResolutionTraceCheckpoint(afterAttackRoll),
    ]).toEqual([
      { tag: "actAvailable", holeKinds: ["targetChoice"] },
      { tag: "needsHoles", holeKinds: ["attackRoll"] },
      { tag: "resolved" },
    ]);
  });

  test("projects an invalid resolution with its precise reason", () => {
    const state = startBattleRight().state;

    expect(
      battleResolutionTraceCheckpoint(
        invalidResult(state, "invalidFill", "Synthetic invalid fill."),
      ),
    ).toEqual({ tag: "invalid", reason: "invalidFill" });
  });
});

function startBattleRight(): BattleRuntimeSession {
  const result = startBattle({
    battleId: battleId("trace-contract"),
    combatants: [
      statBlockCreatureInit({
        combatantId: attackerId,
        initiative: 20,
      }),
      statBlockCreatureInit({
        combatantId: targetId,
        initiative: 10,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(battleStateInitIssueMessage(result.left));
  }
  return result.right;
}

function requireAttackAct(session: BattleRuntimeSession): AvailableBattleAct {
  const act = discoverBattleActs(session).find(
    (availableAct) =>
      availableAct.subject.tag === "action" &&
      availableAct.subject.action === "attack" &&
      availableAct.subject.actorId === attackerId &&
      availableAct.summary.includes("Scimitar"),
  );
  if (act === undefined) {
    throw new Error("Expected trace fixture to expose Scimitar attack.");
  }
  return act;
}

function requireResultHole(
  result: BattleResolutionResult,
  kind: BattleHole["kind"],
): BattleHole {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected ${kind} hole result.`);
  }
  return requireHole(result.holes, kind);
}

function requireHole(
  holes: readonly BattleHole[],
  kind: BattleHole["kind"],
): BattleHole {
  const hole = holes.find((candidate) => candidate.kind === kind);
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function attackTargetFill(hole: BattleHole): BattleFill {
  if (hole.kind !== "targetChoice") {
    throw new Error("Expected targetChoice hole.");
  }
  if (hole.attack === undefined) {
    throw new Error("Expected attack target context.");
  }
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "attackTargetDistance",
        actorId: attackerId,
        targetId,
        distanceFeet: movementFeet(5),
        ...hole.attack.selection,
      },
    ],
  };
}

function attackRollFill(
  hole: BattleHole,
  value: { readonly naturalD20: number; readonly total: number },
): BattleFill {
  if (hole.kind !== "attackRoll") {
    throw new Error("Expected attackRoll hole.");
  }
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      naturalD20: DieRollResult(value.naturalD20),
      total: value.total,
    },
  };
}

function damageRollFill(hole: BattleHole, dieResult: number): BattleFill {
  if (hole.kind !== "rolledDice") {
    throw new Error("Expected rolledDice hole.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [{ results: [DieRollResult(dieResult)] }],
  };
}

function statBlockCreatureInit(input: {
  readonly combatantId: CombatantId;
  readonly initiative: number;
}): BattleCreatureInit {
  const statBlock = statBlockRecord();
  const projected = Either.getOrThrow(projectAuthoredStatBlock(statBlock));
  return {
    combatantId: input.combatantId,
    displayName: projected.presentation.displayName,
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "statBlock",
      source: Either.getOrThrow(
        battleStatBlockCombatantSource(projected.runtime),
      ),
      currentHp: Hp(projected.runtime.statBlock.hp.value),
      tempHp: Hp(0),
      ammunitionStocks: [],
      conditions: [],
      presentation: projected.presentation,
    },
  };
}

function statBlockRecord(): StatBlockRecord {
  const statBlock = statBlockCatalog.requireStatBlock(
    "stat_block_goblin_warrior",
  );
  const scimitar = statBlock.statBlock.actions?.find(
    (entry) =>
      entry.kind === "executable" &&
      entry.procedure.kind === "attack_roll" &&
      entry.procedure.name === "Scimitar",
  );
  if (
    scimitar === undefined ||
    scimitar.kind !== "executable" ||
    scimitar.procedure.kind !== "attack_roll"
  ) {
    throw new Error("Expected Goblin Warrior Scimitar fixture.");
  }
  return {
    ...statBlock,
    statBlock: {
      ...statBlock.statBlock,
      actions: [scimitar],
    },
  };
}
