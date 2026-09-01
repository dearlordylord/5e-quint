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
type DurationTicksProjection = ReturnType<
  typeof elapsedTimeTicksFromTimeSpanDuration
>;

export type OngoingAreaSpellDurationProjection =
  | {
      readonly duration: Extract<Duration, { readonly kind: "concentration" }>;
      readonly durationTicks: DurationTicksProjection;
    }
  | {
      readonly duration: Extract<Duration, { readonly kind: "timed" }>;
      readonly durationTicks: DurationTicksProjection;
    }
  | {
      readonly duration: Exclude<
        Duration,
        { readonly kind: "concentration" } | { readonly kind: "timed" }
      >;
      readonly durationTicks: undefined;
    };

export type OngoingAreaSpellFacts = OngoingAreaSpellDurationProjection & {
  readonly mechanics: OngoingAreaSpellMechanics;
  readonly area: OngoingArea;
};

export type OngoingConcentrationAreaSpellFacts = {
  readonly mechanics: OngoingAreaSpellMechanics;
  readonly duration: Extract<Duration, { readonly kind: "concentration" }>;
  readonly durationTicks: DurationTicksProjection;
  readonly area: OngoingArea;
};

function isOngoingConcentrationAreaSpellFacts(
  facts: OngoingAreaSpellFacts,
): facts is OngoingConcentrationAreaSpellFacts {
  return facts.duration.kind === "concentration";
}

export function ongoingAreaSpellDurationProjection(
  duration: Duration,
): OngoingAreaSpellDurationProjection {
  return Match.value(duration).pipe(
    Match.when({ kind: "instantaneous" }, (instantaneous) => ({
      duration: instantaneous,
      durationTicks: undefined,
    })),
    Match.when({ kind: "concentration" }, (concentration) => ({
      duration: concentration,
      durationTicks: elapsedTimeTicksFromTimeSpanDuration(concentration.upTo),
    })),
    Match.when({ kind: "timed" }, (timed) => ({
      duration: timed,
      durationTicks: elapsedTimeTicksFromTimeSpanDuration(timed.value),
    })),
    Match.when({ kind: "permanent" }, (permanent) => ({
      duration: permanent,
      durationTicks: undefined,
    })),
    Match.when({ kind: "slot_tiered" }, (slotTiered) => ({
      duration: slotTiered,
      durationTicks: undefined,
    })),
    Match.exhaustive,
  );
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
  const durationProjection = ongoingAreaSpellDurationProjection(duration);
  return {
    mechanics,
    ...durationProjection,
    area: attachment.value,
  };
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
