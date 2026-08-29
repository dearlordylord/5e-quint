import { movementFeet } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";

import type { BattleTrackedOngoingSpellLightEmitter } from "../battle-state-execution.ts";
import {
  battleEffectExecutionRefForTest,
  elapsedTimeTicks,
} from "../battle-runtime.test-support.ts";
import {
  battleObjectId,
  battleSpellEffectOccurrenceId,
  combatantId,
} from "../identity.ts";
import { battleProcedureExecutionRefForTest } from "../battle-runtime.test-support.ts";
import { parseBattleSpellEffectLevel } from "./spells-effective-level.ts";
import {
  ongoingSpellEffectRefEquals,
  ongoingSpellEffectRefForEmitter,
  ongoingSpellEffectRefKey,
} from "./antimagic-field-suppression.ts";

function trackedEmitter(
  effectRef: ReturnType<typeof battleEffectExecutionRefForTest>,
): BattleTrackedOngoingSpellLightEmitter {
  const sourceSpellLevel = parseBattleSpellEffectLevel(2);
  if (sourceSpellLevel === null) {
    throw new Error("Expected a valid test spell effect level.");
  }
  return {
    kind: "spellLightEmitter",
    effectRef,
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      "recast-light-procedure",
    ),
    sourceCombatantId: combatantId("recast-light-caster"),
    sourceEffectId: battleSpellEffectOccurrenceId("reused-source-effect-id"),
    sourceSpellLevel,
    attachment: {
      kind: "object",
      objectId: battleObjectId("recast-light-object"),
    },
    emission: {
      kind: "brightAndDim",
      brightRadiusFeet: movementFeet(20),
      dimAdditionalFeet: movementFeet(20),
    },
    opaqueCoverInteraction: { kind: "blocksEmission" },
    expiresAt: {
      kind: "duration",
      durationTicks: elapsedTimeTicks(10),
    },
  };
}

describe("tracked ongoing spell light identity", () => {
  test("a removed occurrence stays stale after recast reuses its source effect id", () => {
    const removed = trackedEmitter(
      battleEffectExecutionRefForTest("removed-light-occurrence"),
    );
    const recast = trackedEmitter(
      battleEffectExecutionRefForTest("recast-light-occurrence"),
    );
    const staleRef = ongoingSpellEffectRefForEmitter(removed);
    const currentRef = ongoingSpellEffectRefForEmitter(recast);

    expect(removed.sourceEffectId).toBe(recast.sourceEffectId);
    expect(ongoingSpellEffectRefEquals(staleRef, currentRef)).toBe(false);
    expect(ongoingSpellEffectRefKey(staleRef)).not.toBe(
      ongoingSpellEffectRefKey(currentRef),
    );
  });
});
