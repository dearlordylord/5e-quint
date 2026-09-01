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
type DurationTicksProjection =
  | ReturnType<typeof elapsedTimeTicksFromTimeSpanDuration>
  | undefined;

/** Project a canonical spell-definition duration into execution ticks. */
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

type OngoingAreaSpellMechanicsForDuration<DurationBranch extends Duration> =
  Omit<OngoingAreaSpellMechanics, "duration" | "attachment"> & {
    readonly duration: DurationBranch;
    readonly attachment: OngoingAreaAttachmentWithArea;
  };

export type OngoingAreaSpellFacts =
  | {
      readonly mechanics: OngoingAreaSpellMechanicsForDuration<
        Extract<Duration, { readonly kind: "concentration" }>
      >;
      readonly durationTicks: DurationTicksProjection;
    }
  | {
      readonly mechanics: OngoingAreaSpellMechanicsForDuration<
        Extract<Duration, { readonly kind: "timed" }>
      >;
      readonly durationTicks: DurationTicksProjection;
    }
  | {
      readonly mechanics: OngoingAreaSpellMechanicsForDuration<
        Exclude<
          Duration,
          { readonly kind: "concentration" } | { readonly kind: "timed" }
        >
      >;
      readonly durationTicks: undefined;
    };

export type OngoingConcentrationAreaSpellFacts = Extract<
  OngoingAreaSpellFacts,
  {
    readonly mechanics: {
      readonly duration: { readonly kind: "concentration" };
    };
  }
>;

function isOngoingConcentrationAreaSpellFacts(
  facts: OngoingAreaSpellFacts,
): facts is OngoingConcentrationAreaSpellFacts {
  return facts.mechanics.duration.kind === "concentration";
}

export function ongoingAreaSpellFacts(
  source: SpellMechanics | Pick<BattleSpellAdmissionSource, "mechanics">,
): OngoingAreaSpellFacts | null {
  const mechanics = "mechanics" in source ? source.mechanics : source;
  if (mechanics.family !== "ongoing_effect") {
    return null;
  }
  const duration = mechanics.duration;
  const attachment = mechanics.attachment;
  if (attachment.kind !== "hole" || attachment.value.kind !== "area") {
    return null;
  }
  const areaAttachment: OngoingAreaAttachmentWithArea = {
    ...attachment,
    value: attachment.value,
  };
  return Match.value(duration).pipe(
    Match.when({ kind: "instantaneous" }, (duration) => ({
      mechanics: { ...mechanics, duration, attachment: areaAttachment },
      durationTicks: undefined,
    })),
    Match.when({ kind: "concentration" }, (duration) => ({
      mechanics: { ...mechanics, duration, attachment: areaAttachment },
      durationTicks: ongoingAreaSpellDurationTicks(duration),
    })),
    Match.when({ kind: "timed" }, (duration) => ({
      mechanics: { ...mechanics, duration, attachment: areaAttachment },
      durationTicks: ongoingAreaSpellDurationTicks(duration),
    })),
    Match.when({ kind: "permanent" }, (duration) => ({
      mechanics: { ...mechanics, duration, attachment: areaAttachment },
      durationTicks: undefined,
    })),
    Match.when({ kind: "slot_tiered" }, (duration) => ({
      mechanics: { ...mechanics, duration, attachment: areaAttachment },
      durationTicks: undefined,
    })),
    Match.exhaustive,
  );
}

export function ongoingConcentrationAreaSpellFacts(
  source: SpellMechanics | Pick<BattleSpellAdmissionSource, "mechanics">,
): OngoingConcentrationAreaSpellFacts | null {
  const facts = ongoingAreaSpellFacts(source);
  if (facts === null) {
    return null;
  }
  if (!isOngoingConcentrationAreaSpellFacts(facts)) {
    return null;
  }
  return facts;
}
