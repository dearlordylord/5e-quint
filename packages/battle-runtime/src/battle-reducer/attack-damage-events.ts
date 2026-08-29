// Attack damage event projections, reductions, and interruption frames.
// Extracted from dispatcher.ts so attack/reaction modules do not depend on dispatcher arithmetic.

import {
  damageAmount as toDamageAmount,
  type DamageAmount,
} from "@dnd/shared/types";
// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY
import type {
  BattleAttackDamageInterruptionContinuation,
  BattleAttackDamageInterruptionFrame,
  BattleAttackDamageEvent,
  BattleAttackHostSubject,
  BattleAttackRollResult,
  BattleCreatureState,
  BattleState,
  BattleFill,
  BattlePendingAttackDamageReduction,
  BattleReactionModifierChoice,
  BattleTargetSpatialFact,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import { FRENZY_DAMAGE_TYPE_HOLE_ID } from "./battle-runtime-protocol.ts";
import {
  damageAmountByTypeAfterTargetAdjustments,
  damageAmountByTypeEntriesToMap,
  entriesAfterProportionalDamageReduction,
  type DamageAmountByTypeEntry,
} from "./damage-helpers.ts";

export function battleAttackHostParticipantId(
  participant: BattleAttackHostSubject,
): CombatantId {
  return participant.tag === "companionAttack"
    ? participant.familiarId
    : participant.actorId;
}

export function attackDamageInterruptionFrame(input: {
  readonly participant: BattleAttackHostSubject;
  readonly targetId: CombatantId;
  readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
  readonly attackResult: BattleAttackRollResult;
  readonly damageInput: BattleAttackDamageEvent;
  readonly critical: boolean;
  readonly continuation: BattleAttackDamageInterruptionContinuation;
}): BattleAttackDamageInterruptionFrame {
  return {
    kind: "attackDamage",
    participant: input.participant,
    target: {
      combatantId: input.targetId,
      spatialFacts: input.targetSpatialFacts,
    },
    attackResult: input.attackResult,
    damageInput: input.damageInput,
    criticalConsequence: input.critical
      ? { kind: "criticalHit" }
      : { kind: "ordinaryHit" },
    phase: "attackDamage",
    continuation: input.continuation,
  };
}

export function attackDamageEventEntries(
  event: BattleAttackDamageEvent,
): readonly DamageAmountByTypeEntry[] {
  return event.kind === "rolledDamage"
    ? event.damageRollByType
    : event.damageByTypeBeforeTargetAdjustments;
}

export function attackDamageEventAmountForTarget(
  state: BattleState,
  target: BattleCreatureState,
  event: BattleAttackDamageEvent,
): DamageAmount {
  return toDamageAmount(
    damageAmountByTypeAfterTargetAdjustments(
      state,
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

export function attackFillsForAttackHitReplay(
  fills: readonly BattleFill[],
): readonly BattleFill[] {
  return fills.filter(
    (fill) =>
      fill.kind === "targetChoice" ||
      fill.kind === "attackRoll" ||
      (fill.kind === "damageTypeChoice" &&
        fill.holeId === FRENZY_DAMAGE_TYPE_HOLE_ID),
  );
}
