import { describe, expect, test } from "vitest";
import { SPEED_TYPES, type SpeedType } from "@dnd/shared/game-facts";
import { movementDeltaFeet, movementFeet } from "@dnd/shared/types";

import { effectiveSpeed, type CreatureSpeedFacts } from "./speed-algebra.ts";

const ORDINARY_SPEED_FACTS: CreatureSpeedFacts = {
  ordinarySpeedFeet: movementFeet(30),
  speedChanges: [],
  speedRatios: [],
  specialSpeeds: [],
  terminalSpeedZero: false,
};

describe("speed algebra", () => {
  test("represents ordinary Speed only", () => {
    expect(speedValue(ORDINARY_SPEED_FACTS, "walk")).toBe(30);
    expect(effectiveSpeed(ORDINARY_SPEED_FACTS, "swim")).toBe(null);
  });

  test("represents fixed special speeds", () => {
    expect(
      speedValue(
        {
          ...ORDINARY_SPEED_FACTS,
          specialSpeeds: [
            { kind: "fixed", speedType: "fly", speedFeet: movementFeet(40) },
          ],
        },
        "fly",
      ),
    ).toBe(40);
  });

  test("resolves Roving-style climb and swim speeds equal to final Speed", () => {
    const facts: CreatureSpeedFacts = {
      ...ORDINARY_SPEED_FACTS,
      speedChanges: [{ deltaFeet: movementDeltaFeet(10) }],
      specialSpeeds: [
        { kind: "equalToSpeed", speedType: "climb" },
        { kind: "equalToSpeed", speedType: "swim" },
      ],
    };

    expect(speedValue(facts, "walk")).toBe(40);
    expect(speedValue(facts, "climb")).toBe(40);
    expect(speedValue(facts, "swim")).toBe(40);
  });

  test("applies Fast Movement-style global speed changes to ordinary and special speeds", () => {
    const facts: CreatureSpeedFacts = {
      ...ORDINARY_SPEED_FACTS,
      speedChanges: [{ deltaFeet: movementDeltaFeet(10) }],
      specialSpeeds: [
        { kind: "fixed", speedType: "swim", speedFeet: movementFeet(20) },
      ],
    };

    expect(speedValue(facts, "walk")).toBe(40);
    expect(speedValue(facts, "swim")).toBe(30);
  });

  test("applies global Speed ratios after additive speed changes", () => {
    const facts: CreatureSpeedFacts = {
      ...ORDINARY_SPEED_FACTS,
      ordinarySpeedFeet: movementFeet(25),
      speedChanges: [{ deltaFeet: movementDeltaFeet(10) }],
      speedRatios: [{ numerator: 1, denominator: 2 }],
      specialSpeeds: [
        { kind: "equalToSpeed", speedType: "climb" },
        { kind: "fixed", speedType: "swim", speedFeet: movementFeet(45) },
      ],
    };

    expect(speedValue(facts, "walk")).toBe(17);
    expect(speedValue(facts, "climb")).toBe(17);
    expect(speedValue(facts, "swim")).toBe(27);
  });

  test("collapses same-kind candidates by best resulting capacity", () => {
    const facts: CreatureSpeedFacts = {
      ...ORDINARY_SPEED_FACTS,
      specialSpeeds: [
        { kind: "fixed", speedType: "swim", speedFeet: movementFeet(20) },
        { kind: "fixed", speedType: "swim", speedFeet: movementFeet(35) },
      ],
    };

    expect(speedValue(facts, "swim")).toBe(35);
  });

  test("terminal Speed 0 prevents increases", () => {
    const facts: CreatureSpeedFacts = {
      ...ORDINARY_SPEED_FACTS,
      terminalSpeedZero: true,
      speedChanges: [{ deltaFeet: movementDeltaFeet(10) }],
      specialSpeeds: [
        { kind: "equalToSpeed", speedType: "climb" },
        { kind: "fixed", speedType: "fly", speedFeet: movementFeet(60) },
      ],
    };

    expect(speedValue(facts, "walk")).toBe(0);
    expect(speedValue(facts, "climb")).toBe(0);
    expect(speedValue(facts, "fly")).toBe(0);
  });

  test("accepts every shared SpeedType at the algebra boundary", () => {
    const facts: CreatureSpeedFacts = {
      ...ORDINARY_SPEED_FACTS,
      specialSpeeds: [
        { kind: "fixed", speedType: "fly", speedFeet: movementFeet(30) },
        { kind: "fixed", speedType: "swim", speedFeet: movementFeet(30) },
        { kind: "fixed", speedType: "climb", speedFeet: movementFeet(30) },
        { kind: "fixed", speedType: "burrow", speedFeet: movementFeet(30) },
      ],
    };

    for (const speedType of SPEED_TYPES) {
      expect(speedValue(facts, speedType)).toBe(30);
    }
  });
});

function speedValue(facts: CreatureSpeedFacts, speedType: SpeedType): number {
  const speed = effectiveSpeed(facts, speedType);
  expect(speed).not.toBeNull();
  return Number(speed);
}
