import { describe, expect, test } from "vitest";

import {
  druidWildShapeKnownFormRosterFromPhase,
  isDruidWildShapeFeatureRecord,
} from "./druid-wild-shape-readers.ts";
import type { UnitRecord } from "./types.ts";
import { srdUnitCollection } from "./unit-catalog.ts";

describe("Druid Wild Shape readers", () => {
  test("admits the shipped Wild Shape feature and reads its known-form roster", () => {
    const units: readonly UnitRecord[] = srdUnitCollection.units;
    const wildShape = units.find(isDruidWildShapeFeatureRecord);
    expect(wildShape).toBeDefined();
    if (wildShape === undefined) return;

    const roster = druidWildShapeKnownFormRosterFromPhase(
      wildShape.mechanics.phases[0],
    );
    expect(roster).toMatchObject({
      kind: "known_forms_roster",
      creatureType: "beast",
      flySpeed: {
        kind: "allowed_at_class_level",
        atLevel: 8,
      },
    });
  });

  test("rejects unrelated Units and absent phases", () => {
    const unrelated = srdUnitCollection.units.find(
      (unit) => unit.kind !== "class_feature",
    );
    expect(unrelated).toBeDefined();
    if (unrelated === undefined) return;

    expect(isDruidWildShapeFeatureRecord(unrelated)).toBe(false);
    expect(druidWildShapeKnownFormRosterFromPhase(undefined)).toBeUndefined();
  });
});
