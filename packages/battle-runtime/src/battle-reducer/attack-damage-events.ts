// Attack damage event projections, reductions, and interruption frames.
// Extracted from dispatcher.ts so attack/reaction modules do not depend on dispatcher arithmetic.

import {
  damageAmount as toDamageAmount,
  type DamageAmount,
} from "@dnd/shared/types";
import { Match } from "effect";

// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY
import type {
  BattleAttackDamageInterruptionBoundaryInput,
  BattleAttackDamageInterruptionBoundaryResult,
  BattleAttackDamageInterruptionContinuation,
  BattleAttackDamageInterruptionFacts,
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
import {
  damageAmountByTypeAfterTargetAdjustments,
  damageAmountByTypeEntriesToMap,
  entriesAfterProportionalDamageReduction,
  type DamageAmountByTypeEntry,
} from "./damage-helpers.ts";

export function battleAttackHostParticipantId(
  participant: BattleAttackHostSubject,
): CombatantId {
  return participant.tag === "pactOfTheChainFamiliarAttack"
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
  const { critical, ...facts } = input;
  return attackDamageInterruptionFrameFromFacts({
    ...facts,
    criticalConsequence: critical
      ? { kind: "criticalHit" }
      : { kind: "ordinaryHit" },
  });
}

function attackDamageInterruptionFrameFromFacts(
  input: BattleAttackDamageInterruptionFacts,
): BattleAttackDamageInterruptionFrame {
  return {
    kind: "attackDamage",
    participant: input.participant,
    target: {
      combatantId: input.targetId,
      spatialFacts: input.targetSpatialFacts,
    },
    attackResult: input.attackResult,
    damageInput: input.damageInput,
    criticalConsequence: input.criticalConsequence,
    phase: "attackDamage",
    continuation: input.continuation,
  };
}

export function parseAttackDamageInterruptionFrame(
  input: BattleAttackDamageInterruptionBoundaryInput,
): BattleAttackDamageInterruptionBoundaryResult {
  return Match.value(input).pipe(
    Match.when(
      { phase: "attackHit" },
      (): Extract<
        BattleAttackDamageInterruptionBoundaryResult,
        { readonly tag: "invalidPhase" }
      > => ({ tag: "invalidPhase", phase: "attackHit" }),
    ),
    Match.when(
      { phase: "attackDamage" },
      (
        matched,
      ): Extract<
        BattleAttackDamageInterruptionBoundaryResult,
        { readonly tag: "decoded" }
      > => {
        const { phase: _phase, ...facts } = matched;
        return {
          tag: "decoded",
          frame: attackDamageInterruptionFrameFromFacts(facts),
        };
      },
    ),
    Match.exhaustive,
  );
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

export function attackFillsThroughAttackRoll(
  fills: readonly BattleFill[],
): readonly BattleFill[] {
  return fills.filter(
    (fill) => fill.kind === "targetChoice" || fill.kind === "attackRoll",
  );
}
