import type { CombatantId } from "../identity.ts";
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import type {
  BattleAttackExecutionSelection,
  BattleAttackRangeBand,
  BattleState,
  BattleTargetSpatialFact,
} from "../battle-state-execution.ts";
import type { SupportedAttackActionOption } from "../battle-action-options.ts";
import { attackTargetConstraint } from "./statblock-attacks.ts";
import type { MovementFeet } from "@dnd/shared/types";

export function attackExecutionSelectionMatchesOption(
  selection: BattleAttackExecutionSelection,
  attack: SupportedAttackActionOption,
): boolean {
  return (
    "procedureRef" in attack &&
    selection.procedureRef !== undefined &&
    selection.procedureRef === attack.procedureRef
  );
}

export function attackTargetIsLegal(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
  facts: readonly BattleTargetSpatialFact[],
): boolean {
  const constraint = attackTargetConstraint(attack);
  const target = state.combatants.get(targetId);
  const proneDistanceFeet = attackTargetDistanceFeet(
    facts,
    actorId,
    targetId,
    attack,
  );
  const missingProneDistanceFact =
    target !== undefined &&
    hasCondition(target.conditions, "prone") &&
    proneDistanceFeet === null;
  return (
    actorId !== targetId &&
    state.combatants.has(targetId) &&
    !missingProneDistanceFact &&
    (constraint.kind === "meleeReach"
      ? facts.some(
          (fact) =>
            fact.kind === "attackTargetInMeleeReach" &&
            fact.actorId === actorId &&
            fact.targetId === targetId &&
            attackExecutionSelectionMatchesOption(fact, attack),
        )
      : attackTargetRangeBand(facts, actorId, targetId, attack) !== null)
  );
}

export function attackTargetRangeBand(
  facts: readonly BattleTargetSpatialFact[],
  actorId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
): BattleAttackRangeBand | null {
  if (attackTargetConstraint(attack).kind !== "rangedRange") {
    return null;
  }
  for (const fact of facts) {
    if (
      fact.kind === "attackTargetInRangedRange" &&
      fact.actorId === actorId &&
      fact.targetId === targetId &&
      attackExecutionSelectionMatchesOption(fact, attack)
    ) {
      return fact.rangeBand;
    }
  }
  return null;
}

export function attackTargetDistanceFeet(
  facts: readonly BattleTargetSpatialFact[],
  actorId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
): MovementFeet | null {
  for (const fact of facts) {
    if (
      fact.kind === "attackTargetDistance" &&
      fact.actorId === actorId &&
      fact.targetId === targetId &&
      attackExecutionSelectionMatchesOption(fact, attack)
    ) {
      return fact.distanceFeet;
    }
  }
  return null;
}
