import { Either, Schema } from "effect";
import { describe, expect, test } from "vitest";

import equipmentShieldInput from "../../surface/content/equipment_shield.json";
import armorChainMailInput from "../../surface/content/armor_chain_mail.json";
import weaponLongswordInput from "../../surface/content/weapon_longsword.json";
import weaponShortbowInput from "../../surface/content/weapon_shortbow.json";
import { unitId } from "@dnd/shared/game-facts";
import { UnitRecordSchema } from "@dnd/surface/surface/schema";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { srdUnitCollection } from "@dnd/surface/surface/unit-catalog";

import {
  isEquipmentDefinitionUnit,
  projectEquipmentDefinition,
} from "./equipment-definition-admission.ts";

const decodeUnit = (value: unknown): UnitRecord =>
  Schema.decodeUnknownSync(UnitRecordSchema, {
    onExcessProperty: "error",
  })(value);

const equipmentUnits = srdUnitCollection.units.filter(
  (
    unit,
  ): unit is Extract<
    (typeof srdUnitCollection.units)[number],
    { readonly kind: "armor" | "shield" | "weapon" }
  > => isEquipmentDefinitionUnit(unit),
);

describe("equipment definition admission", () => {
  test("projects the complete canonical equipment denominator", () => {
    expect(equipmentUnits).toHaveLength(13);
    expect(equipmentUnits.filter(({ kind }) => kind === "armor")).toHaveLength(
      3,
    );
    expect(equipmentUnits.filter(({ kind }) => kind === "shield")).toHaveLength(
      1,
    );
    expect(equipmentUnits.filter(({ kind }) => kind === "weapon")).toHaveLength(
      9,
    );

    const results = equipmentUnits.map((unit) => {
      if (unit.kind === "armor") return projectEquipmentDefinition(unit);
      if (unit.kind === "shield") return projectEquipmentDefinition(unit);
      return projectEquipmentDefinition(unit);
    });
    expect(results.every(Either.isRight)).toBe(true);
    expect(results.filter(Either.isLeft)).toHaveLength(0);
  });

  test("keeps the projection independent of authored identity", () => {
    const canonical = decodeUnit(weaponShortbowInput);
    const renamed = decodeUnit({
      ...weaponShortbowInput,
      id: unitId("synthetic_renamed_bow"),
      name: "Synthetic Renamed Bow",
      provenance: {
        kind: "synthetic-test",
        section: "Synthetic/Equipment/Renamed Bow",
      },
    });

    if (!isEquipmentDefinitionUnit(canonical)) {
      throw new Error("Expected canonical weapon fixture");
    }
    if (!isEquipmentDefinitionUnit(renamed)) {
      throw new Error("Expected renamed weapon fixture");
    }
    const canonicalProjection = projectEquipmentDefinition(canonical);
    const renamedProjection = projectEquipmentDefinition(renamed);
    expect(canonicalProjection).toEqual(renamedProjection);
    expect(canonicalProjection).not.toHaveProperty("right.weaponUnitId");
    expect(canonicalProjection).not.toHaveProperty("right.id");
    expect(canonicalProjection).not.toHaveProperty("right.name");
  });

  test("normalizes an omitted weapon property collection to the one empty state", () => {
    const { properties: _properties, ...withoutProperties } =
      weaponShortbowInput;
    const omitted = decodeUnit(withoutProperties);
    const explicitEmpty = decodeUnit({ ...withoutProperties, properties: [] });

    if (
      !isEquipmentDefinitionUnit(omitted) ||
      !isEquipmentDefinitionUnit(explicitEmpty)
    ) {
      throw new Error("Expected weapon fixtures");
    }
    const omittedProjection = projectEquipmentDefinition(omitted);
    const explicitEmptyProjection = projectEquipmentDefinition(explicitEmpty);
    expect(omittedProjection).toEqual(explicitEmptyProjection);
    expect(Either.isRight(omittedProjection)).toBe(true);
    if (Either.isLeft(omittedProjection)) return;
    expect(omittedProjection.right.tag).toBe("weapon");
    if (omittedProjection.right.tag !== "weapon") return;
    expect(omittedProjection.right.properties).toEqual([]);
  });

  test.each([
    {
      name: "negative cost",
      unit: decodeUnit({ ...armorChainMailInput, costGp: -1 }),
      path: { tag: "armor", field: "costGp" },
    },
    {
      name: "non-positive damage dice",
      unit: decodeUnit({
        ...weaponShortbowInput,
        damage: { ...weaponShortbowInput.damage, dice: 0 },
      }),
      path: { tag: "weaponDamage", field: "dice" },
    },
    {
      name: "reversed ammunition range",
      unit: decodeUnit({
        ...weaponShortbowInput,
        properties: weaponShortbowInput.properties?.map((property) =>
          property.kind === "ammunition"
            ? { ...property, range: { normal: 320, long: 80 } }
            : property,
        ),
      }),
      path: {
        tag: "weaponPropertyRange",
        propertyOrdinal: 1,
        field: "long",
      },
    },
    {
      name: "armor category donning time",
      unit: decodeUnit({
        ...armorChainMailInput,
        donDoff: { donMinutes: 1, doffMinutes: 1 },
      }),
      path: { tag: "armor", field: "donMinutes" },
    },
  ])("rejects $name with a precise path", ({ unit, path }) => {
    if (!isEquipmentDefinitionUnit(unit)) {
      throw new Error("Expected equipment fixture");
    }
    const result = projectEquipmentDefinition(unit);
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isRight(result)) return;
    expect(result.left[0]?.path).toEqual(path);
  });

  test("rejects contradictory weapon properties instead of accepting by kind", () => {
    const unit = decodeUnit({
      ...weaponLongswordInput,
      properties: [
        ...(weaponLongswordInput.properties ?? []),
        { kind: "two_handed" },
      ],
    });
    if (!isEquipmentDefinitionUnit(unit)) {
      throw new Error("Expected equipment fixture");
    }

    const result = projectEquipmentDefinition(unit);
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isRight(result)) return;
    expect(result.left).toContainEqual(
      expect.objectContaining({
        reason: "ambiguous_mechanics",
        path: { tag: "weapon", field: "category" },
      }),
    );
  });

  test("rejects ammunition attached to a melee weapon", () => {
    const unit = decodeUnit({
      ...weaponLongswordInput,
      properties: [
        ...(weaponLongswordInput.properties ?? []),
        {
          kind: "ammunition",
          ammunition: "arrow",
          range: { normal: 80, long: 320 },
        },
      ],
    });
    if (!isEquipmentDefinitionUnit(unit)) {
      throw new Error("Expected equipment fixture");
    }

    const result = projectEquipmentDefinition(unit);
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isRight(result)) return;
    expect(result.left).toContainEqual(
      expect.objectContaining({
        reason: "ambiguous_mechanics",
        path: {
          tag: "weaponProperty",
          propertyOrdinal: 2,
          field: "ammunition",
        },
      }),
    );
  });

  test("keeps shield donning facts in its static projection", () => {
    const shield = decodeUnit(equipmentShieldInput);
    if (!isEquipmentDefinitionUnit(shield) || shield.kind !== "shield") {
      throw new Error("Expected shield fixture");
    }
    const result = projectEquipmentDefinition(shield);
    expect(result).toEqual(
      Either.right({
        tag: "shield",
        armorClassProjection: shield.armorClassProjection,
        weightPounds: shield.weightPounds,
        costGp: shield.costGp,
        donDoff: shield.donDoff,
      }),
    );
  });
});
