import type { SpeedType } from "@dnd/shared/game-facts";
import { movementFeet, type MovementFeet } from "@dnd/shared/types";
import { Match } from "effect";

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
  return Match.value(activity).pipe(
    Match.when({ kind: "ordinary" }, () => 0),
    Match.when({ kind: "climbing" }, ({ speedType }) =>
      speedType === "climb" ? 0 : 1,
    ),
    Match.when({ kind: "swimming" }, ({ speedType }) =>
      speedType === "swim" ? 0 : 1,
    ),
    Match.when({ kind: "crawling" }, () => 1),
    Match.exhaustive,
  );
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
