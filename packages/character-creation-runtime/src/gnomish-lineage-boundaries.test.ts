import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { Option, Result } from "effect";
import { describe, expect, test } from "vitest";

import { characterBuildGnomishLineageTraitProjection } from "./index.ts";

const catalogResult = buildUnitCatalog({ collections: [srdUnitCollection] });
if (catalogResult.tag !== "ok") {
  throw new Error("The SRD Unit catalog lineage fixture must compose.");
}
const unitLibrary = catalogResult.catalog;

const selectedLineage = {
  gnomishLineage: {
    kind: "gnomishLineage",
    lineageId: "forest_gnome",
    spellcastingAbility: "int",
  },
} as const;

describe("Gnomish Lineage projection boundaries", () => {
  test("distinguishes absent lineage facts from a selected lineage", () => {
    expect(
      characterBuildGnomishLineageTraitProjection({
        build: { species: authoredUnitId("species_orc") },
        unitLibrary,
      }),
    ).toEqual(Result.succeed(undefined));

    expect(
      characterBuildGnomishLineageTraitProjection({
        build: {
          species: authoredUnitId("species_gnome"),
          speciesChoiceFacts: selectedLineage,
        },
        unitLibrary,
      }),
    ).toMatchObject({
      _tag: "Success",
      success: {
        traitUnitId: "species_gnome_gnomish_lineage",
        spellcastingAbility: "int",
        option: { id: "forest_gnome" },
      },
    });
  });

  test("reports missing, unreadable, and lineage-less selected species", () => {
    const speciesCases = [
      {
        species: authoredUnitId("synthetic_unknown"),
        message: "installed species Unit",
      },
      {
        species: authoredUnitId("weapon_longsword"),
        message: "readable species Unit",
      },
      {
        species: authoredUnitId("species_orc"),
        message: "one species lineage choice trait Unit",
      },
    ] as const;

    for (const { species, message } of speciesCases) {
      expect(
        characterBuildGnomishLineageTraitProjection({
          build: { species, speciesChoiceFacts: selectedLineage },
          unitLibrary,
        }),
      ).toMatchObject({
        _tag: "Failure",
        failure: {
          tag: "gnomishLineageTraitProjectionIssue",
          message: expect.stringContaining(message),
        },
      });
    }
  });

  test("reports a selected species whose lineage trait Unit is unavailable", () => {
    const missingLineageTraitCatalog = {
      getUnit: (unitId: string) =>
        unitId === authoredUnitId("species_gnome_gnomish_lineage")
          ? Option.none()
          : unitLibrary.getUnit(unitId),
      listUnits: () =>
        unitLibrary
          .listUnits()
          .filter(
            (unit) =>
              unit.id !== authoredUnitId("species_gnome_gnomish_lineage"),
          ),
      requireUnit: (unitId: string) => {
        if (unitId === authoredUnitId("species_gnome_gnomish_lineage")) {
          throw new Error("The lineage trait fixture is deliberately absent.");
        }
        return unitLibrary.requireUnit(unitId);
      },
    };

    expect(
      characterBuildGnomishLineageTraitProjection({
        build: {
          species: authoredUnitId("species_gnome"),
          speciesChoiceFacts: selectedLineage,
        },
        unitLibrary: missingLineageTraitCatalog,
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        tag: "gnomishLineageTraitProjectionIssue",
        message:
          "Selected Gnomish Lineage requires one species lineage choice trait Unit.",
      },
    });
  });
});
