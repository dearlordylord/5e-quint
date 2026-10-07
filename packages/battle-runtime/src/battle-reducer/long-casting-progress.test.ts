import { Round } from "@dnd/shared/types";
import { describe, expect, it } from "vitest";
import {
  canContinueLongCasting,
  continueLongCastingProgress,
  longCastingMustFailAtTurnEnd,
  longCastingTurns,
  startLongCastingProgress,
  type LongCastingTime,
} from "./long-casting-progress.ts";
import type { BattleLongCastingProgress } from "../battle-state-execution.ts";

function castThrough(
  time: LongCastingTime,
  finalRound: number,
): BattleLongCastingProgress {
  let progress: BattleLongCastingProgress = startLongCastingProgress(
    time,
    Round(1),
  );
  for (let round = 2; round <= finalRound; round += 1) {
    expect(canContinueLongCasting(progress, Round(round))).toBe(true);
    if (progress.kind !== "casting")
      throw new Error("Casting completed before the declared duration.");
    progress = continueLongCastingProgress(progress, Round(round));
  }
  return progress;
}

describe("long spellcasting progress", () => {
  it.each([
    [{ kind: "minutes", amount: 1, ritual: false }, 10],
    [{ kind: "minutes", amount: 10, ritual: false }, 100],
    [{ kind: "hours", amount: 1, ritual: false }, 600],
    [{ kind: "hours", amount: 2, ritual: false }, 1200],
  ] as const)("requires the complete %j duration", (time, turns) => {
    expect(longCastingTurns(time)).toBe(turns);
    expect(castThrough(time, turns - 1).kind).toBe("casting");
    expect(castThrough(time, turns)).toEqual({
      kind: "readyToComplete",
      lastMagicActionRound: Round(turns),
    });
  });

  it("allows only one required Magic action per consecutive turn", () => {
    const started = startLongCastingProgress(
      { kind: "minutes", amount: 1, ritual: false },
      Round(4),
    );
    expect(canContinueLongCasting(started, Round(4))).toBe(false);
    expect(canContinueLongCasting(started, Round(5))).toBe(true);
    expect(canContinueLongCasting(started, Round(6))).toBe(false);
    expect(longCastingMustFailAtTurnEnd(started, Round(4))).toBe(false);
    expect(longCastingMustFailAtTurnEnd(started, Round(5))).toBe(true);
  });

  it("requires target resolution on the completion turn", () => {
    const ready = castThrough(
      { kind: "minutes", amount: 1, ritual: false },
      10,
    );
    expect(canContinueLongCasting(ready, Round(11))).toBe(false);
    expect(longCastingMustFailAtTurnEnd(ready, Round(10))).toBe(true);
  });
});
