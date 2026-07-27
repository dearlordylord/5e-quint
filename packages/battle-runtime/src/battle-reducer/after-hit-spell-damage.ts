import type {
  AttackSpellDamageAddition,
  BattleAttackHitReplayCheckpoint,
} from "../battle-state-execution.ts";

export function appendAfterHitSpellDamage(
  frame: BattleAttackHitReplayCheckpoint,
  damageAddition: AttackSpellDamageAddition,
): BattleAttackHitReplayCheckpoint {
  return {
    ...frame,
    continuation: {
      ...frame.continuation,
      attackDamageAdditions: [
        ...(frame.continuation.attackDamageAdditions ?? []),
        damageAddition,
      ],
    },
  };
}
