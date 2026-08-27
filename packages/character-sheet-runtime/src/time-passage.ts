// The time-domain state machine intentionally stays whole: elapsed calendar
// time spans HP, zero-HP lifecycle, Stable recovery, and future time triggers.
import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared/elapsed-time";
import { Result } from "effect";

import {
  invalidElapsedTimeResult,
  passStableRecoveryTime,
} from "./hit-points.ts";
import type {
  CharacterSheetElapsedTimeResult,
  CharacterSheetTimePassedInput,
} from "./sheet-types.ts";

export function timePassed(
  input: CharacterSheetTimePassedInput,
): CharacterSheetElapsedTimeResult {
  // Future ASSUMPTIONS.md work: out-of-battle elapsed rounds may imply
  // turn-boundary Death Saving Throws, but this operation currently only
  // handles calendar-time Stable recovery.
  const totalTicks = elapsedTimeTicksFromTimeSpanDuration(input.duration);
  /* v8 ignore start -- @preserve -- Malformed elapsed-time input: CharacterSheetTimePassedInput is admitted only after its TimeSpanDuration parses to nonnegative ticks. */
  if (Result.isFailure(totalTicks)) {
    return invalidElapsedTimeResult(
      input.sheet,
      `Invalid elapsed-time duration: ${totalTicks.failure.kind}.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  const consumed = passStableRecoveryTime({
    sheet: input.sheet,
    ticks: totalTicks.success,
    fills: input.fills,
  });
  if (consumed.tag !== "resolved") return consumed;
  return {
    tag: "resolved",
    sheet: consumed.sheet,
    elapsedTicks: consumed.elapsedTicks,
  };
}
