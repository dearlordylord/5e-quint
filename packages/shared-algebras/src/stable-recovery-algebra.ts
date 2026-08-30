import { Result } from "effect";
import {
  ELAPSED_TIME_TICKS_PER_HOUR,
  elapsedTimeTicks,
  parsePositiveElapsedTimeTicks,
  type ElapsedTimeTicks,
  type PositiveElapsedTimeTicks,
} from "@dnd/shared/elapsed-time";
import type { DieRollResult } from "@dnd/shared/types";

export const STABLE_RECOVERY_ROLL_DICE_EXPR = {
  dice: 1,
  dieSize: 4,
} as const;

export type StableRecovery =
  | {
      readonly kind: "regains1HpAfter1d4Hours";
      readonly elapsedBeforeRecoveryRoll: ElapsedTimeTicks;
    }
  | {
      readonly kind: "regains1HpAfter";
      readonly remaining: PositiveElapsedTimeTicks;
    };

type UnsampledStableRecovery = Extract<
  StableRecovery,
  { readonly kind: "regains1HpAfter1d4Hours" }
>;

type SampledStableRecovery = Extract<
  StableRecovery,
  { readonly kind: "regains1HpAfter" }
>;

export type StableRecoveryAdvanceInput =
  | {
      readonly recovery: SampledStableRecovery;
      readonly ticks: ElapsedTimeTicks;
    }
  | {
      readonly recovery: UnsampledStableRecovery;
      readonly ticks: ElapsedTimeTicks;
    };

export type StableRecoveryRollInput = {
  readonly recovery: UnsampledStableRecovery;
  readonly ticks: ElapsedTimeTicks;
  readonly roll: DieRollResult;
};

export type StableRecoveryAdvanceResult =
  | {
      readonly tag: "stable";
      readonly recovery: StableRecovery;
      readonly elapsedTicks: ElapsedTimeTicks;
    }
  | {
      readonly tag: "recovered";
      readonly elapsedTicks: ElapsedTimeTicks;
    }
  | {
      readonly tag: "needsStableRecoveryRoll";
      readonly elapsedTicks: ElapsedTimeTicks;
      readonly remainingTicks: PositiveElapsedTimeTicks;
    };

export type StableRecoveryIssue = {
  readonly tag: "stableRecoveryIssue";
  readonly message: string;
};

export function advanceStableRecovery(
  input: StableRecoveryAdvanceInput,
): Result.Result<StableRecoveryAdvanceResult, StableRecoveryIssue> {
  if (input.recovery.kind === "regains1HpAfter") {
    return passSampledStableRecoveryTime(
      input.recovery.remaining,
      input.ticks,
      input.ticks,
    );
  }

  const totalTicks =
    Number(input.recovery.elapsedBeforeRecoveryRoll) + Number(input.ticks);
  if (totalTicks < ELAPSED_TIME_TICKS_PER_HOUR) {
    return Result.succeed({
      tag: "stable",
      recovery: {
        kind: "regains1HpAfter1d4Hours",
        elapsedBeforeRecoveryRoll: elapsedTimeTicks(totalTicks),
      },
      elapsedTicks: input.ticks,
    });
  }

  const remainingTicks = parsePositiveElapsedTimeTicks(totalTicks);
  return Result.isFailure(remainingTicks)
    ? stableRecoveryIssue("Stable recovery elapsed time must be positive.")
    : Result.succeed({
        tag: "needsStableRecoveryRoll",
        elapsedTicks: elapsedTimeTicks(0),
        remainingTicks: remainingTicks.success,
      });
}

export function advanceStableRecoveryWithRoll(
  input: StableRecoveryRollInput,
): Result.Result<StableRecoveryAdvanceResult, StableRecoveryIssue> {
  const totalTicks =
    Number(input.recovery.elapsedBeforeRecoveryRoll) + Number(input.ticks);
  if (totalTicks < ELAPSED_TIME_TICKS_PER_HOUR) {
    return stableRecoveryIssue(
      "Stable recovery roll cannot resolve before one elapsed hour.",
    );
  }

  const sampledRecovery = stableRecoveryFromRoll(input.roll);
  return Result.isFailure(sampledRecovery)
    ? Result.fail(sampledRecovery.failure)
    : passSampledStableRecoveryTime(
        sampledRecovery.success.remaining,
        elapsedTimeTicks(totalTicks),
        input.ticks,
      );
}

function stableRecoveryFromRoll(
  roll: DieRollResult,
): Result.Result<
  Extract<StableRecovery, { readonly kind: "regains1HpAfter" }>,
  StableRecoveryIssue
> {
  if (Number(roll) > STABLE_RECOVERY_ROLL_DICE_EXPR.dieSize) {
    return stableRecoveryIssue("Stable recovery requires one d4 roll.");
  }
  const remaining = parsePositiveElapsedTimeTicks(
    Number(roll) * ELAPSED_TIME_TICKS_PER_HOUR,
  );
  return Result.isFailure(remaining)
    ? stableRecoveryIssue("Stable recovery requires one d4 roll.")
    : Result.succeed({
        kind: "regains1HpAfter",
        remaining: remaining.success,
      });
}

function passSampledStableRecoveryTime(
  remaining: PositiveElapsedTimeTicks,
  ticksForCalculation: ElapsedTimeTicks,
  elapsedTicks: ElapsedTimeTicks,
): Result.Result<StableRecoveryAdvanceResult, StableRecoveryIssue> {
  if (Number(ticksForCalculation) >= Number(remaining)) {
    return Result.succeed({ tag: "recovered", elapsedTicks });
  }
  const nextRemaining = parsePositiveElapsedTimeTicks(
    Number(remaining) - Number(ticksForCalculation),
  );
  return Result.isFailure(nextRemaining)
    ? stableRecoveryIssue("Stable recovery remaining time must stay positive.")
    : Result.succeed({
        tag: "stable",
        recovery: {
          kind: "regains1HpAfter",
          remaining: nextRemaining.success,
        },
        elapsedTicks,
      });
}

function stableRecoveryIssue(
  message: string,
): Result.Result<never, StableRecoveryIssue> {
  return Result.fail({ tag: "stableRecoveryIssue", message });
}
