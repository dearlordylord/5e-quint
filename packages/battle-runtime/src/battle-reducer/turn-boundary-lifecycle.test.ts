import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { describe, expect, test } from "vitest";
import {
  battleProcedureExecutionRefForTest,
  fighterId,
  fighterVsGoblinBattle,
  goblinId,
} from "../battle-runtime.test-support.ts";
import type { BattleActiveEffect } from "../battle-state-execution.ts";
import {
  afterActiveEffectOccurrenceUpdate,
  updateCombatantWithActiveEffectOccurrence,
} from "./turn-boundary-lifecycle.ts";

describe("turn-boundary active-effect occurrence updates", () => {
  test("a non-owned occurrence cannot trigger effect teardown", () => {
    const state = fighterVsGoblinBattle();
    const source = state.combatants.get(fighterId);
    const target = state.combatants.get(goblinId);
    if (source === undefined || target === undefined) {
      throw new Error("Expected the fighter and goblin combatants.");
    }

    const sourceProcedureRef =
      battleProcedureExecutionRefForTest("stale-occurrence");
    const concentration = {
      sourceProcedureRef,
      effectKind: "spellEffect" as const,
    };
    const ownedEffect: Extract<
      BattleActiveEffect,
      { readonly kind: "nextAttackRollBySelf" }
    > = {
      kind: "nextAttackRollBySelf",
      sourceProcedureRef,
      sourceCombatantId: fighterId,
      mode: "advantage",
      expiresAt: {
        kind: "duration",
        durationTicks: elapsedTimeTicks(1),
      },
    };
    const combatants = new Map(state.combatants)
      .set(fighterId, { ...source, concentration })
      .set(goblinId, { ...target, activeEffects: [ownedEffect] });
    const staleOccurrence = { ...ownedEffect };

    const update = updateCombatantWithActiveEffectOccurrence(
      combatants,
      goblinId,
      staleOccurrence,
      () => {
        throw new Error("A stale occurrence must not update its target.");
      },
    );
    const afterTeardown = afterActiveEffectOccurrenceUpdate(
      update,
      (updatedCombatants) =>
        new Map(updatedCombatants).set(fighterId, {
          ...source,
          concentration: null,
        }),
    );

    expect(update.tag).toBe("unchanged");
    expect(afterTeardown.get(fighterId)?.concentration).toEqual(concentration);
    expect(afterTeardown.get(goblinId)?.activeEffects).toEqual([ownedEffect]);
  });
});
