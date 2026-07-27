import { movementFeet } from "@dnd/shared/types";
import type { BattleMovementSpeedKind } from "../battle-subjects.ts";
import type {
  BattleCreatureState,
  BattleState,
  BattleTurnResources,
} from "../battle-state-execution.ts";
import { effectiveMovementSpeed } from "./movement-speed-facts.ts";

export function applyDashToActor(
  state: BattleState,
  actor: BattleCreatureState,
  speedKind: BattleMovementSpeedKind,
  spentResources: BattleTurnResources,
): BattleState {
  const speed = effectiveMovementSpeed(
    state,
    actor,
    speedKind,
    state.grapples.some((grapple) => grapple.targetId === actor.combatantId),
  );
  return {
    ...state,
    currentTurnResources: {
      ...spentResources,
      dashMovementBonusFeet: movementFeet(
        Number(spentResources.dashMovementBonusFeet) + Number(speed),
      ),
    },
  };
}

export function applyDisengage(
  state: BattleState,
  spentResources: BattleTurnResources,
): BattleState {
  return {
    ...state,
    currentTurnResources: { ...spentResources, disengaged: true },
  };
}
