// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.FAILED_D20_TEST_ADDED_DIE
// What every source that adds a die to a failed D20 Test checks on one
// decision: it answers an offer only on a test that stands failed, the
// roller's cost must allow it, and the number added must be a face of the
// source's die.

import type { DamageDieSize } from "@dnd/shared/types";

import {
  d20TestSpendGate,
  type D20TestSpendAvailability,
} from "./d20-test-source-spend.ts";

/** What one source says when it refuses a decision. */
export type D20TestAddedDieMessages = {
  /** The roller has no cost to pay, or none left. */
  readonly unavailable: string;
  /** The test stands succeeded, so nothing was offered. */
  readonly notFailed: string;
  /** The number added is not a face of the die. */
  readonly dieRoll: string;
};

/**
 * The issue with one added-die decision on a D20 Test as it stands, if any.
 * Only a test that stands failed is offered a die, so any decision on a test
 * that stands succeeded, a decline too, answers no offer.
 */
export function d20TestAddedDieDecisionIssue(input: {
  readonly availability: D20TestSpendAvailability;
  readonly standsFailed: boolean;
  /** The die the source adds: undefined when the roller never had one. */
  readonly dieSize: DamageDieSize | undefined;
  readonly decision:
    | { readonly kind: "decline" }
    | { readonly kind: "addDie"; readonly dieRoll: number };
  readonly messages: D20TestAddedDieMessages;
}): string | null {
  if (!input.standsFailed) return input.messages.notFailed;
  const gate = d20TestSpendGate({
    availability: input.availability,
    decision: input.decision,
    unavailableMessage: input.messages.unavailable,
  });
  if (gate.tag === "finished") return gate.issue;
  if (input.decision.kind === "decline") return null;
  /* v8 ignore next -- @preserve -- An available source always names its die: the roller holds it, or the record of the roll that paid keeps it. */
  if (input.dieSize === undefined) return input.messages.unavailable;
  const face = input.decision.dieRoll;
  return Number.isInteger(face) && face >= 1 && face <= input.dieSize
    ? null
    : input.messages.dieRoll;
}
