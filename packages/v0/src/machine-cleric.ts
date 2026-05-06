import { assert } from "#/assert.ts";
import { clericChannelDivinityMax } from "#/features/class-cleric.ts";
import { updateClass } from "#/machine-helpers.ts";
import { isIncapacitated } from "#/machine-queries.ts";
import type { ClericClassState, DndContext } from "#/machine-types.ts";
import type { ClassLevel } from "#/types.ts";
import { resourceCount } from "#/types.ts";

export function clericChannelDivinityUpdate(
  c: DndContext,
): Partial<DndContext> {
  const cs = c.classStates.cleric!;
  assert(
    !isIncapacitated(c) && cs.level >= 2 && cs.clericChannelDivinityCharges > 0,
    "guard: canClericCD should have prevented this",
  );
  return updateClass(c, "cleric", {
    clericChannelDivinityCharges: resourceCount(
      cs.clericChannelDivinityCharges - 1,
    ),
  });
}

// -- Lifecycle --

export function clericStartTurnUpdate(c: DndContext): Partial<DndContext> {
  const cs = c.classStates.cleric;
  if (!cs || cs.level === 0) return {};
  return {};
}

/** SRD: "You regain one of its expended uses when you finish a Short Rest" */
export function clericShortRestUpdate(c: DndContext): Partial<DndContext> {
  const cs = c.classStates.cleric;
  if (!cs || cs.level === 0) return {};
  return updateClass(c, "cleric", {
    clericChannelDivinityCharges: resourceCount(
      Math.min(
        cs.clericChannelDivinityCharges + 1,
        cs.clericChannelDivinityMax,
      ),
    ),
  });
}

export function clericLongRestUpdate(c: DndContext): Partial<DndContext> {
  const cs = c.classStates.cleric;
  if (!cs || cs.level === 0) return {};
  return updateClass(c, "cleric", {
    clericChannelDivinityCharges: cs.clericChannelDivinityMax,
  });
}

// -- Init --

export function initialClericState(clericLevel: ClassLevel): ClericClassState {
  const cdMax = resourceCount(clericChannelDivinityMax(clericLevel));
  return {
    level: clericLevel,
    clericChannelDivinityCharges: cdMax,
    clericChannelDivinityMax: cdMax,
  };
}
