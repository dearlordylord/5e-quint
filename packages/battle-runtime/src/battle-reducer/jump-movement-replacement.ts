import { MovementFeet, movementFeet } from "@dnd/shared/types";

import type { BattleActiveEffect, BattleState } from "../battle-reducer.ts";
import { CombatantId } from "../identity.ts";

import { currentActorId } from "./creature-state-leaves.ts";

type JumpMovementReplacementEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "jumpMovementReplacement" }
>;

export function maxJumpMovementReplacementDistanceFeet(
  state: BattleState,
  moverId: CombatantId,
  effect: JumpMovementReplacementEffect,
): MovementFeet {
  const multiplier =
    currentActorId(state) === moverId
      ? (state.currentTurnResources.jumpDistanceMultiplier?.multiplier ?? 1)
      : 1;
  return movementFeet(Number(effect.maxJumpDistanceFeet) * multiplier);
}
