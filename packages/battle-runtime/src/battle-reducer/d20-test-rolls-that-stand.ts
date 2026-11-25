// The rolls that stand: each D20 Test roll after the reroll decisions its
// fill reports (ASSUMPTIONS.md A55). Every owner that reads a D20 Test reads
// it through one of these, after d20-test-outcome-rerolls.ts checked the
// decisions. A leaf, so that any owner can read a roll without importing the
// reroll checks.

import type {
  BattleD20TestRoll,
  BattleD20TestOutcome,
  BattleFill,
  BattleRolledOutcomeD20TestRerollDecision,
  BattleSavingThrowOutcome,
} from "../battle-state-execution.ts";
import { d20TestRollAfterRerolls } from "./d20-test-reroll-sequence.ts";
import {
  d20TestOutcomeAfterReroll,
  d20TestRollAfterReroll,
} from "./d20-test-roll-reroll.ts";

/** A rolled saving throw's success and its roll. */
export type D20TestRolledOutcome = {
  readonly succeeded: boolean;
  readonly d20TestRoll: BattleD20TestRoll;
};

/** An ability check's value: its total and, when reported, its d20. */
export type D20TestAbilityCheckValue = Extract<
  BattleFill,
  { readonly kind: "abilityCheck" }
>["value"];

/** A rolled saving throw's outcome after its reroll decisions. */
export function d20TestOutcomeThatStands<T extends BattleD20TestOutcome>(
  outcome: T,
): T {
  if (outcome.withoutRoll === true) return outcome;
  const stands = d20TestRollAfterRerolls<
    D20TestRolledOutcome,
    BattleRolledOutcomeD20TestRerollDecision
  >(
    { succeeded: outcome.succeeded, d20TestRoll: outcome.d20TestRoll },
    outcome.d20TestRerolls ?? [],
    d20TestOutcomeAfterReroll,
  );
  return {
    ...outcome,
    succeeded: stands.succeeded,
    d20TestRoll: stands.d20TestRoll,
  };
}

/** Every target's saving throw outcome after its reroll decisions. */
export function savingThrowOutcomesThatStand<
  T extends { readonly outcomes: readonly BattleSavingThrowOutcome[] },
>(value: T): T {
  return {
    ...value,
    outcomes: value.outcomes.map(d20TestOutcomeThatStands),
  };
}

/** A saving throw fill whose every outcome is the one that stands. */
export function savingThrowOutcomeFillThatStands<
  T extends Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>,
>(fill: T): T {
  return { ...fill, value: savingThrowOutcomesThatStand(fill.value) };
}

/** A Concentration saving throw fill whose outcome is the one that stands. */
export function concentrationSavingThrowFillThatStands<
  T extends Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>,
>(fill: T): T {
  return { ...fill, value: d20TestOutcomeThatStands(fill.value) };
}

/** An ability check's value after its reroll decisions: the total that stands. */
export function abilityCheckValueThatStands<T extends D20TestAbilityCheckValue>(
  value: T,
): T {
  return d20TestRollAfterRerolls(
    value,
    value.d20TestRerolls ?? [],
    d20TestRollAfterReroll,
  );
}
