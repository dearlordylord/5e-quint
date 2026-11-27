// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.FAILED_D20_TEST_ADDED_DIE
// What one added-die decision does to a D20 Test (ASSUMPTIONS.md A68). A
// leaf, so that the added-die folds and every reader of the roll that stands
// apply a decision the same way.

import type {
  BattleAbilityCheckAddedDieDecision,
  BattleRolledOutcomeAddedDieDecision,
} from "../battle-state-execution.ts";

/** Whether an added-die decision adds its die (as opposed to declining). */
export function d20TestAddedDieDecisionTakesDie(decision: {
  readonly kind: "decline" | "addDie";
}): boolean {
  return decision.kind === "addDie";
}

/** An ability check's total after one added-die decision: the number rolled adds to it. */
export function abilityCheckAfterAddedDie<T extends { readonly total: number }>(
  check: T,
  decision: BattleAbilityCheckAddedDieDecision,
): T {
  return decision.kind === "addDie"
    ? { ...check, total: check.total + Number(decision.dieRoll) }
    : check;
}

/**
 * A rolled outcome after one added-die decision: the table's ruling with the
 * die added. The d20 doesn't change.
 */
export function rolledOutcomeAfterAddedDie<
  T extends { readonly succeeded: boolean },
>(outcome: T, decision: BattleRolledOutcomeAddedDieDecision): T {
  return decision.kind === "addDie"
    ? { ...outcome, succeeded: decision.succeeded }
    : outcome;
}
