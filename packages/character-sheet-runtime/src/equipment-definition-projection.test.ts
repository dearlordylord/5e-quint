import { Result } from "effect";
import { describe, expect, test } from "vitest";

import armorChainMailInput from "../../surface/content/armor_chain_mail.json";
import armorLeatherInput from "../../surface/content/armor_leather.json";
import equipmentShieldInput from "../../surface/content/equipment_shield.json";
import { PositiveInteger } from "@dnd/shared/types";
import { unitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import { srdUnitCollection } from "@dnd/surface/surface/unit-catalog";

import { projectCharacterSheetEquipmentDefinition } from "./equipment-definition-projection.ts";

const armorAndShieldRoots = srdUnitCollection.units.filter(
  (unit) => unit.kind === "armor" || unit.kind === "shield",
);

describe("Character Sheet equipment definition projection", () => {
  test("diagnoses exactly three armor roots and one shield root", () => {
    expect(armorAndShieldRoots).toHaveLength(4);
    expect(
      armorAndShieldRoots.filter(({ kind }) => kind === "armor"),
    ).toHaveLength(3);
    expect(
      armorAndShieldRoots.filter(({ kind }) => kind === "shield"),
    ).toHaveLength(1);

    const admitted = srdUnitCollection.units.flatMap((unit) => {
      const projection = projectCharacterSheetEquipmentDefinition(unit);
      return Result.isSuccess(projection) ? [projection.success] : [];
    });
    expect(admitted).toHaveLength(4);
    expect(admitted.filter(({ kind }) => kind === "armor")).toHaveLength(3);
    expect(admitted.filter(({ kind }) => kind === "shield")).toHaveLength(1);
    expect(admitted).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "armor",
          facts: expect.objectContaining({
            category: "light",
            acFormula: expect.objectContaining({ kind: "light_dex" }),
          }),
        }),
        expect.objectContaining({
          kind: "armor",
          facts: expect.objectContaining({
            category: "medium",
            acFormula: expect.objectContaining({ kind: "medium_dex_max_2" }),
          }),
        }),
        expect.objectContaining({
          kind: "armor",
          facts: expect.objectContaining({
            category: "heavy",
            acFormula: expect.objectContaining({ kind: "heavy_fixed" }),
          }),
        }),
        expect.objectContaining({ kind: "shield" }),
      ]),
    );
  });

  test("preserves all static armor and shield facts without authored identity", () => {
    const armor = decodeUnitRecordSync(armorChainMailInput);
    const shield = decodeUnitRecordSync(equipmentShieldInput);

    expect(projectCharacterSheetEquipmentDefinition(armor)).toEqual(
      Result.succeed({
        kind: "armor",
        facts: {
          acFormula: armorChainMailInput.acFormula,
          category: armorChainMailInput.category,
          costGp: armorChainMailInput.costGp,
          donDoff: armorChainMailInput.donDoff,
          stealthDisadvantage: armorChainMailInput.stealthDisadvantage,
          strengthRequirement: armorChainMailInput.strengthRequirement,
          weightPounds: armorChainMailInput.weightPounds,
        },
      }),
    );
    expect(projectCharacterSheetEquipmentDefinition(shield)).toEqual(
      Result.succeed({
        kind: "shield",
        facts: {
          armorClassProjection: equipmentShieldInput.armorClassProjection,
          costGp: equipmentShieldInput.costGp,
          donDoff: equipmentShieldInput.donDoff,
          weightPounds: equipmentShieldInput.weightPounds,
        },
      }),
    );
  });

  test("is invariant under synthetic authored identity and prose renaming", () => {
    const canonicalArmor = decodeUnitRecordSync(armorLeatherInput);
    const renamedArmor = decodeUnitRecordSync({
      ...armorLeatherInput,
      id: "synthetic_armor_root",
      name: "Synthetic Quiet Armor",
      provenance: {
        kind: "synthetic-test",
        section: "Synthetic/Equipment/Quiet Armor",
      },
    });
    const canonicalShield = decodeUnitRecordSync(equipmentShieldInput);
    const renamedShield = decodeUnitRecordSync({
      ...equipmentShieldInput,
      id: "synthetic_guard_root",
      name: "Synthetic Guard",
      provenance: {
        kind: "synthetic-test",
        section: "Synthetic/Equipment/Guard",
      },
    });

    expect(projectCharacterSheetEquipmentDefinition(renamedArmor)).toEqual(
      projectCharacterSheetEquipmentDefinition(canonicalArmor),
    );
    expect(projectCharacterSheetEquipmentDefinition(renamedShield)).toEqual(
      projectCharacterSheetEquipmentDefinition(canonicalShield),
    );
  });

  test("accumulates independently represented armor failures at rooted mechanics paths", () => {
    const contradictoryArmor = decodeUnitRecordSync({
      ...armorChainMailInput,
      acFormula: { kind: "heavy_fixed", ac: -1 },
      strengthRequirement: 0,
      weightPounds: 0,
      costGp: -1,
      donDoff: { donMinutes: 1, doffMinutes: 1 },
    });

    const result = projectCharacterSheetEquipmentDefinition(contradictoryArmor);
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isSuccess(result)) return;
    expect(result.failure).toHaveLength(5);
    expect(result.failure.map(({ mechanicsPath }) => mechanicsPath)).toEqual([
      generalFactPath(1),
      generalFactPath(4),
      generalFactPath(2),
      generalFactPath(5),
      generalFactPath(6),
    ]);
  });

  test("rejects an unsupported Unit role at the typed root path", () => {
    const unsupported = srdUnitCollection.units.find(
      (unit) => unit.kind === "weapon",
    );
    if (unsupported === undefined) {
      throw new Error("The SRD catalog must contain a weapon root.");
    }

    const result = projectCharacterSheetEquipmentDefinition(unsupported);
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isSuccess(result)) return;
    expect(result.failure).toEqual([
      expect.objectContaining({
        reason: "no_admitted_procedure",
        mechanicsPath: unitMechanicsPath([
          { kind: "singleton", role: "recordMechanics" },
        ]),
      }),
    ]);
  });

  test("accumulates independent shield failures at their fact paths", () => {
    const contradictoryShield = decodeUnitRecordSync({
      ...equipmentShieldInput,
      armorClassProjection: {
        ...equipmentShieldInput.armorClassProjection,
        bonus: 3,
      },
      weightPounds: 0,
      costGp: -1,
    });

    const result =
      projectCharacterSheetEquipmentDefinition(contradictoryShield);
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isSuccess(result)) return;
    expect(result.failure).toHaveLength(3);
    expect(result.failure.map(({ mechanicsPath }) => mechanicsPath)).toEqual([
      generalFactPath(1),
      generalFactPath(3),
      generalFactPath(4),
    ]);

    const nonPositiveBonus = projectCharacterSheetEquipmentDefinition(
      decodeUnitRecordSync({
        ...equipmentShieldInput,
        armorClassProjection: {
          ...equipmentShieldInput.armorClassProjection,
          bonus: 0,
        },
      }),
    );
    expect(Result.isFailure(nonPositiveBonus)).toBe(true);
    if (Result.isSuccess(nonPositiveBonus)) return;
    expect(nonPositiveBonus.failure).toEqual([
      expect.objectContaining({
        reason: "unsupported_mechanics",
        mechanicsPath: generalFactPath(1),
      }),
    ]);
  });
});

function generalFactPath(ordinal: number) {
  return unitMechanicsPath([
    { kind: "singleton", role: "recordMechanics" },
    {
      kind: "occurrence",
      role: "generalFact",
      ordinal: PositiveInteger(ordinal),
    },
  ]);
}
