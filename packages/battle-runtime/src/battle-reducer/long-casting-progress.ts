// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.SPELL_INVOCATION_UNRESTRICTED
// RAW-COVERAGE: runtime-owner RAW-STAT-BLOCK-SPELLCASTING-LONG-CASTING-TIME-001
// UNIT-PROFILE-COVERAGE: runtime-owner stat-block.spell-invocation.unrestricted
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.SPELLCASTING_LONG_CASTING_TIME
import type { CastingTime } from "@dnd/surface/surface/types";
import {
  ELAPSED_TIME_TICKS_PER_HOUR,
  ELAPSED_TIME_TICKS_PER_MINUTE,
} from "@dnd/shared/elapsed-time";
import { PositiveInteger, type Round } from "@dnd/shared/types";
import { Match } from "effect";
import type { BattleLongCastingProgress } from "../battle-state-execution.ts";

export type LongCastingTime = Extract<
  CastingTime,
  { readonly kind: "minutes" | "hours" }
>;

export function longCastingTurns(time: LongCastingTime): PositiveInteger {
  return PositiveInteger(
    Match.value(time).pipe(
      Match.when(
        { kind: "minutes" },
        ({ amount }) => amount * ELAPSED_TIME_TICKS_PER_MINUTE,
      ),
      Match.when(
        { kind: "hours" },
        ({ amount }) => amount * ELAPSED_TIME_TICKS_PER_HOUR,
      ),
      Match.exhaustive,
    ),
  );
}

export function startLongCastingProgress(
  time: LongCastingTime,
  round: Round,
): Extract<BattleLongCastingProgress, { readonly kind: "casting" }> {
  return {
    kind: "casting",
    remainingTurns: PositiveInteger(longCastingTurns(time) - 1),
    lastMagicActionRound: round,
  };
}

export function canContinueLongCasting(
  progress: BattleLongCastingProgress,
  round: Round,
): boolean {
  return (
    progress.kind === "casting" &&
    Number(round) === Number(progress.lastMagicActionRound) + 1
  );
}

export function continueLongCastingProgress(
  progress: Extract<BattleLongCastingProgress, { readonly kind: "casting" }>,
  round: Round,
): BattleLongCastingProgress {
  return Number(progress.remainingTurns) === 1
    ? { kind: "readyToComplete", lastMagicActionRound: round }
    : {
        kind: "casting",
        remainingTurns: PositiveInteger(Number(progress.remainingTurns) - 1),
        lastMagicActionRound: round,
      };
}

export function longCastingMustFailAtTurnEnd(
  progress: BattleLongCastingProgress,
  round: Round,
): boolean {
  return (
    progress.kind === "readyToComplete" ||
    progress.lastMagicActionRound !== round
  );
}

export function isLongCastingReadyToComplete(
  progress: BattleLongCastingProgress,
  round: Round,
): boolean {
  return (
    progress.kind === "readyToComplete" &&
    progress.lastMagicActionRound === round
  );
}
