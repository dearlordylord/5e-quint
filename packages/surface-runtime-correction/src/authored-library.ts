import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Context, Layer, Option, HashMap } from "effect";
import { decodeUnitRecordSync } from "@dnd/prototype-content-surface/surface/schema";

import type {
  UnitRecord,
} from "@dnd/prototype-content-surface/surface/types";

export type AuthoredUnitLibraryShape = {
  readonly get: (unitId: string) => Option.Option<UnitRecord>;
  readonly list: () => ReadonlyArray<UnitRecord>;
};

export class AuthoredUnitLibrary extends Context.Tag(
  "@dnd/surface-runtime-correction/AuthoredUnitLibrary",
)<AuthoredUnitLibrary, AuthoredUnitLibraryShape>() {}

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

export function loadAuthoredUnit(unitId: string): UnitRecord {
  const raw = readFileSync(surfaceContentPath(unitId), "utf8");
  return decodeUnitRecordSync(JSON.parse(raw));
}

export function loadAuthoredUnits(
  unitIds: ReadonlyArray<string>,
): ReadonlyArray<UnitRecord> {
  return unitIds.map(loadAuthoredUnit);
}

export function createAuthoredUnitLibrary(
  unitIds: ReadonlyArray<string>,
): AuthoredUnitLibraryShape {
  const units = loadAuthoredUnits(unitIds);
  const unitsById = HashMap.make(...units.map((unit) => [unit.id, unit] as readonly [string, UnitRecord]));
  return {
    get(unitId) {
      return HashMap.get(unitId)(unitsById)
    },
    list() {
      return [...HashMap.values(unitsById)];
    },
  };
}

export function surfaceUnitLibraryLayer(
  unitIds: ReadonlyArray<string>,
): Layer.Layer<AuthoredUnitLibrary> {
  return Layer.succeed(AuthoredUnitLibrary, createAuthoredUnitLibrary(unitIds));
}
