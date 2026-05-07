import type { SpeedType } from "@dnd/shared/game-facts";
import { movementFeet, type MovementFeet } from "@dnd/shared/types";

export type MovementActivity =
  | {
      readonly kind: "ordinary";
      readonly speedType: SpeedType;
    }
  | {
      readonly kind: "climbing";
      readonly speedType: "walk" | "climb";
    }
  | {
      readonly kind: "swimming";
      readonly speedType: "walk" | "swim";
    }
  | {
      readonly kind: "crawling";
      readonly speedType: "walk";
    };

export type MovementCostFacts = {
  readonly distanceFeet: MovementFeet;
  readonly activity: MovementActivity;
  readonly difficultTerrain: boolean;
  readonly squeezing: boolean;
  readonly grappleDragExtraCost: boolean;
};

export type MovementCost = {
  readonly distanceFeet: MovementFeet;
  readonly costFeet: MovementFeet;
};

export function movementCost(facts: MovementCostFacts): MovementCost {
  const extraCostPerFoot =
    (facts.difficultTerrain ? 1 : 0) +
    activityExtraCostPerFoot(facts.activity) +
    (facts.squeezing ? 1 : 0) +
    (facts.grappleDragExtraCost ? 1 : 0);

  return {
    distanceFeet: facts.distanceFeet,
    costFeet: movementFeet(Number(facts.distanceFeet) * (1 + extraCostPerFoot)),
  };
}

function activityExtraCostPerFoot(activity: MovementActivity): number {
  if (activity.kind === "ordinary") {
    return 0;
  }
  if (activity.kind === "climbing") {
    return activity.speedType === "climb" ? 0 : 1;
  }
  if (activity.kind === "swimming") {
    return activity.speedType === "swim" ? 0 : 1;
  }
  if (activity.kind === "crawling") {
    return 1;
  }
  const exhaustive: never = activity;
  return exhaustive;
}

export function ordinaryMovementCost(
  distanceFeet: MovementFeet,
  speedType: SpeedType,
): MovementCost {
  return movementCost({
    distanceFeet,
    activity: { kind: "ordinary", speedType },
    difficultTerrain: false,
    squeezing: false,
    grappleDragExtraCost: false,
  });
}
