import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Context, Layer, HashMap } from "effect";
import { decodeUnitRecordSync } from "@dnd/prototype-content-surface/surface/schema";
import { assertSupportedUnit } from "#/reducer-support.ts";

import type { Option } from "effect";
import type { UnitRecord } from "@dnd/prototype-content-surface/surface/types";

export type SupportedUnitLibraryShape = {
  readonly get: (unitId: string) => Option.Option<UnitRecord>;
  readonly list: () => ReadonlyArray<UnitRecord>;
};

export class SupportedUnitLibrary extends Context.Tag(
  "@dnd/surface-runtime-correction/SupportedUnitLibrary",
)<SupportedUnitLibrary, SupportedUnitLibraryShape>() {}

function authoredUnitContentPath(unitId: string): string {
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
  const raw = readFileSync(authoredUnitContentPath(unitId), "utf8");
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
  const authoredUnitsById = HashMap.make(
    ...authoredUnits.map(
      (unit) => [unit.id, unit] as readonly [string, UnitRecord],
    ),
  );
  return {
    get(unitId) {
      return HashMap.get(unitId)(authoredUnitsById);
    },
    list() {
      return [...HashMap.values(authoredUnitsById)];
    },
  };
}

export function supportedUnitLibraryLayer(
  unitIds: ReadonlyArray<string>,
): Layer.Layer<SupportedUnitLibrary> {
  return Layer.succeed(
    SupportedUnitLibrary,
    createSupportedUnitLibrary(unitIds),
  );
}
