import type {
  AttackSpellDamageAddition,
  BattleAttackHitReplayCheckpoint,
} from "../battle-state-execution.ts";
import { copyInterruptCheckpointIdentity } from "./interrupt-checkpoint-identity.ts";

export function appendAfterHitSpellDamage(
  frame: BattleAttackHitReplayCheckpoint,
  damageAddition: AttackSpellDamageAddition,
): BattleAttackHitReplayCheckpoint {
  const updatedFrame: BattleAttackHitReplayCheckpoint = {
    ...frame,
    continuation: {
      ...frame.continuation,
      attackDamageAdditions: [
        ...(frame.continuation.attackDamageAdditions ?? []),
        damageAddition,
      ],
    },
  };
  copyInterruptCheckpointIdentity(frame, updatedFrame);
  return updatedFrame;
}
