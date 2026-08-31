import type { BattleHole, BattleHoleId } from "../battle-state-execution.ts";

type TurnBoundaryHoleRequest = {
  readonly hole: { readonly holeId: BattleHoleId };
};

export function collectTurnBoundaryHoleFills<
  Request extends TurnBoundaryHoleRequest,
  Fill,
>(
  requests: readonly Request[],
  fillForHole: (hole: Request["hole"]) => Fill | undefined,
): {
  readonly resolved: readonly {
    readonly request: Request;
    readonly fill: Fill;
  }[];
  readonly missingHoles: readonly Request["hole"][];
} {
  const resolved: { request: Request; fill: Fill }[] = [];
  const missingHoles: Request["hole"][] = [];
  for (const request of requests) {
    const fill = fillForHole(request.hole);
    if (fill === undefined) {
      missingHoles.push(request.hole);
    } else {
      resolved.push({ request, fill });
    }
  }
  return { resolved, missingHoles };
}

type EndTurnSaveHoleFrontiers = {
  readonly hitPointBudgetConditionRepeat: readonly BattleHole[];
  readonly saveGatedConditionWithRepeatRepeat: readonly BattleHole[];
  readonly spellCondition: readonly BattleHole[];
  readonly countedSpellCondition: readonly BattleHole[];
  readonly unitFeatureCondition: readonly BattleHole[];
  readonly saveGatedTurnConstraintBundle: readonly BattleHole[];
  readonly abilityD20TestRollMode: readonly BattleHole[];
};

export function firstMissingEndTurnSaveHoleFrontier(
  frontiers: EndTurnSaveHoleFrontiers,
): readonly BattleHole[] {
  return firstNonEmptyFrontier([
    frontiers.hitPointBudgetConditionRepeat,
    frontiers.saveGatedConditionWithRepeatRepeat,
    frontiers.spellCondition,
    frontiers.countedSpellCondition,
    frontiers.unitFeatureCondition,
    frontiers.saveGatedTurnConstraintBundle,
    frontiers.abilityD20TestRollMode,
  ]);
}

type TurnBoundaryDamageHoleFrontiers = {
  readonly endTurn: readonly BattleHole[];
  readonly startTurn: readonly BattleHole[];
};

export function firstMissingTurnBoundaryDamageHoleFrontier(
  frontiers: TurnBoundaryDamageHoleFrontiers,
): readonly BattleHole[] {
  return firstNonEmptyFrontier([frontiers.endTurn, frontiers.startTurn]);
}

function firstNonEmptyFrontier(
  frontiers: readonly (readonly BattleHole[])[],
): readonly BattleHole[] {
  return frontiers.find((frontier) => frontier.length > 0) ?? [];
}
