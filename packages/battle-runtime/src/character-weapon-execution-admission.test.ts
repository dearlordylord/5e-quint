import { Result } from "effect";
import { describe, expect, test } from "vitest";

import {
  bindCharacterWeaponAttackExecutionWeapon,
  bindCharacterWeaponExecutionWeapon,
} from "./character-weapon-execution-admission.ts";
import { battleObjectId } from "./identity.ts";
import { admitWeaponDefinition } from "./procedure-admission/weapon-definition.ts";
import { unitLibrary } from "./battle-runtime.test-support.ts";

function weaponDefinition(weaponUnitId: string) {
  const weapon = unitLibrary.requireUnit(weaponUnitId);
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

function longswordDefinition() {
  return weaponDefinition("weapon_longsword");
}

describe("character weapon execution binding", () => {
  test("omits the admitted mastery property when the weapon is not selected", () => {
    const { weapon, admission } = longswordDefinition();

    const execution = bindCharacterWeaponExecutionWeapon({
      weaponUnitId: weapon.id,
      definition: admission,
      weaponMasteries: [],
    });

    expect(execution).toMatchObject({ success: { weaponUnitId: weapon.id } });
    expect(Result.isSuccess(execution) && execution.success).not.toHaveProperty(
      "masteryProperty",
    );
  });

  test("retains the admitted mastery property when the weapon is selected", () => {
    const { weapon, admission } = longswordDefinition();

    const execution = bindCharacterWeaponExecutionWeapon({
      weaponUnitId: weapon.id,
      definition: admission,
      weaponMasteries: [{ weaponUnitId: weapon.id }],
    });

    expect(execution).toMatchObject({
      success: { weaponUnitId: weapon.id, masteryProperty: "sap" },
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
      success: {
        weaponObjectId: objectId,
        weapon: { weaponUnitId: weapon.id },
      },
    });
  });

  test("binds a weapon whose mastery Battle lacks for ordinary use, and refuses that mastery when selected", () => {
    const { weapon, admission } = weaponDefinition("weapon_dagger");
    expect(admission).toMatchObject({ masterySupport: "unsupported" });

    const ordinary = bindCharacterWeaponExecutionWeapon({
      weaponUnitId: weapon.id,
      definition: admission,
      weaponMasteries: [],
    });
    expect(ordinary).toMatchObject({ success: { weaponUnitId: weapon.id } });
    expect(Result.isSuccess(ordinary) && ordinary.success).not.toHaveProperty(
      "masteryProperty",
    );

    const selected = bindCharacterWeaponExecutionWeapon({
      weaponUnitId: weapon.id,
      definition: admission,
      weaponMasteries: [{ weaponUnitId: weapon.id }],
    });
    expect(Result.isFailure(selected)).toBe(true);
    expect(Result.isFailure(selected) && selected.failure).toEqual(
      admission.masterySupport === "unsupported"
        ? admission.resolvedMastery.issues
        : [],
    );
  });
});
