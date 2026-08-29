import { describe, expect, test } from "vitest";

import { unitId } from "@dnd/shared/game-facts";
import { srdSurface } from "@dnd/surface/surface/surface-catalog";

import {
  admitEquipmentDefinitionMechanics,
  isEquipmentDefinitionUnit,
} from "./equipment-definition-admission.ts";

const equipmentUnits = srdSurface.units.filter(isEquipmentDefinitionUnit);

describe("equipment definition mechanics admission", () => {
  test("reports the complete 13-root diagnostic without claiming closure", () => {
    expect(equipmentUnits).toHaveLength(13);
    expect(equipmentUnits.filter(({ kind }) => kind === "armor")).toHaveLength(
      3,
    );
    expect(equipmentUnits.filter(({ kind }) => kind === "shield")).toHaveLength(
      1,
    );
    expect(
      equipmentUnits.filter(({ kind }) => kind === "weapon"),
    ).toHaveLength(9);

    const results = equipmentUnits.map((unit) =>
      admitEquipmentDefinitionMechanics({ unit, surface: srdSurface }),
    );
    expect(results.filter(({ tag }) => tag === "admitted")).toHaveLength(10);
    expect(results.filter(({ tag }) => tag === "rejected")).toHaveLength(3);

    const rejectedMasteries = equipmentUnits
      .filter((unit) => unit.kind === "weapon")
      .filter(
        (unit) =>
          admitEquipmentDefinitionMechanics({ unit, surface: srdSurface }).tag ===
          "rejected",
      )
      .map((unit) => (unit.kind === "weapon" ? unit.mastery : undefined));
    expect(rejectedMasteries).toEqual(["nick", "vex", "vex"]);
  });

  test("returns rooted aggregate issues for an unresolved mastery Unit", () => {
    const dagger = equipmentUnits.find(
      (unit) => unit.kind === "weapon" && unit.mastery === "nick",
    );
    if (dagger === undefined || dagger.kind !== "weapon") {
      throw new Error("Expected the canonical unresolved-mastery weapon.");
    }

    const result = admitEquipmentDefinitionMechanics({
      unit: dagger,
      surface: srdSurface,
    });
    expect(result).toEqual({
      tag: "rejected",
      issues: [
        {
          reason: "incomplete_graph",
          mechanicsPath: {
            family: "unit",
            nodes: [
              { kind: "singleton", role: "recordMechanics" },
              { kind: "singleton", role: "reference" },
            ],
          },
          message:
            "Weapon mastery nick does not resolve to installed Unit mastery_nick.",
        },
      ],
    });
    expect(result).not.toHaveProperty("projection");
    expect(result).not.toHaveProperty("status");
  });

  test("uses an exact authored Unit reference and the installed owner profile", () => {
    const longsword = equipmentUnits.find(
      (unit) => unit.kind === "weapon" && unit.mastery === "sap",
    );
    if (longsword === undefined || longsword.kind !== "weapon") {
      throw new Error("Expected a canonical Sap weapon.");
    }

    const renamed = {
      ...longsword,
      id: unitId("synthetic_renamed_blade"),
      name: "Synthetic Renamed Blade",
      provenance: longsword.provenance,
    };
    const surface = {
      ...srdSurface,
      units: srdSurface.units.map((unit) =>
        unit.id === longsword.id ? renamed : unit,
      ),
    };

    expect(
      admitEquipmentDefinitionMechanics({ unit: renamed, surface }),
    ).toEqual({ tag: "admitted" });
  });

  test("rejects a mastery reference that resolves to a non-mastery Unit", () => {
    const longsword = equipmentUnits.find(
      (unit) => unit.kind === "weapon" && unit.mastery === "sap",
    );
    const armor = equipmentUnits.find((unit) => unit.kind === "armor");
    if (
      longsword === undefined ||
      longsword.kind !== "weapon" ||
      armor === undefined
    ) {
      throw new Error("Expected canonical equipment roots.");
    }

    const malformed = {
      ...longsword,
      id: unitId("synthetic_weapon_with_non_mastery_reference"),
      masteryUnitId: armor.id,
      provenance: longsword.provenance,
    };
    const surface = {
      ...srdSurface,
      units: [...srdSurface.units, malformed],
    };

    expect(
      admitEquipmentDefinitionMechanics({ unit: malformed, surface }),
    ).toMatchObject({
      tag: "rejected",
      issues: [
        {
          reason: "ambiguous_mechanics",
          mechanicsPath: {
            family: "unit",
            nodes: [
              { kind: "singleton", role: "recordMechanics" },
              { kind: "singleton", role: "reference" },
            ],
          },
        },
      ],
    });
  });
});
