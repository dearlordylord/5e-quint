import { hasCondition } from "@dnd/shared/conditions-algebra";
import { currentActing } from "@dnd/shared/initiative-algebra";

import { canSpendAction } from "#/reducer-action-economy.ts";
import type { State } from "#/reducer-state.ts";

export function canCurrentActorAct(state: State): boolean {
  const actor = state.combatants.get(currentActing(state.initiative));
  if (actor === undefined) return false;

  return (
    Number(actor.hp) > 0 &&
    !actor.deathSaves.dead &&
    !hasCondition(actor.conditions, "incapacitated")
  );
}

export function canUseCoreAttack(state: State): boolean {
  return canCurrentActorAct(state) && canSpendAction(state);
}
