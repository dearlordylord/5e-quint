import type { BattleSavingThrowOutcome } from "../battle-state-execution.ts";

export function failedSavingThrowTargetIds(
  outcomes: readonly BattleSavingThrowOutcome[],
): readonly BattleSavingThrowOutcome["targetId"][] {
  return outcomes.flatMap((outcome) =>
    outcome.succeeded ? [] : [outcome.targetId],
  );
}
