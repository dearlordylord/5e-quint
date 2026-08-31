import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import { describe, expect, test } from "vitest";

import {
  unitLibrary,
  unitMechanicsVariant,
} from "../unit-profile-admission-catalog.test-support.ts";
import { admitAtomicSpeciesTraitProcedure } from "./atomic-species-trait-procedure.ts";

const canonicalProcedures = [
  [
    "species_halfling_nimbleness",
    {
      kind: "creatureSpaceMovementPermission",
      permission: {
        moveThrough: {
          kind: "occupiedCreatureSpace",
          creatureSizeRelationToSelf: "larger",
        },
        canStopInOccupiedSpace: false,
      },
    },
  ],
  [
    "species_halfling_luck",
    {
      kind: "d20TestNaturalOneReroll",
      reroll: {
        optional: true,
        trigger: { kind: "d20TestRollIs", dieFace: 1 },
        reroll: { kind: "triggeringD20", use: "newRoll" },
      },
    },
  ],
  [
    "species_halfling_naturally_stealthy",
    {
      kind: "hideActionObscurementPermission",
      permission: {
        allowedObscurement: {
          kind: "obscuredOnlyByCreature",
          creatureSizeRelationToSelf: "atLeastOneSizeLarger",
        },
      },
    },
  ],
] as const;

describe("atomic species-trait procedure admission", () => {
  test.each(canonicalProcedures)(
    "%s projects source-free ready facts and owns the strict atomic root",
    (unitId, facts) => {
      const admission = admitAtomicSpeciesTraitProcedure(
        unitLibrary.requireUnit(unitId),
      );

      expect(admission).toEqual({
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
      expect(admission).not.toHaveProperty("procedure.facts.unit");
    },
  );

  test.each(canonicalProcedures)(
    "%s admission is unchanged by synthetic authored identity",
    (unitId) => {
      const unit = unitLibrary.requireUnit(unitId);
      const renamed = decodeUnitRecordSync({
        ...unit,
        id: `synthetic_${unitId}`,
        name: `Synthetic ${unitId}`,
        species: "human",
        provenance: { kind: "synthetic-test", section: unitId },
      });

      expect(admitAtomicSpeciesTraitProcedure(renamed)).toEqual(
        admitAtomicSpeciesTraitProcedure(unit),
      );
    },
  );

  test.each([
    ["species_halfling_nimbleness", { canStopInOccupiedSpace: true }],
    [
      "species_halfling_luck",
      {
        optional: false,
      },
    ],
    [
      "species_halfling_naturally_stealthy",
      {
        action: "search",
      },
    ],
  ] as const)("%s rejects malformed represented mechanics", (unitId, patch) => {
    const unit = unitLibrary.requireUnit(unitId);
    if (unit.kind !== "species_trait") {
      throw new Error("Expected a species-trait record.");
    }
    const malformed = unitMechanicsVariant(unit, {
      id: `synthetic_malformed_${unitId}`,
      mechanics: { ...unit.mechanics, ...patch },
    });

    expect(admitAtomicSpeciesTraitProcedure(malformed)).toMatchObject({
      tag: "rejected",
      issues: [
        {
          tag: "atomicSpeciesTraitProcedureAdmissionIssue",
          mechanicsPath: {
            family: "unit",
            nodes: [{ kind: "singleton", role: "recordMechanics" }],
          },
        },
      ],
    });
  });

  test("accumulates independent malformed Luck branches", () => {
    const unit = unitLibrary.requireUnit("species_halfling_luck");
    if (unit.kind !== "species_trait") {
      throw new Error("Expected a species-trait record.");
    }
    const malformed = unitMechanicsVariant(unit, {
      id: "synthetic_luck_multiple_malformed_branches",
      mechanics: {
        ...unit.mechanics,
        optional: false,
        trigger: { kind: "d20_test_roll_is", dieFace: 2 },
        reroll: { kind: "reroll_triggering_d20", use: "synthetic_old_roll" },
      },
    });

    expect(admitAtomicSpeciesTraitProcedure(malformed)).toMatchObject({
      tag: "rejected",
      issues: [
        { failedFact: "rerollOptionality" },
        { failedFact: "rerollTrigger" },
        { failedFact: "rerollUse" },
      ],
    });
  });

  test("accumulates independent malformed Nimbleness branches", () => {
    const unit = unitLibrary.requireUnit("species_halfling_nimbleness");
    if (unit.kind !== "species_trait") {
      throw new Error("Expected a species-trait record.");
    }
    const malformed = unitMechanicsVariant(unit, {
      id: "synthetic_nimbleness_multiple_malformed_branches",
      mechanics: {
        ...unit.mechanics,
        moveThrough: {
          kind: "synthetic_unoccupied_space",
          creatureSizeRelationToSelf: "same_size",
        },
        canStopInOccupiedSpace: true,
      },
    });

    expect(admitAtomicSpeciesTraitProcedure(malformed)).toMatchObject({
      tag: "rejected",
      issues: [
        { failedFact: "movementTarget" },
        { failedFact: "occupiedSpaceStopping" },
      ],
    });
  });

  test("accumulates independent malformed Naturally Stealthy branches", () => {
    const unit = unitLibrary.requireUnit("species_halfling_naturally_stealthy");
    if (unit.kind !== "species_trait") {
      throw new Error("Expected a species-trait record.");
    }
    const malformed = unitMechanicsVariant(unit, {
      id: "synthetic_stealth_multiple_malformed_branches",
      mechanics: {
        ...unit.mechanics,
        action: "search",
        allowedObscurement: {
          kind: "synthetic_lightly_obscured",
          creatureSizeRelationToSelf: "same_size",
        },
      },
    });

    expect(admitAtomicSpeciesTraitProcedure(malformed)).toMatchObject({
      tag: "rejected",
      issues: [{ failedFact: "hideAction" }, { failedFact: "hideObscurement" }],
    });
  });

  test("does not claim unrelated species-trait or mastery roots", () => {
    expect(
      admitAtomicSpeciesTraitProcedure(
        unitLibrary.requireUnit("species_halfling_brave"),
      ),
    ).toEqual({ tag: "notBattleOwned" });
    expect(
      admitAtomicSpeciesTraitProcedure(unitLibrary.requireUnit("mastery_push")),
    ).toEqual({ tag: "notBattleOwned" });
  });
});
