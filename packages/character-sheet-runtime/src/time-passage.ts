// The time-domain state machine intentionally stays whole: elapsed calendar
// time spans HP, zero-HP lifecycle, Stable recovery, and future time triggers.
import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared/elapsed-time";
import { Either } from "effect";

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
  if (Either.isLeft(totalTicks)) {
    return invalidElapsedTimeResult(
      input.sheet,
      `Invalid elapsed-time duration: ${totalTicks.left.kind}.`,
    );
  }
  const consumed = passStableRecoveryTime({
    sheet: input.sheet,
    ticks: totalTicks.right,
    fills: input.fills,
  });
  if (consumed.tag !== "resolved") return consumed;
  return {
    tag: "resolved",
    sheet: consumed.sheet,
    elapsedTicks: consumed.elapsedTicks,
  };
}
