// RAW-COVERAGE: runtime-owner RAW-STAT-BLOCK-LEGENDARY-ACTION-LIFECYCLE-001
// UNIT-PROFILE-COVERAGE: runtime-owner stat-block.legendary-action-lifecycle
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.LEGENDARY_ACTION_LIFECYCLE
import type { BattleSubject } from "../battle-subjects.ts";
import type { BattleResolutionResult } from "../battle-state-execution.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import {
  closeLegendaryActionWindow,
  consumeLegendaryActionWindow,
  isLegendaryAttackSubject,
  normalizeEarlyEndedOngoingFeatures,
} from "./creature-state-execution.ts";

export function consumeOrCloseLegendaryActionWindow(
  subject: BattleSubject,
  result: BattleResolutionResult,
): BattleResolutionResult {
  if (result.tag !== "resolved") return result;
  if (subject.tag === "runtimeCommand" && subject.command === "endTurn") {
    const normalized = normalizeEarlyEndedOngoingFeatures(result.state);
    return normalized === result.state
      ? result
      : { ...result, state: normalized, snapshot: snapshotBattle(normalized) };
  }
  const normalized = normalizeEarlyEndedOngoingFeatures(result.state);
  const state = isLegendaryAttackSubject(normalized, subject)
    ? consumeLegendaryActionWindow(normalized)
    : closeLegendaryActionWindow(normalized);
  return state === result.state
    ? result
    : { ...result, state, snapshot: snapshotBattle(state) };
}
