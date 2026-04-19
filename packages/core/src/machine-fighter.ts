import { assert } from "#/assert.ts";
import {
  actionSurgeMaxCharges,
  canUseIndomitable,
  canUseTacticalMind,
  fighterLongRest as tsFighterLongRest,
  fighterShortRest as tsFighterShortRest,
  heroicWarriorInspiration,
  indomitableMaxCharges,
  secondWindMaxCharges,
  useIndomitable as tsUseIndomitable,
  useTacticalMind as tsUseTacticalMind,
} from "#/features/class-fighter.ts";
import { updateClass } from "#/machine-helpers.ts";
import { isIncapacitated } from "#/machine-queries.ts";
import type { DndContext, FighterClassState } from "#/machine-types.ts";
import type { ClassLevel } from "#/types.ts";
import { resourceCount } from "#/types.ts";

// -- Convenience accessor --

function f(c: DndContext) {
  return c.classStates.fighter!;
}

export function indomitableUpdate(c: DndContext): Partial<DndContext> {
  const fs = f(c);
  assert(
    c.pendingResolution?.kind === "indomitable" &&
      canUseIndomitable(fs.level, fs.indomitableCharges),
    "guard: canIndomitable should have prevented this",
  );
  return updateClass(c, "fighter", {
    indomitableCharges: resourceCount(
      tsUseIndomitable(fs.indomitableCharges, 0).indomitableCharges,
    ),
  });
}

export function tacticalMindUpdate(
  c: DndContext,
  boostedCheckSucceeds: boolean,
): Partial<DndContext> {
  const fs = f(c);
  assert(
    c.pendingResolution?.kind === "tacticalMind" &&
      canUseTacticalMind(fs.secondWindCharges, fs.level, true) &&
      !isIncapacitated(c),
    "guard: canTacticalMind should have prevented this",
  );
  if (!boostedCheckSucceeds) return {};
  return updateClass(c, "fighter", {
    secondWindCharges: resourceCount(
      tsUseTacticalMind({
        secondWindCharges: fs.secondWindCharges,
        originalCheckTotal: 0,
        dc: 0,
        d10Roll: 0,
      }).secondWindCharges,
    ),
  });
}

// -- Lifecycle --

export function fighterStartTurnUpdate(c: DndContext): Partial<DndContext> {
  const fs = c.classStates.fighter;
  if (!fs || fs.level === 0) return {};
  return updateClass(c, "fighter", {
    actionSurgeUsedThisTurn: false,
    ...(heroicWarriorInspiration(fs.level, fs.heroicInspiration)
      ? { heroicInspiration: true }
      : {}),
  });
}

export function fighterShortRestUpdate(c: DndContext): Partial<DndContext> {
  const fs = c.classStates.fighter;
  if (!fs || fs.level === 0) return {};
  const r = tsFighterShortRest({
    secondWindCharges: fs.secondWindCharges,
    secondWindMax: fs.secondWindMax,
    actionSurgeCharges: fs.actionSurgeCharges,
    actionSurgeMax: fs.actionSurgeMax,
  });
  return updateClass(c, "fighter", {
    secondWindCharges: resourceCount(r.secondWindCharges),
    actionSurgeCharges: resourceCount(r.actionSurgeCharges),
  });
}

export function fighterLongRestUpdate(c: DndContext): Partial<DndContext> {
  const fs = c.classStates.fighter;
  if (!fs || fs.level === 0) return {};
  const r = tsFighterLongRest({
    secondWindCharges: fs.secondWindCharges,
    secondWindMax: fs.secondWindMax,
    actionSurgeCharges: fs.actionSurgeCharges,
    actionSurgeMax: fs.actionSurgeMax,
    indomitableMax: fs.indomitableMax,
  });
  return updateClass(c, "fighter", {
    secondWindCharges: resourceCount(r.secondWindCharges),
    actionSurgeCharges: resourceCount(r.actionSurgeCharges),
    indomitableCharges: resourceCount(r.indomitableCharges),
  });
}

// -- Init --

export function initialFighterState(
  fighterLevel: ClassLevel,
): FighterClassState {
  const swMax = resourceCount(secondWindMaxCharges(fighterLevel));
  const asMax = resourceCount(actionSurgeMaxCharges(fighterLevel));
  const indMax = resourceCount(indomitableMaxCharges(fighterLevel));
  return {
    level: fighterLevel,
    secondWindCharges: swMax,
    secondWindMax: swMax,
    actionSurgeCharges: asMax,
    actionSurgeMax: asMax,
    actionSurgeUsedThisTurn: false,
    indomitableCharges: indMax,
    indomitableMax: indMax,
    heroicInspiration: false,
  };
}
