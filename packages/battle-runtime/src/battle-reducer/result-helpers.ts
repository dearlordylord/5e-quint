// Shared result envelope helpers extracted from battle-reducer.ts.
// Cycle #21 in REFACTOR_MAP.md — `invalidResult` is used across many
// clusters (V, W, T, J, etc.), so it lives in this tiny shared module.

import {
  type BattleInvalidReasonCode,
  type BattleResolutionResult,
  type BattleState,
} from "../battle-state-execution.ts";
import { snapshotBattle } from "./battle-snapshot.ts";

export function invalidResult(
  state: BattleState,
  reason: BattleInvalidReasonCode,
  message: string,
): Extract<BattleResolutionResult, { readonly tag: "invalid" }> {
  return {
    tag: "invalid",
    reason,
    message,
    snapshot: snapshotBattle(state),
  };
}
