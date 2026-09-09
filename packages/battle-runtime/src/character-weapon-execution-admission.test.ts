import { describe, expect, test } from "vitest";

import {
  bindCharacterWeaponAttackExecutionWeapon,
  bindCharacterWeaponExecutionWeapon,
} from "./character-weapon-execution-admission.ts";
import { battleObjectId } from "./identity.ts";
import { admitWeaponDefinition } from "./procedure-admission/weapon-definition.ts";
import { unitLibrary } from "./battle-runtime.test-support.ts";

function longswordDefinition() {
  const weapon = unitLibrary.requireUnit("weapon_longsword");
  if (weapon.kind !== "weapon") throw new Error("Expected weapon fixture.");
  const admission = admitWeaponDefinition({
    weapon,
    unitCatalog: unitLibrary,
  });
  if (admission.tag === "rejected") {
    throw new Error(admission.issues.map(({ message }) => message).join(" "));
  }
  return { weapon, admission };
}

describe("character weapon execution binding", () => {
  test("omits the admitted mastery property when the weapon is not selected", () => {
    const { weapon, admission } = longswordDefinition();

    const execution = bindCharacterWeaponExecutionWeapon({
      weaponUnitId: weapon.id,
      definition: admission,
      weaponMasteries: [],
    });

    expect(execution).not.toHaveProperty("masteryProperty");
    expect(execution.weaponUnitId).toBe(weapon.id);
  });

  test("retains the admitted mastery property when the weapon is selected", () => {
    const { weapon, admission } = longswordDefinition();

    const execution = bindCharacterWeaponExecutionWeapon({
      weaponUnitId: weapon.id,
      definition: admission,
      weaponMasteries: [{ weaponUnitId: weapon.id }],
    });

    expect(execution).toMatchObject({
      weaponUnitId: weapon.id,
      masteryProperty: "sap",
    });
  });

  test("binds the equipment object identity beside the admitted facts", () => {
    const { weapon, admission } = longswordDefinition();
    const objectId = battleObjectId("test:longsword");

    expect(
      bindCharacterWeaponAttackExecutionWeapon({
        weaponUnitId: weapon.id,
        definition: admission,
        objectId,
        weaponMasteries: [],
      }),
    ).toMatchObject({
      weaponObjectId: objectId,
      weapon: { weaponUnitId: weapon.id },
    });
  });
});
