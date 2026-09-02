import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import { Result } from "effect";
import { describe, expect, test } from "vitest";

import {
  unitLibrary,
  unitMechanicsVariant,
} from "../unit-profile-admission-catalog.test-support.ts";
import {
  battleUnitSupportProfilesForUnit,
  battleWeaponMasteryExecutionPropertyForUnit,
} from "../unit-feature-support.ts";
import { admitWeaponMasteryProcedure } from "./weapon-mastery.ts";

const canonicalMasteries = [
  ["mastery_cleave", "weaponMasteryCleave"],
  ["mastery_push", "weaponMasteryPush"],
  ["mastery_sap", "weaponMasterySap"],
  ["mastery_slow", "weaponMasterySlow"],
  ["mastery_topple", "weaponMasteryTopple"],
] as const;

const canonicalUnsupportedMasteries = [
  "mastery_graze",
  "mastery_nick",
  "mastery_vex",
] as const;

describe("atomic Weapon Mastery procedure admission", () => {
  test.each(canonicalMasteries)(
    "%s projects source-free ready facts with exact whole-root evidence",
    (unitId, facts) => {
      const unit = unitLibrary.requireUnit(unitId);

      expect(admitWeaponMasteryProcedure(unit)).toEqual({
        tag: "admitted",
        procedure: {
          binding: "ready",
          facts,
          evidence: {
            consumed: [
              {
                family: "unit",
                nodes: [{ kind: "singleton", role: "recordMechanics" }],
              },
            ],
            unowned: [],
          },
        },
      });
    },
  );

  test.each(canonicalUnsupportedMasteries)(
    "%s remains represented but unsupported by Battle admission",
    (unitId) => {
      const unit = unitLibrary.requireUnit(unitId);

      expect(admitWeaponMasteryProcedure(unit)).toMatchObject({
        tag: "rejected",
        issues: [
          {
            procedure: "unrecognizedWeaponMastery",
          },
        ],
      });
    },
  );

  test.each(canonicalMasteries)(
    "%s admission is unchanged by synthetic authored identity",
    (unitId) => {
      const unit = unitLibrary.requireUnit(unitId);
      const renamed = decodeUnitRecordSync({
        ...unit,
        id: `synthetic_${unitId}`,
        name: `Synthetic ${unitId}`,
        provenance: { kind: "synthetic-test", section: unitId },
      });

      expect(admitWeaponMasteryProcedure(renamed)).toEqual(
        admitWeaponMasteryProcedure(unit),
      );
    },
  );

  test.each([
    ["mastery_push", { maxDistanceFeet: 5 }],
    ["mastery_sap", { count: 2 }],
    ["mastery_slow", { deltaFeet: -5 }],
  ] as const)(
    "%s rejects malformed atomic mechanics",
    (unitId, effectPatch) => {
      const unit = unitLibrary.requireUnit(unitId);
      if (
        unit.kind !== "mastery" ||
        unit.mechanics.family !== "on_hit_trigger"
      ) {
        throw new Error("Expected a mastery record.");
      }
      const malformed = unitMechanicsVariant(unit, {
        id: `synthetic_malformed_${unitId}`,
        mechanics: {
          ...unit.mechanics,
          effect: { ...unit.mechanics.effect, ...effectPatch },
        },
      });

      expect(admitWeaponMasteryProcedure(malformed)).toMatchObject({
        tag: "rejected",
        issues: [
          {
            tag: "weaponMasteryProcedureAdmissionIssue",
            mechanicsPath: {
              family: "unit",
              nodes: [{ kind: "singleton", role: "recordMechanics" }],
            },
          },
        ],
      });
    },
  );

  test("rejects malformed Topple and Cleave nested effects", () => {
    const topple = unitLibrary.requireUnit("mastery_topple");
    const cleave = unitLibrary.requireUnit("mastery_cleave");
    if (
      topple.kind !== "mastery" ||
      topple.mechanics.family !== "on_hit_trigger" ||
      cleave.kind !== "mastery" ||
      cleave.mechanics.family !== "on_hit_trigger"
    ) {
      throw new Error("Expected mastery records.");
    }
    const malformedTopple = unitMechanicsVariant(topple, {
      id: "synthetic_malformed_mastery_topple",
      mechanics: {
        ...topple.mechanics,
        effect: {
          ...topple.mechanics.effect,
          dc: { kind: "weapon_attack_dc", base: 7 },
        },
      },
    });
    const malformedCleave = unitMechanicsVariant(cleave, {
      id: "synthetic_malformed_mastery_cleave",
      mechanics: {
        ...cleave.mechanics,
        effect: {
          ...cleave.mechanics.effect,
          secondaryTarget: {
            kind: "adjacent_to_primary",
            constraint: "synthetic_wrong_reach",
          },
        },
      },
    });

    expect(admitWeaponMasteryProcedure(malformedTopple).tag).toBe("rejected");
    expect(admitWeaponMasteryProcedure(malformedCleave).tag).toBe("rejected");
  });

  test("rejects a represented mastery outside the admitted atomic five", () => {
    const sap = unitLibrary.requireUnit("mastery_sap");
    if (sap.kind !== "mastery" || sap.mechanics.family !== "on_hit_trigger") {
      throw new Error("Expected Sap mastery.");
    }
    const vexStyle = unitMechanicsVariant(sap, {
      id: "synthetic_vex_style_mastery",
      mechanics: {
        ...sap.mechanics,
        effect: { ...sap.mechanics.effect, mode: "advantage" },
      },
    });
    expect(admitWeaponMasteryProcedure(vexStyle)).toMatchObject({
      tag: "rejected",
    });
    const push = unitLibrary.requireUnit("mastery_push");
    const wrongFamily = unitMechanicsVariant(push, {
      id: "synthetic_mastery_wrong_family",
      mechanics: { family: "synthetic_mastery_family" },
    });
    expect(admitWeaponMasteryProcedure(wrongFamily)).toMatchObject({
      tag: "rejected",
    });
  });

  test.each(canonicalMasteries)(
    "%s feeds the existing aggregate exactly once",
    (unitId, facts) => {
      const aggregate = battleUnitSupportProfilesForUnit({
        unit: unitLibrary.requireUnit(unitId),
      });

      expect(
        Result.isSuccess(aggregate) ? aggregate.success : aggregate,
      ).toEqual([facts]);
      const unit = unitLibrary.requireUnit(unitId);
      if (unit.kind !== "mastery") throw new Error("Expected mastery record.");
      const property = battleWeaponMasteryExecutionPropertyForUnit(unit);
      expect(Result.isSuccess(property) ? property.success : property).toBe(
        unitId.replace("mastery_", ""),
      );
    },
  );
});
