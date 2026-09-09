import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { BattleSpellAdmissionSource } from "../battle-state-execution.ts";
import type { Duration, SpellMechanics } from "@dnd/surface/surface/types";
import { Match } from "effect";

type OngoingAreaSpellMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;
type OngoingAreaAttachment = Extract<
  OngoingAreaSpellMechanics["attachment"],
  { readonly kind: "hole" }
>;
type OngoingArea = Extract<
  OngoingAreaAttachment["value"],
  { readonly kind: "area" }
>;
type OngoingAreaAttachmentWithArea = Omit<OngoingAreaAttachment, "value"> & {
  readonly value: OngoingArea;
};
type DurationWithExecutionTicks = Extract<
  Duration,
  { readonly kind: "concentration" } | { readonly kind: "timed" }
>;
type DurationTicks = ReturnType<typeof elapsedTimeTicksFromTimeSpanDuration>;
type DurationTicksProjection = DurationTicks | undefined;

/** Project a canonical spell-definition duration into execution ticks. */
export function ongoingAreaSpellDurationTicks(
  duration: DurationWithExecutionTicks,
): DurationTicks;
export function ongoingAreaSpellDurationTicks(
  duration: Duration,
): DurationTicksProjection;
export function ongoingAreaSpellDurationTicks(
  duration: Duration,
): DurationTicksProjection {
  return Match.value(duration).pipe(
    Match.when({ kind: "instantaneous" }, () => undefined),
    Match.when({ kind: "concentration" }, (concentration) =>
      elapsedTimeTicksFromTimeSpanDuration(concentration.upTo),
    ),
    Match.when({ kind: "timed" }, (timed) =>
      elapsedTimeTicksFromTimeSpanDuration(timed.value),
    ),
    Match.when({ kind: "permanent" }, () => undefined),
    Match.when({ kind: "slot_tiered" }, () => undefined),
    Match.exhaustive,
  );
}

type OngoingAreaSpellMechanicsWithArea = Omit<
  OngoingAreaSpellMechanics,
  "attachment"
> & {
  readonly attachment: OngoingAreaAttachmentWithArea;
};

export type OngoingAreaSpellFacts = {
  readonly mechanics: OngoingAreaSpellMechanicsWithArea;
};

export function ongoingAreaSpellFacts(
  source: SpellMechanics | Pick<BattleSpellAdmissionSource, "mechanics">,
): OngoingAreaSpellFacts | null {
  const mechanics = "mechanics" in source ? source.mechanics : source;
  if (mechanics.family !== "ongoing_effect") {
    return null;
  }
  const attachment = mechanics.attachment;
  if (attachment.kind !== "hole" || attachment.value.kind !== "area") {
    return null;
  }
  const areaAttachment: OngoingAreaAttachmentWithArea = {
    ...attachment,
    value: attachment.value,
  };
  return { mechanics: { ...mechanics, attachment: areaAttachment } };
}
