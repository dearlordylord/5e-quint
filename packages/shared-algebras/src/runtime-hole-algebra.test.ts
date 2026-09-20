import { DieRollResult } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";

import {
  d20TestRollMode,
  d20TestRollsEqual,
  holeId,
  holeInstanceKey,
  holeLocalKey,
  holeStepKey,
  selectedD20TestNaturalD20,
  type D20TestRoll,
} from "./runtime-hole-algebra.ts";

const single = (naturalD20: number): D20TestRoll => ({
  tag: "single",
  naturalD20: DieRollResult(naturalD20),
});

const multiple = (
  first: number,
  second: number,
  rollMode: "advantage" | "disadvantage",
): D20TestRoll => ({
  tag: "multiple",
  first: DieRollResult(first),
  second: DieRollResult(second),
  rollMode,
});

describe("runtime-hole algebra", () => {
  test("constructs each branded hole identity", () => {
    expect(String(holeId("core_attack_target"))).toBe("core_attack_target");
    expect(String(holeStepKey("synthetic:step"))).toBe("synthetic:step");
    expect(String(holeLocalKey("synthetic:local"))).toBe("synthetic:local");
    expect(String(holeInstanceKey("synthetic:instance"))).toBe(
      "synthetic:instance",
    );
  });

  test("selects a single D20 and each multiple-roll winner", () => {
    expect(selectedD20TestNaturalD20(single(12))).toBe(12);

    expect(selectedD20TestNaturalD20(multiple(15, 10, "advantage"))).toBe(15);
    expect(selectedD20TestNaturalD20(multiple(10, 15, "advantage"))).toBe(15);
    expect(selectedD20TestNaturalD20(multiple(10, 15, "disadvantage"))).toBe(
      10,
    );
    expect(selectedD20TestNaturalD20(multiple(15, 10, "disadvantage"))).toBe(
      10,
    );
  });

  test("reports normal, advantage, and disadvantage modes", () => {
    expect(d20TestRollMode(single(12))).toBe("normal");
    expect(d20TestRollMode(multiple(15, 10, "advantage"))).toBe("advantage");
    expect(d20TestRollMode(multiple(10, 15, "disadvantage"))).toBe(
      "disadvantage",
    );
  });

  test("compares absent, single, and multiple roll evidence structurally", () => {
    const firstSingle = single(10);
    const equalSingle = single(10);
    const differentSingle = single(11);
    const firstMultiple = multiple(10, 15, "advantage");
    const equalMultiple = multiple(10, 15, "advantage");

    expect(d20TestRollsEqual(undefined, undefined)).toBe(true);
    expect(d20TestRollsEqual(undefined, firstSingle)).toBe(false);
    expect(d20TestRollsEqual(firstSingle, undefined)).toBe(false);
    expect(d20TestRollsEqual(firstSingle, equalSingle)).toBe(true);
    expect(d20TestRollsEqual(firstSingle, differentSingle)).toBe(false);
    expect(d20TestRollsEqual(firstSingle, firstMultiple)).toBe(false);
    expect(d20TestRollsEqual(firstMultiple, equalMultiple)).toBe(true);
    expect(
      d20TestRollsEqual(firstMultiple, multiple(11, 15, "advantage")),
    ).toBe(false);
    expect(
      d20TestRollsEqual(firstMultiple, multiple(10, 16, "advantage")),
    ).toBe(false);
    expect(
      d20TestRollsEqual(firstMultiple, multiple(10, 15, "disadvantage")),
    ).toBe(false);
    expect(d20TestRollsEqual(firstMultiple, firstSingle)).toBe(false);
  });
});
