import { describe, expect, test } from "vitest";

import { admitCharacterWeaponAttackExecutionWeapon } from "./character-weapon-execution-admission.ts";
import { battleObjectId } from "./identity.ts";
import { unitLibrary } from "./battle-runtime-test-support.ts";

describe("character weapon execution admission", () => {
  test("normalizes an omitted Surface property list to one canonical empty list", () => {
    const weapon = unitLibrary.requireUnit("weapon_dagger");
    if (weapon.kind !== "weapon") throw new Error("Expected weapon fixture.");
    const { properties: _properties, ...withoutProperties } = weapon;

    expect(
      admitCharacterWeaponAttackExecutionWeapon(
        withoutProperties,
        battleObjectId("test:weapon"),
        [],
      ).weapon.properties,
    ).toEqual([]);
  });
});
