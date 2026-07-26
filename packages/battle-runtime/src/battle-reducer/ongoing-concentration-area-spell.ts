import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { BattleSpellAdmissionSource } from "../battle-state-execution.ts";

export function ongoingConcentrationAreaSpellFacts(
  spell: BattleSpellAdmissionSource,
) {
  const mechanics = spell.mechanics;
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
