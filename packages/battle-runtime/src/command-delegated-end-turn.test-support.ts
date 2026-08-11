import { difficultyClass } from "@dnd/shared/types";

import { battleProcedureExecutionRefForTest } from "./battle-runtime.test-support.ts";
import type {
  BattleActiveEffect,
  BattleState,
} from "./battle-state-execution.ts";
import type { CombatantId } from "./identity.ts";

export function battleStateWithSyntheticCommandEndTurnSave(
  state: BattleState,
  sourceId: CombatantId,
  targetId: CombatantId,
): BattleState {
  const source = state.combatants.get(sourceId);
  const target = state.combatants.get(targetId);
  if (source === undefined || target === undefined) {
    throw new Error("Expected synthetic Command End Turn save combatants.");
  }
  const sourceProcedureRef = battleProcedureExecutionRefForTest(
    "synthetic-command-delegated-end-turn-save",
  );
  const pendingSleep = {
    kind: "sleepPendingRepeatSave",
    sourceProcedureRef,
    sourceCombatantId: sourceId,
    conditionHadNonSpellSource: false,
    save: {
      ability: "wis",
      dc: { kind: "fixed", dc: difficultyClass(12) },
    },
    repeatAt: {
      kind: "endOfTurn",
      combatantId: targetId,
      round: state.initiative.round,
    },
    expiresAt: {
      kind: "concentration",
      combatantId: sourceId,
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
        activeEffects: [...target.activeEffects, pendingSleep],
      }),
  };
}
