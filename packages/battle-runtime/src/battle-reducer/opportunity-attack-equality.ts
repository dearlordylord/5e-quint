import { attackExecutionSelectionIdentitiesEqual } from "../battle-action-options.ts";
import type { BattleOpportunityAttackThreat } from "../battle-state-execution.ts";

export function opportunityAttackThreatIdentityEqual(
  left: BattleOpportunityAttackThreat,
  right: BattleOpportunityAttackThreat,
): boolean {
  return (
    left.reactorId === right.reactorId &&
    attackExecutionSelectionIdentitiesEqual(left, right)
  );
}

export function opportunityAttackThreatEqual(
  left: BattleOpportunityAttackThreat,
  right: BattleOpportunityAttackThreat,
): boolean {
  return (
    opportunityAttackThreatIdentityEqual(left, right) &&
    Number(left.distanceFeet) === Number(right.distanceFeet)
  );
}
