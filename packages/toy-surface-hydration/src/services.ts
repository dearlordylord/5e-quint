import { Context } from "effect";

import type {
  ToyAuthoredUnitId,
  ToyRuntimeUnit,
  ToySurfaceUnit,
} from "#/types.ts";

export const ToySurfaceUnitLibrary =
  Context.GenericTag<
    ReadonlyMap<ToyAuthoredUnitId, ToySurfaceUnit>
  >("@dnd/toy-surface-hydration/ToySurfaceUnitLibrary");

export const ToyRuntimeUnitLibrary =
  Context.GenericTag<
    ReadonlyMap<ToyAuthoredUnitId, ToyRuntimeUnit>
  >("@dnd/toy-surface-hydration/ToyRuntimeUnitLibrary");
