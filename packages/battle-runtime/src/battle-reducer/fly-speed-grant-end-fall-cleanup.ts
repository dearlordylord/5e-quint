import type {
  BattleActiveEffect,
  BattleFlySpeedGrantEndFallCleanupFrame,
  BattleState,
  EndedFlySpeedGrant,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";

export type FlySpeedGrantEndFallCleanupFramesResult<T> = {
  readonly value: T;
  readonly flySpeedGrantEndFallCleanupFrames: readonly BattleFlySpeedGrantEndFallCleanupFrame[];
};

export function flySpeedGrantEndFallCleanupFramesForExpiredEffects(
  targetId: CombatantId,
  expiring: readonly BattleActiveEffect[],
): readonly BattleFlySpeedGrantEndFallCleanupFrame[] {
  return expiring
    .filter(isEndedFlySpeedGrant)
    .map((endedEffect) => ({
      kind: "flySpeedGrantEndFallCleanup" as const,
      targetId,
      endedEffect,
    }));
}

export function battleStateWithFlySpeedGrantEndFallCleanupFrames(
  state: BattleState,
  frames: readonly BattleFlySpeedGrantEndFallCleanupFrame[],
): BattleState {
  return frames.length === 0
    ? state
    : { ...state, interruptStack: [...state.interruptStack, ...frames] };
}

export function isEndedFlySpeedGrant(
  effect: BattleActiveEffect,
): effect is EndedFlySpeedGrant {
  return effect.kind === "specialSpeedGrant" && effect.speedKind === "fly";
}
