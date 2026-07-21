import { Match } from "effect";

import type {
  Duration,
  DurationValue,
  Range,
} from "@dnd/surface/surface/types";

import type { SpellRuleExecutionFacts } from "./character-execution.ts";
import type { SupportedSpellInvocation } from "./battle-reducer.ts";
import { samePrimitiveSet, sameSetByKey } from "./mechanical-equality.ts";

type SpellAccess = SupportedSpellInvocation["access"];
type SpellResource = SupportedSpellInvocation["resource"];
type DurationBranch = Exclude<Duration, { readonly kind: "slot_tiered" }>;

export function sameSpellAccess(
  left: SpellAccess,
  right: SpellAccess,
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("tag")({
      prepared: () => right.tag === "prepared",
      classCantrip: () => right.tag === "classCantrip",
      armorOfShadows: () => right.tag === "armorOfShadows",
      spellEffect: (value) =>
        right.tag === "spellEffect" &&
        value.sourceCombatantId === right.sourceCombatantId,
    }),
  );
}

export function sameSpellResource(
  left: SpellResource,
  right: SpellResource,
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("tag")({
      none: () => right.tag === "none",
      spellSlot: (value) =>
        right.tag === "spellSlot" && value.slotLevel === right.slotLevel,
      classFeatureFreeCast: (value) =>
        right.tag === "classFeatureFreeCast" &&
        value.resourcePoolRef === right.resourcePoolRef,
    }),
  );
}

function sameDurationValue(left: DurationValue, right: DurationValue): boolean {
  const leftTiers = left.upcastTiers ?? [];
  const rightTiers = right.upcastTiers ?? [];
  return (
    left.unit === right.unit &&
    left.amount === right.amount &&
    sameSetByKey(
      leftTiers,
      rightTiers,
      (tier) => tier.atSlot,
      (leftTier, rightTier) => leftTier.amount === rightTier.amount,
    )
  );
}

function sameDurationBranch(
  left: DurationBranch,
  right: DurationBranch,
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      instantaneous: () => right.kind === "instantaneous",
      concentration: (value) =>
        right.kind === "concentration" &&
        sameDurationValue(value.upTo, right.upTo) &&
        value.permanentIfMaintainedFull === right.permanentIfMaintainedFull &&
        sameSetByKey(
          value.earlyEnd ?? [],
          right.earlyEnd ?? [],
          (trigger) => trigger.kind,
          (leftTrigger, rightTrigger) => leftTrigger.kind === rightTrigger.kind,
        ),
      timed: (value) =>
        right.kind === "timed" &&
        sameDurationValue(value.value, right.value) &&
        sameSetByKey(
          value.earlyEnd ?? [],
          right.earlyEnd ?? [],
          (trigger) => trigger.kind,
          (leftTrigger, rightTrigger) => leftTrigger.kind === rightTrigger.kind,
        ) &&
        (value.permanentAfter === undefined ||
        right.permanentAfter === undefined
          ? value.permanentAfter === right.permanentAfter
          : value.permanentAfter.kind === right.permanentAfter.kind &&
            value.permanentAfter.cadence === right.permanentAfter.cadence &&
            value.permanentAfter.count === right.permanentAfter.count &&
            value.permanentAfter.target === right.permanentAfter.target &&
            samePrimitiveSet(
              value.permanentAfter.endsOn,
              right.permanentAfter.endsOn,
            )),
      permanent: (value) =>
        right.kind === "permanent" &&
        samePrimitiveSet(value.endsOn ?? [], right.endsOn ?? []),
    }),
  );
}

function sameSpellRange(left: Range, right: Range): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      self: () => right.kind === "self",
      touch: () => right.kind === "touch",
      unlimited: () => right.kind === "unlimited",
      point: (value) => {
        if (right.kind !== "point") return false;
        if (typeof value.feet === "number" || typeof right.feet === "number") {
          return value.feet === right.feet;
        }
        return (
          value.feet.axis === right.feet.axis &&
          value.feet.base === right.feet.base &&
          sameSetByKey(
            value.feet.tiers,
            right.feet.tiers,
            (tier) => tier.atLevel,
            (leftTier, rightTier) => leftTier.value === rightTier.value,
          )
        );
      },
    }),
  );
}

function sameSpellDuration(left: Duration, right: Duration): boolean {
  if (left.kind !== "slot_tiered") {
    return right.kind !== "slot_tiered" && sameDurationBranch(left, right);
  }
  return (
    right.kind === "slot_tiered" &&
    sameDurationBranch(left.base, right.base) &&
    sameSetByKey(
      left.tiers,
      right.tiers,
      (tier) => tier.atSlot,
      (leftTier, rightTier) =>
        sameDurationBranch(leftTier.duration, rightTier.duration),
    )
  );
}

export function sameSpellRuleExecutionFacts(
  left: SpellRuleExecutionFacts,
  right: SpellRuleExecutionFacts,
): boolean {
  return (
    left.level === right.level &&
    sameSpellRange(left.range, right.range) &&
    sameSpellDuration(left.duration, right.duration) &&
    left.components.verbal === right.components.verbal &&
    left.components.somatic === right.components.somatic &&
    left.components.hasMaterial === right.components.hasMaterial &&
    left.components.hasPricedOrConsumedMaterial ===
      right.components.hasPricedOrConsumedMaterial &&
    (left.twinnedTargetCount === null || right.twinnedTargetCount === null
      ? left.twinnedTargetCount === right.twinnedTargetCount
      : left.twinnedTargetCount.base === right.twinnedTargetCount.base &&
        left.twinnedTargetCount.baseLevel ===
          right.twinnedTargetCount.baseLevel)
  );
}
