import { Context } from "effect";

import type { AuthoredUnitId, RuntimeUnit, SurfaceUnit } from "#/types.ts";

export const SurfaceUnitLibrary =
  Context.GenericTag<
    ReadonlyMap<AuthoredUnitId, SurfaceUnit>
  >("@dnd/surface-runtime-correction/SurfaceUnitLibrary");

export const RuntimeUnitLibrary =
  Context.GenericTag<
    ReadonlyMap<AuthoredUnitId, RuntimeUnit>
  >("@dnd/surface-runtime-correction/RuntimeUnitLibrary");
