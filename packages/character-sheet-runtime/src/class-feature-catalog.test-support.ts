import type { UnitCatalog } from "@dnd/character-creation-runtime/consumer-protocol";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { Option } from "effect";

/** Deliberately incomplete catalog projections exercise typed admission failures. */
export function projectFixtureCatalog(
  base: UnitCatalog,
  project: (unit: UnitRecord) => Option.Option<UnitRecord>,
): UnitCatalog {
  const getUnit: UnitCatalog["getUnit"] = (id) =>
    Option.flatMap(base.getUnit(id), project);
  return {
    getUnit,
    requireUnit: (id) => {
      const unit = getUnit(id);
      if (Option.isNone(unit)) throw new Error(`Missing fixture Unit ${id}`);
      return unit.value;
    },
    listUnits: () =>
      base.listUnits().flatMap((unit) => Option.toArray(project(unit))),
  };
}
