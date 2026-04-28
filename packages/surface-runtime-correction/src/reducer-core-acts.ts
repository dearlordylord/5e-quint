import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import { currentActing } from "@dnd/shared-algebras/initiative-algebra";

import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
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
