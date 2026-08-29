import { markMovementSpentForMovementActionBonusActionExclusion } from "@dnd/shared-algebras/action-economy-algebra";
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import { movementFeet } from "@dnd/shared/types";
import type {
  BattleResolvedMovement,
  BattleState,
} from "../battle-state-execution.ts";
import { battleCreatureStateWithKnockOutPreservedConditions } from "./creature-state-execution.ts";
import {
  currentActorId,
  normalizeBattleGrapples,
} from "./creature-state-leaves.ts";
import { updateLevitatedCreatureAltitude } from "./levitate-creature.ts";
import { readiedMovementBudgetForActor } from "./movement-holes.ts";
import {
  battleMovementBudgetForActor,
  combatantCanMoveWithBudget,
} from "./movement-speed.ts";

export function applyBattleMovement(
  state: BattleState,
  movement: BattleResolvedMovement,
): BattleState {
  const mover = state.combatants.get(movement.moverId);
  if (
    mover === undefined ||
    !combatantCanMoveWithBudget(
      state,
      movement.moverId,
      movement.spendsTurnMovement
        ? battleMovementBudgetForActor(
            state,
            movement.moverId,
            movement.speedKind,
          ).remainingFeet
        : readiedMovementBudgetForActor(
            state,
            movement.moverId,
            movement.speedKind,
          ),
    )
  ) {
    return state;
  }
  const nextMover = movement.spendsTurnMovement
    ? {
        ...mover,
        movementSpentFeet: movementFeet(
          Number(mover.movementSpentFeet) + Number(movement.movementCostFeet),
        ),
      }
    : mover;
  const landedMover =
    movement.fixedCostMovementReplacement?.landing
      .difficultTerrainAcrobatics === "failed"
      ? battleCreatureStateWithKnockOutPreservedConditions(
          nextMover,
          applyCondition(nextMover.conditions, "prone"),
        )
      : nextMover;
  const combatants = new Map(state.combatants).set(
    movement.moverId,
    landedMover,
  );
  const movedState = normalizeBattleGrapples({
    ...state,
    currentTurnResources:
      movement.spendsTurnMovement && movement.moverId === currentActorId(state)
        ? markMovementSpentForMovementActionBonusActionExclusion(
            state.currentTurnResources,
          )
        : state.currentTurnResources,
    combatants,
  });
  const levitatedMovement = movement.levitatedMovement;
  return levitatedMovement?.altitudeChange === undefined
    ? movedState
    : updateLevitatedCreatureAltitude({
        state: movedState,
        targetId: movement.moverId,
        effectRef: levitatedMovement.effectRef,
        sourceCombatantId: levitatedMovement.sourceCombatantId,
        sourceProcedureRef: levitatedMovement.sourceProcedureRef,
        change: levitatedMovement.altitudeChange,
      });
}
