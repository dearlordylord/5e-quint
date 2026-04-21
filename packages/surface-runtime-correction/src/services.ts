import { Context } from "effect";

import type { AuthoredUnitId, SurfaceUnit } from "#/types.ts";

export const SurfaceUnitLibrary =
  Context.GenericTag<
    ReadonlyMap<AuthoredUnitId, SurfaceUnit>
  >("@dnd/surface-runtime-correction/SurfaceUnitLibrary");
