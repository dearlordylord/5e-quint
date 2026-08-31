import { unitId } from "@dnd/shared/game-facts";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { Result } from "effect";
import { describe, expect, test } from "vitest";

import {
  battleDruidWildShapeKnownFormSupportForUnit,
  battleFailedSavingThrowRerollSupportForUnit,
  battleMonkFocusBattleOptionsSupportForUnit,
  battleUnitSupportProfilesForUnit,
} from "./unit-feature-support.ts";

const catalogResult = buildUnitCatalog({ collections: [srdUnitCollection] });
if (catalogResult.tag !== "ok") {
  throw new Error("Resource-owned support boundary catalog must build.");
}
const catalog = catalogResult.catalog;

describe("resource-owned Unit feature support boundary", () => {
  test.each([
    unitId("druid_wild_shape"),
    unitId("monk_monks_focus"),
    unitId("fighter_indomitable"),
  ])("does not emit %s from the aggregate support path", (sourceUnitId) => {
    const unit = requiredUnit(sourceUnitId);

    expect(battleUnitSupportProfilesForUnit({ unit })).toEqual(
      Result.succeed([]),
    );
  });

  test("legacy focused readers preserve structural renamed parity without authored facts", () => {
    const wildShape = requiredUnit("druid_wild_shape");
    const monkFocus = requiredUnit("monk_monks_focus");
    const failedSaveReroll = requiredUnit("fighter_indomitable");

    const projections = [
      battleDruidWildShapeKnownFormSupportForUnit({
        ...wildShape,
        id: unitId("synthetic_renamed_shape_feature"),
        name: "Synthetic Renamed Shape Feature",
      }),
      battleMonkFocusBattleOptionsSupportForUnit({
        ...monkFocus,
        id: unitId("synthetic_renamed_focus_feature"),
        name: "Synthetic Renamed Focus Feature",
      }),
      battleFailedSavingThrowRerollSupportForUnit({
        ...failedSaveReroll,
        id: unitId("synthetic_renamed_failed_save_feature"),
        name: "Synthetic Renamed Failed Save Feature",
      }),
    ];

    expect(projections).toEqual([
      battleDruidWildShapeKnownFormSupportForUnit(wildShape),
      battleMonkFocusBattleOptionsSupportForUnit(monkFocus),
      battleFailedSavingThrowRerollSupportForUnit(failedSaveReroll),
    ]);
    for (const projection of projections) {
      expect(projection).not.toHaveProperty("unit");
    }
  });
});

function requiredUnit(sourceUnitId: string) {
  const unit = catalog
    .listUnits()
    .find((candidate) => candidate.id === unitId(sourceUnitId));
  if (unit === undefined) throw new Error(`Expected Unit ${sourceUnitId}.`);
  return unit;
}
