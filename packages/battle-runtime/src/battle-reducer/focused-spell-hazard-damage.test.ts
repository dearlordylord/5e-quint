import { describe, expect, test } from "vitest";

import { applyDamageToPositiveHitPoints } from "./focused-spell-hazard-damage.ts";

describe("focused spell hazard damage", () => {
  test("consumes Temporary Hit Points before positive Hit Points", () => {
    expect(
      applyDamageToPositiveHitPoints(
        { hitPoints: 8, temporaryHitPoints: 3, dead: false },
        5,
      ),
    ).toEqual({ hitPoints: 6, temporaryHitPoints: 0, dead: false });
  });

  test("leaves dead targets unchanged", () => {
    const dead = { hitPoints: 0, temporaryHitPoints: 0, dead: true };
    expect(applyDamageToPositiveHitPoints(dead, 5)).toEqual(dead);
  });
});
