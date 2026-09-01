import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { BattleSpellAdmissionSource } from "../battle-state-execution.ts";

type OngoingEffectMechanics = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
>;
type ConcentrationDuration = Extract<
  OngoingEffectMechanics["duration"],
  { readonly kind: "concentration" }
>;
type AreaAttachment = Extract<
  OngoingEffectMechanics["attachment"],
  { readonly kind: "hole" }
>["value"] & { readonly kind: "area" };
type OngoingConcentrationAreaSpellFacts = Readonly<{
  readonly mechanics: OngoingEffectMechanics;
  readonly duration: ConcentrationDuration;
  readonly durationTicks: ReturnType<
    typeof elapsedTimeTicksFromTimeSpanDuration
  >;
  readonly area: AreaAttachment;
}>;

export function ongoingConcentrationAreaSpellFacts(
  spell: BattleSpellAdmissionSource,
): OngoingConcentrationAreaSpellFacts | null {
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
