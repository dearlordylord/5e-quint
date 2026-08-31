import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { BattleSpellAdmissionSource } from "../battle-state-execution.ts";
import type { SpellMechanics } from "@dnd/surface/surface/types";

export function ongoingConcentrationAreaSpellFacts(
  source: SpellMechanics | Pick<BattleSpellAdmissionSource, "mechanics">,
) {
  const mechanics = "mechanics" in source ? source.mechanics : source;
  if (mechanics.family !== "ongoing_effect") {
    return null;
  }
  const duration = mechanics.duration;
  const attachment = mechanics.attachment;
  if (
    duration.kind !== "concentration" ||
    attachment.kind !== "hole" ||
    attachment.value.kind !== "area"
  ) {
    return null;
  }
  return {
    mechanics,
    duration,
    durationTicks: elapsedTimeTicksFromTimeSpanDuration(duration.upTo),
    area: attachment.value,
  };
}
