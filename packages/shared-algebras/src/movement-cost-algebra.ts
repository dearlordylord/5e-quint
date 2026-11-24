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

/**
 * One stretch of movement to price. Difficult Terrain isn't cumulative, so it
 * is one flag. `effectExtraCostPerFoot` holds the per-foot surcharges that
 * stack on top: each Grappled creature dragged (Rules Glossary "Grappled") and
 * each effect that prices a foot of movement above 1 foot adds its own.
 */
export type MovementCostFacts = {
  readonly distanceFeet: MovementFeet;
  readonly activity: MovementActivity;
  readonly difficultTerrain: boolean;
  readonly effectExtraCostPerFoot: number;
};

export type MovementCost = {
  readonly distanceFeet: MovementFeet;
  readonly costFeet: MovementFeet;
};

export function movementCost(facts: MovementCostFacts): MovementCost {
  const extraCostPerFoot =
    (facts.difficultTerrain ? 1 : 0) +
    activityExtraCostPerFoot(facts.activity) +
    facts.effectExtraCostPerFoot;

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
