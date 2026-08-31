import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import { describe, expect, test } from "vitest";

import {
  unitLibrary,
  unitMechanicsVariant,
} from "../unit-profile-admission-catalog.test-support.ts";
import { admitResourceFeature } from "./resource-feature-admission.ts";

const canonicalResourceFeatures = [
  {
    unitId: "fighter_indomitable",
    procedureKind: "failedSavingThrowReroll",
    resource: {
      kind: "use_count",
      cap: {
        kind: "threshold_tiers",
        axis: "class",
        base: 1,
        tiers: [
          { atLevel: 13, value: 2 },
          { atLevel: 17, value: 3 },
        ],
      },
    },
  },
  {
    unitId: "druid_wild_shape",
    procedureKind: "druidWildShape",
    resource: {
      kind: "use_count",
      cap: {
        kind: "threshold_tiers",
        axis: "class",
        base: 2,
        tiers: [
          { atLevel: 6, value: 3 },
          { atLevel: 17, value: 4 },
        ],
      },
    },
  },
  {
    unitId: "monk_monks_focus",
    procedureKind: "monkFocus",
    resource: {
      kind: "use_count",
      cap: {
        kind: "linear_per_level",
        axis: "class",
        base: 2,
        perLevel: 1,
        startingAtLevel: 2,
      },
    },
  },
] as const;

describe("resource-feature procedure admission", () => {
  test.each(canonicalResourceFeatures)(
    "admits $unitId with canonical resource facts and an unbound $procedureKind procedure",
    ({ unitId, procedureKind, resource }) => {
      const unit = unitLibrary.requireUnit(unitId);
      const admission = admitResourceFeature(unit);

      expect(admission).toMatchObject({
        tag: "admitted",
        sourceUnitId: unit.id,
        resource,
        procedure: { kind: procedureKind },
      });
      if (admission.tag !== "admitted") {
        throw new Error("Expected admitted resource feature.");
      }
      expect(admission.resource).not.toHaveProperty("resetCadence");
      expect(admission.resource).not.toHaveProperty("className");
      expect(admission.procedure.admitted).not.toHaveProperty("unitId");
      expect(admission.procedure.admitted).not.toHaveProperty("sourceUnitId");
    },
  );

  test.each(canonicalResourceFeatures)(
    "$unitId source-free facts are invariant under synthetic authored identity",
    ({ unitId }) => {
      const canonical = unitLibrary.requireUnit(unitId);
      const renamed = decodeUnitRecordSync({
        ...canonical,
        id: `synthetic_${unitId}`,
        name: `Synthetic ${unitId}`,
        provenance: { kind: "synthetic-test", section: unitId },
      });
      const canonicalAdmission = admitResourceFeature(canonical);
      const renamedAdmission = admitResourceFeature(renamed);
      expect(canonicalAdmission.tag).toBe("admitted");
      expect(renamedAdmission.tag).toBe("admitted");
      if (
        canonicalAdmission.tag !== "admitted" ||
        renamedAdmission.tag !== "admitted"
      ) {
        return;
      }
      expect(renamedAdmission.resource).toEqual(canonicalAdmission.resource);
      expect(renamedAdmission.procedure).toEqual(canonicalAdmission.procedure);
      expect(renamedAdmission.sourceUnitId).toBe(renamed.id);
    },
  );

  test("preserves typed focused rejection for malformed represented mechanics", () => {
    const canonical = unitLibrary.requireUnit("fighter_indomitable");
    if (
      canonical.kind !== "class_feature" ||
      canonical.mechanics.family !== "failed_saving_throw_reroll"
    ) {
      throw new Error("Expected failed Saving Throw reroll mechanics.");
    }
    const malformed = unitMechanicsVariant(canonical, {
      id: "synthetic_malformed_resource_feature",
      mechanics: {
        ...canonical.mechanics,
        reroll: { ...canonical.mechanics.reroll, mustUseNewRoll: false },
      },
    });

    expect(admitResourceFeature(malformed)).toMatchObject({
      tag: "rejected",
      issues: [{ tag: "failedSavingThrowRerollProcedureAdmissionIssue" }],
    });
  });

  test("leaves unrelated roots outside the dispatcher boundary", () => {
    expect(
      admitResourceFeature(unitLibrary.requireUnit("mastery_sap")),
    ).toEqual({ tag: "notBattleOwned" });
  });
});
