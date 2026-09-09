import { unitId } from "@dnd/shared/game-facts";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import {
  inspectWeaponMasteryReferenceGraph,
  type UnitCatalog,
} from "@dnd/surface/surface/unit-catalog-core";
import type { UnitRecord, WeaponRecord } from "@dnd/surface/surface/types";
import { Option } from "effect";
import { describe, expect, test } from "vitest";

import { unitLibrary } from "../unit-profile-admission-catalog.test-support.ts";
import {
  admitWeaponDefinition,
  isWeaponDefinitionUnit,
} from "./weapon-definition.ts";

const canonicalWeaponMasteries = [
  {
    weaponUnitId: "weapon_club",
    masteryUnitId: "mastery_slow",
    masteryProperty: "slow",
  },
  {
    weaponUnitId: "weapon_dagger",
    masteryUnitId: "mastery_nick",
    masteryProperty: "nick",
  },
  {
    weaponUnitId: "weapon_greataxe",
    masteryUnitId: "mastery_cleave",
    masteryProperty: "cleave",
  },
  {
    weaponUnitId: "weapon_longsword",
    masteryUnitId: "mastery_sap",
    masteryProperty: "sap",
  },
  {
    weaponUnitId: "weapon_spear",
    masteryUnitId: "mastery_sap",
    masteryProperty: "sap",
  },
  {
    weaponUnitId: "weapon_flail",
    masteryUnitId: "mastery_sap",
    masteryProperty: "sap",
  },
  {
    weaponUnitId: "weapon_shortbow",
    masteryUnitId: "mastery_vex",
    masteryProperty: "vex",
  },
  {
    weaponUnitId: "weapon_shortsword",
    masteryUnitId: "mastery_vex",
    masteryProperty: "vex",
  },
  {
    weaponUnitId: "weapon_quarterstaff",
    masteryUnitId: "mastery_topple",
    masteryProperty: "topple",
  },
] as const;

const weaponMasteryReferencePath = {
  family: "unit",
  nodes: [
    { kind: "singleton", role: "recordMechanics" },
    { kind: "singleton", role: "reference" },
  ],
} as const;

describe("weapon definition admission", () => {
  test("recognizes only weapon Units as weapon definitions", () => {
    expect(
      isWeaponDefinitionUnit(unitLibrary.requireUnit("weapon_longsword")),
    ).toBe(true);
    expect(isWeaponDefinitionUnit(unitLibrary.requireUnit("mastery_sap"))).toBe(
      false,
    );
  });

  test("admits six of the canonical nine roots after all nine Surface refs resolve", () => {
    const weaponRoots = unitLibrary.listUnits().filter(isWeaponDefinitionUnit);
    const surfaceGraph = inspectWeaponMasteryReferenceGraph({
      weaponRoots,
      unitCatalog: unitLibrary,
    });

    expect(weaponRoots).toHaveLength(9);
    expect([...weaponRoots.map(({ id }) => id)].sort()).toEqual(
      [
        ...canonicalWeaponMasteries.map(({ weaponUnitId }) => weaponUnitId),
      ].sort(),
    );
    expect(surfaceGraph.issues).toEqual([]);
    expect(surfaceGraph.resolved).toHaveLength(9);
    expect(
      surfaceGraph.resolved
        .map(({ weapon, mastery }) => ({
          weaponUnitId: weapon.id,
          masteryUnitId: mastery.id,
        }))
        .sort((left, right) =>
          left.weaponUnitId.localeCompare(right.weaponUnitId),
        ),
    ).toEqual(
      [...canonicalWeaponMasteries]
        .map(({ weaponUnitId, masteryUnitId }) => ({
          weaponUnitId,
          masteryUnitId,
        }))
        .sort((left, right) =>
          left.weaponUnitId.localeCompare(right.weaponUnitId),
        ),
    );

    const admissions = weaponRoots.map((weapon) => ({
      weapon,
      admission: admitWeaponDefinition({
        weapon,
        unitCatalog: unitLibrary,
      }),
    }));
    const admitted = admissions.flatMap(({ weapon, admission }) =>
      admission.tag === "admitted"
        ? [
            {
              weaponUnitId: weapon.id,
              masteryProperty: admission.facts.masteryProperty,
              facts: admission.facts,
            },
          ]
        : [],
    );
    const rejected = admissions.flatMap(({ weapon, admission }) =>
      admission.tag === "rejected"
        ? [
            {
              weaponUnitId: weapon.id,
              issues: admission.issues,
            },
          ]
        : [],
    );

    expect(admitted).toHaveLength(6);
    expect(rejected).toHaveLength(3);
    expect(
      admitted
        .map(({ weaponUnitId, masteryProperty }) => ({
          weaponUnitId,
          masteryProperty,
        }))
        .sort((left, right) =>
          left.weaponUnitId.localeCompare(right.weaponUnitId),
        ),
    ).toEqual(
      [...canonicalWeaponMasteries]
        .filter(({ masteryProperty }) =>
          ["cleave", "sap", "slow", "topple"].includes(masteryProperty),
        )
        .map(({ weaponUnitId, masteryProperty }) => ({
          weaponUnitId,
          masteryProperty,
        }))
        .sort((left, right) =>
          left.weaponUnitId.localeCompare(right.weaponUnitId),
        ),
    );
    const rejectedFacts = rejected
      .map(({ weaponUnitId, issues }) => ({
        weaponUnitId,
        issueCount: issues.length,
        reason: issues[0]?.reason,
        mechanicsPath: issues[0]?.mechanicsPath,
      }))
      .sort((left, right) =>
        left.weaponUnitId.localeCompare(right.weaponUnitId),
      );
    expect(rejectedFacts).toEqual(
      [
        {
          weaponUnitId: "weapon_dagger",
          issueCount: 1,
          reason: "unsupported_mechanics",
          mechanicsPath: weaponMasteryReferencePath,
        },
        {
          weaponUnitId: "weapon_shortsword",
          issueCount: 1,
          reason: "unsupported_mechanics",
          mechanicsPath: weaponMasteryReferencePath,
        },
        {
          weaponUnitId: "weapon_shortbow",
          issueCount: 1,
          reason: "unsupported_mechanics",
          mechanicsPath: weaponMasteryReferencePath,
        },
      ].sort((left, right) =>
        left.weaponUnitId.localeCompare(right.weaponUnitId),
      ),
    );
    for (const { facts } of admitted) {
      expect(facts).not.toHaveProperty("weaponUnitId");
      expect(facts).not.toHaveProperty("masteryUnitId");
    }
  });

  test("accumulates independent missing, wrong-kind, ambiguous, and unsupported rooted issues", () => {
    const canonicalWeapon = requireWeapon("weapon_longsword");
    const canonicalMastery = unitLibrary.requireUnit("mastery_sap");
    const armor = unitLibrary.requireUnit("armor_chain_mail");
    if (canonicalMastery.kind !== "mastery" || armor.kind !== "armor") {
      throw new Error("Expected canonical mastery and armor fixtures.");
    }

    const missingWeapon = decodeWeapon({
      ...canonicalWeapon,
      id: unitId("synthetic:weapon-missing-mastery"),
      masteryUnitId: unitId("synthetic:mastery-missing"),
    });
    const wrongKindWeapon = decodeWeapon({
      ...canonicalWeapon,
      id: unitId("synthetic:weapon-wrong-kind"),
      masteryUnitId: armor.id,
    });
    const ambiguousWeapon = decodeWeapon({
      ...canonicalWeapon,
      id: unitId("synthetic:weapon-ambiguous-mastery"),
    });
    const duplicateMastery = decodeUnitRecordSync({
      ...canonicalMastery,
      name: "Duplicate Sap Fixture",
    });
    if (duplicateMastery.kind !== "mastery") {
      throw new Error("Expected a mastery duplicate fixture.");
    }
    const unsupportedWeapon = requireWeapon("weapon_dagger");

    const cases = [
      { weapon: missingWeapon, unitCatalog: unitLibrary },
      { weapon: wrongKindWeapon, unitCatalog: unitLibrary },
      {
        weapon: ambiguousWeapon,
        unitCatalog: catalogFor([canonicalMastery, duplicateMastery]),
      },
      { weapon: unsupportedWeapon, unitCatalog: unitLibrary },
    ] as const;
    const diagnostics = cases.flatMap(({ weapon, unitCatalog }) => {
      const admission = admitWeaponDefinition({ weapon, unitCatalog });
      if (admission.tag === "admitted") {
        throw new Error(`Expected ${weapon.id} to be rejected.`);
      }
      return admission.issues.map((issue) => ({
        root: { kind: "unit" as const, id: weapon.id },
        ...issue,
      }));
    });

    expect(diagnostics).toEqual([
      {
        root: {
          kind: "unit",
          id: "synthetic:weapon-missing-mastery",
        },
        reason: "incomplete_graph",
        mechanicsPath: weaponMasteryReferencePath,
        message:
          "The weapon mastery reference synthetic:mastery-missing is missing from the Unit catalog.",
      },
      {
        root: {
          kind: "unit",
          id: "synthetic:weapon-wrong-kind",
        },
        reason: "unsupported_mechanics",
        mechanicsPath: weaponMasteryReferencePath,
        message:
          "The weapon mastery reference armor_chain_mail resolves to Unit kind armor instead of mastery.",
      },
      {
        root: {
          kind: "unit",
          id: "synthetic:weapon-ambiguous-mastery",
        },
        reason: "ambiguous_mechanics",
        mechanicsPath: weaponMasteryReferencePath,
        message:
          "The weapon mastery reference mastery_sap matches 2 Unit roots.",
      },
      {
        root: { kind: "unit", id: "weapon_dagger" },
        reason: "unsupported_mechanics",
        mechanicsPath: weaponMasteryReferencePath,
        message:
          "The referenced Weapon Mastery procedure is unsupported by Battle: The represented atomic Weapon Mastery procedure is not completely supported by Battle.",
      },
    ]);
  });

  test("keeps execution facts equivalent after renaming weapon and mastery identities", () => {
    const weapon = requireWeapon("weapon_longsword");
    const mastery = unitLibrary.requireUnit("mastery_sap");
    if (mastery.kind !== "mastery") {
      throw new Error("Expected the canonical Sap mastery fixture.");
    }
    const renamedMastery = decodeUnitRecordSync({
      ...mastery,
      id: unitId("synthetic:mastery-hushing-touch"),
      name: "Hushing Touch",
      provenance: {
        kind: "synthetic-test",
        section: "weapon definition renamed equivalence",
      },
    });
    const renamedWeapon = decodeWeapon({
      ...weapon,
      id: unitId("synthetic:weapon-ashen-sabre"),
      name: "Ashen Sabre",
      masteryUnitId: renamedMastery.id,
      provenance: {
        kind: "synthetic-test",
        section: "weapon definition renamed equivalence",
      },
    });

    const canonical = admitWeaponDefinition({
      weapon,
      unitCatalog: unitLibrary,
    });
    const renamed = admitWeaponDefinition({
      weapon: renamedWeapon,
      unitCatalog: catalogFor([renamedWeapon, renamedMastery]),
    });
    if (canonical.tag !== "admitted" || renamed.tag !== "admitted") {
      throw new Error("Expected canonical and renamed weapons to be admitted.");
    }

    expect(renamedWeapon.id).not.toBe(weapon.id);
    expect(renamedMastery.id).not.toBe(mastery.id);
    expect(renamedWeapon.masteryUnitId).not.toBe(weapon.masteryUnitId);
    expect(renamed.facts).toEqual(canonical.facts);
    expect(renamed.facts.masteryProperty).toBe("sap");
  });
});

function requireWeapon(id: string): WeaponRecord {
  const unit = unitLibrary.requireUnit(id);
  if (!isWeaponDefinitionUnit(unit)) {
    throw new Error(`Expected ${id} to be a weapon definition.`);
  }
  return unit;
}

function decodeWeapon(input: unknown): WeaponRecord {
  const unit = decodeUnitRecordSync(input);
  if (!isWeaponDefinitionUnit(unit)) {
    throw new Error("Expected decoded fixture to be a weapon definition.");
  }
  return unit;
}

function catalogFor(units: readonly UnitRecord[]): UnitCatalog {
  return {
    getUnit: (id) => Option.fromNullishOr(units.find((unit) => unit.id === id)),
    listUnits: () => units,
    requireUnit: (id) => {
      const unit = units.find((candidate) => candidate.id === id);
      if (unit === undefined) {
        throw new Error(`Unknown test Unit: ${id}.`);
      }
      return unit;
    },
  };
}
