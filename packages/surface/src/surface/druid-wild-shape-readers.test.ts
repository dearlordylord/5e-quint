import { describe, expect, test } from "vitest";

import {
  druidWildShapeKnownFormRosterFromPhase,
  isDruidWildShapeFeatureRecord,
} from "./druid-wild-shape-readers.ts";
import { isEffectAtom, type UnitRecord } from "./types.ts";
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
    const phase = wildShape.mechanics.phases[0];
    if (phase.kind !== "direct") {
      throw new Error("Wild Shape activation phase changed shape");
    }
    const transformEffect = phase.effects?.[0];
    if (transformEffect === undefined || !isEffectAtom(transformEffect)) {
      throw new Error("Wild Shape transform effect is absent");
    }
    expect(
      druidWildShapeKnownFormRosterFromPhase({
        ...phase,
        effects: [{ kind: "none" }, transformEffect],
      }),
    ).toEqual(roster);
    expect(
      druidWildShapeKnownFormRosterFromPhase({
        ...phase,
        effects: [{ kind: "none" }],
      }),
    ).toBeUndefined();
    const { duration: _duration, ...mechanicsWithoutDuration } =
      wildShape.mechanics;
    expect(
      isDruidWildShapeFeatureRecord({
        ...wildShape,
        mechanics: mechanicsWithoutDuration,
      }),
    ).toBe(false);
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
