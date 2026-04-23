import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Context, Layer, Option, HashMap } from "effect";
import { decodeUnitRecordSync } from "@dnd/prototype-content-surface/surface/schema";
import { assertSupportedUnit } from "#/reducer-support.ts";

import type {
  UnitRecord,
} from "@dnd/prototype-content-surface/surface/types";

export type SupportedUnitLibraryShape = {
  readonly get: (unitId: string) => Option.Option<UnitRecord>;
  readonly list: () => ReadonlyArray<UnitRecord>;
};

export class SupportedUnitLibrary extends Context.Tag(
  "@dnd/surface-runtime-correction/SupportedUnitLibrary",
)<SupportedUnitLibrary, SupportedUnitLibraryShape>() {}

function surfaceContentPath(unitId: string): string {
  return join(
    import.meta.dirname,
    "..",
    "..",
    "prototype-content-surface",
    "content",
    `${unitId}.json`,
  );
}

export function loadSupportedUnit(unitId: string) {
  const raw = readFileSync(surfaceContentPath(unitId), "utf8");
  const unit = decodeUnitRecordSync(JSON.parse(raw));
  return assertSupportedUnit(unit);
}

export function loadSupportedUnits(
  unitIds: ReadonlyArray<string>,
): ReadonlyArray<UnitRecord> {
  return unitIds.map(loadSupportedUnit);
}

export function createSupportedUnitLibrary(
  unitIds: ReadonlyArray<string>,
): SupportedUnitLibraryShape {
  const authoredUnits = loadSupportedUnits(unitIds);
  const unitsById = HashMap.make(...authoredUnits.map((unit) => [unit.id, unit] as readonly [string, UnitRecord]));
  return {
    get(unitId) {
      return HashMap.get(unitId)(unitsById)
    },
    list() {
      return [...HashMap.values(unitsById)];
    },
  };
}

export function supportedUnitLibraryLayer(
  unitIds: ReadonlyArray<string>,
): Layer.Layer<SupportedUnitLibrary> {
  return Layer.succeed(SupportedUnitLibrary, createSupportedUnitLibrary(unitIds));
}
