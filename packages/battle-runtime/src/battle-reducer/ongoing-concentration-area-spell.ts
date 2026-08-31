import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { BattleSpellAdmissionSource } from "../battle-state-execution.ts";
import type { SpellMechanics } from "@dnd/surface/surface/types";

export function ongoingAreaSpellFacts(
  source: SpellMechanics | Pick<BattleSpellAdmissionSource, "mechanics">,
) {
  const mechanics = "mechanics" in source ? source.mechanics : source;
  if (mechanics.family !== "ongoing_effect") {
    return null;
  }
  const duration = mechanics.duration;
  const attachment = mechanics.attachment;
  if (attachment.kind !== "hole" || attachment.value.kind !== "area") {
    return null;
  }
  const durationTicks =
    duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(duration.upTo)
      : duration.kind === "timed"
        ? elapsedTimeTicksFromTimeSpanDuration(duration.value)
        : undefined;
  return {
    mechanics,
    duration,
    durationTicks,
    area: attachment.value,
  };
}

export function ongoingConcentrationAreaSpellFacts(
  source: SpellMechanics | Pick<BattleSpellAdmissionSource, "mechanics">,
) {
  const facts = ongoingAreaSpellFacts(source);
  return facts?.duration.kind === "concentration" &&
    facts.durationTicks !== undefined
    ? facts
    : null;
}
