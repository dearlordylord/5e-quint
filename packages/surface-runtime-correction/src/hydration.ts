import { Effect, Layer } from "effect";

import { RuntimeUnitLibrary, SurfaceUnitLibrary } from "#/services.ts";
import type { AuthoredUnitId, RuntimeUnit, SurfaceUnit } from "#/types.ts";

export function hydrateRuntimeUnit(unit: SurfaceUnit): RuntimeUnit {
  return { unit };
}

export function hydrateRuntimeLibrary(
  surfaceUnits: ReadonlyMap<AuthoredUnitId, SurfaceUnit>,
): ReadonlyMap<AuthoredUnitId, RuntimeUnit> {
  return new Map(
    [...surfaceUnits.entries()].map(([unitId, unit]) => [
      unitId,
      hydrateRuntimeUnit(unit),
    ]),
  );
}

export const RuntimeUnitLibraryLive = Layer.effect(
  RuntimeUnitLibrary,
  Effect.gen(function*() {
    const surfaceUnits = yield* SurfaceUnitLibrary;
    return hydrateRuntimeLibrary(surfaceUnits);
  }),
);
