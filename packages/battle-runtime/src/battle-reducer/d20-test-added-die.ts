// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.FAILED_D20_TEST_ADDED_DIE
// What every source that adds a die to a failed D20 Test checks on one
// decision: it answers an offer only on a test that stands failed, the
// roller's cost must allow it, and the number added must be a face of the
// source's die.

import type { DamageDieSize } from "@dnd/shared/types";

import {
  d20TestUnavailableDecisionIssue,
  type D20TestSpendUnavailability,
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
 * Where a source that adds a die stands for one roll: the roller can add the
 * die, of this size, because it can pay or because this roll took the source
 * before a replay; or it cannot.
 */
export type D20TestAddedDieSourceForRoll =
  | { readonly availability: "available"; readonly dieSize: DamageDieSize }
  | { readonly availability: D20TestSpendUnavailability };

/**
 * The issue with one added-die decision on a D20 Test as it stands, if any.
 * Only a test that stands failed is offered a die, so any decision on a test
 * that stands succeeded, a decline too, answers no offer.
 */
export function d20TestAddedDieDecisionIssue(input: {
  readonly source: D20TestAddedDieSourceForRoll;
  readonly standsFailed: boolean;
  readonly decision:
    | { readonly kind: "decline" }
    | { readonly kind: "addDie"; readonly dieRoll: number };
  readonly messages: D20TestAddedDieMessages;
}): string | null {
  if (!input.standsFailed) return input.messages.notFailed;
  const source = input.source;
  if (source.availability !== "available")
    return d20TestUnavailableDecisionIssue({
      availability: source.availability,
      decision: input.decision,
      unavailableMessage: input.messages.unavailable,
    });
  if (input.decision.kind === "decline") return null;
  const face = input.decision.dieRoll;
  return Number.isInteger(face) && face >= 1 && face <= source.dieSize
    ? null
    : input.messages.dieRoll;
}

/** Whether a source is offered on the test as it stands: it fails and the roller can add the die. */
export function d20TestAddedDieOffered(input: {
  readonly source: D20TestAddedDieSourceForRoll;
  readonly standsFailed: boolean;
}): boolean {
  return input.source.availability === "available" && input.standsFailed;
}
