import {
  applyCondition,
  hasCondition,
  removeCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import { describe, expect, test } from "vitest";

import type { BattleActiveEffect } from "./battle-state-execution.ts";
import {
  battleProcedureExecutionRefForTest,
  fighterId,
  fighterVsGoblinBattle,
  goblinId,
} from "./battle-runtime.test-support.ts";
import { conditionHasNonSpellSource } from "./battle-reducer/spell-condition-effects-helpers.ts";

describe("spell condition effect source ownership", () => {
  test("an Unconscious unit-feature effect also owns its derived Prone condition", () => {
    const target = fighterVsGoblinBattle().combatants.get(goblinId);
    if (target === undefined || target.positiveHpUnconscious !== null) {
      throw new Error("Expected the conscious synthetic target.");
    }
    const unconsciousEffect = {
      kind: "unitFeatureCondition",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic-unconscious-unit-feature",
      ),
      sourceCombatantId: fighterId,
      condition: "unconscious",
      conditionHadNonSpellSource: false,
      earlyEnd: null,
      turnRestriction: null,
      expiresAt: { kind: "startOfTurn", combatantId: goblinId },
    } as const satisfies BattleActiveEffect;
    const withEffect = {
      ...target,
      conditions: applyCondition(target.conditions, "unconscious"),
      activeEffects: [...target.activeEffects, unconsciousEffect],
    };

    expect(conditionHasNonSpellSource(withEffect, "unconscious")).toBe(false);
    expect(conditionHasNonSpellSource(withEffect, "prone")).toBe(false);
    const afterUnconsciousEnds = {
      ...withEffect,
      conditions: removeCondition(withEffect.conditions, "unconscious"),
      activeEffects: target.activeEffects,
    };
    expect(hasCondition(afterUnconsciousEnds.conditions, "unconscious")).toBe(
      false,
    );
    expect(hasCondition(afterUnconsciousEnds.conditions, "prone")).toBe(true);
    expect(conditionHasNonSpellSource(afterUnconsciousEnds, "prone")).toBe(
      true,
    );
  });
});
