import { damageAmount, DieRollResult } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";

import { parseAttackDamageInterruptionFrame } from "./battle-reducer/attack-damage-events.ts";
import type {
  BattleAttackDamageInterruptionBoundaryInput,
  BattleAttackDamageInterruptionFrame,
} from "./battle-state-execution.ts";
import {
  fighterAttackSubject,
  fighterVsGoblinBattle,
  goblinId,
  skeletonId,
} from "./battle-runtime.test-support.ts";

const state = fighterVsGoblinBattle();
const canonicalBoundaryFacts = {
  participant: fighterAttackSubject(state),
  targetId: goblinId,
  targetSpatialFacts: [],
  attackResult: { total: 15, naturalD20: DieRollResult(10) },
  damageInput: {
    kind: "rolledDamage",
    damageRollByType: [{ damageType: "slashing", amount: damageAmount(8) }],
  },
  criticalConsequence: { kind: "ordinaryHit" },
  continuation: {
    concentrationSavingThrows: [],
    damageDisposition: { kind: "ordinaryDamage" },
    attackDamageRiders: [],
  },
} satisfies Omit<BattleAttackDamageInterruptionBoundaryInput, "phase">;

describe("weapon-attack interruption frame boundary", () => {
  test("reconstructed target, attack result, and damage changes are structurally unequal", () => {
    const canonical = decodedFrame({
      ...canonicalBoundaryFacts,
      phase: "attackDamage",
    });
    const changedFrames = [
      decodedFrame({
        ...canonicalBoundaryFacts,
        targetId: skeletonId,
        phase: "attackDamage",
      }),
      decodedFrame({
        ...canonicalBoundaryFacts,
        attackResult: { total: 16, naturalD20: DieRollResult(11) },
        phase: "attackDamage",
      }),
      decodedFrame({
        ...canonicalBoundaryFacts,
        damageInput: {
          kind: "rolledDamage",
          damageRollByType: [
            { damageType: "slashing", amount: damageAmount(7) },
          ],
        },
        phase: "attackDamage",
      }),
    ];

    for (const changed of changedFrames) {
      expect(changed).not.toEqual(canonical);
    }
  });

  test("rejects reconstruction at the Attack Hit phase with a typed result", () => {
    expect(
      parseAttackDamageInterruptionFrame({
        ...canonicalBoundaryFacts,
        phase: "attackHit",
      }),
    ).toEqual({ tag: "invalidPhase", phase: "attackHit" });
  });
});

function decodedFrame(
  input: BattleAttackDamageInterruptionBoundaryInput,
): BattleAttackDamageInterruptionFrame {
  const result = parseAttackDamageInterruptionFrame(input);
  if (result.tag === "invalidPhase") {
    throw new Error("Expected an Attack Damage frame reconstruction.");
  }
  return result.frame;
}
