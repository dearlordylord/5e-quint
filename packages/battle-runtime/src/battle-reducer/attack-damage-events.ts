// Attack damage event projections, reductions, and replay-fill prefixes.
// Extracted from dispatcher.ts so attack/reaction modules do not depend on dispatcher arithmetic.

import { damageAmount as toDamageAmount,type DamageAmount } from "@dnd/shared/types";
import type {
BattleAttackDamageEvent,
BattleAttackDamagePrefixFill,
BattleCreatureState,
BattleFill,
BattlePendingAttackDamageReduction,
BattleReactionModifierChoice,
} from "../battle-reducer.ts";
import {
damageAmountByTypeAfterTargetAdjustments,
damageAmountByTypeEntriesToMap,
entriesAfterProportionalDamageReduction,
type DamageAmountByTypeEntry,
} from "./damage-helpers.ts";

export function attackDamageEventEntries(
  event: BattleAttackDamageEvent,
): readonly DamageAmountByTypeEntry[] {
  return event.kind === "rolledDamage"
    ? event.damageRollByType
    : event.damageByTypeBeforeTargetAdjustments;
}

export function attackDamageEventAmountForTarget(
  target: BattleCreatureState,
  event: BattleAttackDamageEvent,
): DamageAmount {
  return toDamageAmount(
    damageAmountByTypeAfterTargetAdjustments(
      target,
      damageAmountByTypeEntriesToMap(attackDamageEventEntries(event)),
    ),
  );
}

export function attackDamageEventAmountBeforeTargetAdjustments(
  event: BattleAttackDamageEvent,
): DamageAmount {
  return toDamageAmount(
    attackDamageEventEntries(event).reduce(
      (total, entry) => total + entry.amount,
      0,
    ),
  );
}

export function attackDamageEventAfterPendingReductions(
  event: BattleAttackDamageEvent,
  reductions: readonly BattlePendingAttackDamageReduction[],
): BattleAttackDamageEvent {
  return reductions.reduce(
    (current, reduction) =>
      attackDamageEventAfterPendingReduction(current, reduction),
    event,
  );
}

export function attackDamageEventWithEntries(
  event: BattleAttackDamageEvent,
  entries: readonly DamageAmountByTypeEntry[],
): BattleAttackDamageEvent {
  return event.kind === "rolledDamage"
    ? { ...event, damageRollByType: entries }
    : { ...event, damageByTypeBeforeTargetAdjustments: entries };
}

export function attackDamageEventAfterPendingReduction(
  event: BattleAttackDamageEvent,
  reduction: BattlePendingAttackDamageReduction,
): BattleAttackDamageEvent {
  const nextEntries = damageAmountByTypeEntriesAfterScalarReduction(
    attackDamageEventEntries(event),
    reduction.reduction.kind,
    reduction.reductionAmount,
  );
  return event.kind === "rolledDamage"
    ? { ...event, damageRollByType: nextEntries }
    : { ...event, damageByTypeBeforeTargetAdjustments: nextEntries };
}

export function damageAmountByTypeEntriesAfterScalarReduction(
  entries: readonly DamageAmountByTypeEntry[],
  reductionKind: BattleReactionModifierChoice["reduction"]["kind"],
  reduction: number,
): readonly DamageAmountByTypeEntry[] {
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const reductionAmount =
    reductionKind === "halfDamage"
      ? total - Math.floor(total / 2)
      : Math.min(total, Math.max(0, reduction));
  return entriesAfterProportionalDamageReduction(entries, reductionAmount);
}

export function attackFillsThroughAttackRoll(
  fills: readonly BattleFill[],
): readonly BattleFill[] {
  return fills.filter(
    (fill) => fill.kind === "targetChoice" || fill.kind === "attackRoll",
  );
}

export function attackDamagePrefixFills(
  fills: readonly BattleFill[],
): readonly BattleAttackDamagePrefixFill[] {
  return fills.filter(
    (fill): fill is BattleAttackDamagePrefixFill =>
      fill.kind === "targetChoice" ||
      fill.kind === "attackRoll" ||
      fill.kind === "rolledDice" ||
      fill.kind === "attackDamageDisposition",
  );
}
