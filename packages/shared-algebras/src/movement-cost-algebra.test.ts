import { describe, expect, test } from "vitest";
import type { SpeedType } from "@dnd/shared/game-facts";
import { movementFeet } from "@dnd/shared/types";

import {
  movementCost,
  ordinaryMovementCost,
  type MovementCostFacts,
} from "./movement-cost-algebra.ts";

const BASE_FACTS: MovementCostFacts = {
  distanceFeet: movementFeet(5),
  activity: { kind: "ordinary", speedType: "walk" },
  difficultTerrain: false,
  squeezing: false,
  grappleDragExtraCost: false,
};

describe("movement cost algebra", () => {
  test("ordinary movement costs one foot per foot", () => {
    expect(cost(BASE_FACTS)).toEqual({ distance: 5, cost: 5 });
    expect(ordinaryMovementCost(movementFeet(5), "walk").costFeet).toBe(5);
  });

  test("Difficult Terrain costs one extra foot per foot and is not cumulative", () => {
    expect(cost({ ...BASE_FACTS, difficultTerrain: true })).toEqual({
      distance: 5,
      cost: 10,
    });
  });

  test("climbing costs extra unless using a Climb Speed", () => {
    expect(
      cost({
        ...BASE_FACTS,
        activity: { kind: "climbing", speedType: "walk" },
      }),
    ).toEqual({ distance: 5, cost: 10 });
    expect(
      cost({
        ...BASE_FACTS,
        activity: { kind: "climbing", speedType: "climb" },
      }),
    ).toEqual({ distance: 5, cost: 5 });
  });

  test("swimming costs extra unless using a Swim Speed", () => {
    expect(
      cost({
        ...BASE_FACTS,
        activity: { kind: "swimming", speedType: "walk" },
      }),
    ).toEqual({ distance: 5, cost: 10 });
    expect(
      cost({
        ...BASE_FACTS,
        activity: { kind: "swimming", speedType: "swim" },
      }),
    ).toEqual({ distance: 5, cost: 5 });
  });

  test("crawling and squeezing each add their own cost factor", () => {
    expect(
      cost({
        ...BASE_FACTS,
        activity: { kind: "crawling", speedType: "walk" },
      }),
    ).toEqual({ distance: 5, cost: 10 });
    expect(cost({ ...BASE_FACTS, squeezing: true })).toEqual({
      distance: 5,
      cost: 10,
    });
  });

  test("simultaneous factors compose predictably", () => {
    expect(
      cost({
        ...BASE_FACTS,
        difficultTerrain: true,
        activity: { kind: "climbing", speedType: "walk" },
        squeezing: true,
        grappleDragExtraCost: true,
      }),
    ).toEqual({ distance: 5, cost: 25 });
  });

  test("accepts every SpeedType at the algebra boundary", () => {
    const speedTypes = [
      "walk",
      "fly",
      "swim",
      "climb",
      "burrow",
    ] as const satisfies ReadonlyArray<SpeedType>;
    for (const speedType of speedTypes) {
      expect(
        cost({ ...BASE_FACTS, activity: { kind: "ordinary", speedType } }),
      ).toEqual({ distance: 5, cost: 5 });
    }
  });
});

function cost(facts: MovementCostFacts): {
  readonly distance: number;
  readonly cost: number;
} {
  const result = movementCost(facts);
  return {
    distance: Number(result.distanceFeet),
    cost: Number(result.costFeet),
  };
}
