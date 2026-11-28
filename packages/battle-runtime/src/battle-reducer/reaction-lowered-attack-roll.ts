// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.FAILED_D20_TEST_ADDED_DIE
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.bardic-inspiration-failed-d20-test
// Reaction reductions are subject-owned evidence. Raw accepted fills stay
// unchanged; every attack owner derives its effective roll through this projection.

import { Match } from "effect";
import { map as mapArray } from "effect/Array";

import type {
  BattleAttackRollD20TestRerollDecision,
  BattleAttackRollResult,
  BattleFill,
  BattleState,
} from "../battle-state-execution.ts";
import type { BattleSubject } from "../battle-subjects.ts";
import { subjectContinuationPhaseFor } from "./subject-continuation-phase.ts";
import { optionalProperty } from "../optional-property.ts";
import {
  battleResubmittedFillKeepsAcceptedFill,
  isBattleRerollDecisionFill,
  type BattleRerollDecisionFill,
} from "./battle-fill-equality.ts";

/**
 * The attack roll lowered by a Reaction's reduction. Every total is lowered,
 * its rerolls' replacements too, so the roll that stands after its reroll
 * decisions and added dice is lowered by exactly the reduction.
 */
function attackRollLoweredBy(
  attackRoll: BattleAttackRollResult,
  reduction: number,
): BattleAttackRollResult {
  const rerolls = attackRoll.d20TestRerolls;
  return {
    ...attackRoll,
    total: attackRoll.total - reduction,
    ...optionalProperty(
      "d20TestRerolls",
      rerolls === undefined
        ? undefined
        : mapArray(rerolls, (decision) =>
            attackRollRerollDecisionLoweredBy(decision, reduction),
          ),
    ),
  };
}

function attackRollRerollDecisionLoweredBy(
  decision: BattleAttackRollD20TestRerollDecision,
  reduction: number,
): BattleAttackRollD20TestRerollDecision {
  return Match.value(decision).pipe(
    Match.discriminatorsExhaustive("kind")({
      decline: (declined) => declined,
      reroll: (rerolled) => ({
        ...rerolled,
        replacement: {
          ...rerolled.replacement,
          total: rerolled.replacement.total - reduction,
        },
      }),
      rerollRolledDie: (rerolled) => ({
        ...rerolled,
        replacement: {
          ...rerolled.replacement,
          result: {
            ...rerolled.replacement.result,
            total: rerolled.replacement.result.total - reduction,
          },
        },
      }),
    }),
  );
}

/**
 * The fill a replay meets for a recorded roll that it asked again: the
 * submitted raw fill when it keeps the recorded fill and only adds later after-roll decisions; null for any other
 * fill. Reaction reductions belong to subject evidence, not these raw fills.
 */
export function recordedRollAnsweredAgain(
  recorded: BattleFill,
  submitted: BattleFill,
): BattleRerollDecisionFill | null {
  if (
    !isBattleRerollDecisionFill(submitted) ||
    submitted.holeId !== recorded.holeId
  ) {
    return null;
  }
  return battleResubmittedFillKeepsAcceptedFill(recorded, submitted)
    ? submitted
    : null;
}

/** The effective input to a roll's after-roll fold, derived from its subject's reductions. */
export function attackRollAfterAcceptedReductions(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly holeId: BattleFill["holeId"];
  readonly attackRoll: BattleAttackRollResult;
}): BattleAttackRollResult {
  const reductions =
    subjectContinuationPhaseFor(input.state, input.subject)
      .acceptedAttackRollReductions ?? [];
  const amount = reductions.reduce(
    (total, reduction) =>
      reduction.holeId === input.holeId ? total + reduction.amount : total,
    0,
  );
  return amount === 0
    ? input.attackRoll
    : attackRollLoweredBy(input.attackRoll, amount);
}
