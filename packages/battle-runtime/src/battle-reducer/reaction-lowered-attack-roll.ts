// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.FAILED_D20_TEST_ADDED_DIE
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.bardic-inspiration-failed-d20-test
// An attack roll that a Reaction lowered (attackRollReduction): the interrupted
// attack replays with its recorded fill lowered by the reduction, which the
// replay keeps (attackRollReduction on the continuation), and a roll the replay
// asks again (a hit turned into a miss is offered its added dice, ASSUMPTIONS.md
// A70) is answered with the roll as it was submitted, lowered by that same
// kept reduction. Both sides of that lowering live here.

import { Match } from "effect";
import { map as mapArray } from "effect/Array";

import type {
  BattleAttackRollD20TestRerollDecision,
  BattleAttackRollResult,
  BattleFill,
} from "../battle-state-execution.ts";
import { optionalProperty } from "../optional-property.ts";
import {
  battleResubmittedFillKeepsAcceptedFill,
  isBattleRerollDecisionFill,
} from "./battle-fill-equality.ts";

/**
 * The attack roll lowered by a Reaction's reduction. Every total is lowered,
 * its rerolls' replacements too, so the roll that stands after its reroll
 * decisions and added dice is lowered by exactly the reduction.
 */
export function attackRollLoweredBy(
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
 * submitted fill, lowered by the reduction the replay kept, when it keeps the
 * recorded fill and only adds later after-roll decisions; null for any other
 * fill. Only an attack roll is lowered by a Reaction.
 */
export function recordedRollAnsweredAgain(
  recorded: BattleFill,
  submitted: BattleFill,
  attackRollReduction: number | undefined,
): BattleFill | null {
  if (
    !isBattleRerollDecisionFill(submitted) ||
    submitted.holeId !== recorded.holeId
  ) {
    return null;
  }
  const answer =
    submitted.kind === "attackRoll" && attackRollReduction !== undefined
      ? {
          ...submitted,
          value: attackRollLoweredBy(submitted.value, attackRollReduction),
        }
      : submitted;
  return battleResubmittedFillKeepsAcceptedFill(recorded, answer)
    ? answer
    : null;
}
