import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { difficultyClass } from "@dnd/shared/types";

import { battleProcedureExecutionRefForTest } from "./battle-runtime.test-support.ts";
import type {
  BattleActiveEffect,
  BattleState,
} from "./battle-state-execution.ts";
import type { CombatantId } from "./identity.ts";

export function battleStateWithSyntheticWeakeningEndTurnSave(
  state: BattleState,
  sourceId: CombatantId,
  targetId: CombatantId,
): BattleState {
  const source = state.combatants.get(sourceId);
  const target = state.combatants.get(targetId);
  if (source === undefined || target === undefined) {
    throw new Error("Expected synthetic weakening End Turn save combatants.");
  }
  const sourceProcedureRef = battleProcedureExecutionRefForTest(
    "synthetic-command-delegated-end-turn-save",
  );
  const weakeningEffect = {
    kind: "abilityD20TestRollModeEndTurnSave",
    sourceProcedureRef,
    sourceCombatantId: sourceId,
    ability: "str",
    mode: "disadvantage",
    save: {
      ability: "con",
      dc: { kind: "fixed", dc: difficultyClass(12) },
    },
    expiresAt: {
      kind: "concentration",
      combatantId: sourceId,
      durationTicks: elapsedTimeTicks(10),
    },
  } as const satisfies BattleActiveEffect;
  return {
    ...state,
    combatants: new Map(state.combatants)
      .set(sourceId, {
        ...source,
        concentration: { sourceProcedureRef, effectKind: "spellEffect" },
      })
      .set(targetId, {
        ...target,
        activeEffects: [...target.activeEffects, weakeningEffect],
      }),
  };
}
