import {
  battleActiveEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
} from "../battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";

import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";

import { combatantId, type BattleProcedureExecutionRef } from "../identity.ts";
import type { SpellActiveEffect } from "./execution-ref.ts";
import {
  spellActiveEffectExecutionRef,
  spellActiveEffectForExecutionRef,
} from "./execution-ref.ts";

const sourceId = combatantId("effect-source");

function syntheticEffect(
  sourceProcedureRef: BattleProcedureExecutionRef,
  condition: "charmed" | "frightened",
): SpellActiveEffect {
  return {
    kind: "spellCondition",
    effectRef: battleActiveEffectExecutionRefForTest(
      `${sourceProcedureRef}:${condition}`,
    ),
    sourceProcedureRef,
    sourceCombatantId: sourceId,
    condition,
    conditionHadNonSpellSource: false,
    escape: null,
    turnStartDamage: null,
    expiresAt: {
      kind: "duration",
      durationTicks: elapsedTimeTicks(60),
    },
  };
}

describe("spell active-effect execution references", () => {
  test("exclude authored source identity while retaining runtime distinctions", () => {
    const firstCharm = syntheticEffect(
      battleProcedureExecutionRefForTest("synthetic-first-spell"),
      "charmed",
    );
    const renamedCharm = syntheticEffect(
      battleProcedureExecutionRefForTest("synthetic-renamed-spell"),
      "charmed",
    );
    const frightened = syntheticEffect(
      battleProcedureExecutionRefForTest("synthetic-first-spell"),
      "frightened",
    );

    expect(spellActiveEffectExecutionRef(firstCharm)).not.toBe(
      spellActiveEffectExecutionRef(renamedCharm),
    );
    expect(spellActiveEffectExecutionRef(firstCharm)).not.toBe(
      spellActiveEffectExecutionRef(frightened),
    );
    expect(spellActiveEffectExecutionRef(firstCharm)).toBe(
      firstCharm.effectRef,
    );
  });

  test("looks up an effect only by its branded runtime projection", () => {
    const charm = syntheticEffect(
      battleProcedureExecutionRefForTest("synthetic-charm"),
      "charmed",
    );
    const frightened = syntheticEffect(
      battleProcedureExecutionRefForTest("synthetic-fright"),
      "frightened",
    );
    const ref = spellActiveEffectExecutionRef(frightened);

    expect(spellActiveEffectForExecutionRef([charm, frightened], ref)).toBe(
      frightened,
    );
    expect(
      spellActiveEffectForExecutionRef(
        [charm, frightened],
        battleActiveEffectExecutionRefForTest("missing-effect"),
      ),
    ).toBeUndefined();
  });
});
