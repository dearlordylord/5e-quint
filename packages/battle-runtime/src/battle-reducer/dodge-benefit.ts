import { isIncapacitated } from "@dnd/shared-algebras/conditions-algebra";
import type {
  BattleCreatureState,
  BattleState,
} from "../battle-state-execution.ts";
import { effectiveWalkSpeed } from "./movement-speed-facts.ts";

export function hasDodgeBenefit(
  state: BattleState,
  target: BattleCreatureState,
): boolean {
  return (
    target.dodging &&
    !isIncapacitated(target.conditions) &&
    Number(effectiveWalkSpeed(state, target)) > 0
  );
}
