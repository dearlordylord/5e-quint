import { Option, Result } from "effect";
import { describe, expect, test } from "vitest";
import { unitId } from "@dnd/shared/game-facts";
import { resolveWeaponMasteryReference } from "@dnd/surface/surface/unit-catalog";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import type {
  MasteryRecord,
  UnitRecord,
  WeaponRecord,
} from "@dnd/surface/surface/types";

import {
  admitCharacterWeaponAttackExecutionWeapon,
  admitResolvedCharacterWeaponAttackExecutionWeapon,
  admitResolvedCharacterWeaponExecutionWeapon,
} from "./character-weapon-execution-admission.ts";
import { battleObjectId } from "./identity.ts";
import { unitLibrary } from "./battle-runtime.test-support.ts";

describe("character weapon execution admission", () => {
  test("omits a mastery execution property when the weapon is not selected for mastery", () => {
    const weapon = unitLibrary.requireUnit("weapon_longsword");
    if (weapon.kind !== "weapon") throw new Error("Expected weapon fixture.");

    const admission = admitCharacterWeaponAttackExecutionWeapon(
      weapon,
      battleObjectId("test:unselected-weapon"),
    );

    expect(admission.weapon).not.toHaveProperty("masteryProperty");
    expect(admission).not.toHaveProperty("hasWeaponMastery");
  });

  test("normalizes an omitted Surface property list to one canonical empty list", () => {
    const weapon = unitLibrary.requireUnit("weapon_longsword");
    if (weapon.kind !== "weapon") throw new Error("Expected weapon fixture.");
    const { properties: _properties, ...withoutProperties } = weapon;

    const resolution = resolveWeaponMasteryReference(
      withoutProperties,
      unitLibrary,
    );
    expect(Result.isSuccess(resolution)).toBe(true);
    if (Result.isFailure(resolution)) return;
    const admission = admitResolvedCharacterWeaponAttackExecutionWeapon(
      resolution.success,
      battleObjectId("test:weapon"),
      [{ weaponUnitId: resolution.success.weapon.id }],
    );

    expect(Result.isSuccess(admission)).toBe(true);
    if (Result.isFailure(admission)) return;
    expect(admission.success.weapon.properties).toEqual([]);
    expect("masteryProperty" in admission.success.weapon).toBe(true);
    if (!("masteryProperty" in admission.success.weapon)) return;
    expect(admission.success.weapon.masteryProperty).toBe("sap");
  });

  test("projects equivalent mastery mechanics after every authored identity is renamed", () => {
    const weapon = unitLibrary.requireUnit("weapon_longsword");
    const mastery = unitLibrary.requireUnit("mastery_sap");
    if (weapon.kind !== "weapon" || mastery.kind !== "mastery") {
      throw new Error("Expected weapon and mastery fixtures.");
    }

    const renamedMastery = {
      ...mastery,
      id: unitId("synthetic:mastery-hushing-touch"),
      name: "Hushing Touch",
      provenance: {
        kind: "synthetic-test",
        section: "renamed mastery equivalence",
      },
    } satisfies MasteryRecord;
    const renamedWeapon = {
      ...weapon,
      id: unitId("synthetic:weapon-ashen-sabre"),
      name: "Ashen Sabre",
      masteryUnitId: renamedMastery.id,
      provenance: {
        kind: "synthetic-test",
        section: "renamed mastery equivalence",
      },
    } satisfies WeaponRecord;
    const renamedUnits: readonly UnitRecord[] = [renamedWeapon, renamedMastery];
    const renamedCatalog: UnitCatalog = {
      getUnit: (id) => {
        const renamed = renamedUnits.find((unit) => unit.id === id);
        return renamed === undefined ? Option.none() : Option.some(renamed);
      },
      listUnits: () => renamedUnits,
      requireUnit: (id) => {
        const renamed = renamedUnits.find((unit) => unit.id === id);
        if (renamed === undefined) {
          throw new Error(`Unknown renamed test Unit: ${id}.`);
        }
        return renamed;
      },
    };

    const canonicalResolution = Result.getOrThrow(
      resolveWeaponMasteryReference(weapon, unitLibrary),
    );
    const renamedResolution = Result.getOrThrow(
      resolveWeaponMasteryReference(renamedWeapon, renamedCatalog),
    );
    const canonicalAdmission = Result.getOrThrow(
      admitResolvedCharacterWeaponExecutionWeapon(canonicalResolution),
    );
    const renamedAdmission = Result.getOrThrow(
      admitResolvedCharacterWeaponExecutionWeapon(renamedResolution),
    );
    const { weaponUnitId: canonicalWeaponUnitId, ...canonicalMechanics } =
      canonicalAdmission;
    const { weaponUnitId: renamedWeaponUnitId, ...renamedMechanics } =
      renamedAdmission;

    expect(renamedWeaponUnitId).not.toBe(canonicalWeaponUnitId);
    expect(renamedMechanics).toEqual(canonicalMechanics);
    expect(renamedMechanics.masteryProperty).toBe("sap");
  });
});
