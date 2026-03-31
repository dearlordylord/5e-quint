import { clericChannelDivinityMax } from "#/features/class-cleric.ts"
import { updateClass } from "#/machine-helpers.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import type { ClericClassState, DndContext } from "#/machine-types.ts"

export function clericChannelDivinityUpdate(c: DndContext): Partial<DndContext> {
  const cs = c.classStates.cleric!
  if (isIncapacitated(c) || cs.level < 2 || cs.clericChannelDivinityCharges <= 0) return {}
  return updateClass(c, "cleric", { clericChannelDivinityCharges: cs.clericChannelDivinityCharges - 1 })
}

// -- Lifecycle --

export function clericStartTurnUpdate(c: DndContext): Partial<DndContext> {
  const cs = c.classStates.cleric
  if (!cs || cs.level === 0) return {}
  return {}
}

/** SRD: "You regain one of its expended uses when you finish a Short Rest" */
export function clericShortRestUpdate(c: DndContext): Partial<DndContext> {
  const cs = c.classStates.cleric
  if (!cs || cs.level === 0) return {}
  return updateClass(c, "cleric", {
    clericChannelDivinityCharges: Math.min(cs.clericChannelDivinityCharges + 1, cs.clericChannelDivinityMax)
  })
}

export function clericLongRestUpdate(c: DndContext): Partial<DndContext> {
  const cs = c.classStates.cleric
  if (!cs || cs.level === 0) return {}
  return updateClass(c, "cleric", { clericChannelDivinityCharges: cs.clericChannelDivinityMax })
}

// -- Init --

export function initialClericState(clericLevel: number): ClericClassState {
  const cdMax = clericChannelDivinityMax(clericLevel)
  return {
    level: clericLevel,
    clericChannelDivinityCharges: cdMax,
    clericChannelDivinityMax: cdMax
  }
}
