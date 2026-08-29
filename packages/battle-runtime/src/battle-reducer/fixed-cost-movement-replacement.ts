import { MovementFeet, movementFeet } from "@dnd/shared/types";

import type {
  BattleActiveEffect,
  BattleState,
} from "../battle-state-execution.ts";
import { CombatantId } from "../identity.ts";

import { currentActorId } from "./creature-state-leaves.ts";

type FixedCostMovementReplacementEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "fixedCostMovementReplacement" }
>;

export function maxFixedCostMovementReplacementDistanceFeet(
  state: BattleState,
  moverId: CombatantId,
  effect: FixedCostMovementReplacementEffect,
): MovementFeet {
  const multiplier =
    currentActorId(state) === moverId
      ? (state.currentTurnResources.jumpDistanceMultiplier?.multiplier ?? 1)
      : 1;
  return movementFeet(Number(effect.maxJumpDistanceFeet) * multiplier);
}
