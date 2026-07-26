// `invalidResult` lives in this shared leaf because resolver modules across the
// reducer need the same invalid-result envelope.

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

export function resolvedResult(
  state: BattleState,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  return {
    tag: "resolved",
    state,
    snapshot: snapshotBattle(state),
  };
}

export function resolutionFromStateResult(
  result:
    | { readonly tag: "resolved"; readonly state: BattleState }
    | Extract<BattleResolutionResult, { readonly tag: "invalid" }>,
): BattleResolutionResult {
  return result.tag === "invalid" ? result : resolvedResult(result.state);
}
