import { Context } from "effect";

import type { ToyAuthoredUnitId, ToyRuntimeUnit } from "#/types.ts";
import type { ToySurfaceUnit } from "#/surface-subset-schema.ts";

export const ToySurfaceUnitLibrary =
  Context.GenericTag<
    ReadonlyMap<ToyAuthoredUnitId, ToySurfaceUnit>
  >("@dnd/toy-surface-hydration/ToySurfaceUnitLibrary");

export const ToyRuntimeUnitLibrary =
  Context.GenericTag<
    ReadonlyMap<ToyAuthoredUnitId, ToyRuntimeUnit>
  >("@dnd/toy-surface-hydration/ToyRuntimeUnitLibrary");
