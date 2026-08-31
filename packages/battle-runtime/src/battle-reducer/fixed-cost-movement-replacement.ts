import { MovementFeet, movementFeet } from "@dnd/shared/types";

import type { BattleState } from "../battle-state-execution.ts";
import { CombatantId } from "../identity.ts";

import { currentActorId } from "./creature-state-leaves.ts";
import type { BoundFixedCostMovementReplacementEffect } from "./spell-modifier-binding.ts";

export function maxFixedCostMovementReplacementDistanceFeet(
  state: BattleState,
  moverId: CombatantId,
  effect: BoundFixedCostMovementReplacementEffect,
): MovementFeet {
  const multiplier =
    currentActorId(state) === moverId
      ? (state.currentTurnResources.jumpDistanceMultiplier?.multiplier ?? 1)
      : 1;
  return movementFeet(Number(effect.maxJumpDistanceFeet) * multiplier);
}
