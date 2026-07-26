import { movementFeet, type MovementFeet } from "@dnd/shared/types";
import type { BattleMovementSpeedKind } from "../battle-subjects.ts";
import type {
  BattleMovementHole,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import {
  MOVEMENT_HOLE_ID,
  MOVEMENT_HOLE_INSTANCE,
} from "./battle-runtime-protocol.ts";
import {
  battleMovementBudgetForActor,
  effectiveMovementSpeed,
  representedMovementSpeedKinds,
} from "./movement-speed.ts";

export function movementHole(
  state: BattleState,
  actorId: CombatantId,
): BattleMovementHole {
  const budget = battleMovementBudgetForActor(state, actorId);
  return movementHoleWithBudget(
    actorId,
    budget.remainingFeet,
    budget.speedKinds.map((speedKind) => ({
      kind: speedKind.kind,
      movementBudgetFeet: speedKind.remainingFeet,
    })),
  );
}

export function readiedMovementHole(
  state: BattleState,
  actorId: CombatantId,
): BattleMovementHole {
  const actor = state.combatants.get(actorId);
  const isGrappled = state.grapples.some(
    (grapple) => grapple.targetId === actorId,
  );
  const speedKinds =
    actor === undefined
      ? []
      : representedMovementSpeedKinds(actor).map((kind) => ({
          kind,
          movementBudgetFeet: effectiveMovementSpeed(actor, kind, isGrappled),
        }));
  return movementHoleWithBudget(
    actorId,
    readiedMovementBudgetForActor(state, actorId),
    speedKinds,
  );
}

export function movementHoleWithBudget(
  actorId: CombatantId,
  movementBudgetFeet: MovementFeet,
  speedKinds: readonly {
    readonly kind: BattleMovementSpeedKind;
    readonly movementBudgetFeet: MovementFeet;
  }[] = [{ kind: "walk", movementBudgetFeet }],
): BattleMovementHole {
  return {
    kind: "movement",
    holeInstanceKey: MOVEMENT_HOLE_INSTANCE,
    holeId: MOVEMENT_HOLE_ID,
    label: "Movement",
    actorId,
    movementBudgetFeet,
    speedKinds,
  };
}

export function readiedMovementBudgetForActor(
  state: BattleState,
  actorId: CombatantId,
  speedKind: BattleMovementSpeedKind = "walk",
): MovementFeet {
  const actor = state.combatants.get(actorId);
  return actor === undefined
    ? movementFeet(0)
    : effectiveMovementSpeed(
        actor,
        speedKind,
        state.grapples.some((grapple) => grapple.targetId === actorId),
      );
}
