import { isIncapacitated } from "#/machine-queries.ts"
import type { DndContext } from "#/machine-types.ts"

export function clericChannelDivinityUpdate(c: DndContext): Partial<DndContext> {
  if (isIncapacitated(c) || c.clericLevel < 2 || c.clericChannelDivinityCharges <= 0) return {}
  return { clericChannelDivinityCharges: c.clericChannelDivinityCharges - 1 }
}

// -- Lifecycle --

export function clericStartTurnUpdate(c: DndContext): Partial<DndContext> {
  if (c.clericLevel === 0) return {}
  return {}
}

export function clericShortRestUpdate(c: DndContext): Partial<DndContext> {
  if (c.clericLevel === 0) return {}
  return { clericChannelDivinityCharges: c.clericChannelDivinityMax }
}

export function clericLongRestUpdate(c: DndContext): Partial<DndContext> {
  if (c.clericLevel === 0) return {}
  return { clericChannelDivinityCharges: c.clericChannelDivinityMax }
}

// -- Init --

export function initialClericState(clericLevel: number) {
  const cdMax = clericLevel >= 2 ? 2 : 0
  return {
    clericLevel,
    clericChannelDivinityCharges: cdMax,
    clericChannelDivinityMax: cdMax
  }
}
