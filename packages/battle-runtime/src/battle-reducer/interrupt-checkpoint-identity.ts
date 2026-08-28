// KERNEL-COVERAGE: runtime-owner BATTLE.REACTION.OFFER_DECLINE_RESUME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY

import type { BattleInterruptCheckpoint } from "../battle-state-execution.ts";

/**
 * Runtime-only identity for one logical interrupt checkpoint. The identity is
 * deliberately not part of BattleState: reducer snapshots remain serializable
 * while runtime transaction layers can still distinguish exact checkpoints.
 */
export type InterruptCheckpointIdentity = object;

const identities = new WeakMap<
  BattleInterruptCheckpoint,
  InterruptCheckpointIdentity
>();

export function interruptCheckpointIdentity(
  frame: BattleInterruptCheckpoint,
): InterruptCheckpointIdentity {
  const existing = identities.get(frame);
  if (existing !== undefined) return existing;
  const identity = Object.freeze({});
  identities.set(frame, identity);
  return identity;
}

/** Preserve logical checkpoint identity when a reducer transition copies a frame. */
export function copyInterruptCheckpointIdentity(
  source: BattleInterruptCheckpoint,
  target: BattleInterruptCheckpoint,
): void {
  identities.set(target, interruptCheckpointIdentity(source));
}
